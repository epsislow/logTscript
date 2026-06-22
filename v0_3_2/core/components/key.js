var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function syncKeyPanel(keyId, on) {
  if (typeof window === 'undefined' || !window.panelKeys) return;
  const pk = window.panelKeys.get(keyId);
  if (pk && typeof pk.setOutputOn === 'function') {
    pk.setOutputOn(on);
  }
}

function readKeyOutput(ctx, name, keyRef) {
  const comp = ctx.components && ctx.components.get(name);
  if (comp && comp.ref) {
    const v = ctx.getValueFromRef(comp.ref);
    if (v != null) return v === '1';
  }
  const idx = parseInt(String(keyRef).substring(1), 10);
  if (!isNaN(idx) && ctx.storage) {
    const stored = ctx.storage.find(s => s.index === idx);
    if (stored) return stored.value === '1';
  }
  return false;
}

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
        { name: 'type', value: '0/1/2' },
      ],
      initValue: '1bit',
      pins: [],
      pouts: [{ bits: '1', name: 'get' }],
      returns: '1bit',
    };
  }

  static buildHandlers(name, keyId, keyRef, keyType, ctx) {
    const type = keyType !== undefined && keyType !== null ? parseInt(keyType, 10) : 0;

    if (type === 2) {
      const onPress = () => {
        ctx.clog('onPress');
        const cur = readKeyOutput(ctx, name, keyRef);
        const next = cur ? '0' : '1';
        ctx.scheduleComponentOutputChange(name, next);
        syncKeyPanel(keyId, next === '1');
        ctx.showlog(1);
      };
      const onRelease = () => {};
      return { onPress, onRelease, type };
    }

    const onPress = () => {
      ctx.clog('onPress');
      ctx.scheduleComponentOutputChange(name, '1');
      ctx.showlog(1);
    };

    const onRelease = () => {
      ctx.clog('onRelease');
      ctx.scheduleComponentOutputChange(name, '0');
      ctx.showlog(1);
    };

    return { onPress, onRelease, type };
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

    const { onPress, onRelease, type } = KeyComponent.buildHandlers(
      name, keyId, keyRef, attributes.type, ctx
    );

    if (typeof addKey === 'function') {
      addKey({ id: keyId, label, size, nl, onPress, onRelease, type });
    }

    return {
      deviceIds,
      ref: keyRef,
      keyHandler: { onPress, onRelease },
    };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = KeyComponent; }
