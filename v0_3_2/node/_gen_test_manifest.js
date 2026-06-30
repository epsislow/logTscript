/**
 * Generate tests/test_manifest_generated.js from LogTScriptTestSuite.
 * Syncs run_tests.html script tags and test_runtime_bundle_generated.js from test_scripts.json.
 * Run: node node/_gen_test_manifest.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT, TESTS } = require('./js/paths');
const { loadSharedConstMap, extractTestDetail } = require('./js/test_detail_extract');
const { loadTestScripts } = require('./js/test_scripts');

const OUT = path.join(TESTS, 'test_manifest_generated.js');
const RUN_TESTS_HTML = path.join(ROOT, 'run_tests.html');
const SCRIPT_EDITOR_HTML = path.join(ROOT, 'script_editor_v0_3_2.html');
const RUNTIME_BUNDLE = path.join(TESTS, 'test_runtime_bundle_generated.js');
const SCRIPT_MARKER_START = '<!-- @generated test-scripts start -->';
const SCRIPT_MARKER_END = '<!-- @generated test-scripts end -->';
const EDITOR_PIPELINE_START = '<!-- @generated editor-pipeline-tail start -->';
const EDITOR_PIPELINE_END = '<!-- @generated editor-pipeline-tail end -->';

const GROUP_META = [
  { id: 'loop', label: 'Loop preprocessor' },
  { id: 'literals', label: 'Decimal \\\\N literals' },
  { id: 'gates-reduce', label: 'Logic gate reduce / expand' },
  { id: 'bit-transform', label: 'Bit transform built-ins' },
  { id: 'bit-selection', label: 'Bit selection built-ins' },
  { id: 'bit-analysis', label: 'Bit analysis built-ins' },
  { id: 'bitrange', label: 'Dynamic bit range' },
  { id: 'bit-ops', label: 'Bit operations' },
  { id: 'wire-init', label: ': wire initial assignment' },
  { id: 'global-ref', label: 'Global ^.ref (board/chip)' },
  { id: 'left-pad-assign', label: ':= left-pad assignment' },
  { id: 'strict-assign', label: '= strict assignment' },
  { id: 'right-pad-assign', label: '=: right-pad assignment' },
  { id: 'short-notation', label: 'Short notation preprocessor' },
  { id: 'osc', label: 'Oscillator' },
  { id: 'registry', label: 'Component registry' },
  { id: 'terminal', label: 'Terminal component' },
  { id: 'mem-ports', label: 'Memory multi-port' },
  { id: 'queue-storage', label: 'Queue storage engine' },
  { id: 'queue-stack', label: 'Queue & Stack components' },
  { id: 'meta-constants', label: 'Meta constants (/instance/)' },
  { id: 'network', label: 'Network component' },
  { id: 'doc', label: 'doc() tests' },
  { id: 'doc-comp', label: 'Doc for body comps' },
  { id: 'chip', label: 'Chip component' },
  { id: 'board', label: 'Board component' },
  { id: 'mini-cpu-v2', label: 'Mini CPU v2 demo' },
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
  { id: 'ioport', label: 'I/O port (ioport)' },
  { id: 'reg', label: 'REG builtin' },
  { id: 'slider', label: 'Slider component' },
  { id: 'clcd', label: 'CLCD component' },
  { id: 'alu', label: 'ALU component' },
  { id: 'error-display', label: 'Error display (caret + editor)' },
  { id: 'other', label: 'Other' }
];

function loadSuite() {
  const suitePath = path.join(TESTS, 'test_suite.js');
  const src = fs.readFileSync(suitePath, 'utf8') + '\n';
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

const sharedConsts = loadSharedConstMap(TESTS, ['test_suite.js']);
const suiteSource = fs.readFileSync(path.join(TESTS, 'test_suite.js'), 'utf8');

const tests = loadSuite();
tests.sort((a, b) => a.id - b.id);

const entries = tests.map(t => ({
  id: t.id,
  group: t.group || 'other',
  title: t.title,
  detail: extractTestDetail(t.run, sharedConsts, suiteSource, {
    propagation: t.propagation || 'legacy'
  })
}));

const byGroup = new Map();
for (const e of entries) {
  if (!byGroup.has(e.group)) byGroup.set(e.group, []);
  byGroup.get(e.group).push(e.id);
}

const labelById = new Map(GROUP_META.map(g => [g.id, g.label]));

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
  const cmp = (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return a.id.localeCompare(b.id);
});

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const out = `/**
 * AUTO-GENERATED — do not edit.
 * Regenerate: node node/_gen_test_manifest.js
 */
(function () {
  'use strict';
  window.LogTScriptManifest = {
    entries: [
${entries.map(e => '      ' + JSON.stringify(e)).join(',\n')}
    ],
    groups: [
${knownGroups.map(g => `      { id: '${g.id}', label: '${esc(g.label)}', rangeLabel: '${g.rangeLabel}', testIds: [${g.testIds.join(', ')}] }`).join(',\n')}
    ]
  };
})();
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log('Wrote', OUT, entries.length, 'entries,', knownGroups.length, 'groups');

function writeRuntimeBundle() {
  const scripts = loadTestScripts();
  const nodeScripts = scripts.nodeAll();
  const body = `/**
 * AUTO-GENERATED — do not edit.
 * Regenerate: node node/_gen_test_manifest.js
 * Source of truth: tests/test_scripts.json
 */
const TEST_RUNTIME_SCRIPTS = ${JSON.stringify(nodeScripts, null, 2)};

module.exports = { TEST_RUNTIME_SCRIPTS };
`;
  fs.writeFileSync(RUNTIME_BUNDLE, body, 'utf8');
  console.log('Wrote', RUNTIME_BUNDLE, nodeScripts.length, 'scripts (node)');
}

function syncRunTestsHtml() {
  const scripts = loadTestScripts();
  const browserScripts = scripts.browserAll();
  const block =
    SCRIPT_MARKER_START + '\n' +
    browserScripts.map(f => `<script src="${f}"></script>`).join('\n') + '\n' +
    SCRIPT_MARKER_END;
  let html = fs.readFileSync(RUN_TESTS_HTML, 'utf8');
  const re = new RegExp(
    SCRIPT_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '[\\s\\S]*?' +
    SCRIPT_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  if (!re.test(html)) {
    const legacyRe = /(<script src="core\/tokenizer\.js"><\/script>)[\s\S]*?(<script src="[^"]*run_tests\.js"><\/script>)/;
    if (!legacyRe.test(html)) {
      throw new Error('run_tests.html: missing script markers — add ' + SCRIPT_MARKER_START);
    }
    html = html.replace(legacyRe, block);
  } else {
    html = html.replace(re, block);
  }
  fs.writeFileSync(RUN_TESTS_HTML, html, 'utf8');
  console.log('Wrote', RUN_TESTS_HTML, browserScripts.length, 'script tags (browser)');
}

function syncScriptEditorHtml() {
  const scripts = loadTestScripts();
  const tail = scripts.editorPipelineTail;
  if (!tail.length) return;
  const block =
    EDITOR_PIPELINE_START + '\n' +
    tail.map(f => `<script src="${f}"></script>`).join('\n') + '\n' +
    EDITOR_PIPELINE_END;
  let html = fs.readFileSync(SCRIPT_EDITOR_HTML, 'utf8');
  const re = new RegExp(
    EDITOR_PIPELINE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '[\\s\\S]*?' +
    EDITOR_PIPELINE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  if (!re.test(html)) {
    throw new Error('script_editor_v0_3_2.html: missing ' + EDITOR_PIPELINE_START);
  }
  html = html.replace(re, block);
  fs.writeFileSync(SCRIPT_EDITOR_HTML, html, 'utf8');
  console.log('Wrote', SCRIPT_EDITOR_HTML, tail.length, 'pipeline script tags');
}

writeRuntimeBundle();
syncRunTestsHtml();
syncScriptEditorHtml();
