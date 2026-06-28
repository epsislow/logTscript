/**
 * Extract scripts, API steps, and assertion labels from a test run() function source.
 */
const fs = require('fs');
const path = require('path');

const SCRIPT_CALLEES = [
  'session.run',
  'session.runDoc',
  'session.runArith',
  'session.tokenize',
  'session.parse',
  'session.preprocessShortNotation',
  'preprocessLoop',
  'parseIsaBody',
  'parseProtocolBody'
];

const STEP_CALLEES = [
  'session.gateReduce',
  'session.gateExpand',
  'session.gate',
  'session.lshift',
  'session.rshift'
];

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

function unescapeJsString(s, quote) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(quote === '`' ? /\\`/g : /\\'/g, quote)
    .replace(quote === '"' ? /\\"/g : /\\'/g, quote);
}

function readQuotedString(s, i) {
  const quote = s[i];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  let j = i + 1;
  let out = '';
  while (j < s.length) {
    const c = s[j];
    if (c === '\\' && j + 1 < s.length) {
      out += c + s[j + 1];
      j += 2;
      continue;
    }
    if (c === quote) {
      return {
        text: unescapeJsString(out, quote),
        raw: s.slice(i, j + 1),
        end: j + 1
      };
    }
    out += c;
    j++;
  }
  return null;
}

function readExpression(s, start) {
  let i = skipWs(s, start);
  if (i >= s.length) return null;

  const str = readQuotedString(s, i);
  if (str) {
    return { text: str.raw, value: str.text, end: str.end };
  }

  let depth = 0;
  const exprStart = i;
  while (i < s.length) {
    const quoted = readQuotedString(s, i);
    if (quoted) {
      i = quoted.end;
      continue;
    }

    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) {
        return { text: s.slice(exprStart, i).trim(), value: null, end: i };
      }
      depth--;
    } else if (depth === 0 && (c === ',' || c === ';')) {
      return { text: s.slice(exprStart, i).trim(), value: null, end: i };
    }
    i++;
  }

  if (i > exprStart) {
    return { text: s.slice(exprStart, i).trim(), value: null, end: i };
  }
  return null;
}

function splitConcatParts(expr) {
  const parts = [];
  let i = 0;
  while (i < expr.length) {
    i = skipWs(expr, i);
    if (i >= expr.length) break;
    const partStart = i;
    let depth = 0;
    while (i < expr.length) {
      const quoted = readQuotedString(expr, i);
      if (quoted) {
        i = quoted.end;
        continue;
      }
      const c = expr[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (depth === 0 && c === '+') break;
      i++;
    }
    const part = expr.slice(partStart, i).trim();
    if (part) parts.push(part);
    i = skipWs(expr, i);
    if (i < expr.length && expr[i] === '+') {
      i++;
      continue;
    }
    break;
  }
  return parts.length ? parts : [expr.trim()];
}

function resolveExpr(expr, localConsts, sharedConsts, depth = 0) {
  if (depth > 32) return null;
  const trimmed = expr.trim();
  if (!trimmed) return null;

  const quoted = readQuotedString(trimmed, 0);
  if (quoted && quoted.end === trimmed.length) {
    return quoted.text;
  }

  if (localConsts.has(trimmed)) return localConsts.get(trimmed);
  if (sharedConsts.has(trimmed)) return sharedConsts.get(trimmed);

  const parts = splitConcatParts(trimmed);
  if (parts.length > 1) {
    let out = '';
    for (const part of parts) {
      const r = resolveExpr(part, localConsts, sharedConsts, depth + 1);
      if (r == null) return null;
      out += r;
    }
    return out;
  }

  return null;
}

function extractConstExprs(code) {
  const exprs = new Map();
  const re = /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1];
    const valueStart = m.index + m[0].length;
    const expr = readExpression(code, valueStart);
    if (expr) exprs.set(name, expr.text);
  }
  return exprs;
}

function resolveConstMap(exprs, externalConsts = new Map()) {
  const resolved = new Map(externalConsts);
  for (let pass = 0; pass < 64; pass++) {
    let progress = false;
    for (const [name, exprText] of exprs) {
      const v = resolveExpr(exprText, resolved, resolved);
      if (v != null && resolved.get(name) !== v) {
        resolved.set(name, v);
        progress = true;
      }
    }
    if (!progress) break;
  }
  return resolved;
}

function extractFileConstMap(code) {
  return resolveConstMap(extractConstExprs(code));
}

function loadSharedConstMap(dir, files) {
  const exprs = new Map();
  for (const f of files) {
    const fileCode = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const [k, v] of extractConstExprs(fileCode)) exprs.set(k, v);
  }
  return resolveConstMap(exprs);
}

function functionBody(source) {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return source;
  return source.slice(start + 1, end);
}

function extractNamedFunctionBody(suiteSource, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = re.exec(suiteSource);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  while (i < suiteSource.length && depth > 0) {
    const quoted = readQuotedString(suiteSource, i);
    if (quoted) {
      i = quoted.end;
      continue;
    }
    const c = suiteSource[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return suiteSource.slice(start, i - 1);
}

function resolveDelegateBody(body, suiteSource) {
  const trimmed = body.trim();
  // Multiline test bodies are never a single-line delegate call.
  if (trimmed.includes('\n')) return body;
  const delegate = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(h,\s*session[^)]*\)\s*;\s*$/);
  if (!delegate || !suiteSource) return body;
  const helperBody = extractNamedFunctionBody(suiteSource, delegate[1]);
  return helperBody || body;
}

function readFirstCallArg(s, openParenIndex) {
  return readExpression(s, openParenIndex + 1);
}

function findCalls(body, callees) {
  const calls = [];
  for (const callee of callees) {
    const needle = callee + '(';
    let idx = 0;
    while ((idx = body.indexOf(needle, idx)) !== -1) {
      const openParen = idx + callee.length;
      const arg = readFirstCallArg(body, openParen);
      const allArgs = readCallArgs(body, openParen);
      if (arg) {
        calls.push({
          callee,
          argExpr: arg.text,
          args: allArgs.args,
          openParen,
          end: allArgs.end
        });
        idx = Math.max(allArgs.end, idx + 1);
      } else {
        idx += needle.length;
      }
    }
  }
  return calls;
}

function extractLocalConsts(body, sharedConsts) {
  const exprs = new Map();
  const declRe = /(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/g;
  let m;
  while ((m = declRe.exec(body)) !== null) {
    const name = m[1];
    const valueStart = m.index + m[0].length;
    const expr = readExpression(body, valueStart);
    if (expr) exprs.set(name, expr.text);
  }
  return resolveConstMap(exprs, sharedConsts);
}

function pushUnique(arr, value) {
  const norm = String(value).trim();
  if (!norm) return;
  if (!arr.includes(norm)) arr.push(norm);
}

function compactExpr(expr, maxLen = 120) {
  const oneLine = expr.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 1) + '…';
}

function readCallArgs(s, openParenIndex) {
  const args = [];
  let i = openParenIndex + 1;
  while (i < s.length) {
    i = skipWs(s, i);
    if (s[i] === ')') return { args, end: i + 1 };
    const arg = readExpression(s, i);
    if (!arg) break;
    args.push(arg.text);
    i = skipWs(s, arg.end);
    if (s[i] === ',') {
      i++;
      continue;
    }
    if (s[i] === ')') return { args, end: i + 1 };
    break;
  }
  return { args, end: i };
}

function formatArgLabel(argExpr, localConsts, sharedConsts) {
  const resolved = resolveExpr(argExpr, localConsts, sharedConsts);
  if (resolved != null) return compactExpr(resolved, 60);
  const trimmed = argExpr.trim();
  const quoted = readQuotedString(trimmed, 0);
  if (quoted && quoted.end === trimmed.length) return quoted.text;
  return compactExpr(trimmed, 40);
}

function formatStepFromCall(callee, args, localConsts, sharedConsts) {
  const short = callee.replace(/^session\./, '');
  if (!args.length) return short + '()';
  return short + '(' + args.map(a => formatArgLabel(a, localConsts, sharedConsts)).join(', ') + ')';
}

function extractScripts(body, sharedConsts) {
  const scripts = [];
  const localConsts = extractLocalConsts(body, sharedConsts);

  for (const call of findCalls(body, SCRIPT_CALLEES)) {
    const resolved = resolveExpr(call.argExpr, localConsts, sharedConsts);
    if (resolved != null) pushUnique(scripts, resolved);
  }

  for (const [name, value] of localConsts) {
    const used = new RegExp(
      '(?:session\\.(?:run|runDoc|runArith|tokenize|parse|preprocessShortNotation)|preprocessLoop)\\(\\s*' +
      name + '\\b'
    );
    if (used.test(body) && value && !scripts.includes(value)) {
      pushUnique(scripts, value);
    }
  }

  return finalizeScripts(scripts);
}

function finalizeScripts(scripts) {
  if (scripts.length <= 1) return scripts;
  const sorted = [...scripts].sort((a, b) => b.length - a.length);
  return [sorted[0]];
}

function extractInterpreterSteps(body) {
  const steps = [];
  const getDocRe = /Interpreter\.getDocLines\(\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = getDocRe.exec(body)) !== null) {
    pushUnique(steps, 'getDocLines(' + unescapeJsString(m[1], "'") + ')');
  }

  const interpRe = /Interpreter\.([a-zA-Z0-9_]+)\(/g;
  while ((m = interpRe.exec(body)) !== null) {
    if (m[1] === 'getDocLines') continue;
    const open = m.index + m[0].length - 1;
    const arg = readFirstCallArg(body, open);
    if (arg) {
      pushUnique(steps, 'Interpreter.' + m[1] + '(' + compactExpr(arg.text, 80) + ')');
    } else {
      pushUnique(steps, 'Interpreter.' + m[1] + '()');
    }
  }

  const doc2Re = /InterpreterDoc2\.([a-zA-Z0-9_]+)\(/g;
  while ((m = doc2Re.exec(body)) !== null) {
    const open = m.index + m[0].length - 1;
    const arg = readFirstCallArg(body, open);
    pushUnique(steps, 'InterpreterDoc2.' + m[1] + '(' + compactExpr(arg ? arg.text : '', 80) + ')');
  }

  return steps;
}

function extractLoopDocSteps(body) {
  const steps = [];
  const forRe = /for\s*\(\s*const\s+\w+\s+of\s+\[([^\]]+)\]\s*\)\s*\{[^}]*Interpreter\.getDocLines\(\s*\w+/g;
  let m;
  while ((m = forRe.exec(body)) !== null) {
    const items = m[1].match(/'([^']+)'/g);
    if (items) {
      for (const item of items) {
        pushUnique(steps, 'getDocLines(' + item.slice(1, -1) + ')');
      }
    }
  }
  return steps;
}

function extractInlineHelperSteps(body) {
  const steps = [];
  const callRe = /([a-zA-Z_][a-zA-Z0-9_]*)\(\s*(\{[^}]+\})\s*\)/g;
  let m;
  while ((m = callRe.exec(body)) !== null) {
    if (m[1] === 'resolveBitRange' || m[1] === 'h.assert' || m[1] === 'String') {
      if (m[1] === 'resolveBitRange') {
        pushUnique(steps, m[1] + '(' + compactExpr(m[2], 80) + ')');
      }
    }
  }
  const builtinRe = /isBuiltinFunction\(\s*'((?:\\'|[^'])*)'/g;
  while ((m = builtinRe.exec(body)) !== null) {
    pushUnique(steps, 'isBuiltinFunction(' + unescapeJsString(m[1], "'") + ')');
  }
  return steps;
}

function extractRegistrySteps(body) {
  const steps = [];
  let m;

  const expectedRe = /const\s+expectedTypes\s*=\s*\[([\s\S]*?)\]/;
  const em = body.match(expectedRe);
  if (em) {
    const types = em[1].match(/'([^']+)'/g);
    if (types) {
      pushUnique(steps, 'registry.has(' + types.map(t => t.slice(1, -1)).join(', ') + ')');
    }
  }

  const getRe = /registry\.get\(\s*'((?:\\'|[^'])*)'\)(?:\.([a-zA-Z0-9_]+)\([^)]*\))?/g;
  while ((m = getRe.exec(body)) !== null) {
    const type = unescapeJsString(m[1], "'");
    const method = m[2] ? '.' + m[2] + '(…)' : '';
    pushUnique(steps, 'registry.get(' + type + ')' + method);
  }

  const shortRe = /registry\.getShortnames\(\)/;
  if (shortRe.test(body)) pushUnique(steps, 'registry.getShortnames()');

  const supportsRe = /registry\.supportsProperty\(\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'/g;
  while ((m = supportsRe.exec(body)) !== null) {
    pushUnique(steps, 'supportsProperty(' + m[1] + ', ' + m[2] + ')');
  }

  return steps;
}

function extractTokenizerParserSteps(body, sharedConsts) {
  const steps = [];
  const localConsts = extractLocalConsts(body, sharedConsts);

  const tokRe = /new\s+Tokenizer\(/g;
  let m;
  while ((m = tokRe.exec(body)) !== null) {
    const open = m.index + m[0].length - 1;
    const arg = readFirstCallArg(body, open);
    if (!arg) continue;
    const resolved = resolveExpr(arg.text, localConsts, sharedConsts);
    if (resolved != null) pushUnique(steps, 'Tokenizer(' + compactExpr(resolved, 80) + ')');
    else pushUnique(steps, 'Tokenizer(' + compactExpr(arg.text, 80) + ')');
  }

  const parRe = /new\s+Parser\(/g;
  while ((m = parRe.exec(body)) !== null) {
    pushUnique(steps, 'Parser(…)');
  }

  return steps;
}

function extractSteps(body, sharedConsts, scripts) {
  const steps = [];
  const localConsts = extractLocalConsts(body, sharedConsts);
  const scriptSet = new Set(scripts);

  for (const call of findCalls(body, STEP_CALLEES)) {
    pushUnique(steps, formatStepFromCall(call.callee, call.args, localConsts, sharedConsts));
  }

  for (const call of findCalls(body, SCRIPT_CALLEES)) {
    const resolved = resolveExpr(call.argExpr, localConsts, sharedConsts);
    if (resolved == null) {
      const label = call.callee.replace(/^session\./, '');
      pushUnique(steps, label + '(' + compactExpr(call.argExpr, 100) + ') [nerezolvat]');
    }
  }

  for (const part of extractInterpreterSteps(body)) pushUnique(steps, part);
  for (const part of extractLoopDocSteps(body)) pushUnique(steps, part);
  for (const part of extractInlineHelperSteps(body)) pushUnique(steps, part);
  for (const part of extractRegistrySteps(body)) pushUnique(steps, part);
  for (const part of extractTokenizerParserSteps(body, sharedConsts)) pushUnique(steps, part);

  if (/session\._ensureRegistry\(\)/.test(body) && !steps.some(s => s.startsWith('registry.'))) {
    pushUnique(steps, 'session._ensureRegistry()');
  }

  return steps.filter(step => {
    if (scriptSet.has(step)) return false;
    return true;
  });
}

function extractAssertions(body) {
  const assertions = [];
  const re = /h\.assert(?:Throws)?\(\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    pushUnique(assertions, unescapeJsString(m[1], "'"));
  }
  const reDq = /h\.assert(?:Throws)?\(\s*"((?:\\"|[^"])*)"/g;
  while ((m = reDq.exec(body)) !== null) {
    pushUnique(assertions, unescapeJsString(m[1], '"'));
  }
  const concatAssert = /h\.assert\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\+\s*'((?:\\'|[^'])*)'/g;
  while ((m = concatAssert.exec(body)) !== null) {
    pushUnique(assertions, m[1] + ' + …');
  }
  return assertions;
}

function readBalanced(s, i, openCh, closeCh) {
  if (s[i] !== openCh) return null;
  let depth = 0;
  const start = i;
  while (i < s.length) {
    const quoted = readQuotedString(s, i);
    if (quoted) {
      i = quoted.end;
      continue;
    }
    if (s[i] === openCh) depth++;
    else if (s[i] === closeCh) {
      depth--;
      if (depth === 0) return { text: s.slice(start, i + 1), end: i + 1 };
    }
    i++;
  }
  return null;
}

function splitTopLevelCommaList(inner) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const quoted = readQuotedString(inner, i);
    if (quoted) {
      i = quoted.end - 1;
      continue;
    }
    const c = inner[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ',' && depth === 0) {
      const part = inner.slice(start, i).trim();
      if (part) parts.push(part);
      start = i + 1;
    }
  }
  const tail = inner.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parseObjectProperty(prop) {
  const colon = prop.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([\s\S]+)$/);
  if (colon) return { key: colon[1], valueExpr: colon[2].trim() };
  const shorthand = prop.match(/^([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (shorthand) return { key: shorthand[1], valueExpr: shorthand[1], shorthand: true };
  return null;
}

function resolveLiteralValue(expr, localConsts, sharedConsts) {
  const trimmed = expr.trim();
  if (!trimmed) return null;

  const quoted = readQuotedString(trimmed, 0);
  if (quoted && quoted.end === trimmed.length) return quoted.text;

  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    const v = resolveExpr(trimmed, localConsts, sharedConsts);
    if (v != null) return v;
  }

  return null;
}

function parseObjectFields(objExpr, localConsts, sharedConsts) {
  const trimmed = objExpr.trim();
  if (!trimmed.startsWith('{')) return {};
  const inner = trimmed.slice(1, -1);
  const out = {};
  for (const prop of splitTopLevelCommaList(inner)) {
    const parsed = parseObjectProperty(prop);
    if (!parsed) continue;
    if (parsed.valueExpr.startsWith('{')) {
      out[parsed.key] = parseObjectFields(parsed.valueExpr, localConsts, sharedConsts);
      continue;
    }
    const val = resolveLiteralValue(parsed.valueExpr, localConsts, sharedConsts);
    if (val != null) {
      out[parsed.key] = val;
      continue;
    }
    if (parsed.shorthand || parsed.key === parsed.valueExpr) {
      const v = resolveExpr(parsed.valueExpr, localConsts, sharedConsts);
      if (v != null) out[parsed.key] = v;
    }
  }
  return out;
}

const ERROR_DISPLAY_EXPECT_LABELS = {
  message: 'error message',
  scriptLocLine: 'scriptLoc.line',
  line: 'editor line',
  col: 'editor col',
  spanLen: 'caret span',
  sourceLine: 'output source line',
  caretLine: 'output caret',
  isMissing: 'missing token'
};

const ERROR_DISPLAY_EXPECT_ORDER = [
  'message', 'scriptLocLine', 'line', 'col', 'spanLen', 'sourceLine', 'caretLine', 'isMissing'
];

function formatCheckValue(value) {
  if (typeof value === 'string') {
    if (value.length > 72) return JSON.stringify(value.slice(0, 69) + '…');
    return JSON.stringify(value);
  }
  return String(value);
}

function formatErrorDisplayChecks(spec) {
  const checks = [];
  const prefix = spec.name ? spec.name + ': ' : '';
  const action = spec.action || 'run';
  pushUnique(checks, prefix + 'action ' + action + ' (must throw)');

  const exp = spec.expect || {};
  for (const key of ERROR_DISPLAY_EXPECT_ORDER) {
    if (exp[key] == null) continue;
    const label = ERROR_DISPLAY_EXPECT_LABELS[key] || key;
    pushUnique(checks, prefix + label + ' = ' + formatCheckValue(exp[key]));
  }

  if (exp.sourceLine && exp.caretLine && exp.message && !exp.outputLines) {
    pushUnique(checks, prefix + 'implicit: caret count, hook line/col, output[0..2]');
  }
  return checks;
}

function formatErrorDisplaySteps(spec, meta) {
  const steps = [];
  const action = spec.action || 'run';
  pushUnique(steps, 'assertErrorDisplay(action: ' + action + ')');
  pushUnique(steps, 'session.' + action + '(source) inside assertErrorDisplay');

  if (meta && meta.propagation && meta.propagation !== 'legacy') {
    pushUnique(steps, 'propagation: ' + meta.propagation);
  }

  if (spec.editorSource && spec.source && spec.editorSource !== spec.source) {
    const edLines = spec.editorSource.split('\n').length;
    const runLines = spec.source.split('\n').length;
    pushUnique(steps, 'editorSource differs (' + edLines + ' lines, run source ' + runLines + ' lines)');
    const preview = compactExpr(spec.editorSource, 100);
    if (preview) {
      pushUnique(steps, 'editorSource preview: ' + preview);
    } else if (spec.editorSource.startsWith('\n')) {
      pushUnique(steps, 'editorSource preview: (leading blank line)');
    }
  }

  pushUnique(steps, 'resolveErrorDisplay → alignErrorDisplayToSource → output + editor hook');
  return steps;
}

function extractAssertErrorDisplaySpecs(body, localConsts, sharedConsts) {
  const specs = [];
  const needle = 'assertErrorDisplay(';
  let idx = 0;
  while ((idx = body.indexOf(needle, idx)) !== -1) {
    const openParen = idx + needle.length - 1;
    let i = skipWs(body, openParen + 1);
    let arg = readExpression(body, i);
    if (!arg) {
      idx += needle.length;
      continue;
    }
    i = skipWs(body, arg.end);
    if (body[i] === ',') i++;
    arg = readExpression(body, skipWs(body, i));
    if (!arg) {
      idx += needle.length;
      continue;
    }
    i = skipWs(body, arg.end);
    if (body[i] === ',') i++;
    const specArg = readExpression(body, skipWs(body, i));
    if (!specArg || !specArg.text.trim().startsWith('{')) {
      idx += needle.length;
      continue;
    }
    const specObj = parseObjectFields(specArg.text, localConsts, sharedConsts);
    if (specObj && (specObj.source || specObj.expect)) specs.push(specObj);
    idx = Math.max(specArg.end, idx + 1);
  }
  return specs;
}

function detailFromAssertErrorDisplay(spec, meta) {
  const scripts = [];
  if (spec.source) pushUnique(scripts, spec.source);
  return {
    scripts: finalizeScripts(scripts),
    steps: formatErrorDisplaySteps(spec, meta),
    assertions: formatErrorDisplayChecks(spec)
  };
}

function extractBuildErrorPresentationDetail(body, localConsts, sharedConsts, meta) {
  const scripts = [];
  const steps = [];
  const assertions = extractAssertions(body);

  const srcDecl = body.match(/const\s+src\s*=\s*([\s\S]*?);/);
  if (srcDecl) {
    const resolved = resolveLiteralValue(srcDecl[1], localConsts, sharedConsts);
    if (resolved != null) pushUnique(scripts, resolved);
  }

  const presCall = body.match(/buildErrorPresentation\(\s*err\s*,\s*([^,]+)\s*,\s*([^)]+)\)/);
  if (presCall) {
    pushUnique(steps, 'buildErrorPresentation(err, ' + compactExpr(presCall[1].trim(), 40) +
      ', ' + compactExpr(presCall[2].trim(), 40) + ')');
  }

  const scriptErr = body.match(/scriptError\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/);
  if (scriptErr) {
    pushUnique(steps, 'scriptError(' + JSON.stringify(unescapeJsString(scriptErr[1], "'")) +
      ', line ' + scriptErr[2] + ', col ' + scriptErr[3] +
      (scriptErr[4] ? ', len ' + scriptErr[4] : '') + ')');
  }

  pushUnique(steps, 'resolveErrorDisplay → alignErrorDisplayToSource → output + editor hook');
  if (meta && meta.propagation && meta.propagation !== 'legacy') {
    pushUnique(steps, 'propagation: ' + meta.propagation);
  }

  if (!assertions.length) {
    pushUnique(assertions, 'message');
    pushUnique(assertions, 'hook line / hook col');
    pushUnique(assertions, 'output lines + output[0]');
  }

  return {
    scripts: finalizeScripts(scripts),
    steps,
    assertions
  };
}

function extractErrorDisplayDetail(body, localConsts, sharedConsts, meta) {
  const specs = extractAssertErrorDisplaySpecs(body, localConsts, sharedConsts);
  if (specs.length) return detailFromAssertErrorDisplay(specs[0], meta);
  if (/buildErrorPresentation\(/.test(body)) {
    return extractBuildErrorPresentationDetail(body, localConsts, sharedConsts, meta);
  }
  return null;
}

function extractTestDetail(runFn, sharedConsts, suiteSource, meta) {
  if (typeof runFn !== 'function') {
    return { scripts: [], steps: [], assertions: [] };
  }
  let body = functionBody(runFn.toString());
  const localConsts = extractLocalConsts(body, sharedConsts);
  const errorDisplay = extractErrorDisplayDetail(body, localConsts, sharedConsts, meta || {});

  if (errorDisplay) {
    return errorDisplay;
  }

  body = resolveDelegateBody(body, suiteSource);
  const scripts = extractScripts(body, sharedConsts);
  const steps = extractSteps(body, sharedConsts, scripts);
  return {
    scripts,
    steps,
    assertions: extractAssertions(body)
  };
}

module.exports = {
  loadSharedConstMap,
  extractTestDetail,
  resolveExpr,
  extractConstExprs,
  resolveConstMap
};
