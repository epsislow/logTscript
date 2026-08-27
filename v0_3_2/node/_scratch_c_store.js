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

const base = fs.readFileSync(path.join(__dirname, 'doc_verify/_mono_phase_test.logts'), 'utf8');
const src = base.replace(
  'smart_or(landAfterRollP1(), buyLandP1())',
  'smart_or(landAfterRollP1(), buyLandP1()), phase$(Ph), show("endphase", Ph)'
).replace(/\n\.game:\{\n    query = debugPhase[\s\S]*?\}\n$/, '\n')
  + `\n1wire failed = 0\n\n.game:{\n    query = handleRollP1\n    mutationFailed >= failed\n    set = t\n}\n`;

const session = sandbox.LogTScriptTestSuite.createSession();
session.run(src);
(session.out || []).length = 0;
session.setWire(session.interp, 't', '1');
console.log('out:', (session.out || []).join('\n') || '(none)');
console.log('mutationFailed:', session.interp.getWireEffectiveValue('failed'));
const game = session.interp.components.get('.game');
for (const c of (game.dynamicStore && game.dynamicStore.adds || new Map()).values()) {
  const h = c.head;
  if (h && (h.predicate === 'phase$' || h.predicate === 'playerPos$$')) {
    console.log('store', h.predicate, JSON.stringify(h.args));
  }
}
