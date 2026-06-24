/** Quick validation: load core + test_suite, run all tests with isolated sessions. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const dir = __dirname;
const { TEST_RUNTIME_SCRIPTS } = require('./test_runtime_bundle.js');
const { createTestNodeSandbox } = require('./test_node_sandbox.js');

let src = '';
for (const f of TEST_RUNTIME_SCRIPTS) {
  src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
}

const sandbox = createTestNodeSandbox();
vm.runInNewContext(src, sandbox);

const suite = sandbox.LogTScriptTestSuite;

function createHarness() {
  const assertions = [];
  let unexpected = null;
  const norm = s => String(s).split('\n').map(l => l.trimEnd()).join('\n').trim();
  return {
    assert(testName, actual, expected) {
      const pass = norm(actual) === norm(expected);
      assertions.push({ name: testName, pass, actual, expected });
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
    getUnexpected() { return unexpected; },
    ok() { return !unexpected && assertions.every(a => a.pass); },
    getAssertions() { return assertions; }
  };
}

let passed = 0, failed = 0;
const failures = [];
const dmErrors = [];
for (const test of suite.tests) {
  const session = suite.createSession({ propagation: test.propagation || 'legacy' });
  const h = createHarness();
  try {
    test.run(h, session);
  } catch (e) {
    h.setUnexpected(e);
    if (e && String(e.message || e).includes('dm is not defined')) {
      dmErrors.push(test.id);
    }
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
if (dmErrors.length) {
  console.log('dm is not defined:', dmErrors.length, 'tests — run node _gen_manifest.js and check test_scripts.json');
}
if (failures.length) {
  console.log('Failures:', failures.slice(0, 40).join('\n'));
  if (failures.length > 40) console.log('... and', failures.length - 40, 'more');
  process.exit(1);
}
