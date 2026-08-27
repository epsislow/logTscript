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
const src = `inline [logic] .game:

    phase$(waitRoll)
    playerPos$$(p1, 0)
    square(7, short, 160, 80)

    canBuy(P, Idx, Price, Name) <-
        playerPos$$(P, Idx),
        square(Idx, Name, Price, _),
        Price > 0,
        \\+ owns$$(Idx, _)

    buyLandP1() <-
        canBuy(p1, Idx, Price, Name),
        commit(+ phase$(waitChoice)),
        show("menu")

    query rollThenBuy:
        phase$(waitRoll),
        commit(+ playerPos$$(p1, 7)),
        buyLandP1(),
        phase$(waitChoice)

    query readPhase:
        phase$(waitChoice)

:

comp [logic] .gameLogic:
    on: 1
    .game { }

:

1wire ok = 0
1wire ok2 = 0
1wire trigger = 0

.gameLogic:{
    rollThenBuy >= ok
    readPhase >= ok2
    set = trigger
}`;
const session = sandbox.LogTScriptTestSuite.createSession();
session.run(src);
session.setWire(session.interp, 'trigger', '1');
console.log('ok', session.interp.getWireEffectiveValue('ok'));
console.log('ok2', session.interp.getWireEffectiveValue('ok2'));
console.log('out', (session.out||[]).join('\n'));
