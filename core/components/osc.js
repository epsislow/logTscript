var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;
var OscTiming = (typeof require !== 'undefined') ? require('../osc-timing') : (typeof LogTScriptOscTiming !== 'undefined' ? LogTScriptOscTiming : null);

var OscComponent = class OscComponent extends BuiltinComponent {
  static get type() { return 'osc'; }
  static get shortnames() { return { '~': 'osc' }; }
  static get isReservedName() { return false; }

  getWidthBits(attributes) { return 1; }
  getSupportedProperties() { return ['get', 'counter', 'reset']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [
        { name: 'duration1', value: 'integer' },
        { name: 'duration0', value: 'integer' },
        { name: 'length', value: 'integer' },
        { name: 'freq', value: 'integer' },
        { name: 'freqIsSec', value: '0/1' },
        { name: 'eachCycle', value: '0/1' },
        { name: 'afterSettle', value: null },
        { name: 'delay0', value: 'integer' },
        { name: 'delay1', value: 'integer' },
        { name: 'delayIsSec', value: '0/1' },
      ],
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
    const timing = OscTiming || LogTScriptOscTiming;
    if (!timing) throw Error('LogTScriptOscTiming is not loaded');

    const parsed = timing.parseOscAttributes(attributes, name);
    const storageIdx = ctx.storeValue('0');
    const oscRef = `&${storageIdx}`;
    const oscState = {
      counterValue: '0'.repeat(parsed.length),
      length: parsed.length,
      eachCycle: parsed.eachCycle,
      afterSettle: parsed.afterSettle,
    };

    timing.startOscLoop(ctx, name, oscState, parsed.highTime, parsed.lowTime, parsed.eachCycle);

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
        oscState,
      },
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
