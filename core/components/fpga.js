var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function fpgaWriteWire(wireName, value, width, ctx) {
  let v = value || '0'.repeat(width);
  if (v.length < width) v = v.padStart(width, '0');
  else if (v.length > width) v = v.slice(-width);
  if (!ctx.wires.has(wireName)) throw Error(`FPGA output wire '${wireName}' not found`);
  if (ctx._logicRedirectSyncWrite) {
    ctx.writeWireStable(wireName, v);
    if (typeof ctx.deferWirePropagation === 'function' && ctx.deferWirePropagation()
        && ctx.signalPropagationStrategy) {
      ctx.signalPropagationStrategy.wirePendingStates.set(wireName, v);
    }
    return;
  }
  if (typeof ctx.publishWireValue === 'function') {
    ctx.publishWireValue(wireName, v);
    return;
  }
  ctx.writeWireStable(wireName, v);
  if (typeof ctx.updateConnectedComponents === 'function') {
    ctx.updateConnectedComponents(wireName, v);
  }
}

var FpgaComponent = class FpgaComponent extends BuiltinComponent {
  static get type() { return 'fpga'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits() { return 1; }

  getSpecialParseAttributes() {
    return {
      wireRefAttrs: ['clock'],
      literalAttrs: [],
    };
  }

  _getDesign(comp, ctx) {
    const ref = comp.designRef || comp.name;
    const inst = ctx.inlineInstances.get(ref);
    if (!inst || inst.kind !== 'fpga') {
      throw Error(`fpga ${comp.name}: inline [fpga] ${ref} not found`);
    }
    return inst.design;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const ref = name;
    const inst = ctx.inlineInstances.get(ref);
    if (!inst || inst.kind !== 'fpga') {
      throw Error(`comp ${name}: matching inline [fpga] ${ref} required`);
    }
    if (!attributes.clock && !attributes.clockMembers) {
      throw Error(`comp ${name}: clock = wire required`);
    }
    const design = inst.design;
    const inpBits = Math.max(design.inputPortCount, 1);
    const inpStorage = '0'.repeat(inpBits);
    const inpIdx = ctx.storeValue(inpStorage);
    const compInfo = {
      type: 'fpga',
      name,
      attributes,
      deviceIds: [baseId],
      designRef: ref,
      inpRef: `&${inpIdx}`,
      inpBits: design.inputPortCount,
      outBits: design.outputPortCount,
      seqStateWidth: design.seqStateWidth,
      prevClock: '0',
    };
    return { earlyReturn: true, compInfo };
  }

  getDef() {
    return {
      attrs: [
        { name: 'on', type: 'string' },
        { name: 'clock', type: 'binding' },
      ],
      pins: [],
      pouts: [],
    };
  }

  static preparePropertyBlock(comp, properties, ctx, compName) {
    comp._fpgaRedirects = properties.filter((p) => p.property === 'pout>');
    comp._fpgaInProps = properties.filter((p) => p.property !== 'pout>' && p.property !== 'set' && !String(p.property).endsWith('>'));
  }

  _readClock(comp, ctx) {
    const wireName = comp.attributes && comp.attributes.clock;
    if (wireName) {
      const v = ctx.getWireEffectiveValue(wireName);
      return v && v[v.length - 1] === '1' ? '1' : '0';
    }
    const members = comp.attributes && comp.attributes.clockMembers;
    if (!members || !members.length) return '0';
    const m = members[0];
    if (m.compRef) {
      const val = ctx._readComponentProbeValue({ compName: m.compRef, property: 'get' });
      return val && val[val.length - 1] === '1' ? '1' : '0';
    }
    return '0';
  }

  _runComb(comp, ctx) {
    const design = this._getDesign(comp, ctx);
    const inpVal = ctx.getValueFromRef(comp.inpRef) || '0'.repeat(comp.inpBits);
    const stepFn = typeof fpgaEvalStep === 'function' ? fpgaEvalStep : null;
    if (!stepFn) throw Error('FPGA sim is not loaded');
    const clock = this._readClock(comp, ctx);
    const pack = stepFn(design, inpVal, clock, comp.prevClock || '0');
    comp.prevClock = clock;
    const outBits = pack.slice(0, design.outputPortCount);
    const redirects = comp._fpgaRedirects || [];
    for (let i = 0; i < redirects.length; i++) {
      const rd = redirects[i];
      const bit = outBits[i] != null ? outBits[i] : '0';
      if (rd.target && rd.target.var) {
        fpgaWriteWire(rd.target.var, bit, 1, ctx);
      }
    }
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    const setVal = pending.set != null ? pending.set.value : null;
    const active = setVal === '1' || (setVal && setVal[setVal.length - 1] === '1');
    if (!active) return;
    const useSync = typeof ctx.deferWirePropagation === 'function' && ctx.deferWirePropagation();
    if (useSync) ctx._logicRedirectSyncWrite = true;
    try {
      this._runComb(comp, ctx);
    } finally {
      if (useSync) ctx._logicRedirectSyncWrite = false;
    }
  }

  shouldApplyAfterPropertyBlock(propertyNames) {
    return propertyNames.includes('set');
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    const m = String(property).match(/^in(\d+)$/);
    if (!m) return false;
    const idx = parseInt(m[1], 10);
    if (idx < 0 || idx >= comp.inpBits) {
      throw Error(`fpga ${comp.name}: ${property} out of range (inputs 0..${comp.inpBits - 1})`);
    }
    let inp = ctx.getValueFromRef(comp.inpRef) || '0'.repeat(comp.inpBits);
    if (inp.length < comp.inpBits) inp = inp.padStart(comp.inpBits, '0');
    const bit = value && value[value.length - 1] === '1' ? '1' : '0';
    inp = inp.slice(0, idx) + bit + inp.slice(idx + 1);
    ctx.setValueAtRef(comp.inpRef, inp);
    return true;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FpgaComponent;
}
