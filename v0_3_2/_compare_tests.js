const fs = require('fs');
const vm = require('vm');
const path = require('path');

const dir = __dirname;

function removeBlockComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

function testIdFromMatch(num, suffix) {
  const n = parseInt(num, 10);
  if (!suffix) return n;
  return n * 10 + (suffix.charCodeAt(0) - 96);
}

function extractTests(code, inComments) {
  const re = /console\.log\('\\n=== Test (\d+)([a-z])?: ([^']+) ==='\);/g;
  const entries = [];
  let m;
  while ((m = re.exec(code)) !== null) {
    entries.push({ id: testIdFromMatch(m[1], m[2]), title: m[3], commented: !!inComments });
  }
  return entries;
}

const rawFull = fs.readFileSync(path.join(dir, 'test_repeat.js'), 'utf8');
const activeRaw = removeBlockComments(rawFull);
const active = extractTests(activeRaw, false);

const commented = [];
const blockRe = /\/\*([\s\S]*?)\*\//g;
let bm;
while ((bm = blockRe.exec(rawFull)) !== null) {
  for (const e of extractTests(bm[1], true)) commented.push(e);
}

const files = [
  'core/tokenizer.js', 'core/preprocessor.js',
  'core/components/component-base.js', 'core/components/builtin-component.js',
  'core/components/component-registry.js', 'core/components/led.js',
  'core/components/ledBar.js', 'core/components/switch.js', 'core/components/key.js',
  'core/components/dip.js', 'core/components/seven-seg.js', 'core/components/14seg.js',
  'core/components/dots.js', 'core/components/lcd.js', 'core/components/adder.js',
  'core/components/subtract.js', 'core/components/multiplier.js',   'core/components/divider.js',
  'core/components/lut.js',
  'core/components/shifter.js', 'core/components/mem.js', 'core/components/reg.js',
  'core/components/counter.js', 'core/components/osc.js', 'core/components/rotary.js',
  'core/components/pcb-component.js',   'core/components/index.js',
  'devices/mem-devices.js',
  'devices/lut-devices.js',
  'core/asm-assembler.js',
  'core/protocol-assembler.js',
  'core/lut-labels.js',
  'core/lut-decode.js',
  'core/parser.js', 'core/interpreter.js', 'core/signal-propagation.js',
  'test_session.js', 'test_suite.js', 'test_suite_ported.js'
];
let src = '';
for (const f of files) src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
const sb = {
  Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object,
  Math, JSON, Number, isNaN, clearTimeout, setTimeout, window: {}
};
sb.window = sb;
vm.runInNewContext(src, sb);
const suiteIds = new Set(sb.LogTScriptTestSuite.tests.map(t => t.id));

const activeSet = new Set(active.map(e => e.id));
const missing = active.filter(e => !suiteIds.has(e.id));
const extra = [...suiteIds].filter(id => !activeSet.has(id)).sort((a, b) => a - b);

console.log('test_repeat active (uncommented):', active.length);
console.log('browser suite ported:', suiteIds.size);
console.log('missing from browser:', missing.length);
for (const e of missing) console.log('  MISSING', e.id, '-', e.title);
console.log('extra in browser (not in repeat):', extra.length);
for (const id of extra) console.log('  EXTRA', id);
console.log('\ncommented-out in test_repeat (never in manifest):', commented.length);
for (const e of commented) console.log('  COMMENTED', e.id, '-', e.title);
