var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var CounterComponent = class CounterComponent extends BuiltinComponent {
  static get type() { return 'counter'; }
  static get shortnames() { return { '=': 'counter' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [{ name: 'depth', value: 'integer' }],
      initValue: null,
      pins: [{ bits: '1', name: 'set' }, { bits: '1', name: 'write' }, { bits: 'X', name: 'data' }, { bits: '1', name: 'dir' }],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    const counterId = comp.deviceIds[0];
    let val = null;
    if (typeof getCounter === 'function') val = getCounter(counterId);
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (val === null || val === undefined) val = comp.initialValue || '0'.repeat(depth);
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    const defaultValue = initialValue || '0'.repeat(depth);
    if (defaultValue.length !== depth) throw Error(`Counter default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
    if (depth <= 0) throw Error(`Counter depth must be positive for component ${name}`);
    const counterId = baseId;
    if (typeof addCounter === 'function') addCounter({ id: counterId, depth, default: defaultValue });
    return { deviceIds: [counterId], ref: null };
  }

  getForbidDirectAssign() {
    return 'Cannot assign a value to a counter component. Use :dir, :data, and :set properties instead.';
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const counterId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;

    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        let shouldWrite = false;
        if (pending.write !== undefined) {
          let writeValue = this.reEvalPendingValue(pending, 'write', reEvaluate, ctx);
          shouldWrite = (writeValue === '1');
        }

        if (shouldWrite) {
          if (pending.data === undefined) throw Error(`Counter :write = 1 requires :data to be set`);
          let dataValue = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
          if (dataValue.length < depth) dataValue = dataValue.padStart(depth, '0');
          else if (dataValue.length > depth) dataValue = dataValue.substring(0, depth);
          if (typeof setCounter === 'function') setCounter(counterId, dataValue);
          if (!reEvaluate) { delete pending.write; delete pending.dir; delete pending.data; }
        } else {
          let direction = 1;
          if (pending.dir !== undefined) {
            let dirValue = this.reEvalPendingValue(pending, 'dir', reEvaluate, ctx);
            direction = parseInt(dirValue, 2);
            if (direction !== 0 && direction !== 1) throw Error(`Counter direction must be 0 (decrement) or 1 (increment), got ${dirValue}`);
          }
          let baseValue = null;
          if (typeof getCounter === 'function') {
            baseValue = getCounter(counterId);
            if (!baseValue || baseValue === comp.initialValue) baseValue = comp.initialValue || '0'.repeat(depth);
          } else {
            baseValue = comp.initialValue || '0'.repeat(depth);
          }
          let numValue = parseInt(baseValue, 2);
          const maxValue = Math.pow(2, depth) - 1;
          if (direction === 1) numValue = (numValue + 1) % (maxValue + 1);
          else numValue = (numValue - 1 + maxValue + 1) % (maxValue + 1);
          const newValue = numValue.toString(2).padStart(depth, '0');
          if (typeof setCounter === 'function') setCounter(counterId, newValue);
        }
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = CounterComponent; }
