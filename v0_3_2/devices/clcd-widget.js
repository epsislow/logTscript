/* ================= CLCD WIDGET ================= */

const clcdDisplays = new Map();

const CLCD_FA_SOLID = {
  power: '\uf011',
  warning: '\uf071',
  error: '\uf057',
  check: '\uf00c',
  cross: '\uf00d',
  wifi: '\uf1eb',
  ethernet: '\uf6ff',
  antenna: '\uf519',
  chip: '\uf2db',
  memory: '\uf538',
  clock: '\uf017',
  arrowUp: '\uf062',
  arrowDown: '\uf063',
  arrowLeft: '\uf060',
  arrowRight: '\uf061',
  play: '\uf04b',
  stop: '\uf04d',
  pause: '\uf04c',
  record: '\uf111',
  battery: '\uf240',
  charging: '\uf0e7',
  uart: '\uf1e6',
};

const CLCD_FA_BRANDS = {
  bluetooth: '\uf293',
  usb: '\uf287',
};

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
  }) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.defaultColor = color;
    this.defaultBgColor = bgColor;
    this.symbols = symbols;
    this.nl = nl;
    this.bits = initialBits;
    this._dirty = false;
    this._rafId = null;
    this._fontsReady = false;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this._loadFonts();
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

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.defaultBgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const sym of this.symbols) {
      const on = this._symbolActive(sym);
      const fg = sym.color || this.defaultColor;
      const bg = sym.bgColor || this.defaultBgColor;
      const color = on ? fg : bg;

      if (sym.name === 'digit7') {
        this._drawDigit7(ctx, sym.x, sym.y, this._segmentBits(sym), fg, bg, 7);
      } else if (sym.name === 'digit14') {
        this._drawDigit7(ctx, sym.x, sym.y, this._segmentBits(sym).substring(0, 7), fg, bg, 7);
      } else if (sym.name === 'dp') {
        this._drawDot(ctx, sym.x + 4, sym.y + 28, on ? fg : bg, 4);
      } else if (sym.name === 'colon') {
        this._drawDot(ctx, sym.x, sym.y + 10, on ? fg : bg, 3);
        this._drawDot(ctx, sym.x, sym.y + 22, on ? fg : bg, 3);
      } else {
        this._drawFaIcon(ctx, sym.name, sym.x, sym.y, color);
      }
    }
  }

  _drawFaIcon(ctx, name, x, y, color) {
    let ch = CLCD_FA_SOLID[name];
    let fontFamily = '"Font Awesome 5 Free"';
    let weight = '900';
    if (!ch && CLCD_FA_BRANDS[name]) {
      ch = CLCD_FA_BRANDS[name];
      fontFamily = '"Font Awesome 5 Brands"';
      weight = '400';
    }
    if (!ch) return;
    ctx.save();
    ctx.font = `${weight} ${CLCD_ICON_SIZE}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(ch, x, y);
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
      return pad[i] === '1' ? onColor : offColor
    };
    console.log(pad, seg(1), seg(2), seg(3));
    const drawH = (sx, sy, len, ci) => {
      ctx.fillStyle = seg(ci);
      ctx.fillRect(sx, sy, len, t);
    };
    const drawV = (sx, sy, len, ci) => {
      ctx.fillStyle = seg(ci);
      ctx.fillRect(sx, sy, t, len);
    };
    drawH(x + t, y, w - 2 * t, 0);
    drawV(x, y + t, h / 2 - t, 1);
    drawV(x + w - t, y + t, h / 2 - t, 2);
    drawH(x + t, y + h / 2 - t / 2, w - 2 * t, 3);
    drawV(x, y + h / 2 + t / 2, h / 2 - t, 4);
    drawV(x + w - t, y + h / 2 + t / 2, h / 2 - t, 5);
    drawH(x + t, y + h - t, w - 2 * t, 6);
  }
}
