/**
 * Tensor built-in helpers (IDENTITY, ZEROS, DIAG, OUTER, …) — context and validation.
 */
(function (global) {
  'use strict';

  const TS = typeof LogTScriptTensorShape !== 'undefined' ? LogTScriptTensorShape : null;
  const MR = typeof LogTScriptMatrixReduce !== 'undefined' ? LogTScriptMatrixReduce : null;
  const VR = typeof LogTScriptVectorReduce !== 'undefined' ? LogTScriptVectorReduce : null;

  function isWholeTensorArg(argExpr, getWire) {
    return MR && MR.isWholeTensorWireArg(argExpr, getWire);
  }

  function isWholeVectorArg(argExpr, getWire) {
    return VR && VR.isWholeVectorWireArg(argExpr, getWire);
  }

  function getTensorMetaFromArg(argExpr, getWire) {
    if (!isWholeTensorArg(argExpr, getWire)) return null;
    return TS.getWireTensorMeta(getWire(argExpr[0].var));
  }

  function getVectorMetaFromArg(argExpr, getWire) {
    if (!isWholeVectorArg(argExpr, getWire)) return null;
    return TS.getWireTensorMeta(getWire(argExpr[0].var));
  }

  function resolveAssignTargetMeta(interp) {
    const s = interp.currentStmt;
    if (!s) return null;
    let wireType = null;
    let rows = null;
    let cols = null;

    if (s.decls) {
      for (const d of s.decls) {
        if (!d.type || !interp.isWire(d.type)) continue;
        if (d.name === '_' || d.name === '~' || d.name === '%' || d.name === '$') continue;
        wireType = d.type;
        const dims = TS ? TS.normalizeDeclTensor(d) : null;
        if (dims) {
          rows = dims.rows;
          cols = dims.cols;
        }
        break;
      }
    }
    if ((rows == null || cols == null) && s.assignment && s.assignment.target) {
      const wire = interp.wires.get(s.assignment.target.var);
      if (wire) {
        wireType = wire.type;
        const meta = interp.getWireTensorMeta(wire);
        if (meta) {
          rows = meta.rows;
          cols = meta.cols;
        }
      }
    }
    if (!wireType || rows == null || cols == null) return null;
    const ew = interp.getBitWidth(wireType);
    if (!ew) return null;
    return { rows, cols, ew, elementWidth: ew };
  }

  function resolveSquareContext(interp) {
    const ctx = resolveAssignTargetMeta(interp);
    if (!ctx || ctx.rows !== ctx.cols) return null;
    return { n: ctx.rows, ew: ctx.ew, rows: ctx.rows, cols: ctx.cols };
  }

  function resolveVectorContext(interp) {
    const ctx = resolveAssignTargetMeta(interp);
    if (!ctx) return null;
    if (ctx.rows === 1 && ctx.cols > 1) {
      return { n: ctx.cols, ew: ctx.ew };
    }
    if (ctx.cols === 1 && ctx.rows > 1) {
      return { n: ctx.rows, ew: ctx.ew };
    }
    return null;
  }

  function readWholeTensorValue(argExpr, getWire, evalScalar) {
    const meta = getTensorMetaFromArg(argExpr, getWire);
    if (!meta) return null;
    const varName = argExpr[0].var;
    const ew = meta.elementWidth;
    const cells = [];
    for (let r = 0; r < meta.rows; r++) {
      for (let c = 0; c < meta.cols; c++) {
        cells.push(String(evalScalar({
          var: varName,
          tensorSlice: 'cell',
          tensorRowIndex: r,
          tensorColIndex: c
        })).padStart(ew, '0'));
      }
    }
    return { meta, blob: cells.join(''), cells };
  }

  function readWholeVectorValues(argExpr, getWire, evalElement) {
    const meta = getVectorMetaFromArg(argExpr, getWire);
    if (!meta) return null;
    const varName = argExpr[0].var;
    const n = meta.elementCount;
    const ew = meta.elementWidth;
    const vals = [];
    for (let i = 0; i < n; i++) {
      vals.push(String(evalElement(varName, i)).padStart(ew, '0'));
    }
    return { meta, vals, n, ew };
  }

  function readVerticalVectorValues(argExpr, getWire, evalCell) {
    const meta = getTensorMetaFromArg(argExpr, getWire);
    if (!meta || meta.cols !== 1 || meta.rows < 1) return null;
    const varName = argExpr[0].var;
    const vals = [];
    for (let r = 0; r < meta.rows; r++) {
      vals.push(String(evalCell(varName, r, 0)).padStart(meta.elementWidth, '0'));
    }
    return { meta, vals, n: meta.rows, ew: meta.elementWidth };
  }

  function readHorizontalVectorValues(argExpr, getWire, evalCell) {
    const meta = getTensorMetaFromArg(argExpr, getWire);
    if (!meta || meta.rows !== 1 || meta.cols < 1) return null;
    const varName = argExpr[0].var;
    const vals = [];
    for (let c = 0; c < meta.cols; c++) {
      vals.push(String(evalCell(varName, 0, c)).padStart(meta.elementWidth, '0'));
    }
    return { meta, vals, n: meta.cols, ew: meta.elementWidth };
  }

  function resolveOuterShapes(metaA, metaB) {
    if (metaA.rows > 1 && metaA.cols === 1 && metaB.rows === 1 && metaB.cols > 1) {
      return { outRows: metaA.rows, outCols: metaB.cols, vertMeta: metaA, horizMeta: metaB };
    }
    if (metaA.rows === 1 && metaA.cols > 1 && metaB.rows > 1 && metaB.cols === 1) {
      return { outRows: metaB.rows, outCols: metaA.cols, vertMeta: metaB, horizMeta: metaA };
    }
    return null;
  }

  function resolveCatShapes(metaA, metaB) {
    if (metaA.rows === metaB.rows && metaA.rows >= 1) {
      return {
        mode: 'horizontal',
        outRows: metaA.rows,
        outCols: metaA.cols + metaB.cols,
      };
    }
    if (metaA.cols === metaB.cols && metaA.cols >= 1) {
      return {
        mode: 'vertical',
        outRows: metaA.rows + metaB.rows,
        outCols: metaA.cols,
      };
    }
    return null;
  }

  function expectedPivotTarget(meta) {
    if (!meta) return null;
    return { rows: meta.cols, cols: meta.rows };
  }

  function resolveRepeatOutputShape(srcWire, srcMeta) {
    const TS = typeof LogTScriptTensorShape !== 'undefined' ? LogTScriptTensorShape : null;
    if (!srcMeta || !TS) {
      return { kind: 'plain' };
    }
    if (TS.isMatrix(srcMeta)) {
      return { kind: 'error', message: 'Cannot repeat matrix' };
    }
    const singleDim = !!(srcWire && srcWire.tensor && srcWire.tensor.singleDim);
    if (srcMeta.rows > 1 && srcMeta.cols === 1) {
      return { kind: 'tensor', rows: srcMeta.rows, cols: null, mode: 'column' };
    }
    if (srcMeta.rows === 1 && srcMeta.cols > 1) {
      if (singleDim) {
        return { kind: 'tensor', rows: srcMeta.cols, cols: null, mode: 'singleDim' };
      }
      return { kind: 'tensor', rows: null, cols: srcMeta.cols, mode: 'row' };
    }
    if (srcMeta.elementCount > 1) {
      return { kind: 'tensor', rows: srcMeta.cols, cols: null, mode: 'singleDim' };
    }
    return { kind: 'plain' };
  }

  function finalizeRepeatShape(shape, times) {
    const T = times | 0;
    if (!shape || shape.kind !== 'tensor') return shape;
    if (shape.mode === 'row') {
      return { kind: 'tensor', rows: T, cols: shape.cols };
    }
    return { kind: 'tensor', rows: shape.rows, cols: T };
  }

  const api = {
    isWholeTensorArg,
    isWholeVectorArg,
    getTensorMetaFromArg,
    getVectorMetaFromArg,
    resolveAssignTargetMeta,
    resolveSquareContext,
    resolveVectorContext,
    readWholeTensorValue,
    readWholeVectorValues,
    readVerticalVectorValues,
    readHorizontalVectorValues,
    resolveOuterShapes,
    resolveCatShapes,
    expectedPivotTarget,
    resolveRepeatOutputShape,
    finalizeRepeatShape,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptTensorBuiltins = api;
})(typeof window !== 'undefined' ? window : global);
