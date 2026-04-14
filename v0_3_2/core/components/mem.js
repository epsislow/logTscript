var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var MemComponent = class MemComponent extends BuiltinComponent {
  static get type() { return 'mem'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }
  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [{ name: 'length', value: 'integer' }, { name: 'depth', value: 'integer' }],
      initValue: null,
      pins: [{ bits: 'X', name: 'at' }, { bits: '1', name: 'write' }, { bits: 'X', name: 'data' }],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    const memId = comp.deviceIds[0];
    const pending = ctx.componentPendingProperties.get(a.var);
    let address = 0;
    if (pending && pending.at) {
      let addressValue = pending.at.value;
      if (pending.at.expr) {
        const exprResult = ctx.evalExpr(pending.at.expr, false);
        addressValue = '';
        for (const part of exprResult) {
          if (part.value && part.value !== '-') addressValue += part.value;
          else if (part.ref && part.ref !== '&-') {
            const val = ctx.getValueFromRef(part.ref);
            if (val) addressValue += val;
          }
        }
      }
      address = parseInt(addressValue, 2);
    }
    let val = null;
    if (typeof getMem === 'function') val = getMem(memId, address);
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (val === null || val === undefined) val = comp.initialValue || '0'.repeat(depth);
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 3;
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    let defaultValue = initialValue || '0'.repeat(depth);
    if (defaultValue.length < depth) {
      defaultValue = defaultValue.padStart(depth, '0');
    } else if (defaultValue.length > depth) {
      throw Error(`Memory default value length (${defaultValue.length}) exceeds depth (${depth}) for component ${name}`);
    }
    if (length <= 0 || depth <= 0) throw Error(`Memory length and depth must be positive for component ${name}`);
    const memId = baseId;
    if (typeof addMem === 'function') addMem({ id: memId, length, depth, default: defaultValue });
    return { deviceIds: [memId], ref: null };
  }

  getForbidDirectAssign() {
    return 'Cannot assign a value to a mem component. Use :at, :data, and :set properties instead.';
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate') return;
    if (!pending) return;
    const memId = comp.deviceIds[0];
    const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 3;
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;

    let currentAddress = 0;
    if (pending.at !== undefined) {
      let addressValue = pending.at.value;
      if (pending.at.expr) {
        const exprResult = ctx.evalExpr(pending.at.expr, false);
        addressValue = '';
        for (const part of exprResult) {
          if (part.value && part.value !== '-') addressValue += part.value;
          else if (part.ref && part.ref !== '&-') {
            const val = ctx.getValueFromRef(part.ref);
            if (val) addressValue += val;
          }
        }
        pending.at.value = addressValue;
      }
      currentAddress = parseInt(addressValue, 2);
      if (currentAddress < 0 || currentAddress >= length) {
        throw Error(`Memory invalid address ${currentAddress} (length: ${length} means address can be between 0 and ${length - 1})`);
      }
    }

    let shouldWrite = false;
    if (pending.write !== undefined) {
      let writeValue = this.reEvalPendingValue(pending, 'write', reEvaluate, ctx);
      shouldWrite = (writeValue === '1');
    }

    if (shouldWrite) {
      if (pending.data !== undefined) {
        let dataValue = pending.data.value;
        if (pending.data.expr) {
          const exprResult = ctx.evalExpr(pending.data.expr, false);
          dataValue = '';
          for (const part of exprResult) {
            if (part.value && part.value !== '-') dataValue += part.value;
            else if (part.ref && part.ref !== '&-') {
              const val = ctx.getValueFromRef(part.ref);
              if (val) dataValue += val;
            }
          }
          pending.data.value = dataValue;
        }
        if (dataValue.length < depth) {
          dataValue = dataValue.padStart(depth, '0');
          pending.data.value = dataValue;
        } else if (dataValue.length % depth !== 0) {
          throw Error(`Memory data length (${dataValue.length}) must be divisible by depth (${depth}).`);
        }
        const numAddresses = dataValue.length / depth;
        if (currentAddress + numAddresses > length) {
          throw Error(`Memory write would exceed memory length. Starting at address ${currentAddress}, trying to write ${numAddresses} addresses, but memory length is ${length}`);
        }
        for (let i = 0; i < numAddresses; i++) {
          const address = currentAddress + i;
          const value = dataValue.substring(i * depth, (i + 1) * depth);
          if (typeof setMem === 'function') setMem(memId, address, value);
        }
        if (!reEvaluate) delete pending.write;
      } else {
        throw Error(`Memory :write = 1 requires :data to be set`);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = MemComponent; }
