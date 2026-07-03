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
  if (isFillValue(inst, valueBits)) {
    throw new Error(`LUT decode failed:\nvalue ${valueBits} does not exist in lookup table`);
  }
  const matchIndex = parseMatchIndex(matchIndexExpr, ctx, inst);

  const matches = [];
  for (const entry of list) {
    if (entry.value === valueBits) matches.push(entry.key);
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

function lutIsEmpty(inst) {
  requireWritable(inst);
  return { value: inst.lutEntryList.length === 0 ? '1' : '0', bitWidth: 1 };
}

function lutGetWritable(inst, keyExpr, matchIndexExpr, ctx) {
  return lutLookupWritable(inst, keyExpr, matchIndexExpr, ctx);
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
  lutIsEmpty,
  lutGetWritable,
};

if (typeof module !== 'undefined' && module.exports) module.exports = lutWritableExports;
if (typeof globalThis !== 'undefined') Object.assign(globalThis, lutWritableExports);
