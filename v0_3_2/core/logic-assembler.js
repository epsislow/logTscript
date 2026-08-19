/* ================= LOGIC ASSEMBLER (inline [logic]) ================= */

const LOGIC_KEYWORDS = new Set(['query', 'use']);

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
    if (ch === '(' ) { tokens.push({ type: 'LP', value: '(', line: startLine }); i++; continue; }
    if (ch === ')' ) { tokens.push({ type: 'RP', value: ')', line: startLine }); i++; continue; }
    if (ch === '.' ) { tokens.push({ type: 'DOT', value: '.', line: startLine }); i++; continue; }
    if (ch === ':' ) { tokens.push({ type: 'COLON', value: ':', line: startLine }); i++; continue; }
    if (ch === '\\' && src[i + 1] === '+') {
      tokens.push({ type: 'NOT', value: '\\+', line: startLine }); i += 2; continue;
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
    while (!this.at('EOF')) {
      while (this.at('COMMA')) this.advance();
      if (this.at('EOF')) break;
      if (this.at('KW', 'use')) {
        this.advance();
        if (!this.at('DOT')) logicError('expected inline reference after use', this.peek().line);
        this.advance();
        const refName = this.expect('ID').value;
        uses.push('.' + refName);
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
      const clause = this.parseClause();
      clauses.push(clause);
    }
    return { uses, queries, clauses };
  }

  parseClause() {
    const head = this.parseCompound();
    let body = [];
    if (this.at('ARROW')) {
      this.advance();
      body = this.parseBodyGoals();
    }
    return { head, body };
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
    if (this.at('ID') && this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === 'LP') {
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
    if (left.kind === 'compound') return { kind: 'call', ...left };
    logicError('invalid body goal', this.peek().line);
  }

  parseCompound() {
    const predicate = this.expect('ID').value;
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
    return { kind: 'compound', predicate, args };
  }

  parseTerm() {
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
}

function parseLogicBody(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw);
  const tokens = logicTokenize(src);
  const parsed = new LogicParser(tokens).parseProgram();
  logicValidateProgram(parsed);
  return parsed;
}

function logicValidateProgram(prog) {
  for (const q of prog.queries || []) {
    if (!q.name || !logicQueryGoals(q).length) {
      throw new Error('logic query requires name and goal');
    }
  }
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
    } else if (t.kind === 'arith') {
      walkTerm(t.left); walkTerm(t.right);
    }
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

function parseLogicProgramBlock(bodyRaw) {
  const src = bodyRaw == null ? '' : String(bodyRaw).trim();
  const bindings = [];
  const lines = src.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;
    const m = line.match(/^([A-Z_][A-Za-z0-9_]*)\s+is\s+(number|bool|text)\s+([a-zA-Z_][A-Za-z0-9_]*)$/);
    if (!m) {
      throw new Error(`logic program block: invalid binding '${line}' (expected 'Var is type pin')`);
    }
    bindings.push({ logicVar: m[1], bindType: m[2], pinName: m[3] });
  }
  return bindings;
}

function mergeLogicDefinitions(base, usedInst) {
  if (!usedInst) return base;
  const merged = {
    uses: [...(base.uses || [])],
    queries: [...(base.queries || [])],
    clauses: [...(base.clauses || []), ...(usedInst.clauses || [])],
  };
  return merged;
}

function logicResolveMerged(inlineInst, inlineInstances) {
  let def = {
    uses: inlineInst.uses || [],
    queries: inlineInst.queries || [],
    clauses: inlineInst.clauses || [],
  };
  const seen = new Set();
  const queue = [...(def.uses || [])];
  while (queue.length) {
    const ref = queue.shift();
    if (seen.has(ref)) continue;
    seen.add(ref);
    const used = inlineInstances.get(ref);
    if (!used || used.kind !== 'logic') {
      throw new Error(`logic use ${ref} must reference inline [logic]`);
    }
    def.clauses = def.clauses.concat(used.clauses || []);
    for (const u of used.uses || []) {
      if (!seen.has(u)) queue.push(u);
    }
  }
  return def;
}

function formatLogicInstanceDoc(name, inst) {
  const lines = [`inline [logic] ${name}:`];
  for (const u of inst.uses || []) lines.push(`  use ${u}`);
  for (const c of inst.clauses || []) {
    const head = logicFormatCompound(c.head);
    if (c.body && c.body.length) {
      lines.push(`  ${head} <- ${c.body.map(logicFormatGoal).join(', ')}`);
    } else {
      lines.push(`  ${head}`);
    }
  }
  for (const q of inst.queries || []) {
    lines.push(`  query ${q.name}:`);
    lines.push(`    ${logicQueryGoals(q).map(logicFormatGoal).join(', ')}`);
  }
  lines.push('  :');
  return lines.join('\n');
}

function logicFormatCompound(c) {
  if (!c) return '';
  const args = (c.args || []).map(logicFormatTerm).join(', ');
  return `${c.predicate}(${args})`;
}

function logicFormatGoal(g) {
  if (!g) return '';
  if (g.kind === 'not') return `\\+ ${logicFormatGoal(g.goal)}`;
  if (g.kind === 'call' || g.kind === 'compound') return logicFormatCompound(g);
  if (g.kind === 'cmp') return `${logicFormatTerm(g.left)} ${g.op} ${logicFormatTerm(g.right)}`;
  if (g.kind === 'unify') return `${logicFormatTerm(g.left)} = ${logicFormatTerm(g.right)}`;
  return '';
}

function logicFormatTerm(t) {
  if (!t) return '';
  if (t.kind === 'var') return t.name;
  if (t.kind === 'atom') return t.name;
  if (t.kind === 'number') return String(t.value);
  if (t.kind === 'compound') return logicFormatCompound(t);
  if (t.kind === 'arith') return `${logicFormatTerm(t.left)} ${t.op} ${logicFormatTerm(t.right)}`;
  return '';
}

function formatLogicTypeDoc() {
  return [
    'inline [logic] — declarative knowledge base',
    '',
    '  Facts:     owns(john, chevy)',
    '  Rules:     modifier2(X, 0) <- X >= 9, X =< 12',
    '  Queries:   query johnOwns: owns(john, X)',
    '  Compose:   use .otherModule',
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
  return JSON.stringify({ clauses: inst.clauses, queries: inst.queries, uses: inst.uses });
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

if (typeof globalThis !== 'undefined') {
  globalThis.parseLogicBody = parseLogicBody;
  globalThis.parseLogicGoalsBlock = parseLogicGoalsBlock;
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
