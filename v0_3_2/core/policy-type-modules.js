/* ================= POLICY TYPE MODULES (module.type{}) ================= */

var INLINE_KINDS = ['asm', 'lut', 'protocol', 'plc'];

var PolicyTypeModuleRegistry = class PolicyTypeModuleRegistry {
  constructor() {
    this._modules = new Map();
  }

  register(descriptor) {
    if (!descriptor || !descriptor.moduleName) {
      throw new Error('PolicyTypeModuleRegistry.register: moduleName required');
    }
    this._modules.set(descriptor.moduleName, descriptor);
  }

  get(moduleName) {
    return this._modules.get(moduleName);
  }

  has(moduleName) {
    return this._modules.has(moduleName);
  }

  all() {
    return [...this._modules.values()];
  }

  moduleNames() {
    return [...this._modules.keys()];
  }
};

function resolveCompTypeToken(token, ctx) {
  const registry = ctx && ctx.componentRegistry;
  const shortnames = registry && registry.getShortnames
    ? registry.getShortnames()
    : {
      '7': '7seg', '+': 'adder', '-': 'subtract', '*': 'multiplier',
      '/': 'divider', '>': 'shifter', '=': 'counter', '~': 'osc',
      '14': '14seg', ':': 'dots', fifo: 'queue', lifo: 'stack', bar: 'ledBar',
    };
  const validTypes = registry && registry.getAllTypes
    ? registry.getAllTypes()
    : ['led', 'switch', 'dip', 'mem', 'reg', 'counter', 'adder', 'subtract',
      'divider', 'multiplier', 'shifter', 'rotary', 'lcd', 'key', 'osc'];
  if (shortnames[token]) return shortnames[token];
  if (token === '~') return 'osc';
  if (validTypes.includes(token)) return token;
  if (token === 'dots') return 'dots';
  if (token === '7seg') return '7seg';
  if (token === '14seg') return '14seg';
  if (token === '7') return '7seg';
  if (token === '14') return '14seg';
  return null;
}

function createDefaultPolicyTypeModules(ctx) {
  const registry = new PolicyTypeModuleRegistry();
  const componentRegistry = ctx && ctx.componentRegistry;

  registry.register({
    moduleName: 'comp',
    docLabel: 'comp types',
    resolveTypeToken(token) {
      const resolved = resolveCompTypeToken(token, { componentRegistry });
      if (!resolved) throw new Error(`Unknown entry '${token}' in comp.type{}`);
      return resolved;
    },
    getRuntimeId(stmt) {
      return stmt && stmt.comp && stmt.comp.type;
    },
  });

  registry.register({
    moduleName: 'chip',
    docLabel: 'chips',
    resolveTypeToken(token) { return token; },
    getRuntimeId(stmt) {
      return stmt && stmt.chipInstance && stmt.chipInstance.chipName;
    },
    parseDefinition: { keyword: 'chip', peekChar: '+' },
  });

  registry.register({
    moduleName: 'board',
    docLabel: 'boards',
    resolveTypeToken(token) { return token; },
    getRuntimeId(stmt) {
      return stmt && stmt.boardInstance && stmt.boardInstance.boardName;
    },
    parseDefinition: { keyword: 'board', peekChar: '+' },
  });

  registry.register({
    moduleName: 'pcb',
    docLabel: 'pcbs',
    resolveTypeToken(token) { return token; },
    getRuntimeId(stmt) {
      return stmt && stmt.pcbInstance && stmt.pcbInstance.pcbName;
    },
    parseDefinition: { keyword: 'pcb', peekChar: '+' },
  });

  registry.register({
    moduleName: 'inline',
    docLabel: 'inline kinds',
    resolveTypeToken(token) {
      if (!INLINE_KINDS.includes(token)) {
        throw new Error(`Unknown entry '${token}' in inline.type{}`);
      }
      return token;
    },
    getRuntimeId(stmt) {
      return stmt && stmt.inline && stmt.inline.kind;
    },
  });

  registry.register({
    moduleName: 'inline.asm.set',
    docLabel: 'inline asm sets',
    resolveTypeToken(token) {
      if (typeof listAsmSetProfiles === 'function') {
        const profiles = listAsmSetProfiles();
        const ids = profiles.map(p => p.id);
        if (ids.includes(token)) return token;
      }
      const fallback = ['generic', 'riscv32', 'arm-thumb', 'variable8'];
      if (fallback.includes(token)) return token;
      throw new Error(`Unknown entry '${token}' in inline.asm.set{}`);
    },
    getRuntimeId(stmt) {
      if (!stmt || !stmt.inline || stmt.inline.kind !== 'asm') return null;
      return stmt.inline.asmSetId || 'generic';
    },
  });

  registry.register({
    moduleName: 'phz',
    docLabel: 'phz kinds',
    resolveTypeToken(token) {
      // Built-ins + any user-defined type name (validated at exec against engine.types)
      if (typeof token !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
        throw new Error(`Unknown entry '${token}' in phz.type{}`);
      }
      return token;
    },
    getRuntimeId(stmt) {
      if (!stmt || !stmt.phz) return null;
      if (stmt.phz.kind === 'typedef') return stmt.phz.typeName;
      return stmt.phz.kind;
    },
  });

  return registry;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PolicyTypeModuleRegistry,
    createDefaultPolicyTypeModules,
    resolveCompTypeToken,
    INLINE_KINDS,
  };
}
