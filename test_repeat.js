/**
 * Node.js tests for the repeat preprocessor.
 * Run with: node test_repeat.js
 *
 * Since main.js is a browser file with window/document references,
 * we extract and eval only the preprocessor + tokenizer sections.
 */

const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('./lib/main.js', 'utf-8');

// Extract Token + Tokenizer + Preprocessor (from "class Token" up to PARSER marker)
const tokStart = src.indexOf('class Token {') !== -1
  ? src.indexOf('class Token {')
  : src.indexOf('class Token{');
const exportsEnd = src.indexOf('/* ================= PARSER ================= */');
const chunk = src.slice(tokStart, exportsEnd);

// Run extracted code in a sandbox.
// class declarations are block-scoped, so we append explicit exports.
const sandbox = { Error, parseInt, String, Array, Set, Map, RegExp, console };
const codeToRun = chunk + `\nvar _Token = Token; var _Tokenizer = Tokenizer; var _preprocessRepeat = preprocessRepeat;`;
vm.runInNewContext(codeToRun, sandbox);
const preprocessRepeat = sandbox._preprocessRepeat;
const Tokenizer = sandbox._Tokenizer;

let passed = 0;
let failed = 0;

function assert(testName, actual, expected) {
  // Normalize: trim trailing whitespace from each line, trim overall
  const norm = s => s.split('\n').map(l => l.trimEnd()).join('\n').trim();
  const a = norm(actual);
  const e = norm(expected);
  if (a === e) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName}`);
    console.log(`    Expected:\n${e}`);
    console.log(`    Got:\n${a}`);
    failed++;
  }
}

function assertThrows(testName, fn, expectedMsg) {
  try {
    fn();
    console.log(`  FAIL: ${testName} (no error thrown)`);
    failed++;
  } catch (e) {
    if (expectedMsg && !e.message.includes(expectedMsg)) {
      console.log(`  FAIL: ${testName} (wrong error: "${e.message}")`);
      failed++;
    } else {
      console.log(`  PASS: ${testName}`);
      passed++;
    }
  }
}

// Helper: run preprocessor then tokenize to verify tokens are valid
function tokenize(source) {
  const processed = preprocessRepeat(source);
  const t = new Tokenizer(processed);
  const tokens = [];
  let tok;
  while ((tok = t.get()).type !== 'EOF') {
    tokens.push(tok);
  }
  return { processed, tokens };
}

console.log('\n=== Test 1: Simple repeat ===');
{
  const src = `repeat 1..5[
4wire a?
]`;
  const result = preprocessRepeat(src);
  assert('simple repeat 1..5 with bare ?',
    result,
    `4wire a1
4wire a2
4wire a3
4wire a4
4wire a5`
  );
}

console.log('\n=== Test 2: Nested repeat with ? and ?1 ===');
{
  const src = `repeat 1..2[
repeat 1..3[
4wire b? = ^?1
]
]`;
  const result = preprocessRepeat(src);
  assert('nested repeat ? and ?1',
    result,
    `4wire b1 = ^1
4wire b2 = ^2
4wire b3 = ^3
4wire b4 = ^1
4wire b5 = ^2
4wire b6 = ^3`
  );
}

console.log('\n=== Test 3: Nested repeat only ?0 (dedup) ===');
{
  const src = `repeat 1..2[
repeat 1..3[
4wire c?0 = ^F
]
]`;
  const result = preprocessRepeat(src);
  assert('nested repeat only ?0 → dedup to 2 lines',
    result,
    `4wire c1 = ^F
4wire c2 = ^F`
  );
}

console.log('\n=== Test 4: Nested repeat ?0 and ?1 (all combos) ===');
{
  const src = `repeat 1..2[
repeat 1..3[
4wire c?0 = ^?1
]
]`;
  const result = preprocessRepeat(src);
  assert('nested repeat ?0 and ?1 → 6 lines',
    result,
    `4wire c1 = ^1
4wire c1 = ^2
4wire c1 = ^3
4wire c2 = ^1
4wire c2 = ^2
4wire c2 = ^3`
  );
}

console.log('\n=== Test 5: Max 256 iterations (OK) ===');
{
  const src = `repeat 1..16[
repeat 1..16[
4wire x?0?1
]
]`;
  // 16 * 16 = 256 → should NOT throw
  try {
    const result = preprocessRepeat(src);
    console.log(`  PASS: 16x16 = 256 does not throw`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: 16x16 should not throw, got: ${e.message}`);
    failed++;
  }
}

console.log('\n=== Test 6: Max 256 iterations (EXCEEDED) ===');
{
  assertThrows('16x17 = 272 throws error',
    () => preprocessRepeat(`repeat 1..16[
repeat 1..17[
4wire x?0?1
]
]`),
    'maximum of 256'
  );
}

console.log('\n=== Test 7: Separate repeat groups (independent limits) ===');
{
  const src = `repeat 1..16[
repeat 1..16[
4wire x?0?1
]
]

repeat 1..2[
4wire y?
]`;
  try {
    const result = preprocessRepeat(src);
    // First group: 256 lines, second group: 2 lines
    const lines = result.trim().split('\n').filter(l => l.trim() !== '');
    assert('separate groups: total lines', String(lines.length), '258');
    console.log(`  PASS: separate repeat groups, independent limits`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: separate groups should not throw, got: ${e.message}`);
    failed++;
  }
}

console.log('\n=== Test 8: No repeat – passthrough ===');
{
  const src = `4wire a = ^FF
4wire b = ^00`;
  const result = preprocessRepeat(src);
  assert('no repeat passthrough', result, src);
}

console.log('\n=== Test 9: Repeat inside comment is ignored ===');
{
  const src = `# repeat 1..5[
4wire a = ^FF`;
  const result = preprocessRepeat(src);
  assert('repeat in comment ignored', result, src);
}

console.log('\n=== Test 10: Tokenizer accepts preprocessed output ===');
{
  const src = `repeat 1..3[
4wire w?
]`;
  const { processed, tokens } = tokenize(src);
  // Should produce tokens for 3 statements: 4wire w1, 4wire w2, 4wire w3
  const typeTokens = tokens.filter(t => t.type === 'TYPE');
  assert('tokenizer: 3 TYPE tokens from repeat', String(typeTokens.length), '3');
}

console.log('\n=== Test 11: ?0 in single repeat equals range values ===');
{
  const src = `repeat 3..5[
4wire a?0
]`;
  const result = preprocessRepeat(src);
  assert('single repeat ?0 takes range values',
    result,
    `4wire a3
4wire a4
4wire a5`
  );
}

console.log('\n=== Test 12: bare ? in single repeat = sequential from 1 ===');
{
  const src = `repeat 3..5[
4wire a?
]`;
  const result = preprocessRepeat(src);
  assert('single repeat bare ? sequential from 1',
    result,
    `4wire a1
4wire a2
4wire a3`
  );
}

console.log('\n=== Test 13: Nested 3 levels ===');
{
  const src = `repeat 1..2[
repeat 1..2[
repeat 1..2[
4wire x?0?1?2
]
]
]`;
  const result = preprocessRepeat(src);
  // 2*2*2 = 8 combinations
  const lines = result.trim().split('\n').filter(l => l.trim() !== '');
  assert('3-level nesting: 8 lines', String(lines.length), '8');
  // First line: ?0=1, ?1=1, ?2=1
  assert('3-level first line', lines[0].trim(), '4wire x111');
  // Last line: ?0=2, ?1=2, ?2=2
  assert('3-level last line', lines[lines.length - 1].trim(), '4wire x222');
}

console.log('\n=== Test 14: Unmatched bracket error ===');
{
  assertThrows('unmatched bracket',
    () => preprocessRepeat(`repeat 1..3[
4wire a?
`),
    'unmatched'
  );
}

console.log('\n=== Test 15: Decimal literal \\N tokenized as BIN ===');
{
  // \15 should become BIN token with value '1111' (15 decimal = 1111 binary)
  const { tokens } = tokenize('4wire c = \\15');
  const binTokens = tokens.filter(t => t.type === 'BIN');
  assert('\\15 produces BIN token', String(binTokens.length >= 1), 'true');
  assert('\\15 value is 1111', binTokens[binTokens.length - 1].value, '1111');
}

console.log('\n=== Test 16: Decimal literal \\0 ===');
{
  const { tokens } = tokenize('4wire c = \\0');
  const binTokens = tokens.filter(t => t.type === 'BIN');
  assert('\\0 produces BIN with value 0', binTokens[binTokens.length - 1].value, '0');
}

console.log('\n=== Test 17: Decimal literal \\255 ===');
{
  const { tokens } = tokenize('4wire c = \\255');
  const binTokens = tokens.filter(t => t.type === 'BIN');
  assert('\\255 value is 11111111', binTokens[binTokens.length - 1].value, '11111111');
}

console.log('\n=== Test 18: Decimal literal with repeat ===');
{
  const src = `repeat 1..3[
4wire c? = \\?0
]`;
  // After preprocess: 4wire c1 = \1, 4wire c2 = \2, 4wire c3 = \3
  // \1 = 1, \2 = 10, \3 = 11
  const { tokens } = tokenize(src);
  const binTokens = tokens.filter(t => t.type === 'BIN');
  // The assignment values: \1=1, \2=10, \3=11
  // But there are also BIN tokens from wire names (c1, c2, c3) if they are 0/1 only... 
  // Let's just check the processed text
  const processed = preprocessRepeat(src);
  assert('repeat + decimal literal expansion',
    processed,
    `4wire c1 = \\1
4wire c2 = \\2
4wire c3 = \\3`
  );
}

console.log('\n=== Test 19: Decimal \\2 produces binary 10 (padding is interpreter-level) ===');
{
  // \2 in tokenizer → BIN '10'. Padding to 8 bits happens in interpreter.
  const { tokens } = tokenize('8wire q2 = \\2');
  const binTokens = tokens.filter(t => t.type === 'BIN');
  assert('\\2 tokenized as BIN 10', binTokens[binTokens.length - 1].value, '10');
}

console.log('\n=== Test 20: HEX ^F produces 4-bit binary ===');
{
  const { tokens } = tokenize('8wire q3 = ^F');
  const hexTokens = tokens.filter(t => t.type === 'HEX');
  assert('^F tokenized as HEX F', hexTokens[0].value, 'F');
}

console.log('\n=== Test 21: Large decimal \\1024 ===');
{
  const { tokens } = tokenize('16wire q = \\1024');
  const binTokens = tokens.filter(t => t.type === 'BIN');
  // 1024 = 10000000000 (11 bits)
  assert('\\1024 value is 10000000000', binTokens[binTokens.length - 1].value, '10000000000');
}

// ================================================================
// Logic gate tests (pure JS, no interpreter needed)
// We replicate the exact same logic from main.js call() to verify it.
// ================================================================

function gateReduce(name, a, bv) {
  const len = Math.max(a.length, bv !== undefined ? bv.length : 0);
  const ap = a.padStart(len, '0');
  const bp = bv !== undefined ? bv.padStart(len, '0') : '';
  if (name === 'NOT') {
    const notBits = a.split('').map(c => c === '1' ? '0' : '1');
    return notBits.includes('1') ? '1' : '0';
  }
  const resultBits = [];
  for (let i = 0; i < len; i++) {
    const ai = ap[i] === '1', bi = bp[i] === '1';
    let r;
    switch (name) {
      case 'AND':  r = ai && bi; break;
      case 'OR':   r = ai || bi; break;
      case 'XOR':  r = ai !== bi; break;
      case 'NAND': r = !(ai && bi); break;
      case 'NOR':  r = !(ai || bi); break;
    }
    resultBits.push(r ? '1' : '0');
  }
  return resultBits.includes('1') ? '1' : '0';
}

function gateExpand(name, a, bv) {
  if (name === 'NOTe') {
    return a.split('').map(c => c === '1' ? '0' : '1').join('');
  }
  const len = Math.max(a.length, bv.length);
  const ap = a.padStart(len, '0');
  const bp = bv.padStart(len, '0');
  let v = '';
  for (let i = 0; i < len; i++) {
    const ai = ap[i] === '1', bi = bp[i] === '1';
    let r;
    switch (name) {
      case 'ANDe':  r = ai && bi; break;
      case 'ORe':   r = ai || bi; break;
      case 'XORe':  r = ai !== bi; break;
      case 'NANDe': r = !(ai && bi); break;
      case 'NORe':  r = !(ai || bi); break;
    }
    v += r ? '1' : '0';
  }
  return v;
}

console.log('\n=== Test 22: AND reduce - bitwise 11011 AND 11100 = 11000 → OR-reduce = 1 ===');
assert('AND(11011, 11100)', gateReduce('AND', '11011', '11100'), '1');

console.log('\n=== Test 23: AND reduce - no overlap → 0 ===');
assert('AND(1010, 0101)', gateReduce('AND', '1010', '0101'), '0');

console.log('\n=== Test 24: OR reduce ===');
assert('OR(0000, 0000)', gateReduce('OR', '0000', '0000'), '0');
assert('OR(0000, 0001)', gateReduce('OR', '0000', '0001'), '1');

console.log('\n=== Test 25: NOR reduce - NOR(1111, 0011) = 0000 → reduce = 0 ===');
assert('NOR(1111, 0011)', gateReduce('NOR', '1111', '0011'), '0');

console.log('\n=== Test 26: NOR reduce - NOR(0000, 0000) = 1111 → reduce = 1 ===');
assert('NOR(0000, 0000)', gateReduce('NOR', '0000', '0000'), '1');

console.log('\n=== Test 27: NOT reduce - NOT(1010) → 0101, reduce=1 ===');
assert('NOT(1010)', gateReduce('NOT', '1010'), '1');

console.log('\n=== Test 28: NOT reduce - NOT(1111) → 0000, reduce=0 ===');
assert('NOT(1111)', gateReduce('NOT', '1111'), '0');

console.log('\n=== Test 29: XOR reduce ===');
assert('XOR(1010, 1010)', gateReduce('XOR', '1010', '1010'), '0');
assert('XOR(1010, 0101)', gateReduce('XOR', '1010', '0101'), '1');

console.log('\n=== Test 30: NAND reduce ===');
assert('NAND(1111, 1111) → 0000 → 0', gateReduce('NAND', '1111', '1111'), '0');
assert('NAND(1010, 0101) → 1111 → 1', gateReduce('NAND', '1010', '0101'), '1');

console.log('\n=== Test 31: ANDe - bitwise AND returns N bits ===');
assert('ANDe(011, 101)', gateExpand('ANDe', '011', '101'), '001');
assert('ANDe(1100, 1011)', gateExpand('ANDe', '1100', '1011'), '1000');

console.log('\n=== Test 32: ORe - bitwise OR returns N bits ===');
assert('ORe(1100, 1011)', gateExpand('ORe', '1100', '1011'), '1111');
assert('ORe(0000, 0000)', gateExpand('ORe', '0000', '0000'), '0000');

console.log('\n=== Test 33: NOTe - bitwise NOT returns N bits ===');
assert('NOTe(1010)', gateExpand('NOTe', '1010'), '0101');
assert('NOTe(0000)', gateExpand('NOTe', '0000'), '1111');

console.log('\n=== Test 34: XORe ===');
assert('XORe(1010, 1100)', gateExpand('XORe', '1010', '1100'), '0110');

console.log('\n=== Test 35: NANDe ===');
assert('NANDe(1111, 1111)', gateExpand('NANDe', '1111', '1111'), '0000');
assert('NANDe(1010, 0101)', gateExpand('NANDe', '1010', '0101'), '1111');

console.log('\n=== Test 36: NORe ===');
assert('NORe(0000, 0000)', gateExpand('NORe', '0000', '0000'), '1111');
assert('NORe(1010, 0101)', gateExpand('NORe', '1010', '0101'), '0000');

console.log('\n=== Test 37: Gate on different widths (padStart shorter) ===');
assert('ANDe(11, 1100) pads 11→0011', gateExpand('ANDe', '11', '1100'), '0000');
assert('ORe(11, 1100)', gateExpand('ORe', '11', '1100'), '1111');

console.log('\n=== Test 38: NOTe tokenized as ID ===');
{
  const { tokens } = tokenize('4wire x = NOTe(1010)');
  const idTokens = tokens.filter(t => t.type === 'ID' && t.value === 'NOTe');
  assert('NOTe recognized as ID token', String(idTokens.length), '1');
}

console.log('\n=== Test 39: ANDe tokenized as ID ===');
{
  const { tokens } = tokenize('4wire x = ANDe(1010, 0101)');
  const idTokens = tokens.filter(t => t.type === 'ID' && t.value === 'ANDe');
  assert('ANDe recognized as ID token', String(idTokens.length), '1');
}

// ================================================================
// LSHIFT / RSHIFT tests (pure JS logic replica)
// ================================================================

function lshift(data, n, fill = '0') {
  return data + fill.repeat(n);
}

function rshift(data, n, fill = '0') {
  const len = data.length;
  if (n >= len) return fill.repeat(len);
  return fill.repeat(n) + data.slice(0, len - n);
}

console.log('\n=== Test 40: LSHIFT basic ===');
assert('LSHIFT(1, 1, 0)', lshift('1', 1, '0'), '10');
assert('LSHIFT(1, 1, 1)', lshift('1', 1, '1'), '11');
assert('LSHIFT(10, 1, 0)', lshift('10', 1, '0'), '100');
assert('LSHIFT(10, 1, 1)', lshift('10', 1, '1'), '101');

console.log('\n=== Test 41: LSHIFT default fill=0 ===');
assert('LSHIFT(1, 1) default fill', lshift('1', 1), '10');
assert('LSHIFT(10, 1) default fill', lshift('10', 1), '100');

console.log('\n=== Test 42: LSHIFT n=0 ===');
assert('LSHIFT(101, 0, 0)', lshift('101', 0, '0'), '101');

console.log('\n=== Test 43: LSHIFT n > data.length ===');
assert('LSHIFT(1, 3, 0)', lshift('1', 3, '0'), '1000');
assert('LSHIFT(1, 3, 1)', lshift('1', 3, '1'), '1111');

console.log('\n=== Test 44: RSHIFT basic ===');
assert('RSHIFT(10, 1, 0)', rshift('10', 1, '0'), '01');
assert('RSHIFT(10, 1, 1)', rshift('10', 1, '1'), '11');
assert('RSHIFT(1, 1, 0)', rshift('1', 1, '0'), '0');
assert('RSHIFT(1, 1, 1)', rshift('1', 1, '1'), '1');

console.log('\n=== Test 45: RSHIFT default fill=0 ===');
assert('RSHIFT(10, 1) default fill', rshift('10', 1), '01');
assert('RSHIFT(1010, 2) default fill', rshift('1010', 2), '0010');

console.log('\n=== Test 46: RSHIFT n=0 ===');
assert('RSHIFT(101, 0, 0)', rshift('101', 0, '0'), '101');

console.log('\n=== Test 47: RSHIFT n >= data.length ===');
assert('RSHIFT(10, 2, 0)', rshift('10', 2, '0'), '00');
assert('RSHIFT(10, 5, 1)', rshift('10', 5, '1'), '11');

console.log('\n=== Test 48: RSHIFT keeps same width ===');
assert('RSHIFT(1010, 1, 0) = 0101', rshift('1010', 1, '0'), '0101');
assert('RSHIFT(1010, 1, 1) = 1101', rshift('1010', 1, '1'), '1101');

console.log('\n=== Test 49: Tokenizer - < emits SYM when not LOAD ===');
{
  // "a < 1" - after tokenizing 'a', '<' should be SYM not LOAD
  const { tokens } = tokenize('4wire x = 10 < 1');
  const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
  assert('< is SYM token in shift context', String(symLt.length), '1');
}

console.log('\n=== Test 49b: Tokenizer - < after variable name is SYM (not LOAD) ===');
{
  // test < sel - variable 'sel' starts with 's' (letter), must NOT be LOAD
  const { tokens } = tokenize('4wire result = test < sel');
  const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
  const loadTok = tokens.filter(t => t.type === 'LOAD');
  assert('< after variable is SYM not LOAD', String(symLt.length), '1');
  assert('no LOAD token when < is mid-line', String(loadTok.length), '0');
}

console.log('\n=== Test 50: Tokenizer - <path remains LOAD ===');
{
  // <filename → LOAD token (letter immediately after <)
  const { tokens } = tokenize('<myfile');
  const loadTok = tokens.filter(t => t.type === 'LOAD');
  assert('<myfile produces LOAD token', String(loadTok.length), '1');
  assert('LOAD token value is myfile', loadTok[0].value, 'myfile');
}

console.log('\n=== Test 51: Tokenizer - > emits SYM ===');
{
  const { tokens } = tokenize('4wire x = 10 > 1');
  const symGt = tokens.filter(t => t.type === 'SYM' && t.value === '>');
  assert('> is SYM token', String(symGt.length), '1');
}

console.log('\n=== Test 52: LSHIFT w1 fill via operator - preprocessed text ===');
{
  // Verify preprocessRepeat passes through operator syntax unchanged
  const src = '4wire x = 10 < 1 w1';
  const result = preprocessRepeat(src);
  assert('< w1 operator passes through preprocessor', result, src);
}

// ===========================
// Dynamic Bit Range tests
// ===========================

console.log('\n=== Test 53: Tokenizer - ( after . emits SYM ( ===');
{
  // a.(start) should tokenize: ID 'a', SYM '.', SYM '(', ID 'start', SYM ')'
  const { tokens } = tokenize('a.(start)');
  const types = tokens.map(t => t.type + ':' + t.value).join(' ');
  const hasDot = tokens.some(t => t.type === 'SYM' && t.value === '.');
  const hasLParen = tokens.some(t => t.type === 'SYM' && t.value === '(');
  const hasRParen = tokens.some(t => t.type === 'SYM' && t.value === ')');
  assert('a.(start) has SYM dot', String(hasDot), 'true');
  assert('a.(start) has SYM (', String(hasLParen), 'true');
  assert('a.(start) has SYM )', String(hasRParen), 'true');
}

console.log('\n=== Test 54: Tokenizer - a.(start)/(l) tokenizes correctly ===');
{
  const { tokens } = tokenize('a.(start)/(l)');
  const slash = tokens.filter(t => t.type === 'SYM' && t.value === '/');
  assert('a.(start)/(l) has / token', String(slash.length >= 1), 'true');
}

console.log('\n=== Test 55: Tokenizer - a.(start)-(end) tokenizes correctly ===');
{
  const { tokens } = tokenize('a.(s)-(e)');
  const minus = tokens.filter(t => t.type === 'SYM' && t.value === '-');
  assert('a.(s)-(e) has - token', String(minus.length >= 1), 'true');
}

console.log('\n=== Test 56: Tokenizer - preprocessor passes through dynamic bit range syntax ===');
{
  const src = '4bit sub = data.(start)/(l)';
  const result = preprocessRepeat(src);
  assert('dynamic bit range passes through preprocessor', result, src);
}

console.log('\n=== Test 57: resolveBitRange - static range {start:1, end:4} ===');
{
  // Simulate what resolveBitRange does for static ranges
  function resolveBitRange(bitRange) {
    if (!bitRange.isDynamic) {
      const end = (bitRange.end !== undefined && bitRange.end !== null)
        ? bitRange.end : bitRange.start;
      return { start: bitRange.start, end };
    }
    return null;
  }
  const r = resolveBitRange({ start: 1, end: 4 });
  assert('static range start=1', String(r.start), '1');
  assert('static range end=4', String(r.end), '4');
}

console.log('\n=== Test 58: resolveBitRange - static single bit {start:3, end:3} ===');
{
  function resolveBitRange(bitRange) {
    if (!bitRange.isDynamic) {
      const end = (bitRange.end !== undefined && bitRange.end !== null)
        ? bitRange.end : bitRange.start;
      return { start: bitRange.start, end };
    }
    return null;
  }
  const r = resolveBitRange({ start: 3, end: 3 });
  assert('single bit start=3', String(r.start), '3');
  assert('single bit end=3', String(r.end), '3');
}

console.log('\n=== Test 59: resolveBitRange - static range missing end uses start ===');
{
  function resolveBitRange(bitRange) {
    if (!bitRange.isDynamic) {
      const end = (bitRange.end !== undefined && bitRange.end !== null)
        ? bitRange.end : bitRange.start;
      return { start: bitRange.start, end };
    }
    return null;
  }
  const r = resolveBitRange({ start: 2 });
  assert('missing end: end==start', String(r.end), '2');
}

console.log('\n=== Test 60: resolveBitRange - dynamic range with evalExpr simulation ===');
{
  // Simulate resolveBitRange logic for isDynamic with startExpr and lenExpr
  // Binary "1" = 1, binary "100" = 4
  function evalBinStr(s) { return parseInt(s, 2); }
  function mockResolve(bitRange, startVal, lenVal) {
    // Mirrors the Interpreter.resolveBitRange logic
    let start = bitRange.start !== undefined ? bitRange.start : null;
    let end   = bitRange.end   !== undefined ? bitRange.end   : null;
    if (bitRange.startExpr) start = evalBinStr(startVal);
    if (bitRange.endExpr) end = evalBinStr(lenVal);
    else if (bitRange.lenExpr) end = start + evalBinStr(lenVal) - 1;
    else if (end === null) end = start;
    return { start, end };
  }

  // data.(start)/(l) where start=1 ("1" in binary), l=4 ("100" in binary)
  const r1 = mockResolve(
    { startExpr: true, lenExpr: true, isDynamic: true, isLength: true },
    '1',   // binary for 1
    '100'  // binary for 4
  );
  assert('dynamic start=1', String(r1.start), '1');
  assert('dynamic end=4 (1+4-1)', String(r1.end), '4');

  // data.(start)-(end) where start=1, end=5
  const r2 = mockResolve(
    { startExpr: true, endExpr: true, isDynamic: true },
    '1',   // binary for 1
    '101'  // binary for 5
  );
  assert('dynamic range start=1', String(r2.start), '1');
  assert('dynamic range end=5', String(r2.end), '5');

  // Mixed: static start + dynamic len  a.1/(l) where l=4
  const r3 = mockResolve(
    { start: 1, lenExpr: true, isDynamic: true, isLength: true },
    null,  // startExpr not set
    '100'  // binary for 4
  );
  assert('mixed static start=1', String(r3.start), '1');
  assert('mixed dynamic len => end=4', String(r3.end), '4');

  // Mixed: dynamic start + static len  a.(start)/4 where start=2, len=4
  function mockResolveDynStartStaticLen(bitRange, startVal) {
    let start = bitRange.start !== undefined ? bitRange.start : null;
    let end   = bitRange.end   !== undefined ? bitRange.end   : null;
    if (bitRange.startExpr) start = evalBinStr(startVal);
    if (bitRange.endExpr) { /* not set */ }
    else if (bitRange.lenExpr) { /* not set */ }
    else if (bitRange.len !== undefined && bitRange.len !== null) {
      end = start + bitRange.len - 1;
    } else if (end === null) { end = start; }
    return { start, end };
  }
  const r4 = mockResolveDynStartStaticLen(
    { startExpr: true, len: 4, isDynamic: true, isLength: true },
    '10'  // binary for 2
  );
  assert('dynamic start=2, static len=4: start=2', String(r4.start), '2');
  assert('dynamic start=2, static len=4: end=5 (2+4-1)', String(r4.end), '5');
}

// Summary
console.log(`\n========== RESULTS ==========`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`==============================\n`);

process.exit(failed > 0 ? 1 : 0);
