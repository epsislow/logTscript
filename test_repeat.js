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

// Summary
console.log(`\n========== RESULTS ==========`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`==============================\n`);

process.exit(failed > 0 ? 1 : 0);
