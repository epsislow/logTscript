/* ================= ROTARY KNOB ================= */

class RotaryKnob {
  constructor({
                states = 8,
                size = 64,
                color = "#6dff9c",
                analog = true,
                onChange = () => {},
                forLabels = {}
              }) {
    if (states < 2) {
      throw new Error("states must be >= 2");
    }

    this.states = states;
    this.bits = Math.ceil(Math.log2(states));
    this.size = size;
    this.activeColor = color;
    this.analog = analog;
    this.onChange = onChange;
    this.forLabels = forLabels;
    this.pressed = false;

    this.state = 0;

    this.angleRatio = 0;

    this.dragStartY = null;
    this.startRatio = 0;

    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size + 10;
    this.ctx = this.canvas.getContext("2d");

    this._bindEvents();
    this.draw();
  }

  mount(parent) {
    parent.appendChild(this.canvas);
  }

  _getStateMultiplier() {
    return Math.sqrt(this.states / 8);
  }

  _bindEvents() {
    const DRAG_RANGE = 120;

    const start = y => {
      this.dragStartY = y;
      this.startRatio = this.angleRatio;
      this.pressed = true;
      this.draw();
    };

    const move = y => {
      if (this.dragStartY === null) return;

      const delta = this.dragStartY - y;
      const multiplier = this._getStateMultiplier();

      let ratio =
          this.startRatio +
          delta / (DRAG_RANGE * multiplier);

      ratio = Math.max(0, Math.min(1, ratio));

      if (this.analog) {
        this.angleRatio = ratio;

        const newState = Math.round(
            ratio * (this.states - 1)
        );

        if (newState !== this.state) {
          this.state = newState;
          this.onChange(this.getBinary());
        }

        this.draw();
      } else {
        const newState = Math.round(
            ratio * (this.states - 1)
        );
        this.setState(newState);
      }
    };

    const end = () => {
      this.dragStartY = null;
      this.pressed = false;

      if (this.analog) {
        this.angleRatio =
            this.state / (this.states - 1);
        this.draw();
      }
    };

    this.canvas.addEventListener("mousedown", e =>
        start(e.clientY)
    );
    window.addEventListener("mousemove", e =>
        move(e.clientY)
    );
    window.addEventListener("mouseup", end);

    this.canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      start(e.touches[0].clientY);
    });

    window.addEventListener("touchmove", e => {
      if (!e.touches[0]) return;
      move(e.touches[0].clientY);
    });

    window.addEventListener("touchend", end);
  }

  setState(value) {
    const clamped = Math.max(
        0,
        Math.min(this.states - 1, value)
    );

    if (clamped === this.state) return;

    this.state = clamped;
    this.angleRatio =
        clamped / (this.states - 1);

    this.draw();
    this.onChange(this.getBinary());
  }

  getBinary() {
    return this.state
        .toString(2)
        .padStart(this.bits, "0");
  }

  draw() {
    const ctx = this.ctx;
    const s = this.size;
    const r = s / 2;

    const START_ANGLE = -135 * Math.PI / 180;

    const ARC_DEGREES = this.states === 2 ? 145 : 270;

    const RANGE =
        (ARC_DEGREES * Math.PI) / 180;

    const END_ANGLE =
        START_ANGLE + RANGE;

    ctx.clearRect(0, 0, s, s + 10);

   ctx.fillStyle = "#090909";
   ctx.beginPath();
   ctx.arc(r, r+5, r - 2, 0, Math.PI * 2);
   ctx.fill();

    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.arc(r, r, r - 6, START_ANGLE, END_ANGLE);
    ctx.stroke();

    const maxTicks = Math.min(this.states, 16);
    for (let i = 0; i < maxTicks; i++) {
      const t = i / (maxTicks - 1);
      const angle = START_ANGLE + t * RANGE;

      const isEdge =
          i === 0 || i === maxTicks - 1;

      ctx.strokeStyle = isEdge
          ? this.activeColor
          : "#555";

      ctx.lineWidth = isEdge ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.moveTo(
          r + Math.cos(angle) * (r - 14),
          r + Math.sin(angle) * (r - 14)
      );
      ctx.lineTo(
          r + Math.cos(angle) * (r - 20),
          r + Math.sin(angle) * (r - 20)
      );
      ctx.stroke();
    }

    if (this.state > 0) {
      ctx.shadowColor = this.activeColor + "50";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = this.activeColor + "ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r, r, r - 8, START_ANGLE, END_ANGLE);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (this.pressed) {
      ctx.save();

      ctx.beginPath();
      ctx.arc(r, r, r - 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fill();
      ctx.restore();
    }

    const pointerAngle =
        START_ANGLE +
        this.angleRatio * RANGE;

    ctx.strokeStyle = "#e6fff0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r, r);
    ctx.lineTo(
        r + Math.cos(pointerAngle) * (r - 16),
        r + Math.sin(pointerAngle) * (r - 16)
    );
    ctx.stroke();

    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.arc(r, r, 6, 0, Math.PI * 2);
    ctx.fill();
    if (this.pressed) {
      ctx.fillStyle = this.activeColor + "30";
      ctx.beginPath();
      ctx.arc(r, r, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function addRotaryKnob({
                          id,
                          label = "",
                          states = 8,
                          onChange,
                          color = "#6dff9c",
                          forLabels = {},
                        }) {
    const analog = true;
  const container = document.getElementById("devices");
  if (!container) return;
  showDevices();

  const wrapper = document.createElement("div");
  wrapper.className = "knob-wrapper";

  const lbl = document.createElement("span");
  lbl.className = "knob-label";
  lbl.textContent = label ? label.slice(0, 5) : "";
  if (!label) lbl.style.visibility = "hidden";

  const value = document.createElement("span");
  value.className = "knob-value";
  value.style = "color: " + color;
  
  const initialState = 0;
  const initialLabel = forLabels[initialState] !== undefined ? forLabels[initialState] : initialState.toString();
  value.textContent = initialLabel;

  const knob = new RotaryKnob({
    states,
    color,
    onChange: () => {},
    analog,
    forLabels: forLabels,
  });
  
  knob._valueElement = value;
  knob._forLabels = forLabels;
  
  knob.onChange = (bin) => {
    const stateNum = parseInt(bin, 2);
    const labels = knob._forLabels || forLabels || {};
    const displayLabel = (labels[stateNum] !== undefined) ? labels[stateNum] : stateNum.toString();
    if(knob._valueElement) {
      knob._valueElement.textContent = displayLabel;
    } else {
      const wrapper = knob.canvas.parentElement;
      if(wrapper) {
        const valueEl = wrapper.querySelector('.knob-value');
        if(valueEl) {
          valueEl.textContent = displayLabel;
          knob._valueElement = valueEl;
        }
      }
    }
    if(onChange) onChange(bin);
  };

  wrapper.append(lbl);
  knob.mount(wrapper);
  wrapper.append(value);

  container.appendChild(wrapper);
  
  if (!window.rotaryKnobs) {
    window.rotaryKnobs = new Map();
  }
  window.rotaryKnobs.set(id, knob);
  
  if (!window.rotaryKnobValues) {
    window.rotaryKnobValues = new Map();
  }
  window.rotaryKnobValues.set(id, { value: value, forLabels: forLabels });
}

function setRotaryKnob(id, binaryValue) {
  if (!window.rotaryKnobs) {
    return;
  }
  
  const knob = window.rotaryKnobs.get(id);
  if (!knob) {
    return;
  }
  
  const state = parseInt(binaryValue, 2);
  
  const clampedState = Math.max(0, Math.min(knob.states - 1, state));
  
  knob.setState(clampedState);
  
  if (knob._valueElement && knob._forLabels) {
    const displayLabel = (knob._forLabels[clampedState] !== undefined) ? knob._forLabels[clampedState] : clampedState.toString();
    knob._valueElement.textContent = displayLabel;
  } else if (window.rotaryKnobValues) {
    const knobData = window.rotaryKnobValues.get(id);
    if (knobData && knobData.value) {
      const forLabels = knobData.forLabels || {};
      const displayLabel = forLabels[clampedState] !== undefined ? forLabels[clampedState] : clampedState.toString();
      knobData.value.textContent = displayLabel;
    }
  }
}
