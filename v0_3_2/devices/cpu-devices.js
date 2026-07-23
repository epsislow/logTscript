/* ================= CPU (contained interpreter) ================= */

function dmCpus() {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps) return null;
  if (!maps.cpus) maps.cpus = new Map();
  return maps.cpus;
}

function cpuZero(depth) {
  return '0'.repeat(depth);
}

function cpuReadRamCell(c, adr) {
  if (adr < 0 || adr >= c.ramLength) return null;
  if (c.ramMemId && typeof getMem === 'function') {
    return getMem(c.ramMemId, adr);
  }
  return c.ram[adr];
}

function cpuWriteRamCell(c, adr, val) {
  if (adr < 0 || adr >= c.ramLength) {
    throw Error(`STORE invalid address ${adr}`);
  }
  if (c.ramMemId) {
    if (typeof setMem === 'function') setMem(c.ramMemId, adr, val);
    return;
  }
  c.ram[adr] = val;
}

function cpuReadProgCell(c, adr) {
  if (adr < 0 || adr >= c.progLength) return null;
  if (c.progMemId && typeof getMem === 'function') {
    return getMem(c.progMemId, adr);
  }
  return c.prog[adr];
}

function cpuWriteProgBlob(c, blob) {
  const chunks = splitBlob(blob, c.progDepth, c.progLength);
  const z = cpuZero(c.progDepth);
  for (let i = 0; i < c.progLength; i++) {
    const word = i < chunks.length ? chunks[i] : z;
    if (c.progMemId) {
      if (typeof setMem === 'function') setMem(c.progMemId, i, word);
    } else {
      c.prog[i] = word;
    }
  }
}

function cpuWriteRamBlob(c, blob) {
  const chunks = splitBlob(blob, c.ramDepth, c.ramLength);
  const z = cpuZero(c.ramDepth);
  for (let i = 0; i < c.ramLength; i++) {
    const word = i < chunks.length ? chunks[i] : z;
    cpuWriteRamCell(c, i, word);
  }
}

function addCpu(id, config) {
  const cpus = dmCpus();
  if (!cpus) return;
  const regCount = config.regCount != null ? config.regCount : 4;
  const ramDepth = config.ramDepth != null ? config.ramDepth : 8;
  const ramLen = config.ramLength != null ? config.ramLength : 16;
  const progDepth = config.progDepth != null ? config.progDepth : 8;
  const progLen = config.progLength != null ? config.progLength : 32;
  const regs = [];
  for (let i = 0; i < regCount; i++) regs.push(cpuZero(ramDepth));
  const ram = [];
  const prog = [];
  const z = cpuZero(ramDepth);
  const zp = cpuZero(progDepth);
  if (!config.ramMemId) {
    for (let i = 0; i < ramLen; i++) ram.push(z);
  }
  if (!config.progMemId) {
    for (let i = 0; i < progLen; i++) prog.push(zp);
  }
  cpus.set(id, {
    regCount,
    regDepth: ramDepth,
    ramDepth,
    ramLength: ramLen,
    progDepth,
    progLength: progLen,
    regs,
    ram,
    prog,
    ramMemId: config.ramMemId || null,
    progMemId: config.progMemId || null,
    progReadonly: config.progReadonly !== false,
    pc: 0,
    pcInit: config.pcInit != null ? config.pcInit : 0,
    halted: 0,
    lastInstr: zp,
    spReg: config.spReg != null ? config.spReg : null,
    stackTop: config.stackTop != null ? config.stackTop : ramLen - 1,
    onReset: config.onReset || ['pc', 'regs', 'sp', 'halted'],
    fetchFrom: config.fetchFrom === 'ram' ? 'ram' : 'prog',
    maxSteps: config.maxSteps != null ? config.maxSteps : 10000,
    traceMode: config.traceMode || 'off',
    traceTerminalId: config.traceTerminalId || null,
    outputTerminalId: config.outputTerminalId || null,
    traceBuffer: [],
    peekRamAdr: 0,
    peekProgAdr: 0,
    ie: 0,
    irqActive: 0,
    irqVec: 0,
    irqPending: 0,
    irqSavedPc: 0,
    irqSavedIe: 0,
    vectorBase: config.vectorBase != null ? config.vectorBase : null,
    fixedVectors: config.fixedVectors || null,
  });
  if (config.spReg != null) cpuInitSp(cpus.get(id));
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
  cpuWriteRamBlob(c, blob);
}

function loadCpuProg(id, blob) {
  const c = getCpu(id);
  if (!c) return;
  cpuWriteProgBlob(c, blob);
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
  const z = cpuZero(c.regDepth);
  if (set.has('pc')) c.pc = c.pcInit;
  if (set.has('regs')) {
    for (let i = 0; i < c.regCount; i++) c.regs[i] = z;
  }
  if (set.has('ram')) {
    for (let i = 0; i < c.ramLength; i++) cpuWriteRamCell(c, i, z);
  }
  if (set.has('sp') && c.spReg != null && c.spReg >= 0 && c.spReg < c.regCount) {
    cpuInitSp(c);
  }
  if (set.has('halted')) c.halted = 0;
  if (set.has('pc') || set.has('halted') || set.has('regs')) {
    c.ie = 0;
    c.irqPending = 0;
  }
}

function s4(bits) {
  let n = parseInt(bits, 2);
  if (isNaN(n)) n = 0;
  if (n >= 8) n -= 16;
  return n;
}

function cpuCodeLimit(c) {
  return c.fetchFrom === 'ram' ? c.ramLength : c.progLength;
}

function cpuFetchInstr(c) {
  const limit = cpuCodeLimit(c);
  if (c.pc < 0 || c.pc >= limit) {
    throw Error(`CPU PC ${c.pc} out of ${c.fetchFrom} range 0..${limit - 1}`);
  }
  let word;
  if (c.fetchFrom === 'ram') {
    word = cpuReadRamCell(c, c.pc);
  } else {
    word = cpuReadProgCell(c, c.pc);
  }
  if (word == null) word = cpuZero(c.progDepth);
  return word;
}

function cpuSpIndex(c) {
  if (c.spReg == null || c.spReg < 0 || c.spReg >= c.regCount) return null;
  return parseInt(c.regs[c.spReg], 2);
}

function cpuSetSpIndex(c, idx) {
  if (c.spReg == null || c.spReg < 0 || c.spReg >= c.regCount) {
    throw Error('CPU stack operation requires valid sp register');
  }
  const v = idx.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
  c.regs[c.spReg] = v;
}

function cpuPushReg(c, r) {
  if (r < 0 || r >= c.regCount) throw Error(`PUSH invalid register R${r}`);
  let sp = cpuSpIndex(c);
  if (sp == null) throw Error('PUSH requires sp register');
  sp -= 1;
  if (sp < 0) throw Error(`CPU stack overflow at SP ${sp}`);
  cpuWriteRamCell(c, sp, c.regs[r]);
  cpuSetSpIndex(c, sp);
}

function cpuPopReg(c, r) {
  if (r < 0 || r >= c.regCount) throw Error(`POP invalid register R${r}`);
  let sp = cpuSpIndex(c);
  if (sp == null) throw Error('POP requires sp register');
  if (sp > c.stackTop) throw Error('CPU stack underflow');
  c.regs[r] = cpuReadRamCell(c, sp);
  sp += 1;
  cpuSetSpIndex(c, sp);
}

function cpuEmitOut(c, ctx, r) {
  if (r < 0 || r >= c.regCount) return;
  const ch = parseInt(c.regs[r], 2) & 0xff;
  const text = String.fromCharCode(ch);
  if (ctx && typeof ctx._cpuProgramOutput === 'function') {
    ctx._cpuProgramOutput(c, text);
  }
}

function cpuResolveIrqTarget(c) {
  const vec = c.irqVec | 0;
  if (c.fixedVectors && c.fixedVectors.length) {
    if (vec < 0 || vec >= c.fixedVectors.length) {
      throw Error(`IRQ vector ${vec} out of range 0..${c.fixedVectors.length - 1}`);
    }
    return c.fixedVectors[vec];
  }
  if (c.vectorBase == null) {
    throw Error('CPU IRQ requires map.vectorBase or vectors: attribute');
  }
  const adr = c.vectorBase + vec;
  if (adr < 0 || adr >= c.ramLength) {
    throw Error(`IRQ vector table address ${adr} out of RAM`);
  }
  const word = cpuReadRamCell(c, adr);
  return parseInt(word != null ? word : cpuZero(c.ramDepth), 2);
}

function cpuTryServeIrq(c) {
  if (c.halted) return;
  if (!c.irqActive) {
    c.irqPending = 0;
    return;
  }
  if (!c.ie) {
    c.irqPending = 1;
    return;
  }
  c.irqPending = 0;
  const targetPc = cpuResolveIrqTarget(c);
  const limit = cpuCodeLimit(c);
  if (targetPc < 0 || targetPc >= limit) {
    throw Error(`IRQ target PC ${targetPc} out of ${c.fetchFrom} range 0..${limit - 1}`);
  }
  c.irqSavedPc = c.pc;
  c.irqSavedIe = c.ie;
  c.ie = 0;
  c.pc = targetPc;
}

function cpuTraceStep(c, ctx, instr) {
  if (!ctx || !c.traceMode || c.traceMode === 'off') return;
  const line = `# step pc=${c.pc} instr=${instr} halted=${c.halted} ie=${c.ie}`;
  c.traceBuffer.push(line);
  if (c.traceMode === 'output' && typeof ctx._cpuTraceOutput === 'function') {
    ctx._cpuTraceOutput(c, line);
  }
  if (c.traceMode === 'terminal' && typeof ctx._cpuTraceOutput === 'function') {
    ctx._cpuTraceOutput(c, line + '\n');
  }
}

function cpuStep(id, ctx) {
  const c = getCpu(id);
  if (!c) return;
  if (c.halted) return;
  const instr = cpuFetchInstr(c);
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
      const cell = cpuReadRamCell(c, a);
      c.regs[r] = cell != null ? cell : cpuZero(c.ramDepth);
      break;
    }
    case '0010': {
      const r = parseInt(lo.substring(0, 2), 2);
      const a = parseInt(lo.substring(2, 4), 2);
      if (r < 0 || r >= c.regCount) throw Error(`STORE invalid register R${r}`);
      cpuWriteRamCell(c, a, c.regs[r]);
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
    case '0100': {
      const r = parseInt(lo.substring(0, 2), 2);
      const imm = parseInt(lo.substring(2, 4), 2);
      if (r < 0 || r >= c.regCount) throw Error(`SUBI invalid register R${r}`);
      const cur = parseInt(c.regs[r], 2);
      const mask = (1 << c.regDepth) - 1;
      const diff = (cur - imm) & mask;
      c.regs[r] = diff.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
      break;
    }
    case '0101': {
      const addr = parseInt(lo, 2);
      const limit = cpuCodeLimit(c);
      if (addr < 0 || addr >= limit) throw Error(`JMP invalid address ${addr}`);
      nextPc = addr;
      break;
    }
    case '0110': {
      const off = s4(lo);
      const target = c.pc + 1 + off;
      const limit = cpuCodeLimit(c);
      if (parseInt(c.regs[0], 2) === 0) {
        if (target < 0 || target >= limit) throw Error(`BEQ target PC ${target} out of range`);
        nextPc = target;
      }
      break;
    }
    case '1000': {
      const r = parseInt(lo.substring(0, 2), 2);
      cpuPushReg(c, r);
      break;
    }
    case '1001': {
      const r = parseInt(lo.substring(0, 2), 2);
      cpuPopReg(c, r);
      break;
    }
    case '1010': {
      const r = parseInt(lo.substring(0, 2), 2);
      cpuEmitOut(c, ctx, r);
      break;
    }
    case '1100':
      c.ie = 1;
      break;
    case '1101':
      c.ie = 0;
      c.irqPending = c.irqActive ? 1 : 0;
      break;
    case '1110':
      c.pc = c.irqSavedPc;
      c.ie = c.irqSavedIe;
      c.irqPending = c.irqActive && !c.ie ? 1 : 0;
      nextPc = c.pc;
      break;
    case '0111':
      c.halted = 1;
      nextPc = c.pc;
      break;
    default:
      throw Error(`Unknown opcode ${opc} at PC ${c.pc}`);
  }

  if (opc !== '0111' && opc !== '1110') c.pc = nextPc;

  cpuTraceStep(c, ctx, instr);
  if (!c.halted) cpuTryServeIrq(c);
}

function cpuSetIrqPins(c, irqActive, irqVec) {
  if (!c) return;
  if (irqActive !== undefined) c.irqActive = irqActive ? 1 : 0;
  if (irqVec !== undefined) c.irqVec = irqVec | 0;
}

function cpuRun(id, maxSteps, ctx) {
  const c = getCpu(id);
  if (!c || c.halted) return 0;
  const limit = maxSteps != null ? maxSteps : c.maxSteps;
  let steps = 0;
  while (!c.halted && steps < limit) {
    cpuStep(id, ctx);
    steps += 1;
  }
  return steps;
}

function cpuInitSp(c) {
  if (c.spReg == null || c.spReg < 0 || c.spReg >= c.regCount) return;
  const start = Math.min(c.stackTop + 1, c.ramLength);
  cpuSetSpIndex(c, start);
}

function getCpuReg(id, r) {
  const c = getCpu(id);
  if (!c || r < 0 || r >= c.regCount) return null;
  return c.regs[r];
}

function getCpuRam(id, adr) {
  const c = getCpu(id);
  if (!c || adr < 0 || adr >= c.ramLength) return null;
  return cpuReadRamCell(c, adr);
}

function getCpuProg(id, adr) {
  const c = getCpu(id);
  if (!c || adr < 0 || adr >= c.progLength) return null;
  return cpuReadProgCell(c, adr);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addCpu, getCpu, loadCpuRam, loadCpuProg, cpuAfterProgReload, cpuResetFlags, cpuStep, cpuRun,
    getCpuReg, getCpuRam, getCpuProg, splitBlob, cpuSetIrqPins,
  };
}
