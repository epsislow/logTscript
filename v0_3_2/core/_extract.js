const fs = require('fs');
const src = fs.readFileSync('c:/work/backup/wwwlogic/library/logTscript/v0_3_1/lib/main.js', 'utf8');
const lines = src.split('\n');
const extracted = lines.slice(2826, 10855);
const dispatch = [
  '',
  'Interpreter.EXEC_DISPATCH = {',
  "  show: '_execShow',",
  "  mode: '_execMode',",
  "  comp: '_execComp',",
  "  pcbInstance: '_execPcbInstance',",
  "  componentPropertyBlock: '_execPropertyBlock',",
  "  next: '_execNext',",
  "  test: '_execTest',",
  "  assignment: '_execAssignment',",
  '};',
];
const all = extracted.concat(dispatch);
fs.writeFileSync('c:/work/backup/wwwlogic/library/logTscript/v0_3_2/core/interpreter.js', all.join('\n'), 'utf8');
console.log('Total lines: ' + all.length);
console.log('First line: ' + all[0]);
console.log('Last extracted line: ' + all[extracted.length - 1]);
