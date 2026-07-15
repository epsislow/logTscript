/**
 * Decimal / hex / bin / ascii formatting for show / peek / probe display tags.
 */
(function (global) {
  'use strict';

  const SHOW_DEC_SCALAR_MAX_BITS = 64;
  const SHOW_DEC_CHUNK_BITS = 64;
  const SHOW_HEX_NIBBLE_BITS = 4;
  const SHOW_HEX_GROUP_HEX_CHARS = 4;

  const SHOW_OCT_DIGIT_BITS = 3;
  const SHOW_B32_DIGIT_BITS = 5;

  const FORMAT_TAGS = new Set(['dec', 'decSigned', 'hex', 'bin', 'ascii', 'signed', 'oct', 'b32hex', 'b32c', 'q4p4', 'q8p8', 'bf16', 'fp16']);
  const ELEMENT_MODE_TAGS = new Set(['elAll', 'elNonZero', 'compact', 'elRange', 'elLast']);
  const MODIFIER_TAGS = new Set(['signed', 'hexWide', 'multiline']);

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

  function formatSignedDecLiteral(n, w) {
    const num = typeof n === 'bigint' ? n : BigInt(n);
    return '\\' + num.toString() + ';s' + w;
  }

  function formatSignedHexLiteral(n, w) {
    const num = typeof n === 'bigint' ? n : BigInt(n);
    if (num < 0n) {
      const absHex = (-num).toString(16).toUpperCase();
      return '^-' + absHex + ';' + w;
    }
    const hex = num.toString(16).toUpperCase();
    return '^' + hex;
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

  function formatDecimalChunk(binStr, width, signed, signedLiteral) {
    const padded = normalizeBits(binStr, width);
    const n = signed ? signedBinToBigInt(padded) : unsignedBinToBigInt(padded);
    if (signed && signedLiteral) return formatSignedDecLiteral(n, width);
    return formatDecimalLiteral(n);
  }

  function formatPatternTagDisplay(binStr, bitWidth, prefix, bitsPerDigit, alphabet) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    let remaining = normalizeBits(binStr, w);
    const parts = [];
    while (remaining.length >= bitsPerDigit) {
      const chunk = remaining.substring(0, bitsPerDigit);
      const digit = alphabet[parseInt(chunk, 2)];
      parts.push(`${prefix}${digit}`);
      remaining = remaining.substring(bitsPerDigit);
    }
    if (remaining.length > 0) {
      if (parts.length) return parts.join(' ') + ' + ' + remaining;
      return remaining;
    }
    return parts.join(' ');
  }

  function formatPatternGroupedDisplay(binStr, bitWidth, prefix, bitsPerDigit, alphabet) {
    const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
    if (WL) {
      if (prefix === 'o^' && typeof WL.binToOctLiteral === 'function') {
        return WL.binToOctLiteral(binStr, bitWidth);
      }
      if (prefix === 'x^' && typeof WL.binToB32HexLiteral === 'function') {
        return WL.binToB32HexLiteral(binStr, bitWidth);
      }
      if (prefix === 'xc^' && typeof WL.binToB32CLiteral === 'function') {
        return WL.binToB32CLiteral(binStr, bitWidth);
      }
    }
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    const displayStr = normalizeBits(binStr, w);
    let digits = '';
    let i = 0;
    while (i + bitsPerDigit <= displayStr.length) {
      const chunk = displayStr.substring(i, i + bitsPerDigit);
      digits += alphabet[parseInt(chunk, 2)];
      i += bitsPerDigit;
    }
    const remainder = displayStr.substring(i);
    if (!digits && remainder) return remainder;
    let result = prefix + digits;
    if (remainder.length > 0) result += ' + ' + remainder;
    return result;
  }

  function formatOctDisplay(binStr, bitWidth, isElement) {
    if (isElement) {
      return formatPatternTagDisplay(binStr, bitWidth, 'o^', SHOW_OCT_DIGIT_BITS, '01234567');
    }
    return formatPatternGroupedDisplay(binStr, bitWidth, 'o^', SHOW_OCT_DIGIT_BITS, '01234567');
  }

  function formatB32HexDisplay(binStr, bitWidth, isElement) {
    const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
    const alpha = WL ? WL.B32HEX_ALPHABET : '0123456789ABCDEFGHIJKLMNOPQRSTUV';
    if (isElement) {
      return formatPatternTagDisplay(binStr, bitWidth, 'x^', SHOW_B32_DIGIT_BITS, alpha);
    }
    return formatPatternGroupedDisplay(binStr, bitWidth, 'x^', SHOW_B32_DIGIT_BITS, alpha);
  }

  function formatB32CDisplay(binStr, bitWidth, isElement) {
    const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
    const alpha = WL ? WL.B32C_ALPHABET : '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    if (isElement) {
      return formatPatternTagDisplay(binStr, bitWidth, 'xc^', SHOW_B32_DIGIT_BITS, alpha);
    }
    return formatPatternGroupedDisplay(binStr, bitWidth, 'xc^', SHOW_B32_DIGIT_BITS, alpha);
  }

  function formatHexTagDisplay(binStr, bitWidth, hexWide) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    if (hexWide && w >= 32) return formatHexGroupedDisplay(binStr, bitWidth);
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

  function formatSignedHexChunk(binStr, width) {
    const padded = normalizeBits(binStr, width);
    const n = signedBinToBigInt(padded);
    return formatSignedHexLiteral(n, width);
  }

  function formatSignedHexDisplay(binStr, bitWidth, isElement) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);

    if (isElement) {
      if (w > SHOW_DEC_SCALAR_MAX_BITS) return formatWideElementHex(binStr, w);
      return formatSignedHexChunk(binStr, w);
    }

    const bits = normalizeBits(binStr, w);
    if (w <= SHOW_DEC_SCALAR_MAX_BITS) {
      return formatSignedHexChunk(bits, w);
    }

    const parts = [];
    let remaining = bits;
    while (remaining.length > SHOW_DEC_CHUNK_BITS) {
      parts.push(formatSignedHexChunk(remaining.substring(0, SHOW_DEC_CHUNK_BITS), SHOW_DEC_CHUNK_BITS));
      remaining = remaining.substring(SHOW_DEC_CHUNK_BITS);
    }
    if (remaining.length === SHOW_DEC_CHUNK_BITS) {
      parts.push(formatSignedHexChunk(remaining, SHOW_DEC_CHUNK_BITS));
      return parts.join(' ');
    }
    if (remaining.length > 0) {
      const restVal = formatSignedHexChunk(remaining, remaining.length);
      const head = parts.join(' ');
      return head ? `${head} + ${restVal}` : restVal;
    }
    return parts.join(' ');
  }

  function formatDecimalDisplay(binStr, bitWidth, signed, isElement, signedLiteral) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);

    if (isElement) {
      if (w > SHOW_DEC_SCALAR_MAX_BITS) return formatWideElementHex(binStr, w);
      return formatDecimalChunk(binStr, w, signed, signedLiteral);
    }

    const bits = normalizeBits(binStr, w);
    if (w <= SHOW_DEC_SCALAR_MAX_BITS) {
      return formatDecimalChunk(bits, w, signed, signedLiteral);
    }

    const parts = [];
    let remaining = bits;
    while (remaining.length > SHOW_DEC_CHUNK_BITS) {
      parts.push(formatDecimalChunk(
        remaining.substring(0, SHOW_DEC_CHUNK_BITS),
        SHOW_DEC_CHUNK_BITS,
        signed,
        signedLiteral
      ));
      remaining = remaining.substring(SHOW_DEC_CHUNK_BITS);
    }
    if (remaining.length === SHOW_DEC_CHUNK_BITS) {
      parts.push(formatDecimalChunk(remaining, SHOW_DEC_CHUNK_BITS, signed, signedLiteral));
      return parts.join(' ');
    }
    if (remaining.length > 0) {
      const restVal = formatDecimalChunk(remaining, remaining.length, signed, signedLiteral);
      const head = parts.join(' ');
      if (signed && signedLiteral) {
        return head ? `${head} + ${restVal}` : restVal;
      }
      return head ? `${head} + ${restVal} (${remaining.length}bit)` : `${restVal} (${remaining.length}bit)`;
    }
    return parts.join(' ');
  }

  const ASCII_NUL = '\u25E6';
  const ASCII_NONPRINT = '\u00B7';
  const ASCII_LF = '\u21B5';

  function byteBinToAsciiGlyph(byteBin) {
    if (byteBin.length !== 8) return ASCII_NONPRINT;
    if (hasLogicXZ(byteBin)) return ASCII_NONPRINT;
    const val = parseInt(byteBin, 2);
    if (Number.isNaN(val)) return ASCII_NONPRINT;
    if (val === 0) return ASCII_NUL;
    if (val === 0x0A) return ASCII_LF;
    if (val >= 32 && val <= 126) return String.fromCharCode(val);
    return ASCII_NONPRINT;
  }

  function formatAsciiQuotedChars(bits, bitWidth, isElement) {
    const w = bitWidth || bits.length;
    let chars = '';

    if (isElement && w <= 8) {
      const padded = w < 8 ? normalizeBits(bits, 8) : bits;
      chars = byteBinToAsciiGlyph(padded);
      return '"' + chars + '"';
    }

    const fullBytes = Math.floor(w / 8);
    for (let i = 0; i < fullBytes * 8; i += 8) {
      chars += byteBinToAsciiGlyph(bits.substring(i, i + 8));
    }
    if (w % 8 !== 0) chars += ASCII_NONPRINT;
    return '"' + chars + '"';
  }

  function formatAsciiDisplay(binStr, bitWidth, isElement) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr) && w <= 8 && isElement) {
      return '"' + ASCII_NONPRINT + '"';
    }
    const bits = normalizeBits(binStr, w);
    return formatAsciiQuotedChars(bits, w, !!isElement);
  }

  function formatBinDisplay(binStr, bitWidth, isElement) {
    const w = bitWidth || String(binStr).length;
    if (hasLogicXZ(binStr)) return formatXZBinary(binStr);
    const bits = normalizeBits(binStr, w);

    if (isElement) {
      if (w <= 16) {
        const groups = bits.match(/.{1,8}/g);
        return groups ? groups.join(' ') : bits;
      }
      return formatXZBinary(bits);
    }

    if (w <= 16) {
      const groups = bits.match(/.{1,8}/g);
      return groups ? groups.join(' ') : bits;
    }
    if (w >= 32) {
      return bits.match(/.{1,8}/g).join(' ');
    }
    const parts = [];
    let i = 0;
    while (i + 8 <= bits.length) {
      parts.push(bits.substring(i, i + 8));
      i += 8;
    }
    if (i < bits.length) parts.push(bits.substring(i));
    return parts.join(' ');
  }

  function tagListIncludes(tags, name) {
    if (!tags) return false;
    if (Array.isArray(tags)) return tags.includes(name);
    if (tags.tags) return tags.tags.includes(name);
    return false;
  }

  function parseElRangeSpec(spec) {
    if (!spec || typeof spec !== 'string') return null;
    const s = spec.trim();
    if (!s.length) return null;
    const comma = s.indexOf(',');
    if (comma >= 0) {
      const rowPart = s.substring(0, comma).trim();
      const colPart = s.substring(comma + 1).trim();
      const parseRange = (part) => {
        const dash = part.indexOf('-');
        if (dash < 0) {
          const n = parseInt(part, 10);
          return { start: n, end: n };
        }
        return { start: parseInt(part.substring(0, dash), 10), end: parseInt(part.substring(dash + 1), 10) };
      };
      return { matrix: { rows: parseRange(rowPart), cols: parseRange(colPart) } };
    }
    const dash = s.indexOf('-');
    if (dash < 0) {
      const n = parseInt(s, 10);
      return { vector: { start: n, end: n } };
    }
    return { vector: { start: parseInt(s.substring(0, dash), 10), end: parseInt(s.substring(dash + 1), 10) } };
  }

  function normalizeShowDisplayTags(displayTags) {
    if (!displayTags) return null;

    let tags = [];
    let elRangeSpec = null;
    let elLast = null;
    let maxWidth = null;

    if (Array.isArray(displayTags)) {
      tags = displayTags.slice();
    } else if (typeof displayTags === 'object') {
      tags = displayTags.tags ? displayTags.tags.slice() : [];
      elRangeSpec = displayTags.elRange != null ? String(displayTags.elRange) : null;
      elLast = displayTags.elLast != null ? displayTags.elLast : null;
      maxWidth = displayTags.maxWidth != null ? displayTags.maxWidth : null;
    } else {
      return null;
    }

    const schemaRef = typeof displayTags === 'object' && displayTags.schemaRef != null
      ? displayTags.schemaRef
      : null;
    const schemaSuppress = typeof displayTags === 'object' && displayTags.schemaSuppress === true;

    if (!tags.length && elRangeSpec == null && elLast == null && maxWidth == null && !schemaRef && !schemaSuppress) return null;

    if (tags.includes('decSigned')) {
      if (!tags.includes('signed')) tags.push('signed');
      if (!tags.includes('dec')) tags.push('dec');
      tags = tags.filter((t) => t !== 'decSigned');
    }

    const hasSigned = tags.includes('signed');
    let hasDec = tags.includes('dec');
    const hasHex = tags.includes('hex');
    const hasBin = tags.includes('bin');
    const hasAscii = tags.includes('ascii');
    const hasOct = tags.includes('oct');
    const hasB32hex = tags.includes('b32hex');
    const hasB32c = tags.includes('b32c');
    let numericFormat = null;
    for (const t of tags) {
      if (['q4p4', 'q8p8', 'bf16', 'fp16'].includes(t)) numericFormat = t;
      else if (/^q\d+p\d+$/.test(t)) numericFormat = t;
      else if (/^s\d+$/.test(t)) numericFormat = t;
      else if (/^u\d+$/.test(t)) numericFormat = t;
    }

    if (hasSigned && !hasDec && !hasHex && !hasAscii && !numericFormat) {
      tags.push('dec');
      hasDec = true;
    }

    const signedLiteral = hasSigned && (hasDec || hasHex);

    return {
      dec: hasDec && !hasBin && !hasAscii && !numericFormat && !hasOct && !hasB32hex && !hasB32c,
      signed: hasSigned,
      signedLiteral,
      hex: hasHex && !hasBin && !hasAscii && !numericFormat && !hasOct && !hasB32hex && !hasB32c,
      bin: hasBin && !hasAscii && !numericFormat && !hasOct && !hasB32hex && !hasB32c,
      ascii: hasAscii && !numericFormat && !hasOct && !hasB32hex && !hasB32c,
      oct: hasOct && !hasBin && !hasAscii && !numericFormat && !hasHex && !hasB32hex && !hasB32c,
      b32hex: hasB32hex && !hasBin && !hasAscii && !numericFormat && !hasHex && !hasOct && !hasB32c,
      b32c: hasB32c && !hasBin && !hasAscii && !numericFormat && !hasHex && !hasOct && !hasB32hex,
      numericFormat,
      hexWide: tags.includes('hexWide'),
      compact: tags.includes('compact'),
      elAll: tags.includes('elAll'),
      elNonZero: tags.includes('elNonZero'),
      elRange: parseElRangeSpec(elRangeSpec),
      elLast: elLast != null ? elLast : null,
      multiline: tags.includes('multiline'),
      maxWidth: maxWidth != null ? maxWidth : null,
      decSigned: hasSigned && hasDec,
      schemaRef,
      schemaSuppress,
    };
  }

  function formatSignedGroupedElementValue(binStr, width) {
    const padded = normalizeBits(binStr, width);
    const n = signedBinToBigInt(padded);
    if (n < 0n) return '\\' + n.toString();
    return '\\' + n.toString();
  }

  function formatSignedGroupedHeader(binStr, bitWidth) {
    const bits = normalizeBits(binStr, bitWidth);
    const w = bits.length;
    if (w <= SHOW_DEC_SCALAR_MAX_BITS) {
      return formatSignedDecLiteral(signedBinToBigInt(bits), w);
    }
    const elems = [];
    let remaining = bits;
    while (remaining.length > SHOW_DEC_CHUNK_BITS) {
      elems.push(formatSignedGroupedElementValue(remaining.substring(0, SHOW_DEC_CHUNK_BITS), SHOW_DEC_CHUNK_BITS));
      remaining = remaining.substring(SHOW_DEC_CHUNK_BITS);
    }
    if (remaining.length === SHOW_DEC_CHUNK_BITS) {
      elems.push(formatSignedGroupedElementValue(remaining, SHOW_DEC_CHUNK_BITS));
      return elems.join(' ') + ';s64';
    }
    if (remaining.length > 0) {
      const head = elems.length ? elems.join(' ') + ';s64 + ' + remaining : remaining;
      return head;
    }
    return elems.join(' ') + ';s64';
  }

  function formatAsciiGroupedHeader(binStr, bitWidth) {
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    if (!NF) return formatAsciiDisplay(binStr, bitWidth, false);
    return NF.formatGroupedShow(binStr, 'ascii', { elementWidth: 8 });
  }

  function formatDebugDisplayValue(binStr, bitWidth, opts, isElement, elementWidth) {
    if (!opts || binStr == null || binStr === '-') return binStr;
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    const elW = elementWidth != null ? elementWidth : bitWidth;
    if (opts.numericFormat && NF) {
      const formatW = NF.getFormatModeWidth(opts.numericFormat);
      if (formatW != null && elW === formatW) {
        return NF.formatGroupedShow(binStr, opts.numericFormat, { elementWidth: formatW });
      }
      if (formatW != null && elW > formatW) {
        if (bitWidth % formatW === 0) {
          return NF.formatGroupedShow(binStr, opts.numericFormat, { elementWidth: formatW });
        }
        return formatHexTagDisplay(binStr, bitWidth, opts.hexWide);
      }
      if (formatW != null && elW < formatW) {
        return normalizeBits(binStr, elW);
      }
      return NF.formatForShow(binStr, bitWidth, opts.numericFormat);
    }
    let formatted;
    if (opts.ascii) {
      formatted = formatAsciiDisplay(binStr, bitWidth, !!isElement);
    } else if (opts.bin) {
      formatted = formatBinDisplay(binStr, bitWidth, !!isElement);
    } else if (opts.hex) {
      if (opts.signed) {
        formatted = formatSignedHexDisplay(binStr, bitWidth, !!isElement);
      } else if (isElement && bitWidth > SHOW_DEC_SCALAR_MAX_BITS) {
        formatted = formatWideElementHex(binStr, bitWidth);
      } else if (isElement) {
        formatted = formatHexTagDisplay(binStr, bitWidth, opts.hexWide);
      } else {
        formatted = formatHexGroupedDisplay(binStr, bitWidth);
      }
    } else if (opts.oct) {
      formatted = formatOctDisplay(binStr, bitWidth, !!isElement);
    } else if (opts.b32hex) {
      formatted = formatB32HexDisplay(binStr, bitWidth, !!isElement);
    } else if (opts.b32c) {
      formatted = formatB32CDisplay(binStr, bitWidth, !!isElement);
    } else if (opts.dec || opts.signed) {
      if (opts.signed && opts.signedLiteral && !isElement) {
        formatted = formatSignedGroupedHeader(binStr, bitWidth);
      } else if (opts.signed && opts.signedLiteral && isElement) {
        if (bitWidth > SHOW_DEC_SCALAR_MAX_BITS) {
          formatted = formatWideElementHex(binStr, bitWidth);
        } else {
          formatted = formatSignedDecLiteral(signedBinToBigInt(normalizeBits(binStr, bitWidth)), bitWidth);
        }
      } else {
        formatted = formatDecimalDisplay(
          binStr,
          bitWidth,
          !!opts.signed,
          !!isElement,
          !!opts.signedLiteral
        );
      }
    } else {
      return binStr;
    }
    return formatted;
  }

  function maybeWrapLines(formatted, opts) {
    if (formatted == null) return [String(formatted)];
    const wrap = typeof LogTScriptDebugDisplayWrap !== 'undefined'
      ? LogTScriptDebugDisplayWrap.wrapDebugDisplayValue
      : null;

    if (opts && opts.multiline && wrap) {
      const max = opts.maxWidth != null ? opts.maxWidth : undefined;
      return wrap(String(formatted), max);
    }

    if (opts && opts.maxWidth != null && !opts.multiline) {
      const s = String(formatted);
      if (s.length > opts.maxWidth) {
        return [s.substring(0, opts.maxWidth) + ' ..'];
      }
      return [s];
    }

    return [String(formatted)];
  }

  function pushDisplayLines(out, formatted, opts) {
    const lines = maybeWrapLines(formatted, opts);
    for (const line of lines) out.push(line);
  }

  const api = {
    SHOW_DEC_SCALAR_MAX_BITS,
    SHOW_DEC_CHUNK_BITS,
    SHOW_HEX_NIBBLE_BITS,
    FORMAT_TAGS,
    ELEMENT_MODE_TAGS,
    normalizeShowDisplayTags,
    formatDebugDisplayValue,
    formatDecimalDisplay,
    formatHexTagDisplay,
    formatHexGroupedDisplay,
    formatOctDisplay,
    formatB32HexDisplay,
    formatB32CDisplay,
    formatBinDisplay,
    formatAsciiDisplay,
    formatSignedDecLiteral,
    formatSignedGroupedHeader,
    formatSignedHexLiteral,
    parseElRangeSpec,
    maybeWrapLines,
    pushDisplayLines,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptDebugDisplayFormat = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
