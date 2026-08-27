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
session.run(fs.readFileSync(path.join(__dirname, 'doc_verify/_mono_rule_commit.logts'), 'utf8'));
(session.out || []).length = 0;
session.setWire(session.interp, 'trigger', '0');
session.setWire(session.interp, 'trigger', '1');
console.log((session.out || []).join('\n') || '(none)');
