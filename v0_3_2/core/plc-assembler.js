/* ================= PLC ASSEMBLER (inline [plc]) ================= */

const PLC_KEYWORDS = new Set([
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
  'AND', 'OR', 'NOT', 'XOR',
  'TRUE', 'FALSE',
  'INPUTS', 'OUTPUTS',
  'VAR', 'END_VAR', 'CONST', 'END_CONST',
  'CASE', 'OF', 'END_CASE', 'RETURN',
  'FOR', 'TO', 'BY', 'DO', 'END_FOR',
  'WHILE', 'END_WHILE',
  'REPEAT', 'UNTIL', 'END_REPEAT',
  'EXIT',
  'TON', 'TOF',
  'CTU', 'CTD',
  'IN', 'PT',
  'CU', 'CD', 'PV',
  'MOD',
  // R and LD are recognized contextually in parseCounterCall, not as global keywords
]);

const PLC_LOOP_MAX_ITERS = 65535;

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
    if (ch === '!') {
      if (src[i + 1] === '=') {
        tokens.push({ type: 'CMP', value: '!=', line });
        i += 2;
        continue;
      }
      plcError(`unexpected character '${ch}'`, line);
    }
    if (ch === '*' || ch === '/' || ch === '+' || ch === '-') {
      tokens.push({ type: 'SYM', value: ch, line });
      i++;
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
      if (PLC_KEYWORDS.has(upper)) {
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
    let vars = null;
    let consts = null;
    if (this.peek().type === 'KW' && this.peek().value === 'VAR') {
      vars = this.parseVarBlock();
    }
    if (this.peek().type === 'KW' && this.peek().value === 'CONST') {
      consts = this.parseConstBlock();
    }
    if (this.peek().type === 'KW' && this.peek().value === 'VAR') {
      plcError('VAR must appear before CONST (order: inputs, outputs, VAR, CONST, body)', this.peek().line);
    }
    this.programInputs = inputs;
    this.programOutputs = outputs;
    this.programVars = vars || {};
    this.programConsts = consts || {};
    const statements = this.parseStmtList();
    if (!this.match('EOF')) {
      plcError(`unexpected token '${this.peek().value}'`, this.peek().line);
    }
    return { inputs, outputs, vars: vars || {}, consts: consts || {}, statements };
  }

  parseVarBlock() {
    const line = this.peek().line;
    this.eat('KW', 'VAR');
    const decls = {};
    while (!this.match('KW', 'END_VAR')) {
      if (this.peek().type === 'EOF') plcError('expected END_VAR', line);
      const nameTok = this.eat('ID');
      const name = nameTok.value;
      let width = 1;
      if (this.match('SYM', ':')) {
        width = this.eat('NUM').value;
        if (width < 1) plcError('VAR width must be >= 1', nameTok.line);
      }
      if (decls[name]) plcError(`duplicate VAR '${name}'`, nameTok.line);
      decls[name] = { name, width, line: nameTok.line };
      this.match('COMMA');
    }
    return decls;
  }

  parseConstBlock() {
    const line = this.peek().line;
    this.eat('KW', 'CONST');
    const decls = {};
    while (!this.match('KW', 'END_CONST')) {
      if (this.peek().type === 'EOF') plcError('expected END_CONST', line);
      const nameTok = this.eat('ID');
      const name = nameTok.value;
      this.eat('SYM', '=');
      const valTok = this.eat('NUM');
      if (decls[name]) plcError(`duplicate CONST '${name}'`, nameTok.line);
      decls[name] = { name, value: valTok.value, line: nameTok.line };
      this.match('COMMA');
    }
    return decls;
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
    if (t.type === 'KW' && (
      t.value === 'IF' || t.value === 'TON' || t.value === 'TOF' ||
      t.value === 'CTU' || t.value === 'CTD' || t.value === 'CASE' || t.value === 'RETURN' ||
      t.value === 'FOR' || t.value === 'WHILE' || t.value === 'REPEAT' || t.value === 'EXIT'
    )) return true;
    return t.type === 'ID';
  }

  parseStatement() {
    if (this.match('KW', 'IF')) {
      return this.parseIf();
    }
    if (this.match('KW', 'CASE')) {
      return this.parseCase();
    }
    if (this.match('KW', 'FOR')) {
      return this.parseFor();
    }
    if (this.match('KW', 'WHILE')) {
      return this.parseWhile();
    }
    if (this.match('KW', 'REPEAT')) {
      return this.parseRepeat();
    }
    if (this.match('KW', 'RETURN')) {
      return { type: 'return', line: this.tokens[this.pos - 1].line };
    }
    if (this.match('KW', 'EXIT')) {
      return { type: 'exit', line: this.tokens[this.pos - 1].line };
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
    const expr = this.parseAssignExpr(target);
    return { type: 'assign', target, expr, line: targetTok.line };
  }

  symbolWidth(name) {
    const i = this.programInputs && this.programInputs[name];
    if (i) return i.width;
    const o = this.programOutputs && this.programOutputs[name];
    if (o) return o.width;
    const v = this.programVars && this.programVars[name];
    if (v) return v.width;
    return 1;
  }

  parseAssignExpr(target) {
    const w = this.symbolWidth(target);
    if (w > 1) return this.parseAdd();
    return this.parseExpr();
  }

  parseForBound() {
    return this.parseAdd();
  }

  parseFor() {
    const line = this.tokens[this.pos - 1].line;
    const varTok = this.eat('ID');
    this.eat('SYM', ':=');
    const start = this.parseForBound();
    this.eat('KW', 'TO');
    const end = this.parseForBound();
    let step = { type: 'num', value: 1, line };
    if (this.match('KW', 'BY')) {
      step = this.parseForBound();
    }
    this.eat('KW', 'DO');
    const body = this.parseStmtList();
    this.eat('KW', 'END_FOR');
    return { type: 'for', control: varTok.value, start, end, step, body, line: varTok.line };
  }

  parseWhile() {
    const line = this.tokens[this.pos - 1].line;
    const cond = this.parseExpr();
    this.eat('KW', 'DO');
    const body = this.parseStmtList();
    this.eat('KW', 'END_WHILE');
    return { type: 'while', cond, body, line };
  }

  parseRepeat() {
    const line = this.tokens[this.pos - 1].line;
    const body = this.parseStmtList();
    this.eat('KW', 'UNTIL');
    const cond = this.parseExpr();
    this.eat('KW', 'END_REPEAT');
    return { type: 'repeat', body, cond, line };
  }

  parseCase() {
    const line = this.tokens[this.pos - 1].line;
    const selector = this.parseCaseSelector();
    this.eat('KW', 'OF');
    const branches = [];
    while (this.peek().type === 'NUM') {
      const valTok = this.eat('NUM');
      this.eat('SYM', ':');
      const body = this.parseStmtList();
      branches.push({ value: valTok.value, body, line: valTok.line });
    }
    let elseBody = [];
    if (this.match('KW', 'ELSE')) {
      elseBody = this.parseStmtList();
    }
    this.eat('KW', 'END_CASE');
    return { type: 'case', selector, branches, elseBody, line };
  }

  parseCaseSelector() {
    const nameTok = this.eat('ID');
    const name = nameTok.value;
    if (this.match('SYM', '.')) {
      const fieldTok = this.eat('ID');
      if (fieldTok.value !== 'CV') {
        plcError(`CASE selector member must be .CV, got .${fieldTok.value}`, fieldTok.line);
      }
      return { type: 'member', base: name, field: 'CV', line: nameTok.line };
    }
    return { type: 'symbol', name, line: nameTok.line };
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
      const line = this.tokens[this.pos - 1].line;
      left = { type: 'binary', op: 'OR', left, right: this.parseXor(), line };
    }
    return left;
  }

  parseXor() {
    let left = this.parseAnd();
    while (this.match('KW', 'XOR')) {
      const line = this.tokens[this.pos - 1].line;
      left = { type: 'binary', op: 'XOR', left, right: this.parseAnd(), line };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseCmp();
    while (this.match('KW', 'AND')) {
      const line = this.tokens[this.pos - 1].line;
      left = { type: 'binary', op: 'AND', left, right: this.parseCmp(), line };
    }
    return left;
  }

  parseCmp() {
    let left = this.parseAdd();
    if (this.peek().type === 'CMP') {
      const op = this.eat('CMP').value;
      const right = this.parseAdd();
      const line = left.line || right.line;
      left = { type: 'cmp', op, left, right, line };
    }
    return left;
  }

  parseAdd() {
    let left = this.parseMul();
    while (this.peek().type === 'SYM' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.eat('SYM').value;
      const line = this.tokens[this.pos - 1].line;
      left = { type: 'binary', op, left, right: this.parseMul(), line };
    }
    return left;
  }

  parseMul() {
    let left = this.parseUnary();
    while (
      (this.peek().type === 'SYM' && (this.peek().value === '*' || this.peek().value === '/')) ||
      (this.peek().type === 'KW' && this.peek().value === 'MOD')
    ) {
      let op;
      if (this.peek().type === 'KW') {
        this.eat('KW', 'MOD');
        op = 'MOD';
      } else {
        op = this.eat('SYM').value;
      }
      const line = this.tokens[this.pos - 1].line;
      left = { type: 'binary', op, left, right: this.parseUnary(), line };
    }
    return left;
  }

  parseUnary() {
    if (this.match('KW', 'NOT')) {
      const line = this.tokens[this.pos - 1].line;
      return { type: 'unary', op: 'NOT', arg: this.parseUnary(), line };
    }
    if (this.peek().type === 'SYM' && this.peek().value === '-') {
      this.eat('SYM', '-');
      const line = this.tokens[this.pos - 1].line;
      return { type: 'unary', op: 'NEG', arg: this.parseUnary(), line };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.match('SYM', '(')) {
      const e = this.parseOr();
      this.eat('SYM', ')');
      return e;
    }
    if (this.match('KW', 'TRUE')) {
      const line = this.tokens[this.pos - 1].line;
      return { type: 'num', value: 1, line };
    }
    if (this.match('KW', 'FALSE')) {
      const line = this.tokens[this.pos - 1].line;
      return { type: 'num', value: 0, line };
    }
    if (this.peek().type === 'NUM') {
      const n = this.eat('NUM');
      return { type: 'num', value: n.value, line: n.line };
    }
    if (this.peek().type === 'ID') {
      const nameTok = this.eat('ID');
      const base = nameTok.value;
      if (this.match('SYM', '.')) {
        const fieldTok = this.eat('ID');
        return { type: 'member', base, field: fieldTok.value, line: fieldTok.line };
      }
      return { type: 'symbol', name: base, line: nameTok.line };
    }
    plcError(`expected expression, got ${this.peek().type}`, this.peek().line);
  }
}

function plcCollectSymbols(expr, out) {
  if (!expr) return;
  if (expr.type === 'symbol') out.add(expr.name);
  else if (expr.type === 'member') out.add(expr.base);
  else if (expr.type === 'cmp') {
    plcCollectSymbols(expr.left, out);
    plcCollectSymbols(expr.right, out);
  } else if (expr.type === 'unary') plcCollectSymbols(expr.arg, out);
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
    } else if (stmt.type === 'case') {
      for (const b of stmt.branches || []) plcWalkStatements(b.body, fn);
      for (const s of stmt.elseBody || []) plcWalkStatements([s], fn);
    } else if (stmt.type === 'for' || stmt.type === 'while' || stmt.type === 'repeat') {
      plcWalkStatements(stmt.body, fn);
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
  const vars = parsed.vars || {};
  const consts = parsed.consts || {};
  const timers = plcCollectTimerDefs(parsed);
  const counters = plcCollectCounterDefs(parsed);

  function symInfo(name) {
    if (inputs[name]) return { kind: 'input', width: inputs[name].width };
    if (outputs[name]) return { kind: 'output', width: outputs[name].width };
    if (vars[name]) return { kind: 'var', width: vars[name].width };
    if (consts[name]) return { kind: 'const', width: 1, constValue: consts[name].value };
    if (timers.has(name)) return { kind: 'timer', width: 1 };
    if (counters.has(name)) return { kind: 'counter', width: 1 };
    return null;
  }

  for (const name of Object.keys(vars)) {
    if (inputs[name] || outputs[name]) {
      plcError(`VAR '${name}' conflicts with I/O symbol`, vars[name].line);
    }
    if (consts[name]) plcError(`VAR '${name}' conflicts with CONST`, vars[name].line);
  }
  for (const name of Object.keys(consts)) {
    if (inputs[name] || outputs[name]) {
      plcError(`CONST '${name}' conflicts with I/O symbol`, consts[name].line);
    }
  }

  for (const [name] of timers) {
    if (inputs[name] || outputs[name] || vars[name] || consts[name]) {
      plcError(`timer name '${name}' conflicts with I/O or VAR/CONST`, timers.get(name).line);
    }
    if (counters.has(name)) plcError(`timer name '${name}' conflicts with counter`, timers.get(name).line);
  }
  for (const [name] of counters) {
    if (inputs[name] || outputs[name] || vars[name] || consts[name]) {
      plcError(`counter name '${name}' conflicts with I/O or VAR/CONST`, counters.get(name).line);
    }
  }

  function checkExprBool(expr, ctx) {
    if (!expr) return;
    if (expr.type === 'cmp') {
      checkExprNum(expr.left, ctx);
      checkExprNum(expr.right, ctx);
      return;
    }
    if (expr.type === 'num') return;
    if (expr.type === 'unary' && expr.op === 'NOT') {
      checkExprBool(expr.arg, ctx);
      return;
    }
    if (expr.type === 'unary' && expr.op === 'NEG') {
      plcError('unary minus not allowed in boolean expression', ctx);
    }
    if (expr.type === 'binary') {
      if (expr.op === '+' || expr.op === '-' || expr.op === '*' || expr.op === '/' || expr.op === 'MOD') {
        plcError(`arithmetic ${expr.op} not allowed in boolean expression`, ctx);
      }
      checkExprBool(expr.left, ctx);
      checkExprBool(expr.right, ctx);
      return;
    }
    if (expr.type === 'member') {
      if (expr.field === 'Q') {
        if (!timers.has(expr.base) && !counters.has(expr.base)) {
          plcError(`unknown timer/counter ${expr.base} in .Q`, ctx);
        }
        return;
      }
      if (expr.field === 'CV') {
        plcError(`.CV cannot be used directly as 1-bit; use name.CV >= N comparison`, ctx);
      }
      plcError(`unknown member field '${expr.field}'`, ctx);
    }
    if (expr.type === 'symbol') {
      const info = symInfo(expr.name);
      if (!info) plcError(`unknown symbol ${expr.name}`, ctx);
      if (info.kind === 'const' && info.constValue !== 0 && info.constValue !== 1) {
        plcError(`CONST '${expr.name}' value ${info.constValue} cannot be used in 1-bit expression`, ctx);
      }
      if (info.kind === 'timer' || info.kind === 'counter') {
        plcError(`symbol '${expr.name}' cannot be used directly as boolean`, ctx);
      }
      if (info.width !== 1) {
        plcError(`expression requires 1-bit symbol, got ${expr.name} (${info.width} bits)`, ctx);
      }
    }
  }

  function checkExprNum(expr, ctx) {
    if (!expr) return;
    if (expr.type === 'num') return;
    if (expr.type === 'cmp') {
      plcError('comparison not allowed in numeric expression', ctx);
    }
    if (expr.type === 'unary') {
      if (expr.op === 'NOT') plcError('NOT not allowed in numeric expression', ctx);
      checkExprNum(expr.arg, ctx);
      return;
    }
    if (expr.type === 'binary') {
      if (expr.op === 'AND' || expr.op === 'OR' || expr.op === 'XOR') {
        plcError(`${expr.op} not allowed in numeric expression`, ctx);
      }
      checkExprNum(expr.left, ctx);
      checkExprNum(expr.right, ctx);
      return;
    }
    if (expr.type === 'member') {
      if (expr.field === 'CV') {
        if (!counters.has(expr.base)) plcError(`unknown counter '${expr.base}' in .CV`, ctx);
        return;
      }
      if (expr.field === 'Q') {
        plcError('.Q cannot be used in numeric expression', ctx);
      }
      plcError(`unknown member field '${expr.field}'`, ctx);
    }
    if (expr.type === 'symbol') {
      const info = symInfo(expr.name);
      if (!info) plcError(`unknown symbol ${expr.name}`, ctx);
      if (info.kind === 'timer' || info.kind === 'counter') {
        plcError(`'${expr.name}' cannot be used in numeric expression`, ctx);
      }
    }
  }

  function checkAssignSymbolWidth(expr, targetWidth, ctx) {
    if (expr.type === 'symbol') {
      const info = symInfo(expr.name);
      if (info && info.kind !== 'const' && info.kind !== 'timer' && info.kind !== 'counter') {
        if (info.width !== targetWidth) {
          plcError(`width mismatch: ${expr.name} (${info.width} bits) cannot assign to ${targetWidth}-bit target`, ctx);
        }
      }
    }
  }

  function checkCaseSelector(sel, ctx) {
    if (sel.type === 'member' && sel.field === 'CV') {
      if (!counters.has(sel.base)) plcError(`unknown counter '${sel.base}' in CASE selector`, ctx);
      return;
    }
    if (sel.type === 'symbol') {
      const info = symInfo(sel.name);
      if (!info) plcError(`unknown symbol ${sel.name} in CASE selector`, ctx);
      if (info.kind === 'const') {
        plcError(`CONST cannot be CASE selector; use symbol or name.CV`, ctx);
      }
      if (info.kind === 'timer' || info.kind === 'counter') {
        plcError(`CASE selector must be symbol or name.CV`, ctx);
      }
      return;
    }
    plcError('invalid CASE selector', ctx);
  }

  function checkForBound(bound, ctx) {
    if (!bound) return;
    checkExprNum(bound, ctx);
  }

  function checkStmt(stmt, loopDepth) {
    const depth = loopDepth || 0;
    if (stmt.type === 'assign') {
      const targetInfo = symInfo(stmt.target);
      if (!targetInfo) plcError(`unknown symbol ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'input') plcError(`cannot assign to input ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'const') plcError(`cannot assign to CONST ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'timer') plcError(`cannot assign to timer ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'counter') plcError(`cannot assign to counter ${stmt.target}`, stmt.line);
      if (targetInfo.width > 1) {
        checkExprNum(stmt.expr, stmt.line);
        checkAssignSymbolWidth(stmt.expr, targetInfo.width, stmt.line);
      } else {
        checkExprBool(stmt.expr, stmt.line);
      }
    } else if (stmt.type === 'ton' || stmt.type === 'tof') {
      checkExprBool(stmt.inExpr, stmt.line);
    } else if (stmt.type === 'ctu' || stmt.type === 'ctd') {
      checkExprBool(stmt.pulseExpr, stmt.line);
      checkExprBool(stmt.resetExpr, stmt.line);
    } else if (stmt.type === 'if') {
      checkExprBool(stmt.cond, stmt.line);
      for (const s of stmt.thenBody) checkStmt(s, depth);
      for (const e of stmt.elsif || []) {
        checkExprBool(e.cond, stmt.line);
        for (const s of e.body) checkStmt(s, depth);
      }
      for (const s of stmt.elseBody || []) checkStmt(s, depth);
    } else if (stmt.type === 'case') {
      checkCaseSelector(stmt.selector, stmt.line);
      for (const b of stmt.branches || []) {
        for (const s of b.body) checkStmt(s, depth);
      }
      for (const s of stmt.elseBody || []) checkStmt(s, depth);
    } else if (stmt.type === 'for') {
      const ctrl = symInfo(stmt.control);
      if (!ctrl || ctrl.kind !== 'var') {
        plcError(`FOR control '${stmt.control}' must be declared in VAR`, stmt.line);
      }
      checkForBound(stmt.start, stmt.line);
      checkForBound(stmt.end, stmt.line);
      checkForBound(stmt.step, stmt.line);
      for (const s of stmt.body || []) checkStmt(s, depth + 1);
    } else if (stmt.type === 'while') {
      checkExprBool(stmt.cond, stmt.line);
      for (const s of stmt.body || []) checkStmt(s, depth + 1);
    } else if (stmt.type === 'repeat') {
      checkExprBool(stmt.cond, stmt.line);
      for (const s of stmt.body || []) checkStmt(s, depth + 1);
    } else if (stmt.type === 'return') {
      /* ok */
    } else if (stmt.type === 'exit') {
      if (depth < 1) plcError('EXIT outside loop', stmt.line);
    }
  }

  for (const stmt of parsed.statements || []) checkStmt(stmt, 0);
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
    vars: parsed.vars,
    consts: parsed.consts,
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

function plcEvalInt(expr, env, timerState, counterState, consts, line) {
  if (!expr) return 0;
  const errLine = line || expr.line;
  if (expr.type === 'num') return expr.value >>> 0;
  if (expr.type === 'symbol') {
    if (consts && consts[expr.name] != null) return consts[expr.name].value >>> 0;
    return plcBitsToInt(env.get(expr.name)) >>> 0;
  }
  if (expr.type === 'member' && expr.field === 'CV') {
    return plcCounterCV(counterState, expr.base) >>> 0;
  }
  if (expr.type === 'unary' && expr.op === 'NEG') {
    const v = plcEvalInt(expr.arg, env, timerState, counterState, consts, errLine);
    return (0 - v) >>> 0;
  }
  if (expr.type === 'binary') {
    if (expr.op === 'AND' || expr.op === 'OR' || expr.op === 'XOR') {
      return plcEvalBool(expr, env, timerState, counterState, consts, errLine) === '1' ? 1 : 0;
    }
    const a = plcEvalInt(expr.left, env, timerState, counterState, consts, errLine) >>> 0;
    const b = plcEvalInt(expr.right, env, timerState, counterState, consts, errLine) >>> 0;
    if (expr.op === '+') return (a + b) >>> 0;
    if (expr.op === '-') return (a - b) >>> 0;
    if (expr.op === '*') return (a * b) >>> 0;
    if (expr.op === '/') {
      if (b === 0) plcError('division by zero', errLine);
      return Math.floor(a / b) >>> 0;
    }
    if (expr.op === 'MOD') {
      if (b === 0) plcError('MOD by zero', errLine);
      return (a % b) >>> 0;
    }
  }
  if (expr.type === 'cmp') {
    return plcEvalBool(expr, env, timerState, counterState, consts, errLine) === '1' ? 1 : 0;
  }
  if (expr.type === 'unary' && expr.op === 'NOT') {
    return plcEvalBool(expr, env, timerState, counterState, consts, errLine) === '1' ? 1 : 0;
  }
  return 0;
}

function plcEvalBool(expr, env, timerState, counterState, consts, line) {
  if (!expr) return '0';
  if (expr.type === 'cmp') {
    const l = plcEvalInt(expr.left, env, timerState, counterState, consts, line || expr.line);
    const r = plcEvalInt(expr.right, env, timerState, counterState, consts, line || expr.line);
    const op = expr.op;
    if (op === '>=') return l >= r ? '1' : '0';
    if (op === '<=') return l <= r ? '1' : '0';
    if (op === '>') return l > r ? '1' : '0';
    if (op === '<') return l < r ? '1' : '0';
    if (op === '==') return l === r ? '1' : '0';
    if (op === '!=') return l !== r ? '1' : '0';
    return '0';
  }
  if (expr.type === 'num') return expr.value ? '1' : '0';
  if (expr.type === 'symbol') {
    return plcBit(env.get(expr.name));
  }
  if (expr.type === 'member' && expr.field === 'Q') {
    const tq = plcTimerQ(timerState, expr.base);
    if (tq !== '0') return tq;
    return plcCounterQ(counterState, expr.base);
  }
  if (expr.type === 'unary' && expr.op === 'NOT') {
    return plcEvalBool(expr.arg, env, timerState, counterState, consts, line) === '1' ? '0' : '1';
  }
  if (expr.type === 'binary') {
    const a = plcEvalBool(expr.left, env, timerState, counterState, consts, line) === '1';
    const b = plcEvalBool(expr.right, env, timerState, counterState, consts, line) === '1';
    if (expr.op === 'AND') return (a && b) ? '1' : '0';
    if (expr.op === 'OR') return (a || b) ? '1' : '0';
    if (expr.op === 'XOR') return (a !== b) ? '1' : '0';
  }
  return '0';
}

function plcEvalExpr(expr, env, timerState, counterState, consts, line) {
  return plcEvalBool(expr, env, timerState, counterState, consts, line);
}

function plcEnsureTimerState(timerState, name) {
  if (!timerState[name]) timerState[name] = { et: 0, q: '0' };
  return timerState[name];
}

function plcEnsureCounterState(counterState, name) {
  if (!counterState[name]) counterState[name] = { cv: 0, q: '0', prevPulse: '0' };
  return counterState[name];
}

function plcExecTon(stmt, env, timerState, counterState, consts) {
  const inVal = plcEvalBool(stmt.inExpr, env, timerState, counterState, consts, stmt.line) === '1';
  const st = plcEnsureTimerState(timerState, stmt.name);
  if (inVal) {
    st.et += 1;
    st.q = (st.et >= stmt.pt) ? '1' : '0';
  } else {
    st.et = 0;
    st.q = '0';
  }
}

function plcExecTof(stmt, env, timerState, counterState, consts) {
  const inVal = plcEvalBool(stmt.inExpr, env, timerState, counterState, consts, stmt.line) === '1';
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

function plcExecCtu(stmt, env, timerState, counterState, consts) {
  const cuVal = plcEvalBool(stmt.pulseExpr, env, timerState, counterState, consts, stmt.line);
  const rVal = plcEvalBool(stmt.resetExpr, env, timerState, counterState, consts, stmt.line) === '1';
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

function plcExecCtd(stmt, env, timerState, counterState, consts) {
  const cdVal = plcEvalBool(stmt.pulseExpr, env, timerState, counterState, consts, stmt.line);
  const ldVal = plcEvalBool(stmt.resetExpr, env, timerState, counterState, consts, stmt.line) === '1';
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

function plcEvalCaseSelector(sel, env, counterState) {
  if (sel.type === 'member' && sel.field === 'CV') {
    return plcCounterCV(counterState, sel.base);
  }
  if (sel.type === 'symbol') {
    const w = env.get(sel.name);
    if (w != null && String(w).length > 1) return plcBitsToInt(w);
    return plcBit(env.get(sel.name)) === '1' ? 1 : 0;
  }
  return 0;
}

function plcBitsToInt(v) {
  if (v == null || v === '') return 0;
  const s = String(v);
  if (/^[01]+$/.test(s)) return parseInt(s, 2) || 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function plcIntToBits(n, width) {
  const w = width > 0 ? width : 1;
  let s = (n >>> 0).toString(2);
  return plcNormalizeBits(s, w);
}

function plcEvalBound(bound, env, timerState, counterState, consts, line) {
  if (!bound) return 0;
  return plcEvalInt(bound, env, timerState, counterState, consts, line);
}

function plcExecStmtList(stmts, env, timerState, counterState, flow, consts, varWidths) {
  for (const s of stmts || []) {
    plcExecStmt(s, env, timerState, counterState, flow, consts, varWidths);
    if (flow && (flow.returned || flow.exited)) return;
  }
}

function plcExecStmt(stmt, env, timerState, counterState, flow, consts, varWidths) {
  if (flow && (flow.returned || flow.exited)) return;
  if (stmt.type === 'return') {
    if (flow) flow.returned = true;
    return;
  }
  if (stmt.type === 'exit') {
    if (flow) flow.exited = true;
    return;
  }
  if (stmt.type === 'assign') {
    const tw = (varWidths && varWidths[stmt.target]) || 1;
    if (tw > 1) {
      const n = plcEvalInt(stmt.expr, env, timerState, counterState, consts, stmt.line);
      env.set(stmt.target, plcIntToBits(n, tw));
    } else {
      env.set(stmt.target, plcEvalBool(stmt.expr, env, timerState, counterState, consts, stmt.line));
    }
    return;
  }
  if (stmt.type === 'ton') {
    plcExecTon(stmt, env, timerState, counterState, consts);
    return;
  }
  if (stmt.type === 'tof') {
    plcExecTof(stmt, env, timerState, counterState, consts);
    return;
  }
  if (stmt.type === 'ctu') {
    plcExecCtu(stmt, env, timerState, counterState, consts);
    return;
  }
  if (stmt.type === 'ctd') {
    plcExecCtd(stmt, env, timerState, counterState, consts);
    return;
  }
  if (stmt.type === 'if') {
    if (plcEvalBool(stmt.cond, env, timerState, counterState, consts, stmt.line) === '1') {
      plcExecStmtList(stmt.thenBody, env, timerState, counterState, flow, consts, varWidths);
      return;
    }
    for (const e of stmt.elsif || []) {
      if (plcEvalBool(e.cond, env, timerState, counterState, consts, stmt.line) === '1') {
        plcExecStmtList(e.body, env, timerState, counterState, flow, consts, varWidths);
        return;
      }
    }
    plcExecStmtList(stmt.elseBody, env, timerState, counterState, flow, consts, varWidths);
    return;
  }
  if (stmt.type === 'case') {
    const selVal = plcEvalCaseSelector(stmt.selector, env, counterState);
    for (const b of stmt.branches || []) {
      if (b.value === selVal) {
        plcExecStmtList(b.body, env, timerState, counterState, flow, consts, varWidths);
        return;
      }
    }
    plcExecStmtList(stmt.elseBody, env, timerState, counterState, flow, consts, varWidths);
    return;
  }
  if (stmt.type === 'for') {
    const start = plcEvalBound(stmt.start, env, timerState, counterState, consts, stmt.line);
    const end = plcEvalBound(stmt.end, env, timerState, counterState, consts, stmt.line);
    const step = plcEvalBound(stmt.step, env, timerState, counterState, consts, stmt.line);
    if (step === 0) plcError('FOR BY step must not be 0', stmt.line);
    const width = (varWidths && varWidths[stmt.control]) || 1;
    let iters = 0;
    if (step > 0) {
      for (let i = start; i <= end; i += step) {
        env.set(stmt.control, plcIntToBits(i, width));
        plcExecStmtList(stmt.body, env, timerState, counterState, flow, consts, varWidths);
        if (flow && flow.returned) return;
        if (flow && flow.exited) { flow.exited = false; break; }
        iters++;
        if (iters > PLC_LOOP_MAX_ITERS) plcError('loop iteration limit exceeded', stmt.line);
      }
    } else {
      for (let i = start; i >= end; i += step) {
        env.set(stmt.control, plcIntToBits(i, width));
        plcExecStmtList(stmt.body, env, timerState, counterState, flow, consts, varWidths);
        if (flow && flow.returned) return;
        if (flow && flow.exited) { flow.exited = false; break; }
        iters++;
        if (iters > PLC_LOOP_MAX_ITERS) plcError('loop iteration limit exceeded', stmt.line);
      }
    }
    return;
  }
  if (stmt.type === 'while') {
    let iters = 0;
    while (plcEvalBool(stmt.cond, env, timerState, counterState, consts, stmt.line) === '1') {
      plcExecStmtList(stmt.body, env, timerState, counterState, flow, consts, varWidths);
      if (flow && flow.returned) return;
      if (flow && flow.exited) { flow.exited = false; break; }
      iters++;
      if (iters > PLC_LOOP_MAX_ITERS) plcError('loop iteration limit exceeded', stmt.line);
    }
    return;
  }
  if (stmt.type === 'repeat') {
    let iters = 0;
    do {
      plcExecStmtList(stmt.body, env, timerState, counterState, flow, consts, varWidths);
      if (flow && flow.returned) return;
      if (flow && flow.exited) { flow.exited = false; break; }
      iters++;
      if (iters > PLC_LOOP_MAX_ITERS) plcError('loop iteration limit exceeded', stmt.line);
    } while (plcEvalBool(stmt.cond, env, timerState, counterState, consts, stmt.line) !== '1');
  }
}

function executePlcScan(inst, externalInputs, outputState, timerState, counterState, varState) {
  const inputs = inst.inputs || {};
  const outputs = inst.outputs || {};
  const vars = inst.vars || {};
  const consts = inst.consts || {};
  const env = new Map();
  const timers = timerState || {};
  const counters = counterState || {};
  const vstate = varState || {};
  const varWidths = {};
  for (const name of Object.keys(vars)) varWidths[name] = vars[name].width || 1;
  for (const name of Object.keys(outputs)) varWidths[name] = outputs[name].width || 1;

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
  for (const name of Object.keys(vars)) {
    const w = vars[name].width;
    let val = vstate[name];
    if (val == null) val = '0'.repeat(w);
    env.set(name, plcNormalizeBits(val, w));
  }
  for (const name of Object.keys(consts)) {
    const v = consts[name].value;
    if (v === 0 || v === 1) env.set(name, String(v));
  }

  const flow = { returned: false, exited: false };
  plcExecStmtList(inst.statements, env, timers, counters, flow, consts, varWidths);

  const out = outputState || {};
  for (const name of Object.keys(outputs)) {
    out[name] = env.get(name) || '0';
  }
  for (const name of Object.keys(vars)) {
    const w = vars[name].width;
    vstate[name] = plcNormalizeBits(env.get(name), w);
  }
  return out;
}

function formatPlcExpr(expr) {
  if (!expr) return '';
  if (expr.type === 'num') return String(expr.value);
  if (expr.type === 'symbol') return expr.name;
  if (expr.type === 'member') return `${expr.base}.${expr.field}`;
  if (expr.type === 'cmp') return `${formatPlcExpr(expr.left)} ${expr.op} ${formatPlcExpr(expr.right)}`;
  if (expr.type === 'unary' && expr.op === 'NOT') return `NOT ${formatPlcExpr(expr.arg)}`;
  if (expr.type === 'unary' && expr.op === 'NEG') return `- ${formatPlcExpr(expr.arg)}`;
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
  if (stmt.type === 'return') {
    return `${pad}RETURN`;
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
  if (stmt.type === 'case') {
    const lines = [`${pad}CASE ${formatPlcExpr(stmt.selector)} OF`];
    for (const b of stmt.branches || []) {
      lines.push(`${pad}  ${b.value}:`);
      for (const s of b.body) lines.push(formatPlcStmt(s, indent + 2));
    }
    if (stmt.elseBody && stmt.elseBody.length) {
      lines.push(`${pad}  ELSE`);
      for (const s of stmt.elseBody) lines.push(formatPlcStmt(s, indent + 2));
    }
    lines.push(`${pad}END_CASE`);
    return lines.join('\n');
  }
  if (stmt.type === 'for') {
    const fmtB = (b) => {
      if (!b) return '?';
      if (b.type === 'num') return String(b.value);
      return formatPlcExpr(b);
    };
    const byPart = (stmt.step && !(stmt.step.type === 'num' && stmt.step.value === 1))
      ? ` BY ${fmtB(stmt.step)}` : '';
    const lines = [`${pad}FOR ${stmt.control} := ${fmtB(stmt.start)} TO ${fmtB(stmt.end)}${byPart} DO`];
    for (const s of stmt.body || []) lines.push(formatPlcStmt(s, indent + 1));
    lines.push(`${pad}END_FOR`);
    return lines.join('\n');
  }
  if (stmt.type === 'while') {
    const lines = [`${pad}WHILE ${formatPlcExpr(stmt.cond)} DO`];
    for (const s of stmt.body || []) lines.push(formatPlcStmt(s, indent + 1));
    lines.push(`${pad}END_WHILE`);
    return lines.join('\n');
  }
  if (stmt.type === 'repeat') {
    const lines = [`${pad}REPEAT`];
    for (const s of stmt.body || []) lines.push(formatPlcStmt(s, indent + 1));
    lines.push(`${pad}UNTIL ${formatPlcExpr(stmt.cond)}`);
    lines.push(`${pad}END_REPEAT`);
    return lines.join('\n');
  }
  if (stmt.type === 'exit') {
    return `${pad}EXIT`;
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
  lines.push(...formatPlcSymbolTable('VAR', inst.vars));
  const constNames = Object.keys(inst.consts || {});
  lines.push('  CONST:');
  if (!constNames.length) lines.push('    (none)');
  else for (const n of constNames) lines.push(`    ${n} = ${(inst.consts[n].value)}`);
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
  lines.push('    inputs read-only; outputs and VAR readable/writable in same scan');
  lines.push('    VAR persists between scans; resets on re-RUN');
  lines.push('    CONST read-only; CASE first match; RETURN ends scan body');
  lines.push('    TON/TOF advance once per scan; PT is scan count');
  lines.push('    CTU/CTD count rising edges per scan; PV is preset');
  return lines;
}

function plcFingerprintProgram(inst) {
  const items = [];
  for (const n of Object.keys(inst && inst.vars || {}).sort()) {
    items.push(`v:${n}:${(inst.vars[n].width || 1)}`);
  }
  for (const n of Object.keys(inst && inst.consts || {}).sort()) {
    items.push(`c:${n}:${inst.consts[n].value}`);
  }
  plcWalkStatements(inst && inst.statements, (stmt) => {
    if (stmt.type === 'ton' || stmt.type === 'tof' || stmt.type === 'ctu' || stmt.type === 'ctd') {
      items.push(`${stmt.name}:${stmt.type}`);
    }
  });
  items.sort();
  return items.join('|');
}

function formatPlcTypeDoc() {
  return [
    'inline [plc] .name:',
    '  inputs: { START, STOP: 1 }',
    '  outputs: { MOTOR }',
    '  VAR',
    '    latch: 1',
    '  END_VAR',
    '  CONST',
    '    MODE_RUN = 1',
    '  END_CONST',
    '  TON startDelay(IN := START, PT := 50)',
    '  CASE latch OF',
    '    0:',
    '      MOTOR = FALSE',
    '    1:',
    '      MOTOR = TRUE',
    '    ELSE',
    '      MOTOR = FALSE',
    '  END_CASE',
    '  :',
    '',
    'Keywords: IF THEN ELSE ELSIF END_IF CASE OF END_CASE RETURN',
    '          FOR TO BY DO END_FOR WHILE END_WHILE REPEAT UNTIL END_REPEAT EXIT',
    '          VAR END_VAR CONST END_CONST AND OR NOT XOR TRUE FALSE',
    '          MOD + - * / comparisons > < >= <= == !=',
    '          TON TOF CTU CTD',
    'Timers: PT = preset in scan cycles; read Q as name.Q',
    'Counters: PV = preset; read Q as name.Q; compare CV as name.CV >= N',
    'Multi-bit: unsigned integers; arithmetic + - * / MOD; overflow wraps to symbol width',
    'VAR: internal memory between scans (reset on re-RUN); CONST: read-only',
    'CASE: selector is symbol (any width) or name.CV; first matching label wins',
    'Loops: FOR/WHILE/REPEAT run fully in one scan; EXIT leaves innermost loop; max 65535 iters',
    'RETURN: stop remaining statements in this scan',
    'Bind with comp [plc] program: .name and I/O map (see doc/plc.md and doc/plc-language.md)',
    'comp [plc] retain: 0/1 (default 0) — preserve timer/counter FB state on re-RUN in same session',
    'comp [plc] retainVar: 0/1 (default 0) — preserve VAR state on re-RUN in same session',
  ];
}

const plcAssemblerExports = {
  parsePlcBody,
  executePlcScan,
  formatPlcInstanceDoc,
  formatPlcTypeDoc,
  plcFingerprintProgram,
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
  globalThis.plcFingerprintProgram = plcFingerprintProgram;
  globalThis.plcTimerQ = plcTimerQ;
  globalThis.plcCounterQ = plcCounterQ;
  globalThis.plcCounterCV = plcCounterCV;
}
