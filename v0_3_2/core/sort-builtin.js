/* ================= SORT built-in ================= */

function unsignedCompareBin(a, b) {
  const w = Math.max(a.length, b.length);
  const ai = BigInt('0b' + (a || '0').padStart(w, '0'));
  const bi = BigInt('0b' + (b || '0').padStart(w, '0'));
  if (ai === bi) return 0;
  return ai > bi ? 1 : -1;
}

function parseSortCallTags(callTags, fail) {
  let desc = false;
  let col = null;
  let row = null;
  if (!callTags || !callTags.length) {
    return { desc, col, row };
  }
  for (const t of callTags) {
    if (t.name === 'desc') {
      if (t.value !== 1) {
        fail("SORT: tag 'desc' must be enabled (use '; desc' or '; desc=1')");
      }
      desc = true;
    } else if (t.name === 'col') {
      if (row !== null) fail('SORT: col and row are mutually exclusive');
      if (col !== null) fail("SORT: duplicate tag 'col'");
      if (typeof t.value !== 'number' || !Number.isInteger(t.value)) {
        fail("SORT: tag 'col' requires an integer value (e.g. '; col=1')");
      }
      col = t.value;
    } else if (t.name === 'row') {
      if (col !== null) fail('SORT: col and row are mutually exclusive');
      if (row !== null) fail("SORT: duplicate tag 'row'");
      if (typeof t.value !== 'number' || !Number.isInteger(t.value)) {
        fail("SORT: tag 'row' requires an integer value (e.g. '; row=0')");
      }
      row = t.value;
    } else {
      fail(`SORT: unknown tag '${t.name}'`);
    }
  }
  return { desc, col, row };
}

function matrixCellBits(val, ew, cols, r, c) {
  const start = (r * cols + c) * ew;
  return val.substring(start, start + ew);
}

function sortMatrixRowsByCol(val, ew, rows, cols, colIndex, desc) {
  if (colIndex < 0 || colIndex >= cols) {
    throw new Error(`SORT: column index ${colIndex} out of range [0,${cols - 1}]`);
  }
  const order = [];
  for (let r = 0; r < rows; r++) order.push(r);
  order.sort((a, b) => {
    const va = matrixCellBits(val, ew, cols, a, colIndex);
    const vb = matrixCellBits(val, ew, cols, b, colIndex);
    const cmp = unsignedCompareBin(va, vb);
    if (cmp !== 0) return desc ? -cmp : cmp;
    return a - b;
  });
  let out = '';
  for (let i = 0; i < order.length; i++) {
    const r = order[i];
    for (let c = 0; c < cols; c++) {
      out += matrixCellBits(val, ew, cols, r, c);
    }
  }
  return out;
}

function sortMatrixColsByRow(val, ew, rows, cols, rowIndex, desc) {
  if (rowIndex < 0 || rowIndex >= rows) {
    throw new Error(`SORT: row index ${rowIndex} out of range [0,${rows - 1}]`);
  }
  const order = [];
  for (let c = 0; c < cols; c++) order.push(c);
  order.sort((a, b) => {
    const va = matrixCellBits(val, ew, cols, rowIndex, a);
    const vb = matrixCellBits(val, ew, cols, rowIndex, b);
    const cmp = unsignedCompareBin(va, vb);
    if (cmp !== 0) return desc ? -cmp : cmp;
    return a - b;
  });
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < order.length; i++) {
      const c = order[i];
      out += matrixCellBits(val, ew, cols, r, c);
    }
  }
  return out;
}

function sortVectorBlob(val, ew, count, desc) {
  const elems = [];
  for (let i = 0; i < count; i++) {
    elems.push({
      idx: i,
      bits: val.substring(i * ew, (i + 1) * ew),
    });
  }
  elems.sort((a, b) => {
    const cmp = unsignedCompareBin(a.bits, b.bits);
    if (cmp !== 0) return desc ? -cmp : cmp;
    return a.idx - b.idx;
  });
  return elems.map((e) => e.bits).join('');
}

function sortTensor(val, meta, opts) {
  const desc = !!(opts && opts.desc);
  const col = opts && opts.col != null ? opts.col : null;
  const row = opts && opts.row != null ? opts.row : null;
  const ew = meta.elementWidth;
  const { rows, cols } = meta;

  const isMatrix = rows > 1 && cols > 1;
  if (isMatrix) {
    if (col == null && row == null) {
      throw new Error('SORT(matrix): requires col=index or row=index tag');
    }
    if (col != null && row != null) {
      throw new Error('SORT: col and row are mutually exclusive');
    }
    if (col != null) {
      return sortMatrixRowsByCol(val, ew, rows, cols, col, desc);
    }
    return sortMatrixColsByRow(val, ew, rows, cols, row, desc);
  }

  if (col != null || row != null) {
    throw new Error('SORT(vector): col= and row= apply only to matrices');
  }

  const count = meta.elementCount;
  if (count <= 1) return val;
  return sortVectorBlob(val, ew, count, desc);
}

const sortBuiltinExports = {
  parseSortCallTags,
  sortTensor,
  unsignedCompareBin,
};

if (typeof module !== 'undefined' && module.exports) module.exports = sortBuiltinExports;
if (typeof globalThis !== 'undefined') globalThis.LogTScriptSortBuiltin = sortBuiltinExports;
