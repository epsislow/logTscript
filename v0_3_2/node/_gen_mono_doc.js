'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const logts = fs.readFileSync(path.join(ROOT, 'node/doc_verify/mini-monopoly-interactive.logts'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');
const md = `# Mini Monopoly — interactive (keys + \`$\`/\`$$\` state)

Hot-seat **two-player** game: three **\`comp [key]\`** buttons drive one **\`comp [logic] .game\`**. Game state lives in dynamic **\`$\` / \`$$\`** facts ([inline-logic.md — Unique facts](inline-logic.md#unique-facts--and-keyed-facts-)); mutations use **\`commit(…)\`** inside named queries and rules. Builds on [mini-monopoly-logic.md](mini-monopoly-logic.md).

Prerequisites: [key.md](key.md), [comp-logic.md](comp-logic.md), [logic-runtime.md](logic-runtime.md), [inline-logic.md](inline-logic.md).

Open the script below in the doc viewer → **Load** → **RUN** → use panel keys **1**, **2**, **reset**. With **\`randomSeed: 42\`**, Player 1's first roll is always **4 + 3** → position **7** (**short**, buy **160**).

---

## Controls

| Key | Label | When |
|-----|-------|------|
| **1** | \`1\` | **\`phase$(waitRoll)\`** — roll + land · **\`phase$(waitChoice)\`** — pass turn |
| **2** | \`2\` | **\`phase$(waitChoice)\`** — buy offered property |
| **reset** | \`reset\` | Any time — **\`initGame()\`** |

Use **\`type: 0\`** on keys (pulse). Logic uses **\`on: 1\`** (level-triggered exec).

---

## Architecture (one logic component)

\`\`\`text
comp [logic] .game  +  inline [logic] .mono
  phase$ / turn$             — single-valued phase and active player
  playerPos$$ / playerCash$$ — keyed by p1 | p2
  owns$$                     — keyed by square index
  communityDeck/1            — list fact (deck)

Keys (separate exec blocks; guards inside queries):
  .key1 → handlePassP1|P2  when phase$(waitChoice)
  .key1 → handleRollP1|P2  when phase$(waitRoll)
  .key2 → handleBuyP1|P2   when phase$(waitChoice)
  .resetGame → handleReset
\`\`\`

| Idea | Detail |
|------|--------|
| **Boot** | **\`welcomeBoot\`** + **\`bootStep\`** one-shot so keys are not blocked at load |
| **Land vs buy** | **\`smart_or(landAfterRollP*(), buyLandP*())\`** |
| **Guards** | Each query starts with **\`phase$(…)\`** + **\`turn$(…)\`** |
| **Show** | **\`show/N\`** in queries and rules → run output |

Canonical verify copy: **\`node/doc_verify/mini-monopoly-interactive.logts\`**.

---

## Demo flow (seed 42)

\`\`\`text
[Load]  → Game Reset, current Player 1
[key 1] → Player 1 dice: 4 3 · position 7 · buy menu (short / 160)
[key 1] → pass → Player 2 roll · position 7 · buy menu
[key 2] → Player 2 buys short
[key 1] → Player 1 roll …
\`\`\`

---

## Full script

\`\`\`logts-play
${logts}
\`\`\`

**Load & Run**, then pulse keys. Extra checks: \`node _verify_doc_examples.js mini-monopoly-interactive\`.

---
`;
fs.writeFileSync(path.join(ROOT, 'doc/mini-monopoly-interactive.md'), md, 'utf8');
console.log('written', md.length, 'bytes');
