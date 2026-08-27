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
const tests = [
  `inline [logic] .x:
    resetGame() <- commit(~ turn(_), + turn(p1))
:
comp [logic] .g:
    on: 1
    .x { }
:
1wire t = 1
1wire ok = 0
.g:{
    query = resetGame
    set = t }`,
  `inline [logic] .x:
    resetGame <- commit(~ turn(_), + turn(p1))
:
comp [logic] .g:
    on: 1
    .x { }
:
1wire t = 1
.g:{ query = resetGame
    set = t }`,
  `inline [logic] .x:
    query resetGame:
        commit(
            ~ playerPos$$(_, _),
            + playerPos$$(p1, 0),
            + playerPos$$(p2, 0)
        )
:
comp [logic] .g:
    on: 1
    .x { }
:
1wire t = 1
.g:{ query = resetGame
    set = t }`,
];
tests.forEach((src, i) => {
  try {
    session.run(src);
    console.log('OK', i);
  } catch (e) {
    console.log('FAIL', i, e.message);
  }
});
