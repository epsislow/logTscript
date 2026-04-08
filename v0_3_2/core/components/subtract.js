var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var SubtractComponent = class SubtractComponent extends BuiltinComponent {
  static get type() { return 'subtract'; }
  static get shortnames() { return { '-': 'subtract' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get', 'carry']; }
  getRedirectProperties() { return ['get', 'carry']; }

  getDef() {
    return {
      attrs: [{ name: 'depth', value: 'integer' }],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }, { bits: 'X', name: 'a' }, { bits: 'X', name: 'b' }],
      pouts: [{ bits: 'X', name: 'get' }, { bits: '1', name: 'carry' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      const subtractId = comp.deviceIds[0];
      let val = null;
      if (typeof getSubtract === 'function') val = getSubtract(subtractId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
    }
    if (property === 'carry') {
      const subtractId = comp.deviceIds[0];
      let val = null;
      if (typeof getSubtractCarry === 'function') val = getSubtractCarry(subtractId);
      if (val === null || val === undefined) val = '0';
      return { value: val, ref: null, varName: `${a.var}:carry`, bitWidth: 1 };
    }
    return null;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    if (depth <= 0) throw Error(`Subtract depth must be positive for component ${name}`);
    const subtractId = baseId;
    if (typeof addSubtract === 'function') addSubtract({ id: subtractId, depth });
    return { deviceIds: [subtractId], ref: null };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'a' && property !== 'b') return false;
    const subtractId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    let binValue = this.padOrTruncate(value, depth);
    if (property === 'a' && typeof setSubtractA === 'function') setSubtractA(subtractId, binValue);
    else if (property === 'b' && typeof setSubtractB === 'function') setSubtractB(subtractId, binValue);
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const subtractId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.a !== undefined) {
          let aValue = this.reEvalPendingValue(pending, 'a', reEvaluate, ctx);
          aValue = this.padOrTruncate(aValue, depth);
          if (typeof setSubtractA === 'function') setSubtractA(subtractId, aValue);
        }
        if (pending.b !== undefined) {
          let bValue = this.reEvalPendingValue(pending, 'b', reEvaluate, ctx);
          bValue = this.padOrTruncate(bValue, depth);
          if (typeof setSubtractB === 'function') setSubtractB(subtractId, bValue);
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SubtractComponent; }
