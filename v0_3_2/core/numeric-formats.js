/**
 * Fixed-point (q4p4, q8p8) and float16 (fp16, bf16) call/display tags for built-ins.
 */
(function (global) {
  'use strict';

  const BUILTIN_FORMAT_TAG_FUNCS = new Set([
    'ADD', 'SUBTRACT', 'SUM', 'MIN', 'MAX',
  ]);

  const FORMAT_TAG_NAMES = new Set(['q4p4', 'q8p8', 'bf16', 'fp16']);

  const FIXED_SPECS = {
    q4p4: { width: 8, fracBits: 4 },
    q8p8: { width: 16, fracBits: 8 },
  };

  function isFormatMode(mode) {
    return FORMAT_TAG_NAMES.has(mode);
  }

  function signedBinToBigInt(binStr) {
    const s = binStr == null ? '' : String(binStr);
    if (!s.length) return 0n;
    const w = s.length;
    if (s[0] === '1') {
      return BigInt('0b' + s) - (BigInt(1) << BigInt(w));
    }
    return BigInt('0b' + s);
  }

  function signedBigIntToBin(n, width) {
    const mod = BigInt(1) << BigInt(width);
    let v = n % mod;
    if (v < 0n) v += mod;
    return v.toString(2).padStart(width, '0');
  }

  function assertFormatWidth(mode, width, opName) {
    if (mode === 'q4p4' || mode === 'q8p8') {
      const spec = FIXED_SPECS[mode];
      if (width !== spec.width) {
        throw new Error(`${opName}: ; ${mode} requires ${spec.width}-bit operands, got ${width}`);
      }
      return;
    }
    if (mode === 'bf16' || mode === 'fp16') {
      if (width !== 16) {
        throw new Error(`${opName}: ; ${mode} requires 16-bit operands, got ${width}`);
      }
    }
  }

  function fixedSpec(mode) {
    return FIXED_SPECS[mode] || null;
  }

  function fixedRawToNumber(raw, mode) {
    const spec = fixedSpec(mode);
    const scale = BigInt(1) << BigInt(spec.fracBits);
    const n = signedBinToBigInt(String(raw).padStart(spec.width, '0'));
    return Number(n) / Number(scale);
  }

  function fixedNumberToRaw(value, mode) {
    const spec = fixedSpec(mode);
    const scale = BigInt(1) << BigInt(spec.fracBits);
    const rounded = BigInt(Math.round(value * Number(scale)));
    return signedBigIntToBin(rounded, spec.width);
  }

  function fixedMinMax(mode) {
    const spec = fixedSpec(mode);
    const scale = Number(BigInt(1) << BigInt(spec.fracBits));
    const maxInt = (1 << (spec.width - 1)) - 1;
    const minInt = -(1 << (spec.width - 1));
    return { min: minInt / scale, max: maxInt / scale };
  }

  function fixedOverflowFlag(mode, mathValue) {
    const { min, max } = fixedMinMax(mode);
    return (mathValue < min || mathValue > max) ? '1' : '0';
  }

  function fp16ToFloat(bits) {
    const h = bits & 0xffff;
    const sign = (h >> 15) & 1;
    const exp = (h >> 10) & 0x1f;
    const mant = h & 0x3ff;
    if (exp === 0) {
      if (mant === 0) return sign ? -0 : 0;
      return (sign ? -1 : 1) * Math.pow(2, -14) * (mant / 1024);
    }
    if (exp === 31) {
      if (mant === 0) return sign ? -Infinity : Infinity;
      return NaN;
    }
    return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + mant / 1024);
  }

  function floatToFp16(num) {
    const floatView = new Float32Array(1);
    const int32View = new Int32Array(floatView.buffer);
    floatView[0] = num;
    const x = int32View[0];

    let bits = (x >> 16) & 0x8000;
    let m = (x >> 12) & 0x07ff;
    const e = (x >> 23) & 0xff;

    if (e < 103) return bits;
    if (e > 142) {
      bits |= 0x7c00;
      bits |= ((e === 255) ? 0 : 1) && (x & 0x007fffff);
      return bits;
    }
    if (e < 113) {
      m |= 0x0800;
      bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
      return bits;
    }
    bits |= ((e - 112) << 10) | (m >> 1);
    bits += m & 1;
    return bits & 0xffff;
  }

  function bf16ToFloat(bits) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, (bits & 0xffff) << 16);
    return view.getFloat32(0);
  }

  function floatToBf16(num) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setFloat32(0, Math.fround(num));
    return (view.getUint32(0) >> 16) & 0xffff;
  }

  function binToUint16(binStr, width) {
    const w = width || String(binStr).length;
    return parseInt(String(binStr).padStart(w, '0'), 2) & 0xffff;
  }

  function uint16ToBin(bits, width) {
    return (bits & 0xffff).toString(2).padStart(width || 16, '0');
  }

  function decodeToFloat(binStr, mode, width) {
    const bits = binToUint16(binStr, width);
    return mode === 'bf16' ? bf16ToFloat(bits) : fp16ToFloat(bits);
  }

  function encodeFromFloat(value, mode) {
    const bits = mode === 'bf16' ? floatToBf16(value) : floatToFp16(value);
    return uint16ToBin(bits, 16);
  }

  function floatFlag(aFin, bFin, resultFin) {
    const aOk = Number.isFinite(aFin);
    const bOk = Number.isFinite(bFin);
    if (!Number.isFinite(resultFin)) return '1';
    if ((aOk && bOk) && (resultFin === Infinity || resultFin === -Infinity)) return '1';
    return '0';
  }

  function addAtWidth(a, b, width, mode) {
    assertFormatWidth(mode, width, 'ADD');
    if (fixedSpec(mode)) {
      const ap = String(a).padStart(width, '0');
      const bp = String(b).padStart(width, '0');
      const va = fixedRawToNumber(ap, mode);
      const vb = fixedRawToNumber(bp, mode);
      const vs = va + vb;
      const aNum = BigInt('0b' + ap);
      const bNum = BigInt('0b' + bp);
      const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
      const result = ((aNum + bNum) & mask).toString(2).padStart(width, '0');
      return { result, flag: fixedOverflowFlag(mode, vs) };
    }
    const af = decodeToFloat(a, mode, width);
    const bf = decodeToFloat(b, mode, width);
    let sum = af + bf;
    if (Number.isNaN(af) || Number.isNaN(bf)) sum = NaN;
    const result = encodeFromFloat(sum, mode);
    return { result, flag: floatFlag(af, bf, sum) };
  }

  function subtractAtWidth(a, b, width, mode) {
    assertFormatWidth(mode, width, 'SUBTRACT');
    if (fixedSpec(mode)) {
      const ap = String(a).padStart(width, '0');
      const bp = String(b).padStart(width, '0');
      const va = fixedRawToNumber(ap, mode);
      const vb = fixedRawToNumber(bp, mode);
      const vs = va - vb;
      const aNum = BigInt('0b' + ap);
      const bNum = BigInt('0b' + bp);
      const wrap = BigInt(1) << BigInt(width);
      const mask = wrap - BigInt(1);
      let diff = aNum - bNum;
      if (diff < 0n) diff += wrap;
      const result = (diff & mask).toString(2).padStart(width, '0');
      return { result, flag: fixedOverflowFlag(mode, vs) };
    }
    const af = decodeToFloat(a, mode, width);
    const bf = decodeToFloat(b, mode, width);
    let diff = af - bf;
    if (Number.isNaN(af) || Number.isNaN(bf)) diff = NaN;
    const result = encodeFromFloat(diff, mode);
    return { result, flag: floatFlag(af, bf, diff) };
  }

  function sumExpanded(values, X, mode) {
    assertFormatWidth(mode, X, 'SUM');
    if (fixedSpec(mode)) {
      let acc = 0;
      for (const v of values) {
        acc += fixedRawToNumber(v, mode);
      }
      const spec = fixedSpec(mode);
      const scale = BigInt(1) << BigInt(spec.fracBits);
      const accRaw = BigInt(Math.round(acc * Number(scale)));
      const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
      const result = (accRaw & maskX).toString(2).padStart(X, '0');
      const over = ((accRaw >> BigInt(X)) & maskX).toString(2).padStart(X, '0');
      const flag = fixedOverflowFlag(mode, acc);
      return { result, over: flag === '1' ? over : '0'.repeat(X) };
    }
    let acc = 0;
    let flag = '0';
    for (const v of values) {
      const f = decodeToFloat(v, mode, X);
      const prev = acc;
      acc = f + acc;
      if (Number.isNaN(f)) acc = NaN;
      if (!Number.isFinite(acc) || (Number.isFinite(prev) && Number.isFinite(f) && !Number.isFinite(acc))) {
        flag = '1';
      }
      acc = decodeToFloat(encodeFromFloat(acc, mode), mode, X);
    }
    const result = encodeFromFloat(acc, mode);
    const over = flag === '1' ? result : '0'.repeat(X);
    return { result, over };
  }

  function compareValues(a, b, mode) {
    if (fixedSpec(mode)) {
      const va = fixedRawToNumber(a, mode);
      const vb = fixedRawToNumber(b, mode);
      if (va === vb) return 0;
      return va > vb ? 1 : -1;
    }
    const fa = decodeToFloat(a, mode, 16);
    const fb = decodeToFloat(b, mode, 16);
    if (fa === fb) return 0;
    return fa > fb ? 1 : -1;
  }

  function pickMinMax(values, pickMin, mode) {
    const op = pickMin ? 'MIN' : 'MAX';
    const w = values[0].length;
    for (let i = 1; i < values.length; i++) {
      if (values[i].length !== w) {
        throw new Error(`${op}: all arguments must have the same bit width`);
      }
    }
    assertFormatWidth(mode, w, op);
    let best = values[0];
    for (let i = 1; i < values.length; i++) {
      const cmp = compareValues(values[i], best, mode);
      if (pickMin ? cmp < 0 : cmp > 0) best = values[i];
    }
    return best;
  }

  function formatFixedDisplay(binStr, mode) {
    const spec = fixedSpec(mode);
    const w = spec.width;
    const n = fixedRawToNumber(binStr, mode);
    if (Object.is(n, -0)) return '-0';
    const s = n.toString();
    if (s.includes('e') || s.includes('E')) return s;
    return s;
  }

  function formatFloatDisplay(binStr, mode) {
    const f = decodeToFloat(binStr, mode, 16);
    if (Number.isNaN(f)) return 'nan';
    if (f === Infinity) return 'inf';
    if (f === -Infinity) return '-inf';
    if (Object.is(f, -0)) return '-0';
    return String(f);
  }

  function formatForShow(binStr, bitWidth, mode) {
    if (fixedSpec(mode)) {
      assertFormatWidth(mode, bitWidth || String(binStr).length, 'show');
      return formatFixedDisplay(binStr, mode);
    }
    if (mode === 'bf16' || mode === 'fp16') {
      assertFormatWidth(mode, bitWidth || String(binStr).length, 'show');
      return formatFloatDisplay(binStr, mode);
    }
    return String(binStr);
  }

  const api = {
    BUILTIN_FORMAT_TAG_FUNCS,
    FORMAT_TAG_NAMES,
    isFormatMode,
    assertFormatWidth,
    addAtWidth,
    subtractAtWidth,
    sumExpanded,
    pickMinMax,
    compareValues,
    formatForShow,
    fixedRawToNumber,
    decodeToFloat,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptNumericFormats = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
