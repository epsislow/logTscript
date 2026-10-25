/**
 * Editor find bar (CodeMirror 5) — substring search with wrap.
 */
(function () {
  'use strict';

  let lastTouchAt = 0;
  const TOUCH_CLICK_GUARD_MS = 500;
  let wholeWord = false;
  let caseInsensitive = false;

  function getEditor() {
    return typeof cmEditor !== 'undefined' ? cmEditor : null;
  }

  function focusEditor() {
    const ed = getEditor();
    if (ed) ed.focus();
  }

  function getQuery() {
    const input = document.getElementById('findInput');
    if (!input) return '';
    return String(input.value);
  }

  function getFindOptions() {
    return { wholeWord, caseInsensitive };
  }

  function setStatus(msg) {
    const el = document.getElementById('findStatus');
    if (el) el.textContent = msg || '';
  }

  function isWordChar(ch) {
    return ch !== '' && /[A-Za-z0-9_]/.test(ch);
  }

  function matchesAt(text, idx, query, opts) {
    if (!query || idx < 0 || idx + query.length > text.length) return false;
    const slice = text.slice(idx, idx + query.length);
    if (opts.caseInsensitive) {
      if (slice.toLowerCase() !== query.toLowerCase()) return false;
    } else if (slice !== query) {
      return false;
    }
    if (opts.wholeWord) {
      const before = idx > 0 ? text.charAt(idx - 1) : '';
      const after = idx + query.length < text.length ? text.charAt(idx + query.length) : '';
      if (isWordChar(before) || isWordChar(after)) return false;
    }
    return true;
  }

  function listMatchIndices(text, query, opts) {
    const out = [];
    if (!query) return out;
    const hay = opts.caseInsensitive ? text.toLowerCase() : text;
    const needle = opts.caseInsensitive ? query.toLowerCase() : query;
    let pos = 0;
    while (pos <= hay.length) {
      const idx = hay.indexOf(needle, pos);
      if (idx < 0) break;
      if (matchesAt(text, idx, query, opts)) {
        out.push(idx);
      }
      pos = idx + needle.length;
    }
    return out;
  }

  function activeMatchNumber(ed, query, indices, opts) {
    if (!ed || !query || !indices.length) return 0;
    const doc = ed.getDoc();
    const fromIdx = doc.indexFromPos(ed.getCursor('from'));
    const toIdx = doc.indexFromPos(ed.getCursor('to'));
    if (toIdx - fromIdx !== query.length) return 0;
    if (!matchesAt(doc.getValue(), fromIdx, query, opts)) return 0;
    const i = indices.indexOf(fromIdx);
    return i >= 0 ? i + 1 : 0;
  }

  function renderMatchCounter(current, total) {
    const el = document.getElementById('findMatchCounter');
    if (!el) return;
    if (!getQuery()) {
      el.textContent = '[ — ]';
      return;
    }
    if (total === 0) {
      el.textContent = '[ 0 / 0 ]';
      return;
    }
    el.textContent = `[ ${current} / ${total} ]`;
  }

  function refreshMatchCounter() {
    const query = getQuery();
    const ed = getEditor();
    const opts = getFindOptions();
    if (!query || !ed) {
      renderMatchCounter(0, 0);
      return;
    }
    const text = ed.getDoc().getValue();
    const indices = listMatchIndices(text, query, opts);
    const current = activeMatchNumber(ed, query, indices, opts);
    renderMatchCounter(current, indices.length);
  }

  function selectRange(ed, startIndex, length) {
    const doc = ed.getDoc();
    const from = doc.posFromIndex(startIndex);
    const to = doc.posFromIndex(startIndex + length);
    ed.setSelection(from, to);
    ed.scrollIntoView({ from, to }, 80);
    refreshMatchCounter();
  }

  function findNextIndex(indices, searchFrom) {
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] >= searchFrom) return indices[i];
    }
    return -1;
  }

  function findPrevIndex(indices, searchBefore) {
    for (let i = indices.length - 1; i >= 0; i--) {
      if (indices[i] < searchBefore) return indices[i];
    }
    return -1;
  }

  function findNextMatch(wrap) {
    const query = getQuery();
    const opts = getFindOptions();
    if (!query) {
      setStatus('');
      refreshMatchCounter();
      return false;
    }
    const ed = getEditor();
    if (!ed) return false;
    const doc = ed.getDoc();
    const text = doc.getValue();
    const indices = listMatchIndices(text, query, opts);
    if (!indices.length) {
      setStatus('Not found');
      refreshMatchCounter();
      focusEditor();
      return false;
    }
    const fromIdx = doc.indexFromPos(ed.getCursor('from'));
    const toIdx = doc.indexFromPos(ed.getCursor('to'));
    let searchFrom = toIdx;
    if (matchesAt(text, fromIdx, query, opts) && toIdx - fromIdx === query.length) {
      searchFrom = fromIdx + query.length;
    }
    let idx = findNextIndex(indices, searchFrom);
    if (idx < 0 && wrap) {
      idx = indices[0];
      if (indices.length === 1 && fromIdx === indices[0] && searchFrom > indices[0]) {
        idx = -1;
      }
    }
    if (idx < 0) {
      setStatus('Not found');
      refreshMatchCounter();
      focusEditor();
      return false;
    }
    selectRange(ed, idx, query.length);
    setStatus('');
    focusEditor();
    return true;
  }

  function findPrevMatch(wrap) {
    const query = getQuery();
    const opts = getFindOptions();
    if (!query) {
      setStatus('');
      refreshMatchCounter();
      return false;
    }
    const ed = getEditor();
    if (!ed) return false;
    const doc = ed.getDoc();
    const text = doc.getValue();
    const indices = listMatchIndices(text, query, opts);
    if (!indices.length) {
      setStatus('Not found');
      refreshMatchCounter();
      focusEditor();
      return false;
    }
    const fromIdx = doc.indexFromPos(ed.getCursor('from'));
    let searchBefore = fromIdx;
    if (matchesAt(text, fromIdx, query, opts)) {
      searchBefore = fromIdx;
    }
    let idx = findPrevIndex(indices, searchBefore);
    if (idx < 0 && wrap) {
      idx = indices[indices.length - 1];
    }
    if (idx < 0) {
      setStatus('Not found');
      refreshMatchCounter();
      focusEditor();
      return false;
    }
    selectRange(ed, idx, query.length);
    setStatus('');
    focusEditor();
    return true;
  }

  function findFromCursor() {
    const query = getQuery();
    const opts = getFindOptions();
    if (!query) {
      setStatus('');
      refreshMatchCounter();
      return false;
    }
    const ed = getEditor();
    if (!ed) return false;
    const doc = ed.getDoc();
    const text = doc.getValue();
    const indices = listMatchIndices(text, query, opts);
    if (!indices.length) {
      setStatus('Not found');
      refreshMatchCounter();
      focusEditor();
      return false;
    }
    const start = doc.indexFromPos(ed.getCursor('from'));
    let idx = findNextIndex(indices, start);
    if (idx < 0) {
      idx = indices[0];
    }
    selectRange(ed, idx, query.length);
    setStatus('');
    focusEditor();
    return true;
  }

  function updateToggleButtons() {
    const wBtn = document.getElementById('findWordBtn');
    const aaBtn = document.getElementById('findCaseBtn');
    if (wBtn) {
      wBtn.classList.toggle('find-opt-btn--active', wholeWord);
      wBtn.setAttribute('aria-pressed', wholeWord ? 'true' : 'false');
      wBtn.title = wholeWord ? 'Whole word ON — match full tokens only' : 'Whole word OFF';
    }
    if (aaBtn) {
      aaBtn.classList.toggle('find-opt-btn--active', caseInsensitive);
      aaBtn.setAttribute('aria-pressed', caseInsensitive ? 'true' : 'false');
      aaBtn.title = caseInsensitive ? 'Case insensitive ON' : 'Case sensitive (match exact case)';
    }
  }

  function toggleWholeWord() {
    wholeWord = !wholeWord;
    updateToggleButtons();
    setStatus('');
    refreshMatchCounter();
    focusEditor();
  }

  function toggleCaseInsensitive() {
    caseInsensitive = !caseInsensitive;
    updateToggleButtons();
    setStatus('');
    refreshMatchCounter();
    focusEditor();
  }

  function bindTapControl(el, handler) {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      lastTouchAt = Date.now();
      handler();
    }, { passive: false });
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (Date.now() - lastTouchAt < TOUCH_CLICK_GUARD_MS) return;
      handler();
    });
  }

  function onFindInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        findPrevMatch(true);
      } else {
        findNextMatch(true);
      }
    }
  }

  function onFindInputInput() {
    setStatus('');
    refreshMatchCounter();
  }

  function initFindPanel() {
    const input = document.getElementById('findInput');
    const goBtn = document.getElementById('findGoBtn');
    const prevBtn = document.getElementById('findPrevBtn');
    const nextBtn = document.getElementById('findNextBtn');
    const wordBtn = document.getElementById('findWordBtn');
    const caseBtn = document.getElementById('findCaseBtn');

    if (input) {
      input.addEventListener('keydown', onFindInputKeydown);
      input.addEventListener('input', onFindInputInput);
    }
    if (goBtn) {
      bindTapControl(goBtn, findFromCursor);
    }
    if (prevBtn) {
      bindTapControl(prevBtn, () => findPrevMatch(true));
    }
    if (nextBtn) {
      bindTapControl(nextBtn, () => findNextMatch(true));
    }
    if (wordBtn) {
      bindTapControl(wordBtn, toggleWholeWord);
    }
    if (caseBtn) {
      bindTapControl(caseBtn, toggleCaseInsensitive);
    }
    updateToggleButtons();
    refreshMatchCounter();
  }

  window.toggleFindPanel = function toggleFindPanel() {
    const panel = document.getElementById('findPanel');
    if (!panel) return;
    const show = panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show) {
      refreshMatchCounter();
      const input = document.getElementById('findInput');
      if (input) {
        input.focus();
        input.select();
      }
    }
  };

  window.initFindPanel = initFindPanel;
})();
