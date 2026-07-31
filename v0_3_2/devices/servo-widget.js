/* ================= SERVO WIDGET (Canvas 2D) ================= */

const SERVO_SIZE_DEFAULT = 10;
const SERVO_SIZE_MIN = 1;
const SERVO_SIZE_MAX = 20;
const SERVO_PX_MIN = 32;
const SERVO_PX_MAX = 76;
const SERVO_GLOW_BLUR = 10;
const SERVO_CANVAS_PAD = 4;

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
  const d = state.display || 'servo';
  return d === 'servo' || d === 'gauge';
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

function servoSetupCanvas(canvas, cssW, cssH) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function servoGlow(ctx, color, drawFn) {
  if (typeof PanelAnimRaf !== 'undefined' && PanelAnimRaf.withGlow) {
    PanelAnimRaf.withGlow(ctx, color, SERVO_GLOW_BLUR, drawFn);
  } else {
    drawFn();
  }
}

function servoDrawRotary(ctx, state, ox, oy, scale) {
  const color = state.color || '#6dff9c';
  const deg = state.visualAngleDeg;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // base: M8 28 A12 12 0 0 1 32 28 L32 34 L8 34 Z
  ctx.beginPath();
  ctx.moveTo(8, 28);
  ctx.arc(20, 28, 12, Math.PI, 0, false);
  ctx.lineTo(32, 34);
  ctx.lineTo(8, 34);
  ctx.closePath();
  servoGlow(ctx, color, () => ctx.stroke());

  ctx.beginPath();
  ctx.arc(20, 28, 4, 0, Math.PI * 2);
  servoGlow(ctx, color, () => ctx.fill());

  ctx.save();
  ctx.translate(20, 28);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -20);
  servoGlow(ctx, color, () => ctx.stroke());
  ctx.restore();

  ctx.restore();
}

function servoDrawGauge(ctx, state, ox, oy, scale) {
  const color = state.color || '#6dff9c';
  const deg = state.visualAngleDeg;
  let a0 = state.minAngle | 0;
  let a1 = state.maxAngle | 0;
  if (!(a0 < a1)) { a0 = 0; a1 = 180; }

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(20, 20, 16, 0, Math.PI * 2);
  servoGlow(ctx, color, () => ctx.stroke());

  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const tickDeg = a0 + ((a1 - a0) * i) / 4;
    const a = (tickDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(20 + Math.sin(a) * 11, 20 - Math.cos(a) * 11);
    ctx.lineTo(20 + Math.sin(a) * 15, 20 - Math.cos(a) * 15);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(20, 20);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -12);
  servoGlow(ctx, color, () => ctx.stroke());
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  servoGlow(ctx, color, () => ctx.fill());
  ctx.restore();

  ctx.restore();
}

function servoDrawPiston(ctx, state, ox, oy, scale) {
  const color = state.color || '#6dff9c';
  const t = state.visualFraction;
  const stroke = 16;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(4, 6, 28, 16, 2);
  else {
    ctx.rect(4, 6, 28, 16);
  }
  servoGlow(ctx, color, () => ctx.stroke());

  ctx.save();
  ctx.translate(t * stroke, 0);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(8, 9, 6, 10, 1);
  else ctx.rect(8, 9, 6, 10);
  servoGlow(ctx, color, () => ctx.fill());
  ctx.fillRect(14, 12, 26, 4);
  ctx.restore();

  ctx.restore();
}

function servoDrawValve(ctx, state, ox, oy, scale) {
  const color = state.color || '#6dff9c';
  const t = state.visualFraction;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  ctx.strokeRect(2, 16, 12, 8);
  ctx.strokeRect(26, 16, 12, 8);
  ctx.beginPath();
  ctx.arc(20, 20, 9, 0, Math.PI * 2);
  servoGlow(ctx, color, () => ctx.stroke());

  ctx.save();
  ctx.translate(20, 20);
  ctx.rotate((t * 90 * Math.PI) / 180);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  servoGlow(ctx, color, () => ctx.stroke());
  ctx.restore();

  ctx.restore();
}

function servoDrawSlide(ctx, state, ox, oy, scale) {
  const color = state.color || '#6dff9c';
  const t = state.visualFraction;
  const stroke = 16;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(4, 4, 40, 24, 1);
  else ctx.rect(4, 4, 40, 24);
  servoGlow(ctx, color, () => ctx.stroke());

  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 28);
  ctx.lineTo(42, 28);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(t * stroke, 0);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(6, 6, 18, 20, 1);
  else ctx.rect(6, 6, 18, 20);
  servoGlow(ctx, color, () => ctx.fill());
  ctx.restore();

  ctx.restore();
}

function servoViewBoxForDisplay(display) {
  if (display === 'piston') return { vw: 48, vh: 28 };
  if (display === 'slide') return { vw: 48, vh: 32 };
  return { vw: 40, vh: 40 };
}

function servoPaint(state) {
  if (!state || !state.ctx || !state.canvas) return;
  const { vw, vh } = servoViewBoxForDisplay(state.display);
  const pad = SERVO_CANVAS_PAD;
  const cssW = state.cssW;
  const cssH = state.cssH;
  const ctx = state.ctx;
  ctx.clearRect(0, 0, cssW, cssH);

  const innerW = cssW - pad * 2;
  const innerH = cssH - pad * 2;
  const scale = Math.min(innerW / vw, innerH / vh);
  const ox = pad + (innerW - vw * scale) / 2;
  const oy = pad + (innerH - vh * scale) / 2;

  const d = state.display || 'servo';
  if (d === 'gauge') servoDrawGauge(ctx, state, ox, oy, scale);
  else if (d === 'piston') servoDrawPiston(ctx, state, ox, oy, scale);
  else if (d === 'valve') servoDrawValve(ctx, state, ox, oy, scale);
  else if (d === 'slide') servoDrawSlide(ctx, state, ox, oy, scale);
  else servoDrawRotary(ctx, state, ox, oy, scale);
}

function servoAnimId(id) {
  return `servo:${id}`;
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
  if (!container || !id || typeof document === 'undefined') return;
  if (typeof showDevices === 'function') showDevices();

  const px = servoPxFromSize(size);
  const bits = Math.max(1, length | 0);
  const vmax = bits >= 31 ? 0x7FFFFFFF : ((1 << bits) - 1);
  const pos = Math.max(0, Math.min(vmax, position | 0));
  const disp = display || 'servo';
  const { vw, vh } = servoViewBoxForDisplay(disp);
  const aspect = vh / vw;
  const cssW = px + SERVO_CANVAS_PAD * 2;
  const cssH = Math.round(px * aspect) + SERVO_CANVAS_PAD * 2;

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

  const canvas = document.createElement('canvas');
  canvas.className = 'servo-canvas';
  const ctx = servoSetupCanvas(canvas, cssW, cssH);
  wrapper.appendChild(canvas);
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
    id,
    canvas,
    ctx,
    cssW,
    cssH,
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
    visualAngleDeg: startDeg,
    visualFraction: startFrac,
    armRotationDeg: startDeg,
    fraction: startFrac,
    moving: false,
    onMovingChange,
  };

  servoPaint(state);

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

  const fromFrac = state.visualFraction;
  const toFrac = servoFractionFromPosition(state, toPos);
  const fromDeg = state.visualAngleDeg;
  let toDeg;
  if (state.display === 'gauge') {
    toDeg = servoAngleFromPosition(state, toPos);
  } else if (servoIsRotary(state) && state.display !== 'gauge') {
    toDeg = fromDeg + servoTravelDegrees(state, fromPos, toPos, path);
  } else {
    toDeg = servoAngleFromPosition(state, toPos);
  }

  state.position = toPos;
  state.path = path;
  state.fraction = toFrac;
  state.armRotationDeg = toDeg;

  if (typeof PanelAnimRaf !== 'undefined') {
    PanelAnimRaf.stop(servoAnimId(id));
  }

  const movingNow = duration > 0 && travelSteps > 0;
  state.moving = movingNow;
  if (typeof state.onMovingChange === 'function') {
    state.onMovingChange(movingNow ? 1 : 0);
  }

  if (!movingNow || !state.ctx) {
    state.visualFraction = toFrac;
    state.visualAngleDeg = toDeg;
    servoPaint(state);
    return;
  }

  const t0 = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
  const ease = (typeof PanelAnimRaf !== 'undefined' && PanelAnimRaf.easeOutCubic)
    ? PanelAnimRaf.easeOutCubic
    : (t) => t;

  PanelAnimRaf.start(servoAnimId(id), (now) => {
    const u = ease((now - t0) / duration);
    state.visualFraction = fromFrac + (toFrac - fromFrac) * u;
    state.visualAngleDeg = fromDeg + (toDeg - fromDeg) * u;
    servoPaint(state);
    if (u >= 1) {
      state.visualFraction = toFrac;
      state.visualAngleDeg = toDeg;
      state.moving = false;
      servoPaint(state);
      if (typeof state.onMovingChange === 'function') {
        state.onMovingChange(0);
      }
      return false;
    }
    return true;
  });
}
