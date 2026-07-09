const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./js/paths');
const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

let src = '';
for (const f of TEST_RUNTIME_SCRIPTS) src += fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n';
const sandbox = createTestNodeSandbox();
vm.runInNewContext(src, sandbox);
const session = sandbox.LogTScriptTestSuite.createSession({ propagation: 'wave' });
const script = `<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr := 0
instr:alu := \\5
instr:cycles := \\3
show(instr)
`;

const processed = sandbox.preprocessLoop(script);
const p = new sandbox.Parser(new sandbox.Tokenizer(processed), session._ensureRegistry());
const stmts = p.parse();
session.out = [];
session.interp = new sandbox.Interpreter(p.funcs, session.out, p.pcbs, session._ensureRegistry(), session._ensureSignalPropagationStrategy(), p.chips, p.boards);
session.interp.bindSchemaRegistry(p.schemaRegistry);
for (const s of stmts.slice(0, 3)) {
  session.interp.exec(s);
  console.log('after exec', JSON.stringify(s.assignment?.target?.schemaField || s.decls?.[0]?.name), 'storage', session.getWire(session.interp, 'instr'));
}
console.log('before postExec stable', session.interp.getWireStableValue('instr'));
session.interp.postExecSrc();
console.log('after postExec stable', session.interp.getWireStableValue('instr'));
console.log('out', session.out.join('\n'));
