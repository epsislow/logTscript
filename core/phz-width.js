/**
 * PHZ attribute width / encoding helpers (definition-time simplified syntax).
 */
(function (global) {
  'use strict';

  var ID_BITS = 16;
  var FLOOR_BITS = 8;
  var MAX_BITS = 16;
  var ID_MAX = 65535;
  var FLOOR_MAX = 255;
  var MAX_DEFAULT = 16;

  function bitLengthOfDecimal(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 0 || Math.floor(v) !== v) {
      throw new Error('PHZ attribute expects non-negative integer, got ' + n);
    }
    if (v === 0) return 1;
    return Math.floor(Math.log2(v)) + 1;
  }

  function decimalToMinimalBin(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 0 || Math.floor(v) !== v) {
      throw new Error('PHZ attribute expects non-negative integer, got ' + n);
    }
    if (v === 0) return { bits: 1, bin: '0' };
    var bin = v.toString(2);
    return { bits: bin.length, bin: bin };
  }

  function decimalToWidthBin(n, width) {
    var w = width | 0;
    if (w <= 0) throw new Error('PHZ width must be positive');
    var v = Number(n);
    if (!Number.isFinite(v) || v < 0 || Math.floor(v) !== v) {
      throw new Error('PHZ attribute expects non-negative integer, got ' + n);
    }
    var max = Math.pow(2, w) - 1;
    if (v > max) {
      throw new Error('PHZ value ' + v + ' does not fit in ' + w + ' bits');
    }
    return v.toString(2).padStart(w, '0');
  }

  function stringToBits(str) {
    var s = String(str);
    var bin = '';
    for (var i = 0; i < s.length; i++) {
      bin += s.charCodeAt(i).toString(2).padStart(8, '0');
    }
    if (bin === '') {
      return { bits: 0, bin: '' };
    }
    return { bits: bin.length, bin: bin };
  }

  function stringToWidthBits(str, width) {
    var w = width | 0;
    if (w <= 0) throw new Error('PHZ string width must be positive');
    var base = stringToBits(str);
    if (base.bits > w) {
      throw new Error('PHZ string value does not fit in ' + w + ' bits (needs ' + base.bits + ')');
    }
    return base.bin.padEnd(w, '0');
  }

  function encodeId(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 1 || v > ID_MAX || Math.floor(v) !== v) {
      throw new Error('PHZ id must be integer 1..' + ID_MAX + ', got ' + n);
    }
    return decimalToWidthBin(v, ID_BITS);
  }

  function encodeFloor(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 0 || v > FLOOR_MAX || Math.floor(v) !== v) {
      throw new Error('PHZ floor must be integer 0..' + FLOOR_MAX + ', got ' + n);
    }
    return decimalToWidthBin(v, FLOOR_BITS);
  }

  function encodeMax(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 0 || v > ID_MAX || Math.floor(v) !== v) {
      throw new Error('PHZ max must be integer 0..' + ID_MAX + ', got ' + n);
    }
    return decimalToWidthBin(v, MAX_BITS);
  }

  var api = {
    ID_BITS: ID_BITS,
    FLOOR_BITS: FLOOR_BITS,
    MAX_BITS: MAX_BITS,
    ID_MAX: ID_MAX,
    FLOOR_MAX: FLOOR_MAX,
    MAX_DEFAULT: MAX_DEFAULT,
    bitLengthOfDecimal: bitLengthOfDecimal,
    decimalToMinimalBin: decimalToMinimalBin,
    decimalToWidthBin: decimalToWidthBin,
    stringToBits: stringToBits,
    stringToWidthBits: stringToWidthBits,
    encodeId: encodeId,
    encodeFloor: encodeFloor,
    encodeMax: encodeMax,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptPhzWidth = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
