/**
 * Vector reduction helpers (SUM, DOT operand expand + unsigned math).
 */
(function (global) {
  'use strict';

  function unsignedBinToBigInt(binStr) {
    const s = binStr == null ? '' : String(binStr);
    if (!s.length) return 0n;
    return BigInt('0b' + s);
  }

  function isReductionWireAtom(atom) {
    return atom && atom.var && !atom.property && !atom.internalWire
      && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$';
  }

  function isWholeVectorWireArg(argExpr, getWire) {
    if (!argExpr || argExpr.length !== 1) return false;
    const a = argExpr[0];
    if (!isReductionWireAtom(a)) return false;
    if (a.vectorIndex !== undefined && a.vectorIndex !== null) return false;
    if (a.vectorIndexExpr) return false;
    if (a.bitRange) return false;
    const wire = getWire ? getWire(a.var) : null;
    return !!(wire && wire.vector);
  }

  function isVectorSliceArg(argExpr) {
    if (!argExpr || argExpr.length !== 1) return false;
    const a = argExpr[0];
    if (!isReductionWireAtom(a)) return false;
    if (a.vectorIndex !== undefined && a.vectorIndex !== null) return true;
    return !!a.vectorIndexExpr;
  }

  function getWholeVectorMeta(argExpr, getWire) {
    if (!isWholeVectorWireArg(argExpr, getWire)) return null;
    const wire = getWire(argExpr[0].var);
    return wire ? wire.vector : null;
  }

  function requireSameBitWidth(values, opName) {
    if (!values.length) return 0;
    const w = values[0].length;
    for (let i = 1; i < values.length; i++) {
      if (values[i].length !== w) {
        throw new Error(`${opName}: all arguments must have the same bit width`);
      }
    }
    return w;
  }

  function sumUnsignedExpanded(values, X) {
    let acc = 0n;
    for (const v of values) {
      acc += unsignedBinToBigInt(String(v).padStart(X, '0'));
    }
    const totalBits = 2 * X;
    const maxVal = (BigInt(1) << BigInt(totalBits)) - BigInt(1);
    if (acc > maxVal) {
      const need = acc.toString(2).length;
      throw new Error(
        `SUM: result requires ${totalBits} bits (X=${X}); value needs ${need} bits`
      );
    }
    const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
    const result = (acc & maskX).toString(2).padStart(X, '0');
    const over = (acc >> BigInt(X)).toString(2).padStart(X, '0');
    return { result, over };
  }

  function dotUnsignedExpanded(aVals, bVals, X) {
    if (aVals.length !== bVals.length) {
      throw new Error('DOT: vectors must have the same number of elements');
    }
    let acc = 0n;
    for (let i = 0; i < aVals.length; i++) {
      const a = unsignedBinToBigInt(String(aVals[i]).padStart(X, '0'));
      const b = unsignedBinToBigInt(String(bVals[i]).padStart(X, '0'));
      acc += a * b;
    }
    const totalBits = 3 * X;
    const maxVal = (BigInt(1) << BigInt(totalBits)) - BigInt(1);
    if (acc > maxVal) {
      const need = acc.toString(2).length;
      throw new Error(
        `DOT: result requires ${totalBits} bits (X=${X}); value needs ${need} bits`
      );
    }
    const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
    const result = (acc & maskX).toString(2).padStart(X, '0');
    const over = (acc >> BigInt(X)).toString(2).padStart(2 * X, '0');
    return { result, over };
  }

  /** One vector + one scalar, or two vectors of the same shape → element-wise pairing. */
  function getVectorBroadcastPair(args, getWire) {
    if (!args || args.length !== 2) return null;
    const v0 = isWholeVectorWireArg(args[0], getWire);
    const v1 = isWholeVectorWireArg(args[1], getWire);
    if (v0 && !v1) {
      return { mode: 'vectorScalar', vectorArg: 0, scalarArg: 1, meta: getWire(args[0][0].var).vector };
    }
    if (!v0 && v1) {
      return { mode: 'vectorScalar', vectorArg: 1, scalarArg: 0, meta: getWire(args[1][0].var).vector };
    }
    if (v0 && v1) {
      const m0 = getWire(args[0][0].var).vector;
      const m1 = getWire(args[1][0].var).vector;
      if (m0.elementWidth !== m1.elementWidth || m0.elementCount !== m1.elementCount) return null;
      return { mode: 'vectorVector', meta: m0 };
    }
    return null;
  }

  function addUnsignedAtWidth(a, b, width) {
    const depth = width;
    const aNum = unsignedBinToBigInt(String(a).padStart(depth, '0'));
    const bNum = unsignedBinToBigInt(String(b).padStart(depth, '0'));
    const sum = aNum + bNum;
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    const carry = sum > mask ? '1' : '0';
    const result = (sum & mask).toString(2).padStart(depth, '0');
    return { result, carry };
  }

  const api = {
    unsignedBinToBigInt,
    isReductionWireAtom,
    isWholeVectorWireArg,
    isVectorSliceArg,
    getWholeVectorMeta,
    requireSameBitWidth,
    sumUnsignedExpanded,
    dotUnsignedExpanded,
    getVectorBroadcastPair,
    addUnsignedAtWidth,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptVectorReduce = api;
})(typeof window !== 'undefined' ? window : global);
