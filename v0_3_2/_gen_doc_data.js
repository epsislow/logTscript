/**
 * Bundle doc/*.md into ui/doc-data.js for file:// viewer (no fetch).
 * Run: node _gen_doc_data.js
 */
const fs = require('fs');
const path = require('path');

const DOC_DIR = path.join(__dirname, 'doc');
const OUT = path.join(__dirname, 'ui', 'doc-data.js');

const DOC_FILES = [
  'doc-function.md',
  'components.md',
  'board.md',
  'chip.md',
  'mini-cpu.md',
  'mini-cpu-plan.md',
  'pcb.md',
  'interactive-components.md',
  'switch.md',
  'key.md',
  'dip.md',
  'rotary.md',
  'led.md',
  'led-bar.md',
  'seven-seg.md',
  '14seg.md',
  'lcd.md',
  'dots.md',
  'adder.md',
  'subtract.md',
  'multiplier.md',
  'divider.md',
  'shifter.md',
  'counter.md',
  'mem.md',
  'reg.md',
  'oscillator.md',
  'arithmetic.md',
  'debug.md',
  'signal-propagation.md',
  'editorUI.md',
  'short-notation.md',
];

function escForJs(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const entries = [];
for (const file of DOC_FILES) {
  const full = path.join(DOC_DIR, file);
  if (!fs.existsSync(full)) {
    console.warn('Missing:', full);
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  entries.push({ file, content });
}

const out = `/**
 * Documentation bundle from doc/*.md (auto-generated).
 * Regenerate: node _gen_doc_data.js
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
