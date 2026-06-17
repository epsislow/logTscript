/* ================= ERROR LOCATION FORMATTING ================= */

const LOC_RE = /(?:at\s+)?(?:\S*:\s*)?(\d+):(\d+)/g;

const ERROR_ANCHOR_RULES = [
  [/^Undefined (\w+)$/, 1],
  [/^Undefined variable\/wire (\S+)$/, 1],
  [/^Undefined reference (\S+)$/, 1],
  [/^Undefined variable '([^']+)'/, 1],
  [/^Undefined inline instance '([^']+)'/, 1],
  [/^Function (\w+) is not local/, 1],
  [/^Bad arity for (\w+)$/, 1],
  [/^Unknown alias (\w+)$/, 1],
  [/^Unknown component (\S+) in invocation/, 1],
  [/^Component '([^']+)' already belongs/, 1],
  [/^Component (\S+) does not support/, 1],
  [/^Component (\S+) has no readable/, 1],
  [/^Component (\S+) has return type/, 1],
  [/^Cannot reassign wire (\S+)/, 1],
  [/^Cannot reassign immutable variable (\S+)/, 1],
  [/^Error testing (\S+)/, 1],
  [/^(\w+) expects \d+ arguments?$/, 1],
  [/^(\w+) expects at least \d+ arguments/, 1],
  [/^(\w+) expects 2 or 3 arguments/, 1],
  [/^Unknown property '([^']+)'/, 1],
  [/^Unknown component type: (\S+)$/, 1],
  [/^Invalid type (\S+)/, 1],
  [/^Immutable (\S+)$/, 1],
  [/^Bit-width mismatch: (\S+)/, 1],
  [/^Wire (\S+) already declared/, 1],
  [/^Wire (\S+) already assigned/, 1],
  [/^PCB '([^']+)' is not defined/, 1],
  [/^Chip '([^']+)' is not defined/, 1],
  [/^Board '([^']+)' is not defined/, 1],
  [/^LUT invocation ([^\s(]+)/, 1],
  [/^Invalid bit range .+ for ([^\s:(]+)/, 1],
  [/^Property (\S+) cannot be used/, 1],
  [/^Unknown component (\S+)$/, 1],
  [/^Wire (\S+) not found/, 1],
];

function parseErrorLocation(message) {
  if (!message) return null;
  let match;
  let last = null;
  const re = new RegExp(LOC_RE.source, 'g');
  while ((match = re.exec(message)) !== null) {
    last = { line: parseInt(match[1], 10), col: parseInt(match[2], 10) };
  }
  return last;
}

function parseErrorAnchor(message) {
  if (!message) return null;
  for (const [re, group] of ERROR_ANCHOR_RULES) {
    const m = message.match(re);
    if (m && m[group]) {
      const name = m[group].replace(/^'|'$/g, '');
      if (name) return { name, len: name.length };
    }
  }
  return null;
}

function parseUndefinedSymbol(message) {
  return parseErrorAnchor(message);
}

function parseFunctionNameFromError(message) {
  if (!message) return null;
  const m = message.match(/^Function (\w+) is not local/);
  return m ? m[1] : null;
}

function buildCaretLine(col, spanLen) {
  const span = Math.max(1, spanLen || 1);
  return ' '.repeat(Math.max(0, col - 1)) + '^'.repeat(span);
}

function tokenAtCol(lineText, col) {
  const idx = col - 1;
  if (!lineText || idx < 0 || idx >= lineText.length) {
    return { span: 1, isMissing: true };
  }
  const ch = lineText[idx];
  if (/\s/.test(ch)) return { span: 1, isMissing: true };
  const m = lineText.slice(idx).match(/^\S+/);
  return { span: m ? m[0].length : 1, isMissing: false };
}

function inferSpanLength(message, lineText, col) {
  if (!message) return 1;
  const anchor = parseErrorAnchor(message);
  if (anchor) return anchor.len;
  const got = message.match(/got \w+=(\S+)/);
  if (got) return got[1].length;
  const quoted = message.match(/'([^']*)'/);
  if (quoted && quoted[1].length > 0) return quoted[1].length;
  if (lineText != null && col != null) {
    return tokenAtCol(lineText, col).span;
  }
  return 1;
}

function isMissingTokenError(message, lineText, col) {
  if (!message) return false;
  if (/expected\b/i.test(message) && (/got\s+EOF\b/i.test(message) || !/got\s+\w+=/.test(message))) {
    return true;
  }
  if (lineText != null && col != null) {
    return tokenAtCol(lineText, col).isMissing;
  }
  return false;
}

function formatErrorSnippet(source, line, col, spanLen) {
  const lines = (source || '').split('\n');
  const sourceLine = lines[line - 1] ?? '';
  const span = spanLen != null ? spanLen : inferSpanLength('', sourceLine, col);
  const caretLine = buildCaretLine(col, span);
  return { sourceLine, caretLine, spanLen: span };
}

function splitEmbeddedErrorMessage(message) {
  if (!message) return { message: '', embedded: null };
  const nl = message.indexOf('\n');
  if (nl < 0) return { message, embedded: null };
  const firstLine = message.slice(0, nl);
  const rest = message.slice(nl + 1).split('\n');
  if (rest.length >= 2 && /^\s*\^+$/.test(rest[1])) {
    return {
      message: firstLine,
      embedded: { sourceLine: rest[0], caretLine: rest[1] }
    };
  }
  return { message: firstLine, embedded: null };
}

function findPrevTokenRangeInLine(lineText, col) {
  if (!lineText) return null;
  let end = col - 2;
  while (end >= 0 && /\s/.test(lineText[end])) end--;
  if (end < 0) return null;
  let start = end;
  while (start >= 0 && /\S/.test(lineText[start])) start--;
  return { from: start + 1, to: end + 1 };
}

function findSymbolOnLine(line, name) {
  let last = null;
  let idx = 0;
  while (idx < line.length) {
    const found = line.indexOf(name, idx);
    if (found < 0) break;
    const before = found > 0 ? line[found - 1] : '';
    const after = found + name.length < line.length ? line[found + name.length] : '';
    if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) {
      last = { col: found + 1, len: name.length };
    }
    idx = found + 1;
  }
  return last;
}

function findSymbolInSource(source, name, hintLine) {
  if (!source || !name) return null;
  const lines = source.split('\n');
  if (hintLine != null && hintLine >= 1 && hintLine <= lines.length) {
    const onLine = findSymbolOnLine(lines[hintLine - 1], name);
    if (onLine) {
      return {
        line: hintLine,
        col: onLine.col,
        sourceLine: lines[hintLine - 1],
        len: onLine.len
      };
    }
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const onLine = findSymbolOnLine(lines[i], name);
    if (onLine) {
      return {
        line: i + 1,
        col: onLine.col,
        sourceLine: lines[i],
        len: onLine.len
      };
    }
  }
  return null;
}

function scriptError(message, line, col, len) {
  const e = new Error(message);
  if (line != null && col != null) {
    e.scriptLoc = { line, col, len: len != null ? len : 1 };
  }
  return e;
}

function refineLocFromAnchor(message, processedSource, loc, scriptLocLen) {
  const anchor = parseErrorAnchor(message);
  if (!anchor || !processedSource) return { loc, scriptLocLen };

  const hintLine = loc ? loc.line : null;
  const found = findSymbolInSource(processedSource, anchor.name, hintLine);
  if (!found) return { loc, scriptLocLen };

  return {
    loc: { line: found.line, col: found.col },
    scriptLocLen: found.len
  };
}

function resolveErrorDisplay(err, processedSource, context) {
  const rawMsg = (err && err.message) ? err.message : String(err);
  const { message, embedded } = splitEmbeddedErrorMessage(rawMsg);
  let loc = (err && err.scriptLoc)
    ? { line: err.scriptLoc.line, col: err.scriptLoc.col }
    : parseErrorLocation(message);
  let scriptLocLen = (err && err.scriptLoc && err.scriptLoc.len != null) ? err.scriptLoc.len : null;

  if (!loc && context && context.stmtLine) {
    loc = { line: context.stmtLine, col: context.stmtCol || 1 };
    scriptLocLen = context.spanLen || 1;
  }

  if (processedSource) {
    const refined = refineLocFromAnchor(message, processedSource, loc, scriptLocLen);
    loc = refined.loc || loc;
    if (refined.scriptLocLen != null) scriptLocLen = refined.scriptLocLen;
  }

  if (embedded) {
    const spanLen = (embedded.caretLine.match(/\^/g) || []).length || 1;
    return {
      message,
      loc,
      sourceLine: embedded.sourceLine,
      caretLine: embedded.caretLine,
      spanLen,
      isMissing: false
    };
  }

  if (!loc || !processedSource) {
    return { message, loc: null, sourceLine: null, caretLine: null, spanLen: 1, isMissing: false };
  }

  const { sourceLine } = formatErrorSnippet(processedSource, loc.line, loc.col, null);
  const spanLen = scriptLocLen != null
    ? Math.max(1, scriptLocLen)
    : inferSpanLength(message, sourceLine, loc.col);
  const caretLine = buildCaretLine(loc.col, spanLen);
  const isMissing = isMissingTokenError(message, sourceLine, loc.col);
  return { message, loc, sourceLine, caretLine, spanLen, isMissing };
}

window.LogTScriptErrorFormat = {
  parseErrorLocation,
  parseErrorAnchor,
  buildCaretLine,
  inferSpanLength,
  isMissingTokenError,
  formatErrorSnippet,
  splitEmbeddedErrorMessage,
  findPrevTokenRangeInLine,
  parseUndefinedSymbol,
  parseFunctionNameFromError,
  findSymbolInSource,
  scriptError,
  resolveErrorDisplay
};
