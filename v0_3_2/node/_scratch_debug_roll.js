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
const session = sandbox.LogTScriptTestSuite.createSession();
let full = fs.readFileSync(path.join(__dirname, 'doc_verify/_mono_interactive_scratch.logts'), 'utf8');
full = full.replace(
  'query debugRoll:',
  `query rollPartial:
        rollTurn(P),
        show("partial done")
    query debugRoll:`
);
session.run(full);
session.execStmts(session.interp, `.game:{ query = rollPartial\n    set = 1 }`);
console.log((session.out || []).join('\n'));
