/* ================= SLIDER WIDGET ================= */

const SLIDER_TRACK_H = 140;
const SLIDER_TRACK_V = 140;
const SLIDER_THUMB = 16;

function formatSliderDisplay(stateNum, forLabels) {
  const labels = forLabels || {};
  return (labels[stateNum] !== undefined) ? labels[stateNum] : stateNum.toString();
}

function sliderRatioToState(ratio, length, reversed) {
  const max = (1 << length) - 1;
  if (max <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, ratio));
  const valueRatio = reversed ? (1 - clamped) : clamped;
  return Math.round(valueRatio * max);
}

function sliderStateToRatio(state, maxState, reversed) {
  if (maxState <= 0) return 0;
  const valueRatio = state / maxState;
  return reversed ? (1 - valueRatio) : valueRatio;
}

class SliderWidget {
  constructor({
    length = 4,
    color = '#6dff9c',
    orientation = 0,
    reversed = false,
    forLabels = {},
    onChange = () => {},
    initialBin = null,
  }) {
    if (length < 1 || length > 8) {
      throw new Error('slider length must be 1..8');
    }
    this.length = length;
    this.maxState = (1 << length) - 1;
    this.color = color;
    this.orientation = orientation;
    this.reversed = reversed;
    this.forLabels = forLabels;
    this.onChange = onChange;
    this.dragging = false;

    const initState = initialBin != null
      ? Math.max(0, Math.min(this.maxState, parseInt(initialBin, 2) || 0))
      : 0;
    this.state = initState;
    this.ratio = sliderStateToRatio(initState, this.maxState, this.reversed);

    this.track = document.createElement('div');
    this.track.className = 'slider-track' + (orientation === 1 ? ' slider-track-vertical' : '');

    this.thumb = document.createElement('div');
    this.thumb.className = 'slider-thumb';
    this.thumb.style.setProperty('--slider-color', color);

    this.track.appendChild(this.thumb);
    this._bindEvents();
    this._updateThumb();
  }

  mount(parent) {
    parent.appendChild(this.track);
  }

  _ratioFromPointer(clientX, clientY) {
    const rect = this.track.getBoundingClientRect();
    if (this.orientation === 1) {
      const usable = Math.max(1, rect.height - SLIDER_THUMB);
      const y = clientY - rect.top - SLIDER_THUMB / 2;
      return Math.max(0, Math.min(1, 1 - y / usable));
    }
    const usable = Math.max(1, rect.width - SLIDER_THUMB);
    const x = clientX - rect.left - SLIDER_THUMB / 2;
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
      if (this.maxState > 0) {
        this.ratio = sliderStateToRatio(this.state, this.maxState, this.reversed);
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
    const newState = sliderRatioToState(ratio, this.length, this.reversed);
    if (newState !== this.state) {
      this.state = newState;
      this.onChange(this.getBinary());
    }
    this._updateThumb();
  }

  _updateThumb() {
    const displayRatio = this.ratio;
    if (this.orientation === 1) {
      const usable = SLIDER_TRACK_V - SLIDER_THUMB;
      this.thumb.style.bottom = `${displayRatio * usable}px`;
      this.thumb.style.left = '50%';
      this.thumb.style.transform = 'translateX(-50%)';
    } else {
      const usable = SLIDER_TRACK_H - SLIDER_THUMB;
      this.thumb.style.left = `${displayRatio * usable}px`;
      this.thumb.style.bottom = '';
      this.thumb.style.transform = '';
    }
  }

  getBinary() {
    return this.state.toString(2).padStart(this.length, '0');
  }

  setBin(binaryValue, silent) {
    const state = parseInt(binaryValue, 2);
    const clamped = Math.max(0, Math.min(this.maxState, isNaN(state) ? 0 : state));
    if (clamped === this.state && !silent) return;
    this.state = clamped;
    this.ratio = sliderStateToRatio(clamped, this.maxState, this.reversed);
    this._updateThumb();
    if (!silent) {
      this.onChange(this.getBinary());
    }
  }
}

function addSlider({
  id,
  label = '',
  length = 4,
  color = '#6dff9c',
  orientation = 0,
  reversed = false,
  forLabels = {},
  onChange,
  nl = false,
  initialBin = null,
}) {
  const container = document.getElementById('devices');
  if (!container) return;
  if (typeof showDevices === 'function') showDevices();

  const wrapper = document.createElement('div');
  wrapper.className = 'slider-wrapper' + (orientation === 1 ? ' slider-vertical' : '');

  const lbl = document.createElement('span');
  lbl.className = 'slider-label';
  lbl.textContent = label ? label.slice(0, 5) : '';
  if (!label) lbl.style.visibility = 'hidden';

  const value = document.createElement('span');
  value.className = 'slider-value';
  value.style.color = color;

  const initialState = initialBin != null
    ? Math.max(0, Math.min((1 << length) - 1, parseInt(initialBin, 2) || 0))
    : 0;
  value.textContent = formatSliderDisplay(initialState, forLabels);

  const slider = new SliderWidget({
    length,
    color,
    orientation,
    reversed,
    forLabels,
    onChange: () => {},
    initialBin,
  });

  slider._valueElement = value;
  slider._forLabels = forLabels;

  slider.onChange = (bin) => {
    const stateNum = parseInt(bin, 2);
    const labels = slider._forLabels || forLabels || {};
    const displayLabel = formatSliderDisplay(stateNum, labels);
    if (slider._valueElement) {
      slider._valueElement.textContent = displayLabel;
    }
    if (onChange) onChange(bin);
  };

  wrapper.append(lbl);
  slider.mount(wrapper);
  wrapper.append(value);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  if (!window.sliders) {
    window.sliders = new Map();
  }
  window.sliders.set(id, slider);

  if (!window.sliderValues) {
    window.sliderValues = new Map();
  }
  window.sliderValues.set(id, { value, forLabels });
}

function setSlider(id, binaryValue) {
  if (!window.sliders) return;
  const slider = window.sliders.get(id);
  if (!slider) return;

  const state = parseInt(binaryValue, 2);
  const clamped = Math.max(0, Math.min(slider.maxState, isNaN(state) ? 0 : state));

  slider.setBin(binaryValue, true);

  const labels = slider._forLabels || {};
  const displayLabel = formatSliderDisplay(clamped, labels);

  if (slider._valueElement) {
    slider._valueElement.textContent = displayLabel;
  } else if (window.sliderValues) {
    const data = window.sliderValues.get(id);
    if (data && data.value) {
      const fl = data.forLabels || {};
      data.value.textContent = formatSliderDisplay(clamped, fl);
    }
  }
}
