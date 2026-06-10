const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = __dirname;
const files = [
  'core/tokenizer.js','core/preprocessor.js','core/components/component-base.js',
  'core/components/builtin-component.js','core/components/component-registry.js',
  'core/components/adder.js','core/components/index.js','devices/mem-devices.js',
  'core/parser.js','core/interpreter.js','core/signal-propagation.js','test_session.js'
];
let src = '';
for (const f of files) src += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
const sb = { Error, parseInt, parseFloat, String, Array, Set, Map, RegExp, console, Object, Math, JSON, Number, isNaN, clearTimeout, setTimeout, window: {} };
sb.window = sb;
vm.runInNewContext(src, sb);

const SCRIPTS = {
  peekShow: `1wire a = 0
1wire b = NOT(a)
peek(a, b)
show(a, b)`,
  midShow: `1wire a = 0
show(a)
1wire b = NOT(a)
show(a, b)
peek(a, b)`,
  probeCascade: `1wire b = 0
1wire a := 0
a = AND(b, 1)
probe(a)
show(a)`,
  regNoNext: `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
peek(q)`,
  regWithNext: `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)
peek(q)`,
};

function run(script, mode) {
  const session = sb.LogTScriptSession.createSession({ propagation: mode });
  const { out } = session.run(script);
  session.cleanup();
  return out.filter(l => !l.startsWith('//') && l.trim());
}

for (const [name, script] of Object.entries(SCRIPTS)) {
  console.log('\n===', name, '===');
  console.log('LEGACY:', run(script, 'legacy').join(' | '));
  console.log('WAVE:  ', run(script, 'wave').join(' | '));
}
