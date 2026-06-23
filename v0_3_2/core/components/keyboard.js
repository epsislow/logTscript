var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function normalizeColor(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const s = String(value).trim();
  if (s.startsWith('^')) return '#' + s.slice(1);
  if (s.startsWith('#')) return s;
  return s;
}

function propagateKeyboardOutput(ctx, compName) {
  if (ctx.deferWirePropagation && ctx.deferWirePropagation() && ctx.signalPropagationStrategy) {
    const executed = new Set();
    const scheduled = ctx.signalPropagationStrategy._scheduleWiresDependingOnComponent(compName, executed);
    if (scheduled) {
      ctx.signalPropagationStrategy.propagate();
    }
    // Always run :valid / set= blocks — propagate() alone skips ucc when wires were scheduled.
    ctx.updateComponentConnections(compName);
    ctx._notifyIoportMemberChange(compName);
  } else {
    ctx.updateComponentConnections(compName);
    if (typeof showVars === 'function') showVars();
  }
  if (typeof ctx._emitComputedComponentProbes === 'function') {
    ctx._emitComputedComponentProbes(compName);
  }
}

function codeToBinary(code, width) {
  return code.toString(2).padStart(width, '0');
}

function resolveKeyInput(input, onlyNumbers) {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    const code = input;
    if (onlyNumbers) {
      if (code >= 0 && code <= 9) return code;
      return null;
    }
    if (code >= 0 && code <= 255) return code;
    return null;
  }

  const key = String(input);
  if (key === 'Enter') {
    return onlyNumbers ? null : 10;
  }
  if (onlyNumbers) {
    if (key.length === 1 && key >= '0' && key <= '9') {
      return parseInt(key, 10);
    }
    return null;
  }
  if (key === ' ') return 32;
  if (key.length === 1) return key.charCodeAt(0);
  return null;
}

var KeyboardComponent = class KeyboardComponent extends BuiltinComponent {
  static get type() { return 'keyboard'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes && attributes.onlyNumbers ? 4 : 8;
  }

  getSupportedProperties() {
    return ['get', 'valid'];
  }

  getRedirectProperties() {
    return ['get'];
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      let val = null;
      if (comp.ref && comp.ref !== '&-') val = ctx.getValueFromRef(comp.ref);
      const bits = this.getWidthBits(comp.attributes);
      if (val === null || val === undefined) val = '0'.repeat(bits);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
    }
    if (property === 'valid') {
      let val = '0';
      if (comp.validRef && comp.validRef !== '&-') {
        val = ctx.getValueFromRef(comp.validRef) || '0';
      }
      return { value: val, ref: null, varName: `${a.var}:valid`, bitWidth: 1 };
    }
    return null;
  }

  getDef() {
    return {
      attrs: [
        { name: 'label', value: 'string' },
        { name: 'color', value: 'string' },
        { name: 'bgColor', value: 'string' },
        { name: 'focusColor', value: 'string' },
        { name: 'focusBgColor', value: 'string' },
        { name: 'onlyNumbers', value: null },
        { name: 'nl', value: null },
      ],
      initValue: '8bit',
      pins: [],
      pouts: [
        { bits: 'X', name: 'get' },
        { bits: '1', name: 'valid' },
      ],
      returns: 'Xbit',
    };
  }

  static buildHandler(name, keyboardId, getRef, validRef, onlyNumbers, ctx) {
    const width = onlyNumbers ? 4 : 8;

    const onKey = (input, opts) => {
      const force = opts && opts.force;
      if (!force && typeof window !== 'undefined' && window.focusedKeyboardId !== keyboardId) {
        return false;
      }

      const code = resolveKeyInput(
        input !== undefined && input !== null && typeof input !== 'object'
          ? input
          : (opts && opts.charCode !== undefined ? opts.charCode : (opts && opts.key)),
        onlyNumbers
      );
      if (code === null) return false;

      const codeBin = codeToBinary(code, width);
      ctx.clog('onKey');
      ctx.runSafely(() => {
        if (ctx.deferWirePropagation && ctx.deferWirePropagation() && typeof ctx.scheduleComponentOutputChange === 'function') {
          ctx.scheduleComponentOutputChange(name, codeBin);
        } else {
          ctx.setValueAtRef(getRef, codeBin);
        }
        ctx.setValueAtRef(validRef, '1');
        propagateKeyboardOutput(ctx, name);
        ctx.runSafely(() => {
          ctx.setValueAtRef(validRef, '0');
          propagateKeyboardOutput(ctx, name);
        });
      });
      ctx.showlog(1);
      return true;
    };

    return { onKey };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const label = attributes.label !== undefined ? String(attributes.label) : 'Keyboard';
    const onlyNumbers = !!attributes.onlyNumbers;
    const width = onlyNumbers ? 4 : 8;
    const nl = !!attributes.nl;
    const color = normalizeColor(attributes.color, '#808080');
    const bgColor = normalizeColor(attributes.bgColor, '#101010');
    const focusColor = normalizeColor(attributes.focusColor, '#2ecc71');
    const focusBgColor = normalizeColor(attributes.focusBgColor, '#181818');

    const getIdx = ctx.storeValue('0'.repeat(width));
    const validIdx = ctx.storeValue('0');
    const getRef = `&${getIdx}`;
    const validRef = `&${validIdx}`;
    const keyboardId = baseId;

    const { onKey } = KeyboardComponent.buildHandler(
      name, keyboardId, getRef, validRef, onlyNumbers, ctx
    );

    if (typeof addKeyboard === 'function') {
      addKeyboard({
        id: keyboardId,
        label,
        color,
        bgColor,
        focusColor,
        focusBgColor,
        onlyNumbers,
        nl,
        onKey,
      });
    }

    return {
      deviceIds: [keyboardId],
      ref: getRef,
      validRef,
      keyboardHandler: { onKey },
    };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = KeyboardComponent; }
