const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const bundle = require(path.join(root, 'tests/test_runtime_bundle_generated.js'));
const ctx = { console, require, module: { exports: {} }, exports: {}, globalThis: {}, window: {}, setTimeout, clearTimeout };
ctx.global = ctx;
vm.createContext(ctx);
for (const f of bundle.TEST_RUNTIME_SCRIPTS) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const src = `inline [asm] .rv:
  set: riscv32
  :
128wire p = .rv { addi x1, x0, 5 }`;
try {
  const interp = new ctx.Interpreter();
  interp.run(src);
  console.log('wire len', interp.wires.get('p')?.storage?.length || 'missing');
  console.log('out', interp.out.slice(-5));
} catch (e) {
  console.error('ERR', e.message);
  console.error(e.stack);
}
