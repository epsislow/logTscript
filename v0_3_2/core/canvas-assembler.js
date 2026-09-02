/* ================= CANVAS ASSEMBLER (inline [canvas]) ================= */

const CANVAS_FORBIDDEN_IDS = new Set([
  'do', 'return', 'true', 'false',
  'and', 'or', 'not',
]);

const CANVAS_KEYWORDS = new Set(['if', 'else', 'for', 'while', 'break', 'continue']);

const CANVAS_CMP_OPS = new Set(['==', '!=', '<', '>', '<=', '>=']);
const CANVAS_LOGIC_OPS = new Set(['&&', '||']);

const CANVAS_BUILTINS = new Set([
  'styleFill', 'styleStroke', 'style',
  'drawRect', 'drawCircle', 'drawLine', 'drawText',
  'textAlign', 'textBaseline', 'fontSize', 'fontFamily', 'fontStyle',
  'symbolSize', 'symbolStyle', 'drawSymbol',
  'beginPath', 'moveTo', 'lineTo', 'arc', 'closePath',
  'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'polygon',
]);

function canvasError(msg, line) {
  if (line != null) throw new Error(`canvas line ${line}: ${msg}`);
  throw new Error(`canvas: ${msg}`);
}

function canvasIsIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function canvasIsIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function canvasTokenize(src) {
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
    if (ch === '*' || ch === '/' || ch === '+' || ch === '-' || ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ',' || ch === ';' || ch === '[' || ch === ']') {
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
      if (CANVAS_KEYWORDS.has(lower)) {
        tokens.push({ type: 'KW', value: lower, line: startLine });
        continue;
      }
      if (CANVAS_FORBIDDEN_IDS.has(lower)) {
        canvasError(`'${id}' is not allowed in canvas body`, startLine);
      }
      tokens.push({ type: 'ID', value: id, line: startLine });
      continue;
    }
    canvasError(`unexpected character '${ch}'`, line);
  }
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

class CanvasParser {
  constructor(tokens, ctxLabel) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctxLabel = ctxLabel || 'canvas';
  }

  peek() {
    return this.tokens[this.pos];
  }

  eat(type, value) {
    const t = this.peek();
    if (t.type !== type) {
      canvasError(`expected ${type}${value != null ? ` '${value}'` : ''}, got ${t.type} '${t.value}'`, t.line);
    }
    if (value != null && t.value !== value) {
      canvasError(`expected '${value}', got '${t.value}'`, t.line);
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
        canvasError(`duplicate method '${method.name}'`, method.line);
      }
      methods[method.name] = method;
    }
    return { methods };
  }

  parseParam() {
    const nameTok = this.eat('ID');
    let vector = false;
    if (this.match('SYM', '[')) {
      this.eat('SYM', ']');
      vector = true;
    }
    return { name: nameTok.value, vector, line: nameTok.line };
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
        canvasError('unclosed method body', nameTok.line);
      }
      body.push(this.parseStmt());
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
      canvasError(`expected postfix ++ or -- after '${nameTok.value}'`, nameTok.line);
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
    canvasError('expected for clause assign or postfix ++/--', t.line);
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
    if (t.type === 'ID') {
      const next = this.tokens[this.pos + 1];
      if (next && next.type === 'SYM' && next.value === '(') {
        return { kind: 'call', ...this.parseCall() };
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
    canvasError(`expected statement, got ${t.type} '${t.value}'`, t.line);
  }

  parseBlock() {
    this.eat('SYM', '{');
    const body = [];
    while (!this.match('SYM', '}')) {
      if (this.match('EOF')) {
        canvasError('unclosed block', this.peek().line);
      }
      body.push(this.parseStmt());
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
    if (t.type === 'SYM' && CANVAS_CMP_OPS.has(t.value)) {
      this.pos++;
      const op = t.value;
      const right = this.parseAdd();
      return { kind: 'binop', op, left, right };
    }
    return { kind: 'truthy', expr: left };
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

  parseCall(isRenderer) {
    const name = this.eat('ID').value;
    const line = this.tokens[this.pos - 1].line;
    this.eat('SYM', '(');
    const args = [];
    if (!this.match('SYM', ')')) {
      args.push(isRenderer ? this.parseRendererArg() : this.parseExpr());
      while (this.match('SYM', ',')) {
        args.push(isRenderer ? this.parseRendererArg() : this.parseExpr());
      }
      this.eat('SYM', ')');
    }
    return { name, args, line };
  }

  parseRendererArg() {
    if (this.match('NUM') || this.match('FLOAT')) {
      return { kind: 'number', value: this.tokens[this.pos - 1].value };
    }
    if (this.match('STR')) {
      return { kind: 'string', value: this.tokens[this.pos - 1].value };
    }
    if (this.match('ID')) {
      const pinName = this.tokens[this.pos - 1].value;
      if (this.match('SYM', '/')) {
        const fmtTok = this.eat('ID').value;
        const parseFmt = typeof canvasParseFormatToken === 'function'
          ? canvasParseFormatToken
          : null;
        if (!parseFmt) throw new Error('canvas-wire is not loaded');
        const fmt = parseFmt(fmtTok, this.ctxLabel);
        return {
          kind: 'wireRef',
          pinName,
          bindType: fmt.bindType,
          numberFormat: fmt.numberFormat,
        };
      }
      canvasError(`renderer arg must be literal or pinName/format, not bare '${pinName}'`, this.tokens[this.pos - 1].line);
    }
    if (this.match('SYM', '(')) {
      const expr = this.parseExpr();
      this.eat('SYM', ')');
      return expr;
    }
    const t = this.peek();
    canvasError(`expected renderer arg, got ${t.type} '${t.value}'`, t.line);
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
      canvasError(`prefix ${this.isPostfixIncDec()} is not allowed, use i${this.isPostfixIncDec()} instead`, this.peek().line);
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
    canvasError(`expected expression, got ${t.type} '${t.value}'`, t.line);
  }

  parseRendererBody() {
    const calls = [];
    while (!this.match('EOF')) {
      const t = this.peek();
      if (t.type === 'ID') {
        calls.push({ kind: 'call', ...this.parseCall(true) });
        continue;
      }
      canvasError(`expected renderer call, got ${t.type} '${t.value}'`, t.line);
    }
    return calls;
  }
}

function parseCanvasBody(bodyRaw, ctxLabel) {
  const src = (bodyRaw || '').trim();
  if (!src) return { methods: {} };
  const tokens = canvasTokenize(src);
  const parser = new CanvasParser(tokens, ctxLabel);
  return parser.parseProgram();
}

function parseCanvasRendererBlock(bodyRaw, ctxLabel) {
  const src = (bodyRaw || '').trim();
  if (!src) return [];
  const tokens = canvasTokenize(src);
  const parser = new CanvasParser(tokens, ctxLabel);
  return parser.parseRendererBody();
}

function canvasValidateColorLiteral(value, line) {
  if (value === 0 || value === '0') return true;
  if (typeof value !== 'string') {
    canvasError('color must be string or 0', line);
  }
  if (value === '0') return true;
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) {
    canvasError(`invalid color '${value}' — use "rrggbb" or "rrggbbaa" or 0`, line);
  }
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCanvasBody,
    parseCanvasRendererBlock,
    canvasTokenize,
    canvasValidateColorLiteral,
    CANVAS_BUILTINS,
    CANVAS_FORBIDDEN_IDS,
  };
}
