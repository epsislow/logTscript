function loadScript(url)
{    
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    head.appendChild(script);
}

function loadJs(name) {
  loadScript('lib/'+ name);
  console.log(':: lib/'+ name + ' '+ loaded);
}


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
        // Skip comments until newline (but don't consume the newline)
        while(!this.eof() && this.peek()!='\n') this.next();
        break; // Stop at newline
      } else {
        break;
      }
    }
  }

pushSource({ src, alias }) {
  const t = new Tokenizer(src);
  t.alias = alias; // ← attach alias to tokenizer
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

    // Starts with digit â†’ TYPE, BIN, or DEC (never ID)
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

    // Starts with letter a-z ID or keyword
  if (/[a-zA-Z]/.test(c)) {
    let v = '';
    while (!this.eof() && /[a-zA-Z0-9]/.test(this.peek())) {
      v += this.next();
    }
      
      // Check for keywords
      if (['def', 'show', 'NEXT', 'TEST', 'MODE', 'STRICT', 'WIREWRITE', 'comp', 'pcb'].includes(v)) {
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

/* ================= PARSER ================= */

class Parser {
  constructor(t){
    this.t=t; this.c=t.get(); this.funcs=new Map();
    this.aliases = new Map();
    this.pcbs = new Map(); // PCB definitions: name -> { pins, pouts, exec, on, body, nextSection, returnSpec }
  }
  eat(type,val){
  //  console.log(type + ': ' + val);
    if(this.c.type===type && (val==null||this.c.value===val)) {
      this.c=this.t.get();
      console.log(this.c);
    }
    else throw Error(`Syntax error at ${this.c.file}: ${this.c.line}:${this.c.col}, expected ${type}${val?'='+val:''}, got ${this.c.type}=${this.c.value}`);
  }
  
  peekNextIsAssign() {
  let i = this.t.i;
  let src = this.t.src;

  // Skip whitespace
  while (i < src.length && /\s/.test(src[i])) i++;

  // Allow a(.slice)* before '='
  if (src[i] === '.') {
    i++; // skip '.'
    while (i < src.length && /[0-9]/.test(src[i])) i++;

    if (src[i] === '-') {
      i++;
      while (i < src.length && /[0-9]/.test(src[i])) i++;
    }

    if (src[i] === '/') {
      i++;
      while (i < src.length && /[0-9]/.test(src[i])) i++;
    }

    while (i < src.length && /\s/.test(src[i])) i++;
  }

  return src[i] === '=';
}

parse() {
  const stmts = [];
  
  while (true) {
    // 🔥 STOP condition
    if (this.c.type === 'EOF' && this.t.stack.length === 0) {
      break;
    }
    
    if (this.c.type === 'LOAD') {
      this.parseLoad();
      continue;
    }
    
    if (this.c.type === 'KEYWORD' && this.c.value === 'def') {
      this.parseDef();
      continue;
    }
    
    // PCB definition: pcb +[name]: or PCB instance: pcb [name] .var::
    if (this.c.type === 'KEYWORD' && this.c.value === 'pcb') {
      // Peek ahead to determine if definition (+) or instance
      let peekI = this.t.i;
      // Skip whitespace
      while (peekI < this.t.src.length && /\s/.test(this.t.src[peekI])) peekI++;
      const nextChar = this.t.src[peekI];
      
      if (nextChar === '+') {
        // PCB definition
        this.parsePcbDefinition();
      } else {
        // PCB instance - returns a statement
        stmts.push(this.parsePcbInstance());
      }
      continue;
    }
    
    // 🔥 Guard against EOF slipping through
    if (this.c.type === 'EOF') {
      continue;
    }
    
    // Skip EOL tokens (end of line markers)
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
      continue;
    }
    
    stmts.push(this.stmt());
    
    // After parsing a statement, optionally consume EOL tokens
    // This allows statements to be separated by newlines
    while (this.c.type === 'EOL') {
      this.c = this.t.get();
    }
  }
  
  return stmts;
}

addPathToLoad(path) {
  const params = [];
  const body = [];
  const returns = [];
  const name = 'load';
  const type = 'file';
  const old = { params, body, returns };
  if(this.funcs.has(name)) {
     old = this.funcs.get(name);
  }
  old.params.push( { type, path} );
  
  this.funcs.set(name, {params, body, returns})
}

parseLoad() {
  // LOAD token already in this.c
  const path = this.c.value;
  this.eat('LOAD');

  // Optional alias
  let alias = null;
  if (this.c.type === 'SYM' && this.c.value === '@') {
    this.eat('SYM', '@');

    if (this.c.type !== 'ID') {
      throw Error(`Expected alias name after @ at ${this.c.line}:${this.c.col}`);
    }

    alias = this.c.value;
    this.eat('ID');
  }

  // Resolve file
  const parts = path.split('/');
  const name = parts.pop();
  let location = parts.join('>');
  location = location ? location + '>' : '>';

  const content = fss.getFileContent(name, location);
  if (content == null) {
    throw Error(`LOAD failed: ${path} not found`);
  }

  // Parse loaded file in isolation
  const subParser = new Parser(new Tokenizer(content, path));
  subParser.parse();

  // Merge functions into current parser
  for (const [fname, fdef] of subParser.funcs.entries()) {
    this.funcs.set(fname, fdef);
  }

  // 🔑 REGISTER ALIAS HERE
  if (alias) {
    this.aliases.set(alias, subParser.funcs);
  }
}

parseDef() {
  this.eat('KEYWORD', 'def');
  
  const name = this.c.value;
  this.eat('ID');
  
  this.eat('SYM', '(');
  
  const params = [];
  while (this.c.type !== 'SYM' || this.c.value !== ')') {
    const type = this.c.value;
    this.eat('TYPE');
    
    const id = this.c.value;
    this.eat('ID');
    
    params.push({ type, id });
    
    if (this.c.value === ',') {
      this.eat('SYM', ',');
    }
  }
  
  this.eat('SYM', ')');
  this.eat('SYM', ':');
  
  const body = [];
  const returns = [];
  
  let lastLine = this.c.line;
  
  while (this.c.type !== 'EOF') {
    // Skip EOL tokens (they separate statements but don't affect function parsing)
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
      continue;
    }
    
    // Stop if function block ends (blank line or dedent)
    // Note: EOL tokens are already skipped above, so this.c.line is the actual statement line
    if (this.c.line > lastLine + 1) break;
    lastLine = this.c.line;
    
    // ---------- RETURN LINE ----------
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      
      const retType = this.c.value;
      this.eat('TYPE');
      
      const startLine = this.c.line;
      const expr = [];
      
      expr.push(this.atom());
      while (this.c.value === '+' && this.c.line === startLine) {
        this.eat('SYM', '+');
        expr.push(this.atom());
      }
      
      returns.push({ type: retType, expr });
      continue;
    }
    
    // ---------- BODY STATEMENT ----------
    if (
      this.c.type === 'TYPE' ||
      (this.c.type === 'KEYWORD' && this.c.value === 'show') ||
      this.c.type === 'ID' ||
      this.c.type === 'SPECIAL'
    ) {
      body.push(this.stmt());
      continue;
    }
    
    break;
  }
  
  const alias = this.t.alias;
  const key = alias ? `${alias}::${name}` : name;
  
  this.funcs.set(key, { params, body, returns });
}

parsePcbDefinition() {
  // pcb +[name]:
  this.eat('KEYWORD', 'pcb');
  this.eat('SYM', '+');
  this.eat('SYM', '[');
  
  const name = this.c.value;
  this.eat('ID');
  
  // Check for reserved names
  const reserved = ['led', 'switch', '7seg', 'dip', 'mem', 'counter', 'adder', 'subtract', 'divider', 'multiplier', 'shifter', 'rotary', 'lcd'];
  if (reserved.includes(name)) {
    throw Error(`PCB name '${name}' is reserved at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }
  
  this.eat('SYM', ']');
  this.eat('SYM', ':');
  
  // Skip whitespace/newlines
  while (this.c.type === 'EOL') {
    this.c = this.t.get();
  }
  
  const pins = [];    // { bits, name, type: 'pin' }
  const pouts = [];   // { bits, name, type: 'pout' }
  let exec = 'set';   // default exec trigger
  let on = 'raise';   // default on mode
  const body = [];
  const nextSection = [];
  let returnSpec = null;  // { bits, varName }
  
  let inNextSection = false;
  let lastLine = this.c.line;
  
  while (this.c.type !== 'EOF') {
    // Skip EOL tokens
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
      continue;
    }
    
    // Check for ~~ delimiter (start of next section) - check before blank line detection
    if (this.c.type === 'SYM' && this.c.value === '~~') {
      this.eat('SYM', '~~');
      inNextSection = true;
      lastLine = this.c.line;
      continue;
    }
    
    // Check for return specification :Nbit varName - check before blank line detection
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      
      // Check if it's just ':' (no return) or ':Nbit varName'
      if (this.c.type === 'TYPE') {
        const retType = this.c.value;
        this.eat('TYPE');
        
        const retVar = this.c.value;
        this.eat('ID');
        
        const bits = parseInt(retType);
        returnSpec = { bits, varName: retVar };
      }
      // ':' alone means no return value
      break;
    }
    
    // Stop if block ends (blank line or significant dedent) - but not for ~~ or :
    if (this.c.line > lastLine + 1 && body.length > 0) break;
    lastLine = this.c.line;
    
    // Parse pin/pout declarations: Npin varName or Npout varName
    if (this.c.type === 'TYPE' && (this.c.value.endsWith('pin') || this.c.value.endsWith('pout'))) {
      const typeVal = this.c.value;
      const isPout = typeVal.endsWith('pout');
      const bits = parseInt(typeVal);
      this.eat('TYPE');
      
      const varName = this.c.value;
      this.eat('ID');
      
      if (isPout) {
        pouts.push({ bits, name: varName });
      } else {
        pins.push({ bits, name: varName });
      }
      continue;
    }
    
    // Parse exec: varName
    if (this.c.type === 'ID' && this.c.value === 'exec') {
      this.eat('ID');
      this.eat('SYM', ':');
      exec = this.c.value;
      this.eat('ID');
      continue;
    }
    
    // Parse on: raise|edge|1
    if (this.c.type === 'ID' && this.c.value === 'on') {
      this.eat('ID');
      this.eat('SYM', ':');
      if (this.c.type === 'ID') {
        on = this.c.value;
        this.eat('ID');
      } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
        on = this.c.value;
        this.eat(this.c.type);
      }
      continue;
    }
    
    // Parse statements (comp, assignments, etc.)
    if (
      this.c.type === 'TYPE' ||
      this.c.type === 'KEYWORD' ||
      this.c.type === 'ID' ||
      this.c.type === 'SPECIAL' ||
      (this.c.type === 'SYM' && this.c.value === '.')
    ) {
      const stmt = this.stmt();
      if (inNextSection) {
        nextSection.push(stmt);
      } else {
        body.push(stmt);
      }
      // Update lastLine after parsing statement (important for multi-line statements like comp)
      lastLine = this.c.line;
      continue;
    }
    
    break;
  }
  
  // Validate exec references a pin
  const allPins = [...pins, ...pouts];
  const execPin = allPins.find(p => p.name === exec);
  if (!execPin) {
    throw Error(`PCB '${name}': exec '${exec}' must reference an existing pin. Available pins: ${allPins.map(p => p.name).join(', ')}`);
  }
  
  // Store PCB definition
  this.pcbs.set(name, {
    pins,
    pouts,
    exec,
    on,
    body,
    nextSection,
    returnSpec
  });
}

parsePcbInstance() {
  // pcb [name] .varName::
  this.eat('KEYWORD', 'pcb');
  this.eat('SYM', '[');
  
  const pcbName = this.c.value;
  this.eat('ID');
  
  this.eat('SYM', ']');
  
  // Parse instance name (must start with .)
  if (this.c.value !== '.') {
    throw Error(`Expected instance name starting with '.' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }
  this.eat('SYM', '.');
  
  const instanceName = '.' + this.c.value;
  this.eat('ID');
  
  // End with ::
  this.eat('SYM', ':');
  this.eat('SYM', ':');
  
  return { pcbInstance: { pcbName, instanceName } };
}

  stmt(){
    if(this.c.type==='TYPE') return this.var();
    if(this.c.type==='KEYWORD' && this.c.value==='show') return this.show();
    if(this.c.type==='KEYWORD' && this.c.value==='NEXT') return this.next();
    if(this.c.type==='KEYWORD' && this.c.value==='TEST') return this.test();
    if(this.c.type==='KEYWORD' && this.c.value==='MODE') return this.mode();
    if(this.c.type==='KEYWORD' && this.c.value==='comp') return this.parseComp();
    // PCB instance: pcb [name] .var::
    if(this.c.type==='KEYWORD' && this.c.value==='pcb') return this.parsePcbInstance();
    // Assignment to component: .name = expr (component names start with .)
    if(this.c.type==='SYM' && this.c.value==='.' && this.peekNextIsComponentAssign()){
      return this.assignment();
    }
    // Assignment to existing variable/wire: name = expr
    if((this.c.type==='ID' || this.c.type==='SPECIAL') && this.peekNextIsAssign()){
      return this.assignment();
    }
    // Mixed declaration: existing name, type name, ... = expr
    if((this.c.type==='ID' || this.c.type==='SPECIAL') && this.peekNextIsCommaThenType()){
      return this.mixedVar();
    }
    throw Error(`Invalid statement starting with '${this.c.value}' (${this.c.type}) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }
  
  peekNextIsComponentAssign(){
    // Check if next tokens are: ID = (component assignment) or ID : ID = (component property assignment)
    // or ID : { (component property block)
    // Note: this.c is already the '.' token, so we check what comes after
    let i = this.t.i;
    let src = this.t.src;
    
    // Skip whitespace after current position
    while (i < src.length && /\s/.test(src[i])) i++;
    
    // Check for ID (component name) - should be right after '.'
    if (i >= src.length || !/[a-zA-Z]/.test(src[i])) return false;
    
    // Skip ID (component name)
    while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) i++;
    
    // Skip whitespace
    while (i < src.length && /\s/.test(src[i])) i++;
    
    // Check if there's a ':' (property access or block) or '=' (direct assignment)
    if (i < src.length && src[i] === ':') {
      // This could be property assignment or property block
      i++; // Skip ':'
      // Skip whitespace (but not newlines for block detection)
      while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
      
      // Check for '{' (property block syntax: .component:{ ... })
      if (i < src.length && src[i] === '{') {
        return true; // Property block
      }
      
      // Skip any remaining whitespace including newlines
      while (i < src.length && /\s/.test(src[i])) i++;
      
      // Check for property name (ID)
      if (i >= src.length || !/[a-zA-Z]/.test(src[i])) return false;
      // Skip property name
      while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) i++;
      // Skip whitespace
      while (i < src.length && /\s/.test(src[i])) i++;
      // Check for '='
      return i < src.length && src[i] === '=';
    } else {
      // Direct assignment: .component = value
      // Check for '='
      return i < src.length && src[i] === '=';
    }
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

  parsePropertyBlock(componentName) {
    // Parse property block: { property1 = expr1 \n property2 = expr2 \n ... }
    this.eat('SYM', '{');
    
    const properties = [];
    let hasGetProperty = false;
    
    while (!(this.c.type === 'SYM' && this.c.value === '}')) {
      // Skip EOL tokens
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }
      
      // Skip EOF - shouldn't happen but safety check
      if (this.c.type === 'EOF') {
        throw Error(`Unexpected end of file in property block for ${componentName}`);
      }
      
      // Parse: propertyName = expr
      if (this.c.type !== 'ID') {
        throw Error(`Expected property name in property block at ${this.c.line}:${this.c.col}, got ${this.c.type} '${this.c.value}'`);
      }
      
      const propName = this.c.value;
      this.eat('ID');
      
      // Check for get> syntax
      if(propName === 'get' && this.c.type === 'SYM' && this.c.value === '>'){
        if(hasGetProperty){
          throw Error(`Only one get> property allowed per property block at ${this.c.line}:${this.c.col}`);
        }
        hasGetProperty = true;
        
        this.eat('SYM', '>');
        
        // Optional '=' after '>'
        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }
        
        // Parse target as atom (wire/variable name)
        const targetAtom = this.atom();
        
        // Validate no bit ranges
        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in get> property at ${this.c.line}:${this.c.col}`);
        }
        
        // Validate target is a simple variable (not component property access)
        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for get> property at ${this.c.line}:${this.c.col}`);
        }
        
        properties.push({ property: 'get>', target: targetAtom, expr: null });
        continue; // Skip to next property
      }
      
      // Check for mod> syntax (for divider: mod>= wireName)
      if(propName === 'mod' && this.c.type === 'SYM' && this.c.value === '>'){
        this.eat('SYM', '>');
        
        // Optional '=' after '>'
        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }
        
        // Parse target as atom (wire/variable name)
        const targetAtom = this.atom();
        
        // Validate no bit ranges
        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in mod> property at ${this.c.line}:${this.c.col}`);
        }
        
        // Validate target is a simple variable (not component property access)
        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for mod> property at ${this.c.line}:${this.c.col}`);
        }
        
        properties.push({ property: 'mod>', target: targetAtom, expr: null });
        continue; // Skip to next property
      }
      
      // Check for carry> syntax (for adder/subtract: carry>= wireName)
      if(propName === 'carry' && this.c.type === 'SYM' && this.c.value === '>'){
        this.eat('SYM', '>');
        
        // Optional '=' after '>'
        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }
        
        // Parse target as atom (wire/variable name)
        const targetAtom = this.atom();
        
        // Validate no bit ranges
        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in carry> property at ${this.c.line}:${this.c.col}`);
        }
        
        // Validate target is a simple variable (not component property access)
        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for carry> property at ${this.c.line}:${this.c.col}`);
        }
        
        properties.push({ property: 'carry>', target: targetAtom, expr: null });
        continue; // Skip to next property
      }
      
      // Check for over> syntax (for multiplier: over>= wireName)
      if(propName === 'over' && this.c.type === 'SYM' && this.c.value === '>'){
        this.eat('SYM', '>');
        
        // Optional '=' after '>'
        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }
        
        // Parse target as atom (wire/variable name)
        const targetAtom = this.atom();
        
        // Validate no bit ranges
        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in over> property at ${this.c.line}:${this.c.col}`);
        }
        
        // Validate target is a simple variable (not component property access)
        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for over> property at ${this.c.line}:${this.c.col}`);
        }
        
        properties.push({ property: 'over>', target: targetAtom, expr: null });
        continue; // Skip to next property
      }
      
      // Check for out> syntax (for shifter: out>= wireName)
      if(propName === 'out' && this.c.type === 'SYM' && this.c.value === '>'){
        this.eat('SYM', '>');
        
        // Optional '=' after '>'
        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }
        
        // Parse target as atom (wire/variable name)
        const targetAtom = this.atom();
        
        // Validate no bit ranges
        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in out> property at ${this.c.line}:${this.c.col}`);
        }
        
        // Validate target is a simple variable (not component property access)
        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for out> property at ${this.c.line}:${this.c.col}`);
        }
        
        properties.push({ property: 'out>', target: targetAtom, expr: null });
        continue; // Skip to next property
      }
      
      // Check for poutName>= syntax (for PCB instances: poutName >= wireName)
      if(this.c.type === 'SYM' && this.c.value === '>'){
        this.eat('SYM', '>');

        // Optional '=' after '>'
        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }

        // Parse target as atom (wire/variable name)
        const targetAtom = this.atom();

        // Validate no bit ranges
        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in ${propName}>= property at ${this.c.line}:${this.c.col}`);
        }

        // Validate target is a simple variable (not component property access)
        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for ${propName}>= property at ${this.c.line}:${this.c.col}`);
        }

        properties.push({ property: 'pout>', poutName: propName, target: targetAtom, expr: null });
        continue; // Skip to next property
      }

      this.eat('SYM', '=');
      
      const expr = this.expr();
      
      properties.push({ property: propName, expr });
    }
    
    this.eat('SYM', '}');
    
    return { 
      componentPropertyBlock: { 
        component: componentName, 
        properties 
      } 
    };
  }

assignment() {
  // Check for property block syntax: .component:{ ... }
  // We need to detect this BEFORE calling atom() because atom() would fail
  if (this.c.type === 'SYM' && this.c.value === '.') {
    // Peek ahead to see if this is a property block
    const savedPos = this.t.i;
    const savedLine = this.t.line;
    const savedCol = this.t.col;
    
    // Try to detect .component:{
    let i = this.t.i;
    const src = this.t.src;
    
    // Skip whitespace
    while (i < src.length && /\s/.test(src[i])) i++;
    
    // Check for component name
    if (i < src.length && /[a-zA-Z]/.test(src[i])) {
      // Skip component name
      while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) i++;
      
      // Skip whitespace
      while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
      
      // Check for :{
      if (i < src.length && src[i] === ':') {
        i++; // Skip ':'
        // Skip whitespace (but not newlines initially)
        while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
        
        if (i < src.length && src[i] === '{') {
          // This is a property block! Parse it manually.
          this.eat('SYM', '.'); // Eat the '.'
          
          const compName = '.' + this.c.value;
          this.eat('ID'); // Eat component name
          
          this.eat('SYM', ':'); // Eat the ':'
          
          return this.parsePropertyBlock(compName);
        }
      }
    }
  }
  
  // Parse assignment target as an atom (must be variable or slice)
  const targetAtom = this.atom();
  
  // Validate LHS
  if (!targetAtom.var) {
    throw Error(
      `Invalid assignment target at ${this.c.line}:${this.c.col}`
    );
  }
  
  this.eat('SYM', '=');
  
  const expr = this.expr();
  
  return {
    assignment: {
      target: targetAtom,
      expr
    }
  };
}

  assignment0(){
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
        throw Error(`Expected variable name at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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

  parseComp() {
    this.eat('KEYWORD', 'comp');
    this.eat('SYM', '[');

    // Component shortname mappings
    const componentShortnames = {
      '7': '7seg',
      '+': 'adder',
      '-': 'subtract',
      '*': 'multiplier',
      '/': 'divider',
      '>': 'shifter',
      '=': 'counter'
    };

    // Parse component type: led, switch, 7seg, dip, mem, counter, adder, subtract, divider, multiplier, shifter, rotary, or lcd
    // Also support shortnames: 7 for 7seg, + for adder, - for subtract, * for multiplier, / for divider, > for shifter, = for counter
    let compType = null;

    // Check for shortnames first (single character symbols)
    if(this.c.type === 'SYM' && componentShortnames[this.c.value]){
      compType = componentShortnames[this.c.value];
      this.eat('SYM');
    } else if(this.c.type === 'ID' && (this.c.value === 'led' || this.c.value === 'switch' || this.c.value === 'dip' || this.c.value === 'mem' || this.c.value === 'counter' || this.c.value === 'adder' || this.c.value === 'subtract' || this.c.value === 'divider' || this.c.value === 'multiplier' || this.c.value === 'shifter' || this.c.value === 'rotary' || this.c.value === 'lcd' || this.c.value === 'key')){
      compType = this.c.value;
      this.eat('ID');
    } else if(this.c.value === '7seg'){
      // 7seg might be parsed as TYPE or DEC because it starts with a digit
      compType = '7seg';
      this.eat(this.c.type); // Eat whatever type it was parsed as
    } else if(this.c.type === 'DEC' && this.c.value === '7'){
      // Shortname [7] for 7seg - might be parsed as DEC
      compType = '7seg';
      this.eat('DEC');
    } else {
      throw Error(`Expected 'led', 'switch', '7seg' (or '7'), 'dip', 'mem', 'counter' (or '='), 'adder' (or '+'), 'subtract' (or '-'), 'divider' (or '/'), 'multiplier' (or '*'), 'shifter' (or '>'), 'rotary', 'lcd', or 'key' after 'comp [' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    this.eat('SYM', ']');

    // Component bit width is no longer specified in syntax - it's derived from component type and attributes
    // Parse component name (must start with .)
    if (this.c.value !== '.') {
      throw Error(`Expected '.' but got ${this.c.type === 'TYPE' ? `type '${this.c.value}'` : `'${this.c.value}'`} at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    this.eat('SYM', '.');

    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected component name after '.' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const name = '.' + this.c.value;
    this.eat(this.c.type);

    // Skip whitespace
    this.t.skip();

    // Parse attributes block (text, color, square, nl, = value)
    const attributes = {};
    let initialValue = null;

    // If there's a ':' immediately after name, eat it (it's just a separator, not the end marker)
    // The end marker is the final ':' on its own line
    // Support for '::' syntax - means no attributes, use defaults
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');

      // Check for '::' - no attributes, component declaration is complete
      if (this.c.type === 'SYM' && this.c.value === ':') {
        this.eat('SYM', ':');

        // Parse optional return type after :: (e.g., ::4bit)
        let returnType = null;
        if (this.c.type === 'TYPE') {
          returnType = this.c.value;
          this.eat('TYPE');
        }

        return {
          comp: {
            type: compType,
            componentType: null,
            name: name,
            attributes: attributes,
            initialValue: initialValue,
            returnType: returnType
          }
        };
      }

      this.t.skip(); // Skip whitespace after first ':'
    }

    // Parse attributes - they can be on multiple lines
    // Continue until we find a standalone ':' on a line (end marker)
    let foundEndColon = false;

    while (this.c.type !== 'EOF' && !foundEndColon) {
      // Skip EOL tokens inside component declarations (components can span multiple lines)
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }
      
      this.t.skip();

      if (this.c.type === 'EOF') {
        break;
      }
      
      // Skip EOL tokens after skip() as well
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }

      //DO NOT REMOVE THIS LINE - used for debugging specific cases
      let debug = (this.c.value === 'nl' && this.c.line === 12); // Example condition to enable debug for specific case

      // Check for end marker ':' - must be on its own line (after whitespace and before newline/EOF)
      // OR followed by a TYPE (return type like :1bit)
      if (this.c.type === 'SYM' && this.c.value === ':') {
        // Save position before ':'
        const beforeColonLine = this.c.line;
        const beforeColonCol = this.c.col;

        // Eat the ':'
        this.eat('SYM', ':');

        // Skip whitespace after ':'
        this.t.skip();

        // Check if next is TYPE (return type like :1bit) - this is also an end marker
        if (this.c.type === 'TYPE') {
          foundEndColon = true;
          // Don't eat the TYPE here, it will be parsed after the loop
          break;
        }

        // Check if next token starts with '.' (component assignment) - this indicates we're past the component declaration
        // This is a strong indicator that ':' was the end marker
        if (this.c.type === 'SYM' && this.c.value === '.') {
          foundEndColon = true;
          break;
        }

        // ALWAYS check if ':' is followed by whitespace/newline and then a component assignment (starts with '.')
        // This is the most reliable check - if after ':' we have whitespace/newline and then '.', it's an end marker
        // This handles ALL cases, including "nl :" followed by ".s = c"
        let finalCheckI = this.t.i;
        let foundNewline = false;
        while (finalCheckI < this.t.src.length && (/\s/.test(this.t.src[finalCheckI]) || this.t.src[finalCheckI] === '\n')) {
          if (this.t.src[finalCheckI] === '\n') {
            foundNewline = true;
          }
          finalCheckI++;
        }
        // If we found a newline and next char is '.', it's definitely an end marker
        if (foundNewline && finalCheckI < this.t.src.length && this.t.src[finalCheckI] === '.') {
          foundEndColon = true;
          break;
        }
        // Also check if next non-whitespace character is '.' (even without newline, if ':' is on its own line)
        if (finalCheckI < this.t.src.length && this.t.src[finalCheckI] === '.') {
          foundEndColon = true;
          break;
        }

        // Check if we're on a new line after the colon (strong indicator of end marker)
        // This handles the case where ':' is followed by newline and then a component assignment
        if (this.c.line > beforeColonLine) {
          foundEndColon = true;
          break;
        }

        // Check if next is newline, EOF
        // This means ':' was standalone (end marker)
        if (this.c.type === 'EOF' || this.c.value === '\n') {
          foundEndColon = true;
          break;
        }

        // SPECIAL CASE: If ':' is on its own line (column is very small, like 1-5) and next token is not on same line
        // This is a strong indicator that ':' is an end marker
        // This handles the case where 'nl :' is on one line, and the next non-whitespace is '.'
        if (beforeColonCol <= 5) {
          // Check if next token after whitespace is on a different line
          let checkLine = beforeColonLine;
          let tempI = this.t.i;
          while (tempI < this.t.src.length && /\s/.test(this.t.src[tempI])) {
            if (this.t.src[tempI] === '\n') {
              checkLine++;
            }
            tempI++;
          }
          // If we're on a new line and next char is '.', it's an end marker
          if (checkLine > beforeColonLine && tempI < this.t.src.length && this.t.src[tempI] === '.') {
            foundEndColon = true;
            break;
          }
        }

        // Otherwise ':' was part of an attribute (like "text: value"), continue parsing
      }

      if (foundEndColon) {
        break;
      }

      // Parse attribute: text: "value" or color: ^value or square or nl or = value
      if (this.c.type === 'ID') {
        const attrName = this.c.value;
        this.eat('ID');

        const attributesWithNoValues = ['square', 'nl', 'circular', 'glow', 'rgb', 'noLabels'];
        
        // Check for for.X attributes (for rotary component state labels)
        // Tokenizer parses "for.0" as ID "for" followed by SYM "." followed by DEC "0"
        // So we need to check if attrName is "for" and next token is "."
        if (attrName === 'for' && this.c.type === 'SYM' && this.c.value === '.') {
          // Eat '.'
          this.eat('SYM', '.');
          
          // Next should be a number (state number)
          if (this.c.type !== 'DEC' && this.c.type !== 'BIN') {
            throw Error(`Expected state number after 'for.' at ${this.c.line}:${this.c.col}`);
          }
          
          const stateNum = parseInt(this.c.value, 10);
          if (isNaN(stateNum)) {
            throw Error(`Invalid state number in attribute 'for.${this.c.value}' at ${this.c.line}:${this.c.col}`);
          }
          
          // Eat the number token
          this.eat(this.c.type);
          
          // Check if next token is ':'
          if (this.c.type !== 'SYM' || this.c.value !== ':') {
            throw Error(`Expected ':' after 'for.${stateNum}' at ${this.c.line}:${this.c.col}`);
          }
          
          // Eat ':'
          this.eat('SYM', ':');
          
          // Find ':' position in source (the one we just ate)
          let colonPos = -1;
          for (let i = this.t.i - 1; i >= 0 && i >= this.t.i - 50; i--) {
            if (this.t.src[i] === ':') {
              colonPos = i;
              break;
            }
          }
          
          if (colonPos === -1) {
            this.c = this.t.get();
          } else {
            // Skip whitespace after ':'
            let checkI = colonPos + 1;
            while (checkI < this.t.src.length && (this.t.src[checkI] === ' ' || this.t.src[checkI] === '\t')) {
              checkI++;
            }
            
            // Parse string value
            if (checkI < this.t.src.length && (this.t.src[checkI] === '"' || this.t.src[checkI] === "'")) {
              const quote = this.t.src[checkI];
              let pos = checkI + 1;
              let strValue = '';
              let foundClosingQuote = false;
              
              while (pos < this.t.src.length) {
                const char = this.t.src[pos];
                
                if (char === '\n') {
                  throw Error(`Unclosed string literal starting at ${this.c.line}:${this.c.col} - newline found before closing quote`);
                }
                
                if (char === quote) {
                  foundClosingQuote = true;
                  pos++;
                  break;
                }
                
                strValue += char;
                pos++;
              }
              
              if (!foundClosingQuote) {
                throw Error(`Unclosed string literal starting at ${this.c.line}:${this.c.col}`);
              }
              
              // Update tokenizer position
              let tempLine = this.t.line;
              let tempCol = this.t.col;
              for (let i = checkI; i < pos; i++) {
                const char = this.t.src[i];
                if (char === '\n') {
                  tempLine++;
                  tempCol = 1;
                } else {
                  tempCol++;
                }
              }
              this.t.i = pos;
              this.t.line = tempLine;
              this.t.col = tempCol;
              
              // Store the label for this state
              if (!attributes.forLabels) {
                attributes.forLabels = {};
              }
              attributes.forLabels[stateNum] = strValue;
              
              // Update current token
              this.c = this.t.get();
              continue; // Skip to next attribute
            } else {
              // Fallback: use get()
              this.c = this.t.get();
            }
          }
        }

        if (this.c.value === ':' && !attributesWithNoValues.includes(attrName)) {
          
          // Eat ':' first
          this.eat('SYM', ':');
          
          // The tokenizer's get() calls skip() which stops at newlines and returns EOL
          // Instead, we need to manually parse the next token from source
          // Find ':' position in source
          let colonPos = -1;
          for (let i = this.t.i - 1; i >= 0 && i >= this.t.i - 50; i--) {
            if (this.t.src[i] === ':') {
              colonPos = i;
              break;
            }
          }
          
          if (colonPos === -1) {
            // Fallback: just use get() and hope for the best
            this.c = this.t.get();
          } else {
            // Skip whitespace after ':'
            let checkI = colonPos + 1;
            while (checkI < this.t.src.length && (this.t.src[checkI] === ' ' || this.t.src[checkI] === '\t')) {
              checkI++;
            }
            
            // Check for 7seg segment attributes (a, b, c, d, e, f, g, h) BEFORE parsing numeric values
            const segAttributes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            if (segAttributes.includes(attrName) && checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
              // Parse segment value (0 or 1)
              let numStr = '';
              while (checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
                numStr += this.t.src[checkI];
                checkI++;
              }
              
              const segValue = parseInt(numStr, 10);
              if (segValue !== 0 && segValue !== 1) {
                throw Error(`Segment ${attrName} value must be 0 or 1 at ${this.c.line}:${this.c.col}`);
              }
              
              // Store as string '0' or '1' for consistency
              if (!attributes.segments) {
                attributes.segments = {};
              }
              attributes.segments[attrName] = segValue.toString();
              
              // Advance tokenizer position past the number
              this.t.i = checkI;
              // Update column
              let tempCol = this.c.col;
              for (let i = colonPos + 1; i < checkI; i++) {
                tempCol++;
              }
              this.t.col = tempCol;
              
              // Update current token
              this.c = this.t.get();
              continue; // Skip to next attribute
            }
            
            // Check if next character is a digit (for DEC/BIN) or '^' (for HEX)
            if (checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
              // It's a number - parse it manually
              let numStr = '';
              while (checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
                numStr += this.t.src[checkI];
                checkI++;
              }
              
              // Determine if it's DEC or BIN
              let tokenType = 'DEC';
              if (/^[01]+$/.test(numStr)) {
                tokenType = 'BIN';
              }
              
              // Create token manually
              this.c = {
                type: tokenType,
                value: numStr,
                line: this.c.line,
                col: colonPos + 1,
                file: this.c.file
              };
              
              // Advance tokenizer position past the number
              this.t.i = checkI;
              // Update column
              this.t.col = this.c.col + numStr.length;
            } else if (checkI < this.t.src.length && this.t.src[checkI] === '^') {
              // It's HEX - use existing logic
              this.t.i = checkI;
              this.c = this.t.get();
            } else if (checkI < this.t.src.length && (this.t.src[checkI] === '"' || this.t.src[checkI] === "'")) {
              // It's a string literal - parse it directly from source
              const quote = this.t.src[checkI];
              let pos = checkI + 1; // Start after opening quote
              let strValue = '';
              let foundClosingQuote = false;
              
              // Read characters directly from source until we find the closing quote
              while (pos < this.t.src.length) {
                const char = this.t.src[pos];
                
                // Check for newline - stop parsing if we hit a newline
                if (char === '\n') {
                  throw Error(`Unclosed string literal starting at ${this.c.line}:${this.c.col} - newline found before closing quote`);
                }
                
                // Check for closing quote
                if (char === quote) {
                  foundClosingQuote = true;
                  pos++; // Skip the closing quote
                  break;
                }
                
                // Allow any character except newline
                strValue += char;
                pos++;
              }
              
              if (!foundClosingQuote) {
                throw Error(`Unclosed string literal starting at ${this.c.line}:${this.c.col}`);
              }
              
              // Update tokenizer position and line/col tracking
              let tempLine = this.t.line;
              let tempCol = this.t.col;
              for (let i = checkI; i < pos; i++) {
                const char = this.t.src[i];
                if (char === '\n') {
                  tempLine++;
                  tempCol = 1;
                } else {
                  tempCol++;
                }
              }
              
              // Update tokenizer position to after the closing quote
              this.t.i = pos;
              this.t.line = tempLine;
              this.t.col = tempCol;
              
              // Set the attribute value
              attributes[attrName] = strValue;
              
              // Update current token after parsing string
              this.c = this.t.get();
              continue; // Skip to next attribute
            } else {
              // Fallback: use get()
              this.c = this.t.get();
            }
          }
          
          // Parse attribute value
          // Note: 7seg segment attributes are handled above in the manual parsing section
          if (this.c.type === 'HEX') {
            // Color attribute: color: ^2ecc71
            attributes[attrName] = '#' + this.c.value;
            this.eat('HEX');
          } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
            // Numeric attribute (legacy support, but not used for square)
            attributes[attrName] = this.c.value;
            this.eat(this.c.type);
              } else if (this.c.type === 'SYM' && (this.c.value === '"' || this.c.value === "'")) {
                // String attribute: text: "PWR" or text: 'PWR'
                // Read directly from source to allow any character except newline and the closing quote
                const quote = this.c.value;
                
                // Find the quote position in source by searching backwards from current tokenizer position
                // The tokenizer has already parsed the quote, so we need to find where it was in source
                let quotePos = -1;
                // Search backwards to find the quote (it should be just before current position)
                for (let i = this.t.i - 1; i >= 0 && i >= this.t.i - 200; i--) {
                  if (this.t.src[i] === quote) {
                    quotePos = i;
                    break;
                  }
                }
                
                // If not found backwards, the tokenizer might not have advanced yet
                // Try searching from current position forward
                if (quotePos === -1) {
                  // Skip whitespace and look for quote
                  let checkPos = this.t.i;
                  while (checkPos < this.t.src.length && (this.t.src[checkPos] === ' ' || this.t.src[checkPos] === '\t')) {
                    checkPos++;
                  }
                  if (checkPos < this.t.src.length && this.t.src[checkPos] === quote) {
                    quotePos = checkPos;
                  }
                }
                
                if (quotePos === -1) {
                  // Last resort: use current position and assume quote is there
                  // This shouldn't happen, but handle it gracefully
                  quotePos = this.t.i;
                }
                
                // Eat the opening quote token (advances tokenizer)
                this.eat('SYM');
                
                // Start reading from after the opening quote
                let pos = quotePos + 1;
                let strValue = '';
                let foundClosingQuote = false;
                
                // Read characters directly from source until we find the closing quote
                while (pos < this.t.src.length) {
                  const char = this.t.src[pos];
                  
                  // Check for newline - stop parsing if we hit a newline
                  if (char === '\n') {
                    throw Error(`Unclosed string literal starting at ${this.c.line}:${this.c.col} - newline found before closing quote`);
                  }
                  
                  // Check for closing quote
                  if (char === quote) {
                    foundClosingQuote = true;
                    pos++; // Skip the closing quote
                    break;
                  }
                  
                  // Allow any character except newline
                  strValue += char;
                  pos++;
                }
                
                if (!foundClosingQuote) {
                  throw Error(`Unclosed string literal starting at ${this.c.line}:${this.c.col}`);
                }
                
                // Update tokenizer position and line/col tracking
                // We need to update tokenizer to point after the closing quote
                const startPos = quotePos + 1;
                
                // Update line/col for all characters read (including closing quote)
                let tempLine = this.t.line;
                let tempCol = this.t.col;
                for (let i = startPos; i < pos; i++) {
                  const char = this.t.src[i];
                  if (char === '\n') {
                    tempLine++;
                    tempCol = 1;
                  } else {
                    tempCol++;
                  }
                }
                
                // Update tokenizer position to after the closing quote
                this.t.i = pos;
                this.t.line = tempLine;
                this.t.col = tempCol;
                
                attributes[attrName] = strValue;
                // Update current token after parsing string
                this.c = this.t.get();
              } else {
                // Try to read as identifier or value until newline or colon
                let strValue = '';
                while (this.c.type !== 'EOF' && this.c.value !== '\n' && this.c.value !== ':' && this.c.type !== 'SYM') {
                  if (this.c.type === 'ID') {
                    strValue += this.c.value;
                    this.eat('ID');
                  } else {
                    break;
                  }
                }
                if (strValue) {
                  attributes[attrName] = strValue.trim();
                }
              }
        }
        else if (attrName === 'nl') {
          // nl attribute (no value)
          attributes.nl = true;
          // After 'nl', skip whitespace and check if next token is ':'
          this.t.skip();
          // If next token is ':', we need to check if it's an end marker
          if (this.c.type === 'SYM' && this.c.value === ':') {
            // Save position before ':'
            const nlColonLine = this.c.line;
            const nlColonCol = this.c.col;
            // Eat the ':'
            this.eat('SYM', ':');
            // Skip whitespace after ':'
            this.t.skip();
            // Check if ':' is followed by whitespace/newline and then a component assignment (starts with '.')
            let checkI = this.t.i;
            let foundNewline = false;
            while (checkI < this.t.src.length && (/\s/.test(this.t.src[checkI]) || this.t.src[checkI] === '\n')) {
              if (this.t.src[checkI] === '\n') {
                foundNewline = true;
              }
              checkI++;
            }
            // If we found a newline and next char is '.', it's definitely an end marker
            if (foundNewline && checkI < this.t.src.length && this.t.src[checkI] === '.') {
              foundEndColon = true;
              break;
            }
            // Also check if next non-whitespace character is '.' (even without newline, if ':' is on its own line)
            if (checkI < this.t.src.length && this.t.src[checkI] === '.') {
              foundEndColon = true;
              break;
            }
            // Check if we're on a new line after the colon
            if (this.c.line > nlColonLine) {
              foundEndColon = true;
              break;
            }
            // Check if next is newline, EOF
            if (this.c.type === 'EOF' || this.c.value === '\n') {
              foundEndColon = true;
              break;
            }
          }
        } else if (attrName === 'square') {
          // square attribute (no value) - makes LED square (round: 0)
          attributes.square = true;
        } else if (attrName === 'circular') {
          // circular attribute (no value) - makes shifter circular
          attributes.circular = true;
        } else if (attrName === 'glow') {
          // glow attribute (no value) - makes LED/7seg glow
          attributes.glow = true;
        } else if (attrName === 'rgb') {
          // rgb attribute (no value) - enables RGB mode for LCD
          attributes.rgb = true;
        } else if (attrName === 'noLabels') {
          // noLabels attribute (no value) - hides labels on DIP switch
          attributes.noLabels = true;
        } else {
          // Unknown attribute, skip
          continue;
        }
        } else if (this.c.value === '=') {
          // Initial value: = 0 or = 011011 or = variable
          this.eat('SYM', '=');
          this.t.skip();
          if (this.c.type === 'BIN') {
            initialValue = this.c.value;
            this.eat('BIN');
          } else if (this.c.type === 'DEC') {
            // Convert decimal to binary
            const dec = parseInt(this.c.value, 10);
            // Extract bit width from type (e.g., "1bit" -> 1)
            const typeMatch = type.match(/^(\d+)(bit|wire)$/);
            const bits = typeMatch ? parseInt(typeMatch[1]) : null;
            if (bits) {
              initialValue = dec.toString(2).padStart(bits, '0');
            } else {
              initialValue = this.c.value;
            }
            this.eat('DEC');
          } else if (this.c.type === 'ID' || this.c.type === 'SPECIAL') {
            // Variable reference - this should be handled as a separate assignment statement
            // We can't evaluate it here because variables might not be defined yet.
            // So we'll throw an error suggesting to use a separate assignment.
            throw Error(`Variable assignments after '=' in component declaration are not supported. Use a separate assignment statement like '.${name.substring(1)} = ${this.c.value}' after the component declaration.`);
          } else if (this.c.type === 'SYM' && this.c.value === '.') {
            // Component reference - this should be handled as a separate assignment statement
            throw Error(`Component assignments after '=' in component declaration are not supported. Use a separate assignment statement after the component declaration.`);
          } else {
            throw Error(`Expected binary or decimal value after '=' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
          }
        } else {
          // Skip unknown tokens (whitespace, newlines, etc.)
          if (this.c.type === 'SYM' && (this.c.value === '\n' || this.c.value === ' ' || this.c.value === '\t')) {
            this.eat(this.c.type);
          } else if (this.c.value !== ':') {
            // Skip other tokens that aren't ':'
            this.eat(this.c.type);
          }
        }
      }

      // Parse optional return type for switch: :1bit
      let returnType = null;
      if (this.c.type === 'TYPE') {
        returnType = this.c.value;
        this.eat('TYPE');
      }

      return {
        comp: {
          type: compType,
          componentType: null,  // No longer parsed from syntax - derived from type and attributes
          name: name,
          attributes: attributes,
          initialValue: initialValue,
          returnType: returnType
        }
      };
    }

  expr(){
    const p=[this.atom()];
    while(this.c.value==='+'){ this.eat('SYM','+'); p.push(this.atom()); }
    return p;
  }
  atom() {
    // Check for NOT prefix (!)
    let notPrefix = false;
    if (this.c.type === 'SYM' && this.c.value === '!') {
      this.eat('SYM', '!');
      notPrefix = true;
    }

    // Helper to add not flag to result
    const addNot = (result) => {
      if (notPrefix) {
        result.not = true;
      }
      return result;
    };

    // ---------- REF token with trailing "/length" (e.g. "&1.0" "/" "4") ----------
if (
  this.c.type === 'REF' &&
  this.c.value.includes('.') &&
  this.t.peek() === '/'
) {
  const full = this.c.value;   // "&1.0"
  this.eat('REF');

  this.eat('SYM', '/');

  if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
    throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
  }

  const len = parseInt(this.c.value, 10);
  this.eat(this.c.type);

  const body = full.slice(1);      // "1.0"
  const [idxStr, startStr] = body.split('.');

  const start = parseInt(startStr, 10);
  const end = start + len - 1;

  return addNot({
    refLiteral: idxStr,
    bitRange: { start, end }
  });
}
    // ---------- REF token that already contains slicing (e.g. "&1.0-10") ----------
if (this.c.type === 'REF' && this.c.value.includes('.')) {
  const full = this.c.value; // "&1.0-10"
  this.eat('REF');
  
  // Strip &
  const body = full.slice(1); // "1.0-10"
  
  const [idxStr, sliceStr] = body.split('.');
  const idx = idxStr;
  
  let start, end;
  
  if (sliceStr.includes('-')) {
    const [s, e] = sliceStr.split('-').map(Number);
    start = s;
    end = e;
  } else if (sliceStr.includes('/')) {
    const [s, len] = sliceStr.split('/').map(Number);
    start = s;
    end = s + len - 1;
  } else {
    start = Number(sliceStr);
    end = start;
  }
  
  return addNot({
    refLiteral: idx,
    bitRange: { start, end }
  });
}
  
  // -------------------------
  // Reference: &number
  // -------------------------
  if (this.c.type === 'REF' && this.c.value === '&') {
    this.eat('REF');
    
    if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
      throw Error(`Expected reference index after & at ${this.c.line}:${this.c.col}`);
    }
    
    const refIndex = this.c.value;
    this.eat(this.c.type);
    
    let bitRange = null;
    
    // -------------------------
    // Optional slicing: .start[-end] or .start/len
    // -------------------------
    if (this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit index after '.' at ${this.c.line}:${this.c.col}`);
      }
      
      const start = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      
      let end = start;
      
      if (this.c.value === '-') {
        this.eat('SYM', '-');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected end bit after '-' at ${this.c.line}:${this.c.col}`);
        }
        
        end = parseInt(this.c.value, 10);
        this.eat(this.c.type);
      }
      
      else if (this.c.value === '/') {
        this.eat('SYM', '/');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
        }
        
        const len = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        end = start + len - 1;
      }
      
      bitRange = { start, end };
    }
    
    return addNot({
      refLiteral: refIndex,
      bitRange
    });
  }
  
  
  // Literal reference like &0, &1.0
  if (this.c.type === 'REF' && this.c.value.startsWith('&')) {
    const v = this.c.value;
    this.eat('REF');
    return addNot({ refLiteral: v });
  }
  
  if (this.c.type === 'BIN') {
    const v = this.c.value;
    this.eat('BIN');
    return addNot({ bin: v });
  }
  
  if (this.c.type === 'HEX') {
    const v = this.c.value;
    this.eat('HEX');
    return addNot({ hex: v });
  }
  
  if (this.c.type === 'SPECIAL') {
    const v = this.c.value;
    this.eat('SPECIAL');
    
    // Check for bit range: $.0, $.0-1, $.0/4, etc.
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit number after '.' at ${this.c.line}:${this.c.col}`);
      }
      
      const start = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      
      let end = start;
      
      // Range: $.0-3
      if (this.c.type === 'SYM' && this.c.value === '-') {
        this.eat('SYM', '-');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected bit number after '-' at ${this.c.line}:${this.c.col}`);
        }
        
        end = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        
        return addNot({ var: v, bitRange: { start, end } });
      }
      
      // Length: $.0/4
      if (this.c.type === 'SYM' && this.c.value === '/') {
        this.eat('SYM', '/');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
        }
        
        const len = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        end = start + len - 1;
        
        return addNot({ var: v, bitRange: { start, end } });
      }
      
      // Single bit: $.0
      return addNot({ var: v, bitRange: { start, end } });
    }
    
    return addNot({ var: v });
  }
  
  // Builtin instructions that must be called
  if (this.c.type === 'REG' || this.c.type === 'MUX' || this.c.type === 'DEMUX') {
    const n = this.c.value;
    this.eat(this.c.type);
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.call({ name: n, alias: null }));
    }
    throw Error(`${n} must be called as a function at ${this.c.line}:${this.c.col}`);
  }
  
  // Component name (starts with .)
  if (this.c.type === 'SYM' && this.c.value === '.') {
    this.eat('SYM', '.');
    
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected component name after '.' at ${this.c.line}:${this.c.col}`);
    }
    
    const compName = '.' + this.c.value;
    this.eat(this.c.type);
    
    // Check for property access: .component:property
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      
      if (this.c.type !== 'ID') {
        throw Error(`Expected property name after ':' at ${this.c.line}:${this.c.col}`);
      }
      
      const property = this.c.value;
      this.eat('ID');
      
      return addNot({
        var: compName,
        property: property
      });
    }
    
    // Check for bit access: .power.0
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit number after '.' at ${this.c.line}:${this.c.col}`);
      }
      
      const start = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      
      let end = start;
      if (this.c.value === '-') {
        this.eat('SYM', '-');
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected bit number after '-' at ${this.c.line}:${this.c.col}`);
        }
        end = parseInt(this.c.value, 10);
        this.eat(this.c.type);
      } else if (this.c.value === '/') {
        this.eat('SYM', '/');
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
        }
        const len = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        end = start + len - 1;
      }
      
      return addNot({
        var: compName,
        bitRange: { start, end }
      });
    }
    
    return addNot({ var: compName });
  }
  
  // Identifier
  if (this.c.type === 'ID') {
    const name = this.c.value;
    this.eat('ID');
    
    // -------- ALIAS CALL: NAME@alias(...) --------
    if (this.c.type === 'SYM' && this.c.value === '@') {
      this.eat('SYM', '@');
      
      if (this.c.type !== 'ID') {
        throw Error(`Expected alias name after @ at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
      
      const alias = this.c.value;
      this.eat('ID');
      
      if (this.c.type !== 'SYM' || this.c.value !== '(') {
        throw Error(`Expected '(' after ${name}@${alias} at ${this.c.line}:${this.c.col}`);
      }
      
      return addNot(this.call({ name, alias }));
    }
    
    // -------- NORMAL FUNCTION CALL --------
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.call({ name, alias: null }));
    }
    
    // -------- BIT ACCESS: a.1 , a.1-3 , a.1/3 --------
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit number after '.' at ${this.c.line}:${this.c.col}`);
      }
      
      const start = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      
      // Range: a.1-3
      if (this.c.type === 'SYM' && this.c.value === '-') {
        this.eat('SYM', '-');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected bit number after '-' at ${this.c.line}:${this.c.col}`);
        }
        
        const end = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        
        return addNot({ var: name, bitRange: { start, end } });
      }
      
      // Length: a.1/3
      if (this.c.type === 'SYM' && this.c.value === '/') {
        this.eat('SYM', '/');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
        }
        
        const length = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        
        if (length < 1) {
          throw Error(`Length must be >= 1 at ${this.c.line}:${this.c.col}`);
        }
        
        const end = start + length - 1;
        return addNot({ var: name, bitRange: { start, end } });
      }
      
      // Single bit: a.1
      return addNot({ var: name, bitRange: { start, end: start } });
    }
    
    // -------- VARIABLE --------
    return addNot({ var: name });
  }
  
  throw Error(`Bad expression at ${this.c.line}:${this.c.col}`);
}

isBuiltinFunction(name) {
  if (name === 'show') return true;

  if (['NOT','AND','OR','XOR','NAND','NOR','LATCH'].includes(name)) {
    return true;
  }

  if (/^REG\d+$/.test(name)) return true;
  if (/^MUX[123]$/.test(name)) return true;
  if (/^DEMUX[123]$/.test(name)) return true;

  return false;
}

  call(fn){
  this.eat('SYM','(');

  const args=[];
  if(this.c.value!==')'){
    do{
      args.push(this.expr());
      if(this.c.value===',') this.eat('SYM',',');
      else break;
    }while(true);
  }

  this.eat('SYM',')');

  return { call: fn, args };
 }
 
 
}

/* ================= INTERPRETER ================= */

class Interpreter {
  constructor(funcs,out,pcbs=null){
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
    this.aliases = new Map();
    this.components=new Map(); // Component name -> {type, componentType, attributes, initialValue, returnType, ref, deviceIds}
    this.componentConnections=new Map(); // Component name -> {source: ref or expr, bitRange}
    this.componentPendingProperties=new Map(); // Component name -> {property: {expr, value}} - properties waiting to be applied
    this.componentPendingSet=new Map(); // Component name -> 'immediate' | 'next' - when to apply pending properties
    this.componentPropertyBlocks=[]; // Array of {component, properties, dependencies} - property blocks for re-execution
    
    // PCB support
    this.pcbDefinitions = pcbs || new Map(); // name -> { pins, pouts, exec, on, body, nextSection, returnSpec }
    this.pcbInstances = new Map(); // .instanceName -> { pcbName, pinStorage, poutStorage, internalPrefix, context }
    this.insidePcbBody = false; // Flag to track if we're executing inside a PCB body
    this.currentPcbInstance = null; // Current PCB instance name when inside PCB body
    
    // Initialize ~
    this.vars.set('~', {type: '1bit', value: '0', ref: null});
    
    // Initialize % (first run flag)
    this.firstRun = true; // Flag to track if this is the first run
    this.vars.set('%', {type: '1bit', value: '1', ref: null});
    
    // Initialize $ (random bit generator)
    // $ generates random bits at each NEXT(~)
    this.randomBitCache = new Map(); // Cache for random bits with ranges: 'default' or 'start-end' or 'start/length'
    this.generateRandomBit(); // Initialize with a random bit
    
    this.cycle=1;
  }

  getBitWidth(type){
    if(!type) return null;
    const m = type.match(/^(\d+)(bit|wire)$/);
    return m ? parseInt(m[1]) : null;
  }

  // Get bit width for component based on type and attributes
  getComponentBits(compType, attributes){
    switch(compType){
      case 'led':
      case 'switch':
      case 'key':
        return 1;
      case '7seg':
      case 'lcd':
        return 8;
      case 'dip':
        // Use 'length' attribute, default 4
        return attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 4;
      case 'counter':
      case 'adder':
      case 'subtract':
      case 'multiplier':
      case 'divider':
      case 'shifter':
      case 'mem':
        // Use 'depth' attribute, default 4
        return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      case 'rotary':
        // Calculate from 'states' attribute, default 8 states -> 3 bits
        const states = attributes['states'] !== undefined ? parseInt(attributes['states'], 10) : 8;
        return Math.ceil(Math.log2(states));
      default:
        return 4; // Default fallback
    }
  }

  isWire(type){
    return type && type.endsWith('wire');
  }
  
  isBuiltinREG(name) {
    if (/^REG\d+$/.test(name)) return true;
  }
  
  isBuiltinMUX(name) {
    if (/^MUX[123]$/.test(name)) return true;
  }
  
  isBuiltinDEMUX(name) {
    if (/^DEMUX[123]$/.test(name)) return true;
  }
  
  isBuiltinFunction(name) {
    if (name === 'show') return true;
  
    if (['NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'LATCH'].includes(name)) {
      return true;
    }
  
  return this.isBuiltinREG(name) 
    || this.isBuiltinMUX(name) 
    || this.isBuiltinDEMUX(name);
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

  // Set a value at a reference (update existing storage)
  setValueAtRef(refStr, value){
    if(!refStr || refStr === '&-') return false;
    
    // Extract storage index from ref like &0, &1, etc.
    const match = refStr.match(/^&(\d+)/);
    if(!match) return false;
    
    const idx = parseInt(match[1]);
    const stored = this.storage.find(s => s.index === idx);
    if(stored){
      stored.value = value;
      return true;
    }
    return false;
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

  generateRandomBit(){
    // Generate a single random bit (0 or 1) for default $
    const bit = Math.random() < 0.5 ? '0' : '1';
    this.randomBitCache.set('default', bit);
  }
  
  generateRandomBits(numBits){
    // Generate multiple random bits
    let bits = '';
    for(let i = 0; i < numBits; i++){
      bits += Math.random() < 0.5 ? '0' : '1';
    }
    return bits;
  }
  
  getRandomBitsForRange(bitRange){
    // Get random bits for a specific bit range
    if(!bitRange){
      // No bit range, return single random bit
      if(!this.randomBitCache.has('default')){
        this.generateRandomBit();
      }
      return this.randomBitCache.get('default');
    }
    
    // Calculate number of bits from range
    const {start, end} = bitRange;
    const actualEnd = end !== undefined && end !== null ? end : start;
    const numBits = Math.abs(actualEnd - start) + 1;
    
    // Generate random bits for this range
    const cacheKey = `${start}-${actualEnd}`;
    if(!this.randomBitCache.has(cacheKey)){
      this.randomBitCache.set(cacheKey, this.generateRandomBits(numBits));
    }
    return this.randomBitCache.get(cacheKey);
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
    // Handle NOT prefix - if present, evaluate without it and then invert the result
    if(a.not){
      const atomWithoutNot = {...a};
      delete atomWithoutNot.not;
      const result = this.evalAtom(atomWithoutNot, computeRefs, varName);

      // Apply NOT to the result value (invert all bits)
      if(result.value && result.value !== '-'){
        const invertedValue = result.value.split('').map(bit =>
          bit === '0' ? '1' : bit === '1' ? '0' : bit
        ).join('');
        result.value = invertedValue;

        // For NOT results, the original ref is no longer valid
        // Store the new value and create a new ref if computeRefs is true
        if(computeRefs){
          const idx = this.storeValue(invertedValue);
          result.ref = `&${idx}`;
        } else {
          result.ref = null;
        }
      }
      return result;
    }

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
      
      if(a.var === '%'){
        // % is 1 only during first run, 0 afterwards
        const value = this.firstRun ? '1' : '0';
        return {value: value, ref: null, varName: '%'};
      }
      
      if(a.var === '$'){
        // $ generates random bits
        // Support bit range: $.0, $.2-5, $.0/4, etc.
        const randomBits = this.getRandomBitsForRange(a.bitRange);
        const bitWidth = randomBits.length;
        return {value: randomBits, ref: null, varName: '$', bitWidth: bitWidth};
      }
      
      // Check if it's a component (starts with .)
      if(a.var.startsWith('.')){
        // First check if it's a PCB instance
        const pcbInstance = this.pcbInstances.get(a.var);
        if(pcbInstance){
          // PCB instance access
          if(a.property){
            // Check if it's a pout (output)
            const poutInfo = pcbInstance.poutStorage.get(a.property);
            if(poutInfo){
              const val = this.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits);
              return {value: val, ref: poutInfo.ref, varName: `${a.var}:${a.property}`, bitWidth: poutInfo.bits};
            }
            
            // Check if it's a pin (input) - can also read pins
            const pinInfo = pcbInstance.pinStorage.get(a.property);
            if(pinInfo){
              const val = this.getValueFromRef(pinInfo.ref) || '0'.repeat(pinInfo.bits);
              return {value: val, ref: pinInfo.ref, varName: `${a.var}:${a.property}`, bitWidth: pinInfo.bits};
            }
            
            throw Error(`Unknown property '${a.property}' for PCB instance ${a.var}. Available: ${[...pcbInstance.pinStorage.keys(), ...pcbInstance.poutStorage.keys()].join(', ')}`);
          } else {
            // Access PCB instance directly - return value based on returnSpec
            const returnSpec = pcbInstance.def.returnSpec;
            if(returnSpec){
              // Return the specified variable
              const pinInfo = pcbInstance.pinStorage.get(returnSpec.varName);
              const poutInfo = pcbInstance.poutStorage.get(returnSpec.varName);
              const info = pinInfo || poutInfo;
              if(info){
                const val = this.getValueFromRef(info.ref) || '0'.repeat(returnSpec.bits);
                return {value: val, ref: info.ref, varName: a.var, bitWidth: returnSpec.bits};
              }
            }
            // No return spec or variable not found - return empty
            return {value: '', ref: null, varName: a.var};
          }
        }
        
        const comp = this.components.get(a.var);
        if(comp){
          // Check if it's a property access (e.g., .component:get)
          if(a.property){
            if(comp.type === 'mem' && a.property === 'get'){
              // Memory get property: .ram:get
              const memId = comp.deviceIds[0];
              const pending = this.componentPendingProperties.get(a.var);
              const setWhen = this.componentPendingSet.get(a.var);
              
              // Get current address from pending.at
              // IMPORTANT: Always re-evaluate the address expression to get current value
              let address = 0;
              if(pending && pending.at){
                let addressValue = pending.at.value;
                
                // Re-evaluate the expression to get current value from references
                if(pending.at.expr){
                  const exprResult = this.evalExpr(pending.at.expr, false);
                  addressValue = '';
                  for(const part of exprResult){
                    if(part.value && part.value !== '-'){
                      addressValue += part.value;
                    } else if(part.ref && part.ref !== '&-'){
                      const val = this.getValueFromRef(part.ref);
                      if(val) addressValue += val;
                    }
                  }
                }
                
                address = parseInt(addressValue, 2);
              }
              
              // Get value from memory
              // IMPORTANT: If :set = ~ was executed, don't read pending.data.value
              // Only read from actual memory, not from pending properties that haven't been applied yet
              let val = null;
              if(typeof getMem === 'function'){
                val = getMem(memId, address);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default
              if(val === null || val === undefined){
                val = comp.initialValue || '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'counter' && a.property === 'get'){
              // Counter get property: .c:get
              const counterId = comp.deviceIds[0];
              
              // Get value from counter
              let val = null;
              if(typeof getCounter === 'function'){
                val = getCounter(counterId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default
              if(val === null || val === undefined){
                val = comp.initialValue || '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'rotary' && a.property === 'get'){
              // Rotary get property: .rot:get
              // Get value from component's ref (storage)
              let val = null;
              if(comp.ref){
                val = this.getValueFromRef(comp.ref);
              }
              
              // Get bit width
              // For rotary:get, use calculatedBits (number of bits needed to represent states)
              const states = comp.attributes['states'] !== undefined ? parseInt(comp.attributes['states'], 10) : 8;
              const calculatedBits = Math.ceil(Math.log2(states));
              const actualBits = calculatedBits; // Always use calculatedBits for rotary:get
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(actualBits);
              } else {
                // Ensure value has correct length (calculatedBits, not componentType bits)
                if(val.length < actualBits){
                  val = val.padStart(actualBits, '0');
                } else if(val.length > actualBits){
                  val = val.substring(0, actualBits);
                }
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: actualBits};
            } else if(comp.type === 'adder' && a.property === 'get'){
              // Adder get property: .add:get
              const adderId = comp.deviceIds[0];
              
              // Get value from adder
              let val = null;
              if(typeof getAdder === 'function'){
                val = getAdder(adderId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'adder' && a.property === 'carry'){
              // Adder carry property: .add:carry
              const adderId = comp.deviceIds[0];
              
              // Get carry value from adder
              let val = null;
              if(typeof getAdderCarry === 'function'){
                val = getAdderCarry(adderId);
              }
              
              // If no value, use default (0)
              if(val === null || val === undefined){
                val = '0';
              }
              
              return {value: val, ref: null, varName: `${a.var}:carry`, bitWidth: 1};
            } else if(comp.type === 'subtract' && a.property === 'get'){
              // Subtract get property: .sub:get
              const subtractId = comp.deviceIds[0];
              
              // Get value from subtract
              let val = null;
              if(typeof getSubtract === 'function'){
                val = getSubtract(subtractId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'subtract' && a.property === 'carry'){
              // Subtract carry property: .sub:carry
              const subtractId = comp.deviceIds[0];
              
              // Get carry value from subtract
              let val = null;
              if(typeof getSubtractCarry === 'function'){
                val = getSubtractCarry(subtractId);
              }
              
              // If no value, use default (0)
              if(val === null || val === undefined){
                val = '0';
              }
              
              return {value: val, ref: null, varName: `${a.var}:carry`, bitWidth: 1};
            } else if(comp.type === 'divider' && a.property === 'get'){
              // Divider get property: .div:get
              const dividerId = comp.deviceIds[0];
              
              // Get value from divider
              let val = null;
              if(typeof getDivider === 'function'){
                val = getDivider(dividerId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'divider' && a.property === 'mod'){
              // Divider mod property: .div:mod
              const dividerId = comp.deviceIds[0];
              
              // Get mod value from divider
              let val = null;
              if(typeof getDividerMod === 'function'){
                val = getDividerMod(dividerId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:mod (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:mod.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:mod`, bitWidth: depth};
            } else if(comp.type === 'multiplier' && a.property === 'get'){
              // Multiplier get property: .mul:get
              const multiplierId = comp.deviceIds[0];
              
              // Get value from multiplier
              let val = null;
              if(typeof getMultiplier === 'function'){
                val = getMultiplier(multiplierId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'multiplier' && a.property === 'over'){
              // Multiplier over property: .mul:over
              const multiplierId = comp.deviceIds[0];
              
              // Get overflow value from multiplier
              let val = null;
              if(typeof getMultiplierOver === 'function'){
                val = getMultiplierOver(multiplierId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:over (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:over.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:over`, bitWidth: depth};
            } else if(comp.type === 'shifter' && a.property === 'get'){
              // Shifter get property: .sh:get
              const shifterId = comp.deviceIds[0];
              
              // Get value from shifter
              let val = null;
              if(typeof getShifter === 'function'){
                val = getShifter(shifterId);
              }
              
              // Get depth for bitWidth
              const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
              
              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = '0'.repeat(depth);
              }
              
              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }
              
              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth};
            } else if(comp.type === 'shifter' && a.property === 'out'){
              // Shifter out property: .sh:out
              const shifterId = comp.deviceIds[0];
              
              // Get out value from shifter
              let val = null;
              if(typeof getShifterOut === 'function'){
                val = getShifterOut(shifterId);
              }
              
              // If no value, use default (0)
              if(val === null || val === undefined){
                val = '0';
              }
              
              return {value: val, ref: null, varName: `${a.var}:out`, bitWidth: 1};
            } else if(comp.type === 'led' && a.property === 'get'){
              // LED get property: .led:get
              // Return current value from storage
              let val = null;
              if(comp.ref && comp.ref !== '&-'){
                val = this.getValueFromRef(comp.ref);
              }

              // Get bit width from component type and attributes
              const bits = this.getComponentBits(comp.type, comp.attributes) || 1;

              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = comp.initialValue || '0'.repeat(bits);
              }

              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }

              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits};
            } else if((comp.type === 'switch' || comp.type === 'dip' || comp.type === 'key') && a.property === 'get'){
              // Switch/DIP/Key get property: return current value from storage
              let val = null;
              if(comp.ref && comp.ref !== '&-'){
                val = this.getValueFromRef(comp.ref);
              }

              // Get bit width from component type and attributes
              const bits = this.getComponentBits(comp.type, comp.attributes) || 1;

              // If no value, use default (all zeros)
              if(val === null || val === undefined){
                val = comp.initialValue || '0'.repeat(bits);
              }

              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }

              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: bits};
            } else if(comp.type === '7seg' && a.property === 'get'){
              // 7seg get property: return 8-bit segment pattern (a-h)
              // Use lastSegmentValue stored on the component
              let val = comp.lastSegmentValue || '00000000';

              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }

              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: 8};
            } else if(comp.type === 'lcd' && a.property === 'get'){
              // LCD get property: return 8-bit last character value
              // Use lastCharValue stored on the component
              let val = comp.lastCharValue || '00000000';

              // Handle bit range if specified
              if(a.bitRange){
                const {start, end} = a.bitRange;
                const actualEnd = end !== undefined && end !== null ? end : start;
                if(start < 0 || actualEnd >= val.length || start > actualEnd){
                  throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var}:get (length: ${val.length})`);
                }
                const extracted = val.substring(start, actualEnd + 1);
                const bitWidth = actualEnd - start + 1;
                const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
                return {value: extracted, ref: null, varName: `${a.var}:get.${varNameSuffix}`, bitWidth: bitWidth};
              }

              return {value: val, ref: null, varName: `${a.var}:get`, bitWidth: 8};
            } else {
              // Other properties are not valid in expressions
              throw Error(`Property ${a.property} cannot be used in expressions for component ${a.var}`);
            }
          }
          
          // Component found - get its value from ref
          let val = null;
          let ref = comp.ref;

          if(ref && ref !== '&-'){
            val = this.getValueFromRef(ref);
          }
          
          // If component has no value yet, use initial value or default to 0
          if(val === null){
            if(comp.initialValue){
              val = comp.initialValue;
            } else {
              const bits = this.getComponentBits(comp.type, comp.attributes);
              val = bits ? '0'.repeat(bits) : '0';
            }
          }
          
          // Handle bit range if specified
          if(a.bitRange){
            const {start, end} = a.bitRange;
            const actualEnd = end !== undefined && end !== null ? end : start;
            if(val === null || val === '-'){
              const bitWidth = actualEnd - start + 1;
              const zeros = '0'.repeat(bitWidth);
              const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
              return {value: zeros, ref: null, varName: `${a.var}.${varNameSuffix}`, bitWidth: bitWidth};
            }
            if(start < 0 || actualEnd >= val.length || start > actualEnd){
              throw Error(`Invalid bit range ${start}-${actualEnd} for ${a.var} (length: ${val.length})`);
            }
            const extracted = val.substring(start, actualEnd + 1);
            const bitWidth = actualEnd - start + 1;
            const varNameSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
            const refSuffix = start === actualEnd ? `${start}` : `${start}-${actualEnd}`;
            return {value: extracted, ref: ref ? `${ref}.${refSuffix}` : null, varName: `${a.var}.${varNameSuffix}`, bitWidth: bitWidth};
          }
          
          return {value: val, ref: ref, varName: a.var};
        }
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
/*
if (a.refLiteral) {
  const idx = parseInt(a.refLiteral, 10);
  const stored = this.storage.find(s => s.index === idx);

  if (!stored || stored.value == null) {
    return { value: '-', ref: null };
  }

  let val = stored.value;

  // -------------------------
  // Apply slicing if present
  // -------------------------
  if (a.bitRange) {
    const { start, end } = a.bitRange;

    if (
      start < 0 ||
      end >= val.length ||
      start > end
    ) {
      return { value: '-', ref: null };
    }

    val = val.substring(start, end + 1);

    return {
      value: val,
      bitWidth: end - start + 1,
      varName:
        start === end
          ? `&${idx}.${start}`
          : `&${idx}.${start}-${end}`
    };
  }

  // -------------------------
  // Whole reference
  // -------------------------
  return {
    value: val,
    bitWidth: val.length,
    varName: `&${idx}`
  };
}*/
if (a.refLiteral) {
  console.log('[evalAtom refLiteral]', a.refLiteral, a.bitRange, this.storage);
  
 // const idx = parseInt(a.refLiteral, 10);
const idx = parseInt(
  a.refLiteral.startsWith('&') ? a.refLiteral.slice(1) : a.refLiteral,
  10
);
  const stored = this.storage.find(s => s.index === idx);
  
  if (!stored || stored.value == null) {
    return { value: '-', bitWidth: null, varName: `&${idx}` };
  }
  
  let val = stored.value;
  
  if (a.bitRange) {
    const { start, end } = a.bitRange;
    
    if (start < 0 || end >= val.length || start > end) {
      return { value: '-', bitWidth: null, varName: `&${idx}` };
    }
    
    val = val.substring(start, end + 1);
    
    return {
      value: val,
      bitWidth: end - start + 1,
      varName: `&${idx}.${start === end ? start : `${start}-${end}`}`
    };
  }
  
  return {
    value: val,
    bitWidth: val.length,
    varName: `&${idx}`
  };
}    
    
    
    if(a.call) return this.call(a.call, a.args, computeRefs);
  }
  call(fn, args, computeRefs = false) {
  const { name, alias } = fn;

  const b = x => x === '1';

  // ================= Evaluate arguments =================
  const argValues = args.map(x => {
    const r = this.evalExpr(x, computeRefs);
    return r.map(p => {
      if (p.ref && p.ref !== '&-') {
        const v = this.getValueFromRef(p.ref);
        if (v != null) return v;
      }
      return p.value ?? '-';
    }).join('');
  });

  // ================= BUILTIN: LOGIC GATES =================
  if (name === 'NOT') {
    const v = b(argValues[0]) ? '0' : '1';
    return computeRefs
      ? { value: v, ref: `&${this.storeValue(v)}` }
      : { value: v, ref: null };
  }

  if (name === 'AND' || name === 'OR' || name === 'XOR' ||
      name === 'NAND' || name === 'NOR') {

    const a = b(argValues[0]);
    const b2 = b(argValues[1]);

    let v;
    switch (name) {
      case 'AND':  v = a && b2; break;
      case 'OR':   v = a || b2; break;
      case 'XOR':  v = a ^  b2; break;
      case 'NAND': v = !(a && b2); break;
      case 'NOR':  v = !(a || b2); break;
    }

    v = v ? '1' : '0';
    return computeRefs
      ? { value: v, ref: `&${this.storeValue(v)}` }
      : { value: v, ref: null };
  }

  // ================= BUILTIN: REGn =================
  if (this.isBuiltinREG(name)) {
    const width = parseInt(name.slice(3), 10);

    if (argValues.length !== 3) {
      throw Error(`REG${width} expects 3 arguments`);
    }

    const data  = argValues[0];
    const clock = argValues[1];
    const clear = argValues[2];

    let output = '0'.repeat(width);

    if (this.currentStmt && this.regPendingMap?.has(this.currentStmt)) {
      output = this.regPendingMap.get(this.currentStmt);
    }

    let next = clear === '1' ? '0'.repeat(width) : data;

    if (this.currentStmt) {
      if (!this.regPendingMap) this.regPendingMap = new Map();
      this.regPendingMap.set(this.currentStmt, next);
    }

    return computeRefs
      ? { value: output, ref: `&${this.storeValue(output)}` }
      : { value: output, ref: null };
  }

  // ================= BUILTIN: MUXn =================
  if (this.isBuiltinMUX(name)) {
    const selBits = parseInt(name.slice(3), 10);
    const inputs = 1 << selBits;

    if (argValues.length !== 1 + inputs) {
      throw Error(`${name} expects ${1 + inputs} arguments`);
    }

    const sel = parseInt(argValues[0], 2);
    const value = argValues[1 + sel];

    return computeRefs
      ? { value, ref: `&${this.storeValue(value)}` }
      : { value, ref: null };
  }

  // ================= BUILTIN: DEMUXn =================
  if (this.isBuiltinDEMUX(name)) {
    const selBits = parseInt(name.slice(5), 10);
    const outputs = 1 << selBits;

    if (argValues.length !== 2) {
      throw Error(`${name} expects 2 arguments`);
    }

    const sel = parseInt(argValues[0], 2);
    const data = argValues[1];

    const res = Array(outputs).fill('0'.repeat(data.length));
    res[sel] = data;

    return res.map(v =>
      computeRefs
        ? { value: v, ref: `&${this.storeValue(v)}` }
        : { value: v, ref: null }
    );
  }

  // ================= USER FUNCTIONS =================
  let funcs = this.funcs;

  // Alias resolution
  if (alias) {
    if (!this.aliases || !this.aliases.has(alias)) {
      throw Error(`Unknown alias ${alias}`);
    }
    funcs = this.aliases.get(alias);
  }

  if (!funcs.has(name)) {
    throw Error(`Function ${name} is not local; use ${name}@alias(...)`);
  }

  const f = funcs.get(name);

  if (argValues.length !== f.params.length) {
    throw Error(`Bad arity for ${name}`);
  }

  const local = new Interpreter(this.funcs, this.out, this.pcbDefinitions);
  local.aliases = this.aliases;
  local.storage = this.storage;
  local.nextIndex = this.nextIndex;
  local.pcbInstances = this.pcbInstances;

  f.params.forEach((p, i) => {
    local.vars.set(p.id, {
      type: p.type,
      value: argValues[i],
      ref: null
    });
  });

  for (const s of f.body) {
    local.exec(s, computeRefs);
  }

  if (!f.returns.length) {
    return { value: '', ref: null };
  }

  const results = [];
  for (const r of f.returns) {
    const parts = local.evalExpr(r.expr, computeRefs);
    for (const p of parts) results.push(p);
  }

  this.nextIndex = local.nextIndex;
  return results;
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
          //console.log('[show part]', part);
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
          
          if (part.isRef) {
  // Dereference
  const v = this.getValueFromRef(part.ref);
  let valueStr = (v == null) ? '-' : v;

  // 🔥 FORMAT: slice ALWAYS wins
  if (valueStr !== '-') {
    if (part.bitWidth) {
      // Slice width has absolute priority
      valueStr = this.formatValue(valueStr, part.bitWidth);
    } else if (displayType) {
      const bw = this.getBitWidth(displayType);
      if (bw) {
        valueStr = this.formatValue(valueStr, bw);
      }
    }
  }

 /* if (displayName && displayType) {
    results.push(`${displayName} (${displayType}) = ${valueStr}`);
  } else {
    results.push(valueStr);
  }*/
  if (displayName && displayType) {
  // Try to find a reference for named variables / wires
  let refStr = '';

  const wire = this.wires.get(displayName);
  const variable = this.vars.get(displayName);
  const ref = wire?.ref ?? variable?.ref;

  if (ref && ref !== '&-') {
    refStr = ` (ref: ${ref})`;
  }

  results.push(`${displayName} (${displayType}) = ${valueStr}${refStr}`);
} else {
  results.push(valueStr);
}
} else {
  // ---------- Normal value ----------
  let valueStr = part.value !== null ? part.value : '-';

  // 🔥 FORMAT: slice ALWAYS wins
  if (valueStr !== '-') {
    if (part.bitWidth) {
      // Slice width has absolute priority
      valueStr = this.formatValue(valueStr, part.bitWidth);
    } else if (displayType) {
      const bw = this.getBitWidth(displayType);
      if (bw) {
        valueStr = this.formatValue(valueStr, bw);
      }
    }
  }

  /*if (displayName && displayType) {
    results.push(`${displayName} (${displayType}) = ${valueStr}`);
  } else {
    results.push(valueStr);
  }*/
  if (displayName && displayType) {
  // Try to find a reference for named variables / wires
  let refStr = '';

  const wire = this.wires.get(displayName);
  const variable = this.vars.get(displayName);
  const ref = wire?.ref ?? variable?.ref;

  if (ref && ref !== '&-') {
    refStr = ` (ref: ${ref})`;
  }

  results.push(`${displayName} (${displayType}) = ${valueStr}${refStr}`);
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

    if(s.comp){
      // Component declaration: comp [led] .power: ...
      this.execComp(s.comp);
      return;
    }

    if(s.pcbInstance){
      // PCB instance: pcb [name] .var::
      this.execPcbInstance(s.pcbInstance);
      return;
    }

    if(s.componentPropertyBlock){
      // Property block: .component:{ property1 = expr1 \n property2 = expr2 \n ... }
      const { component, properties } = s.componentPropertyBlock;
      
      // Collect all dependencies from all expressions in the block
      const allDependencies = new Set();
      const allWireDependencies = new Set();
      let setExpr = null;
      let initialSetValue = null;
      let setExprDirectRef = null; // Direct component/wire referenced in setExpr
      
      for(const prop of properties){
        // Skip get> properties when collecting dependencies (they don't have expr)
        if(prop.property !== 'get>' && prop.property !== 'mod>' && prop.property !== 'carry>' && prop.property !== 'over>' && prop.property !== 'out>'){
          this.collectExprDependencies(prop.expr, allDependencies, allWireDependencies);
        }
        
        // Check if this property is 'set' and capture the expression
        if(prop.property === 'set'){
          setExpr = prop.expr;
          
          // Extract direct reference from setExpr (the component/wire that triggers this block)
          if(setExpr.length === 1){
            const atom = setExpr[0];
            if(atom.var && !atom.var.startsWith('.')){
              // Direct wire reference
              setExprDirectRef = { type: 'wire', name: atom.var };
            } else if(atom.var && atom.var.startsWith('.')){
              // Direct component reference
              setExprDirectRef = { type: 'component', name: atom.var };
            }
          }
          
          // Evaluate initial value for edge detection
          if(setExpr.length === 1 && setExpr[0].var === '~'){
            initialSetValue = '~';
          } else {
            const exprResult = this.evalExpr(setExpr, false);
            initialSetValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                initialSetValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) initialSetValue += val;
              }
            }
            // If no value was found, default to '0'
            if(initialSetValue === ''){
              initialSetValue = '0';
            }
          }
        }
      }
      
      // Extract getTarget if present
      let getTargetAtom = null;
      for(const prop of properties){
        if(prop.property === 'get>'){
          getTargetAtom = prop.target;
          break;
        }
      }
      
      // Get onMode from component attributes (default: 'raise' for rising edge)
      const comp = this.components.get(component);
      const onMode = comp && comp.attributes && comp.attributes.on ? String(comp.attributes.on) : 'raise';
      
      // Store the block for re-execution when dependencies change
      // BUT NOT when we're inside a PCB body (PCB internal blocks are executed inline)
      if(!this.insidePcbBody){
        const blockIndex = this.componentPropertyBlocks.length; // Unique index for this block
        this.componentPropertyBlocks.push({
          component,
          properties,
          dependencies: allDependencies,
          wireDependencies: allWireDependencies,
          setExpr: setExpr,
          setExprDirectRef: setExprDirectRef, // What directly triggers this block
          lastSetValue: initialSetValue,
          onMode: onMode,
          getTarget: getTargetAtom,  // Store get> target if present
          blockIndex: blockIndex // Add unique identifier
        });
      }
      
      // Execute properties in order (first run)
      // BUT: If component has on:1, only execute if set evaluates to 1
      // If component has on:raise/edge, don't execute on first run (wait for edge)
      let shouldExecuteFirstRun = true;
      if(onMode === '1' || onMode === 'level'){
        // Level triggered: only execute if set is 1
        if(setExpr){
          // initialSetValue should be evaluated above, but ensure it's not null
          const setBit = (initialSetValue && initialSetValue.length > 0) ? initialSetValue[initialSetValue.length - 1] : '0';
          shouldExecuteFirstRun = (setBit === '1');
        } else {
          // No set property, execute normally
          shouldExecuteFirstRun = true;
        }
      } else {
        // Edge triggered (raise/edge): don't execute on first run, wait for edge
        shouldExecuteFirstRun = false;
      }
      
      if(shouldExecuteFirstRun){
        this.executePropertyBlock(component, properties, false);
      }
      // Note: lastSetValue is already set in the block structure above (initialSetValue)
      // So even if block doesn't execute, lastSetValue is set correctly
      return;
    }

    if(s.next !== undefined){
      // NEXT(~) or NEXT(~, count) - recompute wire values
      // Set firstRun to false when NEXT is executed (first run is over)
      if(this.firstRun){
        this.firstRun = false;
        this.vars.set('%', {type: '1bit', value: '0', ref: null});
      }
      
      const count = s.next || 1;
      for(let i = 0; i < count; i++){
        this.cycle++;
        
        // Clear and regenerate random bits for $ at each NEXT(~)
        this.randomBitCache.clear();
        this.generateRandomBit();
        
        // Apply pending component properties marked for 'next' iteration (only on first iteration)
        if(i === 0){
          for(const [compName, when] of this.componentPendingSet.entries()){
            if(when === 'next'){
              this.applyComponentProperties(compName, 'immediate', true);
            }
          }
          
          // Re-execute property blocks that have pending 'next' properties
          // This includes blocks with set = ~ (which should execute at every NEXT(~))
          // Also includes blocks where set depends on ~ or $ (directly or indirectly through wires)
          // BUT: If block has wire dependencies that depend on $, defer to after wire updates
          for(const block of this.componentPropertyBlocks){
            const pendingWhen = this.componentPendingSet.get(block.component);
            // Check if block has set = ~ (setExpr is exactly ~)
            const hasSetTilde = block.setExpr && block.setExpr.length === 1 && block.setExpr[0].var === '~';
            // Check if set expression depends on ~ (directly or indirectly through wires)
            const setDependsOnTilde = block.setExpr && this.exprDependsOnTilde(block.setExpr);
            // Check if set expression depends on $ (random bits)
            const setDependsOnRandom = block.setExpr && this.exprDependsOnRandom(block.setExpr);
            
            if(pendingWhen === 'next' || hasSetTilde || setDependsOnTilde || setDependsOnRandom){
              // Check if any wire dependencies depend on $ (need to defer execution)
              let hasRandomWireDeps = false;
              if(block.wireDependencies && block.wireDependencies.size > 0){
                for(const wireName of block.wireDependencies){
                  // Check if this wire depends on $
                  const ws = this.wireStatements.find(ws => {
                    if(ws.assignment) return ws.assignment.target.var === wireName;
                    if(ws.decls) return ws.decls.some(d => d.name === wireName);
                    return false;
                  });
                  if(ws){
                    const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
                    if(wireExpr && this.exprDependsOnRandom(wireExpr)){
                      hasRandomWireDeps = true;
                      break;
                    }
                  }
                }
              }
              
              // If has wire dependencies on $, skip for now (will execute after wire updates)
              if(hasRandomWireDeps){
                continue;
              }
              
              // Re-execute the entire block with re-evaluation
              this.executePropertyBlock(block.component, block.properties, true);
              
              // After executing property block, update connections for the component itself
              // This ensures wires that reference the component are updated
              this.updateComponentConnections(block.component);
            }
          }
        }
        
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
                  // Special variables that change at each NEXT are not simple literals
                  if(atom.var === '$' || atom.var === '~' || atom.var === '%'){
                    isSimpleLiteral = false;
                    break;
                  }
                  // Function calls, regular variables, or refs are not simple literals
                  if(atom.call || atom.var || atom.ref){
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
        
        // Now execute property blocks that were deferred (have wire dependencies on $)
        for(const block of this.componentPropertyBlocks){
          const hasSetTilde = block.setExpr && block.setExpr.length === 1 && block.setExpr[0].var === '~';
          const setDependsOnTilde = block.setExpr && this.exprDependsOnTilde(block.setExpr);
          const setDependsOnRandom = block.setExpr && this.exprDependsOnRandom(block.setExpr);
          
          if(hasSetTilde || setDependsOnTilde || setDependsOnRandom){
            // Check if has wire dependencies on $ (was deferred)
            let hasRandomWireDeps = false;
            if(block.wireDependencies && block.wireDependencies.size > 0){
              for(const wireName of block.wireDependencies){
                const ws = this.wireStatements.find(ws => {
                  if(ws.assignment) return ws.assignment.target.var === wireName;
                  if(ws.decls) return ws.decls.some(d => d.name === wireName);
                  return false;
                });
                if(ws){
                  const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
                  if(wireExpr && this.exprDependsOnRandom(wireExpr)){
                    hasRandomWireDeps = true;
                    break;
                  }
                }
              }
            }
            
            // Execute only if was deferred (has random wire deps)
            if(hasRandomWireDeps){
              this.executePropertyBlock(block.component, block.properties, true);
              this.updateComponentConnections(block.component);
            }
          }
        }
        
        // Check wire-triggered property blocks for rising edge
        // Check all blocks that have setExpr (they will be selectively executed based on their trigger)
        for(const block of this.componentPropertyBlocks){
          // First check: blocks with setExpr and setExprDirectRef (wire/component triggered)
          if(block.setExpr && block.setExprDirectRef){
            // Skip if set expression is ~ (handled separately)
            if(block.setExpr.length === 1 && block.setExpr[0].var === '~'){
              continue;
            }
            
            // Re-evaluate the set expression
            const exprResult = this.evalExpr(block.setExpr, false);
            let newSetValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                newSetValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) newSetValue += val;
              }
            }
            
            // Get last bit of new and previous values
            const newBit = newSetValue.length > 0 ? newSetValue[newSetValue.length - 1] : '0';
            const prevBit = block.lastSetValue && block.lastSetValue.length > 0 ? 
                           block.lastSetValue[block.lastSetValue.length - 1] : '0';
            
            // Determine if we should execute based on onMode
            let shouldExecute = false;
            const onMode = block.onMode || 'raise';
            
            if(onMode === 'raise' || onMode === 'rising'){
              // Rising edge: 0 -> 1
              shouldExecute = (prevBit === '0' && newBit === '1');
            } else if(onMode === 'edge' || onMode === 'falling'){
              // Falling edge: 1 -> 0
              shouldExecute = (prevBit === '1' && newBit === '0');
            } else if(onMode === '1' || onMode === 'level'){
              // Level triggered: execute when set is 1
              shouldExecute = (newBit === '1');
            }
            
            if(shouldExecute){
              this.executePropertyBlock(block.component, block.properties, true);
            }
            
            // Always update lastSetValue (even if block didn't execute)
            block.lastSetValue = newSetValue;
          }
          // Second check: blocks with constant set (like set = 1) but with wire dependencies
          // These should re-execute when their wire dependencies change (especially if they depend on $ or %)
          else if(block.setExpr && !block.setExprDirectRef){
            // Check if this is a constant set (like set = 1)
            const isConstantSet = block.setExpr.length === 1 && 
              (block.setExpr[0].bin || block.setExpr[0].hex || block.setExpr[0].dec);
            
            // Check if block has wire dependencies that depend on special vars ($ or %)
            if(isConstantSet && block.wireDependencies && block.wireDependencies.size > 0){
              let hasSpecialVarWireDeps = false;
              for(const wireName of block.wireDependencies){
                const ws = this.wireStatements.find(ws => {
                  if(ws.assignment) return ws.assignment.target.var === wireName;
                  if(ws.decls) return ws.decls.some(d => d.name === wireName);
                  return false;
                });
                if(ws){
                  const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
                  if(wireExpr && this.exprDependsOnSpecialVars(wireExpr)){
                    hasSpecialVarWireDeps = true;
                    break;
                  }
                }
              }
              
              // If has special var wire deps, check if we should execute based on constant set value
              if(hasSpecialVarWireDeps){
                // Evaluate the constant set expression
                const exprResult = this.evalExpr(block.setExpr, false);
                let setValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    setValue += part.value;
                  }
                }
                
                const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
                const onMode = block.onMode || 'raise';
                
                // For on:1, execute if set is 1
                if((onMode === '1' || onMode === 'level') && setBit === '1'){
                  this.executePropertyBlock(block.component, block.properties, true);
                }
              }
            }
          }
        }
      }
      
      // Execute PCB ~~ sections for instances that were triggered
      for(const [instanceName, instance] of this.pcbInstances){
        if(instance.pendingNextSection){
          this.executePcbBody(instanceName, instance.def.nextSection, true);
          instance.pendingNextSection = false; // Reset flag after execution
        }
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

if (s.assignment) {
  const { target, expr } = s.assignment;
  const name = target.var;
  const range = target.bitRange || null;
  const property = target.property || null;

  // Check if it's a PCB instance first
  if (this.pcbInstances.has(name)) {
    const instance = this.pcbInstances.get(name);
    
    if(property){
      // PCB pin/pout assignment: .instance:pin = value or .instance:pout = value
      const pinInfo = instance.pinStorage.get(property);
      const poutInfo = instance.poutStorage.get(property);
      
      if(pinInfo){
        // Assign to input pin
        const exprResult = this.evalExpr(expr, computeRefs);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
        
        // Pad/trim to correct bit width
        if(value.length < pinInfo.bits){
          value = value.padStart(pinInfo.bits, '0');
        } else if(value.length > pinInfo.bits){
          value = value.substring(value.length - pinInfo.bits);
        }
        
        // Store the value
        this.setValueAtRef(pinInfo.ref, value);
        
        // Check if this is the exec trigger
        if(property === instance.def.exec){
          // Get the last bit for edge detection
          const newBit = value[value.length - 1] || '0';
          const prevBit = instance.lastExecValue || '0';
          
          let shouldExecute = false;
          const onMode = instance.def.on || 'raise';
          
          if(onMode === 'raise' || onMode === 'rising'){
            shouldExecute = (prevBit === '0' && newBit === '1');
          } else if(onMode === 'edge' || onMode === 'falling'){
            shouldExecute = (prevBit === '1' && newBit === '0');
          } else if(onMode === '1' || onMode === 'level'){
            shouldExecute = (newBit === '1');
          }
          
          if(shouldExecute){
            this.executePcbBody(name, instance.def.body, false);
            // Mark that ~~ section should be executed at NEXT(~)
            if(instance.def.nextSection && instance.def.nextSection.length > 0){
              instance.pendingNextSection = true;
            }
          }
          
          instance.lastExecValue = newBit;
        }
        return;
      } else if(poutInfo){
        // Assignment to output pin (less common but allowed)
        const exprResult = this.evalExpr(expr, computeRefs);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
        
        if(value.length < poutInfo.bits){
          value = value.padStart(poutInfo.bits, '0');
        } else if(value.length > poutInfo.bits){
          value = value.substring(value.length - poutInfo.bits);
        }
        
        this.setValueAtRef(poutInfo.ref, value);
        return;
      } else {
        throw Error(`Unknown property '${property}' for PCB instance ${name}`);
      }
    } else {
      // Direct assignment to PCB instance (if no property)
      throw Error(`Cannot assign directly to PCB instance ${name}. Use ${name}:pinName = value`);
    }
  }

  // Check if it's a component first
  if (this.components.has(name)) {
    const comp = this.components.get(name);
    
    // Check if it's a property assignment: .component:property = value
    if(property){
      // Handle property assignments
      if(property === 'set'){
        // .component:set = value
        // Store the expression for re-evaluation when dependencies change
        // Special handling: if expr is exactly [SPECIAL '~'], treat it as '~' not as variable value
        let value = '';
        if(expr.length === 1 && expr[0].var === '~'){
          // Expression is exactly ~ (special variable)
          value = '~';
        } else {
          // Evaluate expression normally
          const exprResult = this.evalExpr(expr, computeRefs);
          // Get the value (should be 1 for immediate, or ~ for next iteration)
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
        }
        
        // Store as pending property with expression for re-evaluation
        if(!this.componentPendingProperties.has(name)){
          this.componentPendingProperties.set(name, {});
        }
        const pending = this.componentPendingProperties.get(name);
        pending[property] = {
          expr: expr, // Store expression for re-evaluation
          value: value // Store current value
        };
        
        // Check if value is '~' (next iteration) or '1' (immediate)
        if(value === '~' || value === '1'){
          // Mark when to apply properties
          const when = value === '~' ? 'next' : 'immediate';
          this.componentPendingSet.set(name, when);
          // Apply pending properties (if immediate, apply now; if next, just mark)
          this.applyComponentProperties(name, when);
        } else {
          // Value is not '1' or '~', but we still store it for re-evaluation
          // This allows .c:set = .on to work, where .on can be '0' or '1'
          // We'll check the value in applyComponentProperties
          // Mark as 'immediate' so it can be re-evaluated when dependencies change
          this.componentPendingSet.set(name, 'immediate');
          // Apply pending properties to check if value is '1'
          this.applyComponentProperties(name, 'immediate');
        }
      } else {
        // Other property assignments: .component:hex = value, etc.
        // Store as pending property with expression (will be applied when :set = 1 is executed)
        // Store both the expression (for re-evaluation) and current value
        const exprResult = this.evalExpr(expr, computeRefs);
        // Get the value
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
        
        // Store pending property with expression for re-evaluation
        if(!this.componentPendingProperties.has(name)){
          this.componentPendingProperties.set(name, {});
        }
        const pending = this.componentPendingProperties.get(name);
        pending[property] = {
          expr: expr, // Store expression for re-evaluation
          value: value // Store current value
        };
        
        // For adder, apply .a and .b properties immediately
        if(comp && comp.type === 'adder' && (property === 'a' || property === 'b')){
          const adderId = comp.deviceIds[0];
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(property === 'a' && typeof setAdderA === 'function'){
            setAdderA(adderId, binValue);
          } else if(property === 'b' && typeof setAdderB === 'function'){
            setAdderB(adderId, binValue);
          }
        }
        
        // For LCD, store properties (x, y, rowlen, data, clear) - will be applied when :set = 1
        // No immediate application needed for LCD properties
        
        // For subtract, apply .a and .b properties immediately
        if(comp && comp.type === 'subtract' && (property === 'a' || property === 'b')){
          const subtractId = comp.deviceIds[0];
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(property === 'a' && typeof setSubtractA === 'function'){
            setSubtractA(subtractId, binValue);
          } else if(property === 'b' && typeof setSubtractB === 'function'){
            setSubtractB(subtractId, binValue);
          }
        }
        
        // For divider, apply .a and .b properties immediately
        if(comp && comp.type === 'divider' && (property === 'a' || property === 'b')){
          const dividerId = comp.deviceIds[0];
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(property === 'a' && typeof setDividerA === 'function'){
            setDividerA(dividerId, binValue);
          } else if(property === 'b' && typeof setDividerB === 'function'){
            setDividerB(dividerId, binValue);
          }
        }
        
        // For multiplier, apply .a and .b properties immediately
        if(comp && comp.type === 'multiplier' && (property === 'a' || property === 'b')){
          const multiplierId = comp.deviceIds[0];
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = value;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Apply immediately
          if(property === 'a' && typeof setMultiplierA === 'function'){
            setMultiplierA(multiplierId, binValue);
          } else if(property === 'b' && typeof setMultiplierB === 'function'){
            setMultiplierB(multiplierId, binValue);
          }
        }
        
        // For shifter, apply .value, .dir, and .in properties immediately
        if(comp && comp.type === 'shifter' && (property === 'value' || property === 'dir' || property === 'in')){
          const shifterId = comp.deviceIds[0];
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          if(property === 'value'){
            // Ensure value has correct length
            let binValue = value;
            if(binValue.length < depth){
              binValue = binValue.padStart(depth, '0');
            } else if(binValue.length > depth){
              binValue = binValue.substring(0, depth);
            }
            
            // Apply immediately
            if(typeof setShifterValue === 'function'){
              setShifterValue(shifterId, binValue);
            }
          } else if(property === 'dir'){
            // Direction: 1 = right, 0 = left
            const dirValue = parseInt(value, 2);
            if(typeof setShifterDir === 'function'){
              setShifterDir(shifterId, dirValue);
            }
          } else if(property === 'in'){
            // Input bit: '0' or '1'
            const inValue = value.length > 0 ? value[value.length - 1] : '0'; // Take last bit if multiple bits
            if(typeof setShifterIn === 'function'){
              setShifterIn(shifterId, inValue);
            }
          }
        }
      }
      
      return;
    }
    
    // Regular component assignment: .power = a.0
    // Memory and counter components cannot be assigned to directly
    if(comp.type === 'mem'){
      throw Error(`Cannot assign a value to a mem component. Use :at, :data, and :set properties instead.`);
    }
    if(comp.type === 'counter'){
      throw Error(`Cannot assign a value to a counter component. Use :dir, :data, and :set properties instead.`);
    }
    
    // Components with returnType (switches) cannot be assigned to
    if(comp.returnType){
      throw Error(`Component ${name} has return type and cannot be assigned to`);
    }
    
    const exprResult = this.evalExpr(expr, computeRefs);
    
    // Build reference from expression
    const bits = this.getComponentBits(comp.type, comp.attributes);
    const ref = this.buildRefFromParts(exprResult, bits, 0);
    
    // Store connection info - store the expression parts for re-evaluation
    this.componentConnections.set(name, {
      source: ref,
      bitRange: range,
      expr: expr // Store expression for re-evaluation
    });
    
    // Update component's ref and display
    if(ref && ref !== '&-'){
      // Get value from reference
      const value = this.getValueFromRef(ref);
      if(value !== null){
        // Update component display
        this.updateComponentValue(name, value, range);
        
        // Store reference for future updates
        comp.ref = ref;
      } else {
        // Reference doesn't have value yet, but store it anyway
        comp.ref = ref;
      }
    }
    
    return;
  }

  // Resolve variable or wire
  let entry, isWire = false;

  if (this.wires.has(name)) {
    entry = this.wires.get(name);
    isWire = true;
  } else if (this.vars.has(name)) {
    entry = this.vars.get(name);
  } else {
    throw Error(`Undefined ${name}`);
  }

  const bitWidth = this.getBitWidth(entry.type);
  let currentValue;

  // Read current value
  if (isWire) {
    currentValue = this.getValueFromRef(entry.ref);
    if (!currentValue) {
      currentValue = '0'.repeat(bitWidth);
    }
  } else {
    currentValue = entry.value;
  }

  // Evaluate RHS
  const exprResult = this.evalExpr(expr, computeRefs);
  let rhs = '';

  for (const part of exprResult) {
    if (part.ref) {
      const v = this.getValueFromRef(part.ref);
      if (v) rhs += v;
    } else if (part.value) {
      rhs += part.value;
    }
  }

  // Determine slice
  let start, end;
  if (range) {
    start = range.start;
    end = range.end ?? range.start;
  } else {
    start = 0;
    end = bitWidth - 1;
  }

  const sliceWidth = end - start + 1;

  if (rhs.length !== sliceWidth) {
    throw Error(
      `Bit-width mismatch: assigning ${rhs.length} bits to ${sliceWidth}-bit slice ${name}.${start}-${end}`
    );
  }

  // Construct new value
  const newValue =
    currentValue.substring(0, start) +
    rhs +
    currentValue.substring(end + 1);

  // Store result
  if (isWire) {
    // STRICT check
    if (this.mode === 'STRICT' && entry.ref !== null && entry.ref !== '&-') {
      throw Error(`Cannot reassign wire ${name} in STRICT mode`);
    }

    let idx;
    if (entry.ref && entry.ref.startsWith('&')) {
      idx = parseInt(entry.ref.slice(1));
      const stored = this.storage.find(s => s.index === idx);
      if (stored) {
        stored.value = newValue;
      } else {
        idx = this.storeValue(newValue);
      }
    } else {
      idx = this.storeValue(newValue);
    }

    entry.ref = `&${idx}`;
    
    // Update connected components
    this.updateConnectedComponents(name, newValue);
  } else {
    // Variable (immutable unless slice)
    const idx = this.storeValue(newValue);
    this.vars.set(name, {
      type: entry.type,
      value: newValue,
      ref: `&${idx}`
    });
    
    // Update connected components
    this.updateConnectedComponents(name, newValue);
  }

  return;
}
/*
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
    }*/

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

      if(d.name === '%'){
        // Skip assignment for % (special read-only variable)
        bitOffset += bits;
        continue;
      }

      if(d.name === '$'){
        // Skip assignment for $ (special random variable)
        bitOffset += bits;
        continue;
      }

      if(d.name === '_'){
        // Skip assignment for _ (wildcard)
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
      
      if(d.name === '_' || d.name === '~' || d.name === '%' || d.name === '$') {
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

  execComp(comp){
    // Execute component declaration: comp [led] .power: ...
    const {type, componentType, name, attributes, initialValue, returnType} = comp;
    let dipRef = null; // For DIP switches
    let switchRef = null; // For switches, store the output reference
    let rotaryRef = null; // For rotary knobs, store the output reference
    let keyRef = null; // For keys, store the output reference
    
    // Calculate bits from component type and attributes (componentType is now null)
    const bits = this.getComponentBits(type, attributes);
    if(!bits){
      throw Error(`Invalid component type ${type} for component ${name}`);
    }
    
    // Generate unique ID for component
    const baseId = name.substring(1); // Remove leading '.'
    const deviceIds = [];
    
    if(type === 'led'){
      // Create LED(s) - if bits > 1, create multiple LEDs
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const color = attributes.color || '#ff0000';
      const square = attributes.square || false;
      const nl = attributes.nl || false;
      
      const value = initialValue || '0'.repeat(bits);
      
      for(let i = 0; i < bits; i++){
        const ledId = bits === 1 ? baseId : `${baseId}.${i + 1}`;
        const ledValue = value[i] === '1';
        const isLast = (i === bits - 1);
        
        // Only add text to first LED
        const ledText = (i === 0) ? text : '';
        const ledNl = (isLast && nl) ? true : false;
        
        if(typeof addLed === 'function'){
          const ledParams = {
            id: ledId,
            text: ledText,
            color: color,
            value: ledValue,
            nl: ledNl
          };
          // Only add round attribute if square is true
          if(square){
            ledParams.round = 0;
          }
          addLed(ledParams);
        }
        
        deviceIds.push(ledId);
      }
    } else if(type === 'switch'){
      // Create switch
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const nl = attributes.nl || false;
      const value = initialValue ? (initialValue[0] === '1') : false;
      
      // Create storage for switch output (always create storage for switches)
      const switchInitialValue = initialValue || '0';
      const storageIdx = this.storeValue(switchInitialValue);
      switchRef = `&${storageIdx}`;
      
      // Create onChange handler that will update connected references
      const switchId = baseId;
      const onChange = (checked) => {
        // Update the component's value in storage
        const compInfo = this.components.get(name);
        if(compInfo && compInfo.ref){
          const storageIdx = parseInt(compInfo.ref.substring(1));
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = checked ? '1' : '0';
            // Update all connected components
            this.updateComponentConnections(name);
            showVars();
          }
        }
      };
      
      if(typeof addSwitch === 'function'){
        addSwitch({
          text: text,
          value: value,
          nl: nl,
          onChange: onChange
        });
      }
      
      deviceIds.push(switchId);
    } else if(type === 'dip'){
      // Create DIP switch
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const nl = attributes.nl || false;
      const noLabels = attributes.noLabels || false;
      const visual = attributes.visual !== undefined ? parseInt(attributes.visual, 10) : 0;
      const count = bits; // Number of switches = bit width
      
      // Parse initial value: convert binary string to array of booleans
      let initial = [];
      if(initialValue){
        // initialValue is a binary string like "10100101"
        for(let i = 0; i < initialValue.length && i < count; i++){
          initial.push(initialValue[i] === '1');
        }
      }
      // Pad with false if needed
      while(initial.length < count){
        initial.push(false);
      }
      
      // Create storage for DIP switch output
      const dipInitialValue = initialValue || '0'.repeat(count);
      const storageIdx = this.storeValue(dipInitialValue);
      dipRef = `&${storageIdx}`;
      
      // Create onChange handler that will update connected references
      const dipId = baseId;
      const onChange = (index, checked) => {
        // Update the component's value in storage
        const compInfo = this.components.get(name);
        if(compInfo && compInfo.ref){
          const storageIdx = parseInt(compInfo.ref.substring(1));
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            // Update the bit at the given index
            let currentValue = stored.value || '0'.repeat(count);
            // Ensure value has correct length
            if(currentValue.length < count){
              currentValue = currentValue.padEnd(count, '0');
            } else if(currentValue.length > count){
              currentValue = currentValue.substring(0, count);
            }
            // Update the bit
            const bits = currentValue.split('');
            bits[index] = checked ? '1' : '0';
            stored.value = bits.join('');
            // Update all connected components
            this.updateComponentConnections(name);
            showVars();
          }
        }
      };
      
      if(typeof addDipSwitch === 'function'){
        addDipSwitch({
          id: dipId,
          text: text,
          count: count,
          initial: initial,
          nl: nl,
          noLabels: noLabels,
          visual: visual,
          onChange: onChange
        });
      }
      
      deviceIds.push(dipId);
    } else if(type === 'key'){
      // Create key (momentary button)
      const label = attributes.label !== undefined ? String(attributes.label) : '';
      const size = attributes.size !== undefined ? parseInt(attributes.size, 10) : 36;
      const nl = attributes.nl || false;
      
      // Create storage for key output (1 bit) - keys start unpressed
      const keyInitialValue = '0';
      const storageIdx = this.storeValue(keyInitialValue);
      keyRef = `&${storageIdx}`;
      
      const keyId = baseId;
      
      // Create onPress handler (sets to 1 immediately)
      // Capture keyRef directly in closure
      const onPress = (pressedLabel) => {
        const keyStorageIdx = parseInt(keyRef.substring(1));
        const stored = this.storage.find(s => s.index === keyStorageIdx);
        if(stored){
          stored.value = '1';
          this.updateComponentConnections(name);
          showVars();
        }
      };
      
      // Create onRelease handler (sets to 0 after pressDuration)
      // Capture keyRef directly in closure
      const onRelease = () => {
        const keyStorageIdx = parseInt(keyRef.substring(1));
        const stored = this.storage.find(s => s.index === keyStorageIdx);
        if(stored){
          stored.value = '0';
          this.updateComponentConnections(name);
          showVars();
        }
      };
      
      if(typeof addKey === 'function'){
        addKey({
          id: keyId,
          label: label,
          size: size,
          nl: nl,
          onPress: onPress,
          onRelease: onRelease
        });
      }
      
      deviceIds.push(keyId);
      // keyRef will be assigned to compInfo.ref later
    } else if(type === '7seg'){
      // Create 7-segment display
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const color = attributes.color || '#ff0000';
      const nl = attributes.nl || false;
      
      // Build initial value from segment attributes if present, otherwise use initialValue or default
      let segInitialValue = initialValue || '0'.repeat(bits);
      if(attributes.segments){
        // Build 8-bit value from segment attributes (a, b, c, d, e, f, g, h)
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const segArray = segInitialValue.split('');
        for(let i = 0; i < segments.length; i++){
          const segName = segments[i];
          if(attributes.segments[segName] !== undefined){
            segArray[i] = attributes.segments[segName];
          }
        }
        segInitialValue = segArray.join('');
      }
      
      const segId = baseId;
      
      if(typeof addSevenSegment === 'function'){
        const segParams = {
          id: segId,
          text: text,
          color: color,
          values: segInitialValue,
          nl: nl
        };
        addSevenSegment(segParams);
      }
      
      // Apply segment attributes if present (after component is created)
      if(attributes.segments && typeof setSegment === 'function'){
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for(const segName of segments){
          if(attributes.segments[segName] !== undefined){
            const segValue = attributes.segments[segName] === '1';
            setSegment(segId, segName, segValue);
          }
        }
      }
      
      deviceIds.push(segId);
    } else if(type === 'mem'){
      // Create memory component
      // Use bracket notation to avoid conflict with JavaScript's built-in 'length' property
      //console.log('[DEBUG] mem attributes:', JSON.stringify(attributes));
      const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 3;
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      //console.log('[DEBUG] mem parsed length:', length, 'depth:', depth);
      const defaultValue = initialValue || '0'.repeat(depth);
      
      // Validate default value length matches depth
      if(defaultValue.length !== depth){
        throw Error(`Memory default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
      }
      
      // Validate length and depth are positive
      if(length <= 0 || depth <= 0){
        throw Error(`Memory length and depth must be positive for component ${name}`);
      }
      
      const memId = baseId;
      
      if(typeof addMem === 'function'){
        addMem({
          id: memId,
          length: length,
          depth: depth,
          default: defaultValue
        });
      }
      
      deviceIds.push(memId);
      // Memory components don't have a ref (they can't be assigned to directly)
    } else if(type === 'counter'){
      // Create counter component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      const defaultValue = initialValue || '0'.repeat(depth);
      
      // Validate default value length matches depth
      if(defaultValue.length !== depth){
        throw Error(`Counter default value length (${defaultValue.length}) must match depth (${depth}) for component ${name}`);
      }
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Counter depth must be positive for component ${name}`);
      }
      
      const counterId = baseId;
      
      if(typeof addCounter === 'function'){
        addCounter({
          id: counterId,
          depth: depth,
          default: defaultValue
        });
      }
      
      deviceIds.push(counterId);
      // Counter components don't have a ref (they can't be assigned to directly)
    } else if(type === 'adder'){
      // Create adder component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Adder depth must be positive for component ${name}`);
      }
      
      const adderId = baseId;
      
      if(typeof addAdder === 'function'){
        addAdder({
          id: adderId,
          depth: depth
        });
      }
      
      deviceIds.push(adderId);
      // Adder components don't have a ref (they can't be assigned to directly)
    } else if(type === 'subtract'){
      // Create subtract component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Subtract depth must be positive for component ${name}`);
      }
      
      const subtractId = baseId;
      
      if(typeof addSubtract === 'function'){
        addSubtract({
          id: subtractId,
          depth: depth
        });
      }
      
      deviceIds.push(subtractId);
      // Subtract components don't have a ref (they can't be assigned to directly)
    } else if(type === 'divider'){
      // Create divider component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Divider depth must be positive for component ${name}`);
      }
      
      const dividerId = baseId;
      
      if(typeof addDivider === 'function'){
        addDivider({
          id: dividerId,
          depth: depth
        });
      }
      
      deviceIds.push(dividerId);
      // Divider components don't have a ref (they can't be assigned to directly)
    } else if(type === 'multiplier'){
      // Create multiplier component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Multiplier depth must be positive for component ${name}`);
      }
      
      const multiplierId = baseId;
      
      if(typeof addMultiplier === 'function'){
        addMultiplier({
          id: multiplierId,
          depth: depth
        });
      }
      
      deviceIds.push(multiplierId);
      // Multiplier components don't have a ref (they can't be assigned to directly)
    } else if(type === 'shifter'){
      // Create shifter component
      const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
      const circular = attributes['circular'] !== undefined;
      
      // Validate depth is positive
      if(depth <= 0){
        throw Error(`Shifter depth must be positive for component ${name}`);
      }
      
      const shifterId = baseId;
      
      if(typeof addShifter === 'function'){
        addShifter({
          id: shifterId,
          depth: depth,
          circular: circular
        });
      }
      
      deviceIds.push(shifterId);
      // Shifter components don't have a ref (they can't be assigned to directly)
    } else if(type === 'rotary'){
      // Create rotary knob component
      const text = attributes.text !== undefined ? String(attributes.text) : '';
      const states = attributes.states !== undefined ? parseInt(attributes.states, 10) : 8;
      const color = attributes.color || '#6dff9c';
      const nl = attributes.nl || false;
      
      // Extract forLabels if present (for.X attributes)
      const forLabels = attributes.forLabels || {};
      
      // Validate states is positive and at least 2
      if(states < 2){
        throw Error(`Rotary states must be at least 2 for component ${name}`);
      }
      
      // Calculate bit width from states
      const calculatedBits = Math.ceil(Math.log2(states));
      // Use the bit width from component type if specified, otherwise use calculated
      const actualBits = bits || calculatedBits;
      
      // Create storage for rotary knob output
      const rotaryInitialValue = initialValue || '0'.repeat(actualBits);
      const storageIdx = this.storeValue(rotaryInitialValue);
      const rotaryRef = `&${storageIdx}`;
      
      // Create onChange handler that will update connected references
      const rotaryId = baseId;
      // Store rotaryRef in a variable that will be accessible in onChange
      const onChange = (binValue) => {
        // Use the stored rotaryRef directly instead of getting it from compInfo
        // This ensures it works even if compInfo.ref is not set yet
        if(!rotaryRef){
          return;
        }
        const storageIdx = parseInt(rotaryRef.substring(1));
        const stored = this.storage.find(s => s.index === storageIdx);
        if(!stored){
          return;
        }
        // Get compInfo for attributes
        const compInfo = this.components.get(name);
        if(!compInfo){
          return;
        }
        // Ensure compInfo.ref is set (it should be set when component is created)
        if(!compInfo.ref){
          compInfo.ref = rotaryRef;
        }
        // Ensure value has correct length
        // Use calculatedBits (number of bits needed to represent states) not componentType bits
        // For states=4, we need 2 bits (00, 01, 10, 11), not 4 bits
        const states = compInfo.attributes['states'] !== undefined ? parseInt(compInfo.attributes['states'], 10) : 8;
        const calculatedBits = Math.ceil(Math.log2(states));
        // Always use calculatedBits for the value returned by onChange
        // The componentType is just for storage/display, but the actual value should match the number of states
        const finalBits = calculatedBits;
        
        let value = binValue;
        if(value.length < finalBits){
          value = value.padStart(finalBits, '0');
        } else if(value.length > finalBits){
          value = value.substring(0, finalBits);
        }
        stored.value = value;
        // Update all connected components and wires
        this.updateComponentConnections(name);
        showVars();
      };
      
      if(typeof addRotaryKnob === 'function'){
        addRotaryKnob({
          id: rotaryId,
          label: text,
          states: states,
          color: color,
          forLabels: forLabels,
          onChange: onChange
        });
      }
      
      deviceIds.push(rotaryId);
      // rotaryRef will be set to compInfo.ref below
    } else if(type === 'lcd'){
      // Create LCD component
      const rows = attributes['row'] !== undefined ? parseInt(attributes['row'], 10) : 8;
      const cols = attributes['cols'] !== undefined ? parseInt(attributes['cols'], 10) : 5;
      const pixelSize = attributes['pixelSize'] !== undefined ? parseInt(attributes['pixelSize'], 10) : 10;
      const pixelGap = attributes['pixelGap'] !== undefined ? parseInt(attributes['pixelGap'], 10) : 3;
      const glow = attributes['glow'] !== undefined ? true : true; // Default true
      const round = attributes['round'] !== undefined ? true : true; // Default true
      const color = attributes['color'] || attributes['pixelOnColor'] || '#6dff9c';
      const bg = attributes['bg'] || attributes['backgroundColor'] || 'transparent';
      const nl = attributes['nl'] || false;
      const rgb = attributes['rgb'] !== undefined;
      
      const lcdId = baseId;
      
      if(typeof addCharacterLCD === 'function'){
        addCharacterLCD({
          id: lcdId,
          rows: rows,
          cols: cols,
          pixelSize: pixelSize,
          pixelGap: pixelGap,
          glow: glow,
          pixelOnColor: color,
          backgroundColor: bg,
          round: round,
          nl: nl,
          rgb: rgb
        });
      }
      
      deviceIds.push(lcdId);
    } else {
      throw Error(`Unknown component type: ${type}`);
    }
    
    // Store component info
    const compInfo = {
      type: type,
      componentType: null,  // No longer used - bits derived from type and attributes
      attributes: attributes,
      initialValue: initialValue,
      returnType: returnType,
      ref: null,
      deviceIds: deviceIds
    };
    
    // For switches, dip switches, and rotary knobs, ref is already set above
    if(type === 'switch'){
      compInfo.ref = switchRef;
    } else if(type === 'dip'){
      // DIP switch ref was set in the dip block above
      compInfo.ref = dipRef;
    } else if(type === 'rotary'){
      // Rotary knob ref was set in the rotary block above
      compInfo.ref = rotaryRef;
    } else if(type === 'key'){
      // Key ref was set in the key block above
      compInfo.ref = keyRef;
    } else if(initialValue){
      // For other components (LEDs, 7seg), create storage only if initial value is set
      const storageIdx = this.storeValue(initialValue);
      compInfo.ref = `&${storageIdx}`;
    }
    
    // Store initial segment value for 7seg :get property
    if(type === '7seg'){
      // Rebuild value from segment attributes if present
      let segValue = initialValue || '0'.repeat(bits);
      if(attributes.segments){
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const segArray = segValue.split('');
        for(let i = 0; i < segments.length; i++){
          const segName = segments[i];
          if(attributes.segments[segName] !== undefined){
            segArray[i] = attributes.segments[segName];
          }
        }
        segValue = segArray.join('');
      }
      compInfo.lastSegmentValue = segValue;
    }
    
    this.components.set(name, compInfo);
  }
  
  execPcbInstance(inst){
    // Execute PCB instance: pcb [name] .var::
    const { pcbName, instanceName } = inst;
    
    // Get PCB definition
    const def = this.pcbDefinitions.get(pcbName);
    if(!def){
      throw Error(`PCB '${pcbName}' is not defined. Available PCBs: ${[...this.pcbDefinitions.keys()].join(', ')}`);
    }
    
    const prefix = instanceName.substring(1); // Remove leading '.'
    
    // Create storage for pins and pouts
    const pinStorage = new Map(); // pinName -> { bits, storageIdx, ref }
    const poutStorage = new Map(); // poutName -> { bits, storageIdx, ref }
    
    // Initialize pin storage
    for(const pin of def.pins){
      const initialValue = '0'.repeat(pin.bits);
      const storageIdx = this.storeValue(initialValue);
      pinStorage.set(pin.name, {
        bits: pin.bits,
        storageIdx: storageIdx,
        ref: `&${storageIdx}`
      });
    }
    
    // Initialize pout storage
    for(const pout of def.pouts){
      const initialValue = '0'.repeat(pout.bits);
      const storageIdx = this.storeValue(initialValue);
      poutStorage.set(pout.name, {
        bits: pout.bits,
        storageIdx: storageIdx,
        ref: `&${storageIdx}`
      });
    }
    
    // Store instance info
    const instanceInfo = {
      pcbName,
      def,
      pinStorage,
      poutStorage,
      internalPrefix: `_${prefix}`,
      lastExecValue: '0', // For edge detection
      pendingNextSection: false // Flag to indicate ~~ section should run at NEXT(~)
    };
    this.pcbInstances.set(instanceName, instanceInfo);
    
    // Execute initial body statements in isolated context
    this.executePcbBody(instanceName, def.body, false);
  }
  
  executePcbBody(instanceName, statements, isNextSection = false){
    // Execute PCB body statements with variable isolation
    const instance = this.pcbInstances.get(instanceName);
    if(!instance) return;
    
    const { def, pinStorage, poutStorage, internalPrefix } = instance;
    
    // Save current context
    const savedVars = new Map(this.vars);
    const savedWires = new Map(this.wires);
    const savedComponents = new Map(this.components);
    const savedInsidePcbBody = this.insidePcbBody;
    const savedCurrentPcbInstance = this.currentPcbInstance;
    
    // Mark that we're inside PCB body
    this.insidePcbBody = true;
    this.currentPcbInstance = instanceName;
    
    // Create isolated context with pins as variables
    for(const [pinName, pinInfo] of pinStorage){
      this.vars.set(pinName, {
        type: `${pinInfo.bits}bit`,
        value: this.getValueFromRef(pinInfo.ref) || '0'.repeat(pinInfo.bits),
        ref: pinInfo.ref
      });
    }
    
    // Create isolated context with pouts as variables
    for(const [poutName, poutInfo] of poutStorage){
      this.vars.set(poutName, {
        type: `${poutInfo.bits}bit`,
        value: this.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits),
        ref: poutInfo.ref
      });
    }
    
    // Execute statements, renaming internal components
    for(const stmt of statements){
      const renamedStmt = this.renamePcbStatement(stmt, internalPrefix);
      this.exec(renamedStmt, true);
    }
    
    // Update pout storage from current variable values
    for(const [poutName, poutInfo] of poutStorage){
      const currentVar = this.vars.get(poutName);
      if(currentVar && currentVar.value){
        this.setValueAtRef(poutInfo.ref, currentVar.value);
      }
    }
    
    // Restore original context (keeping internal components)
    // Merge new components with prefix to original (format: ._prefix_name)
    for(const [compName, compInfo] of this.components){
      if(compName.startsWith('.' + internalPrefix + '_')){
        savedComponents.set(compName, compInfo);
      }
    }
    
    this.vars = savedVars;
    this.wires = savedWires;
    this.components = savedComponents;
    this.insidePcbBody = savedInsidePcbBody;
    this.currentPcbInstance = savedCurrentPcbInstance;
  }
  
  renamePcbStatement(stmt, prefix){
    // Deep clone and rename component references
    if(!stmt) return stmt;
    
    const renamed = JSON.parse(JSON.stringify(stmt));
    
    // Helper to rename component: .ram -> ._prefix_ram (keeps the leading .)
    const renameComp = (name) => {
      if(name.startsWith('.')){
        return '.' + prefix + '_' + name.substring(1);
      }
      return prefix + '_' + name;
    };
    
    // Rename comp declarations
    if(renamed.comp && renamed.comp.name){
      renamed.comp.name = renameComp(renamed.comp.name);
    }
    
    // Rename component property assignments
    if(renamed.compAssign && renamed.compAssign.component){
      if(renamed.compAssign.component.startsWith('.')){
        renamed.compAssign.component = renameComp(renamed.compAssign.component);
      }
    }
    
    // Rename component property blocks
    if(renamed.componentPropertyBlock && renamed.componentPropertyBlock.component){
      if(renamed.componentPropertyBlock.component.startsWith('.')){
        renamed.componentPropertyBlock.component = renameComp(renamed.componentPropertyBlock.component);
      }
    }
    
    // Recursively rename expressions
    this.renamePcbExpressions(renamed, prefix);
    
    return renamed;
  }
  
  renamePcbExpressions(obj, prefix){
    if(!obj || typeof obj !== 'object') return;
    
    if(Array.isArray(obj)){
      for(const item of obj){
        this.renamePcbExpressions(item, prefix);
      }
      return;
    }
    
    // Helper to rename component: .ram -> ._prefix_ram or .ram:get -> ._prefix_ram:get
    const renameCompVar = (varName) => {
      if(varName.startsWith('.')){
        const parts = varName.split(':');
        const compName = parts[0]; // .ram
        const rest = parts.slice(1).join(':'); // get (if any)
        const newCompName = '.' + prefix + '_' + compName.substring(1);
        return rest ? newCompName + ':' + rest : newCompName;
      }
      return varName;
    };
    
    // Rename .component references in expressions
    if(obj.var && typeof obj.var === 'string' && obj.var.startsWith('.')){
      // Check if it's a component reference (not a pin/pout)
      const parts = obj.var.split(':');
      const compName = parts[0];
      // Only rename if it's not a pin or pout name
      const instance = [...this.pcbInstances.values()].find(i => i.internalPrefix === prefix);
      if(instance){
        const isPinOrPout = instance.pinStorage.has(compName.substring(1)) || 
                           instance.poutStorage.has(compName.substring(1));
        if(!isPinOrPout){
          obj.var = renameCompVar(obj.var);
        }
      } else {
        obj.var = renameCompVar(obj.var);
      }
    }
    
    // Recurse into nested objects
    for(const key of Object.keys(obj)){
      this.renamePcbExpressions(obj[key], prefix);
    }
  }
  
  // Helper function to check if an expression references a component
  exprReferencesComponent(expr, compName, compRef){
    if(!expr) return false;
    
    // Check if expression is a simple variable reference
    if(expr.length === 1){
      const atom = expr[0];
      if(atom.var === compName){
        return true;
      }
      // Check if it's a component property access (e.g., .mem:get)
      // For component properties, atom.var is the component name (e.g., .mem) and atom.property is the property name (e.g., get)
      if(atom.var && atom.var.startsWith('.') && atom.var === compName){
        return true;
      }
      // Check if it references the component's ref
      if(atom.ref && compRef && atom.ref === compRef){
        return true;
      }
      // Check if it's a function call - recursively check arguments
      if(atom.call){
        for(const argExpr of atom.args){
          if(this.exprReferencesComponent(argExpr, compName, compRef)){
            return true;
          }
        }
      }
    }
    
    // Check all atoms in the expression
    for(const atom of expr){
      if(atom.var === compName){
        return true;
      }
      // Check if atom is a component property access (e.g., .mem:get)
      // For component properties, atom.var is the component name and atom.property is the property name
      if(atom.var && atom.var.startsWith('.') && atom.var === compName){
        return true;
      }
      // Check if atom references the component's ref
      if(atom.ref && compRef && atom.ref === compRef){
        return true;
      }
      // Check if atom references the component's ref as part of a complex reference
      if(atom.ref && compRef && atom.ref.includes(compRef)){
        return true;
      }
      // Check if it's a function call - recursively check arguments
      if(atom.call){
        for(const argExpr of atom.args){
          if(this.exprReferencesComponent(argExpr, compName, compRef)){
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  exprReferencesWire(expr, wireName){
    if(!expr || !Array.isArray(expr)) return false;
    
    for(const atom of expr){
      // Check if atom directly references the wire
      if(atom.var === wireName && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
        return true;
      }
      
      // Check if it's a function call - recursively check arguments
      if(atom.call){
        for(const argExpr of atom.args){
          if(this.exprReferencesWire(argExpr, wireName)){
            return true;
          }
        }
      }
      
      // Check if it's a user-defined function call - recursively check arguments
      if(atom.func && atom.args){
        for(const argExpr of atom.args){
          if(Array.isArray(argExpr) && this.exprReferencesWire(argExpr, wireName)){
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  updateComponentConnections(compName){
    // Update all components and wires connected to this component
    const comp = this.components.get(compName);
    if(!comp){
      return;
    }
    
    // Get component value if ref exists
    let value = null;
    if(comp.ref){
      value = this.getValueFromRef(comp.ref);
    }
    // Note: Even if component has no ref (like mem), we still need to update wires that reference it
    // So we continue execution even if comp.ref is null
    
    // Update all components that are connected to this one
    if(comp.ref && value !== null){
      for(const [name, conn] of this.componentConnections.entries()){
        if(typeof conn.source === 'string'){
          // Check if connection references this component's ref
          if(conn.source === comp.ref || conn.source.includes(comp.ref)){
            const connValue = this.getValueFromRef(conn.source);
            if(connValue !== null){
              this.updateComponentValue(name, connValue, conn.bitRange);
            }
          }
        } else if(typeof conn.source === 'object'){
          // Expression reference - check if it references this component
          if(conn.source.var === compName){
            this.updateComponentValue(name, value, conn.bitRange);
          }
        }
        // Also check if connection has an expr property that references this component
        if(conn.expr && this.exprReferencesComponent(conn.expr, compName, comp.ref)){
          // Re-evaluate the connection expression
          try {
            const exprResult = this.evalExpr(conn.expr, false);
            const connComp = this.components.get(name);
            const bits = this.getComponentBits(connComp.type, connComp.attributes);
            const ref = this.buildRefFromParts(exprResult, bits, 0);
            if(ref && ref !== '&-'){
              const connValue = this.getValueFromRef(ref);
              if(connValue !== null){
                this.updateComponentValue(name, connValue, conn.bitRange);
              }
            }
          } catch(e){
            // Ignore errors during update
          }
        }
      }
    }
    
    // Check pending component properties that reference this component
    for(const [propCompName, pending] of this.componentPendingProperties.entries()){
      const propComp = this.components.get(propCompName);
      const setWhen = this.componentPendingSet.get(propCompName);
      
      // First, check if this component has a constant set=1 block with no dependencies
      // If it does, skip re-applying properties when the component itself changes
      // (because constant blocks should only execute during initial RUN())
      let hasConstantSetBlock = false;
      for(const block of this.componentPropertyBlocks){
        if(block.component !== propCompName || !block.setExpr) continue;
        if(block.setExpr.length === 1){
          const atom = block.setExpr[0];
          if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
            const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
            const hasDep = block.dependencies && block.dependencies.size > 0;
            const setExprRefsComp = block.setExpr && this.exprReferencesComponent(block.setExpr, compName, comp.ref);
            if(!hasWireDep && !hasDep && !setExprRefsComp){
              hasConstantSetBlock = true;
              break;
            }
          }
        }
      }
      
      // If component has a constant block and the changed component is the same as propCompName,
      // skip re-applying (constant blocks should only execute during RUN())
      if(hasConstantSetBlock && compName === propCompName){
        continue; // Skip all properties for this component
      }
      
      // Check each property
      for(const [propName, propData] of Object.entries(pending)){
        if(propData.expr && this.exprReferencesComponent(propData.expr, compName, comp.ref)){
          // This property references the changed component
          
          // For adder, .a and .b properties are applied immediately (not through applyComponentProperties)
          if(propComp && propComp.type === 'adder' && (propName === 'a' || propName === 'b')){
            // Re-evaluate and re-apply immediately
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            
            // Update pending value
            propData.value = value;
            
            // Apply immediately
            const adderId = propComp.deviceIds[0];
            const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
            
            // Ensure value has correct length
            let binValue = value;
            if(binValue.length < depth){
              binValue = binValue.padStart(depth, '0');
            } else if(binValue.length > depth){
              binValue = binValue.substring(0, depth);
            }
            
            // Apply immediately
            if(propName === 'a' && typeof setAdderA === 'function'){
              setAdderA(adderId, binValue);
            } else if(propName === 'b' && typeof setAdderB === 'function'){
              setAdderB(adderId, binValue);
            }
          } else if(propComp && propComp.type === 'subtract' && (propName === 'a' || propName === 'b')){
            // For subtract, .a and .b properties are applied immediately (not through applyComponentProperties)
            // Re-evaluate and re-apply immediately
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            
            // Update pending value
            propData.value = value;
            
            // Apply immediately
            const subtractId = propComp.deviceIds[0];
            const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
            
            // Ensure value has correct length
            let binValue = value;
            if(binValue.length < depth){
              binValue = binValue.padStart(depth, '0');
            } else if(binValue.length > depth){
              binValue = binValue.substring(0, depth);
            }
            
            // Apply immediately
            if(propName === 'a' && typeof setSubtractA === 'function'){
              setSubtractA(subtractId, binValue);
            } else if(propName === 'b' && typeof setSubtractB === 'function'){
              setSubtractB(subtractId, binValue);
            }
          } else if(propComp && propComp.type === 'divider' && (propName === 'a' || propName === 'b')){
            // For divider, .a and .b properties are applied immediately (not through applyComponentProperties)
            // Re-evaluate and re-apply immediately
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            
            // Update pending value
            propData.value = value;
            
            // Apply immediately
            const dividerId = propComp.deviceIds[0];
            const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
            
            // Ensure value has correct length
            let binValue = value;
            if(binValue.length < depth){
              binValue = binValue.padStart(depth, '0');
            } else if(binValue.length > depth){
              binValue = binValue.substring(0, depth);
            }
            
            // Apply immediately
            if(propName === 'a' && typeof setDividerA === 'function'){
              setDividerA(dividerId, binValue);
            } else if(propName === 'b' && typeof setDividerB === 'function'){
              setDividerB(dividerId, binValue);
            }
          } else if(propComp && propComp.type === 'multiplier' && (propName === 'a' || propName === 'b')){
            // For multiplier, .a and .b properties are applied immediately (not through applyComponentProperties)
            // Re-evaluate and re-apply immediately
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            
            // Update pending value
            propData.value = value;
            
            // Apply immediately
            const multiplierId = propComp.deviceIds[0];
            const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
            
            // Ensure value has correct length
            let binValue = value;
            if(binValue.length < depth){
              binValue = binValue.padStart(depth, '0');
            } else if(binValue.length > depth){
              binValue = binValue.substring(0, depth);
            }
            
            // Apply immediately
            if(propName === 'a' && typeof setMultiplierA === 'function'){
              setMultiplierA(multiplierId, binValue);
            } else if(propName === 'b' && typeof setMultiplierB === 'function'){
              setMultiplierB(multiplierId, binValue);
            }
          } else if(propComp && propComp.type === 'shifter' && (propName === 'value' || propName === 'dir' || propName === 'in')){
            // For shifter, .value, .dir, and .in properties are applied immediately (not through applyComponentProperties)
            // Re-evaluate and re-apply immediately
            const exprResult = this.evalExpr(propData.expr, false);
            let value = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                value += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) value += val;
              }
            }
            
            // Update pending value
            propData.value = value;
            
            // Apply immediately
            const shifterId = propComp.deviceIds[0];
            const depth = propComp.attributes['depth'] !== undefined ? parseInt(propComp.attributes['depth'], 10) : 4;
            
            if(propName === 'value'){
              // Ensure value has correct length
              let binValue = value;
              if(binValue.length < depth){
                binValue = binValue.padStart(depth, '0');
              } else if(binValue.length > depth){
                binValue = binValue.substring(0, depth);
              }
              
              // Apply immediately
              if(typeof setShifterValue === 'function'){
                setShifterValue(shifterId, binValue);
              }
            } else if(propName === 'dir'){
              // Direction: 1 = right, 0 = left
              const dirValue = parseInt(value, 2);
              if(typeof setShifterDir === 'function'){
                setShifterDir(shifterId, dirValue);
              }
            } else if(propName === 'in'){
              // Input bit: '0' or '1'
              const inValue = value.length > 0 ? value[value.length - 1] : '0'; // Take last bit if multiple bits
              if(typeof setShifterIn === 'function'){
                setShifterIn(shifterId, inValue);
              }
            }
          } else {
            // For other components, use the standard apply mechanism
            // BUT: Skip if this component has a property block with a setExpr that directly references
            // the changed component - those are handled separately by the componentPropertyBlocks loop
            // to properly handle on: mode (raise/edge/1)
            const hasPropertyBlockWithSetExpr = this.componentPropertyBlocks.some(
              block => block.component === propCompName && block.setExpr && block.setExprDirectRef
            );

            // Check if the property that's changing (propName) comes from a constant set=1 block with no dependencies
            // These blocks should only execute during initial RUN(), not when components change
            // We check if there's a constant block that contains this property
            let propComesFromConstantBlock = false;
            for(const block of this.componentPropertyBlocks){
              if(block.component !== propCompName || !block.setExpr) continue;
              if(block.setExpr.length === 1){
                const atom = block.setExpr[0];
                // Check if it's a constant value (bin, hex, or dec with value '1')
                if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
                  // Check if it has no dependencies
                  const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
                  const hasDep = block.dependencies && block.dependencies.size > 0;
                  const setExprRefsComp = block.setExpr && this.exprReferencesComponent(block.setExpr, compName, comp.ref);
                  // If no dependencies at all, check if this property is in this block
                  if(!hasWireDep && !hasDep && !setExprRefsComp){
                    // Check if this property exists in this block
                    const blockHasProp = block.properties.some(p => p.property === propName);
                    if(blockHasProp){
                      propComesFromConstantBlock = true;
                      break;
                    }
                  }
                }
              }
            }

            if(hasPropertyBlockWithSetExpr){
              // Skip - will be handled by componentPropertyBlocks loop
              // Just update the pending property value for when the block executes
              const exprResult = this.evalExpr(propData.expr, false);
              let value = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  value += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) value += val;
                }
              }
              propData.value = value;
            } else if(propComesFromConstantBlock){
              // Skip - this property comes from a constant set=1 block with no dependencies
              // These blocks should only execute during initial RUN(), not when components change
              // Just update the pending property value (in case it references the changed component)
              const exprResult = this.evalExpr(propData.expr, false);
              let value = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  value += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) value += val;
                }
              }
              propData.value = value;
            } else if(setWhen === 'immediate' || setWhen === undefined){
              // Check if this block was just executed - if so, skip to avoid re-execution
              if(this.justExecutedBlocks){
                // Find all blocks for this component that include this property
                let blockWasJustExecuted = false;
                for(const block of this.componentPropertyBlocks){
                  if(block.component === propCompName){
                    const blockHasProp = block.properties.some(p => p.property === propName);
                    if(blockHasProp){
                      const blockKey = `${block.component}:${block.blockIndex}`;
                      if(this.justExecutedBlocks.has(blockKey)){
                        blockWasJustExecuted = true;
                        break;
                      }
                    }
                  }
                }
                if(!blockWasJustExecuted){
                  // Apply immediately
                  this.applyComponentProperties(propCompName, 'immediate', true);
                }
              } else {
                // No tracking active, apply immediately as normal
                this.applyComponentProperties(propCompName, 'immediate', true);
              }
            } else if(setWhen === 'next'){
              // Mark for next iteration (already marked, but don't apply now)
              // Will be applied in NEXT
            }
          }
        }
      }
    }
    
    // Also update wires that reference this component
    // Re-execute wire statements that might depend on this component
    for(const ws of this.wireStatements){
      // Handle assignment statements: name = expr
      if(ws.assignment){
        const wireName = ws.assignment.target.var;
        const wire = this.wires.get(wireName);
        if(wire && wire.ref){
          // Check if wire expression references this component
          const references = this.exprReferencesComponent(ws.assignment.expr, compName, comp.ref);
          if(references){
            // Re-evaluate the expression
            try {
              const exprResult = this.evalExpr(ws.assignment.expr, false);
              const bits = this.getBitWidth(wire.type);
              let wireValue = '';
              for(const part of exprResult){
                if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) wireValue += val;
                } else if(part.value){
                  wireValue += part.value;
                }
              }
              if(wireValue.length < bits){
                wireValue = wireValue.padEnd(bits, '0');
              } else if(wireValue.length > bits){
                wireValue = wireValue.substring(0, bits);
              }
              
              // Update wire storage
              const refMatch = wire.ref.match(/^&(\d+)/);
              if(refMatch){
                const storageIdx = parseInt(refMatch[1]);
                const stored = this.storage.find(s => s.index === storageIdx);
                if(stored){
                  stored.value = wireValue;
                  // Update connected components (this will also update components that depend on this wire)
                  this.updateConnectedComponents(wireName, wireValue);
                }
              }
            } catch(e){
              // Ignore errors during update
            }
          }
        }
      }
      // Handle declaration statements with assignment: type name = expr
      else if(ws.decls && ws.expr){
        // Check each declared wire
        for(const decl of ws.decls){
          if(this.isWire(decl.type)){
            const wireName = decl.name;
            const wire = this.wires.get(wireName);
            if(wire){
              // Check if wire expression references this component
              const references = this.exprReferencesComponent(ws.expr, compName, comp.ref);
              if(references){
                // Re-evaluate the expression and update the wire
                try {
                  const exprResult = this.evalExpr(ws.expr, false);
                  const bits = this.getBitWidth(wire.type);
                  
                  // Find the bit offset for this wire in the declaration
                  let bitOffset = 0;
                  for(const d of ws.decls){
                    if(d.name === wireName) break;
                    const dBits = this.getBitWidth(d.type);
                    bitOffset += dBits;
                  }
                  
                  // Build reference from expression parts, starting at bitOffset
                  const wireRef = this.buildRefFromParts(exprResult, bits, bitOffset);
                  
                  // Compute the actual value from the reference
                  // For component properties like .mem:get, wireRef might be null but part.value contains the value
                  let wireValue = '';
                  if(wireRef && wireRef !== '&-'){
                    wireValue = this.getValueFromRef(wireRef) || '0'.repeat(bits);
                  } else {
                    // No ref - get value directly from expression parts
                    for(const part of exprResult){
                      if(part.value && part.value !== '-'){
                        wireValue += part.value;
                      } else if(part.ref && part.ref !== '&-'){
                        const val = this.getValueFromRef(part.ref);
                        if(val) wireValue += val;
                      }
                    }
                    if(wireValue.length < bits){
                      wireValue = wireValue.padEnd(bits, '0');
                    } else if(wireValue.length > bits){
                      wireValue = wireValue.substring(0, bits);
                    }
                  }
                  
                  // Update wire storage
                  if(wire.ref){
                    const refMatch = wire.ref.match(/^&(\d+)/);
                    if(refMatch){
                      const storageIdx = parseInt(refMatch[1]);
                      const stored = this.storage.find(s => s.index === storageIdx);
                      if(stored){
                        stored.value = wireValue;
                        // Update connected components (this will also update components that depend on this wire)
                        this.updateConnectedComponents(wireName, wireValue);
                      }
                    }
                  } else {
                    // Wire has no ref yet - create storage and set ref
                    const storageIdx = this.storeValue(wireValue);
                    wire.ref = `&${storageIdx}`;
                    // Also update wireStorageMap for NEXT support
                    if(!this.wireStorageMap.has(wireName)){
                      this.wireStorageMap.set(wireName, storageIdx);
                    }
                    // Update connected components
                    this.updateConnectedComponents(wireName, wireValue);
                  }
                } catch(e){
                  // Ignore errors during update
                }
              }
            }
          }
        }
      }
    }
    
    // Check wire-triggered property blocks for rising edge
    // This happens AFTER wires have been updated above
    // BUT: Skip blocks that were already executed in updateConnectedComponents
    // to avoid double execution
    const executedBlocks = new Set();
    // Note: Blocks executed in updateConnectedComponents are tracked there, not here
    // So we need to be careful not to execute them again
    for(const block of this.componentPropertyBlocks){
      if(block.setExpr && block.setExprDirectRef){
        // Skip if set expression is ~ (handled separately)
        if(block.setExpr.length === 1 && block.setExpr[0] && block.setExpr[0].var === '~'){
          continue;
        }
        
        // Skip if this block was already executed in updateConnectedComponents
        // We can identify blocks by their component and properties
        const blockKey = `${block.component}:${block.blockIndex}`;
        if(executedBlocks.has(blockKey)){
          continue;
        }
        
        // Only check this block if its setExpr directly references the changed component
        // SKIP blocks with wire triggers - they will be handled in updateConnectedComponents when the wire changes
        let shouldCheckBlock = false;
        
        // Check if this block's setExpr directly references the changed component
        if(block.setExprDirectRef.type === 'component'){
          // Direct component match
          if(block.setExprDirectRef.name === compName){
            shouldCheckBlock = true;
          }
        } else if(block.setExprDirectRef.type === 'wire'){
          // SKIP: Wire-triggered blocks will be handled in updateConnectedComponents
          // when the wire itself changes. This avoids double execution.
          continue;
        }
        
        if(!shouldCheckBlock){
          continue; // Skip this block - its trigger didn't change
        }
        
        // Save old value before re-evaluating
        const oldSetValue = block.lastSetValue;
        
        // Re-evaluate the set expression
        const exprResult = this.evalExpr(block.setExpr, false);
        let newSetValue = '';
        for(const part of exprResult){
          // Prefer value over ref (value is more up-to-date)
          if(part.value !== undefined && part.value !== null && part.value !== '-'){
            newSetValue += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val && val !== '-' && val !== null){
              newSetValue += val;
            }
          }
        }
        // If no value was found, default to '0'
        if(newSetValue === ''){
          newSetValue = '0';
        }
        
        // Get last bit of new and previous values
        const newBit = newSetValue.length > 0 ? newSetValue[newSetValue.length - 1] : '0';
        // Ensure oldSetValue is not null/undefined - use '0' as default
        const prevSetValue = oldSetValue || '0';
        const prevBit = prevSetValue.length > 0 ? prevSetValue[prevSetValue.length - 1] : '0';
        
        // Determine if we should execute based on onMode
        let shouldExecute = false;
        const onMode = block.onMode || 'raise';
        
        if(onMode === 'raise' || onMode === 'rising'){
          shouldExecute = (prevBit === '0' && newBit === '1');
        } else if(onMode === 'edge' || onMode === 'falling'){
          shouldExecute = (prevBit === '1' && newBit === '0');
        } else if(onMode === '1' || onMode === 'level'){
          // Level triggered: execute when set is 1
          shouldExecute = (newBit === '1');
        }

        if(shouldExecute){
          const blockKey = `${block.component}:${block.blockIndex}`;
          executedBlocks.add(blockKey);
          
          this.executePropertyBlock(block.component, block.properties, true);
          
          // After executing property block, update connections for the component itself
          // This ensures wires that reference the component (like b = .mem:get) are updated
          this.updateComponentConnections(block.component);
          
          // Update UI after executing property block
          if(typeof showVars === 'function'){
            showVars();
          }
        }
        
        // Always update lastSetValue (even if block didn't execute)
        block.lastSetValue = newSetValue;
      }
    }
    
    // Check property blocks that have dependencies on the changed component
    // This handles cases where a block has dependencies (like a = .as) but setExprDirectRef is null or constant
    for(const block of this.componentPropertyBlocks){
      // Skip blocks that were already checked above (they have setExprDirectRef)
      if(block.setExpr && block.setExprDirectRef){
        continue;
      }
      
      // Skip if this block was already executed
      const blockKey = `${block.component}:${block.blockIndex}`;
      if(executedBlocks.has(blockKey)){
        continue;
      }
      
      // Check if this block has dependencies that include the changed component
      let hasDependency = false;
      if(block.dependencies && block.dependencies.has(compName)){
        hasDependency = true;
      }
      
      // Also check wire dependencies
      if(!hasDependency && block.wireDependencies){
        // Check if any wire dependency depends on the changed component
        for(const wireName of block.wireDependencies){
          const wire = this.wires.get(wireName);
          if(wire && wire.ref){
            const ws = this.wireStatements.find(ws => {
              if(ws.assignment) return ws.assignment.target.var === wireName;
              if(ws.decls) return ws.decls.some(d => d.name === wireName);
              return false;
            });
            if(ws){
              const expr = ws.assignment ? ws.assignment.expr : ws.expr;
              if(expr && this.exprReferencesComponent(expr, compName, comp.ref)){
                hasDependency = true;
                break;
              }
            }
          }
        }
      }
      
      if(!hasDependency){
        continue; // Skip this block - it doesn't depend on the changed component
      }
      
      // For blocks with dependencies, check if component has on:1 (level triggered)
      // If on:1, execute the block when set is 1
      const onMode = block.onMode || 'raise';
      if(onMode === '1' || onMode === 'level'){
        // Re-evaluate the set expression to check if it's 1
        let setValue = '0';
        if(block.setExpr){
          const exprResult = this.evalExpr(block.setExpr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value !== undefined && part.value !== null && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val && val !== '-' && val !== null){
                setValue += val;
              }
            }
          }
          if(setValue === ''){
            setValue = '0';
          }
        }
        
        const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
        if(setBit === '1'){
          const blockKey = `${block.component}:${block.blockIndex}`;

          // Check if this block was just executed in updateConnectedComponents
          if(this.justExecutedBlocks && this.justExecutedBlocks.has(blockKey)){
            continue;
          }
          
          if(!executedBlocks.has(blockKey)){
            executedBlocks.add(blockKey);
            
            // Execute the block
            this.executePropertyBlock(block.component, block.properties, true);
            
            // After executing property block, DO NOT call updateComponentConnections recursively
            // because it will be called after all blocks in updateConnectedComponents are done
            // this.updateComponentConnections(block.component);
            
            // Update UI after executing property block
            if(typeof showVars === 'function'){
              showVars();
            }
          }
        }
      }
    }
  }
  
  // Convert hex digit (4 bits) to 7-segment pattern
  hexTo7Seg(hexValue){
    // hexValue is a 4-bit binary string (e.g., "0110" = 6)
    const hexMap = {
      '0000': '1111110', // 0: a b c d e f = 1, g = 0
      '0001': '0110000', // 1: b c = 1, rest = 0
      '0010': '1101101', // 2: a b d e g = 1, rest = 0
      '0011': '1111001', // 3: a b c d g = 1, rest = 0
      '0100': '0110011', // 4: b c f g = 1, rest = 0
      '0101': '1011011', // 5: a c d f g = 1, rest = 0
      '0110': '1011111', // 6: a c d e f g = 1, rest = 0
      '0111': '1110000', // 7: a b c = 1, rest = 0
      '1000': '1111111', // 8: all = 1
      '1001': '1111011', // 9: a b c d f g = 1, rest = 0
      '1010': '1110111', // A: a b c e f g = 1, rest = 0
      '1011': '0011111', // b: c d e f g = 1, rest = 0
      '1100': '1001110', // C: a d e f = 1, rest = 0
      '1101': '0111101', // d: b c d e g = 1, rest = 0
      '1110': '1001111', // E: a d e f g = 1, rest = 0
      '1111': '1000111'  // F: a e f g = 1, rest = 0
    };
    
    // Normalize hexValue to 4 bits
    let normalized = hexValue;
    if(normalized.length < 4){
      normalized = normalized.padStart(4, '0');
    } else if(normalized.length > 4){
      normalized = normalized.substring(0, 4);
    }
    
    return hexMap[normalized] || '0000000';
  }
  
  // Collect all component and wire dependencies from an expression
  collectExprDependencies(expr, deps, wireDeps = null){
    if(!expr || !Array.isArray(expr)) return;
    
    for(const atom of expr){
      if(atom.var && atom.var.startsWith('.')){
        // Extract component name (without property)
        const compName = atom.var.split(':')[0];
        deps.add(compName);
      } else if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$' && wireDeps){
        // Wire variable (not component, not ~, %, or $)
        wireDeps.add(atom.var);
      }
      
      // Also check nested expressions in function calls (like MUX)
      if(atom.func && atom.args){
        for(const arg of atom.args){
          if(Array.isArray(arg)){
            this.collectExprDependencies(arg, deps, wireDeps);
          }
        }
      }
      
      // Also check user-defined function calls (atom.call)
      if(atom.call && atom.args){
        for(const arg of atom.args){
          if(Array.isArray(arg)){
            this.collectExprDependencies(arg, deps, wireDeps);
          }
        }
      }
    }
  }
  
  // Check if an expression depends on ~ (directly or indirectly through wires)
  exprDependsOnTilde(expr, visitedWires = new Set()){
    if(!expr || !Array.isArray(expr)) return false;
    
    for(const atom of expr){
      // Direct reference to ~
      if(atom.var === '~'){
        return true;
      }
      
      // Check if wire depends on ~
      if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
        // Avoid infinite recursion by tracking visited wires
        if(visitedWires.has(atom.var)){
          return false; // Already checked this wire, assume it doesn't depend on ~ to avoid cycles
        }
        
        const wire = this.wires.get(atom.var);
        if(wire){
          // Check wire's expression for ~ dependency
          const ws = this.wireStatements.find(ws => {
            if(ws.assignment) return ws.assignment.target.var === atom.var;
            if(ws.decls) return ws.decls.some(d => d.name === atom.var);
            return false;
          });
          if(ws){
            const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
            if(wireExpr){
              visitedWires.add(atom.var);
              if(this.exprDependsOnTilde(wireExpr, visitedWires)){
                return true;
              }
              visitedWires.delete(atom.var);
            }
          }
        }
      }
      
      // Check nested expressions in function calls (like MUX)
      if(atom.func && atom.args){
        for(const arg of atom.args){
          if(Array.isArray(arg)){
            if(this.exprDependsOnTilde(arg, visitedWires)){
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  // Check if expression depends on special variables that change ($ and % only, NOT ~)
  exprDependsOnSpecialVars(expr, visitedWires = new Set()){
    if(!expr || !Array.isArray(expr)) return false;
    
    for(const atom of expr){
      // Direct reference to special vars that change ($ = random, % = first run)
      // Note: ~ is always 1 and never changes, so we don't include it
      if(atom.var === '$' || atom.var === '%'){
        return true;
      }
      
      // Check if wire depends on special vars
      if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
        // Avoid infinite recursion by tracking visited wires
        if(visitedWires.has(atom.var)){
          return false;
        }
        
        const wire = this.wires.get(atom.var);
        if(wire){
          const ws = this.wireStatements.find(ws => {
            if(ws.assignment) return ws.assignment.target.var === atom.var;
            if(ws.decls) return ws.decls.some(d => d.name === atom.var);
            return false;
          });
          if(ws){
            const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
            if(wireExpr){
              visitedWires.add(atom.var);
              if(this.exprDependsOnSpecialVars(wireExpr, visitedWires)){
                return true;
              }
              visitedWires.delete(atom.var);
            }
          }
        }
      }
      
      // Check nested expressions in function calls
      if(atom.func && atom.args){
        for(const arg of atom.args){
          if(Array.isArray(arg)){
            if(this.exprDependsOnSpecialVars(arg, visitedWires)){
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  exprDependsOnRandom(expr, visitedWires = new Set()){
    if(!expr || !Array.isArray(expr)) return false;
    
    for(const atom of expr){
      // Direct reference to $
      if(atom.var === '$'){
        return true;
      }
      
      // Check if wire depends on $
      if(atom.var && !atom.var.startsWith('.') && atom.var !== '~' && atom.var !== '%' && atom.var !== '$'){
        // Avoid infinite recursion by tracking visited wires
        if(visitedWires.has(atom.var)){
          return false; // Already checked this wire, assume it doesn't depend on $ to avoid cycles
        }
        
        const wire = this.wires.get(atom.var);
        if(wire){
          // Check wire's expression for $ dependency
          const ws = this.wireStatements.find(ws => {
            if(ws.assignment) return ws.assignment.target.var === atom.var;
            if(ws.decls) return ws.decls.some(d => d.name === atom.var);
            return false;
          });
          if(ws){
            const wireExpr = ws.assignment ? ws.assignment.expr : ws.expr;
            if(wireExpr){
              visitedWires.add(atom.var);
              if(this.exprDependsOnRandom(wireExpr, visitedWires)){
                return true;
              }
              visitedWires.delete(atom.var);
            }
          }
        }
      }
      
      // Check nested expressions in function calls (like MUX)
      if(atom.func && atom.args){
        for(const arg of atom.args){
          if(Array.isArray(arg)){
            if(this.exprDependsOnRandom(arg, visitedWires)){
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  // Execute a property block - set all properties in order
  executePropertyBlock(component, properties, reEvaluate){
    // Check if it's a PCB instance first
    const pcbInstance = this.pcbInstances.get(component);
    if(pcbInstance){
      return this.executePcbPropertyBlock(component, pcbInstance, properties, reEvaluate);
    }

    const comp = this.components.get(component);
    if(!comp){
      return;
    }
    
    // If reEvaluate is true, check if this block is a constant set=1 block with no dependencies
    // These blocks should only execute during initial RUN(), not when re-evaluating
    if(reEvaluate){
      for(const block of this.componentPropertyBlocks){
        if(block.component !== component) continue;
        // Check if this is the same block by comparing properties
        if(block.properties.length === properties.length){
          let isSameBlock = true;
          for(let i = 0; i < properties.length; i++){
            if(block.properties[i].property !== properties[i].property){
              isSameBlock = false;
              break;
            }
          }
          if(isSameBlock && block.setExpr && block.setExpr.length === 1){
            const atom = block.setExpr[0];
            if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
              const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
              const hasDep = block.dependencies && block.dependencies.size > 0;
              if(!hasWireDep && !hasDep){
                return; // Skip execution
              }
            }
          }
        }
      }
    }
    
    // Execute each property assignment in order
    for(const prop of properties){
      const property = prop.property;
      
      // Skip get>, mod>, carry>, over>, out>, and pout> properties - they are processed after all properties are applied
      if(property === 'get>' || property === 'mod>' || property === 'carry>' || property === 'over>' || property === 'out>' || property === 'pout>'){
        continue;
      }
      
      const expr = prop.expr;
      
      // Evaluate expression
      let value = '';
      if(expr.length === 1 && expr[0].var === '~'){
        // Expression is exactly ~ (special variable)
        value = '~';
      } else {
        const exprResult = this.evalExpr(expr, false);
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }
      }
      
      // Store pending property with expression for re-evaluation
      // When reEvaluate is true, we're executing a block due to a change, so we should clear old properties
      // from other blocks to avoid mixing properties from different blocks
      if(!this.componentPendingProperties.has(component)){
        this.componentPendingProperties.set(component, {});
      }
      const pending = this.componentPendingProperties.get(component);
      
      // If reEvaluate is true, clear properties that are not in the current block
      // This ensures that only properties from the executing block are applied
      if(reEvaluate){
        const currentBlockPropNames = new Set(properties.map(p => p.property));
        // Remove properties that are not in the current block
        for(const propName of Object.keys(pending)){
          if(!currentBlockPropNames.has(propName)){
            delete pending[propName];
          }
        }
      }
      
      pending[property] = {
        expr: expr,
        value: value
      };
      
      // Note: Segment properties (a, b, c, d, e, f, g, h) are NOT processed immediately here
      // They will be processed in applyComponentProperties when 'set' is executed
      // This avoids double processing (once here, once in applyComponentProperties)
      
      // If property is 'set', apply the properties
      if(property === 'set'){
        const when = value === '~' ? 'next' : 'immediate';
        this.componentPendingSet.set(component, when);
        this.applyComponentProperties(component, when, reEvaluate);
      }
    }
    
    // Process get> property if present (after all properties are applied)
    let getTarget = null;
    for(const prop of properties){
      if(prop.property === 'get>'){
        if(getTarget){
          throw Error(`Only one get> property allowed per block`);
        }
        getTarget = prop.target;
      }
    }
    
    if(getTarget){
      // Validate component supports :get
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      // Check if component type supports :get property
      const supportsGet = comp.type === 'mem' || comp.type === 'counter' || comp.type === 'rotary' || comp.type === 'switch' || comp.type === 'dip' || comp.type === 'key' || comp.type === 'led' || comp.type === '7seg' || comp.type === 'lcd' || comp.type === 'adder' || comp.type === 'subtract' || comp.type === 'divider' || comp.type === 'multiplier' || comp.type === 'shifter';
      if(!supportsGet){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :get property`);
      }
      
      // Evaluate component:get
      const getAtom = {
        var: component,
        property: 'get'
      };
      const getResult = this.evalAtom(getAtom, false);
      
      // Assign result to target wire
      const targetName = getTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for get> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let getValue = getResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(getValue.length < bits){
        getValue = getValue.padEnd(bits, '0');
      } else if(getValue.length > bits){
        getValue = getValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = getValue;
            // Update connected components
            this.updateConnectedComponents(targetName, getValue);
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(getValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components
        this.updateConnectedComponents(targetName, getValue);
      }
    }
    
    // Process mod> property if present (for divider)
    let modTarget = null;
    for(const prop of properties){
      if(prop.property === 'mod>'){
        if(modTarget){
          throw Error(`Only one mod> property allowed per block`);
        }
        modTarget = prop.target;
      }
    }
    
    if(modTarget){
      // Validate component supports :mod
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(comp.type !== 'divider'){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :mod property`);
      }
      
      // Evaluate component:mod
      const modAtom = {
        var: component,
        property: 'mod'
      };
      const modResult = this.evalAtom(modAtom, false);
      
      // Assign result to target wire
      const targetName = modTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for mod> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let modValue = modResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(modValue.length < bits){
        modValue = modValue.padEnd(bits, '0');
      } else if(modValue.length > bits){
        modValue = modValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = modValue;
            // Update connected components
            this.updateConnectedComponents(targetName, modValue);
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(modValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components
        this.updateConnectedComponents(targetName, modValue);
      }
    }
    
    // Process carry> property if present (for adder/subtract)
    let carryTarget = null;
    for(const prop of properties){
      if(prop.property === 'carry>'){
        if(carryTarget){
          throw Error(`Only one carry> property allowed per block`);
        }
        carryTarget = prop.target;
      }
    }
    
    if(carryTarget){
      // Validate component supports :carry
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(comp.type !== 'adder' && comp.type !== 'subtract'){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :carry property`);
      }
      
      // Evaluate component:carry
      const carryAtom = {
        var: component,
        property: 'carry'
      };
      const carryResult = this.evalAtom(carryAtom, false);
      
      // Assign result to target wire
      const targetName = carryTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for carry> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let carryValue = carryResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(carryValue.length < bits){
        carryValue = carryValue.padEnd(bits, '0');
      } else if(carryValue.length > bits){
        carryValue = carryValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = carryValue;
            // Update connected components
            this.updateConnectedComponents(targetName, carryValue);
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(carryValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components
        this.updateConnectedComponents(targetName, carryValue);
      }
    }
    
    // Process over> property if present (for multiplier)
    let overTarget = null;
    for(const prop of properties){
      if(prop.property === 'over>'){
        if(overTarget){
          throw Error(`Only one over> property allowed per block`);
        }
        overTarget = prop.target;
      }
    }
    
    if(overTarget){
      // Validate component supports :over
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(comp.type !== 'multiplier'){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :over property`);
      }
      
      // Evaluate component:over
      const overAtom = {
        var: component,
        property: 'over'
      };
      const overResult = this.evalAtom(overAtom, false);
      
      // Assign result to target wire
      const targetName = overTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for over> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let overValue = overResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length
      if(overValue.length < bits){
        overValue = overValue.padEnd(bits, '0');
      } else if(overValue.length > bits){
        overValue = overValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = overValue;
            // Update connected components
            this.updateConnectedComponents(targetName, overValue);
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(overValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components
        this.updateConnectedComponents(targetName, overValue);
      }
    }
    
    // Process out> property if present (for shifter)
    let outTarget = null;
    for(const prop of properties){
      if(prop.property === 'out>'){
        if(outTarget){
          throw Error(`Only one out> property allowed per block`);
        }
        outTarget = prop.target;
      }
    }
    
    if(outTarget){
      // Validate component supports :out
      const comp = this.components.get(component);
      if(!comp){
        return;
      }
      
      if(comp.type !== 'shifter'){
        throw Error(`Component ${component} (type: ${comp.type}) does not support :out property`);
      }
      
      // Evaluate component:out
      const outAtom = {
        var: component,
        property: 'out'
      };
      const outResult = this.evalAtom(outAtom, false);
      
      // Assign result to target wire
      const targetName = outTarget.var;
      const wire = this.wires.get(targetName);
      if(!wire){
        throw Error(`Wire ${targetName} not found for out> assignment`);
      }
      
      // Get bit width for target wire
      const bits = this.getBitWidth(wire.type);
      let outValue = outResult.value || '0'.repeat(bits);
      
      // Ensure value has correct length (out is always 1 bit, but wire might be wider)
      if(outValue.length < bits){
        outValue = outValue.padEnd(bits, '0');
      } else if(outValue.length > bits){
        outValue = outValue.substring(0, bits);
      }
      
      // Update wire storage
      let storageIdx = null;
      if(wire.ref){
        const refMatch = wire.ref.match(/^&(\d+)/);
        if(refMatch){
          storageIdx = parseInt(refMatch[1]);
          const stored = this.storage.find(s => s.index === storageIdx);
          if(stored){
            stored.value = outValue;
            // Update connected components
            this.updateConnectedComponents(targetName, outValue);
          }
        }
      } else {
        // Wire has no ref yet - create storage and set ref
        storageIdx = this.storeValue(outValue);
        wire.ref = `&${storageIdx}`;
        // Also update wireStorageMap for NEXT support
        if(!this.wireStorageMap.has(targetName)){
          this.wireStorageMap.set(targetName, storageIdx);
        }
        // Update connected components
        this.updateConnectedComponents(targetName, outValue);
      }
    }
  }
  
  // Execute a PCB property block - handle pin assignments, pout>= and set trigger
  executePcbPropertyBlock(instanceName, instance, properties, reEvaluate){
    const def = instance.def;
    let shouldTriggerExec = false;

    // Execute each property assignment in order
    for(const prop of properties){
      const property = prop.property;

      // Skip pout> properties - they are processed after all properties are applied
      if(property === 'pout>'){
        continue;
      }

      // Handle 'set' property - triggers PCB exec
      if(property === 'set'){
        const expr = prop.expr;
        let value = '';
        if(expr && expr.length === 1 && expr[0].var === '~'){
          value = '~';
        } else if(expr) {
          const exprResult = this.evalExpr(expr, false);
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              value += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) value += val;
            }
          }
        }

        // Check if set is '1' (trigger exec)
        if(value === '1' || (value.length > 0 && value[value.length - 1] === '1')){
          shouldTriggerExec = true;
        }
        continue;
      }

      // Check if this property is a pin name
      const pinInfo = instance.pinStorage.get(property);
      if(pinInfo){
        // Assign to input pin
        const expr = prop.expr;
        const exprResult = this.evalExpr(expr, false);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }

        // Pad/trim to correct bit width
        if(value.length < pinInfo.bits){
          value = value.padStart(pinInfo.bits, '0');
        } else if(value.length > pinInfo.bits){
          value = value.substring(value.length - pinInfo.bits);
        }

        // Store the value
        this.setValueAtRef(pinInfo.ref, value);
        continue;
      }

      // Check if it's a pout name (allow assignment to pout as well)
      const poutInfo = instance.poutStorage.get(property);
      if(poutInfo){
        const expr = prop.expr;
        const exprResult = this.evalExpr(expr, false);
        let value = '';
        for(const part of exprResult){
          if(part.value && part.value !== '-'){
            value += part.value;
          } else if(part.ref && part.ref !== '&-'){
            const val = this.getValueFromRef(part.ref);
            if(val) value += val;
          }
        }

        if(value.length < poutInfo.bits){
          value = value.padStart(poutInfo.bits, '0');
        } else if(value.length > poutInfo.bits){
          value = value.substring(value.length - poutInfo.bits);
        }

        this.setValueAtRef(poutInfo.ref, value);
        continue;
      }

      // Unknown property for PCB instance
      throw Error(`Unknown property '${property}' for PCB instance ${instanceName}. Available pins: ${[...instance.pinStorage.keys()].join(', ')}. Available pouts: ${[...instance.poutStorage.keys()].join(', ')}`);
    }

    // Trigger exec if set = 1 was specified
    if(shouldTriggerExec){
      // Simulate rising edge on exec pin
      const prevBit = instance.lastExecValue || '0';
      const newBit = '1';

      let shouldExecute = false;
      const onMode = def.on || 'raise';

      if(onMode === 'raise' || onMode === 'rising'){
        shouldExecute = (prevBit === '0' && newBit === '1');
      } else if(onMode === 'edge' || onMode === 'falling'){
        shouldExecute = false; // Falling edge won't trigger on set = 1
      } else if(onMode === '1' || onMode === 'level'){
        shouldExecute = (newBit === '1');
      }

      if(shouldExecute){
        this.executePcbBody(instanceName, def.body, false);
        // Mark that ~~ section should be executed at NEXT(~)
        if(def.nextSection && def.nextSection.length > 0){
          instance.pendingNextSection = true;
        }
      }

      instance.lastExecValue = newBit;
    }

    // Process pout> properties (after all pin assignments and exec)
    for(const prop of properties){
      if(prop.property === 'pout>'){
        const poutName = prop.poutName;
        const target = prop.target;

        // Get pout value
        const poutInfo = instance.poutStorage.get(poutName);
        if(!poutInfo){
          throw Error(`Unknown pout '${poutName}' for PCB instance ${instanceName}. Available pouts: ${[...instance.poutStorage.keys()].join(', ')}`);
        }

        const poutValue = this.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits);

        // Assign to target wire
        const targetName = target.var;
        const wire = this.wires.get(targetName);
        if(!wire){
          throw Error(`Wire ${targetName} not found for ${poutName}>= assignment`);
        }

        // Get bit width for target wire
        const bits = this.getBitWidth(wire.type);
        let getValue = poutValue;

        // Ensure value has correct length
        if(getValue.length < bits){
          getValue = getValue.padStart(bits, '0');
        } else if(getValue.length > bits){
          getValue = getValue.substring(getValue.length - bits);
        }

        // Update wire storage
        if(wire.ref){
          const refMatch = wire.ref.match(/^&(\d+)/);
          if(refMatch){
            const storageIdx = parseInt(refMatch[1]);
            const stored = this.storage.find(s => s.index === storageIdx);
            if(stored){
              stored.value = getValue;
              this.updateConnectedComponents(targetName, getValue);
            }
          }
        } else {
          // Wire has no ref yet - create storage and set ref
          const storageIdx = this.storeValue(getValue);
          wire.ref = `&${storageIdx}`;
          if(!this.wireStorageMap.has(targetName)){
            this.wireStorageMap.set(targetName, storageIdx);
          }
          this.updateConnectedComponents(targetName, getValue);
        }
      }
    }
  }

  // Apply pending properties to a component
  applyComponentProperties(compName, when, reEvaluate = false){
    const comp = this.components.get(compName);
    if(!comp) {
      return;
    }
    
    const pending = this.componentPendingProperties.get(compName);
    
    // Check if we should apply now
    if(when === 'next'){
      // Mark for next iteration, but don't apply now
      this.componentPendingSet.set(compName, 'next');
      // For mem components, we must not apply properties when when === 'next'
      if(comp.type === 'mem'){
        return;
      }
      return;
    }
    
      // If reEvaluate is true, check if there's a constant set=1 block with no dependencies
      // If there is, we should skip applying properties that come from that constant block
      // But we need to allow properties from other blocks (like the one with set=ANDA4(...))
      if(reEvaluate && pending){
        // Find constant blocks for this component
        const constantBlocks = [];
        for(const block of this.componentPropertyBlocks){
          if(block.component !== compName || !block.setExpr) continue;
          if(block.setExpr.length === 1){
            const atom = block.setExpr[0];
            if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
              const hasWireDep = block.wireDependencies && block.wireDependencies.size > 0;
              const hasDep = block.dependencies && block.dependencies.size > 0;
              if(!hasWireDep && !hasDep){
                constantBlocks.push(block);
              }
            }
          }
        }
        
        // If there are constant blocks, check if ALL pending properties come from constant blocks
        // If they do, skip applying (constant blocks should only execute during RUN())
        if(constantBlocks.length > 0){
          const constantBlockPropNames = new Set();
          for(const block of constantBlocks){
            for(const prop of block.properties){
              constantBlockPropNames.add(prop.property);
            }
          }
          
          const pendingPropNames = new Set(Object.keys(pending));
          // Check if all pending properties (except 'set') come from constant blocks
          let allFromConstantBlocks = true;
          for(const propName of pendingPropNames){
            if(propName === 'set') continue; // Skip 'set' property for now
            if(!constantBlockPropNames.has(propName)){
              allFromConstantBlocks = false;
              break;
            }
          }
          
          // Also check if 'set' property comes from a constant block
          if(allFromConstantBlocks && pending.set){
            const setExpr = pending.set.expr;
            if(setExpr && setExpr.length === 1){
              const setAtom = setExpr[0];
              if((setAtom.bin === '1') || (setAtom.hex === '1') || (setAtom.dec === '1')){
                return; // Skip applying properties from constant blocks
              }
            }
          }
          
          // If not all properties come from constant blocks, we need to filter out properties from constant blocks
          // and only apply properties from non-constant blocks
          if(!allFromConstantBlocks){
            // Remove properties that come from constant blocks
            for(const propName of constantBlockPropNames){
              if(pending[propName] && propName !== 'set'){
                delete pending[propName];
              }
            }
            // Also remove 'set' if it comes from a constant block
            if(pending.set){
              const setExpr = pending.set.expr;
              if(setExpr && setExpr.length === 1){
                const setAtom = setExpr[0];
                if((setAtom.bin === '1') || (setAtom.hex === '1') || (setAtom.dec === '1')){
                  delete pending.set;
                }
              }
            }
            // If no properties remain, return early
            if(Object.keys(pending).length === 0){
              return;
            }
          }
        }
      }
    
    // If no pending properties and not re-evaluating, nothing to do
    if(!pending && !reEvaluate){
      return;
    }
    
    // For shifter, we always execute shift when :set is called (when === 'immediate')
    // This allows multiple .sh:set = 1 calls to shift multiple times
    // But we still need to process pending properties first if they exist
    if(comp.type === 'shifter'){
      // Process pending properties first (value, dir, in) if they exist
      // Then execute shift at the end
      const shifterId = comp.deviceIds[0];
      
      if(pending){
        // Get direction (stored in pending.dir or use current direction from shifter)
        let direction = 1; // Default: right
        if(pending.dir !== undefined){
          let dirValue = pending.dir.value;
          
          // If re-evaluating, re-evaluate the expression
          if(reEvaluate && pending.dir.expr){
            const exprResult = this.evalExpr(pending.dir.expr, false);
            dirValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                dirValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) dirValue += val;
              }
            }
            pending.dir.value = dirValue;
          }
          
          // Convert direction value to number (0 = left, 1 = right)
          direction = parseInt(dirValue, 2);
          if(direction !== 0 && direction !== 1){
            throw Error(`Shifter direction must be 0 (left) or 1 (right), got ${dirValue}`);
          }
          
          // Update direction
          if(typeof setShifterDir === 'function'){
            setShifterDir(shifterId, direction);
          }
        }
        
        // Apply value if set
        if(pending.value !== undefined){
          let valueStr = pending.value.value;
          
          // If re-evaluating, re-evaluate the expression
          if(reEvaluate && pending.value.expr){
            const exprResult = this.evalExpr(pending.value.expr, false);
            valueStr = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                valueStr += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) valueStr += val;
              }
            }
            pending.value.value = valueStr;
          }
          
          const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
          
          // Ensure value has correct length
          let binValue = valueStr;
          if(binValue.length < depth){
            binValue = binValue.padStart(depth, '0');
          } else if(binValue.length > depth){
            binValue = binValue.substring(0, depth);
          }
          
          // Set value
          if(typeof setShifterValue === 'function'){
            setShifterValue(shifterId, binValue);
          }
        }
        
        // Apply .in if set
        if(pending.in !== undefined){
          let inStr = pending.in.value;
          
          // If re-evaluating, re-evaluate the expression
          if(reEvaluate && pending.in.expr){
            const exprResult = this.evalExpr(pending.in.expr, false);
            inStr = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                inStr += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) inStr += val;
              }
            }
            pending.in.value = inStr;
          }
          
          // Take last bit if multiple bits
          const inValue = inStr.length > 0 ? inStr[inStr.length - 1] : '0';
          
          // Set input bit
          if(typeof setShifterIn === 'function'){
            setShifterIn(shifterId, inValue);
          }
        }
      }
      
      // Always execute shift when :set is called (even if pending is empty)
      // This allows multiple .sh:set = 1 calls to shift multiple times
      if(typeof shiftShifter === 'function'){
        shiftShifter(shifterId);
      }
      
      // After shift, update pending.value with the new shifted value
      // This ensures that if .sh:set = 1 is called again, it uses the updated value
      if(!pending){
        this.componentPendingProperties.set(compName, {});
      }
      const updatedPending = this.componentPendingProperties.get(compName);
      if(typeof getShifter === 'function'){
        const newValue = getShifter(shifterId);
        if(newValue !== null){
          updatedPending.value = {
            expr: null,
            value: newValue
          };
        }
      }
      
      return;
    }
    
    if(!pending) return;
    
    // Apply properties immediately
    if(comp.type === '7seg'){
      // Handle hex property
      if(pending.hex !== undefined){
        let hexValue = pending.hex.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.hex.expr){
          const exprResult = this.evalExpr(pending.hex.expr, false);
          // Get the value from expression
          hexValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              hexValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) hexValue += val;
            }
          }
          // Update stored value
          pending.hex.value = hexValue;
        }
        
        // Convert hex (4 bits) to 7-segment pattern
        const segPattern = this.hexTo7Seg(hexValue);
        
        // Update segments a-g (first 7 bits), keep h unchanged
        if(comp.deviceIds.length > 0){
          const segId = comp.deviceIds[0];
          const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
          for(let i = 0; i < segments.length; i++){
            const segName = segments[i];
            const segValue = segPattern[i] === '1';
            if(typeof setSegment === 'function'){
              setSegment(segId, segName, segValue);
            }
          }
          // h segment is not changed by hex property
          // Store lastSegmentValue (7 bits from pattern + current h bit)
          const currentH = comp.lastSegmentValue ? comp.lastSegmentValue[7] : '0';
          comp.lastSegmentValue = segPattern + currentH;
        }
      }
      
      // Handle individual segment properties (a, b, c, d, e, f, g, h) from property blocks
      const segAttributes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      let hasSegmentProperty = false;
      for(const segName of segAttributes){
        if(pending[segName] !== undefined){
          hasSegmentProperty = true;
          break;
        }
      }
      
      if(hasSegmentProperty && comp.deviceIds.length > 0){
        const segId = comp.deviceIds[0];
        
        // Update each segment that was specified in property block
        for(const segName of segAttributes){
          if(pending[segName] !== undefined){
            let segValue = pending[segName].value;
            
            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending[segName].expr){
              const exprResult = this.evalExpr(pending[segName].expr, false);
              segValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  segValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) segValue += val;
                }
              }
              // Update stored value
              pending[segName].value = segValue;
            }
            
            // Extract last bit (should be 0 or 1)
            const segBit = segValue.length > 0 ? segValue[segValue.length - 1] : '0';
            if(segBit !== '0' && segBit !== '1'){
              throw Error(`Segment ${segName} value must be 0 or 1, got ${segBit}`);
            }
            
            const segBool = segBit === '1';
            if(typeof setSegment === 'function'){
              setSegment(segId, segName, segBool);
            }
            
            // Update lastSegmentValue
            if(!comp.lastSegmentValue){
              comp.lastSegmentValue = '00000000';
            }
            const segArray = comp.lastSegmentValue.split('');
            const segIndex = segAttributes.indexOf(segName);
            if(segIndex >= 0){
              segArray[segIndex] = segBit;
              comp.lastSegmentValue = segArray.join('');
            }
          }
        }
      }
      
      // Handle individual segment attributes (a, b, c, d, e, f, g, h) from component definition
      if(comp.attributes && comp.attributes.segments){
        if(comp.deviceIds.length > 0){
          const segId = comp.deviceIds[0];
          const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          // Update each segment that was specified
          for(const segName of segments){
            if(comp.attributes.segments[segName] !== undefined){
              const segValue = comp.attributes.segments[segName] === '1';
              if(typeof setSegment === 'function'){
                setSegment(segId, segName, segValue);
              }
            }
          }
          
          // Update lastSegmentValue to reflect current state
          // Get current segment states
          let currentSegValue = comp.lastSegmentValue || '00000000';
          const segArray = currentSegValue.split('');
          for(let i = 0; i < segments.length; i++){
            const segName = segments[i];
            if(comp.attributes.segments[segName] !== undefined){
              segArray[i] = comp.attributes.segments[segName];
            }
          }
          comp.lastSegmentValue = segArray.join('');
        }
      }
      
      // Handle set property
      if(pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          // Get the value from expression
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          // Update stored value
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (enable) or '0' (disable)
        // If set is '1', apply the hex value to the display
        // If set is '0', don't update the display
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply hex value if it exists
          if(pending.hex !== undefined){
            let hexValue = pending.hex.value;
            
            // Re-evaluate hex if needed
            if(reEvaluate && pending.hex.expr){
              const exprResult = this.evalExpr(pending.hex.expr, false);
              hexValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  hexValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) hexValue += val;
                }
              }
              pending.hex.value = hexValue;
            }
            
            // Convert hex (4 bits) to 7-segment pattern
            const segPattern = this.hexTo7Seg(hexValue);
            
            // Update segments a-g (first 7 bits), keep h unchanged
            if(comp.deviceIds.length > 0){
              const segId = comp.deviceIds[0];
              const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
              for(let i = 0; i < segments.length; i++){
                const segName = segments[i];
                const segValue = segPattern[i] === '1';
                if(typeof setSegment === 'function'){
                  setSegment(segId, segName, segValue);
                }
              }
              // Store lastSegmentValue (7 bits from pattern + current h bit)
              const currentH = comp.lastSegmentValue ? comp.lastSegmentValue[7] : '0';
              comp.lastSegmentValue = segPattern + currentH;
            }
          }
        }
      }
    } else if(comp.type === 'mem'){
      // Handle memory properties: at, data, set
      // Note: when === 'next' is already handled at the start of this function
      // Double-check: Only apply if when === 'immediate' (not 'next')
      // This is a safety check in case the early return didn't work
      if(when !== 'immediate'){
        // Should not reach here if when === 'next' (should have returned earlier)
        // But just in case, return here too
        return;
      }
      
      const memId = comp.deviceIds[0];
      // Use bracket notation to avoid conflict with JavaScript's built-in 'length' property
      const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 3;
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Get current address (stored in pending.at)
      // IMPORTANT: Always re-evaluate the address expression when :set is executed
      // This ensures that if .rom:at = .c:get, it uses the current value of .c:get
      let currentAddress = 0;
      if(pending && pending.at !== undefined){
        let addressValue = pending.at.value;
        
        // Always re-evaluate the expression when applying properties (not just when reEvaluate is true)
        // This ensures that references like .c:get are re-read with their current values
        // IMPORTANT: The expression stored in pending.at.expr contains the original atoms (like .c:get)
        // When we re-evaluate it, evalAtom will be called again for .c:get, which will get the current value
        // So we don't need to worry about old refs - the atoms will be re-evaluated
        if(pending.at.expr){
          // Re-evaluate the expression - this will re-evaluate all atoms including component properties
          const exprResult = this.evalExpr(pending.at.expr, false);
          addressValue = '';
          for(const part of exprResult){
            // For component properties like .c:get, part.value will contain the current value
            // and part.ref will be null (component properties don't create refs when computeRefs=false)
            if(part.value && part.value !== '-'){
              addressValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              // This is a reference to storage - get current value
              const val = this.getValueFromRef(part.ref);
              if(val) addressValue += val;
            }
          }
          // Update stored value for future use
          pending.at.value = addressValue;
        }
        
        // Convert address value to number
        currentAddress = parseInt(addressValue, 2);
        
        // Validate address
        if(currentAddress < 0 || currentAddress >= length){
          throw Error(`Memory invalid address ${currentAddress} (length: ${length} means address can be between 0 and ${length - 1})`);
        }
      }
      
      // Check if :write is set to 1
      let shouldWrite = false;
      if(pending && pending.write !== undefined){
        let writeValue = pending.write.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.write.expr){
          const exprResult = this.evalExpr(pending.write.expr, false);
          writeValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              writeValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) writeValue += val;
            }
          }
          pending.write.value = writeValue;
        }
        
        // Check if write is set to 1
        shouldWrite = (writeValue === '1');
      }
      
      // Apply data if :write = 1
      if(shouldWrite){
        if(pending && pending.data !== undefined){
          let dataValue = pending.data.value;
          
          // Always re-evaluate the expression when applying properties (not just when reEvaluate is true)
          // This ensures that references like .c:get are re-read with their current values
          if(pending.data.expr){
            const exprResult = this.evalExpr(pending.data.expr, false);
            dataValue = '';
            for(const part of exprResult){
              if(part.value && part.value !== '-'){
                dataValue += part.value;
              } else if(part.ref && part.ref !== '&-'){
                const val = this.getValueFromRef(part.ref);
                if(val) dataValue += val;
              }
            }
            // Update stored value for future use
            pending.data.value = dataValue;
          }
          
          // Validate data length is divisible by depth
          if(dataValue.length % depth !== 0){
            throw Error(`Memory data length (${dataValue.length}) must be divisible by depth (${depth})`);
          }
          
          // Split data into chunks of depth bits and set each address
          const numAddresses = dataValue.length / depth;
          if(currentAddress + numAddresses > length){
            throw Error(`Memory write would exceed memory length. Starting at address ${currentAddress}, trying to write ${numAddresses} addresses, but memory length is ${length}`);
          }
          
          // Set each address
          for(let i = 0; i < numAddresses; i++){
            const address = currentAddress + i;
            const value = dataValue.substring(i * depth, (i + 1) * depth);
            if(typeof setMem === 'function'){
              setMem(memId, address, value);
            }
          }
          
          // Clear :write after writing (it should not persist)
          if(!reEvaluate){
            delete pending.write;
          }
        } else {
          throw Error(`Memory :write = 1 requires :data to be set`);
        }
      }
      // If :write is not set to 1, don't write data (just update address for reading)
    } else if(comp.type === 'counter'){
      // Handle counter properties: dir, data, write, set
      const counterId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;

        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }

        // Check if set is '1' (apply counter operation)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Check if :write is set to 1
          let shouldWrite = false;
          if(pending.write !== undefined){
            let writeValue = pending.write.value;

            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.write.expr){
              const exprResult = this.evalExpr(pending.write.expr, false);
              writeValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  writeValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) writeValue += val;
                }
              }
              pending.write.value = writeValue;
            }

            // Check if write is set to 1
            shouldWrite = (writeValue === '1');
          }

          if(shouldWrite){
            // :write = 1: Write the value from :data directly to counter
            if(pending.data === undefined){
              throw Error(`Counter :write = 1 requires :data to be set`);
            }

            let dataValue = pending.data.value;

            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.data.expr){
              const exprResult = this.evalExpr(pending.data.expr, false);
              dataValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  dataValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) dataValue += val;
                }
              }
              pending.data.value = dataValue;
            }

            // Ensure data value has correct length
            if(dataValue.length < depth){
              dataValue = dataValue.padStart(depth, '0');
            } else if(dataValue.length > depth){
              dataValue = dataValue.substring(0, depth);
            }

            // Write the value directly to counter
            if(typeof setCounter === 'function'){
              setCounter(counterId, dataValue);
            }

            // Clear :write, :dir, and :data after writing (they should not persist)
            if(!reEvaluate){
              delete pending.write;
              delete pending.dir;
              delete pending.data;
            }
          } else {
            // :write is not set to 1: Use :dir for increment/decrement
            // Get direction (stored in pending.dir, or use last set direction if not in pending)
            let direction = 1; // Default: increment
            if(pending.dir !== undefined){
              let dirValue = pending.dir.value;

              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.dir.expr){
                const exprResult = this.evalExpr(pending.dir.expr, false);
                dirValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    dirValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) dirValue += val;
                  }
                }
                pending.dir.value = dirValue;
              }

              // Convert direction value to number (0 = decrement, 1 = increment)
              direction = parseInt(dirValue, 2);
              if(direction !== 0 && direction !== 1){
                throw Error(`Counter direction must be 0 (decrement) or 1 (increment), got ${dirValue}`);
              }
            }

            // Apply increment/decrement when :set is executed
            // When :write is not set, always use current counter value (ignore :data)
            // :data is only used when :write = 1
            let baseValue = null;

            // Always use current counter value when :write is not set
            if(typeof getCounter === 'function'){
              baseValue = getCounter(counterId);
              // If no value exists, use default
              if(!baseValue || baseValue === comp.initialValue){
                baseValue = comp.initialValue || '0'.repeat(depth);
              }
            } else {
              // Fallback to initial value
              baseValue = comp.initialValue || '0'.repeat(depth);
            }

            // Apply increment or decrement based on direction
            let numValue = parseInt(baseValue, 2);
            const maxValue = Math.pow(2, depth) - 1;

            if(direction === 1){
              // Increment
              numValue = (numValue + 1) % (maxValue + 1);
            } else {
              // Decrement
              numValue = (numValue - 1 + maxValue + 1) % (maxValue + 1);
            }

            // Convert back to binary string
            const newValue = numValue.toString(2).padStart(depth, '0');

            // Set the counter value
            if(typeof setCounter === 'function'){
              setCounter(counterId, newValue);
            }

            // Do NOT clear :dir after increment/decrement (it should persist for future :set calls)
            // :data is not used for increment/decrement, so we don't need to clear it here
            // (it will only be used when :write = 1, and then it will be cleared)
          }
        }
      }
    } else if(comp.type === 'rotary'){
      // Handle rotary knob properties: data, set
      const rotaryId = comp.deviceIds[0];
      const states = comp.attributes['states'] !== undefined ? parseInt(comp.attributes['states'], 10) : 8;
      const calculatedBits = Math.ceil(Math.log2(states));
      const actualBits = this.getComponentBits(comp.type, comp.attributes);

      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply data) or '0' (don't apply)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply data value if it exists
          if(pending && pending.data !== undefined){
            let dataValue = pending.data.value;
            
            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.data.expr){
              const exprResult = this.evalExpr(pending.data.expr, false);
              dataValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  dataValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) dataValue += val;
                }
              }
              pending.data.value = dataValue;
            }
            
            // Ensure data value has correct length
            if(dataValue.length < actualBits){
              dataValue = dataValue.padStart(actualBits, '0');
            } else if(dataValue.length > actualBits){
              dataValue = dataValue.substring(0, actualBits);
            }
            
            // Set the rotary knob state
            if(typeof setRotaryKnob === 'function'){
              setRotaryKnob(rotaryId, dataValue);
            }
          }
        }
      }
    } else if(comp.type === 'adder'){
      // Handle adder properties: a, b, set
      const adderId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setAdderA === 'function'){
              setAdderA(adderId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setAdderB === 'function'){
              setAdderB(adderId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'subtract'){
      // Handle subtract properties: a, b, set
      const subtractId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setSubtractA === 'function'){
              setSubtractA(subtractId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setSubtractB === 'function'){
              setSubtractB(subtractId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'divider'){
      // Handle divider properties: a, b, set
      const dividerId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setDividerA === 'function'){
              setDividerA(dividerId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setDividerB === 'function'){
              setDividerB(dividerId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'multiplier'){
      // Handle multiplier properties: a, b, set
      const multiplierId = comp.deviceIds[0];
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :a if set
          if(pending.a !== undefined){
            let aValue = pending.a.value;
            
            if(reEvaluate && pending.a.expr){
              const exprResult = this.evalExpr(pending.a.expr, false);
              aValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  aValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) aValue += val;
                }
              }
              pending.a.value = aValue;
            }
            
            // Ensure value has correct length
            if(aValue.length < depth){
              aValue = aValue.padStart(depth, '0');
            } else if(aValue.length > depth){
              aValue = aValue.substring(0, depth);
            }
            
            if(typeof setMultiplierA === 'function'){
              setMultiplierA(multiplierId, aValue);
            }
          }
          
          // Apply :b if set
          if(pending.b !== undefined){
            let bValue = pending.b.value;
            
            if(reEvaluate && pending.b.expr){
              const exprResult = this.evalExpr(pending.b.expr, false);
              bValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  bValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) bValue += val;
                }
              }
              pending.b.value = bValue;
            }
            
            // Ensure value has correct length
            if(bValue.length < depth){
              bValue = bValue.padStart(depth, '0');
            } else if(bValue.length > depth){
              bValue = bValue.substring(0, depth);
            }
            
            if(typeof setMultiplierB === 'function'){
              setMultiplierB(multiplierId, bValue);
            }
          }
        }
      }
    } else if(comp.type === 'lcd'){
      // Handle LCD properties: clear, set, x, y, rowlen, data
      const lcdId = comp.deviceIds[0];
      
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;
        
        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }
        
        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Reset RGB color when :set = 1
          if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
            lcdDisplays.get(lcdId).setCurrentColor(null);
          }
          
          // Check if clear is set
          let shouldClear = false;
          if(pending && pending.clear !== undefined){
            let clearValue = pending.clear.value;
            
            // If re-evaluating, re-evaluate the expression
            if(reEvaluate && pending.clear.expr){
              const exprResult = this.evalExpr(pending.clear.expr, false);
              clearValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  clearValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) clearValue += val;
                }
              }
              pending.clear.value = clearValue;
            }
            
            // If clear is '1', clear the LCD
            if(clearValue === '1' || clearValue[clearValue.length - 1] === '1'){
              shouldClear = true;
              if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
                lcdDisplays.get(lcdId).clear();
              }
              // Clear the clear property after use
              delete pending.clear;
            }
          }
          
          // Execute setRect if we have x, y, rowlen, and data
          // If clear was executed, it will run first, then setRect will execute
          // If :chr is set, generate :data from it
          if(pending && pending.x !== undefined && pending.y !== undefined && pending.rowlen !== undefined){
            // Check if :chr is set - if so, generate :data from it
            if(pending.chr !== undefined){
              let chrValue = pending.chr.value;
              
              // Check if the original expression is hex by examining the expr
              let isHex = false;
              if(pending.chr.expr && pending.chr.expr.length > 0){
                // Check if expression contains hex literal
                for(const atom of pending.chr.expr){
                  if(atom.hex){
                    isHex = true;
                    break;
                  }
                }
              }
              
              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.chr.expr){
                const exprResult = this.evalExpr(pending.chr.expr, false);
                chrValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    chrValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) chrValue += val;
                  }
                }
                pending.chr.value = chrValue;
              }
              
              // Convert chrValue to number
              // If original expression was hex, value is binary representation of hex
              // If original expression was binary, value is already binary
              let charCode = 0;
              if(isHex){
                // Value is binary representation of hex, convert back to number
                charCode = parseInt(chrValue, 2);
              } else {
                // Value is binary, parse as binary
                charCode = parseInt(chrValue, 2);
              }
            //console.log("hhh");
              // Get character bits from LCD instance
              if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
                const lcdInstance = lcdDisplays.get(lcdId);
                if(typeof lcdInstance.getCharBitsString === 'function'){
                  const charBits = lcdInstance.getCharBitsString(charCode);
                  // Set the generated data in pending.data
                  if(!pending.data){
                    pending.data = {};
                  }
                  pending.data.value = charBits;
                  pending.data.expr = null; // No expression, it's generated
                }
              }
            }
            
            // Check if we have data (either set directly or generated from chr)
            if(pending.data === undefined){
              // No data available, skip setRect
              return;
            }
            
            // Re-evaluate expressions if needed
            let xValue = pending.x.value;
            let yValue = pending.y.value;
            let rowlenValue = pending.rowlen.value;
            let dataValue = pending.data.value;
            let cornerValue = '00'; // Default: top-left
            
            // Get corner value if specified
            if(pending.corner !== undefined){
              cornerValue = pending.corner.value;
              
              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.corner.expr){
                const exprResult = this.evalExpr(pending.corner.expr, false);
                cornerValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    cornerValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) cornerValue += val;
                  }
                }
                pending.corner.value = cornerValue;
              }
            }
            
            if(reEvaluate){
              if(pending.x.expr){
                const exprResult = this.evalExpr(pending.x.expr, false);
                xValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    xValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) xValue += val;
                  }
                }
                pending.x.value = xValue;
              }
              
              if(pending.y.expr){
                const exprResult = this.evalExpr(pending.y.expr, false);
                yValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    yValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) yValue += val;
                  }
                }
                pending.y.value = yValue;
              }
              
              if(pending.rowlen.expr){
                const exprResult = this.evalExpr(pending.rowlen.expr, false);
                rowlenValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    rowlenValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) rowlenValue += val;
                  }
                }
                pending.rowlen.value = rowlenValue;
              }
              
              if(pending.data.expr){
                const exprResult = this.evalExpr(pending.data.expr, false);
                dataValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    dataValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) dataValue += val;
                  }
                }
                pending.data.value = dataValue;
              }
            }
            
            // Convert to integers
            let x = parseInt(xValue, 2);
            let y = parseInt(yValue, 2);
            const rowlen = parseInt(rowlenValue, 2);
            
            // Parse data into rows to calculate actual dimensions
            // rowlen is the number of bits per row
            // data contains all bits concatenated
            const rows = comp.attributes['row'] !== undefined ? parseInt(comp.attributes['row'], 10) : 8;
            const rectMap = {};
            let numRows = 0;
            
            // Split data into rows of rowlen bits each
            for(let r = 0; r < rows && r * rowlen < dataValue.length; r++){
              const startIdx = r * rowlen;
              const endIdx = Math.min(startIdx + rowlen, dataValue.length);
              const rowBits = dataValue.substring(startIdx, endIdx);
              if(rowBits.length > 0){
                rectMap[r] = rowBits;
                numRows = r + 1;
              }
            }
            
            // Adjust x and y based on corner
            // corner: 00 = top-left, 01 = top-right, 10 = bottom-left, 11 = bottom-right
            const corner = cornerValue.length >= 2 ? cornerValue.substring(cornerValue.length - 2) : '00';
            const cornerBits = corner.padStart(2, '0');
            
            if(cornerBits[1] === '1'){ // Right side (01 or 11)
              // Adjust x: x should be the right edge, so subtract width
              x = x - rowlen + 1;
            }
            
            if(cornerBits[0] === '1'){ // Bottom side (10 or 11)
            // Adjust y: y should be the bottom edge, so subtract height
            y = y - numRows + 1;
            }
            
            // Handle :rgb property if set
            let rgbColor = null;
            if(pending && pending.rgb !== undefined){
              let rgbValue = pending.rgb.value;
              
              // If re-evaluating, re-evaluate the expression
              if(reEvaluate && pending.rgb.expr){
                const exprResult = this.evalExpr(pending.rgb.expr, false);
                rgbValue = '';
                for(const part of exprResult){
                  if(part.value && part.value !== '-'){
                    rgbValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val) rgbValue += val;
                  }
                }
                pending.rgb.value = rgbValue;
              }
              
              // Convert hex value to #hex format
              // rgbValue is binary representation of hex (e.g., "111111" for ^3F)
              // We need to convert it back to hex string
              if(rgbValue && rgbValue.length > 0){
                // Check if the original expression is hex by examining the expr
                let isHex = false;
                if(pending.rgb.expr && pending.rgb.expr.length > 0){
                  for(const atom of pending.rgb.expr){
                    if(atom.hex){
                      isHex = true;
                      break;
                    }
                  }
                }
                
                if(isHex){
                  // Value is binary representation of hex, convert back to hex number then to string
                  const hexNum = parseInt(rgbValue, 2);
                  const hexStr = hexNum.toString(16).toUpperCase();
                  // Format as #RGB or #RRGGBB
                  if(hexStr.length <= 3){
                    // Expand short form (e.g., "3F3" -> "#3F3")
                    rgbColor = '#' + hexStr;
                  } else {
                    // Full form (e.g., "FF33FF" -> "#FF33FF")
                    rgbColor = '#' + hexStr;
                  }
                } else {
                  // If not hex, treat as binary and convert to hex
                  const hexNum = parseInt(rgbValue, 2);
                  const hexStr = hexNum.toString(16).toUpperCase();
                  // Determine padding based on expected length
                  const paddedHex = hexStr.length <= 3 ? hexStr.padStart(3, '0') : hexStr.padStart(6, '0');
                  rgbColor = '#' + paddedHex;
                }
                
                // Set the current color on LCD instance
                if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
                  lcdDisplays.get(lcdId).setCurrentColor(rgbColor);
                }
              }
            }
            
            // Call setRect with adjusted coordinates
            if(typeof lcdDisplays !== 'undefined' && lcdDisplays.has(lcdId)){
              lcdDisplays.get(lcdId).setRect(x, y, rectMap);
            }

            // Store lastCharValue for :get property
            // If :chr was used, use its value (8 bits); otherwise use first 8 bits of :data
            if(pending.chr !== undefined){
              let chrBinary = pending.chr.value || '00000000';
              // Ensure 8 bits
              if(chrBinary.length < 8){
                chrBinary = chrBinary.padStart(8, '0');
              } else if(chrBinary.length > 8){
                chrBinary = chrBinary.substring(chrBinary.length - 8);
              }
              comp.lastCharValue = chrBinary;
            } else if(dataValue && dataValue.length > 0){
              // No :chr, use first 8 bits of data as a fallback
              let dataBinary = dataValue.substring(0, Math.min(8, dataValue.length));
              if(dataBinary.length < 8){
                dataBinary = dataBinary.padStart(8, '0');
              }
              comp.lastCharValue = dataBinary;
            }
          }
        }
      }
    } else if(comp.type === 'led'){
      // Handle LED properties: value, set
      // Handle :set property
      if(pending && pending.set !== undefined){
        let setValue = pending.set.value;

        // If re-evaluating, re-evaluate the expression
        if(reEvaluate && pending.set.expr){
          const exprResult = this.evalExpr(pending.set.expr, false);
          setValue = '';
          for(const part of exprResult){
            if(part.value && part.value !== '-'){
              setValue += part.value;
            } else if(part.ref && part.ref !== '&-'){
              const val = this.getValueFromRef(part.ref);
              if(val) setValue += val;
            }
          }
          pending.set.value = setValue;
        }

        // Check if set is '1' (apply properties)
        if(setValue === '1' || setValue[setValue.length - 1] === '1'){
          // Apply :value if set
          if(pending.value !== undefined){
            let ledValue = pending.value.value;

            if(reEvaluate && pending.value.expr){
              const exprResult = this.evalExpr(pending.value.expr, false);
              ledValue = '';
              for(const part of exprResult){
                if(part.value && part.value !== '-'){
                  ledValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val) ledValue += val;
                }
              }
              pending.value.value = ledValue;
            }

            // Get bit width from component type and attributes
            const bits = this.getComponentBits(comp.type, comp.attributes) || 1;

            // Ensure value has correct length
            if(ledValue.length < bits){
              ledValue = ledValue.padStart(bits, '0');
            } else if(ledValue.length > bits){
              ledValue = ledValue.substring(ledValue.length - bits);
            }

            // Store value in component's ref
            if(comp.ref){
              this.setValueAtRef(comp.ref, ledValue);
            } else {
              // Create storage if needed
              const storageIdx = this.storeValue(ledValue);
              comp.ref = `&${storageIdx}`;
            }

            // Update LED display
            for(let i = 0; i < comp.deviceIds.length && i < ledValue.length; i++){
              const ledId = comp.deviceIds[i];
              const bitValue = ledValue[i] === '1';
              if(typeof setLed === 'function'){
                setLed(ledId, bitValue);
              }
            }
          }
        }
      }
    }
    
    // Only clear pending properties if not re-evaluating (they should persist for future updates)
    if(!reEvaluate){
      // Don't clear - keep them for future re-evaluations
      // this.componentPendingProperties.delete(compName);
      this.componentPendingSet.delete(compName);
    }
  }
  
  updateComponentValue(compName, value, bitRange){
    // Update a component's display value
    const comp = this.components.get(compName);
    if(!comp) return;
    
    if(comp.type === 'led'){
      // Extract bits based on bitRange if specified
      let bitsToUse = value;
      if(bitRange){
        const {start, end} = bitRange;
        const actualEnd = end !== undefined ? end : start;
        bitsToUse = value.substring(start, actualEnd + 1);
      }
      
      // Update each LED
      for(let i = 0; i < comp.deviceIds.length && i < bitsToUse.length; i++){
        const ledId = comp.deviceIds[i];
        const ledValue = bitsToUse[i] === '1';
        if(typeof setLed === 'function'){
          setLed(ledId, ledValue);
        }
      }
    } else if(comp.type === '7seg'){
      // Update 7-segment display
      let bitsToUse = value;
      if(bitRange){
        const {start, end} = bitRange;
        const actualEnd = end !== undefined ? end : start;
        bitsToUse = value.substring(start, actualEnd + 1);
      }
      
      // Update the display (only first device ID for 7seg)
      if(comp.deviceIds.length > 0){
        const segId = comp.deviceIds[0];
        // Update each segment (a-h, 8 bits)
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for(let i = 0; i < segments.length && i < bitsToUse.length; i++){
          const segName = segments[i];
          const segValue = bitsToUse[i] === '1';
          if(typeof setSegment === 'function'){
            setSegment(segId, segName, segValue);
          }
        }

        // Store lastSegmentValue for :get property (ensure 8 bits)
        let segmentValue = bitsToUse;
        if(segmentValue.length < 8){
          segmentValue = segmentValue.padEnd(8, '0');
        } else if(segmentValue.length > 8){
          segmentValue = segmentValue.substring(0, 8);
        }
        comp.lastSegmentValue = segmentValue;
      }
    }
  }
  
  updateConnectedComponents(varName, newValue){
    // Update all components connected to this variable/wire
    const varRef = this.vars.has(varName) ? this.vars.get(varName).ref : 
                   (this.wires.has(varName) ? this.wires.get(varName).ref : null);
    
    if(!varRef || varRef === '&-') return;
    
    // Check all component connections
    for(const [compName, conn] of this.componentConnections.entries()){
      // Check if connection references this variable
      if(typeof conn.source === 'string'){
        // Simple reference string
        if(conn.source === varRef || conn.source.includes(varRef)){
          // Re-evaluate the connection
          const value = this.getValueFromRef(conn.source);
          if(value !== null){
            this.updateComponentValue(compName, value, conn.bitRange);
          }
        }
      } else if(typeof conn.source === 'object' && conn.source.var === varName){
        // Expression reference
        const value = newValue;
        this.updateComponentValue(compName, value, conn.bitRange);
      }
    }
    
    // Find all wires that depend on this wire (cascade propagation)
    const dependentWires = new Set();
    const isWire = this.wires.has(varName);
    
    if(isWire){
      // Find all wires that depend on varName
      for(const ws of this.wireStatements){
        const expr = ws.assignment ? ws.assignment.expr : ws.expr;
        if(expr && this.exprReferencesWire(expr, varName)){
          if(ws.assignment){
            // Single wire assignment: wireName = expr
            const wireName = ws.assignment.target.var;
            if(wireName){
              dependentWires.add(wireName);
            }
          } else if(ws.decls && ws.expr){
            // Multiple wire declaration: type wire1 wire2 wire3 = expr
            // All declared wires depend on varName
            for(const decl of ws.decls){
              if(decl.name){
                dependentWires.add(decl.name);
              }
            }
          }
        }
      }
      
      // Re-execute wire statements for dependent wires
      // This ensures that when db changes, q = ANDA4(!db.12/4) is re-executed
      for(const depWireName of dependentWires){
        const depWire = this.wires.get(depWireName);
        if(!depWire) continue;
        
        // Find the wire statement for this dependent wire
        for(const ws of this.wireStatements){
          let shouldReexecute = false;
          let wireName = null;
          
          if(ws.assignment){
            // Single wire assignment: wireName = expr
            wireName = ws.assignment.target.var;
            if(wireName === depWireName){
              shouldReexecute = true;
            }
          } else if(ws.decls && ws.expr){
            // Multiple wire declaration: type wire1 wire2 wire3 = expr
            for(const decl of ws.decls){
              if(decl.name === depWireName){
                shouldReexecute = true;
                wireName = depWireName;
                break;
              }
            }
          }
          
          if(shouldReexecute){
            // Re-execute the wire statement
            this.execWireStatement(ws);
            
            // Get the new value
            if(depWire.ref){
              const refMatch = depWire.ref.match(/^&(\d+)/);
              if(refMatch){
                const storageIdx = parseInt(refMatch[1]);
                const stored = this.storage.find(s => s.index === storageIdx);
                if(stored){
                  // Recursively update connected components for this dependent wire
                  this.updateConnectedComponents(depWireName, stored.value);
                }
              }
            }
            break; // Found and re-executed, move to next dependent wire
          }
        }
      }
    }
    
    
    // Check property blocks that have dependencies on this wire/variable or dependent wires
    // This handles cases where a block depends on a wire (like hex = da.3/4) but setExprDirectRef is null or constant
    // Group blocks by component to execute them in order for each component
    // componentPropertyBlocks is already in program order, so we maintain that order
    const blocksByComponent = new Map();
    for(const block of this.componentPropertyBlocks){
      // Skip blocks that were already checked in updateComponentConnections (they have setExprDirectRef pointing to components)
      if(block.setExpr && block.setExprDirectRef && block.setExprDirectRef.type === 'component'){
        continue;
      }
      
      if(!blocksByComponent.has(block.component)){
        blocksByComponent.set(block.component, []);
      }
      blocksByComponent.get(block.component).push(block);
    }
    
    // Process blocks for each component in order
    for(const [compName, blocks] of blocksByComponent.entries()){
      // Sort blocks by their original order in componentPropertyBlocks to maintain program order
      const blockIndices = new Map();
      for(let i = 0; i < this.componentPropertyBlocks.length; i++){
        const block = this.componentPropertyBlocks[i];
        if(block.component === compName && !blockIndices.has(block)){
          blockIndices.set(block, i);
        }
      }
      const sortedBlocks = [...blocks].sort((a, b) => {
        const idxA = blockIndices.get(a) ?? Infinity;
        const idxB = blockIndices.get(b) ?? Infinity;
        return idxA - idxB;
      });
      
      const blocksToExecute = [];
      
      // First, check if any block for this component should execute based on wire dependencies
      let hasAnyWireDependentBlock = false;
      for(const block of sortedBlocks){
        // Skip blocks that were already checked in updateComponentConnections (they have setExprDirectRef pointing to components)
        if(block.setExpr && block.setExprDirectRef && block.setExprDirectRef.type === 'component'){
          continue;
        }
        
        // Check if this block has dependencies that include this wire/variable or any dependent wire
        let hasDependency = false;
        if(isWire && block.wireDependencies){
          // Check direct dependency
          if(block.wireDependencies.has(varName)){
            hasDependency = true;
          }
          // Check indirect dependency (through dependent wires)
          if(!hasDependency){
            for(const depWire of dependentWires){
              if(block.wireDependencies.has(depWire)){
                hasDependency = true;
                break;
              }
            }
          }
        } else if(!isWire && block.dependencies && block.dependencies.has(varName)){
          hasDependency = true;
        }
        
        // Also check if setExprDirectRef points to this wire or a dependent wire
        if(!hasDependency && block.setExprDirectRef && block.setExprDirectRef.type === 'wire'){
          if(block.setExprDirectRef.name === varName){
            hasDependency = true;
          } else if(dependentWires.has(block.setExprDirectRef.name)){
            hasDependency = true;
          }
        }
        
        // Also check if setExpr references this wire or dependent wires (for user-defined functions)
        if(block.setExpr){
          if(this.exprReferencesWire(block.setExpr, varName)){
            hasDependency = true;
          } else {
            for(const depWire of dependentWires){
              if(this.exprReferencesWire(block.setExpr, depWire)){
                hasDependency = true;
                break;
              }
            }
          }
        }
        
        if(hasDependency){
          hasAnyWireDependentBlock = true;
          break;
        }
      }
      
      // If any block depends on the wire, process all blocks in program order
      // This ensures constant blocks execute before wire-dependent blocks
      if(hasAnyWireDependentBlock){
        for(const block of sortedBlocks){
          // Skip blocks that were already checked in updateComponentConnections
          if(block.setExpr && block.setExprDirectRef && block.setExprDirectRef.type === 'component'){
            continue;
          }
          
          // Check if this block should execute
          let shouldExecute = false;
          
          // Check if it's a constant set=1 block
          // A block is considered "constant set=1" if setExpr is constant '1', regardless of other dependencies
          // But it should only execute if its properties (not 'set') depend on the changed variable
          let isConstantBlock = false;
          if(block.setExpr && block.setExpr.length === 1){
            const atom = block.setExpr[0];
            if((atom.bin === '1') || (atom.hex === '1') || (atom.dec === '1')){
              // Check if setExpr itself has no dependencies (it's just a constant '1')
              const setExprHasWireDep = this.exprReferencesWire(block.setExpr, varName) || 
                                        Array.from(dependentWires).some(dw => this.exprReferencesWire(block.setExpr, dw));
              const setExprHasDep = !isWire && block.dependencies && block.dependencies.has(varName);
              if(!setExprHasWireDep && !setExprHasDep){
                // This is a constant set=1 block
                isConstantBlock = true;
                
                // Check if any of the block's properties (excluding 'set') depend on the changed variable
                let hasPropertyDependency = false;
                if(isWire && block.wireDependencies && block.wireDependencies.has(varName)){
                  hasPropertyDependency = true;
                } else if(isWire && block.wireDependencies){
                  for(const depWire of dependentWires){
                    if(block.wireDependencies.has(depWire)){
                      hasPropertyDependency = true;
                      break;
                    }
                  }
                } else if(!isWire && block.dependencies && block.dependencies.has(varName)){
                  hasPropertyDependency = true;
                }
                
                if(hasPropertyDependency){
                  shouldExecute = true;
                }
              }
            }
          }
          
          // If not a constant block, check if it has dependencies
          if(!shouldExecute){
            let hasDependency = false;
            if(isWire && block.wireDependencies){
              if(block.wireDependencies.has(varName)){
                hasDependency = true;
              } else {
                for(const depWire of dependentWires){
                  if(block.wireDependencies.has(depWire)){
                    hasDependency = true;
                    break;
                  }
                }
              }
            } else if(!isWire && block.dependencies && block.dependencies.has(varName)){
              hasDependency = true;
            }
            
            if(!hasDependency && block.setExprDirectRef && block.setExprDirectRef.type === 'wire'){
              if(block.setExprDirectRef.name === varName || dependentWires.has(block.setExprDirectRef.name)){
                hasDependency = true;
              }
            }
            
            if(block.setExpr){
              if(this.exprReferencesWire(block.setExpr, varName)){
                hasDependency = true;
              } else {
                for(const depWire of dependentWires){
                  if(this.exprReferencesWire(block.setExpr, depWire)){
                    hasDependency = true;
                    break;
                  }
                }
              }
            }
            
            if(!hasDependency){
              continue; // Skip this block
            }
          }
          
          // For blocks that should execute, check if set is 1
          const onMode = block.onMode || 'raise';
          if(onMode === '1' || onMode === 'level'){
            // Re-evaluate the set expression to check if it's 1
            let setValue = '0';
            if(block.setExpr){
              const exprResult = this.evalExpr(block.setExpr, false);
              setValue = '';
              for(const part of exprResult){
                if(part.value !== undefined && part.value !== null && part.value !== '-'){
                  setValue += part.value;
                } else if(part.ref && part.ref !== '&-'){
                  const val = this.getValueFromRef(part.ref);
                  if(val && val !== '-' && val !== null){
                    setValue += val;
                  }
                }
              }
              if(setValue === ''){
                setValue = '0';
              }
            }
            
            const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
            if(setBit === '1'){
              blocksToExecute.push(block);
            }
          } else if(onMode === 'raise' || onMode === 'rising'){
            // For edge-triggered blocks, check if value changed from 0 to 1
            if(newValue && newValue.length > 0 && newValue[newValue.length - 1] === '1'){
              // Re-evaluate the set expression
              let setValue = '0';
              if(block.setExpr){
                const exprResult = this.evalExpr(block.setExpr, false);
                setValue = '';
                for(const part of exprResult){
                  if(part.value !== undefined && part.value !== null && part.value !== '-'){
                    setValue += part.value;
                  } else if(part.ref && part.ref !== '&-'){
                    const val = this.getValueFromRef(part.ref);
                    if(val && val !== '-' && val !== null){
                      setValue += val;
                    }
                  }
                }
                if(setValue === ''){
                  setValue = '0';
                }
              }
              
              const setBit = setValue.length > 0 ? setValue[setValue.length - 1] : '0';
              if(setBit === '1'){
                blocksToExecute.push(block);
              }
            }
          }
        }
      }
      
      // Execute all blocks for this component in order (they're already in program order)
      // Track executed blocks to avoid double execution from updateComponentConnections
      if(blocksToExecute.length > 0){
        const executedBlockKeys = new Set();
        for(let i = 0; i < blocksToExecute.length; i++){
          const block = blocksToExecute[i];
          const blockKey = `${block.component}:${block.blockIndex}`;
          if(!executedBlockKeys.has(blockKey)){
            executedBlockKeys.add(blockKey);
            this.executePropertyBlock(block.component, block.properties, true);
          }
        }
        
        // Store executed blocks to prevent re-execution in updateComponentConnections
        // Merge with existing justExecutedBlocks to handle multiple components
        if(!this.justExecutedBlocks){
          this.justExecutedBlocks = new Set();
        }
        for(const key of executedBlockKeys){
          this.justExecutedBlocks.add(key);
        }
        
        // Update connections once after all blocks are executed
        this.updateComponentConnections(compName);
        
        // Clear the executed blocks tracking after ALL synchronous updates and callbacks are done
        // Use setTimeout to ensure this happens after onChange and other callbacks
        setTimeout(() => {
          this.justExecutedBlocks = null;
        }, 0);
      }
      
      // Update UI after executing all blocks for this component
      if(blocksToExecute.length > 0 && typeof showVars === 'function'){
        showVars();
      }
    }
  }

}

class DeviceManager {
  constructor() {
    this.device = [];
  }
  addDevice(dev, inputs, outputs) {
    // add device to the html
    // add events
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
    if(fileRef===-1) {
      throw Error(`file ${name} not found in ${location}!`);
    }
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
    
      newFileStr += (newFileStr.length ? '|':'') + fileStr;
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

const lib_files = {
//  def_ors: ``,
  def_ands: `
  def A2(3bit a):
   :1bit XOR(a.0, a.1)
   :1bit XOR(a.1, a.2)

def AND3(3bit a):
   :1bit AND(a.0, AND(a.1, a.2))

def AND4(4bit a):
   :1bit AND(a.0, AND3(a.1/3))

def AND5(5bit a):
   :1bit AND(AND(a.0, a.1), AND3(a.2/3))

def AND6(6bit a):
   :1bit AND(AND3(a.0-2), AND3(a.3-5))

def AND7(7bit a):
   :1bit AND(AND4(a.0-3), AND3(a.4-6))
  `,


ex_mem_shifter2: `

comp [key] .k:
    label:'v'
    on:1
    nl
    :

comp [dip] .i0:
    noLabels 
    visual:1
    on:1
    nl
    :
4wire i0= .i0
comp [led] .l00::
comp [led] .l01::
comp [led] .l02::
comp [led] .l03:
   on:1
   nl
   :
comp [led] .l10::
comp [led] .l11::
comp [led] .l12::
comp [led] .l13:
   on:1
   nl
   :
comp [led] .l20::
comp [led] .l21::
comp [led] .l22::
comp [led] .l23:
   on:1
   nl
   :
comp [led] .l30::
comp [led] .l31::
comp [led] .l32::
comp [led] .l33:
   on:1
   nl
   :




 comp [counter] .c:
      depth: 3
      on: 1
      :
   comp [-] .sub:
      depth: 3
      on: 1
      :


comp [mem] .r:
   depth: 4
   length: 4
   on:1
   :

1wire end= 0
1wire qend = !end
1wire k=.k 
4wire r0
4wire r1
4wire r2
.r:{
   at=10
   get>= r2
   set = k
}
.r:{
   at=11
   data= r2
   write =k
   set= k
}
.r:{
   at=1
   get>= r1
   set = k
}
.r:{
   at=10
   data= r1
   write = k
   set= k
}
.r:{
   at=0
   get>= r0
   set = k
}
.r:{
   at=1
   data = r0
   write = k
   set = k
}
.r:{
   at=0
   data = i0
   write = k
   set = k
}
4wire t0 = 0000
.r:{
   at=0
   get>= t0
   set= k
}
.l00= t0.0
.l01= t0.1
.l02= t0.2
.l03= t0.3

4wire t1 = 0000
.r:{
   at=1
   get>= t1
   set= k
}
.l10= t1.0
.l11= t1.1
.l12= t1.2
.l13= t1.3

4wire t2 = 0000
.r:{
   at=10
   get>= t2
   set= k
}
.l20= t2.0
.l21= t2.1
.l22= t2.2
.l23= t2.3

4wire t3 = 0000
.r:{
   at=11
   get>= t3
   set= k
}
.l30= t3.0
.l31= t3.1
.l32= t3.2
.l33= t3.3

   3wire cc
   .c:{
     dir=1
     set=k
     get>= cc
   }
   
 
.sub:{
  a= 100
  b= cc
  set= .k
  carry>= end 
}



`,

ex_calc3: `


def EQ(3bit a, 3bit b):
    1bit r0 = !XOR(a.0, b.0)
    1bit r1 = !XOR(a.1, b.1)
    1bit r2 = !XOR(a.2, b.2)
    :1bit AND(AND(r0, r1), r2)


comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :

.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}
.q1:{
   at= crs
   data = 0001
   write= 1
   set = .k1
}
1wire k= OR(.k1, .k2)
4wire mem0
4wire mem1
4wire mem2

.q1:{
   at= crs
   set= k
   get>= mem0
}

1wire eq
1wire eq1
1wire eq2



.crs:{
   dir= 1
   set= k
}
eq = EQ(.crs:get, 000)
eq1 = EQ(.crs:get, 001)
eq2 = EQ(.crs:get, 010)

.g:{
   hex= mem0
   set= EQ(crs, 000)
}

.f:{
   hex= mem0
   set= EQ(crs, 001)
}



`,

ex_calc2_3: `



comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :

.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}

.q1:{
   at= crs
   data = 0001
   write= 1
   set = .k1
}

4wire mem0
4wire mem1
4wire mem2
1wire k = OR(.k1, .k2)
.q1:{
   at=0
   set= .k1
   get>= mem0
}
.q1:{
   at=1
   set= .k1
   get>= mem1
}
.q1:{
   at=10
   set= .k1
   get>= mem2
}
.q1:{
   at=0
   set= .k2
   get>= mem0
}
.q1:{
   at=1
   set= .k2
   get>= mem1
}
.q1:{
   at=10
   set= .k2
   get>= mem2
}

.g:{
   hex= mem0
   set= k
}
.f:{
   hex= mem1
   set= k
}
.e:{
   hex= mem2
   set= k
}


.crs:{
   dir= 1
   set= .k1
}

.crs:{
   dir= 1
   set= .k2
}

`,

ex_calc2_4: `





comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :


.q1:{
   at= crs
   data= 0011
   write=1
   set= .k3
}
.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}

.q1:{
   at= crs
   data = 0001
   write= 1
   set = .k1
}

4wire mem0
4wire mem1
4wire mem2
4wire mem3
4wire mem4

1wire k = OR( OR(.k1, .k2), .k3)
.q1:{
   at=0
   set= .k1
   get>= mem0
}
.q1:{
   at=1
   set= .k1
   get>= mem1
}
.q1:{
   at=10
   set= .k1
   get>= mem2
}
.q1:{
   at=11
   set= .k1
   get>= mem3
}
.q1:{
   at=100
   set= .k1
   get>= mem4
}



.q1:{
   at=0
   set= .k2
   get>= mem0
}
.q1:{
   at=1
   set= .k2
   get>= mem1
}
.q1:{
   at=10
   set= .k2
   get>= mem2
}
.q1:{
   at=11
   set= .k2
   get>= mem3
}
.q1:{
   at=100
   set= .k2
   get>= mem4
}

.q1:{
   at=0
   set= .k3
   get>= mem0
}
.q1:{
   at=1
   set= .k3
   get>= mem1
}
.q1:{
   at=10
   set= .k3
   get>= mem2
}
.q1:{
   at=11
   set= .k3
   get>= mem3
}
.q1:{
   at=100
   set= .k3
   get>= mem4
}


.g:{
   hex= mem0
   set= k
}
.f:{
   hex= mem1
   set= k
}
.e:{
   hex= mem2
   set= k
}
.d:{
   hex= mem3
   set= k
}
.c:{
   hex= mem4
   set= k
}



.crs:{
   dir= 1
   set= .k1
}
.crs:{
   dir= 1
   set= .k2
}
.crs:{
   dir=1
   set= .k3
}

`,

ex_calc2: `

comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :

.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}

4wire mem0
4wire mem1
4wire mem2

.q1:{
   at=0
   set= .k2
   get>= mem0
}
.q1:{
   at=1
   set= .k2
   get>= mem1
}
.q1:{
   at=10
   set= .k2
   get>= mem2
}

.g:{
   hex= mem0
   set= .k2
}

.f:{
   hex= mem1
   set= .k2
}


.crs:{
   dir= 1
   set= .k2
}


`,


ex_calc: `
comp [7seg] .a:
   color: ^9b3
   on:1
   :
comp [7seg] .b:
   color: ^9b3
   on:1
   :
comp [7seg] .c:
   color: ^9b3
   on:1
   :
comp [7seg] .d:
   color: ^9b3
   nl
   on:1
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .ke:
   label:'='
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kd:
   label:':'
   nl
   :




`,
  
ex_7seg_dec2: `






def ANDA4(4bit a):
   :1bit AND( AND(a.0, a.1), AND(a.2, a.3))







comp [dip] .sg:
   text: 'Sign'
   length: 1
   = 0
   visual: 1
   noLabels
   :1bit
comp [dip] .as:
   text: 'A'
   length: 16
   = 00000000
   nl
   visual:1
   noLabels
   :8bit

16wire as = MUX1(.sg, .as, !.as)


comp [7seg] .f:
   text: "="
   color: ^9b3
   on:1
   :
comp [7seg] .e:
   color: ^9b3
   on:1
   :
comp [7seg] .a:
   color: ^9b3
   on:1
   :
comp [7seg] .b:
   color: ^9b3
   on:1
   :
comp [7seg] .c:
   color: ^9b3
   on:1
   :
comp [7seg] .d:
   color: ^9b3
   on:1
   :

comp [divider] .dv:
   depth: 16
   on:1
   :
comp [divider] .dx:
   depth: 16
   on:1
   :
comp [divider] .dy:
   depth: 16
   on:1
   :
comp [divider] .dz:
   depth: 16
   on:1
   :

16wire da
16wire db
16wire dc
16wire dd
16wire de
16wire df
16wire dg
16wire dh

.dv:{
   a = as
   b = 1010
   set = 1
   get>= da
   mod>= db
}
.dx:{
   a = da
   b = 1010
   set = 1
   get>= dc
   mod>= dd
}
.dy:{
   a = dc
   b = 1010
   set = 1
   get>= de
   mod>= df
}
.dz:{
   a = de
   b = 1010
   set = 1
   get>= dg
   mod>= dh
}
.f:{
  g = MUX1(.sg, 0, 1)
  set = 1
}
.e:{
  hex = dg.12/4
  set = 1
}
.a:{
   hex = dh.12/4
   set = 1
}

.b:{
   hex = df.12/4
   set = 1
}

.c:{
   hex = dd.12/4
   set = 1
}

.d:{
   hex = db.12/4
   h=1
   set = 1
}

1wire e0 = ANDA4(!dg.12/4)
1wire a0 = AND(ANDA4(!dh.12/4), e0)
1wire b0 = AND(ANDA4(!df.12/4), a0)
1wire c0 = AND(ANDA4(!dd.12/4), b0)
1wire d0 = AND(ANDA4(!db.12/4), c0)


.e:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= e0
}

.a:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= a0
}

.b:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= b0
}

.c:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= c0
}


.d:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   h=0
   set= d0
}

NEXT(~)


`,
  
ex_7seg_dec: `


comp [dip] .as:
   text: 'A'
   length: 8
   = 00000000
   nl
   :8bit

8wire as = .as

comp [7seg] .b:
   text:"AB"
   color: ^9b3
   on:1
   :
comp [7seg] .c:
   color: ^9b3
   on:1
   :
comp [7seg] .d:
   color: ^9b3
   on:1
   :

comp [divider] .dv:
   depth: 8
   on:1
   :

comp [divider] .dx:
   depth: 8
   on:1
   :

8wire da
8wire db
8wire dc
8wire dd

.dv:{
   a = .as
   b = 1010
   set = 1
   get>= da
   mod>= db
}


.dx:{
   a = da
   b = 1010
   set = 1
   get>= dc
   mod>= dd
}

.b:{
   hex = dc.4/4
   set = 1
}

.c:{
   hex = dd.4/4
   set = 1
}

.d:{
   hex = db.4/4
   set = 1
}


`,
  
ex_counter_plus_minus: `

comp [key] .s1:
   label:"lf"
   on:1
   :

comp [key] .s2:
   label: "rg"
   on:1
   :

comp [=] .crs:
   depth: 4
   = 0000
   on:1
   :
4wire crs0
.crs:{
  dir= 0
  set= .s1
  get>= crs0
}
.crs:{
  dir= 1
  set= .s2
  get>=crs0
}

`,
ex_mem_sep_blocks_v2: `

comp [key] .s1:
   label: "1"
   size: 36
   :
comp [key] .s2:
   label: "2"
   size: 36
   :

comp [mem] .mem:
  depth: 8
  length: 16
  on:1
  :

8wire at10

.mem:{
  at= 10
  data= ^FF
  write= 1
  set= .s1
  get>= at10
}
8wire k 
.mem:{
   at= 10
   set= .s2
   get>= k
}
8wire b = .mem:get

`,

ex_pcb_bcd: `



pcb +[bcd]:
   4pin sum
   1pin set
   4pout corr
   1pout carry
   exec: set
   on:1

   comp [-] .sub:
      on:1
      :

   .sub:a = sum
   .sub:b = MUX1(set, 0000, 1010)
   .sub:set = set
   corr = .sub:get
   carry = .sub:carry 

   :1bit set

pcb [bcd] .b::

.b:sum = 1111
.b:set = 0

show(.b:corr)
show(.b:carry)






`,

ex_pcb_w_mem: `
pcb +[comp1]:
   4pin adr
   8pin data
   8pout get
   1pin set
   1pin write
   exec: set
   on: 1
   comp [mem] .ram:
      depth: 8
      length: 16
      on: 1
      :
   .ram:at = adr
   get = .ram:get
   ~~
   .ram:{ 
      at = adr
      data = data
      write = 1
      set = set
   }
   get = .ram:get
   :1bit set

# new instance
pcb [comp1] .a::

pcb [comp1] .b::

# using it
.a:adr = ^F
.a:data = ^AB
.a:write = 1
.a:set = 1
8wire out = .a:get

.b:adr = ^F
8wire out2 = .b:get

show(.a:get)
NEXT(~)
show(.a:get)
`,

  ex_7seg_alu_rotary: `
  

  


  


comp [switch] .on:
   text: 'Pwr'
   :

comp [led] .pwr:
   color: ^21f
   nl
   text: 'ON'
   :

.pwr = .on

comp [rotary] .op:
    text: "R1"
    for.0: "+"
    for.1: "-"
    for.2: "x"
    for.3: ":"
    states : 4
    :

comp [led] .w:
    nl
    :

comp [dip] .as:
   text: 'A'
   length: 4
   visual: 1
   noLabels
   = 0000
   :8bit

comp [dip] .bs:
   text: "B"
   length: 4
   visual: 1
   noLabels
   nl
   :4bit

comp [7seg] .a:
   text: "A"
   :

comp [7seg] .b:
   text:"B"
   :
comp [7seg] .c:
   text:"AB"
   color: ^bb3
   :
comp [7seg] .d:
   color: ^3ba
   :

.a:hex = 0
.a:set = 1
.b:hex = 0
.b:set = 1

.a:hex = .as
.b:hex = .bs
.a:set = 1
.b:set = 1

comp [adder] .ad:
   depth: 4
   :

comp [subtract] .sb:
   depth: 4
   :

comp [multiplier] .mp:
   depth: 4
   :

comp [divider] .dv:
   depth: 4
   :
   
.ad:a = .as
.ad:b = .bs

.sb:a = .as
.sb:b = .bs

.mp:a = .as
.mp:b = .bs

.dv:a = .as
.dv:b = .bs

show(.ad:get)
show(.ad:carry)


.c:hex = MUX2(.op, .ad:carry, .sb:carry, .mp:over, .dv:mod)
.c:set = 1

.d:hex = MUX2(.op, .ad:get, .sb:get, .mp:get, .dv:get)
.d:set = 1

2wire qq = .op

.c:set = .as + .bs
.d:set = .as + .bs

  

  

  `,
ex_7seg_alu: `


comp [switch] .on:
   text: 'Pwr'
   :

comp [led] .pwr:
   color: ^21f
   nl
   text: 'ON'
   :

.on = 1
.pwr = .on

comp [dip] .op:
   text: 'Op'
   length: 4
   nl
   :4bit

comp [dip] .as:
   text: 'A'
   length: 4
   = 0000
   :8bit

comp [dip] .bs:
   text: "B"
   length: 4
   nl
   :4bit

comp [7seg] .a:
   text: "A"
   :

comp [7seg] .b:
   text:"B"
   :
comp [7seg] .c:
   text:"AB"
   color: ^9b3
   :
comp [7seg] .d:
   color: ^9b3
   :

.a:hex = 0
.a:set = 1
.b:hex = 0
.b:set = 1

.a:hex = .as
.b:hex = .bs
.a:set = 1
.b:set = 1

comp [adder] .ad:
   depth: 4
   :

comp [subtract] .sb:
   depth: 4
   :

comp [multiplier] .mp:
   depth: 4
   :

comp [divider] .dv:
   depth: 4
   :
   
.ad:a = .as
.ad:b = .bs

.sb:a = .as
.sb:b = .bs

.mp:a = .as
.mp:b = .bs

.dv:a = .as
.dv:b = .bs

show(.ad:get)
show(.ad:carry)


.c:hex = MUX2(.op.0/2, .ad:carry, .sb:carry, .mp:over, .dv:mod)
.c:set = 1

.d:hex = MUX2(.op.0/2, .ad:get, .sb:get, .mp:get, .dv:get)
.d:set = 1

.c:set = ~
.d:set = ~
`,
ex_7seg_adder: `

comp [switch] .on:
   text: 'Pwr'
   :

comp [led] .pwr:
   color: ^21f
   nl
   text: 'ON'
   :

.on = 1
.pwr = .on

comp [dip] .as:
   text: 'A'
   length: 4
   = 0000
   :8bit

comp [dip] .bs:
   text: "B"
   length: 4
   nl
   :4bit

comp [7seg] .a:
   text: "A"
   :

comp [7seg] .b:
   text:"B"
   :
comp [7seg] .c:
   text:"AB"
   color: ^9b3
   :
comp [7seg] .d:
   color: ^9b3
   :

.a:hex = 0
.a:set = 1
.b:hex = 0
.b:set = 1

.a:hex = .as
.b:hex = .bs
.a:set = 1
.b:set = 1

comp [adder] .ad:
   depth: 4
   :

   
.ad:a = .as
.ad:b = .bs

show(.ad:get)
show(.ad:carry)

.c:hex = .ad:carry
.c:set = 1

.d:hex = .ad:get
.d:set = 1

.c:set = ~
.d:set = ~`,
  ex_mem_counter:
  `
    comp [counter] .c:
   depth: 5
   = 00000
   :

  comp [mem] .rom:
   depth: 8
   length: 256
   :


.rom:at = 0
.rom:data = ^1234 5678 9ABC + ^DF FF
.rom:write = 1
.rom:set = 1

.c:dir = 1
.c:set = 1

.rom:at = .c:get
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)


.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)


.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

  `,
  ex_counter: `
  
  comp [counter] .c:
   depth: 5
   = 00100
   :
#this should have a js function like addCounter({ depth: 4, default: "0000" })
#if no default is set then use 0
#this should execute:
#addCounter({depth: 5, default: "00100" })


.c:dir = 1
#sets the direction to increment
.c:data = 10100
.c:write = 1
#sets the date to be 10100 
.c:set = 1
#the value is changed imediatly and because the direction is increment it will changed to 10101 
#if the value was 11111 then the increment should change it to 00000
show(.c:get) 

.c:set = ~
#the value is changed on the next NEXT(~) 

.c:dir = 0
#sets the direction to decrement
.c:data = 00000
.c:write = 1
.c:set = 1
#the value is changed imediatly and because the direction is decrement it will be changed to 11111

show(.c:get) 
#this should show the current value of the counter meaning 11111

.c:dir = 0
.c:set = 1
show(.c:get) 

.c:set = 1
show(.c:get) 
.c:set = 1
show(.c:get) 
  

  `,
  
  ex_mem: `
  
  comp [mem] .rom:
   depth: 8
   length: 256
   :


.rom:at = 0
.rom:data = ^1234 5678 9ABC + ^DF
.rom:write = 1
.rom:set = 1
#this sets 7 values for address 0 to 6 now

5bit adr = 00100
8bit val2 = ^0F
.rom:at = adr
.rom:data = val2

show(.rom:get)
#shows 10011010 

show(adr)
.rom:set = ~
#this will set for address 5 the value 0 when NEXT(~)  will be executed

show(.rom:get)
#shows 00001111 
NEXT(~)
show(.rom:get)
#shows 00001111


  
  `,
  
  ex_lcd_mem9_clr: `
  
  
def NOTE(4bit a):
    :1bit NOT(a.0)
    :1bit NOT(a.1) 
    :1bit NOT(a.2)
    :1bit NOT(a.3)

def AND4(4bit a):
    :1bit AND( AND(a.0, a.1), AND(a.2, a.3))

  
comp [key] .clr:
  label:"Clr"
  size: 50
  :
comp [key] .lf:
  label:"lf"
  :
comp [key] .rg:
  label:"rg"
  :

comp [mem] .mem:
  depth: 8
  length: 16
  on: 1
  :


.mem:at = 0
.mem:data = ^4865 6c6c 6f20 576f 726c 6420 3a21 205f 
.mem:write = 1
.mem:set = 1

comp [lcd] .lcd1:
  row: 8
  cols: 100
  pixelSize: 2
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  on:1
  :

comp [counter] .c:
   depth: 4
   = 0000
   :

comp [counter] .crs:
   depth: 5
   = 00000
   on:1
   :
5wire crs
.crs:{
  dir= 1
  set= .rg
  get>= crs
}
.crs:{
  dir= 0
  set= .lf
  get>= crs
}


comp [multiplier] .ml:
   :
comp [adder] .add:
   :

4wire q= .c:get
1wire clr = .clr

1wire k = MUX1(clr, 1, ~)


.c:{
  dir = 1
  data = 0000
  write = clr
  set = ~
}


5wire m1= .ml:get
5wire m2= .ml:over
.add:{
 a= crs
 b= .c:get
 set= ~
}
5wire j2= .add:carry + .add:get
.ml:{
  a= .add:get
  b= ^6
  set = ~
}

8wire j 
.mem:{
   at= q
   set= ~
   get>= j
}

.lcd1:{
  clear= clr
  set = k
}

.lcd1:{ 
  x = .ml:over + .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = .mem:get
  set = k
}
  

  
  

  `,
  
  ex_lcd_mem5_clr: `
  
  
  
def NOTE(4bit a):
    :1bit NOT(a.0)
    :1bit NOT(a.1) 
    :1bit NOT(a.2)
    :1bit NOT(a.3)

def AND4(4bit a):
    :1bit AND( AND(a.0, a.1), AND(a.2, a.3))

  
comp [key] .clr:
  label:"Clr"
  size: 50
  :


comp [mem] .mem:
  depth: 8
  length: 16
  :


.mem:at = 0
.mem:data = ^4865 6c6c 6f20 576f 726c 6420 3a21 205f 
.mem:write = 1
.mem:set = 1

comp [lcd] .lcd1:
  row: 8
  cols: 100
  pixelSize: 2
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  on:1
  :

comp [counter] .c:
   depth: 4
   = 0000
   :

comp [multiplier] .ml:
   :


4wire q= .c:get
1wire clr = .clr
#1wire clr = MUX1(AND4(NOTE(q)), .clr, 1)
1wire k = MUX1(clr, 1, ~)

.c:{
  dir = 1
  data = 0000
  write = clr
  set = ~
}

#4wire q= .c:get

5wire m1= .ml:get
5wire m2= .ml:over
.ml:{
  a= .c:get
  b= ^6
  set = ~
}

.mem:{
   at= q
   set= 1
}
8bit j = .mem:get

.lcd1:{ 
  clear = clr
  x = .ml:over + .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = .mem:get
 # chr = ^4 + q
  set = k
}
  `,
  
  ex_lcd_mem_key: `
  
  
  
  

  
comp [key] .clr:
  label:"Clr"
  size: 50
  :


comp [mem] .mem:
  depth: 8
  length: 16
  = 48 65 6c 6c 6f 20 57 6f 72 6c 64
  :


.mem:at = 0
.mem:data = ^48 65 6c 6c 6f 20 57 6f 72 6c 64 20 3a 21 20 5f 
.mem:write = 1
.mem:set = 1

comp [lcd] .lcd1:
  row: 8
  cols: 100
  pixelSize: 2
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  on:1
  :

comp [counter] .c:
   depth: 4
   = 0000
   :

comp [multiplier] .ml:
   :


1wire clr = .clr
1wire k = MUX1(clr, 1, ~)

.c:dir = 1
.c:set = ~

4wire q= .c:get

5wire m1= .ml:get
5wire m2= .ml:over
.ml:{
  a= .c:get
  b= ^6
  set = ~
}

.mem:{
   at= q
   set= 1
}
8bit j = .mem:get

.lcd1:{ 
  clear = clr
  x = .ml:over + .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = .mem:get
 # chr = ^4 + q
  set = k
}
  
  
  
  
  
  `,
  ex_lcd2: `
  

comp [lcd] .lcd1:
  row: 8
  cols: 40
  pixelSize: 7
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  :

comp [counter] .c:
   depth: 4
   = 0001
   :

comp [multiplier] .ml:
   :

.c:dir = 1
.c:set = ~

4wire q= .c:get

4wire m1= .ml:get
4wire m2= .ml:over
.ml:{
  a= .c:get
  b= ^1
  set = ~
}

.lcd1:{ 
  clear = MUX2(q.0/2,1,0,0,0)
  x = .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = ^4 + q
  set = ~
}
  
  
  
  `,
  
  ex_lcd: `

comp [lcd] .lcd1:
  row: 8
  cols: 20
  pixelSize: 7
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  nl
  :

comp [counter] .c:
   depth: 3
   = 000
   :

.c:dir = 1
.c:set = ~

5wire q= .c:get


.lcd1:clear = 1
.lcd1:x = .c:get
.lcd1:y = 0
.lcd1:rowlen = 101
.lcd1:chr = ^41
.lcd1:data = 0111010001100000111000001100010111000000
.lcd1:set = ~
  
  `,
  
  
  ex_pcb_shifter2: `
  
  
pcb +[sh4]:
   4pin in
   16pout get
   1pin into
   1pin set
   4pout out
   16pout all
   exec: set
   on: 1
   comp [shifter] .sh0:
      depth: 4
      on: 1
      :
   comp [shifter] .sh1:
      depth: 4
      on: 1
      :
   comp [shifter] .sh2:
      depth: 4
      on: 1
      :
   comp [shifter] .sh3:
      depth: 4
      on: 1
      :
   1wire i = into
   .sh0:dir=i
   .sh1:dir=i
   .sh2:dir=i
   .sh3:dir=i
   .sh0:in=MUX1(i, 0, in.0)
   .sh1:in=MUX1(i, 0, in.1)
   .sh2:in=MUX1(i, 0, in.2)
   .sh3:in=MUX1(i, 0, in.3)
   .sh0:set= set
   .sh1:set= set
   .sh2:set= set
   .sh3:set= set
   out = .sh0:out + .sh1:out + .sh2:out +.sh3:out
   get = .sh0:get + .sh1:get + .sh2:get +.sh3:get
   4bit sh0= .sh0:get
   4bit sh1= .sh1:get
   4bit sh2= .sh2:get
   4bit sh3= .sh3:get
   4bit m0= sh0.0 + sh1.0 + sh2.0 + sh3.0
   4bit m1= sh0.1 + sh1.1 + sh2.1 + sh3.1
   4bit m2= sh0.2 + sh1.2 + sh2.2 + sh3.2
   4bit m3= sh0.3 + sh1.3 + sh2.3 + sh3.3
   all = m0 +m1+ m2+ m3
   #all= sh0+ sh1+sh2+sh3
   ~~
   :1bit set

# new instance
8wire g
pcb [sh4] .a::

.a:in=1111
.a:into=1
.a:set=1
.a:in=1010
.a:into=1
.a:set=1
.a:in=1100
.a:into=1
.a:set=1
#.a:into=0
#.a:set=1
16wire a=.a:all
4bit o=.a:out
show(a.0/8, a.8/8)
show(o)
  `,
  ex_pcb_shifter:
  `
  
  
pcb +[sh4]:
   4pin in
   16pout get
   1pin into
   1pin set
   4pout out
   exec: set
   on: 1
   comp [shifter] .sh0:
      depth: 4
      on: 1
      :
   comp [shifter] .sh1:
      depth: 4
      on: 1
      :
   comp [shifter] .sh2:
      depth: 4
      on: 1
      :
   comp [shifter] .sh3:
      depth: 4
      on: 1
      :
   1wire i = into
   .sh0:dir=i
   .sh1:dir=i
   .sh2:dir=i
   .sh3:dir=i
   .sh0:in=MUX1(i, 0, in.0)
   .sh1:in=MUX1(i, 0, in.1)
   .sh2:in=MUX1(i, 0, in.2)
   .sh3:in=MUX1(i, 0, in.3)
   .sh0:set= set
   .sh1:set= set
   .sh2:set= set
   .sh3:set= set
   out = .sh0:out + .sh1:out + .sh2:out +.sh3:out
   get = .sh0:get + .sh1:get + .sh2:get +.sh3:get
   ~~
   :1bit set

# new instance
8wire g
pcb [sh4] .a::

.a:in=1111
.a:into=1
.a:set=1
.a:in=1010
.a:into=1
.a:set=1
.a:into=0
.a:set=1
16wire a=.a:get
4bit o=.a:out
show(a.0/8, a.8/8)
show(o)
  
  `,
  ex_shifter: `
  comp [shifter] .sh:
   depth: 8
   :

.sh:value = 00110111
.sh:set = 1
#this should set this value in the shifter

.sh:dir = 1 
#meaning shifting to right or
.sh:set = 1
#the shifting is done now

show(.sh:get) 
show(.sh:out)


comp [shifter] .sh2:
   depth: 8
   circular
   on: 1
   :
#this shifter is circular 

8wire g
1wire o

.sh2:{
  value = 00110111
  dir = 1
  set = 1
  get>= g
  out>= o
}
#the shifting is done now

show(.sh:get)
#shows 10011011
show(.sh:out)
#shows 1 shows the bit that was shifted out 


`,
  
  ex_alu_comps: `
  
comp [adder] .add:
   depth: 32
   :
   

.add:a = ^FFFF FFFF
.add:b = ^8FFF FFFF
show(.add:get)
show(.add:carry)

comp [subtract] .sub:
   depth: 4
   :

.sub:a = 1111
.sub:b = 0110
show(.sub:get)
#shows 1001 shows the result of a - b
show(.sub:carry)
#shows 0  shows the carry after a - b

.sub:a = 0000
.sub:b = 0001
show(.sub:get)
#shows 1111 shows the result of a - b
show(.sub:carry)
#shows 1  shows the carry after a - b


comp [divider] .div:
   depth: 32
   :

.div:a = ^FFFF FFFF
.div:b = ^0000 0023
show(.div:get)
#shows 0111 shows the result of a / b
show(.div:mod)
#shows 0000 shows the modulo of a / b


comp [multiplier] .mul:
    depth: 4
    :
    
.mul:a = 0010
.mul:b = 0010
show(.mul:get)
#shows 0100 shows the result of a * b
show(.mul:over)
#shows 0000 shows the carry over after the result of a * b

.mul:a = 1111
.mul:b = 1111
show(.mul:get)
#shows 0001 shows the result of a * b
show(.mul:over)
#shows 1110 shows the carry over after the result of a * b
`  
};

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

function removeDirIfEmpty(name) {
  if (fss.existsName(name, location)) {
    fss.removeDir(name, location);
  }
}

function removeFileIfExist(name, location) {
  if(fss.existsName(name, location)) {
    fss.removeFile(name, location);
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
  addFileIfNot('first' + '  *', loc, code.value);
  for(k in lib_files) {
    addFileIfNot(k + '  *', loc, lib_files[k]);
  }
}

function removeInitFiles() {
  let loc = '>';
  addDirIfNot('lib', loc);
  loc = cdDir('lib', loc);
  removeFileIfExist('first' + '  *', loc);
  for(k in lib_files) {
    removeFileIfExist(k + '  *', loc);
  }
}

function initDevices() {
  
}


const maxTabs = 5;
const tabs = new Map();
let currentTab = 0;
let lastTab = 0
function init() {
  initFiles();
  let lastName ="new";
  let last = '';
  if (sdb.has("prog/last")) {
    last = sdb.get("prog/last");
    document.getElementById("code").value = last;
  }
  // Load and display last file name
  if (sdb.has("prog/lastName")) {
    lastName = sdb.get("prog/lastName");
    updateFileNameDisplay(lastName);
  }
  tabUpdate(currentTab, lastName, last);
  fShowTabs();
  
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
  if(!confirm) {
    showConfirm(0);
    return;
  }
  confirm = false;
  if(fileActive.className !== 'file') {
    return;
  }
  const fileName = fileActive.textContent;
  fss.updateFile(fileName, currentFilesLocation, code.value);
  
  // Save file name to localStorage
  sdb.set("prog/lastName", fileName);
  updateFileNameDisplay(fileName);
  
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
  
  if(!confirm) {
    showConfirm(1);
    return;
  }
  confirm = false;
  fFilenameCheck(name);
  
  if(isDir) {
    fss.addDir(name, currentFilesLocation);
  } else {
    fss.addFile(name, currentFilesLocation, code.value);
    // Save file name to localStorage when saving a new file
    sdb.set("prog/lastName", name);
    updateFileNameDisplay(name);
  }
  
  elName.value = "";
  elSave.disabled = 1;
  dirSave.disabled = 1;
  fShowFiles();
}

function saveDb(prog, fileName = null) {
  sdb.set("prog/last", prog);
  if(fileName !== null) {
    sdb.set("prog/lastName", fileName);
    updateFileNameDisplay(fileName);
  }
}

function updateFileNameDisplay(fileName) {
  const fileNameEl = document.getElementById("fileName");
  if(fileNameEl) {
    fileNameEl.textContent = fileName || "";
  }
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
  if(!confirm) {
    showConfirm(-2);
    return;
  }
  confirm = false;
  if(fileActive.className !=='file') {
    return;
  }
  let fileLoad = document.getElementById('fileload');
  let elCode = document.getElementById("code");
  
  const fileName = fileActive.textContent;
  elCode.value = fss.getFileContent(fileName, currentFilesLocation);
  
  // Save file name to localStorage
  sdb.set("prog/lastName", fileName);
  updateFileNameDisplay(fileName);

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

function btnresetLib() {
  if(fileActive !== null) {
    return;
  }
  if(!confirm) {
    showConfirm(-3);
    return;
  }
  confirm = false;
  removeInitFiles();
  initFiles();
}


let confirm = false;
let yesId= 1;
function showConfirm(forId) {
  const elConfirm = document.getElementById('confirm');
  elConfirm.style='display:block';
  yesId = forId;
}
function yes() {
  confirm = true;
  const elConfirm = document.getElementById('confirm');
  elConfirm.style = 'display:none';
  if(yesId=== -1) {
    btnfiledirDelete();
  } else if (yesId === 0) {
    btnfileUpdate();
  } else if (yesId === 1) {
    btnfileSave();
  } else if (yesId === 2) {
    btnClr();
  } else if (yesId === -2) {
    btnfileLoad();
  } else if (yesId === -3) {
    btnresetLib();
  }
  confirm= false;
}
function no() {
  const elConfirm = document.getElementById('confirm');
  elConfirm.style='display:none';
  confirm = false;
}
function btnfiledirDelete() {
  if(fileActive === null) {
    return;
  }
  if(!confirm) {
    showConfirm(-1);
    return;
  }
  confirm = false;
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
  
  currentFiles.sort((a, b) => {
    // 1. Sort by type first (dir before file)
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }

      // 2. If types are the same, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  
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
  
  // Clear devices containerx
  const devicesContainer = document.getElementById('devices');
  if(devicesContainer){
    devicesContainer.innerHTML = '';
  }
  
  // Clear leds map if it exists
  if(typeof leds !== 'undefined' && leds instanceof Map){
    leds.clear();
  }
  
  // Get current file name from localStorage if available
  let currentFileName = null;
  if(sdb.has("prog/lastName")) {
    currentFileName = sdb.get("prog/lastName");
  }
  saveDb(code.value, currentFileName);
  const p = new Parser(new Tokenizer(code.value));
  const stmts = p.parse();
  console.log('STMTS: ',  stmts);

  globalInterp = new Interpreter(p.funcs, [], p.pcbs);
  globalInterp.aliases = p.aliases;

  for (const s of stmts) {
     // globalInterp.exec(s, true);
      const isShow = s.show !== undefined;
    globalInterp.exec(s, !isShow);
  }
  
  // After first run completes, set firstRun flag to false
  if(globalInterp.firstRun){
    globalInterp.firstRun = false;
    globalInterp.vars.set('%', {type: '1bit', value: '0', ref: null});
  }

  render(globalInterp.out);
  showVars();
  }catch(e){ 
    render([e.message ]); 
    console.log(e);
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

function addTab() {
  tabAdd('', '');
  fShowTabs();
}

function prevTab() {
  tabSave();
  const keys = Array.from(tabs.keys());
  const index = keys.indexOf(currentTab);
  const previousTab = index > 0 ? keys[index - 1] : null;
  if(previousTab === null) {
    return;
  }
  currentTab = previousTab;
  tabShowCurrent();
}

function nextTab() {
  tabSave();
  const keys = Array.from(tabs.keys());
  const index = keys.indexOf(currentTab);
  const nextTab = index >= 0 ? keys[index + 1] : null;
//  const nextKey = keys[keys.indexOf(currentTab) + 1] || null;
//  console.log(currentTab, index, nextTab, keys);
  
  if(nextTab === null || nextTab === undefined) {
    return;
  }
//  console.log('y');
  currentTab = nextTab;
  tabShowCurrent();
}

function tabAdd(filename, code) {
  const idx = lastTab + 1;
  if(filename===''){
    filename = 'tab '+ idx;
  }
  tabUpdate(idx, filename, code);
  currentTab = idx;
  lastTab = idx;
  tabShowCurrent();
  fShowTabs();
}
function tabClose() {
  if(currentTab === 0) {
    return;
  }
  //confirm?
  tabs.delete(currentTab);
  let updateLastTab = false;
  if(currentTab===lastTab) {
    updateLastTab = true;
  }
  currentTab = [...tabs.keys()].at(-1);
  tabShowCurrent();
  fShowTabs();
}
function tabShowCurrent() {
  const tabInfo = tabs.get(currentTab);
  updateFileNameDisplay(tabInfo.filename);
  code.value = tabInfo.code;
}
function tabSave() {
  const fileNameEl = document.getElementById("fileName");
  tabUpdate(currentTab, fileNameEl.textContent, code.value);
  fShowTabs();
}
function tabUpdate(idx, filename, code) {
  tabs.set(idx, {filename, code});
}
function fShowTabs() {
  //here add all tabs
  const tabsActiveEl = document.getElementById("tabsActive");
  tabsActiveEl.innerHTML ='';
  for(const k of tabs.keys()) {
    const tab= tabs.get(k);
    const activeClass = k === currentTab? ' tab-active':'';
    tabsActiveEl.innerHTML += '<div class="tab'+activeClass+'">'+tab.filename+'</div>';
  }
}


function toggleTabs() {
  const panel = document.getElementById('tabsPanel');
if (panel.style.display === 'none') {
  panel.style.display = 'block';
  fShowTabs();
} else {
  panel.style.display = 'none';
}
}
function toggleVariables() {
const panel = document.getElementById('variablesPanel');
if (panel.style.display === 'none') {
  panel.style.display = 'block';
//  fShowFiles();
} else {
  panel.style.display = 'none';
}
}

function toggleOutput() {
const panel = document.getElementById('outputPanel');
if (panel.style.display === 'none') {
  panel.style.display = 'block';
  fShowFiles();
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

function toggleDevices() {
  const panel = document.getElementById('devicesPanel');
if (panel.style.display === 'none') {
  panel.style.display = 'block';
} else {
  panel.style.display = 'none';
}
}

function showDevices(param) {
  const panel = document.getElementById('devicesPanel');
  panel.style.display = 'block';
  setPanelState('devices', true);
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
      globalInterp = new Interpreter(p.funcs, [], p.pcbs);
      
      // Execute main program first
      for(const s of stmts){
        globalInterp.exec(s, true);
      }
      
      // After first run completes, set firstRun flag to false
      if(globalInterp.firstRun){
        globalInterp.firstRun = false;
        globalInterp.vars.set('%', {type: '1bit', value: '0', ref: null});
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


  function addSwitch({ text, value = false, nl = false, onChange }) {
    const container = document.getElementById("devices");
    if (!container) return;
    showDevices();

    // Enforce max 5 characters
    const labelText = text.slice(0, 5);

    const wrapper = document.createElement("label");
    wrapper.className = "switch-wrapper";

    const label = document.createElement("span");
    label.className = "switch-label";
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "switch-input";
    input.checked = Boolean(value);

    const switchEl = document.createElement("span");
    switchEl.className = "switch";

    if (typeof onChange === "function") {
      input.addEventListener("change", () => {
        onChange(input.checked);
      });
    }

    wrapper.append(label, input, switchEl);
    container.appendChild(wrapper);
    
    if (nl) {
      const br = document.createElement('div');
      br.className = 'break';
      container.appendChild(br);
    }
  }
  
  const leds = new Map();

  function addLed({ id, text = "", color = "#ff0000", value = false, round, nl = false}) {
    const container = document.getElementById("devices");
    if (!container || !id) return;
    showDevices();
    
    const wrapper = document.createElement("label");
    wrapper.className = "led-wrapper";

    if (text) {
      const label = document.createElement("span");
      label.className = "led-label";
      label.textContent = text.slice(0, 5);
      wrapper.appendChild(label);
    } else {
      const label = document.createElement("span");
      label.className = "led-no-label";
      label.textContent = "a";
      wrapper.appendChild(label);
    }

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "led-input";
    input.checked = value;
    input.disabled = true; // user cannot click

    const led = document.createElement("span");
    led.className = "led";
    led.style.setProperty("--led-color", color);
    // Set round radius: if round is defined, use it, otherwise use default 50%
    const ledRadius = (round !== undefined ? round : 50) + "%";
    led.style.setProperty("--led-radius", ledRadius);

    wrapper.append(input, led);
    container.appendChild(wrapper);
    
    if (nl) {
      const br = document.createElement('div');
      br.className = 'break';
      container.appendChild(br);
    }

    leds.set(id, input);
  }

  function setLed(id, state) {
    const led = leds.get(id);
    if (led) {
      led.checked = Boolean(state);
    }
  }
  
    const sevenSegDisplays = new Map();
  
  function addSevenSegment({ id, text = "", color = "#ff0000", initial = {}, values = "", nl = false }) {
      if(values !== null && typeof(values) === "string" ) {
          values.split('').forEach(function (value, index) {
              const key = String.fromCharCode(97 + index);
              initial[key] = !(value !== "1");
          });
      }
  const container = document.getElementById("devices");
  if (!container || !id) return;
  showDevices();

  const wrapper = document.createElement("div");
  wrapper.className = "sevenseg-wrapper";

    const label = document.createElement("span");
    label.className = "sevenseg-label";
    label.textContent = text ? text.slice(0, 5) : "a";
    if (!text) label.className = "sevenseg-no-label"
    wrapper.appendChild(label);

  const display = document.createElement("div");
  display.className = "sevenseg";
  display.style.setProperty("--seg-color", color);

  const segments = {};

  // A–G segments
  ["a","b","c","d","e","f","g"].forEach(seg => {
    const segLabel = document.createElement("label");
    segLabel.style.display = "contents";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "seg-input";
    input.checked = Boolean(initial[seg]);

    const segment = document.createElement("span");
    segment.className = `segment seg-${seg}`;

    segLabel.append(input, segment);
    display.appendChild(segLabel);

    segments[seg] = input;
  });

  // H segment (decimal point)
  const dotWrapper = document.createElement("div");
  dotWrapper.className = "sevenseg-dot";

  const dotLabel = document.createElement("label");
  dotLabel.style.display = "contents";

  const dotInput = document.createElement("input");
  dotInput.type = "checkbox";
  dotInput.className = "seg-input";
  dotInput.checked = Boolean(initial.h);

  const dot = document.createElement("span");
  dot.className = "segment seg-h";

  dotLabel.append(dotInput, dot);
  dotWrapper.appendChild(dotLabel);

  // ✅ IMPORTANT: append dot INSIDE the digit
  display.appendChild(dotWrapper);

  // expose control
  segments.h = dotInput;
  
  // I segment TimeDot Up
  /*
  const timeDotUpWrapper = document.createElement("div");
  timeDotUpWrapper.className = "sevenseg-time-dot-up";

  const timeDotUpLabel = document.createElement("label");
  timeDotUpLabel.style.display = "contents";

  const timeDotUpInput = document.createElement("input");
  timeDotUpInput.type = "checkbox";
  timeDotUpInput.className = "seg-input";
  timeDotUpInput.checked = Boolean(initial.i);

  const timeDotUp = document.createElement("span");
  timeDotUp.className = "segment seg-i";

  timeDotUpLabel.append(timeDotUpInput, timeDotUp);
  timeDotUpWrapper.appendChild(timeDotUpLabel);

  // ✅ IMPORTANT: append dot INSIDE the digit
  display.appendChild(timeDotUpWrapper);

  // expose control
  segments.i = timeDotUpInput;
  
  // J segment TimeDot Down
const timeDotDownWrapper = document.createElement("div");
  timeDotDownWrapper.className = "sevenseg-time-dot-down";

  const timeDotDownLabel = document.createElement("label");
  timeDotDownLabel.style.display = "contents";

  const timeDotDownInput = document.createElement("input");
  timeDotDownInput.type = "checkbox";
  timeDotDownInput.className = "seg-input";
  timeDotDownInput.checked = Boolean(initial.j);

  const timeDotDown = document.createElement("span");
  timeDotDown.className = "segment seg-j";

  timeDotDownLabel.append(timeDotDownInput, timeDotDown);
  timeDotDownWrapper.appendChild(timeDotDownLabel);

  // ✅ IMPORTANT: append dot INSIDE the digit
  display.appendChild(timeDotDownWrapper);

  // expose control
  segments.j = timeDotUpInput;
  */
  
  // assemble
  wrapper.appendChild(display);
  container.appendChild(wrapper);

  if (nl) {
      const br = document.createElement('div');
      br.className = 'break';
      container.appendChild(br);
  }
    
  sevenSegDisplays.set(id, segments);
}

  function setSegment(displayId, segment, state) {
    const display = sevenSegDisplays.get(displayId);
    if (display && display[segment]) {
      display[segment].checked = Boolean(state);
    }
  }
  
  function getSegmentStates(displayId, asString = false) {
    const display = sevenSegDisplays.get(displayId);
    if (!display) {
        return -1;
    }
    
    const states = {};
    const values = [];
    ["a","b","c","d","e","f","g","h"].forEach(seg => {
      if(!display[seg]) {
          return;
      }
      states[seg] = (display[seg].checked === true);
      values[values.length] = (display[seg].checked === true) ? 1 : 0;
    });
    
    return (asString) ? values.join(''): states;
  }
  
  
  const dipSwitches = new Map();

  function addDipSwitch({
    id,
    text = "",
    count = 8,
    initial = [],
    nl = false,
    onChange,
    noLabels = false, 
    visual = 1
  }) {
    const getRowSize = function getRowSize(count) {
        if (count >= 16) return 8;
        if (count >= 12) return 4;
        return count; // single row
    }

    const container = document.getElementById("devices");
    if (!container || !id) return;
    showDevices();

    const wrapper = document.createElement("div");
    wrapper.className = "dip-wrapper";

    // Label (always present for alignment)
    const label = document.createElement("span");
    label.className = "dip-label";
    label.textContent = text ? text.slice(0, 5) : "";
    if (!text) label.style.visibility = "hidden";
    wrapper.appendChild(label);

    const dip = document.createElement("div");
    dip.className = "dip";
    dip.classList.add(visual === 1 ? "dip-visual-1" : "dip-visual-0");

    if (noLabels) {
      dip.classList.add("dip-no-labels");
    }

    const inputs = [];
    const rowSize = getRowSize(count);

    let row;
    for (let i = 0; i < count; i++) {

      // start a new row when needed
      if (i % rowSize === 0) {
        row = document.createElement("div");
        row.className = "dip-row";
        dip.appendChild(row);
      }

      const unit = document.createElement("label");
      unit.className = "dip-unit";

      const num = document.createElement("span");
      num.textContent = i + 1;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "dip-input";
      input.checked = Boolean(initial[i]);

      if (typeof onChange === "function") {
        input.addEventListener("change", () => {
          onChange(i, input.checked);
        });
      }

      const sw = document.createElement("span");
      sw.className = "dip-switch";

      unit.append(num, input, sw);
      row.appendChild(unit);

      inputs.push(input);
    }

    wrapper.appendChild(dip);
    container.appendChild(wrapper);

    if (nl) {
      const br = document.createElement('div');
      br.className = 'break';
      container.appendChild(br);
    }

    dipSwitches.set(id, inputs);
  }

  // Programmatic control
  function setDip(id, index, state) {
    const dips = dipSwitches.get(id);
    if (dips && dips[index]) {
      dips[index].checked = Boolean(state);
    }
  }

  function getDipState(id) {
    const dips = dipSwitches.get(id);
    return dips ? dips.map(d => d.checked) : [];
  }
  
  // Memory components
  const memories = new Map(); // id -> { length, depth, default, data: Map(address -> value) }
  
  function addMem({ id, length = 3, depth = 4, default: defaultValue = null }) {
    if (!id) return;
    
    // Convert default to binary string if needed
    let defaultBin = defaultValue;
    if (defaultBin === null || defaultBin === undefined) {
      defaultBin = '0'.repeat(depth);
    }
    
    // Ensure default is correct length
    if (defaultBin.length !== depth) {
      defaultBin = defaultBin.padStart(depth, '0').substring(0, depth);
    }
    
    memories.set(id, {
      length: length,
      depth: depth,
      default: defaultBin,
      data: new Map() // Address -> binary string value
    });
  }
  
  function setMem(id, address, value) {
    console.log('[mem]s:', id, address, value);
    const mem = memories.get(id);
    if (!mem) return;
    
    // Validate address
    if (address < 0 || address >= mem.length) {
      throw Error(`Memory invalid address ${address} (length: ${mem.length} means address can be between 0 and ${mem.length - 1})`);
    }
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < mem.depth) {
      binValue = binValue.padStart(mem.depth, '0');
    } else if (binValue.length > mem.depth) {
      binValue = binValue.substring(0, mem.depth);
    }
    
    // Store value
    mem.data.set(address, binValue);
  }
  
  function getMem(id, address) {
    const mem = memories.get(id);
    if (!mem) return null;
    
    // Validate address
    if (address < 0 || address >= mem.length) {
      throw Error(`Memory invalid address ${address} (length: ${mem.length} means address can be between 0 and ${mem.length - 1})`);
    }
    
    // Get value from data map, or return default
    if (mem.data.has(address)) {
        console.log('[mem]g:', id, address, mem.data.get(address));
      return mem.data.get(address);
    }
    
    return mem.default;
  }
  
  // Counter components
  const counters = new Map(); // id -> { depth, default, value }
  
  function addCounter({ id, depth = 4, default: defaultValue = null }) {
    if (!id) return;
    
    // Convert default to binary string if needed
    let defaultBin = defaultValue;
    if (defaultBin === null || defaultBin === undefined) {
      defaultBin = '0'.repeat(depth);
    }
    
    // Ensure default is correct length
    if (defaultBin.length !== depth) {
      defaultBin = defaultBin.padStart(depth, '0').substring(0, depth);
    }
    
    counters.set(id, {
      depth: depth,
      default: defaultBin,
      value: defaultBin // Current value
    });
  }
  
  function setCounter(id, value) {
    const counter = counters.get(id);
    if (!counter) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < counter.depth) {
      binValue = binValue.padStart(counter.depth, '0');
    } else if (binValue.length > counter.depth) {
      binValue = binValue.substring(0, counter.depth);
    }
    
    // Store value
    counter.value = binValue;
  }
  
  function getCounter(id) {
    const counter = counters.get(id);
    if (!counter) return null;
    
    // Return current value, or default if not set
    return counter.value || counter.default;
  }
  
  const adders = new Map();
  
  function addAdder({ id, depth = 4 }) {
    if (!id) return;
    
    adders.set(id, {
      depth: depth,
      a: '0'.repeat(depth), // First operand
      b: '0'.repeat(depth)  // Second operand
    });
  }
  
  function setAdderA(id, value) {
    const adder = adders.get(id);
    if (!adder) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < adder.depth) {
      binValue = binValue.padStart(adder.depth, '0');
    } else if (binValue.length > adder.depth) {
      binValue = binValue.substring(0, adder.depth);
    }
    
    // Store value
    adder.a = binValue;
  }
  
  function setAdderB(id, value) {
    const adder = adders.get(id);
    if (!adder) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < adder.depth) {
      binValue = binValue.padStart(adder.depth, '0');
    } else if (binValue.length > adder.depth) {
      binValue = binValue.substring(0, adder.depth);
    }
    
    // Store value
    adder.b = binValue;
  }
  
  function getAdder(id) {
    const adder = adders.get(id);
    if (!adder) return null;
    
    // Calculate a + b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + adder.a);
    const bNum = BigInt('0b' + adder.b);
    const sum = aNum + bNum;
    
    // Truncate to depth bits (this gives us the result without carry)
    const maxValue = (BigInt(1) << BigInt(adder.depth)) - BigInt(1);
    const result = sum & maxValue;
    
    // Convert back to binary string
    let binStr = result.toString(2);
    // Pad to depth bits
    if(binStr.length < adder.depth){
      binStr = binStr.padStart(adder.depth, '0');
    } else if(binStr.length > adder.depth){
      binStr = binStr.substring(binStr.length - adder.depth);
    }
    return binStr;
  }
  
  function getAdderCarry(id) {
    const adder = adders.get(id);
    if (!adder) return null;
    
    // Calculate a + b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + adder.a);
    const bNum = BigInt('0b' + adder.b);
    const sum = aNum + bNum;
    
    // Check if there's overflow (carry)
    const maxValue = (BigInt(1) << BigInt(adder.depth)) - BigInt(1);
    const hasCarry = sum > maxValue;
    
    return hasCarry ? '1' : '0';
  }
  
  // Subtract components
  const subtracts = new Map(); // id -> { depth, a, b }
  
  function addSubtract({ id, depth = 4 }) {
    if (!id) return;
    
    subtracts.set(id, {
      depth: depth,
      a: '0'.repeat(depth), // First operand
      b: '0'.repeat(depth)  // Second operand
    });
  }
  
  function setSubtractA(id, value) {
    const subtract = subtracts.get(id);
    if (!subtract) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < subtract.depth) {
      binValue = binValue.padStart(subtract.depth, '0');
    } else if (binValue.length > subtract.depth) {
      binValue = binValue.substring(0, subtract.depth);
    }
    
    // Store value
    subtract.a = binValue;
  }
  
  function setSubtractB(id, value) {
    const subtract = subtracts.get(id);
    if (!subtract) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < subtract.depth) {
      binValue = binValue.padStart(subtract.depth, '0');
    } else if (binValue.length > subtract.depth) {
      binValue = binValue.substring(0, subtract.depth);
    }
    
    // Store value
    subtract.b = binValue;
  }
  
  function getSubtract(id) {
    const subtract = subtracts.get(id);
    if (!subtract) return null;
    
    // Calculate a - b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + subtract.a);
    const bNum = BigInt('0b' + subtract.b);
    let diff = aNum - bNum;
    
    // If result is negative, wrap around (add 2^depth)
    const maxValue = (BigInt(1) << BigInt(subtract.depth)) - BigInt(1);
    const wrapValue = BigInt(1) << BigInt(subtract.depth);
    if (diff < 0) {
      diff = diff + wrapValue;
    }
    
    // Truncate to depth bits
    const result = diff & maxValue;
    
    // Convert back to binary string
    let binStr = result.toString(2);
    // Pad to depth bits
    if(binStr.length < subtract.depth){
      binStr = binStr.padStart(subtract.depth, '0');
    } else if(binStr.length > subtract.depth){
      binStr = binStr.substring(binStr.length - subtract.depth);
    }
    return binStr;
  }
  
  function getSubtractCarry(id) {
    const subtract = subtracts.get(id);
    if (!subtract) return null;
    
    // Calculate a - b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + subtract.a);
    const bNum = BigInt('0b' + subtract.b);
    const diff = aNum - bNum;
    
    // Check if there's borrow (carry = 1 if a < b, meaning we needed to borrow)
    const hasBorrow = diff < 0;
    
    return hasBorrow ? '1' : '0';
  }
  
  // Divider components
  const dividers = new Map(); // id -> { depth, a, b }
  
  function addDivider({ id, depth = 4 }) {
    if (!id) return;
    
    dividers.set(id, {
      depth: depth,
      a: '0'.repeat(depth), // First operand (dividend)
      b: '0'.repeat(depth)  // Second operand (divisor)
    });
  }
  
  function setDividerA(id, value) {
    const divider = dividers.get(id);
    if (!divider) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < divider.depth) {
      binValue = binValue.padStart(divider.depth, '0');
    } else if (binValue.length > divider.depth) {
      binValue = binValue.substring(0, divider.depth);
    }
    
    // Store value
    divider.a = binValue;
  }
  
  function setDividerB(id, value) {
    const divider = dividers.get(id);
    if (!divider) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < divider.depth) {
      binValue = binValue.padStart(divider.depth, '0');
    } else if (binValue.length > divider.depth) {
      binValue = binValue.substring(0, divider.depth);
    }
    
    // Store value
    divider.b = binValue;
  }
  
  function getDivider(id) {
    const divider = dividers.get(id);
    if (!divider) return null;
    
    // Calculate a / b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + divider.a);
    const bNum = BigInt('0b' + divider.b);
    
    // Handle division by zero - return all zeros
    if (bNum === BigInt(0)) {
      return '0'.repeat(divider.depth);
    }
    
    // Perform division
    const quotient = aNum / bNum;
    
    // Truncate to depth bits
    const maxValue = (BigInt(1) << BigInt(divider.depth)) - BigInt(1);
    const result = quotient & maxValue;
    
    // Convert back to binary string
    let binStr = result.toString(2);
    // Pad to depth bits
    if(binStr.length < divider.depth){
      binStr = binStr.padStart(divider.depth, '0');
    } else if(binStr.length > divider.depth){
      binStr = binStr.substring(binStr.length - divider.depth);
    }
    return binStr;
  }
  
  function getDividerMod(id) {
    const divider = dividers.get(id);
    if (!divider) return null;
    
    // Calculate a % b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + divider.a);
    const bNum = BigInt('0b' + divider.b);
    
    // Handle division by zero - return all zeros
    if (bNum === BigInt(0)) {
      return '0'.repeat(divider.depth);
    }
    
    // Perform modulo operation
    const remainder = aNum % bNum;
    
    // Truncate to depth bits
    const maxValue = (BigInt(1) << BigInt(divider.depth)) - BigInt(1);
    const result = remainder & maxValue;
    
    // Convert back to binary string
    let binStr = result.toString(2);
    // Pad to depth bits
    if(binStr.length < divider.depth){
      binStr = binStr.padStart(divider.depth, '0');
    } else if(binStr.length > divider.depth){
      binStr = binStr.substring(binStr.length - divider.depth);
    }
    return binStr;
  }
  
  // Multiplier components
  const multipliers = new Map(); // id -> { depth, a, b }
  
  function addMultiplier({ id, depth = 4 }) {
    if (!id) return;
    
    multipliers.set(id, {
      depth: depth,
      a: '0'.repeat(depth), // First operand
      b: '0'.repeat(depth)  // Second operand
    });
  }
  
  function setMultiplierA(id, value) {
    const multiplier = multipliers.get(id);
    if (!multiplier) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < multiplier.depth) {
      binValue = binValue.padStart(multiplier.depth, '0');
    } else if (binValue.length > multiplier.depth) {
      binValue = binValue.substring(0, multiplier.depth);
    }
    
    // Store value
    multiplier.a = binValue;
  }
  
  function setMultiplierB(id, value) {
    const multiplier = multipliers.get(id);
    if (!multiplier) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < multiplier.depth) {
      binValue = binValue.padStart(multiplier.depth, '0');
    } else if (binValue.length > multiplier.depth) {
      binValue = binValue.substring(0, multiplier.depth);
    }
    
    // Store value
    multiplier.b = binValue;
  }
  
  function getMultiplier(id) {
    const multiplier = multipliers.get(id);
    if (!multiplier) return null;
    
    // Calculate a * b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + multiplier.a);
    const bNum = BigInt('0b' + multiplier.b);
    const product = aNum * bNum;
    
    // Truncate to depth bits (lower part)
    const maxValue = (BigInt(1) << BigInt(multiplier.depth)) - BigInt(1);
    const result = product & maxValue;
    
    // Convert back to binary string
    let binStr = result.toString(2);
    // Pad to depth bits
    if(binStr.length < multiplier.depth){
      binStr = binStr.padStart(multiplier.depth, '0');
    } else if(binStr.length > multiplier.depth){
      binStr = binStr.substring(binStr.length - multiplier.depth);
    }
    return binStr;
  }
  
  function getMultiplierOver(id) {
    const multiplier = multipliers.get(id);
    if (!multiplier) return null;
    
    // Calculate a * b using BigInt to handle large numbers correctly
    const aNum = BigInt('0b' + multiplier.a);
    const bNum = BigInt('0b' + multiplier.b);
    const product = aNum * bNum;
    
    // Get the overflow part (bits above depth)
    // Shift right by depth bits to get the upper part
    const overflow = product >> BigInt(multiplier.depth);
    
    // Truncate overflow to depth bits (in case product is very large)
    const maxValue = (BigInt(1) << BigInt(multiplier.depth)) - BigInt(1);
    const result = overflow & maxValue;
    
    // Convert back to binary string
    let binStr = result.toString(2);
    // Pad to depth bits
    if(binStr.length < multiplier.depth){
      binStr = binStr.padStart(multiplier.depth, '0');
    } else if(binStr.length > multiplier.depth){
      binStr = binStr.substring(binStr.length - multiplier.depth);
    }
    return binStr;
  }
  
  // Shifter components
  const shifters = new Map(); // id -> { depth, circular, value, direction, out }
  
  function addShifter({ id, depth = 4, circular = false }) {
    if (!id) return;
    
    shifters.set(id, {
      depth: depth,
      circular: circular,
      value: '0'.repeat(depth), // Current value
      direction: 1, // 1 = right, 0 = left
      in: '0', // Input bit (used when not circular)
      out: '0' // Bit that was shifted out
    });
  }
  
  function setShifterValue(id, value) {
    const shifter = shifters.get(id);
    if (!shifter) return;
    
    // Ensure value is correct length
    let binValue = value;
    if (binValue.length < shifter.depth) {
      binValue = binValue.padStart(shifter.depth, '0');
    } else if (binValue.length > shifter.depth) {
      binValue = binValue.substring(0, shifter.depth);
    }
    
    // Store value (but don't shift yet - that happens on :set)
    shifter.value = binValue;
  }
  
  function setShifterDir(id, direction) {
    const shifter = shifters.get(id);
    if (!shifter) return;
    
    // Direction: 1 = right, 0 = left
    shifter.direction = direction === 1 ? 1 : 0;
  }
  
  function setShifterIn(id, inBit) {
    const shifter = shifters.get(id);
    if (!shifter) return;
    
    // Input bit: '0' or '1'
    shifter.in = inBit === '1' ? '1' : '0';
  }
  
  function shiftShifter(id) {
    const shifter = shifters.get(id);
    if (!shifter) return;
    
    const currentValue = shifter.value;
    let newValue = '';
    let outBit = '0';
    
    if (shifter.direction === 1) {
      // Shift right
      outBit = currentValue[currentValue.length - 1]; // Last bit goes out
      if (shifter.circular) {
        // Circular: out bit goes to the left
        newValue = outBit + currentValue.substring(0, currentValue.length - 1);
      } else {
        // Non-circular: shift in .in bit from left
        newValue = shifter.in + currentValue.substring(0, currentValue.length - 1);
      }
    } else {
      // Shift left
      outBit = currentValue[0]; // First bit goes out
      if (shifter.circular) {
        // Circular: out bit goes to the right
        newValue = currentValue.substring(1) + outBit;
      } else {
        // Non-circular: shift in .in bit from right
        newValue = currentValue.substring(1) + shifter.in;
      }
    }
    
    shifter.value = newValue;
    shifter.out = outBit;
  }
  
  function getShifter(id) {
    const shifter = shifters.get(id);
    if (!shifter) return null;
    
    return shifter.value;
  }
  
  function getShifterOut(id) {
    const shifter = shifters.get(id);
    if (!shifter) return null;
    
    return shifter.out;
  }
  
  const lcdDisplays = new Map();

function addCharacterLCD(options) {
  const container = document.getElementById("devices");
  if (!container || !options.id) return;
  showDevices();

  const lcd = new CharacterLCD(options);
  lcd.mount(container);
  lcdDisplays.set(options.id, lcd);
}

class CharacterLCD {
  constructor({
    id,
    rows = 8,
    cols = 5,
    pixelSize = 10,
    pixelGap = 3,
    pixelOnColor = "#6dff9c",
    backgroundColor = "transparent",
    glow = true,
    round = true,
      nl = false,
    rgb = false,
  }) {
    this.id = id;
    this.rows = rows;
    this.cols = cols;
    this.pixelSize = pixelSize;
    this.pixelGap = pixelGap;
    this.pixelOnColor = pixelOnColor;
    this.backgroundColor = backgroundColor;
    this.glow = glow;
    this.round = round;
    this.nl = nl;
    this.rgb = rgb;
    this.currentColor = null; // Current RGB color for new pixels
    this.loadEnglishFont();

    this.pixels = Array.from({ length: rows }, () =>
      Array(cols).fill(0)
    );
    
    // Initialize pixelColors array to store color per pixel
    this.pixelColors = Array.from({ length: rows }, () =>
      Array(cols).fill(null)
    );

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.width =
      cols * (pixelSize + pixelGap) + pixelGap;
    this.canvas.height =
      rows * (pixelSize + pixelGap) + pixelGap;

    /* ---- batching state ---- */
    this._dirty = false;
    this._rafId = null;

    this.requestDraw();
  }

  mount(parent) {
  const wrapper = document.createElement("div");
  wrapper.className = "lcd-wrapper";

  wrapper.appendChild(this.canvas);
  parent.appendChild(wrapper);
    if (this.nl) {
      const br = document.createElement('div');
      br.className = 'break';
      parent.appendChild(br);
    }
}

  /* =========================
     UPDATE METHODS (NO DRAW)
  ========================= */

  setRow(rowIndex, bitString) {
    if (!this.pixels[rowIndex]) return;
    if (bitString.length !== this.cols) return;

    for (let c = 0; c < this.cols; c++) {
      this.pixels[rowIndex][c] = bitString[c] === "1" ? 1 : 0;
    }
    this.requestDraw();
  }

  setRows(rowMap) {
    let changed = false;
    for (const row in rowMap) {
      if (!this.pixels[row]) continue;
      const bits = rowMap[row];
    //  if (bits.length !== this.cols) continue;

      for (let c = 0; c < Math.min(this.cols, bits.length); c++) {
        this.pixels[row][c] = bits[c] === "1" ? 1 : 0;
      }
      changed = true;
    }
    if (changed) this.requestDraw();
  }
  
  setRect(topCol, topRow, rectMap, color = null) {
//    console.log(topCol +','+ topRow, rectMap);
   // topCol = parseInt(topCol, 10);
    // topRow = parseInt(topRow, 10);
let changed = false;
// Use provided color, or currentColor, or null (which means use pixelOnColor)
const pixelColor = color !== null ? color : this.currentColor;

for (const row in rectMap) {
  const r = parseInt(row, 10);
  const bits = rectMap[row];
  
  // Calculate the actual row index
  const actualRow = topRow + r;
  
  // Check if row is within bounds
  if(actualRow < 0 || actualRow >= this.rows) {
    continue;
  }
  
  // Check if the row exists in pixels array
  if (!this.pixels[actualRow]) {
    continue;
  }
  
  for (let c = 0; c < Math.min(this.cols, bits.length); c++) {
    // Calculate the actual column index
    const actualCol = topCol + c;
    
    // Check if column is within bounds
    if(actualCol < 0 || actualCol >= this.cols) {
      continue;
    }
    
    // Set the pixel value
    const pixelValue = bits[c] === "1" ? 1 : 0;
    this.pixels[actualRow][actualCol] = pixelValue;
    
    // If pixel is set to 1 and we have a color, store it
    if(pixelValue === 1 && pixelColor !== null){
      this.pixelColors[actualRow][actualCol] = pixelColor;
    } else if(pixelValue === 0){
      // When clearing a pixel, also clear its color
      this.pixelColors[actualRow][actualCol] = null;
    }
    
    changed = true;
  }
}
if (changed) this.requestDraw();

  }
  
  setCurrentColor(color) {
    // Set the current RGB color for new pixels
    // color can be null to reset to default pixelOnColor
    this.currentColor = color;
  }

  clear() {
    this.pixels.forEach(row => row.fill(0));
    // Clear all pixel colors
    this.pixelColors.forEach(row => row.fill(null));
    this.requestDraw();
  }

  /* =========================
     BATCHED DRAW
  ========================= */

  requestDraw() {
    if (this._dirty) return;

    this._dirty = true;
    this._rafId = requestAnimationFrame(() => {
      this._dirty = false;
      this.draw();
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.pixels[r][c]) continue;

        const x =
          this.pixelGap + c * (this.pixelSize + this.pixelGap);
        const y =
          this.pixelGap + r * (this.pixelSize + this.pixelGap);

        // Determine the color for this pixel
        // Use stored pixel color if available, otherwise use default pixelOnColor
        const pixelColor = this.pixelColors[r][c] || this.pixelOnColor;

        if (this.glow) {
          ctx.shadowColor = pixelColor;
          ctx.shadowBlur = this.pixelSize * 0.8;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = pixelColor;
        ctx.beginPath();
        if(this.round) {
        ctx.roundRect(
          x,
          y,
          this.pixelSize,
          this.pixelSize,
          this.pixelSize * 0.3
        );
        } else {
          ctx.rect(
            x,y,
            this.pixelSize,
            this.pixelSize,
            this.pixelSize * 0.3
          )
        }
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
  }

  //HD44780
   loadEuropeanFont() {
       const HD44780_EUROPEAN_CGROM_BASE64 =
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
AAAAAAAEBAQEBAQAEAAEAAAAAAAAKgoKCgoAAAAAAAAKgoKfgoKfgoKCgoA\
BA8UCg4FHgQAGBkCBASIEwMAGBkSBQ8UCg4MAAkSBQ0UCQ0JAAQEBBAgAAAA\
AgQICgQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";

    const binary = atob(HD44780_EUROPEAN_CGROM_BASE64);
    const font = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      font[i] = binary.charCodeAt(i);
    }

    return font; // 2048 bytes
  }

  getFont() {
      return this.font;
  }

  getCharBitsString(charCode) {
    if (charCode < 0 || charCode > 255) {
      throw new RangeError("Expect charCode between 0 and 255");
    }
//console.log(charCode);

   

    
    let result = "";

    const base =  charCode << 3; // charCode * 8

    for (let row = 0; row < 8; row++) {
      //console.log(base + row);
      const rowByte = this.font[base + row] & 0x1F; // folosim doar 5 biți

      // extragem bitii 4 → 0 (stânga → dreapta)
      for (let bit = 4; bit >= 0; bit--) {
        result += (rowByte >> bit) & 1 ? "1" : "0";
      }
    }

    return result;
  }


  loadByTyingFonts() {
    const fonts = {
      fontUs: [
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [],
        [4, 4, 4, 4, 0, 0, 4], // !
        [10, 10, 10], // "
        [10, 10, 31, 10, 31, 10, 10], // #
        [4, 15, 20, 14, 5, 30, 4], // $
        [24, 25, 2, 4, 8, 19, 3], // %
        [12, 18, 20, 8, 21, 18, 13], // &
        [12, 4, 8], // '
        [2, 4, 8, 8, 8, 4, 2], // (
        [8, 4, 2, 2, 2, 4, 8], // )
        [0, 4, 21, 14, 21, 4], // *
        [0, 4, 4, 31, 4, 4], // +
        [0, 0, 0, 0, 12, 4, 8], // ,
        [0, 0, 0, 31], // -
        [0, 0, 0, 0, 0, 12, 12], // .
        [0, 1, 2, 4, 8, 16], // /
        [14, 17, 19, 21, 25, 17, 14], // 0
        [4, 12, 4, 4, 4, 4, 14], // 1
        [14, 17, 1, 2, 4, 8, 31], // 2
        [31, 2, 4, 2, 1, 17, 14], // 3
        [2, 6, 10, 18, 31, 2, 2], // 4
        [31, 16, 30, 1, 1, 17, 14], // 5
        [6, 8, 16, 30, 17, 17, 14], // 6
        [31, 1, 2, 4, 8, 8, 8], // 7
        [14, 17, 17, 14, 17, 17, 14], // 8
        [14, 17, 17, 15, 1, 2, 12], // 9
        [0, 12, 12, 0, 12, 12], // :
        [0, 12, 12, 0, 12, 4, 8], // ;
        [2, 4, 8, 16, 8, 4, 2], // <
        [0, 0, 31, 0, 31], // =
        [8, 4, 2, 1, 2, 4, 8], // >
        [14, 17, 1, 2, 4, 0, 4], // ?
        [14, 17, 1, 13, 21, 21, 14], // @
        [14, 17, 17, 31, 17, 17, 17], // A
        [30, 17, 17, 30, 17, 17, 30], // B
        [14, 17, 16, 16, 16, 17, 14], // C
        [28, 18, 17, 17, 17, 18, 28], // D
        [31, 16, 16, 30, 16, 16, 31], // E
        [31, 16, 16, 30, 16, 16, 16], // F
        [14, 17, 16, 23, 17, 17, 15], // G
        [17, 17, 17, 31, 17, 17, 17], // H
        [14, 4, 4, 4, 4, 4, 14], // I
        [14, 2, 2, 2, 2, 18, 12], // J
        [17, 18, 20, 24, 20, 18, 17], // K
        [16, 16, 16, 16, 16, 16, 31], // L
        [17, 27, 21, 21, 17, 17, 17], // M
        [17, 17, 25, 21, 19, 17, 17], // N
        [14, 17, 17, 17, 17, 17, 14], // O
        [30, 17, 17, 30, 16, 16, 16], // P
        [14, 17, 17, 17, 21, 18, 13], // Q
        [30, 17, 17, 30, 20, 18, 17], // R
        [15, 16, 16, 14, 1, 1, 30], // S
        [31, 4, 4, 4, 4, 4, 4], // T
        [17, 17, 17, 17, 17, 17, 14], // U
        [17, 17, 17, 17, 17, 10, 4], // V
        [17, 17, 17, 21, 21, 21, 10], // W
        [17, 17, 10, 4, 10, 17, 17], // X
        [17, 17, 17, 10, 4, 4, 4], // Y
        [31, 1, 2, 4, 8, 16, 31], // Z
        [14, 8, 8, 8, 8, 8, 14], // [
        [17, 10, 31, 4, 31, 4, 4], // Yen
        [14, 2, 2, 2, 2, 2, 14], // ]
        [4, 10, 17], // ^
        [0, 0, 0, 0, 0, 0, 31], // _
        [8, 4, 2], // `
        [0, 0, 14, 1, 15, 17, 15], // a
        [16, 16, 22, 25, 17, 17, 30], // b
        [0, 0, 14, 16, 16, 17, 14], // c
        [1, 1, 13, 19, 17, 17, 15], // d
        [0, 0, 14, 17, 31, 16, 14], // e
        [6, 9, 8, 28, 8, 8, 8], // f
        [0, 15, 17, 17, 15, 1, 14], // g
        [16, 16, 22, 25, 17, 17, 17], // h
        [4, 0, 12, 4, 4, 4, 14], // i
        [2, 0, 6, 2, 2, 18, 12], // j
        [16, 16, 18, 20, 24, 20, 18], // k
        [12, 4, 4, 4, 4, 4, 31], // l
        [0, 0, 26, 21, 21, 17, 17], // m
        [0, 0, 22, 25, 17, 17, 17], // n
        [0, 0, 14, 17, 17, 17, 14], // o
        [0, 0, 30, 17, 30, 16, 16], // p
        [0, 0, 13, 19, 15, 1, 1], // q
        [0, 0, 22, 25, 16, 16, 16], // r
        [0, 0, 14, 16, 14, 1, 30], // s
        [8, 8, 28, 8, 8, 9, 6], // t
        [0, 0, 17, 17, 17, 19, 13], // u
        [0, 0, 17, 17, 17, 10, 4], // v
        [0, 0, 17, 17, 21, 21, 10], // w
        [0, 0, 17, 10, 4, 10, 17], // x
        [0, 0, 17, 17, 15, 1, 14], // y
        [0, 0, 31, 2, 4, 8, 31], // z
        [2, 4, 4, 8, 4, 4, 2], // {
        [4, 4, 4, 4, 4, 4, 4], // |
        [8, 4, 4, 2, 4, 4, 8], // }
        [0, 4, 2, 31, 2, 4], // ->
        [0, 4, 8, 31, 8, 4], // <-
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [],
        [0, 0, 0, 0, 28, 20, 28],
        [7, 4, 4, 4],
        [0, 0, 0, 4, 4, 4, 28],
        [0, 0, 0, 0, 16, 8, 4],
        [0, 0, 0, 12, 12],
        [0, 31, 1, 31, 1, 2, 4],
        [0, 0, 31, 1, 6, 4, 8],
        [0, 0, 2, 4, 12, 20, 4],
        [0, 0, 4, 31, 17, 1, 14],
        [0, 0, 0, 31, 4, 4, 31],
        [0, 0, 2, 31, 6, 10, 18],
        [0, 0, 8, 31, 9, 10, 8],
        [0, 0, 0, 14, 2, 2, 31],
        [0, 0, 30, 2, 30, 2, 30],
        [0, 0, 0, 21, 21, 1, 6],

        [0, 0, 0, 31],
        [31, 1, 5, 6, 4, 4, 8],
        [1, 2, 4, 12, 20, 4, 4],
        [4, 31, 17, 17, 1, 2, 4],
        [0, 31, 4, 4, 4, 4, 31],
        [2, 31, 2, 6, 10, 18, 2],
        [8, 31, 9, 9, 9, 9, 18],
        [4, 31, 4, 31, 4, 4, 4],
        [0, 15, 9, 17, 1, 2, 12],
        [8, 15, 18, 2, 2, 2, 4],
        [0, 31, 1, 1, 1, 1, 31],
        [10, 31, 10, 10, 2, 4, 8],
        [0, 24, 1, 25, 1, 2, 28],
        [0, 31, 1, 2, 4, 10, 17],
        [8, 31, 9, 10, 8, 8, 7],
        [0, 17, 17, 9, 1, 2, 12],

        [0, 15, 9, 21, 3, 2, 12],
        [2, 28, 4, 31, 4, 4, 8],
        [0, 21, 21, 21, 1, 2, 4],
        [14, 0, 31, 4, 4, 4, 8],
        [8, 8, 8, 12, 10, 8, 8],
        [4, 4, 31, 4, 4, 8, 16],
        [0, 14, 0, 0, 0, 0, 31],
        [0, 31, 1, 10, 4, 10, 16],
        [4, 31, 2, 4, 14, 21, 4],
        [2, 2, 2, 2, 2, 4, 8],
        [0, 4, 2, 17, 17, 17, 17],
        [16, 16, 31, 16, 16, 16, 15],
        [0, 31, 1, 1, 1, 2, 12],
        [0, 8, 20, 2, 1, 1],
        [4, 31, 4, 4, 21, 21, 4],
        [0, 31, 1, 1, 10, 4, 2],

        [0, 14, 0, 14, 0, 14, 1],
        [0, 4, 8, 16, 17, 31, 1],
        [0, 1, 1, 10, 4, 10, 16],
        [0, 31, 8, 31, 8, 8, 7],
        [8, 8, 31, 9, 10, 8, 8],
        [0, 14, 2, 2, 2, 2, 31],
        [0, 31, 1, 31, 1, 1, 31],
        [14, 0, 31, 1, 1, 2, 4],
        [18, 18, 18, 18, 2, 4, 8],
        [0, 4, 20, 20, 21, 21, 22],
        [0, 16, 16, 17, 18, 20, 24],
        [0, 31, 17, 17, 17, 17, 31],
        [0, 31, 17, 17, 1, 2, 4],
        [0, 24, 0, 1, 1, 2, 28],
        [4, 18, 8],
        [28, 20, 28],

        [0, 0, 9, 21, 18, 18, 13], // alpha
        [10, 0, 14, 1, 15, 17, 15], // a:
        [0, 0, 14, 17, 30, 17, 30, 16, 16, 16], // beta
        [0, 0, 14, 16, 12, 17, 14], // epsilon
        [0,0, 17, 17, 17, 19, 29, 16, 16, 16], // mu
        [0, 0, 15, 20, 18, 17, 14], // sigma
        [0, 0, 6, 9, 17, 17, 30, 16, 16, 16], // ro
        [0, 0, 15, 17, 17, 17, 15, 1, 1, 14], // g
        [0, 0, 7, 4, 4, 20, 8], // sq root
        [0, 2, 26, 2], // -1
        [2, 0, 6, 2, 2, 2, 2, 2, 18, 12], // j
        [0, 20, 8, 20], // x
        [0, 4, 14, 20, 21, 14, 4], // cent
        [8, 8, 28, 8, 28, 8, 15], // poud
        [14, 0, 22, 25, 17, 17, 17], // n~
        [10, 0, 14, 17, 17, 17, 14], // o:
        [0, 0, 22, 25, 17, 17, 30, 16, 16, 16], // p
        [0, 0, 13, 19, 17, 17, 15, 1, 1, 1], // q
        [0, 14, 17, 31, 17, 17, 14], // theta
        [0, 0, 0, 11, 21, 26], // inf
        [0, 0, 14, 17, 17, 10, 27], // Omega
        [10, 0, 17, 17, 17, 19, 13], // u:
        [31, 16, 8, 4, 8, 16, 31], // Sigma
        [0, 0, 31, 10, 10, 10, 19], // pi
        [31, 0, 17, 10, 4, 10, 17], // x-
        [0, 0, 17, 17, 17, 17, 15, 1, 1, 14], // y
        [0, 1, 30, 4, 31, 4, 4],
        [0, 0, 31, 8, 15, 9, 17],
        [0, 0, 31, 21, 31, 17, 17], // yen
        [0, 0, 4, 0, 31, 0, 4], // :-
        [],
        [31, 31, 31, 31, 31, 31, 31, 31, 31, 31]
      ],

          fontEu: [
      [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
      [0, 8, 12, 14, 15, 14, 12, 8], // |>
      [0, 2, 6, 14, 30, 14, 6, 2], // <|
      [0, 9, 18, 27], // ``
      [0, 27, 9, 18], // ''
      [0, 4, 14, 31, 0, 4, 14, 31],
      [0, 31, 14, 4, 0, 31, 14, 4],
      [0, 0, 14, 31, 31, 31, 14],
      [0, 1, 1, 5, 9, 31, 8, 4], // return
      [0, 4, 14, 21, 4, 4, 4, 4], // up
      [0, 4, 4, 4, 4, 21, 14, 4], // down
      [0, 0, 4, 2, 31, 2, 4], // ->
      [0, 0, 4, 8, 31, 8, 4], // <-
      [0, 2, 4, 8, 4, 2, 0, 31], // <=
      [0, 8, 4, 2, 4, 8, 0, 31], // >=
      [0, 0, 4, 4, 14, 14, 31],
      [0, 0, 31, 14, 14, 4, 4],
      [],
      [0, 4, 4, 4, 4, 0, 0, 4], // !
      [0, 10, 10, 10], // "
      [0, 10, 10, 31, 10, 31, 10, 10], // #
      [0, 4, 15, 20, 14, 5, 30, 4], // $
      [0, 24, 25, 2, 4, 8, 19, 3], // %
      [0, 12, 18, 20, 8, 21, 18, 13], // &
      [0, 12, 4, 8], // '
      [0, 2, 4, 8, 8, 8, 4, 2], // (
      [0, 8, 4, 2, 2, 2, 4, 8], // )
      [0, 0, 4, 21, 14, 21, 4], // *
      [0, 0, 4, 4, 31, 4, 4], // +
      [0, 0, 0, 0, 0, 12, 4, 8], // ,
      [0, 0, 0, 0, 31], // -
      [0, 0, 0, 0, 0, 0, 12, 12], // .
      [0, 0, 1, 2, 4, 8, 16], // /
      [0, 14, 17, 19, 21, 25, 17, 14], // 0
      [0, 4, 12, 4, 4, 4, 4, 14], // 1
      [0, 14, 17, 1, 2, 4, 8, 31], // 2
      [0, 31, 2, 4, 2, 1, 17, 14], // 3
      [0, 2, 6, 10, 18, 31, 2, 2], // 4
      [0, 31, 16, 30, 1, 1, 17, 14], // 5
      [0, 6, 8, 16, 30, 17, 17, 14], // 6
      [0, 31, 1, 2, 4, 8, 8, 8], // 7
      [0, 14, 17, 17, 14, 17, 17, 14], // 8
      [0, 14, 17, 17, 15, 1, 2, 12], // 9
      [0, 0, 12, 12, 0, 12, 12], // :
      [0, 0, 12, 12, 0, 12, 4, 8], // ;
      [0, 2, 4, 8, 16, 8, 4, 2], // <
      [0, 0, 0, 31, 0, 31], // =
      [0, 8, 4, 2, 1, 2, 4, 8], // >
      [0, 14, 17, 1, 2, 4, 0, 4], // ?
      [0, 14, 17, 1, 13, 21, 21, 14], // @
      [0, 4, 10, 17, 17, 31, 17, 17], // A
      [0, 30, 17, 17, 30, 17, 17, 30], // B
      [0, 14, 17, 16, 16, 16, 17, 14], // C
      [0, 28, 18, 17, 17, 17, 18, 28], // D
      [0, 31, 16, 16, 30, 16, 16, 31], // E
      [0, 31, 16, 16, 30, 16, 16, 16], // F
      [0, 14, 17, 16, 23, 17, 17, 15], // G
      [0, 17, 17, 17, 31, 17, 17, 17], // H
      [0, 14, 4, 4, 4, 4, 4, 14], // I
      [0, 14, 2, 2, 2, 2, 18, 12], // J
      [0, 17, 18, 20, 24, 20, 18, 17], // K
      [0, 16, 16, 16, 16, 16, 16, 31], // L
      [0, 17, 27, 21, 21, 17, 17, 17], // M
      [0, 17, 17, 25, 21, 19, 17, 17], // N
      [0, 14, 17, 17, 17, 17, 17, 14], // O
      [0, 30, 17, 17, 30, 16, 16, 16], // P
      [0, 14, 17, 17, 17, 21, 18, 13], // Q
      [0, 30, 17, 17, 30, 20, 18, 17], // R
      [0, 15, 16, 16, 14, 1, 1, 30], // S
      [0, 31, 4, 4, 4, 4, 4, 4], // T
      [0, 17, 17, 17, 17, 17, 17, 14], // U
      [0, 17, 17, 17, 17, 17, 10, 4], // V
      [0, 17, 17, 17, 21, 21, 21, 10], // W
      [0, 17, 17, 10, 4, 10, 17, 17], // X
      [0, 17, 17, 17, 10, 4, 4, 4], // Y
      [0, 31, 1, 2, 4, 8, 16, 31], // Z
      [0, 14, 8, 8, 8, 8, 8, 14], // [
      [0, 0, 16, 8, 4, 2, 1], // \
      [0, 14, 2, 2, 2, 2, 2, 14], // ]
      [0, 4, 10, 17], // ^
      [0, 0, 0, 0, 0, 0, 0, 31], // _
      [0, 8, 4, 2], // `
      [0, 0, 0, 14, 1, 15, 17, 15], // a
      [0, 16, 16, 22, 25, 17, 17, 30], // b
      [0, 0, 0, 14, 16, 16, 17, 14], // c
      [0, 1, 1, 13, 19, 17, 17, 15], // d
      [0, 0, 0, 14, 17, 31, 16, 14], // e
      [0, 6, 9, 8, 28, 8, 8, 8], // f
      [0, 0, 15, 17, 17, 15, 1, 14], // g
      [0, 16, 16, 22, 25, 17, 17, 17], // h
      [0, 4, 0, 4, 12, 4, 4, 14], // i
      [0, 2, 0, 6, 2, 2, 18, 12], // j
      [0, 16, 16, 18, 20, 24, 20, 18], // k
      [0, 12, 4, 4, 4, 4, 4, 31], // l
      [0, 0, 0, 26, 21, 21, 17, 17], // m
      [0, 0, 0, 22, 25, 17, 17, 17], // n
      [0, 0, 0, 14, 17, 17, 17, 14], // o
      [0, 0, 0, 30, 17, 30, 16, 16], // p
      [0, 0, 0, 13, 19, 15, 1, 1], // q
      [0, 0, 0, 22, 25, 16, 16, 16], // r
      [0, 0, 0, 14, 16, 14, 1, 30], // s
      [0, 8, 8, 28, 8, 8, 9, 6], // t
      [0, 0, 0, 17, 17, 17, 19, 13], // u
      [0, 0, 0, 17, 17, 17, 10, 4], // v
      [0, 0, 0, 17, 17, 21, 21, 10], // w
      [0, 0, 0, 17, 10, 4, 10, 17], // x
      [0, 0, 0, 17, 17, 15, 1, 14], // y
      [0, 0, 0, 31, 2, 4, 8, 31], // z
      [0, 2, 4, 4, 8, 4, 4, 2], // {
      [0, 4, 4, 4, 4, 4, 4, 4], // |
      [0, 8, 4, 4, 2, 4, 4, 8], // }
      [0, 0, 0, 0, 13, 18], // ~
      [0, 4, 10, 17, 17, 17, 31], // del

      [0, 31, 17, 16, 30, 17, 17, 30], // .B
      [15, 5, 5, 9, 17, 31, 17, 17], // .D
      [0, 21, 21, 21, 14, 21, 21, 21], // .Zh
      [0, 30, 1, 1, 6, 1, 1, 30], // .Z
      [0, 17, 17, 19, 21, 25, 17, 17], // .I
      [10, 4, 17, 19, 21, 25, 17, 17], // .J
      [0, 15, 5, 5, 5, 5, 21, 9], // .L
      [0, 31, 17, 17, 17, 17, 17, 17], // .P
      [0, 17, 17, 17, 10, 4, 8, 16], // .U
      [0, 17, 17, 17, 17, 17, 31, 1], // .Ts
      [0, 17, 17, 17, 15, 1, 1, 1], // .Ch
      [0, 0, 21, 21, 21, 21, 21, 31], // .Sh
      [0, 21, 21, 21, 21, 21, 31, 1], // .Sch
      [0, 24, 8, 8, 14, 9, 9, 14], // .'
      [0, 17, 17, 17, 25, 21, 21, 25], // .Y
      [0, 14, 17, 5, 11, 1, 17, 14], // .E
      [0, 0, 0, 9, 21, 18, 18, 13], // alpha
      [0, 4, 6, 5, 5, 4, 28, 28], // note
      [0, 31, 17, 16, 16, 16, 16, 16], // .G
      [0, 0, 0, 31, 10, 10, 10, 19], // pi
      [0, 31, 16, 8, 4, 8, 16, 31], // Sigma
      [0, 0, 0, 15, 18, 18, 18, 12], // sigma
      [6, 5, 7, 5, 5, 29, 27, 3], // notes
      [0, 0, 1, 14, 20, 4, 4, 2], // tau
      [0, 4, 14, 14, 14, 31, 4], // bell
      [0, 14, 17, 17, 31, 17, 17, 14], // Theta
      [0, 0, 14, 17, 17, 17, 10, 27], // Omega
      [0, 6, 9, 4, 10, 17, 17, 14], // delta
      [0, 0, 0, 11, 21, 26], // inf
      [0, 0, 10, 31, 31, 31, 14, 4], // heart
      [0, 0, 0, 14, 16, 12, 17, 14], // epsilon
      [0, 14, 17, 17, 17, 17, 17, 17],
      [0, 27, 27, 27, 27, 27, 27, 27],
      [0, 4, 0, 0, 4, 4, 4, 4], // !!
      [0, 4, 14, 20, 20, 21, 14, 4], // cent
      [0, 6, 8, 8, 28, 8, 9, 22], // pound
      [0, 0, 17, 14, 10, 14, 17], // money
      [0, 17, 10, 31, 4, 31, 4, 4], // yen
      [0, 4, 4, 4, 0, 4, 4, 4], // pipe
      [0, 6, 9, 4, 10, 4, 18, 12], // paragraph
      [0, 2, 5, 4, 31, 4, 20, 8], // f
      [0, 31, 17, 21, 23, 21, 17, 31], // (C)
      [0, 14, 1, 15, 17, 15, 0, 31], // a_
      [0, 0, 5, 10, 20, 10, 5], // <<
      [0, 18, 21, 21, 29, 21, 21, 18], // .Ju
      [0, 15, 17, 17, 15, 5, 9, 17], // .Ja
      [0, 31, 17, 21, 17, 19, 21, 31], // (R)
      [0, 4, 8, 12], // `
      [12, 18, 18, 18, 12], // 0
      [0, 4, 4, 31, 4, 4, 0, 31], // +-
      [12, 18, 4, 8, 30], // 2
      [28, 2, 12, 2, 28], // 3
      [28, 18, 28, 16, 18, 23, 18, 3], // Pt
      [0, 17, 17, 17, 19, 29, 16, 16], // mu
      [0, 15, 19, 19, 15, 3, 3, 3], // pilcrow
      [0, 0, 0, 0, 12, 12], // dot
      [0, 0, 0, 10, 17, 21, 21, 10], // omega
      [8, 24, 8, 8, 28], // 1
      [0, 14, 17, 17, 17, 14, 0, 31], // o_
      [0, 0, 20, 10, 5, 10, 20], // >>
      [17, 18, 20, 10, 22, 10, 15, 2], // 1/4
      [17, 18, 20, 10, 21, 1, 2, 7], // 1/2
      [24, 8, 24, 9, 27, 5, 7, 1], // 3/4
      [0, 4, 0, 4, 8, 16, 17, 14], // !?
      [8, 4, 4, 10, 17, 31, 17, 17], // A\
      [2, 4, 4, 10, 17, 31, 17, 17], // A/
      [4, 10, 0, 14, 17, 31, 17, 17], // A^
      [13, 18, 0, 14, 17, 31, 17, 17], // A~
      [10, 0, 4, 10, 17, 31, 17, 17], // A:
      [4, 10, 4, 10, 17, 31, 17, 17], // Ao
      [0, 7, 12, 20, 23, 28, 20, 23], // AE
      [14, 17, 16, 16, 17, 14, 2, 6], // C,
      [8, 4, 0, 31, 16, 30, 16, 31], // E\
      [2, 4, 0, 31, 16, 30, 16, 31], // E/
      [4, 10, 0, 31, 16, 30, 16, 31], // E^
      [0, 10, 0, 31, 16, 30, 16, 31], // E:
      [8, 4, 0, 14, 4, 4, 4, 14], // I\
      [2, 4, 0, 14, 4, 4, 4, 14], // I/
      [4, 10, 0, 14, 4, 4, 4, 14], // I^
      [0, 10, 0, 14, 4, 4, 4, 14], // I:
      [0, 14, 9, 9, 29, 9, 9, 14], // -D
      [13, 18, 0, 17, 25, 21, 19, 17], // N~
      [8, 4, 14, 17, 17, 17, 17, 14], // O\
      [2, 4, 14, 17, 17, 17, 17, 14], // O/
      [4, 10, 0, 14, 17, 17, 17, 14], // O^
      [13, 18, 0, 14, 17, 17, 17, 14], // O~
      [10, 0, 14, 17, 17, 17, 17, 14], // O:
      [0, 0, 17, 10, 4, 10, 17], // X
      [0, 14, 4, 14, 21, 14, 4, 14], // .F
      [8, 4, 17, 17, 17, 17, 17, 14], // U\
      [2, 4, 17, 17, 17, 17, 17, 14], // U/
      [4, 10, 0, 17, 17, 17, 17, 14], // U^
      [10, 0, 17, 17, 17, 17, 17, 14], // U:
      [2, 4, 17, 10, 4, 4, 4, 4], // Y/
      [24, 8, 14, 9, 9, 14, 8, 28], // -P
      [0, 6, 9, 9, 14, 9, 9, 22], // beta
      [8, 4, 0, 14, 1, 15, 17, 15], // a\
      [2, 4, 0, 14, 1, 15, 17, 15], // a/
      [4, 10, 0, 14, 1, 15, 17, 15], // a^
      [13, 18, 0, 14, 1, 15, 17, 15], // a~
      [0, 10, 0, 14, 1, 15, 17, 15], // a:
      [4, 10, 4, 14, 1, 15, 17, 15], // ao
      [0, 0, 26, 5, 15, 20, 21, 10], // ae
      [0, 0, 14, 16, 17, 14, 4, 12], // c,
      [8, 4, 0, 14, 17, 31, 16, 14], // e\
      [2, 4, 0, 14, 17, 31, 16, 14], // e/
      [4, 10, 0, 14, 17, 31, 16, 14], // e^
      [0, 10, 0, 14, 17, 31, 16, 14], // e:
      [8, 4, 0, 4, 12, 4, 4, 14], // i\
      [2, 4, 0, 4, 12, 4, 4, 14], // i/
      [4, 10, 0, 4, 12, 4, 4, 14], // i^
      [0, 10, 0, 4, 12, 4, 4, 14], // i:
      [0, 20, 8, 20, 2, 15, 17, 14], // -d
      [13, 18, 0, 22, 25, 17, 17, 17], // n~
      [8, 4, 0, 14, 17, 17, 17, 14], // o\
      [2, 4, 0, 14, 17, 17, 17, 14], // o/
      [0, 4, 10, 0, 14, 17, 17, 14], // o^
      [0, 13, 18, 0, 14, 17, 17, 14], // o~
      [0, 10, 0, 14, 17, 17, 17, 14], // o:
      [0, 0, 4, 0, 31, 0, 4], // :/
      [0, 2, 4, 14, 21, 14, 4, 8], // .f
      [8, 4, 0, 17, 17, 17, 19, 13], // u\
      [2, 4, 0, 17, 17, 17, 19, 13], // u/
      [4, 10, 0, 17, 17, 17, 19, 13], // u^
      [0, 10, 0, 17, 17, 17, 19, 13], // u:
      [2, 4, 0, 17, 17, 15, 1, 14], // y/
      [0, 12, 4, 6, 5, 6, 4, 14], // p-
      [0, 10, 0, 17, 17, 15, 1, 14] // y:
    ]

    };

    return fonts;
  }
  
  tryRowsToColumns(rows) {
  const columns = new Uint8Array(5);

  for (let row = 0; row < 8; row++) {
    const rowValue = row < rows.length ? rows[row] & 0xFF : 0;

    for (let col = 0; col < 5; col++) {
      const bit = (rowValue >> (4 - col)) & 1;
      columns[col] |= bit << row;
    }
  }

  return columns;
}

columnsToHexString(columns) {
  if (columns.length !== 5) {
    throw new Error("Expected exactly 5 columns");
  }

  let hex = "";

  for (let i = 0; i < 5; i++) {
    const byte = columns[i];
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex.toUpperCase();
}

tryGetEnglishFontHex() {
    this.fontEnglishHexString = "";
    let cFont = this.loadByTyingFonts().fontUs;
    for(const i in cFont) { 
      this.fontEnglishHexString += this.columnsToHexString(
        this.tryRowsToColumns(cFont[i])
      );
    }
    return this.fontEnglishHexString;
}

  loadEnglishFont() {
      
      this.fontEnglishHexString =  "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004F00000007000700147F147F14242A7F2A12231308646236495522500005030000001C2241000041221C0014083E081408083E080800503000000808080808006060000020100804023E5149453E00427F400042615149462141454B311814127F1027454545393C4A49493001710905033649494936064949291E003636000000563600000814224100141414141400412214080201510906324979413E7E0909097E7F494949363E414141227F4141221C7F494949417F090909013E4149497A7F0808087F00417F41002041413F007F081422417F404040407F020C027F7F0408107F3E4141413E7F090909063E4151215E7F09192946464949493101017F01013F4040403F1F2040201F3F4038403F631408146307087008076151494543007F41410015167C16150041417F0004020102044040404040000102040020545454787F484444383844444420384444487F3854545418087E0901020C5252523E7F0804047800447D40002040443D007F1028440040417F40407C041804787C0804047838444444387C14141408081414187C7C080404084854545420043F4440203C4040207C1C2040201C3C4030403C44281028440C5050503C4464544C44000836410000007F0000004136080008082A1C08081C2A0808000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000705070000000000F01014040780000102040000000181800000A0A4A2A1E044434140C201078040018484C483848487848484828187C08087C08281840484878405454547C001800584038080808080801413D090710087C02010E0243221E42427E424222120A7F02423F02423E0A0A7F0A0A084642221E0403423E02424242427E024F221F024A4A40201C4222122A46023F424A46064840201E08464A321E0A4A3E09080E004E201E04453D0504007F08100044241F04044042424240422A122A0622127B16220040201F0078000204783F44444444024242221E040204083032027F0232021222520E002A2A2A40382422207040281028060A3E4A4A4A047F04140C4042427E404A4A4A4A7E040545251C0F40201F007C007E40307E402010087E4242427E0E0242221E424240201802040102000705070000384448304C2055545578F8545454282854544420FC4040207C38444C5424F04844443838444444FC20403C04040404000E00000004FD000A040A000018247E2410147F5440407C090505783845444538FC4844443838444448FC3C4A4A4A3C302810281858640464583C4140217C6355494141443C047C4445291129453C404040FC14147C1412443C1414747C141C147C10105410100000000000FFFFFFFFFF";
      
    this.fontEuHexString = '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000FE7C381010387CFE000C0A000C0A0A06000A0688CCEECC882266EE6622387C7C7C382070A8203E0804FE04082040FE402010105438101038541010808894A28080A294888040707C7040041C7C1C04000000000000009E0000000E000E0028FE28FE284854FE5424462610C8C46C92AA44A0000A0600000038448200008244380028107C102810107C101000A0600000101010101000C0C0000040201008047CA2928A7C0084FE800084C2A2928C42828A9662302824FE204E8A8A8A72789492926002E2120A066C9292926C0C9292523C006C6C000000AC6C00001028448200282828282800824428100402A2120C6492F2827CF8242224F8FE9292926C7C82828244FE82824438FE92929282FE121212027C829292F4FE101010FE0082FE82004082827E00FE10284482FE80808080FE041804FEFE081020FE7C8282827CFE1212120C7C82A242BCFE1232528C8C929292620202FE02027E8080807E3E4080403E7E8070807EC6281028C60E10E0100EC2A2928A8600FE8282000408102040008282FE0008040204088080808080000204080040A8A8A8F0FE90888870708888884070888890FE70A8A8A83010FC12020418A4A4A47CFE100808F00090FA80004080887A00FE205088008082FE8080F8083008F0F8100808F07088888870F82828281010282830F8F81008081090A8A8A840087E88804078808040F838408040387880608078885020508818A0A0A07888C8A8988800106C82000000FE000000826C100020101020107844424478FE92929266F0292721FFEE10FE10EE828292926CFE201008FEFC211209FC40827E02FEFE020202FE8E5020100E7E404040FE0E101010FEFC80FC80FC7E407E40FE02FE909060FE906000FE44928A927C7088906098C0C0FE0418FE02020206887808F888C6AA928282708888780860603FC5FE1008788804203C7E3C207C9292927CB8C404C4B860948A92643028102818387CF87C3850A8A88840FC020202FCFEFE00FEFE0000F200003844FE4420907C92824044382838442A2CF82C2A0000EE00004094AA520450907C1214FE82BA92FE90AAAAAABC1028542844FE107C827C8C523212FEFE82CAA2FE000C0A00000E11110E008888BE888812191512001115150A007F0525F2A0FE2020103E0C1212FEFE00303000007088608870121F1000009CA2A2A29C4428542810176854FA41170894CAB1151F6050F860908A8040F0292628F0F0282629F0F02A292AF0F229292AF1F0292429F0F02A252AF0F824FE92921E21A1E112F8A9AAA888F8A8AAA988F8AAA9AA88F8AAA8AA880089FA88000088FA8900008AF98A00008AF88A0010FE92827CFA112142F978858684787884868578708A898A707289898A717885848578442810284410AAFEAA107C8182807C7C8082817C78828182787C8180817C0408F2090481FFA42418807C92926C40A9AAA8F040A8AAA9F040AAA9AAF042A9A9AAF140AAA8AAF040AAADAAF0649478945818A4E4241070A9AAA83070A8AAA93070AAA9AA3070AAA8AA300091FA80000090FA81000092F982000092F882004AA4AAB060FA11090AF170898A887070888A897060949294606492929462708A888A70101054101010A87C2A1078818240F878808241F878828142F878828042F818A0A2A1780082FEA81018A2A0A278';


    // 256 caractere * 8 rânduri
    this.font = new Uint8Array(256 * 8);

    // parcurgem TOATE codurile tale valide: X2–X7
    for (let charCode = 0x02; charCode <= 0xF7; charCode++) {
      const lo = charCode & 0x0F;
      //if (lo < 2 || lo > 7) continue;

      // 1️⃣ ia fontul tău pe coloane (5 bytes)
      const columns = this.getFontBytesForCharCode(charCode);
      if (!columns) continue;

      const base = charCode << 3; // charCode * 8

      // 2️⃣ construim cele 8 rânduri
      for (let row = 0; row < 8; row++) {
        let rowByte = 0;

        for (let col = 0; col < 5; col++) {
          const bit = (columns[col] >> row) & 1;
          rowByte |= bit << (4 - col); // stânga → dreapta
        }

        this.font[base + row] = rowByte;
      }
    }
  }

  getByteN(n) {
    return parseInt(
        this.fontEnglishHexString[2 * n] +
        this.fontEnglishHexString[2 * n + 1],
        16
    );
  }

  getFontBytesForCharCode(charCode) {
    const index = this.getFontIndexFromCharCode(charCode);
    if (index < 0) return null;

    const bytes = new Uint8Array(5);
    const base = index * 5;

    for (let col = 0; col < 5; col++) {
      bytes[col] = this.getByteN(base + col);
      bytes[col] &= 0xFF;
    }

    return bytes;
  }

  getFontIndexFromCharCode(code) {
    const hi = code >> 4;
    const lo = code & 0x0F;
    
    return code;

    //if (lo < 2 || lo > 7) return -1;
  //  return hi * 6 + (lo - 2);
  }

  pretty(bits) {
    for (let i = 0; i < bits.length; i += 5) {
      console.log(bits.slice(i, i + 5));
    }
  }
}




class PanelKey {
  constructor({
    label = "",
    size = 48,
    onPress = () => {},
    onRelease = () => {},
    pressDuration = 150 // ms
  }) {
    this.label = label;
    this.size = size;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.pressDuration = pressDuration;
    this.pressed = false;
    this._releaseTimer = null;

    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d");

    this.canvas.addEventListener("mousedown", () => this.press());
    this.canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      this.press();
    });

    this.draw();
  }

  mount(parent) {
    parent.appendChild(this.canvas);
  }

  press() {
    if (this.pressed) return;

    this.pressed = true;
    this.draw();

    // fire callback immediately
    this.onPress(this.label);

    // auto-release after duration
    clearTimeout(this._releaseTimer);
    this._releaseTimer = setTimeout(() => {
      this.release();
    }, this.pressDuration);
  }

  release() {
    if (!this.pressed) return;
    this.pressed = false;
    this.draw();
    if(typeof this.onRelease === 'function'){
      this.onRelease();
    }
  }

  draw() {
    const ctx = this.ctx;
    const s = this.size;

    ctx.clearRect(0, 0, s, s);

    /* key body */
    ctx.fillStyle = this.pressed ? "#000" : "#1c1c1c";
    ctx.strokeStyle = this.pressed ? "#6dff9c" : "#2a2a2a";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(
      this.pressed ? 3 : 2,
      this.pressed ? 3 : 2,
      s - (this.pressed ? 6 : 4),
      s - (this.pressed ? 6 : 4),
      6
    );
    ctx.fill();
    ctx.stroke();

    /* glow */
    if (this.pressed) {
      ctx.shadowColor = "#6dff9c";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#6dff9c";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(2, 2, s - 4, s - 4, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    /* label */
    ctx.fillStyle = this.pressed ? "#e6fff0" : "#b0ffcc";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      this.label,
      s / 2,
      s / 2 + (this.pressed ? 3 : 1)
    );
  }
}

function addKey({
  id,
  label,
  onPress,
  onRelease,
  size = 36,
  nl = false
}) {
  const container = document.getElementById("devices");
  if (!container) return;
  showDevices();

  const wrapper = document.createElement("span");
  wrapper.className = "key-wrapper";

  const key = new PanelKey({ label, size, onPress, onRelease });
  key.mount(wrapper);

  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }
  
  // Store key instance for programmatic control
  if (!window.panelKeys) {
    window.panelKeys = new Map();
  }
  if(id){
    window.panelKeys.set(id, key);
  }
}


class RotaryKnob {
  constructor({
                states = 8,
                size = 64,
                color = "#6dff9c",
                analog = true,
                onChange = () => {},
                forLabels = {}
              }) {
    if (states < 2) {
      throw new Error("states must be >= 2");
    }

    this.states = states;
    this.bits = Math.ceil(Math.log2(states));
    this.size = size;
    this.activeColor = color;
    this.analog = analog;
    this.onChange = onChange;
    this.forLabels = forLabels; // Store custom labels for each state
    this.pressed = false;

    /* discrete state */
    this.state = 0;

    /* continuous rotation ratio (0..1) */
    this.angleRatio = 0;

    /* drag tracking */
    this.dragStartY = null;
    this.startRatio = 0;

    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size + 10; // extra space for shadow
    this.ctx = this.canvas.getContext("2d");

    this._bindEvents();
    this.draw();
  }

  mount(parent) {
    parent.appendChild(this.canvas);
  }

  /* =========================
     SENSITIVITY SCALING
  ========================= */

  _getStateMultiplier() {
    /*
      8 states = baseline (1.0)
      fewer states → easier precision
      more states → compressed travel
    */
    return Math.sqrt(this.states / 8);
  }

  /* =========================
     EVENT HANDLING
  ========================= */

  _bindEvents() {
    const DRAG_RANGE = 120; // px → full logical range

    const start = y => {
      this.dragStartY = y;
      this.startRatio = this.angleRatio;
      this.pressed = true;
      this.draw();
    };

    const move = y => {
      if (this.dragStartY === null) return;

      const delta = this.dragStartY - y;
      const multiplier = this._getStateMultiplier();

      let ratio =
          this.startRatio +
          delta / (DRAG_RANGE * multiplier);

      /* clamp */
      ratio = Math.max(0, Math.min(1, ratio));

      if (this.analog) {
        /* smooth analog rotation */
        this.angleRatio = ratio;

        const newState = Math.round(
            ratio * (this.states - 1)
        );

        if (newState !== this.state) {
          this.state = newState;
          this.onChange(this.getBinary());
        }

        this.draw();
      } else {
        /* snapped digital rotation */
        const newState = Math.round(
            ratio * (this.states - 1)
        );
        this.setState(newState);
      }
    };

    const end = () => {
      this.dragStartY = null;
      this.pressed = false;

      /* snap pointer cleanly to state in analog mode */
      if (this.analog) {
        this.angleRatio =
            this.state / (this.states - 1);
        this.draw();
      }
    };

    /* mouse */
    this.canvas.addEventListener("mousedown", e =>
        start(e.clientY)
    );
    window.addEventListener("mousemove", e =>
        move(e.clientY)
    );
    window.addEventListener("mouseup", end);

    /* touch */
    this.canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      start(e.touches[0].clientY);
    });

    window.addEventListener("touchmove", e => {
      if (!e.touches[0]) return;
      move(e.touches[0].clientY);
    });

    window.addEventListener("touchend", end);
  }

  /* =========================
     STATE CONTROL
  ========================= */

  setState(value) {
    const clamped = Math.max(
        0,
        Math.min(this.states - 1, value)
    );

    if (clamped === this.state) return;

    this.state = clamped;
    this.angleRatio =
        clamped / (this.states - 1);

    this.draw();
    this.onChange(this.getBinary());
  }

  getBinary() {
    return this.state
        .toString(2)
        .padStart(this.bits, "0");
  }

  /* =========================
     DRAWING
  ========================= */

  draw() {
    const ctx = this.ctx;
    const s = this.size;
    const r = s / 2;

    const START_ANGLE = -135 * Math.PI / 180;

    /* shorter arc for 2-state knob */
    const ARC_DEGREES = this.states === 2 ? 145 : 270;

    const RANGE =
        (ARC_DEGREES * Math.PI) / 180;

    const END_ANGLE =
        START_ANGLE + RANGE;

    ctx.clearRect(0, 0, s, s + 10);

   ctx.fillStyle = "#090909";
   ctx.beginPath();
   ctx.arc(r, r+5, r - 2, 0, Math.PI * 2);
   // ctx.shadowColor = "rgba(0,0,0,0.6)";
   // ctx.shadowBlur = 3;
//   ctx.shadowOffsetY = 2;
   ctx.fill();

    /* base knob */
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.fill();

    /* range arc */
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.arc(r, r, r - 6, START_ANGLE, END_ANGLE);
    ctx.stroke();

    /* ticks */
    const maxTicks = Math.min(this.states, 16);
    for (let i = 0; i < maxTicks; i++) {
      const t = i / (maxTicks - 1);
      const angle = START_ANGLE + t * RANGE;

      const isEdge =
          i === 0 || i === maxTicks - 1;

      ctx.strokeStyle = isEdge
          ? this.activeColor
          : "#555";

      ctx.lineWidth = isEdge ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.moveTo(
          r + Math.cos(angle) * (r - 14),
          r + Math.sin(angle) * (r - 14)
      );
      ctx.lineTo(
          r + Math.cos(angle) * (r - 20),
          r + Math.sin(angle) * (r - 20)
      );
      ctx.stroke();
    }

    /* active glow */
    if (this.state > 0) {
      ctx.shadowColor = this.activeColor + "50";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = this.activeColor + "ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r, r, r - 8, START_ANGLE, END_ANGLE);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (this.pressed) {
      ctx.save();
      // ctx.globalCompositeOperation = "source-atop";
      // ctx.shadowColor = "rgba(0,0,0,0.6)";
      // ctx.shadowBlur = 8;
      // ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(r, r, r - 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fill();
      ctx.restore();
    }

    /* pointer (smooth in analog mode) */
    const pointerAngle =
        START_ANGLE +
        this.angleRatio * RANGE;

    ctx.strokeStyle = "#e6fff0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r, r);
    ctx.lineTo(
        r + Math.cos(pointerAngle) * (r - 16),
        r + Math.sin(pointerAngle) * (r - 16)
    );
    ctx.stroke();

    /* center cap */
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.arc(r, r, 6, 0, Math.PI * 2);
    ctx.fill();
    if (this.pressed) {
      ctx.fillStyle = this.activeColor + "30";
      ctx.beginPath();
      ctx.arc(r, r, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


function addRotaryKnob({
                          id,
                          label = "",
                          states = 8,
                          onChange,
                          color = "#6dff9c",
                          forLabels = {},
                        }) {
    const analog = true;
  const container = document.getElementById("devices");
  if (!container) return;
  showDevices();

  const wrapper = document.createElement("div");
  wrapper.className = "knob-wrapper";

  const lbl = document.createElement("span");
  lbl.className = "knob-label";
  lbl.textContent = label ? label.slice(0, 5) : "";
  if (!label) lbl.style.visibility = "hidden";

  const value = document.createElement("span");
  value.className = "knob-value";
  value.style = "color: " + color;
  
  // Get initial label (use custom label if available, otherwise use state number)
  const initialState = 0;
  const initialLabel = forLabels[initialState] !== undefined ? forLabels[initialState] : initialState.toString();
  value.textContent = initialLabel;

  const knob = new RotaryKnob({
    states,
    color,
    onChange: () => {}, // Temporary empty function, will be set after
    analog,
    forLabels: forLabels,
  });
  
  // Store reference to value element in knob for direct access
  knob._valueElement = value;
  knob._forLabels = forLabels;
  
  // Create wrapper for onChange that updates the label
  // Set it after knob is created to ensure value element is accessible
  knob.onChange = (bin) => {
    const stateNum = parseInt(bin, 2);
    // Use custom label if available, otherwise use state number
    // Use forLabels from knob._forLabels to ensure we have the latest values
    const labels = knob._forLabels || forLabels || {};
    const displayLabel = (labels[stateNum] !== undefined) ? labels[stateNum] : stateNum.toString();
    // Update the value element text using stored reference
    if(knob._valueElement) {
      knob._valueElement.textContent = displayLabel;
    } else {
      // Fallback: try to find value element in DOM
      const wrapper = knob.canvas.parentElement;
      if(wrapper) {
        const valueEl = wrapper.querySelector('.knob-value');
        if(valueEl) {
          valueEl.textContent = displayLabel;
          knob._valueElement = valueEl; // Cache it for next time
        }
      }
    }
    // Call the original onChange callback
    if(onChange) onChange(bin);
  };

  wrapper.append(lbl);
  knob.mount(wrapper);
  wrapper.append(value);

  container.appendChild(wrapper);
  
  // Store the knob instance and value element for later use
  if (!window.rotaryKnobs) {
    window.rotaryKnobs = new Map();
  }
  window.rotaryKnobs.set(id, knob);
  
  // Store value element and forLabels for label updates
  if (!window.rotaryKnobValues) {
    window.rotaryKnobValues = new Map();
  }
  window.rotaryKnobValues.set(id, { value: value, forLabels: forLabels });
}

function setRotaryKnob(id, binaryValue) {
  if (!window.rotaryKnobs) {
    return;
  }
  
  const knob = window.rotaryKnobs.get(id);
  if (!knob) {
    return;
  }
  
  // Convert binary string to decimal state
  const state = parseInt(binaryValue, 2);
  
  // Clamp state to valid range (0 to states-1)
  const clampedState = Math.max(0, Math.min(knob.states - 1, state));
  
  // Set the state (this will trigger onChange if state changed)
  knob.setState(clampedState);
  
  // Update label if value element exists (onChange should handle this, but update here too for safety)
  if (knob._valueElement && knob._forLabels) {
    const displayLabel = (knob._forLabels[clampedState] !== undefined) ? knob._forLabels[clampedState] : clampedState.toString();
    knob._valueElement.textContent = displayLabel;
  } else if (window.rotaryKnobValues) {
    // Fallback to window.rotaryKnobValues if _valueElement is not set
    const knobData = window.rotaryKnobValues.get(id);
    if (knobData && knobData.value) {
      const forLabels = knobData.forLabels || {};
      const displayLabel = forLabels[clampedState] !== undefined ? forLabels[clampedState] : clampedState.toString();
      knobData.value.textContent = displayLabel;
    }
  }
}

function btnClr()  {
  console.log(confirm);
  if(!confirm) {
    showConfirm(2);
    return;
  }
  confirm = false;
  code.value='';
  updateFileNameDisplay('new');
}


let timerId = null;
let currentInterval = 1000;
let currentIdx = 0;
const secInterval = [1000, 500, 200, 100, 50, 25];

function toggleSEC() {
  const sec = document.getElementById('sec');
    if (timerId === null) {
        timerId = setInterval(doNext, currentInterval);
        sec.classList.toggle('btn--primary');
        console.log("Started at " + currentInterval + "ms");
    } else {
        clearInterval(timerId);
        timerId = null;
        sec.classList.remove('btn--primary');
        console.log("Stopped");
    }
}

function changeSECINT() {
    // Toggle between 1000 and 500
    currentIdx++;
    currentIdx = (currentIdx in secInterval) ? currentIdx :0;
    currentInterval = secInterval[currentIdx];
    const el = document.getElementById('secint');
    el.innerHTML = 1000 / currentInterval;
   // currentInterval = (currentInterval === 1000) ? 20 : 1000;
    console.log("Interval changed to: " + currentInterval + "ms");

    // If it's already running, restart it immediately with the new speed
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = setInterval(doNext, currentInterval);
    }
}

function doNext(count = 1) {
  if (!globalInterp) {
    throw Error("Program not running");
  }

  globalInterp.exec({ next: count }, false);

//  render(globalInterp.out);
  showVars();
}

 const dropdown = document.querySelector('.panel-dropdown');
  const trigger = dropdown.querySelector('.dropdown-trigger');
  const items = dropdown.querySelectorAll('.dropdown-item');

  trigger.addEventListener('click', () => {
    dropdown.classList.toggle('open');
    trigger.setAttribute(
      'aria-expanded',
      dropdown.classList.contains('open')
    );
  });

  items.forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('active');

      const panelName = item.dataset.panel;
      const isActive = item.classList.contains('active');

      // Hook your panel logic here
      //console.log(panelName, isActive ? 'ON' : 'OFF');
      if (panelName === 'output') {
          toggleOutput();
      } else if (panelName === 'variables') {
          toggleVariables();
      } else if (panelName === 'files') {
          toggleFiles();
      } else if (panelName === 'tabs') {
          toggleTabs();
      } else if (panelName === 'devices') {
          toggleDevices();
      } else if (panelName === 'command') {
          toggleCmd();
      } else if (panelName === 'ast') {
          toggleAST();
      }
    });
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  
function setPanelState(panelName, enabled) {
  const item = document.querySelector(
    `.dropdown-item[data-panel="${panelName}"]`
  );

  if (!item) return;

  item.classList.toggle('active', enabled);
}
  

 /* ---------- init device examples ------------ */

/*
addRotaryKnob({
  label: "SEL",
  states: 2,
  analog: true,
  onChange: bin => console.log(bin)
});

addRotaryKnob({
  label: "SEL",
  states: 3,
  analog: true,
  onChange: bin => console.log(bin)
});

addRotaryKnob({
  label: "SEL",
  states: 4,
  analog: true,
  onChange: bin => console.log(bin)
});

addRotaryKnob({
  label: "SEL",
  states: 5,
  color: "#2e71cc",
  analog: true,
  onChange: bin => console.log(bin)
});

addRotaryKnob({
  label: "SEL",
  states: 10,
  color: "#2e71cc",
  analog: true,
  onChange: bin => console.log(bin)
});

// 16-state knob

addRotaryKnob({
  label: "MODE",
  states: 16,
  color: "#2ecc71",
  analog: true,
  onChange: bin => console.log("MODE:", bin)
});

addRotaryKnob({
  label: "MODE",
  states: 25,
  color: "#2ecc71",
  analog: true,
  onChange: bin => console.log("MODE:", bin)
});


addRotaryKnob({
  label: "MODE",
  states: 32,
  color: "#dd2e71",
  analog: true,
  onChange: bin => console.log("MODE:", bin)
});*/


 /*
  addLed({
  id: "power",
  text: "PWR",
  color: "#2ecc71",
  value: true
});

addLed({
  id: "error",
  text: "ERR",
  color: "#ff4d4d",
  value: false, nl: true
});

setLed("error", true);
setLed("power", false);

addLed({ text: 'OUT',  id: "l1", color: "#00ff99", value: true, radius:0 });
addLed({ id: "l2", color: "#00ff99", value: false, radius:0 });
addLed({ id: "l3", color: "#00ff99", value: false, radius:0 });
addLed({ id: "l4", color: "#00ff99", value: false, radius:0 });
addLed({ id: "l5", color: "#00ff99", value: false, radius:0 });
addLed({ id: "l6", color: "#00ff99", value: true, radius:0, nl: true });

addLed({ text: 'OUT2',  id: "t1", color: "#00ff99", value: false, radius:0 });
addLed({ id: "t2", color: "#00ff99", value: true, radius:0 });
addLed({ id: "t3", color: "#00ff99", value: true, radius:0 });
addLed({ id: "t4", color: "#00ff99", value: false, radius:0 });
addLed({ id: "t5", color: "#00ff99", value: true, radius:0 });
addLed({ id: "t6", color: "#00ff99", value: true, radius:0, nl: true });


  // Example usage
  addSwitch({
    text: "WIFI",
    value: true,
    onChange: state => console.log("WIFI:", state)
  });

  addSwitch({
    text: "BT",
    value: false,
    onChange: state => console.log("BT:", state)
  });

  addSwitch({
    text: "GPS",
    value: true, nl: true
  });


addSevenSegment({
  id: "test",
  text: "SEG",
  color: "#2ecc71",
 // another way to initialize the segments: initial: { a: true, d: true, g: true },
  values: "11011010"
});

addSevenSegment({
  id: "test2",
 // color: "#2e71ff",
  color: "#2ecc71",
  values: "01100111"
});

addSevenSegment({
  id: "test3",
// some nice  color: "#ff312e",
  color: "#2ecc71",
  values: "11110110",
  nl: true,
});


//setSegment("test", "b", true);
//setSegment("test", "f", false);

//setSegment("test", "h", true);
//setSegment("test2", "h", true);
//setSegment("test3", "h", true);


addDipSwitch({
  id: "cfg",
  text: "CFG",
  count: 8,
  initial: [1, 0, 1, 0, 0, 1, 0, 1],
  nl: true
});

addCharacterLCD({
  id: "lcd1",
  rows: 8,
  cols: 30,
  pixelSize: 7,
  pixelGap:2,
  pixelOnColor: "#6dff9c",
 // backgroundColor: "#111"
});

lcdDisplays.get("lcd1").setRows({
  0: "01110",
  1: "10001",
  2: "10001",
  3: "11111",
  4: "10001",
  5: "10001",
  6: "10001",
  7: "00000"
});


lcdDisplays.get("lcd1").setRect(
  6, 0,
  {
  0: "01110",
  1: "10001",
  2: "10000",
  3: "01110",
  4: "00001",
  5: "10001",
  6: "01110",
  7: "00000"
});

addCharacterLCD({
  id: "lcd2",
  rows: 8,
  cols: 30,
  pixelSize: 7,
  pixelGap:1,
  glow: true,
  pixelOnColor: "#5588ff",
  backgroundColor: "#000",
  round: false, 
  nl: true,
});

lcdDisplays.get('lcd2').setRect(
  2,2, {
    0: "1111",
    1: "1001",
    2: "1001",
    3: "1111"
  }
)


addKey({ label: "A", onPress: k => console.log(k) });
addKey({ label: "B", onPress: k => console.log(k) });
addKey({ label: "C", onPress: k => console.log(k), nl: true });
addKey({
  label: "CLR",
  size: 64,
  onPress: () => console.log("CLEAR")
});

*/

