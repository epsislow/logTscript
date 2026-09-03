var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function _isActive(value) {
  return value === '1' || (value && value[value.length - 1] === '1');
}

var StackComponent = class StackComponent extends BuiltinComponent {
  static get type() { return 'stack'; }
  static get shortnames() { return { lifo: 'stack' }; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['width'] !== undefined ? parseInt(attributes['width'], 10) : 8;
  }

  _length(attributes) {
    return attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 64;
  }

  _sizeWidth(length) {
    if (typeof bitIndexWidth === 'function') return bitIndexWidth(length + 1);
    return length <= 1 ? 1 : 32 - Math.clz32(length);
  }

  getSupportedProperties() {
    return ['get', 'top', 'empty', 'full', 'size', 'capacity', 'free'];
  }

  getRedirectProperties() {
    return ['get', 'top', 'empty', 'full', 'size', 'capacity', 'free'];
  }

  getDef() {
    return {
      attrs: [{ name: 'width', value: 'integer' }, { name: 'length', value: 'integer' }],
      initValue: null,
      pins: [
        { bits: '1', name: 'set' },
        { bits: 'X', name: 'push' },
        { bits: '1', name: 'pop' },
        { bits: '1', name: 'clear' },
      ],
      pouts: [
        { bits: 'X', name: 'get' },
        { bits: 'X', name: 'top' },
        { bits: '1', name: 'empty' },
        { bits: '1', name: 'full' },
        { bits: 'X', name: 'size' },
        { bits: 'X', name: 'capacity' },
        { bits: 'X', name: 'free' },
      ],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    const id = comp.deviceIds[0];
    const width = this.getWidthBits(comp.attributes);
    const length = this._length(comp.attributes);
    const sw = this._sizeWidth(length);
    let val = null;
    let bitWidth = width;

    switch (property) {
      case 'get':
      case 'top':
        val = typeof queuePeek === 'function' ? queuePeek(id) : '0'.repeat(width);
        break;
      case 'empty':
        val = typeof queueIsEmpty === 'function' ? queueIsEmpty(id) : '1';
        bitWidth = 1;
        break;
      case 'full':
        val = typeof queueIsFull === 'function' ? queueIsFull(id) : '0';
        bitWidth = 1;
        break;
      case 'size': {
        const n = typeof queueGetSize === 'function' ? queueGetSize(id) : 0;
        val = n.toString(2).padStart(sw, '0');
        bitWidth = sw;
        break;
      }
      case 'capacity':
        val = length.toString(2).padStart(sw, '0');
        bitWidth = sw;
        break;
      case 'free': {
        const n = typeof queueGetSize === 'function' ? queueGetSize(id) : 0;
        val = (length - n).toString(2).padStart(sw, '0');
        bitWidth = sw;
        break;
      }
      default:
        return null;
    }

    const br = this.handleBitRange(a, val, a.var, property, ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const width = this.getWidthBits(attributes);
    const length = this._length(attributes);
    if (width <= 0) throw Error(`Stack width must be positive for component ${name}`);
    if (length <= 0) throw Error(`Stack length must be positive for component ${name}`);
    const storageId = baseId;
    if (typeof addQueueStorage === 'function') {
      addQueueStorage({ id: storageId, width, length, mode: 'lifo' });
    }
    return { deviceIds: [storageId], ref: null };
  }

  getForbidDirectAssign() {
    return 'Cannot assign a value to a stack component. Use :push, :pop, :clear, and :set properties instead.';
  }

  _applyStackOps(id, width, pending, reEvaluate, ctx) {
    const pushInBlock = pending.push !== undefined;
    const popActive = pending.pop !== undefined
      && _isActive(this.reEvalPendingValue(pending, 'pop', reEvaluate, ctx));
    const clearActive = pending.clear !== undefined
      && _isActive(this.reEvalPendingValue(pending, 'clear', reEvaluate, ctx));

    if (pushInBlock && popActive) {
      throw Error('Conflicting stack operations');
    }
    if (pushInBlock && popActive && clearActive) {
      throw Error('Conflicting stack operations');
    }

    if (clearActive && popActive) {
      if (typeof queuePop === 'function') queuePop(id);
      if (typeof queueClear === 'function') queueClear(id);
    } else if (clearActive && pushInBlock) {
      if (typeof queueClear === 'function') queueClear(id);
      let pushValue = this.reEvalPendingValue(pending, 'push', reEvaluate, ctx);
      if (pushValue.length !== width) throw Error('push value width mismatch');
      if (typeof queuePush === 'function') queuePush(id, pushValue);
    } else if (clearActive) {
      if (typeof queueClear === 'function') queueClear(id);
    } else if (popActive) {
      if (typeof queuePop === 'function') queuePop(id);
    } else if (pushInBlock) {
      const pushValue = this.reEvalPendingValue(pending, 'push', reEvaluate, ctx);
      if (pushValue.length !== width) throw Error('push value width mismatch');
      if (typeof queuePush === 'function') queuePush(id, pushValue);
    }
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending || when !== 'immediate') return;
    if (pending.set === undefined) return;
    const setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!_isActive(setValue)) return;

    const id = comp.deviceIds[0];
    const width = this.getWidthBits(comp.attributes);
    this._applyStackOps(id, width, pending, reEvaluate, ctx);

    if (!reEvaluate) {
      delete pending.push;
      delete pending.pop;
      delete pending.clear;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = StackComponent; }
