/* ================= ALU DEVICES ================= */

const BUILTIN_EXTRA_OPS = new Set([
  'XOR', 'NOT', 'PASS', 'CMP', 'LSHIFT', 'RSHIFT', 'ASHR', 'MUL', 'DIV',
]);

function aluBitIndexWidth(len) {
  return len <= 1 ? 1 : 32 - Math.clz32(len - 1);
}

function aluPad(val, length) {
  let s = val == null ? '' : String(val);
  if (!s) s = '0';
  if (s.length < length) return s.padStart(length, '0');
  if (s.length > length) return s.substring(s.length - length);
  return s;
}

function aluBitAnd(a, b, len) {
  let r = '';
  for (let i = 0; i < len; i++) r += (a[i] === '1' && b[i] === '1') ? '1' : '0';
  return r;
}

function aluBitOr(a, b, len) {
  let r = '';
  for (let i = 0; i < len; i++) r += (a[i] === '1' || b[i] === '1') ? '1' : '0';
  return r;
}

function aluBitXor(a, b, len) {
  let r = '';
  for (let i = 0; i < len; i++) r += (a[i] === '1') !== (b[i] === '1') ? '1' : '0';
  return r;
}

function aluBitNot(a, len) {
  let r = '';
  for (let i = 0; i < len; i++) r += a[i] === '1' ? '0' : '1';
  return r;
}

function aluLshift(data, n, fill, len) {
  const amount = Math.max(0, parseInt(n, 2) || 0);
  let v = data + (fill || '0').repeat(amount);
  if (v.length > len) v = v.substring(v.length - len);
  else if (v.length < len) v = v.padStart(len, '0');
  return v;
}

function aluRshift(data, n, fill, len) {
  const amount = Math.max(0, parseInt(n, 2) || 0);
  const f = (fill && fill[0] === '1') ? '1' : '0';
  let v;
  if (amount >= len) v = f.repeat(len);
  else v = f.repeat(amount) + data.slice(0, len - amount);
  return v;
}

function aluSignedOverflowAdd(a, b, result) {
  const aNeg = a[0] === '1';
  const bNeg = b[0] === '1';
  const rNeg = result[0] === '1';
  return (aNeg === bNeg && rNeg !== aNeg) ? '1' : '0';
}

function aluSignedOverflowSub(a, b, result) {
  const aNeg = a[0] === '1';
  const bNeg = b[0] === '1';
  const rNeg = result[0] === '1';
  return (aNeg !== bNeg && rNeg !== aNeg) ? '1' : '0';
}

function aluLookupLut(lutId, addrInt, depth) {
  if (typeof getLutTable === 'function') {
    const table = getLutTable(lutId);
    if (table && addrInt >= 0 && addrInt < table.length) {
      const val = table[addrInt];
      return aluPad(val, depth);
    }
  }
  return '0'.repeat(depth);
}

function aluExecuteOp(alu) {
  const len = alu.length;
  const a = aluPad(alu.a, len);
  const b = aluPad(alu.b, len);
  const opBits = alu.opBits;
  const op = aluPad(alu.op, opBits);
  const opCode = parseInt(op, 2);
  const mask = (BigInt(1) << BigInt(len)) - BigInt(1);
  const aNum = BigInt('0b' + a);
  const bNum = BigInt('0b' + b);

  let result = '0'.repeat(len);
  let carry = '0';
  let over = '0'.repeat(len);
  let mod = '0'.repeat(len);
  const flags = {};

  const setCompareFlags = () => {
    flags.less = aNum < bNum ? '1' : '0';
    flags.equal = aNum === bNum ? '1' : '0';
  };

  if (opCode === 0) {
    const sum = aNum + bNum;
    carry = sum > mask ? '1' : '0';
    result = (sum & mask).toString(2).padStart(len, '0');
    flags.overflow = aluSignedOverflowAdd(a, b, result);
  } else if (opCode === 1) {
    let diff = aNum - bNum;
    const wrap = BigInt(1) << BigInt(len);
    carry = diff < BigInt(0) ? '1' : '0';
    if (diff < BigInt(0)) diff = diff + wrap;
    result = (diff & mask).toString(2).padStart(len, '0');
    flags.overflow = aluSignedOverflowSub(a, b, result);
    if (alu.extraFlags.includes('borrow')) flags.borrow = carry;
  } else if (opCode === 2) {
    result = aluBitAnd(a, b, len);
    carry = '0';
  } else if (opCode === 3) {
    result = aluBitOr(a, b, len);
    carry = '0';
  } else {
    const extraIdx = opCode - 4;
    const extraName = (alu.extraOp[extraIdx] || '').toUpperCase();
    if (!extraName) {
      result = '0'.repeat(len);
    } else if (extraName === 'XOR') {
      result = aluBitXor(a, b, len);
      carry = '0';
    } else if (extraName === 'NOT') {
      result = aluBitNot(a, len);
      carry = '0';
    } else if (extraName === 'PASS') {
      result = a;
      carry = '0';
    } else if (extraName === 'CMP') {
      let diff = aNum - bNum;
      const wrap = BigInt(1) << BigInt(len);
      carry = diff < BigInt(0) ? '1' : '0';
      if (diff < BigInt(0)) diff = diff + wrap;
      result = (diff & mask).toString(2).padStart(len, '0');
      setCompareFlags();
    } else if (extraName === 'LSHIFT') {
      result = aluLshift(a, b, '0', len);
      carry = '0';
    } else if (extraName === 'RSHIFT') {
      result = aluRshift(a, b, '0', len);
      carry = '0';
    } else if (extraName === 'ASHR') {
      result = aluRshift(a, b, a[0], len);
      carry = '0';
    } else if (extraName === 'MUL') {
      const product = aNum * bNum;
      result = (product & mask).toString(2).padStart(len, '0');
      over = ((product >> BigInt(len)) & mask).toString(2).padStart(len, '0');
      carry = '0';
    } else if (extraName === 'DIV') {
      let quotient;
      let remainder;
      if (bNum === BigInt(0)) {
        quotient = BigInt(0);
        remainder = BigInt(0);
      } else {
        quotient = aNum / bNum;
        remainder = aNum % bNum;
      }
      result = (quotient & mask).toString(2).padStart(len, '0');
      mod = (remainder & mask).toString(2).padStart(len, '0');
      carry = '0';
    } else if (alu.lutId && len <= 4) {
      const addr = (opCode << (2 * len)) | (Number(aNum) << len) | Number(bNum);
      result = aluLookupLut(alu.lutId, addr, len);
      carry = '0';
    } else if (alu.lutId) {
      result = aluLookupLut(alu.lutId, opCode, len);
      carry = '0';
    } else {
      result = '0'.repeat(len);
      carry = '0';
    }
  }

  if (opCode === 0 || opCode === 1) {
    if (alu.extraFlags.includes('less') || alu.extraFlags.includes('equal')) {
      if (flags.less === undefined) flags.less = aNum < bNum ? '1' : '0';
      if (flags.equal === undefined) flags.equal = aNum === bNum ? '1' : '0';
    }
  }

  const zero = result.split('').every(ch => ch === '0') ? '1' : '0';
  if (alu.extraFlags.includes('negative') || alu.extraFlags.includes('sign')) {
    flags.negative = result[0] === '1' ? '1' : '0';
    flags.sign = flags.negative;
  }

  alu.result = result;
  alu.carry = carry;
  alu.zero = zero;
  alu.over = over;
  alu.mod = mod;
  alu.flags = flags;
  alu.opLabel = opCode < 4
    ? ['ADD', 'SUB', 'AND', 'OR'][opCode]
    : (alu.extraOp[opCode - 4] || `op${opCode}`).toUpperCase();
}

function normalizeAluList(list) {
  if (!list) return [];
  if (Array.isArray(list)) return list.map(s => String(s).trim()).filter(Boolean);
  return String(list).split(',').map(s => s.trim()).filter(Boolean);
}

function addAlu({
  id,
  length = 4,
  extraOp = [],
  extraFlags = [],
  lutId = null,
  nl = false,
}) {
  if (!id) return;
  const extra = normalizeAluList(extraOp).map(s => s.toUpperCase());
  const flags = normalizeAluList(extraFlags).map(s => s.toLowerCase());
  const opCount = 4 + extra.length;
  const opBits = aluBitIndexWidth(opCount);
  for (const name of extra) {
    if (!BUILTIN_EXTRA_OPS.has(name) && !lutId) {
      // custom op without LUT — allowed at runtime (returns zero) until LUT wired
    }
  }
  dm().alus.set(id, {
    length,
    extraOp: extra,
    extraFlags: flags,
    opBits,
    lutId,
    nl: !!nl,
    a: '0'.repeat(length),
    b: '0'.repeat(length),
    op: '0'.repeat(opBits),
    result: '0'.repeat(length),
    carry: '0',
    zero: '1',
    over: '0'.repeat(length),
    mod: '0'.repeat(length),
    flags: {},
    opLabel: 'ADD',
  });

  if (typeof document !== 'undefined') {
    const container = getDevicesContainer();
    if (container) {
      if (typeof showDevices === 'function') showDevices();
      const wrap = document.createElement('div');
      wrap.className = 'alu-panel';
      wrap.dataset.aluId = id;
      wrap.innerHTML =
        `<div class="alu-title">ALU</div>` +
        `<div class="alu-row"><span class="alu-lbl">op</span><span class="alu-op">ADD</span></div>` +
        `<div class="alu-row"><span class="alu-lbl">a</span><span class="alu-a">0000</span></div>` +
        `<div class="alu-row"><span class="alu-lbl">b</span><span class="alu-b">0000</span></div>` +
        `<div class="alu-row"><span class="alu-lbl">=</span><span class="alu-r">0000</span></div>` +
        `<div class="alu-flags"><span class="alu-carry" title="carry">C</span><span class="alu-zero" title="zero">Z</span></div>`;
      container.appendChild(wrap);
      if (nl) {
        const br = document.createElement('div');
        br.className = 'break';
        container.appendChild(br);
      }
    }
  }
}

function refreshAluPanel(id) {
  if (typeof document === 'undefined') return;
  const alu = dm().alus.get(id);
  if (!alu) return;
  const panel = document.querySelector(`.alu-panel[data-alu-id="${id}"]`);
  if (!panel) return;
  const set = (sel, txt) => { const el = panel.querySelector(sel); if (el) el.textContent = txt; };
  set('.alu-op', alu.opLabel + ` (${alu.op})`);
  set('.alu-a', alu.a);
  set('.alu-b', alu.b);
  set('.alu-r', alu.result);
  const cEl = panel.querySelector('.alu-carry');
  const zEl = panel.querySelector('.alu-zero');
  if (cEl) { cEl.classList.toggle('on', alu.carry === '1'); }
  if (zEl) { zEl.classList.toggle('on', alu.zero === '1'); }
}

function setAluA(id, value) {
  const alu = dm().alus.get(id);
  if (!alu) return;
  alu.a = aluPad(value, alu.length);
}

function setAluB(id, value) {
  const alu = dm().alus.get(id);
  if (!alu) return;
  alu.b = aluPad(value, alu.length);
}

function setAluOp(id, value) {
  const alu = dm().alus.get(id);
  if (!alu) return;
  alu.op = aluPad(value, alu.opBits);
}

function setAluLutId(id, lutId) {
  const alu = dm().alus.get(id);
  if (!alu) return;
  alu.lutId = lutId || null;
}

function executeAlu(id) {
  const alu = dm().alus.get(id);
  if (!alu) return;
  aluExecuteOp(alu);
  refreshAluPanel(id);
}

function getAluResult(id) {
  const alu = dm().alus.get(id);
  return alu ? alu.result : null;
}

function getAluCarry(id) {
  const alu = dm().alus.get(id);
  return alu ? alu.carry : null;
}

function getAluZero(id) {
  const alu = dm().alus.get(id);
  return alu ? alu.zero : null;
}

function getAluOver(id) {
  const alu = dm().alus.get(id);
  return alu ? alu.over : null;
}

function getAluMod(id) {
  const alu = dm().alus.get(id);
  return alu ? alu.mod : null;
}

function getAluFlag(id, name) {
  const alu = dm().alus.get(id);
  if (!alu) return null;
  const key = String(name).toLowerCase();
  if (alu.flags[key] !== undefined) return alu.flags[key];
  if (key === 'sign' && alu.flags.negative !== undefined) return alu.flags.negative;
  return '0';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addAlu, setAluA, setAluB, setAluOp, setAluLutId, executeAlu,
    getAluResult, getAluCarry, getAluZero, getAluOver, getAluMod, getAluFlag,
    aluBitIndexWidth, aluExecuteOp, normalizeAluList, BUILTIN_EXTRA_OPS,
  };
}
