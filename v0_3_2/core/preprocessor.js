/* ================= SHORT NOTATION PREPROCESSOR ================= */

/**
 * Expand backtick-delimited short notation into standard function calls.
 * `& (a | b)` → AND(OR(a,b))
 *
 * Operator map:
 *   &  → AND    |  → OR     ^  → XOR    =  → EQ
 *   -& → NAND   -| → NOR    -^ → NXOR   !  → NOT (native prefix)
 *   +  → concatenation (multi-bit), lower precedence than boolean ops
 *
 * Literals: binary works directly (1010), hex needs [^FF], decimal needs [\31].
 * Parentheses () group sub-expressions. Evaluation is left-to-right, no precedence.
 */

const SHORT_OP_MAP = {
  '&': 'AND', '|': 'OR', '^': 'XOR', '=': 'EQ',
  '-&': 'NAND', '-|': 'NOR', '-^': 'NXOR'
};

function preprocessShortNotation(source) {
  let result = '';
  let i = 0;

  while (i < source.length) {
    if (source[i] === '#' && (i + 1 >= source.length || source[i + 1] !== '>')) {
      while (i < source.length && source[i] !== '\n') { result += source[i]; i++; }
      continue;
    }
    if (source[i] === '#' && i + 1 < source.length && source[i + 1] === '>') {
      result += '#>';
      i += 2;
      while (i < source.length) {
        if (source[i] === '#' && i + 1 < source.length && source[i + 1] === '<') {
          result += '#<';
          i += 2;
          break;
        }
        result += source[i];
        i++;
      }
      continue;
    }

    if (source[i] === '`') {
      i++;
      let end = source.indexOf('`', i);
      if (end === -1) throw Error(`Unmatched backtick at position ${i - 1}`);
      result += expandShortNotation(source.slice(i, end));
      i = end + 1;
      continue;
    }

    result += source[i];
    i++;
  }

  return result;
}

function tokenizeShort(content) {
  const tokens = [];
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

    if (ch === '-' && i + 1 < content.length && '&|^'.includes(content[i + 1])) {
      tokens.push({ type: 'OP', value: ch + content[i + 1] });
      i += 2;
      continue;
    }

    if (ch === '+') { tokens.push({ type: 'CONCAT' }); i++; continue; }

    if ('&|^='.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    if (ch === '!') { tokens.push({ type: 'NOT', value: '!' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }

    if (ch === '[') {
      i++;
      let lit = '';
      while (i < content.length && content[i] !== ']') { lit += content[i]; i++; }
      if (i >= content.length) throw Error(`Unmatched '[' in short notation`);
      i++;
      tokens.push({ type: 'OPERAND', value: lit });
      continue;
    }

    if (/[a-zA-Z0-9~%$_?]/.test(ch) || ch === '\\') {
      let op = '';
      while (i < content.length) {
        const c = content[i];
        if (/[a-zA-Z0-9._\/?~%$;:]/.test(c) || c === '\\') {
          op += c; i++;
        } else if (c === '-' && i + 1 < content.length && '&|^'.includes(content[i + 1])) {
          break;
        } else if (c === '-') {
          op += c; i++;
        } else {
          break;
        }
      }
      tokens.push({ type: 'OPERAND', value: op });
      continue;
    }

    throw Error(`Unexpected character '${ch}' in short notation`);
  }

  return tokens;
}

function expandShortNotation(content) {
  const tokens = tokenizeShort(content);
  if (tokens.length === 0) return '';

  let pos = 0;
  function peek() { return pos < tokens.length ? tokens[pos] : null; }
  function consume() { return tokens[pos++]; }

  function shortExpr() {
    let left = shortUnary();
    while (peek() && peek().type === 'OP') {
      const op = consume();
      const right = shortUnary();
      left = SHORT_OP_MAP[op.value] + '(' + left + ',' + right + ')';
    }
    return left;
  }

  function shortUnary() {
    if (peek() && peek().type === 'OP') {
      const op = consume();
      const operand = shortAtom();
      return SHORT_OP_MAP[op.value] + '(' + operand + ')';
    }
    return shortAtom();
  }

  function shortAtom() {
    const t = peek();
    if (!t) throw Error('Expected operand in short notation, got end of expression');

    if (t.type === 'NOT') {
      consume();
      return '!' + shortAtom();
    }

    if (t.type === 'LPAREN') {
      consume();
      const inner = shortConcat();
      if (!peek() || peek().type !== 'RPAREN') throw Error(`Expected ')' in short notation`);
      consume();
      return inner;
    }

    if (t.type === 'OPERAND') {
      return consume().value;
    }

    throw Error(`Unexpected token '${t.value || t.type}' in short notation`);
  }

  function shortConcat() {
    const parts = [shortExpr()];
    while (peek() && peek().type === 'CONCAT') {
      consume();
      parts.push(shortExpr());
    }
    if (parts.length === 1) return parts[0];
    return parts.join(' + ');
  }

  const result = shortConcat();
  if (pos < tokens.length) throw Error(`Unexpected token '${tokens[pos].value || tokens[pos].type}' after short notation expression`);
  return result;
}


/* ================= LOOP PREPROCESSOR ================= */

/**
 * Preprocess `loop N..M[ body ]` blocks in source text.
 * Operates on raw text before tokenization.
 * Supports nested loops. Placeholders:
 *   ?N  = value of loop level N (0 = outermost)
 *   ?   = sequential counter starting from 1 (triggers all levels)
 * Lines whose referenced levels haven't changed are deduplicated.
 * Max total iterations per nesting group: 256.
 */
function preprocessLoop(source) {
  source = preprocessShortNotation(source);
  const tree = parseLoopTree(source, 0);
  return expandTree(tree, [], {});
}

/* ---------- Parse ---------- */

function parseLoopTree(source, depth) {
  const nodes = [];
  let i = 0;

  while (i < source.length) {
    const loopIdx = findLoopKeyword(source, i);
    if (loopIdx === -1) {
      nodes.push({ type: 'text', content: source.slice(i) });
      break;
    }

    if (loopIdx > i) {
      nodes.push({ type: 'text', content: source.slice(i, loopIdx) });
    }

    // Parse header: loop N..M[
    let j = loopIdx + 'loop'.length;

    while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;

    let startStr = '';
    while (j < source.length && /[0-9]/.test(source[j])) { startStr += source[j]; j++; }
    if (startStr === '') throw Error(`loop: expected start number at position ${j}`);

    if (source[j] !== '.' || source[j + 1] !== '.')
      throw Error(`loop: expected '..' at position ${j}`);
    j += 2;

    let endStr = '';
    while (j < source.length && /[0-9]/.test(source[j])) { endStr += source[j]; j++; }
    if (endStr === '') throw Error(`loop: expected end number at position ${j}`);

    while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;

    if (source[j] !== '[') throw Error(`loop: expected '[' at position ${j}`);
    j++;

    let bracketDepth = 1;
    let bodyStart = j;
    while (j < source.length && bracketDepth > 0) {
      if (source[j] === '[') bracketDepth++;
      else if (source[j] === ']') bracketDepth--;
      if (bracketDepth > 0) j++;
    }
    if (bracketDepth !== 0) throw Error(`loop: unmatched '[' starting at position ${bodyStart - 1}`);

    const body = source.slice(bodyStart, j);
    j++;

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (end < start) throw Error(`loop: end (${end}) must be >= start (${start})`);

    const children = parseLoopTree(body, depth + 1);

    nodes.push({ type: 'loop', start, end, level: depth, children });

    i = j;
  }

  return nodes;
}

/**
 * Find the index of the next `loop N..M[` directive that is NOT inside a comment.
 * Returns -1 if not found.
 */
function findLoopKeyword(source, from) {
  let i = from;
  while (i < source.length) {
    if (source[i] === '#' && source[i + 1] !== '>') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (source[i] === '#' && source[i + 1] === '>') {
      i += 2;
      while (i < source.length) {
        if (source[i] === '#' && source[i + 1] === '<') { i += 2; break; }
        i++;
      }
      continue;
    }
    if (source.startsWith('loop', i)) {
      const after = i + 'loop'.length;
      if (i === 0 || /[\s]/.test(source[i - 1])) {
        if (after < source.length && (source[after] === ' ' || source[after] === '\t')) {
          let j = after;
          while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;
          let startStr = '';
          while (j < source.length && /[0-9]/.test(source[j])) { startStr += source[j]; j++; }
          if (startStr && source[j] === '.' && source[j + 1] === '.') {
            return i;
          }
        }
      }
    }
    i++;
  }
  return -1;
}

/* ---------- Expand ---------- */

function assignLevelsAndValidate(nodes, baseLevel) {
  let maxLevel = baseLevel;
  for (const node of nodes) {
    if (node.type === 'loop') {
      node.level = baseLevel;
      const childMax = assignLevelsAndValidate(node.children, baseLevel + 1);
      if (childMax > maxLevel) maxLevel = childMax;
    }
  }
  return maxLevel;
}

function computeTotalIterations(node) {
  const count = node.end - node.start + 1;
  let childProduct = 1;
  for (const child of node.children) {
    if (child.type === 'loop') {
      childProduct *= computeTotalIterations(child);
    }
  }
  return count * childProduct;
}

function expandTree(nodes, levelValues, seenMap) {
  let result = '';
  for (const node of nodes) {
    if (node.type === 'loop') {
      assignLevelsAndValidate([node], levelValues.length);
      const total = computeTotalIterations(node);
      if (total > 256) {
        throw Error(`number of iterations in nested loops passed the maximum of 256 (got ${total})`);
      }
    }
  }

  for (const node of nodes) {
    if (node.type === 'text') {
      result += expandTextNode(node.content, levelValues, seenMap);
    } else if (node.type === 'loop') {
      result += expandLoopNode(node, levelValues, seenMap);
    }
  }
  return result;
}

function expandLoopNode(node, levelValues, seenMap) {
  let result = '';
  for (let val = node.start; val <= node.end; val++) {
    const newLevels = levelValues.slice();
    newLevels[node.level] = val;

    for (const child of node.children) {
      if (child.type === 'text') {
        result += expandTextNode(child.content, newLevels, seenMap);
      } else if (child.type === 'loop') {
        result += expandLoopNode(child, newLevels, seenMap);
      }
    }
  }
  return result;
}

/**
 * Find which ?N references exist in text. Returns { levels: Set<int>, hasBare: bool }.
 */
function findRefs(text) {
  const levels = new Set();
  let hasBare = true;
  const re = /\?(\d*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] === '') {
      hasBare = true;
    } else {
      levels.add(parseInt(m[1], 10));
    }
  }
  return { levels, hasBare };
}

function expandTextNode(content, levelValues, seenMap) {
  if (levelValues.length === 0) return content;

  const lines = content.split('\n');
  let result = '';

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const refs = findRefs(line);

    if (!refs.hasBare && refs.levels.size === 0) {
      const dedupKey = 'raw:' + line;
      if (!seenMap[dedupKey]) {
        seenMap[dedupKey] = true;
        result += line;
        if (li < lines.length - 1) result += '\n';
      }
      continue;
    }

    let effectiveLevels;
    if (refs.hasBare) {
      effectiveLevels = [];
      for (let l = 0; l < levelValues.length; l++) effectiveLevels.push(l);
    } else {
      effectiveLevels = Array.from(refs.levels).sort((a, b) => a - b);
    }

    const keyParts = effectiveLevels.map(l => levelValues[l] !== undefined ? levelValues[l] : '?');
    const dedupKey = 'ref:' + line + ':' + keyParts.join(',');

    if (seenMap[dedupKey]) {
      continue;
    }
    seenMap[dedupKey] = true;

    let expanded = line;

    const sortedLevels = Array.from(refs.levels).sort((a, b) => b - a);
    for (const lvl of sortedLevels) {
      const val = levelValues[lvl] !== undefined ? levelValues[lvl] : 0;
      expanded = expanded.split('?' + lvl).join(String(val));
    }

    if (refs.hasBare) {
      const seqKey = 'seq:' + line;
      if (!seenMap[seqKey]) seenMap[seqKey] = 1;
      expanded = expanded.split('?').join(String(seenMap[seqKey]));
      seenMap[seqKey]++;
    }

    result += expanded;
    if (li < lines.length - 1) result += '\n';
  }

  return result;
}
