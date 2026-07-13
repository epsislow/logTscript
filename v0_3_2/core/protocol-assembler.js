/* ================= PROTOCOL ASSEMBLER ================= */

const PROTOCOL_ATTRS = new Set(['clockType', 'mode', 'codebookLoad', 'parseResult', 'parseView']);
const PARSE_RESULT_MODES = new Set(['all', 'collapseOnly']);
const PARSE_VIEW_MODES = new Set(['tree', 'true']);
const PROTOCOL_MODES = new Set(['assemble', 'parse']);
const CLOCK_TYPES = new Set(['lowFirst', 'highFirst']);

function stripComment(line) {
  const hash = line.indexOf('#');
  if (hash >= 0) return line.slice(0, hash);
  return line;
}

function parseQuotedWireString(t) {
  const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
  if (!WL) {
    throw new Error('wire string literals require core/wire-literals.js');
  }
  const quote = t[0];
  if ((quote !== '"' && quote !== "'") || t.length < 2 || t[t.length - 1] !== quote) {
    throw new Error(`Invalid protocol literal '${t}'`);
  }
  let str = '';
  for (let i = 1; i < t.length - 1; i++) {
    const ch = t[i];
    if (ch === '\\' && i + 1 < t.length - 1) {
      const decoded = WL.decodeWireStringEscape(t[i + 1]);
      if (decoded == null) {
        throw new Error(`Unknown escape '\\${t[i + 1]}' in protocol literal '${t}'`);
      }
      str += decoded;
      i++;
      continue;
    }
    str += ch;
  }
  return WL.wireStringToBin(str);
}

function parseLiteralToken(token) {
  const t = token.trim();
  if (t === '0' || t === '1') return { kind: 'literal', bits: t };
  if (/^[01]+$/.test(t)) return { kind: 'literal', bits: t };

  const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;

  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { kind: 'literal', bits: parseQuotedWireString(t) };
  }

  const decPadM = /^\\(\d+);(\d+)$/.exec(t);
  if (decPadM) {
    if (!WL) throw new Error('padded decimal literals require core/wire-literals.js');
    return {
      kind: 'literal',
      bits: WL.unsignedDecToWidthBin(decPadM[1], parseInt(decPadM[2], 10)),
    };
  }

  const hexPadM = /^\^([0-9a-fA-F]+);(\d+)$/.exec(t);
  if (hexPadM) {
    if (!WL) throw new Error('padded hex literals require core/wire-literals.js');
    let bits = WL.hexDigitsToBin(hexPadM[1]);
    const w = parseInt(hexPadM[2], 10);
    if (bits.length > w) {
      throw new Error(`hex literal '${t}' exceeds ${w} bits`);
    }
    return { kind: 'literal', bits: bits.padStart(w, '0') };
  }

  if (t.startsWith('^')) {
    const hex = t.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error(`Invalid hex literal '${t}'`);
    return { kind: 'literal', bits: parseInt(hex, 16).toString(2) };
  }
  if (t.startsWith('\\')) {
    const num = t.slice(1);
    if (!/^\d+$/.test(num)) throw new Error(`Invalid decimal literal '${t}'`);
    return { kind: 'literal', bits: parseInt(num, 10).toString(2) };
  }
  throw new Error(`Invalid protocol literal '${t}'`);
}

function parseRepeatSuffix(suffix) {
  const s = suffix.trim();
  if (s === '*') return { min: 0, max: null };
  if (s === '+') return { min: 1, max: null };
  if (s === '[-]') {
    throw new Error("invalid repeat spec '[-]': use '*' or '[0-]'");
  }
  const exactM = /^\[(\d+)\]$/.exec(s);
  if (exactM) {
    const n = parseInt(exactM[1], 10);
    return { min: n, max: n };
  }
  const rangeM = /^\[(\d+)-(\d+)\]$/.exec(s);
  if (rangeM) {
    const min = parseInt(rangeM[1], 10);
    const max = parseInt(rangeM[2], 10);
    if (max < min) {
      throw new Error(`invalid repeat range '[${min}-${max}]': max < min`);
    }
    return { min, max };
  }
  const openM = /^\[(\d+)-\]$/.exec(s);
  if (openM) {
    return { min: parseInt(openM[1], 10), max: null };
  }
  throw new Error(`invalid repeat spec '${suffix}'`);
}

function formatRepeatSpec(repeat) {
  if (!repeat) return '';
  if (repeat.max === repeat.min) return `[${repeat.min}]`;
  if (repeat.max == null) return `[${repeat.min}-]`;
  return `[${repeat.min}-${repeat.max}]`;
}

function tryParseLocalRefUse(t, localDefNames, protocolMode) {
  if (!localDefNames.length) return null;
  const trimmed = t.trim();
  if (/^(\w+)\?\s*(\[|\*|\+)/.test(trimmed)) {
    throw new Error(`invalid section syntax '${trimmed}': '?' must follow repeat spec, not precede it`);
  }
  if (/^(\w+)(\*|\+)\?\s*$/.test(trimmed)) {
    throw new Error(`invalid section syntax '${trimmed}': use '[0-]' or '[1-]' instead of '*?' or '+?'`);
  }
  const m = /^(\w+)((?:\[[^\]]+\]|\*|\+))?\??\s*$/.exec(trimmed);
  if (!m || !localDefNames.includes(m[1])) return null;
  const name = m[1];
  const tentative = /\?\s*$/.test(trimmed);
  if (tentative && protocolMode !== 'parse') {
    throw new Error(`tentative reference '${name}?' requires mode: parse`);
  }
  let repeat = null;
  if (m[2]) repeat = parseRepeatSuffix(m[2]);
  return { kind: 'localRef', name, tentative, repeat };
}

function parseParamRef(text) {
  const m = /^(\w+)(?:\s+(~b|(\d+)b))?$/.exec(text.trim());
  if (!m) throw new Error(`Invalid parameter reference '${text}'`);
  if (m[2] === '~b') return { name: m[1], width: 'var' };
  return { name: m[1], width: m[3] !== undefined ? parseInt(m[3], 10) : null };
}

function registerParam(parameters, name, width) {
  if (parameters[name] !== undefined) {
    if (parameters[name] !== width) {
      const prev = parameters[name] === 'var' ? '~b' : `${parameters[name]}b`;
      const next = width === 'var' ? '~b' : `${width}b`;
      throw new Error(
        `Parameter '${name}' was previously declared as ${prev} but is used here as ${next}`
      );
    }
    return;
  }
  parameters[name] = width;
}

function ensureParam(parameters, ref) {
  if (ref.width === null) {
    if (parameters[ref.name] === undefined) parameters[ref.name] = 'var';
    return parameters[ref.name];
  }
  registerParam(parameters, ref.name, ref.width);
  return ref.width;
}

function resolveParamWidth(parameters, name, width) {
  if (width !== null) {
    registerParam(parameters, name, width);
    return width;
  }
  if (parameters[name] === undefined) {
    throw new Error(`Parameter '${name}' used without prior width declaration`);
  }
  return parameters[name];
}

function parseRepeatPattern(text, parameters) {
  const t = text.trim();
  if (/^(?:0|1|[01]+|\^[0-9a-fA-F]+|\\[0-9]+)$/.test(t)) {
    const lit = parseLiteralToken(t);
    return { kind: 'literal', bits: lit.bits };
  }
  const ref = parseParamRef(t);
  if (!ref.name) throw new Error('repeat() expects a literal or parameter pattern');
  ensureParam(parameters, ref);
  return { kind: 'param', param: ref.name, width: ref.width === null ? parameters[ref.name] : ref.width };
}

function repeatSegmentBits(seg, args) {
  let pat;
  if (seg.pattern.kind === 'literal') pat = seg.pattern.bits;
  else {
    pat = args[seg.pattern.param];
    if (pat === undefined || pat === null) throw new Error(`Unknown parameter '${seg.pattern.param}'`);
    pat = String(pat);
  }
  if (!pat.length) throw new Error('repeat pattern is empty');
  if (seg.width % pat.length !== 0) {
    throw new Error(
      `repeat: output width ${seg.width}b is not a multiple of pattern length ${pat.length}`
    );
  }
  return pat.repeat(seg.width / pat.length);
}

function parseSegmentLine(line, parameters, ctx) {
  const t = line.trim();
  if (!t) return null;
  const localDefNames = (ctx && ctx.localDefNames) || [];
  const protocolMode = (ctx && ctx.protocolMode) || 'assemble';
  const inDef = !!(ctx && ctx.inDef);
  const parseFieldMode = protocolMode === 'parse' && (inDef || !!(ctx && ctx.inChannel));

  const lenOfM = /^lengthOf\s*\(\s*(\w+)\s*\)\s+(\d+)b$/i.exec(t);
  if (lenOfM) {
    const target = lenOfM[1];
    if (!localDefNames.includes(target)) {
      throw new Error(`lengthOf() target '${target}' is not a local def`);
    }
    return { kind: 'lengthOf', target, width: parseInt(lenOfM[2], 10) };
  }

  const lenM = /^length\s*\(\s*([^)]+)\s*\)\s+(\d+)b$/i.exec(t);
  if (lenM) {
    const ref = parseParamRef(lenM[1]);
    if (ref.width !== null) registerParam(parameters, ref.name, ref.width);
    return { kind: 'length', param: ref.name, width: parseInt(lenM[2], 10) };
  }

  const wlDefM = /^withLength\s*\(\s*([^,]+)\s*,\s*(\d+)b\s*,\s*(\w+)\s*\)$/i.exec(t);
  if (wlDefM) {
    const ref = parseParamRef(wlDefM[1]);
    if (!(protocolMode === 'parse' && (ref.name === 'stream' || ref.name === 'data'))) {
      ensureParam(parameters, ref);
    }
    const defName = wlDefM[3];
    if (!localDefNames.includes(defName)) {
      throw new Error(`withLength() def '${defName}' is not a local def`);
    }
    return { kind: 'withLengthDef', param: ref.name, width: parseInt(wlDefM[2], 10), defName };
  }

  const wlFieldM = /^withLength\s*\(\s*([^,]+)\s*,\s*(\w+)\s+b\s*\)$/i.exec(t);
  if (wlFieldM) {
    const ref = parseParamRef(wlFieldM[1]);
    if (protocolMode !== 'parse') ensureParam(parameters, ref);
    return { kind: 'withLength', param: ref.name, widthField: wlFieldM[2] };
  }

  const wlM = /^withLength\s*\(\s*([^,]+)\s*,\s*(\d+)b\s*\)$/i.exec(t);
  if (wlM) {
    const ref = parseParamRef(wlM[1]);
    if (!(protocolMode === 'parse' && (ref.name === 'stream' || ref.name === 'data'))) {
      ensureParam(parameters, ref);
    }
    return { kind: 'withLength', param: ref.name, width: parseInt(wlM[2], 10) };
  }

  const chkM = /^checksum\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)$/i.exec(t);
  if (chkM) {
    const algo = chkM[1].toLowerCase();
    const target = chkM[2];
    if (algo !== 'crc16') throw new Error(`checksum algorithm '${chkM[1]}' is not supported`);
    if (!localDefNames.includes(target) && parameters[target] === undefined) {
      throw new Error(`checksum body '${target}' is not a local def or parameter`);
    }
    return { kind: 'checksum', algo, target };
  }

  const vchkM = /^validateChecksum\s*\(\s*(\w+)\s*,\s*([^)]+)\s*\)$/i.exec(t);
  if (vchkM) {
    const algo = vchkM[1].toLowerCase();
    if (algo !== 'crc16') throw new Error(`validateChecksum algorithm '${vchkM[1]}' is not supported`);
    const ref = parseParamRef(vchkM[2]);
    ensureParam(parameters, ref);
    return { kind: 'validateChecksum', algo, param: ref.name };
  }

  const expVarKw = /^expand\s*\(\s*([^,]+)\s*,\s*(\.\w+)\s*,\s*(\w+)\s+b\s*\)$/i.exec(t);
  if (expVarKw) {
    const ref = parseParamRef(expVarKw[1]);
    ensureParam(parameters, ref);
    if (protocolMode !== 'parse') registerParam(parameters, expVarKw[3], 8);
    return { kind: 'expand', param: ref.name, lutRef: expVarKw[2], keyWidthParam: expVarKw[3] };
  }

  const expM = /^expand\s*\(\s*([^,]+)\s*,\s*(\.\w+)\s*,\s*(\d+)b\s*\)$/i.exec(t);
  if (expM) {
    const ref = parseParamRef(expM[1]);
    ensureParam(parameters, ref);
    return { kind: 'expand', param: ref.name, lutRef: expM[2], keyWidth: parseInt(expM[3], 10) };
  }

  const colNestVarM = /^collapse\s*\(\s*withLength\s*\(\s*([^,]+)\s*,\s*(\d+)b\s*\)\s*,\s*(\.\w+)\s*,\s*(\w+)\s+b\s*\)$/i.exec(t);
  if (colNestVarM) {
    const ref = parseParamRef(colNestVarM[1]);
    if (!(protocolMode === 'parse' && (ref.name === 'stream' || ref.name === 'data'))) {
      ensureParam(parameters, ref);
    }
    if (protocolMode !== 'parse') registerParam(parameters, colNestVarM[4], 8);
    return {
      kind: 'collapse',
      withLength: { param: ref.name, width: parseInt(colNestVarM[2], 10) },
      lutRef: colNestVarM[3],
      keyWidthParam: colNestVarM[4],
    };
  }

  const colNestM = /^collapse\s*\(\s*withLength\s*\(\s*([^,]+)\s*,\s*(\d+)b\s*\)\s*,\s*(\.\w+)\s*,\s*(\d+)b\s*\)$/i.exec(t);
  if (colNestM) {
    const ref = parseParamRef(colNestM[1]);
    if (!(protocolMode === 'parse' && (ref.name === 'stream' || ref.name === 'data'))) {
      ensureParam(parameters, ref);
    }
    return {
      kind: 'collapse',
      withLength: { param: ref.name, width: parseInt(colNestM[2], 10) },
      lutRef: colNestM[3],
      keyWidth: parseInt(colNestM[4], 10),
    };
  }

  const colVarM = /^collapse\s*\(\s*([^,]+)\s*,\s*(\.\w+)\s*,\s*(\w+)\s+b\s*\)$/i.exec(t);
  if (colVarM) {
    const ref = parseParamRef(colVarM[1]);
    ensureParam(parameters, ref);
    if (protocolMode !== 'parse') registerParam(parameters, colVarM[3], 8);
    return { kind: 'collapse', param: ref.name, lutRef: colVarM[2], keyWidthParam: colVarM[3] };
  }

  const colM = /^collapse\s*\(\s*([^,]+)\s*,\s*(\.\w+)\s*,\s*(\d+)b\s*\)$/i.exec(t);
  if (colM) {
    const ref = parseParamRef(colM[1]);
    ensureParam(parameters, ref);
    return { kind: 'collapse', param: ref.name, lutRef: colM[2], keyWidth: parseInt(colM[3], 10) };
  }

  const revM = /^reverse\s*\(\s*([^)]+)\s*\)$/i.exec(t);
  if (revM) {
    const ref = parseParamRef(revM[1]);
    if (!ref.name) throw new Error('reverse() expects a parameter');
    const width = resolveParamWidth(parameters, ref.name, ref.width);
    return { kind: 'reverse', param: ref.name, width };
  }

  const peM = /^parityEven\s*\(\s*([^)]+)\s*\)$/i.exec(t);
  if (peM) {
    const ref = parseParamRef(peM[1]);
    if (!ref.name) throw new Error('parityEven() expects a parameter');
    resolveParamWidth(parameters, ref.name, ref.width);
    return { kind: 'parityEven', param: ref.name };
  }

  const poM = /^parityOdd\s*\(\s*([^)]+)\s*\)$/i.exec(t);
  if (poM) {
    const ref = parseParamRef(poM[1]);
    if (!ref.name) throw new Error('parityOdd() expects a parameter');
    resolveParamWidth(parameters, ref.name, ref.width);
    return { kind: 'parityOdd', param: ref.name };
  }

  const clkM = /^clock\s+(\d+)b$/i.exec(t);
  if (clkM) return { kind: 'clock', width: parseInt(clkM[1], 10) };

  const repFnM = /^repeat\s*\(\s*([^,]+)\s*,\s*(\d+)b\s*\)$/i.exec(t);
  if (repFnM) {
    const width = parseInt(repFnM[2], 10);
    const pattern = parseRepeatPattern(repFnM[1], parameters);
    return { kind: 'repeat', pattern, width };
  }

  const repM = /^repeat\s+([01])\s+(\d+)b$/i.exec(t);
  if (repM) {
    return {
      kind: 'repeat',
      pattern: { kind: 'literal', bits: repM[1] },
      width: parseInt(repM[2], 10),
    };
  }

  const restAllM = /^rest\s+~$/i.exec(t);
  if (restAllM) {
    if (!parseFieldMode) throw new Error('rest ~ is only supported in mode: parse');
    return { kind: 'rest', mode: 'all' };
  }

  const restResM = /^rest\s+-(\d+)b$/i.exec(t);
  if (restResM) {
    if (!parseFieldMode) throw new Error('rest -Nb is only supported in mode: parse');
    return { kind: 'rest', mode: 'reserve', reserve: parseInt(restResM[1], 10) };
  }

  const localRefUse = tryParseLocalRefUse(t, localDefNames, protocolMode);
  if (localRefUse) return localRefUse;

  const varM = /^(\w+)\s+~b$/i.exec(t);
  if (varM) {
    const name = varM[1];
    if (parseFieldMode) return { kind: 'parseField', param: name, width: 'var' };
    registerParam(parameters, name, 'var');
    return { kind: 'param', param: name, width: 'var' };
  }

  const parM = /^(\w+)\s+(\d+)b$/.exec(t);
  if (parM) {
    const name = parM[1];
    const width = parseInt(parM[2], 10);
    if (parseFieldMode) return { kind: 'parseField', param: name, width };
    registerParam(parameters, name, width);
    return { kind: 'param', param: name, width };
  }

  const bareM = /^(\w+)$/.exec(t);
  if (bareM) {
    const name = bareM[1];
    if (localDefNames.includes(name)) return { kind: 'localRef', name, tentative: false };
    if (parameters[name] !== undefined) {
      return { kind: 'param', param: name, width: parameters[name] };
    }
  }

  return parseLiteralToken(t);
}

function isInlineSiblingHeader(trimmed, localDefNames) {
  if (!trimmed) return false;
  if (/^(\w+)\?\s*:\s*$/.test(trimmed)) return true;
  if (/^(\w+)\s*:\s*$/.test(trimmed) && !/^def\s/i.test(trimmed)) {
    const m = /^(\w+)\s*:\s*$/.exec(trimmed);
    if (m && PROTOCOL_ATTRS.has(m[1])) return false;
    return true;
  }
  const mr = /^(\w+)((?:\[[0-9]+(?:-[0-9]*)?\]|\*|\+))?\?\s*$/.exec(trimmed);
  if (mr && localDefNames.includes(mr[1])) return true;
  return false;
}

function parseBodyItems(lines, parameters, ctx) {
  const items = [];
  const sourceLines = [];
  const localDefNames = (ctx && ctx.localDefNames) || [];
  const protocolMode = (ctx && ctx.protocolMode) || 'assemble';
  let i = 0;

  while (i < lines.length) {
    const trimmed = (lines[i] || '').trim();
    i++;
    if (!trimmed) continue;
    sourceLines.push(trimmed);

    if (protocolMode === 'parse') {
      const tentSec = /^(\w+)\?\s*:\s*$/.exec(trimmed);
      if (tentSec) {
        const innerLines = [];
        while (i < lines.length) {
          const peek = (lines[i] || '').trim();
          if (peek && isInlineSiblingHeader(peek, localDefNames)) break;
          innerLines.push(lines[i]);
          i++;
        }
        const inner = parseBodyItems(innerLines, parameters, ctx);
        items.push({ kind: 'inlineSection', name: tentSec[1], tentative: true, items: inner.items });
        continue;
      }

      const mandSec = /^(\w+)\s*:\s*$/.exec(trimmed);
      if (mandSec && !PROTOCOL_ATTRS.has(mandSec[1])) {
        const innerLines = [];
        while (i < lines.length) {
          const peek = (lines[i] || '').trim();
          if (peek && isInlineSiblingHeader(peek, localDefNames)) break;
          innerLines.push(lines[i]);
          i++;
        }
        const inner = parseBodyItems(innerLines, parameters, ctx);
        items.push({ kind: 'inlineSection', name: mandSec[1], tentative: false, items: inner.items });
        continue;
      }
    }

    const segCtx = Object.assign({}, ctx, { inInlineSection: true });
    const seg = parseSegmentLine(trimmed, parameters, segCtx);
    if (!seg) continue;
    if (seg.kind === 'localRef' && seg.tentative && protocolMode !== 'parse') {
      throw new Error(`tentative reference '${seg.name}?' requires mode: parse`);
    }
    items.push({ kind: 'segment', seg });
  }

  return { items, sourceLines };
}

function getBodyItems(container) {
  if (!container) return [];
  if (container.items && container.items.length) return container.items;
  return (container.segments || []).map(seg => ({ kind: 'segment', seg }));
}

function itemsHaveTentative(items) {
  for (const item of items) {
    if (item.kind === 'localRef' && item.tentative) return true;
    if (item.kind === 'inlineSection') {
      if (item.tentative) return true;
      if (itemsHaveTentative(item.items || [])) return true;
    }
    if (item.kind === 'segment' && item.seg && item.seg.kind === 'localRef' && item.seg.tentative) return true;
  }
  return false;
}

function protocolHasTentative(inst) {
  if (!inst) return false;
  for (const ch of inst.channels || []) {
    if (itemsHaveTentative(getBodyItems(ch))) return true;
  }
  for (const def of Object.values(inst.localDefs || {})) {
    if (itemsHaveTentative(getBodyItems(def))) return true;
  }
  return false;
}

function isTentativeItem(item) {
  if (item.kind === 'localRef') return !!item.tentative;
  if (item.kind === 'inlineSection') return !!item.tentative;
  if (item.kind === 'segment' && item.seg && item.seg.kind === 'localRef') return !!item.seg.tentative;
  return false;
}

function finishDef(currentDef, localDefs) {
  if (!currentDef) return null;
  if (localDefs[currentDef.name]) {
    throw new Error(`Duplicate protocol def '${currentDef.name}'`);
  }
  localDefs[currentDef.name] = currentDef;
  return null;
}

function parseProtocolBody(bodyRaw) {
  const attributes = {};
  const channels = [];
  const channelOrder = [];
  const parameters = {};
  const localDefs = {};
  const allLocalDefNames = [];
  for (const rawLine of bodyRaw.split('\n')) {
    const trimmed = stripComment(rawLine).trim();
    const defLine = /^def\s+(\w+)\s*:\s*$/i.exec(trimmed);
    if (defLine) allLocalDefNames.push(defLine[1]);
  }
  let currentChannel = null;
  let currentDef = null;
  let defBodyLines = null;
  let channelBodyLines = null;
  let seenChannel = false;
  let protocolMode = 'assemble';

  function flushDef() {
    if (!currentDef) return;
    const segCtx = {
      localDefNames: allLocalDefNames.filter(n => n !== currentDef.name),
      protocolMode,
      inDef: true,
      inChannel: false,
    };
    const parsed = parseBodyItems(defBodyLines || [], parameters, segCtx);
    currentDef.items = parsed.items;
    currentDef.sourceLines = parsed.sourceLines;
    currentDef.segments = parsed.items
      .filter(it => it.kind === 'segment')
      .map(it => it.seg);
    finishDef(currentDef, localDefs);
    currentDef = null;
    defBodyLines = null;
  }

  function flushChannel() {
    if (!currentChannel) return;
    const segCtx = {
      localDefNames: allLocalDefNames.slice(),
      protocolMode,
      inDef: false,
      inChannel: true,
    };
    const parsed = parseBodyItems(channelBodyLines || [], parameters, segCtx);
    currentChannel.items = parsed.items;
    currentChannel.sourceLines = parsed.sourceLines;
    currentChannel.segments = parsed.items
      .filter(it => it.kind === 'segment')
      .map(it => it.seg);
    currentChannel = null;
    channelBodyLines = null;
  }

  for (const rawLine of bodyRaw.split('\n')) {
    const trimmed = stripComment(rawLine).trim();
    if (!trimmed || trimmed === ':') continue;

    const attrMEarly = !seenChannel && !currentDef && /^(\w+)\s*:\s*(.+)$/.exec(trimmed);
    if (attrMEarly && PROTOCOL_ATTRS.has(attrMEarly[1])) {
      if (attrMEarly[1] === 'mode') protocolMode = attrMEarly[2].trim();
    }

    if (/^def\s+\w+\?\s*:/i.test(trimmed)) {
      throw new Error("Protocol def cannot use '?'; use name? at reference site");
    }

    const defLine = /^def\s+(\w+)\s*:\s*$/i.exec(trimmed);
    if (defLine && !seenChannel) {
      flushDef();
      flushChannel();
      currentDef = { name: defLine[1], items: [], segments: [], sourceLines: [] };
      defBodyLines = [];
      continue;
    }

    const channelOnly = /^(\w+)\s*:\s*$/.exec(trimmed);
    if (channelOnly) {
      flushDef();
      flushChannel();
      seenChannel = true;
      currentChannel = { name: channelOnly[1], items: [], segments: [], sourceLines: [] };
      channelBodyLines = [];
      channels.push(currentChannel);
      channelOrder.push(currentChannel.name);
      continue;
    }

    if (!seenChannel) {
      if (currentDef) {
        defBodyLines.push(trimmed);
        continue;
      }
      const attrM = /^(\w+)\s*:\s*(.+)$/.exec(trimmed);
      if (attrM) {
        const key = attrM[1];
        const val = attrM[2].trim();
        if (!PROTOCOL_ATTRS.has(key)) throw new Error(`Unknown protocol attribute '${key}'`);
        if (key === 'clockType' && !CLOCK_TYPES.has(val)) {
          throw new Error('clockType must be \'lowFirst\' or \'highFirst\'');
        }
        if (key === 'mode' && !PROTOCOL_MODES.has(val)) {
          throw new Error('mode must be \'assemble\' or \'parse\'');
        }
        if (key === 'codebookLoad' && !/^\.\w+$/.test(val)) {
          throw new Error('codebookLoad must be an inline LUT reference (e.g. .huff)');
        }
        if (key === 'parseResult' && !PARSE_RESULT_MODES.has(val)) {
          throw new Error('parseResult must be \'all\' or \'collapseOnly\'');
        }
        if (key === 'parseView' && !PARSE_VIEW_MODES.has(val)) {
          throw new Error('parseView must be \'tree\' or \'true\'');
        }
        if (key === 'parseView' && protocolMode !== 'parse') {
          throw new Error('parseView requires mode: parse');
        }
        attributes[key] = val;
        continue;
      }
    }

    if (!currentChannel) throw new Error(`Protocol segment '${trimmed}' outside of any output channel`);
    channelBodyLines.push(trimmed);
  }

  flushDef();
  flushChannel();
  if (!channels.length) throw new Error('Protocol definition has no output channels');
  if (attributes.mode === 'parse') {
    registerParam(parameters, 'data', 'var');
  }
  if (protocolMode !== 'parse' && protocolHasTentative({ channels, localDefs })) {
    throw new Error('tentative sections require mode: parse');
  }
  return { attributes, channels, parameters, channelOrder, localDefs, bodyRaw };
}

function popcount(bits) {
  let n = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') n++;
  return n;
}

function padBinary(val, width) {
  if (val.length > width) return val.slice(val.length - width);
  return val.padStart(width, '0');
}

function paramBitLength(inst, param, args) {
  const val = args[param];
  if (val === undefined || val === null) throw new Error(`Unknown parameter '${param}'`);
  const w = inst.parameters[param];
  if (w === 'var' || w === undefined) return val.length;
  return w;
}

function paramBits(inst, seg, args) {
  const val = args[seg.param];
  if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
  if (seg.width === 'var') return val;
  return padBinary(val, seg.width);
}

function resolveLutInst(lutRef, ctx) {
  if (!ctx || typeof ctx.getInlineLut !== 'function') {
    throw new Error(`Cannot resolve LUT '${lutRef}' without inline context`);
  }
  const lut = ctx.getInlineLut(lutRef);
  if (!lut || lut.kind !== 'lut') throw new Error(`Undefined LUT inline instance '${lutRef}'`);
  if (!lut.lutTable) throw new Error(`LUT '${lutRef}' has no lookup table`);
  return lut;
}

function protocolExpand(dataBits, lutInst, keyWidth) {
  if (dataBits.length % keyWidth !== 0) {
    throw new Error(`expand input length ${dataBits.length} is not a multiple of keyWidth ${keyWidth}`);
  }
  const length = lutInst.attributes.length !== undefined ? parseInt(lutInst.attributes.length, 10) : 16;
  let out = '';
  for (let pos = 0; pos < dataBits.length; pos += keyWidth) {
    const key = dataBits.substr(pos, keyWidth);
    const addr = parseInt(key, 2);
    if (isNaN(addr) || addr < 0 || addr >= length) {
      throw new Error(`expand lookup address ${addr} out of range for LUT length ${length}`);
    }
    const val = lutInst.lutTable[addr];
    if (val === undefined || val === null) {
      throw new Error(`expand lookup failed at address ${addr}`);
    }
    out += val;
  }
  return out;
}

function protocolCollapseFixed(dataBits, lutInst, keyWidth) {
  const depth = lutInst.attributes.depth !== undefined ? parseInt(lutInst.attributes.depth, 10) : 4;
  if (dataBits.length % depth !== 0) {
    throw new Error(`collapse input length ${dataBits.length} is not a multiple of LUT depth ${depth}`);
  }
  const length = lutInst.attributes.length !== undefined ? parseInt(lutInst.attributes.length, 10) : 16;
  let out = '';
  for (let pos = 0; pos < dataBits.length; pos += depth) {
    const chunk = dataBits.substr(pos, depth);
    let found = false;
    for (let i = 0; i < length; i++) {
      if (lutInst.lutTable[i] === chunk) {
        out += i.toString(2).padStart(keyWidth, '0');
        found = true;
        break;
      }
    }
    if (!found) throw new Error(`collapse failed: no LUT entry for value '${chunk}'`);
  }
  return out;
}

function protocolCollapse(dataBits, lutInst, keyWidth) {
  if (lutInst.attributes && lutInst.attributes.prefixFree) {
    const fn = typeof lutCollapsePrefixFree === 'function' ? lutCollapsePrefixFree : null;
    if (!fn) throw new Error('prefixFree collapse is not available');
    return fn(lutInst, dataBits, keyWidth);
  }
  return protocolCollapseFixed(dataBits, lutInst, keyWidth);
}

function protocolWithLength(dataBits, width) {
  if (dataBits.length < width) {
    throw new Error('withLength: input shorter than length prefix');
  }
  const prefix = dataBits.substr(0, width);
  const len = parseInt(prefix, 2);
  const maxLen = (1 << width) - 1;
  if (len > maxLen) {
    throw new Error(`withLength: length ${len} exceeds maximum ${maxLen} for ${width}b prefix`);
  }
  if (dataBits.length < width + len) {
    throw new Error(`withLength: input shorter than declared payload (${len} bits)`);
  }
  return dataBits.substr(width, len);
}

function crc16Bits(dataBits) {
  const padded = dataBits.length % 8 === 0
    ? dataBits
    : dataBits + '0'.repeat(8 - (dataBits.length % 8));
  let crc = 0xFFFF;
  for (let i = 0; i < padded.length; i += 8) {
    crc ^= parseInt(padded.substr(i, 8), 2) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return crc;
}

function checksumCrc16(bodyBits) {
  return padBinary(crc16Bits(bodyBits).toString(2), 16);
}

function validateChecksumCrc16(fullBits) {
  if (fullBits.length < 16) throw new Error('validateChecksum: input shorter than checksum field');
  const body = fullBits.substr(0, fullBits.length - 16);
  const expected = fullBits.substr(fullBits.length - 16);
  const actual = checksumCrc16(body);
  if (actual !== expected) {
    throw new Error(`validateChecksum: mismatch (expected ${expected}, got ${actual})`);
  }
  return body;
}

function resolveKeyWidth(seg, args, fields) {
  if (seg.keyWidthParam) {
    const raw = (fields && fields.get(seg.keyWidthParam)) || args[seg.keyWidthParam];
    if (raw === undefined || raw === null) {
      throw new Error(`Unknown keyWidth parameter '${seg.keyWidthParam}'`);
    }
    const kw = parseInt(raw, 2);
    if (!kw || kw < 1) throw new Error(`Invalid keyWidth value '${raw}'`);
    return kw;
  }
  return seg.keyWidth;
}

class ParseFields {
  constructor() {
    this._values = {};
  }
  set(name, bits) { this._values[name] = bits; }
  get(name) { return this._values[name]; }
  snapshot() { return Object.assign({}, this._values); }
  restore(snap) { this._values = Object.assign({}, snap); }
  widthFrom(name) {
    const val = this.get(name);
    if (val === undefined || val === null) {
      throw new Error(`parse: field '${name}' is not set`);
    }
    const w = parseInt(val, 2);
    if (!Number.isFinite(w) || w < 0) {
      throw new Error(`parse: invalid width in field '${name}'`);
    }
    return w;
  }
}

class ParseStream {
  constructor(bits) {
    this.bits = String(bits);
    this.pos = 0;
  }
  get remaining() { return this.bits.length - this.pos; }
  save() { return this.pos; }
  restore(pos) { this.pos = pos; }
  read(n) {
    if (n < 0) throw new Error('parse: negative read width');
    if (this.pos + n > this.bits.length) {
      throw new Error(`parse: need ${n} bits but only ${this.remaining} remain`);
    }
    const val = this.bits.substr(this.pos, n);
    this.pos += n;
    return val;
  }
  readRest() {
    const val = this.bits.substr(this.pos);
    this.pos = this.bits.length;
    return val;
  }
  fork(n) {
    return new ParseStream(this.read(n));
  }
}

function normalizeParseItem(item) {
  if (item.kind === 'segment' && item.seg && item.seg.kind === 'localRef') {
    return {
      kind: 'localRef',
      name: item.seg.name,
      tentative: !!item.seg.tentative,
      repeat: item.seg.repeat || null,
    };
  }
  return item;
}

function getLocalRefFromItem(item) {
  if (item.kind === 'segment' && item.seg && item.seg.kind === 'localRef') return item.seg;
  const norm = normalizeParseItem(item);
  if (norm.kind === 'localRef') return norm;
  return null;
}

function appendRepeatViewNodes(viewCtx, viewOffset, nodes) {
  if (!viewCtx || !viewCtx.root || !nodes || !nodes.length) return viewOffset;
  for (const node of nodes) {
    node.offset = viewOffset;
    viewCtx.root.children.push(node);
    viewOffset += node.width || 0;
  }
  viewCtx.root._nextOffset = viewOffset;
  return viewOffset;
}

function parseRepeatedLocalDef(defName, repeat, stream, fields, inst, args, attributes, ctx, cache, viewCtx, options, anchorItems) {
  const localDefs = inst.localDefs || {};
  if (!localDefs[defName]) throw new Error(`Unknown protocol def '${defName}'`);
  const min = repeat.min;
  const max = repeat.max;
  const hasAnchor = anchorItems && anchorItems.length;

  if (max == null && !hasAnchor) {
    let out = '';
    const viewNodes = [];
    let count = 0;
    while (true) {
      const snap = stream.save();
      const fieldSnap = fields.snapshot();
      const iterView = viewCtx ? { root: { children: [], fields: {} } } : null;
      try {
        const chunk = parseDefSegments(
          defName, stream, fields, inst, args, attributes, ctx, cache, iterView, options
        );
        out += chunk;
        if (viewCtx) {
          viewNodes.push({
            name: defName,
            index: count,
            width: chunk.length,
            children: iterView && iterView.root ? iterView.root.children : [],
            fields: iterView && iterView.root ? Object.assign({}, iterView.root.fields || {}) : {},
          });
        }
        count++;
      } catch (err) {
        stream.restore(snap);
        fields.restore(fieldSnap);
        break;
      }
    }
    if (count < min) {
      const spec = formatRepeatSpec(repeat);
      const where = options && options.sectionName ? ` in '${options.sectionName}'` : '';
      throw new Error(`parse: repeat ${defName}${spec} minimum ${min} not met${where}`);
    }
    if (viewCtx) appendRepeatViewNodes(viewCtx, viewCtx.root._nextOffset || 0, viewNodes);
    return out;
  }

  const maxTry = max != null ? max : 4096;
  for (let count = maxTry; count >= min; count--) {
    const snap = stream.save();
    const fieldSnap = fields.snapshot();
    try {
      let out = '';
      const viewNodes = [];
      for (let i = 0; i < count; i++) {
        const iterView = viewCtx ? { root: { children: [], fields: {} } } : null;
        const chunk = parseDefSegments(
          defName, stream, fields, inst, args, attributes, ctx, cache, iterView, options
        );
        out += chunk;
        if (viewCtx) {
          viewNodes.push({
            name: defName,
            index: i,
            width: chunk.length,
            children: iterView && iterView.root ? iterView.root.children : [],
            fields: iterView && iterView.root ? Object.assign({}, iterView.root.fields || {}) : {},
          });
        }
      }
      let anchorOut = '';
      if (hasAnchor) {
        anchorOut = parseItemsList(
          anchorItems, stream, fields, inst, args, attributes, ctx, cache, viewCtx, options
        );
      }
      if (viewCtx) appendRepeatViewNodes(viewCtx, viewCtx.root._nextOffset || 0, viewNodes);
      return out + anchorOut;
    } catch (err) {
      stream.restore(snap);
      fields.restore(fieldSnap);
    }
  }
  if (min === 0) return '';
  const spec = formatRepeatSpec(repeat);
  const where = options && options.sectionName ? ` in '${options.sectionName}'` : '';
  throw new Error(`parse: repeat ${defName}${spec} minimum ${min} not met${where}`);
}

function parseSingleItem(item, stream, fields, inst, args, attributes, ctx, cache, viewCtx, anchorItems) {
  const it = normalizeParseItem(item);
  switch (it.kind) {
    case 'segment':
      return parseSegment(it.seg, stream, fields, inst, args, attributes, ctx, cache, viewCtx);
    case 'localRef': {
      const localDefs = inst.localDefs || {};
      const def = localDefs[it.name];
      if (!def) throw new Error(`Unknown protocol def '${it.name}'`);
      if (it.repeat) {
        return parseRepeatedLocalDef(
          it.name, it.repeat, stream, fields, inst, args, attributes, ctx, cache, viewCtx,
          { mandatory: !it.tentative, sectionName: it.name }, anchorItems || null
        );
      }
      return parseItemsList(
        getBodyItems(def), stream, fields, inst, args, attributes, ctx, cache, viewCtx,
        { mandatory: !it.tentative, sectionName: it.name }
      );
    }
    case 'inlineSection':
      return parseItemsList(
        it.items || [], stream, fields, inst, args, attributes, ctx, cache, viewCtx,
        { mandatory: !it.tentative, sectionName: it.name }
      );
    default:
      throw new Error(`Unknown protocol item kind '${it.kind}'`);
  }
}

function parseItemsList(items, stream, fields, inst, args, attributes, ctx, cache, viewCtx, options) {
  const parentMandatory = !options || options.mandatory !== false;
  let out = '';
  let idx = 0;
  let viewOffset = viewCtx && viewCtx.root ? (viewCtx.root._nextOffset || 0) : 0;

  function pushViewNode(node) {
    if (!viewCtx || !viewCtx.root) return;
    node.offset = viewOffset;
    viewCtx.root.children.push(node);
    viewOffset += node.width || 0;
    viewCtx.root._nextOffset = viewOffset;
  }

  while (idx < items.length) {
    if (isTentativeItem(items[idx])) {
      const alts = [];
      while (idx < items.length && isTentativeItem(items[idx])) {
        alts.push(items[idx]);
        idx++;
      }
      const groupPos = stream.save();
      const groupFields = fields.snapshot();
      let matched = false;
      let altBits = '';
      let matchedAlt = null;
      for (const alt of alts) {
        const altPos = stream.save();
        const altFields = fields.snapshot();
        const altView = viewCtx ? { root: { children: [], fields: {} }, activeNode: null } : null;
        try {
          altBits = parseSingleItem(alt, stream, fields, inst, args, attributes, ctx, cache, altView);
          matched = true;
          matchedAlt = alt;
          if (viewCtx && altView) {
            const node = buildViewNodeFromAlt(alt, altBits, altView, fields);
            if (node) pushViewNode(node);
          }
          break;
        } catch (err) {
          stream.restore(altPos);
          fields.restore(altFields);
        }
      }
      if (!matched) {
        stream.restore(groupPos);
        fields.restore(groupFields);
        if (parentMandatory) {
          const where = options && options.sectionName ? ` in '${options.sectionName}'` : '';
          throw new Error(`parse: no matching alternative${where}`);
        }
      } else if (includeParseOutput(matchedAlt, ctx)) {
        out += altBits;
      }
    } else {
      const item = items[idx];
      const localRef = getLocalRefFromItem(item);
      const secName = item.kind === 'inlineSection' ? item.name
        : (localRef ? localRef.name : null);
      const anchorItems = (localRef && localRef.repeat && localRef.repeat.max == null && idx + 1 < items.length)
        ? items.slice(idx + 1)
        : null;
      const childView = (viewCtx && secName && !(localRef && localRef.repeat))
        ? { root: { children: [], fields: {} }, activeNode: null }
        : viewCtx;
      const bits = parseSingleItem(item, stream, fields, inst, args, attributes, ctx, cache, childView, anchorItems);
      if (viewCtx && secName && !(localRef && localRef.repeat)) {
        pushViewNode({
          name: secName,
          width: bits.length,
          children: childView && childView.root ? childView.root.children : [],
          fields: childView && childView.root ? Object.assign({}, childView.root.fields || {}) : {},
        });
      }
      if (includeParseOutput(item, ctx)) out += bits;
      if (anchorItems && localRef && localRef.repeat && localRef.repeat.max == null) {
        idx += 1 + anchorItems.length;
      } else {
        idx++;
      }
    }
  }
  return out;
}

function includeParseOutput(item, ctx) {
  if (!ctx || !ctx.collapseOnly) return true;
  if (item.kind === 'segment') return item.seg.kind === 'collapse';
  return true;
}

function collectParseFieldBits(fields) {
  const out = {};
  if (!fields || !fields._values) return out;
  for (const [k, v] of Object.entries(fields._values)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

function buildViewNodeFromAlt(alt, bits, altView, _fields) {
  const name = altAltName(alt);
  if (!name) return null;
  return {
    name,
    width: bits.length,
    children: altView && altView.root ? altView.root.children : [],
    fields: altView && altView.root ? Object.assign({}, altView.root.fields || {}) : {},
  };
}

function altAltName(item) {
  const it = normalizeParseItem(item);
  if (it.kind === 'localRef') return it.name;
  if (it.kind === 'inlineSection') return it.name;
  return null;
}

function parseDefSegments(defName, stream, fields, inst, args, attributes, ctx, cache, viewCtx, options) {
  const localDefs = inst.localDefs || {};
  const def = localDefs[defName];
  if (!def) throw new Error(`Unknown protocol def '${defName}'`);
  return parseItemsList(
    getBodyItems(def), stream, fields, inst, args, attributes, ctx, cache, viewCtx, options
  );
}

function parseSegment(seg, stream, fields, inst, args, attributes, ctx, cache, viewCtx) {
  const localDefs = inst.localDefs || {};
  switch (seg.kind) {
    case 'literal': {
      const val = stream.read(seg.bits.length);
      if (val !== seg.bits) {
        throw new Error(`parse: expected literal '${seg.bits}' but received '${val}'`);
      }
      return '';
    }
    case 'parseField': {
      const w = seg.width === 'var' ? stream.remaining : seg.width;
      const val = stream.read(w);
      fields.set(seg.param, val);
      if (viewCtx && viewCtx.root) {
        viewCtx.root.fields = viewCtx.root.fields || {};
        viewCtx.root.fields[seg.param] = val;
      }
      return val;
    }
    case 'param': {
      const w = seg.width === 'var' ? stream.remaining : seg.width;
      const val = stream.read(w);
      fields.set(seg.param, val);
      return val;
    }
    case 'rest': {
      if (seg.mode === 'all') {
        return stream.readRest();
      }
      if (seg.mode === 'reserve') {
        const n = seg.reserve;
        if (stream.remaining < n) {
          throw new Error(
            `rest -${n}b: need ${n} bits reserved for footer but only ${stream.remaining} remain`
          );
        }
        const take = stream.remaining - n;
        return stream.read(take);
      }
      throw new Error(`Unknown rest mode '${seg.mode}'`);
    }
    case 'localRef':
      if (seg.repeat) {
        return parseRepeatedLocalDef(
          seg.name, seg.repeat, stream, fields, inst, args, attributes, ctx, cache, viewCtx,
          { mandatory: !seg.tentative, sectionName: seg.name }, null
        );
      }
      return parseDefSegments(
        seg.name, stream, fields, inst, args, attributes, ctx, cache, viewCtx,
        { mandatory: !seg.tentative, sectionName: seg.name }
      );
    case 'withLengthDef': {
      const prefixW = seg.width;
      const len = parseInt(stream.read(prefixW), 2);
      const maxLen = (1 << prefixW) - 1;
      if (len > maxLen) {
        throw new Error(`withLength: length ${len} exceeds maximum ${maxLen} for ${prefixW}b prefix`);
      }
      const region = stream.fork(len);
      let out = '';
      while (region.remaining > 0) {
        const entryFields = new ParseFields();
        const before = region.pos;
        out += parseDefSegments(seg.defName, region, entryFields, inst, args, attributes, ctx, cache);
        if (region.pos === before) {
          throw new Error(`withLength: def '${seg.defName}' consumed no bits`);
        }
        if (typeof ctx.onParseEntry === 'function') {
          ctx.onParseEntry(entryFields.get('sym'), entryFields.get('rest') || entryFields.get('codeword'));
        }
      }
      if (region.remaining !== 0) {
        throw new Error(`withLength: def '${seg.defName}' left ${region.remaining} bits unconsumed`);
      }
      return out;
    }
    case 'withLength': {
      if (seg.widthField) {
        const w = fields.widthFrom(seg.widthField);
        const payload = stream.read(w);
        fields.set(seg.param, payload);
        return payload;
      }
      let prefixW = seg.width;
      const len = parseInt(stream.read(prefixW), 2);
      const maxLen = (1 << prefixW) - 1;
      if (len > maxLen) {
        throw new Error(`withLength: length ${len} exceeds maximum ${maxLen} for ${prefixW}b prefix`);
      }
      const payload = stream.read(len);
      fields.set(seg.param, payload);
      return payload;
    }
    case 'validateChecksum': {
      const full = args[seg.param];
      if (full === undefined || full === null) throw new Error(`Unknown parameter '${seg.param}'`);
      if (seg.algo === 'crc16') validateChecksumCrc16(full);
      return '';
    }
    case 'collapse': {
      if (ctx && typeof ctx.flushLut === 'function') ctx.flushLut();
      let data;
      if (seg.withLength) {
        const prefixW = seg.withLength.width;
        const len = parseInt(stream.read(prefixW), 2);
        data = stream.read(len);
      } else if (seg.param === 'stream' || seg.param === 'data') {
        data = stream.readRest();
      } else {
        data = args[seg.param];
        if (data === undefined || data === null) throw new Error(`Unknown parameter '${seg.param}'`);
      }
      const lut = resolveLutInst(seg.lutRef, ctx);
      const keyWidth = resolveKeyWidth(seg, args, fields);
      return protocolCollapse(data, lut, keyWidth);
    }
    default:
      throw new Error(`Protocol parse does not support segment kind '${seg.kind}'`);
  }
}

function parseProtocol(inst, args, ctx) {
  const streamParam = args.stream !== undefined ? 'stream' : 'data';
  const streamBits = args[streamParam];
  if (streamBits === undefined || streamBits === null) {
    throw new Error(`Parse protocol requires '${streamParam}' parameter`);
  }
  const stream = new ParseStream(streamBits);
  const fields = new ParseFields();
  const cache = new Map();
  const channelWidths = [];
  let blob = '';
  let parseEntryCount = 0;
  const useParseView = inst.attributes && (
    inst.attributes.parseView === 'tree' || inst.attributes.parseView === 'true'
  );
  const parseView = useParseView ? {
    protocolRef: inst.name,
    blobOffset: 0,
    children: [],
    fields: {},
  } : null;
  const parseCtx = Object.assign({}, ctx || {}, {
    collapseOnly: (inst.attributes && inst.attributes.parseResult) === 'collapseOnly',
    onParseEntry(sym, codeword) {
      parseEntryCount++;
      if (ctx && typeof ctx.onParseEntry === 'function') ctx.onParseEntry(sym, codeword);
    },
  });
  for (const chName of inst.channelOrder) {
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) throw new Error(`Missing channel '${chName}' in protocol instance`);
    const viewCtx = parseView ? { root: parseView, activeNode: null } : null;
    const bits = parseItemsList(
      getBodyItems(channel), stream, fields, inst, args, inst.attributes || {}, parseCtx, cache, viewCtx,
      { mandatory: true }
    );
    channelWidths.push(bits.length);
    blob += bits;
  }
  const nSymRaw = fields.get('nSym');
  if (nSymRaw !== undefined && nSymRaw !== null) {
    const expected = parseInt(nSymRaw, 2);
    if (Number.isFinite(expected) && parseEntryCount > 0 && parseEntryCount !== expected) {
      throw new Error(`parse: codebook entry count ${parseEntryCount} does not match nSym ${expected}`);
    }
  }
  const result = { blob, channelWidths, totalWidth: blob.length, fields: fields._values };
  if (parseView) {
    parseView.fields = collectParseFieldBits(fields);
    parseView.blobWidth = blob.length;
    result.parseView = parseView;
  }
  return result;
}

function protocolUsesParseMode(inst) {
  return (inst.attributes && inst.attributes.mode === 'parse');
}

function evalSegment(seg, args, attributes, ctx) {
  const inst = ctx && ctx.inst;
  switch (seg.kind) {
    case 'literal': return seg.bits;
    case 'param': return paramBits(inst, seg, args);
    case 'reverse': return paramBits(inst, seg, args).split('').reverse().join('');
    case 'parityEven': {
      const val = args[seg.param];
      if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
      return String(popcount(val) % 2 === 0 ? 0 : 1);
    }
    case 'parityOdd': {
      const val = args[seg.param];
      if (val === undefined || val === null) throw new Error(`Unknown parameter '${seg.param}'`);
      return String(popcount(val) % 2 === 0 ? 1 : 0);
    }
    case 'clock': {
      const pair = (attributes.clockType || 'lowFirst') === 'highFirst' ? '10' : '01';
      let out = '';
      while (out.length < seg.width) out += pair;
      return out.slice(0, seg.width);
    }
    case 'repeat':
      return repeatSegmentBits(seg, args);
    case 'length': {
      const len = paramBitLength(inst, seg.param, args);
      const maxLen = (1 << seg.width) - 1;
      if (len > maxLen) {
        throw new Error(`length(${seg.param}) value ${len} exceeds ${maxLen} for ${seg.width}b field`);
      }
      return padBinary(len.toString(2), seg.width);
    }
    case 'withLength': {
      const full = args[seg.param];
      if (full === undefined || full === null) throw new Error(`Unknown parameter '${seg.param}'`);
      if (seg.widthField) {
        throw new Error(`withLength(..., ${seg.widthField} b) is only supported in mode: parse`);
      }
      return protocolWithLength(full, seg.width);
    }
    case 'expand': {
      const data = paramBits(inst, seg, args);
      const lut = resolveLutInst(seg.lutRef, ctx);
      const keyWidth = resolveKeyWidth(seg, args, null);
      return protocolExpand(data, lut, keyWidth);
    }
    case 'collapse': {
      let data;
      if (seg.withLength) {
        const full = args[seg.withLength.param];
        if (full === undefined || full === null) throw new Error(`Unknown parameter '${seg.withLength.param}'`);
        data = protocolWithLength(full, seg.withLength.width);
      } else {
        data = paramBits(inst, seg, args);
      }
      const lut = resolveLutInst(seg.lutRef, ctx);
      const keyWidth = resolveKeyWidth(seg, args, null);
      return protocolCollapse(data, lut, keyWidth);
    }
    case 'checksum': {
      throw new Error('checksum() cannot be evaluated as a standalone segment; use in channel/def body');
    }
    default:
      throw new Error(`Unknown protocol segment kind '${seg.kind}'`);
  }
}

function evalDefBits(name, inst, args, attributes, ctx, cache) {
  const key = `def:${name}`;
  if (cache.has(key)) return cache.get(key);
  const def = (inst.localDefs || {})[name];
  if (!def) throw new Error(`Unknown protocol def '${name}'`);
  let bits = '';
  for (const item of getBodyItems(def)) {
    if (item.kind === 'localRef' || item.kind === 'inlineSection') {
      throw new Error(`assemble mode does not support tentative sections in def '${name}'`);
    }
    if (item.kind === 'segment') bits += evalSegmentWithCache(item.seg, inst, args, attributes, ctx, cache);
  }
  cache.set(key, bits);
  return bits;
}

function evalSegmentWithCache(seg, inst, args, attributes, ctx, cache) {
  if (seg.kind === 'localRef') return evalDefBits(seg.name, inst, args, attributes, ctx, cache);
  if (seg.kind === 'lengthOf') {
    const targetBits = evalDefBits(seg.target, inst, args, attributes, ctx, cache);
    const len = targetBits.length;
    const maxLen = (1 << seg.width) - 1;
    if (len > maxLen) {
      throw new Error(`lengthOf(${seg.target}) value ${len} exceeds ${maxLen} for ${seg.width}b field`);
    }
    return padBinary(len.toString(2), seg.width);
  }
  if (seg.kind === 'checksum') {
    const localDefs = inst.localDefs || {};
    let bodyBits;
    if (localDefs[seg.target]) {
      bodyBits = evalDefBits(seg.target, inst, args, attributes, ctx, cache);
    } else {
      const val = args[seg.target];
      if (val === undefined || val === null) throw new Error(`Unknown checksum body '${seg.target}'`);
      bodyBits = val;
    }
    if (seg.algo === 'crc16') return checksumCrc16(bodyBits);
    throw new Error(`checksum algorithm '${seg.algo}' is not supported`);
  }
  if (seg.kind === 'withLengthDef') {
    throw new Error('withLength(..., def) is only supported in mode: parse');
  }
  const evalCtx = Object.assign({}, ctx || {}, { inst });
  return evalSegment(seg, args, attributes, evalCtx);
}

function evalChannelSegments(itemsOrSegments, inst, args, attributes, ctx) {
  const cache = new Map();
  let bits = '';
  const items = Array.isArray(itemsOrSegments) && itemsOrSegments.length && itemsOrSegments[0].kind
    ? itemsOrSegments
    : (itemsOrSegments || []).map(seg => ({ kind: 'segment', seg }));
  for (const item of items) {
    if (item.kind === 'localRef' || item.kind === 'inlineSection') {
      throw new Error('assemble mode does not support tentative sections');
    }
    if (item.kind === 'segment') bits += evalSegmentWithCache(item.seg, inst, args, attributes, ctx, cache);
  }
  return bits;
}

function generateProtocol(inst, args, ctx) {
  if (protocolUsesParseMode(inst)) return parseProtocol(inst, args, ctx);
  const channelWidths = [];
  let blob = '';
  for (const chName of inst.channelOrder) {
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) throw new Error(`Missing channel '${chName}' in protocol instance`);
    const bits = evalChannelSegments(getBodyItems(channel), inst, args, inst.attributes || {}, ctx);
    channelWidths.push(bits.length);
    blob += bits;
  }
  return { blob, channelWidths, totalWidth: blob.length };
}

function lutIsPrefixFree(lutInst) {
  return !!(lutInst && lutInst.attributes && lutInst.attributes.prefixFree);
}

function segmentTriggersDynamic(seg, getLut) {
  switch (seg.kind) {
    case 'param':
      return seg.width === 'var';
    case 'withLength':
    case 'withLengthDef':
    case 'validateChecksum':
      return true;
    case 'checksum':
      return true;
    case 'expand':
    case 'collapse': {
      if (seg.withLength || seg.keyWidthParam) return true;
      const lut = getLut && getLut(seg.lutRef);
      return lut ? lutIsPrefixFree(lut) : true;
    }
    default:
      return false;
  }
}

function segmentStaticWidth(seg, localDefs, parameters, getLut, visiting) {
  switch (seg.kind) {
    case 'literal':
      return seg.bits.length;
    case 'param':
      return seg.width === 'var' ? null : seg.width;
    case 'reverse':
      return seg.width === 'var' ? null : seg.width;
    case 'parityEven':
    case 'parityOdd':
      return 1;
    case 'clock':
    case 'repeat':
    case 'length':
    case 'lengthOf':
      return seg.width;
    case 'localRef':
      return defStaticWidth(seg.name, localDefs, parameters, getLut, visiting);
    case 'expand': {
      if (seg.keyWidthParam) return null;
      const lut = getLut && getLut(seg.lutRef);
      if (!lut || lutIsPrefixFree(lut)) return null;
      const dataW = parameters[seg.param];
      if (dataW === 'var' || dataW === undefined) return null;
      const depth = lut.attributes.depth !== undefined ? parseInt(lut.attributes.depth, 10) : 4;
      if (dataW % seg.keyWidth !== 0) return null;
      return (dataW / seg.keyWidth) * depth;
    }
    case 'collapse': {
      if (seg.keyWidthParam) return null;
      const lut = getLut && getLut(seg.lutRef);
      if (!lut || lutIsPrefixFree(lut)) return null;
      if (seg.withLength) return null;
      const dataW = parameters[seg.param];
      if (dataW === 'var' || dataW === undefined) return null;
      const depth = lut.attributes.depth !== undefined ? parseInt(lut.attributes.depth, 10) : 4;
      if (dataW % depth !== 0) return null;
      return (dataW / depth) * seg.keyWidth;
    }
    case 'withLength':
    case 'withLengthDef':
    case 'checksum':
    case 'validateChecksum':
      return null;
    default:
      return 0;
  }
}

function itemStaticWidth(item, localDefs, parameters, getLut, visiting) {
  if (item.kind === 'localRef' || item.kind === 'inlineSection') return null;
  if (item.kind !== 'segment') return 0;
  const seg = item.seg;
  switch (seg.kind) {
    case 'literal':
      return seg.bits.length;
    case 'parseField':
      return seg.width === 'var' ? null : seg.width;
    case 'rest':
      return null;
    case 'localRef':
      if (seg.repeat) return null;
      return defStaticWidth(seg.name, localDefs, parameters, getLut, visiting);
    default:
      return segmentStaticWidth(seg, localDefs, parameters, getLut, visiting);
  }
}

function defStaticWidth(name, localDefs, parameters, getLut, visiting) {
  if (visiting.has(name)) throw new Error(`Circular protocol def reference '${name}'`);
  const def = localDefs[name];
  if (!def) throw new Error(`Unknown protocol def '${name}'`);
  visiting.add(name);
  let sum = 0;
  for (const item of getBodyItems(def)) {
    const w = itemStaticWidth(item, localDefs, parameters, getLut, visiting);
    if (w === null) {
      visiting.delete(name);
      return null;
    }
    sum += w;
  }
  visiting.delete(name);
  return sum;
}

function channelStaticWidth(channel, localDefs, parameters, getLut) {
  const visiting = new Set();
  let sum = 0;
  for (const item of getBodyItems(channel)) {
    const w = itemStaticWidth(item, localDefs, parameters, getLut, visiting);
    if (w === null) return null;
    sum += w;
  }
  return sum;
}

function inferProtocolWidth(inst, getLut) {
  const localDefs = inst.localDefs || {};
  const parameters = inst.parameters || {};

  function scanItems(items) {
    for (const item of items) {
      const seg = item.kind === 'segment' ? item.seg : null;
      if (item.kind === 'localRef' || item.kind === 'inlineSection') return true;
      if (seg && segmentTriggersDynamic(seg, getLut)) return true;
      if (seg && seg.kind === 'localRef') {
        if (seg.repeat) return true;
        const def = localDefs[seg.name];
        if (def && scanItems(getBodyItems(def))) return true;
      }
      if (item.kind === 'inlineSection' && scanItems(item.items || [])) return true;
    }
    return false;
  }

  for (const ch of inst.channels || []) {
    if (scanItems(getBodyItems(ch))) return { kind: 'dynamic' };
  }
  for (const name of Object.keys(localDefs)) {
    if (scanItems(getBodyItems(localDefs[name]))) return { kind: 'dynamic' };
  }

  let total = 0;
  for (const chName of inst.channelOrder || []) {
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) continue;
    const w = channelStaticWidth(channel, localDefs, parameters, getLut);
    if (w === null) return { kind: 'dynamic' };
    total += w;
  }
  return { kind: 'static', width: total };
}

function decodeChannel(channel, bits, attributes, paramOutputs) {
  let pos = 0;
  let lastParamBits = null;

  for (const seg of channel.segments) {
    switch (seg.kind) {
      case 'literal': {
        const expected = seg.bits;
        const actual = bits.substr(pos, expected.length);
        if (actual !== expected) {
          const expBit = expected.length === 1 ? expected : `literal '${expected}'`;
          const gotBit = actual.length ? actual[0] : '?';
          throw new Error(`Protocol decode failed:\nexpected ${expBit}\nbut received '${gotBit}'`);
        }
        pos += expected.length;
        break;
      }
      case 'param': {
        const width = seg.width === 'var' ? bits.length - pos : seg.width;
        const val = bits.substr(pos, width);
        if (val.length !== width) {
          throw new Error('Protocol decode failed:\nunexpected end of channel data');
        }
        pos += width;
        lastParamBits = val;
        paramOutputs.push(val);
        break;
      }
      case 'reverse': {
        const raw = bits.substr(pos, seg.width);
        if (raw.length !== seg.width) {
          throw new Error('Protocol decode failed:\nunexpected end of channel data');
        }
        const val = raw.split('').reverse().join('');
        pos += seg.width;
        lastParamBits = val;
        paramOutputs.push(val);
        break;
      }
      case 'parityEven': {
        if (lastParamBits == null) throw new Error('Protocol decode failed:\nparity without prior parameter');
        const expected = String(popcount(lastParamBits) % 2 === 0 ? 0 : 1);
        const actual = bits[pos];
        if (actual !== expected) {
          throw new Error(`Protocol decode failed:\nexpected parity bit '${expected}'\nbut received '${actual || '?'}'`);
        }
        pos++;
        break;
      }
      case 'parityOdd': {
        if (lastParamBits == null) throw new Error('Protocol decode failed:\nparity without prior parameter');
        const expected = String(popcount(lastParamBits) % 2 === 0 ? 1 : 0);
        const actual = bits[pos];
        if (actual !== expected) {
          throw new Error(`Protocol decode failed:\nexpected parity bit '${expected}'\nbut received '${actual || '?'}'`);
        }
        pos++;
        break;
      }
      case 'clock': {
        const pair = (attributes.clockType || 'lowFirst') === 'highFirst' ? '10' : '01';
        let wave = '';
        while (wave.length < seg.width) wave += pair;
        const expected = wave.slice(0, seg.width);
        const actual = bits.substr(pos, seg.width);
        if (actual !== expected) {
          throw new Error('Protocol decode failed:\nexpected clock waveform');
        }
        pos += seg.width;
        break;
      }
      case 'repeat': {
        const expected = repeatSegmentBits(seg, {});
        const actual = bits.substr(pos, seg.width);
        if (actual !== expected) {
          const pat = seg.pattern.kind === 'literal'
            ? seg.pattern.bits
            : seg.pattern.param;
          throw new Error(`Protocol decode failed:\nexpected repeat pattern '${pat}'`);
        }
        pos += seg.width;
        break;
      }
      default:
        throw new Error(`Protocol decode does not support segment kind '${seg.kind}'`);
    }
  }

  if (pos !== bits.length) {
    throw new Error('Protocol output width mismatch');
  }
}

function decodeProtocol(inst, channelBitStrings) {
  const order = inst.channelOrder || [];
  if (!Array.isArray(channelBitStrings)) {
    throw new Error(`Expected ${order.length} protocol channels but received 0`);
  }
  if (channelBitStrings.length !== order.length) {
    throw new Error(`Expected ${order.length} protocol channels but received ${channelBitStrings.length}`);
  }

  const paramOutputs = [];
  for (let i = 0; i < order.length; i++) {
    const chName = order[i];
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) throw new Error(`Missing channel '${chName}' in protocol instance`);
    decodeChannel(channel, String(channelBitStrings[i]), inst.attributes || {}, paramOutputs);
  }

  const blob = paramOutputs.join('');
  return { params: paramOutputs, blob, totalWidth: blob.length };
}

function formatParamWidth(width) {
  return width === 'var' ? '~b' : `${width}b`;
}

function formatProtocolInstanceDoc(alias, inst) {
  const lines = [];
  lines.push(`${alias} (inline [protocol])`);
  if (inst.widthInfo) {
    lines.push(`  width: ${inst.widthInfo.kind === 'static' ? `static ${inst.widthInfo.width}b` : 'dynamic'}`);
  }
  lines.push('');
  lines.push('  decode:');
  lines.push('    supported');
  lines.push('');
  const localDefs = inst.localDefs || {};
  const defNames = Object.keys(localDefs);
  if (defNames.length) {
    lines.push('  defs:');
    for (const name of defNames) lines.push(`    ${name}`);
  }
  lines.push('  channels:');
  for (const name of inst.channelOrder || []) lines.push(`    ${name}`);
  for (const defName of defNames) {
    const def = localDefs[defName];
    lines.push('');
    lines.push(`  def ${defName}:`);
    for (const src of def.sourceLines || []) lines.push(`    ${src}`);
  }
  for (const ch of inst.channels || []) {
    lines.push('');
    lines.push(`  ${ch.name}:`);
    for (const src of ch.sourceLines || []) lines.push(`    ${src}`);
  }
  const names = Object.keys(inst.parameters || {});
  if (names.length) {
    lines.push('');
    lines.push('  parameters:');
    for (const name of names) lines.push(`    ${name} ${formatParamWidth(inst.parameters[name])}`);
  }
  return lines;
}

function formatProtocolTypeDoc() {
  return [
    'inline [protocol] .name:',
    '',
    '  clockType: lowFirst',
    '',
    '  def payload:',
    '    length(data) 8b',
    '    data',
    '',
    '  tx:',
    '    0',
    '    reverse(data 8b)',
    '    1',
    '',
    '  sclk:',
    '    clock 8b',
    '',
    '  cs:',
    '    repeat 0 8b',
    '',
    '  :',
    '',
    'Built-in generators:',
    '  reverse(param)     parityEven(param)     parityOdd(param)',
    '  clock Nb           repeat(pattern, Nb)   repeat bit Nb',
    '  length(param) Nb   lengthOf(def) Nb',
    '  withLength(param, Nb)   withLength(param, field b)   withLength(param, Nb, def)',
    '  expand(param, .lut, keyWidth)   collapse(param, .lut, keyWidth)',
    '  checksum(crc16, def)   validateChecksum(crc16, param)',
    '',
    'Attributes:',
    '  clockType: lowFirst | highFirst',
    '  mode: assemble | parse',
    '  codebookLoad: .lut   (parse mode — populate LUT from codebook entries)',
    '  parseResult: all | collapseOnly   (parse output filter)',
    '  parseView: tree | true   (optional structured show + field access)',
    '',
    'Parse-only (mode: parse):',
    '  tentative sections:  foo?  foo?:  (ordered choice + rollback)',
    '  rest ~               consume to EOF (last segment only)',
    '  rest -Nb             consume remaining−N (footer reserve)',
    '',
    'Invoke (assignment only):',
    '  10bit tx = .name { data = ^41 }',
    '  8bit mosi, 8bit sclk = .name { data = ^A5 }',
  ];
}

function resolveParseViewPath(view, pathParts) {
  if (!view || !pathParts || !pathParts.length) {
    throw new Error('parseView: empty field path');
  }
  let node = view;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (node.fields && node.fields[part] !== undefined) {
      if (i === pathParts.length - 1) {
        const bits = node.fields[part];
        if (!bits || !bits.length) {
          throw new Error(`parseView: field '${pathParts.join(':')}' has no bits`);
        }
        return bits;
      }
      throw new Error(`parseView: field '${pathParts.join(':')}' is not a section`);
    }
    const child = (node.children || []).find(c => c.name === part);
    if (!child) {
      const matched = (node.children || []).map(c => c.name).filter(Boolean).join(', ') || '(none)';
      throw new Error(`parseView: field '${part}' is not present (matched: ${matched})`);
    }
    if (i === pathParts.length - 1) {
      if (!child.width) {
        throw new Error(`parseView: field '${pathParts.join(':')}' has no bits`);
      }
      return null;
    }
    node = child;
  }
  throw new Error(`parseView: could not resolve '${pathParts.join(':')}'`);
}

function findParseViewChild(node, part, nextPart) {
  if (/^\d+$/.test(part)) {
    const index = parseInt(part, 10);
    return (node.children || []).find(c => c.index === index);
  }
  const byName = (node.children || []).filter(c => c.name === part);
  if (!byName.length) return null;
  if (byName.length === 1 && byName[0].index == null) return byName[0];
  if (nextPart != null && /^\d+$/.test(nextPart)) {
    const index = parseInt(nextPart, 10);
    return byName.find(c => c.index === index) || null;
  }
  return byName.length === 1 ? byName[0] : null;
}

function resolveParseViewSlice(view, pathParts) {
  if (!pathParts || !pathParts.length) return { offset: 0, width: view.blobWidth || 0 };
  let node = view;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (node.fields && Object.prototype.hasOwnProperty.call(node.fields, part)) {
      const bits = node.fields[part];
      if (i !== pathParts.length - 1) {
        throw new Error(`parseView: '${part}' is a field, not a section`);
      }
      if (!bits || !bits.length) {
        throw new Error(`parseView: field '${pathParts.join(':')}' has no bits`);
      }
      return { fieldBits: bits };
    }
    const nextPart = i + 1 < pathParts.length ? pathParts[i + 1] : null;
    let child = findParseViewChild(node, part, nextPart);
    if (child && nextPart != null && /^\d+$/.test(nextPart) && child.index === parseInt(nextPart, 10)) {
      i++;
    }
    if (!child) {
      throw new Error(`parseView: field '${part}' is not present`);
    }
    if (i === pathParts.length - 1) {
      if (!child.width) {
        throw new Error(`parseView: field '${pathParts.join(':')}' has no bits`);
      }
      return { offset: child.offset || 0, width: child.width };
    }
    node = child;
  }
  throw new Error(`parseView: could not resolve '${pathParts.join(':')}'`);
}

function formatParseViewShow(view, wireName, bitWidth, refStr) {
  const lines = [];
  const bw = bitWidth != null ? bitWidth : (view.blobWidth || 0);
  lines.push(`(${bw}wire<${view.protocolRef || 'protocol'}>)${refStr ? ' (ref: ' + refStr + ')' : ''}`);
  if (view.fields) {
    for (const [k, v] of Object.entries(view.fields)) {
      if (v !== undefined && v !== null) lines.push(`  ${k} = ${v}`);
    }
  }
  function walkChildren(children, indent) {
    for (const ch of children || []) {
      if (!ch.name) continue;
      const label = ch.index !== undefined && ch.index !== null ? `${ch.name}[${ch.index}]` : ch.name;
      if (!ch.width) {
        lines.push(`${indent}${label} = empty (0bit)`);
      } else {
        lines.push(`${indent}${label}`);
        if (ch.fields) {
          for (const [k, v] of Object.entries(ch.fields)) {
            if (v !== undefined && v !== null) lines.push(`${indent}     ${k}: ${v}`);
          }
        }
        walkChildren(ch.children, indent + '     ');
      }
    }
  }
  walkChildren(view.children, '  ');
  return lines.join('\n');
}

const protocolAssemblerExports = {
  parseProtocolBody,
  generateProtocol,
  parseProtocol,
  decodeProtocol,
  inferProtocolWidth,
  protocolHasTentative,
  protocolExpand,
  protocolCollapse,
  protocolWithLength,
  crc16Bits,
  checksumCrc16,
  validateChecksumCrc16,
  formatProtocolInstanceDoc,
  formatProtocolTypeDoc,
  resolveParseViewSlice,
  formatParseViewShow,
};

if (typeof module !== 'undefined' && module.exports) module.exports = protocolAssemblerExports;
if (typeof globalThis !== 'undefined') {
  for (const [k, v] of Object.entries(protocolAssemblerExports)) globalThis[k] = v;
}
