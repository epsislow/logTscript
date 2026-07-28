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
    return ['scanCount', 'busy'];
  }

  getRedirectProperties() {
    return ['scanCount', 'busy'];
  }

  getDef() {
    return {
      attrs: [
        { name: 'program', value: '.inlinePlc' },
        { name: 'inputs', value: 'map' },
        { name: 'outputs', value: 'map' },
        { name: 'on', value: 'mode' },
      ],
      initValue: '1bit',
      pins: [{ bits: '1', name: 'set' }],
      pouts: [
        { bits: '16', name: 'scanCount' },
        { bits: '1', name: 'busy' },
      ],
      returns: '1bit',
    };
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

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const { ref, inst } = this._resolveProgram(attributes, ctx);
    const inputMap = attributes.inputs || {};
    const outputMap = attributes.outputs || {};
    this._validateMappings(inst, inputMap, outputMap, name);
    this._validateWidths(inst, inputMap, outputMap, ctx, name);

    const outputState = {};
    for (const sym of Object.keys(inst.outputs || {})) {
      outputState[sym] = '0';
    }

    if (typeof addPlc === 'function') {
      addPlc(baseId, {
        programRef: ref,
        inputMap: { ...inputMap },
        outputMap: { ...outputMap },
        outputState,
        scanCount: 0,
      });
    }

    return {
      deviceIds: [baseId],
      ref: null,
      programRef: ref,
      inputMap,
      outputMap,
      outputState,
      scanCount: 0,
    };
  }

  finalizeCompInfo(compInfo, attributes) {
    if (attributes.inputs) compInfo.inputMap = attributes.inputs;
    if (attributes.outputs) compInfo.outputMap = attributes.outputs;
    const refs = attributes.programMembers;
    if (refs && refs.length) compInfo.programRef = refs[0];
    if (!compInfo.outputState) compInfo.outputState = {};
    if (compInfo.scanCount == null) compInfo.scanCount = 0;
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    lines.push(`${alias} (comp [plc])`);
    lines.push('');
    if (comp.programRef) lines.push(`program: ${comp.programRef}`);
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
    lines.push('scan: .plc:{ set = 1 } runs one program pass');
    lines.push(`scanCount: ${comp.scanCount != null ? comp.scanCount : 0}`);
    lines.push('busy: 0 (instant scan; scanTime in P4)');
    if (comp.outputState && Object.keys(comp.outputState).length) {
      lines.push('');
      lines.push('outputState (last scan):');
      for (const [sym, val] of Object.entries(comp.outputState)) {
        lines.push(`  ${sym} = ${val}`);
      }
    }
    return lines;
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'busy') {
      return { value: '0', ref: null, varName: `${a.var}:busy`, bitWidth: 1 };
    }
    if (property !== 'scanCount') return null;
    const count = comp.scanCount != null ? comp.scanCount : 0;
    const bits = '16';
    const val = count.toString(2).padStart(parseInt(bits, 10), '0');
    return { value: val, ref: null, varName: `${a.var}:scanCount`, bitWidth: parseInt(bits, 10) };
  }

  _isActive(val) {
    return val === '1' || (val && val[val.length - 1] === '1');
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
    execFn(inst, externalInputs, comp.outputState);
    for (const [sym, target] of Object.entries(comp.outputMap || {})) {
      const w = inst.outputs[sym].width;
      plcWriteTarget(target, comp.outputState[sym], w, ctx);
    }
    comp.scanCount = (comp.scanCount || 0) + 1;
    if (comp.deviceIds && comp.deviceIds[0] && typeof plcSetScanCount === 'function') {
      plcSetScanCount(comp.deviceIds[0], comp.scanCount);
    }
    if (typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(compName);
    }
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set !== undefined) {
      const setVal = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (this._isActive(setVal)) {
        this._plcScan(comp, compName, ctx);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = PlcComponent; }
