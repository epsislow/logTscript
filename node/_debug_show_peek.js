const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./js/paths');
const { loadTestScripts } = require('./js/test_scripts');
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

const files = loadTestScripts().nodeAll().filter(f =>
  f.startsWith('core/') || f.startsWith('devices/device-maps') || f === 'tests/test_session.js'
);
let src = '';
for (const f of files) {
  src += fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n';
}

const sb = createTestNodeSandbox();
vm.runInNewContext(src, sb);

const SCRIPTS = {
  peekShow: `1wire a = 0
1wire b = NOT(a)
peek(a, b)
show(a, b)`,
  midShow: `1wire a = 0
show(a)
1wire b = NOT(a)
show(a, b)
peek(a, b)`,
  probeCascade: `1wire b = 0
1wire a := 0
a = AND(b, 1)
probe(a)
show(a)`,
  regNoNext: `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
peek(q)`,
  regWithNext: `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)
peek(q)`,
};

function run(script, mode) {
  const session = sb.LogTScriptSession.createSession({ propagation: mode });
  const { out } = session.run(script);
  session.cleanup();
  return out.filter(l => !l.startsWith('//') && l.trim());
}

for (const [name, script] of Object.entries(SCRIPTS)) {
  console.log('\n===', name, '===');
  console.log('LEGACY:', run(script, 'legacy').join(' | '));
  console.log('WAVE:  ', run(script, 'wave').join(' | '));
}
