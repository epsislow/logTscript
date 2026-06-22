/* ================= PANEL KEYBOARD ================= */

class PanelKeyboard {
  constructor({
    label = 'Keyboard',
    color = '#808080',
    bgColor = '#101010',
    focusColor = '#2ecc71',
    focusBgColor = '#181818',
    onKey = () => false,
  }) {
    this.label = label;
    this.color = color;
    this.bgColor = bgColor;
    this.focusColor = focusColor;
    this.focusBgColor = focusBgColor;
    this.onKey = onKey;
    this.focused = false;
    this.cursorVisible = true;
    this._cursorTimer = null;
    this._boundDocMouseDown = (e) => this._onDocumentMouseDown(e);
    this._boundKeyDown = (e) => this._onKeyDown(e);

    this.el = document.createElement('div');
    this.el.className = 'keyboard-panel';
    this.el.tabIndex = 0;

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'keyboard-label';
    this.labelEl.textContent = label;

    this.cursorEl = document.createElement('span');
    this.cursorEl.className = 'keyboard-cursor';
    this.cursorEl.textContent = '|';

    this.el.appendChild(this.labelEl);
    this.el.appendChild(this.cursorEl);

    this.el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.focus();
    });

    this._applyColors();
    this._stopCursorBlink();
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  focus() {
    if (typeof window !== 'undefined') {
      window.focusedKeyboardId = this._id;
    }
    this.focused = true;
    this._applyColors();
    this._startCursorBlink();
    document.addEventListener('mousedown', this._boundDocMouseDown);
    window.addEventListener('keydown', this._boundKeyDown);
  }

  unfocus() {
    if (typeof window !== 'undefined' && window.focusedKeyboardId === this._id) {
      window.focusedKeyboardId = null;
    }
    this.focused = false;
    this._applyColors();
    this._stopCursorBlink();
    document.removeEventListener('mousedown', this._boundDocMouseDown);
    window.removeEventListener('keydown', this._boundKeyDown);
  }

  setId(id) {
    this._id = id;
  }

  _onDocumentMouseDown(e) {
    if (!this.el.contains(e.target)) {
      this.unfocus();
    }
  }

  _onKeyDown(e) {
    if (!this.focused) return;
    if (e.repeat) return;
    const key = e.key;
    if (key === 'Tab' || key.startsWith('Arrow') || key === 'Escape' || key === 'Meta' || key === 'Control' || key === 'Alt') {
      return;
    }
    const accepted = this.onKey(key, { force: true });
    if (accepted) {
      e.preventDefault();
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
