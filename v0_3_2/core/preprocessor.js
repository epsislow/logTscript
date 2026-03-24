/* ================= REPEAT PREPROCESSOR ================= */

/**
 * Preprocess `repeat N..M[ body ]` blocks in source text.
 * Operates on raw text before tokenization.
 * Supports nested repeats. Placeholders:
 *   ?N  = value of repeat level N (0 = outermost)
 *   ?   = sequential counter starting from 1 (triggers all levels)
 * Lines whose referenced levels haven't changed are deduplicated.
 * Max total iterations per nesting group: 256.
 */
function preprocessRepeat(source) {
  const tree = parseRepeatTree(source, 0);
  return expandTree(tree, [], {});
}

/* ---------- Parse ---------- */

function parseRepeatTree(source, depth) {
  const nodes = [];
  let i = 0;

  while (i < source.length) {
    // Skip inside comments
    const repeatIdx = findRepeatKeyword(source, i);
    if (repeatIdx === -1) {
      // No more repeats - rest is plain text
      nodes.push({ type: 'text', content: source.slice(i) });
      break;
    }

    // Text before this repeat
    if (repeatIdx > i) {
      nodes.push({ type: 'text', content: source.slice(i, repeatIdx) });
    }

    // Parse header: repeat N..M[
    let j = repeatIdx + 'repeat'.length;

    // skip whitespace (not newline)
    while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;

    // parse start number
    let startStr = '';
    while (j < source.length && /[0-9]/.test(source[j])) { startStr += source[j]; j++; }
    if (startStr === '') throw Error(`repeat: expected start number at position ${j}`);

    // expect ..
    if (source[j] !== '.' || source[j + 1] !== '.')
      throw Error(`repeat: expected '..' at position ${j}`);
    j += 2;

    // parse end number
    let endStr = '';
    while (j < source.length && /[0-9]/.test(source[j])) { endStr += source[j]; j++; }
    if (endStr === '') throw Error(`repeat: expected end number at position ${j}`);

    // skip whitespace
    while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;

    // expect [
    if (source[j] !== '[') throw Error(`repeat: expected '[' at position ${j}`);
    j++; // skip [

    // Find matching ]
    let bracketDepth = 1;
    let bodyStart = j;
    while (j < source.length && bracketDepth > 0) {
      if (source[j] === '[') bracketDepth++;
      else if (source[j] === ']') bracketDepth--;
      if (bracketDepth > 0) j++;
    }
    if (bracketDepth !== 0) throw Error(`repeat: unmatched '[' starting at position ${bodyStart - 1}`);

    const body = source.slice(bodyStart, j);
    j++; // skip ]

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (end < start) throw Error(`repeat: end (${end}) must be >= start (${start})`);

    // Recursively parse body
    const children = parseRepeatTree(body, depth + 1);

    nodes.push({ type: 'repeat', start, end, level: depth, children });

    i = j;
  }

  return nodes;
}

/**
 * Find the index of the next `repeat` keyword that is NOT inside a comment.
 * Returns -1 if not found.
 */
function findRepeatKeyword(source, from) {
  let i = from;
  while (i < source.length) {
    // Line comment: skip to end of line
    if (source[i] === '#' && source[i + 1] !== '<') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    // Block comment #< ... #>
    if (source[i] === '#' && source[i + 1] === '<') {
      i += 2;
      while (i < source.length) {
        if (source[i] === '#' && source[i + 1] === '>') { i += 2; break; }
        i++;
      }
      continue;
    }
    // Check for `repeat` keyword followed by whitespace
    if (source.startsWith('repeat', i)) {
      const after = i + 'repeat'.length;
      // Must be preceded by start-of-string, newline, or whitespace
      if (i === 0 || /[\s]/.test(source[i - 1])) {
        // Must be followed by whitespace
        if (after < source.length && (source[after] === ' ' || source[after] === '\t')) {
          return i;
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
    if (node.type === 'repeat') {
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
    if (child.type === 'repeat') {
      childProduct *= computeTotalIterations(child);
    }
  }
  return count * childProduct;
}

function expandTree(nodes, levelValues, seenMap) {
  let result = '';
  // First pass: assign levels and validate for each top-level repeat
  for (const node of nodes) {
    if (node.type === 'repeat') {
      assignLevelsAndValidate([node], levelValues.length);
      const total = computeTotalIterations(node);
      if (total > 256) {
        throw Error(`number of iterations in nested repeats passed the maximum of 256 (got ${total})`);
      }
    }
  }

  // Second pass: expand
  for (const node of nodes) {
    if (node.type === 'text') {
      result += expandTextNode(node.content, levelValues, seenMap);
    } else if (node.type === 'repeat') {
      result += expandRepeatNode(node, levelValues, seenMap);
    }
  }
  return result;
}

function expandRepeatNode(node, levelValues, seenMap) {
  let result = '';
  for (let val = node.start; val <= node.end; val++) {
    // Build level values array for this iteration
    const newLevels = levelValues.slice();
    newLevels[node.level] = val;

    for (const child of node.children) {
      if (child.type === 'text') {
        result += expandTextNode(child.content, newLevels, seenMap);
      } else if (child.type === 'repeat') {
        result += expandRepeatNode(child, newLevels, seenMap);
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
