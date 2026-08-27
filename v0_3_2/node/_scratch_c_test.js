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

function phaseOf(interp) {
  const game = interp.components.get('.game');
  const rt = game && game.logicRuntime;
  if (!rt || !rt.engine) return '?';
  const sols = rt.engine.solveQuery([{
    kind: 'call', predicate: 'phase$', args: [{ kind: 'var', name: 'X' }],
  }], {});
  return sols.length ? JSON.stringify(sols[0].X) : 'none';
}

function runFile(name, file, pulseTwice) {
  const session = sandbox.LogTScriptTestSuite.createSession();
  session.run(fs.readFileSync(path.join(__dirname, 'doc_verify', file), 'utf8'));
  (session.out || []).length = 0;
  session.setWire(session.interp, 't', '0');
  session.setWire(session.interp, 'trigger', '0');
  session.setWire(session.interp, 't', '1');
  if (pulseTwice) session.setWire(session.interp, 't', '1');
  session.setWire(session.interp, 'trigger', '1');
  const out = (session.out || []).join('\n');
  console.log('\n===', name, '===');
  console.log('out:', out || '(none)');
  console.log('phase$:', phaseOf(session.interp));
}

runFile('C minimal rule after query commit', '_mono_rule_commit.logts', false);
runFile('C phase test roll+smart_or', '_mono_phase_test.logts', true);
