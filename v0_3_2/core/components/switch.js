var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function syncSwitchPanel(switchId, on) {
  if (typeof setSwitch === 'function') {
    setSwitch(switchId, on);
  }
}

var SwitchComponent = class SwitchComponent extends BuiltinComponent {
  static get type() { return 'switch'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

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
        { name: 'text', value: 'string' },
        { name: 'hotkey', value: 'string' },
        { name: 'nl', value: null },
      ],
      initValue: '1bit',
      pins: [],
      pouts: [{ bits: '1', name: 'get' }],
      returns: '1bit',
    };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const text = attributes.text !== undefined ? String(attributes.text) : '';
    const nl = attributes.nl || false;
    const value = initialValue ? (initialValue[0] === '1') : false;
    const switchInitialValue = initialValue || '0';
    const storageIdx = ctx.storeValue(switchInitialValue);
    const switchRef = `&${storageIdx}`;
    const switchId = baseId;
    const deviceIds = [switchId];

    const onChange = (checked) => {
      ctx.scheduleComponentOutputChange(name, checked ? '1' : '0');
    };

    const switchHandler = {
      toggle: () => {
        const cur = ctx.getComponentStableValue(name);
        const on = cur === '1';
        const next = on ? '0' : '1';
        ctx.scheduleComponentOutputChange(name, next);
        syncSwitchPanel(switchId, next === '1');
        ctx.showlog(1);
      },
    };

    if (typeof addSwitch === 'function') {
      addSwitch({ id: switchId, text, value, nl, onChange });
    }

    const reg = typeof LogTScriptHotkeyRegister !== 'undefined' ? LogTScriptHotkeyRegister : null;
    if (reg && attributes.hotkey !== undefined) {
      reg.registerSwitchHotkey(ctx, name, switchId, attributes.hotkey, switchHandler);
    }

    return { deviceIds, ref: switchRef, switchHandler };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SwitchComponent; }
