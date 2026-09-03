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

function setCanvasTouchHandler(id, handler) {
  const display = getCanvasDisplay(id);
  if (display) display.setTouchHandler(handler);
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
    this._touchHandler = null;
    this._dirty = false;
    this._rafId = null;
    this._drawOptions = null;
    this._pointerDown = false;

    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.className = 'canvas-device';
      this.ctx = this.canvas.getContext('2d');
      if (typeof ensureClcdFaFontsLoaded === 'function') {
        ensureClcdFaFontsLoaded();
      }
    } else {
      this.ctx = null;
    }
  }

  setDrawHandler(fn) {
    this._drawHandler = typeof fn === 'function' ? fn : null;
  }

  setTouchHandler(handler) {
    this._touchHandler = handler || null;
    this._bindTouch();
  }

  _canvasCoords(clientX, clientY) {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width || this.canvas.width);
    const scaleY = this.canvas.height / (rect.height || this.canvas.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  _bindTouch() {
    if (!this.canvas || !this._touchHandler) return;
    const canvas = this.canvas;
    const self = this;
    if (canvas._canvasTouchBound) return;
    canvas._canvasTouchBound = true;

    const onDown = (e) => {
      e.preventDefault();
      const pt = self._clientPoint(e);
      if (!pt) return;
      const { x, y } = self._canvasCoords(pt.x, pt.y);
      self._pointerDown = true;
      if (self._touchHandler.onPress) self._touchHandler.onPress(x, y);
    };
    const onUp = (e) => {
      const pt = self._clientPoint(e);
      const { x, y } = pt ? self._canvasCoords(pt.x, pt.y) : { x: 0, y: 0 };
      self._pointerDown = false;
      if (self._touchHandler.onRelease) self._touchHandler.onRelease(x, y);
    };
    const onMove = (e) => {
      const pt = self._clientPoint(e);
      if (!pt) return;
      const { x, y } = self._canvasCoords(pt.x, pt.y);
      if (self._touchHandler.onMove) self._touchHandler.onMove(x, y);
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('touchmove', onMove, { passive: false });
  }

  _clientPoint(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    if (e.clientX != null) return { x: e.clientX, y: e.clientY };
    return null;
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
  module.exports = {
    addCanvas,
    getCanvasDisplay,
    requestCanvasDraw,
    setCanvasDrawHandler,
    setCanvasTouchHandler,
    removeCanvas,
    CanvasDisplay,
  };
}
