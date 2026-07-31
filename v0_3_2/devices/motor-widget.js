/* ================= MOTOR WIDGET (Canvas 2D) ================= */

const MOTOR_SIZE_DEFAULT = 10;
const MOTOR_SIZE_MIN = 1;
const MOTOR_SIZE_MAX = 20;
const MOTOR_PX_MIN = 28;
const MOTOR_PX_MAX = 72;
const MOTOR_GLOW_BLUR = 10;
const MOTOR_CANVAS_PAD = 4;

function clampMotorSize(size) {
  let s = size !== undefined ? parseInt(size, 10) : MOTOR_SIZE_DEFAULT;
  if (isNaN(s)) s = MOTOR_SIZE_DEFAULT;
  return Math.max(MOTOR_SIZE_MIN, Math.min(MOTOR_SIZE_MAX, s));
}

function motorPxFromSize(size) {
  const s = clampMotorSize(size);
  return Math.round(
    MOTOR_PX_MIN + ((s - 1) / (MOTOR_SIZE_MAX - 1)) * (MOTOR_PX_MAX - MOTOR_PX_MIN)
  );
}

function motorPeriodSeconds(speed, length, rate) {
  if (typeof MotorComponent !== 'undefined' && MotorComponent.animationPeriod) {
    return MotorComponent.animationPeriod(speed, length, rate);
  }
  const vmax = length <= 1 ? 1 : ((1 << length) - 1);
  const v = Math.max(0, Math.min(vmax, speed | 0));
  const factor = Math.max(0.1, Math.min(10, (rate || 10) / 10));
  if (v === 0) return null;
  let base = length <= 1 ? 1.0 : (2.0 - (2.0 - 0.15) * ((v - 1) / Math.max(1, vmax - 1)));
  return Math.max(0.08, base / factor);
}

function motorSetupCanvas(canvas, cssW, cssH) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function motorGlow(ctx, color, drawFn) {
  if (typeof PanelAnimRaf !== 'undefined' && PanelAnimRaf.withGlow) {
    PanelAnimRaf.withGlow(ctx, color, MOTOR_GLOW_BLUR, drawFn);
  } else {
    drawFn();
  }
}

function motorAnimId(id) {
  return `motor:${id}`;
}

function motorPaint(state) {
  if (!state || !state.ctx || !state.canvas) return;
  const pad = MOTOR_CANVAS_PAD;
  const cssW = state.cssW;
  const cssH = state.cssH;
  const ctx = state.ctx;
  const color = state.color || '#6dff9c';
  const kind = state.kind || 'rotor';

  ctx.clearRect(0, 0, cssW, cssH);

  const inner = Math.min(cssW, cssH) - pad * 2;
  const scale = inner / 40;
  const ox = (cssW - 40 * scale) / 2;
  const oy = (cssH - 40 * scale) / 2;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.translate(20, 20);
  ctx.rotate((state.spinDeg * Math.PI) / 180);
  ctx.translate(-20, -20);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(20, 20, 15, 0, Math.PI * 2);
  motorGlow(ctx, color, () => ctx.stroke());

  if (kind === 'fan') {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(20, 20);
      ctx.rotate((i * 120 * Math.PI) / 180);
      ctx.translate(-20, -20);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(20, 11, 4, 9, 0, 0, Math.PI * 2);
      motorGlow(ctx, color, () => ctx.fill());
      ctx.restore();
    }
  } else if (kind === 'pump') {
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(20, 20);
      ctx.rotate((i * 60 * Math.PI) / 180);
      ctx.translate(-20, -20);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(22, 8);
      ctx.quadraticCurveTo(20, 6, 18, 8);
      ctx.closePath();
      motorGlow(ctx, color, () => ctx.fill());
      ctx.restore();
    }
  } else {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(18, 6, 4, 14, 1);
    else ctx.rect(18, 6, 4, 14);
    motorGlow(ctx, color, () => ctx.fill());
  }

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(20, 20, 3.5, 0, Math.PI * 2);
  motorGlow(ctx, color, () => ctx.fill());

  ctx.restore();
}

function motorSyncSpinLoop(state) {
  if (!state || !state.id) return;

  if (typeof PanelAnimRaf !== 'undefined') {
    PanelAnimRaf.stop(motorAnimId(state.id));
  }

  const period = motorPeriodSeconds(state.speed, state.length, state.rate);
  if (period == null || !state.ctx) {
    motorPaint(state);
    return;
  }

  let last = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();

  PanelAnimRaf.start(motorAnimId(state.id), (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const p = motorPeriodSeconds(state.speed, state.length, state.rate);
    if (p == null) {
      motorPaint(state);
      return false;
    }
    const xor = (state.reversed ? 1 : 0) ^ (state.dir ? 1 : 0);
    const sign = xor ? -1 : 1;
    state.spinDeg = (state.spinDeg + sign * 360 * (dt / p)) % 360;
    motorPaint(state);
    return true;
  });
}

function addMotor({
  id,
  kind = 'rotor',
  text = '',
  color = '#6dff9c',
  size = 10,
  rate = 10,
  rotate = 0,
  flip = false,
  reversed = false,
  length = 1,
  speed = 0,
  dir = 0,
  nl = false,
}) {
  const container = typeof getDevicesContainer === 'function' ? getDevicesContainer() : null;
  if (!container || !id || typeof document === 'undefined') return;
  if (typeof showDevices === 'function') showDevices();

  const px = motorPxFromSize(size);
  const cssW = px + MOTOR_CANVAS_PAD * 2;
  const cssH = px + MOTOR_CANVAS_PAD * 2;

  const wrapper = document.createElement('div');
  wrapper.className = 'motor-wrapper';
  wrapper.style.setProperty('--motor-color', color);
  wrapper.style.setProperty('--motor-size', `${px}px`);

  const transforms = [];
  if (rotate) transforms.push(`rotate(${rotate}deg)`);
  if (flip) transforms.push('scaleX(-1)');
  if (transforms.length) wrapper.style.transform = transforms.join(' ');

  if (text) {
    const label = document.createElement('span');
    label.className = 'motor-label';
    label.textContent = String(text).slice(0, 5);
    wrapper.appendChild(label);
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'motor-canvas';
  const ctx = motorSetupCanvas(canvas, cssW, cssH);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  const state = {
    id,
    canvas,
    ctx,
    cssW,
    cssH,
    wrapper,
    kind,
    color,
    rate,
    length,
    reversed: !!reversed,
    dir: dir ? 1 : 0,
    speed: speed | 0,
    spinDeg: 0,
  };

  const maps = typeof dm === 'function' ? dm() : null;
  if (maps) {
    if (!maps.motors) maps.motors = new Map();
    maps.motors.set(id, state);
  }

  motorSyncSpinLoop(state);
}

function setMotor(id, opts) {
  const maps = typeof getDeviceMaps === 'function' ? getDeviceMaps() : (typeof dm === 'function' ? dm() : null);
  if (!maps || !maps.motors) return;
  const state = maps.motors.get(id);
  if (!state) return;
  if (opts && opts.speed !== undefined) state.speed = opts.speed | 0;
  if (opts && opts.dir !== undefined) state.dir = opts.dir ? 1 : 0;
  if (opts && opts.rate !== undefined) state.rate = opts.rate;
  motorSyncSpinLoop(state);
}
