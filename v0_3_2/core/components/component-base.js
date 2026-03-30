var ComponentBase = class ComponentBase {
  static get type() { throw new Error('ComponentBase.type must be implemented'); }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) { throw new Error('getWidthBits must be implemented'); }

  getSupportedProperties() { return []; }

  getRedirectProperties() { return []; }

  getSpecialParseAttributes() { return null; }

  reEvalPendingValue(pending, propName, reEvaluate, ctx) {
    if (!pending || pending[propName] === undefined) return undefined;
    let value = pending[propName].value;
    if (reEvaluate && pending[propName].expr) {
      const exprResult = ctx.evalExpr(pending[propName].expr, false);
      value = '';
      for (const part of exprResult) {
        if (part.value && part.value !== '-') value += part.value;
        else if (part.ref && part.ref !== '&-') {
          const val = ctx.getValueFromRef(part.ref);
          if (val) value += val;
        }
      }
      pending[propName].value = value;
    }
    return value;
  }

  handleBitRange(a, val, varName, property, ctx) {
    if (!a.bitRange) return null;
    const { start, end: actualEnd } = ctx.resolveBitRange(a.bitRange);
    if (start < 0 || actualEnd >= val.length || start > actualEnd) {
      throw Error(`Invalid bit range ${start}-${actualEnd} for ${varName}:${property} (length: ${val.length})`);
    }
    const extracted = val.substring(start, actualEnd + 1);
    const bitWidth = actualEnd - start + 1;
    const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
    return { value: extracted, ref: null, varName: `${varName}:${property}.${varNameSuffix}`, bitWidth };
  }

  padOrTruncate(value, depth) {
    if (value.length < depth) return value.padStart(depth, '0');
    if (value.length > depth) return value.substring(0, depth);
    return value;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentBase;
}
