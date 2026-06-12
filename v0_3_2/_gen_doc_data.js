/**
 * Bundle doc/*.md into ui/doc-data.js and refresh DOC_SECTIONS in ui/doc-viewer.js.
 * Run: node _gen_doc_data.js
 *
 * Navigation layout: doc/doc-index.json (edit labels / sections there).
 * New *.md files not listed in doc-index.json are auto-added to the "Other" section.
 */
const fs = require('fs');
const path = require('path');

const DOC_DIR = path.join(__dirname, 'doc');
const INDEX_PATH = path.join(DOC_DIR, 'doc-index.json');
const OUT_DATA = path.join(__dirname, 'ui', 'doc-data.js');
const OUT_VIEWER = path.join(__dirname, 'ui', 'doc-viewer.js');

const GEN_BEGIN = '// BEGIN GENERATED DOC_SECTIONS (_gen_doc_data.js)';
const GEN_END = '// END GENERATED DOC_SECTIONS';

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

function escForJsString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function readTitleFromMd(file) {
  const content = fs.readFileSync(path.join(DOC_DIR, file), 'utf8');
  const m = content.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return file.replace(/\.md$/, '').replace(/-/g, ' ');
}

function loadDocIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Missing', INDEX_PATH);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}

function collectAssignedFiles(index) {
  const assigned = new Set();
  (index.sections || []).forEach(function (section) {
    (section.items || []).forEach(function (item) {
      assigned.add(item.file);
    });
  });
  (index.searchOnly || []).forEach(function (item) {
    assigned.add(item.file);
  });
  return assigned;
}

function mergeAutoSection(index, docFiles) {
  const assigned = collectAssignedFiles(index);
  const autoSectionTitle = index.autoSection || 'Other';
  const unlisted = docFiles.filter(function (f) {
    return !assigned.has(f);
  });
  if (!unlisted.length) return index;

  const sections = JSON.parse(JSON.stringify(index.sections || []));
  let autoSection = sections.find(function (s) {
    return s.title === autoSectionTitle;
  });
  if (!autoSection) {
    autoSection = { title: autoSectionTitle, items: [] };
    sections.push(autoSection);
  }

  unlisted.forEach(function (file) {
    autoSection.items.push({ file: file, label: readTitleFromMd(file) });
    console.warn('doc-index: auto-added', file, '→ section', autoSectionTitle);
  });

  return { sections: sections, searchOnly: index.searchOnly || [], autoSection: autoSectionTitle };
}

function formatItem(item) {
  let line = "      { file: '" + item.file + "', label: '" + escForJsString(item.label) + "'";
  if (item.searchExtra) {
    line += ", searchExtra: '" + escForJsString(item.searchExtra) + "'";
  }
  line += ' }';
  return line;
}

function formatSearchOnlyItem(item) {
  let line = "    { file: '" + item.file + "', label: '" + escForJsString(item.label) + "'";
  if (item.section) {
    line += ", section: '" + escForJsString(item.section) + "'";
  }
  if (item.searchExtra) {
    line += ",\n      searchExtra:\n        '" + escForJsString(item.searchExtra) + "'";
  }
  line += ' }';
  return line;
}

function buildDocSectionsBlock(index) {
  const sectionLines = (index.sections || []).map(function (section) {
    const items = (section.items || []).map(formatItem).join(',\n');
    return (
      '  {\n' +
      "    title: '" + escForJsString(section.title) + "',\n" +
      '    items: [\n' +
      items + '\n' +
      '    ],\n' +
      '  }'
    );
  });

  const searchOnlyLines = (index.searchOnly || []).map(formatSearchOnlyItem).join(',\n');

  return [
    GEN_BEGIN,
    'const DOC_SECTIONS = [',
    sectionLines.join(',\n'),
    '];',
    '',
    '/** In DOC_CONTENT + search only — not listed on the doc index page */',
    'const DOC_SEARCH_ONLY = [',
    searchOnlyLines,
    '];',
    GEN_END,
  ].join('\n');
}

function patchDocViewer(generatedBlock) {
  const viewer = fs.readFileSync(OUT_VIEWER, 'utf8');
  const beginIdx = viewer.indexOf(GEN_BEGIN);
  const endIdx = viewer.indexOf(GEN_END);
  if (beginIdx < 0 || endIdx < 0 || endIdx < beginIdx) {
    console.error('doc-viewer.js missing generation markers:', GEN_BEGIN, GEN_END);
    process.exit(1);
  }
  const endLineEnd = endIdx + GEN_END.length;
  const updated = viewer.slice(0, beginIdx) + generatedBlock + viewer.slice(endLineEnd);
  fs.writeFileSync(OUT_VIEWER, updated, 'utf8');
}

const DOC_FILES = listDocMarkdownFiles();
if (!DOC_FILES.length) {
  console.error('No .md files in', DOC_DIR);
  process.exit(1);
}

const rawIndex = loadDocIndex();
const mergedIndex = mergeAutoSection(rawIndex, DOC_FILES);

const entries = [];
for (const file of DOC_FILES) {
  const full = path.join(DOC_DIR, file);
  const content = fs.readFileSync(full, 'utf8');
  entries.push({ file, content });
}

const outData = `/**
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

fs.writeFileSync(OUT_DATA, outData, 'utf8');
console.log('Wrote', OUT_DATA, entries.length, 'files');

const sectionsBlock = buildDocSectionsBlock(mergedIndex);
patchDocViewer(sectionsBlock);
console.log('Updated', OUT_VIEWER, 'DOC_SECTIONS');
