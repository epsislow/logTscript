/* ================= PLC ASSEMBLER (inline [plc]) ================= */

const PLC_KEYWORDS = new Set([
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
  'AND', 'OR', 'NOT', 'XOR',
  'TRUE', 'FALSE',
  'INPUTS', 'OUTPUTS',
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
    if (ch === '{' || ch === '}' || ch === ':' || ch === '=' || ch === '(' || ch === ')') {
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
    return t.type === 'ID' || (t.type === 'KW' && t.value === 'IF');
  }

  parseStatement() {
    if (this.match('KW', 'IF')) {
      return this.parseIf();
    }
    const targetTok = this.eat('ID');
    const target = targetTok.value;
    this.eat('SYM', '=');
    const expr = this.parseExpr();
    return { type: 'assign', target, expr, line: targetTok.line };
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
      return { type: 'symbol', name: this.eat('ID').value };
    }
    plcError(`expected expression, got ${this.peek().type}`, this.peek().line);
  }
}

function plcCollectSymbols(expr, out) {
  if (!expr) return;
  if (expr.type === 'symbol') out.add(expr.name);
  else if (expr.type === 'unary') plcCollectSymbols(expr.arg, out);
  else if (expr.type === 'binary') {
    plcCollectSymbols(expr.left, out);
    plcCollectSymbols(expr.right, out);
  }
}

function plcValidateProgram(parsed) {
  const inputs = parsed.inputs || {};
  const outputs = parsed.outputs || {};

  function symInfo(name) {
    if (inputs[name]) return { kind: 'input', width: inputs[name].width };
    if (outputs[name]) return { kind: 'output', width: outputs[name].width };
    return null;
  }

  function checkExpr1Bit(expr, ctx) {
    const used = new Set();
    plcCollectSymbols(expr, used);
    for (const n of used) {
      const info = symInfo(n);
      if (!info) plcError(`unknown symbol ${n}`, ctx);
      if (info.width !== 1) plcError(`IF requires 1-bit symbol, got ${n} (${info.width} bits)`, ctx);
    }
  }

  function checkStmt(stmt) {
    if (stmt.type === 'assign') {
      const targetInfo = symInfo(stmt.target);
      if (!targetInfo) plcError(`unknown symbol ${stmt.target}`, stmt.line);
      if (targetInfo.kind === 'input') plcError(`cannot assign to input ${stmt.target}`, stmt.line);
      if (targetInfo.width !== 1) {
        plcError(`assignment requires 1-bit symbol, got ${stmt.target} (${targetInfo.width} bits)`, stmt.line);
      }
      checkExpr1Bit(stmt.expr, stmt.line);
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

function plcEvalExpr(expr, env) {
  if (expr.type === 'literal') return expr.value;
  if (expr.type === 'symbol') {
    if (!env.has(expr.name)) return '0';
    return plcBit(env.get(expr.name));
  }
  if (expr.type === 'unary' && expr.op === 'NOT') {
    return plcEvalExpr(expr.arg, env) === '1' ? '0' : '1';
  }
  if (expr.type === 'binary') {
    const a = plcEvalExpr(expr.left, env) === '1';
    const b = plcEvalExpr(expr.right, env) === '1';
    if (expr.op === 'AND') return (a && b) ? '1' : '0';
    if (expr.op === 'OR') return (a || b) ? '1' : '0';
    if (expr.op === 'XOR') return (a !== b) ? '1' : '0';
  }
  return '0';
}

function plcExecStmt(stmt, env) {
  if (stmt.type === 'assign') {
    env.set(stmt.target, plcEvalExpr(stmt.expr, env));
    return;
  }
  if (stmt.type === 'if') {
    if (plcEvalExpr(stmt.cond, env) === '1') {
      for (const s of stmt.thenBody) plcExecStmt(s, env);
      return;
    }
    for (const e of stmt.elsif || []) {
      if (plcEvalExpr(e.cond, env) === '1') {
        for (const s of e.body) plcExecStmt(s, env);
        return;
      }
    }
    for (const s of stmt.elseBody || []) plcExecStmt(s, env);
  }
}

function executePlcScan(inst, externalInputs, outputState) {
  const inputs = inst.inputs || {};
  const outputs = inst.outputs || {};
  const env = new Map();

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
    plcExecStmt(stmt, env);
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
  if (expr.type === 'unary') return `NOT ${formatPlcExpr(expr.arg)}`;
  if (expr.type === 'binary') return `${formatPlcExpr(expr.left)} ${expr.op} ${formatPlcExpr(expr.right)}`;
  return '?';
}

function formatPlcStmt(stmt, indent) {
  const pad = '  '.repeat(indent);
  if (stmt.type === 'assign') {
    return `${pad}${stmt.target} = ${formatPlcExpr(stmt.expr)}`;
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
  return lines;
}

function formatPlcTypeDoc() {
  return [
    'inline [plc] .name:',
    '  inputs: { START, STOP: 1 }',
    '  outputs: { MOTOR }',
    '  IF START AND NOT STOP THEN',
    '    MOTOR = TRUE',
    '  ELSE',
    '    MOTOR = FALSE',
    '  END_IF',
    '  :',
    '',
    'Keywords: IF THEN ELSE ELSIF END_IF AND OR NOT XOR TRUE FALSE',
    'Bind with comp [plc] program: .name and I/O map (see doc/plc.md)',
  ];
}

const plcAssemblerExports = {
  parsePlcBody,
  executePlcScan,
  formatPlcInstanceDoc,
  formatPlcTypeDoc,
  plcBit,
  plcNormalizeBits,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = plcAssemblerExports;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parsePlcBody = parsePlcBody;
  globalThis.executePlcScan = executePlcScan;
  globalThis.formatPlcInstanceDoc = formatPlcInstanceDoc;
  globalThis.formatPlcTypeDoc = formatPlcTypeDoc;
}
