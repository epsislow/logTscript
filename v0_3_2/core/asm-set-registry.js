/* ================= ASM SET REGISTRY ================= */

const ASM_SET_BUILTIN_ORDER = ['generic', 'riscv32', 'arm-thumb', 'variable8'];

function createAsmSetRegistry() {
  const sets = new Map();

  function register(profile) {
    if (!profile || !profile.id) {
      throw new Error('AsmSetRegistry.register: profile.id required');
    }
    sets.set(profile.id, profile);
  }

  function resolve(id) {
    const key = id == null || id === '' ? 'generic' : String(id).trim();
    const profile = sets.get(key);
    if (!profile) {
      throw new Error(`Unknown asm set '${key}' (expected one of: ${[...sets.keys()].join(', ')})`);
    }
    return profile;
  }

  function listProfiles() {
    return ASM_SET_BUILTIN_ORDER
      .filter(id => sets.has(id))
      .map(id => sets.get(id));
  }

  function mergeIsaWithSet(userIsa, profile) {
    const mergedOpcodes = {};
    const order = [];
    const presetOpcodes = profile.defaultOpcodes || {};
    const presetOrder = profile.opcodeOrder || Object.keys(presetOpcodes);

    for (const mn of presetOrder) {
      if (!presetOpcodes[mn]) continue;
      mergedOpcodes[mn] = { ...presetOpcodes[mn] };
      order.push(mn);
    }

    const userOpcodes = userIsa.opcodes || {};
    for (const mn of userIsa.opcodeOrder || Object.keys(userOpcodes)) {
      const def = userOpcodes[mn];
      if (!def) continue;
      if (profile.validateUserOpcode) {
        const err = profile.validateUserOpcode(mn, def);
        if (err) throw new Error(err);
      }
      const presetDef = mergedOpcodes[mn];
      if (presetDef && def.microProgram && (!def.segments || !def.segments.length)) {
        mergedOpcodes[mn] = {
          ...presetDef,
          microRaw: def.microRaw,
          microProgram: def.microProgram,
          pcEffect: def.pcEffect || presetDef.pcEffect,
          execution: 'micro',
        };
      } else {
        mergedOpcodes[mn] = { ...def };
      }
      const idx = order.indexOf(mn);
      if (idx >= 0) order.splice(idx, 1);
      order.push(mn);
    }

    let wordWidth = userIsa.wordWidth;
    if (wordWidth == null) wordWidth = profile.wordWidth;
    if (wordWidth == null && order.length) {
      const first = mergedOpcodes[order[0]];
      if (first && first.wordWidth) wordWidth = first.wordWidth;
    }
    if (wordWidth == null && Object.keys(mergedOpcodes).length === 0 && profile.wordWidth != null) {
      wordWidth = profile.wordWidth;
    }
    if (wordWidth == null && Object.keys(mergedOpcodes).length === 0) {
      throw new Error('ISA definition has no opcodes');
    }

    const encoding = userIsa.encoding != null ? userIsa.encoding : (profile.encoding || 'fixed');

    if (Object.keys(mergedOpcodes).length) {
      for (const mn of order) {
        const def = mergedOpcodes[mn];
        if (!def) continue;
        const w = def.wordWidth || (def.segments
          ? def.segments.reduce((s, seg) => s + (typeof segmentWidth === 'function'
            ? segmentWidth(seg)
            : (seg.kind === 'literal' ? seg.bits.length : seg.width)), 0)
          : wordWidth);
        if (def.wordWidth == null && w) def.wordWidth = w;
        if (encoding !== 'variable' && wordWidth != null && w && wordWidth !== w) {
          throw new Error(`ISA opcode '${mn}' encodes to ${w} bits but wordWidth is ${wordWidth}`);
        }
      }
    }

    return {
      opcodes: mergedOpcodes,
      wordWidth,
      encoding,
      opcodeOrder: order,
      consts: { ...(profile.consts || {}), ...(userIsa.consts || {}) },
      macros: { ...(profile.macros || {}), ...(userIsa.macros || {}) },
      hasAnyMicro: !!userIsa.hasAnyMicro,
      asmSetId: profile.id,
      asmSet: profile,
    };
  }

  return { register, resolve, listProfiles, mergeIsaWithSet, sets };
}

function initDefaultAsmSetRegistry() {
  const registry = createAsmSetRegistry();
  if (typeof createGenericAsmSet === 'function') {
    registry.register(createGenericAsmSet());
  }
  if (typeof createRiscv32AsmSet === 'function') {
    registry.register(createRiscv32AsmSet());
  }
  if (typeof createArmThumbAsmSet === 'function') {
    registry.register(createArmThumbAsmSet());
  }
  if (typeof createVariable8AsmSet === 'function') {
    registry.register(createVariable8AsmSet());
  }
  return registry;
}

let _defaultRegistry = null;

function getAsmSetRegistry() {
  if (!_defaultRegistry) _defaultRegistry = initDefaultAsmSetRegistry();
  return _defaultRegistry;
}

function resolveAsmSet(id) {
  return getAsmSetRegistry().resolve(id);
}

function mergeIsaWithSet(userIsa, asmSetId) {
  const profile = resolveAsmSet(asmSetId);
  return getAsmSetRegistry().mergeIsaWithSet(userIsa, profile);
}

function listAsmSetProfiles() {
  return getAsmSetRegistry().listProfiles();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createAsmSetRegistry,
    initDefaultAsmSetRegistry,
    getAsmSetRegistry,
    resolveAsmSet,
    mergeIsaWithSet,
    listAsmSetProfiles,
    ASM_SET_BUILTIN_ORDER,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.getAsmSetRegistry = getAsmSetRegistry;
  globalThis.resolveAsmSet = resolveAsmSet;
  globalThis.mergeIsaWithSet = mergeIsaWithSet;
  globalThis.listAsmSetProfiles = listAsmSetProfiles;
}
