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
  [/^no user function defined `(\w+)`/, 1],
  [/^Error (\w+) already used as bool tag for user function/, 1],
  [/^Error (\w+) already used as int tag for user function/, 1],
  [/^Duplicate tag signature for user function/, 0],
  [/^Parameter list mismatch for user function/, 0],
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
  [/^Invalid statement starting with '([^']+)'/, 1],
  [/^Unexpected char '([^']*)'/, 1],
  [/^Invalid numeric token '([^']*)'/, 1],
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
  if (/^Expected \d+ bits, got/.test(message)) return false;
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

function extractQuotedToken(message) {
  if (!message) return null;
  const m = message.match(/'([^']*)'/);
  return m ? m[1] : null;
}

/** Tokenizer col is often past the last char (end-exclusive). Snap to token span on line. */
function findTokenSpanOnLine(lineText, tokenText, reportedCol) {
  if (!lineText || !tokenText) return null;
  const len = tokenText.length;
  const candidates = [];
  let idx = 0;
  while (idx < lineText.length) {
    const found = lineText.indexOf(tokenText, idx);
    if (found < 0) break;
    const before = found > 0 ? lineText[found - 1] : '';
    const after = found + len < lineText.length ? lineText[found + len] : '';
    if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) {
      const startCol = found + 1;
      candidates.push({ col: startCol, len });
    }
    idx = found + 1;
  }
  if (!candidates.length) return null;

  const endMatch = candidates.find((c) => reportedCol === c.col + c.len);
  if (endMatch) return endMatch;

  const insideMatch = candidates.find((c) => reportedCol >= c.col && reportedCol < c.col + c.len);
  if (insideMatch) return insideMatch;

  const startMatch = candidates.find((c) => reportedCol === c.col);
  if (startMatch) return startMatch;

  candidates.sort((a, b) => {
    const da = Math.min(
      Math.abs(reportedCol - a.col),
      Math.abs(reportedCol - (a.col + a.len)),
      Math.abs(reportedCol - (a.col + a.len - 1))
    );
    const db = Math.min(
      Math.abs(reportedCol - b.col),
      Math.abs(reportedCol - (b.col + b.len)),
      Math.abs(reportedCol - (b.col + b.len - 1))
    );
    return da - db;
  });
  return candidates[0];
}

function snapColToNearbyToken(lineText, reportedCol) {
  if (!lineText || reportedCol == null) return { col: reportedCol, len: 1 };
  const idx = reportedCol - 1;
  if (idx >= lineText.length || (idx >= 0 && /\s/.test(lineText[idx]))) {
    const prev = findPrevTokenRangeInLine(lineText, reportedCol);
    if (prev) return { col: prev.from + 1, len: prev.to - prev.from };
    return { col: reportedCol, len: 1 };
  }
  let start = idx;
  while (start > 0 && /\S/.test(lineText[start - 1])) start--;
  const m = lineText.slice(start).match(/^\S+/);
  const len = m ? m[0].length : 1;
  return { col: start + 1, len };
}

function snapCaretToToken(message, sourceLine, reportedCol, spanLen) {
  if (!sourceLine || reportedCol == null) {
    return { col: reportedCol, spanLen: spanLen || 1 };
  }

  const quoted = extractQuotedToken(message);
  if (quoted) {
    const snapped = findTokenSpanOnLine(sourceLine, quoted, reportedCol);
    if (snapped) return { col: snapped.col, spanLen: snapped.len };
  }

  const anchor = parseErrorAnchor(message);
  if (anchor) {
    const snapped = findTokenSpanOnLine(sourceLine, anchor.name, reportedCol);
    if (snapped) return { col: snapped.col, spanLen: snapped.len };
  }

  const got = message && message.match(/got \w+=(\S+)/);
  if (got) {
    const snapped = findTokenSpanOnLine(sourceLine, got[1], reportedCol);
    if (snapped) return { col: snapped.col, spanLen: snapped.len };
  }

  const nearby = snapColToNearbyToken(sourceLine, reportedCol);
  if (spanLen != null && spanLen > 1) {
    const snapped = findTokenSpanOnLine(
      sourceLine,
      sourceLine.slice(nearby.col - 1, nearby.col - 1 + spanLen),
      reportedCol
    );
    if (snapped) return { col: snapped.col, spanLen: snapped.len };
  }
  return { col: nearby.col, spanLen: nearby.len };
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

function parseBitMismatchGot(message) {
  if (!message) return null;
  const m = message.match(/^Expected \d+ bits, got (\d+) bits?\.$/);
  return m ? parseInt(m[1], 10) : null;
}

function findBinaryLiteralAtLength(source, bitLen, hintLine) {
  if (!source || !bitLen || bitLen < 1) return null;
  const lines = source.split('\n');
  const searchOne = (li) => {
    const line = lines[li];
    if (!line) return null;
    const re = new RegExp(`[01]{${bitLen}}`, 'g');
    let m;
    while ((m = re.exec(line)) !== null) {
      const before = m.index > 0 ? line[m.index - 1] : '';
      const after = m.index + bitLen < line.length ? line[m.index + bitLen] : '';
      if (!/[01]/.test(before) && !/[01]/.test(after)) {
        return {
          line: li + 1,
          col: m.index + 1,
          sourceLine: line,
          len: bitLen
        };
      }
    }
    return null;
  };
  if (hintLine != null && hintLine >= 1 && hintLine <= lines.length) {
    const onHint = searchOne(hintLine - 1);
    if (onHint) return onHint;
  }
  for (let li = lines.length - 1; li >= 0; li--) {
    const found = searchOne(li);
    if (found) return found;
  }
  return null;
}

function findAssignRhsSpan(lineText) {
  if (!lineText) return null;
  const eq = lineText.indexOf('=');
  if (eq < 0) return null;
  let start = eq + 1;
  while (start < lineText.length && /\s/.test(lineText[start])) start++;
  let end = lineText.length;
  while (end > start && /\s/.test(lineText[end - 1])) end--;
  if (end <= start) return null;
  return { col: start + 1, len: end - start };
}

function isWireDeclAssignLine(lineText) {
  return /\d+\s*wire\b/i.test(lineText) && lineText.includes('=');
}

function findWireAssignNearLine(source, hintLine) {
  if (!source || hintLine == null) return null;
  const lines = source.split('\n');
  const tryLine = (li) => {
    if (li < 1 || li > lines.length) return null;
    const sourceLine = lines[li - 1];
    if (!isWireDeclAssignLine(sourceLine)) return null;
    const span = findAssignRhsSpan(sourceLine);
    if (!span) return null;
    return { line: li, sourceLine, col: span.col, len: span.len };
  };
  if (hintLine >= 1 && hintLine <= lines.length && !isWireDeclAssignLine(lines[hintLine - 1])) {
    for (let li = hintLine - 1; li >= 1; li--) {
      const hit = tryLine(li);
      if (hit) return hit;
    }
    for (let li = hintLine + 1; li <= lines.length; li++) {
      const hit = tryLine(li);
      if (hit) return hit;
    }
    return null;
  }
  for (let d = 0; d < lines.length; d++) {
    const candidates = d === 0 ? [hintLine] : [hintLine - d, hintLine + d];
    for (const li of candidates) {
      const hit = tryLine(li);
      if (hit) return hit;
    }
  }
  return null;
}

function lineNumberForText(source, lineText, preferredLine) {
  if (!source || lineText == null) return preferredLine;
  const lines = source.split('\n');
  const norm = (s) => String(s).trimEnd();
  const want = norm(lineText);
  if (preferredLine >= 1 && preferredLine <= lines.length && norm(lines[preferredLine - 1]) === want) {
    return preferredLine;
  }
  for (let i = 0; i < lines.length; i++) {
    if (norm(lines[i]) === want) return i + 1;
  }
  return preferredLine;
}

function alignErrorDisplayToSource(display, targetSource, runSource) {
  if (!display || !targetSource || !display.sourceLine || !display.loc) return display;
  const line = lineNumberForText(targetSource, display.sourceLine, display.loc.line);
  const lines = targetSource.split('\n');
  const sourceLine = lines[line - 1] != null ? lines[line - 1] : display.sourceLine;
  let caretLine = display.caretLine;
  if (display.loc.col != null && display.spanLen != null) {
    caretLine = buildCaretLine(display.loc.col, display.spanLen);
  }
  return {
    ...display,
    loc: { line, col: display.loc.col },
    sourceLine,
    caretLine
  };
}

function refineLocFromAnchor(message, processedSource, loc, scriptLocLen) {
  const gotBits = parseBitMismatchGot(message);
  if (gotBits && processedSource) {
    const hintLine = loc ? loc.line : null;
    const wireAssign = findWireAssignNearLine(processedSource, hintLine);
    if (wireAssign) {
      return {
        loc: { line: wireAssign.line, col: wireAssign.col },
        scriptLocLen: wireAssign.len
      };
    }
    const lit = findBinaryLiteralAtLength(processedSource, gotBits, hintLine);
    if (lit) {
      return {
        loc: { line: lit.line, col: lit.col },
        scriptLocLen: lit.len
      };
    }
  }

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
  const bitMismatchGot = parseBitMismatchGot(message);
  if (bitMismatchGot != null && scriptLocLen === bitMismatchGot) {
    scriptLocLen = null;
  }

  if (!loc && context && context.stmtLine) {
    loc = { line: context.stmtLine, col: context.stmtCol || 1 };
    scriptLocLen = context.spanLen || 1;
  }

  if (processedSource) {
    const refined = refineLocFromAnchor(message, processedSource, loc, scriptLocLen);
    loc = refined.loc || loc;
    if (refined.scriptLocLen != null) scriptLocLen = refined.scriptLocLen;
  }

  const bitMismatchRhs = bitMismatchGot != null && scriptLocLen != null && loc != null;

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

  if (!loc || processedSource == null || processedSource === '') {
    return { message, loc: null, sourceLine: null, caretLine: null, spanLen: 1, isMissing: false };
  }

  const { sourceLine } = formatErrorSnippet(processedSource, loc.line, loc.col, null);
  let spanLen = scriptLocLen != null
    ? Math.max(1, scriptLocLen)
    : inferSpanLength(message, sourceLine, loc.col);
  let caretCol = loc.col;
  if (!bitMismatchRhs) {
    const snapped = snapCaretToToken(message, sourceLine, loc.col, spanLen);
    caretCol = snapped.col;
    spanLen = snapped.spanLen;
  }
  if (loc) loc = { line: loc.line, col: caretCol };
  const caretLine = buildCaretLine(caretCol, spanLen);
  const isMissing = isMissingTokenError(message, sourceLine, caretCol);
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
  parseBitMismatchGot,
  findBinaryLiteralAtLength,
  findWireAssignNearLine,
  findAssignRhsSpan,
  lineNumberForText,
  alignErrorDisplayToSource,
  parseUndefinedSymbol,
  parseFunctionNameFromError,
  findSymbolInSource,
  snapCaretToToken,
  findTokenSpanOnLine,
  scriptError,
  resolveErrorDisplay
};
