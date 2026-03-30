var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var LedComponent = class LedComponent extends BuiltinComponent {
  static get type() { return 'led'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) { return 1; }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = null;
    if (comp.ref && comp.ref !== '&-') {
      val = ctx.getValueFromRef(comp.ref);
    }
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    if (val === null || val === undefined) {
      val = comp.initialValue || '0'.repeat(bits);
    }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const text = attributes.text !== undefined ? String(attributes.text) : '';
    const color = attributes.color || '#ff0000';
    const square = attributes.square || false;
    const nl = attributes.nl || false;
    const value = initialValue || '0'.repeat(bits);
    const deviceIds = [];

    for (let i = 0; i < bits; i++) {
      const ledId = bits === 1 ? baseId : `${baseId}.${i + 1}`;
      const ledValue = value[i] === '1';
      const isLast = (i === bits - 1);
      const ledText = (i === 0) ? text : '';
      const ledNl = (isLast && nl) ? true : false;

      if (typeof addLed === 'function') {
        const ledParams = { id: ledId, text: ledText, color: color, value: ledValue, nl: ledNl };
        if (square) { ledParams.round = 0; }
        addLed(ledParams);
      }
      deviceIds.push(ledId);
    }
    return { deviceIds, ref: null };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.value !== undefined) {
          let ledValue = this.reEvalPendingValue(pending, 'value', reEvaluate, ctx);
          const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
          if (ledValue.length < bits) { ledValue = ledValue.padStart(bits, '0'); }
          else if (ledValue.length > bits) { ledValue = ledValue.substring(ledValue.length - bits); }
          if (comp.ref) {
            ctx.setValueAtRef(comp.ref, ledValue);
          } else {
            const storageIdx = ctx.storeValue(ledValue);
            comp.ref = `&${storageIdx}`;
          }
          for (let i = 0; i < comp.deviceIds.length && i < ledValue.length; i++) {
            const ledId = comp.deviceIds[i];
            const bitValue = ledValue[i] === '1';
            if (typeof setLed === 'function') { setLed(ledId, bitValue); }
          }
        }
      }
    }
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    for (let i = 0; i < comp.deviceIds.length && i < bitsToUse.length; i++) {
      const ledId = comp.deviceIds[i];
      const ledValue = bitsToUse[i] === '1';
      if (typeof setLed === 'function') { setLed(ledId, ledValue); }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = LedComponent; }
