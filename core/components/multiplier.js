var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var MultiplierComponent = class MultiplierComponent extends BuiltinComponent {
  static get type() { return 'multiplier'; }
  static get shortnames() { return { '*': 'multiplier' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get', 'over']; }
  getRedirectProperties() { return ['get', 'over']; }

  getDef() {
    return {
      attrs: [{ name: 'depth', value: 'integer' }],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }, { bits: 'X', name: 'a' }, { bits: 'X', name: 'b' }],
      pouts: [{ bits: 'X', name: 'get' }, { bits: 'X', name: 'over' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      const multiplierId = comp.deviceIds[0];
      let val = null;
      if (typeof getMultiplier === 'function') val = getMultiplier(multiplierId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
    }
    if (property === 'over') {
      const multiplierId = comp.deviceIds[0];
      let val = null;
      if (typeof getMultiplierOver === 'function') val = getMultiplierOver(multiplierId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'over', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:over`, bitWidth: depth };
    }
    return null;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    if (depth <= 0) throw Error(`Multiplier depth must be positive for component ${name}`);
    const multiplierId = baseId;
    if (typeof addMultiplier === 'function') addMultiplier({ id: multiplierId, depth });
    return { deviceIds: [multiplierId], ref: null };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'a' && property !== 'b') return false;
    const multiplierId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    let binValue = this.padOrTruncate(value, depth);
    if (property === 'a' && typeof setMultiplierA === 'function') setMultiplierA(multiplierId, binValue);
    else if (property === 'b' && typeof setMultiplierB === 'function') setMultiplierB(multiplierId, binValue);
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const multiplierId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.a !== undefined) {
          let aValue = this.reEvalPendingValue(pending, 'a', reEvaluate, ctx);
          aValue = this.padOrTruncate(aValue, depth);
          if (typeof setMultiplierA === 'function') setMultiplierA(multiplierId, aValue);
        }
        if (pending.b !== undefined) {
          let bValue = this.reEvalPendingValue(pending, 'b', reEvaluate, ctx);
          bValue = this.padOrTruncate(bValue, depth);
          if (typeof setMultiplierB === 'function') setMultiplierB(multiplierId, bValue);
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = MultiplierComponent; }
