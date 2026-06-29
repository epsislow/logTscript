/* ================= PARSER ================= */

function tokenStartCol(tok) {
  if (!tok || tok.col == null) return 1;
  const v = tok.value;
  const len = (typeof v === 'string') ? v.length : 0;
  return Math.max(1, tok.col - len);
}

function slashDecToBin(value) {
  return parseInt(value, 10).toString(2);
}

class Parser {
  constructor(t, componentRegistry){
    this.t=t; this.c=t.get(); this.funcs=new Map();
    this.aliases = new Map();
    this.pcbs = new Map();
    this.chips = new Map();
    this.boards = new Map();
    this.inlines = new Map();
    this.probes = [];
    this.watches = [];
    this.componentRegistry = componentRegistry || null;
    this.metaConstantsScope = 'top';
  }

  metaConstantScopeLabel() {
    const s = this.metaConstantsScope;
    if (s === 'top') return 'top-level';
    return s;
  }

  throwMetaConstantNotAllowedInExpr(name) {
    throw Error(
      `Meta constant /${name}/ is only allowed in top-level wire initialization (Nwire name : /${name}/) at ${this.c.file}: ${this.c.line}:${this.c.col}`
    );
  }

  throwMetaConstantNotAllowedInScope(name) {
    const scope = this.metaConstantsScope;
    const where = scope === 'chip' ? 'chip body'
      : scope === 'pcb' ? 'pcb body'
      : scope === 'board' ? 'board body'
      : this.metaConstantScopeLabel();
    throw Error(
      `Meta constant /${name}/ is not allowed inside ${where} at ${this.c.file}: ${this.c.line}:${this.c.col}`
    );
  }

  eatMetaConstantAtom() {
    if (this.c.type !== 'META') {
      throw Error(`Expected meta constant at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const name = this.c.value;
    this.eat('META');
    if (this.metaConstantsScope !== 'top') {
      this.throwMetaConstantNotAllowedInScope(name);
    }
    if (typeof KNOWN_META_CONSTANTS !== 'undefined' && !KNOWN_META_CONSTANTS.includes(name)) {
      throw Error(`Unknown meta constant /${name}/ at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    return { meta: name };
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

  const skipWs = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const consumeIndex = () => {
    skipWs();
    if (i < src.length && src[i] === '(') {
      i++;
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
      if (i < src.length && src[i] === ')') i++;
      return;
    }
    while (i < src.length && /[0-9]/.test(src[i])) i++;
  };
  const consumeBitRange = () => {
    if (i >= src.length || src[i] !== '.') return;
    i++;
    while (i < src.length && /[0-9]/.test(src[i])) i++;
    if (i < src.length && src[i] === '-') {
      i++;
      while (i < src.length && /[0-9]/.test(src[i])) i++;
    }
    if (i < src.length && src[i] === '/') {
      i++;
      while (i < src.length && /[0-9]/.test(src[i])) i++;
    }
  };

  skipWs();
  consumeBitRange();
  skipWs();

  while (i < src.length && src[i] === ':') {
    if (src[i + 1] === ':') {
      i += 2;
      consumeIndex();
    } else {
      i++;
      consumeIndex();
      skipWs();
      if (i < src.length && src[i] === ':' && src[i + 1] !== ':') {
        i++;
        consumeIndex();
      }
    }
    skipWs();
    consumeBitRange();
    skipWs();
  }

  if (i < src.length && src[i] === '=') return true;
  if (i + 1 < src.length && src[i] === ':' && src[i + 1] === '=') return true;
  return false;
}

  parseBitRangeSuffix() {
    if (this.c.type !== 'SYM' || this.c.value !== '.') return null;
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
        return { start, end };
      }
      return { start, startExpr, end, endExpr, isDynamic };
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
        return { start, end: start + len - 1 };
      }
      return { start, startExpr, len, lenExpr, isDynamic, isLength: true };
    }

    if (!isDynamic) {
      return { start, end: start };
    }
    return { start, startExpr, isDynamic };
  }

  parseTensorShapeSuffix(wireType) {
    if (!wireType || !wireType.endsWith('wire')) return null;
    if (this.c.type !== 'SYM' || this.c.value !== '[') return null;
    this.eat('SYM', '[');
    if (this.c.type !== 'DEC' && this.c.type !== 'BIN') {
      throw Error(`Expected tensor dimension after '[' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const first = parseInt(this.c.value, 10);
    this.eat(this.c.type);
    let rows = 1;
    let cols = first;
    if (this.c.type === 'SYM' && this.c.value === ',') {
      this.eat('SYM', ',');
      if (this.c.type !== 'DEC' && this.c.type !== 'BIN') {
        throw Error(`Expected second tensor dimension after ',' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
      const second = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      rows = first;
      cols = second;
      if (this.c.type === 'SYM' && this.c.value === ',') {
        throw Error(`Tensor dimensions beyond 2D are not supported at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
    }
    this.eat('SYM', ']');
    if (!Number.isFinite(first) || first < 1 || !Number.isFinite(cols) || cols < 1) {
      throw Error(`Tensor dimensions must be >= 1 at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    return { rows, cols };
  }

  parseVectorCountSuffix(wireType) {
    const shape = this.parseTensorShapeSuffix(wireType);
    if (!shape) return null;
    if (shape.rows === 1 && shape.cols === 1) return null;
    return shape.rows * shape.cols;
  }

  _applyTensorShapeToDecl(decl, shape) {
    if (!shape) return;
    decl.tensorRows = shape.rows;
    decl.tensorCols = shape.cols;
    if (!(shape.rows === 1 && shape.cols === 1)) {
      decl.vectorCount = shape.rows * shape.cols;
    }
  }

  parseWireIndexValue() {
    if (this.c.type === 'BIN' || this.c.type === 'DEC') {
      const index = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      return { index };
    }
    if (this.c.type === 'SYM' && this.c.value === '(') {
      this.eat('SYM', '(');
      if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
        throw Error(`Only wire names supported in index (...) at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
      const indexWire = this.c.value;
      this.eat(this.c.type);
      this.eat('SYM', ')');
      return { indexExpr: [{ var: indexWire }] };
    }
    throw Error(`Expected element index after ':' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }

  parseWireIndexSuffix(name, withAtomLoc) {
    this.eat('SYM', ':');
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      const colPart = this.parseWireIndexValue();
      const idAtom = withAtomLoc({ var: name, tensorSlice: 'col' });
      if (colPart.index !== undefined) idAtom.tensorColIndex = colPart.index;
      else idAtom.tensorColIndexExpr = colPart.indexExpr;
      const br = this.parseBitRangeSuffix();
      if (br) idAtom.bitRange = br;
      { const _p = this.maybeParsePadding(); if (_p != null) idAtom.pad = _p; }
      return idAtom;
    }
    const firstPart = this.parseWireIndexValue();
    if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      const secondPart = this.parseWireIndexValue();
      const idAtom = withAtomLoc({ var: name, tensorSlice: 'cell' });
      if (firstPart.index !== undefined) idAtom.tensorRowIndex = firstPart.index;
      else idAtom.tensorRowIndexExpr = firstPart.indexExpr;
      if (secondPart.index !== undefined) idAtom.tensorColIndex = secondPart.index;
      else idAtom.tensorColIndexExpr = secondPart.indexExpr;
      const br = this.parseBitRangeSuffix();
      if (br) idAtom.bitRange = br;
      { const _p = this.maybeParsePadding(); if (_p != null) idAtom.pad = _p; }
      return idAtom;
    }
    const idAtom = withAtomLoc({ var: name });
    if (firstPart.index !== undefined) idAtom.vectorIndex = firstPart.index;
    else idAtom.vectorIndexExpr = firstPart.indexExpr;
    const br = this.parseBitRangeSuffix();
    if (br) idAtom.bitRange = br;
    { const _p = this.maybeParsePadding(); if (_p != null) idAtom.pad = _p; }
    return idAtom;
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

  const processedContent = preprocessLoop(content);
  const subParser = new Parser(new Tokenizer(processedContent, path), this.componentRegistry);
  subParser.parse();

  for (const [fname, fdef] of subParser.funcs.entries()) {
    if (typeof UserFuncOverloads !== 'undefined') {
      UserFuncOverloads.mergeUserFuncMaps(this.funcs, new Map([[fname, fdef]]));
    } else {
      this.funcs.set(fname, fdef);
    }
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
  while (!(this.c.type === 'SYM' && (this.c.value === ')' || this.c.value === ';'))) {
    const type = this.c.value;
    this.eat('TYPE');
    
    const id = this.c.value;
    this.eat('ID');
    
    params.push({ type, id });
    
    if (this.c.value === ',') {
      this.eat('SYM', ',');
    }
  }

  let tagList = [];
  if (this.c.type === 'SYM' && this.c.value === ';') {
    tagList = this.parseFuncTags();
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
      (this.c.type === 'KEYWORD' && (this.c.value === 'show' || this.c.value === 'peek' || this.c.value === 'lutOf' || this.c.value === 'exprOfLut' || this.c.value === 'useLutAs' || this.c.value === 'truthTableOf' || this.c.value === 'simplify' || this.c.value === 'equivalent' || this.c.value === 'inputsOf' || this.c.value === 'costOf')) ||
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

  if (typeof UserFuncOverloads === 'undefined') {
    this.funcs.set(key, { params, body, returns });
  } else {
    UserFuncOverloads.registerUserFuncOverload(this.funcs, key, {
      params,
      tagList,
      body,
      returns
    });
  }
}

parseFuncTags() {
  this.eat('SYM', ';');
  const tags = [];
  const seen = new Set();

  while (this.c.type === 'ID') {
    const tagName = this.c.value;
    this.eat('ID');

    if (seen.has(tagName)) {
      throw Error(`Duplicate tag '${tagName}' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    seen.add(tagName);

    if (this.c.type === 'SYM' && this.c.value === '=') {
      this.eat('SYM', '=');
      if (this.c.type !== 'DEC' && this.c.type !== 'BIN') {
        throw Error(`Expected integer tag value after '=' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
      const value = parseInt(this.c.value, 10);
      this.eat(this.c.type);
      tags.push({ name: tagName, value });
    } else {
      tags.push({ name: tagName, bool: true, value: 1 });
    }
  }

  if (!tags.length) {
    throw Error(`Expected tag name after ';' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
  }

  return tags;
}

parsePcbDefinition() {
  this.eat('KEYWORD', 'pcb');
  this.eat('SYM', '+');
  this.eat('SYM', '[');

  const prevMetaScope = this.metaConstantsScope;
  this.metaConstantsScope = 'pcb';
  
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
      const stmtLine = this.c.line;
      const stmtCol = this.c.col;
      const stmt = this.stmt();
      this.validateTopLevelOnlyComponent(stmt, 'pcb body', this.c.file, stmtLine, stmtCol);
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
  this.metaConstantsScope = prevMetaScope;
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
  'led', '7seg', '14seg', 'lcd', 'terminal', 'dots', 'ledBar'
];

static TOP_LEVEL_ONLY_COMPONENT_TYPES = ['network'];

validateTopLevelOnlyComponent(stmt, scopeLabel, file, line, col) {
  if (!stmt || !stmt.comp) return;
  if (Parser.TOP_LEVEL_ONLY_COMPONENT_TYPES.includes(stmt.comp.type)) {
    throw Error(`Component '${stmt.comp.type}' is only allowed at top level, not in ${scopeLabel} at ${file}: ${line}:${col}`);
  }
}

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
  this.validateTopLevelOnlyComponent(stmt, 'chip body', file, line, col);
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
  this.validateTopLevelOnlyComponent(stmt, 'board body', file, line, col);
}

parseChipDefinition() {
  this.eat('KEYWORD', 'chip');
  this.eat('SYM', '+');
  this.eat('SYM', '[');

  const prevMetaScope = this.metaConstantsScope;
  this.metaConstantsScope = 'chip';

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
      if (stmt.watch) {
        this.watches.push(stmt.watch);
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
  this.metaConstantsScope = prevMetaScope;
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

  const prevMetaScope = this.metaConstantsScope;
  this.metaConstantsScope = 'board';

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
      if (stmt.watch) {
        this.watches.push(stmt.watch);
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
  this.metaConstantsScope = prevMetaScope;
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

    if (this.c.type === 'ID' && (this.c.value === 'ZCONNECT' || this.c.value === 'ZCONN')) {
      let i = this.t.i;
      while (i < this.t.src.length && /\s/.test(this.t.src[i])) i++;
      if (i < this.t.src.length && this.t.src[i] === '(') {
        return this.zConnect();
      }
    }

    if (this.c.type === 'GREF') {
      return this.assignment();
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
    
    if (i >= src.length || !/[a-zA-Z_]/.test(src[i])) return false;
    
    while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
    
    while (i < src.length && /\s/.test(src[i])) i++;
    
    if (i < src.length && src[i] === ':') {
      i++;
      while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
      
      if (i < src.length && src[i] === '{') {
        return true;
      }
      
      while (i < src.length && /\s/.test(src[i])) i++;
      
      if (i >= src.length || !/[a-zA-Z_]/.test(src[i])) return false;
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
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
    if (/[0-9]/.test(this.t.src[i])) return true;
    return /[a-zA-Z_]/.test(this.t.src[i]);
  }

  parseOptionalBusEnableSuffix() {
    if (this.c.type === 'ID' && (this.c.value === 'w0' || this.c.value === 'w1')) {
      const busEnable = this.c.value;
      this.eat('ID');
      const busEnableExpr = this.expr();
      return { busEnable, busEnableExpr };
    }
    return {};
  }

  parsePropertyBlock(componentName) {
    this.eat('SYM', '{');
    
    const properties = [];
    const usedGetRedirects = new Set();
    const usedGenericRedirects = new Set();
    const REDIRECT_PROPS = new Set(['mod', 'carry', 'over', 'out']);
    const GENERIC_REDIRECT_PROPS = new Set(['front', 'top', 'empty', 'full', 'size', 'capacity', 'free']);
    const isGetRedirectProp = (name) => /^(2|3|4)?get$/.test(name);
    
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
      
      // --- DRY redirect properties: get>/2get>/…, mod>, carry>, over>, out> ---
      if ((isGetRedirectProp(propName) || REDIRECT_PROPS.has(propName) || GENERIC_REDIRECT_PROPS.has(propName)) && this.c.type === 'SYM' && this.c.value === '>') {
        if (isGetRedirectProp(propName)) {
          if (usedGetRedirects.has(propName)) {
            throw Error(`Only one ${propName}> property allowed per property block at ${this.c.line}:${this.c.col}`);
          }
          usedGetRedirects.add(propName);
        }
        if (GENERIC_REDIRECT_PROPS.has(propName)) {
          if (usedGenericRedirects.has(propName)) {
            throw Error(`Only one ${propName}> property allowed per property block at ${this.c.line}:${this.c.col}`);
          }
          usedGenericRedirects.add(propName);
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

        const enableSuffix = this.parseOptionalBusEnableSuffix();
        properties.push({ property: propName + '>', target: targetAtom, expr: null, ...enableSuffix });
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

        const enableSuffix = this.parseOptionalBusEnableSuffix();
        properties.push({ property: 'pout>', poutName: propName, target: targetAtom, expr: null, ...enableSuffix });
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
  if (this.c.type === 'GREF') {
    const compName = this.c.value;
    this.eat('GREF');
    this.eat('SYM', ':');
    if (this.c.type === 'SYM' && this.c.value === '{') {
      const block = this.parsePropertyBlock(compName);
      block.componentPropertyBlock.globalRef = true;
      return block;
    }
    if (this.c.type !== 'ID') {
      throw Error(`Expected property name after '${compName}:' at ${this.c.line}:${this.c.col}`);
    }
    const property = this.c.value;
    this.eat('ID');
    let assignPad;
    if (this.c.value === '=:') {
      this.eat('SYM', '=:');
      assignPad = 'right';
    } else if (this.c.value === ':=') {
      this.eat('SYM', ':=');
      assignPad = 'left';
    } else {
      this.eat('SYM', '=');
      assignPad = 'strict';
    }
    const expr = this.expr();
    return {
      assignment: {
        target: { var: compName, property, globalRef: true },
        expr,
        assignPad
      }
    };
  }
  if (this.c.type === 'SYM' && this.c.value === '.') {
    const savedPos = this.t.i;
    const savedLine = this.t.line;
    const savedCol = this.t.col;
    
    let i = this.t.i;
    const src = this.t.src;
    
    while (i < src.length && /\s/.test(src[i])) i++;
    
    if (i < src.length && /[a-zA-Z_]/.test(src[i])) {
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
      
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
  
  let assignPad;
  if (this.c.value === '=:') {
    this.eat('SYM', '=:');
    assignPad = 'right';
  } else if (this.c.value === ':=') {
    this.eat('SYM', ':=');
    assignPad = 'left';
  } else {
    this.eat('SYM', '=');
    assignPad = 'strict';
  }

  const expr = this.expr();
  const enableSuffix = this.parseOptionalBusEnableSuffix();

  return {
    assignment: {
      target: targetAtom,
      expr,
      assignPad,
      ...enableSuffix
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

    while (this.c.type === 'ID' || this.c.type === 'SPECIAL') {
      const name = this.c.value;
      const declLine = this.c.line;
      const declCol = tokenStartCol(this.c);
      this.eat(this.c.type);
      decls.push({ type: null, name, existing: true, line: declLine, col: declCol });
      if (this.c.type === 'SYM' && this.c.value === ',') {
        this.eat('SYM', ',');
        if (this.c.type === 'TYPE') break;
        continue;
      }
      break;
    }

    while(this.c.type === 'TYPE'){
      const type = this.c.value;
      this.eat('TYPE');
      const tensorShape = this.parseTensorShapeSuffix(type);

      let name;
      if(this.c.type === 'ID' || this.c.type === 'SPECIAL'){
        name = this.c.value;
        this.eat(this.c.type);
      } else {
        throw Error(`Expected variable name at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }

      const decl = { type, name, line: this.c.line, col: this.c.col };
      this._applyTensorShapeToDecl(decl, tensorShape);
      decls.push(decl);
      
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
  const stmtLine = this.c.line;
  const stmtCol = tokenStartCol(this.c);

  do {
    const declLine = this.c.line;
    const declCol = tokenStartCol(this.c);
    const type = this.c.value;
    this.eat('TYPE');
    const tensorShape = this.parseTensorShapeSuffix(type);

    let name;
    if (this.c.type === 'ID' || this.c.type === 'SPECIAL') {
      name = this.c.value;
      this.eat(this.c.type);
    } else {
        throw Error(`Expected variable name at ${this.c.line}:${this.c.col}`);
    }

    const decl = { type, name, line: declLine, col: declCol };
    this._applyTensorShapeToDecl(decl, tensorShape);
    decls.push(decl);

    if (this.c.value === ',') {
      this.eat('SYM', ',');
      while (this.c.type === 'EOL') {
        this.c = this.t.get();
      }
    } else {
      break;
    }
  } while (this.c.type === 'TYPE');

  while (this.c.type === 'EOL') {
    this.c = this.t.get();
  }

    if (this.c.value === ':=') {
      this.eat('SYM', ':=');
      return {
        decls,
        expr: this.expr(),
        assignPad: 'left',
        line: stmtLine,
        col: stmtCol
      };
    } else if (this.c.value === '=:') {
      this.eat('SYM', '=:');
      return {
        decls,
        expr: this.expr(),
        assignPad: 'right',
        line: stmtLine,
        col: stmtCol
      };
    } else if (this.c.value === '=') {
      this.eat('SYM', '=');
      return {
        decls,
        expr: this.expr(),
        assignPad: 'strict',
        line: stmtLine,
        col: stmtCol
      };
    } else if (this.c.type === 'SYM' && this.c.value === ':') {
      this.eat('SYM', ':');
      const initExpr = this.initLiteral();
      return {
        decls,
        expr: null,
        initExpr,
        line: stmtLine,
        col: stmtCol
      };
    } else {
      return {
        decls,
        expr: null,
        line: stmtLine,
        col: stmtCol
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
    } else if(this.c.type === 'SDEC'){
      atom = {bin: slashDecToBin(this.c.value)};
      this.eat('SDEC');
    } else if(this.c.type === 'LOGIC'){
      atom = {logic: this.c.value};
      this.eat('LOGIC');
    } else if(this.c.type === 'HEX'){
      atom = {hex: this.c.value};
      this.eat('HEX');
    } else if(this.c.type === 'DEC'){
      atom = {dec: this.c.value};
      this.eat('DEC');
    } else if (this.c.type === 'META') {
      atom = this.eatMetaConstantAtom();
    } else {
      throw Error(`Expected a literal value (binary, hex ^, decimal \\, or meta constant /name/) after : at ${this.c.line}:${this.c.col}`);
    }
    if(notPrefix) atom.not = true;
    return atom;
  }

  watch(){
    this.eat('KEYWORD');
    this.eat('SYM', '(');
    const expr = this.expr();
    this.eat('SYM', ')');
    this.watches.push(expr);
    return { watch: expr };
  }

  doc(){
    this.eat('KEYWORD');
    this.eat('SYM', '(');
    if (this.c.type === 'SYM' && this.c.value === ')') {
      this.eat('SYM', ')');
      return { doc: '' };
    }
    if (this.c.type === 'GREF') {
      const name = this.c.value;
      this.eat('GREF');
      this.eat('SYM', ')');
      return { doc: name };
    }
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

  parseLutOfCallInner() {
    const stmtLine = this.c.line;
    const stmtCol = this.c.col;
    this.eat('KEYWORD', 'lutOf');
    this.eat('SYM', '(');
    const expr = this.expr();
    let filters = null;
    if (this.c.value === ',') {
      this.eat('SYM', ',');
      filters = this.parseBooleanAnalysisFilters();
    }
    this.eat('SYM', ')');
    return { expr, filters, line: stmtLine, col: stmtCol };
  }

  lutOf(){
    const lutOfData = this.parseLutOfCallInner();
    return { lutOf: lutOfData, line: lutOfData.line, col: lutOfData.col };
  }

  parseExprOfLutArgs() {
    const lutRef = this.parseDotComponentRef();
    const varSpecs = [];
    if (this.c.value === ',') {
      this.eat('SYM', ',');
      do {
        varSpecs.push(this.parseExprOfLutColumnSpec());
        if (this.c.value === ',') this.eat('SYM', ',');
        else break;
      } while (true);
    }
    return { lutRef, varSpecs };
  }

  parseExprOfLutCallInner() {
    const stmtLine = this.c.line;
    const stmtCol = this.c.col;
    this.eat('KEYWORD', 'exprOfLut');
    this.eat('SYM', '(');
    const data = this.parseExprOfLutArgs();
    this.eat('SYM', ')');
    return { ...data, line: stmtLine, col: stmtCol };
  }

  useLutAs() {
    this.eat('KEYWORD', 'useLutAs');
    this.eat('SYM', '(');
    const lutOfData = this.parseLutOfCallInner();
    this.eat('SYM', ',');
    const name = this.parseDotComponentRef();
    this.eat('SYM', ')');
    return { useLutAs: { lutOf: lutOfData, name } };
  }

  truthTableOf(){
    const stmtLine = this.c.line;
    const stmtCol = this.c.col;
    this.eat('KEYWORD', 'truthTableOf');
    this.eat('SYM', '(');
    const expr = this.expr();
    let filters = null;
    if (this.c.value === ',') {
      this.eat('SYM', ',');
      filters = this.parseBooleanAnalysisFilters();
    }
    this.eat('SYM', ')');
    return { truthTableOf: { expr, filters }, line: stmtLine, col: stmtCol };
  }

  simplify(){
    const stmtLine = this.c.line;
    const stmtCol = this.c.col;
    this.eat('KEYWORD', 'simplify');
    this.eat('SYM', '(');
    const expr = this.expr();
    let filters = null;
    if (this.c.value === ',') {
      this.eat('SYM', ',');
      filters = this.parseBooleanAnalysisFilters();
    }
    this.eat('SYM', ')');
    return { simplify: { expr, filters }, line: stmtLine, col: stmtCol };
  }

  equivalent(){
    this.eat('KEYWORD', 'equivalent');
    this.eat('SYM', '(');
    const expr1 = this.expr();
    this.eat('SYM', ',');
    const expr2 = this.expr();
    this.eat('SYM', ')');
    return { equivalent: { expr1, expr2 } };
  }

  inputsOf(){
    this.eat('KEYWORD', 'inputsOf');
    this.eat('SYM', '(');
    const expr = this.expr();
    this.eat('SYM', ')');
    return { inputsOf: { expr } };
  }

  costOf(){
    this.eat('KEYWORD', 'costOf');
    this.eat('SYM', '(');
    const expr = this.expr();
    this.eat('SYM', ')');
    return { costOf: { expr } };
  }

  _offsetToLineCol(pos) {
    const src = this.t.src;
    let line = 1;
    let col = 1;
    for (let i = 0; i < pos; i++) {
      if (src[i] === '\n') { line++; col = 1; }
      else col++;
    }
    return { line, col };
  }

  static filterColumnKey(spec) {
    if (!spec.bitRange) return spec.name;
    const br = spec.bitRange;
    const end = br.end !== undefined && br.end !== null ? br.end : br.start;
    if (br.start === end) return `${spec.name}.${br.start}`;
    if (br.isLength && br.len !== undefined) return `${spec.name}.${br.start}/${br.len}`;
    return `${spec.name}.${br.start}-${end}`;
  }

  parseTruthPatternRaw(startPos) {
    const src = this.t.src;
    let pos = startPos;
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    const start = pos;
    while (pos < src.length && !/\s/.test(src[pos]) && src[pos] !== ')' && src[pos] !== ',') pos++;
    if (pos === start) {
      throw Error(`Expected filter pattern at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const pattern = src.slice(start, pos);
    const { line: patternLine, col: patternCol } = this._offsetToLineCol(start);
    this._syncTokenizerAt(pos);
    return { pattern, patternLine, patternCol, patternLen: pattern.length };
  }

  parseBooleanAnalysisFilters() {
    const filters = [];
    while (!(this.c.type === 'SYM' && this.c.value === ')')) {
      if (this.c.type === 'EOL') {
        this.c = this.t.get();
        continue;
      }
      const colLine = this.c.line;
      const colCol = this.c.col;
      const spec = this.parseExprOfLutColumnSpec();
      if (!(this.c.type === 'SYM' && this.c.value === '=')) {
        throw Error(`Expected = after filter column at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
      const pat = this.parseTruthPatternRaw(this.t.i);
      const nameLen = Parser.filterColumnKey(spec).length;
      filters.push({
        name: spec.name,
        bitRange: spec.bitRange,
        width: spec.width,
        pattern: pat.pattern,
        line: colLine,
        col: colCol,
        nameLen,
        patternLine: pat.patternLine,
        patternCol: pat.patternCol,
        patternLen: pat.patternLen
      });
      if (this.c.type === 'SYM' && this.c.value === ')') break;
      if (!(this.c.type === 'SYM' && this.c.value === ',')) {
        throw Error(`Expected ',' between filter assignments at ${this.c.file}: ${this.c.line}:${this.c.col}`);
      }
      this.eat('SYM', ',');
    }
    return filters;
  }

  exprOfLut(){
    const data = this.parseExprOfLutCallInner();
    return { exprOfLut: data, line: data.line, col: data.col };
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
    if(this.c.type !== 'KEYWORD' || (this.c.value !== 'STRICT' && this.c.value !== 'WIREWRITE' && this.c.value !== 'ZSTATE')){
      throw Error(`Expected STRICT, WIREWRITE, or ZSTATE after MODE at ${this.c.line}:${this.c.col}`);
    }
    const modeValue = this.c.value;
    this.eat('KEYWORD');
    return {mode: modeValue};
  }

  zRelease(){
    this.eat('KEYWORD', 'ZRELEASE');
    this.eat('SYM', '(');
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected wire name in ZRELEASE() at ${this.c.line}:${this.c.col}`);
    }
    const wireName = this.c.value;
    this.eat(this.c.type);
    this.eat('SYM', ')');
    return { zRelease: wireName };
  }

  zList(){
    this.eat('KEYWORD', 'Zlist');
    this.eat('SYM', '(');
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected wire name in Zlist() at ${this.c.line}:${this.c.col}`);
    }
    const wireName = this.c.value;
    this.eat(this.c.type);
    this.eat('SYM', ')');
    return { zlist: wireName };
  }

  zConnect(){
    const fnName = this.c.value;
    if (fnName !== 'ZCONNECT' && fnName !== 'ZCONN') {
      throw Error(`Expected ZCONNECT or ZCONN at ${this.c.line}:${this.c.col}`);
    }
    this.eat('ID');
    this.eat('SYM', '(');
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected bus wire name in ${fnName}() at ${this.c.line}:${this.c.col}`);
    }
    const busName = this.c.value;
    this.eat(this.c.type);
    this.eat('SYM', ',');
    const enExpr = this.expr();
    this.eat('SYM', ',');
    const dataExpr = this.expr();
    this.eat('SYM', ')');
    return {
      assignment: {
        target: { var: busName },
        expr: [{ call: { name: 'ZCONNECT', alias: null }, args: [enExpr, dataExpr] }]
      }
    };
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
    } else if(this.c.type === 'ID' && componentShortnames[this.c.value]){
      compType = componentShortnames[this.c.value];
      this.eat('ID');
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

        let bindingAttrs = [];
        let listAttrs = [];
        if (this.componentRegistry) {
          const bindHandler = this.componentRegistry.get(compType);
          if (bindHandler && bindHandler.getSpecialParseAttributes) {
            const special = bindHandler.getSpecialParseAttributes();
            if (special && special.bindingAttrs) bindingAttrs = special.bindingAttrs;
            if (special && special.listAttrs) listAttrs = special.listAttrs;
          }
        }
        if (listAttrs.includes(attrName) && this.c.value === ':') {
          this.eat('SYM', ':');
          this.t.skip();
          const ids = [];
          while (this.c.type !== 'EOF' && this.c.value !== '\n' && this.c.value !== ':') {
            if (this.c.type === 'ID') {
              ids.push(this.c.value);
              this.eat('ID');
              this.t.skip();
              if (this.c.type === 'SYM' && this.c.value === ',') {
                this.eat('SYM', ',');
                this.t.skip();
                continue;
              }
              break;
            }
            if (this.c.type === 'SYM' && this.c.value === ',') {
              this.eat('SYM', ',');
              this.t.skip();
              continue;
            }
            break;
          }
          if (isArray) {
            if (!attributes[attrName]) attributes[attrName] = {};
            attributes[attrName][stateNum] = ids;
          } else {
            attributes[attrName] = ids;
          }
          continue;
        }
        if (bindingAttrs.includes(attrName) && this.c.value === '=') {
          this.eat('SYM', '=');
          this.t.skip();
          if (this.c.type !== 'SYM' || this.c.value !== '.') {
            throw Error(`Expected component reference after '${attrName} =' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
          }
          const memberRef = this.parseDotComponentRef();
          const listKey = attrName + 'Members';
          if (!attributes[listKey]) attributes[listKey] = [];
          attributes[listKey].push(memberRef);
          continue;
        }

        const attributesWithNoValues = ['square', 'nl', 'circular', 'glow', 'rgb', 'noLabels', 'noTrans', 'readonly', 'reversed', 'onlyDigits', 'allowEnter', 'allowBackspace', 'allowArrows', 'allowDelete'];
        
        
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
        } else if (attrName === 'readonly') {
          attributes.readonly = true;
        } else if (attrName === 'noTrans') {
          attributes.noTrans = true;
        } else if (attrName === 'reversed') {
          attributes.reversed = true;
        } else if (attrName === 'onlyDigits') {
          attributes.onlyDigits = true;
        } else if (attrName === 'allowEnter') {
          attributes.allowEnter = true;
        } else if (attrName === 'allowBackspace') {
          attributes.allowBackspace = true;
        } else if (attrName === 'allowArrows') {
          attributes.allowArrows = true;
        } else if (attrName === 'allowDelete') {
          attributes.allowDelete = true;
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
          } else if (this.c.type === 'SDEC') {
            initialValue = slashDecToBin(this.c.value);
            this.eat('SDEC');
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
              throw Error(`Expected '.' before inline instance name (use '.${bareName}' not '${bareName}') at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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
          } else if (this.c.type === 'SYM' && this.c.value === '{') {
            if (compType === 'clcd') {
              const bracePos = this.t.i - 1;
              initialValue = this.parseClcdSymbolsRaw(bracePos);
              if (initialValue && initialValue.kind === 'clcdSymbols') {
                attributes.clcdSymbols = initialValue.symbols;
              }
              continue;
            }
            throw Error(`Expected binary or decimal value after '=' at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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
  // Parse optional `;p` padding after a literal or variable (optional after bitrange).
  maybeParsePadding() {
    if (this.c.type !== 'SYM' || this.c.value !== ';') return null;
    const next = this.t.peekToken();
    if (next.type !== 'BIN' && next.type !== 'DEC') return null;
    return this.parsePadding();
  }

  parsePadding() {
    this.eat('SYM', ';');
    if (this.c.type !== 'BIN' && this.c.type !== 'DEC') {
      throw Error(`Expected padding width after ';' at ${this.c.line}:${this.c.col}`);
    }
    const pad = parseInt(this.c.value, 10);
    this.eat(this.c.type);
    return pad;
  }

  // Parse a bitrange that immediately follows a BIN or HEX literal.
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
      return { start, end: start + len - 1, isLength: true, len };
    }

    return { start, end: start };
  }

  // Column in exprOfLut: A, A 2b, A.2, A.2 1b, B.1/3, D.0-3 4b
  parseExprOfLutColumnSpec() {
    if (this.c.type !== 'ID' && this.c.type !== 'SPECIAL') {
      throw Error(`Expected column reference in exprOfLut at ${this.c.file}: ${this.c.line}:${this.c.col}`);
    }
    const name = this.c.value;
    this.eat(this.c.type);
    let bitRange = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      bitRange = this.parseLiteralBitRange();
    }
    let width = null;
    if (this.c.type === 'TYPE' && /^\d+bit$/.test(this.c.value)) {
      width = parseInt(this.c.value, 10);
      this.eat('TYPE');
    }
    return { name, bitRange, width };
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

    if (this.c.type === 'META') {
      this.throwMetaConstantNotAllowedInExpr(this.c.value);
    }

    if (this.c.type === 'SYM' && this.c.value === '(') {
      this.eat('SYM', '(');
      const inner = this.expr();
      this.eat('SYM', ')');
      if (inner.length === 1) return addNot(inner[0]);
      return addNot({ group: inner });
    }

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
  
  if (this.c.type === 'SDEC') {
    const v = slashDecToBin(this.c.value);
    this.eat('SDEC');
    let br = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      br = this.parseLiteralBitRange();
    }
    const atomSdec = br ? { bin: v, bitRange: br } : { bin: v };
    { const _p = this.maybeParsePadding(); if (_p != null) atomSdec.pad = _p; }
    return addNot(atomSdec);
  }

  if (this.c.type === 'BIN') {
    const v = this.c.value;
    this.eat('BIN');
    let br = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      br = this.parseLiteralBitRange();
    }
    const atomBin = br ? { bin: v, bitRange: br } : { bin: v };
    { const _p = this.maybeParsePadding(); if (_p != null) atomBin.pad = _p; }
    return addNot(atomBin);
  }

  if (this.c.type === 'LOGIC') {
    const v = this.c.value;
    this.eat('LOGIC');
    let br = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      br = this.parseLiteralBitRange();
    }
    const atomLogic = br ? { logic: v, bitRange: br } : { logic: v };
    { const _p = this.maybeParsePadding(); if (_p != null) atomLogic.pad = _p; }
    return addNot(atomLogic);
  }
  
  if (this.c.type === 'HEX') {
    const v = this.c.value;
    this.eat('HEX');
    let br = null;
    if (this.c.type === 'SYM' && this.c.value === '.') {
      br = this.parseLiteralBitRange();
    }
    const atomHex = br ? { hex: v, bitRange: br } : { hex: v };
    { const _p = this.maybeParsePadding(); if (_p != null) atomHex.pad = _p; }
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
        { const _p = this.maybeParsePadding(); if (_p != null) specialAtom1.pad = _p; }
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
        { const _p = this.maybeParsePadding(); if (_p != null) specialAtom2.pad = _p; }
        return addNot(specialAtom2);
      }
      
      const specialAtom3 = { var: v, bitRange: { start, end } };
      { const _p = this.maybeParsePadding(); if (_p != null) specialAtom3.pad = _p; }
      return addNot(specialAtom3);
    }
    
    const specialAtom0 = { var: v };
    { const _p = this.maybeParsePadding(); if (_p != null) specialAtom0.pad = _p; }
    return addNot(specialAtom0);
  }
  
  if (this.c.type === 'KEYWORD' && this.c.value === 'useExpr') {
    this.eat('KEYWORD', 'useExpr');
    this.eat('SYM', '(');
    const exprOfLutData = this.parseExprOfLutCallInner();
    this.eat('SYM', ')');
    return addNot({ useExpr: { exprOfLut: exprOfLutData } });
  }

  if (this.c.type === 'REG' || this.c.type === 'MUX' || this.c.type === 'DEMUX') {
    const atomLine = this.c.line;
    const atomCol = this.c.col;
    const n = this.c.value;
    this.eat(this.c.type);
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.call({ name: n, alias: null, line: atomLine, col: atomCol }));
    }
    throw Error(`${n} must be called as a function at ${this.c.line}:${this.c.col}`);
  }
  
  if (this.c.type === 'GREF' || (this.c.type === 'SYM' && this.c.value === '.')) {
    let globalRef = false;
    let compName;
    if (this.c.type === 'GREF') {
      compName = this.c.value;
      globalRef = true;
      this.eat('GREF');
    } else {
      compName = this.parseDotComponentRef();
    }
    const tagGlobal = (obj) => {
      if (globalRef) obj.globalRef = true;
      return addNot(obj);
    };

    if (this.c.type === 'SYM' && this.c.value === '{') {
      const bracePos = this.t.i - 1;
      const inlineDef = this.inlines.get(compName);
      if (inlineDef && inlineDef.kind === 'protocol') {
        const invoke = this.parseProtocolInvoke(bracePos);
        invoke.protocolRef = compName;
        if (globalRef) invoke.globalRef = true;
        return tagGlobal({ protocolInvoke: invoke });
      }
      const program = this.parseAsmProgramRaw(bracePos);
      program.isaRef = compName;
      if (globalRef) program.globalRef = true;
      return tagGlobal({ asmProgram: program });
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
            { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
            return tagGlobal(_a); }
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
            { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
            return tagGlobal(_a); }
        }

        { const _a = { var: compName, property: property, bitRange: { start, end } };
          { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
          return tagGlobal(_a); }
      }

      if (this.c.type === 'SYM' && this.c.value === '(') {
        const methodArgs = [];
        this.eat('SYM', '(');
        this.t.skip();
        while (!(this.c.type === 'SYM' && this.c.value === ')')) {
          if (this.c.type === 'EOF') {
            throw Error(`Unclosed '(' in inline method at ${this.c.line}:${this.c.col}`);
          }
          if (methodArgs.length > 0) this.eat('SYM', ',');
          methodArgs.push(this.expr());
          this.t.skip();
        }
        this.eat('SYM', ')');
        const method = { var: compName, method: property, args: methodArgs };
        if (globalRef) method.globalRef = true;
        return tagGlobal({ inlineMethod: method });
      }

      { const _a = { var: compName, property: property };
        { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
        return tagGlobal(_a); }
    }
    
    if (this.c.type === 'SYM' && this.c.value === '.') {
      this.eat('SYM', '.');
      
      if (this.c.type === 'ID') {
        const internalWire = this.c.value;
        this.eat('ID');
        { const _a = { var: compName, internalWire };
          { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
          return tagGlobal(_a); }
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
        { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
        return tagGlobal(_a); }
    }
    
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.parseCompInvoke(compName, globalRef));
    }

    { const _a = { var: compName };
      { const _p = this.maybeParsePadding(); if (_p != null) _a.pad = _p; }
      return tagGlobal(_a); }
  }
  
  if (this.c.type === 'ID') {
    const atomLine = this.c.line;
    const atomCol = this.c.col;
    const withAtomLoc = (obj) => {
      obj.line = atomLine;
      obj.col = atomCol;
      return obj;
    };
    const name = this.parseBareNameRef();

    if (this.c.type === 'SYM' && this.c.value === '{') {
      throw Error(`Expected '.' before inline instance name (use '.${name}' not '${name}') at ${this.c.file}: ${this.c.line}:${this.c.col}`);
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
      
      return addNot(this.call({ name, alias, line: atomLine, col: atomCol }));
    }
    
    if (this.c.type === 'SYM' && this.c.value === '(') {
      return addNot(this.call({ name, alias: null, line: atomLine, col: atomCol }));
    }

    if (this.c.type === 'SYM' && this.c.value === ':') {
      return addNot(this.parseWireIndexSuffix(name, withAtomLoc));
    }
    
    const brWire = this.parseBitRangeSuffix();
    if (brWire) {
      const idAtomBr = withAtomLoc({ var: name, bitRange: brWire });
      { const _p = this.maybeParsePadding(); if (_p != null) idAtomBr.pad = _p; }
      return addNot(idAtomBr);
    }
    
    const idAtom0 = withAtomLoc({ var: name });
    { const _p = this.maybeParsePadding(); if (_p != null) idAtom0.pad = _p; }
    return addNot(idAtom0);
  }
  
  throw Error(`Bad expression at ${this.c.line}:${this.c.col}`);
}

isBuiltinFunction(name) {
  if (name === 'show' || name === 'lutOf' || name === 'exprOfLut') return true;

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
  if (this.c.value !== ')' && this.c.value !== ';') {
    do {
      args.push(this.expr());
      if (this.c.value === ',') this.eat('SYM', ',');
      else break;
    } while (true);
  }

  let callTags = null;
  if (this.c.type === 'SYM' && this.c.value === ';') {
    callTags = this.parseFuncTags();
  }

  this.eat('SYM',')');

  const atom = { call: fn, args };
  if (callTags) atom.callTags = callTags;
  if (fn.line != null && fn.col != null) {
    atom.line = fn.line;
    atom.col = fn.col;
  }
  return atom;
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
    if (kind !== 'asm' && kind !== 'lut' && kind !== 'protocol') {
      throw Error(`Unknown inline kind '${kind}' at ${this.c.file}: ${this.c.line}:${this.c.col} (supported: asm, lut, protocol)`);
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

  parseProtocolInvoke(bracePos) {
    this.eat('SYM', '{');
    const args = {};
    this.t.skip();
    while (!(this.c.type === 'SYM' && this.c.value === '}')) {
      if (this.c.type === 'EOF') {
        throw Error(`Unclosed '{' in protocol invocation at ${this.c.line}:${this.c.col}`);
      }
      while (this.c.type === 'EOL') {
        this.c = this.t.get();
      }
      if (this.c.type === 'SYM' && this.c.value === '}') break;
      if (this.c.type !== 'ID') {
        throw Error(`Expected parameter name in protocol invocation at ${this.c.line}:${this.c.col}`);
      }
      const argName = this.c.value;
      this.eat('ID');
      this.t.skip();
      if (!(this.c.type === 'SYM' && this.c.value === '=')) {
        throw Error(`Expected '=' after parameter '${argName}' in protocol invocation at ${this.c.line}:${this.c.col}`);
      }
      this.eat('SYM', '=');
      this.t.skip();
      args[argName] = this.expr();
      this.t.skip();
    }
    this.eat('SYM', '}');
    return { kind: 'protocolInvoke', args };
  }

  parseLutInlineBody(bodyRaw, resolveExternal) {
    const resolveFn = typeof resolveLutBody === 'function' ? resolveLutBody : null;
    if (resolveFn) {
      const resolved = resolveFn(bodyRaw, resolveExternal || null);
      return {
        attributes: resolved.attributes,
        initialValue: resolved.initialValue,
        labelMap: resolved.labelMap,
        labelExprs: resolved.labelExprs,
      };
    }
    const attributes = {};
    const dataRe = /\bdata\s*\{/;
    const dataMatch = dataRe.exec(bodyRaw);
    if (!dataMatch) {
      throw Error(`inline [lut] body requires at least one label or a data { } block`);
    }
    const beforeData = bodyRaw.substring(0, dataMatch.index);
    for (const line of beforeData.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colon = trimmed.indexOf(':');
      if (colon < 0) continue;
      const key = trimmed.slice(0, colon).trim();
      const val = trimmed.slice(colon + 1).trim();
      if (key === 'depth' || key === 'length') {
        const n = parseInt(val, 10);
        if (isNaN(n)) throw Error(`Invalid LUT ${key} value '${val}'`);
        attributes[key] = n;
      } else if (key === 'fillwith') {
        attributes.fillwith = val;
      } else if (key === 'description' || key === 'filters') {
        attributes[key] = val;
      }
    }
    const bracePos = bodyRaw.indexOf('{', dataMatch.index);
    if (bracePos < 0) {
      throw Error(`inline [lut] body requires 'data { ... }' block`);
    }
    const savedSrc = this.t.src;
    const savedI = this.t.i;
    this.t.src = bodyRaw;
    this._syncTokenizerAt(bracePos);
    const initialValue = this.parseLutDataRaw(bracePos, attributes);
    this.t.src = savedSrc;
    this._syncTokenizerAt(savedI);
    return { attributes, initialValue, labelMap: {}, labelExprs: {} };
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

  parseClcdSymbolsRaw(bracePos) {
    const src = this.t.src;
    let pos = bracePos + 1;
    const symbols = [];
    const known = (typeof ClcdComponent !== 'undefined' && ClcdComponent.knownSymbols)
      ? ClcdComponent.knownSymbols
      : (typeof CLCD_KNOWN_SYMBOLS !== 'undefined' ? CLCD_KNOWN_SYMBOLS : []);

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

    const readIdent = () => {
      skipWS();
      const start = pos;
      if (pos >= src.length || !/[A-Za-z_]/.test(src[pos])) {
        throw Error(`Expected symbol name at ${this.c.line}:${this.c.col}`);
      }
      pos++;
      while (pos < src.length && /[A-Za-z0-9_]/.test(src[pos])) pos++;
      return src.substring(start, pos);
    };

    const readInt = () => {
      skipWS();
      let num = '';
      while (pos < src.length && /[0-9]/.test(src[pos])) {
        num += src[pos];
        pos++;
      }
      if (!num) throw Error(`Expected integer at ${this.c.line}:${this.c.col}`);
      return parseInt(num, 10);
    };

    const readHexColor = () => {
      skipWS();
      if (pos < src.length && src[pos] === '^') {
        pos++;
        let hex = '';
        while (pos < src.length && /[0-9a-fA-F]/.test(src[pos])) {
          hex += src[pos];
          pos++;
        }
        if (!hex) throw Error(`Expected hex color at ${this.c.line}:${this.c.col}`);
        return '#' + hex;
      }
      if (pos < src.length && src[pos] === '#') {
        pos++;
        let hex = '';
        while (pos < src.length && /[0-9a-fA-F]/.test(src[pos])) {
          hex += src[pos];
          pos++;
        }
        return '#' + hex;
      }
      throw Error(`Expected color at ${this.c.line}:${this.c.col}`);
    };

    const readQuotedString = () => {
      skipWS();
      if (pos >= src.length || (src[pos] !== '"' && src[pos] !== "'")) {
        throw Error(`Expected quoted string at ${this.c.line}:${this.c.col}`);
      }
      const quote = src[pos];
      pos++;
      let str = '';
      while (pos < src.length) {
        const char = src[pos];
        if (char === '\n') {
          throw Error(`Unclosed string in symbol at ${this.c.line}:${this.c.col}`);
        }
        if (char === '\\' && pos + 1 < src.length) {
          const next = src[pos + 1];
          if (next === 'n') { str += '\n'; pos += 2; continue; }
          if (next === quote) { str += quote; pos += 2; continue; }
          if (next === '\\') { str += '\\'; pos += 2; continue; }
        }
        if (char === quote) {
          pos++;
          break;
        }
        str += char;
        pos++;
      }
      return str;
    };

    const VALID_LABEL_FAMILIES = ['mono', 'sans', 'serif'];
    const VALID_LABEL_WEIGHTS = ['normal', 'bold', 'italic', 'boldItalic'];

    skipWS();
    while (pos < src.length && src[pos] !== '}') {
      const symName = readIdent();
      if (!known.includes(symName)) {
        throw Error(`Unknown CLCD symbol '${symName}' at ${this.c.line}:${this.c.col}`);
      }
      skipWS();
      if (pos >= src.length || src[pos] !== ':') {
        throw Error(`Expected ':' after symbol '${symName}' at ${this.c.line}:${this.c.col}`);
      }
      pos++;

      const sym = { name: symName };
      let hasBit = false;
      let hasBits = false;

      while (pos < src.length) {
        skipWS();
        if (src[pos] === '}') break;
        if (src[pos] === ':') {
          pos++;
          break;
        }
        const key = readIdent();
        skipWS();
        if (pos >= src.length || src[pos] !== ':') {
          throw Error(`Expected ':' after '${key}' in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
        }
        pos++;
        skipWS();

        if (key === 'x') sym.x = readInt();
        else if (key === 'y') sym.y = readInt();
        else if (key === 'bit') {
          sym.bit = readInt();
          hasBit = true;
        } else if (key === 'bits') {
          const startBit = readInt();
          skipWS();
          if (pos >= src.length || src[pos] !== '-') {
            throw Error(`Expected '-' in bits range at ${this.c.line}:${this.c.col}`);
          }
          pos++;
          const endBit = readInt();
          if (endBit < startBit) {
            throw Error(`CLCD bits range inverted (${startBit}-${endBit}) at ${this.c.line}:${this.c.col}`);
          }
          sym.bitsStart = startBit;
          sym.bitsEnd = endBit;
          hasBits = true;
        } else if (key === 'color') sym.color = readHexColor();
        else if (key === 'bgColor') sym.bgColor = readHexColor();
        else if (key === 'style') {
          const styleNum = readInt();
          if (styleNum !== 1 && styleNum !== 2 && styleNum !== 3) {
            throw Error(`CLCD style must be 1, 2, or 3 in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
          sym.style = styleNum;
        } else if (key === 'text') {
          sym.text = readQuotedString();
        } else if (key === 'family') {
          const fam = readIdent();
          if (!VALID_LABEL_FAMILIES.includes(fam)) {
            throw Error(`Unknown font family '${fam}' in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
          sym.family = fam;
        } else if (key === 'size') {
          const sz = readInt();
          if (sz < 1) {
            throw Error(`CLCD size must be a positive integer in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
          sym.size = sz;
        } else if (key === 'weight') {
          const w = readIdent();
          if (!VALID_LABEL_WEIGHTS.includes(w)) {
            throw Error(`Unknown font weight '${w}' in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
          sym.weight = w;
        } else if (key === 'bitOut') {
          sym.bitOut = readInt();
        } else if (key === 'width') {
          sym.width = readInt();
        } else if (key === 'height') {
          sym.height = readInt();
        } else if (key === 'padding') {
          sym.padding = readInt();
        } else if (key === 'touchType') {
          const tt = readInt();
          if (tt !== 1 && tt !== 2 && tt !== 3) {
            throw Error(`CLCD touchType must be 1, 2, or 3 in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
          sym.touchType = tt;
        } else {
          throw Error(`Unknown attribute '${key}' in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
        }
      }

      if (sym.x === undefined || sym.y === undefined) {
        throw Error(`Symbol '${symName}' requires x and y at ${this.c.line}:${this.c.col}`);
      }
      if (hasBit && hasBits) {
        throw Error(`Symbol '${symName}' cannot have both bit and bits at ${this.c.line}:${this.c.col}`);
      }
      if (!hasBit && !hasBits) {
        throw Error(`Symbol '${symName}' requires bit or bits at ${this.c.line}:${this.c.col}`);
      }

      const symDef = (typeof getClcdSymbolDef === 'function')
        ? getClcdSymbolDef(symName)
        : null;
      if (symDef && symDef.kind === 'text') {
        if (sym.text === undefined) {
          throw Error(`CLCD symbol 'label' requires text at ${this.c.line}:${this.c.col}`);
        }
        if (hasBits) {
          throw Error(`CLCD symbol 'label' does not support bits at ${this.c.line}:${this.c.col}`);
        }
        if (sym.style !== undefined) {
          throw Error(`CLCD symbol 'label' does not support style at ${this.c.line}:${this.c.col}`);
        }
      }
      if (symDef && symDef.kind !== 'text') {
        if (sym.text !== undefined) {
          throw Error(`CLCD symbol '${symName}' does not support text at ${this.c.line}:${this.c.col}`);
        }
        if (sym.family !== undefined) {
          throw Error(`CLCD symbol '${symName}' does not support family at ${this.c.line}:${this.c.col}`);
        }
        if (sym.weight !== undefined) {
          throw Error(`CLCD symbol '${symName}' does not support weight at ${this.c.line}:${this.c.col}`);
        }
      }
      if (sym.size !== undefined && symDef) {
        if (symDef.kind === 'fa') {
          if (sym.size < 8 || sym.size > 64) {
            throw Error(`CLCD FA icon size must be 8-64 in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
        } else if (symDef.kind === 'canvas') {
          if (sym.size < 8 || sym.size > 120) {
            throw Error(`CLCD canvas symbol size must be 8-120 in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
        } else if (symDef.kind === 'text') {
          if (sym.size < 6 || sym.size > 48) {
            throw Error(`CLCD label size must be 6-48 in symbol '${symName}' at ${this.c.line}:${this.c.col}`);
          }
        }
      }
      if (symDef && symDef.kind === 'canvas' && sym.style !== undefined) {
        throw Error(`CLCD symbol '${symName}' does not support style at ${this.c.line}:${this.c.col}`);
      }
      if (sym.style !== undefined) {
        if (!symDef || symDef.kind !== 'fa' || !symDef.glyphs[sym.style]) {
          throw Error(`CLCD symbol '${symName}' does not support style ${sym.style} at ${this.c.line}:${this.c.col}`);
        }
      }
      if (sym.touchType !== undefined && sym.bitOut === undefined) {
        throw Error(`CLCD symbol '${symName}' touchType requires bitOut at ${this.c.line}:${this.c.col}`);
      }

      symbols.push(sym);
      skipWS();
    }

    if (pos >= src.length || src[pos] !== '}') {
      throw Error(`Unclosed CLCD symbols block — expected '}' at ${this.c.line}:${this.c.col}`);
    }
    pos++;
    this._syncTokenizerAt(pos);

    if (typeof ClcdComponent !== 'undefined') {
      ClcdComponent.validateContiguousBits(symbols);
      ClcdComponent.validateContiguousBitOut(symbols);
    }
    return { kind: 'clcdSymbols', symbols };
  }

  parseCompInvoke(compName, globalRef) {
    this.eat('SYM', '(');
    const args = {};
    this.t.skip();
    while (!(this.c.type === 'SYM' && this.c.value === ')')) {
      if (this.c.type === 'EOF') {
        throw Error(`Unclosed '(' in component invocation at ${this.c.line}:${this.c.col}`);
      }
      if (Object.keys(args).length > 0) {
        throw Error(`Component invocation accepts at most one argument at ${this.c.line}:${this.c.col}`);
      }
      if (this.c.type === 'ID') {
        const argName = this.c.value;
        const idStartPos = this.t.i - argName.length;
        this.eat('ID');
        this.t.skip();
        if (this.c.type === 'SYM' && this.c.value === '=') {
          this.eat('SYM', '=');
          this.t.skip();
          args[argName] = this.expr();
        } else {
          this._syncTokenizerAt(idStartPos);
          args.in = this.expr();
        }
      } else {
        args.in = this.expr();
      }
      this.t.skip();
      if (!(this.c.type === 'SYM' && this.c.value === ')')) {
        throw Error(`Component invocation accepts at most one argument at ${this.c.line}:${this.c.col}`);
      }
      break;
    }
    this.eat('SYM', ')');
    const invoke = { var: compName, args };
    if (globalRef) invoke.globalRef = true;
    return { compInvoke: invoke };
  }

}

Parser.KEYWORD_HANDLERS = {
  doc: 'doc',
  watch: 'watch',
  show: 'show',
  peek: 'peek',
  lutOf: 'lutOf',
  exprOfLut: 'exprOfLut',
  useLutAs: 'useLutAs',
  truthTableOf: 'truthTableOf',
  simplify: 'simplify',
  equivalent: 'equivalent',
  inputsOf: 'inputsOf',
  costOf: 'costOf',
  probe: 'probe',
  NEXT: 'next',
  TEST: 'test',
  MODE: 'mode',
  ZRELEASE: 'zRelease',
  Zlist: 'zList',
  comp: 'parseComp',
  pcb: 'parsePcbInstance',
  chip: 'parseChipInstance',
  board: 'parseBoardInstance',
};
