/* ================= TOKENIZER ================= */

class Token {
  constructor(type,value,line,col, file){
    this.type=type; this.value=value; this.line=line; this.col=col; this.file=file ===null ? '': file;
  }
}

class Tokenizer {
  constructor(src, file = ''){
    this.src=src; 
    this.i=0; 
    this.file = file;
    this.line=1; 
    this.col=1;
    this.stack= [];
    this.alias = null;
  }
  eof(){ return this.i>=this.src.length }
  peek(){ return this.src[this.i] }
  next(){
    let c=this.src[this.i++];
    if(c=='\n'){ this.line++; this.col=1 } else this.col++;
    return c;
  }
  token(type,value){ return new Token(type,value,this.line,this.col, this.file) }
  skip(){
    while(!this.eof()){
      // Skip spaces and tabs, but NOT newlines (they generate EOL tokens)
      if(this.peek() === ' ' || this.peek() === '\t') {
        this.next();
      } else if(this.peek() === '\n') {
        // Stop at newline - it will be handled by get() as EOL token
        break;
      } else if(this.peek()=='#') {
        this.next(); // Consume '#'
        // Check if it's a block comment start #>
        if(!this.eof() && this.peek()=='>') {
          this.next(); // Consume '>'
          // Skip until we find #<
          while(!this.eof()) {
            if(this.peek()=='#') {
              this.next(); // Consume '#'
              if(!this.eof() && this.peek()=='<') {
                this.next(); // Consume '<'
                break; // Found closing #<
              }
            } else {
              this.next(); // Continue searching
            }
          }
        } else {
          // Regular line comment - skip until newline (but don't consume the newline)
          while(!this.eof() && this.peek()!='\n') this.next();
        }
        break; // Stop at newline or after block comment
      } else {
        break;
      }
    }
  }

  skipInlineWs() {
    while (!this.eof() && (this.peek() === ' ' || this.peek() === '\t')) this.next();
  }

  readLiteralTagSuffix() {
    let tag = '';
    while (!this.eof() && /[a-zA-Z0-9]/.test(this.peek())) {
      tag += this.next();
    }
    if (!tag.length) {
      throw Error(`Expected width/format tag after ';' at ${this.file}: ${this.line}:${this.col}`);
    }
    return tag;
  }

  readBackslashAtomValue() {
    let neg = false;
    if (!this.eof() && this.peek() === '-') {
      neg = true;
      this.next();
    }
    let intPart = '';
    while (!this.eof() && /[0-9]/.test(this.peek())) {
      intPart += this.next();
    }
    let fracPart = null;
    if (!this.eof() && this.peek() === '.') {
      const rest = this.src.substring(this.i);
      if (!/^\.(\d+(-\d+|\/\d+)|\/\d+)/.test(rest)) {
        this.next();
        fracPart = '';
        while (!this.eof() && /[0-9]/.test(this.peek())) {
          fracPart += this.next();
        }
        if (fracPart === '') {
          throw Error(`Invalid fractional decimal literal at ${this.file}: ${this.line}:${this.col}`);
        }
      }
    }
    if (neg && intPart === '' && fracPart == null) {
      throw Error(`Invalid signed decimal literal at ${this.file}: ${this.line}:${this.col}`);
    }
    if (!neg && intPart === '' && fracPart == null) {
      throw Error(`Invalid decimal literal at ${this.file}: ${this.line}:${this.col}`);
    }
    return { neg, intPart, fracPart };
  }

  readBackslashDecimalLiteral() {
    const first = this.readBackslashAtomValue();

    if (!first.fracPart && first.intPart !== '') {
      const rest = this.src.substring(this.i);
      if (/^\.(\d+(-\d+|\/\d+)|\/\d+)/.test(rest)) {
        if (first.neg) {
          throw Error(`Use \\-N;sM for signed, e.g. \\-3;s8 at ${this.file}: ${this.line}:${this.col}`);
        }
        return this.token('SDEC', first.intPart);
      }
    }

    const atoms = [first];

    while (true) {
      this.skipInlineWs();
      if (this.eof() || this.peek() !== '\\') break;
      this.next();
      atoms.push(this.readBackslashAtomValue());
    }

    const isGroup = atoms.length > 1;
    const hasSuffix = !this.eof() && this.peek() === ';';

    if (isGroup && !hasSuffix) {
      throw Error(`Missing width/format tag for grouped literal at ${this.file}: ${this.line}:${this.col}`);
    }

    if (hasSuffix) {
      const tagMark = this.i;
      this.next();
      const tag = this.readLiteralTagSuffix();
      const isNumericTag = /^\d+$/.test(tag);
      const isLegacyPad = atoms.length === 1 && isNumericTag && atoms[0].fracPart == null;
      if (isLegacyPad) {
        this.i = tagMark;
        if (atoms[0].neg) {
          throw Error(`Use \\-N;sM for signed, e.g. \\-3;s8 at ${this.file}: ${this.line}:${this.col}`);
        }
        return this.token('SDEC', atoms[0].intPart);
      }
      if (isNumericTag && atoms.some((a) => a.neg)) {
        throw Error(`Use \\-N;sM for signed, e.g. \\-3;s8 at ${this.file}: ${this.line}:${this.col}`);
      }
      return this.token('GLIT', { atoms, tag });
    }

    if (atoms[0].neg) {
      throw Error(`Use \\-N;sM for signed, e.g. \\-3;s8 at ${this.file}: ${this.line}:${this.col}`);
    }
    if (atoms[0].fracPart != null) {
      throw Error(`Fractional decimal requires a format tag, e.g. \\1.5;q4p4 at ${this.file}: ${this.line}:${this.col}`);
    }
    return this.token('SDEC', atoms[0].intPart);
  }

pushSource({ src, alias }) {
  const t = new Tokenizer(src);
  t.alias = alias;
  this.stack.push(t);
}

  pushSource0(src) {
    this.stack.push(new Tokenizer(src));
  }
  
  get(){
    if (this.stack.length > 0) {
      const t = this.stack[this.stack.length - 1];
      const tok = t.get();
      if (tok.type === 'EOF') {
        this.stack.pop();
        return this.get();
      }
      return tok;
    }
  
  this.skip();
  if(this.eof()) return this.token('EOF');

  // Check for newline AFTER skip() - generate EOL token
  // skip() stops at newline, so we can detect it here
  if(this.peek() === '\n') {
    this.next(); // Consume the newline
    return this.token('EOL', '\n');
  }

  let c = this.peek();

  // := operator (wire initialization literal)
  if (c === ':') {
    this.next(); // consume ':'
    if (!this.eof() && this.peek() === '=') {
      this.next(); // consume '='
      return this.token('SYM', ':=');
    }
    return this.token('SYM', ':');
  }

  // =: operator (right-pad assignment)
  if (c === '=') {
    this.next();
    if (!this.eof() && this.peek() === ':') {
      this.next();
      return this.token('SYM', '=:');
    }
    return this.token('SYM', '=');
  }

  // Meta constant /name/ (wire init only at parse time)
  if (c === '/') {
    let j = this.i + 1;
    if (j < this.src.length && /[a-zA-Z_]/.test(this.src[j])) {
      let name = '';
      while (j < this.src.length && /[a-zA-Z0-9_]/.test(this.src[j])) {
        name += this.src[j++];
      }
      if (j < this.src.length && this.src[j] === '/') {
        this.next();
        for (let k = 0; k < name.length; k++) this.next();
        this.next();
        return this.token('META', name);
      }
    }
    return this.token('SYM', this.next());
  }

  // Logic literal prefix ?X1X (MODE ZSTATE) — before generic symbols
  if (c === '?') {
    this.next();
    let v = '';
    while (!this.eof() && /[01XZ]/i.test(this.peek())) {
      v += this.next();
    }
    if (v === '') {
      throw Error(`Expected logic literal after '?' at ${this.file}: ${this.line}:${this.col}`);
    }
    return this.token('LOGIC', v.toUpperCase());
  }

  // Wire string literal "..." or '...' (before generic SYM — quotes are not operators)
  if (c === '"' || c === "'") {
    const quote = c;
    this.next();
    let str = '';
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === '\n') {
        throw Error(`Unclosed wire string literal at ${this.file}: ${this.line}:${this.col}`);
      }
      if (ch === '\\' && this.i + 1 < this.src.length) {
        this.next();
        const esc = this.next();
        const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
        const decoded = WL ? WL.decodeWireStringEscape(esc) : null;
        if (decoded == null) {
          throw Error(`Unknown escape '\\${esc}' in wire string at ${this.file}: ${this.line}:${this.col}`);
        }
        str += decoded;
        continue;
      }
      if (ch === quote) {
        this.next();
        break;
      }
      str += this.next();
    }
    return this.token('WSTR', str);
  }

  // Symbols (including { and } for property blocks, ! for NOT prefix, * for multiplier shortname)
    if ('=,+():-.@[]{}>!*;'.includes(c)) return this.token('SYM', this.next());

  // Lone _ is unpack wildcard; _foo is a normal identifier
  if (c === '_') {
    this.next();
    if (!this.eof() && /[a-zA-Z0-9_]/.test(this.peek())) {
      let v = '_';
      while (!this.eof() && /[a-zA-Z0-9_]/.test(this.peek())) {
        v += this.next();
      }
      return this.tokenizeIdentifier(v);
    }
    return this.token('SPECIAL', '_');
  }
  if (c === '%') return this.token('SPECIAL', this.next());
  if (c === '$') return this.token('SPECIAL', this.next());
  if (c === '~') {
    this.next();
    // Check for ~~ (PCB next section delimiter)
    if (!this.eof() && this.peek() === '~') {
      this.next();
      return this.token('SYM', '~~');
    }
    return this.token('SPECIAL', '~');
  }

    // Reference operator &
    if (c === '&') {
      this.next();
      // Check if it's followed by a digit (reference like &0, &1.0, etc.)
      if (!this.eof() && /[0-9]/.test(this.peek())) {
        let ref = '&';
        while (!this.eof() && /[0-9.\-]/.test(this.peek())) {
          ref += this.next();
        }
        return this.token('REF', ref);
      }
      // Otherwise it's just & for reference expression
      return this.token('REF', '&');
    }

    // Starts with digit -> TYPE, BIN, or DEC (never ID)
  if (/[0-9]/.test(c)) {
    let v = '';
    while (!this.eof() && /[a-zA-Z0-9]/.test(this.peek())) {
      v += this.next();
    }

    if (/^\d+(bit|wire|b|w|pin|pout)$/.test(v)) {  
      v = v.replace(/b$/, 'bit').replace(/w$/, 'wire');
      return this.token('TYPE', v);
    }

      // mem multi-port pins: 2adr, 2get, … 4get (port 1 uses adr/get without prefix)
      if (/^[2-9](adr|data|write|get)$/.test(v)) {
        return this.token('ID', v);
      }

      // If it contains digits 2-9, it's definitely decimal
      if (/[2-9]/.test(v)) {
        return this.token('DEC', v);
      }

      // If it's only 0s and 1s, treat as binary (for bit values)
      // In NEXT context, we'll parse BIN tokens as decimal
    if (/^[01]+$/.test(v)) {
      return this.token('BIN', v);
    }

      // Logic literal starting with digit (e.g. 10Z) — MODE ZSTATE
      if (/^[01][01XZ]*$/i.test(v)) {
        return this.token('LOGIC', v.toUpperCase());
      }

      // Plain decimal number (fallback for any other digit string)
      if (/^\d+$/.test(v)) {
        return this.token('DEC', v);
    }

    throw Error(`Invalid numeric token '${v}' at ${this.file}: ${this.line}:${this.col}`);
  }

    if(c === '<') {
      this.next();
      // LOAD if '<' is the first non-whitespace character on its line.
      // Otherwise it is the LSHIFT infix operator.
      // Scan backwards in source from position of '<' to detect line start.
      const posOfLt = this.i - 1; // index of '<' in source (this.i is now past '<')
      let lineStart = true;
      for (let s = posOfLt - 1; s >= 0; s--) {
        const ch = this.src[s];
        if (ch === '\n') break;           // reached previous newline -> still line-start
        if (ch !== ' ' && ch !== '\t') { lineStart = false; break; } // non-ws before '<'
      }
      if (lineStart) {
        const rest = this.src.slice(this.i);
        const schemaMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*>/.exec(rest);
        if (schemaMatch) {
          return this.token('SYM', '<');
        }
        // Treat as LOAD
        let path = '';
        while (!this.eof()) {
          const peek = this.peek();
          if (/[0-9A-Za-z._\/]/.test(peek)) {
            path += this.next();
          } else if (peek === ' ' || peek === '\t') {
            this.next();
          } else {
            //newline or smth else
            break;
          }
        }
        if (path === '') {
          throw Error(`Invalid path to load at ${this.file}: ${this.line}:${this.col}`);
        }
        return this.token('LOAD', path);
      }
      return this.token('SYM', '<');
    }
    // Hex literal ^… or signed value hex ^-HEX;W
    if (c === '^') {
      if (this.i + 1 < this.src.length && this.src[this.i + 1] === '.') {
        this.next();
        this.next();
        let v = '.';
        while (!this.eof() && /[a-zA-Z0-9_]/.test(this.peek())) {
          v += this.next();
        }
        return this.token('GREF', v);
      }
      this.next();
      let signedNeg = false;
      if (!this.eof() && this.peek() === '-') {
        signedNeg = true;
        this.next();
      }
      let hex = '';
      while (!this.eof()) {
        const peek = this.peek();
        if (/[0-9A-Fa-f]/.test(peek)) {
          hex += this.next();
        } else if (peek === ' ' || peek === '\t') {
          this.next();
        } else {
          break;
        }
      }
      if (signedNeg) {
        if (hex === '') {
          throw Error(`Invalid signed hexadecimal literal at ${this.file}: ${this.line}:${this.col}`);
        }
        if (this.eof() || this.peek() !== ';') {
          throw Error(`Signed hex literal requires explicit width: use ^-HEX;W at ${this.file}: ${this.line}:${this.col}`);
        }
        this.next();
        let width = '';
        while (!this.eof() && /[0-9]/.test(this.peek())) {
          width += this.next();
        }
        if (width === '') {
          throw Error(`Expected width after ';' in signed hex literal at ${this.file}: ${this.line}:${this.col}`);
        }
        return this.token('SHEX', { hex: hex.toUpperCase(), width: parseInt(width, 10) });
      }
      if (hex === '') {
        throw Error(`Invalid hexadecimal literal at ${this.file}: ${this.line}:${this.col}`);
      }
      return this.token('HEX', hex.toUpperCase());
    }

    // Decimal literal \N, grouped \N \N;tag, or signed \-N;sM
    if (c === '\\') {
      this.next();
      return this.readBackslashDecimalLiteral();
    }

    // Starts with letter a-z ID or keyword (or o^ / x^ / xc^ literals)
  if (/[a-zA-Z]/.test(c)) {
    const prefixed = this.tryPrefixedCaretLiterals(c);
    if (prefixed) return prefixed;
    let v = '';
    while (!this.eof() && /[a-zA-Z0-9_]/.test(this.peek())) {
      v += this.next();
    }
    return this.tokenizeIdentifier(v);
    }
  
    throw Error(`Unexpected char '${c}' at ${this.file}: ${this.line}:${this.col}`);
  }

  readPrefixedCaretLiteral(prefix, tokenType, isValidChar, normalize) {
    for (let pi = 0; pi < prefix.length; pi++) {
      if (this.eof() || this.peek() !== prefix[pi]) {
        throw Error(`Invalid ${tokenType} literal at ${this.file}: ${this.line}:${this.col}`);
      }
      this.next();
    }
    if (this.eof() || this.peek() !== '^') {
      throw Error(`Invalid ${tokenType} literal at ${this.file}: ${this.line}:${this.col}`);
    }
    this.next();
    let digits = '';
    while (!this.eof()) {
      const peek = this.peek();
      if (isValidChar(peek)) {
        digits += this.next();
      } else if (peek === ' ' || peek === '\t') {
        this.next();
      } else {
        break;
      }
    }
    if (digits === '') {
      throw Error(`Invalid ${tokenType} literal at ${this.file}: ${this.line}:${this.col}`);
    }
    const value = normalize ? normalize(digits) : digits;
    return this.token(tokenType, value);
  }

  tryPrefixedCaretLiterals(c) {
    if (c === 'x' && this.i + 1 < this.src.length && this.src[this.i + 1] === 'c'
        && this.i + 2 < this.src.length && this.src[this.i + 2] === '^') {
      return this.readPrefixedCaretLiteral('xc', 'B32C', (ch) => {
        const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
        const alpha = WL ? WL.B32C_ALPHABET : '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        return alpha.indexOf(ch.toUpperCase()) >= 0;
      }, (s) => s.toUpperCase());
    }
    if (c === 'x' && this.i + 1 < this.src.length && this.src[this.i + 1] === '^') {
      return this.readPrefixedCaretLiteral('x', 'B32HEX', (ch) => {
        const WL = typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
        const alpha = WL ? WL.B32HEX_ALPHABET : '0123456789ABCDEFGHIJKLMNOPQRSTUV';
        return alpha.indexOf(ch.toUpperCase()) >= 0;
      }, (s) => s.toUpperCase());
    }
    if (c === 'o' && this.i + 1 < this.src.length && this.src[this.i + 1] === '^') {
      return this.readPrefixedCaretLiteral('o', 'OCT', (ch) => /[0-7]/.test(ch), (s) => s);
    }
    return null;
  }

  tokenizeIdentifier(v) {
    if (['def', 'show', 'peek', 'probe', 'deps', 'lutOf', 'exprOfLut', 'useLutAs', 'useExpr', 'truthTableOf', 'simplify', 'equivalent', 'inputsOf', 'costOf', 'NEXT', 'TEST', 'MODE', 'STRICT', 'WIREWRITE', 'ZSTATE', 'ZRELEASE', 'Zlist', 'comp', 'pcb', 'chip', 'board', 'inline', 'doc', 'watch'].includes(v)) {
      return this.token('KEYWORD', v);
    }
    if (/^REG$/.test(v)) {
      return this.token('REG', v);
    }
    if (/^MUX$/.test(v)) {
      return this.token('MUX', v);
    }
    if (/^DEMUX$/.test(v)) {
      return this.token('DEMUX', v);
    }
    return this.token('ID', v);
  }

  peekToken() {
    const mark = { i: this.i, line: this.line, col: this.col };
    const tok = this.get();
    this.i = mark.i;
    this.line = mark.line;
    this.col = mark.col;
    return tok;
  }
}

function consoleLog(...args) {
//  console.log(...args);
}
