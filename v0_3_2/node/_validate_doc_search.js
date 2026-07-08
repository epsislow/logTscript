/** Validate doc search primary keywords — run: node node/_validate_doc_search.js */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, DOC } = require('./js/paths');
const { enrichDocIndex, dedicatedBuiltinName } = require('./js/doc_search_keywords');
const DocSearchIndex = require('../ui/doc-search-index.js');

const INDEX_PATH = path.join(DOC, 'doc-index.json');

function loadEnrichedIndex() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const docFiles = fs.readdirSync(DOC).filter(function (n) {
    return n.endsWith('.md') && fs.statSync(path.join(DOC, n)).isFile();
  });
  const contentByFile = new Map();
  docFiles.forEach(function (file) {
    contentByFile.set(file, fs.readFileSync(path.join(DOC, file), 'utf8'));
  });
  return enrichDocIndex(index, docFiles, contentByFile);
}

function collectItems(index) {
  const items = [];
  (index.sections || []).forEach(function (section) {
    (section.items || []).forEach(function (item) {
      items.push(item);
    });
  });
  (index.searchOnly || []).forEach(function (item) {
    items.push(item);
  });
  return items;
}

function primaryMap(items) {
  const map = new Map();
  items.forEach(function (item) {
    if (!item.searchPrimary) return;
    item.searchPrimary.split(/\s+/).filter(Boolean).forEach(function (kw) {
      const key = kw.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item.file);
    });
  });
  return map;
}

function loadBuiltinNames() {
  const interpSrc = fs.readFileSync(path.join(ROOT, 'core', 'interpreter.js'), 'utf8');
  const start = interpSrc.indexOf('Interpreter.BUILTIN_DOC = {');
  if (start < 0) return [];
  const slice = interpSrc.slice(start, start + 120000);
  const names = [];
  const re = /\n  ([A-Z][A-Z0-9_]*):\s+\[/g;
  let m;
  while ((m = re.exec(slice)) !== null) {
    names.push(m[1]);
  }
  return names;
}

const enriched = loadEnrichedIndex();
const items = collectItems(enriched);
const index = DocSearchIndex.buildIndex(enriched.sections, enriched.searchOnly);
const primaries = primaryMap(items);
const builtinNames = loadBuiltinNames();

let warnings = 0;
let errors = 0;

primaries.forEach(function (files, kw) {
  if (files.length > 1) {
    const dedicated = files.filter(function (f) {
      return dedicatedBuiltinName(f) === kw.toUpperCase();
    });
    if (dedicated.length !== 1) {
      console.warn('WARN primary conflict:', kw, '→', files.join(', '));
      warnings++;
    }
  }
});

['mode', 'add', 'mux', 'aftersettle', 'pivot'].forEach(function (query) {
  const results = DocSearchIndex.filterDocSearch(index, query);
  if (!results.length) {
    console.error('ERROR no search results for', query);
    errors++;
    return;
  }
  console.log('OK search', query, '→', results[0].file, `(+${results.length - 1} more)`);
});

const modeFirst = DocSearchIndex.filterDocSearch(index, 'mode')[0];
if (!modeFirst || modeFirst.file !== 'modes.md') {
  console.error('ERROR MODE should rank modes.md first, got', modeFirst && modeFirst.file);
  errors++;
}

const addFirst = DocSearchIndex.filterDocSearch(index, 'add')[0];
if (!addFirst || addFirst.file !== 'builtin-ADD.md') {
  console.error('ERROR ADD should rank builtin-ADD.md first, got', addFirst && addFirst.file);
  errors++;
}

const pivotFirst = DocSearchIndex.filterDocSearch(index, 'pivot')[0];
if (!pivotFirst || pivotFirst.file !== 'wire-vectors.md') {
  console.error('ERROR PIVOT should rank wire-vectors.md first, got', pivotFirst && pivotFirst.file);
  errors++;
}

const missingBuiltin = [];
builtinNames.forEach(function (name) {
  const key = name.toLowerCase();
  if (!primaries.has(key)) {
    missingBuiltin.push(name);
  }
});
if (missingBuiltin.length) {
  console.warn('WARN built-ins without primary keyword page:', missingBuiltin.slice(0, 20).join(', '), missingBuiltin.length > 20 ? '...' : '');
  warnings++;
}

console.log('validate-doc-search: errors', errors, 'warnings', warnings);
process.exit(errors ? 1 : 0);
