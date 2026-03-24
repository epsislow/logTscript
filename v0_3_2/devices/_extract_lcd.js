const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '..', '..', 'v0_3_1', 'lib', 'main.js');
const destFile = path.join(__dirname, 'character-lcd.js');

const lines = fs.readFileSync(srcFile, 'utf8').split('\n');

// Lines 13256-14125 (1-indexed) => array indices 13255-14124
const startLine = 13255;
const endLine = 14125;

const extracted = lines.slice(startLine, endLine);

const header = '/* ================= CHARACTER LCD ================= */\n\n';
const content = header + extracted.join('\n') + '\n';

fs.writeFileSync(destFile, content, 'utf8');

console.log('Total lines:', extracted.length);
console.log('First line:', extracted[0].trim().substring(0, 60));
console.log('Last extracted line:', extracted[extracted.length - 1].trim().substring(0, 60));
