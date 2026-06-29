/**
 * Two's-complement helpers for built-in `; signed` call tags (ADD, SUBTRACT, GT, …).
 */
(function (global) {
  'use strict';

  const BUILTIN_SIGNED_TAG_FUNCS = new Set([
    'ADD', 'SUBTRACT', 'GT', 'LT', 'MIN', 'MAX', 'CLAMP',
    'MULTIPLY', 'MAC', 'RSHIFT', 'SUM', 'DOT', 'DIVIDE',
  ]);

  const BUILTIN_VECTOR_TAG_FUNCS = new Set([
    'MIN', 'MAX', 'SUM', 'ADD', 'SUBTRACT', 'CLAMP',
    'MULTIPLY', 'MAC', 'DIVIDE',
    'GT', 'LT', 'EQ', 'RSHIFT', 'LSHIFT', 'LROTATE', 'RROTATE', 'REVERSE',
  ]);

  function signedBinToBigInt(binStr) {
    const s = binStr == null ? '' : String(binStr);
    if (!s.length) return 0n;
    const w = s.length;
    if (s[0] === '1') {
      const unsigned = BigInt('0b' + s);
      return unsigned - (BigInt(1) << BigInt(w));
    }
    return BigInt('0b' + s);
  }

  function signedBigIntToBin(n, width) {
    const mod = BigInt(1) << BigInt(width);
    let v = n % mod;
    if (v < 0n) v += mod;
    return v.toString(2).padStart(width, '0');
  }

  function signedCompareBigInt(a, b) {
    const w = Math.max(a.length, b.length);
    const ai = signedBinToBigInt(a.padStart(w, '0'));
    const bi = signedBinToBigInt(b.padStart(w, '0'));
    if (ai === bi) return 0;
    return ai > bi ? 1 : -1;
  }

  /** Same semantics as aluSignedOverflowAdd in devices/alu-devices.js */
  function signedOverflowAdd(a, b, result) {
    const aNeg = a[0] === '1';
    const bNeg = b[0] === '1';
    const rNeg = result[0] === '1';
    return (aNeg === bNeg && rNeg !== aNeg) ? '1' : '0';
  }

  /** Same semantics as aluSignedOverflowSub in devices/alu-devices.js */
  function signedOverflowSub(a, b, result) {
    const aNeg = a[0] === '1';
    const bNeg = b[0] === '1';
    const rNeg = result[0] === '1';
    return (aNeg !== bNeg && rNeg !== aNeg) ? '1' : '0';
  }

  function requireSameBitWidth(values, opName) {
    const w = values[0].length;
    for (let i = 1; i < values.length; i++) {
      if (values[i].length !== w) {
        throw new Error(`${opName}: all arguments must have the same bit width`);
      }
    }
    return w;
  }

  function pickMinMaxSigned(values, pickMin) {
    const op = pickMin ? 'MIN' : 'MAX';
    requireSameBitWidth(values, op);
    let best = values[0];
    let bestN = signedBinToBigInt(best);
    for (let i = 1; i < values.length; i++) {
      const n = signedBinToBigInt(values[i]);
      if (pickMin ? n < bestN : n > bestN) {
        bestN = n;
        best = values[i];
      }
    }
    return best;
  }

  function clampSigned(x, lo, hi) {
    if (lo.length !== hi.length) {
      throw new Error('CLAMP: min and max must have the same bit width');
    }
    const Y = lo.length;
    const X = x.length;
    const xn = signedBinToBigInt(x);
    const lon = signedBinToBigInt(lo.padStart(X, '0'));
    const hin = signedBinToBigInt(hi.padStart(X, '0'));
    let chosen = xn;
    if (xn < lon) chosen = lon;
    else if (xn > hin) chosen = hin;
    return signedBigIntToBin(chosen, Y);
  }

  function addAtWidth(a, b, width, signed) {
    const depth = width;
    const ap = String(a).padStart(depth, '0');
    const bp = String(b).padStart(depth, '0');
    const aNum = BigInt('0b' + ap);
    const bNum = BigInt('0b' + bp);
    const sum = aNum + bNum;
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    const result = (sum & mask).toString(2).padStart(depth, '0');
    const flag = signed
      ? signedOverflowAdd(ap, bp, result)
      : (sum > mask ? '1' : '0');
    return { result, flag };
  }

  function subtractAtWidth(a, b, width, signed) {
    const depth = width;
    const ap = String(a).padStart(depth, '0');
    const bp = String(b).padStart(depth, '0');
    const aNum = BigInt('0b' + ap);
    const bNum = BigInt('0b' + bp);
    let diff = aNum - bNum;
    const wrap = BigInt(1) << BigInt(depth);
    const mask = wrap - BigInt(1);
    const carry = diff < BigInt(0) ? '1' : '0';
    if (diff < BigInt(0)) diff = diff + wrap;
    const result = (diff & mask).toString(2).padStart(depth, '0');
    const flag = signed
      ? signedOverflowSub(ap, bp, result)
      : carry;
    return { result, flag };
  }

  function multiplyAtWidth(a, b, width, signed) {
    const depth = width;
    const ap = String(a).padStart(depth, '0');
    const bp = String(b).padStart(depth, '0');
    const product = signed
      ? signedBinToBigInt(ap) * signedBinToBigInt(bp)
      : BigInt('0b' + ap) * BigInt('0b' + bp);
    const mask = (BigInt(1) << BigInt(depth)) - BigInt(1);
    const result = (product & mask).toString(2).padStart(depth, '0');
    const over = ((product >> BigInt(depth)) & mask).toString(2).padStart(depth, '0');
    return { result, over };
  }

  function macAtWidth(acc, a, b, signed) {
    const N = acc.length;
    if (a.length !== N || b.length !== N) {
      throw new Error('MAC: all arguments must have the same bit width');
    }
    const full = signed
      ? signedBinToBigInt(acc) + signedBinToBigInt(a) * signedBinToBigInt(b)
      : BigInt('0b' + acc) + BigInt('0b' + a) * BigInt('0b' + b);
    const maskN = (BigInt(1) << BigInt(N)) - BigInt(1);
    const maskOver = (BigInt(1) << BigInt(N + 1)) - BigInt(1);
    const result = (full & maskN).toString(2).padStart(N, '0');
    const over = ((full >> BigInt(N)) & maskOver).toString(2).padStart(N + 1, '0');
    return { result, over };
  }

  function divideAtWidth(a, b, width, signed) {
    const ap = String(a).padStart(width, '0');
    const bp = String(b).padStart(width, '0');
    const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
    const aNum = signed ? signedBinToBigInt(ap) : BigInt('0b' + ap);
    const bNum = signed ? signedBinToBigInt(bp) : BigInt('0b' + bp);
    let quotient;
    let remainder;
    if (bNum === 0n) {
      quotient = 0n;
      remainder = 0n;
    } else {
      quotient = aNum / bNum;
      remainder = aNum % bNum;
    }
    const result = signed
      ? signedBigIntToBin(quotient, width)
      : (quotient & mask).toString(2).padStart(width, '0');
    const mod = signed
      ? signedBigIntToBin(remainder, width)
      : (remainder & mask).toString(2).padStart(width, '0');
    return { result, mod };
  }

  /** Arithmetic shift right (ASHR): MSB replicated as fill. */
  function arithmeticRshift(data, n) {
    const len = data.length;
    const amount = Math.max(0, parseInt(String(n), 2) || 0);
    const fill = data[0] === '1' ? '1' : '0';
    if (amount >= len) return fill.repeat(len);
    return fill.repeat(amount) + data.slice(0, len - amount);
  }

  function parseBuiltinCallTags(callTags, fnName, fail, acceptsSigned, acceptsVector) {
    let signed = false;
    let vector = false;
    if (!callTags || !callTags.length) {
      return { signed, vector };
    }
    for (const t of callTags) {
      if (t.name === 'signed') {
        if (!acceptsSigned) {
          fail(`${fnName}: does not accept tag 'signed'`);
        }
        if (t.value !== 1) {
          fail(`${fnName}: tag 'signed' must be enabled (use '; signed' or '; signed=1')`);
        }
        signed = true;
      } else if (t.name === 'vector') {
        if (!acceptsVector) {
          fail(`${fnName}: does not accept tag 'vector'`);
        }
        if (t.value !== 1) {
          fail(`${fnName}: tag 'vector' must be enabled (use '; vector' or '; vector=1')`);
        }
        vector = true;
      } else {
        fail(`${fnName}: unknown tag '${t.name}'`);
      }
    }
    return { signed, vector };
  }

  /** @deprecated use parseBuiltinCallTags */
  function parseBuiltinSignedCallTags(callTags, fnName, fail) {
    const tags = parseBuiltinCallTags(callTags, fnName, fail, true, false);
    return tags.signed;
  }

  const api = {
    BUILTIN_SIGNED_TAG_FUNCS,
    BUILTIN_VECTOR_TAG_FUNCS,
    parseBuiltinCallTags,
    parseBuiltinSignedCallTags,
    signedBinToBigInt,
    signedCompareBigInt,
    signedOverflowAdd,
    signedOverflowSub,
    pickMinMaxSigned,
    clampSigned,
    addAtWidth,
    subtractAtWidth,
    multiplyAtWidth,
    macAtWidth,
    divideAtWidth,
    arithmeticRshift,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptSignedArithmetic = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
