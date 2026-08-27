'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
const { createTestNodeSandbox } = require('./js/test_node_sandbox');
const sandbox = createTestNodeSandbox({ verbose: false });
vm.createContext(sandbox);
for (const script of TEST_RUNTIME_SCRIPTS) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, script), 'utf8'), sandbox, { filename: script });
}
const session = sandbox.LogTScriptTestSuite.createSession();
session.run(fs.readFileSync(path.join(__dirname, 'doc_verify/_mono_minimal.logts'), 'utf8'));
function pulse(name) {
  const b = (session.out || []).length;
  session.setComp(session.interp, name, '1');
  session.setComp(session.interp, name, '0');
  console.log('\n===', name, '===');
  console.log((session.out || []).slice(b).join('\n') || '(none)');
}
console.log('on load:', (session.out || []).join('\n') || '(none)');
(session.out || []).length = 0;
pulse('.resetGame');
pulse('.key1');
