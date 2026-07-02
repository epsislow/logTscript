/**
 * Fixed-point (q4p4, q8p8) and float16 (fp16, bf16) call/display tags for built-ins.
 */
(function (global) {
  'use strict';

  const BUILTIN_FORMAT_TAG_FUNCS = new Set([
    'ADD', 'SUBTRACT', 'SUM', 'MIN', 'MAX',
    'GT', 'LT', 'CLAMP', 'MULTIPLY', 'MAC', 'DOT', 'DIVIDE', 'ABS', 'RSHIFT',
    'ARGMAX', 'ARGMIN',
  ]);

  const FORMAT_TAG_NAMES = new Set(['q4p4', 'q8p8', 'bf16', 'fp16']);

  const NFORMAT_DST_PREFIX = 'to_';

  /** Recognize an NFORMAT format name: signed, sX, q4p4/q8p8/qXpY, fp16, bf16. Returns canonical mode or null. */
  function parseNformatFormatName(name, fail, role) {
    if (name === 'signed' || name === 'fp16' || name === 'bf16') return name;
    if (/^s\d+$/.test(name)) {
      const w = parseInt(name.slice(1), 10);
      if (w < 1 || w > MAX_FORMAT_WIDTH) {
        fail(`NFORMAT: ${role} '${name}' requires signed width 1..${MAX_FORMAT_WIDTH}`);
      }
      return name;
    }
    if (/^q\d+p\d+$/.test(name)) {
      const spec = qModeSpec(name);
      if (!spec || spec.width > MAX_FORMAT_WIDTH) {
        fail(`NFORMAT: ${role} '${name}' requires at most ${MAX_FORMAT_WIDTH} bits (X+Y)`);
      }
      return name;
    }
    return null;
  }

  function parseNformatCallTags(callTags, fail) {
    let src = null;
    let dst = null;
    let vector = false;
    let matrix = false;
    if (!callTags || !callTags.length) {
      fail('NFORMAT: requires format tags (e.g. ; q4p4 to_fp16)');
    }
    for (const t of callTags) {
      if (t.value !== 1) {
        fail(`NFORMAT: tag '${t.name}' must be enabled (use '; ${t.name}' or '; ${t.name}=1')`);
      }
      if (String(t.name).startsWith(NFORMAT_DST_PREFIX)) {
        const inner = String(t.name).slice(NFORMAT_DST_PREFIX.length);
        const mode = parseNformatFormatName(inner, fail, 'destination');
        if (!mode) fail(`NFORMAT: unknown destination tag '${t.name}'`);
        if (dst) fail('NFORMAT: duplicate destination format tag');
        dst = mode;
      } else if (t.name === 'vector') {
        if (vector) fail('NFORMAT: duplicate tag \'vector\'');
        vector = true;
      } else if (t.name === 'matrix') {
        if (matrix) fail('NFORMAT: duplicate tag \'matrix\'');
        matrix = true;
      } else {
        const mode = parseNformatFormatName(t.name, fail, 'source');
        if (!mode) fail(`NFORMAT: unknown tag '${t.name}'`);
        if (src) fail('NFORMAT: duplicate source format tag');
        src = mode;
      }
    }
    if (vector && matrix) {
      fail('NFORMAT: \'vector\' and \'matrix\' are mutually exclusive');
    }
    if (!src) {
      fail('NFORMAT: requires source format tag (signed, sX, q4p4/qXpY, fp16, bf16)');
    }
    if (!dst) {
      fail('NFORMAT: requires destination tag (to_signed, to_sX, to_qXpY, to_fp16, to_bf16)');
    }
    if (src === dst) {
      fail(`NFORMAT: source and destination format '${src}' are the same`);
    }
    return { src, dst, vector, matrix };
  }

  function assertNformatSrcWidth(srcMode, width) {
    if (srcMode === 'signed') return;
    const w = getFormatModeWidth(srcMode);
    if (width !== w) {
      throw new Error(`NFORMAT: ; ${srcMode} requires ${w}-bit operand, got ${width}`);
    }
  }

  function decodeNformatValue(bits, width, srcMode) {
    const padded = String(bits).padStart(width, '0');
    if (srcMode === 'signed' || isSignedWidthMode(srcMode)) {
      return Number(signedBinToBigInt(padded));
    }
    if (qModeSpec(srcMode)) {
      return fixedRawToNumber(padded, srcMode);
    }
    return decodeToFloat(padded, srcMode, width);
  }

  function encodeNformatValue(value, dstMode, resultWidth) {
    if (Number.isNaN(value)) {
      if (dstMode === 'fp16' || dstMode === 'bf16') {
        return encodeFromFloat(NaN, dstMode);
      }
      return '0'.repeat(resultWidth);
    }
    if (dstMode === 'signed' || isSignedWidthMode(dstMode)) {
      return signedBigIntToBin(BigInt(Math.round(value)), resultWidth);
    }
    if (qModeSpec(dstMode)) {
      return fixedNumberToRaw(value, dstMode);
    }
    return encodeFromFloat(value, dstMode);
  }

  function signedConvertStatus(realValue, rawResult, width) {
    const decoded = Number(signedBinToBigInt(rawResult));
    const min = Number(-(BigInt(1) << BigInt(width - 1)));
    const max = Number((BigInt(1) << BigInt(width - 1)) - BigInt(1));
    const rounded = Math.round(realValue);
    const overflow = rounded < min || rounded > max;
    const inexact = !overflow && realValue !== decoded;
    return buildStatus({ overflow, inexact });
  }

  function floatConvertStatus(realValue, rawResult, dstMode) {
    const resultFin = decodeToFloat(rawResult, dstMode, 16);
    const nan = Number.isNaN(realValue) || Number.isNaN(resultFin);
    const overflow = !nan && Number.isFinite(realValue)
      && (resultFin === Infinity || resultFin === -Infinity);
    let inexact = false;
    if (!nan && Number.isFinite(resultFin)) {
      const roundtrip = decodeToFloat(encodeFromFloat(resultFin, dstMode), dstMode, 16);
      inexact = realValue !== roundtrip;
    }
    const underflow = !nan && !overflow && resultFin === 0
      && Number.isFinite(realValue) && realValue !== 0;
    return buildStatus({ overflow, underflow, inexact, nan });
  }

  function convertFormatStatus(srcMode, dstMode, realValue, rawResult, resultWidth) {
    if (srcMode === 'fp16' || srcMode === 'bf16') {
      if (Number.isNaN(realValue)) {
        return buildStatus({ nan: true });
      }
    }
    if (qModeSpec(dstMode)) {
      return fixedStatusForMath(dstMode, realValue, rawResult);
    }
    if (dstMode === 'signed' || isSignedWidthMode(dstMode)) {
      return signedConvertStatus(realValue, rawResult, resultWidth);
    }
    if (dstMode === 'fp16' || dstMode === 'bf16') {
      return floatConvertStatus(realValue, rawResult, dstMode);
    }
    return buildStatus({});
  }

  function convertFormat(bits, width, srcMode, dstMode) {
    if (srcMode === dstMode) {
      throw new Error(`NFORMAT: source and destination format '${srcMode}' are the same`);
    }
    assertNformatSrcWidth(srcMode, width);
    const resultWidth = dstMode === 'signed' ? width : getFormatModeWidth(dstMode);
    const realValue = decodeNformatValue(bits, width, srcMode);
    if ((srcMode === 'fp16' || srcMode === 'bf16') && Number.isNaN(realValue)) {
      const result = encodeNformatValue(NaN, dstMode, resultWidth);
      return { result, status: buildStatus({ nan: true }) };
    }
    const result = encodeNformatValue(realValue, dstMode, resultWidth);
    const status = convertFormatStatus(srcMode, dstMode, realValue, result, resultWidth);
    return { result, status };
  }

  const FIXED_SPECS = {
    q4p4: { width: 8, fracBits: 4 },
    q8p8: { width: 16, fracBits: 8 },
  };

  const MAX_FORMAT_WIDTH = 64;
  const STATUS_WIDTH = 4;

  function buildStatus(opts) {
    const o = opts || {};
    return (o.overflow ? '1' : '0')
      + (o.underflow ? '1' : '0')
      + (o.inexact ? '1' : '0')
      + (o.nan ? '1' : '0');
  }

  function statusFromOverflowFlag(flag) {
    return buildStatus({ overflow: flag === '1' });
  }

  function usesFormatStatus(mode) {
    return isBuiltinNumericFormatMode(mode) || isSignedWidthMode(mode);
  }

  function fixedStatusForMath(mode, mathValue, rawResult) {
    const { min, max } = fixedMinMax(mode);
    const overflow = mathValue < min || mathValue > max;
    let inexact = false;
    if (!overflow && rawResult != null) {
      const decoded = fixedRawToNumber(rawResult, mode);
      inexact = decoded !== mathValue;
    }
    return buildStatus({ overflow, inexact });
  }

  function floatStatus(aFin, bFin, resultFin, mode) {
    const nan = Number.isNaN(resultFin) || Number.isNaN(aFin) || Number.isNaN(bFin);
    const overflow = !nan
      && Number.isFinite(aFin) && Number.isFinite(bFin)
      && (resultFin === Infinity || resultFin === -Infinity);
    let inexact = false;
    if (!nan && Number.isFinite(resultFin)) {
      const roundtrip = decodeToFloat(encodeFromFloat(resultFin, mode), mode, 16);
      inexact = resultFin !== roundtrip;
    }
    const underflow = !nan && !overflow && resultFin === 0
      && Number.isFinite(aFin) && Number.isFinite(bFin)
      && aFin !== 0 && bFin !== 0;
    return buildStatus({ overflow, underflow, inexact, nan });
  }

  function isFormatMode(mode) {
    return FORMAT_TAG_NAMES.has(mode);
  }

  function qModeSpec(mode) {
    const fixed = FIXED_SPECS[mode];
    if (fixed) {
      return { width: fixed.width, fracBits: fixed.fracBits, intBits: fixed.width - fixed.fracBits };
    }
    const m = /^q(\d+)p(\d+)$/.exec(String(mode));
    if (!m) return null;
    const X = parseInt(m[1], 10);
    const Y = parseInt(m[2], 10);
    return { width: X + Y, fracBits: Y, intBits: X };
  }

  function isSignedWidthMode(mode) {
    return /^s\d+$/.test(String(mode));
  }

  function signedWidthFromMode(mode) {
    const m = /^s(\d+)$/.exec(String(mode));
    return m ? parseInt(m[1], 10) : null;
  }

  function isBuiltinNumericFormatMode(mode) {
    if (isFormatMode(mode)) return true;
    if (/^q\d+p\d+$/.test(String(mode))) {
      try {
        parseBuiltinFormatTag(mode);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  function isNumericFormatMode(mode) {
    return isBuiltinNumericFormatMode(mode) || isSignedWidthMode(mode);
  }

  function resolveFormatSpec(mode) {
    if (mode === 'fp16' || mode === 'bf16') {
      return { kind: 'float', width: 16, tagSuffix: mode };
    }
    if (isSignedWidthMode(mode)) {
      const w = signedWidthFromMode(mode);
      return { kind: 'signed', width: w, tagSuffix: mode };
    }
    const q = qModeSpec(mode);
    if (q) {
      return {
        kind: 'fixed',
        width: q.width,
        fracBits: q.fracBits,
        intBits: q.intBits,
        tagSuffix: mode,
      };
    }
    return null;
  }

  function parseBuiltinFormatTag(tagStr) {
    const tag = parseLiteralTag(tagStr);
    if (tag.kind === 'ascii' || tag.kind === 'unsigned') {
      throw new Error(`Format tag '${tagStr}' is not valid for built-in calls`);
    }
    return tag;
  }

  /** ASHR semantics on raw bits (signed + fixed-point Q formats + sX). */
  function usesArithmeticRshift(mode) {
    return mode === true || qModeSpec(mode) != null || isSignedWidthMode(mode);
  }

  function rejectsFloatRshift(mode, opName) {
    if (mode === 'fp16' || mode === 'bf16') {
      throw new Error(`${opName}: does not accept tag '${mode}'`);
    }
  }

  function compareTagged(a, b, signedOrMode, compareFns) {
    if (isBuiltinNumericFormatMode(signedOrMode)) {
      return compareValues(a, b, signedOrMode);
    }
    if (signedOrMode && compareFns && compareFns.signed) {
      return compareFns.signed(a, b);
    }
    return compareFns.unsigned(a, b);
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
    const qspec = qModeSpec(mode);
    if (qspec) {
      if (width !== qspec.width) {
        throw new Error(`${opName}: ; ${mode} requires ${qspec.width}-bit operands, got ${width}`);
      }
      return;
    }
    if (mode === 'bf16' || mode === 'fp16') {
      if (width !== 16) {
        throw new Error(`${opName}: ; ${mode} requires 16-bit operands, got ${width}`);
      }
    }
  }

  function fixedRawToNumber(raw, mode) {
    const spec = qModeSpec(mode);
    if (!spec) throw new Error(`Unknown fixed format: ${mode}`);
    return genericFixedRawToNumber(raw, spec.width, spec.fracBits);
  }

  function fixedNumberToRaw(value, mode) {
    const spec = qModeSpec(mode);
    if (!spec) throw new Error(`Unknown fixed format: ${mode}`);
    return genericFixedNumberToRaw(value, spec.width, spec.fracBits);
  }

  function fixedMinMax(mode) {
    const spec = qModeSpec(mode);
    if (!spec) throw new Error(`Unknown fixed format: ${mode}`);
    const scale = Number(BigInt(1) << BigInt(spec.fracBits));
    const maxInt = Number((BigInt(1) << BigInt(spec.width - 1)) - BigInt(1));
    const minInt = Number(-(BigInt(1) << BigInt(spec.width - 1)));
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
    if (qModeSpec(mode)) {
      const ap = String(a).padStart(width, '0');
      const bp = String(b).padStart(width, '0');
      const va = fixedRawToNumber(ap, mode);
      const vb = fixedRawToNumber(bp, mode);
      const vs = va + vb;
      const aNum = BigInt('0b' + ap);
      const bNum = BigInt('0b' + bp);
      const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
      const result = ((aNum + bNum) & mask).toString(2).padStart(width, '0');
      return { result, status: fixedStatusForMath(mode, vs, result) };
    }
    const af = decodeToFloat(a, mode, width);
    const bf = decodeToFloat(b, mode, width);
    let sum = af + bf;
    if (Number.isNaN(af) || Number.isNaN(bf)) sum = NaN;
    const result = encodeFromFloat(sum, mode);
    return { result, status: floatStatus(af, bf, sum, mode) };
  }

  function subtractAtWidth(a, b, width, mode) {
    assertFormatWidth(mode, width, 'SUBTRACT');
    if (qModeSpec(mode)) {
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
      return { result, status: fixedStatusForMath(mode, vs, result) };
    }
    const af = decodeToFloat(a, mode, width);
    const bf = decodeToFloat(b, mode, width);
    let diff = af - bf;
    if (Number.isNaN(af) || Number.isNaN(bf)) diff = NaN;
    const result = encodeFromFloat(diff, mode);
    return { result, status: floatStatus(af, bf, diff, mode) };
  }

  function sumExpanded(values, X, mode) {
    assertFormatWidth(mode, X, 'SUM');
    if (qModeSpec(mode)) {
      let acc = 0;
      for (const v of values) {
        acc += fixedRawToNumber(v, mode);
      }
      const spec = qModeSpec(mode);
      const scale = BigInt(1) << BigInt(spec.fracBits);
      const accRaw = BigInt(Math.round(acc * Number(scale)));
      const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
      const result = (accRaw & maskX).toString(2).padStart(X, '0');
      const over = ((accRaw >> BigInt(X)) & maskX).toString(2).padStart(X, '0');
      const status = fixedStatusForMath(mode, acc, result);
      const overflow = status[0] === '1';
      return { result, over: overflow ? over : '0'.repeat(X), status };
    }
    let acc = 0;
    let hadException = false;
    let aFin = 0;
    let bFin = 0;
    for (let i = 0; i < values.length; i++) {
      const f = decodeToFloat(values[i], mode, X);
      if (i === 0) aFin = f;
      else if (i === 1) bFin = f;
      const prev = acc;
      acc = f + acc;
      if (Number.isNaN(f)) acc = NaN;
      if (!Number.isFinite(acc) || (Number.isFinite(prev) && Number.isFinite(f) && !Number.isFinite(acc))) {
        hadException = true;
      }
      acc = decodeToFloat(encodeFromFloat(acc, mode), mode, X);
    }
    const result = encodeFromFloat(acc, mode);
    const over = hadException ? result : '0'.repeat(X);
    const status = floatStatus(aFin, bFin, acc, mode);
    return { result, over, status };
  }

  function compareValues(a, b, mode) {
    if (qModeSpec(mode)) {
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

  function multiplyAtWidth(a, b, width, mode) {
    assertFormatWidth(mode, width, 'MULTIPLY');
    if (qModeSpec(mode)) {
      const spec = qModeSpec(mode);
      const ap = String(a).padStart(width, '0');
      const bp = String(b).padStart(width, '0');
      const rawA = signedBinToBigInt(ap);
      const rawB = signedBinToBigInt(bp);
      const scaled = rawA * rawB >> BigInt(spec.fracBits);
      const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
      const result = signedBigIntToBin(scaled & mask, width);
      const over = ((scaled >> BigInt(width)) & mask).toString(2).padStart(width, '0');
      const vp = fixedRawToNumber(ap, mode) * fixedRawToNumber(bp, mode);
      const decoded = fixedRawToNumber(result, mode);
      const status = fixedStatusForMath(mode, vp, result);
      return { result, over, status };
    }
    const af = decodeToFloat(a, mode, width);
    const bf = decodeToFloat(b, mode, width);
    let prod = af * bf;
    if (Number.isNaN(af) || Number.isNaN(bf)) prod = NaN;
    const result = encodeFromFloat(prod, mode);
    const status = floatStatus(af, bf, prod, mode);
    const over = status[0] === '1' || status[3] === '1' ? result : '0'.repeat(width);
    return { result, over, status };
  }

  function macAtWidth(acc, a, b, mode) {
    const width = acc.length;
    if (a.length !== width || b.length !== width) {
      throw new Error('MAC: all arguments must have the same bit width');
    }
    assertFormatWidth(mode, width, 'MAC');
    if (qModeSpec(mode)) {
      const sum = fixedRawToNumber(acc, mode)
        + fixedRawToNumber(a, mode) * fixedRawToNumber(b, mode);
      const spec = qModeSpec(mode);
      const accRaw = BigInt(Math.round(sum * Number(BigInt(1) << BigInt(spec.fracBits))));
      const maskN = (BigInt(1) << BigInt(width)) - BigInt(1);
      const maskOver = (BigInt(1) << BigInt(width + 1)) - BigInt(1);
      const result = (accRaw & maskN).toString(2).padStart(width, '0');
      const over = ((accRaw >> BigInt(width)) & maskOver).toString(2).padStart(width + 1, '0');
      const status = fixedStatusForMath(mode, sum, result);
      return { result, over, status };
    }
    const af = decodeToFloat(acc, mode, width);
    const pf = decodeToFloat(a, mode, width) * decodeToFloat(b, mode, width);
    let sum = af + pf;
    if (Number.isNaN(af) || Number.isNaN(pf)) sum = NaN;
    const result = encodeFromFloat(sum, mode);
    const status = floatStatus(af, pf, sum, mode);
    const overW = width + 1;
    const over = status[0] === '1' || status[3] === '1'
      ? result.padStart(overW, '0').slice(-overW)
      : '0'.repeat(overW);
    return { result, over, status };
  }

  function divideAtWidth(a, b, width, mode) {
    assertFormatWidth(mode, width, 'DIVIDE');
    const ap = String(a).padStart(width, '0');
    const bp = String(b).padStart(width, '0');
    if (qModeSpec(mode)) {
      const va = fixedRawToNumber(ap, mode);
      const vb = fixedRawToNumber(bp, mode);
      if (vb === 0) {
        return {
          result: '0'.repeat(width),
          mod: '0'.repeat(width),
          status: buildStatus({ nan: true }),
        };
      }
      const q = va / vb;
      const r = va - q * vb;
      const result = fixedNumberToRaw(q, mode);
      const mod = fixedNumberToRaw(r, mode);
      const status = fixedStatusForMath(mode, q, result);
      return { result, mod, status };
    }
    const af = decodeToFloat(ap, mode, width);
    const bf = decodeToFloat(bp, mode, width);
    if (bf === 0 || Number.isNaN(bf)) {
      const nan = encodeFromFloat(NaN, mode);
      return { result: nan, mod: nan, status: buildStatus({ nan: true }) };
    }
    const q = af / bf;
    const r = af % bf;
    const result = encodeFromFloat(q, mode);
    const mod = encodeFromFloat(r, mode);
    const status = floatStatus(af, bf, q, mode);
    return { result, mod, status };
  }

  function dotExpanded(aVals, bVals, X, mode) {
    if (aVals.length !== bVals.length) {
      throw new Error('DOT: vectors must have the same number of elements');
    }
    assertFormatWidth(mode, X, 'DOT');
    if (qModeSpec(mode)) {
      let acc = 0;
      for (let i = 0; i < aVals.length; i++) {
        acc += fixedRawToNumber(aVals[i], mode) * fixedRawToNumber(bVals[i], mode);
      }
      const spec = qModeSpec(mode);
      const accRaw = BigInt(Math.round(acc * Number(BigInt(1) << BigInt(spec.fracBits))));
      const maskX = (BigInt(1) << BigInt(X)) - BigInt(1);
      const maskOver = (BigInt(1) << BigInt(2 * X)) - BigInt(1);
      const result = (accRaw & maskX).toString(2).padStart(X, '0');
      const over = ((accRaw >> BigInt(X)) & maskOver).toString(2).padStart(2 * X, '0');
      const status = fixedStatusForMath(mode, acc, result);
      const overflow = status[0] === '1';
      return { result, over: overflow ? over : '0'.repeat(2 * X), status };
    }
    let acc = 0;
    let hadException = false;
    let aFin = decodeToFloat(aVals[0], mode, X);
    let bFin = decodeToFloat(bVals[0], mode, X);
    for (let i = 0; i < aVals.length; i++) {
      const af = decodeToFloat(aVals[i], mode, X);
      const bf = decodeToFloat(bVals[i], mode, X);
      const term = af * bf;
      const prev = acc;
      acc = prev + (Number.isNaN(term) ? NaN : term);
      if (!Number.isFinite(acc)) hadException = true;
      acc = decodeToFloat(encodeFromFloat(acc, mode), mode, X);
    }
    const result = encodeFromFloat(acc, mode);
    const over = hadException ? result.padStart(2 * X, '0').slice(-2 * X) : '0'.repeat(2 * X);
    const status = floatStatus(aFin, bFin, acc, mode);
    return { result, over, status };
  }

  function clampAtWidth(x, lo, hi, mode) {
    const width = lo.length;
    if (hi.length !== width || String(x).length !== width) {
      throw new Error('CLAMP: min and max must have the same bit width');
    }
    assertFormatWidth(mode, width, 'CLAMP');
    const xp = String(x).padStart(width, '0');
    const lp = String(lo).padStart(width, '0');
    const hp = String(hi).padStart(width, '0');
    if (qModeSpec(mode)) {
      const xn = fixedRawToNumber(xp, mode);
      const lon = fixedRawToNumber(lp, mode);
      const hin = fixedRawToNumber(hp, mode);
      let chosen = xn;
      if (xn < lon) chosen = lon;
      else if (xn > hin) chosen = hin;
      return fixedNumberToRaw(chosen, mode);
    }
    const xn = decodeToFloat(xp, mode, width);
    const lon = decodeToFloat(lp, mode, width);
    const hin = decodeToFloat(hp, mode, width);
    let chosen = xn;
    if (xn < lon) chosen = lon;
    else if (xn > hin) chosen = hin;
    return encodeFromFloat(chosen, mode);
  }

  function absAtWidth(x, width, mode) {
    assertFormatWidth(mode, width, 'ABS');
    const xp = String(x).padStart(width, '0');
    if (qModeSpec(mode)) {
      const n = fixedRawToNumber(xp, mode);
      const { max } = fixedMinMax(mode);
      if (Math.abs(n) > max) {
        return { result: xp, status: buildStatus({ overflow: true }) };
      }
      const av = n < 0 ? -n : n;
      return { result: fixedNumberToRaw(av, mode), status: buildStatus({}) };
    }
    const f = decodeToFloat(xp, mode, width);
    const a = Math.abs(f);
    const result = encodeFromFloat(a, mode);
    const status = floatStatus(f, f, a, mode);
    return { result, status };
  }

  function formatFixedDisplay(binStr, mode) {
    const spec = qModeSpec(mode);
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
    if (qModeSpec(mode)) {
      assertFormatWidth(mode, bitWidth || String(binStr).length, 'show');
      return formatFixedDisplay(binStr, mode);
    }
    if (mode === 'bf16' || mode === 'fp16') {
      assertFormatWidth(mode, bitWidth || String(binStr).length, 'show');
      return formatFloatDisplay(binStr, mode);
    }
    return String(binStr);
  }

  function parseLiteralTag(tagStr) {
    const tag = String(tagStr || '').trim().toLowerCase();
    if (!tag.length) throw new Error('Empty literal tag');

    if (tag === 'ascii') {
      return { kind: 'ascii', elementW: 8, tagSuffix: 'ascii', signed: false, formatMode: null };
    }

    const sm = /^s(\d+)$/.exec(tag);
    if (sm) {
      const w = parseInt(sm[1], 10);
      if (w < 1 || w > 64) throw new Error(`Signed literal width must be 1..64, got ${w}`);
      return { kind: 'signed', elementW: w, tagSuffix: 's' + w, signed: true, formatMode: null };
    }

    const qm = /^q(\d+)p(\d+)$/.exec(tag);
    if (qm) {
      const X = parseInt(qm[1], 10);
      const Y = parseInt(qm[2], 10);
      const W = X + Y;
      if (W > MAX_FORMAT_WIDTH) {
        throw new Error(`Format ${'q' + X + 'p' + Y} requires at most ${MAX_FORMAT_WIDTH} bits (X+Y=${W})`);
      }
      const suffix = 'q' + X + 'p' + Y;
      return {
        kind: 'fixed',
        elementW: W,
        tagSuffix: suffix,
        signed: true,
        formatMode: FIXED_SPECS[suffix] ? suffix : null,
        fracBits: Y,
        intBits: X,
      };
    }

    const bfm = /^bf(\d+)$/.exec(tag);
    if (bfm) {
      const w = parseInt(bfm[1], 10);
      if (w !== 16) throw new Error(`bf literal tag width must be 16, got ${w}`);
      return { kind: 'float', elementW: 16, tagSuffix: 'bf16', signed: true, formatMode: 'bf16' };
    }

    const fpm = /^fp(\d+)$/.exec(tag);
    if (fpm) {
      const w = parseInt(fpm[1], 10);
      if (w !== 16) throw new Error(`fp literal tag width must be 16, got ${w}`);
      return { kind: 'float', elementW: 16, tagSuffix: 'fp16', signed: true, formatMode: 'fp16' };
    }

    const um = /^(\d+)$/.exec(tag);
    if (um) {
      const w = parseInt(um[1], 10);
      if (w < 1 || w > 64) throw new Error(`Unsigned literal width must be 1..64, got ${w}`);
      return { kind: 'unsigned', elementW: w, tagSuffix: String(w), signed: false, formatMode: null };
    }

    throw new Error(`Unknown literal tag: ${tagStr}`);
  }

  function getFormatModeWidth(mode) {
    const q = qModeSpec(mode);
    if (q) return q.width;
    if (mode === 'fp16' || mode === 'bf16') return 16;
    if (isSignedWidthMode(mode)) return signedWidthFromMode(mode);
    return null;
  }

  function tagParsedFromFormatMode(mode) {
    if (qModeSpec(mode)) {
      const spec = qModeSpec(mode);
      const fracBits = spec.fracBits;
      const intBits = spec.width - fracBits;
      return {
        kind: 'fixed',
        elementW: spec.width,
        tagSuffix: mode,
        signed: true,
        formatMode: mode,
        fracBits,
        intBits,
      };
    }
    if (mode === 'fp16' || mode === 'bf16') {
      return { kind: 'float', elementW: 16, tagSuffix: mode, signed: true, formatMode: mode };
    }
    return parseLiteralTag(mode);
  }

  function genericFixedRawToNumber(raw, width, fracBits) {
    const scale = BigInt(1) << BigInt(fracBits);
    const n = signedBinToBigInt(String(raw).padStart(width, '0'));
    return Number(n) / Number(scale);
  }

  function genericFixedNumberToRaw(value, width, fracBits) {
    const scale = BigInt(1) << BigInt(fracBits);
    const rounded = BigInt(Math.round(value * Number(scale)));
    return signedBigIntToBin(rounded, width);
  }

  function formatFixedLiteralText(binStr, tagParsed) {
    let text;
    if (tagParsed.formatMode && qModeSpec(tagParsed.formatMode)) {
      text = formatFixedDisplay(binStr, tagParsed.formatMode);
    } else {
      const n = genericFixedRawToNumber(binStr, tagParsed.elementW, tagParsed.fracBits);
      if (Object.is(n, -0)) text = '-0';
      else text = String(n);
    }
    if (text.startsWith('-')) return '\\' + text;
    return '\\' + text;
  }

  function formatGroupedElementLiteral(binStr, tagParsed) {
    const w = tagParsed.elementW;
    const bits = String(binStr).padStart(w, '0');
    if (tagParsed.kind === 'unsigned' || tagParsed.kind === 'ascii') {
      const n = BigInt('0b' + bits);
      return '\\' + n.toString();
    }
    if (tagParsed.kind === 'signed') {
      const n = signedBinToBigInt(bits);
      if (n < 0n) return '\\' + n.toString();
      return '\\' + n.toString();
    }
    if (tagParsed.kind === 'fixed') {
      return formatFixedLiteralText(bits, tagParsed);
    }
    if (tagParsed.kind === 'float') {
      const text = formatFloatDisplay(bits, tagParsed.formatMode);
      if (text.startsWith('-')) return '\\' + text;
      return '\\' + text;
    }
    return '\\' + bits;
  }

  function formatGroupedShow(binStr, modeOrTag, options) {
    const opts = options || {};
    const tagParsed = typeof modeOrTag === 'string' && isNumericFormatMode(modeOrTag)
      ? tagParsedFromFormatMode(modeOrTag)
      : (typeof modeOrTag === 'object' && modeOrTag != null && modeOrTag.kind
        ? modeOrTag
        : tagParsedFromFormatMode(String(modeOrTag)));
    const elementW = opts.elementWidth || tagParsed.elementW;
    const bits = String(binStr == null ? '' : binStr);
    const complete = Math.floor(bits.length / elementW);
    const restLen = bits.length % elementW;
    const elems = [];
    for (let i = 0; i < complete; i++) {
      elems.push(formatGroupedElementLiteral(bits.substring(i * elementW, (i + 1) * elementW), tagParsed));
    }
    if (!elems.length && restLen > 0) {
      return bits.substring(complete * elementW);
    }
    let out = elems.join(' ');
    if (elems.length) out += ';' + tagParsed.tagSuffix;
    if (restLen > 0) {
      const rest = bits.substring(complete * elementW);
      out += (elems.length ? ' + ' : '') + rest;
    }
    return out;
  }

  const api = {
    BUILTIN_FORMAT_TAG_FUNCS,
    FORMAT_TAG_NAMES,
    MAX_FORMAT_WIDTH,
    STATUS_WIDTH,
    buildStatus,
    statusFromOverflowFlag,
    usesFormatStatus,
    isFormatMode,
    isBuiltinNumericFormatMode,
    isNumericFormatMode,
    isSignedWidthMode,
    signedWidthFromMode,
    qModeSpec,
    resolveFormatSpec,
    parseBuiltinFormatTag,
    assertFormatWidth,
    addAtWidth,
    subtractAtWidth,
    sumExpanded,
    pickMinMax,
    compareValues,
    compareTagged,
    usesArithmeticRshift,
    rejectsFloatRshift,
    multiplyAtWidth,
    macAtWidth,
    divideAtWidth,
    dotExpanded,
    clampAtWidth,
    absAtWidth,
    formatForShow,
    parseLiteralTag,
    getFormatModeWidth,
    genericFixedNumberToRaw,
    genericFixedRawToNumber,
    formatGroupedShow,
    tagParsedFromFormatMode,
    fixedNumberToRaw,
    fixedRawToNumber,
    decodeToFloat,
    encodeFromFloat,
    parseNformatCallTags,
    convertFormat,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptNumericFormats = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
