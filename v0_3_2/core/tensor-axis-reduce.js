/**
 * Axis reductions (; row / ; col) on 2D matrices — SUM, MIN, MAX, ARGMAX, ARGMIN.
 */
(function (global) {
  'use strict';

  const VR = typeof LogTScriptVectorReduce !== 'undefined' ? LogTScriptVectorReduce : null;
  const MR = typeof LogTScriptMatrixReduce !== 'undefined' ? LogTScriptMatrixReduce : null;
  const TS = typeof LogTScriptTensorShape !== 'undefined' ? LogTScriptTensorShape : null;

  const AXIS_SCALAR_ERR = 'use scalar %s without col|row tag';

  function axisScalarErr(fnName) {
    return AXIS_SCALAR_ERR.replace('%s', fnName);
  }

  function requireAxisMatrixArg(args, getWire, fnName) {
    if (!args || args.length !== 1) {
      throw new Error(`${fnName}: with '; row' or '; col' expects 1 argument`);
    }
    if (!MR || !MR.isWholeTensorWireArg(args[0], getWire)) {
      throw new Error(`${fnName}: expects one whole tensor argument`);
    }
    const meta = TS.getWireTensorMeta(getWire(args[0][0].var));
    if (!meta || !TS.isMatrix(meta)) {
      throw new Error(axisScalarErr(fnName));
    }
    return { meta, varName: args[0][0].var };
  }

  function rowValues(meta, varName, row, evalFns) {
    const W = meta.elementWidth;
    const vals = [];
    for (let c = 0; c < meta.cols; c++) {
      vals.push(String(evalFns.evalCell(varName, row, c)).padStart(W, '0'));
    }
    return vals;
  }

  function colValues(meta, varName, col, evalFns) {
    const W = meta.elementWidth;
    const vals = [];
    for (let r = 0; r < meta.rows; r++) {
      vals.push(String(evalFns.evalCell(varName, r, col)).padStart(W, '0'));
    }
    return vals;
  }

  function pickMinMaxUnsigned(values, pickMin) {
    const w = VR.requireSameBitWidth(values, pickMin ? 'MIN' : 'MAX');
    let best = String(values[0]).padStart(w, '0');
    let bestN = VR.unsignedBinToBigInt(best);
    for (let i = 1; i < values.length; i++) {
      const s = String(values[i]).padStart(w, '0');
      const n = VR.unsignedBinToBigInt(s);
      if (pickMin ? n < bestN : n > bestN) {
        bestN = n;
        best = s;
      }
    }
    return best;
  }

  function sumAxisTagged(args, getWire, fnName, axis, signed, evalFns) {
    const { meta, varName } = requireAxisMatrixArg(args, getWire, fnName);
    const W = meta.elementWidth;
    const outer = axis === 'row' ? meta.rows : meta.cols;
    const results = [];
    const overs = [];
    for (let i = 0; i < outer; i++) {
      const vals = axis === 'row'
        ? rowValues(meta, varName, i, evalFns)
        : colValues(meta, varName, i, evalFns);
      const step = VR.sumExpanded(vals, W, signed);
      results.push(step.result);
      overs.push(step.over);
    }
    return { resultBlob: results.join(''), overBlob: overs.join('') };
  }

  function minMaxAxisTagged(args, getWire, fnName, axis, pickMin, signedOrMode, evalFns, pickMinMaxSigned) {
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    const { meta, varName } = requireAxisMatrixArg(args, getWire, fnName);
    const W = meta.elementWidth;
    const outer = axis === 'row' ? meta.rows : meta.cols;
    const results = [];
    for (let i = 0; i < outer; i++) {
      const vals = axis === 'row'
        ? rowValues(meta, varName, i, evalFns)
        : colValues(meta, varName, i, evalFns);
      const padded = vals.map((v) => String(v).padStart(W, '0'));
      let best;
      if (typeof signedOrMode === 'string' && NF && NF.isFormatMode(signedOrMode)) {
        best = NF.pickMinMax(padded, pickMin, signedOrMode);
      } else if (signedOrMode && pickMinMaxSigned) {
        best = pickMinMaxSigned(padded, pickMin);
      } else {
        best = pickMinMaxUnsigned(padded, pickMin);
      }
      results.push(best);
    }
    return results.join('');
  }

  function argExtremumAxisTagged(args, getWire, fnName, axis, pickMax, signed, indexMode, evalFns, compareFns) {
    const { meta, varName } = requireAxisMatrixArg(args, getWire, fnName);
    const W = meta.elementWidth;
    const { rows, cols } = meta;
    const compare = (a, b) => (signed && compareFns.signed
      ? compareFns.signed(a, b)
      : compareFns.unsigned(a, b));

    if (indexMode) {
      const outer = axis === 'row' ? rows : cols;
      const idxWidth = axis === 'row' ? cols : rows;
      const indices = [];
      for (let i = 0; i < outer; i++) {
        const vals = axis === 'row'
          ? rowValues(meta, varName, i, evalFns)
          : colValues(meta, varName, i, evalFns);
        const step = VR.findVectorExtremumIndex(vals, W, pickMax, signed, compareFns, fnName);
        indices.push(step.bestIdx);
      }
      return { indexMode: true, indices, idxWidth };
    }

    const bits = new Array(rows * cols).fill('0');
    if (axis === 'row') {
      for (let r = 0; r < rows; r++) {
        const vals = rowValues(meta, varName, r, evalFns);
        let bestC = 0;
        let best = String(vals[0]).padStart(W, '0');
        for (let c = 1; c < cols; c++) {
          const v = String(vals[c]).padStart(W, '0');
          const cmp = compare(v, best);
          const better = pickMax ? cmp > 0 : cmp < 0;
          if (better) {
            bestC = c;
            best = v;
          }
        }
        bits[r * cols + bestC] = '1';
      }
    } else {
      for (let c = 0; c < cols; c++) {
        const vals = colValues(meta, varName, c, evalFns);
        let bestR = 0;
        let best = String(vals[0]).padStart(W, '0');
        for (let r = 1; r < rows; r++) {
          const v = String(vals[r]).padStart(W, '0');
          const cmp = compare(v, best);
          const better = pickMax ? cmp > 0 : cmp < 0;
          if (better) {
            bestR = r;
            best = v;
          }
        }
        bits[bestR * cols + c] = '1';
      }
    }
    return { indexMode: false, oneHot: bits.join('') };
  }

  const api = {
    axisScalarErr,
    requireAxisMatrixArg,
    sumAxisTagged,
    minMaxAxisTagged,
    argExtremumAxisTagged,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptTensorAxisReduce = api;
})(typeof window !== 'undefined' ? window : global);
