/* ================= BOOLEAN ANALYSIS — truthTableOf / simplify / equivalent / inputsOf / costOf ================= */

function truthTableOfGenerate(exprAst, widthResolver, filters) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  const filterMap = validateAndBuildFilterMap(columns, filters, 'truthTableOf');
  const addrWidth = columns.reduce((s, c) => s + c.width, 0);
  const rowsToGenerate = countRowsToGenerate(columns, filterMap);
  assertTableRowsWithinLimit(rowsToGenerate);

  const lines = [];
  lines.push(columns.map(c => c.key).join(' ') + ' | OUT');
  lines.push('--------------');

  const fullLength = 1 << addrWidth;
  for (let addr = 0; addr < fullLength; addr++) {
    const env = addrBitsToColumns(columns, addr);
    if (!rowMatchesFilters(columns, env, filterMap)) continue;
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

function minimizeExprOutputs(exprAst, columns, widthResolver) {
  const filterMap = null;
  const { rows, outWidth } = collectFilteredRows(exprAst, columns, widthResolver, filterMap);
  const labels = columnsToInputLabels(columns);
  const minimizeFn = typeof minimizeBoolean === 'function' ? minimizeBoolean : null;
  if (!minimizeFn) throw new Error('boolean-minimize.js is not loaded');

  const outputsByBit = [];
  for (let b = 0; b < outWidth; b++) outputsByBit.push([]);
  for (const row of rows) {
    const padded = row.output.padStart(outWidth, '0');
    for (let b = 0; b < outWidth; b++) {
      outputsByBit[b].push(padded[b] === '1');
    }
  }

  const mins = [];
  for (let b = 0; b < outWidth; b++) {
    mins.push(minimizeFn(labels, outputsByBit[b]));
  }
  return { mins, outWidth };
}

function simplifyGenerate(exprAst, widthResolver) {
  const columns = discoverLutOfInputs(exprAst, widthResolver);
  assertInputWidthWithinLimit(columns);
  const { mins, outWidth } = minimizeExprOutputs(exprAst, columns, widthResolver);

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
