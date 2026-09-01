/* ================= CANVAS WIDGET ================= */

function addCanvas(options) {
  const container = typeof getDevicesContainer === 'function' ? getDevicesContainer() : null;
  if (!container || !options || !options.id) return null;
  if (typeof showDevices === 'function') showDevices();
  const display = new CanvasDisplay(options);
  display.mount(container);
  if (typeof dm === 'function') {
    dm().canvasDisplays.set(options.id, display);
  }
  return display;
}

function getCanvasDisplay(id) {
  if (typeof dm !== 'function') return null;
  return dm().canvasDisplays.get(id) || null;
}

function requestCanvasDraw(id, options) {
  const display = getCanvasDisplay(id);
  if (display) display.requestDraw(options);
}

function setCanvasDrawHandler(id, fn) {
  const display = getCanvasDisplay(id);
  if (display) display.setDrawHandler(fn);
}

function removeCanvas(id) {
  if (typeof dm !== 'function') return;
  const display = dm().canvasDisplays.get(id);
  if (display) {
    display.destroy();
    dm().canvasDisplays.delete(id);
  }
}

class CanvasDisplay {
  constructor({
    id,
    width = 200,
    height = 120,
    bgColor = '#000000',
    label = null,
    nl = false,
  }) {
    this.id = id;
    this.width = width;
    this.height = height;
    this.bgColor = bgColor;
    this.label = label;
    this.nl = nl;
    this._drawHandler = null;
    this._dirty = false;
    this._rafId = null;
    this._drawOptions = null;

    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.className = 'canvas-device';
      this.ctx = this.canvas.getContext('2d');
    } else {
      this.ctx = null;
    }
  }

  setDrawHandler(fn) {
    this._drawHandler = typeof fn === 'function' ? fn : null;
  }

  requestDraw(options) {
    if (!this.canvas || !this.ctx) return;
    if (options) this._drawOptions = options;
    if (this._dirty) return;
    this._dirty = true;
    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(() => this._drawNow());
    } else {
      this._drawNow();
    }
  }

  drawNow() {
    this._drawNow();
  }

  _drawNow() {
    this._dirty = false;
    this._rafId = null;
    if (!this.ctx) return;
    const opts = this._drawOptions || {};
    this._drawOptions = null;
    const doClear = opts.clear !== false;
    if (doClear) {
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this._drawHandler) {
      try {
        this._drawHandler(this.ctx, opts);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`canvas ${this.id}: draw error`, err);
        }
      }
    }
  }

  mount(parent) {
    if (!this.canvas || !parent) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-wrapper';
    if (this.label) {
      const cap = document.createElement('div');
      cap.className = 'canvas-label';
      cap.textContent = this.label;
      wrapper.appendChild(cap);
    }
    wrapper.appendChild(this.canvas);
    parent.appendChild(wrapper);
    if (this.nl) {
      const br = document.createElement('div');
      br.className = 'break';
      parent.appendChild(br);
    }
    this.requestDraw();
  }

  destroy() {
    if (this._rafId != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
    }
    if (this.canvas && this.canvas.parentNode) {
      const wrap = this.canvas.parentNode;
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addCanvas, getCanvasDisplay, requestCanvasDraw, setCanvasDrawHandler, removeCanvas, CanvasDisplay };
}
