/**
 * Generate test_manifest.js from test_repeat.js headers.
 * Run: node _gen_manifest.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'test_repeat.js');
const OUT = path.join(__dirname, 'test_manifest.js');

function removeBlockComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

function testIdFromMatch(num, suffix) {
  const n = parseInt(num, 10);
  if (!suffix) return n;
  return n * 10 + (suffix.charCodeAt(0) - 96);
}

function groupForId(id) {
  const base = id >= 490 && id < 500 ? Math.floor(id / 10) : id;
  if (base >= 6 && base <= 21) return 'repeat';
  if (base >= 22 && base <= 37) return 'gates-reduce';
  if (base >= 40 && base <= 52) return 'shifts';
  if (base >= 53 && base <= 60) return 'bitrange';
  if (base >= 61 && base <= 81) return 'bit-ops';
  if (base >= 82 && base <= 101) return 'wire-init';
  if (base >= 102 && base <= 133) return 'short-notation';
  if (base >= 134 && base <= 153) return 'osc';
  if (base >= 200 && base <= 223) return 'registry';
  if (base >= 300 && base <= 352) return 'doc';
  if (base >= 400 && base <= 427) return 'doc-comp';
  if (base >= 500 && base <= 515) return 'pcb';
  if (base >= 600 && base <= 606) return 'signal';
  if (base >= 700 && base <= 703) return 'reg';
  return 'other';
}

const GROUP_ORDER = [
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
  { id: 'doc-comp', label: 'doc(comp) / doc(pcb)' },
  { id: 'pcb', label: 'PCB property block' },
  { id: 'signal', label: 'Wire cascade propagation' },
  { id: 'reg', label: 'REG builtin' },
];

let raw = fs.readFileSync(SRC, 'utf8');
raw = removeBlockComments(raw);

const headerRe = /console\.log\('\\n=== Test (\d+)([a-z])?: ([^']+) ==='\);/g;
const entries = [];
let m;
while ((m = headerRe.exec(raw)) !== null) {
  const id = testIdFromMatch(m[1], m[2]);
  const title = m[3].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  entries.push({ id, title, group: groupForId(id) });
}
entries.sort((a, b) => a.id - b.id);

const groups = GROUP_ORDER.map(g => {
  const ids = entries.filter(e => e.group === g.id).map(e => e.id);
  if (!ids.length) return null;
  const rangeLabel = ids.length === 1 ? String(ids[0]) : ids[0] + '–' + ids[ids.length - 1];
  return { id: g.id, label: g.label, rangeLabel, testIds: ids };
}).filter(Boolean);

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const out = `/**
 * Test manifest from test_repeat.js (auto-generated).
 * Regenerate: node _gen_manifest.js
 */
(function () {
  'use strict';
  window.LogTScriptManifest = {
    entries: [
${entries.map(e => `      { id: ${e.id}, group: '${e.group}', title: '${esc(e.title)}' }`).join(',\n')}
    ],
    groups: [
${groups.map(g => `      { id: '${g.id}', label: '${g.label}', rangeLabel: '${g.rangeLabel}', testIds: [${g.testIds.join(', ')}] }`).join(',\n')}
    ]
  };
})();
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log('Wrote', OUT, entries.length, 'entries,', groups.length, 'groups');
