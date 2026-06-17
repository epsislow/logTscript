/* ================= DOC VIEWER ================= */

// BEGIN GENERATED DOC_SECTIONS (_gen_doc_data.js)
const DOC_SECTIONS = [
  {
    title: 'Reference',
    items: [
      { file: 'doc-function.md', label: 'doc() function' },
      { file: 'builtin-functions.md', label: 'Built-in functions', searchExtra: 'internal MUX DEMUX REG LATCH NOT AND OR shift arithmetic builtin HIGH BITINDEX ONEHOT' },
      { file: 'builtin-logic-gate-functions.md', label: 'Built-in logic gates' },
      { file: 'builtin-sequential-functions.md', label: 'Built-in sequential (LATCH, REG)' },
      { file: 'builtin-routing-functions.md', label: 'Built-in routing (MUX, DEMUX)' },
      { file: 'builtin-bit-selection-functions.md', label: 'Built-in bit selection', searchExtra: 'HIGH LOW ANY ZERO BITINDEX ONEHOT priority encoder' },
      { file: 'builtin-bit-analysis-functions.md', label: 'Built-in bit analysis', searchExtra: 'PARITY CNTONE CNTZERO BITSIZE' },
      { file: 'builtin-bit-transform-functions.md', label: 'Built-in bit transform', searchExtra: 'LSHIFT RSHIFT REVERSE LROTATE RROTATE rotate shift' },
      { file: 'components.md', label: 'Component catalog' },
      { file: 'short-notation.md', label: 'Short notation' },
      { file: 'assignment-operators.md', label: 'Assignment operators (=, =:, :=)', searchExtra: 'right pad left pad wire assignment initial' },
      { file: 'arithmetic.md', label: 'Arithmetic (built-in)' },
      { file: 'debug.md', label: 'Debug (show / peek / probe / lutOf)', searchExtra: 'show peek probe lutOf exprOfLut truthTableOf output panel' },
      { file: 'signal-propagation.md', label: 'Signal propagation' },
      { file: 'editorUI.md', label: 'Editor UI' }
    ],
  },
  {
    title: 'Composite blocks',
    items: [
      { file: 'board.md', label: 'Board' },
      { file: 'chip.md', label: 'Chip' },
      { file: 'mini-cpu.md', label: 'Mini CPU demo', searchExtra: 'harvard alu cpu4 step' },
      { file: 'mini-cpu-v2.md', label: 'Mini CPU v2 demo', searchExtra: 'asm beq lut terminal cpu4v2' },
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
      { file: 'lut.md', label: 'lut', searchExtra: 'inline lookup table decoder comp variableDepth prefixFree Huffman decode isValid' },
      { file: 'boolean-lut.md', label: 'Boolean LUT (lutOf / exprOfLut)', searchExtra: 'lutOf exprOfLut description filters inline truth table minimize Quine' },
      { file: 'boolean-analysis.md', label: 'Boolean analysis helpers', searchExtra: 'truthTableOf simplify equivalent inputsOf costOf filters comma x' },
      { file: 'protocol.md', label: 'protocol', searchExtra: 'inline uart spi i2c reverse parity clock repeat tx sda scl mosi decode expand collapse length lengthOf withLength def huffPacket huffRecover variable width' },
      { file: 'huffman.md', label: 'Huffman example', searchExtra: 'prefixFree expand collapse huffPacket huffRecover variable length coding codebook packet round-trip greedy decode' },
      { file: 'reg.md', label: 'reg' },
      { file: 'queue.md', label: 'queue', searchExtra: 'fifo buffer push pop front empty full size capacity free' },
      { file: 'stack.md', label: 'stack', searchExtra: 'lifo push pop top call stack subroutine' },
      { file: 'oscillator.md', label: 'oscillator' }
    ],
  },
  {
    title: 'Other',
    items: [
      { file: 'slider.md', label: 'Slider component' }
    ],
  }
];

/** In DOC_CONTENT + search only — not listed on the doc index page */
const DOC_SEARCH_ONLY = [
    { file: 'future-component-ideas.md', label: 'Future component ideas', section: 'Backlog',
      searchExtra:
        'planning roadmap backlog alu dpram lut mux demux decoder rom stack fifo uart gpio slider irq dma eeprom' }
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

function initDocViewer() {
  if (docViewerReady) return;
  docViewerReady = true;

  const content = document.getElementById('docContent');
  if (content) {
    content.addEventListener('click', onDocContentClick);
  }
  initDocSearch();
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
  loadDoc(entry.file);
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
    btn.style.display = currentDocFile ? '' : 'none';
  }
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
  if (hash && hash !== 'index' && window.DOC_CONTENT && window.DOC_CONTENT[hash]) {
    try {
      loadDoc(hash);
    } catch (e) {
      console.error('loadDoc failed', e);
      showDocError(hash, 'Failed to render doc: ' + e.message);
    }
  } else if (currentDocFile && window.DOC_CONTENT && window.DOC_CONTENT[currentDocFile]) {
    try {
      loadDoc(currentDocFile, { restoreScroll: true });
    } catch (e) {
      console.error('loadDoc failed', e);
      showDocError(currentDocFile, 'Failed to render doc: ' + e.message);
    }
  } else {
    loadDocIndex();
  }
}

function showEditorView() {
  if (document.body.classList.contains('doc-mode') && currentDocFile) {
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
    '<p class="doc-index-lead">Choose a topic below, or use <strong>Search</strong> in the toolbar to jump by title. Use <strong>Index</strong> to return here from any page.</p>' +
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
  currentDocFile = '';
  lastDocScrollTop = 0;
  const el = document.getElementById('docContent');
  if (!el) return;

  el.innerHTML = renderDocIndexHtml();
  updateDocToolbar();
  syncDocSearchInput();

  if (location.hash !== '#index') {
    history.replaceState(null, '', '#index');
  }

  el.scrollTop = 0;
  const main = document.getElementById('docMain');
  if (main) main.scrollTop = 0;
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

function clcdScriptNameToFaClass(scriptName) {
  const kebab = scriptName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return 'fa-' + kebab;
}

function clcdFaStyleClass(styleNum) {
  if (styleNum === 3) return 'fab';
  if (styleNum === 2) return 'far';
  return 'fas';
}

function clcdSymbolMenuIconEl(sym) {
  if (!sym || sym.kind !== 'fa') return null;
  const icon = document.createElement('i');
  icon.className = clcdFaStyleClass(sym.defaultStyle) + ' ' + clcdScriptNameToFaClass(sym.name) + ' clcd-symbol-menu-icon';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
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
  const defStyle = styleNum !== undefined ? styleNum : sym.defaultStyle;
  if (sym.kind === 'fa' && defStyle !== sym.defaultStyle) {
    lines.push('  style: ' + defStyle);
  } else if (sym.kind === 'fa' && sym.glyphs[2] && defStyle === 2) {
    lines.push('  style: 2');
  }
  lines.push(':');
  return lines.join('\n');
}

function mountClcdSymbolSearch(host) {
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
  canvasTitle.textContent = 'Canvas symbols';
  canvasSection.appendChild(canvasTitle);
  const canvasGrid = document.createElement('div');
  canvasGrid.className = 'clcd-symbol-preview-grid';

  CLCD_SYMBOL_REGISTRY.filter(function (s) { return s.kind === 'canvas'; }).forEach(function (sym) {
    const cell = document.createElement('div');
    cell.className = 'clcd-symbol-preview-cell clcd-symbol-preview-cell--canvas';
    cell.innerHTML = '<span class="clcd-symbol-preview-icon clcd-symbol-preview-icon--canvas">' + sym.name + '</span>'
      + '<span class="clcd-symbol-preview-name">' + sym.name + '</span>'
      + '<span class="clcd-symbol-preview-style">canvas</span>';
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
        const icon = document.createElement('i');
        icon.className = clcdFaStyleClass(st) + ' ' + clcdScriptNameToFaClass(sym.name) + ' clcd-symbol-preview-icon';
        icon.setAttribute('aria-hidden', 'true');
        const nameEl = document.createElement('span');
        nameEl.className = 'clcd-symbol-preview-name';
        nameEl.textContent = sym.name;
        const styleEl = document.createElement('span');
        styleEl.className = 'clcd-symbol-preview-style';
        styleEl.textContent = 'style ' + st;
        cell.appendChild(icon);
        cell.appendChild(nameEl);
        cell.appendChild(styleEl);
        grid.appendChild(cell);
      });
      snippet.textContent = clcdSymbolSnippet(sym, sym.defaultStyle);
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
      labelEl.textContent = sym.name + (sym.kind === 'canvas' ? ' (canvas)' : '');
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
  const content = window.DOC_CONTENT && window.DOC_CONTENT[filename];
  if (!content) {
    showDocError(
      filename,
      'Document not found in bundle. Run: node _gen_doc_data.js'
    );
    return;
  }

  const restoreScroll = options && options.restoreScroll;
  if (!restoreScroll) {
    lastDocScrollTop = 0;
  }

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
  const savedScroll = restoreScroll ? lastDocScrollTop : 0;

  if (savedScroll > 0) {
    requestAnimationFrame(function () {
      applyDocScroll(savedScroll);
    });
  } else {
    el.scrollTop = 0;
    if (main) main.scrollTop = 0;
  }

  if (!restoreScroll && window.matchMedia('(max-width: 768px)').matches && main) {
    main.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  loadDoc(filename);
}

function openDocViewFromHash() {
  const hash = location.hash.replace(/^#/, '');
  if (hash === 'index') {
    initDocViewer();
    loadDocIndex();
    document.body.classList.add('doc-mode');
    return true;
  }
  if (hash && window.DOC_CONTENT && window.DOC_CONTENT[hash]) {
    initDocViewer();
    loadDoc(hash);
    document.body.classList.add('doc-mode');
    return true;
  }
  return false;
}
