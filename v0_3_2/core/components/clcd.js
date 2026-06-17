var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var ClcdComponent = class ClcdComponent extends BuiltinComponent {
  static get type() { return 'clcd'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }
  static get knownSymbols() {
    return (typeof CLCD_KNOWN_SYMBOLS !== 'undefined') ? CLCD_KNOWN_SYMBOLS : [];
  }

  static normalizeColor(val, fallback) {
    if (val === undefined || val === null || val === '') return fallback;
    let s = String(val);
    if (s.charAt(0) === '^') s = '#' + s.slice(1);
    else if (s.charAt(0) !== '#') s = '#' + s;
    return s;
  }

  static validateContiguousBits(symbols) {
    const used = new Set();
    for (const s of symbols) {
      if (s.bit !== undefined) used.add(s.bit);
      else if (s.bitsStart !== undefined) {
        for (let i = s.bitsStart; i <= s.bitsEnd; i++) used.add(i);
      }
    }
    if (used.size === 0) return;
    const max = Math.max(...used);
    for (let i = 0; i <= max; i++) {
      if (!used.has(i)) {
        throw Error(`CLCD bit mapping must be contiguous from 0 with no gaps — unused bit ${i}`);
      }
    }
  }

  static bitWidthFromSymbols(symbols) {
    if (!symbols || symbols.length === 0) return 1;
    ClcdComponent.validateContiguousBits(symbols);
    let max = 0;
    for (const s of symbols) {
      if (s.bit !== undefined) max = Math.max(max, s.bit);
      else if (s.bitsEnd !== undefined) max = Math.max(max, s.bitsEnd);
    }
    return max + 1;
  }

  static resolveSymbols(symbols, defaultColor, defaultBgColor) {
    const fg = ClcdComponent.normalizeColor(defaultColor, '#00ff00');
    const bg = ClcdComponent.normalizeColor(defaultBgColor, '#000000');
    return (symbols || []).map((sym) => ({
      ...sym,
      color: ClcdComponent.normalizeColor(sym.color, fg),
      bgColor: ClcdComponent.normalizeColor(sym.bgColor, bg),
    }));
  }

  getWidthBits(attributes) {
    return ClcdComponent.bitWidthFromSymbols(attributes.clcdSymbols || []);
  }

  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [
        { name: 'width', value: 'integer' },
        { name: 'height', value: 'integer' },
        { name: 'color', value: 'color' },
        { name: 'bgColor', value: 'color' },
        { name: 'nl', value: null },
      ],
      initValue: '{ symbol: x: integer y: integer bit: N bits: N-M color: color bgColor: color : }',
      pins: [],
      pouts: [],
      returns: null,
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = comp.lastValue || null;
    if (val === null && comp.ref && comp.ref !== '&-') {
      val = ctx.getValueFromRef(comp.ref);
    }
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    if (val === null || val === undefined) {
      val = '0'.repeat(bits);
    } else {
      if (val.length < bits) val = val.padStart(bits, '0');
      else if (val.length > bits) val = val.substring(val.length - bits);
    }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {
    const rawSymbols = (initialValue && initialValue.kind === 'clcdSymbols')
      ? initialValue.symbols
      : (attributes.clcdSymbols || []);
    const defaultColor = attributes.color;
    const defaultBgColor = attributes.bgColor;
    const symbols = ClcdComponent.resolveSymbols(rawSymbols, defaultColor, defaultBgColor);
    ClcdComponent.validateContiguousBits(symbols);
    compInfo.clcdSymbols = symbols;
    compInfo.lastValue = '0'.repeat(bits);
  }

  _applyBits(comp, compName, bitString, ctx) {
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    let v = bitString;
    if (v.length < bits) v = v.padStart(bits, '0');
    else if (v.length > bits) v = v.substring(v.length - bits);
    comp.lastValue = v;
    if (comp.deviceIds.length > 0 && typeof setClcdBits === 'function') {
      setClcdBits(comp.deviceIds[0], v);
    }
    if (comp.ref) ctx.setValueAtRef(comp.ref, v);
    ctx.scheduleComponentOutputChange(compName, v);
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const width = attributes.width !== undefined ? parseInt(attributes.width, 10) : 200;
    const height = attributes.height !== undefined ? parseInt(attributes.height, 10) : 100;
    const defaultColor = ClcdComponent.normalizeColor(attributes.color, '#00ff00');
    const defaultBgColor = ClcdComponent.normalizeColor(attributes.bgColor, '#000000');
    const nl = !!attributes.nl;
    const rawSymbols = (initialValue && initialValue.kind === 'clcdSymbols')
      ? initialValue.symbols
      : (attributes.clcdSymbols || []);
    const symbols = ClcdComponent.resolveSymbols(rawSymbols, defaultColor, defaultBgColor);
    const initialBits = '0'.repeat(bits);
    const storageIdx = ctx.storeValue(initialBits);
    const clcdRef = `&${storageIdx}`;
    const clcdId = baseId;

    if (typeof addClcd === 'function') {
      addClcd({
        id: clcdId,
        width,
        height,
        color: defaultColor,
        bgColor: defaultBgColor,
        symbols,
        nl,
        initialBits,
      });
    }
    return { deviceIds: [clcdId], ref: clcdRef };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set !== undefined) {
      const setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || (setValue && setValue[setValue.length - 1] === '1')) {
        if (pending.value !== undefined) {
          const dataValue = this.reEvalPendingValue(pending, 'value', reEvaluate, ctx);
          this._applyBits(comp, compName, dataValue, ctx);
        }
      }
    }
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    const len = comp.lastValue ? comp.lastValue.length : this.getWidthBits(comp.attributes);
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    if (bitsToUse.length < len) bitsToUse = bitsToUse.padStart(len, '0');
    else if (bitsToUse.length > len) bitsToUse = bitsToUse.substring(bitsToUse.length - len);
    if (comp.deviceIds.length > 0 && typeof setClcdBits === 'function') {
      setClcdBits(comp.deviceIds[0], bitsToUse);
    }
    comp.lastValue = bitsToUse;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClcdComponent;
}
