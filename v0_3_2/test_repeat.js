/**
 * Node.js tests for the repeat preprocessor.
 * Run with: node test_repeat.js
 *
 * v0.3.2 — reads from modular core/ files instead of monolithic main.js.
 */

const fs = require('fs');
const vm = require('vm');

const tokenizerSrc    = fs.readFileSync('./core/tokenizer.js', 'utf-8');
const preprocessorSrc = fs.readFileSync('./core/preprocessor.js', 'utf-8');
const parserSrc       = fs.readFileSync('./core/parser.js', 'utf-8');

const chunk = tokenizerSrc + '\n' + preprocessorSrc;

const sandbox = { Error, parseInt, String, Array, Set, Map, RegExp, console };
const codeToRun = chunk + `\nvar _Token = Token; var _Tokenizer = Tokenizer; var _preprocessRepeat = preprocessRepeat; var _preprocessShortNotation = preprocessShortNotation;`;
vm.runInNewContext(codeToRun, sandbox);
const preprocessRepeat = sandbox._preprocessRepeat;
const preprocessShortNotation = sandbox._preprocessShortNotation;
const Tokenizer = sandbox._Tokenizer;

let passed = 0;
let failed = 0;

function assert(testName, actual, expected) {
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
/*
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
  try {
    const result = preprocessRepeat(src);
    console.log(`  PASS: 16x16 = 256 does not throw`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: 16x16 should not throw, got: ${e.message}`);
    failed++;
  }
}

*/

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
  const typeTokens = tokens.filter(t => t.type === 'TYPE');
  assert('tokenizer: 3 TYPE tokens from repeat', String(typeTokens.length), '3');
}

/*
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
*/

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
  const lines = result.trim().split('\n').filter(l => l.trim() !== '');
  assert('3-level nesting: 8 lines', String(lines.length), '8');
  assert('3-level first line', lines[0].trim(), '4wire x111');
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

/*
console.log('\n=== Test 18: Decimal literal with repeat ===');
{
  const src = `repeat 1..3[
4wire c? = \\?0
]`;
  const { tokens } = tokenize(src);
  const binTokens = tokens.filter(t => t.type === 'BIN');
  const processed = preprocessRepeat(src);
  assert('repeat + decimal literal expansion',
    processed,
    `4wire c1 = \\1
4wire c2 = \\2
4wire c3 = \\3`
  );
}*/

console.log('\n=== Test 19: Decimal \\2 produces binary 10 (padding is interpreter-level) ===');
{
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
  assert('\\1024 value is 10000000000', binTokens[binTokens.length - 1].value, '10000000000');
}

// ================================================================
// Logic gate tests (pure JS, no interpreter needed)
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
  const { tokens } = tokenize('4wire x = 10 < 1');
  const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
  assert('< is SYM token in shift context', String(symLt.length), '1');
}

console.log('\n=== Test 49b: Tokenizer - < after variable name is SYM (not LOAD) ===');
{
  const { tokens } = tokenize('4wire result = test < sel');
  const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
  const loadTok = tokens.filter(t => t.type === 'LOAD');
  assert('< after variable is SYM not LOAD', String(symLt.length), '1');
  assert('no LOAD token when < is mid-line', String(loadTok.length), '0');
}

console.log('\n=== Test 50: Tokenizer - <path remains LOAD ===');
{
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
  const src = '4wire x = 10 < 1 w1';
  const result = preprocessRepeat(src);
  assert('< w1 operator passes through preprocessor', result, src);
}

// ===========================
// Dynamic Bit Range tests
// ===========================

console.log('\n=== Test 53: Tokenizer - ( after . emits SYM ( ===');
{
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
  function evalBinStr(s) { return parseInt(s, 2); }
  function mockResolve(bitRange, startVal, lenVal) {
    let start = bitRange.start !== undefined ? bitRange.start : null;
    let end   = bitRange.end   !== undefined ? bitRange.end   : null;
    if (bitRange.startExpr) start = evalBinStr(startVal);
    if (bitRange.endExpr) end = evalBinStr(lenVal);
    else if (bitRange.lenExpr) end = start + evalBinStr(lenVal) - 1;
    else if (end === null) end = start;
    return { start, end };
  }

  const r1 = mockResolve(
    { startExpr: true, lenExpr: true, isDynamic: true, isLength: true },
    '1',
    '100'
  );
  assert('dynamic start=1', String(r1.start), '1');
  assert('dynamic end=4 (1+4-1)', String(r1.end), '4');

  const r2 = mockResolve(
    { startExpr: true, endExpr: true, isDynamic: true },
    '1',
    '101'
  );
  assert('dynamic range start=1', String(r2.start), '1');
  assert('dynamic range end=5', String(r2.end), '5');

  const r3 = mockResolve(
    { start: 1, lenExpr: true, isDynamic: true, isLength: true },
    null,
    '100'
  );
  assert('mixed static start=1', String(r3.start), '1');
  assert('mixed dynamic len => end=4', String(r3.end), '4');

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
    '10'
  );
  assert('dynamic start=2, static len=4: start=2', String(r4.start), '2');
  assert('dynamic start=2, static len=4: end=5 (2+4-1)', String(r4.end), '5');
}

// ================================================================
// NEW Bit Operation Tests
// ================================================================

function gate(name, a, bv) {
  const applyOp = (ai, bi) => {
    switch (name) {
      case 'AND':  return ai && bi;
      case 'OR':   return ai || bi;
      case 'XOR':  return ai !== bi;
      case 'NXOR': return ai === bi;
      case 'NAND': return !(ai && bi);
      case 'NOR':  return !(ai || bi);
      case 'EQ':   return ai === bi;
    }
  };

  if (name === 'NOT') {
    return a.split('').map(c => c === '1' ? '0' : '1').join('');
  }

  if (bv === undefined) {
    const bits = a.split('');
    let acc = bits[0] === '1';
    for (let i = 1; i < bits.length; i++) {
      acc = applyOp(acc, bits[i] === '1');
    }
    return acc ? '1' : '0';
  }

  const len = Math.max(a.length, bv.length);
  const ap = a.padStart(len, '0');
  const bp = bv.padStart(len, '0');
  const resultBits = [];
  for (let i = 0; i < len; i++) {
    resultBits.push(applyOp(ap[i] === '1', bp[i] === '1') ? '1' : '0');
  }
  return resultBits.join('');
}

// --- NOT ---
console.log('\n=== Test 61: NOT returns same number of bits (N bits) ===');
assert('NOT(1) = 0',    gate('NOT', '1'),    '0');
assert('NOT(0) = 1',    gate('NOT', '0'),    '1');
assert('NOT(111) = 000', gate('NOT', '111'), '000');
assert('NOT(101) = 010', gate('NOT', '101'), '010');
assert('NOT(0000) = 1111', gate('NOT', '0000'), '1111');
assert('NOT(1010) = 0101', gate('NOT', '1010'), '0101');

// --- AND ---
console.log('\n=== Test 62: AND 2-arg: 1-bit operands → 1 bit ===');
assert('AND(1,1) = 1', gate('AND', '1', '1'), '1');
assert('AND(0,0) = 0', gate('AND', '0', '0'), '0');
assert('AND(1,0) = 0', gate('AND', '1', '0'), '0');

console.log('\n=== Test 63: AND 1-arg fold → 1 bit ===');
assert('AND(110) = 0',  gate('AND', '110'),  '0');
assert('AND(111) = 1',  gate('AND', '111'),  '1');
assert('AND(1111) = 1', gate('AND', '1111'), '1');
assert('AND(1110) = 0', gate('AND', '1110'), '0');

console.log('\n=== Test 64: AND 2-arg bitwise → N bits ===');
assert('AND(111,101) = 101',               gate('AND', '111', '101'),        '101');
assert('AND(00100101,01001111) = 00000101', gate('AND', '00100101','01001111'),'00000101');
assert('AND(11,10) = 10',                  gate('AND', '11', '10'),           '10');

// --- OR ---
console.log('\n=== Test 65: OR 2-arg: 1-bit operands → 1 bit ===');
assert('OR(1,1) = 1', gate('OR', '1', '1'), '1');
assert('OR(0,0) = 0', gate('OR', '0', '0'), '0');
assert('OR(1,0) = 1', gate('OR', '1', '0'), '1');

console.log('\n=== Test 66: OR 1-arg fold → 1 bit ===');
assert('OR(110) = 1',  gate('OR', '110'),  '1');
assert('OR(111) = 1',  gate('OR', '111'),  '1');
assert('OR(000) = 0',  gate('OR', '000'),  '0');
assert('OR(001) = 1',  gate('OR', '001'),  '1');

console.log('\n=== Test 67: OR 2-arg bitwise → N bits ===');
assert('OR(111,101) = 111',               gate('OR', '111', '101'),         '111');
assert('OR(00100101,01001111) = 01101111', gate('OR', '00100101','01001111'), '01101111');
assert('OR(11,10) = 11',                  gate('OR', '11', '10'),            '11');

// --- NOR ---
console.log('\n=== Test 68: NOR 2-arg: 1-bit operands → 1 bit ===');
assert('NOR(1,1) = 0', gate('NOR', '1', '1'), '0');
assert('NOR(0,0) = 1', gate('NOR', '0', '0'), '1');
assert('NOR(1,0) = 0', gate('NOR', '1', '0'), '0');

console.log('\n=== Test 69: NOR 1-arg fold → 1 bit ===');
assert('NOR(110) = 1',  gate('NOR', '110'), '1');
assert('NOR(111) = 0',  gate('NOR', '111'), '0');
assert('NOR(000) = 0',  gate('NOR', '000'), '0');
assert('NOR(001) = 0',  gate('NOR', '001'), '0');

console.log('\n=== Test 70: NOR 2-arg bitwise → N bits ===');
assert('NOR(111,101) = 000',               gate('NOR', '111', '101'),         '000');
assert('NOR(00100101,01001111) = 10010000', gate('NOR', '00100101','01001111'), '10010000');
assert('NOR(11,10) = 00',                  gate('NOR', '11', '10'),            '00');

// --- XOR ---
console.log('\n=== Test 71: XOR 2-arg: 1-bit operands → 1 bit ===');
assert('XOR(1,1) = 0', gate('XOR', '1', '1'), '0');
assert('XOR(0,0) = 0', gate('XOR', '0', '0'), '0');
assert('XOR(1,0) = 1', gate('XOR', '1', '0'), '1');

console.log('\n=== Test 72: XOR 1-arg fold → 1 bit ===');
assert('XOR(110) = 0',  gate('XOR', '110'), '0');
assert('XOR(111) = 1',  gate('XOR', '111'), '1');
assert('XOR(1010) = 0', gate('XOR', '1010'), '0');
assert('XOR(1011) = 1', gate('XOR', '1011'), '1');

console.log('\n=== Test 73: XOR 2-arg bitwise → N bits ===');
assert('XOR(111,101) = 010',               gate('XOR', '111', '101'),         '010');
assert('XOR(00100101,01001111) = 01101010', gate('XOR', '00100101','01001111'), '01101010');
assert('XOR(11,10) = 01',                  gate('XOR', '11', '10'),            '01');

// --- NAND ---
console.log('\n=== Test 74: NAND 2-arg: 1-bit operands → 1 bit ===');
assert('NAND(1,1) = 0', gate('NAND', '1', '1'), '0');
assert('NAND(0,0) = 1', gate('NAND', '0', '0'), '1');
assert('NAND(1,0) = 1', gate('NAND', '1', '0'), '1');

console.log('\n=== Test 75: NAND 1-arg fold → 1 bit ===');
assert('NAND(110) = 1',  gate('NAND', '110'), '1');
assert('NAND(111) = 1',  gate('NAND', '111'), '1');
assert('NAND(1111) = 0', gate('NAND', '1111'), '0');
assert('NAND(000) = 1',  gate('NAND', '000'), '1');

console.log('\n=== Test 76: NAND 2-arg bitwise → N bits ===');
assert('NAND(111,101) = 010',               gate('NAND', '111', '101'),         '010');
assert('NAND(00100101,01001111) = 11111010', gate('NAND', '00100101','01001111'), '11111010');
assert('NAND(11,10) = 01',                  gate('NAND', '11', '10'),            '01');

// --- NXOR (XNOR) ---
console.log('\n=== Test 77: NXOR 2-arg: 1-bit operands → 1 bit ===');
assert('NXOR(1,1) = 1', gate('NXOR', '1', '1'), '1');
assert('NXOR(0,0) = 1', gate('NXOR', '0', '0'), '1');
assert('NXOR(1,0) = 0', gate('NXOR', '1', '0'), '0');
assert('NXOR(0,1) = 0', gate('NXOR', '0', '1'), '0');

console.log('\n=== Test 78: NXOR 1-arg fold → 1 bit ===');
assert('NXOR(110) = 0',  gate('NXOR', '110'), '0');
assert('NXOR(111) = 1',  gate('NXOR', '111'), '1');
assert('NXOR(1010) = 1', gate('NXOR', '1010'), '1');
assert('NXOR(11) = 1',   gate('NXOR', '11'),   '1');

console.log('\n=== Test 79: NXOR 2-arg bitwise → N bits ===');
assert('NXOR(111,101) = 101',  gate('NXOR', '111', '101'), '101');
assert('NXOR(11,10) = 10',     gate('NXOR', '11',  '10'),  '10');
assert('NXOR(1010,0101) = 0000', gate('NXOR', '1010', '0101'), '0000');
assert('NXOR(1010,1010) = 1111', gate('NXOR', '1010', '1010'), '1111');

// --- Edge cases ---
console.log('\n=== Test 80: Single-bit input for all operators ===');
assert('NOT single 1', gate('NOT', '1'), '0');
assert('NOT single 0', gate('NOT', '0'), '1');
assert('AND fold single bit 1', gate('AND', '1'), '1');
assert('AND fold single bit 0', gate('AND', '0'), '0');
assert('OR  fold single bit 1', gate('OR',  '1'), '1');
assert('NOR fold single bit 1', gate('NOR', '1'), '1');
assert('NOR fold single bit 0', gate('NOR', '0'), '0');
assert('XOR fold single bit 1', gate('XOR', '1'), '1');
assert('NAND fold single bit 0', gate('NAND', '0'), '0');
assert('NXOR fold single bit 1', gate('NXOR', '1'), '1');

console.log('\n=== Test 81: Different-width args get padded ===');
assert('AND(11,1100) pads 11→0011 → 0000', gate('AND',  '11', '1100'), '0000');
assert('OR(11,1100)  pads 11→0011 → 1111', gate('OR',   '11', '1100'), '1111');
assert('XOR(11,1100) pads → 1111',          gate('XOR',  '11', '1100'), '1111');
assert('NOR(11,1100) → bitwise NOR(0011,1100)=0000', gate('NOR', '11', '1100'), '0000');

// ================================================================
// := Wire Initialization — Tokenizer tests
// ================================================================

console.log('\n=== Test 82: := produces a single SYM token ===');
{
  const { tokens } = tokenize('1wire s := 1');
  const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
  assert(':= is a single SYM(:=) token', String(colonEq.length), '1');
  const colonOnly = tokens.filter(t => t.type === 'SYM' && t.value === ':');
  assert('no stray SYM(:) when := present', String(colonOnly.length), '0');
}

console.log('\n=== Test 83: standalone : still produces SYM(:) ===');
{
  const { tokens } = tokenize('on: 1');
  const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
  assert('standalone : gives SYM(:)', String(colonTok.length), '1');
  const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
  assert('no := when only : present', String(colonEq.length), '0');
}

console.log('\n=== Test 84: :: still produces two SYM(:) tokens ===');
{
  const { tokens } = tokenize('comp [switch] .s ::');
  const colonToks = tokens.filter(t => t.type === 'SYM' && t.value === ':');
  assert(':: gives two SYM(:)', String(colonToks.length), '2');
  const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
  assert(':: gives no SYM(:=)', String(colonEq.length), '0');
}

console.log('\n=== Test 85: full tokenization of "1wire s := 1" ===');
{
  const { tokens } = tokenize('1wire s := 1');
  const types = tokens.map(t => t.type);
  assert('TYPE token present',  String(types.includes('TYPE')),  'true');
  assert('ID token present',    String(types.includes('ID')),    'true');
  assert(':= SYM present',      String(tokens.some(t => t.type === 'SYM' && t.value === ':=')), 'true');
  assert('BIN token present',   String(types.includes('BIN')),   'true');
}

console.log('\n=== Test 86: := with hex literal "4wire s := ^FF" ===');
{
  const { tokens } = tokenize('4wire s := ^FF');
  const hexTok = tokens.filter(t => t.type === 'HEX');
  assert('^FF hex token present after :=', String(hexTok.length), '1');
  assert('^FF value is FF', hexTok[0].value, 'FF');
}

console.log('\n=== Test 87: := with decimal \\N (tokenized as BIN) ===');
{
  const { tokens } = tokenize('4wire s := \\5');
  const binTok = tokens.filter(t => t.type === 'BIN');
  assert('\\5 after := gives BIN', String(binTok.length >= 1), 'true');
  assert('\\5 BIN value is 101', binTok[binTok.length - 1].value, '101');
}

console.log('\n=== Test 88: := with NOT prefix "1wire s := !1" ===');
{
  const { tokens } = tokenize('1wire s := !1');
  const notTok = tokens.filter(t => t.type === 'SYM' && t.value === '!');
  assert('! token present after :=', String(notTok.length), '1');
  const binTok = tokens.filter(t => t.type === 'BIN');
  assert('BIN follows !', String(binTok.length >= 1), 'true');
}

console.log('\n=== Test 89: := does not interfere with .var:get syntax ===');
{
  const { tokens } = tokenize('1wire s = .sw:get');
  const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
  assert(':= not produced for :get syntax', String(colonEq.length), '0');
  const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
  assert(': produced for :get syntax', String(colonTok.length), '1');
}

// ================================================================
// := Wire Initialization — Parser tests
// ================================================================

{
  const parserChunk = tokenizerSrc + '\n' + preprocessorSrc + '\n' + parserSrc;
  const sandboxP = { Error, parseInt, String, Array, Set, Map, RegExp, console, Object };
  const parserCode = parserChunk + `\nvar _Parser2 = Parser; var _Tokenizer2 = Tokenizer; var _preprocessRepeat2 = preprocessRepeat;`;
  vm.runInNewContext(parserCode, sandboxP);
  const Parser2 = sandboxP._Parser2;
  const Tokenizer2 = sandboxP._Tokenizer2;
  const preprocessRepeat2 = sandboxP._preprocessRepeat2;

  function parse(code) {
    const processed = preprocessRepeat2(code);
    const p = new Parser2(new Tokenizer2(processed));
    return p.parse();
  }

  console.log('\n=== Test 90: Parser — 1wire s := 1 produces initExpr {bin} ===');
  {
    const stmts = parse('1wire s := 1');
    const s = stmts[0];
    assert('stmt has decls', String(Array.isArray(s.decls)), 'true');
    assert('decls[0].name is s', s.decls[0].name, 's');
    assert('decls[0].type is 1wire', s.decls[0].type, '1wire');
    assert('expr is null', String(s.expr), 'null');
    assert('initExpr exists', String(s.initExpr !== undefined && s.initExpr !== null), 'true');
    assert('initExpr.bin is 1', s.initExpr.bin, '1');
  }

  console.log('\n=== Test 91: Parser — 4wire s := 1101 produces initExpr {bin:1101} ===');
  {
    const stmts = parse('4wire s := 1101');
    const s = stmts[0];
    assert('4wire initExpr.bin is 1101', s.initExpr.bin, '1101');
    assert('4wire expr is null', String(s.expr), 'null');
  }

  console.log('\n=== Test 92: Parser — 4wire s := ^FF produces initExpr {hex:FF} ===');
  {
    const stmts = parse('4wire s := ^FF');
    const s = stmts[0];
    assert('^FF initExpr.hex is FF', s.initExpr.hex, 'FF');
  }

  console.log('\n=== Test 93: Parser — 1wire s := \\5 produces initExpr {bin:101} ===');
  {
    const stmts = parse('1wire s := \\5');
    const s = stmts[0];
    assert('\\5 initExpr.bin is 101', s.initExpr.bin, '101');
  }

  console.log('\n=== Test 94: Parser — 1wire s := !1 produces initExpr {bin:1, not:true} ===');
  {
    const stmts = parse('1wire s := !1');
    const s = stmts[0];
    assert('!1 initExpr.bin is 1', s.initExpr.bin, '1');
    assert('!1 initExpr.not is true', String(s.initExpr.not), 'true');
  }

  console.log('\n=== Test 95: Parser — 1wire s := !0 produces initExpr {bin:0, not:true} ===');
  {
    const stmts = parse('1wire s := !0');
    const s = stmts[0];
    assert('!0 initExpr.bin is 0', s.initExpr.bin, '0');
    assert('!0 initExpr.not is true', String(s.initExpr.not), 'true');
  }

  console.log('\n=== Test 96: Parser — := without not has no not field ===');
  {
    const stmts = parse('1wire s := 1');
    const s = stmts[0];
    assert('no not field when no !', String(!!s.initExpr.not), 'false');
  }

  console.log('\n=== Test 97: Parser — 1wire s = expr has NO initExpr (normal assignment) ===');
  {
    const stmts = parse('1wire s = 1');
    const s = stmts[0];
    assert('normal = has expr not null', String(s.expr !== null), 'true');
    assert('normal = has no initExpr', String(s.initExpr === undefined || s.initExpr === null), 'true');
  }

  console.log('\n=== Test 98: Parser — 1wire s (no assignment) has no initExpr and no expr ===');
  {
    const stmts = parse('1wire s');
    const s = stmts[0];
    assert('bare decl has no initExpr', String(s.initExpr === undefined || s.initExpr === null), 'true');
    assert('bare decl has no expr', String(s.expr), 'null');
  }

  console.log('\n=== Test 99: Parser — := with non-literal throws error ===');
  {
    assertThrows(
      '1wire s := AND(x,y) throws',
      () => parse('1wire s := AND(x,y)'),
      'Expected a literal'
    );
  }

  console.log('\n=== Test 100: Parser — multiple wires with := (8wire q := ^A5) ===');
  {
    const stmts = parse('8wire q := ^A5');
    const s = stmts[0];
    assert('8wire ^A5 type is 8wire', s.decls[0].type, '8wire');
    assert('8wire ^A5 name is q', s.decls[0].name, 'q');
    assert('8wire ^A5 initExpr.hex is A5', s.initExpr.hex, 'A5');
  }

  console.log('\n=== Test 101: Parser — multiple := statements in same script ===');
  {
    const stmts = parse(`1wire s := 1
1wire r := 0
1wire q := 1
1wire nq := 0`);
    assert('4 decl statements', String(stmts.length), '4');
    assert('s initExpr.bin = 1',  stmts[0].initExpr.bin, '1');
    assert('r initExpr.bin = 0',  stmts[1].initExpr.bin, '0');
    assert('q initExpr.bin = 1',  stmts[2].initExpr.bin, '1');
    assert('nq initExpr.bin = 0', stmts[3].initExpr.bin, '0');
  }
}

// ================================================================
// Short Notation Preprocessor tests
// ================================================================

console.log('\n=== Test 102: Short notation — prefix AND ===');
{
  const result = preprocessShortNotation('`& a`');
  assert('`& a` → AND(a)', result, 'AND(a)');
}

console.log('\n=== Test 103: Short notation — prefix OR ===');
{
  const result = preprocessShortNotation('`| a`');
  assert('`| a` → OR(a)', result, 'OR(a)');
}

console.log('\n=== Test 104: Short notation — prefix XOR ===');
{
  const result = preprocessShortNotation('`^ a`');
  assert('`^ a` → XOR(a)', result, 'XOR(a)');
}

console.log('\n=== Test 105: Short notation — prefix NOR ===');
{
  const result = preprocessShortNotation('`-| a`');
  assert('`-| a` → NOR(a)', result, 'NOR(a)');
}

console.log('\n=== Test 106: Short notation — prefix NAND, NXOR ===');
{
  assert('`-& a` → NAND(a)', preprocessShortNotation('`-& a`'), 'NAND(a)');
  assert('`-^ a` → NXOR(a)', preprocessShortNotation('`-^ a`'), 'NXOR(a)');
}

console.log('\n=== Test 107: Short notation — infix AND ===');
{
  const result = preprocessShortNotation('`a & b`');
  assert('`a & b` → AND(a,b)', result, 'AND(a,b)');
}

console.log('\n=== Test 108: Short notation — infix OR, XOR, EQ ===');
{
  assert('`a | b` → OR(a,b)', preprocessShortNotation('`a | b`'), 'OR(a,b)');
  assert('`a ^ b` → XOR(a,b)', preprocessShortNotation('`a ^ b`'), 'XOR(a,b)');
  assert('`a = b` → EQ(a,b)', preprocessShortNotation('`a = b`'), 'EQ(a,b)');
}

console.log('\n=== Test 109: Short notation — infix NAND, NOR, NXOR ===');
{
  assert('`a -& b` → NAND(a,b)', preprocessShortNotation('`a -& b`'), 'NAND(a,b)');
  assert('`a -| b` → NOR(a,b)', preprocessShortNotation('`a -| b`'), 'NOR(a,b)');
  assert('`a -^ b` → NXOR(a,b)', preprocessShortNotation('`a -^ b`'), 'NXOR(a,b)');
}

console.log('\n=== Test 110: Short notation — parentheses grouping ===');
{
  const result = preprocessShortNotation('`(a | b) & c`');
  assert('`(a | b) & c` → AND(OR(a,b),c)', result, 'AND(OR(a,b),c)');
}

console.log('\n=== Test 111: Short notation — nested parentheses ===');
{
  const result = preprocessShortNotation('`(a | b) & (c | d)`');
  assert('`(a | b) & (c | d)`', result, 'AND(OR(a,b),OR(c,d))');
}

console.log('\n=== Test 112: Short notation — left-to-right chaining ===');
{
  const result = preprocessShortNotation('`a | b | c`');
  assert('`a | b | c` → OR(OR(a,b),c)', result, 'OR(OR(a,b),c)');
}

console.log('\n=== Test 113: Short notation — mixed prefix + infix ===');
{
  const result = preprocessShortNotation('`& a -| b`');
  assert('`& a -| b` → NOR(AND(a),b)', result, 'NOR(AND(a),b)');
}

console.log('\n=== Test 114: Short notation — bit ranges ===');
{
  assert('`a.0/4 | b.0/4`', preprocessShortNotation('`a.0/4 | b.0/4`'), 'OR(a.0/4,b.0/4)');
  assert('`& a.1-2/3`', preprocessShortNotation('`& a.1-2/3`'), 'AND(a.1-2/3)');
}

console.log('\n=== Test 115: Short notation — NOT prefix ===');
{
  assert('`!a & b` → AND(!a,b)', preprocessShortNotation('`!a & b`'), 'AND(!a,b)');
  assert('`!(a | b)` → !OR(a,b)', preprocessShortNotation('`!(a | b)`'), '!OR(a,b)');
}

console.log('\n=== Test 116: Short notation — complex expression from spec ===');
{
  const result = preprocessShortNotation('`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`');
  assert('complex bit range expr', result, 'AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))');
}

console.log('\n=== Test 117: Short notation — context with assignment ===');
{
  const result = preprocessShortNotation('8wire c = `& (a | b)`');
  assert('8wire c = `& (a | b)`', result, '8wire c = AND(OR(a,b))');
}

console.log('\n=== Test 118: Short notation — context with def return ===');
{
  const result = preprocessShortNotation('   :4bit `(a | b)`');
  assert(':4bit `(a | b)`', result, '   :4bit OR(a,b)');
}

console.log('\n=== Test 119: Short notation — binary literal operand ===');
{
  assert('`^ 111` → XOR(111)', preprocessShortNotation('`^ 111`'), 'XOR(111)');
  assert('`a & 1010`', preprocessShortNotation('`a & 1010`'), 'AND(a,1010)');
}

console.log('\n=== Test 120: Short notation — hex literal with [] ===');
{
  assert('`^ [^F]` → XOR(^F)', preprocessShortNotation('`^ [^F]`'), 'XOR(^F)');
  assert('`a | [^FF]`', preprocessShortNotation('`a | [^FF]`'), 'OR(a,^FF)');
}

console.log('\n=== Test 121: Short notation — decimal literal with [] ===');
{
  assert('`a | [\\31]`', preprocessShortNotation('`a | [\\31]`'), 'OR(a,\\31)');
}

console.log('\n=== Test 122: Short notation — mixed literals ===');
{
  const result = preprocessShortNotation('`a | [^FF] | 111`');
  assert('`a | [^FF] | 111`', result, 'OR(OR(a,^FF),111)');
}

console.log('\n=== Test 123: Short notation — decimal literal without [] ===');
{
  const result = preprocessShortNotation('`a | \\31`');
  assert('`a | \\31`', result, 'OR(a,\\31)');
}

console.log('\n=== Test 124: Short notation — passthrough without backticks ===');
{
  const src = '8wire c = AND(a,b)';
  const result = preprocessShortNotation(src);
  assert('no backticks passthrough', result, src);
}

console.log('\n=== Test 125: Short notation — backtick in comment ignored ===');
{
  const src = '# `a | b`\n8wire c = 1';
  const result = preprocessShortNotation(src);
  assert('backtick in line comment ignored', result, src);
}

console.log('\n=== Test 126: Short notation — backtick in block comment ignored ===');
{
  const src = '#> `a | b` #<\n8wire c = 1';
  const result = preprocessShortNotation(src);
  assert('backtick in block comment ignored', result, src);
}

console.log('\n=== Test 127: Short notation — multiple backtick regions ===');
{
  const result = preprocessShortNotation('`a & b` + `c | d`');
  assert('two backtick regions', result, 'AND(a,b) + OR(c,d)');
}

console.log('\n=== Test 128: Short notation — unmatched backtick throws ===');
{
  assertThrows('unmatched backtick',
    () => preprocessShortNotation('`a | b'),
    'Unmatched backtick'
  );
}

console.log('\n=== Test 129: Short notation — via preprocessRepeat pipeline ===');
{
  const result = preprocessRepeat('8wire c = `& (a | b)`');
  assert('preprocessRepeat expands short notation', result, '8wire c = AND(OR(a,b))');
}

console.log('\n=== Test 130: Short notation — with repeat ===');
{
  const src = 'repeat 1..3[\n:1bit `a.? | b.?`\n]';
  const result = preprocessRepeat(src);
  const lines = result.trim().split('\n').filter(l => l.trim() !== '');
  assert('repeat + short notation line count', String(lines.length), '3');
  assert('repeat + short line 1', lines[0].trim(), ':1bit OR(a.1,b.1)');
  assert('repeat + short line 2', lines[1].trim(), ':1bit OR(a.2,b.2)');
  assert('repeat + short line 3', lines[2].trim(), ':1bit OR(a.3,b.3)');
}

console.log('\n=== Test 131: Short notation — special vars ===');
{
  assert('`~ & a` → AND(~,a)', preprocessShortNotation('`~ & a`'), 'AND(~,a)');
  assert('`a | %` → OR(a,%)', preprocessShortNotation('`a | %`'), 'OR(a,%)');
}

console.log('\n=== Test 132: Short notation — single operand passthrough ===');
{
  assert('`a` → a', preprocessShortNotation('`a`'), 'a');
}

console.log('\n=== Test 133: Short notation — & (a | b) as return line ===');
{
  const result = preprocessShortNotation('   :1bit `& (a | b)`');
  assert(':1bit `& (a | b)`', result, '   :1bit AND(OR(a,b))');
}

// ================================================================
// Oscillator Component — Parser tests
// ================================================================

{
  const parserChunk2 = tokenizerSrc + '\n' + preprocessorSrc + '\n' + parserSrc;
  const sandboxOsc = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object };
  const parserCode2 = parserChunk2 + `\nvar _ParserOsc = Parser; var _TokenizerOsc = Tokenizer; var _preprocessRepeatOsc = preprocessRepeat;`;
  vm.runInNewContext(parserCode2, sandboxOsc);
  const ParserOsc = sandboxOsc._ParserOsc;
  const TokenizerOsc = sandboxOsc._TokenizerOsc;
  const preprocessRepeatOsc = sandboxOsc._preprocessRepeatOsc;

  function parseOsc(code) {
    const processed = preprocessRepeatOsc(code);
    const p = new ParserOsc(new TokenizerOsc(processed));
    return p.parse();
  }

  console.log('\n=== Test 134: Parser — comp [osc] .o1: with attributes ===');
  {
    const stmts = parseOsc(`comp [osc] .o1:
  duration1: 2
  duration0: 6
  length: 4
  freq: 10
  eachCycle: 1
  :`);
    const s = stmts[0];
    assert('osc stmt has comp', String(s.comp !== undefined), 'true');
    assert('osc comp type is osc', s.comp.type, 'osc');
    assert('osc comp name is .o1', s.comp.name, '.o1');
    assert('osc duration1 is 2', String(s.comp.attributes.duration1), '2');
    assert('osc duration0 is 6', String(s.comp.attributes.duration0), '6');
    assert('osc length is 4', String(s.comp.attributes.length), '4');
    assert('osc freq is 10', String(s.comp.attributes.freq), '10');
    assert('osc eachCycle is 1', String(s.comp.attributes.eachCycle), '1');
  }

  console.log('\n=== Test 135: Parser — comp [~] .o2: shortname syntax ===');
  {
    const stmts = parseOsc(`comp [~] .o2:
  duration1: 1
  duration0: 7
  freq: 5
  :`);
    const s = stmts[0];
    assert('~ shortname has comp', String(s.comp !== undefined), 'true');
    assert('~ shortname type is osc', s.comp.type, 'osc');
    assert('~ shortname name is .o2', s.comp.name, '.o2');
    assert('~ shortname duration1 is 1', String(s.comp.attributes.duration1), '1');
    assert('~ shortname duration0 is 7', String(s.comp.attributes.duration0), '7');
    assert('~ shortname freq is 5', String(s.comp.attributes.freq), '5');
  }

  console.log('\n=== Test 136: Parser — comp [osc] .o3:: minimal (no attributes) ===');
  {
    const stmts = parseOsc('comp [osc] .o3::');
    const s = stmts[0];
    assert('minimal osc has comp', String(s.comp !== undefined), 'true');
    assert('minimal osc type is osc', s.comp.type, 'osc');
    assert('minimal osc name is .o3', s.comp.name, '.o3');
  }

  console.log('\n=== Test 137: Parser — comp [~] .o4:: minimal shortname ===');
  {
    const stmts = parseOsc('comp [~] .o4::');
    const s = stmts[0];
    assert('minimal ~ has comp', String(s.comp !== undefined), 'true');
    assert('minimal ~ type is osc', s.comp.type, 'osc');
    assert('minimal ~ name is .o4', s.comp.name, '.o4');
  }

  console.log('\n=== Test 138: Parser — comp [osc] with eachCycle: 0 (each state) ===');
  {
    const stmts = parseOsc(`comp [osc] .o5:
  eachCycle: 0
  :`);
    const s = stmts[0];
    assert('osc eachCycle: 0', String(s.comp.attributes.eachCycle), '0');
  }

  console.log('\n=== Test 139: Parser — comp [osc] with wire assignments ===');
  {
    const stmts = parseOsc(`comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  :
1wire osc1 = .osc1`);
    assert('osc + wire: 2 statements', String(stmts.length), '2');
    assert('first stmt is comp', String(stmts[0].comp !== undefined), 'true');
    assert('second stmt has decls', String(Array.isArray(stmts[1].decls)), 'true');
    assert('wire name is osc1', stmts[1].decls[0].name, 'osc1');
  }

  console.log('\n=== Test 140: Parser — comp [osc] with :get wire ===');
  {
    const stmts = parseOsc(`comp [osc] .osc1:
  freq: 2
  :
1wire v = .osc1:get`);
    assert('osc + :get wire: 2 statements', String(stmts.length), '2');
    const wireStmt = stmts[1];
    assert(':get wire has expr', String(wireStmt.expr !== null), 'true');
  }

  console.log('\n=== Test 141: Parser — comp [osc] with :counter wire ===');
  {
    const stmts = parseOsc(`comp [osc] .osc1:
  length: 4
  freq: 2
  :
4wire cnt = .osc1:counter`);
    assert('osc + :counter wire: 2 statements', String(stmts.length), '2');
    const wireStmt = stmts[1];
    assert(':counter wire has expr', String(wireStmt.expr !== null), 'true');
  }

  console.log('\n=== Test 142: Parser — comp [osc] full program with all outputs ===');
  {
    const stmts = parseOsc(`comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  eachCycle: 1
  :
1wire osc1 = .osc1
1wire osc1b = .osc1:get
4wire counter1 = .osc1:counter`);
    assert('full osc program: 4 statements', String(stmts.length), '4');
    assert('stmt 0 is comp osc', stmts[0].comp.type, 'osc');
    assert('stmt 1 wire osc1', stmts[1].decls[0].name, 'osc1');
    assert('stmt 2 wire osc1b', stmts[2].decls[0].name, 'osc1b');
    assert('stmt 3 wire counter1', stmts[3].decls[0].name, 'counter1');
  }
}

// ================================================================
// Oscillator Component — Tokenizer tests
// ================================================================

console.log('\n=== Test 143: Tokenizer — ~ inside [~] is SPECIAL token ===');
{
  const { tokens } = tokenize('comp [~] .osc1::');
  const specialTilde = tokens.filter(t => t.type === 'SPECIAL' && t.value === '~');
  assert('~ inside [] is SPECIAL', String(specialTilde.length), '1');
}

console.log('\n=== Test 144: Tokenizer — osc as ID token ===');
{
  const { tokens } = tokenize('comp [osc] .osc1::');
  const oscId = tokens.filter(t => t.type === 'ID' && t.value === 'osc');
  assert('osc is ID token', String(oscId.length), '1');
}

console.log('\n=== Test 145: Tokenizer — :counter after component name ===');
{
  const { tokens } = tokenize('4wire cnt = .osc1:counter');
  const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
  const counterTok = tokens.filter(t => t.type === 'ID' && t.value === 'counter');
  assert(':counter has colon SYM', String(colonTok.length >= 1), 'true');
  assert(':counter has counter ID', String(counterTok.length), '1');
}

console.log('\n=== Test 146: Tokenizer — :get after osc component ===');
{
  const { tokens } = tokenize('1wire v = .osc1:get');
  const getTok = tokens.filter(t => t.type === 'ID' && t.value === 'get');
  assert(':get has get ID token', String(getTok.length), '1');
}

console.log('\n=== Test 147: Tokenizer — comp [~] with all attributes ===');
{
  const src = `comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  eachCycle: 1
  :`;
  const { tokens } = tokenize(src);
  const duration1Tok = tokens.filter(t => t.type === 'ID' && t.value === 'duration1');
  const duration0Tok = tokens.filter(t => t.type === 'ID' && t.value === 'duration0');
  const freqTok = tokens.filter(t => t.type === 'ID' && t.value === 'freq');
  const eachCycleTok = tokens.filter(t => t.type === 'ID' && t.value === 'eachCycle');
  assert('duration1 tokenized', String(duration1Tok.length), '1');
  assert('duration0 tokenized', String(duration0Tok.length), '1');
  assert('freq tokenized', String(freqTok.length), '1');
  assert('eachCycle tokenized', String(eachCycleTok.length), '1');
}

// ================================================================
// Oscillator — freqIsSec attribute tests
// ================================================================

{
  const parserChunk3 = tokenizerSrc + '\n' + preprocessorSrc + '\n' + parserSrc;
  const sandboxFreq = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object };
  const parserCode3 = parserChunk3 + `\nvar _ParserF = Parser; var _TokenizerF = Tokenizer; var _preprocessRepeatF = preprocessRepeat;`;
  vm.runInNewContext(parserCode3, sandboxFreq);
  const ParserF = sandboxFreq._ParserF;
  const TokenizerF = sandboxFreq._TokenizerF;
  const preprocessRepeatF = sandboxFreq._preprocessRepeatF;

  function parseFreq(code) {
    const processed = preprocessRepeatF(code);
    const p = new ParserF(new TokenizerF(processed));
    return p.parse();
  }

  console.log('\n=== Test 148: Parser — comp [osc] with freqIsSec: 0 (Hz mode, default) ===');
  {
    const stmts = parseFreq(`comp [osc] .o1:
  freq: 10
  freqIsSec: 0
  :`);
    const s = stmts[0];
    assert('freqIsSec: 0 parsed', String(s.comp.attributes.freqIsSec), '0');
    assert('freq: 10 parsed', String(s.comp.attributes.freq), '10');
  }

  console.log('\n=== Test 149: Parser — comp [osc] with freqIsSec: 1 (seconds mode) ===');
  {
    const stmts = parseFreq(`comp [osc] .o2:
  freq: 5
  freqIsSec: 1
  :`);
    const s = stmts[0];
    assert('freqIsSec: 1 parsed', String(s.comp.attributes.freqIsSec), '1');
    assert('freq: 5 parsed', String(s.comp.attributes.freq), '5');
  }

  console.log('\n=== Test 150: Parser — comp [~] freqIsSec: 1 with large period ===');
  {
    const stmts = parseFreq(`comp [~] .slow:
  freq: 30
  freqIsSec: 1
  duration1: 1
  duration0: 1
  :`);
    const s = stmts[0];
    assert('slow osc freqIsSec: 1', String(s.comp.attributes.freqIsSec), '1');
    assert('slow osc freq: 30', String(s.comp.attributes.freq), '30');
    assert('slow osc duration1: 1', String(s.comp.attributes.duration1), '1');
    assert('slow osc duration0: 1', String(s.comp.attributes.duration0), '1');
  }

  console.log('\n=== Test 151: Parser — comp [osc] without freqIsSec (default omitted) ===');
  {
    const stmts = parseFreq(`comp [osc] .o3:
  freq: 2
  :`);
    const s = stmts[0];
    assert('freqIsSec absent from attributes', String(s.comp.attributes.freqIsSec), 'undefined');
    assert('freq: 2 still parsed', String(s.comp.attributes.freq), '2');
  }

  console.log('\n=== Test 152: Parser — comp [osc] full program with freqIsSec: 1 ===');
  {
    const stmts = parseFreq(`comp [~] .osc1:
  duration1: 4
  duration0: 4
  length: 8
  freq: 10
  freqIsSec: 1
  eachCycle: 1
  :
1wire v = .osc1
8wire cnt = .osc1:counter`);
    assert('full freqIsSec program: 3 statements', String(stmts.length), '3');
    assert('comp type osc', stmts[0].comp.type, 'osc');
    assert('freqIsSec: 1', String(stmts[0].comp.attributes.freqIsSec), '1');
    assert('freq: 10', String(stmts[0].comp.attributes.freq), '10');
    assert('length: 8', String(stmts[0].comp.attributes.length), '8');
  }
}

console.log('\n=== Test 153: Tokenizer — freqIsSec tokenized as ID ===');
{
  const src = `comp [~] .osc1:
  freq: 5
  freqIsSec: 1
  :`;
  const { tokens } = tokenize(src);
  const freqIsSecTok = tokens.filter(t => t.type === 'ID' && t.value === 'freqIsSec');
  assert('freqIsSec is ID token', String(freqIsSecTok.length), '1');
}

// ================================================================
// Component Registry & Extraction Tests
// ================================================================

console.log('\n=== Test 200: Component Registry — all types registered ===');
{
  const componentFiles = [
    'component-base', 'builtin-component', 'component-registry',
    'led', 'switch', 'key', 'dip', 'seven-seg', 'lcd',
    'adder', 'subtract', 'multiplier', 'divider', 'shifter',
    'mem', 'reg', 'counter', 'osc', 'rotary', 'pcb-component', 'index'
  ];
  let componentsSrc = '';
  for (const f of componentFiles) {
    componentsSrc += fs.readFileSync(`./core/components/${f}.js`, 'utf-8')
      .replace(/^var \w+ = \(typeof require\b.*$/gm, '')
      .replace(/^if \(typeof module\b.*\n.*module\.exports.*\n\}/gm, '') + '\n';
  }

  const fullChunk = tokenizerSrc + '\n' + preprocessorSrc + '\n' + componentsSrc + '\n' + parserSrc;
  const sb = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, setTimeout, JSON, Number, isNaN };
  const code = fullChunk + `\nvar _CR = createComponentRegistry; var _P = Parser; var _T = Tokenizer; var _PR = preprocessRepeat;`;
  vm.runInNewContext(code, sb);
  const registry = sb._CR();
  const Parser3 = sb._P;
  const Tokenizer3 = sb._T;
  const preprocessRepeat3 = sb._PR;

  const expectedTypes = ['led', 'switch', 'key', 'dip', '7seg', 'lcd', 'adder', 'subtract', 'multiplier', 'divider', 'shifter', 'mem', 'reg', 'counter', 'osc', 'rotary'];
  for (const t of expectedTypes) {
    assert(`registry has ${t}`, String(registry.has(t)), 'true');
  }

  console.log('\n=== Test 201: Component Registry — getWidthBits ===');
  assert('led bits', String(registry.get('led').getWidthBits({})), '1');
  assert('switch bits', String(registry.get('switch').getWidthBits({})), '1');
  assert('7seg bits', String(registry.get('7seg').getWidthBits({})), '8');
  assert('lcd bits', String(registry.get('lcd').getWidthBits({})), '8');
  assert('dip default bits', String(registry.get('dip').getWidthBits({})), '4');
  assert('dip with length 8', String(registry.get('dip').getWidthBits({length: '8'})), '8');
  assert('adder default bits', String(registry.get('adder').getWidthBits({})), '4');
  assert('adder depth 8', String(registry.get('adder').getWidthBits({depth: '8'})), '8');
  assert('osc bits', String(registry.get('osc').getWidthBits({})), '1');
  assert('rotary default bits', String(registry.get('rotary').getWidthBits({})), '3');
  assert('rotary 4 states', String(registry.get('rotary').getWidthBits({states: '4'})), '2');

  console.log('\n=== Test 202: Component Registry — shortnames ===');
  const shortnames = registry.getShortnames();
  assert('shortname 7', shortnames['7'], '7seg');
  assert('shortname +', shortnames['+'], 'adder');
  assert('shortname -', shortnames['-'], 'subtract');
  assert('shortname *', shortnames['*'], 'multiplier');
  assert('shortname /', shortnames['/'], 'divider');
  assert('shortname >', shortnames['>'], 'shifter');
  assert('shortname =', shortnames['='], 'counter');
  assert('shortname ~', shortnames['~'], 'osc');

  console.log('\n=== Test 203: Component Registry — supportsProperty ===');
  assert('led supports get', String(registry.supportsProperty('led', 'get')), 'true');
  assert('adder supports get', String(registry.supportsProperty('adder', 'get')), 'true');
  assert('adder supports carry', String(registry.supportsProperty('adder', 'carry')), 'true');
  assert('divider supports mod', String(registry.supportsProperty('divider', 'mod')), 'true');
  assert('multiplier supports over', String(registry.supportsProperty('multiplier', 'over')), 'true');
  assert('shifter supports out', String(registry.supportsProperty('shifter', 'out')), 'true');
  assert('osc supports counter', String(registry.supportsProperty('osc', 'counter')), 'true');

  console.log('\n=== Test 204: Component Registry — supportsRedirect ===');
  assert('adder redirect carry', String(registry.supportsRedirect('adder', 'carry')), 'true');
  assert('divider redirect mod', String(registry.supportsRedirect('divider', 'mod')), 'true');
  assert('multiplier redirect over', String(registry.supportsRedirect('multiplier', 'over')), 'true');
  assert('shifter redirect out', String(registry.supportsRedirect('shifter', 'out')), 'true');
  assert('led no carry', String(registry.supportsRedirect('led', 'carry')), 'false');

  console.log('\n=== Test 205: Component Registry — reservedNames ===');
  const reserved = registry.getReservedNames();
  assert('led is reserved', String(reserved.includes('led')), 'true');
  assert('switch is reserved', String(reserved.includes('switch')), 'true');
  assert('key is NOT reserved', String(reserved.includes('key')), 'false');
  assert('osc is NOT reserved', String(reserved.includes('osc')), 'false');
  assert('reg is NOT reserved', String(reserved.includes('reg')), 'false');

  console.log('\n=== Test 206: Component Registry — specialParseAttributes ===');
  const sevenSegAttrs = registry.get('7seg').getSpecialParseAttributes();
  assert('7seg has segAttributes', String(sevenSegAttrs !== null), 'true');
  assert('7seg segAttributes length', String(sevenSegAttrs.segAttributes.length), '8');
  assert('led has no special attrs', String(registry.get('led').getSpecialParseAttributes()), 'null');

  console.log('\n=== Test 207: Parser with registry — parseComp led ===');
  {
    const processed = preprocessRepeat3('comp [led] .myled::');
    const p = new Parser3(new Tokenizer3(processed), registry);
    const stmts = p.parse();
    assert('comp type is led', stmts[0].comp.type, 'led');
    assert('comp name is .myled', stmts[0].comp.name, '.myled');
  }

  console.log('\n=== Test 208: Parser with registry — parseComp 7seg shortname ===');
  {
    const processed = preprocessRepeat3('comp [7] .display::');
    const p = new Parser3(new Tokenizer3(processed), registry);
    const stmts = p.parse();
    assert('comp type is 7seg', stmts[0].comp.type, '7seg');
  }

  console.log('\n=== Test 209: Parser with registry — parseComp adder shortname ===');
  {
    const processed = preprocessRepeat3('comp [+] .add1: depth:8 :');
    const p = new Parser3(new Tokenizer3(processed), registry);
    const stmts = p.parse();
    assert('comp type is adder', stmts[0].comp.type, 'adder');
    assert('adder depth is 8', String(stmts[0].comp.attributes.depth), '8');
  }

  console.log('\n=== Test 210: Parser with registry — parseComp osc ===');
  {
    const processed = preprocessRepeat3('comp [~] .osc1::');
    const p = new Parser3(new Tokenizer3(processed), registry);
    const stmts = p.parse();
    assert('comp type is osc', stmts[0].comp.type, 'osc');
  }

  console.log('\n=== Test 211: getForbidDirectAssign / handleDirectAssign ===');
  // mem now supports direct assignment via handleDirectAssign (bulk init), so getForbidDirectAssign is null
  assert('mem allows direct assign (handleDirectAssign)', String(registry.get('mem').getForbidDirectAssign()), 'null');
  assert('counter forbids', String(registry.get('counter').getForbidDirectAssign() !== null), 'true');
  assert('osc forbids', String(registry.get('osc').getForbidDirectAssign() !== null), 'true');
  assert('led allows', String(registry.get('led').getForbidDirectAssign()), 'null');
  assert('adder allows', String(registry.get('adder').getForbidDirectAssign()), 'null');

  console.log('\n=== Test 212: hexTo7Seg static method ===');
  const SevenSegComp = registry.get('7seg');
  assert('hex 0 -> 1111110', SevenSegComp.constructor.hexTo7Seg('0000'), '1111110');
  assert('hex 1 -> 0110000', SevenSegComp.constructor.hexTo7Seg('0001'), '0110000');
  assert('hex F -> 1000111', SevenSegComp.constructor.hexTo7Seg('1111'), '1000111');

  // ================================================================
  // Oscillator :reset property tests
  // ================================================================

  console.log('\n=== Test 213: osc supports reset property ===');
  assert('osc supports reset', String(registry.supportsProperty('osc', 'reset')), 'true');

  console.log('\n=== Test 214: osc getSupportedProperties includes reset ===');
  {
    const oscHandler = registry.get('osc');
    const props = oscHandler.getSupportedProperties();
    assert('reset in supported props', String(props.includes('reset')), 'true');
    assert('get still in supported props', String(props.includes('get')), 'true');
    assert('counter still in supported props', String(props.includes('counter')), 'true');
  }

  console.log('\n=== Test 215: osc applyProperties resets counter when reset=1 ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '101010', length: 6 }
    };
    const pending = {
      reset: { expr: null, value: '1' }
    };
    oscHandler.applyProperties(comp, '.osc1', pending, 'immediate', false, {});
    assert('counter reset to 000000', comp.oscState.counterValue, '000000');
  }

  console.log('\n=== Test 216: osc applyProperties does NOT reset when reset=0 ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '101010', length: 6 }
    };
    const pending = {
      reset: { expr: null, value: '0' }
    };
    oscHandler.applyProperties(comp, '.osc1', pending, 'immediate', false, {});
    assert('counter unchanged at 101010', comp.oscState.counterValue, '101010');
  }

  console.log('\n=== Test 217: osc applyProperties skips when when!=immediate ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '111111', length: 6 }
    };
    const pending = {
      reset: { expr: null, value: '1' }
    };
    oscHandler.applyProperties(comp, '.osc1', pending, 'next', false, {});
    assert('counter unchanged on when=next', comp.oscState.counterValue, '111111');
  }

  console.log('\n=== Test 218: osc applyProperties skips when no pending ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '001100', length: 6 }
    };
    oscHandler.applyProperties(comp, '.osc1', null, 'immediate', false, {});
    assert('counter unchanged on null pending', comp.oscState.counterValue, '001100');
  }

  console.log('\n=== Test 219: osc applyProperties skips when no reset in pending ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '110011', length: 6 }
    };
    const pending = {};
    oscHandler.applyProperties(comp, '.osc1', pending, 'immediate', false, {});
    assert('counter unchanged without reset key', comp.oscState.counterValue, '110011');
  }

  console.log('\n=== Test 220: osc applyProperties resets with multi-bit value ending in 1 ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '1010', length: 4 }
    };
    const pending = {
      reset: { expr: null, value: '01' }
    };
    oscHandler.applyProperties(comp, '.osc1', pending, 'immediate', false, {});
    assert('counter reset with value 01 (last bit 1)', comp.oscState.counterValue, '0000');
  }

  console.log('\n=== Test 221: osc applyProperties does NOT reset with multi-bit value ending in 0 ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '1010', length: 4 }
    };
    const pending = {
      reset: { expr: null, value: '10' }
    };
    oscHandler.applyProperties(comp, '.osc1', pending, 'immediate', false, {});
    assert('counter unchanged with value 10 (last bit 0)', comp.oscState.counterValue, '1010');
  }

  console.log('\n=== Test 222: osc applyProperties with reEvaluate re-evaluates expression ===');
  {
    const oscHandler = registry.get('osc');
    const comp = {
      oscState: { counterValue: '111000', length: 6 }
    };
    const mockCtx = {
      evalExpr: function(expr) {
        return [{ value: '1' }];
      },
      getValueFromRef: function() { return null; }
    };
    const pending = {
      reset: { expr: [{ bin: '1' }], value: '0' }
    };
    oscHandler.applyProperties(comp, '.osc1', pending, 'immediate', true, mockCtx);
    assert('counter reset after reEval to 1', comp.oscState.counterValue, '000000');
  }

  console.log('\n=== Test 223: Parser — osc property block with reset and set ===');
  {
    const processed = preprocessRepeat3(`comp [~] .osc1:
  length: 6
  freq: 2
  :
6wire cnt = .osc1:counter
.osc1:{
  reset = 1
  set = EQ(cnt, 001010)
}`);
    const p = new Parser3(new Tokenizer3(processed), registry);
    const stmts = p.parse();
    assert('3 statements parsed', String(stmts.length), '3');
    assert('stmt 0 is comp osc', stmts[0].comp.type, 'osc');
    assert('stmt 2 is property block', String(stmts[2].componentPropertyBlock !== undefined), 'true');
    const block = stmts[2].componentPropertyBlock;
    assert('block component is .osc1', block.component, '.osc1');
    assert('block has 2 properties', String(block.properties.length), '2');
    assert('block prop 0 is reset', block.properties[0].property, 'reset');
    assert('block prop 1 is set', block.properties[1].property, 'set');
  }
}

// ================================================================
// doc() Tests — tokenizer + parser + interpreter
// ================================================================

{
  // Bootstrap complet: tokenizer + preprocessor + componente + parser + interpreter
  const interpreterSrc = fs.readFileSync('./core/interpreter.js', 'utf-8');
  const componentFiles = [
    'component-base', 'builtin-component', 'component-registry',
    'led', 'switch', 'key', 'dip', 'seven-seg', 'lcd',
    'adder', 'subtract', 'multiplier', 'divider', 'shifter',
    'mem', 'reg', 'counter', 'osc', 'rotary', 'pcb-component', 'index'
  ];
  let componentsSrc = '';
  for (const f of componentFiles) {
    componentsSrc += fs.readFileSync(`./core/components/${f}.js`, 'utf-8')
      .replace(/^var \w+ = \(typeof require\b.*$/gm, '')
      .replace(/^if \(typeof module\b.*\n.*module\.exports.*\n\}/gm, '') + '\n';
  }

  const fullChunk = tokenizerSrc + '\n' + preprocessorSrc + '\n' + componentsSrc + '\n' + parserSrc + '\n' + interpreterSrc;
  const sbDoc = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, setTimeout, clearTimeout, JSON, Number, isNaN };
  const codeDoc = fullChunk + `
var _CR = createComponentRegistry;
var _P = Parser;
var _T = Tokenizer;
var _PR = preprocessRepeat;
var _I = Interpreter;
`;
  vm.runInNewContext(codeDoc, sbDoc);
  const registryDoc = sbDoc._CR();
  const ParserDoc = sbDoc._P;
  const TokenizerDoc = sbDoc._T;
  const preprocessDoc = sbDoc._PR;
  const InterpreterDoc = sbDoc._I;

  function runDoc(src) {
    const processed = preprocessDoc(src);
    const p = new ParserDoc(new TokenizerDoc(processed), registryDoc);
    const stmts = p.parse();
    const out = [];
    const interp = new InterpreterDoc(p.funcs, out, p.pcbs, registryDoc);
    for (const s of stmts) interp.exec(s);
    return out;
  }

  function runArith(src) {
    const processed = preprocessDoc(src);
    const p = new ParserDoc(new TokenizerDoc(processed), registryDoc);
    const stmts = p.parse();
    const out = [];
    const interp = new InterpreterDoc(p.funcs, out, p.pcbs, registryDoc);
    for (const s of stmts) interp.exec(s);
    return interp;
  }

  function getWire(interp, name) {
    const w = interp.wires.get(name);
    if (!w) return null;
    return interp.getValueFromRef(w.ref);
  }

  // ---- Tokenizer: 'doc' este KEYWORD ----
  console.log('\n=== Test 300: Tokenizer — doc este KEYWORD ===');
  {
    const processed = preprocessDoc('doc(OR)');
    const t = new TokenizerDoc(processed);
    const tok = t.get();
    assert('doc tokenizat ca KEYWORD', tok.type, 'KEYWORD');
    assert('doc valoare corecta', tok.value, 'doc');
  }

  // ---- Parser: doc(OR) produce {doc: 'OR'} ----
  console.log('\n=== Test 301: Parser — doc(OR) produce nodul AST corect ===');
  {
    const processed = preprocessDoc('doc(OR)');
    const p = new ParserDoc(new TokenizerDoc(processed), registryDoc);
    const stmts = p.parse();
    assert('1 statement', String(stmts.length), '1');
    assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
    assert('doc.name este OR', stmts[0].doc, 'OR');
  }

  // ---- Parser: doc(MUX1) — token MUX ----
  console.log('\n=== Test 302: Parser — doc(MUX1) accepta token MUX ===');
  {
    const processed = preprocessDoc('doc(MUX1)');
    const p = new ParserDoc(new TokenizerDoc(processed), registryDoc);
    const stmts = p.parse();
    assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
    assert('doc.name este MUX1', stmts[0].doc, 'MUX1');
  }

  // ---- Parser: doc(REG8) — token REG ----
  console.log('\n=== Test 303: Parser — doc(REG8) accepta token REG ===');
  {
    const processed = preprocessDoc('doc(REG8)');
    const p = new ParserDoc(new TokenizerDoc(processed), registryDoc);
    const stmts = p.parse();
    assert('doc.name este REG8', stmts[0].doc, 'REG8');
  }

  // ---- Interpreter: BUILTIN_DOC table ----
  console.log('\n=== Test 304: BUILTIN_DOC — NOT ===');
  {
    const lines = InterpreterDoc.getDocLines('NOT', new Map());
    assert('NOT semnatura', lines[0], 'NOT(Xbit) -> Xbit');
  }

  console.log('\n=== Test 305: BUILTIN_DOC — OR are 2 semnaturi ===');
  {
    const lines = InterpreterDoc.getDocLines('OR', new Map());
    assert('OR 2 semnaturi', String(lines.length), '2');
    assert('OR semnatura 1', lines[0], 'OR(Xbit) -> 1bit');
    assert('OR semnatura 2', lines[1], 'OR(Xbit, Xbit) -> Xbit');
  }

  console.log('\n=== Test 306: BUILTIN_DOC — EQ are 1 semnatura ===');
  {
    const lines = InterpreterDoc.getDocLines('EQ', new Map());
    assert('EQ 1 semnatura', String(lines.length), '1');
    assert('EQ semnatura', lines[0], 'EQ(Xbit, Xbit) -> 1bit');
  }

  console.log('\n=== Test 307: BUILTIN_DOC — MUX1 ===');
  {
    const lines = InterpreterDoc.getDocLines('MUX1', new Map());
    assert('MUX1 semnatura', lines[0], 'MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit');
  }

  console.log('\n=== Test 308: BUILTIN_DOC — MUX2 ===');
  {
    const lines = InterpreterDoc.getDocLines('MUX2', new Map());
    assert('MUX2 semnatura', lines[0], 'MUX2(2bit sel, Xbit data0, Xbit data1, Xbit data2, Xbit data3) -> Xbit');
  }

  console.log('\n=== Test 309: BUILTIN_DOC — MUX3 ===');
  {
    const lines = InterpreterDoc.getDocLines('MUX3', new Map());
    assert('MUX3 are 8 intrari', String(lines[0].includes('data7')), 'true');
  }

  console.log('\n=== Test 310: BUILTIN_DOC — DEMUX1 ===');
  {
    const lines = InterpreterDoc.getDocLines('DEMUX1', new Map());
    assert('DEMUX1 semnatura', lines[0], 'DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit');
  }

  console.log('\n=== Test 311: BUILTIN_DOC — DEMUX2 ===');
  {
    const lines = InterpreterDoc.getDocLines('DEMUX2', new Map());
    assert('DEMUX2 semnatura', lines[0], 'DEMUX2(2bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit');
  }

  console.log('\n=== Test 312: BUILTIN_DOC — LSHIFT are 2 semnaturi ===');
  {
    const lines = InterpreterDoc.getDocLines('LSHIFT', new Map());
    assert('LSHIFT 2 semnaturi', String(lines.length), '2');
    assert('LSHIFT semnatura 1', lines[0], 'LSHIFT(Xbit data, Nbit n) -> Xbit');
    assert('LSHIFT semnatura 2', lines[1], 'LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit');
  }

  console.log('\n=== Test 313: BUILTIN_DOC — RSHIFT are 2 semnaturi ===');
  {
    const lines = InterpreterDoc.getDocLines('RSHIFT', new Map());
    assert('RSHIFT 2 semnaturi', String(lines.length), '2');
  }

  console.log('\n=== Test 314: BUILTIN_DOC — LATCH ===');
  {
    const lines = InterpreterDoc.getDocLines('LATCH', new Map());
    assert('LATCH semnatura', lines[0], 'LATCH(Xbit data, 1bit clock) -> Xbit');
  }

  // ---- REGn pattern dinamic ----
  console.log('\n=== Test 315: getDocLines — REG4 dinamic ===');
  {
    const lines = InterpreterDoc.getDocLines('REG4', new Map());
    assert('REG4 semnatura', lines[0], 'REG4(4bit data, 1bit clock, 1bit clear) -> 4bit');
  }

  console.log('\n=== Test 316: getDocLines — REG16 dinamic ===');
  {
    const lines = InterpreterDoc.getDocLines('REG16', new Map());
    assert('REG16 semnatura', lines[0], 'REG16(16bit data, 1bit clock, 1bit clear) -> 16bit');
  }

  // ---- Functie user-defined ----
  console.log('\n=== Test 317: getDocLines — functie user-defined fara return ===');
  {
    const funcs = new Map();
    funcs.set('myGate', {
      params: [{ type: '8bit', id: 'a' }, { type: '1bit', id: 'b' }],
      returns: []
    });
    const lines = InterpreterDoc.getDocLines('myGate', funcs);
    assert('myGate semnatura', lines[0], 'myGate(8bit a, 1bit b)');
  }

  console.log('\n=== Test 318: getDocLines — functie user-defined cu return ===');
  {
    const funcs = new Map();
    funcs.set('split', {
      params: [{ type: '8bit', id: 'x' }],
      returns: [{ type: '4bit' }, { type: '4bit' }]
    });
    const lines = InterpreterDoc.getDocLines('split', funcs);
    assert('split semnatura cu return', lines[0], 'split(8bit x) -> 4bit, 4bit');
  }

  // ---- Functie necunoscuta ----
  console.log('\n=== Test 319: getDocLines — functie necunoscuta ===');
  {
    const lines = InterpreterDoc.getDocLines('Foo', new Map());
    assert('Foo necunoscuta', lines[0], 'Foo: funcție nedefinită');
  }

  // ---- Interpreter end-to-end: doc(OR) ----
  console.log('\n=== Test 320: Interpreter end-to-end — doc(OR) in out ===');
  {
    const out = runDoc('doc(OR)');
    assert('OR linia 1', out[0], 'OR(Xbit) -> 1bit');
    assert('OR linia 2', out[1], 'OR(Xbit, Xbit) -> Xbit');
  }

  // ---- Interpreter end-to-end: doc(NOT) ----
  console.log('\n=== Test 321: Interpreter end-to-end — doc(NOT) ===');
  {
    const out = runDoc('doc(NOT)');
    assert('NOT linia 1', out[0], 'NOT(Xbit) -> Xbit');
    assert('NOT o singura linie', String(out.length), '1');
  }

  // ---- Interpreter end-to-end: doc(MUX1) ----
  console.log('\n=== Test 322: Interpreter end-to-end — doc(MUX1) ===');
  {
    const out = runDoc('doc(MUX1)');
    assert('MUX1 semnatura completa', out[0], 'MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit');
  }

  // ---- Interpreter end-to-end: doc(REG8) ----
  console.log('\n=== Test 323: Interpreter end-to-end — doc(REG8) ===');
  {
    const out = runDoc('doc(REG8)');
    assert('REG8 semnatura', out[0], 'REG8(8bit data, 1bit clock, 1bit clear) -> 8bit');
  }

  // ---- Interpreter end-to-end: doc(DEMUX2) ----
  console.log('\n=== Test 324: Interpreter end-to-end — doc(DEMUX2) ===');
  {
    const out = runDoc('doc(DEMUX2)');
    assert('DEMUX2 semnatura', out[0], 'DEMUX2(2bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit');
  }

  // ---- Interpreter end-to-end: functie user-defined ----
  console.log('\n=== Test 325: Interpreter end-to-end — doc(myFunc) user-defined ===');
  {
    const src = `def myFunc(8bit a, 1bit b):
  :1bit OR(a, b)
doc(myFunc)`;
    const out = runDoc(src);
    assert('myFunc semnatura cu return', out[0], 'myFunc(8bit a, 1bit b) -> 1bit');
  }

  // ---- Interpreter end-to-end: functie necunoscuta ----
  console.log('\n=== Test 326: Interpreter end-to-end — doc(Unknown) ===');
  {
    const out = runDoc('doc(Unknown)');
    assert('Unknown nedefinita', out[0], 'Unknown: funcție nedefinită');
  }

  // ---- Toate portile logice ----
  console.log('\n=== Test 327: Toate portile AND NAND NOR NXOR XOR ===');
  {
    for (const gate of ['AND', 'NAND', 'NOR', 'NXOR', 'XOR']) {
      const lines = InterpreterDoc.getDocLines(gate, new Map());
      assert(`${gate} are 2 semnaturi`, String(lines.length), '2');
      assert(`${gate} semnatura 1 bit`, lines[0], `${gate}(Xbit) -> 1bit`);
      assert(`${gate} semnatura 2 biti`, lines[1], `${gate}(Xbit, Xbit) -> Xbit`);
    }
  }

  // ---- BUILTIN_DOC: ADD, SUBTRACT, MULTIPLY, DIVIDE ----
  console.log('\n=== Test 328: BUILTIN_DOC — ADD signature ===');
  {
    const lines = InterpreterDoc.getDocLines('ADD', new Map());
    assert('ADD 1 signature', String(lines.length), '1');
    assert('ADD signature', lines[0], 'ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry');
  }

  console.log('\n=== Test 329: BUILTIN_DOC — SUBTRACT signature ===');
  {
    const lines = InterpreterDoc.getDocLines('SUBTRACT', new Map());
    assert('SUBTRACT 1 signature', String(lines.length), '1');
    assert('SUBTRACT signature', lines[0], 'SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry');
  }

  console.log('\n=== Test 330: BUILTIN_DOC — MULTIPLY signature ===');
  {
    const lines = InterpreterDoc.getDocLines('MULTIPLY', new Map());
    assert('MULTIPLY 1 signature', String(lines.length), '1');
    assert('MULTIPLY signature', lines[0], 'MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over');
  }

  console.log('\n=== Test 331: BUILTIN_DOC — DIVIDE signature ===');
  {
    const lines = InterpreterDoc.getDocLines('DIVIDE', new Map());
    assert('DIVIDE 1 signature', String(lines.length), '1');
    assert('DIVIDE signature', lines[0], 'DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod');
  }

  // ---- doc(def): built-in and user-defined listing ----
  console.log('\n=== Test 332: doc(def) — lists built-in and user-defined separately ===');
  {
    const funcs = new Map();
    funcs.set('myFunc', { params: [{ type: '4bit', id: 'x' }], returns: [{ type: '4bit' }] });
    funcs.set('helper', { params: [], returns: [] });
    const lines = InterpreterDoc.getDocLines('def', funcs);
    assert('first line is built-in:', lines[0], 'built-in:');
    // built-in list contains ADD, SUBTRACT, MULTIPLY, DIVIDE
    assert('built-in list contains ADD', String(lines[1].includes('ADD')), 'true');
    assert('built-in list contains SUBTRACT', String(lines[1].includes('SUBTRACT')), 'true');
    assert('built-in list contains MULTIPLY', String(lines[1].includes('MULTIPLY')), 'true');
    assert('built-in list contains DIVIDE', String(lines[1].includes('DIVIDE')), 'true');
    assert('built-in list contains NOT', String(lines[1].includes('NOT')), 'true');
    assert('built-in list contains AND', String(lines[1].includes('AND')), 'true');
    // user defined section
    assert('user defined: label present', lines[3], 'user defined:');
    assert('user functions listed', String(lines[4].includes('myFunc')), 'true');
    assert('user functions listed helper', String(lines[4].includes('helper')), 'true');
  }

  console.log('\n=== Test 333: doc(def) — no user-defined functions shows (none) ===');
  {
    const lines = InterpreterDoc.getDocLines('def', new Map());
    assert('no user-defined shows (none)', lines[4], '(none)');
  }

  // ---- Interpreter end-to-end: doc(ADD) ----
  console.log('\n=== Test 334: Interpreter end-to-end — doc(ADD) ===');
  {
    const out = runDoc('doc(ADD)');
    assert('ADD signature in output', out[0], 'ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry');
  }

  console.log('\n=== Test 335: Interpreter end-to-end — doc(SUBTRACT) ===');
  {
    const out = runDoc('doc(SUBTRACT)');
    assert('SUBTRACT signature in output', out[0], 'SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry');
  }

  console.log('\n=== Test 336: Interpreter end-to-end — doc(MULTIPLY) ===');
  {
    const out = runDoc('doc(MULTIPLY)');
    assert('MULTIPLY signature in output', out[0], 'MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over');
  }

  console.log('\n=== Test 337: Interpreter end-to-end — doc(DIVIDE) ===');
  {
    const out = runDoc('doc(DIVIDE)');
    assert('DIVIDE signature in output', out[0], 'DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod');
  }

  // ---- ADD arithmetic ----
  console.log('\n=== Test 338: ADD — 4bit addition without carry ===');
  {
    // 0011 + 0001 = 0100, carry = 0
    const interp = runArith('4wire idx = 0011\n4wire inc = 0001\n4wire nextIdx, 1wire carry = ADD(idx, inc)');
    assert('ADD 0011+0001 result', getWire(interp, 'nextIdx'), '0100');
    assert('ADD 0011+0001 carry', getWire(interp, 'carry'), '0');
  }

  console.log('\n=== Test 339: ADD — 4bit addition with carry (overflow) ===');
  {
    // 1111 + 0001 = 0000, carry = 1
    const interp = runArith('4wire idx = 1111\n4wire inc = 0001\n4wire nextIdx, 1wire carry = ADD(idx, inc)');
    assert('ADD 1111+0001 result', getWire(interp, 'nextIdx'), '0000');
    assert('ADD 1111+0001 carry', getWire(interp, 'carry'), '1');
  }

  console.log('\n=== Test 340: ADD — 8bit addition ===');
  {
    // 00001111 + 00000001 = 00010000, carry = 0
    const interp = runArith('8wire a = 00001111\n8wire b = 00000001\n8wire r, 1wire c = ADD(a, b)');
    assert('ADD 8bit result', getWire(interp, 'r'), '00010000');
    assert('ADD 8bit carry 0', getWire(interp, 'c'), '0');
  }

  console.log('\n=== Test 341: ADD — all-ones + 1 produces zero with carry ===');
  {
    // 11111111 + 00000001 = 00000000, carry = 1
    const interp = runArith('8wire a = 11111111\n8wire b = 00000001\n8wire r, 1wire c = ADD(a, b)');
    assert('ADD 8bit all-ones+1 result', getWire(interp, 'r'), '00000000');
    assert('ADD 8bit all-ones+1 carry', getWire(interp, 'c'), '1');
  }

  // ---- SUBTRACT arithmetic ----
  console.log('\n=== Test 342: SUBTRACT — 4bit subtraction without borrow ===');
  {
    // 0011 - 0001 = 0010, carry = 0
    const interp = runArith('4wire idx = 0011\n4wire dec = 0001\n4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)');
    assert('SUBTRACT 0011-0001 result', getWire(interp, 'prevIdx'), '0010');
    assert('SUBTRACT 0011-0001 carry', getWire(interp, 'carry'), '0');
  }

  console.log('\n=== Test 343: SUBTRACT — 4bit subtraction with borrow (underflow) ===');
  {
    // 0000 - 0001 = 1111, carry = 1
    const interp = runArith('4wire idx = 0000\n4wire dec = 0001\n4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)');
    assert('SUBTRACT 0000-0001 result', getWire(interp, 'prevIdx'), '1111');
    assert('SUBTRACT 0000-0001 carry', getWire(interp, 'carry'), '1');
  }

  console.log('\n=== Test 344: SUBTRACT — equal values gives zero without borrow ===');
  {
    // 1010 - 1010 = 0000, carry = 0
    const interp = runArith('4wire a = 1010\n4wire b = 1010\n4wire r, 1wire c = SUBTRACT(a, b)');
    assert('SUBTRACT equal result 0000', getWire(interp, 'r'), '0000');
    assert('SUBTRACT equal carry 0', getWire(interp, 'c'), '0');
  }

  // ---- MULTIPLY arithmetic ----
  console.log('\n=== Test 345: MULTIPLY — 4bit multiplication without overflow ===');
  {
    // 0010 * 0011 = 0110, over = 0000
    const interp = runArith('4wire a = 0010\n4wire b = 0011\n4wire r, 4wire over = MULTIPLY(a, b)');
    assert('MULTIPLY 2*3 result', getWire(interp, 'r'), '0110');
    assert('MULTIPLY 2*3 over', getWire(interp, 'over'), '0000');
  }

  console.log('\n=== Test 346: MULTIPLY — 4bit multiplication with overflow ===');
  {
    // 1111 * 1111 = 225 decimal = 11100001, masked to 4 bits: 0001, over = 1110
    const interp = runArith('4wire a = 1111\n4wire b = 1111\n4wire r, 4wire over = MULTIPLY(a, b)');
    assert('MULTIPLY 15*15=225 result (low 4 bits)', getWire(interp, 'r'), '0001');
    assert('MULTIPLY 15*15=225 over (high 4 bits)', getWire(interp, 'over'), '1110');
  }

  console.log('\n=== Test 347: MULTIPLY — zero produces zero ===');
  {
    const interp = runArith('4wire a = 1111\n4wire b = 0000\n4wire r, 4wire over = MULTIPLY(a, b)');
    assert('MULTIPLY x*0 result', getWire(interp, 'r'), '0000');
    assert('MULTIPLY x*0 over', getWire(interp, 'over'), '0000');
  }

  // ---- DIVIDE arithmetic ----
  console.log('\n=== Test 348: DIVIDE — 4bit division without remainder ===');
  {
    // 0110 / 0010 = 0011, mod = 0000
    const interp = runArith('4wire a = 0110\n4wire b = 0010\n4wire r, 4wire mod = DIVIDE(a, b)');
    assert('DIVIDE 6/2 result', getWire(interp, 'r'), '0011');
    assert('DIVIDE 6/2 mod', getWire(interp, 'mod'), '0000');
  }

  console.log('\n=== Test 349: DIVIDE — 4bit division with remainder ===');
  {
    // 0111 / 0010 = 0011, mod = 0001
    const interp = runArith('4wire a = 0111\n4wire b = 0010\n4wire r, 4wire mod = DIVIDE(a, b)');
    assert('DIVIDE 7/2 result', getWire(interp, 'r'), '0011');
    assert('DIVIDE 7/2 mod', getWire(interp, 'mod'), '0001');
  }

  console.log('\n=== Test 350: DIVIDE — division by zero returns zero ===');
  {
    const interp = runArith('4wire a = 0110\n4wire b = 0000\n4wire r, 4wire mod = DIVIDE(a, b)');
    assert('DIVIDE by zero result', getWire(interp, 'r'), '0000');
    assert('DIVIDE by zero mod', getWire(interp, 'mod'), '0000');
  }

  console.log('\n=== Test 351: DIVIDE — dividend smaller than divisor gives 0 result ===');
  {
    // 0001 / 0011 = 0, mod = 0001
    const interp = runArith('4wire a = 0001\n4wire b = 0011\n4wire r, 4wire mod = DIVIDE(a, b)');
    assert('DIVIDE 1/3 result 0', getWire(interp, 'r'), '0000');
    assert('DIVIDE 1/3 mod 1', getWire(interp, 'mod'), '0001');
  }

  // ---- isBuiltinFunction checks ----
  console.log('\n=== Test 352: isBuiltinFunction — ADD, SUBTRACT, MULTIPLY, DIVIDE recognized ===');
  {
    // We cannot instantiate Interpreter directly without full setup, but we can check via getDocLines
    // returning actual signatures (not the 'funcție nedefinită' fallback)
    for (const fn of ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE']) {
      const lines = InterpreterDoc.getDocLines(fn, new Map());
      assert(`${fn} recognized (not undefined)`, String(lines[0].includes('funcție nedefinită')), 'false');
    }
  }
}

// ================================================================
// doc(comp) and doc(pcb) Tests
// ================================================================

{
  // Reuse same sandbox setup as doc tests above (full stack with interpreter)
  const interpreterSrc2 = fs.readFileSync('./core/interpreter.js', 'utf-8');
  const componentFiles2 = [
    'component-base', 'builtin-component', 'component-registry',
    'led', 'switch', 'key', 'dip', 'seven-seg', 'lcd',
    'adder', 'subtract', 'multiplier', 'divider', 'shifter',
    'mem', 'reg', 'counter', 'osc', 'rotary', 'pcb-component', 'index'
  ];
  let componentsSrc2 = '';
  for (const f of componentFiles2) {
    componentsSrc2 += fs.readFileSync(`./core/components/${f}.js`, 'utf-8')
      .replace(/^var \w+ = \(typeof require\b.*$/gm, '')
      .replace(/^if \(typeof module\b.*\n.*module\.exports.*\n\}/gm, '') + '\n';
  }

  const fullChunk2 = tokenizerSrc + '\n' + preprocessorSrc + '\n' + componentsSrc2 + '\n' + parserSrc + '\n' + interpreterSrc2;
  const sbDoc2 = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, setTimeout, clearTimeout, JSON, Number, isNaN };
  const codeDoc2 = fullChunk2 + `
var _CR2 = createComponentRegistry;
var _P2 = Parser;
var _T2 = Tokenizer;
var _PR2 = preprocessRepeat;
var _I2 = Interpreter;
`;
  vm.runInNewContext(codeDoc2, sbDoc2);
  const registryDoc2 = sbDoc2._CR2();
  const ParserDoc2 = sbDoc2._P2;
  const TokenizerDoc2 = sbDoc2._T2;
  const preprocessDoc2 = sbDoc2._PR2;
  const InterpreterDoc2 = sbDoc2._I2;

  function runDoc2(src) {
    const processed = preprocessDoc2(src);
    const p = new ParserDoc2(new TokenizerDoc2(processed), registryDoc2);
    const stmts = p.parse();
    const out = [];
    const interp = new InterpreterDoc2(p.funcs, out, p.pcbs, registryDoc2);
    for (const s of stmts) interp.exec(s);
    return out;
  }

  // ---- Parser: doc(comp) produce {doc: 'comp'} ----
  console.log('\n=== Test 400: Parser — doc(comp) produce nodul AST corect ===');
  {
    const processed = preprocessDoc2('doc(comp)');
    const p = new ParserDoc2(new TokenizerDoc2(processed), registryDoc2);
    const stmts = p.parse();
    assert('doc camp este comp', stmts[0].doc, 'comp');
  }

  // ---- Parser: doc(comp.adder) produce {doc: 'comp.adder'} ----
  console.log('\n=== Test 401: Parser — doc(comp.adder) produce nodul AST corect ===');
  {
    const processed = preprocessDoc2('doc(comp.adder)');
    const p = new ParserDoc2(new TokenizerDoc2(processed), registryDoc2);
    const stmts = p.parse();
    assert('doc camp este comp.adder', stmts[0].doc, 'comp.adder');
  }

  // ---- Parser: doc(pcb.bcd) produce {doc: 'pcb.bcd'} ----
  console.log('\n=== Test 402: Parser — doc(pcb.bcd) produce nodul AST corect ===');
  {
    const processed = preprocessDoc2('doc(pcb.bcd)');
    const p = new ParserDoc2(new TokenizerDoc2(processed), registryDoc2);
    const stmts = p.parse();
    assert('doc camp este pcb.bcd', stmts[0].doc, 'pcb.bcd');
  }

  // ---- doc(comp) lista componentelor ----
  console.log('\n=== Test 403: doc(comp) contine comp.adder ===');
  {
    const out = runDoc2('doc(comp)');
    const hasAdder = out.some(l => l.includes('comp.adder'));
    assert('doc(comp) contine comp.adder', String(hasAdder), 'true');
  }

  console.log('\n=== Test 404: doc(comp) contine shortname comp.+ ===');
  {
    const out = runDoc2('doc(comp)');
    const hasPlus = out.some(l => l.includes('comp.+'));
    assert('doc(comp) contine comp.+', String(hasPlus), 'true');
  }

  console.log('\n=== Test 405: doc(comp) contine comp.7seg ===');
  {
    const out = runDoc2('doc(comp)');
    const has7seg = out.some(l => l.includes('comp.7seg'));
    assert('doc(comp) contine comp.7seg', String(has7seg), 'true');
  }

  console.log('\n=== Test 406: doc(comp) shortname comp.7 pe aceeasi linie cu comp.7seg ===');
  {
    const out = runDoc2('doc(comp)');
    const line7seg = out.find(l => l.includes('comp.7seg'));
    assert('linia cu 7seg contine si comp.7', String(line7seg && line7seg.includes('comp.7')), 'true');
  }

  // ---- doc(comp.adder) ----
  console.log('\n=== Test 407: doc(comp.adder) prima linie ===');
  {
    const out = runDoc2('doc(comp.adder)');
    assert('prima linie adder', out[0], 'comp [adder] .name:');
  }

  console.log('\n=== Test 408: doc(comp.adder) contine depth: integer ===');
  {
    const out = runDoc2('doc(comp.adder)');
    assert('adder contine depth', String(out.some(l => l.includes('depth: integer'))), 'true');
  }

  console.log('\n=== Test 409: doc(comp.adder) contine = Xbit ===');
  {
    const out = runDoc2('doc(comp.adder)');
    assert('adder contine = Xbit', String(out.some(l => l.trim() === '= Xbit')), 'true');
  }

  console.log('\n=== Test 410: doc(comp.adder) contine Xpin a ===');
  {
    const out = runDoc2('doc(comp.adder)');
    assert('adder contine Xpin a', String(out.some(l => l.includes('Xpin a'))), 'true');
  }

  console.log('\n=== Test 411: doc(comp.adder) contine Xpout get ===');
  {
    const out = runDoc2('doc(comp.adder)');
    assert('adder contine Xpout get', String(out.some(l => l.includes('Xpout get'))), 'true');
  }

  console.log('\n=== Test 412: doc(comp.adder) contine -> Xbit ===');
  {
    const out = runDoc2('doc(comp.adder)');
    assert('adder contine -> Xbit', String(out.some(l => l.trim() === '-> Xbit')), 'true');
  }

  // ---- doc(comp.+) = shortname redirect pentru adder ----
  console.log('\n=== Test 413: doc(comp.+) same output as doc(comp.adder) ===');
  {
    const outAdder = runDoc2('doc(comp.adder)');
    const outPlus  = runDoc2('doc(comp.+)');
    assert('doc(comp.+) prima linie', outPlus[0], 'comp [adder] .name:');
    assert('doc(comp.+) lungime egala cu adder', String(outPlus.length), String(outAdder.length));
  }

  // ---- doc(comp.7seg) ----
  console.log('\n=== Test 414: doc(comp.7seg) prima linie ===');
  {
    const out = runDoc2('doc(comp.7seg)');
    assert('prima linie 7seg', out[0], 'comp [7seg] .name:');
  }

  console.log('\n=== Test 415: doc(comp.7seg) contine 1pin set ===');
  {
    const out = runDoc2('doc(comp.7seg)');
    assert('7seg contine 1pin set', String(out.some(l => l.includes('1pin set'))), 'true');
  }

  console.log('\n=== Test 416: doc(comp.7seg) contine -> 8bit ===');
  {
    const out = runDoc2('doc(comp.7seg)');
    assert('7seg contine -> 8bit', String(out.some(l => l.trim() === '-> 8bit')), 'true');
  }

  // ---- doc(comp.7) shortname pentru 7seg ----
  console.log('\n=== Test 417: doc(comp.7) shortname pentru 7seg ===');
  {
    const out = runDoc2('doc(comp.7)');
    assert('doc(comp.7) prima linie', out[0], 'comp [7seg] .name:');
  }

  // ---- mem are acum = Xbit (suporta initializare cu variabila si .mem = d) ----
  console.log('\n=== Test 418: doc(comp.mem) contine = Xbit ===');
  {
    const out = runDoc2('doc(comp.mem)');
    assert('mem contine = Xbit', String(out.some(l => l.trim().startsWith('= '))), 'true');
  }

  // ---- doc(comp.xyz) — nedefinit ----
  console.log('\n=== Test 419: doc(comp.xyz) tip nedefinit ===');
  {
    const out = runDoc2('doc(comp.xyz)');
    assert('comp.xyz nedefinit', out[0], 'comp.xyz: tip de componentă nedefinit');
  }

  // ---- doc(pcb) cu PCB definit ----
  console.log('\n=== Test 420: doc(pcb) cu PCB definit contine pcb.bcd ===');
  {
    const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set`;
    const out = runDoc2(src + '\ndoc(pcb)');
    assert('doc(pcb) contine pcb.bcd', String(out.some(l => l === 'pcb.bcd')), 'true');
  }

  // ---- doc(pcb.bcd) prima linie ----
  console.log('\n=== Test 421: doc(pcb.bcd) prima linie ===');
  {
    const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
    const out = runDoc2(src);
    assert('pcb.bcd prima linie', out[0], 'pcb [bcd] .name:');
  }

  // ---- doc(pcb.bcd) contine 4pin sum ----
  console.log('\n=== Test 422: doc(pcb.bcd) contine 4pin sum ===');
  {
    const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
    const out = runDoc2(src);
    assert('pcb.bcd contine 4pin sum', String(out.some(l => l.includes('4pin sum'))), 'true');
  }

  // ---- doc(pcb.bcd) contine 1pout carry ----
  console.log('\n=== Test 423: doc(pcb.bcd) contine 1pout carry ===');
  {
    const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
    const out = runDoc2(src);
    assert('pcb.bcd contine 1pout carry', String(out.some(l => l.includes('1pout carry'))), 'true');
  }

  // ---- doc(pcb.bcd) contine -> 1bit ----
  console.log('\n=== Test 424: doc(pcb.bcd) contine -> 1bit ===');
  {
    const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
    const out = runDoc2(src);
    assert('pcb.bcd contine -> 1bit', String(out.some(l => l.trim() === '-> 1bit')), 'true');
  }

  // ---- doc(pcb.xyz) — nedefinit ----
  console.log('\n=== Test 425: doc(pcb.xyz) tip nedefinit ===');
  {
    const out = runDoc2('doc(pcb.xyz)');
    assert('pcb.xyz nedefinit', out[0], 'pcb.xyz: tip PCB nedefinit');
  }

  // ---- formatCompDef pentru osc (fara = Xbit, are -> 1bit) ----
  console.log('\n=== Test 426: doc(comp.osc) nu contine = si returneaza 1bit ===');
  {
    const out = runDoc2('doc(comp.osc)');
    assert('osc fara = ', String(out.some(l => l.trim().startsWith('= '))), 'false');
    assert('osc -> 1bit', String(out.some(l => l.trim() === '-> 1bit')), 'true');
  }

  // ---- formatCompDef static helper ----
  console.log('\n=== Test 427: InterpreterDoc2.formatCompDef helper ===');
  {
    const def = {
      attrs: [{ name: 'depth', value: 'integer' }],
      initValue: 'Xbit',
      pins: [{ bits: '1', name: 'set' }],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: 'Xbit',
    };
    const lines = InterpreterDoc2.formatCompDef('testComp', def);
    assert('formatCompDef linia 0', lines[0], 'comp [testComp] .name:');
    assert('formatCompDef attr', lines[1], '  depth: integer');
    assert('formatCompDef = Xbit', lines[2], '  = Xbit');
    assert('formatCompDef :{', lines[3], '  :{');
    assert('formatCompDef 1pin set', lines[4], '    1pin set');
    assert('formatCompDef Xpout get', lines[5], '    Xpout get');
    assert('formatCompDef }', lines[6], '  }');
    assert('formatCompDef -> Xbit', lines[7], '  -> Xbit');
  }
}

// ================================================================
// PCB property block fix — Test 500+
// ================================================================

{
  // Full sandbox: tokenizer + preprocessor + components + parser + interpreter
  const interpSrc500 = fs.readFileSync('./core/interpreter.js', 'utf-8');
  const signalSrc500 = fs.readFileSync('./core/signal-propagation.js', 'utf-8');
  const compFiles500 = [
    'component-base', 'builtin-component', 'component-registry',
    'led', 'switch', 'key', 'dip', 'seven-seg', 'lcd',
    'adder', 'subtract', 'multiplier', 'divider', 'shifter',
    'mem', 'reg', 'counter', 'osc', 'rotary', 'pcb-component', 'index'
  ];
  let compSrc500 = '';
  for (const f of compFiles500) {
    compSrc500 += fs.readFileSync(`./core/components/${f}.js`, 'utf-8')
      .replace(/^var \w+ = \(typeof require\b.*$/gm, '')
      .replace(/^if \(typeof module\b.*\n.*module\.exports.*\n\}/gm, '') + '\n';
  }

  const chunk500 = tokenizerSrc + '\n' + preprocessorSrc + '\n' + compSrc500 + '\n' + parserSrc + '\n' + interpSrc500 + '\n' + signalSrc500;
  const sb500 = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, setTimeout, clearTimeout, JSON, Number, isNaN };
  vm.runInNewContext(chunk500 + `
var _CR500 = createComponentRegistry;
var _P500 = Parser;
var _T500 = Tokenizer;
var _PR500 = preprocessRepeat;
var _I500 = Interpreter;
`, sb500);

  const registry500 = sb500._CR500();
  const Parser500 = sb500._P500;
  const Tokenizer500 = sb500._T500;
  const preprocess500 = sb500._PR500;
  const Interpreter500 = sb500._I500;

  function run500(src) {
    const processed = preprocess500(src);
    const p = new Parser500(new Tokenizer500(processed), registry500);
    const stmts = p.parse();
    const out = [];
    const interp = new Interpreter500(p.funcs, out, p.pcbs, registry500);
    for (const s of stmts) interp.exec(s);
    return { out, interp };
  }

  // Citeste valoarea unui pout dintr-o instanta PCB dupa nume instanta si pout
  function getPcbPout500(interp, instanceName, poutName) {
    const inst = interp.pcbInstances.get(instanceName);
    if (!inst) return null;
    const poutInfo = inst.poutStorage.get(poutName);
    if (!poutInfo) return null;
    return interp.getValueFromRef(poutInfo.ref) || '0'.repeat(poutInfo.bits);
  }

  // ---- Test 500: property block cu set=1 pe PCB cu on:1 declanseaza corpul ----
  console.log('\n=== Test 500: PCB property block on:1 cu set=1 declanseaza executia ===');
  {
    // PCB simplu care copiaza pinul 'data' in pout-ul 'result'
    const src = `pcb +[passthrough]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [passthrough] .q::

.q:{
  data = 1111
  set = 1
}`;
    const { interp } = run500(src);
    const val = getPcbPout500(interp, '.q', 'result');
    assert('PCB property block on:1 set=1 actualizeaza pout', val, '1111');
  }

  // ---- Test 501: property block cu set=0 pe PCB cu on:1 NU declanseaza corpul ----
  console.log('\n=== Test 501: PCB property block on:1 cu set=0 nu declanseaza executia ===');
  {
    const src = `pcb +[passthrough2]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [passthrough2] .q2::

.q2:{
  data = 1111
  set = 0
}`;
    const { interp } = run500(src);
    const val = getPcbPout500(interp, '.q2', 'result');
    assert('PCB property block on:1 set=0 nu actualizeaza pout', val, '0000');
  }

  // ---- Test 502: scenario original din raportul de bug ----
  console.log('\n=== Test 502: scenario regs PCB cu adr si data ===');
  {
    // NOT(1111) = 0000, verificam ca executia s-a produs (valoare diferita de init 0000 ar fi ambigua)
    // Folosim NOT pe un pin pentru a verifica ca corpul PCB s-a executat cu datele corecte
    const src = `pcb +[regs]:
  1pin set
  4pin data
  4pout result
  exec: set
  on:1

  result = NOT(data)
  :4bit result

pcb [regs] .q::

.q:{
  data = 0101
  set = 1
}`;
    const { interp } = run500(src);
    const val = getPcbPout500(interp, '.q', 'result');
    // NOT(0101) = 1010
    assert('PCB regs property block returneaza rezultat calculat', val, '1010');
  }

  // ---- Test 503: wire extern reflecta valoarea pout-ului dupa property block ----
  console.log('\n=== Test 503: wire extern "q = .q" reflecta pout dupa property block ===');
  {
    const src = `pcb +[echo]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [echo] .e::

4wire q = .e

.e:{
  data = 0110
  set = 1
}`;
    const { interp } = run500(src);
    // Verifica poutStorage direct
    const poutVal = getPcbPout500(interp, '.e', 'result');
    assert('Test 503 pout result dupa block', poutVal, '0110');
    // Verifica si wire-ul extern q (re-evaluat prin reEvalWiresDependingOnPcb)
    const wire = interp.wires.get('q');
    const wireVal = wire ? interp.getValueFromRef(wire.ref) : null;
    assert('Test 503 wire q reflecta pout', wireVal, '0110');
  }

  // ---- Test 504: wire intern ca returnSpec (:Xbit wireName) este propagat corect ----
  console.log('\n=== Test 504: wire intern ca returnSpec propagat in wire extern ===');
  {
    // PCB returneaza un wire intern (NOT(data)), nu un pout declarat
    const src = `pcb +[inv]:
  4pin data
  1pin set
  exec: set
  on:1

  4wire out = NOT(data)
  :4bit out

pcb [inv] .i::

4wire q = .i

.i:{
  data = 0101
  set = 1
}`;
    const { interp } = run500(src);
    // returnValue trebuie salvat in instance dupa executePcbBody
    const inst = interp.pcbInstances.get('.i');
    assert('Test 504 instance.returnValue setat', inst ? String(inst.returnValue) : 'null', '1010');
    // wire extern q trebuie actualizat prin reEvalWiresDependingOnPcb
    const wire = interp.wires.get('q');
    const wireVal = wire ? interp.getValueFromRef(wire.ref) : null;
    assert('Test 504 wire q reflecta wire intern NOT(data)', wireVal, '1010');
  }

  // ---- Test 505: alternare A->B->A->B prin updateConnectedComponents ----
  console.log('\n=== Test 505: alternare A->B->A->B intre doua blocuri PCB cu on:1 ===');
  {
    // PCB simplu: result = data, triggerat de setA sau setB
    // Blocul A seteaza data=0101, blocul B seteaza data=1010
    // Simulam apasari alternative de butoane prin schimbarea wire-urilor aa/bb
    const src = `pcb +[sw]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [sw] .p::

1wire aa = 0
1wire bb = 0

.p:{
  data = 0101
  set = aa
}
.p:{
  data = 1010
  set = bb
}`;
    const { interp } = run500(src);

    // Helper: seteaza un wire si propaga
    function setWire(name, val) {
      const w = interp.wires.get(name);
      if(w && w.ref) interp.setValueAtRef(w.ref, val);
      interp.updateConnectedComponents(name, val);
    }

    // A=1 -> blocul A executa, result=0101
    setWire('aa', '1');
    assert('505 A=1: result=0101', getPcbPout500(interp, '.p', 'result'), '0101');

    // B=1 -> blocul B executa, result=1010
    setWire('bb', '1');
    assert('505 B=1: result=1010', getPcbPout500(interp, '.p', 'result'), '1010');

    // A=1 din nou -> blocul A executa din nou, result=0101
    setWire('aa', '0');
    setWire('aa', '1');
    assert('505 A=1 din nou: result=0101', getPcbPout500(interp, '.p', 'result'), '0101');

    // B=1 din nou -> blocul B executa din nou, result=1010
    setWire('bb', '0');
    setWire('bb', '1');
    assert('505 B=1 din nou: result=1010', getPcbPout500(interp, '.p', 'result'), '1010');
  }
  // ---- Test 506: componentele interne PCB nu sunt re-create la fiecare executie ----
  console.log('\n=== Test 506: comp interne PCB nu sunt re-create la re-executie ===');
  {
    // Verificam ca execComp este sarit la a doua executie a body-ului PCB.
    // Folosim un PCB simplu cu o componenta interna (led) si verificam ca
    // this.components.has(compName) ramane true dupa a doua executie.
    // De asemenea verificam ca componentPropertyBlocks nu se dubleaza.
    const src = `pcb +[withcomp]:
  1pin set
  4pin data
  4pout result
  exec: set
  on:1

  comp [led] .L:
  on:1
  :

  .L:{
    set = 1
  }

  result = data
  :4bit result

pcb [withcomp] .wc::

1wire aa = 0

.wc:{
  data = 0101
  set = aa
}`;
    const { interp } = run500(src);

    function setWire506(name, val) {
      const w = interp.wires.get(name);
      if(w && w.ref) interp.setValueAtRef(w.ref, val);
      interp.updateConnectedComponents(name, val);
    }

    // Prima executie
    setWire506('aa', '1');
    const blocksAfter1 = interp.componentPropertyBlocks.length;

    // A doua executie (aa trece prin 0 apoi 1)
    setWire506('aa', '0');
    setWire506('aa', '1');
    const blocksAfter2 = interp.componentPropertyBlocks.length;

    // Daca componenta ar fi re-creata, property blocks s-ar dubla
    assert('506 componentPropertyBlocks nu creste la re-executie', String(blocksAfter1), String(blocksAfter2));

    // Verifica si ca result este corect la a doua executie
    const val = getPcbPout500(interp, '.wc', 'result');
    assert('506 result corect la a doua executie', val, '0101');
  }

  // ---- Test 507: storage nu creste la re-executii repetate ----
  console.log('\n=== Test 507: storage nu creste la re-executii PCB repetate ===');
  {
    // PCB cu pout-uri si wire intern — la fiecare executie storage trebuie sa ramana stabil
    const src = `pcb +[stable]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  4wire tmp = NOT(data)
  result = tmp
  :4bit result

pcb [stable] .s::

1wire aa = 0

.s:{
  data = 0101
  set = aa
}`;
    const { interp } = run500(src);

    function setWire507(name, val) {
      const w = interp.wires.get(name);
      if(w && w.ref) interp.setValueAtRef(w.ref, val);
      interp.updateConnectedComponents(name, val);
    }

    // Prima executie — stabilizeaza storage
    setWire507('aa', '1');
    setWire507('aa', '0');
    setWire507('aa', '1');
    const snap1 = new Set(interp.storage.map(s => s.index));
    const storageAfter1 = interp.storage.length;

    // A doua executie — storage nu trebuie sa creasca
    setWire507('aa', '0');
    setWire507('aa', '1');
    const snap2 = new Set(interp.storage.map(s => s.index));
    const storageAfter2 = interp.storage.length;
    const newIn2 = interp.storage.filter(s => !snap1.has(s.index)).map(s => `&${s.index}=${s.value}`);
    if(newIn2.length) console.log('  [debug] new storage after exec2:', newIn2);

    // A treia executie — storage nu trebuie sa creasca
    setWire507('aa', '0');
    setWire507('aa', '1');
    const storageAfter3 = interp.storage.length;
    const newIn3 = interp.storage.filter(s => !snap2.has(s.index)).map(s => `&${s.index}=${s.value}`);
    if(newIn3.length) console.log('  [debug] new storage after exec3:', newIn3);

    assert('507 storage stabil dupa executia 2', String(storageAfter2), String(storageAfter1));
    assert('507 storage stabil dupa executia 3', String(storageAfter3), String(storageAfter1));

    // Verifica ca rezultatul este corect
    const val = getPcbPout500(interp, '.s', 'result');
    assert('507 result corect NOT(0101)=1010', val, '1010');
  }

  // ---- Test 508: storage stabil cu doua blocuri alternante (scenariul A->B->A) ----
  console.log('\n=== Test 508: storage stabil cu doua blocuri PCB alternante ===');
  {
    const src = `pcb +[dual2]:
  4pin data
  1pin setA
  1pin setB
  4pout result
  exec: setA
  on:1

  result = data
  :4bit result

pcb [dual2] .d::

1wire aa = 0
1wire bb = 0

.d:{
  data = 0101
  setA = aa
  setB = 0
}
.d:{
  data = 1010
  setA = 0
  setB = bb
}`;
    const { interp } = run500(src);

    function setWire508(name, val) {
      const w = interp.wires.get(name);
      if(w && w.ref) interp.setValueAtRef(w.ref, val);
      interp.updateConnectedComponents(name, val);
    }

    // A=1
    setWire508('aa', '1');
    const s1 = interp.storage.length;

    // B=1
    setWire508('aa', '0');
    setWire508('bb', '1');
    const s2 = interp.storage.length;

    // A=1 din nou
    setWire508('bb', '0');
    setWire508('aa', '1');
    const s3 = interp.storage.length;

    // B=1 din nou
    setWire508('aa', '0');
    setWire508('bb', '1');
    const s4 = interp.storage.length;

    assert('508 storage stabil A->B', String(s1), String(s2));
    assert('508 storage stabil B->A', String(s2), String(s3));
    assert('508 storage stabil A->B din nou', String(s3), String(s4));
  }

  // ---- Test 509: blocurile se executa in ordinea din sursa (blockIndex) ----
  // Verifica ca un bloc cu set=expr(comp) care apare DUPA un alt bloc in sursa
  // se executa DUPA acel bloc, nu inainte (bug fix: ordinea pending vs direct)
  console.log('\n=== Test 509: blocuri cu set=expr(comp) se executa in ordinea din sursa ===');
  {
    // Doua componente: un counter si doua blocuri pe acelasi comp
    // Blocul A (blockIndex mic) deseneaza, blocul B (blockIndex mare) face clear
    // Daca ordinea e corecta: A se executa, B se executa dupa => rezultatul final e cel al lui B
    // Daca ordinea e gresita: B se executa, A se executa dupa => rezultatul final e cel al lui A
    const src = `
pcb +[seq]:
  1pin set
  4pout val
  exec: set
  on:1

  val = 1111
  :4bit val

pcb [seq] .q::

1wire trigger = 0

.q:{
  set = trigger
}

.q:{
  set = trigger
}`;
    // Al doilea bloc are blockIndex mai mare
    // Ambele se declanseaza cand trigger=1
    // Verificam ca ambele se executa (nu doar primul)
    const { interp } = run500(src);

    function setWire509(name, val) {
      const w = interp.wires.get(name);
      if(w && w.ref) interp.setValueAtRef(w.ref, val);
      interp.updateConnectedComponents(name, val);
    }

    const blocksBefore = interp.componentPropertyBlocks.filter(b => b.component === '.q').length;
    assert('509 doua blocuri inregistrate pentru .q', String(blocksBefore), '2');

    setWire509('trigger', '1');
    const val = getPcbPout500(interp, '.q', 'val');
    assert('509 ambele blocuri s-au executat, pout=1111', val, '1111');
  }

  // ---- Test 510: ordinea clear->draw cu set=expr(comp) direct ----
  // Simuleaza scenariul cu LCD: un bloc face clear (blockIndex mare),
  // altul face draw (blockIndex mic). Clear trebuie sa vina dupa draw.
  console.log('\n=== Test 510: ordinea executiei blocurilor cu trigger component direct ===');
  {
    // Folosim doua PCB-uri pentru a simula "draw" si "clear"
    // draw_pcb: blockIndex mic, seteaza val=1111
    // clear_pcb: blockIndex mare, seteaza val=0000
    // Daca ordinea e corecta (blockIndex), clear vine dupa draw => val final = 0000
    const src = `
pcb +[target]:
  4pin data
  1pin set
  4pout val
  exec: set
  on:1

  val = data
  :4bit val

pcb [target] .t::

comp [key] .btn:
  on:1
  :

1wire btn = .btn

.t:{
  data = 1111
  set = btn
}

.t:{
  data = 0000
  set = btn
}`;
    const { interp } = run500(src);

    // Simuleaza apasarea butonului: seteaza comp .btn la 1
    const btnComp = interp.components.get('.btn');
    if(btnComp && btnComp.ref){
      const idx = parseInt(btnComp.ref.slice(1));
      const stored = interp.storage.find(s => s.index === idx);
      if(stored) stored.value = '1';
    }
    interp.updateComponentConnections('.btn');

    const val = getPcbPout500(interp, '.t', 'val');
    // Al doilea bloc (data=0000, blockIndex mai mare) trebuie sa se execute dupa primul
    assert('510 blocul cu blockIndex mare se executa dupa cel cu blockIndex mic', val, '0000');
  }

  // ---- Test 511: trigger comp direct -> blocuri in ordinea blockIndex ----
  // Verifica explicit ca ordinea de executie respecta blockIndex, nu alta ordine
  console.log('\n=== Test 511: mai multe blocuri pe acelasi comp, ordinea = blockIndex ===');
  {
    const src = `
pcb +[order]:
  4pin data
  1pin set
  4pout val
  exec: set
  on:1

  val = data
  :4bit val

pcb [order] .o::

comp [key] .k:
  on:1
  :

.o:{
  data = 0001
  set = .k
}
.o:{
  data = 0010
  set = .k
}
.o:{
  data = 0100
  set = .k
}
.o:{
  data = 1000
  set = .k
}`;
    const { interp } = run500(src);

    const kComp = interp.components.get('.k');
    if(kComp && kComp.ref){
      const idx = parseInt(kComp.ref.slice(1));
      const stored = interp.storage.find(s => s.index === idx);
      if(stored) stored.value = '1';
    }
    interp.updateComponentConnections('.k');

    const val = getPcbPout500(interp, '.o', 'val');
    // Ultimul bloc in sursa are data=1000, deci val final trebuie sa fie 1000
    assert('511 ultimul bloc din sursa castiga (data=1000)', val, '1000');
  }

  // ---- Test 512: bitrange pe literali BIN si HEX ----
  console.log('\n=== Test 512: bitrange pe literali BIN (\\N) si HEX (^N) ===');
  {
    // Helper: ruleaza src si returneaza valoarea unui wire
    function getWire512(src, name) {
      const { interp } = run500(src);
      const w = interp.wires.get(name);
      return w ? interp.getValueFromRef(w.ref) : null;
    }

    // \12 = 1100 (4 biti), .0-2 = primii 3 biti = 110
    assert('512 \\12.0-2 = 110', getWire512('3wire c = \\12.0-2', 'c'), '110');

    // \12 = 1100, ./3 = primii 3 biti (shorthand .0/3) = 110
    assert('512 \\12./3 = 110', getWire512('3wire d = \\12./3', 'd'), '110');

    // \12.1-3 = 1100 -> biti 1-3 = 100
    assert('512 \\12.1-3 = 100', getWire512('3wire e = \\12.1-3', 'e'), '100');

    // ^f = 1111 (4 biti: F hex = 1111), ./4 = primii 4 biti = 1111
    assert('512 ^f./4 = 1111', getWire512('4wire f = ^f./4', 'f'), '1111');

    // ^f = 1111, .0-2 = primii 3 biti = 111
    assert('512 ^f.0-2 = 111', getWire512('3wire g = ^f.0-2', 'g'), '111');

    // ^f = 1111, .1-3 = biti 1-3 = 111
    assert('512 ^f.1-3 = 111', getWire512('3wire h = ^f.1-3', 'h'), '111');

    // ^0f = 00001111 (8 biti), ./8 = 00001111
    assert('512 ^0f./8 = 00001111', getWire512('8wire i = ^0f./8', 'i'), '00001111');

    // ^0f = 00001111, .4-7 = ultimii 4 biti = 1111
    assert('512 ^0f.4-7 = 1111', getWire512('4wire j = ^0f.4-7', 'j'), '1111');

    // \255 = 11111111 (8 biti), ./8 = toti 8 biti = 11111111
    assert('512 \\255./8 = 11111111', getWire512('8wire k = \\255./8', 'k'), '11111111');

    // \12./4 + ^f./4 = 1100 + 1111 = 11001111 (concatenare)
    assert('512 \\12./4 + ^f./4 = 11001111', getWire512('8wire r = \\12./4 + ^f./4', 'r'), '11001111');

    // Exemplul din cerinta: 16wire e = \12./8 + ^f./8
    // \12 = 1100 (4 biti), ./8 solicita biti 0-7 dintr-un sir de 4 → extrage ce poate: '1100'
    // ^f = 1111 (4 biti), ./8 → '1111'
    // Concatenare: 1100 + 1111 = 11001111, wire 16bit → padded: 0000000011001111
    // Testam cu valori de 8 biti: \192 = 11000000, ^0f = 00001111
    assert('512 \\192./8 + ^0f./8 = 1100000000001111', getWire512('16wire combo = \\192./8 + ^0f./8', 'combo'), '1100000000001111');
  }

  // ---- Test 513: operatorul ;p de padding ----
  console.log('\n=== Test 513: operatorul ;p de padding ===');
  {
    function getWire513(src, name) {
      const { interp } = run500(src);
      const w = interp.wires.get(name);
      return w ? interp.getValueFromRef(w.ref) : null;
    }

    // Literali BIN cu padding
    // \12 = 1100 (4 biti), ;8 → 00001100
    assert('513 \\12;8 = 00001100', getWire513('8wire a = \\12;8', 'a'), '00001100');

    // \3 = 11 (2 biti), ;8 → 00000011
    assert('513 \\3;8 = 00000011', getWire513('8wire b = \\3;8', 'b'), '00000011');

    // Literali HEX cu padding
    // ^2 = 0010 (4 biti), ;8 → 00000010
    assert('513 ^2;8 = 00000010', getWire513('8wire c = ^2;8', 'c'), '00000010');

    // ^f = 1111 (4 biti), ;8 → 00001111
    assert('513 ^f;8 = 00001111', getWire513('8wire d = ^f;8', 'd'), '00001111');

    // Padding mai mic decat lungimea — nu se trunchiaza
    // \255 = 11111111 (8 biti), ;4 → 11111111 (neschimbat)
    assert('513 \\255;4 = 11111111 (no truncate)', getWire513('8wire e = \\255;4', 'e'), '11111111');

    // BIN bitrange + padding
    // \12 = 1100, .0-2 = 110, ;8 → 00000110
    assert('513 \\12.0-2;8 = 00000110', getWire513('8wire f = \\12.0-2;8', 'f'), '00000110');

    // \12 = 1100, ./3 = 110, ;8 → 00000110
    assert('513 \\12./3;8 = 00000110', getWire513('8wire g = \\12./3;8', 'g'), '00000110');

    // HEX bitrange + padding
    // ^0f = 00001111, .4-7 = 1111, ;8 → 00001111
    assert('513 ^0f.4-7;8 = 00001111', getWire513('8wire h = ^0f.4-7;8', 'h'), '00001111');

    // Variabile cu padding
    // 1wire aa = 1, aa;8 → 00000001
    assert('513 variabila aa;8 = 00000001', getWire513('1wire aa = 1\n8wire i = aa;8', 'i'), '00000001');

    // Variabila cu bitrange si padding
    // 8wire data = 11001100, data.0-3 = 1100, data.0-3;8 → 00001100
    assert('513 data.0-3;8 = 00001100', getWire513('8wire data = 11001100\n8wire j = data.0-3;8', 'j'), '00001100');

    // Expresie combinata cu padding — exemplul din cerinta
    // \12;8 = 00001100, ^2;8 = 00000010, concatenare → 16 biti
    assert('513 \\12;8 + ^2;8 = 0000110000000010', getWire513('16wire df = \\12;8 + ^2;8', 'df'), '0000110000000010');

    // Short notation cu padding
    // `\12;8 & [^ff]` → AND(00001100, 11111111) = 00001100
    // In short notation ^ e XOR, deci hex trebuie scris intre []: [^ff]
    assert('513 short notation \\12;8 & [^ff] = 00001100', getWire513('8wire sn = `\\12;8 & [^ff]`', 'sn'), '00001100');
  }

  // ---- Test 514: padding ;p pe componente si PCB-uri ----
  console.log('\n=== Test 514: padding ;p pe componente si PCB-uri ===');
  {
    function getWire514(src, name) {
      const { interp } = run500(src);
      const w = interp.wires.get(name);
      return w ? interp.getValueFromRef(w.ref) : null;
    }

    function getPcbPout514(src, instanceName, poutName) {
      const { interp } = run500(src);
      return getPcbPout500(interp, instanceName, poutName);
    }

    // --- Componente built-in cu proprietate ---

    // .mem:get;8 — mem cu depth=4, valoarea default=0000, pad la 8 → 00000000
    {
      const src = `comp [mem] .m:\ndepth:4\nlength:1\n:\n8wire x = .m:get;8`;
      assert('514 .mem:get;8 = 00000000',
        getWire514(src, 'x'),
        '00000000');
    }

    // .mem:get cu initialValue=1100, pad la 8 → 00001100
    {
      const src = `comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get;8`;
      assert('514 .mem:get;8 cu initVal=1100 = 00001100',
        getWire514(src, 'x'),
        '00001100');
    }

    // .mem:get.0-1;8 — biti 0-1 din 1100 = 11, pad la 8 → 00000011
    {
      const src = `comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get.0-1;8`;
      assert('514 .mem:get.0-1;8 = 00000011',
        getWire514(src, 'x'),
        '00000011');
    }

    // .mem:get.0/2;8 — 2 biti incepand de la 0 din 1100 = 11, pad la 8 → 00000011
    {
      const src = `comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get.0/2;8`;
      assert('514 .mem:get.0/2;8 = 00000011',
        getWire514(src, 'x'),
        '00000011');
    }

    // --- Componente directe (valoarea componentei) ---

    // reg nu are getReg/setReg in Node.js, testam direct pe comp cu wire
    // .r;8 cu wire de 4 biti = 1100, pad la 8 → 00001100
    {
      const src = `4wire r = \\12\n8wire x = r;8`;
      assert('514 wire;8 = 00001100',
        getWire514(src, 'x'),
        '00001100');
    }

    // wire de 8 biti = 11001100, .0-3;8 → primii 4 biti = 1100, pad la 8 → 00001100
    {
      const src = `8wire r = 11001100\n8wire x = r.0-3;8`;
      assert('514 wire.0-3;8 = 00001100',
        getWire514(src, 'x'),
        '00001100');
    }

    // --- PCB pout cu padding ---

    // PCB cu pout de 4 biti, valoare 1010, ;8 → 00001010
    {
      const src = `
pcb +[gen4]:
  1pin set
  4pout val
  exec: set
  on:1

  val = 1010
  :4bit val

pcb [gen4] .g::

.g:{
  set = 1
}

8wire x = .g:val;8`;
      assert('514 PCB pout;8 = 00001010',
        getWire514(src, 'x'),
        '00001010');
    }

    // PCB pout cu bitrange + padding: pout=11001100 (8 biti), .0-3 = 1100, ;8 → 00001100
    {
      const src = `
pcb +[gen8]:
  1pin set
  8pout val
  exec: set
  on:1

  val = 11001100
  :8bit val

pcb [gen8] .g::

.g:{
  set = 1
}

8wire x = .g:val.0-3;8`;
      assert('514 PCB pout.0-3;8 = 00001100',
        getWire514(src, 'x'),
        '00001100');
    }

    // --- PCB direct (returnul PCB) ---

    // PCB cu return de 4 biti = 1010, .g;8 → 00001010
    {
      const src = `
pcb +[ret4]:
  1pin set
  4pout val
  exec: set
  on:1

  val = 1010
  :4bit val

pcb [ret4] .g::

.g:{
  set = 1
}

8wire x = .g;8`;
      assert('514 PCB direct;8 = 00001010',
        getWire514(src, 'x'),
        '00001010');
    }

    // Padding mai mic decat valoarea — nu se trunchiaza
    // PCB return 8 biti = 11001100, ;4 → 11001100 (neschimbat)
    {
      const src = `
pcb +[ret8]:
  1pin set
  8pout val
  exec: set
  on:1

  val = 11001100
  :8bit val

pcb [ret8] .g::

.g:{
  set = 1
}

8wire x = .g;4`;
      assert('514 PCB direct;4 nu trunchiaza (11001100)',
        getWire514(src, 'x'),
        '11001100');
    }
  }

  // ---- Test 515: mem comp = variabila / .mem = d ----
  console.log('\n=== Test 515: mem comp = variabila si .mem = d ===');
  {
    // Helper: ruleaza src, citeste memoria la adresa addr
    function getMem515(src, instanceName, addr) {
      const { interp } = run500(src);
      const comp = interp.components.get(instanceName);
      if (!comp) return null;
      const memId = comp.deviceIds[0];
      if (typeof getMem === 'function') return getMem(memId, addr);
      // In Node.js getMem nu exista, verificam prin .mem:get cu :at
      return null;
    }

    // Helper: ruleaza src si verifica valoarea .mem:get cu at setat
    function getMemAt515(src, instanceName, atBin) {
      // Injecteaza un wire 'result' care citeste memoria la adresa atBin
      const bits = atBin.length;
      const readSrc = src + `\n${bits}wire __at = ${atBin}\n.${instanceName.substring(1)}:{\nat = __at\n}\n8wire __result = ${instanceName}:get;8`;
      const { interp } = run500(readSrc);
      const w = interp.wires.get('__result');
      return w ? interp.getValueFromRef(w.ref) : null;
    }

    // Test 1: = literal binar in declaratie (deja functional)
    // comp [mem] cu depth=4, = 1100 → adresa 0 = 1100
    {
      const src = `comp [mem] .m:\ndepth:4\nlength:4\n= \\12\n:\n8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 = literal \\12 in declaratie (adresa 0 = 1100, padded 8)', val, '00001100');
    }

    // Test 2: = variabila in declaratie
    // 4wire d = 1010, comp [mem] .m: = d → adresa 0 = 1010
    {
      const src = `4wire d = 1010\ncomp [mem] .m:\ndepth:4\nlength:4\n= d\n:\n8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 = variabila d=1010 in declaratie (adresa 0 = 1010, padded 8)', val, '00001010');
    }

    // Test 3: = HEX in declaratie — valoare pe mai multe adrese
    // ^ffff = 1111111111111111 (16 biti), depth=8, length=4
    // → adresa 0 = 11111111, adresa 1 = 11111111
    {
      const src = `comp [mem] .m:\ndepth:8\nlength:4\n= ^ffff\n:\n8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 = ^ffff in declaratie (adresa 0 = 11111111)', val, '11111111');
    }

    // Test 4: = variabila pe mai multe adrese in declaratie
    // 16wire d = ^ffff, comp [mem] depth=8, length=4, = d
    // → 2 adrese scrise: 0 = 11111111, 1 = 11111111
    {
      const src = `16wire d = ^ffff\ncomp [mem] .m:\ndepth:8\nlength:4\n= d\n:\n8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 = variabila d=^ffff in declaratie (adresa 0 = 11111111)', val, '11111111');
    }

    // Test 5: padding — valoare mai scurta decat depth, se face padStart
    // 4wire d = 1100, comp [mem] depth=8, = d → adresa 0 = 00001100
    {
      const src = `4wire d = 1100\ncomp [mem] .m:\ndepth:8\nlength:4\n= d\n:\n8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 = variabila mai scurta decat depth, pad (00001100)', val, '00001100');
    }

    // Test 6: .mem = d dupa declaratie — initializeaza memoria
    // PCB care seteaza .m:at si citeste .m:get
    // Verificam ca .mem = d functioneaza scriind o valoare si citind-o inapoi
    {
      const src = `
comp [mem] .m:
depth:4
length:4
:

4wire d = 1010
.m = d

8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 .mem = d dupa declaratie (adresa 0 = 1010, padded 8)', val, '00001010');
    }

    // Test 7: .mem = d cu valoare pe mai multe adrese
    // 16wire d = ^f0f0, depth=8, .m = d → adresa 0 = 11110000, adresa 1 = 11110000
    {
      const src = `
comp [mem] .m:
depth:8
length:4
:

16wire d = ^f0f0
.m = d

8wire x = .m:get;8`;
      const { interp } = run500(src);
      const w = interp.wires.get('x');
      const val = w ? interp.getValueFromRef(w.ref) : null;
      assert('515 .mem = d multi-adresa (adresa 0 = 11110000)', val, '11110000');
    }
  }
}

// Summary
console.log(`\n========== RESULTS ==========`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`==============================\n`);

process.exit(failed > 0 ? 1 : 0);
