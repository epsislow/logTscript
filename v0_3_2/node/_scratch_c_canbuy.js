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

function run(name, queryBody, extra) {
  const src = `inline [logic] .mono:
    square(7, short, 160, 80)
    playerPos$$(p1, 0)
    ${extra || ''}
    canBuy(P, Idx, Price, Name) <-
        playerPos$$(P, Idx),
        square(Idx, Name, Price, _),
        Price > 0,
        \\+ owns$$(Idx, _)
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

run('canBuy before commit', 'canBuy(p1, I, Pr, N), show(N, Pr)', '');
run('canBuy after commit pos0', 'commit(+ playerPos$$(p1, 0)), canBuy(p1, I, Pr, N), show(N, Pr)', '');
run('canBuy after commit pos7', 'commit(+ playerPos$$(p1, 7)), canBuy(p1, I, Pr, N), show(N, Pr)', '');
run('neg owns only', 'commit(+ playerPos$$(p1, 7)), playerPos$$(p1, I), \\+ owns$$(I, _), show("ok")', '');
run('canBuy inline body', 'commit(+ playerPos$$(p1, 7)), playerPos$$(p1, I), square(I, N, Pr, _), Pr > 0, \\+ owns$$(I, _), show(N)', '');
