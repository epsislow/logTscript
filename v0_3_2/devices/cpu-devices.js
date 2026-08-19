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

function cpuCoreCount(c) {
  return c && c.coreCount != null ? c.coreCount : 1;
}

function cpuIsMulti(c) {
  return cpuCoreCount(c) > 1;
}

function cpuParseActiveMask(bits, coreCount) {
  if (bits == null || bits === '') return 1;
  const s = String(bits).trim();
  let mask = /^[01]+$/.test(s) ? parseInt(s, 2) : parseInt(s, 10);
  if (isNaN(mask) || mask < 0) mask = 0;
  const limit = (1 << coreCount) - 1;
  return mask & limit;
}

function cpuInitCoreFields(config, regCount, ramDepth, progDepth, progLen) {
  const regs = [];
  for (let i = 0; i < regCount; i++) regs.push(cpuZero(ramDepth));
  const prog = [];
  const zp = cpuZero(progDepth);
  if (!config.progMemId) {
    for (let i = 0; i < progLen; i++) prog.push(zp);
  }
  return {
    pc: config.pcInit != null ? config.pcInit : 0,
    pcInit: config.pcInit != null ? config.pcInit : 0,
    halted: config.halted != null ? config.halted : 0,
    regs,
    prog,
    progMemId: config.progMemId || null,
    progDepth,
    progLength: progLen,
    progReadonly: config.progReadonly !== false,
    progEncoding: 'fixed',
    progCodeTable: null,
    lastInstr: zp,
    trapCause: 0,
    divByZero: 0,
    zf: 0,
    sf: 0,
    cf: 0,
    of: 0,
    microSlots: new Map(),
  };
}

function cpuBindCoreForExec(c, idx) {
  if (!cpuIsMulti(c)) {
    c.activeCore = 0;
    return;
  }
  const core = c.cores[idx];
  if (!core) return;
  c.activeCore = idx;
  c.pc = core.pc;
  c.regs = core.regs;
  c.halted = core.halted;
  c.prog = core.prog;
  c.progMemId = core.progMemId;
  c.progLength = core.progLength;
  c.progDepth = core.progDepth;
  c.progEncoding = core.progEncoding;
  c.progCodeTable = core.progCodeTable;
  c.progReadonly = core.progReadonly;
  c.lastInstr = core.lastInstr;
  c.trapCause = core.trapCause;
  c.divByZero = core.divByZero;
  c.zf = core.zf;
  c.sf = core.sf;
  c.cf = core.cf;
  c.of = core.of;
  c.microSlots = core.microSlots;
}

function cpuFlushCoreFromExec(c) {
  if (!cpuIsMulti(c)) return;
  const idx = c.activeCore;
  const core = c.cores[idx];
  if (!core) return;
  core.pc = c.pc;
  core.regs = c.regs;
  core.halted = c.halted;
  core.lastInstr = c.lastInstr;
  core.trapCause = c.trapCause;
  core.divByZero = c.divByZero;
  core.zf = c.zf;
  core.sf = core.sf;
  core.cf = core.cf;
  core.of = core.of;
  core.microSlots = c.microSlots;
}

function cpuCoreActiveBit(c, idx) {
  const mask = c.coresActive != null ? c.coresActive : 1;
  return ((mask >> idx) & 1) === 1;
}

function cpuAnyRunnable(c) {
  if (!cpuIsMulti(c)) return !c.halted;
  for (let i = 0; i < c.coreCount; i++) {
    if (cpuCoreActiveBit(c, i) && !c.cores[i].halted) return true;
  }
  return false;
}

function cpuPickNextCore(c) {
  for (let attempt = 0; attempt < c.coreCount; attempt++) {
    const i = (c.rrIndex + attempt) % c.coreCount;
    if (cpuCoreActiveBit(c, i) && !c.cores[i].halted) {
      c.rrIndex = (i + 1) % c.coreCount;
      return i;
    }
  }
  return -1;
}

function cpuWakeCore(c, idx) {
  if (!cpuIsMulti(c) || idx < 0 || idx >= c.coreCount) return;
  const core = c.cores[idx];
  core.halted = 0;
  core.pc = core.pcInit;
  c.coresActive = (c.coresActive | (1 << idx)) >>> 0;
}

function cpuParkCore(c, idx) {
  if (!cpuIsMulti(c) || idx < 0 || idx >= c.coreCount) return;
  c.cores[idx].halted = 1;
  c.coresActive = (c.coresActive & ~(1 << idx)) >>> 0;
}

function cpuApplyAsmModuleToCore(core, asmModule) {
  if (!core || !asmModule) {
    if (core) {
      core.progEncoding = 'fixed';
      core.progCodeTable = null;
    }
    return;
  }
  if (asmModule.encoding === 'variable') {
    core.progEncoding = 'variable';
    core.progCodeTable = (asmModule.instructions || []).filter(ins => ins.kind === 'code');
  } else {
    core.progEncoding = 'fixed';
    core.progCodeTable = null;
  }
}

function cpuWriteProgBlobToCore(core, blob) {
  const chunks = splitBlob(blob, core.progDepth, core.progLength);
  const z = cpuZero(core.progDepth);
  for (let i = 0; i < core.progLength; i++) {
    const word = i < chunks.length ? chunks[i] : z;
    if (core.progMemId) {
      if (typeof setMem === 'function') setMem(core.progMemId, i, word);
    } else {
      core.prog[i] = word;
    }
  }
}

function cpuReadRamCell(c, adr) {
  if (adr < 0 || adr >= c.ramLength) return null;
  if (c.mmapId && typeof mmapRead === 'function') {
    return mmapRead(c.mmapId, adr, c._stepCtx || null);
  }
  if (c.ramMemId && typeof getMem === 'function') {
    return getMem(c.ramMemId, adr);
  }
  return c.ram[adr];
}

function cpuWriteRamCell(c, adr, val) {
  if (adr < 0 || adr >= c.ramLength) {
    throw Error(`STORE invalid address ${adr}`);
  }
  if (c.mmapId && typeof mmapWrite === 'function') {
    const ctx = c._stepCtx || null;
    mmapWrite(c.mmapId, adr, val, ctx, ctx && ctx.componentRegistry);
    return;
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

function cpuWriteProgCell(c, adr, val) {
  if (adr < 0 || adr >= c.progLength) return;
  if (c.progReadonly && c.progMemId) return;
  if (c.progMemId && typeof setMem === 'function') {
    setMem(c.progMemId, adr, val);
    return;
  }
  c.prog[adr] = val;
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
  const coreCount = config.coreCount != null ? config.coreCount : 1;
  const pcInitList = config.pcInitList || null;
  const coreProgConfigs = config.coreProgConfigs || null;
  const ram = [];
  const z = cpuZero(ramDepth);
  if (!config.ramMemId) {
    for (let i = 0; i < ramLen; i++) ram.push(z);
  }

  const shared = {
    regCount,
    regDepth: ramDepth,
    ramDepth,
    ramLength: ramLen,
    ram,
    ramMemId: config.ramMemId || null,
    mmapId: config.mmapId || null,
    mmapRef: config.mmapRef || null,
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
    isaRef: config.isaRef || null,
    coreCount,
    coresActive: 1,
    rrIndex: 0,
    activeCore: 0,
  };

  if (coreCount <= 1) {
    const zp = cpuZero(progDepth);
    const prog = [];
    if (!config.progMemId) {
      for (let i = 0; i < progLen; i++) prog.push(zp);
    }
    const regs = [];
    for (let i = 0; i < regCount; i++) regs.push(cpuZero(ramDepth));
    cpus.set(id, Object.assign({}, shared, {
      progDepth,
      progLength: progLen,
      regs,
      prog,
      progMemId: config.progMemId || null,
      progReadonly: config.progReadonly !== false,
      pc: config.pcInit != null ? config.pcInit : 0,
      pcInit: config.pcInit != null ? config.pcInit : 0,
      halted: 0,
      lastInstr: zp,
      trapCause: 0,
      divByZero: 0,
      zf: 0,
      sf: 0,
      cf: 0,
      of: 0,
      microSlots: new Map(),
      progEncoding: 'fixed',
      progCodeTable: null,
    }));
    const c = cpus.get(id);
    if (config.spReg != null) cpuInitSp(c);
    return;
  }

  const cores = [];
  for (let i = 0; i < coreCount; i++) {
    const pi = pcInitList && pcInitList[i] != null ? pcInitList[i] : 0;
    const cpCfg = coreProgConfigs && coreProgConfigs[i] ? coreProgConfigs[i] : {};
    const cProgLen = cpCfg.progLength != null ? cpCfg.progLength : progLen;
    const cProgDepth = cpCfg.progDepth != null ? cpCfg.progDepth : progDepth;
    cores.push(cpuInitCoreFields({
      pcInit: pi,
      halted: i === 0 ? 0 : 1,
      progMemId: cpCfg.progMemId || null,
      progReadonly: cpCfg.progReadonly != null ? cpCfg.progReadonly : (config.progReadonly !== false),
    }, regCount, ramDepth, cProgDepth, cProgLen));
  }
  const lead = cores[0];
  cpus.set(id, Object.assign({}, shared, {
    cores,
    progDepth: lead.progDepth,
    progLength: lead.progLength,
    regs: lead.regs,
    prog: lead.prog,
    progMemId: lead.progMemId,
    progReadonly: lead.progReadonly,
    pc: lead.pc,
    pcInit: lead.pcInit,
    halted: lead.halted,
    lastInstr: lead.lastInstr,
    trapCause: 0,
    divByZero: 0,
    zf: 0,
    sf: 0,
    cf: 0,
    of: 0,
    microSlots: lead.microSlots,
    progEncoding: lead.progEncoding,
    progCodeTable: lead.progCodeTable,
  }));
  const c = cpus.get(id);
  if (config.spReg != null) {
    for (let i = 0; i < coreCount; i++) {
      cpuBindCoreForExec(c, i);
      cpuInitSp(c);
      cpuFlushCoreFromExec(c);
    }
    cpuBindCoreForExec(c, 0);
  }
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

function loadCpuProg(id, blob, asmModule, coreIdx) {
  const c = getCpu(id);
  if (!c) return;
  if (cpuIsMulti(c)) {
    const idx = coreIdx != null ? coreIdx : 0;
    loadCpuCoreProg(id, idx, blob, asmModule);
    return;
  }
  cpuWriteProgBlob(c, blob);
  cpuApplyAsmModule(c, asmModule || null);
  c.pc = c.pcInit;
  c.halted = 0;
  c.trapCause = 0;
  c.divByZero = 0;
}

function loadCpuCoreProg(id, coreIdx, blob, asmModule) {
  const c = getCpu(id);
  if (!c || !cpuIsMulti(c)) return;
  if (coreIdx < 0 || coreIdx >= c.coreCount) {
    throw Error(`CPU core index ${coreIdx} out of range 0..${c.coreCount - 1}`);
  }
  const core = c.cores[coreIdx];
  cpuWriteProgBlobToCore(core, blob);
  cpuApplyAsmModuleToCore(core, asmModule || null);
  core.pc = core.pcInit;
  core.halted = coreIdx === 0 ? 0 : 1;
  core.trapCause = 0;
  core.divByZero = 0;
  if (coreIdx === 0) cpuBindCoreForExec(c, 0);
}

function cpuAfterProgReload(id) {
  const c = getCpu(id);
  if (!c) return;
  if (cpuIsMulti(c)) {
    for (let i = 0; i < c.coreCount; i++) {
      const core = c.cores[i];
      core.pc = core.pcInit;
      core.halted = i === 0 ? 0 : 1;
      core.trapCause = 0;
      core.divByZero = 0;
    }
    c.coresActive = 1;
    c.rrIndex = 0;
    cpuBindCoreForExec(c, 0);
    return;
  }
  c.pc = c.pcInit;
  c.halted = 0;
  c.trapCause = 0;
  c.divByZero = 0;
}

function cpuResetFlags(id, flags) {
  const c = getCpu(id);
  if (!c) return;
  const set = new Set(flags || []);
  const z = cpuZero(c.regDepth);

  function resetOne(state, idx) {
    if (set.has('pc')) state.pc = state.pcInit;
    if (set.has('regs')) {
      for (let i = 0; i < c.regCount; i++) state.regs[i] = z;
    }
    if (set.has('halted')) {
      state.halted = idx === 0 ? 0 : 1;
      state.trapCause = 0;
      state.divByZero = 0;
    }
  }

  if (cpuIsMulti(c)) {
    for (let i = 0; i < c.coreCount; i++) resetOne(c.cores[i], i);
    if (set.has('halted') || set.has('pc')) {
      c.coresActive = 1;
      c.rrIndex = 0;
    }
    if (set.has('sp') && c.spReg != null) {
      for (let i = 0; i < c.coreCount; i++) {
        cpuBindCoreForExec(c, i);
        cpuInitSp(c);
        cpuFlushCoreFromExec(c);
      }
      cpuBindCoreForExec(c, 0);
    }
    if (set.has('pc') || set.has('halted') || set.has('regs')) {
      c.ie = 0;
      c.irqPending = 0;
    }
    cpuBindCoreForExec(c, c.activeCore || 0);
  } else {
    if (set.has('pc')) c.pc = c.pcInit;
    if (set.has('regs')) {
      for (let i = 0; i < c.regCount; i++) c.regs[i] = z;
    }
    if (set.has('sp') && c.spReg != null && c.spReg >= 0 && c.spReg < c.regCount) {
      cpuInitSp(c);
    }
    if (set.has('halted')) {
      c.halted = 0;
      c.trapCause = 0;
      c.divByZero = 0;
    }
    if (set.has('pc') || set.has('halted') || set.has('regs')) {
      c.ie = 0;
      c.irqPending = 0;
    }
  }

  if (set.has('ram')) {
    for (let i = 0; i < c.ramLength; i++) cpuWriteRamCell(c, i, z);
  }
}

function s4(bits) {
  let n = parseInt(bits, 2);
  if (isNaN(n)) n = 0;
  if (n >= 8) n -= 16;
  return n;
}

function cpuCodeLimit(c) {
  if (c.progEncoding === 'variable' && c.progCodeTable && c.progCodeTable.length) {
    return c.progCodeTable.length;
  }
  return c.fetchFrom === 'ram' ? c.ramLength : c.progLength;
}

function cpuReadProgBytes(c, byteOff, byteLen) {
  let bits = '';
  for (let i = 0; i < byteLen; i++) {
    const cell = cpuReadProgCell(c, byteOff + i);
    const chunk = cell != null ? String(cell) : cpuZero(c.progDepth);
    bits += chunk.padStart(c.progDepth, '0').slice(-c.progDepth);
  }
  return bits;
}

function cpuApplyAsmModule(c, asmModule) {
  if (!c) return;
  if (cpuIsMulti(c)) {
    cpuApplyAsmModuleToCore(c.cores[c.activeCore || 0], asmModule);
    return;
  }
  if (!asmModule) {
    c.progEncoding = 'fixed';
    c.progCodeTable = null;
    return;
  }
  if (asmModule.encoding === 'variable') {
    c.progEncoding = 'variable';
    c.progCodeTable = (asmModule.instructions || []).filter(ins => ins.kind === 'code');
  } else {
    c.progEncoding = 'fixed';
    c.progCodeTable = null;
  }
}

function cpuFetchInstr(c) {
  const limit = cpuCodeLimit(c);
  if (c.pc < 0 || c.pc >= limit) {
    throw Error(`CPU PC ${c.pc} out of ${c.fetchFrom} range 0..${limit - 1}`);
  }
  if (c.progEncoding === 'variable' && c.progCodeTable && c.progCodeTable.length) {
    const ins = c.progCodeTable[c.pc];
    if (!ins) throw Error(`CPU variable PC ${c.pc} has no instruction metadata`);
    return cpuReadProgBytes(c, ins.byteOffset, ins.byteLength);
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

function cpuPushImm(c, val) {
  let sp = cpuSpIndex(c);
  if (sp == null) throw Error('PUSH requires sp register');
  sp -= 1;
  if (sp < 0) throw Error(`CPU stack overflow at SP ${sp}`);
  const bits = (val >>> 0).toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
  cpuWriteRamCell(c, sp, bits);
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
  const prefix = cpuIsMulti(c) ? `[c${c.activeCore}] ` : '';
  const line = `# ${prefix}step pc=${c.pc} instr=${instr} halted=${c.halted} ie=${c.ie}`;
  c.traceBuffer.push(line);
  if (c.traceMode === 'output' && typeof ctx._cpuTraceOutput === 'function') {
    ctx._cpuTraceOutput(c, line);
  }
  if (c.traceMode === 'terminal' && typeof ctx._cpuTraceOutput === 'function') {
    ctx._cpuTraceOutput(c, line + '\n');
  }
}

function cpuConstAddr(consts, name) {
  if (!consts || consts[name] === undefined) return null;
  const v = String(consts[name]).trim();
  if (!v.startsWith('^')) return null;
  const n = parseInt(v.slice(1), 16);
  return isNaN(n) ? null : n;
}

function cpuConstLiteral(consts, name) {
  if (!consts || consts[name] === undefined) return null;
  const v = String(consts[name]).trim();
  if (v.startsWith('^')) return null;
  if (/^[01]+$/.test(v)) return parseInt(v, 2);
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return null;
}

function cpuMicroMask(c) {
  const depth = c.regDepth | 0;
  if (depth >= 32) return 0xffffffff;
  return (1 << depth) - 1;
}

function cpuMicroArchRegAddr(consts, idx) {
  return cpuConstAddr(consts, `R${idx}`);
}

function cpuMicroReadSlot(c, isaInst, addr) {
  const consts = isaInst.consts || {};
  const aluOutAddr = cpuConstAddr(consts, 'ALUOUT');
  if (aluOutAddr !== null && addr === aluOutAddr) {
    return cpuMicroAluEval(c, isaInst);
  }
  const pcAddr = cpuConstAddr(consts, 'PC');
  if (pcAddr !== null && addr === pcAddr) return c.pc;
  for (let i = 0; i < c.regCount; i++) {
    const ra = cpuMicroArchRegAddr(consts, i);
    if (ra !== null && ra === addr) return parseInt(c.regs[i], 2);
  }
  if (!c.microSlots) c.microSlots = new Map();
  return c.microSlots.has(addr) ? c.microSlots.get(addr) : 0;
}

function cpuMicroWriteSlot(c, isaInst, addr, value, pcRef) {
  const consts = isaInst.consts || {};
  const masked = value & cpuMicroMask(c);
  const pcAddr = cpuConstAddr(consts, 'PC');
  if (pcAddr !== null && addr === pcAddr) {
    c.pc = masked;
    if (pcRef) pcRef.touched = true;
    return;
  }
  for (let i = 0; i < c.regCount; i++) {
    const ra = cpuMicroArchRegAddr(consts, i);
    if (ra !== null && ra === addr) {
      c.regs[i] = masked.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
      return;
    }
  }
  if (!c.microSlots) c.microSlots = new Map();
  c.microSlots.set(addr, masked);
}

function cpuMicroAluEval(c, isaInst) {
  const consts = isaInst.consts || {};
  const aAddr = cpuConstAddr(consts, 'ALUA');
  const bAddr = cpuConstAddr(consts, 'ALUB');
  const opAddr = cpuConstAddr(consts, 'ALUOP');
  if (aAddr == null || bAddr == null || opAddr == null) {
    throw Error('Micro ALU requires ALUA, ALUB, ALUOP in consts');
  }
  const a = cpuMicroReadSlot(c, isaInst, aAddr);
  const b = cpuMicroReadSlot(c, isaInst, bAddr);
  const opBits = cpuMicroReadSlot(c, isaInst, opAddr);
  const addLit = cpuConstLiteral(consts, 'ADD');
  const subLit = cpuConstLiteral(consts, 'SUB');
  const mask = cpuMicroMask(c);
  if (addLit !== null && opBits === addLit) return (a + b) & mask;
  if (subLit !== null && opBits === subLit) return (a - b) & mask;
  throw Error(`Micro: unsupported ALU operation code ${opBits}`);
}

function cpuMicroReadValue(c, isaInst, fields, sym) {
  sym = String(sym).toUpperCase();
  const consts = isaInst.consts || {};

  if (sym === 'R') {
    const idx = fields.R;
    if (idx == null || idx < 0 || idx >= c.regCount) throw Error(`Micro: invalid R field ${idx}`);
    return parseInt(c.regs[idx], 2);
  }
  if (sym === 'A') {
    if (fields.A == null) throw Error('Micro: missing A field');
    return fields.A;
  }
  const rm = /^R(\d+)$/.exec(sym);
  if (rm) {
    const idx = parseInt(rm[1], 10);
    if (idx < 0 || idx >= c.regCount) throw Error(`Micro: invalid register ${sym}`);
    return parseInt(c.regs[idx], 2);
  }
  if (sym === 'PC') return c.pc;
  if (/^\d+$/.test(sym)) return parseInt(sym, 10);

  const lit = cpuConstLiteral(consts, sym);
  if (lit !== null) return lit;

  const addr = cpuConstAddr(consts, sym);
  if (addr !== null) return cpuMicroReadSlot(c, isaInst, addr);

  throw Error(`Micro: unknown symbol '${sym}'`);
}

function cpuMicroWriteValue(c, isaInst, fields, sym, value, pcRef) {
  sym = String(sym).toUpperCase();
  const consts = isaInst.consts || {};
  const masked = value & cpuMicroMask(c);

  if (sym === 'R') {
    const idx = fields.R;
    if (idx == null || idx < 0 || idx >= c.regCount) throw Error(`Micro: invalid R field ${idx}`);
    c.regs[idx] = masked.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
    return;
  }
  if (sym === 'A') throw Error('Micro: cannot write to operand A');
  const rm = /^R(\d+)$/.exec(sym);
  if (rm) {
    const idx = parseInt(rm[1], 10);
    if (idx < 0 || idx >= c.regCount) throw Error(`Micro: invalid register ${sym}`);
    c.regs[idx] = masked.toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
    return;
  }
  if (sym === 'PC') {
    c.pc = masked;
    if (pcRef) pcRef.touched = true;
    return;
  }
  if (sym === 'HALTED') {
    c.halted = masked ? 1 : 0;
    return;
  }

  const addr = cpuConstAddr(consts, sym);
  if (addr !== null) {
    cpuMicroWriteSlot(c, isaInst, addr, masked, pcRef);
    return;
  }
  throw Error(`Micro: cannot write '${sym}'`);
}

function cpuMicroDoRead(c, isaInst) {
  const consts = isaInst.consts || {};
  const marAddr = cpuConstAddr(consts, 'MAR');
  const mdrAddr = cpuConstAddr(consts, 'MDR');
  if (marAddr == null || mdrAddr == null) {
    throw Error('Micro READ requires MAR and MDR in ISA consts');
  }
  const memAdr = cpuMicroReadSlot(c, isaInst, marAddr);
  const cell = cpuReadRamCell(c, memAdr);
  const val = cell != null ? parseInt(cell, 2) : 0;
  cpuMicroWriteSlot(c, isaInst, mdrAddr, val, null);
}

function cpuMicroDoWrite(c, isaInst) {
  const consts = isaInst.consts || {};
  const marAddr = cpuConstAddr(consts, 'MAR');
  const mdrAddr = cpuConstAddr(consts, 'MDR');
  if (marAddr == null || mdrAddr == null) {
    throw Error('Micro WRITE requires MAR and MDR in ISA consts');
  }
  const memAdr = cpuMicroReadSlot(c, isaInst, marAddr);
  const val = cpuMicroReadSlot(c, isaInst, mdrAddr);
  const bits = (val & cpuMicroMask(c)).toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
  cpuWriteRamCell(c, memAdr, bits);
}

function cpuRunMicroSequence(c, isaInst, opDef, fields) {
  const program = opDef.microProgram;
  if (!program || !program.length) throw Error('Micro: empty microProgram');
  const pcRef = { touched: false };
  for (const mic of program) {
    if (mic.kind === 'read') {
      cpuMicroDoRead(c, isaInst);
      continue;
    }
    if (mic.kind === 'write') {
      cpuMicroDoWrite(c, isaInst);
      continue;
    }
    if (mic.kind === 'transfer') {
      const val = cpuMicroReadValue(c, isaInst, fields, mic.src);
      cpuMicroWriteValue(c, isaInst, fields, mic.dst, val, pcRef);
      continue;
    }
    throw Error(`Micro: unknown op kind '${mic.kind}'`);
  }
  if (!pcRef.touched && opDef.pcEffect === 'autoInc') c.pc += 1;
}

function cpuStepLegacy(c, ctx, instr) {
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
}

function cpuStepBody(c, ctx) {
  const instr = cpuFetchInstr(c);
  c.lastInstr = instr;

  let isaInst = null;
  if (c.isaRef && ctx && ctx.inlineInstances) {
    isaInst = ctx.inlineInstances.get(c.isaRef);
  }

  if (isaInst && isaInst.opcodes && typeof decodeMnemonicFromBits === 'function') {
    const isa = {
      opcodes: isaInst.opcodes,
      wordWidth: isaInst.wordWidth,
      opcodeOrder: isaInst.opcodeOrder,
      asmSet: isaInst.asmSet || null,
      asmSetId: isaInst.asmSetId || null,
    };
    const decoded = decodeMnemonicFromBits(isa, instr);
    const asmSetId = isaInst.asmSetId || (isaInst.asmSet && isaInst.asmSet.id) || 'generic';

    if (decoded) {
      const opDef = isaInst.opcodes[decoded.mnemonic];
      if (opDef && opDef.microProgram && opDef.microProgram.length) {
        cpuRunMicroSequence(c, isaInst, opDef, decoded.fields);
        cpuTraceStep(c, ctx, instr);
        if (!c.halted && (!cpuIsMulti(c) || c.activeCore === 0)) cpuTryServeIrq(c);
        return;
      }
      if (isaInst.asmSet && typeof isaInst.asmSet.executeInstruction === 'function') {
        isaInst.asmSet.executeInstruction(c, ctx, isaInst, decoded, instr, opDef);
        cpuTraceStep(c, ctx, instr);
        if (!c.halted && (!cpuIsMulti(c) || c.activeCore === 0)) cpuTryServeIrq(c);
        return;
      }
    }

    if (asmSetId !== 'generic') {
      const msg = decoded
        ? `No executor for opcode '${decoded.mnemonic}' on asm set '${asmSetId}' at PC ${c.pc}`
        : `Cannot decode instruction at PC ${c.pc} for asm set '${asmSetId}'`;
      throw Error(msg);
    }
  }

  cpuStepLegacy(c, ctx, instr);
  cpuTraceStep(c, ctx, instr);
  if (!c.halted && (!cpuIsMulti(c) || c.activeCore === 0)) cpuTryServeIrq(c);
}

function cpuStep(id, ctx) {
  const c = getCpu(id);
  if (!c) return;
  c._stepCtx = ctx || null;

  if (cpuIsMulti(c)) {
    const idx = cpuPickNextCore(c);
    if (idx < 0) return;
    cpuBindCoreForExec(c, idx);
    if (c.halted) {
      cpuFlushCoreFromExec(c);
      return;
    }
    cpuStepBody(c, ctx);
    cpuFlushCoreFromExec(c);
    cpuBindCoreForExec(c, 0);
    return;
  }

  if (c.halted) return;
  cpuStepBody(c, ctx);
}

function cpuSetIrqPins(c, irqActive, irqVec) {
  if (!c) return;
  if (irqActive !== undefined) c.irqActive = irqActive ? 1 : 0;
  if (irqVec !== undefined) c.irqVec = irqVec | 0;
}

function cpuRun(id, maxSteps, ctx, shouldStall) {
  const c = getCpu(id);
  if (!c) return 0;
  if (!cpuIsMulti(c) && c.halted) return 0;
  const limit = maxSteps != null ? maxSteps : c.maxSteps;
  let steps = 0;
  while (cpuAnyRunnable(c) && steps < limit) {
    if (typeof shouldStall === 'function' && shouldStall()) break;
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

function getCpuReg(id, r, coreIdx) {
  const c = getCpu(id);
  if (!c || r < 0 || r >= c.regCount) return null;
  if (cpuIsMulti(c)) {
    const idx = coreIdx != null ? coreIdx : 0;
    if (idx < 0 || idx >= c.coreCount) return null;
    return c.cores[idx].regs[r];
  }
  return c.regs[r];
}

function getCpuRam(id, adr) {
  const c = getCpu(id);
  if (!c || adr < 0 || adr >= c.ramLength) return null;
  return cpuReadRamCell(c, adr);
}

function getCpuProg(id, adr, coreIdx) {
  const c = getCpu(id);
  if (!c) return null;
  if (cpuIsMulti(c)) {
    const idx = coreIdx != null ? coreIdx : (c.activeCore || 0);
    const core = c.cores[idx];
    if (!core || adr < 0 || adr >= core.progLength) return null;
    if (core.progMemId && typeof getMem === 'function') return getMem(core.progMemId, adr);
    return core.prog[adr];
  }
  if (adr < 0 || adr >= c.progLength) return null;
  return cpuReadProgCell(c, adr);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addCpu, getCpu, loadCpuRam, loadCpuProg, loadCpuCoreProg, cpuAfterProgReload, cpuResetFlags, cpuStep, cpuRun,
    getCpuReg, getCpuRam, getCpuProg, cpuReadProgCell, cpuWriteProgCell, splitBlob, cpuSetIrqPins,
    cpuWakeCore, cpuParkCore, cpuParseActiveMask, cpuIsMulti, cpuCoreCount,
  };
}
