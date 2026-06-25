/**
 * Static helpers for 1D wire vector element slices (shared by watch-expand and interpreter).
 */
(function (global) {
  'use strict';

  function resolveAtomWireSliceStatic(atom, vectorMeta, resolveRange) {
    if (!atom || !vectorMeta) return null;
    const hasStaticIndex = atom.vectorIndex !== undefined && atom.vectorIndex !== null;
    if (!hasStaticIndex) return null;

    const idx = atom.vectorIndex;
    const { elementWidth, elementCount } = vectorMeta;
    if (idx < 0 || idx >= elementCount) return null;

    const elemStart = idx * elementWidth;
    const elemEnd = elemStart + elementWidth - 1;

    if (atom.bitRange && resolveRange) {
      const { start: relStart, end: relEnd } = resolveRange(atom.bitRange);
      return {
        start: elemStart + relStart,
        end: elemStart + relEnd,
        vectorElementIndex: idx,
        relStart,
        relEnd
      };
    }

    return {
      start: elemStart,
      end: elemEnd,
      vectorElementIndex: idx,
      relStart: null,
      relEnd: null
    };
  }

  function formatVectorElementBitLabel(atom, relBit) {
    if (!atom || atom.vectorIndex === undefined || atom.vectorIndex === null) return '?';
    return `${atom.var}:${atom.vectorIndex}.${relBit}`;
  }

  function formatVectorElementBitRangeLabel(atom, relStart, relEnd) {
    if (!atom || atom.vectorIndex === undefined || atom.vectorIndex === null) return '?';
    const base = `${atom.var}:${atom.vectorIndex}`;
    return relStart === relEnd ? `${base}.${relStart}` : `${base}.${relStart}-${relEnd}`;
  }

  const api = {
    resolveAtomWireSliceStatic,
    formatVectorElementBitLabel,
    formatVectorElementBitRangeLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.LogTScriptVectorSlice = api;
})(typeof window !== 'undefined' ? window : global);
