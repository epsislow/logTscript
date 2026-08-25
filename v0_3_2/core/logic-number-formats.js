/**
 * Logic wire boundary numeric formats — F39a: number/<format> (u*, s*, uX, sX).
 */
(function (global) {
  'use strict';

  const F39A_FORMAT_RE = /^(u(?:8|16|32|64|X)|s(?:8|16|32|64|X))$/;

  function parseLogicNumberFormatToken(name, ctxLabel) {
    const tok = name == null ? '' : String(name);
    if (!F39A_FORMAT_RE.test(tok)) {
      const where = ctxLabel ? `${ctxLabel}: ` : '';
      throw new Error(`${where}unsupported number format '${tok}' (F39a: u8–u64, s8–s64, uX, sX)`);
    }
    return tok;
  }

  function logicNumberFormatBitWidth(format, wireWidth) {
    if (!format) return wireWidth;
    if (format === 'uX' || format === 'sX') return wireWidth;
    const m = /^[us](\d+)$/.exec(format);
    return m ? parseInt(m[1], 10) : wireWidth;
  }

  function logicIsSignedNumberFormat(format) {
    return format != null && String(format)[0] === 's';
  }

  function signedBinToInt(bits) {
    const s = bits == null ? '' : String(bits);
    if (!s.length) return 0;
    const w = s.length;
    let n = parseInt(s, 2);
    if (isNaN(n)) return 0;
    if (s[0] === '1' && w < 31) {
      n -= (1 << w);
    } else if (s[0] === '1' && w >= 31) {
      const NF = global.LogTScriptNumericFormats;
      if (NF && typeof NF.signedBinToBigInt === 'function') {
        return Number(NF.signedBinToBigInt(s));
      }
      n -= (1 << w);
    }
    return n;
  }

  function signedIntToBin(n, width) {
    const NF = global.LogTScriptNumericFormats;
    if (NF && typeof NF.signedBigIntToBin === 'function') {
      return NF.signedBigIntToBin(BigInt(Math.trunc(n)), width);
    }
    let v = n;
    if (v == null || isNaN(v)) v = 0;
    if (v < 0) v = (1 << width) + v;
    return (v >>> 0).toString(2).padStart(width, '0').slice(-width);
  }

  function unsignedIntToBin(n, width) {
    const NF = global.LogTScriptNumericFormats;
    if (NF && typeof NF.unsignedBigIntToBin === 'function') {
      return NF.unsignedBigIntToBin(BigInt(Math.trunc(n)), width);
    }
    let v = n;
    if (v == null || isNaN(v)) v = 0;
    if (v < 0) v = (1 << width) + v;
    return (v >>> 0).toString(2).padStart(width, '0').slice(-width);
  }

  function logicDecodeNumberBits(bits, numberFormat) {
    const width = bits.length;
    if (!numberFormat) {
      let n = parseInt(bits, 2);
      if (isNaN(n)) n = 0;
      return n;
    }
    if (logicIsSignedNumberFormat(numberFormat)) {
      return signedBinToInt(bits);
    }
    let n = parseInt(bits, 2);
    if (isNaN(n)) n = 0;
    return n;
  }

  function logicEncodeNumberValue(n, width, numberFormat) {
    if (!numberFormat) {
      let v = n;
      if (v == null || isNaN(v)) v = 0;
      if (v < 0) v = (1 << width) + v;
      return (v >>> 0).toString(2).padStart(width, '0').slice(-width);
    }
    if (logicIsSignedNumberFormat(numberFormat)) {
      return signedIntToBin(n, width);
    }
    return unsignedIntToBin(n, width);
  }

  function logicBindTargetBitWidth(wire, ctx, listFlag) {
    const shapeFn = typeof global.logicWireShape === 'function' ? global.logicWireShape : null;
    const shape = wire && shapeFn ? shapeFn(wire, ctx) : null;
    if (listFlag) {
      if (shape && (shape.kind === 'vector' || shape.kind === 'matrix')) return shape.ew;
      return ctx.getBitWidth(wire.type);
    }
    return ctx.getBitWidth(wire.type);
  }

  function logicValidateNumberFormatWidth(numberFormat, wireWidth, ctxLabel) {
    if (!numberFormat) return;
    const fw = logicNumberFormatBitWidth(numberFormat, wireWidth);
    if (fw !== wireWidth) {
      const label = ctxLabel || 'logic';
      throw new Error(
        `${label}: number format width ${fw} does not match wire width ${wireWidth}`,
      );
    }
  }

  function logicValidateBindAgainstWire(bindType, numberFormat, listFlag, wire, ctx, ctxLabel) {
    if (bindType !== 'number' || !numberFormat || !wire || !ctx) return;
    const w = logicBindTargetBitWidth(wire, ctx, listFlag);
    logicValidateNumberFormatWidth(numberFormat, w, ctxLabel);
  }

  function logicListUsesVectorFormat(vectorShape) {
    return vectorShape && (vectorShape.kind === 'vector' || vectorShape.kind === 'matrix');
  }

  function logicEffectiveListNumberFormat(numberFormat, vectorShape) {
    if (!numberFormat) return null;
    if (logicListUsesVectorFormat(vectorShape)) return numberFormat;
    return null;
  }

  const api = {
    parseLogicNumberFormatToken,
    logicNumberFormatBitWidth,
    logicIsSignedNumberFormat,
    logicDecodeNumberBits,
    logicEncodeNumberValue,
    logicBindTargetBitWidth,
    logicValidateNumberFormatWidth,
    logicValidateBindAgainstWire,
    logicListUsesVectorFormat,
    logicEffectiveListNumberFormat,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(global, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
