/* ================= PARSER ================= */

class Parser {
  constructor(t){
    this.t=t; this.c=t.get(); this.funcs=new Map();
    this.aliases = new Map();
    this.pcbs = new Map();
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
    
    if (this.c.type === 'KEYWORD' && this.c.value === 'pcb') {
      let peekI = this.t.i;
      while (peekI < this.t.src.length && /\s/.test(this.t.src[peekI])) peekI++;
      const nextChar = this.t.src[peekI];
      
      if (nextChar === '+') {
        this.parsePcbDefinition();
      } else {
        stmts.push(this.parsePcbInstance());
      }
      continue;
    }
    
    if (this.c.type === 'EOF') {
      continue;
    }
    
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
      continue;
    }
    
    stmts.push(this.stmt());
    
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
  const path = this.c.value;
  this.eat('LOAD');

  let alias = null;
  if (this.c.type === 'SYM' && this.c.value === '@') {
    this.eat('SYM', '@');

    if (this.c.type !== 'ID') {
      throw Error(`Expected alias name after @ at ${this.c.line}:${this.c.col}`);
    }

    alias = this.c.value;
    this.eat('ID');
  }

  const parts = path.split('/');
  const name = parts.pop();
  let location = parts.join('>');
  location = location ? location + '>' : '>';

  const content = fss.getFileContent(name, location);
  if (content == null) {
    throw Error(`LOAD failed: ${path} not found`);
  }

  const processedContent = preprocessRepeat(content);
  const subParser = new Parser(new Tokenizer(processedContent, path));
  subParser.parse();

  for (const [fname, fdef] of subParser.funcs.entries()) {
    this.funcs.set(fname, fdef);
  }

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
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
      continue;
    }
    
    if (this.c.line > lastLine + 1) break;
    lastLine = this.c.line;
    
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
  this.eat('KEYWORD', 'pcb');
  this.eat('SYM', '+');
  this.eat('SYM', '[');
  
  const name = this.c.value;
  this.eat('ID');
  
  const reserved = ['led', 'switch', '7seg', 'dip', 'mem', 'counter', 'adder', 'subtract', 'divider', 'multiplier', 'shifter', 'rotary', 'lcd'];
  if (reserved.includes(name)) {
    throw Error(`PCB name '${name}' is reserved at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }
  
  this.eat('SYM', ']');
  this.eat('SYM', ':');
  
  while (this.c.type === 'EOL') {
    this.c = this.t.get();
  }
  
  const pins = [];
  const pouts = [];
  let exec = 'set';
  let on = 'raise';
  const body = [];
  const nextSection = [];
  let returnSpec = null;
  
  let inNextSection = false;
  let lastLine = this.c.line;
  
  while (this.c.type !== 'EOF') {
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
      continue;
    }
    
    if (this.c.type === 'SYM' && this.c.value === '~~') {
      this.eat('SYM', '~~');
      inNextSection = true;
      lastLine = this.c.line;
      continue;
    }
    
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      
      if (this.c.type === 'TYPE') {
        const retType = this.c.value;
        this.eat('TYPE');
        
        const retVar = this.c.value;
        this.eat('ID');
        
        const bits = parseInt(retType);
        returnSpec = { bits, varName: retVar };
      }
      break;
    }
    
    lastLine = this.c.line;
    
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
    
    if (this.c.type === 'ID' && this.c.value === 'exec') {
      this.eat('ID');
      this.eat('SYM', ':');
      exec = this.c.value;
      this.eat('ID');
      continue;
    }
    
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
      lastLine = this.c.line;
      continue;
    }
    
    break;
  }
  
  const allPins = [...pins, ...pouts];
  const execPin = allPins.find(p => p.name === exec);
  if (!execPin) {
    throw Error(`PCB '${name}': exec '${exec}' must reference an existing pin. Available pins: ${allPins.map(p => p.name).join(', ')}`);
  }
  
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
  this.eat('KEYWORD', 'pcb');
  this.eat('SYM', '[');
  
  const pcbName = this.c.value;
  this.eat('ID');
  
  this.eat('SYM', ']');
  
  if (this.c.value !== '.') {
    throw Error(`Expected instance name starting with '.' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }
  this.eat('SYM', '.');
  
  const instanceName = '.' + this.c.value;
  this.eat('ID');
  
  this.eat('SYM', ':');
  this.eat('SYM', ':');
  
  return { pcbInstance: { pcbName, instanceName } };
}

  // --- Dispatch map for keyword statements ---
  stmt(){
    if (this.c.type === 'TYPE') return this.var();

    if (this.c.type === 'KEYWORD') {
      const handler = Parser.KEYWORD_HANDLERS[this.c.value];
      if (handler) return this[handler]();
    }

    if (this.c.type === 'SYM' && this.c.value === '.' && this.peekNextIsComponentAssign()) {
      return this.assignment();
    }
    if ((this.c.type === 'ID' || this.c.type === 'SPECIAL') && this.peekNextIsAssign()) {
      return this.assignment();
    }
    if ((this.c.type === 'ID' || this.c.type === 'SPECIAL') && this.peekNextIsCommaThenType()) {
      return this.mixedVar();
    }
    throw Error(`Invalid statement starting with '${this.c.value}' (${this.c.type}) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }
  
  peekNextIsComponentAssign(){
    let i = this.t.i;
    let src = this.t.src;
    
    while (i < src.length && /\s/.test(src[i])) i++;
    
    if (i >= src.length || !/[a-zA-Z]/.test(src[i])) return false;
    
    while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) i++;
    
    while (i < src.length && /\s/.test(src[i])) i++;
    
    if (i < src.length && src[i] === ':') {
      i++;
      while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
      
      if (i < src.length && src[i] === '{') {
        return true;
      }
      
      while (i < src.length && /\s/.test(src[i])) i++;
      
      if (i >= src.length || !/[a-zA-Z]/.test(src[i])) return false;
      while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) i++;
      while (i < src.length && /\s/.test(src[i])) i++;
      return i < src.length && src[i] === '=';
    } else {
      return i < src.length && src[i] === '=';
    }
  }

  peekNextIsCommaThenType(){
    let i = this.t.i;
    while(i < this.t.src.length && /\s/.test(this.t.src[i])) i++;
    if(i >= this.t.src.length || this.t.src[i] !== ',') return false;
    i++;
    while(i < this.t.src.length && /\s/.test(this.t.src[i])) i++;
    if(i >= this.t.src.length) return false;
    return /[0-9]/.test(this.t.src[i]);
  }

  parsePropertyBlock(componentName) {
    this.eat('SYM', '{');
    
    const properties = [];
    let hasGetProperty = false;
    const REDIRECT_PROPS = new Set(['get', 'mod', 'carry', 'over', 'out']);
    
    while (!(this.c.type === 'SYM' && this.c.value === '}')) {
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }
      
      if (this.c.type === 'EOF') {
        throw Error(`Unexpected end of file in property block for ${componentName}`);
      }
      
      if (this.c.type !== 'ID') {
        throw Error(`Expected property name in property block at ${this.c.line}:${this.c.col}, got ${this.c.type} '${this.c.value}'`);
      }
      
      const propName = this.c.value;
      this.eat('ID');
      
      // --- DRY redirect properties: get>, mod>, carry>, over>, out> ---
      if (REDIRECT_PROPS.has(propName) && this.c.type === 'SYM' && this.c.value === '>') {
        if (propName === 'get') {
          if (hasGetProperty) {
            throw Error(`Only one get> property allowed per property block at ${this.c.line}:${this.c.col}`);
          }
          hasGetProperty = true;
        }

        this.eat('SYM', '>');

        if (this.c.type === 'SYM' && this.c.value === '=') {
          this.eat('SYM', '=');
        }

        const targetAtom = this.atom();

        if (targetAtom.bitRange) {
          throw Error(`Bit ranges not allowed in ${propName}> property at ${this.c.line}:${this.c.col}`);
        }

        if (!targetAtom.var || targetAtom.var.startsWith('.')) {
          throw Error(`Invalid target for ${propName}> property at ${this.c.line}:${this.c.col}`);
        }

        properties.push({ property: propName + '>', target: targetAtom, expr: null });
        continue;
      }
      
      // Generic pout> handler for PCB instances
      if(this.c.type === 'SYM' && this.c.value === '>'){
        this.eat('SYM', '>');

        if(this.c.type === 'SYM' && this.c.value === '='){
          this.eat('SYM', '=');
        }

        const targetAtom = this.atom();

        if(targetAtom.bitRange){
          throw Error(`Bit ranges not allowed in ${propName}>= property at ${this.c.line}:${this.c.col}`);
        }

        if(!targetAtom.var || targetAtom.var.startsWith('.')){
          throw Error(`Invalid target for ${propName}>= property at ${this.c.line}:${this.c.col}`);
        }

        properties.push({ property: 'pout>', poutName: propName, target: targetAtom, expr: null });
        continue;
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
  if (this.c.type === 'SYM' && this.c.value === '.') {
    const savedPos = this.t.i;
    const savedLine = this.t.line;
    const savedCol = this.t.col;
    
    let i = this.t.i;
    const src = this.t.src;
    
    while (i < src.length && /\s/.test(src[i])) i++;
    
    if (i < src.length && /[a-zA-Z]/.test(src[i])) {
      while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) i++;
      
      while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
      
      if (i < src.length && src[i] === ':') {
        i++;
        while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
        
        if (i < src.length && src[i] === '{') {
          this.eat('SYM', '.');
          
          const compName = '.' + this.c.value;
          this.eat('ID');
          
          this.eat('SYM', ':');
          
          return this.parsePropertyBlock(compName);
        }
      }
    }
  }
  
  const targetAtom = this.atom();
  
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
    const name = this.c.value;
    this.eat(this.c.type);
    
    this.eat('SYM', '=');
    const expr = this.expr();
   
    return {
      assignment: {name, expr}
    };
  }

  mixedVar(){
    const decls = [];
    
    if(this.c.type === 'ID' || this.c.type === 'SPECIAL'){
      const name = this.c.value;
      this.eat(this.c.type);
      decls.push({ type: null, name, existing: true, line: this.c.line, col: this.c.col });
      
      if(this.c.value === ','){
        this.eat('SYM', ',');
      }
    }
    
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

    if (this.c.value === ':=') {
      this.eat('SYM', ':=');
      const initExpr = this.initLiteral();
      return {
        decls,
        expr: null,
        initExpr,
        line: this.c.line,
        col: this.c.col
      };
    } else if (this.c.value === '=') {
  this.eat('SYM', '=');
  return {
    decls,
        expr: this.expr(),
        line: this.c.line,
        col: this.c.col
      };
    } else {
      return {
        decls,
        expr: null,
        line: this.c.line,
        col: this.c.col
      };
    }
  }

  initLiteral(){
    let notPrefix = false;
    if(this.c.type === 'SYM' && this.c.value === '!'){
      this.eat('SYM', '!');
      notPrefix = true;
    }
    let atom;
    if(this.c.type === 'BIN'){
      atom = {bin: this.c.value};
      this.eat('BIN');
    } else if(this.c.type === 'HEX'){
      atom = {hex: this.c.value};
      this.eat('HEX');
    } else if(this.c.type === 'DEC'){
      atom = {dec: this.c.value};
      this.eat('DEC');
    } else {
      throw Error(`Expected a literal value (binary, hex ^, or decimal \\) after := at ${this.c.line}:${this.c.col}`);
    }
    if(notPrefix) atom.not = true;
    return atom;
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
    
    let count = 1;
    if(this.c.value === ','){
      this.eat('SYM',',');
      
      if(this.c.type === 'BIN' || this.c.type === 'DEC'){
        count = parseInt(this.c.value, 10);
        if(isNaN(count) || count < 1){
          throw Error(`Invalid count in NEXT at ${this.c.line}:${this.c.col}, must be a positive integer`);
        }
        this.eat(this.c.type);
        this.eat('SYM',')');
      } else {
        this.t.skip();
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
        
        this.t.skip();
        if(this.t.eof() || this.t.peek() !== ')'){
          throw Error(`Expected ')' after count in NEXT at ${this.t.line}:${this.t.col}`);
        }
        this.t.next();
        this.c = this.t.get();
      }
    } else {
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

    const componentShortnames = {
      '7': '7seg',
      '+': 'adder',
      '-': 'subtract',
      '*': 'multiplier',
      '/': 'divider',
      '>': 'shifter',
      '=': 'counter'
    };

    let compType = null;

    if(this.c.type === 'SYM' && componentShortnames[this.c.value]){
      compType = componentShortnames[this.c.value];
      this.eat('SYM');
    } else if(this.c.type === 'ID' && (this.c.value === 'led' || this.c.value === 'switch' || this.c.value === 'dip' || this.c.value === 'mem' || this.c.value === 'reg' || this.c.value === 'counter' || this.c.value === 'adder' || this.c.value === 'subtract' || this.c.value === 'divider' || this.c.value === 'multiplier' || this.c.value === 'shifter' || this.c.value === 'rotary' || this.c.value === 'lcd' || this.c.value === 'key')){
      compType = this.c.value;
      this.eat('ID');
    } else if(this.c.value === '7seg'){
      compType = '7seg';
      this.eat(this.c.type);
    } else if(this.c.type === 'DEC' && this.c.value === '7'){
      compType = '7seg';
      this.eat('DEC');
    } else {
      throw Error(`Expected 'led', 'switch', '7seg' (or '7'), 'dip', 'mem', 'reg', 'counter' (or '='), 'adder' (or '+'), 'subtract' (or '-'), 'divider' (or '/'), 'multiplier' (or '*'), 'shifter' (or '>'), 'rotary', 'lcd', or 'key' after 'comp [' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    this.eat('SYM', ']');

    if (this.c.value !== '.') {
      throw Error(`Expected '.' but got ${this.c.type === 'TYPE' ? `type '${this.c.value}'` : `'${this.c.value}'`} at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    this.eat('SYM', '.');

    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected component name after '.' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const name = '.' + this.c.value;
    this.eat(this.c.type);

    this.t.skip();

    const attributes = {};
    let initialValue = null;

    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');

      if (this.c.type === 'SYM' && this.c.value === ':') {
        this.eat('SYM', ':');

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

      this.t.skip();
    }

    let foundEndColon = false;

    while (this.c.type !== 'EOF' && !foundEndColon) {
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }
      
      this.t.skip();

      if (this.c.type === 'EOF') {
        break;
      }
      
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }

      let debug = (this.c.value === 'nl' && this.c.line === 12);

      if (this.c.type === 'SYM' && this.c.value === ':') {
        const beforeColonLine = this.c.line;
        const beforeColonCol = this.c.col;

        this.eat('SYM', ':');

        this.t.skip();

        if (this.c.type === 'TYPE') {
          foundEndColon = true;
          break;
        }

        if (this.c.type === 'SYM' && this.c.value === '.') {
          foundEndColon = true;
          break;
        }

        let finalCheckI = this.t.i;
        let foundNewline = false;
        while (finalCheckI < this.t.src.length && (/\s/.test(this.t.src[finalCheckI]) || this.t.src[finalCheckI] === '\n')) {
          if (this.t.src[finalCheckI] === '\n') {
            foundNewline = true;
          }
          finalCheckI++;
        }
        if (foundNewline && finalCheckI < this.t.src.length && this.t.src[finalCheckI] === '.') {
          foundEndColon = true;
          break;
        }
        if (finalCheckI < this.t.src.length && this.t.src[finalCheckI] === '.') {
          foundEndColon = true;
          break;
        }

        if (this.c.line > beforeColonLine) {
          foundEndColon = true;
          break;
        }

        if (this.c.type === 'EOF' || this.c.value === '\n') {
          foundEndColon = true;
          break;
        }

        if (beforeColonCol <= 5) {
          let checkLine = beforeColonLine;
          let tempI = this.t.i;
          while (tempI < this.t.src.length && /\s/.test(this.t.src[tempI])) {
            if (this.t.src[tempI] === '\n') {
              checkLine++;
            }
            tempI++;
          }
          if (checkLine > beforeColonLine && tempI < this.t.src.length && this.t.src[tempI] === '.') {
            foundEndColon = true;
            break;
          }
        }
      }

      if (foundEndColon) {
        break;
      }

      if (this.c.type === 'ID') {
        const attrName = this.c.value;
        this.eat('ID');

        const attributesWithNoValues = ['square', 'nl', 'circular', 'glow', 'rgb', 'noLabels'];
        
        if (attrName === 'for' && this.c.type === 'SYM' && this.c.value === '.') {
          this.eat('SYM', '.');
          
          if (this.c.type !== 'DEC' && this.c.type !== 'BIN') {
            throw Error(`Expected state number after 'for.' at ${this.c.line}:${this.c.col}`);
          }
          
          const stateNum = parseInt(this.c.value, 10);
          if (isNaN(stateNum)) {
            throw Error(`Invalid state number in attribute 'for.${this.c.value}' at ${this.c.line}:${this.c.col}`);
          }
          
          this.eat(this.c.type);
          
          if (this.c.type !== 'SYM' || this.c.value !== ':') {
            throw Error(`Expected ':' after 'for.${stateNum}' at ${this.c.line}:${this.c.col}`);
          }
          
          this.eat('SYM', ':');
          
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
            let checkI = colonPos + 1;
            while (checkI < this.t.src.length && (this.t.src[checkI] === ' ' || this.t.src[checkI] === '\t')) {
              checkI++;
            }
            
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
              
              if (!attributes.forLabels) {
                attributes.forLabels = {};
              }
              attributes.forLabels[stateNum] = strValue;
              
              this.c = this.t.get();
              continue;
            } else {
              this.c = this.t.get();
            }
          }
        }

        if (this.c.value === ':' && !attributesWithNoValues.includes(attrName)) {
          
          this.eat('SYM', ':');
          
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
            let checkI = colonPos + 1;
            while (checkI < this.t.src.length && (this.t.src[checkI] === ' ' || this.t.src[checkI] === '\t')) {
              checkI++;
            }
            
            const segAttributes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            if (segAttributes.includes(attrName) && checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
              let numStr = '';
              while (checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
                numStr += this.t.src[checkI];
                checkI++;
              }
              
              const segValue = parseInt(numStr, 10);
              if (segValue !== 0 && segValue !== 1) {
                throw Error(`Segment ${attrName} value must be 0 or 1 at ${this.c.line}:${this.c.col}`);
              }
              
              if (!attributes.segments) {
                attributes.segments = {};
              }
              attributes.segments[attrName] = segValue.toString();
              
              this.t.i = checkI;
              let tempCol = this.c.col;
              for (let i = colonPos + 1; i < checkI; i++) {
                tempCol++;
              }
              this.t.col = tempCol;
              
              this.c = this.t.get();
              continue;
            }
            
            if (checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
              let numStr = '';
              while (checkI < this.t.src.length && /[0-9]/.test(this.t.src[checkI])) {
                numStr += this.t.src[checkI];
                checkI++;
              }
              
              let tokenType = 'DEC';
              if (/^[01]+$/.test(numStr)) {
                tokenType = 'BIN';
              }
              
              this.c = {
                type: tokenType,
                value: numStr,
                line: this.c.line,
                col: colonPos + 1,
                file: this.c.file
              };
              
              this.t.i = checkI;
              this.t.col = this.c.col + numStr.length;
            } else if (checkI < this.t.src.length && this.t.src[checkI] === '^') {
              this.t.i = checkI;
              this.c = this.t.get();
            } else if (checkI < this.t.src.length && (this.t.src[checkI] === '"' || this.t.src[checkI] === "'")) {
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
              
              attributes[attrName] = strValue;
              this.c = this.t.get();
              continue;
            } else {
              this.c = this.t.get();
            }
          }
          
          if (this.c.type === 'HEX') {
            attributes[attrName] = '#' + this.c.value;
            this.eat('HEX');
          } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
            attributes[attrName] = this.c.value;
            this.eat(this.c.type);
              } else if (this.c.type === 'SYM' && (this.c.value === '"' || this.c.value === "'")) {
                const quote = this.c.value;
                
                let quotePos = -1;
                for (let i = this.t.i - 1; i >= 0 && i >= this.t.i - 200; i--) {
                  if (this.t.src[i] === quote) {
                    quotePos = i;
                    break;
                  }
                }
                
                if (quotePos === -1) {
                  let checkPos = this.t.i;
                  while (checkPos < this.t.src.length && (this.t.src[checkPos] === ' ' || this.t.src[checkPos] === '\t')) {
                    checkPos++;
                  }
                  if (checkPos < this.t.src.length && this.t.src[checkPos] === quote) {
                    quotePos = checkPos;
                  }
                }
                
                if (quotePos === -1) {
                  quotePos = this.t.i;
                }
                
                this.eat('SYM');
                
                let pos = quotePos + 1;
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
                
                const startPos = quotePos + 1;
                
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
                
                this.t.i = pos;
                this.t.line = tempLine;
                this.t.col = tempCol;
                
                attributes[attrName] = strValue;
                this.c = this.t.get();
              } else {
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
          attributes.nl = true;
          this.t.skip();
          if (this.c.type === 'SYM' && this.c.value === ':') {
            const nlColonLine = this.c.line;
            const nlColonCol = this.c.col;
            this.eat('SYM', ':');
            this.t.skip();
            let checkI = this.t.i;
            let foundNewline = false;
            while (checkI < this.t.src.length && (/\s/.test(this.t.src[checkI]) || this.t.src[checkI] === '\n')) {
              if (this.t.src[checkI] === '\n') {
                foundNewline = true;
              }
              checkI++;
            }
            if (foundNewline && checkI < this.t.src.length && this.t.src[checkI] === '.') {
              foundEndColon = true;
              break;
            }
            if (checkI < this.t.src.length && this.t.src[checkI] === '.') {
              foundEndColon = true;
              break;
            }
            if (this.c.line > nlColonLine) {
              foundEndColon = true;
              break;
            }
            if (this.c.type === 'EOF' || this.c.value === '\n') {
              foundEndColon = true;
              break;
            }
          }
        } else if (attrName === 'square') {
          attributes.square = true;
        } else if (attrName === 'circular') {
          attributes.circular = true;
        } else if (attrName === 'glow') {
          attributes.glow = true;
        } else if (attrName === 'rgb') {
          attributes.rgb = true;
        } else if (attrName === 'noLabels') {
          attributes.noLabels = true;
        } else {
          continue;
        }
        } else if (this.c.value === '=') {
          this.eat('SYM', '=');
          this.t.skip();
          if (this.c.type === 'BIN') {
            initialValue = this.c.value;
            this.eat('BIN');
          } else if (this.c.type === 'DEC') {
            const dec = parseInt(this.c.value, 10);
            const typeMatch = type.match(/^(\d+)(bit|wire)$/);
            const bits = typeMatch ? parseInt(typeMatch[1]) : null;
            if (bits) {
              initialValue = dec.toString(2).padStart(bits, '0');
            } else {
              initialValue = this.c.value;
            }
            this.eat('DEC');
          } else if (this.c.type === 'ID' || this.c.type === 'SPECIAL') {
            throw Error(`Variable assignments after '=' in component declaration are not supported. Use a separate assignment statement like '.${name.substring(1)} = ${this.c.value}' after the component declaration.`);
          } else if (this.c.type === 'SYM' && this.c.value === '.') {
            throw Error(`Component assignments after '=' in component declaration are not supported. Use a separate assignment statement after the component declaration.`);
          } else {
            throw Error(`Expected binary or decimal value after '=' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
          }
        } else {
          if (this.c.type === 'SYM' && (this.c.value === '\n' || this.c.value === ' ' || this.c.value === '\t')) {
            this.eat(this.c.type);
          } else if (this.c.value !== ':') {
            this.eat(this.c.type);
          }
        }
      }

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

  expr(){
    const p=[this.atom()];
    while(this.c.value==='+'){ this.eat('SYM','+'); p.push(this.atom()); }

    if (this.c.type === 'SYM' && (this.c.value === '<' || this.c.value === '>')) {
      const shiftFn = this.c.value === '<' ? 'LSHIFT' : 'RSHIFT';
      this.eat('SYM', this.c.value);

      const rhs = [this.atom()];
      while (this.c.value === '+') { this.eat('SYM', '+'); rhs.push(this.atom()); }

      let fillBit = '0';
      if (this.c.type === 'ID' && (this.c.value === 'w0' || this.c.value === 'w1')) {
        fillBit = this.c.value[1];
        this.eat('ID');
      }

      return [{ call: { name: shiftFn, alias: null }, args: [p, rhs, [{ bin: fillBit }]] }];
    }

    return p;
  }
  atom() {
    let notPrefix = false;
    if (this.c.type === 'SYM' && this.c.value === '!') {
      this.eat('SYM', '!');
      notPrefix = true;
    }

    const addNot = (result) => {
      if (notPrefix) {
        result.not = true;
      }
      return result;
    };

    if (
  this.c.type === 'REF' &&
  this.c.value.includes('.') &&
  this.t.peek() === '/'
) {
  const full = this.c.value;
  this.eat('REF');

  this.eat('SYM', '/');

  if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
    throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
  }

  const len = parseInt(this.c.value, 10);
  this.eat(this.c.type);

  const body = full.slice(1);
  const [idxStr, startStr] = body.split('.');

  const start = parseInt(startStr, 10);
  const end = start + len - 1;

  return addNot({
    refLiteral: idxStr,
    bitRange: { start, end }
  });
}
    if (this.c.type === 'REF' && this.c.value.includes('.')) {
  const full = this.c.value;
  this.eat('REF');
  
  const body = full.slice(1);
  
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
  
  if (this.c.type === 'REF' && this.c.value === '&') {
    this.eat('REF');
    
    if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
      throw Error(`Expected reference index after & at ${this.c.line}:${this.c.col}`);
    }
    
    const refIndex = this.c.value;
    this.eat(this.c.type);
    
    let bitRange = null;
    
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
    
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit number after '.' at ${this.c.line}:${this.c.col}`);
      }
      
      const start = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      
      let end = start;
      
      if (this.c.type === 'SYM' && this.c.value === '-') {
        this.eat('SYM', '-');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected bit number after '-' at ${this.c.line}:${this.c.col}`);
        }
        
        end = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        
        return addNot({ var: v, bitRange: { start, end } });
      }
      
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
      
      return addNot({ var: v, bitRange: { start, end } });
    }
    
    return addNot({ var: v });
  }
  
  if (this.c.type === 'REG' || this.c.type === 'MUX' || this.c.type === 'DEMUX') {
    const n = this.c.value;
    this.eat(this.c.type);
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.call({ name: n, alias: null }));
    }
    throw Error(`${n} must be called as a function at ${this.c.line}:${this.c.col}`);
  }
  
  if (this.c.type === 'SYM' && this.c.value === '.') {
    this.eat('SYM', '.');
    
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected component name after '.' at ${this.c.line}:${this.c.col}`);
    }
    
    const compName = '.' + this.c.value;
    this.eat(this.c.type);
    
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      
      if (this.c.type !== 'ID') {
        throw Error(`Expected property name after ':' at ${this.c.line}:${this.c.col}`);
      }
      
      const property = this.c.value;
      this.eat('ID');
      
      if (this.c.type === 'SYM' && this.c.value === '.') {
        this.eat('SYM', '.');

        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected bit number after '.' at ${this.c.line}:${this.c.col}`);
        }

        const start = parseInt(this.c.value, 10);
        this.eat(this.c.type);

        let end = start;

        if (this.c.type === 'SYM' && this.c.value === '-') {
          this.eat('SYM', '-');

          if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
            throw Error(`Expected bit number after '-' at ${this.c.line}:${this.c.col}`);
          }

          end = parseInt(this.c.value, 10);
          this.eat(this.c.type);

          return addNot({
            var: compName,
            property: property,
            bitRange: { start, end }
          });
        }

        if (this.c.type === 'SYM' && this.c.value === '/') {
          this.eat('SYM', '/');

          if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
            throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
          }

          const len = parseInt(this.c.value, 10);
          this.eat(this.c.type);
          end = start + len - 1;

          return addNot({
            var: compName,
            property: property,
            bitRange: { start, end }
          });
        }

        return addNot({
          var: compName,
          property: property,
          bitRange: { start, end }
        });
      }

      return addNot({
        var: compName,
        property: property
      });
    }
    
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
  
  if (this.c.type === 'ID') {
    const name = this.c.value;
    this.eat('ID');
    
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
    
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.call({ name, alias: null }));
    }
    
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');

      let start = null, startExpr = null, isDynamic = false;

      if (this.c.type === 'SYM' && this.c.value === '(') {
        this.eat('SYM', '(');
        startExpr = this.expr();
        this.eat('SYM', ')');
        isDynamic = true;
      } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
        start = parseInt(this.c.value, 10);
        this.eat(this.c.type);
      } else {
        throw Error(`Expected bit number or '(' after '.' at ${this.c.line}:${this.c.col}`);
      }

      if (this.c.type === 'SYM' && this.c.value === '-') {
        this.eat('SYM', '-');
        let end = null, endExpr = null;
        if (this.c.type === 'SYM' && this.c.value === '(') {
          this.eat('SYM', '(');
          endExpr = this.expr();
          this.eat('SYM', ')');
          isDynamic = true;
        } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
          end = parseInt(this.c.value, 10);
          this.eat(this.c.type);
        } else {
          throw Error(`Expected bit number or '(' after '-' at ${this.c.line}:${this.c.col}`);
        }
        if (!isDynamic) return addNot({ var: name, bitRange: { start, end } });
        return addNot({ var: name, bitRange: { start, startExpr, end, endExpr, isDynamic } });
      }

      if (this.c.type === 'SYM' && this.c.value === '/') {
        this.eat('SYM', '/');
        let len = null, lenExpr = null;
        if (this.c.type === 'SYM' && this.c.value === '(') {
          this.eat('SYM', '(');
          lenExpr = this.expr();
          this.eat('SYM', ')');
          isDynamic = true;
        } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
          len = parseInt(this.c.value, 10);
          if (len < 1) throw Error(`Length must be >= 1 at ${this.c.line}:${this.c.col}`);
          this.eat(this.c.type);
        } else {
          throw Error(`Expected length or '(' after '/' at ${this.c.line}:${this.c.col}`);
        }
        if (!isDynamic) return addNot({ var: name, bitRange: { start, end: start + len - 1 } });
        return addNot({ var: name, bitRange: { start, startExpr, len, lenExpr, isDynamic, isLength: true } });
      }

      if (!isDynamic) return addNot({ var: name, bitRange: { start, end: start } });
      return addNot({ var: name, bitRange: { start, startExpr, isDynamic } });
    }
    
    return addNot({ var: name });
  }
  
  throw Error(`Bad expression at ${this.c.line}:${this.c.col}`);
}

isBuiltinFunction(name) {
  if (name === 'show') return true;

  if (['NOT','AND','OR','XOR','NXOR','NAND','NOR','EQ','LATCH',
       'LSHIFT','RSHIFT'].includes(name)) {
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

Parser.KEYWORD_HANDLERS = {
  show: 'show',
  NEXT: 'next',
  TEST: 'test',
  MODE: 'mode',
  comp: 'parseComp',
  pcb: 'parsePcbInstance',
};
