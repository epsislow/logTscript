/* ================= PARSER ASSEMBLER (inline [parser]) ================= */

const PARSER_KEYWORDS = new Set(['token', 'rule']);

function parserError(msg, line) {
  if (line != null) throw new Error(`parser grammar line ${line}: ${msg}`);
  throw new Error(`parser grammar: ${msg}`);
}

function parserIsIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function parserIsIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function readRegexPattern(src, startPos, line) {
  let i = startPos;
  let depthParen = 0;
  let depthBracket = 0;
  let escaped = false;
  while (i < src.length) {
    const ch = src[i];
    if (escaped) {
      escaped = false;
      i++;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      i++;
      continue;
    }
    if (ch === '(') depthParen++;
    else if (ch === ')') {
      if (depthParen === 0) parserError('unbalanced ) in token regex', line);
      depthParen--;
    } else if (ch === '[') depthBracket++;
    else if (ch === ']') {
      if (depthBracket === 0) parserError('unbalanced ] in token regex', line);
      depthBracket--;
    } else if (ch === ';' && depthParen === 0 && depthBracket === 0) {
      return { pattern: src.substring(startPos, i), end: i + 1 };
    }
    i++;
  }
  parserError('unterminated token regex pattern (expected ;)', line);
}

function validateRegexPattern(pattern, line) {
  if (!pattern) parserError('empty token regex pattern', line);
  let i = 0;
  let depthParen = 0;
  let inClass = false;
  let escaped = false;

  while (i < pattern.length) {
    const ch = pattern[i];
    if (escaped) {
      if (!inClass && /[1-9]/.test(ch)) {
        parserError('backreferences are not allowed in token regex', line);
      }
      escaped = false;
      i++;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      i++;
      continue;
    }
    if (inClass) {
      if (ch === ']') inClass = false;
      i++;
      continue;
    }
    if (ch === '[') {
      inClass = true;
      i++;
      if (i < pattern.length && pattern[i] === '^') i++;
      continue;
    }
    if (ch === '(') {
      if (i + 1 < pattern.length && pattern[i + 1] === '?') {
        parserError('regex lookahead and flags are not allowed in token regex', line);
      }
      depthParen++;
      i++;
      continue;
    }
    if (ch === ')') {
      if (depthParen === 0) parserError('unbalanced ) in token regex', line);
      depthParen--;
      i++;
      continue;
    }
    if (ch === '.') {
      parserError('wildcard . is not allowed in token regex (use [.])', line);
    }
    i++;
  }
  if (inClass) parserError('unclosed [ in token regex', line);
  if (depthParen !== 0) parserError('unbalanced ( in token regex', line);
}

function compileTokenRegex(pattern, line) {
  validateRegexPattern(pattern, line);
  try {
    return new RegExp('^(?:' + pattern + ')');
  } catch (e) {
    parserError(`invalid token regex: ${e.message}`, line);
  }
}

function parserTokenizePattern(src) {
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
          else if (esc === 'r') str += '\r';
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
    if (ch === '$') {
      tokens.push({ type: 'SYM', value: '$', line });
      i++;
      continue;
    }
    if (i + 1 < src.length && src[i] === '-' && src[i + 1] === '>') {
      tokens.push({ type: 'SYM', value: '->', line });
      i += 2;
      continue;
    }
    if (ch === '|' || ch === '+' || ch === '*' || ch === '?' || ch === '=' || ch === ';' || ch === ':' ||
        ch === '(' || ch === ')') {
      tokens.push({ type: 'SYM', value: ch, line });
      i++;
      continue;
    }
    if (parserIsIdentStart(ch)) {
      let id = '';
      const startLine = line;
      while (i < src.length && parserIsIdentPart(src[i])) {
        id += src[i];
        i++;
      }
      tokens.push({ type: 'ID', value: id, line: startLine });
      continue;
    }
    parserError(`unexpected character '${ch}'`, line);
  }
  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}

class PatternParser {
  constructor(tokens, ctx) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctx = ctx;
  }

  peek() {
    return this.tokens[this.pos];
  }

  eat(type, value) {
    const t = this.peek();
    if (t.type !== type) {
      parserError(`expected ${type}${value != null ? ` '${value}'` : ''}, got ${t.type} '${t.value}'`, t.line);
    }
    if (value != null && t.value !== value) {
      parserError(`expected '${value}', got '${t.value}'`, t.line);
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

  parseAlternatives() {
    const alternatives = [];
    alternatives.push(this.parseAlternative());
    while (this.match('SYM', '|')) {
      alternatives.push(this.parseAlternative());
    }
    return alternatives;
  }

  parseAlternative() {
    const items = [];
    let call = null;
    const line = this.peek().line;
    while (true) {
      if (this.match('SYM', '|') || this.match('SYM', ';') || this.match('EOF')) {
        this.pos--;
        break;
      }
      if (this.match('SYM', '->')) {
        call = this.eat('ID').value;
        break;
      }
      items.push(this.parseSequenceItem());
    }
    if (!items.length) parserError('empty rule alternative', line);
    return { items, call, line };
  }

  parseSequenceItem() {
    const line = this.peek().line;
    if (this.match('SYM', '$')) {
      const capName = this.eat('ID');
      this.eat('SYM', ':');
      const refName = this.eat('ID');
      return this._applyQuantifier({ kind: 'capture', name: capName.value, refName: refName.value, line });
    }
    if (this.match('STR')) {
      const lit = this.tokens[this.pos - 1];
      return this._applyQuantifier({ kind: 'literal', value: lit.value, line: lit.line });
    }
    if (this.match('SYM', '(')) {
      const inner = [];
      while (!this.match('SYM', ')')) {
        if (this.match('EOF')) parserError('unclosed ( in rule pattern', line);
        inner.push(this.parseSequenceItem());
      }
      return this._applyQuantifier({ kind: 'group', items: inner, line });
    }
    if (this.peek().type === 'ID') {
      const refTok = this.eat('ID');
      return this._applyQuantifier({ kind: 'ref', name: refTok.value, line: refTok.line });
    }
    parserError('expected pattern element', line);
  }

  _applyQuantifier(item) {
    if (this.match('SYM', '+')) item.quant = '+';
    else if (this.match('SYM', '*')) item.quant = '*';
    else if (this.match('SYM', '?')) item.quant = '?';
    return item;
  }
}

function skipSpaceAndComments(src, i, lineRef) {
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') {
      lineRef.line++;
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
    break;
  }
  return i;
}

function readWord(src, i) {
  if (!parserIsIdentStart(src[i])) return null;
  let j = i;
  while (j < src.length && parserIsIdentPart(src[j])) j++;
  return { word: src.substring(i, j), end: j };
}

function readIdent(src, i, line) {
  const w = readWord(src, i);
  if (!w) parserError('expected identifier', line);
  return w;
}

function validateItemRefs(item, ruleName, tokensByName, rulesByName) {
  if (item.kind === 'ref') {
    if (!tokensByName.has(item.name) && !rulesByName.has(item.name)) {
      parserError(`unknown symbol '${item.name}' in rule '${ruleName}'`, item.line);
    }
    return;
  }
  if (item.kind === 'capture') {
    if (!tokensByName.has(item.refName) && !rulesByName.has(item.refName)) {
      parserError(`capture '$${item.name}:${item.refName}' references unknown symbol '${item.refName}'`, item.line);
    }
    return;
  }
  if (item.kind === 'group') {
    for (const inner of item.items) validateItemRefs(inner, ruleName, tokensByName, rulesByName);
  }
}

function parseParserBody(bodyRaw, ctxLabel) {
  const src = bodyRaw == null ? '' : String(bodyRaw);
  const tokensByName = new Map();
  const rulesByName = new Map();
  const lineRef = { line: 1 };
  let i = 0;

  while (true) {
    i = skipSpaceAndComments(src, i, lineRef);
    if (i >= src.length) break;
    const declLine = lineRef.line;
    const kw = readWord(src, i);
    if (!kw) parserError('expected token or rule declaration', declLine);

    if (kw.word === 'error' || kw.word === 'recover') {
      parserError(`'${kw.word}' is not supported yet in inline [parser] body`, declLine);
    }
    if (kw.word !== 'token' && kw.word !== 'rule') {
      parserError(`expected 'token' or 'rule' declaration, got '${kw.word}'`, declLine);
    }

    i = kw.end;
    i = skipSpaceAndComments(src, i, lineRef);
    const nameRd = readIdent(src, i, lineRef.line);
    i = nameRd.end;
    i = skipSpaceAndComments(src, i, lineRef);
    if (src[i] !== '=') parserError("expected '=' after name", lineRef.line);
    i++;
    i = skipSpaceAndComments(src, i, lineRef);

    if (kw.word === 'token') {
      if (tokensByName.has(nameRd.word)) parserError(`duplicate token '${nameRd.word}'`, declLine);
      if (rulesByName.has(nameRd.word)) parserError(`name '${nameRd.word}' used as both token and rule`, declLine);
      const rx = readRegexPattern(src, i, declLine);
      validateRegexPattern(rx.pattern, declLine);
      compileTokenRegex(rx.pattern, declLine);
      i = rx.end;
      i = skipSpaceAndComments(src, i, lineRef);
      tokensByName.set(nameRd.word, { name: nameRd.word, pattern: rx.pattern, line: declLine });
      continue;
    }

    if (rulesByName.has(nameRd.word)) parserError(`duplicate rule '${nameRd.word}'`, declLine);
    if (tokensByName.has(nameRd.word)) parserError(`name '${nameRd.word}' used as both token and rule`, declLine);

    let rhsEnd = i;
    let depth = 0;
    while (rhsEnd < src.length) {
      const ch = src[rhsEnd];
      if (ch === '"' || ch === "'") {
        const q = ch;
        rhsEnd++;
        while (rhsEnd < src.length) {
          if (src[rhsEnd] === '\\') { rhsEnd += 2; continue; }
          if (src[rhsEnd] === q) { rhsEnd++; break; }
          if (src[rhsEnd] === '\n') lineRef.line++;
          rhsEnd++;
        }
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ';' && depth === 0) break;
      if (ch === '\n') lineRef.line++;
      rhsEnd++;
    }
    if (rhsEnd >= src.length) parserError('unterminated rule (expected ;)', declLine);
    const rhs = src.substring(i, rhsEnd);
    const patTokens = parserTokenizePattern(rhs);
    const patParser = new PatternParser(patTokens, ctxLabel);
    const alternatives = patParser.parseAlternatives();
    if (!patParser.match('EOF')) parserError('unexpected tokens after rule pattern', declLine);
    rulesByName.set(nameRd.word, { name: nameRd.word, alternatives, line: declLine });
    i = rhsEnd + 1;
  }

  for (const rule of rulesByName.values()) {
    for (const alt of rule.alternatives) {
      for (const item of alt.items) {
        validateItemRefs(item, rule.name, tokensByName, rulesByName);
      }
    }
  }

  return {
    tokens: [...tokensByName.values()],
    rules: [...rulesByName.values()],
  };
}

function formatParserTypeDoc() {
  return [
    'inline [parser] — grammar definition (token + rule)',
    '',
    '  token INT = [0-9]+;',
    '  token ID  = [a-zA-Z_][a-zA-Z0-9_]*;',
    '',
    '  rule program = statement+;',
    '  rule statement',
    '      = $name:ID "=" $value:expression ";"',
    '        -> CallAssign;',
    '',
    '  rule expression',
    '      = expression "+" term -> CallAdd',
    '      | term;',
    '',
    'Block forms:  inline [parser] .lang: ... :   or   inline [parser] .lang { ... }',
    '',
    'See doc/inline-parser.md',
    'doc(inline.parser)  doc(.myLang)',
  ];
}

function formatParserInstanceDoc(name, inst) {
  const lines = [`inline [parser] ${name}`, ''];
  const tokens = inst.tokens || [];
  const rules = inst.rules || [];
  lines.push(`tokens (${tokens.length}): ${tokens.map((t) => t.name).join(', ') || '(none)'}`);
  lines.push(`rules (${rules.length}): ${rules.map((r) => r.name).join(', ') || '(none)'}`);
  if (rules.length) {
    lines.push('');
    lines.push('start rule (default): ' + rules[0].name);
  }
  for (const rule of rules) {
    lines.push('');
    lines.push(`rule ${rule.name} (${rule.alternatives.length} alternative(s))`);
    rule.alternatives.forEach((alt, idx) => {
      const callSuffix = alt.call ? ` -> ${alt.call}` : '';
      lines.push(`  [${idx}] ${alt.items.length} item(s)${callSuffix}`);
    });
  }
  return lines;
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseParserBody = parseParserBody;
  globalThis.formatParserTypeDoc = formatParserTypeDoc;
  globalThis.formatParserInstanceDoc = formatParserInstanceDoc;
  globalThis.validateParserRegexPattern = validateRegexPattern;
  globalThis.compileParserTokenRegex = compileTokenRegex;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseParserBody,
    formatParserTypeDoc,
    formatParserInstanceDoc,
    validateRegexPattern,
    compileTokenRegex,
    parserTokenizePattern,
  };
}
