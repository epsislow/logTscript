/* ================= CANVAS ASSEMBLER (inline [canvas]) ================= */

const CANVAS_FORBIDDEN_IDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'return', 'true', 'false',
  'and', 'or', 'not', 'break', 'continue',
]);

const CANVAS_BUILTINS = new Set([
  'styleFill', 'styleStroke', 'style',
  'drawRect', 'drawCircle', 'drawLine', 'drawText',
  'textAlign', 'textBaseline', 'fontSize',
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
    if (ch === '*' || ch === '/' || ch === '+' || ch === '-' || ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ',') {
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

  parseMethod() {
    const nameTok = this.eat('ID');
    this.eat('SYM', '(');
    const params = [];
    if (!this.match('SYM', ')')) {
      params.push(this.eat('ID').value);
      while (this.match('SYM', ',')) {
        params.push(this.eat('ID').value);
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

  parseStmt() {
    const t = this.peek();
    if (t.type === 'ID') {
      const next = this.tokens[this.pos + 1];
      if (next && next.type === 'SYM' && next.value === '(') {
        return { kind: 'call', ...this.parseCall() };
      }
      if (next && next.type === 'SYM' && next.value === '=') {
        return this.parseAssign();
      }
    }
    canvasError(`expected statement, got ${t.type} '${t.value}'`, t.line);
  }

  parseAssign() {
    const name = this.eat('ID').value;
    this.eat('SYM', '=');
    const expr = this.parseExpr();
    return { kind: 'assign', name, expr };
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
    if (this.match('ID')) {
      const id = this.tokens[this.pos - 1].value;
      if (this.match('SYM', '(')) {
        const args = [];
        if (!this.match('SYM', ')')) {
          args.push(this.parseExpr());
          while (this.match('SYM', ',')) {
            args.push(this.parseExpr());
          }
          this.eat('SYM', ')');
        }
        return { kind: 'call', name: id, args, line: this.tokens[this.pos - 1].line };
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
