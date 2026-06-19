/* ================= BOOLEAN LUT — lutOf / exprOfLut ================= */

const BOOLEAN_OPS = new Set(['NOT', 'AND', 'OR', 'XOR', 'NXOR', 'NAND', 'NOR']);

const FILTER_PATTERN_CHARS = new Set(['0', '1', '*', 'A', 'X', 'Z']);

const BOOLEAN_ANALYSIS_MAX_TABLE_ROWS = 256;
const BOOLEAN_ANALYSIS_TABLE_TOO_BIG_ERR =
  'Boolean analysis exceeds maximum supported table size (256 rows)';

const BOOLEAN_ANALYSIS_MAX_INPUT_BITS = 8;
const BOOLEAN_ANALYSIS_TOO_WIDE_ERR =
  'Boolean analysis exceeds maximum supported input width (8 bits)';

const LUT_TOO_BIG_ERR = BOOLEAN_ANALYSIS_TABLE_TOO_BIG_ERR;

function bitIndexWidth(len) {
  return len <= 1 ? 1 : 32 - Math.clz32(len - 1);
}

function lutAddrBits(length) {
  if (length <= 1) return 1;
  return bitIndexWidth(length);
}

function columnKey(atom) {
  if (atom.var) {
    const name = atom.var;
    if (!atom.bitRange) return name;
    const br = atom.bitRange;
    const start = br.start;
    const end = br.end !== undefined && br.end !== null ? br.end : start;
    if (start === end) return `${name}.${start}`;
    if (br.isLength && br.len !== undefined) return `${name}.${start}/${br.len}`;
    return `${name}.${start}-${end}`;
  }
  return null;
}

function filterSpecKey(spec) {
  return columnKey({ var: spec.name, bitRange: spec.bitRange || null });
}

function filterSpecLookupKeys(spec) {
  const keys = [filterSpecKey(spec)];
  const br = spec.bitRange;
  if (!br) return keys;
  const end = br.end !== undefined && br.end !== null ? br.end : br.start;
  if (br.isLength && br.len !== undefined) {
    const slash = `${spec.name}.${br.start}/${br.len}`;
    const dash = `${spec.name}.${br.start}-${end}`;
    if (!keys.includes(slash)) keys.push(slash);
    if (!keys.includes(dash)) keys.push(dash);
  } else if (end !== br.start) {
    const len = end - br.start + 1;
    const slash = `${spec.name}.${br.start}/${len}`;
    const dash = `${spec.name}.${br.start}-${end}`;
    if (!keys.includes(slash)) keys.push(slash);
    if (!keys.includes(dash)) keys.push(dash);
  }
  return keys;
}

function columnWidth(atom, widthResolver) {
  if (atom.bin !== undefined || atom.hex !== undefined) {
    throw new Error('lutOf: literals not allowed in expression');
  }
  if (!atom.var) throw new Error('lutOf: expected variable reference');
  if (atom.bitRange) {
    const br = atom.bitRange;
    if (br.isDynamic) throw new Error('lutOf: dynamic bit ranges not supported');
    const end = br.end !== undefined && br.end !== null ? br.end : br.start;
    return end - br.start + 1;
  }
  const w = widthResolver(atom.var);
  return w != null && w >= 1 ? w : 1;
}

function formatColumnHeader(atom, width) {
  const key = columnKey(atom);
  if (!atom.bitRange) return `${key} ${width}b`;
  const br = atom.bitRange;
  const start = br.start;
  const end = br.end !== undefined && br.end !== null ? br.end : start;
  if (start === end) return `${key} 1b`;
  if (br.isLength && br.len !== undefined) return `${key} ${br.len}b`;
  return `${key} ${width}b`;
}

function discoverLutOfInputs(exprAst, widthResolver) {
  const seen = new Set();
  const columns = [];

  function addAtom(atom) {
    if (!atom || atom.call) return;
    if (!atom.var) return;
    const key = columnKey(atom);
    if (seen.has(key)) return;
    seen.add(key);
    const width = columnWidth(atom, widthResolver);
    columns.push({ key, atom: { var: atom.var, bitRange: atom.bitRange }, width, header: formatColumnHeader(atom, width) });
  }

  function walk(parts) {
    if (!parts) return;
    for (const p of parts) {
      if (p.call) {
        if (!BOOLEAN_OPS.has(p.call.name)) {
          throw new Error(`lutOf: '${p.call.name}' is not a boolean operation`);
        }
        for (const arg of p.args) walk(arg);
      } else {
        addAtom(p);
      }
    }
  }

  if (!exprAst || exprAst.length !== 1) {
    throw new Error('lutOf: only boolean expressions supported');
  }
  walk(exprAst);
  if (columns.length === 0) throw new Error('lutOf: no inputs discovered');
  return columns;
}

function mergeDiscoveredColumns(colsA, colsB) {
  const seen = new Set();
  const merged = [];
  for (const c of [...colsA, ...colsB]) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    merged.push(c);
  }
  return merged;
}

function countFullTableRows(columns) {
  return 1 << columns.reduce((s, c) => s + c.width, 0);
}

function assertTableRowsWithinLimit(rowCount) {
  if (rowCount > BOOLEAN_ANALYSIS_MAX_TABLE_ROWS) {
    throw new Error(BOOLEAN_ANALYSIS_TABLE_TOO_BIG_ERR);
  }
}

function assertInputWidthWithinLimit(columns) {
  const bits = columns.reduce((s, c) => s + c.width, 0);
  if (bits > BOOLEAN_ANALYSIS_MAX_INPUT_BITS) {
    throw new Error(BOOLEAN_ANALYSIS_TOO_WIDE_ERR);
  }
}

function throwFilterError(msg, f, highlight = 'column') {
  const err = new Error(msg);
  if (f && f.line != null) {
    if (highlight === 'pattern' && f.patternCol != null) {
      err.scriptLoc = {
        line: f.patternLine != null ? f.patternLine : f.line,
        col: f.patternCol,
        len: f.patternLen != null ? f.patternLen : 1
      };
    } else {
      err.scriptLoc = {
        line: f.line,
        col: f.col,
        len: f.nameLen != null ? f.nameLen : (f.name ? f.name.length : 1)
      };
    }
  }
  throw err;
}

function bitSpanForAtom(atom) {
  if (!atom.bitRange) return null;
  const br = atom.bitRange;
  const end = br.end !== undefined && br.end !== null ? br.end : br.start;
  const width = br.isLength && br.len !== undefined ? br.len : end - br.start + 1;
  return { start: br.start, width };
}

function parentWireWidthFromFilterSpec(f) {
  const pattern = String(f.pattern);
  if (!f.bitRange) return pattern.length;
  const span = bitSpanForAtom({ bitRange: f.bitRange });
  if (!span) return pattern.length;
  return Math.max(span.start + span.width, pattern.length);
}

function buildFilterWidthMap(filters) {
  const map = new Map();
  if (!filters || !filters.length) return map;
  for (const f of filters) {
    const w = parentWireWidthFromFilterSpec(f);
    const prev = map.get(f.name);
    map.set(f.name, prev != null ? Math.max(prev, w) : w);
  }
  return map;
}

function makeAnalysisWidthResolver(baseResolver, filterWidthMap) {
  const base = baseResolver || (() => null);
  const map = filterWidthMap || new Map();
  return function (name) {
    const declared = base(name);
    if (declared != null && declared >= 1) return declared;
    if (map.has(name)) return map.get(name);
    return null;
  };
}

function discoverColumnsForAnalysis(exprAst, widthResolver, filters) {
  const enhanced = makeAnalysisWidthResolver(widthResolver, buildFilterWidthMap(filters));
  return discoverLutOfInputs(exprAst, enhanced);
}

function patternSubstringForColumn(parentPattern, atom) {
  const span = bitSpanForAtom(atom);
  if (!span) return parentPattern;
  return parentPattern.slice(span.start, span.start + span.width);
}

function validatePatternChars(contextName, key, pattern, f) {
  for (const ch of pattern) {
    if (contextName === 'simplify' && ch === 'A') {
      throwFilterError(
        `${contextName}: cannot use A in filters, please use * instead`,
        f,
        'pattern'
      );
    }
    if (contextName === 'exprOfLut' && ch === 'A') {
      throwFilterError(
        `${contextName}: cannot accept a lut with A in filters attribute`,
        f,
        'pattern'
      );
    }
    if (ch === 'x') {
      throwFilterError(
        `${contextName}: use '*' instead of 'x' for binary don't-care in '${key}=${pattern}'`,
        f,
        'pattern'
      );
    }
    if (!FILTER_PATTERN_CHARS.has(ch)) {
      throwFilterError(
        `${contextName}: invalid pattern character in '${key}=${pattern}'`,
        f,
        'pattern'
      );
    }
  }
}

function validateAndBuildFilterMap(columns, filters, contextName, widthResolver) {
  if (!filters || filters.length === 0) return null;
  const colByKey = new Map(columns.map(c => [c.key, c]));
  const map = new Map();

  function setFilter(key, pattern, f) {
    if (map.has(key)) {
      throwFilterError(`${contextName}: duplicate filter for '${key}'`, f);
    }
    const col = colByKey.get(key);
    if (!col) {
      throwFilterError(`${contextName}: unknown filter column '${key}'`, f);
    }
    if (pattern.length !== col.width) {
      throwFilterError(`${contextName}: pattern length mismatch for '${key}'`, f, 'pattern');
    }
    validatePatternChars(contextName, key, pattern, f);
    map.set(key, pattern);
  }

  for (const f of filters) {
    const lookupKeys = filterSpecLookupKeys(f);
    const directKey = lookupKeys.find(k => colByKey.has(k));
    if (directKey) {
      setFilter(directKey, String(f.pattern), f);
      continue;
    }

    if (!f.bitRange && widthResolver) {
      const matching = columns.filter(c => c.atom.var === f.name);
      if (matching.length > 0) {
        const pattern = String(f.pattern);
        let wireW = widthResolver(f.name);
        if (wireW == null || wireW < 1) {
          let maxBit = -1;
          for (const col of matching) {
            const span = bitSpanForAtom(col.atom);
            if (span) maxBit = Math.max(maxBit, span.start + span.width - 1);
            else maxBit = Math.max(maxBit, col.width - 1);
          }
          wireW = Math.max(pattern.length, maxBit + 1);
        }
        if (wireW < 1) {
          throwFilterError(`${contextName}: unknown wire '${f.name}' in filter`, f);
        }
        if (pattern.length !== wireW) {
          throwFilterError(
            `${contextName}: pattern length mismatch for '${f.name}' (expected ${wireW})`,
            f,
            'pattern'
          );
        }
        validatePatternChars(contextName, f.name, pattern, f);
        for (const col of matching) {
          if (map.has(col.key)) {
            throwFilterError(`${contextName}: duplicate filter for '${col.key}'`, f);
          }
          const sub = patternSubstringForColumn(pattern, col.atom);
          if (sub.length !== col.width) {
            throwFilterError(`${contextName}: pattern length mismatch for '${col.key}'`, f, 'pattern');
          }
          map.set(col.key, sub);
        }
        continue;
      }
    }

    const related = columns.filter(c => c.atom.var === f.name).map(c => c.key);
    const hint = related.length > 0 ? ` (discovered: ${related.join(', ')})` : '';
    throwFilterError(`${contextName}: unknown filter column '${filterSpecKey(f)}'${hint}`, f);
  }
  return map;
}

function optionsForPatternChar(ch) {
  switch (ch) {
    case '0': return ['0'];
    case '1': return ['1'];
    case 'X': return ['X'];
    case 'Z': return ['Z'];
    case '*': return ['0', '1'];
    case 'A': return ['0', '1', 'X', 'Z'];
    default: return [];
  }
}

function enumeratePatternValues(pattern) {
  const perBit = [...pattern].map(optionsForPatternChar);
  const out = [];
  function rec(i, acc) {
    if (i === perBit.length) {
      out.push(acc);
      return;
    }
    for (const c of perBit[i]) rec(i + 1, acc + c);
  }
  rec(0, '');
  return out;
}

function countPatternCombos(pattern) {
  let product = 1;
  for (const ch of pattern) {
    if (ch === '*') product *= 2;
    else if (ch === 'A') product *= 4;
  }
  return product;
}

function enumerateFilteredEnvs(columns, filterMap) {
  if (!filterMap) {
    const addrWidth = columns.reduce((s, c) => s + c.width, 0);
    const envs = [];
    for (let addr = 0; addr < (1 << addrWidth); addr++) {
      envs.push(addrBitsToColumns(columns, addr));
    }
    return envs;
  }

  const colValueLists = columns.map(col => {
    const pattern = filterMap.get(col.key);
    if (!pattern) {
      const list = [];
      for (let v = 0; v < (1 << col.width); v++) {
        list.push(v.toString(2).padStart(col.width, '0'));
      }
      return list;
    }
    return enumeratePatternValues(pattern);
  });

  const envs = [];
  function cart(colIdx, partial) {
    if (colIdx === columns.length) {
      const env = {};
      columns.forEach((col, i) => { env[col.key] = partial[i]; });
      envs.push(env);
      return;
    }
    for (const val of colValueLists[colIdx]) {
      cart(colIdx + 1, partial.concat(val));
    }
  }
  cart(0, []);
  return envs;
}

function countRowsToGenerate(columns, filterMap) {
  let product = 1;
  for (const col of columns) {
    if (filterMap && filterMap.has(col.key)) {
      product *= countPatternCombos(filterMap.get(col.key));
    } else {
      product *= (1 << col.width);
    }
  }
  return product;
}

function rowMatchesFilters(columns, env, filterMap) {
  if (!filterMap) return true;
  for (const col of columns) {
    const p = filterMap.get(col.key);
    if (!p) continue;
    const val = env[col.key];
    for (let i = 0; i < p.length; i++) {
      const sym = p[i];
      if (sym === '*' || sym === 'A') continue;
      if (val[i] !== sym) return false;
    }
  }
  return true;
}

function formatFiltersAttribute(filters) {
  return filters.map(f => `${filterSpecKey(f)}=${f.pattern}`).join(', ');
}

function parseColumnRefString(ref) {
  const s = ref.trim();
  const dot = s.indexOf('.');
  if (dot < 0) return { name: s, bitRange: null };
  const name = s.slice(0, dot);
  const rest = s.slice(dot + 1);
  if (rest.includes('/')) {
    const slash = rest.indexOf('/');
    const start = parseInt(rest.slice(0, slash), 10);
    const len = parseInt(rest.slice(slash + 1), 10);
    if (isNaN(start) || isNaN(len)) {
      throw new Error(`exprOfLut: invalid column reference '${ref}'`);
    }
    return { name, bitRange: { start, end: start + len - 1, isLength: true, len } };
  }
  if (rest.includes('-')) {
    const dash = rest.indexOf('-');
    const start = parseInt(rest.slice(0, dash), 10);
    const end = parseInt(rest.slice(dash + 1), 10);
    if (isNaN(start) || isNaN(end)) {
      throw new Error(`exprOfLut: invalid column reference '${ref}'`);
    }
    return { name, bitRange: { start, end } };
  }
  const start = parseInt(rest, 10);
  if (isNaN(start)) throw new Error(`exprOfLut: invalid column reference '${ref}'`);
  return { name, bitRange: { start, end: start } };
}

function parseLutDescriptionString(s) {
  const arrow = s.indexOf('->');
  if (arrow < 0) throw new Error('exprOfLut: invalid description (missing ->)');
  const left = s.slice(0, arrow).trim();
  const columns = [];
  for (const part of left.split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    const m = seg.match(/^(.+?)\s+(\d+)b$/);
    if (!m) throw new Error(`exprOfLut: invalid description column '${seg}'`);
    const ref = parseColumnRefString(m[1].trim());
    const width = parseInt(m[2], 10);
    const atom = { var: ref.name, bitRange: ref.bitRange };
    const key = columnKey(atom);
    columns.push({ key, atom, width, header: formatColumnHeader(atom, width) });
  }
  if (columns.length === 0) throw new Error('exprOfLut: description has no columns');
  return columns;
}

function parseFiltersAttributeString(s) {
  const filters = [];
  for (const part of s.split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    const eq = seg.indexOf('=');
    if (eq < 0) throw new Error(`exprOfLut: invalid filter segment '${seg}'`);
    const ref = parseColumnRefString(seg.slice(0, eq).trim());
    const pattern = seg.slice(eq + 1).trim();
    if (!pattern) throw new Error(`exprOfLut: missing pattern in filter '${seg}'`);
    filters.push({ name: ref.name, bitRange: ref.bitRange, pattern });
  }
  if (filters.length === 0) throw new Error('exprOfLut: filters attribute is empty');
  return filters;
}

function varyingBitLabels(columns, filterMap) {
  const labels = [];
  for (const col of columns) {
    const bitLabels = columnToBitLabels(col);
    const pattern = filterMap ? filterMap.get(col.key) : null;
    if (!pattern) {
      labels.push(...bitLabels);
    } else {
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '*') labels.push(bitLabels[i]);
      }
    }
  }
  return labels;
}

function replayFilteredEnvs(columns, filterMap) {
  return enumerateFilteredEnvs(columns, filterMap);
}

function extractVaryingBitsFromEnv(env, columns, filterMap) {
  let bits = '';
  for (const col of columns) {
    const pattern = filterMap ? filterMap.get(col.key) : null;
    const val = env[col.key];
    if (!pattern) {
      bits += val;
    } else {
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '*') bits += val[i];
      }
    }
  }
  return bits;
}

function outputBitIsTrue(ch) {
  return ch === '1';
}

function classifyOutputColumn(chars, contextName = 'exprOfLut') {
  const set = new Set(chars);
  if (set.size === 1) {
    const only = chars[0];
    if (only === '0' || only === '1' || only === 'X' || only === 'Z') {
      return { kind: 'uniform', value: only };
    }
  }
  if ([...set].every(c => c === '0' || c === '1')) {
    return { kind: 'binary', bools: chars.map(outputBitIsTrue) };
  }
  throw new Error(
    `${contextName}: conflicting non-binary outputs for the same varying assignment`
  );
}

function buildFilteredOutputsByMinterm(lutInst, columns, filterMap) {
  const { length, depth, outputsByBit } = extractLutOutputs(lutInst);
  const labels = varyingBitLabels(columns, filterMap);
  const numVars = labels.length;
  const envs = replayFilteredEnvs(columns, filterMap);

  if (envs.length !== length) {
    throw new Error(`exprOfLut: LUT row count ${length} does not match filter replay ${envs.length}`);
  }
  if (numVars > 8) {
    throw new Error(BOOLEAN_ANALYSIS_TOO_WIDE_ERR);
  }

  if (numVars === 0) {
    const cols = [];
    for (let b = 0; b < depth; b++) {
      const chars = outputsByBit[b].map(v => (v ? '1' : '0'));
      cols.push(classifyOutputColumn(chars, 'exprOfLut'));
    }
    return { labels, outputCols: cols, depth, numVars };
  }

  const tableSize = 1 << numVars;
  const assigned = [];
  for (let b = 0; b < depth; b++) assigned.push(new Array(tableSize).fill(null));

  for (let rowIdx = 0; rowIdx < length; rowIdx++) {
    const varyingBits = extractVaryingBitsFromEnv(envs[rowIdx], columns, filterMap);
    const mintermIdx = parseInt(varyingBits, 2);
    if (isNaN(mintermIdx) || mintermIdx < 0 || mintermIdx >= tableSize) {
      throw new Error(`exprOfLut: invalid varying bits '${varyingBits}' at row ${rowIdx}`);
    }
    for (let b = 0; b < depth; b++) {
      const outVal = outputsByBit[b][rowIdx];
      const prev = assigned[b][mintermIdx];
      if (prev !== null && prev !== outVal) {
        throw new Error(`exprOfLut: conflicting output at minterm ${varyingBits} for output bit ${b}`);
      }
      assigned[b][mintermIdx] = outVal;
    }
  }

  const outputCols = [];
  for (let b = 0; b < depth; b++) {
    const chars = assigned[b].map(v => (v === null ? '0' : (v ? '1' : '0')));
    outputCols.push(classifyOutputColumn(chars, 'exprOfLut'));
  }

  const outputsByBitQm = outputCols.map(col => (
    col.kind === 'binary' ? col.bools : new Array(tableSize).fill(col.value === '1')
  ));

  return { labels, outputsByBit: outputsByBitQm, outputCols, depth, numVars };
}

function labelsMatch(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function addrBitsToColumns(columns, addr) {
  const env = {};
  let shift = 0;
  for (let c = columns.length - 1; c >= 0; c--) {
    const col = columns[c];
    if (col.width === 1) {
      env[col.key] = ((addr >> shift) & 1) ? '1' : '0';
      shift++;
    } else {
      let bits = '';
      for (let b = 0; b < col.width; b++) {
        bits += ((addr >> shift) & 1) ? '1' : '0';
        shift++;
      }
      env[col.key] = bits;
    }
  }
  return env;
}

function columnToBitLabels(col) {
  const labels = [];
  const atom = col.atom;
  const w = col.width;
  if (atom.bitRange) {
    const br = atom.bitRange;
    const start = br.start;
    const end = br.end !== undefined && br.end !== null ? br.end : start;
    if (start === end) {
      labels.push(`${atom.var}.${start}`);
    } else {
      for (let b = start; b <= end; b++) labels.push(`${atom.var}.${b}`);
    }
  } else if (w === 1) {
    labels.push(atom.var);
  } else {
    for (let b = 0; b < w; b++) labels.push(`${atom.var}.${b}`);
  }
  return labels;
}

function columnsToInputLabels(columns) {
  const labels = [];
  for (const col of columns) {
    labels.push(...columnToBitLabels(col));
  }
  return labels;
}

function collectFilteredRows(exprAst, columns, widthResolver, filterMap) {
  const envs = enumerateFilteredEnvs(columns, filterMap);
  assertTableRowsWithinLimit(envs.length);

  const rows = [];
  let outWidth = 1;

  for (const env of envs) {
    const result = evalBooleanParts(exprAst, env, widthResolver);
    if (rows.length === 0) outWidth = result.length;
    else if (result.length !== outWidth) {
      throw new Error('lutOf: inconsistent output width');
    }
    rows.push({ env, output: result });
  }
  const addrWidth = columns.reduce((s, c) => s + c.width, 0);
  return { rows, addrWidth, outWidth };
}

function evalAtomBoolean(atom, env, widthResolver) {
  if (atom.bin !== undefined || atom.hex !== undefined) {
    throw new Error('lutOf: literals not allowed');
  }
  const key = columnKey(atom);
  if (key && env[key] !== undefined) {
    let v = env[key];
    if (atom.not) {
      if (typeof LogicValue !== 'undefined' && LogicValue.evalLogicGateVector && /[XZ]/.test(v)) {
        v = LogicValue.evalLogicGateVector('NOT', v, null);
      } else {
        v = v.split('').map(b => b === '1' ? '0' : '1').join('');
      }
    }
    return v;
  }
  throw new Error(`lutOf: unresolved reference '${key || atom.var}'`);
}

function evalBooleanParts(parts, env, widthResolver) {
  if (!parts || parts.length !== 1) {
    throw new Error('lutOf: only boolean expressions supported');
  }
  return evalBooleanPart(parts[0], env, widthResolver);
}

function evalBooleanPart(part, env, widthResolver) {
  if (part.call) return evalBooleanCall(part, env, widthResolver);
  return evalAtomBoolean(part, env, widthResolver);
}

function evalBooleanCall(part, env, widthResolver) {
  const name = part.call.name;
  if (!BOOLEAN_OPS.has(name)) {
    throw new Error(`lutOf: '${name}' is not a boolean operation`);
  }
  const argValues = part.args.map(a => evalBooleanParts(a, env, widthResolver));

  if (typeof LogicValue !== 'undefined' && LogicValue.evalLogicGateCall) {
    const hasXZ = argValues.some(v => /[XZ]/.test(v));
    if (hasXZ || name === 'EQ') {
      return LogicValue.evalLogicGateCall(name, argValues);
    }
  }

  if (name === 'NOT') {
    const a = argValues[0];
    return a.split('').map(c => c === '1' ? '0' : '1').join('');
  }

  const applyOp = (ai, bi) => {
    switch (name) {
      case 'AND': return ai && bi;
      case 'OR': return ai || bi;
      case 'XOR': return ai !== bi;
      case 'NXOR': return ai === bi;
      case 'NAND': return !(ai && bi);
      case 'NOR': return !(ai || bi);
      default: return false;
    }
  };

  if (argValues.length === 1) {
    const bits = argValues[0].split('');
    let acc = bits[0] === '1';
    for (let i = 1; i < bits.length; i++) acc = applyOp(acc, bits[i] === '1');
    return acc ? '1' : '0';
  }

  const a = argValues[0];
  const b = argValues[1];
  const len = Math.max(a.length, b.length);
  const ap = a.padStart(len, '0');
  const bp = b.padStart(len, '0');
  const resultBits = [];
  for (let i = 0; i < len; i++) {
    resultBits.push(applyOp(ap[i] === '1', bp[i] === '1') ? '1' : '0');
  }
  return resultBits.join('');
}

function evalBooleanPartsWidth(parts, widthResolver) {
  if (!parts || parts.length !== 1) return 1;
  return evalBooleanPartWidth(parts[0], widthResolver);
}

function evalBooleanPartWidth(part, widthResolver) {
  if (part.call) {
    const name = part.call.name;
    if (name === 'NOT') return evalBooleanPartsWidth(part.args[0], widthResolver);
    const ws = part.args.map(a => evalBooleanPartsWidth(a, widthResolver));
    return Math.max(...ws);
  }
  if (part.var) return columnWidth(part, widthResolver);
  return 1;
}

function computeSyntacticCost(exprAst, widthResolver) {
  if (!exprAst || exprAst.length !== 1) return 0;
  return evalBooleanPartCost(exprAst[0], widthResolver);
}

function evalBooleanPartCost(part, widthResolver) {
  if (part.call) {
    const name = part.call.name;
    if (!BOOLEAN_OPS.has(name)) return 0;
    const childCost = part.args.reduce((s, a) => s + evalBooleanPartsCost(a, widthResolver), 0);
    if (name === 'NOT') {
      return evalBooleanPartsWidth(part.args[0], widthResolver) + childCost;
    }
    const ws = part.args.map(a => evalBooleanPartsWidth(a, widthResolver));
    return Math.max(...ws) + childCost;
  }
  return 0;
}

function evalBooleanPartsCost(parts, widthResolver) {
  if (!parts || parts.length !== 1) return 0;
  return evalBooleanPartCost(parts[0], widthResolver);
}

function costFromMinimized(min) {
  if (min.constant === true || min.constant === false) return 0;
  let cost = 0;
  if (min.terms.length > 1) cost += 1;
  for (const term of min.terms) {
    if (term.length > 1) cost += 1;
  }
  return cost;
}

function formatTermShort(literals) {
  if (literals.length === 0) return '1';
  return literals.map(l => (l.negated ? '!' : '') + l.label).join(' & ');
}

function formatTermStandard(literals) {
  if (literals.length === 0) return '1';
  if (literals.length === 1) {
    const l = literals[0];
    return l.negated ? `NOT(${l.label})` : l.label;
  }
  const inner = literals.map(l => l.negated ? `NOT(${l.label})` : l.label).join(', ');
  return `AND(${inner})`;
}

function formatMinimizedShort(min) {
  if (min.constant === false) return '0';
  if (min.constant === true) return '1';
  if (min.constant === 'X' || min.constant === 'Z') return min.constant;
  if (min.terms.length === 0) return '0';
  if (min.terms.length === 1) return formatTermShort(min.terms[0]);
  return min.terms.map(t => `(${formatTermShort(t)})`).join(' | ');
}

function formatMinimizedStandard(min) {
  if (min.constant === false) return '0';
  if (min.constant === true) return '1';
  if (min.constant === 'X' || min.constant === 'Z') return min.constant;
  if (min.terms.length === 0) return '0';
  if (min.terms.length === 1) return formatTermStandard(min.terms[0]);
  const inner = min.terms.map(t => formatTermStandard(t)).join(', ');
  return `OR(${inner})`;
}

function segmentsFromOutputColumn(labels, col, minimizeFn) {
  if (col.kind === 'uniform') {
    const v = col.value;
    if (v === '0' || v === '1') {
      const min = { constant: v === '1' };
      return { short: formatMinimizedShort(min), std: formatMinimizedStandard(min) };
    }
    return { short: v, std: v };
  }
  const min = minimizeFn(labels, col.bools);
  return { short: formatMinimizedShort(min), std: formatMinimizedStandard(min) };
}

function isConstBitSegment(s) {
  return s === '0' || s === '1';
}

function groupMultiBitSegments(segments) {
  const groups = [];
  let i = 0;
  while (i < segments.length) {
    if (isConstBitSegment(segments[i])) {
      let j = i;
      while (j < segments.length && isConstBitSegment(segments[j])) j++;
      groups.push({ kind: 'const', bits: segments.slice(i, j) });
      i = j;
    } else {
      groups.push({ kind: 'expr', text: segments[i] });
      i++;
    }
  }
  return groups;
}

function formatConstGroupShort(bits) {
  return bits.length === 1 ? `(${bits[0]})` : `(${bits.join('')})`;
}

function formatMultiBitShort(segments) {
  const groups = groupMultiBitSegments(segments);
  if (groups.length === 1) {
    const g = groups[0];
    return g.kind === 'const' ? formatConstGroupShort(g.bits) : `(${g.text})`;
  }
  return groups.map(g => (
    g.kind === 'const' ? formatConstGroupShort(g.bits) : `(${g.text})`
  )).join(' + ');
}

function formatMultiBitStandard(segments) {
  const groups = groupMultiBitSegments(segments);
  if (groups.length === 1) {
    const g = groups[0];
    return g.kind === 'const' ? g.bits.join('') : g.text;
  }
  return groups.map(g => (
    g.kind === 'const' ? g.bits.join('') : g.text
  )).join(' + ');
}

const LIFT_BINARY_GATES = new Set(['AND', 'OR', 'XOR', 'NAND', 'NOR', 'NXOR']);
const LIFT_SHORT_BINOP = {
  AND: '&',
  OR: '|',
  XOR: '^',
  NAND: '-&',
  NOR: '-|',
  NXOR: '-^'
};

function liftAtomSingleBitRef(part) {
  if (!part) return null;
  if (part.call && part.call.name === 'NOT') {
    const inner = liftAtomSingleBitRef(part.args[0][0]);
    if (!inner || inner.negated) return null;
    return { wire: inner.wire, bit: inner.bit, negated: true };
  }
  if (part.var && !part.property && !part.not) {
    if (!part.bitRange) return { wire: part.var, bit: 0, negated: false };
    const br = part.bitRange;
    const end = br.end !== undefined && br.end !== null ? br.end : br.start;
    if (br.start !== end) return null;
    return { wire: part.var, bit: br.start, negated: false };
  }
  return null;
}

function liftParseAndTerm(part) {
  if (!part || !part.call || part.call.name !== 'AND' || part.args.length !== 2) return null;
  const a0 = liftAtomSingleBitRef(part.args[0][0]);
  const a1 = liftAtomSingleBitRef(part.args[1][0]);
  if (!a0 || !a1) return null;
  return { a0, a1 };
}

function liftParseXorAsOr(part) {
  if (!part || !part.call || part.call.name !== 'OR' || part.args.length !== 2) return null;
  const t0 = liftParseAndTerm(part.args[0][0]);
  const t1 = liftParseAndTerm(part.args[1][0]);
  if (!t0 || !t1) return null;
  const pairs = [
    [t0.a0, t0.a1, t1.a0, t1.a1],
    [t0.a0, t0.a1, t1.a1, t1.a0],
    [t0.a1, t0.a0, t1.a0, t1.a1],
    [t0.a1, t0.a0, t1.a1, t1.a0]
  ];
  for (const [n0, p0, p1, n1] of pairs) {
    if (!n0.negated || p0.negated || p1.negated || !n1.negated) continue;
    if (n0.wire !== p1.wire || p0.wire !== n1.wire) continue;
    if (n0.bit !== p1.bit || p0.bit !== n1.bit || n0.bit !== p0.bit) continue;
    return { gate: 'XOR', args: [{ wire: n0.wire, bit: n0.bit }, { wire: p0.wire, bit: p0.bit }] };
  }
  return null;
}

function liftAnalyzeStdSegment(std) {
  const s = String(std).trim();
  if (s === '0' || s === '1' || s === 'X' || s === 'Z') return { gate: 'CONST', value: s };
  if (typeof parseStdExprToAst !== 'function') return null;
  try {
    const ast = parseStdExprToAst(s);
    if (!ast || ast.length !== 1) return null;
    const part = ast[0];
    if (!part.call) return null;
    const name = part.call.name;
    if (name === 'NOT' && part.args.length === 1) {
      const r = liftAtomSingleBitRef(part.args[0][0]);
      if (!r) return null;
      return { gate: 'NOT', args: [{ wire: r.wire, bit: r.bit }] };
    }
    if (name === 'OR' && part.args.length === 2) {
      const xor = liftParseXorAsOr(part);
      if (xor) return xor;
    }
    if (LIFT_BINARY_GATES.has(name) && part.args.length === 2) {
      const a0 = liftAtomSingleBitRef(part.args[0][0]);
      const a1 = liftAtomSingleBitRef(part.args[1][0]);
      if (!a0 || !a1 || a0.negated || a1.negated) return null;
      return { gate: name, args: [a0, a1] };
    }
  } catch (e) {
    return null;
  }
  return null;
}

function isLiftablePattern(pattern) {
  if (!pattern || pattern.gate === 'CONST') return false;
  if (pattern.gate === 'NOT') return pattern.args[0].bit != null;
  if (pattern.args && pattern.args.length === 2) {
    return pattern.args[0].bit != null && pattern.args[1].bit != null
      && pattern.args[0].bit === pattern.args[1].bit;
  }
  return false;
}

function liftPatternsCompatible(p0, pi, gate, bitOffset) {
  if (!pi || pi.gate !== gate) return false;
  const expectedBit = p0.args[0].bit + bitOffset;
  if (gate === 'NOT') {
    return pi.args[0].wire === p0.args[0].wire && pi.args[0].bit === expectedBit;
  }
  return pi.args[0].wire === p0.args[0].wire && pi.args[1].wire === p0.args[1].wire
    && pi.args[0].bit === expectedBit && pi.args[1].bit === expectedBit;
}

function buildWireWidthMap(columns, widthResolver) {
  const map = new Map();
  for (const col of columns) {
    const v = col.atom.var;
    if (!v) continue;
    const dw = widthResolver(v);
    if (dw != null && dw >= 1) {
      map.set(v, Math.max(map.get(v) || 0, dw));
    }
    if (!col.atom.bitRange) {
      map.set(v, Math.max(map.get(v) || 0, col.width));
    } else {
      const span = bitSpanForAtom(col.atom);
      if (span) map.set(v, Math.max(map.get(v) || 0, span.start + span.width));
    }
  }
  return map;
}

function liftFormatWireArg(wire, outStart, outEnd, totalOutputBits, wireWidths) {
  const runLen = outEnd - outStart + 1;
  const declared = wireWidths && wireWidths.get(wire);
  const useFullWire = declared != null && runLen === declared && outStart === 0 && runLen === totalOutputBits;
  if (useFullWire) return wire;
  if (outStart === outEnd) return `${wire}.${outStart}`;
  return `${wire}.${outStart}-${outEnd}`;
}

function liftBuildStd(run, totalBits, wireWidths) {
  if (run.gate === 'NOT') {
    const w = liftFormatWireArg(run.wires[0], run.outStart, run.outEnd, totalBits, wireWidths);
    return `NOT(${w})`;
  }
  const ws = run.wires.map(w => liftFormatWireArg(w, run.outStart, run.outEnd, totalBits, wireWidths));
  return `${run.gate}(${ws.join(', ')})`;
}

function liftBuildShort(run, totalBits, wireWidths) {
  if (run.gate === 'NOT') {
    const w = liftFormatWireArg(run.wires[0], run.outStart, run.outEnd, totalBits, wireWidths);
    return `!${w}`;
  }
  const ws = run.wires.map(w => liftFormatWireArg(w, run.outStart, run.outEnd, totalBits, wireWidths));
  const op = LIFT_SHORT_BINOP[run.gate] || '&';
  return `${ws[0]} ${op} ${ws[1]}`;
}

function tryLiftBitwiseGateSegments(segmentsStd, segmentsShort, wireWidths) {
  if (!segmentsStd || segmentsStd.length <= 1) return null;
  const patterns = segmentsStd.map(liftAnalyzeStdSegment);
  const groups = [];
  let liftedAny = false;
  let i = 0;
  while (i < segmentsStd.length) {
    const p0 = patterns[i];
    if (!p0 || !isLiftablePattern(p0)) {
      groups.push({ kind: 'raw', std: segmentsStd[i], short: segmentsShort ? segmentsShort[i] : segmentsStd[i] });
      i++;
      continue;
    }
    const gate = p0.gate;
    const wires = gate === 'NOT' ? [p0.args[0].wire] : [p0.args[0].wire, p0.args[1].wire];
    let len = 1;
    while (i + len < segmentsStd.length && liftPatternsCompatible(p0, patterns[i + len], gate, len)) {
      len++;
    }
    if ((LIFT_BINARY_GATES.has(gate) || gate === 'NOT') && len >= 1) {
      const wireBitStart = p0.args[0].bit;
      const run = { gate, wires, outStart: wireBitStart, outEnd: wireBitStart + len - 1, len };
      groups.push({
        kind: 'lifted',
        std: liftBuildStd(run, segmentsStd.length, wireWidths),
        short: liftBuildShort(run, segmentsStd.length, wireWidths)
      });
      liftedAny = true;
      i += len;
      continue;
    }
    groups.push({ kind: 'raw', std: segmentsStd[i], short: segmentsShort ? segmentsShort[i] : segmentsStd[i] });
    i++;
  }
  if (!liftedAny) return null;
  const joinGroups = (key) => {
    if (groups.length === 1) return groups[0][key];
    return groups.map(g => {
      const text = g[key];
      if (g.kind === 'lifted') return `(${text})`;
      if (g.kind === 'raw' && !isConstBitSegment(text)) return `(${text})`;
      return text;
    }).join(' + ');
  };
  return { std: joinGroups('std'), short: joinGroups('short') };
}

function finalizeMultiBitExpressions(segmentsStd, segmentsShort, wireWidths) {
  if (!segmentsStd || segmentsStd.length === 0) return { std: '', short: '' };
  if (segmentsStd.length === 1) {
    return { std: segmentsStd[0], short: segmentsShort[0] };
  }
  const lifted = tryLiftBitwiseGateSegments(segmentsStd, segmentsShort, wireWidths);
  if (lifted) return lifted;
  return {
    std: formatMultiBitStandard(segmentsStd),
    short: formatMultiBitShort(segmentsShort)
  };
}

const LUT_OF_INLINE_NAME = '.generated';

function lutOfBuild(exprAst, widthResolver, filters) {
  const enhanced = makeAnalysisWidthResolver(widthResolver, buildFilterWidthMap(filters));
  const columns = discoverLutOfInputs(exprAst, enhanced);
  const filterMap = validateAndBuildFilterMap(columns, filters, 'lutOf', enhanced);
  const { rows, addrWidth, outWidth } = collectFilteredRows(exprAst, columns, enhanced, filterMap);

  const description = `${columns.map(c => c.header).join(', ')} -> out ${outWidth}b`;
  const attributes = { description };
  if (filters && filters.length > 0) {
    attributes.filters = formatFiltersAttribute(filters);
  }

  const length = filterMap ? rows.length : (1 << addrWidth);
  const addrPad = filterMap ? bitIndexWidth(length) : addrWidth;

  attributes.depth = outWidth;
  attributes.length = length;

  const entries = [];
  const rawEntries = [];
  for (let i = 0; i < rows.length; i++) {
    const addrStr = i.toString(2).padStart(addrPad, '0');
    const addrIndex = parseInt(addrStr, 2);
    entries.push({ from: addrIndex, to: addrIndex, value: rows[i].output });
    rawEntries.push({ from: addrStr, value: rows[i].output });
  }

  return {
    attributes,
    initialValue: { kind: 'lutData', entries, rawEntries },
    labelMap: {},
    labelExprs: {},
  };
}

function formatInlineLutText(instanceName, built) {
  const { attributes, initialValue } = built;
  const inner = [`description: ${attributes.description}`];
  if (attributes.filters) {
    inner.push(`filters: ${attributes.filters}`);
  }
  const depth = attributes.depth;
  const length = attributes.length;
  const addrPad = bitIndexWidth(length);

  inner.push('', `depth: ${depth}`, `length: ${length}`, 'data {');
  for (const entry of initialValue.entries) {
    const addrStr = entry.from.toString(2).padStart(addrPad, '0');
    inner.push(`  ${addrStr} : ${entry.value}`);
  }
  inner.push('}');

  const lines = [`inline [lut] ${instanceName}:`];
  for (const line of inner) {
    lines.push(line === '' ? '' : `  ${line}`);
  }
  lines.push(':');
  return lines.join('\n');
}

function lutOfGenerate(exprAst, widthResolver, filters, instanceName) {
  const built = lutOfBuild(exprAst, widthResolver, filters);
  return formatInlineLutText(instanceName || LUT_OF_INLINE_NAME, built);
}

function isLutOfBodyRaw(bodyRaw) {
  return /^\s*lutOf\s*\(/m.test(bodyRaw || '');
}

function parseLutOfFromSource(src, componentRegistry) {
  if (typeof Parser === 'undefined' || typeof Tokenizer === 'undefined') {
    throw new Error('Parser is not loaded');
  }
  const processed = typeof preprocessRepeat === 'function' ? preprocessRepeat(src.trim()) : src.trim();
  const p = new Parser(new Tokenizer(processed), componentRegistry || null);
  return p.parseLutOfCallInner();
}

function parseStdExprToAst(stdExpr, componentRegistry) {
  if (typeof Parser === 'undefined' || typeof Tokenizer === 'undefined') {
    throw new Error('Parser is not loaded');
  }
  const processed = typeof preprocessRepeat === 'function' ? preprocessRepeat(stdExpr) : stdExpr;
  const p = new Parser(new Tokenizer(processed), componentRegistry || null);
  return p.expr();
}

function resolveVarWidth(spec, widthResolver) {
  if (spec.width != null) return spec.width;
  if (spec.bitRange) {
    const br = spec.bitRange;
    const end = br.end !== undefined && br.end !== null ? br.end : br.start;
    return end - br.start + 1;
  }
  const w = widthResolver(spec.name);
  return w != null && w >= 1 ? w : 1;
}

function expandExprOfLutVars(varSpecs, widthResolver) {
  const labels = [];
  const resolved = [];
  for (const spec of varSpecs) {
    let width;
    if (spec.bitRange) {
      const br = spec.bitRange;
      const end = br.end !== undefined && br.end !== null ? br.end : br.start;
      width = end - br.start + 1;
    } else if (spec.width != null) {
      width = spec.width;
    } else {
      const w = widthResolver(spec.name);
      width = w != null && w >= 1 ? w : 1;
    }
    if (spec.width != null && spec.width !== width) {
      throw new Error(`exprOfLut column width mismatch for '${spec.name}'`);
    }
    resolved.push({ name: spec.name, bitRange: spec.bitRange || null, width });

    if (spec.bitRange) {
      const br = spec.bitRange;
      const start = br.start;
      const end = br.end !== undefined && br.end !== null ? br.end : start;
      if (start === end) {
        labels.push(`${spec.name}.${start}`);
      } else {
        for (let b = start; b <= end; b++) {
          labels.push(`${spec.name}.${b}`);
        }
      }
    } else if (width === 1) {
      labels.push(spec.name);
    } else {
      for (let b = 0; b < width; b++) {
        labels.push(`${spec.name}.${b}`);
      }
    }
  }
  return { labels, resolved };
}

function extractLutOutputs(lutInst) {
  const isLut = lutInst && (lutInst.kind === 'lut' || lutInst.type === 'lut');
  if (!isLut) throw new Error('exprOfLut: invalid LUT instance');
  if (lutInst.attributes && lutInst.attributes.prefixFree) {
    throw new Error('exprOfLut: prefixFree LUT not supported');
  }
  if (lutInst.attributes && lutInst.attributes.variableDepth) {
    throw new Error('exprOfLut: variableDepth LUT not supported');
  }
  const length = lutInst.attributes && lutInst.attributes.length !== undefined
    ? parseInt(lutInst.attributes.length, 10) : 16;
  const depth = lutInst.attributes && lutInst.attributes.depth !== undefined
    ? parseInt(lutInst.attributes.depth, 10) : 4;
  const table = lutInst.lutTable;
  if (!table || !table.length) throw new Error('exprOfLut: LUT has no table data');

  const outputsByBit = [];
  for (let b = 0; b < depth; b++) outputsByBit.push([]);

  for (let addr = 0; addr < length; addr++) {
    const row = table[addr] || '0'.repeat(depth);
    const padded = row.padStart(depth, '0');
    for (let b = 0; b < depth; b++) {
      outputsByBit[b].push(padded[b] === '1');
    }
  }
  return { length, depth, outputsByBit };
}

function exprOfLutBuildCore(lutInst, varSpecs, widthResolver) {
  const attrs = lutInst.attributes || {};
  let labels;
  let outputCols;
  let depth;
  let columns = null;

  const minimizeFn = typeof minimizeBoolean === 'function' ? minimizeBoolean : null;
  if (!minimizeFn) throw new Error('boolean-minimize.js is not loaded');

  if (varSpecs.length > 0 && attrs.filters && attrs.description) {
    columns = parseLutDescriptionString(attrs.description);
    const filters = parseFiltersAttributeString(attrs.filters);
    const enhanced = makeAnalysisWidthResolver(widthResolver, buildFilterWidthMap(filters));
    const filterMap = validateAndBuildFilterMap(columns, filters, 'exprOfLut', enhanced);
    const autoLabels = varyingBitLabels(columns, filterMap);
    const expanded = expandExprOfLutVars(varSpecs, widthResolver);
    if (!labelsMatch(expanded.labels, autoLabels)) {
      throw new Error(`exprOfLut: variables do not match LUT filters: expected [${autoLabels.join(', ')}]`);
    }
    const built = buildFilteredOutputsByMinterm(lutInst, columns, filterMap);
    labels = built.labels;
    outputCols = built.outputCols || built.outputsByBit.map(bools => ({ kind: 'binary', bools }));
    depth = built.depth;
  } else if (varSpecs.length > 0) {
    const expanded = expandExprOfLutVars(varSpecs, widthResolver);
    labels = expanded.labels;
    const sumWidth = expanded.resolved.reduce((s, r) => s + r.width, 0);
    const extracted = extractLutOutputs(lutInst);
    depth = extracted.depth;
    const expected = lutAddrBits(extracted.length);
    if (sumWidth !== expected) {
      throw new Error(`exprOfLut expects ${expected} input bits but received ${sumWidth}`);
    }
    outputCols = extracted.outputsByBit.map(bools => ({ kind: 'binary', bools }));
  } else if (attrs.filters) {
    if (!attrs.description) {
      throw new Error('exprOfLut: LUT has filters: but no description: attribute');
    }
    columns = parseLutDescriptionString(attrs.description);
    const filters = parseFiltersAttributeString(attrs.filters);
    const enhanced = makeAnalysisWidthResolver(widthResolver, buildFilterWidthMap(filters));
    const filterMap = validateAndBuildFilterMap(columns, filters, 'exprOfLut', enhanced);
    const built = buildFilteredOutputsByMinterm(lutInst, columns, filterMap);
    labels = built.labels;
    outputCols = built.outputCols || built.outputsByBit.map(bools => ({ kind: 'binary', bools }));
    depth = built.depth;
  } else {
    throw new Error('exprOfLut: supply variables or use a LUT with filters: attribute');
  }

  const segmentsShort = [];
  const segmentsStd = [];

  for (let b = 0; b < depth; b++) {
    const seg = segmentsFromOutputColumn(labels, outputCols[b], minimizeFn);
    segmentsShort.push(seg.short);
    segmentsStd.push(seg.std);
  }

  return { depth, segmentsShort, segmentsStd, columns, widthResolver };
}

function exprOfLutBuild(lutInst, varSpecs, widthResolver) {
  const { depth, segmentsStd } = exprOfLutBuildCore(lutInst, varSpecs, widthResolver);
  let stdExpr;
  if (depth === 1) {
    stdExpr = segmentsStd[0];
  } else {
    stdExpr = formatMultiBitStandard(segmentsStd);
  }
  return { depth, stdExpr };
}

function exprOfLutGenerate(lutInst, varSpecs, widthResolver) {
  const { depth, segmentsShort, segmentsStd, columns, widthResolver: wr } = exprOfLutBuildCore(lutInst, varSpecs, widthResolver);
  const wireWidths = columns ? buildWireWidthMap(columns, wr || widthResolver) : null;

  const outType = `${depth}wire`;
  let shortExpr;
  let stdExpr;
  if (depth === 1) {
    shortExpr = segmentsShort[0];
    stdExpr = segmentsStd[0];
  } else {
    const fin = finalizeMultiBitExpressions(segmentsStd, segmentsShort, wireWidths);
    shortExpr = fin.short;
    stdExpr = fin.std;
  }

  return [
    `${outType} out = \`${shortExpr}\``,
    `${outType} out = ${stdExpr}`
  ];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bitIndexWidth,
    lutAddrBits,
    discoverLutOfInputs,
    discoverColumnsForAnalysis,
    buildFilterWidthMap,
    makeAnalysisWidthResolver,
    mergeDiscoveredColumns,
    countFullTableRows,
    assertTableRowsWithinLimit,
    assertInputWidthWithinLimit,
    validateAndBuildFilterMap,
    countRowsToGenerate,
    rowMatchesFilters,
    enumerateFilteredEnvs,
    collectFilteredRows,
    columnsToInputLabels,
    evalBooleanParts,
    addrBitsToColumns,
    computeSyntacticCost,
    costFromMinimized,
    formatMinimizedShort,
    formatMinimizedStandard,
    formatMultiBitShort,
    formatMultiBitStandard,
    lutOfGenerate,
    lutOfBuild,
    formatInlineLutText,
    isLutOfBodyRaw,
    parseLutOfFromSource,
    parseStdExprToAst,
    expandExprOfLutVars,
    exprOfLutBuild,
    exprOfLutBuildCore,
    exprOfLutGenerate,
    BOOLEAN_ANALYSIS_MAX_TABLE_ROWS,
    BOOLEAN_ANALYSIS_TABLE_TOO_BIG_ERR,
    BOOLEAN_ANALYSIS_MAX_INPUT_BITS,
    BOOLEAN_ANALYSIS_TOO_WIDE_ERR,
    LUT_TOO_BIG_ERR
  };
}
