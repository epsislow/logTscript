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
  if (term.kind === 'atom') return { kind: 'atom', id: table.intern(term.name) };
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
  if (goal.kind === 'not') {
    return { kind: 'not', goal: logicInternGoal(goal.goal, table) };
  }
  return goal;
}

function logicPredicateKey(predicate, arity) {
  return `${predicate}/${arity}`;
}

class LogicEngine {
  constructor(clauses) {
    this.table = new LogicAtomTable();
    this.index = new Map();
    this.maxSolutions = 64;
    this.maxDepth = 256;
    this.truncated = false;
    this.depthExceeded = false;
    for (const c of clauses || []) {
      const ic = logicInternClause(c, this.table);
      const head = ic.head;
      if (!head || head.kind !== 'compound') continue;
      const key = logicPredicateKey(head.predicate, head.arity);
      if (!this.index.has(key)) this.index.set(key, []);
      this.index.get(key).push(ic);
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
    return false;
  }

  _solveCall(goal, rest, env, depth, onSuccess, onDepthExceeded) {
    const key = logicPredicateKey(goal.predicate, goal.arity);
    const clauses = this.index.get(key) || [];
    let any = false;
    for (const clause of clauses) {
      if (this._solutionCapReached) break;
      const trail = env.trailLength();
      const head = logicDerefCompound(clause.head, env);
      if (!logicUnifyCompound(goal, head, env, this.table)) {
        env.undo(trail);
        continue;
      }
      const newGoals = (clause.body || []).concat(rest);
      const ok = this._solveGoals(newGoals, env, depth + 1, onSuccess, onDepthExceeded);
      env.undo(trail);
      if (this._solutionCapReached) {
        any = true;
        break;
      }
      if (ok) any = true;
    }
    return any;
  }
}

function logicEnv() {
  const bindings = new Map();
  return {
    bindings,
    trail: [],
    trailLength() { return this.trail.length; },
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
    return { kind: 'atom', id: table.intern(name) };
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
  return false;
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
  if (d.kind === 'atom') return { kind: 'atom', name: table.name(d.id) };
  if (d.kind === 'var') return { kind: 'var', name: d.name };
  if (d.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: d.predicate,
      args: d.args.map((a) => logicResolveTerm(a, env, table)),
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
    } else if (t.kind === 'arith') { walkTerm(t.left); walkTerm(t.right); }
  }
  function walkGoal(g) {
    if (!g) return;
    if (g.kind === 'not') walkGoal(g.goal);
    else if (g.kind === 'call' || g.kind === 'compound') {
      for (const a of g.args || []) walkTerm(a);
    } else if (g.kind === 'cmp' || g.kind === 'unify') {
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
  const engine = new LogicEngine(mergedDef.clauses || []);
  if (options && options.maxSolutions != null) engine.maxSolutions = options.maxSolutions;
  if (options && options.maxDepth != null) engine.maxDepth = options.maxDepth;
  const out = engine.executeQueries(mergedDef.queries || [], inputEnv);
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
    if (t.kind === 'arith') {
      return { kind: 'arith', op: t.op, left: mapTerm(t.left), right: mapTerm(t.right) };
    }
    return t;
  }
  function mapGoal(g) {
    if (!g) return g;
    if (g.kind === 'not') return { kind: 'not', goal: mapGoal(g.goal) };
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

function executeLogicGoals(mergedDef, goals, inputEnv, options) {
  const engine = new LogicEngine(mergedDef.clauses || []);
  const opts = options || {};
  if (opts.maxSolutions != null) engine.maxSolutions = opts.maxSolutions;
  if (opts.maxDepth != null) engine.maxDepth = opts.maxDepth;
  const prepared = logicPrepareGoalsForInvoke(goals);
  const solutions = engine.solveQuery(prepared, inputEnv || {});
  return {
    solutions,
    _logicMeta: { truncated: engine.truncated, depthExceeded: engine.depthExceeded },
  };
}

function logicEncodeInlineQueryResult(solutions, freeVars, shape, fillBits, scalarWidth) {
  if (!freeVars || freeVars.length === 0) {
    const val = solutions && solutions.length > 0 ? 1 : 0;
    const w = shape && shape.kind === 'scalar' ? (scalarWidth || shape.ew || 1) : 1;
    return logicNumberToBits(val, w);
  }
  if (freeVars.length === 1 && shape && shape.kind === 'vector') {
    return logicPackVectorSolutions(
      solutions, freeVars, shape.count, shape.ew, fillBits,
    );
  }
  if (freeVars.length === 2 && shape && shape.kind === 'matrix') {
    return logicPackMatrixSolutions(
      solutions, freeVars, shape.rows, shape.cols, shape.ew, fillBits,
    );
  }
  if (freeVars.length >= 1 && solutions && solutions.length > 0) {
    const w = scalarWidth || (shape && shape.ew) || 8;
    return logicEncodeSolutionTerm(solutions[0][freeVars[0]], w);
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
  globalThis.logicPackMatrixCol = logicPackMatrixCol;
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
  };
}
