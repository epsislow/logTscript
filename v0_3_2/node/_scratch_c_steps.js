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
    turn$(p1)
    phase$(waitRoll)
    playerPos$$(p1, 0)
    canBuy(P, Idx, Price, Name) <-
        playerPos$$(P, Idx),
        square(Idx, Name, Price, _),
        Price > 0,
        \\+ owns$$(Idx, _)
    buyLandP1() <-
        canBuy(p1, Idx, Price, Name),
        commit(+ phase$(waitChoice)),
        show("menu")
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

run('step1 commit only', 'commit(+ playerPos$$(p1, 7)), show("after commit")');
run('step2 canBuy after commit', 'commit(+ playerPos$$(p1, 7)), canBuy(p1, I, Pr, N), show("can", N)');
run('step3 call buyLand', 'commit(+ playerPos$$(p1, 7)), buyLandP1(), show("done")');
run('step4 phase after buyLand', 'commit(+ playerPos$$(p1, 7)), buyLandP1(), phase$(Ph), show("ph", Ph)');
