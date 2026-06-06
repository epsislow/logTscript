(function () {
  'use strict';

  const suite = window.LogTScriptTestSuite;
  if (!suite) {
    document.getElementById('testList').textContent = 'Error: LogTScriptTestSuite not loaded.';
    return;
  }

  const ctx = suite.createContext();
  const testListEl = document.getElementById('testList');
  const summaryEl = document.getElementById('summary');
  const btnRunAll = document.getElementById('btnRunAll');

  const statusById = new Map();
  let running = false;

  function createHarness() {
    const assertions = [];
    let unexpected = null;

    const norm = s => String(s).split('\n').map(l => l.trimEnd()).join('\n').trim();

    return {
      assertions,
      assert(testName, actual, expected) {
        const a = norm(actual);
        const e = norm(expected);
        assertions.push({
          name: testName,
          pass: a === e,
          expected: e,
          actual: a
        });
      },
      assertThrows(testName, fn, expectedMsg) {
        try {
          fn();
          assertions.push({
            name: testName,
            pass: false,
            expected: 'throw' + (expectedMsg ? ' containing "' + expectedMsg + '"' : ''),
            actual: '(no error thrown)'
          });
        } catch (e) {
          const ok = !expectedMsg || e.message.includes(expectedMsg);
          assertions.push({
            name: testName,
            pass: ok,
            expected: expectedMsg || '(any error)',
            actual: ok ? '(threw)' : 'wrong error: "' + e.message + '"'
          });
        }
      },
      fail(message) {
        assertions.push({
          name: message,
          pass: false,
          expected: 'pass',
          actual: 'fail'
        });
      },
      setUnexpected(err) {
        unexpected = err;
      },
      ok() {
        return !unexpected && assertions.every(a => a.pass);
      },
      failures() {
        const list = assertions.filter(a => !a.pass);
        if (unexpected) {
          list.push({
            name: 'Unexpected error',
            pass: false,
            expected: '(no throw)',
            actual: unexpected.message || String(unexpected)
          });
        }
        return list;
      }
    };
  }

  function formatFailures(failures) {
    return failures.map(f => {
      if (f.expected === '(no throw)' || f.expected === 'throw' || String(f.expected).startsWith('throw ')) {
        return f.name + '\n  ' + f.actual;
      }
      return f.name + '\n  Expected: ' + f.expected + '\n  Got: ' + f.actual;
    }).join('\n\n');
  }

  function updateSummary() {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    for (const s of statusById.values()) {
      if (s === 'pass') passed++;
      else if (s === 'fail') failed++;
      else pending++;
    }
    summaryEl.textContent = 'Passed: ' + passed + ' | Failed: ' + failed + ' | Pending: ' + pending;
  }

  function setRunningUI(isRunning) {
    running = isRunning;
    btnRunAll.disabled = isRunning;
    document.querySelectorAll('.btn--run, .btn--group').forEach(b => { b.disabled = isRunning; });
  }

  function setTestStatus(id, status, failures) {
    statusById.set(id, status);
    const row = document.querySelector('.test-row[data-id="' + id + '"]');
    if (!row) return;
    const dot = row.querySelector('.dot');
    dot.className = 'dot ' + (status === 'pending' ? '' : status);
    row.classList.toggle('fail-open', status === 'fail');
    const detail = row.querySelector('.test-detail');
    if (status === 'fail' && failures && failures.length) {
      detail.textContent = formatFailures(failures);
    } else {
      detail.textContent = '';
    }
    updateSummary();
  }

  async function runOneTest(test) {
    const row = document.querySelector('.test-row[data-id="' + test.id + '"]');
    if (row) row.querySelector('.dot').className = 'dot running';

    const h = createHarness();
    try {
      test.run(h, ctx);
    } catch (e) {
      h.setUnexpected(e);
    }

    const ok = h.ok();
    setTestStatus(test.id, ok ? 'pass' : 'fail', h.failures());
    return ok;
  }

  async function runTests(tests) {
    for (const test of tests) {
      await runOneTest(test);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  function testsForGroup(group) {
    const idSet = new Set(group.testIds);
    return suite.tests.filter(t => idSet.has(t.id));
  }

  function buildUI() {
    for (const test of suite.tests) {
      statusById.set(test.id, 'pending');
    }
    updateSummary();

    for (const group of suite.groups) {
      const section = document.createElement('div');
      section.className = 'test-group';
      section.dataset.group = group.id;

      const header = document.createElement('div');
      header.className = 'group-header';

      const titleWrap = document.createElement('div');
      const title = document.createElement('span');
      title.className = 'group-title';
      title.textContent = group.label;
      const range = document.createElement('span');
      range.className = 'group-range';
      range.textContent = ' (' + group.rangeLabel + ')';
      titleWrap.appendChild(title);
      titleWrap.appendChild(range);

      const btnGroup = document.createElement('button');
      btnGroup.type = 'button';
      btnGroup.className = 'btn btn--group';
      btnGroup.textContent = 'Run group';
      btnGroup.addEventListener('click', async () => {
        if (running) return;
        setRunningUI(true);
        try {
          await runTests(testsForGroup(group));
        } finally {
          setRunningUI(false);
        }
      });

      header.appendChild(titleWrap);
      header.appendChild(btnGroup);
      section.appendChild(header);

      const groupTests = testsForGroup(group);
      for (const test of groupTests) {
        const row = document.createElement('div');
        row.className = 'test-row';
        row.dataset.id = test.id;

        const dot = document.createElement('span');
        dot.className = 'dot';

        const idSpan = document.createElement('span');
        idSpan.className = 'test-id';
        idSpan.textContent = String(test.id);

        const body = document.createElement('div');
        body.className = 'test-body';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'test-title';
        titleSpan.textContent = 'Test ' + test.id + ': ' + test.title;

        const btnRun = document.createElement('button');
        btnRun.type = 'button';
        btnRun.className = 'btn btn--run';
        btnRun.textContent = '\u25B6';
        btnRun.title = 'Run test ' + test.id;
        btnRun.addEventListener('click', async () => {
          if (running) return;
          setRunningUI(true);
          try {
            await runOneTest(test);
          } finally {
            setRunningUI(false);
          }
        });

        const detail = document.createElement('div');
        detail.className = 'test-detail';

        body.appendChild(titleSpan);
        body.appendChild(btnRun);
        body.appendChild(detail);

        row.appendChild(dot);
        row.appendChild(idSpan);
        row.appendChild(body);
        section.appendChild(row);
      }

      testListEl.appendChild(section);
    }
  }

  btnRunAll.addEventListener('click', async () => {
    if (running) return;
    setRunningUI(true);
    try {
      await runTests(suite.tests);
    } finally {
      setRunningUI(false);
    }
  });

  buildUI();
})();
