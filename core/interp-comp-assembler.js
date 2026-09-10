/* ================= INTERP COMP ASSEMBLER (comp [interp] pin/pout) ================= */

const INTERP_COMP_TYPE_RE = /^(u\d+|s\d+|ascii|bool|u1|f32|f64|fp16|bf16|q\d+p\d+)$/;

function interpCompError(msg, line) {
  if (line != null) throw new Error(`interp comp line ${line}: ${msg}`);
  throw new Error(`interp comp: ${msg}`);
}

function validateInterpCompType(typeName, line) {
  if (!typeName || !INTERP_COMP_TYPE_RE.test(typeName)) {
    interpCompError(`unknown type '/${typeName || ''}'`, line);
  }
}

function parseInterpCompPinPoutDecl(kind, tokens, ctxLabel) {
  const label = ctxLabel || 'interp comp';
  let pos = 0;
  function peek() { return tokens[pos]; }
  function eat(type, value) {
    const t = tokens[pos];
    if (!t || t.type !== type || (value != null && t.value !== value)) {
      const got = t ? `${t.type} '${t.value}'` : 'EOF';
      interpCompError(`expected ${type}${value != null ? ` '${value}'` : ''}, got ${got}`, t && t.line);
    }
    pos++;
    return t;
  }
  function match(type, value) {
    const t = peek();
    return t && t.type === type && (value == null || t.value === value);
  }

  if (!match('ID')) interpCompError(`expected channel name after '${kind}'`, peek() && peek().line);
  const channelTok = eat('ID');
  let vector = false;
  let vectorFixedCount = 0;
  let asciiCharsPerElem = 0;
  let asciiNullDelim = false;

  if (match('SYM', '[')) {
    eat('SYM', '[');
    if (match('NUM')) {
      vectorFixedCount = eat('NUM').value;
    }
    eat('SYM', ']');
    vector = true;
    if (match('NUM')) {
      asciiCharsPerElem = eat('NUM').value;
    } else if (match('SYM', '~')) {
      eat('SYM', '~');
      asciiNullDelim = true;
    }
  }

  eat('SYM', '/');
  const typeTok = eat('ID');
  validateInterpCompType(typeTok.value, typeTok.line);
  if (asciiNullDelim && typeTok.value !== 'ascii') {
    interpCompError('~/ is only valid for /ascii', typeTok.line);
  }
  if (asciiCharsPerElem > 0 && typeTok.value !== 'ascii') {
    interpCompError('[]M/type is only valid for /ascii', typeTok.line);
  }

  if (!match('ID', 'as')) {
    interpCompError(`expected 'as' after /${typeTok.value}`, typeTok.line);
  }
  eat('ID');
  const aliasTok = eat('ID');

  return {
    kind,
    channel: channelTok.value,
    execAlias: aliasTok.value,
    vector,
    typeName: typeTok.value,
    vectorFixedCount,
    asciiCharsPerElem,
    asciiNullDelim,
    line: channelTok.line,
  };
}

function tokenizeInterpCompDeclLine(src, lineStart) {
  const toks = typeof interpTokenize === 'function' ? interpTokenize(src) : [];
  return toks.filter((t) => t.type !== 'EOF');
}

function parseInterpCompPinPoutLine(kind, lineSrc, ctxLabel) {
  const tokens = tokenizeInterpCompDeclLine(lineSrc, 1);
  return parseInterpCompPinPoutDecl(kind, tokens, ctxLabel);
}

function parseInterpCompHeaderPinPouts(attributes, compName) {
  const raw = attributes && attributes.interpPinPoutRaw;
  if (!raw || !raw.length) return { pins: [], pouts: [] };
  const pins = [];
  const pouts = [];
  const seenChannels = new Set();
  const seenAliases = new Set();
  for (const entry of raw) {
    const decl = entry.decl || parseInterpCompPinPoutLine(entry.kind, entry.text, `comp ${compName}`);
    if (seenChannels.has(decl.channel)) {
      throw new Error(`comp ${compName}: duplicate ${decl.kind} channel '${decl.channel}'`);
    }
    if (seenAliases.has(decl.execAlias)) {
      throw new Error(`comp ${compName}: duplicate exec alias '${decl.execAlias}'`);
    }
    seenChannels.add(decl.channel);
    seenAliases.add(decl.execAlias);
    if (decl.kind === 'pin') pins.push(decl);
    else pouts.push(decl);
  }
  return { pins, pouts };
}

function interpCompPinPoutBitWidth(decl) {
  if (!decl || decl.vector) return null;
  const tn = decl.typeName;
  if (tn === 'u1' || tn === 'bool') return 1;
  const uMatch = /^u(\d+)$/.exec(tn);
  if (uMatch) return parseInt(uMatch[1], 10);
  const sMatch = /^s(\d+)$/.exec(tn);
  if (sMatch) return parseInt(sMatch[1], 10);
  if (tn === 'f32') return 32;
  if (tn === 'f64') return 64;
  if (tn === 'fp16' || tn === 'bf16') return 16;
  const qMatch = /^q(\d+)p(\d+)$/.exec(tn);
  if (qMatch) return parseInt(qMatch[1], 10) + parseInt(qMatch[2], 10);
  return null;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseInterpCompPinPoutDecl = parseInterpCompPinPoutDecl;
  globalThis.parseInterpCompPinPoutLine = parseInterpCompPinPoutLine;
  globalThis.parseInterpCompHeaderPinPouts = parseInterpCompHeaderPinPouts;
  globalThis.interpCompPinPoutBitWidth = interpCompPinPoutBitWidth;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseInterpCompPinPoutDecl,
    parseInterpCompPinPoutLine,
    parseInterpCompHeaderPinPouts,
    interpCompPinPoutBitWidth,
  };
}
