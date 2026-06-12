/* ================= TEXT TERMINAL ================= */

const terminalDisplays = new Map();
const TERMINAL_BLOCK_CURSOR = '\u2588';

class TerminalBuffer {
  constructor({ rows = 20, columns = 80, wordWrap = 1 } = {}) {
    this.rows = rows;
    this.columns = columns;
    this.wordWrap = wordWrap ? 1 : 0;
    this.lines = [''];
    this.cursorLine = 0;
    this.cursorCol = 0;
  }

  _ensureLine(idx) {
    while (this.lines.length <= idx) {
      this.lines.push('');
    }
  }

  _currentLine() {
    this._ensureLine(this.cursorLine);
    return this.lines[this.cursorLine];
  }

  _setCurrentLine(text) {
    this._ensureLine(this.cursorLine);
    this.lines[this.cursorLine] = text;
  }

  _wrapIfNeeded() {
    if (!this.wordWrap) return;
    if (this.cursorCol >= this.columns) {
      this.newline();
    }
  }

  appendBinary(binaryValue) {
    if (!binaryValue || binaryValue.length < 8) {
      throw Error('append expects at least 8 bits');
    }
    const padded = binaryValue.length % 8 === 0
      ? binaryValue
      : binaryValue.padStart(Math.ceil(binaryValue.length / 8) * 8, '0');
    for (let i = 0; i < padded.length; i += 8) {
      const byte = padded.substring(i, i + 8);
      const code = parseInt(byte, 2);
      if (isNaN(code)) continue;
      this.appendChar(String.fromCharCode(code));
    }
  }

  appendChar(ch) {
    let line = this._currentLine();
    if (this.cursorCol > line.length) {
      line = line + ' '.repeat(this.cursorCol - line.length);
    }
    const before = line.substring(0, this.cursorCol);
    const after = line.substring(this.cursorCol);
    this._setCurrentLine(before + ch + after);
    this.cursorCol += 1;
    this._wrapIfNeeded();
  }

  newline() {
    this.cursorLine += 1;
    this.cursorCol = 0;
    this._ensureLine(this.cursorLine);
  }

  clear() {
    this.lines = [''];
    this.cursorLine = 0;
    this.cursorCol = 0;
  }

  getLogicalLines() {
    const trimmed = this.lines.slice();
    while (trimmed.length > 1 && trimmed[trimmed.length - 1] === '') {
      trimmed.pop();
    }
    return trimmed;
  }

  getText() {
    return this.getLogicalLines().join('\n');
  }

  getVisibleStartLine() {
    if (this.lines.length <= this.rows) return 0;
    return this.lines.length - this.rows;
  }

  getVisibleLines() {
    const nonEmptyTrimmed = this.lines.length === 1 && this.lines[0] === ''
      ? ['']
      : this.lines;
    if (nonEmptyTrimmed.length <= this.rows) {
      const result = nonEmptyTrimmed.slice();
      while (result.length < this.rows) result.push('');
      return result.slice(0, this.rows);
    }
    return nonEmptyTrimmed.slice(nonEmptyTrimmed.length - this.rows);
  }

  getVisibleLineNumbers() {
    const total = this.lines.length;
    const start = Math.max(1, total - this.rows + 1);
    const nums = [];
    for (let i = 0; i < this.rows; i++) {
      nums.push(start + i);
    }
    return nums;
  }

  getVisibleCursor() {
    const start = this.getVisibleStartLine();
    const relRow = this.cursorLine - start;
    if (relRow < 0 || relRow >= this.rows) return null;
    const col = Math.min(this.cursorCol, this.columns);
    return { row: relRow, col };
  }
}

class TextTerminal {
  constructor({
    id, rows = 20, columns = 80, fontSize = 12, wordWrap = 1,
    lineNumbers = 0, cursorStyle = 0, color = '#0f0', nl = false
  }) {
    this.id = id;
    this.rows = rows;
    this.columns = columns;
    this.fontSize = fontSize;
    this.lineNumbers = lineNumbers ? 1 : 0;
    this.cursorStyle = cursorStyle;
    this.color = color;
    this.nl = nl;
    this.buffer = new TerminalBuffer({ rows, columns, wordWrap });
    this.wrapper = null;
    this.gutterEl = null;
    this.screenEl = null;
    this._blinkTimer = null;
    this._blinkOn = true;
  }

  _padLine(line) {
    if (line.length > this.columns) return line.substring(0, this.columns);
    return line.padEnd(this.columns, ' ');
  }

  _buildDisplayLines() {
    const visible = this.buffer.getVisibleLines();
    const padded = visible.map(function (line) {
      return this._padLine(line);
    }, this);

    const cursor = this.buffer.getVisibleCursor();
    if (!cursor || this.cursorStyle === 0) return { lines: padded, html: null };

    if (this.cursorStyle === 2) {
      const lines = padded.slice();
      const chars = lines[cursor.row].split('');
      if (cursor.col < this.columns) {
        chars[cursor.col] = TERMINAL_BLOCK_CURSOR;
      }
      lines[cursor.row] = chars.join('');
      return { lines, html: null };
    }

    // cursorStyle 1 — blinking underscore (HTML)
    const lines = padded.map(function (line, rowIdx) {
      if (rowIdx !== cursor.row) return escapeTerminalHtml(line);
      const before = escapeTerminalHtml(line.substring(0, cursor.col));
      const after = escapeTerminalHtml(line.substring(cursor.col));
      const mark = this._blinkOn ? '_' : ' ';
      return before + '<span class="terminal-cursor-blink">' + mark + '</span>' + after;
    }, this);
    return { lines: padded, html: lines.join('\n') };
  }

  mount(parent) {
    const lineHeight = 1.25;
    const rowPx = this.fontSize * lineHeight;

    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';

    const frame = document.createElement('div');
    frame.className = 'terminal-frame';

    const body = document.createElement('div');
    body.className = 'terminal-body';

    const gutter = document.createElement('div');
    gutter.className = 'terminal-gutter';
    if (!this.lineNumbers) {
      gutter.style.display = 'none';
    } else {
      const gutterCols = Math.max(3, String(this.rows).length + 3);
      gutter.style.width = gutterCols + 'ch';
      gutter.style.minWidth = gutterCols + 'ch';
      gutter.style.height = (this.rows * rowPx) + 'px';
      gutter.style.fontSize = this.fontSize + 'px';
      gutter.style.lineHeight = String(lineHeight);
      gutter.style.color = this.color;
    }

    const screen = document.createElement('pre');
    screen.className = 'terminal-screen';
    screen.style.fontSize = this.fontSize + 'px';
    screen.style.lineHeight = String(lineHeight);
    screen.style.width = this.columns + 'ch';
    screen.style.minWidth = this.columns + 'ch';
    screen.style.maxWidth = this.columns + 'ch';
    screen.style.height = (this.rows * rowPx) + 'px';
    screen.style.minHeight = (this.rows * rowPx) + 'px';
    screen.style.maxHeight = (this.rows * rowPx) + 'px';
    screen.style.color = this.color;

    body.appendChild(gutter);
    body.appendChild(screen);
    frame.appendChild(body);
    wrapper.appendChild(frame);
    parent.appendChild(wrapper);

    if (this.nl) {
      const br = document.createElement('div');
      br.className = 'break';
      parent.appendChild(br);
    }

    this.wrapper = wrapper;
    this.gutterEl = gutter;
    this.screenEl = screen;
    this._startBlink();
    this.draw();
  }

  _startBlink() {
    this._stopBlink();
    if (this.cursorStyle !== 1 || typeof setInterval === 'undefined') return;
    this._blinkOn = true;
    this._blinkTimer = setInterval(() => {
      this._blinkOn = !this._blinkOn;
      this.draw();
    }, 530);
  }

  _stopBlink() {
    if (this._blinkTimer !== null) {
      clearInterval(this._blinkTimer);
      this._blinkTimer = null;
    }
  }

  draw() {
    const display = this._buildDisplayLines();

    if (this.screenEl) {
      if (display.html !== null) {
        this.screenEl.innerHTML = display.html;
      } else {
        this.screenEl.textContent = display.lines.join('\n');
      }
    }
    if (this.gutterEl && this.lineNumbers) {
      const nums = this.buffer.getVisibleLineNumbers();
      const pad = Math.max(1, String(this.buffer.lines.length).length);
      const gutterLines = [];
      for (let i = 0; i < this.rows; i++) {
        const n = nums[i] !== undefined ? nums[i] : '';
        gutterLines.push(n === '' ? ' '.repeat(pad + 2) : String(n).padStart(pad, ' ') + ' |');
      }
      this.gutterEl.textContent = gutterLines.join('\n');
    }
  }

  getRenderedLines() {
    return this._buildDisplayLines().lines;
  }

  appendBinary(binaryValue) {
    this.buffer.appendBinary(binaryValue);
    this.draw();
  }

  newline() {
    this.buffer.newline();
    this.draw();
  }

  clear() {
    this.buffer.clear();
    this.draw();
  }

  destroy() {
    this._stopBlink();
  }
}

function escapeTerminalHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeTerminalColor(color) {
  if (!color) return '#0f0';
  if (color[0] === '#') return color;
  if (/^[0-9a-fA-F]{3,6}$/.test(color)) {
    return color.length <= 3 ? '#' + color : '#' + color;
  }
  return color;
}

function addTerminal(options) {
  if (!options || !options.id) return null;
  const opts = Object.assign({}, options);
  opts.color = normalizeTerminalColor(opts.color);
  const term = new TextTerminal(opts);
  if (typeof document !== 'undefined') {
    const container = document.getElementById('devices');
    if (container) {
      if (typeof showDevices === 'function') showDevices();
      term.mount(container);
    }
  }
  terminalDisplays.set(options.id, term);
  return term;
}

function getTerminalText(id) {
  const term = terminalDisplays.get(id);
  if (!term) return '';
  return term.buffer.getText();
}

function getTerminalVisibleLines(id) {
  const term = terminalDisplays.get(id);
  if (!term) return [];
  return term.buffer.getVisibleLines();
}

function getTerminalRenderedLines(id) {
  const term = terminalDisplays.get(id);
  if (!term) return [];
  return term.getRenderedLines();
}

function getTerminalBuffer(id) {
  const term = terminalDisplays.get(id);
  if (!term) return null;
  return term.buffer;
}

function getTerminalDevice(id) {
  return terminalDisplays.get(id) || null;
}
