/* ================= DOC VIEWER ================= */

const DOCS = [
  { file: 'doc-function.md', label: 'doc() function' },
  { file: 'editorUI.md', label: 'Editor UI' },
  { file: 'signal-propagation.md', label: 'Signal propagation' },
  { file: 'interactive-components.md', label: 'Interactive components' },
  { file: 'reg.md', label: 'REG' },
  { file: 'arithmetic.md', label: 'Arithmetic' },
  { file: 'short-notation.md', label: 'Short notation' },
  { file: 'mem.md', label: 'MEM' },
  { file: 'led.md', label: 'LED' },
  { file: 'oscillator.md', label: 'Oscillator' },
];

let currentDocFile = '';
let playBlockIndex = 0;
let docViewerReady = false;

function initDocViewer() {
  if (docViewerReady) return;
  docViewerReady = true;

  buildSidebar();

  const content = document.getElementById('docContent');
  if (content) {
    content.addEventListener('click', onDocContentClick);
  }
}

function showDocView() {
  document.body.classList.add('doc-mode');
  initDocViewer();
  if (!currentDocFile) {
    try {
      loadDoc(DOCS[0].file);
    } catch (e) {
      console.error('loadDoc failed', e);
      showDocError(DOCS[0].file, 'Failed to render doc: ' + e.message);
    }
  }
}

function showEditorView() {
  document.body.classList.remove('doc-mode');
  if (typeof cmEditor !== 'undefined' && cmEditor) {
    setTimeout(function() { cmEditor.refresh(); }, 0);
  }
}

function buildSidebar() {
  const nav = document.getElementById('docNav');
  if (!nav) return;

  nav.innerHTML = '';
  for (const doc of DOCS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'doc-nav-item';
    btn.dataset.file = doc.file;
    btn.textContent = doc.label;
    btn.addEventListener('click', () => loadDoc(doc.file));
    nav.appendChild(btn);
  }
}

function highlightActiveSidebar(filename) {
  document.querySelectorAll('.doc-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.file === filename);
  });
}

function showDocError(filename, message) {
  const el = document.getElementById('docContent');
  if (!el) return;
  el.innerHTML =
    '<p class="doc-error">' +
    message +
    (filename ? ' (<code>' + filename + '</code>)' : '') +
    '</p>';
}

function docLabelForPlay() {
  const doc = DOCS.find(d => d.file === currentDocFile);
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

  if (propagation && typeof setPropagationMode === 'function') {
    setPropagationMode(propagation);
  }

  if (!tabAdd(label || 'example', code || '')) {
    alert('Max tabs reached — close a tab first.');
    return;
  }

  tabSaved();
  syncLegacyLastKeys();
  fShowTabs();

  if (autoRun && typeof run === 'function') {
    run();
  }
}

function sendExampleToEditor(code, autoRun, propagation) {
  const label = 'ex: ' + docLabelForPlay() + (playBlockIndex > 1 ? ' #' + playBlockIndex : '');
  loadExampleInEditor(code, autoRun, propagation, label);
}

function enhancePlayBlocks(container) {
  playBlockIndex = 0;
  const blocks = container.querySelectorAll('pre > code[class*="logts-play"]');
  blocks.forEach(codeEl => {
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
    btnLoad.addEventListener('click', () => {
      sendExampleToEditor(source, false, propagation);
    });

    const btnRun = document.createElement('button');
    btnRun.type = 'button';
    btnRun.className = 'btn btn--primary';
    btnRun.textContent = 'Load & Run';
    btnRun.addEventListener('click', () => {
      sendExampleToEditor(source, true, propagation);
    });

    if (propagation) {
      const badge = document.createElement('span');
      badge.className = 'doc-play-mode';
      badge.textContent = propagation;
      actions.appendChild(badge);
    }

    actions.appendChild(btnLoad);
    actions.appendChild(btnRun);
    wrapper.appendChild(actions);
  });
}

function loadDoc(filename) {
  const content = window.DOC_CONTENT && window.DOC_CONTENT[filename];
  if (!content) {
    showDocError(
      filename,
      'Document not found in bundle. Run: node _gen_doc_data.js'
    );
    return;
  }

  currentDocFile = filename;
  const el = document.getElementById('docContent');
  if (typeof marked === 'undefined') {
    showDocError(filename, 'marked.min.js not loaded');
    return;
  }
  el.innerHTML = marked.parse(content, { gfm: true, breaks: false });
  enhancePlayBlocks(el);
  highlightActiveSidebar(filename);

  const hash = '#' + filename;
  if (location.hash !== hash) {
    history.replaceState(null, '', hash);
  }

  el.scrollTop = 0;
  const main = document.getElementById('docMain');
  if (main) main.scrollTop = 0;
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
  if (hash && window.DOC_CONTENT && window.DOC_CONTENT[hash]) {
    initDocViewer();
    loadDoc(hash);
    document.body.classList.add('doc-mode');
    return true;
  }
  return false;
}
