var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var ServoComponent = class ServoComponent extends BuiltinComponent {
  static get type() { return 'servo'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  static get PATHS() {
    return { short: 1, long: 1, cw: 1, ccw: 1 };
  }

  static get DISPLAYS() {
    return { servo: 1, piston: 1, valve: 1 };
  }

  static parseIntAttr(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  static resolvePath(path) {
    const p = path !== undefined ? String(path) : 'short';
    if (!ServoComponent.PATHS[p]) {
      throw Error(`Unknown servo path '${p}'`);
    }
    return p;
  }

  static resolveDisplay(display) {
    const d = display !== undefined ? String(display) : 'servo';
    if (!ServoComponent.DISPLAYS[d]) {
      throw Error(`Unknown servo display '${d}'`);
    }
    return d;
  }

  static isRotaryDisplay(display) {
    return ServoComponent.resolveDisplay(display) === 'servo';
  }

  static resolveConfig(attributes, name) {
    let length = ServoComponent.parseIntAttr(attributes && attributes.length, 8);
    if (isNaN(length) || length < 1 || length > 16) {
      throw Error(`servo length must be 1..16${name ? ` for ${name}` : ''}`);
    }
    let minAngle = ServoComponent.parseIntAttr(attributes && attributes.minAngle, 0);
    let maxAngle = ServoComponent.parseIntAttr(attributes && attributes.maxAngle, 180);
    if (minAngle < -360 || minAngle > 360 || maxAngle < -360 || maxAngle > 360) {
      throw Error(`servo minAngle/maxAngle must be -360..360${name ? ` for ${name}` : ''}`);
    }
    if (!(minAngle < maxAngle)) {
      throw Error(`servo minAngle must be < maxAngle${name ? ` for ${name}` : ''}`);
    }
    if (maxAngle - minAngle > 360) {
      throw Error(`servo angle span must be <= 360${name ? ` for ${name}` : ''}`);
    }
    let size = ServoComponent.parseIntAttr(attributes && attributes.size, 10);
    if (size < 1) size = 1;
    if (size > 20) size = 20;
    let rate = ServoComponent.parseIntAttr(attributes && attributes.rate, 10);
    if (rate < 1) rate = 1;
    if (rate > 100) rate = 100;
    let speed = ServoComponent.parseIntAttr(attributes && attributes.speed, 10);
    if (speed < 1) speed = 1;
    if (speed > 100) speed = 100;
    let rotate = ServoComponent.parseIntAttr(attributes && attributes.rotate, 0);
    if (rotate !== 0 && rotate !== 90 && rotate !== 180 && rotate !== 270) {
      throw Error(`servo rotate must be 0|90|180|270${name ? ` for ${name}` : ''}`);
    }
    const path = ServoComponent.resolvePath(attributes && attributes.path);
    const display = ServoComponent.resolveDisplay(attributes && attributes.display);
    let angleAttr = null;
    if (attributes && attributes.angle !== undefined && attributes.angle !== null && attributes.angle !== '') {
      angleAttr = ServoComponent.parseIntAttr(attributes.angle, 0);
      if (angleAttr < -360 || angleAttr > 360) {
        throw Error(`servo angle must be -360..360${name ? ` for ${name}` : ''}`);
      }
    }
    return {
      length,
      minAngle,
      maxAngle,
      angle: angleAttr,
      path,
      display,
      text: attributes && attributes.text !== undefined ? String(attributes.text) : '',
      color: (attributes && attributes.color) || '#6dff9c',
      size,
      speed,
      rate,
      rotate,
      flip: !!(attributes && attributes.flip),
      reversed: !!(attributes && attributes.reversed),
      nl: !!(attributes && attributes.nl),
    };
  }

  static vmaxForLength(length) {
    const bits = Math.max(1, length | 0);
    if (bits >= 31) return 0x7FFFFFFF;
    return (1 << bits) - 1;
  }

  static isWrap360(cfg) {
    return (cfg.maxAngle - cfg.minAngle) === 360;
  }

  static binToUnsigned(bin) {
    if (bin == null || bin === '') return 0;
    const s = String(bin).replace(/[^01]/g, '');
    if (!s) return 0;
    return parseInt(s, 2) || 0;
  }

  static unsignedToBin(n, bits) {
    const vmax = ServoComponent.vmaxForLength(bits);
    let v = Math.max(0, Math.min(vmax, n | 0));
    return v.toString(2).padStart(bits, '0');
  }

  static normalizeBin(value, bits) {
    let v = value == null ? '' : String(value);
    v = v.replace(/[^01XZ]/gi, '');
    if (v.length < bits) v = v.padStart(bits, '0');
    else if (v.length > bits) v = v.substring(v.length - bits);
    return v;
  }

  static pathFromBin(bin) {
    const s = String(bin == null ? '' : bin).replace(/[^01]/g, '').padStart(2, '0').slice(-2);
    const map = { '00': 'short', '01': 'long', '10': 'cw', '11': 'ccw' };
    return map[s] || 'short';
  }

  static binFromPath(path) {
    const map = { short: '00', long: '01', cw: '10', ccw: '11' };
    return map[path] || '00';
  }

  static angleFromValue(position, cfg) {
    const vmax = ServoComponent.vmaxForLength(cfg.length);
    let v = Math.max(0, Math.min(vmax, position | 0));
    if (cfg.reversed) v = vmax - v;
    const span = cfg.maxAngle - cfg.minAngle;
    if (vmax <= 0) return cfg.minAngle;
    return cfg.minAngle + (v / vmax) * span;
  }

  static valueFromAngle(angleDeg, cfg) {
    const vmax = ServoComponent.vmaxForLength(cfg.length);
    const span = cfg.maxAngle - cfg.minAngle;
    let a = Math.max(cfg.minAngle, Math.min(cfg.maxAngle, angleDeg | 0));
    if (cfg.reversed) a = cfg.maxAngle - (a - cfg.minAngle);
    if (vmax <= 0 || span <= 0) return 0;
    return Math.max(0, Math.min(vmax, Math.round(((a - cfg.minAngle) / span) * vmax)));
  }

  static resolveTravelSteps(from, to, path, vmax, wrap360) {
    from = from | 0;
    to = to | 0;
    if (from === to) return { travel: 0, sign: 1 };

    if (!wrap360) {
      const delta = to - from;
      if (path === 'cw') {
        return delta >= 0
          ? { travel: delta, sign: 1 }
          : { travel: Math.abs(delta), sign: -1 };
      }
      if (path === 'ccw') {
        return delta <= 0
          ? { travel: Math.abs(delta), sign: -1 }
          : { travel: delta, sign: -1 };
      }
      return delta >= 0
        ? { travel: delta, sign: 1 }
        : { travel: Math.abs(delta), sign: -1 };
    }

    const mod = vmax + 1;
    const forward = (to - from + mod) % mod;
    const backward = (from - to + mod) % mod;

    if (path === 'cw') return { travel: forward, sign: 1 };
    if (path === 'ccw') return { travel: backward, sign: -1 };
    if (path === 'long') {
      if (forward >= backward) return { travel: forward, sign: 1 };
      return { travel: backward, sign: -1 };
    }
    if (forward <= backward) return { travel: forward, sign: 1 };
    return { travel: backward, sign: -1 };
  }

  static applyRelative(from, deltaSteps, path, vmax, wrap360) {
    const delta = Math.abs(deltaSteps | 0);
    if (path === 'ccw') {
      if (wrap360) return (from - delta + (vmax + 1)) % (vmax + 1);
      return Math.max(0, from - delta);
    }
    if (wrap360) return (from + delta) % (vmax + 1);
    return Math.min(vmax, from + delta);
  }

  static clampSpeed(n) {
    let s = n !== undefined && n !== null ? parseInt(n, 10) : 10;
    if (isNaN(s)) s = 10;
    if (s < 1) s = 1;
    if (s > 100) s = 100;
    return s;
  }

  static speedFromBin(bin) {
    return ServoComponent.clampSpeed(ServoComponent.binToUnsigned(bin));
  }

  static slewDurationMs(travelSteps, speed, rate) {
    const steps = Math.abs(travelSteps | 0);
    if (steps <= 0) return 0;
    const sp = ServoComponent.clampSpeed(speed);
    const rt = ServoComponent.clampSpeed(rate);
    const factor = sp * (rt / 10);
    const eff = Math.max(0.1, Math.min(1000, factor));
    return Math.max(40, Math.min(5000, (steps * 24) / eff));
  }

  static travelDegrees(fromSteps, toSteps, path, cfg) {
    const vmax = ServoComponent.vmaxForLength(cfg.length);
    const rotary = ServoComponent.isRotaryDisplay(cfg.display);
    const wrap = rotary && ServoComponent.isWrap360(cfg);
    if (!rotary) {
      const delta = (toSteps | 0) - (fromSteps | 0);
      const span = cfg.maxAngle - cfg.minAngle;
      if (vmax <= 0) return 0;
      return delta * (span / vmax);
    }
    const { travel, sign } = ServoComponent.resolveTravelSteps(fromSteps, toSteps, path, vmax, wrap);
    const span = cfg.maxAngle - cfg.minAngle;
    if (vmax <= 0 || travel <= 0) return 0;
    return sign * travel * (span / vmax);
  }

  static travelStepsForMove(fromPos, toPos, path, rel, magnitude, cfg) {
    const vmax = ServoComponent.vmaxForLength(cfg.length);
    const rotary = ServoComponent.isRotaryDisplay(cfg.display);
    const wrap360 = rotary && ServoComponent.isWrap360(cfg);
    if (rel) return Math.abs(magnitude | 0);
    if (!rotary) return Math.abs((toPos | 0) - (fromPos | 0));
    return ServoComponent.resolveTravelSteps(fromPos, toPos, path, vmax, wrap360).travel;
  }

  /** Fraction 0..1 along travel A→B after reversed mapping. */
  static fractionFromValue(position, cfg) {
    const vmax = ServoComponent.vmaxForLength(cfg.length);
    let v = Math.max(0, Math.min(vmax, position | 0));
    if (cfg.reversed) v = vmax - v;
    if (vmax <= 0) return 0;
    return v / vmax;
  }

  static propagateOutput(ctx, compName) {
    if (ctx.deferWirePropagation && ctx.deferWirePropagation() && ctx.signalPropagationStrategy) {
      const executed = new Set();
      const scheduled = ctx.signalPropagationStrategy._scheduleWiresDependingOnComponent(compName, executed);
      if (scheduled) {
        ctx.signalPropagationStrategy.propagate();
      }
      ctx.updateComponentConnections(compName);
      ctx._notifyIoportMemberChange(compName);
    } else {
      ctx.updateComponentConnections(compName);
      if (typeof showVars === 'function') showVars(ctx);
    }
    if (typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(compName);
    }
  }

  getSpecialParseAttributes() {
    return { literalAttrs: ['path', 'display'] };
  }

  getWidthBits(attributes) {
    try {
      return ServoComponent.resolveConfig(attributes || {}).length;
    } catch (_) {
      const n = attributes && attributes.length !== undefined
        ? parseInt(attributes.length, 10)
        : 8;
      return isNaN(n) ? 8 : n;
    }
  }

  getSupportedProperties() { return ['get', 'moving']; }
  getRedirectProperties() { return ['get']; }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'get') {
      let val = null;
      if (comp.ref && comp.ref !== '&-') {
        val = ctx.getValueFromRef(comp.ref);
      }
      const bits = ctx.getComponentBits(comp.type, comp.attributes) || 8;
      if (val === null || val === undefined) {
        val = comp.initialValue || '0'.repeat(bits);
      }
      const br = this.handleBitRange(a, val, a.var, 'get', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
    }
    if (property === 'moving') {
      let val = '0';
      if (comp.movingRef && comp.movingRef !== '&-') {
        val = ctx.getValueFromRef(comp.movingRef) || '0';
      }
      return { value: val, ref: null, varName: `${a.var}:moving`, bitWidth: 1 };
    }
    return null;
  }

  _resolveMovePath(pending, cfg, reEvaluate, ctx) {
    if (pending.path !== undefined) {
      return ServoComponent.pathFromBin(
        this.reEvalPendingValue(pending, 'path', reEvaluate, ctx)
      );
    }
    return cfg.path;
  }

  _resolveMoveSpeed(pending, cfg, reEvaluate, ctx) {
    if (pending.speed !== undefined) {
      return ServoComponent.speedFromBin(
        this.reEvalPendingValue(pending, 'speed', reEvaluate, ctx)
      );
    }
    return cfg.speed;
  }

  _isRelBit(pending, reEvaluate, ctx) {
    if (pending.rel === undefined) return false;
    const relVal = this.reEvalPendingValue(pending, 'rel', reEvaluate, ctx);
    return relVal === '1' || (relVal && relVal[relVal.length - 1] === '1');
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const cfg = ServoComponent.resolveConfig(attributes || {}, name);
    let position;
    if (cfg.angle !== null) {
      position = ServoComponent.valueFromAngle(cfg.angle, cfg);
    } else {
      const norm = ServoComponent.normalizeBin(initialValue || '0'.repeat(cfg.length), cfg.length);
      position = ServoComponent.binToUnsigned(norm);
    }
    const value = ServoComponent.unsignedToBin(position, cfg.length);
    const movingIdx = ctx.storeValue('0');
    const movingRef = `&${movingIdx}`;

    const onMovingChange = (moving) => {
      ctx.runSafely(() => {
        ctx.setValueAtRef(movingRef, moving ? '1' : '0');
        ServoComponent.propagateOutput(ctx, name);
      });
    };

    if (typeof addServo === 'function') {
      addServo({
        id: baseId,
        text: cfg.text,
        color: cfg.color,
        size: cfg.size,
        speed: cfg.speed,
        rate: cfg.rate,
        rotate: cfg.rotate,
        flip: cfg.flip,
        reversed: cfg.reversed,
        length: cfg.length,
        minAngle: cfg.minAngle,
        maxAngle: cfg.maxAngle,
        path: cfg.path,
        display: cfg.display,
        position,
        nl: cfg.nl,
        onMovingChange,
      });
    }

    const storageIdx = ctx.storeValue(value);
    return { deviceIds: [baseId], ref: `&${storageIdx}`, movingRef };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    if (pending.set === undefined) return;
    let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!(setValue === '1' || setValue[setValue.length - 1] === '1')) return;

    const cfg = ServoComponent.resolveConfig(comp.attributes || {}, compName);
    const bits = cfg.length;
    const vmax = ServoComponent.vmaxForLength(bits);
    const wrap360 = ServoComponent.isRotaryDisplay(cfg.display) && ServoComponent.isWrap360(cfg);

    let fromPos = 0;
    if (comp.ref) {
      fromPos = ServoComponent.binToUnsigned(ctx.getValueFromRef(comp.ref));
    }

    const rel = this._isRelBit(pending, reEvaluate, ctx);
    const path = this._resolveMovePath(pending, cfg, reEvaluate, ctx);
    const moveSpeed = this._resolveMoveSpeed(pending, cfg, reEvaluate, ctx);

    if (rel && path !== 'cw' && path !== 'ccw') {
      throw Error(`servo relative move requires path cw or ccw${compName ? ` for ${compName}` : ''}`);
    }

    if (pending.value === undefined) return;

    let rawValue = this.reEvalPendingValue(pending, 'value', reEvaluate, ctx);
    rawValue = ServoComponent.normalizeBin(rawValue, bits);
    const magnitude = ServoComponent.binToUnsigned(rawValue);

    let toPos;
    if (rel) {
      toPos = ServoComponent.applyRelative(fromPos, magnitude, path, vmax, wrap360);
    } else {
      toPos = Math.max(0, Math.min(vmax, magnitude));
    }
    const travelSteps = ServoComponent.travelStepsForMove(fromPos, toPos, path, rel, magnitude, cfg);

    const bin = ServoComponent.unsignedToBin(toPos, bits);
    if (comp.ref) {
      ctx.setValueAtRef(comp.ref, bin);
    } else {
      const storageIdx = ctx.storeValue(bin);
      comp.ref = `&${storageIdx}`;
    }

    const id = comp.deviceIds && comp.deviceIds[0];
    if (id && typeof setServo === 'function') {
      setServo(id, {
        position: toPos,
        fromPosition: fromPos,
        path,
        rel,
        speed: moveSpeed,
        valueMagnitude: magnitude,
      });
    } else if (comp.movingRef && comp.movingRef !== '&-') {
      ctx.setValueAtRef(comp.movingRef, travelSteps > 0 ? '1' : '0');
    }
    comp._servoLastPos = toPos;
  }

  getDef() {
    return {
      attrs: [
        { name: 'length', value: 'integer' },
        { name: 'minAngle', value: 'integer' },
        { name: 'maxAngle', value: 'integer' },
        { name: 'angle', value: 'integer' },
        { name: 'display', value: 'string' },
        { name: 'path', value: 'string' },
        { name: 'text', value: 'string' },
        { name: 'color', value: 'string' },
        { name: 'size', value: 'integer' },
        { name: 'speed', value: 'integer' },
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
        { bits: '2', name: 'path' },
        { bits: '1', name: 'rel' },
        { bits: '7', name: 'speed' },
      ],
      pouts: [
        { bits: 'X', name: 'get' },
        { bits: '1', name: 'moving' },
      ],
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
    const cfg = ServoComponent.resolveConfig(comp.attributes || {});
    bitsToUse = ServoComponent.normalizeBin(bitsToUse, cfg.length);
    const toPos = ServoComponent.binToUnsigned(bitsToUse);
    const fromPos = comp._servoLastPos != null ? comp._servoLastPos : toPos;
    comp._servoLastPos = toPos;
    const id = comp.deviceIds && comp.deviceIds[0];
    if (id && typeof setServo === 'function') {
      setServo(id, {
        position: toPos,
        fromPosition: fromPos,
        path: cfg.path,
        rel: false,
        speed: cfg.speed,
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = ServoComponent; }
