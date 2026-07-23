var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function cpuParseOnReset(attr) {
  if (!attr) return ['pc', 'regs', 'sp', 'halted'];
  if (typeof attr === 'string') {
    const s = attr.trim().toLowerCase();
    if (s === 'none') return [];
    if (s === 'all') return ['pc', 'ram', 'regs', 'sp', 'halted'];
    return attr.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
  }
  return ['pc', 'regs', 'sp', 'halted'];
}

function cpuSection(attrs, key, defaults) {
  const s = attrs && attrs[key];
  if (!s || typeof s !== 'object') {
    return { depth: defaults.depth, length: defaults.length, initialValue: null };
  }
  return {
    depth: s.depth !== undefined ? parseInt(s.depth, 10) : defaults.depth,
    length: s.length !== undefined ? parseInt(s.length, 10) : defaults.length,
    initialValue: s.initialValue != null ? s.initialValue : null,
  };
}

function cpuAddrBits(length) {
  if (length <= 1) return 1;
  return Math.ceil(Math.log2(length));
}

function cpuParseVectors(attr) {
  if (attr == null) return null;
  let parts;
  if (typeof attr === 'string') {
    parts = attr.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
  } else if (Array.isArray(attr)) {
    parts = attr.map(x => String(x).trim()).filter(Boolean);
  } else {
    return null;
  }
  if (!parts.length) return null;
  return parts.map(x => {
    const n = parseInt(x, 10);
    if (isNaN(n)) throw Error(`Invalid vectors entry '${x}'`);
    return n;
  });
}

function cpuParseVectorBase(map) {
  if (!map || map.vectorBase === undefined) return null;
  const n = parseInt(map.vectorBase, 10);
  return isNaN(n) ? null : n;
}

var CpuComponent = class CpuComponent extends BuiltinComponent {
  static get type() { return 'cpu'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return {
      bindingAttrs: ['isa', 'clock', 'output', 'trace', 'prog', 'ram'],
      nestedBlockAttrs: ['ram', 'prog', 'map'],
      listAttrs: ['vectors'],
    };
  }

  _hasInternalSpaceSection(attributes, key) {
    const s = attributes && attributes[key];
    if (!s || typeof s !== 'object') return false;
    return s.depth !== undefined || s.length !== undefined || s.initialValue != null;
  }

  _resolveMemLink(ref, ctx) {
    if (!ref || !ctx || !ctx.components) {
      throw Error('CPU memory link requires a component reference');
    }
    const comp = ctx.components.get(ref);
    if (!comp || comp.type !== 'mem') {
      throw Error(`CPU memory link ${ref} must be comp [mem]`);
    }
    if (!comp.deviceIds || !comp.deviceIds[0]) {
      throw Error(`CPU memory link ${ref} has no device id`);
    }
    const depth = comp.attributes.depth !== undefined ? parseInt(comp.attributes.depth, 10) : 4;
    const length = comp.attributes.length !== undefined ? parseInt(comp.attributes.length, 10) : 3;
    if (isNaN(depth) || depth < 1 || isNaN(length) || length < 1) {
      throw Error(`CPU memory link ${ref} has invalid depth/length`);
    }
    const readonly = !!(comp.attributes && comp.attributes.readonly);
    return { memId: comp.deviceIds[0], compRef: ref, depth, length, readonly };
  }

  _resolveTerminalId(ref, ctx) {
    if (!ref || !ctx || !ctx.components) return null;
    const comp = ctx.components.get(ref);
    if (!comp || comp.type !== 'terminal' || !comp.deviceIds || !comp.deviceIds[0]) return null;
    return comp.deviceIds[0];
  }

  _parseFetch(attributes) {
    const f = attributes.fetch;
    if (f === 'ram' || f === 1 || f === '1') return 'ram';
    return 'prog';
  }

  _parseMaxSteps(attributes) {
    if (attributes.maxSteps === undefined) return 10000;
    const n = parseInt(attributes.maxSteps, 10);
    return isNaN(n) || n < 1 ? 10000 : n;
  }

  _parseTraceMode(attributes, ctx) {
    const tr = attributes.trace;
    if (tr === 'on' || tr === 1 || tr === '1') return { mode: 'on', terminalId: null };
    if (tr === 'output') return { mode: 'output', terminalId: null };
    if (tr === 'off' || tr === 0 || tr === '0' || tr == null) return { mode: 'off', terminalId: null };
    if (typeof tr === 'string' && tr.startsWith('.')) {
      return { mode: 'terminal', terminalId: this._resolveTerminalId(tr, ctx) };
    }
    return { mode: 'off', terminalId: null };
  }

  getWidthBits(attributes) {
    const ram = cpuSection(attributes, 'ram', { depth: 8, length: 16 });
    return ram.depth;
  }

  _cpuId(comp) {
    return comp.deviceIds[0];
  }

  _regCount(attributes) {
    return attributes.registers !== undefined ? parseInt(attributes.registers, 10) : 4;
  }

  _resolveBlob(initialValue, attributes, ctx) {
    if (!initialValue) return null;
    if (typeof initialValue === 'string') return initialValue;
    if (typeof initialValue === 'object' && initialValue.kind === 'asmProgram') {
      const assembled = ctx.evalAsmProgram(initialValue, attributes);
      return assembled.value;
    }
    if (typeof initialValue === 'object' && initialValue.varRef) {
      const wire = ctx.wires.get(initialValue.varRef);
      if (!wire) throw Error(`Undefined wire '${initialValue.varRef}' for CPU init`);
      const resolved = ctx.getWireEffectiveValue(initialValue.varRef);
      if (resolved === null) throw Error(`Wire '${initialValue.varRef}' has no value for CPU init`);
      return resolved;
    }
    return null;
  }

  _loadSpace(comp, space, blob, ctx) {
    const id = this._cpuId(comp);
    if (space === 'prog' && typeof loadCpuProg === 'function') loadCpuProg(id, blob, ctx);
    else if (space === 'ram' && typeof loadCpuRam === 'function') loadCpuRam(id, blob, ctx);
    if (space === 'prog' && typeof cpuAfterProgReload === 'function') cpuAfterProgReload(id);
  }

  _resolveMemoryLayout(attributes, ctx) {
    const progMembers = attributes.progMembers;
    const ramMembers = attributes.ramMembers;
    let progLink = null;
    let ramLink = null;

    if (progMembers && progMembers.length) {
      if (this._hasInternalSpaceSection(attributes, 'prog')) {
        throw Error('CPU cannot use prog = .mem together with prog: sub-block');
      }
      progLink = this._resolveMemLink(progMembers[0], ctx);
    }
    if (ramMembers && ramMembers.length) {
      if (this._hasInternalSpaceSection(attributes, 'ram')) {
        throw Error('CPU cannot use ram = .mem together with ram: sub-block');
      }
      ramLink = this._resolveMemLink(ramMembers[0], ctx);
    }

    const ramDefaults = { depth: 8, length: 16 };
    const progDefaults = { depth: 8, length: 32 };
    let ram = cpuSection(attributes, 'ram', ramDefaults);
    let prog = cpuSection(attributes, 'prog', progDefaults);

    if (ramLink) {
      ram = { depth: ramLink.depth, length: ramLink.length, initialValue: null };
    }
    if (progLink) {
      prog = { depth: progLink.depth, length: progLink.length, initialValue: null };
    }

    if (ramLink && progLink && ramLink.depth !== progLink.depth) {
      throw Error(`CPU linked ram depth ${ramLink.depth} must match prog depth ${progLink.depth}`);
    }
    if (!ramLink && progLink && ram.depth !== progLink.depth) {
      throw Error(`CPU internal ram depth ${ram.depth} must match linked prog depth ${progLink.depth}`);
    }
    if (ramLink && !progLink && ramLink.depth !== prog.depth) {
      throw Error(`CPU linked ram depth ${ramLink.depth} must match internal prog depth ${prog.depth}`);
    }

    return { ram, prog, progLink, ramLink };
  }

  getDef(attributes) {
    const attrs = attributes || {};
    const ram = cpuSection(attrs, 'ram', { depth: 8, length: 16 });
    const prog = cpuSection(attrs, 'prog', { depth: 8, length: 32 });
    const regN = attrs.registers !== undefined ? parseInt(attrs.registers, 10) : 4;
    const ramAdrBits = cpuAddrBits(ram.length);
    const progAdrBits = cpuAddrBits(prog.length);
    const pcBits = progAdrBits;
    const pouts = [
      { bits: String(pcBits), name: 'pc' },
      { bits: '1', name: 'halted' },
      { bits: '1', name: 'ie' },
      { bits: '1', name: 'irqPending' },
      { bits: String(prog.depth), name: 'instr' },
      { bits: String(ram.depth), name: 'ram:get' },
      { bits: String(prog.depth), name: 'prog:get' },
    ];
    for (let i = 0; i < regN && i < 16; i++) {
      pouts.push({ bits: String(ram.depth), name: 'r' + i });
    }
    pouts.push({ bits: 'X', name: 'trace:get' });
    return {
      attrs: [
        { name: 'isa', value: '.asm' },
        { name: 'registers', value: 'integer' },
        { name: 'sp', value: 'integer' },
        { name: 'pcInit', value: 'integer' },
        { name: 'onReset', value: 'list' },
        { name: 'fetch', value: 'prog|ram' },
        { name: 'maxSteps', value: 'integer' },
        { name: 'trace', value: 'off|on|output|.terminal' },
        { name: 'output', value: '.terminal' },
        { name: 'clock', value: '.component' },
        { name: 'ram', value: 'block|=.mem' },
        { name: 'prog', value: 'block|=.mem' },
        { name: 'map', value: 'block' },
        { name: 'vectors', value: 'list' },
      ],
      initValue: null,
      pins: [
        { bits: '1', name: 'set' },
        { bits: '1', name: 'run' },
        { bits: '1', name: 'reset' },
        { bits: String(ramAdrBits), name: 'ramAdr' },
        { bits: String(progAdrBits), name: 'progAdr' },
        { bits: '1', name: 'resetPC' },
        { bits: '1', name: 'resetRAM' },
        { bits: '1', name: 'resetRegs' },
        { bits: '1', name: 'resetSP' },
        { bits: '1', name: 'resetHalted' },
        { bits: '1', name: 'irq' },
        { bits: '4', name: 'irqVec' },
      ],
      pouts,
      returns: null,
    };
  }

  supportsPropertyName(property, attributes) {
    if (['pc', 'halted', 'ie', 'irqPending', 'instr', 'ram:get', 'prog:get', 'trace:get'].includes(property)) return true;
    if (/^r\d+$/.test(property)) {
      const n = parseInt(property.substring(1), 10);
      return n >= 0 && n < this._regCount(attributes);
    }
    return false;
  }

  getSupportedProperties() {
    return ['pc', 'halted', 'ie', 'irqPending', 'instr', 'ram:get', 'prog:get', 'trace:get',
      'set', 'run', 'reset', 'ramAdr', 'progAdr', 'irq', 'irqVec',
      'resetPC', 'resetRAM', 'resetRegs', 'resetSP', 'resetHalted'];
  }

  getRedirectProperties() {
    return ['pc', 'halted', 'ie', 'irqPending', 'instr', 'ram:get', 'prog:get', 'trace:get',
      'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];
  }

  getForbidDirectAssign() {
    return 'Use .cpu:prog = … or .cpu:ram = … to reload program or RAM';
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property === 'prog' || property === 'ram') {
      this._loadSpace(comp, property, value, ctx);
      return true;
    }
    return false;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const { ram, prog, progLink, ramLink } = this._resolveMemoryLayout(attributes, ctx);
    const map = attributes.map && typeof attributes.map === 'object' ? attributes.map : {};
    const vectorBase = cpuParseVectorBase(map);
    const fixedVectors = cpuParseVectors(attributes.vectors);
    if (fixedVectors && vectorBase != null) {
      throw Error('CPU cannot use both vectors: and map.vectorBase');
    }
    const regCount = this._regCount(attributes);
    const pcInit = attributes.pcInit !== undefined ? parseInt(attributes.pcInit, 10) : 0;
    const spReg = attributes.sp !== undefined ? parseInt(attributes.sp, 10) : null;
    const stackTop = map.stack !== undefined ? parseInt(map.stack, 10) : ram.length - 1;
    const fetchFrom = this._parseFetch(attributes);
    const maxSteps = this._parseMaxSteps(attributes);
    const traceParsed = this._parseTraceMode(attributes, ctx);
    let traceMode = traceParsed.mode;
    let traceTerminalId = traceParsed.terminalId;
    const traceMembers = attributes.traceMembers;
    if (traceMembers && traceMembers.length) {
      traceTerminalId = this._resolveTerminalId(traceMembers[0], ctx);
    }
    if (traceTerminalId && traceMode === 'off') {
      traceMode = 'terminal';
    }
    let outputTerminalId = null;
    const outMembers = attributes.outputMembers;
    if (outMembers && outMembers.length) {
      outputTerminalId = this._resolveTerminalId(outMembers[0], ctx);
    } else if (typeof attributes.output === 'string' && attributes.output.startsWith('.')) {
      outputTerminalId = this._resolveTerminalId(attributes.output, ctx);
    }

    if (typeof addCpu === 'function') {
      addCpu(baseId, {
        regCount,
        ramDepth: ram.depth,
        ramLength: ram.length,
        progDepth: prog.depth,
        progLength: prog.length,
        pcInit,
        spReg,
        stackTop,
        onReset: cpuParseOnReset(attributes.onReset),
        fetchFrom,
        maxSteps,
        traceMode,
        traceTerminalId,
        outputTerminalId,
        progMemId: progLink ? progLink.memId : null,
        ramMemId: ramLink ? ramLink.memId : null,
        progReadonly: progLink ? progLink.readonly : true,
        vectorBase,
        fixedVectors,
      });
    }

    const ramInit = !ramLink && ram.initialValue != null ? this._resolveBlob(ram.initialValue, attributes, ctx) : null;
    const progInit = !progLink && prog.initialValue != null ? this._resolveBlob(prog.initialValue, attributes, ctx) : null;
    if (ramInit) this._loadSpace({ deviceIds: [baseId] }, 'ram', ramInit, ctx);
    if (progInit) this._loadSpace({ deviceIds: [baseId] }, 'prog', progInit, ctx);
    else if (!progLink && typeof cpuAfterProgReload === 'function') cpuAfterProgReload(baseId);

    const compInfo = {
      deviceIds: [baseId],
      ref: null,
      progMemRef: progLink ? progLink.compRef : null,
      ramMemRef: ramLink ? ramLink.compRef : null,
    };
    return compInfo;
  }

  _isActive(val) {
    return val === '1' || (val && val[val.length - 1] === '1');
  }

  _applyResets(comp, pending, ctx) {
    const flags = [];
    if (pending.resetPC !== undefined && this._isActive(this.reEvalPendingValue(pending, 'resetPC', false, ctx))) flags.push('pc');
    if (pending.resetRAM !== undefined && this._isActive(this.reEvalPendingValue(pending, 'resetRAM', false, ctx))) flags.push('ram');
    if (pending.resetRegs !== undefined && this._isActive(this.reEvalPendingValue(pending, 'resetRegs', false, ctx))) flags.push('regs');
    if (pending.resetSP !== undefined && this._isActive(this.reEvalPendingValue(pending, 'resetSP', false, ctx))) flags.push('sp');
    if (pending.resetHalted !== undefined && this._isActive(this.reEvalPendingValue(pending, 'resetHalted', false, ctx))) flags.push('halted');
    if (flags.length && typeof cpuResetFlags === 'function') {
      cpuResetFlags(this._cpuId(comp), flags);
    }
  }

  _syncIrqPins(comp, pending, reEvaluate, ctx) {
    const id = this._cpuId(comp);
    const c = typeof getCpu === 'function' ? getCpu(id) : null;
    if (!c || typeof cpuSetIrqPins !== 'function') return;
    let irqActive;
    let irqVec;
    if (pending.irq !== undefined) {
      irqActive = this._isActive(this.reEvalPendingValue(pending, 'irq', reEvaluate, ctx));
    }
    if (pending.irqVec !== undefined) {
      const v = this.reEvalPendingValue(pending, 'irqVec', reEvaluate, ctx);
      irqVec = parseInt(v, 2);
      if (isNaN(irqVec)) irqVec = 0;
    }
    cpuSetIrqPins(c, irqActive, irqVec);
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate' || !pending) return;
    const id = this._cpuId(comp);

    if (pending.reset !== undefined && this._isActive(this.reEvalPendingValue(pending, 'reset', reEvaluate, ctx))) {
      const flags = cpuParseOnReset(comp.attributes.onReset);
      if (typeof cpuResetFlags === 'function') cpuResetFlags(id, flags);
    }

    this._applyResets(comp, pending, ctx);

    if (pending.ramAdr !== undefined) {
      const v = this.reEvalPendingValue(pending, 'ramAdr', reEvaluate, ctx);
      const c = typeof getCpu === 'function' ? getCpu(id) : null;
      if (c) c.peekRamAdr = parseInt(v, 2);
    }
    if (pending.progAdr !== undefined) {
      const v = this.reEvalPendingValue(pending, 'progAdr', reEvaluate, ctx);
      const c = typeof getCpu === 'function' ? getCpu(id) : null;
      if (c) c.peekProgAdr = parseInt(v, 2);
    }

    if (pending.set !== undefined && this._isActive(this.reEvalPendingValue(pending, 'set', reEvaluate, ctx))) {
      this._syncIrqPins(comp, pending, reEvaluate, ctx);
      if (typeof cpuStep === 'function') cpuStep(id, ctx);
      if (ctx.deferWirePropagation && ctx.deferWirePropagation() && ctx.signalPropagationStrategy) {
        const executed = new Set();
        if (ctx.signalPropagationStrategy._scheduleWiresDependingOnComponent(compName, executed)) {
          ctx.signalPropagationStrategy.propagate();
        }
      } else {
        ctx.updateComponentConnections(compName);
      }
    }

    if (pending.run !== undefined && this._isActive(this.reEvalPendingValue(pending, 'run', reEvaluate, ctx))) {
      this._syncIrqPins(comp, pending, reEvaluate, ctx);
      const c = typeof getCpu === 'function' ? getCpu(id) : null;
      const max = c && c.maxSteps != null ? c.maxSteps : 10000;
      if (typeof cpuRun === 'function') cpuRun(id, max, ctx);
      if (ctx.deferWirePropagation && ctx.deferWirePropagation() && ctx.signalPropagationStrategy) {
        const executed = new Set();
        if (ctx.signalPropagationStrategy._scheduleWiresDependingOnComponent(compName, executed)) {
          ctx.signalPropagationStrategy.propagate();
        }
      } else {
        ctx.updateComponentConnections(compName);
      }
    }
  }

  evalGetProperty(comp, property, a, ctx) {
    const id = this._cpuId(comp);
    const c = typeof getCpu === 'function' ? getCpu(id) : null;
    if (!c) return null;

    if (property === 'pc') {
      const bw = cpuAddrBits(c.progLength);
      const val = c.pc.toString(2).padStart(bw, '0');
      return { value: val, ref: null, varName: `${a.var}:pc`, bitWidth: bw };
    }
    if (property === 'halted') {
      return { value: c.halted ? '1' : '0', ref: null, varName: `${a.var}:halted`, bitWidth: 1 };
    }
    if (property === 'ie') {
      return { value: c.ie ? '1' : '0', ref: null, varName: `${a.var}:ie`, bitWidth: 1 };
    }
    if (property === 'irqPending') {
      return { value: c.irqPending ? '1' : '0', ref: null, varName: `${a.var}:irqPending`, bitWidth: 1 };
    }
    if (property === 'instr') {
      return { value: c.lastInstr, ref: null, varName: `${a.var}:instr`, bitWidth: c.progDepth };
    }
    if (property === 'ram:get') {
      const adr = c.peekRamAdr;
      let val = typeof getCpuRam === 'function' ? getCpuRam(id, adr) : null;
      if (val == null) val = '0'.repeat(c.ramDepth);
      return { value: val, ref: null, varName: `${a.var}:ram:get`, bitWidth: c.ramDepth };
    }
    if (property === 'prog:get') {
      const adr = c.peekProgAdr;
      let val = typeof getCpuProg === 'function' ? getCpuProg(id, adr) : null;
      if (val == null) val = '0'.repeat(c.progDepth);
      return { value: val, ref: null, varName: `${a.var}:prog:get`, bitWidth: c.progDepth };
    }
    if (property === 'trace:get') {
      const text = c.traceBuffer.join('\n');
      return { value: text, ref: null, varName: `${a.var}:trace:get`, bitWidth: Math.max(1, text.length * 8) };
    }
    const rm = /^r(\d+)$/.exec(property);
    if (rm) {
      const ri = parseInt(rm[1], 10);
      let val = typeof getCpuReg === 'function' ? getCpuReg(id, ri) : null;
      if (val == null) val = '0'.repeat(c.regDepth);
      return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth: c.regDepth };
    }
    return null;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CpuComponent;
}
