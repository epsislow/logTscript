var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var DividerComponent = class DividerComponent extends BuiltinComponent {
  static get type() { return 'divider'; }
  static get shortnames() { return { '/': 'divider' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get', 'mod']; }
  getRedirectProperties() { return ['get', 'mod']; }

  getDef() {
    return {
      attrs: [{ name: 'depth', value: 'integer' }],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }, { bits: 'X', name: 'a' }, { bits: 'X', name: 'b' }],
      pouts: [{ bits: 'X', name: 'get' }, { bits: 'X', name: 'mod' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      const dividerId = comp.deviceIds[0];
      let val = null;
      if (typeof getDivider === 'function') val = getDivider(dividerId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
    }
    if (property === 'mod') {
      const dividerId = comp.deviceIds[0];
      let val = null;
      if (typeof getDividerMod === 'function') val = getDividerMod(dividerId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'mod', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:mod`, bitWidth: depth };
    }
    return null;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    if (depth <= 0) throw Error(`Divider depth must be positive for component ${name}`);
    const dividerId = baseId;
    if (typeof addDivider === 'function') addDivider({ id: dividerId, depth });
    return { deviceIds: [dividerId], ref: null };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'a' && property !== 'b') return false;
    const dividerId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    let binValue = this.padOrTruncate(value, depth);
    if (property === 'a' && typeof setDividerA === 'function') setDividerA(dividerId, binValue);
    else if (property === 'b' && typeof setDividerB === 'function') setDividerB(dividerId, binValue);
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const dividerId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.a !== undefined) {
          let aValue = this.reEvalPendingValue(pending, 'a', reEvaluate, ctx);
          aValue = this.padOrTruncate(aValue, depth);
          if (typeof setDividerA === 'function') setDividerA(dividerId, aValue);
        }
        if (pending.b !== undefined) {
          let bValue = this.reEvalPendingValue(pending, 'b', reEvaluate, ctx);
          bValue = this.padOrTruncate(bValue, depth);
          if (typeof setDividerB === 'function') setDividerB(dividerId, bValue);
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = DividerComponent; }
