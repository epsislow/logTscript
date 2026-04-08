var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var OscComponent = class OscComponent extends BuiltinComponent {
  static get type() { return 'osc'; }
  static get shortnames() { return { '~': 'osc' }; }
  static get isReservedName() { return false; }

  getWidthBits(attributes) { return 1; }
  getSupportedProperties() { return ['get', 'counter', 'reset']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [{ name: 'duration1', value: 'integer' }, { name: 'duration0', value: 'integer' }, { name: 'length', value: 'integer' }, { name: 'freq', value: 'integer' }, { name: 'freqIsSec', value: '0/1' }, { name: 'eachCycle', value: '0/1' }],
      initValue: null,
      pins: [{ bits: '1', name: 'reset' }],
      pouts: [{ bits: '1', name: 'get' }, { bits: 'X', name: 'counter' }],
      returns: '1bit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      let val = null;
      if (comp.ref && comp.ref !== '&-') val = ctx.getValueFromRef(comp.ref);
      if (val === null || val === undefined) val = '0';
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: 1 };
    }
    if (property === 'counter') {
      const oscState = comp.oscState;
      if (!oscState) throw Error(`Oscillator ${a.var} has no internal state`);
      let val = oscState.counterValue;
      const counterLength = oscState.length;
      const br = this.handleBitRange(a, val, a.var, 'counter', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:counter`, bitWidth: counterLength };
    }
    return null;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const duration1 = attributes['duration1'] !== undefined ? parseInt(attributes['duration1'], 10) : 4;
    const duration0 = attributes['duration0'] !== undefined ? parseInt(attributes['duration0'], 10) : 4;
    const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 4;
    const freq = attributes['freq'] !== undefined ? parseFloat(attributes['freq']) : 1;
    const freqIsSec = attributes['freqIsSec'] !== undefined ? parseInt(attributes['freqIsSec'], 10) : 0;
    const eachCycle = attributes['eachCycle'] !== undefined ? parseInt(attributes['eachCycle'], 10) : 1;

    if (duration1 < 1 || duration1 > 8) throw Error(`Oscillator duration1 must be between 1 and 8 for component ${name}`);
    if (duration0 < 1 || duration0 > 8) throw Error(`Oscillator duration0 must be between 1 and 8 for component ${name}`);
    if (length < 1) throw Error(`Oscillator length must be positive for component ${name}`);
    if (freq <= 0) throw Error(`Oscillator freq must be positive for component ${name}`);
    if (freqIsSec !== 0 && freqIsSec !== 1) throw Error(`Oscillator freqIsSec must be 0 (Hz) or 1 (seconds) for component ${name}`);
    if (eachCycle !== 0 && eachCycle !== 1) throw Error(`Oscillator eachCycle must be 0 (each state) or 1 (each cycle) for component ${name}`);

    const storageIdx = ctx.storeValue('0');
    const oscRef = `&${storageIdx}`;
    const oscState = { counterValue: '0'.repeat(length), length, eachCycle };
    const period = freqIsSec === 1 ? freq * 1000 : 1000 / freq;
    const highTime = period * duration1 / (duration1 + duration0);
    const lowTime = period * duration0 / (duration1 + duration0);

    function incrementCounter() {
      const maxVal = (1 << oscState.length) - 1;
      let current = parseInt(oscState.counterValue, 2);
      current = (current + 1) > maxVal ? 0 : current + 1;
      oscState.counterValue = current.toString(2).padStart(oscState.length, '0');
    }

    function goHigh() {
      const stored = ctx.storage.find(s => s.index === storageIdx);
      if (stored) stored.value = '1';
      if (eachCycle === 0) incrementCounter();
      ctx.updateComponentConnections(name);
      if (typeof showVars === 'function') showVars();
      const tid = setTimeout(goLow, highTime);
      ctx.oscTimers.push(tid);
    }

    function goLow() {
      const stored = ctx.storage.find(s => s.index === storageIdx);
      if (stored) stored.value = '0';
      incrementCounter();
      ctx.updateComponentConnections(name);
      if (typeof showVars === 'function') showVars();
      const tid = setTimeout(goHigh, lowTime);
      ctx.oscTimers.push(tid);
    }

    const startTid = setTimeout(goHigh, lowTime);
    ctx.oscTimers.push(startTid);

    return {
      deviceIds: [],
      ref: oscRef,
      earlyReturn: true,
      compInfo: {
        type: 'osc',
        componentType: null,
        name,
        attributes,
        initialValue: '0',
        returnType,
        ref: oscRef,
        deviceIds: [],
        oscState
      }
    };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate') return;
    if (!pending) return;

    if (pending.reset !== undefined) {
      let resetValue = this.reEvalPendingValue(pending, 'reset', reEvaluate, ctx);
      if (resetValue === '1' || (resetValue && resetValue.length > 0 && resetValue[resetValue.length - 1] === '1')) {
        comp.oscState.counterValue = '0'.repeat(comp.oscState.length);
      }
    }
  }

  getForbidDirectAssign() {
    return 'Cannot assign a value to an osc component directly.';
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = OscComponent; }
