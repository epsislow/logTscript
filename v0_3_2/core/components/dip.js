var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var DipComponent = class DipComponent extends BuiltinComponent {
  static get type() { return 'dip'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 4;
  }

  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = null;
    if (comp.ref && comp.ref !== '&-') { val = ctx.getValueFromRef(comp.ref); }
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    if (val === null || val === undefined) { val = comp.initialValue || '0'.repeat(bits); }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
  }

  getDef() {
    return {
      attrs: [{ name: 'length', value: 'integer' }, { name: 'text', value: 'string' }, { name: 'color', value: 'string' }, { name: 'colorFor', type: 'array', value: 'string' }, { name: 'nl', value: null }, { name: 'noLabels', value: null }, { name: 'noTrans', value: null }, { name: 'visual', value: '0/1' }],
      initValue: 'Xbit',
      pins: [],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const text = attributes.text !== undefined ? String(attributes.text) : '';
    const nl = attributes.nl || false;
    const noLabels = attributes.noLabels || false;
    const color = attributes.color || '#2ecc71';
    const colorFor = attributes.colorFor || {};
    const noTransition = attributes.noTrans || 1;
    const visual = attributes.visual !== undefined ? parseInt(attributes.visual, 10) : 0;
    const count = bits;
    //console.log('attr', colorFor);

    let initial = [];
    if (initialValue) {
      for (let i = 0; i < initialValue.length && i < count; i++) {
        initial.push(initialValue[i] === '1');
      }
    }
    while (initial.length < count) { initial.push(false); }

    const dipInitialValue = initialValue || '0'.repeat(count);
    const storageIdx = ctx.storeValue(dipInitialValue);
    const dipRef = `&${storageIdx}`;
    const dipId = baseId;
    const deviceIds = [dipId];

    const onChange = (index, checked) => {
      const compInfo = ctx.components.get(name);
      if (compInfo && compInfo.ref) {
        const sIdx = parseInt(compInfo.ref.substring(1));
        const stored = ctx.storage.find(s => s.index === sIdx);
        if (stored) {
          let currentValue = stored.value || '0'.repeat(count);
          if (currentValue.length < count) { currentValue = currentValue.padEnd(count, '0'); }
          else if (currentValue.length > count) { currentValue = currentValue.substring(0, count); }
          const bitsArr = currentValue.split('');
          bitsArr[index] = checked ? '1' : '0';
          stored.value = bitsArr.join('');
          
          ctx.clog('onChange');
          ctx.updateComponentConnections(name);
          if (typeof showVars === 'function') showVars();
          ctx.showlog(1);
        }
      }
    };

    if (typeof addDipSwitch === 'function') {
      addDipSwitch({ id: dipId, text, count, initial, nl, noLabels, visual, color, colorFor, onChange, noTransition });
    }
    return { deviceIds, ref: dipRef };
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    const dipId = comp.deviceIds[0];
    for (let i = 0; i < bitsToUse.length; i++) {
      const dipValue = bitsToUse[i] === '1';
      if (typeof setDip === 'function') {
        setDip(dipId, i, dipValue);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = DipComponent; }
