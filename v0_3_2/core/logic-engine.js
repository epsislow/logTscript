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
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicInternTerm(term.left, table),
      right: logicInternTerm(term.right, table),
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

  executeQueries(queries, inputEnv) {
    this.truncated = false;
    this.depthExceeded = false;
    const out = {};
    for (const q of queries || []) {
      const goals = logicEngineQueryGoals(q);
      out[q.name] = this.solveQuery(goals, inputEnv || {});
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
      return this._solveNth(g0, rest, env, depth, onSuccess, onDepthExceeded, false);
    }
    if (g0.kind === 'call' && g0.predicate === 'nth1' && g0.arity === 3) {
      return this._solveNth(g0, rest, env, depth, onSuccess, onDepthExceeded, true);
    }
    if (g0.kind === 'call' && g0.predicate === 'is' && g0.arity === 2) {
      return this._solveIs(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'member' && g0.arity === 2) {
      return this._solveMember(g0.args[0], g0.args[1], rest, env, depth, onSuccess, onDepthExceeded);
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
    if (g0.kind === 'call' && g0.predicate === 'list' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'list', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'compound' && g0.arity === 1) {
      return this._solveTypePred(g0.args[0], 'compound', rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'random_between' && g0.arity === 3) {
      return this._solveRandomBetween(g0.args[0], g0.args[1], g0.args[2], g0, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (g0.kind === 'call' && g0.predicate === 'set_random' && g0.arity === 1) {
      return this._solveSetRandom(g0.args[0], rest, env, depth, onSuccess, onDepthExceeded);
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
    const val = logicEvalNumber(right, env, this.table);
    if (val == null) return false;
    const ld = logicDeref(left, env);
    if (ld.kind === 'var') {
      if (ld.name !== '_') env.bind(ld.name, { kind: 'number', value: val });
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (ld.kind === 'number') {
      if (ld.value !== val) return false;
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

  _solveRandomBetween(lowTerm, highTerm, intTerm, goalRef, rest, env, depth, onSuccess, onDepthExceeded) {
    const lowD = logicDeref(lowTerm, env);
    const highD = logicDeref(highTerm, env);
    if (lowD.kind !== 'number' || highD.kind !== 'number') return false;
    const lowVal = logicNormalizeRandomInt(lowD.value);
    const highVal = logicNormalizeRandomInt(highD.value);
    if (lowVal == null || highVal == null || lowVal > highVal) return false;

    if (!env.impureRandom) env.impureRandom = new Map();
    const cp = env.choiceDepth();
    let slot = env.impureRandom.get(goalRef);
    if (!slot || cp < slot.cp) {
      slot = { cp, value: null };
      env.impureRandom.set(goalRef, slot);
    }

    const intD = logicDeref(intTerm, env);
    if (intD.kind === 'var') {
      if (slot.value == null) {
        slot.value = logicRandomIntBetween(lowVal, highVal);
        if (slot.value == null) return false;
      }
      if (intD.name !== '_') env.bind(intD.name, { kind: 'number', value: slot.value });
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    if (intD.kind === 'number') {
      if (slot.value == null) {
        if (intD.value < lowVal || intD.value > highVal) return false;
        slot.value = intD.value;
      } else if (intD.value !== slot.value) {
        return false;
      }
      return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
    }
    return false;
  }

  _solveNth(goal, rest, env, depth, onSuccess, onDepthExceeded, oneBased) {
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
      return this._solveNthGroundIndex(idx, listTerm, listD, elemTerm, rest, env, depth, onSuccess, onDepthExceeded);
    }
    if (listD.kind === 'var') return false;
    return this._solveNthVarIndex(iTerm, listD, elemTerm, rest, env, depth, onSuccess, onDepthExceeded, oneBased);
  }

  _solveNthGroundIndex(idx, listTerm, listD, elemTerm, rest, env, depth, onSuccess, onDepthExceeded) {
    if (listD.kind === 'var') {
      if (idx !== 0) return false;
      const trail = env.trailLength();
      const cons = { kind: 'list', head: elemTerm, tail: { kind: 'var', name: '_' } };
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
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _solveNthVarIndex(iTerm, listD, elemTerm, rest, env, depth, onSuccess, onDepthExceeded, oneBased) {
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

  _solveCall(goal, rest, env, depth, onSuccess, onDepthExceeded) {
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

      const ok = this._solveGoals(newGoals, env, depth + 1, onSuccess, onDepthExceeded);

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
    return this._memberWalk(elem, list, cont, env);
  }

  _solveTypePred(term, expectedKind, rest, env, depth, onSuccess, onDepthExceeded) {
    const d = logicDeref(term, env);
    if (!d || d.kind === 'var') return false;
    if (expectedKind === 'compound') {
      if (d.kind !== 'compound') return false;
    } else if (d.kind !== expectedKind) {
      return false;
    }
    return this._solveGoals(rest, env, depth + 1, onSuccess, onDepthExceeded);
  }

  _memberWalk(elem, list, cont, env) {
    const ld = logicDeref(list, env);
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
    if (this._memberWalk(elem, ld.tail, cont, env)) any = true;
    return any;
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
  if (a.kind === 'atom' && b.kind === 'atom') return a.id === b.id;
  if (a.kind === 'compound' && b.kind === 'compound') {
    if (a.predicate !== b.predicate || a.arity !== b.arity) return false;
    for (let i = 0; i < a.arity; i++) {
      if (!logicUnify(a.args[i], b.args[i], env, table)) return false;
    }
    return true;
  }
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
  if (d.kind === 'list') {
    if (d.nil) return false;
    return logicOccurs(name, d.head, env) || logicOccurs(name, d.tail, env);
  }
  return false;
}

function logicListIsNil(term) {
  return term && term.kind === 'list' && term.nil === true;
}

function logicTermTypeRank(term) {
  if (!term) return -1;
  if (term.kind === 'number') return 0;
  if (term.kind === 'atom') return 1;
  if (term.kind === 'list') return 2;
  if (term.kind === 'compound') return 3;
  return -1;
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
    const na = table.name(da.id);
    const nb = table.name(db.id);
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

function logicReverseGroundList(listD, env) {
  const elems = logicGroundListToArray(listD, env);
  if (elems == null) return null;
  elems.reverse();
  return logicArrayToList(elems);
}

function logicEvalNumber(term, env, table) {
  const d = logicDeref(term, env);
  if (d.kind === 'number') return d.value;
  if (d.kind === 'arith') {
    const l = logicEvalNumber(d.left, env, table);
    const r = logicEvalNumber(d.right, env, table);
    if (l == null || r == null) return null;
    switch (d.op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/': return r === 0 ? null : Math.trunc(l / r);
      default: return null;
    }
  }
  if (d.kind === 'var') return null;
  return null;
}

function logicUnifyExpr(left, right, env, table) {
  const ln = logicEvalNumber(left, env, table);
  const rn = logicEvalNumber(right, env, table);
  if (ln != null && rn != null) return ln === rn;
  return logicUnify(left, right, env, table);
}

function logicEvalCmp(goal, env, table) {
  const ln = logicEvalNumber(goal.left, env, table);
  const rn = logicEvalNumber(goal.right, env, table);
  if (ln == null || rn == null) return false;
  switch (goal.op) {
    case '>=': return ln >= rn;
    case '=<': return ln <= rn;
    case '>': return ln > rn;
    case '<': return ln < rn;
    case '=:=': return ln === rn;
    case '=\\=': return ln !== rn;
    default: return false;
  }
}

function logicResolveTerm(term, env, table) {
  const d = logicDeref(term, env);
  if (d.kind === 'number') return { kind: 'number', value: d.value };
  if (d.kind === 'atom') {
    const r = { kind: 'atom', name: table.name(d.id) };
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
    } else if (t.kind === 'arith') { walkTerm(t.left); walkTerm(t.right); }
  }
  function walkGoal(g) {
    if (!g) return;
    if (g.kind === 'not') walkGoal(g.goal);
    else if (g.kind === 'call' || g.kind === 'compound') {
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
  const engine = opts.factIndex
    ? new LogicEngine(mergedDef.clauses || [], { factIndex: opts.factIndex, ruleClauses: opts.ruleClauses })
    : new LogicEngine(mergedDef.clauses || []);
  if (opts.maxSolutions != null) engine.maxSolutions = opts.maxSolutions;
  if (opts.maxDepth != null) engine.maxDepth = opts.maxDepth;
  if (opts.onShowLine) engine.onShowLine = opts.onShowLine;
  const out = engine.executeQueries(queries, inputEnv);
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
    if (g.kind === 'call' || g.kind === 'compound') {
      return { kind: 'call', predicate: g.predicate, args: (g.args || []).map(mapTerm) };
    }
    if (g.kind === 'cmp') {
      return { kind: 'cmp', op: g.op, left: mapTerm(g.left), right: mapTerm(g.right) };
    }
    if (g.kind === 'unify') {
      return { kind: 'unify', left: mapTerm(g.left), right: mapTerm(g.right) };
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

const LOGIC_MAX_QUERY_VARS = 16;

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

function logicGroundTermKey(term) {
  if (!term) return '';
  if (term.kind === 'atom') return `a:${term.name != null ? term.name : ''}`;
  if (term.kind === 'number') return `n:${term.value}`;
  if (term.kind === 'var') return `v:${term.name}`;
  if (term.kind === 'compound') {
    const args = (term.args || []).map(logicGroundTermKey).join('\1');
    const arity = term.arity != null ? term.arity : (term.args || []).length;
    return `c:${term.predicate}/${arity}:${args}`;
  }
  if (term.kind === 'list') {
    if (logicListIsNil(term)) return 'l:[]';
    return `l:${logicGroundTermKey(term.head)}${'\x01'}${logicGroundTermKey(term.tail)}`;
  }
  return '?';
}

function logicFactClauseKey(clause) {
  const head = clause && clause.head;
  if (!head || head.kind !== 'compound') return logicGroundTermKey(head);
  const arity = head.arity != null ? head.arity : (head.args || []).length;
  const args = (head.args || []).map(logicGroundTermKey).join('\0');
  return `${head.predicate}/${arity}\0${args}`;
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
  if (term.kind === 'arith') return logicTermIsGround(term.left) && logicTermIsGround(term.right);
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

function logicApplyMutationTransaction(store, ops, options) {
  if (!store) return { success: false };
  const mode = (options && options.dataMode) || 'overlay';
  for (const op of ops || []) {
    if (!op || !op.head || !logicTermIsGround(op.head)) return { success: false };
  }
  const nextAdds = new Map(store.adds);
  const nextTombs = new Set(store.tombstones);
  for (const op of ops || []) {
    const clause = { head: op.head, body: [] };
    const key = logicFactClauseKey(clause);
    if (op.op === 'add') {
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
  const result = logicApplyMutationTransaction(sim, ops, options);
  if (!result || !result.success) return null;
  return sim;
}

function logicSimulateCheckTransaction(staticClauses, store, ops, constraints, options) {
  const opts = options || {};
  const buildOpts = opts.dataMode ? { dataMode: opts.dataMode } : undefined;
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
  return '?';
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
  for (const op of ops || []) {
    if (logicMutationOpIsNet(sim, op, options)) net++;
    logicApplyMutationTransaction(sim, [op], options);
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
  const engine = opts.factIndex
    ? new LogicEngine(mergedDef.clauses || [], { factIndex: opts.factIndex, ruleClauses: opts.ruleClauses })
    : new LogicEngine(mergedDef.clauses || []);
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

function logicListPackedElementWidth(bindType) {
  if (bindType === 'bool') return 1;
  if (bindType === 'text') return 8;
  if (bindType === 'number') return 16;
  return 8;
}

function logicResolveListWireLayout(totalBits, bindType, vectorShape) {
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
  const ew = logicListPackedElementWidth(bindType);
  if (bindType === 'text' && totalBits % 8 !== 0) {
    throw Error('text list expects vector or width multiple of 8');
  }
  if (bindType === 'number' && totalBits % 16 !== 0) {
    throw Error('number list expects vector or width multiple of 16');
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
  if (bindType === 'text' || bindType === 'number') {
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

function logicDecodeListSlot(cellBits, bindType) {
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
    let n = parseInt(cellBits, 2);
    if (isNaN(n)) n = 0;
    return { kind: 'number', value: n };
  }
  return null;
}

function logicCloneMutationTerm(term) {
  if (!term) return term;
  if (term.kind === 'wireRef') {
    return {
      kind: 'wireRef',
      bindType: term.bindType,
      listFlag: !!term.listFlag,
      eachFlag: !!term.eachFlag,
      eachIndex: term.eachIndex,
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

function logicWireRowToListTerm(bits, matrixShape, rowIndex, bindType, fillBits) {
  const cols = matrixShape.cols;
  const ew = matrixShape.ew;
  const rowBits = bits.substr(rowIndex * cols * ew, cols * ew);
  const virtualShape = { kind: 'vector', count: cols, ew };
  return logicWireBitsToListTerm(rowBits, bindType, fillBits, virtualShape);
}

function logicExpandOneMutationEachItem(item, ctx) {
  const head = item && item.head;
  if (!head || head.kind !== 'compound') return [item];
  const args = head.args || [];
  const eachRefs = args.filter((a) => a && a.kind === 'wireRef' && a.eachFlag);
  if (!eachRefs.length) return [item];

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
  if (n <= 0) throw Error('each: row count must be at least 1');

  const out = [];
  for (let row = 0; row < n; row++) {
    const newArgs = args.map((a) => {
      if (a && a.kind === 'wireRef' && a.eachFlag) {
        return {
          kind: 'wireRef',
          bindType: a.bindType,
          listFlag: a.listFlag,
          eachFlag: false,
          eachIndex: row,
          wireName: a.wireName,
        };
      }
      return logicCloneMutationTerm(a);
    });
    out.push({
      op: item.op,
      head: {
        kind: 'compound',
        predicate: head.predicate,
        arity: newArgs.length,
        args: newArgs,
      },
    });
  }
  return out;
}

function logicExpandMutationEachOps(items, ctx) {
  const out = [];
  for (const item of items || []) {
    out.push(...logicExpandOneMutationEachItem(item, ctx));
  }
  return out;
}

function logicWireBitsToListTerm(bits, bindType, fillBits, vectorShape) {
  const layout = logicResolveListWireLayout(bits.length, bindType, vectorShape);
  const elements = [];
  for (let i = 0; i < layout.slotCount; i++) {
    const cell = bits.substr(i * layout.elementWidth, layout.elementWidth);
    if (logicIsListSlotFill(cell, bindType, fillBits)) continue;
    const el = logicDecodeListSlot(cell, bindType);
    if (el == null) continue;
    elements.push(el);
  }
  if (elements.length === 0) {
    throw Error(`${bindType} list cannot contain 0 elements`);
  }
  return logicArrayToPrologList(elements);
}

function logicEncodeListToVectorBits(term, bindType, elementCount, elementWidth, fillBits) {
  const elements = term && term.kind === 'list' ? logicPrologListToArray(term) : [];
  const truncated = elements.slice(0, elementCount);
  const cells = [];
  for (let i = 0; i < elementCount; i++) {
    if (i < truncated.length) {
      cells.push(logicEncodeSolutionTerm(truncated[i], elementWidth));
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
      return logicEncodeListToVectorBits(
        solutions[0][packVars[0]], hint.bindType, shape.count, shape.ew, fillBits,
      );
    }
    if (hint.listFlag) {
      return fillBits.repeat(shape.count);
    }
    return logicPackVectorSolutions(
      solutions, packVars, shape.count, shape.ew, fillBits,
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
      const layout = logicResolveListWireLayout(w, hint.bindType, shape);
      return logicEncodeListToVectorBits(term, hint.bindType, layout.slotCount, layout.elementWidth, fillBits);
    }
    return logicTermToWireValue(term, w, hint.bindType);
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

function logicEncodeSolutionTerm(term, elementWidth) {
  if (!term) return '0'.repeat(elementWidth);
  if (term.kind === 'number') return logicNumberToBits(term.value, elementWidth);
  if (term.kind === 'atom') return logicAtomToAsciiBits(term.name, elementWidth);
  if (term.kind === 'list') {
    const bt = logicListBindTypeFromTerm(term);
    const ew = logicListPackedElementWidth(bt);
    const arr = logicPrologListToArray(term);
    if (arr.length > 0) return logicEncodeSolutionTerm(arr[0], elementWidth);
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

function logicPackVectorSolutions(solutions, freeVars, elementCount, elementWidth, fillBits) {
  const cells = [];
  const k = Math.min(solutions.length, elementCount);
  for (let i = 0; i < elementCount; i++) {
    if (i < k && freeVars.length >= 1) {
      cells.push(logicEncodeSolutionTerm(solutions[i][freeVars[0]], elementWidth));
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

function logicTermToWireValue(term, width, bindType) {
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
    if (term.kind === 'number') return logicNumberToBits(term.value, width);
    if (term.kind === 'atom') return logicAtomToAsciiBits(term.name, width);
    return '0'.repeat(width);
  }
  return '0'.repeat(width);
}

function logicPinToInputValue(bits, bindType) {
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
  let n = parseInt(bits, 2);
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
    logicTermIsGround,
    logicSetRandomSeed,
    logicNormalizeRandomSeed,
    logicNormalizeRandomInt,
    LOGIC_RANDOM_SEED_MAX,
    LOGIC_RANDOM_INT_MIN,
    LOGIC_RANDOM_INT_MAX,
  };
}
