/* ================= WRITABLE INLINE LUT ================= */

function lutAddrBits(length) {
  if (length <= 1) return 1;
  return Math.ceil(Math.log2(length));
}

function parseMatchIndex(matchIndexExpr, ctx, inst) {
  if (!matchIndexExpr) return 0;
  const idxStr = typeof resolveLutArgValue === 'function'
    ? resolveLutArgValue(ctx, matchIndexExpr, inst)
    : '';
  let matchIndex = parseInt(idxStr, 2);
  if (isNaN(matchIndex)) matchIndex = parseInt(idxStr, 10);
  if (isNaN(matchIndex)) matchIndex = 0;
  return matchIndex;
}

function intToWire(n, minBits) {
  const v = Math.max(0, n | 0);
  const raw = v === 0 ? '0' : v.toString(2);
  const width = Math.max(minBits || 1, raw.length);
  return { value: raw.padStart(width, '0'), bitWidth: width };
}

function statBitWidth(inst) {
  const length = getInstLength(inst);
  return Math.max(lutAddrBits(length), 4);
}

function requireWritable(inst) {
  if (!inst || !inst.writable) {
    const name = inst && inst.name ? inst.name : 'LUT';
    throw new Error(`LUT ${name} is not writable`);
  }
  if (!inst.lutEntryList) {
    throw new Error(`Writable LUT ${inst.name} has no entry list`);
  }
}

function syncWritableLutTable(inst) {
  if (!inst || !inst.lutTable || !inst.lutEntryList) return;
  const length = getInstLength(inst);
  const variableDepth = !!(inst.attributes && inst.attributes.variableDepth);
  const depth = getInstDepth(inst);
  const fill = inst.fillwithValue != null
    ? String(inst.fillwithValue)
    : (variableDepth ? '0' : '0'.repeat(depth || 4));
  for (let i = 0; i < length; i++) inst.lutTable[i] = fill;
  for (const entry of inst.lutEntryList) {
    const addr = parseInt(entry.key, 2);
    if (!isNaN(addr) && addr >= 0 && addr < length) {
      inst.lutTable[addr] = entry.value;
    }
  }
}

function buildWritableLutTable(inst, length, depth, fillwith, initialValue) {
  const list = buildEntryListFromLutData(initialValue, length);
  inst.lutEntryList = list;
  const table = new Array(length);
  const variableDepth = !!(inst.attributes && inst.attributes.variableDepth);
  const fill = fillwith != null
    ? String(fillwith)
    : (variableDepth ? '0' : '0'.repeat(depth || 4));
  for (let i = 0; i < length; i++) table[i] = fill;
  for (const entry of list) {
    const addr = parseInt(entry.key, 2);
    if (!isNaN(addr) && addr >= 0 && addr < length) table[addr] = entry.value;
  }
  return table;
}

function buildEntryListFromLutData(initialValue, length) {
  const addrBits = lutAddrBits(length);
  const list = [];
  const entries = (initialValue && initialValue.entries) ? initialValue.entries : [];
  for (const entry of entries) {
    for (let i = entry.from; i <= entry.to; i++) {
      list.push({
        key: i.toString(2).padStart(addrBits, '0'),
        value: entry.value,
      });
    }
  }
  return list;
}

function getInstDepth(inst) {
  const variableDepth = !!(inst.attributes && inst.attributes.variableDepth);
  if (variableDepth) return null;
  return inst.attributes.depth !== undefined ? parseInt(inst.attributes.depth, 10) : 4;
}

function getInstLength(inst) {
  return inst.attributes.length !== undefined ? parseInt(inst.attributes.length, 10) : 16;
}

function normalizeKeyBits(keyBits, length) {
  const addrBits = lutAddrBits(length);
  let bin = keyBits == null ? '' : String(keyBits);
  if (bin.length < addrBits) bin = bin.padStart(addrBits, '0');
  else if (bin.length > addrBits) bin = bin.substring(bin.length - addrBits);
  const addr = parseInt(bin, 2);
  if (isNaN(addr) || addr < 0 || addr >= length) {
    throw new Error(`LUT address ${addr} >= length ${length}`);
  }
  return bin;
}

function normalizeValueBits(valueBits, inst) {
  const variableDepth = !!(inst.attributes && inst.attributes.variableDepth);
  const depth = getInstDepth(inst);
  let bin = valueBits == null ? '' : String(valueBits);
  if (!variableDepth) {
    if (bin.length < depth) bin = bin.padStart(depth, '0');
    else if (bin.length > depth) bin = bin.substring(bin.length - depth);
    if (bin.length !== depth) {
      throw new Error(`LUT value must be exactly ${depth} bits, got ${bin.length}`);
    }
    if (!/^[01]+$/.test(bin)) throw new Error('LUT value must be a binary literal');
  } else {
    if (!bin.length) throw new Error('LUT value must be non-empty for variableDepth');
    if (!/^[01]+$/.test(bin)) throw new Error('LUT value must be a binary literal');
  }
  return bin;
}

function resolveKeyAndValue(keyExpr, valueExpr, ctx, inst) {
  const length = getInstLength(inst);
  const keyBits = normalizeKeyBits(
    typeof resolveLutArgValue === 'function' ? resolveLutArgValue(ctx, keyExpr, inst) : '',
    length
  );
  const valueBits = normalizeValueBits(
    typeof resolveLutArgValue === 'function' ? resolveLutArgValue(ctx, valueExpr, inst) : '',
    inst
  );
  return { key: keyBits, value: valueBits };
}

function resolveKeyOnly(keyExpr, ctx, inst) {
  const length = getInstLength(inst);
  return normalizeKeyBits(
    typeof resolveLutArgValue === 'function' ? resolveLutArgValue(ctx, keyExpr, inst) : '',
    length
  );
}

function isFillValue(inst, valueBits) {
  const fill = inst.fillwithValue != null ? String(inst.fillwithValue) : '';
  return valueBits === fill;
}

function assertPrefixFreeIfNeeded(inst, list) {
  if (!inst.attributes || !inst.attributes.prefixFree) return;
  if (typeof validatePrefixFreeValues !== 'function') {
    throw new Error('prefixFree validation is not available');
  }
  validatePrefixFreeValues(list.map(e => e.value));
}

function findKeyMatches(list, keyBits) {
  const matches = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].key === keyBits) matches.push(i);
  }
  return matches;
}

function findValueMatches(list, valueBits) {
  const matches = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].value === valueBits) matches.push(i);
  }
  return matches;
}

function lutLookupWritable(inst, keyExpr, matchIndexExpr, ctx) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const length = getInstLength(inst);
  const addrBits = lutAddrBits(length);
  const keyBits = resolveKeyOnly(keyExpr, ctx, inst);
  const matchIndex = parseMatchIndex(matchIndexExpr, ctx, inst);
  const variableDepth = !!(inst.attributes && inst.attributes.variableDepth);
  const depth = getInstDepth(inst);
  const fill = inst.fillwithValue != null ? String(inst.fillwithValue) : '0'.repeat(depth || 1);

  const matches = [];
  for (const entry of list) {
    if (entry.key === keyBits) matches.push(entry.value);
  }

  let outVal;
  if (!matches.length) {
    outVal = fill;
  } else if (matchIndex < 0 || matchIndex >= matches.length) {
    outVal = fill;
  } else {
    outVal = matches[matchIndex];
  }

  const outWidth = variableDepth ? (outVal ? outVal.length : 1) : (depth || 4);
  return { value: outVal, ref: null, varName: `${inst.name}:get`, bitWidth: outWidth };
}

function lutDecodeWritable(inst, valueExpr, matchIndexExpr, ctx) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const length = getInstLength(inst);
  const addrWidth = lutAddrBits(length);
  const valueBits = typeof resolveLutArgValue === 'function'
    ? resolveLutArgValue(ctx, valueExpr, inst)
    : '';
  const matchIndex = parseMatchIndex(matchIndexExpr, ctx, inst);

  const matches = [];
  for (const entry of list) {
    if (entry.value === valueBits) matches.push(entry.key);
  }

  // When the requested value equals fillwith, unmapped slots also "hold" it
  // (mirrors read-only decode over lutTable). Explicit entries come first,
  // then the gap addresses in ascending order.
  if (isFillValue(inst, valueBits)) {
    const occupied = new Set(list.map(e => e.key));
    for (let i = 0; i < length; i++) {
      const keyBits = i.toString(2).padStart(addrWidth, '0');
      if (!occupied.has(keyBits)) matches.push(keyBits);
    }
  }

  if (!matches.length) {
    throw new Error(`LUT decode failed:\nvalue ${valueBits} does not exist in lookup table`);
  }
  if (matchIndex < 0 || matchIndex >= matches.length) {
    throw new Error(`LUT decode failed:\nmatch index ${matchIndex} exceeds available matches (${matches.length})`);
  }

  const keyBits = matches[matchIndex];
  const labelNames = typeof resolveLabelsForValue === 'function' ? resolveLabelsForValue(inst, keyBits) : [];
  const meta = typeof makeSymbolicMeta === 'function'
    ? makeSymbolicMeta(inst.name, labelNames[0] || null, null)
    : null;

  return { value: keyBits, bitWidth: addrWidth, symbolicMeta: meta };
}

function lutIsValidWritable(inst, keyExpr, valueExpr, ctx) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const keyBits = resolveKeyOnly(keyExpr, ctx, inst);
  const valueBits = typeof resolveLutArgValue === 'function'
    ? resolveLutArgValue(ctx, valueExpr, inst)
    : '';
  let ok = false;
  for (const entry of list) {
    if (entry.key === keyBits && entry.value === valueBits) {
      ok = true;
      break;
    }
  }
  return { value: ok ? '1' : '0', bitWidth: 1 };
}

function lutAdd(inst, keyExpr, valueExpr, ctx) {
  requireWritable(inst);
  const { key, value } = resolveKeyAndValue(keyExpr, valueExpr, ctx, inst);
  const next = inst.lutEntryList.concat([{ key, value }]);
  assertPrefixFreeIfNeeded(inst, next);
  inst.lutEntryList.push({ key, value });
  syncWritableLutTable(inst);
  return { value: '0', bitWidth: 1 };
}

function lutSet(inst, keyExpr, valueExpr, matchIndexExpr, ctx) {
  requireWritable(inst);
  const { key, value } = resolveKeyAndValue(keyExpr, valueExpr, ctx, inst);
  const list = inst.lutEntryList;
  const matchIndex = parseMatchIndex(matchIndexExpr, ctx, inst);
  const indices = findKeyMatches(list, key);

  const next = list.map(e => ({ key: e.key, value: e.value }));
  if (!indices.length) {
    next.push({ key, value });
  } else if (matchIndexExpr == null || matchIndex === 0) {
    next[indices[0]] = { key, value };
  } else if (matchIndex < 0 || matchIndex >= indices.length) {
    next.push({ key, value });
  } else {
    next[indices[matchIndex]] = { key, value };
  }

  assertPrefixFreeIfNeeded(inst, next);
  inst.lutEntryList = next;
  syncWritableLutTable(inst);
  return { value: '0', bitWidth: 1 };
}

function lutRemove(inst, keyExpr, matchIndexExpr, ctx) {
  requireWritable(inst);
  const keyBits = resolveKeyOnly(keyExpr, ctx, inst);
  const list = inst.lutEntryList;
  const matchIndex = parseMatchIndex(matchIndexExpr, ctx, inst);
  const indices = findKeyMatches(list, keyBits);
  if (!indices.length) return { value: '0', bitWidth: 1 };

  let removeAt;
  if (matchIndexExpr == null || matchIndex === 0) {
    removeAt = indices[0];
  } else if (matchIndex < 0 || matchIndex >= indices.length) {
    return { value: '0', bitWidth: 1 };
  } else {
    removeAt = indices[matchIndex];
  }

  inst.lutEntryList = list.filter((_, i) => i !== removeAt);
  syncWritableLutTable(inst);
  return { value: '0', bitWidth: 1 };
}

function lutClear(inst) {
  requireWritable(inst);
  inst.lutEntryList.length = 0;
  syncWritableLutTable(inst);
  return { value: '0', bitWidth: 1 };
}

function lutSize(inst) {
  requireWritable(inst);
  return intToWire(inst.lutEntryList.length, statBitWidth(inst));
}

function lutCountKey(inst, keyExpr, ctx) {
  requireWritable(inst);
  const keyBits = resolveKeyOnly(keyExpr, ctx, inst);
  let n = 0;
  for (const entry of inst.lutEntryList) {
    if (entry.key === keyBits) n++;
  }
  return intToWire(n, statBitWidth(inst));
}

function lutCountValue(inst, valueExpr, ctx) {
  requireWritable(inst);
  const valueBits = typeof resolveLutArgValue === 'function'
    ? resolveLutArgValue(ctx, valueExpr, inst)
    : '';
  if (isFillValue(inst, valueBits)) return intToWire(0, statBitWidth(inst));
  let n = 0;
  for (const entry of inst.lutEntryList) {
    if (entry.value === valueBits) n++;
  }
  return intToWire(n, statBitWidth(inst));
}

function lutHasKey(inst, keyExpr, ctx) {
  requireWritable(inst);
  const keyBits = resolveKeyOnly(keyExpr, ctx, inst);
  let n = 0;
  for (const entry of inst.lutEntryList) {
    if (entry.key === keyBits) n++;
  }
  return { value: n > 0 ? '1' : '0', bitWidth: 1 };
}

function lutHasValue(inst, valueExpr, ctx) {
  requireWritable(inst);
  const valueBits = typeof resolveLutArgValue === 'function'
    ? resolveLutArgValue(ctx, valueExpr, inst)
    : '';
  if (isFillValue(inst, valueBits)) return { value: '0', bitWidth: 1 };
  for (const entry of inst.lutEntryList) {
    if (entry.value === valueBits) return { value: '1', bitWidth: 1 };
  }
  return { value: '0', bitWidth: 1 };
}

function lutIsEmpty(inst) {
  requireWritable(inst);
  return { value: inst.lutEntryList.length === 0 ? '1' : '0', bitWidth: 1 };
}

function lutGetWritable(inst, keyExpr, matchIndexExpr, ctx) {
  return lutLookupWritable(inst, keyExpr, matchIndexExpr, ctx);
}

function getExportKeyWidth(inst) {
  return lutAddrBits(getInstLength(inst));
}

function getExportValueWidth(inst) {
  const variableDepth = !!(inst.attributes && inst.attributes.variableDepth);
  if (!variableDepth) return getInstDepth(inst) || 4;
  let max = 1;
  const list = inst.lutEntryList || [];
  for (const entry of list) {
    if (entry.value && entry.value.length > max) max = entry.value.length;
  }
  return max;
}

function parseEntryIndex(indexExpr, ctx, inst) {
  const idxStr = typeof resolveLutArgValue === 'function'
    ? resolveLutArgValue(ctx, indexExpr, inst)
    : '';
  let idx = parseInt(idxStr, 2);
  if (isNaN(idx)) idx = parseInt(idxStr, 10);
  if (isNaN(idx)) {
    throw new Error(`LUT: invalid entry index '${idxStr || ''}'`);
  }
  return idx;
}

function assertEntryIndexInRange(inst, idx) {
  const list = inst.lutEntryList;
  const max = list.length - 1;
  if (idx < 0 || idx >= list.length) {
    throw new Error(`LUT: entry index ${idx} out of range [0,${max < 0 ? 0 : max}]`);
  }
}

function lutKeyAt(inst, indexExpr, ctx) {
  requireWritable(inst);
  const idx = parseEntryIndex(indexExpr, ctx, inst);
  assertEntryIndexInRange(inst, idx);
  const entry = inst.lutEntryList[idx];
  const keyW = getExportKeyWidth(inst);
  let k = entry.key == null ? '' : String(entry.key);
  if (k.length < keyW) k = k.padStart(keyW, '0');
  else if (k.length > keyW) k = k.substring(k.length - keyW);
  return { value: k, bitWidth: keyW, varName: `${inst.name}:keyAt` };
}

function lutValueAt(inst, indexExpr, ctx) {
  requireWritable(inst);
  const idx = parseEntryIndex(indexExpr, ctx, inst);
  assertEntryIndexInRange(inst, idx);
  const entry = inst.lutEntryList[idx];
  const valW = getExportValueWidth(inst);
  let v = entry.value == null ? '' : String(entry.value);
  if (v.length < valW) v = v.padStart(valW, '0');
  else if (v.length > valW) v = v.substring(v.length - valW);
  return { value: v, bitWidth: valW, varName: `${inst.name}:valueAt` };
}

function normalizeEntryValueBits(entry, valW) {
  let v = entry.value == null ? '' : String(entry.value);
  if (v.length < valW) v = v.padStart(valW, '0');
  else if (v.length > valW) v = v.substring(v.length - valW);
  return v;
}

function normalizeEntryKeyBits(entry, keyW) {
  let k = entry.key == null ? '' : String(entry.key);
  if (k.length < keyW) k = k.padStart(keyW, '0');
  else if (k.length > keyW) k = k.substring(k.length - keyW);
  return k;
}

function parseLutMinMaxNumericMode(callTags, methodName, fail) {
  const SA = typeof LogTScriptSignedArithmetic !== 'undefined' ? LogTScriptSignedArithmetic : null;
  if (!SA || typeof SA.parseBuiltinCallTags !== 'function') {
    return 'unsigned';
  }
  const tags = SA.parseBuiltinCallTags(
    callTags, methodName, fail, true, false, false, false, false, true
  );
  if (tags.numericMode && tags.numericMode !== 'unsigned') return tags.numericMode;
  return tags.signed ? 'signed' : 'unsigned';
}

function compareEntryValueBits(va, vb, numericMode) {
  const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
  const SA = typeof LogTScriptSignedArithmetic !== 'undefined' ? LogTScriptSignedArithmetic : null;
  if (NF && typeof NF.isBuiltinNumericFormatMode === 'function' && NF.isBuiltinNumericFormatMode(numericMode)) {
    return NF.compareValues(va, vb, numericMode);
  }
  if (numericMode === 'signed' || (typeof numericMode === 'string' && /^s\d+$/.test(numericMode))) {
    if (!SA) throw new Error('Signed compare is not available');
    return SA.signedCompareBigInt(va, vb);
  }
  const w = Math.max(va.length, vb.length);
  const ai = BigInt('0b' + va.padStart(w, '0'));
  const bi = BigInt('0b' + vb.padStart(w, '0'));
  if (ai === bi) return 0;
  return ai > bi ? 1 : -1;
}

function assertNonEmptyEntryList(inst, methodName) {
  if (!inst.lutEntryList.length) {
    throw new Error(`LUT: ${methodName}: empty entry list`);
  }
}

function findExtremeEntryIndex(inst, pickMin, numericMode, methodName) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  assertNonEmptyEntryList(inst, methodName);
  const valW = getExportValueWidth(inst);
  let bestIdx = 0;
  let bestVal = normalizeEntryValueBits(list[0], valW);
  for (let i = 1; i < list.length; i++) {
    const v = normalizeEntryValueBits(list[i], valW);
    const cmp = compareEntryValueBits(v, bestVal, numericMode);
    if (pickMin ? cmp < 0 : cmp > 0) {
      bestIdx = i;
      bestVal = v;
    }
  }
  return bestIdx;
}

function entryKeyValuePair(inst, idx, computeRefs, ctx, methodName) {
  const entry = inst.lutEntryList[idx];
  const keyW = getExportKeyWidth(inst);
  const valW = getExportValueWidth(inst);
  const keyBits = normalizeEntryKeyBits(entry, keyW);
  const valBits = normalizeEntryValueBits(entry, valW);
  const keyPart = { value: keyBits, bitWidth: keyW, varName: `${inst.name}:${methodName}:key` };
  const valPart = { value: valBits, bitWidth: valW, varName: `${inst.name}:${methodName}:value` };
  if (computeRefs) {
    keyPart.ref = `&${ctx.storeValue(keyBits)}`;
    valPart.ref = `&${ctx.storeValue(valBits)}`;
  } else {
    keyPart.ref = null;
    valPart.ref = null;
  }
  return [keyPart, valPart];
}

function lutRemoveAt(inst, indexExpr, ctx) {
  requireWritable(inst);
  const idx = parseEntryIndex(indexExpr, ctx, inst);
  assertEntryIndexInRange(inst, idx);
  inst.lutEntryList = inst.lutEntryList.filter((_, i) => i !== idx);
  syncWritableLutTable(inst);
  return { value: '0', bitWidth: 1 };
}

function lutPeekOrPopExtreme(inst, pickMin, remove, callTags, ctx, computeRefs, methodName) {
  const fail = (msg) => { throw new Error(msg); };
  const numericMode = parseLutMinMaxNumericMode(callTags, methodName, fail);
  const idx = findExtremeEntryIndex(inst, pickMin, numericMode, methodName);
  const pair = entryKeyValuePair(inst, idx, computeRefs, ctx, methodName);
  if (remove) {
    inst.lutEntryList = inst.lutEntryList.filter((_, i) => i !== idx);
    syncWritableLutTable(inst);
  }
  return pair;
}

function lutPeekMin(inst, callTags, ctx, computeRefs) {
  return lutPeekOrPopExtreme(inst, true, false, callTags, ctx, computeRefs, 'peekMin');
}

function lutPeekMax(inst, callTags, ctx, computeRefs) {
  return lutPeekOrPopExtreme(inst, false, false, callTags, ctx, computeRefs, 'peekMax');
}

function lutPopMin(inst, callTags, ctx, computeRefs) {
  return lutPeekOrPopExtreme(inst, true, true, callTags, ctx, computeRefs, 'popMin');
}

function lutPopMax(inst, callTags, ctx, computeRefs) {
  return lutPeekOrPopExtreme(inst, false, true, callTags, ctx, computeRefs, 'popMax');
}

function lutKeys(inst) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const keyW = getExportKeyWidth(inst);
  let bits = '';
  for (const entry of list) bits += entry.key;
  return { value: bits, bitWidth: keyW * list.length, varName: `${inst.name}:keys` };
}

function lutValues(inst) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const valW = getExportValueWidth(inst);
  let bits = '';
  for (const entry of list) {
    let v = entry.value == null ? '' : String(entry.value);
    if (v.length < valW) v = v.padStart(valW, '0');
    else if (v.length > valW) v = v.substring(v.length - valW);
    bits += v;
  }
  return { value: bits, bitWidth: valW * list.length, varName: `${inst.name}:values` };
}

function sortedEntryPermutation(inst, numericMode) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const valW = getExportValueWidth(inst);
  const order = [];
  for (let i = 0; i < list.length; i++) order.push(i);
  order.sort((a, b) => {
    const va = normalizeEntryValueBits(list[a], valW);
    const vb = normalizeEntryValueBits(list[b], valW);
    const cmp = compareEntryValueBits(va, vb, numericMode);
    if (cmp !== 0) return cmp;
    return a - b;
  });
  return order;
}

function parseEntriesSortModeFromArgs(args) {
  if (!args || args.length === 0) return null;
  if (args.length !== 1) {
    throw new Error('LUT: entries(mode): expected sortKeys or sortValues');
  }
  const e = args[0];
  if (!Array.isArray(e) || e.length !== 1) {
    throw new Error('LUT: entries(mode): mode must be sortKeys or sortValues');
  }
  const atom = e[0];
  if (atom.var === 'sortKeys') return 'sortKeys';
  if (atom.var === 'sortValues') return 'sortValues';
  throw new Error('LUT: entries(mode): mode must be sortKeys or sortValues');
}

function lutEntriesSortKeys(inst, callTags) {
  const fail = (msg) => { throw new Error(msg); };
  const numericMode = parseLutMinMaxNumericMode(callTags, 'entries', fail);
  const list = inst.lutEntryList;
  const keyW = getExportKeyWidth(inst);
  const order = sortedEntryPermutation(inst, numericMode);
  let bits = '';
  for (const i of order) bits += normalizeEntryKeyBits(list[i], keyW);
  return {
    value: bits,
    bitWidth: keyW * list.length,
    varName: `${inst.name}:entries:sortKeys`,
    tensorRows: list.length,
    tensorCols: 1,
    tensorElementWidth: keyW,
  };
}

function lutEntriesSortValues(inst, callTags) {
  const fail = (msg) => { throw new Error(msg); };
  const numericMode = parseLutMinMaxNumericMode(callTags, 'entries', fail);
  const list = inst.lutEntryList;
  const valW = getExportValueWidth(inst);
  const order = sortedEntryPermutation(inst, numericMode);
  let bits = '';
  for (const i of order) bits += normalizeEntryValueBits(list[i], valW);
  return {
    value: bits,
    bitWidth: valW * list.length,
    varName: `${inst.name}:entries:sortValues`,
    tensorRows: list.length,
    tensorCols: 1,
    tensorElementWidth: valW,
  };
}

function lutEntries(inst) {
  requireWritable(inst);
  const list = inst.lutEntryList;
  const keyW = getExportKeyWidth(inst);
  const valW = getExportValueWidth(inst);
  const ew = Math.max(keyW, valW);
  let bits = '';
  for (const entry of list) {
    let k = entry.key == null ? '' : String(entry.key);
    let v = entry.value == null ? '' : String(entry.value);
    if (k.length < ew) k = k.padStart(ew, '0');
    else if (k.length > ew) k = k.substring(k.length - ew);
    if (v.length < ew) v = v.padStart(ew, '0');
    else if (v.length > ew) v = v.substring(v.length - ew);
    bits += k + v;
  }
  const rows = list.length;
  const cols = 2;
  return {
    value: bits,
    bitWidth: ew * rows * cols,
    varName: `${inst.name}:entries`,
    tensorRows: rows,
    tensorCols: cols,
    tensorElementWidth: ew,
  };
}

const lutWritableExports = {
  buildEntryListFromLutData,
  buildWritableLutTable,
  syncWritableLutTable,
  lutLookupWritable,
  lutDecodeWritable,
  lutIsValidWritable,
  lutAdd,
  lutSet,
  lutRemove,
  lutClear,
  lutSize,
  lutCountKey,
  lutCountValue,
  lutHasKey,
  lutHasValue,
  lutIsEmpty,
  lutGetWritable,
  lutKeys,
  lutValues,
  lutEntries,
  lutEntriesSortKeys,
  lutEntriesSortValues,
  parseEntriesSortModeFromArgs,
  lutKeyAt,
  lutValueAt,
  lutRemoveAt,
  lutPeekMin,
  lutPeekMax,
  lutPopMin,
  lutPopMax,
  getExportKeyWidth,
  getExportValueWidth,
};

if (typeof module !== 'undefined' && module.exports) module.exports = lutWritableExports;
if (typeof globalThis !== 'undefined') Object.assign(globalThis, lutWritableExports);
