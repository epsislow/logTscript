/* ================= LOGIC ENGINE (Prolog-style backtracking) ================= */

class LogicAtomTable {
  constructor() {
    this._toId = new Map();
    this._toName = [];
  }

  intern(name) {
    if (this._toId.has(name)) return this._toId.get(name);
    const id = this._toName.length;
    this._toName.push(name);
    this._toId.set(name, id);
    return id;
  }

  name(id) { return this._toName[id]; }
}

function logicInternTerm(term, table) {
  if (!term) return term;
  if (term.kind === 'atom') {
    const r = { kind: 'atom', id: table.intern(term.name) };
    if (term.logicTraceAsString) r.logicTraceAsString = true;
    return r;
  }
  if (term.kind === 'var') return { kind: 'var', name: term.name };
  if (term.kind === 'number') return { kind: 'number', value: term.value };
  if (term.kind === 'float') return { kind: 'float', value: term.value };
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: (term.args || []).length,
      args: (term.args || []).map((a) => logicInternTerm(a, table)),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicInternTerm(term.head, table),
      tail: logicInternTerm(term.tail, table),
    };
  }
  if (term.kind === 'dif_list') {
    return {
      kind: 'dif_list',
      front: logicInternTerm(term.front, table),
      hole: logicInternTerm(term.hole, table),
    };
  }
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicInternTerm(term.left, table),
      right: term.right != null ? logicInternTerm(term.right, table) : null,
    };
  }
  return term;
}

function logicInternClause(clause, table) {
  return {
    head: logicInternTerm(clause.head, table),
    body: (clause.body || []).map((g) => logicInternGoal(g, table)),
  };
}

function logicInternGoal(goal, table) {
  if (!goal) return goal;
  if (goal.kind === 'call' || goal.kind === 'compound') {
    return {
      kind: 'call',
      predicate: goal.predicate,
      arity: (goal.args || []).length,
      args: (goal.args || []).map((a) => logicInternTerm(a, table)),
    };
  }
  if (goal.kind === 'cmp') {
    return {
      kind: 'cmp', op: goal.op,
      left: logicInternTerm(goal.left, table),
      right: logicInternTerm(goal.right, table),
    };
  }
  if (goal.kind === 'unify') {
    return {
      kind: 'unify',
      left: logicInternTerm(goal.left, table),
      right: logicInternTerm(goal.right, table),
    };
  }
  if (goal.kind === 'is') {
    return {
      kind: 'is',
      left: logicInternTerm(goal.left, table),
      right: logicInternTerm(goal.right, table),
    };
  }
  if (goal.kind === 'not') {
    return { kind: 'not', goal: logicInternGoal(goal.goal, table) };
  }
  if (goal.kind === 'cut') {
    return { kind: 'cut' };
  }
  if (goal.kind === 'or') {
    return {
      kind: 'or',
      left: logicInternGoal(goal.left, table),
      right: logicInternGoal(goal.right, table),
    };
  }
  if (goal.kind === 'if') {
    return {
      kind: 'if',
      cond: (goal.cond || []).map((g) => logicInternGoal(g, table)),
      then: (goal.then || []).map((g) => logicInternGoal(g, table)),
      else: (goal.else || []).map((g) => logicInternGoal(g, table)),
      line: goal.line,
    };
  }
  if (goal.kind === 'seq') {
    return {
      kind: 'seq',
      goals: (goal.goals || []).map((g) => logicInternGoal(g, table)),
      line: goal.line,
    };
  }
  if (goal.kind === 'mut_add' || goal.kind === 'mut_remove') {
    return {
      kind: goal.kind,
      head: logicInternTerm(goal.head, table),
    };
  }
  if (goal.kind === 'mut_retract_all') {
    return {
      kind: goal.kind,
      template: logicInternTerm(goal.template, table),
    };
  }
  if (goal.kind === 'mut_commit') {
    return {
      kind: goal.kind,
      ops: (goal.ops || []).map((op) => ({
        op: op.op,
        head: op.head ? logicInternTerm(op.head, table) : null,
        template: op.template ? logicInternTerm(op.template, table) : null,
      })),
    };
  }
  return goal;
}

function logicPredicateKey(predicate, arity) {
  return `${predicate}/${arity}`;
}

const LOGIC_RANDOM_SEED_MIN = 0;
const LOGIC_RANDOM_SEED_MAX = 4294967295;
const LOGIC_RANDOM_INT_MIN = -2147483648;
const LOGIC_RANDOM_INT_MAX = 2147483647;

let logicRngNext = null;

function logicMulberry32(seed) {
  let a = seed >>> 0;
  return function logicRngStep() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function logicEnsureRng() {
  if (!logicRngNext) logicRngNext = logicMulberry32(0);
}

function logicNormalizeRandomSeed(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || Math.trunc(n) !== n) return null;
  if (n < LOGIC_RANDOM_SEED_MIN || n > LOGIC_RANDOM_SEED_MAX) return null;
  return n >>> 0;
}

function logicNormalizeRandomInt(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || Math.trunc(n) !== n) return null;
  if (n < LOGIC_RANDOM_INT_MIN || n > LOGIC_RANDOM_INT_MAX) return null;
  return n;
}

function logicSetRandomSeed(seed) {
  const n = logicNormalizeRandomSeed(seed);
  if (n == null) return false;
  logicRngNext = logicMulberry32(n);
  return true;
}

function logicRandomIntBetween(low, high) {
  logicEnsureRng();
  const range = high - low + 1;
  if (range <= 0) return null;
  return low + Math.floor(logicRngNext() * range);
}

function logicNormalizeRandomFloat(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n;
}

function logicRandomFloatUnit() {
  logicEnsureRng();
  return logicRngNext();
}

function logicRandomFloatBetween(low, high) {
  if (high < low) return null;
  if (low === high) return low;
  return low + logicRandomFloatUnit() * (high - low);
}

function logicSwiRem(a, b) {
  return a - Math.trunc(a / b) * b;
}

function logicSwiMod(a, b) {
  const r = logicSwiRem(a, b);
  if (r === 0) return 0;
  if ((r > 0) === (b > 0)) return r;
  return r + b;
}

const LOGIC_IS_UNARY_FUNCS = new Set(['abs', 'sqrt', 'floor', 'ceiling', 'round', 'truncate']);
const LOGIC_IS_BINARY_FUNCS = new Set(['min', 'max']);

function logicNumericOutFloat(a, b) {
  if (b == null) return a.kind === 'float';
  return a.kind === 'float' || b.kind === 'float';
}

function logicNumericFromValue(value, preferFloat) {
  if (!preferFloat && Number.isInteger(value) && Math.abs(value) <= 9007199254740991) {
    return { kind: 'number', value };
  }
  return { kind: 'float', value };
}

function logicEvalNumericFunc(comp, env, table) {
  const pred = comp.predicate;
  const args = comp.args || [];
  if (LOGIC_IS_UNARY_FUNCS.has(pred) && args.length === 1) {
    const a = logicEvalNumeric(args[0], env, table);
    if (!a) return null;
    const av = a.value;
    let result;
    switch (pred) {
      case 'abs':
        result = Math.abs(av);
        return logicNumericFromValue(result, a.kind === 'float');
      case 'sqrt':
        if (av < 0) return null;
        result = Math.sqrt(av);
        if (!Number.isFinite(result)) return null;
        if (a.kind === 'number' && Number.isInteger(result)) return { kind: 'number', value: result };
        return { kind: 'float', value: result };
      case 'floor':
        result = Math.floor(av);
        return logicNumericFromValue(result, a.kind === 'float' && result !== av);
      case 'ceiling':
        result = Math.ceil(av);
        return logicNumericFromValue(result, a.kind === 'float' && result !== av);
      case 'round':
        result = Math.round(av);
        return logicNumericFromValue(result, a.kind === 'float' && result !== av);
      case 'truncate':
        result = Math.trunc(av);
        return logicNumericFromValue(result, a.kind === 'float' && result !== av);
      default:
        return null;
    }
  }
  if (LOGIC_IS_BINARY_FUNCS.has(pred) && args.length === 2) {
    const a = logicEvalNumeric(args[0], env, table);
    const b = logicEvalNumeric(args[1], env, table);
    if (!a || !b) return null;
    const outFloat = logicNumericOutFloat(a, b);
    const result = pred === 'min' ? Math.min(a.value, b.value) : Math.max(a.value, b.value);
    return logicNumericFromValue(result, outFloat);
  }
  return null;
}

function logicDenormTerm(term, table) {
  if (!term) return term;
  if (term.kind === 'atom') {
    const name = term.name != null ? term.name : (table ? table.name(term.id) : null);
    const r = { kind: 'atom', name };
    if (term.logicTraceAsString) r.logicTraceAsString = true;
    return r;
  }
  if (term.kind === 'var') return { kind: 'var', name: term.name };
  if (term.kind === 'number') return { kind: 'number', value: term.value };
  if (term.kind === 'float') return { kind: 'float', value: term.value };
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      args: (term.args || []).map((a) => logicDenormTerm(a, table)),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicDenormTerm(term.head, table),
      tail: logicDenormTerm(term.tail, table),
    };
  }
  if (term.kind === 'dif_list') {
    return {
      kind: 'dif_list',
      front: logicDenormTerm(term.front, table),
      hole: logicDenormTerm(term.hole, table),
    };
  }
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicDenormTerm(term.left, table),
      right: logicDenormTerm(term.right, table),
    };
  }
  return term;
}

function logicDenormGoal(goal, table) {
  if (!goal) return goal;
  if (goal.kind === 'not') return { kind: 'not', goal: logicDenormGoal(goal.goal, table) };
  if (goal.kind === 'cut') return { kind: 'cut' };
  if (goal.kind === 'or') {
    return {
      kind: 'or',
      left: logicDenormGoal(goal.left, table),
      right: logicDenormGoal(goal.right, table),
    };
  }
  if (goal.kind === 'if') {
    return {
      kind: 'if',
      cond: (goal.cond || []).map((g) => logicDenormGoal(g, table)),
      then: (goal.then || []).map((g) => logicDenormGoal(g, table)),
      else: (goal.else || []).map((g) => logicDenormGoal(g, table)),
      line: goal.line,
    };
  }
  if (goal.kind === 'seq') {
    return {
      kind: 'seq',
      goals: (goal.goals || []).map((g) => logicDenormGoal(g, table)),
      line: goal.line,
    };
  }
  if (goal.kind === 'call') {
    return {
      kind: 'call',
      predicate: goal.predicate,
      args: (goal.args || []).map((a) => logicDenormTerm(a, table)),
    };
  }
  if (goal.kind === 'cmp') {
    return {
      kind: 'cmp', op: goal.op,
      left: logicDenormTerm(goal.left, table),
      right: logicDenormTerm(goal.right, table),
    };
  }
  if (goal.kind === 'unify') {
    return {
      kind: 'unify',
      left: logicDenormTerm(goal.left, table),
      right: logicDenormTerm(goal.right, table),
    };
  }
  if (goal.kind === 'is') {
    return {
      kind: 'is',
      left: logicDenormTerm(goal.left, table),
      right: logicDenormTerm(goal.right, table),
    };
  }
  if (goal.kind === 'mut_add' || goal.kind === 'mut_remove') {
    return { kind: goal.kind, head: logicDenormTerm(goal.head, table) };
  }
  if (goal.kind === 'mut_retract_all') {
    return { kind: goal.kind, template: logicDenormTerm(goal.template, table) };
  }
  if (goal.kind === 'mut_commit') {
    return {
      kind: goal.kind,
      ops: (goal.ops || []).map((op) => ({
        op: op.op,
        head: op.head ? logicDenormTerm(op.head, table) : null,
        template: op.template ? logicDenormTerm(op.template, table) : null,
      })),
    };
  }
  return goal;
}

function logicReinternGoals(goals, table) {
  return (goals || []).map((g) => logicInternGoal(logicDenormGoal(g, table), table));
}

class LogicEngine {
  constructor(clauses, options) {
    const opts = options || {};
    this.table = (opts.factIndex && opts.factIndex.table) ? opts.factIndex.table : new LogicAtomTable();
    this.index = new Map();
    this.maxSolutions = 64;
    this.maxDepth = 256;
    this.truncated = false;
    this.depthExceeded = false;
    this.onShowLine = typeof opts.onShowLine === 'function' ? opts.onShowLine : null;
    this._renameSerial = 0;
    this.mutationRuntime = opts.mutationRuntime || null;
    this._ruleClauses = opts.ruleClauses || null;
    this._factIndexRef = opts.factIndex || null;
    this._mutationDirty = false;
    this._mutatedUniqueSlots = new Set();
    if (opts.factIndex) {
      const rules = opts.ruleClauses || (clauses || []).filter((c) => c.body && c.body.length);
      for (const c of rules) {
        const ic = logicInternClause(c, this.table);
        const head = ic.head;
        if (!head || head.kind !== 'compound') continue;
        const key = logicPredicateKey(head.predicate, head.arity);
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key).push(ic);
      }
      for (const ic of opts.factIndex.keys.values()) {
        const head = ic.head;
        if (!head || head.kind !== 'compound') continue;
        const key = logicPredicateKey(head.predicate, head.arity);
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key).push(ic);
      }
    } else {
      for (const c of clauses || []) {
        const ic = logicInternClause(c, this.table);
        const head = ic.head;
        if (!head || head.kind !== 'compound') continue;
        const key = logicPredicateKey(head.predicate, head.arity);
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key).push(ic);
      }
    }
  }

  _reloadFactIndex(factIndex, ruleClauses) {
    if (factIndex && factIndex.table) this.table = factIndex.table;
    this.index.clear();
    const rules = ruleClauses || this._ruleClauses || [];
    for (const c of rules) {
      const ic = logicInternClause(c, this.table);
      const head = ic.head;
      if (!head || head.kind !== 'compound') continue;
      const key = logicPredicateKey(head.predicate, head.arity);
      if (!this.index.has(key)) this.index.set(key, []);
      this.index.get(key).push(ic);
    }
    if (factIndex) {
      for (const ic of factIndex.keys.values()) {
        const head = ic.head;
        if (!head || head.kind !== 'compound') continue;
        const key = logicPredicateKey(head.predicate, head.arity);
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key).push(ic);
      }
    }
    this._factIndexRef = factIndex;
    this._ruleClauses = rules;
  }

  _continueAfterMutation(rest, env, depth, onSuccess, onDepthExceeded) {
    const nextGoals = logicReinternGoals(rest, this.table);
    return this._solveGoals(nextGoals, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _applyMutationGoal(goal, atomic, env) {
    const rt = this.mutationRuntime;
    if (!rt || typeof rt.applyGoal !== 'function') {
      throw Error('mutation is forbidden in inline :query (use comp [logic])');
    }
    let denormed = logicDenormGoal(goal, this.table);
    if (env) {
      denormed = logicDerefMutationGoal(denormed, env, this.table);
      if (!denormed) return false;
    }
    const result = rt.applyGoal(denormed, { atomic });
    if (!result || !result.ok) return false;
    this._mutationDirty = true;
    if (!this._mutatedUniqueSlots) this._mutatedUniqueSlots = new Set();
    for (const slotKey of logicCollectMutatedSlotsFromMutationGoal(denormed, this.table)) {
      this._mutatedUniqueSlots.add(slotKey);
    }
    if (result.factIndex !== undefined) {
      this._reloadFactIndex(result.factIndex, result.ruleClauses || this._ruleClauses);
    } else if (result.runtimeClauses) {
      this._reloadFactIndex(null, this._ruleClauses);
      this.index.clear();
      for (const c of result.runtimeClauses) {
        const ic = logicInternClause(c, this.table);
        const head = ic.head;
        if (!head || head.kind !== 'compound') continue;
        const key = logicPredicateKey(head.predicate, head.arity);
        if (!this.index.has(key)) this.index.set(key, []);
        this.index.get(key).push(ic);
      }
    }
    return true;
  }

  executeQueries(queries, inputEnv) {
    this.truncated = false;
    this.depthExceeded = false;
    const out = {};
    for (const q of queries || []) {
      const goals = logicEngineQueryGoals(q);
      const sol = this.solveQuery(goals, inputEnv || {});
      out[q.name] = sol;
    }
    return out;
  }

  solveQuery(goals, inputEnv) {
    const igGoals = (goals || []).map((g) => logicInternGoal(g, this.table));
    const solutions = [];
    const env = logicCloneEnv(logicPrepareInputEnv(inputEnv, this.table));
    let queryTruncated = false;
    let queryDepthExceeded = false;
    const self = this;
    this._solutionCapReached = false;
    this._mutatedUniqueSlots = new Set();
    this._solveGoals(igGoals, env, 0, (solEnv) => {
      if (self._solutionCapReached) return false;
      const freeVars = logicCollectFreeVarsInGoals(igGoals);
      const sol = {};
      for (const v of freeVars) {
        sol[v] = logicResolveTerm({ kind: 'var', name: v }, solEnv, self.table);
      }
      solutions.push(sol);
      if (solutions.length >= self.maxSolutions) {
        queryTruncated = true;
        self._solutionCapReached = true;
        return false;
      }
      return true;
    }, () => { queryDepthExceeded = true; });
    this._solutionCapReached = false;
    if (queryDepthExceeded) this.depthExceeded = true;
    if (queryTruncated) this.truncated = true;
    return solutions;
  }

  _solveGoals(goals, env, depth, onSuccess, onDepthExceeded) {
    if (goals.length === 0) return onSuccess(env);
    if (depth > this.maxDepth) {
      if (typeof onDepthExceeded === 'function') onDepthExceeded();
      return false;
    }
    const [g0, ...rest] = goals;
    if (g0.kind === 'cmp') {
      if (!logicEvalCmp(g0, env, this.table)) return false;
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'unify') {
      if (!logicUnifyExpr(g0.left, g0.right, env, this.table)) return false;
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'is') {
      return this._solveIs(g0.left, g0.right, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'count' && g0.arity === 2) {
      return this._solveCount(g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'show' && g0.arity >= 1) {
      return this._solveShow(g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'nth0' && g0.arity === 3) {
      return this._solveNth(g0, rest, env, depth, onSuccess, onDepthExceeded, false, null);
    }
    if (g0.kind === 'call' && g0.predicate === 'nth1' && g0.arity === 3) {
      return this._solveNth(g0, rest, env, depth, onSuccess, onDepthExceeded, true, null);
    }
    if (g0.kind === 'call' && g0.predicate === 'nth1' && g0.arity === 4) {
      return this._solveNth(g0, rest, env, depth, onSuccess, onDepthExceeded, true, g0.args[3]);
    }
    if (g0.kind === 'call' && g0.predicate === 'is' && g0.arity === 2) {
      return this._solveIs(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'member' && g0.arity === 2) {
      return this._solveMember(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'append' && g0.arity === 2) {
      return this._solveAppend2(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'append' && g0.arity === 3) {
      return this._solveAppend(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'length' && g0.arity === 2) {
      return this._solveLength(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'reverse' && g0.arity === 2) {
      return this._solveReverse(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'sort' && g0.arity === 2) {
      return this._solveSort(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'atom' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'atom', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'number' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'number', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'float' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'float', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'list' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'list', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'compound' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'compound', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'random_between' && g0.arity === 3) {
      return this._solveRandomBetween(g0.args[0], g0.args[1], g0.args[2], g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'random' && g0.arity === 1) {
      return this._solveRandom(g0.args[0], g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'set_random' && g0.arity === 1) {
      return this._solveSetRandom(g0.args[0], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'last' && g0.arity === 2) {
      return this._solveLast(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'select' && g0.arity === 3) {
      return this._solveSelect(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'selectchk' && g0.arity === 3) {
      return this._solveSelectchk(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'flatten' && g0.arity === 2) {
      return this._solveFlatten(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'same_length' && g0.arity === 2) {
      return this._solveSameLength(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'keysort' && g0.arity === 2) {
      return this._solveKeysort(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'msort' && g0.arity === 2) {
      return this._solveMsort(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'prefix' && g0.arity === 2) {
      return this._solvePrefix(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'suffix' && g0.arity === 2) {
      return this._solveSuffix(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'is_set' && g0.arity === 1) {
      return this._solveIsSet(g0.args[0], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'list_to_set' && g0.arity === 2) {
      return this._solveListToSet(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'union' && g0.arity === 3) {
      return this._solveUnion(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'intersection' && g0.arity === 3) {
      return this._solveIntersection(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'subtract' && g0.arity === 3) {
      return this._solveSubtract(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'numlist' && g0.arity === 3) {
      return this._solveNumlist(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'sum_list' && g0.arity === 2) {
      return this._solveSumList(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'max_list' && g0.arity === 2) {
      return this._solveMaxList(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'min_list' && g0.arity === 2) {
      return this._solveMinList(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'sublist' && g0.arity === 3) {
      return this._solveSublist(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'permutation' && g0.arity === 2) {
      return this._solvePermutation(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'combinations' && g0.arity === 3) {
      return this._solveCombinations(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'call' && g0.arity === 1) {
      return this._solveCallBuiltin(g0.args[0], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'include' && g0.arity === 3) {
      return this._solveInclude(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'exclude' && g0.arity === 3) {
      return this._solveExclude(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'partition' && g0.arity === 4) {
      return this._solvePartition(g0.args[0], g0.args[1], g0.args[2], g0.args[3], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'convlist' && g0.arity === 3) {
      return this._solveConvlist(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'maplist' && g0.arity === 2) {
      return this._solveMaplist2(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'maplist' && g0.arity === 3) {
      return this._solveMaplist3(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'foldl' && g0.arity === 4) {
      return this._solveFoldl4(g0.args[0], g0.args[1], g0.args[2], g0.args[3], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'foldl' && g0.arity === 5) {
      return this._solveFoldl5(g0.args[0], g0.args[1], g0.args[2], g0.args[3], g0.args[4], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'findall' && g0.arity === 3) {
      return this._solveFindall(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'bagof' && g0.arity === 3) {
      return this._solveBagof(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'setof' && g0.arity === 3) {
      return this._solveSetof(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'string_to_list' && g0.arity === 2) {
      return this._solveStringToList(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'string_to_codes' && g0.arity === 2) {
      return this._solveStringToCodes(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'atom_chars' && g0.arity === 2) {
      return this._solveAtomChars(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'atom_codes' && g0.arity === 2) {
      return this._solveAtomCodes(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'atom_number' && g0.arity === 2) {
      return this._solveAtomNumber(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'between' && g0.arity === 3) {
      return this._solveBetween(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'phrase' && g0.arity === 2) {
      return this._solvePhrase2(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'phrase' && g0.arity === 3) {
      return this._solvePhrase3(g0.args[0], g0.args[1], g0.args[2], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'lazy_list' && g0.arity === 2) {
      return this._solveLazyList(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'lazy_list_materialize' && g0.arity === 1) {
      return this._solveLazyListMaterialize(g0.args[0], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'true' && g0.arity === 0) {
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'fail' && g0.arity === 0) {
      return false;
    }
    if (g0.kind === 'or') {
      return this._solveOr(g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'if') {
      return this._solveIf(g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'seq') {
      return this._solveGoals((g0.goals || []).concat(rest), env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'mut_add' || g0.kind === 'mut_remove') {
      if (!this._applyMutationGoal(g0, false, env)) return false;
      return this._continueAfterMutation(rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'mut_retract_all') {
      if (!this._applyMutationGoal(g0, false, env)) return false;
      return this._continueAfterMutation(rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'mut_commit') {
      if (!this._applyMutationGoal(g0, true, env)) return false;
      return this._continueAfterMutation(rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call') {
      return this._solveCall(g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'not') {
      const trail = env.trailLength();
      let found = false;
      this._solveGoals([g0.goal], env, depth + 1, () => {
        found = true;
        return false;
      }, onDepthExceeded);
      env.undo(trail);
      if (found) return false;
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'cut') {
      env.commitCut();
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _logicOrBranches(goal) {
    const branches = [];
    const walk = (g) => {
      if (g && g.kind === 'or') {
        walk(g.left);
        walk(g.right);
      } else if (g) {
        branches.push(g);
      }
    };
    walk(goal);
    return branches;
  }

  _solveOr(goal, rest, env, depth, onSuccess, onDepthExceeded) {
    const branches = this._logicOrBranches(goal);
    const cutParent = env.choiceDepth();
    let any = false;
    for (let i = 0; i < branches.length; i++) {
      if (this._solutionCapReached) break;
      const trail = env.trailLength();
      env.pushChoice({ type: 'or', cutParent, trail });
      const savedCut = env.cutDepth;
      const savedCutCommitted = env.cutCommitted;
      env.cutDepth = cutParent;
      env.cutCommitted = false;
      const ok = this._solveGoals([branches[i]].concat(rest), env, depth + 1, onSuccess, onDepthExceeded);
      const cutCommitted = env.cutCommitted;
      env.cutDepth = savedCut;
      env.cutCommitted = savedCutCommitted || cutCommitted;
      env.undo(trail);
      if (env.choiceDepth() > cutParent) env.popChoice();
      if (ok) any = true;
      if (cutCommitted) break;
    }
    return any;
  }

  _solveIf(goal, rest, env, depth, onSuccess, onDepthExceeded) {
    const condTrail = env.trailLength();
    let condSucceeded = false;
    this._solveGoals(goal.cond || [], env, depth + 1, () => {
      condSucceeded = true;
      return false;
    }, onDepthExceeded);
    if (condSucceeded) {
      return this._solveGoals((goal.then || []).concat(rest), env, depth + 1, onSuccess, onDepthExceeded);
    }
    env.undo(condTrail);
    return this._solveGoals((goal.else || []).concat(rest), env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveCount(goal, rest, env, depth, onSuccess, onDepthExceeded) {
    let innerPrepared = goal.args[0];
    const innerDeref = logicDeref(innerPrepared, env);
    if (innerDeref.kind !== 'compound') return false;
    if (innerPrepared.kind === 'compound') {
      innerPrepared = {
        kind: 'call',
        predicate: innerPrepared.predicate,
        arity: innerPrepared.arity != null ? innerPrepared.arity : (innerPrepared.args || []).length,
        args: innerPrepared.args,
      };
    }
    let count = 0;
    const trail = env.trailLength();
    this._solveGoals([innerPrepared], env, depth + 1, () => {
      count++;
      return true;
    }, onDepthExceeded);
    env.undo(trail);
    const nTerm = goal.args[1];
    const nDeref = logicDeref(nTerm, env);
    if (nDeref.kind === 'number') {
      if (nDeref.value !== count) return false;
    } else if (nDeref.kind === 'var') {
      if (nDeref.name === '_') { /* anonymous — accept any count */ }
      else env.bind(nDeref.name, { kind: 'number', value: count });
    } else {
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveShow(goal, rest, env, depth, onSuccess, onDepthExceeded) {
    const parts = [];
    for (const arg of goal.args || []) {
      parts.push(logicFormatShowTerm(arg, env, this.table));
    }
    const line = parts.join(' ');
    if (typeof this.onShowLine === 'function') this.onShowLine(line);
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveIs(left, right, rest, env, depth, onSuccess, onDepthExceeded) {
    const val = logicEvalNumeric(right, env, this.table);
    if (val == null) return false;
    const ld = logicDeref(left, env);
    if (ld.kind === 'var') {
      if (ld.name !== '_') env.bind(ld.name, { kind: val.kind, value: val.value });
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (ld.kind === val.kind) {
      if (ld.kind === 'float') {
        if (!Object.is(ld.value, val.value)) return false;
      } else if (ld.value !== val.value) {
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveSetRandom(seedTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const sd = logicDeref(seedTerm, env);
    if (sd.kind !== 'number') return false;
    if (!logicSetRandomSeed(sd.value)) return false;
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveRandomBetween(lowTerm, highTerm, outTerm, goalRef, rest, env, depth, onSuccess, onDepthExceeded) {
    const lowD = logicDeref(lowTerm, env);
    const highD = logicDeref(highTerm, env);
    const outD = logicDeref(outTerm, env);
    let useFloat = lowD.kind === 'float' || highD.kind === 'float' || outD.kind === 'float';

    if (!env.impureRandom) env.impureRandom = new Map();
    const cp = env.choiceDepth();
    let slot = env.impureRandom.get(goalRef);
    if (!slot || cp < slot.cp) {
      slot = { cp, value: null, kind: useFloat ? 'float' : 'number' };
      env.impureRandom.set(goalRef, slot);
    } else if (slot.value != null) {
      useFloat = slot.kind === 'float';
    }

    if (useFloat) {
      if (lowD.kind !== 'number' && lowD.kind !== 'float') return false;
      if (highD.kind !== 'number' && highD.kind !== 'float') return false;
      const lowVal = lowD.kind === 'float'
        ? logicNormalizeRandomFloat(lowD.value)
        : logicNormalizeRandomFloat(lowD.value);
      const highVal = highD.kind === 'float'
        ? logicNormalizeRandomFloat(highD.value)
        : logicNormalizeRandomFloat(highD.value);
      if (lowVal == null || highVal == null || lowVal > highVal) return false;

      if (outD.kind === 'var') {
        if (slot.value == null) {
          slot.value = logicRandomFloatBetween(lowVal, highVal);
          slot.kind = 'float';
          if (slot.value == null) return false;
        }
        if (outD.name !== '_') env.bind(outD.name, { kind: 'float', value: slot.value });
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      if (outD.kind === 'float') {
        if (slot.value == null) {
          if (outD.value < lowVal || outD.value > highVal) return false;
          slot.value = outD.value;
          slot.kind = 'float';
        } else if (!Object.is(outD.value, slot.value)) {
          return false;
        }
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      if (outD.kind === 'number') {
        if (slot.value == null) {
          if (outD.value < lowVal || outD.value > highVal) return false;
          if (!Number.isInteger(outD.value)) return false;
          slot.value = outD.value;
          slot.kind = 'float';
        } else if (slot.value !== outD.value) {
          return false;
        }
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      return false;
    }

    if (lowD.kind !== 'number' || highD.kind !== 'number') return false;
    const lowVal = logicNormalizeRandomInt(lowD.value);
    const highVal = logicNormalizeRandomInt(highD.value);
    if (lowVal == null || highVal == null || lowVal > highVal) return false;

    if (outD.kind === 'var') {
      if (slot.value == null) {
        slot.value = logicRandomIntBetween(lowVal, highVal);
        slot.kind = 'number';
        if (slot.value == null) return false;
      }
      if (outD.name !== '_') env.bind(outD.name, { kind: 'number', value: slot.value });
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (outD.kind === 'number') {
      if (slot.value == null) {
        if (outD.value < lowVal || outD.value > highVal) return false;
        slot.value = outD.value;
        slot.kind = 'number';
      } else if (outD.value !== slot.value) {
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveRandom(outTerm, goalRef, rest, env, depth, onSuccess, onDepthExceeded) {
    const outD = logicDeref(outTerm, env);
    if (outD.kind !== 'var' && outD.kind !== 'float') return false;

    if (!env.impureRandom) env.impureRandom = new Map();
    const cp = env.choiceDepth();
    let slot = env.impureRandom.get(goalRef);
    if (!slot || cp < slot.cp) {
      slot = { cp, value: null, kind: 'float' };
      env.impureRandom.set(goalRef, slot);
    }

    if (outD.kind === 'var') {
      if (slot.value == null) {
        slot.value = logicRandomFloatUnit();
        slot.kind = 'float';
      }
      if (outD.name !== '_') env.bind(outD.name, { kind: 'float', value: slot.value });
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (outD.kind === 'float') {
      if (slot.value == null) {
        if (outD.value < 0 || outD.value >= 1) return false;
        slot.value = outD.value;
        slot.kind = 'float';
      } else if (!Object.is(outD.value, slot.value)) {
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveNth(goal, rest, env, depth, onSuccess, onDepthExceeded, oneBased, restTerm) {
    const iTerm = goal.args[0];
    const listTerm = goal.args[1];
    const elemTerm = goal.args[2];
    const iD = logicDeref(iTerm, env);
    const listD = logicDeref(listTerm, env);
    if (iD.kind !== 'number' && iD.kind !== 'var') return false;
    if (listD.kind !== 'list' && listD.kind !== 'var') return false;
    if (iD.kind === 'number') {
      let idx = iD.value;
      if (oneBased) {
        if (idx < 1) return false;
        idx -= 1;
      } else if (idx < 0) {
        return false;
      }
      return this._solveNthGroundIndex(idx, listTerm, listD, elemTerm, restTerm, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (listD.kind === 'var') return false;
    return this._solveNthVarIndex(iTerm, listD, elemTerm, restTerm, rest, env, depth, onSuccess, onDepthExceeded, oneBased);
  }

  _solveNthGroundIndex(idx, listTerm, listD, elemTerm, restTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    if (listD.kind === 'var') {
      if (idx !== 0) return false;
      const trail = env.trailLength();
      const tailNode = restTerm != null ? restTerm : { kind: 'var', name: '_' };
      const cons = { kind: 'list', head: elemTerm, tail: tailNode };
      if (!logicUnify(listTerm, cons, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    let cur = listD;
    let pos = 0;
    while (pos < idx) {
      if (logicListIsNil(cur)) return false;
      if (cur.kind !== 'list' || cur.nil) return false;
      cur = logicDeref(cur.tail, env);
      if (cur.kind === 'var') return false;
      pos++;
    }
    if (logicListIsNil(cur) || cur.kind !== 'list' || cur.nil) return false;
    const trail = env.trailLength();
    if (!logicUnify(elemTerm, cur.head, env, this.table)) {
      env.undo(trail);
      return false;
    }
    if (restTerm != null && !logicUnify(restTerm, cur.tail, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveNthVarIndex(iTerm, listD, elemTerm, restTerm, rest, env, depth, onSuccess, onDepthExceeded, oneBased) {
    let cur = listD;
    let pos = 0;
    let any = false;
    while (cur && cur.kind === 'list' && !cur.nil) {
      const trail = env.trailLength();
      const iVal = oneBased ? pos + 1 : pos;
      if (iTerm.name !== '_') env.bind(iTerm.name, { kind: 'number', value: iVal });
      if (!logicUnify(elemTerm, cur.head, env, this.table)) {
        env.undo(trail);
        cur = logicDeref(cur.tail, env);
        if (cur.kind === 'var') break;
        pos++;
        continue;
      }
      if (restTerm != null && !logicUnify(restTerm, cur.tail, env, this.table)) {
        env.undo(trail);
        cur = logicDeref(cur.tail, env);
        if (cur.kind === 'var') break;
        pos++;
        continue;
      }
      const ok = this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      env.undo(trail);
      if (this._solutionCapReached) return true;
      if (ok) any = true;
      cur = logicDeref(cur.tail, env);
      if (cur.kind === 'var') break;
      pos++;
    }
    return any;
  }

  _maybeRefreshUniqueCallGoal(goal, env) {
    if (!this._mutatedUniqueSlots || !this._mutatedUniqueSlots.size) return;
    const kind = logicPredicateUniqueKind(goal.predicate);
    if (!kind) return;
    const slotKey = logicUniqueSlotKeyFromCallGoal(goal, env, this.table);
    if (!slotKey || !this._mutatedUniqueSlots.has(slotKey)) return;
    const args = goal.args || [];
    const start = kind === 'keyed' ? 1 : 0;
    for (let i = start; i < args.length; i++) {
      const a = args[i];
      if (a && a.kind === 'var' && a.name !== '_') logicUnbindVar(env, a.name);
    }
  }

  _solveCall(goal, rest, env, depth, onSuccess, onDepthExceeded) {
    this._maybeRefreshUniqueCallGoal(goal, env);
    const key = logicPredicateKey(goal.predicate, goal.arity);
    const clauses = this.index.get(key) || [];
    let any = false;
    for (let i = 0; i < clauses.length; i++) {
      if (this._solutionCapReached) break;
      const clause = clauses[i];
      const trail = env.trailLength();
      const cutParent = env.choiceDepth();
      env.pushChoice({ type: 'clause', cutParent, trail });

      this._renameSerial += 1;
      const renamed = logicRenameApartClause(clause, { n: this._renameSerial });
      const head = logicDerefCompound(renamed.head, env);
      if (!logicUnifyCompound(goal, head, env, this.table)) {
        env.undo(trail);
        if (env.choiceDepth() > cutParent) env.popChoice();
        continue;
      }

      const newGoals = (renamed.body || []).concat(rest);
      const savedCut = env.cutDepth;
      const savedCutCommitted = env.cutCommitted;
      env.cutDepth = cutParent;
      env.cutCommitted = false;

      const uniqueHead = renamed.head
        && renamed.head.kind === 'compound'
        && logicPredicateUniqueKind(renamed.head.predicate);
      const isRuleClause = renamed.body && renamed.body.length > 0;
      const bodyOnSuccess = uniqueHead && isRuleClause && this.mutationRuntime
        ? (solEnv) => {
          const groundHead = logicDerefCompound(renamed.head, solEnv);
          if (groundHead && logicTermIsGround(groundHead)) {
            const denormed = logicDenormTerm(groundHead, this.table);
            this._applyMutationGoal({ kind: 'mut_add', head: denormed }, false, solEnv);
          }
          return onSuccess(solEnv);
        }
        : onSuccess;

      const ok = this._solveGoals(newGoals, env, depth + 1, bodyOnSuccess, onDepthExceeded);

      const cutCommitted = env.cutCommitted;
      env.cutDepth = savedCut;
      env.cutCommitted = savedCutCommitted || cutCommitted;
      env.undo(trail);
      if (env.choiceDepth() > cutParent) env.popChoice();

      if (this._solutionCapReached) {
        if (ok) any = true;
        break;
      }
      if (ok) any = true;
      if (cutCommitted) break;
    }
    return any;
  }

  _solveMember(elem, list, rest, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    return this._memberWalk(elem, list, cont, env, depth, onDepthExceeded);
  }

  _solveBetween(lowTerm, highTerm, valTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const lowD = logicDeref(lowTerm, env);
    const highD = logicDeref(highTerm, env);
    const valD = logicDeref(valTerm, env);
    if (lowD.kind !== 'number' || highD.kind !== 'number') return false;
    if (!Number.isInteger(lowD.value) || !Number.isInteger(highD.value)) return false;
    if (lowD.value > highD.value) return false;
    if (valD.kind === 'number') {
      if (!Number.isInteger(valD.value)) return false;
      if (valD.value < lowD.value || valD.value > highD.value) return false;
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (valD.kind === 'var') {
      let any = false;
      for (let v = lowD.value; v <= highD.value; v++) {
        const trail = env.trailLength();
        if (valD.name !== '_') env.bind(valD.name, { kind: 'number', value: v });
        if (this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded)) any = true;
        env.undo(trail);
        if (this._solutionCapReached || env.cutCommitted) break;
      }
      return any;
    }
    return false;
  }

  _solvePhrase2(goalTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const nilRest = { kind: 'list', nil: true };
    return this._solvePhrase3(goalTerm, listTerm, nilRest, rest, env, depth, onSuccess, onDepthExceeded);
  }

  _solvePhrase3(goalTerm, listTerm, restTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const goalD = logicDeref(goalTerm, env);
    const spec = logicPhraseSpecFromTerm(goalD, this.table);
    if (!spec) return false;

    let s0 = listTerm;
    const listD = logicDeref(listTerm, env);
    if (listD.kind === 'dif_list') {
      s0 = listD.front;
      const trail = env.trailLength();
      if (!logicUnify(restTerm, listD.hole, env, this.table)) {
        env.undo(trail);
        return false;
      }
    }

    const callArgs = spec.args.concat([s0, restTerm]);
    const callGoal = {
      kind: 'call',
      predicate: spec.predicate,
      arity: callArgs.length,
      args: callArgs,
    };
    return this._solveCall(callGoal, rest, env, depth, onSuccess, onDepthExceeded);
  }

  _solveLazyList(listTerm, sourceTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(listTerm, env);
    const built = logicBuildLazyListFromSource(sourceTerm, env, this.table);
    if (built === false) return false;
    if (ld.kind === 'var') {
      const trail = env.trailLength();
      if (!logicUnify(listTerm, built, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (ld.kind === 'lazy_list') {
      if (!logicLazyListGenEqual(ld.gen, built.gen)) return false;
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveLazyListMaterialize(listTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(listTerm, env);
    if (ld.kind === 'lazy_list') {
      const materialized = logicMaterializeLazyList(ld, this, env, depth, onDepthExceeded);
      if (materialized === false) return false;
      const trail = env.trailLength();
      if (listTerm.kind === 'var' && listTerm.name !== '_') {
        env.bind(listTerm.name, materialized);
      } else if (!logicUnify(listTerm, materialized, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (ld.kind === 'list' && logicListIsGroundClosed(ld, env)) {
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _lazyListRuleMemberWalk(elem, lazyTerm, cont, env, depth, onDepthExceeded) {
    const pred = lazyTerm.gen.predicate;
    const key = logicPredicateKey(pred, 2);
    const clauses = this.index.get(key) || [];
    let any = false;
    for (let i = 0; i < clauses.length; i++) {
      if (this._solutionCapReached) break;
      const clause = clauses[i];
      const trail0 = env.trailLength();
      const cutParent = env.choiceDepth();
      env.pushChoice({ type: 'lazy_chunk', cutParent, trail: trail0 });
      this._renameSerial += 1;
      const renamed = logicRenameApartClause(clause, { n: this._renameSerial });
      const sliceVar = { kind: 'var', name: `__lz${this._renameSerial++}` };
      const tailVar = { kind: 'var', name: `__lz${this._renameSerial++}` };
      const goal = { kind: 'call', predicate: pred, arity: 2, args: [sliceVar, tailVar] };
      const head = logicDerefCompound(renamed.head, env);
      if (!logicUnifyCompound(goal, head, env, this.table)) {
        env.undo(trail0);
        if (env.choiceDepth() > cutParent) env.popChoice();
        continue;
      }
      const savedCut = env.cutDepth;
      const savedCutCommitted = env.cutCommitted;
      env.cutDepth = cutParent;
      env.cutCommitted = false;
      const ok = this._solveGoals(renamed.body || [], env, depth + 1, () => {
        const sliceD = logicDeref(sliceVar, env);
        if (!logicListIsGroundClosed(sliceD, env)) return false;
        const elems = logicGroundListToArray(sliceD, env);
        if (elems == null || elems.length === 0) return false;
        return this._lazyMemberElems(elem, elems, 0, cont, env);
      }, onDepthExceeded);
      const cutCommitted = env.cutCommitted;
      env.cutDepth = savedCut;
      env.cutCommitted = savedCutCommitted || cutCommitted;
      env.undo(trail0);
      if (env.choiceDepth() > cutParent) env.popChoice();
      if (this._solutionCapReached) {
        if (ok) any = true;
        break;
      }
      if (ok) any = true;
      if (cutCommitted) break;
    }
    return any;
  }

  _lazyMemberElems(elem, elems, idx, cont, env) {
    if (idx >= elems.length) return false;
    let any = false;
    const trail = env.trailLength();
    if (logicUnify(elem, elems[idx], env, this.table)) {
      if (cont()) any = true;
      if (!this._solutionCapReached && !env.cutCommitted) {
        if (this._lazyMemberElems(elem, elems, idx + 1, cont, env)) any = true;
      }
    }
    env.undo(trail);
    return any;
  }

  _lazyListBetweenMemberWalk(elem, lazyTerm, cont, env) {
    const gen = lazyTerm.gen;
    let any = false;
    for (let v = gen.low; v <= gen.high; v++) {
      const trail = env.trailLength();
      if (logicUnify(elem, { kind: 'number', value: v }, env, this.table)) {
        if (cont()) any = true;
        if (this._solutionCapReached || env.cutCommitted) {
          env.undo(trail);
          return any;
        }
      }
      env.undo(trail);
      if (this._solutionCapReached || env.cutCommitted) break;
    }
    return any;
  }

  _solveTypePred(term, expectedKind, rest, env, depth, onSuccess, onDepthExceeded) {
    const d = logicDeref(term, env);
    if (!d || d.kind === 'var') return false;
    if (expectedKind === 'compound') {
      if (d.kind !== 'compound') return false;
    } else if (expectedKind === 'list') {
      if (d.kind !== 'list' && d.kind !== 'lazy_list') return false;
    } else if (d.kind !== expectedKind) {
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _memberWalk(elem, list, cont, env, depth, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind === 'lazy_list') {
      if (ld.gen.type === 'between') {
        return this._lazyListBetweenMemberWalk(elem, ld, cont, env);
      }
      if (ld.gen.type === 'rule') {
        return this._lazyListRuleMemberWalk(elem, ld, cont, env, depth, onDepthExceeded);
      }
      return false;
    }
    if (ld.kind !== 'list' || logicListIsNil(ld)) return false;
    let any = false;
    const trail = env.trailLength();
    if (logicUnify(elem, ld.head, env, this.table)) {
      if (cont()) any = true;
      if (this._solutionCapReached || env.cutCommitted) {
        env.undo(trail);
        return any;
      }
    }
    env.undo(trail);
    if (this._memberWalk(elem, ld.tail, cont, env, depth, onDepthExceeded)) any = true;
    return any;
  }

  _solveAppend2(difList, closed, rest, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    const dl = logicDeref(difList, env);
    if (dl.kind === 'var') {
      const cd = logicDeref(closed, env);
      if (cd.kind !== 'list' && !logicListIsNil(cd)) return false;
      const trail = env.trailLength();
      const bound = { kind: 'dif_list', front: cd, hole: { kind: 'list', nil: true } };
      if (!logicUnify(difList, bound, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return cont();
    }
    if (dl.kind !== 'dif_list') return false;
    const built = logicDifListClose(dl.front, dl.hole, env);
    if (built === false) return false;
    const trail = env.trailLength();
    if (!logicUnify(closed, built, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return cont();
  }

  _solveStringToList(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    return this._solveAtomListCodec(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded, 'string_chars');
  }

  _solveStringToCodes(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    return this._solveAtomListCodec(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded, 'string_codes');
  }

  _solveAtomChars(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    return this._solveAtomListCodec(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded, 'atom_chars');
  }

  _solveAtomCodes(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    return this._solveAtomListCodec(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded, 'atom_codes');
  }

  _solveAtomNumber(atomTerm, numTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    const ad = logicDeref(atomTerm, env);
    const nd = logicDeref(numTerm, env);
    if (ad.kind === 'var' && nd.kind === 'var') return false;
    const trail = env.trailLength();
    let ok = false;
    if (ad.kind === 'atom') {
      const parsed = logicParseAtomNumberString(logicAtomDisplayName(ad, this.table));
      if (parsed === false) return false;
      ok = logicUnify(numTerm, parsed, env, this.table);
    } else if (nd.kind === 'number' || nd.kind === 'float') {
      const name = logicFormatNumberToAtomString(nd);
      if (name === false) return false;
      const built = logicInternTerm({ kind: 'atom', name, logicTraceAsString: true }, this.table);
      ok = logicUnify(atomTerm, built, env, this.table);
    } else {
      return false;
    }
    if (!ok) {
      env.undo(trail);
      return false;
    }
    return cont();
  }

  _solveAtomListCodec(atomTerm, listTerm, rest, env, depth, onSuccess, onDepthExceeded, mode) {
    const cont = () => this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    const ad = logicDeref(atomTerm, env);
    const ld = logicDeref(listTerm, env);
    if (ad.kind === 'var' && ld.kind === 'var') return false;
    const trail = env.trailLength();
    let ok = false;
    if (ad.kind === 'atom') {
      const built = mode === 'string_codes' || mode === 'atom_codes'
        ? logicAtomToCodesListTerm(ad, this.table)
        : logicAtomToCharListTerm(ad, this.table);
      if (built === false) return false;
      ok = logicUnify(listTerm, built, env, this.table);
    } else if (ld.kind === 'list') {
      if (!logicListIsGroundClosed(ld, env)) return false;
      const built = logicGroundListToAtomTerm(ld, env, this.table, mode);
      if (built === false) return false;
      ok = logicUnify(atomTerm, built, env, this.table);
    } else {
      return false;
    }
    if (!ok) {
      env.undo(trail);
      return false;
    }
    return cont();
  }

  _solveAppend(l1, l2, l3, rest, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    return this._appendWalk(l1, l2, l3, cont, env);
  }

  _appendWalk(l1, l2, l3, cont, env) {
    const d1 = logicDeref(l1, env);
    if (logicListIsNil(d1)) {
      const trail = env.trailLength();
      if (!logicUnify(l2, l3, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return cont();
    }
    if (d1.kind === 'list' && !d1.nil) {
      const trail = env.trailLength();
      const restL3 = { kind: 'var', name: `__ap${this._renameSerial++}` };
      const l3cons = { kind: 'list', head: d1.head, tail: restL3 };
      if (!logicUnify(l3, l3cons, env, this.table)) {
        env.undo(trail);
        return false;
      }
      const ok = this._appendWalk(d1.tail, l2, restL3, cont, env);
      env.undo(trail);
      return ok;
    }
    if (d1.kind === 'var') {
      let any = false;
      const trail0 = env.trailLength();
      const tEmpty = env.trailLength();
      if (logicUnify(l1, { kind: 'list', nil: true }, env, this.table)
          && logicUnify(l2, l3, env, this.table)) {
        if (cont()) any = true;
        if (this._solutionCapReached) {
          env.undo(trail0);
          return any;
        }
      }
      env.undo(tEmpty);
      const tSplit = env.trailLength();
      const l3d = logicDeref(l3, env);
      if (l3d.kind === 'list' && !l3d.nil) {
        const restL1 = { kind: 'var', name: `__ap${this._renameSerial++}` };
        const l1cons = { kind: 'list', head: l3d.head, tail: restL1 };
        if (logicUnify(l1, l1cons, env, this.table)) {
          const ok = this._appendWalk(restL1, l2, l3d.tail, cont, env);
          if (ok) any = true;
          if (this._solutionCapReached) {
            env.undo(trail0);
            return any;
          }
        }
      }
      env.undo(tSplit);
      env.undo(trail0);
      return any;
    }
    return false;
  }

  _solveLength(list, nTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const nd = logicDeref(nTerm, env);
    const ld = logicDeref(list, env);
    if (ld.kind === 'lazy_list') {
      const lazyLen = logicLazyListKnownLength(ld);
      if (lazyLen == null) return false;
      if (nd.kind === 'number') {
        if (!Number.isInteger(nd.value) || nd.value !== lazyLen) return false;
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      if (nd.kind === 'var') {
        if (nd.name !== '_') env.bind(nd.name, { kind: 'number', value: lazyLen });
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      return false;
    }
    if (nd.kind === 'number') {
      if (nd.value < 0 || !Number.isInteger(nd.value)) return false;
      if (ld.kind === 'var') {
        const built = logicBuildAnonList(nd.value);
        const trail = env.trailLength();
        if (!logicUnify(list, built, env, this.table)) {
          env.undo(trail);
          return false;
        }
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      if (ld.kind === 'list') {
        const len = logicGroundListLength(ld, env);
        if (len == null || len !== nd.value) return false;
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      return false;
    }
    if (nd.kind === 'var') {
      if (ld.kind !== 'list') return false;
      const len = logicGroundListLength(ld, env);
      if (len == null) return false;
      if (nd.name !== '_') env.bind(nd.name, { kind: 'number', value: len });
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveReverse(list, rev, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    const rd = logicDeref(rev, env);
    if (ld.kind === 'list' && logicListIsGroundClosed(ld, env)) {
      const reversed = logicReverseGroundList(ld, env);
      const trail = env.trailLength();
      if (!logicUnify(rev, reversed, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (rd.kind === 'list' && logicListIsGroundClosed(rd, env)) {
      const reversed = logicReverseGroundList(rd, env);
      const trail = env.trailLength();
      if (!logicUnify(list, reversed, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveSort(list, sorted, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    const sortedCopy = elems.slice().sort((a, b) => logicCompareTerms(a, b, env, this.table));
    const sortedList = logicArrayToList(sortedCopy);
    const trail = env.trailLength();
    if (!logicUnify(sorted, sortedList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveLast(list, elem, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || logicListIsNil(ld)) return false;
    if (!logicListIsGroundClosed(ld, env)) return false;
    let cur = ld;
    let lastHead = null;
    while (!logicListIsNil(cur)) {
      if (cur.kind !== 'list' || cur.nil) return false;
      lastHead = cur.head;
      const tailD = logicDeref(cur.tail, env);
      if (logicListIsNil(tailD)) break;
      cur = tailD;
      if (cur.kind === 'var') return false;
    }
    const trail = env.trailLength();
    if (!logicUnify(elem, lastHead, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveSelect(elem, list, restList, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    return this._selectWalk(elem, list, restList, cont, env, false);
  }

  _solveSelectchk(elem, list, restList, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    return this._selectWalk(elem, list, restList, cont, env, true);
  }

  _selectWalk(elem, list, restList, cont, env, firstOnly) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || logicListIsNil(ld)) return false;
    let any = false;
    const trail = env.trailLength();
    if (logicUnify(elem, ld.head, env, this.table)) {
      const tInner = env.trailLength();
      if (logicUnify(restList, ld.tail, env, this.table)) {
        if (cont()) any = true;
        if (firstOnly || this._solutionCapReached || env.cutCommitted) {
          env.undo(trail);
          return any;
        }
      }
      env.undo(tInner);
    }
    env.undo(trail);
    const restTailVar = { kind: 'var', name: `__sel${this._renameSerial++}` };
    const trail2 = env.trailLength();
    const rebuiltRest = { kind: 'list', head: ld.head, tail: restTailVar };
    if (logicUnify(restList, rebuiltRest, env, this.table)) {
      if (this._selectWalk(elem, ld.tail, restTailVar, cont, env, firstOnly)) any = true;
    }
    env.undo(trail2);
    return any;
  }

  _solveFlatten(nested, flat, rest, env, depth, onSuccess, onDepthExceeded) {
    const nd = logicDeref(nested, env);
    if (nd.kind !== 'list' || !logicListIsGroundClosed(nd, env)) return false;
    const elems = logicFlattenGroundList(nd, env);
    if (elems == null) return false;
    const flatList = logicArrayToList(elems);
    const trail = env.trailLength();
    if (!logicUnify(flat, flatList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveSameLength(list1, list2, rest, env, depth, onSuccess, onDepthExceeded) {
    const d1 = logicDeref(list1, env);
    const d2 = logicDeref(list2, env);
    if (d1.kind !== 'list' && d1.kind !== 'var') return false;
    if (d2.kind !== 'list' && d2.kind !== 'var') return false;
    if (d1.kind === 'var' && d2.kind === 'var') return false;
    if (d1.kind === 'list' && logicListIsGroundClosed(d1, env)) {
      const len = logicGroundListLength(d1, env);
      if (len == null) return false;
      if (d2.kind === 'list') {
        if (!logicListIsGroundClosed(d2, env)) return false;
        const len2 = logicGroundListLength(d2, env);
        if (len2 == null || len !== len2) return false;
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      if (d2.kind === 'var') {
        const built = logicBuildAnonList(len);
        const trail = env.trailLength();
        if (!logicUnify(list2, built, env, this.table)) {
          env.undo(trail);
          return false;
        }
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
      return false;
    }
    if (d2.kind === 'list' && logicListIsGroundClosed(d2, env)) {
      const len = logicGroundListLength(d2, env);
      if (len == null) return false;
      if (d1.kind === 'var') {
        const built = logicBuildAnonList(len);
        const trail = env.trailLength();
        if (!logicUnify(list1, built, env, this.table)) {
          env.undo(trail);
          return false;
        }
        return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
      }
    }
    return false;
  }

  _solveKeysort(list, sorted, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const sortedList = logicKeysortGroundList(ld, env, this.table);
    if (sortedList == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(sorted, sortedList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveMsort(list, sorted, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const sortedList = logicMsortGroundList(ld, env, this.table);
    if (sortedList == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(sorted, sortedList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solvePrefix(prefix, list, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    return this._prefixWalk(prefix, list, cont, env);
  }

  _solveSuffix(suffix, list, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    return this._suffixWalk(suffix, list, cont, env);
  }

  _prefixWalk(prefix, list, cont, env) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list') return false;
    let any = false;
    const trail = env.trailLength();
    if (logicUnify(prefix, { kind: 'list', nil: true }, env, this.table)) {
      if (cont()) any = true;
      if (this._solutionCapReached || env.cutCommitted) {
        env.undo(trail);
        return any;
      }
    }
    env.undo(trail);
    if (!logicListIsNil(ld)) {
      const restVar = { kind: 'var', name: `__pfx${this._renameSerial++}` };
      const rebuilt = { kind: 'list', head: ld.head, tail: restVar };
      const trail2 = env.trailLength();
      if (logicUnify(list, rebuilt, env, this.table)) {
        const tailPrefixVar = { kind: 'var', name: `__pfx${this._renameSerial++}` };
        const extPrefix = { kind: 'list', head: ld.head, tail: tailPrefixVar };
        const trail3 = env.trailLength();
        if (logicUnify(prefix, extPrefix, env, this.table)) {
          if (this._prefixWalk(tailPrefixVar, restVar, cont, env)) any = true;
        }
        env.undo(trail3);
      }
      env.undo(trail2);
    }
    return any;
  }

  _suffixWalk(suffix, list, cont, env) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list') return false;
    let any = false;
    const trail = env.trailLength();
    if (logicUnify(suffix, ld, env, this.table)) {
      if (cont()) any = true;
      if (this._solutionCapReached || env.cutCommitted) {
        env.undo(trail);
        return any;
      }
    }
    env.undo(trail);
    if (!logicListIsNil(ld)) {
      const restVar = { kind: 'var', name: `__sfx${this._renameSerial++}` };
      const rebuilt = { kind: 'list', head: ld.head, tail: restVar };
      const trail2 = env.trailLength();
      if (logicUnify(list, rebuilt, env, this.table)) {
        if (this._suffixWalk(suffix, restVar, cont, env)) any = true;
      }
      env.undo(trail2);
    }
    return any;
  }

  _solveIsSet(list, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    if (!logicListIsGroundSet(ld, env, this.table)) return false;
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveListToSet(list, set, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const setList = logicListToSetGround(ld, env, this.table);
    if (setList == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(set, setList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveUnion(list1, list2, union, rest, env, depth, onSuccess, onDepthExceeded) {
    const d1 = logicDeref(list1, env);
    const d2 = logicDeref(list2, env);
    if (d1.kind !== 'list' || !logicListIsGroundClosed(d1, env)) return false;
    if (d2.kind !== 'list' || !logicListIsGroundClosed(d2, env)) return false;
    const unionList = logicUnionGround(d1, d2, env, this.table);
    if (unionList == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(union, unionList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveIntersection(list1, list2, inter, rest, env, depth, onSuccess, onDepthExceeded) {
    const d1 = logicDeref(list1, env);
    const d2 = logicDeref(list2, env);
    if (d1.kind !== 'list' || !logicListIsGroundClosed(d1, env)) return false;
    if (d2.kind !== 'list' || !logicListIsGroundClosed(d2, env)) return false;
    const interList = logicIntersectionGround(d1, d2, env, this.table);
    if (interList == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(inter, interList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveSubtract(list1, list2, remain, rest, env, depth, onSuccess, onDepthExceeded) {
    const d1 = logicDeref(list1, env);
    const d2 = logicDeref(list2, env);
    if (d1.kind !== 'list' || !logicListIsGroundClosed(d1, env)) return false;
    if (d2.kind !== 'list' || !logicListIsGroundClosed(d2, env)) return false;
    const remainList = logicSubtractGround(d1, d2, env, this.table);
    if (remainList == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(remain, remainList, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveNumlist(fromTerm, toTerm, list, rest, env, depth, onSuccess, onDepthExceeded) {
    const fromD = logicDeref(fromTerm, env);
    const toD = logicDeref(toTerm, env);
    if (fromD.kind !== 'number' || toD.kind !== 'number') return false;
    if (!Number.isInteger(fromD.value) || !Number.isInteger(toD.value)) return false;
    const built = logicBuildNumlist(fromD.value, toD.value);
    if (built == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(list, built, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveSumList(list, sum, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const total = logicSumGroundNumberList(ld, env);
    if (total == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(sum, { kind: 'number', value: total }, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveMaxList(list, max, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const nums = logicGroundNumberList(ld, env);
    if (nums == null || nums.length === 0) return false;
    let m = nums[0];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] > m) m = nums[i];
    }
    const trail = env.trailLength();
    if (!logicUnify(max, { kind: 'number', value: m }, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveMinList(list, min, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const nums = logicGroundNumberList(ld, env);
    if (nums == null || nums.length === 0) return false;
    let m = nums[0];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] < m) m = nums[i];
    }
    const trail = env.trailLength();
    if (!logicUnify(min, { kind: 'number', value: m }, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveSublist(sub, list, rest, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    return this._sublistWalk(sub, list, rest, cont, env);
  }

  _listMatchPrefixAndRest(prefix, list, env) {
    let p = logicDeref(prefix, env);
    let l = logicDeref(list, env);
    if (p.kind !== 'list') return false;
    if (logicListIsNil(p)) return l;
    while (!logicListIsNil(p)) {
      if (l.kind !== 'list' || logicListIsNil(l)) return false;
      if (!logicUnify(p.head, l.head, env, this.table)) return false;
      p = logicDeref(p.tail, env);
      l = logicDeref(l.tail, env);
    }
    return l;
  }

  _sublistWalk(sub, list, rest, cont, env) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list') return false;
    let any = false;
    const trail = env.trailLength();
    const matchRest = this._listMatchPrefixAndRest(sub, list, env);
    if (matchRest !== false) {
      const trail2 = env.trailLength();
      if (logicUnify(rest, matchRest, env, this.table)) {
        if (cont()) any = true;
        if (this._solutionCapReached || env.cutCommitted) {
          env.undo(trail);
          return any;
        }
      }
      env.undo(trail2);
    }
    env.undo(trail);
    if (!logicListIsNil(ld)) {
      const restVar = { kind: 'var', name: `__sub${this._renameSerial++}` };
      const rebuilt = { kind: 'list', head: ld.head, tail: restVar };
      const trail3 = env.trailLength();
      if (logicUnify(list, rebuilt, env, this.table)) {
        if (this._sublistWalk(sub, restVar, rest, cont, env)) any = true;
      }
      env.undo(trail3);
    }
    return any;
  }

  _solvePermutation(perm, list, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    const pd = logicDeref(perm, env);
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    if (ld.kind === 'list' && logicListIsGroundClosed(ld, env)) {
      return this._permuteWalk(ld, perm, cont, env);
    }
    if (pd.kind === 'list' && logicListIsGroundClosed(pd, env)
        && ld.kind === 'list' && logicListIsGroundClosed(ld, env)) {
      if (!logicSameMultiset(pd, ld, env, this.table)) return false;
      const trail = env.trailLength();
      if (!logicUnify(perm, list, env, this.table)) {
        env.undo(trail);
        return false;
      }
      return cont();
    }
    return false;
  }

  _permuteWalk(listD, perm, cont, env) {
    const elems = logicGroundListToArray(listD, env);
    if (elems == null) return false;
    return this._permBuildWalk(elems, [], perm, cont, env);
  }

  _permBuildWalk(remaining, built, perm, cont, env) {
    if (remaining.length === 0) {
      const builtList = logicArrayToList(built);
      const trail = env.trailLength();
      let ok = false;
      if (logicUnify(perm, builtList, env, this.table)) ok = cont();
      env.undo(trail);
      return ok;
    }
    let any = false;
    for (let i = 0; i < remaining.length; i++) {
      const head = remaining[i];
      const nextRem = remaining.slice(0, i).concat(remaining.slice(i + 1));
      if (this._permBuildWalk(nextRem, built.concat([head]), perm, cont, env)) any = true;
      if (this._solutionCapReached || env.cutCommitted) break;
    }
    return any;
  }

  _solveCombinations(kTerm, list, comb, restGoals, env, depth, onSuccess, onDepthExceeded) {
    const kd = logicDeref(kTerm, env);
    if (kd.kind !== 'number' || !Number.isInteger(kd.value) || kd.value < 0) return false;
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list') return false;
    const pd = logicDeref(comb, env);
    if (pd.kind === 'list' && logicListIsGroundClosed(pd, env)
        && logicListIsGroundClosed(ld, env)) {
      let matchCount = 0;
      const trail = env.trailLength();
      const checkCont = () => {
        matchCount++;
        return matchCount < 2;
      };
      this._combWalk(kd.value, list, comb, checkCont, env);
      env.undo(trail);
      if (matchCount !== 1) return false;
      return this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    }
    const cont = () => this._solveGoals(restGoals, env, depth + 1, onSuccess, onDepthExceeded);
    return this._combWalk(kd.value, list, comb, cont, env);
  }

  _combWalk(k, list, comb, cont, env) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list') return false;
    if (k === 0) {
      const trail = env.trailLength();
      let ok = false;
      if (logicUnify(comb, { kind: 'list', nil: true }, env, this.table)) ok = cont();
      env.undo(trail);
      return ok;
    }
    if (logicListIsNil(ld)) return false;
    let any = false;
    const restVar = { kind: 'var', name: `__cmb${this._renameSerial++}` };
    const rebuilt = { kind: 'list', head: ld.head, tail: restVar };
    const trail = env.trailLength();
    if (logicUnify(list, rebuilt, env, this.table)) {
      if (this._combWalk(k, restVar, comb, cont, env)) any = true;
      if (!this._solutionCapReached && !env.cutCommitted) {
        const tailCombVar = { kind: 'var', name: `__cmb${this._renameSerial++}` };
        const extComb = { kind: 'list', head: ld.head, tail: tailCombVar };
        const trail2 = env.trailLength();
        if (logicUnify(comb, extComb, env, this.table)) {
          if (this._combWalk(k - 1, restVar, tailCombVar, cont, env)) any = true;
        }
        env.undo(trail2);
      }
    }
    env.undo(trail);
    return any;
  }

  _solveCallBuiltin(goalTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    const innerGoal = logicGoalFromCallableTerm(logicDeref(goalTerm, env));
    if (!innerGoal) return false;
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const cont = () => {
      env.cutDepth = savedCutDepth;
      env.cutCommitted = savedCutCommitted || env.cutCommitted;
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    };
    const ok = this._solveGoals([innerGoal], env, depth + 1, cont, onDepthExceeded);
    if (!ok) {
      env.cutDepth = savedCutDepth;
      env.cutCommitted = savedCutCommitted;
    }
    return ok;
  }

  _tryCallableTemplateOnce(templateTerm, elem, env, depth, onDepthExceeded) {
    const prepared = logicPrepareCallableInstantiation(templateTerm, elem, env);
    if (!prepared) return { ok: false, resultTerm: null };
    const { goal, templateCopy } = prepared;
    let ok = false;
    let resultTerm = null;
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const trail = env.trailLength();
    this._solveGoals([goal], env, depth + 1, () => {
      ok = true;
      resultTerm = logicConvlistResultFromTemplate(templateCopy, env, this.table);
      return false;
    }, onDepthExceeded);
    env.undo(trail);
    env.cutDepth = savedCutDepth;
    env.cutCommitted = savedCutCommitted;
    return { ok, resultTerm };
  }

  _solveInclude(goalTemplate, list, included, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    const picked = [];
    for (const elem of elems) {
      const trial = this._tryCallableTemplateOnce(goalTemplate, elem, env, depth, onDepthExceeded);
      if (trial.ok) picked.push(elem);
    }
    const trail = env.trailLength();
    if (!logicUnify(included, logicArrayToList(picked), env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveExclude(goalTemplate, list, excluded, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    const picked = [];
    for (const elem of elems) {
      const trial = this._tryCallableTemplateOnce(goalTemplate, elem, env, depth, onDepthExceeded);
      if (!trial.ok) picked.push(elem);
    }
    const trail = env.trailLength();
    if (!logicUnify(excluded, logicArrayToList(picked), env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solvePartition(goalTemplate, list, included, excluded, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    const inc = [];
    const exc = [];
    for (const elem of elems) {
      const trial = this._tryCallableTemplateOnce(goalTemplate, elem, env, depth, onDepthExceeded);
      if (trial.ok) inc.push(elem);
      else exc.push(elem);
    }
    const trail = env.trailLength();
    if (!logicUnify(included, logicArrayToList(inc), env, this.table)) {
      env.undo(trail);
      return false;
    }
    if (!logicUnify(excluded, logicArrayToList(exc), env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveConvlist(goalTemplate, list, result, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    const out = [];
    for (const elem of elems) {
      const trial = this._tryCallableTemplateOnce(goalTemplate, elem, env, depth, onDepthExceeded);
      if (trial.ok && trial.resultTerm != null) out.push(trial.resultTerm);
    }
    const trail = env.trailLength();
    if (!logicUnify(result, logicArrayToList(out), env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveMaplist2(goalTemplate, list, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    for (const elem of elems) {
      const trial = this._tryCallableTemplateOnce(goalTemplate, elem, env, depth, onDepthExceeded);
      if (!trial.ok) return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveMaplist3(goalTemplate, list1, list2, rest, env, depth, onSuccess, onDepthExceeded) {
    const d1 = logicDeref(list1, env);
    if (d1.kind !== 'list' || !logicListIsGroundClosed(d1, env)) return false;
    const e1 = logicGroundListToArray(d1, env);
    if (e1 == null) return false;
    const d2 = logicDeref(list2, env);
    if (d2.kind === 'list' && logicListIsGroundClosed(d2, env)) {
      const e2 = logicGroundListToArray(d2, env);
      if (e2 == null || e2.length !== e1.length) return false;
      for (let i = 0; i < e1.length; i++) {
        const trial = this._tryCallableTemplatePairOnce(goalTemplate, e1[i], e2[i], env, depth, onDepthExceeded);
        if (!trial.ok) return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (d2.kind === 'var') {
      const out = [];
      for (const elem1 of e1) {
        const trial = this._tryCallableTemplatePairOnce(goalTemplate, elem1, null, env, depth, onDepthExceeded);
        if (!trial.ok || trial.resultTerm == null) return false;
        out.push(trial.resultTerm);
      }
      const trail = env.trailLength();
      if (!logicUnify(list2, logicArrayToList(out), env, this.table)) {
        env.undo(trail);
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _tryCallableTemplatePairOnce(templateTerm, elem1, elem2, env, depth, onDepthExceeded) {
    const prepared = logicPrepareCallableInstantiationPair(templateTerm, elem1, elem2, env);
    if (!prepared) return { ok: false, resultTerm: null };
    const { goal, templateCopy, outVarName } = prepared;
    let ok = false;
    let resultTerm = null;
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const trail = env.trailLength();
    this._solveGoals([goal], env, depth + 1, () => {
      ok = true;
      if (outVarName) {
        const outTerm = logicTermVarByName(templateCopy, outVarName);
        resultTerm = outTerm ? logicResolveTerm(outTerm, env, this.table) : null;
      }
      return false;
    }, onDepthExceeded);
    env.undo(trail);
    env.cutDepth = savedCutDepth;
    env.cutCommitted = savedCutCommitted;
    return { ok, resultTerm };
  }

  _solveFoldl4(goalTemplate, list, v0, v, rest, env, depth, onSuccess, onDepthExceeded) {
    const ld = logicDeref(list, env);
    if (ld.kind !== 'list' || !logicListIsGroundClosed(ld, env)) return false;
    const elems = logicGroundListToArray(ld, env);
    if (elems == null) return false;
    let acc = logicResolveTerm(v0, env, this.table);
    if (acc == null) {
      const d0 = logicDeref(v0, env);
      if (d0.kind !== 'number' && d0.kind !== 'atom' && d0.kind !== 'compound' && d0.kind !== 'list') return false;
      acc = d0;
    }
    for (const elem of elems) {
      const trial = this._tryCallableTemplateFold4Once(goalTemplate, acc, elem, env, depth, onDepthExceeded);
      if (!trial.ok || trial.resultTerm == null) return false;
      acc = trial.resultTerm;
    }
    const trail = env.trailLength();
    if (!logicUnify(v, acc, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveFoldl5(goalTemplate, list1, list2, v0, v, rest, env, depth, onSuccess, onDepthExceeded) {
    const d1 = logicDeref(list1, env);
    if (d1.kind !== 'list' || !logicListIsGroundClosed(d1, env)) return false;
    const e1 = logicGroundListToArray(d1, env);
    if (e1 == null) return false;
    const d2 = logicDeref(list2, env);
    if (d2.kind !== 'list' || !logicListIsGroundClosed(d2, env)) return false;
    const e2 = logicGroundListToArray(d2, env);
    if (e2 == null || e2.length !== e1.length) return false;
    let acc = logicResolveTerm(v0, env, this.table);
    if (acc == null) {
      const d0 = logicDeref(v0, env);
      if (d0.kind !== 'number' && d0.kind !== 'atom' && d0.kind !== 'compound' && d0.kind !== 'list') return false;
      acc = d0;
    }
    for (let i = 0; i < e1.length; i++) {
      const trial = this._tryCallableTemplateFold5Once(goalTemplate, acc, e1[i], e2[i], env, depth, onDepthExceeded);
      if (!trial.ok || trial.resultTerm == null) return false;
      acc = trial.resultTerm;
    }
    const trail = env.trailLength();
    if (!logicUnify(v, acc, env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _tryCallableTemplateFold4Once(templateTerm, accIn, elem, env, depth, onDepthExceeded) {
    const prepared = logicPrepareCallableInstantiationFold4(templateTerm, accIn, elem, env);
    if (!prepared) return { ok: false, resultTerm: null };
    const { goal, templateCopy, accOutVar } = prepared;
    let ok = false;
    let resultTerm = null;
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const trail = env.trailLength();
    this._solveGoals([goal], env, depth + 1, () => {
      ok = true;
      const outTerm = logicTermVarByName(templateCopy, accOutVar);
      resultTerm = outTerm ? logicResolveTerm(outTerm, env, this.table) : null;
      return false;
    }, onDepthExceeded);
    env.undo(trail);
    env.cutDepth = savedCutDepth;
    env.cutCommitted = savedCutCommitted;
    return { ok, resultTerm };
  }

  _tryCallableTemplateFold5Once(templateTerm, accIn, elem1, elem2, env, depth, onDepthExceeded) {
    const prepared = logicPrepareCallableInstantiationFold5(templateTerm, accIn, elem1, elem2, env);
    if (!prepared) return { ok: false, resultTerm: null };
    const { goal, templateCopy, accOutVar } = prepared;
    let ok = false;
    let resultTerm = null;
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const trail = env.trailLength();
    this._solveGoals([goal], env, depth + 1, () => {
      ok = true;
      const outTerm = logicTermVarByName(templateCopy, accOutVar);
      resultTerm = outTerm ? logicResolveTerm(outTerm, env, this.table) : null;
      return false;
    }, onDepthExceeded);
    env.undo(trail);
    env.cutDepth = savedCutDepth;
    env.cutCommitted = savedCutCommitted;
    return { ok, resultTerm };
  }

  _goalFromFindallTerm(goalTerm, env) {
    return logicGoalFromCallableTerm(logicDeref(goalTerm, env));
  }

  _collectFindallInstances(template, goalTerm, env, depth, onDepthExceeded) {
    const innerGoal = this._goalFromFindallTerm(goalTerm, env);
    if (!innerGoal) return null;
    const collected = [];
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const trail = env.trailLength();
    this._solveGoals([innerGoal], env, depth + 1, () => {
      collected.push(logicResolveTerm(template, env, this.table));
      return true;
    }, onDepthExceeded);
    env.undo(trail);
    env.cutDepth = savedCutDepth;
    env.cutCommitted = savedCutCommitted;
    return collected;
  }

  _solveFindall(template, goalTerm, list, rest, env, depth, onSuccess, onDepthExceeded) {
    const collected = this._collectFindallInstances(template, goalTerm, env, depth, onDepthExceeded);
    if (collected == null) return false;
    const trail = env.trailLength();
    if (!logicUnify(list, logicArrayToList(collected), env, this.table)) {
      env.undo(trail);
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _collectBagofGroups(template, goalTerm, env, depth, onDepthExceeded, uniqueSorted) {
    const innerGoal = this._goalFromFindallTerm(goalTerm, env);
    if (!innerGoal) return null;
    const existVars = logicExistentialVarsForBagof(template, innerGoal, env);
    const records = [];
    const savedCutDepth = env.cutDepth;
    const savedCutCommitted = env.cutCommitted;
    env.cutDepth = env.choiceDepth();
    env.cutCommitted = false;
    const trail = env.trailLength();
    this._solveGoals([innerGoal], env, depth + 1, () => {
      const existBindings = {};
      for (const v of existVars) {
        existBindings[v] = logicResolveTerm({ kind: 'var', name: v }, env, this.table);
      }
      records.push({
        existBindings,
        item: logicResolveTerm(template, env, this.table),
      });
      return true;
    }, onDepthExceeded);
    env.undo(trail);
    env.cutDepth = savedCutDepth;
    env.cutCommitted = savedCutCommitted;
    if (!records.length) return [];
    const groups = [];
    for (const rec of records) {
      let group = null;
      for (const g of groups) {
        if (logicBagofBindingsEqual(g.existBindings, rec.existBindings, env, this.table)) {
          group = g;
          break;
        }
      }
      if (!group) {
        group = { existBindings: rec.existBindings, items: [] };
        groups.push(group);
      }
      group.items.push(rec.item);
    }
    if (uniqueSorted) {
      for (const g of groups) {
        g.items = logicSetofUniqueSort(g.items, env, this.table);
      }
    }
    return groups;
  }

  _applyBagofGroup(group, list, env) {
    for (const [name, term] of Object.entries(group.existBindings || {})) {
      if (!logicUnify({ kind: 'var', name }, logicCloneTerm(term), env, this.table)) return false;
    }
    return logicUnify(list, logicArrayToList(group.items), env, this.table);
  }

  _walkBagofGroups(groups, pos, list, rest, env, depth, onSuccess, onDepthExceeded) {
    if (pos >= groups.length) return false;
    let any = false;
    for (let i = pos; i < groups.length; i++) {
      if (this._solutionCapReached) break;
      const trail = env.trailLength();
      if (!this._applyBagofGroup(groups[i], list, env)) {
        env.undo(trail);
        continue;
      }
      if (this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded)) any = true;
      env.undo(trail);
      if (this._solutionCapReached) break;
    }
    return any;
  }

  _solveBagof(template, goalTerm, list, rest, env, depth, onSuccess, onDepthExceeded) {
    const groups = this._collectBagofGroups(template, goalTerm, env, depth, onDepthExceeded, false);
    if (!groups || groups.length === 0) return false;
    return this._walkBagofGroups(groups, 0, list, rest, env, depth, onSuccess, onDepthExceeded);
  }

  _solveSetof(template, goalTerm, list, rest, env, depth, onSuccess, onDepthExceeded) {
    const groups = this._collectBagofGroups(template, goalTerm, env, depth, onDepthExceeded, true);
    if (!groups || groups.length === 0) return false;
    return this._walkBagofGroups(groups, 0, list, rest, env, depth, onSuccess, onDepthExceeded);
  }
}

function logicRenameApartClause(clause, idRef) {
  const map = new Map();
  const suffix = idRef && idRef.n != null ? idRef.n : 0;
  let n = 0;
  function mapVar(name) {
    if (name === '_') return '_';
    if (!map.has(name)) map.set(name, `__ra${suffix}_${n++}`);
    return map.get(name);
  }
  function walkTerm(t) {
    if (!t) return t;
    if (t.kind === 'var') return { kind: 'var', name: mapVar(t.name) };
    if (t.kind === 'compound') {
      return {
        kind: 'compound',
        predicate: t.predicate,
        arity: t.arity != null ? t.arity : (t.args || []).length,
        args: (t.args || []).map(walkTerm),
      };
    }
    if (t.kind === 'list') {
      if (t.nil) return { kind: 'list', nil: true };
      return { kind: 'list', head: walkTerm(t.head), tail: walkTerm(t.tail) };
    }
    if (t.kind === 'dif_list') {
      return { kind: 'dif_list', front: walkTerm(t.front), hole: walkTerm(t.hole) };
    }
    if (t.kind === 'lazy_list') {
      return { kind: 'lazy_list', gen: { ...t.gen } };
    }
    if (t.kind === 'arith') {
      return { kind: 'arith', op: t.op, left: walkTerm(t.left), right: walkTerm(t.right) };
    }
    return t;
  }
  function walkGoal(g) {
    if (!g) return g;
    if (g.kind === 'not') return { kind: 'not', goal: walkGoal(g.goal) };
    if (g.kind === 'cut') return { kind: 'cut' };
    if (g.kind === 'call') {
      return {
        kind: 'call',
        predicate: g.predicate,
        arity: g.arity != null ? g.arity : (g.args || []).length,
        args: (g.args || []).map(walkTerm),
      };
    }
    if (g.kind === 'cmp') {
      return { kind: 'cmp', op: g.op, left: walkTerm(g.left), right: walkTerm(g.right) };
    }
    if (g.kind === 'unify') {
      return { kind: 'unify', left: walkTerm(g.left), right: walkTerm(g.right) };
    }
    if (g.kind === 'is') {
      return { kind: 'is', left: walkTerm(g.left), right: walkTerm(g.right) };
    }
    if (g.kind === 'or') {
      return { kind: 'or', left: walkGoal(g.left), right: walkGoal(g.right) };
    }
    if (g.kind === 'if') {
      return {
        kind: 'if',
        cond: (g.cond || []).map(walkGoal),
        then: (g.then || []).map(walkGoal),
        else: (g.else || []).map(walkGoal),
        line: g.line,
      };
    }
    if (g.kind === 'seq') {
      return { kind: 'seq', goals: (g.goals || []).map(walkGoal), line: g.line };
    }
    return g;
  }
  return {
    head: walkTerm(clause.head),
    body: (clause.body || []).map(walkGoal),
  };
}

function logicEnv() {
  const bindings = new Map();
  return {
    bindings,
    trail: [],
    choiceStack: [],
    cutDepth: null,
    cutCommitted: false,
    trailLength() { return this.trail.length; },
    choiceDepth() { return this.choiceStack.length; },
    pushChoice(entry) { this.choiceStack.push(entry); },
    popChoice() { return this.choiceStack.pop(); },
    commitCut() {
      const d = this.cutDepth;
      if (d == null) {
        this.choiceStack.length = 0;
      } else {
        while (this.choiceStack.length > d) {
          this.choiceStack.pop();
        }
      }
      this.cutCommitted = true;
    },
    bind(name, value) {
      this.bindings.set(name, value);
      this.trail.push(name);
    },
    undo(pos) {
      while (this.trail.length > pos) {
        const n = this.trail.pop();
        this.bindings.delete(n);
      }
    },
    get(name) { return this.bindings.get(name); },
  };
}

function logicInternInputValue(term, table) {
  if (!term) return term;
  if (term.kind === 'atom') {
    const name = term.name != null ? term.name : (term.id != null ? table.name(term.id) : '');
    const r = { kind: 'atom', id: table.intern(name) };
    if (term.logicTraceAsString) r.logicTraceAsString = true;
    return r;
  }
  if (term.kind === 'number') return term;
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: (term.args || []).length,
      args: (term.args || []).map((a) => logicInternInputValue(a, table)),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicInternInputValue(term.head, table),
      tail: logicInternInputValue(term.tail, table),
    };
  }
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicInternInputValue(term.left, table),
      right: logicInternInputValue(term.right, table),
    };
  }
  return term;
}

function logicPrepareInputEnv(inputEnv, table) {
  const out = {};
  for (const [k, v] of Object.entries(inputEnv || {})) {
    out[k] = logicInternInputValue(v, table);
  }
  return out;
}

function logicCloneEnv(inputEnv) {
  const env = logicEnv();
  for (const [k, v] of Object.entries(inputEnv || {})) {
    env.bind(k, v);
  }
  return env;
}

function logicDeref(term, env) {
  if (!term) return term;
  if (term.kind === 'var') {
    const b = env.get(term.name);
    if (b != null) return logicDeref(b, env);
    return term;
  }
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: term.arity,
      args: term.args.map((a) => logicDeref(a, env)),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicDeref(term.head, env),
      tail: logicDeref(term.tail, env),
    };
  }
  if (term.kind === 'arith') {
    return {
      kind: 'arith', op: term.op,
      left: logicDeref(term.left, env),
      right: logicDeref(term.right, env),
    };
  }
  return term;
}

function logicDerefCompound(term, env) {
  const d = logicDeref(term, env);
  return d.kind === 'compound' ? d : term;
}

function logicBuildLazyListFromSource(sourceTerm, env, table) {
  const sd = logicDeref(sourceTerm, env);
  if (sd.kind === 'compound' && sd.predicate === 'between' && sd.arity === 3) {
    const lowD = logicDeref(sd.args[0], env);
    const highD = logicDeref(sd.args[1], env);
    if (lowD.kind !== 'number' || highD.kind !== 'number') return false;
    if (!Number.isInteger(lowD.value) || !Number.isInteger(highD.value)) return false;
    if (lowD.value > highD.value) return false;
    return { kind: 'lazy_list', gen: { type: 'between', low: lowD.value, high: highD.value } };
  }
  if (sd.kind === 'atom') {
    const predName = logicAtomDisplayName(sd, table);
    if (!predName) return false;
    return { kind: 'lazy_list', gen: { type: 'rule', predicate: predName } };
  }
  return false;
}

function logicLazyListGenEqual(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'between') return a.low === b.low && a.high === b.high;
  if (a.type === 'rule') return a.predicate === b.predicate;
  return false;
}

function logicLazyListKnownLength(lazyTerm) {
  if (!lazyTerm || lazyTerm.kind !== 'lazy_list') return null;
  if (lazyTerm.gen.type === 'between') {
    return lazyTerm.gen.high - lazyTerm.gen.low + 1;
  }
  return null;
}

function logicMaterializeLazyList(lazyTerm, engine, env, depth, onDepthExceeded) {
  if (!lazyTerm || lazyTerm.kind !== 'lazy_list') return false;
  if (lazyTerm.gen.type === 'between') {
    return logicBuildNumlist(lazyTerm.gen.low, lazyTerm.gen.high);
  }
  if (lazyTerm.gen.type === 'rule') {
    const elems = [];
    const pred = lazyTerm.gen.predicate;
    const key = logicPredicateKey(pred, 2);
    const clauses = engine.index.get(key) || [];
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const trail0 = env.trailLength();
      engine._renameSerial += 1;
      const renamed = logicRenameApartClause(clause, { n: engine._renameSerial });
      const sliceVar = { kind: 'var', name: `__lm${engine._renameSerial++}` };
      const tailVar = { kind: 'var', name: `__lm${engine._renameSerial++}` };
      const goal = { kind: 'call', predicate: pred, arity: 2, args: [sliceVar, tailVar] };
      const head = logicDerefCompound(renamed.head, env);
      if (!logicUnifyCompound(goal, head, env, engine.table)) {
        env.undo(trail0);
        continue;
      }
      const chunkTrail = env.trailLength();
      const ok = engine._solveGoals(renamed.body || [], env, depth + 1, () => {
        const sliceD = logicDeref(sliceVar, env);
        if (!logicListIsGroundClosed(sliceD, env)) return false;
        const chunk = logicGroundListToArray(sliceD, env);
        if (chunk == null) return false;
        for (const e of chunk) elems.push(e);
        return true;
      }, onDepthExceeded);
      env.undo(chunkTrail);
      env.undo(trail0);
      if (!ok) return false;
    }
    return logicArrayToList(elems);
  }
  return false;
}

function logicUnify(t1, t2, env, table) {
  const a = logicDeref(t1, env);
  const b = logicDeref(t2, env);
  if (a.kind === 'var') {
    if (a.name === '_') return true;
    if (b.kind === 'var' && b.name === '_') return true;
    if (b.kind === 'var' && b.name === a.name) return true;
    if (logicOccurs(a.name, b, env)) return false;
    env.bind(a.name, b);
    return true;
  }
  if (b.kind === 'var') return logicUnify(b, a, env, table);
  if (a.kind === 'number' && b.kind === 'number') return a.value === b.value;
  if (a.kind === 'float' && b.kind === 'float') return Object.is(a.value, b.value);
  if (a.kind === 'atom' && b.kind === 'atom') return a.id === b.id;
  if (a.kind === 'compound' && b.kind === 'compound') {
    if (a.predicate !== b.predicate || a.arity !== b.arity) return false;
    for (let i = 0; i < a.arity; i++) {
      if (!logicUnify(a.args[i], b.args[i], env, table)) return false;
    }
    return true;
  }
  if (a.kind === 'dif_list' && b.kind === 'dif_list') {
    if (!logicUnify(a.front, b.front, env, table)) return false;
    return logicUnify(a.hole, b.hole, env, table);
  }
  if (a.kind === 'dif_list' && b.kind === 'var') {
    if (b.name === '_') return true;
    if (logicOccurs(b.name, a, env)) return false;
    env.bind(b.name, a);
    return true;
  }
  if (b.kind === 'dif_list' && a.kind === 'var') return logicUnify(b, a, env, table);
  if (a.kind === 'lazy_list' && b.kind === 'lazy_list') {
    return logicLazyListGenEqual(a.gen, b.gen);
  }
  if (a.kind === 'lazy_list' && b.kind === 'var') {
    if (b.name === '_') return true;
    if (logicOccurs(b.name, a, env)) return false;
    env.bind(b.name, a);
    return true;
  }
  if (b.kind === 'lazy_list' && a.kind === 'var') return logicUnify(b, a, env, table);
  if (logicListIsNil(a) && logicListIsNil(b)) return true;
  if (logicListIsNil(a) && b.kind === 'var') {
    if (b.name === '_') return true;
    if (logicOccurs(b.name, a, env)) return false;
    env.bind(b.name, { kind: 'list', nil: true });
    return true;
  }
  if (logicListIsNil(b) && a.kind === 'var') return logicUnify(a, b, env, table);
  if (logicListIsNil(a) || logicListIsNil(b)) return false;
  if (a.kind === 'list' && b.kind === 'list') {
    if (!logicUnify(a.head, b.head, env, table)) return false;
    return logicUnify(a.tail, b.tail, env, table);
  }
  return false;
}

function logicUnifyCompound(goal, head, env, table) {
  if (goal.predicate !== head.predicate || goal.arity !== head.arity) return false;
  for (let i = 0; i < goal.arity; i++) {
    if (!logicUnify(goal.args[i], head.args[i], env, table)) return false;
  }
  return true;
}

function logicOccurs(name, term, env) {
  const d = logicDeref(term, env);
  if (d.kind === 'var') return d.name === name;
  if (d.kind === 'compound') return d.args.some((a) => logicOccurs(name, a, env));
  if (d.kind === 'dif_list') {
    return logicOccurs(name, d.front, env) || logicOccurs(name, d.hole, env);
  }
  if (d.kind === 'lazy_list') return false;
  if (d.kind === 'list') {
    if (d.nil) return false;
    return logicOccurs(name, d.head, env) || logicOccurs(name, d.tail, env);
  }
  return false;
}

function logicListIsNil(term) {
  return term && term.kind === 'list' && term.nil === true;
}

function logicVarHoleEqual(tailRef, hole, env) {
  if (!tailRef || !hole || tailRef.kind !== 'var' || hole.kind !== 'var') return false;
  if (tailRef.name === '_' || hole.name === '_') return false;
  const td = logicDeref(tailRef, env);
  const hd = logicDeref(hole, env);
  if (td.kind === 'var' && hd.kind === 'var') return td.name === hd.name;
  return false;
}

function logicAppendListHeads(heads, suffix) {
  let result = suffix;
  for (let i = heads.length - 1; i >= 0; i--) {
    result = { kind: 'list', head: heads[i], tail: result };
  }
  return result;
}

function logicDifListClose(front, hole, env) {
  const heads = [];
  let cur = front;
  while (true) {
    const cd = logicDeref(cur, env);
    if (logicListIsNil(cd)) {
      return logicAppendListHeads(heads, logicDeref(hole, env));
    }
    if (cd.kind === 'list' && !cd.nil) {
      if (cur.tail && cur.tail.kind === 'var' && hole.kind === 'var'
          && cur.tail.name === hole.name && cur.tail.name !== '_') {
        heads.push(logicDeref(cd.head, env));
        return logicAppendListHeads(heads, logicDeref(hole, env));
      }
      heads.push(logicDeref(cd.head, env));
      cur = cur.tail;
      continue;
    }
    if (cd.kind === 'var' && hole.kind === 'var' && cd.name === hole.name) {
      return logicAppendListHeads(heads, logicDeref(hole, env));
    }
    return false;
  }
}

function logicDifListIsClosed(difTerm, env) {
  const d = logicDeref(difTerm, env);
  if (d.kind !== 'dif_list') return false;
  const hv = logicDeref(d.hole, env);
  return logicListIsNil(hv);
}

function logicTermTypeRank(term) {
  if (!term) return -1;
  if (term.kind === 'number') return 0;
  if (term.kind === 'atom') return 1;
  if (term.kind === 'list') return 2;
  if (term.kind === 'dif_list') return 3;
  if (term.kind === 'compound') return 4;
  return -1;
}

function logicAtomDisplayName(atom, table) {
  if (!atom || atom.kind !== 'atom') return '';
  if (atom.name != null) return atom.name;
  if (atom.id != null) return table.name(atom.id);
  return '';
}

function logicCompareTerms(a, b, env, table) {
  const da = logicDeref(a, env);
  const db = logicDeref(b, env);
  const ra = logicTermTypeRank(da);
  const rb = logicTermTypeRank(db);
  if (ra < 0 || rb < 0) return 0;
  if (ra !== rb) return ra - rb;
  if (da.kind === 'number') return da.value - db.value;
  if (da.kind === 'atom') {
    const na = logicAtomDisplayName(da, table);
    const nb = logicAtomDisplayName(db, table);
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  }
  if (da.kind === 'list') {
    if (logicListIsNil(da) && logicListIsNil(db)) return 0;
    if (logicListIsNil(da)) return -1;
    if (logicListIsNil(db)) return 1;
    const hc = logicCompareTerms(da.head, db.head, env, table);
    if (hc !== 0) return hc;
    return logicCompareTerms(da.tail, db.tail, env, table);
  }
  if (da.kind === 'dif_list' && db.kind === 'dif_list') {
    const fc = logicCompareTerms(da.front, db.front, env, table);
    if (fc !== 0) return fc;
    return logicCompareTerms(da.hole, db.hole, env, table);
  }
  if (da.kind === 'compound') {
    if (da.predicate !== db.predicate) {
      if (da.predicate < db.predicate) return -1;
      if (da.predicate > db.predicate) return 1;
    }
    if (da.arity !== db.arity) return da.arity - db.arity;
    for (let i = 0; i < da.arity; i++) {
      const c = logicCompareTerms(da.args[i], db.args[i], env, table);
      if (c !== 0) return c;
    }
    return 0;
  }
  return 0;
}

function logicListIsGroundClosed(listD, env) {
  let cur = listD;
  while (!logicListIsNil(cur)) {
    if (cur.kind !== 'list' || cur.nil) return false;
    const headD = logicDeref(cur.head, env);
    if (headD.kind === 'var') return false;
    if (!logicTermIsGround(headD)) return false;
    cur = logicDeref(cur.tail, env);
    if (cur.kind === 'var') return false;
  }
  return true;
}

function logicGroundListLength(listD, env) {
  let cur = listD;
  let n = 0;
  while (!logicListIsNil(cur)) {
    if (cur.kind !== 'list' || cur.nil) return null;
    cur = logicDeref(cur.tail, env);
    if (cur.kind === 'var') return null;
    n++;
  }
  return n;
}

function logicBuildAnonList(n) {
  if (n === 0) return { kind: 'list', nil: true };
  return {
    kind: 'list',
    head: { kind: 'var', name: '_' },
    tail: logicBuildAnonList(n - 1),
  };
}

function logicAtomToCharListTerm(atom, table) {
  const name = logicAtomDisplayName(atom, table);
  if (name == null) return false;
  const elems = [];
  for (let i = 0; i < name.length; i++) {
    elems.push(logicInternTerm({ kind: 'atom', name: name.charAt(i) }, table));
  }
  return logicArrayToList(elems);
}

function logicAtomToCodesListTerm(atom, table) {
  const name = logicAtomDisplayName(atom, table);
  if (name == null) return false;
  const elems = [];
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (!Number.isFinite(code) || code < 0) return false;
    elems.push({ kind: 'number', value: code });
  }
  return logicArrayToList(elems);
}

function logicGroundCharListToAtomName(listD, env, table) {
  const arr = logicGroundListToArray(listD, env);
  if (arr == null) return false;
  let s = '';
  for (const t of arr) {
    if (t.kind !== 'atom') return false;
    const ch = logicAtomDisplayName(t, table);
    if (!ch || ch.length !== 1) return false;
    s += ch;
  }
  return s;
}

function logicGroundCodesListToAtomName(listD, env) {
  const arr = logicGroundListToArray(listD, env);
  if (arr == null) return false;
  let s = '';
  for (const t of arr) {
    if (t.kind !== 'number' || !Number.isInteger(t.value) || t.value < 0) return false;
    s += String.fromCharCode(t.value);
  }
  return s;
}

function logicGroundListToAtomTerm(listD, env, table, mode) {
  const useStringFlag = mode === 'string_chars' || mode === 'string_codes';
  const name = (mode === 'string_codes' || mode === 'atom_codes')
    ? logicGroundCodesListToAtomName(listD, env)
    : logicGroundCharListToAtomName(listD, env, table);
  if (name === false) return false;
  const atom = { kind: 'atom', name };
  if (useStringFlag) atom.logicTraceAsString = true;
  return logicInternTerm(atom, table);
}

function logicParseAtomNumberString(s) {
  if (s == null || s === '') return false;
  if (/[eE]/.test(s)) return false;
  if (/^-?\d+$/.test(s)) {
    const v = parseInt(s, 10);
    if (!Number.isFinite(v) || !Number.isSafeInteger(v)) return false;
    return { kind: 'number', value: v };
  }
  if (/^-?\.\d+$/.test(s) || /^-?\d+\.\d+$/.test(s)) {
    const v = parseFloat(s);
    if (!Number.isFinite(v)) return false;
    return { kind: 'float', value: v };
  }
  return false;
}

function logicFormatNumberToAtomString(term) {
  if (!term) return false;
  if (term.kind === 'number') {
    if (!Number.isInteger(term.value)) return false;
    return String(term.value);
  }
  if (term.kind === 'float') {
    const s = String(term.value);
    if (s.indexOf('.') >= 0 || s.indexOf('e') >= 0 || s.indexOf('E') >= 0) return s;
    return `${s}.0`;
  }
  return false;
}

function logicGroundListToArray(listD, env) {
  const out = [];
  let cur = listD;
  while (!logicListIsNil(cur)) {
    if (cur.kind !== 'list' || cur.nil) return null;
    const headD = logicDeref(cur.head, env);
    if (headD.kind === 'var') return null;
    out.push(headD);
    cur = logicDeref(cur.tail, env);
    if (cur.kind === 'var') return null;
  }
  return out;
}

function logicArrayToList(elems) {
  if (!elems.length) return { kind: 'list', nil: true };
  let tail = { kind: 'list', nil: true };
  for (let i = elems.length - 1; i >= 0; i--) {
    tail = { kind: 'list', head: elems[i], tail };
  }
  return tail;
}

function logicFlattenGroundList(listD, env) {
  const out = [];
  let cur = listD;
  while (!logicListIsNil(cur)) {
    if (cur.kind !== 'list' || cur.nil) return null;
    const headD = logicDeref(cur.head, env);
    if (headD.kind === 'var') return null;
    if (headD.kind === 'list') {
      const nested = logicFlattenGroundList(headD, env);
      if (nested == null) return null;
      for (const e of nested) out.push(e);
    } else {
      out.push(headD);
    }
    cur = logicDeref(cur.tail, env);
    if (cur.kind === 'var') return null;
  }
  return out;
}

function logicReverseGroundList(listD, env) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return null;
  elems.reverse();
  return logicArrayToList(elems);
}

function logicKeysortGroundList(listD, env, table) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return null;
  for (const e of elems) {
    if (e.kind !== 'compound' || !e.args || e.args.length < 1) return null;
  }
  const sorted = elems.slice().sort((a, b) => logicCompareTerms(a.args[0], b.args[0], env, table));
  return logicArrayToList(sorted);
}

function logicMsortGroundList(listD, env, table) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return null;
  const indexed = elems.map((e, i) => ({ e, i }));
  indexed.sort((a, b) => {
    const c = logicCompareTerms(a.e, b.e, env, table);
    if (c !== 0) return c;
    return a.i - b.i;
  });
  return logicArrayToList(indexed.map((x) => x.e));
}

function logicListIsGroundSet(listD, env, table) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return false;
  for (let i = 0; i < elems.length; i++) {
    for (let j = i + 1; j < elems.length; j++) {
      if (logicCompareTerms(elems[i], elems[j], env, table) === 0) return false;
    }
  }
  return true;
}

function logicTermInGroundList(term, list, env, table) {
  for (const e of list) {
    if (logicCompareTerms(term, e, env, table) === 0) return true;
  }
  return false;
}

function logicListToSetGround(listD, env, table) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return null;
  const out = [];
  for (const e of elems) {
    if (!logicTermInGroundList(e, out, env, table)) out.push(e);
  }
  return logicArrayToList(out);
}

function logicUnionGround(list1D, list2D, env, table) {
  const e1 = logicGroundListToArray(list1D, env);
  const e2 = logicGroundListToArray(list2D, env);
  if (e1 == null || e2 == null) return null;
  const out = [];
  for (const e of e1) {
    if (!logicTermInGroundList(e, out, env, table)) out.push(e);
  }
  for (const e of e2) {
    if (!logicTermInGroundList(e, out, env, table)) out.push(e);
  }
  return logicArrayToList(out);
}

function logicIntersectionGround(list1D, list2D, env, table) {
  const e1 = logicGroundListToArray(list1D, env);
  const e2 = logicGroundListToArray(list2D, env);
  if (e1 == null || e2 == null) return null;
  const out = [];
  for (const e of e1) {
    if (logicTermInGroundList(e, e2, env, table) && !logicTermInGroundList(e, out, env, table)) {
      out.push(e);
    }
  }
  return logicArrayToList(out);
}

function logicGroundNumberList(listD, env) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return null;
  const nums = [];
  for (const e of elems) {
    if (e.kind !== 'number' || !Number.isInteger(e.value)) return null;
    nums.push(e.value);
  }
  return nums;
}

function logicBuildNumlist(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from > to) return { kind: 'list', nil: true };
  const count = to - from + 1;
  if (count > 1024) return null;
  const elems = [];
  for (let n = from; n <= to; n++) elems.push({ kind: 'number', value: n });
  return logicArrayToList(elems);
}

function logicSumGroundNumberList(listD, env) {
  const nums = logicGroundNumberList(listD, env);
  if (nums == null) return null;
  let total = 0;
  for (const n of nums) total += n;
  return total;
}

function logicSubtractGround(list1D, list2D, env, table) {
  const e1 = logicGroundListToArray(list1D, env);
  const e2 = logicGroundListToArray(list2D, env);
  if (e1 == null || e2 == null) return null;
  const out = [];
  for (const e of e1) {
    if (!logicTermInGroundList(e, e2, env, table)) out.push(e);
  }
  return logicArrayToList(out);
}

function logicSameMultiset(listA, listB, env, table) {
  const a = logicGroundListToArray(listA, env);
  const b = logicGroundListToArray(listB, env);
  if (a == null || b == null || a.length !== b.length) return false;
  const used = new Array(b.length).fill(false);
  for (const ea of a) {
    let found = false;
    for (let j = 0; j < b.length; j++) {
      if (!used[j] && logicCompareTerms(ea, b[j], env, table) === 0) {
        used[j] = true;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

function logicGoalFromCallableTerm(term) {
  if (!term) return null;
  if (term.kind === 'compound') {
    return {
      kind: 'call',
      predicate: term.predicate,
      arity: term.arity != null ? term.arity : (term.args || []).length,
      args: term.args || [],
    };
  }
  if (term.kind === 'call') return term;
  return null;
}

function logicPhraseSpecFromTerm(term, table) {
  if (!term) return null;
  if (term.kind === 'atom') {
    const name = logicAtomDisplayName(term, table);
    if (!name) return null;
    return { predicate: name, args: [] };
  }
  if (term.kind === 'compound') {
    return {
      predicate: term.predicate,
      args: term.args || [],
    };
  }
  return null;
}

function logicCloneTerm(term) {
  if (!term) return term;
  if (term.kind === 'var') return { kind: 'var', name: term.name };
  if (term.kind === 'number') return { kind: 'number', value: term.value };
  if (term.kind === 'float') return { kind: 'float', value: term.value };
  if (term.kind === 'atom') {
    const r = { kind: 'atom', name: term.name };
    if (term.id != null) r.id = term.id;
    if (term.logicTraceAsString) r.logicTraceAsString = true;
    return r;
  }
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: term.arity != null ? term.arity : (term.args || []).length,
      args: (term.args || []).map(logicCloneTerm),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicCloneTerm(term.head),
      tail: logicCloneTerm(term.tail),
    };
  }
  if (term.kind === 'dif_list') {
    return {
      kind: 'dif_list',
      front: logicCloneTerm(term.front),
      hole: logicCloneTerm(term.hole),
    };
  }
  if (term.kind === 'lazy_list') {
    return { kind: 'lazy_list', gen: { ...term.gen } };
  }
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicCloneTerm(term.left),
      right: term.right != null ? logicCloneTerm(term.right) : null,
    };
  }
  return term;
}

function logicFirstVarNameInTerm(term) {
  let found = null;
  function walk(t) {
    if (!t || found) return;
    if (t.kind === 'var' && t.name !== '_') {
      found = t.name;
      return;
    }
    if (t.kind === 'compound') {
      for (const a of t.args || []) walk(a);
    } else if (t.kind === 'list' && !t.nil) {
      walk(t.head);
      walk(t.tail);
    } else if (t.kind === 'arith') {
      walk(t.left);
      walk(t.right);
    }
  }
  walk(term);
  return found;
}

function logicSubstituteVarInTerm(term, varName, replacement) {
  if (!term) return term;
  if (term.kind === 'var') {
    if (term.name === varName) return logicCloneTerm(replacement);
    return term;
  }
  if (term.kind === 'number' || term.kind === 'atom') return term;
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: term.arity != null ? term.arity : (term.args || []).length,
      args: (term.args || []).map((a) => logicSubstituteVarInTerm(a, varName, replacement)),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicSubstituteVarInTerm(term.head, varName, replacement),
      tail: logicSubstituteVarInTerm(term.tail, varName, replacement),
    };
  }
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicSubstituteVarInTerm(term.left, varName, replacement),
      right: logicSubstituteVarInTerm(term.right, varName, replacement),
    };
  }
  return term;
}

function logicVarNamesInTerm(term) {
  const names = [];
  const seen = new Set();
  function walk(t) {
    if (!t) return;
    if (t.kind === 'var' && t.name !== '_') {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        names.push(t.name);
      }
      return;
    }
    if (t.kind === 'compound') {
      for (const a of t.args || []) walk(a);
    } else if (t.kind === 'list' && !t.nil) {
      walk(t.head);
      walk(t.tail);
    } else if (t.kind === 'arith') {
      walk(t.left);
      walk(t.right);
    }
  }
  walk(term);
  return names;
}

function logicCollectFreeVarsInTerm(term) {
  const names = [];
  const seen = new Set();
  function walk(t) {
    if (!t) return;
    if (t.kind === 'var' && t.name !== '_') {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        names.push(t.name);
      }
      return;
    }
    if (t.kind === 'compound') {
      for (const a of t.args || []) walk(a);
    } else if (t.kind === 'list' && !t.nil) {
      walk(t.head);
      walk(t.tail);
    } else if (t.kind === 'arith') {
      walk(t.left);
      walk(t.right);
    }
  }
  walk(term);
  return names;
}

function logicExistentialVarsForBagof(template, innerGoal, env) {
  const templateVars = new Set(logicCollectFreeVarsInTerm(logicDeref(template, env)));
  return logicCollectFreeVarsInGoal(innerGoal).filter((v) => {
    if (templateVars.has(v)) return false;
    return logicDeref({ kind: 'var', name: v }, env).kind === 'var';
  });
}

function logicBagofBindingsEqual(a, b, env, table) {
  const keysA = Object.keys(a || {});
  const keysB = Object.keys(b || {});
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (logicCompareTerms(a[k], b[k], env, table) !== 0) return false;
  }
  return true;
}

function logicSetofUniqueSort(items, env, table) {
  const unique = [];
  for (const item of items || []) {
    let dup = false;
    for (const u of unique) {
      if (logicCompareTerms(item, u, env, table) === 0) {
        dup = true;
        break;
      }
    }
    if (!dup) unique.push(item);
  }
  return unique.slice().sort((a, b) => logicCompareTerms(a, b, env, table));
}

function logicTermVarByName(term, varName) {
  let found = null;
  function walk(t) {
    if (!t || found) return;
    if (t.kind === 'var' && t.name === varName) {
      found = t;
      return;
    }
    if (t.kind === 'compound') {
      for (const a of t.args || []) walk(a);
    } else if (t.kind === 'list' && !t.nil) {
      walk(t.head);
      walk(t.tail);
    } else if (t.kind === 'arith') {
      walk(t.left);
      walk(t.right);
    }
  }
  walk(term);
  return found;
}

function logicPrepareCallableInstantiation(templateTerm, elem, env) {
  const td = logicDeref(templateTerm, env);
  if (td.kind !== 'compound') return null;
  const varName = logicFirstVarNameInTerm(td);
  if (!varName) return null;
  const elemD = logicDeref(elem, env);
  const templateCopy = logicSubstituteVarInTerm(td, varName, elemD);
  const goal = logicGoalFromCallableTerm(templateCopy);
  if (!goal) return null;
  return { goal, templateCopy };
}

function logicPrepareCallableInstantiationPair(templateTerm, elem1, elem2, env) {
  const td = logicDeref(templateTerm, env);
  if (td.kind !== 'compound') return null;
  const varNames = logicVarNamesInTerm(td);
  if (varNames.length < 2) return null;
  const inVarName = varNames[0];
  const outVarName = varNames[1];
  const elem1D = logicDeref(elem1, env);
  let templateCopy = logicSubstituteVarInTerm(td, inVarName, elem1D);
  let outTerm = null;
  if (elem2 != null) {
    const elem2D = logicDeref(elem2, env);
    templateCopy = logicSubstituteVarInTerm(templateCopy, outVarName, elem2D);
  } else {
    outTerm = logicTermVarByName(templateCopy, outVarName);
  }
  const goal = logicGoalFromCallableTerm(templateCopy);
  if (!goal) return null;
  return { goal, templateCopy, outVarName: elem2 == null ? outVarName : null, outTerm };
}

function logicPrepareCallableInstantiationFold4(templateTerm, accIn, elem, env) {
  const td = logicDeref(templateTerm, env);
  if (td.kind !== 'compound') return null;
  const varNames = logicVarNamesInTerm(td);
  if (varNames.length < 3) return null;
  const accInVar = varNames[0];
  const elemVar = varNames[1];
  const accOutVar = varNames[2];
  const accInD = accIn && accIn.kind ? accIn : logicDeref(accIn, env);
  const elemD = logicDeref(elem, env);
  let templateCopy = logicSubstituteVarInTerm(td, accInVar, accInD);
  templateCopy = logicSubstituteVarInTerm(templateCopy, elemVar, elemD);
  const goal = logicGoalFromCallableTerm(templateCopy);
  if (!goal) return null;
  return { goal, templateCopy, accOutVar };
}

function logicPrepareCallableInstantiationFold5(templateTerm, accIn, elem1, elem2, env) {
  const td = logicDeref(templateTerm, env);
  if (td.kind !== 'compound') return null;
  const varNames = logicVarNamesInTerm(td);
  if (varNames.length < 4) return null;
  const accInVar = varNames[0];
  const elem1Var = varNames[1];
  const elem2Var = varNames[2];
  const accOutVar = varNames[3];
  const accInD = accIn && accIn.kind ? accIn : logicDeref(accIn, env);
  const elem1D = logicDeref(elem1, env);
  const elem2D = logicDeref(elem2, env);
  let templateCopy = logicSubstituteVarInTerm(td, accInVar, accInD);
  templateCopy = logicSubstituteVarInTerm(templateCopy, elem1Var, elem1D);
  templateCopy = logicSubstituteVarInTerm(templateCopy, elem2Var, elem2D);
  const goal = logicGoalFromCallableTerm(templateCopy);
  if (!goal) return null;
  return { goal, templateCopy, accOutVar };
}

function logicConvlistResultFromTemplate(templateCopy, env, table) {
  if (!templateCopy || templateCopy.kind !== 'compound') return null;
  const args = templateCopy.args || [];
  if (!args.length) return null;
  const idx = args.length === 1 ? 0 : args.length - 1;
  return logicResolveTerm(args[idx], env, table);
}

function logicEvalNumeric(term, env, table) {
  const d = logicDeref(term, env);
  if (d.kind === 'number') return { kind: 'number', value: d.value };
  if (d.kind === 'float') return { kind: 'float', value: d.value };
  if (d.kind === 'compound') return logicEvalNumericFunc(d, env, table);
  if (d.kind === 'arith') {
    if (d.op === 'neg') {
      const l = logicEvalNumeric(d.left, env, table);
      if (!l) return null;
      if (l.kind === 'float') return { kind: 'float', value: -l.value };
      return { kind: 'number', value: -l.value };
    }
    const l = logicEvalNumeric(d.left, env, table);
    const r = logicEvalNumeric(d.right, env, table);
    if (!l || !r) return null;
    const outFloat = logicNumericOutFloat(l, r);
    const lv = l.value;
    const rv = r.value;
    let result;
    switch (d.op) {
      case '+': result = lv + rv; break;
      case '-': result = lv - rv; break;
      case '*': result = lv * rv; break;
      case '/':
        if (rv === 0) return null;
        result = outFloat ? (lv / rv) : Math.trunc(lv / rv);
        break;
      case '//':
        if (rv === 0) return null;
        result = Math.trunc(lv / rv);
        break;
      case '**':
        result = Math.pow(lv, rv);
        if (!Number.isFinite(result)) return null;
        break;
      case 'mod':
        if (rv === 0) return null;
        result = logicSwiMod(lv, rv);
        break;
      case 'rem':
        if (rv === 0) return null;
        result = logicSwiRem(lv, rv);
        break;
      default: return null;
    }
    if (d.op === '**') {
      const powFloat = outFloat || !Number.isInteger(result);
      return logicNumericFromValue(result, powFloat);
    }
    if (outFloat) return { kind: 'float', value: result };
    return { kind: 'number', value: result };
  }
  if (d.kind === 'var') return null;
  return null;
}

function logicEvalNumber(term, env, table) {
  const r = logicEvalNumeric(term, env, table);
  if (!r || r.kind === 'float') return null;
  return r.value;
}

function logicUnifyExpr(left, right, env, table) {
  const ln = logicEvalNumber(left, env, table);
  const rn = logicEvalNumber(right, env, table);
  if (ln != null && rn != null) return ln === rn;
  return logicUnify(left, right, env, table);
}

function logicEvalCmpOperand(term, env, table) {
  const d = logicDeref(term, env);
  if (d.kind === 'number') return { tag: 'number', value: d.value };
  if (d.kind === 'float') return { tag: 'float', value: d.value };
  if (d.kind === 'arith') {
    const v = logicEvalNumber(d, env, table);
    if (v != null) return { tag: 'number', value: v };
    return null;
  }
  return null;
}

function logicEvalCmp(goal, env, table) {
  const ln = logicEvalCmpOperand(goal.left, env, table);
  const rn = logicEvalCmpOperand(goal.right, env, table);
  if (!ln || !rn) return false;
  if (ln.tag !== rn.tag) return false;
  switch (goal.op) {
    case '>=': return ln.value >= rn.value;
    case '=<': return ln.value <= rn.value;
    case '>': return ln.value > rn.value;
    case '<': return ln.value < rn.value;
    case '=:=': return Object.is(ln.value, rn.value);
    case '=\\=': return !Object.is(ln.value, rn.value);
    default: return false;
  }
}

function logicResolveTerm(term, env, table) {
  const d = logicDeref(term, env);
  if (d.kind === 'number') return { kind: 'number', value: d.value };
  if (d.kind === 'float') return { kind: 'float', value: d.value };
  if (d.kind === 'atom') {
    const r = { kind: 'atom', name: logicAtomDisplayName(d, table) };
    if (d.logicTraceAsString) r.logicTraceAsString = true;
    return r;
  }
  if (d.kind === 'var') return { kind: 'var', name: d.name };
  if (d.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: d.predicate,
      args: d.args.map((a) => logicResolveTerm(a, env, table)),
    };
  }
  if (logicListIsNil(d)) return { kind: 'list', nil: true };
  if (d.kind === 'list') {
    return {
      kind: 'list',
      head: logicResolveTerm(d.head, env, table),
      tail: logicResolveTerm(d.tail, env, table),
    };
  }
  if (d.kind === 'dif_list') {
    return {
      kind: 'dif_list',
      front: logicResolveTerm(d.front, env, table),
      hole: logicResolveTerm(d.hole, env, table),
    };
  }
  if (d.kind === 'lazy_list') {
    return { kind: 'lazy_list', gen: { ...d.gen } };
  }
  return d;
}

function logicEngineQueryGoals(q) {
  if (q && q.goals && q.goals.length) return q.goals;
  if (q && q.goal) return [q.goal];
  return [];
}

function logicCollectFreeVarsInGoal(goal) {
  const free = new Set();
  function walkTerm(t) {
    if (!t) return;
    if (t.kind === 'var' && t.name !== '_') free.add(t.name);
    else if (t.kind === 'compound' || t.kind === 'call') {
      for (const a of t.args || []) walkTerm(a);
    } else if (t.kind === 'list') {
      if (!t.nil) {
        walkTerm(t.head);
        walkTerm(t.tail);
      }
    } else if (t.kind === 'dif_list') {
      walkTerm(t.front);
      walkTerm(t.hole);
    } else if (t.kind === 'arith') { walkTerm(t.left); walkTerm(t.right); }
  }
  function walkGoal(g) {
    if (!g) return;
    if (g.kind === 'not') walkGoal(g.goal);
    else if (g.kind === 'or') { walkGoal(g.left); walkGoal(g.right); }
    else if (g.kind === 'if') {
      for (const sg of g.cond || []) walkGoal(sg);
      for (const sg of g.then || []) walkGoal(sg);
      for (const sg of g.else || []) walkGoal(sg);
    } else if (g.kind === 'seq') {
      for (const sg of g.goals || []) walkGoal(sg);
    } else if (g.kind === 'call' || g.kind === 'compound') {
      for (const a of g.args || []) walkTerm(a);
    } else if (g.kind === 'cmp' || g.kind === 'unify' || g.kind === 'is') {
      walkTerm(g.left); walkTerm(g.right);
    }
  }
  walkGoal(goal);
  return [...free];
}

function logicCollectFreeVarsInGoals(goals) {
  const free = new Set();
  for (const g of goals || []) {
    for (const v of logicCollectFreeVarsInGoal(g)) free.add(v);
  }
  return [...free];
}

function executeLogicQueries(mergedDef, inputEnv, options) {
  const opts = options || {};
  let queries = mergedDef.queries || [];
  if (opts.queryNone) {
    queries = [];
  } else if (opts.queryNames && opts.queryNames.length) {
    const byName = new Map();
    for (const q of mergedDef.queries || []) {
      if (q && q.name) byName.set(q.name, q);
    }
    queries = [];
    for (const name of opts.queryNames) {
      const q = byName.get(name);
      if (q) queries.push(q);
    }
  }
  const engineOpts = {
    factIndex: opts.factIndex,
    ruleClauses: opts.ruleClauses,
    mutationRuntime: opts.mutationRuntime,
  };
  let engine = opts.factIndex
    ? new LogicEngine(mergedDef.clauses || [], engineOpts)
    : new LogicEngine(mergedDef.clauses || [], { mutationRuntime: opts.mutationRuntime });
  if (opts.maxSolutions != null) engine.maxSolutions = opts.maxSolutions;
  if (opts.maxDepth != null) engine.maxDepth = opts.maxDepth;
  if (opts.onShowLine) engine.onShowLine = opts.onShowLine;
  const out = {};
  for (const q of queries || []) {
    const goals = logicEngineQueryGoals(q);
    out[q.name] = engine.solveQuery(goals, inputEnv || {});
    if (engine._mutationDirty && opts.mutationRuntime) {
      const rt = opts.mutationRuntime;
      const fi = typeof rt.getFactIndex === 'function' ? rt.getFactIndex() : opts.factIndex;
      const rc = typeof rt.getRuleClauses === 'function' ? rt.getRuleClauses() : opts.ruleClauses;
      const nextOpts = {
        factIndex: fi || opts.factIndex,
        ruleClauses: rc || opts.ruleClauses,
        mutationRuntime: rt,
      };
      engine = fi
        ? new LogicEngine(mergedDef.clauses || [], nextOpts)
        : new LogicEngine(mergedDef.clauses || [], { mutationRuntime: rt });
      if (opts.maxSolutions != null) engine.maxSolutions = opts.maxSolutions;
      if (opts.maxDepth != null) engine.maxDepth = opts.maxDepth;
      if (opts.onShowLine) engine.onShowLine = opts.onShowLine;
    }
  }
  out._logicMeta = { truncated: engine.truncated, depthExceeded: engine.depthExceeded };
  return out;
}

function logicPrepareGoalsForInvoke(goals) {
  let collectIdx = 0;
  function mapTerm(t) {
    if (!t) return t;
    if (t.kind === 'var' && t.name === '_') {
      return { kind: 'var', name: `__collect${collectIdx++}` };
    }
    if (t.kind === 'compound') {
      return { kind: 'compound', predicate: t.predicate, args: (t.args || []).map(mapTerm) };
    }
    if (t.kind === 'list') {
      if (t.nil) return { kind: 'list', nil: true };
      return { kind: 'list', head: mapTerm(t.head), tail: mapTerm(t.tail) };
    }
    if (t.kind === 'arith') {
      return { kind: 'arith', op: t.op, left: mapTerm(t.left), right: mapTerm(t.right) };
    }
    return t;
  }
  function mapGoal(g) {
    if (!g) return g;
    if (g.kind === 'not') return { kind: 'not', goal: mapGoal(g.goal) };
    if (g.kind === 'cut') return { kind: 'cut' };
    if (g.kind === 'or') {
      return { kind: 'or', left: mapGoal(g.left), right: mapGoal(g.right) };
    }
    if (g.kind === 'if') {
      return {
        kind: 'if',
        cond: (g.cond || []).map(mapGoal),
        then: (g.then || []).map(mapGoal),
        else: (g.else || []).map(mapGoal),
        line: g.line,
      };
    }
    if (g.kind === 'seq') {
      return { kind: 'seq', goals: (g.goals || []).map(mapGoal), line: g.line };
    }
    if (g.kind === 'call' || g.kind === 'compound') {
      return { kind: 'call', predicate: g.predicate, args: (g.args || []).map(mapTerm) };
    }
    if (g.kind === 'cmp') {
      return { kind: 'cmp', op: g.op, left: mapTerm(g.left), right: mapTerm(g.right) };
    }
    if (g.kind === 'unify') {
      return { kind: 'unify', left: mapTerm(g.left), right: mapTerm(g.right) };
    }
    if (g.kind === 'mut_add' || g.kind === 'mut_remove') {
      return { kind: g.kind, head: mapTerm(g.head) };
    }
    if (g.kind === 'mut_retract_all') {
      return { kind: g.kind, template: mapTerm(g.template) };
    }
    if (g.kind === 'mut_commit') {
      return {
        kind: g.kind,
        ops: (g.ops || []).map((op) => ({
          op: op.op,
          head: op.head ? mapTerm(op.head) : null,
          template: op.template ? mapTerm(op.template) : null,
        })),
      };
    }
    return g;
  }
  return (goals || []).map(mapGoal);
}

function logicOutputFreeVars(goals, inputEnv) {
  const bound = inputEnv ? Object.keys(inputEnv) : [];
  const boundSet = new Set(bound);
  return logicCollectFreeVarsInGoals(goals).filter((v) => !boundSet.has(v));
}

function logicInferBindType(bitWidth) {
  if (bitWidth === 1) return 'bool';
  if (bitWidth >= 8 && bitWidth % 8 === 0) return 'text';
  return 'number';
}

const LOGIC_MAX_QUERY_VARS = 32;

function logicValidateQueryVarCount(count, context) {
  if (count < 0 || count > LOGIC_MAX_QUERY_VARS) {
    throw Error(`${context}: query has ${count} output variables (maximum ${LOGIC_MAX_QUERY_VARS})`);
  }
}

function logicPrimaryCallGoal(goals) {
  for (const g of goals || []) {
    if (g && (g.kind === 'call' || g.kind === 'compound')) return g;
    if (g && g.kind === 'not') {
      const inner = logicPrimaryCallGoal([g.goal]);
      if (inner) return inner;
    }
  }
  return null;
}

function logicCallArgVarSlots(rawGoals, preparedGoals) {
  const rawG = logicPrimaryCallGoal(rawGoals);
  const prepG = logicPrimaryCallGoal(preparedGoals);
  if (!rawG || !prepG || !rawG.args || !prepG.args) return null;
  const n = Math.max(rawG.args.length, prepG.args.length);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const rawA = rawG.args[i];
    const prepA = prepG.args[i];
    slots.push({
      index: i,
      anonymous: !!(rawA && rawA.kind === 'var' && rawA.name === '_'),
      varName: prepA && prepA.kind === 'var' ? prepA.name : null,
    });
  }
  return slots;
}

function logicSelArgCount(argVarSlots, freeVars) {
  if (argVarSlots && argVarSlots.length) return argVarSlots.length;
  return freeVars ? freeVars.length : 0;
}

function logicValidateSelAnonymous(argVarSlots, columnSelect, context) {
  if (!columnSelect || !argVarSlots || !argVarSlots.length) return;
  for (const i of columnSelect) {
    const s = argVarSlots[i];
    if (!s) {
      throw Error(`${context}: sel(${i}) out of range`);
    }
    if (s.anonymous) {
      throw Error(`${context}: sel(${i}): column ${i} is anonymous (_); name the variable to select it`);
    }
    if (!s.varName) {
      throw Error(`${context}: sel(${i}): column ${i} is not a variable`);
    }
  }
}

function logicValidateColumnSelect(columnSelect, varCount, context) {
  if (!columnSelect) return;
  if (!Array.isArray(columnSelect) || (columnSelect.length !== 1 && columnSelect.length !== 2)) {
    throw Error(`${context}: ;sel requires one or two column indices`);
  }
  for (const idx of columnSelect) {
    if (!Number.isInteger(idx)) {
      throw Error(`${context}: ;sel indices must be integers`);
    }
    if (idx < 0 || idx >= varCount) {
      const label = columnSelect.length === 1
        ? `sel(${idx})`
        : `sel(${columnSelect[0]},${columnSelect[1]})`;
      throw Error(`${context}: ;${label} out of range for ${varCount} query columns (0-based)`);
    }
  }
  if (columnSelect.length === 2 && columnSelect[0] === columnSelect[1]) {
    throw Error(`${context}: ;sel(${columnSelect[0]},${columnSelect[1]}) requires two distinct column indices`);
  }
}

function logicPackVarsFromColumnSelect(columnSelect, argVarSlots, freeVars) {
  if (!columnSelect) return freeVars;
  if (argVarSlots && argVarSlots.length) {
    return columnSelect.map((i) => {
      const s = argVarSlots[i];
      return s && s.varName ? s.varName : null;
    }).filter(Boolean);
  }
  if (columnSelect.length === 1) return [freeVars[columnSelect[0]]];
  return [freeVars[columnSelect[0]], freeVars[columnSelect[1]]];
}

function logicPackVarsFromSelect(freeVars, columnSelect, argVarSlots) {
  return logicPackVarsFromColumnSelect(columnSelect, argVarSlots, freeVars);
}

function logicResolveMatrixPackVars(freeVars, columnSelect, argVarSlots) {
  if (columnSelect) {
    const pv = logicPackVarsFromColumnSelect(columnSelect, argVarSlots, freeVars);
    return pv.length === 2 ? pv : null;
  }
  if (freeVars.length === 2) return freeVars;
  return null;
}

function logicPolicyVarsForRedirect(freeVars, columnSelect, argVarSlots) {
  if (columnSelect) return logicPackVarsFromColumnSelect(columnSelect, argVarSlots, freeVars);
  return freeVars;
}

function logicSolutionTupleKey(sol, freeVars) {
  if (!sol || !freeVars || !freeVars.length) return '';
  const parts = [];
  for (const v of freeVars) {
    const term = sol[v];
    if (!term) parts.push('');
    else if (term.kind === 'atom') parts.push(`a:${term.name}`);
    else if (term.kind === 'number') parts.push(`n:${term.value}`);
    else if (term.kind === 'var') parts.push(`v:${term.name}`);
    else if (term.kind === 'list') parts.push(logicGroundTermKey(term));
    else parts.push('?');
  }
  return parts.join('\0');
}

function logicApplyResultPolicy(solutions, policy, freeVars) {
  const list = solutions || [];
  if (!list.length || !policy) return list;
  if (policy === 'unique') {
    const seen = new Set();
    const out = [];
    for (const sol of list) {
      const key = logicSolutionTupleKey(sol, freeVars);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(sol);
    }
    return out;
  }
  if (policy === 'first') return [list[0]];
  if (policy === 'last') return [list[list.length - 1]];
  return list;
}

function logicGroundTermKey(term, table) {
  if (!term) return '';
  if (term.kind === 'atom') {
    let n = term.name;
    if (n == null && term.id != null && table) n = table.name(term.id);
    return `a:${n != null ? n : ''}`;
  }
  if (term.kind === 'number') return `n:${term.value}`;
  if (term.kind === 'float') return `f:${term.value}`;
  if (term.kind === 'var') return `v:${term.name}`;
  if (term.kind === 'compound') {
    const args = (term.args || []).map((a) => logicGroundTermKey(a, table)).join('\1');
    const arity = term.arity != null ? term.arity : (term.args || []).length;
    return `c:${term.predicate}/${arity}:${args}`;
  }
  if (term.kind === 'list') {
    if (logicListIsNil(term)) return 'l:[]';
    return `l:${logicGroundTermKey(term.head, table)}${'\x01'}${logicGroundTermKey(term.tail, table)}`;
  }
  return '?';
}

function logicNormalizeMutationTerm(term, table) {
  if (!term || !table) return term;
  if (term.kind === 'atom') {
    if (term.name != null) return term;
    if (term.id != null) {
      const name = table.name(term.id);
      if (name != null) return { kind: 'atom', id: term.id, name };
    }
    return term;
  }
  if (term.kind === 'compound') {
    const args = (term.args || []).map((a) => logicNormalizeMutationTerm(a, table));
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: term.arity != null ? term.arity : args.length,
      args,
    };
  }
  if (term.kind === 'list') {
    if (logicListIsNil(term)) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicNormalizeMutationTerm(term.head, table),
      tail: logicNormalizeMutationTerm(term.tail, table),
    };
  }
  return term;
}

function logicFactClauseKey(clause) {
  const head = clause && clause.head;
  if (!head || head.kind !== 'compound') return logicGroundTermKey(head);
  const arity = head.arity != null ? head.arity : (head.args || []).length;
  const args = (head.args || []).map(logicGroundTermKey).join('\0');
  return `${head.predicate}/${arity}\0${args}`;
}

function logicPredicateUniqueKind(name) {
  if (!name || typeof name !== 'string') return null;
  if (name.endsWith('$$')) return 'keyed';
  if (name.endsWith('$')) return 'single';
  return null;
}

function logicUnbindVar(env, name) {
  if (!env || !name || name === '_') return;
  if (!env.bindings.has(name)) return;
  env.bindings.delete(name);
  if (env.trail) {
    for (let i = env.trail.length - 1; i >= 0; i--) {
      if (env.trail[i] === name) env.trail.splice(i, 1);
    }
  }
}

function logicUniqueSlotKeyFromCallGoal(goal, env, table) {
  if (!goal || goal.kind !== 'call') return null;
  const kind = logicPredicateUniqueKind(goal.predicate);
  if (!kind) return null;
  const args = (goal.args || []).map((a) => logicDeref(a, env));
  const compound = {
    kind: 'compound',
    predicate: goal.predicate,
    arity: args.length,
    args,
  };
  const norm = logicNormalizeMutationTerm(compound, table);
  if (!norm) return null;
  if (kind === 'keyed') {
    const k0 = norm.args && norm.args[0];
    if (!k0 || !logicTermIsGround(k0)) return null;
  }
  return logicUniqueSlotKeyFromHead(norm);
}

function logicUniqueSlotKeyFromRetractTemplate(template, table) {
  if (!template || template.kind !== 'compound') return null;
  const kind = logicPredicateUniqueKind(template.predicate);
  if (!kind) return null;
  if (kind === 'keyed') {
    const k0 = template.args && template.args[0];
    if (!k0 || k0.kind === 'var') return null;
  }
  const norm = logicNormalizeMutationTerm(template, table);
  return logicUniqueSlotKeyFromHead(norm);
}

function logicCollectMutatedSlotsFromMutationGoal(goal, table) {
  const out = [];
  if (!goal) return out;
  const addHead = (head) => {
    if (!head) return;
    const norm = logicNormalizeMutationTerm(head, table);
    const sk = logicUniqueSlotKeyFromHead(norm);
    if (sk) out.push(sk);
  };
  if (goal.kind === 'mut_add' || goal.kind === 'mut_remove') {
    addHead(goal.head);
  } else if (goal.kind === 'mut_commit') {
    for (const op of goal.ops || []) {
      if (op.op === 'add' || op.op === 'remove') addHead(op.head);
      else if (op.op === 'retract_all') {
        const sk = logicUniqueSlotKeyFromRetractTemplate(op.template, table);
        if (sk) out.push(sk);
      }
    }
  } else if (goal.kind === 'mut_retract_all') {
    const sk = logicUniqueSlotKeyFromRetractTemplate(goal.template, table);
    if (sk) out.push(sk);
  }
  return out;
}

function logicUniqueSlotKeyFromHead(head) {
  if (!head || head.kind !== 'compound') return null;
  const kind = logicPredicateUniqueKind(head.predicate);
  if (!kind) return null;
  const arity = head.arity != null ? head.arity : (head.args || []).length;
  if (kind === 'single') return `$:${head.predicate}/${arity}`;
  if (kind === 'keyed') {
    const k0 = head.args && head.args[0];
    if (!k0 || !logicTermIsGround(k0)) return null;
    return `$$:${head.predicate}/${arity}:${logicGroundTermKey(k0)}`;
  }
  return null;
}

function logicNormalizeUniqueClauses(clauses) {
  const lastIndex = new Map();
  for (let i = 0; i < (clauses || []).length; i++) {
    const c = clauses[i];
    if (c.body && c.body.length) continue;
    const slot = c.head && c.head.kind === 'compound' ? logicUniqueSlotKeyFromHead(c.head) : null;
    if (slot) lastIndex.set(slot, i);
  }
  const out = [];
  for (let i = 0; i < (clauses || []).length; i++) {
    const c = clauses[i];
    if (c.body && c.body.length) {
      out.push(c);
      continue;
    }
    const slot = c.head && c.head.kind === 'compound' ? logicUniqueSlotKeyFromHead(c.head) : null;
    if (slot) {
      if (lastIndex.get(slot) === i) out.push(c);
    } else {
      out.push(c);
    }
  }
  return out;
}

function logicClearUniqueSlotInTransaction(slotKey, nextAdds, nextTombs, staticClauses, mode) {
  if (!slotKey) return;
  for (const [k, clause] of [...nextAdds.entries()]) {
    if (logicUniqueSlotKeyFromHead(clause.head) === slotKey) nextAdds.delete(k);
  }
  if (mode !== 'seed' && staticClauses && staticClauses.length) {
    for (const c of staticClauses) {
      if (c.body && c.body.length) continue;
      if (!c.head || c.head.kind !== 'compound') continue;
      if (logicUniqueSlotKeyFromHead(c.head) === slotKey) {
        nextTombs.add(logicFactClauseKey(c));
      }
    }
  }
}

function logicFactIndexClearUniqueSlot(factIndex, slotKey) {
  if (!factIndex || !slotKey) return;
  const toRemove = [];
  for (const [fKey, ic] of factIndex.keys.entries()) {
    if (logicUniqueSlotKeyFromHead(ic.head) === slotKey) toRemove.push(fKey);
  }
  for (const fKey of toRemove) logicFactIndexRemove(factIndex, fKey);
}

function logicTermIsGround(term) {
  if (!term) return true;
  if (term.kind === 'wireRef') return false;
  if (term.kind === 'var') return false;
  if (term.kind === 'compound') return (term.args || []).every(logicTermIsGround);
  if (term.kind === 'list') {
    if (term.nil) return true;
    return logicTermIsGround(term.head) && logicTermIsGround(term.tail);
  }
  if (term.kind === 'arith') {
    if (term.op === 'neg') return logicTermIsGround(term.left);
    return logicTermIsGround(term.left) && logicTermIsGround(term.right);
  }
  return true;
}

function logicCreateDynamicStore() {
  return { adds: new Map(), tombstones: new Set() };
}

function logicBuildRuntimeClauses(staticClauses, store, options) {
  const mode = (options && options.dataMode) || 'overlay';
  if (mode === 'static') {
    return (staticClauses || []).slice();
  }
  if (mode === 'seed') {
    const out = [];
    for (const c of staticClauses || []) {
      if (c.body && c.body.length) out.push(c);
    }
    const adds = store && store.adds ? store.adds : new Map();
    for (const c of adds.values()) out.push(c);
    return out;
  }
  const out = [];
  const tomb = store && store.tombstones ? store.tombstones : new Set();
  const adds = store && store.adds ? store.adds : new Map();
  for (const c of staticClauses || []) {
    const isFact = !c.body || c.body.length === 0;
    if (isFact && tomb.has(logicFactClauseKey(c))) continue;
    out.push(c);
  }
  for (const c of adds.values()) out.push(c);
  return out;
}

function logicSeedDynamicStore(clauses, store) {
  if (!store) return;
  const adds = new Map();
  for (const head of logicCollectStaticGroundFacts(clauses)) {
    const clause = { head, body: [] };
    adds.set(logicFactClauseKey(clause), clause);
  }
  store.adds = adds;
  store.tombstones = new Set();
}

function logicDerefMutationTerm(term, env, table) {
  if (!term) return term;
  const d = logicDeref(term, env);
  if (d.kind === 'var') {
    if (d.name === '_') return d;
    return null;
  }
  if (d.kind === 'compound') {
    const args = (d.args || []).map((a) => logicDerefMutationTerm(a, env, table));
    if (args.some((a) => a === null)) return null;
    return logicNormalizeMutationTerm({
      kind: 'compound',
      predicate: d.predicate,
      arity: args.length,
      args,
    }, table);
  }
  if (d.kind === 'list') {
    if (logicListIsNil(d)) return { kind: 'list', nil: true };
    const head = logicDerefMutationTerm(d.head, env, table);
    const tail = logicDerefMutationTerm(d.tail, env, table);
    if (head === null || tail === null) return null;
    return logicNormalizeMutationTerm({ kind: 'list', head, tail }, table);
  }
  return logicNormalizeMutationTerm(d, table);
}

function logicDerefMutationGoal(goal, env, table) {
  if (!goal || !env) return goal;
  if (goal.kind === 'mut_add' || goal.kind === 'mut_remove') {
    const head = logicDerefMutationTerm(goal.head, env, table);
    if (!head || !logicTermIsGround(head)) return null;
    return { kind: goal.kind, head };
  }
  if (goal.kind === 'mut_retract_all') {
    const template = logicDerefMutationTerm(goal.template, env, table);
    if (!template) return null;
    return { kind: goal.kind, template };
  }
  if (goal.kind === 'mut_commit') {
    const ops = [];
    for (const op of goal.ops || []) {
      if (op.op === 'retract_all') {
        const template = logicDerefMutationTerm(op.template, env, table);
        if (!template) return null;
        ops.push({ op: 'retract_all', template });
      } else {
        const head = logicDerefMutationTerm(op.head, env, table);
        if (!head || !logicTermIsGround(head)) return null;
        ops.push({ op: op.op, head });
      }
    }
    return { kind: 'mut_commit', ops };
  }
  return goal;
}

function logicApplyMutationTransaction(store, ops, options) {
  if (!store) return { success: false };
  const mode = (options && options.dataMode) || 'overlay';
  const staticClauses = (options && options.staticClauses) || [];
  for (const op of ops || []) {
    if (!op || !op.head || !logicTermIsGround(op.head)) return { success: false };
  }
  const nextAdds = new Map(store.adds);
  const nextTombs = new Set(store.tombstones);
  for (const op of ops || []) {
    const clause = { head: op.head, body: [] };
    const key = logicFactClauseKey(clause);
    if (op.op === 'add') {
      const slot = logicUniqueSlotKeyFromHead(op.head);
      if (slot) logicClearUniqueSlotInTransaction(slot, nextAdds, nextTombs, staticClauses, mode);
      if (mode !== 'seed') nextTombs.delete(key);
      nextAdds.set(key, clause);
    } else if (op.op === 'remove') {
      nextAdds.delete(key);
      if (mode !== 'seed') nextTombs.add(key);
    }
  }
  store.adds = nextAdds;
  store.tombstones = nextTombs;
  return { success: true };
}

function logicCloneDynamicStore(store) {
  if (!store) return logicCreateDynamicStore();
  return {
    adds: new Map(store.adds || []),
    tombstones: new Set(store.tombstones || []),
  };
}

function logicSimulateMutationStore(store, ops, options) {
  const sim = logicCloneDynamicStore(store);
  const stepFn = typeof logicApplyMutationOpStep === 'function' ? logicApplyMutationOpStep : null;
  if (stepFn) {
    for (const op of ops || []) {
      const result = stepFn(sim, (options && options.staticClauses) || [], op, options, options && options.table);
      if (!result || !result.success) return null;
    }
    return sim;
  }
  const result = logicApplyMutationTransaction(sim, ops, options);
  if (!result || !result.success) return null;
  return sim;
}

function logicSimulateCheckTransaction(staticClauses, store, ops, constraints, options) {
  const opts = options || {};
  const buildOpts = { staticClauses };
  if (opts.dataMode) buildOpts.dataMode = opts.dataMode;
  const proposedStore = logicSimulateMutationStore(store, ops, buildOpts);
  if (!proposedStore) return { pass: 0 };
  const proposedClauses = logicBuildRuntimeClauses(staticClauses, proposedStore, buildOpts);
  if (!constraints || !constraints.length) return { pass: 1 };
  const deltaFacts = logicMutationDeltaPlusFacts(ops);
  const execOpts = opts.execOpts || {};
  const vResult = logicValidateConstraintsForFacts(constraints, proposedClauses, deltaFacts, execOpts);
  return { pass: vResult.ok ? 1 : 0 };
}

function logicTermsEqualGround(a, b) {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'atom') return a.name === b.name;
  if (a.kind === 'number') return a.value === b.value;
  if (a.kind === 'compound') {
    if (a.predicate !== b.predicate) return false;
    const aa = a.args || [];
    const bb = b.args || [];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!logicTermsEqualGround(aa[i], bb[i])) return false;
    }
    return true;
  }
  if (a.kind === 'list') {
    if (logicListIsNil(a) && logicListIsNil(b)) return true;
    if (logicListIsNil(a) || logicListIsNil(b)) return false;
    return logicTermsEqualGround(a.head, b.head) && logicTermsEqualGround(a.tail, b.tail);
  }
  return false;
}

function logicBindConstraintHead(cHead, factHead) {
  if (!cHead || !factHead || cHead.kind !== 'compound' || factHead.kind !== 'compound') return null;
  if (cHead.predicate !== factHead.predicate) return null;
  const ca = cHead.args || [];
  const fa = factHead.args || [];
  if (ca.length !== fa.length) return null;
  const env = {};
  for (let i = 0; i < ca.length; i++) {
    const cv = ca[i];
    const fv = fa[i];
    if (cv.kind === 'var') {
      if (cv.name === '_') continue;
      env[cv.name] = fv;
    } else if (!logicTermsEqualGround(cv, fv)) {
      return null;
    }
  }
  return env;
}

function logicMatchingConstraints(factHead, constraints) {
  if (!factHead || factHead.kind !== 'compound') return [];
  const arity = (factHead.args || []).length;
  return (constraints || []).filter((c) => {
    const h = c && c.head;
    return h && h.kind === 'compound'
      && h.predicate === factHead.predicate
      && (h.args || []).length === arity;
  });
}

function logicValidateConstraintBody(bodyGoals, proposedClauses, inputEnv, options) {
  if (!bodyGoals || !bodyGoals.length) return true;
  const opts = options || {};
  const engine = opts.factIndex
    ? new LogicEngine(proposedClauses || [], { factIndex: opts.factIndex, ruleClauses: opts.ruleClauses })
    : new LogicEngine(proposedClauses || []);
  if (opts.maxDepth != null) engine.maxDepth = opts.maxDepth;
  if (opts.maxSolutions != null) engine.maxSolutions = opts.maxSolutions;
  const solutions = engine.solveQuery(bodyGoals, inputEnv || {});
  return solutions && solutions.length > 0;
}

function logicFormatShowTerm(term, env, table) {
  const d = logicDeref(term, env);
  if (!d) return '?';
  if (d.kind === 'var') return d.name != null ? String(d.name) : '?';
  if (d.kind === 'number') return String(d.value);
  if (d.kind === 'float') {
    const s = String(d.value);
    if (s.indexOf('.') >= 0 || s.indexOf('e') >= 0 || s.indexOf('E') >= 0) return s;
    return `${s}.0`;
  }
  if (d.kind === 'atom') {
    const name = d.name != null ? String(d.name) : (d.id != null && table ? table.name(d.id) : '');
    return name;
  }
  if (d.kind === 'compound') {
    const args = (d.args || []).map((a) => logicFormatShowTerm(a, env, table)).join(', ');
    const pred = d.predicate != null ? d.predicate : '';
    return `${pred}(${args})`;
  }
  if (d.kind === 'list') return logicFormatListShow(d, env, table);
  if (d.kind === 'dif_list') return logicFormatDifListShow(d, env, table);
  if (d.kind === 'lazy_list') return logicFormatLazyListShow(d);
  return '?';
}

function logicFormatLazyListShow(term) {
  if (!term || term.kind !== 'lazy_list') return '?';
  if (term.gen.type === 'between') {
    return `lazy(between(${term.gen.low}, ${term.gen.high}))`;
  }
  if (term.gen.type === 'rule') {
    return `lazy(${term.gen.predicate})`;
  }
  return 'lazy(?)';
}

function logicFormatDifListShow(term, env, table) {
  const d = logicDeref(term, env);
  if (d.kind !== 'dif_list') return logicFormatShowTerm(d, env, table);
  if (logicDifListIsClosed(d, env)) {
    const closed = logicDifListClose(d.front, d.hole, env);
    if (closed !== false) return logicFormatListShow(closed, env, table);
  }
  const frontStr = logicFormatListShow(d.front, env, table);
  const holeD = logicDeref(d.hole, env);
  const holeStr = holeD.kind === 'var' ? holeD.name : logicFormatShowTerm(holeD, env, table);
  return `${frontStr}-${holeStr}`;
}

function logicFormatListShow(term, env, table) {
  if (logicListIsNil(term)) return '[]';
  const elems = [];
  let cur = term;
  while (cur && cur.kind === 'list' && !cur.nil) {
    elems.push(logicFormatShowTerm(cur.head, env, table));
    const tailRaw = cur.tail;
    const tailD = tailRaw && tailRaw.kind === 'var'
      ? logicDeref(tailRaw, env)
      : logicDeref(tailRaw, env);
    if (tailD.kind === 'var') {
      return `[${elems.join(', ')}|${tailD.name}]`;
    }
    if (logicListIsNil(tailD)) {
      return `[${elems.join(', ')}]`;
    }
    if (tailD.kind === 'list') {
      cur = tailD;
      continue;
    }
    return `[${elems.join(', ')}|${logicFormatShowTerm(tailD, env, table)}]`;
  }
  return `[${elems.join(', ')}]`;
}

function logicFormatFactForTrace(term) {
  if (!term) return '?';
  if (term.kind === 'atom') {
    if (term.logicTraceAsString) return `"${term.name != null ? String(term.name) : ''}"`;
    return term.name != null ? String(term.name) : '';
  }
  if (term.kind === 'number') return String(term.value);
  if (term.kind === 'compound') {
    const args = (term.args || []).map(logicFormatFactForTrace).join(', ');
    const pred = term.predicate != null ? term.predicate : '';
    return `${pred}(${args})`;
  }
  if (term.kind === 'list') return logicFormatListStatic(term);
  return '?';
}

function logicFormatListStatic(term) {
  if (logicListIsNil(term)) return '[]';
  const elems = [];
  let cur = term;
  while (cur && cur.kind === 'list' && !cur.nil) {
    elems.push(logicFormatFactForTrace(cur.head));
    if (cur.tail && cur.tail.kind === 'list') {
      if (cur.tail.nil) return `[${elems.join(', ')}]`;
      cur = cur.tail;
    } else if (cur.tail && cur.tail.kind === 'var') {
      return `[${elems.join(', ')}|${cur.tail.name}]`;
    } else {
      return `[${elems.join(', ')}|${logicFormatFactForTrace(cur.tail)}]`;
    }
  }
  return `[${elems.join(', ')}]`;
}

function logicFormatMutationOpForTrace(op) {
  if (!op || !op.head) return '?';
  const sign = op.op === 'remove' ? '-' : '+';
  return `${sign} ${logicFormatFactForTrace(op.head)}`;
}

const LOGIC_MUT_TRY_INLINE_MAX = 4;

function logicFormatMutationTryBlock(ops) {
  const formatted = (ops || []).map(logicFormatMutationOpForTrace);
  if (!formatted.length) return { summary: '', expandLines: null };
  let summary;
  let expandLines = null;
  if (formatted.length <= LOGIC_MUT_TRY_INLINE_MAX) {
    summary = formatted.join('; ');
  } else {
    const shown = formatted.slice(0, LOGIC_MUT_TRY_INLINE_MAX);
    const extra = formatted.length - LOGIC_MUT_TRY_INLINE_MAX;
    summary = `${shown.join('; ')}; ... (+${extra})`;
    expandLines = formatted;
  }
  return { summary, expandLines };
}

function logicMutationOpIsNet(store, op, options) {
  if (!store || !op || !op.head || !logicTermIsGround(op.head)) return false;
  const mode = (options && options.dataMode) || 'overlay';
  const clause = { head: op.head, body: [] };
  const key = logicFactClauseKey(clause);
  const adds = store.adds || new Map();
  const tombs = store.tombstones || new Set();
  if (op.op === 'add') {
    if (mode !== 'seed' && tombs.has(key)) return true;
    if (!adds.has(key)) return true;
    const existing = adds.get(key);
    return !(existing && existing.head && logicTermsEqualGround(existing.head, op.head));
  }
  if (op.op === 'remove') {
    if (adds.has(key)) return true;
    if (mode === 'seed') return false;
    if (tombs.has(key)) return false;
    return true;
  }
  return false;
}

function logicCountMutationNetOps(store, ops, options) {
  const sim = logicCloneDynamicStore(store);
  let net = 0;
  const table = options && options.table;
  for (const op of ops || []) {
    if (logicMutationOpIsNet(sim, op, options)) net++;
    logicApplyMutationOpStep(sim, (options && options.staticClauses) || [], op, options, table);
  }
  return net;
}

function logicFormatMutRollbackLine(result) {
  if (!result || result.ok) return '';
  const code = result.code || 'store';
  const msg = result.message || 'mutation failed';
  if (code === 'constraint') return `rollback — ${msg}`;
  return `rollback — ${code}: ${msg}`;
}

function logicValidateFactConstraints(factHead, constraints, proposedClauses, options) {
  const matching = logicMatchingConstraints(factHead, constraints);
  if (!matching.length) return { ok: true };
  for (const c of matching) {
    const env = logicBindConstraintHead(c.head, factHead);
    if (!env) {
      const head = c && c.head;
      const pred = head && head.predicate;
      const arity = head
        ? (head.arity != null ? head.arity : (head.args || []).length)
        : 0;
      const idx = c && c.constraintIndex != null ? `#${c.constraintIndex}` : '';
      const factStr = logicFormatFactForTrace(factHead);
      return {
        ok: false,
        code: 'constraint',
        constraintIndex: c && c.constraintIndex,
        constraintHead: head,
        fact: factHead,
        message: `constraint ${pred}/${arity} ${idx} failed on + ${factStr}`.replace(/\s+/g, ' ').trim(),
      };
    }
    if (!logicValidateConstraintBody(c.body, proposedClauses, env, options)) {
      const head = c.head;
      const pred = head && head.predicate;
      const arity = head
        ? (head.arity != null ? head.arity : (head.args || []).length)
        : 0;
      const idx = c.constraintIndex != null ? `#${c.constraintIndex}` : '';
      const factStr = logicFormatFactForTrace(factHead);
      return {
        ok: false,
        code: 'constraint',
        constraintIndex: c.constraintIndex,
        constraintHead: head,
        fact: factHead,
        message: `constraint ${pred}/${arity} ${idx} failed on + ${factStr}`.replace(/\s+/g, ' ').trim(),
      };
    }
  }
  return { ok: true };
}

function logicCollectStaticGroundFacts(clauses) {
  const out = [];
  for (const c of clauses || []) {
    if (c.body && c.body.length) continue;
    if (c.head && logicTermIsGround(c.head)) out.push(c.head);
  }
  return out;
}

function logicValidateConstraintsForFacts(constraints, proposedClauses, facts, options) {
  if (!constraints || !constraints.length) return { ok: true };
  for (const fact of facts || []) {
    const r = logicValidateFactConstraints(fact, constraints, proposedClauses, options);
    if (!r.ok) return r;
  }
  return { ok: true };
}

function logicValidateStaticKnowledge(constraints, staticClauses, options) {
  if (!constraints || !constraints.length) return { ok: true };
  const facts = logicCollectStaticGroundFacts(staticClauses);
  return logicValidateConstraintsForFacts(constraints, staticClauses, facts, options);
}

function logicBuildFactIndex(clauses, tableOptional) {
  const table = tableOptional || new LogicAtomTable();
  const keys = new Map();
  const buckets = new Map();
  for (const c of clauses || []) {
    if (c.body && c.body.length) continue;
    if (!c.head || c.head.kind !== 'compound') continue;
    if (!logicTermIsGround(c.head)) continue;
    const fKey = logicFactClauseKey(c);
    if (keys.has(fKey)) continue;
    const ic = logicInternClause(c, table);
    keys.set(fKey, ic);
    const head = ic.head;
    const bKey = logicPredicateKey(head.predicate, head.arity);
    if (!buckets.has(bKey)) buckets.set(bKey, []);
    buckets.get(bKey).push(ic);
  }
  return { table, keys, buckets };
}

function logicFactIndexRemove(factIndex, fKey) {
  const ic = factIndex.keys.get(fKey);
  if (!ic) return;
  factIndex.keys.delete(fKey);
  const head = ic.head;
  const bKey = logicPredicateKey(head.predicate, head.arity);
  const bucket = factIndex.buckets.get(bKey);
  if (!bucket) return;
  const idx = bucket.indexOf(ic);
  if (idx >= 0) bucket.splice(idx, 1);
  if (!bucket.length) factIndex.buckets.delete(bKey);
}

function logicFactIndexAdd(factIndex, clause) {
  const fKey = logicFactClauseKey(clause);
  if (factIndex.keys.has(fKey)) return;
  const ic = logicInternClause(clause, factIndex.table);
  factIndex.keys.set(fKey, ic);
  const head = ic.head;
  const bKey = logicPredicateKey(head.predicate, head.arity);
  if (!factIndex.buckets.has(bKey)) factIndex.buckets.set(bKey, []);
  factIndex.buckets.get(bKey).push(ic);
}

function logicApplyFactIndexDelta(factIndex, ops) {
  if (!factIndex) throw Error('logic fact index delta: index is null');
  for (const op of ops || []) {
    if (!op || !op.head || !logicTermIsGround(op.head)) {
      throw Error('logic fact index delta: invalid op');
    }
    const clause = { head: op.head, body: [] };
    const fKey = logicFactClauseKey(clause);
    if (op.op === 'remove') {
      logicFactIndexRemove(factIndex, fKey);
    } else if (op.op === 'add') {
      const slot = logicUniqueSlotKeyFromHead(op.head);
      if (slot) logicFactIndexClearUniqueSlot(factIndex, slot);
      logicFactIndexAdd(factIndex, clause);
    } else {
      throw Error(`logic fact index delta: unknown op '${op.op}'`);
    }
  }
}

function logicVerifyFactIndex(factIndex, runtimeClauses) {
  if (!factIndex) throw Error('logic fact index verify: index is null');
  const expected = new Set();
  for (const c of runtimeClauses || []) {
    if (c.body && c.body.length) continue;
    if (!c.head || !logicTermIsGround(c.head)) continue;
    expected.add(logicFactClauseKey(c));
  }
  if (expected.size !== factIndex.keys.size) {
    throw Error(`logic fact index verify: size mismatch (expected ${expected.size}, got ${factIndex.keys.size})`);
  }
  for (const k of expected) {
    if (!factIndex.keys.has(k)) {
      throw Error(`logic fact index verify: missing key '${k}'`);
    }
  }
  for (const k of factIndex.keys.keys()) {
    if (!expected.has(k)) {
      throw Error(`logic fact index verify: extra key '${k}'`);
    }
  }
}

function logicCollectRuleClauses(clauses) {
  return (clauses || []).filter((c) => c.body && c.body.length);
}

function logicMutationDeltaPlusFacts(ops) {
  return (ops || []).filter((o) => o && o.op === 'add' && o.head).map((o) => o.head);
}

function executeLogicGoals(mergedDef, goals, inputEnv, options) {
  const opts = options || {};
  const engineOpts = {
    factIndex: opts.factIndex,
    ruleClauses: opts.ruleClauses,
    mutationRuntime: opts.mutationRuntime,
  };
  const engine = opts.factIndex
    ? new LogicEngine(mergedDef.clauses || [], engineOpts)
    : new LogicEngine(mergedDef.clauses || [], { mutationRuntime: opts.mutationRuntime });
  if (opts.maxSolutions != null) engine.maxSolutions = opts.maxSolutions;
  if (opts.maxDepth != null) engine.maxDepth = opts.maxDepth;
  if (opts.onShowLine) engine.onShowLine = opts.onShowLine;
  const prepared = logicPrepareGoalsForInvoke(goals);
  const solutions = engine.solveQuery(prepared, inputEnv || {});
  return {
    solutions,
    _logicMeta: { truncated: engine.truncated, depthExceeded: engine.depthExceeded },
  };
}

function logicListPackedElementWidth(bindType, numberFormat) {
  if (bindType === 'bool') return 1;
  if (bindType === 'text') return 8;
  if (bindType === 'number') return 16;
  if (bindType === 'float') {
    const packedFn = typeof logicPackedFloatListElementWidth === 'function'
      ? logicPackedFloatListElementWidth : null;
    return packedFn ? packedFn(numberFormat) : 32;
  }
  return 8;
}

function logicResolveListWireLayout(totalBits, bindType, vectorShape, numberFormat) {
  if (vectorShape && vectorShape.kind === 'vector') {
    return {
      mode: 'vector',
      slotCount: vectorShape.count,
      elementWidth: vectorShape.ew,
    };
  }
  if (vectorShape && vectorShape.kind === 'matrix') {
    throw Error(`${bindType} list expects a vector wire`);
  }
  const ew = logicListPackedElementWidth(bindType, numberFormat);
  if (bindType === 'text' && totalBits % 8 !== 0) {
    throw Error('text list expects vector or width multiple of 8');
  }
  if (bindType === 'number' && totalBits % 16 !== 0) {
    throw Error('number list expects vector or width multiple of 16');
  }
  if (bindType === 'float' && totalBits % ew !== 0) {
    throw Error(`float list expects vector or width multiple of ${ew}`);
  }
  return {
    mode: 'scalar',
    slotCount: totalBits / ew,
    elementWidth: ew,
  };
}

function logicIsListSlotFill(cellBits, bindType, fillBits) {
  if (!cellBits || cellBits.length === 0) return true;
  if (bindType === 'bool') return false;
  if (bindType === 'text' || bindType === 'number' || bindType === 'float') {
    return cellBits === fillBits || /^0+$/.test(cellBits);
  }
  return false;
}

function logicPrologListToArray(term) {
  const out = [];
  let cur = term;
  while (cur && cur.kind === 'list' && !cur.nil) {
    out.push(cur.head);
    cur = cur.tail;
  }
  return out;
}

function logicArrayToPrologList(elements) {
  let tail = { kind: 'list', nil: true };
  for (let i = elements.length - 1; i >= 0; i--) {
    tail = { kind: 'list', head: elements[i], tail };
  }
  return tail;
}

function logicDecodeListSlot(cellBits, bindType, numberFormat) {
  if (bindType === 'bool') {
    return { kind: 'number', value: cellBits[cellBits.length - 1] === '1' ? 1 : 0 };
  }
  if (bindType === 'text') {
    let s = '';
    for (let i = 0; i + 8 <= cellBits.length; i += 8) {
      const byte = parseInt(cellBits.substr(i, 8), 2);
      if (byte === 0) break;
      s += String.fromCharCode(byte);
    }
    if (!s) return null;
    return { kind: 'atom', name: s, logicTraceAsString: true };
  }
  if (bindType === 'number') {
    if (/^0+$/.test(cellBits)) return null;
    const decodeFn = typeof logicDecodeNumberBits === 'function' ? logicDecodeNumberBits : null;
    let n = decodeFn ? decodeFn(cellBits, numberFormat) : parseInt(cellBits, 2);
    if (isNaN(n)) n = 0;
    return { kind: 'number', value: n };
  }
  if (bindType === 'float') {
    if (/^0+$/.test(cellBits)) return null;
    const decodeFn = typeof logicDecodeFloatBits === 'function' ? logicDecodeFloatBits : null;
    let v = decodeFn ? decodeFn(cellBits, numberFormat) : parseFloat(cellBits, 2);
    if (v == null || isNaN(v)) v = 0;
    return { kind: 'float', value: v };
  }
  return null;
}

function logicCloneMutationTerm(term) {
  if (!term) return term;
  if (term.kind === 'wireRef') {
    return {
      kind: 'wireRef',
      bindType: term.bindType,
      numberFormat: term.numberFormat || null,
      listFlag: !!term.listFlag,
      eachFlag: !!term.eachFlag,
      everyFlag: !!term.everyFlag,
      eachIndex: term.eachIndex,
      everyIndex: term.everyIndex,
      wireName: term.wireName,
    };
  }
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
      arity: term.arity != null ? term.arity : (term.args || []).length,
      args: (term.args || []).map(logicCloneMutationTerm),
    };
  }
  if (term.kind === 'list') {
    if (term.nil) return { kind: 'list', nil: true };
    return {
      kind: 'list',
      head: logicCloneMutationTerm(term.head),
      tail: logicCloneMutationTerm(term.tail),
    };
  }
  if (term.kind === 'atom') {
    const out = { kind: 'atom', name: term.name };
    if (term.logicTraceAsString) out.logicTraceAsString = true;
    return out;
  }
  if (term.kind === 'number') return { kind: 'number', value: term.value };
  if (term.kind === 'float') return { kind: 'float', value: term.value };
  if (term.kind === 'var') return { kind: 'var', name: term.name };
  return term;
}

function logicEachRowCountForWireRef(term, wire, ctx) {
  const shapeFn = typeof globalThis.logicWireShape === 'function' ? globalThis.logicWireShape : null;
  if (!shapeFn) throw Error('logicWireShape is not loaded');
  const shape = shapeFn(wire, ctx);
  if (term.listFlag) {
    if (shape.kind !== 'matrix') throw Error('each list requires matrix wire');
    return shape.rows;
  }
  if (shape.kind === 'vector') return shape.count;
  if (shape.kind === 'matrix') throw Error('each scalar requires vector wire');
  throw Error('each requires vector or matrix wire');
}

function logicEveryCountForWireRef(term, wire, ctx) {
  const shapeFn = typeof globalThis.logicWireShape === 'function' ? globalThis.logicWireShape : null;
  if (!shapeFn) throw Error('logicWireShape is not loaded');
  const shape = shapeFn(wire, ctx);
  if (term.listFlag) {
    if (shape.kind !== 'matrix') throw Error('every list requires matrix wire');
    return shape.rows;
  }
  if (shape.kind === 'vector') return shape.count;
  if (shape.kind === 'matrix') throw Error('every scalar requires vector wire');
  throw Error('every requires vector or matrix wire');
}

function logicMutationTermHasExpandModifiers(term) {
  if (!term) return false;
  if (term.kind === 'wireRef') return !!(term.eachFlag || term.everyFlag);
  if (term.kind === 'compound') {
    return (term.args || []).some(logicMutationTermHasExpandModifiers);
  }
  if (term.kind === 'list') {
    if (term.nil) return false;
    return logicMutationTermHasExpandModifiers(term.head)
      || logicMutationTermHasExpandModifiers(term.tail);
  }
  return false;
}

function logicCartesianProduct(lists) {
  if (!lists.length) return [[]];
  let acc = [[]];
  for (const list of lists) {
    const next = [];
    for (const prefix of acc) {
      for (const item of list) {
        next.push(prefix.concat([item]));
      }
    }
    acc = next;
  }
  return acc;
}

const LOGIC_MUTATION_EXPAND_CAP = 10000;

function logicEnforceMutationExpandCap(items) {
  if ((items || []).length > LOGIC_MUTATION_EXPAND_CAP) {
    throw Error(`every: expansion limit exceeded (${items.length} > ${LOGIC_MUTATION_EXPAND_CAP})`);
  }
  return items;
}

function logicGetEachZipCount(eachRefs, ctx) {
  const counts = [];
  for (const ref of eachRefs) {
    if (!ctx.wires || !ctx.wires.has(ref.wireName)) {
      throw Error(`logic mutation: wire '${ref.wireName}' not found`);
    }
    const wire = ctx.wires.get(ref.wireName);
    counts.push(logicEachRowCountForWireRef(ref, wire, ctx));
  }
  const n = counts[0];
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] !== n) {
      throw Error(`each: row count mismatch (${counts.join(' vs ')})`);
    }
  }
  return n;
}

function logicApplyEachRowToArgs(args, rowIndex) {
  return (args || []).map((a) => {
    if (a && a.kind === 'wireRef' && a.eachFlag) {
      return {
        kind: 'wireRef',
        bindType: a.bindType,
        numberFormat: a.numberFormat || null,
        listFlag: a.listFlag,
        eachFlag: false,
        everyFlag: !!a.everyFlag,
        eachIndex: rowIndex,
        everyIndex: a.everyIndex,
        wireName: a.wireName,
      };
    }
    return logicCloneMutationTerm(a);
  });
}

function logicApplyEveryIndicesToArgs(args, ctx) {
  const everyRefs = (args || []).filter((a) => a && a.kind === 'wireRef' && a.everyFlag);
  if (!everyRefs.length) return [args];
  const indexLists = [];
  for (const ref of everyRefs) {
    if (!ctx.wires || !ctx.wires.has(ref.wireName)) {
      throw Error(`logic mutation: wire '${ref.wireName}' not found`);
    }
    const wire = ctx.wires.get(ref.wireName);
    const count = logicEveryCountForWireRef(ref, wire, ctx);
    if (count <= 0) throw Error('every: collection must have at least 1 element');
    const indices = [];
    for (let i = 0; i < count; i++) indices.push(i);
    indexLists.push(indices);
  }
  const combos = logicCartesianProduct(indexLists);
  const out = [];
  for (const combo of combos) {
    let everySlot = 0;
    const newArgs = (args || []).map((a) => {
      if (a && a.kind === 'wireRef' && a.everyFlag) {
        const idx = combo[everySlot];
        everySlot += 1;
        return {
          kind: 'wireRef',
          bindType: a.bindType,
          numberFormat: a.numberFormat || null,
          listFlag: a.listFlag,
          eachFlag: false,
          everyFlag: false,
          eachIndex: a.eachIndex,
          everyIndex: idx,
          wireName: a.wireName,
        };
      }
      return logicCloneMutationTerm(a);
    });
    out.push(newArgs);
  }
  return out;
}

function logicExpandEachEveryOnCompound(op, compound, ctx, eachRowIndex) {
  let args = compound.args || [];
  const eachRefs = args.filter((a) => a && a.kind === 'wireRef' && a.eachFlag);

  if (eachRefs.length > 0 && eachRowIndex == null) {
    const n = logicGetEachZipCount(eachRefs, ctx);
    if (n <= 0) throw Error('each: row count must be at least 1');
    const out = [];
    for (let row = 0; row < n; row++) {
      const rowArgs = logicApplyEachRowToArgs(args, row);
      const rowCompound = {
        kind: 'compound',
        predicate: compound.predicate,
        arity: rowArgs.length,
        args: rowArgs,
      };
      out.push(...logicExpandEachEveryOnCompound(op, rowCompound, ctx, row));
    }
    return logicEnforceMutationExpandCap(out);
  }

  if (eachRefs.length > 0 && eachRowIndex != null) {
    args = logicApplyEachRowToArgs(args, eachRowIndex);
    compound = {
      kind: 'compound',
      predicate: compound.predicate,
      arity: args.length,
      args,
    };
  }

  const argVariantLists = [];
  let hasInnerExpand = false;
  for (const arg of args) {
    if (arg && arg.kind === 'compound' && logicMutationTermHasExpandModifiers(arg)) {
      const subItems = logicExpandEachEveryOnCompound(op, arg, ctx, eachRowIndex);
      argVariantLists.push(subItems.map((it) => it.head));
      hasInnerExpand = true;
    } else {
      argVariantLists.push([logicCloneMutationTerm(arg)]);
    }
  }

  if (hasInnerExpand) {
    const out = [];
    for (const combo of logicCartesianProduct(argVariantLists)) {
      const c = {
        kind: 'compound',
        predicate: compound.predicate,
        arity: combo.length,
        args: combo,
      };
      out.push(...logicExpandEachEveryOnCompound(op, c, ctx, eachRowIndex));
    }
    return logicEnforceMutationExpandCap(out);
  }

  const everyRefs = args.filter((a) => a && a.kind === 'wireRef' && a.everyFlag);
  if (everyRefs.length > 0) {
    const argLists = logicApplyEveryIndicesToArgs(args, ctx);
    const out = argLists.map((newArgs) => ({
      op,
      head: {
        kind: 'compound',
        predicate: compound.predicate,
        arity: newArgs.length,
        args: newArgs,
      },
    }));
    return logicEnforceMutationExpandCap(out);
  }

  return [{ op, head: compound }];
}

function logicAtomDisplayName(term, table) {
  if (!term || term.kind !== 'atom') return null;
  if (term.name != null) return term.name;
  if (term.id != null && table) return table.name(term.id);
  return null;
}

function logicTermMatchesRetractTemplate(template, factHead, table) {
  if (!template || !factHead) return false;
  if (template.kind !== 'compound' || factHead.kind !== 'compound') return false;
  if (template.predicate !== factHead.predicate) return false;
  const ta = template.args || [];
  const fa = factHead.args || [];
  if (ta.length !== fa.length) return false;
  for (let i = 0; i < ta.length; i++) {
    const tv = ta[i];
    const fv = fa[i];
    if (tv.kind === 'var' && tv.name === '_') continue;
    if (tv.kind === 'atom' || fv.kind === 'atom') {
      if (logicAtomDisplayName(tv, table) !== logicAtomDisplayName(fv, table)) return false;
      continue;
    }
    if (!logicTermsEqualGround(tv, fv)) return false;
  }
  return true;
}

function logicExpandRetractAllOps(template, runtimeClauses, table) {
  const ops = [];
  const seen = new Set();
  for (const c of runtimeClauses || []) {
    if (c.body && c.body.length) continue;
    if (!c.head || c.head.kind !== 'compound') continue;
    if (!logicTermMatchesRetractTemplate(template, c.head, table)) continue;
    const clause = { head: c.head, body: [] };
    const key = logicFactClauseKey(clause);
    if (seen.has(key)) continue;
    seen.add(key);
    ops.push({ op: 'remove', head: c.head });
  }
  return ops;
}

function logicExpandMutationItemsToOps(items, ctx, runtimeClauses, table) {
  const expanded = logicExpandMutationEachOps(items, ctx);
  return expanded || [];
}

function logicApplyMutationOpStep(store, staticClauses, op, options, table) {
  const buildOpts = options || {};
  const applyFn = typeof logicApplyMutationTransaction === 'function'
    ? logicApplyMutationTransaction : null;
  const buildFn = typeof logicBuildRuntimeClauses === 'function' ? logicBuildRuntimeClauses : null;
  if (!applyFn || !buildFn) return { success: false };
  if (op && op.op === 'retract_all') {
    const runtimeClauses = buildFn(staticClauses, store, buildOpts);
    const removes = logicExpandRetractAllOps(op.template, runtimeClauses, table);
    for (const rem of removes) {
      const r = applyFn(store, [rem], { ...buildOpts, staticClauses });
      if (!r || !r.success) return { success: false };
    }
    return { success: true };
  }
  return applyFn(store, [op], { ...buildOpts, staticClauses });
}

function logicExpandMutationGoalToOps(goal, ctx, runtimeClauses, table) {
  if (!goal) return [];
  if (goal.kind === 'mut_add') return [{ op: 'add', head: goal.head }];
  if (goal.kind === 'mut_remove') return [{ op: 'remove', head: goal.head }];
  if (goal.kind === 'mut_retract_all') {
    return logicExpandRetractAllOps(goal.template, runtimeClauses, table);
  }
  if (goal.kind === 'mut_commit') {
    const items = (goal.ops || []).map((op) => {
      if (op.op === 'retract_all') return { op: 'retract_all', template: op.template };
      return { op: op.op, head: op.head };
    });
    return logicExpandMutationItemsToOps(items, ctx, runtimeClauses, table);
  }
  return [];
}

function logicExpandMutationOps(items, ctx, runtimeClauses) {
  if (runtimeClauses) return logicExpandMutationItemsToOps(items, ctx, runtimeClauses);
  return logicExpandMutationEachOps(items, ctx);
}

function logicExpandOneMutationEachItem(item, ctx) {
  const head = item && item.head;
  if (!head || head.kind !== 'compound') return [item];
  if (!logicMutationTermHasExpandModifiers(head)) return [item];
  return logicExpandEachEveryOnCompound(item.op, head, ctx, null);
}

function logicExpandMutationEachOps(items, ctx) {
  const out = [];
  for (const item of items || []) {
    out.push(...logicExpandOneMutationEachItem(item, ctx));
  }
  return out;
}

function logicExecuteMutationOps(params) {
  const p = params || {};
  const store = p.store;
  const staticClauses = p.staticClauses || [];
  const constraints = p.constraints || [];
  const buildOpts = p.buildOpts || {};
  const execOpts = p.execOpts || {};
  const ops = p.ops || [];
  const atomic = !!p.atomic;
  const applyOpts = { ...buildOpts, staticClauses, table: p.table };
  const applyFn = typeof logicApplyMutationTransaction === 'function'
    ? logicApplyMutationTransaction : null;
  const simFn = typeof logicSimulateMutationStore === 'function'
    ? logicSimulateMutationStore : null;
  const buildFn = typeof logicBuildRuntimeClauses === 'function' ? logicBuildRuntimeClauses : null;
  const validateFactsFn = typeof logicValidateConstraintsForFacts === 'function'
    ? logicValidateConstraintsForFacts : null;
  const deltaFn = typeof logicMutationDeltaPlusFacts === 'function'
    ? logicMutationDeltaPlusFacts : null;
  const simCheckFn = typeof logicSimulateCheckTransaction === 'function'
    ? logicSimulateCheckTransaction : null;
  if (!applyFn || !buildFn) return { ok: false, code: 'engine' };

  for (const op of ops) {
    if (!op) return { ok: false, code: 'ground' };
    if (op.op === 'add' || op.op === 'remove') {
      if (!op.head || !logicTermIsGround(op.head)) return { ok: false, code: 'ground' };
    } else if (op.op === 'retract_all') {
      if (!op.template) return { ok: false, code: 'expand' };
    } else {
      return { ok: false, code: 'expand' };
    }
  }

  if (atomic) {
    if (simCheckFn && constraints.length) {
      const check = simCheckFn(staticClauses, store, ops, constraints, { ...applyOpts, execOpts });
      if (!check || !check.pass) return { ok: false, code: 'constraint' };
    }
    for (const op of ops) {
      const result = logicApplyMutationOpStep(store, staticClauses, op, applyOpts, p.table);
      if (!result || !result.success) return { ok: false, code: 'store' };
    }
    return {
      ok: true,
      ops,
      runtimeClauses: buildFn(staticClauses, store, buildOpts),
    };
  }

  for (const op of ops) {
    const batch = [op];
    if (op && op.op !== 'retract_all') {
      if (constraints.length && simCheckFn) {
        const check = simCheckFn(staticClauses, store, batch, constraints, { ...applyOpts, execOpts });
        if (!check || !check.pass) return { ok: false, code: 'constraint' };
      } else if (constraints.length && simFn && validateFactsFn && deltaFn) {
        const proposedStore = simFn(store, batch, applyOpts);
        if (!proposedStore) return { ok: false, code: 'store' };
        const proposedClauses = buildFn(staticClauses, proposedStore, buildOpts);
        const deltaFacts = deltaFn(batch);
        const vResult = validateFactsFn(constraints, proposedClauses, deltaFacts, execOpts);
        if (!vResult.ok) return { ok: false, code: 'constraint' };
      }
    }
    const result = logicApplyMutationOpStep(store, staticClauses, op, applyOpts, p.table);
    if (!result || !result.success) return { ok: false, code: 'store' };
  }
  return {
    ok: true,
    ops,
    runtimeClauses: buildFn(staticClauses, store, buildOpts),
  };
}

function logicWireRowToListTerm(bits, matrixShape, rowIndex, bindType, fillBits, numberFormat) {
  const cols = matrixShape.cols;
  const ew = matrixShape.ew;
  const rowBits = bits.substr(rowIndex * cols * ew, cols * ew);
  const virtualShape = { kind: 'vector', count: cols, ew };
  return logicWireBitsToListTerm(rowBits, bindType, fillBits, virtualShape, numberFormat);
}

function logicWireBitsToListTerm(bits, bindType, fillBits, vectorShape, numberFormat) {
  const layout = logicResolveListWireLayout(bits.length, bindType, vectorShape, numberFormat);
  let listFmt = null;
  if (bindType === 'float') {
    listFmt = typeof logicEffectiveListFloatFormat === 'function'
      ? logicEffectiveListFloatFormat(numberFormat, vectorShape)
      : (vectorShape && vectorShape.kind === 'vector' ? numberFormat : numberFormat);
  } else {
    listFmt = typeof logicEffectiveListNumberFormat === 'function'
      ? logicEffectiveListNumberFormat(numberFormat, vectorShape)
      : (vectorShape && vectorShape.kind === 'vector' ? numberFormat : null);
  }
  const elements = [];
  for (let i = 0; i < layout.slotCount; i++) {
    const cell = bits.substr(i * layout.elementWidth, layout.elementWidth);
    if (logicIsListSlotFill(cell, bindType, fillBits)) continue;
    const el = logicDecodeListSlot(cell, bindType, listFmt);
    if (el == null) continue;
    elements.push(el);
  }
  if (elements.length === 0) {
    throw Error(`${bindType} list cannot contain 0 elements`);
  }
  return logicArrayToPrologList(elements);
}

function logicEncodeListToVectorBits(term, bindType, elementCount, elementWidth, fillBits, numberFormat) {
  const elements = term && term.kind === 'list' ? logicPrologListToArray(term) : [];
  const truncated = elements.slice(0, elementCount);
  const cells = [];
  for (let i = 0; i < elementCount; i++) {
    if (i < truncated.length) {
      cells.push(logicEncodeSolutionTerm(truncated[i], elementWidth, numberFormat));
    } else {
      cells.push(fillBits);
    }
  }
  return cells.join('');
}

function logicListBindTypeFromTerm(term) {
  if (!term || term.kind !== 'list' || term.nil) return 'text';
  let cur = term;
  while (cur && cur.kind === 'list' && !cur.nil) {
    const h = cur.head;
    if (h && h.kind === 'number') return 'number';
    if (h && h.kind === 'float') return 'float';
    if (h && h.kind === 'atom') return 'text';
    cur = cur.tail;
  }
  return 'text';
}

function logicEncodeInlineQueryResult(solutions, freeVars, shape, fillBits, scalarWidth, columnSelect, outputHints, argVarSlots) {
  if (!freeVars || freeVars.length === 0) {
    const val = solutions && solutions.length > 0 ? 1 : 0;
    const w = shape && shape.kind === 'scalar' ? (scalarWidth || shape.ew || 1) : 1;
    return logicNumberToBits(val, w);
  }
  let packVars = freeVars;
  if (columnSelect) {
    packVars = logicPackVarsFromColumnSelect(columnSelect, argVarSlots, freeVars);
    if (columnSelect.length === 1 && shape && shape.kind === 'matrix') {
      throw Error('logic query: sel(i) requires vector wire LHS');
    }
    if (columnSelect.length === 2 && shape && shape.kind === 'vector') {
      throw Error('logic query: sel(i,j) requires matrix wire LHS');
    }
  } else if (shape && shape.kind === 'matrix' && freeVars.length > 2) {
    throw Error(`logic query: matrix result requires ;sel(i,j) when ${freeVars.length} output variables`);
  }
  if (packVars.length === 1 && shape && shape.kind === 'vector') {
    const hint = outputHints && outputHints[packVars[0]];
    if (!hint) {
      throw Error(`query output requires explicit type for '${packVars[0]}'`);
    }
    if (hint.listFlag && solutions && solutions.length > 0) {
      const listFmt = hint.bindType === 'float'
        ? (typeof logicEffectiveListFloatFormat === 'function'
          ? logicEffectiveListFloatFormat(hint.numberFormat, shape)
          : hint.numberFormat)
        : (typeof logicEffectiveListNumberFormat === 'function'
          ? logicEffectiveListNumberFormat(hint.numberFormat, shape)
          : hint.numberFormat);
      return logicEncodeListToVectorBits(
        solutions[0][packVars[0]], hint.bindType, shape.count, shape.ew, fillBits, listFmt,
      );
    }
    if (hint.listFlag) {
      return fillBits.repeat(shape.count);
    }
    return logicPackVectorSolutions(
      solutions, packVars, shape.count, shape.ew, fillBits, hint.numberFormat,
    );
  }
  if (packVars.length === 2 && shape && shape.kind === 'matrix') {
    if (outputHints) {
      for (const v of packVars) {
        if (!outputHints[v]) {
          throw Error(`query output requires explicit type for '${v}'`);
        }
      }
    }
    return logicPackMatrixSolutions(
      solutions, packVars, shape.rows, shape.cols, shape.ew, fillBits,
    );
  }
  if (packVars.length >= 1 && solutions && solutions.length > 0) {
    const hint = outputHints && outputHints[packVars[0]];
    if (!hint) {
      throw Error(`query output requires explicit type for '${packVars[0]}'`);
    }
    const w = scalarWidth || (shape && shape.ew) || 8;
    const term = solutions[0][packVars[0]];
    if (hint.listFlag) {
      const layout = logicResolveListWireLayout(w, hint.bindType, shape, hint.numberFormat);
      const listFmt = hint.bindType === 'float'
        ? (typeof logicEffectiveListFloatFormat === 'function'
          ? logicEffectiveListFloatFormat(hint.numberFormat, shape)
          : hint.numberFormat)
        : (typeof logicEffectiveListNumberFormat === 'function'
          ? logicEffectiveListNumberFormat(hint.numberFormat, shape)
          : hint.numberFormat);
      return logicEncodeListToVectorBits(
        term, hint.bindType, layout.slotCount, layout.elementWidth, fillBits, listFmt,
      );
    }
    return logicTermToWireValue(term, w, hint.bindType, hint.numberFormat);
  }
  if (shape && shape.kind === 'vector') {
    return fillBits.repeat(shape.count);
  }
  if (shape && shape.kind === 'matrix') {
    return fillBits.repeat(shape.rows * shape.cols);
  }
  return logicNumberToBits(0, scalarWidth || (shape && shape.ew) || 1);
}

function logicAtomToAsciiBits(name, width) {
  let bits = '';
  const s = name != null ? String(name) : '';
  for (let i = 0; i < s.length; i++) {
    bits += s.charCodeAt(i).toString(2).padStart(8, '0');
  }
  if (bits.length < width) bits = bits.padEnd(width, '0');
  else if (bits.length > width) bits = bits.slice(0, width);
  return bits;
}

function logicNumberToBits(n, width) {
  let v = n;
  if (v == null || isNaN(v)) v = 0;
  if (v < 0) v = (1 << width) + v;
  return (v >>> 0).toString(2).padStart(width, '0').slice(-width);
}

function logicEncodeSolutionTerm(term, elementWidth, numberFormat, bindType) {
  if (!term) return '0'.repeat(elementWidth);
  if (term.kind === 'number') {
    const encFn = typeof logicEncodeNumberValue === 'function' ? logicEncodeNumberValue : null;
    return encFn ? encFn(term.value, elementWidth, numberFormat) : logicNumberToBits(term.value, elementWidth);
  }
  if (term.kind === 'float') {
    const encFn = typeof logicEncodeFloatValue === 'function' ? logicEncodeFloatValue : null;
    return encFn ? encFn(term.value, elementWidth, numberFormat) : logicNumberToBits(term.value, elementWidth);
  }
  if (term.kind === 'atom') return logicAtomToAsciiBits(term.name, elementWidth);
  if (term.kind === 'list') {
    const bt = logicListBindTypeFromTerm(term);
    const ew = logicListPackedElementWidth(bt);
    const arr = logicPrologListToArray(term);
    if (arr.length > 0) return logicEncodeSolutionTerm(arr[0], elementWidth, numberFormat);
    return '0'.repeat(elementWidth);
  }
  return '0'.repeat(elementWidth);
}

function logicGetElementFill(wire, ctx) {
  if (wire && wire.logicElementFill) return wire.logicElementFill;
  const ew = (wire && wire.tensor && wire.tensor.elementWidth)
    || (wire && wire.vector && wire.vector.elementWidth)
    || (ctx && wire && ctx.getBitWidth(wire.type))
    || 8;
  return '0'.repeat(ew);
}

function logicPackVectorSolutions(solutions, freeVars, elementCount, elementWidth, fillBits, numberFormat) {
  const cells = [];
  const k = Math.min(solutions.length, elementCount);
  for (let i = 0; i < elementCount; i++) {
    if (i < k && freeVars.length >= 1) {
      cells.push(logicEncodeSolutionTerm(solutions[i][freeVars[0]], elementWidth, numberFormat));
    } else {
      cells.push(fillBits);
    }
  }
  return cells.join('');
}

function logicPackMatrixSolutions(solutions, freeVars, rows, cols, elementWidth, fillBits) {
  const k = Math.min(solutions.length, rows);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < k && freeVars[c]) {
        cells.push(logicEncodeSolutionTerm(solutions[r][freeVars[c]], elementWidth));
      } else {
        cells.push(fillBits);
      }
    }
  }
  return cells.join('');
}

function logicPackMatrixRow(solutions, freeVars, rowIndex, cols, elementWidth, fillBits) {
  let bits = '';
  if (rowIndex >= solutions.length) {
    return fillBits.repeat(cols);
  }
  const sol = solutions[rowIndex];
  for (let c = 0; c < cols; c++) {
    bits += logicEncodeSolutionTerm(sol[freeVars[c]], elementWidth);
  }
  return bits;
}

function logicPackMatrixCol(solutions, freeVars, colIndex, maxRows, elementWidth, fillBits) {
  const k = Math.min(solutions.length, maxRows);
  let bits = '';
  for (let r = 0; r < maxRows; r++) {
    if (r < k) {
      bits += logicEncodeSolutionTerm(solutions[r][freeVars[colIndex]], elementWidth);
    } else {
      bits += fillBits;
    }
  }
  return bits;
}

function logicTermToWireValue(term, width, bindType, numberFormat) {
  if (bindType === 'bool') {
    if (term.kind === 'number') return term.value !== 0 ? '1' : '0';
    return '0';
  }
  if (bindType === 'text' || (term && term.kind === 'atom')) {
    let s = '';
    if (term.kind === 'atom') s = term.name;
    else if (term.kind === 'number') s = String(term.value);
    return logicAtomToAsciiBits(s, width);
  }
  if (bindType === 'number' || !bindType) {
    if (term.kind === 'number') {
      const encFn = typeof logicEncodeNumberValue === 'function' ? logicEncodeNumberValue : null;
      return encFn ? encFn(term.value, width, numberFormat) : logicNumberToBits(term.value, width);
    }
    if (term.kind === 'atom') return logicAtomToAsciiBits(term.name, width);
    return '0'.repeat(width);
  }
  if (bindType === 'float') {
    if (term.kind === 'float') {
      const encFn = typeof logicEncodeFloatValue === 'function' ? logicEncodeFloatValue : null;
      return encFn ? encFn(term.value, width, numberFormat) : logicNumberToBits(term.value, width);
    }
    if (term.kind === 'atom') return logicAtomToAsciiBits(term.name, width);
    return '0'.repeat(width);
  }
  return '0'.repeat(width);
}

function logicPinToInputValue(bits, bindType, numberFormat) {
  const width = bits.length;
  if (bindType === 'bool') {
    return { kind: 'number', value: bits[bits.length - 1] === '1' ? 1 : 0 };
  }
  if (bindType === 'text') {
    let s = '';
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const byte = parseInt(bits.substr(i, 8), 2);
      if (byte === 0) break;
      s += String.fromCharCode(byte);
    }
    if (!s) return { kind: 'atom', name: '' };
    return { kind: 'atom', name: s };
  }
  if (bindType === 'float') {
    const decodeFn = typeof logicDecodeFloatBits === 'function' ? logicDecodeFloatBits : null;
    let v = decodeFn ? decodeFn(bits, numberFormat) : 0;
    if (v == null || isNaN(v)) v = 0;
    return { kind: 'float', value: v };
  }
  const decodeFn = typeof logicDecodeNumberBits === 'function' ? logicDecodeNumberBits : null;
  let n = decodeFn ? decodeFn(bits, numberFormat) : parseInt(bits, 2);
  if (isNaN(n)) n = 0;
  return { kind: 'number', value: n };
}

if (typeof globalThis !== 'undefined') {
  globalThis.executeLogicQueries = executeLogicQueries;
  globalThis.executeLogicGoals = executeLogicGoals;
  globalThis.logicPrepareGoalsForInvoke = logicPrepareGoalsForInvoke;
  globalThis.logicOutputFreeVars = logicOutputFreeVars;
  globalThis.logicInferBindType = logicInferBindType;
  globalThis.logicEncodeInlineQueryResult = logicEncodeInlineQueryResult;
  globalThis.LogicEngine = LogicEngine;
  globalThis.logicTermToWireValue = logicTermToWireValue;
  globalThis.logicPinToInputValue = logicPinToInputValue;
  globalThis.logicEncodeSolutionTerm = logicEncodeSolutionTerm;
  globalThis.logicGetElementFill = logicGetElementFill;
  globalThis.logicPackVectorSolutions = logicPackVectorSolutions;
  globalThis.logicPackMatrixSolutions = logicPackMatrixSolutions;
  globalThis.logicPackMatrixRow = logicPackMatrixRow;
  globalThis.logicWireBitsToListTerm = logicWireBitsToListTerm;
  globalThis.logicWireRowToListTerm = logicWireRowToListTerm;
  globalThis.logicCloneMutationTerm = logicCloneMutationTerm;
  globalThis.logicEachRowCountForWireRef = logicEachRowCountForWireRef;
  globalThis.logicExpandMutationEachOps = logicExpandMutationEachOps;
  globalThis.logicExpandMutationOps = logicExpandMutationOps;
  globalThis.logicExpandRetractAllOps = logicExpandRetractAllOps;
  globalThis.logicExpandMutationGoalToOps = logicExpandMutationGoalToOps;
  globalThis.logicApplyMutationOpStep = logicApplyMutationOpStep;
  globalThis.logicExpandMutationItemsToOps = logicExpandMutationItemsToOps;
  globalThis.logicExecuteMutationOps = logicExecuteMutationOps;
  globalThis.logicTermMatchesRetractTemplate = logicTermMatchesRetractTemplate;
  globalThis.logicExpandOneMutationEachItem = logicExpandOneMutationEachItem;
  globalThis.logicEncodeListToVectorBits = logicEncodeListToVectorBits;
  globalThis.logicListBindTypeFromTerm = logicListBindTypeFromTerm;
  globalThis.logicResolveListWireLayout = logicResolveListWireLayout;
  globalThis.logicPrologListToArray = logicPrologListToArray;
  globalThis.LOGIC_MAX_QUERY_VARS = LOGIC_MAX_QUERY_VARS;
  globalThis.logicValidateQueryVarCount = logicValidateQueryVarCount;
  globalThis.logicValidateColumnSelect = logicValidateColumnSelect;
  globalThis.logicValidateSelAnonymous = logicValidateSelAnonymous;
  globalThis.logicCallArgVarSlots = logicCallArgVarSlots;
  globalThis.logicSelArgCount = logicSelArgCount;
  globalThis.logicPackVarsFromColumnSelect = logicPackVarsFromColumnSelect;
  globalThis.logicPackVarsFromSelect = logicPackVarsFromSelect;
  globalThis.logicResolveMatrixPackVars = logicResolveMatrixPackVars;
  globalThis.logicPolicyVarsForRedirect = logicPolicyVarsForRedirect;
  globalThis.logicApplyResultPolicy = logicApplyResultPolicy;
  globalThis.logicSolutionTupleKey = logicSolutionTupleKey;
  globalThis.logicBuildFactIndex = logicBuildFactIndex;
  globalThis.logicApplyFactIndexDelta = logicApplyFactIndexDelta;
  globalThis.logicVerifyFactIndex = logicVerifyFactIndex;
  globalThis.logicCollectRuleClauses = logicCollectRuleClauses;
  globalThis.logicFactIndexRemove = logicFactIndexRemove;
  globalThis.logicFactIndexAdd = logicFactIndexAdd;
  globalThis.logicCreateDynamicStore = logicCreateDynamicStore;
  globalThis.logicBuildRuntimeClauses = logicBuildRuntimeClauses;
  globalThis.logicSeedDynamicStore = logicSeedDynamicStore;
  globalThis.logicApplyMutationTransaction = logicApplyMutationTransaction;
  globalThis.logicCloneDynamicStore = logicCloneDynamicStore;
  globalThis.logicSimulateMutationStore = logicSimulateMutationStore;
  globalThis.logicSimulateCheckTransaction = logicSimulateCheckTransaction;
  globalThis.logicValidateStaticKnowledge = logicValidateStaticKnowledge;
  globalThis.logicValidateConstraintsForFacts = logicValidateConstraintsForFacts;
  globalThis.logicFormatFactForTrace = logicFormatFactForTrace;
  globalThis.logicFormatMutationOpForTrace = logicFormatMutationOpForTrace;
  globalThis.logicFormatMutationTryBlock = logicFormatMutationTryBlock;
  globalThis.logicCountMutationNetOps = logicCountMutationNetOps;
  globalThis.logicFormatMutRollbackLine = logicFormatMutRollbackLine;
  globalThis.logicMutationDeltaPlusFacts = logicMutationDeltaPlusFacts;
  globalThis.logicCollectStaticGroundFacts = logicCollectStaticGroundFacts;
  globalThis.logicFactClauseKey = logicFactClauseKey;
  globalThis.logicPredicateUniqueKind = logicPredicateUniqueKind;
  globalThis.logicUniqueSlotKeyFromHead = logicUniqueSlotKeyFromHead;
  globalThis.logicNormalizeUniqueClauses = logicNormalizeUniqueClauses;
  globalThis.logicTermIsGround = logicTermIsGround;
  globalThis.logicTermsEqualGround = logicTermsEqualGround;
  globalThis.logicBindConstraintHead = logicBindConstraintHead;
  globalThis.logicSetRandomSeed = logicSetRandomSeed;
  globalThis.logicNormalizeRandomSeed = logicNormalizeRandomSeed;
  globalThis.logicNormalizeRandomInt = logicNormalizeRandomInt;
  globalThis.LOGIC_RANDOM_SEED_MAX = LOGIC_RANDOM_SEED_MAX;
  globalThis.LOGIC_RANDOM_INT_MIN = LOGIC_RANDOM_INT_MIN;
  globalThis.LOGIC_RANDOM_INT_MAX = LOGIC_RANDOM_INT_MAX;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    executeLogicQueries,
    executeLogicGoals,
    logicPrepareGoalsForInvoke,
    logicOutputFreeVars,
    logicInferBindType,
    logicEncodeInlineQueryResult,
    LogicEngine,
    logicTermToWireValue,
    logicPinToInputValue,
    logicEncodeSolutionTerm,
    logicGetElementFill,
    logicPackVectorSolutions,
    logicPackMatrixSolutions,
    logicPackMatrixRow,
    logicPackMatrixCol,
    logicWireBitsToListTerm,
    logicEncodeListToVectorBits,
    logicListBindTypeFromTerm,
    logicResolveListWireLayout,
    logicPrologListToArray,
    logicApplyResultPolicy,
    logicPolicyVarsForRedirect,
    logicResolveMatrixPackVars,
    logicValidateColumnSelect,
    logicValidateQueryVarCount,
    logicPackVarsFromSelect,
    LOGIC_MAX_QUERY_VARS,
    logicSolutionTupleKey,
    logicBuildFactIndex,
    logicApplyFactIndexDelta,
    logicVerifyFactIndex,
    logicCollectRuleClauses,
    logicFactIndexRemove,
    logicFactIndexAdd,
    logicCreateDynamicStore,
    logicBuildRuntimeClauses,
    logicSeedDynamicStore,
    logicApplyMutationTransaction,
    logicCloneDynamicStore,
    logicSimulateMutationStore,
    logicSimulateCheckTransaction,
    logicValidateStaticKnowledge,
    logicValidateConstraintsForFacts,
    logicFormatFactForTrace,
    logicFormatMutationOpForTrace,
    logicFormatMutationTryBlock,
    logicCountMutationNetOps,
    logicFormatMutRollbackLine,
    logicMutationDeltaPlusFacts,
    logicCollectStaticGroundFacts,
    logicFactClauseKey,
    logicPredicateUniqueKind,
    logicUniqueSlotKeyFromHead,
    logicNormalizeUniqueClauses,
    logicTermIsGround,
    logicSetRandomSeed,
    logicNormalizeRandomSeed,
    logicNormalizeRandomInt,
    LOGIC_RANDOM_SEED_MAX,
    LOGIC_RANDOM_INT_MIN,
    LOGIC_RANDOM_INT_MAX,
  };
}
