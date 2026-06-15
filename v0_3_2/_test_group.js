const fs = require('fs');
const vm = require('vm');
const path = require('path');
const dir = __dirname;
const files = fs.readFileSync('_run_suite_node.js', 'utf8').match(/'[^']+\.js'/g).map(s => s.slice(1, -1));
let src = '';
files.forEach(f => { src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n'; });
const sb = { Error, parseInt, String, Array, Set, Map, RegExp, console, Object, Math, JSON, Number, isNaN, clearTimeout, setTimeout, window: {} };
sb.window = sb;
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
