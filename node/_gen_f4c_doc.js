'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./js/paths');

const suiteSrc = fs.readFileSync(path.join(ROOT, 'tests/test_suite.js'), 'utf8');

function evalConst(name) {
  const re = new RegExp(`const ${name} = ([\\s\\S]*?);\\n\\n  (?:const|function)`);
  const m = suiteSrc.match(re);
  if (!m) throw new Error('missing ' + name);
  return eval(m[1]);
}

const F4C_VAR_SLOTS = 16;
const F4C_NAME_CHARS = 5;
const F4C_KEYS_BITS = F4C_VAR_SLOTS * F4C_NAME_CHARS * 8;
const F4C_VALS_BITS = F4C_VAR_SLOTS * 64;

const F2C_BYTE = evalConst('F2C_BYTE');
const F2C_CALL_ADD = evalConst('F2C_CALL_ADD');
const F2C_CALL_MUL = evalConst('F2C_CALL_MUL');
const F4C_CALL_NUMBER = evalConst('F4C_CALL_NUMBER');
const F4C_CALL_SUB = evalConst('F4C_CALL_SUB');
const F4C_CALL_DIV = evalConst('F4C_CALL_DIV');
const F4C_CALL_POW = evalConst('F4C_CALL_POW');
const F4C_CALL_NEG = evalConst('F4C_CALL_NEG');
const F4C_CALL_VARIABLE = evalConst('F4C_CALL_VARIABLE');
const F4C_CALL_ASSIGN = evalConst('F4C_CALL_ASSIGN');
const F4C_CALL_EXPR_WRAP = evalConst('F4C_CALL_EXPR_WRAP');
const F4C_EXPR = evalConst('F4C_EXPR');
const F4C_REPL_LINE = evalConst('F4C_REPL_LINE');
const F4C_PARSER = evalConst('F4C_PARSER');
const F4C_INTERP = evalConst('F4C_INTERP');
const F4C_COMP = evalConst('F4C_COMP');

const F4C_SCHEMAS = [
  F2C_BYTE,
  F4C_CALL_NUMBER,
  F2C_CALL_ADD,
  F2C_CALL_MUL,
  F4C_CALL_SUB,
  F4C_CALL_DIV,
  F4C_CALL_POW,
  F4C_CALL_NEG,
  F4C_CALL_VARIABLE,
  F4C_CALL_ASSIGN,
  F4C_CALL_EXPR_WRAP,
  F4C_EXPR,
  F4C_REPL_LINE,
].join('\n');

const F4C_CORE = F4C_SCHEMAS + '\n' + F4C_PARSER + '\n' + F4C_INTERP + '\n' + F4C_COMP;

const waveTail = [
  'MODE WIREWRITE',
  '',
  'comp [keyboard] .kbd:',
  '  label: \'REPL\'',
  '  allowEnter',
  '  allowBackspace',
  '  on: 1',
  '  :',
  '',
  'comp [key] .reset:',
  '  label: \'R\'',
  '  type: 0',
  '  on: 1',
  '  nl',
  '  :',
  '',
  'comp [terminal] .term:',
  '  rows: 16',
  '  columns: 48',
  '  cursorStyle: 1',
  '  color: ^0f0',
  '  on: 1',
  '  nl',
  '  :',
  '',
  'comp [reg] .evalLatch:',
  '  depth: 1',
  '  on: 1',
  '  :',
  '',
  'comp [reg] .resetPending:',
  '  depth: 1',
  '  on: 1',
  '  :',
  '',
  'comp [osc] .poll:',
  '  on: 1',
  '  :',
  '',
  'sock lineBuf',
  '',
  '1wire isEnter = EQ(.kbd:get, ^0a)',
  '1wire isBack = EQ(.kbd:get, ^08)',
  '1wire kbdChar = AND(.kbd:valid, NOT(isEnter))',
  '',
  '.term:{',
  '  append = .kbd:get',
  '  set = kbdChar',
  '}',
  '',
  'on:1 {',
  '  kbdChar,',
  '  lineBuf << .kbd',
  '}',
  '',
  '.term:{',
  '  backDelete = \\1',
  '  set = AND(.kbd:valid, isBack)',
  '}',
  '',
  '8wire varsLenStore := 0',
  (F4C_NAME_CHARS * 8) + 'wire[' + F4C_VAR_SLOTS + '] keysStore = \\0;' + F4C_KEYS_BITS,
  '64wire[' + F4C_VAR_SLOTS + '] valsStore = \\0;' + F4C_VALS_BITS,
  '',
  '64wire replResult := 0',
  '1wire replIsAssign := 0',
  (F4C_NAME_CHARS * 8) + 'wire replAssignName := 0',
  '11wire digits3 = \\3;11',
  '4096wire<replLine> prog = \\0;4096',
  '512wire lineSrc',
  '512wire lineTrim',
  '8wire resultText := 0',
  '1wire runRepl := 0',
  '1wire showResult := 0',
  '1wire showDone := 0',
  '1wire evalDone := 0',
  '1wire wantEval = .evalLatch:get',
  '1wire resetDone := 0',
  '',
  '.evalLatch:{',
  '  data = 1',
  '  set = AND(.kbd:valid, isEnter, GT(BITSIZE(lineBuf), 0))',
  '}',
  '',
  '.evalLatch:{',
  '  data = 0',
  '  set = .reset',
  '}',
  '',
  '.resetPending:{',
  '  data = 1',
  '  set = .reset',
  '}',
  '',
  '.term:{',
  '  newline = 1',
  '  set = AND(.kbd:valid, isEnter, GT(BITSIZE(lineBuf), 0))',
  '}',
  '',
  '.term:{',
  '  clear = 1',
  '  set = .reset',
  '}',
  '',
  'on:1 {',
  '  AND(.poll:get, .resetPending:get),',
  '  varsLenStore =: 0,',
  '  keysStore = \\0;' + F4C_KEYS_BITS + ',',
  '  valsStore = \\0;' + F4C_VALS_BITS + ',',
  '  lineBuf << clear,',
  '  resetDone = 1',
  '}',
  '',
  '.resetPending:{',
  '  data = 0',
  '  set = resetDone',
  '}',
  '',
  'on:1 {',
  '  resetDone,',
  '  resetDone = 0',
  '}',
  '',
  'on:1 {',
  '  AND(.poll:get, wantEval, GT(BITSIZE(lineBuf), 0)),',
  '  lineSrc =: lineBuf./(BITSIZE(lineBuf)),',
  '  lineTrim = TRIMT(lineSrc, " " ; any),',
  '  prog =: .replLang:packAst(lineTrim, <replLine>, "line"),',
  '  runRepl = 1,',
  '  lineBuf << clear,',
  '  evalDone = 1',
  '}',
  '',
  '.evalLatch:{',
  '  data = 0',
  '  set = evalDone',
  '}',
  '',
  'on:1 {',
  '  evalDone,',
  '  evalDone = 0',
  '}',
  '',
  '.replCalc:{',
  '  ast = prog',
  '  varsLen = varsLenStore',
  '  keysIn = keysStore',
  '  valsIn = valsStore',
  '  varsLenOut >= varsLenStore',
  '  keysOut >= keysStore',
  '  valsOut >= valsStore',
  '  resultOut >= replResult',
  '  isAssignOut >= replIsAssign',
  '  assignNameOut >= replAssignName',
  '  set = runRepl',
  '}',
  '',
  'on:1 {',
  '  AND(.poll:get, runRepl),',
  '  runRepl = 0,',
  '  showResult = 1',
  '}',
  '',
  'on:1 {',
  '  AND(.poll:get, showResult),',
  '  resultText = NUM2T(replResult, digits3; f64),',
  '  showResult = 0,',
  '  showDone = 1',
  '}',
  '',
  '.term:{',
  '  append = resultText',
  '  newline = 1',
  '  set = showDone',
  '}',
  '',
  'on:1 {',
  '  showDone,',
  '  showDone = 0',
  '}',
].join('\n');

const script = F4C_CORE + '\n' + waveTail;

const md = `# Calculator REPL — parser + interpreter E2E

End-to-end **floating-point** REPL: \`inline [parser] .replLang\` → \`comp [interp] .replCalc\` → [terminal.md](terminal.md) output. Variables (\`x=3\`, then \`x+4\`) persist in \`keysStore\` / \`valsStore\` (16 slots, 5-character ASCII names).

**Wave propagation** (\`logts-play wave\`): keyboard echo, Enter evaluation, and **R** reset use **property blocks** + \`comp [osc] .poll\` deferred \`on:1\` steps (same pattern as [network-chat.md](network-chat.md)).

**Suite tests:** **5311–5312** (assign persist), **5313–5314** (precedence), **5315–5316** (power \`^\`), **5317** (keyboard + terminal), **5318** (reset key + variable clear).

---

## Pipeline

| Stage | Piece |
|-------|--------|
| Lex/parse | [inline-parser.md](inline-parser.md) — \`.replLang:packAst(src, <replLine>, "line")\` |
| AST | Semantic schemas \`<replLine>\`, \`<expr>\`, \`CallAdd\`, … |
| Eval | [comp-interp.md](comp-interp.md) — \`.replCalc\` pins \`varsLen\`, vector \`keysIn\` / \`valsIn\` |
| Format | \`NUM2T(replResult, digits3; f64)\` — see [number-conversion.md](number-conversion.md) |
| UI | [keyboard.md](keyboard.md) + [sock.md](sock.md) \`lineBuf\` + [terminal.md](terminal.md) |

**Grammar highlights:** \`+\`, \`-\`, \`*\`, \`/\`, \`^\` (power via interpreter \`^\` → \`Math.pow\`), parentheses, \`-\` unary, assign \`name=expr\`, variables up to 5 letters.

---

## Wave control flow

1. **Type** — \`.term\` echoes printable keys; \`lineBuf << .kbd\` accumulates bytes ([network-chat.md](network-chat.md) input buffer pattern).
2. **Enter** — \`.evalLatch\` property block (not \`on:raise\`) latches \`wantEval\`.
3. **Osc poll** — \`on:1 { AND(.poll:get, wantEval), … packAst … runRepl }\` then \`.replCalc\`, then \`NUM2T\` + terminal append on later poll ticks.
4. **Reset R** — property blocks clear terminal / latch; \`.resetPending\` survives until \`.poll:get\` clears stores (\`resetDone\` defers pending clear so \`on:1\` reset body runs first).

---

## Runnable demo (complete script)

Focus **REPL** keyboard, type \`2+3\`, press **Enter**, see \`5\` on the terminal. **R** clears variables and screen.

\`\`\`logts-play wave
${script}
\`\`\`
`;

fs.writeFileSync(path.join(ROOT, 'doc/calc-parser-interp-e2e.md'), md, 'utf8');
console.log('Wrote doc/calc-parser-interp-e2e.md', script.split('\n').length, 'lines script');
