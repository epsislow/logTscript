/* ================= PARSER ENGINE (inline [parser] runtime — F2b) ================= */

function parseEngineError(kind, message, input) {
  return {
    ok: 0,
    error: {
      kind,
      message,
      offset: input.pos,
      line: input.line,
      col: input.col,
    },
  };
}

class FatalParserError extends Error {
  constructor(input) {
    super('syntax error');
    this.name = 'FatalParserError';
    this.input = input;
  }

  toErrorStruct() {
    return {
      kind: 'syntax',
      message: 'syntax error',
      offset: this.input.pos,
      line: this.input.line,
      col: this.input.col,
    };
  }
}

function isFatalParserError(e) {
  return e instanceof FatalParserError || (e && e.name === 'FatalParserError');
}

class ParserInput {
  constructor(src, tokenSpecs, compileRegex) {
    this.src = String(src == null ? '' : src);
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokenSpecs = tokenSpecs.map((t) => ({
      name: t.name,
      re: compileRegex(t.pattern, t.line || 1),
    }));
  }

  save() {
    return { pos: this.pos, line: this.line, col: this.col };
  }

  restore(st) {
    this.pos = st.pos;
    this.line = st.line;
    this.col = st.col;
  }

  atEnd() {
    this.skipWs();
    return this.pos >= this.src.length;
  }

  _advance(n) {
    for (let i = 0; i < n; i++) {
      if (this.pos >= this.src.length) break;
      if (this.src[this.pos] === '\n') {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.pos++;
    }
  }

  skipWs() {
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this._advance(1);
        continue;
      }
      break;
    }
  }

  matchLiteral(text) {
    this.skipWs();
    if (this.src.startsWith(text, this.pos)) {
      this._advance(text.length);
      return true;
    }
    return false;
  }

  lexAnyToken() {
    this.skipWs();
    if (this.pos >= this.src.length) return null;
    let best = null;
    let bestIndex = -1;
    for (let i = 0; i < this.tokenSpecs.length; i++) {
      const spec = this.tokenSpecs[i];
      const slice = this.src.slice(this.pos);
      const m = slice.match(spec.re);
      if (!m || m[0].length === 0) continue;
      const len = m[0].length;
      if (!best || len > best.len || (len === best.len && i < bestIndex)) {
        best = { name: spec.name, text: m[0], len };
        bestIndex = i;
      }
    }
    if (!best) return null;
    this._advance(best.len);
    return { kind: 'token', name: best.name, text: best.text };
  }

  lexToken(name) {
    this.skipWs();
    if (this.pos >= this.src.length) return null;
    const spec = this.tokenSpecs.find((s) => s.name === name);
    if (!spec) return null;
    const slice = this.src.slice(this.pos);
    const m = slice.match(spec.re);
    if (!m || m[0].length === 0) return null;
    this._advance(m[0].length);
    return { kind: 'token', name, text: m[0] };
  }
}

function detectLeftRecPattern(rule) {
  if (!rule || !rule.alternatives || rule.alternatives.length < 2) return null;
  const base = rule.alternatives[rule.alternatives.length - 1];
  if (base.items.length && base.items[0].kind === 'ref' && base.items[0].name === rule.name) return null;
  const recAlts = [];
  for (let i = 0; i < rule.alternatives.length - 1; i++) {
    const rec = rule.alternatives[i];
    if (!rec.items.length || rec.items[0].kind !== 'ref' || rec.items[0].name !== rule.name) return null;
    recAlts.push({ tailItems: rec.items.slice(1), call: rec.call });
  }
  if (recAlts.length === 1) {
    return { tailItems: recAlts[0].tailItems, call: recAlts[0].call, baseAlt: base };
  }
  return { recAlts, baseAlt: base };
}

function stripQuant(item) {
  const copy = Object.assign({}, item);
  delete copy.quant;
  if (copy.kind === 'group' && copy.items) {
    copy.items = copy.items.map(stripQuant);
  }
  return copy;
}

function formatQuantLabel(quant) {
  if (quant == null) return '';
  if (typeof quant === 'string') return quant;
  if (quant.kind === 'fixed') return '{' + quant.n + '}';
  if (quant.kind === 'range') return '{' + quant.min + ',' + quant.max + '}';
  if (quant.kind === 'min') return '{' + quant.min + ',}';
  return String(quant);
}

function formatParseTree(node, indent) {
  indent = indent || 0;
  const pad = '  '.repeat(indent);
  if (!node) return pad + '(null)';
  if (node.kind === 'repeat') {
    const q = formatQuantLabel(node.quant);
    const lines = [pad + 'repeat(' + q + '):'];
    for (const it of node.items) lines.push(formatParseTree(it, indent + 1));
    if (node.errors && node.errors.length) {
      lines.push(pad + '  errors(' + node.errors.length + '):');
      for (let ei = 0; ei < node.errors.length; ei++) {
        const er = node.errors[ei];
        lines.push(pad + '    [' + ei + '] ' + (er.kind || 'syntax') + ' at ' +
          (er.line != null ? er.line : 0) + ':' + (er.col != null ? er.col : 0) + ': ' + (er.message || ''));
      }
    }
    return lines.join('\n');
  }
  if (node.kind === 'optional') {
    if (!node.present) return pad + 'optional: (absent)';
    return pad + 'optional:\n' + formatParseTree(node.value, indent + 1);
  }
  if (node.kind === 'token') {
    return pad + 'token ' + node.name + ' "' + node.text + '"';
  }
  if (node.kind === 'call') {
    const lines = [pad + 'call ' + node.call + ':'];
    if (node.children) {
      for (const k of Object.keys(node.children)) {
        lines.push(pad + '  ' + k + ':');
        lines.push(formatParseTree(node.children[k], indent + 2));
      }
    }
    if (node.captures) {
      for (const k of Object.keys(node.captures)) {
        lines.push(pad + '  $' + k + ':');
        lines.push(formatParseTree(node.captures[k], indent + 2));
      }
    }
    return lines.join('\n');
  }
  return pad + JSON.stringify(node);
}

function collectParseErrors(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'repeat') {
    if (node.errors && node.errors.length) {
      for (const e of node.errors) out.push(e);
    }
    for (const it of node.items) collectParseErrors(it, out);
    return;
  }
  if (node.kind === 'optional') {
    if (node.present) collectParseErrors(node.value, out);
    return;
  }
  if (node.kind === 'call') {
    if (node.children) {
      for (const k of Object.keys(node.children)) collectParseErrors(node.children[k], out);
    }
    if (node.captures) {
      for (const k of Object.keys(node.captures)) collectParseErrors(node.captures[k], out);
    }
  }
}

function createParserEngine(grammar, src, options) {
  const compileRegex = typeof compileParserTokenRegex === 'function'
    ? compileParserTokenRegex
    : function(pattern) { return new RegExp('^(?:' + pattern + ')'); };

  const tokens = grammar.tokens || [];
  const rules = grammar.rules || [];
  const tokensByName = new Map(tokens.map((t) => [t.name, t]));
  const rulesByName = new Map(rules.map((r) => [r.name, r]));
  const input = new ParserInput(src, tokens, compileRegex);
  const startRule = (options && options.startRule) || (rules[0] && rules[0].name);
  let probeMode = 0;

  function failIfCommitted(commitState) {
    if (commitState && commitState.committed) {
      throw new FatalParserError(input);
    }
  }

  function parseSequenceItems(items, commitState) {
    const cs = commitState || { committed: false };
    const cp = input.save();
    const captures = {};
    let lastValue = null;
    for (const item of items) {
      if (item.kind === 'commit') {
        cs.committed = true;
        continue;
      }
      const v = parseItem(item, cs);
      if (v === null) {
        failIfCommitted(cs);
        input.restore(cp);
        return null;
      }
      if (item.kind === 'capture') captures[item.name] = v;
      else if (item.kind === 'lookaheadPos' || item.kind === 'lookaheadNeg') {
        /* zero-width */
      } else if (item.kind === 'literal' && v === true) {
        /* bare literal */
      } else if (isTreeNode(v)) {
        lastValue = v;
      } else if (item.kind !== 'literal') {
        lastValue = v;
      }
    }
    return { captures, lastValue };
  }

  function appendRecoverFailedError(errors) {
    errors.push({
      kind: 'syntax',
      message: 'recover failed',
      offset: input.pos,
      line: input.line,
      col: input.col,
    });
  }

  function runSkip2Literal(value, errors) {
    while (!input.atEnd()) {
      if (input.matchLiteral(value)) return true;
      input._advance(1);
    }
    appendRecoverFailedError(errors);
    return false;
  }

  function runSkip2Rule(ruleName, errors) {
    while (!input.atEnd()) {
      input.skipWs();
      const cp = input.save();
      const prevProbe = probeMode;
      probeMode = true;
      let ok = false;
      try {
        ok = parseRuleName(ruleName, null) !== null;
      } finally {
        probeMode = prevProbe;
        input.restore(cp);
      }
      if (ok) return true;
      input.skipWs();
      const cp2 = input.save();
      const tok = input.lexAnyToken();
      if (tok) continue;
      input.restore(cp2);
      input._advance(1);
    }
    appendRecoverFailedError(errors);
    return false;
  }

  function runSkip2(recoverSpec, errors) {
    if (!recoverSpec) return false;
    if (recoverSpec.kind === 'literal') return runSkip2Literal(recoverSpec.value, errors);
    if (recoverSpec.kind === 'rule') return runSkip2Rule(recoverSpec.name, errors);
    return false;
  }

  function parseRepeatPlus(core, recoverSpec, commitState) {
    const items = [];
    const errors = [];
    while (true) {
      if (commitState) commitState.committed = false;
      const cp = input.save();
      try {
        const v = parseItemCore(core, commitState);
        if (v === null) {
          input.restore(cp);
          break;
        }
        items.push(v);
      } catch (e) {
        if (isFatalParserError(e) && recoverSpec) {
          errors.push(e.toErrorStruct());
          if (commitState) commitState.committed = false;
          const posBeforeSkip = input.pos;
          runSkip2(recoverSpec, errors);
          if (input.pos === posBeforeSkip) {
            if (input.atEnd()) break;
            input._advance(1);
          }
          continue;
        }
        throw e;
      }
    }
    if (!items.length && !errors.length) return null;
    const node = { kind: 'repeat', quant: '+', items };
    if (errors.length) node.errors = errors;
    return node;
  }

  function parseCountedRepeat(core, count, commitState) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const v = parseItemCore(core, commitState);
      if (v === null) return null;
      items.push(v);
    }
    return { kind: 'repeat', quant: { kind: 'fixed', n: count }, items };
  }

  function parseItem(item, commitState) {
    const quant = item.quant;
    const core = stripQuant(item);

    if (quant && typeof quant === 'object' && quant.kind === 'fixed') {
      if (probeMode) {
        for (let i = 0; i < quant.n; i++) {
          if (parseItemCore(core, commitState) === null) return null;
        }
        return true;
      }
      return parseCountedRepeat(core, quant.n, commitState);
    }

    if (quant && typeof quant === 'object' && quant.kind === 'range') {
      for (let count = quant.max; count >= quant.min; count--) {
        const cp = input.save();
        let ok = true;
        const items = [];
        for (let i = 0; i < count; i++) {
          const v = parseItemCore(core, commitState);
          if (v === null) {
            ok = false;
            break;
          }
          items.push(v);
        }
        if (ok) {
          if (probeMode) return true;
          return { kind: 'repeat', quant, items };
        }
        input.restore(cp);
      }
      return null;
    }

    if (quant && typeof quant === 'object' && quant.kind === 'min') {
      const items = [];
      while (true) {
        const cp = input.save();
        const v = parseItemCore(core, commitState);
        if (v === null) {
          input.restore(cp);
          break;
        }
        items.push(v);
      }
      if (items.length < quant.min) return null;
      if (probeMode) return true;
      return { kind: 'repeat', quant, items };
    }

    if (quant === '+') {
      if (probeMode) {
        const first = parseItemCore(core, commitState);
        if (first === null) return null;
        while (true) {
          const cp = input.save();
          if (parseItemCore(core, commitState) === null) {
            input.restore(cp);
            break;
          }
        }
        return true;
      }
      return parseRepeatPlus(core, item.recover || null, commitState);
    }

    if (quant === '*') {
      if (probeMode) {
        while (true) {
          const cp = input.save();
          if (parseItemCore(core, commitState) === null) {
            input.restore(cp);
            break;
          }
        }
        return true;
      }
      const items = [];
      while (true) {
        const cp = input.save();
        const next = parseItemCore(core, commitState);
        if (next === null) {
          input.restore(cp);
          break;
        }
        items.push(next);
      }
      return { kind: 'repeat', quant: '*', items };
    }

    if (quant === '?') {
      const cp = input.save();
      const v = parseItemCore(core, commitState);
      if (v === null) {
        input.restore(cp);
        if (probeMode) return true;
        return { kind: 'optional', present: false };
      }
      if (probeMode) return true;
      return { kind: 'optional', present: true, value: v };
    }

    return parseItemCore(item, commitState);
  }

  function parseLookaheadBody(items) {
    const cp = input.save();
    const prev = probeMode;
    probeMode++;
    const seq = parseSequenceItems(items);
    probeMode = prev;
    input.restore(cp);
    return seq !== null;
  }

  function parseItemCore(item, commitState) {
    if (item.kind === 'commit') {
      if (commitState) commitState.committed = true;
      return true;
    }
    if (item.kind === 'lookaheadPos') {
      return parseLookaheadBody(item.items) ? true : null;
    }
    if (item.kind === 'lookaheadNeg') {
      return parseLookaheadBody(item.items) ? null : true;
    }
    if (item.kind === 'literal') {
      return input.matchLiteral(item.value) ? true : null;
    }
    if (item.kind === 'ref') {
      if (tokensByName.has(item.name)) {
        return input.lexToken(item.name);
      }
      if (rulesByName.has(item.name)) {
        return parseRuleName(item.name, commitState);
      }
      return null;
    }
    if (item.kind === 'capture') {
      const inner = { kind: 'ref', name: item.refName, line: item.line };
      return parseItemCore(inner, commitState);
    }
    if (item.kind === 'group') {
      const seq = parseSequenceItems(item.items, commitState);
      return seq ? seq.lastValue : null;
    }
    return null;
  }

  function isTreeNode(v) {
    return v != null && typeof v === 'object' && v !== true;
  }

  function parseAlternative(alt, commitState) {
    const cs = commitState || { committed: false };
    const cpAlt = input.save();
    const captures = {};
    const childRefs = [];
    let lastValue = null;
    for (const item of alt.items) {
      if (item.kind === 'commit') {
        cs.committed = true;
        continue;
      }
      const v = parseItem(item, cs);
      if (v === null) {
        failIfCommitted(cs);
        input.restore(cpAlt);
        return null;
      }
      if (item.kind === 'capture') captures[item.name] = v;
      else if (item.kind === 'ref') childRefs.push(v);
      else if (item.kind === 'lookaheadPos' || item.kind === 'lookaheadNeg') {
        /* zero-width probe — never contributes to rule tree */
      } else if (item.kind === 'literal' && v === true) {
        /* bare literal marker — prefer ref/call tree nodes for lastValue */
      } else if (isTreeNode(v)) {
        lastValue = v;
      } else if (item.kind !== 'literal') {
        lastValue = v;
      }
    }
    if (probeMode) {
      if (alt.call) return true;
      return lastValue != null ? lastValue : (childRefs.length ? childRefs[childRefs.length - 1] : true);
    }
    if (alt.call) {
      const node = { kind: 'call', call: alt.call };
      if (Object.keys(captures).length) node.captures = captures;
      else if (childRefs.length === 1 && childRefs[0].kind === 'token') {
        node.children = { value: childRefs[0].text };
      } else if (childRefs.length >= 2) {
        node.children = { name: childRefs[0], arg: childRefs[childRefs.length - 1] };
      } else if (childRefs.length === 1) {
        node.children = { value: childRefs[0] };
      }
      return node;
    }
    if (lastValue != null) return lastValue;
    if (childRefs.length) return childRefs[childRefs.length - 1];
    return true;
  }

  function parseLeftRecRule(rule, lr, commitState) {
    const cs = commitState || { committed: false };
    const base = parseAlternative(lr.baseAlt, cs);
    if (base === null) return null;
    let acc = base;
    const recAlts = lr.recAlts || [{ tailItems: lr.tailItems, call: lr.call }];
    while (true) {
      const cp = input.save();
      let matched = false;
      for (const rec of recAlts) {
        try {
          const tail = parseSequenceItems(rec.tailItems, cs);
          if (tail !== null) {
            matched = true;
            if (rec.call) {
              acc = {
                kind: 'call',
                call: rec.call,
                children: { left: acc, right: tail.lastValue },
              };
            } else {
              acc = tail.lastValue;
            }
            break;
          }
        } catch (e) {
          if (isFatalParserError(e)) throw e;
          throw e;
        }
        input.restore(cp);
      }
      if (!matched) break;
    }
    return acc;
  }

  function parseRuleName(name, commitState) {
    const rule = rulesByName.get(name);
    if (!rule) return null;
    const lr = detectLeftRecPattern(rule);
    if (lr) return parseLeftRecRule(rule, lr, commitState);

    for (const alt of rule.alternatives) {
      const cp = input.save();
      const altCommit = commitState || { committed: false };
      try {
        const result = parseAlternative(alt, altCommit);
        if (result !== null) {
          return result;
        }
      } catch (e) {
        if (isFatalParserError(e)) throw e;
        throw e;
      }
      input.restore(cp);
    }
    return null;
  }

  return {
    input,
    startRule,
    parseRuleName,
    parseSequenceItems,
    parseAlternative,
    parseItem,
  };
}

function parseGrammar(grammar, src, options) {
  if (!grammar || !grammar.rules || !grammar.rules.length) {
    return { ok: 0, error: { kind: 'syntax', message: 'empty grammar (no rules)', offset: 0, line: 1, col: 1 } };
  }
  const engine = createParserEngine(grammar, src, options);
  const startRule = engine.startRule;
  try {
    const tree = engine.parseRuleName(startRule);
    const errors = [];
    collectParseErrors(tree, errors);
    if (tree === null) {
      const errPos = engine.input.save();
      engine.input.skipWs();
      if (engine.input.pos >= String(src).length) {
        return parseEngineError('syntax', 'syntax error', engine.input);
      }
      const probe = engine.input.save();
      const anyTok = engine.input.lexAnyToken();
      engine.input.restore(probe);
      if (anyTok === null) {
        return parseEngineError('lex', 'unrecognized character', engine.input);
      }
      engine.input.restore(errPos);
      return parseEngineError('syntax', 'syntax error', engine.input);
    }
    engine.input.skipWs();
    if (errors.length) {
      return { ok: 0, tree, errors, error: errors[0] };
    }
    if (!engine.input.atEnd()) {
      return parseEngineError('syntax', 'unexpected trailing input', engine.input);
    }
    return { ok: 1, tree };
  } catch (e) {
    if (isFatalParserError(e)) {
      return { ok: 0, error: e.toErrorStruct() };
    }
    return {
      ok: 0,
      error: {
        kind: 'syntax',
        message: e.message || 'parse error',
        offset: engine.input.pos,
        line: engine.input.line,
        col: engine.input.col,
      },
    };
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseGrammar = parseGrammar;
  globalThis.formatParseTree = formatParseTree;
  globalThis.detectLeftRecPattern = detectLeftRecPattern;
  globalThis.FatalParserError = FatalParserError;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseGrammar,
    formatParseTree,
    detectLeftRecPattern,
    createParserEngine,
    FatalParserError,
  };
}
