/** Audit built-ins / keywords without canonical doc page. */
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, DOC } = require('./js/paths');
const { enrichDocIndex, dedicatedBuiltinName } = require('./js/doc_search_keywords');
const DocSearchIndex = require('../ui/doc-search-index.js');

function loadBuiltinNames() {
  const src = fs.readFileSync(path.join(ROOT, 'core', 'interpreter.js'), 'utf8');
  const start = src.indexOf('Interpreter.BUILTIN_DOC = {');
  const slice = src.slice(start, start + 120000);
  const names = [];
  const re = /\n  ([A-Z][A-Z0-9_]*):\s+\[/g;
  let m;
  while ((m = re.exec(slice)) !== null) names.push(m[1]);
  return names;
}

function listDedicatedBuiltinPages() {
  return fs.readdirSync(DOC)
    .filter(function (f) { return dedicatedBuiltinName(f); })
    .map(function (f) { return dedicatedBuiltinName(f); });
}

function loadEnrichedIndex() {
  const index = JSON.parse(fs.readFileSync(path.join(DOC, 'doc-index.json'), 'utf8'));
  const docFiles = fs.readdirSync(DOC).filter(function (n) {
    return n.endsWith('.md') && fs.statSync(path.join(DOC, n)).isFile();
  });
  const contentByFile = new Map();
  docFiles.forEach(function (file) {
    contentByFile.set(file, fs.readFileSync(path.join(DOC, file), 'utf8'));
  });
  return enrichDocIndex(index, docFiles, contentByFile);
}

function primaryOwners(items) {
  const map = new Map();
  items.forEach(function (item) {
    if (!item.searchPrimary) return;
    item.searchPrimary.split(/\s+/).filter(Boolean).forEach(function (kw) {
      const k = kw.toLowerCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item.file);
    });
  });
  return map;
}

function collectItems(index) {
  const items = [];
  (index.sections || []).forEach(function (s) {
    (s.items || []).forEach(function (i) { items.push(i); });
  });
  (index.searchOnly || []).forEach(function (i) { items.push(i); });
  return items;
}

const builtinNames = loadBuiltinNames();
const dedicated = new Set(listDedicatedBuiltinPages());
const enriched = loadEnrichedIndex();
const items = collectItems(enriched);
const owners = primaryOwners(items);
const index = DocSearchIndex.buildIndex(enriched.sections, enriched.searchOnly);

const noDedicatedPage = builtinNames.filter(function (n) { return !dedicated.has(n); });
const noPrimary = [];
const noSearchHit = [];

noDedicatedPage.forEach(function (name) {
  const key = name.toLowerCase();
  if (!owners.has(key)) noPrimary.push(name);
  const results = DocSearchIndex.filterDocSearch(index, key);
  if (!results.length) noSearchHit.push(name);
});

console.log('=== Built-ins fără pagină dedicată builtin-NAME.md ===');
console.log(noDedicatedPage.join(', ') || '(none)');
console.log('');
console.log('=== Fără searchPrimary pe nicio pagină ===');
console.log(noPrimary.join(', ') || '(none)');
console.log('');
console.log('=== Fără niciun rezultat în search ===');
console.log(noSearchHit.join(', ') || '(none)');
console.log('');
console.log('=== Detaliu built-ins fără pagină dedicată ===');
noDedicatedPage.forEach(function (name) {
  const key = name.toLowerCase();
  const pages = owners.get(key) || [];
  const first = DocSearchIndex.filterDocSearch(index, key)[0];
  console.log(name + ': primary pe ' + (pages.join(', ') || '—') + ' | search first: ' + (first ? first.file : '—'));
});
