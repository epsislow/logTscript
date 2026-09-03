/* ================= PANEL KEYBOARD ================= */

const KEYBOARD_PULSE_MS = 150;

function formatShowCodeText(asciiCode, showCode) {
  if (!showCode || asciiCode === 0) return '';
  if (showCode === 1) return '^' + asciiCode.toString(16);
  return String(asciiCode);
}

class PanelKeyboard {
  constructor({
    label = 'Keyboard',
    color = '#808080',
    bgColor = '#101010',
    focusColor = '#2ecc71',
    focusBgColor = '#181818',
    onlyDigits = false,
    allowEnter = false,
    allowBackspace = false,
    allowArrows = false,
    allowDelete = false,
    showCode = 0,
    pulseColor = null,
    onKey = () => false,
  }) {
    this.label = label;
    this.color = color;
    this.bgColor = bgColor;
    this.focusColor = focusColor;
    this.focusBgColor = focusBgColor;
    this.onlyDigits = onlyDigits;
    this.allowEnter = allowEnter;
    this.allowBackspace = allowBackspace;
    this.allowArrows = allowArrows;
    this.allowDelete = allowDelete;
    this.showCode = showCode;
    this.pulseColor = pulseColor;
    this.onKey = onKey;
    this.focused = false;
    this.cursorVisible = true;
    this._asciiCode = 0;
    this._cursorTimer = null;
    this._pulseTimer = null;
    this._boundDocPointerDown = (e) => this._onDocumentPointerDown(e);
    this._boundInputKeyDown = (e) => this._onInputKeyDown(e);
    this._boundInput = (e) => this._onInput(e);

    this.el = document.createElement('div');
    this.el.className = 'keyboard-panel';

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'keyboard-label';
    this.labelEl.textContent = label;

    this.codeEl = document.createElement('span');
    this.codeEl.className = 'keyboard-code';

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
    if (onlyDigits) {
      this.inputEl.setAttribute('inputmode', 'numeric');
    } else {
      this.inputEl.setAttribute('inputmode', 'text');
    }
    this.inputEl.setAttribute('aria-label', label);

    this.el.appendChild(this.labelEl);
    this.el.appendChild(this.codeEl);
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
    this._refreshCodeDisplay();
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  focus() {
    this._activateFocus(true);
  }

  setShowCode(mode) {
    this.showCode = mode;
    this._refreshCodeDisplay();
  }

  setCodeDisplay(asciiCode) {
    this._asciiCode = asciiCode;
    this._refreshCodeDisplay();
  }

  _refreshCodeDisplay() {
    const text = formatShowCodeText(this._asciiCode, this.showCode);
    this.codeEl.textContent = text;
    if (this.focused) {
      this.cursorEl.style.visibility = this.cursorVisible ? 'visible' : 'hidden';
    } else {
      this.cursorEl.style.visibility = 'hidden';
    }
  }

  pulseFeedback(color) {
    if (!color) return;
    if (this._pulseTimer) {
      clearTimeout(this._pulseTimer);
      this._pulseTimer = null;
    }
    this.el.style.borderColor = color;
    this.labelEl.style.color = color;
    this.codeEl.style.color = color;
    this.cursorEl.style.color = color;
    this._pulseTimer = setTimeout(() => {
      this._pulseTimer = null;
      this._applyColors();
    }, KEYBOARD_PULSE_MS);
  }

  _activateFocus(focusInput) {
    if (typeof window !== 'undefined') {
      window.focusedKeyboardId = this._id;
    }
    const wasFocused = this.focused;
    this.focused = true;
    this._applyColors();
    this._refreshCodeDisplay();
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
    this._refreshCodeDisplay();
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
    if (key === 'Tab' || key === 'Escape' || key === 'Meta' || key === 'Control' || key === 'Alt') {
      return;
    }
    if (key.startsWith('Arrow')) {
      if (!this.allowArrows) return;
      const accepted = this.onKey(key, { force: true });
      if (accepted) e.preventDefault();
      this.inputEl.value = '';
      return;
    }
    if (key === 'Delete') {
      if (!this.allowDelete) return;
      const accepted = this.onKey('Delete', { force: true });
      if (accepted) e.preventDefault();
      this.inputEl.value = '';
      return;
    }
    if (key === 'Enter') {
      if (!this.allowEnter) return;
      const accepted = this.onKey('Enter', { force: true });
      if (accepted) e.preventDefault();
      this.inputEl.value = '';
      return;
    }
    if (key === 'Backspace') {
      if (!this.allowBackspace) return;
      const accepted = this.onKey('Backspace', { force: true });
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
    const accent = this.focused ? this.focusColor : this.color;
    const bg = this.focused ? this.focusBgColor : this.bgColor;
    this.el.style.borderColor = accent;
    this.el.style.backgroundColor = bg;
    this.labelEl.style.color = accent;
    this.codeEl.style.color = accent;
    this.cursorEl.style.color = accent;
  }
}

function onKeyboardShowCode(keyboardId, asciiCode, showCodeMode) {
  const maps = typeof getDeviceMaps === 'function' ? getDeviceMaps() : null;
  if (!maps || !maps.panelKeyboards) return;
  const kb = maps.panelKeyboards.get(keyboardId);
  if (!kb) return;
  kb.setShowCode(showCodeMode);
  kb.setCodeDisplay(asciiCode);
}

function onKeyboardPulseColor(keyboardId, color) {
  const maps = typeof getDeviceMaps === 'function' ? getDeviceMaps() : null;
  if (!maps || !maps.panelKeyboards) return;
  const kb = maps.panelKeyboards.get(keyboardId);
  if (!kb) return;
  kb.pulseFeedback(color);
}

function addKeyboard({
  id,
  label,
  color,
  bgColor,
  focusColor,
  focusBgColor,
  onlyDigits,
  allowEnter,
  allowBackspace,
  allowArrows,
  allowDelete,
  showCode,
  pulseColor,
  nl,
  onKey,
}) {
  const container = getDevicesContainer();
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
    onlyDigits: !!onlyDigits,
    allowEnter: !!allowEnter,
    allowBackspace: !!allowBackspace,
    allowArrows: !!allowArrows,
    allowDelete: !!allowDelete,
    showCode: showCode || 0,
    pulseColor: pulseColor || null,
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

  if (id) {
    dm().panelKeyboards.set(id, kb);
  }
}
