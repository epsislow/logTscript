var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var ScannerComponent = class ScannerComponent extends BuiltinComponent {
  static get type() { return 'scanner'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  static normalizeColor(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const s = String(value).trim();
    if (s.startsWith('^')) return '#' + s.slice(1);
    if (s.startsWith('#')) return s;
    return s;
  }

  static parseIntAttr(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  /** Bits for values 0..length inclusive — Math.clz32, never Math.log2. */
  static sizeWidthBits(length) {
    const n = length + 1;
    return n <= 1 ? 1 : 32 - Math.clz32(n - 1);
  }

  static resolveConfig(attributes, name) {
    let length = ScannerComponent.parseIntAttr(attributes && attributes.length, 8);
    if (length < 1 || length > 32) {
      throw Error(`scanner length must be 1..32${name ? ` for ${name}` : ''}`);
    }
    let width = null;
    if (attributes && attributes.width !== undefined && attributes.width !== null && attributes.width !== '') {
      width = ScannerComponent.parseIntAttr(attributes.width, null);
      if (width == null || isNaN(width)) width = null;
      else {
        if (width < 4) width = 4;
        if (width > 40) width = 40;
      }
    }
    return {
      length,
      width,
      text: attributes && attributes.text !== undefined ? String(attributes.text) : '',
      color: ScannerComponent.normalizeColor(attributes && attributes.color, '#808080'),
      bgColor: ScannerComponent.normalizeColor(attributes && attributes.bgColor, '#101010'),
      focusColor: ScannerComponent.normalizeColor(attributes && attributes.focusColor, '#2ecc71'),
      focusBgColor: ScannerComponent.normalizeColor(attributes && attributes.focusBgColor, '#181818'),
      onlyDigits: !!(attributes && attributes.onlyDigits),
      nl: !!(attributes && attributes.nl),
      getBits: length * 8,
      sizeBits: ScannerComponent.sizeWidthBits(length),
    };
  }

  static packPayload(str, lengthChars) {
    let s = str == null ? '' : String(str);
    if (s.length > lengthChars) s = s.slice(0, lengthChars);
    let bin = '';
    if (typeof wireStringToBin === 'function') {
      bin = wireStringToBin(s);
    } else {
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code > 255) {
          throw new Error(`scanner character U+${code.toString(16).toUpperCase()} exceeds 8 bits`);
        }
        bin += code.toString(2).padStart(8, '0');
      }
    }
    const need = lengthChars * 8;
    if (bin.length < need) bin += '0'.repeat(need - bin.length);
    else if (bin.length > need) bin = bin.substring(0, need);
    return { bin, size: s.length };
  }

  static sizeToBin(size, sizeBits) {
    const n = Math.max(0, size | 0);
    return n.toString(2).padStart(sizeBits, '0').slice(-sizeBits);
  }

  static filterOnlyDigits(str) {
    return String(str == null ? '' : str).replace(/[^0-9]/g, '');
  }

  static propagateOutput(ctx, compName) {
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
      if (typeof showVars === 'function') showVars(ctx);
    }
    if (typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(compName);
    }
  }

  getWidthBits(attributes) {
    try {
      return ScannerComponent.resolveConfig(attributes || {}).getBits;
    } catch (_) {
      const length = ScannerComponent.parseIntAttr(attributes && attributes.length, 8);
      return Math.max(1, length) * 8;
    }
  }

  getSupportedProperties() { return ['get', 'size', 'valid']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    const cfg = ScannerComponent.resolveConfig(comp.attributes || {});
    if (property === 'get') {
      let val = null;
      if (comp.ref && comp.ref !== '&-') val = ctx.getValueFromRef(comp.ref);
      if (val === null || val === undefined) val = '0'.repeat(cfg.getBits);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: cfg.getBits };
    }
    if (property === 'size') {
      let val = '0'.repeat(cfg.sizeBits);
      if (comp.sizeRef && comp.sizeRef !== '&-') {
        val = ctx.getValueFromRef(comp.sizeRef) || val;
      }
      if (val.length < cfg.sizeBits) val = val.padStart(cfg.sizeBits, '0');
      else if (val.length > cfg.sizeBits) val = val.slice(-cfg.sizeBits);
      return { value: val, ref: null, varName: `${a.var}:size`, bitWidth: cfg.sizeBits };
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
        { name: 'length', value: 'integer' },
        { name: 'width', value: 'integer' },
        { name: 'text', value: 'string' },
        { name: 'color', value: 'string' },
        { name: 'bgColor', value: 'string' },
        { name: 'focusColor', value: 'string' },
        { name: 'focusBgColor', value: 'string' },
        { name: 'onlyDigits', value: null },
        { name: 'nl', value: null },
      ],
      initValue: null,
      pins: [],
      pouts: [
        { bits: 'X', name: 'get' },
        { bits: 'X', name: 'size' },
        { bits: '1', name: 'valid' },
      ],
      returns: null,
    };
  }

  static buildHandler(name, getRef, sizeRef, validRef, cfg, ctx) {
    const onCommit = (rawText) => {
      let text = rawText == null ? '' : String(rawText);
      if (cfg.onlyDigits) text = ScannerComponent.filterOnlyDigits(text);
      if (text.length > cfg.length) text = text.slice(0, cfg.length);
      const packed = ScannerComponent.packPayload(text, cfg.length);
      const sizeBin = ScannerComponent.sizeToBin(packed.size, cfg.sizeBits);

      ctx.clog('onScan');
      ctx.runSafely(() => {
        if (ctx.deferWirePropagation && ctx.deferWirePropagation() && typeof ctx.scheduleComponentOutputChange === 'function') {
          ctx.scheduleComponentOutputChange(name, packed.bin);
        } else {
          ctx.setValueAtRef(getRef, packed.bin);
        }
        ctx.setValueAtRef(sizeRef, sizeBin);
        ctx.setValueAtRef(validRef, '1');
        ScannerComponent.propagateOutput(ctx, name);
        ctx.runSafely(() => {
          ctx.setValueAtRef(validRef, '0');
          ScannerComponent.propagateOutput(ctx, name);
        });
      });
      ctx.showlog(1);
      return { ok: true, text, size: packed.size, bin: packed.bin };
    };
    return { onCommit };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const cfg = ScannerComponent.resolveConfig(attributes || {}, name);
    const packed = ScannerComponent.packPayload('', cfg.length);
    const getIdx = ctx.storeValue(packed.bin);
    const sizeIdx = ctx.storeValue(ScannerComponent.sizeToBin(0, cfg.sizeBits));
    const validIdx = ctx.storeValue('0');
    const getRef = `&${getIdx}`;
    const sizeRef = `&${sizeIdx}`;
    const validRef = `&${validIdx}`;

    const { onCommit } = ScannerComponent.buildHandler(
      name, getRef, sizeRef, validRef, cfg, ctx
    );

    if (typeof addScanner === 'function') {
      addScanner({
        id: baseId,
        text: cfg.text,
        length: cfg.length,
        width: cfg.width,
        color: cfg.color,
        bgColor: cfg.bgColor,
        focusColor: cfg.focusColor,
        focusBgColor: cfg.focusBgColor,
        onlyDigits: cfg.onlyDigits,
        nl: cfg.nl,
        onCommit,
      });
    }

    return {
      deviceIds: [baseId],
      ref: getRef,
      sizeRef,
      validRef,
      scannerHandler: { onCommit },
      scannerCfg: cfg,
    };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = ScannerComponent; }
