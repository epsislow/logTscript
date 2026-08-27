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

function runTest(name, commitLine) {
  const src = `inline [logic] .mono:

    turn$(p1)
    playerPos$$(p1, 0)

    query test:
        show("start"),
        turn$(P),
        show("P bound"),
        ${commitLine},
        show("after commit"),
        playerPos$$(p1, Pos),
        show("pos", Pos)

:

comp [logic] .game:
    on: 1
    .mono { }

:

1wire failed = 0
1wire trigger = 0

.game:{
    query = test
    mutationFailed >= failed
    set = trigger
}`;
  const session = sandbox.LogTScriptTestSuite.createSession();
  session.run(src);
  const b = (session.out || []).length;
  session.setWire(session.interp, 'trigger', '1');
  session.setWire(session.interp, 'trigger', '0');
  const out = (session.out || []).slice(b);
  const failed = session.interp.getWireEffectiveValue('failed');
  console.log('\n===', name, '===');
  console.log('out:', out.join('\n') || '(none)');
  console.log('mutationFailed:', failed);
}

runTest('VAR P', 'commit(+ playerPos$$(P, 7))');
runTest('LITERAL p1', 'commit(+ playerPos$$(p1, 7))');
