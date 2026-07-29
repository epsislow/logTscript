/* ================= MOTOR WIDGET ================= */

const MOTOR_SIZE_DEFAULT = 10;
const MOTOR_SIZE_MIN = 1;
const MOTOR_SIZE_MAX = 20;
const MOTOR_PX_MIN = 28;
const MOTOR_PX_MAX = 72;

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

function motorBuildGlyph(kind, color) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'motor-glyph');
  svg.style.setProperty('--motor-color', color);

  const ring = document.createElementNS(svgNS, 'circle');
  ring.setAttribute('cx', '20');
  ring.setAttribute('cy', '20');
  ring.setAttribute('r', '15');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', 'currentColor');
  ring.setAttribute('stroke-width', '2');
  svg.appendChild(ring);

  if (kind === 'fan') {
    for (let i = 0; i < 3; i++) {
      const blade = document.createElementNS(svgNS, 'ellipse');
      blade.setAttribute('cx', '20');
      blade.setAttribute('cy', '11');
      blade.setAttribute('rx', '4');
      blade.setAttribute('ry', '9');
      blade.setAttribute('fill', 'currentColor');
      blade.setAttribute('opacity', '0.85');
      blade.setAttribute('transform', `rotate(${i * 120} 20 20)`);
      svg.appendChild(blade);
    }
  } else if (kind === 'pump') {
    for (let i = 0; i < 6; i++) {
      const vane = document.createElementNS(svgNS, 'path');
      vane.setAttribute('d', 'M20 20 L22 8 Q20 6 18 8 Z');
      vane.setAttribute('fill', 'currentColor');
      vane.setAttribute('opacity', '0.9');
      vane.setAttribute('transform', `rotate(${i * 60} 20 20)`);
      svg.appendChild(vane);
    }
  } else {
    const notch = document.createElementNS(svgNS, 'rect');
    notch.setAttribute('x', '18');
    notch.setAttribute('y', '6');
    notch.setAttribute('width', '4');
    notch.setAttribute('height', '14');
    notch.setAttribute('rx', '1');
    notch.setAttribute('fill', 'currentColor');
    svg.appendChild(notch);
  }

  const hub = document.createElementNS(svgNS, 'circle');
  hub.setAttribute('cx', '20');
  hub.setAttribute('cy', '20');
  hub.setAttribute('r', '3.5');
  hub.setAttribute('fill', 'currentColor');
  svg.appendChild(hub);

  return svg;
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
  if (!container || !id) return;
  if (typeof showDevices === 'function') showDevices();

  const px = motorPxFromSize(size);
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

  const rotor = document.createElement('div');
  rotor.className = 'motor-rotor';
  rotor.appendChild(motorBuildGlyph(kind, color));
  wrapper.appendChild(rotor);

  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  const state = {
    el: rotor,
    wrapper,
    kind,
    color,
    rate,
    length,
    reversed: !!reversed,
    dir: dir ? 1 : 0,
    speed: speed | 0,
  };

  const maps = typeof dm === 'function' ? dm() : null;
  if (maps) {
    if (!maps.motors) maps.motors = new Map();
    maps.motors.set(id, state);
  }

  motorApplyAnimation(state);
}

function motorApplyAnimation(state) {
  if (!state || !state.el) return;
  const period = motorPeriodSeconds(state.speed, state.length, state.rate);
  const xorRev = (state.reversed ? 1 : 0) ^ (state.dir ? 1 : 0);
  state.el.style.animationDirection = xorRev ? 'reverse' : 'normal';
  if (period == null) {
    state.el.classList.remove('motor-spinning');
    state.el.style.animationDuration = '';
    state.el.style.setProperty('--motor-period', '0s');
  } else {
    state.el.style.setProperty('--motor-period', `${period}s`);
    state.el.style.animationDuration = `${period}s`;
    state.el.classList.add('motor-spinning');
  }
}

function setMotor(id, opts) {
  const maps = typeof getDeviceMaps === 'function' ? getDeviceMaps() : (typeof dm === 'function' ? dm() : null);
  if (!maps || !maps.motors) return;
  const state = maps.motors.get(id);
  if (!state) return;
  if (opts && opts.speed !== undefined) state.speed = opts.speed | 0;
  if (opts && opts.dir !== undefined) state.dir = opts.dir ? 1 : 0;
  if (opts && opts.rate !== undefined) state.rate = opts.rate;
  motorApplyAnimation(state);
}
