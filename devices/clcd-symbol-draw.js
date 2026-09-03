/* ================= CLCD SYMBOL DRAW (shared CLCD widget + canvas drawSymbol) ================= */

let _clcdFaFontsReady = false;
let _clcdFaFontsPromise = null;

function ensureClcdFaFontsLoaded() {
  if (_clcdFaFontsReady) return Promise.resolve();
  if (typeof document === 'undefined' || !document.fonts) {
    _clcdFaFontsReady = true;
    return Promise.resolve();
  }
  if (!_clcdFaFontsPromise) {
    _clcdFaFontsPromise = Promise.all([
      document.fonts.load('900 24px "Font Awesome 5 Free"'),
      document.fonts.load('400 24px "Font Awesome 5 Free"'),
      document.fonts.load('400 24px "Font Awesome 5 Brands"'),
    ]).then(() => {
      _clcdFaFontsReady = true;
    }).catch(() => {
      _clcdFaFontsReady = true;
    });
  }
  return _clcdFaFontsPromise;
}

function clcdDrawDot(ctx, x, y, color, r) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function clcdDrawDigit7(ctx, x, y, segBits, onColor, offColor, segCount) {
  const w = 28;
  const h = 44;
  const t = 3;
  const pad = String(segBits).padEnd(segCount, '0').substring(0, segCount);
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

function validateClcdCanvasBits(name, bits, line) {
  const s = String(bits);
  if (!/^[01]+$/.test(s)) {
    throw new Error(`canvas: symbol bits must be 0/1 string (line ${line})`);
  }
  if (name === 'digit7' && s.length !== 7) {
    throw new Error(`canvas: digit7 requires 7 bits (line ${line})`);
  }
  if (name === 'digit14' && s.length !== 7 && s.length !== 14) {
    throw new Error(`canvas: digit14 requires 7 or 14 bits (line ${line})`);
  }
  if (name === 'dp' && s.length !== 1) {
    throw new Error(`canvas: dp requires 1 bit (line ${line})`);
  }
  if (name === 'colon' && s.length !== 2) {
    throw new Error(`canvas: colon requires 2 bits (line ${line})`);
  }
}

function canvasValidateSymbolSize(kind, size, line) {
  if (size === null || size === undefined) return;
  const n = Number(size);
  if (kind === 'fa') {
    if (n < 8 || n > 64) {
      throw new Error(`canvas: FA symbol size must be 8-64 (line ${line})`);
    }
  } else if (kind === 'canvas') {
    if (n < 8 || n > 120) {
      throw new Error(`canvas: canvas symbol size must be 8-120 (line ${line})`);
    }
  }
}

function drawClcdCanvasSymbol(ctx, opts) {
  const x = opts.x;
  const y = opts.y;
  const name = opts.name;
  const bits = String(opts.bits);
  const fg = opts.fg;
  const bg = opts.bg;
  const sym = opts.sym || {};
  const scale = (typeof resolveClcdCanvasScale === 'function')
    ? resolveClcdCanvasScale(sym, name)
    : 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (name === 'digit7') {
    clcdDrawDigit7(ctx, 0, 0, bits, fg, bg, 7);
  } else if (name === 'digit14') {
    clcdDrawDigit7(ctx, 0, 0, bits.substring(0, 7), fg, bg, 7);
  } else if (name === 'dp') {
    const dotColor = bits === '1' ? fg : bg;
    clcdDrawDot(ctx, 4, 28, dotColor, 4);
  } else if (name === 'colon') {
    const topColor = bits[0] === '1' ? fg : bg;
    const botColor = bits[1] === '1' ? fg : bg;
    clcdDrawDot(ctx, 0, 10, topColor, 3);
    clcdDrawDot(ctx, 0, 22, botColor, 3);
  }

  ctx.restore();
}

function drawClcdFaIcon(ctx, opts) {
  const symDef = opts.symDef;
  const resolved = (typeof resolveClcdFaStyle === 'function')
    ? resolveClcdFaStyle(symDef, opts.style)
    : null;
  if (!resolved) return;
  const sym = opts.sym || {};
  const px = (typeof resolveClcdFaIconSize === 'function')
    ? resolveClcdFaIconSize(sym)
    : 22;
  ctx.save();
  ctx.font = `${resolved.weight} ${px}px ${resolved.fontFamily}`;
  ctx.fillStyle = opts.color;
  ctx.textBaseline = 'top';
  ctx.fillText(resolved.glyph, opts.x, opts.y);
  ctx.restore();
}

function clcdWidgetCanvasBits(sym, readBitFn, on) {
  if (sym.name === 'dp') {
    if (sym.bit !== undefined) return readBitFn(sym.bit) ? '1' : '0';
    if (sym.bitsStart !== undefined) {
      const s = [];
      for (let i = sym.bitsStart; i <= sym.bitsEnd; i++) s.push(readBitFn(i) ? '1' : '0');
      return s.length === 1 ? s[0] : s[s.length - 1];
    }
    return on ? '1' : '0';
  }
  if (sym.name === 'colon') {
    if (sym.bitsStart !== undefined) {
      const s = [];
      for (let i = sym.bitsStart; i <= sym.bitsEnd; i++) s.push(readBitFn(i) ? '1' : '0');
      const joined = s.join('');
      if (joined.length >= 2) return joined.substring(0, 2);
      return joined === '1' ? '11' : '00';
    }
    return on ? '11' : '00';
  }
  if (sym.name === 'digit7' || sym.name === 'digit14') {
    const segs = [];
    for (let i = sym.bitsStart; i <= sym.bitsEnd; i++) {
      segs.push(readBitFn(i) ? '1' : '0');
    }
    return segs.join('');
  }
  return '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ensureClcdFaFontsLoaded,
    clcdDrawDot,
    clcdDrawDigit7,
    validateClcdCanvasBits,
    canvasValidateSymbolSize,
    drawClcdCanvasSymbol,
    drawClcdFaIcon,
    clcdWidgetCanvasBits,
  };
}
