/* ================= DOC VIEWER ================= */

// BEGIN GENERATED DOC_SECTIONS (node/_gen_doc_data.js)
const DOC_SECTIONS = [
  {
    title: 'Reference',
    items: [
      { file: 'doc-function.md', label: 'doc() function' },
      { file: 'user-functions.md', label: 'User functions (def)', searchExtra: 'def define call return LOAD alias library user-defined function arity body' },
      { file: 'builtin-functions.md', label: 'Built-in functions', searchExtra: 'internal MUX DEMUX REG LATCH NOT AND OR shift arithmetic builtin HIGH BITINDEX ONEHOT ADD SUBTRACT vector signed tag' },
      { file: 'builtin-tagged-index.md', label: 'Tagged built-ins (signed / vector / index)', searchExtra: 'ADD SUBTRACT MULTIPLY DIVIDE MAC GT LT MIN MAX CLAMP SUM DOT ARGMAX ARGMIN EQ RSHIFT LSHIFT signed vector index call tag' },
      { file: 'builtin-logic-gate-functions.md', label: 'Built-in logic gates' },
      { file: 'builtin-sequential-functions.md', label: 'Built-in sequential (LATCH, REG)' },
      { file: 'builtin-routing-functions.md', label: 'Built-in routing (MUX, DEMUX)' },
      { file: 'builtin-bit-selection-functions.md', label: 'Built-in bit selection', searchExtra: 'HIGH LOW ANY ZERO ANYZ ANYX ANY1 ANY0 ANY01 ANYZX ALLZ ALLX ALL1 ALL0 ALL01 ALLZX BITINDEX ONEHOT priority encoder' },
      { file: 'builtin-bit-analysis-functions.md', label: 'Built-in bit analysis', searchExtra: 'PARITY CNTONE CNTZERO BITSIZE' },
      { file: 'builtin-bit-transform-functions.md', label: 'Built-in bit transform', searchExtra: 'LSHIFT RSHIFT REVERSE LROTATE RROTATE rotate shift' },
      { file: 'components.md', label: 'Component catalog' },
      { file: 'short-notation.md', label: 'Short notation' },
      { file: 'loop.md', label: 'Loop preprocessor (loop N..M[)', searchExtra: 'repeat placeholder ?N deduplicate nested expand preprocessor' },
      { file: 'assignment-operators.md', label: 'Assignment operators (=, =:, :=)', searchExtra: 'right pad left pad wire assignment initial vector element slice' },
      { file: 'wire-vectors.md', label: 'Wire vectors (4wire[3])', searchExtra: 'vector element index slice 1D array Nwire count show peek probe Zlist SUM DOT MIN MAX reduction' },
      { file: 'vector-reduction.md', label: 'Vector reduction (SUM, DOT, MIN, MAX)', searchExtra: 'SUM DOT MIN MAX vector expand dot product perceptron reduction over result' },
      { file: 'modes.md', label: 'Script modes (MODE)', searchExtra: 'MODE STRICT WIREWRITE ZSTATE default wirewrite tristate' },
      { file: 'arithmetic.md', label: 'Arithmetic (built-in)' },
      { file: 'number-conversion.md', label: 'Number conversion', searchExtra: 'decimal BCD hex CNTN10S N2N10S N10S2N CNTN16S N2N16S N16S2N ISDIGIT packed digits' },
      { file: 'debug.md', label: 'Debug (show / peek / probe / lutOf)', searchExtra: 'show peek probe lutOf exprOfLut truthTableOf output panel' },
      { file: 'signal-propagation.md', label: 'Signal propagation' },
      { file: 'zstate.md', label: 'MODE ZSTATE (tristate / multi-driver)', searchExtra: 'Z X high impedance bus buffer tristate conflict get>= out>= ZRELEASE()' },
      { file: 'editorUI.md', label: 'Editor UI' },
      { file: 'doc-viewer.md', label: 'Documentation viewer', searchExtra: 'Doc Load Load and Run logts-play search history index examples runnable' },
      { file: 'network-traffic-panel.md', label: 'Network Traffic panel', searchExtra: 'Win traffic send log filter pause live pagination packet id clear dropped received' }
    ],
  },
  {
    title: 'Composite blocks',
    items: [
      { file: 'board.md', label: 'Board' },
      { file: 'chip.md', label: 'Chip' },
      { file: 'mini-cpu.md', label: 'Mini CPU demo', searchExtra: 'harvard alu cpu4 step' },
      { file: 'mini-cpu-v2.md', label: 'Mini CPU v2 demo', searchExtra: 'asm beq lut terminal cpu4v2' },
      { file: 'pocket-calc.md', label: 'Pocket calculator demo', searchExtra: 'keyboard calc terminal divider toAscii onlyDigits' },
      { file: 'mini-cpu-plan.md', label: 'Mini CPU plan', searchExtra: 'feasibility variant harvard' },
      { file: 'pcb.md', label: 'PCB (deprecated)' }
    ],
  },
  {
    title: 'Interactive inputs',
    items: [
      { file: 'interactive-components.md', label: 'Overview' },
      { file: 'switch.md', label: 'switch' },
      { file: 'key.md', label: 'key' },
      { file: 'keyboard.md', label: 'keyboard', searchExtra: 'input ASCII onlyDigits allowEnter allowBackspace valid focus UART RX' },
      { file: 'dip.md', label: 'dip' },
      { file: 'ioport.md', label: 'ioport', searchExtra: 'I/O port gpio port aggregation in out bus' },
      { file: 'rotary.md', label: 'rotary' }
    ],
  },
  {
    title: 'Displays',
    items: [
      { file: 'led.md', label: 'led' },
      { file: 'led-bar.md', label: 'LED bar' },
      { file: 'seven-seg.md', label: '7seg' },
      { file: '14seg.md', label: '14seg' },
      { file: 'lcd.md', label: 'lcd' },
      { file: 'clcd.md', label: 'clcd' },
      { file: 'clcd-symbols.md', label: 'CLCD symbols', searchExtra: 'catalog icon font awesome search symbol style' },
      { file: 'alu.md', label: 'alu' },
      { file: 'terminal.md', label: 'terminal' },
      { file: 'dots.md', label: 'dots' }
    ],
  },
  {
    title: 'Arithmetic devices',
    items: [
      { file: 'adder.md', label: 'adder' },
      { file: 'subtract.md', label: 'subtract' },
      { file: 'multiplier.md', label: 'multiplier' },
      { file: 'divider.md', label: 'divider' },
      { file: 'shifter.md', label: 'shifter' },
      { file: 'counter.md', label: 'counter' }
    ],
  },
  {
    title: 'Storage & timing',
    items: [
      { file: 'mem.md', label: 'mem' },
      { file: 'asm.md', label: 'asm', searchExtra: 'inline assembler isa mnemonic program blob myisa decode disassemble disassembly' },
      { file: 'asm-composition.md', label: 'ASM composition', searchExtra: 'use repeat align base external label multi-isa firmware boot dsp metadata asmModuleId' },
      { file: 'lut.md', label: 'lut', searchExtra: 'inline lookup table decoder comp variableDepth prefixFree Huffman decode isValid' },
      { file: 'boolean-lut.md', label: 'Boolean LUT (lutOf / exprOfLut)', searchExtra: 'lutOf exprOfLut description filters inline truth table minimize Quine' },
      { file: 'boolean-analysis.md', label: 'Boolean analysis helpers', searchExtra: 'truthTableOf simplify equivalent inputsOf costOf filters comma x' },
      { file: 'protocol.md', label: 'protocol', searchExtra: 'inline uart spi i2c reverse parity clock repeat tx sda scl mosi decode expand collapse length lengthOf withLength def huffPacket huffRecover variable width' },
      { file: 'huffman.md', label: 'Huffman example', searchExtra: 'prefixFree expand collapse huffPacket huffRecover variable length coding codebook packet round-trip greedy decode' },
      { file: 'reg.md', label: 'reg' },
      { file: 'queue.md', label: 'queue', searchExtra: 'fifo buffer push pop front empty full size capacity free' },
      { file: 'network.md', label: 'network', searchExtra: 'packet bus channel send target broadcast unicast sendId fifo rx' },
      { file: 'stack.md', label: 'stack', searchExtra: 'lifo push pop top call stack subroutine' },
      { file: 'oscillator.md', label: 'oscillator' }
    ],
  },
  {
    title: 'Other',
    items: [
      { file: 'meta-constants.md', label: 'Meta constants' },
      { file: 'slider.md', label: 'Slider component' }
    ],
  }
];

/** In DOC_CONTENT + search only — not listed on the doc index page */
const DOC_SEARCH_ONLY = [
    { file: 'future-component-ideas.md', label: 'Future component ideas', section: 'Backlog',
      searchExtra:
        'planning roadmap backlog alu dpram lut mux demux decoder rom stack fifo uart gpio slider irq dma eeprom' },
    { file: 'builtin-ADD.md', label: 'ADD', section: 'Arithmetic',
      searchExtra:
        'signed vector carry overflow add' },
    { file: 'builtin-SUBTRACT.md', label: 'SUBTRACT', section: 'Arithmetic',
      searchExtra:
        'signed vector borrow subtract' },
    { file: 'builtin-MULTIPLY.md', label: 'MULTIPLY', section: 'Arithmetic',
      searchExtra:
        'signed vector multiply over' },
    { file: 'builtin-DIVIDE.md', label: 'DIVIDE', section: 'Arithmetic',
      searchExtra:
        'signed vector quotient mod divide' },
    { file: 'builtin-MAC.md', label: 'MAC', section: 'Arithmetic',
      searchExtra:
        'signed vector multiply accumulate' },
    { file: 'builtin-GT.md', label: 'GT', section: 'Arithmetic',
      searchExtra:
        'signed vector greater than compare' },
    { file: 'builtin-LT.md', label: 'LT', section: 'Arithmetic',
      searchExtra:
        'signed vector less than compare' },
    { file: 'builtin-MIN.md', label: 'MIN', section: 'Arithmetic',
      searchExtra:
        'signed vector minimum' },
    { file: 'builtin-MAX.md', label: 'MAX', section: 'Arithmetic',
      searchExtra:
        'signed vector maximum' },
    { file: 'builtin-CLAMP.md', label: 'CLAMP', section: 'Arithmetic',
      searchExtra:
        'signed vector bounds clamp' },
    { file: 'builtin-SUM.md', label: 'SUM', section: 'Vector reduction',
      searchExtra:
        'signed vector sum reduction over' },
    { file: 'builtin-DOT.md', label: 'DOT', section: 'Vector reduction',
      searchExtra:
        'signed dot product vector' },
    { file: 'builtin-ARGMAX.md', label: 'ARGMAX', section: 'Vector reduction',
      searchExtra:
        'signed index one-hot argmax maximum position' },
    { file: 'builtin-ARGMIN.md', label: 'ARGMIN', section: 'Vector reduction',
      searchExtra:
        'signed index one-hot argmin minimum position' },
    { file: 'builtin-EQ.md', label: 'EQ', section: 'Logic gates',
      searchExtra:
        'vector equality bitwise equal' },
    { file: 'builtin-RSHIFT.md', label: 'RSHIFT', section: 'Bit transform',
      searchExtra:
        'signed vector shift right ASHR logical' },
    { file: 'builtin-LSHIFT.md', label: 'LSHIFT', section: 'Bit transform',
      searchExtra:
        'vector shift left' },
    { file: 'builtin-LROTATE.md', label: 'LROTATE', section: 'Bit transform',
      searchExtra:
        'vector rotate left' },
    { file: 'builtin-RROTATE.md', label: 'RROTATE', section: 'Bit transform',
      searchExtra:
        'vector rotate right' },
    { file: 'builtin-REVERSE.md', label: 'REVERSE', section: 'Bit transform',
      searchExtra:
        'vector reverse bits' }
];
// END GENERATED DOC_SECTIONS

const DOCS = DOC_SECTIONS.flatMap(function (section) {
  return section.items;
});

const DOC_SEARCH_INDEX = (function () {
  const list = [];
  function pushEntry(sectionTitle, item) {
    const stem = item.file.replace(/\.md$/, '');
    const extra = item.searchExtra ? ' ' + item.searchExtra : '';
    list.push({
      file: item.file,
      label: item.label,
      section: sectionTitle,
      haystack: (item.label + ' ' + stem + ' ' + stem.replace(/-/g, ' ') + extra).toLowerCase(),
    });
  }
  DOC_SECTIONS.forEach(function (section) {
    section.items.forEach(function (item) {
      pushEntry(section.title, item);
    });
  });
  DOC_SEARCH_ONLY.forEach(function (item) {
    pushEntry(item.section || 'Other', item);
  });
  return list;
})();

let currentDocFile = '';
let lastDocScrollTop = 0;
let playBlockIndex = 0;
let docViewerReady = false;
let docSearchActiveIndex = -1;
let docSearchResults = [];

const DOC_HISTORY_MAX = 200;
const DOC_PAGE_HISTORY = '__history__';
let docBackStack = [];
let docNavLog = [];
let docNavSuppressPush = false;

function isDocHistoryPage() {
  return currentDocFile === DOC_PAGE_HISTORY;
}

function isDocIndexPage() {
  return currentDocFile === '';
}

function docLabelForFile(file) {
  if (file === DOC_PAGE_HISTORY) return 'History';
  if (!file) return 'Index';
  const doc = DOCS.find(function (d) { return d.file === file; });
  if (doc) return doc.label;
  const extra = DOC_SEARCH_ONLY.find(function (d) { return d.file === file; });
  if (extra) return extra.label;
  return file.replace(/\.md$/, '');
}

function docCaptureCurrentPlace() {
  return {
    file: currentDocFile,
    scrollTop: captureDocScroll(),
    label: docLabelForFile(currentDocFile),
  };
}

function trimDocBackStack() {
  while (docBackStack.length > DOC_HISTORY_MAX) {
    docBackStack.shift();
  }
}

function trimDocNavLog() {
  while (docNavLog.length > DOC_HISTORY_MAX) {
    docNavLog.shift();
  }
}

function appendDocNavLog(entry) {
  docNavLog.push({
    file: entry.file,
    scrollTop: entry.scrollTop != null ? entry.scrollTop : 0,
    label: entry.label || docLabelForFile(entry.file),
    kind: entry.kind || 'nav',
    at: Date.now(),
  });
  trimDocNavLog();
  if (isDocHistoryPage()) {
    renderDocHistoryPage({ scrollTop: captureDocScroll() });
  }
}

function updateDocNavButtons() {
  const btnBack = document.getElementById('btnDocBack');
  if (btnBack) {
    btnBack.disabled = docBackStack.length === 0;
  }
}

function formatDocHistoryKind(entry) {
  if (entry.kind === 'back') return '\u2190 ';
  if (entry.kind === 'search') return '';
  if (entry.kind === 'history') return '\u21bb ';
  return '';
}

function formatDocHistoryMeta(entry) {
  if (entry.kind === 'search') return 'search';
  if (entry.kind === 'index') return 'index';
  if (entry.kind === 'back') return 'back';
  if (entry.kind === 'history') return 'history';
  if (entry.kind === 'init') return 'open';
  return '';
}

function renderDocHistoryHtml() {
  const currentIdx = docNavLog.length - 1;
  let listHtml;
  if (!docNavLog.length) {
    listHtml = '<p class="doc-history-page-empty">No pages visited yet. Browse documentation or use Search — visits appear here.</p>';
  } else {
    listHtml = '<ol class="doc-history-page-list">' + docNavLog.map(function (entry, i) {
      const active = i === currentIdx ? ' doc-history-page-active' : '';
      const prefix = formatDocHistoryKind(entry);
      const meta = formatDocHistoryMeta(entry);
      const scrollHint = entry.scrollTop > 0
        ? ' <span class="doc-history-page-scroll">@' + entry.scrollTop + 'px</span>'
        : '';
      return (
        '<li class="doc-history-page-item' + active + '">' +
        '<button type="button" class="doc-history-page-link" data-history-index="' + i + '">' +
        '<span class="doc-history-page-label">' + escapeHtml(prefix + entry.label) + '</span>' +
        scrollHint +
        (meta ? '<span class="doc-history-page-kind">' + escapeHtml(meta) + '</span>' : '') +
        '</button></li>'
      );
    }).join('') + '</ol>';
  }

  const resetDisabled = !docNavLog.length && !docBackStack.length;

  return (
    '<div class="doc-history-page">' +
    '<h1>Navigation history</h1>' +
    '<p class="doc-index-lead">Chronological trail of pages visited in this session (max ' + DOC_HISTORY_MAX + '). ' +
    'Click a row to jump to that page and scroll position. Use <strong>Back</strong> in the toolbar for step-by-step return.</p>' +
    '<div class="doc-history-page-actions">' +
    '<button type="button" class="btn" id="btnDocHistoryReset"' +
    (resetDisabled ? ' disabled' : '') + '>Reset history</button>' +
    '</div>' +
    listHtml +
    '</div>'
  );
}

function bindDocHistoryPageEvents() {
  const el = document.getElementById('docContent');
  if (!el) return;

  const btnReset = el.querySelector('#btnDocHistoryReset');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      resetDocHistory();
    });
  }

  el.querySelectorAll('[data-history-index]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      gotoDocHistoryEntry(parseInt(btn.getAttribute('data-history-index'), 10));
    });
  });
}

function renderDocHistoryPage(options) {
  options = options || {};
  const scrollTop = options.scrollTop != null ? options.scrollTop : 0;

  currentDocFile = DOC_PAGE_HISTORY;
  lastDocScrollTop = scrollTop;
  const el = document.getElementById('docContent');
  if (!el) return;

  el.innerHTML = renderDocHistoryHtml();
  bindDocHistoryPageEvents();
  updateDocToolbar();
  syncDocSearchInput();
  closeDocSearchMenu();

  if (location.hash !== '#history') {
    history.replaceState(null, '', '#history');
  }

  if (scrollTop > 0) {
    requestAnimationFrame(function () {
      applyDocScroll(scrollTop);
    });
  } else {
    el.scrollTop = 0;
    const main = document.getElementById('docMain');
    if (main) main.scrollTop = 0;
    if (options.mobileScroll && main && window.matchMedia('(max-width: 768px)').matches) {
      main.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

function loadDocHistory() {
  if (isDocHistoryPage()) return;
  navigateDoc(DOC_PAGE_HISTORY, { kind: 'nav', scrollTop: 0, label: 'History' });
}

function resetDocHistory() {
  docBackStack = [];
  docNavLog = [];
  if (isDocHistoryPage()) {
    renderDocHistoryPage({ scrollTop: 0 });
  }
  updateDocNavButtons();
}

function navigateDoc(targetFile, options) {
  options = options || {};
  const kind = options.kind || 'nav';
  const scrollTop = options.scrollTop != null ? options.scrollTop : 0;
  const skipPush = options.skipPush === true || docNavSuppressPush;
  const skipLog = options.skipLog === true;

  if (!skipPush && document.body.classList.contains('doc-mode')) {
    const current = docCaptureCurrentPlace();
    const sameTarget = current.file === targetFile && Math.abs(current.scrollTop - scrollTop) < 2;
    if (!sameTarget) {
      docBackStack.push(current);
      trimDocBackStack();
    }
  }

  if (!skipLog) {
    appendDocNavLog({
      file: targetFile,
      scrollTop: scrollTop,
      label: options.label || docLabelForFile(targetFile),
      kind: kind,
    });
  }

  docNavSuppressPush = true;
  try {
    if (targetFile === DOC_PAGE_HISTORY) {
      renderDocHistoryPage({ scrollTop: scrollTop, mobileScroll: scrollTop === 0 });
    } else if (!targetFile) {
      renderDocIndexPage({ scrollTop: scrollTop, mobileScroll: scrollTop === 0 });
    } else {
      renderDocPage(targetFile, { scrollTop: scrollTop, mobileScroll: scrollTop === 0 });
    }
  } finally {
    docNavSuppressPush = false;
  }

  updateDocNavButtons();
}

function docGoBack() {
  if (!docBackStack.length) return;
  const prev = docBackStack.pop();
  closeDocSearchMenu();

  docNavSuppressPush = true;
  try {
    appendDocNavLog({
      file: prev.file,
      scrollTop: prev.scrollTop,
      label: prev.label,
      kind: 'back',
    });
    if (prev.file === DOC_PAGE_HISTORY) {
      renderDocHistoryPage({ scrollTop: prev.scrollTop, mobileScroll: false });
    } else if (!prev.file) {
      renderDocIndexPage({ scrollTop: prev.scrollTop, mobileScroll: false });
    } else {
      renderDocPage(prev.file, { scrollTop: prev.scrollTop, mobileScroll: false });
    }
  } finally {
    docNavSuppressPush = false;
  }

  updateDocNavButtons();
}

function gotoDocHistoryEntry(index) {
  const entry = docNavLog[index];
  if (!entry) return;
  navigateDoc(entry.file, {
    scrollTop: entry.scrollTop,
    kind: 'history',
    label: entry.label,
  });
}

function logDocInitialLanding(file, scrollTop) {
  appendDocNavLog({
    file: file,
    scrollTop: scrollTop != null ? scrollTop : 0,
    label: docLabelForFile(file),
    kind: file ? 'init' : 'index',
  });
}

function initDocViewer() {
  if (docViewerReady) return;
  docViewerReady = true;

  const content = document.getElementById('docContent');
  if (content) {
    content.addEventListener('click', onDocContentClick);
  }
  initDocSearch();
  initDocHistory();
}

function initDocHistory() {
  const btnBack = document.getElementById('btnDocBack');
  if (btnBack) {
    btnBack.addEventListener('click', docGoBack);
  }
  updateDocNavButtons();
}

function initDocSearch() {
  const input = document.getElementById('docSearchInput');
  const menu = document.getElementById('docSearchMenu');
  const wrap = document.getElementById('docSearch');
  if (!input || !menu) return;

  input.addEventListener('input', function () {
    renderDocSearchMenu(input.value);
  });
  input.addEventListener('focus', function () {
    renderDocSearchMenu(input.value);
  });
  input.addEventListener('keydown', onDocSearchKeydown);
  input.addEventListener('blur', function () {
    setTimeout(closeDocSearchMenu, 120);
  });

  menu.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });

  document.addEventListener('click', function (e) {
    if (wrap && !wrap.contains(e.target)) {
      closeDocSearchMenu();
    }
  });
}

function docSearchRank(entry, query) {
  const label = entry.label.toLowerCase();
  const stem = entry.file.replace(/\.md$/, '').toLowerCase();
  if (label === query || stem === query) return 0;
  if (label.startsWith(query) || stem.startsWith(query)) return 1;
  if (label.includes(query) || stem.includes(query)) return 2;
  return 3;
}

function filterDocSearch(query) {
  const q = query.trim().toLowerCase();
  let list;
  if (!q) {
    list = DOC_SEARCH_INDEX.slice();
  } else {
    const tokens = q.split(/\s+/).filter(Boolean);
    list = DOC_SEARCH_INDEX.filter(function (entry) {
      return tokens.every(function (token) {
        return entry.haystack.indexOf(token) !== -1;
      });
    });
    list.sort(function (a, b) {
      const ra = docSearchRank(a, q);
      const rb = docSearchRank(b, q);
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }
  return list;
}

function closeDocSearchMenu() {
  const menu = document.getElementById('docSearchMenu');
  const input = document.getElementById('docSearchInput');
  if (!menu) return;
  menu.hidden = true;
  menu.innerHTML = '';
  docSearchActiveIndex = -1;
  docSearchResults = [];
  if (input) input.setAttribute('aria-expanded', 'false');
}

function selectDocSearchResult(index) {
  const entry = docSearchResults[index];
  if (!entry) return;
  const input = document.getElementById('docSearchInput');
  closeDocSearchMenu();
  if (input) {
    input.value = '';
    input.blur();
  }
  loadDoc(entry.file, { kind: 'search' });
}

function renderDocSearchMenu(query) {
  const menu = document.getElementById('docSearchMenu');
  const input = document.getElementById('docSearchInput');
  if (!menu || !input) return;

  docSearchResults = filterDocSearch(query);
  docSearchActiveIndex = docSearchResults.length ? 0 : -1;

  if (!docSearchResults.length) {
    menu.innerHTML = '<li class="doc-search-empty">No matching title</li>';
    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    return;
  }

  menu.innerHTML = docSearchResults.map(function (entry, i) {
    const active = i === docSearchActiveIndex ? ' doc-search-active' : '';
    return (
      '<li class="' + active + '" role="option" data-index="' + i + '">' +
      '<button type="button" data-index="' + i + '">' +
      escapeHtml(entry.label) +
      '<span class="doc-search-section">' + escapeHtml(entry.section) + '</span>' +
      '</button></li>'
    );
  }).join('');

  menu.hidden = false;
  input.setAttribute('aria-expanded', 'true');

  menu.querySelectorAll('button[data-index]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectDocSearchResult(parseInt(btn.getAttribute('data-index'), 10));
    });
  });
}

function highlightDocSearchItem(index) {
  const menu = document.getElementById('docSearchMenu');
  if (!menu) return;
  const items = menu.querySelectorAll('li[data-index]');
  items.forEach(function (li, i) {
    li.classList.toggle('doc-search-active', i === index);
  });
  const active = items[index];
  if (active && typeof active.scrollIntoView === 'function') {
    active.scrollIntoView({ block: 'nearest' });
  }
}

function onDocSearchKeydown(e) {
  if (e.key === 'Escape') {
    closeDocSearchMenu();
    e.target.blur();
    return;
  }
  const menu = document.getElementById('docSearchMenu');
  if (!menu || menu.hidden || !docSearchResults.length) {
    if (e.key === 'Enter') {
      const first = filterDocSearch(e.target.value)[0];
      if (first) {
        e.preventDefault();
        selectDocSearchResult(0);
      }
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    docSearchActiveIndex = Math.min(docSearchActiveIndex + 1, docSearchResults.length - 1);
    highlightDocSearchItem(docSearchActiveIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    docSearchActiveIndex = Math.max(docSearchActiveIndex - 1, 0);
    highlightDocSearchItem(docSearchActiveIndex);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (docSearchActiveIndex >= 0) {
      selectDocSearchResult(docSearchActiveIndex);
    }
  }
}

function syncDocSearchInput() {
  const input = document.getElementById('docSearchInput');
  if (!input || document.activeElement === input) return;
  input.value = '';
}

function updateDocToolbar() {
  const btn = document.getElementById('btnDocIndex');
  if (btn) {
    btn.style.display = isDocIndexPage() ? 'none' : '';
  }
  updateDocNavButtons();
}

function captureDocScroll() {
  const main = document.getElementById('docMain');
  return main ? main.scrollTop : 0;
}

function applyDocScroll(scrollTop) {
  const main = document.getElementById('docMain');
  const el = document.getElementById('docContent');
  if (main) main.scrollTop = scrollTop;
  if (el) el.scrollTop = scrollTop;
}

function showDocView() {
  document.body.classList.add('doc-mode');
  initDocViewer();
  const hash = location.hash.replace(/^#/, '');
  if (hash === 'history') {
    try {
      if (isDocHistoryPage()) {
        renderDocHistoryPage({ scrollTop: lastDocScrollTop });
      } else {
        docNavSuppressPush = true;
        try {
          renderDocHistoryPage({ scrollTop: 0 });
          if (!docNavLog.length) {
            logDocInitialLanding(DOC_PAGE_HISTORY, 0);
          }
        } finally {
          docNavSuppressPush = false;
        }
      }
    } catch (e) {
      console.error('loadDocHistory failed', e);
      showDocError('', 'Failed to render history: ' + e.message);
    }
  } else if (hash && hash !== 'index' && window.DOC_CONTENT && window.DOC_CONTENT[hash]) {
    try {
      if (currentDocFile === hash) {
        renderDocPage(hash, { scrollTop: lastDocScrollTop });
      } else {
        docNavSuppressPush = true;
        try {
          renderDocPage(hash, { scrollTop: 0 });
          if (!docNavLog.length) {
            logDocInitialLanding(hash, 0);
          }
        } finally {
          docNavSuppressPush = false;
        }
      }
    } catch (e) {
      console.error('loadDoc failed', e);
      showDocError(hash, 'Failed to render doc: ' + e.message);
    }
  } else if (isDocHistoryPage()) {
    try {
      renderDocHistoryPage({ scrollTop: lastDocScrollTop });
    } catch (e) {
      console.error('loadDocHistory failed', e);
      showDocError('', 'Failed to render history: ' + e.message);
    }
  } else if (currentDocFile && window.DOC_CONTENT && window.DOC_CONTENT[currentDocFile]) {
    try {
      renderDocPage(currentDocFile, { scrollTop: lastDocScrollTop });
    } catch (e) {
      console.error('loadDoc failed', e);
      showDocError(currentDocFile, 'Failed to render doc: ' + e.message);
    }
  } else {
    docNavSuppressPush = true;
    try {
      renderDocIndexPage({ scrollTop: 0 });
      if (!docNavLog.length) {
        logDocInitialLanding('', 0);
      }
    } finally {
      docNavSuppressPush = false;
    }
  }
}

function showEditorView() {
  if (document.body.classList.contains('doc-mode')) {
    lastDocScrollTop = captureDocScroll();
  }
  document.body.classList.remove('doc-mode');
  closeDocSearchMenu();
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (typeof cmEditor !== 'undefined' && cmEditor) {
    setTimeout(function () { cmEditor.refresh(); }, 0);
  }
}

function renderDocIndexHtml() {
  const sections = DOC_SECTIONS.map(function (section) {
    const items = section.items.map(function (item) {
      return (
        '<li><a href="' + item.file + '">' + escapeHtml(item.label) + '</a></li>'
      );
    }).join('');
    return (
      '<section class="doc-index-section">' +
      '<h2>' + escapeHtml(section.title) + '</h2>' +
      '<ul class="doc-index-list">' + items + '</ul>' +
      '</section>'
    );
  }).join('');

  return (
    '<div class="doc-index">' +
    '<h1>LogTScript documentation</h1>' +
    '<p class="doc-index-lead">Choose a topic below, or use <strong>Search</strong> in the toolbar to jump by title. Use <strong>Index</strong> to return here from any page, or <strong>History</strong> for the navigation trail.</p>' +
    sections +
    '</div>'
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadDocIndex() {
  navigateDoc('', { kind: 'index', scrollTop: 0 });
}

function renderDocIndexPage(options) {
  options = options || {};
  const scrollTop = options.scrollTop != null ? options.scrollTop : 0;

  currentDocFile = '';
  lastDocScrollTop = scrollTop;
  const el = document.getElementById('docContent');
  if (!el) return;

  el.innerHTML = renderDocIndexHtml();
  updateDocToolbar();
  syncDocSearchInput();

  if (location.hash !== '#index') {
    history.replaceState(null, '', '#index');
  }

  if (scrollTop > 0) {
    requestAnimationFrame(function () {
      applyDocScroll(scrollTop);
    });
  } else {
    el.scrollTop = 0;
    const main = document.getElementById('docMain');
    if (main) main.scrollTop = 0;
    if (options.mobileScroll && main && window.matchMedia('(max-width: 768px)').matches) {
      main.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

function showDocError(filename, message) {
  const el = document.getElementById('docContent');
  if (!el) return;
  el.innerHTML =
    '<p class="doc-error">' +
    message +
    (filename ? ' (<code>' + filename + '</code>)' : '') +
    '</p>';
  updateDocToolbar();
}

function docLabelForPlay() {
  const doc = DOCS.find(function (d) { return d.file === currentDocFile; });
  return doc ? doc.label : currentDocFile.replace('.md', '');
}

function parsePlayPropagation(codeEl) {
  const cls = codeEl.className || '';
  if (/legacy/i.test(cls)) return 'legacy';
  if (/\bwave\b/i.test(cls)) return 'wave';
  return null;
}

function loadExampleInEditor(code, autoRun, propagation, label) {
  showEditorView();

  if (Array.from(tabs.keys()).length >= maxTabs) {
    alert('Max tabs reached — close a tab first.');
    return;
  }

  tabSave();
  const mode = propagation || (typeof getPropagationMode === 'function' ? getPropagationMode() : 'wave');

  if (!tabAdd(label || 'example', code || '', { propagation: mode, hasRun: false })) {
    alert('Max tabs reached — close a tab first.');
    return;
  }

  tabSaved();
  syncLegacyLastKeys();

  if (autoRun && typeof run === 'function') {
    run();
  }
}

function sendExampleToEditor(code, autoRun, propagation) {
  const label = 'ex: ' + docLabelForPlay() + (playBlockIndex > 1 ? ' #' + playBlockIndex : '');
  loadExampleInEditor(code, autoRun, propagation, label);
}

function enhanceClcdSymbolGallery(container) {
  if (typeof CLCD_SYMBOL_REGISTRY === 'undefined') return;
  container.querySelectorAll('pre > code[class*="clcd-symbol-gallery"]').forEach(function (codeEl) {
    const pre = codeEl.parentElement;
    if (!pre) return;
    const host = document.createElement('div');
    host.className = 'clcd-symbol-gallery-host';
    pre.replaceWith(host);
    mountClcdSymbolSearch(host);
  });
}

function clcdEnsureFaFontsLoaded() {
  if (clcdEnsureFaFontsLoaded._promise) return clcdEnsureFaFontsLoaded._promise;
  if (!document.fonts) {
    clcdEnsureFaFontsLoaded._promise = Promise.resolve();
    return clcdEnsureFaFontsLoaded._promise;
  }
  clcdEnsureFaFontsLoaded._promise = Promise.all([
    document.fonts.load('900 24px "Font Awesome 5 Free"'),
    document.fonts.load('400 24px "Font Awesome 5 Free"'),
    document.fonts.load('400 24px "Font Awesome 5 Brands"'),
  ]).catch(function () {});
  return clcdEnsureFaFontsLoaded._promise;
}

/** FA preview via registry glyph (script name battery → unicode, not fa-battery CSS). */
function clcdSymbolFaIconEl(sym, styleNum, extraClass) {
  if (!sym || sym.kind !== 'fa' || typeof resolveClcdFaStyle !== 'function') return null;
  const st = styleNum !== undefined && styleNum !== null ? styleNum : sym.defaultStyle;
  const resolved = resolveClcdFaStyle(sym, st);
  if (!resolved) return null;
  const el = document.createElement('span');
  el.className = (extraClass || 'clcd-symbol-menu-icon').trim();
  el.setAttribute('aria-hidden', 'true');
  el.textContent = resolved.glyph;
  const px = typeof resolveClcdFaIconSize === 'function' ? resolveClcdFaIconSize(sym) : 22;
  el.style.fontFamily = resolved.fontFamily;
  el.style.fontWeight = resolved.weight;
  el.style.fontSize = px + 'px';
  el.style.lineHeight = '1';
  el.style.display = 'inline-block';
  return el;
}

function clcdSymbolMenuIconEl(sym) {
  return clcdSymbolFaIconEl(sym, sym.defaultStyle, 'clcd-symbol-menu-icon');
}

function filterClcdSymbolSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (let i = 0; i < CLCD_SYMBOL_REGISTRY.length; i++) {
    const sym = CLCD_SYMBOL_REGISTRY[i];
    if (sym.name.toLowerCase().indexOf(q) >= 0) {
      out.push(sym);
      if (out.length >= 15) break;
    }
  }
  return out;
}

function clcdSymbolSnippet(sym, styleNum) {
  const lines = [
    sym.name + ':',
    '  x: 10',
    '  y: 10',
    '  bit: 0',
  ];
  if (sym.kind === 'text') {
    lines.push('  text: "Label"');
    lines.push('  family: mono');
    lines.push('  size: 14');
    lines.push('  weight: normal');
    lines.push(':');
    return lines.join('\n');
  }
  const defStyle = styleNum !== undefined ? styleNum : sym.defaultStyle;
  if (sym.kind === 'fa' && defStyle !== sym.defaultStyle) {
    lines.push('  style: ' + defStyle);
  } else if (sym.kind === 'fa' && sym.glyphs[2] && defStyle === 2) {
    lines.push('  style: 2');
  }
  if (sym.kind === 'fa') {
    lines.push('  size: 22');
  } else if (sym.kind === 'canvas') {
    if (sym.name === 'digit7' || sym.name === 'digit14') {
      lines.push('  size: 44');
    } else if (sym.name === 'dp') {
      lines.push('  size: 8');
    } else if (sym.name === 'colon') {
      lines.push('  size: 32');
    }
  }
  lines.push(':');
  return lines.join('\n');
}

function mountClcdSymbolSearch(host) {
  clcdEnsureFaFontsLoaded();
  const wrap = document.createElement('div');
  wrap.className = 'clcd-symbol-search';

  const label = document.createElement('label');
  label.className = 'clcd-symbol-search-label';
  label.textContent = 'Search symbol:';
  label.setAttribute('for', 'clcdSymbolSearchInput');

  const inputWrap = document.createElement('div');
  inputWrap.className = 'clcd-symbol-search-input-wrap';

  const input = document.createElement('input');
  input.type = 'search';
  input.id = 'clcdSymbolSearchInput';
  input.className = 'clcd-symbol-search-input';
  input.placeholder = 'wifi, battery, digit7…';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const menu = document.createElement('ul');
  menu.className = 'clcd-symbol-search-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');

  const preview = document.createElement('div');
  preview.className = 'clcd-symbol-preview';

  const snippet = document.createElement('pre');
  snippet.className = 'clcd-symbol-snippet';
  snippet.hidden = true;

  const canvasSection = document.createElement('div');
  canvasSection.className = 'clcd-symbol-canvas-section';
  const canvasTitle = document.createElement('h4');
  canvasTitle.textContent = 'Canvas & text symbols';
  canvasSection.appendChild(canvasTitle);
  const canvasGrid = document.createElement('div');
  canvasGrid.className = 'clcd-symbol-preview-grid';

  CLCD_SYMBOL_REGISTRY.filter(function (s) { return s.kind === 'canvas' || s.kind === 'text'; }).forEach(function (sym) {
    const cell = document.createElement('div');
    cell.className = 'clcd-symbol-preview-cell clcd-symbol-preview-cell--canvas';
    const previewText = sym.kind === 'text' ? 'Aa' : sym.name;
    const kindLabel = sym.kind === 'text' ? 'text' : 'canvas';
    cell.innerHTML = '<span class="clcd-symbol-preview-icon clcd-symbol-preview-icon--canvas">' + previewText + '</span>'
      + '<span class="clcd-symbol-preview-name">' + sym.name + '</span>'
      + '<span class="clcd-symbol-preview-style">' + kindLabel + '</span>';
    canvasGrid.appendChild(cell);
  });
  canvasSection.appendChild(canvasGrid);

  let activeIndex = -1;
  let results = [];

  function closeMenu() {
    menu.hidden = true;
    activeIndex = -1;
  }

  function renderPreview(sym) {
    preview.innerHTML = '';
    snippet.hidden = !sym;
    if (!sym) return;

    const grid = document.createElement('div');
    grid.className = 'clcd-symbol-preview-grid';

    if (sym.kind === 'fa') {
      const styles = Object.keys(sym.glyphs).map(Number).sort();
      styles.forEach(function (st) {
        const cell = document.createElement('div');
        cell.className = 'clcd-symbol-preview-cell';
        const icon = clcdSymbolFaIconEl(sym, st, 'clcd-symbol-preview-icon');
        const nameEl = document.createElement('span');
        nameEl.className = 'clcd-symbol-preview-name';
        nameEl.textContent = sym.name;
        const styleEl = document.createElement('span');
        styleEl.className = 'clcd-symbol-preview-style';
        styleEl.textContent = 'style ' + st;
        cell.appendChild(nameEl);
        cell.appendChild(styleEl);
        if (icon) cell.insertBefore(icon, nameEl);
        grid.appendChild(cell);
      });
      snippet.textContent = clcdSymbolSnippet(sym, sym.defaultStyle);
    } else if (sym.kind === 'text') {
      const cell = document.createElement('div');
      cell.className = 'clcd-symbol-preview-cell clcd-symbol-preview-cell--canvas';
      cell.innerHTML = '<span class="clcd-symbol-preview-icon clcd-symbol-preview-icon--canvas">Aa</span>'
        + '<span class="clcd-symbol-preview-name">' + sym.name + '</span>'
        + '<span class="clcd-symbol-preview-style">text</span>';
      grid.appendChild(cell);
      snippet.textContent = clcdSymbolSnippet(sym);
    } else {
      const cell = document.createElement('div');
      cell.className = 'clcd-symbol-preview-cell clcd-symbol-preview-cell--canvas';
      cell.innerHTML = '<span class="clcd-symbol-preview-icon clcd-symbol-preview-icon--canvas">' + sym.name + '</span>'
        + '<span class="clcd-symbol-preview-name">' + sym.name + '</span>'
        + '<span class="clcd-symbol-preview-style">canvas</span>';
      grid.appendChild(cell);
      snippet.textContent = clcdSymbolSnippet(sym);
    }

    preview.appendChild(grid);
    snippet.hidden = false;
  }

  function renderMenu(query, keepActive) {
    results = filterClcdSymbolSearch(query);
    if (!keepActive) activeIndex = results.length ? 0 : -1;
    menu.innerHTML = '';
    if (!results.length) {
      menu.hidden = true;
      return;
    }
    results.forEach(function (sym, i) {
      const li = document.createElement('li');
      if (i === activeIndex) li.className = 'clcd-symbol-search-active';
      const btn = document.createElement('button');
      btn.type = 'button';
      const labelEl = document.createElement('span');
      labelEl.className = 'clcd-symbol-menu-label';
      labelEl.textContent = sym.name + (sym.kind === 'canvas' ? ' (canvas)' : sym.kind === 'text' ? ' (text)' : '');
      btn.appendChild(labelEl);
      const menuIcon = clcdSymbolMenuIconEl(sym);
      if (menuIcon) btn.appendChild(menuIcon);
      btn.addEventListener('click', function () {
        input.value = sym.name;
        closeMenu();
        renderPreview(sym);
      });
      li.appendChild(btn);
      menu.appendChild(li);
    });
    menu.hidden = false;
  }

  function selectActive() {
    if (activeIndex >= 0 && results[activeIndex]) {
      input.value = results[activeIndex].name;
      closeMenu();
      renderPreview(results[activeIndex]);
    }
  }

  input.addEventListener('input', function () {
    renderMenu(input.value);
    if (!input.value.trim()) {
      preview.innerHTML = '';
      snippet.hidden = true;
    }
  });

  input.addEventListener('keydown', function (e) {
    if (menu.hidden || !results.length) {
      if (e.key === 'Enter' && input.value.trim()) {
        const exact = CLCD_SYMBOL_REGISTRY.find(function (s) {
          return s.name === input.value.trim();
        });
        if (exact) renderPreview(exact);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
      renderMenu(input.value, true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderMenu(input.value, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectActive();
    } else if (e.key === 'Escape') {
      closeMenu();
    }
  });

  document.addEventListener('click', function onDocClick(e) {
    if (!wrap.contains(e.target)) closeMenu();
  });

  inputWrap.appendChild(input);
  inputWrap.appendChild(menu);
  wrap.appendChild(label);
  wrap.appendChild(inputWrap);
  wrap.appendChild(preview);
  wrap.appendChild(snippet);
  wrap.appendChild(canvasSection);
  host.appendChild(wrap);
}

function enhancePlayBlocks(container) {
  playBlockIndex = 0;
  const blocks = container.querySelectorAll('pre > code[class*="logts-play"]');
  blocks.forEach(function (codeEl) {
    playBlockIndex += 1;
    const pre = codeEl.parentElement;
    if (!pre || pre.parentElement && pre.parentElement.classList.contains('doc-play-block')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'doc-play-block';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    pre.classList.add('doc-play-pre');

    const source = codeEl.textContent || '';
    const propagation = parsePlayPropagation(codeEl);

    const actions = document.createElement('div');
    actions.className = 'doc-play-actions';

    const btnLoad = document.createElement('button');
    btnLoad.type = 'button';
    btnLoad.className = 'btn';
    btnLoad.textContent = 'Load';
    btnLoad.addEventListener('click', function () {
      sendExampleToEditor(source, false, propagation);
    });

    const btnRun = document.createElement('button');
    btnRun.type = 'button';
    btnRun.className = 'btn btn--primary';
    btnRun.textContent = 'Load & Run';
    btnRun.addEventListener('click', function () {
      sendExampleToEditor(source, true, propagation);
    });

    if (propagation) {
      const badge = document.createElement('span');
      badge.className = 'doc-play-mode doc-play-mode--' + propagation;
      badge.textContent = propagation;
      actions.appendChild(badge);
    }

    actions.appendChild(btnLoad);
    actions.appendChild(btnRun);
    wrapper.appendChild(actions);
  });
}

function loadDoc(filename, options) {
  options = options || {};
  if (docNavSuppressPush) {
    renderDocPage(filename, {
      scrollTop: options.scrollTop != null ? options.scrollTop : (options.restoreScroll ? lastDocScrollTop : 0),
    });
    return;
  }
  navigateDoc(filename, {
    kind: options.kind || 'nav',
    scrollTop: options.scrollTop != null ? options.scrollTop : 0,
    label: options.label,
  });
}

function renderDocPage(filename, options) {
  options = options || {};
  const scrollTop = options.scrollTop != null ? options.scrollTop : 0;

  const content = window.DOC_CONTENT && window.DOC_CONTENT[filename];
  if (!content) {
    showDocError(
      filename,
      'Document not found in bundle. Run: node _gen_doc_data.js'
    );
    return;
  }

  lastDocScrollTop = scrollTop;
  currentDocFile = filename;
  const el = document.getElementById('docContent');
  if (typeof marked === 'undefined') {
    showDocError(filename, 'marked.min.js not loaded');
    return;
  }
  el.innerHTML = marked.parse(content, { gfm: true, breaks: false });
  enhancePlayBlocks(el);
  enhanceClcdSymbolGallery(el);
  updateDocToolbar();
  syncDocSearchInput();
  closeDocSearchMenu();

  const hash = '#' + filename;
  if (location.hash !== hash) {
    history.replaceState(null, '', hash);
  }

  const main = document.getElementById('docMain');

  if (scrollTop > 0) {
    requestAnimationFrame(function () {
      applyDocScroll(scrollTop);
    });
  } else {
    el.scrollTop = 0;
    if (main) main.scrollTop = 0;
    if (options.mobileScroll && main && window.matchMedia('(max-width: 768px)').matches) {
      main.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

function resolveMdHref(href) {
  if (!href || href.startsWith('http://') || href.startsWith('https://')) {
    return null;
  }
  const base = href.split('#')[0].split('?')[0];
  if (!base.endsWith('.md')) return null;
  const parts = base.split('/');
  return parts[parts.length - 1];
}

function onDocContentClick(e) {
  if (e.target.closest('.doc-play-actions')) return;

  const link = e.target.closest('a');
  if (!link) return;

  const filename = resolveMdHref(link.getAttribute('href'));
  if (!filename) return;

  if (!window.DOC_CONTENT || !window.DOC_CONTENT[filename]) return;

  e.preventDefault();
  loadDoc(filename, { kind: 'link' });
}

function openDocViewFromHash() {
  const hash = location.hash.replace(/^#/, '');
  initDocViewer();
  docNavSuppressPush = true;
  try {
    if (hash === 'history') {
      renderDocHistoryPage({ scrollTop: 0 });
      if (!docNavLog.length) {
        logDocInitialLanding(DOC_PAGE_HISTORY, 0);
      }
      document.body.classList.add('doc-mode');
      return true;
    }
    if (hash === 'index') {
      renderDocIndexPage({ scrollTop: 0 });
      if (!docNavLog.length) {
        logDocInitialLanding('', 0);
      }
      document.body.classList.add('doc-mode');
      return true;
    }
    if (hash && window.DOC_CONTENT && window.DOC_CONTENT[hash]) {
      renderDocPage(hash, { scrollTop: 0 });
      if (!docNavLog.length) {
        logDocInitialLanding(hash, 0);
      }
      document.body.classList.add('doc-mode');
      return true;
    }
  } finally {
    docNavSuppressPush = false;
  }
  return false;
}
