var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var SliderComponent = class SliderComponent extends BuiltinComponent {
  static get type() { return 'slider'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  static ratioToState(ratio, length, reversed) {
    const max = (1 << length) - 1;
    if (max <= 0) return 0;
    const clamped = Math.max(0, Math.min(1, ratio));
    const valueRatio = reversed ? (1 - clamped) : clamped;
    return Math.round(valueRatio * max);
  }

  static stateToRatio(state, length, reversed) {
    const max = (1 << length) - 1;
    if (max <= 0) return 0;
    const clamped = Math.max(0, Math.min(max, state));
    const valueRatio = clamped / max;
    return reversed ? (1 - valueRatio) : valueRatio;
  }

  static stateToBin(state, length) {
    return state.toString(2).padStart(length, '0');
  }

  static formatDisplay(stateNum, forLabels) {
    const labels = forLabels || {};
    return (labels[stateNum] !== undefined) ? labels[stateNum] : stateNum.toString();
  }

  getWidthBits(attributes) {
    return attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 4;
  }

  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [
        { name: 'length', value: 'integer' },
        { name: 'text', value: 'string' },
        { name: 'color', value: 'string' },
        { name: 'orientation', value: '0/1' },
        { name: 'reversed', value: null },
        { name: 'for', type: 'array', value: 'string' },
        { name: 'nl', value: null },
      ],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }, { bits: 'X', name: 'data' }],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = null;
    if (comp.ref) val = ctx.getValueFromRef(comp.ref);
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 4;
    if (val === null || val === undefined) {
      val = '0'.repeat(bits);
    } else {
      if (val.length < bits) val = val.padStart(bits, '0');
      else if (val.length > bits) val = val.substring(0, bits);
    }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const length = attributes.length !== undefined ? parseInt(attributes.length, 10) : 4;
    if (length < 1 || length > 8) {
      throw Error(`Slider length must be 1..8 for component ${name}`);
    }
    const text = attributes.text !== undefined ? String(attributes.text) : '';
    const color = attributes.color || '#6dff9c';
    const orientation = attributes.orientation !== undefined ? parseInt(attributes.orientation, 10) : 0;
    const reversed = !!attributes.reversed;
    const forLabels = attributes['for'] || {};
    const nl = attributes.nl || false;
    const actualBits = bits || length;

    const sliderInitialValue = initialValue || '0'.repeat(actualBits);
    const storageIdx = ctx.storeValue(sliderInitialValue);
    const sliderRef = `&${storageIdx}`;
    const sliderId = baseId;

    const onChange = (binValue) => {
      const compInfo = ctx.components.get(name);
      if (!compInfo) return;
      if (!compInfo.ref) compInfo.ref = sliderRef;
      const len = compInfo.attributes.length !== undefined
        ? parseInt(compInfo.attributes.length, 10) : 4;
      let value = binValue;
      if (value.length < len) value = value.padStart(len, '0');
      else if (value.length > len) value = value.substring(0, len);
      ctx.scheduleComponentOutputChange(name, value);
    };

    if (typeof addSlider === 'function') {
      addSlider({
        id: sliderId,
        label: text,
        length,
        color,
        orientation,
        reversed,
        forLabels,
        onChange,
        nl,
        initialBin: sliderInitialValue,
      });
    }
    return { deviceIds: [sliderId], ref: sliderRef };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const sliderId = comp.deviceIds[0];
    const actualBits = ctx.getComponentBits(comp.type, comp.attributes);

    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.data !== undefined) {
          let dataValue = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
          if (dataValue.length < actualBits) dataValue = dataValue.padStart(actualBits, '0');
          else if (dataValue.length > actualBits) dataValue = dataValue.substring(0, actualBits);
          if (typeof setSlider === 'function') {
            setSlider(sliderId, dataValue);
          }
          ctx.scheduleComponentOutputChange(compName, dataValue);
        }
      }
    }
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    const len = this.getWidthBits(comp.attributes);
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    if (bitsToUse.length < len) bitsToUse = bitsToUse.padStart(len, '0');
    else if (bitsToUse.length > len) bitsToUse = bitsToUse.substring(0, len);
    const sliderId = comp.deviceIds[0];
    if (typeof setSlider === 'function') {
      setSlider(sliderId, bitsToUse);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SliderComponent; }
