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
  'preprocessRepeat',
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

function extractFileConstMap(code) {
  const map = new Map();
  const re = /const\s+([A-Z][A-Z0-9_]*)\s*=\s*`([\s\S]*?)`/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

function loadSharedConstMap(dir, files) {
  const map = new Map();
  for (const f of files) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const [k, v] of extractFileConstMap(code)) map.set(k, v);
  }
  return map;
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
  const delegate = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(h,\s*session[^)]*\);\s*$/);
  if (!delegate || !suiteSource) return body;
  const helperBody = extractNamedFunctionBody(suiteSource, delegate[1]);
  return helperBody || body;
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

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
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
    } else if (depth === 0 && c === ',') {
      return { text: s.slice(exprStart, i).trim(), value: null, end: i };
    }
    i++;
  }

  if (i > exprStart) {
    return { text: s.slice(exprStart, i).trim(), value: null, end: i };
  }
  return null;
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

function extractLocalConsts(body) {
  const map = new Map();
  const declRe = /(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/g;
  let m;
  while ((m = declRe.exec(body)) !== null) {
    const name = m[1];
    const valueStart = m.index + m[0].length;
    const expr = readExpression(body, valueStart);
    if (!expr) continue;
    const resolved = resolveExpr(expr.text, map, new Map());
    if (resolved != null) map.set(name, resolved);
  }
  return map;
}

function resolveExpr(expr, localConsts, sharedConsts) {
  const trimmed = expr.trim();
  if (!trimmed) return null;

  const concat = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\+\s*(.+)$/s);
  if (concat) {
    const base = resolveExpr(concat[1], localConsts, sharedConsts);
    const tail = resolveExpr(concat[2], localConsts, sharedConsts);
    if (base != null && tail != null) return base + tail;
    return null;
  }

  const quoted = readQuotedString(trimmed, 0);
  if (quoted && quoted.end === trimmed.length) {
    return quoted.text;
  }

  if (localConsts.has(trimmed)) return localConsts.get(trimmed);
  if (sharedConsts.has(trimmed)) return sharedConsts.get(trimmed);
  return null;
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

function formatStepCall(callee, argExpr, localConsts, sharedConsts) {
  return formatStepFromCall(callee, [argExpr], localConsts, sharedConsts);
}

function extractScripts(body, sharedConsts) {
  const scripts = [];
  const localConsts = extractLocalConsts(body);

  for (const call of findCalls(body, SCRIPT_CALLEES)) {
    const resolved = resolveExpr(call.argExpr, localConsts, sharedConsts);
    if (resolved != null) pushUnique(scripts, resolved);
  }

  for (const [name, value] of localConsts) {
    const used = new RegExp(
      '(?:session\\.(?:run|runDoc|runArith|tokenize|parse|preprocessShortNotation)|preprocessRepeat)\\(\\s*' +
      name + '\\b'
    );
    if (used.test(body)) pushUnique(scripts, value);
  }

  return scripts;
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

  const expectedRe = /const\s+expectedTypes\s*=\s*\[([\s\S]*?)\]/;
  const em = body.match(expectedRe);
  if (em) {
    const types = em[1].match(/'([^']+)'/g);
    if (types) {
      pushUnique(steps, 'registry.has(' + types.map(t => t.slice(1, -1)).join(', ') + ')');
    }
  }

  const getRe = /registry\.get\(\s*'((?:\\'|[^'])*)'\)(?:\.([a-zA-Z0-9_]+)\([^)]*\))?/g;
  let m;
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
  const localConsts = extractLocalConsts(body);

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
    pushUnique(steps, 'Parser(…)'); // args are usually token streams
  }

  return steps;
}

function extractSteps(body, sharedConsts, scripts) {
  const steps = [];
  const localConsts = extractLocalConsts(body);
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

function extractTestDetail(runFn, sharedConsts, suiteSource) {
  if (typeof runFn !== 'function') {
    return { scripts: [], steps: [], assertions: [] };
  }
  let body = functionBody(runFn.toString());
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
  extractTestDetail
};
