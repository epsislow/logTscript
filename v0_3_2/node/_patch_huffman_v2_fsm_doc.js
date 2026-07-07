'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./js/paths');
const { execSync } = require('child_process');

const mdPath = path.join(ROOT, 'doc', 'huffman-v2.md');
const md = fs.readFileSync(mdPath, 'utf8');
const snippet = execSync('node node/_gen_huff_fsm_doc.js', { cwd: ROOT, encoding: 'utf8' });

const start = '## FSM v2.1 — scan + merge (`huffFsmScript`)';
const end = '## Gap analysis (N-general)';
const i0 = md.indexOf(start);
const i1 = md.indexOf(end);
if (i0 < 0 || i1 < 0 || i1 <= i0) throw new Error('FSM section markers not found');

const section = `${start}

Generator: \`tests/test_suite.js\` (\`huffFsmRoundTripScript\`) · Node mirror: \`node/huff_fsm_script.js\` · regenerate doc block: \`node node/_gen_huff_fsm_doc.js\`.

One **switch** tick = scan byte step, one merge round, or \`.huff\` commit. Phases:

| Phase | \`ph\` | Behaviour |
|-------|------|-----------|
| SCAN | \`0000\` | \`.idx\` + \`on:raise\` freq \`:set\`; at \`srcLen\` → heap load + \`ph=MERGE\` |
| MERGE | \`0010\` | Parametric merge (\`nSym − 1\` rounds, literal parent keys) |
| DONE | \`0101\` | \`root = nid\`; \`on:raise\` \`.huff:add\` → packet/recover (no declarative walk) |

**Script size (\`'aacb'\`, 3 symbols):** ~**120 lines**. Merge-only FSM ~**95 lines** (\`huffFsmScript\`).

### Runnable — FSM wave round-trip (\`'aacb'\`)

Open [huffman-v2.md](huffman-v2.md) in the **doc viewer**, then **Load** or **Load & Run** on the block below.

**How to run:** **Load & Run**, then click **tick** on the switch until **Output** shows \`ph = 0101\`, \`huffSz = 00000011\`, \`huffReady = 1\`, and \`recovered\` = \`"aacb"\` (~**8–10** clicks).

| Output | Expected |
|--------|----------|
| \`source\` | \`"aacb"\` |
| \`_hc0\` / \`_hc1\` / \`_hc2\` | \`10\` / \`11\` / \`0\` (symbols \`b\` / \`c\` / \`a\`) |
| \`ph\` | \`0101\` when merge + huff commit done |
| \`root\` | \`11111111\` |
| \`recovered\` | same as \`source\` |

${snippet.trim()}

**Tests:** **2115** (merge+links), **2116** (walk via \`execStmts\`), **2117** (\`execStmts\` round-trip), **2118** (in-script round-trip, no \`execStmts\`).

**Backlog (S1):** single merge block with reused \`mk/mf\` (\`engine-on-reassign\`); hop-by-hop walk FSM without static \`huffWalkEmit\`.

---

`;

fs.writeFileSync(mdPath, md.slice(0, i0) + section + md.slice(i1));
console.log('Patched', mdPath);
