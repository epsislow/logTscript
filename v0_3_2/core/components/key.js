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
      attrs: [{ name: 'label', value: 'string' }, { name: 'size', value: 'integer' }, { name: 'nl', value: null }],
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
    const keyInitialValue = '0';
    const storageIdx = ctx.storeValue(keyInitialValue);
    const keyRef = `&${storageIdx}`;
    const keyId = baseId;
    const deviceIds = [keyId];

    const onPress = (pressedLabel) => {
      const keyStorageIdx = parseInt(keyRef.substring(1));
      const stored = ctx.storage.find(s => s.index === keyStorageIdx);
      if (stored) {
        stored.value = '1';
        ctx.updateComponentConnections(name);
        if (typeof showVars === 'function') showVars();
      }
    };

    const onRelease = () => {
      const keyStorageIdx = parseInt(keyRef.substring(1));
      const stored = ctx.storage.find(s => s.index === keyStorageIdx);
      if (stored) {
        stored.value = '0';
        ctx.updateComponentConnections(name);
        if (typeof showVars === 'function') showVars();
      }
    };

    if (typeof addKey === 'function') {
      addKey({ id: keyId, label, size, nl, onPress, onRelease });
    }
    return { deviceIds, ref: keyRef };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = KeyComponent; }
