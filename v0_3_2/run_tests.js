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
  const manifestById = new Map(manifest.entries.map(e => [e.id, e]));
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
    const failDetail = row.querySelector('.test-fail-detail');
    if (failDetail) {
      if (status === 'fail' && failures && failures.length) {
        failDetail.textContent = formatFailures(failures);
      } else {
        failDetail.textContent = '';
      }
    }
    updateSummary();
  }

  function getTestSource(id) {
    const ported = suite.getTest(id);
    if (!ported || typeof ported.run !== 'function') return '';
    return ported.run.toString();
  }

  function defaultInfoTab(detail) {
    if (detail.scripts && detail.scripts.length) return 'script';
    if (detail.steps && detail.steps.length) return 'steps';
    return 'checks';
  }

  function renderInfoTabContent(tab, entry) {
    const detail = entry.detail || { scripts: [], steps: [], assertions: [] };
    if (tab === 'script') {
      if (!detail.scripts || !detail.scripts.length) {
        return '<p class="test-info-empty">Niciun script LogTScript extras. Vezi tab-ul Pași sau Sursă JS.</p>';
      }
      return detail.scripts.map((s, i) => {
        const label = detail.scripts.length > 1 ? 'Script ' + (i + 1) : 'Script';
        return '<div style="margin-bottom:8px"><div style="color:#888;font-size:10px;margin-bottom:4px">' +
          label + ' (' + s.split('\n').length + ' linii)</div><pre class="test-info-pre test-info-pre--script">' + escapeHtml(s) + '</pre></div>';
      }).join('');
    }
    if (tab === 'steps') {
      if (!detail.steps || !detail.steps.length) {
        return '<p class="test-info-empty">Niciun pas API extras (gateReduce, getDocLines, registry, …).</p>';
      }
      return '<ul class="test-info-list test-info-list--steps">' +
        detail.steps.map(s => '<li><code>' + escapeHtml(s) + '</code></li>').join('') +
        '</ul>';
    }
    if (tab === 'checks') {
      if (!detail.assertions || !detail.assertions.length) {
        return '<p class="test-info-empty">Nicio verificare extrasă din h.assert / h.assertThrows.</p>';
      }
      return '<ul class="test-info-list">' +
        detail.assertions.map(a => '<li>' + escapeHtml(a) + '</li>').join('') +
        '</ul>';
    }
    const source = getTestSource(entry.id);
    if (!source) {
      return '<p class="test-info-empty">Test neportat — fără sursă.</p>';
    }
    return '<pre class="test-info-pre test-info-pre--source">' + escapeHtml(source) + '</pre>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  let testSearchIndex = [];
  let testSearchResults = [];
  let testSearchActiveIndex = -1;

  function buildTestSearchIndex() {
    const index = [];
    for (const group of manifest.groups) {
      index.push({
        kind: 'group',
        groupId: group.id,
        label: group.label,
        sublabel: group.rangeLabel,
        haystack: (group.label + ' ' + group.id + ' ' + group.rangeLabel).toLowerCase()
      });
      for (const testId of group.testIds) {
        index.push({
          kind: 'test',
          id: testId,
          groupId: group.id,
          label: 'Test ' + testId,
          sublabel: group.label,
          haystack: String(testId)
        });
      }
    }
    return index;
  }

  function testSearchRank(entry, query) {
    if (entry.kind === 'test') {
      const sid = String(entry.id);
      if (sid === query) return 0;
      if (sid.startsWith(query)) return 1;
      if (sid.includes(query)) return 2;
      return 3;
    }
    const label = entry.label.toLowerCase();
    if (label === query) return 0;
    if (label.startsWith(query)) return 1;
    if (label.includes(query)) return 2;
    return 3;
  }

  function filterTestSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      return testSearchIndex.filter(entry => entry.kind === 'group');
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const numericQuery = /^\d+$/.test(q);

    const list = testSearchIndex.filter(function (entry) {
      if (entry.kind === 'test') {
        const sid = String(entry.id);
        if (numericQuery) return sid.includes(q);
        return tokens.some(token => /^\d+$/.test(token) && sid.includes(token));
      }
      return tokens.every(token => entry.haystack.indexOf(token) !== -1);
    });

    list.sort(function (a, b) {
      const kindOrder = a.kind === b.kind ? 0 : (a.kind === 'group' ? -1 : 1);
      if (kindOrder !== 0) return kindOrder;
      const ra = testSearchRank(a, q);
      const rb = testSearchRank(b, q);
      if (ra !== rb) return ra - rb;
      if (a.kind === 'test') return a.id - b.id;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

    return list.slice(0, 40);
  }

  function closeTestSearchMenu() {
    const menu = document.getElementById('testSearchMenu');
    const input = document.getElementById('testSearchInput');
    if (!menu) return;
    menu.hidden = true;
    menu.innerHTML = '';
    testSearchActiveIndex = -1;
    testSearchResults = [];
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function flashSearchTarget(el) {
    if (!el) return;
    el.classList.remove('search-highlight');
    void el.offsetWidth;
    el.classList.add('search-highlight');
    setTimeout(() => el.classList.remove('search-highlight'), 1300);
  }

  function scrollToTestSearchResult(result) {
    if (!result) return;
    if (result.kind === 'group') {
      const section = document.querySelector('.test-group[data-group="' + result.groupId + '"]');
      if (!section) return;
      section.classList.remove('collapsed');
      flashSearchTarget(section);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const row = document.querySelector('.test-row[data-id="' + result.id + '"]');
    if (!row) return;
    const section = row.closest('.test-group');
    if (section) section.classList.remove('collapsed');
    flashSearchTarget(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function selectTestSearchResult(index) {
    const result = testSearchResults[index];
    if (!result) return;
    const input = document.getElementById('testSearchInput');
    closeTestSearchMenu();
    if (input) {
      input.value = '';
      input.blur();
    }
    scrollToTestSearchResult(result);
  }

  function highlightTestSearchItem(index) {
    const menu = document.getElementById('testSearchMenu');
    if (!menu) return;
    const items = menu.querySelectorAll('li[data-index]');
    items.forEach(function (li, i) {
      li.classList.toggle('test-search-active', i === index);
    });
    const active = items[index];
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderTestSearchMenu(query) {
    const menu = document.getElementById('testSearchMenu');
    const input = document.getElementById('testSearchInput');
    if (!menu || !input) return;

    testSearchResults = filterTestSearch(query);
    testSearchActiveIndex = testSearchResults.length ? 0 : -1;

    if (!testSearchResults.length) {
      menu.innerHTML = '<li class="test-search-empty">No matching group or test #</li>';
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    menu.innerHTML = testSearchResults.map(function (entry, i) {
      const active = i === testSearchActiveIndex ? ' test-search-active' : '';
      const section = entry.kind === 'group'
        ? 'group · ' + escapeHtml(entry.sublabel)
        : escapeHtml(entry.sublabel);
      return (
        '<li class="' + active + '" role="option" data-index="' + i + '">' +
        '<button type="button" data-index="' + i + '">' +
        escapeHtml(entry.label) +
        '<span class="test-search-section">' + section + '</span>' +
        '</button></li>'
      );
    }).join('');

    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');

    menu.querySelectorAll('button[data-index]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectTestSearchResult(parseInt(btn.getAttribute('data-index'), 10));
      });
    });
  }

  function onTestSearchKeydown(e) {
    if (e.key === 'Escape') {
      closeTestSearchMenu();
      e.target.blur();
      return;
    }
    const menu = document.getElementById('testSearchMenu');
    if (!menu || menu.hidden || !testSearchResults.length) {
      if (e.key === 'Enter') {
        const first = filterTestSearch(e.target.value)[0];
        if (first) {
          e.preventDefault();
          testSearchResults = filterTestSearch(e.target.value);
          selectTestSearchResult(0);
        }
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      testSearchActiveIndex = Math.min(testSearchActiveIndex + 1, testSearchResults.length - 1);
      highlightTestSearchItem(testSearchActiveIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      testSearchActiveIndex = Math.max(testSearchActiveIndex - 1, 0);
      highlightTestSearchItem(testSearchActiveIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (testSearchActiveIndex >= 0) {
        selectTestSearchResult(testSearchActiveIndex);
      }
    }
  }

  function initTestSearch() {
    const input = document.getElementById('testSearchInput');
    const menu = document.getElementById('testSearchMenu');
    const wrap = document.getElementById('testSearch');
    if (!input || !menu) return;

    input.addEventListener('input', function () {
      renderTestSearchMenu(input.value);
    });
    input.addEventListener('focus', function () {
      renderTestSearchMenu(input.value);
    });
    input.addEventListener('keydown', onTestSearchKeydown);
    input.addEventListener('blur', function () {
      setTimeout(closeTestSearchMenu, 120);
    });

    menu.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });

    document.addEventListener('click', function (e) {
      if (wrap && !wrap.contains(e.target)) {
        closeTestSearchMenu();
      }
    });
  }

  function activateInfoTab(infoEl, tabName) {
    infoEl.querySelectorAll('.test-info-tab').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabName);
    });
    infoEl.querySelectorAll('.test-info-panel').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.tab === tabName);
    });
  }

  function createTestInfo(entry) {
    const info = document.createElement('div');
    info.className = 'test-info';
    const detail = entry.detail || { scripts: [], steps: [], assertions: [] };
    const initialTab = defaultInfoTab(detail);

    const tabs = document.createElement('div');
    tabs.className = 'test-info-tabs';

    const tabDefs = [
      { id: 'script', label: 'Script' },
      { id: 'steps', label: 'Pași' },
      { id: 'checks', label: 'Verificări' },
      { id: 'source', label: 'Sursă JS' }
    ];

    for (const def of tabDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn test-info-tab' + (def.id === initialTab ? ' is-active' : '');
      btn.dataset.tab = def.id;
      btn.textContent = def.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activateInfoTab(info, def.id);
      });
      tabs.appendChild(btn);

      const panel = document.createElement('div');
      panel.className = 'test-info-panel' + (def.id === initialTab ? ' is-active' : '');
      panel.dataset.tab = def.id;
      panel.innerHTML = renderInfoTabContent(def.id, entry);
      info.appendChild(panel);
    }

    info.insertBefore(tabs, info.firstChild);
    return info;
  }

  function toggleTestInfo(row) {
    const opening = !row.classList.contains('info-open');
    row.classList.toggle('info-open', opening);
    const title = row.querySelector('.test-title');
    if (title) {
      title.classList.toggle('is-open', opening);
      title.title = opening ? 'Ascunde detalii' : 'Arată detalii test';
    }
    if (opening) {
      const entry = manifestById.get(Number(row.dataset.id));
      const sourcePanel = row.querySelector('.test-info-panel[data-tab="source"]');
      if (entry && sourcePanel) {
        sourcePanel.innerHTML = renderInfoTabContent('source', entry);
      }
    }
  }

  function entryForTest(entry) {
    const run = suite.getRun(entry.id);
    const ported = suite.getTest(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      group: entry.group,
      detail: entry.detail || { scripts: [], steps: [], assertions: [] },
      run,
      propagation: ported ? ported.propagation : 'legacy'
    };
  }

  async function runOneTest(test) {
    if (!test.run) return null;

    const row = document.querySelector('.test-row[data-id="' + test.id + '"]');
    if (row) row.querySelector('.dot').className = 'dot running';

    const session = suite.createSession({ propagation: test.propagation || 'legacy' });
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

  /** legacy | wave | mixed | null (no ported tests in group) */
  function groupPropagationMode(tests) {
    let hasLegacy = false;
    let hasWave = false;
    for (const test of tests) {
      if (!test.run) continue;
      if (test.propagation === 'wave') hasWave = true;
      else hasLegacy = true;
    }
    if (!hasLegacy && !hasWave) return null;
    if (hasLegacy && hasWave) return 'mixed';
    if (hasWave) return 'wave';
    return 'legacy';
  }

  function createPropBadge(mode) {
    const propBadge = document.createElement('span');
    propBadge.className = 'prop-badge prop-badge--' + mode;
    propBadge.textContent = mode;
    const titles = {
      legacy: 'Signal propagation: legacy',
      wave: 'Signal propagation: wave',
      mixed: 'Signal propagation: mixed (legacy + wave)'
    };
    propBadge.title = titles[mode] || titles.legacy;
    return propBadge;
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
      const groupTests = testsForGroup(group);
      const groupPropMode = groupPropagationMode(groupTests);

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
     // titleLine.appendChild(range);
      if (groupPropMode) {
     //   titleLine.appendChild(createPropBadge(groupPropMode));
      }

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
      if (groupPropMode) {
        header.appendChild(createPropBadge(groupPropMode));
      }

      header.appendChild(btnGroup);
      section.appendChild(header);

      for (const test of groupTests) {
        const manifestEntry = manifestById.get(test.id) || {
          id: test.id,
          title: test.title,
          detail: { scripts: [], steps: [], assertions: [] }
        };

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

        const head = document.createElement('div');
        head.className = 'test-head';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'test-title';
        titleSpan.textContent = 'Test ' + test.id + ': ' + test.title;
        titleSpan.title = 'Arată detalii test';
        titleSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleTestInfo(row);
        });

        head.appendChild(titleSpan);

        if (test.run) {
          const mode = test.propagation === 'wave' ? 'wave' : 'legacy';
          head.appendChild(createPropBadge(mode));

          const btnRun = document.createElement('button');
          btnRun.type = 'button';
          btnRun.className = 'btn btn--run';
          btnRun.textContent = '\u25B6';
          btnRun.title = 'Run test ' + test.id;
          btnRun.addEventListener('click', async (e) => {
            e.stopPropagation();
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
          head.appendChild(btnRun);
        } else {
          const badge = document.createElement('span');
          badge.className = 'not-ported-badge';
          badge.textContent = 'not ported';
          head.appendChild(badge);
        }

        body.appendChild(head);
        body.appendChild(createTestInfo(manifestEntry));

        const failDetail = document.createElement('div');
        failDetail.className = 'test-fail-detail';
        body.appendChild(failDetail);

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
  testSearchIndex = buildTestSearchIndex();
  initTestSearch();
})();
