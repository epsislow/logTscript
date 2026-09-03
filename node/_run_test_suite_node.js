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
  -v, --verbose                   extra runner messages (e.g. unknown test ids)
  -vv, --very-verbose             runtime console output and exceptions from tests
  -t, --tests                     progress output (: = ok group, F = failed group) [default]
  -q, --quiet                     disable progress output
  -n, --progress-tests-per-char N tests aggregated per progress character (default: 2)
  -w, --progress-width N          max progress characters per line (default: 50)
  -i, --id SPEC                   run only test ids (comma-separated, ranges: 1-100,3,600-800)

Examples:
  node node/_run_test_suite_node.js
  node node/_run_test_suite_node.js -q
  node node/_run_test_suite_node.js -n 1 -w 10
  node node/_run_test_suite_node.js --progress-tests-per-char=4 --progress-width=40
  node node/_run_test_suite_node.js -i 6,7,10
  node node/_run_test_suite_node.js -i=1-100,600-800
  node node/_run_test_suite_node.js -v
  node node/_run_test_suite_node.js -vv
`);
}

function parseTestIdSpec(spec) {
  const text = String(spec || '').trim();
  if (!text) throw new Error('missing test id filter value');

  const ids = new Set();
  for (const part of text.split(',')) {
    const token = part.trim();
    if (!token) continue;

    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      for (let id = start; id <= end; id++) ids.add(id);
    } else if (/^\d+$/.test(token)) {
      ids.add(parseInt(token, 10));
    } else {
      throw new Error(`invalid test id token: ${token}`);
    }
  }

  if (ids.size === 0) throw new Error('no test ids in filter');
  return ids;
}

function selectTests(allTests, idFilter, verbose) {
  if (!idFilter) return allTests;

  const knownIds = new Set(allTests.map(t => t.id));
  const unknown = [...idFilter].filter(id => !knownIds.has(id)).sort((a, b) => a - b);
  if (unknown.length && verbose) {
    console.log('Unknown test ids (skipped):', unknown.join(', '));
  }

  const selected = allTests.filter(t => idFilter.has(t.id));
  if (selected.length === 0) {
    console.error('No matching tests for id filter.');
    process.exit(1);
  }
  return selected;
}

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseArgs(argv) {
  const opts = {
    help: false,
    verbose: false,
    veryVerbose: false,
    progress: true,
    progressTestsPerChar: 2,
    progressWidth: 50,
    testIdSpec: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-vv' || arg === '--very-verbose') {
      opts.veryVerbose = true;
      opts.verbose = true;
    } else if (arg === '-v' || arg === '--verbose') {
      opts.verbose = true;
    } else if (arg === '-t' || arg === '--tests') {
      opts.progress = true;
    } else if (arg === '-q' || arg === '--quiet') {
      opts.progress = false;
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
    } else if (
      arg === '-i' || arg === '--id' ||
      arg.startsWith('--id=') || arg.startsWith('-i=')
    ) {
      let value;
      if (arg.startsWith('--id=')) value = arg.slice(5);
      else if (arg.startsWith('-i=')) value = arg.slice(3);
      else value = argv[++i];
      opts.testIdSpec = value;
    } else if (arg.startsWith('-i') && arg.length > 2) {
      opts.testIdSpec = arg.slice(2);
    }
  }

  if (opts.testIdSpec) {
    try {
      opts.testIds = parseTestIdSpec(opts.testIdSpec);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else {
    opts.testIds = null;
  }

  return opts;
}

function createProgressReporter(total, testsPerChar, width) {
  let testsRun = 0;
  let charsOnLine = 0;
  let groupFailed = false;
  let groupCount = 0;
  const useColor = !!(process.stdout.isTTY);
  // ANSI bright green / bright red — reliable on Windows terminals (truecolor can look cyan)
  const OK = useColor ? '\x1b[92m:\x1b[0m' : ':';
  const FAIL = useColor ? '\x1b[91mF\x1b[0m' : 'F';

  function endLine() {
    process.stdout.write(` (${testsRun}/${total})\n`);
    charsOnLine = 0;
  }

  function emitSymbol(colored) {
    process.stdout.write(colored);
    charsOnLine++;
    if (charsOnLine >= width) endLine();
  }

  function flushGroup() {
    if (groupCount === 0) return;
    emitSymbol(groupFailed ? FAIL : OK);
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

const sandbox = createTestNodeSandbox({ veryVerbose: opts.veryVerbose });
vm.runInNewContext(src, sandbox);

const suite = sandbox.LogTScriptTestSuite;
const testsToRun = selectTests(suite.tests, opts.testIds, opts.verbose);
const testCount = testsToRun.length;
if (opts.testIds) {
  console.log('Running', testCount, 'tests (filtered from', suite.tests.length + ')...');
} else {
  console.log('Running', testCount, 'tests...');
}

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
for (const test of testsToRun) {
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

console.log('Passed:', passed, 'Failed:', failed, 'Total:', testCount);
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
