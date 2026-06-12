/* ================= PARSER ================= */

class Parser {
  constructor(t, componentRegistry){
    this.t=t; this.c=t.get(); this.funcs=new Map();
    this.aliases = new Map();
    this.pcbs = new Map();
    this.chips = new Map();
    this.boards = new Map();
    this.inlines = new Map();
    this.probes = [];
    this.componentRegistry = componentRegistry || null;
  }
  eat(type,val){
  //  console.log(type + ': ' + val);
    if(this.c.type===type && (val==null||this.c.value===val)) {
      this.c=this.t.get();
      //console.log(this.c);
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

    if (this.c.type === 'KEYWORD' && this.c.value === 'chip') {
      let peekI = this.t.i;
      while (peekI < this.t.src.length && /\s/.test(this.t.src[peekI])) peekI++;
      const nextChar = this.t.src[peekI];

      if (nextChar === '+') {
        this.parseChipDefinition();
      } else {
        stmts.push(this.parseChipInstance());
      }
      continue;
    }

    if (this.c.type === 'KEYWORD' && this.c.value === 'board') {
      let peekI = this.t.i;
      while (peekI < this.t.src.length && /\s/.test(this.t.src[peekI])) peekI++;
      const nextChar = this.t.src[peekI];

      if (nextChar === '+') {
        this.parseBoardDefinition();
      } else {
        stmts.push(this.parseBoardInstance());
      }
      continue;
    }

    if (this.c.type === 'KEYWORD' && this.c.value === 'inline') {
      stmts.push(this.parseInline());
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
  const subParser = new Parser(new Tokenizer(processedContent, path), this.componentRegistry);
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
      (this.c.type === 'KEYWORD' && (this.c.value === 'show' || this.c.value === 'peek')) ||
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
  
  const reserved = this.componentRegistry ? this.componentRegistry.getReservedNames() : ['led', 'switch', 'dots', '7seg', '14seg', 'dip', 'mem', 'counter', 'adder', 'subtract', 'divider', 'multiplier', 'shifter', 'rotary', 'lcd'];
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

static CHIP_FORBIDDEN_TYPES = [
  'switch', 'key', 'dip', 'rotary', 'osc',
  'led', '7seg', '14seg', 'lcd', 'dots', 'ledBar'
];

validateChipBodyStatement(stmt, file, line, col) {
  if (!stmt) return;
  if (stmt.def) {
    throw Error(`Chip body cannot contain 'def' at ${file}: ${line}:${col}`);
  }
  if (stmt.pcbInstance) {
    throw Error(`Chip body cannot contain PCB instances at ${file}: ${line}:${col}`);
  }
  if (stmt.comp && Parser.CHIP_FORBIDDEN_TYPES.includes(stmt.comp.type)) {
    throw Error(`Chip body cannot contain component '${stmt.comp.type}' at ${file}: ${line}:${col}`);
  }
}

peekChipIsDefinition() {
  let peekI = this.t.i;
  while (peekI < this.t.src.length && /\s/.test(this.t.src[peekI])) peekI++;
  return this.t.src[peekI] === '+';
}

peekBoardIsDefinition() {
  return this.peekChipIsDefinition();
}

validateBoardBodyStatement(stmt, file, line, col) {
  if (!stmt) return;
  if (stmt.def) {
    throw Error(`Board body cannot contain 'def' at ${file}: ${line}:${col}`);
  }
  if (stmt.pcbInstance) {
    throw Error(`Board body cannot contain PCB instances at ${file}: ${line}:${col}`);
  }
}

parseChipDefinition() {
  this.eat('KEYWORD', 'chip');
  this.eat('SYM', '+');
  this.eat('SYM', '[');

  const name = this.c.value;
  this.eat('ID');

  const reserved = this.componentRegistry ? this.componentRegistry.getReservedNames() : [];
  if (reserved.includes(name) || name === 'chip') {
    throw Error(`Chip name '${name}' is reserved at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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
  let returnSpec = null;

  while (this.c.type !== 'EOF') {
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
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

    if (this.c.type === 'KEYWORD' && this.c.value === 'chip' && this.peekChipIsDefinition()) {
      throw Error(`Chip body cannot define new chip types (chip +[...]) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }

    if (this.c.type === 'KEYWORD' && this.c.value === 'board' && this.peekBoardIsDefinition()) {
      throw Error(`Chip body cannot define new board types (board +[...]) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }

    if (
      this.c.type === 'TYPE' ||
      this.c.type === 'KEYWORD' ||
      this.c.type === 'ID' ||
      this.c.type === 'SPECIAL' ||
      (this.c.type === 'SYM' && this.c.value === '.')
    ) {
      const stmtLine = this.c.line;
      const stmtCol = this.c.col;
      const stmt = this.stmt();
      this.validateChipBodyStatement(stmt, this.c.file, stmtLine, stmtCol);
      if (stmt.probe) {
        this.probes.push(stmt.probe);
      }
      body.push(stmt);
      continue;
    }

    break;
  }

  const allPins = [...pins, ...pouts];
  const execPin = allPins.find(p => p.name === exec);
  if (!execPin) {
    throw Error(`Chip '${name}': exec '${exec}' must reference an existing pin. Available pins: ${allPins.map(p => p.name).join(', ')}`);
  }

  this.chips.set(name, {
    pins,
    pouts,
    exec,
    on,
    body,
    returnSpec
  });
}

parseChipInstance() {
  this.eat('KEYWORD', 'chip');
  this.eat('SYM', '[');

  const chipName = this.c.value;
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

  return { chipInstance: { chipName, instanceName } };
}

parseBoardDefinition() {
  this.eat('KEYWORD', 'board');
  this.eat('SYM', '+');
  this.eat('SYM', '[');

  const name = this.c.value;
  this.eat('ID');

  const reserved = this.componentRegistry ? this.componentRegistry.getReservedNames() : [];
  if (reserved.includes(name) || name === 'board') {
    throw Error(`Board name '${name}' is reserved at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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
  let returnSpec = null;

  while (this.c.type !== 'EOF') {
    if (this.c.type === 'EOL') {
      this.c = this.t.get();
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

    if (this.c.type === 'KEYWORD' && this.c.value === 'board' && this.peekBoardIsDefinition()) {
      throw Error(`Board body cannot define new board types (board +[...]) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }

    if (this.c.type === 'KEYWORD' && this.c.value === 'chip' && this.peekChipIsDefinition()) {
      throw Error(`Board body cannot define new chip types (chip +[...]) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }

    if (this.c.type === 'KEYWORD' && this.c.value === 'pcb' && this.peekChipIsDefinition()) {
      throw Error(`Board body cannot define new PCB types (pcb +[...]) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }

    if (
      this.c.type === 'TYPE' ||
      this.c.type === 'KEYWORD' ||
      this.c.type === 'ID' ||
      this.c.type === 'SPECIAL' ||
      (this.c.type === 'SYM' && this.c.value === '.')
    ) {
      const stmtLine = this.c.line;
      const stmtCol = this.c.col;
      const stmt = this.stmt();
      this.validateBoardBodyStatement(stmt, this.c.file, stmtLine, stmtCol);
      if (stmt.probe) {
        this.probes.push(stmt.probe);
      }
      body.push(stmt);
      continue;
    }

    break;
  }

  const allPins = [...pins, ...pouts];
  const execPin = allPins.find(p => p.name === exec);
  if (!execPin) {
    throw Error(`Board '${name}': exec '${exec}' must reference an existing pin. Available pins: ${allPins.map(p => p.name).join(', ')}`);
  }

  this.boards.set(name, {
    pins,
    pouts,
    exec,
    on,
    body,
    returnSpec
  });
}

parseBoardInstance() {
  this.eat('KEYWORD', 'board');
  this.eat('SYM', '[');

  const boardName = this.c.value;
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

  return { boardInstance: { boardName, instanceName } };
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

  watch(){
  this.eat('KEYWORD', 'watch');
  this.eat('SYM', '(');
  this.eat('SYM', '.');
  
  let name = '.' + this.c.value;
  this.c = this.t.get();
  
  this.eat('SYM', ')');
  return { watch: name };
}

  doc(){
    this.eat('KEYWORD');
    this.eat('SYM', '(');
    // Consume first token (could be ID, KEYWORD like 'comp'/'pcb', MUX, REG, DEMUX)
    let name = this.c.value;
    this.c = this.t.get();
    // Consume optional .type suffix (e.g. comp.7seg, pcb.bcd)
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      name = name + '.' + this.c.value;
      this.c = this.t.get();
    } else if(name === '.' && this.c.type == 'ID') {
      //console.log(name);
      name = name + this.c.value;
      this.c = this.t.get();
    }
    
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      name = name + '.' + this.c.value;
      this.c = this.t.get();
      
      name = '.' + name.replaceAll('.', '_');
    }
    
    this.eat('SYM', ')');
    return { doc: name };
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

  peek(){
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
    return {peek:args};
  }

  probe(){
    this.eat('KEYWORD');
    this.eat('SYM', '(');
    const expr = this.expr();
    this.eat('SYM', ')');
    this.probes.push(expr);
    return { probe: expr };
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

    const componentShortnames = this.componentRegistry ? this.componentRegistry.getShortnames() : {
      '7': '7seg', '+': 'adder', '-': 'subtract', '*': 'multiplier',
      '/': 'divider', '>': 'shifter', '=': 'counter', '~': 'osc',
      '14': '14seg', ':': 'dots'
    };
    const validTypes = this.componentRegistry ? this.componentRegistry.getAllTypes() : [
      'led', 'switch', 'dip', 'mem', 'reg', 'counter', 'adder', 'subtract',
      'divider', 'multiplier', 'shifter', 'rotary', 'lcd', 'key', 'osc'
    ];
    
    let compType = null;

    if(this.c.type === 'SYM' && componentShortnames[this.c.value]){
      compType = componentShortnames[this.c.value];
      this.eat('SYM');
    } else if(this.c.type === 'SPECIAL' && this.c.value === '~'){
      compType = 'osc';
      this.eat('SPECIAL');
    } else if(this.c.type === 'ID' && validTypes.includes(this.c.value)){
      compType = this.c.value;
      this.eat('ID');
    } else if(this.c.value === 'dots'){
      compType = 'dots';
      this.eat(this.c.type);
    } else if(this.c.value === '7seg'){
      compType = '7seg';
      this.eat(this.c.type);
    } else if(this.c.type === 'DEC' && this.c.value === '7'){
      compType = '7seg';
      this.eat('DEC');
    } else if(this.c.value === '14seg'){
      compType = '14seg';
      this.eat(this.c.type);
    } else if(this.c.type === 'DEC' && this.c.value === '14'){
      compType = '14seg';
      this.eat('DEC');
    } else {
      const typeList = validTypes.join("', '");
      throw Error(`Expected '${typeList}' after 'comp [' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    this.eat('SYM', ']');
    
    let attrNamesArray = [];
    let def = null;
    
    if (this.componentRegistry) {
      const handler = this.componentRegistry.get(compType);
      if (handler) {
        if (typeof handler.getDef === 'function') {
            def = handler.getDef ? handler.getDef() : null;
            const defAttrs = def.attrs ? def.attrs : [];
            attrNamesArray = defAttrs
              .filter(attr => attr.type === 'array')
              .map(attr => attr.name);
        }
      }
    }


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
        const isArray = attrNamesArray.includes(attrName);
        let stateNum = 0;
        this.eat('ID');

        const attributesWithNoValues = ['square', 'nl', 'circular', 'glow', 'rgb', 'noLabels', 'noTrans'];
        
        
        if (attrNamesArray.includes(attrName) && this.c.type === 'SYM' && this.c.value === '.') {
          this.eat('SYM', '.');
            
          if (this.c.type !== 'DEC' && this.c.type !== 'BIN') {
            throw Error(`Expected state number after 'for.' at ${this.c.line}:${this.c.col}`);
          }
          
          stateNum = parseInt(this.c.value, 10);
          if (isNaN(stateNum)) {
            throw Error(`Invalid state number in attribute 'for.${this.c.value}' at ${this.c.line}:${this.c.col}`);
          }
          
          this.eat(this.c.type);
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
            
            let segAttributes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            if (this.componentRegistry) {
              const handler = this.componentRegistry.get(compType);
              if (handler) {
                const specialAttrs = handler.getSpecialParseAttributes();
                if (specialAttrs && specialAttrs.segAttributes) segAttributes = specialAttrs.segAttributes;
                else segAttributes = [];
              }
            }
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
              
              if(isArray) {
                if (!attributes[attrName]) {
                  attributes[attrName] = {};
                }
                attributes[attrName][stateNum] = strValue;
              } else {
                attributes[attrName] = strValue;
              }
              
              this.c = this.t.get();
              continue;
            } else {
              this.c = this.t.get();
            }
          }

          if (this.c.type === 'HEX') {
            if(isArray) {
              if (!attributes[attrName]) {
                attributes[attrName] = {};
              }
              attributes[attrName][stateNum] = '#' + this.c.value;
            } else {
              attributes[attrName] = '#' + this.c.value;
            }
            this.eat('HEX');
          } else if (this.c.type === 'BIN' || this.c.type === 'DEC') {
            if(isArray) {
              if (!attributes[attrName]) {
                attributes[attrName] = {};
              }
              attributes[attrName][stateNum] = this.c.value;
            } else {
              attributes[attrName] = this.c.value;
            }
            
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
                
                if(isArray) {
                  if (!attributes[attrName]) {
                    attributes[attrName] = {};
                  }
                  attributes[attrName][stateNum] = strValue;
                } else {
                    attributes[attrName] = strValue;
                }
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
                  if(isArray) {
                    if (!attributes[attrName]) {
                      attributes[attrName] = {};
                    }
                    attributes[attrName][stateNum] = strValue.trim();
                  } else {
                    attributes[attrName] = strValue.trim();
                  }
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
          if (this.c.type === 'ID' && this.c.value === 'data') {
            this.eat('ID');
            this.t.skip();
            if (!(this.c.type === 'SYM' && this.c.value === '{')) {
              throw Error(`Expected '{' after '= data' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
            }
            const bracePos = this.t.i - 1;
            initialValue = this.parseLutDataRaw(bracePos, attributes);
            continue;
          }
          if (this.c.type === 'BIN') {
            initialValue = this.c.value;
            this.eat('BIN');
          } else if (this.c.type === 'HEX') {
            // Convert hex to binary string
            const hexStr = this.c.value;
            let binStr = '';
            for (let i = 0; i < hexStr.length; i++) {
              binStr += parseInt(hexStr[i], 16).toString(2).padStart(4, '0');
            }
            initialValue = binStr;
            this.eat('HEX');
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
          } else if (this.c.type === 'ID') {
            const bareName = this.parseBareNameRef();
            this.t.skip();
            if (this.c.type === 'SYM' && this.c.value === '{') {
              const bracePos = this.t.i - 1;
              initialValue = this.parseAsmProgramRaw(bracePos);
              initialValue.isaRef = '.' + bareName;
              continue;
            }
            initialValue = { varRef: bareName };
          } else if (this.c.type === 'SPECIAL') {
            initialValue = { varRef: this.c.value };
            this.eat('SPECIAL');
          } else if (this.c.type === 'SYM' && this.c.value === '.') {
            const isaRef = this.parseDotComponentRef();
            this.t.skip();
            if (this.c.type === 'SYM' && this.c.value === '{') {
              const bracePos = this.t.i - 1;
              initialValue = this.parseAsmProgramRaw(bracePos);
              initialValue.isaRef = isaRef;
              continue;
            }
            throw Error(`Expected '{' after '= ${isaRef}' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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
  // Parsează paddingul `;p` care urmează după un literal sau variabilă (opțional după bitrange).
  parsePadding() {
    this.eat('SYM', ';');
    if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
      throw Error(`Expected padding width after ';' at ${this.c.line}:${this.c.col}`);
    }
    const pad = parseInt(this.c.value, 10);
    this.eat(this.c.type);
    return pad;
  }

  // Parsează un bitrange care urmează direct după un literal BIN sau HEX.
  // Formele acceptate: .start-end, .start/len, ./len (shorthand .0/len), .bit
  parseLiteralBitRange() {
    this.eat('SYM', '.');

    // ./len — start implicit 0
    if (this.c.type === 'SYM' && this.c.value === '/') {
      this.eat('SYM', '/');
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected length after './' at ${this.c.line}:${this.c.col}`);
      }
      const len = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      return { start: 0, end: len - 1 };
    }

    // start obligatoriu
    if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
      throw Error(`Expected bit index or '/' after '.' at ${this.c.line}:${this.c.col}`);
    }
    const start = parseInt(this.c.value, 10);
    this.eat(this.c.type);

    if (this.c.type === 'SYM' && this.c.value === '-') {
      this.eat('SYM', '-');
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit index after '-' at ${this.c.line}:${this.c.col}`);
      }
      const end = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      return { start, end };
    }

    if (this.c.type === 'SYM' && this.c.value === '/') {
      this.eat('SYM', '/');
      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
      }
      const len = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      return { start, end: start + len - 1 };
    }

    return { start, end: start };
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
    let br = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      br = this.parseLiteralBitRange();
    }
    const atomBin = br ? { bin: v, bitRange: br } : { bin: v };
    if (this.c.type === 'SYM' && this.c.value === ';') {
      atomBin.pad = this.parsePadding();
    }
    return addNot(atomBin);
  }
  
  if (this.c.type === 'HEX') {
    const v = this.c.value;
    this.eat('HEX');
    let br = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      br = this.parseLiteralBitRange();
    }
    const atomHex = br ? { hex: v, bitRange: br } : { hex: v };
    if (this.c.type === 'SYM' && this.c.value === ';') {
      atomHex.pad = this.parsePadding();
    }
    return addNot(atomHex);
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
        
        const specialAtom1 = { var: v, bitRange: { start, end } };
        if (this.c.type === 'SYM' && this.c.value === ';') specialAtom1.pad = this.parsePadding();
        return addNot(specialAtom1);
      }
      
      if (this.c.type === 'SYM' && this.c.value === '/') {
        this.eat('SYM', '/');
        
        if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
          throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
        }
        
        const len = parseInt(this.c.value, 10);
        this.eat(this.c.type);
        end = start + len - 1;
        
        const specialAtom2 = { var: v, bitRange: { start, end } };
        if (this.c.type === 'SYM' && this.c.value === ';') specialAtom2.pad = this.parsePadding();
        return addNot(specialAtom2);
      }
      
      const specialAtom3 = { var: v, bitRange: { start, end } };
      if (this.c.type === 'SYM' && this.c.value === ';') specialAtom3.pad = this.parsePadding();
      return addNot(specialAtom3);
    }
    
    const specialAtom0 = { var: v };
    if (this.c.type === 'SYM' && this.c.value === ';') specialAtom0.pad = this.parsePadding();
    return addNot(specialAtom0);
  }
  
  if (this.c.type === 'REG' || this.c.type === 'MUX' || this.c.type === 'DEMUX') {
    const n = this.c.value;
    this.eat(this.c.type);
    if (this.c.type === 'SYM' && this.c.value === '(') {
      //console.log({name: n, alias: null });
      return addNot(this.call({ name: n, alias: null }));
    }
    throw Error(`${n} must be called as a function at ${this.c.line}:${this.c.col}`);
  }
  
  if (this.c.type === 'SYM' && this.c.value === '.') {
    const compName = this.parseDotComponentRef();

    if (this.c.type === 'SYM' && this.c.value === '{') {
      const bracePos = this.t.i - 1;
      const program = this.parseAsmProgramRaw(bracePos);
      program.isaRef = compName;
      return addNot({ asmProgram: program });
    }
    
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

          { const _a = { var: compName, property: property, bitRange: { start, end } };
            if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
            return addNot(_a); }
        }

        if (this.c.type === 'SYM' && this.c.value === '/') {
          this.eat('SYM', '/');

          if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
            throw Error(`Expected length after '/' at ${this.c.line}:${this.c.col}`);
          }

          const len = parseInt(this.c.value, 10);
          this.eat(this.c.type);
          end = start + len - 1;

          { const _a = { var: compName, property: property, bitRange: { start, end } };
            if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
            return addNot(_a); }
        }

        { const _a = { var: compName, property: property, bitRange: { start, end } };
          if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
          return addNot(_a); }
      }

      { const _a = { var: compName, property: property };
        if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
        return addNot(_a); }
    }
    
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type === 'ID') {
        const internalWire = this.c.value;
        this.eat('ID');
        { const _a = { var: compName, internalWire };
          if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
          return addNot(_a); }
      }

      if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
        throw Error(`Expected bit number or internal wire name after '.' at ${this.c.line}:${this.c.col}`);
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
      
      { const _a = { var: compName, bitRange: { start, end } };
        if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
        return addNot(_a); }
    }
    
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.parseCompInvoke(compName));
    }

    { const _a = { var: compName };
      if (this.c.type === 'SYM' && this.c.value === ';') _a.pad = this.parsePadding();
      return addNot(_a); }
  }
  
  if (this.c.type === 'ID') {
    const name = this.parseBareNameRef();

    if (this.c.type === 'SYM' && this.c.value === '{') {
      const bracePos = this.t.i - 1;
      const program = this.parseAsmProgramRaw(bracePos);
      program.isaRef = '.' + name;
      return addNot({ asmProgram: program });
    }
    
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
        if (!isDynamic) {
          const idAtom1 = { var: name, bitRange: { start, end } };
          if (this.c.type === 'SYM' && this.c.value === ';') idAtom1.pad = this.parsePadding();
          return addNot(idAtom1);
        }
        const idAtom2 = { var: name, bitRange: { start, startExpr, end, endExpr, isDynamic } };
        if (this.c.type === 'SYM' && this.c.value === ';') idAtom2.pad = this.parsePadding();
        return addNot(idAtom2);
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
        if (!isDynamic) {
          const idAtom3 = { var: name, bitRange: { start, end: start + len - 1 } };
          if (this.c.type === 'SYM' && this.c.value === ';') idAtom3.pad = this.parsePadding();
          return addNot(idAtom3);
        }
        const idAtom4 = { var: name, bitRange: { start, startExpr, len, lenExpr, isDynamic, isLength: true } };
        if (this.c.type === 'SYM' && this.c.value === ';') idAtom4.pad = this.parsePadding();
        return addNot(idAtom4);
      }

      if (!isDynamic) {
        const idAtom5 = { var: name, bitRange: { start, end: start } };
        if (this.c.type === 'SYM' && this.c.value === ';') idAtom5.pad = this.parsePadding();
        return addNot(idAtom5);
      }
      const idAtom6 = { var: name, bitRange: { start, startExpr, isDynamic } };
      if (this.c.type === 'SYM' && this.c.value === ';') idAtom6.pad = this.parsePadding();
      return addNot(idAtom6);
    }
    
    const idAtom0 = { var: name };
    if (this.c.type === 'SYM' && this.c.value === ';') idAtom0.pad = this.parsePadding();
    return addNot(idAtom0);
  }
  
  throw Error(`Bad expression at ${this.c.line}:${this.c.col}`);
}

isBuiltinFunction(name) {
  if (name === 'show') return true;

  if (['NOT','AND','OR','XOR','NXOR','NAND','NOR','EQ','LATCH',
       'LSHIFT','RSHIFT'].includes(name)) {
    return true;
  }

  if (name === 'REG') return true;
  if (/^MUX$/.test(name)) return true;
  if (/^DEMUX$/.test(name)) return true;

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

  _syncTokenizerAt(pos) {
    this.t.i = pos;
    let line = 1;
    let col = 1;
    for (let i = 0; i < pos; i++) {
      if (this.t.src[i] === '\n') { line++; col = 1; }
      else col++;
    }
    this.t.line = line;
    this.t.col = col;
    this.c = this.t.get();
  }

  parseBareNameRef() {
    if (this.c.type !== 'ID') {
      throw Error(`Expected name at ${this.c.line}:${this.c.col}`);
    }
    const name = this.c.value;
    this.eat('ID');
    return name;
  }

  parseDotComponentRef() {
    this.eat('SYM', '.');
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected name after '.' at ${this.c.line}:${this.c.col}`);
    }
    const name = '.' + this.c.value;
    this.eat(this.c.type);
    return name;
  }

  parseInline() {
    this.eat('KEYWORD', 'inline');
    this.eat('SYM', '[');
    const src = this.t.src;
    let bracketPos = this.t.i - 1;
    while (bracketPos >= 0 && src[bracketPos] !== '[') bracketPos--;
    let pos = bracketPos + 1;
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    const typeStart = pos;
    while (pos < src.length && src[pos] !== ']') pos++;
    const kind = src.substring(typeStart, pos).trim();
    if (!kind) {
      throw Error(`Expected inline kind inside '[ ]' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    if (pos >= src.length || src[pos] !== ']') {
      throw Error(`Expected ']' after inline kind at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    if (kind !== 'asm') {
      throw Error(`Unknown inline kind '${kind}' at ${this.c.file}: ${this.c.line}:${this.c.col} (supported: asm)`);
    }
    this._syncTokenizerAt(pos + 1);
    const instanceName = this.parseDotComponentRef();
    this.eat('SYM', ':');

    const bodyStart = this.t.i;
    let foundEnd = false;
    let colonPos = -1;
    pos = bodyStart;
    while (pos < src.length) {
      const lineStart = pos;
      while (pos < src.length && src[pos] !== '\n') pos++;
      const line = src.substring(lineStart, pos).trim();
      if (line === ':') {
        colonPos = src.indexOf(':', lineStart);
        if (colonPos < 0) colonPos = lineStart;
        foundEnd = true;
        break;
      }
      if (pos < src.length) pos++;
    }
    if (!foundEnd) {
      throw Error(`Unclosed inline block — expected closing ':' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const bodyRaw = src.substring(bodyStart, colonPos).trim();
    this._syncTokenizerAt(colonPos + 1);
    const stmt = { inline: { kind, name: instanceName, bodyRaw } };
    this.inlines.set(instanceName, stmt.inline);
    return stmt;
  }

  parseAsmProgramRaw(bracePos) {
    const src = this.t.src;
    let pos = bracePos + 1;
    let depth = 1;
    const start = pos;
    while (pos < src.length && depth > 0) {
      const c = src[pos];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) break;
      }
      pos++;
    }
    if (depth !== 0) {
      throw Error(`Unclosed asm program block — expected '}' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const raw = src.substring(start, pos);
    pos++;
    this._syncTokenizerAt(pos);
    return { kind: 'asmProgram', raw };
  }

  parseLutDataRaw(bracePos, attributes) {
    const src = this.t.src;
    const length = attributes.length !== undefined ? parseInt(attributes.length, 10) : 16;
    const depth = attributes.depth !== undefined ? parseInt(attributes.depth, 10) : 4;
    let pos = bracePos + 1;
    const entries = [];
    const rawEntries = [];

    const skipWS = () => {
      while (pos < src.length) {
        if (src[pos] === ' ' || src[pos] === '\t' || src[pos] === '\r' || src[pos] === '\n') {
          pos++;
          continue;
        }
        if (src[pos] === '#') {
          while (pos < src.length && src[pos] !== '\n') pos++;
          continue;
        }
        break;
      }
    };

    const parseAddress = () => {
      skipWS();
      const startPos = pos;
      if (pos >= src.length) {
        throw Error(`Expected LUT address at ${this.c.line}:${this.c.col}`);
      }
      if (src[pos] === '\\') {
        pos++;
        let num = '';
        while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') {
          num += src[pos];
          pos++;
        }
        if (!num) throw Error(`Expected decimal digits after '\\' in LUT address at ${this.c.line}:${this.c.col}`);
        return { index: parseInt(num, 10), raw: src.substring(startPos, pos) };
      }
      if (src[pos] === '^') {
        pos++;
        let hex = '';
        while (pos < src.length && /[0-9a-fA-F]/.test(src[pos])) {
          hex += src[pos];
          pos++;
        }
        if (!hex) throw Error(`Expected hex digits after '^' in LUT address at ${this.c.line}:${this.c.col}`);
        return { index: parseInt(hex, 16), raw: src.substring(startPos, pos) };
      }
      let bits = '';
      while (pos < src.length && (src[pos] === '0' || src[pos] === '1')) {
        bits += src[pos];
        pos++;
      }
      if (!bits) throw Error(`Expected binary LUT address at ${this.c.line}:${this.c.col}`);
      return { index: parseInt(bits, 2), raw: bits };
    };

    const parseValue = () => {
      skipWS();
      if (pos >= src.length || src[pos] !== ':') {
        throw Error(`Expected ':' before LUT value at ${this.c.line}:${this.c.col}`);
      }
      pos++;
      skipWS();
      const vStart = pos;
      let bits = '';
      while (pos < src.length && (src[pos] === '0' || src[pos] === '1')) {
        bits += src[pos];
        pos++;
      }
      if (!bits) throw Error(`Expected binary LUT value at ${this.c.line}:${this.c.col}`);
      if (depth > 0 && bits.length !== depth) {
        throw Error(`LUT value must be exactly ${depth} bits, got ${bits.length} at ${this.c.line}:${this.c.col}`);
      }
      return bits;
    };

    skipWS();
    while (pos < src.length && src[pos] !== '}') {
      const addrStart = parseAddress();
      skipWS();
      let addrEnd = addrStart;
      if (pos < src.length && src[pos] === '-') {
        pos++;
        skipWS();
        addrEnd = parseAddress();
        if (addrEnd.index < addrStart.index) {
          throw Error(`LUT address range inverted (${addrStart.index}-${addrEnd.index}) at ${this.c.line}:${this.c.col}`);
        }
      }
      const value = parseValue();
      for (let i = addrStart.index; i <= addrEnd.index; i++) {
        if (i >= length) {
          throw Error(`LUT address ${i} >= length ${length} at ${this.c.line}:${this.c.col}`);
        }
      }
      entries.push({ from: addrStart.index, to: addrEnd.index, value });
      rawEntries.push({
        fromRaw: addrStart.raw,
        toRaw: addrEnd.raw,
        value,
      });
      skipWS();
      if (pos < src.length && src[pos] === ',') {
        pos++;
        skipWS();
      }
    }
    if (pos >= src.length || src[pos] !== '}') {
      throw Error(`Unclosed LUT data block — expected '}' at ${this.c.line}:${this.c.col}`);
    }
    pos++;
    this._syncTokenizerAt(pos);
    return { kind: 'lutData', entries, rawEntries };
  }

  parseCompInvoke(compName) {
    this.eat('SYM', '(');
    const args = {};
    this.t.skip();
    while (!(this.c.type === 'SYM' && this.c.value === ')')) {
      if (this.c.type === 'EOF') {
        throw Error(`Unclosed '(' in component invocation at ${this.c.line}:${this.c.col}`);
      }
      if (this.c.type !== 'ID') {
        throw Error(`Expected argument name in component invocation at ${this.c.line}:${this.c.col}`);
      }
      const argName = this.c.value;
      this.eat('ID');
      this.t.skip();
      if (!(this.c.type === 'SYM' && this.c.value === '=')) {
        throw Error(`Expected '=' after argument '${argName}' at ${this.c.line}:${this.c.col}`);
      }
      this.eat('SYM', '=');
      this.t.skip();
      args[argName] = this.expr();
      this.t.skip();
      if (this.c.type === 'SYM' && this.c.value === ',') {
        this.eat('SYM', ',');
        this.t.skip();
      } else {
        break;
      }
    }
    this.eat('SYM', ')');
    return { compInvoke: { var: compName, args } };
  }

}

Parser.KEYWORD_HANDLERS = {
  doc: 'doc',
  watch: 'watch',
  show: 'show',
  peek: 'peek',
  probe: 'probe',
  NEXT: 'next',
  TEST: 'test',
  MODE: 'mode',
  comp: 'parseComp',
  pcb: 'parsePcbInstance',
  chip: 'parseChipInstance',
  board: 'parseBoardInstance',
};
