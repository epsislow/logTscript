/**
 * Logic wire boundary float formats — F40b (q*, fp16, bf16, f32, f64, X).
 */
(function (global) {
  'use strict';

  const F40B_IEEE_FORMAT_RE = /^(fp16|bf16|f32|f64|X)$/;

  function logicQModeSpec(format) {
    const NF = global.LogTScriptNumericFormats;
    if (!NF || typeof NF.qModeSpec !== 'function') return null;
    return NF.qModeSpec(format);
  }

  function logicIsFixedPointFormat(format) {
    return logicQModeSpec(format) != null;
  }

  function logicIsIeeeHalfFormat(format) {
    return format === 'fp16' || format === 'bf16';
  }

  function parseLogicFloatFormatToken(name, ctxLabel) {
    const tok = name == null ? '' : String(name);
    const where = ctxLabel ? `${ctxLabel}: ` : '';
    if (F40B_IEEE_FORMAT_RE.test(tok)) return tok;
    if (logicQModeSpec(tok)) {
      const spec = logicQModeSpec(tok);
      const NF = global.LogTScriptNumericFormats;
      const maxW = NF && NF.MAX_FORMAT_WIDTH != null ? NF.MAX_FORMAT_WIDTH : 64;
      if (spec.width < 1 || spec.width > maxW) {
        throw new Error(`${where}float format '${tok}' width must be 1..${maxW}`);
      }
      return tok;
    }
    throw new Error(
      `${where}unsupported float format '${tok}' (use q4p4, q8p8, qXpY, fp16, bf16, f32, f64, or X)`,
    );
  }

  function logicFloatFormatBitWidth(format, wireWidth) {
    if (!format || format === 'X') return wireWidth;
    if (format === 'f32') return 32;
    if (format === 'f64') return 64;
    if (logicIsIeeeHalfFormat(format)) return 16;
    const qspec = logicQModeSpec(format);
    if (qspec) return qspec.width;
    return wireWidth;
  }

  function logicResolveFloatFormat(format, wireWidth) {
    if (!format || format === 'X') {
      if (wireWidth === 16) return 'fp16';
      if (wireWidth === 32) return 'f32';
      if (wireWidth === 64) return 'f64';
      throw new Error(
        `float: wire width ${wireWidth} has no default float format (use float/q4p4 or other explicit format)`,
      );
    }
    return format;
  }

  function binToFloat32(bits) {
    const padded = String(bits).padStart(32, '0').slice(-32);
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, parseInt(padded, 2), false);
    return view.getFloat32(0, false);
  }

  function float32ToBin(value) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setFloat32(0, value, false);
    return view.getUint32(0).toString(2).padStart(32, '0');
  }

  function binToFloat64(bits) {
    const padded = String(bits).padStart(64, '0').slice(-64);
    const hi = parseInt(padded.slice(0, 32), 2);
    const lo = parseInt(padded.slice(32), 2);
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(0, hi, false);
    view.setUint32(4, lo, false);
    return view.getFloat64(0, false);
  }

  function float64ToBin(value) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setFloat64(0, value, false);
    const hi = view.getUint32(0, false);
    const lo = view.getUint32(4, false);
    return hi.toString(2).padStart(32, '0') + lo.toString(2).padStart(32, '0');
  }

  function logicDecodeFloatBits(bits, floatFormat) {
    const width = bits.length;
    const format = logicResolveFloatFormat(floatFormat, width);
    const NF = global.LogTScriptNumericFormats;
    if (logicIsFixedPointFormat(format)) {
      if (!NF || typeof NF.fixedRawToNumber !== 'function') {
        throw new Error('LogTScriptNumericFormats is not loaded');
      }
      return NF.fixedRawToNumber(bits, format);
    }
    if (format === 'f32') return binToFloat32(bits);
    if (format === 'f64') return binToFloat64(bits);
    if (!NF || typeof NF.decodeToFloat !== 'function') {
      throw new Error('LogTScriptNumericFormats is not loaded');
    }
    return NF.decodeToFloat(bits, format, width);
  }

  function logicEncodeFloatValue(v, width, floatFormat) {
    const format = logicResolveFloatFormat(floatFormat, width);
    const NF = global.LogTScriptNumericFormats;
    if (logicIsFixedPointFormat(format)) {
      if (!NF || typeof NF.fixedNumberToRaw !== 'function') {
        throw new Error('LogTScriptNumericFormats is not loaded');
      }
      return NF.fixedNumberToRaw(v, format);
    }
    if (format === 'f32') return float32ToBin(v).slice(-width).padStart(width, '0');
    if (format === 'f64') return float64ToBin(v).slice(-width).padStart(width, '0');
    if (!NF || typeof NF.encodeFromFloat !== 'function') {
      throw new Error('LogTScriptNumericFormats is not loaded');
    }
    const raw = NF.encodeFromFloat(v, format);
    return raw.slice(-width).padStart(width, '0');
  }

  function logicValidateFloatFormatWidth(floatFormat, wireWidth, ctxLabel) {
    const resolved = logicResolveFloatFormat(floatFormat, wireWidth);
    const fw = logicFloatFormatBitWidth(resolved, wireWidth);
    if (fw !== wireWidth) {
      const label = ctxLabel || 'logic';
      throw new Error(
        `${label}: float format width ${fw} does not match wire width ${wireWidth}`,
      );
    }
  }

  function logicBindTargetBitWidth(wire, ctx, listFlag, eachScalarFlag) {
    const shapeFn = typeof global.logicWireShape === 'function' ? global.logicWireShape : null;
    const shape = wire && shapeFn ? shapeFn(wire, ctx) : null;
    if (listFlag) {
      if (shape && (shape.kind === 'vector' || shape.kind === 'matrix')) return shape.ew;
      return ctx.getBitWidth(wire.type);
    }
    if (eachScalarFlag && shape && (shape.kind === 'vector' || shape.kind === 'matrix')) {
      return shape.ew;
    }
    return ctx.getBitWidth(wire.type);
  }

  function logicValidateFloatBindAgainstWire(floatFormat, listFlag, wire, ctx, ctxLabel, eachScalarFlag) {
    if (!wire || !ctx) return;
    const w = logicBindTargetBitWidth(wire, ctx, listFlag, eachScalarFlag);
    const shapeFn = typeof global.logicWireShape === 'function' ? global.logicWireShape : null;
    const shape = shapeFn ? shapeFn(wire, ctx) : null;
    const packedList = listFlag && (!shape || shape.kind === 'scalar');
    if (packedList) {
      const ew = floatFormat
        ? logicFloatFormatBitWidth(logicResolveFloatFormat(floatFormat, w), w)
        : 32;
      if (w % ew !== 0) {
        throw new Error(
          `${ctxLabel || 'logic'}: float list expects vector wire or width multiple of ${ew}`,
        );
      }
      return;
    }
    if (floatFormat) {
      logicValidateFloatFormatWidth(floatFormat, w, ctxLabel);
    }
  }

  function logicListUsesVectorFormat(vectorShape) {
    return vectorShape && (vectorShape.kind === 'vector' || vectorShape.kind === 'matrix');
  }

  function logicEffectiveListFloatFormat(floatFormat, vectorShape) {
    if (!floatFormat) return null;
    if (logicListUsesVectorFormat(vectorShape)) return floatFormat;
    return floatFormat;
  }

  function logicPackedFloatListElementWidth(floatFormat) {
    if (!floatFormat) return 32;
    const resolved = logicResolveFloatFormat(floatFormat, 32);
    return logicFloatFormatBitWidth(resolved, 32);
  }

  const api = {
    parseLogicFloatFormatToken,
    logicFloatFormatBitWidth,
    logicResolveFloatFormat,
    logicDecodeFloatBits,
    logicEncodeFloatValue,
    logicValidateFloatFormatWidth,
    logicValidateFloatBindAgainstWire,
    logicEffectiveListFloatFormat,
    logicPackedFloatListElementWidth,
    logicIsFixedPointFormat,
    logicIsIeeeHalfFormat,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(global, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
