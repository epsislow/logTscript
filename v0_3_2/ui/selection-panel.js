/**
 * Mobile-friendly editor cursor / selection controls (CodeMirror).
 */
(function () {
  'use strict';

  let selectionModeActive = false;
  let lastTouchAt = 0;
  const TOUCH_CLICK_GUARD_MS = 500;

  function getEditor() {
    return typeof cmEditor !== 'undefined' ? cmEditor : null;
  }

  function focusEditor() {
    const ed = getEditor();
    if (ed) ed.focus();
  }

  /** CodeMirror 5: extend flag on move commands (no *Extending execCommands in our bundle). */
  function syncExtending() {
    const ed = getEditor();
    if (ed && typeof ed.setExtending === 'function') {
      ed.setExtending(selectionModeActive);
    }
  }

  function updateSelectionModeBtn() {
    const btn = document.getElementById('selectionModeBtn');
    if (!btn) return;
    btn.classList.toggle('selection-mode-btn--active', selectionModeActive);
    btn.setAttribute('aria-pressed', selectionModeActive ? 'true' : 'false');
    btn.title = selectionModeActive
      ? 'Selection extend ON — arrows stretch selection'
      : 'Selection extend OFF — arrows move cursor';
  }

  function toggleSelectionMode() {
    selectionModeActive = !selectionModeActive;
    syncExtending();
    updateSelectionModeBtn();
    focusEditor();
  }

  function writeClipboard(text) {
    if (typeof copyTextToClipboard === 'function') {
      return copyTextToClipboard(text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('clipboard unavailable'));
  }

  function readClipboard() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return navigator.clipboard.readText();
    }
    return Promise.reject(new Error('clipboard unavailable'));
  }

  function copyEditorSelection() {
    const ed = getEditor();
    if (!ed) return;
    const text = ed.getSelection();
    if (!text) {
      focusEditor();
      return;
    }
    writeClipboard(text).then(focusEditor).catch(focusEditor);
  }

  function cutEditorSelection() {
    const ed = getEditor();
    if (!ed) return;
    const text = ed.getSelection();
    if (!text) {
      focusEditor();
      return;
    }
    writeClipboard(text).then(function () {
      ed.replaceSelection('');
      focusEditor();
    }).catch(focusEditor);
  }

  function pasteEditorSelection() {
    const ed = getEditor();
    if (!ed) return;
    focusEditor();
    readClipboard().then(function (text) {
      ed.replaceSelection(text);
      focusEditor();
    }).catch(focusEditor);
  }

  function runClipboardAction(action) {
    switch (action) {
      case 'copy':
        copyEditorSelection();
        break;
      case 'cut':
        cutEditorSelection();
        break;
      case 'paste':
        pasteEditorSelection();
        break;
      default:
        break;
    }
  }

  function moveEditorSelection(direction) {
    const ed = getEditor();
    if (!ed) return;
    syncExtending();
    let cmd;
    switch (direction) {
      case 'left':
        cmd = 'goCharLeft';
        break;
      case 'right':
        cmd = 'goCharRight';
        break;
      case 'up':
        cmd = 'goLineUp';
        break;
      case 'down':
        cmd = 'goLineDown';
        break;
      default:
        return;
    }
    ed.execCommand(cmd);
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

  function bindArrowButton(btn) {
    const dir = btn.getAttribute('data-dir');
    if (!dir) return;
    bindTapControl(btn, () => moveEditorSelection(dir));
  }

  function bindClipButton(btn) {
    const action = btn.getAttribute('data-clip');
    if (!action) return;
    bindTapControl(btn, () => runClipboardAction(action));
  }

  function initSelectionPanel() {
    const modeBtn = document.getElementById('selectionModeBtn');
    if (modeBtn) {
      bindTapControl(modeBtn, toggleSelectionMode);
      selectionModeActive = false;
      syncExtending();
      updateSelectionModeBtn();
    }
    document.querySelectorAll('.selection-arrow-btn').forEach(bindArrowButton);
    document.querySelectorAll('.selection-clip-btn').forEach(bindClipButton);
  }

  window.toggleSelectionPanel = function toggleSelectionPanel() {
    const panel = document.getElementById('selectionPanel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  window.initSelectionPanel = initSelectionPanel;
  window.editorSelectionMove = moveEditorSelection;
  window.editorSelectionModeActive = function () { return selectionModeActive; };
})();
