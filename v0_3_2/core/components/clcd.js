var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var ClcdComponent = class ClcdComponent extends BuiltinComponent {
  static get type() { return 'clcd'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }
  static get knownSymbols() {
    return (typeof CLCD_KNOWN_SYMBOLS !== 'undefined') ? CLCD_KNOWN_SYMBOLS : [];
  }

  static FA_TOUCH_W = 22;
  static FA_TOUCH_H = 22;
  static DIGIT7_TOUCH_W = 28;
  static DIGIT7_TOUCH_H = 44;
  static DP_TOUCH_W = 12;
  static DP_TOUCH_H = 12;
  static COLON_TOUCH_W = 8;
  static COLON_TOUCH_H = 32;
  static LABEL_TOUCH_W = 40;
  static LABEL_TOUCH_H = 18;

  static normalizeColor(val, fallback) {
    if (val === undefined || val === null || val === '') return fallback;
    let s = String(val);
    if (s.charAt(0) === '^') s = '#' + s.slice(1);
    else if (s.charAt(0) !== '#') s = '#' + s;
    return s.toLowerCase();
  }

  static symbolsWithBitOut(symbols) {
    return (symbols || []).filter((s) => s.bitOut !== undefined);
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

  static validateContiguousBitOut(symbols) {
    const touchSyms = ClcdComponent.symbolsWithBitOut(symbols);
    if (touchSyms.length === 0) return;
    const used = new Set();
    for (const s of touchSyms) used.add(s.bitOut);
    const max = Math.max(...used);
    for (let i = 0; i <= max; i++) {
      if (!used.has(i)) {
        throw Error(`CLCD bitOut mapping must be contiguous from 0 with no gaps — unused bitOut ${i}`);
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

  static touchOutWidthFromSymbols(symbols) {
    const touchSyms = ClcdComponent.symbolsWithBitOut(symbols);
    if (touchSyms.length === 0) return 0;
    ClcdComponent.validateContiguousBitOut(symbols);
    let max = 0;
    for (const s of touchSyms) max = Math.max(max, s.bitOut);
    return max + 1;
  }

  static defaultTouchSize(symName, symDef) {
    if (symDef && symDef.kind === 'canvas') {
      if (symName === 'digit7' || symName === 'digit14') {
        return { width: ClcdComponent.DIGIT7_TOUCH_W, height: ClcdComponent.DIGIT7_TOUCH_H };
      }
      if (symName === 'dp') {
        return { width: ClcdComponent.DP_TOUCH_W, height: ClcdComponent.DP_TOUCH_H };
      }
      if (symName === 'colon') {
        return { width: ClcdComponent.COLON_TOUCH_W, height: ClcdComponent.COLON_TOUCH_H };
      }
    }
    if (symDef && symDef.kind === 'text') {
      return { width: ClcdComponent.LABEL_TOUCH_W, height: ClcdComponent.LABEL_TOUCH_H };
    }
    return { width: ClcdComponent.FA_TOUCH_W, height: ClcdComponent.FA_TOUCH_H };
  }

  static resolveTouchDims(sym, defaults) {
    const symDef = (typeof getClcdSymbolDef === 'function')
      ? getClcdSymbolDef(sym.name)
      : null;
    const base = ClcdComponent.defaultTouchSize(sym.name, symDef);
    return {
      width: sym.width !== undefined ? sym.width : base.width,
      height: sym.height !== undefined ? sym.height : base.height,
      padding: sym.padding !== undefined
        ? sym.padding
        : (defaults && defaults.touchPadding !== undefined ? defaults.touchPadding : 0),
    };
  }

  static computeTouchRect(sym, defaults) {
    if (sym.bitOut === undefined) return null;
    const dims = ClcdComponent.resolveTouchDims(sym, defaults);
    const pad = dims.padding;
    return {
      x1: sym.x - pad,
      y1: sym.y - pad,
      x2: sym.x + dims.width + pad,
      y2: sym.y + dims.height + pad,
      bitOut: sym.bitOut,
      name: sym.name,
    };
  }

  static hitTestAt(symbols, px, py, defaults, touchEnabled) {
    if (!touchEnabled) return [];
    const hits = [];
    for (const sym of symbols || []) {
      if (sym.bitOut === undefined) continue;
      const rect = ClcdComponent.computeTouchRect(sym, defaults);
      if (!rect) continue;
      if (px >= rect.x1 && px <= rect.x2 && py >= rect.y1 && py <= rect.y2) {
        hits.push(sym);
      }
    }
    return hits;
  }

  static _setBit(str, index, ch) {
    const arr = str.split('');
    while (arr.length <= index) arr.unshift('0');
    arr[index] = ch;
    return arr.join('');
  }

  static _composeTouchOut(comp, width) {
    const latch = comp.touchLatchState || '0'.repeat(width);
    let out = latch;
    const active = comp.activeTouchPress || new Set();
    for (const idx of active) {
      out = ClcdComponent._setBit(out, idx, '1');
    }
    if (out.length < width) out = out.padStart(width, '0');
    else if (out.length > width) out = out.substring(out.length - width);
    return out;
  }

  static defaultSymbolBgColor(attributes) {
    if (attributes && attributes.bgColorSym !== undefined && attributes.bgColorSym !== null && attributes.bgColorSym !== '') {
      return attributes.bgColorSym;
    }
    return attributes ? attributes.bgColor : undefined;
  }

  static resolveSymbols(symbols, defaultColor, defaultSymBgColor) {
    const fg = ClcdComponent.normalizeColor(defaultColor, '#00ff00');
    const bg = ClcdComponent.normalizeColor(defaultSymBgColor, '#000000');
    return (symbols || []).map((sym) => {
      const resolved = {
        ...sym,
        color: ClcdComponent.normalizeColor(sym.color, fg),
        bgColor: ClcdComponent.normalizeColor(sym.bgColor, bg),
      };
      if (resolved.bitOut !== undefined && resolved.touchType === undefined) {
        resolved.touchType = 1;
      }
      return resolved;
    });
  }

  static touchDefaultsFromAttributes(attributes) {
    const touchPadding = attributes.touchPadding !== undefined
      ? parseInt(attributes.touchPadding, 10)
      : 0;
    return { touchPadding };
  }

  getWidthBits(attributes) {
    return ClcdComponent.bitWidthFromSymbols(attributes.clcdSymbols || []);
  }

  supportsPropertyName(property, attributes) {
    if (property === 'get') return true;
    const outW = ClcdComponent.touchOutWidthFromSymbols(attributes.clcdSymbols || []);
    if (outW === 0) return false;
    return property === 'out' || property === 'touchReset';
  }

  getSupportedProperties() { return ['get', 'out', 'touchReset']; }
  getRedirectProperties() { return ['get', 'out']; }

  getDef() {
    return {
      attrs: [
        { name: 'width', value: 'integer' },
        { name: 'height', value: 'integer' },
        { name: 'color', value: 'color' },
        { name: 'bgColor', value: 'color' },
        { name: 'bgColorSym', value: 'color' },
        { name: 'touch', value: 'integer' },
        { name: 'touchColor', value: 'color' },
        { name: 'touchPadding', value: 'integer' },
        { name: 'nl', value: null },
      ],
      initValue: '{ symbol: x: integer y: integer bit: N bits: N-M bitOut: N touchType: 1|2|3 width: integer height: integer padding: integer color: color bgColor: color text: string family: mono|sans|serif size: integer weight: normal|bold|italic|boldItalic : }',
      pins: [],
      pouts: [],
      returns: null,
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
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
    if (property === 'out') {
      const outW = ClcdComponent.touchOutWidthFromSymbols(comp.clcdSymbols || []);
      let val = comp.touchOutValue || null;
      if (val === null && comp.touchOutRef && comp.touchOutRef !== '&-') {
        val = ctx.getValueFromRef(comp.touchOutRef);
      }
      if (val === null || val === undefined) val = '0'.repeat(outW);
      if (val.length < outW) val = val.padStart(outW, '0');
      else if (val.length > outW) val = val.substring(val.length - outW);
      const br = this.handleBitRange(a, val, a.var, 'out', ctx);
      if (br) return br;
      return { value: val, ref: comp.touchOutRef || null, varName: `${a.var}:out`, bitWidth: outW };
    }
    return null;
  }

  _publishTouchOut(comp, compName, value, ctx) {
    const outW = ClcdComponent.touchOutWidthFromSymbols(comp.clcdSymbols || []);
    if (outW === 0) return;
    let v = value;
    if (v.length < outW) v = v.padStart(outW, '0');
    else if (v.length > outW) v = v.substring(v.length - outW);
    comp.touchOutValue = v;
    if (comp.touchOutRef && comp.touchOutRef !== '&-') {
      ctx.setValueAtRef(comp.touchOutRef, v);
    }
    if (typeof ctx.scheduleTouchOutChange === 'function') {
      ctx.scheduleTouchOutChange(compName);
    } else {
      ctx.updateComponentConnections(compName);
      if (typeof ctx._emitComputedComponentProbes === 'function') {
        ctx._emitComputedComponentProbes(compName);
      }
      if (typeof showVars === 'function') showVars();
    }
  }

  _applyTouchPress(comp, compName, hitSymbols, ctx) {
    const outW = ClcdComponent.touchOutWidthFromSymbols(comp.clcdSymbols || []);
    if (outW === 0 || !hitSymbols || hitSymbols.length === 0) return;

    if (!comp.touchLatchState) comp.touchLatchState = '0'.repeat(outW);
    if (!comp.activeTouchPress) comp.activeTouchPress = new Set();

    const pulseIndices = [];

    for (const sym of hitSymbols) {
      if (sym.bitOut === undefined) continue;
      const idx = sym.bitOut;
      const tt = sym.touchType || 1;
      if (tt === 1) {
        comp.activeTouchPress.add(idx);
      } else if (tt === 2) {
        comp.activeTouchPress.add(idx);
        pulseIndices.push(idx);
      } else if (tt === 3) {
        const bit = comp.touchLatchState[idx] === '1' ? '0' : '1';
        comp.touchLatchState = ClcdComponent._setBit(comp.touchLatchState, idx, bit);
      }
    }

    const out = ClcdComponent._composeTouchOut(comp, outW);
    this._publishTouchOut(comp, compName, out, ctx);

    if (pulseIndices.length > 0) {
      const self = this;
      const releasePulse = () => {
        for (const idx of pulseIndices) comp.activeTouchPress.delete(idx);
        const cleared = ClcdComponent._composeTouchOut(comp, outW);
        self._publishTouchOut(comp, compName, cleared, ctx);
      };
      if (typeof ctx.runSafely === 'function') {
        ctx.runSafely(releasePulse);
      } else {
        releasePulse();
      }
    }
  }

  _applyTouchRelease(comp, compName, hitSymbols, ctx) {
    const outW = ClcdComponent.touchOutWidthFromSymbols(comp.clcdSymbols || []);
    if (outW === 0 || !comp.activeTouchPress) return;

    for (const sym of hitSymbols || []) {
      if (sym.bitOut === undefined) continue;
      if ((sym.touchType || 1) === 1) {
        comp.activeTouchPress.delete(sym.bitOut);
      }
    }

    const out = ClcdComponent._composeTouchOut(comp, outW);
    this._publishTouchOut(comp, compName, out, ctx);
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'touchReset') return false;
    const outW = ClcdComponent.touchOutWidthFromSymbols(comp.clcdSymbols || []);
    if (outW === 0) return false;

    let mask = String(value);
    if (mask.length < outW) mask = mask.padStart(outW, '0');
    else if (mask.length > outW) mask = mask.substring(mask.length - outW);

    if (!comp.touchLatchState) comp.touchLatchState = '0'.repeat(outW);
    if (!comp.activeTouchPress) comp.activeTouchPress = new Set();

    for (let i = 0; i < outW; i++) {
      if (mask[i] === '1') {
        comp.touchLatchState = ClcdComponent._setBit(comp.touchLatchState, i, '0');
        comp.activeTouchPress.delete(i);
      }
    }

    const compName = comp.name;
    const out = ClcdComponent._composeTouchOut(comp, outW);
    this._publishTouchOut(comp, compName, out, ctx);
    return true;
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {
    const rawSymbols = (initialValue && initialValue.kind === 'clcdSymbols')
      ? initialValue.symbols
      : (attributes.clcdSymbols || []);
    const defaultColor = attributes.color;
    const defaultSymBgColor = ClcdComponent.defaultSymbolBgColor(attributes);
    const symbols = ClcdComponent.resolveSymbols(rawSymbols, defaultColor, defaultSymBgColor);
    ClcdComponent.validateContiguousBits(symbols);
    ClcdComponent.validateContiguousBitOut(symbols);
    compInfo.clcdSymbols = symbols;
    compInfo.lastValue = '0'.repeat(bits);
    const outW = ClcdComponent.touchOutWidthFromSymbols(symbols);
    if (outW > 0) {
      compInfo.touchLatchState = '0'.repeat(outW);
      compInfo.touchOutValue = '0'.repeat(outW);
      compInfo.activeTouchPress = new Set();
    }
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
    const touch = parseInt(attributes.touch, 10) === 1;
    const touchColor = attributes.touchColor !== undefined
      ? ClcdComponent.normalizeColor(attributes.touchColor, null)
      : null;
    const touchDefaults = ClcdComponent.touchDefaultsFromAttributes(attributes);
    const rawSymbols = (initialValue && initialValue.kind === 'clcdSymbols')
      ? initialValue.symbols
      : (attributes.clcdSymbols || []);
    const symbols = ClcdComponent.resolveSymbols(rawSymbols, defaultColor, ClcdComponent.defaultSymbolBgColor(attributes));
    const initialBits = '0'.repeat(bits);
    const storageIdx = ctx.storeValue(initialBits);
    const clcdRef = `&${storageIdx}`;
    const clcdId = baseId;

    const outW = ClcdComponent.touchOutWidthFromSymbols(symbols);
    let touchOutRef = null;
    if (outW > 0) {
      const touchOutIdx = ctx.storeValue('0'.repeat(outW));
      touchOutRef = `&${touchOutIdx}`;
    }

    const self = this;
    const onPress = (px, py) => {
      if (!touch) return;
      const comp = ctx.components.get(name);
      if (!comp) return;
      const hits = ClcdComponent.hitTestAt(comp.clcdSymbols || symbols, px, py, touchDefaults, true);
      comp._lastTouchHits = hits;
      ctx.clog('onPress');
      self._applyTouchPress(comp, name, hits, ctx);
      ctx.showlog(1);
    };

    const onRelease = (px, py) => {
      if (!touch) return;
      const comp = ctx.components.get(name);
      if (!comp) return;
      const hits = comp._lastTouchHits || ClcdComponent.hitTestAt(comp.clcdSymbols || symbols, px, py, touchDefaults, true);
      ctx.clog('onRelease');
      self._applyTouchRelease(comp, name, hits, ctx);
      ctx.showlog(1);
    };

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
        touch,
        touchColor,
        touchDefaults,
        onPress,
        onRelease,
      });
    }

    return {
      deviceIds: [clcdId],
      ref: clcdRef,
      touchOutRef,
      touchOutValue: outW > 0 ? '0'.repeat(outW) : undefined,
      touchLatchState: outW > 0 ? '0'.repeat(outW) : undefined,
      activeTouchPress: outW > 0 ? new Set() : undefined,
      clcdSymbols: symbols,
      touchHandler: { onPress, onRelease, touchDefaults, symbols, touch },
    };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.touchReset !== undefined) {
      const resetValue = this.reEvalPendingValue(pending, 'touchReset', reEvaluate, ctx);
      this.handleImmediateAssignment(comp, 'touchReset', resetValue, ctx);
    }
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
