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

function loadDoc(filename) {
  const content = window.DOC_CONTENT && window.DOC_CONTENT[filename];
  if (!content) {
    showDocError(
      filename,
      'Document not found in bundle. Run: node _gen_doc_data.js'
    );
    return;
  }

  const el = document.getElementById('docContent');
  el.innerHTML = marked.parse(content, { gfm: true, breaks: false });
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
  const link = e.target.closest('a');
  if (!link) return;

  const filename = resolveMdHref(link.getAttribute('href'));
  if (!filename) return;

  if (!window.DOC_CONTENT || !window.DOC_CONTENT[filename]) return;

  e.preventDefault();
  loadDoc(filename);
}

function initDocViewer() {
  buildSidebar();

  const content = document.getElementById('docContent');
  if (content) {
    content.addEventListener('click', onDocContentClick);
  }

  const hash = location.hash.replace(/^#/, '');
  const initial =
    hash && window.DOC_CONTENT && window.DOC_CONTENT[hash]
      ? hash
      : DOCS[0].file;

  loadDoc(initial);
}

document.addEventListener('DOMContentLoaded', initDocViewer);
