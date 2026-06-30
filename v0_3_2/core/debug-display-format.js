/**
 * Decimal / hex formatting for show / peek / probe display tags.
 */
(function (global) {
  'use strict';

  const SHOW_DEC_SCALAR_MAX_BITS = 64;
  const SHOW_DEC_CHUNK_BITS = 64;
  const SHOW_HEX_NIBBLE_BITS = 4;
  const SHOW_HEX_GROUP_HEX_CHARS = 4;

  function unsignedBinToBigInt(binStr) {
    const s = binStr == null ? '' : String(binStr);
    if (!s.length) return 0n;
    return BigInt('0b' + s);
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

  function formatDecimalLiteral(n) {
    return '\\' + n.toString();
  }

  function hasLogicXZ(binStr) {
    return typeof LogicValue !== 'undefined'
      && typeof LogicValue.stringHasLogicXZ === 'function'
      && LogicValue.stringHasLogicXZ(binStr);
  }

  function formatXZBinary(binStr) {
    if (typeof LogicValue !== 'undefined' && typeof LogicValue.groupBinaryDisplay === 'function') {
      return LogicValue.groupBinaryDisplay(binStr, 8);
    }
    return binStr.match(/.{1,8}/g).join(' ');
  }

  function normalizeBits(binStr, bitWidth) {
    const w = bitWidth || (binStr == null ? 0 : String(binStr).length);
    const s = binStr == null ? '' : String(binStr);
    if (!w) return '';
    if (s.length >= w) return s.substring(s.length - w);
    return s.padStart(w, '0');
  }

  function formatDecimalChunk(binStr, width, signed) {
    const padded = normalizeBits(binStr, width);
    const n = signed ? signedBinToBigInt(padded) : unsignedBinToBigInt(padded);
    return formatDecimalLiteral(n);
  }

  function formatHexTagDisplay(binStr, bitWidth) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    let remaining = normalizeBits(binStr, w);
    const parts = [];
    while (remaining.length >= SHOW_HEX_NIBBLE_BITS) {
      const chunk = remaining.substring(0, SHOW_HEX_NIBBLE_BITS);
      const hexVal = parseInt(chunk, 2).toString(16).toUpperCase();
      parts.push(`^${hexVal}`);
      remaining = remaining.substring(SHOW_HEX_NIBBLE_BITS);
    }
    if (remaining.length > 0) {
      if (parts.length) return parts.join(' ') + ' + ' + remaining;
      return remaining;
    }
    return parts.join(' ');
  }

  /** Plain wire / scalar hex — same grouping as formatValue (4 hex chars per block). */
  function formatHexGroupedDisplay(binStr, bitWidth) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    const displayStr = normalizeBits(binStr, w);

    if (w <= 16) {
      const groups = displayStr.match(/.{1,8}/g);
      return groups ? groups.join(' ') : displayStr;
    }

    if (w >= 32) {
      const parts = [];
      let remaining = displayStr;
      let hexStr = '';
      while (remaining.length >= 8) {
        const chunk = remaining.substring(0, 8);
        hexStr += parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0');
        remaining = remaining.substring(8);
      }
      if (hexStr) {
        let grouped = '';
        for (let i = 0; i < hexStr.length; i++) {
          grouped += hexStr[i];
          if ((i + 1) % SHOW_HEX_GROUP_HEX_CHARS === 0 && i < hexStr.length - 1) {
            grouped += ' ';
          }
        }
        parts.push(`^${grouped}`);
      }
      if (remaining.length > 0) parts.push(remaining);
      return parts.join(' + ');
    }

    const parts = [];
    let remaining = displayStr;
    while (remaining.length >= 8) {
      const chunk = remaining.substring(0, 8);
      parts.push(`^${parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0')}`);
      remaining = remaining.substring(8);
    }
    if (remaining.length > 0) parts.push(remaining);
    return parts.join(' + ');
  }

  function formatWideElementHex(binStr, bitWidth) {
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    const w = bitWidth || String(binStr).length;
    const padded = normalizeBits(binStr, w);
    const hexStr = unsignedBinToBigInt(padded).toString(16).toUpperCase();
    return '^' + hexStr;
  }

  function formatDecimalDisplay(binStr, bitWidth, signed, isElement) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);

    if (isElement) {
      if (w > SHOW_DEC_SCALAR_MAX_BITS) return formatWideElementHex(binStr, w);
      return formatDecimalChunk(binStr, w, signed);
    }

    const bits = normalizeBits(binStr, w);
    if (w <= SHOW_DEC_SCALAR_MAX_BITS) {
      return formatDecimalChunk(bits, w, signed);
    }

    const parts = [];
    let remaining = bits;
    while (remaining.length > SHOW_DEC_CHUNK_BITS) {
      parts.push(formatDecimalChunk(remaining.substring(0, SHOW_DEC_CHUNK_BITS), SHOW_DEC_CHUNK_BITS, signed));
      remaining = remaining.substring(SHOW_DEC_CHUNK_BITS);
    }
    if (remaining.length === SHOW_DEC_CHUNK_BITS) {
      parts.push(formatDecimalChunk(remaining, SHOW_DEC_CHUNK_BITS, signed));
      return parts.join(' ');
    }
    if (remaining.length > 0) {
      const restVal = formatDecimalChunk(remaining, remaining.length, signed);
      const head = parts.join(' ');
      return head ? `${head} + ${restVal} (${remaining.length}bit)` : `${restVal} (${remaining.length}bit)`;
    }
    return parts.join(' ');
  }

  function normalizeShowDisplayTags(tags) {
    if (!tags || !tags.length) return null;
    return {
      dec: tags.includes('dec'),
      decSigned: tags.includes('decSigned'),
      hex: tags.includes('hex'),
      elAll: tags.includes('elAll'),
      elNonZero: tags.includes('elNonZero'),
      multiline: tags.includes('multiline'),
    };
  }

  function formatDebugDisplayValue(binStr, bitWidth, opts, isElement) {
    if (!opts || binStr == null || binStr === '-') return binStr;
    let formatted;
    if (opts.hex) {
      if (isElement && bitWidth > SHOW_DEC_SCALAR_MAX_BITS) {
        formatted = formatWideElementHex(binStr, bitWidth);
      } else if (isElement) {
        formatted = formatHexTagDisplay(binStr, bitWidth);
      } else {
        formatted = formatHexGroupedDisplay(binStr, bitWidth);
      }
    } else if (opts.decSigned) {
      formatted = formatDecimalDisplay(binStr, bitWidth, true, !!isElement);
    } else if (opts.dec) {
      formatted = formatDecimalDisplay(binStr, bitWidth, false, !!isElement);
    } else {
      return binStr;
    }
    return formatted;
  }

  function maybeWrapLines(formatted, opts) {
    if (!opts || !opts.multiline || formatted == null) return [String(formatted)];
    const wrap = typeof LogTScriptDebugDisplayWrap !== 'undefined'
      ? LogTScriptDebugDisplayWrap.wrapDebugDisplayValue
      : null;
    if (!wrap) return [String(formatted)];
    return wrap(String(formatted));
  }

  function pushDisplayLines(out, formatted, opts) {
    const lines = maybeWrapLines(formatted, opts);
    for (const line of lines) out.push(line);
  }

  const api = {
    SHOW_DEC_SCALAR_MAX_BITS,
    SHOW_DEC_CHUNK_BITS,
    SHOW_HEX_NIBBLE_BITS,
    normalizeShowDisplayTags,
    formatDebugDisplayValue,
    formatDecimalDisplay,
    formatHexTagDisplay,
    formatHexGroupedDisplay,
    maybeWrapLines,
    pushDisplayLines,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptDebugDisplayFormat = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
