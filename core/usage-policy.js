/* ================= USAGE POLICY (Allow / NotAllow) ================= */

function createPolicyDimension(defaultAllowAll) {
  return {
    allowAll: defaultAllowAll === true,
    allowCategory: false,
    allowSpecific: new Set(),
    notAllowAll: false,
    notAllowCategory: false,
    notAllowSpecific: new Set(),
  };
}

function clonePolicyDimension(dim) {
  return {
    allowAll: dim.allowAll,
    allowCategory: dim.allowCategory,
    allowSpecific: new Set(dim.allowSpecific),
    notAllowAll: dim.notAllowAll,
    notAllowCategory: dim.notAllowCategory,
    notAllowSpecific: new Set(dim.notAllowSpecific),
  };
}

function applyMetaToDimension(dim, meta, isAllow) {
  if (meta === 'ALL') {
    if (isAllow) {
      dim.allowAll = true;
      dim.allowCategory = false;
      dim.allowSpecific.clear();
    } else {
      dim.notAllowAll = true;
      dim.notAllowCategory = false;
      dim.notAllowSpecific.clear();
    }
    return;
  }
  if (meta === 'NONE') {
    if (isAllow) {
      dim.allowAll = false;
      dim.allowCategory = false;
      dim.allowSpecific.clear();
    } else {
      dim.notAllowAll = false;
      dim.notAllowCategory = false;
      dim.notAllowSpecific.clear();
    }
  }
}

function applyCategoryToDimension(dim, isAllow) {
  if (isAllow) {
    if (dim.allowAll) return;
    dim.allowCategory = true;
  } else {
    if (dim.notAllowAll) return;
    dim.notAllowCategory = true;
  }
}

function applySpecificToDimension(dim, name, isAllow) {
  if (isAllow) {
    if (dim.allowAll) return;
    dim.allowSpecific.add(name);
  } else {
    if (dim.notAllowAll) return;
    dim.notAllowSpecific.add(name);
  }
}

function checkDimension(dim, id) {
  if (dim.notAllowAll) return { allowed: false, reason: 'NotAllow' };
  if (dim.notAllowCategory) return { allowed: false, reason: 'NotAllow' };
  if (dim.notAllowSpecific.has(id)) return { allowed: false, reason: 'NotAllow' };
  if (dim.allowAll) return { allowed: true, reason: null };
  if (dim.allowCategory) return { allowed: true, reason: null };
  if (dim.allowSpecific.has(id)) return { allowed: true, reason: null };
  return { allowed: false, reason: 'Allow' };
}

function formatDimensionLine(label, dim) {
  if (dim.notAllowAll) return `${label}: ALL`;
  if (dim.notAllowCategory && dim.notAllowSpecific.size === 0) return `${label}: ALL`;
  const parts = [];
  if (dim.notAllowCategory) parts.push('(category ALL)');
  for (const n of dim.notAllowSpecific) parts.push(n);
  if (!parts.length) return `${label}: (none)`;
  return `${label}: ${parts.join(', ')}`;
}

function formatAllowDimensionLine(label, dim) {
  if (dim.allowAll) return `${label}: ALL`;
  if (!dim.allowCategory && dim.allowSpecific.size === 0) return `${label}: (none)`;
  const parts = [];
  if (dim.allowCategory) parts.push('(category ALL)');
  for (const n of dim.allowSpecific) parts.push(n);
  return `${label}: ${parts.join(', ')}`;
}

var UsagePolicy = class UsagePolicy {
  constructor(moduleRegistry) {
    this.moduleRegistry = moduleRegistry || null;
    this.builtIn = createPolicyDimension(true);
    this.userFunc = createPolicyDimension(true);
    this.defAllowed = true;
    this.defNotAllowed = false;
    this.modules = new Map();
    if (moduleRegistry && typeof moduleRegistry.all === 'function') {
      for (const mod of moduleRegistry.all()) {
        this.modules.set(mod.moduleName, createPolicyDimension(true));
      }
    }
  }

  _ensureModule(moduleName) {
    if (!this.modules.has(moduleName)) {
      this.modules.set(moduleName, createPolicyDimension(true));
    }
    return this.modules.get(moduleName);
  }

  applyAllow(entries) {
    this._applyEntries(entries, true);
  }

  applyNotAllow(entries) {
    this._applyEntries(entries, false);
  }

  _applyMetaAll(entry, isAllow) {
    applyMetaToDimension(this.builtIn, entry.value, isAllow);
    applyMetaToDimension(this.userFunc, entry.value, isAllow);
    for (const dim of this.modules.values()) applyMetaToDimension(dim, entry.value, isAllow);
    if (isAllow) {
      if (entry.value === 'ALL') this.defAllowed = true;
      if (entry.value === 'NONE') this.defAllowed = false;
    } else {
      if (entry.value === 'ALL') this.defNotAllowed = true;
      if (entry.value === 'NONE') this.defNotAllowed = false;
    }
  }

  _applyEntries(entries, isAllow) {
    if (!entries || !entries.length) return;
    for (const entry of entries) {
      if (entry.kind === 'meta') {
        this._applyMetaAll(entry, isAllow);
        continue;
      }
      if (entry.kind === 'category') {
        if (entry.target === 'builtIn') applyCategoryToDimension(this.builtIn, isAllow);
        else if (entry.target === 'userFunc') applyCategoryToDimension(this.userFunc, isAllow);
        else if (entry.target === 'def') {
          if (isAllow) this.defAllowed = true;
          else this.defNotAllowed = true;
        } else if (entry.target === 'module') {
          applyCategoryToDimension(this._ensureModule(entry.moduleName), isAllow);
        }
        continue;
      }
      if (entry.kind === 'builtin') {
        applySpecificToDimension(this.builtIn, entry.name, isAllow);
        continue;
      }
      if (entry.kind === 'userFunc') {
        applySpecificToDimension(this.userFunc, entry.name, isAllow);
        continue;
      }
      if (entry.kind === 'moduleType') {
        const dim = this._ensureModule(entry.moduleName);
        for (const t of entry.types) applySpecificToDimension(dim, t, isAllow);
      }
    }
  }

  isBuiltInAllowed(name) {
    return checkDimension(this.builtIn, name);
  }

  isUserFuncCallAllowed(name) {
    return checkDimension(this.userFunc, name);
  }

  isDefAllowed() {
    if (this.defNotAllowed) return { allowed: false, reason: 'NotAllow' };
    if (!this.defAllowed) return { allowed: false, reason: 'Allow' };
    return { allowed: true, reason: null };
  }

  isModuleAllowed(moduleName, typeId) {
    const dim = this.modules.get(moduleName);
    if (!dim) return { allowed: true, reason: null };
    return checkDimension(dim, typeId);
  }

  formatDocLines(mode) {
    const lines = [];
    const isAllow = mode === 'Allow';
    const prefix = isAllow ? 'Allow policy:' : 'NotAllow policy:';
    lines.push(prefix);
    if (isAllow) {
      lines.push(formatAllowDimensionLine('builtIn functions', this.builtIn));
      if (this.moduleRegistry) {
        for (const mod of this.moduleRegistry.all()) {
          const dim = this.modules.get(mod.moduleName);
          lines.push(formatAllowDimensionLine(mod.docLabel || mod.moduleName, dim || createPolicyDimension(true)));
        }
      }
      lines.push(formatAllowDimensionLine('user functions', this.userFunc));
      lines.push(`def statements: ${this.defAllowed && !this.defNotAllowed ? 'allowed' : 'not allowed'}`);
    } else {
      lines.push(formatDimensionLine('builtIn functions', this.builtIn));
      if (this.moduleRegistry) {
        for (const mod of this.moduleRegistry.all()) {
          const dim = this.modules.get(mod.moduleName);
          lines.push(formatDimensionLine(mod.docLabel || mod.moduleName, dim || createPolicyDimension(true)));
        }
      }
      lines.push(formatDimensionLine('user functions', this.userFunc));
      if (this.defNotAllowed) lines.push('def statements: blocked');
      else lines.push('def statements: (none)');
    }
    return lines;
  }

  snapshot() {
    const modules = new Map();
    for (const [k, dim] of this.modules) modules.set(k, clonePolicyDimension(dim));
    return {
      builtIn: clonePolicyDimension(this.builtIn),
      userFunc: clonePolicyDimension(this.userFunc),
      defAllowed: this.defAllowed,
      defNotAllowed: this.defNotAllowed,
      modules,
    };
  }

  restore(snap) {
    if (!snap) return;
    this.builtIn = clonePolicyDimension(snap.builtIn);
    this.userFunc = clonePolicyDimension(snap.userFunc);
    this.defAllowed = snap.defAllowed;
    this.defNotAllowed = snap.defNotAllowed;
    this.modules = new Map();
    for (const [k, dim] of snap.modules) this.modules.set(k, clonePolicyDimension(dim));
  }

  clone() {
    const p = new UsagePolicy(this.moduleRegistry);
    p.restore(this.snapshot());
    return p;
  }
};

function collectBuiltinNamesForPolicy() {
  const names = new Set();
  if (typeof Interpreter !== 'undefined' && Interpreter.BUILTIN_DOC) {
    for (const n of Object.keys(Interpreter.BUILTIN_DOC)) names.add(n);
  }
  names.add('REG');
  names.add('MUX');
  names.add('DEMUX');
  if (typeof LogicValue !== 'undefined' && LogicValue.isBitPredicateBuiltin) {
    for (const n of ['ANY0', 'ANY1', 'ANYZ', 'ANYX', 'ALL0', 'ALL1', 'ALLZ', 'ALLX']) {
      if (LogicValue.isBitPredicateBuiltin(n)) names.add(n);
    }
  }
  return names;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UsagePolicy,
    collectBuiltinNamesForPolicy,
    createPolicyDimension,
    checkDimension,
  };
}
