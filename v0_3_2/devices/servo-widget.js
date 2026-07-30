/* ================= SERVO WIDGET (servo / piston / valve skins) ================= */

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

function servoCfgFromState(state) {
  return {
    length: state.length,
    minAngle: state.minAngle,
    maxAngle: state.maxAngle,
    reversed: state.reversed,
    display: state.display,
  };
}

function servoIsRotary(state) {
  if (typeof ServoComponent !== 'undefined' && ServoComponent.isRotaryDisplay) {
    return ServoComponent.isRotaryDisplay(state.display || 'servo');
  }
  return (state.display || 'servo') === 'servo';
}

function servoFractionFromPosition(state, position) {
  if (typeof ServoComponent !== 'undefined' && ServoComponent.fractionFromValue) {
    return ServoComponent.fractionFromValue(position, servoCfgFromState(state));
  }
  const vmax = state.vmax;
  let v = Math.max(0, Math.min(vmax, position | 0));
  if (state.reversed) v = vmax - v;
  return vmax > 0 ? v / vmax : 0;
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
  if (typeof ServoComponent !== 'undefined' && ServoComponent.travelStepsForMove) {
    return ServoComponent.travelStepsForMove(fromSteps, toSteps, path, false, 0, servoCfgFromState(state));
  }
  if (!servoIsRotary(state)) return Math.abs(toSteps - fromSteps);
  const wrap = (state.maxAngle - state.minAngle) === 360;
  if (typeof ServoComponent !== 'undefined' && ServoComponent.resolveTravelSteps) {
    return ServoComponent.resolveTravelSteps(fromSteps, toSteps, path, state.vmax, wrap).travel;
  }
  return Math.abs(toSteps - fromSteps);
}

function servoBuildRotaryGlyph() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'servo-glyph servo-glyph--rotary');

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

function servoBuildPistonGlyph() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 28');
  svg.setAttribute('class', 'servo-glyph servo-glyph--piston');

  const barrel = document.createElementNS(svgNS, 'rect');
  barrel.setAttribute('x', '4');
  barrel.setAttribute('y', '6');
  barrel.setAttribute('width', '28');
  barrel.setAttribute('height', '16');
  barrel.setAttribute('rx', '2');
  barrel.setAttribute('fill', 'none');
  barrel.setAttribute('stroke', 'currentColor');
  barrel.setAttribute('stroke-width', '2');
  svg.appendChild(barrel);

  const rodGroup = document.createElementNS(svgNS, 'g');
  rodGroup.setAttribute('class', 'servo-piston-rod');

  const piston = document.createElementNS(svgNS, 'rect');
  piston.setAttribute('x', '8');
  piston.setAttribute('y', '9');
  piston.setAttribute('width', '6');
  piston.setAttribute('height', '10');
  piston.setAttribute('rx', '1');
  piston.setAttribute('fill', 'currentColor');
  rodGroup.appendChild(piston);

  const rod = document.createElementNS(svgNS, 'rect');
  rod.setAttribute('x', '14');
  rod.setAttribute('y', '12');
  rod.setAttribute('width', '26');
  rod.setAttribute('height', '4');
  rod.setAttribute('fill', 'currentColor');
  rodGroup.appendChild(rod);

  svg.appendChild(rodGroup);
  return { svg, mover: rodGroup };
}

function servoBuildValveGlyph() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'servo-glyph servo-glyph--valve');

  const pipeL = document.createElementNS(svgNS, 'rect');
  pipeL.setAttribute('x', '2');
  pipeL.setAttribute('y', '16');
  pipeL.setAttribute('width', '12');
  pipeL.setAttribute('height', '8');
  pipeL.setAttribute('fill', 'none');
  pipeL.setAttribute('stroke', 'currentColor');
  pipeL.setAttribute('stroke-width', '2');
  svg.appendChild(pipeL);

  const pipeR = document.createElementNS(svgNS, 'rect');
  pipeR.setAttribute('x', '26');
  pipeR.setAttribute('y', '16');
  pipeR.setAttribute('width', '12');
  pipeR.setAttribute('height', '8');
  pipeR.setAttribute('fill', 'none');
  pipeR.setAttribute('stroke', 'currentColor');
  pipeR.setAttribute('stroke-width', '2');
  svg.appendChild(pipeR);

  const body = document.createElementNS(svgNS, 'circle');
  body.setAttribute('cx', '20');
  body.setAttribute('cy', '20');
  body.setAttribute('r', '9');
  body.setAttribute('fill', 'none');
  body.setAttribute('stroke', 'currentColor');
  body.setAttribute('stroke-width', '2');
  svg.appendChild(body);

  const pivot = document.createElementNS(svgNS, 'g');
  pivot.setAttribute('transform', 'translate(20 20)');

  const discGroup = document.createElementNS(svgNS, 'g');
  discGroup.setAttribute('class', 'servo-valve-disc');

  const disc = document.createElementNS(svgNS, 'line');
  disc.setAttribute('x1', '0');
  disc.setAttribute('y1', '-8');
  disc.setAttribute('x2', '0');
  disc.setAttribute('y2', '8');
  disc.setAttribute('stroke', 'currentColor');
  disc.setAttribute('stroke-width', '3');
  disc.setAttribute('stroke-linecap', 'round');
  discGroup.appendChild(disc);
  pivot.appendChild(discGroup);
  svg.appendChild(pivot);

  return { svg, mover: discGroup };
}

function servoApplyVisual(state, instant) {
  if (!state || !state.moverEl) return;
  const dur = instant ? 0 : state.pendingDurationMs;
  const transition = dur > 0 ? `transform ${dur}ms ease-out` : 'none';
  state.moverEl.style.transition = transition;

  const display = state.display || 'servo';
  if (display === 'piston') {
    const stroke = Math.max(8, (state.px || 48) * 0.35);
    const t = state.fraction;
    state.moverEl.style.transform = `translateX(${t * stroke}px)`;
    return;
  }
  if (display === 'valve') {
    const t = state.fraction;
    // SVG translate(20 20) is on the group; CSS rotate around local origin
    state.moverEl.style.transformOrigin = '0px 0px';
    state.moverEl.style.transform = `rotate(${t * 90}deg)`;
    return;
  }
  state.moverEl.style.transform = `rotate(${state.armRotationDeg}deg)`;
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
  display = 'servo',
  position = 0,
  nl = false,
  onMovingChange = null,
}) {
  const container = typeof getDevicesContainer === 'function' ? getDevicesContainer() : null;
  if (!container || !id) return;
  if (typeof showDevices === 'function') showDevices();

  const px = servoPxFromSize(size);
  const bits = Math.max(1, length | 0);
  const vmax = bits >= 31 ? 0x7FFFFFFF : ((1 << bits) - 1);
  const pos = Math.max(0, Math.min(vmax, position | 0));
  const disp = display || 'servo';

  const wrapper = document.createElement('div');
  wrapper.className = `servo-wrapper servo-wrapper--${disp}`;
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

  let moverEl;
  if (disp === 'piston') {
    const built = servoBuildPistonGlyph();
    body.appendChild(built.svg);
    moverEl = built.mover;
  } else if (disp === 'valve') {
    const built = servoBuildValveGlyph();
    body.appendChild(built.svg);
    moverEl = built.mover;
  } else {
    body.appendChild(servoBuildRotaryGlyph());
    const armEl = document.createElement('div');
    armEl.className = 'servo-arm';
    armEl.appendChild(body);
    wrapper.appendChild(armEl);
    moverEl = armEl;
  }

  if (disp === 'piston' || disp === 'valve') {
    wrapper.appendChild(body);
  }

  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  const baseState = {
    length: bits,
    minAngle,
    maxAngle,
    reversed: !!reversed,
    vmax,
    display: disp,
  };
  const startDeg = servoAngleFromPosition(baseState, pos);
  const startFrac = servoFractionFromPosition(baseState, pos);

  const state = {
    moverEl,
    wrapper,
    color,
    speed,
    rate,
    px,
    length: bits,
    minAngle,
    maxAngle,
    reversed: !!reversed,
    vmax,
    path,
    display: disp,
    position: pos,
    armRotationDeg: startDeg,
    fraction: startFrac,
    pendingDurationMs: 0,
    moving: false,
    onMovingChange,
    movingTimer: null,
  };

  servoApplyVisual(state, true);

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
    travelSteps = opts && opts.valueMagnitude !== undefined
      ? Math.abs(opts.valueMagnitude | 0)
      : Math.abs(toPos - fromPos);
  } else {
    travelSteps = servoTravelStepsCount(state, fromPos, toPos, path);
  }

  const moveSpeed = (opts && opts.speed !== undefined) ? (opts.speed | 0) : state.speed;
  const duration = servoSlewDurationMs(travelSteps, moveSpeed, state.rate);

  if (state.movingTimer) {
    clearTimeout(state.movingTimer);
    state.movingTimer = null;
  }

  state.position = toPos;
  state.path = path;
  state.pendingDurationMs = duration;
  state.fraction = servoFractionFromPosition(state, toPos);

  if (servoIsRotary(state)) {
    const deltaDeg = servoTravelDegrees(state, fromPos, toPos, path);
    state.armRotationDeg += deltaDeg;
  } else {
    state.armRotationDeg = servoAngleFromPosition(state, toPos);
  }

  servoApplyVisual(state, duration <= 0);

  const movingNow = duration > 0 && travelSteps > 0;
  state.moving = movingNow;
  if (typeof state.onMovingChange === 'function') {
    state.onMovingChange(movingNow ? 1 : 0);
  }
  if (movingNow) {
    state.movingTimer = setTimeout(() => {
      state.movingTimer = null;
      state.moving = false;
      if (typeof state.onMovingChange === 'function') {
        state.onMovingChange(0);
      }
    }, duration);
  }
}
