'use strict';
const { createSandbox } = require('./_verify_doc_examples.js');

const tests = [
  ['wire mut', `inline [logic] .mono:
    playerPos(p1, 0)
:
64wire turnW := p1
16wire oldW := 0
16wire newW := 7
1wire failed = 0
comp [logic] .mv:
    on: 1
    .mono { }
:
.mv:{
    logic {
        - playerPos(text turnW, number oldW)
        + playerPos(text turnW, number newW)
    }
    mutationFailed >= failed
    set = 1
}`],
  ['pin comp', `inline [logic] .mono:
    playerPos(p1, 0)
:
64wire turnW := p1
16wire oldW := 0
16wire newW := 7
1wire failed = 0
comp [logic] .mv:
    on: 1
    .mono {
        OldPos is number oldW
        NewPos is number newW
    }
:
.mv:{
    logic {
        - playerPos(p1, number oldW)
        + playerPos(p1, number newW)
    }
    mutationFailed >= failed
    set = 1
}`],
];

for (const [name, code] of tests) {
  const s = createSandbox().LogTScriptTestSuite.createSession();
  try {
    s.run(code);
    console.log(name, 'failed', s.getWire(s.interp, 'failed'));
  } catch (e) {
    console.log(name, 'ERR', e.message);
  }
}
