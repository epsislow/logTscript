/* ================= SENSOR WIDGET ================= */

const SENSOR_THUMB = 16;
const SENSOR_SIZE_DEFAULT = 10;
const SENSOR_SIZE_REF_PX = 140;
const SENSOR_SIZE_MIN = 1;
const SENSOR_SIZE_MAX = 20;

function clampSensorSize(size) {
  let s = size !== undefined ? parseInt(size, 10) : SENSOR_SIZE_DEFAULT;
  if (isNaN(s)) s = SENSOR_SIZE_DEFAULT;
  return Math.max(SENSOR_SIZE_MIN, Math.min(SENSOR_SIZE_MAX, s));
}

function sensorTrackLengthFromSize(size) {
  const s = clampSensorSize(size);
  const minLen = 3 * SENSOR_THUMB;
  const perUnit = (SENSOR_SIZE_REF_PX - minLen) / (SENSOR_SIZE_DEFAULT - 1);
  return Math.round(minLen + (s - 1) * perUnit);
}

function sensorRatioToIndex(ratio, maxIndex, reversed) {
  if (maxIndex <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, ratio));
  const valueRatio = reversed ? (1 - clamped) : clamped;
  return Math.round(valueRatio * maxIndex);
}

function sensorIndexToRatio(index, maxIndex, reversed) {
  if (maxIndex <= 0) return 0;
  const valueRatio = index / maxIndex;
  return reversed ? (1 - valueRatio) : valueRatio;
}

function sensorFormatDisplay(raw, mag, unit, forLabels, index) {
  if (forLabels && forLabels[index] !== undefined) return String(forLabels[index]);
  const scale = Math.pow(10, mag);
  const display = raw / scale;
  let text;
  if (mag > 0) text = display.toFixed(mag);
  else text = String(Math.round(display));
  return unit ? `${text} ${unit}` : text;
}

function sensorIndexToRaw(index, cfg) {
  if (cfg.step != null) return cfg.min + index * cfg.step;
  const binMax = cfg.maxIndex;
  if (binMax <= 0) return cfg.min;
  return Math.round(cfg.min + (index / binMax) * (cfg.max - cfg.min));
}

class SensorAnalogWidget {
  constructor({
    cfg,
    color = '#6dff9c',
    onChange = () => {},
    initialBin = null,
  }) {
    this.cfg = cfg;
    this.length = cfg.length;
    this.maxIndex = cfg.maxIndex;
    this.color = color;
    this.orientation = cfg.orientation || 0;
    this.reversed = !!cfg.reversed;
    this.size = clampSensorSize(cfg.size);
    this.trackPx = sensorTrackLengthFromSize(this.size);
    this.forLabels = cfg.forLabels || {};
    this.onChange = onChange;
    this.dragging = false;

    const initIndex = initialBin != null
      ? Math.max(0, Math.min(this.maxIndex, parseInt(initialBin, 2) || 0))
      : 0;
    this.index = initIndex;
    this.ratio = sensorIndexToRatio(initIndex, this.maxIndex, this.reversed);

    this.track = document.createElement('div');
    this.track.className = 'sensor-track' + (this.orientation === 1 ? ' sensor-track-vertical' : '');
    if (this.orientation === 1) {
      this.track.style.height = `${this.trackPx}px`;
    } else {
      this.track.style.width = `${this.trackPx}px`;
    }

    this.thumb = document.createElement('div');
    this.thumb.className = 'sensor-thumb';
    this.thumb.style.setProperty('--sensor-color', color);

    this.track.appendChild(this.thumb);
    this._bindEvents();
    this._updateThumb();
  }

  mount(parent) {
    parent.appendChild(this.track);
  }

  _trackSpan() {
    return Math.max(SENSOR_THUMB, this.trackPx);
  }

  _ratioFromPointer(clientX, clientY) {
    const rect = this.track.getBoundingClientRect();
    if (this.orientation === 1) {
      const usable = Math.max(1, rect.height - SENSOR_THUMB);
      const y = clientY - rect.top - SENSOR_THUMB / 2;
      return Math.max(0, Math.min(1, 1 - y / usable));
    }
    const usable = Math.max(1, rect.width - SENSOR_THUMB);
    const x = clientX - rect.left - SENSOR_THUMB / 2;
    return Math.max(0, Math.min(1, x / usable));
  }

  _bindEvents() {
    const onDown = (e) => {
      e.preventDefault();
      this.dragging = true;
      this.thumb.classList.add('active');
      this._handlePointer(e.clientX, e.clientY);
    };
    const onMove = (e) => {
      if (!this.dragging) return;
      this._handlePointer(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.thumb.classList.remove('active');
      if (this.maxIndex > 0) {
        this.ratio = sensorIndexToRatio(this.index, this.maxIndex, this.reversed);
        this._updateThumb();
      }
    };

    this.track.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.track.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.dragging = true;
      this.thumb.classList.add('active');
      this._handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      if (!this.dragging || !e.touches[0]) return;
      this._handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener('touchend', onUp);
  }

  _handlePointer(clientX, clientY) {
    const ratio = this._ratioFromPointer(clientX, clientY);
    this.ratio = ratio;
    const newIndex = sensorRatioToIndex(ratio, this.maxIndex, this.reversed);
    if (newIndex !== this.index) {
      this.index = newIndex;
      this.onChange(this.getBinary());
    }
    this._updateThumb();
  }

  _updateThumb() {
    const usable = Math.max(0, this._trackSpan() - SENSOR_THUMB);
    if (this.orientation === 1) {
      this.thumb.style.bottom = `${this.ratio * usable}px`;
      this.thumb.style.left = '50%';
      this.thumb.style.transform = 'translateX(-50%)';
    } else {
      this.thumb.style.left = `${this.ratio * usable}px`;
      this.thumb.style.bottom = '';
      this.thumb.style.transform = '';
    }
  }

  getBinary() {
    return this.index.toString(2).padStart(this.length, '0');
  }

  setBin(binaryValue, silent) {
    const index = Math.max(0, Math.min(this.maxIndex, parseInt(binaryValue, 2) || 0));
    if (index === this.index && !silent) return;
    this.index = index;
    this.ratio = sensorIndexToRatio(index, this.maxIndex, this.reversed);
    this._updateThumb();
    if (!silent) this.onChange(this.getBinary());
  }
}

function addSensor({ id, cfg, onChange, initialBin = null }) {
  const container = typeof getDevicesContainer === 'function' ? getDevicesContainer() : null;
  if (!container) return;
  if (typeof showDevices === 'function') showDevices();

  const color = cfg.color || '#6dff9c';
  const label = cfg.text || '';

  if (cfg.digital) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sensor-digital-wrapper';

    const icon = document.createElement('span');
    icon.className = 'sensor-digital-icon';
    icon.textContent = cfg.icon || 'S';
    icon.style.color = color;

    const lbl = document.createElement('span');
    lbl.className = 'sensor-digital-label';
    lbl.textContent = label ? label.slice(0, 5) : (cfg.kind || '');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sensor-digital-toggle';
    btn.style.setProperty('--sensor-color', color);

    const inverted = !!cfg.inverted;
    let storageBit = (initialBin && initialBin[initialBin.length - 1] === '1') ? '1' : '0';

    const syncUi = () => {
      const uiOn = inverted ? storageBit === '0' : storageBit === '1';
      btn.classList.toggle('on', uiOn);
      btn.setAttribute('aria-pressed', uiOn ? 'true' : 'false');
      btn.textContent = uiOn ? '1' : '0';
    };
    syncUi();

    btn.addEventListener('click', () => {
      const uiOn = !(inverted ? storageBit === '0' : storageBit === '1');
      storageBit = inverted ? (uiOn ? '0' : '1') : (uiOn ? '1' : '0');
      syncUi();
      if (onChange) onChange(storageBit);
    });

    wrapper.append(icon, lbl, btn);
    container.appendChild(wrapper);
    if (cfg.nl) {
      const br = document.createElement('div');
      br.className = 'break';
      container.appendChild(br);
    }

    const maps = typeof dm === 'function' ? dm() : null;
    if (maps) {
      if (!maps.sensors) maps.sensors = new Map();
      maps.sensors.set(id, {
        digital: true,
        setBin(bin, silent) {
          storageBit = bin[bin.length - 1] === '1' ? '1' : '0';
          syncUi();
          if (!silent && onChange) onChange(storageBit);
        },
        _syncUi: syncUi,
      });
    }
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'sensor-wrapper' + (cfg.orientation === 1 ? ' sensor-vertical' : '');

  const kindBadge = document.createElement('span');
  kindBadge.className = 'sensor-kind';
  kindBadge.textContent = cfg.icon || 'S';
  kindBadge.style.color = color;

  const lbl = document.createElement('span');
  lbl.className = 'sensor-label';
  lbl.textContent = label ? label.slice(0, 5) : '';
  if (!label) lbl.style.visibility = 'hidden';

  const value = document.createElement('span');
  value.className = 'sensor-value';
  value.style.color = color;

  const initIndex = initialBin != null
    ? Math.max(0, Math.min(cfg.maxIndex, parseInt(initialBin, 2) || 0))
    : 0;
  const initRaw = sensorIndexToRaw(initIndex, cfg);
  value.textContent = sensorFormatDisplay(initRaw, cfg.mag, cfg.unit, cfg.forLabels, initIndex);

  const analog = new SensorAnalogWidget({
    cfg,
    color,
    onChange: () => {},
    initialBin,
  });

  analog._valueElement = value;
  analog.onChange = (bin) => {
    const idx = Math.max(0, Math.min(cfg.maxIndex, parseInt(bin, 2) || 0));
    const raw = sensorIndexToRaw(idx, cfg);
    if (analog._valueElement) {
      analog._valueElement.textContent = sensorFormatDisplay(raw, cfg.mag, cfg.unit, cfg.forLabels, idx);
    }
    if (onChange) onChange(bin);
  };

  wrapper.append(kindBadge, lbl);
  analog.mount(wrapper);
  wrapper.append(value);
  container.appendChild(wrapper);

  if (cfg.nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  const maps = typeof dm === 'function' ? dm() : null;
  if (maps) {
    if (!maps.sensors) maps.sensors = new Map();
    maps.sensors.set(id, analog);
  }
}

function setSensor(id, binaryValue) {
  const maps = typeof getDeviceMaps === 'function' ? getDeviceMaps() : null;
  if (!maps || !maps.sensors) return;
  const sensor = maps.sensors.get(id);
  if (!sensor) return;
  if (sensor.digital) {
    sensor.setBin(binaryValue, true);
    return;
  }
  sensor.setBin(binaryValue, true);
  const idx = Math.max(0, Math.min(sensor.maxIndex, parseInt(binaryValue, 2) || 0));
  const raw = sensorIndexToRaw(idx, sensor.cfg);
  if (sensor._valueElement) {
    sensor._valueElement.textContent = sensorFormatDisplay(
      raw, sensor.cfg.mag, sensor.cfg.unit, sensor.cfg.forLabels, idx
    );
  }
}
