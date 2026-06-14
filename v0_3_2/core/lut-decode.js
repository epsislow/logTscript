/* ================= LUT DECODE + isValid ================= */

function lutAddrBits(length) {
  if (length <= 1) return 1;
  return Math.ceil(Math.log2(length));
}

function resolveLutArgValue(ctx, argExpr, lutInst) {
  if (!argExpr || !argExpr.length) return '';
  const part = argExpr[0];
  if (part.bin) return part.bin;
  if (part.hex) {
    let binStr = '';
    for (let i = 0; i < part.hex.length; i++) {
      binStr += parseInt(part.hex[i], 16).toString(2).padStart(4, '0');
    }
    return binStr;
  }
  if (part.inlineMethod) {
    throw new Error('Nested inline methods in LUT isValid/decode are not supported');
  }
  if (part.var && part.property) {
    if (lutInst && lutInst.labelMap && lutInst.labelMap[part.property] && part.var === lutInst.name) {
      return lutInst.labelMap[part.property].bits;
    }
    if (ctx) {
      const other = ctx.inlineInstances && ctx.inlineInstances.get(part.var);
      const otherInst = other || (ctx._lutInstFromComp && ctx._lutInstFromComp(part.var));
      if (otherInst && otherInst.labelMap && otherInst.labelMap[part.property]) {
        return otherInst.labelMap[part.property].bits;
      }
    }
  }
  if (part.var && !part.property && lutInst && typeof isLabelName === 'function' && isLabelName(part.var)) {
    const labelMap = lutInst.labelMap || {};
    if (labelMap[part.var]) return labelMap[part.var].bits;
  }
  if (ctx && part.var) {
    const evaluated = ctx.evalExpr(argExpr, false);
    let value = '';
    for (const p of evaluated) {
      if (p.value && p.value !== '-') value += p.value;
      else if (p.ref && p.ref !== '&-') {
        const v = ctx.getValueFromRef(p.ref);
        if (v) value += v;
      }
    }
    return value;
  }
  return '';
}

function lutMappingExists(inst, keyBits, valueBits) {
  if (!inst || !inst.lutTable) return false;
  const length = inst.attributes.length !== undefined ? parseInt(inst.attributes.length, 10) : 16;
  const addr = parseInt(keyBits, 2);
  if (isNaN(addr) || addr < 0 || addr >= length) return false;
  return inst.lutTable[addr] === valueBits;
}

function lutIsValid(inst, keyExpr, valueExpr, ctx) {
  if (!keyExpr || !valueExpr) {
    throw new Error('isValid() expects two arguments');
  }
  const keyBits = resolveLutArgValue(ctx, keyExpr, inst);
  const valueBits = resolveLutArgValue(ctx, valueExpr, inst);
  const ok = lutMappingExists(inst, keyBits, valueBits);
  return { value: ok ? '1' : '0', bitWidth: 1 };
}

function lutDecode(inst, valueExpr, matchIndexExpr, ctx) {
  if (!valueExpr) throw new Error('decode() expects a value argument');
  const valueBits = resolveLutArgValue(ctx, valueExpr, inst);
  const depth = inst.attributes.depth !== undefined ? parseInt(inst.attributes.depth, 10) : 4;
  const length = inst.attributes.length !== undefined ? parseInt(inst.attributes.length, 10) : 16;
  const addrWidth = lutAddrBits(length);

  let matchIndex = 0;
  if (matchIndexExpr) {
    const idxStr = resolveLutArgValue(ctx, matchIndexExpr, inst);
    matchIndex = parseInt(idxStr, 2);
    if (isNaN(matchIndex)) matchIndex = parseInt(idxStr, 10);
    if (isNaN(matchIndex)) matchIndex = 0;
  }

  const matches = [];
  for (let i = 0; i < length; i++) {
    if (inst.lutTable[i] === valueBits) {
      matches.push(i.toString(2).padStart(addrWidth, '0'));
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

function lutCollapsePrefixFree(inst, dataBits, keyWidth) {
  if (!inst || !inst.lutTable) throw new Error('LUT collapse requires a lookup table');
  const length = inst.attributes.length !== undefined ? parseInt(inst.attributes.length, 10) : 16;
  let pos = 0;
  let out = '';
  while (pos < dataBits.length) {
    let matched = false;
    for (let i = 0; i < length; i++) {
      const val = inst.lutTable[i];
      if (!val || val.length === 0) continue;
      if (dataBits.substr(pos, val.length) === val) {
        out += i.toString(2).padStart(keyWidth, '0');
        pos += val.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      throw new Error(`prefixFree collapse failed at bit offset ${pos}`);
    }
  }
  return out;
}

const lutDecodeExports = {
  lutAddrBits,
  resolveLutArgValue,
  lutMappingExists,
  lutIsValid,
  lutDecode,
  lutCollapsePrefixFree,
};

if (typeof module !== 'undefined' && module.exports) module.exports = lutDecodeExports;
if (typeof globalThis !== 'undefined') Object.assign(globalThis, lutDecodeExports);
