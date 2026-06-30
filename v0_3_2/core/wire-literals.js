/**
 * Wire literal helpers: signed TC encoding, hex/dec parsing, ASCII string → bits.
 */
(function (global) {
  'use strict';

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
    return parseInt(value, 10).toString(2);
  }

  function hexDigitsToBin(hexStr) {
    const s = String(hexStr).toUpperCase();
    let bin = '';
    for (let i = 0; i < s.length; i++) {
      bin += parseInt(s[i], 16).toString(2).padStart(4, '0');
    }
    return bin;
  }

  function parseSdecToken(raw) {
    if (raw && typeof raw === 'object' && raw.signed) {
      const n = -parseInt(raw.dec, 10);
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
    const n = -parseInt(hex, 16);
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

  const api = {
    signedIntToTcBin,
    slashDecToBin,
    hexDigitsToBin,
    parseSdecToken,
    parseShexToken,
    decodeWireStringEscape,
    wireStringToBin,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptWireLiterals = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
