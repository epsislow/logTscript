var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var KeyComponent = class KeyComponent extends BuiltinComponent {
  static get type() { return 'key'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return false; }

  getWidthBits(attributes) { return 1; }
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
      attrs: [
        { name: 'label', value: 'string' },
        { name: 'size', value: 'integer' }, 
        { name: 'nl', value: null }, 
        { name: 'type', value: 'integer'},
      ],
      initValue: '1bit',
      pins: [],
      pouts: [{ bits: '1', name: 'get' }],
      returns: '1bit',
    };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const label = attributes.label !== undefined ? String(attributes.label) : '';
    const size = attributes.size !== undefined ? parseInt(attributes.size, 10) : 36;
    const nl = attributes.nl || false;
    const type = attributes.type || 0;
    const keyInitialValue = '0';
    const storageIdx = ctx.storeValue(keyInitialValue);
    const keyRef = `&${storageIdx}`;
    const keyId = baseId;
    const deviceIds = [keyId];

    const onPress = (pressedLabel) => {
      ctx.clog('onPress');
      ctx.scheduleComponentOutputChange(name, '1');
      ctx.showlog(1);
    };

    const onRelease = () => {
      ctx.clog('onRelease');
      ctx.scheduleComponentOutputChange(name, '0');
      ctx.showlog(1);
    };

    if (typeof addKey === 'function') {
      addKey({ id: keyId, label, size, nl, onPress, onRelease, type});
    }
    return { deviceIds, ref: keyRef };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = KeyComponent; }
