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

  /** Transpose blob: [rows,cols] -> [cols,rows], row-major both ways. */
  function pivotBlob(val, ew, rows, cols) {
    const s = val == null ? '' : String(val);
    let out = '';
    for (let dr = 0; dr < cols; dr++) {
      for (let dc = 0; dc < rows; dc++) {
        const sr = dc;
        const sc = dr;
        const start = linearIndex(sr, sc, cols) * ew;
        out += s.substring(start, start + ew);
      }
    }
    return out;
  }

  function pivotedDims(rows, cols) {
    return { rows: cols, cols: rows };
  }

  const REPEAT_MAX_BITS = 16384;

  function checkRepeatTotalBits(totalBits, fnName) {
    const n = totalBits | 0;
    if (n > REPEAT_MAX_BITS) {
      throw new Error(`${fnName}: result exceeds ${REPEAT_MAX_BITS} bits (${n} bits)`);
    }
  }

  function repeatPlainBlob(val, times) {
    const s = val == null ? '' : String(val);
    const t = times | 0;
    if (t < 1) return s;
    let out = '';
    for (let i = 0; i < t; i++) out += s;
    return out;
  }

  /** [N,1] or column-oriented N elements → [N,T] row-major */
  function repeatColumnStackBlob(val, rows, ew, times) {
    const W = ew | 0;
    const R = rows | 0;
    const T = times | 0;
    const s = val == null ? '' : String(val);
    let out = '';
    for (let r = 0; r < R; r++) {
      const cell = s.substring(r * W, r * W + W);
      for (let t = 0; t < T; t++) out += cell;
    }
    return out;
  }

  /** [1,N] row → [T,N] vertical stack of identical rows */
  function repeatRowStackBlob(val, ew, cols, times) {
    const W = ew | 0;
    const C = cols | 0;
    const T = times | 0;
    const s = val == null ? '' : String(val);
    const rowBits = C * W;
    const row = s.substring(0, rowBits);
    let out = '';
    for (let t = 0; t < T; t++) out += row;
    return out;
  }

  /** N elements in [1,N] single-dim vector → [N,T] row-major */
  function repeatSingleDimVectorBlob(val, ew, count, times) {
    const W = ew | 0;
    const N = count | 0;
    const T = times | 0;
    const s = val == null ? '' : String(val);
    let out = '';
    for (let i = 0; i < N; i++) {
      const cell = s.substring(i * W, i * W + W);
      for (let t = 0; t < T; t++) out += cell;
    }
    return out;
  }

  /** N×N identity matrix blob: diagonal = 1 (W bits), off-diagonal = 0. */
  function identityBlob(n, ew) {
    const N = n | 0;
    const W = ew | 0;
    if (N < 1 || W < 1) return '';
    const one = cellOne(W);
    const zero = cellZero(W);
    let out = '';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        out += r === c ? one : zero;
      }
    }
    return out;
  }

  function cellZero(ew) {
    return '0'.repeat(ew | 0);
  }

  function cellOne(ew) {
    const W = ew | 0;
    return W < 1 ? '' : '0'.repeat(Math.max(0, W - 1)) + '1';
  }

  function padCell(val, ew) {
    return String(val).padStart(ew | 0, '0').slice(-(ew | 0));
  }

  function zerosBlob(n, ew) {
    const N = n | 0;
    const W = ew | 0;
    if (N < 1 || W < 1) return '';
    return cellZero(W).repeat(N * N);
  }

  function fillBlob(n, ew, cellVal) {
    const N = n | 0;
    const W = ew | 0;
    if (N < 1 || W < 1) return '';
    return padCell(cellVal, W).repeat(N * N);
  }

  function diagonalBlob(values, ew, n) {
    const N = n | 0;
    const W = ew | 0;
    const zero = cellZero(W);
    let out = '';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        out += r === c ? padCell(values[r], W) : zero;
      }
    }
    return out;
  }

  function iotaBlob(n, ew) {
    const N = n | 0;
    const W = ew | 0;
    let out = '';
    for (let i = 0; i < N; i++) {
      out += i.toString(2).padStart(W, '0').slice(-W);
    }
    return out;
  }

  function flipUdBlob(val, ew, rows, cols) {
    const W = ew | 0;
    const s = val == null ? '' : String(val);
    let out = '';
    for (let r = rows - 1; r >= 0; r--) {
      out += s.substring(r * cols * W, (r + 1) * cols * W);
    }
    return out;
  }

  function flipLrBlob(val, ew, rows, cols) {
    const W = ew | 0;
    const s = val == null ? '' : String(val);
    let out = '';
    for (let r = 0; r < rows; r++) {
      for (let c = cols - 1; c >= 0; c--) {
        const start = linearIndex(r, c, cols) * W;
        out += s.substring(start, start + W);
      }
    }
    return out;
  }

  function trilBlob(val, ew, rows, cols) {
    const W = ew | 0;
    const s = val == null ? '' : String(val);
    const zero = cellZero(W);
    let out = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const start = linearIndex(r, c, cols) * W;
        out += c <= r ? s.substring(start, start + W) : zero;
      }
    }
    return out;
  }

  function triuBlob(val, ew, rows, cols) {
    const W = ew | 0;
    const s = val == null ? '' : String(val);
    const zero = cellZero(W);
    let out = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const start = linearIndex(r, c, cols) * W;
        out += c >= r ? s.substring(start, start + W) : zero;
      }
    }
    return out;
  }

  function catHorizontalBlob(valA, valB, ew, rows, colsA, colsB) {
    const W = ew | 0;
    const a = valA == null ? '' : String(valA);
    const b = valB == null ? '' : String(valB);
    let out = '';
    for (let r = 0; r < rows; r++) {
      out += a.substring(r * colsA * W, (r + 1) * colsA * W);
      out += b.substring(r * colsB * W, (r + 1) * colsB * W);
    }
    return out;
  }

  function catVerticalBlob(valA, valB, ew, rowsA, rowsB, cols) {
    return String(valA) + String(valB);
  }

  function sliceBlob(val, ew, rows, cols, r0, c0, h, w) {
    const W = ew | 0;
    const s = val == null ? '' : String(val);
    let out = '';
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        const start = linearIndex(r, c, cols) * W;
        out += s.substring(start, start + W);
      }
    }
    return out;
  }

  function diagonalValues(val, ew, rows, cols) {
    const W = ew | 0;
    const s = val == null ? '' : String(val);
    const n = Math.min(rows, cols);
    const vals = [];
    for (let i = 0; i < n; i++) {
      const start = linearIndex(i, i, cols) * W;
      vals.push(s.substring(start, start + W));
    }
    return vals;
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
    declBitTotal,
    pivotBlob,
    pivotedDims,
    REPEAT_MAX_BITS,
    checkRepeatTotalBits,
    repeatPlainBlob,
    repeatColumnStackBlob,
    repeatRowStackBlob,
    repeatSingleDimVectorBlob,
    identityBlob,
    cellZero,
    cellOne,
    padCell,
    zerosBlob,
    fillBlob,
    diagonalBlob,
    iotaBlob,
    flipUdBlob,
    flipLrBlob,
    trilBlob,
    triuBlob,
    catHorizontalBlob,
    catVerticalBlob,
    sliceBlob,
    diagonalValues,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptTensorShape = api;
})(typeof window !== 'undefined' ? window : global);
