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
session.run(fs.readFileSync(path.join(__dirname, 'doc_verify/_mono_c1.logts'), 'utf8'));
(session.out || []).length = 0;
session.setWire(session.interp, 'trigger', '1');
console.log('pulse1:', (session.out || []).join('\n') || '(none)');
console.log('ok:', session.interp.getWireEffectiveValue('ok'));
(session.out || []).length = 0;
session.setWire(session.interp, 'trigger', '0');
session.setWire(session.interp, 'trigger', '1');
console.log('pulse2:', (session.out || []).join('\n') || '(none)');
const g = session.interp.components.get('.game');
for (const c of g.dynamicStore.adds.values()) {
  if (c.head && c.head.predicate === 'phase$') console.log('store phase', c.head.args[0].name);
}
