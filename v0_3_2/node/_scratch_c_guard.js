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

function run(name, guards) {
  const src = `inline [logic] .mono:
    square(7, short, 160, 80)
    phase$(waitRoll)
    turn$(p1)
    playerPos$$(p1, 0)
    canBuy(P, Idx, Price, Name) <-
        playerPos$$(P, Idx), square(Idx, Name, Price, _),
        Price > 0, \\+ owns$$(Idx, _)
    buyLandP1() <-
        canBuy(p1, Idx, Price, Name),
        commit(+ phase$(waitChoice)),
        show("menu")
    query test:
        ${guards}
        commit(+ playerPos$$(p1, 7)),
        buyLandP1(),
        phase$(Ph), show("ph", Ph)
    query read2:
        phase$(Ph2), show("read", Ph2)
:
comp [logic] .game:
    on: 1
    .mono { }
:
1wire trigger = 0

.game:{
    query = test
    set = trigger
}

.game:{
    query = read2
    set = trigger
}`;
  const session = sandbox.LogTScriptTestSuite.createSession();
  session.run(src);
  (session.out || []).length = 0;
  session.setWire(session.interp, 'trigger', '1');
  let storePh = '?';
  for (const c of session.interp.components.get('.game').dynamicStore.adds.values()) {
    if (c.head && c.head.predicate === 'phase$') storePh = c.head.args[0].name;
  }
  console.log('\n===', name, '===');
  console.log((session.out || []).join('\n') || '(none)');
  console.log('store:', storePh);
}

run('no guards', '');
run('phase only', 'phase$(waitRoll),');
run('turn only', 'turn$(p1),');
run('both', 'phase$(waitRoll), turn$(p1),');
