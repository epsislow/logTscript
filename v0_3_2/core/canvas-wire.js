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

function canvasPinBitWidth(bindType, numberFormat) {
  if (bindType === 'bool') return 1;
  if (bindType === 'text') return 256;
  const widthFn = typeof logicNumberFormatBitWidth === 'function'
    ? logicNumberFormatBitWidth : null;
  if (widthFn && numberFormat) {
    return widthFn(numberFormat, 16);
  }
  return 16;
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

function canvasPinBitsToValue(bits, pin) {
  const b = bits || '0'.repeat(pin.bits || 1);
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

function canvasBuildPinEnv(comp, pending, reEvaluate, ctx, reEvalFn) {
  const env = {};
  const storage = comp.pinStorage || {};
  for (const [pinName, pin] of Object.entries(storage)) {
    let bits;
    if (pending && pending[pinName] && reEvalFn) {
      bits = reEvalFn(pending, pinName, reEvaluate, ctx);
      if (bits.length < pin.bits) bits = bits.padStart(pin.bits, '0');
      else if (bits.length > pin.bits) bits = bits.slice(-pin.bits);
      ctx.setValueAtRef(pin.ref, bits);
    } else {
      bits = ctx.getValueFromRef(pin.ref) || '0'.repeat(pin.bits);
    }
    env[pinName] = canvasPinBitsToValue(bits, pin);
  }
  return env;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    canvasParseFormatToken,
    canvasPinBitWidth,
    canvasCollectWireRefsFromCalls,
    canvasPinBitsToValue,
    canvasBuildPinEnv,
  };
}
