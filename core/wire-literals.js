/**
 * Wire literal helpers: signed TC encoding, hex/dec parsing, ASCII string → bits.
 */
(function (global) {
  'use strict';

  function parseDecimalBigInt(decStr) {
    const s = decStr == null ? '' : String(decStr).trim();
    if (!s.length || !/^\d+$/.test(s)) {
      throw new Error(`Invalid decimal literal: ${decStr}`);
    }
    return BigInt(s);
  }

  function parseHexBigInt(hexStr) {
    const s = hexStr == null ? '' : String(hexStr).trim();
    if (!s.length || !/^[0-9A-Fa-f]+$/.test(s)) {
      throw new Error(`Invalid hex literal: ${hexStr}`);
    }
    return BigInt('0x' + s);
  }

  function signedIntToTcBin(n, width) {
    const w = width | 0;
    if (w <= 0) throw new Error('signed literal width must be positive');
    let num = BigInt(n);
    const mod = BigInt(1) << BigInt(w);
    const mask = mod - BigInt(1);
    if (num < 0n) num = mod + num;
    else num = num & mask;
    return num.toString(2).padStart(w, '0');
  }

  function slashDecToBin(value) {
    const n = parseDecimalBigInt(value);
    if (n === 0n) return '0';
    return n.toString(2);
  }

  /** Unsigned decimal as exactly W bits (value mod 2^W). For ;p padding / chunk round-trip. */
  function unsignedDecToWidthBin(value, width) {
    const w = width | 0;
    if (w <= 0) throw new Error('unsigned decimal width must be positive');
    const n = parseDecimalBigInt(value);
    const mask = (BigInt(1) << BigInt(w)) - BigInt(1);
    return (n & mask).toString(2).padStart(w, '0');
  }

  function hexDigitsToBin(hexStr) {
    const s = String(hexStr).toUpperCase();
    let bin = '';
    for (let i = 0; i < s.length; i++) {
      bin += parseInt(s[i], 16).toString(2).padStart(4, '0');
    }
    return bin;
  }

  const B32HEX_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
  const B32C_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const OCT_DIGIT_BITS = 3;
  const B32_DIGIT_BITS = 5;

  function octDigitsToBin(octStr) {
    const s = String(octStr).trim();
    if (!s.length || !/^[0-7]+$/.test(s)) {
      throw new Error(`Invalid oct literal: ${octStr}`);
    }
    let bin = '';
    for (let i = 0; i < s.length; i++) {
      bin += parseInt(s[i], 8).toString(2).padStart(OCT_DIGIT_BITS, '0');
    }
    return bin;
  }

  function b32CharToValue(ch, alphabet) {
    const idx = alphabet.indexOf(String(ch).toUpperCase());
    if (idx < 0) throw new Error(`Invalid base32 character '${ch}'`);
    return idx;
  }

  function b32DigitsToBin(str, alphabet) {
    const s = String(str).trim();
    if (!s.length) throw new Error('Invalid base32 literal: empty');
    let bin = '';
    for (let i = 0; i < s.length; i++) {
      const val = b32CharToValue(s[i], alphabet);
      bin += val.toString(2).padStart(B32_DIGIT_BITS, '0');
    }
    return bin;
  }

  function b32hexDigitsToBin(str) {
    return b32DigitsToBin(str, B32HEX_ALPHABET);
  }

  function b32cDigitsToBin(str) {
    return b32DigitsToBin(str, B32C_ALPHABET);
  }

  function binToPatternLiteral(binStr, bitWidth, bitsPerDigit, alphabet, prefix) {
    const w = bitWidth || (binStr == null ? 0 : String(binStr).length);
    const s = binStr == null ? '' : String(binStr);
    const displayStr = w && s.length >= w ? s.substring(s.length - w) : s.padStart(w, '0');
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
    if (remainder.length > 0) result += (digits ? ' + ' : '') + remainder;
    return result;
  }

  function binToOctLiteral(binStr, bitWidth) {
    return binToPatternLiteral(binStr, bitWidth, OCT_DIGIT_BITS, '01234567', 'o^');
  }

  function binToB32HexLiteral(binStr, bitWidth) {
    return binToPatternLiteral(binStr, bitWidth, B32_DIGIT_BITS, B32HEX_ALPHABET, 'x^');
  }

  function binToB32CLiteral(binStr, bitWidth) {
    return binToPatternLiteral(binStr, bitWidth, B32_DIGIT_BITS, B32C_ALPHABET, 'xc^');
  }

  function parseSdecToken(raw) {
    if (raw && typeof raw === 'object' && raw.signed) {
      const n = -parseDecimalBigInt(raw.dec);
      const w = raw.width;
      return {
        bin: signedIntToTcBin(n, w),
        dec: '-' + String(raw.dec),
        signedDec: true,
        tcWidth: w,
      };
    }
    const decVal = String(raw);
    return { bin: slashDecToBin(decVal), dec: decVal };
  }

  function parseShexToken(raw) {
    const hex = String(raw.hex).toUpperCase();
    const w = raw.width;
    const n = -parseHexBigInt(hex);
    return {
      bin: signedIntToTcBin(n, w),
      hex: '-' + hex,
      signedHex: true,
      tcWidth: w,
    };
  }

  function decodeWireStringEscape(ch) {
    switch (ch) {
      case 's': return ' ';
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case '0': return '\0';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      default: return null;
    }
  }

  function wireStringToBin(str) {
    const s = str == null ? '' : String(str);
    let bin = '';
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code > 255) {
        throw new Error(`wire string character U+${code.toString(16).toUpperCase()} exceeds 8 bits`);
      }
      bin += code.toString(2).padStart(8, '0');
    }
    return bin;
  }

  function atomToFloat(atom) {
    const sign = atom.neg ? '-' : '';
    if (atom.fracPart != null) {
      return parseFloat(sign + atom.intPart + '.' + atom.fracPart);
    }
    const n = parseDecimalBigInt(atom.intPart || '0');
    return atom.neg ? -Number(n) : Number(n);
  }

  function fractionalOnIntegerTagError(tag) {
    const widthKind = tag.kind === 'signed' ? 'signed' : 'unsigned';
    throw new Error(
      `Missing floating point numeric format. The Numeric Width used is for ${widthKind} ${tag.elementW}bit`
    );
  }

  function atomToBin(atom, tag, NF) {
    const w = tag.elementW;
    if (atom.fracPart != null && tag.kind !== 'fixed' && tag.kind !== 'float') {
      fractionalOnIntegerTagError(tag);
    }
    if (atom.neg && (tag.kind === 'unsigned' || tag.kind === 'ascii')) {
      throw new Error(`Negative value not allowed in unsigned ${w}bit literal group`);
    }
    if (tag.kind === 'unsigned' || tag.kind === 'ascii') {
      return unsignedDecToWidthBin(atom.intPart, w);
    }
    if (tag.kind === 'signed') {
      let n = parseDecimalBigInt(atom.intPart || '0');
      if (atom.neg) n = -n;
      return signedIntToTcBin(n, w);
    }
    if (tag.kind === 'fixed') {
      const val = atomToFloat(atom);
      if (tag.formatMode) return NF.fixedNumberToRaw(val, tag.formatMode);
      return NF.genericFixedNumberToRaw(val, w, tag.fracBits);
    }
    if (tag.kind === 'float') {
      const val = atomToFloat(atom);
      return NF.encodeFromFloat(val, tag.formatMode);
    }
    throw new Error(`Unsupported literal tag kind: ${tag.kind}`);
  }

  function groupedLiteralToBits(atoms, tagStr) {
    const NF = typeof LogTScriptNumericFormats !== 'undefined' ? LogTScriptNumericFormats : null;
    if (!NF || typeof NF.parseLiteralTag !== 'function') {
      throw new Error('groupedLiteralToBits requires core/numeric-formats.js');
    }
    const tag = NF.parseLiteralTag(tagStr);
    if (!Array.isArray(atoms) || !atoms.length) {
      throw new Error('Grouped literal requires at least one value');
    }
    let bin = '';
    for (const atom of atoms) {
      bin += atomToBin(atom, tag, NF);
    }
    return bin;
  }

  const api = {
    signedIntToTcBin,
    slashDecToBin,
    unsignedDecToWidthBin,
    parseDecimalBigInt,
    hexDigitsToBin,
    B32HEX_ALPHABET,
    B32C_ALPHABET,
    OCT_DIGIT_BITS,
    B32_DIGIT_BITS,
    octDigitsToBin,
    b32DigitsToBin,
    b32hexDigitsToBin,
    b32cDigitsToBin,
    b32CharToValue,
    binToOctLiteral,
    binToB32HexLiteral,
    binToB32CLiteral,
    parseSdecToken,
    parseShexToken,
    decodeWireStringEscape,
    wireStringToBin,
    groupedLiteralToBits,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptWireLiterals = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
