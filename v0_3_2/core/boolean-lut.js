/* ================= BOOLEAN LUT — lutOf / exprOfLut ================= */

const BOOLEAN_OPS = new Set(['NOT', 'AND', 'OR', 'XOR', 'NXOR', 'NAND', 'NOR']);
const LUT_ADDR_MAX_BITS = 8;
const LUT_TOO_BIG_ERR = 'LUT table too big (256 values), max bits number reached';

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
        bits = (((addr >> shift) & 1) ? '1' : '0') + bits;
        shift++;
      }
      env[col.key] = bits;
    }
  }
  return env;
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

function lutOfGenerate(exprAst, widthResolver) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  const addrWidth = columns.reduce((s, c) => s + c.width, 0);
  if (addrWidth > LUT_ADDR_MAX_BITS) throw new Error(LUT_TOO_BIG_ERR);

  const length = 1 << addrWidth;
  const outputs = [];
  let outWidth = 1;

  for (let addr = 0; addr < length; addr++) {
    const env = addrBitsToColumns(columns, addr);
    const result = evalBooleanParts(exprAst, env, widthResolver);
    if (addr === 0) outWidth = result.length;
    else if (result.length !== outWidth) {
      throw new Error('lutOf: inconsistent output width');
    }
    outputs.push(result);
  }

  const header = `# ${columns.map(c => c.header).join(', ')} -> out ${outWidth}b`;
  const inner = [header, '', `depth: ${outWidth}`, `length: ${length}`, 'data {'];

  const addrPad = addrWidth;
  for (let addr = 0; addr < length; addr++) {
    const addrStr = addr.toString(2).padStart(addrPad, '0');
    inner.push(`  ${addrStr} : ${outputs[addr]}`);
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
        for (let b = end; b >= start; b--) {
          labels.push(`${spec.name}.${b}`);
        }
      }
    } else if (width === 1) {
      labels.push(spec.name);
    } else {
      for (let b = width - 1; b >= 0; b--) {
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
  const { labels, resolved } = expandExprOfLutVars(varSpecs, widthResolver);
  const sumWidth = resolved.reduce((s, r) => s + r.width, 0);
  const { length, depth, outputsByBit } = extractLutOutputs(lutInst);
  const expected = lutAddrBits(length);

  if (sumWidth !== expected) {
    throw new Error(`exprOfLut expects ${expected} input bits but received ${sumWidth}`);
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
    lutOfGenerate,
    expandExprOfLutVars,
    exprOfLutGenerate,
    LUT_TOO_BIG_ERR
  };
}
