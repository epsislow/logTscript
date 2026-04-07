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

  // Symbols (including { and } for property blocks, ! for NOT prefix, * for multiplier shortname)
    if ('=,+():-./@[]\"\'{}>!*'.includes(c)) return this.token('SYM', this.next());

  // Special vars and ~~ symbol
  if (c === '_') return this.token('SPECIAL', this.next());
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

      if (/^\d+(bit|wire|pin|pout)$/.test(v)) {
      return this.token('TYPE', v);
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
    // Hexadecimal literal: ^ followed by hex digits (spaces are ignored, but newlines stop parsing)
    if (c === '^') {
      this.next();
      let hex = '';
      while (!this.eof()) {
        const peek = this.peek();
        if (/[0-9A-Fa-f]/.test(peek)) {
          hex += this.next();
        } else if (peek === ' ' || peek === '\t') {
          // Skip spaces and tabs (but not newlines)
          this.next();
        } else {
          // End of hex literal (newline, or any other character)
          break;
        }
      }
      if (hex === '') {
        throw Error(`Invalid hexadecimal literal at ${this.file}: ${this.line}:${this.col}`);
      }
      return this.token('HEX', hex.toUpperCase());
    }

    // Decimal literal: \ followed by decimal digits -> converted to binary
    if (c === '\\') {
      this.next();
      let dec = '';
      while (!this.eof() && /[0-9]/.test(this.peek())) {
        dec += this.next();
      }
      if (dec === '') {
        throw Error(`Invalid decimal literal at ${this.file}: ${this.line}:${this.col}`);
      }
      const num = parseInt(dec, 10);
      const bin = num.toString(2);
      return this.token('BIN', bin);
    }

    // Starts with letter a-z ID or keyword
  if (/[a-zA-Z]/.test(c)) {
    let v = '';
    while (!this.eof() && /[a-zA-Z0-9]/.test(this.peek())) {
      v += this.next();
    }
      
      // Check for keywords
      if (['def', 'show', 'NEXT', 'TEST', 'MODE', 'STRICT', 'WIREWRITE', 'comp', 'pcb', 'doc'].includes(v)) {
        return this.token('KEYWORD', v);
  }

      // Check for REG instructions
      if (/^REG\d+$/.test(v)) {
        return this.token('REG', v);
}

      // Check for MUX instructions
      if (/^MUX[123]$/.test(v)) {
        return this.token('MUX', v);
      }
  
      // Check for DEMUX instructions
      if (/^DEMUX[123]$/.test(v)) {
        return this.token('DEMUX', v);
      }
  
      return this.token('ID', v);
    }
  
    throw Error(`Unexpected char '${c}' at ${this.file}: ${this.line}:${this.col}`);
  }
}

function consoleLog(...args) {
//  console.log(...args);
}
