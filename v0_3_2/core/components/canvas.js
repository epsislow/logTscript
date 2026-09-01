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
        { bits: '1', name: 'clear' },
      ],
      pouts: [{ bits: '1', name: 'busy' }],
      returns: null,
    };
  }

  getSupportedProperties() {
    return ['set', 'draw', 'clear', 'busy'];
  }

  supportsPropertyName(property) {
    return property === 'busy';
  }

  getRedirectProperties() {
    return ['busy'];
  }

  _ensurePin(comp, wireRef, ctx, compName, vectorRequired) {
    if (!comp.pinDefs) comp.pinDefs = {};
    if (!comp.pinStorage) comp.pinStorage = {};
    const pinName = wireRef.pinName;
    const existing = comp.pinDefs[pinName];
    if (existing) {
      if (existing.bindType !== wireRef.bindType
          || (existing.numberFormat || null) !== (wireRef.numberFormat || null)) {
        throw Error(`canvas ${compName}: pin '${pinName}' format mismatch`);
      }
      if (vectorRequired != null && existing.vectorRequired != null
          && existing.vectorRequired !== vectorRequired) {
        throw Error(`canvas ${compName}: pin '${pinName}' vector/scalar mismatch`);
      }
      if (vectorRequired != null) existing.vectorRequired = vectorRequired;
      return;
    }
    const bitWidthFn = typeof canvasPinBitWidth === 'function' ? canvasPinBitWidth : null;
    const bits = bitWidthFn
      ? bitWidthFn(wireRef.bindType, wireRef.numberFormat, null)
      : 16;
    const storageIdx = ctx.storeValue('0'.repeat(bits));
    comp.pinDefs[pinName] = {
      bindType: wireRef.bindType,
      numberFormat: wireRef.numberFormat || null,
      bits,
      vectorRequired: vectorRequired != null ? !!vectorRequired : false,
      vector: null,
    };
    comp.pinStorage[pinName] = {
      ref: `&${storageIdx}`,
      bits,
      bindType: wireRef.bindType,
      numberFormat: wireRef.numberFormat || null,
      vector: null,
    };
  }

  _ensurePinsFromCalls(comp, calls, ctx, compName, methods) {
    const collectFn = typeof canvasCollectWireRefsFromCalls === 'function'
      ? canvasCollectWireRefsFromCalls : null;
    if (!collectFn) return;
    const refs = collectFn(calls);
    for (let i = 0; i < (calls || []).length; i++) {
      const call = calls[i];
      const method = methods && methods[call.name];
      for (let j = 0; j < (call.args || []).length; j++) {
        const arg = call.args[j];
        if (!arg || arg.kind !== 'wireRef') continue;
        const param = method && method.params[j];
        const vectorRequired = param ? !!param.vector : false;
        this._ensurePin(comp, arg, ctx, compName, vectorRequired);
      }
    }
    const alignFn = typeof canvasAlignPinsFromRendererCalls === 'function'
      ? canvasAlignPinsFromRendererCalls : null;
    if (alignFn && methods) alignFn(comp, calls, methods, compName);
  }

  _ensurePinsFromRendererRaw(comp, raw, ctx, compName, methods) {
    const parseFn = typeof parseCanvasRendererBlock === 'function'
      ? parseCanvasRendererBlock : null;
    if (!parseFn || !raw) return;
    const calls = parseFn(raw, `canvas ${compName}`);
    this._ensurePinsFromCalls(comp, calls, ctx, compName, methods);
  }

  static preparePropertyBlock(comp, properties, ctx, compName) {
    if (!comp || comp.type !== 'canvas') return;
    const blocks = (properties || []).filter((p) => p.property === 'canvasRenderer');
    const handler = new CanvasComponent();
    let methods = null;
    try {
      const program = handler._getProgram(comp, ctx);
      methods = program.methods;
    } catch (e) {
      methods = null;
    }
    for (const block of blocks) {
      handler._ensurePinsFromRendererRaw(comp, block.raw, ctx, compName, methods);
    }
    let clearFlag = true;
    for (const p of properties || []) {
      if (p.property !== 'clear' || !p.expr) continue;
      let value = '';
      const exprResult = ctx.evalExpr(p.expr, false);
      for (const part of exprResult) {
        if (part.value && part.value !== '-') value += part.value;
        else if (part.ref && part.ref !== '&-') {
          const val = ctx.getValueFromRef(part.ref);
          if (val) value += val;
        }
      }
      clearFlag = value === '1' || (value && value[value.length - 1] === '1');
      break;
    }
    comp._canvasClear = clearFlag;
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
      pinDefs: {},
      pinStorage: {},
      _canvasRendererCalls: null,
      _canvasClear: true,
      _canvasDrawing: false,
      _pendingAfterBusy: false,
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
        setCanvasDrawHandler(baseId, (drawCtx, drawOpts) => {
          self._runDraw(compInfo, drawCtx, ctx, drawOpts);
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

  _runDraw(comp, drawCtx, interp, drawOpts) {
    const execFn = typeof executeCanvasRenderer === 'function' ? executeCanvasRenderer : null;
    if (!execFn || !drawCtx) return;
    const doClear = !drawOpts || drawOpts.clear !== false;
    if (doClear && drawCtx.fillRect && comp.width && comp.height) {
      drawCtx.fillStyle = comp.bgColor;
      drawCtx.fillRect(0, 0, comp.width, comp.height);
    }
    comp._canvasDrawing = true;
    if (comp.busyRef) interp.setValueAtRef(comp.busyRef, '1');
    CanvasComponent.propagateBusy(interp, comp.name);
    try {
      const program = this._getProgram(comp, interp);
      const calls = comp._canvasRendererCalls || [];
      const buildEnvFn = typeof canvasBuildPinEnv === 'function' ? canvasBuildPinEnv : null;
      const pinEnv = buildEnvFn
        ? buildEnvFn(comp, comp._lastPending, false, interp, (p, key, re, c) => (
          this.reEvalPendingValue(p, key, re, c)
        ))
        : {};
      execFn(program, calls, drawCtx, {
        logErrors: true,
        skipOnError: true,
        pinEnv,
      });
    } finally {
      comp._canvasDrawing = false;
      if (comp.busyRef) interp.setValueAtRef(comp.busyRef, '0');
      comp._pendingRedraw = false;
      CanvasComponent.propagateBusy(interp, comp.name);
      if (comp._pendingAfterBusy) {
        comp._pendingAfterBusy = false;
        this._scheduleDraw(comp, interp);
      }
    }
  }

  static propagateBusy(ctx, compName) {
    if (ctx && typeof ctx.deferWirePropagation === 'function' && ctx.deferWirePropagation()) {
      if (typeof ctx._notifyComponentComputedMutation === 'function') {
        ctx._notifyComponentComputedMutation(compName);
      }
    } else if (ctx && typeof ctx.reEvalWiresDependingOnComponent === 'function') {
      ctx.reEvalWiresDependingOnComponent(compName);
    }
    if (ctx && typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(compName);
    }
    if (ctx && typeof ctx._emitWatchForComputedComponent === 'function') {
      ctx._emitWatchForComputedComponent(compName);
    }
  }

  _scheduleDraw(comp, interp) {
    if (comp._canvasDrawing) {
      comp._pendingAfterBusy = true;
      return;
    }
    comp._pendingRedraw = true;
    const baseId = comp.deviceIds && comp.deviceIds[0];
    const doClear = comp._canvasClear !== false;
    if (typeof requestCanvasDraw === 'function' && baseId) {
      requestCanvasDraw(baseId, { clear: doClear });
      return;
    }
    const mockFn = typeof createCanvasMockCtx === 'function' ? createCanvasMockCtx : null;
    if (mockFn) {
      const { ctx: mctx } = mockFn();
      this._runDraw(comp, mctx, interp, { clear: doClear });
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
      display._drawOptions = { clear: comp._canvasClear !== false };
      display.drawNow();
      return;
    }
    const mockFn = typeof createCanvasMockCtx === 'function' ? createCanvasMockCtx : null;
    if (mockFn) {
      const { ctx } = mockFn();
      handler._runDraw(comp, ctx, interp, { clear: comp._canvasClear !== false });
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

    if (pending.clear !== undefined) {
      comp._canvasClear = this._isActive(this.reEvalPendingValue(pending, 'clear', reEvaluate, ctx));
    } else {
      comp._canvasClear = true;
    }

    const blocks = comp._canvasRendererBlocks || [];
    if (blocks.length) {
      const parseFn = typeof parseCanvasRendererBlock === 'function'
        ? parseCanvasRendererBlock : null;
      if (!parseFn) throw Error('Canvas assembler is not loaded');
      const program = this._getProgram(comp, ctx);
      const calls = [];
      for (const block of blocks) {
        const parsed = parseFn(block.raw, `canvas ${compName}`);
        this._ensurePinsFromCalls(comp, parsed, ctx, compName, program.methods);
        calls.push(...parsed);
      }
      comp._canvasRendererCalls = calls;
    }

    const buildEnvFn = typeof canvasBuildPinEnv === 'function' ? canvasBuildPinEnv : null;
    if (buildEnvFn) {
      buildEnvFn(comp, pending, reEvaluate, ctx, (p, key, re, c) => (
        this.reEvalPendingValue(p, key, re, c)
      ));
    }
    comp._lastPending = pending;

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
      return {
        value: val,
        ref: comp.busyRef || null,
        varName: `${a.var}:busy`,
        bitWidth: 1,
      };
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
