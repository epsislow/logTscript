var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var MotorComponent = class MotorComponent extends BuiltinComponent {
  static get type() { return 'motor'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  static get KINDS() {
    return { rotor: 1, fan: 1, pump: 1 };
  }

  static parseIntAttr(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  static resolveKind(attributes) {
    const kind = attributes.kind !== undefined ? String(attributes.kind) : 'rotor';
    if (!MotorComponent.KINDS[kind]) {
      throw Error(`Unknown motor kind '${kind}'`);
    }
    return kind;
  }

  static resolveConfig(attributes, name) {
    const kind = MotorComponent.resolveKind(attributes || {});
    let length = MotorComponent.parseIntAttr(attributes && attributes.length, 1);
    if (isNaN(length) || length < 1 || length > 8) {
      throw Error(`motor length must be 1..8${name ? ` for ${name}` : ''}`);
    }
    let size = MotorComponent.parseIntAttr(attributes && attributes.size, 10);
    if (size < 1) size = 1;
    if (size > 20) size = 20;
    let rate = MotorComponent.parseIntAttr(attributes && attributes.rate, 10);
    if (rate < 1) rate = 1;
    if (rate > 100) rate = 100;
    let rotate = MotorComponent.parseIntAttr(attributes && attributes.rotate, 0);
    if (rotate !== 0 && rotate !== 90 && rotate !== 180 && rotate !== 270) {
      throw Error(`motor rotate must be 0|90|180|270${name ? ` for ${name}` : ''}`);
    }
    return {
      kind,
      length,
      text: attributes && attributes.text !== undefined ? String(attributes.text) : '',
      color: (attributes && attributes.color) || '#6dff9c',
      size,
      rate,
      rotate,
      flip: !!(attributes && attributes.flip),
      reversed: !!(attributes && attributes.reversed),
      nl: !!(attributes && attributes.nl),
    };
  }

  static binToUnsigned(bin) {
    if (bin == null || bin === '') return 0;
    const s = String(bin).replace(/[^01]/g, '');
    if (!s) return 0;
    return parseInt(s, 2) || 0;
  }

  static normalizeBin(value, bits) {
    let v = value == null ? '' : String(value);
    v = v.replace(/[^01XZ]/gi, '');
    if (v.length < bits) v = v.padStart(bits, '0');
    else if (v.length > bits) v = v.substring(v.length - bits);
    return v;
  }

  /** Animation period (seconds) from stored speed and rate (integer tenths). */
  static animationPeriod(speed, length, rate) {
    const vmax = length <= 1 ? 1 : ((1 << length) - 1);
    const v = Math.max(0, Math.min(vmax, speed | 0));
    const factor = Math.max(0.1, Math.min(10, (rate || 10) / 10));
    if (v === 0) return null;
    let base;
    if (length <= 1) {
      base = 1.0;
    } else if (vmax <= 1) {
      base = 1.0;
    } else {
      const T_slow = 2.0;
      const T_fast = 0.15;
      const t = (v - 1) / (vmax - 1);
      base = T_slow - (T_slow - T_fast) * t;
    }
    const period = base / factor;
    return Math.max(0.08, period);
  }

  getSpecialParseAttributes() {
    return { literalAttrs: ['kind'] };
  }

  getWidthBits(attributes) {
    try {
      return MotorComponent.resolveConfig(attributes || {}).length;
    } catch (_) {
      const n = attributes && attributes.length !== undefined
        ? parseInt(attributes.length, 10)
        : 1;
      return isNaN(n) ? 1 : n;
    }
  }

  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = null;
    if (comp.ref && comp.ref !== '&-') {
      val = ctx.getValueFromRef(comp.ref);
    }
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    if (val === null || val === undefined) {
      val = comp.initialValue || '0'.repeat(bits);
    }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const cfg = MotorComponent.resolveConfig(attributes || {}, name);
    const value = MotorComponent.normalizeBin(initialValue || '0'.repeat(cfg.length), cfg.length);
    const speed = MotorComponent.binToUnsigned(value);

    if (typeof addMotor === 'function') {
      addMotor({
        id: baseId,
        kind: cfg.kind,
        text: cfg.text,
        color: cfg.color,
        size: cfg.size,
        rate: cfg.rate,
        rotate: cfg.rotate,
        flip: cfg.flip,
        reversed: cfg.reversed,
        length: cfg.length,
        speed,
        dir: 0,
        nl: cfg.nl,
      });
    }

    const storageIdx = ctx.storeValue(value);
    return { deviceIds: [baseId], ref: `&${storageIdx}` };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set === undefined) return;
    let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!(setValue === '1' || setValue[setValue.length - 1] === '1')) return;

    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    let changed = false;
    let motorValue = null;

    if (pending.value !== undefined) {
      motorValue = this.reEvalPendingValue(pending, 'value', reEvaluate, ctx);
      motorValue = MotorComponent.normalizeBin(motorValue, bits);
      if (comp.ref) {
        ctx.setValueAtRef(comp.ref, motorValue);
      } else {
        const storageIdx = ctx.storeValue(motorValue);
        comp.ref = `&${storageIdx}`;
      }
      changed = true;
    }

    let dirBit = null;
    if (pending.dir !== undefined) {
      let dirVal = this.reEvalPendingValue(pending, 'dir', reEvaluate, ctx);
      dirBit = (dirVal === '1' || (dirVal && dirVal[dirVal.length - 1] === '1')) ? 1 : 0;
      changed = true;
    }

    if (!changed) return;

    if (motorValue === null && comp.ref) {
      motorValue = ctx.getValueFromRef(comp.ref);
    }
    if (motorValue === null) {
      motorValue = '0'.repeat(bits);
    }

    const speed = MotorComponent.binToUnsigned(motorValue);
    const id = comp.deviceIds && comp.deviceIds[0];
    if (id && typeof setMotor === 'function') {
      const opts = { speed };
      if (dirBit !== null) opts.dir = dirBit;
      setMotor(id, opts);
    }
  }

  getDef() {
    return {
      attrs: [
        { name: 'kind', value: 'string' },
        { name: 'length', value: 'integer' },
        { name: 'text', value: 'string' },
        { name: 'color', value: 'string' },
        { name: 'size', value: 'integer' },
        { name: 'rate', value: 'integer' },
        { name: 'rotate', value: 'integer' },
        { name: 'flip', value: null },
        { name: 'reversed', value: null },
        { name: 'nl', value: null },
      ],
      initValue: 'Xbit',
      pins: [
        { bits: '1', name: 'set' },
        { bits: 'X', name: 'value' },
        { bits: '1', name: 'dir' },
      ],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    const bits = (comp.attributes && MotorComponent.parseIntAttr(comp.attributes.length, 1)) || 1;
    bitsToUse = MotorComponent.normalizeBin(bitsToUse, bits);
    const speed = MotorComponent.binToUnsigned(bitsToUse);
    const id = comp.deviceIds && comp.deviceIds[0];
    if (id && typeof setMotor === 'function') {
      setMotor(id, { speed });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = MotorComponent; }
