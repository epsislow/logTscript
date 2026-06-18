/* ================= CLCD WIDGET ================= */

const clcdDisplays = new Map();

const CLCD_ICON_SIZE = 22;

function addClcd(options) {
  const container = document.getElementById('devices');
  if (!container || !options.id) return;
  if (typeof showDevices === 'function') showDevices();
  const display = new ClcdDisplay(options);
  display.mount(container);
  clcdDisplays.set(options.id, display);
}

function setClcdBits(id, bitString) {
  const display = clcdDisplays.get(id);
  if (display) display.setBits(bitString);
}

class ClcdDisplay {
  constructor({
    id,
    width = 200,
    height = 100,
    color = '#00ff00',
    bgColor = '#000000',
    symbols = [],
    nl = false,
    initialBits = '0',
    touch = false,
    touchColor = null,
    touchDefaults = { touchPadding: 0 },
    onPress = null,
    onRelease = null,
  }) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.defaultColor = color;
    this.defaultBgColor = bgColor;
    this.symbols = symbols;
    this.nl = nl;
    this.bits = initialBits;
    this.touch = touch;
    this.touchColor = touchColor;
    this.touchDefaults = touchDefaults;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this._dirty = false;
    this._rafId = null;
    this._fontsReady = false;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this._loadFonts();
    this._bindTouch();
  }

  _bindTouch() {
    if (!this.touch) return;
    this.canvas.style.cursor = 'pointer';

    const toLocal = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const p = toLocal(e.clientX, e.clientY);
      if (typeof this.onPress === 'function') this.onPress(p.x, p.y);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const p = toLocal(e.clientX, e.clientY);
      if (typeof this.onRelease === 'function') this.onRelease(p.x, p.y);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!e.touches[0]) return;
      const p = toLocal(e.touches[0].clientX, e.touches[0].clientY);
      if (typeof this.onPress === 'function') this.onPress(p.x, p.y);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (!t) return;
      const p = toLocal(t.clientX, t.clientY);
      if (typeof this.onRelease === 'function') this.onRelease(p.x, p.y);
    }, { passive: false });
  }

  mount(parent) {
    const wrapper = document.createElement('div');
    wrapper.className = 'clcd-wrapper';
    wrapper.appendChild(this.canvas);
    parent.appendChild(wrapper);
    if (this.nl) {
      const br = document.createElement('div');
      br.className = 'break';
      parent.appendChild(br);
    }
    this.requestDraw();
  }

  _loadFonts() {
    if (!document.fonts) {
      this._fontsReady = true;
      return;
    }
    Promise.all([
      document.fonts.load('900 24px "Font Awesome 5 Free"'),
      document.fonts.load('400 24px "Font Awesome 5 Free"'),
      document.fonts.load('400 24px "Font Awesome 5 Brands"'),
    ]).then(() => {
      this._fontsReady = true;
      this.requestDraw();
    }).catch(() => {
      this._fontsReady = true;
      this.requestDraw();
    });
  }

  setBits(bitString) {
    this.bits = bitString;
    this.requestDraw();
  }

  requestDraw() {
    if (this._dirty) return;
    this._dirty = true;
    this._rafId = requestAnimationFrame(() => {
      this._dirty = false;
      this._rafId = null;
      this.draw();
    });
  }

  _readBit(index) {
    if (index < 0 || index >= this.bits.length) return false;
    return this.bits[index] === '1';
  }

  _symbolActive(sym) {
    if (sym.bit !== undefined) return this._readBit(sym.bit);
    if (sym.bitsStart !== undefined) {
      for (let i = sym.bitsStart; i <= sym.bitsEnd; i++) {
        if (!this._readBit(i)) return false;
      }
      return true;
    }
    return false;
  }

  _segmentBits(sym) {
    const segs = [];
    for (let i = sym.bitsStart; i <= sym.bitsEnd; i++) {
      segs.push(this._readBit(i) ? '1' : '0');
    }
    return segs.join('');
  }

  _drawTouchDebug(ctx) {
    if (!this.touch || !this.touchColor) return;
    const Clcd = (typeof ClcdComponent !== 'undefined') ? ClcdComponent : null;
    if (!Clcd) return;
    ctx.save();
    ctx.strokeStyle = this.touchColor;
    ctx.lineWidth = 1;
    for (const sym of this.symbols) {
      if (sym.bitOut === undefined) continue;
      const rect = Clcd.computeTouchRect(sym, this.touchDefaults);
      if (!rect) continue;
      const w = rect.x2 - rect.x1;
      const h = rect.y2 - rect.y1;
      ctx.strokeRect(rect.x1, rect.y1, w, h);
    }
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.defaultBgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const sym of this.symbols) {
      const on = this._symbolActive(sym);
      const fg = sym.color || this.defaultColor;
      const bg = sym.bgColor || this.defaultBgColor;
      const color = on ? fg : bg;

      const symDef = (typeof getClcdSymbolDef === 'function')
        ? getClcdSymbolDef(sym.name)
        : null;

      if (symDef && symDef.kind === 'canvas') {
        if (sym.name === 'digit7') {
          this._drawDigit7(ctx, sym.x, sym.y, this._segmentBits(sym), fg, bg, 7);
        } else if (sym.name === 'digit14') {
          this._drawDigit7(ctx, sym.x, sym.y, this._segmentBits(sym).substring(0, 7), fg, bg, 7);
        } else if (sym.name === 'dp') {
          this._drawDot(ctx, sym.x + 4, sym.y + 28, on ? fg : bg, 4);
        } else if (sym.name === 'colon') {
          this._drawDot(ctx, sym.x, sym.y + 10, on ? fg : bg, 3);
          this._drawDot(ctx, sym.x, sym.y + 22, on ? fg : bg, 3);
        }
      } else if (symDef && symDef.kind === 'text') {
        this._drawLabel(ctx, sym, color);
      } else {
        this._drawFaIcon(ctx, sym, color);
      }
    }

    this._drawTouchDebug(ctx);
  }

  _drawLabel(ctx, sym, color) {
    const resolved = (typeof resolveClcdLabelFont === 'function')
      ? resolveClcdLabelFont(sym)
      : null;
    if (!resolved || !sym.text) return;
    ctx.save();
    ctx.font = `${resolved.fontStyle} ${resolved.fontWeight} ${resolved.fontSize}px ${resolved.fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    const lines = String(sym.text).split('\n');
    const lineHeight = resolved.fontSize * 1.2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], sym.x, sym.y + i * lineHeight);
    }
    ctx.restore();
  }

  _drawFaIcon(ctx, sym, color) {
    const symDef = (typeof getClcdSymbolDef === 'function')
      ? getClcdSymbolDef(sym.name)
      : null;
    const resolved = (typeof resolveClcdFaStyle === 'function')
      ? resolveClcdFaStyle(symDef, sym.style)
      : null;
    if (!resolved) return;
    ctx.save();
    ctx.font = `${resolved.weight} ${CLCD_ICON_SIZE}px ${resolved.fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(resolved.glyph, sym.x, sym.y);
    ctx.restore();
  }

  _drawDot(ctx, x, y, color, r) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawDigit7(ctx, x, y, segBits, onColor, offColor, segCount) {
    const w = 28;
    const h = 44;
    const t = 3;
    const pad = segBits.padEnd(segCount, '0').substring(0, segCount);
    const seg = function (i) {
      return pad[i] === '1' ? onColor : offColor;
    };
    const drawH = (sx, sy, len, ci) => {
      ctx.fillStyle = seg(ci);
      ctx.fillRect(sx, sy, len, t);
    };
    const drawV = (sx, sy, len, ci) => {
      ctx.fillStyle = seg(ci);
      ctx.fillRect(sx, sy, t, len);
    };
    drawH(x + t, y, w - 2 * t, 0);
    drawV(x, y + t, h / 2 - t, 5);
    drawV(x + w - t, y + t, h / 2 - t, 1);
    drawH(x + t, y + h / 2 - t / 2, w - 2 * t, 6);
    drawV(x, y + h / 2 + t / 2, h / 2 - t, 4);
    drawV(x + w - t, y + h / 2 + t / 2, h / 2 - t, 2);
    drawH(x + t, y + h - t, w - 2 * t, 3);
  }
}
