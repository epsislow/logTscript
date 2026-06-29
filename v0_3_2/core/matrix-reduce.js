/**
 * Matrix-tagged built-in helpers (; matrix) — element-wise ops on 2D tensors.
 */
(function (global) {
  'use strict';

  const VR = typeof LogTScriptVectorReduce !== 'undefined' ? LogTScriptVectorReduce : null;
  const TS = typeof LogTScriptTensorShape !== 'undefined' ? LogTScriptTensorShape : null;

  const SHAPE_ERR =
    'matrix arguments must have compatible tensor shape; scalars must match element width W';

  function isReductionWireAtom(atom) {
    return VR && VR.isReductionWireAtom(atom);
  }

  function isWholeTensorWireArg(argExpr, getWire) {
    if (!argExpr || argExpr.length !== 1) return false;
    const a = argExpr[0];
    if (!isReductionWireAtom(a)) return false;
    if (a.vectorIndex !== undefined && a.vectorIndex !== null) return false;
    if (a.vectorIndexExpr) return false;
    if (a.bitRange) return false;
    if (a.tensorSlice || a.tensorRowIndex !== undefined || a.tensorColIndex !== undefined
        || a.tensorRowIndexExpr || a.tensorColIndexExpr) return false;
    const wire = getWire ? getWire(a.var) : null;
    if (!wire || !wire.vector) return false;
    const meta = TS ? TS.getWireTensorMeta(wire) : null;
    return !!(meta && meta.elementCount > 1);
  }

  function getTensorMeta(argExpr, getWire) {
    if (!isWholeTensorWireArg(argExpr, getWire)) return null;
    return TS.getWireTensorMeta(getWire(argExpr[0].var));
  }

  function classifyTensorOperand(argExpr, getWire) {
    if (!isWholeTensorWireArg(argExpr, getWire)) {
      return { kind: 'scalar' };
    }
    const meta = TS.getWireTensorMeta(getWire(argExpr[0].var));
    if (TS.isMatrix(meta)) return { kind: 'matrix', meta };
    if (meta.rows === 1 && meta.cols > 1) return { kind: 'row', meta };
    if (meta.cols === 1 && meta.rows > 1) return { kind: 'col', meta };
    return { kind: 'vector', meta };
  }

  function requireMatrixTaggedOperands(args, getWire, fnName, minArgs) {
    const n = minArgs != null ? minArgs : 2;
    if (!args || args.length < n) {
      throw new Error(`${fnName}: with '; matrix' expects at least ${n} arguments`);
    }
    const classified = [];
    let matrixMeta = null;
    let hasMatrix = false;
    for (let i = 0; i < args.length; i++) {
      const c = classifyTensorOperand(args[i], getWire);
      classified.push({ argIndex: i, kind: c.kind, meta: c.meta || null });
      if (c.kind === 'matrix') {
        hasMatrix = true;
        if (!matrixMeta) matrixMeta = c.meta;
        else if (c.meta.rows !== matrixMeta.rows || c.meta.cols !== matrixMeta.cols
                 || c.meta.elementWidth !== matrixMeta.elementWidth) {
          throw new Error(`${fnName}: ${SHAPE_ERR}`);
        }
      }
    }
    if (!hasMatrix) {
      throw new Error(`${fnName}: remove '; matrix' — no argument is a matrix`);
    }
    return { classified, meta: matrixMeta };
  }

  function requireValuesWidth(values, W, fnName) {
    for (const v of values) {
      const s = v == null ? '' : String(v);
      if (s.length !== W) {
        throw new Error(`${fnName}: ${SHAPE_ERR}`);
      }
    }
  }

  function valueAtCell(kind, argExpr, row, col, matrixMeta, evalFns) {
    if (kind === 'scalar') {
      return evalFns.evalScalar(argExpr);
    }
    const varName = argExpr[0].var;
    if (kind === 'matrix') {
      return evalFns.evalCell(varName, row, col);
    }
    if (kind === 'row') {
      return evalFns.evalCell(varName, 0, col);
    }
    if (kind === 'col') {
      return evalFns.evalCell(varName, row, 0);
    }
    const idx = row * matrixMeta.cols + col;
    return evalFns.evalElement(varName, idx);
  }

  function cellValuesAt(args, classified, row, col, matrixMeta, evalFns) {
    const values = [];
    for (const c of classified) {
      values.push(valueAtCell(c.kind, args[c.argIndex], row, col, matrixMeta, evalFns));
    }
    return values;
  }

  function forEachMatrixCell(meta, fn) {
    for (let r = 0; r < meta.rows; r++) {
      for (let c = 0; c < meta.cols; c++) {
        fn(r, c);
      }
    }
  }

  function sumMatrixTagged(args, getWire, fnName, signed, evalFns) {
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const results = [];
    const overs = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const padded = vals.map((v) => String(v).padStart(W, '0'));
      const step = VR.sumExpanded(padded, W, signed);
      results.push(step.result);
      overs.push(step.over);
    });
    return { resultBlob: results.join(''), overBlob: overs.join('') };
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

  function minMaxMatrixTagged(args, getWire, fnName, pickMin, signed, evalFns, pickMinMaxSigned) {
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const results = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const padded = vals.map((v) => String(v).padStart(W, '0'));
      const best = signed && pickMinMaxSigned
        ? pickMinMaxSigned(padded, pickMin)
        : pickMinMaxUnsigned(padded, pickMin);
      results.push(best);
    });
    return results.join('');
  }

  function addSubtractMatrixTagged(args, getWire, fnName, evalFns, applyAtWidth) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const results = [];
    const flags = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const step = applyAtWidth(String(vals[0]).padStart(W, '0'), String(vals[1]).padStart(W, '0'), W);
      results.push(step.result);
      flags.push(String(step.flag).padStart(W, '0'));
    });
    return { resultBlob: results.join(''), flagBlob: flags.join('') };
  }

  function multiplyMatrixTagged(args, getWire, fnName, signed, evalFns, multiplyAtWidthFn) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const results = [];
    const overs = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const step = multiplyAtWidthFn(
        String(vals[0]).padStart(W, '0'),
        String(vals[1]).padStart(W, '0'),
        W,
        signed
      );
      results.push(step.result);
      overs.push(step.over);
    });
    return { resultBlob: results.join(''), overBlob: overs.join('') };
  }

  function macMatrixTagged(args, getWire, fnName, signed, evalFns, macFn) {
    if (args.length !== 3) {
      throw new Error(`${fnName}: expects 3 arguments`);
    }
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName, 3);
    const W = meta.elementWidth;
    const results = [];
    const overs = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const step = macFn(
        String(vals[0]).padStart(W, '0'),
        String(vals[1]).padStart(W, '0'),
        String(vals[2]).padStart(W, '0'),
        signed
      );
      results.push(step.result);
      overs.push(step.over);
    });
    return { resultBlob: results.join(''), overBlob: overs.join('') };
  }

  function divideMatrixTagged(args, getWire, fnName, signed, evalFns, divideFn) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const results = [];
    const mods = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const step = divideFn(String(vals[0]).padStart(W, '0'), String(vals[1]).padStart(W, '0'), W, signed);
      results.push(step.result);
      mods.push(step.mod);
    });
    return { resultBlob: results.join(''), modBlob: mods.join('') };
  }

  function clampMatrixTagged(args, getWire, fnName, evalFns, clampAtWidth) {
    if (args.length !== 3) {
      throw new Error(`${fnName}: expects 3 arguments`);
    }
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName, 3);
    const W = meta.elementWidth;
    const results = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      results.push(clampAtWidth(
        String(vals[0]).padStart(W, '0'),
        String(vals[1]).padStart(W, '0'),
        String(vals[2]).padStart(W, '0')
      ));
    });
    return results.join('');
  }

  function compareMatrixTagged(args, getWire, fnName, op, signed, evalFns, compareFns) {
    if (args.length !== 2) {
      throw new Error(`${fnName}: expects 2 arguments`);
    }
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName);
    const W = meta.elementWidth;
    const bits = [];
    forEachMatrixCell(meta, (r, c) => {
      const vals = cellValuesAt(args, classified, r, c, meta, evalFns);
      requireValuesWidth(vals, W, fnName);
      const a = String(vals[0]).padStart(W, '0');
      const b = String(vals[1]).padStart(W, '0');
      if (op === 'EQ') {
        bits.push(a === b ? '1' : '0');
      } else {
        const cmp = signed && compareFns.signed
          ? compareFns.signed(a, b)
          : compareFns.unsigned(a, b);
        if (op === 'GT') bits.push(cmp > 0 ? '1' : '0');
        else if (op === 'LT') bits.push(cmp < 0 ? '1' : '0');
      }
    });
    return bits.join('');
  }

  function shiftMatrixTagged(args, getWire, fnName, op, signed, evalFns, shiftFns) {
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName, 2);
    const W = meta.elementWidth;
    const results = [];
    const scalarCount = classified[1].kind === 'scalar'
      ? parseInt(String(evalFns.evalScalar(args[1])), 2) || 0
      : null;
    const fill = args.length === 3
      ? String(evalFns.evalScalar(args[2]))[0] || '0'
      : '0';
    forEachMatrixCell(meta, (r, c) => {
      const dataVal = String(valueAtCell(
        classified[0].kind, args[0], r, c, meta, evalFns
      )).padStart(W, '0');
      if (dataVal.length !== W) throw new Error(`${fnName}: ${SHAPE_ERR}`);
      let n = scalarCount;
      if (classified[1].kind !== 'scalar') {
        const countVal = valueAtCell(classified[1].kind, args[1], r, c, meta, evalFns);
        n = parseInt(String(countVal), 2) || 0;
      }
      let out;
      if (op === 'LSHIFT') {
        out = shiftFns.lshift(dataVal, n, fill);
      } else if (signed && shiftFns.arithmeticRshift) {
        out = shiftFns.arithmeticRshift(dataVal, n);
      } else {
        out = shiftFns.rshift(dataVal, n, fill);
      }
      results.push(out);
    });
    return results.join('');
  }

  function rotateMatrixTagged(args, getWire, fnName, op, evalFns) {
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName, 2);
    const W = meta.elementWidth;
    const results = [];
    forEachMatrixCell(meta, (r, c) => {
      const dataVal = String(valueAtCell(
        classified[0].kind, args[0], r, c, meta, evalFns
      )).padStart(W, '0');
      const countVal = valueAtCell(classified[1].kind, args[1], r, c, meta, evalFns);
      const out = op === 'LROTATE'
        ? VR.rotateLeft(dataVal, countVal)
        : VR.rotateRight(dataVal, countVal);
      results.push(out);
    });
    return results.join('');
  }

  function reverseMatrixTagged(args, getWire, fnName, evalFns) {
    const { classified, meta } = requireMatrixTaggedOperands(args, getWire, fnName, 1);
    if (classified[0].kind !== 'matrix') {
      throw new Error(`${fnName}: with '; matrix' expects a matrix operand`);
    }
    const W = meta.elementWidth;
    const varName = args[0][0].var;
    const results = [];
    forEachMatrixCell(meta, (r, c) => {
      const dataVal = String(evalFns.evalCell(varName, r, c)).padStart(W, '0');
      results.push(VR.reverseBitsString(dataVal));
    });
    return results.join('');
  }

  function getWholeTensorMeta(argExpr, getWire) {
    return getTensorMeta(argExpr, getWire);
  }

  function resolveDotMatrixShape(metaA, metaB) {
    if (metaA.rows === 1 && metaA.cols > 1 && metaB.rows === 1 && metaB.cols > 1
        && metaA.cols === metaB.cols) {
      return { outRows: 1, outCols: 1, innerK: metaA.cols };
    }
    if (metaA.cols === 1 && metaA.rows > 1 && metaB.rows === 1 && metaB.cols > 1
        && metaA.rows === metaB.cols) {
      return { outRows: 1, outCols: 1, innerK: metaA.rows };
    }
    if (metaA.rows === 1 && metaA.cols > 1 && metaB.cols === 1 && metaB.rows > 1
        && metaA.cols === metaB.rows) {
      return { outRows: 1, outCols: metaB.cols, innerK: metaA.cols };
    }
    if (metaA.cols === 1 && metaA.rows > 1 && metaB.cols > 1 && metaB.rows > 1
        && metaA.rows === metaB.rows) {
      return { outRows: metaA.rows, outCols: metaB.cols, innerK: metaA.rows };
    }
    if (metaA.cols > 1 && metaA.rows > 1 && metaB.cols > 1 && metaB.rows > 1
        && metaA.cols === metaB.rows) {
      return { outRows: metaA.rows, outCols: metaB.cols, innerK: metaA.cols };
    }
    return null;
  }

  function dotMatrixMultiply(args, getWire, signed, evalFns) {
    if (!args || args.length !== 2) {
      throw new Error('DOT: expects 2 arguments');
    }
    if (!isWholeTensorWireArg(args[0], getWire) || !isWholeTensorWireArg(args[1], getWire)) {
      throw new Error('DOT: expects two whole tensor arguments');
    }
    const metaA = TS.getWireTensorMeta(getWire(args[0][0].var));
    const metaB = TS.getWireTensorMeta(getWire(args[1][0].var));
    const W = metaA.elementWidth;
    if (metaB.elementWidth !== W) {
      throw new Error('DOT: operand element widths must match');
    }
    const varA = args[0][0].var;
    const varB = args[1][0].var;

    const resolved = resolveDotMatrixShape(metaA, metaB);
    if (!resolved) {
      const shapeKey = `${metaA.rows},${metaA.cols}x${metaB.rows},${metaB.cols}`;
      throw new Error(`DOT: incompatible tensor shapes [${metaA.rows},${metaA.cols}] x [${metaB.rows},${metaB.cols}] (${shapeKey})`);
    }
    const { outRows, outCols, innerK } = resolved;

    const results = [];
    const overs = [];
    for (let i = 0; i < outRows; i++) {
      for (let j = 0; j < outCols; j++) {
        const aVals = [];
        const bVals = [];
        for (let k = 0; k < innerK; k++) {
          let ar, ac, br, bc;
          if (outRows === 1 && outCols === 1) {
            if (metaA.rows === 1) { ar = 0; ac = k; } else { ar = k; ac = 0; }
            if (metaB.rows === 1) { br = 0; bc = k; } else { br = k; bc = 0; }
          } else if (outRows === 1 && outCols > 1) {
            ar = 0; ac = k; br = k; bc = j;
          } else if (outCols === 1 && outRows > 1) {
            ar = i; ac = k; br = k; bc = 0;
          } else {
            ar = i; ac = k; br = k; bc = j;
          }
          aVals.push(evalFns.evalCell(varA, ar, ac));
          bVals.push(evalFns.evalCell(varB, br, bc));
        }
        const step = VR.dotExpanded(aVals, bVals, W, signed);
        results.push(step.result);
        overs.push(step.over);
      }
    }
    return {
      resultBlob: results.join(''),
      overBlob: overs.join(''),
      outRows,
      outCols,
      elementWidth: W,
    };
  }

  function argExtremumFromWholeMatrix(args, getWire, fnName, pickMax, signed, evalFns, compareFns) {
    if (!args || args.length !== 1) {
      throw new Error(`${fnName}: expects 1 argument`);
    }
    if (!isWholeTensorWireArg(args[0], getWire)) {
      return null;
    }
    const meta = TS.getWireTensorMeta(getWire(args[0][0].var));
    if (!TS.isMatrix(meta)) {
      return null;
    }
    const W = meta.elementWidth;
    const varName = args[0][0].var;
    let bestR = 0;
    let bestC = 0;
    let best = String(evalFns.evalCell(varName, 0, 0)).padStart(W, '0');
    for (let r = 0; r < meta.rows; r++) {
      for (let c = 0; c < meta.cols; c++) {
        const v = String(evalFns.evalCell(varName, r, c)).padStart(W, '0');
        if (v.length !== W) throw new Error(`${fnName}: ${SHAPE_ERR}`);
        const cmp = signed && compareFns.signed
          ? compareFns.signed(v, best)
          : compareFns.unsigned(v, best);
        const better = pickMax ? cmp > 0 : cmp < 0;
        if (better) {
          bestR = r;
          bestC = c;
          best = v;
        }
      }
    }
    let oneHot = '';
    for (let r = 0; r < meta.rows; r++) {
      for (let c = 0; c < meta.cols; c++) {
        oneHot += (r === bestR && c === bestC) ? '1' : '0';
      }
    }
    return {
      bestRow: bestR,
      bestCol: bestC,
      oneHot,
      rows: meta.rows,
      cols: meta.cols,
      elementCount: meta.rows * meta.cols,
      elementWidth: W,
      isMatrix: true,
    };
  }

  const api = {
    isWholeTensorWireArg,
    getWholeTensorMeta,
    classifyTensorOperand,
    requireMatrixTaggedOperands,
    sumMatrixTagged,
    minMaxMatrixTagged,
    addSubtractMatrixTagged,
    multiplyMatrixTagged,
    macMatrixTagged,
    divideMatrixTagged,
    clampMatrixTagged,
    compareMatrixTagged,
    shiftMatrixTagged,
    rotateMatrixTagged,
    reverseMatrixTagged,
    dotMatrixMultiply,
    resolveDotMatrixShape,
    argExtremumFromWholeMatrix,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptMatrixReduce = api;
})(typeof window !== 'undefined' ? window : global);
