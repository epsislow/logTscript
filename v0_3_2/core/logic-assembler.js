/* ================= LOGIC ASSEMBLER (inline [logic]) ================= */

const LOGIC_KEYWORDS = new Set(['query', 'use', 'constraint', 'as']);
const LOGIC_MUTATION_BIND_TYPES = new Set(['text', 'bool', 'number', 'float']);
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
const LOGIC_BUILTIN_FLOAT_PRED = 'float';
const LOGIC_BUILTIN_LIST_PRED = 'list';
const LOGIC_BUILTIN_COMPOUND_PRED = 'compound';
const LOGIC_BUILTIN_RANDOM_BETWEEN_PRED = 'random_between';
const LOGIC_BUILTIN_RANDOM_PRED = 'random';
const LOGIC_BUILTIN_SET_RANDOM_PRED = 'set_random';
const LOGIC_BUILTIN_LAST_PRED = 'last';
const LOGIC_BUILTIN_SELECT_PRED = 'select';
const LOGIC_BUILTIN_SELECTCHK_PRED = 'selectchk';
const LOGIC_BUILTIN_FLATTEN_PRED = 'flatten';
const LOGIC_BUILTIN_SAME_LENGTH_PRED = 'same_length';
const LOGIC_BUILTIN_KEYSORT_PRED = 'keysort';
const LOGIC_BUILTIN_MSORT_PRED = 'msort';
const LOGIC_BUILTIN_PREFIX_PRED = 'prefix';
const LOGIC_BUILTIN_SUFFIX_PRED = 'suffix';
const LOGIC_BUILTIN_IS_SET_PRED = 'is_set';
const LOGIC_BUILTIN_LIST_TO_SET_PRED = 'list_to_set';
const LOGIC_BUILTIN_UNION_PRED = 'union';
const LOGIC_BUILTIN_INTERSECTION_PRED = 'intersection';
const LOGIC_BUILTIN_SUBTRACT_PRED = 'subtract';
const LOGIC_BUILTIN_NUMLIST_PRED = 'numlist';
const LOGIC_BUILTIN_SUM_LIST_PRED = 'sum_list';
const LOGIC_BUILTIN_MAX_LIST_PRED = 'max_list';
const LOGIC_BUILTIN_MIN_LIST_PRED = 'min_list';
const LOGIC_BUILTIN_SUBLIST_PRED = 'sublist';
const LOGIC_BUILTIN_PERMUTATION_PRED = 'permutation';
const LOGIC_BUILTIN_COMBINATIONS_PRED = 'combinations';
const LOGIC_BUILTIN_CALL_PRED = 'call';
const LOGIC_BUILTIN_INCLUDE_PRED = 'include';
const LOGIC_BUILTIN_EXCLUDE_PRED = 'exclude';
const LOGIC_BUILTIN_PARTITION_PRED = 'partition';
const LOGIC_BUILTIN_CONVLIST_PRED = 'convlist';
const LOGIC_BUILTIN_MAPLIST_PRED = 'maplist';
const LOGIC_BUILTIN_FOLDL_PRED = 'foldl';
const LOGIC_BUILTIN_FINDALL_PRED = 'findall';
const LOGIC_BUILTIN_BAGOF_PRED = 'bagof';
const LOGIC_BUILTIN_SETOF_PRED = 'setof';
const LOGIC_BUILTIN_TRUE_PRED = 'true';
const LOGIC_BUILTIN_FAIL_PRED = 'fail';
const LOGIC_BUILTIN_STRING_TO_LIST_PRED = 'string_to_list';
const LOGIC_BUILTIN_STRING_TO_CODES_PRED = 'string_to_codes';
const LOGIC_BUILTIN_ATOM_CHARS_PRED = 'atom_chars';
const LOGIC_BUILTIN_ATOM_CODES_PRED = 'atom_codes';
const LOGIC_BUILTIN_ATOM_NUMBER_PRED = 'atom_number';
const LOGIC_BUILTIN_BETWEEN_PRED = 'between';
const LOGIC_BUILTIN_PHRASE_PRED = 'phrase';
const LOGIC_BUILTIN_LAZY_LIST_PRED = 'lazy_list';
const LOGIC_BUILTIN_LAZY_LIST_MATERIALIZE_PRED = 'lazy_list_materialize';
const LOGIC_BUILTIN_TYPE_PREDS = new Set([
  LOGIC_BUILTIN_ATOM_PRED,
  LOGIC_BUILTIN_NUMBER_PRED,
  LOGIC_BUILTIN_FLOAT_PRED,
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
  [LOGIC_BUILTIN_APPEND_PRED]: [2, 3],
  [LOGIC_BUILTIN_LENGTH_PRED]: [2],
  [LOGIC_BUILTIN_REVERSE_PRED]: [2],
  [LOGIC_BUILTIN_SORT_PRED]: [2],
  [LOGIC_BUILTIN_ATOM_PRED]: [1],
  [LOGIC_BUILTIN_NUMBER_PRED]: [1],
  [LOGIC_BUILTIN_FLOAT_PRED]: [1],
  [LOGIC_BUILTIN_LIST_PRED]: [1],
  [LOGIC_BUILTIN_COMPOUND_PRED]: [1],
  [LOGIC_BUILTIN_RANDOM_BETWEEN_PRED]: [3],
  [LOGIC_BUILTIN_RANDOM_PRED]: [1],
  [LOGIC_BUILTIN_SET_RANDOM_PRED]: [1],
  [LOGIC_BUILTIN_LAST_PRED]: [2],
  [LOGIC_BUILTIN_SELECT_PRED]: [3],
  [LOGIC_BUILTIN_SELECTCHK_PRED]: [3],
  [LOGIC_BUILTIN_FLATTEN_PRED]: [2],
  [LOGIC_BUILTIN_SAME_LENGTH_PRED]: [2],
  [LOGIC_BUILTIN_KEYSORT_PRED]: [2],
  [LOGIC_BUILTIN_MSORT_PRED]: [2],
  [LOGIC_BUILTIN_PREFIX_PRED]: [2],
  [LOGIC_BUILTIN_SUFFIX_PRED]: [2],
  [LOGIC_BUILTIN_IS_SET_PRED]: [1],
  [LOGIC_BUILTIN_LIST_TO_SET_PRED]: [2],
  [LOGIC_BUILTIN_UNION_PRED]: [3],
  [LOGIC_BUILTIN_INTERSECTION_PRED]: [3],
  [LOGIC_BUILTIN_SUBTRACT_PRED]: [3],
  [LOGIC_BUILTIN_NUMLIST_PRED]: [3],
  [LOGIC_BUILTIN_SUM_LIST_PRED]: [2],
  [LOGIC_BUILTIN_MAX_LIST_PRED]: [2],
  [LOGIC_BUILTIN_MIN_LIST_PRED]: [2],
  [LOGIC_BUILTIN_SUBLIST_PRED]: [3],
  [LOGIC_BUILTIN_PERMUTATION_PRED]: [2],
  [LOGIC_BUILTIN_COMBINATIONS_PRED]: [3],
  [LOGIC_BUILTIN_CALL_PRED]: [1],
  [LOGIC_BUILTIN_INCLUDE_PRED]: [3],
  [LOGIC_BUILTIN_EXCLUDE_PRED]: [3],
  [LOGIC_BUILTIN_PARTITION_PRED]: [4],
  [LOGIC_BUILTIN_CONVLIST_PRED]: [3],
  [LOGIC_BUILTIN_MAPLIST_PRED]: [2, 3],
  [LOGIC_BUILTIN_FOLDL_PRED]: [4, 5],
  [LOGIC_BUILTIN_FINDALL_PRED]: [3],
  [LOGIC_BUILTIN_BAGOF_PRED]: [3],
  [LOGIC_BUILTIN_SETOF_PRED]: [3],
  [LOGIC_BUILTIN_TRUE_PRED]: [0],
  [LOGIC_BUILTIN_FAIL_PRED]: [0],
  [LOGIC_BUILTIN_STRING_TO_LIST_PRED]: [2],
  [LOGIC_BUILTIN_STRING_TO_CODES_PRED]: [2],
  [LOGIC_BUILTIN_ATOM_CHARS_PRED]: [2],
  [LOGIC_BUILTIN_ATOM_CODES_PRED]: [2],
  [LOGIC_BUILTIN_ATOM_NUMBER_PRED]: [2],
  [LOGIC_BUILTIN_BETWEEN_PRED]: [3],
  [LOGIC_BUILTIN_PHRASE_PRED]: [2, 3],
  [LOGIC_BUILTIN_LAZY_LIST_PRED]: [2],
  [LOGIC_BUILTIN_LAZY_LIST_MATERIALIZE_PRED]: [1],
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
    if (ch === '.' && i + 1 < src.length && /[0-9]/.test(src[i + 1])) {
      i++;
      let frac = '';
      while (i < src.length && /[0-9]/.test(src[i])) frac += src[i++];
      const v = parseFloat(`0.${frac}`);
      if (isNaN(v)) logicError('invalid float literal', startLine);
      tokens.push({ type: 'FLOAT', value: v, line: startLine });
      continue;
    }
    if (ch === '.') { tokens.push({ type: 'DOT', value: '.', line: startLine }); i++; continue; }
    if (ch === ':' ) { tokens.push({ type: 'COLON', value: ':', line: startLine }); i++; continue; }
    if (ch === '\\' && src[i + 1] === '+') {
      tokens.push({ type: 'NOT', value: '\\+', line: startLine }); i += 2; continue;
    }
    if (ch === '!') {
      tokens.push({ type: 'BANG', value: '!', line: startLine }); i++; continue;
    }
    if (ch === '{') { tokens.push({ type: 'LBRACE', value: '{', line: startLine }); i++; continue; }
    if (ch === '}') { tokens.push({ type: 'RBRACE', value: '}', line: startLine }); i++; continue; }
    if (ch === '-' && src[i + 1] === '-' && src[i + 2] === '>') {
      tokens.push({ type: 'DCG_ARROW', value: '-->', line: startLine }); i += 3; continue;
    }
    if (ch === '*' && i + 1 < src.length && src[i + 1] === '*') {
      tokens.push({ type: 'OP', value: '**', line: startLine }); i += 2; continue;
    }
    if (ch === '/' && i + 1 < src.length && src[i + 1] === '/') {
      tokens.push({ type: 'OP', value: '//', line: startLine }); i += 2; continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'OP', value: ch, line: startLine }); i++; continue;
    }
    if (ch === '<' && src[i + 1] === '-') {
      tokens.push({ type: 'ARROW', value: '<-', line: startLine }); i += 2; continue;
    }
    if (ch === '=' && src[i + 1] === ':' && src[i + 2] === '=') {
      tokens.push({ type: 'CMP', value: '=:=', line: startLine }); i += 3; continue;
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
    if (/[0-9]/.test(ch) || (ch === '-' && i + 1 < src.length && (/[0-9]/.test(src[i + 1]) || src[i + 1] === '.'))) {
      let negative = false;
      if (ch === '-') { negative = true; i++; }
      let intPart = '';
      while (i < src.length && /[0-9]/.test(src[i])) intPart += src[i++];
      if (i < src.length && src[i] === '.' && i + 1 < src.length && /[0-9]/.test(src[i + 1])) {
        i++;
        let fracPart = '';
        while (i < src.length && /[0-9]/.test(src[i])) fracPart += src[i++];
        const text = `${negative ? '-' : ''}${intPart || '0'}.${fracPart}`;
        const v = parseFloat(text);
        if (isNaN(v)) logicError('invalid float literal', startLine);
        tokens.push({ type: 'FLOAT', value: v, line: startLine });
        continue;
      }
      if (!intPart.length) logicError('invalid number literal', startLine);
      const v = parseInt((negative ? '-' : '') + intPart, 10);
      tokens.push({ type: 'NUMBER', value: v, line: startLine });
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
    let predicate = this.expect('ID').value;
    while (this.at('DOT')) {
      this.advance();
      if (!this.at('ID')) {
        logicError('expected predicate name after .', this.peek().line);
      }
      predicate += '.' + this.advance().value;
    }
    let head;
    let body = [];
    let dcg = false;
    if (this.at('LP')) {
      this.expect('LP');
      const args = [];
      if (!this.at('RP')) {
        args.push(this.parseTerm());
        while (this.at('COMMA')) {
          this.advance();
          args.push(this.parseTerm());
        }
      }
      this.expect('RP');
      head = { kind: 'compound', predicate, args };
    } else if (this.at('DCG_ARROW')) {
      head = { kind: 'compound', predicate, args: [] };
    } else {
      logicError('expected (', this.peek().line);
    }
    if (this.at('DCG_ARROW')) {
      this.advance();
      dcg = true;
      body = this.parseDcgBodyGoals();
    } else if (this.at('ARROW')) {
      this.advance();
      body = this.parseBodyGoals();
    }
    return { head, body, line, dcg };
  }

  parseDcgBodyGoals() {
    const goals = [];
    if (this.at('EOF')) return goals;
    goals.push(this.parseDcgBodyItem());
    while (this.at('COMMA')) {
      this.advance();
      goals.push(this.parseDcgBodyItem());
    }
    return goals;
  }

  parseDcgBodyItem() {
    if (this.at('LBRACE')) {
      return this.parseDcgBracedGoals();
    }
    if (this.at('LBRACKET')) {
      const list = this.parseList();
      return { kind: 'dcg_terminal', list };
    }
    if (this.looksLikeCompound()) {
      const compound = this.parseCompound();
      return { kind: 'dcg_nt', compound };
    }
    logicError('DCG goal must be braced: { ... }', this.peek().line);
  }

  parseDcgBracedGoals() {
    const line = this.peek().line;
    this.expect('LBRACE');
    const goals = [];
    if (!this.at('RBRACE')) {
      goals.push(this.parseBodyGoal());
      while (this.at('COMMA')) {
        this.advance();
        goals.push(this.parseBodyGoal());
      }
    }
    this.expect('RBRACE');
    return { kind: 'dcg_brace', goals, line };
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
    if (this.at('ID', LOGIC_BUILTIN_TRUE_PRED) && !this.looksLikeCompound()) {
      this.advance();
      return { kind: 'call', predicate: LOGIC_BUILTIN_TRUE_PRED, args: [] };
    }
    if (this.at('ID', LOGIC_BUILTIN_FAIL_PRED) && !this.looksLikeCompound()) {
      this.advance();
      return { kind: 'call', predicate: LOGIC_BUILTIN_FAIL_PRED, args: [] };
    }
    if (this.at('ID', LOGIC_BUILTIN_IS_PRED) && !this.looksLikeCompound()) {
      logicError('expected term before is', this.peek().line);
    }
    if (this.looksLikeCompound()) {
      const compound = this.parseCompound();
      return { kind: 'call', predicate: compound.predicate, args: compound.args };
    }
    const left = (this.at('LBRACKET') || this.at('STRING')) ? this.parseTerm() : this.parseExpr();
    if (this.at('CMP')) {
      const op = this.advance().value;
      const right = this.parseExpr();
      return { kind: 'cmp', op, left, right };
    }
    if (this.at('EQ')) {
      this.advance();
      const right = this.parseStructExpr();
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
    if (left.kind === 'dif_list') {
      logicError('bare dif-list term is not a goal — use = or call a predicate', this.peek().line);
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
    const node = this.parseTermPrimary();
    if (this.at('OP', '-') && logicTermAllowsDifListSuffix(node)) {
      this.advance();
      const hole = this.parseTermPrimary();
      return { kind: 'dif_list', front: node, hole };
    }
    return node;
  }

  parseTermPrimary() {
    if (this.at('LBRACKET')) {
      return this.parseList();
    }
    if (this.at('OP', '-')) {
      this.advance();
      if (this.at('NUMBER')) {
        return { kind: 'number', value: -this.advance().value };
      }
      if (this.at('FLOAT')) {
        return { kind: 'float', value: -this.advance().value };
      }
      logicError('expected number after unary -', this.peek().line);
    }
    if (this.at('FLOAT')) {
      const v = this.advance().value;
      return { kind: 'float', value: v };
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

  parseStructMulExpr() {
    let node = this.parseTerm();
    while (this.at('OP') && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value;
      const right = this.parseTerm();
      node = { kind: 'arith', op, left: node, right };
    }
    return node;
  }

  parseStructExpr() {
    let node = this.parseStructMulExpr();
    while (this.at('OP') && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseStructMulExpr();
      node = { kind: 'arith', op, left: node, right };
    }
    return node;
  }

  parseModRemExpr() {
    let node = this.parseAddExpr();
    while (this.at('ID', 'mod') || this.at('ID', 'rem')) {
      const op = this.advance().value;
      const right = this.parseAddExpr();
      node = { kind: 'arith', op, left: node, right };
    }
    return node;
  }

  parseAddExpr() {
    let node = this.parseMulExpr();
    while (this.at('OP') && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseMulExpr();
      node = { kind: 'arith', op, left: node, right };
    }
    return node;
  }

  parseMulExpr() {
    let node = this.parsePowExpr();
    while (this.at('OP') && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '//')) {
      const op = this.advance().value;
      const right = this.parsePowExpr();
      node = { kind: 'arith', op, left: node, right };
    }
    return node;
  }

  parsePowExpr() {
    let node = this.parseUnaryExpr();
    if (this.at('OP', '**')) {
      this.advance();
      const right = this.parsePowExpr();
      node = { kind: 'arith', op: '**', left: node, right };
    }
    return node;
  }

  parseUnaryExpr() {
    if (this.at('OP', '-')) {
      this.advance();
      const inner = this.parseUnaryExpr();
      if (inner.kind === 'number') return { kind: 'number', value: -inner.value };
      if (inner.kind === 'float') return { kind: 'float', value: -inner.value };
      return { kind: 'arith', op: 'neg', left: inner, right: null };
    }
    return this.parseIsPrimary();
  }

  parseIsPrimary() {
    if (this.at('LP')) {
      this.advance();
      const node = this.parseModRemExpr();
      this.expect('RP');
      return node;
    }
    if (this.at('FLOAT')) {
      return { kind: 'float', value: this.advance().value };
    }
    if (this.at('NUMBER')) {
      return { kind: 'number', value: this.advance().value };
    }
    if (this.looksLikeCompound()) {
      return this.parseCompound();
    }
    if (this.at('ID')) {
      const name = this.advance().value;
      if (logicIsVarName(name)) return { kind: 'var', name };
      if (logicIsAtomName(name)) return { kind: 'atom', name };
      logicError(`invalid expression term '${name}'`, this.peek().line);
    }
    logicError('expected expression', this.peek().line);
  }

  parseExpr() {
    return this.parseModRemExpr();
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

  logicAtSlashToken() {
    return (this.at('SYM') || this.at('OP')) && this.peek().value === '/';
  }

  parseMutationTerm() {
    if (this.at('ID') && LOGIC_MUTATION_BIND_TYPES.has(this.peek().value)) {
      const bindType = this.advance().value;
      let numberFormat = null;
      if ((bindType === 'number' || bindType === 'float') && this.logicAtSlashToken()) {
        this.advance();
        if (!this.at('ID')) {
          logicError(`expected ${bindType} format after /`, this.peek().line);
        }
        const fmtName = this.advance().value;
        if (bindType === 'number') {
          if (typeof parseLogicNumberFormatToken !== 'function') {
            logicError('logic-number-formats is not loaded', this.peek().line);
          }
          numberFormat = parseLogicNumberFormatToken(fmtName, 'mutation wire ref');
        } else {
          if (typeof parseLogicFloatFormatToken !== 'function') {
            logicError('logic-float-formats is not loaded', this.peek().line);
          }
          numberFormat = parseLogicFloatFormatToken(fmtName, 'mutation wire ref');
        }
      }
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
      return { kind: 'wireRef', bindType, numberFormat, listFlag, eachFlag, wireName };
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

let logicDcgExpandVarSerial = 0;

function logicDcgNextVar() {
  logicDcgExpandVarSerial += 1;
  return { kind: 'var', name: '__DCG' + logicDcgExpandVarSerial };
}

function logicCloneTerm(term) {
  if (!term) return term;
  if (term.kind === 'var') return { kind: 'var', name: term.name };
  if (term.kind === 'atom') {
    const r = { kind: 'atom', name: term.name };
    if (term.logicTraceAsString) r.logicTraceAsString = true;
    return r;
  }
  if (term.kind === 'number') return { kind: 'number', value: term.value };
  if (term.kind === 'float') return { kind: 'float', value: term.value };
  if (term.kind === 'compound') {
    return {
      kind: 'compound',
      predicate: term.predicate,
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
  if (term.kind === 'arith') {
    return {
      kind: 'arith',
      op: term.op,
      left: logicCloneTerm(term.left),
      right: logicCloneTerm(term.right),
    };
  }
  return term;
}

function logicCloneGoal(goal) {
  if (!goal) return goal;
  if (goal.kind === 'not') return { kind: 'not', goal: logicCloneGoal(goal.goal) };
  if (goal.kind === 'cut') return { kind: 'cut' };
  if (goal.kind === 'call') {
    return {
      kind: 'call',
      predicate: goal.predicate,
      args: (goal.args || []).map(logicCloneTerm),
    };
  }
  if (goal.kind === 'cmp') {
    return {
      kind: 'cmp',
      op: goal.op,
      left: logicCloneTerm(goal.left),
      right: logicCloneTerm(goal.right),
    };
  }
  if (goal.kind === 'unify') {
    return {
      kind: 'unify',
      left: logicCloneTerm(goal.left),
      right: logicCloneTerm(goal.right),
    };
  }
  if (goal.kind === 'is') {
    return {
      kind: 'is',
      left: logicCloneTerm(goal.left),
      right: logicCloneTerm(goal.right),
    };
  }
  return goal;
}

function logicDcgVisibleArity(head) {
  return (head && head.args) ? head.args.length : 0;
}

function logicDcgExpandedArity(visibleArity) {
  return visibleArity + 2;
}

function logicCollectDcgReservedArities(clauses) {
  const map = new Map();
  for (const c of clauses || []) {
    if (!c.dcg) continue;
    const pred = c.head.predicate;
    const vis = logicDcgVisibleArity(c.head);
    if (vis > 1) {
      logicError('DCG head must have at most 1 visible argument', c.line);
    }
    const expArity = logicDcgExpandedArity(vis);
    if (!map.has(pred)) map.set(pred, new Set());
    map.get(pred).add(expArity);
  }
  return map;
}

function logicDcgReservedHeadError(predicate, arity) {
  return `'${predicate}/${arity}' is reserved — cannot define ${predicate} as fact or rule head`;
}

function logicValidateDcgReservedHeads(clauses, reservedMap) {
  for (const c of clauses || []) {
    if (c.dcg) continue;
    if (!c.head || c.head.kind !== 'compound') continue;
    const pred = c.head.predicate;
    const arity = logicDcgVisibleArity(c.head);
    const reserved = reservedMap.get(pred);
    if (reserved && reserved.has(arity)) {
      logicError(logicDcgReservedHeadError(pred, arity), c.line);
    }
  }
}

function logicExpandDcgTerminal(listTerm, inVar, outVar) {
  const goals = [];
  if (!listTerm || listTerm.nil) {
    goals.push({ kind: 'unify', left: logicCloneTerm(inVar), right: logicCloneTerm(outVar) });
    return goals;
  }
  let curIn = inVar;
  let cur = listTerm;
  while (cur && !cur.nil) {
    const tailIsNil = !cur.tail || cur.tail.nil;
    const nextVar = tailIsNil ? outVar : logicDcgNextVar();
    goals.push({
      kind: 'unify',
      left: logicCloneTerm(curIn),
      right: {
        kind: 'list',
        head: logicCloneTerm(cur.head),
        tail: logicCloneTerm(nextVar),
      },
    });
    if (tailIsNil) break;
    curIn = nextVar;
    cur = cur.tail;
  }
  return goals;
}

function logicExpandDcgBodyItems(items, s0, sEnd) {
  const goals = [];
  let cur = s0;
  for (let i = 0; i < (items || []).length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    if (item.kind === 'dcg_brace') {
      for (const g of item.goals || []) goals.push(logicCloneGoal(g));
      continue;
    }
    const next = isLast ? sEnd : logicDcgNextVar();
    if (item.kind === 'dcg_terminal') {
      goals.push(...logicExpandDcgTerminal(item.list, cur, next));
    } else if (item.kind === 'dcg_nt') {
      const comp = item.compound;
      goals.push({
        kind: 'call',
        predicate: comp.predicate,
        args: [...(comp.args || []).map(logicCloneTerm), logicCloneTerm(cur), logicCloneTerm(next)],
      });
    }
    cur = next;
  }
  if (!items || !items.length) {
    goals.push({ kind: 'unify', left: logicCloneTerm(s0), right: logicCloneTerm(sEnd) });
  }
  return goals;
}

function logicExpandDcgClause(clause) {
  const visibleArgs = (clause.head.args || []).map(logicCloneTerm);
  const s0 = logicDcgNextVar();
  const sEnd = logicDcgNextVar();
  const head = {
    kind: 'compound',
    predicate: clause.head.predicate,
    args: [...visibleArgs, s0, sEnd],
  };
  const body = logicExpandDcgBodyItems(clause.body, s0, sEnd);
  return { head, body, line: clause.line };
}

function logicBuildDcgNonTerminalIndex(clauses) {
  const map = new Map();
  for (const c of clauses || []) {
    if (!c.dcg) continue;
    const pred = c.head.predicate;
    const vis = logicDcgVisibleArity(c.head);
    if (!map.has(pred)) map.set(pred, new Set());
    map.get(pred).add(vis);
  }
  return map;
}

function logicValidateDcgBodyItems(items, ntIndex, line) {
  for (const item of items || []) {
    if (item.kind === 'dcg_brace' || item.kind === 'dcg_terminal') continue;
    if (item.kind === 'dcg_nt') {
      const pred = item.compound.predicate;
      const vis = (item.compound.args || []).length;
      const arities = ntIndex.get(pred);
      if (!arities || !arities.has(vis)) {
        logicError('DCG goal must be braced: { ... }', line);
      }
    }
  }
}

function logicValidateDcgBodies(clauses, ntIndex) {
  for (const c of clauses || []) {
    if (!c.dcg) continue;
    logicValidateDcgBodyItems(c.body, ntIndex, c.line);
  }
}

function logicExpandDcgProgram(prog) {
  logicDcgExpandVarSerial = 0;
  const clauses = prog.clauses || [];
  const ntIndex = logicBuildDcgNonTerminalIndex(clauses);
  logicValidateDcgBodies(clauses, ntIndex);
  const reservedMap = logicCollectDcgReservedArities(clauses);
  logicValidateDcgReservedHeads(clauses, reservedMap);
  const out = [];
  for (const c of clauses) {
    if (c.dcg) out.push(logicExpandDcgClause(c));
    else out.push(c);
  }
  prog.clauses = out;
  prog.dcgReservedArities = reservedMap;
  return prog;
}

function parseLogicBody(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw);
  const tokens = logicTokenize(src);
  const parsed = new LogicParser(tokens).parseProgram();
  logicExpandDcgProgram(parsed);
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

function logicTermAllowsDifListSuffix(term) {
  if (!term) return false;
  return term.kind === 'list' || term.kind === 'var' || term.kind === 'dif_list';
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
    return `'${predicate}/${arity}' is reserved — cannot define ${predicate} as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_IS_PRED && arity === 2) {
    return "'is/2' is reserved — cannot define is as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_MEMBER_PRED && arity === 2) {
    return "'member/2' is reserved — cannot define member as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_APPEND_PRED && (arity === 2 || arity === 3)) {
    return `'append/${arity}' is reserved — cannot define append as fact or rule head`;
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
  if (predicate === LOGIC_BUILTIN_RANDOM_PRED && arity === 1) {
    return "'random/1' is reserved — cannot define random as fact or rule head";
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
  if (predicate === LOGIC_BUILTIN_KEYSORT_PRED && arity === 2) {
    return "'keysort/2' is reserved — cannot define keysort as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_MSORT_PRED && arity === 2) {
    return "'msort/2' is reserved — cannot define msort as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_PREFIX_PRED && arity === 2) {
    return "'prefix/2' is reserved — cannot define prefix as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SUFFIX_PRED && arity === 2) {
    return "'suffix/2' is reserved — cannot define suffix as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_IS_SET_PRED && arity === 1) {
    return "'is_set/1' is reserved — cannot define is_set as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_LIST_TO_SET_PRED && arity === 2) {
    return "'list_to_set/2' is reserved — cannot define list_to_set as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_UNION_PRED && arity === 3) {
    return "'union/3' is reserved — cannot define union as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_INTERSECTION_PRED && arity === 3) {
    return "'intersection/3' is reserved — cannot define intersection as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SUBTRACT_PRED && arity === 3) {
    return "'subtract/3' is reserved — cannot define subtract as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_NUMLIST_PRED && arity === 3) {
    return "'numlist/3' is reserved — cannot define numlist as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SUM_LIST_PRED && arity === 2) {
    return "'sum_list/2' is reserved — cannot define sum_list as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_MAX_LIST_PRED && arity === 2) {
    return "'max_list/2' is reserved — cannot define max_list as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_MIN_LIST_PRED && arity === 2) {
    return "'min_list/2' is reserved — cannot define min_list as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SUBLIST_PRED && arity === 3) {
    return "'sublist/3' is reserved — cannot define sublist as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_PERMUTATION_PRED && arity === 2) {
    return "'permutation/2' is reserved — cannot define permutation as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_COMBINATIONS_PRED && arity === 3) {
    return "'combinations/3' is reserved — cannot define combinations as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_CALL_PRED && arity === 1) {
    return "'call/1' is reserved — cannot define call as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_INCLUDE_PRED && arity === 3) {
    return "'include/3' is reserved — cannot define include as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_EXCLUDE_PRED && arity === 3) {
    return "'exclude/3' is reserved — cannot define exclude as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_PARTITION_PRED && arity === 4) {
    return "'partition/4' is reserved — cannot define partition as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_CONVLIST_PRED && arity === 3) {
    return "'convlist/3' is reserved — cannot define convlist as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_MAPLIST_PRED && (arity === 2 || arity === 3)) {
    return `'maplist/${arity}' is reserved — cannot define maplist as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_FOLDL_PRED && (arity === 4 || arity === 5)) {
    return `'foldl/${arity}' is reserved — cannot define foldl as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_FINDALL_PRED && arity === 3) {
    return "'findall/3' is reserved — cannot define findall as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_BAGOF_PRED && arity === 3) {
    return "'bagof/3' is reserved — cannot define bagof as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_SETOF_PRED && arity === 3) {
    return "'setof/3' is reserved — cannot define setof as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_TRUE_PRED && arity === 0) {
    return "'true/0' is reserved — cannot define true as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_FAIL_PRED && arity === 0) {
    return "'fail/0' is reserved — cannot define fail as fact or rule head";
  }
  if ((predicate === LOGIC_BUILTIN_STRING_TO_LIST_PRED
      || predicate === LOGIC_BUILTIN_STRING_TO_CODES_PRED
      || predicate === LOGIC_BUILTIN_ATOM_CHARS_PRED
      || predicate === LOGIC_BUILTIN_ATOM_CODES_PRED
      || predicate === LOGIC_BUILTIN_ATOM_NUMBER_PRED
      || predicate === LOGIC_BUILTIN_LAZY_LIST_PRED) && arity === 2) {
    return `'${predicate}/${arity}' is reserved — cannot define ${predicate} as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_BETWEEN_PRED && arity === 3) {
    return "'between/3' is reserved — cannot define between as fact or rule head";
  }
  if (predicate === LOGIC_BUILTIN_PHRASE_PRED && (arity === 2 || arity === 3)) {
    return `'phrase/${arity}' is reserved — cannot define phrase as fact or rule head`;
  }
  if (predicate === LOGIC_BUILTIN_LAZY_LIST_MATERIALIZE_PRED && arity === 1) {
    return "'lazy_list_materialize/1' is reserved — cannot define lazy_list_materialize as fact or rule head";
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
      } else if (pred === LOGIC_BUILTIN_KEYSORT_PRED && arity === 2) {
        logicError("'keysort/2' is reserved — cannot define keysort as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_MSORT_PRED && arity === 2) {
        logicError("'msort/2' is reserved — cannot define msort as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_PREFIX_PRED && arity === 2) {
        logicError("'prefix/2' is reserved — cannot define prefix as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SUFFIX_PRED && arity === 2) {
        logicError("'suffix/2' is reserved — cannot define suffix as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_IS_SET_PRED && arity === 1) {
        logicError("'is_set/1' is reserved — cannot define is_set as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_LIST_TO_SET_PRED && arity === 2) {
        logicError("'list_to_set/2' is reserved — cannot define list_to_set as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_UNION_PRED && arity === 3) {
        logicError("'union/3' is reserved — cannot define union as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_INTERSECTION_PRED && arity === 3) {
        logicError("'intersection/3' is reserved — cannot define intersection as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SUBTRACT_PRED && arity === 3) {
        logicError("'subtract/3' is reserved — cannot define subtract as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_NUMLIST_PRED && arity === 3) {
        logicError("'numlist/3' is reserved — cannot define numlist as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SUM_LIST_PRED && arity === 2) {
        logicError("'sum_list/2' is reserved — cannot define sum_list as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_MAX_LIST_PRED && arity === 2) {
        logicError("'max_list/2' is reserved — cannot define max_list as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_MIN_LIST_PRED && arity === 2) {
        logicError("'min_list/2' is reserved — cannot define min_list as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SUBLIST_PRED && arity === 3) {
        logicError("'sublist/3' is reserved — cannot define sublist as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_PERMUTATION_PRED && arity === 2) {
        logicError("'permutation/2' is reserved — cannot define permutation as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_COMBINATIONS_PRED && arity === 3) {
        logicError("'combinations/3' is reserved — cannot define combinations as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_CALL_PRED && arity === 1) {
        logicError("'call/1' is reserved — cannot define call as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_INCLUDE_PRED && arity === 3) {
        logicError("'include/3' is reserved — cannot define include as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_EXCLUDE_PRED && arity === 3) {
        logicError("'exclude/3' is reserved — cannot define exclude as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_PARTITION_PRED && arity === 4) {
        logicError("'partition/4' is reserved — cannot define partition as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_CONVLIST_PRED && arity === 3) {
        logicError("'convlist/3' is reserved — cannot define convlist as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_MAPLIST_PRED && (arity === 2 || arity === 3)) {
        logicError(`'maplist/${arity}' is reserved — cannot define maplist as constraint head`, c.line);
      } else if (pred === LOGIC_BUILTIN_FOLDL_PRED && (arity === 4 || arity === 5)) {
        logicError(`'foldl/${arity}' is reserved — cannot define foldl as constraint head`, c.line);
      } else if (pred === LOGIC_BUILTIN_FINDALL_PRED && arity === 3) {
        logicError("'findall/3' is reserved — cannot define findall as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_BAGOF_PRED && arity === 3) {
        logicError("'bagof/3' is reserved — cannot define bagof as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_SETOF_PRED && arity === 3) {
        logicError("'setof/3' is reserved — cannot define setof as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_TRUE_PRED && arity === 0) {
        logicError("'true/0' is reserved — cannot define true as constraint head", c.line);
      } else if (pred === LOGIC_BUILTIN_FAIL_PRED && arity === 0) {
        logicError("'fail/0' is reserved — cannot define fail as constraint head", c.line);
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
    } else if (t.kind === 'dif_list') {
      walkTerm(t.front);
      walkTerm(t.hole);
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
    const m = line.match(
      /^([A-Z_][A-Za-z0-9_]*)\s+is\s+(number|bool|text|float)(?:\/([A-Za-z0-9]+))?(?:\s+list)?\s+([a-zA-Z_][A-Za-z0-9_]*)$/,
    );
    if (!m) {
      throw new Error(`logic program block: invalid binding '${line}' (expected 'Var is type [/format] [list] pin')`);
    }
    const listFlag = /\blist\b/.test(line);
    let numberFormat = null;
    if (m[3]) {
      if (m[2] === 'number') {
        if (typeof parseLogicNumberFormatToken !== 'function') {
          throw new Error('logic-number-formats is not loaded');
        }
        numberFormat = parseLogicNumberFormatToken(m[3], `program block pin '${m[4]}'`);
      } else if (m[2] === 'float') {
        if (typeof parseLogicFloatFormatToken !== 'function') {
          throw new Error('logic-float-formats is not loaded');
        }
        numberFormat = parseLogicFloatFormatToken(m[3], `program block pin '${m[4]}'`);
      }
    }
    bindings.push({
      logicVar: m[1],
      bindType: m[2],
      numberFormat,
      listFlag,
      pinName: m[4],
    });
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

function logicFormatFloatLiteral(v) {
  if (v == null || isNaN(v)) return '0.0';
  if (!Number.isFinite(v)) return String(v);
  const s = String(v);
  if (s.indexOf('.') >= 0 || s.indexOf('e') >= 0 || s.indexOf('E') >= 0) return s;
  return `${s}.0`;
}

function logicFormatTerm(t) {
  if (!t) return '';
  if (t.kind === 'var') return t.name;
  if (t.kind === 'atom') return t.name;
  if (t.kind === 'number') return String(t.value);
  if (t.kind === 'float') return logicFormatFloatLiteral(t.value);
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
