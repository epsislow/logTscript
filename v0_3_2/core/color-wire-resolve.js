/**
 * Resolve component color attributes from wire references (one-shot at comp creation).
 */
(function (global) {
  'use strict';

  function isColorWireRef(v) {
    return v != null && typeof v === 'object' && typeof v.wireRef === 'string' && v.wireRef.length > 0;
  }

  function wireBinToCssHex(binStr, bitWidth) {
    if (binStr == null || binStr === '') {
      throw new Error('Wire color value is empty');
    }
    const s = String(binStr);
    if (/[XZxz]/.test(s)) {
      throw new Error('Wire color value contains X/Z bits');
    }
    let bin = s.replace(/[^01]/g, '');
    if (!bin.length) {
      throw new Error('Wire color value has no binary digits');
    }
    const w = bitWidth != null ? (bitWidth | 0) : bin.length;
    if (bin.length < w) bin = bin.padStart(w, '0');
    else if (bin.length > w) bin = bin.substring(bin.length - w);
    if (w > 24) bin = bin.substring(bin.length - 24);
    const hexNum = parseInt(bin, 2);
    if (!Number.isFinite(hexNum)) {
      throw new Error('Invalid wire color binary value');
    }
    let hexStr = hexNum.toString(16);
    if (hexStr.length <= 3) {
      hexStr = hexStr.padStart(3, '0');
    } else {
      hexStr = hexStr.padStart(6, '0');
    }
    return '#' + hexStr.toLowerCase();
  }

  function resolveColorWireRef(wireName, ctx, contextLabel) {
    const label = contextLabel || `attribute wire '${wireName}'`;
    const wire = ctx.wires.get(wireName);
    if (!wire) {
      throw Error(`Undefined wire '${wireName}' used in ${label}`);
    }
    const resolved = ctx.getWireEffectiveValue(wireName);
    if (resolved === null) {
      throw Error(`Wire '${wireName}' has no value yet for ${label}`);
    }
    const bits = ctx.getBitWidth(wire.type);
    return wireBinToCssHex(resolved, bits);
  }

  function resolveColorValue(val, ctx, contextLabel) {
    if (isColorWireRef(val)) {
      return resolveColorWireRef(val.wireRef, ctx, contextLabel);
    }
    return val;
  }

  function resolveColorAttributesForComp(type, attributes, ctx, registry) {
    if (!attributes || !registry) return;
    const handler = registry.get(type);
    if (!handler || typeof handler.getDef !== 'function') return;
    const def = handler.getDef();
    if (!def || !def.attrs) return;
    for (const attr of def.attrs) {
      if (attr.value !== 'color') continue;
      const name = attr.name;
      const raw = attributes[name];
      if (raw === undefined || raw === null || raw === '') continue;
      if (attr.type === 'array' && raw && typeof raw === 'object' && !isColorWireRef(raw)) {
        for (const key of Object.keys(raw)) {
          raw[key] = resolveColorValue(raw[key], ctx, `${type}.${name}.${key}`);
        }
      } else {
        attributes[name] = resolveColorValue(raw, ctx, `${type}.${name}`);
      }
    }
  }

  function resolveClcdSymbolColorRefs(symbols, ctx, compLabel) {
    if (!symbols || !Array.isArray(symbols)) return;
    const prefix = compLabel || 'clcd';
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const symName = sym.name || String(i);
      if (sym.color !== undefined && sym.color !== null && sym.color !== '') {
        sym.color = resolveColorValue(sym.color, ctx, `${prefix} symbol '${symName}' color`);
      }
      if (sym.bgColor !== undefined && sym.bgColor !== null && sym.bgColor !== '') {
        sym.bgColor = resolveColorValue(sym.bgColor, ctx, `${prefix} symbol '${symName}' bgColor`);
      }
    }
  }

  const api = {
    isColorWireRef,
    wireBinToCssHex,
    resolveColorWireRef,
    resolveColorValue,
    resolveColorAttributesForComp,
    resolveClcdSymbolColorRefs,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (typeof global !== 'undefined') {
    global.LogTScriptColorWireResolve = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.LogTScriptColorWireResolve = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
