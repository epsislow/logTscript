/* ================= CANVAS WIRE ARGS (renderer pin inference) ================= */

function canvasParseFormatToken(formatToken, ctxLabel) {
  const tok = formatToken == null ? '' : String(formatToken);
  const where = ctxLabel ? `${ctxLabel}: ` : '';
  if (tok === 'ascii' || tok === 'text') {
    return { bindType: 'text', numberFormat: null };
  }
  if (tok === 'bool') {
    return { bindType: 'bool', numberFormat: null };
  }
  const parseNumFn = typeof parseLogicNumberFormatToken === 'function'
    ? parseLogicNumberFormatToken : null;
  if (parseNumFn) {
    try {
      return { bindType: 'number', numberFormat: parseNumFn(tok, where) };
    } catch (e) {
      throw e;
    }
  }
  if (/^[us](\d+|X)$/.test(tok)) {
    return { bindType: 'number', numberFormat: tok };
  }
  throw new Error(`${where}unsupported wire format '/${tok}' (use s16, u16, ascii, bool, …)`);
}

function canvasPinScalarBitWidth(bindType, numberFormat) {
  if (bindType === 'bool') return 1;
  if (bindType === 'text') return 256;
  const widthFn = typeof logicNumberFormatBitWidth === 'function'
    ? logicNumberFormatBitWidth : null;
  if (widthFn && numberFormat) {
    return widthFn(numberFormat, 16);
  }
  return 16;
}

function canvasPinBitWidth(bindType, numberFormat, vectorMeta) {
  const scalar = canvasPinScalarBitWidth(bindType, numberFormat);
  if (vectorMeta && vectorMeta.elementCount > 0) {
    const ew = vectorMeta.elementWidth || scalar;
    return ew * vectorMeta.elementCount;
  }
  return scalar;
}

function canvasCollectWireRefsFromCalls(calls) {
  const refs = [];
  const seen = new Set();
  for (const call of calls || []) {
    for (const arg of call.args || []) {
      if (!arg || arg.kind !== 'wireRef') continue;
      const key = `${arg.pinName}\0${arg.bindType}\0${arg.numberFormat || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(arg);
    }
  }
  return refs;
}

function canvasDecodeElementBits(bits, pin) {
  const b = bits || '0';
  if (pin.bindType === 'bool') {
    return b[b.length - 1] === '1' ? 1 : 0;
  }
  if (pin.bindType === 'text') {
    let s = '';
    for (let i = 0; i + 8 <= b.length; i += 8) {
      const byte = parseInt(b.substr(i, 8), 2);
      if (byte === 0) break;
      s += String.fromCharCode(byte);
    }
    return s;
  }
  if (pin.bindType === 'number') {
    const decodeFn = typeof logicDecodeNumberBits === 'function' ? logicDecodeNumberBits : null;
    if (decodeFn) return decodeFn(b, pin.numberFormat);
    const n = parseInt(b, 2);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function canvasPinBitsToValue(bits, pin) {
  if (pin.vector && pin.vector.elementCount > 0) {
    const { elementWidth, elementCount } = pin.vector;
    const b = bits || '0'.repeat(elementWidth * elementCount);
    const padded = b.length < elementWidth * elementCount
      ? b.padStart(elementWidth * elementCount, '0')
      : b.slice(-elementWidth * elementCount);
    const out = [];
    for (let i = 0; i < elementCount; i++) {
      const start = i * elementWidth;
      const slice = padded.slice(start, start + elementWidth);
      out.push(canvasDecodeElementBits(slice, pin));
    }
    return out;
  }
  const b = bits || '0'.repeat(pin.bits || 1);
  return canvasDecodeElementBits(b, pin);
}

function canvasExtractWireNameFromExpr(expr) {
  if (!expr || !expr.length) return null;
  for (const part of expr) {
    if (part.var && part.var !== '~') return part.var;
  }
  return null;
}

function canvasGetWireVectorMeta(ctx, wireName) {
  if (!ctx || !wireName) return null;
  const wire = ctx.wires && typeof ctx.wires.get === 'function'
    ? ctx.wires.get(wireName) : null;
  if (!wire) return null;
  if (typeof ctx.getWireVectorMeta === 'function') {
    return ctx.getWireVectorMeta(wire);
  }
  return wire.vector || null;
}

function canvasResizePinStorage(comp, pinName, newBits, ctx) {
  const pin = comp.pinStorage && comp.pinStorage[pinName];
  const def = comp.pinDefs && comp.pinDefs[pinName];
  if (!pin || !def) return;
  if (pin.bits === newBits) return;
  const storageIdx = ctx.storeValue('0'.repeat(newBits));
  pin.ref = `&${storageIdx}`;
  pin.bits = newBits;
  def.bits = newBits;
}

function canvasBindPinBits(comp, pinName, bits, pendingEntry, ctx) {
  const pin = comp.pinStorage[pinName];
  const def = comp.pinDefs[pinName];
  if (!pin || !def) return bits;

  const wireName = pendingEntry && pendingEntry.expr
    ? canvasExtractWireNameFromExpr(pendingEntry.expr) : null;
  const wireMeta = wireName ? canvasGetWireVectorMeta(ctx, wireName) : null;
  const wireIsVector = !!(wireMeta && wireMeta.elementCount > 0);

  if (def.vectorRequired && !wireIsVector) {
    throw new Error(`canvas: pin '${pinName}' requires vector wire${wireName ? ` (got scalar for '${wireName}')` : ''}`);
  }
  if (!def.vectorRequired && wireIsVector) {
    throw new Error(`canvas: pin '${pinName}' requires scalar wire${wireName ? ` (got vector for '${wireName}')` : ''}`);
  }

  if (wireIsVector) {
    const elementWidth = wireMeta.elementWidth || canvasPinScalarBitWidth(def.bindType, def.numberFormat);
    const elementCount = wireMeta.elementCount;
    const needBits = elementWidth * elementCount;
    const vector = { elementWidth, elementCount };
    def.vector = vector;
    pin.vector = vector;
    canvasResizePinStorage(comp, pinName, needBits, ctx);
  } else {
    def.vector = null;
    pin.vector = null;
    const scalarBits = canvasPinScalarBitWidth(def.bindType, def.numberFormat);
    if (pin.bits !== scalarBits) {
      canvasResizePinStorage(comp, pinName, scalarBits, ctx);
    }
  }

  const pinNow = comp.pinStorage[pinName];
  let b = bits || '0'.repeat(pinNow.bits);
  if (b.length < pinNow.bits) b = b.padStart(pinNow.bits, '0');
  else if (b.length > pinNow.bits) b = b.slice(-pinNow.bits);
  ctx.setValueAtRef(pinNow.ref, b);
  return b;
}

function canvasBuildPinEnv(comp, pending, reEvaluate, ctx, reEvalFn) {
  const env = {};
  const storage = comp.pinStorage || {};
  for (const [pinName, pin] of Object.entries(storage)) {
    let bits;
    if (pending && pending[pinName] && reEvalFn) {
      bits = reEvalFn(pending, pinName, reEvaluate, ctx);
      bits = canvasBindPinBits(comp, pinName, bits, pending[pinName], ctx);
    } else {
      bits = ctx.getValueFromRef(pin.ref) || '0'.repeat(pin.bits);
    }
    const pinNow = comp.pinStorage[pinName];
    env[pinName] = canvasPinBitsToValue(bits, pinNow);
  }
  return env;
}

function canvasAlignPinsFromRendererCalls(comp, calls, methods, compName) {
  if (!comp || !comp.pinDefs) return;
  for (const call of calls || []) {
    const method = methods && methods[call.name];
    if (!method) continue;
    for (let i = 0; i < (call.args || []).length; i++) {
      const arg = call.args[i];
      if (!arg || arg.kind !== 'wireRef') continue;
      const param = method.params[i];
      const vectorRequired = !!(param && param.vector);
      const def = comp.pinDefs[arg.pinName];
      if (!def) continue;
      if (def.vectorRequired != null && def.vectorRequired !== vectorRequired) {
        throw new Error(`canvas ${compName}: pin '${arg.pinName}' vector/scalar mismatch for method '${call.name}'`);
      }
      def.vectorRequired = vectorRequired;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    canvasParseFormatToken,
    canvasPinBitWidth,
    canvasPinScalarBitWidth,
    canvasCollectWireRefsFromCalls,
    canvasPinBitsToValue,
    canvasBuildPinEnv,
    canvasAlignPinsFromRendererCalls,
    canvasBindPinBits,
    canvasGetWireVectorMeta,
  };
}
