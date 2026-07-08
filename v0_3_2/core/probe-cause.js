/**
 * Probe / watch cause lines (Strat 2) — level 0/1/2, dominant priority.
 */
(function () {
  'use strict';

  function parseDebugLevel(displayTags) {
    if (!displayTags) return 0;
    let raw = null;
    if (typeof displayTags === 'object' && displayTags.level != null) {
      raw = displayTags.level;
    }
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return 0;
    if (n > 2) return 2;
    return n;
  }

  function pickDominantCauseLine(ctx, reason, waveMode) {
    const c = ctx || {};
    if (c.lutReeval) return 're-eval ← ' + c.lutReeval;
    if (c.compReeval) return 're-eval ← ' + c.compReeval;
    if (reason === 'edge committed') return 'edge committed';
    if (c.next) return 'next';
    if (c.ui) return 'ui';
    if (c.osc) return 'osc tick';
    if (c.settle) return 'settle';
    if (c.seed) return 'seed';
    if (waveMode && c.wave != null) return 'wave ' + c.wave;
    if (c.stmt) return c.stmt;
    return null;
  }

  function buildAllCauseLines(ctx, reason, waveMode) {
    const lines = [];
    const c = ctx || {};
    if (c.lutReeval) lines.push('re-eval ← ' + c.lutReeval);
    if (c.compReeval) lines.push('re-eval ← ' + c.compReeval);
    if (reason === 'edge committed') lines.push('edge committed');
    if (c.next) lines.push('next');
    if (c.ui) lines.push('ui');
    if (c.osc) lines.push('osc tick');
    if (c.settle) lines.push('settle');
    if (c.seed) lines.push('seed');
    if (waveMode && c.wave != null) lines.push('wave ' + c.wave);
    if (c.stmt) lines.push(c.stmt);
    return lines;
  }

  function causeLinesForLevel(ctx, reason, level, waveMode) {
    if (level <= 0) return [];
    if (level === 1) {
      const dom = pickDominantCauseLine(ctx, reason, waveMode);
      return dom ? [dom] : [];
    }
    return buildAllCauseLines(ctx, reason, waveMode);
  }

  function hasReevalCause(causeLines) {
    if (!causeLines || !causeLines.length) return false;
    return causeLines.some((l) => String(l).indexOf('re-eval ←') === 0);
  }

  const api = {
    parseDebugLevel,
    pickDominantCauseLine,
    buildAllCauseLines,
    causeLinesForLevel,
    hasReevalCause,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.LogTScriptProbeCause = api;
  }
})();
