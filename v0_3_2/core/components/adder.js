var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var AdderComponent = class AdderComponent extends BuiltinComponent {
  static get type() { return 'adder'; }
  static get shortnames() { return { '+': 'adder' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get', 'carry']; }
  getRedirectProperties() { return ['get', 'carry']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      const adderId = comp.deviceIds[0];
      let val = null;
      if (typeof getAdder === 'function') val = getAdder(adderId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
    }
    if (property === 'carry') {
      const adderId = comp.deviceIds[0];
      let val = null;
      if (typeof getAdderCarry === 'function') val = getAdderCarry(adderId);
      if (val === null || val === undefined) val = '0';
      return { value: val, ref: null, varName: `${a.var}:carry`, bitWidth: 1 };
    }
    return null;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    if (depth <= 0) throw Error(`Adder depth must be positive for component ${name}`);
    const adderId = baseId;
    if (typeof addAdder === 'function') addAdder({ id: adderId, depth });
    return { deviceIds: [adderId], ref: null };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'a' && property !== 'b') return false;
    const adderId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    let binValue = this.padOrTruncate(value, depth);
    if (property === 'a' && typeof setAdderA === 'function') setAdderA(adderId, binValue);
    else if (property === 'b' && typeof setAdderB === 'function') setAdderB(adderId, binValue);
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const adderId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.a !== undefined) {
          let aValue = this.reEvalPendingValue(pending, 'a', reEvaluate, ctx);
          aValue = this.padOrTruncate(aValue, depth);
          if (typeof setAdderA === 'function') setAdderA(adderId, aValue);
        }
        if (pending.b !== undefined) {
          let bValue = this.reEvalPendingValue(pending, 'b', reEvaluate, ctx);
          bValue = this.padOrTruncate(bValue, depth);
          if (typeof setAdderB === 'function') setAdderB(adderId, bValue);
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdderComponent; }
