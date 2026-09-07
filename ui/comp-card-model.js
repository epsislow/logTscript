/**
 * Comp card model — parse / serialize / patch `comp [...]` blocks for CodeMirror widgets.
 * Testable in Node (LogTScriptCompCardModel) and browser.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LogTScriptCompCardModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ON_ENUM = ['raise', 'edge', '1'];

  function countBraces(line) {
    let open = 0;
    let close = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '{') open++;
      else if (line[i] === '}') close++;
    }
    return open - close;
  }

  function getCompSpecial(compType, registry) {
    if (!registry || !compType) return null;
    const handler = registry.get(compType);
    if (!handler || !handler.getSpecialParseAttributes) return null;
    return handler.getSpecialParseAttributes();
  }

  function consumeBraceBlock(bodyLines, startIdx) {
    const rawLines = [bodyLines[startIdx]];
    let braceDepth = countBraces(bodyLines[startIdx]);
    let i = startIdx + 1;
    while (i < bodyLines.length && braceDepth > 0) {
      rawLines.push(bodyLines[i]);
      braceDepth += countBraces(bodyLines[i]);
      i++;
    }
    return { rawLines: rawLines, endIdx: i };
  }

  function innerTextFromBraceRawLines(rawLines) {
    const joined = rawLines.join('\n');
    const open = joined.indexOf('{');
    const close = joined.lastIndexOf('}');
    if (open < 0 || close < 0 || close <= open) return joined.trim();
    return joined.slice(open + 1, close).trim();
  }

  function parsePlcMapEntries(text) {
    const entries = [];
    const cleaned = String(text || '').trim();
    if (!cleaned) return entries;
    const lines = cleaned.split('\n');
    for (let li = 0; li < lines.length; li++) {
      let line = lines[li].trim().replace(/,\s*$/, '');
      if (!line || line === '{' || line === '}') continue;
      const m = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
      if (m) entries.push({ symbol: m[1], target: m[2].trim() });
    }
    if (!entries.length && cleaned.includes('=')) {
      cleaned.replace(/^\{?\s*/, '').replace(/\s*\}?$/, '').split(',').forEach(function (part) {
        part = part.trim();
        const m = part.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (m) entries.push({ symbol: m[1], target: m[2].trim() });
      });
    }
    return entries;
  }

  function serializePlcMapLines(name, entries, indent) {
    const inner = indent + '  ';
    const lines = [indent + name + ': {'];
    entries.forEach(function (e) {
      lines.push(inner + e.symbol + ' = ' + e.target);
    });
    lines.push(indent + '}');
    return lines;
  }

  function parsePlcGlobalsEntries(text) {
    const entries = [];
    String(text || '').split('\n').forEach(function (rawLine) {
      let line = rawLine.trim().replace(/,\s*$/, '');
      if (!line || line === '{' || line === '}') return;
      const withWidth = line.match(/^([A-Za-z_]\w*)\s*:\s*(\d+)\s*$/);
      if (withWidth) {
        entries.push({ symbol: withWidth[1], width: parseInt(withWidth[2], 10) });
        return;
      }
      const symOnly = line.match(/^([A-Za-z_]\w*)\s*$/);
      if (symOnly) entries.push({ symbol: symOnly[1], width: 1 });
    });
    return entries;
  }

  function serializePlcGlobalsLines(name, entries, indent) {
    const inner = indent + '  ';
    const lines = [indent + name + ': {'];
    entries.forEach(function (e) {
      if (e.width != null && e.width !== 1) {
        lines.push(inner + e.symbol + ': ' + e.width);
      } else {
        lines.push(inner + e.symbol);
      }
    });
    lines.push(indent + '}');
    return lines;
  }

  function composeLogicBindingRawLine(logicVar, typeText, pinName) {
    const v = String(logicVar || '').trim();
    const t = String(typeText || '').trim();
    const p = String(pinName || '').trim();
    if (!v && !t && !p) return '';
    return v + ' is ' + t + (p ? ' ' + p : '');
  }

  function serializeLogicBinding(b) {
    const typeText = b.typeText != null ? b.typeText : formatLogicBindingType(b);
    const pinName = b.pinName || '';
    const errors = getLogicBindingFieldErrors(b.logicVar, typeText, pinName);
    if (errors.size > 0) {
      return b.rawLine || composeLogicBindingRawLine(b.logicVar, typeText, pinName);
    }
    let s = b.logicVar + ' is ' + b.bindType;
    if (b.numberFormat) s += '/' + b.numberFormat;
    if (b.listFlag) s += ' list';
    s += ' ' + pinName;
    return s;
  }

  function attachLogicObserveRawLines(bodyRaw, observeDefs) {
    const rawLines = [];
    String(bodyRaw || '').split('\n').forEach(function (line) {
      const t = line.trim();
      if (t.startsWith('observe')) rawLines.push(t);
    });
    observeDefs.forEach(function (od, i) {
      if (rawLines[i]) od.rawLine = rawLines[i];
    });
  }

  function serializeLogicProgramLines(ref, bindings, observeDefs, indent) {
    const inner = indent + '  ';
    const lines = [indent + ref + ' {'];
    bindings.forEach(function (b) {
      lines.push(inner + serializeLogicBinding(b));
    });
    observeDefs.forEach(function (o) {
      lines.push(inner + (o.rawLine || ('observe ' + serializeLogicBinding(o))));
    });
    lines.push(indent + '}');
    return lines;
  }

  function serializeCanvasArg(arg) {
    if (!arg || typeof arg !== 'object') return String(arg);
    if (arg.kind === 'number' || arg.kind === 'float') return String(arg.value);
    if (arg.kind === 'string') return '"' + arg.value + '"';
    if (arg.kind === 'wireRef') {
      if (arg.numberFormat) return arg.pinName + '/' + arg.numberFormat;
      return arg.pinName;
    }
    if (arg.value != null) return String(arg.value);
    return '';
  }

  function serializeCanvasCall(call) {
    if (typeof call === 'string') return call;
    const name = call.name || call.kind;
    const args = (call.args || []).map(serializeCanvasArg);
    return name + '(' + args.join(', ') + ')';
  }

  function callTextFromCanvasCall(call) {
    return serializeCanvasCall(call);
  }

  function findInlineCanvasRefs(src) {
    const refs = [];
    const re = /^\s*inline\s+\[canvas\]\s+(\.\S+)\s*:/gm;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) {
      if (refs.indexOf(m[1]) === -1) refs.push(m[1]);
    }
    return refs;
  }

  function findInlineLogicRefs(src) {
    const refs = [];
    const re = /^\s*inline\s+\[logic\]\s+(\.\S+)\s*:/gm;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) {
      if (refs.indexOf(m[1]) === -1) refs.push(m[1]);
    }
    return refs;
  }

  function findInlinePlcRefs(src) {
    const refs = [];
    const re = /^\s*inline\s+\[plc\]\s+(\.\S+)\s*:/gm;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) {
      if (refs.indexOf(m[1]) === -1) refs.push(m[1]);
    }
    return refs;
  }

  function formatLogicBindingType(binding) {
    if (!binding) return '';
    if (binding.typeText != null && binding.typeText !== '') return binding.typeText;
    let s = binding.bindType || '';
    if (binding.numberFormat) s += '/' + binding.numberFormat;
    if (binding.listFlag) s += ' list';
    return s.trim();
  }

  function parseLogicBindingType(typeText) {
    const raw = String(typeText || '').trim();
    if (!raw) return null;
    const listFlag = /\blist\b/i.test(raw);
    const rest = raw.replace(/\blist\b/gi, '').trim();
    const m = rest.match(/^(number|bool|text|float)(?:\/([A-Za-z0-9]+))?$/i);
    if (!m) return null;
    return {
      bindType: m[1].toLowerCase(),
      numberFormat: m[2] || null,
      listFlag: listFlag
    };
  }

  function getLogicBindingFieldErrors(logicVar, typeText, pinName) {
    const bad = new Set();
    const v = String(logicVar || '').trim();
    const p = String(pinName || '').trim();
    if (!/^[A-Z_][A-Za-z0-9_]*$/.test(v)) bad.add('var');
    if (!parseLogicBindingType(typeText)) bad.add('type');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p)) bad.add('pin');
    return bad;
  }

  function bindingFromFields(logicVar, typeText, pinName) {
    const v = String(logicVar || '').trim();
    const t = String(typeText || '').trim();
    const p = String(pinName || '').trim();
    const parsed = parseLogicBindingType(t);
    const binding = { logicVar: v, typeText: t, pinName: p };
    const errors = getLogicBindingFieldErrors(v, t, p);
    if (errors.size === 0 && parsed) {
      binding.bindType = parsed.bindType;
      binding.numberFormat = parsed.numberFormat;
      binding.listFlag = parsed.listFlag;
    } else {
      binding.rawLine = composeLogicBindingRawLine(v, t, p);
    }
    return binding;
  }

  function extractLogicBindingLines(innerRaw) {
    const lines = [];
    String(innerRaw || '').split('\n').forEach(function (line) {
      const t = line.trim();
      if (!t || t.startsWith(';')) return;
      if (t.startsWith('observe')) return;
      lines.push(t);
    });
    return lines;
  }

  function draftBindingFromRawLine(rawLine) {
    const binding = { rawLine: rawLine };
    const m = rawLine.match(/^(\S+)\s+is\s+(.*)$/);
    if (!m) {
      binding.logicVar = '';
      binding.typeText = '';
      binding.pinName = '';
      return binding;
    }
    binding.logicVar = m[1];
    const validRe = /^([A-Z_][A-Za-z0-9_]*)\s+is\s+(number|bool|text|float)(?:\/([A-Za-z0-9]+))?(?:\s+list)?\s+([a-zA-Z_][A-Za-z0-9_]*)$/;
    const vm = rawLine.match(validRe);
    if (vm) {
      const listFlag = /\blist\b/.test(rawLine);
      binding.bindType = vm[2];
      binding.numberFormat = vm[3] || null;
      binding.listFlag = listFlag;
      binding.pinName = vm[4];
      binding.typeText = formatLogicBindingType(binding);
      return binding;
    }
    const rest = m[2].trim();
    const parts = rest.split(/\s+/);
    if (parts.length >= 2) {
      binding.pinName = parts[parts.length - 1];
      binding.typeText = parts.slice(0, -1).join(' ');
    } else {
      binding.typeText = rest;
      binding.pinName = '';
    }
    return binding;
  }

  function enrichLogicBindingsFromRaw(bindings, innerRaw) {
    const rawLines = extractLogicBindingLines(innerRaw);
    if (!rawLines.length && !bindings.length) return bindings;
    if (bindings.length === rawLines.length) {
      return bindings.map(function (b, i) {
        const copy = Object.assign({}, b);
        if (!copy.typeText) copy.typeText = formatLogicBindingType(copy);
        copy.rawLine = rawLines[i];
        return copy;
      });
    }
    return rawLines.map(draftBindingFromRawLine);
  }

  function extractBraceSectionInner(src, sectionRe) {
    const m = sectionRe.exec(String(src || ''));
    if (!m) return null;
    let pos = m.index + m[0].length;
    let depth = 1;
    let buf = '';
    while (pos < src.length && depth > 0) {
      const ch = src[pos];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
      if (depth >= 1) buf += ch;
      pos++;
    }
    return buf;
  }

  function splitCallLines(sectionInner) {
    let lines = String(sectionInner).split('\n').map(function (line) { return line.trim(); });
    while (lines.length && lines[0] === '') lines.shift();
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function enrichCanvasProgramCallsFromRaw(program, innerRaw) {
    const src = String(innerRaw || '');
    const initInner = extractBraceSectionInner(src, /\binitDraw\s*\{/);
    if (initInner !== null) {
      program.initDraw = splitCallLines(initInner);
    }
    const whenRe = /renderer\s+when\s*\(\s*([^)]+)\s*\)\s*\{/g;
    let wm;
    const whenBlocks = [];
    while ((wm = whenRe.exec(src)) !== null) {
      const whenRef = wm[1].trim();
      let hitbox = whenRef;
      let event = 'press';
      const colon = whenRef.indexOf(':');
      if (colon >= 0) {
        hitbox = whenRef.slice(0, colon).trim();
        event = whenRef.slice(colon + 1).trim() || 'press';
      }
      let pos = wm.index + wm[0].length;
      let depth = 1;
      let buf = '';
      while (pos < src.length && depth > 0) {
        const ch = src[pos];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) break;
        }
        if (depth >= 1) buf += ch;
        pos++;
      }
      whenBlocks.push({
        hitbox: hitbox,
        event: event,
        calls: splitCallLines(buf)
      });
    }
    if (whenBlocks.length) program.whenRenderers = whenBlocks;
    return program;
  }

  function getHitboxBlockItem(model) {
    return model.bodyItems.find(function (i) { return i.kind === 'hitboxBlock'; }) || null;
  }

  function getHitboxBlockInner(model) {
    const item = getHitboxBlockItem(model);
    if (item) return innerTextFromBraceRawLines(item.rawLines);
    for (let i = 0; i < model.bodyItems.length; i++) {
      const rawItem = model.bodyItems[i];
      if (rawItem.kind !== 'raw' || !rawItem.rawLines.length) continue;
      const first = rawItem.rawLines[0].trim();
      if (/^hitbox\s*\{/.test(first) || /^hitbox\s*:\s*\{/.test(rawItem.rawLines[0])) {
        return innerTextFromBraceRawLines(rawItem.rawLines);
      }
    }
    return null;
  }

  function getHitboxZoneNames(model) {
    const item = getHitboxBlockItem(model);
    if (item && item.zones) return Object.keys(item.zones).sort();
    const inner = getHitboxBlockInner(model);
    if (!inner || typeof parseCanvasHitboxBlock !== 'function') return [];
    try {
      const parsed = parseCanvasHitboxBlock(inner, 'hitbox');
      return Object.keys(parsed.zones || {}).sort();
    } catch (e) {
      return [];
    }
  }

  function hitboxZoneShapeLine(zone) {
    if (zone.shapeLine) return zone.shapeLine;
    if (zone.rect) {
      const r = zone.rect;
      return 'rect(' + r.x + ', ' + r.y + ', ' + r.w + ', ' + r.h + ')';
    }
    return 'rect(0, 0, 30, 30)';
  }

  function normalizeHitboxZone(zone) {
    const copy = {
      name: zone.name,
      shapeLine: zone.shapeLine || hitboxZoneShapeLine(zone),
      touchType: zone.touchType != null ? zone.touchType : 1,
      stroke: zone.stroke || null,
      pouts: (zone.pouts || []).map(function (p) { return Object.assign({}, p); })
    };
    const m = copy.shapeLine.match(/rect\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (m) {
      copy.rect = { x: parseInt(m[1], 10), y: parseInt(m[2], 10), w: parseInt(m[3], 10), h: parseInt(m[4], 10) };
    } else if (zone.rect) {
      copy.rect = Object.assign({}, zone.rect);
    }
    return copy;
  }

  function formatHitboxPoutNameFormat(pout) {
    if (!pout || !pout.name) return '';
    if (pout.bindType && pout.bindType !== 'bool') {
      return pout.name + '/' + (pout.numberFormat || pout.bindType);
    }
    return pout.name;
  }

  function parseHitboxPoutNameFormat(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const slash = t.indexOf('/');
    if (slash > 0) {
      return {
        name: t.slice(0, slash),
        bindType: 'number',
        numberFormat: t.slice(slash + 1)
      };
    }
    return { name: t, bindType: 'bool' };
  }

  function serializeHitboxPoutLine(pout) {
    let s = 'pout :' + pout.event;
    if (pout.field) s += ':' + pout.field;
    s += ' as ' + pout.name;
    if (pout.bindType && pout.bindType !== 'bool') {
      s += '/' + (pout.numberFormat || pout.bindType);
    }
    return s;
  }

  function serializeHitboxZoneLines(zoneName, zone, indent) {
    const inner = indent + '  ';
    const norm = normalizeHitboxZone(zone);
    const lines = [indent + zoneName + ': {'];
    if (norm.shapeLine) {
      lines.push(inner + norm.shapeLine);
    }
    if (norm.touchType != null) {
      lines.push(inner + 'touchType = ' + norm.touchType);
    }
    if (norm.stroke) {
      lines.push(inner + 'stroke("' + norm.stroke + '")');
    }
    (norm.pouts || []).forEach(function (p) {
      lines.push(inner + serializeHitboxPoutLine(p));
    });
    lines.push(indent + '}');
    return lines;
  }

  function serializeHitboxBlockLines(zones, indent) {
    const inner = indent + '  ';
    const lines = [indent + 'hitbox {'];
    Object.keys(zones || {}).forEach(function (zoneName) {
      serializeHitboxZoneLines(zoneName, zones[zoneName], inner).forEach(function (l) {
        lines.push(l);
      });
    });
    lines.push(indent + '}');
    return lines;
  }

  function clcdPropNamesForKind(kind) {
    const common = ['bit', 'bits', 'bitOut', 'size', 'color', 'bgColor', 'touchType', 'width', 'height', 'padding', 'hotkey'];
    if (kind === 'label') return ['bit', 'bitOut', 'text', 'family', 'size', 'weight', 'color', 'bgColor', 'touchType', 'width', 'height', 'padding', 'hotkey'];
    if (kind === 'canvas') return common;
    return ['bit', 'bits', 'bitOut', 'style', 'size', 'color', 'bgColor', 'touchType', 'width', 'height', 'padding', 'hotkey'];
  }

  function inferClcdSymbolFields(sym, kind) {
    if (sym._fields && sym._fields.length) return sym._fields.slice();
    const fields = [];
    const names = clcdPropNamesForKind(kind);
    names.forEach(function (n) {
      if (n === 'bits') {
        if (sym.bitsStart !== undefined || (sym.bitsText != null && sym.bitsText !== '')) fields.push('bits');
        return;
      }
      if (sym[n] !== undefined && sym[n] !== null && sym[n] !== '') fields.push(n);
    });
    return fields;
  }

  function getClcdSymbolAvailableProps(sym, kind) {
    const active = new Set(inferClcdSymbolFields(sym, kind));
    return clcdPropNamesForKind(kind).filter(function (n) { return !active.has(n); });
  }

  function sortClcdSymbolFields(fields, kind) {
    const order = clcdPropNamesForKind(kind);
    return (fields || []).slice().sort(function (a, b) {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia < 0 && ib < 0) return String(a).localeCompare(String(b));
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    });
  }

  function getClcdSymbolStyleOptions(symbolName) {
    if (typeof getClcdSymbolDef !== 'function') return [1, 2, 3];
    const def = getClcdSymbolDef(symbolName);
    if (!def || !def.glyphs) return [1, 2, 3];
    return Object.keys(def.glyphs).map(function (k) { return parseInt(k, 10); })
      .filter(function (n) { return !isNaN(n); })
      .sort(function (a, b) { return a - b; });
  }

  function getClcdDefaultStyle(symbolName) {
    if (typeof getClcdSymbolDef !== 'function') return 1;
    const def = getClcdSymbolDef(symbolName);
    const opts = getClcdSymbolStyleOptions(symbolName);
    if (def && def.defaultStyle != null && opts.indexOf(def.defaultStyle) >= 0) {
      return def.defaultStyle;
    }
    return opts.length ? opts[0] : 1;
  }

  function clcdStyleOptionLabel(styleNum, symbolName) {
    const n = parseInt(styleNum, 10);
    if (isNaN(n)) return String(styleNum);
    const def = (typeof getClcdSymbolDef === 'function') ? getClcdSymbolDef(symbolName) : null;
    if (def && def.kind === 'fa' && n === 3) return '3 — brands';
    if (n === 1) return '1 — solid';
    if (n === 2) return '2 — regular';
    return String(n);
  }

  function defaultValueForClcdProp(propName, sym) {
    const kind = getClcdUiKind(sym.name);
    switch (propName) {
      case 'bit':
      case 'bitOut':
        return 0;
      case 'touchType':
        return 1;
      case 'style':
        return getClcdDefaultStyle(sym.name);
      case 'size':
        return kind === 'label' ? 14 : 22;
      case 'padding':
        return 0;
      case 'width':
      case 'height':
        return kind === 'icon' ? 22 : (kind === 'label' ? 14 : 22);
      case 'family':
        return 'mono';
      case 'weight':
        return 'normal';
      case 'text':
        return 'Text';
      case 'hotkey':
        return 'a';
      case 'color':
      case 'bgColor':
        return '#ffffff';
      default:
        return undefined;
    }
  }

  function applyDefaultClcdPropValue(sym, propName) {
    if (propName === 'bits') {
      if (sym.bitsText == null || sym.bitsText === '') {
        sym.bitsText = '0-0';
        sym.bitsStart = 0;
        sym.bitsEnd = 0;
      }
      return;
    }
    if (sym[propName] !== undefined && sym[propName] !== null && sym[propName] !== '') return;
    const def = defaultValueForClcdProp(propName, sym);
    if (def !== undefined) sym[propName] = def;
  }

  function mergeClcdSymbolFields(parsedSym, existingSym) {
    const kind = getClcdUiKind(parsedSym.name);
    const merged = [];
    const seen = new Set();
    function push(name) {
      if (!name || seen.has(name)) return;
      seen.add(name);
      merged.push(name);
    }
    if (existingSym && existingSym._fields) {
      existingSym._fields.forEach(push);
    }
    inferClcdSymbolFields(parsedSym, kind).forEach(push);
    if (parsedSym._fields) {
      parsedSym._fields.forEach(push);
    }
    parsedSym._fields = sortClcdSymbolFields(merged, kind);
    return parsedSym;
  }

  function applyClcdSymbolNameDefaults(sym) {
    const kind = getClcdUiKind(sym.name);
    if (!sym._fields) sym._fields = inferClcdSymbolFields(sym, kind);
    if (kind === 'icon') {
      if (sym._fields.indexOf('style') < 0) sym._fields.push('style');
      const opts = getClcdSymbolStyleOptions(sym.name);
      const cur = sym.style !== undefined && sym.style !== null && sym.style !== ''
        ? parseInt(sym.style, 10) : NaN;
      if (isNaN(cur) || (opts.length && opts.indexOf(cur) < 0)) {
        sym.style = getClcdDefaultStyle(sym.name);
      }
    }
    sym._fields = sortClcdSymbolFields(sym._fields, kind);
    return sym;
  }

  function parseClcdBitsRangeText(text) {
    const t = String(text || '').trim();
    const m = t.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return null;
    const start = parseInt(m[1], 10);
    const end = parseInt(m[2], 10);
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return { bitsStart: start, bitsEnd: end };
  }

  function getClcdSymbolFieldErrors(sym, kind) {
    const bad = new Set();
    const name = sym.name != null ? String(sym.name).trim() : '';
    if (name && typeof getClcdSymbolDef === 'function' && !getClcdSymbolDef(name)) {
      bad.add('name');
    }
    if (sym.bit !== undefined && sym.bitsStart !== undefined) {
      bad.add('bit');
      bad.add('bits');
    }
    if (sym.bitsText != null && sym.bitsText !== '' && !parseClcdBitsRangeText(sym.bitsText)) {
      bad.add('bits');
    }
    if (kind !== 'icon') {
      if (sym.style !== undefined || (sym._fields || []).indexOf('style') >= 0) bad.add('style');
    } else if (sym.style !== undefined) {
      const cur = parseInt(sym.style, 10);
      const opts = getClcdSymbolStyleOptions(sym.name);
      if (isNaN(cur) || (cur !== 1 && cur !== 2 && cur !== 3)) bad.add('style');
      else if (opts.length && opts.indexOf(cur) < 0) bad.add('style');
    }
    if (sym.text !== undefined && kind !== 'label') bad.add('text');
    if (sym.family !== undefined && ['mono', 'sans', 'serif'].indexOf(sym.family) < 0) bad.add('family');
    if (sym.weight !== undefined && ['normal', 'bold', 'italic', 'boldItalic'].indexOf(sym.weight) < 0) bad.add('weight');
    if (sym.touchType !== undefined && sym.touchType !== 1 && sym.touchType !== 2 && sym.touchType !== 3) bad.add('touchType');
    return bad;
  }

  function formatClcdColorForSerialize(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof ClcdComponent !== 'undefined' && ClcdComponent.formatDocColor) {
      return ClcdComponent.formatDocColor(val);
    }
    let s = String(val);
    if (s.charAt(0) === '#') return '^' + s.slice(1);
    if (s.charAt(0) !== '^') return '^' + s;
    return s;
  }

  function listClcdIconNamesAlphabetically() {
    const known = (typeof CLCD_KNOWN_SYMBOLS !== 'undefined') ? CLCD_KNOWN_SYMBOLS : [];
    return known.slice().sort(function (a, b) { return a.localeCompare(b); }).filter(function (name) {
      if (typeof getClcdSymbolDef !== 'function') return true;
      const def = getClcdSymbolDef(name);
      return def && def.kind === 'fa';
    });
  }

  function nextClcdSymbolName(symbols, explicit) {
    if (explicit != null && String(explicit).trim() !== '' && String(explicit).trim() !== '?') {
      return String(explicit).trim();
    }
    const used = new Set((symbols || []).map(function (s) { return s.name; }));
    const icons = listClcdIconNamesAlphabetically();
    for (let i = 0; i < icons.length; i++) {
      if (!used.has(icons[i])) return icons[i];
    }
    let base = 'newSymbol';
    if (!used.has(base)) return base;
    let n = 2;
    while (used.has(base + n)) n++;
    return base + n;
  }

  function clcdSymbolSerializeName(sym, symbols, symIndex) {
    const n = sym.name != null ? String(sym.name).trim() : '';
    if (n && n !== '?' && n !== '_') return n;
    const others = (symbols || []).filter(function (_, i) { return i !== symIndex; });
    return nextClcdSymbolName(others, '');
  }

  function serializeClcdSymbolInstanceLines(sym, innerIndent, allSymbols, symIndex) {
    const pad = innerIndent + '  ';
    const symName = clcdSymbolSerializeName(sym, allSymbols, symIndex);
    const lines = [innerIndent + symName + ':'];
    lines.push(pad + 'x: ' + (sym.x != null ? sym.x : 0));
    lines.push(pad + 'y: ' + (sym.y != null ? sym.y : 0));
    if (sym.bitsText != null && sym.bitsText !== '') {
      lines.push(pad + 'bits: ' + sym.bitsText);
    } else if (sym.bitsStart !== undefined) {
      lines.push(pad + 'bits: ' + sym.bitsStart + '-' + sym.bitsEnd);
    }
    if (sym.bit !== undefined) lines.push(pad + 'bit: ' + sym.bit);
    if (sym.bitOut !== undefined) lines.push(pad + 'bitOut: ' + sym.bitOut);
    if (sym.text !== undefined) {
      const q = String(sym.text);
      if (typeof ClcdComponent !== 'undefined' && ClcdComponent.formatDocString) {
        lines.push(pad + 'text: ' + ClcdComponent.formatDocString(q));
      } else {
        lines.push(pad + 'text: "' + q.replace(/"/g, '\\"') + '"');
      }
    }
    if (sym.family !== undefined) lines.push(pad + 'family: ' + sym.family);
    if (sym.weight !== undefined) lines.push(pad + 'weight: ' + sym.weight);
    if (sym.style !== undefined) lines.push(pad + 'style: ' + sym.style);
    if (sym.size !== undefined && sym.size !== null && sym.size !== '') lines.push(pad + 'size: ' + sym.size);
    if (sym.touchType !== undefined) lines.push(pad + 'touchType: ' + sym.touchType);
    if (sym.hotkey !== undefined) {
      const hk = String(sym.hotkey);
      if (typeof ClcdComponent !== 'undefined' && ClcdComponent.formatDocString) {
        lines.push(pad + 'hotkey: ' + ClcdComponent.formatDocString(hk));
      } else {
        lines.push(pad + 'hotkey: "' + hk.replace(/"/g, '\\"') + '"');
      }
    }
    if (sym.width !== undefined) lines.push(pad + 'width: ' + sym.width);
    if (sym.height !== undefined) lines.push(pad + 'height: ' + sym.height);
    if (sym.padding !== undefined) lines.push(pad + 'padding: ' + sym.padding);
    const colorDoc = formatClcdColorForSerialize(sym.color);
    if (colorDoc) lines.push(pad + 'color: ' + colorDoc);
    const bgDoc = formatClcdColorForSerialize(sym.bgColor);
    if (bgDoc) lines.push(pad + 'bgColor: ' + bgDoc);
    lines.push(innerIndent + ':');
    return lines;
  }

  function draftClcdSymbolsFromRaw(innerRaw) {
    const syms = [];
    const src = String(innerRaw || '');
    const re = /(^|\n)\s*([A-Za-z_]\w*)\s*:\s*\n([\s\S]*?)\n\s*:\s*(?=\n|$)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const sym = { name: m[2], x: 0, y: 0, _fields: [] };
      const body = m[3];
      body.split('\n').forEach(function (line) {
        const t = line.trim();
        if (!t || t.startsWith('#')) return;
        const kv = t.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/);
        if (!kv) return;
        const key = kv[1];
        let val = kv[2].trim();
        if (key === 'x') sym.x = parseInt(val, 10) || 0;
        else if (key === 'y') sym.y = parseInt(val, 10) || 0;
        else if (key === 'bit') { sym.bit = parseInt(val, 10); sym._fields.push('bit'); }
        else if (key === 'bits') {
          sym.bitsText = val;
          sym._fields.push('bits');
          const parsed = parseClcdBitsRangeText(val);
          if (parsed) {
            sym.bitsStart = parsed.bitsStart;
            sym.bitsEnd = parsed.bitsEnd;
          }
        } else if (key === 'bitOut') { sym.bitOut = parseInt(val, 10); sym._fields.push('bitOut'); }
        else if (key === 'style') { sym.style = parseInt(val, 10); sym._fields.push('style'); }
        else if (key === 'size') { sym.size = parseInt(val, 10); sym._fields.push('size'); }
        else if (key === 'text') {
          sym.text = val.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          sym._fields.push('text');
        } else if (key === 'family') { sym.family = val; sym._fields.push('family'); }
        else if (key === 'weight') { sym.weight = val; sym._fields.push('weight'); }
        else if (key === 'touchType') { sym.touchType = parseInt(val, 10); sym._fields.push('touchType'); }
        else if (key === 'hotkey') {
          sym.hotkey = val.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          sym._fields.push('hotkey');
        } else if (key === 'width') { sym.width = parseInt(val, 10); sym._fields.push('width'); }
        else if (key === 'height') { sym.height = parseInt(val, 10); sym._fields.push('height'); }
        else if (key === 'padding') { sym.padding = parseInt(val, 10); sym._fields.push('padding'); }
        else if (key === 'color' || key === 'bgColor') {
          if (val.charAt(0) === '^') sym[key] = '#' + val.slice(1);
          else sym[key] = val;
          sym._fields.push(key);
        }
      });
      syms.push(sym);
    }
    return syms;
  }

  function tryParseClcdSymbolsFromRawLines(rawLines, registry) {
    if (typeof Parser === 'undefined' || typeof Tokenizer === 'undefined') {
      return draftClcdSymbolsFromRaw(innerTextFromBraceRawLines(rawLines));
    }
    try {
      const inner = innerTextFromBraceRawLines(rawLines);
      const wrap = 'comp [clcd] .__card__:\n  symbols {\n' +
        inner.split('\n').map(function (l) { return '    ' + l; }).join('\n') + '\n  }\n  :';
      const p = new Parser(new Tokenizer(wrap), registry);
      const stmts = p.parse();
      const comp = stmts[0] && stmts[0].comp;
      const symbols = (comp && comp.attributes && comp.attributes.clcdSymbols) || [];
      return symbols.map(function (s) {
        const copy = Object.assign({}, s);
        copy._fields = inferClcdSymbolFields(copy, getClcdUiKind(copy.name));
        if (!copy._id) copy._id = 'sym_' + Math.random().toString(36).slice(2, 10);
        return copy;
      });
    } catch (e) {
      return draftClcdSymbolsFromRaw(innerTextFromBraceRawLines(rawLines)).map(function (s) {
        if (!s._id) s._id = 'sym_' + Math.random().toString(36).slice(2, 10);
        return s;
      });
    }
  }

  function findClcdSymbolIndex(symbols, key) {
    if (key == null || key === '') return -1;
    return (symbols || []).findIndex(function (s) {
      return s._id === key || s.name === key;
    });
  }

  function resolveClcdSymbolIndex(symbols, key, fallbackName) {
    let idx = findClcdSymbolIndex(symbols, key);
    if (idx >= 0) return idx;
    if (fallbackName && fallbackName !== key) {
      return findClcdSymbolIndex(symbols, fallbackName);
    }
    return -1;
  }

  function serializeClcdSymbolsLines(symbols, indent) {
    const lines = [indent + 'symbols {'];
    (symbols || []).forEach(function (sym, si) {
      serializeClcdSymbolInstanceLines(sym, indent + '  ', symbols, si).forEach(function (l) {
        lines.push(l);
      });
    });
    lines.push(indent + '}');
    return lines;
  }

  function getClcdUiKind(symbolName) {
    if (typeof getClcdSymbolDef !== 'function') return 'icon';
    const def = getClcdSymbolDef(symbolName);
    if (!def) return 'icon';
    if (def.kind === 'text') return 'label';
    if (def.kind === 'canvas') return 'canvas';
    return 'icon';
  }

  function enrichBodyItemsFromParsed(model, parsed) {
    if (!parsed) return;
    if (model.type === 'clcd' && parsed && parsed.attributes && parsed.attributes.clcdSymbols) {
      for (let i = 0; i < model.bodyItems.length; i++) {
        if (model.bodyItems[i].kind === 'clcdSymbols') {
          const parsedSyms = (parsed.attributes.clcdSymbols || []).map(function (s) {
            const copy = Object.assign({}, s);
            copy._fields = inferClcdSymbolFields(copy, getClcdUiKind(copy.name));
            return copy;
          });
          const existing = model.bodyItems[i].symbols || [];
          if (parsedSyms.length === 0 && existing.length > 0) {
            refreshNestedRawLines(model.bodyItems[i], detectBodyIndent(model));
            break;
          }
          const existingByKey = {};
          existing.forEach(function (s) {
            if (s.name) existingByKey[s.name] = s;
            if (s._id) existingByKey[s._id] = s;
          });
          parsedSyms.forEach(function (s, si) {
            const ex = existingByKey[s.name] || (existing[si] || null);
            if (ex && ex._id) s._id = ex._id;
            else if (!s._id) s._id = 'sym_' + Math.random().toString(36).slice(2, 10);
            mergeClcdSymbolFields(s, ex);
          });
          const item = {
            kind: 'clcdSymbols',
            symbols: parsedSyms,
            rawLines: model.bodyItems[i].rawLines.slice()
          };
          refreshNestedRawLines(item, detectBodyIndent(model));
          model.bodyItems[i] = item;
          break;
        }
      }
    }
    if (model.type === 'canvas' && parsed.attributes && parsed.attributes.canvasHitboxRaw != null) {
      for (let i = 0; i < model.bodyItems.length; i++) {
        const rawItem = model.bodyItems[i];
        if (rawItem.kind !== 'raw' || !rawItem.rawLines.length) continue;
        if (!/^\s*hitbox\s*\{/.test(rawItem.rawLines[0])) continue;
        let zones = {};
        if (typeof parseCanvasHitboxBlock === 'function') {
          try {
            zones = parseCanvasHitboxBlock(parsed.attributes.canvasHitboxRaw, 'hitbox').zones || {};
          } catch (e) { /* keep empty zones */ }
        }
        const hitboxItem = {
          kind: 'hitboxBlock',
          zones: JSON.parse(JSON.stringify(zones)),
          rawLines: rawItem.rawLines.slice()
        };
        refreshNestedRawLines(hitboxItem, detectBodyIndent(model));
        Object.keys(hitboxItem.zones).forEach(function (zn) {
          hitboxItem.zones[zn] = normalizeHitboxZone(hitboxItem.zones[zn]);
        });
        model.bodyItems[i] = hitboxItem;
        break;
      }
    }
  }

  function modelContentKey(model) {
    return serializeCompBlock(model);
  }

  function serializeCanvasProgramLines(ref, program, indent) {
    const inner = indent + '  ';
    const bodyInner = indent + '    ';
    const lines = [indent + ref + ' {'];
    if (program.initDraw != null) {
      lines.push(inner + 'initDraw {');
      program.initDraw.forEach(function (call) {
        const text = typeof call === 'string' ? call : serializeCanvasCall(call);
        lines.push(bodyInner + text);
      });
      lines.push(inner + '}');
    }
    (program.whenRenderers || []).forEach(function (w) {
      const ev = w.event && w.event !== 'press' ? (w.hitbox + ':' + w.event) : w.hitbox;
      lines.push(inner + 'renderer when(' + ev + ') {');
      (w.calls || []).forEach(function (call) {
        const text = typeof call === 'string' ? call : serializeCanvasCall(call);
        lines.push(bodyInner + text);
      });
      lines.push(inner + '}');
    });
    lines.push(indent + '}');
    return lines;
  }

  function refreshNestedRawLines(item, indent) {
    if (item.kind === 'plcMap') {
      item.rawLines = serializePlcMapLines(item.name, item.entries || [], indent);
    } else if (item.kind === 'plcGlobals') {
      item.rawLines = serializePlcGlobalsLines(item.name, item.entries || [], indent);
    } else if (item.kind === 'logicProgram') {
      item.rawLines = serializeLogicProgramLines(item.ref, item.bindings || [], item.observeDefs || [], indent);
    } else if (item.kind === 'canvasProgram') {
      item.rawLines = serializeCanvasProgramLines(item.ref, item.program || { initDraw: null, whenRenderers: [] }, indent);
    } else if (item.kind === 'clcdSymbols') {
      item.rawLines = serializeClcdSymbolsLines(item.symbols || [], indent);
    } else if (item.kind === 'hitboxBlock') {
      item.rawLines = serializeHitboxBlockLines(item.zones || {}, indent);
    }
  }

  function cloneBodyItem(item) {
    const copy = {
      kind: item.kind,
      name: item.name,
      value: item.value,
      rawLines: item.rawLines.slice()
    };
    if (item.ref) copy.ref = item.ref;
    if (item.entries) copy.entries = item.entries.map(function (e) { return Object.assign({}, e); });
    if (item.bindings) copy.bindings = item.bindings.map(function (b) { return Object.assign({}, b); });
    if (item.observeDefs) {
      copy.observeDefs = item.observeDefs.map(function (o) { return Object.assign({}, o); });
    }
    if (item.program) {
      copy.program = {
        initDraw: item.program.initDraw ? item.program.initDraw.map(function (c) {
          return typeof c === 'string' ? c : Object.assign({}, c);
        }) : null,
        whenRenderers: (item.program.whenRenderers || []).map(function (w) {
          return {
            hitbox: w.hitbox,
            event: w.event,
            line: w.line,
            calls: (w.calls || []).map(function (c) {
              return typeof c === 'string' ? c : Object.assign({}, c);
            })
          };
        })
      };
    }
    if (item.symbols) {
      copy.symbols = item.symbols.map(function (s) { return Object.assign({}, s); });
    }
    if (item.zones) {
      copy.zones = {};
      Object.keys(item.zones).forEach(function (zn) {
        const z = item.zones[zn];
        copy.zones[zn] = normalizeHitboxZone({
          name: z.name || zn,
          shapeLine: z.shapeLine,
          rect: z.rect ? Object.assign({}, z.rect) : null,
          touchType: z.touchType,
          stroke: z.stroke,
          pouts: (z.pouts || []).map(function (p) { return Object.assign({}, p); })
        });
      });
    }
    return copy;
  }

  function detectCompBodyIndent(lines, headerLine) {
    for (let k = headerLine + 1; k < lines.length; k++) {
      const trimmed = lines[k].trim();
      if (!trimmed) continue;
      const m = lines[k].match(/^(\s*)/);
      return m ? m[1] : '';
    }
    return '  ';
  }

  function isCompClosingLine(line, bodyIndent) {
    if (!/^\s*:\s*$/.test(line)) return false;
    const indent = (line.match(/^(\s*)/) || ['', ''])[1];
    return indent === bodyIndent;
  }

  function findCompBlockSpans(src) {
    const lines = src.split('\n');
    const spans = [];
    let i = 0;
    while (i < lines.length) {
      if (!/^\s*comp\s+\[/.test(lines[i])) {
        i++;
        continue;
      }
      const startLine = i;
      if (/::\s*$/.test(lines[i])) {
        spans.push({ startLine, endLine: i, startCh: 0, endCh: lines[i].length });
        i++;
        continue;
      }
      const bodyIndent = detectCompBodyIndent(lines, startLine);
      let braceDepth = 0;
      let j = i + 1;
      let found = false;
      for (; j < lines.length; j++) {
        braceDepth += countBraces(lines[j]);
        if (braceDepth === 0 && isCompClosingLine(lines[j], bodyIndent)) {
          spans.push({ startLine, endLine: j, startCh: 0, endCh: lines[j].length });
          i = j + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        spans.push({
          startLine,
          endLine: lines.length - 1,
          startCh: 0,
          endCh: lines[lines.length - 1].length
        });
        i = lines.length;
      }
    }
    return spans;
  }

  function extractSpanText(src, span) {
    const lines = src.split('\n');
    return lines.slice(span.startLine, span.endLine + 1).join('\n');
  }

  function splitCompBlock(rawText) {
    const lines = rawText.split('\n');
    if (!lines.length) return null;
    const headerMatch = lines[0].match(/^(\s*)comp\s+\[([^\]]+)\]\s+(\S+)\s*(::|:)\s*$/);
    if (!headerMatch) return null;
    const emptyBody = headerMatch[4] === '::';
    if (emptyBody) {
      return {
        indent: headerMatch[1],
        type: headerMatch[2].trim(),
        name: headerMatch[3].trim(),
        emptyBody: true,
        bodyLines: [],
        closingLine: null
      };
    }
    if (lines.length < 2) return null;
    return {
      indent: headerMatch[1],
      type: headerMatch[2].trim(),
      name: headerMatch[3].trim(),
      emptyBody: false,
      bodyLines: lines.slice(1, lines.length - 1),
      closingLine: lines[lines.length - 1]
    };
  }

  function getSegAttrsSet(compType, registry) {
    const set = new Set();
    if (!registry || !compType) return set;
    const handler = registry.get(compType);
    const special = handler && handler.getSpecialParseAttributes
      ? handler.getSpecialParseAttributes()
      : null;
    if (special && Array.isArray(special.segAttributes)) {
      special.segAttributes.forEach(function (s) { set.add(s); });
    }
    return set;
  }

  function parseBodyItems(bodyLines, compType, registry) {
    const items = [];
    const segAttrs = getSegAttrsSet(compType, registry);
    const special = getCompSpecial(compType, registry);
    const plcMapAttrs = special && special.plcMappingBlockAttrs ? special.plcMappingBlockAttrs : [];
    const plcGlobalsAttrs = special && special.plcGlobalsBlockAttrs ? special.plcGlobalsBlockAttrs : [];
    const logicProgramBlocks = !!(special && special.logicProgramBlockAttrs);
    const canvasProgramBlocks = !!(special && special.canvasProgramBlockAttrs);
    let i = 0;

    while (i < bodyLines.length) {
      const line = bodyLines[i];
      const trimmed = line.trim();

      if (trimmed === '') {
        items.push({ kind: 'raw', rawLines: [line] });
        i++;
        continue;
      }

      if (compType === 'clcd') {
        const symbolsHead = line.match(/^\s*symbols\s*\{/);
        if (symbolsHead) {
          const block = consumeBraceBlock(bodyLines, i);
          i = block.endIdx;
          const symbols = tryParseClcdSymbolsFromRawLines(block.rawLines, registry);
          items.push({
            kind: 'clcdSymbols',
            symbols: symbols,
            rawLines: block.rawLines
          });
          continue;
        }
      }

      if (/^\s*=/.test(line)) {
        const rawLines = [line];
        let braceDepth = countBraces(line.replace(/^\s*=\s*/, ''));
        i++;
        while (i < bodyLines.length && braceDepth > 0) {
          rawLines.push(bodyLines[i]);
          braceDepth += countBraces(bodyLines[i]);
          i++;
        }
        items.push({ kind: 'equals', rawLines: rawLines });
        continue;
      }

      const segMatch = line.match(/^\s*([a-zA-Z]\w*)\s*:\s*([01])\s*$/);
      if (segMatch && segAttrs.has(segMatch[1])) {
        items.push({
          kind: 'segment',
          name: segMatch[1],
          value: segMatch[2],
          rawLines: [line]
        });
        i++;
        continue;
      }

      const attrMatch = line.match(/^\s*([a-zA-Z]\w*)\s*:\s*(.*)$/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const val = attrMatch[2].trim();
        const hasOpenBrace = val === '{' || (val.includes('{') && !val.includes('}'));
        if (hasOpenBrace) {
          const block = consumeBraceBlock(bodyLines, i);
          i = block.endIdx;
          const inner = innerTextFromBraceRawLines(block.rawLines);
          if (compType === 'plc' && plcMapAttrs.indexOf(attrName) >= 0) {
            items.push({
              kind: 'plcMap',
              name: attrName,
              entries: parsePlcMapEntries(inner),
              rawLines: block.rawLines
            });
            continue;
          }
          if (compType === 'plc' && plcGlobalsAttrs.indexOf(attrName) >= 0) {
            items.push({
              kind: 'plcGlobals',
              name: attrName,
              entries: parsePlcGlobalsEntries(inner),
              rawLines: block.rawLines
            });
            continue;
          }
          items.push({ kind: 'raw', rawLines: block.rawLines });
          continue;
        }
        if (val !== '') {
          items.push({ kind: 'attr', name: attrName, rawLines: [line] });
          i++;
          continue;
        }
      }

      const flagMatch = line.match(/^\s*([a-zA-Z]\w*)\s*$/);
      if (flagMatch) {
        items.push({ kind: 'flag', name: flagMatch[1], rawLines: [line] });
        i++;
        continue;
      }

      const dotBlockMatch = line.match(/^\s*(\.\S+)\s*\{/);
      if (dotBlockMatch && (logicProgramBlocks || canvasProgramBlocks)) {
        const block = consumeBraceBlock(bodyLines, i);
        i = block.endIdx;
        const ref = dotBlockMatch[1];
        const inner = innerTextFromBraceRawLines(block.rawLines);
        if (compType === 'logic' && logicProgramBlocks) {
          let bindings = [];
          let observeDefs = [];
          if (typeof parseLogicProgramBlock === 'function') {
            try {
              const parsed = parseLogicProgramBlock(inner, 'logic program');
              bindings = parsed.bindings || [];
              observeDefs = parsed.observeDefs || [];
            } catch (e) { /* keep drafts from raw lines */ }
            attachLogicObserveRawLines(inner, observeDefs);
            bindings = enrichLogicBindingsFromRaw(bindings, inner);
          }
          items.push({
            kind: 'logicProgram',
            ref: ref,
            bindings: bindings,
            observeDefs: observeDefs,
            rawLines: block.rawLines
          });
          continue;
        }
        if (compType === 'canvas' && canvasProgramBlocks) {
          let program = { initDraw: null, whenRenderers: [] };
          if (typeof parseCanvasProgramBlock === 'function') {
            try {
              program = parseCanvasProgramBlock(inner, 'canvas program');
            } catch (e) { /* keep empty */ }
          }
          program = enrichCanvasProgramCallsFromRaw(program, inner);
          items.push({
            kind: 'canvasProgram',
            ref: ref,
            program: program,
            rawLines: block.rawLines
          });
          continue;
        }
        items.push({ kind: 'raw', rawLines: block.rawLines });
        continue;
      }

      if (trimmed.includes('{') || /^\s*\./.test(line) || /^\s*\w+\s+\{/.test(line)) {
        const block = consumeBraceBlock(bodyLines, i);
        i = block.endIdx;
        const hitboxHead = line.match(/^\s*(hitbox)\s*\{/);
        if (hitboxHead && compType === 'canvas') {
          let zones = {};
          const inner = innerTextFromBraceRawLines(block.rawLines);
          if (typeof parseCanvasHitboxBlock === 'function') {
            try {
              zones = parseCanvasHitboxBlock(inner, 'hitbox').zones || {};
            } catch (e) { /* keep empty */ }
          }
          items.push({
            kind: 'hitboxBlock',
            zones: JSON.parse(JSON.stringify(zones)),
            rawLines: block.rawLines
          });
          Object.keys(items[items.length - 1].zones).forEach(function (zn) {
            items[items.length - 1].zones[zn] = normalizeHitboxZone(items[items.length - 1].zones[zn]);
          });
          continue;
        }
        items.push({ kind: 'raw', rawLines: block.rawLines });
        continue;
      }

      items.push({ kind: 'raw', rawLines: [line] });
      i++;
    }
    return items;
  }

  function detectBodyIndent(model) {
    for (const item of model.bodyItems) {
      if (item.rawLines && item.rawLines.length) {
        const m = item.rawLines[0].match(/^(\s+)/);
        if (m) return m[1];
      }
    }
    if (model.closingLine) {
      const m = model.closingLine.match(/^(\s*):/);
      if (m) return m[1] || '  ';
    }
    return '  ';
  }

  function serializeCompBlock(model) {
    const lines = [];
    const headerSuffix = model.emptyBody ? '::' : ':';
    lines.push((model.indent || '') + 'comp [' + model.type + '] ' + model.name + headerSuffix);
    for (const item of model.bodyItems) {
      for (let r = 0; r < item.rawLines.length; r++) {
        lines.push(item.rawLines[r]);
      }
    }
    if (!model.emptyBody) {
      lines.push(model.closingLine || (detectBodyIndent(model) + ':'));
    }
    return lines.join('\n');
  }

  function cloneModel(model) {
    return {
      id: model.id,
      type: model.type,
      name: model.name,
      span: model.span ? { startLine: model.span.startLine, endLine: model.span.endLine, startCh: model.span.startCh, endCh: model.span.endCh } : null,
      rawText: model.rawText,
      bodyItems: model.bodyItems.map(cloneBodyItem),
      emptyBody: model.emptyBody,
      closingLine: model.closingLine,
      indent: model.indent,
      viewMode: model.viewMode || 'card',
      parsed: model.parsed,
      initialValue: model.initialValue
    };
  }

  function spanKey(span) {
    return span.startLine + ':' + span.endLine + ':' + span.endCh;
  }

  function resolveCompBlockById(src, blockId, registry) {
    const startLine = parseInt(String(blockId).split(':')[0], 10);
    const blocks = parseCompBlocks(src, registry);
    if (!isNaN(startLine)) {
      const byLine = blocks.find(function (b) { return b.span.startLine === startLine; });
      if (byLine) return byLine;
    }
    return blocks.find(function (b) { return b.id === blockId; }) || null;
  }

  function parseCompBlocks(src, registry) {
    const preprocessed = typeof preprocessLoop === 'function' ? preprocessLoop(src) : src;
    const spans = findCompBlockSpans(preprocessed);
    let comps = [];
    try {
      const p = new Parser(new Tokenizer(preprocessed), registry);
      const stmts = p.parse();
      comps = stmts.filter(function (s) { return s && s.comp; }).map(function (s) { return s.comp; });
    } catch (e) {
      comps = [];
    }

    return spans.map(function (span, idx) {
      const rawText = extractSpanText(preprocessed, span);
      const split = splitCompBlock(rawText);
      const parsed = comps[idx] || null;
      const type = split ? split.type : (parsed ? parsed.type : '');
      const name = split ? split.name : (parsed ? parsed.name : '');
      const bodyItems = split ? parseBodyItems(split.bodyLines, type, registry) : [];
      const blockModel = {
        id: span.startLine + ':0',
        type: type,
        name: name,
        span: span,
        rawText: rawText,
        bodyItems: bodyItems,
        emptyBody: split ? split.emptyBody : false,
        closingLine: split ? split.closingLine : '  :',
        indent: split ? split.indent : '',
        viewMode: 'card',
        parsed: parsed,
        initialValue: parsed ? parsed.initialValue : null
      };
      enrichBodyItemsFromParsed(blockModel, parsed);
      return blockModel;
    });
  }

  function getAttrDef(compType, attrName, registry) {
    if (attrName === 'on') return { name: 'on', value: 'mode' };
    if (!registry) return null;
    const handler = registry.get(compType);
    if (!handler || !handler.getDef) return null;
    const def = handler.getDef();
    if (!def || !def.attrs) return null;
    return def.attrs.find(function (a) { return a.name === attrName; }) || null;
  }

  function getKnownAttrNames(compType, registry) {
    const names = new Set(['on', 'nl']);
    if (!registry || !compType) return names;
    const handler = registry.get(compType);
    if (handler && handler.getDef) {
      const def = handler.getDef();
      if (def && def.attrs) {
        def.attrs.forEach(function (a) { names.add(a.name); });
      }
      const special = handler.getSpecialParseAttributes ? handler.getSpecialParseAttributes() : null;
      if (special && special.segAttributes) {
        special.segAttributes.forEach(function (s) { names.add(s); });
      }
    }
    return names;
  }

  function getInvalidAttrs(model, registry) {
    const known = getKnownAttrNames(model.type, registry);
    const invalid = [];
    for (const item of model.bodyItems) {
      if (item.kind === 'attr' || item.kind === 'flag') {
        if (!known.has(item.name)) invalid.push(item.name);
      } else if (item.kind === 'segment') {
        if (!known.has(item.name)) invalid.push(item.name);
      }
    }
    return invalid;
  }

  function parseAttrValueFromLine(rawLine) {
    const m = rawLine.match(/^\s*\w+\s*:\s*(.*)$/);
    return m ? m[1] : '';
  }

  function getExplicitAttrs(model) {
    const attrs = [];
    for (const item of model.bodyItems) {
      if (item.kind === 'attr') {
        attrs.push({ name: item.name, value: parseAttrValueFromLine(item.rawLines[0]), kind: 'attr' });
      } else if (item.kind === 'flag') {
        attrs.push({ name: item.name, value: null, kind: 'flag' });
      } else if (item.kind === 'segment') {
        attrs.push({ name: item.name, value: item.value, kind: 'segment' });
      }
    }
    return attrs;
  }

  function getMissingAttrNames(model, registry) {
    const present = new Set(getExplicitAttrs(model).map(function (a) { return a.name; }));
    model.bodyItems.forEach(function (item) {
      if (item.kind === 'plcMap' || item.kind === 'plcGlobals') present.add(item.name);
    });
    const missing = [];
    if (!registry) return missing;
    const handler = registry.get(model.type);
    if (handler && handler.getDef) {
      const def = handler.getDef();
      if (def && def.attrs) {
        def.attrs.forEach(function (a) {
          if (!present.has(a.name)) missing.push(a.name);
        });
      }
    }
    if (!present.has('on')) missing.push('on');
    return missing.filter(function (n, i, arr) { return arr.indexOf(n) === i && !present.has(n); });
  }

  function getEqualsItem(model) {
    return model.bodyItems.find(function (i) { return i.kind === 'equals'; }) || null;
  }

  function getEqualsRhsText(item) {
    if (!item || !item.rawLines.length) return '';
    const first = item.rawLines[0].replace(/^\s*=\s*/, '');
    if (item.rawLines.length === 1) return first;
    return [first].concat(item.rawLines.slice(1)).join('\n');
  }

  function defaultLineForAttr(attrName, compType, registry, indent) {
    const def = getAttrDef(compType, attrName, registry);
    if (attrName === 'on') return indent + 'on: 1';
    if (def && def.value === null) return indent + attrName;
    if (def && def.value === 'color') return indent + attrName + ': ^ffffff';
    if (def && def.value === 'integer') return indent + attrName + ': 0';
    if (def && def.value === 'string') return indent + attrName + ": ''";
    const enumOpts = getAttrEnumOptions(attrName, def);
    if (enumOpts) return indent + attrName + ': ' + enumOpts[0];
    return indent + attrName + ": ''";
  }

  function addAttr(model, attrName, registry) {
    const newModel = cloneModel(model);
    const indent = detectBodyIndent(newModel);
    const def = getAttrDef(newModel.type, attrName, registry);
    const line = defaultLineForAttr(attrName, newModel.type, registry, indent);
    const kind = def && def.value === null ? 'flag' : 'attr';
    newModel.bodyItems.push({ kind: kind, name: attrName, rawLines: [line] });
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeAttr(model, attrName) {
    const newModel = cloneModel(model);
    newModel.bodyItems = newModel.bodyItems.filter(function (item) {
      if (item.kind === 'attr' || item.kind === 'flag' || item.kind === 'segment') {
        return item.name !== attrName;
      }
      return true;
    });
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setAttrValue(model, attrName, newValue) {
    const newModel = cloneModel(model);
    let found = false;
    for (const item of newModel.bodyItems) {
      if ((item.kind === 'attr' || item.kind === 'segment') && item.name === attrName) {
        const indent = (item.rawLines[0].match(/^(\s*)/) || ['', '  '])[1];
        if (item.kind === 'segment') {
          item.value = newValue;
        }
        item.rawLines = [indent + attrName + ': ' + newValue];
        found = true;
      }
    }
    if (!found) {
      const indent = detectBodyIndent(newModel);
      newModel.bodyItems.push({ kind: 'attr', name: attrName, rawLines: [indent + attrName + ': ' + newValue] });
    }
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCompType(model, newType) {
    const newModel = cloneModel(model);
    newModel.type = newType;
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCompName(model, newName) {
    const newModel = cloneModel(model);
    newModel.name = newName;
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setEqualsRhs(model, rhsText) {
    const newModel = cloneModel(model);
    const indent = detectBodyIndent(newModel);
    const lines = String(rhsText).split('\n');
    const rawLines = [indent + '= ' + lines[0]];
    for (let i = 1; i < lines.length; i++) {
      rawLines.push(lines[i]);
    }
    const eqIdx = newModel.bodyItems.findIndex(function (i) { return i.kind === 'equals'; });
    if (eqIdx >= 0) {
      newModel.bodyItems[eqIdx] = { kind: 'equals', rawLines: rawLines };
    } else {
      newModel.bodyItems.push({ kind: 'equals', rawLines: rawLines });
    }
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function toggleSegment(model, segName) {
    for (const item of model.bodyItems) {
      if (item.kind === 'segment' && item.name === segName) {
        const next = item.value === '0' ? '1' : '0';
        return setAttrValue(model, segName, next);
      }
    }
    return model;
  }

  function getAttrEnumOptions(attrName, attrDef) {
    if (attrName === 'on') return ON_ENUM.slice();
    if (!attrDef || attrDef.value == null) return null;
    const v = String(attrDef.value).trim();
    if (v === 'mode') return ON_ENUM.slice();
    if (/^raise\|edge\|1$/i.test(v) || /^1\|raise\|edge$/i.test(v) || /^raise\/edge\/1$/i.test(v)) {
      return ON_ENUM.slice();
    }
    if (v.includes('/') && v.indexOf('raise') === -1 && v.indexOf('edge') === -1) {
      const parts = v.split('/').map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length >= 2) return parts;
    }
    if (v.indexOf('|') !== -1) {
      const parts = v.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length >= 2) return parts;
    }
    return null;
  }

  function getWidgetFieldType(attrName, attrDef) {
    if (getAttrEnumOptions(attrName, attrDef)) return 'enum';
    if (!attrDef) return 'text';
    if (attrDef.value === null) return 'flag';
    if (attrDef.value === 'integer') return 'integer';
    if (attrDef.value === 'string') return 'string';
    if (attrDef.value === 'color') return 'color';
    return 'text';
  }

  function buildTypeCatalog(registry) {
    const categories = {
      'Interactive inputs': ['switch', 'key', 'keyboard', 'dip', 'ioport', 'rotary', 'slider', 'sensor', 'scanner'],
      'Displays': ['led', 'bar', '7seg', '14seg', 'lcd', 'clcd', 'canvas', 'alu', 'terminal', 'dots', 'motor', 'servo'],
      'Arithmetic & logic': ['adder', 'subtract', 'multiplier', 'divider', 'shifter', 'counter', 'logic', 'lut'],
      'Storage & timing': ['mem', 'cpu', 'plc', 'dma', 'reg', 'queue', 'network', 'stack', 'osc', 'mmap', 'cache']
    };
    const allTypes = registry && registry.getAllTypes ? registry.getAllTypes() : [];
    const typeSet = new Set(allTypes);
    const result = {};
    for (const [cat, types] of Object.entries(categories)) {
      const present = types.filter(function (t) { return typeSet.has(t); });
      if (present.length) result[cat] = present;
    }
    const categorized = new Set(Object.values(result).flat());
    const other = allTypes.filter(function (t) { return !categorized.has(t); }).sort();
    if (other.length) result.Other = other;
    return result;
  }

  function findBodyItem(model, kind, name) {
    return model.bodyItems.find(function (item) {
      if (item.kind !== kind) return false;
      if (name == null) return true;
      return item.name === name || item.ref === name;
    }) || null;
  }

  function getPlcMapEntries(model, mapName) {
    const item = findBodyItem(model, 'plcMap', mapName);
    return item ? (item.entries || []).slice() : [];
  }

  function getPlcGlobalsEntries(model) {
    const item = findBodyItem(model, 'plcGlobals', 'globals');
    return item ? (item.entries || []).slice() : [];
  }

  function getLogicProgram(model) {
    const item = findBodyItem(model, 'logicProgram');
    if (!item) return null;
    return {
      ref: item.ref,
      bindings: (item.bindings || []).slice(),
      observeDefs: (item.observeDefs || []).slice()
    };
  }

  function getCanvasProgram(model) {
    const item = findBodyItem(model, 'canvasProgram');
    if (!item) return null;
    return {
      ref: item.ref,
      program: item.program ? cloneBodyItem({ kind: 'canvasProgram', rawLines: [], program: item.program }).program : { initDraw: null, whenRenderers: [] }
    };
  }

  function getProgramRefs(model) {
    const attr = getExplicitAttrs(model).find(function (a) { return a.name === 'program'; });
    if (!attr || !attr.value) return [];
    return attr.value.trim().split(/\s+/).filter(Boolean);
  }

  function setPlcMapEntry(model, mapName, symbol, target) {
    const newModel = cloneModel(model);
    const indent = detectBodyIndent(newModel);
    let item = findBodyItem(newModel, 'plcMap', mapName);
    if (!item) {
      item = { kind: 'plcMap', name: mapName, entries: [], rawLines: [] };
      newModel.bodyItems.push(item);
    }
    const idx = item.entries.findIndex(function (e) { return e.symbol === symbol; });
    if (idx >= 0) item.entries[idx].target = target;
    else item.entries.push({ symbol: symbol, target: target });
    refreshNestedRawLines(item, indent);
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addPlcMapEntry(model, mapName, symbol, target) {
    return setPlcMapEntry(model, mapName, symbol, target);
  }

  function removePlcMapEntry(model, mapName, symbol) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'plcMap', mapName);
    if (!item) return newModel;
    item.entries = item.entries.filter(function (e) { return e.symbol !== symbol; });
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setPlcGlobalEntry(model, symbol, width) {
    const newModel = cloneModel(model);
    const indent = detectBodyIndent(newModel);
    let item = findBodyItem(newModel, 'plcGlobals', 'globals');
    if (!item) {
      item = { kind: 'plcGlobals', name: 'globals', entries: [], rawLines: [] };
      newModel.bodyItems.push(item);
    }
    const idx = item.entries.findIndex(function (e) { return e.symbol === symbol; });
    const w = width == null ? 1 : width;
    if (idx >= 0) item.entries[idx].width = w;
    else item.entries.push({ symbol: symbol, width: w });
    refreshNestedRawLines(item, indent);
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removePlcGlobalEntry(model, symbol) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'plcGlobals', 'globals');
    if (!item) return newModel;
    item.entries = item.entries.filter(function (e) { return e.symbol !== symbol; });
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setProgramRefs(model, refs) {
    const value = (refs || []).join(' ');
    return setAttrValue(model, 'program', value);
  }

  function addLogicBinding(model, logicVar, bindType, pinName) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'logicProgram');
    if (!item) return newModel;
    item.bindings = item.bindings || [];
    item.bindings.push({
      logicVar: logicVar,
      bindType: bindType,
      typeText: bindType,
      pinName: pinName,
      listFlag: false,
      numberFormat: null
    });
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeLogicBinding(model, logicVar) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'logicProgram');
    if (!item) return newModel;
    item.bindings = (item.bindings || []).filter(function (b) { return b.logicVar !== logicVar; });
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function upsertLogicBinding(model, oldVar, logicVar, typeText, pinName) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'logicProgram');
    if (!item) return newModel;
    item.bindings = item.bindings || [];
    const binding = bindingFromFields(logicVar, typeText, pinName);
    const key = oldVar != null && oldVar !== '' ? oldVar : binding.logicVar;
    const idx = item.bindings.findIndex(function (b) { return b.logicVar === key; });
    if (idx >= 0) item.bindings[idx] = binding;
    else item.bindings.push(binding);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCanvasInitDrawCall(model, index, callText) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item) return newModel;
    if (!item.program) item.program = { initDraw: [], whenRenderers: [] };
    if (!item.program.initDraw) item.program.initDraw = [];
    item.program.initDraw[index] = callText;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addCanvasInitDrawCall(model, callText) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item) return newModel;
    if (!item.program) item.program = { initDraw: [], whenRenderers: [] };
    if (!item.program.initDraw) item.program.initDraw = [];
    item.program.initDraw.push(callText);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCanvasWhenCall(model, whenIndex, callIndex, callText) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item || !item.program || !item.program.whenRenderers[whenIndex]) return newModel;
    item.program.whenRenderers[whenIndex].calls[callIndex] = callText;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addCanvasWhenBlock(model, hitbox, event, calls) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item) return newModel;
    if (!item.program) item.program = { initDraw: null, whenRenderers: [] };
    item.program.whenRenderers.push({
      hitbox: hitbox,
      event: event || 'press',
      calls: calls || []
    });
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setLogicProgramRef(model, newRef) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'logicProgram');
    if (!item || !newRef) return newModel;
    item.ref = newRef;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCanvasProgramRef(model, newRef) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item || !newRef) return newModel;
    item.ref = newRef;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addCanvasInitDrawSection(model) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item) return newModel;
    if (!item.program) item.program = { initDraw: [], whenRenderers: [] };
    if (item.program.initDraw == null) item.program.initDraw = [];
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeCanvasInitDrawSection(model) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item || !item.program) return newModel;
    item.program.initDraw = null;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeCanvasInitDrawCall(model, index) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item || !item.program || !item.program.initDraw) return newModel;
    item.program.initDraw.splice(index, 1);
    if (!item.program.initDraw.length) item.program.initDraw = null;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addCanvasWhenCall(model, whenIndex, callText) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    const w = item && item.program && item.program.whenRenderers[whenIndex];
    if (!w) return newModel;
    if (!w.calls) w.calls = [];
    w.calls.push(callText == null ? '' : callText);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeCanvasWhenCall(model, whenIndex, callIndex) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    const w = item && item.program && item.program.whenRenderers[whenIndex];
    if (!w || !w.calls) return newModel;
    w.calls.splice(callIndex, 1);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeCanvasWhenBlock(model, whenIndex) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    if (!item || !item.program) return newModel;
    item.program.whenRenderers.splice(whenIndex, 1);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function setCanvasWhenMeta(model, whenIndex, hitbox, event) {
    const newModel = cloneModel(model);
    const item = findBodyItem(newModel, 'canvasProgram');
    const w = item && item.program && item.program.whenRenderers[whenIndex];
    if (!w) return newModel;
    if (hitbox != null) w.hitbox = hitbox;
    if (event != null) w.event = event || 'press';
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function findBodyItemByKind(model, kind) {
    return model.bodyItems.find(function (i) { return i.kind === kind; }) || null;
  }

  function getClcdSymbols(model) {
    const item = findBodyItemByKind(model, 'clcdSymbols');
    return item ? (item.symbols || []).slice() : [];
  }

  function ensureClcdSymbolsItem(newModel) {
    let item = findBodyItemByKind(newModel, 'clcdSymbols');
    if (!item) {
      item = { kind: 'clcdSymbols', symbols: [], rawLines: [] };
      newModel.bodyItems.push(item);
    }
    if (!item.symbols) item.symbols = [];
    return item;
  }

  function defaultClcdSymbol(name, symbols) {
    return {
      name: nextClcdSymbolName(symbols, name),
      x: 0,
      y: 0,
      _fields: [],
      _id: 'sym_' + Math.random().toString(36).slice(2, 10)
    };
  }

  function upsertClcdSymbol(model, oldKey, symbol, fallbackName) {
    const newModel = cloneModel(model);
    const item = ensureClcdSymbolsItem(newModel);
    const copy = Object.assign({}, symbol);
    if (!copy._id) copy._id = 'sym_' + Math.random().toString(36).slice(2, 10);
    applyClcdSymbolNameDefaults(copy);
    if (!copy._fields) copy._fields = inferClcdSymbolFields(copy, getClcdUiKind(copy.name));
    const lookup = oldKey != null && oldKey !== '' ? oldKey : (copy._id || copy.name);
    let idx = resolveClcdSymbolIndex(item.symbols, lookup, fallbackName);
    if (idx >= 0 && item.symbols[idx]._id) copy._id = item.symbols[idx]._id;
    if (idx >= 0) item.symbols[idx] = copy;
    else item.symbols.push(copy);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeClcdSymbol(model, key, fallbackName) {
    const newModel = cloneModel(model);
    const item = findBodyItemByKind(newModel, 'clcdSymbols');
    if (!item) return newModel;
    const idx = resolveClcdSymbolIndex(item.symbols, key, fallbackName);
    if (idx >= 0) item.symbols.splice(idx, 1);
    else {
      item.symbols = (item.symbols || []).filter(function (s) {
        return s.name !== key && s.name !== fallbackName && s._id !== key;
      });
    }
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addClcdSymbol(model, name) {
    const newModel = cloneModel(model);
    const item = ensureClcdSymbolsItem(newModel);
    return upsertClcdSymbol(newModel, null, defaultClcdSymbol(name, item.symbols));
  }

  function addClcdSymbolsBlock(model) {
    const newModel = cloneModel(model);
    const item = ensureClcdSymbolsItem(newModel);
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeClcdSymbolsBlock(model) {
    const newModel = cloneModel(model);
    if (!findBodyItemByKind(newModel, 'clcdSymbols')) return newModel;
    newModel.bodyItems = newModel.bodyItems.filter(function (i) { return i.kind !== 'clcdSymbols'; });
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addClcdSymbolProp(model, symbolKey, propName, fallbackName) {
    const newModel = cloneModel(model);
    const item = findBodyItemByKind(newModel, 'clcdSymbols');
    if (!item) return newModel;
    const idx = resolveClcdSymbolIndex(item.symbols, symbolKey, fallbackName);
    if (idx < 0) return newModel;
    const sym = Object.assign({}, item.symbols[idx]);
    if (!sym._fields) sym._fields = inferClcdSymbolFields(sym, getClcdUiKind(sym.name));
    if (sym._fields.indexOf(propName) < 0) sym._fields.push(propName);
    applyDefaultClcdPropValue(sym, propName);
    sym._fields = sortClcdSymbolFields(sym._fields, getClcdUiKind(sym.name));
    item.symbols[idx] = sym;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeClcdSymbolProp(model, symbolKey, propName, fallbackName) {
    const newModel = cloneModel(model);
    const item = findBodyItemByKind(newModel, 'clcdSymbols');
    if (!item) return newModel;
    const idx = resolveClcdSymbolIndex(item.symbols, symbolKey, fallbackName);
    if (idx < 0) return newModel;
    const sym = Object.assign({}, item.symbols[idx]);
    sym._fields = (sym._fields || []).filter(function (f) { return f !== propName; });
    delete sym[propName];
    if (propName === 'bits') {
      delete sym.bitsStart;
      delete sym.bitsEnd;
      delete sym.bitsText;
    }
    item.symbols[idx] = sym;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function getHitboxBlock(model) {
    const item = getHitboxBlockItem(model);
    if (!item) return null;
    return { zones: item.zones || {} };
  }

  function ensureHitboxBlockItem(newModel) {
    let item = getHitboxBlockItem(newModel);
    if (!item) {
      item = { kind: 'hitboxBlock', zones: {}, rawLines: [] };
      newModel.bodyItems.push(item);
    }
    if (!item.zones) item.zones = {};
    return item;
  }

  function defaultHitboxZone(zoneName) {
    return normalizeHitboxZone({
      name: zoneName,
      shapeLine: 'rect(0, 0, 30, 30)',
      touchType: 1,
      stroke: null,
      pouts: []
    });
  }

  function setHitboxZone(model, oldName, zone) {
    const newModel = cloneModel(model);
    const item = ensureHitboxBlockItem(newModel);
    const key = oldName != null && oldName !== '' ? oldName : zone.name;
    const copy = normalizeHitboxZone(zone);
    if (key !== copy.name) delete item.zones[key];
    item.zones[copy.name] = copy;
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function removeHitboxZone(model, zoneName) {
    const newModel = cloneModel(model);
    const item = getHitboxBlockItem(newModel);
    if (!item || !item.zones) return newModel;
    delete item.zones[zoneName];
    refreshNestedRawLines(item, detectBodyIndent(newModel));
    newModel.rawText = serializeCompBlock(newModel);
    return newModel;
  }

  function addHitboxZone(model, zoneName) {
    return setHitboxZone(model, null, defaultHitboxZone(zoneName));
  }

  return {
    ON_ENUM: ON_ENUM,
    findCompBlockSpans: findCompBlockSpans,
    parseCompBlocks: parseCompBlocks,
    serializeCompBlock: serializeCompBlock,
    cloneModel: cloneModel,
    spanKey: spanKey,
    getAttrDef: getAttrDef,
    getKnownAttrNames: getKnownAttrNames,
    getInvalidAttrs: getInvalidAttrs,
    getExplicitAttrs: getExplicitAttrs,
    getMissingAttrNames: getMissingAttrNames,
    getEqualsItem: getEqualsItem,
    getEqualsRhsText: getEqualsRhsText,
    addAttr: addAttr,
    removeAttr: removeAttr,
    setAttrValue: setAttrValue,
    setCompType: setCompType,
    setCompName: setCompName,
    setEqualsRhs: setEqualsRhs,
    toggleSegment: toggleSegment,
    getWidgetFieldType: getWidgetFieldType,
    getAttrEnumOptions: getAttrEnumOptions,
    getSegAttrsSet: getSegAttrsSet,
    buildTypeCatalog: buildTypeCatalog,
    getPlcMapEntries: getPlcMapEntries,
    getPlcGlobalsEntries: getPlcGlobalsEntries,
    getLogicProgram: getLogicProgram,
    getCanvasProgram: getCanvasProgram,
    getProgramRefs: getProgramRefs,
    setPlcMapEntry: setPlcMapEntry,
    addPlcMapEntry: addPlcMapEntry,
    removePlcMapEntry: removePlcMapEntry,
    setPlcGlobalEntry: setPlcGlobalEntry,
    removePlcGlobalEntry: removePlcGlobalEntry,
    setProgramRefs: setProgramRefs,
    addLogicBinding: addLogicBinding,
    removeLogicBinding: removeLogicBinding,
    upsertLogicBinding: upsertLogicBinding,
    setCanvasInitDrawCall: setCanvasInitDrawCall,
    addCanvasInitDrawCall: addCanvasInitDrawCall,
    setCanvasWhenCall: setCanvasWhenCall,
    addCanvasWhenBlock: addCanvasWhenBlock,
    callTextFromCanvasCall: callTextFromCanvasCall,
    findInlineCanvasRefs: findInlineCanvasRefs,
    findInlineLogicRefs: findInlineLogicRefs,
    findInlinePlcRefs: findInlinePlcRefs,
    formatLogicBindingType: formatLogicBindingType,
    parseLogicBindingType: parseLogicBindingType,
    getLogicBindingFieldErrors: getLogicBindingFieldErrors,
    getHitboxZoneNames: getHitboxZoneNames,
    hitboxZoneShapeLine: hitboxZoneShapeLine,
    formatHitboxPoutNameFormat: formatHitboxPoutNameFormat,
    parseHitboxPoutNameFormat: parseHitboxPoutNameFormat,
    getHitboxBlock: getHitboxBlock,
    getClcdSymbols: getClcdSymbols,
    getClcdUiKind: getClcdUiKind,
    inferClcdSymbolFields: inferClcdSymbolFields,
    sortClcdSymbolFields: sortClcdSymbolFields,
    clcdPropNamesForKind: clcdPropNamesForKind,
    resolveCompBlockById: resolveCompBlockById,
    getClcdSymbolAvailableProps: getClcdSymbolAvailableProps,
    getClcdSymbolStyleOptions: getClcdSymbolStyleOptions,
    getClcdDefaultStyle: getClcdDefaultStyle,
    clcdStyleOptionLabel: clcdStyleOptionLabel,
    applyClcdSymbolNameDefaults: applyClcdSymbolNameDefaults,
    getClcdSymbolFieldErrors: getClcdSymbolFieldErrors,
    parseClcdBitsRangeText: parseClcdBitsRangeText,
    upsertClcdSymbol: upsertClcdSymbol,
    removeClcdSymbol: removeClcdSymbol,
    addClcdSymbol: addClcdSymbol,
    addClcdSymbolsBlock: addClcdSymbolsBlock,
    removeClcdSymbolsBlock: removeClcdSymbolsBlock,
    nextClcdSymbolName: nextClcdSymbolName,
    listClcdIconNamesAlphabetically: listClcdIconNamesAlphabetically,
    resolveClcdSymbolIndex: resolveClcdSymbolIndex,
    addClcdSymbolProp: addClcdSymbolProp,
    removeClcdSymbolProp: removeClcdSymbolProp,
    defaultClcdSymbol: defaultClcdSymbol,
    setHitboxZone: setHitboxZone,
    removeHitboxZone: removeHitboxZone,
    addHitboxZone: addHitboxZone,
    modelContentKey: modelContentKey,
    setLogicProgramRef: setLogicProgramRef,
    setCanvasProgramRef: setCanvasProgramRef,
    addCanvasInitDrawSection: addCanvasInitDrawSection,
    removeCanvasInitDrawSection: removeCanvasInitDrawSection,
    removeCanvasInitDrawCall: removeCanvasInitDrawCall,
    addCanvasWhenCall: addCanvasWhenCall,
    removeCanvasWhenCall: removeCanvasWhenCall,
    removeCanvasWhenBlock: removeCanvasWhenBlock,
    setCanvasWhenMeta: setCanvasWhenMeta
  };
});
