/* ================= CPU (contained interpreter) ================= */

function dmCpus() {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps) return null;
  if (!maps.cpus) maps.cpus = new Map();
  return maps.cpus;
}

function addCpu(id, config) {
  const cpus = dmCpus();
  if (!cpus) return;
  const regCount = config.regCount != null ? config.regCount : 4;
  const depth = config.ramDepth != null ? config.ramDepth : 8;
  const ramLen = config.ramLength != null ? config.ramLength : 16;
  const progDepth = config.progDepth != null ? config.progDepth : 8;
  const progLen = config.progLength != null ? config.progLength : 32;
  const regs = [];
  for (let i = 0; i < regCount; i++) regs.push('0'.repeat(depth));
  const ram = [];
  const prog = [];
  const z = '0'.repeat(depth);
  const zp = '0'.repeat(progDepth);
  for (let i = 0; i < ramLen; i++) ram.push(z);
  for (let i = 0; i < progLen; i++) prog.push(zp);
  cpus.set(id, {
    regCount,
    regDepth: depth,
    ramDepth: depth,
    ramLength: ramLen,
    progDepth,
    progLength: progLen,
    regs,
    ram,
    prog,
    pc: 0,
    pcInit: config.pcInit != null ? config.pcInit : 0,
    halted: 0,
    lastInstr: zp,
    spReg: config.spReg != null ? config.spReg : null,
    stackTop: config.stackTop != null ? config.stackTop : ramLen - 1,
    onReset: config.onReset || ['pc', 'regs', 'sp', 'halted'],
    traceMode: config.traceMode || 'off',
    traceTerminalId: config.traceTerminalId || null,
    traceBuffer: [],
    peekRamAdr: 0,
    peekProgAdr: 0,
  });
}

function getCpu(id) {
  const cpus = dmCpus();
  return cpus ? cpus.get(id) : null;
}

function splitBlob(value, depth, length) {
  let v = value || '';
  if (v.length < depth) v = v.padStart(depth, '0');
  if (v.length % depth !== 0) {
    const padded = Math.ceil(v.length / depth) * depth;
    v = v.padStart(padded, '0');
  }
  const n = v.length / depth;
  if (n > length) {
    throw Error(`Initializer has ${n} words but space length is ${length}`);
  }
  const chunks = [];
  for (let i = 0; i < n; i++) chunks.push(v.substring(i * depth, (i + 1) * depth));
  return chunks;
}

function loadCpuRam(id, blob) {
  const c = getCpu(id);
  if (!c) return;
  const chunks = splitBlob(blob, c.ramDepth, c.ramLength);
  const z = '0'.repeat(c.ramDepth);
  for (let i = 0; i < c.ramLength; i++) {
    c.ram[i] = i < chunks.length ? chunks[i] : z;
  }
}

function loadCpuProg(id, blob) {
  const c = getCpu(id);
  if (!c) return;
  const chunks = splitBlob(blob, c.progDepth, c.progLength);
  const z = '0'.repeat(c.progDepth);
  for (let i = 0; i < c.progLength; i++) {
    c.prog[i] = i < chunks.length ? chunks[i] : z;
  }
  c.pc = c.pcInit;
  c.halted = 0;
}

function cpuAfterProgReload(id) {
  const c = getCpu(id);
  if (!c) return;
  c.pc = c.pcInit;
  c.halted = 0;
}

function cpuResetFlags(id, flags) {
  const c = getCpu(id);
  if (!c) return;
  const set = new Set(flags || []);
  const z = '0'.repeat(c.regDepth);
  if (set.has('pc')) c.pc = c.pcInit;
  if (set.has('regs')) {
    for (let i = 0; i < c.regCount; i++) c.regs[i] = z;
  }
  if (set.has('ram')) {
    for (let i = 0; i < c.ramLength; i++) c.ram[i] = z;
  }
  if (set.has('sp') && c.spReg != null && c.spReg >= 0 && c.spReg < c.regCount) {
    const sw = c.stackTop.toString(2).length;
    c.regs[c.spReg] = c.stackTop.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
  }
  if (set.has('halted')) c.halted = 0;
}

function s4(bits) {
  let n = parseInt(bits, 2);
  if (isNaN(n)) n = 0;
  if (n >= 8) n -= 16;
  return n;
}

function cpuStep(id, ctx) {
  const c = getCpu(id);
  if (!c) return;
  if (c.halted) return;
  if (c.pc < 0 || c.pc >= c.progLength) {
    throw Error(`CPU PC ${c.pc} out of program range 0..${c.progLength - 1}`);
  }
  const instr = c.prog[c.pc];
  c.lastInstr = instr;
  const opc = instr.substring(0, 4);
  const lo = instr.substring(4);
  let nextPc = c.pc + 1;

  switch (opc) {
    case '0000':
      break;
    case '0001': {
      const r = parseInt(lo.substring(0, 2), 2);
      const a = parseInt(lo.substring(2, 4), 2);
      if (r < 0 || r >= c.regCount) throw Error(`LOAD invalid register R${r}`);
      if (a < 0 || a >= c.ramLength) throw Error(`LOAD invalid address ${a}`);
      c.regs[r] = c.ram[a];
      break;
    }
    case '0010': {
      const r = parseInt(lo.substring(0, 2), 2);
      const a = parseInt(lo.substring(2, 4), 2);
      if (r < 0 || r >= c.regCount) throw Error(`STORE invalid register R${r}`);
      if (a < 0 || a >= c.ramLength) throw Error(`STORE invalid address ${a}`);
      c.ram[a] = c.regs[r];
      break;
    }
    case '0011': {
      const r = parseInt(lo.substring(0, 2), 2);
      const imm = parseInt(lo.substring(2, 4), 2);
      if (r < 0 || r >= c.regCount) throw Error(`ADDI invalid register R${r}`);
      const cur = parseInt(c.regs[r], 2);
      const sum = (cur + imm) & ((1 << c.regDepth) - 1);
      c.regs[r] = sum.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
      break;
    }
    case '0101': {
      const addr = parseInt(lo, 2);
      if (addr < 0 || addr >= c.progLength) throw Error(`JMP invalid address ${addr}`);
      nextPc = addr;
      break;
    }
    case '0110': {
      const off = s4(lo);
      const target = c.pc + 1 + off;
      if (parseInt(c.regs[0], 2) === 0) {
        if (target < 0 || target >= c.progLength) throw Error(`BEQ target PC ${target} out of range`);
        nextPc = target;
      }
      break;
    }
    case '0111':
      c.halted = 1;
      nextPc = c.pc;
      break;
    default:
      throw Error(`Unknown opcode ${opc} at PC ${c.pc}`);
  }

  if (opc !== '0111') c.pc = nextPc;

  if (ctx && c.traceMode && c.traceMode !== 'off') {
    const line = `# step pc=${c.pc} instr=${instr} halted=${c.halted}`;
    c.traceBuffer.push(line);
    if (c.traceMode === 'output' && typeof ctx._cpuTraceOutput === 'function') {
      ctx._cpuTraceOutput(line);
    }
  }
}

function getCpuReg(id, r) {
  const c = getCpu(id);
  if (!c || r < 0 || r >= c.regCount) return null;
  return c.regs[r];
}

function getCpuRam(id, adr) {
  const c = getCpu(id);
  if (!c || adr < 0 || adr >= c.ramLength) return null;
  return c.ram[adr];
}

function getCpuProg(id, adr) {
  const c = getCpu(id);
  if (!c || adr < 0 || adr >= c.progLength) return null;
  return c.prog[adr];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addCpu, getCpu, loadCpuRam, loadCpuProg, cpuAfterProgReload, cpuResetFlags, cpuStep,
    getCpuReg, getCpuRam, getCpuProg, splitBlob,
  };
}
