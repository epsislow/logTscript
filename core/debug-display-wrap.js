/**
 * Line wrap for show / peek / probe debug output (separate from network traffic wrap).
 */
(function (global) {
  'use strict';

  const DEBUG_DISPLAY_WRAP_MAX_CHARS = 40;

  function wrapDebugDisplayValue(formatted, maxRowChars) {
    const max = maxRowChars != null ? maxRowChars : DEBUG_DISPLAY_WRAP_MAX_CHARS;
    if (!formatted) return [];
    const lines = [];
    let line = '';

    function flush() {
      if (line) {
        lines.push(line);
        line = '';
      }
    }

    function appendChunk(chunk, indentContinuation) {
      let rest = chunk;
      while (rest.length > 0) {
        const prefix = line ? '' : (indentContinuation && !rest.startsWith('^') && !rest.startsWith('\\') ? '  ' : '');
        const avail = max - line.length;
        if (prefix.length + rest.length <= avail) {
          line += prefix + rest;
          rest = '';
        } else {
          const take = Math.max(1, avail - prefix.length);
          if (take <= 0 || line.length >= max) {
            flush();
            continue;
          }
          line += prefix + rest.slice(0, take);
          rest = rest.slice(take);
          flush();
        }
      }
    }

    const parts = formatted.split(/\s+\+\s+/);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        const sep = ' + ';
        if (line.length + sep.length <= max) {
          line += sep;
        } else {
          flush();
          line = '  + ';
          if (line.length > max) {
            flush();
            line = '';
          }
        }
      }
      appendChunk(parts[i], i > 0);
    }
    flush();
    return lines.length ? lines : [''];
  }

  const api = {
    DEBUG_DISPLAY_WRAP_MAX_CHARS,
    wrapDebugDisplayValue,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.LogTScriptDebugDisplayWrap = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
