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

function run(name, queryBody) {
  const src = `inline [logic] .mono:
    square(7, short, 160, 80)
    playerPos$$(p1, 0)
    query test:
        ${queryBody}
:
comp [logic] .game:
    on: 1
    .mono { }
:
1wire trigger = 0
.game:{
    query = test
    set = trigger
}`;
  const session = sandbox.LogTScriptTestSuite.createSession();
  session.run(src);
  const b = (session.out || []).length;
  session.setWire(session.interp, 'trigger', '1');
  console.log('\n===', name, '===');
  console.log('out:', (session.out || []).slice(b).join('\n') || '(none)');
}

run('read pos after commit new var', 'commit(+ playerPos$$(p1, 7)), playerPos$$(p1, X), show("x", X)');
run('read pos after commit same var', 'playerPos$$(p1, Pos), commit(+ playerPos$$(p1, 7)), playerPos$$(p1, Pos), show("pos", Pos)');
run('square after pos read', 'commit(+ playerPos$$(p1, 7)), playerPos$$(p1, Idx), square(Idx, N, Pr, _), show(Idx, N)');
