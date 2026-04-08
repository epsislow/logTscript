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
      attrs: [{ name: 'length', value: 'integer' }, { name: 'text', value: 'string' }, { name: 'nl', value: null }, { name: 'noLabels', value: null }, { name: 'visual', value: '0/1' }],
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
    const visual = attributes.visual !== undefined ? parseInt(attributes.visual, 10) : 0;
    const count = bits;

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
          ctx.updateComponentConnections(name);
          if (typeof showVars === 'function') showVars();
        }
      }
    };

    if (typeof addDipSwitch === 'function') {
      addDipSwitch({ id: dipId, text, count, initial, nl, noLabels, visual, onChange });
    }
    return { deviceIds, ref: dipRef };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = DipComponent; }
