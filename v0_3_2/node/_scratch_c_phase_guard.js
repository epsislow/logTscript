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
function dumpStore(g) {
  const out = [];
  for (const c of g.dynamicStore.adds.values()) {
    out.push(c.head.predicate + '(' + (c.head.args||[]).map(a=>a.name||a.value).join(',') + ')');
  }
  return out.join(', ') || 'empty';
}
function run(name, q) {
  const src = `inline [logic] .mono:
    phase$(waitRoll)
    turn$(p1)
    query test:
        ${q}
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
  session.setWire(session.interp, 'trigger', '1');
  console.log(name, 'store:', dumpStore(session.interp.components.get('.game')));
}
run('read phase only', 'phase$(waitRoll)');
run('read phase + commit choice', 'phase$(waitRoll), commit(+ phase$(waitChoice))');
run('commit choice only', 'commit(+ phase$(waitChoice))');
