var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var CanvasComponent = class CanvasComponent extends BuiltinComponent {
  static get type() { return 'canvas'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits() { return 1; }

  getSpecialParseAttributes() {
    return {
      canvasProgramBlockAttrs: true,
      literalAttrs: [],
    };
  }

  static normalizeColor(val, fallback) {
    if (val === undefined || val === null || val === '') return fallback;
    let s = String(val);
    if (s.charAt(0) === '^') s = '#' + s.slice(1);
    else if (s.charAt(0) !== '#') s = '#' + s;
    return s.toLowerCase();
  }

  static parsePositiveInt(val, name, attr, compName) {
    if (val === undefined || val === null || val === '') {
      throw Error(`canvas ${compName}: '${attr}' is required`);
    }
    const n = parseInt(String(val), 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw Error(`canvas ${compName}: '${attr}' must be a positive integer`);
    }
    return n;
  }

  _parsePrograms(attributes, ctx, compName) {
    const blocks = attributes.canvasPrograms;
    if (!blocks || !blocks.length) {
      throw Error(`canvas ${compName}: requires inline reference block (.renderer { })`);
    }
    const programs = [];
    for (const block of blocks) {
      const inst = ctx.inlineInstances.get(block.ref);
      if (!inst || inst.kind !== 'canvas') {
        throw Error(`canvas program ${block.ref} must be inline [canvas]`);
      }
      programs.push({ ref: block.ref, inst, bodyRaw: block.bodyRaw || '' });
    }
    return programs;
  }

  getDef() {
    return {
      attrs: [
        { name: 'width', value: 'integer' },
        { name: 'height', value: 'integer' },
        { name: 'bgColor', value: 'color' },
        { name: 'label', value: 'string' },
        { name: 'on', value: 'raise|edge|1' },
        { name: 'nl', value: null },
      ],
      initValue: null,
      pins: [
        { bits: '1', name: 'set' },
        { bits: '1', name: 'draw' },
      ],
      pouts: [{ bits: '1', name: 'busy' }],
      returns: null,
    };
  }

  getSupportedProperties() {
    return ['set', 'draw'];
  }

  _isActive(val) {
    return val === '1' || (val && val[val.length - 1] === '1');
  }

  reEvalPendingValue(pending, key, reEvaluate, ctx) {
    const entry = pending[key];
    if (!entry) return '0';
    if (!reEvaluate && entry.value != null) return entry.value;
    if (!entry.expr) return entry.value || '0';
    let value = '';
    const exprResult = ctx.evalExpr(entry.expr, false);
    for (const part of exprResult) {
      if (part.value && part.value !== '-') value += part.value;
      else if (part.ref && part.ref !== '&-') {
        const val = ctx.getValueFromRef(part.ref);
        if (val) value += val;
      }
    }
    return value;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const width = CanvasComponent.parsePositiveInt(attributes.width, name, 'width', name);
    const height = CanvasComponent.parsePositiveInt(attributes.height, name, 'height', name);
    const bgColor = CanvasComponent.normalizeColor(attributes.bgColor, '#000000');
    const label = (attributes.label != null && String(attributes.label) !== '')
      ? String(attributes.label)
      : null;
    const programs = this._parsePrograms(attributes, ctx, name);
    const prog = programs[0];

    const busyIdx = ctx.storeValue('0');
    const busyRef = `&${busyIdx}`;

    const compInfo = {
      type: 'canvas',
      name,
      attributes,
      deviceIds: [baseId],
      width,
      height,
      bgColor,
      programRef: prog.ref,
      canvasPrograms: programs,
      busyRef,
      _canvasRendererCalls: null,
      _pendingRedraw: false,
      _drawScheduled: false,
    };

    if (typeof addCanvas === 'function') {
      addCanvas({
        id: baseId,
        width,
        height,
        bgColor,
        label,
        nl: !!attributes.nl,
      });
      const self = this;
      if (typeof setCanvasDrawHandler === 'function') {
        setCanvasDrawHandler(baseId, (drawCtx) => {
          self._runDraw(compInfo, drawCtx, ctx);
        });
      }
    }

    return { earlyReturn: true, compInfo };
  }

  _getProgram(comp, ctx) {
    const inst = ctx.inlineInstances.get(comp.programRef);
    if (!inst) throw Error(`canvas ${comp.name}: inline ${comp.programRef} not found`);
    if (!inst.methods) {
      const parseFn = typeof parseCanvasBody === 'function' ? parseCanvasBody : null;
      if (!parseFn) throw Error('Canvas assembler is not loaded');
      const parsed = parseFn(inst.bodyRaw, `inline ${comp.programRef}`);
      inst.methods = parsed.methods;
    }
    return { methods: inst.methods };
  }

  _runDraw(comp, drawCtx, interp) {
    const execFn = typeof executeCanvasRenderer === 'function' ? executeCanvasRenderer : null;
    if (!execFn || !drawCtx) return;
    if (comp.busyRef) interp.setValueAtRef(comp.busyRef, '1');
    try {
      const program = this._getProgram(comp, interp);
      const calls = comp._canvasRendererCalls || [];
      execFn(program, calls, drawCtx, { logErrors: true, skipOnError: true });
    } finally {
      if (comp.busyRef) interp.setValueAtRef(comp.busyRef, '0');
      comp._pendingRedraw = false;
      CanvasComponent.propagateBusy(interp, comp.name);
    }
  }

  static propagateBusy(ctx, compName) {
    if (ctx && typeof ctx.propagateComponent === 'function') {
      ctx.propagateComponent(compName);
    }
  }

  _scheduleDraw(comp, interp) {
    comp._pendingRedraw = true;
    const baseId = comp.deviceIds && comp.deviceIds[0];
    if (typeof requestCanvasDraw === 'function' && baseId) {
      requestCanvasDraw(baseId);
      return;
    }
    const mockFn = typeof createCanvasMockCtx === 'function' ? createCanvasMockCtx : null;
    if (mockFn) {
      const { ctx: mctx } = mockFn();
      this._runDraw(comp, mctx, interp);
    }
  }

  /** Synchronous draw for tests (node). */
  static flushCanvas(comp, interp) {
    if (!comp || comp.type !== 'canvas') return;
    const handler = CanvasComponent._handlerInstance();
    if (!handler) return;
    const baseId = comp.deviceIds && comp.deviceIds[0];
    const display = typeof getCanvasDisplay === 'function' ? getCanvasDisplay(baseId) : null;
    if (display && display.ctx) {
      display.drawNow();
      return;
    }
    const mockFn = typeof createCanvasMockCtx === 'function' ? createCanvasMockCtx : null;
    if (mockFn) {
      const { ctx } = mockFn();
      handler._runDraw(comp, ctx, interp);
    }
  }

  static _handlerInstance() {
    return new CanvasComponent();
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const setActive = pending.set !== undefined
      && this._isActive(this.reEvalPendingValue(pending, 'set', reEvaluate, ctx));
    const drawActive = pending.draw !== undefined
      && this._isActive(this.reEvalPendingValue(pending, 'draw', reEvaluate, ctx));
    if (!setActive && !drawActive) return;

    const blocks = comp._canvasRendererBlocks || [];
    if (blocks.length) {
      const parseFn = typeof parseCanvasRendererBlock === 'function'
        ? parseCanvasRendererBlock : null;
      if (!parseFn) throw Error('Canvas assembler is not loaded');
      const calls = [];
      for (const block of blocks) {
        calls.push(...parseFn(block.raw, `canvas ${compName}`));
      }
      comp._canvasRendererCalls = calls;
    }

    this._scheduleDraw(comp, ctx);
    comp._canvasRendererBlocks = null;
  }

  shouldApplyAfterPropertyBlock(propertyNames) {
    return propertyNames.some((p) => p === 'set' || p === 'draw');
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'busy') {
      let val = '0';
      if (comp.busyRef) val = ctx.getValueFromRef(comp.busyRef) || '0';
      return { value: val, ref: null, varName: `${a.var}:busy`, bitWidth: 1 };
    }
    return null;
  }

  getForbidDirectAssign() {
    return 'Cannot assign a value to a canvas component directly.';
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasComponent;
}
