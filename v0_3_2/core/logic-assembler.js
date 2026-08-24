/* ================= LOGIC ASSEMBLER (inline [logic]) ================= */

const LOGIC_KEYWORDS = new Set(['query', 'use', 'constraint', 'as']);
const LOGIC_MUTATION_BIND_TYPES = new Set(['text', 'bool', 'number']);
const LOGIC_BUILTIN_SHOW_PRED = 'show';
const LOGIC_BUILTIN_NTH0_PRED = 'nth0';
const LOGIC_BUILTIN_NTH1_PRED = 'nth1';
const LOGIC_BUILTIN_IS_PRED = 'is';
const LOGIC_BUILTIN_MEMBER_PRED = 'member';
const LOGIC_BUILTIN_APPEND_PRED = 'append';
const LOGIC_BUILTIN_LENGTH_PRED = 'length';
const LOGIC_BUILTIN_REVERSE_PRED = 'reverse';
const LOGIC_BUILTIN_SORT_PRED = 'sort';
const LOGIC_BUILTIN_ATOM_PRED = 'atom';
const LOGIC_BUILTIN_NUMBER_PRED = 'number';
const LOGIC_BUILTIN_LIST_PRED = 'list';
const LOGIC_BUILTIN_COMPOUND_PRED = 'compound';
const LOGIC_BUILTIN_RANDOM_BETWEEN_PRED = 'random_between';
const LOGIC_BUILTIN_SET_RANDOM_PRED = 'set_random';
const LOGIC_BUILTIN_LAST_PRED = 'last';
const LOGIC_BUILTIN_SELECT_PRED = 'select';
const LOGIC_BUILTIN_SELECTCHK_PRED = 'selectchk';
const LOGIC_BUILTIN_FLATTEN_PRED = 'flatten';
const LOGIC_BUILTIN_SAME_LENGTH_PRED = 'same_length';
const LOGIC_BUILTIN_TYPE_PREDS = new Set([
  LOGIC_BUILTIN_ATOM_PRED,
  LOGIC_BUILTIN_NUMBER_PRED,
  LOGIC_BUILTIN_LIST_PRED,
  LOGIC_BUILTIN_COMPOUND_PRED,
]);
const LOGIC_BUILTIN_RESERVED_HEADS = new Set([
  LOGIC_BUILTIN_SHOW_PRED,
  LOGIC_BUILTIN_NTH0_PRED,
  LOGIC_BUILTIN_NTH1_PRED,
]);
const LOGIC_BUILTIN_RESERVED_ARITIES = {
  [LOGIC_BUILTIN_MEMBER_PRED]: [2],
  [LOGIC_BUILTIN_APPEND_PRED]: [3],
  [LOGIC_BUILTIN_LENGTH_PRED]: [2],
  [LOGIC_BUILTIN_REVERSE_PRED]: [2],
  [LOGIC_BUILTIN_SORT_PRED]: [2],
  [LOGIC_BUILTIN_ATOM_PRED]: [1],
  [LOGIC_BUILTIN_NUMBER_PRED]: [1],
  [LOGIC_BUILTIN_LIST_PRED]: [1],
  [LOGIC_BUILTIN_COMPOUND_PRED]: [1],
  [LOGIC_BUILTIN_RANDOM_BETWEEN_PRED]: [3],
  [LOGIC_BUILTIN_SET_RANDOM_PRED]: [1],
  [LOGIC_BUILTIN_LAST_PRED]: [2],
  [LOGIC_BUILTIN_SELECT_PRED]: [3],
  [LOGIC_BUILTIN_SELECTCHK_PRED]: [3],
  [LOGIC_BUILTIN_FLATTEN_PRED]: [2],
  [LOGIC_BUILTIN_SAME_LENGTH_PRED]: [2],
};
const LOGIC_SHOW_MAX_ARGS = 32;
const LOGIC_LIST_MAX_ELEMENTS = 1024;

function logicError(msg, line) {
  if (line != null) throw new Error(`logic program line ${line}: ${msg}`);
  throw new Error(`logic program: ${msg}`);
}

function logicIsVarName(name) {
  if (!name || name === '_') return true;
  const ch = name.charAt(0);
  return ch === '_' || (ch >= 'A' && ch <= 'Z');
}

function logicIsAtomName(name) {
  if (!name) return false;
  const ch = name.charAt(0);
  return ch >= 'a' && ch <= 'z';
}

function logicTokenize(src) {
  const tokens = [];
  let line = 1;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') { line++; i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === ';') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    const startLine = line;
    if (ch === ',' ) { tokens.push({ type: 'COMMA', value: ',', line: startLine }); i++; continue; }
    if (ch === '[' ) { tokens.push({ type: 'LBRACKET', value: '[', line: startLine }); i++; continue; }
    if (ch === ']' ) { tokens.push({ type: 'RBRACKET', value: ']', line: startLine }); i++; continue; }
    if (ch === '|' ) { tokens.push({ type: 'PIPE', value: '|', line: startLine }); i++; continue; }
    if (ch === '(' ) { tokens.push({ type: 'LP', value: '(', line: startLine }); i++; continue; }
    if (ch === ')' ) { tokens.push({ type: 'RP', value: ')', line: startLine }); i++; continue; }
    if (ch === '.' ) { tokens.push({ type: 'DOT', value: '.', line: startLine }); i++; continue; }
    if (ch === ':' ) { tokens.push({ type: 'COLON', value: ':', line: startLine }); i++; continue; }
    if (ch === '\\' && src[i + 1] === '+') {
      tokens.push({ type: 'NOT', value: '\\+', line: startLine }); i += 2; continue;
    }
    if (ch === '!') {
      tokens.push({ type: 'BANG', value: '!', line: startLine }); i++; continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'OP', value: ch, line: startLine }); i++; continue;
    }
    if (ch === '<' && src[i + 1] === '-') {
      tokens.push({ type: 'ARROW', value: '<-', line: startLine }); i += 2; continue;
    }
    if (ch === '=' && src[i + 1] === ':') {
      tokens.push({ type: 'CMP', value: '=:=', line: startLine }); i += 2; continue;
    }
    if (ch === '=' && src[i + 1] === '<') {
      tokens.push({ type: 'CMP', value: '=<', line: startLine }); i += 2; continue;
    }
    if (ch === '=' && src[i + 1] === '\\' && src[i + 2] === '=') {
      tokens.push({ type: 'CMP', value: '=\\=', line: startLine }); i += 3; continue;
    }
    if (ch === '<' && src[i + 1] === '=') {
      tokens.push({ type: 'CMP', value: '=<', line: startLine }); i += 2; continue;
    }
    if (ch === '>' && src[i + 1] === '=') {
      tokens.push({ type: 'CMP', value: '>=', line: startLine }); i += 2; continue;
    }
    if (ch === '<') { tokens.push({ type: 'CMP', value: '<', line: startLine }); i++; continue; }
    if (ch === '>') { tokens.push({ type: 'CMP', value: '>', line: startLine }); i++; continue; }
    if (ch === '=') { tokens.push({ type: 'EQ', value: '=', line: startLine }); i++; continue; }
    if (ch === '"') {
      i++;
      let s = '';
      while (i < src.length) {
        const c = src[i];
        if (c === '"') { i++; break; }
        if (c === '\\' && i + 1 < src.length) {
          const esc = src[i + 1];
          if (esc === '"' || esc === '\\') { s += esc; i += 2; continue; }
          logicError('invalid escape in string literal', startLine);
        }
        if (c === '\n') logicError('unterminated string literal', startLine);
        s += c;
        i++;
      }
      tokens.push({ type: 'STRING', value: s, line: startLine });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '-' && i + 1 < src.length && /[0-9]/.test(src[i + 1]))) {
      let n = '';
      if (ch === '-') { n += '-'; i++; }
      while (i < src.length && /[0-9]/.test(src[i])) n += src[i++];
      tokens.push({ type: 'NUMBER', value: parseInt(n, 10), line: startLine });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let id = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) id += src[i++];
      if (LOGIC_KEYWORDS.has(id)) tokens.push({ type: 'KW', value: id, line: startLine });
      else tokens.push({ type: 'ID', value: id, line: startLine });
      continue;
    }
    logicError(`unexpected character '${ch}'`, startLine);
  }
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

class LogicParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }
  advance() { return this.tokens[this.pos++]; }
  at(type, value) {
    const t = this.peek();
    return t.type === type && (value == null || t.value === value);
  }
  expect(type, value) {
    const t = this.peek();
    if (t.type !== type || (value != null && t.value !== value)) {
      logicError(`expected ${value != null ? value : type}, got ${t.value || t.type}`, t.line);
    }
    return this.advance();
  }

  parseProgram() {
    const uses = [];
    const queries = [];
    const clauses = [];
    const constraints = [];
    while (!this.at('EOF')) {
      while (this.at('COMMA')) this.advance();
      if (this.at('EOF')) break;
      if (this.at('KW', 'use')) {
        const useLine = this.peek().line;
        this.advance();
        let mode = 'strict';
        if (this.at('ID', 'once')) {
          this.advance();
          mode = 'once';
        }
        if (!this.at('DOT')) logicError('expected inline reference after use', this.peek().line);
        this.advance();
        const refName = this.expect('ID').value;
        let alias = null;
        if (this.at('KW', 'as')) {
          this.advance();
          if (!this.at('ID')) {
            logicError('expected alias name after as', this.peek().line);
          }
          alias = this.advance().value;
          if (!logicIsAtomName(alias)) {
            logicError(`alias '${alias}' must be a lowercase atom`, this.peek().line);
          }
        }
        uses.push({ ref: '.' + refName, mode, line: useLine, alias });
        continue;
      }
      if (this.at('KW', 'query')) {
        this.advance();
        const qName = this.expect('ID').value;
        this.expect('COLON');
        const goals = this.parseBodyGoals();
        queries.push({ name: qName, goals });
        continue;
      }
      if (this.at('KW', 'constraint')) {
        const constraintLine = this.peek().line;
        this.advance();
        const head = this.parseCompound();
        if (!this.at('CMP', '=<')) {
          logicError('constraint requires <= neck (write <= in source)', this.peek().line);
        }
        this.advance();
        const body = this.parseBodyGoals();
        constraints.push({ head, body, constraintIndex: constraints.length + 1, line: constraintLine });
        continue;
      }
      const clause = this.parseClause();
      clauses.push(clause);
    }
    return { uses, queries, clauses, constraints };
  }

  parseClause() {
    const line = this.peek().line;
    const head = this.parseCompound();
    let body = [];
    if (this.at('ARROW')) {
      this.advance();
      body = this.parseBodyGoals();
    }
    return { head, body, line };
  }

  parseBodyGoals() {
    const goals = [];
    goals.push(this.parseBodyGoal());
    while (this.at('COMMA')) {
      this.advance();
      goals.push(this.parseBodyGoal());
    }
    return goals;
  }

  parseBodyGoal() {
    if (this.at('NOT')) {
      this.advance();
      return { kind: 'not', goal: this.parseBodyGoal() };
    }
    if (this.at('BANG')) {
      this.advance();
      return { kind: 'cut' };
    }
    if (this.at('ID', LOGIC_BUILTIN_IS_PRED) && !this.looksLikeCompound()) {
      logicError('expected term before is', this.peek().line);
    }
    if (this.looksLikeCompound()) {
      const compound = this.parseCompound();
      return { kind: 'call', predicate: compound.predicate, args: compound.args };
    }
    const left = this.parseExpr();
    if (this.at('CMP')) {
      const op = this.advance().value;
      const right = this.parseExpr();
      return { kind: 'cmp', op, left, right };
    }
    if (this.at('EQ')) {
      this.advance();
      const right = this.parseExpr();
      return { kind: 'unify', left, right };
    }
    if (this.at('ID', LOGIC_BUILTIN_IS_PRED)) {
      const isLine = this.peek().line;
      this.advance();
      if (this.at('COMMA') || this.at('RP') || this.at('EOF')) {
        logicError('expected expression after is', isLine);
      }
      const right = this.parseExpr();
      return { kind: 'is', left, right };
    }
    if (left.kind === 'compound') return { kind: 'call', ...left };
    if (left.kind === 'list') {
      logicError('bare list term is not a goal — use = or call a predicate', this.peek().line);
    }
    logicError('invalid body goal', this.peek().line);
  }

  looksLikeCompound() {
    let look = this.pos;
    if (look >= this.tokens.length || this.tokens[look].type !== 'ID') return false;
    look++;
    while (look < this.tokens.length && this.tokens[look].type === 'DOT') {
      look++;
      if (look >= this.tokens.length || this.tokens[look].type !== 'ID') return false;
      look++;
    }
    return look < this.tokens.length && this.tokens[look].type === 'LP';
  }

  parseCompound() {
    const startLine = this.peek().line;
    let predicate = this.expect('ID').value;
    while (this.at('DOT')) {
      this.advance();
      if (!this.at('ID')) {
        logicError('expected predicate name after .', this.peek().line);
      }
      predicate += '.' + this.advance().value;
    }
    this.expect('LP');
    const args = [];
    const parseArg = predicate === LOGIC_BUILTIN_IS_PRED
      ? () => this.parseExpr()
      : () => this.parseTerm();
    if (!this.at('RP')) {
      args.push(parseArg());
      while (this.at('COMMA')) {
        this.advance();
        args.push(parseArg());
      }
    }
    this.expect('RP');
    const compound = { kind: 'compound', predicate, args };
    if (predicate === LOGIC_BUILTIN_SHOW_PRED) logicValidateShowCall(args, startLine);
    return compound;
  }

  parseTerm() {
    if (this.at('LBRACKET')) {
      return this.parseList();
    }
    if (this.at('OP', '-')) {
      this.advance();
      if (this.at('NUMBER')) {
        return { kind: 'number', value: -this.advance().value };
      }
      logicError('expected number after unary -', this.peek().line);
    }
    if (this.at('NUMBER')) {
      const v = this.advance().value;
      return { kind: 'number', value: v };
    }
    if (this.at('STRING')) {
      const v = this.advance().value;
      return { kind: 'atom', name: v, logicTraceAsString: true };
    }
    if (this.looksLikeCompound()) {
      return this.parseCompound();
    }
    if (this.at('ID')) {
      const name = this.advance().value;
      if (logicIsVarName(name)) return { kind: 'var', name };
      if (logicIsAtomName(name)) return { kind: 'atom', name };
      logicError(`invalid term '${name}'`, this.peek().line);
    }
    logicError('expected term', this.peek().line);
  }

  parseExpr() {
    let node = this.parseTerm();
    while (this.at('OP') && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseTerm();
      node = { kind: 'arith', op, left: node, right };
    }
    while (this.at('OP') && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value;
      const right = this.parseTerm();
      node = { kind: 'arith', op, left: node, right };
    }
    return node;
  }

  parseList() {
    const line = this.peek().line;
    this.expect('LBRACKET');
    if (this.at('RBRACKET')) {
      this.advance();
      return { kind: 'list', nil: true };
    }
    const first = this.parseTerm();
    return this.finishListChain(first, 1, line);
  }

  finishListChain(head, count, line) {
    if (this.at('RBRACKET')) {
      this.advance();
      logicValidateListElementCount(count, line);
      return { kind: 'list', head, tail: { kind: 'list', nil: true } };
    }
    if (this.at('PIPE')) {
      this.advance();
      const tail = this.parseTerm();
      this.expect('RBRACKET');
      logicValidateListElementCount(count, line);
      return { kind: 'list', head, tail };
    }
    if (this.at('COMMA')) {
      this.advance();
      const nextCount = count + 1;
      if (nextCount > LOGIC_LIST_MAX_ELEMENTS) {
        logicError(`list literal accepts at most ${LOGIC_LIST_MAX_ELEMENTS} elements`, line);
      }
      const nextHead = this.parseTerm();
      const rest = this.finishListChain(nextHead, nextCount, line);
      return { kind: 'list', head, tail: rest };
    }
    logicError('expected , | or ] in list', this.peek().line);
  }

  parseMutationTerm() {
    if (this.at('ID') && LOGIC_MUTATION_BIND_TYPES.has(this.peek().value)) {
      const bindType = this.advance().value;
      let listFlag = false;
      if (this.at('ID') && this.peek().value === 'list') {
        this.advance();
        listFlag = true;
      }
      let eachFlag = false;
      if (this.at('ID') && this.peek().value === 'each') {
        this.advance();
        eachFlag = true;
      }
      if (!this.at('ID')) {
        logicError(
          `expected wire name after ${bindType}${listFlag ? ' list' : ''}${eachFlag ? ' each' : ''}`,
          this.peek().line,
        );
      }
      const wireName = this.advance().value;
      return { kind: 'wireRef', bindType, listFlag, eachFlag, wireName };
    }
    return this.parseTerm();
  }

  parseMutationCompound() {
    let predicate = this.expect('ID').value;
    while (this.at('DOT')) {
      this.advance();
      if (!this.at('ID')) {
        logicError('expected predicate name after .', this.peek().line);
      }
      predicate += '.' + this.advance().value;
    }
    this.expect('LP');
    const args = [];
    if (!this.at('RP')) {
      args.push(this.parseMutationTerm());
      while (this.at('COMMA')) {
        this.advance();
        args.push(this.parseMutationTerm());
      }
    }
    this.expect('RP');
    return { kind: 'compound', predicate, args };
  }

  parseMutationFactHead() {
    return this.parseMutationCompound();
  }
}

function parseLogicBody(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw);
  const tokens = logicTokenize(src);
  const parsed = new LogicParser(tokens).parseProgram();
  logicValidateProgram(parsed);
  return parsed;
}

function logicValidateShowCall(args, line) {
  const n = (args || []).length;
  if (n === 0) logicError('show requires at least 1 argument', line);
  if (n > LOGIC_SHOW_MAX_ARGS) {
    logicError(`show accepts at most ${LOGIC_SHOW_MAX_ARGS} arguments`, line);
  }
}

function logicValidateListElementCount(count, line) {
  if (count > LOGIC_LIST_MAX_ELEMENTS) {
    logicError(`list literal accepts at most ${LOGIC_LIST_MAX_ELEMENTS} elements`, line);
  }
}

function logicIsReservedPredicateHead(head) {
  if (!head || head.kind !== 'compound') return false;
  if (LOGIC_BUILTIN_RESERVED_HEADS.has(head.predicate)) return true;
  if (head.predicate === LOGIC_BUILTIN_IS_PRED && (head.args || []).length === 2) return true;
  const arities = LOGIC_BUILTIN_RESERVED_ARITIES[head.predicate];
  if (arities && arities.includes((head.args || []).length)) return true;
  return false;
}

function logicReservedHeadError(predicate, arity) {
  if (predicate === LOGIC_BUILTIN_SHOW_PRED) return "'show/N' is reserved — cannot define show as fact or rule head";
  if (predicate === LOGIC_BUILTIN_NTH0_PRED || predicate === LOGIC_BUILTIN_NTH1_PRED) {
    return `'${predicate}/3' is reserved — cannot define ${predicate} as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_IS_PRED && arity === 2) {
    return "'is/2' is reserved — cannot define is as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_MEMBER_PRED && arity === 2) {
    return "'member/2' is reserved — cannot define member as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_APPEND_PRED && arity === 3) {
    return "'append/3' is reserved — cannot define append as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_LENGTH_PRED && arity === 2) {
    return "'length/2' is reserved — cannot define length as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_REVERSE_PRED && arity === 2) {
    return "'reverse/2' is reserved — cannot define reverse as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SORT_PRED && arity === 2) {
    return "'sort/2' is reserved — cannot define sort as fact or rule head";
  }
  if (LOGIC_BUILTIN_TYPE_PREDS.has(predicate) && arity === 1) {
    return `'${predicate}/1' is reserved — cannot define ${predicate} as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_RANDOM_BETWEEN_PRED && arity === 3) {
    return "'random_between/3' is reserved — cannot define random_between as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SET_RANDOM_PRED && arity === 1) {
    return "'set_random/1' is reserved — cannot define set_random as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_LAST_PRED && arity === 2) {
    return "'last/2' is reserved — cannot define last as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SELECT_PRED && arity === 3) {
    return "'select/3' is reserved — cannot define select as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SELECTCHK_PRED && arity === 3) {
    return "'selectchk/3' is reserved — cannot define selectchk as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_FLATTEN_PRED && arity === 2) {
    return "'flatten/2' is reserved — cannot define flatten as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SAME_LENGTH_PRED && arity === 2) {
    return "'same_length/2' is reserved — cannot define same_length as fact or rule head";
  }
  return `'${predicate}' is reserved`;
}

function logicGoalContainsCut(goal) {
  if (!goal) return false;
  if (goal.kind === 'cut') return true;
  if (goal.kind === 'not') return logicGoalContainsCut(goal.goal);
  return false;
}

function logicValidateCutPlacement(prog) {
  function checkGoals(goals, inConstraint, line) {
    for (const g of goals || []) {
      if (g.kind === 'not' && logicGoalContainsCut(g.goal)) {
        logicError('cut is not allowed inside \\+ (...)', line);
      }
      if (g.kind === 'cut' && inConstraint) {
        logicError('cut is not allowed in constraint bodies', line);
      }
    }
  }
  for (const c of prog.clauses || []) {
    checkGoals(c.body, false, c.line);
  }
  for (const q of prog.queries || []) {
    checkGoals(logicQueryGoals(q), false, q.line);
  }
  for (const c of prog.constraints || []) {
    checkGoals(c.body, true, c.line);
  }
}

function logicValidateProgram(prog) {
  const aliases = new Set();
  for (const raw of prog.uses || []) {
    const u = logicNormalizeUseEntry(raw);
    if (u && u.alias) {
      if (aliases.has(u.alias)) {
        const line = u.line != null ? u.line : null;
        logicError(`alias '${u.alias}' already used`, line);
      }
      aliases.add(u.alias);
    }
  }
  for (const q of prog.queries || []) {
    if (!q.name || !logicQueryGoals(q).length) {
      throw new Error('logic query requires name and goal');
    }
  }
  for (const c of prog.clauses || []) {
    if (logicIsReservedPredicateHead(c.head)) {
      logicError(logicReservedHeadError(c.head.predicate, (c.head.args || []).length), c.line);
    }
  }
  for (const c of prog.constraints || []) {
    if (logicIsReservedPredicateHead(c.head)) {
      const pred = c.head.predicate;
      const arity = (c.head.args || []).length;
      if (pred === LOGIC_BUILTIN_SHOW_PRED) {
        logicError("'show/N' is reserved — cannot define show as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_IS_PRED && arity === 2) {
        logicError("'is/2' is reserved — cannot define is as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_MEMBER_PRED && arity === 2) {
        logicError("'member/2' is reserved — cannot define member as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_APPEND_PRED && arity === 3) {
        logicError("'append/3' is reserved — cannot define append as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_LENGTH_PRED && arity === 2) {
        logicError("'length/2' is reserved — cannot define length as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_REVERSE_PRED && arity === 2) {
        logicError("'reverse/2' is reserved — cannot define reverse as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SORT_PRED && arity === 2) {
        logicError("'sort/2' is reserved — cannot define sort as constraint head", c.line);
      } else if (LOGIC_BUILTIN_TYPE_PREDS.has(pred) && arity === 1) {
        logicError(`'${pred}/1' is reserved — cannot define ${pred} as constraint head`, c.line);
      } else if (pred === LOGIC_BUILTIN_RANDOM_BETWEEN_PRED && arity === 3) {
        logicError("'random_between/3' is reserved — cannot define random_between as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SET_RANDOM_PRED && arity === 1) {
        logicError("'set_random/1' is reserved — cannot define set_random as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_LAST_PRED && arity === 2) {
        logicError("'last/2' is reserved — cannot define last as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SELECT_PRED && arity === 3) {
        logicError("'select/3' is reserved — cannot define select as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SELECTCHK_PRED && arity === 3) {
        logicError("'selectchk/3' is reserved — cannot define selectchk as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_FLATTEN_PRED && arity === 2) {
        logicError("'flatten/2' is reserved — cannot define flatten as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SAME_LENGTH_PRED && arity === 2) {
        logicError("'same_length/2' is reserved — cannot define same_length as constraint head", c.line);
      } else {
        logicError(`'${pred}/3' is reserved — cannot define ${pred} as constraint head`, c.line);
      }
    }
  }
  logicValidateCutPlacement(prog);
}

function logicQueryGoals(q) {
  if (q && q.goals && q.goals.length) return q.goals;
  if (q && q.goal) return [q.goal];
  return [];
}

function logicListFreeVarsInGoal(goal) {
  const free = new Set();
  function walkTerm(t) {
    if (!t) return;
    if (t.kind === 'var' && t.name !== '_') free.add(t.name);
    else if (t.kind === 'compound') {
      for (const a of t.args || []) walkTerm(a);
    } else if (t.kind === 'list') {
      if (!t.nil) {
        walkTerm(t.head);
        walkTerm(t.tail);
      }
    } else if (t.kind === 'arith') {
      walkTerm(t.left); walkTerm(t.right);
    }
  }
  function walkGoal(g) {
    if (!g) return;
    if (g.kind === 'not') walkGoal(g.goal);
    else if (g.kind === 'cut') { /* no free vars */ }
    else if (g.kind === 'call' || g.kind === 'compound') {
      for (const a of g.args || []) walkTerm(a);
    }     else if (g.kind === 'cmp' || g.kind === 'unify' || g.kind === 'is') {
      walkTerm(g.left); walkTerm(g.right);
    }
  }
  walkGoal(goal);
  return [...free];
}

function logicListFreeVarsInGoals(goals) {
  const free = new Set();
  for (const g of goals || []) {
    for (const v of logicListFreeVarsInGoal(g)) free.add(v);
  }
  return [...free];
}

function logicCountFreeVarsInGoal(goal) {
  return logicListFreeVarsInGoal(goal).length;
}

function logicNormalizeUseEntry(u) {
  if (u == null) return null;
  if (typeof u === 'string') return { ref: u, mode: 'strict', line: null, alias: null };
  return {
    ref: u.ref,
    mode: u.mode === 'once' ? 'once' : 'strict',
    line: u.line != null ? u.line : null,
    alias: u.alias || null,
  };
}

function logicFormatUseEntry(u) {
  const e = logicNormalizeUseEntry(u);
  if (!e) return 'use ?';
  let s = e.mode === 'once' ? `use once ${e.ref}` : `use ${e.ref}`;
  if (e.alias) s += ` as ${e.alias}`;
  return s;
}

function logicReuseUseError(targetRef, chain, useLine) {
  const chainStr = (chain || []).join(' → ');
  const msg = `Cannot reuse inline logic ${targetRef}\n  via ${chainStr}`;
  logicError(msg, useLine);
}

function parseLogicProgramBlock(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw).trim();
  const bindings = [];
  const lines = src.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;
    const m = line.match(/^([A-Z_][A-Za-z0-9_]*)\s+is\s+(number|bool|text)(?:\s+list)?\s+([a-zA-Z_][A-Za-z0-9_]*)$/);
    if (!m) {
      throw new Error(`logic program block: invalid binding '${line}' (expected 'Var is type [list] pin')`);
    }
    const listFlag = /\blist\b/.test(line);
    bindings.push({ logicVar: m[1], bindType: m[2], listFlag, pinName: m[3] });
  }
  return bindings;
}

function mergeLogicDefinitions(base, usedInst) {
  if (!usedInst) return base;
  const merged = {
    uses: [...(base.uses || [])],
    queries: [...(base.queries || [])],
    clauses: [...(base.clauses || []), ...(usedInst.clauses || [])],
    constraints: [...(base.constraints || []), ...(usedInst.constraints || [])],
  };
  return merged;
}

function logicPrefixPredicateName(name, prefix) {
  if (!prefix || !name) return name;
  return `${prefix}.${name}`;
}

function logicPrefixCompound(compound, prefix) {
  if (!compound || !prefix || compound.kind !== 'compound') return compound;
  return {
    kind: 'compound',
    predicate: logicPrefixPredicateName(compound.predicate, prefix),
    arity: compound.arity != null ? compound.arity : (compound.args || []).length,
    args: compound.args || [],
  };
}

function logicPrefixGoal(goal, prefix) {
  if (!goal || !prefix) return goal;
  if (goal.kind === 'not') {
    return { kind: 'not', goal: logicPrefixGoal(goal.goal, prefix) };
  }
  if (goal.kind === 'call' || goal.kind === 'compound') {
    return {
      ...goal,
      predicate: logicPrefixPredicateName(goal.predicate, prefix),
    };
  }
  return goal;
}

function logicPrefixClause(clause, prefix) {
  if (!prefix || !clause) return clause;
  return {
    head: logicPrefixCompound(clause.head, prefix),
    body: (clause.body || []).map((g) => logicPrefixGoal(g, prefix)),
  };
}

function logicPrefixConstraint(c, prefix) {
  if (!prefix || !c) return c;
  return {
    ...c,
    head: logicPrefixCompound(c.head, prefix),
    body: (c.body || []).map((g) => logicPrefixGoal(g, prefix)),
  };
}

function logicPrefixClauses(clauses, prefix) {
  return (clauses || []).map((c) => logicPrefixClause(c, prefix));
}

function logicPrefixConstraints(constraints, prefix) {
  return (constraints || []).map((c) => logicPrefixConstraint(c, prefix));
}

function logicResolveMerged(inlineInst, inlineInstances) {
  const mergedSet = new Set([inlineInst.name]);
  const visiting = new Set();

  function expandModule(ref, chain) {
    const inst = inlineInstances.get(ref);
    if (!inst || inst.kind !== 'logic') {
      throw new Error(`logic use ${ref} must reference inline [logic]`);
    }
    let clauses = [...(inst.clauses || [])];
    let constraints = [...(inst.constraints || [])];
    const aliasSeen = new Set();

    for (const rawUse of inst.uses || []) {
      const use = logicNormalizeUseEntry(rawUse);
      if (!use || !use.ref) continue;

      if (use.alias) {
        if (aliasSeen.has(use.alias)) {
          logicError(`alias '${use.alias}' already used`, use.line);
        }
        aliasSeen.add(use.alias);
        const imported = importPrefixed(use, chain);
        clauses.push(...logicPrefixClauses(imported.clauses, use.alias));
        constraints.push(...logicPrefixConstraints(imported.constraints, use.alias));
      } else {
        importFlat(use, chain, clauses, constraints);
      }
    }
    return { clauses, constraints };
  }

  function importPrefixed(use, chain) {
    const ref = use.ref;
    const mode = use.mode === 'once' ? 'once' : 'strict';
    const useLine = use.line;

    if (mergedSet.has(ref)) {
      if (mode === 'once') return { clauses: [], constraints: [] };
      logicReuseUseError(ref, [...chain, ref], useLine);
    }
    if (visiting.has(ref)) {
      if (mode === 'once') return { clauses: [], constraints: [] };
      logicReuseUseError(ref, [...chain, ref], useLine);
    }

    visiting.add(ref);
    const content = expandModule(ref, [...chain, ref]);
    visiting.delete(ref);
    mergedSet.add(ref);
    return content;
  }

  function importFlat(use, chain, clauses, constraints) {
    const ref = use.ref;
    const mode = use.mode === 'once' ? 'once' : 'strict';
    const useLine = use.line;

    if (mergedSet.has(ref)) {
      if (mode === 'once') return;
      logicReuseUseError(ref, [...chain, ref], useLine);
    }
    if (visiting.has(ref)) {
      if (mode === 'once') return;
      logicReuseUseError(ref, [...chain, ref], useLine);
    }

    const used = inlineInstances.get(ref);
    if (!used || used.kind !== 'logic') {
      throw new Error(`logic use ${ref} must reference inline [logic]`);
    }

    visiting.add(ref);
    for (const rawChild of used.uses || []) {
      const child = logicNormalizeUseEntry(rawChild);
      if (!child || !child.ref) continue;
      if (child.alias) {
        const imported = importPrefixed(child, [...chain, ref]);
        clauses.push(...logicPrefixClauses(imported.clauses, child.alias));
        constraints.push(...logicPrefixConstraints(imported.constraints, child.alias));
      } else {
        importFlat(child, [...chain, ref], clauses, constraints);
      }
    }
    visiting.delete(ref);
    mergedSet.add(ref);
    clauses.push(...(used.clauses || []));
    constraints.push(...(used.constraints || []));
  }

  const root = expandModule(inlineInst.name, [inlineInst.name]);

  return {
    uses: inlineInst.uses || [],
    queries: inlineInst.queries || [],
    clauses: root.clauses,
    constraints: root.constraints,
  };
}

function logicPredicateArityKey(head) {
  if (!head || head.kind !== 'compound') return null;
  const arity = head.arity != null ? head.arity : (head.args || []).length;
  return `${head.predicate}/${arity}`;
}

function logicCountClauses(clauses) {
  let facts = 0;
  let rules = 0;
  for (const c of clauses || []) {
    if (c.body && c.body.length) rules++;
    else facts++;
  }
  return { facts, rules };
}

function logicSummarizePredicates(clauses, wantFacts) {
  const counts = new Map();
  for (const c of clauses || []) {
    const isFact = !c.body || !c.body.length;
    if (wantFacts ? !isFact : isFact) continue;
    const key = logicPredicateArityKey(c.head);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function logicSummarizeConstraintHeads(constraints) {
  const counts = new Map();
  for (const c of constraints || []) {
    const key = logicPredicateArityKey(c && c.head);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function formatLogicInstanceDoc(name, inst) {
  const lines = [`${name} (inline [logic])`, ''];
  const { facts, rules } = logicCountClauses(inst.clauses);
  const constraintCount = (inst.constraints || []).length;
  const queryCount = (inst.queries || []).length;
  const useCount = (inst.uses || []).length;

  lines.push(`  facts: ${facts}`);
  lines.push(`  rules: ${rules}`);
  lines.push(`  constraints: ${constraintCount}`);
  lines.push(`  queries: ${queryCount}`);
  lines.push(`  uses: ${useCount ? useCount : '(none)'}`);

  if (useCount) {
    lines.push('');
    lines.push('  compose:');
    for (const u of inst.uses) lines.push(`    ${logicFormatUseEntry(u)}`);
  }

  if (queryCount) {
    lines.push('');
    lines.push('  queries:');
    for (const q of inst.queries) lines.push(`    ${q.name}`);
  }

  if (constraintCount) {
    lines.push('');
    lines.push('  constraints:');
    for (const c of inst.constraints) {
      const key = logicPredicateArityKey(c.head) || '?';
      const idx = c.constraintIndex != null ? ` #${c.constraintIndex}` : '';
      lines.push(`    ${key}${idx}`);
    }
  }

  const factPreds = logicSummarizePredicates(inst.clauses, true);
  if (factPreds.length) {
    lines.push('');
    lines.push('  predicates (facts):');
    for (const [key, n] of factPreds) lines.push(`    ${key} (${n})`);
  }

  const rulePreds = logicSummarizePredicates(inst.clauses, false);
  if (rulePreds.length) {
    lines.push('');
    lines.push('  predicates (rules):');
    for (const [key, n] of rulePreds) lines.push(`    ${key} (${n})`);
  }

  lines.push('');
  lines.push('  execution:');
  lines.push('    definition only — no inline execution');
  lines.push('    compose: use .module merges facts, rules, constraints; use once skips revisits; use .module as alias prefixes imported predicates');
  lines.push('    runtime: comp [logic] or .module:query({ … })');
  lines.push('');
  lines.push('  see doc(inline.logic)  doc(comp.logic)');
  return lines;
}

function logicFormatCompound(c) {
  if (!c) return '';
  const args = (c.args || []).map(logicFormatTerm).join(', ');
  return `${c.predicate}(${args})`;
}

function logicFormatGoal(g) {
  if (!g) return '';
  if (g.kind === 'cut') return '!';
  if (g.kind === 'not') return `\\+ ${logicFormatGoal(g.goal)}`;
  if (g.kind === 'call' || g.kind === 'compound') return logicFormatCompound(g);
  if (g.kind === 'cmp') return `${logicFormatTerm(g.left)} ${g.op} ${logicFormatTerm(g.right)}`;
  if (g.kind === 'unify') return `${logicFormatTerm(g.left)} = ${logicFormatTerm(g.right)}`;
  if (g.kind === 'is') return `${logicFormatTerm(g.left)} is ${logicFormatTerm(g.right)}`;
  return '';
}

function logicFormatTerm(t) {
  if (!t) return '';
  if (t.kind === 'var') return t.name;
  if (t.kind === 'atom') return t.name;
  if (t.kind === 'number') return String(t.value);
  if (t.kind === 'list') return logicFormatListTermStatic(t);
  if (t.kind === 'compound') return logicFormatCompound(t);
  if (t.kind === 'arith') return `${logicFormatTerm(t.left)} ${t.op} ${logicFormatTerm(t.right)}`;
  return '';
}

function logicFormatListTermStatic(term) {
  if (!term || term.kind !== 'list') return '';
  if (term.nil) return '[]';
  const elems = [];
  let cur = term;
  while (cur && cur.kind === 'list' && !cur.nil) {
    elems.push(logicFormatTerm(cur.head));
    if (cur.tail && cur.tail.kind === 'list') {
      if (cur.tail.nil) return `[${elems.join(', ')}]`;
      cur = cur.tail;
    } else if (cur.tail && cur.tail.kind === 'var') {
      return `[${elems.join(', ')}|${cur.tail.name}]`;
    } else {
      return `[${elems.join(', ')}|${logicFormatTerm(cur.tail)}]`;
    }
  }
  return `[${elems.join(', ')}]`;
}

function formatLogicTypeDoc() {
  return [
    'inline [logic] — declarative knowledge base',
    '',
    '  Facts:     owns(john, chevy)',
    '  Rules:     modifier2(X, 0) <- X >= 9, X =< 12',
    '  Queries:   query johnOwns: owns(john, X)',
    '  Compose:   use .otherModule',
    '             use once .otherModule',
    '',
    'comp [logic] — query runtime on a component',
    '',
    '  Program block (.module { X is number myX }) binds logic variables to component pins.',
    '  Exec block (.logic:{ myX = scoreIn, query:0 >= out, set = trigger }) wires pins and redirects results.',
    '',
    'Inline query exec (expression, no comp):',
    '',
    '  .world:query({ owns(john, X) }, X=car)   — boolean / vector / matrix per LHS wire',
    '',
    'See doc/inline-logic.md, doc/logic-query-exec.md, doc/comp-logic.md',
    'doc(inline.logic)  doc(comp.logic)',
  ];
}

function logicFingerprintProgram(inst) {
  return JSON.stringify({
    clauses: inst.clauses,
    queries: inst.queries,
    uses: inst.uses,
    constraints: inst.constraints,
  });
}

function parseLogicGoalsBlock(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw).trim();
  if (!src) throw new Error('logic query block requires at least one goal');
  const tokens = logicTokenize(src);
  const parser = new LogicParser(tokens);
  const goals = parser.parseBodyGoals();
  if (!parser.at('EOF')) {
    logicError('unexpected tokens after query goals', parser.peek().line);
  }
  return goals;
}

function parseLogicMutationBlock(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw);
  const ops = [];
  for (const rawLine of src.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;
    let op = null;
    if (line.startsWith('+')) op = 'add';
    else if (line.startsWith('-')) op = 'remove';
    else logicError(`mutation line must start with + or -: ${line}`);
    let rest = line.slice(1).trim();
    if (!rest) logicError('mutation line requires a fact after + or -');
    if (!rest.endsWith('.')) rest += '.';
    const tokens = logicTokenize(rest);
    const parser = new LogicParser(tokens);
    const head = parser.parseMutationFactHead();
    if (parser.at('DOT')) parser.advance();
    if (!parser.at('EOF')) {
      logicError('unexpected tokens after mutation fact', parser.peek().line);
    }
    ops.push({ op, head });
  }
  return ops;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseLogicBody = parseLogicBody;
  globalThis.parseLogicGoalsBlock = parseLogicGoalsBlock;
  globalThis.parseLogicMutationBlock = parseLogicMutationBlock;
  globalThis.parseLogicProgramBlock = parseLogicProgramBlock;
  globalThis.logicResolveMerged = logicResolveMerged;
  globalThis.formatLogicInstanceDoc = formatLogicInstanceDoc;
  globalThis.formatLogicTypeDoc = formatLogicTypeDoc;
  globalThis.logicFingerprintProgram = logicFingerprintProgram;
  globalThis.logicListFreeVarsInGoal = logicListFreeVarsInGoal;
  globalThis.logicListFreeVarsInGoals = logicListFreeVarsInGoals;
  globalThis.logicQueryGoals = logicQueryGoals;
  globalThis.logicCountFreeVarsInGoal = logicCountFreeVarsInGoal;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseLogicBody,
    parseLogicGoalsBlock,
    parseLogicMutationBlock,
    parseLogicProgramBlock,
    logicResolveMerged,
    formatLogicInstanceDoc,
    logicFingerprintProgram,
    logicCountFreeVarsInGoal,
    logicListFreeVarsInGoals,
    logicQueryGoals,
    logicIsVarName,
    logicTokenize,
  };
}
