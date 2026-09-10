/* ================= INTERP ASSEMBLER (inline [interp]) ================= */

const INTERP_FORBIDDEN_IDS = new Set([
  'do', 'true', 'false',
  'and', 'or', 'not',
]);

const INTERP_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'break', 'continue', 'return',
  'push', 'remove', 'removeall',
]);

const INTERP_CMP_OPS = new Set(['==', '!=', '<', '>', '<=', '>=']);

const INTERP_TYPE_RE = /^(u\d+|s\d+|ascii|bool|u1|f32|f64|fp16|bf16|q\d+p\d+)$/;

function interpError(msg, line) {
  if (line != null) throw new Error(`interp line ${line}: ${msg}`);
  throw new Error(`interp: ${msg}`);
}

function validateInterpType(typeName, line) {
  if (!typeName || !INTERP_TYPE_RE.test(typeName)) {
    interpError(`unknown type '/${typeName || ''}'`, line);
  }
}

function canvasIsIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function canvasIsIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function interpTokenize(src) {
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
    if (ch === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      const startLine = line;
      i++;
      while (i < src.length) {
        const c = src[i];
        if (c === '\\' && i + 1 < src.length) {
          const esc = src[i + 1];
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === '\\') str += '\\';
          else if (esc === quote) str += quote;
          else str += esc;
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        if (c === '\n') line++;
        str += c;
        i++;
      }
      tokens.push({ type: 'STR', value: str, line: startLine });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < src.length && /[0-9]/.test(src[i + 1]))) {
      let num = '';
      const startLine = line;
      let isFloat = false;
      while (i < src.length && /[0-9]/.test(src[i])) {
        num += src[i];
        i++;
      }
      if (i < src.length && src[i] === '.') {
        const peek = i + 1 < src.length ? src[i + 1] : '';
        if (/[0-9]/.test(peek)) {
          isFloat = true;
          num += '.';
          i++;
          while (i < src.length && /[0-9]/.test(src[i])) {
            num += src[i];
            i++;
          }
        }
      }
      tokens.push({
        type: isFloat ? 'FLOAT' : 'NUM',
        value: isFloat ? parseFloat(num) : parseInt(num, 10),
        line: startLine,
      });
      continue;
    }
    if (i + 1 < src.length) {
      const pair = ch + src[i + 1];
      if (pair === '==' || pair === '!=' || pair === '<=' || pair === '>=' || pair === '&&' || pair === '||') {
        tokens.push({ type: 'SYM', value: pair, line });
        i += 2;
        continue;
      }
    }
    if (ch === '<' || ch === '>' || ch === '!') {
      tokens.push({ type: 'SYM', value: ch, line });
      i++;
      continue;
    }
    if (i + 1 < src.length && ch === '+' && src[i + 1] === '=') {
      tokens.push({ type: 'SYM', value: '+=', line });
      i += 2;
      continue;
    }
    if (ch === '*' || ch === '/' || ch === '+' || ch === '-' || ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ',' || ch === ';' || ch === ':' || ch === '[' || ch === ']' || ch === '~') {
      tokens.push({ type: 'SYM', value: ch, line });
      i++;
      continue;
    }
    if (ch === '=') {
      tokens.push({ type: 'SYM', value: '=', line });
      i++;
      continue;
    }
    if (canvasIsIdentStart(ch)) {
      let id = '';
      const startLine = line;
      while (i < src.length && canvasIsIdentPart(src[i])) {
        id += src[i];
        i++;
      }
      const lower = id.toLowerCase();
      if (INTERP_KEYWORDS.has(lower)) {
        tokens.push({ type: 'KW', value: lower, line: startLine });
        continue;
      }
      if (INTERP_FORBIDDEN_IDS.has(lower)) {
        interpError(`'${id}' is not allowed in canvas body`, startLine);
      }
      tokens.push({ type: 'ID', value: id, line: startLine });
      continue;
    }
    interpError(`unexpected character '${ch}'`, line);
  }
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

class InterpParser {
  constructor(tokens, ctxLabel) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctxLabel = ctxLabel || 'interp';
  }

  peek() {
    return this.tokens[this.pos];
  }

  eat(type, value) {
    const t = this.peek();
    if (t.type !== type) {
      interpError(`expected ${type}${value != null ? ` '${value}'` : ''}, got ${t.type} '${t.value}'`, t.line);
    }
    if (value != null && t.value !== value) {
      interpError(`expected '${value}', got '${t.value}'`, t.line);
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

  parseProgram() {
    const methods = {};
    while (!this.match('EOF')) {
      const method = this.parseMethod();
      if (methods[method.name]) {
        interpError(`duplicate method '${method.name}'`, method.line);
      }
      methods[method.name] = method;
    }
    return { methods };
  }

  parseParam() {
    const nameTok = this.eat('ID');
    let vector = false;
    let vectorFixedCount = 0;
    let asciiCharsPerElem = 0;
    let asciiNullDelim = false;
    if (this.match('SYM', '[')) {
      vector = true;
      if (this.peek().type === 'NUM') {
        vectorFixedCount = parseInt(this.eat('NUM').value, 10);
        if (!Number.isFinite(vectorFixedCount) || vectorFixedCount < 1) {
          interpError('[N]/type requires positive N', nameTok.line);
        }
      }
      this.eat('SYM', ']');
      if (this.match('SYM', '~')) {
        asciiNullDelim = true;
      } else if (this.peek().type === 'NUM') {
        asciiCharsPerElem = parseInt(this.eat('NUM').value, 10);
        if (!Number.isFinite(asciiCharsPerElem) || asciiCharsPerElem < 1) {
          interpError('[]M/ascii requires positive M', nameTok.line);
        }
      }
    }
    let typeName = null;
    if (this.match('SYM', '/')) {
      const typeTok = this.eat('ID');
      validateInterpType(typeTok.value, typeTok.line);
      typeName = typeTok.value;
    }
    if (asciiNullDelim && typeName !== 'ascii') {
      interpError('~/ is only valid for /ascii', nameTok.line);
    }
    if (asciiNullDelim && asciiCharsPerElem > 0) {
      interpError('param cannot combine ~/ascii with []M/ascii', nameTok.line);
    }
    if (asciiCharsPerElem > 0 && typeName !== 'ascii') {
      interpError('[]M/type is only valid for /ascii', nameTok.line);
    }
    return {
      name: nameTok.value,
      vector,
      typeName,
      asciiCharsPerElem,
      vectorFixedCount,
      asciiNullDelim,
      line: nameTok.line,
    };
  }

  parseMethod() {
    const nameTok = this.eat('ID');
    this.eat('SYM', '(');
    const params = [];
    if (!this.match('SYM', ')')) {
      params.push(this.parseParam());
      while (this.match('SYM', ',')) {
        params.push(this.parseParam());
      }
      this.eat('SYM', ')');
    }
    this.eat('SYM', '{');
    const body = [];
    while (!this.match('SYM', '}')) {
      if (this.match('EOF')) {
        interpError('unclosed method body', nameTok.line);
      }
      body.push(this.parseStmt());
      this.match('SYM', ';');
    }
    return { name: nameTok.value, params, body, line: nameTok.line };
  }

  isPostfixIncDec() {
    const t = this.peek();
    if (t.type !== 'SYM' || (t.value !== '+' && t.value !== '-')) return null;
    const t2 = this.tokens[this.pos + 1];
    if (!t2 || t2.type !== 'SYM' || t2.value !== t.value) return null;
    return t.value + t.value;
  }

  isPostfixIncDecAfterId() {
    const t1 = this.tokens[this.pos + 1];
    const t2 = this.tokens[this.pos + 2];
    if (!t1 || t1.type !== 'SYM' || !t2 || t2.type !== 'SYM') return null;
    if (t1.value === '+' && t2.value === '+') return '++';
    if (t1.value === '-' && t2.value === '-') return '--';
    return null;
  }

  consumePostfixIncDec() {
    const op = this.isPostfixIncDec();
    if (!op) return null;
    this.pos += 2;
    return op;
  }

  parsePostfixUpdate() {
    const nameTok = this.eat('ID');
    const op = this.consumePostfixIncDec();
    if (!op) {
      interpError(`expected postfix ++ or -- after '${nameTok.value}'`, nameTok.line);
    }
    return { kind: 'postfix', name: nameTok.value, op, line: nameTok.line };
  }

  parseForClause(beforeCloseParen) {
    const t = this.peek();
    if (beforeCloseParen && t.type === 'SYM' && t.value === ')') return null;
    if (!beforeCloseParen && t.type === 'SYM' && t.value === ';') return null;
    if (t.type === 'ID') {
      const next = this.tokens[this.pos + 1];
      if (next && next.type === 'SYM' && next.value === '=') {
        return this.parseAssign();
      }
      if (this.isPostfixIncDecAfterId()) {
        return this.parsePostfixUpdate();
      }
    }
    interpError('expected for clause assign or postfix ++/--', t.line);
  }

  parseForStmt() {
    const lineTok = this.eat('KW', 'for');
    this.eat('SYM', '(');
    const init = this.parseForClause(false);
    this.eat('SYM', ';');
    let cond = null;
    if (!(this.peek().type === 'SYM' && this.peek().value === ';')) {
      cond = this.parseCond();
    }
    this.eat('SYM', ';');
    const step = this.parseForClause(true);
    this.eat('SYM', ')');
    const body = this.parseBlock();
    return { kind: 'for', init, cond, step, body, line: lineTok.line };
  }

  parseWhileStmt() {
    const lineTok = this.eat('KW', 'while');
    this.eat('SYM', '(');
    const cond = this.parseCond();
    this.eat('SYM', ')');
    const body = this.parseBlock();
    return { kind: 'while', cond, body, line: lineTok.line };
  }

  parseStmt() {
    const t = this.peek();
    if (t.type === 'KW' && t.value === 'if') {
      return this.parseIfStmt();
    }
    if (t.type === 'KW' && t.value === 'for') {
      return this.parseForStmt();
    }
    if (t.type === 'KW' && t.value === 'while') {
      return this.parseWhileStmt();
    }
    if (t.type === 'KW' && t.value === 'break') {
      const lineTok = this.eat('KW', 'break');
      return { kind: 'break', line: lineTok.line };
    }
    if (t.type === 'KW' && t.value === 'continue') {
      const lineTok = this.eat('KW', 'continue');
      return { kind: 'continue', line: lineTok.line };
    }
    if (t.type === 'KW' && t.value === 'return') {
      return this.parseReturnStmt();
    }
    if (t.type === 'KW' && t.value === 'push') {
      return this.parsePushStmt();
    }
    if (t.type === 'KW' && t.value === 'remove') {
      return this.parseRemoveStmt();
    }
    if (t.type === 'KW' && t.value === 'removeall') {
      const lineTok = this.eat('KW', 'removeall');
      return { kind: 'removeall', line: lineTok.line };
    }
    if (t.type === 'ID') {
      const next = this.tokens[this.pos + 1];
      if (next && next.type === 'SYM' && next.value === '(') {
        return { kind: 'call', ...this.parseCall() };
      }
      if (next && next.type === 'SYM' && next.value === ',') {
        return this.parseDestructuringAssign();
      }
      if (next && next.type === 'SYM' && next.value === '[') {
        return this.parseVectorAssign();
      }
      if (next && next.type === 'SYM' && next.value === '+=') {
        return this.parseConcatAssign();
      }
      if (next && next.type === 'SYM' && next.value === '=') {
        return this.parseAssign();
      }
      if (this.isPostfixIncDecAfterId()) {
        return this.parsePostfixUpdate();
      }
    }
    interpError(`expected statement, got ${t.type} '${t.value}'`, t.line);
  }

  parseBlock() {
    this.eat('SYM', '{');
    const body = [];
    while (!this.match('SYM', '}')) {
      if (this.match('EOF')) {
        interpError('unclosed block', this.peek().line);
      }
      body.push(this.parseStmt());
      this.match('SYM', ';');
    }
    return body;
  }

  parseIfStmt() {
    const lineTok = this.eat('KW', 'if');
    this.eat('SYM', '(');
    const cond = this.parseCond();
    this.eat('SYM', ')');
    const thenBody = this.parseBlock();
    let elseBody = null;
    if (this.match('KW', 'else')) {
      if (this.peek().type === 'KW' && this.peek().value === 'if') {
        elseBody = [this.parseIfStmt()];
      } else {
        elseBody = this.parseBlock();
      }
    }
    return { kind: 'if', cond, then: thenBody, else: elseBody, line: lineTok.line };
  }

  parseCond() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.match('SYM', '||')) {
      left = { kind: 'binop', op: '||', left, right: this.parseAnd() };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.match('SYM', '&&')) {
      left = { kind: 'binop', op: '&&', left, right: this.parseNot() };
    }
    return left;
  }

  parseNot() {
    if (this.match('SYM', '!')) {
      return { kind: 'unary', op: '!', expr: this.parseNot() };
    }
    return this.parseCompare();
  }

  parseCompare() {
    const left = this.parseAdd();
    const t = this.peek();
    if (t.type === 'SYM' && INTERP_CMP_OPS.has(t.value)) {
      this.pos++;
      const op = t.value;
      const right = this.parseAdd();
      return { kind: 'binop', op, left, right };
    }
    return { kind: 'truthy', expr: left };
  }

  parseReturnStmt() {
    const lineTok = this.eat('KW', 'return');
    const exprs = [this.parseExpr()];
    while (this.match('SYM', ',')) {
      if (exprs.length >= 10) {
        interpError('return may have at most 10 values', this.peek().line);
      }
      exprs.push(this.parseExpr());
    }
    return { kind: 'return', exprs, line: lineTok.line };
  }

  parsePushStmt() {
    const lineTok = this.eat('KW', 'push');
    const entries = [];
    entries.push(this.parsePushEntry());
    while (this.match('SYM', ',')) {
      this.eat('SYM', ',');
      entries.push(this.parsePushEntry());
    }
    return { kind: 'push', entries, line: lineTok.line };
  }

  parsePushEntry() {
    const channelTok = this.eat('ID');
    this.eat('SYM', ':');
    const expr = this.parseExpr();
    return { channel: channelTok.value, expr, line: channelTok.line };
  }

  parseRemoveStmt() {
    const lineTok = this.eat('KW', 'remove');
    const channelTok = this.eat('ID');
    return { kind: 'remove', channel: channelTok.value, line: lineTok.line };
  }

  parseDestructuringAssign() {
    const lineTok = this.eat('ID');
    const names = [lineTok.value];
    while (this.match('SYM', ',')) {
      if (names.length >= 10) {
        interpError('destructuring assignment may have at most 10 names', this.peek().line);
      }
      names.push(this.eat('ID').value);
    }
    this.eat('SYM', '=');
    const expr = this.parseExpr();
    return { kind: 'destructureAssign', names, expr, line: lineTok.line };
  }

  parseAssign() {
    const name = this.eat('ID').value;
    this.eat('SYM', '=');
    const expr = this.parseExpr();
    return { kind: 'assign', name, expr };
  }

  parseVectorAssign() {
    const nameTok = this.eat('ID');
    this.eat('SYM', '[');
    if (this.match('SYM', ']')) {
      this.eat('SYM', '=');
      const expr = this.parseExpr();
      return { kind: 'append', name: nameTok.value, expr, line: nameTok.line };
    }
    const index = this.parseExpr();
    this.eat('SYM', ']');
    this.eat('SYM', '=');
    const expr = this.parseExpr();
    return { kind: 'indexAssign', name: nameTok.value, index, expr, line: nameTok.line };
  }

  parseConcatAssign() {
    const nameTok = this.eat('ID');
    this.eat('SYM', '+=');
    const expr = this.parseExpr();
    return { kind: 'concatAssign', name: nameTok.value, expr, line: nameTok.line };
  }

  parseCall() {
    const name = this.eat('ID').value;
    const line = this.tokens[this.pos - 1].line;
    this.eat('SYM', '(');
    const args = [];
    if (!this.match('SYM', ')')) {
      args.push(this.parseExpr());
      while (this.match('SYM', ',')) {
        args.push(this.parseExpr());
      }
      this.eat('SYM', ')');
    }
    return { name, args, line };
  }

  parseExpr() {
    return this.parseAdd();
  }

  parseAdd() {
    let left = this.parseMul();
    while (this.match('SYM', '+') || this.match('SYM', '-')) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseMul();
      left = { kind: 'binop', op, left, right };
    }
    return left;
  }

  parseMul() {
    let left = this.parseUnary();
    while (this.match('SYM', '*') || this.match('SYM', '/')) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseUnary();
      left = { kind: 'binop', op, left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.isPostfixIncDec()) {
      interpError(`prefix ${this.isPostfixIncDec()} is not allowed, use i${this.isPostfixIncDec()} instead`, this.peek().line);
    }
    if (this.match('SYM', '-')) {
      return { kind: 'unary', op: '-', expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.peek();
    if (this.match('NUM') || this.match('FLOAT')) {
      return { kind: 'number', value: this.tokens[this.pos - 1].value };
    }
    if (this.match('STR')) {
      return { kind: 'string', value: this.tokens[this.pos - 1].value };
    }
    if (this.match('SYM', '[')) {
      const lineTok = this.tokens[this.pos - 1];
      const elements = [];
      if (!this.match('SYM', ']')) {
        elements.push(this.parseExpr());
        while (this.match('SYM', ',')) {
          elements.push(this.parseExpr());
        }
        this.eat('SYM', ']');
      }
      return { kind: 'array', elements, line: lineTok.line };
    }
    if (this.match('ID')) {
      const idTok = this.tokens[this.pos - 1];
      const id = idTok.value;
      if (this.match('SYM', '(')) {
        const args = [];
        if (!this.match('SYM', ')')) {
          args.push(this.parseExpr());
          while (this.match('SYM', ',')) {
            args.push(this.parseExpr());
          }
          this.eat('SYM', ')');
        }
        return { kind: 'call', name: id, args, line: idTok.line };
      }
      const postOp = this.consumePostfixIncDec();
      if (postOp) {
        return { kind: 'postfix', name: id, op: postOp, line: idTok.line };
      }
      if (this.match('SYM', '[')) {
        const index = this.parseExpr();
        this.eat('SYM', ']');
        return { kind: 'index', object: { kind: 'var', name: id }, index, line: idTok.line };
      }
      return { kind: 'var', name: id };
    }
    if (this.match('SYM', '(')) {
      const expr = this.parseExpr();
      this.eat('SYM', ')');
      return expr;
    }
    interpError(`expected expression, got ${t.type} '${t.value}'`, t.line);
  }

}

const INTERP_MAX_RETURN_VALUES = 10;

function interpMethodIsAst(method) {
  return (method.params || []).some((p) => p.typeName);
}

function collectReturnExprCounts(body, out) {
  for (const stmt of body || []) {
    if (stmt.kind === 'return') out.push(stmt.exprs.length);
    else if (stmt.kind === 'if') {
      collectReturnExprCounts(stmt.then, out);
      if (stmt.else) collectReturnExprCounts(stmt.else, out);
    } else if (stmt.kind === 'for' || stmt.kind === 'while') {
      collectReturnExprCounts(stmt.body, out);
    }
  }
}

function canReachEndOfBlock(stmts) {
  if (!stmts || !stmts.length) return true;
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const rest = stmts.slice(i + 1);
    if (stmt.kind === 'return') return false;
    if (stmt.kind === 'break' || stmt.kind === 'continue') {
      return rest.length > 0 && canReachEndOfBlock(rest);
    }
    if (stmt.kind === 'if') {
      if (stmt.else) {
        const thenReach = canReachEndOfBlock(stmt.then);
        const elseReach = canReachEndOfBlock(stmt.else);
        if (rest.length > 0) {
          if (!(thenReach || elseReach)) return false;
          return canReachEndOfBlock(rest);
        }
        return thenReach && elseReach;
      }
      if (rest.length > 0) {
        if (!canReachEndOfBlock(stmt.then)) {
          return canReachEndOfBlock(rest);
        }
        return canReachEndOfBlock(stmt.then) || canReachEndOfBlock(rest);
      }
      return canReachEndOfBlock(stmt.then);
    }
    if (stmt.kind === 'for' || stmt.kind === 'while') {
      if (rest.length > 0) return true;
    }
  }
  return true;
}

function validateReturnArity(method) {
  const counts = [];
  collectReturnExprCounts(method.body, counts);
  if (canReachEndOfBlock(method.body)) counts.push(1);
  const unique = [...new Set(counts)];
  if (unique.length > 1) {
    interpError(
      `method '${method.name}' return arity inconsistent (expected one count, got ${unique.join(', ')})`,
      method.line,
    );
  }
  const arity = unique.length ? unique[0] : 1;
  if (arity > INTERP_MAX_RETURN_VALUES) {
    interpError(`method '${method.name}' return may have at most ${INTERP_MAX_RETURN_VALUES} values`, method.line);
  }
  const isAst = interpMethodIsAst(method);
  if (isAst && arity > 1) {
    interpError(`AST method '${method.name}' cannot return multiple values`, method.line);
  }
  method.isAstMethod = isAst;
  method.returnArity = arity;
}

function validateExprCallArity(expr, program, line, expectMulti) {
  if (!expr || expr.kind !== 'call') return;
  const m = program.methods[expr.name];
  if (!m) return;
  if (expectMulti) {
    if (m.returnArity <= 1) {
      interpError(`helper '${expr.name}' returns one value, use simple assignment`, line);
    }
    return;
  }
  if (m.returnArity > 1) {
    interpError(`multi-return helper '${expr.name}' must be used with destructuring assignment`, line);
  }
}

function validateExprTree(expr, program, line) {
  if (!expr) return;
  if (expr.kind === 'call') {
    validateExprCallArity(expr, program, line, false);
    for (const a of expr.args || []) validateExprTree(a, program, line);
  } else if (expr.kind === 'binop') {
    validateExprTree(expr.left, program, line);
    validateExprTree(expr.right, program, line);
  } else if (expr.kind === 'unary') {
    validateExprTree(expr.expr, program, line);
  } else if (expr.kind === 'truthy') {
    validateExprTree(expr.expr, program, line);
  } else if (expr.kind === 'index') {
    validateExprTree(expr.object, program, line);
    validateExprTree(expr.index, program, line);
  } else if (expr.kind === 'array') {
    for (const el of expr.elements || []) validateExprTree(el, program, line);
  }
}

function validateStmtTree(stmts, program) {
  for (const stmt of stmts || []) {
    if (stmt.kind === 'destructureAssign') {
      if (stmt.expr.kind !== 'call') {
        interpError('destructuring assignment requires a helper call', stmt.line);
      }
      const m = program.methods[stmt.expr.name];
      if (!m) {
        interpError(`unknown method '${stmt.expr.name}'`, stmt.line);
      }
      if (stmt.names.length !== m.returnArity) {
        interpError(
          `destructuring expects ${m.returnArity} value(s) from '${stmt.expr.name}', got ${stmt.names.length}`,
          stmt.line,
        );
      }
      for (const a of stmt.expr.args || []) validateExprTree(a, program, stmt.line);
    } else if (stmt.kind === 'assign') {
      validateExprTree(stmt.expr, program, stmt.line);
    } else if (stmt.kind === 'return') {
      for (const ex of stmt.exprs) validateExprTree(ex, program, stmt.line);
    } else if (stmt.kind === 'if') {
      validateExprTree(stmt.cond, program, stmt.line);
      validateStmtTree(stmt.then, program);
      if (stmt.else) validateStmtTree(stmt.else, program);
    } else if (stmt.kind === 'for') {
      if (stmt.init && stmt.init.kind === 'assign') validateExprTree(stmt.init.expr, program, stmt.line);
      if (stmt.cond) validateExprTree(stmt.cond, program, stmt.line);
      if (stmt.step && stmt.step.kind === 'assign') validateExprTree(stmt.step.expr, program, stmt.line);
      validateStmtTree(stmt.body, program);
    } else if (stmt.kind === 'while') {
      validateExprTree(stmt.cond, program, stmt.line);
      validateStmtTree(stmt.body, program);
    } else if (stmt.kind === 'indexAssign' || stmt.kind === 'append' || stmt.kind === 'concatAssign') {
      validateExprTree(stmt.expr, program, stmt.line);
      if (stmt.index) validateExprTree(stmt.index, program, stmt.line);
    } else if (stmt.kind === 'call') {
      for (const a of stmt.args || []) validateExprTree(a, program, stmt.line);
    } else if (stmt.kind === 'push') {
      for (const entry of stmt.entries || []) validateExprTree(entry.expr, program, stmt.line);
    }
  }
}

function interpProgramUsesCompContext(stmts) {
  for (const stmt of stmts || []) {
    if (stmt.kind === 'push' || stmt.kind === 'remove' || stmt.kind === 'removeall') return true;
    if (stmt.kind === 'if') {
      if (interpProgramUsesCompContext(stmt.then)) return true;
      if (interpProgramUsesCompContext(stmt.else)) return true;
    } else if (stmt.kind === 'for' || stmt.kind === 'while') {
      if (interpProgramUsesCompContext(stmt.body)) return true;
    }
  }
  return false;
}

function validateInterpProgram(program) {
  const methods = program.methods || {};
  program.requiresCompContext = false;
  for (const name of Object.keys(methods)) {
    validateReturnArity(methods[name]);
  }
  for (const name of Object.keys(methods)) {
    validateStmtTree(methods[name].body, program);
    if (interpProgramUsesCompContext(methods[name].body)) {
      program.requiresCompContext = true;
    }
  }
}

function parseInterpBody(bodyRaw, ctxLabel) {
  const src = (bodyRaw || '').trim();
  if (!src) return { methods: {} };
  const tokens = interpTokenize(src);
  const parser = new InterpParser(tokens, ctxLabel);
  const program = parser.parseProgram();
  validateInterpProgram(program);
  return program;
}

function formatInterpTypeDoc() {
  return [
    'inline [interp] — AST interpreter methods',
    '',
    '  CallAdd(left/u8, right/u8) {',
    '      return left + right;',
    '  }',
    '',
    '  addPair(a, b) {          /* internal helper — params without /type */',
    '      return a + b;',
    '  }',
    '',
    'Block forms:  inline [interp] .lang: ... :   or   inline [interp] .lang { ... }',
    '',
    'See doc/inline-interp.md',
    'doc(inline.interp)  doc(.myInterp)',
    '',
    'Runtime:  .myInterp:eval(astWire, <schema>)  — evaluate typed AST wire',
  ];
}

function formatInterpInstanceDoc(name, inst) {
  const lines = [`inline [interp] ${name}`, ''];
  const methods = inst.methods || {};
  const names = Object.keys(methods);
  lines.push(`methods (${names.length}): ${names.join(', ') || '(none)'}`);
  for (const mname of names) {
    const m = methods[mname];
    lines.push('');
    const sig = (m.params || []).map((p) => {
      let s = p.name;
      if (p.vector) {
        s = p.name + '[' + (p.vectorFixedCount > 0 ? String(p.vectorFixedCount) : '') + ']';
        if (p.asciiNullDelim) s += '~';
        else if (p.asciiCharsPerElem > 0) s += String(p.asciiCharsPerElem);
      }
      if (p.typeName) s = s + '/' + p.typeName;
      return s;
    }).join(', ');
    lines.push(`${mname}(${sig})`);
  }
  return lines;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseInterpBody = parseInterpBody;
  globalThis.formatInterpTypeDoc = formatInterpTypeDoc;
  globalThis.formatInterpInstanceDoc = formatInterpInstanceDoc;
  globalThis.interpTokenize = interpTokenize;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseInterpBody,
    formatInterpTypeDoc,
    formatInterpInstanceDoc,
    interpTokenize,
    INTERP_TYPE_RE,
  };
}
