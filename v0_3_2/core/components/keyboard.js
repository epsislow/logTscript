var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

const KEYBOARD_WIDTH = 8;
const CODES_ACCEPTED_DEPTH_ERR = 'codesAccepted requires lut with depth 1 or 8';

const KEY_ARROW_LEFT = 128;
const KEY_ARROW_RIGHT = 129;
const KEY_ARROW_UP = 130;
const KEY_ARROW_DOWN = 131;
const KEY_DELETE = 132;

const NAMED_KEY_CODES = {
  Enter: 10,
  Backspace: 8,
  ArrowLeft: KEY_ARROW_LEFT,
  ArrowRight: KEY_ARROW_RIGHT,
  ArrowUp: KEY_ARROW_UP,
  ArrowDown: KEY_ARROW_DOWN,
  Delete: KEY_DELETE,
};

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

function isArrowCode(code) {
  return code >= KEY_ARROW_LEFT && code <= KEY_ARROW_DOWN;
}

function resolveNamedKeyCode(key, filterState) {
  if (!Object.prototype.hasOwnProperty.call(NAMED_KEY_CODES, key)) return null;
  const code = NAMED_KEY_CODES[key];
  if (code === 10 && !filterState.allowEnter) return null;
  if (code === 8 && !filterState.allowBackspace) return null;
  if (isArrowCode(code) && !filterState.allowArrows) return null;
  if (code === KEY_DELETE && !filterState.allowDelete) return null;
  return code;
}

function normalizeKeyToAsciiForLut(input) {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    const code = input;
    if (code >= 0 && code <= 255) return code;
    if (code >= 0 && code <= 9) return 48 + code;
    return null;
  }

  const key = String(input);
  if (key === ' ') return 32;
  if (Object.prototype.hasOwnProperty.call(NAMED_KEY_CODES, key)) {
    return NAMED_KEY_CODES[key];
  }
  if (key.length === 1) return key.charCodeAt(0);
  return null;
}

function normalizeKeyToAscii(input, filterState) {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    const code = input;
    if (code >= 0 && code <= 255) return code;
    if (code >= 0 && code <= 9) return 48 + code;
    return null;
  }

  const key = String(input);
  if (key === ' ') return 32;
  const named = resolveNamedKeyCode(key, filterState || {});
  if (named !== null) return named;
  if (key.length === 1) return key.charCodeAt(0);
  return null;
}

function resolveKeyInput(input, filterState) {
  if (input === null || input === undefined) return null;

  const {
    onlyDigits,
    allowEnter,
    allowBackspace,
    allowArrows,
    allowDelete,
  } = filterState;

  if (typeof input === 'number') {
    const code = input;
    if (onlyDigits) {
      if (code >= 48 && code <= 57) return code;
      if (code >= 0 && code <= 9) return 48 + code;
      if (code === 10 && allowEnter) return 10;
      if (code === 8 && allowBackspace) return 8;
      if (isArrowCode(code) && allowArrows) return code;
      if (code === KEY_DELETE && allowDelete) return KEY_DELETE;
      return null;
    }
    if (code === 10 && !allowEnter) return null;
    if (code === 8 && !allowBackspace) return null;
    if (isArrowCode(code) && !allowArrows) return null;
    if (code === KEY_DELETE && !allowDelete) return null;
    if (code >= 0 && code <= 255) return code;
    return null;
  }

  const key = String(input);
  const named = resolveNamedKeyCode(key, filterState);
  if (named !== null) return named;

  if (onlyDigits) {
    if (key.length === 1 && key >= '0' && key <= '9') {
      return key.charCodeAt(0);
    }
    return null;
  }
  if (key === ' ') return 32;
  if (key.length === 1) return key.charCodeAt(0);
  return null;
}

function buildValuesWhitelist(lutComp) {
  const fill = lutComp.fillwithValue != null ? String(lutComp.fillwithValue) : '0'.repeat(8);
  const allowed = new Set();
  const table = lutComp.lutTable;
  if (!table) return allowed;
  for (const v of table) {
    if (v !== fill) allowed.add(v);
  }
  return allowed;
}

function setupCodesAcceptedFilter(filterState, lutComp) {
  if (!lutComp || lutComp.type !== 'lut') {
    throw Error(`codesAccepted must reference a comp [lut] component`);
  }
  const depth = lutComp.attributes && lutComp.attributes.depth !== undefined
    ? parseInt(lutComp.attributes.depth, 10)
    : 4;
  if (depth !== 1 && depth !== 8) {
    throw Error(CODES_ACCEPTED_DEPTH_ERR);
  }
  if (!lutComp.lutTable || !lutComp.lutTable.length) {
    throw Error(`codesAccepted lut ${filterState.lutName} has no table data`);
  }
  filterState.lutComp = lutComp;
  if (depth === 1) {
    filterState.mode = 'bitmap';
    filterState.allowedCodes = null;
  } else {
    filterState.mode = 'values';
    filterState.allowedCodes = buildValuesWhitelist(lutComp);
  }
  filterState.ready = true;
}

function ensureCodesAcceptedFilter(filterState, ctx) {
  if (!filterState.lutName) return;
  if (filterState.ready) return;
  if (!ctx || !ctx.components) {
    throw Error(`codesAccepted lut ${filterState.lutName} is not available`);
  }
  const lutComp = ctx.components.get(filterState.lutName);
  if (!lutComp) {
    throw Error(`codesAccepted lut ${filterState.lutName} not found`);
  }
  setupCodesAcceptedFilter(filterState, lutComp);
}

function isCodeAllowedByLut(code, filterState) {
  if (filterState.mode === 'bitmap') {
    const table = filterState.lutComp.lutTable;
    if (code < 0 || code >= table.length) return false;
    return table[code] === '1';
  }
  if (filterState.mode === 'values') {
    return filterState.allowedCodes.has(codeToBinary(code, KEYBOARD_WIDTH));
  }
  return false;
}

function parseShowCode(attributes) {
  if (attributes.showCode === undefined || attributes.showCode === null || attributes.showCode === '') {
    return 0;
  }
  const mode = parseInt(attributes.showCode, 10);
  if (mode !== 0 && mode !== 1 && mode !== 2) {
    throw Error('showCode must be 0, 1, or 2');
  }
  return mode;
}

function notifyKeyboardUi(keyboardId, asciiCode, ui) {
  if (ui.showCode && typeof onKeyboardShowCode === 'function') {
    onKeyboardShowCode(keyboardId, asciiCode, ui.showCode);
  }
  if (ui.pulseColor && typeof onKeyboardPulseColor === 'function') {
    onKeyboardPulseColor(keyboardId, ui.pulseColor);
  }
  if (typeof window !== 'undefined' && window.panelKeyboards) {
    const kb = window.panelKeyboards.get(keyboardId);
    if (kb) {
      if (ui.showCode) kb.setCodeDisplay(asciiCode);
      if (ui.pulseColor) kb.pulseFeedback(ui.pulseColor);
    }
  }
}

var KeyboardComponent = class KeyboardComponent extends BuiltinComponent {
  static get type() { return 'keyboard'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return { bindingAttrs: ['codesAccepted'] };
  }

  getWidthBits(_attributes) {
    return KEYBOARD_WIDTH;
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
      const bits = KEYBOARD_WIDTH;
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
        { name: 'onlyDigits', value: null },
        { name: 'allowEnter', value: null },
        { name: 'allowBackspace', value: null },
        { name: 'allowArrows', value: null },
        { name: 'allowDelete', value: null },
        { name: 'codesAccepted', value: '.component (lut)' },
        { name: 'showCode', value: 'integer' },
        { name: 'pulseColor', value: 'string' },
        { name: 'nl', value: null },
      ],
      initValue: '8bit',
      pins: [],
      pouts: [
        { bits: '8', name: 'get' },
        { bits: '1', name: 'valid' },
      ],
      returns: '8bit',
    };
  }

  static finalizeAllCodesAccepted(ctx) {
    if (!ctx || !ctx.components) return;
    for (const comp of ctx.components.values()) {
      if (comp.type !== 'keyboard' || !comp.codesAcceptedFilter) continue;
      const filterState = comp.codesAcceptedFilter;
      if (filterState.ready || !filterState.lutName) continue;
      const lutComp = ctx.components.get(filterState.lutName);
      if (!lutComp) {
        throw Error(`codesAccepted lut ${filterState.lutName} not found`);
      }
      setupCodesAcceptedFilter(filterState, lutComp);
    }
  }

  static buildHandler(name, keyboardId, getRef, validRef, filterState, ui, ctx) {
    const onKey = (input, opts) => {
      const force = opts && opts.force;
      if (!force && typeof window !== 'undefined' && window.focusedKeyboardId !== keyboardId) {
        return false;
      }

      const raw = input !== undefined && input !== null && typeof input !== 'object'
        ? input
        : (opts && opts.charCode !== undefined ? opts.charCode : (opts && opts.key));

      let code;
      if (filterState.lutName) {
        ensureCodesAcceptedFilter(filterState, ctx);
        code = normalizeKeyToAsciiForLut(raw);
        if (code === null) return false;
        if (!isCodeAllowedByLut(code, filterState)) return false;
      } else {
        code = resolveKeyInput(raw, filterState);
        if (code === null) return false;
      }

      const codeBin = codeToBinary(code, KEYBOARD_WIDTH);
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
      notifyKeyboardUi(keyboardId, code, ui);
      return true;
    };

    return { onKey };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const label = attributes.label !== undefined ? String(attributes.label) : 'Keyboard';
    const onlyDigits = !!attributes.onlyDigits;
    const allowEnter = !!attributes.allowEnter;
    const allowBackspace = !!attributes.allowBackspace;
    const allowArrows = !!attributes.allowArrows;
    const allowDelete = !!attributes.allowDelete;
    const nl = !!attributes.nl;
    const color = normalizeColor(attributes.color, '#808080');
    const bgColor = normalizeColor(attributes.bgColor, '#101010');
    const focusColor = normalizeColor(attributes.focusColor, '#2ecc71');
    const focusBgColor = normalizeColor(attributes.focusBgColor, '#181818');
    const showCode = parseShowCode(attributes);
    const pulseColor = attributes.pulseColor !== undefined && attributes.pulseColor !== null && attributes.pulseColor !== ''
      ? normalizeColor(attributes.pulseColor, null)
      : null;
    const ui = { showCode, pulseColor };

    const members = attributes.codesAcceptedMembers || [];
    const lutName = members.length ? members[0] : null;
    const filterState = {
      onlyDigits,
      allowEnter,
      allowBackspace,
      allowArrows,
      allowDelete,
      lutName,
      lutComp: null,
      mode: null,
      allowedCodes: null,
      ready: false,
    };

    if (lutName) {
      const lutComp = ctx.components && ctx.components.get(lutName);
      if (lutComp) {
        setupCodesAcceptedFilter(filterState, lutComp);
      }
    }

    const getIdx = ctx.storeValue('0'.repeat(KEYBOARD_WIDTH));
    const validIdx = ctx.storeValue('0');
    const getRef = `&${getIdx}`;
    const validRef = `&${validIdx}`;
    const keyboardId = baseId;

    const { onKey } = KeyboardComponent.buildHandler(
      name, keyboardId, getRef, validRef, filterState, ui, ctx
    );

    if (typeof addKeyboard === 'function') {
      addKeyboard({
        id: keyboardId,
        label,
        color,
        bgColor,
        focusColor,
        focusBgColor,
        onlyDigits,
        allowEnter,
        allowBackspace,
        allowArrows,
        allowDelete,
        showCode,
        pulseColor,
        nl,
        onKey,
      });
    }

    return {
      deviceIds: [keyboardId],
      ref: getRef,
      validRef,
      keyboardHandler: { onKey },
      codesAcceptedFilter: filterState,
      keyboardUi: ui,
    };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = KeyboardComponent; }
