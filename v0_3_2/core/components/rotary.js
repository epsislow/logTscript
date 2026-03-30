var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var RotaryComponent = class RotaryComponent extends BuiltinComponent {
  static get type() { return 'rotary'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    const states = attributes['states'] !== undefined ? parseInt(attributes['states'], 10) : 8;
    return Math.ceil(Math.log2(states));
  }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = null;
    if (comp.ref) val = ctx.getValueFromRef(comp.ref);
    const states = comp.attributes['states'] !== undefined ? parseInt(comp.attributes['states'], 10) : 8;
    const calculatedBits = Math.ceil(Math.log2(states));
    if (val === null || val === undefined) {
      val = '0'.repeat(calculatedBits);
    } else {
      if (val.length < calculatedBits) val = val.padStart(calculatedBits, '0');
      else if (val.length > calculatedBits) val = val.substring(0, calculatedBits);
    }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: calculatedBits };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const text = attributes.text !== undefined ? String(attributes.text) : '';
    const states = attributes.states !== undefined ? parseInt(attributes.states, 10) : 8;
    const color = attributes.color || '#6dff9c';
    const nl = attributes.nl || false;
    const forLabels = attributes.forLabels || {};
    if (states < 2) throw Error(`Rotary states must be at least 2 for component ${name}`);
    const calculatedBits = Math.ceil(Math.log2(states));
    const actualBits = bits || calculatedBits;

    const rotaryInitialValue = initialValue || '0'.repeat(actualBits);
    const storageIdx = ctx.storeValue(rotaryInitialValue);
    const rotaryRef = `&${storageIdx}`;
    const rotaryId = baseId;

    const onChange = (binValue) => {
      if (!rotaryRef) return;
      const sIdx = parseInt(rotaryRef.substring(1));
      const stored = ctx.storage.find(s => s.index === sIdx);
      if (!stored) return;
      const compInfo = ctx.components.get(name);
      if (!compInfo) return;
      if (!compInfo.ref) compInfo.ref = rotaryRef;
      const st = compInfo.attributes['states'] !== undefined ? parseInt(compInfo.attributes['states'], 10) : 8;
      const cb = Math.ceil(Math.log2(st));
      let value = binValue;
      if (value.length < cb) value = value.padStart(cb, '0');
      else if (value.length > cb) value = value.substring(0, cb);
      stored.value = value;
      ctx.updateComponentConnections(name);
      if (typeof showVars === 'function') showVars();
    };

    if (typeof addRotaryKnob === 'function') {
      addRotaryKnob({ id: rotaryId, label: text, states, color, forLabels, onChange });
    }
    return { deviceIds: [rotaryId], ref: rotaryRef };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const rotaryId = comp.deviceIds[0];
    const actualBits = ctx.getComponentBits(comp.type, comp.attributes);

    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.data !== undefined) {
          let dataValue = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
          if (dataValue.length < actualBits) dataValue = dataValue.padStart(actualBits, '0');
          else if (dataValue.length > actualBits) dataValue = dataValue.substring(0, actualBits);
          if (typeof setRotaryKnob === 'function') setRotaryKnob(rotaryId, dataValue);
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = RotaryComponent; }
