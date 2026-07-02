/**
 * AUTO-GENERATED — do not edit.
 * Regenerate: node node/_gen_doc_data.js
 * Files: 14seg.md, adder.md, alu.md, arithmetic.md, asm-composition.md, asm.md, assignment-operators.md, board.md, boolean-analysis.md, boolean-lut.md, builtin-ABS.md, builtin-ADD.md, builtin-ARGMAX.md, builtin-ARGMIN.md, builtin-bit-analysis-functions.md, builtin-bit-selection-functions.md, builtin-bit-transform-functions.md, builtin-CLAMP.md, builtin-DIAG.md, builtin-DIVIDE.md, builtin-DOT.md, builtin-EQ.md, builtin-FILL.md, builtin-FLIPLR.md, builtin-FLIPUD.md, builtin-functions.md, builtin-GT.md, builtin-IDENTITY.md, builtin-IOTA.md, builtin-L2.md, builtin-logic-gate-functions.md, builtin-LROTATE.md, builtin-LSHIFT.md, builtin-LT.md, builtin-MAC.md, builtin-MAX.md, builtin-MCAT.md, builtin-MIN.md, builtin-MSLICE.md, builtin-MULTIPLY.md, builtin-NFORMAT.md, builtin-NORM.md, builtin-OUTER.md, builtin-RANK.md, builtin-REPEAT.md, builtin-REVERSE.md, builtin-routing-functions.md, builtin-RROTATE.md, builtin-RSHIFT.md, builtin-sequential-functions.md, builtin-SHAPE.md, builtin-SUBTRACT.md, builtin-SUM.md, builtin-tagged-index.md, builtin-TRACE.md, builtin-TRIL.md, builtin-TRIU.md, builtin-ZEROS.md, chip.md, clcd-symbols.md, clcd.md, components.md, counter.md, debug.md, dip.md, divider.md, doc-function.md, doc-viewer.md, dots.md, editorUI.md, future-component-ideas.md, huffman.md, interactive-components.md, ioport.md, key.md, keyboard.md, lcd.md, led-bar.md, led.md, loop.md, lut.md, matrix-reduction.md, mem.md, meta-constants.md, mini-cpu-plan.md, mini-cpu-v2.md, mini-cpu.md, modes.md, multiplier.md, network-traffic-panel.md, network.md, number-conversion.md, oscillator.md, pcb.md, pocket-calc.md, protocol.md, queue.md, reg.md, rotary.md, seven-seg.md, shifter.md, short-notation.md, signal-propagation.md, slider.md, stack.md, subtract.md, switch.md, terminal.md, user-functions.md, vector-reduction.md, wire-literals.md, wire-vectors.md, zstate.md
 */
(function () {
  'use strict';
  window.DOC_CONTENT = {
    '14seg.md': `# 14-segment display (\`14seg\`)

\`comp [14seg]\` (shortname \`comp [14]\`) renders an **alphanumeric 14-segment display** (15 bits including decimal point).

Signature: \`doc(comp.14seg)\` or \`doc(comp.14)\`.

---

## Syntax

\`\`\`
comp [14seg] .name:
  text: 'Char'
  color: ^f00
  bgColor: ^111
  scale: 2
  nl
  :
\`\`\`

---

## Driving modes

| Pin | Width | Effect |
|-----|-------|--------|
| \`hex\` | 4 | Hex digit 0–F |
| \`chr\` | 8 | ASCII character code |
| \`data\` | 15 | Full segment pattern |
| \`a\`…\`dp\` | 1 each | Individual segments (see \`doc(comp.14)\`) |
| \`set\` | 1 | Enable property block |
| \`get\` | 15 | Read back pattern |

Direct assignment \`= 15bit\` sets initial segments.

---

## Example — character

\`\`\`logts-play
comp [14seg] .disp:
  color: ^0f0
  scale: 2
  nl
  on: 1
  :

.disp:{
  chr = 01000001
  set = 1
}
\`\`\`

Shows **A** (ASCII 65).

---

## Notes

- Segment names include \`g1\`, \`g2\` for the two center bars.
- Not allowed in [chip.md](chip.md) bodies.
- Related: [seven-seg.md](seven-seg.md), [lcd.md](lcd.md), [lut.md](lut.md#display-decode--hex-0f) (hex 0–F via LUT).
`,
    'adder.md': `# Adder component

\`comp [adder]\` (shortname \`comp [+]\`) performs **N-bit binary addition** with carry. Unlike the \`ADD()\` built-in, the adder is a persistent device with pins you wire in property blocks — ideal inside [pcb.md](pcb.md) and [chip.md](chip.md).

Instant one-off math: [arithmetic.md](arithmetic.md). Signature: \`doc(comp.adder)\` or \`doc(comp.+)\`.

---

## Syntax

\`\`\`
comp [adder] .name:
  depth: 4
  on: 1
  :
\`\`\`

Minimal (\`depth\` defaults to 4):

\`\`\`
comp [adder] .name::
\`\`\`

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Enable — when \`on:\` condition holds, \`a\` and \`b\` are sampled |
| \`a\`, \`b\` | \`depth\` | Operands |
| \`get\` | \`depth\` | Sum \`(a + b) mod 2^depth\` |
| \`carry\` | 1 | \`1\` if sum overflows \`depth\` bits |

Direct assignment \`= Xbit\` sets initial stored operands where supported.

---

## Property block example

\`\`\`logts-play
comp [adder] .add:
  depth: 4
  on: 1
  :

4wire a = 1111
4wire b = 0001

.add:{
  a = a
  b = b
  set = 1
}

4wire sum = .add:get
1wire cy = .add:carry
show(sum, cy)
\`\`\`

\`sum = 0000\`, \`cy = 1\`.

---

## Chip usage

\`\`\`
chip +[halfAdd]:
  ...
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
\`\`\`

Probe: \`probe(.add:get)\`, \`probe(.u1:sum)\` from outside — [debug.md](debug.md).

---

## Related

- [subtract.md](subtract.md) — subtraction with borrow on \`carry\`
- [components.md](components.md) — full index
`,
    'alu.md': `# ALU component (\`alu\`)

\`comp [alu]\` is a **configurable arithmetic-logic unit** — operands \`a\`/\`b\`, opcode selector \`op\`, outputs \`result\` (alias \`:get\`) plus \`carry\` and \`zero\`. Optional \`extraOp\` and \`extraFlags\` extend the datapath without extra chips.

Signature: \`doc(comp.alu)\`.

---

## Syntax

### Minimal (replaces mini-CPU \`chip +[alu4]\`)

\`\`\`logts
comp [alu] .alu:
  length: 4
  on: 1
  :

.alu:{ a = curacc
  b = opd
  op = aluop
  set = 1 }
4wire aluy = .alu:result
1wire alucarry = .alu:carry
\`\`\`

### Extended

\`\`\`logts
comp [alu] .alu:
  length: 8
  extraOp: XOR, LSHIFT, MUL, DIV
  extraFlags: overflow, less, equal
  on: 1
  :
\`\`\`

### Custom opcode via LUT

\`\`\`logts
comp [lut] .aluFn:
  length: 32
  depth: 1
  = data {
    10001 : 1
  }
  :

comp [alu] .alu:
  length: 1
  extraOp: CUSTOM
  lut = .aluFn
  on: 1
  :
\`\`\`

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| \`length\` | integer | \`4\` | Bit width of \`a\`, \`b\`, \`result\` |
| \`on\` | \`0\`/\`1\`/\`raise\`/\`edge\` | \`0\` | Level trigger for property block (like adder) |
| \`extraOp\` | ID list | — | Extra opcodes after ADD/SUB/AND/OR |
| \`extraFlags\` | ID list | — | Extra 1-bit flag outputs |
| \`lut\` | \`.component\` | — | Optional \`comp [lut]\` for custom \`extraOp\` names (\`lut = .ref\`) |

List syntax:

\`\`\`
extraOp: XOR, MUL, DIV
extraFlags: overflow, less, equal
\`\`\`

---

## Standard opcodes (\`op\` pin)

| \`op\` | Operation | \`carry\` | \`zero\` |
|------|-----------|---------|--------|
| \`00\` | ADD | carry out | \`result == 0\` |
| \`01\` | SUB | borrow | \`result == 0\` |
| \`10\` | AND | \`0\` | \`result == 0\` |
| \`11\` | OR | \`0\` | \`result == 0\` |

Without \`extraOp\`, \`op\` is **2 bits** (compatible with mini-CPU \`aluop\`).

With \`extraOp\`, \`op\` width grows: \`op = 4\` → first extra op, \`op = 5\` → second, etc.

---

## \`extraOp\` catalog

| Name | Semantics | Extra pout |
|------|-----------|------------|
| \`XOR\` | \`a XOR b\` | — |
| \`NOT\` | \`NOT a\` (\`b\` ignored) | — |
| \`PASS\` | \`result = a\` | — |
| \`CMP\` | \`a - b\` (like SUB) | sets \`less\` / \`equal\` when declared |
| \`LSHIFT\` | logical left shift by \`b\` | — |
| \`RSHIFT\` | logical right shift | — |
| \`ASHR\` | arithmetic right shift (fill MSB) | — |
| \`MUL\` | unsigned \`a×b\` low bits | **\`:over\`** (high bits) |
| \`DIV\` | unsigned \`⌊a/b⌋\` | **\`:mod\`** (remainder) |

**No \`MOD\` opcode** — use \`DIV\` + \`:mod\`.

Divide by zero: quotient and remainder are \`0\` (same as \`comp [divider]\`).

---

## \`extraFlags\`

| Flag | Meaning |
|------|---------|
| \`overflow\` | signed overflow on ADD/SUB |
| \`less\` | \`a < b\` (unsigned) |
| \`equal\` | \`a == b\` |
| \`negative\` / \`sign\` | MSB of \`result\` |
| \`borrow\` | alias for SUB borrow on \`carry\` |

---

## Pins and outputs

**Inputs:** \`set\` (1), \`a\` (\`length\`), \`b\` (\`length\`), \`op\` (2+ bits).

**Outputs (always):** \`result\` / \`:get\`, \`carry\`, \`zero\`.

**Auto from \`extraOp\`:** \`:over\` (MUL), \`:mod\` (DIV).

**From \`extraFlags\`:** one 1-bit pin per declared flag.

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the \`logts-play\` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Use this to inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script **and** runs it immediately. The **ALU** panel appears in the **Devices** area (\`op\`, \`a\`, \`b\`, \`result\`, carry/zero LEDs). |

For static examples (fixed operands and \`op\`), **Load & Run** is enough — check the **Output** panel for \`peek\` lines and the ALU widget for the last operation.

For the **interactive operand** example at the end, use **Load & Run**, then flip the **DIP** switches; re-run or step wires to see \`result\` and flags update.

---

## Debug

\`\`\`logts
show(.alu:result)
peek(.alu:result)
peek(.alu:carry)
peek(.alu:zero)
probe(.alu:result)
\`\`\`

\`:result\` and \`:get\` are equivalent on \`comp [alu]\`.

---

## Examples

### ADD with carry and zero (\`op = 00\`)

**Load & Run** — \`1111 + 0001\` wraps to \`0000\`, carry \`1\`, zero \`1\`.

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  on: 1
  :

.alu:{ a = 1111
  b = 0001
  op = 00
  set = 1 }
peek(.alu:result)
peek(.alu:carry)
peek(.alu:zero)
\`\`\`

### SUB borrow (\`op = 01\`)

**Load & Run** — \`0000 - 0001\` → \`1111\`, borrow on \`carry\`.

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  on: 1
  :

.alu:{ a = 0000
  b = 0001
  op = 01
  set = 1 }
peek(.alu:result)
peek(.alu:carry)
\`\`\`

### AND and OR (\`op = 10\` / \`11\`)

**Load & Run** — same operands \`1100\` and \`1010\`; first block AND, then OR.

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  on: 1
  :

.alu:{ a = 1100
  b = 1010
  op = 10
  set = 1 }
peek(.alu:result)

.alu:{ op = 11
  set = 1 }
peek(.alu:result)
\`\`\`

### Mini-CPU style datapath

**Load & Run** — \`acc + opd\` with \`aluop = 00\` (ADD); result \`1000\` (\`0101 + 0011\`).

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  on: 1
  :

2wire aluop = 00
4wire acc = 0101
4wire opd = 0011

.alu:{ a = acc
  b = opd
  op = aluop
  set = 1 }
4wire aluy = .alu:result
1wire alucarry = .alu:carry
peek(aluy)
peek(alucarry)
\`\`\`

### \`extraOp: XOR\` (\`op = 100\`)

**Load & Run** — \`1010 XOR 0110\` → \`1100\` (first extra opcode, 3-bit \`op\`).

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  extraOp: XOR
  on: 1
  :

.alu:{ a = 1010
  b = 0110
  op = 100
  set = 1 }
peek(.alu:result)
\`\`\`

### \`extraOp: CMP\` with \`less\` / \`equal\`

**Load & Run** — compare \`0100\` vs \`0101\`: \`less = 1\`, \`equal = 0\`.

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  extraOp: CMP
  extraFlags: less, equal
  on: 1
  :

.alu:{ a = 0100
  b = 0101
  op = 100
  set = 1 }
peek(.alu:result)
peek(.alu:less)
peek(.alu:equal)
\`\`\`

### MUL and DIV (\`extraOp: MUL, DIV\`)

**Load & Run** — \`1101 × 0011\` (low \`0111\`, high \`0010\`), then same operands with DIV (\`0100\`, mod \`0001\`).

\`\`\`logts-play
comp [alu] .alu:
  length: 4
  extraOp: MUL, DIV
  on: 1
  :

.alu:{ a = 1101
  b = 0011
  op = 100
  set = 1 }
peek(.alu:result)
peek(.alu:over)

.alu:{ op = 101
  set = 1 }
peek(.alu:result)
peek(.alu:mod)
\`\`\`

### Arithmetic shift right vs logical (\`ASHR\` / \`RSHIFT\`)

**Load & Run** — \`10000000\` shifted right by \`1\`; RSHIFT → \`01000000\`, ASHR → \`11000000\`.

\`\`\`logts-play
comp [alu] .alu:
  length: 8
  extraOp: RSHIFT, ASHR
  on: 1
  :

.alu:{ a = 10000000
  b = 00000001
  op = 100
  set = 1 }
peek(.alu:result)

.alu:{ op = 101
  set = 1 }
peek(.alu:result)
\`\`\`

### Signed overflow flag (\`extraFlags: overflow\`)

**Load & Run** — \`01111111 + 00000001\` on 8 bits sets \`overflow = 1\`.

\`\`\`logts-play
comp [alu] .alu:
  length: 8
  extraFlags: overflow
  on: 1
  :

.alu:{ a = 01111111
  b = 00000001
  op = 00
  set = 1 }
peek(.alu:result)
peek(.alu:overflow)
\`\`\`

### Custom opcode via LUT

**Load & Run** — \`extraOp: CUSTOM\` reads a 1-bit truth table from \`comp [lut]\` (\`lut = .fn\`).

\`\`\`logts-play
comp [lut] .fn:
  length: 32
  depth: 1
  = data {
    10001 : 1
  }
  :

comp [alu] .alu:
  length: 1
  extraOp: CUSTOM
  lut = .fn
  on: 1
  :

.alu:{ a = 0
  b = 1
  op = 100
  set = 1 }
peek(.alu:result)
\`\`\`

### Interactive operands (DIP + ALU)

**Load** to edit widths; **Load & Run** to open the panels, then change the **A** and **B** DIP switches and press **RUN** again (or wire-drive) to try other ADD/SUB/AND/OR combinations with \`op\` on the **Op** DIP.

\`\`\`logts-play
comp [dip] .op:
  length: 2
  text: 'Op'
  visual: 1
  = 00
  :

comp [dip] .a:
  length: 4
  text: 'A'
  visual: 1
  = 1100
  :

comp [dip] .b:
  length: 4
  text: 'B'
  visual: 1
  = 1010
  :

comp [alu] .alu:
  length: 4
  on: 1
  :

2wire aluop = .op:get
4wire aval = .a:get
4wire bval = .b:get

.alu:{ a = aval
  b = bval
  op = aluop
  set = 1 }
peek(.alu:result)
peek(.alu:carry)
peek(.alu:zero)
\`\`\`

---

## See also

- [components.md](components.md) — component index
- [mini-cpu-v2.md](mini-cpu-v2.md) — CPU demo (can use \`comp [alu]\` instead of \`chip +[alu4]\`)
- [adder](doc-function.md) / \`ADD\` built-in — same arithmetic semantics
`,
    'arithmetic.md': `# Arithmetic Built-in Functions

LogTscript provides built-in arithmetic functions that compute results **instantly**. Core four-ops return **two values** (result + carry/overflow/mod); \`MAC\` also returns two (\`result\` + \`over\`).

Per-function reference (signatures, examples, tags): **[builtin-tagged-index.md](builtin-tagged-index.md)**.

\`\`\`
ADD(Xbit a, Xbit b)      -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
DIVIDE(Xbit a, Xbit b)   -> Xbit result, Xbit mod
MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
\`\`\`

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| ADD | [builtin-ADD.md](builtin-ADD.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| SUBTRACT | [builtin-SUBTRACT.md](builtin-SUBTRACT.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| MULTIPLY | [builtin-MULTIPLY.md](builtin-MULTIPLY.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| DIVIDE | [builtin-DIVIDE.md](builtin-DIVIDE.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| MAC | [builtin-MAC.md](builtin-MAC.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| ABS | [builtin-ABS.md](builtin-ABS.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\` (required) |
| GT | [builtin-GT.md](builtin-GT.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| LT | [builtin-LT.md](builtin-LT.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| MIN | [builtin-MIN.md](builtin-MIN.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| MAX | [builtin-MAX.md](builtin-MAX.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |
| CLAMP | [builtin-CLAMP.md](builtin-CLAMP.md) | \`signed\`, \`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`, \`vector\`, \`matrix\` |

Vector reduction (\`SUM\`, \`DOT\`, \`ARGMAX\`, \`ARGMIN\`): [vector-reduction.md](vector-reduction.md). **2D element-wise:** [matrix-reduction.md](matrix-reduction.md). Bitwise equality: [builtin-EQ.md](builtin-EQ.md).

---

## Syntax

Since the core four-ops and \`MAC\` return **two values**, assign both:

\`\`\`
Nwire result, 1wire carry = ADD(a, b)
Nwire result, 1wire carry = SUBTRACT(a, b)
Nwire result, Nwire over  = MULTIPLY(a, b)
Nwire result, Nwire mod   = DIVIDE(a, b)
Nwire result, (N+1)wire over = MAC(acc, a, b)
\`\`\`

Bit width \`N\` = \`max(len(a), len(b))\` for binary ops; short inputs are zero-padded on the left.

---

## Tag overview {#tag-overview}

Optional tags after \`;\` in the call: **\`signed\`**, **\`q4p4\`**, **\`q8p8\`**, **\`fp16\`**, **\`bf16\`** (mutually exclusive numeric formats), plus **\`vector\`**, **\`matrix\`** (not together). See [builtin-tagged-index.md](builtin-tagged-index.md).

### Parametric format tags (\`sX\`, \`qXpY\`) {#parametric-formats}

Beyond the fixed aliases above, built-ins accept **parametric** tags (mutually exclusive with each other and with \`signed\`):

| Pattern | Meaning | Operand width |
|---------|---------|---------------|
| **\`sX\`** | Signed two's complement, exactly **X** bits (1≤X≤64) | wire = **X** bit |
| **\`qXpY\`** | Signed fixed-point **Q{X}.{Y}** (X+Y≤64) | wire = **(X+Y)** bit |

Examples: \`ADD(a, b; q6p2)\` on **8wire**, \`ADD(x, y; s32)\` on **32wire**, \`q0p8\` for fractional values in (−1…+1), \`q8p0\` for integers (same bits as \`s8\`, distinct display suffix). **\`fp16\`** / **\`bf16\`** remain fixed at 16 bits only — no \`fpX\`/\`bfX\`.

\`\`\`logts-play
8wire a = \\1.5;q6p2
8wire b = \\0.5;q6p2
8wire s, 4wire st = ADD(a, b; q6p2)
show(s; q6p2)
show(st)
\`\`\`

\`MULTIPLY\` / \`MAC\` / \`DOT\` / \`SUM\` with \`qXpY\`: overflow wire **\`over\`** is **2×W** bits (W = X+Y), plus **\`4bit status\`**.

### Status register (\`4bit\`) {#status-4bit}

Built-in-uri cu tag de format (\`q4p4\`, \`q8p8\`, \`qXpY\`, \`sX\`, \`fp16\`, \`bf16\`) returnează **\`4bit status\`** în loc de \`1bit\` overflow/inexact. Tag-ul bare **\`signed\`** (adaptiv) păstrează **\`1bit overflow\`**.

Layout MSB-first (bit0 = cel mai din stânga, ca \`bitRange\`):

| Bit | Semnificație |
|-----|--------------|
| bit0 | overflow |
| bit1 | underflow |
| bit2 | inexact |
| bit3 | nan |

Exemplu: \`1000\` = doar overflow. Fixed-point: bit0 + bit2 (rotunjire); float: toți cei 4 biți relevanți.

| Returnuri | Built-in |
|-----------|----------|
| \`result\`, \`4bit status\` | ADD, SUBTRACT, ABS |
| \`result\`, \`over\`, \`4bit status\` | MULTIPLY, MAC, DOT, SUM |
| \`result\`, \`mod\`, \`4bit status\` | DIVIDE |

### \`NFORMAT\` — format conversion

\`\`\`
NFORMAT(a ; <src> to_<dst>) -> result, 4bit status
NFORMAT(tensor ; <src> to_<dst> vector) -> Wdst·wire[n] result, 4wire[n] status
NFORMAT(tensor ; <src> to_<dst> matrix) -> Wdst·wire[n,m] result, 4wire[n,m] status
\`\`\`

| Tag pair | Result width |
|----------|--------------|
| \`; signed to_q4p4\` | 8 |
| \`; signed to_q8p8\` / \`to_fp16\` / \`to_bf16\` | 16 |
| \`; q4p4 to_signed\` | 8 (operand width) |
| \`; q4p4 to_q8p8\` / \`to_fp16\` / \`to_bf16\` | 16 |
| \`; q8p8\` / \`fp16\` / \`bf16\` ↔ other formats | per destination tag |

\`src\` and \`dst\` must differ. Scalar, \`; vector\`, or \`; matrix\` (mutually exclusive). See [builtin-NFORMAT.md](builtin-NFORMAT.md).

\`\`\`logts-play
8wire[2] v = 01110000 + 11110000
16wire[2] r, 4wire[2] st = NFORMAT(v; q4p4 to_fp16 vector)
show(st)
\`\`\`

| Built-in | \`; q4p4\` (8-bit) | \`; q8p8\` / \`; fp16\` / \`; bf16\` (16-bit) |
|----------|------------------|----------------------------------------|
| ADD / SUBTRACT | fixed-point + **4bit status** | fixed / float + **4bit status** |
| MULTIPLY / DIVIDE / MAC | fixed ops + over/mod + **status** | fixed / float ops + **status** |
| SUM | fixed sum + over + **status** | fixed / float sum + over + **status** |
| MIN / MAX | fixed compare | fixed / float compare |
| GT / LT | fixed compare → \`1bit\` | fixed / float compare |
| CLAMP | fixed bounds | fixed / float bounds |
| ABS | fixed \`|x|\` + overflow | fixed / float \`|x|\` |
| DOT | rank-1 dot + \`over\` | rank-1 dot + flag |
| ARGMAX / ARGMIN | rank-1 \`; q4p4\` compare | — |
| RSHIFT | ASHR on 8-bit | ASHR on 16-bit (\`q8p8\` only) |

Optional **bool tags** after \`;\` in the call (\`signed\`, \`vector\`, \`matrix\`, or combinations except **\`vector\` + \`matrix\`**). Operand expansion vs element-wise mode: [vector-reduction.md](vector-reduction.md#element-wise-mode-vector), [matrix-reduction.md](matrix-reduction.md).

| Built-in | Unsigned (default) | \`; signed\` | \`; vector\` | \`; matrix\` |
|----------|-------------------|------------|------------|------------|
| ADD | result + **carry** | result + **overflow** | \`Wbit[n]\` per index | \`Wbit[N,M]\` per cell |
| SUBTRACT | result + **carry** (borrow) | result + **overflow** | \`Wbit[n]\` per index | \`Wbit[N,M]\` per cell |
| MULTIPLY | low/high product split | signed product | \`Wbit[n]\` per index | \`Wbit[N,M]\` per cell |
| DIVIDE | quotient + mod | signed \`/\` \`%\` | \`Wbit[n]\` per index | \`Wbit[N,M]\` per cell |
| MAC | \`acc + a×b\` | signed accumulate | \`Wbit[n]\`, \`(W+1)bit[n]\` | \`Wbit[N,M]\` per cell |
| GT / LT | unsigned order | signed order | \`1wire[n]\` | \`1wire[N×M]\` |
| MIN / MAX | unsigned min/max | signed | \`Wbit[n]\` | \`Wbit[N,M]\` |
| CLAMP | unsigned bounds | signed bounds | \`Wbit[n]\` | \`Wbit[N,M]\` |
| ABS | — | **\`|x|\`** + **overflow** on \`INT_MIN\` | — | — |
| SUM / DOT | see [vector-reduction](vector-reduction.md) | signed | SUM only | SUM only |

\`LSHIFT\`, rotates, and \`REVERSE\` do **not** support \`; signed\`. \`RSHIFT\` with \`; signed\` is **ASHR** — [builtin-RSHIFT.md](builtin-RSHIFT.md).

**Result bits** for \`ADD\` / \`SUBTRACT\` are identical with or without \`; signed\`; only the second return changes meaning.

\`\`\`logts-play
4wire acc = 0111
4wire delta = 0001
4wire nextU, 1wire carry = ADD(acc, delta)
4wire nextS, 1wire ovf = ADD(acc, delta; signed)
show(nextU)
show(carry)
show(nextS)
show(ovf)
\`\`\`

\`7 + 1\` on 4 bits: \`result = 1000\`, unsigned carry \`0\`, signed overflow \`1\`.

---

## Comparison with component equivalents

| Built-in | Component | Difference |
|----------|-----------|------------|
| \`ADD(a, b)\` | \`comp [adder]\` | No declaration, instant result |
| \`SUBTRACT(a, b)\` | \`comp [subtract]\` | No declaration, instant result |
| \`MULTIPLY(a, b)\` | \`comp [multiplier]\` | No declaration, instant result |
| \`DIVIDE(a, b)\` | \`comp [divider]\` | No declaration, instant result |

Use **built-ins** for one-off calculations; use **components** for named devices with pins (e.g. in a PCB).

Digit packing: [number-conversion.md](number-conversion.md).

---

## doc() support

\`\`\`
doc(ADD)
doc(SUBTRACT)
doc(MULTIPLY)
doc(DIVIDE)
doc(MAC)
doc(GT)
doc(LT)
doc(MIN)
doc(MAX)
doc(CLAMP)
doc(SUM)
doc(DOT)
\`\`\`

Live signatures come from \`Interpreter.BUILTIN_DOC\`. List all: \`doc(def)\`.
`,
    'asm-composition.md': `# ASM composition (v2)

Extend inline ASM programs with **composition directives** inside \`{ }\`: reuse other assembled wires with \`use\`, pad with \`repeat\` / \`align\`, set a logical load address with \`base:\`, and branch to labels defined in another module with \`label>\`.

This is **not a linker** — it runs at assemble time in the interpreter. The result is still a single binary blob (and metadata) suitable for \`comp [mem]\` or wire assignment.

\`show(wire)\` still prints **bits only**. Use \`show(.isa:decode(wire))\` for disassembly.

---

## Directives

| Directive | Example | Effect |
|-----------|---------|--------|
| \`repeat N { … }\` | \`repeat 8 { NOP }\` | Expands the block \`N\` times |
| \`align N { … }\` | \`align 16 { NOP }\` | Inserts whole copies of the block until the next instruction would start at a multiple of \`N\` |
| \`base: value\` | \`base: 128\` | Sets the **logical** address for labels and absolute \`A\` fields in this unit |
| \`use name\` | \`use boot\` | Splices the referenced wire's program at the current position |
| \`use name:\` + \`base:\` | see below | Splices the module after relocating it to the given base |

### \`base:\` values

| Form | Example |
|------|---------|
| Decimal literal | \`base: \\128\` |
| Wire symbol | \`base: BOOT_BASE\` (wire must hold a numeric value) |
| LUT label | \`base: .memoryMap:boot\` |

Expressions such as \`base: X + 256\` are **rejected**.

When a module is inserted with plain \`use boot\`, any \`base:\` inside \`boot\` is **ignored** — the chunk is placed at the current offset. Override with:

\`\`\`logts
use driver:
  base: .memoryMap:drivers
\`\`\`

### External labels (\`label>\`)

| Syntax | Scope |
|--------|-------|
| \`loop:\` | Local to the current assembly unit |
| \`JMP dsp>\` | External — resolved after \`use\` composition on the final program |

Unresolved externals at the top level produce: \`Unresolved external label 'dsp'\`.

---

## Runnable — \`repeat\` and \`align\`

\`\`\`logts-play
inline [asm] .myisa:
  NOP : 0000 + 4b
  :

64wire x = .myisa { repeat 8 { NOP } }
show(x)
\`\`\`

\`\`\`logts-play
inline [asm] .myisa:
  NOP : 0000 + 4b
  :

136wire fw = .myisa {
  NOP
  align 16 { NOP }
next:
  NOP
}
show(fw)
\`\`\`

If the padding block size does not divide the required gap, assembly fails (for example \`align 6 { NOP; NOP }\` after one instruction).

---

## Runnable — \`use\` and external labels

\`\`\`logts-play
inline [asm] .myisa:
  NOP : 0000 + 4b
  JMP : 0101 + A4b
  :

16wire boot = .myisa {
  JMP dsp>
  NOP
}
8wire dsp = .myisa {
dsp:
  NOP
}
24wire firmware = .myisa {
  use boot
  use dsp
}
show(firmware)
show(.myisa:decode(firmware))
\`\`\`

---

## Multi-ISA firmware

Each wire keeps the ISA used to assemble it. The outer program uses its own ISA for local instructions; \`use\` inserts pre-assembled segments from other ISAs.

\`\`\`logts-play
inline [asm] .cpuA:
  NOP  : 0000 + 4b
  HALT : 1111 + 4b
  :

inline [asm] .cpuB:
  NOP  : 1010 + 4b
  STOP : 0101 + 4b
  :

8wire dsp = .cpuB { NOP }
24wire fw = .cpuA {
  NOP
  use dsp
  HALT
}
show(fw)
show(.cpuA:decode(fw))
\`\`\`

---

## Metadata and \`:decode\`

Assembling \`.myisa { … }\` registers an **AsmModule** (blob, instruction list, segments). Wires created from that expression carry \`asmModuleId\`. When present, \`:decode\` formats from stored instruction words instead of re-guessing from bits alone.

Assigning a plain literal (\`x = ^hex\`) clears ASM metadata. Re-assigning from another ASM program copies metadata.

---

## Wire width

| Operator | ASM blob length |
|----------|-----------------|
| \`=\` | Must match **exactly** |
| \`:=\` / \`=:\` | Padding allowed only when the blob is **shorter** than the wire |

After \`use\`, the composed blob may be longer than a single module — size the wire accordingly (\`32wire\`, \`comp [mem]\`, etc.).

---

## Related

- [asm.md](asm.md) — ISA definition and ASM v1
- [mem.md](mem.md) — storing the final blob
- [assignment-operators.md](assignment-operators.md) — \`=\`, \`:=\`, \`=:\`
`,
    'asm.md': `# ASM

Define a custom ISA with \`inline [asm]\`, then assemble programs to a **binary blob** with \`.myisa { ... }\` anywhere an expression is allowed.

Memory (\`comp [mem]\`) receives the assembled blob unchanged.

There is **no panel UI** in v1 — logic only.

For **composition** (\`use\`, \`repeat\`, \`align\`, \`base:\`, external labels), see [asm-composition.md](asm-composition.md). Wires assembled from programs carry metadata used by \`:decode\`; \`show(wire)\` remains bits-only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name **must** start with \`.\` | \`.myisa\` ✓ — \`myisa\` ✗ |
| Letters, digits, \`_\` | \`.my_isa\` ✓ |
| Same name at declaration and use | \`inline [asm] .myisa:\` → \`.myisa { NOP }\` |
| **Global** from board/chip/pcb body | \`^.myisa { NOP }\` — see [lut.md](lut.md#global-reference-name) |

\`myisa { ... }\` without the leading dot is a **parse error**:

\`\`\`text
Expected '.' before inline instance name (use '.myisa' not 'myisa')
\`\`\`

This applies to wire expressions (\`8wire x = .myisa { NOP }\`) and to \`comp [mem]\` initializers (\`= .myisa { ... }\`).

---

## Declare vs use

| Step | Syntax |
|------|--------|
| Define ISA | \`inline [asm] .myisa:\` … closing \`:\` |
| Assemble | \`.myisa { MNEMONIC … }\` or multi-line \`{ … }\` |
| Load into mem | \`comp [mem] .prog: … = .myisa { … }\` or \`.prog = .myisa { … }\` |

ASM uses **\`{ }\`** for programs. LUT (see [lut.md](lut.md)) uses **\`(...)\`** for lookup — different inline kind, different call syntax.

---

## ISA definition

\`\`\`logts
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :
\`\`\`

| Token | Meaning |
|-------|---------|
| \`0000\` | Fixed literal bits |
| \`4b\` | Unsigned immediate (0…15) |
| \`S4b\` | Signed immediate (-8…+7), two's complement |
| \`R2b\` | Register \`Rn\` |
| \`A4b\` | Address \`An\` or label → **absolute** address |

All mnemonics must encode to the same \`wordWidth\` (sum of segment widths).

---

## Runnable — NOP and LOAD

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

8wire nop = .myisa { NOP }
8wire load = .myisa { LOAD R1 A3 }
show(nop)
show(load)
\`\`\`

Arguments are separated by whitespace — no comma required (\`LOAD R1 A3\`).

---

## Runnable — multi-line program

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire prog = .myisa {
  NOP
  LOAD R1 A3
}
show(prog)
\`\`\`

---

## Runnable — labels and forward references

Pass 1 collects labels; \`JMP loop3\` may appear **before** \`loop3:\`.

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire x = .myisa {
  JMP there
there:
  NOP
}
show(x)
\`\`\`

| Field | Label resolves to |
|-------|-------------------|
| \`A4b\` | Absolute instruction address |
| \`S4b\` | Relative offset: \`target - (currentAddr + 1)\` |

---

## Runnable — signed branch (BEQ)

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

24wire x = .myisa {
  loop:
    NOP
    NOP
    BEQ loop
}
show(x)
\`\`\`

---

## Runnable — load into \`mem\`

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  = .myisa {
    NOP
    LOAD R1 A3
  }
  :

8wire slot0 = .prog:get
show(slot0)
\`\`\`

Validations (interpreter): \`wordWidth === mem.depth\`, \`instructionCount <= mem.length\`.

### Wire width and assignment operators

| Operator | ASM shorter than wire |
|----------|------------------------|
| \`=\` | Error — use exact width, e.g. \`8wire x = .myisa { LOAD R1 A2 }\` |
| \`:=\` | Left-pad (zeros on the left) |
| \`=:\` | Right-pad (zeros on the right) |

See [assignment-operators.md](assignment-operators.md).

### Wire slot with \`:=\` (left-pad)

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire prog := .myisa {
  LOAD R1 A2
}
show(prog)
\`\`\`

### Wire slot with \`=:\` (right-pad)

To store an assembled program in a wire wider than the blob (zeros on the right), use [\`=:\`](assignment-operators.md):

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire prog =: .myisa {
  LOAD R1 A2
}
show(prog)
\`\`\`

Runtime reassignment:

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  :

.prog = .myisa { NOP }
8wire slot0 = .prog:get
show(slot0)
\`\`\`

---

## \`:decode(instruction)\`

Disassembly — returns **text**, not bits. Valid only inside \`show()\` and \`doc()\`.

### Runnable — show disassembly

\`\`\`logts-play
inline [asm] .cpu:
  LOAD  : 0001 + R2b + A2b
  STORE : 0010 + R2b + A2b
  :

show(.cpu:decode(00010111))
\`\`\`

Output example: **\`LOAD R1 A3\`**

| Error | Cause |
|-------|-------|
| \`ASM decode produces text and cannot be assigned to wires\` | Used in wire assignment |

\`\`\`logts
8wire x = .cpu:decode(00010111)   # error
\`\`\`

---

## \`doc()\`

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

doc(inline)
doc(inline.asm)
doc(.myisa)
\`\`\`

| Call | Output |
|------|--------|
| \`doc(inline)\` | Lists all inline instances (asm, lut, protocol, …) |
| \`doc(inline.asm)\` | ISA declaration template |
| \`doc(.myisa)\` | Opcode layout for that asm instance |

---

## Errors

| Situation | Example message |
|-----------|-------------------|
| Name without \`.\` | \`Expected '.' before inline instance name (use '.myisa' not 'myisa')\` |
| Undefined label | \`Undefined label 'nowhere'\` |
| Signed overflow | \`Relative jump offset (-21) is out of bounds...\` |
| Wrong prefix | \`'LOAD' expects a Register prefix (R)...\` |
| mem depth | \`ISA encodes 8 bits per instruction but mem depth is 4\` |
| Wire width (\`=\` strict) | \`Expected 50 bits, got 48 bits.\` or \`Bit-width mismatch: x is 50bit but assembled program provides 48 bits\` |

Assembler errors include the source line and \`^^^\` under the problematic token when possible.

---

## Related

- [asm-composition.md](asm-composition.md) — \`use\`, \`repeat\`, \`align\`, \`base:\`, external labels, multi-ISA
- [mem.md](mem.md) — store assembled blob
- [mini-cpu-v2.md](mini-cpu-v2.md) — end-to-end CPU with ASM program and \`BEQ\`
- [lut.md](lut.md) — lookup tables
- [debug.md](debug.md) — \`show\`, \`peek\`
`,
    'assignment-operators.md': `# Assignment operators

LogTScript supports multiple assignment operators with different width-handling behaviors for **wires**.

See also: [script modes](modes.md) (\`MODE STRICT\`, \`MODE WIREWRITE\`, \`MODE ZSTATE\`), [signal propagation](signal-propagation.md), [wire vectors](wire-vectors.md), [wire literals](wire-literals.md), [ASM](asm.md).

---

## Summary

| Operator | Behavior | Where |
|----------|----------|-------|
| \`=\` | Strict assignment — exact width, error on shorter **or longer** value | declaration, re-assignment |
| \`:=\` | Left-pad assignment | declaration, re-assignment |
| \`=:\` | Right-pad assignment | declaration, re-assignment |
| \`:\` | Initial assignment (literal only) | wire declaration only |

**Truncation:** when a value is longer than the wire, padding direction does not change truncation — the same truncation rule applies in each execution path. Phase 3 will unify truncation rules across the runtime.

---

## \`=\` — Strict assignment

The assigned value must have exactly the same width as the destination. No padding is performed.

### Syntax

\`\`\`logts
wire = value
\`\`\`

### Examples

\`\`\`logts-play
3wire q = 001
show(q)
\`\`\`

Result: \`001\`

\`\`\`logts-play
3wire q = 1
show(q)
\`\`\`

Error: \`Expected 3 bits, got 1 bit.\`

\`\`\`logts-play
4wire q = 11111
show(q)
\`\`\`

Error: \`Expected 4 bits, got 5 bits.\`

\`\`\`logts-play
8wire q = 10101010
show(q)
\`\`\`

Result: \`10101010\`

---

## \`:=\` — Left-pad assignment

If the assigned value is shorter than the destination width, zeros are added on the **left**.

### Syntax

\`\`\`logts
wire := value
\`\`\`

### Examples

\`\`\`logts-play
3wire q := 1
show(q)
\`\`\`

Result: \`001\`

\`\`\`logts-play
3wire q := 10
show(q)
\`\`\`

Result: \`010\`

\`\`\`logts-play
8wire q := 101
show(q)
\`\`\`

Result: \`00000101\`

\`\`\`logts-play
8wire q := 11110000
show(q)
\`\`\`

Result: \`11110000\`

### ASM — program in a wide slot (left-pad)

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire x := .myisa { LOAD R1 A2 }
show(x)
\`\`\`

Shorter program → zeros on the **left** (\`^00 + ^16\`).

---

## \`=:\` — Right-pad assignment

If the assigned value is shorter than the destination width, zeros are added on the **right**.

### Syntax

\`\`\`logts
wire =: value
\`\`\`

### Examples

\`\`\`logts-play
3wire q =: 1
show(q)
\`\`\`

Result: \`100\`

\`\`\`logts-play
3wire q =: 10
show(q)
\`\`\`

Result: \`100\`

\`\`\`logts-play
8wire q =: 101
show(q)
\`\`\`

Result: \`10100000\`

### ASM — program in a wide slot (right-pad)

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire x =: .myisa { LOAD R1 A2 }
show(x)
\`\`\`

Shorter program → zeros on the **right** (\`^16 + ^00\`).

### Re-assignment after init

\`\`\`logts-play
MODE WIREWRITE
4wire q : 1
q =: 11
show(q)
\`\`\`

Result: \`1100\`

---

## \`:\` — Initial assignment

Assigns the initial value of a wire at declaration. **Literal only** (binary, hex \`^\`, decimal \`\\\`, \`!\`, or meta constant \`/name/\`).

Meta constants such as \`/instance/\` are documented in **[meta-constants.md](meta-constants.md)** (top-level \`:\` init only).

### Syntax

\`\`\`logts
wire : value
\`\`\`

### Examples

\`\`\`logts-play
3wire q : 1
show(q)
\`\`\`

Result: \`001\` (left-padded at init)

\`\`\`logts-play
8wire counter : 00000000
show(counter)
\`\`\`

\`\`\`logts-play
1wire state : 0
show(state)
\`\`\`

After \`:\` init, the first real assignment (\`=\`, \`:=\`, or \`=:\`) is allowed in STRICT mode.

---

## Operator comparison

| Operator | Shorter value | Exact width | Longer value |
|----------|---------------|-------------|--------------|
| \`=\` | Error | OK | Truncate (per path) |
| \`:=\` | Left-pad | OK | Truncate (per path) |
| \`=:\` | Right-pad | OK | Truncate (per path) |
| \`:\` | Left-pad at init | OK | Truncate at init |

---

## ASM width rules

| Declaration | Blob shorter than wire |
|-------------|------------------------|
| \`Nwire x = .isa { ... }\` | **Error** (strict) |
| \`Nwire x := .isa { ... }\` | Left-pad |
| \`Nwire x =: .isa { ... }\` | Right-pad |

Use exact wire width with \`=\` when the assembled program matches, e.g. \`8wire prog = .myisa { LOAD R1 A2 }\`.

---

## \`MODE WIREWRITE\`

Allows **re-assignment** to the same wire name after initialization (in addition to \`MODE STRICT\` rules). In default binary mode, multiple writes in one step still behave as **last wins** during propagation.

Overview of all modes: **[modes.md](modes.md)**.

\`\`\`logts-play
MODE WIREWRITE
4wire q : 1
q =: 11
show(q)
\`\`\`

Result: \`1100\`

---

## \`MODE ZSTATE\` and \`WIREWRITE\`

\`MODE ZSTATE\` can be combined with \`MODE WIREWRITE\`. The difference from plain WIREWRITE:

| | \`MODE WIREWRITE\` (binary) | \`MODE ZSTATE\` |
|--|---------------------------|---------------|
| Multiple writes same step | Last value wins | Contributions **merged** per bit |
| Undeclared wire | Zeros | \`Z\` (high-impedance) |
| Conflict | Silent overwrite | \`X\` on conflicting bits |

Full semantics: **[zstate.md](zstate.md)**. All \`MODE\` options: **[modes.md](modes.md)**.

\`\`\`logts-play wave
MODE ZSTATE

2wire bus
2wire a = 10
2wire b = 11
bus = a
bus = b
show(bus)
\`\`\`

Result: \`1X\` (not \`11\`).

`,
    'board.md': `# Board components

A **board** is the recommended way to build reusable interactive circuits. It uses the same pin/pout/exec model as [chip.md](chip.md), with **wave propagation** in the body, but allows **UI components** (\`switch\`, \`led\`, \`osc\`, …).

Use **board** instead of [pcb.md](pcb.md) for new designs (PCB is deprecated).

Signature reference: \`doc(board)\` and \`doc(board.type)\` — see [doc-function.md](doc-function.md).

---

## Definition

\`\`\`
board +[name]:
  Npin inputName
  Mpout outputName
  exec: triggerPin
  on: raise/edge/1/0
  comp [switch] .sw::
  # wiring, chip/board instances, probe
  :Nbit returnVar
\`\`\`

---

## Instantiation

\`\`\`
board [name] .instance::
\`\`\`

Property block:

\`\`\`
.instance:{
  inputName = 0101
  triggerPin = 1
}
\`\`\`

Read pouts:

\`\`\`
4wire out = .instance:outputName
\`\`\`

---

## Allowed in board body

- All \`comp\` types (including panel UI)
- \`chip [type] .inst::\` — nested chip instances
- \`board [type] .inst::\` — nested board instances
- \`probe(...)\` in body (collected at parse)
- Wire assignments and property blocks

## Forbidden in board body

| Construct | Reason |
|-----------|--------|
| \`def\` | Use top-level functions only |
| \`pcb +[...]\` / \`pcb [t] .x::\` | PCB deprecated; use board |
| \`chip +[...]\` / \`board +[...]\` | No nested type definitions |
| \`~~\` next section | Not supported (chip/board model) |

---

## Chip vs board

| Feature | Chip | Board |
|---------|------|-------|
| UI components | No | **Yes** |
| \`board [t] .x::\` in chip body | **Yes** | — |
| Wave in body | Yes | Yes |
| Use case | Logic library | Full interactive blocks |

In a **chip** body: \`board +[...]\` is forbidden, but \`board [type] .x::\` is allowed.

---

## Runnable example

\`\`\`logts-play
board +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

board [halfAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
\`\`\`

---

## Probe

| Form | Target |
|------|--------|
| \`probe(.u1:sum)\` | pout |
| \`probe(.u1.partial)\` | internal wire in body |

See [debug.md](debug.md).

---

## Related

- [chip.md](chip.md) — logic-only blocks
- [pcb.md](pcb.md) — deprecated
- [components.md](components.md) — index
`,
    'boolean-analysis.md': `# Boolean expression analysis helpers

Analysis-only statements (like \`show\` / \`lutOf\`): they emit text to **Output**. They do **not** create runtime logic.

| Statement | Role |
|-----------|------|
| \`truthTableOf(expr [, filters])\` | Truth table text |
| \`simplify(expr [, filters])\` | Minimized expression (Quine–McCluskey) |
| \`equivalent(e1, e2)\` | \`true\` / \`false\` |
| \`inputsOf(expr)\` | Detected input columns + widths |
| \`costOf(expr)\` | Syntactic cost (literal vs minimized) |

See also: [boolean-lut.md](boolean-lut.md) (\`lutOf\` / \`exprOfLut\`), [debug.md](debug.md), [short-notation.md](short-notation.md).

Expression parameters use the same syntax as \`lutOf\`: built-ins \`NOT\`, \`AND\`, \`OR\`, … or short-notation in backticks.

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the \`logts-play\` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script **and** runs it immediately. Results appear in the **Output** panel (truth tables, minimized lines, \`true\`/\`false\`, cost lines). |

These statements are **analysis-only** — they do not create runtime logic or device panels. For fixed examples, **Load & Run** is enough: read **Output** right away.

Use **Load** when you want to change wire widths, filter patterns, or the expression before running. After editing, press **RUN** (or **Load & Run** on another block to compare).

### Quick walkthrough

**Load & Run** — classic minimization (\`OR(AND(NOT A,B), AND(A,B))\` → \`B\`):

\`\`\`logts-play
simplify(OR(AND(NOT(A), B), AND(A, B)))
\`\`\`

**Load & Run** — undeclared \`C\` gets width **2b** from filter \`C=01\` (no \`2wire C\` line):

\`\`\`logts-play
2wire B
simplify(XOR(B, C), B=**, C=01)
\`\`\`

**Load & Run** — filtered truth table (check row count in **Output**):

\`\`\`logts-play
5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
\`\`\`

**Load & Run** — multi-bit \`AND\` minimized per bit, then **lifted** to \`AND(B, C)\` when both inputs are declared with matching width:

\`\`\`logts-play
2wire B
2wire C
simplify(AND(B, C), B=**, C=**)
\`\`\`

**Load & Run** — partial slice stays as \`AND(B.1-2, C.1-2)\` after lift:

\`\`\`logts-play
4wire B
4wire C
simplify(AND(B.1-2, C.1-2), B=****, C=****)
\`\`\`

**Load** the slice example above, change \`B=****\` to fix bits (e.g. \`B=01**\`), then **RUN** to see how filters shrink the QM table.

---

## Limits

| Functions | Limit | Error |
|-----------|-------|-------|
| \`truthTableOf\`, \`lutOf\`, \`simplify\` | Max **256 rows** generated | \`Boolean analysis exceeds maximum supported table size (256 rows)\` |
| \`simplify\`, \`equivalent\` (no filters) | Max **8 input bits** | \`Boolean analysis exceeds maximum supported input width (8 bits)\` |

Without filters, \`truthTableOf\` / \`lutOf\` generate \`2^(sum column widths)\` rows — practically ≤ 8 bits.

With **filters** (see below), you may have more than 8 input bits if the filtered row count stays ≤ 256.

---

## \`truthTableOf(expression [, filters])\`

### Without filters

**Load & Run** — full 2-input table in **Output**:

\`\`\`logts-play
truthTableOf(OR(A, B))
\`\`\`

\`\`\`text
A B | OUT
--------------
0 0 | 0
0 1 | 1
1 0 | 1
1 1 | 1
\`\`\`

### With filters (\`*\` / \`A\` / \`X\` / \`Z\`)

Optional second argument: \`column=pattern\` assignments, separated by commas.

| Symbol | Meaning |
|--------|---------|
| \`*\` | Binary don't-care (0 or 1) — becomes a variable in \`exprOfLut\` / \`simplify\` |
| \`A\` | Don't-care all values (0, 1, X, Z) — expands LUT rows, not a QM variable |
| \`X\`, \`Z\` | Fixed logic values (IEEE analysis) |
| \`0\`, \`1\` | Fixed binary |

**Load & Run** — filtered rows (same script as in [Quick walkthrough](#quick-walkthrough)):

\`\`\`logts-play
5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
\`\`\`

- Pattern length must match column width.
- **Undeclared wires and filter width** (for \`simplify\`, \`truthTableOf\`, \`lutOf\` only — not \`inputsOf\`):

| Situation | Width used |
|-----------|------------|
| \`Nwire X\` declared in script | declaration (wins over filter) |
| Undeclared, filter \`X=pattern\` (no bit range in filter) | \`pattern.length\` |
| Undeclared, filter \`X.start-end=pattern\` / \`X.start/len=pattern\` | covers bits through \`end\` (parent wire width) |
| Undeclared, no filter for \`X\` | **1b** default |
| Expression uses \`X.i\` / \`X.0-1\` / \`X.1/3\` | slice width from expression (unchanged) |

**Load & Run** — width inferred from filter (\`C=01\` → 2b):

\`\`\`logts-play
2wire B
simplify(XOR(B, C), B=**, C=01)
\`\`\`

\`C\` is not declared; filter \`C=01\` gives **2b**. No \`2wire C\` line required.

- **Compact wire filter:** \`Wire=pattern\` on a declared wire maps substrings to every slice used in the expression (\`B.0\`, \`B.0-2\`, \`B.1/3\`, …). Pattern length = wire width; bit index \`i\` uses pattern character \`i\`. Example: \`4wire B\` + \`truthTableOf(XOR(B.0-2, B.1/3), B=AA*0)\`.
- Partial filters OK — unlisted columns enumerate all combinations.
- Rows follow \`enumerateFilteredEnvs\` order.

---

## \`simplify(expression [, filters])\`

Emits **two assignment lines** (short + standard), like \`exprOfLut\`.

### Without filters

**Load & Run** — two lines in **Output** (short + standard):

\`\`\`logts-play
simplify(OR(AND(NOT(A), B), AND(A, B)))
\`\`\`

\`\`\`text
1wire out = \`B\`
1wire out = B
\`\`\`

### With filters

Same \`column=pattern\` syntax as \`truthTableOf\` / \`lutOf\` (comma between assignments; \`*\` = varying bit):

**Load & Run** — QM on \`*\` positions only:

\`\`\`logts-play
5wire A
1wire B
5wire C
simplify(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
\`\`\`

Minimization uses only the **varying** bits (\`*\` positions) as QM inputs — same rules as \`exprOfLut(.generated)\` with \`filters:\`.

After per-bit minimization, identical segments on declared multi-bit wires may be **lifted** to a single gate, e.g. \`AND(B.0,C.0) + AND(B.1,C.1)\` → \`AND(B, C)\`, or \`AND(B.1-2, C.1-2)\` when only a slice is used. See the lift examples in [Quick walkthrough](#quick-walkthrough).

**\`A\` in \`simplify\` / \`exprOfLut\` filters:** \`A\` is not allowed — use \`*\` for binary don't-care. Error:

\`\`\`text
simplify: cannot use A in filters, please use * instead
exprOfLut: cannot accept a lut with A in filters attribute
\`\`\`

For IEEE expansion with \`A\`, use \`truthTableOf\` / \`lutOf\` (runtime LUT). Round-trip \`lutOf\` → \`exprOfLut\` requires \`*\` only on varying bits, not \`A\`.

**\`A\` vs \`*\` in \`lutOf\` / \`truthTableOf\`:** \`*\` marks a binary don't-care; \`A\` expands rows (0/1/X/Z). \`exprOfLut\` rebuilds using only \`*\` positions as QM variables.

Multi-bit output uses \` + \` between segments (grouped constants when possible).

---

## \`equivalent(expr1, expr2)\`

**Load & Run** — one line \`true\` or \`false\` in **Output**:

\`\`\`logts-play
equivalent(OR(A, B), OR(B, A))
\`\`\`

Output: \`true\` or \`false\` (one line).

---

## \`inputsOf(expression)\`

Aligned list of discovered columns:

**Load & Run** — column names and widths (no minimization):

\`\`\`logts-play
4wire A
8wire B
inputsOf(OR(A.2, B.1))
\`\`\`

\`\`\`text
A.2    1b
B.1    1b
\`\`\`

---

## \`costOf(expression)\`

**Syntactic** cost (not hardware gates): width-aware sum of boolean operators in the AST.

**Load & Run** — expression vs minimized cost:

\`\`\`logts-play
costOf(OR(AND(NOT(A), B), AND(A, B)))
\`\`\`

\`\`\`text
Expression cost: 4
Minimized cost: 0
Reduction possible: 4 (100%)
\`\`\`

| Operator | Cost |
|----------|------|
| \`NOT\` | \`width(input)\` |
| \`AND\`, \`OR\`, \`XOR\`, … | \`width(result)\` |
| identifiers / literals | \`0\` |

---

## Relation to LUT utilities

| Goal | Statement |
|------|-----------|
| Expression → truth table | \`truthTableOf\` |
| Expression → \`inline [lut]\` block | \`lutOf\` |
| Expression → minimized form | \`simplify\` |
| \`inline [lut]\` → expression (manual or via \`filters:\`) | \`exprOfLut\` |
| Equivalence check | \`equivalent\` |

\`lutOf\` emits \`description:\` and optional \`filters:\` attributes; \`exprOfLut\` can rebuild the expression from those when \`filters:\` is present. Details: [boolean-lut.md](boolean-lut.md).
`,
    'boolean-lut.md': `# Boolean LUT utilities — \`lutOf\` and \`exprOfLut\`

Analysis-only statements (like \`show\`): they emit copy-pasteable text to **Output**. They do **not** create runtime logic.

| Statement | Role |
|-----------|------|
| \`lutOf(expr [, filters])\` | Build an \`inline [lut]\` block from a boolean expression |
| \`exprOfLut(.lut [, vars…])\` | Rebuild a boolean expression from an \`inline [lut]\` instance |

See also: [lut.md](lut.md) (LUT runtime and \`^.name(in=…)\` invoke), [boolean-analysis.md](boolean-analysis.md) (\`truthTableOf\`, \`simplify\`, …), [short-notation.md](short-notation.md) (backtick syntax), [debug.md](debug.md) (Output panel overview).

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the \`logts-play\` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Edit the expression or paste a generated \`inline [lut]\` block, then press toolbar **RUN**. |
| **Load & Run** | Copies the script **and** runs it immediately. **\`lutOf\` / \`exprOfLut\`** write copy-pasteable text to **Output**; **\`useLutAs\` / \`useExpr\`** run logic and update wires (no analysis lines). |

For **\`lutOf\`** and **\`exprOfLut\`**, **Load & Run** is enough — copy the **Output** block into your script or run **\`exprOfLut\`** on the next line in the same example.

Use **Load** for two-step workflows: run **\`lutOf\`**, paste **Output** into the editor, add **\`exprOfLut(.generated)\`**, then **RUN** again.

### Quick walkthrough

**Load & Run** — generate a 1-bit OR LUT (\`.generated\` in **Output**):

\`\`\`logts-play
lutOf(OR(A, B))
\`\`\`

**Load & Run** — filtered LUT + rebuild expression (two analysis steps in one run):

\`\`\`logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
\`\`\`

**Load & Run** — multi-bit \`AND\` with filters, lifted to \`AND(B, C)\` on rebuild:

\`\`\`logts-play
useLutAs(lutOf(AND(B, C), B=**, C=**), .b)
2wire B
2wire C
exprOfLut(.b)
\`\`\`

**Load & Run** — runtime LUT from expression (no **Output** block; check \`show(y)\`):

\`\`\`logts-play
useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
1wire y = .gen(10)
show(y)
\`\`\`

**Load** the runtime example, change \`A\` / \`B\` assignments or the address literal, then **RUN** to try other inputs.

---

## \`lutOf(expression [, filters])\`

Boolean expression using built-ins \`NOT\`, \`AND\`, \`OR\`, \`XOR\`, \`NXOR\`, \`NAND\`, \`NOR\`, or short-notation in backticks.

Optional filters (same syntax as \`truthTableOf\`): comma-separated \`column=pattern\` assignments.

**Load & Run** — copy the \`inline [lut] .generated:\` block from **Output**:

\`\`\`logts-play
lutOf(OR(A, B))
\`\`\`

Output (copy-pasteable \`inline [lut]\` block):

\`\`\`text
inline [lut] .generated:
  description: A 1b, B 1b -> out 1b

  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
:
\`\`\`

With filters, \`lutOf\` adds a \`filters:\` attribute:

**Load & Run** — \`filters:\` line included in **Output**:

\`\`\`logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
\`\`\`

\`\`\`text
inline [lut] .generated:
  description: A 5b, B 1b, C 5b -> out 5b
  filters: A=01*1*, B=*, C=000**

  depth: 5
  length: 32
  data { … }
:
\`\`\`

Instance name is always **\`.generated\`**. Paste the block into a script, then use \`exprOfLut(.generated)\` or invoke the LUT at runtime — see [lut.md](lut.md).

### Rules

- **Row limit:** max **256 rows** in \`data { }\`. Error: \`Boolean analysis exceeds maximum supported table size (256 rows)\`.
- **With filters:** \`length\` = number of rows emitted (≤ 256); \`filters:\` documents which input combinations are included.
- **Without filters:** \`length = 2^(sum column widths)\` (≤ 256).
- **\`description:\`** lists column widths; **\`filters:\`** uses \`0\`, \`1\`, \`*\` (binary don't-care), \`A\` (all values), \`X\`, \`Z\` per bit (index \`0\` = leftmost, same as \`bitRange\`). Lowercase \`x\` is rejected — use \`*\`.
- **Compact wire filter:** when the expression uses bit slices (\`B.0\`, \`B.0-2\`, \`B.1/3\`, …), you can filter the whole declared wire in one assignment instead of per slice. Pattern length = wire width; each discovered column takes the matching substring (bit \`i\` → pattern character at index \`i\`).

\`\`\`logts
4wire B
lutOf(XOR(B.0-2, B.1/3), B=AA*0)
\`\`\`

Equivalent to \`B.0-2=AA*, B.1/3=A*0\` but shorter. Works for \`lutOf\`, \`truthTableOf\`, \`simplify\`, and round-trips through \`exprOfLut\` when the LUT has \`filters: B=AA*0\`.

- Undeclared atomic variables default to **1 bit**, unless a filter on that name sets the width (\`C=01\` → 2b). Declared \`Nwire\` always wins. See [boolean-analysis.md](boolean-analysis.md#with-filters--a--x--z).
- Whole wires (\`lutOf(C)\` on \`7wire C\`) use the declared wire width.
- Non-boolean ops (\`LSHIFT\`, etc.) → error.
- **Logic gates** with unequal-width operands: shorter operand is **left-padded** with \`0\` (see [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md#unequal-operand-widths-left-pad)).

---

## \`exprOfLut(.lut [, variables…])\`

Rebuild logic from an **\`inline [lut]\`** instance. **Always emits two lines:**

1. Short-notation assignment (backticks)
2. Standard notation assignment (\`OR\`, \`AND\`, …)

### Automatic variables (\`filters:\` present)

When the LUT has \`description:\` and \`filters:\` (as emitted by \`lutOf\` with filters), omit the variable list:

**Load & Run** — \`exprOfLut\` infers \`*\` columns from \`filters:\`:

\`\`\`logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
\`\`\`

\`exprOfLut\` reads the \`description:\` and \`filters:\` attributes. Only bit positions marked \`*\` in the filter patterns become variables — for \`A=01*1*, B=*, C=1001*\` that is \`A.2\`, \`A.4\`, \`B\`, \`C.4\`.

**\`A\` is not allowed when rebuilding from a LUT** — \`exprOfLut\` reads the LUT \`filters:\` attribute; if it contains \`A\`, error: \`exprOfLut: cannot accept a lut with A in filters attribute\`. Use \`*\` on bits that should become QM variables. IEEE tables with \`A\` remain valid via \`lutOf\` / \`truthTableOf\`.

You can pass variables explicitly; they must match those varying bits in the same order.

### Manual variables (no \`filters:\`)

**Load & Run** — explicit \`A\`, \`B\` for a hand-written LUT:

\`\`\`logts-play
inline [lut] .or2:
  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
  :

exprOfLut(.or2, A, B)
\`\`\`

\`\`\`logts
1wire out = \`A | B\`
1wire out = OR(A, B)
\`\`\`

### Variable width

| Syntax | Width |
|--------|-------|
| \`A\` | **1b** if undeclared; else \`Nwire\` / \`Nbit\` from script |
| \`A 4b\` | **4b** explicit (overrides declaration) |
| \`A.2\` | **1b** (single bit column — same as \`description:\` column) |
| \`A.2 1b\` | **1b** explicit |
| \`B.1/3\` | **3b** (length slice) |
| \`D.0-3\` | **4b** (bit range) |

Round-trip with explicit columns (LUT without \`filters:\`):

**Load & Run** — multi-bit columns in discovery order:

\`\`\`logts-play
4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))
exprOfLut(.generated, A.2, B.1, A.0, B.0)
\`\`\`

Validation: \`sum(widths) === lutAddrBits(length)\`. Mismatch → \`exprOfLut expects N input bits but received M\`.

**Not supported:** \`prefixFree\` / \`variableDepth\` LUTs.

### Multi-bit output (\`depth\` > 1)

\`\`\`logts
2wire out = (\`A\`) + (\`B\`)
2wire out = (A) + (B)
\`\`\`

---

## Multi-bit inputs

\`lutOf\` discovers columns in **first-appearance order** in the expression:

**Load & Run** — check \`description:\` in **Output**:

\`\`\`logts-play
4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))
\`\`\`

\`\`\`text
description: A.2 1b, B.1 1b, A.0 1b, B.0 1b -> out 1b
\`\`\`

Other forms:

- Whole wire: \`lutOf(C)\` on \`7wire C\` → \`description: C 7b -> out 7b\`, \`length: 128\`
- Bit range: \`lutOf(D.0-3)\` on \`10wire D\` → \`description: D.0-3 4b -> out 4b\`
- Length slice: \`B.1/3\` → 3 bits from bit 1

Address bit order for \`exprOfLut(.example, A 2b, B 3b)\`:

→ \`A.0, A.1, B.0, B.1, B.2\` (index 0 = \`.0\` leftmost, same as \`bitRange\`).

---

## Round-trip examples

**Simple** — **Load & Run**, then paste **Output** and add \`exprOfLut(.generated, A, B)\` (or **Load** and edit):

\`\`\`logts-play
lutOf(XOR(A, B))
\`\`\`

**With filters** — **Load & Run** (same as [Quick walkthrough](#quick-walkthrough)):

\`\`\`logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
\`\`\`

---

## Errors (summary)

| Case | Message |
|------|---------|
| > 256 rows | \`Boolean analysis exceeds maximum supported table size (256 rows)\` |
| Width mismatch | \`exprOfLut expects N input bits but received M\` |
| No vars and no \`filters:\` | \`exprOfLut: supply variables or use a LUT with filters: attribute\` |
| Vars ≠ filter bits | \`exprOfLut: variables do not match LUT filters: expected […]\` |
| Non-boolean in \`lutOf\` | \`'LSHIFT' is not a boolean operation\` |
| prefixFree / variableDepth LUT | \`exprOfLut: prefixFree LUT not supported\` |
| Missing LUT | \`exprOfLut: LUT '.name' not found\` |

---

## Runtime bridge — \`useLutAs\`, inline \`lutOf\` body, \`useExpr\`

These forms apply the same generators **at runtime** in one script (no copy-paste). They do **not** emit Output.

| Form | Role |
|------|------|
| \`lutOf\` / \`exprOfLut\` | Unchanged — analysis only, emit Output |
| \`useLutAs(lutOf(expr [, filters]), .name)\` | Register \`inline [lut] .name\` from expression |
| \`inline [lut] .name: lutOf(expr) :\` | Same as \`useLutAs\`, declarative body |
| \`Nw u = useExpr(exprOfLut(.lut [, vars…]))\` | Assign wire from minimized boolean expr |

### \`useLutAs(lutOf(…), .name)\`

**Load & Run** — wire literal address \`10\` (= \`A=1\`, \`B=0\`):

\`\`\`logts-play
useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
1wire y = .gen(10)
show(y)
\`\`\`

Address may be a **binary literal** (\`10\`, \`01\`) or a **wire** (\`C\`, \`addr\`):

**Load & Run** — address from wire \`C\`:

\`\`\`logts-play
useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
2wire C = 10

1wire y = .gen(C)
show(y)
\`\`\`

### Inline body \`lutOf\`

**Load & Run** — declarative LUT body:

\`\`\`logts-play
inline [lut] .gen:
  lutOf(\`A | B\`)
  :

1wire y = .gen(01)
show(y)
\`\`\`

### \`useExpr(exprOfLut(…))\` — assignment only

Only valid as the **right-hand side** of a wire assignment (including \`Nw u = …\` or \`u = …\` after a declaration).

**Load & Run** — first run lowers to \`OR(A, B)\`; later propagations skip QM:

\`\`\`logts-play
inline [lut] .or2:
  depth: 1
  length: 4
  data { 00:0, 01:1, 10:1, 11:1 }
  :

1wire A := 0
1wire B := 1
1wire u = useExpr(exprOfLut(.or2, A, B))
show(u)
\`\`\`

Split declaration — **Load** to edit widths, then **RUN**:

\`\`\`logts-play
1wire A := 0
1wire B := 1
1wire u
u = useExpr(exprOfLut(.or2, A, B))
\`\`\`

### Lowering (re-execution)

On the **first** execution of a \`useExpr\` assignment, the runtime:

1. Runs \`exprOfLut\` / QM **once**
2. Replaces the assignment AST with the standard boolean expression (e.g. \`OR(A, B)\`)
3. On later propagations (when \`A\` or \`B\` change), only that expression is re-evaluated — **no** repeated \`exprOfLut\`

Wire width on the left must match LUT \`depth\`; mismatch → \`useExpr: wire width Nb does not match expression depth Mb\`.

\`useExpr(…)\` as a standalone statement is a **parse error**.
`,
    'builtin-ABS.md': `# ABS

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md)

Absolute value on a scalar wire. Requires a **numeric format tag** — \`; signed\`, \`; q4p4\`, \`; q8p8\`, \`; fp16\`, or \`; bf16\`. There is no unsigned mode.

## Signatures

\`\`\`
ABS(Xbit x; signed) -> Xbit result, 1bit overflow
ABS(8bit x; q4p4) -> 8bit result, 1bit overflow
ABS(16bit x; q8p8) -> 16bit result, 1bit overflow
ABS(16bit x; fp16) -> 16bit result, 1bit overflow
ABS(16bit x; bf16) -> 16bit result, 1bit overflow
\`\`\`

## Behaviour

| Input | \`result\` | \`overflow\` |
|-------|----------|------------|
| Non-negative value | \`x\` unchanged | \`0\` |
| Negative value | \`|x|\` (two's complement negate) | \`0\` |
| \`INT_MIN\` at width *W* (MSB \`1\`, rest \`0\`) | \`x\` unchanged | \`1\` |

\`X\` follows the operand width. The second return is always \`1bit\`.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Two's complement absolute value on any width. |
| \`q4p4\` | Q4.4 on **8-bit** wires. |
| \`q8p8\` | Q8.8 on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float absolute value on **16-bit** wires. |

**No \`; vector\`** or **\`; matrix\`** — scalar only.

## Examples

### \`ABS(Xbit x; signed)\`

\`\`\`logts-play
4wire x = 1101
4wire a, 1wire ovf = ABS(x; signed)
show(a)
show(ovf)
\`\`\`

\`INT_MIN\` at 4 bits:

\`\`\`logts-play
4wire min = 1000
4wire a, 1wire ovf = ABS(min; signed)
show(a)
show(ovf)
\`\`\`

### \`ABS(8bit x; q4p4)\`

\`\`\`logts-play
8wire x = 11110000
8wire a, 1wire ovf = ABS(x; q4p4)
show(a; q4p4)
show(ovf)
\`\`\`

\`|-1.0| = 1.0\` → \`a=00010000\`, \`ovf=0\`.

## See also

[SUBTRACT](builtin-SUBTRACT.md) · [arithmetic tag overview](arithmetic.md#tag-overview)
`,
    'builtin-ADD.md': `# ADD

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise \`; vector\`](vector-reduction.md#element-wise-mode-vector) · [Matrix \`; matrix\`](matrix-reduction.md)

Binary addition with wrap-around.

## Signatures

\`\`\`
ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry
ADD(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
ADD(8bit a, 8bit b; q4p4) -> 8bit result, 4bit status
ADD(16bit a, 16bit b; q8p8) -> 16bit result, 4bit status
ADD(16bit a, 16bit b; fp16) -> 16bit result, 4bit status
ADD(16bit a, 16bit b; bf16) -> 16bit result, 4bit status
ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
ADD(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
ADD(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
\`\`\`

## Scalar (default)

- \`result\` = \`(a + b) mod 2^N\`
- \`carry\` = \`1\` if \`a + b > 2^N - 1\`; else \`0\`
- Width \`N\` = \`max(len(a), len(b))\`; inputs zero-padded on the left.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Same \`result\` bits; second return is **signed overflow** (not unsigned carry). |
| \`q4p4\` | Fixed-point Q4.4 on **8-bit** wires; second return = **4bit status**. |
| \`q8p8\` | Fixed-point Q8.8 on **16-bit** wires; second return = **4bit status**. |
| \`fp16\` | IEEE 754 half on **16-bit** wires; second return = **4bit status**. |
| \`bf16\` | Brain float 16 on **16-bit** wires; second return = **4bit status**. |
| \`vector\` | Per index on **rank-1** tensors (\`Wwire[N]\`, \`Wwire[1,N]\`, \`Wwire[N,1]\`); matching \`elementCount\`. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\` (\`N>1\`, \`M>1\`); rank-1 operands broadcast. Mutually exclusive with \`vector\`. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** rank-1 vs matrix — [wire-vectors.md](wire-vectors.md#rank-1-vs-matrix).

**Implicit vector broadcast:** \`ADD(vectorA, scalar)\` without \`; vector\` also produces element-wise \`Wbit[n]\` (legacy). Explicit \`; vector\` documents the same semantics.

## Examples

### \`ADD(Xbit a, Xbit b)\`

Increment and wrap at overflow:

\`\`\`logts-play
4wire idx = 0011
4wire inc = 0001
4wire nextIdx, 1wire carry = ADD(idx, inc)
show(nextIdx)
show(carry)
\`\`\`

\`\`\`logts-play
4wire idx2 = 1111
4wire inc2 = 0001
4wire nextIdx2, 1wire carry2 = ADD(idx2, inc2)
show(nextIdx2)
show(carry2)
\`\`\`

\`3+1=4\` → \`nextIdx=0100\`, \`carry=0\`. \`15+1\` wraps → \`nextIdx2=0000\`, \`carry2=1\`.

### \`ADD(Xbit a, Xbit b; signed)\`

\`7+1\` on 4 bits: same result bits; overflow flag differs from unsigned carry.

\`\`\`logts-play
4wire acc = 0111
4wire delta = 0001
4wire nextU, 1wire carry = ADD(acc, delta)
4wire nextS, 1wire ovf = ADD(acc, delta; signed)
show(nextU)
show(carry)
show(nextS)
show(ovf)
\`\`\`

### \`ADD(8bit a, 8bit b; q4p4)\`

Fixed-point Q4.4: \`1.5 + 0.5 = 2.0\` on 8-bit wires.

\`\`\`logts-play
8wire a = 00011000
8wire b = 00001000
8wire s, 4wire st = ADD(a, b; q4p4)
show(s; q4p4)
show(st)
\`\`\`

### \`ADD(16bit a, 16bit b; fp16)\`

IEEE half-precision add (\`1.0 + 2.0 = 3.0\`):

\`\`\`logts-play
16wire a = 0011110000000000
16wire b = 0100000000000000
16wire s, 1wire flag = ADD(a, b; fp16)
show(s; fp16)
show(flag)
\`\`\`

### \`ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

Per-index sum and carry flags:

\`\`\`logts-play
4wire[2] vectorA = 0011 + 0101
4wire[2] vectorB = 0001 + 0011
4wire[2] r, 4wire[2] f = ADD(vectorA, vectorB; vector)
show(r)
show(f)
\`\`\`

### \`ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)\`

Signed element-wise add (overflow per index):

\`\`\`logts-play
4wire[2] vectorA = 1111 + 0111
4wire[2] vectorB = 0001 + 0001
4wire[2] r, 4wire[2] ovf = ADD(vectorA, vectorB; vector signed)
show(r)
show(ovf)
\`\`\`

### \`ADD(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] r, 4wire[2,2] f = ADD(m, 0001; matrix)
show(r)
show(f)
\`\`\`

Row broadcast:

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[1,2] row = 0001 + 0010
4wire[2,2] r, 4wire[2,2] f = ADD(m, row; matrix)
show(r)
\`\`\`

Same via row slice (\`m:0\` ≡ row \`0\`):

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] r, 4wire[2,2] f = ADD(m, m:0; matrix)
show(r)
\`\`\`

### \`ADD(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0111 + 0001 + 1000
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] f = ADD(a, b; matrix signed)
show(r)
show(f)
\`\`\`

## See also

[SUBTRACT](builtin-SUBTRACT.md) · [MAC](builtin-MAC.md) · \`comp [adder]\`
`,
    'builtin-ARGMAX.md': `# ARGMAX

Index: [Vector reduction](vector-reduction.md) · [Matrix axis reduction](matrix-reduction.md#axis-reduction-row--col) · [Tagged built-ins](builtin-tagged-index.md)

Position of the maximum element in a wire vector or matrix (one-hot or index).

## Signatures

\`\`\`
ARGMAX(Wbit[n] vector) -> 1wire[n]
ARGMAX(Wbit[n] vector; index) -> bitIndexWidth(n) bit
ARGMAX(Wbit[n] vector; signed) -> 1wire[n]
ARGMAX(Wbit[n] vector; q4p4) -> 1wire[n]
ARGMAX(Wbit[n] vector; index signed) -> bitIndexWidth(n) bit
ARGMAX(Wbit[n] vector; index q4p4) -> bitIndexWidth(n) bit
ARGMAX(Wbit[n,m] matrix) -> 1wire[n×m]
ARGMAX(Wbit[n,m] matrix; index) -> bit rows, bit cols
ARGMAX(Wbit[n,m] m ; row) -> 1wire[n×m]
ARGMAX(Wbit[n,m] m ; row; index) -> bitIndexWidth(m) wire[n]
ARGMAX(Wbit[n,m] m ; col) -> 1wire[n×m]
ARGMAX(Wbit[n,m] m ; col; index) -> bitIndexWidth(n) wire[m]
\`\`\`

**No \`; vector\` tag** — the argument is already a whole tensor. Applies to any **rank-1** tensor (\`Wwire[N]\`, \`Wwire[1,N]\`, \`Wwire[N,1]\`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default (rank-1) | \`1wire[n]\` | **One-hot** mask (\`1\` at winning index) |
| \`index\` (rank-1) | \`bitIndexWidth(n)\` | Unsigned index of maximal element |
| whole matrix | \`1wire[n×m]\` | One-hot over all cells |
| matrix \`; index\` | \`bit rows\`, \`bit cols\` | Row and column index of global max |
| \`; row\` | \`1wire[n×m]\` | One \`1\` per row at the maximal column |
| \`; row; index\` | \`bitIndexWidth(m) wire[n]\` | Column index per row |
| \`; col\` | \`1wire[n×m]\` | One \`1\` per column at the maximal row |
| \`; col; index\` | \`bitIndexWidth(n) wire[m]\` | Row index per column |
| \`signed\` | (any of above) | Signed compare |
| \`q4p4\` | (rank-1 modes above) | Q4.4 compare on **8-bit** elements |

**Ties:** lowest index wins. For the **value** at max, use [MAX](builtin-MAX.md).

**\`; row\` / \`; col\`** are mutually exclusive with **\`; vector\`** and **\`; matrix\`**. On rank-1 tensors without axis tags: \`use scalar ARGMAX without col|row tag\`.

## Examples

### \`ARGMAX(Wbit[n] vector)\`

\`\`\`logts-play
4wire[4] v = 0010 + 1000 + 1000 + 0001
1wire[4] hot = ARGMAX(v)
show(hot)
\`\`\`

Max \`8\` at indices 1 and 2 → one-hot \`0100\` (index 1 wins).

### \`ARGMAX(Wbit[n] vector; index)\`

\`\`\`logts-play
4wire[4] v = 0010 + 1000 + 1000 + 0001
2wire idx = ARGMAX(v; index)
show(idx)
\`\`\`

→ \`idx=01\`.

### \`ARGMAX(Wbit[n,m] m ; row; index)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[2] idx = ARGMAX(m; row; index)
show(idx)
\`\`\`

Column index of max per row → \`11\` (both rows peak at column 1).

### \`ARGMAX(Wbit[n,m] m ; row)\` (one-hot)

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[4] hot = ARGMAX(m; row)
show(hot)
\`\`\`

One \`1\` per row in row-major \`1wire[n×m]\` → \`0101\`.

### \`ARGMAX(Wbit[n] vector; signed)\`

\`\`\`logts-play
4wire[3] v = 1111 + 0010 + 0100
1wire[3] hot = ARGMAX(v; signed)
show(hot)
\`\`\`

Signed max is \`0100\` at index 2 → \`hot=001\`.

### \`ARGMAX(Wbit[n] vector; index q4p4)\`

\`\`\`logts-play
8wire[3] v = 00001000 + 00011000 + 00010000
2wire idx = ARGMAX(v; index q4p4)
show(idx)
\`\`\`

Max \`1.5\` at index 1 → \`idx=01\`.

## See also

[ARGMIN](builtin-ARGMIN.md) · [MAX](builtin-MAX.md) · [matrix-reduction.md](matrix-reduction.md)
`,
    'builtin-ARGMIN.md': `# ARGMIN

Index: [Vector reduction](vector-reduction.md) · [Matrix axis reduction](matrix-reduction.md#axis-reduction-row--col) · [Tagged built-ins](builtin-tagged-index.md)

Position of the minimum element in a wire vector or matrix (one-hot or index).

## Signatures

\`\`\`
ARGMIN(Wbit[n] vector) -> 1wire[n]
ARGMIN(Wbit[n] vector; index) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n] vector; signed) -> 1wire[n]
ARGMIN(Wbit[n] vector; q4p4) -> 1wire[n]
ARGMIN(Wbit[n] vector; index signed) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n] vector; index q4p4) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n,m] matrix) -> 1wire[n×m]
ARGMIN(Wbit[n,m] matrix; index) -> bit rows, bit cols
ARGMIN(Wbit[n,m] m ; row) -> 1wire[n×m]
ARGMIN(Wbit[n,m] m ; row; index) -> bitIndexWidth(m) wire[n]
ARGMIN(Wbit[n,m] m ; col) -> 1wire[n×m]
ARGMIN(Wbit[n,m] m ; col; index) -> bitIndexWidth(n) wire[m]
\`\`\`

**No \`; vector\` tag** — the argument is already a whole tensor. Applies to any **rank-1** tensor (\`Wwire[N]\`, \`Wwire[1,N]\`, \`Wwire[N,1]\`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default (rank-1) | \`1wire[n]\` | One-hot at minimal index |
| \`index\` (rank-1) | \`bitIndexWidth(n)\` | Index of minimal element |
| whole matrix | \`1wire[n×m]\` | One-hot over all cells |
| matrix \`; index\` | \`bit rows\`, \`bit cols\` | Row and column index of global min |
| \`; row\` | \`1wire[n×m]\` | One \`1\` per row at the minimal column |
| \`; row; index\` | \`bitIndexWidth(m) wire[n]\` | Column index per row |
| \`; col\` | \`1wire[n×m]\` | One \`1\` per column at the minimal row |
| \`; col; index\` | \`bitIndexWidth(n) wire[m]\` | Row index per column |
| \`signed\` | (any of above) | Signed compare |
| \`q4p4\` | (rank-1 modes above) | Q4.4 compare on **8-bit** elements |

**Ties:** lowest index wins.

**\`; row\` / \`; col\`** are mutually exclusive with **\`; vector\`** and **\`; matrix\`**. On rank-1 tensors without axis tags: \`use scalar ARGMIN without col|row tag\`.

## Examples

### \`ARGMIN(Wbit[n] vector)\`

\`\`\`logts-play
4wire[3] v = 0100 + 0001 + 0001
1wire[3] hot = ARGMIN(v)
show(hot)
\`\`\`

Min \`1\` at indices 1 and 2 → one-hot \`010\`.

### \`ARGMIN(Wbit[n,m] m ; row; index)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[2] idx = ARGMIN(m; row; index)
show(idx)
\`\`\`

Column index of min per row → \`00\` (both rows minimal at column 0).

### \`ARGMIN(Wbit[n] vector; signed)\`

\`\`\`logts-play
4wire[3] v = 1111 + 0010 + 1100
1wire[3] hot = ARGMIN(v; signed)
show(hot)
\`\`\`

Signed min \`1100\` (−4) at index 2 → \`hot=010\`.

### \`ARGMIN(Wbit[n] vector; index q4p4)\`

\`\`\`logts-play
8wire[3] v = 00011000 + 00001000 + 00010000
2wire idx = ARGMIN(v; index q4p4)
show(idx)
\`\`\`

Min \`0.5\` at index 1 → \`idx=01\`.

## See also

[ARGMAX](builtin-ARGMAX.md) · [MIN](builtin-MIN.md) · [matrix-reduction.md](matrix-reduction.md)
`,
    'builtin-bit-analysis-functions.md': `# Built-in bit analysis functions

Counting, parity, and size helpers on arbitrary-width bit strings.

Index: [builtin-functions.md](builtin-functions.md)

---

## PARITY

Returns \`1\` when the number of set bits is **odd** (XOR fold across all bits).

\`\`\`
PARITY(Xbit value) -> 1bit
\`\`\`

### Examples

| Input | Result |
|-------|--------|
| \`PARITY(1011)\` | \`1\` |
| \`PARITY(1110)\` | \`1\` |
| \`PARITY(1010)\` | \`0\` |

### Runnable example

\`\`\`logts-play
4wire data = 1011
1wire p = PARITY(data)
probe(p)
\`\`\`

---

## CNTONE

Counts how many bits are \`1\`. Returns the count as a binary value (minimal width, unpadded).

\`\`\`
CNTONE(Xbit value) -> Ybit
\`\`\`

### Example

\`\`\`
CNTONE(00101010) -> 11    # 3 ones
\`\`\`

### Runnable example

\`\`\`logts-play
8wire data = 00101010
2wire n = CNTONE(data)
show(n)
\`\`\`

---

## CNTZERO

Counts how many bits are \`0\`.

\`\`\`
CNTZERO(Xbit value) -> Ybit
\`\`\`

### Example

\`\`\`
CNTZERO(0101010) -> 100   # 4 zeros (7-bit input)
\`\`\`

### Runnable example

\`\`\`logts-play
7wire data = 0101010
3wire z = CNTZERO(data)
probe(z)
\`\`\`

---

## BITSIZE

Returns the **length** of the bit string as a binary number (not the numeric value of the bits).

\`\`\`
BITSIZE(Xbit value) -> Ybit
\`\`\`

### Example

\`\`\`
BITSIZE(0101010) -> 111   # 7 bits long
\`\`\`

### Runnable example

\`\`\`logts-play
7wire data = 0101010
3wire len = BITSIZE(data)
show(len)
\`\`\`
`,
    'builtin-bit-selection-functions.md': `# Built-in bit selection and detection functions

These built-ins operate on arbitrary-width binary values. Useful for priority selection, interrupt handling, one-hot encoding, bit scanning, masking, and state decoding.

Index: [builtin-functions.md](builtin-functions.md)

---

## HIGH

Returns the highest (most significant) bit that is set to \`1\`. All other bits become \`0\`.

\`\`\`
HIGH(Xbit value) -> Xbit
\`\`\`

### Examples

| Input | Result |
|-------|--------|
| \`HIGH(00101010)\` | \`00100000\` |
| \`HIGH(00010000)\` | \`00010000\` |
| \`HIGH(00000000)\` | \`00000000\` |

### Runnable example

\`\`\`logts-play
8wire requests = 00101010
8wire winner = HIGH(requests)
probe(winner)
show(winner)
\`\`\`

**Typical uses:** interrupt priority selection, highest-priority request detection, bus arbitration.

---

## LOW

Returns the lowest (least significant) bit that is set to \`1\`.

\`\`\`
LOW(Xbit value) -> Xbit
\`\`\`

### Examples

| Input | Result |
|-------|--------|
| \`LOW(00101010)\` | \`00000010\` |
| \`LOW(00010000)\` | \`00010000\` |
| \`LOW(00000000)\` | \`00000000\` |

### Runnable example

\`\`\`logts-play
8wire requests = 00101010
8wire picked = LOW(requests)
probe(picked)
\`\`\`

**Typical uses:** lowest-priority selection, round-robin allocators, bit scanning.

---

## ANY

Returns whether any bit is set (\`1\` if at least one bit is \`1\`).

\`\`\`
ANY(Xbit value) -> 1bit
\`\`\`

Equivalent to \`OR(value)\` (fold).

### Runnable example

\`\`\`logts-play
8wire requests = 00101010
1wire pending = ANY(requests)
probe(pending)
\`\`\`

---

## ZERO

Returns whether all bits are zero (\`1\` when every bit is \`0\`).

\`\`\`
ZERO(Xbit value) -> 1bit
\`\`\`

Equivalent to \`NOT(ANY(value))\`.

### Runnable example

\`\`\`logts-play
8wire status = 00000000
1wire empty = ZERO(status)
show(empty)
\`\`\`

---

## ANY* and ALL* (ZSTATE-aware bit predicates)

Test whether **any** (\`ANY*\`) or **all** (\`ALL*\`) bits in a value match a given logic state. Accepts \`wire\`, literal, or bit-range (\`wire.i-j\`). Works in normal binary mode and in \`MODE ZSTATE\` (with \`Z\` / \`X\`).

| Function | True (\`1\`) when |
|----------|-----------------|
| \`ANYZ\` / \`ANYZX\` | at least one bit is \`Z\` or \`X\` (\`ANYZ\` is alias for \`ANYZX\`) |
| \`ANYX\` | at least one bit is \`X\` |
| \`ANY1\` | at least one bit is \`1\` |
| \`ANY0\` | at least one bit is \`0\` |
| \`ANY01\` / \`ANY10\` | at least one bit is \`0\` or \`1\` |
| \`ALLZ\` | every bit is \`Z\` |
| \`ALLX\` | every bit is \`X\` |
| \`ALL1\` | every bit is \`1\` |
| \`ALL0\` | every bit is \`0\` |
| \`ALL01\` / \`ALL10\` | every bit is \`0\` or \`1\` |
| \`ALLZX\` / \`ALLXZ\` | every bit is \`Z\` or \`X\` |

\`\`\`
ANYZ(Xbit) -> 1bit     # alias ANYZX
ANYZX(Xbit) -> 1bit
ALLZX(Xbit) -> 1bit    # alias ALLXZ
\`\`\`

Empty input: \`ANY* → 0\`, \`ALL* → 1\` (vacuous).

### Runnable example (ZSTATE)

\`\`\`logts-play
MODE ZSTATE
4wire bus = ?ZZ10
1wire hasZ = ANYZX(bus)
1wire allHighZ = ALLZ(bus.0-1)
probe(hasZ)
probe(allHighZ)
\`\`\`

\`doc(def)\` lists \`ANY*, ALL*\` on the built-in line and \`(* = 0/1/01/10/Z/X/ZX/XZ)\` on the next. Per-function signatures: \`doc(ANY0)\`, \`doc(ALLZX)\`, etc.

---

## BITINDEX

Returns the index of the active bit (LSB = bit \`0\`). Input is **typically** one-hot; when zero or multiple bits are set, \`isInvalid = 1\` and \`index\` is all zeros.

\`\`\`
BITINDEX(Xbit value) -> Ybit index, 1bit isInvalid
\`\`\`

\`Y\` = number of bits needed to encode indices \`0 … len(value)-1\`.

### Examples

| Input | index | isInvalid |
|-------|-------|-----------|
| \`BITINDEX(00000001)\` | \`000\` | \`0\` |
| \`BITINDEX(00000100)\` | \`010\` | \`0\` |
| \`BITINDEX(00100000)\` | \`101\` | \`0\` |
| \`BITINDEX(000)\` | \`00\` | \`1\` |

Assign both return values:

\`\`\`
2wire q, 1wire isInvalid = BITINDEX(100)
\`\`\`

### Runnable example

\`\`\`logts-play
8wire winner = 00100000
3wire idx, 1wire bad = BITINDEX(winner)
probe(idx)
probe(bad)
\`\`\`

---

## ONEHOT

Converts a binary index into a one-hot value (exactly one bit set).

\`\`\`
ONEHOT(Xbit index) -> 2^X bits
\`\`\`

Output width = \`2^(width of index)\`.

### Examples

| Input | Result |
|-------|--------|
| \`ONEHOT(000)\` | \`00000001\` |
| \`ONEHOT(001)\` | \`00000010\` |
| \`ONEHOT(101)\` | \`00100000\` |
| \`ONEHOT(111)\` | \`10000000\` |

### Runnable example

\`\`\`logts-play
3wire sel = 101
8wire line = ONEHOT(sel)
show(line)
\`\`\`

---

## BITINDEX and ONEHOT (inverses)

\`\`\`
BITINDEX(ONEHOT(x))  ->  (x, 0)   # when x is in range
\`\`\`

---

## Building a priority encoder

A dedicated priority encoder built-in is usually unnecessary:

\`\`\`
8wire requests = 00101010
8wire winner = HIGH(requests)
1wire valid  = ANY(requests)
3wire index, 1wire bad = BITINDEX(winner)
# winner = 00100000, valid = 1, index = 101, bad = 0
\`\`\`

### Runnable example

\`\`\`logts-play
8wire requests = 00101010
8wire winner = HIGH(requests)
1wire valid = ANY(requests)
3wire index, 1wire bad = BITINDEX(winner)
probe(winner)
probe(valid)
probe(index)
probe(bad)
\`\`\`
`,
    'builtin-bit-transform-functions.md': `# Built-in bit transform functions

Shift, rotate, and reverse operations on bit strings.

Index: [builtin-functions.md](builtin-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md) · Short notation (\`<\`, \`>\`): [short-notation.md](short-notation.md)

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| LSHIFT | [builtin-LSHIFT.md](builtin-LSHIFT.md) | \`vector\`, \`matrix\` |
| RSHIFT | [builtin-RSHIFT.md](builtin-RSHIFT.md) | \`signed\`, \`vector\`, \`matrix\` |
| LROTATE | [builtin-LROTATE.md](builtin-LROTATE.md) | \`vector\`, \`matrix\` |
| RROTATE | [builtin-RROTATE.md](builtin-RROTATE.md) | \`vector\`, \`matrix\` |
| REVERSE | [builtin-REVERSE.md](builtin-REVERSE.md) | \`vector\`, \`matrix\` |

---

## Quick reference

**LSHIFT** — logical left; optional third arg **\`fill\`** (default \`0\`); width grows. Vector: scalar count only. Sugar: \`data < n\`.

**RSHIFT** — logical right; optional **\`fill\`**; same width. With **\`; signed\`**, ASHR (\`fill\` ignored). Vector: scalar or **\`Kbit[n]\`** count. Sugar: \`data > n\`.

**REVERSE** — MSB ↔ LSB within each operand.

**LROTATE** / **RROTATE** — circular rotate; \`count\` taken modulo width.

Vector mode: per-element operation; shift/rotate **count** is usually a scalar broadcast (see each page). \`RSHIFT\` may use per-index \`Kbit[n]\` counts. **\`; matrix\`**: same ops per cell on \`4wire[N,M]\` — [matrix-reduction.md](matrix-reduction.md).

\`\`\`logts-play
4wire neg = 1111
4wire log = RSHIFT(neg, 1)
4wire arith = RSHIFT(neg, 1; signed)
show(log)
show(arith)
\`\`\`

\`1111\` logical → \`0111\`; arithmetic → \`1111\`.

Use \`doc(LSHIFT)\` … \`doc(RROTATE)\` for live signatures from \`Interpreter.BUILTIN_DOC\`.
`,
    'builtin-CLAMP.md': `# CLAMP

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Clamp value to \`[min, max]\`.

## Signatures

\`\`\`
CLAMP(Xbit x, Ybit min, Ybit max) -> Ybit
CLAMP(Xbit x, Ybit min, Ybit max; signed) -> Ybit
CLAMP(8bit x, 8bit min, 8bit max; q4p4) -> 8bit
CLAMP(16bit x, 16bit min, 16bit max; q8p8) -> 16bit
CLAMP(16bit x, 16bit min, 16bit max; fp16) -> 16bit
CLAMP(16bit x, 16bit min, 16bit max; bf16) -> 16bit
CLAMP(Wbit[n] x, Wbit/Wbit[n] min, Wbit/Wbit[n] max ; vector) -> Wbit[n]
CLAMP(Wbit[n] x, Wbit/Wbit[n] min, Wbit/Wbit[n] max ; vector signed) -> Wbit[n]
CLAMP(Wbit[n,m] x, Wbit/Wbit[n,m]/scalar min, Wbit/Wbit[n,m]/scalar max ; matrix) -> Wbit[n,m]
CLAMP(Wbit[n,m] x, … ; matrix signed) -> Wbit[n,m]
\`\`\`

\`min\` and \`max\` must have equal width **Y**; \`x\` may be wider (compare at \`len(x)\` with bounds zero-extended).

## Scalar (default)

- If \`x < min\` → \`min\`; if \`x > max\` → \`max\`; else \`x\` (unsigned), result width **Y**

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed bounds. |
| \`q4p4\` | Q4.4 bounds on **8-bit** wires. |
| \`q8p8\` | Q8.8 bounds on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float clamp on **16-bit** wires. |
| \`vector\` | Per index on **rank-1** tensors; bounds broadcast if scalar. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; bounds broadcast as rank-1 row/col/scalar. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`CLAMP(Xbit x, Ybit min, Ybit max)\`

\`\`\`logts-play
4wire val = 1111
4wire lo = 0001
4wire hi = 1000
4wire c = CLAMP(val, lo, hi)
show(c)
\`\`\`

\`15\` clamped to \`8\` → \`1000\`.

Wider value narrowed to 8 bits:

\`\`\`logts-play
16wire x = 0000000100101100
8wire zero = 00000000
8wire max255 = 11111111
8wire y = CLAMP(x, zero, max255)
show(y)
\`\`\`

\`300\` → \`255\`.

### \`CLAMP(Xbit x, Ybit min, Ybit max; signed)\`

\`\`\`logts-play
4wire x = 1111
4wire lo = 0000
4wire hi = 0010
4wire yU = CLAMP(x, lo, hi)
4wire yS = CLAMP(x, lo, hi; signed)
show(yU)
show(yS)
\`\`\`

Unsigned: \`15\` → \`2\`. Signed: \`−1\` → \`0\`.

### \`CLAMP(8bit x, 8bit min, 8bit max; q4p4)\`

\`\`\`logts-play
8wire x = 00110000
8wire lo = 00000000
8wire hi = 00100000
8wire y = CLAMP(x, lo, hi; q4p4)
show(y; q4p4)
\`\`\`

\`3.0\` clamped to \`[0, 2.0]\` → \`2.0\`.

### \`CLAMP(Wbit[n] x, … ; vector)\`

\`\`\`logts-play
4wire[3] vectorX = 1111 + 0100 + 0010
4wire lo = 0001
4wire hi = 1000
4wire[3] y = CLAMP(vectorX, lo, hi; vector)
show(y)
\`\`\`

### \`CLAMP(Wbit[n] x, … ; vector signed)\`

\`\`\`logts-play
4wire[2] vectorX = 1111 + 0100
4wire lo = 0000
4wire hi = 0010
4wire[2] y = CLAMP(vectorX, lo, hi; vector signed)
show(y)
\`\`\`

### \`CLAMP(Wbit[n,m] x, … ; matrix)\`

\`\`\`logts-play
4wire[2,2] x = 1111 + 0100 + 0010 + 1000
4wire lo = 0001
4wire hi = 1000
4wire[2,2] y = CLAMP(x, lo, hi; matrix)
show(y)
\`\`\`

### \`CLAMP(Wbit[n,m] x, … ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] x = 1111 + 0100 + 0010 + 1000
4wire lo = 0000
4wire hi = 0010
4wire[2,2] y = CLAMP(x, lo, hi; matrix signed)
show(y)
\`\`\`

## See also

[MIN](builtin-MIN.md) · [MAX](builtin-MAX.md)
`,
    'builtin-DIAG.md': `# DIAG (diagonal matrix)

Index: [2D tensors](wire-vectors.md)

Build a square matrix from a vector on the **diagonal**; off-diagonal cells are **0**.

## Signatures

\`\`\`
DIAG(Wwire[n] vector) -> Wwire[n,n]
\`\`\`

Vector length **n** must match target **n×n**. Element width **W** must match.

## Examples

\`\`\`logts-play
4wire[3] v = 0001 + 0010 + 0100
4wire[3,3] d = DIAG(v)
4wire x = d:1:1
show(x)
\`\`\`

## See also

[IDENTITY](builtin-IDENTITY.md) · [TRACE](builtin-TRACE.md)
`,
    'builtin-DIVIDE.md': `# DIVIDE

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Integer quotient and remainder (no floating-point).

## Signatures

\`\`\`
DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
DIVIDE(Xbit a, Xbit b; signed) -> Xbit result, Xbit mod
DIVIDE(8bit a, 8bit b; q4p4) -> 8bit result, 8bit mod
DIVIDE(16bit a, 16bit b; q8p8) -> 16bit result, 16bit mod
DIVIDE(16bit a, 16bit b; fp16) -> 16bit result, 16bit mod
DIVIDE(16bit a, 16bit b; bf16) -> 16bit result, 16bit mod
DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
\`\`\`

## Scalar (default)

- \`result\` = \`floor(a / b)\` masked to \`N\` bits
- \`mod\` = \`a % b\` masked to \`N\` bits
- If \`b = 0\`, both outputs are \`0\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Operands as two's complement; integer \`/\` and \`%\`. |
| \`q4p4\` | Fixed-point Q4.4 on **8-bit** wires. |
| \`q8p8\` | Fixed-point Q8.8 on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float divide on **16-bit** wires. |
| \`vector\` | Quotient and remainder per index on **rank-1** tensors. |
| \`matrix\` | Quotient and remainder per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`DIVIDE(Xbit a, Xbit b)\`

\`\`\`logts-play
4wire a = 0110
4wire b = 0010
4wire q, 4wire m = DIVIDE(a, b)
show(q)
show(m)
\`\`\`

\`6/2=3\`, remainder \`0\`.

\`\`\`logts-play
4wire a2 = 0111
4wire b2 = 0010
4wire q2, 4wire m2 = DIVIDE(a2, b2)
show(q2)
show(m2)
\`\`\`

\`7/2=3\`, remainder \`1\`.

\`\`\`logts-play
4wire a3 = 0110
4wire b3 = 0000
4wire q3, 4wire m3 = DIVIDE(a3, b3)
show(q3)
show(m3)
\`\`\`

Divide by zero → both \`0\`.

### \`DIVIDE(Xbit a, Xbit b; signed)\`

\`\`\`logts-play
4wire a = 1111
4wire b = 0010
4wire q, 4wire m = DIVIDE(a, b; signed)
show(q)
show(m)
\`\`\`

Signed \`−1 / 2 = 0\`, remainder \`−1\` (\`1111\`).

### \`DIVIDE(8bit a, 8bit b; q4p4)\`

\`\`\`logts-play
8wire a = 00100000
8wire b = 00001000
8wire q, 8wire m = DIVIDE(a, b; q4p4)
show(q; q4p4)
show(m; q4p4)
\`\`\`

\`2.0/0.5=4.0\`, remainder \`0\`.

### \`DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

\`\`\`logts-play
4wire[3] vectorA = 0110 + 0111 + 0001
4wire[3] vectorB = 0010 + 0010 + 0011
4wire[3] q, 4wire[3] m = DIVIDE(vectorA, vectorB; vector)
show(q)
show(m)
\`\`\`

### \`DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)\`

\`\`\`logts-play
4wire[2] vectorA = 1111 + 1101
4wire[2] vectorB = 0010 + 0010
4wire[2] q, 4wire[2] m = DIVIDE(vectorA, vectorB; vector signed)
show(q)
show(m)
\`\`\`

### \`DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0110 + 0111 + 0100 + 1000
4wire[2,2] b = 0010 + 0010 + 0010 + 0010
4wire[2,2] q, 4wire[2,2] m = DIVIDE(a, b; matrix)
show(q)
show(m)
\`\`\`

### \`DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 1101 + 0100 + 1000
4wire[2,2] b = 0010 + 0010 + 0010 + 0010
4wire[2,2] q, 4wire[2,2] m = DIVIDE(a, b; matrix signed)
show(q)
show(m)
\`\`\`

## See also

[MULTIPLY](builtin-MULTIPLY.md) · \`comp [divider]\`
`,
    'builtin-DOT.md': `# DOT (dot product)

Index: [Vector reduction](vector-reduction.md) · [2D tensors](wire-vectors.md#dot-and-argmax--argmin-on-tensors) · [Tagged built-ins](builtin-tagged-index.md)

Pairwise multiply and sum along the **inner** dimension: **\`Σ a[k] × b[k]\`**.

On **rank-1** tensors the result is a **scalar**. On compatible **2D** shapes the result is a **matrix** (one dot product per output cell). **No \`; matrix\` tag** — behaviour follows operand shapes automatically.

## Signatures

\`\`\`
DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
DOT(Wbit[n] a, Wbit[n] b; signed) -> Wbit result, (2W)bit over
DOT(8wire[n] a, 8wire[n] b; q4p4) -> 8bit result, 16bit over
DOT(16wire[n] a, 16wire[n] b; q8p8) -> 16bit result, 32bit over
DOT(16wire[n] a, 16wire[n] b; fp16) -> 16bit result, 32bit inexact
DOT(16wire[n] a, 16wire[n] b; bf16) -> 16bit result, 32bit inexact
DOT(Wwire[N,K] a, Wwire[K,M] b) -> Wwire[N,M] result, (2W)wire[N,M] over
DOT(Wwire[N,K] a, Wwire[K,M] b; signed) -> Wwire[N,M] result, (2W)wire[N,M] over
\`\`\`

Rank-1 operands with the same **element count** (\`[N]\`, \`[1,N]\`, \`[N,1]\`) use the scalar dot path. Matrix multiply requires **\`A.cols == B.rows\`** (true 2D shapes).

## Tensor shape rules

| A | B | Result | Inner dim K |
|---|---|--------|-------------|
| rank-1, **N** elements | rank-1, **N** elements | scalar \`Wbit\` + \`(2W)bit over\` | N |
| \`[N,1]\` | \`[1,N]\` or \`[N]\` | scalar | N |
| \`[1,N]\` | \`[N,1]\` | scalar | N |
| \`[N,K]\` | \`[K,M]\` | matrix \`[N,M]\` — \`W\` result/cell, \`2W\` over/cell | K |
| \`[N,1]\` | \`[N,M]\` | matrix \`[N,M]\` (column × matrix) | N |

Incompatible shapes are a **runtime error**. Assign the target to match the output rank (\`4wire\` vs \`4wire[2,2]\` vs \`8wire[2,2]\` for over).

## Scalar / vector output (default)

- \`result\` = low **W** bits of each dot product
- \`over\` = next **2W** bits; full value = \`over\` ‖ \`result\` (per cell on matrices)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed multiply per pair, signed accumulate (scalar or per matrix cell). |
| \`q4p4\` | Rank-1 dot on **8-bit** elements; result **8** bits, \`over\` **16** bits. |
| \`q8p8\` | Rank-1 dot on **16-bit** elements; result **16** bits, \`over\` **32** bits. |
| \`fp16\` / \`bf16\` | Rank-1 dot on **16-bit** float wires; \`over\` = inexact accumulation flag width. |

**No \`; vector\`** or **\`; matrix\`** — whole tensors only. Format tags apply to **rank-1** dot products only (not 2D matrix multiply).

## Examples

### \`DOT(Wbit[n] a, Wbit[n] b)\` — rank-1 → scalar

\`\`\`logts-play
4wire[2] a = 0001 + 0010
4wire[2] b = 0011 + 0100
4wire r, 8wire o = DOT(a, b)
show(r)
show(o)
\`\`\`

\`1×3 + 2×4 = 11\` → \`r=1011\`.

\`\`\`logts-play
4wire[3] vectorA = 0001 + 0010 + 0011
4wire[3] vectorB = 0100 + 0101 + 0110
4wire result, 8wire over = DOT(vectorA, vectorB)
show(result)
show(over)
\`\`\`

Same result for \`4wire[3,1]\`×\`4wire[3,1]\` or mixed rank-1 shapes with three elements.

### \`DOT(Wbit[n] a, Wbit[n] b; signed)\`

\`\`\`logts-play
4wire[2] a = 1111 + 0010
4wire[2] b = 1111 + 0001
4wire r, 8wire o = DOT(a, b; signed)
show(r)
show(o)
\`\`\`

Signed \`(−1)×(−1) + 2×1 = 3\`.

### \`DOT(8wire[n] a, 8wire[n] b; q4p4)\`

\`\`\`logts-play
8wire[2] a = 00011000 + 00001000
8wire[2] b = 00010000 + 00010000
8wire dot, 16wire over = DOT(a, b; q4p4)
show(dot; q4p4)
show(over)
\`\`\`

\`[1.5, 0.5]·[1, 1] = 2.0\`.

### \`DOT(Wwire[N,K] A, Wwire[K,M] B)\` — matrix multiply

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] b = 0101 + 0110 + 0111 + 1000
4wire[2,2] r, 8wire[2,2] o = DOT(a, b)
show(r)
show(o)
\`\`\`

Each output cell \`(i,j)\` is \`DOT(row i of A, col j of B)\`. **\`over\`** is **\`8wire[2,2]\`** here ( **\`2W\`** bits per cell).

### \`DOT(A, IDENTITY(\\N))\` — identity on the right

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] eye = IDENTITY(\\2)
4wire[2,2] r, 8wire[2,2] o = DOT(a, eye)
show(r)
\`\`\`

\`DOT(a, I) = a\` (same low **W** bits per cell). See [builtin-IDENTITY.md](builtin-IDENTITY.md).

### \`DOT(col, row)\` — column × row → scalar

\`\`\`logts-play
4wire[3,1] col = 0001 + 0010 + 0011
4wire[3] row = 0100 + 0101 + 0110
4wire r, 8wire o = DOT(col, row)
show(r)
show(o)
\`\`\`

\`[N,1]\` × \`[1,N]\` contracts to one scalar (\`N\` products summed).

### \`DOT(col, row; signed)\` — signed contraction

\`\`\`logts-play
4wire[2,1] col = 1111 + 0010
4wire[2] row = 1111 + 0001
4wire r, 8wire o = DOT(col, row; signed)
show(r)
show(o)
\`\`\`

## See also

[MAC](builtin-MAC.md) · [SUM](builtin-SUM.md) · [OUTER](builtin-OUTER.md) · [IDENTITY](builtin-IDENTITY.md)
`,
    'builtin-EQ.md': `# EQ (equality)

Index: [Logic gates](builtin-logic-gate-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise \`; vector\`](vector-reduction.md#element-wise-mode-vector) · [Matrix \`; matrix\`](matrix-reduction.md)

Bitwise equality (all bits of each operand must match).

## Signatures

\`\`\`
EQ(Xbit a, Xbit b) -> 1bit result
EQ(Xbit a, Xbit b, Xbit c, ...) -> 1bit result
EQ(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
EQ(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> 1wire[n×m]
\`\`\`

- **Two operands:** \`1\` if every bit pair matches (bitwise).
- **Three or more operands (no tag):** \`1\` only if **all** operands are bitwise equal pairwise.
- **\`; vector\`:** exactly **two** arguments; compare per index → \`1wire[n]\`.
- **\`; matrix\`:** exactly **two** arguments; compare per cell → **\`1wire[N×M]\`** (bitwise equality of each cell).

## Scalar (default)

- Bitwise compare; width mismatch uses left zero-padding (same as other logic gates).

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`vector\` | Per index on **rank-1** tensors: \`a[i] == b[i]\` → \`1wire[n]\`. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\` → \`1wire[N×M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

**No \`; signed\` tag** — equality is bitwise.

## Examples

### \`EQ(Xbit a, Xbit b)\`

\`\`\`logts-play
4wire a = 1010
4wire b = 1010
1wire eq = EQ(a, b)
show(eq)
\`\`\`

\`\`\`logts-play
4wire x = 1010
4wire y = 1011
1wire diff = EQ(x, y)
show(diff)
\`\`\`

### \`EQ(Xbit a, Xbit b, Xbit c, ...)\`

All operands must match:

\`\`\`logts-play
4wire a = 0011
4wire b = 0011
4wire c = 0011
1wire allEq = EQ(a, b, c)
show(allEq)
\`\`\`

\`\`\`logts-play
4wire p = 0101
4wire q = 0101
4wire r = 0111
1wire notAll = EQ(p, q, r)
show(notAll)
\`\`\`

→ \`allEq=1\`, \`notAll=0\`.

### \`EQ(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

\`\`\`logts-play
4wire[3] a = 0001 + 0010 + 0011
4wire[3] b = 0001 + 0011 + 0011
1wire[3] eqv = EQ(a, b; vector)
show(eqv)
\`\`\`

→ \`1,0,1\` per index.

Scalar broadcast:

\`\`\`logts-play
4wire[2] vectorA = 0010 + 0010
4wire scalar = 0010
1wire[2] flags = EQ(vectorA, scalar; vector)
show(flags)
\`\`\`

→ \`11\`.

### \`EQ(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0001 + 0010 + 0100 + 1000
1wire[4] eqv = EQ(a, b; matrix)
show(eqv)
\`\`\`

→ \`1111\` (all four cells equal).

## See also

[GT](builtin-GT.md) · [LT](builtin-LT.md) · [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md)
`,
    'builtin-FILL.md': `# FILL (constant matrix)

Index: [2D tensors](wire-vectors.md)

Fill every cell of an **N×N** matrix with the same scalar value.

## Signatures

\`\`\`
FILL(\\N, Wbit scalar) -> Wwire[N,N]
\`\`\`

- **\`\\N\`** — matrix dimension (must match target).
- **scalar** — any **W**-bit expression (literal, wire, or slice).

## Examples

\`\`\`logts-play
4wire[2,2] m = FILL(\\2, 0011)
show(m)
\`\`\`

## See also

[ZEROS](builtin-ZEROS.md) · [IDENTITY](builtin-IDENTITY.md)
`,
    'builtin-FLIPLR.md': `# FLIPLR (flip columns)

Index: [2D tensors](wire-vectors.md)

Reverse **column** order within each row (horizontal mirror).

## Signatures

\`\`\`
FLIPLR(Wwire tensor) -> Wwire tensor
\`\`\`

## Examples

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] lr = FLIPLR(m)
show(lr)
\`\`\`

## See also

[FLIPUD](builtin-FLIPUD.md)
`,
    'builtin-FLIPUD.md': `# FLIPUD (flip rows)

Index: [2D tensors](wire-vectors.md)

Reverse **row** order (vertical flip). Same shape as input.

## Signatures

\`\`\`
FLIPUD(Wwire tensor) -> Wwire tensor
\`\`\`

## Examples

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] ud = FLIPUD(m)
show(ud)
\`\`\`

## See also

[FLIPLR](builtin-FLIPLR.md) · [PIVOT](wire-vectors.md#pivot)
`,
    'builtin-functions.md': `# Built-in functions (internal)

LogTscript provides **built-in functions** — combinational or stateful primitives invoked directly in expressions (\`OR(a, b)\`, \`MUX(sel, a, b)\`, \`REG(data, clk, clr)\`, …). They have no panel device; use \`doc(Name)\` for the live signature.

\`\`\`
doc(def)          # list all built-ins and user-defined functions
doc(MUX)          # signature of one built-in
\`\`\`

Full \`doc()\` reference: [doc-function.md](doc-function.md).

---

## Index by category

| Category | Functions | Detail |
|----------|-----------|--------|
| **Logic gates** | \`NOT\`, \`AND\`, \`OR\`, \`XOR\`, \`NXOR\`, \`NAND\`, \`NOR\`, \`EQ\` | [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md) · \`EQ\` tags: [builtin-EQ.md](builtin-EQ.md) |
| **Sequential** | \`LATCH\`, \`REG\` | [builtin-sequential-functions.md](builtin-sequential-functions.md) · \`REG\` → [reg.md](reg.md) |
| **Routing** | \`MUX\`, \`DEMUX\` | [builtin-routing-functions.md](builtin-routing-functions.md) |
| **Arithmetic** | \`ADD\`, \`SUBTRACT\`, \`MULTIPLY\`, \`DIVIDE\`, \`MAC\`, \`ABS\`, \`NFORMAT\`, \`GT\`, \`LT\`, \`MIN\`, \`MAX\`, \`CLAMP\` | [arithmetic.md](arithmetic.md) · tags \`; vector\` / **\`; matrix\`**: [builtin-tagged-index.md](builtin-tagged-index.md) |
| **Vector reduction** | \`SUM\`, \`DOT\`, \`ARGMAX\`, \`ARGMIN\` | [vector-reduction.md](vector-reduction.md) · **\`; matrix\`** (element-wise 2D): [matrix-reduction.md](matrix-reduction.md) |
| **Tensor / matrix** | \`SHAPE\`, \`RANK\`, \`PIVOT\`, \`REPEAT\`, \`IDENTITY\`, \`ZEROS\`, \`FILL\`, \`DIAG\`, \`IOTA\`, \`OUTER\`, \`TRACE\`, \`NORM\`, \`L2\`, \`TRIL\`, \`TRIU\`, \`FLIPUD\`, \`FLIPLR\`, \`MCAT\`, \`MSLICE\` | [wire-vectors.md](wire-vectors.md) · [builtin-SHAPE.md](builtin-SHAPE.md) · [builtin-RANK.md](builtin-RANK.md) · [builtin-REPEAT.md](builtin-REPEAT.md) |
| **Number conversion** | \`CNTN10S\`, \`N2N10S\`, \`N10S2N\`, \`CNTN16S\`, \`N2N16S\`, \`N16S2N\`, \`ISDIGIT\` | [number-conversion.md](number-conversion.md) |
| **Bit selection** | \`HIGH\`, \`LOW\`, \`ANY\`, \`ZERO\`, \`ANY*\`, \`ALL*\`, \`BITINDEX\`, \`ONEHOT\` | [builtin-bit-selection-functions.md](builtin-bit-selection-functions.md) |
| **Bit analysis** | \`PARITY\`, \`CNTONE\`, \`CNTZERO\`, \`BITSIZE\` | [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md) |
| **Bit transform** | \`LSHIFT\`, \`RSHIFT\`, \`REVERSE\`, \`LROTATE\`, \`RROTATE\` | [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md) · \`RSHIFT\` \`; signed\` = ASHR · **\`; matrix\`**: [matrix-reduction.md](matrix-reduction.md) |
| **Tristate (ZSTATE)** | \`ZRELEASE(wire)\`, \`bus = ZCONNECT(en, data)\` | [zstate.md](zstate.md) |

> **Adding new built-ins:** extend \`Interpreter.BUILTIN_DOC\` in \`core/interpreter.js\`, implement evaluation in the same file, add a row to the table above, and document behaviour in the matching category file.

### \`ZRELEASE(wireName)\` — tristate release

Statement available only after \`MODE ZSTATE\` — see [script modes](modes.md) and [zstate.md](zstate.md). **Withdraws all drivers** on the wire for the current step; resolved value is \`Z\`. A following **\`ZCONNECT\`** or **\`bus = data w1 en\`** in the same run may drive again. Wire names \`z\`, \`Z\`, and \`ZZZ\` are allowed — only the keyword \`ZRELEASE\` is reserved.

\`\`\`logts-play wave
MODE ZSTATE
1wire en = 1
ZRELEASE(en)
show(en)
\`\`\`

See **[zstate.md](zstate.md)** for multi-driver buses, \`ZCONNECT\`, conflict \`X\`, and IEEE logic gates.

### \`ZCONNECT(en, data)\` — enable-gated bus drive

Wire assignment expression (alias **\`ZCONN\`**). Requires \`MODE ZSTATE\` + wave. When \`en\` is strict \`1\`, queues \`data\` onto the target bus; when \`en\` is \`0\`/\`Z\`/\`X\`, no contribution. Sugar: **\`bus = data w1 en\`** / **\`bus = data w0 en\`** (see [zstate.md](zstate.md)). Statement \`ZCONNECT(bus, en, data)\` is sugar for \`bus = ZCONNECT(en, data)\`.

\`\`\`logts-play wave
MODE ZSTATE

8wire databus
8wire cpuData = 10101010
1wire cpuEn = 1

databus = ZCONNECT(cpuEn, cpuData)
show(databus)
\`\`\`

### Logic gates with \`Z\` / \`X\`

In \`MODE ZSTATE\`, gate functions (\`AND\`, \`OR\`, \`NOT\`, …) use IEEE 1164 when operands contain \`Z\` or \`X\`. Arithmetic requires binary \`0\`/\`1\`. **\`MUX\`**: selector strict binary; **selected** data allows \`Z\`, errors on \`X\`; unselected inputs not checked. Details: [zstate.md](zstate.md), [builtin-routing-functions.md](builtin-routing-functions.md#mux-in-mode-zstate).


---

## Related

| Topic | Page |
|-------|------|
| \`doc()\` syntax | [doc-function.md](doc-function.md) |
| Vector reduction (SUM, DOT) | [vector-reduction.md](vector-reduction.md) |
| Tristate / multi-driver | [zstate.md](zstate.md) |
| Short notation (\`&\`, \`\\|\`, \`<\`, \`>\`) | [short-notation.md](short-notation.md) |
| Panel devices (\`comp\`) | [components.md](components.md) |
| User \`def\` functions | [user-functions.md](user-functions.md) |
`,
    'builtin-GT.md': `# GT (greater than)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise \`; vector\`](vector-reduction.md#element-wise-mode-vector) · [Matrix \`; matrix\`](matrix-reduction.md)

## Signatures

\`\`\`
GT(Xbit a, Xbit b) -> 1bit result
GT(Xbit a, Xbit b; signed) -> 1bit result
GT(8bit a, 8bit b; q4p4) -> 1bit result
GT(16bit a, 16bit b; q8p8) -> 1bit result
GT(16bit a, 16bit b; fp16) -> 1bit result
GT(16bit a, 16bit b; bf16) -> 1bit result
GT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
GT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> 1wire[n]
GT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> 1wire[n×m]
GT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> 1wire[n×m]
\`\`\`

## Scalar (default)

- \`result = 1\` if \`a > b\` (unsigned); else \`0\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Two's complement comparison. |
| \`q4p4\` | Fixed-point Q4.4 on **8-bit** wires. |
| \`q8p8\` | Fixed-point Q8.8 on **16-bit** wires. |
| \`fp16\` / \`bf16\` | IEEE half / brain float on **16-bit** wires. |
| \`vector\` | Per index on **rank-1** tensors → \`1wire[n]\`; scalar operand broadcast. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\` → \`1wire[N×M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`GT(Xbit a, Xbit b)\`

\`\`\`logts-play
4wire a = 1000
4wire b = 0111
1wire gt = GT(a, b)
show(gt)
\`\`\`

Unsigned \`8 > 7\` → \`gt=1\`.

\`\`\`logts-play
4wire a2 = 0101
4wire b2 = 0011
1wire g = GT(a2, b2)
1wire l = LT(b2, a2)
show(g)
show(l)
\`\`\`

### \`GT(Xbit a, Xbit b; signed)\`

\`\`\`logts-play
4wire a = 1111
4wire b = 0010
1wire gtU = GT(a, b)
1wire gtS = GT(a, b; signed)
show(gtU)
show(gtS)
\`\`\`

Unsigned: \`15 > 2\` → \`gtU=1\`. Signed: \`−1 > 2\` → \`gtS=0\`.

### \`GT(8bit a, 8bit b; q4p4)\`

\`\`\`logts-play
8wire a = 00011000
8wire b = 00001000
1wire gt = GT(a, b; q4p4)
show(gt)
\`\`\`

\`1.5 > 0.5\` → \`gt=1\`.

### \`GT(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

\`\`\`logts-play
4wire[3] vectorA = 0100 + 0010 + 0111
4wire[3] vectorB = 0011 + 0011 + 0100
1wire[3] flags = GT(vectorA, vectorB; vector)
show(flags)
\`\`\`

### \`GT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)\`

\`\`\`logts-play
4wire[2] vectorA = 1111 + 0010
4wire[2] vectorB = 0010 + 1111
1wire[2] flags = GT(vectorA, vectorB; vector signed)
show(flags)
\`\`\`

### \`GT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[4] out = GT(m, 0010; matrix)
show(out)
\`\`\`

Compare vs scalar \`2\` → cells \`1,0,1,1\` packed as \`0011\`.

### \`GT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0010 + 1000 + 0100
4wire[2,2] b = 0010 + 1111 + 0100 + 0010
1wire[4] out = GT(a, b; matrix signed)
show(out)
\`\`\`

## See also

[LT](builtin-LT.md) · [EQ](builtin-EQ.md) · [MIN](builtin-MIN.md)
`,
    'builtin-IDENTITY.md': `# IDENTITY (identity matrix)

Index: [2D tensors](wire-vectors.md) · [DOT](builtin-DOT.md)

Square **N×N** matrix with **1** on the diagonal and **0** elsewhere.

## Signatures

\`\`\`
IDENTITY(\\N) -> Wwire[N,N]
\`\`\`

- **\`\\N\`** — decimal dimension (must match target \`N×N\`).
- **W** — element width from the target wire (\`4wire[N,N]\` → 4 bits per cell).

## Examples

\`\`\`logts-play
4wire[3,3] I = IDENTITY(\\3)
4wire c = I:0:0
show(c)
\`\`\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] eye = IDENTITY(\\2)
4wire[2,2] r, 8wire[2,2] o = DOT(a, eye)
show(r)
\`\`\`

## See also

[ZEROS](builtin-ZEROS.md) · [DIAG](builtin-DIAG.md) · [DOT](builtin-DOT.md)
`,
    'builtin-IOTA.md': `# IOTA (index vector)

Index: [2D tensors](wire-vectors.md)

Rank-1 vector **\`[0, 1, …, N−1]\`**, each index stored in **W** bits (binary, zero-padded).

## Signatures

\`\`\`
IOTA(\\N) -> Wwire[N]
\`\`\`

Assign to **\`4wire[N]\`**, **\`4wire[1,N]\`**, or **\`4wire[N,1]\`**. **\`\\N\`** must match vector length (element count).

## Examples

\`\`\`logts-play
4wire[3] idx = IOTA(\\3)
show(idx)
\`\`\`

Values: \`0\` → \`0000\`, \`1\` → \`0001\`, \`2\` → \`0010\` (for \`4wire\`).

## See also

[DIAG](builtin-DIAG.md) · [Vector reduction](vector-reduction.md)
`,
    'builtin-L2.md': `# L2 (L2² norm)

Index: [NORM](builtin-NORM.md) · [DOT](builtin-DOT.md)

**Alias of [NORM](builtin-NORM.md)** — squared L2 norm via **\`DOT(v, v)\`**.

## Signatures

\`\`\`
L2(Wwire[n] vector) -> Wbit result, (2W)bit over
L2(Wwire[n] vector; signed) -> Wbit result, (2W)bit over
\`\`\`

## Examples

\`\`\`logts-play
4wire[2] v = 0011 + 0100
4wire a, 8wire ao = L2(v)
show(a)
\`\`\`

## See also

[NORM](builtin-NORM.md) · [DOT](builtin-DOT.md)
`,
    'builtin-logic-gate-functions.md': `# Built-in logic gate functions

Combinational logic gates invoked directly in expressions. \`Xbit\` = bit string of any width.

Index: [builtin-functions.md](builtin-functions.md) · Short notation (\`&\`, \`|\`, \`^\`): [short-notation.md](short-notation.md)

---

## Signatures

| Call | Signature |
|------|-----------|
| \`doc(NOT)\` | \`NOT(Xbit) -> Xbit\` |
| \`doc(AND)\` … \`doc(NOR)\` | \`Gate(Xbit) -> 1bit\` **or** \`Gate(Xbit, Xbit) -> Xbit\` |
| \`doc(EQ)\` | \`EQ(Xbit, Xbit) -> 1bit\` / \`EQ(Xbit, Xbit, Xbit, ...) -> 1bit\` |

**1-argument mode (fold):** \`OR(a)\` folds across all bits of \`a\` → **1 bit**.

**2-argument mode (bitwise):** \`OR(a, b)\` applies the gate bit-by-bit → **N bits** (\`N = max(width(a), width(b))\`).

### Unequal operand widths (left pad)

When the two operands have different lengths, the **shorter** one is extended with \`0\` on the **left** (MSB side) until both match. Index \`0\` is the leftmost bit — same convention as \`wire.0\` and \`bitRange\`.

\`\`\`
AND(111, 10000)
  → AND(00111, 10000)
  → 00000

AND(11100, 10000)
  → 10000   (operands already same width; no padding)
\`\`\`

| Shorter operand | Padded to 5 bits |
|-----------------|------------------|
| \`111\` | \`00111\` (not \`11100\`) |
| \`11\` | \`00011\` |

Applies to \`AND\`, \`OR\`, \`XOR\`, \`NXOR\`, \`NAND\`, \`NOR\`, and \`EQ\` (bitwise compare before folding to 1 bit). Boolean analysis (\`lutOf\`, \`truthTableOf\`, \`simplify\`, …) uses the same rules.

**1-argument fold** is unrelated: \`AND(111)\` folds all bits of one operand to a single \`1bit\` result.

---

## NOT

\`\`\`
NOT(Xbit) -> Xbit
\`\`\`

Bitwise inversion; output width equals input width.

### Runnable example

\`\`\`logts-play
4wire a = 1010
4wire y = NOT(a)
show(y)
\`\`\`

---

## AND / OR / XOR / NXOR / NAND / NOR

Dual-mode gates (fold or bitwise). Example with OR:

### Runnable example

\`\`\`logts-play
5wire a = 111
5wire b = 10000
5wire y = AND(a, b)
show(y)
\`\`\`

\`a\` is only 3 bits; \`AND\` pads it to \`00111\` before combining with \`b\`.

\`\`\`logts-play
4wire a = 1100
4wire b = 1010
4wire y = OR(a, b)
1wire any = OR(a)
probe(y)
show(any)
\`\`\`

---

## EQ

\`\`\`
EQ(Xbit, Xbit) -> 1bit
EQ(Xbit, Xbit, Xbit, ...) -> 1bit
EQ(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
\`\`\`

Bitwise equality. **Two operands:** all bits match → \`1\`. **Three or more:** all operands equal → \`1\`. Full reference: **[builtin-EQ.md](builtin-EQ.md)** (\`; vector\` for per-index compare).

### Runnable example

\`\`\`logts-play
4wire a = 0011
4wire b = 0011
1wire same = EQ(a, b)
probe(same)
\`\`\`

---

## \`Z\` and \`X\` in MODE ZSTATE

When \`MODE ZSTATE\` is active, gate operands may contain **\`Z\`** (undriven) or **\`X\`** (multi-driver conflict). Gates use **IEEE 1164** tables instead of pure binary:

\`\`\`logts-play wave
MODE ZSTATE

1wire a = ?X
1wire b = 1
1wire y = OR(a, b)
show(y)
\`\`\`

Result: \`y = 1\` (OR with any \`1\`).

\`NOT(?Z)\` on a 1-bit wire → \`X\`. Full bus semantics, resolver, and error rules: **[zstate.md](zstate.md)**.
`,
    'builtin-LROTATE.md': `# LROTATE (left rotate)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Rotate bits left; MSBs wrap to LSBs. Width unchanged.

## Signatures

\`\`\`
LROTATE(Xbit data, Ybit count) -> Xbit
LROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
LROTATE(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix) -> Wbit[n,m]
\`\`\`

- **\`count\`** is taken **modulo** element width.
- **\`; vector\`**: \`count\` may be scalar (broadcast) or **\`Kbit[n]\`** (per index).

## Scalar (default)

- Rotate left by \`count mod width\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`vector\` | Per element on **rank-1** tensors. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; \`count\` scalar or rank-1 broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`LROTATE(Xbit data, Ybit count)\`

\`\`\`logts-play
4wire x = 1011
4wire y = LROTATE(x, 1)
show(y)
\`\`\`

\`1011\` rotl 1 → \`0111\`.

\`\`\`logts-play
4wire x2 = 1011
4wire y2 = LROTATE(x2, 10)
probe(y2)
\`\`\`

\`count=2\` (mod 4) → \`1110\`.

\`\`\`logts-play
4wire x3 = 1011
4wire y3 = LROTATE(x3, 100)
show(y3)
\`\`\`

\`count=4\` (mod 4 = 0) → unchanged \`1011\`.

### \`LROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector)\`

Scalar count (broadcast):

\`\`\`logts-play
4wire[2] vector = 1011 + 0101
4wire[2] l = LROTATE(vector, 0001; vector)
show(l)
\`\`\`

→ \`0111\` + \`1010\` → blob \`01111010\`.

Per-index count vector:

\`\`\`logts-play
4wire[3] data = 1011 + 0101 + 1100
2wire[3] counts = 01 + 10 + 01
4wire[3] out = LROTATE(data, counts; vector)
show(out)
\`\`\`

### \`LROTATE(Wbit[n,m] data, … ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 1011 + 0101 + 1100 + 0011
4wire[2,2] out = LROTATE(m, 0001; matrix)
show(out)
\`\`\`

## See also

[RROTATE](builtin-RROTATE.md) · [REVERSE](builtin-REVERSE.md)
`,
    'builtin-LSHIFT.md': `# LSHIFT (left shift)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Shift bits toward MSB; vacated LSBs filled with **\`0\`** by default, or with optional **\`fill\`** (1 bit).

## Signatures

\`\`\`
LSHIFT(Xbit data, Nbit n) -> Xbit
LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
LSHIFT(Wbit[n] data, Nbit count ; vector) -> (W+n)bit[n]
LSHIFT(Wbit[n,m] data, Nbit/scalar count ; matrix) -> Wbit[n,m]
\`\`\`

- Scalar: result width = **\`len(data) + n\`** (bits appended on the right).
- **\`fill\`** — only the LSB of the third argument is used (\`0\` or \`1\`). Default \`0\`.
- **\`; vector\`**: count must be a **scalar** (broadcast to every index). Optional third arg **\`fill\`** applies per element. Per-index count vectors are **not** supported.

Sugar: \`data < n\` and \`data < n w1\` — [short-notation.md](short-notation.md).

## Scalar (default)

- Left shift by \`n\`; width grows by \`n\` bits unless you assign to a narrower wire (truncation).

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`vector\` | Per element on **rank-1** tensors; output element width **(W + n)** where \`n = len(scalar count)\`. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 \`count\` broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

**No \`; signed\` tag** — left shift is identical for signed/unsigned bit patterns.

## Examples

### \`LSHIFT(Xbit data, Nbit n)\`

\`\`\`logts-play
4wire x = 1011
5wire y = LSHIFT(x, 1)
show(y)
\`\`\`

\`1011 << 1\` → \`10110\` (5 bits).

\`\`\`logts-play
4wire val = 0001
4wire cnt = 0010
5wire r = LSHIFT(val, cnt)
show(r)
\`\`\`

\`1 << 2\` → \`00100\`.

### \`LSHIFT(Xbit data, Nbit n, 1bit fill)\`

\`\`\`logts-play
4wire x = 0001
5wire y0 = LSHIFT(x, 1, 0)
5wire y1 = LSHIFT(x, 1, 1)
show(y0)
show(y1)
\`\`\`

\`fill=0\` → \`00010\`; \`fill=1\` → \`00011\`.

\`\`\`logts-play
4wire x2 = 0001
8wire wide = LSHIFT(x2, 11, 1)
show(wide)
\`\`\`

Shift by 3 with fill \`1\` → \`0001111\`.

### \`LSHIFT(Wbit[n] data, Nbit count ; vector)\`

\`\`\`logts-play
4wire[3] vector = 1011 + 0101 + 0001
5wire[3] out = LSHIFT(vector, 0001; vector)
show(out)
\`\`\`

Each 4-bit element shifted left by 1 → **5**-bit elements (\`10110\`, \`10100\`, \`00010\`).

Optional **\`fill\`** in vector mode:

\`\`\`logts-play
4wire[2] v = 0001 + 0010
5wire[2] r = LSHIFT(v, 0001, 1; vector)
show(r)
\`\`\`

### \`LSHIFT(Wbit[n,m] data, Nbit count ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] out = LSHIFT(m, 0001; matrix)
show(out)
\`\`\`

Per-cell left shift by 1 (within each **W**-bit cell; assign to \`4wire[N,M]\`).

## See also

[RSHIFT](builtin-RSHIFT.md) · [LROTATE](builtin-LROTATE.md)
`,
    'builtin-LT.md': `# LT (less than)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise \`; vector\`](vector-reduction.md#element-wise-mode-vector) · [Matrix \`; matrix\`](matrix-reduction.md)

## Signatures

\`\`\`
LT(Xbit a, Xbit b) -> 1bit result
LT(Xbit a, Xbit b; signed) -> 1bit result
LT(8bit a, 8bit b; q4p4) -> 1bit result
LT(16bit a, 16bit b; q8p8) -> 1bit result
LT(16bit a, 16bit b; fp16) -> 1bit result
LT(16bit a, 16bit b; bf16) -> 1bit result
LT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
LT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> 1wire[n]
LT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> 1wire[n×m]
LT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> 1wire[n×m]
\`\`\`

## Scalar (default)

- \`result = 1\` if \`a < b\` (unsigned); else \`0\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Two's complement comparison. |
| \`q4p4\` | Fixed-point Q4.4 on **8-bit** wires. |
| \`q8p8\` | Fixed-point Q8.8 on **16-bit** wires. |
| \`fp16\` / \`bf16\` | IEEE half / brain float on **16-bit** wires. |
| \`vector\` | Per index on **rank-1** tensors → \`1wire[n]\`. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\` → \`1wire[N×M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`LT(Xbit a, Xbit b)\`

\`\`\`logts-play
4wire a = 0011
4wire b = 0111
1wire lt = LT(a, b)
show(lt)
\`\`\`

\`3 < 7\` → \`lt=1\`.

### \`LT(Xbit a, Xbit b; signed)\`

\`\`\`logts-play
4wire a = 1111
4wire b = 0010
1wire ltU = LT(a, b)
1wire ltS = LT(a, b; signed)
show(ltU)
show(ltS)
\`\`\`

Unsigned: \`15 < 2\` → \`ltU=0\`. Signed: \`−1 < 2\` → \`ltS=1\`.

### \`LT(8bit a, 8bit b; q4p4)\`

\`\`\`logts-play
8wire a = 00001000
8wire b = 00011000
1wire lt = LT(a, b; q4p4)
show(lt)
\`\`\`

\`0.5 < 1.5\` → \`lt=1\`.

### \`LT(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

\`\`\`logts-play
4wire[3] vectorA = 0001 + 0100 + 0111
4wire[3] vectorB = 0010 + 0011 + 0100
1wire[3] flags = LT(vectorA, vectorB; vector)
show(flags)
\`\`\`

### \`LT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)\`

\`\`\`logts-play
4wire[2] vectorA = 1111 + 0100
4wire scalar = 0010
1wire[2] flags = LT(vectorA, scalar; vector signed)
show(flags)
\`\`\`

### \`LT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0100 + 0111 + 0010
4wire[2,2] b = 0010 + 0011 + 0100 + 0100
1wire[4] flags = LT(a, b; matrix)
show(flags)
\`\`\`

### \`LT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0100 + 0111 + 0010
4wire[2,2] b = 0010 + 1111 + 0100 + 0100
1wire[4] flags = LT(a, b; matrix signed)
show(flags)
\`\`\`

## See also

[GT](builtin-GT.md) · [EQ](builtin-EQ.md)
`,
    'builtin-MAC.md': `# MAC (multiply-accumulate)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Computes **\`acc + (a × b)\`**. Equivalent to \`ADD(acc, MULTIPLY(a, b))\`; may be fused internally.

## Signatures

\`\`\`
MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
MAC(Xbit acc, Xbit a, Xbit b; signed) -> Xbit result, (X+1)bit over
MAC(8bit acc, 8bit a, 8bit b; q4p4) -> 8bit result, 9bit over
MAC(16bit acc, 16bit a, 16bit b; q8p8) -> 16bit result, 17bit over
MAC(16bit acc, 16bit a, 16bit b; fp16) -> 16bit result, 17bit inexact
MAC(16bit acc, 16bit a, 16bit b; bf16) -> 16bit result, 17bit inexact
MAC(Wbit[n] acc, Wbit/Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], (W+1)bit[n]
MAC(Wbit[n] acc, Wbit/Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], (W+1)bit[n]
MAC(Wbit[n,m] acc, Wbit/Wbit[n,m]/row/col/scalar a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], (W+1)bit[n,m]
MAC(Wbit[n,m] acc, … ; matrix signed) -> Wbit[n,m], (W+1)bit[n,m]
\`\`\`

All three operands must have the same width **X** (per element in vector mode).

| Output | Width | Description |
|--------|-------|-------------|
| \`result\` | \`X\` | Low \`X\` bits of \`acc + a*b\` |
| \`over\` | \`X + 1\` | Upper bits (zero-padded) |

Full integer: concatenate **\`over\` then \`result\`** (MSB → LSB).

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed accumulate; same packing. |
| \`q4p4\` | Q4.4 on **8-bit** wires; \`over\` is **9** bits. |
| \`q8p8\` | Q8.8 on **16-bit** wires; \`over\` is **17** bits. |
| \`fp16\` / \`bf16\` | Float MAC on **16-bit** wires; second return = inexact. |
| \`vector\` | Per index on **rank-1** tensors; \`over[i]\` is **(W+1)** bits — assign e.g. \`4wire[n] r, 5wire[n] o\`. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. Assign e.g. \`4wire[N,M] r, 5wire[N,M] o\`. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`MAC(Xbit acc, Xbit a, Xbit b)\`

\`\`\`logts-play
8wire acc = 11111010
8wire a = 00010100
8wire b = 00010100
8wire result, 9wire over = MAC(acc, a, b)
show(result)
show(over)
\`\`\`

\`250 + 20×20 = 650\`.

Digit accumulator when the value fits in \`X\` bits:

\`\`\`logts-play
8wire acc = 00001100
8wire digit = 00000101
8wire ten = 00001010
8wire low, 9wire hi = MAC(acc, digit, ten)
show(low)
show(hi)
\`\`\`

\`12 + 5×10 = 62\`.

### \`MAC(Xbit acc, Xbit a, Xbit b; signed)\`

\`\`\`logts-play
4wire acc = 1000
4wire a = 0010
4wire b = 0001
4wire r, 5wire over = MAC(acc, a, b; signed)
show(r)
show(over)
\`\`\`

Signed \`−8 + 2×1 = −6\` → \`r=1010\`.

### \`MAC(8bit acc, 8bit a, 8bit b; q4p4)\`

\`\`\`logts-play
8wire acc = 00010000
8wire a = 00011000
8wire b = 00001000
8wire r, 9wire o = MAC(acc, a, b; q4p4)
show(r; q4p4)
show(o)
\`\`\`

\`1.0 + 1.5×0.5 = 1.75\`.

### \`MAC(Wbit[n] acc, … ; vector)\`

\`\`\`logts-play
4wire[2] acc = 0001 + 0010
4wire[2] a = 0010 + 0001
4wire[2] b = 0011 + 0100
4wire[2] r, 5wire[2] o = MAC(acc, a, b; vector)
show(r)
show(o)
\`\`\`

### \`MAC(Wbit[n] acc, … ; vector signed)\`

\`\`\`logts-play
4wire[2] acc = 1111 + 0000
4wire[2] a = 1111 + 0010
4wire[2] b = 0001 + 0001
4wire[2] r, 5wire[2] o = MAC(acc, a, b; vector signed)
show(r)
show(o)
\`\`\`

### \`MAC(Wbit[n,m] acc, … ; matrix)\`

\`\`\`logts-play
4wire[2,2] acc = 0001 + 0010 + 0000 + 0000
4wire[2,2] a = 0010 + 0001 + 0011 + 0100
4wire[2,2] b = 0011 + 0100 + 0001 + 0001
4wire[2,2] r, 5wire[2,2] o = MAC(acc, a, b; matrix)
show(r)
show(o)
\`\`\`

### \`MAC(Wbit[n,m] acc, … ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] acc = 1111 + 0000 + 0000 + 0000
4wire[2,2] a = 1111 + 0010 + 0011 + 0100
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 5wire[2,2] o = MAC(acc, a, b; matrix signed)
show(r)
show(o)
\`\`\`

## See also

[MULTIPLY](builtin-MULTIPLY.md) · [DOT](builtin-DOT.md)
`,
    'builtin-MAX.md': `# MAX

Index: [Arithmetic](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Matrix \`; matrix\`](matrix-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

## Signatures

\`\`\`
MAX(Wbit ...) -> Wbit
MAX(Wbit ...; signed) -> Wbit
MAX(Wbit ...; q4p4) -> Wbit
MAX(Wbit ...; q8p8) -> Wbit
MAX(Wbit ...; fp16) -> Wbit
MAX(Wbit ...; bf16) -> Wbit
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n]
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector signed) -> Wbit[n]
MAX(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar ... ; matrix) -> Wbit[n,m]
MAX(Wbit[n,m] ... ; matrix signed) -> Wbit[n,m]
MAX(Wbit[n,m] m ; row) -> Wbit[n]
MAX(Wbit[n,m] m ; col) -> Wbit[m]
MAX(Wbit[n,m] m ; row signed) -> Wbit[n]
MAX(Wbit[n,m] m ; col signed) -> Wbit[m]
\`\`\`

Variadic (≥ 2 operands after expansion).

## Scalar (default)

- Returns the **bit pattern** of the winning value (unsigned max)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed maximum. |
| \`q4p4\` | Q4.4 maximum on **8-bit** wires. |
| \`q8p8\` | Q8.8 maximum on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float maximum on **16-bit** wires. |
| \`vector\` | Per index on **rank-1** tensors. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |
| \`row\` | Per-row maximum across columns → \`Wbit[N]\`. Mutually exclusive with \`vector\` and \`matrix\`. |
| \`col\` | Per-column maximum across rows → \`Wbit[M]\`. Mutually exclusive with \`vector\` and \`matrix\`. |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix). On rank-1 tensors without \`; row\` / \`; col\`: \`use scalar MAX without col|row tag\`.

## Examples

### \`MAX(Wbit ...)\`

\`\`\`logts-play
4wire a = 0101
4wire b = 0011
4wire c = 1000
4wire hi = MAX(a, b, c)
show(hi)
\`\`\`

\`MAX(5,3,8)=8\` → \`1000\`.

### \`MAX(Wbit ...; signed)\`

\`\`\`logts-play
4wire neg = 1111
4wire pos = 0010
4wire hi = MAX(neg, pos; signed)
show(hi)
\`\`\`

Signed \`MAX(−1, 2)=2\` → \`0010\`.

### \`MAX(Wbit ...; q4p4)\`

\`\`\`logts-play
8wire neg = 11110000
8wire pos = 00011000
8wire hi = MAX(neg, pos; q4p4)
show(hi; q4p4)
\`\`\`

### \`MAX(Wbit[n] a, … ; vector)\`

\`\`\`logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, 0001; vector)
show(out)
\`\`\`

### \`MAX(Wbit[n] a, … ; vector signed)\`

\`\`\`logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, vectorB; vector signed)
show(out)
\`\`\`

### \`MAX(Wbit[n,m] … ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0010 + 0011 + 0100 + 1001
4wire[2,2] out = MAX(a, b; matrix)
show(out)
\`\`\`

### \`MAX(Wbit[n,m] … ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0010 + 1000 + 0100
4wire[2,2] b = 0001 + 1111 + 0100 + 0010
4wire[2,2] out = MAX(a, b; matrix signed)
show(out)
\`\`\`

### \`MAX(Wbit[n,m] m ; row)\` / \`MAX(Wbit[n,m] m ; col)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] rmax = MAX(m; row)
4wire[2] cmax = MAX(m; col)
show(rmax)
show(cmax)
\`\`\`

## See also

[MIN](builtin-MIN.md) · [CLAMP](builtin-CLAMP.md) · [ARGMAX](builtin-ARGMAX.md)
`,
    'builtin-MCAT.md': `# MCAT (matrix concat)

Index: [2D tensors](wire-vectors.md)

Concatenate two tensors along the shared dimension:

| Condition | Result shape |
|-----------|----------------|
| Same **row** count | Horizontal **\`[R, C1+C2]\`** |
| Same **column** count | Vertical **\`[R1+R2, C]\`** |

## Signatures

\`\`\`
MCAT(Wwire tensor A, Wwire tensor B) -> Wwire tensor
\`\`\`

Target wire must match the computed output shape.

## Examples

### Horizontal (same rows)

\`\`\`logts-play
4wire[2,1] a = 0001 + 0010
4wire[2,1] b = 0100 + 1000
4wire[2,2] c = MCAT(a, b)
show(c)
\`\`\`

## See also

[MSLICE](builtin-MSLICE.md) · [PIVOT](wire-vectors.md#pivot)
`,
    'builtin-MIN.md': `# MIN

Index: [Arithmetic](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Matrix \`; matrix\`](matrix-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

## Signatures

\`\`\`
MIN(Wbit ...) -> Wbit
MIN(Wbit ...; signed) -> Wbit
MIN(Wbit ...; q4p4) -> Wbit
MIN(Wbit ...; q8p8) -> Wbit
MIN(Wbit ...; fp16) -> Wbit
MIN(Wbit ...; bf16) -> Wbit
MIN(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n]
MIN(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector signed) -> Wbit[n]
MIN(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar ... ; matrix) -> Wbit[n,m]
MIN(Wbit[n,m] ... ; matrix signed) -> Wbit[n,m]
MIN(Wbit[n,m] m ; row) -> Wbit[n]
MIN(Wbit[n,m] m ; col) -> Wbit[m]
MIN(Wbit[n,m] m ; row signed) -> Wbit[n]
MIN(Wbit[n,m] m ; col signed) -> Wbit[m]
\`\`\`

Variadic (≥ 2 operands after expansion). Whole vectors expand to elements.

## Scalar (default)

- Returns the **bit pattern** of the winning value (unsigned min)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed minimum. |
| \`q4p4\` | Q4.4 minimum on **8-bit** wires. |
| \`q8p8\` | Q8.8 minimum on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float minimum on **16-bit** wires. |
| \`vector\` | Per index on **rank-1** tensors. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |
| \`row\` | Per-row minimum across columns → \`Wbit[N]\`. Mutually exclusive with \`vector\` and \`matrix\`. |
| \`col\` | Per-column minimum across rows → \`Wbit[M]\`. Mutually exclusive with \`vector\` and \`matrix\`. |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix). On rank-1 tensors without \`; row\` / \`; col\`: \`use scalar MIN without col|row tag\`.

## Examples

### \`MIN(Wbit ...)\`

\`\`\`logts-play
4wire a = 1000
4wire b = 0111
4wire c = 1000
4wire lo = MIN(a, b, c)
show(lo)
\`\`\`

\`MIN(8,7,8)=7\` → \`0111\`.

Whole-vector reduction:

\`\`\`logts-play
4wire[3] vectorA = 0100 + 0010 + 0110
4wire m = MIN(vectorA)
show(m)
\`\`\`

### \`MIN(Wbit ...; signed)\`

\`\`\`logts-play
4wire neg = 1111
4wire pos = 0010
4wire lo = MIN(neg, pos; signed)
show(lo)
\`\`\`

Signed \`MIN(−1, 2)=−1\` → \`1111\`.

### \`MIN(Wbit ...; q4p4)\`

\`\`\`logts-play
8wire neg = 11110000
8wire pos = 00011000
8wire lo = MIN(neg, pos; q4p4)
show(lo; q4p4)
\`\`\`

### \`MIN(Wbit[n] a, … ; vector)\`

\`\`\`logts-play
4wire[3] vectorA = 0100 + 0010 + 0110
4wire[3] out = MIN(vectorA, 0001; vector)
show(out)
\`\`\`

### \`MIN(Wbit[n] a, … ; vector signed)\`

\`\`\`logts-play
4wire[2] vectorA = 1111 + 0010
4wire[2] vectorB = 0001 + 1111
4wire[2] out = MIN(vectorA, vectorB; vector signed)
show(out)
\`\`\`

### \`MIN(Wbit[n,m] … ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0010 + 0001 + 1000 + 0100
4wire[2,2] out = MIN(a, b; matrix)
show(out)
\`\`\`

### \`MIN(Wbit[n,m] … ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0010 + 1000 + 0100
4wire[2,2] b = 0001 + 1111 + 0100 + 0010
4wire[2,2] out = MIN(a, b; matrix signed)
show(out)
\`\`\`

### \`MIN(Wbit[n,m] m ; row)\` / \`MIN(Wbit[n,m] m ; col)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] rmin = MIN(m; row)
4wire[2] cmin = MIN(m; col)
show(rmin)
show(cmin)
\`\`\`

## See also

[MAX](builtin-MAX.md) · [CLAMP](builtin-CLAMP.md) · [ARGMIN](builtin-ARGMIN.md)
`,
    'builtin-MSLICE.md': `# MSLICE (matrix slice)

Index: [2D tensors](wire-vectors.md)

Extract a **rectangular window** from a matrix. All index/size arguments are **decimal literals** (\`\\0\`, \`\\2\`, …).

## Signatures

\`\`\`
MSLICE(Wwire matrix, \\r0, \\c0, \\h, \\w) -> Wwire[h,w]
\`\`\`

- **\`(r0, c0)\`** — top-left corner (0-based).
- **\`(h, w)\`** — window height and width.
- Window must fit inside the source matrix.

## Examples

\`\`\`logts-play
4wire[3,3] m = 0001 + 0010 + 0100 + 1000 + 0001 + 0010 + 0100 + 1000 + 0001
4wire[2,2] s = MSLICE(m, \\1, \\1, \\2, \\2)
show(s)
\`\`\`

## See also

[MCAT](builtin-MCAT.md) · [Indexing](wire-vectors.md#indexing-2d)
`,
    'builtin-MULTIPLY.md': `# MULTIPLY

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Binary multiplication with overflow capture.

## Signatures

\`\`\`
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
MULTIPLY(Xbit a, Xbit b; signed) -> Xbit result, Xbit over
MULTIPLY(8bit a, 8bit b; q4p4) -> 8bit result, 8bit over
MULTIPLY(16bit a, 16bit b; q8p8) -> 16bit result, 16bit over
MULTIPLY(16bit a, 16bit b; fp16) -> 16bit result, 16bit inexact
MULTIPLY(16bit a, 16bit b; bf16) -> 16bit result, 16bit inexact
MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
\`\`\`

## Scalar (default)

- \`result\` = low \`N\` bits of \`a * b\`
- \`over\` = high \`N\` bits; full product = \`(over << N) | result\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Product as two's complement; same wire packing. |
| \`q4p4\` | Fixed-point Q4.4 on **8-bit** wires; \`over\` = high 8 bits of 16-bit product. |
| \`q8p8\` | Fixed-point Q8.8 on **16-bit** wires; \`over\` = high 16 bits of 32-bit product. |
| \`fp16\` / \`bf16\` | Float multiply on **16-bit** wires; second return = inexact flag. |
| \`vector\` | Per index on **rank-1** tensors; \`over[i]\` = high **W** bits of the **2W**-bit product. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`MULTIPLY(Xbit a, Xbit b)\`

\`\`\`logts-play
4wire a = 0010
4wire b = 0011
4wire r, 4wire o = MULTIPLY(a, b)
show(r)
show(o)
\`\`\`

\`2×3=6\` → \`r=0110\`, \`o=0000\`.

\`\`\`logts-play
4wire a2 = 1111
4wire b2 = 1111
4wire r2, 4wire o2 = MULTIPLY(a2, b2)
show(r2)
show(o2)
\`\`\`

Unsigned \`15×15=225\` → \`r2=0001\`, \`o2=1110\`.

### \`MULTIPLY(Xbit a, Xbit b; signed)\`

\`\`\`logts-play
4wire a = 1111
4wire b = 1111
4wire rS, 4wire oS = MULTIPLY(a, b; signed)
show(rS)
show(oS)
\`\`\`

Signed \`(−1)×(−1)=1\` → \`rS=0001\`, \`oS=0000\`.

### \`MULTIPLY(8bit a, 8bit b; q4p4)\`

\`\`\`logts-play
8wire a = 00011000
8wire b = 00100000
8wire r, 8wire o = MULTIPLY(a, b; q4p4)
show(r; q4p4)
show(o)
\`\`\`

\`1.5×2.0=3.0\` → \`r=00110000\`.

### \`MULTIPLY(16bit a, 16bit b; fp16)\`

\`\`\`logts-play
16wire a = 0100000000000000
16wire b = 0011111000000000
16wire r, 16wire o = MULTIPLY(a, b; fp16)
show(r; fp16)
show(o)
\`\`\`

\`2.0×1.5=3.0\`.

### \`MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

\`\`\`logts-play
4wire[3] vectorA = 0010 + 0011 + 0100
4wire[3] vectorB = 0010 + 0010 + 0001
4wire[3] r, 4wire[3] o = MULTIPLY(vectorA, vectorB; vector)
show(r)
show(o)
\`\`\`

### \`MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)\`

\`\`\`logts-play
4wire[2] vectorA = 1111 + 0010
4wire[2] r, 4wire[2] o = MULTIPLY(vectorA, 1111; vector signed)
show(r)
show(o)
\`\`\`

\`(−1)×(−1)=1\` at index 0; \`2×(−1)=−2\` at index 1.

### \`MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] b = 0001 + 0000 + 0000 + 0001
4wire[2,2] r, 4wire[2,2] o = MULTIPLY(a, b; matrix)
show(r)
show(o)
\`\`\`

### \`MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0010 + 0011 + 0100
4wire[2,2] b = 1111 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] o = MULTIPLY(a, b; matrix signed)
show(r)
show(o)
\`\`\`

## See also

[MAC](builtin-MAC.md) · [DIVIDE](builtin-DIVIDE.md)
`,
    'builtin-NFORMAT.md': `# NFORMAT

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Status register (4bit)](arithmetic.md#status-4bit)

Scalar format conversion: decode source format → real value → encode destination format. Returns **\`4bit status\`** per [arithmetic.md — status register](arithmetic.md#status-4bit). With **\`; vector\`** or **\`; matrix\`**, conversion is per-element / per-cell; \`status\` is one 4-bit word per element or cell.

## Signatures

\`\`\`
NFORMAT(Xbit a; signed to_q4p4) -> 8bit result, 4bit status
NFORMAT(Xbit a; signed to_q8p8) -> 16bit result, 4bit status
NFORMAT(Xbit a; signed to_fp16) -> 16bit result, 4bit status
NFORMAT(Xbit a; signed to_bf16) -> 16bit result, 4bit status
NFORMAT(8bit a; q4p4 to_signed) -> 8bit result, 4bit status
NFORMAT(8bit a; q4p4 to_q8p8) -> 16bit result, 4bit status
NFORMAT(8bit a; q4p4 to_fp16) -> 16bit result, 4bit status
NFORMAT(8bit a; q4p4 to_bf16) -> 16bit result, 4bit status
NFORMAT(16bit a; q8p8 to_signed) -> 16bit result, 4bit status
NFORMAT(16bit a; q8p8 to_q4p4) -> 8bit result, 4bit status
NFORMAT(16bit a; q8p8 to_fp16) -> 16bit result, 4bit status
NFORMAT(16bit a; q8p8 to_bf16) -> 16bit result, 4bit status
NFORMAT(16bit a; fp16 to_signed) -> 16bit result, 4bit status
NFORMAT(16bit a; fp16 to_q4p4) -> 8bit result, 4bit status
NFORMAT(16bit a; fp16 to_q8p8) -> 16bit result, 4bit status
NFORMAT(16bit a; fp16 to_bf16) -> 16bit result, 4bit status
NFORMAT(16bit a; bf16 to_signed) -> 16bit result, 4bit status
NFORMAT(16bit a; bf16 to_q4p4) -> 8bit result, 4bit status
NFORMAT(16bit a; bf16 to_q8p8) -> 16bit result, 4bit status
NFORMAT(16bit a; bf16 to_fp16) -> 16bit result, 4bit status
NFORMAT(Wsrc·wire[n] a; <src> to_<dst> vector) -> Wdst·wire[n] result, 4wire[n] status
NFORMAT(Wsrc·wire[n,m] a; <src> to_<dst> matrix) -> Wdst·wire[n,m] result, 4wire[n,m] status
\`\`\`

Use \`doc(NFORMAT)\` for the full signature list from \`Interpreter.BUILTIN_DOC\`.

## Call tags

Exactly **one source** tag and **one destination** tag (\`to_*\`). Source and destination must differ. Optional **\`; vector\`** or **\`; matrix\`** (mutually exclusive).

| Source tag | Operand width | Meaning |
|------------|---------------|---------|
| \`signed\` | any *W* | Two's complement integer on *W* bits |
| \`q4p4\` | **8** | Q4.4 fixed-point |
| \`q8p8\` | **16** | Q8.8 fixed-point |
| \`fp16\` | **16** | IEEE 754 half |
| \`bf16\` | **16** | Brain float 16 |

| Destination tag | Result width |
|-----------------|--------------|
| \`to_signed\` | same as operand |
| \`to_q4p4\` | **8** |
| \`to_q8p8\` | **16** |
| \`to_fp16\` | **16** |
| \`to_bf16\` | **16** |

| Shape tag | Behaviour |
|-----------|-----------|
| *(none)* | Scalar — one operand wire |
| \`vector\` | Per index on rank-1 tensors (\`Wwire[N]\`, \`Wwire[1,N]\`, \`Wwire[N,1]\`) |
| \`matrix\` | Per cell on matrix \`Wwire[N,M]\` (\`N>1\`, \`M>1\`) |

Declare the assignment target at **\`Wdst\`** (result element width). Tensor shape (\`n\` or \`n,m\`) is unchanged.

## Behaviour

1. Decode operand as \`src\` format → real number.
2. Encode real number as \`dst\` format → \`result\`.
3. Set \`status\` (4 bits, MSB-first): overflow, underflow, inexact, nan — same layout as ADD/MULTIPLY with format tags.

| Condition | Typical \`status\` |
|-----------|------------------|
| Exact conversion | \`0000\` |
| Fixed-point out of range | \`1000\` (overflow) |
| Rounding / precision loss | bit2 inexact (\`0010\` or \`1010\`) |
| Float \`NaN\` input | \`0001\` (nan) |

## Examples

### \`q4p4\` → \`fp16\`

\`\`\`logts-play
8wire a = \\7;q4p4
16wire r, 4wire st = NFORMAT(a; q4p4 to_fp16)
show(r; fp16)
show(st)
\`\`\`

\`7.0\` in Q4.4 converts exactly to fp16; \`st = 0000\`.

### \`signed\` → \`q4p4\` overflow

\`\`\`logts-play
8wire a = \\127;s8
8wire r, 4wire st = NFORMAT(a; signed to_q4p4)
show(r; q4p4)
show(st)
\`\`\`

\`127\` exceeds Q4.4 range → overflow (\`1000\`).

### \`fp16\` \`NaN\` → \`q4p4\`

\`\`\`logts-play
16wire nan = 0111111000000000
8wire r, 4wire st = NFORMAT(nan; fp16 to_q4p4)
show(st)
\`\`\`

\`status.bit3\` (nan) set → \`0001\`.

### \`; vector\` — \`q4p4\` → \`fp16\` (width change)

\`\`\`logts-play
8wire[2] v = 01110000 + 11110000
16wire[2] r, 4wire[2] st = NFORMAT(v; q4p4 to_fp16 vector)
show(r; fp16)
show(st)
\`\`\`

Each element converted independently; \`16wire[2]\` target matches \`Wdst=16\`.

### \`; matrix\` — \`q4p4\` → \`fp16\`

\`\`\`logts-play
8wire[2,2] m = 01110000 + 00010000 + 11110000 + 00100000
16wire[2,2] r, 4wire[2,2] st = NFORMAT(m; q4p4 to_fp16 matrix)
show(st)
\`\`\`

Per-cell conversion; \`status\` is \`4wire[2,2]\` (4 bits per cell).
`,
    'builtin-NORM.md': `# NORM (L2² norm)

Index: [Vector reduction](vector-reduction.md) · [DOT](builtin-DOT.md)

**Squared Euclidean norm** of a vector: **\`DOT(v, v)\`** — sum of squares.

## Signatures

\`\`\`
NORM(Wwire[n] vector) -> Wbit result, (2W)bit over
NORM(Wwire[n] vector; signed) -> Wbit result, (2W)bit over
\`\`\`

No square root — hardware-friendly **L2²**.

## Examples

\`\`\`logts-play
4wire[2] v = 0001 + 0010
4wire n, 8wire no = NORM(v)
4wire d, 8wire do = DOT(v, v)
show(n)
show(d)
\`\`\`

\`NORM(v)\` and \`DOT(v,v)\` produce identical results.

## See also

[L2](builtin-L2.md) · [DOT](builtin-DOT.md)
`,
    'builtin-OUTER.md': `# OUTER (outer product)

Index: [2D tensors](wire-vectors.md) · [DOT](builtin-DOT.md)

**Outer product** of a column vector **\`[N,1]\`** and a row vector **\`[1,M]\`**:

**\`C[i,j] = A[i] × B[j]\`** (unsigned/signed per call tags on multiply).

## Signatures

\`\`\`
OUTER(Wwire[N,1] col, Wwire[1,M] row) -> Wwire[N,M], (2W)bit over
\`\`\`

Target wire must be **\`[N,M]\`**. Operand order may be swapped if one is row and one is column.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed multiply per cell (same as [MULTIPLY](builtin-MULTIPLY.md)). |

## Examples

\`\`\`logts-play
4wire[2,1] col = 0001 + 0010
4wire[1,2] row = 0011 + 0100
4wire[2,2] m, 4wire[2,2] o = OUTER(col, row)
show(m)
\`\`\`

## See also

[DOT](builtin-DOT.md) · [MULTIPLY](builtin-MULTIPLY.md)
`,
    'builtin-RANK.md': `# RANK

Index: [Wire vectors](wire-vectors.md) · [SHAPE](builtin-SHAPE.md) · [Tensor / matrix built-ins](builtin-functions.md)

Returns the **tensor rank** of a whole wire:

| Shape | \`RANK\` value |
|-------|----------------|
| Rank-1 (\`[N]\`, \`[1,N]\`, \`[N,1]\`) | \`1\` |
| True matrix (\`N>1\` and \`M>1\`) | \`2\` |

## Signatures

\`\`\`
RANK(Wwire tensor) -> bit rank
\`\`\`

Bit width follows the assignment target wire (default **2** bits when unspecified).

## Examples

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[4] v = 0001 + 0010 + 0100 + 1000
2wire rankM = RANK(m)
1wire rankV = RANK(v)
show(rankM)
show(rankV)
\`\`\`

→ \`rankM=10\` (rank 2), \`rankV=1\` (rank 1).

## See also

[SHAPE](builtin-SHAPE.md) · [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix)
`,
    'builtin-REPEAT.md': `# REPEAT

Index: [2D tensors](wire-vectors.md) · [wire vectors](wire-vectors.md#repeat)

Tile a wire or rank-1 tensor **T** times along its natural axis. Plain wires concatenate; vectors grow along the repeat dimension.

## Signatures

\`\`\`
REPEAT(Wbit data, Nbit/\\N times) -> Wbit or Wwire tensor
\`\`\`

- **\`data\`** — whole wire (plain or tensor); no slices.
- **\`times\`** — decimal literal \`\\N\` or scalar wire (unsigned integer, **≥ 1**).
- **Limit** — total output bits ≤ **16384** (\`len(data) × times\` for plain wires).

## Output shape

| Input | Output |
|-------|--------|
| Plain \`Wbit\` | \`Wbit\` of length \`len × T\` (concatenation) |
| \`Wwire[N]\` / \`Wwire[N,1]\` (single-dim vector) | \`Wwire[N,T]\` — column stack |
| \`Wwire[1,N]\` (comma in decl) | \`Wwire[T,N]\` — row stack |
| \`Wwire[R,C]\` with **R > 1** and **C > 1** | **Error:** \`Cannot repeat matrix\` |

Plain wires stay plain (no tensor metadata on output).

## Examples

### Plain wire

\`\`\`logts-play
8wire d = 10101010
24wire bus = REPEAT(d, \\3)
show(bus)
\`\`\`

### Column vector → matrix

\`\`\`logts-play
4wire[3] col = 0001 + 0010 + 0100
4wire[3,2] m = REPEAT(col, \\2)
4wire a = m:0:1
show(a)
\`\`\`

### Row vector \`4wire[1,3]\` → \`4wire[2,3]\`

\`\`\`logts-play
4wire[1,3] row = 0001 + 0010 + 0100
4wire[2,3] m = REPEAT(row, \\2)
4wire a = m:1:2
show(a)
\`\`\`

### Times from a scalar wire

\`\`\`logts-play
8wire d = 10101010
2wire t = 11
24wire bus = REPEAT(d, t)
show(bus)
\`\`\`

## See also

[PIVOT](wire-vectors.md#pivot) · [MCAT](builtin-MCAT.md) · [FILL](builtin-FILL.md)
`,
    'builtin-REVERSE.md': `# REVERSE (bit order)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Reverse bit order within each operand (MSB ↔ LSB).

## Signatures

\`\`\`
REVERSE(Xbit value) -> Xbit
REVERSE(Wbit[n] data ; vector) -> Wbit[n]
REVERSE(Wbit[n,m] data ; matrix) -> Wbit[n,m]
\`\`\`

Unary — one data argument (whole vector in vector mode).

## Scalar (default)

- \`result[i]\` = \`val[width-1-i]\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`vector\` | Reverse bits **within each element** on **rank-1** tensors (not reverse element order). |
| \`matrix\` | Reverse bits within each cell on **matrix** \`Wwire[N,M]\`. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`REVERSE(Xbit value)\`

\`\`\`logts-play
4wire x = 0011
4wire y = REVERSE(x)
show(y)
\`\`\`

\`0011\` → \`1100\`.

\`\`\`logts-play
4wire a = 1010
4wire b = REVERSE(a)
show(b)
\`\`\`

\`1010\` → \`0101\`.

Palindrome unchanged:

\`\`\`logts-play
4wire val = 1001
4wire r = REVERSE(val)
show(r)
\`\`\`

→ \`1001\`.

### \`REVERSE(Wbit[n] data ; vector)\`

\`\`\`logts-play
4wire[2] vector = 0011 + 1100
4wire[2] out = REVERSE(vector; vector)
show(out)
\`\`\`

→ \`1100\` + \`0011\` → blob \`11000011\`.

\`\`\`logts-play
4wire[3] v = 0011 + 1010 + 1111
4wire[3] r = REVERSE(v; vector)
show(r)
\`\`\`

Per element: \`1100\`, \`0101\`, \`1111\`.

### \`REVERSE(Wbit[n,m] data ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 0011 + 1010 + 1111 + 0000
4wire[2,2] out = REVERSE(m; matrix)
show(out)
\`\`\`

Per cell: MSB ↔ LSB within each **W**-bit cell.

## See also

[LROTATE](builtin-LROTATE.md) · [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md)
`,
    'builtin-routing-functions.md': `# Built-in routing functions (MUX / DEMUX)

Selector width \`N\` is inferred from the \`sel\` argument at runtime → \`2^N\` data inputs (MUX) or outputs (DEMUX).

Index: [builtin-functions.md](builtin-functions.md)

---

## MUX

\`\`\`
MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit
\`\`\`

**Multiple data arguments** — pass \`2^N\` separate inputs after \`sel\`:

### Runnable example

\`\`\`logts-play
1wire sel = 0
4wire a = 0001
4wire b = 0010
4wire y = MUX(sel, a, b)
probe(y)
\`\`\`

**Packed data argument** — one bit-string split into \`2^N\` equal chunks:

### Runnable example

\`\`\`logts-play
1wire sel = 1
8wire packed = 00010010
4wire y = MUX(sel, packed)
show(y)
\`\`\`

---

## DEMUX

\`\`\`
DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..
\`\`\`

Returns **\`2^N\` values**: the selected output carries \`data\`, all others are zero (same width as \`data\`).

### Runnable example

\`\`\`logts-play
1wire sel = 0
4wire data = 1010
4wire out0, 4wire out1 = DEMUX(sel, data)
probe(out0)
probe(out1)
\`\`\`

---

## MUX in MODE ZSTATE

With \`MODE ZSTATE\` active:

| Operand | Validation |
|---------|------------|
| \`sel\` | Strict \`0\`/\`1\` — error on \`Z\` or \`X\` |
| Selected \`dataK\` | Error on **\`X\` only**; **\`Z\` allowed** (passed through to output) |
| Unselected \`data\` | Not validated |

When MUX output is assigned to a shared bus in the same wave step, bits \`Z\` in the contribution do not drive at merge (same rules as \`ZCONNECT\`). For enable-gated multi-bit drive, prefer **\`ZCONNECT(bus, en, data)\`** — [zstate.md](zstate.md).

**Load & Run** — \`Z\` in selected input:

\`\`\`logts-play wave
MODE ZSTATE

1wire sel = 0
4wire d0 = ?Z01Z
4wire d1 = ?XXXX
4wire r = MUX(sel, d0, d1)
show(r)
\`\`\`

---

## Typical uses

\`\`\`
# ALU result select (mini-CPU pattern)
4wire y = MUX(op.1, .add:get, .sub:get)

# Toggle when p falls (hold vs invert)
tg0 = MUX(p, tg0, NOT(tg0))
\`\`\`
`,
    'builtin-RROTATE.md': `# RROTATE (right rotate)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Rotate bits right; LSBs wrap to MSBs. Width unchanged.

## Signatures

\`\`\`
RROTATE(Xbit data, Ybit count) -> Xbit
RROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
RROTATE(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix) -> Wbit[n,m]
\`\`\`

- **\`count\`** is taken **modulo** element width.
- **\`; vector\`**: \`count\` may be scalar (broadcast) or **\`Kbit[n]\`** (per index).

## Scalar (default)

- Rotate right by \`count mod width\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`vector\` | Per element on **rank-1** tensors. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`RROTATE(Xbit data, Ybit count)\`

\`\`\`logts-play
4wire x = 1011
4wire y = RROTATE(x, 1)
show(y)
\`\`\`

\`1011\` rotr 1 → \`1101\`.

\`\`\`logts-play
4wire val = 1001
4wire cnt = 0001
4wire r = RROTATE(val, cnt)
show(r)
\`\`\`

→ \`1100\`.

### \`RROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector)\`

Scalar count (broadcast):

\`\`\`logts-play
4wire[2] vector = 1011 + 0101
4wire[2] r = RROTATE(vector, 0001; vector)
show(r)
\`\`\`

→ \`1101\` + \`1010\` → blob \`11011010\`.

Per-index count vector:

\`\`\`logts-play
4wire[3] data = 1011 + 0101 + 1100
2wire[3] counts = 01 + 10 + 01
4wire[3] out = RROTATE(data, counts; vector)
show(out)
\`\`\`

→ \`110101010110\` (from regression test).

### \`RROTATE(Wbit[n,m] data, … ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 1011 + 0101 + 1100 + 0011
4wire[2,2] out = RROTATE(m, 0001; matrix)
show(out)
\`\`\`

## See also

[LROTATE](builtin-LROTATE.md) · [RSHIFT](builtin-RSHIFT.md)
`,
    'builtin-RSHIFT.md': `# RSHIFT (logical right shift)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix \`; matrix\`](matrix-reduction.md)

Shift bits toward LSB. Vacated MSBs use **\`fill\`** (logical) or the sign bit (\`; signed\` = ASHR).

## Signatures

\`\`\`
RSHIFT(Xbit data, Nbit n) -> Xbit
RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
RSHIFT(Xbit data, Nbit n; signed) -> Xbit
RSHIFT(8bit data, Nbit n; q4p4) -> 8bit
RSHIFT(16bit data, Nbit n; q8p8) -> 16bit
RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector signed) -> Wbit[n]
RSHIFT(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix) -> Wbit[n,m]
RSHIFT(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix signed) -> Wbit[n,m]
\`\`\`

- **\`fill\`** — MSB padding for logical shift (default \`0\`). **Ignored** when \`; signed\` is set.
- **\`; vector\`**: \`count\` may be a scalar (broadcast) or a **\`Kbit[n]\`** vector (one shift amount per index). Optional third arg **\`fill\`** applies in logical vector mode.

Sugar: \`data > n\` and \`data > n w1\` — [short-notation.md](short-notation.md).

## Scalar (default)

- Logical shift right; **same width** as \`data\`.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Arithmetic shift (ASHR): MSB replicated; \`fill\` ignored. |
| \`q4p4\` | ASHR on **8-bit** fixed-point wires (same as \`; signed\` on raw bits). |
| \`q8p8\` | ASHR on **16-bit** fixed-point wires. |
| \`vector\` | Per element on **rank-1** tensors. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; \`count\` scalar or rank-1 broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`RSHIFT(Xbit data, Nbit n)\`

\`\`\`logts-play
4wire x = 1010
4wire y = RSHIFT(x, 1)
probe(y)
\`\`\`

\`1010 >> 1\` → \`0101\`.

\`\`\`logts-play
4wire val = 1000
4wire cnt = 0001
4wire r = RSHIFT(val, cnt)
show(r)
\`\`\`

→ \`0100\`.

### \`RSHIFT(Xbit data, Nbit n, 1bit fill)\`

\`\`\`logts-play
4wire x = 1010
4wire y0 = RSHIFT(x, 1, 0)
4wire y1 = RSHIFT(x, 1, 1)
show(y0)
show(y1)
\`\`\`

\`fill=0\` → \`0101\`; \`fill=1\` → \`1101\`.

\`\`\`logts-play
4wire x2 = 10
4wire y2 = RSHIFT(x2, 11, 1)
show(y2)
\`\`\`

Shift by 3 with fill \`1\` on 2-bit \`10\` → \`11\`.

### \`RSHIFT(Xbit data, Nbit n; signed)\`

\`\`\`logts-play
4wire neg = 1111
4wire pos = 0111
4wire log = RSHIFT(neg, 1)
4wire arithNeg = RSHIFT(neg, 1; signed)
4wire arithPos = RSHIFT(pos, 1; signed)
show(log)
show(arithNeg)
show(arithPos)
\`\`\`

\`1111\` logical → \`0111\`; arithmetic → \`1111\`. \`0111\` (=7) arithmetic → \`0011\` (=3).

\`fill\` is ignored with \`; signed\`:

\`\`\`logts-play
4wire x = 1111
4wire y = RSHIFT(x, 1, 0; signed)
show(y)
\`\`\`

→ \`1111\` (still −1).

### \`RSHIFT(8bit data, Nbit n; q4p4)\`

\`\`\`logts-play
8wire x = 11110000
8wire y = RSHIFT(x, 1; q4p4)
show(y; q4p4)
\`\`\`

Fixed-point \`−1.0 >> 1 = −0.5\` → \`11111000\`.

**Note:** \`; fp16\` and \`; bf16\` are **not** accepted on RSHIFT (runtime error).

### \`RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector)\`

Scalar count (broadcast):

\`\`\`logts-play
4wire[3] vector = 1010 + 0100 + 0001
4wire[3] out = RSHIFT(vector, 0001; vector)
show(out)
\`\`\`

Per-index **\`Kbit[n]\`** count:

\`\`\`logts-play
4wire[3] data = 1010 + 0100 + 0001
2wire[3] counts = 01 + 10 + 01
4wire[3] out = RSHIFT(data, counts; vector)
show(out)
\`\`\`

### \`RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector signed)\`

\`\`\`logts-play
4wire[3] vector = 1111 + 0111 + 0001
4wire[3] out = RSHIFT(vector, 0001; vector signed)
show(out)
\`\`\`

ASHR per element (\`1111\`→\`1111\`, \`0111\`→\`0011\`, \`0001\`→\`0000\`).

### \`RSHIFT(Wbit[n,m] data, … ; matrix)\`

\`\`\`logts-play
4wire[2,2] m = 1010 + 0100 + 0001 + 1111
4wire[2,2] out = RSHIFT(m, 0001; matrix)
show(out)
\`\`\`

Per-cell logical shift right by 1.

### \`RSHIFT(Wbit[n,m] data, … ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] m = 1111 + 0111 + 0001 + 1000
4wire[2,2] out = RSHIFT(m, 0001; matrix signed)
show(out)
\`\`\`

Per-cell ASHR by 1 (\`1111\`→\`1111\`, \`0111\`→\`0011\`, …).

## See also

[LSHIFT](builtin-LSHIFT.md) · [LROTATE](builtin-LROTATE.md)
`,
    'builtin-sequential-functions.md': `# Built-in sequential functions

Stateful built-ins (no panel device). Index: [builtin-functions.md](builtin-functions.md)

---

## LATCH

\`\`\`
LATCH(Xbit data, 1bit clock) -> Xbit
\`\`\`

Transparent latch: when \`clock = 1\`, output follows \`data\`; when \`clock = 0\`, output holds.

### Runnable example

\`\`\`logts-play
4wire data = 1010
1wire clk = 1
4wire out = LATCH(data, clk)
probe(out)
\`\`\`

---

## REG

\`\`\`
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
\`\`\`

Width is inferred from \`data\`. Falling-edge wire clock or \`~\` + \`NEXT(~)\`; \`clear = 1\` forces zero.

Full behaviour, examples, and \`comp [reg]\` comparison: **[reg.md](reg.md)**.

### Runnable example

\`\`\`logts-play
4wire data = 1100
1wire clk = 0
1wire clr = 0
4wire out = REG(data, clk, clr)
probe(out)
\`\`\`
`,
    'builtin-SHAPE.md': `# SHAPE

Index: [Wire vectors](wire-vectors.md) · [RANK](builtin-RANK.md) · [Tensor / matrix built-ins](builtin-functions.md)

Returns the **row** and **column** dimensions of a whole tensor as two unsigned scalar wires.

## Signatures

\`\`\`
SHAPE(Wwire tensor) -> bit rows, bit cols
\`\`\`

- **\`rows\`** — \`meta.rows\` (number of matrix rows, or \`1\` for a horizontal rank-1 vector)
- **\`cols\`** — \`meta.cols\` (number of matrix columns, or element count for \`[N]\` / \`[1,N]\`)

Bit width of each scalar follows the **assignment target** wire (\`2wire rows, 3wire cols = SHAPE(m)\`). Without a multi-wire assign context, each dimension uses \`bitIndexWidth(dim + 1)\` bits.

## Examples

### Matrix

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
2wire rows, 2wire cols = SHAPE(m)
show(rows)
show(cols)
\`\`\`

→ \`rows=10\`, \`cols=10\` (2×2).

### Rank-1 vector

\`\`\`logts-play
4wire[4] v = 0001 + 0010 + 0100 + 1000
2wire rows, 3wire cols = SHAPE(v)
show(rows)
show(cols)
\`\`\`

→ \`rows=01\` (1 row), \`cols=100\` (4 columns).

## See also

[RANK](builtin-RANK.md) · [wire-vectors.md](wire-vectors.md)
`,
    'builtin-SUBTRACT.md': `# SUBTRACT

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise \`; vector\`](vector-reduction.md#element-wise-mode-vector) · [Matrix \`; matrix\`](matrix-reduction.md)

Binary subtraction with wrap-around (two's complement style borrow).

## Signatures

\`\`\`
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
SUBTRACT(8bit a, 8bit b; q4p4) -> 8bit result, 1bit overflow
SUBTRACT(16bit a, 16bit b; q8p8) -> 16bit result, 1bit overflow
SUBTRACT(16bit a, 16bit b; fp16) -> 16bit result, 1bit inexact
SUBTRACT(16bit a, 16bit b; bf16) -> 16bit result, 1bit inexact
SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
\`\`\`

## Scalar (default)

- \`result\` = \`(a - b) mod 2^N\`
- \`carry\` = \`1\` if \`a < b\` (borrow); else \`0\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Same \`result\` bits; second return is signed **overflow**. |
| \`q4p4\` | Q4.4 on **8-bit** wires. |
| \`q8p8\` | Q8.8 on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float16 / bf16 on **16-bit** wires. |
| \`vector\` | Per index on **rank-1** tensors; matching \`elementCount\`. **No** implicit broadcast without the tag (unlike ADD). |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### \`SUBTRACT(Xbit a, Xbit b)\`

Decrement and borrow on underflow:

\`\`\`logts-play
4wire idx = 0011
4wire dec = 0001
4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)
show(prevIdx)
show(carry)
\`\`\`

\`\`\`logts-play
4wire idx2 = 0000
4wire dec2 = 0001
4wire prevIdx2, 1wire carry2 = SUBTRACT(idx2, dec2)
show(prevIdx2)
show(carry2)
\`\`\`

\`3-1=2\`. \`0-1\` wraps to \`1111\`, \`carry2=1\`.

### \`SUBTRACT(Xbit a, Xbit b; signed)\`

Signed overflow on underflow past representable range:

\`\`\`logts-play
4wire a = 1000
4wire b = 0001
4wire r, 1wire ovf = SUBTRACT(a, b; signed)
show(r)
show(ovf)
\`\`\`

Signed \`−8 − 1\` on 4 bits → \`r=0111\`, overflow \`1\`.

### \`SUBTRACT(8bit a, 8bit b; q4p4)\`

\`2.0 − 0.5 = 1.5\`:

\`\`\`logts-play
8wire a = 00100000
8wire b = 00001000
8wire s, 1wire ovf = SUBTRACT(a, b; q4p4)
show(s; q4p4)
show(ovf)
\`\`\`

### \`SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector)\`

\`\`\`logts-play
4wire[3] vectorA = 0100 + 0010 + 0001
4wire[3] vectorB = 0001 + 0001 + 0001
4wire[3] r, 4wire[3] f = SUBTRACT(vectorA, vectorB; vector)
show(r)
show(f)
\`\`\`

### \`SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)\`

Scalar subtrahend broadcast per index:

\`\`\`logts-play
4wire[3] vectorA = 0100 + 0010 + 0001
4wire[3] r, 4wire[3] f = SUBTRACT(vectorA, 0001; vector signed)
show(r)
show(f)
\`\`\`

### \`SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0100 + 0010 + 0001 + 0011
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] f = SUBTRACT(a, b; matrix)
show(r)
show(f)
\`\`\`

### \`SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)\`

\`\`\`logts-play
4wire[2,2] a = 1000 + 0111 + 0001 + 0011
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] f = SUBTRACT(a, b; matrix signed)
show(r)
show(f)
\`\`\`

## See also

[ADD](builtin-ADD.md) · \`comp [subtract]\`
`,
    'builtin-SUM.md': `# SUM

Index: [Vector reduction](vector-reduction.md) · [Matrix \`; matrix\`](matrix-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

Reduce operands to a scalar sum, or per-index with \`; vector\` on rank-1 tensors, per-cell with \`; matrix\` on true matrices (\`R>1\`, \`C>1\`), or along an axis with \`; row\` / \`; col\`.

## Signatures

\`\`\`
SUM(Wbit ...) -> Wbit result, Wbit over
SUM(Wbit ...; signed) -> Wbit result, Wbit over
SUM(Wbit ...; q4p4) -> Wbit result, Wbit over
SUM(Wbit ...; q8p8) -> Wbit result, Wbit over
SUM(Wbit ...; fp16) -> Wbit result, Wbit over
SUM(Wbit ...; bf16) -> Wbit result, Wbit over
SUM(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n], Wbit[n]
SUM(Wbit[n] ... ; signed vector) -> Wbit[n], Wbit[n]
SUM(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b, ... ; matrix) -> Wbit[n,m], Wbit[n,m]
SUM(Wbit[n,m] ... ; signed matrix) -> Wbit[n,m], Wbit[n,m]
SUM(Wbit[n,m] m ; row) -> Wbit[n], Wbit[n]
SUM(Wbit[n,m] m ; col) -> Wbit[m], Wbit[m]
SUM(Wbit[n,m] m ; row signed) -> Wbit[n], Wbit[n]
SUM(Wbit[n,m] m ; col signed) -> Wbit[m], Wbit[m]
\`\`\`

Variadic: whole vectors expand to elements (see [vector-reduction.md](vector-reduction.md)).

## Scalar (default)

- Output is **2W** bits: low **W** in \`result\`, next **W** in \`over\`
- Full value = concatenate \`over\` then \`result\` (MSB → LSB)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed two's complement sum; same 2W packing. |
| \`q4p4\` | Q4.4 sum on **8-bit** wires. |
| \`q8p8\` | Q8.8 sum on **16-bit** wires. |
| \`fp16\` / \`bf16\` | Float sum on **16-bit** wires (round at each step). |
| \`vector\` | Per index on **rank-1** tensors → \`Wbit[n]\` + \`Wbit[n] over\`. Element slices (\`vectorB:i\`) and plain **W**-bit scalars broadcast. |
| \`matrix\` | Per cell on **matrix** \`Wwire[N,M]\`; rank-1 operands broadcast. Mutually exclusive with \`vector\`. See [matrix-reduction.md](matrix-reduction.md). |
| \`row\` | On a **matrix**, sum each **row** across columns → \`Wbit[N]\` + \`Wbit[N] over\`. Mutually exclusive with \`vector\` and \`matrix\`. |
| \`col\` | On a **matrix**, sum each **column** across rows → \`Wbit[M]\` + \`Wbit[M] over\`. Mutually exclusive with \`vector\` and \`matrix\`. |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix). Rank-1 tensors without \`; row\` / \`; col\` use scalar or \`; vector\` mode; axis tags on rank-1 tensors are a **runtime error** (\`use scalar SUM without col|row tag\`).

## Examples

### \`SUM(Wbit ...)\`

Two scalars:

\`\`\`logts-play
4wire a = 0011
4wire b = 0101
4wire result, 4wire over = SUM(a, b)
show(result)
show(over)
\`\`\`

\`3+5=8\` → \`result=1000\`, \`over=0000\`.

Whole vector (sum of elements):

\`\`\`logts-play
4wire[3] vectorA = 0001 + 0010 + 0011
4wire result, 4wire over = SUM(vectorA)
show(result)
show(over)
\`\`\`

\`1+2+3=6\` → \`result=0110\`, \`over=0000\`.

### \`SUM(Wbit ...; signed)\`

\`\`\`logts-play
4wire a = 1111
4wire b = 0001
4wire r, 4wire o = SUM(a, b; signed)
show(r)
show(o)
\`\`\`

Signed \`−1 + 1 = 0\`.

### \`SUM(Wbit ...; q4p4)\`

Sum of vector elements in Q4.4:

\`\`\`logts-play
8wire[2] v = 00011000 + 00001000
8wire total, 8wire over = SUM(v; q4p4)
show(total; q4p4)
show(over)
\`\`\`

### \`SUM(Wbit[n] a, … ; vector)\`

\`\`\`logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] r, 4wire[4] o = SUM(vectorA, vectorB; vector)
show(r)
show(o)
\`\`\`

Element slice broadcast (add \`vectorB:1\` at every index):

\`\`\`logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] r, 4wire[4] o = SUM(vectorA, vectorB:1; vector)
show(r)
show(o)
\`\`\`

### \`SUM(Wbit[n] … ; signed vector)\`

\`\`\`logts-play
4wire[2] vectorA = 1111 + 0111
4wire[2] vectorB = 0001 + 0001
4wire[2] r, 4wire[2] o = SUM(vectorA, vectorB; signed vector)
show(r)
show(o)
\`\`\`

### \`SUM(Wbit[n,m] … ; matrix)\`

\`\`\`logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0010 + 0010 + 0010 + 0010
4wire[2,2] r, 4wire[2,2] o = SUM(a, b; matrix)
show(r)
show(o)
\`\`\`

### \`SUM(Wbit[n,m] … ; signed matrix)\`

\`\`\`logts-play
4wire[2,2] a = 1111 + 0111 + 0001 + 1000
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] o = SUM(a, b; signed matrix)
show(r)
show(o)
\`\`\`

### \`SUM(Wbit[n,m] m ; row)\` / \`SUM(Wbit[n,m] m ; col)\`

Axis reduction on a **true matrix** (\`N>1\`, \`M>1\`):

- **\`; row\`** — one sum per row (across columns) → \`Wbit[N]\` + \`Wbit[N] over\`
- **\`; col\`** — one sum per column (across rows) → \`Wbit[M]\` + \`Wbit[M] over\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] r, 4wire[2] o = SUM(m; row)
4wire[2] c, 4wire[2] co = SUM(m; col)
show(r)
show(c)
\`\`\`

Row sums: \`3\`, \`12\` → \`00111100\`. Column sums: \`5\`, \`10\` → \`01011010\`.

## See also

[DOT](builtin-DOT.md) · [ADD](builtin-ADD.md)
`,
    'builtin-tagged-index.md': `# Built-in functions with call tags

Canonical reference for built-ins that accept **\`; signed\`**, **\`; q4p4\`**, **\`; q8p8\`**, **\`; fp16\`**, **\`; bf16\`**, **\`; vector\`**, **\`; matrix\`**, **\`; row\`**, **\`; col\`**, and/or **\`; index\`**. Scalar behaviour and tag semantics live on each function page — not duplicated here.

Index: [Arithmetic overview](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Matrix element-wise (\`; matrix\`)](matrix-reduction.md) · [Bit transform](builtin-bit-transform-functions.md) · [Built-in functions](builtin-functions.md)

Cross-cutting topics:

- Operand expansion vs **\`; vector\`**: [vector-reduction.md — element-wise mode](vector-reduction.md#element-wise-mode-vector)
- **\`; matrix\`** on 2D tensors: [matrix-reduction.md](matrix-reduction.md)
- Signed two's complement overview: [arithmetic.md — tag overview](arithmetic.md#tag-overview)
- Wire vectors & matrices: [wire-vectors.md](wire-vectors.md)

---

## Index by function

| Function | Page | \`signed\` | \`q4p4\` | \`q8p8\` | \`fp16\` | \`bf16\` | \`vector\` | \`matrix\` | \`row\` / \`col\` | \`index\` | Hub |
|----------|------|----------|--------|--------|--------|--------|----------|----------|---------------|---------|-----|
| ADD | [builtin-ADD.md](builtin-ADD.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| SUBTRACT | [builtin-SUBTRACT.md](builtin-SUBTRACT.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| MULTIPLY | [builtin-MULTIPLY.md](builtin-MULTIPLY.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| DIVIDE | [builtin-DIVIDE.md](builtin-DIVIDE.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| MAC | [builtin-MAC.md](builtin-MAC.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| ABS | [builtin-ABS.md](builtin-ABS.md) | yes | yes | yes | yes | yes | — | — | — | — | arithmetic |
| NFORMAT | [builtin-NFORMAT.md](builtin-NFORMAT.md) | src | src | src | src | src | yes | yes | — | — | arithmetic |
| GT | [builtin-GT.md](builtin-GT.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| LT | [builtin-LT.md](builtin-LT.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| MIN | [builtin-MIN.md](builtin-MIN.md) | yes | yes | yes | yes | yes | yes | yes | yes | — | arithmetic / vector |
| MAX | [builtin-MAX.md](builtin-MAX.md) | yes | yes | yes | yes | yes | yes | yes | yes | — | arithmetic / vector |
| CLAMP | [builtin-CLAMP.md](builtin-CLAMP.md) | yes | yes | yes | yes | yes | yes | yes | — | — | arithmetic |
| SUM | [builtin-SUM.md](builtin-SUM.md) | yes | yes | yes | yes | yes | yes | yes | yes | — | vector |
| DOT | [builtin-DOT.md](builtin-DOT.md) | yes | yes | yes | yes | yes | — | — | — | — | vector |
| ARGMAX | [builtin-ARGMAX.md](builtin-ARGMAX.md) | yes | yes | yes | yes | yes | — | — | yes | yes | vector |
| ARGMIN | [builtin-ARGMIN.md](builtin-ARGMIN.md) | yes | yes | yes | yes | yes | — | — | yes | yes | vector |
| EQ | [builtin-EQ.md](builtin-EQ.md) | — | — | — | — | — | yes | yes | — | — | logic gates |
| RSHIFT | [builtin-RSHIFT.md](builtin-RSHIFT.md) | yes | yes | yes | — | — | yes | yes | — | — | bit transform |
| LSHIFT | [builtin-LSHIFT.md](builtin-LSHIFT.md) | — | — | — | — | — | yes | yes | — | — | bit transform |
| LROTATE | [builtin-LROTATE.md](builtin-LROTATE.md) | — | — | — | — | — | yes | yes | — | — | bit transform |
| RROTATE | [builtin-RROTATE.md](builtin-RROTATE.md) | — | — | — | — | — | yes | yes | — | — | bit transform |
| REVERSE | [builtin-REVERSE.md](builtin-REVERSE.md) | — | — | — | — | — | yes | yes | — | — | bit transform |

Use \`doc(NAME)\` in scripts for live signatures from \`Interpreter.BUILTIN_DOC\`.

**Note:** **\`; signed\`**, **\`; q4p4\`**, **\`; q8p8\`**, **\`; fp16\`**, and **\`; bf16\`** are **mutually exclusive** (at most one numeric-format tag per call). **\`; vector\`**, **\`; matrix\`**, **\`; row\`**, and **\`; col\`** cannot appear together. **DOT** does not use axis tags. **ARGMAX** / **ARGMIN** use shape rules instead of **\`; matrix\`** (but support **\`; row\`** / **\`; col\`**).

**Rank-1** (\`[N]\`, \`[1,N]\`, \`[N,1]\`) = vector for **\`; vector\`**; only **\`[R,C]\` with R>1 and C>1** is a matrix for **\`; matrix\`**. See [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).
`,
    'builtin-TRACE.md': `# TRACE (matrix trace)

Index: [2D tensors](wire-vectors.md) · [SUM](builtin-SUM.md)

Sum of **diagonal** elements of a square matrix (same accumulation semantics as **SUM**).

## Signatures

\`\`\`
TRACE(Wwire[n,n] matrix) -> Wbit result, Wbit over
\`\`\`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| \`signed\` | Signed sum along diagonal. |

## Examples

\`\`\`logts-play
4wire[2,2] eye = IDENTITY(\\2)
4wire t, 4wire over = TRACE(eye)
show(t)
\`\`\`

For \`IDENTITY(2)\`: trace = \`1 + 1 = 2\` → \`0010\`.

## See also

[SUM](builtin-SUM.md) · [DIAG](builtin-DIAG.md)
`,
    'builtin-TRIL.md': `# TRIL (lower triangle)

Index: [2D tensors](wire-vectors.md)

Keep the **lower triangle** (including diagonal); zero above.

## Signatures

\`\`\`
TRIL(Wwire[n,n] matrix) -> Wwire[n,n]
\`\`\`

Cell **\`(r,c)\`** kept when **\`c ≤ r\`**.

## Examples

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] lo = TRIL(m)
show(lo)
\`\`\`

## See also

[TRIU](builtin-TRIU.md) · [PIVOT](wire-vectors.md#pivot)
`,
    'builtin-TRIU.md': `# TRIU (upper triangle)

Index: [2D tensors](wire-vectors.md)

Keep the **upper triangle** (including diagonal); zero below.

## Signatures

\`\`\`
TRIU(Wwire[n,n] matrix) -> Wwire[n,n]
\`\`\`

Cell **\`(r,c)\`** kept when **\`c ≥ r\`**.

## Examples

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] up = TRIU(m)
show(up)
\`\`\`

## See also

[TRIL](builtin-TRIL.md)
`,
    'builtin-ZEROS.md': `# ZEROS (zero matrix)

Index: [2D tensors](wire-vectors.md) · [IDENTITY](builtin-IDENTITY.md)

Square **N×N** matrix with all elements **0**.

## Signatures

\`\`\`
ZEROS(\\N) -> Wwire[N,N]
\`\`\`

Same rules as [IDENTITY](builtin-IDENTITY.md): \`\\N\` decimal, **W** from target wire.

## Examples

\`\`\`logts-play
4wire[2,2] z = ZEROS(\\2)
4wire a = z:0:1
show(a)
\`\`\`

## See also

[IDENTITY](builtin-IDENTITY.md) · [FILL](builtin-FILL.md)
`,
    'chip.md': `# Chip components

A **chip** is a lightweight reusable block — same pin/pout/exec model as [board.md](board.md), but **without** UI components, \`def\`, nested PCB/board definitions, or \`~~\`. Use chips to build libraries of logic (adders, multiplexers, ALU slices) that you compose inside **boards** or other chips.

Full signature reference: \`doc(chip)\` and \`doc(chip.type)\` — see [doc-function.md](doc-function.md).

---

## Definition

\`\`\`
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum
\`\`\`

| Part | Meaning |
|------|---------|
| \`chip +[name]:\` | Define chip type (top-level only) |
| \`Npin\` / \`Npout\` | External ports |
| \`exec\` / \`on\` | Same as PCB — property-block trigger |
| body | \`comp\`, assignments, \`chip [other] .inst::\` |
| \`:Nbit var\` | Optional return spec for \`doc()\` |

Chip names cannot collide with reserved component names (\`adder\`, \`chip\`, \`7seg\`, …).

---

## Instantiation

\`\`\`
chip [halfAdd] .u1::
\`\`\`

Property block (drive pins + exec):

\`\`\`
.u1:{
  a = 0101
  b = 0011
  set = 1
}
\`\`\`

Read pout from outside:

\`\`\`
4wire r = .u1:sum
1wire c = .u1:carry
\`\`\`

---

## Allowed and forbidden in chip body

**Allowed**

- \`comp\` for logic devices: \`adder\`, \`subtract\`, \`mem\`, \`reg\`, \`counter\`, \`shifter\`, \`divider\`, \`multiplier\`, …
- \`chip [existingType] .sub::\` — nest other **defined** chip types
- \`board [existingType] .sub::\` — nest **defined** board types (UI inside board)
- Wire assignments and property blocks on internal components

**Forbidden**

- \`def\` user functions
- \`pcb +[...]\` or \`pcb [type] .inst::\`
- \`chip +[...]\` or \`board +[...]\` nested definitions
- \`~~\` next section
- UI / panel types: \`switch\`, \`key\`, \`dip\`, \`rotary\`, \`osc\`, \`led\`, \`7seg\`, \`14seg\`, \`lcd\`, \`dots\`, \`ledBar\`

---

## Internal wiring

Use \`.inst:pin\` for component pins and bare names for chip-level wires:

\`\`\`
.add:a = a
sum = .add:get
\`\`\`

Probe from outside:

| Form | Target |
|------|--------|
| \`probe(.u1:sum)\` | pout \`sum\` |
| \`probe(.u1.partial)\` | internal wire \`partial\` in chip body |
| \`probe(.u1:carry)\` | pout or component property \`:carry\` |

See [debug.md](debug.md).

---

## Runnable example

\`\`\`logts-play
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
\`\`\`

---

## Chip vs PCB

PCBs are for complete interactive circuits; chips are building blocks. A typical flow:

1. Define \`chip +[aluSlice]:\` …
2. Instantiate inside \`pcb +[board]:\` with \`chip [aluSlice] .slice::\`
3. Add \`led\`, \`switch\`, and panel wiring only in the PCB

Interactive circuits: [board.md](board.md). Component catalog: [components.md](components.md).
`,
    'clcd-symbols.md': `# CLCD — Symbol catalog

Search the symbols supported by \`comp [clcd]\`. Each result shows available \`style\` variants (1 = solid, 2 = regular, 3 = brands) and a syntax snippet.

Canvas-drawn symbols (\`digit7\`, \`digit14\`, \`dp\`, \`colon\`) and the text symbol **\`label\`** are listed in the fixed section at the bottom of the gallery.

See also [\`clcd.md\`](clcd.md) for component syntax and runnable examples.

\`\`\`clcd-symbol-gallery
\`\`\`
`,
    'clcd.md': `# CLCD component (\`clcd\`)

\`comp [clcd]\` is a **canvas-based custom LCD** — predefined symbols at \`(x, y)\`, each driven by one bit or a bit range. ON uses \`color\`, OFF uses \`bgColor\` (per symbol, or \`bgColorSym\` / \`bgColor\` defaults at component level).

Signature: \`doc(comp.clcd)\`.

Distinct from [\`lcd\`](lcd.md) (pixel matrix + HD44780 font).

---

## Syntax

\`\`\`logts
comp [clcd] .name:
  width: 200
  height: 100
  color: ^00ff00
  bgColor: ^000000
  bgColorSym: ^ffff00
  nl
  = {
    symbolName:
      x: 10
      y: 20
      bit: 0
      color: ^ffaa00
      bgColor: ^332200
    :
  }
  :
\`\`\`

Minimal:

\`\`\`logts
comp [clcd] .panel::
\`\`\`

---

## Attributes (component)

| Attribute | Default | Description |
|-----------|---------|-------------|
| \`width\` | 200 | Canvas width (px) |
| \`height\` | 100 | Canvas height (px) |
| \`color\` | \`^00ff00\` | Default ON color for symbols |
| \`bgColor\` | \`^000000\` | Canvas background fill |
| \`bgColorSym\` | (same as \`bgColor\`) | Default OFF color for all symbols — equivalent to setting \`bgColor\` on every symbol entry; per-symbol \`bgColor\` still overrides |
| \`touch\` | \`0\` | When \`1\`, enables click/touch hit-testing on symbols with \`bitOut\` |
| \`touchColor\` | (off) | When set, draws debug borders around touch hit boxes |
| \`touchPadding\` | \`0\` | Default padding (px) for symbol touch rects when \`padding\` is omitted |
| \`nl\` | off | Newline after display |

## Symbol fields (\`= { … }\`)

| Field | Required | Description |
|-------|----------|-------------|
| \`x\`, \`y\` | yes | Position on canvas |
| \`bit\` | one of | Single control bit |
| \`bits\` | one of | Inclusive range \`N-M\` (e.g. \`digit7\`) |
| \`bitOut\` | no | Touch output bit index (optional; symbol omitted from \`:out\` if absent) |
| \`touchType\` | with \`bitOut\` | \`1\` momentary (default), \`2\` pulse, \`3\` latch/toggle |
| \`width\`, \`height\` | no | Touch hit box size (px); defaults from \`size\` or per kind (FA 22×22, \`digit7\` 28×44, …) |
| \`padding\` | no | Extra margin (px) around hit box; defaults to \`touchPadding\` or \`0\` |
| \`color\` | no | Override ON color for this symbol |
| \`bgColor\` | no | Override OFF color for this symbol |
| \`style\` | no | FA icon style: \`1\` solid (default), \`2\` regular, \`3\` brands — only on FA symbols; not on canvas or \`label\` |
| \`size\` | no | Display size in px (target height). **FA** icons: font size, default **22**, range 8–64. **Canvas** (\`digit7\`, \`dp\`, …): uniform scale to target height, defaults **44** / **8** / **32**, range 8–120. **\`label\`**: font size, default **14**, range 6–48. Touch hit box follows \`size\` when \`width\`/\`height\` are omitted |

### \`label\` (text on canvas)

Use the **\`label\`** symbol for bit-driven text. The symbol name is always \`label\`; use multiple \`label:\` entries for several strings (same pattern as duplicate \`digit7\`).

| Field | Required | Description |
|-------|----------|-------------|
| \`text\` | yes | Quoted string, e.g. \`text: "Load"\` |
| \`bit\` | yes | Single control bit (\`bits\` range not supported) |
| \`family\` | no | \`mono\` (default), \`sans\`, or \`serif\` |
| \`size\` | no | Font size in px, 6–48 (default \`14\`) |
| \`weight\` | no | \`normal\` (default), \`bold\`, \`italic\`, \`boldItalic\` |

When the control bit is **ON**, text uses \`color\`; when **OFF**, text uses \`bgColor\` (same as FA icons).

| \`family\` | Font stack |
|----------|------------|
| \`mono\` | Consolas, Courier New, monospace |
| \`sans\` | system-ui, Segoe UI, sans-serif |
| \`serif\` | Georgia, Times New Roman, serif |

| \`weight\` | Appearance |
|----------|------------|
| \`normal\` | regular |
| \`bold\` | bold |
| \`italic\` | italic |
| \`boldItalic\` | bold italic |

\`style\` is not allowed on \`label\`.

The **same symbol name may appear multiple times** — each entry is independent (its own \`x\`, \`y\`, and \`bit\` / \`bits\`). Example: two \`digit7\` displays at different positions, each driven by its own bit range.

**Bit mapping** must be **contiguous from 0** with no gaps across *all* entries (union of every bit used). Using bit \`0\` and bit \`2\` without bit \`1\` is an error.

Bus width = \`max(bit index) + 1\` over all symbols.

### Touch output (\`bitOut\`)

Display bits (\`bit\` / \`bits\` → \`:get\`) and touch bits (\`bitOut\` → \`:out\`) are **separate namespaces**. A symbol may use display bits only, touch bits only, or both.

| Property | Description |
|----------|-------------|
| \`:out\` | Read-only bit vector; width = number of symbols with \`bitOut\`, indices \`0 … N-1\` in symbol order |
| \`touchReset\` | Writable mask; each \`1\` bit clears the corresponding \`:out\` position |

\`bitOut\` indices must be **contiguous from 0** across all symbols that define \`bitOut\` (same rule as display bits).

**Hit rectangle** for a symbol at \`(x, y)\` with size \`(width, height)\` and padding \`pad\`:

- Left: \`x - pad\`, top: \`y - pad\`
- Right: \`x + width + pad\`, bottom: \`y + height + pad\`

Default sizes when \`width\` / \`height\` are omitted follow each symbol's \`size\` (see above), or the native defaults (FA 22×22, \`digit7\` 28×44, \`dp\` 12×8, \`colon\` 8×32). Default \`pad\` is the symbol's \`padding\`, else \`touchPadding\`, else \`0\`.

Set component attribute \`touch: 1\` to enable hit-testing. Optional \`touchColor\` draws debug borders around hit boxes. With a mouse, the cursor is \`pointer\` over touch zones (\`touchType\` 1 or 2) and \`grab\` over latch zones (\`touchType\` 3); elsewhere it stays the default arrow.

**\`touchType\`** (per symbol with \`bitOut\`):

| Value | Behavior |
|-------|----------|
| \`1\` | Momentary — \`:out\` bit is \`1\` while pressed, \`0\` on release (default) |
| \`2\` | Pulse — bit goes \`1\` on press and returns to \`0\` in the same simulation step |
| \`3\` | Latch — each press toggles the bit; cleared by \`touchReset\` or another press |

Wire touch output to the rest of the circuit:

\`\`\`logts
comp [clcd] .panel
  touch: 1
  wifi = { x: 10, y: 10, bitOut: 0, touchType: 1 }
  power = { x: 40, y: 10, bitOut: 1, touchType: 3 }

2wire touchBus = 00

.panel:out > touchBus
\`\`\`

Reset latched bits:

\`\`\`logts
.panel:touchReset = 01   // clear bit 1 only
\`\`\`

Property blocks can also assign \`touchReset\` when the component has \`on: 1\` (or use direct assignment as above).

---

## Supported symbols

The catalog includes **~500** Font Awesome icons (plus four canvas symbols and the \`label\` text symbol). Use the searchable catalog for the full list:

**[Symbol catalog → clcd-symbols.md](clcd-symbols.md)**

### \`style\` (FA icons only)

| \`style\` | Appearance |
|---------|------------|
| \`1\` | Solid (default) |
| \`2\` | Regular / outline — only when listed for that symbol in the catalog |
| \`3\` | Brands — e.g. \`bluetooth\`, \`usb\`, \`android\` |

Not every symbol supports every style. Brands icons use \`3\` by default. Specifying an unsupported \`style\` is a parse error.

Canvas symbols (\`digit7\`, \`digit14\`, \`dp\`, \`colon\`) are drawn on the display canvas — they do not use \`style\`.

The **\`label\`** symbol draws text on the canvas (see **Symbol fields** above).

Icons use Font Awesome 5 Free (\`res/css/fontawesome/\` + \`res/fonts/fontawesome/webfonts/\`).

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the \`logts-play\` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Use this to inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script **and** runs it immediately. The **CLCD** canvas appears in the **Devices** panel with the values from the script. |

For static examples (fixed \`Nwire\` values), **Load & Run** is enough — you see the symbol states right away.

For the **interactive status panel** below, use **Load & Run**, then flip the **DIP** switches in the panel; the CLCD updates as the wire changes.

For **touch screen** examples, use **Load & Run**, then **tap** symbols on the CLCD canvas; watch the **Output** panel for \`peek\` / \`show\` lines. Optional \`touchColor\` draws hit-box borders on the canvas.

---

## Input

### Static drive (Load & Run)

**Load & Run** the example below — \`power\` ON, \`wifi\` OFF, \`warning\` ON (\`flags = 101\`).

\`\`\`logts-play
comp [clcd] .status:
  = {
    power: x:10 y:10 bit:0 :
    wifi: x:50 y:10 bit:1 :
    warning: x:90 y:10 bit:2 :
  }
  :

3wire flags = 101
.status = flags
\`\`\`

Property block (\`value\` + \`set\`, not \`data\`):

\`\`\`logts
.status:{
  value = flags
  set = 1
}
\`\`\`

---

## Debug

\`\`\`logts
show(.status)
peek(.status)
probe(.status:get)
\`\`\`

\`:get\` returns the current bit vector driving the display.

---

## Examples

### Interactive status panel (DIP + CLCD)

**Load** if you want to change symbol positions first; **Load & Run** to see the panel, then flip the **Flags** DIP (\`000\` … \`111\`) — icons follow the 3-bit pattern.

\`\`\`logts-play
comp [dip] .flags:
  length: 3
  text: 'Flags'
  visual: 1
  = 101
  :

comp [clcd] .status:
  width: 200
  height: 60
  color: ^00ff00
  bgColor: ^001000
  = {
    power: x:10 y:10 bit:0 :
    wifi: x:50 y:10 bit:1 :
    warning: x:90 y:10 bit:2 color:^ffaa00 bgColor:^332200 :
  }
  :

3wire bus = .flags:get
.status = bus
\`\`\`

### Battery panel

**Load & Run** — both \`battery\` and \`charging\` icons ON (\`state = 11\`).

\`\`\`logts-play
comp [clcd] .battery:
  width: 120
  height: 50
  = {
    battery: x:10 y:10 bit:0 :
    charging: x:60 y:10 bit:1 :
  }
  :

2wire state = 11
.battery = state
\`\`\`

### Text labels

**Load & Run** — two labels driven by bits 0 and 1; icons use overlapping bits in this minimal demo (use separate bits in real panels).

\`\`\`logts-play
comp [clcd] .ui:
  width: 220
  height: 50
  color: ^00ff00
  bgColor: ^002200
  = {
    label:
      x: 8
      y: 6
      bit: 0
      text: "Load"
      family: mono
      size: 16
      weight: bold
    :
    label:
      x: 8
      y: 28
      bit: 1
      text: "Save"
      weight: normal
    :
    power:
      x: 120
      y: 12
      bit: 0
    :
  }
  :

2wire flags = 11
.ui = flags
\`\`\`

### Seven-segment digit + decimal point

**Load & Run** — all segments ON, decimal point OFF (\`value = 11111100\`).

\`\`\`logts-play
comp [clcd] .digit:
  = {
    digit7: x:10 y:10 bits:0-6 :
    dp: x:60 y:10 bit:7 :
  }
  :

8wire value = 11111100
.digit = value
\`\`\`

### Multiple seven-segment digits (same symbol, different bits)

**Load & Run** — three \`digit7\` glyphs at different \`x\` positions; each uses its own 7-bit slice (bus width 21).

\`\`\`logts-play
comp [clcd] .display:
  width: 160
  height: 80
  = {
    digit7:
      x: 10
      y: 10
      bits: 0-6
    :
    digit7:
      x: 50
      y: 10
      bits: 7-13
    :
    digit7:
      x: 90
      y: 10
      bits: 14-20
    :
  }
  :

21wire val = 1111111000000111111100000
.display = val
\`\`\`

Each \`digit7\` listens to its own 7-bit slice; bus width is 21 bits (\`0\`…\`20\`).

---

## Touch screen examples

All examples below need \`touch: 1\` and symbols with \`bitOut\`. **Load & Run**, then interact with the CLCD in the **Devices** panel.

### \`touchType\` 1, 2, and 3

Three icons on one bus — compare momentary, pulse, and latch on a single panel:

| Symbol | \`touchType\` | What to try |
|--------|-------------|-------------|
| \`wifi\` | \`1\` momentary | Press and hold — \`touchOut[0]\` stays \`1\` until release |
| \`bell\` | \`2\` pulse | Tap once — \`touchOut[1]\` goes \`1\` then back to \`0\` in the same step |
| \`power\` | \`3\` latch | Tap to toggle \`touchOut[2]\` on/off |

\`\`\`logts-play
comp [clcd] .panel:
  touch: 1
  width: 200
  height: 70
  color: ^00ff00
  bgColor: ^001000
  = {
    wifi: x: 10 y: 15 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 :
    bell: x: 60 y: 15 bit: 1 bitOut: 1 touchType: 2 width: 22 height: 22 :
    power: x: 110 y: 15 bit: 2 bitOut: 2 touchType: 3 width: 22 height: 22 :
  }
  :

3wire touchOut = .panel:out

peek(touchOut)
\`\`\`

### \`touchColor\` — hit box borders

Set \`touchColor\` on the component to draw a **debug border** around every touch hit rectangle (symbols with \`bitOut\` only). Borders match the exact area used for hit-testing — \`(x, y, width, height)\` plus \`padding\`. Omit \`touchColor\` in production panels; use it while placing symbols and tuning tap targets.

**Load & Run** — three FA icons (22×22 rects) and one \`digit7\` (28×44 default rect). Magenta borders outline each zone on the canvas.

\`\`\`logts-play
comp [clcd] .panel:
  touch: 1
  touchColor: ^ff00ff
  width: 200
  height: 80
  color: ^00ff00
  bgColor: ^001000
  = {
    wifi: x: 10 y: 20 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 :
    bell: x: 45 y: 20 bit: 1 bitOut: 1 touchType: 1 width: 22 height: 22 :
    warning: x: 80 y: 20 bit: 2 bitOut: 2 touchType: 1 width: 22 height: 22 :
    digit7: x: 120 y: 12 bits: 3-9 bitOut: 3 touchType: 1 :
  }
  :

4wire touchOut = .panel:out

peek(touchOut)
\`\`\`

### Latch with \`touchReset\`

Latch both icons by tapping them (\`touchType: 3\`). Press the **Clr bit 1** key to apply \`touchReset = 01\` — bit \`1\` (\`wifi\`) clears while bit \`0\` (\`power\`) stays latched.

\`\`\`logts-play
comp [key] .clearBit1:
  label: 'Clr bit 1'
  nl
  :

comp [clcd] .panel:
  touch: 1
  on: 1
  width: 120
  height: 60
  color: ^00ff00
  bgColor: ^001000
  = {
    power: x: 10 y: 15 bit: 0 bitOut: 0 touchType: 3 width: 22 height: 22 :
    wifi: x: 55 y: 15 bit: 1 bitOut: 1 touchType: 3 width: 22 height: 22 :
  }
  :

2wire touchOut = .panel:out

.panel:{
  set = .clearBit1:get
  touchReset = 01
}

peek(touchOut)
\`\`\`

Direct assignment works too (e.g. in the editor after **Load**):

\`\`\`logts
.panel:touchReset = 01
\`\`\`

### Overlapping hit zones

\`wifi\` and \`bell\` share the same \`(x, y)\`. A single tap in the overlap hits **both** symbols — \`:out\` becomes \`11\`. Enable \`touchColor\` to see both rects drawn on top of each other.

\`\`\`logts-play
comp [clcd] .panel:
  touch: 1
  touchColor: ^00ffff
  width: 80
  height: 60
  color: ^00ff00
  bgColor: ^001000
  = {
    wifi: x: 20 y: 15 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 :
    bell: x: 20 y: 15 bit: 1 bitOut: 1 touchType: 1 width: 22 height: 22 :
  }
  :

2wire touchOut = .panel:out

peek(touchOut)
\`\`\`

### Padding

\`touchPadding: 8\` sets the default margin; \`power\` adds \`padding: 4\` on top (12 px total beyond the 22×22 icon). Combine with \`touchColor\` to see the enlarged tap area — try clicking just outside the icon glyph.

\`\`\`logts-play
comp [clcd] .panel:
  touch: 1
  touchColor: ^ff8800
  touchPadding: 8
  width: 100
  height: 80
  color: ^00ff00
  bgColor: ^001000
  = {
    power: x: 30 y: 25 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 padding: 4 :
  }
  :

1wire touchOut = .panel:out

peek(touchOut)
\`\`\`

---

## Related

- [lcd.md](lcd.md) — pixel matrix display
- [seven-seg.md](seven-seg.md) — 7-segment component
- [components.md](components.md)
`,
    'components.md': `# Component index

LogTscript includes built-in **components** (\`comp\`), **inline** declarations (\`inline [asm]\`, \`inline [lut]\`), reusable **board** blocks (\`board\`), lightweight **chip** blocks (\`chip\`), and legacy **PCB** (\`pcb\`). Use \`doc(comp)\`, \`doc(inline)\`, \`doc(board)\`, \`doc(chip)\`, or \`doc(pcb)\` in the editor for live signatures.

**Global refs in composite bodies:** inside \`board\` / \`chip\` / \`pcb\`, prefix a top-level inline or component name with \`^\` to skip instance renaming — e.g. \`^.myisa { … }\`, \`^.ctl:LOAD\`, \`doc(^.ctl)\`. Details: [lut.md](lut.md#global-reference-name).

---

## Composite blocks

| Topic | Page |
|-------|------|
| **Board** — interactive circuits, wave propagation (recommended) | [board.md](board.md) |
| Chip — reusable logic without UI | [chip.md](chip.md) |
| PCB — deprecated, legacy propagation | [pcb.md](pcb.md) |
| **Mini CPU demo** — Harvard step CPU (chip ALU + board) | [mini-cpu.md](mini-cpu.md) |
| **Mini CPU v2** — ASM, BEQ, LUT decode, terminal | [mini-cpu-v2.md](mini-cpu-v2.md) |
| **Pocket calculator** — keyboard + keys + terminal | [pocket-calc.md](pocket-calc.md) |
| **Future component ideas** — brainstorming backlog (no roadmap) | [future-component-ideas.md](future-component-ideas.md) |

---

## Interactive inputs (panel)

| Component | Shortname | Page |
|-----------|-----------|------|
| \`switch\` | — | [switch.md](switch.md) |
| \`key\` | — | [key.md](key.md) |
| \`keyboard\` | — | [keyboard.md](keyboard.md) |
| \`dip\` | — | [dip.md](dip.md) |
| \`ioport\` | — | [ioport.md](ioport.md) |
| \`rotary\` | — | [rotary.md](rotary.md) |
| \`slider\` | — | [slider.md](slider.md) |

Overview (panel callbacks, common patterns): [interactive-components.md](interactive-components.md).

---

## Displays

| Component | Shortname | Page |
|-----------|-----------|------|
| \`led\` | — | [led.md](led.md) |
| \`bar\` (LED bar) | — | [led-bar.md](led-bar.md) |
| \`7seg\` | \`7\` | [seven-seg.md](seven-seg.md) |
| \`14seg\` | \`14\` | [14seg.md](14seg.md) |
| \`lcd\` | — | [lcd.md](lcd.md) |
| \`clcd\` | — | [clcd.md](clcd.md) |
| \`alu\` | — | [alu.md](alu.md) |
| \`terminal\` | — | [terminal.md](terminal.md) |
| \`dots\` (clock colon) | \`:\` | [dots.md](dots.md) |

---

## Arithmetic & logic devices

| Component | Shortname | Page |
|-----------|-----------|------|
| \`adder\` | \`+\` | [adder.md](adder.md) |
| \`subtract\` | \`-\` | [subtract.md](subtract.md) |
| \`multiplier\` | \`*\` | [multiplier.md](multiplier.md) |
| \`divider\` | \`/\` | [divider.md](divider.md) |
| \`shifter\` | \`>\` | [shifter.md](shifter.md) |
| \`counter\` | \`=\` | [counter.md](counter.md) |

Instant built-in functions (\`ADD\`, \`SUBTRACT\`, …) without \`comp\`: [arithmetic.md](arithmetic.md).

---

## Storage & timing

| Name | Shortname | Page |
|------|-----------|------|
| \`mem\` | — | [mem.md](mem.md) |
| \`asm\` | — | [asm.md](asm.md) — declare \`inline [asm]\`; assemble with \`.name { … }\` |
| \`lut\` | — | [lut.md](lut.md) — \`inline [lut]\` or \`comp [lut]\` |
| \`protocol\` | — | [protocol.md](protocol.md) — declare \`inline [protocol]\`; generate with \`.name { params }\` |
| \`reg\` | — | [reg.md](reg.md) |
| \`queue\` | \`fifo\` | [queue.md](queue.md) |
| \`network\` | — | [network.md](network.md) |
| \`stack\` | \`lifo\` | [stack.md](stack.md) |
| \`counter\` | \`=\` | [counter.md](counter.md) |
| \`osc\` | \`~\` | [oscillator.md](oscillator.md) |

\`doc(inline.asm)\` / \`doc(inline.lut)\` / \`doc(inline.protocol)\` — declaration templates; \`doc(.name)\` — specific instance.

---

## Reference

| Topic | Page |
|-------|------|
| Built-in functions (\`MUX\`, \`REG\`, gates, …) | [builtin-functions.md](builtin-functions.md) |
| \`doc()\` signatures | [doc-function.md](doc-function.md) |
| \`show\` / \`peek\` / \`probe\` / \`watch\` | [debug.md](debug.md) |
| Signal propagation (Wave / Legacy) | [signal-propagation.md](signal-propagation.md) |
`,
    'counter.md': `# Counter component

\`comp [counter]\` (shortname \`comp [=]\`) is an **up/down counter** with load. Unlike most components, it has **no** \`= Xbit\` in the declaration signature (\`doc(comp.counter)\` omits \`= Xbit\`).

Signature: \`doc(comp.counter)\` or \`doc(comp.=)\`.

---

## Syntax

\`\`\`
comp [counter] .name:
  depth: 4
  :
\`\`\`

Optional default value in declaration:

\`\`\`
comp [counter] .cnt:
  depth: 4
  = 0000
  :
\`\`\`

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Enable counting / load when \`on:\` holds |
| \`write\` | 1 | \`1\` = load \`data\`; \`0\` = increment/decrement |
| \`data\` | \`depth\` | Value to load when \`write\` is \`1\` |
| \`dir\` | 1 | Count direction when not loading |
| \`get\` | \`depth\` | Current counter value |

---

## Example — load then count

\`\`\`logts-play
comp [counter] .cnt:
  depth: 4
  on: 1
  :

.cnt:{
  data = 0101
  write = 1
  dir = 0
  set = 1
}

4wire v = .cnt:get
show(v)
\`\`\`

Use multiple property blocks or sequential triggers to step the counter.

---

## Related

- [reg.md](reg.md) — clocked storage
- [shifter.md](shifter.md)
- [components.md](components.md)
`,
    'debug.md': `# Debug output — \`show\`, \`peek\`, \`probe\`, \`watch\`, and boolean LUT utilities

Statements in this group write text to the **Output** panel (or the **Timeline** panel for \`watch\`). The first three inspect live values; **\`lutOf\`** and **\`exprOfLut\`** generate copy-pasteable boolean logic (LUT definitions or expressions) for analysis only — they do not change the circuit.

All are **statements** (like \`doc\`) — they cannot appear on the right side of \`=\`.

For LUT generation / reversal and other analysis helpers, see **[boolean-lut.md](boolean-lut.md)** and **[boolean-analysis.md](boolean-analysis.md)**.

For **source literals** in assignments (\`\\255\`, \`\\-3;8\`, \`"Hello"\`), see **[wire-literals.md](wire-literals.md)**. Display tag \`ascii\` formats wire values as quoted text in the Output panel (see [show — display tags](#show)).

---

## Quick comparison

| | \`show\` | \`peek\` | \`probe\` | \`watch\` | \`Zlist\` | \`lutOf\` / \`exprOfLut\` |
|---|--------|--------|---------|---------|---------|------------------------|
| **Purpose** | Display settled values | Instant snapshot | Monitor every value commit | Waveform trace per signal | List all bus drivers (snapshot) | Generate or reverse boolean LUT text |
| **When it emits** | End of **RUN** / **NEXT** (after propagation on Wave) | Immediately at statement position | On every **committed** change | On every **committed** change | At statement position in **RUN** / **NEXT** only | Immediately at statement |
| **Position in script** | Matters | Matters | **Does not matter** (registered at elaboration) | **Does not matter** (registered at elaboration) | Matters | Matters |
| **Arguments** | One or more expressions | One or more expressions | **Exactly one** expression | **Exactly one** expression (same as \`probe\`) | **Exactly one** wire name | See below |
| **Output format** | \`name (type) = value\` | same | \`# name = value (ref) - reason\` | Timeline canvas (one column per bit or property slice) | \`->\` / \`-> (active)\` lines + \`(resolved) =\` | LUT block or \`Nwire out = …\` lines |
| **Wave vs Legacy** | Deferred on Wave until settle | Immediate | Same commit hooks in both modes | Same commit hooks in both modes | Immediate (like \`peek\`) | Immediate (no propagation) |
| **Runtime effect** | None (read-only) | None | None (logging only) | None (UI trace only) | None (read-only) | **None** — text for copy-paste |

For when wires update in the circuit, see [signal-propagation.md](signal-propagation.md). In **\`MODE ZSTATE\`**, see [zstate.md](zstate.md) for \`Z\`/\`X\` display rules.

---

## \`Z\` and \`X\` values (MODE ZSTATE)

In tristate mode, wire values may include **\`Z\`** (high-impedance) and **\`X\`** (conflict). Debug statements show them literally:

\`\`\`text
bus (4bit) = 10X0
\`\`\`

| Tool | Z / X behaviour |
|------|-----------------|
| \`show\` | Full string with \`Z\` and \`X\` |
| \`peek\` / \`probe\` | Same; every commit logged |
| \`probe\` (shared bus) | In **ZSTATE**, when the wire has multiple or enable-gated drivers, each line adds a suffix: \` — driver: …\`, \` — conflict: …\`, or \` — no active drivers\` |
| \`Zlist\` | Lists every registered contributor; \`(resolved) =\` shows merged value |
| \`watch\` (Timeline) | \`Z\` → grey bar; \`X\` → red bar (conflict) |

\`show\` / \`watch\` never error on \`X\` — use them to **see** bus conflicts. Use **\`probe(bus)\`** live while toggling switches; use **\`Zlist(bus)\`** at **RUN** for a full driver inventory.

Full reference: **[zstate.md](zstate.md)**.

---

## \`Zlist\` (MODE ZSTATE)

### Syntax

\`\`\`
Zlist(wireName)
\`\`\`

Requires **\`MODE ZSTATE\`** and **wave** propagation. One wire identifier only (not an expression).

### When it emits

Only when execution reaches \`Zlist(…)\` during **RUN** or **NEXT** — like **\`peek\`**, not like **\`probe\`**. Toggling a switch in the panel does **not** re-run \`Zlist\`; use **\`probe(bus)\`** for live driver attribution.

### Output format

\`\`\`text
bus (4bit):
-> bus = ramData w1 ramEn
  -> (active) bus = cpuData w1 cpuEn = 1010
(resolved) = 1010
\`\`\`

| Line | Meaning |
|------|---------|
| \`-> <label>\` | Registered contributor, currently **inactive** (enable off) |
| \`  -> (active) <label> = <value>\` | Contributor driving this step |
| \`(resolved) = <value>\` | Merged wire value (same as \`show(bus)\` after settle) |

| Empty case | Message |
|------------|---------|
| No assignments / redirects on this wire | \`bus (Nbit) — (no contributors)\` |

\`get>= bus\` **without** \`w1\`/\`w0\` is a direct assign, not a bus contributor — it does not appear in \`Zlist\`.

### Example — dual enable

\`\`\`logts-play wave
MODE ZSTATE

4wire bus
4wire cpuData = 1010
4wire ramData = 0110
1wire cpuEn = 1
1wire ramEn = 0

bus = cpuData w1 cpuEn
bus = ramData w1 ramEn
Zlist(bus)
\`\`\`

### Example — interactive bus (probe + Zlist)

\`\`\`logts-play wave
MODE ZSTATE

2wire bus
comp [switch] .s1:
  on: 1
  :

.s1:{ get >= bus w1 .s1
  set = 1 }

probe(bus)   # live — logs each commit (toggle in panel)
Zlist(bus)   # snapshot — full driver list at RUN only
\`\`\`

After **RUN**, toggle \`.s1\` in the panel — **\`probe\`** logs each change with \` — driver: .s1:get w1 .s1\`. Press **RUN** again to refresh **\`Zlist\`**.

---

## \`show\`

### Syntax

\`\`\`
show(expr1, expr2, …)
show(expr1, expr2, … ; tag tag …)
\`\`\`

Display tags are **optional**, appear **once after all arguments** (after \`;\`), and are **only** valid on \`show\`, \`peek\`, and \`probe\` (with restrictions on \`probe\` — see below).

#### Format tags (exactly one per statement)

| Tag | Effect |
|-----|--------|
| \`dec\` | Unsigned decimal — scalar/element ≤64 bit → \`\\N\`; wire &gt;64 bit → 64-bit chunks + \`+ \\N (Rbit)\` rest |
| \`signed\` | Signed two's complement (shorthand for \`dec signed\` when used alone). Header: \`\\N;sW\` (wire ≤64) or grouped \`;s64\` chunks; cells: \`\\N;s{elementW}\` |
| \`decSigned\` | Legacy alias for \`dec\` + \`signed\` (still accepted in parser) |
| \`hex\` | Nibbles \`^…\` (4 bit) on **vector/matrix cells**; plain wire uses grouped hex like default \`show\` |
| \`hexWide\` | With \`hex\` only — grouped wide hex on vector elements (≥32 bit) |
| \`bin\` | Explicit binary grouping (8-bit groups on wide wires) |
| \`ascii\` | 8-bit cells — scalar ≤8 bit: \`"A"\`; wider wires: grouped \`\\65 \\66;ascii\` |
| \`q4p4\` | Fixed-point **Q4.4** — grouped literal \`\\1.5;q4p4\` on **8-bit** elements |
| \`q8p8\` | Fixed-point **Q8.8** decimal on **16-bit** wires |
| \`fp16\` | IEEE 754 half as decimal (\`3\`, \`nan\`, \`inf\`) on **16-bit** wires |
| \`bf16\` | Brain float 16 as decimal on **16-bit** wires |
| \`sX\` | Fixed signed width per element — e.g. \`show(v; s8)\` → \`\\2 \\-1 \\5 \\0;s8\` (distinct from adaptive \`signed\`) |
| \`qXpY\` | Parametric Q format — e.g. \`show(w; q6p2)\` → \`\\1.5;q6p2\`, \`show(w; q8p0)\` → \`\\5;q8p0\` (not \`;s8\`) |

Exactly **one** format tag per statement: \`dec\`, \`hex\`, \`bin\`, \`ascii\`, fixed (\`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`), or parametric (\`sX\`, \`qXpY\` with X+Y≤64). \`signed\` (adaptive) is mutually exclusive with \`sX\` and with numeric-format tags; \`dec\` + \`sX\` is rejected.

#### Layout / element tags (\`show\` and \`peek\` only)

| Tag | Effect |
|-----|--------|
| \`compact\` | Rank-1: header + \`has length [N]\` only; matrix: header + \`has shape [R,C]\` — no \`:i\` lines |
| \`elAll\` | List every vector/matrix cell (no \`..\` truncation) |
| \`elNonZero\` | List only non-zero cells |
| \`elRange=0-3\` | Vector: elements \`:0\`…\`:3\`; matrix: rows \`0\`…\`3\` (all columns). Matrix 2D: \`elRange=0-1,2-4\` |
| \`elLast=N\` | Last \`N\` elements (vector) or rows (matrix) |
| \`maxWidth=N\` | Truncate single-line output to \`N\` chars + \` ..\` |
| \`multiline\` | Wrap formatted value (default wrap 40, or \`maxWidth\` when set) |

\`elAll\`, \`elNonZero\`, \`compact\`, \`elRange\`, and \`elLast\` are **mutually exclusive**. \`probe\` allows format tags + \`maxWidth\` + \`multiline\` only (no \`el*\` / \`compact\`).

Without format tags, wide wires keep the default hex grouping (\`^0000 … 7B\`).

\`\`\`logts-play
408wire a := \\123
show(a)                    # default hex
show(a; dec)               # decimal chunks
show(a; signed)            # signed decimal chunks
4wire w := 1111
show(w; signed)            # w (4wire) = \\-1;s4
8wire code := 01000001
show(code; ascii)          # code (8wire) = "A"
8wire fp = 00011000
show(fp; q4p4)             # fp (8wire) = \\1.5;q4p4
show(v; s8)                # 8wire[4] v = \\2 \\-1 \\5 \\0;s8  (fixed per element)
show(w; q8p0)              # w (8wire) = \\5;q8p0
40wire msg := "Hello"
show(msg; ascii)           # msg (40wire) = \\72 \\101 \\108 \\108 \\111;ascii
\`\`\`

Rank-1 tensors (\`4wire[3]\`, \`4wire[3,1]\`) use \`has length [N]\` in \`show\` output. Matrix row slices (\`show(m:0)\`) print a flat row header plus \`:0:0\`…\`:0:(C-1)\` cell lines and the parent \`has shape [R,C]\`:

\`\`\`logts
4wire[1,3] row = 0001 + 0010 + 0100
4wire[2,3] m = REPEAT(row, \\2)
show(m:0; dec)
\`\`\`

Each argument is an expression atom: wire name, component reference (\`.comp:get\`), bit slice (\`a.0\`, \`a.2-4\`), storage ref (\`&3\`), literal (\`\\255\`, \`^-A;8\`, \`"text"\`), etc.

### Output format

\`\`\`
name (Nbit) = value
\`\`\`

Examples:

\`\`\`text
a (1bit) = 1
sum (4bit) = 1010
.sw:get (1bit) = 0
\`\`\`

Wide values may use hex groups (\`^A3 + 10\`) — same formatting as the variables panel.

### When to use

- **Default choice** for displaying results at the end of a script or after **NEXT(~)**.
- On **Wave** propagation, \`show\` runs **after** dependent wires have settled — you see consistent combinational results.
- Multiple \`show\` calls in one script each emit at their turn during execution, but on Wave each \`show\` still reflects values **after** the propagation step triggered by preceding statements in that run.

### Example — combinational logic

\`\`\`logts-play
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)
\`\`\`

### Example — after external change (Wave)

\`\`\`logts-play wave
comp [switch] .sw::

1wire a = .sw:get
1wire b = NOT(a)

show(a, b)
\`\`\`

After **RUN**, flip the switch in the panel — wires update; run \`show\` again or rely on the variables panel. The example shows settled values at the end of RUN.

---

## \`peek\`

### Syntax

\`\`\`
peek(expr1, expr2, …)
peek(expr1, expr2, … ; tag tag …)
\`\`\`

Same display tags as \`show\` (see [show — display tags](#syntax)).

Same argument forms as \`show\`.

### Output format

Identical to \`show\`: \`name (type) = value\`.

### When to use

- Read values **now**, without waiting for downstream propagation to finish.
- Debugging order-of-execution issues inside a long **RUN**.
- Comparing a wire with its dependencies in the **middle** of a script.

On **Wave**, \`peek\` reads **immediately** at the statement, while \`show\` is **deferred** until propagation settles (end of RUN). After a wire change mid-script, \`peek\` may still show the **old** downstream value on Wave; on **Legacy** the cascade updates dependents right away.

### Example — \`peek\` vs \`show\` after declarations (no mid-script change)

Legacy and Wave give the same result — combinational wires are already consistent when the statements run:

\`\`\`logts-play
1wire a = 0
1wire b = NOT(a)
peek(a, b)
show(a, b)
\`\`\`

\`\`\`logts-play wave
1wire a = 0
1wire b = NOT(a)
peek(a, b)
show(a, b)
\`\`\`

Expected Output (both modes):

\`\`\`text
a (1wire) = 0 (ref: &0), b (1wire) = 1 (ref: &1)
a (1wire) = 0 (ref: &0), b (1wire) = 1 (ref: &1)
\`\`\`

---

## \`probe\`

### Syntax

\`\`\`
probe(expr)
probe(expr ; tag …)
\`\`\`

Display tags on \`probe\`: \`dec\`, \`signed\`, \`hex\`, \`hexWide\`, \`bin\`, \`ascii\`, \`maxWidth=\`, \`multiline\` — same formatting as \`show\` on the **flat blob** value. No \`elAll\` / \`elNonZero\` / \`compact\` / \`elRange\` / \`elLast\`.

\`\`\`logts-play
8wire v := 01000001
probe(v; ascii)    # # v = "A" - initialised
probe(v; dec)      # # v = \\65 - initialised
\`\`\`

**One argument only:**

| Form | Example |
|------|---------|
| Wire name | \`probe(a)\` |
| Component \`:get\` (implicit) | \`probe(.clk)\` → \`probe(.clk:get)\` |
| Component property | \`probe(.clk:get)\` |
| Chip / PCB pin or pout | \`probe(.u1:sum)\`, \`probe(.q:result)\` |
| Chip / PCB internal wire | \`probe(.u1.partial)\`, \`probe(.q.shadow)\` |
| Computed component | \`probe(.div:mod)\`, \`probe(.add:carry)\` |
| Storage reference | \`probe(&1)\` |
| Bit / slice | \`probe(&1.0)\`, \`probe(&1.2-4)\` |
| Wire bit-range | \`probe(data.4/4)\` → \`# data.4-7 = …\` |
| Vector element | \`probe(vectorA:1)\` → \`# vectorA:1 = …\` |
| Vector element slice | \`probe(vectorA:1.0/2)\` → \`# vectorA:1.0-1 = …\` |
| Whole vector | \`probe(vectorA)\` |

### MODE ZSTATE — driver suffix (shared bus)

On wires with multiple or enable-gated contributors, each commit appends a suffix after the reason:

\`\`\`text
# bus = 10 (&0) - changed — driver: .s1:get w1 .s1
# bus = X0 (&0) - changed — conflict: bus = a, bus = b
# bus = ZZ (&0) - changed — no active drivers
\`\`\`

Single-driver wires (no \`w1\` / \`ZCONNECT\` / redirects) keep the classic \`# name = value - changed\` line. For a full driver list at **RUN**, use [\`Zlist\`](#zlist-mode-zstate).

### Syntax \`:\` vs \`.\` (chip / PCB / component)

| Punctuation | Example | Target |
|-------------|---------|--------|
| **\`:\`** after instance | \`probe(.u1:sum)\` | declared pin or **pout** |
| **\`.\`** after instance | \`probe(.u1.partial)\` | **internal wire** from body (not pin/pout) |
| **\`:\`** after component | \`probe(.div:mod)\` | component property (\`:get\`, \`:mod\`, \`:carry\`…) |

\`probe(.u1.sum)\` does **not** track pout \`sum\` — use \`probe(.u1:sum)\` for pout (test **839**).

### Component outputs — what \`probe\` accepts

**With \`comp.ref\` (phase 1):** \`probe(.comp)\` or \`probe(.comp:get)\` — key, switch, DIP, rotary, osc (\`:get\`).

**Without \`comp.ref\` (phase 2):** \`probe(.comp:prop)\` — computed value on \`:set\` / device recalc:

| Type | Properties | Tests |
|------|------------|-------|
| divider | \`:get\`, \`:mod\` | 825, 836–837 |
| adder, subtract | \`:get\`, \`:carry\` | 838 |
| multiplier | \`:get\`, \`:over\` | — |
| shifter | \`:get\`, \`:out\` | — |
| mem, reg, counter | \`:get\` | — |
| osc | \`:counter\` (\`:get\` stays on ref) | — |
| display (7seg, lcd…) | \`:get\` | — |

| Instance type | Form | Tests |
|---------------|------|-------|
| chip / PCB pin or pout | \`probe(.u1:sum)\` | 827–830 |
| chip / PCB internal wire | \`probe(.u1.partial)\` | 832–835 |

**Rules**

- **No slice** on component / internal wire — \`probe(.dip.0)\` / \`probe(.u1.tmp.0)\` are not supported yet.
- **Note:** \`initialised\` / \`changed\` (display and arithmetic on recalc); \`edge committed\` only on REG wires / edge property blocks.
- **Duplication:** the same ref may produce two lines if probe and a top-level wire watch the same source.

#### Example — chip / PCB pout from main script (827–830)

The instance must be created **before** \`probe\` in the same RUN (probe registers at end of RUN, when the instance already exists):

\`\`\`logts-play
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
probe(.u1:sum)

.u1:{
  a = 0101
  b = 0011
  set = 1
}
\`\`\`

After RUN: \`# .u1:sum = 1000 … - initialised\`. On a new pulse on \`set\` with different \`a\`/\`b\`: \`# .u1:sum = … - changed\`.

Same pattern for PCB: \`probe(.q:result)\` where \`result\` is a \`4pout\` declared in \`pcb +[…]\`.

**Note:** \`probe(.u1:sum)\` and \`1wire r = .u1:sum\` + \`probe(r)\` may emit **two lines** for the same change (same ref in storage).

#### Example — chip internal wire (832–833)

\`\`\`logts-play
chip +[halfAddDbg]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  4wire partial = .add:get
  sum = partial
  carry = .add:carry
  :4bit sum

chip [halfAddDbg] .u1::
probe(.u1.partial)

.u1:{
  a = 0101
  b = 0011
  set = 1
}
\`\`\`

\`partial\` is a wire in the body, not a pout — \`# .u1.partial = 1000 … - initialised\`.

#### Example — divider \`:mod\` (836–837)

\`\`\`logts-play
comp [divider] .div:
  depth:4
  on:1
  :
probe(.div:mod)
.div:{
  a = 1100
  b = 0011
  set = 1
}
\`\`\`

After RUN: \`# .div:mod = 0000 … - initialised\`. On another \`:set\` pulse with new \`a\`/\`b\` → \`changed\`.

#### Example — \`[switch]\` (821 / 822)

\`\`\`logts-play
comp [switch] .sw:
    text:'Enable'
    :
probe(.sw)
\`\`\`

After RUN: \`# .sw:get = 0 … - initialised\`. Toggle in panel → \`# .sw:get = 1 … - changed\`.

#### Example — \`[key]\` (823 / 824)

\`\`\`logts-play
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk:get)
\`\`\`

Press: \`# .clk:get = 1 … - changed\`. Release: \`# .clk:get = 0 … - changed\`.

#### Example — \`[dip]\` (multi-bit)

\`\`\`logts-play
comp [dip] .mode:
    length:4
    text:'MODE'
    :
probe(.mode)
\`\`\`

After RUN: \`# .mode:get = 0000 … - initialised\`. Each toggled switch in the panel updates the entire bus (e.g. \`# .mode:get = 0001 … - changed\`).

#### Example — \`[osc]\` (periodic output)

\`\`\`logts-play
comp [osc] .tick:
    duration1:2
    duration0:2
    length:4
    freq:2
    :
probe(.tick)
\`\`\`

After RUN: \`initialised\`, then \`changed\` lines on each automatic output toggle (visible in Output after interaction / panel refresh).

#### What does not work yet — divider \`:mod\`

\`\`\`logts-play
comp [divider] .div:
    depth:4
    :
probe(.div:mod)
\`\`\`

After RUN: **no** \`#\` lines — quotient/remainder are computed on read, not stored in \`comp.ref\`. For debugging, use a wire:

\`\`\`logts-play
comp [divider] .div:
    depth:4
    :
1wire mod = .div:mod
probe(mod)
\`\`\`

(pulse on \`.div:set\` + \`a\`/\`b\` as in divider doc; \`probe(mod)\` reports the wire after propagation.)

### Output format

\`\`\`
# name = value (ref) - reason
\`\`\`

Examples:

\`\`\`text
# a = 0 (&2) - initialised
# a = 1 (&2) - changed
# q = 1010 (&5) - edge committed
\`\`\`

- **\`name\`** — wire name, \`.comp:get\`, or ref label.
- **\`value\`** — formatted binary (with hex groups for wide buses).
- **\`ref\`** — storage address (\`&N\`), same as in \`show\` / variables panel.
- **\`reason\`** — why this line was emitted (see below).

### Position-independent registration

All \`probe()\` calls are collected during **elaboration** (before sequential execution). A probe declared **after** the wire it watches still sees the first committed value:

\`\`\`logts-play
1wire a := 0
a = AND(b, 1)
probe(a)
1wire b = 0
\`\`\`

After RUN, \`probe(a)\` still reports \`initialised\` for \`a\` when its first value is committed.

### Reasons

| Reason | When |
|--------|------|
| \`initialised\` | First emission for this target |
| \`changed\` | Value changed after initialisation |
| \`edge committed\` | Latch on the **falling edge** of the wire clock of \`REG(data, clk, clr)\`, or commit during a property block \`on: raise\` / \`edge\` / \`rising\` / \`falling\` |

\`edge committed\` does not apply to property blocks \`on: 1\` (level) nor to \`REG(..., ~, ...)\` on \`NEXT(~)\` (there you get \`changed\`).

### Multiple probes

Each target is independent:

\`\`\`logts-play
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
probe(a)
probe(b)
probe(c)
a = 1
\`\`\`

### Example — wire, initialised + changed (after RUN)

\`probe\` reports \`changed\` when the value changes **after** elaboration (e.g. toggle switch, \`setWire\` in tests). The script below is the same as tests **800** / **801**:

\`\`\`logts-play
1wire b = 0
1wire a := 0
a = AND(b, 1)
probe(a)
\`\`\`

After **RUN**, Output:

\`\`\`text
# a = 0 (&…) - initialised
\`\`\`

Change \`b\` to \`1\` (Devices panel / DIP / switch wired to \`b\`, or the **Next** button if applicable) — you get:

\`\`\`text
# a = 1 (&…) - changed
\`\`\`

Wave — same script (\`logts-play wave\`); identical behavior when changing \`b\` after RUN.

### Example — storage reference

\`\`\`logts-play
4wire x := 0000
probe(&1)
x = 1010
\`\`\`

\`&1\` is the ref allocated to \`x\` on first assignment. The same ref appears in \`show(x)\` output.

### Example — \`REG\` wire clock + \`edge committed\` (816 / 817)

\`REG(data, clk, clr)\` with a **wire** as \`clk\` (not \`~\`) latches on the **falling** edge of \`clk\`: \`1\` → \`0\`. When \`q\` updates at that moment, probe emits reason **\`edge committed\`**.

**Step 1 — Load & Run** (setup script):

\`\`\`logts-play
1wire data := 0
1wire clk := 0
1wire q = REG(data, clk, 0)
probe(q)
\`\`\`

After RUN, Output:

\`\`\`text
# q = 0 (&…) - initialised
\`\`\`

**Step 2 — pulse on \`clk\`** (Variables panel: \`data=1\`, \`clk=1\`, then \`clk=0\`; or DIP/key on those wires):

\`\`\`text
# q = 1 (&…) - edge committed
\`\`\`

Same scenario on Wave (\`logts-play wave\` at step 1). Automated tests use \`setWire\` after RUN — identical behavior.

Variant with multiple writes on the same script line (editor, **Legacy** + \`MODE WIREWRITE\`):

\`\`\`logts-play
MODE WIREWRITE
1wire data := 0
1wire clk := 0
1wire q = REG(data, clk, 0)
probe(q)
data = 1
clk = 1
clk = 0
\`\`\`

On **Wave**, \`clk = 1\` then \`clk = 0\` in the same RUN does not guarantee the pulse (writes are deferred); prefer a panel pulse after RUN or Legacy mode above.

### Example — \`probe(.clk)\` directly on component (821–824)

No intermediate wires — you monitor the key output:

\`\`\`logts-play
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk)
\`\`\`

After RUN:

\`\`\`text
# .clk:get = 0 (&…) - initialised
\`\`\`

Press → \`# .clk:get = 1 … - changed\`; release → \`# .clk:get = 0 … - changed\`.

Same for \`comp [switch] .sw\` with \`probe(.sw)\` (tests **821** / **822**).

### Example — \`[key]\` + \`REG\` + \`probe\` (818 / 819)

Same falling-edge latch on \`clk\`, but the clock comes from a key in the **Devices** panel. \`data\` is already \`1\`; after RUN, \`q\` stays \`0\` until the first complete pulse on \`clk\`.

**Step 1 — Load & Run:**

\`\`\`logts-play
1wire data := 1
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
1wire clk = .clk
1wire q = REG(data, clk, 0)
probe(q)
\`\`\`

After RUN, Output:

\`\`\`text
# q = 0 (&…) - initialised
\`\`\`

**Step 2 — interaction with key A** (press then **release**):

| Moment | \`clk\` | \`q\` | Probe |
|--------|-------|-----|-------|
| Press | \`1\` | \`0\` | — (latch not done yet) |
| Release | \`0\` | \`1\` | \`# q = 1 (&…) - edge committed\` |

On **press**, \`clk\` goes to \`1\`, but \`REG\` does not copy \`data\` into \`q\` yet. On **release**, the \`clk\` \`1\` → \`0\` edge latches — \`q\` becomes \`1\` and the **Output** panel updates (same as other interactive Devices components).

Same scenario on Wave (\`logts-play wave\` at step 1). Tests **818** / **819** simulate press/release with \`setComp('.clk', …)\` after RUN.

### Example — property block \`on: raise\` (mem / reg)

For \`comp [mem]\` / \`comp [reg]\` with \`on: raise\`, when a property block re-executes on the \`set\` edge, probe output may also use **\`edge committed\`** (if the \`:get\` value changes in that block).

---

## Legacy vs Wave — runnable examples

\`logts-play\` blocks use **Legacy**; \`logts-play wave\` sets **Wave** mode (orange pill in the editor). All examples below are verified by tests **804–813** in the test runner.

### 1. \`show\` combinational — without \`NEXT(~)\` (804 / 805)

Same on Legacy and Wave: a single \`show\` at the end, wires are already stable.

\`\`\`logts-play
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)
\`\`\`

\`\`\`logts-play wave
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)
\`\`\`

Output: \`c (1wire) = 0\`, \`a = 0\`, \`b = 1\`.

### 2. \`show\` + \`peek\` after wire change — Legacy cascade (806)

On **Legacy**, \`a = 1\` propagates immediately to \`b = NOT(a)\`; \`peek\` sees \`b = 0\`.

\`\`\`logts-play
1wire a := 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)
\`\`\`

Output (3 lines):

\`\`\`text
a (1wire) = 0 …, b (1wire) = 1 …     ← show after declarations
a (1wire) = 1 …, b (1wire) = 0 …     ← peek after a = 1
a (1wire) = 1 …, b (1wire) = 0 …     ← final show
\`\`\`

### 3. Same script on Wave — deferred \`show\`, immediate \`peek\` (807)

\`\`\`logts-play wave
1wire a := 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)
\`\`\`

On Wave, \`show\` is deferred until end of RUN; \`peek\` after \`a = 1\` reads **before** settle — \`b\` stays \`1\`:

\`\`\`text
a (1wire) = 1 …, b (1wire) = 1 …     ← all 3 lines (shows flush at end)
\`\`\`

### 4. \`show\` on \`REG(data, ~, 0)\` — no \`NEXT\` in script (808 / 809)

\`\`\`logts-play
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
\`\`\`

\`\`\`logts-play wave
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
\`\`\`

Output: \`q (1wire) = 0\` — register has not latched yet (\`NEXT(~)\` missing).

### 5. \`show\` before and after \`NEXT(~)\` in the same script (810 / 811)

**Legacy** — each \`show\` at execution time:

\`\`\`logts-play
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)
\`\`\`

\`\`\`text
q (1wire) = 0 …
q (1wire) = 1 …
\`\`\`

**Wave** — both \`show\` calls are flushed after propagation, **after** \`NEXT(~)\`:

\`\`\`logts-play wave
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)
\`\`\`

\`\`\`text
q (1wire) = 1 …
q (1wire) = 1 …
\`\`\`

### 6. Two \`show(b)\` after \`a = 1\` — Legacy vs Wave (812 / 813)

\`\`\`logts-play
1wire a := 0
1wire b = NOT(a)
show(b)
a = 1
show(b)
\`\`\`

Legacy Output:

\`\`\`text
b (1wire) = 1 …
b (1wire) = 0 …
\`\`\`

\`\`\`logts-play wave
1wire a := 0
1wire b = NOT(a)
show(b)
a = 1
show(b)
\`\`\`

Wave Output — both lines at final flush, \`b\` still \`1\`:

\`\`\`text
b (1wire) = 1 …
b (1wire) = 1 …
\`\`\`

### Summary — Legacy vs Wave (without \`NEXT\` vs with \`NEXT\`)

| Scenario | Legacy | Wave |
|----------|--------|------|
| \`show\` at end, combinational logic | Stable values | Same |
| \`peek\` after \`wire =\` mid-RUN | Immediate cascade | Reads current storage (may be before settle) |
| \`show\` mid-RUN | At each statement | Deferred — flush at end of RUN |
| \`show\` + \`NEXT(~)\` in script | \`q=0\` then \`q=1\` | Both \`show\` after \`NEXT\` → both \`q=1\` |
| \`probe\` after RUN + UI change | \`initialised\` then \`changed\` | Same (tests 800–801) |
| \`probe\` during RUN settle (\`a = AND(b,1)\`) | One line: \`# a = 1 - initialised\` (immediate cascade) | Two lines: \`# a = 0 - initialised\`, \`# a = 1 - changed\` (814–815) |
| \`probe\` + \`REG\` latch at \`clk\` 1→0 | \`# q = 0 - initialised\`, then \`# q = 1 - edge committed\` (816–817) | Same |
| \`probe\` + \`[key]\` + \`REG\` after RUN | \`initialised\` at RUN; \`edge committed\` on key release (818–819) | Same |
| \`probe(.comp)\` on key/switch/dip/rotary/osc | \`initialised\` at RUN; \`changed\` on UI (821–824) | Same |
| \`probe(.div:mod)\` computed component | \`initialised\` / \`changed\` on \`:set\` (836–837) | Same |
| \`probe(.u1.partial)\` chip/PCB internal wire | \`initialised\` / \`changed\` on body re-exec (832–835) | Same |
| \`probe(.u1.sum)\` dot on pout | ignored — use \`probe(.u1:sum)\` (839) | Same |

### 7. \`probe\` — \`initialised\` then \`changed\` at settle (815 wave)

On **Wave**, propagation at end of RUN may change \`a\` after the probe’s first read — the second line must be **\`changed\`**, not \`initialised\`:

\`\`\`logts-play wave
1wire a := 0
1wire b := 1
a = AND(b, 1)
probe(a)
\`\`\`

Output:

\`\`\`text
# a = 0 (&0) - initialised
# a = 1 (&0) - changed
\`\`\`

On **Legacy**, the cascade runs before \`activateProbes\` — a single line:

\`\`\`logts-play
1wire a := 0
1wire b := 1
a = AND(b, 1)
probe(a)
\`\`\`

\`\`\`text
# a = 1 (&0) - initialised
\`\`\`

---

## \`watch\`

### Syntax

Same as \`probe\` — **one expression** per statement:

\`\`\`
watch(clk)
watch(o)
watch(o.1-3)
watch(.sw)
watch(.o:counter)
watch(.u1:sum)
\`\`\`

Collected during **elaboration** (end of **Run**), like \`probe\`. Does **not** write to **Output**; samples appear in the editor **Timeline** panel (above Output). Toggle the panel from **Panels → Timeline**.

### What \`watch\` accepts

Uses the same expression forms as \`probe\` (wires, \`.comp\`, \`.comp:prop\`, chip/PCB \`:pout\`, internal \`.inst.wire\`, \`&ref\`, bit slices). See the **\`probe\`** section above for the full table.

**Multi-bit expansion** — the Timeline shows **one column per bit** (or per single-bit slice), not one collapsed bus:

| Expression | Columns created |
|------------|-----------------|
| \`watch(clk)\` on \`1wire clk\` | \`clk\` |
| \`watch(o)\` on \`4wire o\` | \`o.0\`, \`o.1\`, \`o.2\`, \`o.3\` |
| \`watch(o.2)\` | \`o.2\` |
| \`watch(o.1-3)\` | \`o.1\`, \`o.2\`, \`o.3\` |
| \`watch(.o:counter)\` on \`osc\` with \`length: 4\` | \`.o:counter.0\` … \`.o:counter.3\` |
| \`watch(.sw)\` on \`4bit\` DIP | \`.sw\` (single channel; component \`:get\` as one trace) |
| \`watch(vectorA)\` on \`4wire[3]\` | \`vectorA.0\` … \`vectorA.11\` (flat 12-bit wire) |
| \`watch(vectorA:0)\` | \`vectorA:0.0\` … \`vectorA:0.3\` (one element) |
| \`watch(vectorA:1.0/2)\` | \`vectorA:1.0\`, \`vectorA:1.1\` (sub-range within element) |

See also [wire-vectors.md — probe / watch](wire-vectors.md#probe--watch) for vector-specific behaviour.

**Wire vs component property** — important for oscillators and gated logic:

| Expression | What you see |
|------------|--------------|
| \`watch(o)\` | The **wire** \`o\` after assignments and propagation (e.g. after \`AND\` with a switch). |
| \`watch(.o:counter)\` | The **internal counter** of component \`.o\` (\`osc\` \`:counter\`), independent of wires that read it. |

Example: with \`4wire o = AND(.o:counter, .p + .p + .p + .p)\`, \`watch(.o:counter)\` keeps counting when \`.p\` is off; \`watch(o)\` stays LOW until \`.p\` is on.

### Timeline display

- **Layout:** vertical trace — newest events at the **top**; time axis is **event order** (sample index + cycle), not simulated milliseconds.
- **Columns:** labels are drawn **inside the canvas header** (e.g. \`o.0\`, \`.o:counter.2\`). All channels on a row are **synchronized** (same timestep).
- **Levels:** **green** wide bar = logic \`1\` (HIGH); **narrow dark** bar = logic \`0\` (LOW). A thin highlight marks an edge on that bit.
- **Controls:** **Pause** / **Resume** freezes auto-scroll; **Live** jumps back to the latest samples. **Drag** on the canvas to scroll history.
- **History:** up to ~1500 rows; marker lines every 25 events (\`#seq\` on the right margin).

### Example — wires

\`\`\`logts-play
1wire clk = 0
1wire en = 0

watch(clk)
watch(en)

clk = 1
en = 1
\`\`\`

After **Run**, the Timeline shows two columns toggling when \`clk\` and \`en\` change.

### Example — multi-bit wire and oscillator counter

\`\`\`logts-play
comp [~] .o:
    duration1: 4
    duration0: 4
    length: 4
    freq: 10
    freqIsSec: 0
    eachCycle: 1
    :

comp [switch] .p:
    text: 'Pwr'
    :

4wire o = AND(.o:counter, .p + .p + .p + .p)
1wire c = AND(.o, .p)

watch(.o:counter)
watch(o)
watch(c)
\`\`\`

- \`.o:counter.*\` — four columns; counter ticks in real time (osc timers).
- \`o.*\` — gated by \`.p\`; flat until the switch is on.
- \`c\` — 1-bit gated copy of the osc \`:get\` output.

### Rules

- Same elaboration rules as \`probe\` (position in script does not matter; registered at end of **Run**).
- **Duplicate** \`watch()\` on the same expanded target (e.g. \`watch(o.0-3)\` then \`watch(o.0)\`) creates **one** column — first occurrence wins.
- Computed component properties (\`:counter\`, \`:mod\`, \`:carry\`, …) emit samples when the component recalculates (including \`osc\` timer ticks).
- **Editor only** — available in \`script_editor_v0_3_2.html\`, not in \`run_tests.html\`.
- Complements **\`probe\`**: use \`probe\` for a text log in Output; use \`watch\` for a visual trace over time.

---

## \`lutOf\` and \`exprOfLut\`

Boolean LUT utilities complement \`show\`: they emit **structured text** you can paste into a script as \`inline [lut]\`, or wire assignments from \`exprOfLut\`.

**Full reference:** [boolean-lut.md](boolean-lut.md) — filters, \`description:\` / \`filters:\` attributes, multi-bit, round-trip.

**Related:** [boolean-analysis.md](boolean-analysis.md) — \`truthTableOf\`, \`simplify\`, \`equivalent\`, \`inputsOf\`, \`costOf\`.

### \`lutOf(expression [, filters])\`

Build an \`inline [lut]\` block from a boolean expression.

\`\`\`
lutOf(expr)
lutOf(expr, A=01*1*, B=*, C=000**)
\`\`\`

- Built-ins \`NOT\`, \`AND\`, \`OR\`, \`XOR\`, … or short-notation in backticks: \`\` lutOf(\`A | B\`) \`\`
- **Output:** \`description:\`, optional \`filters:\`, then \`depth:\`, \`length:\`, \`data { … }\`
- **Row limit:** max **256** data rows (\`Boolean analysis exceeds maximum supported table size (256 rows)\`)
- With filters, more than 8 input bits are allowed if the filtered row count stays ≤ 256
- Undeclared names in gates (\`A\`, \`B\`) are **1 bit**; whole wires use declared \`Nwire\` width

\`\`\`logts-play
lutOf(OR(A, B))
\`\`\`

\`\`\`text
inline [lut] .generated:
  description: A 1b, B 1b -> out 1b

  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
:
\`\`\`

### \`exprOfLut(.lut [, variables…])\`

Rebuild boolean logic from an **\`inline [lut]\`** instance.

\`\`\`
exprOfLut(.generated)
exprOfLut(.name, A, B)
exprOfLut(.name, A 2b, B 3b)
exprOfLut(.name, A.2, B.1, A.0, B.0)
\`\`\`

- With **\`filters:\`** on the LUT, omit variables — \`exprOfLut\` derives them from the filter patterns
- Without \`filters:\`, list columns matching \`description:\` (or address width vs \`length\`)
- **Always two Output lines:** short-notation assignment, then standard notation
- Not supported on \`prefixFree\` / \`variableDepth\` LUTs

\`\`\`logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
\`\`\`

\`\`\`logts-play
inline [lut] .or2:
  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
  :

exprOfLut(.or2, A, B)
\`\`\`

### When to use

| Goal | Use |
|------|-----|
| Expression → truth table text | \`truthTableOf\` — [boolean-analysis.md](boolean-analysis.md) |
| Expression → \`inline [lut]\` for paste / invoke | \`lutOf\` |
| \`inline [lut]\` → minimised boolean expression | \`exprOfLut\` |
| Document or share logic outside the simulator | any of the above — Output is plain text |
| Run logic in the circuit | paste \`inline [lut]\` and use \`^.name(in=addr)\` — [lut.md](lut.md) |

Allowed wherever \`show\` works: main script, **chip** body, **board** body. No semicolon at end of line.

### Round-trip (sketch)

1. \`lutOf(OR(A, B))\` → paste Output (\`inline [lut] .generated:\` …)
2. \`exprOfLut(.generated, A, B)\` → paste the two assignment lines

With filters: \`lutOf(…, A=01*1*, B=*, C=1001*)\` then \`exprOfLut(.generated)\` (no variable list).

Details: [boolean-lut.md](boolean-lut.md). LUT invoke syntax: [lut.md](lut.md).

---

## Which one should I use?

| Goal | Use |
|------|-----|
| Show final results in a script | \`show\` |
| Inspect values mid-script (rare) | \`peek\` |
| Trace every change to a wire or ref | \`probe\` |
| Trace key / switch / DIP / osc output direct | \`probe(.comp)\` or \`probe(.comp:get)\` |
| Log UI / \`setWire\` updates after RUN | \`probe\` |
| Trace divider \`:mod\`, adder \`:carry\` | \`probe(.div:mod)\`, \`probe(.add:carry)\` |
| Trace chip/PCB internal wire | \`probe(.u1.partial)\` (dot, not \`:\`) |
| Document a circuit for a reader | \`show\` at the end |
| Expression → truth table text | \`truthTableOf\` — [boolean-analysis.md](boolean-analysis.md) |
| Expression → \`inline [lut]\` block | \`lutOf\` |
| \`inline [lut]\` → boolean expression | \`exprOfLut\` |

---

## Wave vs Legacy (quick reference)

| Statement | Wave (editor default) | Legacy (tests default) |
|-----------|----------------------|-------------------------|
| \`show\` | Deferred until end of RUN / propagate flush | Emitted when the statement runs |
| \`peek\` | Immediate read at statement | Immediate read + cascade already applied |
| \`probe\` | On every value commit | Same |
| \`lutOf\` / \`exprOfLut\` | Immediate at statement | Immediate at statement |

\`probe\` is the only one that keeps reporting when values change **after** the initial RUN (e.g. toggling a switch, pressing a key, \`setWire\` in tests, oscillator ticks). See runnable examples above and tests **804–819** / **800–801**.

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires and displays update
- [Editor UI](editorUI.md) — Output panel, Run, Next, Wave / Legacy toggle
- [doc() function](doc-function.md) — \`doc(def)\` lists \`show\` as a built-in
- [Boolean LUT utilities](boolean-lut.md) — \`lutOf\` / \`exprOfLut\` (\`description:\`, \`filters:\`, multi-bit)
- [Boolean analysis helpers](boolean-analysis.md) — \`truthTableOf\`, \`simplify\`, \`equivalent\`, \`inputsOf\`, \`costOf\`
- [LUT component](lut.md) — runtime \`inline [lut]\` invoke (\`^.name(in=…)\`)
- [REG](reg.md) — \`NEXT(~)\` and wire-clock behaviour with \`show\`
`,
    'dip.md': `# DIP switch component

\`comp [dip]\` is a **group of toggle switches** on one panel control. Each position is one bit; width is set by \`length\` (default \`4\`).

Signature: \`doc(comp.dip)\` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

\`\`\`
comp [dip] .name:
  length: 4
  text: 'Inputs'
  color: ^2ecc71
  visual: 1
  noLabels
  nl
  :
\`\`\`

Minimal (4 bits):

\`\`\`
comp [dip] .name::
\`\`\`

---

## Attributes

| Attribute  | Type    | Default   | Description |
|------------|---------|-----------|-------------|
| \`length\`   | integer | \`4\`       | Number of DIP positions (bits) |
| \`text\`     | string  | \`''\`      | Group label |
| \`color\`    | hex     | \`#2ecc71\` | Color when a position is on |
| \`colorFor\` | array   | —         | Per-position colors |
| \`visual\`   | \`0\`/\`1\` | \`0\`       | Show \`0\`/\`1\` on each position |
| \`noLabels\` | flag    | (no)      | Hide position labels |
| \`noTrans\`  | flag    | —         | Disable transition animation |
| \`nl\`       | flag    | (no)      | Newline after the control |

---

## Output

- **N bits** as one string, e.g. \`1010\` for \`length: 4\`
- Bit \`0\` is the **leftmost** position
- Default all zeros after **RUN**

---

## Reading

\`\`\`
4wire all = .d:get
1wire bit0 = .d.0      # single bit (dip only)
1wire bit2 = .d.2
\`\`\`

Use \`Nwire\` where \`N = length\`.

---

## Example

\`\`\`logts-play
comp [dip] .sw:
  length: 4
  text: 'Mode'
  visual: 1
  :

4wire mode = .sw:get
show(mode)
\`\`\`

Flip DIP positions in the panel after **RUN** — \`mode\` updates automatically.

---

## Notes

- Input only — not assignable from code.
- Bit slice \`.name.N\` works for **dip** only among panel inputs.
- \`probe(.sw)\` or \`probe(.sw.0)\` — [debug.md](debug.md).
`,
    'divider.md': `# Divider component

\`comp [divider]\` (shortname \`comp [/]\`) performs **unsigned integer division** on two **N-bit** operands.

Built-in: \`DIVIDE()\` — [arithmetic.md](arithmetic.md). Signature: \`doc(comp.divider)\` or \`doc(comp./)\`.

---

## Syntax

\`\`\`
comp [divider] .name:
  depth: 4
  on: 1
  :
\`\`\`

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Enable |
| \`a\`, \`b\` | \`depth\` | Dividend and divisor |
| \`get\` | \`depth\` | Quotient \`⌊a / b⌋\` |
| \`mod\` | \`depth\` | Remainder \`a % b\` |

Division by zero yields \`0\` on both outputs.

---

## Example

\`\`\`logts-play
comp [divider] .div:
  depth: 4
  on: 1
  :

.div:{
  a = 1101
  b = 0011
  set = 1
}

4wire q = .div:get
4wire r = .div:mod
show(q, r)
\`\`\`

\`13 / 3\` → \`q = 0100\` (4), \`r = 0001\` (1).

Probe component properties: \`probe(.div:mod)\` — [debug.md](debug.md).

---

## Related

- [multiplier.md](multiplier.md)
- [components.md](components.md)
`,
    'doc-function.md': `# doc() — Documentation for functions and components

The \`doc\` instruction displays the syntax (signature) of a built-in or user-defined function, internal component type, or PCB component directly in the output panel.

\`\`\`
doc()              # index of all doc() forms
doc(FunctionName)
doc(comp)
doc(comp.type)
doc(board)
doc(board.type)
doc(pcb)
doc(pcb.type)
doc(show)          # debug keywords: show, peek, probe, watch, Zlist
\`\`\`

---

## Usage

### \`doc()\` — index

\`doc()\` with no argument prints a short guide to what you can pass to \`doc(...)\`:

- \`def\` — built-in, debug, and user-defined function names (see [user-functions.md](user-functions.md))
- \`comp\`, \`comp.type\` — components
- \`pcb\`, \`chip\`, \`board\`, \`inline\`, \`.inst\` — hierarchical types
- function name — e.g. \`OR\`, \`ADD\`, \`myFunc\`
- \`show\`, \`peek\`, \`probe\`, \`watch\`, \`Zlist\` — debug statements

### Syntax

\`\`\`
doc(FunctionName)
\`\`\`

\`FunctionName\` is written **without quotes** — it is an identifier, not a string.

### Simple example

\`\`\`
doc(OR)
\`\`\`

Output:

\`\`\`
OR(Xbit)
OR(Xbit, Xbit)
\`\`\`

---

## Built-in functions

Grouped catalogue: **[builtin-functions.md](builtin-functions.md)** (index with links per category).

### Logic gates

See [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md).

| Call | Output |
|------|--------|
| \`doc(NOT)\` | \`NOT(Xbit) -> Xbit\` |
| \`doc(AND)\` | \`AND(Xbit) -> 1bit\` / \`AND(Xbit, Xbit) -> Xbit\` |
| \`doc(OR)\` | \`OR(Xbit) -> 1bit\` / \`OR(Xbit, Xbit) -> Xbit\` |
| \`doc(XOR)\` | \`XOR(Xbit) -> 1bit\` / \`XOR(Xbit, Xbit) -> Xbit\` |
| \`doc(NXOR)\` | \`NXOR(Xbit) -> 1bit\` / \`NXOR(Xbit, Xbit) -> Xbit\` |
| \`doc(NAND)\` | \`NAND(Xbit) -> 1bit\` / \`NAND(Xbit, Xbit) -> Xbit\` |
| \`doc(NOR)\` | \`NOR(Xbit) -> 1bit\` / \`NOR(Xbit, Xbit) -> Xbit\` |
| \`doc(EQ)\` | \`EQ(Xbit, Xbit) -> 1bit\` / \`EQ(Xbit, Xbit, Xbit, ...) -> 1bit\` / \`EQ(...; vector) -> 1wire[n]\` |
| \`doc(LATCH)\` | \`LATCH(Xbit data, 1bit clock) -> Xbit\` |

**\`Xbit\`** means the function accepts a bit string of any width.

**1-argument mode** (fold): \`OR(a)\` applies OR across all bits of \`a\`, yielding **1 bit**.

**2-argument mode** (bitwise): \`OR(a, b)\` applies OR bit-by-bit between \`a\` and \`b\`, yielding **N bits**.

### Bit transform (shift / rotate / reverse)

| Call | Output |
|------|--------|
| \`doc(LSHIFT)\` | \`LSHIFT(Xbit data, Nbit n) -> Xbit\` / optional \`fill\` |
| \`doc(RSHIFT)\` | \`RSHIFT(Xbit data, Nbit n) -> Xbit\` / optional \`fill\` |
| \`doc(REVERSE)\` | \`REVERSE(Xbit) -> Xbit\` |
| \`doc(LROTATE)\` | \`LROTATE(Xbit data, Ybit count) -> Xbit\` |
| \`doc(RROTATE)\` | \`RROTATE(Xbit data, Ybit count) -> Xbit\` |

Full behaviour, short notation (\`<\`, \`>\`), and examples: [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md).

### Bit selection and detection

| Call | Output |
|------|--------|
| \`doc(HIGH)\` | \`HIGH(Xbit) -> Xbit\` |
| \`doc(LOW)\` | \`LOW(Xbit) -> Xbit\` |
| \`doc(ANY)\` | \`ANY(Xbit) -> 1bit\` |
| \`doc(ZERO)\` | \`ZERO(Xbit) -> 1bit\` |
| \`doc(ANY0)\` | \`ANY0(Xbit) -> 1bit\` |
| \`doc(ALLZX)\` | \`ALLZX(Xbit) -> 1bit\` |
| \`doc(BITINDEX)\` | \`BITINDEX(Xbit) -> Ybit index, 1bit isInvalid\` |
| \`doc(ONEHOT)\` | \`ONEHOT(Xbit index) -> 2^X bits\` |

\`BITINDEX\` returns **two values** — assign both wires (index width ≈ \`bitIndexWidth(len(input))\`).

Full behaviour and priority-encoder pattern: [builtin-bit-selection-functions.md](builtin-bit-selection-functions.md).

### Bit analysis

| Call | Output |
|------|--------|
| \`doc(PARITY)\` | \`PARITY(Xbit) -> 1bit\` |
| \`doc(CNTONE)\` | \`CNTONE(Xbit) -> Ybit\` |
| \`doc(CNTZERO)\` | \`CNTZERO(Xbit) -> Ybit\` |
| \`doc(BITSIZE)\` | \`BITSIZE(Xbit) -> Ybit\` |

Full behaviour: [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md).

### Shift (legacy anchor)

Moved to **Bit transform** — see [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md#lshift).

### Register (REG)

Width is inferred from \`data\` at runtime:

\`\`\`
doc(REG)
\`\`\`

Output:

\`\`\`
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
\`\`\`

Parameters:
- \`data\` — value to store (determines register width)
- \`clock\` — wire: **falling edge** (\`1\` → \`0\`) captures \`data\`; \`~\`: updates on \`NEXT(~)\` (see [reg.md](reg.md))
- \`clear\` — \`1\` resets the register to zero

Full behaviour: [reg.md](reg.md).

### Multiplexer (MUX)

Selector width is inferred from \`sel\` at runtime:

\`\`\`
doc(MUX)
\`\`\`

Output:

\`\`\`
MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit
\`\`\`

- \`sel\` — \`N\` bits → \`2^N\` data inputs
- Pass separate \`data0\`, \`data1\`, … **or** one packed \`Xbit\` string split into equal chunks

Full behaviour and examples: [builtin-routing-functions.md](builtin-routing-functions.md).

### Demultiplexer (DEMUX)

\`\`\`
doc(DEMUX)
\`\`\`

Output:

\`\`\`
DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..
\`\`\`

DEMUX returns **\`2^N\` values**: the selected output carries \`data\`, the rest are \`0\`.

See [builtin-routing-functions.md](builtin-routing-functions.md).

### Arithmetic (ADD / SUBTRACT / MULTIPLY / DIVIDE)

These functions perform **instant** binary arithmetic and return **two values**: the result and an overflow/borrow indicator.

\`\`\`
doc(ADD)
doc(SUBTRACT)
doc(MULTIPLY)
doc(DIVIDE)
\`\`\`

| Call | Signature |
|------|-----------|
| \`doc(ADD)\` | \`ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry\` |
| \`doc(SUBTRACT)\` | \`SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry\` |
| \`doc(MULTIPLY)\` | \`MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over\` |
| \`doc(DIVIDE)\` | \`DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod\` |

Since these functions return **two values**, they must be assigned to two variables:

\`\`\`
4wire result, 1wire carry = ADD(a, b)
4wire result, 1wire carry = SUBTRACT(a, b)
4wire result, 4wire over  = MULTIPLY(a, b)
4wire result, 4wire mod   = DIVIDE(a, b)
\`\`\`

The bit width of both inputs is taken as \`max(len(a), len(b))\`. The result is always that same width.

**ADD** — binary addition, modular (wraps at \`2^N\`):
- \`carry = 1\` if the sum exceeds \`2^N - 1\`; \`0\` otherwise

**SUBTRACT** — binary subtraction, modular (wraps at \`2^N\`):
- \`carry = 1\` if \`a < b\` (borrow); \`0\` otherwise

**MULTIPLY** — binary multiplication:
- \`result\` = low \`N\` bits of the product
- \`over\` = high \`N\` bits of the product (shifted right by \`N\`)

**DIVIDE** — binary integer division:
- \`result\` = quotient (\`a / b\`, truncated)
- \`mod\` = remainder (\`a % b\`)
- Division by zero returns \`0\` for both outputs

### Number conversion

Decimal and hex packed digits. Full reference: [number-conversion.md](number-conversion.md).

\`\`\`
doc(CNTN10S)
doc(N2N10S)
doc(N10S2N)
doc(CNTN16S)
doc(N2N16S)
doc(N16S2N)
doc(ISDIGIT)
\`\`\`

### Compare / select / MAC

See [arithmetic.md](arithmetic.md).

\`\`\`
doc(GT)
doc(LT)
doc(MIN)
doc(MAX)
doc(CLAMP)
doc(MAC)
\`\`\`

| Call | Signature |
|------|-----------|
| \`doc(GT)\` | \`GT(Xbit a, Xbit b) -> 1bit\` |
| \`doc(LT)\` | \`LT(Xbit a, Xbit b) -> 1bit\` |
| \`doc(MIN)\` | \`MIN(Xbit a, Xbit b, ...) -> Xbit\` |
| \`doc(MAX)\` | \`MAX(Xbit a, Xbit b, ...) -> Xbit\` |
| \`doc(CLAMP)\` | \`CLAMP(Xbit x, Ybit min, Ybit max) -> Ybit\` |
| \`doc(ISDIGIT)\` | \`ISDIGIT(Xbit value) -> 1bit\` |
| \`doc(MAC)\` | \`MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over\` |

### Vector reduction (SUM / DOT)

See [vector-reduction.md](vector-reduction.md) and [arithmetic.md — SUM / DOT](arithmetic.md#sum--dot-vector-reduction).

\`\`\`
doc(SUM)
doc(DOT)
\`\`\`

| Call | Signature |
|------|-----------|
| \`doc(SUM)\` | \`SUM(Wbit ...) -> Wbit result, Wbit over\` |
| \`doc(DOT)\` | \`DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over\` |

**SUM** is variadic: plain wires, whole vectors (elements expand), or a mix. Output is **2W** bits (\`result\` low, \`over\` high).

**DOT** takes two **whole vectors** of the same shape. Output is **3W** bits (\`result\` low **W**, \`over\` next **2W**). Slice arguments are not supported.

\`\`\`
4wire result, 4wire over = SUM(a, b)
4wire result, 4wire over = SUM(vectorA)
4wire result, 8wire over = DOT(vectorA, vectorB)
\`\`\`

### Tristate (MODE ZSTATE)

Requires \`MODE ZSTATE\` and wave propagation. Full behaviour: [zstate.md](zstate.md) and [builtin-functions.md](builtin-functions.md).

\`\`\`
doc(ZRELEASE)
doc(ZCONNECT)
doc(ZCONN)
\`\`\`

| Call | Signature |
|------|-----------|
| \`doc(ZRELEASE)\` | \`ZRELEASE(wireName) — release wire to high-Z (MODE ZSTATE statement)\` |
| \`doc(ZCONNECT)\` | \`ZCONNECT(en, data) — enable-gated drive value (MODE ZSTATE); bus = ZCONNECT(en, data)\` |
| \`doc(ZCONN)\` | \`ZCONNECT(en, data) — alias for ZCONNECT\` |

\`ZRELEASE\` is a **statement** (not an expression). \`ZCONNECT\` / \`ZCONN\` are used in wire assignments (\`bus = ZCONNECT(en, data)\`) or as statement sugar (\`ZCONNECT(bus, en, data)\`).

### Decimal conversion (summary)

| Call | Signature |
|------|-----------|
| \`doc(CNTN10S)\` | \`CNTN10S(Xbit value) -> Ybit\` |
| \`doc(N2N10S)\` | \`N2N10S(Xbit value) -> Zbit packed\` |
| \`doc(N10S2N)\` | \`N10S2N(Xbit packed) -> Wbit value\` |

\`\`\`
8wire n = 11110101
2wire cnt = CNTN10S(n)
12wire num10s = N2N10S(n)
8wire back := N10S2N(num10s)
\`\`\`

- \`CNTN10S(0)\` → \`1\` digit
- \`N2N10S\` output width = \`maxCifre × 4\` (from input width)
- \`N10S2N\` returns minimal-width binary; invalid nibble (>9) is an error

#### ADD examples

\`\`\`
4wire idx = 0011
4wire inc = 0001
4wire nextIdx, 1wire carry = ADD(idx, inc)
# nextIdx = 0100, carry = 0

4wire idx2 = 1111
4wire inc2 = 0001
4wire nextIdx2, 1wire carry2 = ADD(idx2, inc2)
# nextIdx2 = 0000, carry2 = 1
\`\`\`

#### SUBTRACT examples

\`\`\`
4wire idx = 0011
4wire dec = 0001
4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)
# prevIdx = 0010, carry = 0

4wire idx2 = 0000
4wire dec2 = 0001
4wire prevIdx2, 1wire carry2 = SUBTRACT(idx2, dec2)
# prevIdx2 = 1111, carry2 = 1
\`\`\`

#### MULTIPLY examples

\`\`\`
4wire a = 0010
4wire b = 0011
4wire result, 4wire over = MULTIPLY(a, b)
# result = 0110 (6), over = 0000

4wire a2 = 1111
4wire b2 = 1111
4wire result2, 4wire over2 = MULTIPLY(a2, b2)
# result2 = 0001 (225 & 0xF), over2 = 1110 (225 >> 4)
\`\`\`

#### DIVIDE examples

\`\`\`
4wire a = 0110
4wire b = 0010
4wire result, 4wire mod = DIVIDE(a, b)
# result = 0011 (3), mod = 0000

4wire a2 = 0111
4wire b2 = 0010
4wire result2, 4wire mod2 = DIVIDE(a2, b2)
# result2 = 0011 (3), mod2 = 0001 (remainder 1)
\`\`\`

> **Note:** These built-in functions compute results **instantly** (no clock cycle needed), unlike \`comp.adder\`, \`comp.subtract\`, \`comp.multiplier\`, and \`comp.divider\` which are hardware components that require explicit input/output wiring.

---

## Listing all functions: doc(def)

\`doc(def)\` displays built-in functions, **debug** statements, and user-defined functions in three sections:

\`\`\`
doc(def)
\`\`\`

Output:

\`\`\`
built-in:
NOT, AND, OR, … HIGH, LOW, ANY*, ALL*, BITINDEX, …

(* = 0/1/01/10/Z/X/ZX/XZ)

debug:
show, peek, probe, watch, Zlist

user defined:
myFunc, helper, ...
\`\`\`

Per-keyword signatures: \`doc(show)\`, \`doc(peek)\`, \`doc(probe)\`, \`doc(watch)\`, \`doc(Zlist)\`.

If no user-defined functions exist:

\`\`\`
built-in:
NOT, AND, OR, …

debug:
show, peek, probe, watch, Zlist

user defined:
(none)
\`\`\`

---

## User-defined functions

Full guide: **[user-functions.md](user-functions.md)** — define with \`def\`, call, multiple returns, \`LOAD\`, restrictions.

\`doc\` also works for functions defined with \`def\`:

\`\`\`
def add(8bit a, 8bit b):
   :8bit OR(a, b)

doc(add)
\`\`\`

Output:

\`\`\`
add(8bit a, 8bit b) -> 8bit
\`\`\`

If the function returns multiple values:

\`\`\`
def split(8bit x):
   :4bit x.0/4
   :4bit x.4/4

doc(split)
\`\`\`

Output:

\`\`\`
split(8bit x) -> 4bit, 4bit
\`\`\`

---

## Unknown functions

If the name is not recognized:

\`\`\`
doc(Foo)
\`\`\`

Output:

\`\`\`
Foo: undefined function
\`\`\`

---

## Internal components (comp)

Per-component guides (syntax, examples, pins): **[components.md](components.md)**. Composite blocks: [board.md](board.md), [chip.md](chip.md), [pcb.md](pcb.md) (deprecated).

### doc(comp) — list of all component types

Displays all available component types, with shortnames on the same line:

\`\`\`
doc(comp)
\`\`\`

Example output:

\`\`\`
comp.led
comp.switch
comp.adder, comp.+
comp.subtract, comp.-
comp.7seg, comp.7
comp.osc, comp.~
...
\`\`\`

### doc(inline) — list inline instances

\`\`\`
doc(inline)
\`\`\`

Lists every \`inline [asm]\` / \`inline [lut]\` / \`inline [protocol]\` instance in the script (e.g. \`.myisa (inline [asm])\`). Kinds: \`inline.asm\`, \`inline.lut\`, \`inline.protocol\`.

### doc(inline.kind) — declaration template

| Call | Topic | Page |
|------|-------|------|
| \`doc(inline.asm)\` | asm | [asm.md](asm.md) |
| \`doc(inline.lut)\` | lut | [lut.md](lut.md) |
| \`doc(inline.protocol)\` | protocol | [protocol.md](protocol.md) |

### doc(.name) — specific inline instance

After \`inline [asm] .myisa:\`, \`inline [lut] .decoder:\`, or \`inline [protocol] .uart8n1:\`, \`doc(.myisa)\` / \`doc(.decoder)\` / \`doc(.uart8n1)\` shows opcodes, LUT map, or protocol channels for that instance. See [asm.md](asm.md), [lut.md](lut.md), and [protocol.md](protocol.md).

### doc(comp.type) — syntax of a component

Displays the full syntax for a component type. Shortnames are accepted and redirect to the canonical type.

\`\`\`
doc(comp.adder)
doc(comp.+)        # equivalent to doc(comp.adder)
\`\`\`

Output:

\`\`\`
comp [adder] .name:
  depth: integer
  = Xbit
  :{
    1pin set
    Xpin a
    Xpin b
    Xpout get
    1pout carry
  }
  -> Xbit
\`\`\`

**Output structure:**
- Declaration attributes (before \`:{\`) — with value (\`depth: integer\`) or without (\`nl\`, \`circular\`)
- \`= Xbit\` — appears if the component accepts direct assignment with \`=\`; omitted if not (e.g. \`counter\`, \`osc\`)
- \`:{\` ... \`}\` — pins (inputs) and pouts (outputs) available in the property block
- \`-> Xbit\` — the return type of the component

> **Note on \`mem\`:** \`doc(comp.mem)\` shows \`= Xbit\` because \`mem\` supports initialization with \`= literal\`, \`= ^hex\`, \`= varName\`, or \`= .isa { … }\` ([inline ASM](asm.md)) in the declaration, and bulk re-initialization via \`.mem = value\` (or \`.mem = .isa { … }\`) after declaration. The value is split into \`depth\`-bit chunks across consecutive addresses. See [mem.md](mem.md) for details.

### All available components

| Call | Guide |
|------|-------|
| \`doc(comp.led)\` | [led.md](led.md) |
| \`doc(comp.switch)\` | [switch.md](switch.md) |
| \`doc(comp.key)\` | [key.md](key.md) |
| \`doc(comp.dip)\` | [dip.md](dip.md) |
| \`doc(comp.rotary)\` | [rotary.md](rotary.md) |
| \`doc(comp.slider)\` | [slider.md](slider.md) |
| \`doc(comp.bar)\` | [led-bar.md](led-bar.md) |
| \`doc(comp.7seg)\` / \`doc(comp.7)\` | [seven-seg.md](seven-seg.md) |
| \`doc(comp.14seg)\` / \`doc(comp.14)\` | [14seg.md](14seg.md) |
| \`doc(comp.lcd)\` | [lcd.md](lcd.md) |
| \`doc(comp.dots)\` / \`doc(comp.:)\` | [dots.md](dots.md) |
| \`doc(comp.adder)\` / \`doc(comp.+)\` | [adder.md](adder.md) |
| \`doc(comp.subtract)\` / \`doc(comp.-)\` | [subtract.md](subtract.md) |
| \`doc(comp.multiplier)\` / \`doc(comp.*)\` | [multiplier.md](multiplier.md) |
| \`doc(comp.divider)\` / \`doc(comp./)\` | [divider.md](divider.md) |
| \`doc(comp.shifter)\` / \`doc(comp.>)\` | [shifter.md](shifter.md) |
| \`doc(comp.counter)\` / \`doc(comp.=)\` | [counter.md](counter.md) |
| \`doc(comp.mem)\` | [mem.md](mem.md) |
| \`doc(comp.lut)\` | [lut.md](lut.md) — type syntax; \`doc(.inst)\` shows mapped table |
| \`doc(comp.reg)\` | [reg.md](reg.md) |
| \`doc(comp.osc)\` / \`doc(comp.~)\` | [oscillator.md](oscillator.md) |

Panel inputs overview: [interactive-components.md](interactive-components.md). Full index: [components.md](components.md).

### Undefined type

\`\`\`
doc(comp.xyz)
# displays:
comp.xyz: undefined component type
\`\`\`

---

## Board components (board)

User guide: **[board.md](board.md)**.

### doc(board) — list of user-defined board types

\`\`\`
doc(board)
\`\`\`

### doc(board.type) — syntax of a board type

\`\`\`
doc(board.halfAdd)
\`\`\`

---

## PCB components (pcb)

> Deprecated — prefer [board.md](board.md).

User guide: **[pcb.md](pcb.md)**.

### doc(pcb) — list of user-defined PCB types

\`\`\`
doc(pcb)
\`\`\`

Output (if types \`bcd\` and \`alu\` have been defined):

\`\`\`
pcb.bcd
pcb.alu
\`\`\`

### doc(pcb.type) — syntax of a PCB type

\`\`\`
doc(pcb.bcd)
\`\`\`

Output:

\`\`\`
pcb [bcd] .name:
  exec: set
  on: raise/edge/1/0
  :{
    4pin sum
    1pin set
    4pout corr
    1pout carry
  }
  -> 1bit
\`\`\`

**Output structure:**
- \`exec: set\` — the pin that triggers execution
- \`on: raise/edge/1/0\` — the trigger condition (value depends on the PCB definition)
- \`:{\` ... \`}\` — the defined pins (inputs) and pouts (outputs)
- \`-> Nbit\` — the return type (if \`:Nbit varName\` is at the end of the definition)

**Undefined type:**

\`\`\`
doc(pcb.xyz)
# displays:
pcb.xyz: undefined PCB type
\`\`\`

---

## Chip components (chip)

User guide: **[chip.md](chip.md)**.

Chip types are lightweight reusable blocks (similar to PCB) without \`~~\`, \`def\`, nested \`chip +[...]\`, or UI components (\`switch\`, \`key\`, \`led\`, etc.). A chip body may instantiate other top-level chip types via \`chip [type] .inst::\`.

### Syntax

**Definition (top-level only):**

\`\`\`
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum
\`\`\`

**Instantiation:**

\`\`\`
chip [halfAdd] .u1::
\`\`\`

**Property block (pins + exec trigger):**

\`\`\`
.u1:{
  a = 0101
  b = 0011
  set = 1
}
\`\`\`

**External wire from pout:**

\`\`\`
4wire r = .u1:sum
\`\`\`

### doc(chip) — list of user-defined chip types

\`\`\`
doc(chip)
\`\`\`

Output (if \`halfAdd\` is defined):

\`\`\`
chip.halfAdd
\`\`\`

### doc(chip.type) — syntax of a chip type

\`\`\`
doc(chip.halfAdd)
\`\`\`

Output:

\`\`\`
chip [halfAdd] .name:
  exec: set
  on: 1
  :{
    4pin a
    4pin b
    1pin set
    4pout sum
    1pout carry
  }
  -> 4bit
\`\`\`

**Undefined type:**

\`\`\`
doc(chip.xyz)
# displays:
chip.xyz: undefined chip type
\`\`\`

### doc(.inst) and doc(.inst.sub)

After instantiation, \`doc(.u1)\` shows the instance signature; \`doc(.u1.add)\` shows an internal component (when present).

Example:

\`\`\`logts-play
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
doc(chip)
doc(chip.halfAdd)
\`\`\`

### Runnable example — half-adder instance

\`\`\`logts-play
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
\`\`\`

Wave propagation (same script, wave mode):

\`\`\`logts-play wave
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
\`\`\`

---

## Debug output (\`show\`, \`peek\`, \`probe\`)

Built-in display statements for the Output panel. Full reference with runnable examples:

**[debug.md](debug.md)** — \`show\`, \`peek\`, \`probe\` syntax, formats, when to use each, Wave vs Legacy.

---

## Notes

- \`doc\` is a **statement** (like \`show\`), not an expression — it cannot be used on the right side of \`=\`.
- The argument is an **identifier** (not a quoted string).
- \`doc\` does not evaluate anything — it only displays the static signature.
- It can be placed anywhere in the code, including before or after function definitions.
- \`doc(comp.shortname)\` is equivalent to \`doc(comp.canonicalType)\` — e.g. \`doc(comp.+)\` = \`doc(comp.adder)\`.
- \`doc(def)\` lists **all** built-in functions on one line and all user-defined functions on another. It is useful for quick reference when working in the script editor.
`,
    'doc-viewer.md': `# Documentation viewer

The script editor includes a built-in documentation browser for all \`doc/*.md\` pages bundled with v0.3.2.

Open it with the toolbar **Doc** button (or a URL hash such as \`#network.md\`). Use **Editor** (or the editor tab) to return to your script.

---

## Index and navigation

The landing page lists topics grouped by section (**Reference**, **Composite blocks**, **Displays**, and so on). Click a title to open that page.

| Control | Action |
|---------|--------|
| **← Back** | Return to the previous page in your session (disabled on the first page) |
| **History** | List of pages you opened this session — click to jump back |
| **Search** | Filter topics by title and keywords (type-ahead menu; **Enter** to open selection) |

Internal links (\`[label](other-page.md)\` or \`[label](other-page.md#anchor)\`) stay inside the viewer. External \`http(s)\` links open normally.

The address bar hash updates to \`#filename.md\` while you read (e.g. \`#editorUI.md\`). Refreshing the page with that hash reopens the same document.

---

## Runnable examples (\`logts-play\`)

Many pages include example scripts in fenced blocks marked \`logts-play\`. After the page renders, each block shows two buttons above the code:

| Button | Action |
|--------|--------|
| **Load** | Copy the script into a **new editor tab** without running it. Inspect or edit, then press toolbar **Run** when ready. |
| **Load & Run** | Copy the script into a new tab **and** run it immediately (same as **Load** followed by **Run**). |

Details:

- A new tab is created named \`ex: <page title>\` (or \`ex: <page title> #2\` for the second block on the same page).
- The tab uses the editor’s current **Wave / Legacy** pill **unless** the block specifies a mode (see below).
- If the tab limit is reached, you are asked to close a tab first.
- **Load & Run** is appropriate for static demos, device panels, oscillators, and anything that needs timers or live updates without an extra click.
- **Load** is useful when you want to change **Inst**, propagation mode, or code before running — or when the example expects you to press **Next** step by step.

### Propagation mode on examples

Optional language tag on the fence:

\`\`\`\`markdown
\`\`\`logts-play wave
...
\`\`\`
\`\`\`\`

| Tag | Meaning |
|-----|---------|
| \`logts-play\` | Use whatever Wave / Legacy mode the editor pill shows |
| \`logts-play wave\` | Force **wave** for the new tab (orange badge on the block) |
| \`logts-play legacy\` | Force **legacy** for the new tab (green badge) |

See [editorUI.md](editorUI.md) for **Run** / **Stop**, **Inst**, and propagation controls.

---

## Other embedded content

Some pages (for example [clcd.md](clcd.md)) add interactive galleries (\`clcd-symbol-gallery\` blocks) inside the viewer. Those are page-specific; runnable scripts still use **Load** / **Load & Run** as above.

Programmatic help from scripts uses the \`doc()\` function — see [doc-function.md](doc-function.md).

---

## Related

- [editorUI.md](editorUI.md) — toolbar **Run**, **Stop**, **Inst**, panels
- [doc-function.md](doc-function.md) — \`doc()\` from LogTScript code
`,
    'dots.md': `# Clock dots component (\`dots\`)

\`comp [dots]\` (shortname \`comp [:]\`) renders a **two-dot colon** (clock separator). Output is **2 bits** (\`up\`, \`down\`).

Signature: \`doc(comp.dots)\` or \`doc(comp.:)\`.

---

## Syntax

\`\`\`
comp [dots] .name:
  color: ^f00
  bgColor: ^111
  scale: 2
  nl
  :
\`\`\`

---

## Driving modes

| Pin | Width | Effect |
|-----|-------|--------|
| \`data\` | 2 | Direct \`up\`/\`down\` bits |
| \`chr\` | 8 | \`:\` or \`.\` maps to dot pattern |
| \`up\`, \`down\` | 1 each | Individual dot control |
| \`set\` | 1 | Enable property block |
| \`get\` | 2 | Read back state |

Direct assignment \`= 2bit\` or \`= 11\` for both dots on.

---

## Example

\`\`\`logts-play
comp [dots] .colon:
  color: ^f00
  scale: 2
  nl
  on: 1
  :

.colon:{
  chr = 01011010
  set = 1
}
\`\`\`

Character \`:\` lights both dots.

---

## Notes

- Often paired with [seven-seg.md](seven-seg.md) for clock displays.
- Not allowed in [chip.md](chip.md) bodies.
`,
    'editorUI.md': `# Editor UI — run controls

This document describes toolbar controls in the script editor that affect **how a program runs**. It does not cover tabs, files, AST, or other panels.

For the built-in **Doc** browser (index, search, **Load** / **Load & Run** examples), see [doc-viewer.md](doc-viewer.md).

For what Wave and Legacy mean internally, see [signal-propagation.md](signal-propagation.md).

---

## Run / Stop

**Button:** \`Run\` while idle · \`Stop\` while a simulation is active on this tab.

The button has a **fixed width** (it does not resize when the label changes). While running, it uses the **green** instance colour for the active Inst slot (1–5). When idle, it returns to the default button style.

### Run

Executes the full program from the editor:

1. Clears the devices panel and output (fresh run).
2. Parses and runs all statements.
3. Creates a new interpreter using the **propagation mode** selected in the pill toggle (see below).
4. Shows \`show\` / \`peek\` / \`probe\` output, **\`watch\` traces** in the Timeline panel, and updates the Variables panel (see [debug.md](debug.md)).

Use **Run** after changing code or after switching Wave / Legacy so the new mode takes effect.

If another tab already owns the same **Inst** slot, that tab is stopped and frozen (same as pressing **Stop** there): its output becomes a snapshot and the slot is released for the new run.

### Stop

**Click Stop** to end the simulation on this tab without closing it.

| What stops | What is kept |
|------------|--------------|
| Oscillator timers, **S** auto-step, wire propagation | Output, Variables, Devices — frozen as a **snapshot** on this tab |
| Network endpoints for this Inst slot | Editor text and tab Inst dropdown |
| **Next** / **S** (disabled until the next Run) | Probe / watch history already in Output |

After **Stop**:

- The button shows **Run** again (no green highlight).
- The tab label loses the live **·N** running marker.
- The Inst slot is **free** — another tab can **Run** on the same number.
- Panels show the last captured state until you **Run** again (or switch tabs).

**Stop** does not clear the **Network Traffic** log (global; see [network-traffic-panel.md](network-traffic-panel.md)).

---

## Next

**Button:** \`Next\`

Advances simulation time for wires that depend on \`~\` (one \`NEXT(~)\` step per click).

- Requires a program that has already been started with **Run**.
- Uses the **same interpreter** (and thus the same propagation mode) as the last **Run**.
- Does not re-parse the editor; it only executes \`NEXT\` on the running session.

The auto-step buttons (\`S\` / interval) call the same **Next** logic on a timer.

---

## Toolbar layout

Left to right: **Run** / **Stop**, **Inst: N** (1–5), **wave / legacy**, then **Next**, **S**, and interval **1** (step controls). A visual separator divides run config from step controls.

---

## Instance (Inst 1–5)

**Control:** **Inst: N** dropdown next to **Run**.

You can run up to **five simulations in parallel** in the same browser page. Each number is an **instance slot** (1–5), not a CPU core — think of it as five independent “Run sessions” that can talk to each other (for example via [network](network.md)).

| What | Behaviour |
|------|-----------|
| **Inst dropdown** | Chooses which slot the **next Run** on this tab will use. |
| **Tab label ·N** | After Run, the tab shows **·N** — the slot that is actually running (may differ from the dropdown until you Run again). |
| **Per tab** | Each editor tab remembers its own Inst selection. |
| **Output panel** | One visible panel, but each instance keeps its **own output history** while you switch tabs. |

### Meta constant \`/instance/\`

At **Run** time you can read the slot number in a wire:

\`\`\`logts
4wire inst : /instance/
show(inst)
\`\`\`

On **Inst 1** → \`0001\`; on **Inst 2** → \`0010\`, and so on. Details: [meta-constants.md](meta-constants.md).

Use this to put “who am I” in a network packet, UART frame, or local logic. \`/instance/\` is fixed for the whole run on that tab.

---

## Propagation toggle (Wave / Legacy)

**Control:** pill button next to **Run** — label shows the active mode.

| Mode | Colour | Meaning (short) |
|------|--------|-----------------|
| **wave** | Orange | Wires and component outputs settle together, then displays refresh. Default in the editor. |
| **legacy** | Green | Wires update immediately as each assignment runs (older model). |

**Click** the pill to switch between \`wave\` and \`legacy\`.

### When the choice applies

- The toggle sets the mode for the **next Run** only.
- It does **not** change propagation on an already running session until you press **Run** again.
- **Next** always uses whatever mode was active at the last **Run**.

Your choice is saved in browser storage (\`prog/propagation\`) and restored when you reopen the editor.

---

## \`probe\` — propagation vs network

Most of the time, **\`probe\` updates by itself** while the program runs: when wires change during **Run**, **Next**, or **wave / legacy** propagation, new probe lines are added to that instance’s output.

**Network** is different: a packet can arrive on another instance **without** running that instance’s script again. Nothing in the wire graph changes, so \`probe(.wifi:get)\` is not notified the same way.

| | Wires & normal components | \`comp [network]\` RX |
|--|---------------------------|---------------------|
| **What changes** | Values in the running simulation | Packet queue on a shared bus |
| **When probe updates** | During Run / Next / propagation | When a packet is **delivered** to that instance (or when you open that instance’s tab) |
| **Needs a separate refresh?** | No | Yes — editor re-reads probes for that instance |
| **History** | New lines appended (\`initialised\`, then \`changed\`) | Same — old probe lines are kept |

So: propagation and \`probe\` go together; **network uses an extra refresh** so the receiving tab’s output can show \`- changed\` even if that tab is in the background.

Typical two-tab test:

1. Tab B (Inst 2): \`comp [network]\` + \`probe(.wifi:get)\` — **Run** (registers receiver).
2. Tab A (Inst 1): **send** on the same channel — **Run**.
3. Tab B: switch back — output should show both \`initialised\` and \`changed\` for \`.wifi:get\`.

The sender never sees its own packet on \`:get\` (by design). See [network.md](network.md).

---

## Panels

| Panel | Purpose |
|-------|---------|
| **Output** | Text from \`show\`, \`peek\`, \`probe\`, errors — per instance when switching tabs |
| **Timeline** | Waveform trace from \`watch()\` — enable via **Win → Timeline** |
| **Network Traffic** | Log of every \`send\` on \`comp [network]\` — **Win → Network Traffic** (see [network-traffic-panel.md](network-traffic-panel.md)) |
| **Variables** | Live wire / component values after **Run** |
| **AST** | Parsed program structure |

The **Timeline** sits above **Output**. Use **Pause** to inspect history; **Live** to follow new events.

---

## Network Traffic panel

**Win → Network Traffic** shows a global log of every \`send\` on \`comp [network]\` (all Inst slots). Columns, filters, Pause/Live, pagination, row flash, and packet ids are documented in **[network-traffic-panel.md](network-traffic-panel.md)**.

---

## Quick reference

| Control | Action |
|---------|--------|
| **Run** | Full execute; applies current Inst slot and Wave / Legacy mode |
| **Stop** | End simulation on this tab; freeze panels; release Inst slot |
| **Inst: N** | Instance slot (1–5) for the next Run on this tab |
| **Next** | \`NEXT(~)\` on last Run’s interpreter (requires active run) |
| **wave / legacy** | Select propagation for next Run (orange = wave, green = legacy) |

---

## Related documentation

- [Documentation viewer](doc-viewer.md) — **Doc** button, search, runnable examples
- [Debug output](debug.md) — \`show\`, \`peek\`, \`probe\`, **\`watch\`** (Timeline)
- [Meta constants](meta-constants.md) — \`/instance/\`
- [Network](network.md) — packets between instances
- [Network Traffic panel](network-traffic-panel.md) — send log UI
- [Signal propagation](signal-propagation.md) — Wave vs Legacy behaviour
- [REG](reg.md) — registers and \`NEXT\`
- [Interactive components](interactive-components.md) — panel inputs and wire updates
`,
    'future-component-ideas.md': `# Future component ideas — LogTScript

Brainstorming catalog for possible components or extensions, based on what the simulator already supports and lessons from the mini-CPU demo. **No** implementation order, estimates, or technical design — pick ideas one at a time when you decide.

Each table is followed by numbered subsections (A1, B2, …) with a short explanation of **what it does** and **how it could be used** in this simulator.

---

## Short context (what exists today)

**\`comp\` components:** switch, key, dip, rotary, led, bar, 7seg, 14seg, lcd, dots, adder, subtract, multiplier, divider, shifter, counter, mem, lut, reg, osc.

**\`inline\` (language):** asm, lut, protocol — see [asm.md](asm.md), [lut.md](lut.md), [protocol.md](protocol.md).

**Built-ins (no panel):** logic, REG, arithmetic, MUX/DEMUX, bit selection (\`HIGH\`, \`BITINDEX\`, \`ONEHOT\`, …), bit analysis (\`PARITY\`, \`BITSIZE\`, …), bit transform (\`LSHIFT\`, \`LROTATE\`, …) — see [builtin-functions.md](builtin-functions.md).

**Composites:** chip, board (recommended), pcb (legacy).

**Mini-CPU note:** many circuits are already possible with chip + board; most ideas below are **ready-made building blocks** or **teaching clarity**, not capabilities that are impossible today.

---

## A. Digital logic and teaching CPU

| Idea | Summary |
|------|---------|
| **Opcode ALU** (\`alu\`) | One block for ADD/SUB/AND… selected by a few bits, instead of a hand-wired ALU chip |
| **Comparator / flags** (\`cmp\`, \`flags\`) | Zero, carry, less-than, etc. for CPU branches |
| **Decoder** (\`decoder\`) | N inputs → 2^N one-hot outputs, for instruction decode |
| **Read-only ROM** (\`rom\` or mem readonly) | Same as mem semantically, but ROM (no writes) |
| **Dual-port RAM** (\`dpram\`) | Simultaneous read from two addresses/ports (fetch + data, pipeline) |
| **Combinational barrel shifter** | Instant logical/arithmetic shift by N bits (unlike the current sequential shifter) |
| **Stack** (\`stack\`) | **done** — \`comp [stack]\` / \`[lifo]\` |
| **Instruction register** (\`ir\`) | “Ready-made” instruction register (opcode + operand) |

### A1. Opcode ALU (\`alu\`)

**What it does:** A single arithmetic/logic unit with operands \`a\`, \`b\`, an \`op\` selector (2–4 bits), and outputs such as \`result\`, \`carry\`, and optionally \`zero\`. One pulse or property block selects the operation (ADD, SUB, AND, OR, …) and produces the result.

**How I see it used:** Replace the hand-wired \`chip +[alu4]\` in the mini-CPU (adder + subtract + MUX on \`op.1\`) with one instance \`.alu:\` in a board. Students wire \`acc\` and operand into \`a\`/\`b\`, opcode bits into \`op\`, and read \`result\` back into the accumulator. Natural next step after the teaching CPU demo — same behaviour, less boilerplate, room to add AND/OR/shift later without growing the chip.

**Today:** Fully doable in a \`chip\` with \`comp [adder]\`, \`comp [subtract]\`, and \`MUX()\`. A dedicated \`comp [alu]\` would not add new engine capability, only a packaged teaching block.

---

### A2. Comparator / flags (\`cmp\`, \`flags\`)

**What it does:** Compares two N-bit values and exposes flag bits: \`zero\` (result = 0), \`carry\`/\`borrow\`, \`less\`, \`equal\`, sometimes \`overflow\`. A separate \`flags\` register could latch these on each ALU cycle for conditional branches.

**How I see it used:** Extend the mini-CPU ISA with \`BEQ\`, \`BNE\`, \`BLT\` — after SUB or CMP, branch if \`zero\` or \`less\` is set. In scripts: \`probe(.flags:zero)\` after each step to show why a jump did or did not happen. Pedagogically bridges “ALU does math” and “CPU makes decisions”.

**Today:** \`EQ(a, b)\` is a 1-bit built-in; carry comes from \`comp [adder]:carry\`. Flags require several wires and MUX/EQ glue. A \`cmp\` or \`flags\` comp would collect that into one probe-friendly device.

---

### A3. Decoder (\`decoder\`)

**What it does:** Takes an N-bit binary input and drives exactly one of 2^N outputs high (one-hot). Example: opcode \`0011\` → only output line 3 is \`1\`, all others \`0\`.

**How I see it used:** Instruction decode in a CPU — instead of four separate \`EQ(opc, 0001)\`, \`EQ(opc, 0010)\`, … wires, one \`.dec:\` turns opcode into enable lines for LOAD, STORE, ADDI, JMP. Also useful for 3-to-8 memory bank select, or enabling one of several peripherals on a shared bus.

**Today:** Built from \`EQ\` + AND wiring, or a small LUT pattern. A \`decoder\` comp is convenience and a standard digital-logic teaching block.

---

### A4. Read-only ROM (\`rom\` or mem readonly)

**What it does:** Memory that can be read by address but **cannot** be written at runtime (or writes are ignored / error). Program bytes live here; accidental \`STORE\` into program space is impossible.

**How I see it used:** Harvard teaching CPU with one memory type that is clearly “program” — \`.rom:\` with \`= ^10334221\` init, fetch via \`.rom:{ adr = pc }\` and \`.rom:get\`, no write pins in student-facing docs. Clearer story than \`comp [mem] .prog\` where the same component also supports writes.

**Today:** \`comp [mem] .prog\` works; you simply never send \`write = 1\`. ROM is semantic clarity and possibly simpler API (no write properties in \`doc()\`).

---

### A5. Dual-port RAM (\`dpram\`)

**What it does:** One physical memory array with **two independent ports**. Each port has its own address (and read/write controls). In the same clock step, port A can read address 0 while port B reads or writes address 5.

**How I see it used:** **Von Neumann** CPU — program and data in the **same** RAM: port A fetches instruction at \`PC\`, port B loads/stores operand in the same cycle. Also DMA-style demos (CPU uses port A while “peripheral” uses port B) or dual readers of a shared lookup table.

**Today:** Mini-CPU avoids this with **two** \`mem\` instances (Harvard). Single \`mem\` requires sequential access (fetch step, then data step). \`dpram\` is the hardware pattern for one RAM, two simultaneous accesses.

---

### A6. Combinational barrel shifter

**What it does:** Given a value and a shift amount (or fixed shift), outputs the value shifted left or right **in one combinational step** — all bits move at once, like \`LSHIFT\`/\`RSHIFT\` built-ins.

**How I see it used:** ALU operations \`SLL\`, \`SRL\`, \`SRA\` in a teaching CPU; fast multiply-by-powers-of-2; bit-field extract. Pair with opcode ALU as the “shift” datapath.

**Today:** \`LSHIFT\`/\`RSHIFT\` as functions are combinational; \`comp [shifter]\` is a **sequential shift register** (one bit per pulse). The gap is a device that matches “shift by N in one cycle”, either as built-in only or as \`comp [barrel]\`.

---

### A7. Stack (\`stack\`) — **implemented**

Implemented as \`comp [stack]\` / \`comp [lifo]\` — see [stack.md](stack.md). Push/pop/clear via property blocks; pouts \`top\`, \`get\`, \`size\`, \`capacity\`, \`free\`, \`empty\`, \`full\`.

---

### A8. Instruction register (\`ir\`)

**What it does:** A register specialised for holding the current instruction word, often with convenient slices: full \`ir\`, \`opcode\` (high nibble), \`operand\` (low nibble), maybe \`valid\` after fetch.

**How I see it used:** CPU cycle narrative: fetch → \`ir\` updates → decode reads \`ir:opcode\` → execute uses \`ir:operand\`. Cleaner than anonymous \`8wire instr\` in the board body; \`probe(.cpu:ir)\` already exists on the mini-CPU as a pout — an \`ir\` comp would standardise that inside the design.

**Today:** \`comp [reg]\` or \`REG()\` plus slice expressions \`instr.0/4\` / \`instr.4/4\`. An \`ir\` comp is naming and slice helpers, not new state machinery.

---

## B. Combinational devices as \`comp\` (pedagogy)

Already exist as built-in functions; as **components** they would show up uniformly in docs, panel, and probe.

| Idea | Summary |
|------|---------|
| **MUX / DEMUX** | Multiplexer/demultiplexer as a visual device |
| **LUT / lookup table** | Small address → value table without explicit logic — **done** |
| **Priority encoder** | For IRQ, keyboard scan, simple arbiter |
| **Tristate / bus buffer** | Shared bus, enable/disable output |
| **Latch / D-FF as comp** | Clear level-trigger vs edge (alongside REG and reg) |
| **Clock divider** | Frequency divider from oscillator |
| **Ripple-carry chain** | More bits in one block (alongside existing adder) |

### B1. MUX / DEMUX

**What it does:** **MUX** — N data inputs + selector → one output carries the selected input. **DEMUX** — one data input + selector → data appears on one of N outputs, others are \`0\`.

**How I see it used:** ALU output select (add vs sub), building buses, routing one RAM output to PC or ACC. In the panel as \`.mux_sel:\` with pins \`d0\`, \`d1\`, \`sel\`, \`y\` so beginners see the chip shape, not only \`MUX(sel, a, b)\` in code.

**Today:** \`MUX\` and \`DEMUX\` are built-ins; mini-CPU uses \`MUX()\` inline. As \`comp\`, same logic, plus \`probe(.mux:y)\`, property blocks, and consistency with \`comp [adder]\`.

---

### B2. LUT / lookup table — done

**What it does:** Fixed table: address in (e.g. 4 bits) → value out (e.g. 8 bits) **combinational**, no clocked read cycle. Every address maps to a preloaded word.

**How I see it used:** Opcode → control signals (one LUT replaces many \`EQ\` lines); hex digit → 7-segment pattern; microcode ROM; small math tables (square, sine quantized). Teaching “FPGA uses LUTs to implement any truth table”.

**Done:** [lut.md](lut.md) — \`inline [lut] .name:\` with \`.name(in = addr)\` / \`.name(0011)\`; \`comp [lut]\` for pin wiring and \`probe\`.

---

### B3. Priority encoder

**What it does:** Opposite of decoder in spirit: several input lines (e.g. “request” bits), outputs the **index** of the highest-priority line that is \`1\`, plus sometimes a \`valid\` flag if any input is active.

**How I see it used:** Simple interrupt arbitration (which device gets service); keyboard matrix scan (which key pressed); first-one-wins bus grant. Pairs naturally with a future IRQ controller idea (section D).

**Today:** Chain of MUX and priority logic in a \`chip\`, or manual comparison. No built-in; moderate teaching value for systems topics.

---

### B4. Tristate / bus buffer — **implemented in engine (\`MODE ZSTATE\`)**

**What it does:** Output drivers that can be **high**, **low**, or **high-impedance (off)** when \`enable\` is false. Lets multiple sources share one bus wire without fighting — only one enabled at a time (or resolve conflicts as \`X\` when more than one drives).

**How I see it used:** Shared data bus between CPU, RAM, and I/O; teaching why you cannot tie two outputs together without control.

**Shipped design (2025):** No separate \`comp [bus]\` / \`comp [buffer]\`. Use **\`MODE ZSTATE\`** with \`get>=\` / \`out>=\`, enable gating (\`set = en\`), and built-in **\`ZRELEASE(wire)\`** for explicit release. Requires **wave** propagation.

**Docs:** [zstate.md](zstate.md) — plan: [tristate_bus_buffer.plan.md](../../.cursor/plans/tristate_bus_buffer.plan.md)

---

### B5. Latch / D-FF as comp

**What it does:** **Latch** — transparent while enable is high, holds when low (level-sensitive). **D flip-flop** — captures input on clock edge (edge-sensitive). Distinct from \`REG()\` falling-edge behaviour and from \`comp [reg]\` property-block style.

**How I see it used:** Teach difference between latch vs flip-flop vs \`REG\`; simple state machines; bus hold registers. Side-by-side labs: same \`data\`/\`clk\`, compare \`LATCH\`, \`REG\`, \`comp [reg]\`.

**Today:** \`LATCH(data, clock)\` built-in; \`REG(data, clk, clr)\`; \`comp [reg]\` with \`set\`/\`data\`. A dedicated \`comp [dff]\` would be documentation and panel clarity, not new theory.

---

### B6. Clock divider

**What it does:** Takes a clock input and produces an output clock with frequency divided by N (toggle output every N input edges, typically powers of 2).

**How I see it used:** One fast \`osc\` feeds the system; \`÷2\` → CPU step, \`÷8\` → visible 7seg update, \`÷64\` → LED heartbeat — all derived from the same master clock. UART bit timing (“emit one bit every 16 ticks”). Teaches synchronous design without three separate oscillators.

**Today:** Set different \`freq\` on multiple \`osc\` instances, or \`counter\` + \`EQ\` to synthesise a slow pulse. A \`clkdiv\` comp with \`ratio: 8\` is shorter and matches textbook diagrams.

---

### B7. Ripple-carry chain

**What it does:** A multi-bit adder built as a chain of full adders (carry ripples LSB → MSB), exposed as one wide \`comp\` — or explicitly as a **teaching** view of ripple delay (optional wave semantics).

**How I see it used:** Contrast with \`comp [adder]\` (already N-bit); optionally show carry propagation across bits in slow motion for pedagogy. Less about missing width (adder already has \`depth\`) and more about **named pattern** “this is how hardware adds”.

**Today:** \`comp [adder]\` with \`depth: 8\` already adds 8 bits; \`ADD()\` is instant. Ripple-carry as comp matters only if you want staged/delayed carry for animation or exam-style diagrams.

---

## C. I/O and interactive panel

| Idea | Summary |
|------|---------|
| **Slider** | Adjustable N-bit value without one DIP per bit |
| **Button matrix** | Key grid (e.g. 4×4) |
| **GPIO port** | DIP + LED block (input/output port) |
| **UART / serial** | Teaching serial communication (bit by bit) |
| **Buzzer / tone** | Audio feedback on events |
| **Text terminal** | Text “console” beyond simple LCD | **done** — [terminal.md](terminal.md) |

### C1. Slider — **implemented**

**What it does:** Panel control (drag or click track) that outputs an N-bit binary value in steps \`0 … 2^length − 1\` — one widget instead of N toggle bits.

**How I see it used:** Set operand A for ALU demos; simulate threshold or speed. Friendlier than \`comp [dip]\` with \`length: 8\` for quick labs.

**Docs:** [slider.md](slider.md) — plan: [componenta_slider.plan.md](../../.cursor/plans/componenta_slider.plan.md)

---

### C2. Button matrix

**What it does:** A grid of keys (e.g. 4×4) scanned by row/column logic, outputting key code or row/col wires when a key is pressed.

**How I see it used:** Calculator keyboard; game input; scan demo with \`priority encoder\` (B3). Shows matrix wiring + debounce + encode in one panel widget.

**Today:** Many separate \`comp [key]\` instances — works but clutters the panel. Matrix is one component + optional scan logic in board.

---

### C3. GPIO port

**What it does:** A fixed bundle — e.g. 8 input bits (DIP or switches) and 8 output bits (LEDs) — named as one port \`P0\`, like a microcontroller GPIO register.

**How I see it used:** “Write \`0b10101010\` to port B, read switches from port A” without eight separate declarations. Microcontroller-style labs on the teaching CPU (OUT / IN instructions).

**Today:** Eight \`dip\` + eight \`led\` comps. GPIO is grouping and naming for cleaner scripts and docs. **Implemented** as \`comp [ioport]\` — see [ioport.md](ioport.md).

---

### C4. UART / serial

**What it does:** Asynchronous serial: start bit, data bits, stop bit; \`tx\` shifts out on clock edges, \`rx\` samples incoming line. Often 8N1 at a configurable baud derived from a clock divider.

**How I see it used:** Send ACC value to a “serial monitor” in the UI; two boards talk over one wire; link CPU to text terminal (C6). Classic embedded lesson after GPIO.

**Today:** Could hack with \`comp [shifter]\` + \`osc\` + property blocks — heavy. UART comp packages the protocol state machine and UI.

---

### C5. Buzzer / tone

**What it does:** Audio output — beep on edge, square wave at frequency, or short tone when a wire goes high.

**How I see it used:** Alarm when ACC overflows; key click feedback; “HALT” beep. Low teaching value for CPU logic, nice for engagement and event-driven demos.

**Today:** No audio output component; browser Web Audio from a comp callback would be new UI/engine work.

---

### C6. Text terminal — done

**What it does:** Scrollable text area: append characters or lines when written to a port; optional line numbers and word wrap — richer than fixed \`comp [lcd]\` rows.

**How I see it used:** \`PRINT\` instruction on teaching CPU; serial RX shows incoming bytes as ASCII; shell demo.

**Done:** [terminal.md](terminal.md) — \`comp [terminal]\` with \`append\`, \`newline\`, \`clear\`, scroll, and devices-panel display.

---

## D. Advanced (higher effort, more specialized benefit)

| Idea | Summary |
|------|---------|
| **FIFO / queue** | **done** — \`comp [queue]\` / \`[fifo]\` |
| **Timer / watchdog** | Timeout, periodic reset |
| **Interrupt controller** | Event / IRQ model |
| **DMA / bus arbiter** | Master/slave on shared bus |
| **EEPROM / persistence** | State that survives page reload |

### D1. Queue (\`queue\`) — **implemented**

Implemented as \`comp [queue]\` / \`comp [fifo]\` — see [queue.md](queue.md). Ring-buffer FIFO with \`push\`/\`pop\`/\`clear\`, flags \`empty\`/\`full\`, and \`size\`/\`capacity\`/\`free\`.

---

### D2. Timer / watchdog

**What it does:** **Timer** — count down or up from load value, pulse or IRQ at zero. **Watchdog** — reset system if not “kicked” within N ms.

**How I see it used:** Blink LED every second without free-running \`osc\` on every wire; round-robin OS tick; reliability demo (“pet the watchdog”). Links to clock divider and IRQ ideas.

**Today:** \`comp [osc]\` + \`comp [counter]\` can approximate; dedicated timer with load/reload is clearer for embedded curricula.

---

### D3. Interrupt controller

**What it does:** Collects interrupt requests from devices, masks, prioritises, and asserts one \`irq\` line to CPU with vector number or priority encoder output.

**How I see it used:** CPU runs main loop; key press or UART byte sets IRQ; CPU jumps to handler. Requires CPU ISA support (\`RETI\`, interrupt enable) and engine event model beyond wires.

**Today:** Fully polling only (read key in loop). IRQ is a step toward real embedded behaviour; pairs with B3 priority encoder and D1 FIFO.

---

### D4. DMA / bus arbiter

**What it does:** **DMA** — moves block from RAM to I/O (or reverse) without CPU per-byte loops. **Arbiter** — grants bus to one master when CPU and DMA both want RAM.

**How I see it used:** Advanced lab after von Neumann + \`dpram\`: “sound blitter” copies table to GPIO while CPU sleeps. Shows bus contention and grant signals.

**Today:** CPU must move every byte in software. High complexity; teaching value mainly for computer architecture courses.

---

### D5. EEPROM / persistence

**What it does:** Non-volatile storage: RAM contents or config survive browser reload (localStorage, IndexedDB, or file export).

**How I see it used:** Save student’s program RAM between sessions; high-score table; “flash” after WRITE command. Distinct from ROM (read-mostly) — rare writes, persistent.

**Today:** All state is in-memory for the session. Persistence is cross-cutting (UI + storage API), not just a comp property block.

---

## E. Not components, but related direction

| Idea | Summary |
|------|---------|
| **Assembler / program loader** | Language feature, not a panel device — **done** |
| **Logic analyzer / timeline** | Wire visualization over time (mostly UI/debug) |

### E1. Assembler / program loader — done

**What it does:** Tool or language syntax that turns mnemonics (\`LOAD 0\`, \`ADDI 3\`) into \`= ^hex\` ROM init or \`.mem =\` blobs — optionally labels, branches, listing file.

**How I see it used:** Students write assembly in editor tab; Run loads words into \`.prog\` mem. Avoids hand-encoding \`10334221\`. Could be preprocessor, separate panel, or \`asm { ... }\` block.

**Done:** [asm.md](asm.md) — \`inline [asm] .myisa:\` + \`.myisa { … }\`; load into \`comp [mem]\` with \`= .myisa { … }\` or \`.prog = .myisa { … }\`. See also [mem.md](mem.md).

---

### E2. Logic analyzer / timeline — done (editor)

**What it does:** UI that plots selected signals vs time — vertical logic trace in the **Timeline** panel, driven by \`watch()\` in the script.

**How I see it used:** Debug counter bits on an \`osc\`, compare gated vs ungated wires, scroll history while paused. Complements \`probe\` (text log in Output).

**Done:** [debug.md](debug.md) — \`watch()\` section; panel in \`script_editor_v0_3_2.html\` (**Panels → Timeline**). Supports multi-bit wire expansion (\`watch(o)\` → \`o.0\`…), bit ranges (\`watch(o.1-3)\`), and component properties (\`watch(.o:counter)\`). Editor-only; not in \`run_tests.html\`.

---

## F. What you can already do without a new component

From mini-CPU and existing docs — useful when an idea above seems “already covered”:

- IR, bus, decoder → **chip** + MUX + wires
- Stack → second **counter** + **mem**
- Program in ROM → \`= ^hex\` init on **mem**, or mnemonics via **asm** ([asm.md](asm.md))
- Opcode / digit lookup → **lut** ([lut.md](lut.md))
- Clock / step → **key**, **osc**, **switch**, **NEXT(~)**

---

## Rough prioritization (not a roadmap)

Subjective **teaching value** vs **estimated complexity** — for comparison only.

| Idea | Teaching value | Complexity |
|------|----------------|------------|
| Opcode ALU | high | medium |
| Comparator / flags | high | low–medium |
| Decoder | high | low |
| Read-only ROM | medium | low |
| Barrel shifter | medium–high | medium |
| Stack | medium | medium |
| Dual-port RAM | high | high |
| MUX as comp | low–medium | low |
| Slider / GPIO | low–medium | low–medium |
| UART serial | medium | high |
| FIFO | medium | high |
| IRQ / DMA | medium (advanced) | very high |

**Natural direction groups** (mix as you like):

1. **Teaching CPU v2** — ALU, flags, decoder, stack, ROM
2. **More combinational \`comp\`** — MUX, buffer, latch (LUT: done — [lut.md](lut.md))
3. **I/O and interfaces** — UART, slider, GPIO, terminal
4. **Infrastructure** — dual-port mem, FIFO, timer

---

## Related docs

- [Component index](components.md)
- [asm](asm.md) · [lut](lut.md)
- [Mini CPU demo](mini-cpu.md)
- [Mini CPU feasibility plan](mini-cpu-plan.md)
`,
    'huffman.md': `# Huffman coding walkthrough

End-to-end example that ties together three v0_3_2 features:

| Piece | Inline type | Role |
|-------|-------------|------|
| \`.huff\` | [lut](lut.md) | Prefix-free codeword table (\`prefixFree\` + \`variableDepth\`) |
| \`.huffPacket\` | [protocol](protocol.md) | Encode tokens → length-prefixed bit packet |
| \`.huffRecover\` | [protocol](protocol.md) | Decode packet → original tokens |

The goal is **variable-length compression**: frequent symbols get shorter codewords, rare symbols longer ones. The LUT holds the codebook; the protocols frame the compressed bit stream so it can be stored or transmitted and recovered later.

This page explains **why** each part exists, **what** it does at invoke time, and **how** the bits move through encode and decode.

---

## Why Huffman-style coding here?

Fixed-width fields (e.g. UART \`data 8b\`) waste bits when symbol frequencies are uneven. A classic Huffman code assigns shorter bit patterns to more common symbols, as long as no codeword is a prefix of another — otherwise a decoder could not tell where one symbol ends and the next begins.

In logTscript:

- **\`prefixFree\`** on a LUT enforces that property at parse time.
- **\`variableDepth\`** allows codewords of different lengths in \`data { }\`.
- **\`expand\`** maps a stream of fixed-width **keys** → concatenated **codewords** (encode).
- **\`collapse\`** maps a concatenated codeword stream → keys (decode); with \`prefixFree\`, decoding is **greedy** left-to-right prefix matching.
- **\`lengthOf(encoded)\`** + **\`withLength\`** wrap the variable-length payload in a known-length prefix so the receiver knows how many bits to decode.

\`:decode()\` on a protocol channel is **not** extended to these generators. Recovery is a **separate protocol** (\`.huffRecover\`), not a magic reverse of \`.huffPacket\`.

---

## The codebook — \`inline [lut] .huff\`

Four 2-bit **keys** (addresses \`00\` … \`11\`) map to **variable-length codewords**:

| Key (addr) | Codeword | Length |
|------------|----------|--------|
| \`00\` | \`0\` | 1 bit |
| \`01\` | \`10\` | 2 bits |
| \`10\` | \`110\` | 3 bits |
| \`11\` | \`111\` | 3 bits |

\`\`\`logts
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :
\`\`\`

### \`prefixFree\`

At parse time every value is checked: no codeword may be a strict prefix of another (\`0\` vs \`01\` would fail). See [lut.md — prefixFree](lut.md#prefixfree).

### Lookup (encode direction)

\`.huff(in = key)\` or \`.huff(01)\` returns the codeword for that key — same as any inline LUT invoke:

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

2wire y = .huff(01)
show(y)
\`\`\`

→ **\`10\`**

---

## Encoding — \`inline [protocol] .huffPacket\`

The encoder takes a **token stream** (concatenated keys, \`keyWidth\` bits each) and produces one output channel: a **packet** = length prefix + compressed payload.

\`\`\`logts
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
\`\`\`

### Step by step at invoke

1. **\`expand(tokens, .huff, 2b)\`** (inside def \`encoded\`):
   - Split \`tokens\` into consecutive 2-bit chunks.
   - For each chunk, treat it as a binary address into \`.huff\`.
   - Append the LUT value (codeword) to the output bit string.

2. **\`lengthOf(encoded) 8b\`**:
   - Evaluate def \`encoded\` once (cached — bits are not emitted twice).
   - Emit the **bit length** of the compressed stream as an unsigned integer on 8 bits (left-padded).

3. **\`encoded\`** (local def reference):
   - Emit the compressed codeword stream immediately after the length field.

### Runnable — encode only

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

4wire source = 0001
11wire packet = .huffPacket { tokens = source }

show(source)
show(packet)
\`\`\`

---

## Packet layout

For \`tokens = 0001\` the packet is **\`00000011010\`** (11 bits total):

\`\`\`text
┌────────────────┬─────────┐
│ length (8 bit) │ payload │
│  00000011 = 3  │   010   │
└────────────────┴─────────┘
\`\`\`

### How \`0001\` becomes payload \`010\`

| Token chunk | Key | LUT codeword |
|-------------|-----|--------------|
| \`00\` | addr 0 | \`0\` |
| \`01\` | addr 1 | \`10\` |

Concatenated payload: **\`0\` + \`10\` = \`010\`** (3 bits) → length field = **\`00000011\`**.

Compare with raw tokens: 4 bits in, 3 bits out for this example — compression depends on the symbol mix and codebook.

---

## Decoding — \`inline [protocol] .huffRecover\`

The decoder is a **separate protocol**. It does not call \`:decode()\` on \`.huffPacket\`.

\`\`\`logts
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
\`\`\`

### Step by step at invoke

1. **\`withLength(data, 8b)\`**:
   - Read the first 8 bits of \`data\` as unsigned length \`L\`.
   - Return the next \`L\` bits as the **payload** (compressed stream).
   - Remaining bits in \`data\` are ignored.

2. **\`collapse(payload, .huff, 2b)\`**:
   - Walk the payload left to right.
   - At each position, find the **longest** LUT value that matches the upcoming bits (greedy; valid because codewords are prefix-free).
   - Emit the matching **key** as \`keyWidth\` bits.
   - Repeat until the payload is consumed.

### Runnable — decode only

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :

11wire packet = 00000011010
4wire recovered = .huffRecover { data = packet }

show(packet)
show(recovered)
\`\`\`

→ recovered **\`0001\`**

### Greedy decode trace for payload \`010\`

| Position | Bits left | Match codeword | Key emitted |
|----------|-----------|----------------|-------------|
| 0 | \`010\` | \`0\` (addr \`00\`) | \`00\` |
| 1 | \`10\` | \`10\` (addr \`01\`) | \`01\` |

Result keys: **\`0001\`**

---

## Runnable — full round-trip

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :

4wire source = 0001
11wire packet = .huffPacket { tokens = source }
4wire recovered = .huffRecover { data = packet }

show(source)
show(packet)
show(recovered)
\`\`\`

| Wire | Value | Meaning |
|------|-------|---------|
| \`source\` | \`0001\` | Original 2-bit keys × 2 |
| \`packet\` | \`00000011010\` | 8-bit length + 3-bit payload |
| \`recovered\` | \`0001\` | Matches \`source\` |

### Runnable — longer input, padded packet wire (\`=:\`)

A dynamic encoder may produce fewer bits than the wire you assign to. **\`=:\`** right-pads the protocol output to the declared width. The decoder only reads the length prefix and the declared payload length — **trailing pad bits are ignored**, so recovery still matches \`source\`.

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :

8wire source = 00011011
24wire packet =: .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }

show(source)
show(packet)
show(recovered)
\`\`\`

Four 2-bit tokens (\`00\`, \`01\`, \`10\`, \`11\`) compress to a **9-bit** payload:

| Token | Codeword |
|-------|----------|
| \`00\` | \`0\` |
| \`01\` | \`10\` |
| \`10\` | \`110\` |
| \`11\` | \`111\` |

Payload = **\`01101101111\`**; length field = **\`00001001\`** (9). The encoder emits **17 bits** total.

\`24wire packet =:\` stores those 17 bits and **right-pads** with seven \`0\` bits to fill the wire. \`.huffRecover\` calls \`withLength(data, 8b)\`, reads length **9**, takes the next **9** bits as the codeword stream, and never consults the padding — so \`recovered\` is again **\`00011011\`**.

See [assignment-operators.md — \`=:\`](assignment-operators.md#-right-pad-assignment) for pad semantics on wire assignment.

---

## \`length(tokens)\` vs \`lengthOf(encoded)\`

On the same invoke, the **token** bit count and the **compressed** bit count usually differ:

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .cmp:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    length(tokens) 8b
    lengthOf(encoded) 8b
  :

8wire tokenLen,
8wire encodedLen
= .cmp { tokens = 0001 }

show(tokenLen)
show(encodedLen)
\`\`\`

| Field | Value | Meaning |
|-------|-------|---------|
| \`tokenLen\` | \`00000100\` | 4 bits of input tokens |
| \`encodedLen\` | \`00000011\` | 3 bits of compressed payload |

\`length(param)\` measures the invoke argument; \`lengthOf(def)\` measures evaluated protocol output. Details: [protocol.md — length / lengthOf](protocol.md#lengthparam-nb-and-lengthofdef-nb).

---

## Dynamic width

\`.huffPacket\` is classified as **dynamic** width: output size depends on token length and the codebook. \`.huffRecover\` output width depends on the decoded key count inside the payload.

\`doc(.huffPacket)\` shows \`width: dynamic\`. Assign to a wire wide enough for the largest expected packet, or use runtime width checking with \`=\`.

See [protocol.md — static vs dynamic width](protocol.md#static-vs-dynamic-width-inferprotocolwidth).

---

## Design notes

| Topic | Detail |
|-------|--------|
| **Key width** | \`2b\` matches the address width of a 4-entry table. \`expand\` / \`collapse\` require the token stream length to be a multiple of \`keyWidth\`. |
| **Length field width** | \`8b\` allows payloads up to 255 bits. Use \`16b\` for larger frames ([\`withLength\`](protocol.md#withlengthdata-nb)). |
| **Separate protocols** | Encoder and decoder are independent definitions — swap codebooks or framing without changing the other side's structure. |
| **Not in scope** | \`checksum()\`, \`concat()\`, \`padLeft()\`, \`padRight()\` — add framing or integrity in user logic if needed. |
| **Tests** | Suite IDs 1069–1074 (LUT), 1078–1086 (protocol round-trip). |

---

## Related

- [lut.md](lut.md) — \`variableDepth\`, \`prefixFree\`, LUT invoke
- [protocol.md](protocol.md) — \`def\`, \`expand\`, \`collapse\`, \`length\`, \`lengthOf\`, \`withLength\`
- [assignment-operators.md](assignment-operators.md) — \`=\`, \`=:\`, \`:=\` for dynamic-width wires
`,
    'interactive-components.md': `# Interactive components

Per-component pages: [switch.md](switch.md), [key.md](key.md), [keyboard.md](keyboard.md), [dip.md](dip.md), [rotary.md](rotary.md), [slider.md](slider.md), [clcd.md](clcd.md). Full catalog: [components.md](components.md).

**Switch**, **key**, **keyboard**, **dip**, **rotary**, and **slider** are input components you control from the devices panel while the program is running.

See [signal-propagation.md](signal-propagation.md) for how those updates spread through your circuit.

The **oscillator** (\`osc\`) also drives wires in real time, but it is **not** a panel control — it runs on its own timer. See [oscillator.md](oscillator.md).

---

## Panel callbacks (press vs toggle)

Inside the engine, each panel control uses a small callback when you interact with it. You do not write these callbacks in LogTScript; they are wired up when the component is created.

| Component | UI callback | When it runs |
|-----------|-------------|--------------|
| \`key\` | **\`onPress\`** | Mouse/touch down — output becomes \`1\` (or toggles when \`type: 2\`) |
| \`key\` | **\`onRelease\`** | Mouse/touch up — output returns to \`0\` (\`type: 0\`/\`1\`; no-op for \`type: 2\`) |
| \`keyboard\` | **\`onKey\`** | While focused — emits \`:get\` code + \`:valid\` pulse per accepted key |
| \`clcd\` | **\`onPress\`** / **\`onRelease\`** | When \`touch: 1\`, pointer down/up on a symbol hit box updates \`:out\` per \`touchType\` |
| \`switch\` | \`onChange\` | Each time you toggle the control |
| \`dip\` | \`onChange\` | Each time you flip one DIP position (\`index\`, \`checked\`) |
| \`rotary\` | \`onChange\` | When the selected **state** changes (drag or step the knob) |
| \`slider\` | \`onChange\` | When the scalar **value** changes (drag thumb or click track) |

**\`key\` and \`clcd\` (with \`touch: 1\`) use \`onPress\` / \`onRelease\`.** All other panel inputs above use \`onChange\` (or, for the oscillator, automatic HIGH/LOW transitions — not user clicks).

From your script’s point of view, the effect is the same: wires that read \`.name:get\` (or \`.name\` where supported) are updated through signal propagation after the interaction.

---

## Common pattern

1. Declare the component (always end the declaration with \`:\` or \`::\`).
2. Read its value in wires or property blocks.
3. Run the program — then use the panel to interact; wires stay in sync.

\`\`\`
comp [switch] .enable::

1wire on = .enable:get
1wire off = NOT(on)

show(on, off)
\`\`\`

After **RUN**, \`on\` is \`0\` and \`off\` is \`1\`. Toggle the switch in the panel and both wires change without running the script again.

### Reading values

| Form | Width | Description |
|------|-------|-------------|
| \`.name\` | 1 bit (switch, key) or multi-bit (dip, rotary, slider) | Direct value |
| \`.name:get\` | Same | Explicit read (equivalent for these components) |
| \`.name.N\` | 1 bit | Single bit \`N\` of a **dip** only (leftmost = \`0\`) |

Use a wire width that matches the component: \`1wire\` for switch and key, \`Nwire\` for a dip or slider with \`length: N\`, and \`ceil(log₂(states))\` bits for a rotary with \`states: N\` (e.g. \`states: 8\` → \`3wire\`).

---

## Switch

A **toggle** control: stays \`1\` or \`0\` until you flip it again.

### Syntax

\`\`\`
comp [switch] .name:
  text: 'Label'
  nl
  :
\`\`\`

Minimal form:

\`\`\`
comp [switch] .name::
\`\`\`

### Attributes

| Attribute | Type   | Default | Description |
|-----------|--------|---------|-------------|
| \`text\`    | string | \`''\`    | Label next to the switch |
| \`nl\`      | flag   | (no)    | Newline after the control |

### Output

- **1 bit**: \`0\` (off) or \`1\` (on)
- Starts at \`0\` after **RUN** unless initialized with \`=\`

### Examples

**Enable line**

\`\`\`
comp [switch] .en:
  text: 'Enable'
  nl
  :

1wire enabled = .en:get
\`\`\`

**Driving an LED**

\`\`\`logts-play
comp [switch] .pwr:
  text: 'Power'
  :

comp [led] .on:
  color: ^0f0
  nl
  :

.on = .pwr
\`\`\`

### Notes

- You cannot assign to a switch from code (e.g. \`.en = 1\` is not supported) — it is an input only.
- Use a switch when the value should **stay** until the user toggles it again.

---

## Key

A **momentary button**: \`1\` while pressed, \`0\` when released.

### Syntax

\`\`\`
comp [key] .name:
  label: 'A'
  size: 36
  nl
  :
\`\`\`

Minimal form:

\`\`\`
comp [key] .name::
\`\`\`

### Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| \`label\`   | string  | \`''\`    | Text on the button |
| \`size\`    | integer | \`36\`    | Button size (pixels) |
| \`nl\`      | flag    | (no)    | Newline after the button |
| \`type\`    | integer | \`0\`     | Button style variant |

### Output

- **1 bit**: \`0\` (released) or \`1\` (pressed)

### Examples

**Wire follows the button**

\`\`\`
comp [key] .btn:
  label: 'Go'
  :

1wire pressed = .btn:get
\`\`\`

**Trigger a property block (level-sensitive)**

\`\`\`
comp [key] .btn:
  label: 'A'
  on: 1
  :

comp [led] .out:
  length: 4
  color: ^0f9
  nl
  on: 1
  :

4wire pattern = 1111

.out:{
  value = pattern
  set = .btn
}
\`\`\`

While the button is held (\`set\` is \`1\`), the block runs and the LEDs show \`1111\`. When released, behavior depends on other logic tied to \`set\`.

### Notes

- Use a **key** for short pulses; use a **switch** for a latched on/off state.
- Multiple keys can each have their own \`label\`.

---

## DIP switch

A **group of toggles** on one control — each position is one bit. Width is set by \`length\` (default \`4\`).

### Syntax

\`\`\`
comp [dip] .name:
  length: 4
  text: 'Inputs'
  color: ^2ecc71
  visual: 1
  noLabels
  nl
  :
\`\`\`

Minimal form (4 bits, default styling):

\`\`\`
comp [dip] .name::
\`\`\`

### Attributes

| Attribute   | Type    | Default   | Description |
|-------------|---------|-----------|-------------|
| \`length\`    | integer | \`4\`       | Number of DIP positions (bits) |
| \`text\`      | string  | \`''\`      | Label for the group |
| \`color\`     | hex     | \`#2ecc71\` | Color of the “on” position |
| \`colorFor\`  | array   | —         | Per-position colors |
| \`visual\`    | \`0\`/\`1\` | \`0\`       | \`1\` = show \`0\`/\`1\` on each position |
| \`noLabels\`  | flag    | (no)      | Hide position labels |
| \`noTrans\`   | flag    | —         | Transition animation on/off |
| \`nl\`        | flag    | (no)      | Newline after the control |

### Output

- **N bits** as one binary string, e.g. \`1010\` for \`length: 4\`
- Bit \`0\` is the **leftmost** position
- Starts at all zeros after **RUN** unless initialized with \`=\`

### Reading one bit or the full word

\`\`\`
comp [dip] .d:
  length: 4
  :

4wire all = .d:get
1wire bit0 = .d.0
1wire bit2 = .d.2
\`\`\`

\`all\` might be \`1010\` while \`bit0\` is \`1\` and \`bit2\` is \`0\`.

### Examples

**Two DIP bits as clock and reset**

\`\`\`
comp [dip] .ctrl:
  length: 2
  noLabels
  visual: 1
  :

1wire clk   = .ctrl.0
1wire reset = .ctrl.1
\`\`\`

**4-bit input to an adder**

\`\`\`
comp [dip] .a:
  text: 'A'
  length: 4
  visual: 1
  noLabels
  :4bit

comp [dip] .b:
  text: 'B'
  length: 4
  visual: 1
  noLabels
  nl
  :4bit

comp [adder] .add:
  depth: 4
  :

.add:a = .a
.add:b = .b

4wire sum = .add:get
\`\`\`

### Notes

- Match wire width to \`length\` (\`4wire\` for \`length: 4\`).
- You cannot assign to a DIP from code — change positions in the panel.
- For a single on/off input, a **switch** is simpler; use a **dip** when you need several bits in one place.

---

## Rotary knob

A **rotary selector**: drag vertically on the knob (or use touch) to pick one of several discrete **states**. Each state is a small integer encoded as binary on the output.

### Syntax

\`\`\`
comp [rotary] .name:
  text: 'Select'
  states: 8
  color: ^6dff9c
  for.0: 'A'
  for.1: 'B'
  for.2: 'C'
  nl
  :
\`\`\`

Minimal form (8 states, 3 output bits):

\`\`\`
comp [rotary] .name::
\`\`\`

### Attributes

| Attribute | Type    | Default   | Description |
|-----------|---------|-----------|-------------|
| \`text\`    | string  | \`''\`      | Label next to the knob |
| \`states\`  | integer | \`8\`       | Number of positions (minimum \`2\`) |
| \`color\`   | hex     | \`#6dff9c\` | Accent color on the knob |
| \`for.N\`   | string  | —         | Optional label shown for state \`N\` (\`for.0\`, \`for.1\`, …) |
| \`nl\`      | flag    | (no)      | Newline after the control |

### Output

- **\`ceil(log₂(states))\` bits** — binary index of the current state, left-padded with zeros
- State \`0\` is the first position; state \`states - 1\` is the last
- Examples: \`states: 4\` → \`2wire\`, values \`00\`…\`11\`; \`states: 8\` → \`3wire\`, values \`000\`…\`111\`
- Starts at state \`0\` (all zeros on the output) after **RUN** unless initialized with \`=\`

### Interaction

- **Drag** up/down on the knob to change state; each new state fires \`onChange\` and updates wires
- Unlike a **key**, the value **stays** at the selected state when you release the mouse — similar to a **switch**, but with more than two positions
- You can also drive the knob from logic with a property block: \`set = 1\` and \`data = …\` (see \`doc(comp.rotary)\`)

### Examples

**Wire follows the knob**

\`\`\`
comp [rotary] .sel:
  text: 'Channel'
  states: 4
  for.0: '0'
  for.1: '1'
  for.2: '2'
  for.3: '3'
  :

2wire channel = .sel:get
\`\`\`

**Labeled modes (e.g. calculator operator)**

\`\`\`
comp [rotary] .op:
  text: 'Op'
  states: 4
  for.0: '+'
  for.1: '-'
  for.2: 'x'
  for.3: ':'
  :

2wire op = .op:get
\`\`\`

**MUX driven by rotary position**

\`\`\`
comp [rotary] .rr:
  states: 4
  :

2wire rr = .rr:get
4wire choice = MUX(.rr, default, pathA, pathB, pathC, pathD)
\`\`\`

### Notes

- Match wire width to \`ceil(log₂(states))\`, not to \`states\` itself.
- For exactly two positions, a **switch** is simpler; use **rotary** when you need 3+ named or numbered choices in one control.
- Panel interaction uses \`onChange\`, not \`onPress\` / \`onRelease\`.

---

## Slider (\`comp [slider]\`)

A **slider** outputs a scalar value from \`0\` to \`2^length − 1\` as binary on \`:get\`. Drag the thumb horizontally or vertically, or click the track to jump.

\`\`\`
comp [slider] .name:
  length: 8
  text: 'Op'
  color: ^6dff9c
  orientation: 0
  reversed
  for: ['0','1','2','3']
  nl
  :
\`\`\`

Minimal:

\`\`\`
comp [slider] .name::
\`\`\`

### Attributes

| Attribute | Default | Notes |
|-----------|---------|-------|
| \`length\` | \`4\` | Output width in bits |
| \`text\` | \`''\` | Label (max 5 chars in panel) |
| \`color\` | \`#6dff9c\` | Thumb and value color |
| \`orientation\` | \`0\` | \`0\` horizontal, \`1\` vertical |
| \`reversed\` | off | Swap value mapping at track ends |
| \`size\` | \`10\` | Track length scale \`1…20\` (panel only) |
| \`for\` | — | Per-step labels in panel (else decimal) |
| \`nl\` | off | Newline after control |

### Panel vs debug

The panel shows the **decimal** step (or a \`for\` label). \`show\`, \`peek\`, and \`probe\` still show the **binary** wire value.

### Property block

Drive the slider from logic with \`set\` and \`data\` (see \`doc(comp.slider)\`).

### Example

\`\`\`logts-play
comp [slider] .op:
  length: 4
  text: 'A'
  :

4wire val = .op:get
\`\`\`

### Notes

- Use **slider** for many sequential values; use **dip** for arbitrary bit patterns; use **rotary** when \`states\` is not a power of two.
- Panel interaction uses \`onChange\`.

---

## Comparison

| Component | Bits | User action | Panel callback | Value while idle |
|-----------|------|-------------|----------------|------------------|
| \`switch\`  | 1    | Toggle      | \`onChange\`     | Stays \`0\` or \`1\` |
| \`key\`     | 1    | Press/release (\`type: 0\`/\`1\`) or toggle (\`type: 2\`) | **\`onPress\` / \`onRelease\`** | \`0\` (or latched with \`type: 2\`) |
| \`keyboard\` | 8 | Type while focused | **\`onKey\`** | \`get\` holds last ASCII code; \`valid\` idle \`0\` |
| \`clcd\`    | \`:out\` width | Tap symbols (\`touch: 1\`) | **\`onPress\` / \`onRelease\`** | \`:out\` per \`touchType\` |
| \`dip\`     | N    | Flip each position | \`onChange\` | Holds last pattern |
| \`rotary\`  | \`ceil(log₂(states))\` | Drag / step knob | \`onChange\` | Holds last state |
| \`slider\`  | \`length\` | Drag / click track | \`onChange\` | Holds last value |
| \`osc\`     | 1 (+ counter) | *(automatic timer)* | HIGH/LOW ticks | Oscillates — see [oscillator.md](oscillator.md) |

---

## Component documentation

\`\`\`
doc(comp.switch)
doc(comp.key)
doc(comp.dip)
doc(comp.rotary)
doc(comp.slider)
doc(comp.clcd)
\`\`\`

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires update after UI changes
- [Oscillator](oscillator.md) — real-time \`osc\` (not a panel button, but live wire driver)
- [LED](led.md) — displaying values driven by switches and keys
- [doc() function](doc-function.md) — full \`doc(comp.*)\` listing
`,
    'ioport.md': `# IOPORT

An I/O port groups existing input and output components under a single port name.

IOPORT provides:

* visual grouping
* port naming
* automatic bit aggregation
* automatic bit mapping

It is intended for educational CPU and digital logic systems where devices are accessed through named ports.

Examples:

\`\`\`text
Port A
Port B
P0
P1
\`\`\`

Unlike GPIO hardware, IOPORT does not model:

* pin directions
* tristate outputs
* pullups or pulldowns
* alternate functions

IOPORT is a logical port abstraction built from existing components.

---

## Syntax

\`\`\`logts
comp [ioport] .name:
  in  = .component
  out = .component
  :
\`\`\`

Multiple inputs and outputs are allowed:

\`\`\`logts
comp [ioport] .P0:
  in  = .addr
  in  = .data

  out = .result
  out = .flags
  :
\`\`\`

Member components must be declared **before** the \`ioport\` block. In v1, \`in\` members must be \`comp [dip]\` and \`out\` members must be \`comp [led]\`.

---

## Purpose

Without IOPORT:

\`\`\`logts
16wire addr = .addr:get
8wire data  = .data:get
\`\`\`

\`\`\`logts
.result = resultBits
.flags  = flagBits
\`\`\`

With IOPORT:

\`\`\`logts
24wire inputBus = .P0:in

.P0:out = outputBus
\`\`\`

IOPORT automatically performs the bit mapping.

---

## Input aggregation

All input components are concatenated into a single input bus.

\`\`\`logts
comp [dip] .addr:
  length: 16
  :

comp [dip] .data:
  length: 8
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  :
\`\`\`

Input width: \`16 + 8 = 24\` bits.

\`\`\`logts
24wire packet = .P0:in
\`\`\`

Equivalent to:

\`\`\`logts
24wire packet =
  .addr:get
+ .data:get
\`\`\`

### Runnable — read aggregated input

**Load & Run**, then flip DIP positions in the panel.

\`\`\`logts-play
comp [dip] .addr:
  length: 16
  text: 'Addr'
  visual: 1
  = ^ffff
  :

comp [dip] .data:
  length: 8
  text: 'Data'
  visual: 1
  = ^aa
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  :

24wire packet = .P0:in
show(packet, .P0:in)
\`\`\`

---

## Output aggregation

All output components are concatenated into a single output bus.

\`\`\`logts
comp [led] .result:
  length: 8
  :

comp [led] .flags:
  length: 4
  :

comp [ioport] .P0:
  out = .result
  out = .flags
  :
\`\`\`

Output width: \`8 + 4 = 12\` bits.

\`\`\`logts
12wire value

.P0:out = value
\`\`\`

Equivalent to:

\`\`\`logts
.result = value.0-7
.flags  = value.8-11
\`\`\`

Bit ordering follows the language concatenation rules (declaration order in the \`ioport\` body).

### Runnable — write aggregated output

\`\`\`logts-play
comp [led] .result:
  length: 8
  text: 'Res'
  color: ^0af
  :

comp [led] .flags:
  length: 4
  text: 'Flg'
  color: ^f90
  nl
  :

comp [ioport] .P0:
  out = .result
  out = .flags
  :

.P0:out = 101010101111
show(.P0:out)
\`\`\`

---

## Visual grouping

Components belonging to an IOPORT are rendered inside the IOPORT container on the devices panel.

\`\`\`text
┌─────────────────────────┐
│ .P0                     │
│                         │
│ addr     [16 dip]       │
│ data     [8 dip]        │
│                         │
│ result   [8 led]        │
│ flags    [4 led]        │
└─────────────────────────┘
\`\`\`

---

## Ownership rules

A component may belong to at most one IOPORT.

Valid:

\`\`\`logts
comp [ioport] .P0:
  in = .addr
  out = .led
  :
\`\`\`

Invalid:

\`\`\`logts
comp [ioport] .P0:
  in = .addr
  :

comp [ioport] .P1:
  in = .addr
  :
\`\`\`

Error:

\`\`\`text
Component '.addr' already belongs to ioport '.P0'
\`\`\`

---

## Debug — \`show\`, \`peek\`, \`probe\`

IOPORT exposes aggregated buses as component properties \`:in\` and \`:out\`. They work with [debug.md](debug.md) helpers.

### Runnable — input bus

\`\`\`logts-play
comp [dip] .sw:
  length: 4
  visual: 1
  = 1010
  :

comp [ioport] .P0:
  in = .sw
  :

4wire bus = .P0:in

show(bus, .P0:in)
peek(.P0:in)
probe(.P0:in)
\`\`\`

After **RUN**, flip DIP switches — \`bus\` and probe update on Wave when propagation settles.

### Runnable — input bus (Wave)

\`\`\`logts-play wave
comp [dip] .sw:
  length: 4
  visual: 1
  :

comp [ioport] .P0:
  in = .sw
  :

4wire bus = .P0:in
probe(.P0:in)
\`\`\`

Flip switches after **RUN** — probe reports \`changed\`.

### Runnable — output bus

\`\`\`logts-play
comp [led] .led:
  length: 4
  color: ^0f9
  :

comp [ioport] .P0:
  out = .led
  :

.P0:out = 1100
show(.P0:out)
peek(.P0:out)
probe(.P0:out)
\`\`\`

* \`:in\` — read-only aggregated input (computed from member \`dip\` values)
* \`:out\` — read-back of the current output bus (member \`led\` states)

On **Wave**, \`show\` is deferred until propagation settles; \`peek\` reads immediately. \`probe\` tracks \`:in\` / \`:out\` and reports \`initialised\` / \`changed\` like other component properties.

---

## Documentation

\`\`\`logts
doc(comp.ioport)
doc(.P0)
\`\`\`

\`doc(.P0)\` on an instance prints the bit map:

\`\`\`text
.P0 (ioport)

Input:
  0-15   .addr
  16-23  .data

Output:
  0-7    .result
  8-11   .flags
\`\`\`

### Runnable — \`doc(.P0)\`

\`\`\`logts-play
comp [dip] .addr:
  length: 16
  :

comp [dip] .data:
  length: 8
  :

comp [led] .result:
  length: 8
  :

comp [led] .flags:
  length: 4
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  out = .result
  out = .flags
  :

doc(comp.ioport)
doc(.P0)
\`\`\`

---

## Example — loopback

**Load & Run**, then toggle DIP switches — LEDs mirror the input.

\`\`\`logts-play
comp [dip] .sw:
  length: 8
  visual: 1
  :

comp [led] .led:
  length: 8
  :

comp [ioport] .P0:
  in  = .sw
  out = .led
  :

.P0:out = .P0:in
\`\`\`

### Runnable — loopback (Wave)

\`\`\`logts-play wave
comp [dip] .sw:
  length: 8
  visual: 1
  :

comp [led] .led:
  length: 8
  :

comp [ioport] .P0:
  in  = .sw
  out = .led
  :

.P0:out = .P0:in
probe(.P0:in)
probe(.P0:out)
\`\`\`

Flip switches after **RUN** — \`:out\` probe tracks LED mirror state.

---

## Example — CPU Port A to Port B

Corresponds to: read Port A, write Port B.

\`\`\`logts-play
comp [dip] .portASw:
  length: 8
  visual: 1
  = 11110000
  :

comp [led] .portALed:
  length: 8
  :

comp [ioport] .portA:
  in  = .portASw
  out = .portALed
  :

comp [dip] .portBSw:
  length: 8
  :

comp [led] .portBLed:
  length: 8
  :

comp [ioport] .portB:
  in  = .portBSw
  out = .portBLed
  :

8wire value = .portA:in

.portB:out = value

show(value, .portA:in, .portB:out)
\`\`\`

---

## Notes

* IOPORT is a grouping construct — no new signal storage inside the port.
* Input and output widths are independent.
* Intended for educational CPU, bus, and memory-mapped I/O examples.
* See also [dip.md](dip.md), [led.md](led.md), [interactive-components.md](interactive-components.md).
`,
    'key.md': `# Key component

\`comp [key]\` is an interactive panel button. Output is **1 bit** on property \`:get\`. Uses \`onPress\` / \`onRelease\` in the engine (unlike switch/dip which use \`onChange\`).

Signature: \`doc(comp.key)\` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

\`\`\`
comp [key] .name:
  label: 'A'
  size: 36
  type: 1
  nl
  :
\`\`\`

Minimal:

\`\`\`
comp [key] .name::
\`\`\`

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| \`label\`   | string  | \`''\`    | Text on the button |
| \`size\`    | integer | \`36\`    | Button size (pixels) |
| \`type\`    | \`0\`/\`1\`/\`2\` | \`0\` | Interaction mode (see below) |
| \`nl\`      | flag    | (no)    | Newline after the button |

### \`type\` interaction modes

| \`type\` | Panel behaviour | \`:get\` output |
|--------|-----------------|---------------|
| \`0\` | Short click (auto-release ~150ms) | \`1\` while active, then \`0\` |
| \`1\` | Hold until mouse/touch up | \`1\` while held, \`0\` on release |
| \`2\` | Toggle/latch (like \`clcd\` \`touchType: 3\`) | \`0\` ↔ \`1\` on each press; release does not change output. Button stays visually on while output is \`1\`. |

---

## Output

- **1 bit**: \`0\` or \`1\` (depends on \`type\` and press state)

---

## Example — level-sensitive property block (type 1 hold)

\`\`\`logts-play
comp [key] .btn:
  label: 'Go'
  type: 1
  on: 1
  :

comp [led] .out:
  length: 4
  color: ^0f9
  nl
  on: 1
  :

4wire pattern = 1111

.out:{
  value = pattern
  set = .btn
}
\`\`\`

Hold the button to drive the LED block while \`set\` is \`1\`.

---

## Example — toggle (type 2)

\`\`\`logts-play
comp [key] .pwr:
  label: 'P'
  type: 2
  on: 1
  :

comp [led] .on:
  length: 1
  color: ^0f9
  on: 1
  :

1wire led = .pwr

.on = led
\`\`\`

Tap once to latch \`1\` (LED on); tap again for \`0\`.

---

## Notes

- Use **type 0** for short pulses; **type 1** for hold-while-pressed; **type 2** for latched toggle (similar to [switch.md](switch.md) but on a key widget).
- \`probe(.btn)\` tracks press/release in the Output panel — [debug.md](debug.md).
`,
    'keyboard.md': `# KEYBOARD

A keyboard is an interactive input component that captures key presses from the browser and emits values into the simulation.

Unlike a terminal, a keyboard does not display typed characters.

Its purpose is to generate input events that can be connected to queues, stacks, terminals, CPUs, UARTs, or other components.

Index: [interactive-components.md](interactive-components.md) · Signature: \`doc(comp.keyboard)\`

---

## Syntax

\`\`\`logts
comp [keyboard] .name:
  label: 'Keyboard'
  color: ^808080
  bgColor: ^101010
  focusColor: ^2ecc71
  focusBgColor: ^181818
  onlyDigits
  allowEnter
  allowBackspace
  codesAccepted = .lutRef
  showCode: 0
  pulseColor: ^ff0
  nl
  :
\`\`\`

Minimal form:

\`\`\`logts
comp [keyboard] .name::
\`\`\`

---

## Behavior

A keyboard captures key presses only while **focused**.

| Action | Result |
|--------|--------|
| Click component | focused (fast blinking cursor after label) |
| Click elsewhere | unfocused |

When focused, key presses are emitted into the simulation. The component does not display the characters that were typed.

On **mobile**, focus uses a hidden field so the OS virtual keyboard opens:

| Mode | Element | Mobile action key |
|------|---------|-------------------|
| default | \`<input>\` | **Done** (no Enter in simulation) |
| \`allowEnter\` | \`<textarea>\` | **Enter** / return (emits LF, code 10) |

With \`onlyDigits\`, \`inputmode="numeric"\` is set (reliable on \`<input>\`; on \`<textarea>\` the OS may still show a full keyboard). On desktop, the same field receives physical key presses while focused.

---

## Outputs

| Pout | Width | Description |
|------|-------|-------------|
| \`get\` | 8 | Last emitted **ASCII** code (8 bit) |
| \`valid\` | 1 | Pulse \`1\` for one propagation cycle when a key is accepted, then \`0\` |

Wire property blocks use \`set = .kbd:valid\` to trigger \`push\` / \`append\` on each key.

In **Wave** propagation, after each accepted key the engine always re-evaluates blocks whose \`set\` references \`.kbd\` (including \`:valid\`), even when other wires (e.g. \`entryNew\`) were updated in the same step — so \`comp [reg]\` / \`terminal\` blocks on \`valid\` fire reliably.

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| \`label\` | string | \`Keyboard\` | Display label |
| \`color\` | color | \`^808080\` | Border when unfocused |
| \`bgColor\` | color | \`^101010\` | Background when unfocused |
| \`focusColor\` | color | \`^2ecc71\` | Border when focused |
| \`focusBgColor\` | color | \`^181818\` | Background when focused |
| \`onlyDigits\` | flag | (no) | Accept only \`0\`–\`9\` (still emits 8-bit ASCII); mobile \`inputmode=numeric\` |
| \`allowEnter\` | flag | (no) | Accept Enter (LF, code 10); mobile uses \`<textarea>\` with return key |
| \`allowBackspace\` | flag | (no) | Accept Backspace (BS, code 8) |
| \`allowArrows\` | flag | (no) | Accept arrow keys (codes 128–131 on \`:get\`) |
| \`allowDelete\` | flag | (no) | Accept forward Delete (code 132 on \`:get\`) |
| \`codesAccepted\` | LUT ref | (no) | Whitelist of allowed keys via \`comp [lut]\` (\`codesAccepted = .lut\`) |
| \`showCode\` | integer | \`0\` | Display last \`:get\` code next to label (\`0\` off, \`1\` hex, \`2\` decimal) |
| \`pulseColor\` | color | (no) | Brief color flash on border/label after each accepted key |
| \`nl\` | flag | (no) | New line after component |

---

## Key codes (8-bit)

\`:get\` emits an 8-bit key code. Printable ASCII uses standard values (\`A\` → 65). Special keys use reserved codes below 32 or in the extended range 128–132.

### Printable ASCII (excerpt)

| Key | Decimal | Binary (8 bit) | Notes |
|-----|---------|----------------|-------|
| \`A\` | 65 | \`01000001\` | |
| \`5\` | 53 | \`00110101\` | |
| Backspace | 8 | \`00001000\` | Requires \`allowBackspace\` (or \`^08\` in \`codesAccepted\` LUT) |
| Enter | 10 | \`00001010\` | Requires \`allowEnter\` |

### Extended keyboard codes (128–132)

Non-printable navigation keys mapped from browser \`e.key\` names. Requires \`allowArrows\` or \`allowDelete\` (and panel forwarding). Safe to compare with \`EQ(code, ^80)\` — no collision with letters or digits.

| Browser key | Attribute | Decimal | Hex | Binary (8 bit) |
|-------------|-----------|---------|-----|----------------|
| \`ArrowLeft\` | \`allowArrows\` | 128 | \`^80\` | \`10000000\` |
| \`ArrowRight\` | \`allowArrows\` | 129 | \`^81\` | \`10000001\` |
| \`ArrowUp\` | \`allowArrows\` | 130 | \`^82\` | \`10000010\` |
| \`ArrowDown\` | \`allowArrows\` | 131 | \`^83\` | \`10000011\` |
| \`Delete\` (forward) | \`allowDelete\` | 132 | \`^84\` | \`10000100\` |

When \`codesAccepted\` is set, include \`^80\`–\`^84\` in the LUT if you want these keys whitelisted.

---

## \`onlyDigits\` — filter, not encoding

\`onlyDigits\` accepts only keys \`0\`–\`9\` (and Enter when \`allowEnter\` is also set, Backspace when \`allowBackspace\` is set). **\`:get\` is always 8-bit ASCII** — e.g. \`5\` → \`00110101\` (character \`'5'\`), not \`0101\`.

For the numeric value \`0\`–\`9\` in logic (queue, reg, ALU), use the low nibble:

\`\`\`logts
4wire digit = .kbd.4/4
# same as .kbd.4-7 or .kbd:get.4/4
\`\`\`

For digits \`0\`–\`9\`, \`.4/4\` equals the decimal digit value.

---

## \`codesAccepted\` — whitelist via LUT

Syntax (binding, like ALU \`lut = .ref\`):

\`\`\`logts
codesAccepted = .lutName
\`\`\`

When \`codesAccepted\` is set, **only the LUT** decides which keys are accepted (including Enter, Backspace, arrows, and Delete). \`onlyDigits\`, \`allowEnter\`, and \`allowBackspace\` are ignored for filtering; \`onlyDigits\` still sets mobile \`inputmode=numeric\`. \`allowEnter\` / \`allowBackspace\` / \`allowArrows\` / \`allowDelete\` are still needed on the panel widget so the browser forwards those keys to the simulation.

The referenced \`comp [lut]\` must have **\`depth: 1\`** or **\`depth: 8\`**; any other depth errors at elaboration:

\`codesAccepted requires lut with depth 1 or 8\`

| LUT \`depth\` | Mode | Meaning |
|-------------|------|---------|
| \`1\` | **bitmap** | Address = ASCII code (0…255); value \`1\` = allowed |
| \`8\` | **values** | Each table value is a full 8-bit ASCII code allowed (non-\`fillwith\` entries) |

### Bitmap (\`depth: 1\`) — digits + Enter

\`\`\`logts
comp [lut] .allowed:
  depth: 1
  length: 256
  fillwith: 0
  = data {
    ^30 - ^39: 1
    ^0a: 1
  }
  :

comp [keyboard] .kbd:
  codesAccepted = .allowed
  on: 1
  :
\`\`\`

Enter is accepted only if \`^0a: 1\` is in the LUT — \`allowEnter\` does not add LF automatically when \`codesAccepted\` is active. Backspace is accepted only if \`^08: 1\` (bitmap) or \`00001000\` (values depth 8) is in the LUT.

### Values (\`depth: 8\`) — explicit code list

\`\`\`logts
comp [lut] .digitKeys:
  depth: 8
  length: 10
  fillwith: 00000000
  = data {
    0: 00110000
    1: 00110001
    2: 00110010
    3: 00110011
    4: 00110100
    5: 00110101
    6: 00110110
    7: 00110111
    8: 00111000
    9: 00111001
  }
  :

comp [keyboard] .kbd:
  codesAccepted = .digitKeys
  onlyDigits
  on: 1
  :
\`\`\`

---

## Visual feedback — \`showCode\` and \`pulseColor\`

Optional UI hints on the keyboard widget (Devices panel). They do not change simulation output.

### \`showCode\`

| Value | Display (focused) | Display (unfocused) |
|-------|-------------------|---------------------|
| \`0\` | Blinking \`\\|\` only (default) | Hidden |
| \`1\` | Hex + cursor, e.g. \`^39\\|\` for key \`9\` (ASCII 57) | Static hex, e.g. \`^39\` |
| \`2\` | Decimal + cursor, e.g. \`57\\|\` | Static decimal, e.g. \`57\` |

The code reflects the current \`:get\` value. When \`:get\` is \`0\`, only the blinking cursor is shown (no code text).

### \`pulseColor\`

When set (e.g. \`pulseColor: ^ff0\`), border and label briefly flash that color (~150 ms) after each **accepted** key. Rejected keys do not pulse.

### Integration hooks

The panel calls these globals (also usable in tests):

- \`onKeyboardShowCode(keyboardId, asciiCode, showCodeMode)\`
- \`onKeyboardPulseColor(keyboardId, colorHex)\`

### Example — debug keyboard with code display

\`\`\`logts-play
comp [keyboard] .kbd:
  label: 'Debug'
  showCode: 1
  pulseColor: ^ff0
  focusColor: ^0f0
  allowEnter
  on: 1
  :
\`\`\`

Click the keyboard and type — you see the hex code of the last accepted key and a short yellow flash on each press.

---

## Example — keyboard → terminal

Click the keyboard, type characters; each accepted key appends to the terminal when \`valid\` pulses.

\`\`\`logts-play
comp [keyboard] .kbd:
  label: 'Console'
  focusColor: ^00ff00
  allowEnter
  on: 1
  :

comp [terminal] .term:
  rows: 10
  columns: 40
  color: ^0f0
  on: 1
  nl
  :

.term:{
  append = .kbd
  set = .kbd:valid
}
\`\`\`

With \`allowEnter\`, pressing Enter on the keyboard emits LF and you can wire \`newline\` on the terminal from \`:get\` if needed.

---

## Example — keyboard → queue (BCD)

\`\`\`logts-play
comp [keyboard] .digits:
  label: 'BCD'
  onlyDigits
  focusColor: ^00aaff
  on: 1
  :

comp [queue] .q:
  width: 4
  length: 16
  on: 1
  nl
  :

.q:{
  push = .digits.4/4
  set = .digits:valid
}
\`\`\`

---

## Example — pocket calculator

Full runnable script (keyboard, \`+\`/\`-\`/\`=\`/\`R\`, divider display, terminal): **[pocket-calc.md](pocket-calc.md)** — self-contained \`logts-play wave\` block with **Load** / **Load & Run**.

---

## Notes

- Only one focused keyboard receives keys at a time.
- By default, typed characters are not shown on the keyboard widget (use \`showCode\` or [terminal.md](terminal.md) for display).
`,
    'lcd.md': `# LCD matrix component

\`comp [lcd]\` is a **pixel matrix display** with programmable rows/columns. Draw via property blocks using coordinates, characters, or raw pixel data.

Signature: \`doc(comp.lcd)\` — full pin list is long; always check \`doc(comp.lcd)\` in the editor.

---

## Syntax

\`\`\`
comp [lcd] .name:
  row: 8
  cols: 5
  pixelSize: 10
  pixelGap: 3
  color: ^0f0
  rgb
  nl
  :
\`\`\`

| Attribute | Default | Description |
|-----------|---------|-------------|
| \`row\` | 8 | Matrix height |
| \`cols\` | 5 | Matrix width |
| \`pixelSize\` | 10 | Square pixel size (px) |
| \`pixelSizeX\`, \`pixelSizeY\` | from \`pixelSize\` | Non-square pixels |
| \`pixelGap\` | 3 | Gap between pixels |
| \`color\` | green | Monochrome color (without \`rgb\`) |
| \`rgb\` | off | Enable RGB mode |

---

## Main pins

| Pin | Role |
|-----|------|
| \`set\` | Enable draw operation |
| \`clear\` | Clear display |
| \`x\`, \`y\` | Pixel coordinates |
| \`chr\` | 8-bit character to draw |
| \`data\` | Pixel value / pattern |
| \`write0\` | Write mode control |
| \`rowlen\` | Row length for bulk writes |
| \`corner\` | Corner radius hint |
| \`get\` | 8-bit readback of last operation |

Use property blocks with \`on:\` matching your trigger strategy.

---

## Minimal example

\`\`\`logts-play
comp [lcd] .screen:
  row: 8
  cols: 5
  pixelSize: 8
  color: ^0f0
  nl
  on: 1
  :

.screen:{
  x = 000
  y = 000
  chr = 01001000
  set = 1
}
\`\`\`

---

## Notes

- Complex displays belong in [pcb.md](pcb.md), not [chip.md](chip.md).
- Related: [seven-seg.md](seven-seg.md), [led.md](led.md).
`,
    'led-bar.md': `# LED bar component (\`bar\`)

\`comp [bar]\` (parser alias \`ledBar\`) shows a **horizontal or vertical bar graph** of LEDs. Width follows \`length\` (default 8).

Signature: \`doc(comp.bar)\`.

---

## Syntax

\`\`\`
comp [bar] .name:
  length: 8
  width: 4
  gap: 2
  color: ^0f0
  bgColor: ^222
  orientation: 0
  barWidth: 20
  scale: 1
  nl
  :
\`\`\`

| Attribute | Default | Description |
|-----------|---------|-------------|
| \`length\` | 8 | Number of LEDs (bits) |
| \`width\` | 4 | LED thickness |
| \`gap\` | 2 | Space between LEDs |
| \`color\` | green | Lit LED color |
| \`bgColor\` | dark gray | Background |
| \`orientation\` | 0 | \`0\` horizontal, \`1\` vertical |
| \`barWidth\` | 20 | Total bar size (px) |
| \`scale\` | 1 | UI scale factor |

---

## Pins

| Pin | Width | Role |
|-----|-------|------|
| \`set\` | 1 | Enable property block |
| \`data\` | \`length\` | Bit pattern — each \`1\` lights one segment |
| \`get\` | \`length\` | Read back displayed value |

Direct assignment: \`comp [bar] .lvl: length: 8 = 00001111 ::\`

---

## Example

\`\`\`logts-play
comp [bar] .meter:
  length: 8
  color: ^0f9
  orientation: 0
  nl
  on: 1
  :

.meter:{
  data = 00001111
  set = 1
}
\`\`\`

Lights the right half of the bar.

---

## Related

- [led.md](led.md) — individual LEDs
- [components.md](components.md)
`,
    'led.md': `# LED Component

The \`led\` component displays one or more LED indicators. By default it is a single 1-bit LED. Setting \`length\` creates a group of LEDs where each LED corresponds to one bit of the assigned value — a lit LED means the bit is \`1\`, an unlit LED means \`0\`.

---

## Syntax

\`\`\`
comp [led] .name:
  length: 4
  text: 'label'
  color: ^f00
  square
  nl
  on: raise/edge/1/0
  :
\`\`\`

Minimal form (single LED, all defaults):

\`\`\`
comp [led] .name::
\`\`\`

---

## Attributes

| Attribute | Type    | Default   | Description |
|-----------|---------|-----------|-------------|
| \`length\`  | integer | \`1\`       | Number of LEDs (bits). \`1\` = single LED, \`4\` = group of 4 LEDs |
| \`text\`    | string  | \`''\`      | Label displayed next to the first LED |
| \`color\`   | hex     | \`^f00\`    | LED color as a 3 or 6 digit hex value (e.g. \`^0f9\`, \`^21f\`, \`^ff0000\`) |
| \`square\`  | flag    | (round)   | Renders the LED as a square instead of a circle |
| \`nl\`      | flag    | (no)      | Adds a newline after the last LED in the group |
| \`on\`      | mode    | \`raise\`   | Trigger mode for property blocks: \`raise\`, \`edge\`, \`1\`, \`0\` |

---

## Direct assignment

### Single LED (\`length: 1\`)

Assign a 1-bit value directly to the LED:

\`\`\`logts-play
comp [led] .power:
  color: ^0f0
  nl
  :

.power = 1       # LED on
.power = 0       # LED off
\`\`\`

### Multi-bit LED group (\`length: N\`)

Assign an N-bit value — each bit controls one LED:

\`\`\`
comp [led] .status:
  length: 4
  color: ^0f9
  nl
  :

.status = 1010   # LEDs 0 and 2 are on, LEDs 1 and 3 are off
\`\`\`

Bit order is left-to-right: the leftmost bit controls the first (leftmost) LED.

---

## Wire connection

When a wire connected to an LED changes (from code, from another component, or after **RUN** / **NEXT**), the LEDs update to match. See [signal-propagation.md](signal-propagation.md).

Connect the LED group to a wire of matching width:

\`\`\`
4wire data = 1010

comp [led] .leds:
  length: 4
  nl
  :

.leds = data     # all 4 LEDs reflect the bits of data
\`\`\`

Or using a property block with \`set\`:

\`\`\`
comp [led] .leds:
  length: 4
  on: 1
  :

.leds:{
  value = data
  set = 1
}
\`\`\`

---

## Reading the value (\`:get\`)

The current value of the LED group can be read back:

\`\`\`
4wire out = .leds:get
\`\`\`

---

## Examples

Input components (\`switch\`, \`key\`, \`dip\`) are described in [interactive-components.md](interactive-components.md).

### Power indicator

\`\`\`
comp [switch] .pwr:
  text: 'Pwr'
  :

comp [led] .indicator:
  color: ^21f
  text: 'ON'
  nl
  :

.indicator = .pwr
\`\`\`

### 4-bit status display

\`\`\`
4wire flags = 1101

comp [led] .fl:
  length: 4
  color: ^ff0
  square
  nl
  :

.fl = flags
\`\`\`

LEDs light up according to the bits of \`flags\`: bits 0, 2, 3 are \`1\` → LEDs 0, 2, 3 are on.

### LED group driven by a key

\`\`\`
comp [key] .btn:
  label: 'A'
  on: 1
  :

comp [led] .out:
  length: 4
  color: ^0f9
  nl
  on: 1
  :

4wire data = 1111

.out:{
  value = data
  set = .btn
}
\`\`\`

When button A is pressed, all 4 LEDs turn on.

### ALU result display

\`\`\`
comp [dip] .a:
  text: 'A'
  length: 4
  visual: 1
  noLabels
  :4bit

comp [dip] .b:
  text: 'B'
  length: 4
  visual: 1
  noLabels
  nl
  :4bit

comp [adder] .add:
  depth: 4
  :

.add:a = .a
.add:b = .b

comp [led] .result:
  length: 4
  color: ^0af
  text: 'Sum'
  nl
  :

comp [led] .carry:
  color: ^f40
  text: 'C'
  nl
  :

.result = .add:get
.carry = .add:carry
\`\`\`

---

## Component type documentation

\`\`\`
doc(comp.led)
\`\`\`

Output:

\`\`\`
comp [led] .name:
  length: integer
  text: string
  color: string
  square
  nl
  on: raise/edge/1/0
  = Xbit
  :{
    1pin set
    Xpin value
    Xpout get
  }
  -> Xbit
\`\`\`

---

## Notes

- \`length: 1\` (default) behaves like a classic single LED — no storage is allocated and \`ref\` remains null.
- \`length > 1\` allocates storage so the bit group value persists and can be read back via \`:get\`.
- Bit order is **left-to-right**: bit index \`0\` is the leftmost LED.
- The \`color\` attribute applies to all LEDs in the group. Individual LED colors are not supported within a single component — declare separate \`led\` components for different colors.
- \`nl\` places a line break after the **last** LED in the group.
`,
    'loop.md': `# Loop preprocessor (\`loop N..M[\`)

Before tokenization, the preprocessor expands **loop blocks** that duplicate lines of source text.

## Syntax

\`\`\`
loop START..END[
  ... body ...
]
\`\`\`

- \`START\` and \`END\` are decimal integers; \`END\` must be ≥ \`START\`.
- Brackets \`[\` \`]\` delimit the body; nested \`[\` \`]\` inside the body are balanced.
- Nested \`loop\` blocks are supported.
- Maximum **256** total iterations per nesting group (product of all loop counts in that tree).

## Placeholders

Inside the body, these placeholders are replaced on expansion:

| Placeholder | Meaning |
|-------------|---------|
| \`?\` | Sequential counter from 1 upward (all active levels) |
| \`?0\` | Value of the outermost loop (level 0) |
| \`?1\`, \`?2\`, … | Value of nested loop at that level |

Lines that reference only specific \`?N\` levels are **deduplicated** when those level values did not change since the previous emitted line.

## Example

\`\`\`
loop 1..3[
  4wire w?
]
\`\`\`

Expands to:

\`\`\`
  4wire w1
  4wire w2
  4wire w3
\`\`\`

Nested example:

\`\`\`
loop 1..2[
  loop 1..2[
    4wire x?0?1
  ]
]
\`\`\`

→ four lines: \`x11\`, \`x12\`, \`x21\`, \`x22\`.

## Pipeline order

1. **Short notation** (backtick expressions) is expanded first.
2. **Loop blocks** are expanded second.
3. The tokenizer and parser see only the flattened source.

## Not confused with

- **Protocol** inline segments: \`repeat 0 4b\` inside \`[protocol]\` — bit repetition in packet layout; not a loop block.
- **ASM** labels and jumps: \`loop:\` / \`JMP loop\` in \`[asm]\` ISA definitions — assembler mnemonics; not expanded by this preprocessor.

## Comments

A line starting with \`#\` is a comment. \`loop\` inside a comment is ignored:

\`\`\`
# loop 1..5[
4wire a = ^FF
\`\`\`

The second line is not expanded.
`,
    'lut.md': `# LUT

A **combinational lookup table**: address in → value out in the **same propagation step** (like \`ADD()\` / \`MUX()\`, not like clocked \`mem\`).

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name **must** start with \`.\` | \`.decoder\` ✓ — \`decoder\` ✗ |
| Letters, digits, \`_\` | \`.my_lut\` ✓ |
| Invoke with \`.\` prefix | \`.decoder(in = addr)\` or \`.decoder(0011)\` |
| **Global** ref from board/chip/pcb body | \`^.decoder:LOAD\` — skips instance prefix (see below) |

\`decoder(in = …)\` without the leading dot is a **parse error** (unknown identifier).

### Global reference \`^.name\`

Inside a **board**, **chip**, or **pcb** body, local component names are prefixed at instantiation (\`.ctl\` → \`._cpu_ctl\`). Top-level \`inline [lut]\` / \`inline [asm]\` instances keep their global name (\`.ctl\`).

Use **\`^\`** before the dot to refer to the **global** instance from inside a composite body:

\`\`\`logts
inline [lut] .ctl:
  LOAD = 0001
  :

board +[cpu]:
  4wire ctl = ^.ctl:LOAD    # global .ctl, not ._cpu_ctl
  doc(^.ctl)                # works inside board body
  :
\`\`\`

\`^\` before a hex literal is unchanged: \`^FF\` is still hex, not global (global form is \`^.name\` only).

---

## Two forms

| Form | Declaration | Lookup |
|------|-------------|--------|
| **\`inline [lut]\`** | labels and/or \`data { }\` in body (no \`=\`) | \`.name(in = addr)\`, \`.name:LABEL\`, \`.name:decode(...)\` |
| **\`comp [lut]\`** | \`= data { }\` after attrs | Method B: \`.name:in\` + \`.name:get\` — or Method A: \`.name(in = addr)\` |

Use **\`inline [lut]\`** for pure combinational lookup in expressions.

Use **\`comp [lut]\`** when you need pin wiring, wave propagation on pins, or \`probe(.name:get)\`.

LUT uses **\`(...)\`** for lookup. ASM (see [asm.md](asm.md)) uses **\`{ }\`** for program assembly — different inline kind.

---

## Shared attributes

Apply to both \`inline [lut]\` and \`comp [lut]\`:

| Attribute | Default | Description |
|-----------|---------|-------------|
| \`depth\` | \`4\` | Output width (bits after \`:\` in \`data\` and on result) |
| \`length\` | \`16\` | Number of table slots (addresses \`0 .. length-1\`) |
| \`fillwith\` | \`000…0\` (\`depth\` zeros) | Value for slots **not** listed in \`data { }\` |

Address width on pin \`in\` (comp only): \`max(1, ceil(log2(length)))\` bits — call this **\`addrBits\`**.

#### Wide \`in\` values (narrowing)

If \`in\` is driven by a wire **wider** than \`addrBits\` (common with \`8wire\` arithmetic or \`:get\` from an 8-bit \`reg\`), the table index is the **least significant \`addrBits\` bits** of the value. Values shorter than \`addrBits\` are **zero-padded on the left**.

This matches device-layer \`setLutIn\` and applies to both \`comp [lut]\` pin \`in\` and invoke \`.name(in = expr)\`.

| \`length\` | \`addrBits\` | \`in\` (example) | Index used | Slot |
|----------|------------|----------------|------------|------|
| 16 | 4 | \`00000011\` | \`0011\` | 3 |
| 16 | 4 | \`00001010\` | \`1010\` | 10 |

Use an explicit bit slice (e.g. \`val.4/4\`) only when you need non-LSB bits; for numeric digit/opcode indices the low bits are the address.

\`\`\`logts-play
comp [lut] .toAscii:
  depth: 8
  length: 16
  fillwith: 00110000
  = data {
    ^0: 00110000
    ^3: 00110011
  }
  on: 1
  :

8wire digit = 00000011
8wire ch = .toAscii(in = digit)
show(ch)
\`\`\`

\`digit\` is 8 bits; address **\`0011\`** → ASCII \`'3'\` (\`00110011\`), not slot 0 from the high nibble.

### \`variableDepth\`

When set, each LUT value may have a **different bit width**. Mutually exclusive with \`depth:\`.

| Rule | Detail |
|------|--------|
| Attribute | \`variableDepth\` (no value) |
| Values in \`data { }\` | Any non-empty binary literal per slot |
| \`fillwith\` | Must be exactly **1 bit** (default \`0\`) |
| Output width | Matches the selected value's length |

### Runnable — variableDepth lookup

\`\`\`logts-play
inline [lut] .vd:
  variableDepth
  data {
    00: 0
    01: 101
    10: 11
  }
  :

1wire a = .vd(00)
3wire b = .vd(01)
2wire c = .vd(10)
show(a)
show(b)
show(c)
\`\`\`

Address \`01\` → 3-bit value **\`101\`**; address \`10\` → 2-bit value **\`11\`**.

Combining \`variableDepth\` with \`depth:\` is a parse error.

### \`prefixFree\`

Declares a **prefix-free** codeword table (Huffman-style). Implies \`variableDepth\`; mutually exclusive with \`depth:\`.

At parse time every value is checked: no codeword may be a prefix of another.

| Rule | Detail |
|------|--------|
| Attribute | \`prefixFree\` (no value) |
| Values | Variable-length binary codewords |
| Lookup | \`.name(in = addr)\` — encode key → codeword |
| Reverse in protocol | \`collapse(data, .name, keyWidth)\` — greedy decode; see [protocol.md — expand / collapse](protocol.md#expand--collapse-with-lut) |

For a full encode → packet → decode walkthrough (\`.huff\`, \`.huffPacket\`, \`.huffRecover\`), see **[huffman.md](huffman.md)**.

### Runnable — prefixFree Huffman table

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

2wire y = .huff(01)
show(y)
\`\`\`

Key \`01\` → codeword **\`10\`**.

Prefix violation example (parse error):

\`\`\`logts
inline [lut] .bad:
  prefixFree
  data {
    00: 0
    01: 01    # '0' is a prefix of '01'
  }
  :
\`\`\`

Combining \`prefixFree\` with \`depth:\` is a parse error.

---

## \`data { }\` — table contents

Same parser for inline body and \`comp\` initializer.

Decimal \`\\N\` and hex \`^N\` are **address indices**, not wire literals.

| Address format | Example | Meaning |
|----------------|---------|---------|
| Binary | \`0\`, \`010\`, \`1001\` | \`parseInt(bits, 2)\` |
| Decimal | \`\\2\`, \`\\50\` | decimal index |
| Hex | \`^a\`, \`^Ff\` | hex index |
| Range | \`addr - addr\` | inclusive; mixed formats OK |

**Values** after \`:\` must be binary literals of exactly **\`depth\`** bits.

Unmapped slots use \`fillwith\`. Overlapping ranges: **last entry wins**. Address \`>= length\` → parse error.

---

## Declaration — \`inline [lut]\`

\`\`\`logts
inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \\1 - \\5   : 0010
    ^a - ^f   : 1111
  }
  :
\`\`\`

Body uses labels and/or \`data { }\` **without** \`=\` (unlike \`comp [lut]\`). A LUT with **only labels** (no \`data { }\`) acts as a symbolic constant table.

---

## Labels

Symbolic names for binary values. Syntax: **flat** (\`RED = 00\`) or **block** (\`labels { RED = 00 }\`).

| Rule | Example |
|------|---------|
| Must start with a letter | \`RED\` ✓ — \`1RED\` ✗ |
| Letters and digits only | \`STATE0\` ✓ — \`STATE_A\` ✗ |
| Unique within the LUT | duplicate → error |
| All labels same width | \`RED = 00\`, \`GREEN = 10\` ✓ |

### Access

\`\`\`logts
3wire state = .flag:OVERFLOW
\`\`\`

### Labels-only (constants)

\`\`\`logts
inline [lut] .flag:
  ZERO     = 000
  NEGATIVE = 001
  OVERFLOW = 010
  :

3wire s = .flag:OVERFLOW
\`\`\`

### Labels with \`data { }\`

\`\`\`logts
inline [lut] .traffic:
  RED    = 00
  YELLOW = 01
  GREEN  = 10
  data {
    RED    : GREEN
    GREEN  : YELLOW
    YELLOW : RED
  }
  :

2wire next = .traffic(.traffic:RED)
\`\`\`

Bare label names (\`RED\`, \`GREEN\`) resolve in \`.traffic:isValid(RED, GREEN)\` on the same instance.

---

## Constant expressions

Labels and \`data { }\` values may use \`|\`, \`&\`, \`!\`, and parentheses. Evaluated at parse time; \`exprSource\` is preserved for \`show()\`, \`probe()\`, and \`doc()\`.

\`\`\`logts
inline [lut] .ctrl:
  depth: 8
  ACCLOAD = 00000001
  MEMREAD = 00000010
  LOAD = ACCLOAD | MEMREAD
  :

8wire w = .ctrl:LOAD
\`\`\`

Chaining: \`A | B | C\`. Precedence: \`!\` > \`&\` > \`|\`.

Display uses infix operators (\`ACCLOAD | MEMREAD\`), not \`OR()\` / \`AND()\` / \`NOT()\`.

---

## \`isValid(key, value)\` → \`1bit\`

Checks whether an exact mapping exists in \`data { }\`.

\`\`\`logts
1bit ok = .traffic:isValid(RED, GREEN)
1bit ok = .traffic:isValid(currentState, wantedState)
\`\`\`

---

## \`decode(value [, matchIndex])\` → address bits

Reverse lookup: encoded value → address (key). Optional zero-based \`matchIndex\` when multiple keys map to the same value (default \`0\`).

Works with binary literals and label names as the value argument.

### Runnable — unique reverse lookup

\`\`\`logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0000 : 0001
    0001 : 0010
    0010 : 0100
  }
  :

4wire x = .decoder:decode(0010)
show(x)
\`\`\`

Value \`0010\` → key address **\`0010\`**.

### Runnable — ambiguous value (matchIndex)

\`\`\`logts-play
inline [lut] .amb:
  depth: 4
  length: 16
  data {
    0000 : 1111
    0001 : 1111
    0010 : 1111
  }
  :

4wire first = .amb:decode(1111)
4wire third = .amb:decode(1111, 0010)
show(first)
show(third)
\`\`\`

Default index \`0\` → **\`0000\`**; index \`2\` (binary \`0010\`) → **\`0010\`**.

### Runnable — decode with label value

\`\`\`logts-play
inline [lut] .traffic:
  RED    = 00
  YELLOW = 01
  GREEN  = 10
  data {
    RED    : GREEN
    GREEN  : YELLOW
    YELLOW : RED
  }
  :

2wire x = .traffic:decode(GREEN)
show(x)
\`\`\`

Value label \`GREEN\` (\`10\`) maps to key **\`RED\`** (\`00\`).

| Error | Cause |
|-------|-------|
| \`LUT decode failed: value ... does not exist\` | Value not in table |
| \`LUT decode failed: match index N exceeds available matches (M)\` | Invalid \`matchIndex\` |

Protocol reverse transform: [protocol.md — \`:decode()\`](protocol.md#decodechannels). ASM disassembly: [asm.md — \`:decode()\`](asm.md#decodeinstruction).

---

## \`show()\` and \`probe()\` with labels

\`\`\`logts
show(.state:FETCH)
probe(.ctrl:LOAD)
\`\`\`

Output includes label name and expression when present, e.g. \`LOAD = ACCLOAD | MEMREAD (00000011)\`.

---

### Runnable — invoke (named address)

\`\`\`logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0         : 0001
    \\1 - \\5   : 0010
  }
  :

4wire addr = 0001
4wire y = .decoder(in = addr)
show(y)
\`\`\`

Slot **1** → value \`0010\`.

### Runnable — invoke (positional address)

\`\`\`logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0         : 0001
    \\1 - \\5   : 0010
  }
  :

4wire y = .decoder(0011)
show(y)
\`\`\`

Address \`0011\` (binary) = slot **3** → value \`0010\`.

Positional form also accepts wire refs: \`.decoder(addr)\` where \`addr\` is a wire variable.

### Runnable — unmapped slots and \`fillwith\`

\`\`\`logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \\1 - \\5   : 0010
  }
  :

4wire y = .decoder(in = 0110)
show(y)
\`\`\`

Slot **6** is not in \`data { }\` → output is \`fillwith\` (\`0110\`).

### Runnable — \`doc()\` (inline)

\`\`\`logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \\1 - \\5   : 0010
    ^a - ^f   : 1111
  }
  :

doc(inline.lut)
doc(.decoder)
\`\`\`

\`doc(inline.lut)\` — declaration template and invoke syntax.

\`doc(.decoder)\` on an inline instance:

\`\`\`text
.decoder (inline [lut])
  depth: 4
  length: 16
  fillwith: 0110
  map:
    0 -> 0001
    \\1-\\5 -> 0010
    ^a-^f -> 1111
  fill:
    6-9 -> 0110 (fillwith)
\`\`\`

---

## Component declaration (\`comp [lut]\`)

\`\`\`logts
comp [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \\1 - \\5   : 0010
    ^a - ^f   : 1111
  }
  :
\`\`\`

Requires \`= data { ... }\` initializer at parse time.

### Runnable — method B (pin wiring)

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    0         : 0001
    \\1 - \\5   : 0010
  }
  :

4wire addr = 0011
.lut:in = addr
4wire y = .lut:get
show(y)
\`\`\`

Address \`0011\` = slot **3** → value \`0010\`.

### Runnable — method A (parentheses invoke)

Same \`(...)\` syntax as \`inline [lut]\` — works on \`comp\` instances too:

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    0         : 0001
    \\1 - \\5   : 0010
  }
  :

4wire addr = 0001
4wire y = .lut(in = addr)
4wire z = .lut(0011)
show(y)
show(z)
\`\`\`

Only pin \`in\` is supported; result is always pout \`get\`.

### Runnable — address formats (comp, method B)

Binary index:

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    010 : 1000
  }
  :

.lut:in = 010
4wire y = .lut:get
show(y)
\`\`\`

Decimal index \`\\50\`:

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 64
  = data {
    \\50 : 1111
  }
  :

.lut:in = \\50
4wire y = .lut:get
show(y)
\`\`\`

Hex range \`^a - ^f\`:

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    ^a - ^f : 1111
  }
  :

.lut:in = ^c
4wire y = .lut:get
show(y)
\`\`\`

Mixed range (binary start, decimal end):

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    010 - \\5 : 0010
  }
  :

.lut:in = 0100
4wire y = .lut:get
show(y)
\`\`\`

### Runnable — \`probe\` and \`doc()\` (comp)

\`probe\` requires a \`comp\` instance (pins on the netlist):

\`\`\`logts-play
comp [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \\1 - \\5   : 0010
    ^a - ^f   : 1111
  }
  :

probe(.decoder:get)
.decoder:in = 0000
.decoder:in = 0011
doc(comp.lut)
doc(.decoder)
\`\`\`

\`doc(comp.lut)\` — component type syntax (pins \`in\` / \`get\`).

\`doc(.decoder)\` on a comp instance shows header \`comp [lut]\` (not \`inline [lut]\`).

---

## Display decode — hex 0–F

A **lookup table** can replace the built-in hex decoder on [7seg](seven-seg.md) or [14seg](14seg.md): 4-bit address in → segment pattern out, combinational in the same step.

Segment patterns below match the \`hex\` pin maps in \`doc(comp.7seg)\` / \`doc(comp.14seg)\` (7-seg: 8 bits \`a\`–\`g\` + DP \`h\`; 14-seg: 15 bits including \`dp\`).

### Runnable — 7-segment hex decoder

**Load & Run**, then flip the **Hex** DIP switches (\`0000\` … \`1111\`) — the display shows digits **0**–**F**.

\`\`\`logts-play
comp [dip] .sw:
  length: 4
  text: 'Hex'
  visual: 1
  = 0000
  :

inline [lut] .hex7:
  depth: 8
  length: 16
  data {
    0000: 11111100
    0001: 01100000
    0010: 11011010
    0011: 11110010
    0100: 01100110
    0101: 10110110
    0110: 10111110
    0111: 11100000
    1000: 11111110
    1001: 11110110
    1010: 11101110
    1011: 00111110
    1100: 10011100
    1101: 01111010
    1110: 10011110
    1111: 10001110
  }
  :

8wire segs = .hex7(.sw:get)

comp [7seg] .digit:
  color: ^f00
  scale: 2
  nl
  on: 1
  :

.digit:{
  a = segs.0
  b = segs.1
  c = segs.2
  d = segs.3
  e = segs.4
  f = segs.5
  g = segs.6
  h = segs.7
  set = 1
}
\`\`\`

\`8wire segs = .hex7(.sw:get)\` — address from the DIP bus; each LUT row is one hex digit’s segment pattern (\`11111100\` = digit **0**, \`10001110\` = **F**).

Wire bits are **MSB-first** ([short-notation.md](short-notation.md)): \`segs.0\` = segment **a**, …, \`segs.7\` = decimal point **h**. The 8-bit LUT values match \`hexTo7Seg\` + \`h = 0\` (same order as pin \`hex\` on \`7seg\`).

When the DIP changes (wave or legacy propagation), wires that use \`.hex7(.sw:get)\` or \`.hex7(in = sw)\` with \`sw = .sw:get\` are **re-evaluated** in the same step. Use \`.sw:get\` (or \`in = addr\` with a wire fed from \`:get\`), not bare \`.sw\` on a wire assignment.

### Runnable — 14-segment hex decoder

**Load & Run**, then flip **Hex** DIP — alphanumeric **0**–**F** on the 14-seg panel.

\`\`\`logts-play
comp [dip] .sw:
  length: 4
  text: 'Hex'
  visual: 1
  = 0000
  :

inline [lut] .hex14:
  depth: 15
  length: 16
  data {
    0000: 111111000010010
    0001: 011000000010000
    0010: 110110110000000
    0011: 111100110000000
    0100: 011001110000000
    0101: 101101110000000
    0110: 101111110000000
    0111: 111000000000000
    1000: 111111110000000
    1001: 111101110000000
    1010: 111011110000000
    1011: 001111110000000
    1100: 100111000000000
    1101: 011110110000000
    1110: 100111110000000
    1111: 100011110000000
  }
  :

15wire pat = .hex14(.sw:get)

comp [14seg] .disp:
  color: ^0f0
  scale: 2
  nl
  on: 1
  :

.disp:{
  data = pat
  set = 1
}
\`\`\`

On [14seg](14seg.md), pin \`data\` (15 bits) accepts the full LUT output in one assignment — no per-segment wiring.

---

## vs \`mem\`

| | \`lut\` | \`mem\` |
|---|-------|-------|
| Timing | Combinational (same step) | Property blocks + \`on:\` trigger |
| Read | \`.name(in=…)\` / \`.name:get\` | \`.mem:get\` inside \`:{ adr = … }\` |
| Init | \`data { }\` (inline) or \`= data { }\` (comp) | \`=\` binary/hex bulk, \`.mem =\` |

---

## Common errors

| Error | Cause |
|-------|-------|
| \`Expected '.' before inline instance name\` | ASM program without dot (see [asm.md](asm.md)) |
| \`inline [lut] body requires at least one label or a data { } block\` | Empty inline LUT body |
| \`Duplicate label 'RED'\` | Label declared twice |
| \`Unknown label 'BLUE'\` | Label not found |
| \`LUT decode failed: value ... does not exist\` | Reverse lookup miss |
| \`LUT address N >= length L\` | Index outside table at runtime |
| \`LUT value must be exactly D bits\` | Value or \`fillwith\` wrong width |
| \`LUT range inverted\` | \`end < start\` in a range |
| \`requires '= data { ... }'\` | \`comp [lut]\` missing initializer |
| \`variableDepth cannot be combined with depth\` | Both attributes set |
| \`prefixFree cannot be combined with depth\` | Both attributes set |
| \`prefixFree violation: value '...' is a prefix of value '...'\` | Codewords not prefix-free |

---

## Related

- [boolean-lut.md](boolean-lut.md) — \`lutOf\` / \`exprOfLut\` (generate or reverse boolean LUTs from expressions)
- [boolean-analysis.md](boolean-analysis.md) — \`truthTableOf\`, \`simplify\`, \`equivalent\`, \`inputsOf\`, \`costOf\`
- [huffman.md](huffman.md) — end-to-end Huffman example (\`prefixFree\` + \`expand\` / \`collapse\`)
- [protocol.md](protocol.md) — \`expand\` / \`collapse\` with LUT; \`:decode()\` on channels
- [seven-seg.md](seven-seg.md), [14seg.md](14seg.md) — display decode examples (hex 0–F LUT)
- [mem.md](mem.md) — sequential RAM
- [asm.md](asm.md) — inline assembler (blob into \`mem\`)
- [debug.md](debug.md) — \`probe\`, \`show\`, \`peek\`, \`lutOf\`, \`exprOfLut\`
`,
    'matrix-reduction.md': `# Matrix element-wise mode (\`; matrix\`)

Built-ins that support **\`; vector\`** also support **\`; matrix\`** for **true 2D matrices** (\`4wire[N,M]\` with **N>1** and **M>1**), with optional **rank-1 vector** operands that broadcast (see table below).

Index: [2D tensors](wire-vectors.md) · [Tagged built-ins](builtin-tagged-index.md) · [Vector element-wise mode](vector-reduction.md#element-wise-mode-vector)

---

## When to use

| Mode | Operands | Result |
|------|----------|--------|
| (default) | scalars, expanded vectors | scalar or reduction |
| **\`; vector\`** | rank-1 tensors \`[N]\`, \`[1,N]\`, \`[N,1]\` (same \`elementCount\`) | vector per index \`:i\` |
| **\`; matrix\`** | at least one **matrix** \`[N,M]\` with **N>1, M>1** | matrix \`[N,M]\` per cell |

**\`; vector\`** and **\`; matrix\`** are **mutually exclusive** in one call.

Rank-1 shapes are **vectors**, not matrices — use **\`; vector\`** for element-wise ops on them, or pair them with a matrix under **\`; matrix\`** for broadcast.

---

## Operand broadcast (per cell \`(r,c)\`)

| Operand shape | Kind | At cell \`(r,c)\` uses |
|---------------|------|----------------------|
| Matrix \`[N,M]\` | matrix | \`M[r,c]\` |
| Scalar / plain \`Wbit\` | scalar | same scalar |
| Cell slice \`matrixA:r:c\` | scalar | \`M[r,c]\` (one **W**-bit element) |
| Row slice \`matrixA:r\` | rank-1 row | \`M[r,c]\` — same as \`[1,M]\` broadcast across columns |
| Column slice \`matrixA::c\` | rank-1 column | \`M[r,c]\` — same as \`[N,1]\` broadcast across rows |
| \`[1,M]\` or \`4wire[M]\` | rank-1 (row) | element \`c\` |
| \`[N,1]\` | rank-1 (column) | element \`r\` |

Slice operands use the same bit ranges as **\`show\`** / assignment (\`vectorB:1\` → **W** bits; \`m:0\` → row \`0\` with **M** cells). See [wire-vectors.md — indexing](wire-vectors.md#indexing-2d).

All operands must agree on **element width W**. Matrix operands must share the same **\`[N,M]\`** (or one side broadcasts as row/column/scalar/slice).

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] r, 4wire[2,2] f = ADD(m, m:0; matrix)
show(r)
\`\`\`

\`m:0\` is row \`0\` (\`0001\`, \`0010\`) broadcast to every matrix row — equivalent to \`ADD(m, 4wire[1,2] row; matrix)\` with \`row = 0001 + 0010\`.

---

## Functions with \`; matrix\`

Same set as **\`; vector\`**, **except**:

| Function | \`; matrix\` | Notes |
|----------|------------|--------|
| SUM, ADD, SUBTRACT, MULTIPLY, DIVIDE, MAC | yes | dual returns per cell where scalar form has two outputs |
| MIN, MAX, CLAMP | yes | one matrix output |
| GT, LT, EQ | yes | \`1wire[rows×cols]\` — one bit per cell (packed) |
| LSHIFT, RSHIFT, LROTATE, RROTATE, REVERSE | yes | per-cell transform |
| **DOT** | **no** | shape-based only — [builtin-DOT.md](builtin-DOT.md) |
| **ARGMAX**, **ARGMIN** | **no** | whole-matrix / axis \`; row\` / \`; col\` — [builtin-ARGMAX.md](builtin-ARGMAX.md) |

Per-function pages: [builtin-tagged-index.md](builtin-tagged-index.md).

---

## Tags combined with \`; matrix\`

| Tag | With \`; matrix\` |
|-----|-----------------|
| \`signed\` | Signed ops per cell (\`; signed matrix\` ≡ \`; matrix signed\`) |
| \`vector\` | **Error** — mutually exclusive |
| \`index\` | Only on ARGMAX/ARGMIN (not with \`; matrix\`) |
| \`row\`, \`col\` | Axis reduction on SUM/MIN/MAX/ARGMAX/ARGMIN — mutually exclusive with \`vector\` and \`matrix\` |

---

## Axis reduction (\`; row\` / \`; col\`) {#axis-reduction-row--col}

Separate from **\`; matrix\`** (per-cell element-wise ops). **\`; row\`** and **\`; col\`** collapse one axis of a **true matrix**:

| Tag | Meaning | SUM / MIN / MAX | ARGMAX / ARGMIN |
|-----|---------|-----------------|-----------------|
| **\`; row\`** | reduce across columns | \`Wbit[N]\` (+ over for SUM) | one-hot \`1wire[N×M]\` or \`; index\` → \`bitIndexWidth(M) wire[N]\` |
| **\`; col\`** | reduce across rows | \`Wbit[M]\` | one-hot \`1wire[N×M]\` or \`; index\` → \`bitIndexWidth(N) wire[M]\` |

Whole-matrix ARGMAX/ARGMIN (no axis tag) still returns global one-hot or \`(row, col)\` indices.

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] r, 4wire[2] o = SUM(m; row)
1wire[2] idx = ARGMAX(m; row; index)
show(r)
show(idx)
\`\`\`

---

## Output width

| Built-in | Matrix output |
|----------|----------------|
| SUM, ADD, SUBTRACT, MULTIPLY, MAC | \`Wbit[N,M]\` result + \`Wbit[N,M]\` flag/over |
| DIVIDE | \`Wbit[N,M]\` quotient + \`Wbit[N,M]\` mod |
| MIN, MAX, CLAMP | \`Wbit[N,M]\` |
| GT, LT, EQ | \`1wire[rows×cols]\` (one bit per cell, row-major) |
| Shifts / rotates / REVERSE | same shape as input matrix |

Declare the target wire as **\`4wire[N,M]\`** for **\`; matrix\`**, or **\`4wire[N]\`** / **\`4wire[N,1]\`** / **\`4wire[1,N]\`** for **\`; vector\`** (matching \`elementCount\`).

---

## Examples (per function)

Worked examples with **\`; matrix\`** are on each built-in page — not duplicated here:

| Function | Page |
|----------|------|
| SUM, MIN, MAX | [builtin-SUM.md](builtin-SUM.md) · [builtin-MIN.md](builtin-MIN.md) · [builtin-MAX.md](builtin-MAX.md) |
| ADD, SUBTRACT, MULTIPLY, DIVIDE, MAC | [builtin-ADD.md](builtin-ADD.md) · … · [builtin-MAC.md](builtin-MAC.md) |
| GT, LT, EQ, CLAMP | [builtin-GT.md](builtin-GT.md) · … · [builtin-CLAMP.md](builtin-CLAMP.md) |
| LSHIFT, RSHIFT, LROTATE, RROTATE, REVERSE | [builtin-LSHIFT.md](builtin-LSHIFT.md) · … · [builtin-REVERSE.md](builtin-REVERSE.md) |

Full index: [builtin-tagged-index.md](builtin-tagged-index.md).

---

## Oriented vectors (\`; vector\`, not \`; matrix\`)

Pair **\`4wire[N]\`** + **\`4wire[N,1]\`** with **\`; vector\`** on SUM/ADD uses rank-1 broadcast (different from matrix mode). See [wire-vectors.md — oriented vector](wire-vectors.md#oriented-vector-rank-1-broadcast).

---

## See also

[wire-vectors.md](wire-vectors.md) · [vector-reduction.md](vector-reduction.md) · [builtin-tagged-index.md](builtin-tagged-index.md)
`,
    'mem.md': `# Memory Component (mem)

The \`mem\` component implements a RAM memory with configurable number of addresses (\`length\`) and bits per address (\`depth\`). Each address stores one binary word of \`depth\` bits.

Program **composition** (\`use\`, \`align\`, \`base:\`, …) is handled when assembling ASM wires; mem receives the final blob unchanged. See [asm-composition.md](asm-composition.md).

---

## Syntax

\`\`\`
comp [mem] .name:
  depth: 8
  length: 16
  on: raise
  :
\`\`\`

Minimal form (all defaults):

\`\`\`
comp [mem] .name::
\`\`\`

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| \`depth\`   | integer | \`4\`     | Number of bits per address (word size) |
| \`length\`  | integer | \`3\`     | Number of addresses |
| \`on\`      | mode    | \`raise\` | Trigger mode for property blocks: \`raise\`, \`edge\`, \`1\`, \`0\` |

---

## Initialization

Memory can be initialized at declaration time using \`=\`. The initializer is split into chunks of \`depth\` bits, one per address starting from address 0. All other addresses are set to \`0\`.

### Binary literal

\`\`\`
comp [mem] .rom:
  depth: 4
  length: 8
  = 10110011
  :
\`\`\`

\`10110011\` is 8 bits, \`depth\` is 4 → two addresses:
- address 0 = \`1011\`
- address 1 = \`0011\`
- addresses 2–7 = \`0000\`

### Hex literal

\`\`\`
16wire init = ^ffff

comp [mem] .ram:
  depth: 8
  length: 16
  = ^ffff
  :
\`\`\`

\`^ffff\` = \`1111111111111111\` (16 bits), \`depth\` is 8 → two addresses:
- address 0 = \`11111111\`
- address 1 = \`11111111\`
- addresses 2–15 = \`00000000\`

### Variable reference

\`\`\`
16wire d = ^ffff

comp [mem] .ram:
  depth: 8
  length: 16
  = d
  :
\`\`\`

The variable \`d\` must already be declared before the \`comp\` statement. The value is read at the time of declaration. Same splitting behavior as a literal.

### ASM program

Instead of hand-encoding hex, initialize program ROM from an [inline ASM](asm.md) instance. The ISA name **must** start with \`.\` (e.g. \`.myisa\`, not \`myisa\`).

\`\`\`
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  :
\`\`\`

At declaration:

\`\`\`
comp [mem] .prog:
  depth: 8
  length: 4
  = .myisa {
    NOP
    LOAD R1 A3
  }
  :
\`\`\`

The assembler produces one \`depth\`-bit word per instruction; words are packed into the mem blob in order (address 0, 1, 2, …).

**Validations:** \`wordWidth\` of the ISA must equal \`mem.depth\`; number of instructions must not exceed \`mem.length\`.

Runtime reload (resets all addresses, then writes from address 0):

\`\`\`
.prog = .myisa { NOP; LOAD R1 A3 }
\`\`\`

See [asm.md](asm.md) for ISA syntax, labels, and errors.

Runnable coverage here is **partial** — declaration init and runtime reload only. A full system demo (CPU + inline components together) is planned separately; see [future-component-ideas.md](future-component-ideas.md).

### Runnable — ASM init at declaration

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  = .myisa {
    NOP
    LOAD R1 A3
  }
  :

8wire w0 = .prog:get
show(w0)
\`\`\`

First ROM slot = first assembled instruction (\`NOP\` → \`00000000\`).

### Runnable — runtime reload (\`.mem = .isa { … }\`)

Empty \`mem\` at declaration; program loaded on assignment (all addresses cleared first):

\`\`\`logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  :

.prog = .myisa { NOP; LOAD R1 A3 }
8wire w0 = .prog:get
show(w0)
\`\`\`

Same result as init-at-declaration for address 0; use this pattern when the program is chosen or patched after setup.

### Padding

If the initializer is shorter than \`depth\`, it is padded with leading zeros:

\`\`\`
4wire short = 11

comp [mem] .m:
  depth: 8
  length: 4
  = short
  :
# address 0 = 00000011
\`\`\`

---

## Bulk assignment — \`.mem = value\`

After declaration, memory can be re-initialized using direct assignment. This **resets all addresses to \`0\`** first, then writes the new value starting at address 0.

\`\`\`
comp [mem] .ram:
  depth: 8
  length: 16
  :

16wire d = ^f0f0
.ram = d
# address 0 = 11110000
# address 1 = 11110000
# addresses 2–15 = 00000000
\`\`\`

The value is split into \`depth\`-bit chunks exactly like initialization. The number of chunks must not exceed \`length\`.

> **Note:** \`.mem = value\` always resets the entire memory before writing. To write a single address without affecting others, use the \`:adr\`, \`:data\`, \`:write\` property block.

---

## Property block — read and write

### Reading (\`:adr\` + \`:get\`)

Set the address in a property block, then read via \`:get\`:

\`\`\`
.ram:{
  adr = 0010    # address 2
}

8wire val = .ram:get   # reads address 2
\`\`\`

### Writing (\`:adr\` + \`:data\` + \`:write\`)

\`\`\`
.ram:{
  adr   = 0001    # address 1
  data = 10101010
  write = 1
}
\`\`\`

When \`write = 1\`, the value in \`data\` is written to address \`adr\`.

### Writing multiple addresses at once

If \`data\` is a multiple of \`depth\`, multiple consecutive addresses are written starting from \`at\`:

\`\`\`
.ram:{
  adr   = 0000
  data = 1111000011110000   # 16 bits, depth=8 → 2 addresses
  write = 1
}
# address 0 = 11110000
# address 1 = 11110000
\`\`\`

---

## Pins and pouts

| Name    | Type | Description |
|---------|------|-------------|
| \`adr\`    | pin  | Address to read or write (binary, \`log2(length)\` bits) |
| \`data\`  | pin  | Data to write (one or more \`depth\`-bit words) |
| \`write\` | pin  | \`1\` = write \`data\` to \`adr\`; \`0\` = do nothing |
| \`get\`   | pout | Value at the current address (\`adr\`) |

---

## Direct value (\`:get\` at address 0)

Reading the component directly (without \`:adr\`) returns the value at address 0:

\`\`\`
8wire x = .ram:get       # address is 0 by default
8wire y = .ram:get;16    # padded to 16 bits
\`\`\`

---

## Bit range and padding on reads

The \`;p\` padding operator and bitrange work on memory reads:

\`\`\`
8wire a = .ram:get;16        # pad address-0 value to 16 bits
4wire b = .ram:get.0-3       # bits 0–3 of address-0 value
8wire c = .ram:get.0-3;8     # bits 0–3, then pad to 8
\`\`\`

---

## Component type documentation

\`\`\`
doc(comp.mem)
\`\`\`

Output:

\`\`\`
comp [mem] .name:
  length: integer
  depth: integer
  on: raise/edge/1/0
  = Xbit
  :{
    Xpin adr
    1pin write
    Xpin data
    Xpout get
  }
  -> Xbit
\`\`\`

The \`= Xbit\` line indicates that \`mem\` accepts an initializer. The value is split into \`depth\`-bit chunks — see the **Initialization** section above for the full behavior.

---

## Multi-port memory (\`ports\`)

A single physical memory array can expose **1–4 independent ports** in the same simulation step (e.g. Harvard CPU fetch + data access, or CPU + DMA).

| Attribute | Default | Description |
|-----------|---------|-------------|
| \`ports\` | \`1\` | Number of ports (1–4) |
| \`readonly\` | off | Blocks writes from property blocks; init (\`=\`) and \`.mem =\` still allowed |

Port 1 uses \`adr\`, \`data\`, \`write\`, \`get\`. Port 2+ prefix the pin names: \`2adr\`, \`2data\`, \`2write\`, \`2get\`, … up to \`4get\`.

\`\`\`logts-play
comp [mem] .ram:
  ports: 2
  length: 4
  depth: 4
  on: 1
  = 1010
  :

4wire a0 = 0000
4wire a1 = 0001
.ram:{ adr = a0
  set = 1 }
4wire v0 = .ram:get
.ram:{ 2adr = a1
  set = 1 }
4wire v1 = .ram:2get
show(v0)
show(v1)
\`\`\`

**Write rules:** writes are queued per simulation step and committed together. If two ports write the same address in one step → \`Memory write collision at address N\` (storage unchanged). Reads (\`:get\`, \`:2get\`, …) are combinational from committed storage (value from the previous step).

**Read-only (\`readonly\`):** use for program ROM semantics — property-block writes are rejected; bulk assign and declaration init still work.

**Redirect reads in one block:** use \`get >= wire\` for port 1 and \`2get >= wire\` for port 2 (also \`3get>\`, \`4get>\`). Multiple ports may be read in the same property block after setting each port’s \`adr\` pin.

\`\`\`logts-play
comp [mem] .ram:
  ports: 2
  length: 4
  depth: 4
  on: 1
  = 1010
  :

4wire a0 = 0000
4wire a1 = 0001
4wire v0
4wire v1
.ram:{
  adr = a0
  get >= v0
  2adr = a1
  2get >= v1
  set = 1
}
show(v0)
show(v1)
\`\`\`

Dual writes in one block (different addresses, no collision): set \`write\`/\`data\` on port 1 and \`2write\`/\`2data\` on port 2 in the same \`{ … }\` block.

> **Breaking change (v0.3.x):** the address pin was renamed from \`at\` to **\`adr\`**. Update all \`comp [mem]\` property blocks and inline assignments (\`.data:adr = …\`).

---

## Notes

- \`depth\` is the **word size** — the number of bits stored per address.
- \`length\` is the **number of addresses** — the total number of words.
- Initializers: binary/hex literal, wire variable, or **ASM program** (\`= .isa { ... }\`) — see [asm.md](asm.md).
- The literal initializer (\`= value\`) splits the value into \`depth\`-bit chunks. The last chunk is padded with leading zeros if shorter than \`depth\`.
- \`.mem = value\` (or \`.mem = .isa { ... }\`) resets **all** addresses to \`0\` before writing, even those not covered by the value.
- To write individual addresses without resetting others, always use the \`:adr\`, \`:data\`, \`:write\` property block.
- \`getMem\`/\`setMem\` are browser-side functions. In the test environment (Node.js), address 0 is accessible via \`comp.initialValue\`; other addresses require the browser runtime.

---

## Related

- [asm.md](asm.md) — define ISA and load programs into \`mem\`
- [lut.md](lut.md) — combinational lookup (different from sequential \`mem\`)
- [mini-cpu.md](mini-cpu.md) — teaching CPU using \`comp [mem]\` for program and data
- [mini-cpu-v2.md](mini-cpu-v2.md) — full CPU demo with ASM ROM and \`BEQ\`
`,
    'meta-constants.md': `# Meta constants

Meta constants are **run-time literals** resolved when you press **Run**. They are not wires and not expression operands like \`~\`, \`%\`, or \`$\`.

Syntax: \`/name/\` (slashes required).

See also: [assignment operators — \`:\` init](assignment-operators.md#-initial-assignment), [editor UI — instances](editorUI.md).

---

## Summary

| | Special vars (\`~\` \`%\` \`$\`) | Meta constants (\`/instance/\`) |
|--|--|--|
| Where | expressions, \`show\`, \`probe\` | **only** \`Nwire name : /name/\` at **top level** |
| When value is fixed | changes during run (\`%\`, \`$\`) | fixed for the whole run |
| Scope | general | top-level script only (not chip/pcb/board) |

---

## \`/instance/\`

Returns the **editor run instance** (1–5) as a **4-bit binary** value:

| Instance | Value |
|----------|-------|
| 1 | \`0001\` |
| 2 | \`0010\` |
| 3 | \`0011\` |
| 4 | \`0100\` |
| 5 | \`0101\` |

The instance number comes from the toolbar **Inst** selector on the tab that runs the script (see [editorUI.md](editorUI.md)).

### Syntax

\`\`\`logts
4wire instance : /instance/
\`\`\`

After init, \`instance\` is a normal wire — use \`show(instance)\`, \`probe(instance)\`, etc.

### Width rules

The canonical value is **4 bits**. Wire width uses the same pad/truncate rules as other \`:\` literals:

- **shorter wire** → left-pad with \`0\` (e.g. \`8wire\` on inst 1 → \`00000001\`)
- **longer value than wire** → keep the **least significant** bits (e.g. \`3wire\` on inst 1 → \`001\`)

### Multi-tab example

Same script on two tabs, different instances:

\`\`\`logts
4wire inst : /instance/
show(inst)
\`\`\`

- Tab A, **Run** on instance **1** → \`inst = 0001\`
- Tab B, **Run** on instance **2** → \`inst = 0010\`

### Not allowed

| Construct | Result |
|-----------|--------|
| \`4wire x = /instance/\` | parse error |
| \`show(/instance/)\` | parse error |
| \`probe(/instance/)\` | parse error |
| inside \`chip\` / \`pcb\` / \`board\` body | parse error |

---

## Future

\`/signalStrategy/\` (planned): \`legacy\` → \`0001\`, \`wave\` → \`0010\` from the tab propagation mode.
`,
    'mini-cpu-plan.md': `# Mini CPU / ALU with memory — feasibility

## Short answer

**Yes** — you can build a small demonstrator script (“CPU with 1 register + RAM + ALU”) using only what exists today. **\`comp [mem]\` alone is not enough conceptually**, but together with a few existing language primitives you cover ALU + storage + execution steps.

**No new component types** are required in the engine for a teaching demo. What is “missing” is mostly **organization** (chips/boards) and **clock discipline** (one step = one pulse), not new types (\`instruction\`, \`bus\`, etc.).

---

## What you already have (enough for a mini-CPU)

| CPU role | LogTScript primitive | Notes |
|----------|----------------------|-------|
| **RAM / program** | \`comp [mem]\` | ROM init with \`= ^hex\`, \`= .isa { … }\` ([inline ASM](asm.md)), or \`.ram =\` reload — [mem.md](mem.md) |
| **ALU (ADD/SUB/AND…)** | \`comp [adder]\` / \`[subtract]\` or \`ADD()\` / \`SUBTRACT()\` | For a persistent CPU, prefer **components** in a \`chip\`, not instant functions — [adder.md](adder.md) |
| **Operation select** | \`MUX\` | Pick ALU result from a few instruction bits |
| **Accumulator / IR** | \`REG(data, clk, clr)\` or \`comp [reg]\` | State between steps — [reg.md](reg.md) |
| **Program counter** | \`comp [counter]\` | Load + increment on \`dir\` — [counter.md](counter.md) |
| **Flags (carry, zero)** | \`carry\` from adder; \`EQ\` for zero | No dedicated “flags” component |
| **Shift** (optional) | \`LSHIFT\` / \`RSHIFT\` or \`comp [shifter]\` | Not required for simple instructions |
| **Clock / step** | \`comp [key]\` or \`comp [osc]\` + \`comp [switch]\` | One **step** = one pulse (manual or automatic) |
| **UI program / state** | \`board\` + \`dip\`, \`switch\`, \`led\`, \`7seg\` | Board allows panel + wave in body — [board.md](board.md) |
| **Reusable logic** | \`chip\` (ALU, decoder) inside \`board\` (system) | ALU without UI in chip; mem + display in board — [chip.md](chip.md) |

\`\`\`mermaid
flowchart TB
  subgraph board [board miniCPU]
    UI[dip_switch_key_led]
    RAM[comp_mem]
    PC[comp_counter]
    ACC[REG_or_reg]
    subgraph chipAlu [chip aluCore]
      MUX[MUX_op_select]
      ADD[comp_adder]
      SUB[comp_subtract]
    end
    UI --> PC
    PC --> RAM
    RAM --> ACC
    ACC --> chipAlu
    chipAlu --> ACC
  end
\`\`\`

---

## Recommended architecture

### Variant A — “Teaching Harvard” (implemented)

- **\`mem\` program** (ROM): instructions preloaded with \`= ^....\` or \`= .cpuisa { LOAD \\0; … }\` ([asm.md](asm.md))
- **\`mem\` data** (RAM): runtime variables
- **PC** (\`counter\`): current instruction address
- **Accumulator** (\`comp [reg]\`): operand + result
- **ALU** (\`chip +[alu4]\`): add/sub + MUX on \`op[1]\`
- **Top board** (\`board +[cpu4]\`): clock (\`set\`), reset (\`rst\`), display (\`7seg\`), pout \`acc\` / \`pc\` / \`ir\`

**One cycle (manual):**

1. Fetch instruction at \`PC\` from program memory
2. Simple decode (high nibble = opcode, low nibble = operand)
3. Execute (ALU / mem write / mem load / jump)
4. \`PC++\` or load new PC on jump
5. Wait for next pulse on \`set\`

See [mini-cpu.md](mini-cpu.md) for the ISA and full script.

### Variant B — “ALU demo” (no full fetch)

DIP for operands + opcode, \`adder\`/\`subtract\`, \`led\`/\`7seg\` for result. **No program memory** — useful as a first step before a full CPU.

---

## What you do NOT need as a new component type

| Idea | Existing alternative |
|------|----------------------|
| “Instruction register” | \`REG\` / wire + property block on step |
| “Bus” | MUX + wiring in chip |
| “Hardware decoder” | \`chip\` with MUX on opcode; or top-level \`def\` |
| “Stack” | second \`counter\` + \`mem\` |
| “Program loader” | \`mem\` init with \`=\`, \`.ram = ^hex\`, or \`inline [asm]\` + \`= .isa { … }\` — [asm.md](asm.md) |

---

## Limitations to keep in mind

1. **\`mem\` is not combinational** — read/write goes through property blocks (\`at\`, \`write\`, \`set\`). Design the CPU **clocked / step-by-step**.
2. **Wave in board** — predictable behavior per step; avoid implicit combinational loops in the same tick.
3. **Small widths** — for demo: \`depth: 4\`, \`length: 8–16\`, 4-bit opcode (high nibble), ~6 instruction types.
4. **\`def\` in board/chip body** — forbidden; decode logic via wiring/MUX.

---

## Implementation steps (variant A)

1. **ALU chip** (\`chip +[alu4]\`): \`a\`, \`b\`, \`op[2]\`, \`result\`, \`carry\`
2. **Step CPU board** (\`board +[cpu4]\`): program mem, data mem, PC, ACC, ALU instance, pin \`set\`, \`7seg\`, pout \`acc\`/\`pc\`/\`ir\`
3. **Minimal ISA** on 8 bits: opcode nibble + operand nibble
4. Tests + \`probe(.cpu:acc)\`; demo program in ROM
`,
    'mini-cpu-v2.md': `# Mini CPU v2 (Harvard, ASM, BEQ, terminal)

Teaching demo built on [mini-cpu.md](mini-cpu.md) (v1). Same 4-bit Harvard stepping model, with **ASM ROM**, **\`comp [lut]\` decode**, **\`BEQ\`**, **\`ZERO()\`**, **\`chip [alu4]\`** (no duplicate adder/subtract in the board), and **\`comp [terminal]\`** trace on \`HALT\`.

Feasibility notes: [mini-cpu-plan.md](mini-cpu-plan.md). v1 script and tests (859–866) are unchanged.

---

## What is new vs v1

| Topic | v1 | v2 |
|-------|----|----|
| Program ROM | \`= ^10334221\` (hand hex) | ASM via \`inline [asm]\` + \`romblob\` wire |
| Opcode decode | 6× \`EQ\` + \`MUX\` | \`comp [lut] .ctl\` control word ([lut.md](lut.md)) |
| Branches | \`JMP\` only | \`JMP\` (absolute) + \`BEQ\` (relative, signed) |
| Zero test | — | \`ZERO(curacc)\` ([builtin-bit-selection-functions.md](builtin-bit-selection-functions.md)) |
| ALU in board | Duplicate \`adder\` / \`subtract\` | \`chip [alu4] .alu:\` instance |
| I/O | \`7seg\` only | \`7seg\` + \`terminal\` on \`HALT\` |
| Wire names | — | **No \`_\` in identifiers** (\`_\` is a special token in LogTScript) |

---

## Architecture

| Block | Role |
|-------|------|
| \`chip +[alu4]\` | 4-bit ADD/SUB (\`op.1\` selects) |
| \`board +[cpu4v2]\` | Fetch-decode-execute per \`set\` pulse |
| \`comp [mem] .prog\` | ROM 8×8, init from ASM \`romblob\` |
| \`comp [mem] .data\` | RAM 16×4 (\`= ^3\` → address 0 = 3) |
| \`comp [lut] .ctl\` | Opcode → 7-bit control (\`load\`…\`halt\` flags) |
| \`comp [counter] .pcnt\` | PC (load + increment) |
| \`comp [reg] .accum\` | Accumulator |
| \`comp [7seg] .disp\` | Hex ACC |
| \`comp [terminal] .trace\` | Appends \`A\` on \`HALT\` (demo trace) |
| \`comp [adder] .pcinc\` / \`.bradd\` | \`PC+1\` and branch target for \`BEQ\` |

\`\`\`mermaid
flowchart LR
  PC[pcnt] -->|adr| PROG[prog ROM]
  PROG -->|instr| LUT[ctl LUT]
  LUT --> CTRL[control flags]
  ACC[accum] --> ALU[chip alu4]
  ALU --> ACC
  DATA[data RAM] --> ACC
  ACC --> ZERO[ZERO]
  ZERO --> BEQ[BEQ branch]
  BEQ --> PC
\`\`\`

---

## ISA (8 bits: opcode + operand)

Format: \`[opcode:4][operand:4]\` — \`instr.0/4\` = opcode, \`instr.4/4\` = operand.

| Opcode | Mnemonic | Effect |
|--------|----------|--------|
| \`0000\` | NOP | No effect |
| \`0001\` | LOAD | \`ACC ← RAM[operand]\` |
| \`0010\` | STORE | \`RAM[operand] ← ACC\` |
| \`0011\` | ADDI | \`ACC ← ACC + operand\` |
| \`0100\` | SUBI | \`ACC ← ACC - operand\` |
| \`0101\` | JMP | \`PC ← operand\` (absolute) |
| \`0110\` | BEQ | If \`ACC = 0\`: \`PC ← PC + 1 + signed_offset\` |
| \`0111\` | HALT | Stop PC increment |

\`\`\`logts
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + 4b
  STORE : 0010 + 4b
  ADDI  : 0011 + 4b
  SUBI  : 0100 + 4b
  JMP   : 0101 + 4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :
\`\`\`

---

## Demo program (countdown + loop)

\`RAM[0] = 3\`. Loop subtracts until \`ACC = 0\`, then \`BEQ\` exits to \`HALT\`.

\`\`\`logts
40wire romblob = .cpuisa {
  LOAD \\0
loop:
  SUBI \\1
  BEQ done
  JMP loop
done:
  HALT
}

comp [mem] .prog:
  depth: 8
  length: 8
  = romblob
  on: raise
  :
\`\`\`

**Trace (9 steps from reset):** ACC \`3→2→1→0\`, then \`HALT\` at PC \`4\`.

---

## LUT opcode decode

\`comp [lut]\` inside the board is the usual choice for per-cycle decode with \`.ctl:in\` / \`.ctl:get\`.

Alternatively, declare \`inline [lut] .ctl\` at **top level** and reference it from the board with **\`^.ctl\`** (global ref — no instance prefix). Example: \`^.ctl:LOAD\`, \`^.ctl(in = opc)\`, \`doc(^.ctl)\`.

\`^.name\` works for any top-level \`inline\` (\`asm\`, \`lut\`, \`protocol\`) from inside board/chip/pcb bodies. Hex literals are unchanged: \`^FF\` is not global.

Control word (7 bits, LSB = bit \`ctl.6/1\`):

| Flag | Bit | \`1\` when |
|------|-----|----------|
| load | \`ctl.6/1\` | LOAD |
| store | \`ctl.5/1\` | STORE |
| addi | \`ctl.4/1\` | ADDI |
| subi | \`ctl.3/1\` | SUBI |
| jmp | \`ctl.2/1\` | JMP |
| beq | \`ctl.1/1\` | BEQ |
| halt | \`ctl.0/1\` | HALT |

\`\`\`logts-play
comp [lut] .ctl:
  depth: 7
  length: 16
  fillwith: 0000000
  = data {
    0001: 0000001
    0010: 0000010
    0011: 0000100
    0100: 0001000
    0101: 0010000
    0110: 0100000
    0111: 1000000
  }
  :

4wire opc = 0110
.ctl:in = opc
7wire ctl = .ctl:get
1wire isbeq = ctl.1/1
show(isbeq)
\`\`\`

v1 used separate \`EQ(opc, …)\` lines — same semantics, more wiring.

---

## BEQ and \`ZERO\`

\`\`\`logts
curacc = .accum:get
iszero = ZERO(curacc)
isbeqtaken = AND(isbeq, iszero)
\`\`\`

Branch target: \`brtgt = (PC + 1) + signed_offset\` (two \`comp [adder]\` stages: \`.pcinc\`, \`.bradd\`).

Load PC on branch or jump:

\`\`\`logts
pcload = MUX(isbeqtaken, opd, brtgt)
\`\`\`

\`MUX(sel, when0, when1)\` — when \`sel = 1\`, the **third** argument is selected. So \`sel = 1\` → \`brtgt\`, \`sel = 0\` → \`opd\` (used for \`JMP\`).

\`\`\`logts
dobranch = OR(isjmp, isbeqtaken)
.pcnt:{ data = pcload
  write = 1
  set = AND(dobranch, set) }
doinc = AND(NOT(ishalt), NOT(dobranch))
\`\`\`

---

## Terminal on HALT

\`\`\`logts
comp [terminal] .trace:
  rows: 4
  columns: 20
  on: 1
  :

.trace:{ append = ^41
  set = AND(ishalt, set) }
\`\`\`

After the full countdown, the terminal shows \`A\` (hex \`^41\`). See [terminal.md](terminal.md).

---

## Runnable complete example

### mini-cpu-v2-full

Prelude: ISA + ROM + \`chip [alu4]\` + \`board +[cpu4v2]\` (definitions only).

\`\`\`logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + 4b
  STORE : 0010 + 4b
  ADDI  : 0011 + 4b
  SUBI  : 0100 + 4b
  JMP   : 0101 + 4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :
40wire romblob = .cpuisa {
  LOAD \\0
loop:
  SUBI \\1
  BEQ done
  JMP loop
done:
  HALT
}

chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y
board +[cpu4v2]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 8
    = romblob
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^3
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [terminal] .trace:
    rows: 4
    columns: 20
    on: 1
    :
  comp [adder] .pcinc:
    depth: 4
    on: 1
    :
  comp [adder] .bradd:
    depth: 4
    on: 1
    :
  comp [lut] .ctl:
    depth: 7
    length: 16
    fillwith: 0000000
    = data {
      0000: 0000000
      0001: 0000001
      0010: 0000010
      0011: 0000100
      0100: 0001000
      0101: 0010000
      0110: 0100000
      0111: 1000000
    }
    :
  chip [alu4] .alu::
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire aluy
  7wire ctl
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire isbeq
  1wire ishalt
  1wire iszero
  1wire isbeqtaken
  1wire dobranch
  1wire doinc
  1wire inc
  2wire aluop
  4wire t0
  4wire t1
  4wire accnext
  4wire pcplus1
  4wire brtgt
  4wire pcload
  pcval = .pcnt:get
  .prog:{ adr = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  .ctl:in = opc
  ctl = .ctl:get
  isload = ctl.6/1
  isstore = ctl.5/1
  isaddi = ctl.4/1
  issubi = ctl.3/1
  isjmp = ctl.2/1
  isbeq = ctl.1/1
  ishalt = ctl.0/1
  curacc = .accum:get
  iszero = ZERO(curacc)
  isbeqtaken = AND(isbeq, iszero)
  dobranch = OR(isjmp, isbeqtaken)
  .data:adr = opd
  .data:{ set = set }
  loadval = .data:get
  aluop = MUX(issubi, 00, 01)
  .alu:a = curacc
  .alu:b = opd
  .alu:op = aluop
  aluy = .alu:y
  t0 = MUX(issubi, curacc, aluy)
  t1 = MUX(isaddi, t0, aluy)
  accnext = MUX(isload, t1, loadval)
  .pcinc:a = pcval
  .pcinc:b = 0001
  pcplus1 = .pcinc:get
  .bradd:a = pcplus1
  .bradd:b = opd
  brtgt = .bradd:get
  pcload = MUX(isbeqtaken, opd, brtgt)
  .pcnt:{ data = pcload
    write = 1
    set = AND(dobranch, set) }
  doinc = AND(NOT(ishalt), NOT(dobranch))
  inc = AND(doinc, set)
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:adr = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  .trace:{ append = ^41
    set = AND(ishalt, set) }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc
\`\`\`

### mini-cpu-v2-demo

Same prelude + \`.cpu\` instance + full countdown (9 clock steps) + \`probe\`.

\`\`\`logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + 4b
  STORE : 0010 + 4b
  ADDI  : 0011 + 4b
  SUBI  : 0100 + 4b
  JMP   : 0101 + 4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :
40wire romblob = .cpuisa {
  LOAD \\0
loop:
  SUBI \\1
  BEQ done
  JMP loop
done:
  HALT
}

chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y
board +[cpu4v2]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 8
    = romblob
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^3
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [terminal] .trace:
    rows: 4
    columns: 20
    on: 1
    :
  comp [adder] .pcinc:
    depth: 4
    on: 1
    :
  comp [adder] .bradd:
    depth: 4
    on: 1
    :
  comp [lut] .ctl:
    depth: 7
    length: 16
    fillwith: 0000000
    = data {
      0000: 0000000
      0001: 0000001
      0010: 0000010
      0011: 0000100
      0100: 0001000
      0101: 0010000
      0110: 0100000
      0111: 1000000
    }
    :
  chip [alu4] .alu::
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire aluy
  7wire ctl
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire isbeq
  1wire ishalt
  1wire iszero
  1wire isbeqtaken
  1wire dobranch
  1wire doinc
  1wire inc
  2wire aluop
  4wire t0
  4wire t1
  4wire accnext
  4wire pcplus1
  4wire brtgt
  4wire pcload
  pcval = .pcnt:get
  .prog:{ adr = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  .ctl:in = opc
  ctl = .ctl:get
  isload = ctl.6/1
  isstore = ctl.5/1
  isaddi = ctl.4/1
  issubi = ctl.3/1
  isjmp = ctl.2/1
  isbeq = ctl.1/1
  ishalt = ctl.0/1
  curacc = .accum:get
  iszero = ZERO(curacc)
  isbeqtaken = AND(isbeq, iszero)
  dobranch = OR(isjmp, isbeqtaken)
  .data:adr = opd
  .data:{ set = set }
  loadval = .data:get
  aluop = MUX(issubi, 00, 01)
  .alu:a = curacc
  .alu:b = opd
  .alu:op = aluop
  aluy = .alu:y
  t0 = MUX(issubi, curacc, aluy)
  t1 = MUX(isaddi, t0, aluy)
  accnext = MUX(isload, t1, loadval)
  .pcinc:a = pcval
  .pcinc:b = 0001
  pcplus1 = .pcinc:get
  .bradd:a = pcplus1
  .bradd:b = opd
  brtgt = .bradd:get
  pcload = MUX(isbeqtaken, opd, brtgt)
  .pcnt:{ data = pcload
    write = 1
    set = AND(dobranch, set) }
  doinc = AND(NOT(ishalt), NOT(dobranch))
  inc = AND(doinc, set)
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:adr = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  .trace:{ append = ^41
    set = AND(ishalt, set) }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc
board [cpu4v2] .cpu::

loop 1..9[
.cpu:{ set = 1 }
]

probe(.cpu:acc)
probe(.cpu:pc)
\`\`\`

**Result** after **Load & Run**: ACC = \`0000\`, PC = \`0100\` (HALT). 7-seg: \`0\`. Terminal: \`A\` (\`^41\`). In Output: \`# .cpu:acc = 0000\`, \`# .cpu:pc = 0100\`.

After **one** clock step: ACC = \`0011\` (loads \`^3\` from data memory), PC = \`0001\`.

---

## Advanced (optional)

### Call stack with \`comp [queue]\`

Push/pop return addresses on \`comp [queue]\` — see [queue.md](queue.md). Not required for the minimal demo.

### Harvard fetch + data in one step (\`mem\` multi-port)

\`comp [mem]\` with \`ports: 2\` and \`readonly\` on port 1 — see [mem.md](mem.md) § Multi-port. v2 keeps two \`mem\` instances for clarity.

---

## v1 vs v2 summary

| | v1 \`cpu4\` | v2 \`cpu4v2\` |
|---|-----------|-------------|
| Instructions | 7 | 8 (+BEQ) |
| ROM encoding | Hex | ASM |
| Decode | \`EQ\` | \`comp [lut]\` |
| Board ALU | Inline add/sub | \`chip [alu4]\` |
| Tests | 859–866 | 1056–1063 |

---

## Automated tests

\`test_suite_ported.js\` — group \`mini-cpu-v2\`, IDs **1056–1063** (init, LOAD, full countdown, BEQ, probe, clock, NEXT, terminal).

In **run_tests.html**, each test's **Script** tab shows the **full LogTScript** run (constants such as \`CPU4V2_BASE\` / \`BOARD_HALFADD\` are expanded automatically from source).

---

## Related

- [mini-cpu.md](mini-cpu.md) — v1 demo
- [asm.md](asm.md) — ISA and \`BEQ\` / labels
- [lut.md](lut.md) — \`comp [lut]\` decode
- [mem.md](mem.md) — program/data memory
- [terminal.md](terminal.md) — text output
- [queue.md](queue.md) — optional stack
- [builtin-bit-selection-functions.md](builtin-bit-selection-functions.md) — \`ZERO\`
- [assignment-operators.md](assignment-operators.md) — strict \`=\` for wires
`,
    'mini-cpu.md': `# Mini CPU 4-bit (Harvard, step-by-step)

Teaching demo: a CPU with **program ROM**, **data RAM**, **PC**, **accumulator**, and **ALU** — no new engine component types. Implementation uses \`chip +[alu4]\` and \`board +[cpu4]\`.

Feasibility plan: [mini-cpu-plan.md](mini-cpu-plan.md).

---

## Architecture

| Block | Role |
|-------|------|
| \`chip +[alu4]\` | 4-bit ADD/SUB, selected with \`op.1\` |
| \`board +[cpu4]\` | Fetch-decode-execute on each \`set\` pulse |
| \`comp [mem] .prog\` | ROM 8×4 (8-bit instructions) |
| \`comp [mem] .data\` | RAM 4×16 |
| \`comp [counter] .pcnt\` | Program counter |
| \`comp [reg] .accum\` | Accumulator |
| \`comp [7seg] .disp\` | Hex ACC display (in the UI panel) |

---

## ISA (8 bits per instruction)

Format: \`[opcode:4][operand:4]\` — in memory as 8 bits, **bits 0–3 (MSB)** = opcode, **bits 4–7** = operand (\`instr.0/4\` / \`instr.4/4\` in LogTScript).

| Opcode | Mnemonic | Effect |
|--------|----------|--------|
| \`0000\` | NOP | No effect |
| \`0001\` | LOAD | \`ACC ← RAM[operand]\` |
| \`0010\` | STORE | \`RAM[operand] ← ACC\` |
| \`0011\` | ADDI | \`ACC ← ACC + operand\` |
| \`0100\` | SUBI | \`ACC ← ACC - operand\` |
| \`0101\` | JMP | \`PC ← operand\` |
| \`0111\` | HALT | Stop PC increment |

---

## Demo program (preloaded in ROM)

ROM: \`= ^10334221\` (4 words × 8 bits) — hand-encoded hex.

Equivalent via [inline ASM](asm.md) (mnemonics instead of hex):

\`\`\`logts
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + 4b
  STORE : 0010 + 4b
  ADDI  : 0011 + 4b
  SUBI  : 0100 + 4b
  JMP   : 0101 + 4b
  HALT  : 0111 + 4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  = .cpuisa {
    LOAD \\0
    ADDI \\3
    SUBI \\2
    STORE \\1
  }
  on: raise
  :
\`\`\`

Each mnemonic encodes to one 8-bit word: \`[opcode:4][operand:4]\`. Operand immediates use decimal \`\\N\` (see [asm.md](asm.md)). ISA name must be \`.cpuisa\` (with dot).

Runnable check (first ROM word only):

\`\`\`logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + 4b
  STORE : 0010 + 4b
  ADDI  : 0011 + 4b
  SUBI  : 0100 + 4b
  JMP   : 0101 + 4b
  HALT  : 0111 + 4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  = .cpuisa {
    LOAD \\0
    ADDI \\3
    SUBI \\2
    STORE \\1
  }
  :

8wire w0 = .prog:get
show(w0)
\`\`\`

Expected: \`w0\` = \`00010000\` (\`LOAD 0\` instruction).

| PC | Instr | Effect |
|----|-------|--------|
| 0 | \`LOAD 0\` | ACC = RAM[0] (= 7) |
| 1 | \`ADDI 3\` | ACC = 10 |
| 2 | \`SUBI 2\` | ACC = 8 |
| 3 | \`STORE 1\` | RAM[1] = 8 |

RAM init: \`= ^7\` → address 0 holds \`0111\` (7).

After **4 steps** (\`set = 1\` four times): **ACC = 8**, **PC = 4**.

---

## Quick example (all steps instant)

Press **Load & Run** — the program runs **4 cycles immediately** (useful for tests). To **watch 7seg change slowly**, use the oscillator example below.

In the right panel: **7seg** (ACC) + mem/counter/reg. In the console: \`probe\` + \`show\`.

\`\`\`logts-play
chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y

board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ adr = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:adr = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:adr = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc

board [cpu4] .cpu::

probe(.cpu:acc)
probe(.cpu:pc)
probe(.cpu:ir)

.cpu:{ set = 1 }
.cpu:{ set = 1 }
.cpu:{ set = 1 }
.cpu:{ set = 1 }

show(.cpu:acc)
show(.cpu:pc)
\`\`\`

**Expected result** after RUN: ACC = \`1000\` (8), PC = \`0100\` (4). After the first step: ACC = \`0111\` (7), PC = \`0001\`.

---

## Visual example — oscillator (~4 s / step)

**Load & Run** once, then:

1. Turn on the \`.run\` **switch** in the panel (enable).
2. Watch **7seg** \`.disp\` — every **~4 seconds** the CPU runs **one** cycle (oscillator rising edge).
3. LED \`.beat\` is on when \`tick = 1\` (visual clock feedback).

| Step | ACC (7seg) | PC |
|------|------------|-----|
| start | 0 | 0 |
| 1 | 7 | 1 |
| 2 | 10 | 2 |
| 3 | 8 | 3 |
| 4 | 8 | 4 |

Oscillator: \`freq: 4\`, \`freqIsSec: 1\` → **4 second** period per full cycle. The CPU advances on the **rising edge** (\`on: 1\` + \`.cpu:{ set = step }\`).

\`\`\`logts-play
chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y

board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ adr = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:adr = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:adr = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc

board [cpu4] .cpu::

comp [switch] .run::
comp [~] .tick:
  freq: 4
  freqIsSec: 1
  duration1: 1
  duration0: 3
  :
comp [led] .beat::

1wire enabled = .run:get
1wire tick = .tick:get
1wire step = AND(tick, enabled)

.cpu:{ set = step }

.beat = tick
\`\`\`

---

## Visual example — key (one step per click)

Copy the \`chip +[alu4]\` and \`board +[cpu4]\` definitions from the oscillator example, then use the tail below (or replace the oscillator/switch/led block):

\`\`\`logts-play
board [cpu4] .cpu::

comp [key] .step::

.cpu:{ set = .step:get }
\`\`\`

**Load & Run**, then press the **\`.step\`** key in the panel — each press = one CPU cycle; **7seg** updates immediately.

---

## NEXT(~) example — step from toolbar

Same setup, after definitions + \`board [cpu4] .cpu::\`:

\`\`\`logts-play
board [cpu4] .cpu::

.cpu:{ set = ~ }
\`\`\`

**Load & Run** (no \`NEXT\` in the script), then press the **NEXT** toolbar button **4 times** — each NEXT = one cycle. Watch **7seg** and the variables panel.

---

## Manual usage

| Action | Script |
|--------|--------|
| Instantiate | \`board [cpu4] .cpu::\` |
| One CPU cycle | \`.cpu:{ set = 1 }\` |
| Read ACC / PC / IR | \`4wire a = .cpu:acc\` etc. or \`probe(.cpu:acc)\` |
| Reset | \`.cpu:{ rst = 1 }\` |

With an interactive panel: \`comp [key]\` on the instance \`.cpu\` \`set\` pin (see [key.md](key.md)).

---

## Related

- [mem.md](mem.md) — program ROM and data RAM (\`comp [mem]\`)
- [asm.md](asm.md) — load ROM from mnemonics (\`inline [asm]\` + \`= .cpuisa { … }\`)
- [lut.md](lut.md) — optional opcode decode via lookup table instead of \`EQ\` wiring
- [mini-cpu-plan.md](mini-cpu-plan.md) — feasibility notes
- [mini-cpu-v2.md](mini-cpu-v2.md) — v2 demo (ASM, BEQ, LUT, terminal)
- Automated tests: \`test_suite_ported.js\` (859–866)
- Test constants: \`CHIP_ALU4\`, \`BOARD_CPU4\`
`,
    'modes.md': `# Script modes (\`MODE\`)

Top-level statements that change how **wire assignments** and **propagation** behave for the rest of the script (until another \`MODE\` line).

\`\`\`logts
MODE STRICT
MODE WIREWRITE
MODE ZSTATE
\`\`\`

See also: [assignment operators](assignment-operators.md), [signal propagation](signal-propagation.md).

---

## Quick reference

| Mode | How to activate | Wire re-assignment | Same wire, same step (binary) | Values |
|------|-----------------|--------------------|------------------------------|--------|
| **STRICT** (default) | start of script, or \`MODE STRICT\` | No — after first real \`=\` / \`:=\` / \`=:\` | Last write wins | \`0\` / \`1\` only |
| **WIREWRITE** | \`MODE WIREWRITE\` | Yes | Last write wins | \`0\` / \`1\` only |
| **ZSTATE** | \`MODE ZSTATE\` | Yes (enables WIREWRITE internally) | **Merged** per bit → \`X\` on conflict | \`0\` / \`1\` / \`X\` / \`Z\` |

---

## Syntax

\`\`\`logts
MODE STRICT
MODE WIREWRITE
MODE ZSTATE
\`\`\`

- One keyword per \`MODE\` statement.
- A later \`MODE\` replaces the active flags. \`MODE STRICT\` or \`MODE WIREWRITE\` turns **off** ZSTATE semantics (\`zstate\` flag cleared).
- \`MODE ZSTATE\` also sets wire-write behaviour (you do not need a separate \`MODE WIREWRITE\` line).

Place \`MODE\` lines near the top of the script, before wires that depend on the rules.

---

## \`MODE STRICT\` (default)

If you never write \`MODE\`, the interpreter starts in **STRICT**.

| Rule | Behaviour |
|------|-----------|
| First assignment | Allowed (\`wire = …\`, \`:=\`, \`=:\`) |
| \`wire : literal\` | Initial value only; first real assignment after \`:\` is still allowed |
| Re-assignment | **Error** — \`Cannot reassign wire … in STRICT mode\` |
| Width | Same as assignment operators (\`=\` exact width, etc.) — [assignment-operators.md](assignment-operators.md) |

\`\`\`logts-play
3wire q = 101
show(q)
\`\`\`

Re-assigning \`q\` without \`MODE WIREWRITE\` would error.

---

## \`MODE WIREWRITE\`

Allows **changing a wire again** after it already holds a value.

| Rule | Behaviour |
|------|-----------|
| Re-assignment | Allowed |
| Multiple writes, same propagation step | **Last write wins** (binary mode) |
| Propagation | Works in **legacy** and **wave** |

\`\`\`logts-play
MODE WIREWRITE
4wire q : 1
q =: 11
show(q)
\`\`\`

Result: \`1100\`

Detail on operators: [assignment-operators.md](assignment-operators.md#mode-wirewrite).

---

## \`MODE ZSTATE\`

Tristate / multi-driver mode: wires can be **\`Z\`** (high-impedance), **\`X\`** (conflict), logic gates use **IEEE 1164**, and several drivers on the same bus in one step are **resolved per bit** instead of last-wins.

| Requirement | Detail |
|-------------|--------|
| Propagation | **Wave only** — error in legacy mode |
| Undeclared init | \`8wire bus\` without \`=\` → \`ZZZZZZZZ\` |
| Explicit release | \`ZRELEASE(wire)\` statement |
| With WIREWRITE | Always on when ZSTATE is active |

\`\`\`logts-play wave
MODE ZSTATE

2wire bus
2wire a = 10
2wire b = 11
bus = a
bus = b
show(bus)
\`\`\`

Result: \`1X\` (conflict on bit 1), not \`11\`.

**Full documentation:** **[MODE ZSTATE — tristate wires and multi-driver buses](zstate.md)**

Topics covered there: \`ZCONNECT\`, \`get>=\` / \`out>=\`, \`ZRELEASE\`, logic literals \`?X\` / \`?Z\`, timeline colours, MUX with \`Z\`, errors on arithmetic with \`X\`/\`Z\`, and comparison with default binary mode.

---

## Choosing a mode

| Goal | Mode |
|------|------|
| Immutable wires (teaching, one-shot programs) | Default **STRICT** |
| Counters, registers, feedback without extra variables | **WIREWRITE** |
| Shared buses, tristate, multiple drivers, \`Z\`/\`X\` | **ZSTATE** (+ wave) |

---

## Related

| Topic | Page |
|-------|------|
| Tristate & multi-driver (ZSTATE) | [zstate.md](zstate.md) |
| \`=\`, \`:=\`, \`=:\` width rules | [assignment-operators.md](assignment-operators.md) |
| Wave vs legacy propagation | [signal-propagation.md](signal-propagation.md) |
| \`ZRELEASE(wire)\` | [builtin-functions.md](builtin-functions.md) |
| Editor propagation pill | [editorUI.md](editorUI.md) |
`,
    'multiplier.md': `# Multiplier component

\`comp [multiplier]\` (shortname \`comp [*]\`) multiplies two **N-bit** operands. Returns low \`depth\` bits on \`get\` and high \`depth\` bits on \`over\`.

Built-in: \`MULTIPLY()\` — [arithmetic.md](arithmetic.md). Signature: \`doc(comp.multiplier)\` or \`doc(comp.*)\`.

---

## Syntax

\`\`\`
comp [multiplier] .name:
  depth: 4
  on: 1
  :
\`\`\`

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Enable |
| \`a\`, \`b\` | \`depth\` | Operands |
| \`get\` | \`depth\` | Low \`depth\` bits of \`a × b\` |
| \`over\` | \`depth\` | High \`depth\` bits of product |

---

## Example

\`\`\`logts-play
comp [multiplier] .mul:
  depth: 4
  on: 1
  :

.mul:{
  a = 0011
  b = 0100
  set = 1
}

4wire lo = .mul:get
4wire hi = .mul:over
show(lo, hi)
\`\`\`

\`3 × 4 = 12\` → \`lo = 1100\`, \`hi = 0000\`.

---

## Related

- [divider.md](divider.md)
- [components.md](components.md)
`,
    'network-traffic-panel.md': `# Network Traffic panel

Open with **Win → Network Traffic**. The panel sits between **Timeline** and **Output** (same column as Output / Variables).

The log is **global** — every \`send\` from all Run instances (1–5) in the page, not per tab. Backend keeps up to **200** entries; when full, the oldest **50** are trimmed. **Clear** empties the log; the **Id** counter does **not** reset.

Each send gets a monotonic **packet id** (shown in the **Id** column). On the sender, \`.wifi:sendId\` returns the last id sent from that network component (binary). See [network.md — Packet ids and \`:sendId\`](network.md#packet-ids-and-sendid).

Bus semantics (\`comp [network]\`, channels, broadcast/unicast): [network.md](network.md). Editor run controls (**Run** / **Stop**, Inst slots): [editorUI.md](editorUI.md).

---

## Table columns

| Column | Meaning |
|--------|---------|
| **Id** | Unique packet id (monotonic across the page) |
| **Source** | Run instance 1–5 that sent |
| **Target** | Instance 1–5, or \`*\` for broadcast |
| **Channel** | Bus channel name |
| **Size** | Packet width in bits |
| **Status** | \`Received\` (blue) if ≥1 receiver got it; \`Dropped\` (red) if none |

New rows briefly **flash** (blue tint for Received, dark red for Dropped) when they appear in **Live** mode.

**Click a row** to expand the payload — same formatting as \`show()\` for that wire width (wide values wrap).

---

## Toolbar

| Control | Action |
|---------|--------|
| **Pause** / **Live** | Toggle live updates. In **Pause**, the title shows **Network Traffic (paused)**; new packets are still logged but the table does not redraw until **Live**. |
| **Clear** | Empty the log (Ids keep counting) |

While **paused**, pagination and filters use a **frozen snapshot** of the log at pause time — page numbers do not shift when new packets arrive in the background. **Live** refreshes to the current log.

---

## Pagination

- **5 rows** per page, newest first (Id descending).
- \`[ < ]\` \`[ > ]\` — previous / next page.
- Summary: \`Rows: X - Y . Shown N of Total\` (positions in the **filtered** list).

---

## Column filters

Click a column header to open the filter bar (\`>\` apply, \`x\` clear, **Esc** close). A column with an active filter has a **blue** header (the filter value is not shown in the header).

| Column | Filter type | Examples |
|--------|-------------|----------|
| **Id** | Single id or range | \`23\` · \`1 - 20\` |
| **Source** | Single or range | \`2\` · \`1 - 5\` |
| **Target** | Single, range, or broadcast | \`*\` · \`2\` · \`1 - 3\` |
| **Size** | Single or range | \`8\` · \`128 - 200\` |
| **Channel** | Substring (case-insensitive) | \`demo\` |
| **Status** | Dropdown | \`Received\` · \`Dropped\` |

Numeric filters accept \`23\` or \`1 - 20\` (spaces around \`-\` optional; reversed ranges work). Invalid text matches nothing.

Filters combine (AND). One active filter per column.

---

## Related behaviour

- **Stop** on a Run instance unregisters its network endpoints; no new deliveries to that slot until **Run** again. **Stop** does not clear the traffic log.
- Traffic is logged on every \`send\` attempt, including **Dropped** (no receiver, RX full, or unicast to a missing instance).
- \`probe\` on a receiving instance is refreshed when a packet arrives — see [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network).

---

## Related

- [network.md](network.md) — \`comp [network]\` component
- [editorUI.md](editorUI.md) — Run / Stop, panels overview, Inst slots
`,
    'network.md': `# Network component

\`comp [network]\` is a **packet bus** between Run instances (1–5) in the same browser page. Each instance registers an RX FIFO on a named **channel**; \`send\` fan-outs to all other endpoints on that channel (the sender never receives its own packet).

Headless in v1 (no device panel), like \`queue\`. **Top-level only** — not allowed in chip, pcb, or board bodies.

See also: [meta constants — \`/instance/\`](meta-constants.md) for embedding the Run instance id in payloads.

---

## Syntax

\`\`\`
comp [network] .wifi:
  width: 8
  length: 64
  channel: 'demo'
  on: 1
  :
\`\`\`

| Attribute | Default | Meaning |
|-----------|---------|---------|
| \`width\` | 128 | Bit width of each packet |
| \`length\` | 64 | RX FIFO capacity (packets) |
| \`channel\` | \`'default'\` | Bus channel name (string) |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Trigger (last bit \`1\` applies other pins in the block) |
| \`send\` | \`width\` | Packet to send on \`channel\` |
| \`target\` | 4 | Optional Run instance id (1–5) for unicast; omitted = broadcast to all others on \`channel\` |
| \`pop\` | 1 | Remove front RX packet when \`1\` |
| \`clear\` | 1 | Empty local RX FIFO when \`1\` |
| \`get\` | \`width\` | Peek at front RX packet (same as \`front\`) |
| \`front\` | \`width\` | Peek without \`pop\` |
| \`empty\` | 1 | \`1\` when RX has no packets |
| \`full\` | 1 | \`1\` when RX cannot accept another packet |
| \`size\` | \`sizeWidth\` | Current RX count (zero-padded) |
| \`capacity\` | \`sizeWidth\` | \`length\` in binary |
| \`free\` | \`sizeWidth\` | \`length - size\` |
| \`drops\` | variable | RX overflow counter (\`count.toString(2)\`; \`0\`→\`0\`, \`4\`→\`100\`) |
| \`sendId\` | variable | Last packet id sent from this endpoint (\`id.toString(2)\`; \`0\` before any send) |

When RX is full, incoming packets are **dropped silently** (\`drops\` increments); other receivers on the channel are unaffected.

\`sizeWidth\` = enough bits for \`0 .. length\` (same as [queue](queue.md)).

---

## Packet ids and \`:sendId\`

Every \`send\` on the bus gets a **global monotonic packet id** (integer 1, 2, 3, …). The counter is shared across all instances and channels on the page; it is **not** reset when you **Clear** the Network Traffic log or re-**Run** a script. It resets only on full page refresh.

| Where | Name | Meaning |
|-------|------|---------|
| Network Traffic panel | **Id** column | Same packet id for that send |
| Sender \`comp [network]\` | \`:sendId\` pout | Last packet id sent from **this** endpoint |

**\`:sendId\`** (read-only pout):

- Binary string, **dynamic width** (same encoding style as \`:drops\` — e.g. id \`4\` → \`100\`, id \`2\` → \`10\`).
- \`0\` before this endpoint has sent any packet.
- Updates on each successful \`send\` from that component (including sends with zero deliveries when \`target\` points at a missing endpoint).
- Matches the **Id** column for that send in **Win → Network Traffic**.

\`\`\`logts-play
comp [network] .wifi:
  width: 8
  length: 8
  channel: 'demo'
  on: 1
  :

4wire lastId

.wifi:{ send = ^41
  set = 1 }

lastId = .wifi:sendId
show(lastId)
\`\`\`

After the send above, \`lastId\` is \`1\` and the traffic log row shows **Id** \`1\`. A second send from the same endpoint yields \`sendId\` \`10\` (binary for decimal 2) and log **Id** \`2\`.

Packet ids are for tracing and UI only — they are **not** inserted into the RX FIFO and receivers cannot read them from \`:get\` / \`:front\`.

---

## Multi-instance behaviour

- Endpoints are keyed by **Run instance** + component device id.
- **Send** delivers to every endpoint on the same \`channel\`, **except** the sender.
- Receivers can be on another editor tab/instance; packets accumulate in RX until \`pop\` or \`clear\`.
- On re-Run or instance release, endpoints for that instance are removed (no stale delivery).
- No persistence across page refresh. No TCP/WebSocket — same page only.

### Addressing — broadcast vs unicast

- **\`target\` omitted** — fan-out to every endpoint on the same \`channel\`, except the sender (v1 behaviour).
- **\`target\` set** (4 bits, instance 1–5, same encoding as \`/instance/\`) — deliver only to that Run instance on the channel. Sender is still excluded. If no endpoint exists for that instance on the channel, the send is silent (no error).
- **\`target\` = 0 or > 5** — runtime error.

You can still put \`dest\` / \`src\` in the payload for application-level filtering when using broadcast.

\`\`\`logts-play
comp [network] .net:
  width: 8
  length: 8
  channel: 'demo'
  on: 1
  :

.net:{ send = ^41
  target = 0010
  set = 1 }
\`\`\`

Delivers only to Run instance **2** on \`demo\`.

### v1 payload addressing (optional)

## Example — send and peek

\`\`\`logts-play
comp [network] .net:
  width: 8
  length: 8
  channel: 'demo'
  on: 1
  :

.net:{ send = ^41
  set = 1 }

8wire x = .net:get
show(x)
\`\`\`

\`:get\` on the sender stays empty (exclude sender). Use two Run instances to see cross-instance delivery.

---

## Example — instance id in payload

\`\`\`logts-play
4wire inst : /instance/

comp [network] .wifi:
  width: 8
  length: 16
  channel: 'demo'
  on: 1
  :

.wifi:{ send = inst
  set = 1 }
\`\`\`

---

## Example — oscillator send every 2 seconds

**Load & Run** the example below, then open **Win → Network Traffic** (keep **Live** on). Every **2 seconds** (one full oscillator cycle) the rising \`set\` edge sends a packet on channel \`demo\`. The payload is \`^FF\` concatenated with the 4-bit **\`:counter\`** from \`.o\`. **Output** shows your Run **Inst** id from \`/instance/\`.

For a receiver on another tab, register the same \`channel: 'demo'\` on **Inst 2**, then watch **Network Traffic** or \`probe(.wifi:get)\` on that tab. See [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network).

\`\`\`logts-play
4wire inst : /instance/
show(inst)

comp [network] .wifi:
  width: 20
  length: 16
  channel: 'demo'
  on: 1
  :

comp [~] .o:
  duration1: 4
  duration0: 4
  length: 4
  freq: 2
  freqIsSec: 1
  eachCycle: 1
  :

1wire o = .o

20wire pkg := ^FF + .o:counter

.wifi:{
  send = pkg
  set = o
  }
\`\`\`

Oscillator timing: \`freq: 2\` with \`freqIsSec: 1\` → **2 s** per cycle; \`eachCycle: 1\` → \`:counter\` increments once per cycle. See [oscillator.md](oscillator.md).

---

## Restrictions

- \`comp [network]\` only at **top level** (parse error in chip / pcb / board).
- Cannot assign directly to \`.net\`; use \`:send\`, \`:pop\`, \`:clear\`, \`:set\`.
- \`send\` + \`pop\` in the same property block → conflict (like queue \`push\` + \`pop\`).

---

## Network Traffic panel

Every \`send\` is logged globally (all instances). Open **Win → Network Traffic**. The **Id** column uses the same global packet ids as \`:sendId\` on the sender (see [Packet ids and \`:sendId\`](#packet-ids-and-sendid)).

Full panel documentation: [network-traffic-panel.md](network-traffic-panel.md).

---

## \`probe\` on another instance

\`probe(.wifi:get)\` on the **receiving** instance does not update from wire propagation when a packet arrives from another tab — the bus is outside the simulation graph. The editor **re-reads** probes when a packet is delivered (and when you switch to that tab). Probe history keeps earlier lines (\`initialised\`) and appends \`changed\` when the value updates.

See [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network) for a comparison table and a two-tab walkthrough.

---

## Related

- [queue.md](queue.md) — local FIFO (same pin/pout pattern, \`push\` instead of \`send\`)
- [meta-constants.md](meta-constants.md) — \`/instance/\`
- [network-traffic-panel.md](network-traffic-panel.md) — traffic log UI
- [editorUI.md](editorUI.md) — Inst slots, output per instance, probe vs network
`,
    'number-conversion.md': `# Number conversion

Unsigned binary numbers ↔ packed digit strings (4 bits per digit). **Decimal** nibbles hold 0–9; **hex** nibbles hold 0–F.

Index: [builtin-functions.md](builtin-functions.md)

Ordering and selection (\`GT\`, \`LT\`, \`MIN\`, \`MAX\`, \`CLAMP\`, \`MAC\`): [arithmetic.md](arithmetic.md).

---

## Overview

### Decimal (BCD)

| Function | Direction | Output |
|----------|-----------|--------|
| \`CNTN10S\` | count decimal digits | \`Ybit\` (minimal width, unpadded) |
| \`N2N10S\` | number → packed digits | \`maxDecDigits × 4\` bits |
| \`N10S2N\` | packed digits → number | minimal-width binary (use \`:=\` / \`=:\` to pad) |

\`maxDecDigits\` for an \`N\`-bit input is the number of decimal digits in \`2^N − 1\` (e.g. 8 bit → 3 digits, 0…255).

### Hexadecimal (packed nibbles)

| Function | Direction | Output |
|----------|-----------|--------|
| \`CNTN16S\` | count hex digits | \`Ybit\` (minimal width, unpadded) |
| \`N2N16S\` | number → packed hex | \`maxHexDigits × 4\` bits |
| \`N16S2N\` | packed hex → number | minimal-width binary |

\`maxHexDigits\` for an \`N\`-bit input is the number of hex digits in \`2^N − 1\` (e.g. 8 bit → 2 digits, 0…255 → \`FF\`).

### BCD helper

| Function | Output |
|----------|--------|
| \`ISDIGIT\` | \`1bit\` — \`1\` if unsigned value is 0…9 |

All functions above are **unsigned** only and require binary operands (runtime error on \`Z\` / \`X\` in \`MODE ZSTATE\`).

---

## CNTN10S

\`\`\`
CNTN10S(Xbit value) -> Ybit
\`\`\`

Returns how many **significant** decimal digits \`value\` has.

- \`CNTN10S(0)\` → \`1\` (displays as \`"0"\`)
- \`CNTN10S(245)\` on 8 bit → \`11\` (3 digits)
- \`CNTN10S(5)\` → \`1\`

### Example

\`\`\`logts-play
8wire n = 11110101
2wire cnt = CNTN10S(n)
show(cnt)
\`\`\`

---

## N2N10S

\`\`\`
N2N10S(Xbit value) -> Zbit packed
\`\`\`

Packed BCD: each decimal digit is **4 bits** (0–9), MSB-first. Output width \`Z = maxDecDigits × 4\`.

| Input (8 bit) | Decimal | Packed (12 bit) |
|---------------|---------|-----------------|
| \`11110101\` | 245 | \`0010_0100_0101\` |
| \`00000101\` | 5 | \`0000_0000_0101\` |

\`\`\`logts-play
8wire n = 11110101
12wire packed = N2N10S(n)
show(packed)
\`\`\`

---

## N10S2N

\`\`\`
N10S2N(Xbit packed) -> Wbit value
\`\`\`

Inverse of \`N2N10S\`. Packed length must be a **multiple of 4**; each nibble must be 0–9 or **runtime error**.

\`\`\`logts-play
8wire number = 11110101
12wire num10s = N2N10S(number)
8wire back := N10S2N(num10s)
show(back)
\`\`\`

---

## CNTN16S

\`\`\`
CNTN16S(Xbit value) -> Ybit
\`\`\`

Significant **hex** digit count (same rules as \`CNTN10S\`, base 16).

- \`CNTN16S(0)\` → \`1\`
- \`CNTN16S(245)\` on 8 bit → \`10\` (2 digits, \`F5\`)
- \`CNTN16S(5)\` → \`1\`

\`\`\`logts-play
8wire n = 11110101
2wire cnt = CNTN16S(n)
show(cnt)
\`\`\`

---

## N2N16S

\`\`\`
N2N16S(Xbit value) -> Zbit packed
\`\`\`

Packed hex: each digit is **4 bits** (0–F), MSB-first. Output width \`Z = maxHexDigits × 4\`.

| Input (8 bit) | Hex | Packed (8 bit) |
|---------------|-----|----------------|
| \`11110101\` | F5 | \`1111_0101\` |
| \`00000101\` | 05 | \`0000_0101\` |

\`\`\`logts-play
8wire n = 11110101
8wire packed = N2N16S(n)
show(packed)
\`\`\`

---

## N16S2N

\`\`\`
N16S2N(Xbit packed) -> Wbit value
\`\`\`

Inverse of \`N2N16S\`. Any nibble 0–15 is valid. Length must be a **multiple of 4**.

\`\`\`logts-play
8wire packed = 11110101
8wire back := N16S2N(packed)
show(back)
\`\`\`

---

## ISDIGIT

\`\`\`
ISDIGIT(Xbit value) -> 1bit
\`\`\`

Returns \`1\` if the unsigned value is a valid **decimal digit** (0…9); otherwise \`0\`. Useful before manual BCD handling; \`N10S2N\` still errors on invalid nibbles.

\`\`\`logts-play
4wire d9 = 1001
4wire d10 = 1010
1wire y9 = ISDIGIT(d9)
1wire y10 = ISDIGIT(d10)
show(y9)
show(y10)
\`\`\`

---

## doc()

\`\`\`
doc(CNTN10S)
doc(N2N10S)
doc(N10S2N)
doc(CNTN16S)
doc(N2N16S)
doc(N16S2N)
doc(ISDIGIT)
\`\`\`

---

## See also

- [arithmetic.md](arithmetic.md) — \`ADD\`, \`MAC\`, \`GT\`, \`CLAMP\`, …
- [assignment-operators.md](assignment-operators.md) — \`:=\`, \`=:\`
- [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md) — \`CNTONE\`
`,
    'oscillator.md': `# Oscillator

The \`osc\` component generates a periodic 1-bit digital signal with configurable frequency and duty cycle. It includes an internal counter that counts cycles.

The oscillator works in **real time** — once created, it oscillates independently of \`NEXT(~)\`, using internal browser timers.

---

## Syntax

\`\`\`
comp [osc] .name:
  duration1: 4
  duration0: 4
  length: 4
  freq: 1
  freqIsSec: 0
  eachCycle: 1
  :
\`\`\`

Short form using \`~\`:

\`\`\`
comp [~] .name:
  ...
  :
\`\`\`

Minimal form (no attributes, all values are default):

\`\`\`
comp [osc] .name::
\`\`\`

---

## Attributes

| Attribute    | Type  | Min | Max | Default | Description |
|--------------|-------|-----|-----|---------|-------------|
| \`duration1\`  | int   | 1   | 8   | 4       | Proportion of time the signal is \`1\` (HIGH) |
| \`duration0\`  | int   | 1   | 8   | 4       | Proportion of time the signal is \`0\` (LOW) |
| \`length\`     | int   | 1   | -   | 4       | Number of bits in the internal counter |
| \`freq\`       | float | >0  | -   | 1       | Frequency in Hz or period in seconds (see \`freqIsSec\`) |
| \`freqIsSec\`  | int   | 0   | 1   | 0       | How \`freq\` is interpreted: \`0\` = Hz (cycles/second), \`1\` = seconds (period of one cycle) |
| \`eachCycle\`  | int   | 0   | 1   | 1       | When the counter increments: \`1\` = once per full cycle, \`0\` = on every state change |

### Frequency and freqIsSec

The \`freq\` attribute controls the speed of the oscillator. Interpretation depends on \`freqIsSec\`:

- \`freqIsSec: 0\` (default) — \`freq\` is in **Hz** (cycles per second). Period = \`1000 / freq\` ms.
- \`freqIsSec: 1\` — \`freq\` is in **seconds** (duration of one full cycle). Period = \`freq * 1000\` ms.

**Examples:**

| freq | freqIsSec | Period   | Description |
|------|-----------|----------|-------------|
| 10   | 0         | 100ms    | 10 cycles per second |
| 1    | 0         | 1000ms   | 1 cycle per second |
| 0.5  | 0         | 2000ms   | 1 cycle every 2 seconds |
| 5    | 1         | 5000ms   | 1 cycle every 5 seconds |
| 30   | 1         | 30000ms  | 1 cycle every 30 seconds |
| 120  | 1         | 120000ms | 1 cycle every 2 minutes |

\`freqIsSec: 1\` is useful for long periods (over 1 second) where writing in Hz would require fractional values below 1.

### Duty Cycle

The HIGH/LOW ratio is calculated from \`duration1\` and \`duration0\`:

- HIGH time = \`duration1 / (duration1 + duration0)\` of the period
- LOW time = \`duration0 / (duration1 + duration0)\` of the period

**Example:** With \`duration1: 1\` and \`duration0: 7\` at \`freq: 10\` (\`freqIsSec: 0\`):
- Period = 100ms (10 cycles/second)
- HIGH = 1/8 of 100ms = 12.5ms
- LOW = 7/8 of 100ms = 87.5ms

**Example with freqIsSec: 1:** With \`duration1: 4\` and \`duration0: 4\` at \`freq: 10\` (\`freqIsSec: 1\`):
- Period = 10000ms (10 seconds per cycle)
- HIGH = 5000ms (5 seconds)
- LOW = 5000ms (5 seconds)

### Counter

The counter is a binary counter on \`length\` bits. It starts at \`0\` and increments according to the \`eachCycle\` attribute:

- \`eachCycle: 1\` — counter increments by 1 on each full cycle (after HIGH + LOW phase)
- \`eachCycle: 0\` — counter increments by 1 on each state change (twice per cycle: at 0→1 and at 1→0 transitions)

When the counter reaches its maximum value (all bits set to 1), it **wraps around** and returns to 0.

---

## Connecting to wires

Wires that read the oscillator (\`.osc1\`, \`.osc1:get\`, or \`.osc1:counter\`) follow the signal as it changes in real time. You do not need to call \`NEXT(~)\` for the oscillator to run — only for logic that depends on \`~\` elsewhere in the program.

\`\`\`
comp [~] .clk:
  freq: 2
  :

1wire clock = .clk:get
1wire ledOn = clock
\`\`\`

Each time the oscillator goes HIGH or LOW, \`clock\` and any wires derived from it are updated automatically. See [signal-propagation.md](signal-propagation.md).

---

## Outputs

The oscillator exposes 3 readable properties:

### Direct value — \`.osc1\`

Returns the current signal value (1 bit: \`0\` or \`1\`).

\`\`\`
1wire osc1 = .osc1
\`\`\`

### \`:get\` — \`.osc1:get\`

Identical to the direct value. Returns the current 1-bit signal.

\`\`\`
1wire osc1b = .osc1:get
\`\`\`

\`.osc1\` and \`.osc1:get\` are always synchronized — they have the same value at any moment.

### \`:counter\` — \`.osc1:counter\`

Returns the value of the internal counter on \`length\` bits.

\`\`\`
4wire counter1 = .osc1:counter
\`\`\`

With \`length: 4\`, the counter has values from \`0000\` to \`1111\` (0–15), then wraps back to \`0000\`.

---

## Inputs

### \`:reset\` — reset counter

The \`:reset\` property allows resetting the internal counter to \`0\`. It is used inside a block with \`set\` as trigger:

\`\`\`
.osc1:{
  reset = 1
  set = EQ(cnt, 1010)
}
\`\`\`

When the expression in \`set\` transitions from \`0\` to \`1\` (rising edge), the block executes and the counter is reset to \`0...0\` (all bits zero).

**Behavior:**

- \`reset = 1\` — counter is reset to \`0\` (on \`length\` bits)
- \`reset = 0\` — nothing happens (counter continues normally)
- After reset, the counter resumes counting from \`0\`
- The oscillator signal (HIGH/LOW) is not affected — only the counter is reset

---

## Examples

### Simple oscillator with 50% duty cycle

\`\`\`
comp [~] .clk:
  freq: 2
  :

1wire clock = .clk
\`\`\`

The signal oscillates at 2 Hz (once per second HIGH, once LOW), with 50% duty cycle (duration1 and duration0 are both 4 by default).

### Fast oscillator with asymmetric duty cycle

\`\`\`
comp [osc] .fast:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  :

1wire pulse = .fast
4wire cnt = .fast:counter
\`\`\`

The signal pulses 10 times per second. It is \`1\` for 12.5ms and \`0\` for 87.5ms in each cycle. The counter counts cycles on 4 bits (0–15).

### Slow oscillator (period in seconds)

\`\`\`
comp [~] .heartbeat:
  freq: 5
  freqIsSec: 1
  duration1: 1
  duration0: 4
  :

1wire pulse = .heartbeat
\`\`\`

One cycle lasts 5 seconds. The signal is \`1\` for 1 second and \`0\` for 4 seconds (20% duty cycle).

### Counter that counts every state change

\`\`\`
comp [~] .osc2:
  freq: 5
  eachCycle: 0
  length: 8
  :

8wire transitions = .osc2:counter
\`\`\`

The counter increments twice per cycle (on each state change), so it counts 10 times per second at \`freq: 5\`.

### Counter with reset at value 10

\`\`\`
comp [~] .osc1:
  duration1: 4
  duration0: 4
  length: 6
  freq: 2
  eachCycle: 1
  :

1wire o1 = .osc1:get
6wire cnt = .osc1:counter

.osc1:{
  reset = 1
  set = EQ(cnt, 001010)
}

show(o1, cnt)
\`\`\`

The counter counts from \`000000\` up to \`001010\` (10 in decimal), then resets to \`000000\` and starts again. The oscillator continues to oscillate normally.

### Complete program

\`\`\`
comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  eachCycle: 1
  :

1wire osc1 = .osc1
1wire osc1b = .osc1:get
4wire counter1 = .osc1:counter

show(osc1, osc1b, counter1)
\`\`\`

### Watching on the Timeline

In the script editor, \`watch()\` records samples into the **Timeline** panel (see [debug.md](debug.md)):

\`\`\`logts
comp [~] .o:
    length: 4
    freq: 10
    :

4wire gated = AND(.o:counter, .p + .p + .p + .p)

watch(.o:counter)   # internal counter — always ticks
watch(gated)        # gated bus — o.0 … o.3 after AND
\`\`\`

Use \`watch(.o:counter)\` for the raw \`:counter\` bits; use \`watch(gated)\` (or a wire assigned from \`.o:get\`) to see the signal after your logic.

---

## Restrictions

- A value cannot be assigned directly to an oscillator: \`.osc1 = 1\` produces an error.
- The oscillator has no visual representation in the devices panel (it can be connected to LEDs or other components for visualization).
- When the program is re-run (\`RUN\`), all oscillator timers are stopped automatically and recreated.
- The oscillator works independently of \`NEXT(~)\` — it does not require simulation cycles to oscillate.

---

## Timing diagram

\`\`\`
freq: 10, duration1: 1, duration0: 7
Period = 100ms

Value:    0  1  0        1  0        1  0
          |  |  |        |  |        |  |
Time:     0 12.5 100    112.5 200   212.5 300  (ms)
          |<-->|<------>|
          HIGH   LOW
          12.5ms 87.5ms

Counter:  0000  0001     0001 0010   0010 0011
                  ^               ^            ^
              increment       increment    increment
\`\`\`
`,
    'pcb.md': `# PCB components

> **Deprecated** — use [board.md](board.md) for new circuits. PCB remains supported for existing scripts but is not recommended (legacy propagation in body, no wave alignment). Behavior is unchanged.

A **PCB** is a reusable circuit block: you define its interface (pins, pouts, exec trigger), its internal wiring, and optional \`~~\` next-tick section. PCBs can use any built-in component, nested PCBs, \`def\` functions, and panel controls (\`switch\`, \`key\`, \`led\`, …).

Full signature reference: \`doc(pcb)\` and \`doc(pcb.type)\` — see [doc-function.md](doc-function.md).

---

## Definition

\`\`\`
pcb +[name]:
  Npin inputName
  Mpout outputName
  exec: triggerPin
  on: raise/edge/1/0
  # body — assignments, comp, def, chip, nested pcb
  :Nbit returnVar
\`\`\`

| Part | Meaning |
|------|---------|
| \`pcb +[name]:\` | Define a new PCB type (top-level only) |
| \`Npin\` / \`Npout\` | Input / output ports exposed on instances |
| \`exec: pinName\` | Which pin fires property blocks (default \`set\`) |
| \`on: mode\` | When the block runs: \`raise\`, \`edge\`, \`1\`, \`0\` |
| body | Logic between header and final \`:Nbit var\` |
| \`:Nbit var\` | Optional return type shown in \`doc()\` |

---

## Instantiation

\`\`\`
pcb [name] .instance::
\`\`\`

Apply inputs and trigger execution with a property block:

\`\`\`
.instance:{
  inputName = 0101
  triggerPin = 1
}
\`\`\`

Read outputs from outside:

\`\`\`
Nwire out = .instance:outputName
\`\`\`

---

## Property blocks

Multiple blocks on the same instance are allowed. They run in **source order** (\`blockIndex\`) when the exec pin matches \`on:\`.

\`\`\`
pcb [seq] .q::

.q:{ set = trigger; data = 1111 }
.q:{ set = trigger; data = 0000 }
\`\`\`

When \`trigger\` goes high, both blocks run in order; the last assignment to a pout wins.

Inside a PCB body you can also attach blocks to internal components:

\`\`\`
comp [adder] .add:
  depth: 4
  on: 1
  :

.add:{
  a = externalPin
  b = otherPin
  set = 1
}
\`\`\`

---

## \`~~\` next section

After the main body, \`~~\` starts code that runs on the **next** propagation tick (same idea as \`NEXT(~)\` for registers). Useful for two-phase updates without combinatorial loops.

\`\`\`
pcb +[twoPhase]:
  4pin data
  1pin set
  4pout out
  exec: set
  on: 1
  out = data
  ~~
  out = NOT(data)
  :4bit out
\`\`\`

---

## Runnable example

\`\`\`logts-play
pcb +[passthrough]:
  4pin data
  1pin set
  4pout val
  exec: set
  on: 1
  val = data
  :4bit val

pcb [passthrough] .u::

.u:{
  data = 1010
  set = 1
}

4wire r = .u:val
show(r)
\`\`\`

---

## \`doc()\` and debug

\`\`\`
doc(pcb)          # lists pcb.type for each defined type
doc(pcb.bcd)      # full signature of type bcd
\`\`\`

Probe external pins/pouts:

\`\`\`
probe(.u:val)           # pout
probe(.u.data)          # internal wire in body (if named)
\`\`\`

See [debug.md](debug.md) for \`:\` (pin/pout) vs \`.\` (internal wire) conventions.

---

## PCB vs chip

| Feature | PCB | Chip |
|---------|-----|------|
| UI components (\`led\`, \`switch\`, …) | Yes | No |
| \`def\` in body | Yes | No |
| Nested \`pcb +[...]\` | Yes | No |
| \`~~\` section | Yes | No |
| Nested \`chip [type]\` | Yes | Yes (other chip types) |
| Use case | Full interactive circuits | Pure reusable logic |

Chip details: [chip.md](chip.md).
`,
    'pocket-calc.md': `# Pocket calculator (keyboard + keys + terminal)

Teaching demo: a two-register **unsigned 8-bit** pocket calculator built from [keyboard.md](keyboard.md), [key.md](key.md), [reg.md](reg.md), [divider.md](divider.md), [lut.md](lut.md), and [terminal.md](terminal.md). Typed digits accumulate in **entry**; **\`+\`** / **\`-\`** / **\`=\`** apply to **acc** and print the result on the terminal; **\`R\`** clears everything.

Automated test: **1609** (\`keyboard\` group).

---

## Architecture

| Block | Role |
|-------|------|
| \`comp [keyboard] .kbd\` | Digits \`0\`–\`9\` (\`onlyDigits\`); \`:get\` = 8-bit ASCII; \`.kbd.4/4\` = digit value; \`:valid\` pulse per accepted key |
| \`comp [key] .plus\` / \`.minus\` / \`.eq\` / \`.reset\` | Momentary keys \`+\`, \`-\`, \`=\`, \`R\` |
| \`comp [reg] .entry\` | Multi-digit number being typed (\`entry × 10 + digit\`) |
| \`comp [reg] .acc\` | Accumulator (running result) |
| \`comp [divider] .disp\` | \`DIVIDE\` for two decimal digits (quotient + remainder mod 10) |
| \`comp [lut] .toAscii\` | Digit value \`0\`…\`9\` → ASCII byte for \`append\` |
| \`comp [terminal] .term\` | Scrollable result log |

\`\`\`mermaid
flowchart LR
  KBD[kbd] -->|digit| ENTRY[entry reg]
  ENTRY --> SUM[ADD acc + entry]
  ACC[acc reg] --> SUM
  KEYS[+/−/=] --> ACC
  KEYS --> DISP[divider disp]
  DISP --> LUT[toAscii]
  LUT --> TERM[terminal]
\`\`\`

**Entry shift:** on each \`:valid\` from the keyboard, \`entryNew = entry × 10 + digit\` (\`MULTIPLY\` + \`ADD\`).

**Operations (unsigned, saturate at 0):**

| Key | Effect |
|-----|--------|
| \`+\` | \`acc ← acc + entry\`; print \`acc\`; clear \`entry\` |
| \`-\` | \`acc ← max(acc − entry, 0)\` via \`SUBTRACT\` borrow + \`MUX\`; print; clear \`entry\` |
| \`=\` | Same as \`+\` (demo alias) |
| \`R\` | \`acc ← 0\`, \`entry ← 0\`, \`terminal.clear\` |

**Display:** before updating \`acc\`, a property block feeds \`sum\` (or \`diffSat\`) into \`comp [divider] .disp\`, then two \`append\` lines print the tens digit (quotient) and ones digit (remainder). \`toAscii\` LUT address width is 4 bits (\`length: 16\`); divider outputs are 8-bit but only the low digit matters.

---

## Why \`comp [divider]\` instead of \`DIVIDE\` wires?

\`DIVIDE(a, b)\` wires are fine for arithmetic, but **terminal \`append\` re-evaluates its expression when the block fires**. Pre-computed ASCII wires can be **stale** relative to \`acc\` / \`entry\` updates on the same key edge. Driving \`comp [divider]\` in a property block (then reading \`.disp:get\` / \`.disp:mod\` inside \`.toAscii(in = …)\`) evaluates the digit at **apply** time.

---

## Optional: \`N2N10S\` display (didactic)

For packed decimal teaching, see [number-conversion.md](number-conversion.md).

---

## Runnable demo (complete script)

Use **Load** or **Load & Run** in the script editor. Focus **Digits**, type on the keyboard; click **\`+\`** / **\`-\`** / **\`=\`** / **\`R\`** on the panel.

\`\`\`logts-play wave
comp [keyboard] .kbd:
  label: 'Digits'
  focusColor: ^00ff00
  onlyDigits
  on: 1
  :

comp [key] .plus:
  label: '+'
  type: 0
  on: 1
  :

comp [key] .minus:
  label: '-'
  type: 0
  on: 1
  :

comp [key] .eq:
  label: '='
  type: 0
  on: 1
  :

comp [key] .reset:
  label: 'R'
  type: 0
  on: 1
  nl
  :

comp [lut] .toAscii:
  depth: 8
  length: 16
  fillwith: 00110000
  = data {
    ^0: 00110000
    ^1: 00110001
    ^2: 00110010
    ^3: 00110011
    ^4: 00110100
    ^5: 00110101
    ^6: 00110110
    ^7: 00110111
    ^8: 00111000
    ^9: 00111001
  }
  on: 1
  :

comp [reg] .acc:
  depth: 8
  on: 1
  :

comp [reg] .entry:
  depth: 8
  on: 1
  :

comp [divider] .disp:
  depth: 8
  on: 1
  :

comp [terminal] .term:
  rows: 8
  columns: 24
  color: ^0f0
  on: 1
  nl
  :

8wire zero = 00000000
8wire ten = 00001010
8wire entryCur = .entry:get
8wire entryMul, 8wire ov1 = MULTIPLY(entryCur, ten)
8wire entryNew, 1wire c1 = ADD(entryMul, .kbd.4/4)
8wire accCur = .acc:get
8wire sum, 1wire cSum = ADD(accCur, entryCur)
8wire diff, 1wire borrow = SUBTRACT(accCur, entryCur)
8wire diffSat = MUX(borrow, diff, zero)

.entry:{
  data = entryNew
  set = .kbd:valid
}

.disp:{
  a = sum
  b = ten
  set = .plus
}

.term:{
  append = .toAscii(in = .disp:get)
  set = .plus
}
.term:{
  append = .toAscii(in = .disp:mod)
  set = .plus
}
.term:{
  newline = 1
  set = .plus
}

.acc:{
  data = sum
  set = .plus
}
.entry:{
  data = zero
  set = .plus
}

.disp:{
  a = diffSat
  b = ten
  set = .minus
}

.term:{
  append = .toAscii(in = .disp:get)
  set = .minus
}
.term:{
  append = .toAscii(in = .disp:mod)
  set = .minus
}
.term:{
  newline = 1
  set = .minus
}

.acc:{
  data = diffSat
  set = .minus
}
.entry:{
  data = zero
  set = .minus
}

.disp:{
  a = sum
  b = ten
  set = .eq
}

.term:{
  append = .toAscii(in = .disp:get)
  set = .eq
}
.term:{
  append = .toAscii(in = .disp:mod)
  set = .eq
}
.term:{
  newline = 1
  set = .eq
}

.acc:{
  data = sum
  set = .eq
}
.entry:{
  data = zero
  set = .eq
}

.acc:{
  data = zero
  set = .reset
}
.entry:{
  data = zero
  set = .reset
}
.term:{
  clear = 1
  set = .reset
}
\`\`\`

### Try it

| Steps | Terminal (expected) |
|-------|---------------------|
| \`1\` \`2\` **\`+\`** | \`12\` |
| \`3\` **\`+\`** | \`12\` then \`15\` |
| **\`R\`** | cleared |
| \`9\` **\`+\`** \`1\` **\`-\`** | \`8\` |
| \`3\` **\`+\`** \`8\` **\`-\`** | \`0\` (saturate) |

**While typing digits:** nothing is printed yet — \`entry\` / \`entryNew\` update in **showVars**, but the terminal only appends a **result line** on **\`+\`**, **\`-\`**, or **\`=\`** (then \`newline\`). That matches a classic “enter then operate” flow, not character echo per key.

After **Load & Run**: focus **Digits**, type \`12\`, click **\`+\`** — terminal shows \`12\`. Uses **\`wave\`** propagation (same as the editor default).

---

## Related

- [keyboard.md](keyboard.md) — focus, \`onlyDigits\`, \`:valid\`
- [key.md](key.md) — panel keys
- [terminal.md](terminal.md) — \`append\`, \`newline\`, \`clear\`
- [divider.md](divider.md) — \`comp [divider]\`
- [number-conversion.md](number-conversion.md) — \`N2N10S\` / \`N10S2N\` alternative display
- [mini-cpu-v2.md](mini-cpu-v2.md) — similar doc layout with **Load & Run** runnable block
`,
    'protocol.md': `# PROTOCOL

A protocol generator. A protocol definition transforms named parameters into one or more fixed-length bit sequences.

Unlike [ASM](asm.md), which generates a single binary blob, a protocol may generate **multiple output channels** (\`tx\`, \`sda\`, \`scl\`, \`mosi\`, etc.).

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name must start with \`.\` | \`.uart8n1\` ✓ — \`uart8n1\` ✗ |
| Letters and digits only (no \`_\`) | \`.uart8n1\` ✓ — \`.uart_8n1\` ✗ |
| Same name at declaration and use | \`inline [protocol] .uart8n1:\` → \`.uart8n1 { … }\` |

Using a protocol without the leading dot is a parse error:

\`\`\`text
Expected '.' before inline instance name
(use '.uart8n1' not 'uart8n1')
\`\`\`

---

## Declare vs use

| Step | Syntax |
|------|--------|
| Define protocol | \`inline [protocol] .name: … :\` |
| Assign outputs | \`10wire tx = .uart8n1 { data = ^41 }\` |
| Assign multiple outputs | \`8wire mosi, 8wire sclk, 8wire cs = .spi { data = ^A5 }\` |

Multi-target assignments may span lines before \`=\`:

\`\`\`logts
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }
\`\`\`

Use **\`Nwire\`** for assignable signal wires (same as [ASM](asm.md)). **\`Nbit\`** variables are also supported but are immutable bit values, not wires.

Protocol uses **\`{ }\`** with named parameters (\`data = ^41\`). ASM uses **\`{ }\`** with mnemonics. LUT uses **\`(...)\`** for lookup.

### Runnable — quick start

\`\`\`logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
show(tx)
\`\`\`

Single channel, one parameter — result on wire \`tx\`.

---

## Protocol structure

A protocol consists of:

* optional attributes
* one or more output channels

Example:

\`\`\`logts
inline [protocol] .uart8n1:

  tx:
    0
    reverse(data 8b)
    1

:
\`\`\`

---

## Output channels

Every label becomes an output channel.

Example:

\`\`\`logts
inline [protocol] .spi:

  mosi:
    data 8b

  sclk:
    clock 8b

  cs:
    repeat 0 8b

:
\`\`\`

This protocol produces three outputs: \`mosi\`, \`sclk\`, \`cs\`.

The compiler concatenates all channel outputs internally in declaration order:

\`\`\`text
<mosi bits><sclk bits><cs bits>
\`\`\`

Assignments split the result according to the widths on the left side (see **Runnable — SPI** below).

Multi-line assignment before \`=\` is supported:

\`\`\`logts
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }
\`\`\`

---

## Protocol attributes

Attributes appear before output channels.

\`\`\`logts
inline [protocol] .spi:

  clockType: lowFirst

  ...
:
\`\`\`

| Attribute | Values |
|-----------|--------|
| \`clockType\` | \`lowFirst\`, \`highFirst\` |

\`clockType: lowFirst\` → \`01010101…\`

\`clockType: highFirst\` → \`10101010…\`

---

## Segments

Each channel contains a sequence of segments concatenated in order.

\`\`\`logts
tx:
  0
  reverse(data 8b)
  1
\`\`\`

→ \`0 + reverse(data) + 1\`

---

## Literal segments

| Form | Example |
|------|---------|
| Single bits | \`0\`, \`1\` |
| Binary | \`01010101\` |
| Hex | \`^AA\` |
| Decimal | \`\\42\` |

---

## Parameters

Parameters are declared implicitly at first use.

\`\`\`logts
data 8b
\`\`\`

declares \`data\` with width 8 bits. Later uses may omit the width:

\`\`\`logts
reverse(data)
parityEven(data)
\`\`\`

Width mismatch on redeclaration is an error:

\`\`\`text
Parameter 'data' was previously declared as 8b but is used here as 7b
\`\`\`

---

## Built-in generators

Syntax reference:

| Generator | Example | Result |
|-----------|---------|--------|
| \`reverse(param)\` | \`reverse(data 8b)\` | bit-reversed parameter |
| \`parityEven(param)\` | \`parityEven(data)\` | \`0\` or \`1\` (even parity) |
| \`parityOdd(param)\` | \`parityOdd(data)\` | \`0\` or \`1\` (odd parity) |
| \`clock Nb\` | \`clock 8b\` | toggling waveform per \`clockType\` |
| \`repeat bit Nb\` | \`repeat 0 8b\` | constant bit repeated |

### Runnable — reverse()

\`\`\`logts-play
inline [protocol] .revtest:
  out:
    reverse(data 8b)
  :

8wire out = .revtest { data = 01000001 }
show(out)
\`\`\`

\`01000001\` → \`10000010\`.

### Runnable — parityEven() / parityOdd()

\`\`\`logts-play
inline [protocol] .pareven:
  out:
    parityEven(data 8b)
  :

inline [protocol] .parodd:
  out:
    parityOdd(data 8b)
  :

1wire evenPar = .pareven { data = 01100110 }
1wire oddPar  = .parodd  { data = 01100110 }
show(evenPar)
show(oddPar)
\`\`\`

Four set bits (even popcount) → \`parityEven\` = \`0\`, \`parityOdd\` = \`1\`.

### Runnable — clock (\`lowFirst\` / \`highFirst\`)

\`\`\`logts-play
inline [protocol] .clklow:
  clockType: lowFirst
  out:
    clock 8b
  :

inline [protocol] .clkhigh:
  clockType: highFirst
  out:
    clock 8b
  :

8wire low  = .clklow  { }
8wire high = .clkhigh { }
show(low)
show(high)
\`\`\`

\`lowFirst\` → \`01010101\`, \`highFirst\` → \`10101010\`.

### Runnable — repeat

\`\`\`logts-play
inline [protocol] .rep0:
  out:
    repeat 0 4b
  :

inline [protocol] .rep1:
  out:
    repeat 1 4b
  :

4wire zeros = .rep0 { }
4wire ones  = .rep1 { }
show(zeros)
show(ones)
\`\`\`

\`repeat 0 4b\` → \`0000\`, \`repeat 1 4b\` → \`1111\`.

---

## Runnable — UART 8N1

\`\`\`logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
show(tx)
\`\`\`

\`^41\` = \`01000001\`, reversed = \`10000010\`, with start \`0\` and stop \`1\` → **\`0100000101\`**.

---

## Runnable — UART 8E1 / 8O1

\`\`\`logts-play
inline [protocol] .uart8e1:
  tx:
    0
    reverse(data 8b)
    parityEven(data)
    1
  :

inline [protocol] .uart8o1:
  tx:
    0
    reverse(data 8b)
    parityOdd(data)
    1
  :

11wire e1 = .uart8e1 { data = ^41 }
11wire o1 = .uart8o1 { data = ^41 }
show(e1)
show(o1)
\`\`\`

11 bits: start + 8 data (reversed) + parity + stop. For \`^41\` (even popcount): 8E1 → \`01000001001\`, 8O1 → \`01000001011\`.

---

## Runnable — SPI (multi-output)

\`\`\`logts-play
inline [protocol] .spi:
  clockType: lowFirst
  mosi:
    data 8b
  sclk:
    clock 8b
  cs:
    repeat 0 8b
  :

8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }

show(mosi)
show(sclk)
show(cs)
\`\`\`

\`^A5\` → mosi \`10100101\`, sclk \`01010101\` (\`lowFirst\`), cs \`00000000\`.

Channels are concatenated in declaration order (\`mosi\` + \`sclk\` + \`cs\`); assignment widths split the 24-bit blob.

---

## Runnable — I2C (multi-output)

\`\`\`logts-play
inline [protocol] .i2c:
  clockType: lowFirst
  sda:
    0
    address 7b
    rw 1b
    ack1 1b
    data 8b
    ack2 1b
    1
  scl:
    clock 20b
  :

20wire sda,
20wire scl
= .i2c {
  address = ^42
  rw = 0
  ack1 = 0
  data = ^55
  ack2 = 0
}

show(sda)
show(scl)
\`\`\`

Invoke parameters may span multiple lines inside \`{ }\`. sda = 20 data bits; scl = 20-bit \`lowFirst\` clock.

---

## \`:decode(channels...)\`

Reverse a protocol encode: extract parameter values from one or more channel bit strings.

Channel order must match the protocol declaration. All literal, parity, clock, and repeat segments are verified during decode.

| Inline | Decode result | In expressions |
|--------|---------------|----------------|
| protocol | Bit values (concatenated params) | ✓ |
| lut | Address bits | ✓ — see [lut.md](lut.md#decodevalue-matchindex--address-bits) |
| asm | Text (disassembly) | ✗ — see [asm.md](asm.md#decodeinstruction) |

**Decode is not extended** to the v2 generators (\`expand\`, \`collapse\`, \`length\`, \`lengthOf\`, \`withLength\`, or \`def\` references). For Huffman-style payloads, define a separate recovery protocol (e.g. \`.huffRecover\` with \`collapse\` + \`withLength\`) instead of calling \`:decode()\` on the encoder.

### Runnable — UART single channel

\`\`\`logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
8wire data = .uart8n1:decode(tx)
show(tx)
show(data)
\`\`\`

\`^41\` → \`0100000101\` on \`tx\`; decode recovers \`01000001\`.

### Runnable — I2C multi-channel

\`\`\`logts-play
inline [protocol] .i2c:
  clockType: lowFirst
  sda:
    0
    address 7b
    rw 1b
    ack1 1b
    data 8b
    ack2 1b
    1
  scl:
    clock 20b
  :

20wire sda,
20wire scl
= .i2c {
  address = ^42
  rw = 0
  ack1 = 0
  data = ^55
  ack2 = 0
}

7wire address,
1wire rw,
1wire ack1,
8wire data,
1wire ack2
= .i2c:decode(sda, scl)

show(address)
show(data)
\`\`\`

Multi-target assignment splits the decoded parameter blob by left-side wire widths. Only the \`sda\` channel contributes parameters; \`scl\` is verified as a clock waveform.

| Error | Cause |
|-------|-------|
| \`Protocol decode failed: expected ...\` | Input does not match definition |
| \`Expected N protocol channels but received M\` | Wrong channel count |
| \`Protocol output width mismatch\` | Channel width mismatch |
| \`Protocol decode does not support segment kind '...'\` | Decode used on a protocol with v2 generators |

---

## \`def\` — local segments

A **\`def\`** block names a reusable segment sequence inside a protocol body. Reference it in channels with the def name alone (same as a segment label).

\`\`\`logts
def payload:
  length(data) 8b
  data 8b

out:
  payload
\`\`\`

Defs are evaluated lazily and may be referenced by \`lengthOf(def)\`.

### Runnable — def payload

\`\`\`logts-play
inline [protocol] .pkt:
  def payload:
    length(data) 8b
    data 8b
  out:
    payload
  :

16wire out = .pkt { data = 10101010 }
show(out)
\`\`\`

\`length(data)\` = \`00001000\` (8 bits), then \`data\` → **\`0000100010101010\`**.

---

## \`length(param) Nb\` and \`lengthOf(def) Nb\`

| Generator | Meaning |
|-----------|---------|
| \`length(param) Nb\` | Bit length of the invoke parameter at encode time, encoded as an \`Nb\` field |
| \`lengthOf(def) Nb\` | Bit length of a local def's evaluated output, encoded as an \`Nb\` field |

For a fixed-width parameter (\`data 8b\`), \`length(data) 8b\` is always the constant width (8 → \`00001000\`), not a runtime measure of semantic content.

For variable-width parameters (\`data ~b\`), \`length(data) Nb\` reflects the actual bit count passed at invoke.

### Runnable — \`length\` vs \`lengthOf\`

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .cmp:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    length(tokens) 8b
    lengthOf(encoded) 8b
  :

8wire tokenLen,
8wire encodedLen
= .cmp { tokens = 0001 }

show(tokenLen)
show(encodedLen)
\`\`\`

\`tokens = 0001\` → 4 bits; Huffman-encoded \`010\` → 3 bits. **\`00000100\`** vs **\`00000011\`**.

### Runnable — length prefix + payload

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .lof:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

11wire out = .lof { tokens = 0001 }
show(out)
\`\`\`

→ **\`00000011010\`** (3-bit length + 3-bit codeword).

---

## \`withLength(data, Nb)\`

Strip a length-prefixed bit stream: read the first \`Nb\` bits as an unsigned length, then return the next \`len\` bits as the payload. Used when recovering packets that were built with \`lengthOf(def) Nb\` + payload.

### Runnable — 8-bit length prefix

\`\`\`logts-play
inline [protocol] .wl:
  out:
    withLength(data, 8b)
  :

3wire out = .wl { data = 0000001101000000 }
show(out)
\`\`\`

First 8 bits = \`00000011\` (length 3); payload = **\`010\`**.

---

## \`expand\` / \`collapse\` with LUT

Map a token stream through an [inline LUT](lut.md) in both directions.

| Generator | Syntax | Direction |
|-----------|--------|-----------|
| \`expand\` | \`expand(param, .lut, keyWidth)\` | Concatenate \`keyWidth\`-bit keys → LUT values |
| \`collapse\` | \`collapse(param, .lut, keyWidth)\` | Split value stream → keys (fixed-depth LUT) or greedy prefix match ([\`prefixFree\`](lut.md#prefixfree) LUT) |

\`keyWidth\` is the bit width of each LUT address key. Input to \`expand\` must be a multiple of \`keyWidth\`.

With a **\`prefixFree\`** LUT, \`collapse\` uses greedy longest-prefix decoding (Huffman-style). See [lut.md — prefixFree](lut.md#prefixfree) and the full walkthrough in **[huffman.md](huffman.md)**.

### Runnable — expand (fixed-depth LUT)

\`\`\`logts-play
inline [lut] .map2:
  depth: 2
  length: 4
  data {
    00: 01
    01: 01
    10: 10
    11: 11
  }
  :

inline [protocol] .exp:
  out:
    expand(tokens, .map2, 2b)
  :

6wire out = .exp { tokens = 000110 }
show(out)
\`\`\`

\`00\`→\`01\`, \`01\`→\`01\`, \`10\`→\`10\` → **\`010110\`**.

### Runnable — collapse (fixed-depth LUT)

\`\`\`logts-play
inline [lut] .map3:
  depth: 3
  length: 4
  data {
    00: 010
    01: 110
    10: 000
    11: 111
  }
  :

inline [protocol] .col:
  out:
    collapse(data, .map3, 2b)
  :

6wire out = .col { data = 010110000 }
show(out)
\`\`\`

Fixed-depth LUT: consume 3-bit chunks → **\`000110\`**.

### Runnable — collapse (prefixFree / greedy)

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .col:
  out:
    collapse(data, .huff, 2b)
  :

4wire out = .col { data = 010 }
show(out)
\`\`\`

Greedy decode of \`010\` → keys \`01\`, \`10\` → **\`0001\`**.

| Error | Cause |
|-------|-------|
| \`expand input length N is not a multiple of keyWidth M\` | Token stream not aligned |
| \`collapse failed: no LUT entry for value '...'\` | Value not in table (fixed-depth) |
| \`prefixFree collapse failed at bit offset N\` | No valid prefix at position |

---

## Combined Huffman round-trip (\`.huffPacket\` / \`.huffRecover\`)

Typical pattern: encode with \`lengthOf(encoded)\` + \`expand\`; recover with \`withLength\` + \`collapse\` in a **separate** protocol (\`:decode()\` does not reverse \`expand\` directly).

**[huffman.md](huffman.md)** documents the full example: codebook layout, packet format, greedy decode trace, \`length\` vs \`lengthOf\`, dynamic width, and runnable scripts for encode-only, decode-only, and round-trip.

### Runnable — quick round-trip

\`\`\`logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :

4wire source = 0001
11wire packet = .huffPacket { tokens = source }
4wire recovered = .huffRecover { data = packet }

show(source)
show(packet)
show(recovered)
\`\`\`

\`0001\` → packet **\`00000011010\`** → recovered **\`0001\`**. Step-by-step bit layout: [huffman.md — packet layout](huffman.md#packet-layout).

---

## Static vs dynamic width (\`inferProtocolWidth\`)

At parse time the compiler classifies each protocol instance:

| Kind | When | \`doc()\` shows |
|------|------|---------------|
| **static** | All segment widths known (fixed params, fixed-depth LUT expand) | \`width: static Nb\` |
| **dynamic** | Variable params (\`~b\`), \`withLength\`, \`prefixFree\` expand/collapse, or other runtime-sized segments | \`width: dynamic\` |

Dynamic protocols may produce different bit counts per invoke. Assign to a wire wide enough for the maximum case, or rely on runtime width checking with \`=\`.

### Runnable — static vs dynamic

\`\`\`logts-play
inline [lut] .table:
  depth: 4
  length: 16
  data {
    0000: 0000
    0001: 0001
    0010: 0010
    0011: 0011
  }
  :

inline [protocol] .encStatic:
  out:
    expand(tokens 8b, .table, 2b)
  :

inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

inline [protocol] .encDynamic:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

doc(.encStatic)
doc(.encDynamic)
\`\`\`

\`.encStatic\` → \`width: static 16b\`. \`.encDynamic\` → \`width: dynamic\`.

---

## \`data ~b\` — variable-width parameters

Append **\`~b\`** instead of a fixed width to declare a parameter whose bit length comes from the invoke value:

\`\`\`logts
data ~b
\`\`\`

At invoke, \`data = 101010\` supplies six bits; the protocol emits exactly six data bits (no padding).

### Runnable — length prefix + variable payload

\`\`\`logts-play
inline [protocol] .packet:
  out:
    length(data) 16b
    data ~b
  :

22wire out = .packet { data = 101010 }
show(out)
\`\`\`

16-bit length = \`0000000000000110\` (6), payload = \`101010\` → **\`0000000000000110101010\`**.

---

## Not included (planned)

These generators are **not** implemented in v2:

| Planned | Purpose |
|---------|---------|
| \`concat(...)\` | Concatenate arbitrary segment expressions |
| \`padLeft(param, Nb)\` | Left-pad parameter to width |
| \`padRight(param, Nb)\` | Right-pad parameter to width |
| \`checksum(...)\` | Checksum over segment range |

Use literals, \`def\` blocks, and existing generators for now.

---

## doc()

\`\`\`logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

doc(inline.protocol)
doc(.uart8n1)
\`\`\`

| Call | Output |
|------|--------|
| \`doc(inline.protocol)\` | Declaration template, built-in generators, attributes |
| \`doc(.uart8n1)\` | Outputs, channel segments, parameters for that instance |
| \`doc(inline)\` | Lists all inline instances including protocol |

Example \`doc(.uart8n1)\`:

\`\`\`text
.uart8n1 (inline [protocol])

  outputs:
    tx

  tx:
    0
    reverse(data 8b)
    1

  parameters:
    data 8b
\`\`\`

---

## Common errors

| Error | Cause |
|-------|--------|
| Expected '.' before inline instance name | Missing leading dot |
| Parameter 'data' was previously declared as 8b but is used here as 7b | Width mismatch |
| Unknown parameter 'data' | Missing required parameter at invoke |
| Protocol output width mismatch | Left-side width ≠ generated width |
| Unknown protocol attribute | Unsupported attribute |
| clockType must be 'lowFirst' or 'highFirst' | Invalid clock type |
| parityEven() expects a parameter | Invalid argument |
| reverse() expects a parameter | Invalid argument |
| Protocol decode does not support segment kind 'expand' | \`:decode()\` on protocol using v2 generators |
| expand input length N is not a multiple of keyWidth M | Token stream not aligned to LUT key width |
| length(param) value N exceeds maximum for Nb field | Parameter too long for length prefix |
| withLength: input shorter than length prefix | Packet shorter than declared length |
| prefixFree violation | LUT codewords not prefix-free (parse time) |

---

## vs ASM

| Feature | asm | protocol |
|---------|-----|----------|
| Generates bits | ✓ | ✓ |
| Multiple outputs | ✗ | ✓ |
| Labels | Opcodes | Channels |
| Parameters | Registers, immediates | Named fields |
| Built-in transforms | R2b, A4b, S4b | reverse, parityEven, clock, repeat |
| Typical use | Machine code | UART, SPI, I2C, custom serial |

A protocol definition is entirely generic. The compiler has no knowledge of UART, SPI, I2C, SDA, SCL, MOSI, or SCLK — these are user-defined channel and parameter names.

---

## Related

- [huffman.md](huffman.md) — Huffman coding walkthrough (\`.huff\` + \`.huffPacket\` / \`.huffRecover\`)
- [lut.md](lut.md) — \`prefixFree\`, \`variableDepth\`, LUT invoke
- [asm.md](asm.md) — single-blob machine code
- [assignment-operators.md](assignment-operators.md) — dynamic-width assignment
`,
    'queue.md': `# Queue component (FIFO)

\`comp [queue]\` (shortname \`comp [fifo]\`) is a **first-in, first-out** buffer. Each slot holds a fixed-width binary value; capacity is \`length\` elements.

Use \`on: 1\` for level-triggered property blocks (push/pop run when \`set = 1\` in the same block).

---

## Syntax

\`\`\`
comp [queue] .q:
  width: 8
  length: 64
  on: 1
  :
\`\`\`

| Attribute | Default | Meaning |
|-----------|---------|---------|
| \`width\` | 8 | Bit width of each element |
| \`length\` | 64 | Maximum number of elements |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Trigger (last bit \`1\` applies other pins in the block) |
| \`push\` | \`width\` | Value to insert at the back |
| \`pop\` | 1 | Remove front element when \`1\` |
| \`clear\` | 1 | Empty the queue when \`1\` |
| \`get\` | \`width\` | Peek at front (same as \`front\`) |
| \`front\` | \`width\` | Peek at front without \`pop\` |
| \`empty\` | 1 | \`1\` when queue has no elements |
| \`full\` | 1 | \`1\` when queue cannot accept another push |
| \`size\` | \`sizeWidth\` | Current element count (zero-padded) |
| \`capacity\` | \`sizeWidth\` | \`length\` in binary |
| \`free\` | \`sizeWidth\` | \`length - size\` (slots remaining) |

\`sizeWidth\` = enough bits to represent \`0 .. length\` (e.g. \`length: 16\` → 5 bits).

---

## Example — push and peek

\`\`\`logts-play
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

.q:{ push = ^41
  set = 1 }
.q:{ push = ^42
  set = 1 }

8wire x = .q:get
show(x)
\`\`\`

\`:get\` and \`:front\` return the same value (\`^41\` = \`A\` at the front).

---

## Example — queue → terminal (key, wave)

Canonical pattern: **Load & Run** fills the queue; press **Next** once per character. Full script: [terminal.md — FIFO queue → terminal (key, wave)](terminal.md#runnable--fifo-queue--terminal-key-wave). Tests **1573**.

\`\`\`logts-play wave
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.q:{ push = ^48
  set = 1 }
.q:{ push = ^65
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6F
  set = 1 }

8wire c
.q:{ get >= c
  set = .next }
.term:{ append = c
  set = .next }
.q:{ pop = 1
  set = .next }
\`\`\`

---

## Example — \`front >=\`, \`size >=\`, \`free >=\`

\`\`\`logts-play
comp [queue] .q:
  width: 8
  length: 16
  on: 1
  :

.q:{ push = ^41
  set = 1 }
.q:{ push = ^42
  set = 1 }

4wire data
5wire n
5wire slots
.q:{
  front >= data
  size >= n
  free >= slots
  set = 1
}
show(data)
show(n)
show(slots)
\`\`\`

---

## Combination rules (same block, \`set\` edge)

| Combination | Behaviour |
|-------------|-----------|
| \`clear\` + \`push\` | clear, then push |
| \`clear\` + \`pop\` | pop, then clear |
| \`push\` + \`pop\` | error |
| all three | error |

---

## Related

- [stack.md](stack.md) — LIFO counterpart
- [mem.md](mem.md) — random-access storage
- [components.md](components.md)
`,
    'reg.md': `# REG — Register Built-in Function

\`REG\` is a built-in stateful register. It stores a bit-string of any width and updates its output based on a clock signal or a NEXT cycle.

\`\`\`
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
\`\`\`

The bit width is inferred automatically from the \`data\` argument at runtime — no width suffix is needed.

---

## Parameters

| Parameter | Type  | Description |
|-----------|-------|-------------|
| \`data\`    | Xbit  | Value to store. Determines the register width. |
| \`clock\`   | 1bit or \`~\` | Controls when \`data\` is latched. See clock modes below. |
| \`clear\`   | 1bit  | Synchronous reset. When \`1\`, the output is immediately set to all zeros, regardless of clock. |

---

## Clock modes

### Wire clock — falling-edge triggered

When \`clock\` is a regular wire, \`REG\` behaves as a **falling-edge register**:

- On **falling edge** (\`clock\` goes \`1\` → \`0\`): output ← current \`data\`
- Between edges: output **holds** its last latched value (changes to \`data\` while \`clk = 1\` do not update the output yet)
- \`clear = 1\` → output is forced to all zeros immediately (overrides clock)

This matches typical counter / state-machine usage with a DIP or key as clock: prepare \`data\` while \`clk = 1\`, then pulse \`clk\` low to capture.

\`\`\`logts-play
1wire data = 0
1wire clk  = 0
1wire clr  = 0
1wire q = REG(data, clk, clr)
# q = 0

data = 1
# q = 0  (no falling edge yet)

clk = 1
# q = 0  (rising edge does not latch)

data = 0
# q = 0  (still holding; data can change while clk=1)

clk = 0
# q = 0  (falling edge: captured data=0)

data = 1
clk = 1
# q = 0  (hold until next falling edge)

clk = 0
# q = 1  (falling edge: captured data=1)
\`\`\`

Works the same in **Legacy** and **Wave** propagation — on Wave, a \`setWire(clk, 0)\` that completes a \`1→0\` transition triggers the latch and propagates to downstream wires in the same step.

### NEXT clock — \`~\`

When \`clock\` is the special symbol \`~\`, \`REG\` behaves as an **edge-triggered register** that only updates on an explicit \`NEXT(~)\` call (or \`doNext()\`).

- On each \`NEXT(~)\`: output ← the value that \`data\` had during the previous cycle
- Wire changes to \`data\` between two NEXT calls **do not affect the output**
- \`clear = 1\` clears the pending value so the next NEXT produces all zeros

This behavior is the same in the editor (Wave propagation) and in Legacy mode. See [signal-propagation.md](signal-propagation.md) for when wires and displays update.

\`\`\`
1wire data = 1
1wire q = REG(data, ~, 0)
# q = 0  (initial, before any NEXT)

NEXT(~)
# q = 1  (latched data=1 from previous cycle)

data = 0
# q = 1  (hold: ~ clock ignores wire changes)

NEXT(~)
# q = 0  (latched data=0 from previous cycle)
\`\`\`

---

## Multi-bit registers

The register width is determined entirely by \`data\`. No suffix is required:

\`\`\`
4wire  d4  = 1010
8wire  d8  = 11001100
16wire d16 = 1111000011110000

1wire clk = 0
1wire clr = 0

4wire  q4  = REG(d4,  clk, clr)
8wire  q8  = REG(d8,  clk, clr)
16wire q16 = REG(d16, clk, clr)
\`\`\`

---

## Clear

\`clear = 1\` resets the output to all zeros immediately, regardless of the clock state:

\`\`\`
4wire data = 1111
1wire clk  = 1
1wire clr  = 0
4wire q = REG(data, clk, clr)
# q = 0000  (no falling edge yet)

clk = 0
# q = 1111  (falling edge captured data)

clr = 1
# q = 0000  (clear overrides)

clr = 0
clk = 1
clk = 0
# q = 1111  (falling edge captured data again)
\`\`\`

---

## Width

Width comes from \`data\` (e.g. \`1wire\` → 1 bit, \`4wire\` → 4 bits), similar to how \`MUX\` infers selector width from usage.

---

## doc() support

\`\`\`
doc(REG)
# REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
\`\`\`

\`REG\` also appears in \`doc(def)\` alongside all other built-in functions:

\`\`\`
doc(def)
# built-in:
# NOT, AND, OR, XOR, NXOR, NAND, NOR, EQ, LATCH, LSHIFT, RSHIFT, REG, MUX, DEMUX, ADD, ...
\`\`\`
`,
    'rotary.md': `# Rotary selector component

\`comp [rotary]\` is a **rotary knob** on the panel. The user selects one of \`states\` positions; the output is the index as an unsigned binary value.

Signature: \`doc(comp.rotary)\` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

\`\`\`
comp [rotary] .name:
  states: 8
  text: 'Channel'
  color: ^3498db
  for: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  nl
  :
\`\`\`

Minimal:

\`\`\`
comp [rotary] .name::
\`\`\`

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| \`states\`  | integer | \`8\`     | Number of positions (≥ 2) |
| \`text\`    | string  | \`''\`    | Label |
| \`color\`   | hex     | —       | Knob accent color |
| \`for\`     | array   | —       | Optional label per state |
| \`nl\`      | flag    | (no)    | Newline after control |

---

## Output width

Output bits = \`ceil(log₂(states))\`. Examples:

| \`states\` | Wire width | Max value |
|----------|------------|-----------|
| 4        | \`2wire\`    | \`11\` (3) |
| 8        | \`3wire\`    | \`111\` (7) |
| 16       | \`4wire\`    | \`1111\` (15) |

Read with \`.name:get\` or \`.name\`.

---

## Property block

Rotary supports \`set\` and \`data\` pins like other multi-bit components:

\`\`\`
comp [rotary] .sel:
  states: 4
  on: 1
  :

.sel:{
  data = externalValue
  set = trigger
}
\`\`\`

---

## Example

\`\`\`logts-play
comp [rotary] .ch:
  states: 8
  text: 'CH'
  for: ['0','1','2','3','4','5','6','7']
  :

3wire idx = .ch:get
show(idx)
\`\`\`

Turn the knob after **RUN** — \`idx\` shows the current position.

---

## Notes

- Panel control uses \`onChange\` when the selected state changes.
- Not allowed inside [chip.md](chip.md) bodies.
- \`probe(.ch)\` — [debug.md](debug.md).
`,
    'seven-seg.md': `# 7-segment display (\`7seg\`)

\`comp [7seg]\` (shortname \`comp [7]\`) renders a **7-segment (+ decimal point) display**. Segment pattern is 8 bits: \`a\`–\`g\` plus \`h\` (DP).

Signature: \`doc(comp.7seg)\` or \`doc(comp.7)\`.

---

## Syntax

\`\`\`
comp [7seg] .name:
  text: 'Value'
  color: ^f00
  bgColor: ^111
  lgColor: ^444
  scale: 2
  tranSec: 0
  nl
  :
\`\`\`

---

## Driving modes

| Pin | Width | Effect |
|-----|-------|--------|
| \`hex\` | 4 | Drive from hex digit \`0000\`–\`1111\` |
| \`a\`…\`h\` | 1 each | Direct segment control |
| \`set\` | 1 | Enable property block updates |
| \`get\` | 8 | Read back current segment pattern |

Direct assignment \`= 8bit\` sets initial pattern.

---

## Example — hex digit

\`\`\`logts-play
comp [7seg] .disp:
  color: ^f00
  scale: 2
  nl
  on: 1
  :

.disp:{
  hex = 0101
  set = 1
}

show(.disp:get)
\`\`\`

Shows digit **5**.

---

## Property block with wires

\`\`\`
4wire n = 1001

.disp:{
  hex = n
  set = 1
}
\`\`\`

---

## Notes

- Not allowed in [chip.md](chip.md) bodies.
- \`probe(.disp:get)\` — [debug.md](debug.md).
- Related: [14seg.md](14seg.md), [dots.md](dots.md), [lut.md](lut.md#display-decode--hex-0f) (hex 0–F via LUT).
`,
    'shifter.md': `# Shifter component

\`comp [shifter]\` (shortname \`comp [>]\`) is a **shift register**: shifts \`value\` left or right when enabled, with serial \`in\` / \`out\` bits.

Signature: \`doc(comp.shifter)\` or \`doc(comp.>)\`.

---

## Syntax

\`\`\`
comp [shifter] .name:
  depth: 4
  circular
  on: 1
  :
\`\`\`

| Attribute | Description |
|-----------|-------------|
| \`depth\` | Register width (default 4) |
| \`circular\` | When set, bits rotated wrap around |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Enable shift when \`on:\` holds |
| \`value\` | \`depth\` | Data to shift |
| \`dir\` | 1 | Direction (\`0\` = one way, \`1\` = other — see \`doc\`) |
| \`in\` | 1 | Bit shifted in |
| \`get\` | \`depth\` | Register contents after shift |
| \`out\` | 1 | Bit shifted out |

---

## Example

\`\`\`logts-play
comp [shifter] .sr:
  depth: 4
  on: 1
  :

.sr:{
  value = 1000
  dir = 0
  in = 1
  set = 1
}

4wire v = .sr:get
1wire bit = .sr:out
show(v, bit)
\`\`\`

---

## Related

- Built-in \`LSHIFT\` / \`RSHIFT\` in \`doc(def)\` — combinational, not a register
- [counter.md](counter.md)
- [components.md](components.md)
`,
    'short-notation.md': `# Short Notation

Short notation allows writing logical expressions in a compact way, using symbolic operators instead of explicit function calls.

For a full catalog of literal forms (\`\\N\`, \`\\-N;W\`, \`^HEX\`, \`^-HEX;W\`, \`"..."\`, binary, padding, bit range), see **[wire-literals.md](wire-literals.md)**.

The short notation zone is delimited by **backticks** (\`\` \` \`\`). Everything between two backticks is automatically expanded into standard function calls before tokenization.

\`\`\`
\`short expression\`  →  expanded into function calls
\`\`\`

---

## Operators

| Operator | Function | Type        |
|----------|----------|-------------|
| \`&\`      | AND      | prefix/infix |
| \`\\|\`     | OR       | prefix/infix |
| \`^\`      | XOR      | prefix/infix |
| \`=\`      | EQ       | infix        |
| \`!\`      | NOT      | prefix       |
| \`-&\`     | NAND     | prefix/infix |
| \`-\\|\`    | NOR      | prefix/infix |
| \`-^\`     | NXOR     | prefix/infix |
| \`+\`      | concat   | infix        |

**Prefix** = operator appears before the operand, with a single argument.  
**Infix** = operator appears between two operands, with two arguments.

\`+\` joins multi-bit segments inside one backtick zone. It has **lower precedence** than boolean operators (\`&\`, \`|\`, \`^\`, …): \`\` \`a & b + c & d\` \`\` → \`AND(a,b) + AND(c,d)\`.

---

## AND (\`&\`)

Applies the AND function to one or two operands.

### Prefix (one operand)

\`\`\`
\`& a\`          →  AND(a)
\`& a.0/4\`      →  AND(a.0/4)
\`\`\`

\`AND(a)\` with a single argument applies AND across all bits of \`a\`, yielding one bit.  
\`AND(a.0/4)\` applies AND across bits 0–3 (4 bits starting at position 0) of \`a\`.

### Infix (two operands)

\`\`\`
\`a & b\`        →  AND(a,b)
\`\`\`

\`AND(a,b)\` applies AND bit-by-bit between \`a\` and \`b\`.

---

## OR (\`|\`)

Applies the OR function to one or two operands.

### Prefix

\`\`\`
\`| a\`          →  OR(a)
\`| a.0-3\`      →  OR(a.0-3)
\`\`\`

\`OR(a)\` with a single argument applies OR across all bits, yielding one bit (1 if at least one bit is 1).

### Infix

\`\`\`
\`a | b\`        →  OR(a,b)
\`\`\`

\`OR(a,b)\` applies OR bit-by-bit between \`a\` and \`b\`.

---

## XOR (\`^\`)

Applies the XOR function to one or two operands.

### Prefix

\`\`\`
\`^ a\`          →  XOR(a)
\`^ a.0-3\`      →  XOR(a.0-3)
\`\`\`

\`XOR(a)\` with a single argument applies XOR across all bits (parity — 1 if the number of 1-bits is odd).

### Infix

\`\`\`
\`a ^ b\`        →  XOR(a,b)
\`\`\`

\`XOR(a,b)\` applies XOR bit-by-bit between \`a\` and \`b\`.

**Note:** \`^\` in short notation is always XOR, not a hex literal. For hex, use \`[^FF]\` (see Literals section).

---

## EQ (\`=\`)

Compares two operands bit-by-bit. Yields one bit: 1 if equal, 0 if not.

\`\`\`
\`a = b\`        →  EQ(a,b)
\`\`\`

**Note:** \`=\` is EQ only inside backticks. Outside backticks, \`=\` remains the assignment operator.

---

## NOT (\`!\`)

Inverts all bits of the operand.

\`\`\`
\`!a\`           →  !a
\`!a.0/4\`       →  !a.0/4
\`!(a | b)\`     →  !OR(a,b)
\`\`\`

\`!\` also works outside backticks (it is natively supported in the language). Inside short notation it can be combined with parentheses: \`!(a | b)\` inverts the result of the OR.

---

## NAND (\`-&\`)

AND inverted — result is NOT(AND(operands)).

### Prefix

\`\`\`
\`-& a\`         →  NAND(a)
\`\`\`

### Infix

\`\`\`
\`a -& b\`       →  NAND(a,b)
\`\`\`

---

## NOR (\`-|\`)

OR inverted — result is NOT(OR(operands)).

### Prefix

\`\`\`
\`-| a\`         →  NOR(a)
\`-| b.1/3\`     →  NOR(b.1/3)
\`\`\`

### Infix

\`\`\`
\`a -| b\`       →  NOR(a,b)
\`\`\`

---

## NXOR (\`-^\`)

XOR inverted (equivalence) — yields 1 if bits are equal.

### Prefix

\`\`\`
\`-^ a\`         →  NXOR(a)
\`\`\`

### Infix

\`\`\`
\`a -^ b\`       →  NXOR(a,b)
\`\`\`

---

## Parentheses and grouping

Round parentheses \`()\` group sub-expressions. Evaluation is **left-to-right** with no operator precedence.

\`\`\`
\`(a | b) & c\`              →  AND(OR(a,b),c)
\`(a | b) & (c | d)\`        →  AND(OR(a,b),OR(c,d))
\`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)\`
                            →  AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))
\`\`\`

### Left-to-right chaining

When multiple operators are chained without parentheses, evaluation is left-to-right:

\`\`\`
\`a | b | c\`                →  OR(OR(a,b),c)
\`a & b & c\`                →  AND(AND(a,b),c)
\`\`\`

---

## Mixed expressions

Prefix and infix operators can be combined. The prefix applies to the next atom, then the result participates as an operand in the infix expression:

\`\`\`
\`& a -| b\`                 →  NOR(AND(a),b)
\`\`\`

Step by step:
1. \`& a\` → \`AND(a)\` (prefix AND on \`a\`)
2. \`AND(a) -| b\` → \`NOR(AND(a),b)\` (infix NOR between AND result and \`b\`)

Another example:

\`\`\`
\`& (a | b)\`                →  AND(OR(a,b))
\`\`\`

1. \`(a | b)\` → \`OR(a,b)\` (grouping with parentheses)
2. \`& OR(a,b)\` → \`AND(OR(a,b))\` (prefix AND on OR result)

---

## Literals

### Binary literals

Work directly as operands, without special delimiters:

\`\`\`
\`^ 111\`                    →  XOR(111)
\`a & 1010\`                 →  AND(a,1010)
\`a | 1010 | 111\`           →  OR(OR(a,1010),111)
\`\`\`

### Hex literals — \`[^hex]\`

Because \`^\` is the XOR operator in short notation, hex literals must be enclosed in square brackets \`[]\`:

\`\`\`
\`^ [^F]\`                   →  XOR(^F)
\`a | [^FF]\`                →  OR(a,^FF)
\`a | [^FF] | 111\`          →  OR(OR(a,^FF),111)
\`\`\`

Square brackets are delimiters — they are stripped during expansion, and the content reaches the tokenizer as-is.

### Decimal literals — \`[\\dec]\`

Decimal literals (with \`\\\`) can be used directly or inside \`[]\`:

\`\`\`
\`a | \\31\`                  →  OR(a,\\31)
\`a | [\\31]\`                →  OR(a,\\31)
\`a | [^FF] | [\\31]\`        →  OR(OR(a,^FF),\\31)
\`\`\`

#### Signed decimal \`\\-N;W\`

Signed decimal literals require an **explicit width** after \`;\` (two's complement on exactly \`W\` bits). The \`;W\` suffix is **width**, not padding (unlike unsigned \`\\31;8\`).

\`\`\`
8wire a = \`\\-3;8\`           →  8wire a = \\-3;8
\`a | \\-3;8\`                →  OR(a,\\-3;8)
\`\\-3\` without \`;W\`         →  parse error
\`\`\`

### Signed value hex — \`[^-HEX;W]\`

In short notation, \`^\` outside \`[]\` is XOR — signed **value** hex uses brackets like unsigned hex:

\`\`\`
8wire a = \`[^-A;8]\`         →  8wire a = ^-A;8
\`a | [^-A;8]\`               →  OR(a,^-A;8)
\`^-A;8\` in backticks        →  INVALID (parsed as XOR) — use [^-A;8]
\`\`\`

\`^-HEX;W\` without brackets works in normal (non-backtick) expressions.

### Wire string literals — \`"..."\` / \`'...'\`

Both quote styles are equivalent. Each character → 8 bits (MSB-first), unsigned ASCII:

\`\`\`
40wire msg = \`"Hello"\`
msg = \`"Hi" + "\\s" + "!"\`    # \\s = explicit space
72wire q = \`"Question\\nAnswers:"\`
\`\`\`

Escapes inside quotes only: \`\\s\` \`\\n\` \`\\t\` \`\\r\` \`\\b\` \`\\0\` \`\\\\\` \`\\"\` \`\\'\`.

---

## Bit range on literals

Both binary (\`\\N\`) and hex (\`^N\`) literals support bit-range extraction directly, using the same \`.\` syntax used on variables.

### Syntax

\`\`\`
literal.start-end       # bits from index start to end (inclusive)
literal.start/len       # len bits starting at index start
literal./len            # len bits starting at index 0 (shorthand)
literal.bit             # single bit at index bit
\`\`\`

Bit indices are **0-based from the left** (MSB = index 0).

### Binary literal examples

\`\`\`
\\12 = 1100  (4 bits, decimal 12)

3wire c = \\12.0-2        # bits 0–2 of 1100 → 110
3wire d = \\12./3         # first 3 bits of 1100 → 110  (shorthand for .0/3)
3wire e = \\12.1-3        # bits 1–3 of 1100 → 100
1wire f = \\12.0          # bit 0 of 1100 → 1
\`\`\`

### Hex literal examples

\`\`\`
^f  = 1111  (4 bits, hex F)
^0f = 00001111  (8 bits, hex 0F)

4wire a = ^f./4          # first 4 bits of 1111 → 1111
3wire b = ^f.0-2         # bits 0–2 of 1111 → 111
4wire c = ^0f.4-7        # bits 4–7 of 00001111 → 1111
8wire d = ^0f./8         # first 8 bits of 00001111 → 00001111
\`\`\`

### Use in expressions

Literal bit-ranges can be combined with \`+\` (concatenation) or used as arguments to functions:

\`\`\`
# Concatenate two 8-bit slices into a 16-bit wire
16wire e = \\192./8 + ^0f./8
# \\192 = 11000000, ^0f = 00001111
# result: 1100000000001111

# Use as function argument
1wire p = OR(\\255./8)    # OR across all 8 bits of 11111111 → 1

# Mix with variables
8wire q = data./4 + \\0./4    # upper nibble of data, lower nibble = 0000
\`\`\`

### Notes on bit range

- \`\\N\` is converted to binary first (e.g. \`\\12\` → \`1100\`), then the bit range is applied.
- \`^N\` is converted to binary first (e.g. \`^f\` → \`1111\`, \`^ff\` → \`11111111\`), then the bit range is applied.
- The shorthand \`./len\` is equivalent to \`.0/len\` — start is always 0.
- If the requested range exceeds the literal's length, only the available bits are returned.
- Bit-range on literals works **outside** short notation too (anywhere an expression is accepted):

\`\`\`
3wire c = \\12.0-2          # outside backticks — works
3wire d = \`\\12 & 111\`      # inside backticks — works (no bitrange needed here)
\`\`\`

---

## Padding operator \`;p\`

The \`;p\` operator pads a value to \`p\` bits by adding zeroes on the left (\`padStart\`). It can be applied to literals and variables, optionally combined with a bit range.

**Signed literals:** on \`\\-N;W\` and \`^-HEX;W\`, the \`;W\` suffix is **always** two's-complement width (not padding). Unsigned \`\\N;8\` and \`^F;8\` keep the padding meaning above.

### Syntax

\`\`\`
value;p                 # pad value to p bits
value.bitrange;p        # extract bit range, then pad to p bits
\`\`\`

If the value is already \`p\` bits or longer, no change is made (no truncation).

### Binary literal with padding

\`\`\`
\\12;8    →  00001100   (\\12 = 1100, padded to 8 bits)
\\3;8     →  00000011   (\\3  = 11,   padded to 8 bits)
\\255;4   →  11111111   (already 8 bits, no truncation)
\`\`\`

### Hex literal with padding

\`\`\`
^2;8     →  00000010   (^2  = 0010, padded to 8 bits)
^f;8     →  00001111   (^f  = 1111, padded to 8 bits)
^ff;16   →  0000000011111111
\`\`\`

### Bit range combined with padding

\`\`\`
\\12.0-2;8    →  00000110   (bits 0–2 of 1100 = 110, padded to 8)
\\12./3;8     →  00000110   (first 3 bits = 110, padded to 8)
^0f.4-7;8   →  00001111   (bits 4–7 of 00001111 = 1111, padded to 8)
\`\`\`

### Variables with padding

\`\`\`
1wire aa = 1
8wire b = aa;8          # 00000001

8wire data = 11001100
8wire c = data.0-3;8    # bits 0–3 = 1100, padded to 8 → 00001100
\`\`\`

### Expressions combining padded values

The primary use case is building multi-bit values from smaller parts using \`+\` (concatenation):

\`\`\`
16wire df = \\12;8 + ^2;8
# \\12;8 = 00001100
# ^2;8  = 00000010
# df    = 0000110000000010
\`\`\`

This is equivalent to:

\`\`\`
8wire  tmp1 = \\12
8wire  tmp2 = ^2
16wire df   = tmp1 + tmp2
\`\`\`

### In short notation

\`;p\` works inside backticks. Note that hex literals inside backticks must use \`[^hex]\` syntax (because \`^\` is the XOR operator):

\`\`\`
8wire sn = \`\\12;8 & [^ff]\`
# expands to: AND(00001100, 11111111) = 00001100
\`\`\`

### Components and PCB instances with padding

The \`;p\` operator works on component property reads, direct component access, and PCB instance outputs:

\`\`\`
# Built-in component property
.mem:get;8          # pad memory read (4 bits) to 8 bits
.mem:get.0-1;8      # bits 0–1 of memory read, then pad to 8

# PCB pout
.myPcb:val;8        # pad PCB pout to 8 bits
.myPcb:val.0-3;8    # bits 0–3 of PCB pout, then pad to 8

# PCB direct return value
.myPcb;8            # pad PCB return value to 8 bits
.myPcb.0-3;8        # bits 0–3 of PCB return value, then pad to 8
\`\`\`

Example — extract and pad a PCB output:

\`\`\`
pcb +[alu]:
  1pin set
  4pout result
  exec: set
  on:1

  result = 1010
  :4bit result

pcb [alu] .a::

.a:{ set = 1 }

8wire x = .a:result;8    # 1010 padded to 8 bits → 00001010
8wire y = .a;8           # same via direct return → 00001010
8wire z = .a:result.0-1;8  # bits 0–1 = 10, padded to 8 → 00000010
\`\`\`

### Notes on padding

- Padding uses \`padStart(p, '0')\` — zeroes are added on the **left**.
- If \`value.length >= p\`, the value is returned unchanged (no truncation occurs).
- Padding is applied **after** bit range extraction: first bits are selected, then the result is padded.
- After padding, the value has no storage reference (\`ref = null\`) — it is a computed value.
- On PCB pouts without padding, the storage reference is preserved; padding breaks the reference (computed value only).

---

## Usage in context

Short notation can be used anywhere an expression appears in source code.

### In variable declarations

\`\`\`
8wire c = \`& (a | b)\`
\`\`\`

Expands to:

\`\`\`
8wire c = AND(OR(a,b))
\`\`\`

### In assignments

\`\`\`
e = \`(a.0/4 | b.0/4)\`
\`\`\`

Expands to:

\`\`\`
e = OR(a.0/4,b.0/4)
\`\`\`

### In function definitions (def)

\`\`\`
def q(8bit a, 8bit b):
   :4bit \`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)\`
   :1bit \`& (a | b)\`
\`\`\`

Expands to:

\`\`\`
def q(8bit a, 8bit b):
   :4bit AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))
   :1bit AND(OR(a,b))
\`\`\`

### Concatenation (\`+\`) inside one backtick zone

Use \`+\` between parenthesized segments to build a multi-bit value in a single short-notation zone:

\`\`\`
\`(0) + (1) + (1) + (0)\`              →  0 + 1 + 1 + 0
\`(0110) + ((!C.4) | (A.4 & B))\`      →  0110 + OR(!C.4,AND(A.4,B))
\`(a | b) + (c | d)\`                  →  OR(a,b) + OR(c,d)
\`\`\`

Extra parentheses for grouping are allowed (including around the whole concat or individual segments):

\`\`\`
\`((0110) + ((!C.4) | (A.4 & B)))\`    →  0110 + OR(!C.4,AND(A.4,B))
\`((a | b) & c)\`                      →  AND(OR(a,b),c)
\`\`\`

Boolean operators bind tighter than \`+\`:

\`\`\`
\`a & b + c & d\`   →   AND(a,b) + AND(c,d)
\`\`\`

### Multiple backtick zones on the same line

Backticks delimit independent zones. They can be combined with \`+\` (concatenation):

\`\`\`
\`a & b\` + \`c | d\`
\`\`\`

Expands to:

\`\`\`
AND(a,b) + OR(c,d)
\`\`\`

### Combination with loop

Short notation works together with \`loop\` blocks. The \`?\` placeholder is expanded by the loop preprocessor after short notation has been processed:

\`\`\`
loop 1..3[
   :1bit \`a.? | b.?\`
]
\`\`\`

Expands to:

\`\`\`
   :1bit OR(a.1,b.1)
   :1bit OR(a.2,b.2)
   :1bit OR(a.3,b.3)
\`\`\`

---

## Special variables

The language's special variables (\`~\`, \`%\`, \`$\`, \`_\`) work as operands in short notation:

\`\`\`
\`~ & a\`                    →  AND(~,a)
\`a | %\`                    →  OR(a,%)
\`\`\`

---

## Vector element access

Vector element syntax passes through unchanged inside backticks (same as plain wire bit ranges):

\`\`\`
4wire y = \`vectorA:0 & vectorA:1\`
4wire z = \`vectorA:1.0/2 | 11\`
\`\`\`

| In backticks | Expands to |
|--------------|------------|
| \`\` \`vectorA:0\` \`\` | \`vectorA:0\` |
| \`\` \`vectorA:1.0/2\` \`\` | \`vectorA:1.0/2\` |
| \`\` \`vectorA:0 \\| vectorA:1\` \`\` | \`OR(vectorA:0,vectorA:1)\` |

Requires the vector to be declared in normal script (\`4wire[3] vectorA\`). Dynamic index \`\` \`vectorA:(idx)\` \`\` is not supported in short notation.

---

## Limitations

- \`^\` inside backticks is always **XOR**. For hex literals, use \`[^FF]\`.
- \`()\` inside backticks are for **grouping**, not dynamic bit ranges. Expressions like \`a.(expr)/4\` are not supported in short notation.
- Dynamic vector index \`\` \`vectorA:(wire)\` \`\` is not supported in short notation (static \`:0\`, \`:1\`, … only).
- Backticks cannot be nested (a backtick closes the zone opened by the previous one).
- Backticks inside comments (\`#\` or \`#> ... #<\`) are ignored.
`,
    'signal-propagation.md': `# Signal propagation

When a wire or component output changes, every wire and display that depends on it is updated automatically. You do not need to call anything extra — assignments like \`1wire b = NOT(a)\` stay in sync with their inputs.

Wire assignment operators (\`=\`, \`:=\`, \`=:\`) and initial \`:\` control width handling; see [assignment-operators.md](assignment-operators.md). Legacy and wave use the same rules per operator.

This document explains **what you see** when values spread through your circuit. It does not describe internal engine details.

---

## When values update

| Event | What happens |
|-------|----------------|
| **RUN** | All wire assignments are evaluated. Displays (\`show\`) reflect the final settled values. |
| **NEXT(~)** | Wires that depend on \`~\`, \`%\`, or \`$\` are recomputed. Registers with \`REG(..., ~, ...)\` latch on \`NEXT\`. |
| **UI interaction** | Toggling a switch, pressing a key, changing a DIP, or an oscillator tick updates connected wires. |
| **Wire assignment in code** | Changing a wire (e.g. \`data = 1\`) updates everything downstream in the same step. |

---

## Wave (default in the editor)

The **Wave** model is used when you run programs in the editor (orange pill in the toolbar; see [editorUI.md](editorUI.md)). It works like a small simulation:

1. Changes are collected (wires and component outputs).
2. Dependent wires are recalculated until nothing else changes.
3. LEDs, 7-segment displays, and similar components refresh once everything is stable.

**What this means for you:**

- Combinational logic (\`NOT\`, \`AND\`, \`MUX\`, wires feeding other wires) behaves as you would expect in a schematic: all related outputs settle together before the screen updates.
- \`show(...)\` at the end of **RUN** or **NEXT** shows values **after** propagation finishes, not halfway through.
- \`peek(...)\` and \`probe(...)\` behave differently — see [debug.md](debug.md).

### Components that drive wires

These components can push their output into wires that read them (e.g. \`1wire x = .sw:get\`):

| Component | Trigger |
|-----------|---------|
| \`switch\` | Toggle on/off — see [interactive-components.md](interactive-components.md) |
| \`key\` | Press / release |
| \`dip\` | Change DIP positions |
| \`rotary\` | Turn the knob |
| \`osc\` | Each HIGH / LOW transition (real-time timers) |

Example:

\`\`\`logts-play wave
comp [switch] .sw::

1wire a = .sw:get
1wire b = NOT(a)

show(a, b)
\`\`\`

After **RUN**, \`a\` is \`0\` and \`b\` is \`1\`. When you flip the switch in the panel, \`a\` becomes \`1\` and \`b\` becomes \`0\` without running the script again.

### MODE ZSTATE — multi-driver commit

When \`MODE ZSTATE\` is active (wave only), wire updates use an extra **commit** phase inside each propagation wave. See **[modes.md](modes.md)** for all script modes and **[zstate.md](zstate.md)** for ZSTATE details.

1. All contributors are queued (\`bus = a\`, \`ZCONNECT(bus, en, data)\`, \`get>= bus\`, \`out>= bus\`, \`ZRELEASE(bus)\`, …).
2. **\`commitWireResolves\`** merges contributions **per bit** → \`0\`, \`1\`, \`Z\`, or \`X\`.
3. Connected components and displays refresh from the resolved value.

This is why multiple drivers in the **same step** can coexist on one bus without silent overwrite. Full rules: **[zstate.md](zstate.md)**.

---

## Legacy

**Legacy** propagation is the older model (green pill in the editor toolbar; see [editorUI.md](editorUI.md)). It updates wires **immediately** as each assignment runs, in program order. Automated tests in \`run_tests\` also use Legacy unless marked **wave**.

For most small programs the result is the same as Wave. Differences are rare and usually involve unusual feedback loops (a wire that depends on its own previous value in the same update). New projects should rely on the editor’s default (Wave); you do not need to configure anything.

---

## Wires and registers

### Combinational wires

Any wire expression can depend on other wires or component outputs:

\`\`\`
1wire a = 0
1wire b = 1
1wire sum = OR(a, b)
\`\`\`

Changing \`a\` or \`b\` eventually updates \`sum\`.

### \`REG\` with wire clock

\`REG(data, clk, clr)\` with a normal wire as \`clk\` is **falling-edge triggered**: output updates when \`clk\` goes \`1\` → \`0\`, sampling the current \`data\`. Between edges the output holds. See [reg.md](reg.md).

### \`REG\` with \`~\` (NEXT clock)

\`REG(data, ~, clr)\` only updates its output on **NEXT(~)**. Wire changes to \`data\` between two NEXT calls do not change the output until the next NEXT. Behavior is the same in Wave and Legacy. See [reg.md](reg.md).

---

## Debug output (\`show\`, \`peek\`, \`probe\`, \`watch\`)

How values appear in **Output** or the **Timeline** panel — syntax, timing, and runnable examples:

**[debug.md](debug.md)**

---

## PCB and property blocks

Programs that use **PCB** instances and property blocks (\`.instance:{ data=… set=wire on:1 }\`) work on **Wave** the same way as on Legacy for everything **outside** the PCB:

| Area | Wave behaviour |
|------|----------------|
| **External wires** (\`4wire q = .e\`, \`4wire out = .p:pout\`) | Updated through wave propagation after the PCB runs or after a trigger (\`setWire\`, switch, key). |
| **PCB pins** (\`setWire\` on an input pin) | Can fire property blocks with \`on:1\` / \`set = …\`; dependent external wires settle in the same propagation step. |
| **PCB pouts** | Output pins publish to external wires via wave scheduling (not a direct storage write). |
| **\`comp [reg]\` \`:get\`** | After a property block writes \`:data\` with \`:set = 1\`, wires that read \`.name:get\` are re-scheduled in the same wave step. |
| **Inside the PCB body** | Still runs in the older immediate model (\`insidePcbBody\`). Internal wires are not wave-deferred. |

**What this means for you:**

- Connect a PCB to the outside world as usual — pins, pouts, and \`4wire … = .instance:pin\` expressions behave like normal combinational links once propagation finishes.
- Interactive triggers (\`setWire\`, toggling a switch or key wired to \`set=\`) update external wires after the PCB block runs, in one settled step.
- A wire declared earlier in the same **RUN** (e.g. \`4wire d = 1010\` then \`comp [mem] … = d\`) is visible to component init and \`.mem = d\` on Wave — values are scheduled during elaboration before dependent statements run.

For examples and edge cases, see PCB tests **500–515** (legacy) and **516–531** (wave) in the test runner.

---

## Chip components

Chip bodies follow the **global** propagation strategy (wave or legacy), unlike PCB bodies which still run in the immediate \`insidePcbBody\` model.

| Area | Behaviour |
|------|-----------|
| **Chip definition body** | Uses wave scheduling when wave mode is active; legacy cascade otherwise. |
| **External wires** (\`4wire r = .u1:sum\`) | Updated after chip exec / property block, like PCB pouts. |
| **Property blocks** (\`.u1:{ a = … set = 1 }\`) | Same trigger semantics as PCB (\`on:1\`, \`on:raise\`, etc.). |
| **Nested chip instances** | Top-level chip types only; \`chip +[inner]\` inside a body is a parse error. |

See chip tests **540–543** (legacy) and **556–557** (wave) in the test runner.

---

## Quick reference

| Topic | Wave (editor) | Legacy |
|-------|---------------|--------|
| Default in editor | Yes | No |
| Wire + component updates | Settle together, then refresh UI | Update as each step runs |
| \`REG(..., ~, ...)\` + \`NEXT\` | Same as Legacy | Reference |
| \`REG(data, clk, clr)\` wire clock | Falling edge (\`clk\` 1→0); same semantics | Same |
| \`show\` | After settle | After each top-level step |
| \`probe\` | On every commit (elaboration registry) | On every commit |
| Self-referential wires (e.g. \`a = NOT(a)\`) | One update per user action | May differ in edge cases |

---

## Related documentation

- [Debug output](debug.md) — \`show\`, \`peek\`, \`probe\`
- [MODE ZSTATE](zstate.md) — tristate wires and multi-driver buses
- [Editor run controls](editorUI.md) — Run, Next, Wave / Legacy toggle
- [Interactive components](interactive-components.md) — switch, key, dip, rotary inputs
- [REG](reg.md) — wire-clock falling edge and \`NEXT\` clock (\`~\`)
- [Oscillator](oscillator.md) — real-time \`osc\` and wire connections
- [LED](led.md) — displays driven by wires and components
`,
    'slider.md': `# Slider component

\`comp [slider]\` is a **panel slider** for scalar N-bit values. The user drags a thumb along a track; the output is the step index as an unsigned binary value (\`0 … 2^length − 1\`).

Signature: \`doc(comp.slider)\` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

\`\`\`
comp [slider] .name:
  length: 8
  text: 'Operand'
  color: ^6dff9c
  orientation: 0
  reversed
  for: ['0','1','2','3']
  nl
  :
\`\`\`

Minimal (4 bits, default):

\`\`\`
comp [slider] .name::
\`\`\`

---

## Attributes

| Attribute     | Type    | Default   | Description |
|---------------|---------|-----------|-------------|
| \`length\`      | integer | \`4\`       | Output width in bits (\`Nwire\`) |
| \`text\`        | string  | \`''\`      | Panel label (max 5 chars displayed) |
| \`color\`       | hex     | \`#6dff9c\` | Thumb and value accent color |
| \`orientation\` | \`0\`/\`1\` | \`0\`       | \`0\` horizontal (min left), \`1\` vertical (min bottom) |
| \`reversed\`    | flag    | (no)      | Swap which **value** sits at each end; drag direction unchanged. Default \`0\` appears at the opposite end (right / top) |
| \`size\`        | integer | \`10\`      | Track length \`1…20\` (panel only); \`1\` = 3× thumb, \`10\` = default |
| \`for\`         | array   | —         | Optional label per step index (shown in panel instead of decimal) |
| \`nl\`          | flag    | (no)      | Newline after the control |

**Steps:** \`2^length\` (e.g. \`length: 8\` → 256 positions, \`00000000\` … \`11111111\`).

---

## Panel display vs debug

| Context | Display |
|---------|---------|
| **Panel** (\`.slider-value\`) | Decimal step index, or \`for[state]\` label when provided |
| **\`show\` / \`peek\` / \`probe\`** | Binary wire value |

---

## Output width

Output bits = \`length\` directly (unlike rotary, which uses \`ceil(log₂(states))\`).

| \`length\` | Wire width | Max value (decimal) |
|----------|------------|---------------------|
| 3        | \`3wire\`    | 7 (\`111\`) |
| 4        | \`4wire\`    | 15 (\`1111\`) |
| 8        | \`8wire\`    | 255 (\`11111111\`) |

Read with \`.name:get\` or \`.name\`.

### \`reversed\`

Drag always moves the thumb in the direction of the pointer. With \`reversed\`, only the **value mapping** changes: left/bottom outputs \`max\`, right/top outputs \`0\`. Initial value \`0\` places the thumb at the far end (right or top).

### \`size\`

Panel track length only (does not affect wire width). Linear scale from \`1\` to \`20\`, default \`10\`:

| \`size\` | Track length (approx.) |
|--------|------------------------|
| \`1\`    | 48px (3× thumb) |
| \`10\`   | 140px (default) |
| \`20\`   | 242px |

---

## Property block

Slider supports \`set\` and \`data\` pins like rotary:

\`\`\`
comp [slider] .sel:
  length: 4
  on: 1
  :

.sel:{
  data = externalValue
  set = trigger
}
\`\`\`

When \`set = 1\`, \`data\` drives the slider position.

---

## Example

\`\`\`logts-play
comp [slider] .op:
  length: 4
  text: 'A'
  for: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']
  :

4wire val = .op:get
\`\`\`

---

## Compared to dip and rotary

| Control | Best for |
|---------|----------|
| **dip** | Arbitrary bit patterns (each bit independent) |
| **rotary** | Few named states (\`states\` not necessarily \`2^bits\`) |
| **slider** | Many sequential values (\`0 … 2^length−1\`) with one drag control |
`,
    'stack.md': `# Stack component (LIFO)

\`comp [stack]\` (shortname \`comp [lifo]\`) is a **last-in, first-out** stack. Same attributes and status pouts as [queue](queue.md); peek uses \`top\` instead of \`front\`.

Use \`on: 1\` for level-triggered property blocks.

---

## Syntax

\`\`\`
comp [stack] .s:
  width: 8
  length: 64
  on: 1
  :
\`\`\`

| Attribute | Default | Meaning |
|-----------|---------|---------|
| \`width\` | 8 | Bit width of each element |
| \`length\` | 64 | Maximum stack depth |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Trigger |
| \`push\` | \`width\` | Push value onto stack |
| \`pop\` | 1 | Pop top when \`1\` |
| \`clear\` | 1 | Empty stack when \`1\` |
| \`get\` | \`width\` | Peek at top (same as \`top\`) |
| \`top\` | \`width\` | Peek without \`pop\` |
| \`empty\` / \`full\` / \`size\` / \`capacity\` / \`free\` | — | Same semantics as queue |

---

## Example — push and pop (LIFO)

\`\`\`logts-play
comp [stack] .s:
  width: 8
  length: 8
  on: 1
  :

.s:{ push = ^41
  set = 1 }
.s:{ push = ^42
  set = 1 }
.s:{ push = ^43
  set = 1 }

8wire t = .s:top
show(t)

.s:{ pop = 1
  set = 1 }

8wire t2 = .s:top
show(t2)
\`\`\`

After three pushes, \`:top\` is \`C\` (\`^43\`). After one pop, \`:top\` is \`B\` (\`^42\`).

---

## Example — \`top >=\` redirect

\`\`\`logts-play
comp [stack] .s:
  width: 8
  length: 16
  on: 1
  :

.s:{ push = ^41
  set = 1 }

8wire data
.s:{
  top >= data
  set = 1
}
show(data)
\`\`\`

---

## Example — stack → terminal (key, wave)

**Load & Run**, then press **Next** — LIFO order on [terminal](terminal.md). Full script: [terminal.md — LIFO stack → terminal (key, wave)](terminal.md#runnable--lifo-stack--terminal-key-wave). Tests **1574**.

\`\`\`logts-play wave
comp [stack] .s:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.s:{ push = ^41
  set = 1 }
.s:{ push = ^42
  set = 1 }
.s:{ push = ^43
  set = 1 }

8wire c
.s:{ top >= c
  set = .next }
.term:{ append = c
  set = .next }
.s:{ pop = 1
  set = .next }
\`\`\`

---

## Related

- [terminal.md](terminal.md) — drain stack bytes to a text console (LIFO example)
- [queue.md](queue.md) — FIFO counterpart
- [components.md](components.md)
`,
    'subtract.md': `# Subtract component

\`comp [subtract]\` (shortname \`comp [-]\`) performs **N-bit binary subtraction** with borrow flag on \`carry\`.

Built-in equivalent: \`SUBTRACT()\` in [arithmetic.md](arithmetic.md). Signature: \`doc(comp.subtract)\` or \`doc(comp.-)\`.

---

## Syntax

\`\`\`
comp [subtract] .name:
  depth: 4
  on: 1
  :
\`\`\`

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| \`set\` | 1 | Enable |
| \`a\`, \`b\` | \`depth\` | Operands (\`get\` = \`a - b\` mod 2^depth) |
| \`get\` | \`depth\` | Difference |
| \`carry\` | 1 | Borrow: \`1\` if \`a < b\` |

---

## Example

\`\`\`logts-play
comp [subtract] .sub:
  depth: 4
  on: 1
  :

.sub:{
  a = 0010
  b = 0100
  set = 1
}

4wire diff = .sub:get
1wire borrow = .sub:carry
show(diff, borrow)
\`\`\`

\`diff = 1110\` (wrap), \`borrow = 1\`.

---

## Related

- [adder.md](adder.md)
- [components.md](components.md)
`,
    'switch.md': `# Switch component

\`comp [switch]\` is a **toggle** input controlled from the devices panel. The value stays \`0\` or \`1\` until the user flips it again.

Signature: \`doc(comp.switch)\` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

\`\`\`
comp [switch] .name:
  text: 'Label'
  nl
  :
\`\`\`

Minimal:

\`\`\`
comp [switch] .name::
\`\`\`

---

## Attributes

| Attribute | Type   | Default | Description |
|-----------|--------|---------|-------------|
| \`text\`    | string | \`''\`    | Label next to the switch |
| \`nl\`      | flag   | (no)    | Newline after the control |

---

## Output

- **1 bit**: \`0\` (off) or \`1\` (on)
- Default \`0\` after **RUN** unless initialized with \`=\`

Read with \`.name\` or \`.name:get\` (equivalent).

---

## Example

\`\`\`logts-play
comp [switch] .pwr:
  text: 'Power'
  :

comp [led] .on:
  color: ^0f0
  nl
  :

.on = .pwr
\`\`\`

After **RUN**, toggle the switch in the panel — the LED updates without re-running the script.

---

## Notes

- Input only — you cannot assign \`.name = 1\` from code.
- Use **switch** for latched on/off; use [key.md](key.md) for momentary press.
- **1 bit only** — not a multi-bit databus source. For \`8wire\` magistrale with enable, use **\`ZCONNECT(bus, en, data)\`** ([zstate.md](zstate.md)) or wire assignment + merge; \`get>=\` from switch pads to bus width with \`0\`.
- Panel updates propagate through wires — [signal-propagation.md](signal-propagation.md).
- Debug: \`probe(.pwr)\` or \`probe(.pwr:get)\` — [debug.md](debug.md).
`,
    'terminal.md': `# Terminal component

\`comp [terminal]\` is a **scrollable text console**. Text is appended as a stream; the component manages cursor position, new lines, word wrapping, scrolling, and optional line numbers.

Unlike [lcd.md](lcd.md), text is not written at fixed coordinates — characters are appended sequentially.

Signature: \`doc(comp.terminal)\`.

---

## Syntax

\`\`\`
comp [terminal] .name:
  rows: 20
  columns: 80
  fontSize: 12
  wordWrap: 1
  lineNumbers: 0
  cursorStyle: 0
  color: ^0f0
  nl
  :
\`\`\`

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| \`rows\` | int | 20 | Number of visible rows |
| \`columns\` | int | 80 | Maximum characters per row before wrapping |
| \`fontSize\` | int | 12 | Font size in the devices panel |
| \`wordWrap\` | 0/1 | 1 | Wrap text when reaching column limit |
| \`lineNumbers\` | 0/1 | 0 | Show line numbers (visual only) |
| \`cursorStyle\` | 0/1/2 | 0 | Cursor display mode (see below) |
| \`color\` | hex | \`#0f0\` | Text (and cursor) color |
| \`nl\` | flag | off | Line break after terminal in devices panel |

### \`cursorStyle\`

| Value | Behavior |
|-------|----------|
| \`0\` | No cursor |
| \`1\` | Blinking underscore \`_\` at the next cell after the last character |
| \`2\` | Solid block cursor \`█\` (full cell, same color as text, always visible) |

The cursor is drawn at the **next position** after the last appended character. It scrolls with the viewport when the buffer scrolls.

### \`color\` and \`nl\`

- \`color: ^f3f\` — hex color for terminal text and cursor (same as [led.md](led.md) / [seven-seg.md](seven-seg.md)).
- \`nl\` — forces the next device on the panel to start on a new row (same as \`comp [led]\` / \`comp [switch]\`).

Add \`on: 1\` for **level-triggered** property blocks (execute whenever \`set\` is \`1\` on each run). Default is **rising edge** on \`set\` (0→1).

---

## Visual behavior

The terminal renders in the **devices panel** when you Run (monospace \`pre\` inside a framed \`div\`).

\`\`\`
+----------------------+
| Hello                |
| World                |
|                      |
+----------------------+
\`\`\`

With \`lineNumbers: 1\`:

\`\`\`
+----------------------+
| 1 | Hello            |
| 2 | World            |
|                      |
+----------------------+
\`\`\`

Line numbers are visual only — they are not part of the stored text.

The panel size is fixed at \`columns × rows\` character cells (it does not grow as text is appended).

---

## Cursor example

\`\`\`logts-play
comp [terminal] .term:
  rows: 3
  columns: 20
  cursorStyle: 2
  color: ^6f6
  on: 1
  :

.term:{
  append = ^48656C6C6F
  set = 1
}
\`\`\`

Display: \`Hello█\` (block cursor after the last character).

Use \`cursorStyle: 1\` for a blinking underscore cursor.

---

## Pins

| Pin | Role |
|-----|------|
| \`set\` | Trigger block (rising edge by default; use \`on: 1\` for level) |
| \`append\` | Insert bytes at cursor; cursor moves forward after each character |
| \`insert\` | Insert bytes at cursor; cursor stays on the same column |
| \`newline\` | Move cursor to next line |
| \`clear\` | Erase all contents |
| \`backDelete\` | 2-bit mode: delete backward relative to cursor (see below) |
| \`frontDelete\` | 2-bit mode: delete forward relative to cursor |
| \`moveCursor\` | 3-bit direction: \`1\` left · \`2\` right · \`3\` up · \`4\` down |

---

## Line editing (mini-shell)

The terminal keeps an internal cursor (\`cursorLine\`, \`cursorCol\`). Use \`cursorStyle: 1\` or \`2\` to show it.

### \`append\` vs \`insert\`

Both insert at the cursor and push existing text to the right.

| Pin | After each character | Example: \`Hel|lo\` + \`X\` |
|-----|-------------------|-------------------------|
| \`append\` | \`cursorCol++\` | \`HelX|lo\` |
| \`insert\` | column unchanged | \`Hel|Xlo\` |

### \`backDelete\` / \`frontDelete\` (modes 0–3)

| Mode | \`backDelete\` | \`frontDelete\` |
|------|--------------|---------------|
| \`0\` | noop | noop |
| \`1\` | one char left (not past line start) | one char at cursor |
| \`2\` | one char left, or join with previous line at col 0 | one char at cursor, or join with next line at EOL |
| \`3\` | delete from line start to cursor | delete from cursor to line end |

### \`moveCursor\` (0–4)

\`0\` noop · \`1\` left · \`2\` right · \`3\` up · \`4\` down (column clamped to target line length).

În **script** (property blocks, fire), valorile numerice >1 se scriu ca literal zecimal cu backslash (\`\\2\`, \`\\3\`) sau binar (\`10\`, \`11\`, \`100\`).  
\`2\`, \`3\`, \`4\` fără \`\\\` nu sunt literali valizi în expresii. În **atributele** componentei (\`rows: 8\`, \`cursorStyle: 2\`) zecimalul simplu este permis.

### Example — keyboard + backspace

\`MUX(sel, dataFor0, dataFor1)\` — \`sel=0\` → \`dataFor0\`, \`sel=1\` → \`dataFor1\`.  
Ex.: \`MUX(isBS, 1, 0)\` cu \`isBS=1\` returnează \`0\`.

**Atenție la \`moveCursor\` cu \`MUX\`:** \`MUX(sel, a, b)\` returnează \`b\` când \`sel=1\`. Pentru lanț „dacă \`isL\` → stânga, altfel dacă \`isR\` → dreapta…”, direcțiile se pun pe ramura \`sel=1\`, imbricate spre stânga (vezi exemplul line editor mai jos). O ordine inversată (\`MUX(isL, \\1, MUX(isR, \\2, …))\`) inversează săgețile și, la taste normale, forțează \`moveCursor\` stânga înainte de fiecare \`append\` — cursorul vizual pare blocat.

| Intenție | Expresie \`moveCursor\` (un singur rând) |
|----------|----------------------------------------|
| Corect | \`MUX(isL, MUX(isR, MUX(isU, MUX(isD, 0, \\4), \\3), \\2), \\1)\` |
| Greșit (săgeți inversate) | \`MUX(isL, \\1, MUX(isR, \\2, MUX(isU, \\3, MUX(isD, \\4, 0))))\` |

La varianta greșită, fiecare caracter tipărit execută \`moveCursor\` stânga *înainte* de \`append\` (ordinea pinilor în terminal), deci cursorul vizual pare blocat după prima tastă.

\`\`\`logts-play wave
comp [keyboard] .kbd:
  allowBackspace
  on: 1
  :

comp [terminal] .term:
  rows: 8
  columns: 40
  cursorStyle: 2
  on: 1
  :

8wire code = .kbd
1wire isBS = EQ(code, 00001000)
1wire isLF = EQ(code, 00001010)

.term:{
  backDelete = MUX(isBS, 0, \\1)
  append = MUX(OR(isBS + isLF), .kbd, 00000000)
  newline = isLF
  set = .kbd:valid
}
\`\`\`

### Example — keyboard + arrows + Delete (line editor)

\`\`\`logts-play wave
comp [keyboard] .kbd:
  allowBackspace
  allowArrows
  allowDelete
  allowEnter
  on: 1
  :

comp [terminal] .term:
  rows: 8
  columns: 40
  cursorStyle: 2
  on: 1
  :

8wire code = .kbd
1wire isBS = EQ(code, 00001000)
1wire isLF = EQ(code, 00001010)
1wire isDel = EQ(code, 10000100)
1wire isL = EQ(code, 10000000)
1wire isR = EQ(code, 10000001)
1wire isU = EQ(code, 10000010)
1wire isD = EQ(code, 10000011)

.term:{
  backDelete  = MUX(isBS, 0, \\2)
  frontDelete = MUX(isDel, 0, \\1)
  # MUX: isL=1→\\1 left, isR=1→\\2 right, isU=1→\\3 up, isD=1→\\4 down
  moveCursor  = MUX(isL, MUX(isR, MUX(isU, MUX(isD, 0, \\4), \\3), \\2), \\1)
  append      = MUX(OR(isBS + isLF + isDel + isL + isR + isU + isD), .kbd, 00000000)
  newline     = isLF
  set         = .kbd:valid
}
\`\`\`

Cu \`newline = isLF\`, terminalul folosește linii separate în buffer. \`backDelete\` mod \`\\1\` se oprește la începutul liniei; mod \`\\2\` unește linia curentă cu cea anterioară la \`col 0\` (comportament așteptat pentru editor multi-linie). Fără \`newline\` (doar \`append = .kbd\`), Enter inserează caracterul LF în text și \`backDelete\` mod \`\\1\` îl șterge ca orice alt byte.

Pentru mai multe semnale 1-bit în \`OR\`, concatenează cu \`+\` într-un singur argument: \`OR(isBS + isLF + isDel + …)\` — \`+\` alătură biții, iar \`OR\` cu un operand reduce la 1 dacă vreun bit e \`1\`.

Arrow codes on \`:get\` are \`^80\`–\`^83\`; forward Delete is \`^84\`. See [keyboard.md](keyboard.md#extended-keyboard-codes-128132).

---

## Appending text

\`\`\`logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{
  append = ^41
  set = 1
}
\`\`\`

Result: \`A\`

Multiple bytes:

\`\`\`logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{
  append = ^414243
  set = 1
}
\`\`\`

Result: \`ABC\`

### Byte literals (\`^hex\`) — ASCII reference

\`append\` takes **8-bit values** (one or more bytes in a single \`^…\` literal). Each pair of hex digits is one byte. Common printable ASCII:

| \`^hex\` | Character | Notes |
|--------|-----------|--------|
| \`^20\` | (space) | |
| \`^21\` | \`!\` | |
| \`^30\` … \`^39\` | \`0\` … \`9\` | digits |
| \`^41\` … \`^5A\` | \`A\` … \`Z\` | uppercase |
| \`^61\` … \`^7A\` | \`a\` … \`z\` | lowercase |
| \`^0A\` | LF | line feed — prefer \`newline = 1\` for new lines |
| \`^0D\` | CR | carriage return |

Examples: \`^41\` → \`A\`, \`^48\` → \`H\`, \`^48656C6C6F\` → \`Hello\` (five bytes).

Wider literals append **consecutive bytes** left to right: \`^414243\` → \`ABC\`.

---

## New line and clear

\`\`\`logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{ append = ^48656C6C6F
  set = 1 }
.term:{ newline = 1
  set = 1 }
.term:{ append = ^576F726C64
  set = 1 }
\`\`\`

Result:

\`\`\`
Hello
World
\`\`\`

Clear:

\`\`\`logts-play
.term:{
  clear = 1
  set = 1
}
\`\`\`

---

## Word wrap

With \`wordWrap: 1\` and \`columns: 10\`, appending \`HelloWorldABC\` produces:

\`\`\`
HelloWorld
ABC
\`\`\`

---

## Scrolling

When content exceeds \`rows\`, the display shows the **last** \`rows\` lines (scroll up).

Example: \`rows: 3\` with lines \`Line1\` … \`Line4\` visible as \`Line2\`, \`Line3\`, \`Line4\`.

---

## Queue / stack → terminal (wave)

LogTScript is a **digital logic simulator**, not a top-to-bottom script. After **Load & Run**, bytes stay in the queue/stack until **you** trigger the next step — typically with \`comp [key]\` on the panel. Use **wave** propagation (editor default); see [signal-propagation.md](signal-propagation.md).

**Pattern**

1. **Load & Run** — push bytes into the queue/stack (\`on: 1\` + \`set = 1\` blocks run once).
2. **One drain cycle** in source — three property blocks, all with \`set = .next\` (rising edge on the key):
   - \`get >= c\` / \`top >= c\` (peek)
   - \`append = c\` on the terminal (**no** \`on: 1\` on \`.term\` — default is edge-triggered)
   - \`pop = 1\`
3. Each **button press** (\`0→1\` on \`.next\`) runs that cycle once → one new character on the terminal.

\`MODE ZSTATE\` is **not required** here — it is for tristate multi-driver buses ([zstate.md](zstate.md)). User control comes from the **key** + wave edges, not from ZSTATE.

Verified in tests **1573** (queue → \`Hello\`) and **1574** (stack → \`CBA\`).

---

## Runnable — FIFO queue → terminal (key, wave)

**Load & Run**, then press **Next** once per character.

\`\`\`logts-play wave
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.q:{ push = ^48
  set = 1 }
.q:{ push = ^65
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6F
  set = 1 }

8wire c
.q:{ get >= c
  set = .next }
.term:{ append = c
  set = .next }
.q:{ pop = 1
  set = .next }
\`\`\`

After five presses: \`Hello\`. Pressing again on an empty queue errors (\`Queue is empty\`).

---

## Runnable — LIFO stack → terminal (key, wave)

\`\`\`logts-play wave
comp [stack] .s:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.s:{ push = ^41
  set = 1 }
.s:{ push = ^42
  set = 1 }
.s:{ push = ^43
  set = 1 }

8wire c
.s:{ top >= c
  set = .next }
.term:{ append = c
  set = .next }
.s:{ pop = 1
  set = .next }
\`\`\`

Three presses: \`C\`, then \`CB\`, then \`CBA\`.

Use \`top >=\` / \`get >=\` in a **separate** block **before** \`pop\` — never peek + \`pop\` in the same block.

---

## Runnable — one byte at Load & Run (legacy-style)

For a quick demo without pressing a key: same drain blocks with \`set = 1\` and \`on: 1\` on the terminal — only **one** drain cycle. Tests **1571** / **1572**.

\`\`\`logts-play
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  on: 1
  :

.q:{ push = ^48
  set = 1 }
.q:{ push = ^65
  set = 1 }

8wire c
.q:{ get >= c
  set = 1 }
.term:{ append = c
  set = 1 }
.q:{ pop = 1
  set = 1 }
\`\`\`

Display: \`H\` only.

---

## Why not copy several drain blocks with \`on: 1\`?

If you paste the drain cycle **multiple times** and use \`on: 1\` + \`set = 1\` on the terminal (all at **Load & Run**), you get wrong text (\`Heellllooooo\` instead of \`Hello\`).

**Cause:** \`on: 1\` means *level-triggered* — whenever the queue changes, wave propagation **re-evaluates every** block whose \`set\` is still \`1\`. After the second \`pop\`, the first \`.term:{ append = c }\` block is still “active” and runs again.

**What “do not re-run consumed terminal blocks” would mean (engine idea, not implemented):** mark a drain/append block as *done* after it has fired for the current queue front, so a later \`pop\` does not wake old append blocks. Today the fix is **one drain in source + rising edge per press** (key), not many level-triggered copies.

| Anti-pattern | Use instead |
|--------------|-------------|
| Several drain copies + \`on: 1\` at RUN | One drain + \`set = .next\` (key) |
| \`get >=\` + \`pop\` in one block | Separate blocks: peek, append, pop |
| Re-assign \`8wire c = .q:get\` each step | One \`8wire c\` + \`get >= c\` |

---

## Runnable — Hello World

\`\`\`logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{
  append = ^48656C6C6F20576F726C64
  set = 1
}
\`\`\`

Display: \`Hello World\`

---

## Runnable — Log output

\`\`\`logts-play
comp [terminal] .log:
  rows: 8
  columns: 60
  lineNumbers: 1
  on: 1
  :

.log:{ append = ^426F6F74206F6B
  set = 1 }
.log:{ newline = 1
  set = 1 }
.log:{ append = ^435055207265616479
  set = 1 }
\`\`\`

---

## Common errors

| Error | Cause |
|-------|-------|
| \`append expects at least 8 bits\` | Invalid append value |
| \`rows must be greater than 0\` | Invalid \`rows\` |
| \`columns must be greater than 0\` | Invalid \`columns\` |
| \`fontSize must be greater than 0\` | Invalid \`fontSize\` |
| \`cursorStyle must be 0, 1, or 2\` | Invalid \`cursorStyle\` |
| \`Unknown terminal property\` | Invalid property name |

---

## vs LCD

| Feature | terminal | lcd |
|---------|----------|-----|
| Stream append | yes | no |
| Automatic cursor | yes | no |
| Word wrap | yes | no |
| Scroll | yes | no |
| Fixed coordinates | no | yes |
| Character grid | yes | yes |

Use **terminal** for logs, serial output, debugging, and console-style applications.  
Use **lcd** when text must be written to specific screen positions.

---

## Related

- [lcd.md](lcd.md) — pixel matrix at fixed coordinates
- [debug.md](debug.md) — \`probe\` / \`show\`
- [future-component-ideas.md](future-component-ideas.md) — C6 Text terminal
`,
    'user-functions.md': `# User-defined functions (\`def\`)

Define reusable logic with **\`def\`**, then call it like a built-in function: \`name(arg1, arg2)\`.

User functions complement the built-in catalogue ([builtin-functions.md](builtin-functions.md)). Use \`doc(def)\` to list all names, or \`doc(myFunc)\` for one signature.

> **Not the same as protocol \`def\`.** Inside \`inline [protocol]\`, \`def\` names a local bit segment ([protocol.md](protocol.md#def--local-segments)). This page is about **script-level** \`def name(type param, …):\`.

---

## Syntax

\`\`\`logts
def name(Type param1, Type param2):
  # optional body — wires, components, show, …
  :ReturnType expression
  :OtherType otherExpr + more
\`\`\`

| Part | Rule |
|------|------|
| \`def\` | Keyword at **top level** of the script (or merged via \`LOAD\`) |
| \`name\` | Identifier — avoid built-in names (\`OR\`, \`ADD\`, \`MUX\`, …) |
| Parameters | \`Type id\` pairs, comma-separated inside \`( )\` |
| \`:\` after \`)\` | Required — starts the function block |
| Body | Optional statements on following lines (same indentation block) |
| Returns | One or more lines \`:Type expr\` — type + expression per return value |

Types use the same wire grammar as elsewhere: \`1bit\`, \`4bit\`, \`8wire\`, \`Nwire\`, etc.

---

## Runnable — simple function with one return

\`\`\`logts-play
def isZero(4bit n):
  :1bit !OR(n)

4wire x = 0010
1wire z = isZero(x)
show(z)
\`\`\`

\`isZero(x)\` evaluates the body (empty here), then the return line \`:1bit !OR(n)\`.

---

## Runnable — body + return (multi-step)

The body runs **before** return expressions are evaluated. You can declare wires and use built-ins inside the body:

\`\`\`logts-play
def eq4(4bit a, 4bit b):
  1bit r0 = !XOR(a.0, b.0)
  1bit r1 = !XOR(a.1, b.1)
  1bit r2 = !XOR(a.2, b.2)
  1bit r3 = !XOR(a.3, b.3)
  :1bit AND(AND(r0, r1), AND(r2, r3))

4wire p = 1010
4wire q = 1010
1wire same = eq4(p, q)
show(same)
\`\`\`

---

## Calling a function

### Basic call

\`\`\`logts
1bit flag = myFunc(a, b)
8wire y = helper(x)
\`\`\`

- Arguments are **expressions** (wires, literals, other calls, concatenation with \`+\`).
- Arity must match the parameter list — otherwise: \`Bad arity for myFunc\`.
- Prefix \`!\` works: \`!myFunc(a)\` negates the first return value (same as built-ins).

### Multiple return values

Declare one variable per return type, comma-separated on the left:

\`\`\`logts
def pair(1bit a, 1bit b):
  :1bit OR(a, b)
  :2bit a + a

1wire flag, 2wire bits = pair(.dip.0, .dip.1)
\`\`\`

Order matches the \`:Type\` return lines in the definition (first \`:line\` → first variable).

### Functions with no return

Omit all \`:Type …\` lines. The call is useful for side effects only (body statements):

\`\`\`logts
def bump(4wire counter):
  4wire next, 1wire carry = ADD(counter, 1)
  counter = next

# doc(myFunc) shows: bump(4wire counter)   (no "-> …")
\`\`\`

---

## Parameters

Parameters are **local names** bound to the argument bit strings for the duration of the call.

| Feature | Behaviour |
|---------|-----------|
| Bit ranges | \`a.0/4\`, \`a.4/4\` in expressions |
| Concatenation | \`a + b\` in return expressions |
| Short notation | \`\` \`a \\| b\` \`\` in \`:return\` lines (expanded like elsewhere) — see [short-notation.md](short-notation.md#in-function-definitions-def) |
| Reassignment | Parameters live in the function’s local scope; use wires in the body for intermediate results |

Arguments are passed **by value** (the bit string at call time).

---

## Where \`def\` is allowed

| Location | Define \`def\`? | Call user functions? |
|----------|---------------|----------------------|
| Top-level script | Yes | Yes |
| \`LOAD\`ed library file | Yes (merged into script) | Yes |
| \`pcb +[name]:\` body | No (define at top level) | Yes |
| \`board +[name]:\` body | **No** — parse error | Use top-level \`def\` |
| \`chip +[name]:\` body | **No** — parse error | Use top-level \`def\` |
| \`inline [protocol]\` | Protocol-local \`def\` only | N/A |

Board/chip bodies may **call** functions defined at script top level; they cannot contain a \`def\` keyword.

---

## Naming vs built-ins

Built-in functions (\`OR\`, \`ADD\`, \`MUX\`, \`REG\`, …) are resolved **first** at call time. A user definition:

\`\`\`logts
def OR(1bit a, 1bit b):
  :1bit AND(a, b)
\`\`\`

does **not** replace \`OR(...)\` in expressions — calls still use the built-in \`OR\`. Pick a distinct name (\`myOr\`, \`wideOr\`, …). Use \`doc(def)\` to see built-in names.

---

## Libraries: \`LOAD\` and \`@alias\`

Load another script’s functions into the current program:

\`\`\`logts
<path/to/library
\`\`\`

- The line must start with \`<\` at the beginning of the line (not \`a < b\`).
- All \`def\` entries from that file are merged into the current function table.

Optional alias namespace:

\`\`\`logts
<path/to/library @mylib
\`\`\`

Call with:

\`\`\`logts
8wire y = helper@mylib(x)
\`\`\`

Without \`@alias\`, call \`helper(x)\` directly. If the function exists only in a loaded library and you omit the alias, you may see: \`Function helper is not local; use helper@alias(...)\`.

---

## Tag overloads (\`; tag=…\`)

Multiple \`def\` entries may share the **same name and parameter list** and differ only by **tags** after a semicolon in the signature. Tags are part of the signature only — they never appear in the function body.

### Definition syntax

\`\`\`logts
def name(Type p1, Type p2; tag1=1 tag2=2 tag3):
  :ReturnType expr
\`\`\`

Parameters and tags are both inside \`( … )\`, separated by \`;\`.

| Form | Meaning |
|------|---------|
| \`tag1=1\` | Integer tag (decimal literal) |
| \`tag3\` | Boolean tag — presence means \`tag3=1\` |
| (no \`;\` section) | Base overload with no tags |

Rules:

- All overloads under one name must have the **same** parameter list (\`Type id\` pairs).
- A tag name cannot match a parameter name.
- Once a tag is **bool** in any overload, it cannot take an integer value in another (\`tag3\` then \`tag3=2\` → parse error).
- Duplicate tag signatures for the same name are rejected.

### Call syntax

\`\`\`logts
1wire x = myFunc(a, b; tag2=2 tag1)
1wire y = myFunc(a, b; tag3)
\`\`\`

- Tag order at the call site does **not** matter.
- Resolution requires an **exact** tag-set match (not a subset).
- Unmatched tags → \`no user function defined \\\`name\\\` and: tag2=2\`

### Exact matching — worked example (\`test\`)

Seven overloads can share the name \`test\` with the same parameters. Each overload is identified **only** by its full tag set.

| Overload | Definition tags | Example call | Result |
|----------|-----------------|--------------|--------|
| #1 | *(none)* | \`test(a, b)\` | base |
| #2 | \`tag1=1\` | \`test(a, b; tag1=1)\` | #2 |
| #3 | \`tag1=0\` | \`test(a, b; tag1=0)\` | #3 |
| #4 | \`tag1=2\` | \`test(a, b; tag1=2)\` | #4 |
| #5 | \`tag1=2 tag2=2\` | \`test(a, b; tag1=2 tag2=2)\` | #5 |
| #6 | \`tag1=1 tag2=3 tag3\` | \`test(a, b; tag1=1 tag2=3 tag3)\` | #6 |
| #7 | \`tag2=1\` | \`test(a, b; tag2=1)\` | #7 |

**Overload #5 in detail.** The definition must declare **both** tags with **both** values:

\`\`\`logts
def test(4bit p1, 4bit p2; tag1=2 tag2=2):
  :4bit ...
\`\`\`

The call must supply the **same** set — order irrelevant:

\`\`\`logts
test(a, b; tag1=2 tag2=2)   // matches #5
test(a, b; tag2=2 tag1=2)   // still #5
\`\`\`

These do **not** match #5:

\`\`\`logts
test(a, b; tag1=2)              // only one tag → #4, not #5
test(a, b; tag2=2)              // error — no overload with only tag2=2
test(a, b; tag1=1 tag2=2)       // tag1 is 1, not 2 — no such overload
test(a, b; tag1=2 tag2=2 tag3)  // extra tag — no overload with three tags
\`\`\`

Partial overlap is not enough: \`tag1=1\` matches #2, but \`tag1=1 tag3\` matches nothing because no definition has exactly \`{ tag1: 1, tag3: 1 }\`.

See also the design plan: [.cursor/plans/user_def_tag_overloads.plan.md](../../.cursor/plans/user_def_tag_overloads.plan.md) (overload #5 and full \`test\` table).

### Example — version-style overloads

\`\`\`logts
def myHash(10bit data; version=1):
  :10bit data

def myHash(10bit data; version=2):
  :10bit data

10wire d = 1010101010
10wire h = myHash(d; version=2)
\`\`\`

Use \`doc(myHash)\` to list every overload signature.

---

## Documentation helpers

| Call | Output |
|------|--------|
| \`doc(def)\` | Lists built-ins, debug keywords, and **all user** function names |
| \`doc(myFunc)\` | \`myFunc(8bit a, 1bit b) -> 1bit\` or multiple return types |
| \`doc(Unknown)\` | \`Unknown: undefined function\` |

Example:

\`\`\`logts-play
def add4(4bit a, 4bit b):
  :4bit a
  :1bit 0

doc(add4)
\`\`\`

---

## Execution model (brief)

1. Arguments are evaluated and bound to parameter names.
2. Body statements run in order (wires, components, \`show\`, etc.).
3. Each \`:Type expr\` return line is evaluated; results are returned to the caller.
4. Storage is shared with the caller (wires created in the body use the global storage pool), so prefer explicit parameters and return values for clear data flow.

---

## Related

- [doc-function.md](doc-function.md) — \`doc()\` reference (includes user \`def\` signatures)
- [builtin-functions.md](builtin-functions.md) — built-in catalogue
- [short-notation.md](short-notation.md) — \`\` \`…\` \`\` inside return lines
- [pcb.md](pcb.md) — calling \`def\` from PCB bodies
- [board.md](board.md) / [chip.md](chip.md) — \`def\` not allowed inside composite bodies
- [protocol.md](protocol.md) — protocol-local \`def\` (different feature)
`,
    'vector-reduction.md': `# Vector reduction functions

Reduction builtins operate on individual wires, whole **1D vectors**, or a mix. When a whole vector is passed without \`; vector\`, each element participates as a separate operand (scalar reduction).

Per-function pages: **[builtin-tagged-index.md](builtin-tagged-index.md)**.

See also: [1D wire vectors](wire-vectors.md), [2D \`; matrix\` mode](matrix-reduction.md), [arithmetic](arithmetic.md) (MAC, ADD).

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| SUM | [builtin-SUM.md](builtin-SUM.md) | \`signed\`, \`vector\`, \`matrix\`, \`row\`, \`col\` |
| DOT | [builtin-DOT.md](builtin-DOT.md) | \`signed\` |
| MIN | [builtin-MIN.md](builtin-MIN.md) | \`signed\`, \`vector\`, \`matrix\`, \`row\`, \`col\` |
| MAX | [builtin-MAX.md](builtin-MAX.md) | \`signed\`, \`vector\`, \`matrix\`, \`row\`, \`col\` |
| ARGMAX | [builtin-ARGMAX.md](builtin-ARGMAX.md) | \`signed\`, \`index\`, \`row\`, \`col\` |
| ARGMIN | [builtin-ARGMIN.md](builtin-ARGMIN.md) | \`signed\`, \`index\`, \`row\`, \`col\` |

Element-wise \`EQ\`: [builtin-EQ.md](builtin-EQ.md).

---

## Operand expansion (default, without \`; vector\`)

| Argument | Behaviour |
|----------|-----------|
| Plain wire \`a\` or slice \`a.1/3\` | One operand |
| Whole vector \`vectorA\` | Expands to \`vectorA:0\`, \`vectorA:1\`, … |
| Element \`vectorA:0\` | One operand (full element) |
| Element sub-range \`vectorA:0.1/2\` | One operand (bits within element) |
| Mix \`SUM(vectorA, x, vectorB)\` | Expand each whole vector; leave others as-is |

All expanded operands must have the **same bit width** (runtime error otherwise).

---

## Element-wise mode (\`; vector\`) {#element-wise-mode-vector}

With **\`; vector\`**, operands are combined **per index** and the result is a **vector**. Applies to all **rank-1** tensors: \`4wire[N]\`, \`4wire[1,N]\`, \`4wire[N,1]\` — matching **\`elementCount\`** and **\`elementWidth\`**.

At least **two** arguments and at least one **whole vector** are required. Other operands may be:

- another **whole** rank-1 vector of the same \`elementCount\`;
- a **scalar** / plain \`Wbit\` wire (broadcast to every index);
- an **element slice** \`vectorA:i\` or sub-range \`vectorA:i.j/k\` — evaluated as **W** bits (same as \`show(vectorA:i)\`), then broadcast.

| Call | Behaviour |
|------|-----------|
| \`SUM(vectorA, vectorB)\` | Expand → one scalar sum over all elements |
| \`SUM(vectorA, vectorB; vector)\` | Per index sum → \`Wbit[n]\` + \`Wbit[n] over\` |
| \`SUM(vectorA, vectorB:1; vector)\` | Per index sum; second operand is element \`1\` broadcast (equivalent to \`SUM(vectorA, 0011; vector)\` when \`vectorB:1\` = \`0011\`) |
| \`SUM(colA, colB; vector)\` | Same on \`4wire[N,1]\` — linear indices \`:0\`…\`:N-1\` |
| \`MIN(vectorA, 0001; vector)\` | Per index min → \`Wbit[n]\` |
| \`MAX(vectorA, vectorB; signed vector)\` | Per index max (signed) → \`Wbit[n]\` |
| \`GT(vectorA, vectorB; vector)\` | Per index compare → \`1wire[n]\` |
| \`EQ(vectorA, vectorB; vector)\` | Per index bitwise equal → \`1wire[n]\` |

\`signed\` and \`vector\` may appear in any order (\`; signed vector\` ≡ \`; vector signed\`).

\`\`\`logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, 0001; vector signed)
4wire[4] r, 4wire[4] o = SUM(vectorA, vectorB; vector)
4wire[4] r2, 4wire[4] o2 = SUM(vectorA, vectorB:1; vector)
show(r2)
\`\`\`

Element slice \`vectorB:1\` adds the value at index \`1\` to every index of \`vectorA\` (same width **W** as one cell).

\`\`\`logts-play
4wire[3,1] a = 0001 + 0010 + 0100
4wire[3,1] b = 0001 + 0010 + 0100
4wire[3] r, 4wire[3] f = ADD(a, b; vector)
show(r)
\`\`\`

**ARGMAX** / **ARGMIN** do not accept \`; vector\` (argument is already a whole vector). Details: [builtin-ARGMAX.md](builtin-ARGMAX.md), [builtin-ARGMIN.md](builtin-ARGMIN.md).

**DOT** requires two whole rank-1 tensors with the same **element count**; no \`; vector\` tag — [builtin-DOT.md](builtin-DOT.md).

---

## Element-wise mode (\`; matrix\`) {#element-wise-mode-matrix}

On **2D tensors** (\`4wire[N,M]\` with **N>1** and **M>1**), use **\`; matrix\`** for per-cell operations. Same built-ins as **\`; vector\`**, except **DOT**, **ARGMAX**, and **ARGMIN** (shape rules instead).

**\`; vector\`** and **\`; matrix\`** are **mutually exclusive**.

| Call | Behaviour |
|------|-----------|
| \`SUM(a, b; matrix)\` | Per cell sum → \`Wbit[N,M]\` + \`Wbit[N,M] over\` |
| \`MIN(a, b; matrix)\` | Per cell min → \`Wbit[N,M]\` |
| \`ADD(m, row; matrix)\` | Matrix + row vector broadcast → \`Wbit[N,M]\` |

Broadcast at cell \`(r,c)\`: matrix cell, scalar, or rank-1 vector (\`[1,M]\` across columns, \`[N,1]\` across rows). Compares (\`GT\`, \`LT\`, \`EQ\`) return **\`1wire[N×M]\`** (one bit per cell).

Semantics: **[matrix-reduction.md](matrix-reduction.md)**. Examples: **[builtin-SUM.md](builtin-SUM.md)**, **[builtin-ADD.md](builtin-ADD.md)**, **[builtin-MIN.md](builtin-MIN.md)**, … — [builtin-tagged-index.md](builtin-tagged-index.md).

---

## Axis reduction (\`; row\` / \`; col\`) {#axis-reduction-row-col}

On a **true matrix** (\`N>1\`, \`M>1\`), **SUM**, **MIN**, **MAX**, **ARGMAX**, and **ARGMIN** accept **\`; row\`** or **\`; col\`** to reduce along one axis:

| Tag | Reduces over | Output shape |
|-----|--------------|--------------|
| **\`; row\`** | columns (per row) | \`Wbit[N]\` or \`1wire[N×M]\` / index vector (ARG*) |
| **\`; col\`** | rows (per column) | \`Wbit[M]\` or \`1wire[N×M]\` / index vector (ARG*) |

Mutually exclusive with **\`; vector\`** and **\`; matrix\`**. Rank-1 tensors without axis tags → \`use scalar <FN> without col|row tag\`.

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] r, 4wire[2] o = SUM(m; row)
4wire[2] cmin = MIN(m; col)
4wire[2] rmax = MAX(m; row)
1wire[2] idx = ARGMAX(m; row; index)
show(r)
show(cmin)
show(rmax)
show(idx)
\`\`\`

Details: [builtin-SUM.md](builtin-SUM.md), [builtin-MIN.md](builtin-MIN.md), [builtin-MAX.md](builtin-MAX.md), [builtin-ARGMAX.md](builtin-ARGMAX.md), [builtin-ARGMIN.md](builtin-ARGMIN.md).

---

## Capacity notes

| Function | Bits needed (worst case) | Output width |
|----------|--------------------------|--------------|
| SUM (scalar) | \`W + ceil(log2(k))\` | **2W** (\`result\` + \`over\`) |
| SUM (\`; vector\`) | \`2W\` per index | **2W** per element |
| DOT | \`2W + ceil(log2(n))\` | **W** + **(2W)** over |

\`k\` = operand count after expansion; \`n\` = element count; \`W\` = element width.

Overflow beyond the documented output width is a **runtime error**.

For typical perceptron sizes (\`16wire[50]\`, \`32wire[50]\`, \`64wire[50]\`), built-in **BigInt** evaluation is sufficient.

---

## Related

- [wire-vectors.md — 2D tensors & \`; matrix\`](wire-vectors.md#2d-tensors-4wirenm)
- [matrix-reduction.md](matrix-reduction.md)
- [arithmetic.md](arithmetic.md)
- [builtin-MAC.md](builtin-MAC.md)
`,
    'wire-literals.md': `# Wire literals

Literals are fixed bit patterns written directly in expressions and assignments. They are the usual way to initialize wires, feed constants into gates, and build concatenations with \`+\`.

This page lists **every literal form** accepted on the right-hand side of wire assignments and in expression atoms (\`show\`, \`peek\`, function arguments, vector \`+\`, etc.).

Related: [assignment operators](assignment-operators.md) (\`=\`, \`:=\`, \`=:\`), [short notation](short-notation.md) (literals inside backticks), [debug output](debug.md) (\`show\` display tags including \`ascii\`), [MODE ZSTATE](zstate.md) (logic literals).

---

## Quick reference

| Form | Example | Meaning |
|------|---------|---------|
| **Binary** | \`1010\` | Bits as written (only \`0\` and \`1\`) |
| **Decimal unsigned** | \`\\255\` | Unsigned integer → minimal binary |
| **Grouped literal** | \`\\2 \\23 \\242;8\` | Multiple \`\\N\` values + one \`;tag\` on the last atom |
| **Decimal signed** | \`\\-3;s8\` | Two's complement on **exactly** \`W\` bits (\`;sW\`) |
| **Hex pattern** | \`^FF\` | Each hex digit → 4 bits (unsigned pattern) |
| **Hex value signed** | \`^-A;8\` | Signed numeric value in hex + **explicit** width |
| **Wire string** | \`"Hello"\` / \`'Hi'\` | One byte per character (8 bit), MSB-first in the wire |
| **Logic** (ZSTATE) | \`?10Z0\` | Tristate \`0\` / \`1\` / \`Z\` / \`X\` |
| **Meta constant** | \`/instance/\` | Compile-time constant from the meta registry |

Postfixes shared by several forms:

| Postfix | Example | Effect |
|---------|---------|--------|
| **Bit range** | \`\\255.0-7\`, \`^FF.4/8\` | Slice after conversion to bits |
| **Padding** \`;p\` | \`\\12;8\`, \`^f;8\` | Pad unsigned **scalar** literal to \`p\` bits (left zeroes) |
| **Grouped tag** | \`\\2 \\-1;s8\`, \`\\1.5;q4p4\` | Suffix on last atom applies to **all** elements in the group |

---

## Binary literals

A token of only \`0\` and \`1\` (with optional digits \`2\`–\`9\` forcing decimal interpretation — see below) is a **binary literal**.

\`\`\`logts-play
4wire a = 1010
show(a)
\`\`\`

| Rule | Detail |
|------|--------|
| Digits | \`0\` and \`1\` only for pure binary |
| Width | Number of characters = number of bits |
| Assignment | With \`=\`, wire width must match exactly |

Concatenation builds wider literals:

\`\`\`logts-play
8wire bus = 1111 + 0000
show(bus)
\`\`\`

---

## Decimal unsigned — \`\\N\`

Backslash introduces an **unsigned** decimal integer. The value is converted to binary (no leading-zero padding unless you add \`;p\`).

\`\`\`logts-play
8wire a = \\255
show(a)
\`\`\`

\`\`\`logts-play
4wire n = \\15
show(n)
\`\`\`

| Form | Result |
|------|--------|
| \`\\0\` | \`0\` |
| \`\\255\` | \`11111111\` (8 bits of value) |
| \`\\12;8\` | \`00001100\` — \`;8\` is **padding** to 8 bits |

\`\\N\` is also used for **vector indices** and some built-in arguments where a decimal index is required (e.g. \`vectorA:\\0\`).

---

## Decimal signed — \`\\-N;sW\`

Signed decimal literals use a **minus after the backslash** (or a positive \`\\N\`) and require an **explicit signed tag** \`;sW\` (\`W\` = two's-complement width).

\`\`\`logts-play
8wire a = \\-3;s8
show(a)
\`\`\`

| Source | Result on \`8wire\` |
|--------|-------------------|
| \`\\-3;s8\` | \`11111101\` (TC −3) |
| \`\\3;s8\` | \`00000011\` (TC +3) |
| \`\\-1;s4\` | \`1111\` on \`4wire\` |
| \`\\-3\` | **Parse error** — use \`;sW\` |
| \`\\-3;8\` | **Parse error** — use \`;s8\` for signed |
| \`\\-3;s4\` on \`8wire\` | **Width error** — pattern is 4 bits, wire is 8 |

In [short notation](short-notation.md):

\`\`\`
8wire c = \`\\-3;s8\`     →  same as \\-3;s8
\`\`\`

**Disambiguation \`;p\` vs grouped tag:** a **single** unsigned scalar \`\\31;8\` still uses \`;8\` as **padding**. A **group** of two or more atoms, or any \`;sW\` / \`;qXpY\` / \`;ascii\` suffix, uses the grouped-literal rules below.

---

## Grouped literals — \`\\v1 \\v2 … ;tag\`

A **group** is a whitespace-separated sequence of \`\\value\` atoms with **one suffix** on the last atom that applies **retroactively** to every element:

\`\`\`logts-play
8wire[4] v = \\2 \\23 \\242 \\1;8
show(v)
\`\`\`

| Suffix | Width | Meaning |
|--------|-------|---------|
| \`;M\` (digits only, **group** with ≥2 atoms) | M | Unsigned / padding per element |
| \`;sM\` | M | Signed two's complement per element |
| \`;qXpY\` | X+Y | Fixed-point QX.Y (e.g. \`;q4p4\` → 8 bit) |
| \`;fp16\`, \`;bf16\` | 16 | IEEE / brain float16 per element |
| \`;ascii\` | 8 | Byte per element (alias of \`;8\` in groups) |

Examples:

\`\`\`logts-play
8wire[4] v = \\2 \\-1 \\5 \\0;s8
show(v; signed)
\`\`\`

\`\`\`logts-play
8wire[4] v = \\2 \\-1.5 \\0.5 \\1;q4p4
show(v; q4p4)
\`\`\`

\`\`\`logts-play
16wire w = \\65 \\66;ascii
show(w; ascii)
\`\`\`

| Rule | Detail |
|------|--------|
| Single \`\\N\` without suffix | Unchanged — minimal unsigned width |
| \`\\N \\N\` without suffix | **Error** — missing width/format tag |
| \`\\-N;M\` (unsigned M) | **Error** — use \`;sM\` |
| Fractional \`\\1.5\` | Requires \`;qXpY\`, \`;fp16\`, or \`;bf16\` — not plain \`;8\` / \`;s8\` |

Concatenation between groups still uses \`+\`: \`\\1 \\2;8 + ^0F\`.

---

## Hex pattern (unsigned) — \`^HEX\`

Caret starts a **hex pattern**: each hex digit expands to **4 bits**. This is the unsigned bit pattern, not “the number in base 16” with automatic width.

\`\`\`logts-play
8wire a = ^FF
show(a)
\`\`\`

\`\`\`logts-play
4wire n = ^F
show(n)
\`\`\`

| Form | Bits |
|------|------|
| \`^F\` | \`1111\` |
| \`^0F\` | \`00001111\` |
| \`^FF;8\` | \`11111111\` if already ≥8 bits, else **padding** (unsigned \`;p\`) |

In short notation, \`^\` is XOR — use brackets: \`\` \`[^FF]\` \`\` → \`^FF\` (see [short-notation.md](short-notation.md)).

---

## Hex value signed — \`^-HEX;W\`

For a **signed numeric value** written in hexadecimal, use a minus **after** \`^\` and mandatory \`;W\`:

\`\`\`logts-play
8wire a = ^-A;8
show(a)
\`\`\`

| Source | Meaning |
|--------|---------|
| \`^-A;8\` | Value −10 → \`11110110\` on 8 bits |
| \`^-A\` | **Parse error** — missing \`;W\` |
| \`^F\` | Still **unsigned pattern** \`1111\` (not “signed −1”) |

Why not \`^-F\` without width? A hex **pattern** and a signed **value** are different concepts. Value hex signed always uses \`^-HEX;W\`.

Short notation:

\`\`\`
8wire a = \`[^-A;8]\`
\`\`\`

---

## Wire string — \`"..."\` and \`'...'\`

Double or single quotes delimit an **ASCII wire string**. Each character becomes **8 bits**; characters are packed **MSB-first** (first character = highest byte in the wire).

\`\`\`logts-play
40wire msg = "Hello"
show(msg)
\`\`\`

\`\`\`logts-play
8wire c = 'A'
show(c)
\`\`\`

Concatenation:

\`\`\`logts-play
24wire s = "Hi" + "!"
show(s)
\`\`\`

| Topic | Rule |
|-------|------|
| Width | \`N\` characters → \`N×8\` bits; declare \`8×N wire\` or use \`:=\` / \`=:\` |
| Quotes | \`"Hello"\` and \`'Hello'\` are equivalent |
| Charset | Code points 0–255 only (Latin-1 / ASCII + extensions) |

### Escapes (inside quotes only)

| Sequence | Byte |
|----------|------|
| \`\\s\` | Space (0x20) |
| \`\\n\` | Line feed (0x0A) |
| \`\\t\` | Tab (0x09) |
| \`\\r\` | Carriage return (0x0D) |
| \`\\b\` | Backspace (0x08) |
| \`\\0\` | NUL (0x00) |
| \`\\\\\` | Backslash |
| \`\\"\` / \`\\'\` | Quote character |

\`\`\`logts-play
16wire line = "a\\n"
show(line)
\`\`\`

**Outside quotes**, \`\\0\` remains the **unsigned decimal literal** zero, not a NUL byte. Context (quotes vs backslash-decimal) disambiguates.

---

## ASCII: literals vs \`show(…; ascii)\`

Two related features:

| | Wire string \`"Hello"\` | Tag \`show(w; ascii)\` |
|--|----------------------|----------------------|
| **Where** | Source code / assignment | Debug output only |
| **Effect** | Builds bits in the circuit | Formats existing bits as \`"Hello"\` |
| **NUL / control** | Real bytes in the wire | Display glyphs: \`□\` \`↵\` \`.\` (see [debug.md](debug.md)) |

Example — same bytes, source vs display:

\`\`\`logts-play
8wire code := 01000001
show(code)          # default hex
show(code; ascii)   # code (8wire) = "A"
\`\`\`

\`\`\`logts-play
8wire code := "A"
show(code; ascii)
\`\`\`

---

## Logic literals — \`?…\` (MODE ZSTATE)

In **\`MODE ZSTATE\`**, prefix \`?\` introduces a literal containing \`0\`, \`1\`, \`Z\`, and \`X\`:

\`\`\`logts-play wave
MODE ZSTATE

4wire bus = ?10Z0
show(bus)
\`\`\`

See [zstate.md](zstate.md). Not available in default wire mode.

---

## Meta constants — \`/name/\`

Slash-wrapped names refer to compile-time meta constants (e.g. \`/instance/\` for the current instance id):

\`\`\`logts
4wire x = /instance/
\`\`\`

Only in specific contexts (top-level wire init, some attributes). See component and meta-constant documentation.

---

## Bit range on literals

After binary, hex, or decimal literals, use the same \`.\` syntax as on wires:

\`\`\`
literal.start-end
literal.start/len
literal./len          # from bit 0
literal.bit           # single bit
\`\`\`

\`\`\`logts-play
8wire a = \\255.0-3
show(a)
\`\`\`

\`\`\`logts-play
8wire b = ^FF.4/4
show(b)
\`\`\`

Indices are **0-based from the left** (MSB = index 0). If the range exceeds the literal length, only available bits are returned.

---

## Padding \`;p\` (unsigned only)

Append \`;p\` to pad an **unsigned** literal to \`p\` bits with leading zeros:

\`\`\`logts-play
8wire a = \\3;8
show(a)
\`\`\`

\`\`\`logts-play
8wire b = ^2;8
show(b)
\`\`\`

Does **not** apply to signed \`\\-N;W\` / \`^-HEX;W\` — there \`;W\` is always TC width.

---

## Initializer \`:\` (declaration)

On wire declaration, colon init accepts literals only (not arbitrary expressions):

\`\`\`logts-play
4wire s : \\5
show(s)
\`\`\`

\`\`\`logts-play
8wire s : ^-A;8
show(s)
\`\`\`

\`\`\`logts-play
8wire s : "A"
show(s)
\`\`\`

---

## Strict width and assignment

With \`=\` (strict), the **evaluated bit length** must match the wire. Literals produce a fixed width:

| Literal | Bits produced |
|---------|----------------|
| \`1010\` | 4 |
| \`\\255\` | 8 (minimal binary of 255) |
| \`\\-3;8\` | 8 (from \`;8\`, not from wire type) |
| \`^FF\` | 8 |
| \`^-A;8\` | 8 |
| \`"Hello"\` | 40 |

Use \`:=\` or \`=:\` when you intentionally pad or truncate; see [assignment-operators.md](assignment-operators.md).

---

## Large decimals and \`show(…; dec)\` round-trip

Decimal literals use **BigInt** internally (not JavaScript \`Number\` / \`parseInt\`), so values far above \`Number.MAX_SAFE_INTEGER\` (~9×10¹⁵) are exact — for example \`\\5216694956355245935;64\`.

Wide wires in **\`show(w; dec)\`** / **\`show(w; dec signed)\`** are split into **64-bit chunks** (MSB first), then a remainder:

\`\`\`text
199wire msg =: "Hello\\sWorld"
show(msg; dec signed)
→ \\5216694956355245935 \\8245074968971313152 \\0 + \\0
  └ 64 bit              └ 64 bit              └ 64 + 7 bit rest
\`\`\`

You can rebuild the same bits from that output (unsigned chunk values with \`;64\` padding):

\`\`\`logts
199wire test = \\5216694956355245935;64 + \\8245074968971313152;64 + \\0;64 + \\0;7
\`\`\`

Each \`\\N;64\` pads the BigInt-derived binary to **at least 64 bits** (left zero-fill). Show chunk values are always below 2⁶⁴, so this matches the displayed unsigned chunk.

**Why 64-bit chunks (not 32)?** Chunk size is only a **display** convention. With BigInt literals, 64-bit chunk values round-trip correctly; 32-bit chunks would mean more tokens on wide buses without fixing the underlying precision issue (\`parseInt\` / \`Number\` still break above 2⁵³−1).

For copy-paste of arbitrary wide values without decimal, prefer **\`"…"\`** wire strings, binary concat, or \`probe\` / hex display.

---

## Module loading (editor)

Signed decimal, signed hex, and wire strings are implemented in \`core/wire-literals.js\`. The script editor loads it **before** \`parser.js\`. If you embed the runtime manually, include the same script order as \`run_tests.html\`.

---

## See also

- [short-notation.md](short-notation.md) — literals inside \`\` \` \`\` and \`[^hex]\` / \`\\-N;W\` rules
- [debug.md](debug.md) — \`show\` / \`peek\` / \`probe\` tags: \`dec\`, \`signed\`, \`hex\`, \`bin\`, \`ascii\`
- [number-conversion.md](number-conversion.md) — runtime conversion functions (N10S2N, etc.), not source literals
- [mem.md](mem.md) — memory initialization with literals
`,
    'wire-vectors.md': `# 1D wire vectors (\`4wire[3]\`)

A **vector** is a single contiguous wire with element metadata. Syntax: \`Nwire[count] name\` declares one wire of \`N × count\` bits. Element **0** is the **MSB** group (same bit-0 = MSB convention as bit-range).

See also: [assignment operators](assignment-operators.md), [debug output](debug.md), [MODE ZSTATE](zstate.md).

---

## Declaration

\`\`\`logts
4wire[3] vectorA
8wire[16] memoryRow
1wire[32] flags
\`\`\`

| Concept | Meaning |
|---------|---------|
| \`4wire[3]\` | 3 elements × 4 bits = **12-bit** wire |
| Internal storage | One wire; \`wire.vector = { elementWidth: 4, elementCount: 3 }\` |
| \`getBitWidth\` | Returns **12** (total bits) |
| Display type | \`4wire[3]\` in Variables, show, peek, Zlist — not \`12wire\` |

Multidimensional forms \`4wire[N,M]\` (2D tensors) are supported — see [2D tensors](#2d-tensors-4wirenm) below. Three or more dimensions (\`4wire[2,3,4]\`) are a **parse error**.

---

## 2D tensors (\`4wire[N,M]\`)

Contiguous wires with two-dimensional **metadata**. Syntax: \`Nwire[rows,cols] name\` stores \`N × rows × cols\` bits **row-major** (MSB-first, same as 1D vectors).

### Rank-1 vs matrix

| Shape | Role | \`; vector\` | \`; matrix\` (needs a true matrix operand) |
|-------|------|------------|------------------------------------------|
| \`4wire[N]\` | rank-1 vector | per index \`:i\` | broadcasts as row \`[1,N]\` when paired with a matrix |
| \`4wire[1,N]\` | rank-1 (horizontal) | per index \`:i\` | broadcasts across columns when paired with a matrix |
| \`4wire[N,1]\` | rank-1 (vertical) | per index \`:i\` | broadcasts across rows when paired with a matrix |
| \`4wire[R,C]\` **R>1 and C>1** | **matrix** | — (use \`; matrix\`) | per cell \`(r,c)\` |

**Rank-1** tensors (\`[N]\`, \`[1,N]\`, \`[N,1]\`) are **vectors**, not matrices. Built-ins compare **\`elementCount\`** and **\`elementWidth\`**, not whether the declaration used a comma. **\`DOT\`** on two rank-1 operands with the same length is a **scalar** dot product (\`[3,1]\`×\`[3,1]\` ≡ \`[3]\`×\`[3]\`).

Only **\`R>1\` and \`C>1\`** is a **matrix** for \`; matrix\`, **REPEAT** (rejected), and matrix-style indexing (\`m:r\` = row slice).

\`\`\`logts
4wire[3,2] matrixA      # matrix
4wire[3,1] colVec       # rank-1 vertical vector
4wire[1,3] rowVec       # rank-1 horizontal vector (same bits as 4wire[3] for show/index)
4wire[3] vec            # rank-1 (single-dim syntax)
\`\`\`

| Concept | Meaning |
|---------|---------|
| \`4wire[3,2]\` | 3×2 cells × 4 bits = **24-bit** wire — **matrix** |
| Internal storage | \`wire.tensor = { elementWidth: 4, dims: [3, 2] }\` plus \`wire.vector\` for compat |
| Display type | \`4wire[3,2]\` — not \`24wire\` |
| \`4wire[3,1]\` / \`4wire[1,3]\` | rank-1; type label may show \`4wire[3,1]\` or normalize to \`4wire[3]\` for \`[1,N]\` |
| \`show\` footer (rank-1) | \`has length [N]\` for all rank-1 shapes (including \`[N,1]\`) |
| \`show\` footer (matrix) | \`has shape [R,C]\` |

### Indexing (2D) {#indexing-2d}

| Syntax | Result |
|--------|--------|
| \`matrixA:r:c\` | cell \`(r,c)\` — scalar \`Nwire\` |
| \`matrixA:r\` | row \`r\` — vector of width \`cols × N\` |
| \`matrixA::c\` | column \`c\` — vector of width \`rows × N\` |
| \`vectorB:i\` | linear element \`i\` on rank-1 tensors (\`[N]\`, \`[1,N]\`, \`[N,1]\`) |

On a **matrix** (both dimensions > 1), a single \`:r\` indexes a **row slice**, not a linear cell. Use \`:r:c\` for individual cells.

In **\`; vector\`** / **\`; matrix\`** built-ins, these slices broadcast like scalars or rank-1 vectors: \`vectorB:i\` → **W** bits at every index; \`matrixA:r\` → row \`r\` across columns; \`matrixA::c\` → column \`c\` across rows. Details: [vector-reduction.md](vector-reduction.md#element-wise-mode-vector), [matrix-reduction.md](matrix-reduction.md#operand-broadcast-per-cell-rc).

\`\`\`logts-play
4wire[2,2] matrixA = 1111 + 0011 + 0101 + 0000
4wire a = matrixA:0:0
4wire b = matrixA:1:1
show(a)
show(b)
\`\`\`

### PIVOT

\`PIVOT(tensor)\` swaps rows and columns (transpose). Vectors change orientation: \`4wire[3]\` ↔ \`4wire[3,1]\`. The assignment target shape must match the transposed dimensions.

\`\`\`logts-play
4wire[3] row = 1111 + 0011 + 0101
4wire[3,1] col = PIVOT(row)
show(col)
\`\`\`

### REPEAT

\`REPEAT(data, times)\` tiles a whole wire **T** times. Plain wires concatenate; rank-1 tensors grow along the repeat axis (\`4wire[N]\` → \`4wire[N,T]\`, \`4wire[1,N]\` → \`4wire[T,N]\`). Matrices (\`R>1\`, \`C>1\`) are rejected. Max **16384** output bits. See [builtin-REPEAT.md](builtin-REPEAT.md).

\`\`\`logts-play
4wire[3] col = 0001 + 0010 + 0100
4wire[3,2] m = REPEAT(col, \\2)
4wire a = m:0:1
show(a)
\`\`\`

### Tag \`; matrix\` (element-wise on 2D tensors)

Full reference: **[matrix-reduction.md](matrix-reduction.md)**.

Use \`; matrix\` on the same built-ins as \`; vector\` (SUM, ADD, MIN, MAX, MULTIPLY, compares, shifts, etc.). **Mutually exclusive** with \`; vector\`. Requires at least one **matrix** operand (\`R>1\`, \`C>1\`). Other operands may be scalars, **rank-1 vectors** (\`[1,M]\` row or \`[N,1]\` column), or **tensor slices** (\`m:r\`, \`m::c\`, \`m:r:c\`) that broadcast the same way — see [matrix-reduction.md](matrix-reduction.md).

Example **\`ADD(… ; matrix)\`**: [builtin-ADD.md](builtin-ADD.md). Full list: [builtin-tagged-index.md](builtin-tagged-index.md).

Dual-output ops (\`ADD\`, \`SUM\`, \`MULTIPLY\`, …) return **per-cell** result and flag/over blobs shaped like the matrix.

### Oriented \`; vector\` (rank-1 broadcast)

For **\`4wire[N]\`** + **\`4wire[N,1]\`** (horizontal + vertical rank-1), **\`; vector\`** on **SUM** / **ADD** uses **oriented** broadcast: each output index \`i\` combines \`horiz[i]\` with **all** vertical elements. This is **not** the same as element-wise \`ADD(a, b; vector)\` on two \`[N,1]\` operands.

For element-wise ops on matching rank-1 shapes, use two tensors with the same **\`elementCount\`** (e.g. both \`4wire[3,1]\`).

\`\`\`logts-play
4wire[3] horiz = 0001 + 0010 + 0100
4wire[3,1] vert = 0001 + 0001 + 0001
4wire[3] r, 4wire[3] o = SUM(horiz, vert; vector)
show(r)
\`\`\`

### DOT and ARGMAX / ARGMIN on tensors

**DOT** has no \`; matrix\` tag — shape rules apply automatically:

| A | B | Result |
|---|---|--------|
| rank-1, same **N** elements (\`[N]\`, \`[1,N]\`, \`[N,1]\`) | rank-1, same **N** | scalar \`Wbit\` (+ \`2W\` over) |
| \`[N,1]\` | \`[1,N]\` (or \`[N]\` / \`[1,N]\`) | scalar |
| \`[N,K]\` | \`[K,M]\` | matrix \`[N,M]\` — result \`W\` bits/cell, over \`2W\` bits/cell |

**ARGMAX** / **ARGMIN** on a matrix return a **one-hot** over \`rows×cols\` bits, or with \`; index\` return \`(row, col)\` index wires.

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[4] hot = ARGMAX(m)
show(hot)
\`\`\`

### IDENTITY

\`IDENTITY(\\N)\` builds an **N×N** identity matrix. See [builtin-IDENTITY.md](builtin-IDENTITY.md).

### Tensor generators and transforms

| Function | Role | Doc |
|----------|------|-----|
| \`ZEROS(\\N)\` | zero N×N matrix | [builtin-ZEROS.md](builtin-ZEROS.md) |
| \`FILL(\\N, scalar)\` | constant fill | [builtin-FILL.md](builtin-FILL.md) |
| \`DIAG(vector)\` | diagonal from vector | [builtin-DIAG.md](builtin-DIAG.md) |
| \`IOTA(\\N)\` | index vector 0..N−1 | [builtin-IOTA.md](builtin-IOTA.md) |
| \`OUTER(col, row)\` | outer product [N,M] | [builtin-OUTER.md](builtin-OUTER.md) |
| \`TRACE(matrix)\` | sum of diagonal | [builtin-TRACE.md](builtin-TRACE.md) |
| \`NORM(v)\` / \`L2(v)\` | L2² = DOT(v,v) | [builtin-NORM.md](builtin-NORM.md) · [builtin-L2.md](builtin-L2.md) |
| \`TRIL\` / \`TRIU\` | lower / upper triangle | [builtin-TRIL.md](builtin-TRIL.md) · [builtin-TRIU.md](builtin-TRIU.md) |
| \`FLIPUD\` / \`FLIPLR\` | flip rows / columns | [builtin-FLIPUD.md](builtin-FLIPUD.md) · [builtin-FLIPLR.md](builtin-FLIPLR.md) |
| \`MCAT(A,B)\` | concat matrices | [builtin-MCAT.md](builtin-MCAT.md) |
| \`MSLICE(m,\\r,\\c,\\h,\\w)\` | submatrix window | [builtin-MSLICE.md](builtin-MSLICE.md) |
| \`REPEAT(data, times)\` | tile wire / vector | [builtin-REPEAT.md](builtin-REPEAT.md) |

\`\`\`logts-play
4wire[3,3] I = IDENTITY(\\3)
4wire[3,3] z = ZEROS(\\3)
4wire[3] idx = IOTA(\\3)
show(idx)
\`\`\`

Useful for matrix multiply baselines (\`DOT(A, I)\` ≡ \`A\`) and linear-algebra sketches.

---

## Initialization

Total width must match \`elementWidth × elementCount\`. All assignment operators (\`=\`, \`:=\`, \`=:\`, \`:\`) follow the same rules as a plain wire of that total width.

\`\`\`logts-play
4wire[3] vectorA = 1111 + 0011 + 0101
show(vectorA)
\`\`\`

Concatenation with \`+\` places the **first** operand at the MSB end (element 0).

---

## Element access

| Syntax | Equivalent bit-range | Notes |
|--------|---------------------|-------|
| \`vectorA:0\` | \`vectorA.0/4\` | Static index (decimal or binary literal) |
| \`vectorA:1\` | \`vectorA.4/4\` | Element 1 |
| \`vectorA:1.1/2\` | \`vectorA.5/2\` | Bits 1–2 within element 1 (element bit 0 = MSB) |
| \`vectorA:(index)\` | \`vectorA.(index×4)/4\` | Dynamic index — **wire name only** inside \`(...)\` |

\`\`\`logts-play
4wire[3] vectorA = 1111 + 0011 + 0101
4wire a = vectorA:0
4wire b = vectorA:1
show(a)
show(b)
\`\`\`

Index out of range (\`index < 0\` or \`index ≥ elementCount\`) is a runtime error. Indexing a non-vector wire (\`plain:0\`) is an error.

### Bit-range within an element

After the element index, use the same \`.start/len\` or \`.start-end\` syntax as on a plain wire. Ranges are **relative to the element** (bit 0 = MSB of that element):

\`\`\`logts
2wire slice = vectorA:1.1/2
vectorA:1.1/2 = 10
\`\`\`

\`vectorA:1.1/2\` is equivalent to \`vectorA.5/2\` on the underlying 12-bit wire when elements are 4 bits wide.

---

## Assignment to an element

Element assignment is a **slice write** (read-modify-write on the underlying wire). It is allowed in \`MODE STRICT\` even after the vector was initialized (unlike a full-wire reassignment).

\`\`\`logts
4wire[3] vectorA = 111111110000
vectorA:1 = 0011
\`\`\`

Result: \`111100110000\` — only element 1 changes.

---

## show / peek

For a whole **rank-1** tensor, output is **multi-line**:

\`\`\`text
vectorA = 111100110101 (12bit)
:0 = 1111 (4bit)
:1 = 0011 (4bit)
:2 = 0101 (4bit)
vectorA has length [3]
\`\`\`

(\`4wire[3,1]\` and \`4wire[1,3]\` use the same \`:i\` layout and \`has length [N]\`.)

| Case | Behaviour |
|------|-----------|
| \`show(vectorA)\` | Header + all elements if ≤ 5 elements |
| More than 5 elements | First three elements, \`..\`, last element |
| \`show(vectorA:1)\` | Single element line + \`has length [N]\` |
| \`show(matrixA)\` (matrix) | Per-cell \`:r:c\` lines + \`has shape [R,C]\` |
| \`show(matrixA:0)\` (row slice) | Flat row header + \`:0:0\`…\`:0:(C-1)\` cell lines + parent \`has shape [R,C]\` |
| \`peek(vectorA)\` | Same layout as \`show\` (emitted at statement position) |
| \`show(vectorA; elAll dec)\` | All cells in decimal; tags at end — see [debug.md — show](debug.md#show) |

---

## probe / watch

| Form | Example |
|------|---------|
| Whole vector | \`probe(vectorA)\` |
| Element | \`probe(vectorA:1)\` |
| Element bit-range | \`probe(vectorA:1.0/2)\` → label \`vectorA:1.0-1\` |
| Bit-range (plain wire) | \`probe(data.4/4)\` → label \`data.4-7\` |

**watch** uses the same slice forms. \`watch(vectorA)\` on \`4wire[3]\` expands to **12 flat columns** (\`vectorA.0\` … \`vectorA.11\`); use \`watch(vectorA:0)\` for a single element. See [debug.md — watch](debug.md#watch).

Slice probes emit on every committed wire change (including element splice). See [debug.md — probe](debug.md#probe).

---

## Reduction functions

Built-ins **SUM**, **MIN**, **MAX**, and **DOT** accept whole vectors (elements expand automatically), element slices (\`vectorA:0\`, \`vectorA:0.1/2\`), and plain wires. With **\`; vector\`**, an element slice such as \`vectorA:1\` is one **W**-bit value broadcast to every index (same evaluation as \`show(vectorA:1)\`).

See [vector-reduction.md](vector-reduction.md) for syntax, output widths (SUM **2W**, DOT **3W**), and examples.

---

## Zlist (MODE ZSTATE)

Only the **whole wire** name is valid:

\`\`\`logts
Zlist(vectorA)
\`\`\`

Header uses vector type: \`vectorA (4wire[3]):\`. Driver labels use element syntax, e.g. \`vectorA:1 = 0011\`. Requires wave propagation — see [zstate.md](zstate.md).

\`Zlist(vectorA:1)\` is **not** supported.

---

## ZCONNECT (V1 limits)

| Form | V1 |
|------|-----|
| \`vectorA = ZCONNECT(en, data12)\` | Yes — 12-bit bus |
| \`lane = ZCONNECT(en, vectorA:1)\` | Yes — element as 4-bit source |
| \`vectorA:1 = ZCONNECT(en, data)\` | **No** — tristate driver on element slice |

Details: plan section 10 in the repo plan file.

---

## Variables panel

The Variables panel shows one row per vector with type \`4wire[3]\` and the usual value truncation (\`...\` for long values).
`,
    'zstate.md': `# MODE ZSTATE — tristate wires and multi-driver buses

Part of **[script modes](modes.md)** (\`MODE STRICT\`, \`MODE WIREWRITE\`, \`MODE ZSTATE\`). This page is the full reference for **ZSTATE** only.

LogTScript’s default mode treats every wire as a single **binary** value (\`0\` or \`1\`). **\`MODE ZSTATE\`** adds **high-impedance (\`Z\`)** and **conflict (\`X\`)** states per bit, IEEE-1164-style logic gates, and a **multi-driver resolver** so several sources can drive the same bus in one propagation step.

Requires **wave** signal propagation (editor default). Legacy mode → error: \`ZSTATE requires wave signal propagation\`.

See also: [signal propagation](signal-propagation.md), [assignment operators](assignment-operators.md), [built-in functions](builtin-functions.md), [debug output](debug.md).

---

## Quick start

**Load & Run** — enable-gated databus (\`bus = ZCONNECT(en, data)\`):

\`\`\`logts-play wave
MODE ZSTATE

8wire databus
8wire cpuData = 10101010
8wire ramData = 11001100
1wire cpuEn = 1
1wire ramEn = 0

databus = ZCONNECT(cpuEn, cpuData)
databus = ZCONNECT(ramEn, ramData)
show(databus)
\`\`\`

Result: \`10101010\`. With both enables \`0\`, \`databus\` stays \`ZZZZZZZZ\` (no contribution). With both \`1\` and different data → conflicting bits become \`X\`.

**Statement sugar** (same semantics): \`ZCONNECT(bus, en, data)\` or \`ZCONN(bus, en, data)\` desugars to \`bus = ZCONNECT(en, data)\`.

---

## Running examples (Load / Load & Run)

Blocks use \`logts-play wave\` (orange **Wave** pill). Each shows **Load** and **Load & Run**:

| Button | Use |
|--------|-----|
| **Load** | Copy into editor; edit enables/data, then **RUN** |
| **Load & Run** | Run immediately; read **Output** and Variables panel |

ZSTATE examples need **wave** propagation — not Legacy.

---

## Activating ZSTATE

\`\`\`logts
MODE ZSTATE
\`\`\`

| Rule | Detail |
|------|--------|
| Opt-in | Scripts without \`MODE ZSTATE\` behave exactly as before |
| Wave only | Use the editor’s **wave** pill (orange) or tests with wave propagation |
| Combines with \`MODE WIREWRITE\` | Multiple assignments to the same wire in one step are **resolved**, not “last wins” |
| Combines with \`MODE STRICT\` | Width rules unchanged; ZSTATE only affects value alphabet and multi-driver |

---

## Wire values: \`0\`, \`1\`, \`Z\`, \`X\`

| Symbol | Meaning |
|--------|---------|
| \`0\`, \`1\` | Normal binary |
| \`Z\` | High-impedance — no active driver on that bit in the current step |
| \`X\` | Conflict — two or more drivers disagreed on that bit in the same step |

### Initial value

| Declaration | Result in ZSTATE |
|-------------|------------------|
| \`8wire bus\` (no \`=\`) | \`ZZZZZZZZ\` |
| \`8wire bus = ?ZZZZZZZZ\` | same (explicit literal) |
| \`3wire t = ?X1X\` | \`X\`, \`1\`, \`X\` (pedagogical seed; resolver overwrites on next multi-driver step) |

Literals with \`Z\` or \`X\` require prefix **\`?\`** when the token would start with \`Z\` or \`X\`. Digit-started literals can embed \`Z\`/\`X\` in the middle: \`3wire m = 10Z\`.

---

## Multi-driver resolution

Within one **wave** propagation step, contributions come from **\`ZCONNECT\` / \`w1\` / \`w0\` sugar**, **\`ZRELEASE\`**, and wire assignments \`bus = expr\` (multi-driver merge). Component redirects **\`get>=\` / \`out>=\` / \`front>=\` …** without \`w1\`/\`w0\` are **direct assigns** (STRICT-style), not bus contributions.

| Contributors (0/1 only) | Result |
|-------------------------|--------|
| none (only \`Z\` or absent) | \`Z\` |
| one value | that value |
| 2+ with same value | \`0\` or \`1\` |
| 2+ with different values | \`X\` |

Biții **\`Z\` într-o contribuție nu contează ca driver activ** — la merge, doar \`0\`/\`1\` concurează pe acel bit. The same applies to \`Z\` in **MUX** selected data when the result is assigned to a shared bus.

\`X\` is **not sticky**. On the next step, if only one driver remains, the bit becomes \`0\` or \`1\` again.

### \`ZCONNECT(en, data)\` — enable-gated drive

Expression used in wire assignment. Requires \`MODE ZSTATE\` + wave.

\`\`\`logts
databus = ZCONNECT(cpuEn, cpuData)
databus = ZCONNECT(ramEn, ramData)
\`\`\`

Statement sugar (equivalent):

\`\`\`logts
ZCONNECT(databus, cpuEn, cpuData)
ZCONN(databus, ramEn, ramData)   // alias
\`\`\`

| \`en\` | Effect |
|------|--------|
| strict \`1\` | Queue \`data\` as a bus contribution (\`Z\` bits in \`data\` do not drive) |
| \`0\`, \`Z\`, \`X\` | **No-op** — no contribution from this assignment |

\`data\` width must match the target bus. Multiple \`bus = ZCONNECT(…)\` on the same wire are re-evaluated on each wave commit (after enable wires update).

### Sugar: \`data w1 en\` / \`data w0 en\`

Assignment shorthand (tests **1575**–**1577**):

\`\`\`logts
databus = cpuData w1 cpuEn    # same as databus = ZCONNECT(cpuEn, cpuData)
bus = d w0 en                 # drive when en is strict 0 (not NOT(en))
\`\`\`

| Suffix | Drive when |
|--------|------------|
| \`w1 en\` | \`en\` bit is strict \`1\` |
| \`w0 en\` | \`en\` bit is strict \`0\` |
| (neither) | normal assignment / merge |

On component redirects, append the same suffix after the target wire:

\`\`\`logts
.sw:{ get >= bus w1 cpuEn
  set = 1 }
.sh:{ out>= bus w1 1
  set = 1 }
\`\`\`

- **\`set\`** = when the property block runs (trigger only).
- **\`w1\` / \`w0\`** = whether this output contributes to a shared bus (ZCONN semantics).

Without \`w1\`/\`w0\`, \`get>= bus\` writes the wire directly (one driver), even in \`MODE ZSTATE\`.

**Load & Run** — dual enable conflict:

\`\`\`logts-play wave
MODE ZSTATE

4wire bus
4wire a = 1010
4wire b = 0110
1wire enA = 1
1wire enB = 1

ZCONNECT(bus, enA, a)
ZCONNECT(bus, enB, b)
show(bus)
\`\`\`

Result: \`XX10\`.

### Driving a shared bus (1-bit switches)

\`comp [switch]\` is **1 bit**. On a shared bus use **\`get >= bus w1 enable\`** — the enable gates whether this redirect contributes (ZCONNECT semantics).

With **\`on: 1\`**, property blocks run on **every** linked switch change (level-triggered). **\`w1 1\`** means “always contribute when the block runs”. If both switches use \`w1 1\`, **both blocks run on each toggle** — the OFF switch still drives \`get = 0\`, so a lone ON switch produces **\`X\`** on the bus (not a clean \`10\`). For an **interactive panel** demo, gate each driver with **its own switch**:

**Load & Run** — two switches on \`2wire bus\` (test **1580**):

\`\`\`logts-play wave
MODE ZSTATE

2wire bus
comp [switch] .s1:
  on: 1
  :
comp [switch] .s2:
  on: 1
  :

.s1:{ get >= bus w1 .s1
  set = 1 }
.s2:{ get >= bus w1 .s2
  set = 1 }
\`\`\`

| Panel state | \`bus\` |
|-------------|-------|
| both OFF | \`ZZ\` |
| \`.s1\` or \`.s2\` ON alone | \`10\` |
| both ON | \`10\` |

**Static multi-driver demo** (tests **1465** / **1466**) — **\`w1 1\`** with blocks executed **once** after setting switch states (not panel toggle). Both switches \`1\` → \`bus = 10\` (agree). \`.s1 = 1\`, \`.s2 = 0\` but **both blocks run** → \`bus = X0\` (one drives \`1\`, one drives \`0\`). This documents conflict resolution, not interactive panel behaviour.

\`\`\`logts
.s1:{ get >= bus w1 1
  set = 1 }
.s2:{ get >= bus w1 1
  set = 1 }
\`\`\`

### \`set\` vs bus enable

\`set\` controls **when the property block runs**, not bus drive. Use **\`w1\` / \`w0\`** on the redirect for enable-gated bus contribution:

\`\`\`logts
.sw:{ get >= bus w1 en
  set = 1 }
\`\`\`

When \`en\` goes \`0→1\`, registered \`w1\` redirects refresh on the next wave (test **1461**).

### Re-assignment in the same step

**Load & Run** — per-bit resolve (not last-wins):

\`\`\`logts-play wave
MODE ZSTATE

4wire bus
4wire a = 1100
4wire b = 1010

bus = a
bus = b
show(bus)
\`\`\`

Result: \`1XX0\` (per-bit resolve, not last-wins).

### \`out>=\` (shifter and similar)

Use **\`out>= bus w1 en\`** for shared-bus drive; without suffix, direct assign. See [shifter.md](shifter.md). Tests **1498**–**1503**.

---

## \`ZRELEASE(wireName)\` — withdraw all drivers

Statement (not an expression):

\`\`\`logts
ZRELEASE(databus)
\`\`\`

**Withdraws every driver** on \`databus\` for the current wave step. The resolved value becomes **\`Z\`** because no active driver remains — \`ZRELEASE\` does not “assign \`ZZZ\`” as a stored literal; it clears contributions so the resolver yields high-impedance.

Requires \`MODE ZSTATE\`. Names \`z\`, \`Z\`, \`ZZZ\`, etc. remain valid as wire identifiers.

---

## Logic gates with \`Z\` / \`X\`

In ZSTATE, \`AND\`, \`OR\`, \`NOT\`, \`XOR\`, … use **IEEE 1164** when operands contain \`Z\` or \`X\`:

| Gate | Rule (simplified) |
|------|-------------------|
| \`AND\` | any \`0\` → \`0\`; all \`1\` → \`1\`; else \`X\` |
| \`OR\` | any \`1\` → \`1\`; all \`0\` → \`0\`; else \`X\` |
| \`NOT\` | \`0\`↔\`1\`; \`Z\`→\`X\`; \`X\`→\`X\` |

No runtime error — you can probe conflicts through combinational logic.

Detail: [built-in logic gate functions](builtin-logic-gate-functions.md#z-and-x-in-mode-zstate).

---

## Where \`Z\` / \`X\` cause errors

Operations that require **pure binary** operands error on \`Z\` or \`X\` (depending on operation):

| Category | Examples | ZSTATE notes |
|----------|----------|--------------|
| Arithmetic | \`ADD\`, \`SUBTRACT\`, … | \`Z\` and \`X\` → error |
| Routing | \`MUX\`, \`DEMUX\` | **\`MUX\` selector** must be strict \`0\`/\`1\`. **Selected** data: error on \`X\` only; \`Z\` allowed. Unselected MUX inputs are not checked. **\`DEMUX\`**: strict binary |
| Sequential | \`REG\`, memory address | \`Z\` / \`X\` → error |
| Shifts | \`LSHIFT\`, … | \`Z\` / \`X\` → error |

Message pattern: \`Cannot use wire with Z in ADD\` or \`Cannot use wire with X in MUX (selected data bit N)\`.

**Always OK:** \`show\`, \`peek\`, \`probe\`, \`watch\`, \`ZCONNECT\`, \`ZRELEASE\`, logic gates (IEEE).

**Always OK:** \`show\`, \`peek\`, \`probe\`, \`watch\` — display \`101X01ZZ\` as-is.

---

## Display and timeline

| Output | ZSTATE behaviour |
|--------|------------------|
| \`show\` / Variables panel | Literal \`Z\` and \`X\` in strings |
| \`probe\` (shared bus) | Suffix \` — driver:\` / \` — conflict:\` on each commit — see [debug.md](debug.md#zlist-mode-zstate) |
| \`Zlist\` | Full driver inventory at **RUN** (\`->\` / \`-> (active)\` + \`(resolved) =\`) |
| \`watch\` | \`Z\` → grey level; \`X\` → red (conflict) |
| LEDs / 7-seg | \`Z\` and \`X\` treated as off |

See [debug.md](debug.md#z-and-x-values-mode-zstate).

---

## Comparison with default binary mode

| Topic | Default | \`MODE ZSTATE\` |
|-------|---------|---------------|
| Undeclared init (\`8wire bus\`) | \`00000000\` | \`ZZZZZZZZ\` |
| Two drivers same step | Last write wins (or error in STRICT) | Per-bit resolve → \`X\` on conflict |
| Shared bus teaching | Not modeled | \`ZCONNECT\` + \`get>=\` / \`out>=\` + merge |
| Tristate component | N/A | Engine-level, no \`comp [bus]\` needed |

Historical note: [future component ideas — B4](future-component-ideas.md#b4-tristate--bus-buffer) originally proposed a buffer component; the shipped design is **engine ZSTATE** instead.

---

## Related documentation

| Topic | Page |
|-------|------|
| Assignment + \`MODE WIREWRITE\` | [assignment-operators.md](assignment-operators.md#mode-zstate-and-wirewrite) |
| Wave commit phase | [signal-propagation.md](signal-propagation.md#mode-zstate-multi-driver-commit) |
| Built-in \`ZRELEASE()\` / \`ZCONNECT()\` | [builtin-functions.md](builtin-functions.md) |
| Switch \`get>=\` | [switch.md](switch.md) |
| Shifter \`out>=\` | [shifter.md](shifter.md) |
`
  };
})();
