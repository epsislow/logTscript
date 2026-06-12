/**
 * Generate test_manifest.js from LogTScriptTestSuite (test_suite.js + test_suite_ported.js).
 * Run: node _gen_manifest.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
const OUT = path.join(dir, 'test_manifest.js');

const GROUP_META = [
  { id: 'repeat', label: 'Repeat preprocessor' },
  { id: 'gates-reduce', label: 'Logic gate reduce / expand' },
  { id: 'shifts', label: 'LSHIFT / RSHIFT' },
  { id: 'bitrange', label: 'Dynamic bit range' },
  { id: 'bit-ops', label: 'Bit operations' },
  { id: 'wire-init', label: ':= wire initialization' },
  { id: 'short-notation', label: 'Short notation preprocessor' },
  { id: 'osc', label: 'Oscillator' },
  { id: 'registry', label: 'Component registry' },
  { id: 'doc', label: 'doc() tests' },
  { id: 'doc-comp', label: 'Doc for body comps' },
  { id: 'chip', label: 'Chip component' },
  { id: 'board', label: 'Board component' },
  { id: 'lut', label: 'LUT lookup table' },
  { id: 'lut-labels', label: 'LUT labels & const expr' },
  { id: 'lut-isvalid', label: 'LUT isValid()' },
  { id: 'lut-decode', label: 'LUT decode()' },
  { id: 'lut-show', label: 'LUT show (symbolic)' },
  { id: 'lut-probe', label: 'LUT probe (symbolic)' },
  { id: 'asm', label: 'Inline ASM (inline [asm])' },
  { id: 'asm-decode', label: 'ASM disassemble / decode' },
  { id: 'protocol', label: 'Inline protocol' },
  { id: 'protocol-decode', label: 'Protocol decode()' },
  { id: 'probe', label: 'probe debug' },
  { id: 'debug', label: 'show / peek / probe' },
  { id: 'pcb', label: 'PCB property block' },
  { id: 'signal', label: 'Wire cascade propagation' },
  { id: 'reg', label: 'REG builtin' },
  { id: 'other', label: 'Other' }
];

function loadSuite() {
  const files = ['test_suite.js', 'test_suite_ported.js'];
  let src = '';
  for (const f of files) src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
  const sb = {
    Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object,
    Math, JSON, Number, isNaN, clearTimeout, setTimeout, window: {}
  };
  sb.window = sb;
  vm.runInNewContext(src, sb);
  sb.LogTScriptTestSuite.finalize();
  return sb.LogTScriptTestSuite.tests;
}

function rangeLabel(ids) {
  if (!ids.length) return '';
  if (ids.length === 1) return String(ids[0]);
  const sorted = [...ids].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? String(start) : start + '–' + prev);
    start = cur;
    prev = cur;
  }
  return parts.join(', ');
}

const tests = loadSuite();
tests.sort((a, b) => a.id - b.id);

const entries = tests.map(t => ({
  id: t.id,
  group: t.group || 'other',
  title: t.title
}));

const byGroup = new Map();
for (const e of entries) {
  if (!byGroup.has(e.group)) byGroup.set(e.group, []);
  byGroup.get(e.group).push(e.id);
}

const labelById = new Map(GROUP_META.map(g => [g.id, g.label]));
const orderById = new Map(GROUP_META.map((g, i) => [g.id, i]));

const knownGroups = GROUP_META.filter(g => byGroup.has(g.id)).map(g => ({
  id: g.id,
  label: g.label,
  rangeLabel: rangeLabel(byGroup.get(g.id)),
  testIds: byGroup.get(g.id)
}));

const extraGroupIds = [...byGroup.keys()]
  .filter(id => !labelById.has(id))
  .sort((a, b) => Math.min(...byGroup.get(a)) - Math.min(...byGroup.get(b)));

for (const id of extraGroupIds) {
  knownGroups.push({
    id,
    label: id,
    rangeLabel: rangeLabel(byGroup.get(id)),
    testIds: byGroup.get(id)
  });
}

knownGroups.sort((a, b) => {
  const oa = orderById.has(a.id) ? orderById.get(a.id) : 999;
  const ob = orderById.has(b.id) ? orderById.get(b.id) : 999;
  if (oa !== ob) return oa - ob;
  return Math.min(...a.testIds) - Math.min(...b.testIds);
});

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const out = `/**
 * Test manifest from LogTScriptTestSuite (auto-generated).
 * Regenerate: node _gen_manifest.js
 */
(function () {
  'use strict';
  window.LogTScriptManifest = {
    entries: [
${entries.map(e => `      { id: ${e.id}, group: '${e.group}', title: '${esc(e.title)}' }`).join(',\n')}
    ],
    groups: [
${knownGroups.map(g => `      { id: '${g.id}', label: '${esc(g.label)}', rangeLabel: '${g.rangeLabel}', testIds: [${g.testIds.join(', ')}] }`).join(',\n')}
    ]
  };
})();
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log('Wrote', OUT, entries.length, 'entries,', knownGroups.length, 'groups');
