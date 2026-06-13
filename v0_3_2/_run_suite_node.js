/** Quick validation: load core + test_suite, run all ported tests with isolated sessions. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const dir = __dirname;
const files = [
  'core/tokenizer.js',
  'core/preprocessor.js',
  'core/components/component-base.js',
  'core/components/builtin-component.js',
  'core/components/component-registry.js',
  'core/components/led.js',
  'core/components/ledBar.js',
  'core/components/switch.js',
  'core/components/key.js',
  'core/components/dip.js',
  'core/components/seven-seg.js',
  'core/components/14seg.js',
  'core/components/dots.js',
  'core/components/lcd.js',
  'core/components/terminal.js',
  'core/components/adder.js',
  'core/components/subtract.js',
  'core/components/multiplier.js',
  'core/components/divider.js',
  'core/components/lut.js',
  'core/components/shifter.js',
  'core/components/mem.js',
  'core/components/reg.js',
  'core/components/counter.js',
  'core/components/queue.js',
  'core/components/stack.js',
  'core/components/osc.js',
  'core/components/rotary.js',
  'core/components/pcb-component.js',
  'core/components/index.js',
  'devices/mem-devices.js',
  'devices/queue-storage.js',
  'devices/lut-devices.js',
  'devices/terminal.js',
  'core/asm-assembler.js',
  'core/protocol-assembler.js',
  'core/lut-labels.js',
  'core/lut-decode.js',
  'core/parser.js',
  'core/interpreter.js',
  'core/signal-propagation.js',
  'test_session.js',
  'test_suite.js',
  'test_suite_ported.js'
];

let src = '';
for (const f of files) {
  src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
}

const sandbox = {
  Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, JSON, Number, isNaN,
  clearTimeout, setTimeout, window: {}
};
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);

const suite = sandbox.LogTScriptTestSuite;

function createHarness() {
  const assertions = [];
  let unexpected = null;
  const norm = s => String(s).split('\n').map(l => l.trimEnd()).join('\n').trim();
  return {
    assert(testName, actual, expected) {
      assertions.push({ name: testName, pass: norm(actual) === norm(expected) });
    },
    assertThrows(testName, fn, expectedMsg) {
      try {
        fn();
        assertions.push({ name: testName, pass: false });
      } catch (e) {
        assertions.push({
          name: testName,
          pass: !expectedMsg || e.message.includes(expectedMsg)
        });
      }
    },
    fail() { assertions.push({ name: 'fail', pass: false }); },
    setUnexpected(e) { unexpected = e; },
    ok() { return !unexpected && assertions.every(a => a.pass); }
  };
}

let passed = 0, failed = 0;
const failures = [];
for (const test of suite.tests) {
  const session = suite.createSession({ propagation: test.propagation || 'legacy' });
  const h = createHarness();
  try {
    test.run(h, session);
  } catch (e) {
    h.setUnexpected(e);
  } finally {
    session.cleanup();
  }
  if (h.ok()) passed++;
  else {
    failed++;
    failures.push(test.id + ': ' + test.title);
  }
}

console.log('Passed:', passed, 'Failed:', failed, 'Total:', suite.tests.length);
if (failures.length) {
  console.log('Failures:', failures.join('\n'));
  process.exit(1);
}
