var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var SensorComponent = class SensorComponent extends BuiltinComponent {
  static get type() { return 'sensor'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  static get DIGITAL_KINDS() {
    return { proximity: 1, motion: 1, limit: 1, beam: 1, float: 1 };
  }

  static get ANALOG_KINDS() {
    return {
      temperature: { unit: 'C', min: -40, max: 125, default: 20, mag: 0, length: 8 },
      humidity: { unit: '%', min: 0, max: 100, default: 50, mag: 0, length: 8 },
      light: { unit: 'lux', min: 0, max: 1000, default: 200, mag: 0, length: 8 },
      pressure: { unit: 'bar', min: 0, max: 10, default: 1, mag: 0, length: 8 },
      distance: { unit: 'cm', min: 0, max: 400, default: 100, mag: 0, length: 8 },
      wheel: { unit: '', min: 0, max: 255, default: 0, mag: 0, length: 8 },
    };
  }

  static get TEMP_K_DEFAULTS() {
    return { unit: 'K', min: 233, max: 398, default: 293, mag: 0, length: 8 };
  }

  static get KIND_ICONS() {
    return {
      proximity: 'P',
      motion: 'M',
      limit: 'L',
      beam: 'B',
      float: 'F',
      temperature: 'T',
      humidity: 'H',
      light: '☼',
      pressure: 'Pr',
      distance: 'D',
      wheel: 'W',
    };
  }

  static resolveKind(attributes) {
    const kind = attributes.kind !== undefined ? String(attributes.kind) : 'proximity';
    if (!SensorComponent.DIGITAL_KINDS[kind] && !SensorComponent.ANALOG_KINDS[kind]) {
      throw Error(`Unknown sensor kind '${kind}'`);
    }
    return kind;
  }

  static isDigitalKind(kind) {
    return !!SensorComponent.DIGITAL_KINDS[kind];
  }

  static parseIntAttr(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  static ceilLog2(n) {
    if (n <= 1) return 1;
    return 32 - Math.clz32(n - 1);
  }

  static resolveConfig(attributes, name) {
    const kind = SensorComponent.resolveKind(attributes);
    const digital = SensorComponent.isDigitalKind(kind);
    if (digital) {
      if (attributes.step !== undefined) {
        throw Error(`Sensor step is not allowed for digital kind '${kind}'${name ? ` (${name})` : ''}`);
      }
      let length = SensorComponent.parseIntAttr(attributes.length, 1);
      if (length !== 1) {
        throw Error(`Digital sensor length must be 1${name ? ` for ${name}` : ''}`);
      }
      return {
        kind,
        digital: true,
        length: 1,
        inverted: !!attributes.inverted,
        text: attributes.text !== undefined ? String(attributes.text) : '',
        color: attributes.color || '#6dff9c',
        nl: !!attributes.nl,
        icon: SensorComponent.KIND_ICONS[kind] || 'S',
      };
    }

    let profile = SensorComponent.ANALOG_KINDS[kind];
    const unitAttr = attributes.unit !== undefined ? String(attributes.unit) : null;
    if (kind === 'temperature') {
      const unit = unitAttr !== null ? unitAttr : 'C';
      if (unit !== 'C' && unit !== 'K') {
        throw Error(`temperature unit must be 'C' or 'K'${name ? ` for ${name}` : ''}`);
      }
      profile = unit === 'K' ? SensorComponent.TEMP_K_DEFAULTS : SensorComponent.ANALOG_KINDS.temperature;
    }

    const unit = unitAttr !== null ? unitAttr : profile.unit;
    if (kind === 'distance') {
      const allowed = { cm: 1, mm: 1, m: 1, in: 1 };
      if (!allowed[unit]) {
        throw Error(`distance unit must be cm|mm|m|in${name ? ` for ${name}` : ''}`);
      }
    }

    let min = attributes.min !== undefined ? SensorComponent.parseIntAttr(attributes.min, profile.min) : profile.min;
    let max = attributes.max !== undefined ? SensorComponent.parseIntAttr(attributes.max, profile.max) : profile.max;
    let def = attributes.default !== undefined
      ? SensorComponent.parseIntAttr(attributes.default, profile.default)
      : profile.default;
    let mag = attributes.mag !== undefined ? SensorComponent.parseIntAttr(attributes.mag, 0) : profile.mag;

    if (max <= min) {
      throw Error(`sensor max must be > min${name ? ` for ${name}` : ''}`);
    }
    if (mag < -6 || mag > 6) {
      throw Error(`sensor mag must be -6..6${name ? ` for ${name}` : ''}`);
    }
    if (kind === 'humidity') {
      if (min < 0 || max > 100) {
        throw Error(`humidity min/max must stay within 0..100${name ? ` for ${name}` : ''}`);
      }
    }
    if (kind === 'temperature' && unit === 'K' && min < 0) {
      throw Error(`Kelvin temperature min must be >= 0${name ? ` for ${name}` : ''}`);
    }
    if (kind === 'distance' && min < 0) {
      throw Error(`distance min must be >= 0${name ? ` for ${name}` : ''}`);
    }
    if (kind === 'light' && min < 0) {
      throw Error(`light min must be >= 0${name ? ` for ${name}` : ''}`);
    }
    if (def < min || def > max) {
      throw Error(`sensor default must be within min..max${name ? ` for ${name}` : ''}`);
    }

    let step = null;
    if (attributes.step !== undefined) {
      step = SensorComponent.parseIntAttr(attributes.step, 0);
      if (step < 1) {
        throw Error(`sensor step must be >= 1${name ? ` for ${name}` : ''}`);
      }
      if ((max - min) % step !== 0) {
        throw Error(`(max-min) must be divisible by step${name ? ` for ${name}` : ''}`);
      }
      if ((def - min) % step !== 0) {
        throw Error(`default must land on a step${name ? ` for ${name}` : ''}`);
      }
    }

    const positions = step != null ? ((max - min) / step) + 1 : null;
    let length;
    if (attributes.length !== undefined) {
      length = SensorComponent.parseIntAttr(attributes.length, profile.length);
    } else if (step != null) {
      length = SensorComponent.ceilLog2(positions);
    } else {
      length = profile.length;
    }
    if (length < 1 || length > 8) {
      throw Error(`sensor length must be 1..8${name ? ` for ${name}` : ''}`);
    }
    if (step != null && (1 << length) < positions) {
      throw Error(`sensor length too small for step positions (${positions})${name ? ` for ${name}` : ''}`);
    }

    return {
      kind,
      digital: false,
      length,
      min,
      max,
      default: def,
      mag,
      unit,
      step,
      positions,
      maxIndex: step != null ? positions - 1 : (1 << length) - 1,
      orientation: attributes.orientation !== undefined ? SensorComponent.parseIntAttr(attributes.orientation, 0) : 0,
      reversed: !!attributes.reversed,
      size: SensorComponent.clampSize(attributes.size),
      forLabels: attributes['for'] || {},
      text: attributes.text !== undefined ? String(attributes.text) : '',
      color: attributes.color || '#6dff9c',
      nl: !!attributes.nl,
      icon: SensorComponent.KIND_ICONS[kind] || 'S',
    };
  }

  static clampSize(size) {
    let s = size !== undefined ? parseInt(size, 10) : 10;
    if (isNaN(s)) s = 10;
    return Math.max(1, Math.min(20, s));
  }

  static rawToIndex(raw, cfg) {
    if (cfg.step != null) {
      return Math.max(0, Math.min(cfg.maxIndex, Math.round((raw - cfg.min) / cfg.step)));
    }
    const binMax = cfg.maxIndex;
    if (binMax <= 0) return 0;
    const ratio = (raw - cfg.min) / (cfg.max - cfg.min);
    return Math.round(Math.max(0, Math.min(1, ratio)) * binMax);
  }

  static indexToRaw(index, cfg) {
    if (cfg.step != null) {
      return cfg.min + index * cfg.step;
    }
    const binMax = cfg.maxIndex;
    if (binMax <= 0) return cfg.min;
    return Math.round(cfg.min + (index / binMax) * (cfg.max - cfg.min));
  }

  static indexToBin(index, length) {
    return index.toString(2).padStart(length, '0');
  }

  static binToIndex(bin, maxIndex) {
    const n = parseInt(bin, 2);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(maxIndex, n));
  }

  static formatDisplay(raw, mag, unit, forLabels, index) {
    if (forLabels && forLabels[index] !== undefined) return String(forLabels[index]);
    const scale = Math.pow(10, mag);
    const display = raw / scale;
    let text;
    if (mag > 0) text = display.toFixed(mag);
    else text = String(Math.round(display));
    return unit ? `${text} ${unit}` : text;
  }

  getSpecialParseAttributes() {
    return { literalAttrs: ['kind'] };
  }

  getWidthBits(attributes) {
    try {
      return SensorComponent.resolveConfig(attributes || {}).length;
    } catch (_) {
      const kind = (attributes && attributes.kind) ? String(attributes.kind) : 'proximity';
      if (SensorComponent.DIGITAL_KINDS[kind]) return 1;
      return attributes && attributes.length !== undefined
        ? parseInt(attributes.length, 10) || 8
        : 8;
    }
  }

  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  getDef() {
    return {
      attrs: [
        { name: 'kind', value: 'string' },
        { name: 'text', value: 'string' },
        { name: 'color', value: 'string' },
        { name: 'length', value: 'integer' },
        { name: 'inverted', value: null },
        { name: 'unit', value: 'string' },
        { name: 'min', value: 'integer' },
        { name: 'max', value: 'integer' },
        { name: 'default', value: 'integer' },
        { name: 'mag', value: 'integer' },
        { name: 'step', value: 'integer' },
        { name: 'orientation', value: '0/1' },
        { name: 'reversed', value: null },
        { name: 'size', value: 'integer' },
        { name: 'for', type: 'array', value: 'string' },
        { name: 'nl', value: null },
      ],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }, { bits: 'X', name: 'data' }],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'get') return null;
    let val = null;
    if (comp.ref) val = ctx.getValueFromRef(comp.ref);
    const bits = ctx.getComponentBits(comp.type, comp.attributes) || 1;
    if (val === null || val === undefined) {
      val = comp.initialValue || '0'.repeat(bits);
    } else {
      if (val.length < bits) val = val.padStart(bits, '0');
      else if (val.length > bits) val = val.substring(val.length - bits);
    }
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const cfg = SensorComponent.resolveConfig(attributes, name);
    let initialBin;
    if (cfg.digital) {
      initialBin = (initialValue && initialValue.length) ? initialValue[initialValue.length - 1] : '0';
      if (initialBin !== '0' && initialBin !== '1') initialBin = '0';
    } else {
      if (initialValue && /^[01]+$/.test(initialValue) && initialValue.length === cfg.length) {
        initialBin = initialValue;
      } else {
        const idx = SensorComponent.rawToIndex(cfg.default, cfg);
        initialBin = SensorComponent.indexToBin(idx, cfg.length);
      }
    }

    const storageIdx = ctx.storeValue(initialBin);
    const sensorRef = `&${storageIdx}`;
    const sensorId = baseId;

    const onChange = (binValue) => {
      const compInfo = ctx.components.get(name);
      if (!compInfo) return;
      if (!compInfo.ref) compInfo.ref = sensorRef;
      let value = binValue;
      if (value.length < cfg.length) value = value.padStart(cfg.length, '0');
      else if (value.length > cfg.length) value = value.substring(value.length - cfg.length);
      ctx.scheduleComponentOutputChange(name, value);
    };

    if (typeof addSensor === 'function') {
      addSensor({
        id: sensorId,
        cfg,
        onChange,
        initialBin,
      });
    }

    return { deviceIds: [sensorId], ref: sensorRef, sensorConfig: cfg };
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const cfg = SensorComponent.resolveConfig(comp.attributes, compName);
    const sensorId = comp.deviceIds[0];
    const actualBits = cfg.length;

    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || setValue[setValue.length - 1] === '1') {
        if (pending.data !== undefined) {
          let dataValue = this.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
          if (dataValue.length < actualBits) dataValue = dataValue.padStart(actualBits, '0');
          else if (dataValue.length > actualBits) dataValue = dataValue.substring(dataValue.length - actualBits);
          if (typeof setSensor === 'function') {
            setSensor(sensorId, dataValue);
          }
          ctx.scheduleComponentOutputChange(compName, dataValue);
        }
      }
    }
  }

  updateDisplayValue(comp, value, bitRange) {
    let bitsToUse = value;
    const len = this.getWidthBits(comp.attributes);
    if (bitRange) {
      const { start, end } = bitRange;
      const actualEnd = end !== undefined ? end : start;
      bitsToUse = value.substring(start, actualEnd + 1);
    }
    if (bitsToUse.length < len) bitsToUse = bitsToUse.padStart(len, '0');
    else if (bitsToUse.length > len) bitsToUse = bitsToUse.substring(bitsToUse.length - len);
    const sensorId = comp.deviceIds[0];
    if (typeof setSensor === 'function') {
      setSensor(sensorId, bitsToUse);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SensorComponent; }
