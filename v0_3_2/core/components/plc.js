var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function plcResolveTargetWidth(target, ctx) {
  if (target.startsWith('.')) {
    const comp = ctx.components.get(target);
    if (!comp) throw Error(`PLC mapping target ${target} not found`);
    return ctx.getComponentBits(comp.type, comp.attributes) || 1;
  }
  const wire = ctx.wires.get(target);
  if (!wire) throw Error(`PLC mapping wire '${target}' not found`);
  const bits = ctx.getBitWidth(wire.type);
  if (!bits) throw Error(`PLC mapping '${target}' is not a wire`);
  return bits;
}

function plcReadTarget(target, width, ctx) {
  const normFn = typeof plcNormalizeBits === 'function' ? plcNormalizeBits : null;
  if (target.startsWith('.')) {
    const comp = ctx.components.get(target);
    if (!comp) throw Error(`PLC input target ${target} not found`);
    const handler = ctx.componentRegistry.get(comp.type);
    if (!handler || !handler.evalGetProperty) {
      throw Error(`PLC cannot read from ${target}`);
    }
    const result = handler.evalGetProperty(comp, 'get', { var: target, property: 'get' }, ctx);
    const val = result && result.value != null ? result.value : '0'.repeat(width);
    return normFn ? normFn(val, width) : val;
  }
  const val = ctx.getWireEffectiveValue(target);
  return normFn ? normFn(val || '0'.repeat(width), width) : (val || '0'.repeat(width));
}

function plcWriteTarget(target, value, width, ctx) {
  const normFn = typeof plcNormalizeBits === 'function' ? plcNormalizeBits : null;
  const v = normFn ? normFn(value, width) : value;
  if (target.startsWith('.')) {
    const comp = ctx.components.get(target);
    if (!comp) throw Error(`PLC output target ${target} not found`);
    const handler = ctx.componentRegistry.get(comp.type);
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || width;
    let out = v;
    if (out.length < bits) out = out.padStart(bits, '0');
    else if (out.length > bits) out = out.slice(-bits);
    if (comp.type === 'reg' && comp.deviceIds && comp.deviceIds[0] && typeof setReg === 'function') {
      setReg(comp.deviceIds[0], out);
      if (typeof ctx.updateComponentConnections === 'function') {
        ctx.updateComponentConnections(target);
      }
      if (typeof ctx._emitComputedComponentProbes === 'function') {
        ctx._emitComputedComponentProbes(target);
      }
      return;
    }
    if (comp.ref) {
      ctx.setValueAtRef(comp.ref, out);
    } else {
      const idx = ctx.storeValue(out);
      comp.ref = `&${idx}`;
    }
    if (handler && handler.updateDisplayValue) {
      handler.updateDisplayValue(comp, out, null);
    }
    if (typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(target);
    }
    return;
  }
  if (!ctx.wires.has(target)) throw Error(`PLC output wire '${target}' not found`);
  ctx.writeWireStable(target, v);
  if (typeof ctx.updateConnectedComponents === 'function') {
    ctx.updateConnectedComponents(target, v);
  }
}

function plcEnsureTimerList(ctx) {
  if (!ctx.plcTimers) ctx.plcTimers = [];
  return ctx.plcTimers;
}

function plcPushTimer(ctx, tid) {
  plcEnsureTimerList(ctx).push(tid);
}

function plcClearTimers(ctx) {
  if (!ctx.plcTimers) return;
  for (const tid of ctx.plcTimers) {
    clearTimeout(tid);
  }
  ctx.plcTimers = [];
}

const _plcRetainCaches = new Map();

function _plcRetainCacheFor(instanceId) {
  const id = instanceId != null ? instanceId : 1;
  if (!_plcRetainCaches.has(id)) _plcRetainCaches.set(id, new Map());
  return _plcRetainCaches.get(id);
}

function _plcRetainSlotKey(compName, slotRef) {
  return `${compName}::${slotRef}`;
}

function plcCloneFbState(state) {
  if (!state) return {};
  const out = {};
  for (const [k, v] of Object.entries(state)) {
    out[k] = Object.assign({}, v);
  }
  return out;
}

function plcCloneVarState(state) {
  if (!state) return {};
  const out = {};
  for (const [k, v] of Object.entries(state)) {
    out[k] = v == null ? '0' : String(v);
  }
  return out;
}

function plcIfaceKey(prog) {
  const inKeys = Object.keys(prog.inputs || {}).sort();
  const outKeys = Object.keys(prog.outputs || {}).sort();
  const inPart = inKeys.map((k) => `${k}:${prog.inputs[k].width}`).join(',');
  const outPart = outKeys.map((k) => `${k}:${prog.outputs[k].width}`).join(',');
  return `in:${inPart}|out:${outPart}`;
}

function plcRetainSaveFromContext(ctx) {
  if (!ctx || !ctx.components) return;
  const instanceId = ctx._instanceId != null ? ctx._instanceId : 1;
  const cache = _plcRetainCacheFor(instanceId);
  const fpFn = typeof plcFingerprintProgram === 'function' ? plcFingerprintProgram : null;
  for (const [compName, comp] of ctx.components) {
    if (!comp || comp.type !== 'plc') continue;
    const slots = comp.programSlots && comp.programSlots.length
      ? comp.programSlots
      : [{ ref: comp.programRef, timerState: comp.timerState, counterState: comp.counterState, varState: comp.varState }];
    if (comp.retain !== 1 && comp.retainVar !== 1) {
      for (const slot of slots) {
        if (slot && slot.ref) cache.delete(_plcRetainSlotKey(compName, slot.ref));
      }
      cache.delete(compName);
      continue;
    }
    for (const slot of slots) {
      if (!slot || !slot.ref) continue;
      const inst = ctx.inlineInstances ? ctx.inlineInstances.get(slot.ref) : null;
      const fingerprint = inst && fpFn ? fpFn(inst) : '';
      const key = _plcRetainSlotKey(compName, slot.ref);
      const entry = cache.get(key) || { fingerprint };
      entry.fingerprint = fingerprint;
      if (comp.retain === 1) {
        entry.timerState = plcCloneFbState(slot.timerState);
        entry.counterState = plcCloneFbState(slot.counterState);
      } else {
        delete entry.timerState;
        delete entry.counterState;
      }
      if (comp.retainVar === 1) {
        entry.varState = plcCloneVarState(slot.varState);
      } else {
        delete entry.varState;
      }
      cache.set(key, entry);
    }
  }
}

function plcRetainRestore(instanceId, compName, slotRef, fingerprint, opts) {
  const cache = _plcRetainCacheFor(instanceId);
  let entry = cache.get(_plcRetainSlotKey(compName, slotRef));
  if (!entry && slotRef) entry = cache.get(compName);
  if (!entry || entry.fingerprint !== fingerprint) return null;
  const wantFb = opts && opts.fb;
  const wantVar = opts && opts.var;
  const out = {};
  if (wantFb && entry.timerState) out.timerState = plcCloneFbState(entry.timerState);
  if (wantFb && entry.counterState) out.counterState = plcCloneFbState(entry.counterState);
  if (wantVar && entry.varState) out.varState = plcCloneVarState(entry.varState);
  if (!out.timerState && !out.counterState && !out.varState) return null;
  return out;
}

function plcRetainClearInstance(instanceId) {
  _plcRetainCaches.delete(instanceId != null ? instanceId : 1);
}

if (typeof globalThis !== 'undefined') {
  globalThis.plcRetainSaveFromContext = plcRetainSaveFromContext;
  globalThis.plcRetainClearInstance = plcRetainClearInstance;
}

var PlcComponent = class PlcComponent extends BuiltinComponent {
  static get type() { return 'plc'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return {
      bindingAttrs: ['program'],
      refListAttrs: ['program'],
      listAttrs: ['scanTime'],
      plcMappingBlockAttrs: ['inputs', 'outputs'],
    };
  }

  getWidthBits() { return 1; }

  getSupportedProperties() {
    return ['scanCount', 'busy', 'skipped', 'missed', 'overrunCount'];
  }

  getRedirectProperties() {
    return ['scanCount', 'busy', 'skipped', 'missed', 'overrunCount'];
  }

  getDef() {
    return {
      attrs: [
        { name: 'program', value: '.inlinePlc (.a .b …)' },
        { name: 'inputs', value: 'map' },
        { name: 'outputs', value: 'map' },
        { name: 'on', value: 'mode' },
        { name: 'scanTime', value: 'ms list (0 = event / super-scan; N values = per slot)' },
        { name: 'scanDuration', value: 'integer (ms simulated busy, default 1)' },
        { name: 'strict', value: '0/1 (overrun miss when 1)' },
        { name: 'retain', value: '0/1 (default 0, preserve FB state on re-RUN)' },
        { name: 'retainVar', value: '0/1 (default 0, preserve VAR state on re-RUN)' },
      ],
      initValue: '1bit',
      pins: [{ bits: '1', name: 'set' }],
      pouts: [
        { bits: '16', name: 'scanCount' },
        { bits: '1', name: 'busy' },
        { bits: '1', name: 'skipped' },
        { bits: '1', name: 'missed' },
        { bits: '16', name: 'overrunCount' },
      ],
      returns: '1bit',
    };
  }

  _parseScanTimes(attributes, slotCount, compName) {
    const raw = attributes.scanTime;
    if (raw === undefined || raw === null) {
      if (slotCount > 1) {
        throw Error(`plc ${compName}: multiple programs require explicit scanTime:`);
      }
      return { times: [0], broadcast: true };
    }
    const list = Array.isArray(raw) ? raw : [raw];
    if (!list.length) {
      if (slotCount > 1) {
        throw Error(`plc ${compName}: multiple programs require explicit scanTime:`);
      }
      return { times: [0], broadcast: true };
    }
    const times = list.map((v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 0) throw Error(`plc ${compName}: scanTime must be a non-negative integer (ms)`);
      return n;
    });
    if (times.length === 1) {
      return { times: Array(slotCount).fill(times[0]), broadcast: true };
    }
    if (times.length !== slotCount) {
      throw Error(`plc ${compName}: scanTime list length ${times.length} must be 1 (broadcast) or ${slotCount} (per program)`);
    }
    return { times, broadcast: false };
  }

  _detectScanMode(slotCount, times, broadcast) {
    if (slotCount <= 1) return 'single';
    if (broadcast && times[0] === 0) return 'super-scan';
    if (broadcast && times[0] > 0) return 'parallel-broadcast';
    return 'independent';
  }

  _parseScanDuration(attributes, scanTime) {
    if (attributes.scanDuration === undefined || attributes.scanDuration === null) {
      return scanTime > 0 ? 1 : 0;
    }
    const n = parseInt(attributes.scanDuration, 10);
    if (isNaN(n) || n < 0) throw Error('plc scanDuration must be a non-negative integer (ms)');
    return n;
  }

  _parseStrict(attributes) {
    if (attributes.strict === undefined || attributes.strict === null) return false;
    const v = attributes.strict;
    if (v === 1 || v === '1' || v === true) return true;
    if (v === 0 || v === '0' || v === false) return false;
    throw Error('plc strict must be 0 or 1');
  }

  _parseRetain(attributes, compName) {
    if (attributes.retain === undefined || attributes.retain === null) return 0;
    const v = attributes.retain;
    if (v === 0 || v === '0' || v === false) return 0;
    if (v === 1 || v === '1' || v === true) return 1;
    throw Error(`plc ${compName}: invalid retain value, expected 0 or 1`);
  }

  _parseRetainVar(attributes, compName) {
    if (attributes.retainVar === undefined || attributes.retainVar === null) return 0;
    const v = attributes.retainVar;
    if (v === 0 || v === '0' || v === false) return 0;
    if (v === 1 || v === '1' || v === true) return 1;
    throw Error(`plc ${compName}: invalid retainVar value, expected 0 or 1`);
  }

  _timingMode(comp) {
    return this._maxScanTime(comp) > 0 ? 'auto' : 'external';
  }

  _maxScanTime(comp) {
    if (comp.scanTimes && comp.scanTimes.length) {
      return Math.max.apply(null, comp.scanTimes);
    }
    return comp.scanTime || 0;
  }

  _usesBusy(comp) {
    return this._maxScanTime(comp) > 0;
  }

  _resolvePrograms(attributes, ctx, compName) {
    const refs = attributes.programMembers;
    if (!refs || !refs.length) {
      throw Error('plc requires program: .inline [plc] reference');
    }
    const seen = new Set();
    const programs = [];
    for (const ref of refs) {
      if (seen.has(ref)) {
        throw Error(`plc ${compName}: duplicate program reference ${ref}`);
      }
      seen.add(ref);
      const inst = ctx.inlineInstances.get(ref);
      if (!inst || inst.kind !== 'plc') {
        throw Error(`plc program ${ref} must be inline [plc]`);
      }
      programs.push({ ref, inst });
    }
    if (programs.length > 1) {
      const base = plcIfaceKey(programs[0].inst);
      for (let i = 1; i < programs.length; i++) {
        if (plcIfaceKey(programs[i].inst) !== base) {
          throw Error(`plc ${compName}: all programs must declare identical inputs/outputs (widths included); ${programs[0].ref} vs ${programs[i].ref}`);
        }
      }
    }
    return programs;
  }

  _validateMappings(prog, inputMap, outputMap, compName) {
    const inputs = prog.inputs || {};
    const outputs = prog.outputs || {};
    for (const name of Object.keys(inputs)) {
      if (!inputMap || inputMap[name] == null) {
        throw Error(`plc ${compName}: input ${name} declared in program but not mapped`);
      }
    }
    for (const name of Object.keys(outputs)) {
      if (!outputMap || outputMap[name] == null) {
        throw Error(`plc ${compName}: output ${name} declared in program but not mapped`);
      }
    }
    if (inputMap) {
      for (const name of Object.keys(inputMap)) {
        if (!inputs[name]) {
          throw Error(`plc ${compName}: mapping ${name} is not declared in program inputs`);
        }
      }
    }
    if (outputMap) {
      for (const name of Object.keys(outputMap)) {
        if (!outputs[name]) {
          throw Error(`plc ${compName}: mapping ${name} is not declared in program outputs`);
        }
      }
    }
  }

  _validateWidths(prog, inputMap, outputMap, ctx, compName) {
    for (const [sym, target] of Object.entries(inputMap || {})) {
      const symW = prog.inputs[sym].width;
      const tgtW = plcResolveTargetWidth(target, ctx);
      if (symW !== tgtW) {
        throw Error(`plc ${compName}: ${sym} width ${symW} does not match ${target} (${tgtW} bits)`);
      }
    }
    for (const [sym, target] of Object.entries(outputMap || {})) {
      const symW = prog.outputs[sym].width;
      const tgtW = plcResolveTargetWidth(target, ctx);
      if (symW !== tgtW) {
        throw Error(`plc ${compName}: ${sym} width ${symW} does not match ${target} (${tgtW} bits)`);
      }
    }
  }

  _emitPlcProbes(compName, ctx) {
    if (typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(compName);
    }
  }

  _setBusy(comp, compName, ctx, value) {
    const next = !!value;
    if (!!comp.busy === next) return;
    comp.busy = next;
    this._emitPlcProbes(compName, ctx);
  }

  _syncLegacySlotFields(comp) {
    const slots = comp.programSlots;
    if (!slots || !slots.length) return;
    comp.programRef = slots[0].ref;
    if (slots.length === 1) {
      comp.timerState = slots[0].timerState;
      comp.counterState = slots[0].counterState;
      comp.varState = slots[0].varState;
    }
  }

  _readExternalInputs(comp, inst, ctx) {
    const externalInputs = {};
    for (const [sym, target] of Object.entries(comp.inputMap || {})) {
      const w = inst.inputs[sym].width;
      externalInputs[sym] = plcReadTarget(target, w, ctx);
    }
    return externalInputs;
  }

  _writeOutputs(comp, inst, ctx) {
    const outputState = comp.outputState || {};
    for (const [sym, target] of Object.entries(comp.outputMap || {})) {
      const w = inst.outputs[sym].width;
      plcWriteTarget(target, outputState[sym], w, ctx);
    }
  }

  _execSlot(comp, slot, externalInputs, ctx) {
    const execFn = typeof executePlcScan === 'function' ? executePlcScan : null;
    if (!execFn) throw Error('PLC assembler executePlcScan unavailable');
    const inst = ctx.inlineInstances.get(slot.ref);
    if (!inst || inst.kind !== 'plc') {
      throw Error(`plc program ${slot.ref} not found`);
    }
    if (!comp.outputState) comp.outputState = {};
    if (!slot.timerState) slot.timerState = {};
    if (!slot.counterState) slot.counterState = {};
    if (!slot.varState) slot.varState = {};
    // Shared process-image outputState so programs in a super-scan can read each other's outputs
    execFn(inst, externalInputs, comp.outputState, slot.timerState, slot.counterState, slot.varState);
    return inst;
  }

  _plcScan(comp, compName, ctx, slotIndex) {
    const slots = comp.programSlots;
    if (!slots || !slots.length) throw Error(`plc ${compName}: no program slots`);

    const mode = comp.scanMode || 'single';

    // Timer tick for multi-rate: run only that slot
    if (slotIndex != null && (mode === 'parallel-broadcast' || mode === 'independent')) {
      this._plcScanOneSlot(comp, compName, ctx, slotIndex, true);
      return;
    }

    // Manual set, super-scan, or single program: run all slots in order
    const firstInst = ctx.inlineInstances.get(slots[0].ref);
    const externalInputs = this._readExternalInputs(comp, firstInst, ctx);
    let lastInst = firstInst;
    for (let i = 0; i < slots.length; i++) {
      lastInst = this._execSlot(comp, slots[i], externalInputs, ctx);
      slots[i].scanCount = (slots[i].scanCount || 0) + 1;
    }
    this._writeOutputs(comp, lastInst, ctx);
    if (mode === 'super-scan' || mode === 'single') {
      comp.scanCount = (comp.scanCount || 0) + 1;
    } else {
      comp.scanCount = slots.reduce((s, sl) => s + (sl.scanCount || 0), 0);
    }
    if (comp.deviceIds && comp.deviceIds[0] && typeof plcSetScanCount === 'function') {
      plcSetScanCount(comp.deviceIds[0], comp.scanCount);
    }
    comp.skipped = false;
    comp.missed = false;
    this._syncLegacySlotFields(comp);
    this._emitPlcProbes(compName, ctx);
  }

  _plcScanOneSlot(comp, compName, ctx, slotIndex, writeOutputs) {
    const slots = comp.programSlots;
    const slot = slots[slotIndex];
    if (!slot) throw Error(`plc ${compName}: invalid program slot ${slotIndex}`);
    const inst = ctx.inlineInstances.get(slot.ref);
    const externalInputs = this._readExternalInputs(comp, inst, ctx);
    this._execSlot(comp, slot, externalInputs, ctx);
    if (writeOutputs) {
      this._writeOutputs(comp, inst, ctx);
    }
    slot.scanCount = (slot.scanCount || 0) + 1;
    comp.scanCount = slots.reduce((s, sl) => s + (sl.scanCount || 0), 0);
    if (comp.deviceIds && comp.deviceIds[0] && typeof plcSetScanCount === 'function') {
      plcSetScanCount(comp.deviceIds[0], comp.scanCount);
    }
    comp.skipped = false;
    comp.missed = false;
    this._syncLegacySlotFields(comp);
    this._emitPlcProbes(compName, ctx);
  }

  _onBusyCleared(comp, compName, ctx) {
    if (comp._pendingTimerScan) {
      const pending = comp._pendingTimerScan;
      comp._pendingTimerScan = false;
      if (!comp.busy) {
        if (typeof pending === 'number') {
          this._runScanWithBusy(comp, compName, ctx, 'timer', pending);
        } else {
          this._runScanWithBusy(comp, compName, ctx, 'timer', null);
        }
      }
    }
  }

  _finishBusyWindow(comp, compName, ctx) {
    this._setBusy(comp, compName, ctx, false);
    this._onBusyCleared(comp, compName, ctx);
    if (comp._plcVirtual) {
      this._processPlcSchedule(comp, compName, ctx);
    }
  }

  _runScanWithBusy(comp, compName, ctx, source, slotIndex) {
    const useBusy = this._usesBusy(comp);
    if (useBusy) {
      this._setBusy(comp, compName, ctx, true);
    }
    this._plcScan(comp, compName, ctx, slotIndex);
    const duration = useBusy ? (comp.scanDuration || 0) : 0;
    if (useBusy && duration > 0 && comp._plcVirtual) {
      comp._plcBusyUntil = (comp._plcClock || 0) + duration;
    } else if (useBusy && duration > 0 && typeof setTimeout === 'function') {
      const tid = setTimeout(() => {
        this._finishBusyWindow(comp, compName, ctx);
      }, duration);
      plcPushTimer(ctx, tid);
    } else if (useBusy) {
      this._finishBusyWindow(comp, compName, ctx);
    }
  }

  _requestScan(comp, compName, ctx, source, slotIndex) {
    if (comp.busy) {
      if (source === 'manual') {
        comp.skipped = true;
        this._emitPlcProbes(compName, ctx);
        return false;
      }
      if (comp.strict) {
        comp.overrunCount = (comp.overrunCount || 0) + 1;
        comp.missed = true;
        this._emitPlcProbes(compName, ctx);
        return false;
      }
      const mode = comp.scanMode || 'single';
      // Multi-rate: do not queue pending — leave nextAt and retry after busy clears
      if (mode === 'parallel-broadcast' || mode === 'independent') {
        return false;
      }
      comp._pendingTimerScan = slotIndex != null ? slotIndex : true;
      return false;
    }
    this._runScanWithBusy(comp, compName, ctx, source, slotIndex);
    return true;
  }

  _processPlcSchedule(comp, compName, ctx) {
    if (comp._plcBusyUntil != null && (comp._plcClock || 0) >= comp._plcBusyUntil) {
      comp._plcBusyUntil = null;
      this._finishBusyWindow(comp, compName, ctx);
    }
    if (!comp.plcAutoScanActive) return;

    const mode = comp.scanMode || 'single';
    if (mode === 'single' || mode === 'super-scan') {
      if (comp._plcNextScanAt == null) return;
      while ((comp._plcClock || 0) >= comp._plcNextScanAt) {
        const ran = this._requestScan(comp, compName, ctx, 'timer', null);
        if (!ran && !comp.strict) break;
        comp._plcNextScanAt += (comp.scanTime || 0);
      }
      return;
    }

    const nextAt = comp._plcSlotNextScanAt;
    if (!nextAt || !nextAt.length) return;
    for (let i = 0; i < nextAt.length; i++) {
      const period = (comp.scanTimes && comp.scanTimes[i]) || 0;
      if (period <= 0) continue;
      while ((comp._plcClock || 0) >= nextAt[i]) {
        const ran = this._requestScan(comp, compName, ctx, 'timer', i);
        if (!ran && !comp.strict) break;
        nextAt[i] += period;
      }
    }
  }

  advancePlcTiming(ctx, deltaMs) {
    const steps = deltaMs > 0 ? Math.floor(deltaMs) : 0;
    for (let s = 0; s < steps; s++) {
      for (const [, comp] of ctx.components) {
        if (!comp || comp.type !== 'plc' || !comp._plcVirtual) continue;
        comp._plcClock = (comp._plcClock || 0) + 1;
      }
      for (const [name, comp] of ctx.components) {
        if (!comp || comp.type !== 'plc' || !comp._plcVirtual) continue;
        this._processPlcSchedule(comp, name, ctx);
      }
    }
  }

  _autoScanTick(comp, compName, ctx) {
    if (!comp.plcAutoScanActive || !ctx.components.has(compName)) return;
    this._requestScan(comp, compName, ctx, 'timer', null);
    const period = comp.scanTime || 0;
    if (period <= 0) return;
    const tid = setTimeout(() => this._autoScanTick(comp, compName, ctx), period);
    plcPushTimer(ctx, tid);
  }

  _autoScanTickSlot(comp, compName, ctx, slotIndex) {
    if (!comp.plcAutoScanActive || !ctx.components.has(compName)) return;
    this._requestScan(comp, compName, ctx, 'timer', slotIndex);
    const period = (comp.scanTimes && comp.scanTimes[slotIndex]) || 0;
    if (period <= 0) return;
    const tid = setTimeout(() => this._autoScanTickSlot(comp, compName, ctx, slotIndex), period);
    plcPushTimer(ctx, tid);
  }

  _startAutoScanWall(comp, compName, ctx) {
    const mode = comp.scanMode || 'single';
    if (mode === 'parallel-broadcast' || mode === 'independent') {
      const times = comp.scanTimes || [];
      let any = false;
      for (let i = 0; i < times.length; i++) {
        if (times[i] > 0) {
          any = true;
          break;
        }
      }
      if (!any) return;
      comp.plcAutoScanActive = true;
      if (typeof setTimeout !== 'function') return;
      for (let i = 0; i < times.length; i++) {
        if (times[i] <= 0) continue;
        const slotIndex = i;
        const tid = setTimeout(() => this._autoScanTickSlot(comp, compName, ctx, slotIndex), times[i]);
        plcPushTimer(ctx, tid);
      }
      return;
    }
    if (!comp.scanTime || comp.scanTime <= 0) return;
    comp.plcAutoScanActive = true;
    if (typeof setTimeout !== 'function') return;
    const tid = setTimeout(() => this._autoScanTick(comp, compName, ctx), comp.scanTime);
    plcPushTimer(ctx, tid);
  }

  _startAutoScanVirtual(comp) {
    const mode = comp.scanMode || 'single';
    if (mode === 'parallel-broadcast' || mode === 'independent') {
      const times = comp.scanTimes || [];
      comp._plcSlotNextScanAt = times.map((t) => (t > 0 ? t : null));
      const any = times.some((t) => t > 0);
      if (!any) return;
      comp.plcAutoScanActive = true;
      comp._plcClock = 0;
      return;
    }
    if (!comp.scanTime || comp.scanTime <= 0) return;
    comp.plcAutoScanActive = true;
    comp._plcClock = 0;
    comp._plcNextScanAt = comp.scanTime;
  }

  _initPlcTiming(comp, ctx) {
    const virtual = !!(ctx && ctx._plcVirtualTime);
    comp._plcVirtual = virtual;
    comp._plcClock = 0;
    comp._plcBusyUntil = null;
    comp._plcNextScanAt = null;
    comp._plcSlotNextScanAt = null;
    return virtual;
  }

  _emptyVarState(inst) {
    const varState = {};
    for (const name of Object.keys(inst.vars || {})) {
      const w = inst.vars[name].width || 1;
      varState[name] = '0'.repeat(w);
    }
    return varState;
  }

  _emptyOutputState(inst) {
    const outputState = {};
    for (const sym of Object.keys(inst.outputs || {})) {
      outputState[sym] = '0';
    }
    return outputState;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const programs = this._resolvePrograms(attributes, ctx, name);
    const inputMap = attributes.inputs || {};
    const outputMap = attributes.outputs || {};
    this._validateMappings(programs[0].inst, inputMap, outputMap, name);
    this._validateWidths(programs[0].inst, inputMap, outputMap, ctx, name);

    const { times, broadcast } = this._parseScanTimes(attributes, programs.length, name);
    const scanMode = this._detectScanMode(programs.length, times, broadcast);
    const scanTime = times[0] || 0;
    const scanDuration = this._parseScanDuration(attributes, this._maxFromTimes(times));
    const strict = this._parseStrict(attributes);
    const retain = this._parseRetain(attributes, name);
    const retainVar = this._parseRetainVar(attributes, name);

    const instanceId = ctx && ctx._instanceId != null ? ctx._instanceId : 1;
    const fpFn = typeof plcFingerprintProgram === 'function' ? plcFingerprintProgram : null;

    const sharedOutputState = this._emptyOutputState(programs[0].inst);

    const programSlots = programs.map((p, idx) => {
      const timerState = {};
      const counterState = {};
      const varState = this._emptyVarState(p.inst);
      const fingerprint = fpFn ? fpFn(p.inst) : '';
      if (retain === 1) {
        const restored = plcRetainRestore(instanceId, name, p.ref, fingerprint, { fb: true });
        if (restored) {
          Object.assign(timerState, restored.timerState || {});
          Object.assign(counterState, restored.counterState || {});
        }
      }
      if (retainVar === 1) {
        const restored = plcRetainRestore(instanceId, name, p.ref, fingerprint, { var: true });
        if (restored && restored.varState) {
          for (const [k, v] of Object.entries(restored.varState)) {
            if (varState[k] != null) varState[k] = v;
          }
        }
      }
      return {
        ref: p.ref,
        scanTime: times[idx],
        timerState,
        counterState,
        varState,
        scanCount: 0,
      };
    });

    if (retain !== 1 && retainVar !== 1) {
      for (const slot of programSlots) {
        _plcRetainCacheFor(instanceId).delete(_plcRetainSlotKey(name, slot.ref));
      }
      _plcRetainCacheFor(instanceId).delete(name);
    }

    const first = programSlots[0];
    if (typeof addPlc === 'function') {
      addPlc(baseId, {
        programRef: first.ref,
        programRefs: programSlots.map((s) => s.ref),
        inputMap: { ...inputMap },
        outputMap: { ...outputMap },
        outputState: sharedOutputState,
        timerState: first.timerState,
        counterState: first.counterState,
        varState: first.varState,
        scanCount: 0,
        scanTime,
        scanTimes: times.slice(),
        scanMode,
        scanDuration,
        strict,
        retain,
        retainVar,
      });
    }

    const compInfo = {
      deviceIds: [baseId],
      ref: null,
      programRef: first.ref,
      programSlots,
      scanMode,
      scanTimes: times.slice(),
      inputMap,
      outputMap,
      outputState: sharedOutputState,
      timerState: first.timerState,
      counterState: first.counterState,
      varState: first.varState,
      scanCount: 0,
      scanTime,
      scanDuration,
      strict,
      retain,
      retainVar,
      busy: false,
      skipped: false,
      missed: false,
      overrunCount: 0,
      plcAutoScanActive: false,
      _pendingTimerScan: false,
    };

    const virtual = this._initPlcTiming(compInfo, ctx);
    const needsAuto = times.some((t) => t > 0);
    if (needsAuto) {
      if (virtual) {
        this._startAutoScanVirtual(compInfo);
      } else if (typeof setTimeout === 'function') {
        const self = this;
        const startTid = setTimeout(() => {
          const comp = ctx.components.get(name);
          if (comp) self._startAutoScanWall(comp, name, ctx);
        }, 0);
        plcPushTimer(ctx, startTid);
      }
    }

    return compInfo;
  }

  _maxFromTimes(times) {
    if (!times || !times.length) return 0;
    return Math.max.apply(null, times);
  }

  finalizeCompInfo(compInfo, attributes) {
    if (attributes.inputs) compInfo.inputMap = attributes.inputs;
    if (attributes.outputs) compInfo.outputMap = attributes.outputs;
    const refs = attributes.programMembers;
    if (refs && refs.length) {
      compInfo.programRef = refs[0];
      if (!compInfo.programSlots || !compInfo.programSlots.length) {
        compInfo.programSlots = refs.map((ref) => ({
          ref,
          scanTime: 0,
          timerState: {},
          counterState: {},
          varState: {},
          outputState: {},
          scanCount: 0,
        }));
      }
    }
    if (!compInfo.outputState) compInfo.outputState = {};
    if (compInfo.scanCount == null) compInfo.scanCount = 0;
    if (compInfo.scanTimes == null) {
      try {
        const slotCount = (compInfo.programSlots && compInfo.programSlots.length) || 1;
        const parsed = this._parseScanTimes(attributes, slotCount, '.plc');
        compInfo.scanTimes = parsed.times;
        compInfo.scanTime = parsed.times[0] || 0;
        if (compInfo.scanMode == null) {
          compInfo.scanMode = this._detectScanMode(slotCount, parsed.times, parsed.broadcast);
        }
      } catch (_) {
        if (compInfo.scanTime == null) compInfo.scanTime = 0;
      }
    }
    if (compInfo.scanTime == null) compInfo.scanTime = 0;
    if (compInfo.scanDuration == null) {
      compInfo.scanDuration = this._parseScanDuration(attributes, this._maxScanTime(compInfo));
    }
    if (compInfo.strict == null) compInfo.strict = this._parseStrict(attributes);
    if (compInfo.retain == null) compInfo.retain = this._parseRetain(attributes, compInfo.name || '.plc');
    if (compInfo.retainVar == null) compInfo.retainVar = this._parseRetainVar(attributes, compInfo.name || '.plc');
    if (compInfo.busy == null) compInfo.busy = false;
    if (compInfo.skipped == null) compInfo.skipped = false;
    if (compInfo.missed == null) compInfo.missed = false;
    if (compInfo.overrunCount == null) compInfo.overrunCount = 0;
    if (compInfo.scanMode == null) compInfo.scanMode = 'single';
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    lines.push(`${alias} (comp [plc])`);
    lines.push('');
    const slots = comp.programSlots && comp.programSlots.length
      ? comp.programSlots
      : (comp.programRef ? [{ ref: comp.programRef, scanTime: comp.scanTime, scanCount: comp.scanCount }] : []);
    if (slots.length) {
      lines.push(`program: ${slots.map((s) => s.ref).join(' ')}`);
    }
    if (comp.scanMode && comp.scanMode !== 'single') {
      lines.push(`scanMode: ${comp.scanMode}`);
    }
    lines.push(`retain: ${comp.retain != null ? comp.retain : 0}`);
    lines.push(`retainVar: ${comp.retainVar != null ? comp.retainVar : 0}`);
    if (slots.length > 1 && (comp.scanMode === 'independent' || comp.scanMode === 'parallel-broadcast')) {
      lines.push(`scanTime: ${(comp.scanTimes || slots.map((s) => s.scanTime)).join(' ')} ms (per program)`);
    } else {
      const scanTime = comp.scanTime != null ? comp.scanTime : 0;
      lines.push(`scanTime: ${scanTime} ms (${scanTime > 0 ? 'auto-scan' : 'event-driven (external set/osc)'})`);
    }
    const maxT = Math.max.apply(null, (comp.scanTimes || [comp.scanTime || 0]));
    if (maxT > 0) {
      lines.push(`scanDuration: ${comp.scanDuration != null ? comp.scanDuration : 1} ms`);
      lines.push(`strict: ${comp.strict ? 1 : 0}`);
    }
    lines.push('');
    lines.push('inputs:');
    const inMap = comp.inputMap || {};
    const inNames = Object.keys(inMap);
    if (!inNames.length) lines.push('  (none)');
    else for (const n of inNames) lines.push(`  ${n} = ${inMap[n]}`);
    lines.push('');
    lines.push('outputs:');
    const outMap = comp.outputMap || {};
    const outNames = Object.keys(outMap);
    if (!outNames.length) lines.push('  (none)');
    else for (const n of outNames) lines.push(`  ${n} = ${outMap[n]}`);
    lines.push('');
    if (comp.scanMode === 'super-scan') {
      lines.push('scan: .plc:{ set = 1 } runs all programs in list order (one super-scan)');
    } else if (slots.length > 1) {
      lines.push('scan: .plc:{ set = 1 } runs all programs once; auto-scan timers run each program on its period');
    } else {
      lines.push('scan: .plc:{ set = 1 } runs one program pass (ignored while busy)');
    }
    lines.push(`scanCount: ${comp.scanCount != null ? comp.scanCount : 0}`);
    if (slots.length > 1) {
      for (const s of slots) {
        lines.push(`  ${s.ref} scanCount: ${s.scanCount != null ? s.scanCount : 0}`);
      }
    }
    lines.push(`busy: ${comp.busy ? 1 : 0}`);
    if (maxT > 0) {
      lines.push(`skipped: ${comp.skipped ? 1 : 0}`);
      lines.push(`missed: ${comp.missed ? 1 : 0}`);
      lines.push(`overrunCount: ${comp.overrunCount != null ? comp.overrunCount : 0}`);
    }
    const outState = comp.outputState;
    if (outState && Object.keys(outState).length) {
      lines.push('');
      lines.push('outputState (last scan):');
      for (const [sym, val] of Object.entries(outState)) {
        lines.push(`  ${sym} = ${val}`);
      }
    }
    return lines;
  }

  _poutBits16(value) {
    const n = value != null ? value : 0;
    return n.toString(2).padStart(16, '0');
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'busy') {
      return { value: comp.busy ? '1' : '0', ref: null, varName: `${a.var}:busy`, bitWidth: 1 };
    }
    if (property === 'skipped') {
      return { value: comp.skipped ? '1' : '0', ref: null, varName: `${a.var}:skipped`, bitWidth: 1 };
    }
    if (property === 'missed') {
      return { value: comp.missed ? '1' : '0', ref: null, varName: `${a.var}:missed`, bitWidth: 1 };
    }
    if (property === 'overrunCount') {
      const val = this._poutBits16(comp.overrunCount);
      return { value: val, ref: null, varName: `${a.var}:overrunCount`, bitWidth: 16 };
    }
    if (property !== 'scanCount') return null;
    const count = comp.scanCount != null ? comp.scanCount : 0;
    const val = this._poutBits16(count);
    return { value: val, ref: null, varName: `${a.var}:scanCount`, bitWidth: 16 };
  }

  _isActive(val) {
    return val === '1' || (val && val[val.length - 1] === '1');
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set !== undefined) {
      const setVal = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (this._isActive(setVal)) {
        this._requestScan(comp, compName, ctx, 'manual', null);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  PlcComponent.plcRetainSaveFromContext = plcRetainSaveFromContext;
  PlcComponent.plcRetainClearInstance = plcRetainClearInstance;
  module.exports = PlcComponent;
}
