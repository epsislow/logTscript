/**
 * Bundle doc/*.md into ui/doc-data.js for file:// viewer (no fetch).
 * Run: node _gen_doc_data.js
 *
 * Every *.md file in doc/ is included automatically (sorted by name).
 */
const fs = require('fs');
const path = require('path');

const DOC_DIR = path.join(__dirname, 'doc');
const OUT = path.join(__dirname, 'ui', 'doc-data.js');

function listDocMarkdownFiles() {
  return fs
    .readdirSync(DOC_DIR)
    .filter(function (name) {
      return name.endsWith('.md') && fs.statSync(path.join(DOC_DIR, name)).isFile();
    })
    .sort(function (a, b) {
      return a.localeCompare(b, 'en');
    });
}

function escForJs(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const DOC_FILES = listDocMarkdownFiles();
if (!DOC_FILES.length) {
  console.error('No .md files in', DOC_DIR);
  process.exit(1);
}

const entries = [];
for (const file of DOC_FILES) {
  const full = path.join(DOC_DIR, file);
  const content = fs.readFileSync(full, 'utf8');
  entries.push({ file, content });
}

const out = `/**
 * Documentation bundle from doc/*.md (auto-generated).
 * Regenerate: node _gen_doc_data.js
 * Files: ${DOC_FILES.join(', ')}
 */
(function () {
  'use strict';
  window.DOC_CONTENT = {
${entries.map(e => `    '${e.file}': \`${escForJs(e.content)}\``).join(',\n')}
  };
})();
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log('Wrote', OUT, entries.length, 'files');
