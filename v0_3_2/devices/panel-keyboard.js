/* ================= PANEL KEYBOARD ================= */

class PanelKeyboard {
  constructor({
    label = 'Keyboard',
    color = '#808080',
    bgColor = '#101010',
    focusColor = '#2ecc71',
    focusBgColor = '#181818',
    onlyNumbers = false,
    allowEnter = false,
    onKey = () => false,
  }) {
    this.label = label;
    this.color = color;
    this.bgColor = bgColor;
    this.focusColor = focusColor;
    this.focusBgColor = focusBgColor;
    this.onlyNumbers = onlyNumbers;
    this.allowEnter = allowEnter;
    this.onKey = onKey;
    this.focused = false;
    this.cursorVisible = true;
    this._cursorTimer = null;
    this._boundDocPointerDown = (e) => this._onDocumentPointerDown(e);
    this._boundInputKeyDown = (e) => this._onInputKeyDown(e);
    this._boundInput = (e) => this._onInput(e);

    this.el = document.createElement('div');
    this.el.className = 'keyboard-panel';

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'keyboard-label';
    this.labelEl.textContent = label;

    this.cursorEl = document.createElement('span');
    this.cursorEl.className = 'keyboard-cursor';
    this.cursorEl.textContent = '|';

    if (allowEnter) {
      this.inputEl = document.createElement('textarea');
      this.inputEl.setAttribute('rows', '1');
      this.inputEl.setAttribute('enterkeyhint', 'enter');
    } else {
      this.inputEl = document.createElement('input');
      this.inputEl.type = 'text';
      this.inputEl.setAttribute('enterkeyhint', 'done');
    }
    this.inputEl.className = 'keyboard-input';
    this.inputEl.setAttribute('autocomplete', 'off');
    this.inputEl.setAttribute('autocapitalize', 'off');
    this.inputEl.setAttribute('autocorrect', 'off');
    this.inputEl.setAttribute('spellcheck', 'false');
    if (onlyNumbers) {
      this.inputEl.setAttribute('inputmode', 'numeric');
    } else {
      this.inputEl.setAttribute('inputmode', 'text');
    }
    this.inputEl.setAttribute('aria-label', label);

    this.el.appendChild(this.labelEl);
    this.el.appendChild(this.cursorEl);
    this.el.appendChild(this.inputEl);

    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focus();
    });

    this.inputEl.addEventListener('keydown', this._boundInputKeyDown);
    this.inputEl.addEventListener('input', this._boundInput);
    this.inputEl.addEventListener('focus', () => this._activateFocus(false));

    this._applyColors();
    this._stopCursorBlink();
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  focus() {
    this._activateFocus(true);
  }

  _activateFocus(focusInput) {
    if (typeof window !== 'undefined') {
      window.focusedKeyboardId = this._id;
    }
    const wasFocused = this.focused;
    this.focused = true;
    this._applyColors();
    this._startCursorBlink();
    if (!wasFocused) {
      document.addEventListener('mousedown', this._boundDocPointerDown);
      document.addEventListener('touchstart', this._boundDocPointerDown, { passive: true });
    }
    if (!focusInput) return;
    try {
      this.inputEl.focus({ preventScroll: true });
    } catch (_e) {
      this.inputEl.focus();
    }
  }

  unfocus() {
    if (typeof window !== 'undefined' && window.focusedKeyboardId === this._id) {
      window.focusedKeyboardId = null;
    }
    this.focused = false;
    this.inputEl.value = '';
    this._applyColors();
    this._stopCursorBlink();
    document.removeEventListener('mousedown', this._boundDocPointerDown);
    document.removeEventListener('touchstart', this._boundDocPointerDown);
    if (document.activeElement === this.inputEl) {
      this.inputEl.blur();
    }
  }

  setId(id) {
    this._id = id;
  }

  _onDocumentPointerDown(e) {
    if (!this.el.contains(e.target)) {
      this.unfocus();
    }
  }

  _emitChar(ch) {
    if (ch === '\n' || ch === '\r') {
      this.onKey('Enter', { force: true });
    } else {
      this.onKey(ch, { force: true });
    }
  }

  _onInput(e) {
    if (!this.focused) return;
    const val = this.inputEl.value;
    if (!val) return;
    for (const ch of val) {
      this._emitChar(ch);
    }
    this.inputEl.value = '';
    e.preventDefault();
  }

  _onInputKeyDown(e) {
    if (!this.focused) return;
    if (e.repeat) return;
    const key = e.key;
    if (key === 'Tab' || key.startsWith('Arrow') || key === 'Escape' || key === 'Meta' || key === 'Control' || key === 'Alt') {
      return;
    }
    if (key === 'Enter') {
      if (!this.allowEnter) return;
      const accepted = this.onKey('Enter', { force: true });
      if (accepted) e.preventDefault();
      this.inputEl.value = '';
      return;
    }
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      return;
    }
  }

  _startCursorBlink() {
    this._stopCursorBlink();
    this.cursorVisible = true;
    this.cursorEl.style.visibility = 'visible';
    this._cursorTimer = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.cursorEl.style.visibility = this.cursorVisible ? 'visible' : 'hidden';
    }, 400);
  }

  _stopCursorBlink() {
    if (this._cursorTimer) {
      clearInterval(this._cursorTimer);
      this._cursorTimer = null;
    }
    this.cursorEl.style.visibility = 'hidden';
  }

  _applyColors() {
    if (this.focused) {
      this.el.style.borderColor = this.focusColor;
      this.el.style.backgroundColor = this.focusBgColor;
      this.labelEl.style.color = this.focusColor;
      this.cursorEl.style.color = this.focusColor;
    } else {
      this.el.style.borderColor = this.color;
      this.el.style.backgroundColor = this.bgColor;
      this.labelEl.style.color = this.color;
      this.cursorEl.style.color = this.color;
    }
  }
}

function addKeyboard({
  id,
  label,
  color,
  bgColor,
  focusColor,
  focusBgColor,
  onlyNumbers,
  allowEnter,
  nl,
  onKey,
}) {
  const container = document.getElementById('devices');
  if (!container) return;
  if (typeof showDevices === 'function') showDevices();

  const wrapper = document.createElement('span');
  wrapper.className = 'keyboard-wrapper';

  const kb = new PanelKeyboard({
    label,
    color,
    bgColor,
    focusColor,
    focusBgColor,
    onlyNumbers: !!onlyNumbers,
    allowEnter: !!allowEnter,
    onKey: (key) => onKey(key, { force: true }),
  });
  kb.setId(id);
  kb.mount(wrapper);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  if (!window.panelKeyboards) {
    window.panelKeyboards = new Map();
  }
  if (id) {
    window.panelKeyboards.set(id, kb);
  }
}
