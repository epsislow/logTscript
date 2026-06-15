/* ================= BOOLEAN LUT — lutOf / exprOfLut ================= */

const BOOLEAN_OPS = new Set(['NOT', 'AND', 'OR', 'XOR', 'NXOR', 'NAND', 'NOR']);

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

function validateAndBuildFilterMap(columns, filters, contextName) {
  if (!filters || filters.length === 0) return null;
  const colByKey = new Map(columns.map(c => [c.key, c]));
  const map = new Map();
  for (const f of filters) {
    const key = filterSpecKey(f);
    if (!colByKey.has(key)) {
      throw new Error(`${contextName}: unknown filter column '${key}'`);
    }
    if (map.has(key)) {
      throw new Error(`${contextName}: duplicate filter for '${key}'`);
    }
    const col = colByKey.get(key);
    const pattern = String(f.pattern).toLowerCase();
    if (pattern.length !== col.width) {
      throw new Error(`${contextName}: pattern length mismatch for '${key}'`);
    }
    for (const ch of pattern) {
      if (ch !== '0' && ch !== '1' && ch !== 'x') {
        throw new Error(`${contextName}: invalid pattern character in '${key}=${f.pattern}'`);
      }
    }
    map.set(key, pattern);
  }
  return map;
}

function countRowsToGenerate(columns, filterMap) {
  let product = 1;
  for (const col of columns) {
    if (filterMap && filterMap.has(col.key)) {
      const p = filterMap.get(col.key);
      let combos = 1;
      for (const ch of p) if (ch === 'x') combos *= 2;
      product *= combos;
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
      if (p[i] === 'x') continue;
      if (val[i] !== p[i]) return false;
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
        if (pattern[i] === 'x') labels.push(bitLabels[i]);
      }
    }
  }
  return labels;
}

function replayFilteredEnvs(columns, filterMap) {
  const addrWidth = columns.reduce((s, c) => s + c.width, 0);
  const fullLength = 1 << addrWidth;
  const envs = [];
  for (let addr = 0; addr < fullLength; addr++) {
    const env = addrBitsToColumns(columns, addr);
    if (!rowMatchesFilters(columns, env, filterMap)) continue;
    envs.push(env);
  }
  return envs;
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
        if (pattern[i] === 'x') bits += val[i];
      }
    }
  }
  return bits;
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

  const tableSize = 1 << numVars;
  if (length !== tableSize) {
    throw new Error(`exprOfLut expects ${lutAddrBits(length)} input bits but received ${numVars}`);
  }

  const reindexed = [];
  for (let b = 0; b < depth; b++) reindexed.push(new Array(tableSize).fill(false));

  for (let rowIdx = 0; rowIdx < length; rowIdx++) {
    const varyingBits = extractVaryingBitsFromEnv(envs[rowIdx], columns, filterMap);
    const mintermIdx = parseInt(varyingBits, 2);
    if (isNaN(mintermIdx) || mintermIdx < 0 || mintermIdx >= tableSize) {
      throw new Error(`exprOfLut: invalid varying bits '${varyingBits}' at row ${rowIdx}`);
    }
    for (let b = 0; b < depth; b++) {
      reindexed[b][mintermIdx] = outputsByBit[b][rowIdx];
    }
  }

  return { labels, outputsByBit: reindexed, depth, numVars };
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
  const addrWidth = columns.reduce((s, c) => s + c.width, 0);
  const rowsToGenerate = countRowsToGenerate(columns, filterMap);
  assertTableRowsWithinLimit(rowsToGenerate);

  const fullLength = 1 << addrWidth;
  const rows = [];
  let outWidth = 1;

  for (let addr = 0; addr < fullLength; addr++) {
    const env = addrBitsToColumns(columns, addr);
    if (!rowMatchesFilters(columns, env, filterMap)) continue;
    const result = evalBooleanParts(exprAst, env, widthResolver);
    if (rows.length === 0) outWidth = result.length;
    else if (result.length !== outWidth) {
      throw new Error('lutOf: inconsistent output width');
    }
    rows.push({ env, output: result });
  }
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
      v = v.split('').map(b => b === '1' ? '0' : '1').join('');
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
  if (min.terms.length === 0) return '0';
  if (min.terms.length === 1) return formatTermShort(min.terms[0]);
  return min.terms.map(t => `(${formatTermShort(t)})`).join(' | ');
}

function formatMinimizedStandard(min) {
  if (min.constant === false) return '0';
  if (min.constant === true) return '1';
  if (min.terms.length === 0) return '0';
  if (min.terms.length === 1) return formatTermStandard(min.terms[0]);
  const inner = min.terms.map(t => formatTermStandard(t)).join(', ');
  return `OR(${inner})`;
}

const LUT_OF_INLINE_NAME = '.generated';

function lutOfGenerate(exprAst, widthResolver, filters) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  const filterMap = validateAndBuildFilterMap(columns, filters, 'lutOf');
  const { rows, addrWidth, outWidth } = collectFilteredRows(exprAst, columns, widthResolver, filterMap);

  const description = `${columns.map(c => c.header).join(', ')} -> out ${outWidth}b`;
  const inner = [`description: ${description}`];
  if (filters && filters.length > 0) {
    inner.push(`filters: ${formatFiltersAttribute(filters)}`);
  }

  const length = filterMap ? rows.length : (1 << addrWidth);
  const addrPad = filterMap ? bitIndexWidth(length) : addrWidth;

  inner.push('', `depth: ${outWidth}`, `length: ${length}`, 'data {');
  for (let i = 0; i < rows.length; i++) {
    const addrStr = filterMap
      ? i.toString(2).padStart(addrPad, '0')
      : i.toString(2).padStart(addrPad, '0');
    inner.push(`  ${addrStr} : ${rows[i].output}`);
  }
  inner.push('}');

  const lines = [`inline [lut] ${LUT_OF_INLINE_NAME}:`];
  for (const line of inner) {
    lines.push(line === '' ? '' : `  ${line}`);
  }
  lines.push(':');
  return lines.join('\n');
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

function exprOfLutGenerate(lutInst, varSpecs, widthResolver) {
  const attrs = lutInst.attributes || {};
  let labels;
  let outputsByBit;
  let depth;

  if (varSpecs.length > 0 && attrs.filters && attrs.description) {
    const columns = parseLutDescriptionString(attrs.description);
    const filters = parseFiltersAttributeString(attrs.filters);
    const filterMap = validateAndBuildFilterMap(columns, filters, 'exprOfLut');
    const autoLabels = varyingBitLabels(columns, filterMap);
    const expanded = expandExprOfLutVars(varSpecs, widthResolver);
    if (!labelsMatch(expanded.labels, autoLabels)) {
      throw new Error(`exprOfLut: variables do not match LUT filters: expected [${autoLabels.join(', ')}]`);
    }
    const built = buildFilteredOutputsByMinterm(lutInst, columns, filterMap);
    labels = built.labels;
    outputsByBit = built.outputsByBit;
    depth = built.depth;
  } else if (varSpecs.length > 0) {
    const expanded = expandExprOfLutVars(varSpecs, widthResolver);
    labels = expanded.labels;
    const sumWidth = expanded.resolved.reduce((s, r) => s + r.width, 0);
    const extracted = extractLutOutputs(lutInst);
    depth = extracted.depth;
    outputsByBit = extracted.outputsByBit;
    const expected = lutAddrBits(extracted.length);
    if (sumWidth !== expected) {
      throw new Error(`exprOfLut expects ${expected} input bits but received ${sumWidth}`);
    }
  } else if (attrs.filters) {
    if (!attrs.description) {
      throw new Error('exprOfLut: LUT has filters: but no description: attribute');
    }
    const columns = parseLutDescriptionString(attrs.description);
    const filters = parseFiltersAttributeString(attrs.filters);
    const filterMap = validateAndBuildFilterMap(columns, filters, 'exprOfLut');
    const built = buildFilteredOutputsByMinterm(lutInst, columns, filterMap);
    labels = built.labels;
    outputsByBit = built.outputsByBit;
    depth = built.depth;
  } else {
    throw new Error('exprOfLut: supply variables or use a LUT with filters: attribute');
  }

  const minimizeFn = typeof minimizeBoolean === 'function' ? minimizeBoolean : null;
  if (!minimizeFn) throw new Error('boolean-minimize.js is not loaded');

  const segmentsShort = [];
  const segmentsStd = [];

  for (let b = 0; b < depth; b++) {
    const min = minimizeFn(labels, outputsByBit[b]);
    segmentsShort.push(formatMinimizedShort(min));
    segmentsStd.push(formatMinimizedStandard(min));
  }

  const outType = `${depth}wire`;
  let shortExpr;
  let stdExpr;
  if (depth === 1) {
    shortExpr = segmentsShort[0];
    stdExpr = segmentsStd[0];
  } else {
    shortExpr = segmentsShort.map(s => `(${s})`).join(' + ');
    stdExpr = segmentsStd.map(s => `(${s})`).join(' + ');
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
    mergeDiscoveredColumns,
    countFullTableRows,
    assertTableRowsWithinLimit,
    assertInputWidthWithinLimit,
    validateAndBuildFilterMap,
    countRowsToGenerate,
    rowMatchesFilters,
    collectFilteredRows,
    columnsToInputLabels,
    evalBooleanParts,
    addrBitsToColumns,
    computeSyntacticCost,
    costFromMinimized,
    formatMinimizedShort,
    formatMinimizedStandard,
    lutOfGenerate,
    expandExprOfLutVars,
    exprOfLutGenerate,
    BOOLEAN_ANALYSIS_MAX_TABLE_ROWS,
    BOOLEAN_ANALYSIS_TABLE_TOO_BIG_ERR,
    BOOLEAN_ANALYSIS_MAX_INPUT_BITS,
    BOOLEAN_ANALYSIS_TOO_WIDE_ERR,
    LUT_TOO_BIG_ERR
  };
}
