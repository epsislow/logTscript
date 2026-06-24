const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { loadTestScripts } = require('./test_scripts');
const { createTestNodeSandbox } = require('./test_node_sandbox');
const dir = __dirname;
const files = loadTestScripts().nodeAll();
let src = '';
files.forEach(f => { src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n'; });
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
