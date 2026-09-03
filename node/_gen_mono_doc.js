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

Open the script below in the doc viewer → **Load** → **RUN** → use panel keys **1**, **2**, **reset**. With **\`randomSeed: 42\`**, Player 1's first roll is always **4 + 3** → position **7** (**avenue**, buy **180**). Board has **15** squares (indices **0–14**), including **two** community chests (**3**, **10**). After each roll, output names the square (e.g. \`7 avenue\`, \`10 community chest\`, \`12 jail (visiting)\`, \`13 market (owned by you)\`).

---

## Controls

| Key | Label | When |
|-----|-------|------|
| **1** | \`1\` | **\`phase$(waitRoll)\`** — roll + land · **\`phase$(waitChoice)\`** — pass turn (then the other player rolls on the same pulse) |
| **2** | \`2\` | **\`phase$(waitChoice)\`** — buy offered property |
| **reset** | \`reset\` | Any time — **\`initGame()\`** |

Use **\`type: 0\`** on keys (pulse). Logic uses **\`on: 1\`** (level-triggered exec).

---

## Architecture (one logic component)

\`\`\`text
comp [logic] .game  +  inline [logic] .mono
  phase$ / turn$             — waitRoll | resolveLand | waitChoice
  playerPos$$ / playerCash$$ — keyed by p1 | p2
  owns$$ / inJail$$          — ownership / jail flag
  communityDeck/1            — rotating card list (ground commits)

Keys (same pulse order on .key1):
  handlePass*   when waitChoice  → waitRoll + other player
  handleRoll*   when waitRoll    → move, showLandSpot, phase resolveLand
  handleLand*   when resolveLand → tax / rent / community / jail / buy menu
  .key2 → handleBuy*
  .resetGame → handleReset
\`\`\`

| Idea | Detail |
|------|--------|
| **Boot** | **\`welcomeBoot\`** + **\`bootStep\`** one-shot so keys are not blocked at load |
| **Two-pass land** | Roll sets **\`phase$(resolveLand)\`**; named land queries run in the **same** key pulse |
| **Community** | **\`payTax\`** / **\`go200\`** / **\`goToJail\`** with ground deck rotations |
| **Guards** | Each query starts with **\`phase$(…)\`** + **\`turn$(…)\`** |
| **Show** | **\`showLandSpot/1\`** + **\`show/N\`** → run output |

Canonical verify copy: **\`node/doc_verify/mini-monopoly-interactive.logts\`**.

---

## Demo flow (seed 42)

\`\`\`text
[Load]  → Game Reset, current Player 1
[key 1] → Player 1 dice: 4 3 · position 7 avenue · buy menu (180)
[key 1] → pass → Player 2 dice: 6 5 · position 11 plaza · buy menu (220)
[key 2] → Player 2 buys plaza
[key 1] → … later landings may hit community chest (payTax / go200 / goToJail)
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
