/* ================= TOKENIZER ================= */

class Token {
  constructor(type,value,line,col){
    this.type=type; this.value=value; this.line=line; this.col=col;
  }
}

class Tokenizer {
  constructor(src){
    this.src=src; this.i=0; this.line=1; this.col=1;
  }
  eof(){ return this.i>=this.src.length }
  peek(){ return this.src[this.i] }
  next(){
    let c=this.src[this.i++];
    if(c=='\n'){ this.line++; this.col=1 } else this.col++;
    return c;
  }
  token(type,value){ return new Token(type,value,this.line,this.col) }
  skip(){
    while(!this.eof()){
      if(/\s/.test(this.peek())) this.next();
      else if(this.peek()=='#') while(!this.eof()&&this.next()!='\n');
      else break;
    }
  }
  
  get(){
  this.skip();
  if(this.eof()) return this.token('EOF');

  let c = this.peek();

  // Symbols
    if ('=,+():-./'.includes(c)) return this.token('SYM', this.next());

  // Special vars
  if (c === '_' || c === '~') return this.token('SPECIAL', this.next());

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

    // Starts with digit â†’ TYPE, BIN, or DEC (never ID)
  if (/[0-9]/.test(c)) {
    let v = '';
    while (!this.eof() && /[a-zA-Z0-9]/.test(this.peek())) {
      v += this.next();
    }

      if (/^\d+(bit|wire)$/.test(v)) {
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

    throw Error(`Invalid numeric token '${v}' at ${this.line}:${this.col}`);
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
        throw Error(`Invalid hexadecimal literal at ${this.line}:${this.col}`);
      }
      return this.token('HEX', hex.toUpperCase());
    }

    // Starts with letter â†’ ID or keyword
  if (/[a-zA-Z]/.test(c)) {
    let v = '';
    while (!this.eof() && /[a-zA-Z0-9]/.test(this.peek())) {
      v += this.next();
    }
      
      // Check for keywords
      if (['def', 'show', 'NEXT', 'TEST', 'MODE', 'STRICT', 'WIREWRITE'].includes(v)) {
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
  
    throw Error(`Unexpected char '${c}' at ${this.line}:${this.col}`);
  }
}

/* ================= PARSER ================= */

class Parser {
  constructor(t){
    this.t=t; this.c=t.get(); this.funcs=new Map();
  }
  eat(type,val){
    if(this.c.type===type && (val==null||this.c.value===val))
      this.c=this.t.get();
    else throw Error(`Syntax error at ${this.c.line}:${this.c.col}, expected ${type}${val?'='+val:''}, got ${this.c.type}=${this.c.value}`);
  }
  peekNextIsAssign(){
    // Check if next token after whitespace is '='
    let i = this.t.i;
    while(i < this.t.src.length && /\s/.test(this.t.src[i])) i++;
    return i < this.t.src.length && this.t.src[i] === '=';
  }

  parse(){
  const stmts = [];

  while (this.c.type !== 'EOF') {
      if (this.c.type === 'KEYWORD' && this.c.value === 'def') {
      this.parseDef();
      continue;
    }
    stmts.push(this.stmt());
  }

  return stmts;
}

parseDef(){
    this.eat('KEYWORD','def');

  const name = this.c.value;
  this.eat('ID');

  this.eat('SYM','(');
  const params = [];

  if (this.c.value !== ')') {
    do {
      const type = this.c.value;
      this.eat('TYPE');

      const n = this.c.value;
      this.eat('ID');

      params.push({ type, n });

      if (this.c.value === ',') {
        this.eat('SYM', ',');
      } else break;
    } while (true);
  }

  this.eat('SYM',')');
  this.eat('SYM',':');

  const body = [];
  const returns = [];

  let lastLine = this.c.line;

  while (this.c.type !== 'EOF') {
    if (this.c.line > lastLine + 1) break;
    lastLine = this.c.line;

    // Check for return statement: :TYPE ID
    // The ':' after ) was eaten as function body marker, but return statements also start with ':'
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      if(this.c.type !== 'TYPE'){
        throw Error(`Expected type after ':' in function return at ${this.c.line}:${this.c.col}`);
      }
      const type = this.c.value;
      this.eat('TYPE');
      const returnExpr = this.expr();
      returns.push({ type, expr: returnExpr });
      continue;
    }

    // Check for body statements (TYPE or show keyword)
    if (this.c.type === 'TYPE' || (this.c.type === 'KEYWORD' && this.c.value === 'show')) {
      body.push(this.stmt());
      continue;
    }

    break;
  }

  this.funcs.set(name, { params, body, returns });
}

  stmt(){
    if(this.c.type==='TYPE') return this.var();
    if(this.c.type==='KEYWORD' && this.c.value==='show') return this.show();
    if(this.c.type==='KEYWORD' && this.c.value==='NEXT') return this.next();
    if(this.c.type==='KEYWORD' && this.c.value==='TEST') return this.test();
    if(this.c.type==='KEYWORD' && this.c.value==='MODE') return this.mode();
    // Assignment to existing variable/wire: name = expr
    if((this.c.type==='ID' || this.c.type==='SPECIAL') && this.peekNextIsAssign()){
      return this.assignment();
    }
    // Mixed declaration: existing name, type name, ... = expr
    if((this.c.type==='ID' || this.c.type==='SPECIAL') && this.peekNextIsCommaThenType()){
      return this.mixedVar();
    }
    throw Error(`Invalid statement starting with '${this.c.value}' (${this.c.type}) at ${this.c.line}:${this.c.col}`);
  }

  peekNextIsCommaThenType(){
    // Check if next tokens are: comma, then TYPE
    let i = this.t.i;
    while(i < this.t.src.length && /\s/.test(this.t.src[i])) i++;
    if(i >= this.t.src.length || this.t.src[i] !== ',') return false;
    i++;
    while(i < this.t.src.length && /\s/.test(this.t.src[i])) i++;
    // Now check if next is a type (starts with digit)
    if(i >= this.t.src.length) return false;
    // Check if it starts with a digit (type like 1bit, 2wire, etc.)
    return /[0-9]/.test(this.t.src[i]);
  }

  assignment(){
    // Parse: name = expr
    const name = this.c.value;
    this.eat(this.c.type); // ID or SPECIAL
    
    this.eat('SYM', '=');
    const expr = this.expr();
    
    return {
      assignment: {name, expr}
    };
  }

  mixedVar(){
    // Parse: existingName, type name, ... = expr
    const decls = [];
    
    // First, handle existing variable/wire (no type)
    if(this.c.type === 'ID' || this.c.type === 'SPECIAL'){
      const name = this.c.value;
      this.eat(this.c.type);
      // For existing variables/wires, we need to infer the type from context
      // But we don't have that info here, so we'll mark it as existing
      decls.push({ type: null, name, existing: true, line: this.c.line, col: this.c.col });
      
      if(this.c.value === ','){
        this.eat('SYM', ',');
      }
    }
    
    // Now parse regular type declarations
    while(this.c.type === 'TYPE'){
      const type = this.c.value;
      this.eat('TYPE');
      
      let name;
      if(this.c.type === 'ID' || this.c.type === 'SPECIAL'){
        name = this.c.value;
        this.eat(this.c.type);
      } else {
        throw Error(`Expected variable name at ${this.c.line}:${this.c.col}`);
      }
      
      decls.push({ type, name, line: this.c.line, col: this.c.col });
      
      if(this.c.value === ','){
        this.eat('SYM', ',');
      } else {
        break;
      }
    }
    
    // Must have assignment
    this.eat('SYM', '=');
    const expr = this.expr();
    
    return {
      decls,
      expr
    };
  }

  var(){
  const decls = [];

  do {
    const type = this.c.value;
    this.eat('TYPE');

    let name;
    if (this.c.type === 'ID' || this.c.type === 'SPECIAL') {
      name = this.c.value;
      this.eat(this.c.type);
    } else {
        throw Error(`Expected variable name at ${this.c.line}:${this.c.col}`);
    }

    decls.push({ type, name });

    if (this.c.value === ',') {
      this.eat('SYM', ',');
    } else {
      break;
    }
  } while (this.c.type === 'TYPE');

    // Optional assignment
    if (this.c.value === '=') {
  this.eat('SYM', '=');
  return {
    decls,
        expr: this.expr(),
        line: this.c.line,
        col: this.c.col
      };
    } else {
      // Declaration without assignment (only for wires)
      return {
        decls,
        expr: null,
        line: this.c.line,
        col: this.c.col
      };
    }
  }

  show(){
    this.eat('KEYWORD'); this.eat('SYM','(');
    const args=[];
    if(this.c.value!==')'){
      do{
        args.push(this.expr());
        if(this.c.value===',') this.eat('SYM',',');
        else break;
      }while(true);
    }
    this.eat('SYM',')');
    return {show:args};
  }

  next(){
    this.eat('KEYWORD');
    this.eat('SYM','(');
    if(this.c.value!=='~') throw Error(`NEXT expects ~ at ${this.c.line}:${this.col}`);
    this.eat('SPECIAL');
    
    // Optional count argument: NEXT(~, 3)
    let count = 1;
    if(this.c.value === ','){
      // Found comma, eat it
      this.eat('SYM',',');
      
      // The tokenizer may have parsed the number as BIN or DEC
      // In NEXT context, we always want to interpret it as decimal
      if(this.c.type === 'BIN' || this.c.type === 'DEC'){
        // Parse the token value as decimal (even if it was parsed as BIN)
        count = parseInt(this.c.value, 10);
        if(isNaN(count) || count < 1){
          throw Error(`Invalid count in NEXT at ${this.c.line}:${this.c.col}, must be a positive integer`);
        }
        // Eat the token (BIN or DEC)
        this.eat(this.c.type);
        // Next should be closing paren
        this.eat('SYM',')');
      } else {
        // Tokenizer didn't parse a number, try reading from source
        this.t.skip(); // skip whitespace
        let numStr = '';
        while(!this.t.eof() && /[0-9]/.test(this.t.peek())){
          numStr += this.t.next();
        }
        
        if(numStr === ''){
          throw Error(`Expected number after comma in NEXT at ${this.c.line}:${this.c.col}`);
        }
        
        count = parseInt(numStr, 10);
        if(isNaN(count) || count < 1){
          throw Error(`Invalid count in NEXT at ${this.t.line}:${this.t.col}, must be a positive integer`);
        }
        
        // Skip whitespace and check for closing paren
        this.t.skip();
        if(this.t.eof() || this.t.peek() !== ')'){
          throw Error(`Expected ')' after count in NEXT at ${this.t.line}:${this.t.col}`);
        }
        // Consume the ')'
        this.t.next();
        // Update current token
        this.c = this.t.get();
      }
    } else {
      // No comma, continue normally
      this.eat('SYM',')');
    }
    
    return {next:count};
  }

  test(){
    this.eat('KEYWORD');
    this.eat('SYM','(');
    const name = this.expr();
    this.eat('SYM',',');
    const expected = this.expr();
    this.eat('SYM',')');
    return {test:{name,expected}};
  }

  mode(){
    this.eat('KEYWORD', 'MODE');
    // Parse the mode option: STRICT or WIREWRITE
    if(this.c.type !== 'KEYWORD' || (this.c.value !== 'STRICT' && this.c.value !== 'WIREWRITE')){
      throw Error(`Expected STRICT or WIREWRITE after MODE at ${this.c.line}:${this.c.col}`);
    }
    const modeValue = this.c.value;
    this.eat('KEYWORD');
    return {mode: modeValue};
  }

  expr(){
    const p=[this.atom()];
    while(this.c.value==='+'){ this.eat('SYM','+'); p.push(this.atom()); }
    return p;
  }

  atom(){
    // Reference expression &variable
    if(this.c.type==='REF' && this.c.value==='&'){
      this.eat('REF');
      if(this.c.type==='ID' || this.c.type==='SPECIAL'){
        const v=this.c.value; this.eat(this.c.type);
        return {ref:v};
      }
      throw Error(`Expected variable name after & at ${this.c.line}:${this.col}`);
    }
    
    // Literal reference like &0, &1.0, etc.
    if(this.c.type==='REF' && this.c.value.startsWith('&')){
      const v=this.c.value; this.eat('REF');
      return {refLiteral:v};
    }
    
    if(this.c.type==='BIN'){ const v=this.c.value; this.eat('BIN'); return {bin:v}; }
    if(this.c.type==='HEX'){ const v=this.c.value; this.eat('HEX'); return {hex:v}; }
    if(this.c.type==='SPECIAL'){ const v=this.c.value; this.eat('SPECIAL'); return {var:v}; }
    if(this.c.type==='REG'){
      const n=this.c.value; this.eat('REG');
      if(this.c.value==='(') return this.call(n);
      throw Error(`REG instruction ${n} must be called as a function at ${this.c.line}:${this.c.col}`);
    }
    if(this.c.type==='MUX'){
      const n=this.c.value; this.eat('MUX');
      if(this.c.value==='(') return this.call(n);
      throw Error(`MUX instruction ${n} must be called as a function at ${this.c.line}:${this.c.col}`);
    }
    if(this.c.type==='DEMUX'){
      const n=this.c.value; this.eat('DEMUX');
      if(this.c.value==='(') return this.call(n);
      throw Error(`DEMUX instruction ${n} must be called as a function at ${this.c.line}:${this.c.col}`);
    }
    if(this.c.type==='ID'){
      const n=this.c.value; this.eat('ID');
      if(this.c.value==='(') return this.call(n);
      // Check for bit range syntax: variable.start-end
      if(this.c.value === '.'){
        this.eat('SYM', '.');
        
        // Check if current token is already a number (BIN, DEC)
        let start = null;
        if(this.c.type === 'BIN' || this.c.type === 'DEC'){
          start = parseInt(this.c.value, 10);
          this.eat(this.c.type);
        } else {
          // Read start number directly from source
          this.t.skip(); // skip whitespace
          let startStr = '';
          while(!this.t.eof() && /[0-9]/.test(this.t.peek())){
            startStr += this.t.next();
          }
          if(startStr === ''){
            throw Error(`Expected bit number after '.' at ${this.c.line}:${this.c.col}`);
          }
          start = parseInt(startStr, 10);
          // Update current token
          this.c = this.t.get();
        }
        
        // Check for range: - or length: /
        let end = null;
        if(this.c.value === '-'){
          this.eat('SYM', '-');
          
          // Check if current token is already a number
          if(this.c.type === 'BIN' || this.c.type === 'DEC'){
            end = parseInt(this.c.value, 10);
            this.eat(this.c.type);
          } else {
            // Read end number directly from source
            this.t.skip(); // skip whitespace
            let endStr = '';
            while(!this.t.eof() && /[0-9]/.test(this.t.peek())){
              endStr += this.t.next();
            }
            if(endStr === ''){
              throw Error(`Expected bit number after '-' at ${this.c.line}:${this.c.col}`);
            }
            end = parseInt(endStr, 10);
            // Update current token
            this.c = this.t.get();
          }
          return {var:n, bitRange:{start, end}};
        } else if(this.c.value === '/'){
          // Length syntax: start/length means start to (start+length-1)
          this.eat('SYM', '/');
          
          let length = null;
          // Check if current token is already a number
          if(this.c.type === 'BIN' || this.c.type === 'DEC'){
            length = parseInt(this.c.value, 10);
            this.eat(this.c.type);
          } else {
            // Read length number directly from source
            this.t.skip(); // skip whitespace
            let lengthStr = '';
            while(!this.t.eof() && /[0-9]/.test(this.t.peek())){
              lengthStr += this.t.next();
            }
            if(lengthStr === ''){
              throw Error(`Expected length number after '/' at ${this.c.line}:${this.c.col}`);
            }
            length = parseInt(lengthStr, 10);
            // Update current token
            this.c = this.t.get();
          }
          
          if(length < 1){
            throw Error(`Length must be at least 1 at ${this.c.line}:${this.c.col}`);
          }
          
          // Calculate end: start + length - 1
          end = start + length - 1;
          return {var:n, bitRange:{start, end}};
        } else {
          // Single bit: variable.bit
          return {var:n, bitRange:{start, start}};
        }
      }
      return {var:n};
    }
    throw Error(`Bad expression at ${this.c.line}:${this.c.col}`);
  }

  call(name){
    this.eat('SYM','(');
    const a=[];
    if(this.c.value!==')'){
      do{
        a.push(this.expr());
        if(this.c.value===',') this.eat('SYM',',');
        else break;
      }while(true);
    }
    this.eat('SYM',')');
    return {call:name,args:a};
  }
}

/* ================= INTERPRETER ================= */

class Interpreter {
  constructor(funcs,out){
    this.funcs=funcs;
    this.out=out;
    this.storage=[]; // Array of stored values: [{value: "101", index: 0}, ...]
    this.nextIndex=0;
    this.vars=new Map(); // Variable name -> {type, value, ref}
    this.wires=new Map(); // Wire name -> {type, ref}
    this.cycle=0;
    this.wireStatements=[]; // Statements that assign to wires (for NEXT)
    this.regStatements=[]; // REG statements (for NEXT)
    this.regStorageMap=new Map(); // Map from statement to REG storage index
    this.regPendingMap=new Map(); // Map from statement to REG pending input value (for next cycle)
    this.wireStorageMap=new Map(); // Map from wire name to storage index (for reuse during NEXT)
    this.mode='STRICT'; // Default mode: STRICT (wires immutable)
    
    // Initialize ~
    this.vars.set('~', {type: '1bit', value: '0', ref: null});
    this.cycle=1;
  }

  getBitWidth(type){
    if(!type) return null;
    const m = type.match(/^(\d+)(bit|wire)$/);
    return m ? parseInt(m[1]) : null;
  }

  isWire(type){
    return type && type.endsWith('wire');
  }

  // Format binary string as hex/binary display
  formatValue(binStr, bitWidth, truncateAt80=false){
    if(!binStr || binStr === '-') return binStr;
    
    // Truncate for display if > 80 bits (for variables panel)
    let displayStr = binStr;
    if(truncateAt80 && binStr.length > 80){
      displayStr = binStr.substring(0, 80);
    }
    
    // If 8 bits or less, show as binary
    if(bitWidth <= 8){
      return displayStr + (truncateAt80 && binStr.length > 80 ? ' ..' : '');
    }
    
    // For >= 32 bits, format hex in groups of 4 hex digits
    if(bitWidth >= 32){
      const parts = [];
      let remaining = displayStr;
      
      // Process in 8-bit chunks (2 hex digits each)
      let hexStr = '';
      while(remaining.length >= 8){
        const chunk = remaining.substring(0, 8);
        const hexVal = parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0');
        hexStr += hexVal;
        remaining = remaining.substring(8);
      }
      
      // Group hex digits in groups of 4 with spaces
      if(hexStr){
        let grouped = '';
        for(let i = 0; i < hexStr.length; i++){
          grouped += hexStr[i];
          // Add space after every 4 hex digits (except at the end)
          if((i + 1) % 4 === 0 && i < hexStr.length - 1){
            grouped += ' ';
          }
        }
        parts.push(`^${grouped}`);
      }
      
      // Add remaining bits as binary
      if(remaining.length > 0){
        parts.push(remaining);
      }
      
      const result = parts.join(' + ');
      return result + (truncateAt80 && binStr.length > 80 ? ' ..' : '');
    }
    
    // For 9-31 bits, format as hex + binary
    const parts = [];
    let remaining = displayStr;
    
    // Process in 8-bit chunks (hex)
    while(remaining.length >= 8){
      const chunk = remaining.substring(0, 8);
      const hexVal = parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0');
      parts.push(`^${hexVal}`);
      remaining = remaining.substring(8);
    }
    
    // Add remaining bits as binary
    if(remaining.length > 0){
      parts.push(remaining);
    }
    
    const result = parts.join(' + ');
    return result + (truncateAt80 && binStr.length > 80 ? ' ..' : '');
  }
  
  getVal(value, width){
    return (value ==='-') ? '0'.repeat(width) : value;
  }

  storeValue(value){
    const idx = this.nextIndex++;
    this.storage.push({value, index: idx});
    return idx;
  }

  // Parse a complex reference string and return the value
  // Examples: &0, &1.0, &1.2-4, (101), &0&1, (11)&2, etc.
  getValueFromRef(refStr){
    if(!refStr || refStr === '&-') return null;
    
    // Handle complex references by parsing them piece by piece
    let result = '';
    let i = 0;
    
    while(i < refStr.length){
      // Literal in parentheses: (101)
      if(refStr[i] === '('){
        const end = refStr.indexOf(')', i);
        if(end === -1) return null;
        result += refStr.substring(i+1, end);
        i = end + 1;
        continue;
      }
      
      // Reference: &0, &1.0, &1.2-4
      if(refStr[i] === '&'){
        i++;
        let numStr = '';
        while(i < refStr.length && /[0-9]/.test(refStr[i])){
          numStr += refStr[i];
          i++;
        }
        
        if(numStr === '') return null;
        const idx = parseInt(numStr);
        const stored = this.storage.find(s => s.index === idx);
        if(!stored) {
          return null;
        }
        
        // Check for bit selection: .0 or .2-4
        if(i < refStr.length && refStr[i] === '.'){
          i++;
          let bitStr = '';
          while(i < refStr.length && /[0-9-]/.test(refStr[i])){
            bitStr += refStr[i];
            i++;
          }
          
          if(bitStr.includes('-')){
            // Range: 2-4
            const [start, end] = bitStr.split('-').map(x => parseInt(x));
            if(isNaN(start) || isNaN(end)) return null;
            result += stored.value.substring(start, end+1);
          } else {
            // Single bit: 0
            const bit = parseInt(bitStr);
            if(isNaN(bit) || bit >= stored.value.length) return null;
            result += stored.value[bit];
          }
        } else {
          // Full value
          result += stored.value;
        }
        continue;
      }
      
      i++;
    }
    
    return result || null;
  }

  formatRef(ref, varName){
    // Special case: show(&~) shows cycle number
    if(varName === '~' && (ref === null || ref === '&-')){
      return `>${this.cycle}`;
    }
    if(!ref || ref === '&-') return '&-';
    return ref;
  }

  evalExpr(expr, computeRefs=false){
  const parts = [];

  for (const x of expr) {
      const v = this.evalAtom(x, computeRefs);

    if (Array.isArray(v)) {
      for (const part of v) parts.push(part);
    } else {
      parts.push(v);
    }
  }

  return parts;
}

  // Build a reference string from expression parts
  buildRefFromParts(parts, bitsNeeded, startOffset=0){
    let refStr = '';
    let bitsRemaining = bitsNeeded;
    let globalBitPos = 0;
    
    for(let partIdx = 0; partIdx < parts.length; partIdx++){
      const part = parts[partIdx];
      if(bitsRemaining <= 0) break;
      
      let partValue = '';
      let partRef = null;
      
      // Prioritize ref over value when building wire references
      if(part.ref && part.ref !== '&-'){
        partRef = part.ref;
        // First try to get value from the ref
        partValue = this.getValueFromRef(part.ref) || '';
        // If we have a ref but no value from getValueFromRef, try to get it directly from storage
        if(!partValue && partRef) {
          const refMatch = partRef.match(/^&(\d+)/);
          if(refMatch){
            const stored = this.storage.find(s => s.index === parseInt(refMatch[1]));
            if(stored) partValue = stored.value;
          }
        }
        // If still no value but part has a value property, use that (for function returns)
        // Also, if partValue exists but is shorter than part.value, prefer part.value (full value)
        if(part.value && part.value !== '-'){
          if(!partValue || part.value.length > partValue.length){
            partValue = part.value;
          }
        }
      } else if(part.value && part.value !== '-'){
        partValue = part.value;
      }
      
      // If we have a ref, we can build the reference even without value
      if(!partValue && !partRef) continue;
      
      const partBits = partValue ? partValue.length : 0;
      
      // Use bitWidth from the part if available (for bit ranges like data.0)
      let actualPartBits = part.bitWidth || partBits;
      
      // If we have a ref but no value, we need to know the bit width
      // Try to get it from the storage
      if(actualPartBits === 0 && partRef && partRef.startsWith('&')){
        const refMatch = partRef.match(/^&(\d+)/);
        if(refMatch){
          const stored = this.storage.find(s => s.index === parseInt(refMatch[1]));
          if(stored) {
            // Only use full storage value if this is NOT a bit range
            if(!partRef.includes('.')){
              partValue = stored.value;
              actualPartBits = stored.value.length;
            } else {
              // For bit ranges, use the extracted value length
              if(partValue) {
                actualPartBits = partValue.length;
              }
            }
          }
        }
      }
      
      // If we have a ref but partValue is shorter than expected, try to get full value from ref
      // This handles cases where getValueFromRef might have returned a partial value
      // BUT: Don't expand if this is a bit range (has . in the ref)
      if(partRef && partRef.startsWith('&') && partValue && actualPartBits < bitsNeeded && !partRef.includes('.')){
        const refMatch = partRef.match(/^&(\d+)/);
        if(refMatch){
          // Simple ref like &5 (not a bit range like &5.0)
          const stored = this.storage.find(s => s.index === parseInt(refMatch[1]));
          if(stored && stored.value.length > actualPartBits){
            partValue = stored.value;
            actualPartBits = stored.value.length;
          }
        }
      }
      
      if(actualPartBits === 0 && !partRef) continue;
      
      // Skip bits before startOffset
      if(globalBitPos + actualPartBits <= startOffset){
        globalBitPos += actualPartBits;
        continue;
      }
      
      // Calculate which bits we need from this part
      const partStart = Math.max(0, startOffset - globalBitPos);
      const partEnd = Math.min(actualPartBits, startOffset + bitsNeeded - globalBitPos);
      const bitsToTake = partEnd - partStart;
      
      if(bitsToTake <= 0){
        globalBitPos += actualPartBits;
        continue;
      }
      
      if(partRef){
        // Has a reference
        if(bitsToTake === actualPartBits && partStart === 0){
          // Use full reference
          refStr += partRef;
        } else {
          // Extract specific bits from reference
          if(partRef.startsWith('&')){
            const baseMatch = partRef.match(/^&(\d+)/);
            if(baseMatch){
              const baseIdx = baseMatch[1];
              if(bitsToTake === 1){
                // Single bit
                refStr += `&${baseIdx}.${partStart}`;
              } else {
                // Range
                refStr += `&${baseIdx}.${partStart}-${partEnd-1}`;
              }
            } else {
              // Complex reference, use literal
              const literalBits = partValue ? partValue.substring(partStart, partEnd) : '0'.repeat(bitsToTake);
              refStr += `(${literalBits})`;
            }
          } else {
            // Literal reference, extract bits
            const literalBits = partValue ? partValue.substring(partStart, partEnd) : '0'.repeat(bitsToTake);
            refStr += `(${literalBits})`;
          }
        }
      } else {
        // Literal value
        const literalBits = partValue.substring(partStart, partEnd);
        refStr += `(${literalBits})`;
      }
      
      bitsRemaining -= bitsToTake;
      globalBitPos += actualPartBits;
    }
    
    return refStr || '&-';
  }

  evalAtom(a, computeRefs=false, varName=null){
    if(a.bin){
      // If computeRefs is true (wire assignment), store in storage and return reference
      if(computeRefs){
        const idx = this.storeValue(a.bin);
        return {value: a.bin, ref: `&${idx}`, varName: null};
      }
      return {value: a.bin, ref: null, varName: null};
    }
    if(a.hex){
      // Convert hex to binary
      const hexStr = a.hex;
      let binStr = '';
      for(let i = 0; i < hexStr.length; i++){
        const hexDigit = parseInt(hexStr[i], 16);
        binStr += hexDigit.toString(2).padStart(4, '0');
      }
      // If computeRefs is true (wire assignment), store in storage and return reference
      if(computeRefs){
        const idx = this.storeValue(binStr);
        return {value: binStr, ref: `&${idx}`, varName: null};
      }
      return {value: binStr, ref: null, varName: null};
    }
    if(a.var){
      if(a.var === '~'){
        return {value: '1', ref: null, varName: '~'}; // ~ is always 1 during execution
      }
      const wire = this.wires.get(a.var);
      let val = null;
      let ref = null;
      let type = null;
      
      if(wire){
        // Always read the current value from storage (don't cache)
        // This ensures we get the updated value when storage is modified in WIREWRITE mode
        val = this.getValueFromRef(wire.ref);
        ref = wire.ref;
        type = wire.type;
        // If wire has no value yet, treat as 0 for computation (but show as -)
        if(val === null){
          if(wire.ref === null || wire.ref === '&-'){
            val = '-';
          } else {
            // Reference exists but value not computed yet - compute it
            val = '0'.repeat(this.getBitWidth(wire.type));
          }
        }
      } else {
        const varInfo = this.vars.get(a.var);
        if(!varInfo) throw Error('Undefined '+a.var);
        val = varInfo.value;
        ref = varInfo.ref;
        type = varInfo.type;
      }
      
      // Handle bit range if specified
      if(a.bitRange){
        const {start, end} = a.bitRange;
        // Ensure end is defined (for single bit access, end should equal start)
        const actualEnd = end !== undefined && end !== null ? end : start;
        if(val === null || val === '-'){
          // Return zeros for undefined value bit range
          const bitWidth = actualEnd - start + 1;
          const zeros = '0'.repeat(bitWidth);
          const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
          return {value: zeros, ref: null, varName: `${a.var}.${varNameSuffix}`, bitWidth: bitWidth};
        }
        if(start < 0 || actualEnd >= val.length || start > actualEnd){
          throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var} (length: ${val.length})`);
        }
        // Extract bits (bits are indexed from left to right, 0 is MSB)
        const extracted = val.substring(start, actualEnd + 1);
        const bitWidth = actualEnd - start + 1;
        // Format varName: use single bit notation if start === actualEnd, otherwise range notation
        const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
        const refSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
        return {value: extracted, ref: ref ? `${ref}.${refSuffix}` : null, varName: `${a.var}.${varNameSuffix}`, bitWidth: bitWidth};
      }
      
      return {value: val, ref: ref, varName: a.var};
    }
    if(a.ref){
      // Reference expression like &variable
      if(a.ref === '~'){
        return {value: null, ref: null, isRef: true, varName: '~'};
      }
      const wire = this.wires.get(a.ref);
      if(wire){
        return {value: null, ref: wire.ref, isRef: true, varName: a.ref};
      }
      const varInfo = this.vars.get(a.ref);
      if(varInfo){
        return {value: null, ref: varInfo.ref, isRef: true, varName: a.ref};
      }
      throw Error('Undefined reference '+a.ref);
    }
    if(a.refLiteral){
      // Literal reference like &0, &1.0
      return {value: null, ref: a.refLiteral, isRef: true, varName: null};
    }
    if(a.call) return this.call(a.call, a.args, computeRefs);
  }

  call(name, args, computeRefs=false){
    const argValues = args.map((x, argIdx) => {
      const r = this.evalExpr(x, computeRefs);
      const value = r.map(part => {
        // Always prefer reading from ref to get current value (important for WIREWRITE mode)
        // This ensures we get the updated value when storage is modified
        if(part.ref && part.ref !== '&-'){
          const val = this.getValueFromRef(part.ref);
          if(val) {
            return val;
          }
        }
        // Fallback to part.value if no ref or ref didn't yield a value
        if(part.value && part.value !== '-'){
          return part.value;
        }
        return '-'; // Default to 0 for uninitialized
      }).join('');
      return value;
    });

    const argRefs = args.map(x => {
      const r = this.evalExpr(x, computeRefs);
      return r.map(part => part.ref || null);
    });

    const b=x=>x==='1';

    // REG instructions
    if(name.startsWith('REG')){
      const width = parseInt(name.substring(3));
      if(isNaN(width) || width < 1 || width > 99) throw Error(`Invalid REG instruction ${name}`);
      
      if(argValues.length !== 3) throw Error(`REG${width} expects 3 arguments`);
    
      const data = this.getVal(argValues[0], width);
      const clock = argValues[1];
      const clear = argValues[2];
      
      if(data.length !== width) throw Error(`REG${width} data argument must be ${width} bits, got ${data.length}: ${data}`);
      if(clock.length !== 1) throw Error(`REG${width} clock argument must be 1 bit`);
      if(clear.length !== 1) throw Error(`REG${width} clear argument must be 1 bit`);
      
      // REG flip-flop behavior:
      // - Output the previous pending value (or zeros if first time)
      // - Store the new input data as pending for the next cycle
      
      const currentStmt = this.currentStmt;
      
      // Determine what to output (previous pending value, or zeros if first time)
      let outputValue;
      if(currentStmt && this.regPendingMap.has(currentStmt)){
        // Output the previous pending value
        outputValue = this.regPendingMap.get(currentStmt);
      } else {
        // First time: output zeros
        outputValue = '0'.repeat(width);
      }
      
      // Determine what to store as pending for next cycle
      let pendingValue;
      if(clear === '1'){
        pendingValue = '0'.repeat(width);
      } else {
        pendingValue = data;
      }
      
      // Store pending value for next cycle
      if(currentStmt){
        this.regPendingMap.set(currentStmt, pendingValue);
      }
      
      // Update storage with current output value
      let idx;
      if(currentStmt && this.regStorageMap.has(currentStmt)){
        // Update existing storage
        idx = this.regStorageMap.get(currentStmt);
        const stored = this.storage.find(s => s.index === idx);
        if(stored){
          stored.value = outputValue;
        } else {
          // Storage was lost, create new one
          idx = this.storeValue(outputValue);
          this.regStorageMap.set(currentStmt, idx);
        }
      } else {
        // Create new storage
        idx = this.storeValue(outputValue);
        if(currentStmt){
          this.regStorageMap.set(currentStmt, idx);
        }
      }
      
      const regRef = `&${idx}`;
      return {value: outputValue, ref: regRef};
    }

    // MUX instructions
    if(name.startsWith('MUX')){
      const muxNum = parseInt(name.substring(3));
      if(isNaN(muxNum) || muxNum < 1 || muxNum > 3) throw Error(`Invalid MUX instruction ${name}`);
      
      const selectorWidth = muxNum;
      const numDataInputs = Math.pow(2, selectorWidth); // MUX1: 2, MUX2: 4, MUX3: 8
      const expectedArgs = 1 + numDataInputs; // selector + data inputs
      
      if(argValues.length !== expectedArgs) {
        throw Error(`${name} expects ${expectedArgs} arguments (${selectorWidth}-bit selector + ${numDataInputs} data inputs)`);
      }
      
      const selector = argValues[0];
      const dataInputs = argValues.slice(1);
      
      // Validate selector width
      if(selector.length !== selectorWidth) {
        throw Error(`${name} selector must be ${selectorWidth} bits, got ${selector.length} bits`);
      }
      
      // Validate all data inputs have the same width
      const dataWidth = dataInputs[0].length;
      for(let i = 1; i < dataInputs.length; i++){
        if(dataInputs[i].length !== dataWidth){
          throw Error(`${name} all data inputs must have the same width, data0 has ${dataWidth} bits but data${i} has ${dataInputs[i].length} bits`);
        }
      }
      
      // Convert selector to integer
      const selValue = parseInt(selector, 2);
      
      // Validate selector value is within range
      if(selValue < 0 || selValue >= numDataInputs){
        throw Error(`${name} selector value ${selValue} is out of range (0 to ${numDataInputs - 1})`);
      }
      
      // Return the selected data input
      const result = dataInputs[selValue];
      
      // Store the value and return a reference (only if computeRefs is true)
      if(computeRefs){
        const idx = this.storeValue(result);
        const muxRef = `&${idx}`;
        return {value: result, ref: muxRef};
      } else {
        // During recomputation, don't create storage
        return {value: result, ref: null};
      }
    }

    // DEMUX instructions
    if(name.startsWith('DEMUX')){
      const demuxNum = parseInt(name.substring(5));
      if(isNaN(demuxNum) || demuxNum < 1 || demuxNum > 3) throw Error(`Invalid DEMUX instruction ${name}`);
      
      const selectorWidth = demuxNum;
      const numOutputs = Math.pow(2, selectorWidth); // DEMUX1: 2, DEMUX2: 4, DEMUX3: 8
      const expectedArgs = 2; // selector + data
      
      if(argValues.length !== expectedArgs) {
        throw Error(`${name} expects ${expectedArgs} arguments (${selectorWidth}-bit selector + data)`);
      }
      
      const selector = argValues[0];
      const data = argValues[1];
      
      // Validate selector width
      if(selector.length !== selectorWidth) {
        throw Error(`${name} selector must be ${selectorWidth} bits, got ${selector.length} bits`);
      }
      
      // Convert selector to integer
      const selValue = parseInt(selector, 2);
      
      // Validate selector value is within range
      if(selValue < 0 || selValue >= numOutputs){
        throw Error(`${name} selector value ${selValue} is out of range (0 to ${numOutputs - 1})`);
      }
      
      // Create outputs: one with data, rest with zeros
      const dataWidth = data.length;
      const outputs = [];
      for(let i = 0; i < numOutputs; i++){
        if(i === selValue){
          outputs.push(data);
        } else {
          outputs.push('0'.repeat(dataWidth));
        }
      }
      
      // Return array of values - handle like LATCH (multiple return values)
      if(Array.isArray(outputs)){
        if(computeRefs){
          const refs = [];
          for(const val of outputs){
            const idx = this.storeValue(val);
            refs.push(`&${idx}`);
          }
          return outputs.map((val, i) => ({value: val, ref: refs[i]}));
        } else {
          // During recomputation, don't create storage
          return outputs.map((val) => ({value: val, ref: null}));
        }
      }
      return outputs;
    }

    const gates={
      NOT:(v)=>b(v[0])?'0':'1',
      AND:(v)=>b(v[0])&&b(v[1])?'1':'0',
      OR:(v)=>b(v[0])||b(v[1])?'1':'0',
      XOR:(v)=>b(v[0])^b(v[1])?'1':'0',
      NAND:(v)=>!(b(v[0])&&b(v[1]))?'1':'0',
      NOR:(v)=>!(b(v[0])||b(v[1]))?'1':'0',
      LATCH:(v)=>{
        // Simple latch: S sets Q to 1, R resets Q to 0
        if(!this.latchState) this.latchState = {q: '0', nq: '1'};
        if(v[0]==='1') this.latchState.q='1';
        if(v[1]==='1') this.latchState.q='0';
        this.latchState.nq = this.latchState.q === '1' ? '0' : '1';
        return [this.latchState.q, this.latchState.nq];
      }
    };

    if(gates[name]){
      const result = gates[name](argValues);
      if(Array.isArray(result)){
        // Multiple return values
        if(computeRefs){
          const refs = [];
          for(const val of result){
            const idx = this.storeValue(val);
            refs.push(`&${idx}`);
          }
          return result.map((val, i) => ({value: val, ref: refs[i]}));
        } else {
          // During recomputation, don't create storage
          return result.map((val) => ({value: val, ref: null}));
        }
      } else {
        // Single return value
        if(computeRefs){
          const idx = this.storeValue(result);
          return {value: result, ref: `&${idx}`};
        } else {
          // During recomputation, don't create storage
          return {value: result, ref: null};
        }
      }
    }

    if(name === 'show'){
      // show doesn't return anything
      return {value: '', ref: null};
    }

    const f=this.funcs.get(name);
    if(!f) throw Error('Unknown function '+name);
    if(argValues.length!==f.params.length) throw Error('Bad arity '+name);

    const local=new Interpreter(this.funcs,this.out);
    local.storage = this.storage;
    local.nextIndex = this.nextIndex;
    f.params.forEach((p,i)=>{
      local.vars.set(p.n, {type: p.type, value: argValues[i], ref: null});
    });
    // Execute function body statements
    // Debug: check if body has unexpected statements
    if(f.body.length > 0 && f.returns.length > 0){
      // If we have both body and returns, something might be wrong
      // But this is allowed, so we'll just execute the body
    }
    for(const s of f.body){
      try {
        local.exec(s, computeRefs);
      } catch(e) {
        // Add context about which function and statement caused the error
        const stmtInfo = s.decls ? `declaration of ${s.decls.map(d => `${d.type || 'unknown'} ${d.name}`).join(', ')}` : 'statement';
        throw Error(`Error in function body at ${this.getLocation(s)} (${stmtInfo}): ${e.message}`);
      }
    }

    if(f.returns.length===0) return {value: '', ref: null};
    const returns = f.returns.map(r=>local.evalExpr(r.expr, computeRefs));
    // Flatten returns: if evalExpr returned an array of parts, concatenate them all
    // (not just take the first one, as function returns might span multiple parts)
    const flattened = [];
    for(const r of returns){
      if(Array.isArray(r)){
        // Concatenate all parts from the return expression
        for(const part of r){
          flattened.push(part);
        }
      } else {
        flattened.push(r);
      }
    }
    // Update global nextIndex to match local's nextIndex (in case function created new storage)
    this.nextIndex = local.nextIndex;
    return flattened;
  }

  // Helper to get location info from statement or declaration
  getLocation(s, d=null){
    // Try to get location from statement
    if(s && s.line && s.col) return `${s.line}:${s.col}`;
    if(s && s.decls && s.decls.length > 0 && s.decls[0].line && s.decls[0].col) {
      return `${s.decls[0].line}:${s.decls[0].col}`;
    }
    // Try to get from declaration
    if(d && d.line && d.col) return `${d.line}:${d.col}`;
    // Fallback
    return 'unknown location';
  }

  exec(s, computeRefs=false){
    // Set current statement context for REG calls
    const prevStmt = this.currentStmt;
    this.currentStmt = s;
    
    try {
    if(s.show){
      const results = [];
      for(const e of s.show){
        // Extract variable name from expression if it's a simple variable reference
        let varName = null;
        let varType = null;
        let bitRange = null;
        if(e && e.length === 1 && e[0].var){
          varName = e[0].var;
          bitRange = e[0].bitRange;
          // Look up type from original variable (not the bit range)
          const wire = this.wires.get(varName);
          if(wire){
            varType = wire.type;
          } else {
            const varInfo = this.vars.get(varName);
            if(varInfo){
              varType = varInfo.type;
            }
          }
        } else if(e && e.length === 1 && e[0].ref){
          // Reference expression like &variable
          varName = e[0].ref;
          const wire = this.wires.get(varName);
          if(wire){
            varType = wire.type;
          } else {
            const varInfo = this.vars.get(varName);
            if(varInfo){
              varType = varInfo.type;
            }
          }
        }
        
        const r = this.evalExpr(e, computeRefs);
        for(const part of r){
          if(!part) continue; // Skip undefined parts
          
          // Use varName from part if it has bit range info, otherwise construct from bitRange if available
          let displayName = part.varName;
          if(!displayName && varName && bitRange){
            // Construct varName from bitRange if part.varName is not set
            const {start, end} = bitRange;
            const actualEnd = end !== undefined && end !== null ? end : start;
            if(start === actualEnd){
              displayName = `${varName}.${start}`;
            } else {
              displayName = `${varName}.${start}-${actualEnd}`;
            }
          }
          if(!displayName) displayName = varName;
          
          let displayType = varType;
          
          // If bit range, calculate type from bit width
          if(part.bitWidth){
            displayType = `${part.bitWidth}bit`;
          }
          
          if(part.isRef){
            // Show reference
            const refStr = this.formatRef(part.ref, part.varName);
            if(displayName && displayType){
              results.push(`${displayName} (${displayType}) = ${refStr}`);
            } else {
              results.push(refStr);
            }
          } else {
            // Show value
            let valueStr = part.value !== null ? part.value : '-';
            // Format value as hex/binary if we have type info
            if(displayType && valueStr !== '-'){
              const bitWidth = part.bitWidth || this.getBitWidth(displayType);
              if(bitWidth){
                valueStr = this.formatValue(valueStr, bitWidth);
              }
            }
            if(displayName && displayType){
              results.push(`${displayName} (${displayType}) = ${valueStr}`);
            } else {
              results.push(valueStr);
            }
          }
        }
      }
      this.out.push(results.join(', '));
      return;
    }

    if(s.mode !== undefined){
      // MODE statement: change the mode
      this.mode = s.mode;
      return;
    }

    if(s.next !== undefined){
      // NEXT(~) or NEXT(~, count) - recompute wire values
      const count = s.next || 1;
      for(let i = 0; i < count; i++){
        this.cycle++;
        // Re-execute all wire statements in program order (they will recompute based on current storage state)
        // This ensures that assignments like "data = data.0 + data.1 + 00" can use the old value of data
        for(const ws of this.wireStatements){
          if(ws.assignment){
            // Handle assignment statement
            const name = ws.assignment.name;
            const wire = this.wires.get(name);
            if(wire){
              // During NEXT(~), evaluate expression without computeRefs to avoid creating new storage for literals
              // We'll compute the value directly and update existing storage
              const exprResult = this.evalExpr(ws.assignment.expr, false);
              const bits = this.getBitWidth(wire.type);
              
              // Compute total value from expression parts
              // Always prefer reading from ref to get current value (important for WIREWRITE mode)
              let wireValue = '';
              for(let i = 0; i < exprResult.length; i++){
                const part = exprResult[i];
                let partValue = '';
                
                if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) {
                    partValue = val;
                  }
                }
                // If we didn't get a value from ref, use part.value
                if(!partValue && part.value && part.value !== '-'){
                  partValue = part.value;
                }
                
                if(partValue){
                  wireValue += partValue;
                }
              }
              
              // Ensure we have the right number of bits
              if(wireValue.length < bits){
                wireValue = wireValue.padEnd(bits, '0');
              } else if(wireValue.length > bits){
                wireValue = wireValue.substring(0, bits);
              }
              
              // Reuse existing storage or create new one
              let storageIdx;
              if(this.wireStorageMap.has(name)){
                // Reuse existing storage
                storageIdx = this.wireStorageMap.get(name);
                const stored = this.storage.find(s => s.index === storageIdx);
                if(stored){
                  stored.value = wireValue || '0'.repeat(bits);
                } else {
                  // Storage was lost, create new one
                  storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                  this.wireStorageMap.set(name, storageIdx);
                }
              } else if(wire.ref && wire.ref !== '&-'){
                // Try to extract storage index from wire's ref
                const refMatch = wire.ref.match(/^&(\d+)/);
                if(refMatch){
                  storageIdx = parseInt(refMatch[1]);
                  const stored = this.storage.find(s => s.index === storageIdx);
                  if(stored){
                    // Update existing storage
                    stored.value = wireValue || '0'.repeat(bits);
                    this.wireStorageMap.set(name, storageIdx);
                  } else {
                    // Storage was lost, create new one
                    storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                    this.wireStorageMap.set(name, storageIdx);
                  }
                } else {
                  // Create new storage
                  storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                  this.wireStorageMap.set(name, storageIdx);
                }
              } else {
                // Create new storage (shouldn't happen during NEXT, but handle it)
                storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
                this.wireStorageMap.set(name, storageIdx);
              }
              
              // Set wire reference to the storage index
              wire.ref = `&${storageIdx}`;
            }
          } else {
            // Handle declaration statement
            // Execute all declarations in program order, but for simple literal assignments,
            // skip updating if wire already has a value (to avoid resetting values)
            if(ws.decls && ws.decls.length > 0 && ws.decls[0].type && ws.expr){
              // Check if the expression is just a constant (BIN or HEX literal)
              let isSimpleLiteral = true;
              if(Array.isArray(ws.expr)){
                for(const atom of ws.expr){
                  if(atom.call || (atom.var && atom.var !== '~') || atom.ref){
                    // Has function call, variable reference, or ref - not a simple literal
                    isSimpleLiteral = false;
                    break;
                  }
                }
              }
              if(isSimpleLiteral){
                // This is a simple literal assignment like "4wire data = 1101"
                // Check if wire already has a value - if so, skip updating during NEXT(~)
                // This prevents resetting values that were changed by later assignments
                const wireName = ws.decls[0].name;
                if(wireName && this.wires.has(wireName)){
                  const wire = this.wires.get(wireName);
                  if(wire.ref !== null && wire.ref !== '&-'){
                    // Wire already has a value, skip this simple literal assignment during NEXT(~)
                    // This allows later assignments like "data = 1111" to persist
                    continue;
                  }
                }
              }
            }
            // Recompute all declarations (they will see updated values of dependencies)
            this.execWireStatement(ws);
          }
        }
        // REG statements are handled through wire statements that call them
      }
      return;
    }

    if(s.test){
      const nameResult = this.evalExpr(s.test.name, true);
      const expectedResult = this.evalExpr(s.test.expected, true);
      
      if(nameResult.length === 0 || expectedResult.length === 0){
        throw Error(`TEST: Invalid expression result`);
      }
      
      const namePart = nameResult[0];
      const expectedPart = expectedResult[0];
      
      if(!namePart || !expectedPart){
        throw Error(`TEST: Missing expression parts`);
      }
      
      // Extract variable name from test expression
      let varName = 'variable';
      if(s.test.name && s.test.name.length > 0){
        const firstAtom = s.test.name[0];
        if(firstAtom.var){
          varName = firstAtom.var;
        } else if(firstAtom.ref){
          varName = firstAtom.ref;
        }
      }
      // Also try to get from namePart if available
      if(namePart.varName){
        varName = namePart.varName;
      }
      
      // Check if testing reference (if namePart is a reference, expected must also be a reference)
      if(namePart.isRef){
        if(!expectedPart.isRef){
          throw Error(`Error testing ${varName} reference: expected reference but got a literal`);
        }
        const nameRef = this.formatRef(namePart.ref, namePart.varName);
        const expectedRef = this.formatRef(expectedPart.ref, expectedPart.varName);
        if(nameRef !== expectedRef){
          throw Error(`Error testing ${varName} reference expected to be: ${expectedRef} but was: ${nameRef}`);
        }
      } else if(expectedPart.isRef){
        // Testing value but expected is reference - convert name to string
        const nameVal = namePart.value !== null && namePart.value !== undefined ? String(namePart.value) : '-';
        const expectedRef = this.formatRef(expectedPart.ref, expectedPart.varName);
        if(nameVal !== expectedRef){
          throw Error(`Error testing ${varName} value expected to be: ${expectedRef} but was: ${nameVal}`);
        }
      } else {
        // Testing value
        const nameVal = namePart.value !== null && namePart.value !== undefined ? namePart.value : '-';
        const expectedVal = expectedPart.value !== null && expectedPart.value !== undefined ? expectedPart.value : '-';
        if(nameVal !== expectedVal){
          throw Error(`Error testing ${varName} value expected to be: ${expectedVal} but was: ${nameVal}`);
        }
      }
      return;
    }

    if(s.assignment){
      // Assignment to existing variable/wire: name = expr
      const name = s.assignment.name;
      const expr = s.assignment.expr;
      
      // Check if it's a wire
      const wire = this.wires.get(name);
      if(wire){
        // Wire assignment - check mode only if wire was already assigned (ref is not null and not '&-')
        if(this.mode === 'STRICT' && wire.ref !== null && wire.ref !== '&-'){
          throw Error(`Cannot reassign wire ${name} in STRICT mode`);
        }
        // Wire assignment
        const exprResult = this.evalExpr(expr, computeRefs);
        const bits = this.getBitWidth(wire.type);
        const wireRef = this.buildRefFromParts(exprResult, bits, 0);
        
        // Compute the actual value from the reference
        const wireValue = this.getValueFromRef(wireRef) || '0'.repeat(bits);
        
        // In WIREWRITE mode, if wire already has storage, update it instead of creating new reference
        if(this.mode === 'WIREWRITE' && wire.ref !== null && wire.ref !== '&-'){
          // Check if wire has existing storage index
          if(this.wireStorageMap.has(name)){
            const storageIdx = this.wireStorageMap.get(name);
            const stored = this.storage.find(s => s.index === storageIdx);
            if(stored){
              // Update existing storage value
              stored.value = wireValue;
              // Keep the same reference - wire.ref stays the same (pointing to the updated storage)
              // Track for NEXT
              if(!this.wireStatements.includes(s)){
                this.wireStatements.push(s);
              }
              return;
            }
          }
          // If wire has a ref but no storage entry, try to extract storage index from ref
          const refMatch = wire.ref.match(/^&(\d+)/);
          if(refMatch){
            const storageIdx = parseInt(refMatch[1]);
            const stored = this.storage.find(s => s.index === storageIdx);
            if(stored){
              // Update existing storage value
              stored.value = wireValue;
              // Keep the same reference - wire.ref stays the same
              // Update wireStorageMap
              this.wireStorageMap.set(name, storageIdx);
              // Track for NEXT
              if(!this.wireStatements.includes(s)){
                this.wireStatements.push(s);
              }
              return;
            }
          }
        }
        
        // Default behavior: create new reference (or first assignment)
        // Reuse existing storage or create new one
        let storageIdx;
        if(this.wireStorageMap.has(name)){
          // Reuse existing storage
          storageIdx = this.wireStorageMap.get(name);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = wireValue;
          } else {
            // Storage was lost, create new one
            storageIdx = this.storeValue(wireValue);
            this.wireStorageMap.set(name, storageIdx);
          }
        } else {
          // Create new storage
          storageIdx = this.storeValue(wireValue);
          this.wireStorageMap.set(name, storageIdx);
        }
        
        // Set wire reference to the storage index
        wire.ref = `&${storageIdx}`;
        
        // Track for NEXT
        if(!this.wireStatements.includes(s)){
          this.wireStatements.push(s);
        }
        return;
      }
      
      // Check if it's a variable (bits are immutable, so this should error)
      if(this.vars.has(name)){
        throw Error(`Cannot reassign immutable variable ${name}`);
      }
      
      throw Error(`Undefined variable/wire ${name}`);
    }

    // Variable/wire declaration
    if(!s.expr){
      // Declaration without assignment (only wires)
      for(const d of s.decls){
        const bits = this.getBitWidth(d.type);
        const loc = this.getLocation(s, d);
        if(!bits) throw Error(`Invalid type ${d.type} at ${loc}`);
        if(!this.isWire(d.type)) throw Error(`Only wires can be declared without assignment at ${loc} (found ${d.type} for ${d.name})`);
        if(d.name === '_') continue;
        if(this.wires.has(d.name)) throw Error(`Wire ${d.name} already declared at ${loc}`);
        this.wires.set(d.name, {type: d.type, ref: null});
      }
      return;
    }

    const exprResult = this.evalExpr(s.expr, computeRefs);
    
    // Compute total value from expression
    let totalValue = '';
    for(const part of exprResult){
      if(part.value){
        totalValue += part.value;
      } else if(part.ref && part.ref !== '&-'){
        const val = this.getValueFromRef(part.ref);
        if(val) totalValue += val;
      }
    }
    
    let bitOffset = 0;

  for (const d of s.decls) {
      // Handle existing variables/wires (no type in declaration)
      let actualType = d.type;
      if(d.existing){
        // Look up existing variable/wire to get its type
        const wire = this.wires.get(d.name);
        if(wire){
          actualType = wire.type;
        } else {
          const varInfo = this.vars.get(d.name);
          if(varInfo){
            actualType = varInfo.type;
          } else {
            throw Error(`Undefined variable/wire ${d.name}`);
          }
        }
        // Ensure we got a valid type
        if(!actualType){
          throw Error(`Variable/wire ${d.name} has no type information`);
        }
      }
      
      const bits = this.getBitWidth(actualType);
      if(!bits) throw Error(`Invalid type ${actualType || d.type}`);

      if(d.name === '~'){
        // Special handling for ~
        if(exprResult.length > 0 && exprResult[0].value){
          this.vars.set('~', {type: '1bit', value: exprResult[0].value, ref: null});
        }
        bitOffset += bits;
        continue;
      }

      if(d.name === '_'){
        // Skip assignment for _
        bitOffset += bits;
        continue;
      }

      if(this.isWire(actualType)){
        // Wire assignment
        if(this.wires.has(d.name)){
          const existing = this.wires.get(d.name);
          // Check mode only if wire was already assigned (ref is not null and not '&-')
          if(this.mode === 'STRICT' && existing.ref !== null && existing.ref !== '&-'){
            throw Error(`Cannot reassign wire ${d.name} in STRICT mode`);
          }
          if(existing.ref !== null && existing.ref !== '&-') throw Error(`Wire ${d.name} already assigned`);
        }
        
        // Build reference from expression parts, starting at bitOffset
        const wireRef = this.buildRefFromParts(exprResult, bits, bitOffset);
        
        // Compute the actual value from the reference
        const wireValue = this.getValueFromRef(wireRef);
        
        // In WIREWRITE mode, if wire already has storage, update it instead of creating new reference
        let storageIdx;
        if(this.mode === 'WIREWRITE' && this.wires.has(d.name)){
          const existing = this.wires.get(d.name);
          if(existing.ref !== null && existing.ref !== '&-'){
            // Check if wire has existing storage index
            if(this.wireStorageMap.has(d.name)){
              storageIdx = this.wireStorageMap.get(d.name);
              const stored = this.storage.find(s => s.index === storageIdx);
              if(stored){
                // Update existing storage value
                stored.value = wireValue || '0'.repeat(bits);
                // Keep the same reference - don't change existing.ref
                // Track for NEXT
                if(!this.wireStatements.includes(s)){
                  this.wireStatements.push(s);
                }
                bitOffset += bits;
                continue;
              }
            }
            // If wire has a ref but no storage entry, try to extract storage index from ref
            const refMatch = existing.ref.match(/^&(\d+)/);
            if(refMatch){
              storageIdx = parseInt(refMatch[1]);
              const stored = this.storage.find(s => s.index === storageIdx);
              if(stored){
                // Update existing storage value
                stored.value = wireValue || '0'.repeat(bits);
                // Keep the same reference - don't change existing.ref
                // Update wireStorageMap
                this.wireStorageMap.set(d.name, storageIdx);
                // Track for NEXT
                if(!this.wireStatements.includes(s)){
                  this.wireStatements.push(s);
                }
                bitOffset += bits;
                continue;
              }
            }
          }
        }
        
        // Default behavior: reuse existing storage or create new one
        if(this.wireStorageMap.has(d.name)){
          // Reuse existing storage
          storageIdx = this.wireStorageMap.get(d.name);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = wireValue || '0'.repeat(bits);
          } else {
            // Storage was lost, create new one
            storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
            this.wireStorageMap.set(d.name, storageIdx);
          }
        } else {
          // Create new storage
          storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
          this.wireStorageMap.set(d.name, storageIdx);
        }
        
        // Set wire reference to the storage index
        const simpleRef = `&${storageIdx}`;
        if(!this.wires.has(d.name)){
          this.wires.set(d.name, {type: actualType, ref: simpleRef});
        } else {
          this.wires.get(d.name).ref = simpleRef;
        }
        
        // Track wire statement for NEXT
        if(!this.wireStatements.includes(s)){
          this.wireStatements.push(s);
        }
      } else {
        // Bit assignment - store value
        const valueBits = totalValue.substring(bitOffset, bitOffset + bits);
        
        if(valueBits.length !== bits){
          throw Error(`Bit-width mismatch: ${d.name} is ${bits}bit but got ${valueBits.length} bits`);
        }
        
        if(this.vars.has(d.name)){
          throw Error('Immutable '+d.name);
        }
        
        const idx = this.storeValue(valueBits);
        this.vars.set(d.name, {type: d.type, value: valueBits, ref: `&${idx}`});
      }
      
      bitOffset += bits;
    }
    } finally {
      // Restore previous statement context
      this.currentStmt = prevStmt;
    }
  }

  execWireStatement(s){
    // Re-execute a wire assignment statement
    // Set current statement context for REG calls
    const prevStmt = this.currentStmt;
    this.currentStmt = s;
    
    try {
    // During NEXT(~) recomputation, use computeRefs=false to avoid creating new storage for literals
    const exprResult = this.evalExpr(s.expr, false);
    
    // Compute total value from expression
    // Always prefer reading from ref to get current value (important for WIREWRITE mode)
    let totalValue = '';
    for(const part of exprResult){
      if(part.ref && part.ref !== '&-'){
        const val = this.getValueFromRef(part.ref);
        if(val) {
          totalValue += val;
          continue;
        }
      }
      // Fallback to part.value if no ref or ref didn't yield a value
      if(part.value){
        totalValue += part.value;
      }
    }
    
    let bitOffset = 0;
    for (const d of s.decls) {
      // Handle existing variables/wires
      let actualType = d.type;
      if(d.existing){
        const wire = this.wires.get(d.name);
        if(wire){
          actualType = wire.type;
        } else {
          const varInfo = this.vars.get(d.name);
          if(varInfo){
            actualType = varInfo.type;
          }
        }
        if(!actualType) continue;
      }
      
      if(d.name === '_' || d.name === '~') {
        bitOffset += this.getBitWidth(actualType);
        continue;
      }
      if(!this.isWire(actualType)) {
        bitOffset += this.getBitWidth(actualType);
        continue;
      }
      
      const bits = this.getBitWidth(actualType);
      
      // Extract value directly from expression parts (no need to build ref and then get value)
      const valueBits = totalValue.substring(bitOffset, bitOffset + bits);
      let wireValue = valueBits;
      
      // Ensure we have the right number of bits
      if(wireValue.length < bits){
        wireValue = wireValue.padEnd(bits, '0');
      } else if(wireValue.length > bits){
        wireValue = wireValue.substring(0, bits);
      }
      
      // Reuse existing storage or create new one
      let storageIdx;
      if(this.wireStorageMap.has(d.name)){
        // Reuse existing storage
        storageIdx = this.wireStorageMap.get(d.name);
        const stored = this.storage.find(s => s.index === storageIdx);
        if(stored){
          stored.value = wireValue || '0'.repeat(bits);
        } else {
          // Storage was lost, create new one
          storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
          this.wireStorageMap.set(d.name, storageIdx);
        }
      } else {
        // Create new storage
        storageIdx = this.storeValue(wireValue || '0'.repeat(bits));
        this.wireStorageMap.set(d.name, storageIdx);
      }
      
      // Set wire reference to the storage index
      const simpleRef = `&${storageIdx}`;
      if(this.wires.has(d.name)){
        this.wires.get(d.name).ref = simpleRef;
      }
      
      bitOffset += bits;
    }
    } finally {
      this.currentStmt = prevStmt;
    }
  }

}


class DbLocalStorage {
  constructor(){
    this.db = window.localStorage
  }
  get(name, defaul) {
    return (
      this.has(name) ?
      window.localStorage.getItem(name)
      : defaul
    );
  }
  has(name) {
    return window.localStorage.getItem(name) !== null;
  }
  set(name, value) {
    return window.localStorage.setItem(name, value);
  }
  del(name) {
    return window.localStorage.removeItem(name);
  }
}

class FileStorageSystem {
  constructor(dbStorage) {
    this.st = dbStorage;
    this.prefix = 'prog2';
    this.dirPrefix = '';
    this.dirSeparator = '>';
    this.dirSuffix = '>';
  }
  setPrefix(prefix) {
    this.prefix = prefix;
  }
  getPrefix() {
    return this.prefix;
  }
  
  getDirLocation(name, location) {
    if(location === this.dirSuffix) {
      return this.dirPrefix + name + this.dirSuffix;
    }
    let mid = location.slice(this.dirPrefix.length, -this.dirSuffix.length);
    
    return this.dirPrefix 
      + mid
      + this.dirSeparator 
      + name 
      + this.dirSuffix;
  }
  
  getUpDirLocation(location) {
    if(location === this.dirSuffix) {
      return this.dirSuffix;
    }
    let mid = location.slice(this.dirPrefix.length, -this.dirSuffix.length);
    let lastSepIndex = location.lastIndexOf(this.dirSeparator);
    if(lastSepIndex === -1) {
      return this.dirSuffix;
    }

    let parts = mid.split(this.dirSeparator);
    parts.pop(); 
    return this.dirPrefix + parts.join(this.dirSeparator) + this.dirSuffix;
  }

  getIdFilelist(location) {
    return this.prefix + '.list.' + location;
  }
  getIdFileRef(ref) {
    return this.prefix + '.ref.' + ref;
  }
  
  getIdNextRef() {
    return this.prefix + '.nextRef';
  }
  
  _getNextRef() {
    return parseInt(this.st.get(this.getIdNextRef(), '0'), 10);
  }
  _incNextRef() {
    return this._getNextRef() + 1;
  }
  
  _writeNextRef(value) {
    this.st.set(this.getIdNextRef(), value);
  }
  
  _writeFileList(value, location) {
    this.st.set(this.getIdFilelist(location), value);
  }
  
  _getFilesStr(location) {
    let filelistStr = this.st.get(this.getIdFilelist(location),-1);
    if(filelistStr === -1 || filelistStr === '') {
      return [];
    }
    return filelistStr.split('|');
  }
  
  _getFiles(location) {
    let fileStrArr = this._getFilesStr(location);
    let files = [];
    for(let i=0; i< fileStrArr.length; i++) {
      let fileStr = fileStrArr[i];
      let fileInfo = fileStr.split(",");
      let file = {
        name: fileInfo[0],
        type: fileInfo[1],
        ref: fileInfo[2]
      }
      files[files.length] = file;
    }
    return files;
  }
  
  _getFileInfo(name, location) {
    let fileStrArr = this._getFilesStr(location);
    for(let i=0; i< fileStrArr.length; i++) {
      let fileStr = fileStrArr[i];
      let fileInfo = fileStr.split(',');
      if(name === fileInfo[0]) {
        return {
          name: fileInfo[0],
          type: fileInfo[1],
          ref: fileInfo[2],
        };
      }
    }
    return {name: -1, type: -1, ref: -1};
  }
  
  _existsName(name, location) {
    let fileInfo = this._getFileInfo(name, location);
    return (fileInfo.name !== -1);
  }
  
  _isEmptyDir(location) {
    let fileStrArr = this._getFilesStr(location);
    return fileStrArr.length === 0;
  }
  
  _getFileRef(name, location) {
    let fileInfo = this._getFileInfo(name, location);
    return fileInfo.ref;
  }
  
  _add(name, location, type, content) {
    let fileStrArr = this._getFilesStr(location);
    let nextRef = this._incNextRef();

    fileStrArr[fileStrArr.length] = [
      name, type, nextRef
    ].join(',');
    
    this._writeNextRef(nextRef);
    if(type === 'file') {
      this._addStorageRef(nextRef, content);
    }
    this._writeFileList(fileStrArr.join('|'), location);
  }
  
  _update(name, location, content) {
    let fileRef = this._getFileRef(name, location);
    this._addStorageRef(fileRef, content);
  }
  
  _addStorageRef(fileRef, value) {
    this.st.set(this.getIdFileRef(fileRef), value);
  }
  
  _removeFileList(location) {
    this.st.del(this.getIdFilelist(location));
  }
  _removeStorageRef(fileRef) {
    this.st.del(this.getIdFileRef(fileRef));
  }
  
  _remove(name, location, type) {
    let fileStrArr = this._getFilesStr(location);
    let newFileStr = '';

    let foundFileInfo = {name: -1, type: -1, ref: -1};
    for (let i = 0; i < fileStrArr.length; i++) {
      let fileStr = fileStrArr[i];
      let fileInfo = fileStr.split(",");
      if (fileInfo[0] === name) {
        foundFileInfo = {
          name: fileInfo[0],
          type: fileInfo[1],
          ref: fileInfo[2]
        }
        continue;
      }
      newFileStr += '|' + fileStr;
    }
    if (foundFileInfo.name === -1) {
      throw Error(name + ' not found in location ' + location);
    }
    
    if(foundFileInfo.type === 'dir') {
      let namedLocation = this.getDirLocation(name, location);
      if(!this._isEmptyDir(namedLocation)) {
        throw Error(name + ' id not empty!');
      }
      if(newFileStr === '') {
        this._removeFileList(location);
      } else {
         this._writeFileList(newFileStr, location);
      }
      this._removeFileList(namedLocation);
    }
    if(foundFileInfo.type === 'file') {
      if(newFileStr === '') {
        this._removeFileList(location);
      } else {
        this._writeFileList(newFileStr, location);
      }
      this._removeStorageRef(foundFileInfo.ref);
    }
  }
  
  getFileContent(name, location) {
    let fileRef = this._getFileRef(name, location);
    return this.st.get(this.getIdFileRef(fileRef));
  }
  
  getFiles(location) {
    return this._getFiles(location);
  }
  addFile(name, location, content) {
    this._add(name, location, 'file', content);
  }
  addDir(name, location) {
    this._add(name, location, 'dir', -1);
  }
  updateFile(name, location, content) {
    this._update(name, location, content);
  }
  removeFile(name, location) {
     this._remove(name, location, 'file');
  }
  removeDir(name, location) {
    this._remove(name, location, 'dir');
  }
  isEmptyDir(location) {
    return this._isEmptyDir(location);
  }

  existsName(name, location) {
    return this._existsName(name, location);
  }
}
/* ================= DEBUGGER ================= */

let prog=null, pc=0;
let globalInterp = null;

let sdb = new DbLocalStorage();
let fss = new FileStorageSystem(sdb);
let currentFilesLocation = '>';

function locationChanged() {
  let dirPath = document.getElementById('dirpath');
  let dirExit = document.getElementById('direxit');
  
  dirPath.textContent = currentFilesLocation.replaceAll('>', '\\');
  
  if(currentFilesLocation === '>') {
    dirExit.disabled = 1;
  } else {
    dirExit.disabled = 0;
  }
}
function addDirIfNot(name, location) {
  if(!fss.existsName(name, location)) {
    fss.addDir(name, location);
  }
}

function addFileIfNot(name, location, content) {
  if(!fss.existsName(name, location)) {
    fss.addFile(name, location, content);
  }
}

function cdDir(dir, location) {
  return fss.getDirLocation(dir, location);
}

function cdUp(location) {
  return fss.getUpDirLocation(location);
}
function initFiles() {
  let loc = '>';
  addDirIfNot('lib', loc);
  loc = cdDir('lib', loc);
  addFileIfNot('first', loc, code.value);
}

function init() {
  if (sdb.has("prog/last")) {
    let last = sdb.get("prog/last");
    document.getElementById("code").value = last;
  }
  initFiles();
  elName = document.getElementById("filename");
  elSave = document.getElementById("filesave");
  dirSave = document.getElementById("dirsave");
  
  locationChanged();
  
  elName.addEventListener('input', (event) => {
    if(elName.value.trim().length == 0) {
      elSave.disabled=1;
      dirSave.disable=1;
    } else {
      elSave.disabled=0;
      dirSave.disabled=0;
    }
    //console.log('Value finalized:', event.target.value);
  });
}

function nameIsValid(name, isDir) {
  fileReg = /^[a-zA-Z0-9._]+$/;
  dirReg  = /^[a-zA-Z0-9_]+$/;
  invalidFileReg = /[^a-zA-Z0-9._]/;
  invalidDirReg = /[^a-zA-Z0-9_]/;
  if(!(isDir ? dirReg: fileReg).test(name)) {
    let invalidMatch = name.match(isDir? invalidFileReg: invalidDirReg);
    throw Error('Name contains bad caracter: ' + invalidMatch[0]);
  }
}

function btnfileUpdate() {
  if(fileActive === null) {
    return;
  }
  if(fileActive.className !== 'file') {
    return;
  }
  fss.updateFile(name, currentFilesLocation, code.value);
  fileActive.style ='';
  fileActive=null;
  fShowFiles();
}

function btnfileSave(isDir) {
  let elName = document.getElementById("filename");
  let elSave = document.getElementById("filesave");
  let dirSave = document.getElementById("dirsave");
  
  let name = filename.value.trim();
  if(name.length == 0) {
    filename.value = "";
    elSave.disabled= 0;
    return;
  }
  
  nameIsValid(name, isDir);
  fFilenameCheck(name);
  
  if(isDir) {
    fss.addDir(name, currentFilesLocation);
  } else {
    fss.addFile(name, currentFilesLocation, code.value);
  }
  
  elName.value = "";
  elSave.disabled = 1;
  dirSave.disabled = 1;
  fShowFiles();
}

function saveDb(prog) {
  sdb.set("prog/last", prog);
}

function fFilenameCheck(name) {
  if(fss.existsName(name, currentFilesLocation)) {
    throw Error(name + ' already exists!');
  }
}

function filenameCheck(fileStrArr) {
  let elName = document.getElementById("filename");
  
  if(filename.value.trim().length == 0) {
    filename.value = "";
    elSave.disabled= 0;
    return;
  }
  for(let i=0; i< fileStrArr.length; i++) {
    let fileStr = fileStrArr[i];
    let fileInfo = fileStr.split(",");
    let file = {
      name: fileInfo[0],
      type: fileInfo[1],
      ref: fileInfo[2],
      location: fileInfo[3]
    }
    if (file.location !== currentFilesLocation) {
      continue;
    }
    if(file.name === filename.value) {
      throw Error(filename.value + " already exists in this location");
    }
  }
}

let fileActive = null;

function btndirExit() {
  currentFilesLocation = fss.getUpDirLocation(currentFilesLocation);
  locationChanged();
  fShowFiles();
}

function dirExit() {
  if(currentFilesLocation === '>') {
    return;
  }
  let dirs = currentFilesLocation.split('>');
  console.log(dirs);
  if(dirs.length > 1) {
    currentFilesLocation = dirs.slice(0, -2).join('>') + '>';
  }
//  console.log(dirs);
  //currentFilesLocation = dirs.join('>');
  console.log('= '+currentFilesLocation);
  locationChanged();
  showFiles();
}

function btndirEnter() {
  if (fileActive === null) {
    return;
  }
  
  if (fileActive.className !== 'dir') {
    return;
  }
  currentFilesLocation = fss.getDirLocation(fileActive.textContent, currentFilesLocation);
  locationChanged();
  fileActive = null;
  fShowFiles();
}

function dirEnter() {
  if (fileActive === null) {
    return;
  }
  
  if( fileActive.className !=='dir') {
    return;
  }
  currentFilesLocation = currentFilesLocation + fileActive.textContent + '>';
  locationChanged();
  fileActive = null;
  showFiles();
}

function btnfileLoad() {
  if(!fileActive) {
    return;
  }
  
  if(fileActive.className !=='file') {
    return;
  }
  let fileLoad = document.getElementById('fileload');
  let elCode = document.getElementById("code");
  
  elCode.value = fss.getFileContent(fileActive.textContent, currentFilesLocation);

  fileActive.style ='';
  fileActive = null;
  fileLoad.disabled=1;
}

function fileLoad() {
  if(!fileActive) {
    return;
  }
 
  let filelistStr = sdb.get("prog/filelist");
  let fileStrArr = [];
  if(filelistStr) {
    fileStrArr = filelistStr.split("|");
  }
  let elCode = document.getElementById("code");
  for (let i = 0; i < fileStrArr.length; i++) {
  let fileStr = fileStrArr[i];
  let fileInfo = fileStr.split(",");
  let file = {
    name: fileInfo[0],
    type: fileInfo[1],
    ref: fileInfo[2],
    location: fileInfo[3]
  }
  if (file.location === currentFilesLocation && file.name != fileActive.textContent) {
    continue;
  }
  if(sdb.has('prog/fileRef'+ file.ref)) {
    let codeLoad = sdb.get('prog/fileRef'+ file.ref);
    //console.log(codeLoad);
    elCode.value = codeLoad;
  }
}

 fileActive.style = "";
 fileActive = null;
 filedirdelete.disabled = 1
 dirEnter.disabled = 1;
 fileLoad.disabled = 1;
}

function fileClick(e) {
  let filedirdelete = document.getElementById("filedirdelete");
  let dirEnter = document.getElementById('direnter');
  let fileLoad = document.getElementById('fileload');
  let fileUpdate = document.getElementById('fileupdate');
  
  if( fileActive === e) {
    fileActive.style = "";
    fileActive =null;
    filedirdelete.disabled = 1
    dirEnter.disabled = 1;
    fileLoad.disabled = 1;
    return;
  }
  if( fileActive !== null) {
    fileActive.style = "";
  }
  fileActive = e;
  //console.log(e)
  e.style ="color: red";
  filedirdelete.disabled = 0;
  if(fileActive.className === 'file') {
    fileLoad.disabled = 0;
    fileUpdate.disabled = 0;
  } else {
    fileLoad.disabled = 1;
    fileUpdate.disabled = 1;
  }
  if(fileActive.className === 'dir') {
    dirEnter.disabled = 0;
  } else {
    dirEnter.disabled = 1;
  }
}

function dirIsEmptyCheck(fileStrArr){
  let location = currentFilesLocation + fileActive.textContent + '>';
  //console.log(location);
for (let i = 0; i < fileStrArr.length; i++) {
  let fileStr = fileStrArr[i];
  let fileInfo = fileStr.split(",");
  let file = {
    name: fileInfo[0],
    type: fileInfo[1],
    ref: fileInfo[2],
    location: fileInfo[3]
  }
  if (file.location === location) {
    throw Error("Directory not empty! "+ file.name + " in directory");
  }
}

}

function btnfiledirDelete() {
  if(fileActive === null) {
    return;
  }
  if(fileActive.className == 'dir') {
    fss.removeDir(fileActive.textContent, currentFilesLocation);
  } else if (fileActive.className == 'file') {
    fss.removeFile(fileActive.textContent, currentFilesLocation);
  }
  fShowFiles();
  let filedirdelete = document.getElementById('filedirdelete');
  filedirdelete.disabled = 1;
  let fileload = document.getElementById('fileload');
  fileload.disabled = 1;
}

function filedirDelete() {
  if(fileActive === null) {
    return;
  }
  let filelistStr = sdb.get("prog/filelist");
  let nextEmptyFileRef = parseInt(sdb.get("prog/nextEmptyFileRef", "0"), 10);
  
  let fileStrArr = [];
  if(filelistStr) {
    fileStrArr = filelistStr.split("|");
  }
  
  dirIsEmptyCheck(fileStrArr);

  // delete directory 
  let newFileStrArr = [];
  for (let i = 0; i < fileStrArr.length; i++) {
  let fileStr = fileStrArr[i];
  let fileInfo = fileStr.split(",");
  let file = {
    name: fileInfo[0],
    type: fileInfo[1],
    ref: fileInfo[2],
    location: fileInfo[3]
  }
  if (file.location === currentFilesLocation && file.name == fileActive.textContent) {
    continue;
  }
  newFileStrArr[newFileStrArr.length] = fileStr;
}
  sdb.set("prog/filelist", newFileStrArr.join("|"));
  showFiles();
    let filedirdelete = document.getElementById('filedirdelete');
  filedirdelete.disabled = 1;
    let fileload = document.getElementById('fileload');
  fileload.disabled = 1;
}

function fileSave(isDir) {
  let elName = document.getElementById("filename");
  let elSave = document.getElementById("filesave");
  let dirSave = document.getElementById("dirsave");
  
  if(filename.value.trim().length == 0) {
    filename.value = "";
    elSave.disabled= 0;
    return;
  }
  
  let filelistStr = sdb.get("prog/filelist");
  let nextEmptyFileRef = parseInt(sdb.get("prog/nextEmptyFileRef", "0"), 10);
  
  let fileStrArr = [];
  if(filelistStr) {
    fileStrArr = filelistStr.split("|");
  }
  filenameCheck(fileStrArr);
  
  fileStrArr[fileStrArr.length] = [
    filename.value,
    isDir ?"dir":"file",
    isDir? 0: nextEmptyFileRef,
    currentFilesLocation,
  ];
  
  if( !isDir) {
    sdb.set("prog/nextEmptyFileRef", nextEmptyFileRef + 1);
    sdb.set("prog/fileRef" + nextEmptyFileRef, code.value);
  }
  sdb.set("prog/filelist", fileStrArr.join("|"));
  
  elName.value = "";
  elSave.disabled =1;
  dirSave.disabled = 1;
  showFiles();
}

function fShowFiles() {
  document.getElementById("filelist").innerHTML="";
  let currentFiles = fss.getFiles(currentFilesLocation);
  let elList = document.getElementById("filelist");
  
for (let i = 0; i < currentFiles.length; i++) {
  let file = currentFiles[i];
  if (file.type === 'file') {
    continue;
  }
    elList.innerHTML += '<div class="dir" onclick="fileClick(this)">' + file.name + '<div>';
}
for (let i = 0; i < currentFiles.length; i++) {
  let file = currentFiles[i];
  if (file.type === 'dir') {
    continue;
  }
    elList.innerHTML += '<div class="file" onclick="fileClick(this)">' + file.name + '<div>';
}

}

function showFiles() {
  document.getElementById("filelist").innerHTML="";
  if(!sdb.has('prog/filelist')) {
    return;
  }
  let filelistStr = sdb.get("prog/filelist");
  let files = [];
  let currentFiles = [];
  let fileStrArr = filelistStr.split("|");
  for(let i=0; i< fileStrArr.length; i++) {
    let fileStr = fileStrArr[i];
    let fileInfo = fileStr.split(",");
    
    files[files.length] = {
      name: fileInfo[0],
      type: fileInfo[1],
      ref: fileInfo[2],
      location: fileInfo[3]
    }
  }
  let locSeparator = '>';
  
  // shows current location files:
  let locationFiles = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (file.location !== currentFilesLocation) {
      continue;
    }
    if(file.type !== "dir") {
      continue;
    }
    currentFiles[currentFiles.length] = file;
  }
  
  for(let i=0; i< files.length; i++) {
     let file = files[i];
     if(file.location !== currentFilesLocation) {
       continue;
     }
     if(file.type !== "file") {
       continue;
     }
     currentFiles[currentFiles.length] = file;
  }
  
  //show current files
  let elList = document.getElementById("filelist");
  for(let i=0; i< currentFiles.length; i++) {
    let file = currentFiles[i];
    if(file.type === 'file') {
      elList.innerHTML += '<div class="file" onclick="fileClick(this)">'+ file.name +'<div>';
    } else if(file.type === 'dir') {
      elList.innerHTML += '<div class="dir" onclick="fileClick(this)">'+ file.name +'<div>';
    }
  } 
}

init();

function run(){
  try{
  document.getElementById('out').textContent='';
  saveDb(code.value);
  const p = new Parser(new Tokenizer(code.value));
  const stmts = p.parse();

  globalInterp = new Interpreter(p.funcs, []);

  for (const s of stmts) {
      globalInterp.exec(s, true);
  }

  render(globalInterp.out);
  showVars();
  }catch(e){ 
    render([e.message]); 
    if(globalInterp) showVars();
  }
}

function toggleCmd(){
  const panel = document.getElementById('cmdPanel');
  if(panel.style.display === 'none'){
    panel.style.display = 'block';
    document.getElementById('cmdInput').focus();
  } else {
    panel.style.display = 'none';
  }
}

function toggleFiles(){
  const panel = document.getElementById('filesPanel');
if (panel.style.display === 'none') {
  panel.style.display = 'block';
  fShowFiles();
} else {
  panel.style.display = 'none';
}
}

function sendCmd(){
  const cmdInput = document.getElementById('cmdInput');
  const cmdText = cmdInput.value.trim();
  
  if(!cmdText) return;
  
  try{
    // Ensure globalInterp exists (initialize from main code if needed)
    if(!globalInterp){
      const p = new Parser(new Tokenizer(code.value));
      const stmts = p.parse();
      globalInterp = new Interpreter(p.funcs, []);
      
      // Execute main program first
      for(const s of stmts){
        globalInterp.exec(s, true);
      }
    }
    
    // Parse and execute the command
    const p = new Parser(new Tokenizer(cmdText));
  const stmts = p.parse();

    // Add any new function definitions
    for(const [name, fn] of p.funcs.entries()){
    globalInterp.funcs.set(name, fn);
  }

    // Execute the command statements
    for(const s of stmts){
      globalInterp.exec(s, true);
    }
    
    // Render output and update variables
  render(globalInterp.out);
  showVars();
    
    // Clear the command input
    cmdInput.value = '';
  } catch(e){
    render([`Error: ${e.message}`]);
    if(globalInterp) showVars();
    // Don't clear on error so user can fix it
  }
}

// Allow Enter key to send command (Ctrl+Enter or Shift+Enter)
(function(){
  const cmdInput = document.getElementById('cmdInput');
  if(cmdInput){
    cmdInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && (e.ctrlKey || e.shiftKey)){
        e.preventDefault();
        sendCmd();
      }
    });
  }
})();

function render(lines){
  document.getElementById('out').textContent=lines.join('\n');
}

function showVars(){
  let t='';
  if(globalInterp){
    globalInterp.vars.forEach((v,k)=>{
      if(k === '~'){
        // Special case: ~ always shows as 1
        t += `~ = 1\n`;
      } else {
        // Show type for bit variables
        const typeStr = v.type ? ` (${v.type})` : '';
        let valueStr = v.value;
        // Format value as hex/binary if type is known (truncate at 80 bits for display)
        if(v.type && valueStr && valueStr !== '-'){
          const bitWidth = globalInterp.getBitWidth(v.type);
          if(bitWidth){
            valueStr = globalInterp.formatValue(valueStr, bitWidth, true);
          }
        }
        t += `${k}${typeStr} = ${valueStr} (ref: ${v.ref || 'null'})\n`;
      }
    });
    globalInterp.wires.forEach((w,k)=>{
      // Get wire value from reference
      const wireValue = globalInterp.getValueFromRef(w.ref);
      let valueStr = wireValue !== null ? wireValue : '-';
      // Format value as hex/binary if type is known (truncate at 80 bits for display)
      if(w.type && valueStr && valueStr !== '-'){
        const bitWidth = globalInterp.getBitWidth(w.type);
        if(bitWidth){
          valueStr = globalInterp.formatValue(valueStr, bitWidth, true);
        }
      }
      t += `${k} (${w.type}) = ${valueStr} (ref: ${w.ref || 'null'})\n`;
    });
    t += `\nCycle: ${globalInterp.cycle}\n`;
    t += `Storage: ${globalInterp.storage.length} entries\n`;
  }
  document.getElementById('vars').textContent=t;
}

function toggleAST(){
  const p=new Parser(new Tokenizer(code.value));
  const ast=p.parse();
  const panel=document.getElementById('astPanel');
  panel.style.display=panel.style.display==='none'?'block':'none';
  document.getElementById('ast').textContent=JSON.stringify(ast,null,2);
}
