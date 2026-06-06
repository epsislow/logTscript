/**
 * Generates test_suite.js (browser) from test_repeat.js — subset only.
 * Run: node _gen_test_suite.js
 *
 * Included: top-level tests that need no Node vm/fs (preprocessor, tokenizer, pure JS).
 * Excluded for later: parser IIFE (90-101), osc parser (134-142, 148-152), registry+ (200+).
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'test_repeat.js');
const OUT = path.join(__dirname, 'test_suite.js');

function isIncluded(id) {
  if (id >= 6 && id <= 89) return true;
  if (id === 492) return true; // Test 49b
  if (id >= 102 && id <= 133) return true;
  if (id >= 143 && id <= 147) return true;
  if (id === 153) return true;
  return false;
}

function testIdFromMatch(num, suffix) {
  const n = parseInt(num, 10);
  if (!suffix) return n;
  return n * 10 + (suffix.charCodeAt(0) - 96);
}

function groupForId(id) {
  const base = id >= 490 && id < 500 ? Math.floor(id / 10) : id;
  if (base >= 6 && base <= 21) return 'repeat';
  if (base >= 22 && base <= 37) return 'gates-reduce';
  if (base >= 40 && base <= 52) return 'shifts';
  if (base >= 53 && base <= 60) return 'bitrange';
  if (base >= 61 && base <= 81) return 'bit-ops';
  if (base >= 82 && base <= 89) return 'wire-init';
  if (base >= 102 && base <= 133) return 'short-notation';
  if (base >= 143 && base <= 147) return 'osc';
  if (base === 153) return 'osc';
  return 'other';
}

const GROUP_META = [
  { id: 'repeat', label: 'Repeat preprocessor', rangeLabel: '6–21' },
  { id: 'gates-reduce', label: 'Logic gate reduce / expand', rangeLabel: '22–37' },
  { id: 'shifts', label: 'LSHIFT / RSHIFT', rangeLabel: '40–52' },
  { id: 'bitrange', label: 'Dynamic bit range', rangeLabel: '53–60' },
  { id: 'bit-ops', label: 'Bit operations', rangeLabel: '61–81' },
  { id: 'wire-init', label: ':= wire initialization (tokenizer)', rangeLabel: '82–89' },
  { id: 'short-notation', label: 'Short notation preprocessor', rangeLabel: '102–133' },
  { id: 'osc', label: 'Oscillator tokenizer', rangeLabel: '143–147, 153' },
];

function removeBlockComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractTestBody(code) {
  code = code.replace(/console\.log\('\\n=== Test [^']+ ==='\);\s*/g, '');
  while (code.startsWith('{') && code.endsWith('}')) {
    code = code.slice(1, -1).trim();
  }
  const leak = code.search(/\n\/\/ ={5,}|\nfunction gate\(|\n\/\/ --- NOT ---/);
  if (leak >= 0) code = code.slice(0, leak).trim();
  code = code.replace(/console\.log\(`  PASS:[^`]*`\);\s*passed\+\+;\s*/g, '');
  code = code.replace(/console\.log\(`  FAIL:[^`]*`\);\s*failed\+\+;\s*/g, '');
  code = code.replace(/try \{\s*([\s\S]*?)\s*\} catch \(e\) \{[\s\S]*?\}/g, '$1');
  return code.trim();
}

function transformCode(code) {
  const reps = [
    [/assert\(/g, 'h.assert('],
    [/assertThrows\(/g, 'h.assertThrows('],
    [/preprocessShortNotation\(/g, 'ctx.preprocessShortNotation('],
    [/tokenize\(/g, 'ctx.tokenize('],
    [/gateReduce\(/g, 'ctx.gateReduce('],
    [/gateExpand\(/g, 'ctx.gateExpand('],
    [/\bgate\(/g, 'ctx.gate('],
    [/lshift\(/g, 'ctx.lshift('],
    [/rshift\(/g, 'ctx.rshift('],
  ];
  for (const [re, to] of reps) code = code.replace(re, to);
  return code;
}

let raw = fs.readFileSync(SRC, 'utf8');
raw = removeBlockComments(raw);
const startIdx = raw.indexOf("console.log('\\n=== Test 6:");
const endIdx = raw.indexOf('// Summary');
let body = raw.slice(startIdx, endIdx);

const headerRe = /console\.log\('\\n=== Test (\d+)([a-z])?: ([^']+) ==='\);\s*/g;
const allHeaders = [];
let m;
while ((m = headerRe.exec(body)) !== null) {
  allHeaders.push({
    id: testIdFromMatch(m[1], m[2]),
    title: m[3],
    start: m.index,
    end: m.index + m[0].length
  });
}

const tests = [];
for (let i = 0; i < allHeaders.length; i++) {
  const h = allHeaders[i];
  if (!isIncluded(h.id)) continue;
  const nextStart = i + 1 < allHeaders.length ? allHeaders[i + 1].start : body.length;
  let code = body.slice(h.end, nextStart);
  code = transformCode(extractTestBody(code));
  if (!code) continue;
  tests.push({ id: h.id, title: h.title, group: groupForId(h.id), code });
}

const testFns = tests.map(t => {
  const escapedTitle = t.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `  reg(${t.id}, '${t.group}', '${escapedTitle}', function(h, ctx) {
${t.code.split('\n').map(l => '    ' + l).join('\n')}
  });`;
}).join('\n\n');

const activeGroups = GROUP_META
  .map(g => {
    const ids = tests.filter(t => t.group === g.id).map(t => t.id);
    if (!ids.length) return null;
    const rangeLabel = ids[0] === ids[ids.length - 1]
      ? String(ids[0])
      : ids[0] + '–' + ids[ids.length - 1];
    return `    { id: '${g.id}', label: '${g.label}', rangeLabel: '${rangeLabel}', testIds: [${ids.join(', ')}] }`;
  })
  .filter(Boolean)
  .join(',\n');

const SUITE_HEADER = `/**
 * LogTScript browser test suite (subset from test_repeat.js).
 * Regenerate: node _gen_test_suite.js
 *
 * Not yet ported: parser (90-101), osc parser (134-142, 148-152), registry (200+),
 * doc, PCB, signal propagation, REG tests — add when ready.
 */
(function () {
  'use strict';

  function gateReduce(name, a, bv) {
    const len = Math.max(a.length, bv !== undefined ? bv.length : 0);
    const ap = a.padStart(len, '0');
    const bp = bv !== undefined ? bv.padStart(len, '0') : '';
    if (name === 'NOT') {
      const notBits = a.split('').map(c => c === '1' ? '0' : '1');
      return notBits.includes('1') ? '1' : '0';
    }
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      const ai = ap[i] === '1', bi = bp[i] === '1';
      let r;
      switch (name) {
        case 'AND':  r = ai && bi; break;
        case 'OR':   r = ai || bi; break;
        case 'XOR':  r = ai !== bi; break;
        case 'NAND': r = !(ai && bi); break;
        case 'NOR':  r = !(ai || bi); break;
      }
      resultBits.push(r ? '1' : '0');
    }
    return resultBits.includes('1') ? '1' : '0';
  }

  function gateExpand(name, a, bv) {
    const len = Math.max(a.length, bv !== undefined ? bv.length : 0);
    const ap = a.padStart(len, '0');
    const bp = bv !== undefined ? bv.padStart(len, '0') : '';
    if (name === 'NOTe') {
      return a.split('').map(c => c === '1' ? '0' : '1').join('');
    }
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      const ai = ap[i] === '1', bi = bp[i] === '1';
      let r;
      switch (name) {
        case 'ANDe':  r = ai && bi; break;
        case 'ORe':   r = ai || bi; break;
        case 'XORe':  r = ai !== bi; break;
        case 'NANDe': r = !(ai && bi); break;
        case 'NORe':  r = !(ai || bi); break;
      }
      resultBits.push(r ? '1' : '0');
    }
    return resultBits.join('');
  }

  function gate(name, a, bv) {
    const applyOp = (ai, bi) => {
      switch (name) {
        case 'AND':  return ai && bi;
        case 'OR':   return ai || bi;
        case 'XOR':  return ai !== bi;
        case 'NXOR': return ai === bi;
        case 'NAND': return !(ai && bi);
        case 'NOR':  return !(ai || bi);
        case 'EQ':   return ai === bi;
      }
    };
    if (name === 'NOT') {
      return a.split('').map(c => c === '1' ? '0' : '1').join('');
    }
    if (bv === undefined) {
      const bits = a.split('');
      let acc = bits[0] === '1';
      for (let i = 1; i < bits.length; i++) {
        acc = applyOp(acc, bits[i] === '1');
      }
      return acc ? '1' : '0';
    }
    const len = Math.max(a.length, bv.length);
    const ap = a.padStart(len, '0');
    const bp = bv.padStart(len, '0');
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      resultBits.push(applyOp(ap[i] === '1', bp[i] === '1') ? '1' : '0');
    }
    return resultBits.join('');
  }

  function lshift(data, n, fill) {
    if (fill === undefined) fill = '0';
    return data + fill.repeat(n);
  }

  function rshift(data, n, fill) {
    if (fill === undefined) fill = '0';
    const len = data.length;
    if (n >= len) return fill.repeat(len);
    return fill.repeat(n) + data.slice(0, len - n);
  }

  function createContext() {
    return {
      preprocessRepeat,
      preprocessShortNotation,
      tokenize(source) {
        const processed = preprocessRepeat(source);
        const t = new Tokenizer(processed);
        const tokens = [];
        let tok;
        while ((tok = t.get()).type !== 'EOF') tokens.push(tok);
        return { processed, tokens };
      },
      gateReduce, gateExpand, gate, lshift, rshift
    };
  }

  const tests = [];
  function reg(id, group, title, run) {
    tests.push({ id, group, title, run });
  }

`;

const SUITE_FOOTER = `
  tests.sort((a, b) => a.id - b.id);

  window.LogTScriptTestSuite = {
    groups: [
${activeGroups}
    ],
    tests,
    createContext
  };
})();
`;

fs.writeFileSync(OUT, SUITE_HEADER + testFns + SUITE_FOOTER, 'utf8');
console.log('Wrote', OUT, 'with', tests.length, 'tests in', activeGroups.split('id:').length - 1, 'groups');
