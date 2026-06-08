(function () {
  'use strict';

  const suite = window.LogTScriptTestSuite;
  const manifest = window.LogTScriptManifest;
  if (!suite || !manifest) {
    document.getElementById('testList').textContent =
      'Error: LogTScriptTestSuite or LogTScriptManifest not loaded.';
    return;
  }

  const testListEl = document.getElementById('testList');
  const summaryEl = document.getElementById('summary');
  const subtitleEl = document.getElementById('subtitle');
  const btnRunAll = document.getElementById('btnRunAll');

  const statusById = new Map();
  let running = false;

  const portedCount = suite.tests.length;
  const totalCount = manifest.entries.length;
  if (subtitleEl) {
    subtitleEl.textContent =
      portedCount + ' / ' + totalCount; // + ' tests ported. Grey rows without ▶ are not yet ported.';
  }

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

  function countStatuses(ids) {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    for (const id of ids) {
      const s = statusById.get(id);
      if (s === 'pass') passed++;
      else if (s === 'fail') failed++;
      else if (s !== 'not-ported') pending++;
    }
    return { passed, failed, pending };
  }

  function formatStatusCounts(counts) {
    return 'Passed: ' + counts.passed + ' | Failed: ' + counts.failed + ' | Pending: ' + counts.pending;
  }

  function updateSummary() {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    let notPorted = 0;
    for (const entry of manifest.entries) {
      const s = statusById.get(entry.id);
      if (s === 'pass') passed++;
      else if (s === 'fail') failed++;
      else if (s === 'not-ported') notPorted++;
      else pending++;
    }
    summaryEl.textContent =
      'Passed: ' + passed + ' | Failed: ' + failed + ' | Pending: ' + pending;
    // +' | Not ported: ' + notPorted;

    for (const group of manifest.groups) {
      const el = document.querySelector(
        '.test-group[data-group="' + group.id + '"] .group-summary'
      );
      if (el) {
        el.textContent = formatStatusCounts(countStatuses(group.testIds));
      }
    }
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
    dot.className = 'dot ' + (status === 'pending' || status === 'not-ported' ? '' : status);
    row.classList.toggle('fail-open', status === 'fail');
    const detail = row.querySelector('.test-detail');
    if (status === 'fail' && failures && failures.length) {
      detail.textContent = formatFailures(failures);
    } else {
      detail.textContent = '';
    }
    updateSummary();
  }

  function entryForTest(entry) {
    const run = suite.getRun(entry.id);
    return { id: entry.id, title: entry.title, group: entry.group, run };
  }

  async function runOneTest(test) {
    if (!test.run) return null;

    const row = document.querySelector('.test-row[data-id="' + test.id + '"]');
    if (row) row.querySelector('.dot').className = 'dot running';

    const session = suite.createSession();
    const h = createHarness();
    try {
      test.run(h, session);
    } catch (e) {
      h.setUnexpected(e);
    } finally {
      session.cleanup();
    }

    const ok = h.ok();
    setTestStatus(test.id, ok ? 'pass' : 'fail', h.failures());
    return ok;
  }

  async function resetStatus(tests) {
    for (const test of tests) {
      const status = test.run ? 'pending' : 'not-ported';
      setTestStatus(test.id, status, null);
    }
  }

  async function runTests(tests) {
    const runnable = tests.filter(t => t.run);
    await resetStatus(tests);
    await new Promise(resolve => setTimeout(resolve, 300));

    for (const test of runnable) {
      await runOneTest(test);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  function testsForGroup(group) {
    const idSet = new Set(group.testIds);
    return manifest.entries
      .filter(e => idSet.has(e.id))
      .map(entryForTest);
  }

  function allTests() {
    return manifest.entries.map(entryForTest);
  }

  function buildUI() {
    for (const entry of manifest.entries) {
      const run = suite.getRun(entry.id);
      statusById.set(entry.id, run ? 'pending' : 'not-ported');
    }
    updateSummary();

    for (const group of manifest.groups) {
      const section = document.createElement('div');
      section.className = 'test-group collapsed';
      section.dataset.group = group.id;

      const header = document.createElement('div');
      header.className = 'group-header';

      const main = document.createElement('div');
      main.className = 'group-header-main';

      const titleLine = document.createElement('div');
      titleLine.className = 'group-title-line';

      const toggle = document.createElement('span');
      toggle.className = 'group-toggle';
      toggle.setAttribute('aria-hidden', 'true');

      const title = document.createElement('span');
      title.className = 'group-title';
      title.textContent = group.label;
      const range = document.createElement('span');
      range.className = 'group-range';
      range.textContent = ' (' + group.rangeLabel + ')';

      titleLine.appendChild(toggle);
      titleLine.appendChild(title);
      titleLine.appendChild(range);

      const groupSummary = document.createElement('div');
      groupSummary.className = 'group-summary';
      groupSummary.textContent = formatStatusCounts(countStatuses(group.testIds));

      main.appendChild(titleLine);
      main.appendChild(groupSummary);

      const btnGroup = document.createElement('button');
      btnGroup.type = 'button';
      btnGroup.className = 'btn btn--group';
      btnGroup.textContent = 'Run group';
      btnGroup.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (running) return;
        setRunningUI(true);
        try {
          await runTests(testsForGroup(group));
        } finally {
          setRunningUI(false);
        }
      });

      header.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) return;
        section.classList.toggle('collapsed');
      });

      header.appendChild(main);
      header.appendChild(btnGroup);
      section.appendChild(header);

      const groupTests = testsForGroup(group);
      for (const test of groupTests) {
        const row = document.createElement('div');
        row.className = 'test-row' + (test.run ? '' : ' not-ported');
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

        body.appendChild(titleSpan);

        if (test.run) {
          const btnRun = document.createElement('button');
          btnRun.type = 'button';
          btnRun.className = 'btn btn--run';
          btnRun.textContent = '\u25B6';
          btnRun.title = 'Run test ' + test.id;
          btnRun.addEventListener('click', async () => {
            if (running) return;
            setRunningUI(true);
            try {
              await resetStatus([test]);
              await new Promise(resolve => setTimeout(resolve, 300));
              
              await runOneTest(test);
            } finally {
              setRunningUI(false);
            }
          });
          body.appendChild(btnRun);
        } else {
          const badge = document.createElement('span');
          badge.className = 'not-ported-badge';
          badge.textContent = 'not ported';
          body.appendChild(badge);
        }

        const detail = document.createElement('div');
        detail.className = 'test-detail';
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
      await runTests(allTests().filter(t => t.run));
    } finally {
      setRunningUI(false);
    }
  });
  
  btnEditor.addEventListener('click', async() => {
    window.location.href = 'script_editor_v0_3_2.html';
  });

  buildUI();
})();
