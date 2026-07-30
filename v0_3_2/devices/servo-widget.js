/* ================= SERVO WIDGET ================= */

const SERVO_SIZE_DEFAULT = 10;
const SERVO_SIZE_MIN = 1;
const SERVO_SIZE_MAX = 20;
const SERVO_PX_MIN = 32;
const SERVO_PX_MAX = 76;

function clampServoSize(size) {
  let s = size !== undefined ? parseInt(size, 10) : SERVO_SIZE_DEFAULT;
  if (isNaN(s)) s = SERVO_SIZE_DEFAULT;
  return Math.max(SERVO_SIZE_MIN, Math.min(SERVO_SIZE_MAX, s));
}

function servoPxFromSize(size) {
  const s = clampServoSize(size);
  return Math.round(
    SERVO_PX_MIN + ((s - 1) / (SERVO_SIZE_MAX - 1)) * (SERVO_PX_MAX - SERVO_PX_MIN)
  );
}

function servoSlewDurationMs(travelSteps, speed, rate) {
  if (typeof ServoComponent !== 'undefined' && ServoComponent.slewDurationMs) {
    return ServoComponent.slewDurationMs(travelSteps, speed, rate);
  }
  const steps = Math.abs(travelSteps | 0);
  if (steps <= 0) return 0;
  const sp = Math.max(1, Math.min(100, speed || 10));
  const rt = Math.max(1, Math.min(100, rate || 10));
  const eff = Math.max(0.1, sp * (rt / 10));
  return Math.max(40, Math.min(5000, (steps * 24) / eff));
}

function servoBuildGlyph(color) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'servo-glyph');
  svg.style.setProperty('--servo-color', color);

  const base = document.createElementNS(svgNS, 'path');
  base.setAttribute('d', 'M8 28 A12 12 0 0 1 32 28 L32 34 L8 34 Z');
  base.setAttribute('fill', 'none');
  base.setAttribute('stroke', 'currentColor');
  base.setAttribute('stroke-width', '2');
  svg.appendChild(base);

  const hub = document.createElementNS(svgNS, 'circle');
  hub.setAttribute('cx', '20');
  hub.setAttribute('cy', '28');
  hub.setAttribute('r', '4');
  hub.setAttribute('fill', 'currentColor');
  svg.appendChild(hub);

  const arm = document.createElementNS(svgNS, 'line');
  arm.setAttribute('class', 'servo-horn-line');
  arm.setAttribute('x1', '20');
  arm.setAttribute('y1', '28');
  arm.setAttribute('x2', '20');
  arm.setAttribute('y2', '8');
  arm.setAttribute('stroke', 'currentColor');
  arm.setAttribute('stroke-width', '3');
  arm.setAttribute('stroke-linecap', 'round');
  svg.appendChild(arm);

  return svg;
}

function servoCfgFromState(state) {
  return {
    length: state.length,
    minAngle: state.minAngle,
    maxAngle: state.maxAngle,
    reversed: state.reversed,
  };
}

function servoAngleFromPosition(state, position) {
  if (typeof ServoComponent !== 'undefined' && ServoComponent.angleFromValue) {
    return ServoComponent.angleFromValue(position, servoCfgFromState(state));
  }
  const vmax = state.vmax;
  const span = state.maxAngle - state.minAngle;
  let v = Math.max(0, Math.min(vmax, position | 0));
  if (state.reversed) v = vmax - v;
  return state.minAngle + (v / vmax) * span;
}

function servoTravelDegrees(state, fromSteps, toSteps, path) {
  if (typeof ServoComponent !== 'undefined' && ServoComponent.travelDegrees) {
    return ServoComponent.travelDegrees(fromSteps, toSteps, path, servoCfgFromState(state));
  }
  return (toSteps - fromSteps) * ((state.maxAngle - state.minAngle) / state.vmax);
}

function servoTravelStepsCount(state, fromSteps, toSteps, path) {
  const wrap = (state.maxAngle - state.minAngle) === 360;
  if (typeof ServoComponent !== 'undefined' && ServoComponent.resolveTravelSteps) {
    return ServoComponent.resolveTravelSteps(fromSteps, toSteps, path, state.vmax, wrap).travel;
  }
  return Math.abs(toSteps - fromSteps);
}

function servoApplyArm(state, instant) {
  if (!state || !state.armEl) return;
  const deg = state.armRotationDeg;
  const dur = instant ? 0 : state.pendingDurationMs;
  state.armEl.style.transition = dur > 0 ? `transform ${dur}ms ease-out` : 'none';
  state.armEl.style.transform = `rotate(${deg}deg)`;
}

function addServo({
  id,
  text = '',
  color = '#6dff9c',
  size = 10,
  speed = 10,
  rate = 10,
  rotate = 0,
  flip = false,
  reversed = false,
  length = 8,
  minAngle = 0,
  maxAngle = 180,
  path = 'short',
  position = 0,
  nl = false,
}) {
  const container = typeof getDevicesContainer === 'function' ? getDevicesContainer() : null;
  if (!container || !id) return;
  if (typeof showDevices === 'function') showDevices();

  const px = servoPxFromSize(size);
  const bits = Math.max(1, length | 0);
  const vmax = bits >= 31 ? 0x7FFFFFFF : ((1 << bits) - 1);
  const pos = Math.max(0, Math.min(vmax, position | 0));
  const startDeg = servoAngleFromPosition({ length: bits, minAngle, maxAngle, reversed, vmax }, pos);

  const wrapper = document.createElement('div');
  wrapper.className = 'servo-wrapper';
  wrapper.style.setProperty('--servo-color', color);
  wrapper.style.setProperty('--servo-size', `${px}px`);

  const transforms = [];
  if (rotate) transforms.push(`rotate(${rotate}deg)`);
  if (flip) transforms.push('scaleX(-1)');
  if (transforms.length) wrapper.style.transform = transforms.join(' ');

  if (text) {
    const label = document.createElement('span');
    label.className = 'servo-label';
    label.textContent = String(text).slice(0, 5);
    wrapper.appendChild(label);
  }

  const body = document.createElement('div');
  body.className = 'servo-body';
  body.appendChild(servoBuildGlyph(color));

  const armEl = document.createElement('div');
  armEl.className = 'servo-arm';
  armEl.appendChild(body);
  wrapper.appendChild(armEl);

  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  const state = {
    armEl,
    wrapper,
    color,
    speed,
    rate,
    length: bits,
    minAngle,
    maxAngle,
    reversed: !!reversed,
    vmax,
    path,
    position: pos,
    armRotationDeg: startDeg,
    pendingDurationMs: 0,
  };

  servoApplyArm(state, true);

  const maps = typeof dm === 'function' ? dm() : null;
  if (maps) {
    if (!maps.servos) maps.servos = new Map();
    maps.servos.set(id, state);
  }
}

function setServo(id, opts) {
  const maps = typeof getDeviceMaps === 'function' ? getDeviceMaps() : (typeof dm === 'function' ? dm() : null);
  if (!maps || !maps.servos) return;
  const state = maps.servos.get(id);
  if (!state) return;

  const fromPos = opts && opts.fromPosition !== undefined ? (opts.fromPosition | 0) : state.position;
  const toPos = opts && opts.position !== undefined ? (opts.position | 0) : state.position;
  const path = (opts && opts.path) || state.path || 'short';
  const rel = !!(opts && opts.rel);

  let travelSteps;
  if (rel) {
    travelSteps = Math.abs(toPos - fromPos);
    if (travelSteps === 0 && opts && opts.valueMagnitude !== undefined) {
      travelSteps = opts.valueMagnitude | 0;
    }
  } else {
    travelSteps = servoTravelStepsCount(state, fromPos, toPos, path);
  }

  const deltaDeg = servoTravelDegrees(state, fromPos, toPos, path);
  const moveSpeed = (opts && opts.speed !== undefined) ? (opts.speed | 0) : state.speed;
  const duration = servoSlewDurationMs(travelSteps, moveSpeed, state.rate);

  state.position = toPos;
  state.path = path;
  state.pendingDurationMs = duration;
  state.armRotationDeg += deltaDeg;
  servoApplyArm(state, duration <= 0);
}
