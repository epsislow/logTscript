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

  const api = {
    unsignedBinToBigInt,
    isReductionWireAtom,
    isWholeVectorWireArg,
    isVectorSliceArg,
    getWholeVectorMeta,
    requireSameBitWidth,
    sumUnsignedExpanded,
    dotUnsignedExpanded
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptVectorReduce = api;
})(typeof window !== 'undefined' ? window : global);
