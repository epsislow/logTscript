var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function memPortPinName(port, pin) {
  if (port === 1) return pin;
  return String(port) + pin;
}

function parseMemPortProperty(name) {
  if (!name) return null;
  const m1 = /^(adr|data|write|get)$/.exec(name);
  if (m1) return { port: 1, pin: m1[1] };
  const m2 = /^([2-4])(adr|data|write|get)$/.exec(name);
  if (m2) return { port: parseInt(m2[1], 10), pin: m2[2] };
  return null;
}

function memAddrBits(length) {
  if (length <= 1) return 1;
  return Math.ceil(Math.log2(length));
}

function memGetPorts(attributes) {
  const p = attributes && attributes['ports'] !== undefined ? parseInt(attributes['ports'], 10) : 1;
  if (isNaN(p) || p < 1) return 1;
  return Math.min(4, Math.max(1, p));
}

function memIsReadonly(attributes) {
  return !!(attributes && attributes.readonly);
}

var MemComponent = class MemComponent extends BuiltinComponent {
  static get type() { return 'mem'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }

  getSupportedProperties() { return ['get', '2get', '3get', '4get']; }
  getRedirectProperties() { return ['get', '2get', '3get', '4get']; }

  supportsPropertyName(property, attributes) {
    const parsed = parseMemPortProperty(property);
    if (!parsed || parsed.pin !== 'get') return false;
    const ports = memGetPorts(attributes);
    return parsed.port >= 1 && parsed.port <= ports;
  }

  getDef(attributes) {
    const attrs = attributes || {};
    const length = attrs['length'] !== undefined ? parseInt(attrs['length'], 10) : 3;
    const depth = attrs['depth'] !== undefined ? parseInt(attrs['depth'], 10) : 4;
    const ports = memGetPorts(attrs);
    const addrBits = memAddrBits(length);
    const pins = [];
    const pouts = [];
    for (let port = 1; port <= ports; port++) {
      const prefix = port === 1 ? '' : String(port);
      pins.push({ bits: String(addrBits), name: prefix + 'adr' });
      pins.push({ bits: '1', name: prefix + 'write' });
      pins.push({ bits: String(depth), name: prefix + 'data' });
      pouts.push({ bits: String(depth), name: prefix + 'get' });
    }
    const defAttrs = [
      { name: 'length', value: 'integer' },
      { name: 'depth', value: 'integer' },
      { name: 'ports', value: 'integer' },
    ];
    if (memIsReadonly(attrs)) {
      defAttrs.push({ name: 'readonly', value: '' });
    }
    return {
      attrs: defAttrs,
      initValue: 'Xbit',
      pins,
      pouts,
      returns: 'Xbit',
    };
  }

  _resolvePendingValue(pending, propName, ctx) {
    if (!pending || pending[propName] === undefined) return null;
    let value = pending[propName].value;
    if (pending[propName].expr) {
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

  _readAddress(pending, adrPin, length, ctx) {
    let addressValue = this._resolvePendingValue(pending, adrPin, ctx);
    if (addressValue === null || addressValue === undefined) return 0;
    const currentAddress = parseInt(addressValue, 2);
    if (currentAddress < 0 || currentAddress >= length) {
      throw Error(`Memory invalid address ${currentAddress} (length: ${length} means address can be between 0 and ${length - 1})`);
    }
    return currentAddress;
  }

  evalGetProperty(comp, property, a, ctx) {
    const parsed = parseMemPortProperty(property);
    if (!parsed || parsed.pin !== 'get') return null;
    const ports = memGetPorts(comp.attributes);
    if (parsed.port < 1 || parsed.port > ports) {
      throw Error(`Memory port ${parsed.port} does not exist`);
    }
    const memId = comp.deviceIds[0];
    const pending = ctx.componentPendingProperties.get(a.var);
    const adrPin = memPortPinName(parsed.port, 'adr');
    const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 3;
    let address = 0;
    if (pending && pending[adrPin] !== undefined) {
      address = this._readAddress(pending, adrPin, length, ctx);
    }
    let val = null;
    if (typeof getMem === 'function') val = getMem(memId, address);
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    if (val === null || val === undefined) val = comp.initialValue || '0'.repeat(depth);
    const br = this.handleBitRange(a, val, a.var, property, ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth: depth };
  }

  _splitIntoChunks(value, depth, length) {
    let v = value;
    if (v.length < depth) v = v.padStart(depth, '0');
    if (v.length % depth !== 0) {
      const padded = Math.ceil(v.length / depth) * depth;
      v = v.padStart(padded, '0');
    }
    const numChunks = v.length / depth;
    if (numChunks > length) {
      throw Error(`Initializer has ${numChunks} addresses (${v.length} bits / depth ${depth}) but memory length is only ${length}`);
    }
    const chunks = [];
    for (let i = 0; i < numChunks; i++) {
      chunks.push(v.substring(i * depth, (i + 1) * depth));
    }
    return chunks;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 3;
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    const ports = memGetPorts(attributes);
    if (length <= 0 || depth <= 0) throw Error(`Memory length and depth must be positive for component ${name}`);
    if (ports < 1 || ports > 4) throw Error(`Memory ports must be between 1 and 4 for component ${name}`);
    const memId = baseId;
    const defaultValue = '0'.repeat(depth);
    if (typeof addMem === 'function') {
      addMem({ id: memId, length, depth, default: defaultValue, ports, readonly: memIsReadonly(attributes) });
    }
    let addr0Value = defaultValue;
    if (initialValue) {
      const chunks = this._splitIntoChunks(initialValue, depth, length);
      for (let i = 0; i < chunks.length; i++) {
        if (typeof setMem === 'function') setMem(memId, i, chunks[i]);
      }
      addr0Value = chunks[0] || defaultValue;
    }
    return { deviceIds: [memId], ref: null, initialValueAddr0: addr0Value };
  }

  handleDirectAssign(comp, value, ctx) {
    const memId = comp.deviceIds[0];
    const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 3;
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    const defaultValue = '0'.repeat(depth);
    const chunks = this._splitIntoChunks(value, depth, length);
    for (let i = 0; i < length; i++) {
      if (typeof setMem === 'function') setMem(memId, i, i < chunks.length ? chunks[i] : defaultValue);
    }
    comp.initialValue = chunks.length > 0 ? chunks[0] : defaultValue;
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate') return;
    if (!pending) return;
    const memId = comp.deviceIds[0];
    const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 3;
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    const ports = memGetPorts(comp.attributes);
    const readonly = memIsReadonly(comp.attributes);

    for (let port = 1; port <= ports; port++) {
      const adrPin = memPortPinName(port, 'adr');
      const writePin = memPortPinName(port, 'write');
      const dataPin = memPortPinName(port, 'data');

      let currentAddress = 0;
      if (pending[adrPin] !== undefined) {
        currentAddress = this._readAddress(pending, adrPin, length, ctx);
      }

      let shouldWrite = false;
      if (pending[writePin] !== undefined) {
        const writeValue = this.reEvalPendingValue(pending, writePin, reEvaluate, ctx);
        shouldWrite = (writeValue === '1');
      }

      if (shouldWrite) {
        if (readonly) {
          throw Error('Memory is read-only');
        }
        if (pending[dataPin] === undefined) {
          throw Error(`Memory :${writePin} = 1 requires :${dataPin} to be set`);
        }
        let dataValue = this._resolvePendingValue(pending, dataPin, ctx);
        if (dataValue.length < depth) {
          dataValue = dataValue.padStart(depth, '0');
          pending[dataPin].value = dataValue;
        } else if (dataValue.length % depth !== 0) {
          throw Error(`Memory data length (${dataValue.length}) must be divisible by depth (${depth}).`);
        }
        const numAddresses = dataValue.length / depth;
        if (currentAddress + numAddresses > length) {
          throw Error(`Memory write would exceed memory length. Starting at address ${currentAddress}, trying to write ${numAddresses} addresses, but memory length is ${length}`);
        }
        const words = [];
        for (let i = 0; i < numAddresses; i++) {
          words.push(dataValue.substring(i * depth, (i + 1) * depth));
        }
        if (typeof queueMemWrite === 'function') {
          queueMemWrite(memId, port, currentAddress, words);
        } else if (typeof setMem === 'function') {
          for (let i = 0; i < words.length; i++) {
            setMem(memId, currentAddress + i, words[i]);
          }
        }
        if (!reEvaluate) delete pending[writePin];
      }
    }

    if (!ctx.memWriteBatching && typeof commitMemWrites === 'function') {
      commitMemWrites(memId);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = MemComponent; }
