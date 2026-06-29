/**
 * Static helpers for 2D wire tensor shape, indexing, and display labels.
 */
(function (global) {
  'use strict';

  function normalizeDeclTensor(decl) {
    if (!decl) return null;
    if (decl.tensorRows != null && decl.tensorCols != null) {
      return { rows: decl.tensorRows, cols: decl.tensorCols };
    }
    if (decl.vectorCount != null) {
      return { rows: 1, cols: decl.vectorCount };
    }
    return null;
  }

  function isScalarTensor(dims) {
    return !!(dims && dims.rows === 1 && dims.cols === 1);
  }

  function isMatrix(dims) {
    return !!(dims && dims.rows > 1 && dims.cols > 1);
  }

  function getWireTensorMeta(wire) {
    if (!wire) return null;
    if (wire.tensor && wire.tensor.dims) {
      const [rows, cols] = wire.tensor.dims;
      return {
        elementWidth: wire.tensor.elementWidth,
        rows,
        cols,
        elementCount: rows * cols
      };
    }
    if (wire.vector) {
      return {
        elementWidth: wire.vector.elementWidth,
        rows: 1,
        cols: wire.vector.elementCount,
        elementCount: wire.vector.elementCount
      };
    }
    return null;
  }

  function linearIndex(row, col, cols) {
    return row * cols + col;
  }

  function cellBitRange(row, col, ew, cols) {
    const start = linearIndex(row, col, cols) * ew;
    return { start, end: start + ew - 1 };
  }

  function rowBitRange(row, ew, cols) {
    const start = row * cols * ew;
    return { start, end: start + cols * ew - 1 };
  }

  function gatherColumnBits(val, col, ew, rows, cols) {
    let bits = '';
    for (let r = 0; r < rows; r++) {
      const start = linearIndex(r, col, cols) * ew;
      bits += val.substring(start, start + ew);
    }
    return bits;
  }

  function scatterColumnBits(current, col, ew, rows, cols, newColBits) {
    let result = current;
    for (let r = 0; r < rows; r++) {
      const start = linearIndex(r, col, cols) * ew;
      const cellBits = newColBits.substring(r * ew, (r + 1) * ew);
      result = result.substring(0, start) + cellBits + result.substring(start + ew);
    }
    return result;
  }

  function formatTensorTypeLabel(ew, rows, cols) {
    if (rows === 1 && cols === 1) return `${ew}wire`;
    if (rows === 1) return `${ew}wire[${cols}]`;
    if (cols === 1) return `${ew}wire[${rows},1]`;
    return `${ew}wire[${rows},${cols}]`;
  }

  function declBitTotal(ew, decl) {
    const dims = normalizeDeclTensor(decl);
    if (!dims || isScalarTensor(dims)) return ew;
    return ew * dims.rows * dims.cols;
  }

  const api = {
    normalizeDeclTensor,
    isScalarTensor,
    isMatrix,
    getWireTensorMeta,
    linearIndex,
    cellBitRange,
    rowBitRange,
    gatherColumnBits,
    scatterColumnBits,
    formatTensorTypeLabel,
    declBitTotal
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptTensorShape = api;
})(typeof window !== 'undefined' ? window : global);
