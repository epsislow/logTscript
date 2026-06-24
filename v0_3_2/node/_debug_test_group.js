/** Quick validation: load core + test_suite, run all tests with isolated sessions. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./js/paths');
const { loadTestScripts } = require('./js/test_scripts');
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

const files = loadTestScripts().nodeAll();
let src = '';
for (const f of files) {
  src += fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n';
}

const sb = createTestNodeSandbox();
vm.runInNewContext(src, sb);

const s = sb.LogTScriptTestSuite.createSession();
const INLINE_DECODER2 = `inline [lut] .decoder:
  depth: 2
  length: 4
  data {
    00 : 00
    01 : 01
    10 : 10
    11 : 11
  }
  :`;
const { out } = s.run(INLINE_DECODER2 + '\nexprOfLut(.decoder, A, B)');
console.log('current:', out[0]);
const line = out[0].replace('out', 'R');
try {
  const { interp } = s.run('1wire A\n1wire B\n2wire R\n' + line);
  console.log('runs', s.getWire(interp, 'R'));
} catch (e) {
  console.log('ERR', e.message);
}
