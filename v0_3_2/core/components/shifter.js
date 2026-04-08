var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var ShifterComponent = class ShifterComponent extends BuiltinComponent {
  static get type() { return 'shifter'; }
  static get shortnames() { return { '>': 'shifter' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get', 'out']; }
  getRedirectProperties() { return ['get', 'out']; }

  getDef() {
    return {
      attrs: [{ name: 'depth', value: 'integer' }, { name: 'circular', value: null }],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }, { bits: 'X', name: 'value' }, { bits: '1', name: 'dir' }, { bits: '1', name: 'in' }],
      pouts: [{ bits: 'X', name: 'get' }, { bits: '1', name: 'out' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      const shifterId = comp.deviceIds[0];
      let val = null;
      if (typeof getShifter === 'function') val = getShifter(shifterId);
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
    }
    if (property === 'out') {
      const shifterId = comp.deviceIds[0];
      let val = null;
      if (typeof getShifterOut === 'function') val = getShifterOut(shifterId);
      if (val === null || val === undefined) val = '0';
      return { value: val, ref: null, varName: `${a.var}:out`, bitWidth: 1 };
    }
    return null;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    const circular = attributes['circular'] !== undefined;
    if (depth <= 0) throw Error(`Shifter depth must be positive for component ${name}`);
    const shifterId = baseId;
    if (typeof addShifter === 'function') addShifter({ id: shifterId, depth, circular });
    return { deviceIds: [shifterId], ref: null };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'value' && property !== 'dir' && property !== 'in') return false;
    const shifterId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (property === 'value') {
      let binValue = this.padOrTruncate(value, depth);
      if (typeof setShifterValue === 'function') setShifterValue(shifterId, binValue);
    } else if (property === 'dir') {
      const dirValue = parseInt(value, 2);
      if (typeof setShifterDir === 'function') setShifterDir(shifterId, dirValue);
    } else if (property === 'in') {
      const inValue = value.length > 0 ? value[value.length - 1] : '0';
      if (typeof setShifterIn === 'function') setShifterIn(shifterId, inValue);
    }
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    const shifterId = comp.deviceIds[0];
    if (pending) {
      if (pending.dir !== undefined) {
        let dirValue = this.reEvalPendingValue(pending, 'dir', reEvaluate, ctx);
        let direction = parseInt(dirValue, 2);
        if (direction !== 0 && direction !== 1) throw Error(`Shifter direction must be 0 (left) or 1 (right), got ${dirValue}`);
        if (typeof setShifterDir === 'function') setShifterDir(shifterId, direction);
      }
      if (pending.value !== undefined) {
        let valueStr = this.reEvalPendingValue(pending, 'value', reEvaluate, ctx);
        const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
        let binValue = this.padOrTruncate(valueStr, depth);
        if (typeof setShifterValue === 'function') setShifterValue(shifterId, binValue);
      }
      if (pending.in !== undefined) {
        let inStr = this.reEvalPendingValue(pending, 'in', reEvaluate, ctx);
        const inValue = inStr.length > 0 ? inStr[inStr.length - 1] : '0';
        if (typeof setShifterIn === 'function') setShifterIn(shifterId, inValue);
      }
    }
    if (typeof shiftShifter === 'function') shiftShifter(shifterId);
    if (!pending) ctx.componentPendingProperties.set(compName, {});
    const updatedPending = ctx.componentPendingProperties.get(compName);
    if (typeof getShifter === 'function') {
      const newValue = getShifter(shifterId);
      if (newValue !== null) {
        updatedPending.value = { expr: null, value: newValue };
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = ShifterComponent; }
