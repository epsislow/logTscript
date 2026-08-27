'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const logts = fs.readFileSync(path.join(ROOT, 'node/doc_verify/mini-monopoly-interactive.logts'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');
const md = fs.readFileSync(path.join(ROOT, 'doc/mini-monopoly-interactive.md'), 'utf8');
const newMd = md.replace(/```logts-play\r?\n[\s\S]*?```/, '```logts-play\n' + logts + '\n```');
fs.writeFileSync(path.join(ROOT, 'doc/mini-monopoly-interactive.md'), newMd, 'utf8');
console.log('doc synced');
