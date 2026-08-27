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

function run(name, extraQueryGoals, twoQueries) {
  const src = fs.readFileSync(path.join(__dirname, 'doc_verify/_mono_phase_test.logts'), 'utf8');
  let mod = src;
  if (extraQueryGoals) {
    mod = mod.replace(
      'smart_or(landAfterRollP1(), buyLandP1())',
      `smart_or(landAfterRollP1(), buyLandP1()),\n        ${extraQueryGoals}`);
  }
  if (!twoQueries) {
    mod = mod.replace(/\n\.game:\{\n    query = debugPhase[\s\S]*?\}\n$/, '\n');
  }
  const session = sandbox.LogTScriptTestSuite.createSession();
  session.run(mod);
  const b = (session.out || []).length;
  session.setWire(session.interp, 't', '0');
  session.setWire(session.interp, 't', '1');
  if (twoQueries) session.setWire(session.interp, 't', '1');
  console.log('\n===', name, '===');
  console.log('out:', (session.out || []).slice(b).join('\n') || '(none)');
  const game = session.interp.components.get('.game');
  const store = game && game.dynamicStore;
  if (store && store.adds) {
    const phases = [...store.adds.values()].filter(c => c.head && c.head.predicate === 'phase$');
    console.log('store phase$ adds:', phases.map(c => JSON.stringify(c.head.args && c.head.args[0])).join(', ') || 'none');
  }
}

run('full roll + phase in same query', 'phase$(Ph), show("endphase", Ph)', false);
run('full roll + two queries (original)', null, true);
run('full roll no smart_or direct buy', null, false);
