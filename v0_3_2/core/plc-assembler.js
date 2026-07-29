/* ================= PLC ASSEMBLER (inline [plc]) ================= */

const PLC_KEYWORDS = new Set([
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
  'AND', 'OR', 'NOT', 'XOR',
  'TRUE', 'FALSE',
  'INPUTS', 'OUTPUTS',
  'TON', 'TOF',
  'CTU', 'CTD',
  'IN', 'PT',
  'CU', 'CD', 'PV',
  // R and LD are recognized contextually in parseCounterCall, not as global keywords
]);

function plcError(msg, line) {
  if (line != null) throw new Error(`plc program line ${line}: ${msg}`);
  throw new Error(`plc program: ${msg}`);
}

function plcIsIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function plcIsIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function plcTokenize(src) {
  const tokens = [];
  let line = 1;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === ';') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === ':' && src[i + 1] === '=') {
      tokens.push({ type: 'SYM', value: ':=', line });
      i += 2;
      continue;
    }
    if (ch === '<' || ch === '>') {
      let op = ch;
      if (src[i + 1] === '=') { op += '='; i++; }
      tokens.push({ type: 'CMP', value: op, line });
      i++;
      continue;
    }
    if (ch === '=' && src[i + 1] === '=') {
      tokens.push({ type: 'CMP', value: '==', line });
      i += 2;
      continue;
    }
    if (ch === '{' || ch === '}' || ch === ':' || ch === '=' || ch === '(' || ch === ')' || ch === '.') {
      tokens.push({ type: 'SYM', value: ch, line });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', line });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let n = '';
      const startLine = line;
      while (i < src.length && /[0-9]/.test(src[i])) {
        n += src[i];
        i++;
      }
      tokens.push({ type: 'NUM', value: parseInt(n, 10), line: startLine });
      continue;
    }
    if (plcIsIdentStart(ch)) {
      let id = '';
      const startLine = line;
      while (i < src.length && plcIsIdentPart(src[i])) {
        id += src[i];
        i++;
      }
      const upper = id.toUpperCase();
      if (upper === 'END_IF' || PLC_KEYWORDS.has(upper)) {
        tokens.push({ type: 'KW', value: upper, line: startLine });
      } else {
        tokens.push({ type: 'ID', value: id, line: startLine });
      }
      continue;
    }
    plcError(`unexpected character '${ch}'`, line);
  }
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

class PlcParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  eat(type, value) {
    const t = this.peek();
    if (t.type !== type) {
      plcError(`expected ${type}${value != null ? ` '${value}'` : ''}, got ${t.type} '${t.value}'`, t.line);
    }
    if (value != null && t.value !== value) {
      plcError(`expected '${value}', got '${t.value}'`, t.line);
    }
    this.pos++;
    return t;
  }

  match(type, value) {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value != null && t.value !== value) return false;
    this.pos++;
    return true;
  }

  parseSymbolDecls() {
    const decls = {};
    this.eat('SYM', '{');
    while (!this.match('SYM', '}')) {
      const nameTok = this.eat('ID');
      const name = nameTok.value;
      let width = 1;
      if (this.match('SYM', ':')) {
        width = this.eat('NUM').value;
        if (width < 1) plcError('symbol width must be >= 1', this.peek().line);
      }
      if (decls[name]) plcError(`duplicate symbol '${name}'`, nameTok.line);
      decls[name] = { name, width, line: nameTok.line };
      this.match('COMMA');
    }
    return decls;
  }

  parseProgram() {
    const inputs = {};
    const outputs = {};
    while (this.peek().type === 'KW' && (this.peek().value === 'INPUTS' || this.peek().value === 'OUTPUTS')) {
      const section = this.eat('KW').value;
      this.eat('SYM', ':');
      const decls = this.parseSymbolDecls();
      const target = section === 'INPUTS' ? inputs : outputs;
      for (const [k, v] of Object.entries(decls)) {
        if (target[k]) plcError(`duplicate symbol '${k}'`, v.line);
        target[k] = v;
      }
    }
    const statements = this.parseStmtList();
    if (!this.match('EOF')) {
      plcError(`unexpected token '${this.peek().value}'`, this.peek().line);
    }
    return { inputs, outputs, statements };
  }

  parseStmtList() {
    const stmts = [];
    while (this.isStatementStart()) {
      stmts.push(this.parseStatement());
    }
    return stmts;
  }

  isStatementStart() {
    const t = this.peek();
    if (t.type === 'KW' && (t.value === 'IF' || t.value === 'TON' || t.value === 'TOF' || t.value === 'CTU' || t.value === 'CTD')) return true;
    return t.type === 'ID';
  }

  parseStatement() {
    if (this.match('KW', 'IF')) {
      return this.parseIf();
    }
    if (this.match('KW', 'TON')) {
      return this.parseTimerCall('ton');
    }
    if (this.match('KW', 'TOF')) {
      return this.parseTimerCall('tof');
    }
    if (this.match('KW', 'CTU')) {
      return this.parseCounterCall('ctu');
    }
    if (this.match('KW', 'CTD')) {
      return this.parseCounterCall('ctd');
    }
    const targetTok = this.eat('ID');
    const target = targetTok.value;
    this.eat('SYM', '=');
    const expr = this.parseExpr();
    return { type: 'assign', target, expr, line: targetTok.line };
  }

  parseTimerCall(kind) {
    const line = this.peek().line;
    const nameTok = this.eat('ID');
    const name = nameTok.value;
    this.eat('SYM', '(');
    this.eat('KW', 'IN');
    this.eat('SYM', ':=');
    const inExpr = this.parseExpr();
    this.eat('COMMA');
    this.eat('KW', 'PT');
    this.eat('SYM', ':=');
    const ptTok = this.eat('NUM');
    const pt = ptTok.value;
    if (pt < 1) plcError('PT must be >= 1', ptTok.line);
    this.eat('SYM', ')');
    return { type: kind, name, inExpr, pt, line: nameTok.line };
  }

  parseCounterCall(kind) {
    const line = this.peek().line;
    const nameTok = this.eat('ID');
    const name = nameTok.value;
    this.eat('SYM', '(');
    let pulseArg, resetArg, pvArg;
    const argsDone = new Set();
    for (let i = 0; i < 3; i++) {
      const tok = this.peek();
      // CU / CD are keywords; R and LD are IDs (not global keywords)
      if (kind === 'ctu' && tok.type === 'KW' && tok.value === 'CU') {
        this.eat('KW', 'CU'); this.eat('SYM', ':=');
        pulseArg = this.parseExpr();
        argsDone.add('pulse');
      } else if (kind === 'ctd' && tok.type === 'KW' && tok.value === 'CD') {
        this.eat('KW', 'CD'); this.eat('SYM', ':=');
        pulseArg = this.parseExpr();
        argsDone.add('pulse');
      } else if (kind === 'ctu' && tok.type === 'ID' && tok.value.toUpperCase() === 'R') {
        this.eat('ID'); this.eat('SYM', ':=');
        resetArg = this.parseExpr();
        argsDone.add('reset');
      } else if (kind === 'ctd' && tok.type === 'ID' && tok.value.toUpperCase() === 'LD') {
        this.eat('ID'); this.eat('SYM', ':=');
        resetArg = this.parseExpr();
        argsDone.add('reset');
      } else if (tok.type === 'KW' && tok.value === 'PV') {
        this.eat('KW', 'PV'); this.eat('SYM', ':=');
        const pvTok = this.eat('NUM');
        if (pvTok.value < 1) plcError('PV must be >= 1', pvTok.line);
        pvArg = pvTok.value;
        argsDone.add('pv');
      } else {
        break;
      }
      if (!this.match('COMMA')) break;
    }
    if (!argsDone.has('pulse')) plcError(`${kind.toUpperCase()} requires ${kind === 'ctu' ? 'CU' : 'CD'}`, line);
    if (!argsDone.has('reset')) plcError(`${kind.toUpperCase()} requires ${kind === 'ctu' ? 'R' : 'LD'}`, line);
    if (!argsDone.has('pv')) plcError(`${kind.toUpperCase()} requires PV`, line);
    this.eat('SYM', ')');
    return { type: kind, name, pulseExpr: pulseArg, resetExpr: resetArg, pv: pvArg, line: nameTok.line };
  }

  parseIf() {
    const line = this.peek().line;
    const cond = this.parseExpr();
    this.eat('KW', 'THEN');
    const thenBody = this.parseStmtList();
    const elsif = [];
    while (this.match('KW', 'ELSIF')) {
      const econd = this.parseExpr();
      this.eat('KW', 'THEN');
      elsif.push({ cond: econd, body: this.parseStmtList() });
    }
    let elseBody = [];
    if (this.match('KW', 'ELSE')) {
      elseBody = this.parseStmtList();
    }
    this.eat('KW', 'END_IF');
    return { type: 'if', cond, thenBody, elsif, elseBody, line };
  }

  parseExpr() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseXor();
    while (this.match('KW', 'OR')) {
      left = { type: 'binary', op: 'OR', left, right: this.parseXor() };
    }
    return left;
  }

  parseXor() {
    let left = this.parseAnd();
    while (this.match('KW', 'XOR')) {
      left = { type: 'binary', op: 'XOR', left, right: this.parseAnd() };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.match('KW', 'AND')) {
      left = { type: 'binary', op: 'AND', left, right: this.parseNot() };
    }
    return left;
  }

  parseNot() {
    if (this.match('KW', 'NOT')) {
      return { type: 'unary', op: 'NOT', arg: this.parseNot() };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.match('SYM', '(')) {
      const e = this.parseExpr();
      this.eat('SYM', ')');
      return e;
    }
    if (this.match('KW', 'TRUE')) {
      return { type: 'literal', value: '1' };
    }
    if (this.match('KW', 'FALSE')) {
      return { type: 'literal', value: '0' };
    }
    if (this.peek().type === 'NUM' && (this.peek().value === 0 || this.peek().value === 1)) {
      const v = this.eat('NUM').value;
      return { type: 'literal', value: String(v) };
    }
    if (this.peek().type === 'ID') {
      const base = this.eat('ID').value;
      if (this.match('SYM', '.')) {
        const fieldTok = this.eat('ID');
        const field = fieldTok.value;
        const node = { type: 'member', base, field, line: fieldTok.line };
        // .CV comparisons: name.CV >= n / <= n / == n / > n / < n
        if (field === 'CV' && this.peek().type === 'CMP') {
          const op = this.eat('CMP').value;
          const numTok = this.eat('NUM');
          return { type: 'cvCmp', base, op, rhs: numTok.value, line: fieldTok.line };
        }
        return node;
      }
      return { type: 'symbol', name: base };
    }
    plcError(`expected expression, got ${this.peek().type}`, this.peek().line);
  }
}

function plcCollectSymbols(expr, out) {
  if (!expr) return;
  if (expr.type === 'symbol') out.add(expr.name);
  else if (expr.type === 'member') out.add(expr.base);
  else if (expr.type === 'unary') plcCollectSymbols(expr.arg, out);
  else if (expr.type === 'binary') {
    plcCollectSymbols(expr.left, out);
    plcCollectSymbols(expr.right, out);
  }
}

function plcWalkStatements(stmts, fn) {
  for (const stmt of stmts || []) {
    fn(stmt);
    if (stmt.type === 'if') {
      for (const s of stmt.thenBody || []) plcWalkStatements([s], fn);
      for (const e of stmt.elsif || []) plcWalkStatements(e.body, fn);
      for (const s of stmt.elseBody || []) plcWalkStatements([s], fn);
    }
  }
}

function plcCollectTimerDefs(parsed) {
  const timers = new Map();
  plcWalkStatements(parsed.statements, (stmt) => {
    if (stmt.type === 'ton' || stmt.type === 'tof') {
      if (timers.has(stmt.name)) plcError(`duplicate timer '${stmt.name}'`, stmt.line);
      timers.set(stmt.name, stmt);
    }
  });
  return timers;
}

function plcCollectCounterDefs(parsed) {
  const counters = new Map();
  plcWalkStatements(parsed.statements, (stmt) => {
    if (stmt.type === 'ctu' || stmt.type === 'ctd') {
      if (counters.has(stmt.name)) plcError(`duplicate counter '${stmt.name}'`, stmt.line);
      counters.set(stmt.name, stmt);
    }
  });
  return counters;
}

function plcValidateProgram(parsed) {
  const inputs = parsed.inputs || {};
  const outputs = parsed.outputs || {};
  const timers = plcCollectTimerDefs(parsed);
  const counters = plcCollectCounterDefs(parsed);

  function symInfo(name) {
    if (inputs[name]) return { kind: 'input', width: inputs[name].width };
    if (outputs[name]) return { kind: 'output', width: outputs[name].width };
    if (timers.has(name)) return { kind: 'timer', width: 1 };
    if (counters.has(name)) return { kind: 'counter', width: 1 };
    return null;
  }

  for (const [name] of timers) {
    if (inputs[name] || outputs[name]) {
      plcError(`timer name '${name}' conflicts with I/O symbol`, timers.get(name).line);
    }
    if (counters.has(name)) plcError(`timer name '${name}' conflicts with counter`, timers.get(name).line);
  }
  for (const [name] of counters) {
    if (inputs[name] || outputs[name]) {
      plcError(`counter name '${name}' conflicts with I/O symbol`, counters.get(name).line);
    }
  }

  function checkExpr1Bit(expr, ctx) {
    if (expr.type === 'member') {
      if (expr.field === 'Q') {
        if (!timers.has(expr.base) && !counters.has(expr.base))
          plcError(`unknown timer/counter ${expr.base} in .Q`, ctx);
        return;
      }
      if (expr.field === 'CV') {
        plcError(`.CV cannot be used directly as 1-bit; use name.CV >= N comparison`, ctx);
      }
      plcError(`unknown member field '${expr.field}'`, ctx);
    }
    if (expr.type === 'cvCmp') {
      if (!counters.has(expr.base)) plcError(`unknown counter '${expr.base}' in .CV`, ctx);
      return;
    }
    const used = new Set();
    plcCollectSymbols(expr, used);
    for (const n of used) {
      if (timers.has(n) || counters.has(n)) continue;
      const info = symInfo(n);
      if (!info) plcError(`unknown symbol ${n}`, ctx);
      if (info.width !== 1) plcError(`expression requires 1-bit symbol, got ${n} (${info.width} bits)`, ctx);
    }
  }

  function checkStmt(stmt) {
    if (stmt.type === 'assign') {
      const targetInfo = symInfo(stmt.target);
      if (!targetInfo) plcError(`unknown symbol ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'input') plcError(`cannot assign to input ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'timer') plcError(`cannot assign to timer ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'counter') plcError(`cannot assign to counter ${stmt.target}`, stmt.line);
      if (targetInfo.width !== 1) {
        plcError(`assignment requires 1-bit symbol, got ${stmt.target} (${targetInfo.width} bits)`, stmt.line);
      }
      checkExpr1Bit(stmt.expr, stmt.line);
    } else if (stmt.type === 'ton' || stmt.type === 'tof') {
      checkExpr1Bit(stmt.inExpr, stmt.line);
    } else if (stmt.type === 'ctu' || stmt.type === 'ctd') {
      checkExpr1Bit(stmt.pulseExpr, stmt.line);
      checkExpr1Bit(stmt.resetExpr, stmt.line);
    } else if (stmt.type === 'if') {
      checkExpr1Bit(stmt.cond, stmt.line);
      for (const s of stmt.thenBody) checkStmt(s);
      for (const e of stmt.elsif || []) {
        checkExpr1Bit(e.cond, stmt.line);
        for (const s of e.body) checkStmt(s);
      }
      for (const s of stmt.elseBody || []) checkStmt(s);
    }
  }

  for (const stmt of parsed.statements || []) checkStmt(stmt);
  parsed.timers = timers;
  parsed.counters = counters;
  return parsed;
}

function parsePlcBody(bodyRaw) {
  const src = String(bodyRaw || '').trim();
  if (!src) plcError('empty program body');
  const tokens = plcTokenize(src);
  const parser = new PlcParser(tokens);
  const parsed = parser.parseProgram();
  plcValidateProgram(parsed);
  return {
    inputs: parsed.inputs,
    outputs: parsed.outputs,
    statements: parsed.statements,
    timers: parsed.timers,
    counters: parsed.counters,
    bodyRaw,
  };
}

function plcBit(v) {
  if (v == null || v === '') return '0';
  const s = String(v);
  const last = s[s.length - 1];
  return (last === '1') ? '1' : '0';
}

function plcNormalizeBits(v, width) {
  let s = v == null ? '' : String(v);
  if (width === 1) return plcBit(s);
  if (s.length < width) s = s.padStart(width, '0');
  else if (s.length > width) s = s.slice(-width);
  return s;
}

function plcTimerQ(timerState, name) {
  const st = timerState && timerState[name];
  return st && st.q === '1' ? '1' : '0';
}

function plcCounterQ(counterState, name) {
  const st = counterState && counterState[name];
  return st && st.q === '1' ? '1' : '0';
}

function plcCounterCV(counterState, name) {
  const st = counterState && counterState[name];
  return st ? st.cv : 0;
}

function plcEvalExpr(expr, env, timerState, counterState) {
  if (expr.type === 'literal') return expr.value;
  if (expr.type === 'symbol') {
    if (!env.has(expr.name)) return '0';
    return plcBit(env.get(expr.name));
  }
  if (expr.type === 'member') {
    if (expr.field === 'Q') {
      const tq = plcTimerQ(timerState, expr.base);
      if (tq !== '0') return tq;
      return plcCounterQ(counterState, expr.base);
    }
    return '0';
  }
  if (expr.type === 'cvCmp') {
    const cv = plcCounterCV(counterState, expr.base);
    const r = expr.rhs;
    if (expr.op === '>=') return cv >= r ? '1' : '0';
    if (expr.op === '<=') return cv <= r ? '1' : '0';
    if (expr.op === '>') return cv > r ? '1' : '0';
    if (expr.op === '<') return cv < r ? '1' : '0';
    if (expr.op === '==') return cv === r ? '1' : '0';
    return '0';
  }
  if (expr.type === 'unary' && expr.op === 'NOT') {
    return plcEvalExpr(expr.arg, env, timerState, counterState) === '1' ? '0' : '1';
  }
  if (expr.type === 'binary') {
    const a = plcEvalExpr(expr.left, env, timerState, counterState) === '1';
    const b = plcEvalExpr(expr.right, env, timerState, counterState) === '1';
    if (expr.op === 'AND') return (a && b) ? '1' : '0';
    if (expr.op === 'OR') return (a || b) ? '1' : '0';
    if (expr.op === 'XOR') return (a !== b) ? '1' : '0';
  }
  return '0';
}

function plcEnsureTimerState(timerState, name) {
  if (!timerState[name]) timerState[name] = { et: 0, q: '0' };
  return timerState[name];
}

function plcEnsureCounterState(counterState, name) {
  if (!counterState[name]) counterState[name] = { cv: 0, q: '0', prevPulse: '0' };
  return counterState[name];
}

function plcExecTon(stmt, env, timerState, counterState) {
  const inVal = plcEvalExpr(stmt.inExpr, env, timerState, counterState) === '1';
  const st = plcEnsureTimerState(timerState, stmt.name);
  if (inVal) {
    st.et += 1;
    st.q = (st.et >= stmt.pt) ? '1' : '0';
  } else {
    st.et = 0;
    st.q = '0';
  }
}

function plcExecTof(stmt, env, timerState, counterState) {
  const inVal = plcEvalExpr(stmt.inExpr, env, timerState, counterState) === '1';
  const st = plcEnsureTimerState(timerState, stmt.name);
  if (inVal) {
    st.et = 0;
    st.q = '1';
  } else if (st.q === '1') {
    st.et += 1;
    if (st.et >= stmt.pt) st.q = '0';
  } else {
    st.et = 0;
    st.q = '0';
  }
}

function plcExecCtu(stmt, env, timerState, counterState) {
  const cuVal = plcEvalExpr(stmt.pulseExpr, env, timerState, counterState);
  const rVal = plcEvalExpr(stmt.resetExpr, env, timerState, counterState) === '1';
  const st = plcEnsureCounterState(counterState, stmt.name);
  // R has priority over CU (IEC 61131)
  if (rVal) {
    st.cv = 0;
  } else {
    const rising = (cuVal === '1' && st.prevPulse === '0');
    if (rising) {
      st.cv += 1;
    }
  }
  st.prevPulse = cuVal;
  st.q = (st.cv >= stmt.pv) ? '1' : '0';
}

function plcExecCtd(stmt, env, timerState, counterState) {
  const cdVal = plcEvalExpr(stmt.pulseExpr, env, timerState, counterState);
  const ldVal = plcEvalExpr(stmt.resetExpr, env, timerState, counterState) === '1';
  const st = plcEnsureCounterState(counterState, stmt.name);
  // LD has priority over CD (IEC 61131)
  if (ldVal) {
    st.cv = stmt.pv;
  } else {
    const rising = (cdVal === '1' && st.prevPulse === '0');
    if (rising && st.cv > 0) {
      st.cv -= 1;
    }
  }
  st.prevPulse = cdVal;
  st.q = (st.cv <= 0) ? '1' : '0';
}

function plcExecStmt(stmt, env, timerState, counterState) {
  if (stmt.type === 'assign') {
    env.set(stmt.target, plcEvalExpr(stmt.expr, env, timerState, counterState));
    return;
  }
  if (stmt.type === 'ton') {
    plcExecTon(stmt, env, timerState, counterState);
    return;
  }
  if (stmt.type === 'tof') {
    plcExecTof(stmt, env, timerState, counterState);
    return;
  }
  if (stmt.type === 'ctu') {
    plcExecCtu(stmt, env, timerState, counterState);
    return;
  }
  if (stmt.type === 'ctd') {
    plcExecCtd(stmt, env, timerState, counterState);
    return;
  }
  if (stmt.type === 'if') {
    if (plcEvalExpr(stmt.cond, env, timerState, counterState) === '1') {
      for (const s of stmt.thenBody) plcExecStmt(s, env, timerState, counterState);
      return;
    }
    for (const e of stmt.elsif || []) {
      if (plcEvalExpr(e.cond, env, timerState, counterState) === '1') {
        for (const s of e.body) plcExecStmt(s, env, timerState, counterState);
        return;
      }
    }
    for (const s of stmt.elseBody || []) plcExecStmt(s, env, timerState, counterState);
  }
}

function executePlcScan(inst, externalInputs, outputState, timerState, counterState) {
  const inputs = inst.inputs || {};
  const outputs = inst.outputs || {};
  const env = new Map();
  const timers = timerState || {};
  const counters = counterState || {};

  for (const name of Object.keys(outputs)) {
    const prev = outputState && outputState[name] != null ? outputState[name] : '0';
    env.set(name, plcBit(prev));
  }
  for (const name of Object.keys(inputs)) {
    const w = inputs[name].width;
    let val = externalInputs && externalInputs[name];
    if (val == null) val = '0'.repeat(w);
    env.set(name, plcNormalizeBits(val, w));
  }

  for (const stmt of inst.statements || []) {
    plcExecStmt(stmt, env, timers, counters);
  }

  const out = outputState || {};
  for (const name of Object.keys(outputs)) {
    out[name] = env.get(name) || '0';
  }
  return out;
}

function formatPlcExpr(expr) {
  if (!expr) return '';
  if (expr.type === 'literal') return expr.value === '1' ? 'TRUE' : 'FALSE';
  if (expr.type === 'symbol') return expr.name;
  if (expr.type === 'member') return `${expr.base}.${expr.field}`;
  if (expr.type === 'cvCmp') return `${expr.base}.CV ${expr.op} ${expr.rhs}`;
  if (expr.type === 'unary') return `NOT ${formatPlcExpr(expr.arg)}`;
  if (expr.type === 'binary') return `${formatPlcExpr(expr.left)} ${expr.op} ${formatPlcExpr(expr.right)}`;
  return '?';
}

function formatPlcTimerCall(stmt, indent) {
  const pad = '  '.repeat(indent);
  const kw = stmt.type === 'ton' ? 'TON' : 'TOF';
  return `${pad}${kw} ${stmt.name}(IN := ${formatPlcExpr(stmt.inExpr)}, PT := ${stmt.pt})`;
}

function formatPlcCounterCall(stmt, indent) {
  const pad = '  '.repeat(indent);
  if (stmt.type === 'ctu') {
    return `${pad}CTU ${stmt.name}(CU := ${formatPlcExpr(stmt.pulseExpr)}, R := ${formatPlcExpr(stmt.resetExpr)}, PV := ${stmt.pv})`;
  }
  return `${pad}CTD ${stmt.name}(CD := ${formatPlcExpr(stmt.pulseExpr)}, LD := ${formatPlcExpr(stmt.resetExpr)}, PV := ${stmt.pv})`;
}

function formatPlcStmt(stmt, indent) {
  const pad = '  '.repeat(indent);
  if (stmt.type === 'assign') {
    return `${pad}${stmt.target} = ${formatPlcExpr(stmt.expr)}`;
  }
  if (stmt.type === 'ton' || stmt.type === 'tof') {
    return formatPlcTimerCall(stmt, indent);
  }
  if (stmt.type === 'ctu' || stmt.type === 'ctd') {
    return formatPlcCounterCall(stmt, indent);
  }
  if (stmt.type === 'if') {
    const lines = [`${pad}IF ${formatPlcExpr(stmt.cond)} THEN`];
    for (const s of stmt.thenBody) lines.push(formatPlcStmt(s, indent + 1));
    for (const e of stmt.elsif || []) {
      lines.push(`${pad}ELSIF ${formatPlcExpr(e.cond)} THEN`);
      for (const s of e.body) lines.push(formatPlcStmt(s, indent + 1));
    }
    if (stmt.elseBody && stmt.elseBody.length) {
      lines.push(`${pad}ELSE`);
      for (const s of stmt.elseBody) lines.push(formatPlcStmt(s, indent + 1));
    }
    lines.push(`${pad}END_IF`);
    return lines.join('\n');
  }
  return `${pad}?`;
}

function formatPlcSymbolTable(title, table) {
  const lines = [`  ${title}:`];
  const names = Object.keys(table || {});
  if (!names.length) {
    lines.push('    (none)');
    return lines;
  }
  for (const n of names) {
    const w = table[n].width;
    lines.push(`    ${n}${w === 1 ? '' : `:${w}`}`);
  }
  return lines;
}

function formatPlcInstanceDoc(alias, inst) {
  const lines = [];
  lines.push(`${alias} (inline [plc])`);
  lines.push('');
  lines.push(...formatPlcSymbolTable('inputs', inst.inputs));
  lines.push(...formatPlcSymbolTable('outputs', inst.outputs));
  const timerNames = [];
  const counterNames = [];
  plcWalkStatements(inst.statements, (stmt) => {
    if (stmt.type === 'ton' || stmt.type === 'tof') timerNames.push(stmt.name);
    if (stmt.type === 'ctu' || stmt.type === 'ctd') counterNames.push(stmt.name);
  });
  lines.push('  timers:');
  if (!timerNames.length) lines.push('    (none)');
  else for (const n of timerNames) lines.push(`    ${n}`);
  lines.push('  counters:');
  if (!counterNames.length) lines.push('    (none)');
  else for (const n of counterNames) lines.push(`    ${n}`);
  lines.push('');
  lines.push('  program:');
  for (const stmt of inst.statements || []) {
    lines.push(formatPlcStmt(stmt, 2));
  }
  lines.push('');
  lines.push('  execution:');
  lines.push('    one scan = sequential pass through program');
  lines.push('    outputs retain value if not assigned (PLC semantics)');
  lines.push('    inputs read-only; outputs readable in same scan');
  lines.push('    TON/TOF advance once per scan; PT is scan count');
  lines.push('    CTU/CTD count rising edges per scan; PV is preset');
  return lines;
}

function formatPlcTypeDoc() {
  return [
    'inline [plc] .name:',
    '  inputs: { START, STOP: 1 }',
    '  outputs: { MOTOR }',
    '  TON startDelay(IN := START, PT := 50)',
    '  IF startDelay.Q THEN',
    '    MOTOR = TRUE',
    '  ELSE',
    '    MOTOR = FALSE',
    '  END_IF',
    '  :',
    '',
    'Keywords: IF THEN ELSE ELSIF END_IF AND OR NOT XOR TRUE FALSE TON TOF CTU CTD',
    'Timers: PT = preset in scan cycles; read Q as name.Q',
    'Counters: PV = preset; read Q as name.Q; compare CV as name.CV >= N',
    'Bind with comp [plc] program: .name and I/O map (see doc/plc.md and doc/plc-language.md)',
  ];
}

const plcAssemblerExports = {
  parsePlcBody,
  executePlcScan,
  formatPlcInstanceDoc,
  formatPlcTypeDoc,
  plcBit,
  plcNormalizeBits,
  plcTimerQ,
  plcCounterQ,
  plcCounterCV,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = plcAssemblerExports;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parsePlcBody = parsePlcBody;
  globalThis.executePlcScan = executePlcScan;
  globalThis.formatPlcInstanceDoc = formatPlcInstanceDoc;
  globalThis.formatPlcTypeDoc = formatPlcTypeDoc;
  globalThis.plcTimerQ = plcTimerQ;
  globalThis.plcCounterQ = plcCounterQ;
  globalThis.plcCounterCV = plcCounterCV;
}
