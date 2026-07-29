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

var PlcComponent = class PlcComponent extends BuiltinComponent {
  static get type() { return 'plc'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return {
      bindingAttrs: ['program'],
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
        { name: 'program', value: '.inlinePlc' },
        { name: 'inputs', value: 'map' },
        { name: 'outputs', value: 'map' },
        { name: 'on', value: 'mode' },
        { name: 'scanTime', value: 'integer (ms, 0 = event-driven)' },
        { name: 'scanDuration', value: 'integer (ms simulated busy, default 1)' },
        { name: 'strict', value: '0/1 (overrun miss when 1)' },
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

  _parseScanTime(attributes) {
    if (attributes.scanTime === undefined || attributes.scanTime === null) return 0;
    const n = parseInt(attributes.scanTime, 10);
    if (isNaN(n) || n < 0) throw Error('plc scanTime must be a non-negative integer (ms)');
    return n;
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

  _timingMode(comp) {
    return (comp.scanTime || 0) > 0 ? 'auto' : 'external';
  }

  _usesBusy(comp) {
    return (comp.scanTime || 0) > 0;
  }

  _resolveProgram(attributes, ctx) {
    const refs = attributes.programMembers;
    if (!refs || !refs.length) {
      throw Error('plc requires program: .inline [plc] reference');
    }
    if (refs.length > 1) throw Error('plc program: accepts one inline [plc] reference');
    const ref = refs[0];
    const inst = ctx.inlineInstances.get(ref);
    if (!inst || inst.kind !== 'plc') {
      throw Error(`plc program ${ref} must be inline [plc]`);
    }
    return { ref, inst };
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

  _onBusyCleared(comp, compName, ctx) {
    if (comp._pendingTimerScan) {
      comp._pendingTimerScan = false;
      if (!comp.busy) {
        this._runScanWithBusy(comp, compName, ctx, 'timer');
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

  _plcScan(comp, compName, ctx) {
    const execFn = typeof executePlcScan === 'function' ? executePlcScan : null;
    if (!execFn) throw Error('PLC assembler executePlcScan unavailable');
    const progRef = comp.programRef;
    const inst = ctx.inlineInstances.get(progRef);
    if (!inst || inst.kind !== 'plc') {
      throw Error(`plc ${compName}: program ${progRef} not found`);
    }
    const externalInputs = {};
    for (const [sym, target] of Object.entries(comp.inputMap || {})) {
      const w = inst.inputs[sym].width;
      externalInputs[sym] = plcReadTarget(target, w, ctx);
    }
    if (!comp.outputState) comp.outputState = {};
    if (!comp.timerState) comp.timerState = {};
    if (!comp.counterState) comp.counterState = {};
    execFn(inst, externalInputs, comp.outputState, comp.timerState, comp.counterState);
    for (const [sym, target] of Object.entries(comp.outputMap || {})) {
      const w = inst.outputs[sym].width;
      plcWriteTarget(target, comp.outputState[sym], w, ctx);
    }
    comp.scanCount = (comp.scanCount || 0) + 1;
    if (comp.deviceIds && comp.deviceIds[0] && typeof plcSetScanCount === 'function') {
      plcSetScanCount(comp.deviceIds[0], comp.scanCount);
    }
    comp.skipped = false;
    comp.missed = false;
    this._emitPlcProbes(compName, ctx);
  }

  _runScanWithBusy(comp, compName, ctx, source) {
    const useBusy = this._usesBusy(comp);
    if (useBusy) {
      this._setBusy(comp, compName, ctx, true);
    }
    this._plcScan(comp, compName, ctx);
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

  _requestScan(comp, compName, ctx, source) {
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
      comp._pendingTimerScan = true;
      return false;
    }
    this._runScanWithBusy(comp, compName, ctx, source);
    return true;
  }

  _processPlcSchedule(comp, compName, ctx) {
    if (comp._plcBusyUntil != null && (comp._plcClock || 0) >= comp._plcBusyUntil) {
      comp._plcBusyUntil = null;
      this._finishBusyWindow(comp, compName, ctx);
    }
    if (!comp.plcAutoScanActive || comp._plcNextScanAt == null) return;
    while ((comp._plcClock || 0) >= comp._plcNextScanAt) {
      const ran = this._requestScan(comp, compName, ctx, 'timer');
      if (!ran && !comp.strict) break;
      comp._plcNextScanAt += comp.scanTime;
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
    this._requestScan(comp, compName, ctx, 'timer');
    const tid = setTimeout(() => this._autoScanTick(comp, compName, ctx), comp.scanTime);
    plcPushTimer(ctx, tid);
  }

  _startAutoScanWall(comp, compName, ctx) {
    if (!comp.scanTime || comp.scanTime <= 0) return;
    comp.plcAutoScanActive = true;
    if (typeof setTimeout !== 'function') return;
    const tid = setTimeout(() => this._autoScanTick(comp, compName, ctx), comp.scanTime);
    plcPushTimer(ctx, tid);
  }

  _startAutoScanVirtual(comp) {
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
    return virtual;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const { ref, inst } = this._resolveProgram(attributes, ctx);
    const inputMap = attributes.inputs || {};
    const outputMap = attributes.outputs || {};
    this._validateMappings(inst, inputMap, outputMap, name);
    this._validateWidths(inst, inputMap, outputMap, ctx, name);

    const scanTime = this._parseScanTime(attributes);
    const scanDuration = this._parseScanDuration(attributes, scanTime);
    const strict = this._parseStrict(attributes);

    const outputState = {};
    for (const sym of Object.keys(inst.outputs || {})) {
      outputState[sym] = '0';
    }
    const timerState = {};
    const counterState = {};

    if (typeof addPlc === 'function') {
      addPlc(baseId, {
        programRef: ref,
        inputMap: { ...inputMap },
        outputMap: { ...outputMap },
        outputState,
        timerState,
        counterState,
        scanCount: 0,
        scanTime,
        scanDuration,
        strict,
      });
    }

    const compInfo = {
      deviceIds: [baseId],
      ref: null,
      programRef: ref,
      inputMap,
      outputMap,
      outputState,
      timerState,
      counterState,
      scanCount: 0,
      scanTime,
      scanDuration,
      strict,
      busy: false,
      skipped: false,
      missed: false,
      overrunCount: 0,
      plcAutoScanActive: false,
      _pendingTimerScan: false,
    };

    const virtual = this._initPlcTiming(compInfo, ctx);
    if (scanTime > 0) {
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

  finalizeCompInfo(compInfo, attributes) {
    if (attributes.inputs) compInfo.inputMap = attributes.inputs;
    if (attributes.outputs) compInfo.outputMap = attributes.outputs;
    const refs = attributes.programMembers;
    if (refs && refs.length) compInfo.programRef = refs[0];
    if (!compInfo.outputState) compInfo.outputState = {};
    if (compInfo.scanCount == null) compInfo.scanCount = 0;
    if (compInfo.scanTime == null) compInfo.scanTime = this._parseScanTime(attributes);
    if (compInfo.scanDuration == null) compInfo.scanDuration = this._parseScanDuration(attributes, compInfo.scanTime || 0);
    if (compInfo.strict == null) compInfo.strict = this._parseStrict(attributes);
    if (compInfo.busy == null) compInfo.busy = false;
    if (compInfo.skipped == null) compInfo.skipped = false;
    if (compInfo.missed == null) compInfo.missed = false;
    if (compInfo.overrunCount == null) compInfo.overrunCount = 0;
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    lines.push(`${alias} (comp [plc])`);
    lines.push('');
    if (comp.programRef) lines.push(`program: ${comp.programRef}`);
    const scanTime = comp.scanTime != null ? comp.scanTime : 0;
    lines.push(`scanTime: ${scanTime} ms (${scanTime > 0 ? 'auto-scan' : 'event-driven (external set/osc)'})`);
    if (scanTime > 0) {
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
    lines.push('scan: .plc:{ set = 1 } runs one program pass (ignored while busy)');
    lines.push(`scanCount: ${comp.scanCount != null ? comp.scanCount : 0}`);
    lines.push(`busy: ${comp.busy ? 1 : 0}`);
    if (scanTime > 0) {
      lines.push(`skipped: ${comp.skipped ? 1 : 0}`);
      lines.push(`missed: ${comp.missed ? 1 : 0}`);
      lines.push(`overrunCount: ${comp.overrunCount != null ? comp.overrunCount : 0}`);
    }
    if (comp.outputState && Object.keys(comp.outputState).length) {
      lines.push('');
      lines.push('outputState (last scan):');
      for (const [sym, val] of Object.entries(comp.outputState)) {
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
        this._requestScan(comp, compName, ctx, 'manual');
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = PlcComponent; }
