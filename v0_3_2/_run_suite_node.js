/** Quick validation: load core + test_suite, run all tests. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const dir = __dirname;
const files = [
  'core/tokenizer.js', 'core/preprocessor.js', 'test_suite.js'
];

let src = '';
for (const f of files) {
  src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
}

const sandbox = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, JSON, Number, isNaN, window: {} };
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);

const suite = sandbox.LogTScriptTestSuite;
const ctx = suite.createContext();

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
  const h = createHarness();
  try {
    test.run(h, ctx);
  } catch (e) {
    h.setUnexpected(e);
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
