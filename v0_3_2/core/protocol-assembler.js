/* ================= PROTOCOL ASSEMBLER ================= */

const PROTOCOL_ATTRS = new Set(['clockType', 'mode']);
const PROTOCOL_MODES = new Set(['assemble', 'parse']);
const CLOCK_TYPES = new Set(['lowFirst', 'highFirst']);

function stripComment(line) {
  const hash = line.indexOf('#');
  if (hash >= 0) return line.slice(0, hash);
  return line;
}

function parseLiteralToken(token) {
  const t = token.trim();
  if (t === '0' || t === '1') return { kind: 'literal', bits: t };
  if (/^[01]+$/.test(t)) return { kind: 'literal', bits: t };
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
    ensureParam(parameters, ref);
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
    ensureParam(parameters, ref);
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
    registerParam(parameters, expVarKw[3], 8);
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
    ensureParam(parameters, ref);
    registerParam(parameters, colNestVarM[4], 8);
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
    ensureParam(parameters, ref);
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
    registerParam(parameters, colVarM[3], 8);
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
    if (localDefNames.includes(name)) return { kind: 'localRef', name };
    if (parameters[name] !== undefined) {
      return { kind: 'param', param: name, width: parameters[name] };
    }
  }

  return parseLiteralToken(t);
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
  let currentChannel = null;
  let currentDef = null;
  let seenChannel = false;
  let protocolMode = 'assemble';

  for (const rawLine of bodyRaw.split('\n')) {
    const trimmed = stripComment(rawLine).trim();
    if (!trimmed || trimmed === ':') continue;

    const attrMEarly = !seenChannel && !currentDef && /^(\w+)\s*:\s*(.+)$/.exec(trimmed);
    if (attrMEarly && PROTOCOL_ATTRS.has(attrMEarly[1])) {
      if (attrMEarly[1] === 'mode') protocolMode = attrMEarly[2].trim();
    }

    const defLine = /^def\s+(\w+)\s*:\s*$/i.exec(trimmed);
    if (defLine && !seenChannel) {
      currentDef = finishDef(currentDef, localDefs);
      currentDef = { name: defLine[1], segments: [], sourceLines: [] };
      continue;
    }

    const channelOnly = /^(\w+)\s*:\s*$/.exec(trimmed);
    if (channelOnly) {
      if (currentDef && !seenChannel) currentDef = finishDef(currentDef, localDefs);
      seenChannel = true;
      currentChannel = { name: channelOnly[1], segments: [], sourceLines: [] };
      channels.push(currentChannel);
      channelOrder.push(currentChannel.name);
      continue;
    }

    const segCtx = {
      localDefNames: Object.keys(localDefs),
      protocolMode,
      inDef: !!currentDef && !seenChannel,
      inChannel: !!currentChannel,
    };

    if (!seenChannel) {
      if (currentDef) {
        const seg = parseSegmentLine(trimmed, parameters, segCtx);
        if (seg) {
          currentDef.segments.push(seg);
          currentDef.sourceLines.push(trimmed);
        }
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
        attributes[key] = val;
        continue;
      }
    }

    if (!currentChannel) throw new Error(`Protocol segment '${trimmed}' outside of any output channel`);
    const seg = parseSegmentLine(trimmed, parameters, segCtx);
    if (seg) {
      currentChannel.segments.push(seg);
      currentChannel.sourceLines.push(trimmed);
    }
  }

  if (currentDef && !seenChannel) finishDef(currentDef, localDefs);
  if (!channels.length) throw new Error('Protocol definition has no output channels');
  if (attributes.mode === 'parse') {
    registerParam(parameters, 'data', 'var');
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

function parseDefSegments(defName, stream, fields, inst, args, attributes, ctx, cache) {
  const localDefs = inst.localDefs || {};
  const def = localDefs[defName];
  if (!def) throw new Error(`Unknown protocol def '${defName}'`);
  let out = '';
  for (const seg of def.segments) {
    out += parseSegment(seg, stream, fields, inst, args, attributes, ctx, cache);
  }
  return out;
}

function parseSegment(seg, stream, fields, inst, args, attributes, ctx, cache) {
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
      return val;
    }
    case 'param': {
      const w = seg.width === 'var' ? stream.remaining : seg.width;
      const val = stream.read(w);
      fields.set(seg.param, val);
      return val;
    }
    case 'localRef':
      return parseDefSegments(seg.name, stream, fields, inst, args, attributes, ctx, cache);
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
  for (const chName of inst.channelOrder) {
    const channel = inst.channels.find(c => c.name === chName);
    if (!channel) throw new Error(`Missing channel '${chName}' in protocol instance`);
    let bits = '';
    for (const seg of channel.segments) {
      bits += parseSegment(seg, stream, fields, inst, args, inst.attributes || {}, ctx, cache);
    }
    channelWidths.push(bits.length);
    blob += bits;
  }
  return { blob, channelWidths, totalWidth: blob.length, fields: fields._values };
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
  for (const seg of def.segments) bits += evalSegmentWithCache(seg, inst, args, attributes, ctx, cache);
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

function evalChannelSegments(segments, inst, args, attributes, ctx) {
  const cache = new Map();
  let bits = '';
  for (const seg of segments) {
    bits += evalSegmentWithCache(seg, inst, args, attributes, ctx, cache);
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
    const bits = evalChannelSegments(channel.segments, inst, args, inst.attributes || {}, ctx);
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

function defStaticWidth(name, localDefs, parameters, getLut, visiting) {
  if (visiting.has(name)) throw new Error(`Circular protocol def reference '${name}'`);
  const def = localDefs[name];
  if (!def) throw new Error(`Unknown protocol def '${name}'`);
  visiting.add(name);
  let sum = 0;
  for (const seg of def.segments) {
    const w = segmentStaticWidth(seg, localDefs, parameters, getLut, visiting);
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
  for (const seg of channel.segments) {
    const w = segmentStaticWidth(seg, localDefs, parameters, getLut, visiting);
    if (w === null) return null;
    sum += w;
  }
  return sum;
}

function inferProtocolWidth(inst, getLut) {
  const localDefs = inst.localDefs || {};
  const parameters = inst.parameters || {};

  function scanSegments(segments) {
    for (const seg of segments) {
      if (segmentTriggersDynamic(seg, getLut)) return true;
      if (seg.kind === 'localRef') {
        const def = localDefs[seg.name];
        if (def && scanSegments(def.segments)) return true;
      }
    }
    return false;
  }

  for (const ch of inst.channels || []) {
    if (scanSegments(ch.segments)) return { kind: 'dynamic' };
  }
  for (const name of Object.keys(localDefs)) {
    if (scanSegments(localDefs[name].segments)) return { kind: 'dynamic' };
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
    '',
    'Invoke (assignment only):',
    '  10bit tx = .name { data = ^41 }',
    '  8bit mosi, 8bit sclk = .name { data = ^A5 }',
  ];
}

const protocolAssemblerExports = {
  parseProtocolBody,
  generateProtocol,
  parseProtocol,
  decodeProtocol,
  inferProtocolWidth,
  protocolExpand,
  protocolCollapse,
  protocolWithLength,
  crc16Bits,
  checksumCrc16,
  validateChecksumCrc16,
  formatProtocolInstanceDoc,
  formatProtocolTypeDoc,
};

if (typeof module !== 'undefined' && module.exports) module.exports = protocolAssemblerExports;
if (typeof globalThis !== 'undefined') {
  for (const [k, v] of Object.entries(protocolAssemblerExports)) globalThis[k] = v;
}
