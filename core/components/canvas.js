var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var CanvasComponent = class CanvasComponent extends BuiltinComponent {
  static get type() { return 'canvas'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits() { return 1; }

  getSpecialParseAttributes() {
    return {
      canvasProgramBlockAttrs: true,
      hitboxBlockAttrs: ['hitbox'],
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

  static normalizeHitboxStrokeColor(val) {
    if (val === undefined || val === null || val === '') return '#ffff00';
    let s = String(val);
    if (s.charAt(0) === '^') s = '#' + s.slice(1);
    else if (s.charAt(0) !== '#') s = '#' + s;
    if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
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

  static hitTestAt(zones, px, py) {
    const hits = [];
    if (!zones) return hits;
    for (const name of Object.keys(zones)) {
      const zone = zones[name];
      if (!zone || !zone.rect) continue;
      const r = zone.rect;
      if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) {
        hits.push({ name, zone });
      }
    }
    return hits;
  }

  static whenKey(zoneName, event) {
    return `${zoneName}:${event || 'press'}`;
  }

  _parseHitbox(attributes, compName) {
    const parseFn = typeof parseCanvasHitboxBlock === 'function'
      ? parseCanvasHitboxBlock : null;
    if (!parseFn || !attributes.canvasHitboxRaw) return { zones: {} };
    return parseFn(attributes.canvasHitboxRaw, `canvas ${compName}`);
  }

  _parseProgramBlock(bodyRaw, compName) {
    const parseFn = typeof parseCanvasProgramBlock === 'function'
      ? parseCanvasProgramBlock : null;
    if (!parseFn) return { initDraw: null, whenRenderers: [] };
    return parseFn(bodyRaw || '', `canvas ${compName}`);
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

  _poutBitWidth(pout) {
    if (pout.bindType === 'bool') return 1;
    if (pout.bindType === 'text') return 256;
    const widthFn = typeof logicNumberFormatBitWidth === 'function'
      ? logicNumberFormatBitWidth : null;
    if (widthFn && pout.numberFormat) return widthFn(pout.numberFormat, 16);
    return 16;
  }

  _setupHitboxPouts(comp, ctx, compName) {
    comp.hitboxPouts = {};
    const zones = comp.hitboxZones || {};
    const names = new Set();
    for (const zoneName of Object.keys(zones)) {
      const zone = zones[zoneName];
      for (const pout of zone.pouts || []) {
        if (names.has(pout.name)) {
          throw Error(`canvas ${compName}: duplicate hitbox pout '${pout.name}'`);
        }
        names.add(pout.name);
        const bits = this._poutBitWidth(pout);
        const storageIdx = ctx.storeValue('0'.repeat(bits));
        comp.hitboxPouts[pout.name] = {
          ref: `&${storageIdx}`,
          bits,
          bindType: pout.bindType,
          numberFormat: pout.numberFormat || null,
          event: pout.event,
          field: pout.field,
          zoneName,
        };
      }
    }
  }

  _encodePoutValue(pout, rawValue) {
    if (pout.bindType === 'bool') {
      return rawValue ? '1' : '0';
    }
    if (pout.bindType === 'text') {
      const s = String(rawValue == null ? '' : rawValue);
      let bits = '';
      for (let i = 0; i < s.length && bits.length < pout.bits; i++) {
        bits += s.charCodeAt(i).toString(2).padStart(8, '0');
      }
      return bits.padEnd(pout.bits, '0').slice(-pout.bits);
    }
    const encFn = typeof logicEncodeNumberValue === 'function' ? logicEncodeNumberValue : null;
    const n = Number(rawValue);
  const v = Number.isFinite(n) ? n : 0;
    if (encFn) return encFn(v, pout.bits, pout.numberFormat);
    return (v >>> 0).toString(2).padStart(pout.bits, '0').slice(-pout.bits);
  }

  _setHitboxPout(comp, compName, poutName, rawValue, ctx) {
    const pout = comp.hitboxPouts && comp.hitboxPouts[poutName];
    if (!pout || !pout.ref) return;
    const bits = this._encodePoutValue(pout, rawValue);
    const prev = ctx.getValueFromRef(pout.ref);
    if (prev === bits) return;
    ctx.setValueAtRef(pout.ref, bits);
    if (typeof ctx.scheduleHitboxPoutChange === 'function') {
      ctx.scheduleHitboxPoutChange(compName, poutName);
    } else if (typeof ctx.scheduleTouchOutChange === 'function') {
      ctx.scheduleTouchOutChange(compName);
    } else {
      CanvasComponent.propagateBusy(ctx, compName);
      if (typeof showVars === 'function') showVars();
    }
  }

  _clearZonePouts(comp, compName, zoneName, event, ctx) {
    const zones = comp.hitboxZones || {};
    const zone = zones[zoneName];
    if (!zone) return;
    for (const decl of zone.pouts || []) {
      if (decl.event !== event || decl.field) continue;
      if (decl.bindType !== 'bool') continue;
      this._setHitboxPout(comp, compName, decl.name, 0, ctx);
    }
  }

  _publishZonePouts(comp, compName, zoneName, event, ctx) {
    const zones = comp.hitboxZones || {};
    const zone = zones[zoneName];
    if (!zone) return;
    for (const decl of zone.pouts || []) {
      if (decl.event !== event) continue;
      let value = 1;
      if (decl.field === 'eventX') value = comp._eventX != null ? comp._eventX : 0;
      else if (decl.field === 'eventY') value = comp._eventY != null ? comp._eventY : 0;
      else if (decl.bindType !== 'bool') continue;
      else if (event === 'release') value = 0;
      this._setHitboxPout(comp, compName, decl.name, value, ctx);
    }
  }

  _ensureTouchState(comp) {
    if (!comp.touchPressZones) comp.touchPressZones = new Set();
    if (!comp.touchLatchZones) comp.touchLatchZones = new Set();
    if (!comp.activeWhenKeys) comp.activeWhenKeys = new Set();
    if (comp._pointerDown == null) comp._pointerDown = false;
  }

  _setActiveWhen(comp, zoneName, event, active) {
    this._ensureTouchState(comp);
    const key = CanvasComponent.whenKey(zoneName, event);
    if (active) comp.activeWhenKeys.add(key);
    else comp.activeWhenKeys.delete(key);
  }

  _syncPressWhenKeys(comp) {
    this._ensureTouchState(comp);
    const zones = comp.hitboxZones || {};
    for (const zoneName of Object.keys(zones)) {
      const zone = zones[zoneName];
      const pressed = comp.touchPressZones.has(zoneName)
        || (zone.touchType === 3 && comp.touchLatchZones.has(zoneName));
      this._setActiveWhen(comp, zoneName, 'press', pressed);
      if (zone.touchType !== 3) {
        this._setActiveWhen(comp, zoneName, 'press', pressed);
      }
    }
  }

  _applyPointerPress(comp, compName, x, y, ctx) {
    if (!comp.hitboxZones || !Object.keys(comp.hitboxZones).length) return;
    this._ensureTouchState(comp);
    comp._eventX = Math.trunc(x);
    comp._eventY = Math.trunc(y);
    comp._pointerDown = true;
    const hits = CanvasComponent.hitTestAt(comp.hitboxZones, x, y);
    comp._lastHitZones = hits.map((h) => h.name);
    const pulseZones = [];

    for (const hit of hits) {
      const zone = hit.zone;
      const tt = zone.touchType || 1;
      if (tt === 1) {
        comp.touchPressZones.add(hit.name);
      } else if (tt === 2) {
        comp.touchPressZones.add(hit.name);
        pulseZones.push(hit.name);
      } else if (tt === 3) {
        if (comp.touchLatchZones.has(hit.name)) comp.touchLatchZones.delete(hit.name);
        else comp.touchLatchZones.add(hit.name);
      }
      this._publishZonePouts(comp, compName, hit.name, 'press', ctx);
      this._setActiveWhen(comp, hit.name, 'press', true);
      this._setActiveWhen(comp, hit.name, 'release', false);
    }
    this._syncPressWhenKeys(comp);
    this._scheduleInputRedraw(comp, ctx);

    if (pulseZones.length > 0) {
      const self = this;
      const releasePulse = () => {
        for (const zn of pulseZones) comp.touchPressZones.delete(zn);
        self._syncPressWhenKeys(comp);
        self._scheduleInputRedraw(comp, ctx);
      };
      if (typeof ctx.runSafely === 'function') ctx.runSafely(releasePulse);
      else releasePulse();
    }
  }

  _applyPointerRelease(comp, compName, x, y, ctx) {
    if (!comp.hitboxZones || !Object.keys(comp.hitboxZones).length) return;
    this._ensureTouchState(comp);
    comp._eventX = Math.trunc(x);
    comp._eventY = Math.trunc(y);
    comp._pointerDown = false;
    const hits = CanvasComponent.hitTestAt(comp.hitboxZones, x, y);
    const lastHits = comp._lastHitZones || [];

    for (const zoneName of lastHits) {
      const zone = comp.hitboxZones[zoneName];
      if (!zone) continue;
      if ((zone.touchType || 1) === 1) {
        comp.touchPressZones.delete(zoneName);
        this._clearZonePouts(comp, compName, zoneName, 'press', ctx);
      }
      this._publishZonePouts(comp, compName, zoneName, 'release', ctx);
      this._setActiveWhen(comp, zoneName, 'release', true);
      this._setActiveWhen(comp, zoneName, 'drag', false);
    }
    for (const hit of hits) {
      this._setActiveWhen(comp, hit.name, 'release', true);
    }
    comp._lastHitZones = [];
    this._syncPressWhenKeys(comp);
    this._scheduleInputRedraw(comp, ctx);
    for (const zoneName of Object.keys(comp.hitboxZones || {})) {
      this._setActiveWhen(comp, zoneName, 'release', false);
    }
  }

  _hasWhenEvent(comp, event) {
    const list = comp.programBlock && comp.programBlock.whenRenderers;
    return !!(list && list.some((w) => w.event === event));
  }

  _applyPointerMove(comp, compName, x, y, ctx) {
    if (!comp.hitboxZones || !Object.keys(comp.hitboxZones).length) return;
    this._ensureTouchState(comp);
    const dragging = comp._pointerDown && comp.touchPressZones && comp.touchPressZones.size > 0;
    const trackMove = !dragging && this._hasWhenEvent(comp, 'move');
    if (!dragging && !trackMove) return;

    comp._eventX = Math.trunc(x);
    comp._eventY = Math.trunc(y);
    const hits = CanvasComponent.hitTestAt(comp.hitboxZones, x, y);
    if (trackMove) {
      for (const hit of hits) {
        this._publishZonePouts(comp, compName, hit.name, 'move', ctx);
        this._setActiveWhen(comp, hit.name, 'move', true);
      }
    }
    if (dragging) {
      for (const zoneName of comp.touchPressZones) {
        this._publishZonePouts(comp, compName, zoneName, 'drag', ctx);
        this._setActiveWhen(comp, zoneName, 'drag', true);
      }
    }
    this._scheduleInputRedraw(comp, ctx);
    if (trackMove) {
      for (const zoneName of Object.keys(comp.hitboxZones || {})) {
        this._setActiveWhen(comp, zoneName, 'move', false);
      }
    }
    if (dragging) {
      for (const zoneName of Object.keys(comp.hitboxZones || {})) {
        if (!comp.touchPressZones.has(zoneName)) {
          this._setActiveWhen(comp, zoneName, 'drag', false);
        }
      }
    }
  }

  _scheduleInputRedraw(comp, ctx) {
    comp._canvasClear = true;
    this._scheduleDraw(comp, ctx);
  }

  _hasProgramDraw(comp) {
    const pb = comp.programBlock;
    const hasInit = !!(pb && pb.initDraw && pb.initDraw.length);
    const hasWhen = !!(pb && pb.whenRenderers && pb.whenRenderers.length);
    const hasExec = !!(comp._canvasRendererCalls && comp._canvasRendererCalls.length);
    const hasHitbox = !!(comp.hitboxZones && Object.keys(comp.hitboxZones).length);
    return hasInit || hasWhen || hasExec || hasHitbox;
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

  supportsPropertyName(property, attributes) {
    if (property === 'busy') return true;
    const names = attributes && attributes.hitboxPoutNames;
    return !!(names && names.includes(property));
  }

  getReadableProperties(comp) {
    const props = ['busy'];
    if (comp && comp.hitboxPouts) {
      for (const name of Object.keys(comp.hitboxPouts)) props.push(name);
    }
    return props;
  }

  getRedirectProperties() {
    return ['busy'];
  }

  supportsRedirectProperty(property, comp) {
    if (property === 'busy') return true;
    return !!(comp && comp.hitboxPouts && comp.hitboxPouts[property]);
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
    const hitboxParsed = this._parseHitbox(attributes, name);
    const programBlock = this._parseProgramBlock(prog.bodyRaw, name);

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
      hitboxZones: hitboxParsed.zones,
      programBlock,
      busyRef,
      pinDefs: {},
      pinStorage: {},
      hitboxPouts: {},
      _canvasRendererCalls: null,
      _canvasClear: true,
      _canvasDrawing: false,
      _pendingAfterBusy: false,
      _pendingRedraw: false,
      _drawScheduled: false,
      _initDrawDone: false,
      _eventX: 0,
      _eventY: 0,
    };

    this._setupHitboxPouts(compInfo, ctx, name);
    if (attributes) {
      attributes.hitboxPoutNames = Object.keys(compInfo.hitboxPouts || {});
    }

    const self = this;
    const onPress = (px, py) => {
      const comp = ctx.components.get(name);
      if (!comp) return;
      self._applyPointerPress(comp, name, px, py, ctx);
    };
    const onRelease = (px, py) => {
      const comp = ctx.components.get(name);
      if (!comp) return;
      self._applyPointerRelease(comp, name, px, py, ctx);
    };
    const onMove = (px, py) => {
      const comp = ctx.components.get(name);
      if (!comp) return;
      self._applyPointerMove(comp, name, px, py, ctx);
    };
    compInfo.touchHandler = { onPress, onRelease, onMove };

    if (typeof addCanvas === 'function') {
      addCanvas({
        id: baseId,
        width,
        height,
        bgColor,
        label,
        nl: !!attributes.nl,
      });
      if (typeof setCanvasDrawHandler === 'function') {
        setCanvasDrawHandler(baseId, (drawCtx, drawOpts) => {
          self._runDraw(compInfo, drawCtx, ctx, drawOpts);
        });
      }
      if (typeof setCanvasTouchHandler === 'function' && Object.keys(hitboxParsed.zones).length) {
        setCanvasTouchHandler(baseId, { onPress, onRelease, onMove });
      }
    }

    if (this._hasProgramDraw(compInfo)) {
      compInfo._canvasClear = true;
      this._scheduleDraw(compInfo, ctx);
    }

    return { earlyReturn: true, compInfo };
  }

  _runInitDraw(comp, ctx) {
    // initDraw runs inside _runDraw on each cleared redraw
    if (comp) comp._initDrawDone = true;
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

  _drawHitboxDebug(comp, drawCtx) {
    const zones = comp.hitboxZones || {};
    for (const zoneName of Object.keys(zones)) {
      const zone = zones[zoneName];
      if (!zone || !zone.rect || !zone.stroke) continue;
      const r = zone.rect;
      if (drawCtx.strokeStyle !== undefined) {
        drawCtx.strokeStyle = CanvasComponent.normalizeHitboxStrokeColor(zone.stroke);
      }
      if (drawCtx.lineWidth !== undefined) drawCtx.lineWidth = 1;
      if (drawCtx.strokeRect) drawCtx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
    }
  }

  _runWhenOverlays(comp, drawCtx, interp) {
    const whenList = (comp.programBlock && comp.programBlock.whenRenderers) || [];
    if (!whenList.length || !comp.activeWhenKeys || !comp.activeWhenKeys.size) return;
    const execFn = typeof executeCanvasRenderer === 'function' ? executeCanvasRenderer : null;
    if (!execFn) return;
    const program = this._getProgram(comp, interp);
    const buildEnvFn = typeof canvasBuildPinEnv === 'function' ? canvasBuildPinEnv : null;
    const basePinEnv = buildEnvFn
      ? buildEnvFn(comp, comp._lastPending, false, interp, (p, key, re, c) => (
        this.reEvalPendingValue(p, key, re, c)
      ))
      : {};
    const eventPinEnv = Object.assign({}, basePinEnv, {
      eventX: comp._eventX != null ? comp._eventX : 0,
      eventY: comp._eventY != null ? comp._eventY : 0,
    });
    for (const when of whenList) {
      const key = CanvasComponent.whenKey(when.hitbox, when.event);
      if (!comp.activeWhenKeys.has(key)) continue;
      execFn(program, when.calls || [], drawCtx, {
        logErrors: true,
        skipOnError: true,
        pinEnv: eventPinEnv,
      });
    }
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
      const initCalls = comp.programBlock && comp.programBlock.initDraw;
      if (initCalls && initCalls.length) {
        execFn(program, initCalls, drawCtx, {
          logErrors: true,
          skipOnError: true,
          pinEnv: {},
        });
        comp._initDrawDone = true;
      }
      const calls = comp._canvasRendererCalls || [];
      const buildEnvFn = typeof canvasBuildPinEnv === 'function' ? canvasBuildPinEnv : null;
      const pinEnv = buildEnvFn
        ? buildEnvFn(comp, comp._lastPending, false, interp, (p, key, re, c) => (
          this.reEvalPendingValue(p, key, re, c)
        ))
        : {};
      if (calls.length) {
        execFn(program, calls, drawCtx, {
          logErrors: true,
          skipOnError: true,
          pinEnv,
        });
      }
      this._runWhenOverlays(comp, drawCtx, interp);
      this._drawHitboxDebug(comp, drawCtx);
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
        ctx._notifyComponentComputedMutation(compName, 'busy');
      }
    } else if (ctx && typeof ctx.reEvalWiresDependingOnComponent === 'function') {
      ctx.reEvalWiresDependingOnComponent(compName, 'busy');
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
      comp._canvasRendererBlocks = null;
    } else if (!comp._canvasRendererCalls || !comp._canvasRendererCalls.length) {
      throw Error(`canvas ${compName}: exec block requires renderer { }`);
    }

    const buildEnvFn = typeof canvasBuildPinEnv === 'function' ? canvasBuildPinEnv : null;
    if (buildEnvFn) {
      buildEnvFn(comp, pending, reEvaluate, ctx, (p, key, re, c) => (
        this.reEvalPendingValue(p, key, re, c)
      ));
    }
    comp._lastPending = pending;

    this._scheduleDraw(comp, ctx);
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
    const pout = comp.hitboxPouts && comp.hitboxPouts[property];
    if (pout && pout.ref) {
      let val = ctx.getValueFromRef(pout.ref) || '0'.repeat(pout.bits);
      return {
        value: val,
        ref: pout.ref,
        varName: `${a.var}:${property}`,
        bitWidth: pout.bits,
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
