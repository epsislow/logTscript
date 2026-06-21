/* ================= LOGIC VALUE — IEEE 1164 subset (0/1/Z/X) ================= */

const LOGIC_CHARS = new Set(['0', '1', 'Z', 'X']);

function isLogicChar(ch) {
  return LOGIC_CHARS.has(ch);
}

function stringHasLogicXZ(s) {
  return /[XZ]/.test(String(s || ''));
}

/** Watch/timeline state: 0=low, 2=high, 4=Z, 5=X (matches timeline-analyzer STATE_*) */
function classifyWatchState(valueStr, bitWidth) {
  const WATCH_LOW = 0;
  const WATCH_HIGH = 2;
  const WATCH_Z = 4;
  const WATCH_X = 5;
  if (valueStr == null || valueStr === '-' || valueStr === '') return WATCH_LOW;
  const s = String(valueStr);
  if (bitWidth === 1) {
    if (s === '1') return WATCH_HIGH;
    if (s === 'Z') return WATCH_Z;
    if (s === 'X') return WATCH_X;
    return WATCH_LOW;
  }
  if (/X/.test(s)) return WATCH_X;
  if (/Z/.test(s)) return WATCH_Z;
  return /1/.test(s) ? WATCH_HIGH : WATCH_LOW;
}

function groupBinaryDisplay(s, groupSize) {
  const g = groupSize || 8;
  const parts = [];
  for (let i = 0; i < s.length; i += g) {
    parts.push(s.substring(i, i + g));
  }
  return parts.join(' ');
}

function isBinaryBit(ch) {
  return ch === '0' || ch === '1';
}

function isBinaryLogicValue(s) {
  const v = String(s || '');
  if (!v.length) return true;
  for (const ch of v) {
    if (!isBinaryBit(ch)) return false;
  }
  return true;
}

/** Device display: only strict 1 is ON; 0/Z/X → off */
function deviceBitIsOn(ch) {
  return ch === '1';
}

function normalizeDeviceDisplayBits(value, len) {
  let v = String(value == null ? '' : value);
  if (len) {
    if (v.length < len) v = v.padEnd(len, '0');
    else if (v.length > len) v = v.substring(0, len);
  }
  return v.split('').map(ch => (deviceBitIsOn(ch) ? '1' : '0')).join('');
}

function findLogicXZBit(value) {
  const v = String(value || '');
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (ch === 'X' || ch === 'Z') return { ch, index: i };
  }
  return null;
}

function requireBinaryForEval(values, opName, labels) {
  const list = values || [];
  for (let i = 0; i < list.length; i++) {
    const hit = findLogicXZBit(list[i]);
    if (hit) {
      const label = labels && labels[i] ? labels[i] : `argument ${i + 1}`;
      throw new Error(`Cannot use wire with ${hit.ch} in ${opName} (${label} bit ${hit.index})`);
    }
  }
}

/** Reject X only; Z is allowed (tristate MUX / partial drive). */
function requireNoXForEval(values, opName, labels) {
  const list = values || [];
  for (let i = 0; i < list.length; i++) {
    const v = String(list[i] || '');
    for (let j = 0; j < v.length; j++) {
      if (v[j] === 'X') {
        const label = labels && labels[i] ? labels[i] : `argument ${i + 1}`;
        throw new Error(`Cannot use wire with X in ${opName} (${label} bit ${j})`);
      }
    }
  }
}

/** Edge modes: only strict 0↔1 transitions; Z/X never trigger */
function logicEdgeTriggered(prevBit, newBit, onMode) {
  if (!isBinaryBit(prevBit) || !isBinaryBit(newBit)) return false;
  const mode = onMode || 'raise';
  if (mode === 'raise' || mode === 'rising') return prevBit === '0' && newBit === '1';
  if (mode === 'edge' || mode === 'falling') return prevBit === '1' && newBit === '0';
  return false;
}

/** Level mode: set active only when last bit is strict 1 */
function logicLevelTriggered(newBit, newValue, prevValue, setDependsOnTilde) {
  if (!isBinaryBit(newBit) || newBit !== '1') return false;
  if (setDependsOnTilde) return true;
  return String(newValue) !== String(prevValue);
}

function resolveWireBit(contributors) {
  const active = [];
  for (const c of contributors || []) {
    if (c === '0' || c === '1') active.push(c);
  }
  if (active.length === 0) return 'Z';
  if (active.length === 1) return active[0];
  const first = active[0];
  if (active.every(v => v === first)) return first;
  return 'X';
}

function resolveWireVector(contributions, bits) {
  const width = bits || 0;
  if (!width) return '';
  const list = contributions || [];
  if (list.length === 0) return 'Z'.repeat(width);
  if (list.length > 1) {
    const fitted = list.map(c => {
      const raw = String(c || '');
      return raw.length > width
        ? raw.substring(raw.length - width)
        : raw.padStart(width, 'Z');
    });
    if (fitted.every(v => v === fitted[0])) return fitted[0];
  }
  let result = '';
  for (let i = 0; i < width; i++) {
    const perBit = list.map(c => {
      const raw = String(c || '');
      const fitted = raw.length > width
        ? raw.substring(raw.length - width)
        : raw.padStart(width, 'Z');
      const ch = fitted[i] || 'Z';
      return ch === '0' || ch === '1' || ch === 'Z' || ch === 'X' ? ch : 'Z';
    });
    result += resolveWireBit(perBit);
  }
  return result;
}

function evalGate1bit(op, a, b) {
  const A = a;
  const B = b;

  switch (op) {
    case 'NOT':
      if (A === '0') return '1';
      if (A === '1') return '0';
      if (A === 'Z') return 'X';
      return 'X';
    case 'AND':
      if (A === '0' || B === '0') return '0';
      if (A === '1' && B === '1') return '1';
      return 'X';
    case 'OR':
      if (A === '1' || B === '1') return '1';
      if (A === '0' && B === '0') return '0';
      return 'X';
    case 'XOR':
    case 'NXOR': {
      if ((A === '0' && B === '1') || (A === '1' && B === '0')) {
        return op === 'XOR' ? '1' : '0';
      }
      if ((A === '0' && B === '0') || (A === '1' && B === '1')) {
        return op === 'XOR' ? '0' : '1';
      }
      return 'X';
    }
    case 'NAND':
      return evalGate1bit('NOT', evalGate1bit('AND', A, B), null);
    case 'NOR':
      return evalGate1bit('NOT', evalGate1bit('OR', A, B), null);
    default:
      return 'X';
  }
}

function normalizeLogicBit(ch) {
  if (ch === '0' || ch === '1' || ch === 'Z' || ch === 'X') return ch;
  return ch === '1' ? '1' : '0';
}

function evalLogicGateVector(op, a, b) {
  if (op === 'NOT') {
    const src = String(a || '');
    return src.split('').map(c => evalGate1bit('NOT', normalizeLogicBit(c), null)).join('');
  }

  const len = Math.max(String(a || '').length, String(b || '').length);
  const ap = String(a || '').padStart(len, '0');
  const bp = String(b || '').padStart(len, '0');
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push(evalGate1bit(op, normalizeLogicBit(ap[i]), normalizeLogicBit(bp[i])));
  }
  return out.join('');
}

function foldLogicGate(op, value) {
  const bits = String(value || '').split('').map(normalizeLogicBit);
  if (bits.length === 0) return '0';
  let acc = bits[0];
  for (let i = 1; i < bits.length; i++) {
    acc = evalGate1bit(op, acc, bits[i]);
  }
  return acc;
}

function evalLogicGateCall(name, argValues) {
  if (name === 'NOT') {
    return evalLogicGateVector('NOT', argValues[0], null);
  }

  if (name === 'EQ') {
    const v = evalLogicGateVector('NXOR', argValues[0], argValues[1]);
    return v.includes('0') ? '0' : '1';
  }

  if (argValues.length === 1) {
    return foldLogicGate(name, argValues[0]);
  }

  return evalLogicGateVector(name, argValues[0], argValues[1]);
}

function validateLogicLiteral(s, width, contextName) {
  const v = String(s || '').toUpperCase();
  if (!v.length) throw new Error(`${contextName}: empty logic literal`);
  for (const ch of v) {
    if (!isLogicChar(ch)) {
      throw new Error(`${contextName}: invalid logic character '${ch}'`);
    }
  }
  if (width != null && v.length !== width) {
    throw new Error(`${contextName}: logic literal width mismatch (expected ${width}, got ${v.length})`);
  }
  return v;
}

const LogicValue = {
  isLogicChar,
  stringHasLogicXZ,
  classifyWatchState,
  groupBinaryDisplay,
  isBinaryBit,
  isBinaryLogicValue,
  deviceBitIsOn,
  normalizeDeviceDisplayBits,
  requireBinaryForEval,
  requireNoXForEval,
  logicEdgeTriggered,
  logicLevelTriggered,
  resolveWireBit,
  resolveWireVector,
  evalGate1bit,
  evalLogicGateVector,
  evalLogicGateCall,
  validateLogicLiteral,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogicValue;
}
if (typeof window !== 'undefined') {
  window.LogicValue = LogicValue;
}
