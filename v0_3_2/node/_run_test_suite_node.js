/**
 * Run all tests in Node (same suite as run_tests.html).
 * Use -h / --help for options.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./js/paths');
const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

function printHelp() {
  console.log(`Run all tests in Node (same suite as run_tests.html).

Usage:
  node node/_run_test_suite_node.js [options]

Options:
  -h, --help                      show this help and exit
  -v, --verbose                   runtime console output from tests (default: quiet)
  -t, --tests                     progress output (: = ok group, F = failed group)
  -n, --progress-tests-per-char N tests aggregated per progress character (default: 2)
  -w, --progress-width N          max progress characters per line (default: 50)

Examples:
  node node/_run_test_suite_node.js
  node node/_run_test_suite_node.js -t
  node node/_run_test_suite_node.js -t -n 1 -w 10
  node node/_run_test_suite_node.js -t --progress-tests-per-char=4 --progress-width=40
  node node/_run_test_suite_node.js -v
`);
}

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgs(argv) {
  const opts = {
    help: false,
    verbose: false,
    progress: false,
    progressTestsPerChar: 2,
    progressWidth: 50,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-v' || arg === '--verbose') {
      opts.verbose = true;
    } else if (arg === '-t' || arg === '--tests') {
      opts.progress = true;
    } else if (
      arg === '-n' || arg === '--progress-tests-per-char' ||
      arg.startsWith('--progress-tests-per-char=')
    ) {
      const value = arg.startsWith('--progress-tests-per-char=')
        ? arg.split('=')[1]
        : argv[++i];
      opts.progressTestsPerChar = parsePositiveInt(value, opts.progressTestsPerChar);
    } else if (arg.startsWith('-n') && arg.length > 2) {
      opts.progressTestsPerChar = parsePositiveInt(arg.slice(2), opts.progressTestsPerChar);
    } else if (
      arg === '-w' || arg === '--progress-width' ||
      arg.startsWith('--progress-width=')
    ) {
      const value = arg.startsWith('--progress-width=')
        ? arg.split('=')[1]
        : argv[++i];
      opts.progressWidth = parsePositiveInt(value, opts.progressWidth);
    } else if (arg.startsWith('-w') && arg.length > 2) {
      opts.progressWidth = parsePositiveInt(arg.slice(2), opts.progressWidth);
    }
  }

  return opts;
}

function createProgressReporter(total, testsPerChar, width) {
  let testsRun = 0;
  let charsOnLine = 0;
  let groupFailed = false;
  let groupCount = 0;

  function endLine() {
    process.stdout.write(` (${testsRun}/${total})\n`);
    charsOnLine = 0;
  }

  function emitSymbol(symbol) {
    process.stdout.write(symbol);
    charsOnLine++;
    if (charsOnLine >= width) endLine();
  }

  function flushGroup() {
    if (groupCount === 0) return;
    emitSymbol(groupFailed ? 'F' : ':');
    groupFailed = false;
    groupCount = 0;
  }

  return {
    onTest(ok) {
      testsRun++;
      if (!ok) groupFailed = true;
      groupCount++;
      if (groupCount >= testsPerChar) flushGroup();
    },
    finish() {
      flushGroup();
      if (charsOnLine > 0) endLine();
    },
  };
}

const opts = parseArgs(process.argv);
if (opts.help) {
  printHelp();
  process.exit(0);
}

let src = '';
for (const f of TEST_RUNTIME_SCRIPTS) {
  src += fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n';
}

const sandbox = createTestNodeSandbox({ verbose: opts.verbose });
vm.runInNewContext(src, sandbox);

const suite = sandbox.LogTScriptTestSuite;
const testCount = suite.tests.length;
console.log('Running', testCount, 'tests...');

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

const progress = opts.progress
  ? createProgressReporter(testCount, opts.progressTestsPerChar, opts.progressWidth)
  : null;

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
  const ok = h.ok();
  if (ok) passed++;
  else {
    failed++;
    failures.push(test.id + ': ' + test.title);
  }
  if (progress) progress.onTest(ok);
}

if (progress) progress.finish();

console.log('Passed:', passed, 'Failed:', failed, 'Total:', suite.tests.length);
if (dmErrors.length) {
  console.log('dm is not defined:', dmErrors.length, 'tests — run node node/_gen_test_manifest.js');
}
if (sandbox.LogTScriptSession && typeof sandbox.LogTScriptSession.cleanupAllTestSessions === 'function') {
  sandbox.LogTScriptSession.cleanupAllTestSessions();
}
if (failures.length) {
  console.log('Failures:', failures.slice(0, 40).join('\n'));
  if (failures.length > 40) console.log('... and', failures.length - 40, 'more');
  process.exit(1);
}
process.exit(0);
