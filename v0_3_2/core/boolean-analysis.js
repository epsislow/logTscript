/* ================= BOOLEAN ANALYSIS — truthTableOf / simplify / equivalent / inputsOf / costOf ================= */

function truthTableOfGenerate(exprAst, widthResolver, filters) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  const filterMap = validateAndBuildFilterMap(columns, filters, 'truthTableOf', widthResolver);
  const envs = enumerateFilteredEnvs(columns, filterMap);
  assertTableRowsWithinLimit(envs.length);

  const lines = [];
  lines.push(columns.map(c => c.key).join(' ') + ' | OUT');
  lines.push('--------------');

  for (const env of envs) {
    const result = evalBooleanParts(exprAst, env, widthResolver);
    const cells = columns.map(c => env[c.key]);
    lines.push(cells.join(' ') + ' | ' + result);
  }
  return lines;
}

function inputsOfGenerate(exprAst, widthResolver) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  const keyWidth = Math.max(6, ...columns.map(c => c.key.length));
  return columns.map(c => `${c.key.padEnd(keyWidth)} ${c.width}b`);
}

function minimizeExprOutputs(exprAst, columns, widthResolver, filters) {
  const filterMap = filters && filters.length > 0
    ? validateAndBuildFilterMap(columns, filters, 'simplify', widthResolver)
    : null;
  const { rows, outWidth } = collectFilteredRows(exprAst, columns, widthResolver, filterMap);
  const minimizeFn = typeof minimizeBoolean === 'function' ? minimizeBoolean : null;
  if (!minimizeFn) throw new Error('boolean-minimize.js is not loaded');

  let labels;
  let outputCols;

  if (filterMap) {
    labels = varyingBitLabels(columns, filterMap);
    const numVars = labels.length;
    if (numVars > BOOLEAN_ANALYSIS_MAX_INPUT_BITS) {
      throw new Error(BOOLEAN_ANALYSIS_TOO_WIDE_ERR);
    }

    if (numVars === 0) {
      const cols = [];
      for (let b = 0; b < outWidth; b++) {
        const chars = rows.map(row => row.output.padStart(outWidth, '0')[b]);
        cols.push(classifyOutputColumn(chars));
      }
      outputCols = cols;
    } else {
      const tableSize = 1 << numVars;
      const assigned = [];
      for (let b = 0; b < outWidth; b++) assigned.push(new Array(tableSize).fill(null));

      for (const row of rows) {
        const varyingBits = extractVaryingBitsFromEnv(row.env, columns, filterMap);
        const mintermIdx = parseInt(varyingBits, 2);
        if (isNaN(mintermIdx) || mintermIdx < 0 || mintermIdx >= tableSize) {
          throw new Error(`simplify: invalid varying bits '${varyingBits}'`);
        }
        const padded = row.output.padStart(outWidth, '0');
        for (let b = 0; b < outWidth; b++) {
          const ch = padded[b];
          const prev = assigned[b][mintermIdx];
          if (prev !== null && prev !== ch) {
            throw new Error(`simplify: conflicting output at minterm ${varyingBits}`);
          }
          assigned[b][mintermIdx] = ch;
        }
      }

      outputCols = [];
      for (let b = 0; b < outWidth; b++) {
        const chars = assigned[b].map(v => (v === null ? '0' : v));
        outputCols.push(classifyOutputColumn(chars));
      }
    }
  } else {
    labels = columnsToInputLabels(columns);
    outputCols = [];
    for (let b = 0; b < outWidth; b++) {
      const chars = rows.map(row => row.output.padStart(outWidth, '0')[b]);
      outputCols.push(classifyOutputColumn(chars));
    }
  }

  const mins = outputCols.map(col => {
    if (col.kind === 'uniform') {
      const v = col.value;
      if (v === 'X' || v === 'Z') return { constant: v };
      return { constant: v === '1' };
    }
    return minimizeFn(labels, col.bools);
  });
  return { mins, outWidth };
}

function simplifyGenerate(exprAst, widthResolver, filters) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  if (!filters || filters.length === 0) {
    assertInputWidthWithinLimit(columns);
  }
  const { mins, outWidth } = minimizeExprOutputs(exprAst, columns, widthResolver, filters);

  const segmentsShort = mins.map(formatMinimizedShort);
  const segmentsStd = mins.map(formatMinimizedStandard);
  const outType = `${outWidth}wire`;
  let shortExpr;
  let stdExpr;
  if (outWidth === 1) {
    shortExpr = segmentsShort[0];
    stdExpr = segmentsStd[0];
  } else {
    shortExpr = formatMultiBitShort(segmentsShort);
    stdExpr = formatMultiBitStandard(segmentsStd);
  }
  return [
    `${outType} out = \`${shortExpr}\``,
    `${outType} out = ${stdExpr}`
  ];
}

function equivalentGenerate(expr1Ast, expr2Ast, widthResolver) {
  const cols1 = discoverLutOfInputs(expr1Ast, widthResolver);
  const cols2 = discoverLutOfInputs(expr2Ast, widthResolver);
  const columns = mergeDiscoveredColumns(cols1, cols2);
  assertInputWidthWithinLimit(columns);

  const addrWidth = columns.reduce((s, c) => s + c.width, 0);
  const fullLength = 1 << addrWidth;

  for (let addr = 0; addr < fullLength; addr++) {
    const env = addrBitsToColumns(columns, addr);
    const r1 = evalBooleanParts(expr1Ast, env, widthResolver);
    const r2 = evalBooleanParts(expr2Ast, env, widthResolver);
    if (r1 !== r2) return ['false'];
  }
  return ['true'];
}

function costOfGenerate(exprAst, widthResolver) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  assertInputWidthWithinLimit(columns);

  const exprCost = computeSyntacticCost(exprAst, widthResolver);
  const { mins } = minimizeExprOutputs(exprAst, columns, widthResolver);
  let minCost = 0;
  for (const min of mins) minCost += costFromMinimized(min);

  const reduction = exprCost - minCost;
  let pct = 0;
  if (exprCost > 0) {
    pct = Math.round((reduction / exprCost) * 100);
  }

  return [
    `Expression cost: ${exprCost}`,
    `Minimized cost: ${minCost}`,
    `Reduction possible: ${reduction} (${pct}%)`
  ];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    truthTableOfGenerate,
    inputsOfGenerate,
    simplifyGenerate,
    equivalentGenerate,
    costOfGenerate
  };
}
