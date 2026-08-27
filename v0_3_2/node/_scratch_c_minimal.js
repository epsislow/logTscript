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

function run(name, queryBody, extraRules) {
  const src = `inline [logic] .mono:
    square(7, short, 160, 80)
    turn$(p1)
    phase$(waitRoll)
    playerPos$$(p1, 0)
    playerCash$$(p1, 1500)
    canBuy(P, Idx, Price, Name) <-
        playerPos$$(P, Idx),
        square(Idx, Name, Price, _),
        Price > 0,
        \\+ owns$$(Idx, _)
    smart_or(Cond1, _) <- call(Cond1), !
    smart_or(_, Cond2) <- call(Cond2)
    ${extraRules || ''}
    query test:
        ${queryBody}
:
comp [logic] .game:
    on: 1
    .mono { }
:
1wire trigger = 0
1wire failed = 0

.game:{
    query = test
    mutationFailed >= failed
    set = trigger
}`;
  const session = sandbox.LogTScriptTestSuite.createSession();
  session.run(src);
  const b = (session.out || []).length;
  session.setWire(session.interp, 'trigger', '1');
  console.log('\n===', name, '===');
  console.log('out:', (session.out || []).slice(b).join('\n') || '(none)');
  console.log('mutationFailed:', session.interp.getWireEffectiveValue('failed'));
}

run('A: commit pos + call buyLand',
  'commit(+ playerPos$$(p1, 7)), buyLandP1(), phase$(Ph), show("ph", Ph)',
  `buyLandP1() <- canBuy(p1, Idx, Price, Name), commit(+ phase$(waitChoice)), show("menu")`);

run('B: commit pos+cash + smart_or buy',
  'commit(+ playerPos$$(p1, 7), + playerCash$$(p1, 1500)), smart_or(failGoal(), buyLandP1()), phase$(Ph), show("ph", Ph)',
  `failGoal() <- playerPos$$(p1, 0)\nbuyLandP1() <- canBuy(p1, Idx, Price, Name), commit(+ phase$(waitChoice)), show("menu")`);

run('C: direct buyLand only',
  'commit(+ playerPos$$(p1, 7)), buyLandP1(), phase$(Ph), show("ph", Ph)',
  `buyLandP1() <- canBuy(p1, Idx, Price, Name), commit(+ phase$(waitChoice)), show("menu")`);

run('D: commit phase in query not rule',
  'commit(+ playerPos$$(p1, 7), + phase$(waitChoice)), phase$(Ph), show("ph", Ph)',
  '');
