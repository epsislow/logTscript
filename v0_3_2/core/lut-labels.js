/* ================= LUT LABELS + CONSTANT EXPRESSIONS ================= */

const LABEL_RE = /^[A-Za-z][A-Za-z0-9]*$/;
const RESERVED_METHODS = new Set(['decode', 'isValid', 'get', 'in']);

function stripComment(line) {
  const hash = line.indexOf('#');
  return hash >= 0 ? line.slice(0, hash) : line;
}

function isLabelName(name) {
  return LABEL_RE.test(name) && !RESERVED_METHODS.has(name);
}

function bitwiseOr(a, b) {
  const w = Math.max(a.length, b.length);
  a = a.padStart(w, '0');
  b = b.padStart(w, '0');
  let r = '';
  for (let i = 0; i < w; i++) r += (a[i] === '1' || b[i] === '1') ? '1' : '0';
  return r;
}

function bitwiseAnd(a, b) {
  const w = Math.max(a.length, b.length);
  a = a.padStart(w, '0');
  b = b.padStart(w, '0');
  let r = '';
  for (let i = 0; i < w; i++) r += (a[i] === '1' && b[i] === '1') ? '1' : '0';
  return r;
}

function bitwiseNot(a) {
  let r = '';
  for (let i = 0; i < a.length; i++) r += a[i] === '1' ? '0' : '1';
  return r;
}

function padBits(bits, width) {
  if (width && bits.length < width) return bits.padStart(width, '0');
  if (width && bits.length > width) return bits.slice(bits.length - width);
  return bits;
}

class LutConstExprParser {
  constructor(src) {
    this.src = src;
    this.pos = 0;
  }

  _peek() { return this.pos < this.src.length ? this.src[this.pos] : ''; }
  _advance() { if (this.pos < this.src.length) this.pos++; }
  _skipWS() {
    while (this.pos < this.src.length && /[\s]/.test(this.src[this.pos])) this.pos++;
  }

  _match(ch) {
    this._skipWS();
    if (this._peek() === ch) { this._advance(); return true; }
    return false;
  }

  _readBinary() {
    this._skipWS();
    const start = this.pos;
    while (this.pos < this.src.length && (this.src[this.pos] === '0' || this.src[this.pos] === '1')) this.pos++;
    if (this.pos === start) return null;
    return this.src.slice(start, this.pos);
  }

  _readIdent() {
    this._skipWS();
    const start = this.pos;
    if (!/[A-Za-z]/.test(this._peek())) return null;
    this._advance();
    while (this.pos < this.src.length && /[A-Za-z0-9]/.test(this.src[this.pos])) this.pos++;
    return this.src.slice(start, this.pos);
  }

  _readExternalRef() {
    this._skipWS();
    if (this._peek() !== '.') return null;
    const start = this.pos;
    this._advance();
    const inst = this._readIdent();
    if (!inst) throw new Error('Expected LUT instance name after \'.\'');
    if (!this._match(':')) throw new Error(`Expected ':' in external label reference '.${inst}:LABEL'`);
    const label = this._readIdent();
    if (!label) throw new Error(`Expected label name after '.${inst}:'`);
    return { kind: 'external', inst: '.' + inst, label, raw: this.src.slice(start, this.pos) };
  }

  parsePrimary() {
    this._skipWS();
    if (this._match('(')) {
      const node = this.parseOr();
      if (!this._match(')')) throw new Error('Unbalanced parentheses in LUT expression');
      return node;
    }
    const ext = this._readExternalRef();
    if (ext) return ext;
    const bits = this._readBinary();
    if (bits) return { kind: 'binary', bits };
    const id = this._readIdent();
    if (id) {
      if (!isLabelName(id)) throw new Error(`Unknown label '${id}'`);
      return { kind: 'label', name: id };
    }
    throw new Error(`Expected operand in LUT expression near '${this.src.slice(this.pos, this.pos + 12)}'`);
  }

  parseUnary() {
    this._skipWS();
    if (this._match('!')) {
      return { kind: 'not', arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  parseAnd() {
    let left = this.parseUnary();
    while (true) {
      this._skipWS();
      if (this._peek() !== '&') break;
      this._advance();
      left = { kind: 'and', left, right: this.parseUnary() };
    }
    return left;
  }

  parseOr() {
    let left = this.parseAnd();
    while (true) {
      this._skipWS();
      if (this._peek() !== '|') break;
      this._advance();
      left = { kind: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  parse() {
    const ast = this.parseOr();
    this._skipWS();
    if (this.pos < this.src.length) {
      throw new Error(`Unexpected text in LUT expression: '${this.src.slice(this.pos)}'`);
    }
    return ast;
  }
}

function parseLutConstExpr(source) {
  const trimmed = String(source).trim();
  if (!trimmed) throw new Error('Empty LUT expression');
  const parser = new LutConstExprParser(trimmed);
  return { ast: parser.parse(), exprSource: trimmed };
}

function evalLutConstExpr(ast, ctx) {
  const { labelMap, depth, resolveExternal } = ctx;
  const evalNode = (node) => {
    switch (node.kind) {
      case 'binary':
        return padBits(node.bits, depth);
      case 'label': {
        const entry = labelMap[node.name];
        if (!entry) throw new Error(`Unknown label '${node.name}'`);
        return padBits(entry.bits, depth);
      }
      case 'external': {
        if (!resolveExternal) throw new Error(`Cannot resolve '${node.inst}:${node.label}'`);
        const bits = resolveExternal(node.inst, node.label);
        if (bits == null) throw new Error(`Cannot resolve '${node.inst}:${node.label}'`);
        return padBits(bits, depth);
      }
      case 'not':
        return padBits(bitwiseNot(evalNode(node.arg)), depth);
      case 'and':
        return padBits(bitwiseAnd(evalNode(node.left), evalNode(node.right)), depth);
      case 'or':
        return padBits(bitwiseOr(evalNode(node.left), evalNode(node.right)), depth);
      default:
        throw new Error(`Unknown LUT expression node kind '${node.kind}'`);
    }
  };
  return evalNode(ast);
}

function formatLutExprSource(ast) {
  if (!ast) return '';
  switch (ast.kind) {
    case 'binary': return ast.bits;
    case 'label': return ast.name;
    case 'external': return `${ast.inst}:${ast.label}`;
    case 'not': return `!${formatLutExprSource(ast.arg)}`;
    case 'and': return `${formatLutExprSource(ast.left)} & ${formatLutExprSource(ast.right)}`;
    case 'or': return `${formatLutExprSource(ast.left)} | ${formatLutExprSource(ast.right)}`;
    default: return '';
  }
}

function resolveLabelsForValue(inst, bits) {
  if (!inst || !inst.labelMap) return [];
  const names = [];
  for (const [name, entry] of Object.entries(inst.labelMap)) {
    if (entry.bits === bits) names.push(name);
  }
  return names;
}

function formatLutSymbolic(inst, bits, opts = {}) {
  const { labelName, exprSource } = opts;
  if (labelName && exprSource) return `${labelName} = ${exprSource}`;
  if (labelName) return `${labelName} (${bits})`;
  if (inst) {
    const matches = resolveLabelsForValue(inst, bits);
    if (matches.length === 1) return `${matches[0]} (${bits})`;
    if (matches.length > 1) return `${matches.join('/')} (${bits})`;
  }
  return bits;
}

function formatLutDisplayValue(inst, bits, meta) {
  if (meta) {
    if (meta.labelName && meta.exprSource) return `${meta.labelName} = ${meta.exprSource}`;
    if (meta.labelName) return `${meta.labelName} (${bits})`;
  }
  return formatLutSymbolic(inst, bits, meta || {});
}

function makeSymbolicMeta(instName, labelName, exprSource) {
  return {
    labelName: labelName || null,
    exprSource: exprSource || null,
    lutRef: instName || null,
  };
}

function parseLutBody(bodyRaw) {
  const attributes = {};
  const labelDefs = [];
  let dataBracePos = -1;

  const dataRe = /\bdata\s*\{/;
  const dataMatch = dataRe.exec(bodyRaw);
  if (dataMatch) {
    dataBracePos = bodyRaw.indexOf('{', dataMatch.index);
  }

  const beforeData = dataMatch ? bodyRaw.substring(0, dataMatch.index) : bodyRaw;

  const parseLabelLine = (trimmed, lineNo) => {
    const eq = trimmed.indexOf('=');
    if (eq < 0) return false;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!isLabelName(key)) return false;
    labelDefs.push({ name: key, valueSource: val, line: lineNo });
    return true;
  };

  const parseLabelsBlockContent = (lines, startLine) => {
    let lineNo = startLine;
    for (const line of lines) {
      lineNo++;
      const trimmed = stripComment(line).trim();
      if (!trimmed) continue;
      if (!parseLabelLine(trimmed, lineNo)) {
        throw new Error(`Invalid label definition '${trimmed}' at line ${lineNo}`);
      }
    }
  };

  let lineNo = 0;
  let inLabelsBlock = false;
  const labelsBlockLines = [];

  for (const line of beforeData.split('\n')) {
    lineNo++;
    const trimmed = stripComment(line).trim();
    if (!trimmed) continue;

    if (!inLabelsBlock && /^labels\s*\{\s*$/.test(trimmed)) {
      inLabelsBlock = true;
      continue;
    }
    if (inLabelsBlock) {
      if (trimmed === '}') {
        parseLabelsBlockContent(labelsBlockLines, lineNo);
        inLabelsBlock = false;
        labelsBlockLines.length = 0;
        continue;
      }
      labelsBlockLines.push(line);
      continue;
    }

    if (trimmed === 'variableDepth') {
      attributes.variableDepth = true;
      continue;
    }
    if (trimmed === 'prefixFree') {
      attributes.prefixFree = true;
      continue;
    }

    const colon = trimmed.indexOf(':');
    if (colon >= 0 && trimmed.indexOf('=') < 0) {
      const key = trimmed.slice(0, colon).trim();
      const val = trimmed.slice(colon + 1).trim();
      if (key === 'depth' || key === 'length') {
        const n = parseInt(val, 10);
        if (isNaN(n)) throw new Error(`Invalid LUT ${key} value '${val}'`);
        attributes[key] = n;
        continue;
      }
      if (key === 'fillwith') {
        attributes.fillwith = val;
        continue;
      }
      if (key === 'description' || key === 'filters') {
        attributes[key] = val;
        continue;
      }
    }

    if (parseLabelLine(trimmed, lineNo)) continue;
  }

  if (inLabelsBlock) throw new Error('Unclosed \'labels { }\' block in LUT body');

  if (labelDefs.length === 0 && dataBracePos < 0) {
    throw new Error('inline [lut] body requires at least one label or a data { } block');
  }

  return { attributes, labelDefs, dataBracePos, bodyRaw };
}

function resolveLabelValue(valueSource, labelMap, depth, resolveExternal, variableDepth) {
  const trimmed = valueSource.trim();
  if (/^[01]+$/.test(trimmed)) {
    if (!trimmed.length) throw new Error('Empty binary value not allowed');
    if (!variableDepth && depth && trimmed.length !== depth) {
      throw new Error(`Label value width mismatch: expected ${depth} bits, got ${trimmed.length}`);
    }
    return { bits: variableDepth ? trimmed : padBits(trimmed, depth), exprSource: null, ast: null };
  }
  if (isLabelName(trimmed) && labelMap[trimmed]) {
    const e = labelMap[trimmed];
    return { bits: e.bits, exprSource: e.exprSource || null, ast: e.ast || null };
  }
  const { ast, exprSource } = parseLutConstExpr(trimmed);
  const bits = evalLutConstExpr(ast, { labelMap, depth: variableDepth ? null : depth, resolveExternal });
  if (!variableDepth && depth && bits.length !== depth) {
    throw new Error(`Label value width mismatch: expected ${depth} bits, got ${bits.length}`);
  }
  return { bits, exprSource, ast };
}

function inferDepthFromLabels(labelMap) {
  const widths = new Set();
  for (const entry of Object.values(labelMap)) {
    if (entry.bits) widths.add(entry.bits.length);
  }
  if (widths.size > 1) throw new Error('Label width mismatch');
  if (widths.size === 1) return [...widths][0];
  return null;
}

function buildLabelMap(labelDefs, depth, resolveExternal) {
  const labelMap = {};
  const labelExprs = {};
  const pending = [...labelDefs];
  const seen = new Set();

  for (const def of labelDefs) {
    if (!isLabelName(def.name)) throw new Error(`Invalid label name '${def.name}'`);
    if (seen.has(def.name)) throw new Error(`Duplicate label '${def.name}'`);
    seen.add(def.name);
  }

  let guard = pending.length * 4 + 10;
  while (pending.length > 0 && guard-- > 0) {
    for (let i = 0; i < pending.length; i++) {
      const def = pending[i];
      try {
        const resolved = resolveLabelValue(def.valueSource, labelMap, depth, resolveExternal);
        labelMap[def.name] = {
          bits: resolved.bits,
          exprSource: resolved.exprSource,
          ast: resolved.ast,
          labelName: def.name,
        };
        if (resolved.exprSource) labelExprs[def.name] = resolved.exprSource;
        pending.splice(i, 1);
        i--;
      } catch (e) {
        if (!String(e.message).includes('Unknown label')) throw e;
      }
    }
  }
  if (pending.length > 0) {
    throw new Error(`Unknown label '${pending[0].name}'`);
  }

  return { labelMap, labelExprs };
}

function validatePrefixFreeValues(values) {
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!v || v.length === 0) {
      throw new Error('prefixFree requires non-empty binary values');
    }
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const u = values[j];
      if (v.length < u.length && u.startsWith(v)) {
        throw new Error(`prefixFree violation: value '${v}' is a prefix of value '${u}'`);
      }
    }
  }
}

function parseLutDataWithLabels(bodyRaw, bracePos, attributes, labelMap, depth, length, resolveExternal) {
  const variableDepth = !!attributes.variableDepth;
  const src = bodyRaw;
  let pos = bracePos + 1;
  const entries = [];
  const rawEntries = [];

  const skipWS = () => {
    while (pos < src.length) {
      if (/[\s]/.test(src[pos])) { pos++; continue; }
      if (src[pos] === '#') { while (pos < src.length && src[pos] !== '\n') pos++; continue; }
      break;
    }
  };

  const readKey = () => {
    skipWS();
    const startPos = pos;
    if (pos >= src.length) throw new Error('Expected LUT address/key');
    if (src[pos] === '\\') {
      pos++;
      let num = '';
      while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') num += src[pos++];
      if (!num) throw new Error('Expected decimal digits after \'\\\' in LUT address');
      return { index: parseInt(num, 10), raw: src.substring(startPos, pos) };
    }
    if (src[pos] === '^') {
      pos++;
      let hex = '';
      while (pos < src.length && /[0-9a-fA-F]/.test(src[pos])) hex += src[pos++];
      if (!hex) throw new Error('Expected hex digits after \'^\' in LUT address');
      return { index: parseInt(hex, 16), raw: src.substring(startPos, pos) };
    }
    if (src[pos] === '0' || src[pos] === '1') {
      let bits = '';
      while (pos < src.length && (src[pos] === '0' || src[pos] === '1')) bits += src[pos++];
      return { index: parseInt(bits, 2), raw: bits };
    }
    if (/[A-Za-z]/.test(src[pos])) {
      let name = '';
      while (pos < src.length && /[A-Za-z0-9]/.test(src[pos])) name += src[pos++];
      if (!labelMap[name]) throw new Error(`Unknown label '${name}'`);
      return { index: parseInt(labelMap[name].bits, 2), raw: name };
    }
    throw new Error('Expected LUT address or label key');
  };

  const readValueSource = () => {
    skipWS();
    if (pos >= src.length || src[pos] !== ':') throw new Error('Expected \':\' before LUT value');
    pos++;
    skipWS();
    const vStart = pos;
    let depthParen = 0;
    while (pos < src.length) {
      const ch = src[pos];
      if (ch === '(') { depthParen++; pos++; continue; }
      if (ch === ')') { depthParen--; pos++; continue; }
      if (depthParen === 0 && (ch === ',' || ch === '}')) break;
      if (depthParen === 0 && ch === '\n') {
        const rest = src.slice(pos).trimStart();
        if (/^[A-Za-z\\^01]/.test(rest) || rest.startsWith('}')) break;
      }
      pos++;
    }
    const text = src.slice(vStart, pos).trim();
    if (!text) throw new Error('Expected LUT value or expression');
    return text;
  };

  skipWS();
  while (pos < src.length && src[pos] !== '}') {
    const addrStart = readKey();
    skipWS();
    let addrEnd = addrStart;
    if (pos < src.length && src[pos] === '-') {
      pos++;
      skipWS();
      addrEnd = readKey();
      if (addrEnd.index < addrStart.index) throw new Error('LUT address range inverted');
    }
    const valueSource = readValueSource();
    const resolved = resolveLabelValue(valueSource, labelMap, depth, resolveExternal, variableDepth);
    const value = resolved.bits;
    for (let i = addrStart.index; i <= addrEnd.index; i++) {
      if (i >= length) throw new Error(`LUT address ${i} >= length ${length}`);
    }
    entries.push({ from: addrStart.index, to: addrEnd.index, value });
    rawEntries.push({
      fromRaw: addrStart.raw,
      toRaw: addrEnd.raw,
      value,
      valueRaw: valueSource,
      valueExpr: resolved.exprSource,
    });
    skipWS();
    if (pos < src.length && src[pos] === ',') pos++;
  }

  return { kind: 'lutData', entries, rawEntries };
}

function resolveLutBody(bodyRaw, resolveExternal) {
  const parsed = parseLutBody(bodyRaw);
  const attributes = { ...parsed.attributes };

  if (attributes.prefixFree) attributes.variableDepth = true;

  if (attributes.depth !== undefined && attributes.variableDepth) {
    throw new Error(attributes.prefixFree
      ? 'prefixFree cannot be combined with depth'
      : 'variableDepth cannot be combined with depth');
  }

  let depth = attributes.depth !== undefined ? parseInt(attributes.depth, 10) : null;
  const length = attributes.length !== undefined ? parseInt(attributes.length, 10) : 16;
  const variableDepth = !!attributes.variableDepth;

  const { labelMap, labelExprs } = buildLabelMap(
    parsed.labelDefs, variableDepth ? null : depth, resolveExternal
  );

  if (!variableDepth) {
    if (depth == null) {
      depth = inferDepthFromLabels(labelMap);
      if (depth == null) depth = 4;
      attributes.depth = depth;
    } else if (Object.keys(labelMap).length) {
      const inferred = inferDepthFromLabels(labelMap);
      if (inferred != null && inferred !== depth) {
        throw new Error('Label width mismatch');
      }
    }
  }

  let initialValue = { kind: 'lutData', entries: [], rawEntries: [] };
  if (parsed.dataBracePos >= 0) {
    initialValue = parseLutDataWithLabels(
      bodyRaw, parsed.dataBracePos, attributes, labelMap,
      variableDepth ? null : depth, length, resolveExternal
    );
  }

  if (attributes.prefixFree && initialValue.entries.length) {
    validatePrefixFreeValues(initialValue.entries.map(e => e.value));
  }

  if (!attributes.length) attributes.length = length;

  return { attributes, labelMap, labelExprs, initialValue };
}

const lutLabelsExports = {
  LABEL_RE,
  isLabelName,
  parseLutConstExpr,
  evalLutConstExpr,
  formatLutExprSource,
  formatLutSymbolic,
  formatLutDisplayValue,
  makeSymbolicMeta,
  resolveLabelsForValue,
  parseLutBody,
  resolveLutBody,
  parseLutDataWithLabels,
  validatePrefixFreeValues,
  buildLabelMap,
  bitwiseOr,
  bitwiseAnd,
  bitwiseNot,
};

if (typeof module !== 'undefined' && module.exports) module.exports = lutLabelsExports;
if (typeof globalThis !== 'undefined') Object.assign(globalThis, lutLabelsExports);
