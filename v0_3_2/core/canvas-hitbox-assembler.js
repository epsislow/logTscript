/* ================= CANVAS HITBOX ASSEMBLER (comp body hitbox { }) ================= */

const HITBOX_EVENTS = new Set(['press', 'release', 'drag', 'move']);
const HITBOX_FIELDS = new Set(['eventX', 'eventY']);

function hitboxError(msg, line) {
  if (line != null) throw new Error(`hitbox line ${line}: ${msg}`);
  throw new Error(`hitbox: ${msg}`);
}

function hitboxIsIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function hitboxIsIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function hitboxTokenize(src) {
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
    if (/[0-9]/.test(ch)) {
      let num = '';
      const startLine = line;
      while (i < src.length && /[0-9]/.test(src[i])) {
        num += src[i];
        i++;
      }
      tokens.push({ type: 'NUM', value: parseInt(num, 10), line: startLine });
      continue;
    }
    if (ch === '*' || ch === '/' || ch === '+' || ch === '-' || ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ',' || ch === ':' || ch === '=' || ch === ';') {
      tokens.push({ type: 'SYM', value: ch, line });
      i++;
      continue;
    }
    if (hitboxIsIdentStart(ch)) {
      let id = '';
      const startLine = line;
      while (i < src.length && hitboxIsIdentPart(src[i])) {
        id += src[i];
        i++;
      }
      tokens.push({ type: 'ID', value: id, line: startLine });
      continue;
    }
    hitboxError(`unexpected character '${ch}'`, line);
  }
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

class HitboxParser {
  constructor(tokens, ctxLabel) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctxLabel = ctxLabel || 'hitbox';
  }

  peek() {
    return this.tokens[this.pos];
  }

  eat(type, value) {
    const t = this.tokens[this.pos];
    if (!t || t.type !== type || (value != null && t.value !== value)) {
      const got = t ? `${t.type} '${t.value}'` : 'EOF';
      hitboxError(`expected ${type}${value != null ? ` '${value}'` : ''}, got ${got}`, t && t.line);
    }
    this.pos++;
    return t;
  }

  match(type, value) {
    const t = this.peek();
    return t && t.type === type && (value == null || t.value === value);
  }

  parseProgram() {
    const zones = {};
    const poutNames = new Set();
    while (!this.match('EOF')) {
      const nameTok = this.eat('ID');
      this.eat('SYM', ':');
      this.eat('SYM', '{');
      const zone = this.parseZoneBody(nameTok.value, nameTok.line);
      if (zones[nameTok.value]) {
        hitboxError(`duplicate hitbox zone '${nameTok.value}'`, nameTok.line);
      }
      for (const pout of zone.pouts || []) {
        if (poutNames.has(pout.name)) {
          hitboxError(`duplicate hitbox pout '${pout.name}'`, pout.line);
        }
        poutNames.add(pout.name);
      }
      zones[nameTok.value] = zone;
    }
    return { zones };
  }

  parseZoneBody(name, nameLine) {
    const zone = {
      name,
      rect: null,
      touchType: 1,
      stroke: null,
      pouts: [],
    };
    while (!this.match('SYM', '}')) {
      if (this.match('EOF')) {
        hitboxError(`unclosed zone '${name}'`, nameLine);
      }
      const t = this.peek();
      if (t.type === 'ID' && t.value === 'rect') {
        zone.rect = this.parseRect();
        continue;
      }
      if (t.type === 'ID' && t.value === 'touchType') {
        this.eat('ID');
        this.eat('SYM', '=');
        const nTok = this.eat('NUM');
        if (nTok.value < 1 || nTok.value > 3) {
          hitboxError('touchType must be 1, 2, or 3', nTok.line);
        }
        zone.touchType = nTok.value;
        continue;
      }
      if (t.type === 'ID' && t.value === 'stroke') {
        zone.stroke = this.parseStroke();
        continue;
      }
      if (t.type === 'ID' && t.value === 'pout') {
        zone.pouts.push(this.parsePout());
        continue;
      }
      hitboxError(`unknown statement '${t.value}'`, t.line);
    }
    this.eat('SYM', '}');
    if (!zone.rect) {
      hitboxError(`zone '${name}' requires rect(x,y,w,h)`, nameLine);
    }
    return zone;
  }

  parseRect() {
    this.eat('ID');
    this.eat('SYM', '(');
    const x = this.eat('NUM').value;
    this.eat('SYM', ',');
    const y = this.eat('NUM').value;
    this.eat('SYM', ',');
    const w = this.eat('NUM').value;
    this.eat('SYM', ',');
    const h = this.eat('NUM').value;
    this.eat('SYM', ')');
    if (w <= 0 || h <= 0) {
      hitboxError('rect width and height must be positive', this.peek().line);
    }
    return { x, y, w, h };
  }

  parseStroke() {
    this.eat('ID');
    this.eat('SYM', '(');
    const colorTok = this.eat('STR');
    this.eat('SYM', ')');
    return colorTok.value;
  }

  parsePout() {
    this.eat('ID');
    this.eat('SYM', ':');
    const eventTok = this.eat('ID');
    const event = eventTok.value;
    if (!HITBOX_EVENTS.has(event)) {
      hitboxError(`unknown event '${event}'`, eventTok.line);
    }
    let field = null;
    if (this.match('SYM', ':')) {
      this.eat('SYM', ':');
      const fieldTok = this.eat('ID');
      field = fieldTok.value;
      if (!HITBOX_FIELDS.has(field)) {
        hitboxError(`unknown event field '${field}'`, fieldTok.line);
      }
    }
    this.eat('ID', 'as');
    const nameTok = this.eat('ID');
    let bindType = 'bool';
    let numberFormat = null;
    if (this.match('SYM', '/')) {
      this.eat('SYM', '/');
      const fmtTok = this.eat('ID');
      const parseFmt = typeof canvasParseFormatToken === 'function'
        ? canvasParseFormatToken
        : null;
      if (!parseFmt) throw new Error('canvas-wire is not loaded');
      const fmt = parseFmt(fmtTok.value, this.ctxLabel);
      bindType = fmt.bindType;
      numberFormat = fmt.numberFormat;
      if (bindType === 'bool' && field) {
        hitboxError(`bool pout cannot use field '${field}'`, nameTok.line);
      }
      if (bindType !== 'bool' && !field) {
        hitboxError(`pout :${event} as ${nameTok.value}/${fmtTok.value} requires :eventX or :eventY`, nameTok.line);
      }
    } else if (field) {
      hitboxError(`pout :${event}:${field} requires /format on name`, nameTok.line);
    }
    return {
      event,
      field,
      name: nameTok.value,
      bindType,
      numberFormat,
      line: nameTok.line,
    };
  }
}

function parseCanvasHitboxBlock(bodyRaw, ctxLabel) {
  const src = (bodyRaw || '').trim();
  if (!src) return { zones: {} };
  const tokens = hitboxTokenize(src);
  const parser = new HitboxParser(tokens, ctxLabel);
  return parser.parseProgram();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCanvasHitboxBlock,
    hitboxTokenize,
    HITBOX_EVENTS,
    HITBOX_FIELDS,
  };
}
