/* ================= EQT / TRIMT — ASCII text built-ins ================= */

function binToBytes(bin) {
  const s = bin == null ? '' : String(bin);
  const bytes = [];
  const full = Math.floor(s.length / 8);
  for (let i = 0; i < full; i++) {
    bytes.push(parseInt(s.substr(i * 8, 8), 2));
  }
  const rem = s.length % 8;
  if (rem > 0) {
    bytes.push(parseInt(s.substr(full * 8).padEnd(8, '0'), 2));
  }
  return bytes;
}

function bytesToBin(bytes, width) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += (bytes[i] & 0xff).toString(2).padStart(8, '0');
  }
  if (width != null) {
    if (bin.length < width) bin = bin.padEnd(width, '0');
    else if (bin.length > width) bin = bin.slice(0, width);
  }
  return bin;
}

function parseTextTrimCallTags(callTags, fnName, fail) {
  let hasLeft = false;
  let hasRight = false;
  let hasAny = false;
  if (!callTags || !callTags.length) {
    return 'any';
  }
  for (const t of callTags) {
    if (t.name === 'left') {
      if (t.value !== 1) fail(`${fnName}: tag 'left' must be enabled (use '; left' or '; left=1')`);
      if (hasLeft) fail(`${fnName}: duplicate tag 'left'`);
      hasLeft = true;
    } else if (t.name === 'right') {
      if (t.value !== 1) fail(`${fnName}: tag 'right' must be enabled (use '; right' or '; right=1')`);
      if (hasRight) fail(`${fnName}: duplicate tag 'right'`);
      hasRight = true;
    } else if (t.name === 'any') {
      if (t.value !== 1) fail(`${fnName}: tag 'any' must be enabled (use '; any' or '; any=1')`);
      if (hasAny) fail(`${fnName}: duplicate tag 'any'`);
      hasAny = true;
    } else {
      fail(`${fnName}: unknown tag '${t.name}'`);
    }
  }
  if (hasAny && (hasLeft || hasRight)) {
    fail(`${fnName}: cannot use any with left or right`);
  }
  if (hasAny) return 'any';
  if (hasLeft && hasRight) return 'leftRight';
  if (hasLeft) return 'left';
  if (hasRight) return 'right';
  return 'any';
}

function normalizeNullBytes(bytes, mode) {
  if (mode === 'any') {
    return bytes.filter(b => b !== 0);
  }
  let start = 0;
  let end = bytes.length;
  if (mode === 'left' || mode === 'leftRight') {
    while (start < end && bytes[start] === 0) start++;
  }
  if (mode === 'right' || mode === 'leftRight') {
    while (end > start && bytes[end - 1] === 0) end--;
  }
  return bytes.slice(start, end);
}

function eqtEqual(binA, binB, mode) {
  const a = normalizeNullBytes(binToBytes(binA), mode);
  const b = normalizeNullBytes(binToBytes(binB), mode);
  if (a.length !== b.length) return '0';
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return '0';
  }
  return '1';
}

function trimBytes(bytes, trimSet, mode) {
  const trim = new Set(trimSet);
  let arr = bytes.slice();
  if (mode === 'any') {
    return arr.filter(b => !trim.has(b));
  }
  if (mode === 'right' || mode === 'leftRight') {
    while (arr.length && arr[arr.length - 1] === 0) arr.pop();
  }
  let start = 0;
  let end = arr.length;
  if (mode === 'left' || mode === 'leftRight') {
    while (start < end && trim.has(arr[start])) start++;
  }
  if (mode === 'right' || mode === 'leftRight') {
    while (end > start && trim.has(arr[end - 1])) end--;
  }
  return arr.slice(start, end);
}

function trimtApply(srcBin, trimSetBin, mode, outWidth) {
  const trimmed = trimBytes(binToBytes(srcBin), binToBytes(trimSetBin), mode);
  return bytesToBin(trimmed, outWidth);
}

const api = {
  parseTextTrimCallTags,
  binToBytes,
  bytesToBin,
  normalizeNullBytes,
  eqtEqual,
  trimBytes,
  trimtApply,
};

if (typeof globalThis !== 'undefined') {
  globalThis.LogTScriptTextBuiltin = api;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
