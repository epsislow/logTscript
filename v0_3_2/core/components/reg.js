var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var RegComponent = class RegComponent extends BuiltinComponent {
  static get type() { return 'reg'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return false; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    const regId = comp.deviceIds[0];
    let val = null;
    if (typeof getReg === 'function') val = getReg(regId);
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (val === null || val === undefined) val = comp.initialValue || '0'.repeat(depth);
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    const defaultValue = initialValue || '0'.repeat(depth);
    if (defaultValue.length !== depth) throw Error(`Register default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
    if (depth <= 0) throw Error(`Register depth must be positive for component ${name}`);
    const regId = baseId;
    if (typeof addReg === 'function') addReg({ id: regId, depth, default: defaultValue });
    return { deviceIds: [regId], ref: null };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate') return;
    if (!pending) return;
    const regId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;

    let shouldApply = false;
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      shouldApply = (setValue === '1' || setValue[setValue.length - 1] === '1');
    }

    if (shouldApply) {
      if (pending.data !== undefined) {
        let dataValue = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
        if (dataValue.length < depth) {
          dataValue = dataValue.padStart(depth, '0');
          pending.data.value = dataValue;
        } else if (dataValue.length > depth) {
          throw Error(`Register data length (${dataValue.length}) must match depth (${depth})`);
        }
        if (typeof setReg === 'function') setReg(regId, dataValue);
        if (!reEvaluate && pending.write !== undefined) delete pending.write;
      } else {
        throw Error(`Register :set = 1 requires :data to be set`);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = RegComponent; }
