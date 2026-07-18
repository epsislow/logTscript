/**
 * AUTO-GENERATED — do not edit.
 * Regenerate: node node/_gen_doc_data.js
 * Files: 14seg.md, adder.md, alu.md, arithmetic.md, asm-composition.md, asm.md, assignment-operators.md, board.md, boolean-analysis.md, boolean-lut.md, builtin-ABS.md, builtin-ADD.md, builtin-ARGMAX.md, builtin-ARGMIN.md, builtin-bit-analysis-functions.md, builtin-bit-selection-functions.md, builtin-bit-transform-functions.md, builtin-CLAMP.md, builtin-DIAG.md, builtin-DIVIDE.md, builtin-DOT.md, builtin-EQ.md, builtin-FILL.md, builtin-FLIPLR.md, builtin-FLIPUD.md, builtin-functions.md, builtin-GT.md, builtin-IDENTITY.md, builtin-IOTA.md, builtin-L2.md, builtin-logic-gate-functions.md, builtin-LROTATE.md, builtin-LSHIFT.md, builtin-LT.md, builtin-MAC.md, builtin-MAX.md, builtin-MCAT.md, builtin-MIN.md, builtin-MSLICE.md, builtin-MULTIPLY.md, builtin-NFORMAT.md, builtin-NORM.md, builtin-OUTER.md, builtin-RANK.md, builtin-REPEAT.md, builtin-REVERSE.md, builtin-routing-functions.md, builtin-RROTATE.md, builtin-RSHIFT.md, builtin-sequential-functions.md, builtin-SHAPE.md, builtin-SORT.md, builtin-SUBTRACT.md, builtin-SUM.md, builtin-tagged-index.md, builtin-TRACE.md, builtin-TRIL.md, builtin-TRIU.md, builtin-ZEROS.md, chip-board-execution.md, chip.md, clcd-symbols.md, clcd.md, components.md, conditional-assignment.md, counter.md, debug.md, dip.md, divider.md, doc-function.md, doc-viewer.md, dots.md, editorUI.md, future-component-ideas.md, huffman-v2.md, huffman.md, interactive-components.md, ioport.md, json-subset.md, key.md, keyboard.md, lcd.md, led-bar.md, led.md, loop.md, lut.md, matrix-reduction.md, mem.md, meta-constants.md, mini-cpu-plan.md, mini-cpu-v2.md, mini-cpu.md, modes.md, multiplier.md, network-chat.md, network-traffic-panel.md, network.md, number-conversion.md, oscillator.md, pcb.md, pocket-calc.md, protocol-assemble.md, protocol-lut.md, protocol-parse.md, protocol-repeat.md, protocol-tentative.md, protocol.md, queue.md, reg.md, rotary.md, schema-field-arrays.md, schema-frame-padding.md, schema-variable-arrays.md, schema-variable-matrix.md, semantic-schemas.md, seven-seg.md, shifter.md, short-notation.md, signal-propagation.md, slider.md, sock.md, stack.md, subtract.md, switch.md, terminal.md, user-functions.md, vector-reduction.md, wire-literals.md, wire-vectors.md, zstate.md
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
| \`; sX to_…\` / \`; … to_sX\` | parametrized signed, width **X** |
| \`; qXpY to_…\` / \`; … to_qXpY\` | parametrized fixed-point, width **X+Y** (≤64) |

\`src\` and \`dst\` must differ. Formats: \`signed\`, \`sX\`, \`q4p4\`/\`q8p8\`/\`qXpY\`, \`fp16\`, \`bf16\` (and \`to_*\` for destination). Scalar, \`; vector\`, or \`; matrix\` (mutually exclusive). See [builtin-NFORMAT.md](builtin-NFORMAT.md).

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

See also: [script modes](modes.md) (\`MODE STRICT\`, \`MODE WIREWRITE\`, \`MODE ZSTATE\`), [signal propagation](signal-propagation.md), [conditional assignment](conditional-assignment.md), [wire vectors](wire-vectors.md), [wire literals](wire-literals.md), [ASM](asm.md).

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
  on: raise/edge/1
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

### Execution model

Same as [chip](chip.md): **elaboration** at \`board [type] .inst::\`, then **propagation** on each exec from a property block. Details and writing style: [chip-board-execution.md](chip-board-execution.md).

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
- [chip-board-execution.md](chip-board-execution.md) — elaboration and propagation
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
ARGMAX(Wbit[n,m] m ; row index) -> bitIndexWidth(m) wire[n]
ARGMAX(Wbit[n,m] m ; col) -> 1wire[n×m]
ARGMAX(Wbit[n,m] m ; col index) -> bitIndexWidth(n) wire[m]
\`\`\`

**No \`; vector\` tag** — the argument is already a whole tensor. Applies to any **rank-1** tensor (\`Wwire[N]\`, \`Wwire[1,N]\`, \`Wwire[N,1]\`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default (rank-1) | \`1wire[n]\` | **One-hot** mask (\`1\` at winning index) |
| \`index\` (rank-1) | \`bitIndexWidth(n)\` | Unsigned index of maximal element |
| whole matrix | \`1wire[n×m]\` | One-hot over all cells |
| matrix \`; index\` | \`bit rows\`, \`bit cols\` | Row and column index of global max |
| \`; row\` | \`1wire[n×m]\` | One \`1\` per row at the maximal column |
| \`; row index\` | \`bitIndexWidth(m) wire[n]\` | Column index per row |
| \`; col\` | \`1wire[n×m]\` | One \`1\` per column at the maximal row |
| \`; col index\` | \`bitIndexWidth(n) wire[m]\` | Row index per column |
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

### \`ARGMAX(Wbit[n,m] m ; row index)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[2] idx = ARGMAX(m; row index)
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
ARGMIN(Wbit[n,m] m ; row index) -> bitIndexWidth(m) wire[n]
ARGMIN(Wbit[n,m] m ; col) -> 1wire[n×m]
ARGMIN(Wbit[n,m] m ; col index) -> bitIndexWidth(n) wire[m]
\`\`\`

**No \`; vector\` tag** — the argument is already a whole tensor. Applies to any **rank-1** tensor (\`Wwire[N]\`, \`Wwire[1,N]\`, \`Wwire[N,1]\`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default (rank-1) | \`1wire[n]\` | One-hot at minimal index |
| \`index\` (rank-1) | \`bitIndexWidth(n)\` | Index of minimal element |
| whole matrix | \`1wire[n×m]\` | One-hot over all cells |
| matrix \`; index\` | \`bit rows\`, \`bit cols\` | Row and column index of global min |
| \`; row\` | \`1wire[n×m]\` | One \`1\` per row at the minimal column |
| \`; row index\` | \`bitIndexWidth(m) wire[n]\` | Column index per row |
| \`; col\` | \`1wire[n×m]\` | One \`1\` per column at the minimal row |
| \`; col index\` | \`bitIndexWidth(n) wire[m]\` | Row index per column |
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

### \`ARGMIN(Wbit[n,m] m ; row index)\`

\`\`\`logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[2] idx = ARGMIN(m; row index)
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

---

## WWIDTH

Returns the **declared / static** bit width of a literal, wire, or expression (from type metadata and AST inference), encoded as a minimal-width binary integer (like \`CNTONE\`).

\`\`\`
WWIDTH(X) -> Ybit
\`\`\`

### WWIDTH vs BITSIZE

| Input | WWIDTH | BITSIZE |
|-------|--------|---------|
| \`11111\` (literal) | \`11\` (5) | \`11\` (5) — same |
| \`10wire a\` | \`1010\` (declared 10) | length of current value (often 10) |
| \`8wire[2] b\` (whole vector) | \`1000\` (element 8b) | \`10000\` (storage 16b) |

Use **WWIDTH** for compile-time / declared scalar width (e.g. element width of \`Nw\` or \`Nw[N]\`). Use **BITSIZE** for the runtime length of the evaluated bit string.

### Examples

\`\`\`
WWIDTH(11111) -> 11
WWIDTH(a)     -> 1010    # when a is 10wire
WWIDTH(b)     -> 1000    # when b is 8wire[2] (element width 8, not 16)
\`\`\`

### Runnable example

\`\`\`logts-play
8wire[2] vec
4wire ew = WWIDTH(vec)
show(ew)
\`\`\`

### Schema field paths

When the wire has a semantic schema tag (\`40wire<frame> pkt\`), \`WWIDTH\` resolves **declared field width** from the schema definition (same paths as read/assign):

\`\`\`logts
40wire<frame> pkt := 0
4wire w = WWIDTH(pkt:tag)           # 8 → 1000 on 4wire target
3wire a = WWIDTH(pkt:slots:0:alu)   # 4 → 100 (minimal-width binary)
\`\`\`

Static indices only — dynamic \`(expr)\` indices are not supported at compile time.

### parseView (protocol) field paths

When the wire has a **parseView** tree (after \`=: .myProto { … }\`), \`WWIDTH\` uses the same resolution as \`show\` and field read — **parseView first**, then schema if both exist:

\`\`\`logts
16wire parsed = .repeatPv { data = ... }
4wire w = WWIDTH(parsed:packet:0:kind)   # width from protocol def (e.g. 8b)
\`\`\`

Repeated sections require an explicit index (\`packet:0:kind\`, not \`packet:kind\`) — same error as read access.
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
| **Bit analysis** | \`PARITY\`, \`CNTONE\`, \`CNTZERO\`, \`BITSIZE\`, \`WWIDTH\` | [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md) |
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
NFORMAT(Xbit a; sX to_<dst>) -> Wdst result, 4bit status
NFORMAT((X+Y)bit a; qXpY to_<dst>) -> Wdst result, 4bit status
\`\`\`

Use \`doc(NFORMAT)\` for the full signature list from \`Interpreter.BUILTIN_DOC\`.

## Call tags

Exactly **one source** tag and **one destination** tag (\`to_*\`). Source and destination must differ. Optional **\`; vector\`** or **\`; matrix\`** (mutually exclusive).

| Source tag | Operand width | Meaning |
|------------|---------------|---------|
| \`signed\` | any *W* (adaptive) | Two's complement integer on *W* bits |
| \`sX\` | exactly **X** (1≤X≤64) | Two's complement integer, fixed width |
| \`uX\` | exactly **X** (1≤X≤64) | Unsigned integer, fixed width |
| \`q4p4\` | **8** | Q4.4 fixed-point |
| \`q8p8\` | **16** | Q8.8 fixed-point |
| \`qXpY\` | exactly **X+Y** (≤64) | Signed fixed-point Q{X}.{Y} |
| \`fp16\` | **16** | IEEE 754 half |
| \`bf16\` | **16** | Brain float 16 |

| Destination tag | Result width |
|-----------------|--------------|
| \`to_signed\` | same as operand |
| \`to_sX\` | **X** |
| \`to_uX\` | **X** |
| \`to_q4p4\` | **8** |
| \`to_q8p8\` | **16** |
| \`to_qXpY\` | **X+Y** |
| \`to_fp16\` | **16** |
| \`to_bf16\` | **16** |

**\`signed\`** uses the operand width adaptively; **\`sX\`** / **\`uX\`** fix the width (\`; sX\` / \`; uX\` validates the operand is exactly X bits). The same applies to \`to_signed\` / \`to_sX\` / \`to_uX\` for the result.

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

### Parametrized \`sX\` / \`qXpY\`

\`\`\`logts-play
8wire a = 01110000
16wire r, 4wire st = NFORMAT(a; s8 to_fp16)
show(r; fp16)
\`\`\`

\`s8\` reads the 8-bit operand as a signed integer (\`112\`) and converts to fp16. Use \`to_sX\` / \`to_qXpY\` to control the result width, e.g. \`NFORMAT(x; q6p2 to_s16)\`.
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

- **\`data\`** — whole wire (plain or tensor), **literal** (\`"abc"\`, \`1010\`, \`^FF\`), or bit expression; no slices on wires when tensor output is needed.
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

### String literal

Each character → 8-bit ASCII (same as \`"abc"\` in wire assignment).

\`\`\`logts-play
48wire msg = REPEAT("abc", \\2)
show(msg)
\`\`\`

\`"abc"\` = 24 bits; ×2 → **48** bits (\`abcabc\` as bytes on the wire).

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
LATCH(Xbit data, 1bit clock, 1bit clear) -> Xbit
\`\`\`

Transparent latch: when \`clock = 1\`, output follows \`data\`; when \`clock = 0\`, output holds. \`clear = 1\` forces all zeros immediately (same as \`REG\`).

### Wire clock — level-sensitive

Use a regular wire as \`clock\`. While \`clock = 1\`, output tracks \`data\`; when \`clock = 0\`, output holds.

### NEXT clock — \`~\`

When \`clock\` is \`~\`, \`LATCH\` updates on each \`NEXT(~)\` (or \`doNext()\`):

- On each \`NEXT(~)\`: output ← **current** \`data\` (latch open — transparent)
- Between \`NEXT\` calls: output **holds** even if \`data\` changes
- \`clear = 1\` → all zeros immediately

Compare with \`REG(data, ~, clr)\`: \`REG\` latches the value \`data\` had **before** the \`NEXT\`; \`LATCH\` follows \`data\` **at** the \`NEXT\`. See [reg.md](reg.md) for \`REG\` clock modes.

### Runnable example (wire clock)

\`\`\`logts-play
4wire data = 1010
1wire clk = 1
1wire clr = 0
4wire out = LATCH(data, clk, clr)
probe(out)
\`\`\`

### Runnable example (\`~\` clock)

\`\`\`logts-play
1wire data = 1
1wire clr = 0
1wire q = LATCH(data, ~, clr)
# q = 0 before any NEXT

NEXT(~)
# q = 1 (follows current data)

data = 0
# q = 1 (hold until NEXT)

NEXT(~)
# q = 0
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
    'builtin-SORT.md': `# SORT

Index: [2D tensors](wire-vectors.md) · [LUT bulk export](lut.md#bulk-export-keys-values-entries) · [Tagged built-ins](builtin-tagged-index.md)

Stable sort of a whole wire vector or matrix. Comparison is **unsigned** on each element's bit pattern.

**Tag rule:** one semicolon per call; tags after it are **space-separated** (e.g. \`; desc col=1\`, not \`; desc; col=1\`).

## Signatures

\`\`\`
SORT(Wbit[n] vector) -> Wbit[n]
SORT(Wbit[n] vector; desc) -> Wbit[n]
SORT(Wbit[r,c] matrix; col=k) -> Wbit[r,c]
SORT(Wbit[r,c] matrix; row=k) -> Wbit[r,c]
SORT(Wbit[r,c] matrix; col=k desc) -> Wbit[r,c]
\`\`\`

| Tag | Applies to | Description |
|-----|------------|-------------|
| *(none)* | vector | Ascending element order |
| \`desc\` | vector | Descending element order |
| \`col=k\` | matrix (\`r>1\`, \`c>1\`) | Sort **rows** by column \`k\` (ascending) |
| \`row=k\` | matrix | Sort **columns** by row \`k\` (ascending) |
| \`desc\` | matrix | Reverse compare direction for the chosen axis |

**Ties:** lower original index wins (stable sort).

**Errors:** matrix without \`col=\` or \`row=\`; \`col\` / \`row\` on vectors; \`col\` and \`row\` together; index out of range.

## Examples

### Vector ascending

\`\`\`logts-play
4wire[4] v = 0100 + 0001 + 1000 + 0010
4wire[4] s = SORT(v)
show(s)
\`\`\`

### Vector descending

\`\`\`logts-play
4wire[4] v = 0100 + 0001 + 1000 + 0010
4wire[4] s = SORT(v; desc)
show(s)
\`\`\`

### Matrix — sort rows by column 1

\`\`\`logts-play
4wire[3,2] m = 0001 + 0010 + 0100 + 0001 + 0011 + 1000
4wire[3,2] s = SORT(m; col=1)
4wire[3] keys = s::0
show(keys)
\`\`\`

### LUT entries by value (frequency column)

\`\`\`logts-play wave
inline [lut] .freq:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0100
    010 : 0011
  }
  :
4wire[3,2] e = .freq:entries()
4wire[3,2] s = SORT(e; col=1)
4wire[3] syms = s::0
show(syms)
\`\`\`

## See also

[ARGMAX](builtin-ARGMAX.md) · [REPEAT](builtin-REPEAT.md) · [lut.md — \`:entries\`](lut.md#bulk-export-keys-values-entries)
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
| SORT | [builtin-SORT.md](builtin-SORT.md) | — | — | — | — | — | — | — | \`col=k\` / \`row=k\` / \`desc\` | — | wire-vectors |

Use \`doc(NAME)\` in scripts for live signatures from \`Interpreter.BUILTIN_DOC\`.

**Note:** **\`; signed\`**, **\`; q4p4\`**, **\`; q8p8\`**, **\`; fp16\`**, and **\`; bf16\`** are **mutually exclusive** (at most one numeric-format tag per call). **\`; vector\`**, **\`; matrix\`**, **\`; row\`**, and **\`; col\`** cannot appear together. **DOT** does not use axis tags. **ARGMAX** / **ARGMIN** use shape rules instead of **\`; matrix\`** (but support **\`; row\`** / **\`; col\`**). **SORT** uses **\`col=k\`** / **\`row=k\`** (numeric axis index) and optional **\`desc\`** — see [builtin-SORT.md](builtin-SORT.md).

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
    'chip-board-execution.md': `# Chip and board execution

Chip and board instances share the same **two-phase** execution model: **elaboration** when the instance is first created, then **propagation** each time the \`exec\` pin fires. Syntax, property blocks, probes, and pout reads are unchanged — only the internal scheduling is optimized so the body structure is built once and signals flow through a captured wire graph on each exec.

For pin/pout syntax and examples, see [chip.md](chip.md) and [board.md](board.md). PCB uses a different model (full body re-run each exec) — see [pcb.md](pcb.md).

---

## Phase 1 — elaboration (instance creation)

When you write:

\`\`\`
chip [halfAdd] .u1::
\`\`\`

or:

\`\`\`
board [halfAdd] .u1::
\`\`\`

the runtime:

1. Allocates pin and pout storage for \`.u1\`.
2. Runs the type body **once** to create internal structure:
   - \`comp\` instances
   - nested \`chip\` / \`board\` instances
   - internal wires (\`4wire partial = …\`, and similar)
3. Captures a **wire graph** from the body — the connections that will carry values on each exec.

After elaboration, the instance is ready. Driving pins from outside (property block or direct assignment) does not rebuild this structure.

---

## Phase 2 — propagation (each exec)

When a property block sets the exec pin (e.g. \`set = 1\` with \`on: 1\`, or a rising edge on \`on: raise\`):

1. Pin values from the property block are written to instance storage.
2. The runtime propagates values through the captured wire graph **in declaration order**, one pass per exec.
3. Pouts and internal wires update; external wires reading \`.u1:sum\` see the new values.
4. \`probe\` targets on that instance emit **\`changed\`** when their value moves (see [debug.md](debug.md)).

The body statements themselves are **not** re-run as a script on each exec — only the graph edges fire. Instantiations (\`comp\`, \`chip\`, \`board\`) happened during elaboration and stay in place.

---

## What the wire graph includes

| Body form | Included in graph |
|-----------|-------------------|
| \`sum = .add:get\` | wire assignment |
| \`4wire partial = .add:get\` | wire declaration + initializer |
| \`.add:a = a\` | connection to component input |
| \`.ram:{ adr = pcval set = 1 }\` | property block (stateful components) |
| \`on:raise { clk, acc = ADD(acc, a) }\` | conditional assignment (edge/level per mode) |

**Not** re-executed on exec (elaboration only):

- \`comp [adder] .add::\`
- \`chip [alu] .slice::\`
- \`board [panel] .ui::\`

---

## Writing the body — dataflow connections

Treat each line in a chip or board body as a **persistent connection** in the schematic, not as a sequential imperative program step.

**Natural style** — inputs feed components, outputs feed pouts:

\`\`\`
.add:a = a
.add:b = b
sum = .add:get
carry = .add:carry
\`\`\`

**Internal wires** — name intermediate nets explicitly:

\`\`\`
4wire partial = .add:get
sum = partial
carry = .add:carry
\`\`\`

This matches how you would draw the circuit: wires exist continuously; exec updates values through them.

**Sequential scratch logic** — reusing the same wire as a temporary in multiple assignment steps in one exec pass is not the intended model. Prefer direct combinational paths or stateful components (\`reg\`, \`mem\`, \`counter\`) when you need stored state between exec cycles.

---

## Nested instances

Nested \`chip\` and \`board\` instances are elaborated when the parent instance is created. On parent exec, connections into the child (e.g. \`.ha:a = a\`, \`.ha:{ set = 1 }\`, \`sum = .ha:sum\`) propagate through the parent graph and into the child’s graph as needed.

Example — board inside a chip wrapper:

\`\`\`
chip +[wrap]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  board [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum
\`\`\`

---

## Probes and reads from outside

| Goal | Syntax |
|------|--------|
| pout | \`probe(.u1:sum)\` or \`4wire r = .u1:sum\` |
| internal wire | \`probe(.u1.partial)\` (dot, not colon) |

On the first **RUN**, probes on the instance report **\`initialised\`** at settle (after the property block and propagation). On later property blocks or exec triggers, they report **\`changed\`**.

---

## Relation to signal propagation

Main-script wires still use [wave](signal-propagation.md) or legacy propagation as configured. Inside a chip or board instance, each exec performs **one graph pass** — enough for combinational paths (adders, muxes) and for property blocks that touch stateful components in graph order.

For multi-step state machines, rely on component state (\`mem\`, \`reg\`, \`counter\`) or multiple exec/NEXT cycles rather than imperative ordering inside a single body.

---

## Running examples (Load / Load & Run)

Runnable blocks below use the \`logts-play\` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into a **new editor tab** without running it. Edit operands, add probes, or append property blocks, then press toolbar **Run**. |
| **Load & Run** | Copies the script **and** runs it immediately. Read results in the **Output** panel (\`show\` lines) and on **probes**. |

Tips:

- Blocks use \`logts-play wave\` (default propagation in the editor).
- Chip and board bodies are **not** re-run as scripts on each exec — only the captured graph propagates. Change inputs with another \`.u1:{ … }\` block (or flip a **switch** in a board) and **Run** again.
- Several examples chain multiple property blocks in one script (\`set = 1\` then \`set = 0\`) to demonstrate edge/conditional behaviour in a single **Load & Run**.

---

## Runnable examples

### Chip — propagation through internal \`adder\`

**Load & Run** — \`0101 + 0011\` through \`comp [adder]\` inside the chip. **Output:** \`r = 1000\`, \`c = 0\`.

The adder is elaborated once; each \`set = 1\` property block propagates pin values into \`.add\` and out to \`sum\`.

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
1wire c = .u1:carry
show(r, c)
\`\`\`

### Chip — graph order: \`on:raise\` latch, then \`adder\`

**Load & Run** — on the first rising edge of \`set\`, \`latA\`/\`latB\` capture \`a\`/\`b\`, then the adder reads those wires. **Output:** \`r = 1000\`.

Declaration order in the body is the propagation order: conditional → component inputs → pout.

\`\`\`logts-play wave
chip +[gatedAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  4wire latA = 0000
  4wire latB = 0000
  on:raise {
    set,
    latA = a,
    latB = b
  }
  .add:a = latA
  .add:b = latB
  sum = .add:get
  :4bit sum

chip [gatedAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
\`\`\`

### Chip — \`on:raise\` toggles accumulator (\`NOT\`)

**Load & Run** — first pulse inverts \`acc\` from \`0000\` to \`1111\`. **Output:** \`r = 1111\`.

Hold \`set = 1\` again without a \`0\` in between does **not** toggle a second time.

\`\`\`logts-play wave
chip +[tickAcc]:
  1pin set
  4pout sum
  exec: set
  on: 1
  4wire acc = 0000
  on:raise {
    set,
    acc = NOT(acc)
  }
  sum = acc
  :4bit sum

chip [tickAcc] .u1::
.u1:{ set = 1 }
4wire r = .u1:sum
show(r)
\`\`\`

### Chip — repulse: three property blocks in one run

**Load & Run** — \`set\` goes \`1 → 0 → 1\`; the conditional fires on each rising edge. **Output:** \`r = 0000\` (toggled twice).

\`\`\`logts-play wave
chip +[tickAcc]:
  1pin set
  4pout sum
  exec: set
  on: 1
  4wire acc = 0000
  on:raise {
    set,
    acc = NOT(acc)
  }
  sum = acc
  :4bit sum

chip [tickAcc] .u1::
.u1:{ set = 1 }
.u1:{ set = 0 }
.u1:{ set = 1 }
4wire r = .u1:sum
show(r)
\`\`\`

### Chip — \`on:raise\` pulses internal \`counter\`

**Load & Run** — rising \`set\` sets \`inc = 1\`, the \`.cnt:{ set = inc }\` property block increments the counter, then \`inc\` resets. **Output:** \`r = 0001\`.

\`\`\`logts-play wave
chip +[pulseCnt]:
  1pin set
  4pout count
  exec: set
  on: 1
  comp [counter] .cnt:
    depth: 4
    on: 1
    :
  1wire inc = 0
  on:raise {
    set,
    inc = 1
  }
  .cnt:{ set = inc }
  inc = 0
  count = .cnt:get
  :4bit count

chip [pulseCnt] .u1::
.u1:{ set = 1 }
4wire r = .u1:count
show(r)
\`\`\`

### Board — nested chip + internal adder

**Load & Run** — board wraps \`chip [halfAdd]\`; parent wires feed the child, child exec propagates, parent reads \`.ha:sum\`. **Output:** \`r = 1000\`.

\`\`\`logts-play wave
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  :4bit sum

board +[wrapAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  chip [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum

board [wrapAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
\`\`\`

### Board — \`on:edge\` on falling \`set\`

**Load & Run** — \`set\` starts high (no edge yet), then falls (\`1 → 0\`); the conditional sets \`result = 1111\`. **Output:** \`r = 1111\`.

\`\`\`logts-play wave
board +[edgeTick]:
  1pin set
  4pout out
  exec: set
  on: 1
  1wire en = set
  4wire result = 0000
  on:edge {
    en,
    result = 1111
  }
  out = result
  :4bit out

board [edgeTick] .u1::
.u1:{ set = 1 }
.u1:{ set = 0 }
4wire r = .u1:out
show(r)
\`\`\`

### Board — interactive: \`on:edge\` + switch + adder

**Load & Run** — \`count\` starts at \`0000\`. Flip the **clk** switch **on** then **off** (falling edge on \`en\`); \`held\` toggles and the adder drives \`count\`. **Output** probe lines show \`count\` flip to \`1111\`.

Use **Load** if you want to watch probes step by step after toggling the switch.

\`\`\`logts-play wave
board +[edgeCnt]:
  4pout count
  1pin set
  exec: set
  on: 1
  comp [switch] .clk:
    text: 'clk'
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  4wire held = 0000
  1wire en = .clk:get
  on:edge {
    en,
    held = NOT(held)
  }
  .add:a = held
  .add:b = 0000
  count = .add:get
  :4bit count

board [edgeCnt] .u1::
.u1:{ set = 1 }
4wire r = .u1:count
probe(r)
probe(.clk)
show(r)
\`\`\`

---

## Quick reference

| Event | Chip / board |
|-------|----------------|
| \`chip [t] .u1::\` / \`board [t] .u1::\` | Elaboration — structure + graph |
| \`.u1:{ … set = 1 }\` | Apply pins + propagate graph |
| Second \`.u1:{ … }\` | Propagate again (same graph) |
| \`probe(.u1:…)\` | Same syntax; \`initialised\` then \`changed\` |

---

## Related

- [chip.md](chip.md) — definition and nesting rules
- [board.md](board.md) — UI components and interactive blocks
- [debug.md](debug.md) — \`probe\`, \`show\`, \`peek\`
- [signal-propagation.md](signal-propagation.md) — wave and NEXT on the main script
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

### Execution model

At **instance creation**, the body runs once (elaboration) and a wire graph is captured. On each **exec** trigger from a property block, values propagate through that graph — the body is not re-run as a script. Write the body as **dataflow connections**; see [chip-board-execution.md](chip-board-execution.md).

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

Interactive circuits: [board.md](board.md). Execution model: [chip-board-execution.md](chip-board-execution.md). Component catalog: [components.md](components.md).
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
| **Chip / board execution** — elaboration, propagation, dataflow body style | [chip-board-execution.md](chip-board-execution.md) |
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
| **Network chat** — multi-instance socket uplink + packet downlink | — | [network-chat.md](network-chat.md) |
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
    'conditional-assignment.md': `# Conditional assignment (\`on:\`)

Standalone statements that run **exactly one assignment** only when a trigger condition is met.

See also: [assignment operators](assignment-operators.md), [signal propagation](signal-propagation.md), [LUT](lut.md), [modes](modes.md).

---

## Syntax

\`\`\`logts
on:<mode> {
  triggerExpr,
  assignment
}
\`\`\`

Multiple comma-separated body items are allowed after the trigger (all run atomically when the condition fires):

\`\`\`logts
on:raise {
  AND(.clk, phMerge),
  mk, mf = .heap:popMin(),
  mk2, mf2 = .heap:popMin(),
  1wire _ = .links:set(mk, parent + 00000000),
  show(mk),
  peek(mf)
}
\`\`\`

| Part | Meaning |
|------|---------|
| \`on:<mode>\` | When the block may run: \`raise\`, \`edge\`, or \`1\` |
| \`triggerExpr\` | Expression whose **LSB** is observed for edges/level |
| body item | One or more comma-separated **assignments** (\`=\`, \`:=\`, \`=:\`), mixed multi-target (\`a, b = expr\`), **component pin writes** (\`.comp:pin = expr\`), or **\`show(...)\` / \`peek(...)\`** |

**Not** allowed inside \`on:{ }\`: a **property block** (\`.comp:{ pin = …, set = 1 }\`), \`probe\`, \`watch\`, or \`deps\`. Use separate pin writes — \`.comp:send = pkt\` then \`.comp:set = 1\` — or assign from a wire declared outside the block.

The entire statement is **absent** while the trigger condition is false: neither the left-hand side nor the right-hand side of assignments runs (no LUT/mem side effects, no wire writes), and **\`show\` / \`peek\` do not run**. When the trigger fires, **every** body item runs in order before any other propagation step. Suite tests **2123–2124**, **2544–2548**.

---

## Modes

Same semantics as PCB \`exec:\` / component property blocks (\`logicEdgeTriggered\` / \`logicLevelTriggered\`):

| Mode | Runs when |
|------|-----------|
| \`on:raise\` | LSB of trigger makes \`0 → 1\` |
| \`on:edge\` | LSB of trigger makes \`1 → 0\` |
| \`on:1\` | LSB is \`1\` **and** the trigger value changed |

\`on:0\` is **not supported**. Use an inverted trigger with \`on:raise\`:

\`\`\`logts
on:raise {
  !zeroFlag,
  ok = .huff:clear()
}
\`\`\`

Alias values accepted at parse time (not promoted in docs): \`rising\` ≡ \`raise\`, \`falling\` ≡ \`edge\`, \`level\` ≡ \`1\`.

---

## First RUN behavior

| Mode | Top-level on first RUN |
|------|------------------------|
| \`on:raise\` / \`on:edge\` | Does **not** run; waits for the first edge |
| \`on:1\` | Runs if LSB is already \`1\` at init |

Inside **PCB** bodies, only \`on:1\` is allowed (\`on:raise\` / \`on:edge\` → parse error). In **chip** and **board** bodies, all modes are allowed and run through the instance wire graph on each exec (see [chip-board-execution.md](chip-board-execution.md)).

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the \`logts-play\` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into a **new editor tab** without running it. Edit propagation mode, add probes, or step with **Next**, then press toolbar **Run**. |
| **Load & Run** | Copies the script **and** runs it immediately. Read results in the **Output** panel (\`show\` lines). |

Tips:

- Blocks tagged \`logts-play wave\` open in **Wave** mode (default in the editor). Edge and inverted-trigger demos use \`logts-play legacy\` where noted.
- On **Wave**, prefer \`show(.huff:size())\` after a conditional LUT write — a \`wire = .huff:size()\` line in the same RUN may read the size before propagation settles.
- Use **Load** when you want to toggle a wire after RUN (e.g. change \`clearFlag\` again) and press **Run** / **Next** to see whether the LUT stays cleared without a new rising edge.

---

## Runnable examples

### \`on:raise\` — LUT intact while trigger is low

**Load & Run** — \`clearFlag\` stays \`0\`; the writable LUT still has 2 entries (\`size\` → \`0010\` in **Output**).

\`\`\`logts-play wave
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire clearFlag = 0
1wire ok = 0

on:raise {
  clearFlag,
  ok = .huff:clear()
}

show(.huff:size())
\`\`\`

### \`on:raise\` — clear LUT on \`0 → 1\`

**Load & Run** — \`clearFlag = 1\` fires the block; **Output** shows \`size\` → \`0000\` and \`isEmpty\` → \`1\`.

\`\`\`logts-play wave
MODE WIREWRITE

inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire clearFlag = 0
1wire ok = 0

on:raise {
  clearFlag,
  ok = .huff:clear()
}

clearFlag = 1
show(.huff:size())
show(.huff:isEmpty())
\`\`\`

### \`on:edge\` — falling edge \`1 → 0\`

**Load & Run** — \`clock\` starts at \`1\`, then \`clock = 0\`; \`fired\` becomes \`1\`.

\`\`\`logts-play legacy
MODE WIREWRITE

1wire clock = 1
1wire fired = 0

on:edge {
  clock,
  fired = 1
}

clock = 0
show(fired)
\`\`\`

### \`on:1\` — level when value becomes \`1\`

**Load & Run** — \`enable\` goes \`0 → 1\`; \`done\` becomes \`1\`.

\`\`\`logts-play wave
MODE WIREWRITE

1wire enable = 0
1wire done = 0

on:1 {
  enable,
  done = 1
}

enable = 1
show(done)
\`\`\`

### \`on:1\` — first RUN when trigger already \`1\`

**Load & Run** — \`enable\` is \`1\` at init; \`done\` is set on the first RUN (no edge needed).

\`\`\`logts-play wave
1wire enable = 1
1wire done = 0

on:1 {
  enable,
  done = 1
}

show(done)
\`\`\`

### Inverted trigger (\`!flag\`) instead of \`on:0\`

**Load & Run** — \`zeroFlag\` falls \`1 → 0\`, so \`!zeroFlag\` rises \`0 → 1\` and sets \`fired\`.

\`\`\`logts-play legacy
MODE WIREWRITE

1wire zeroFlag = 1
1wire fired = 0

on:raise {
  !zeroFlag,
  fired = 1
}

zeroFlag = 0
show(fired)
\`\`\`

### Switch trigger — clear LUT from the panel

**Load** this example, press **Run**, then flip the **clr** switch in **Devices**.

- \`probe(.clear)\` — confirms the switch toggles.
- \`4wire hSize = .huff:size()\` + \`probe(hSize)\` — after a rising-edge clear, \`hSize\` refreshes and probe shows the new value.

Use a **wire** for LUT size (not \`probe(.huff:size())\` — inline LUT methods are not valid probe targets).

\`\`\`logts-play wave
MODE WIREWRITE

inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

comp [switch] .clear:
  text: 'clr'
  :

1wire ok = 0

on:raise {
  .clear:get,
  ok = .huff:clear()
}

probe(.clear)
4wire hSize = .huff:size()
probe(hSize)
\`\`\`

After **Load & Run**, flip **clr** once (\`0→1\`). **Output** should show \`hSize = 0000 - changed\`.

\`on:raise\` fires only on rising edges — toggling back to \`0\` does not clear again until the next \`0→1\`.

### MUX sentinel — verify \`hSize\` on every toggle

Use \`1111\` as a sentinel when \`.clear\` is \`0\`, and real \`.huff:size()\` when \`.clear\` is \`1\`. With \`on:1\`, each \`0→1\` clears the LUT; each \`1→0\` shows \`1111\` again.

\`\`\`logts-play wave
MODE WIREWRITE

inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

comp [switch] .clear:
  text: 'clr'
  :

4wire hSize = MUX(.clear:get, 1111, .huff:size())
1wire ok = 0

on:1 {
  .clear:get,
  ok = .huff:clear()
}

probe(.clear)
probe(hSize)
\`\`\`

Toggle **clr** \`0→1→0→1\` — **Output** alternates \`hSize = 0000\` / \`1111\` (no spurious \`0010\` after clear).

### Alternate — add on fall, clear on rise

\`on:raise\` with \`!.clear:get\` adds an entry when the switch falls; \`on:1\` clears when it rises. \`hSize = .huff:size()\` changes every toggle (\`0010\` → \`0000\` → \`0001\` → …).

---

## Chip and board bodies

In **chip** and **board** definitions, \`on:raise\` / \`on:edge\` / \`on:1\` blocks are part of the instance **wire graph** — they run during propagation on each exec, not as top-level script statements. See [chip-board-execution.md](chip-board-execution.md) for elaboration vs propagation and more runnable examples.

### Chip — \`on:raise\` toggles on exec pulse

**Load & Run** — first \`set = 1\` inverts internal \`acc\`; **Output:** \`r = 1111\`.

\`\`\`logts-play wave
chip +[tickAcc]:
  1pin set
  4pout sum
  exec: set
  on: 1
  4wire acc = 0000
  on:raise {
    set,
    acc = NOT(acc)
  }
  sum = acc
  :4bit sum

chip [tickAcc] .u1::
.u1:{ set = 1 }
4wire r = .u1:sum
show(r)
\`\`\`

### Board — \`on:edge\` when \`set\` falls

**Load & Run** — two property blocks: \`set = 1\` then \`set = 0\`. Falling edge fires; **Output:** \`r = 1111\`.

\`\`\`logts-play wave
board +[edgeTick]:
  1pin set
  4pout out
  exec: set
  on: 1
  1wire en = set
  4wire result = 0000
  on:edge {
    en,
    result = 1111
  }
  out = result
  :4bit out

board [edgeTick] .u1::
.u1:{ set = 1 }
.u1:{ set = 0 }
4wire r = .u1:out
show(r)
\`\`\`

More examples (internal \`adder\`, \`counter\`, nested chip, interactive switch): [chip-board-execution.md](chip-board-execution.md).

---

## \`show\` and \`peek\` in the body

\`show(...)\` and \`peek(...)\` may appear as body items (comma-separated, same as assignments). They run **only when the trigger fires**, in source order, **after** any preceding assignments in the same block. In **Wave** mode they execute **immediately** inside the block (not deferred like top-level \`show\`).

\`\`\`logts
on:1 {
  once,
  done = 1,
  show(done)
}
\`\`\`

\`show\`-only or \`peek\`-only bodies are valid when the trigger still has at least one body item.

---

## Restrictions

| Allowed in \`{ }\` | Not allowed |
|------------------|-------------|
| \`target = expr\` (one or many, comma-separated) | \`.lut:clear()\` without destination |
| \`.comp:pin = expr\` | \`pcb\`, \`chip\`, \`board\`, \`comp\`, \`def\` |
| \`a, b = expr\` (multi-target) | \`probe\`, \`watch\`, \`deps\` |
| \`show(...)\`, \`peek(...)\` | Property blocks (\`.comp:{ }\`) |
| \`process = 1\` | |

---

## vs property blocks

| | \`on: { }\` (standalone) | \`.comp:{ }\` (property block) |
|--|------------------------|------------------------------|
| Scope | Program / PCB body | Bound to one component instance |
| Statements | One or more comma-separated assignments and/or \`show\`/\`peek\` | Multiple pin assignments |
| Typical use | LUT/mem ops gated by a flag | Pin wiring on \`exec:\` trigger |

Property blocks remain the right tool for multi-pin updates on a component; conditional assignment is for isolated side-effect writes (LUT, mem, a single wire).

---

## Wave / ZSTATE

Conditional assignments are registered at elaboration and re-evaluated when trigger dependencies change (same path as property blocks in [signal propagation](signal-propagation.md)).

- **Wave (default):** assignment respects deferred propagation and \`executedThisPropagate\` guards.
- **MODE ZSTATE:** requires wave; when inactive, destination wires keep prior values (including \`Z\`).
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
- [huffman-v2.md](huffman-v2.md) — scan index stepping (\`write\` + \`data\` on falling clock)
`,
    'debug.md': `# Debug output — \`show\`, \`peek\`, \`probe\`, \`watch\`, and boolean LUT utilities

Statements in this group write text to the **Output** panel (or the **Timeline** panel for \`watch\`). The first three inspect live values; **\`lutOf\`** and **\`exprOfLut\`** generate copy-pasteable boolean logic (LUT definitions or expressions) for analysis only — they do not change the circuit.

All are **statements** (like \`doc\`) — they cannot appear on the right side of \`=\`.

For LUT generation / reversal and other analysis helpers, see **[boolean-lut.md](boolean-lut.md)** and **[boolean-analysis.md](boolean-analysis.md)**.

For **source literals** in assignments (\`\\255\`, \`\\-3;8\`, \`"Hello"\`), see **[wire-literals.md](wire-literals.md)**. Display tag \`ascii\` formats wire values as quoted text in the Output panel (see [show — display tags](#show)).

For **named bit fields** on wires (schema declaration, field access, structured literals), see **[semantic-schemas.md](semantic-schemas.md)** and the array sub-pages ([fixed arrays](schema-field-arrays.md), [variable 1D](schema-variable-arrays.md), [variable 2D matrix](schema-variable-matrix.md)). Wires with an attached schema get automatic multi-line breakdown in \`show\` / \`peek\` / \`probe\`; combine with numeric tags (\`s8\`, \`dec\`, …) per field.

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

## Signal Trace (UI panel)

Signal propagation trace — **separate panel**, not Output. Open from **Win ▾ → Signal Trace** (formerly Wave Listen).

| Control | Role |
|---------|------|
| **ON / OFF** | Arms the panel for the next **Run** (persists across runs) |
| **L1 / L2 / L3** | Trace verbosity (\`debugLevel\` on propagation engine) |
| **Fmt ▾** | hex / oct / b32hex / b32c / bin / dec / s8 / u8 / q4p4 / fp16 / bf16 / ascii / auto (dropdown, persisted) |
| **Filter ▾** | All / Wires / Components / Internals (persisted as \`prog/signalTraceFilter\`) |
| **Clear** | Clears panel history (no auto-clear on Run) |
| **Tracing…** badge | Internal trace active while script runs (distinct from ON/OFF) |

**Trace** is runtime-only: ON at Run start (if armed), stays ON after Run complete when armed (interactive key/switch updates). OFF at Stop or when disarmed.

Example trace — **Wave** (level 1):

\`\`\`text
[wave 0] RUN init → recompute all wires
[wave 1] commit packetEncoded = ^4808…
[wave 1] lut-mut .huff:clear → re-exec st(1062:asg) packetEncoded := …
* script stopped trace is OFF
\`\`\`

Example trace — **Legacy** (level 1):

\`\`\`text
* Run start (legacy cascade) — trace is ON
[step 1] commit a = ^3
[step 2] commit b = ^3
lut-mut .huff:clear → re-exec st(5:asg) packetEncoded := …
* Run complete — trace stays ON (interactive updates)
\`\`\`

Legacy uses **\`[step N]\`** prefix (immediate cascade) instead of **\`[wave N]\`**. Level 2 adds \`exec\` on cascade re-eval; level 3 adds \`eval\` (wire values computed before commit).

### Component & internal lines (L2–L3)

| Line kind | Example | Level | Filter |
|-----------|---------|-------|--------|
| **commit component** | \`[step 2] commit component .s = ^101\` | L2 | Components |
| **prop** | \`[step 2] prop .s.data = ^101\` | L2 | Components |
| **connect** | \`[step 2] connect .alu:get → result\` | L2 | Components |
| **exec block** | \`[step 3] exec block .cnt.on:raise\` | L3 | Internals |
| **state** | \`[step 3] state mem1[0] = ^0101\` | L3 | Internals |
| **lut-mut** | \`lut-mut .huff:clear → re-exec …\` | L1 | Wires + Components |

**Filter** (toolbar): **All** shows everything; **Wires** — wire commit/exec/eval, init, flush, schedule, lut-mut; **Components** — commit component, prop, connect, lut-mut; **Internals** — eval L3, block exec, state/mem, schedule (wave L3).

**Value formatting:** dropdown **hex / oct / b32hex / b32c / bin / dec / s8 / u8 / q4p4 / fp16 / bf16 / ascii / auto**. Formatele numerice grupează pe lățimea fixă (8 sau 16 bit). **oct**, **b32hex**, **b32c** produc literali \`o^…\`, \`x^…\`, \`xc^…\` (roundtrip ca la hex). **ascii** afișează ca \`show(…; ascii)\` — \`"Hello"\` sau \`\\72 \\101 …;ascii\`. Suffix **\`(Nbits)\`** la afișare. **\`[cpy]\`** — literal script: **bin** = biți continui; **hex** = \`^…\` fără spații; **oct/b32hex/b32c** = \`o^…\` / \`x^…\` / \`xc^…\` fără spații; **dec/s8/…** = cu \`;format\`; **ascii** = \`"abc"\` pentru text printabil, \`"abc" + \\2 + "zz"\` dacă mix, \`\\65 \\66;ascii\` dacă doar \`\\N\` (2+ cu \`;ascii\`). X/Z → fallback hex la copy.

See [Wave debug patterns](#wave-debug-patterns) and [huffman-v2.md](huffman-v2.md) (SC round-trip).

---

## \`deps\`

Dependency graph dump (tree text in **Output**). Runs at statement position like **\`peek\`**.

### Syntax

\`\`\`
deps(wireName)
deps(expr)
deps(.lutInstance)
\`\`\`

### Examples

\`\`\`logts
deps(packetEncoded)     # producer, upstream, downstream, LUT-mutation
deps(source)            # downstream consumers
deps(source + codebook) # ad-hoc expr — upstream only
deps(.huff)             # stmts re-exec on LUT mutation
\`\`\`

Works in **wave and legacy** (static elaboration index). For Huffman SC debugging, use with [Signal Trace](#signal-trace-ui-panel) — see [wave-debug patterns](#wave-debug-patterns).

---

## Wave debug patterns

| Pattern | When |
|---------|------|
| **\`peek\`** right after encode | Before any LUT mutation |
| **Literal wire snapshot** | Before \`.huff:clear()\` for recover |
| **\`show\`** on final results only | Wires that do not depend on mutated LUT |
| **\`probe(.huff:size())\`** | Witness LUT mutations |
| **\`watch(ph.*)\`** | FSM + multi-step protocol |
| **\`deps(wire)\`** | Before Run — see \`.huff\` / protocol links |
| **Signal Trace ON** | During Run — commits and LUT re-eval (wave or legacy) |

Huffman SC round-trip: [huffman-v2.md — Load & Run](huffman-v2.md).

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
| \`oct\` | Octal pattern \`o^…\` (3 bit per digit) |
| \`b32hex\` | Base32hex pattern \`x^…\` (RFC 4648 §7, 5 bit per digit) |
| \`b32c\` | Crockford base32 \`xc^…\` (5 bit per digit) |
| \`hexWide\` | With \`hex\` only — grouped wide hex on vector elements (≥32 bit) |
| \`bin\` | Explicit binary grouping (8-bit groups on wide wires) |
| \`ascii\` | 8-bit cells — scalar ≤8 bit: \`"A"\`; wider wires: grouped \`\\65 \\66;ascii\` |
| \`q4p4\` | Fixed-point **Q4.4** — grouped literal \`\\1.5;q4p4\` on **8-bit** elements |
| \`q8p8\` | Fixed-point **Q8.8** decimal on **16-bit** wires |
| \`fp16\` | IEEE 754 half as decimal (\`3\`, \`nan\`, \`inf\`) on **16-bit** wires |
| \`bf16\` | Brain float 16 as decimal on **16-bit** wires |
| \`sX\` | Fixed signed width per element — e.g. \`show(v; s8)\` → \`\\2 \\-1 \\5 \\0;s8\` (distinct from adaptive \`signed\`) |
| \`uX\` | Fixed unsigned width per element — e.g. \`show(w; u8)\` on 24wire → \`\\170 \\187 \\204;u8\` (distinct from scalar \`dec\`) |
| \`qXpY\` | Parametric Q format — e.g. \`show(w; q6p2)\` → \`\\1.5;q6p2\`, \`show(w; q8p0)\` → \`\\5;q8p0\` (not \`;s8\`) |

Exactly **one** format tag per statement: \`dec\`, \`hex\`, \`bin\`, \`ascii\`, fixed (\`q4p4\`, \`q8p8\`, \`fp16\`, \`bf16\`), or parametric (\`sX\`, \`uX\`, \`qXpY\` with X+Y≤64). \`signed\` (adaptive) is mutually exclusive with \`sX\` and with numeric-format tags; \`dec\` + \`sX\` / \`dec\` + \`uX\` is rejected. Literal \`;8\` remains valid (suffix \`8\`); \`;u8\` uses suffix \`u8\`.

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

Display tags on \`probe\`: \`dec\`, \`signed\`, \`hex\`, \`hexWide\`, \`bin\`, \`ascii\`, \`maxWidth=\`, \`multiline\`, **\`level=0|1|2\`** — same formatting as \`show\` on the **flat blob** value. No \`elAll\` / \`elNonZero\` / \`compact\` / \`elRange\` / \`elLast\`.

**Cause lines (\`level=1|2\`):** value on line 1 (\`# name = … - reason\`); cause on indented lines 2+ (not inline). Level **0** (default) = status only, like before.

\`\`\`logts-play
2wire a = 01
2wire b = a
probe(b; level=2)   # after change: wave / st(…) / re-eval ← … on lines 2+
\`\`\`

\`\`\`logts-play
8wire v := 01000001
probe(v; ascii)    # # v = "A" - initialised
probe(v; dec)      # # v = \\65 - initialised
\`\`\`

**One argument only:**

| Form | Example |
|------|---------|
| Wire name | \`probe(a)\` |
| Sock (bitstream) | \`probe(rx)\`, \`probe(rx./8; u8)\` |
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
| \`probe(.u1.partial)\` chip / board internal wire | \`initialised\` / \`changed\` when instance exec fires (832–833, 853–854) | Same |
| \`probe(.q.shadow)\` PCB internal wire | \`initialised\` / \`changed\` on PCB body re-run (834–835) | Same |
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
watch(o; level=1)
watch(o.1-3)
watch(.sw)
watch(.o:counter)
watch(.u1:sum)
\`\`\`

Optional tag **\`level=0|1|2\`** (default **0**). Level **0** = Timeline only (no \`@watch\` Output). Level **≥ 1** adds \`@watch …\` plus cause on indented lines in Output.

**Timeline tooltip:** hover (desktop) or **tap** on a row (touch). Tooltip follows the pointer horizontally (within the lane area) and is vertically centered on the row. Cause lines need \`level≥1\`; at \`level=0\` only \`seq\` / \`cycle\` appear. Canvas is scaled to panel width — hit-test uses backing-store coordinates.

Collected during **elaboration** (end of **Run**), like \`probe\`. Timeline samples appear in **Panels → Timeline**.

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
| \`doc(LATCH)\` | \`LATCH(Xbit data, 1bit clock, 1bit clear) -> Xbit\` |

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
  on: raise/edge/1
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
- \`on: raise/edge/1\` — the trigger condition (value depends on the PCB definition)
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
| **Search** | Filter topics by title and **primary keywords** (canonical page for a function/mode/component) plus secondary synonyms; best match appears first (**Enter** to open) |

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
    'huffman-v2.md': `# Huffman v2 — runtime frequencies in wave mode

End-to-end **wave** demo: measure symbol frequencies from a source wire, sort entries, encode with a **prefix-free** codebook, round-trip through \`.huffPacket\` / \`.huffRecover\`.

**No** \`buildFrom\`, **no** \`HUFFMAN_*\` builtins — everything is plain logTscript: writable LUT, \`on:raise\`, [counter](counter.md), [oscillator](oscillator.md) or [switch](switch.md), \`SORT\`, optional \`popMin\` for N-general merge.

For the static codebook + protocol walkthrough (v1), see **[huffman.md](huffman.md)**.

**Suite tests:** **2104** (freq \`set\`+\`ADD\`), **2105** (\`SORT\` entries), **2106–2107** (round-trip wave), **2108** (\`=:\` padding), **2109** (osc scan + counter), **2110** (N-general \`popMin\` merge + manual codebook), **2111–2114** (\`.links\` + auto codewords unroll), **2115–2118** (FSM switch scan+merge + walk/protocol), **2119** (packet SC encode), **2145–2146** (packet SC recover + round-trip), **2120–2122** (\`:entries(sortKeys|sortValues)\`), **2123–2124** (multi-assign \`on:\`), **2125–2127** (declarative wire re-eval + LUT live read), **2128** (FSM + \`execStmts\` protocol round-trip).

---

## Principle

| Rule | Detail |
|------|--------|
| Frequencies | Measured at runtime into a writable \`.freq\` LUT (\`set\` + \`ADD\`) |
| Codebook | Built **in script** (fixed table for 4 symbols, or merge steps with \`popMin\`) — not by the engine |
| Encode / decode | Same protocols as v1 — [huffman.md](huffman.md) |
| Wave mode | Use \`on:raise\` / \`on:1 { once, … }\` for LUT mutations; bare top-level \`:add\` can run twice on first Run |

Runnable blocks use **\`logts-play wave\`** or **\`logts-play legacy\`** — open in the doc viewer and use **Load** / **Load & Run**. For **auto codewords** (merge + \`.links\` walk), see [Auto codewords from \`.links\`](#auto-codewords-from-links) (**legacy**, test **2114**).

---

## Architecture (three phases)

| Phase | What | Building blocks |
|-------|------|-----------------|
| **A — Scan** | Walk \`source\` in steps of \`keyWidth\`, count in \`.freq\` | \`comp [osc]\` or \`comp [switch]\`, \`comp [counter]\`, \`on:raise\`, \`.freq:set\` + \`ADD\` |
| **B — Sort + codes** | Order symbols by count; fill \`.huff\` | \`e = .freq:entries()\` then \`SORT(e; col=1)\`, writable \`prefixFree\` LUT, optional \`popMin\` merge |
| **C — Packet** | Encode + decode | \`.huffPacket\`, \`.huffRecover\`, \`=:\` padding if needed |

\`\`\`mermaid
flowchart LR
  subgraph A [Phase A scan]
    Osc[clk tick]
    Idx[counter += keyWidth]
    Slice[symbol from source]
    Freq[freq set ADD]
    Osc --> Idx --> Slice --> Freq
  end
  subgraph B [Phase B codes]
    Sort[SORT entries]
    Huff[huff codebook]
    Sort --> Huff
  end
  subgraph C [Phase C packet]
    Enc[huffPacket]
    Dec[huffRecover]
    Enc --> Dec
  end
  A --> B --> C
\`\`\`

---

## Phase A — Frequency LUT

Writable LUT with **\`fillwith: 00000000\`** so \`ADD(.freq:get(sym), \\1;8)\` treats a missing key as count **0** (not a Huffman codeword).

Use **\`\\N;8\`** grouped literals for 8-bit counts — a bare \`00000001\` literal is only **1 bit** wide.

\`\`\`logts-play wave
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
1wire _ = .freq:set(0010, \\1;8)
1wire _ = .freq:set(0010, ADD(.freq:get(0010), \\1;8))
1wire _ = .freq:set(0010, ADD(.freq:get(0010), \\1;8))
1wire _ = .freq:set(0011, \\1;8)
8wire f10 = .freq:get(0010)
8wire f11 = .freq:get(0011)
4wire sz = .freq:size()
show(f10)
show(f11)
show(sz)
\`\`\`

→ \`f10 = 00000011\`, \`f11 = 00000001\`, \`sz = 0010\` (three×\`0010\`, one×\`0011\`).

### \`on:raise\` increment (dynamic index)

\`\`\`logts
on:raise {
  AND(.clk:get, NOT(atEnd)),
  ok = .freq:set(sym, ADD(.freq:get(sym), \\1;8))
}
\`\`\`

Evaluate the symbol slice **inside** the \`on:raise\` body (or use fixed \`EQ(.idx:get, …)\` branches). A top-level \`4wire sym = source.(pos)/4\` **tracks** \`.idx:get\` in wave mode and re-evaluates when the counter advances (test **2125**).

### Manual tick — switch + counter (editor-friendly)

Same logic as test **2109**, but with a **switch** you click in the UI (rising edge = scan step). Advance the [counter](counter.md) on the **falling** edge (\`set = NOT(.clk:get)\`) with **\`on: raise\`** on the component so \`on:raise\` still sees the current index when the clock rises.

\`\`\`logts-play wave
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
16wire source = 0010 + 0010 + 0010 + 0011
comp [switch] .clk:
  text: 'tick'
  :
comp [counter] .idx:
  depth: 8
  on: raise
  :
.idx:{
  data = ADD(.idx:get, 00000100)
  write = 1
  set = NOT(.clk:get)
}
1wire ok = 0
on:raise { AND(.clk:get, EQ(.idx:get, 00000000)), ok = .freq:set(0010, ADD(.freq:get(0010), \\1;8)) }
on:raise { AND(.clk:get, EQ(.idx:get, 00000100)), ok = .freq:set(0010, ADD(.freq:get(0010), \\1;8)) }
on:raise { AND(.clk:get, EQ(.idx:get, 00001000)), ok = .freq:set(0010, ADD(.freq:get(0010), \\1;8)) }
on:raise { AND(.clk:get, EQ(.idx:get, 00001100)), ok = .freq:set(0011, ADD(.freq:get(0011), \\1;8)) }
probe(.freq:get(0010))
probe(.freq:get(0011))
\`\`\`

**How to run:** Load & Run, then click **tick** four times (each click: press = \`1\`, release = \`0\`). After four scans, probes show \`0010 → 00000011\` and \`0011 → 00000001\`.

With a real [oscillator](oscillator.md) instead of a switch, use \`session.setComp(interp, '.clk', '1')\` then \`'0'\` in tests (pattern test **611**).

---

## Phase B — Sort + codebook

### Sort entries by frequency

\`\`\`logts-play wave
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
1wire _ = .freq:set(0010, \\3;8)
1wire _ = .freq:set(0011, \\1;8)
1wire _ = .freq:set(0000, \\2;8)
8wire[3,2] e = .freq:entries()
8wire[3,2] sorted = SORT(e; col=1)
8wire[3] syms = sorted::0
8wire[3] cnts = sorted::1
show(syms)
show(cnts)
\`\`\`

Ascending sort on column 1 (counts): symbols \`0011\`, \`0000\`, \`0010\` with counts \`1\`, \`2\`, \`3\`.

Syntax reminders:

| Intent | Form |
|--------|------|
| Sort rows by value column | \`SORT(matrix; col=1)\` |
| \`SORT\` argument | **Named tensor wire** — assign \`.freq:entries()\` to \`8wire[n,2] e\` first; inline \`:entries()\` inside \`SORT(...)\` is rejected |
| Column 0 = keys, column 1 = values | \`sorted::0\`, \`sorted::1\` |
| Row access | \`sorted:0\` (not column 0) |

See [builtin-SORT.md](builtin-SORT.md) and [lut.md — entries](lut.md).

### Assigning codewords (4-symbol demo)

For a **fixed 4-symbol** alphabet, the Huffman tree for arbitrary positive counts is still a **finite** network — but the v2 demo usually **reuses the v1 table** once frequencies justify it:

| Key | Codeword |
|-----|----------|
| \`00\` | \`0\` |
| \`01\` | \`10\` |
| \`10\` | \`110\` |
| \`11\` | \`111\` |

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

To **derive order** from counts without a builtin tree builder:

- **\`ARGMAX(cnts; index)\`** — index of the largest count (ties → smallest index). See [builtin-ARGMAX.md](builtin-ARGMAX.md).
- **\`MUX\` / \`GT\`** — finite compare network for 4 nibbles (documented in the internal plan; many wires, but valid logTscript).

### N-general merge (\`popMin\`) — full \`'aacb'\` example

Build frequencies from a short ASCII source, merge with **\`:popMin\`** on a writable \`.heap\`, write codewords into a writable **\`prefixFree\` \`.huff\`**, then round-trip.

Use **\`logts-play legacy\`** for this script: merge steps are **sequential** \`popMin\` calls (in wave mode, multiple \`on:1\` blocks can fire together). For osc-stepped merge in wave, drive each pair of \`popMin\` calls from a [switch](switch.md) tick.

**Counts** below match \`'aacb'\` (\`a\`×2, \`b\`×1, \`c\`×1). A full osc scan of \`source\` is the same pattern as [Phase A](#osc--counter-scan-4-nibbles-keywidth--4); here the histogram is filled directly so one Run stays compact.

**Merge tree** (stable \`popMin\` ties): merge \`b\`+\`c\` → internal \`11111110\`, then merge \`a\`+internal → root \`11111111\`. Codewords: \`a=0\`, \`b=10\`, \`c=11\`.

**Internal keys** \`11111110\` / \`11111111\` are merge bookkeeping only — not in the codebook. Writable \`prefixFree\` **collapse** uses **\`lutEntryList\`** only (not \`fillwith\` slots), so byte keys round-trip correctly.

\`\`\`logts-play legacy
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 8b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 8b)
  :
32wire source =: 'aacb'
1wire _ = .freq:set(01100001, \\2;8)
1wire _ = .freq:set(01100010, \\1;8)
1wire _ = .freq:set(01100011, \\1;8)
8wire[3,2] e = .freq:entries()
8wire[3,2] sorted = SORT(e; col=1)
1wire _ = .heap:clear()
1wire _ = .heap:add(01100010, \\1;8)
1wire _ = .heap:add(01100011, \\1;8)
1wire _ = .heap:add(01100001, \\2;8)
8wire hk1, 8wire hf1 = .heap:popMin()
8wire hk2, 8wire hf2 = .heap:popMin()
8wire hsum1, 1wire hc1 = ADD(hf1, hf2)
1wire _ = .heap:add(11111110, hsum1)
8wire hk3, 8wire hf3 = .heap:popMin()
8wire hk4, 8wire hf4 = .heap:popMin()
8wire hsum2, 1wire hc2 = ADD(hf3, hf4)
1wire _ = .heap:add(11111111, hsum2)
8wire hsz = .heap:size()
1wire _ = .huff:clear()
1wire _ = .huff:add(01100001, 0)
1wire _ = .huff:add(01100010, 10)
1wire _ = .huff:add(01100011, 11)
64wire packet =: .huffPacket { tokens = source }
32wire recovered = .huffRecover { data = packet }
show(sorted::1)
show(hsz)
show(source; ascii)
show(recovered; ascii)
\`\`\`

| Wire | Expected | Meaning |
|------|----------|---------|
| \`sorted::1\` | \`00000001\`, \`00000001\`, \`00000010\` | counts ascending (\`b\`, \`c\`, \`a\`) |
| \`hsz\` | \`00000001\` | one root left in \`.heap\` |
| \`hk1\` | \`01100010\` | first \`popMin\` = \`'b'\` |
| \`recovered\` | same as \`source\` | \`"aacb"\` + pad |

**Scaling:** for larger **N**, unroll more merge rounds (\`popMin\`×2 + \`:add\`) per osc tick, or use a fixed max-N network. See [Auto codewords](#auto-codewords-from-links) (tests **2111–2114**) — no manual \`.huff:add\` codewords.

For wave + switch-driven merge, chain \`on:1 { onceN, … }\` blocks with separate \`once\` wires per tick (see [conditional-assignment.md](conditional-assignment.md)).

---

### Auto codewords from \`.links\`

After merge, each child stores **\`parent(8b) ‖ bit(8b)\`** in a writable **\`.links\`** LUT (\`depth: 16\`). Walk from each leaf symbol up to \`rootKey\`, prepend bits, then \`.huff:add(sym, cod)\` — suite tests **2111–2114**.

Use **\`logts-play legacy\`** below (sequential \`popMin\` + walk). Open [huffman-v2.md](huffman-v2.md) in the **doc viewer**, then **Load** or **Load & Run** on each block.

#### Runnable — \`.links\` layout (\`'b'\` → parent \`11111110\`, bit \`0\`)

**Load & Run** — after merge round 1, \`'b'\` (\`01100010\`) links to internal node \`11111110\` with bit \`0\`:

\`\`\`logts-play legacy
MODE WIREWRITE
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .links:
  writable
  depth: 16
  length: 256
  fillwith: 0000000000000000
  data { }
  :
1wire _ = .heap:add(01100010, \\1;8)
1wire _ = .heap:add(01100011, \\1;8)
8wire k1, 8wire f1 = .heap:popMin()
8wire k2, 8wire f2 = .heap:popMin()
8wire sum, 1wire hc = ADD(f1, f2)
8wire parent = 11111110
16wire l0 = parent + 00000000
16wire l1 = parent + 00000001
1wire _ = .heap:add(parent, sum)
1wire _ = .links:set(k1, l0)
1wire _ = .links:set(k2, l1)
16wire linkB = .links:get(01100010)
show(linkB)
show(linkB.0/8)
show(linkB.15/1)
\`\`\`

→ \`linkB = 1111111000000000\`, parent \`11111110\`, bit \`0\`.

#### Runnable — full auto pipeline (\`'aacb'\`)

**Load & Run** — frequencies → \`popMin\` merge → \`.links\` → walk-up → \`.huff\` (no manual codewords) → encode/decode round-trip. Check **Output** for \`show\` lines:

\`\`\`logts-play legacy
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .links:
  writable
  depth: 16
  length: 256
  fillwith: 0000000000000000
  data { }
  :
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 8b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 8b)
  :
32wire source =: 'aacb'
1wire _ = .freq:set(01100001, \\2;8)
1wire _ = .freq:set(01100010, \\1;8)
1wire _ = .freq:set(01100011, \\1;8)
1wire _ = .heap:clear()
1wire _ = .heap:add(01100001, \\2;8)
1wire _ = .heap:add(01100010, \\1;8)
1wire _ = .heap:add(01100011, \\1;8)
8wire _m1k1, 8wire _m1f1 = .heap:popMin()
8wire _m1k2, 8wire _m1f2 = .heap:popMin()
8wire _m1sum, 1wire _m1c = ADD(_m1f1, _m1f2)
8wire _m1p = 11111110
16wire _m1l0 = _m1p + 00000000
16wire _m1l1 = _m1p + 00000001
1wire _ = .heap:add(_m1p, _m1sum)
1wire _ = .links:set(_m1k1, _m1l0)
1wire _ = .links:set(_m1k2, _m1l1)
8wire _m2k1, 8wire _m2f1 = .heap:popMin()
8wire _m2k2, 8wire _m2f2 = .heap:popMin()
8wire _m2sum, 1wire _m2c = ADD(_m2f1, _m2f2)
8wire _m2p = 11111111
16wire _m2l0 = _m2p + 00000000
16wire _m2l1 = _m2p + 00000001
1wire _ = .heap:add(_m2p, _m2sum)
1wire _ = .links:set(_m2k1, _m2l0)
1wire _ = .links:set(_m2k2, _m2l1)
1wire _ = .huff:clear()
8wire _ca_n0 = 01100001
8wire _ca_root = 11111111
1wire _ca_g1 = NOT(EQ(_ca_n0, _ca_root))
16wire _ca_lk1 = .links:get(_ca_n0)
1wire _ca_b1 = MUX(_ca_g1, 0, _ca_lk1.15/1)
8wire _ca_n1 = MUX(_ca_g1, _ca_n0, _ca_lk1.0/8)
1wire _ca_g2 = AND(_ca_g1, NOT(EQ(_ca_n1, _ca_root)))
16wire _ca_lk2 = .links:get(_ca_n1)
1wire _ca_b2 = MUX(_ca_g2, 0, _ca_lk2.15/1)
8wire _ca_n2 = MUX(_ca_g2, _ca_n1, _ca_lk2.0/8)
1wire _ca_u1 = AND(_ca_g1, NOT(_ca_g2))
1wire ca = MUX(_ca_u1, 0, _ca_b1)
8wire _cb_n0 = 01100010
8wire _cb_root = 11111111
1wire _cb_g1 = NOT(EQ(_cb_n0, _cb_root))
16wire _cb_lk1 = .links:get(_cb_n0)
1wire _cb_b1 = MUX(_cb_g1, 0, _cb_lk1.15/1)
8wire _cb_n1 = MUX(_cb_g1, _cb_n0, _cb_lk1.0/8)
1wire _cb_g2 = AND(_cb_g1, NOT(EQ(_cb_n1, _cb_root)))
16wire _cb_lk2 = .links:get(_cb_n1)
1wire _cb_b2 = MUX(_cb_g2, 0, _cb_lk2.15/1)
8wire _cb_n2 = MUX(_cb_g2, _cb_n1, _cb_lk2.0/8)
1wire _cb_u1 = AND(_cb_g1, NOT(_cb_g2))
2wire cb = _cb_b2 + _cb_b1
8wire _cc_n0 = 01100011
8wire _cc_root = 11111111
1wire _cc_g1 = NOT(EQ(_cc_n0, _cc_root))
16wire _cc_lk1 = .links:get(_cc_n0)
1wire _cc_b1 = MUX(_cc_g1, 0, _cc_lk1.15/1)
8wire _cc_n1 = MUX(_cc_g1, _cc_n0, _cc_lk1.0/8)
1wire _cc_g2 = AND(_cc_g1, NOT(EQ(_cc_n1, _cc_root)))
16wire _cc_lk2 = .links:get(_cc_n1)
1wire _cc_b2 = MUX(_cc_g2, 0, _cc_lk2.15/1)
8wire _cc_n2 = MUX(_cc_g2, _cc_n1, _cc_lk2.0/8)
1wire _cc_u1 = AND(_cc_g1, NOT(_cc_g2))
2wire cc = _cc_b2 + _cc_b1
1wire _ = .huff:add(01100001, ca)
1wire _ = .huff:add(01100010, cb)
1wire _ = .huff:add(01100011, cc)
64wire packet =: .huffPacket { tokens = source }
32wire recovered = .huffRecover { data = packet }
show(source; ascii)
show(ca)
show(cb)
show(cc)
show(recovered; ascii)
\`\`\`

| Output | Expected |
|--------|----------|
| \`source\` | \`"aacb"\` |
| \`ca\` / \`cb\` / \`cc\` | \`0\` / \`10\` / \`11\` |
| \`recovered\` | same as \`source\` |

#### Implementation notes

**Write layout** — always build the 16-bit value in a wire **before** \`:set\` (inline \`parent + 00000000\` inside \`:set\` can pad wrong):

\`\`\`logts
8wire parent = 11111110
16wire linkVal = parent + 00000000
1wire _ = .links:set(01100010, linkVal)
\`\`\`

**Read layout** — \`link.0/8\` = parent, \`link.15/1\` = Huffman bit (LSB of low byte).

**Merge round** (after \`popMin\`×2):

\`\`\`logts
8wire k1, 8wire f1 = .heap:popMin()
8wire k2, 8wire f2 = .heap:popMin()
8wire sum, 1wire hc = ADD(f1, f2)
8wire parent = 11111110
16wire l0 = parent + 00000000
16wire l1 = parent + 00000001
1wire _ = .heap:add(parent, sum)
1wire _ = .links:set(k1, l0)
1wire _ = .links:set(k2, l1)
\`\`\`

**Walk + codeword** — \`MUX(sel, a, b)\` → \`sel=1\` picks **\`b\`**. Gate hops with \`g1\`, mask bits with \`MUX(g, 0, link.15/1)\`, advance node with \`MUX(g, n, link.0/8)\`. For \`'aacb'\`, codeword depth per symbol is known (a=1, b/c=2 bits); concat \`b2 + b1\` for 2-bit codes.

**Limits (v1):** codeword depth per symbol is **fixed in script** for the demo (\`codeDepth\` 1 or 2 for \`'aacb'\`). Fully dynamic depth for arbitrary **N** needs more unroll or osc ticks — backlog.

---

## Phase C — Packet round-trip

Same protocols as [huffman.md](huffman.md):

\`\`\`logts-play wave
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

### Four tokens — dynamic width

Four 2-bit tokens need **17 bits** total (8-bit length + 9-bit payload). Declare the wire wide enough:

\`\`\`logts-play wave
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
17wire packet = .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }
show(recovered)
\`\`\`

### Padded packet (\`=:\`)

When the encoder emits fewer bits than the wire width, **\`=:\`** right-pads. The decoder reads only the length prefix + payload — padding is ignored. Same example as [huffman.md — padded packet](huffman.md#runnable--longer-input-padded-packet-):

\`\`\`logts-play wave
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

---

## Full pipeline (A → B → C, single Run)

Populate counts, sort, then encode a **readable ASCII message** and recover it. Uses **\`=:\`** so the packet wire can be wider than the encoder output, and **\`show(…; ascii)\`** for human-readable output — see [wire-literals.md — ASCII](wire-literals.md#ascii-literals-vs-show-ascii).

The frequency lines at the top are a **compact Phase A+B demo** (three×\`10\`, one×\`11\`); the string encode in Phase C is independent — in a full design you would scan \`source\` into \`.freq\` first (osc + counter, test **2109**).

\`\`\`logts-play wave
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
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
1wire _ = .freq:set(10, \\1;8)
1wire _ = .freq:set(10, ADD(.freq:get(10), \\1;8))
1wire _ = .freq:set(10, ADD(.freq:get(10), \\1;8))
1wire _ = .freq:set(11, \\1;8)
8wire[2,2] e = .freq:entries()
8wire[2,2] sorted = SORT(e; col=1)
8wire[2] cnts = sorted::1
300wire source =: 'Hello World!'
250wire packet =: .huffPacket { tokens = source }
300wire recovered = .huffRecover { data = packet }
show(cnts)
show(source; ascii)
show(packet; ascii)
show(recovered; ascii)
\`\`\`

### What you should see

| Output | Typical value | Meaning |
|--------|---------------|---------|
| \`cnts\` | \`0000000100000011\` | Sorted counts: \`11\` → 1, \`10\` → 3 (16 bits = 2×\`8wire\`) |
| \`source\` | \`"Hello World!"\` + pad glyphs | 12 ASCII chars (96 bits) right-padded in \`300wire\` |
| \`packet\` | short gibberish + pad | Huffman bitstream shown as ASCII (\`◦\` / \`·\` for non-printable bytes) |
| \`recovered\` | same as \`source\` | Round-trip OK — padding after the string is ignored by \`withLength\` |

\`'Hello World!'\` is **12×8 = 96 bits**; \`expand(…, 2b)\` walks that bit stream in **2-bit token** steps. Pick \`300wire\` / \`250wire\` wide enough for experimentation; \`=:\` fills the rest with \`0\` bits.

### Binary token variant (exact bit width)

If you prefer a minimal numeric demo (test **2107**), use a fixed token wire and declare the packet **exactly** (no \`=:\`):

\`\`\`logts
8wire source = 00011011
17wire packet = .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }
show(recovered)
\`\`\`

Four tokens \`00\` \`01\` \`10\` \`11\` → payload 9 bits + 8-bit length = **17** bits total.

---

## Wave / NEXT notes

- **\`on:1 { once, … }\`** or **\`on:raise\`** for one-shot LUT writes. Bare \`1wire _ = .lut:add(…)\` at top level can run **twice** on the first Run in wave — see [conditional-assignment.md](conditional-assignment.md).
- **\`NEXT(~)\`** in wave only recomputes wires in the \`~\` / \`%\` / \`$\` closure — counters, \`.freq\` entries, and writable LUT state **persist** between steps ([signal-propagation.md](signal-propagation.md)).
- **Declarative wires** that read component outputs (\`.idx:get\`, \`.heap:size()\`, \`.links:get(…)\`) are **re-evaluated** when those components mutate — no manual refresh for typical Huffman FSM wiring (tests **2125–2127**).
- **Post-run scripts:** test harness \`execStmts\` re-parses statements against the live interpreter, seeds inline kinds (protocol vs asm), and calls \`propagate()\` on wave sessions — use for FSM walk + \`.huffPacket\` encode after ticks (tests **2116**, **2117**, **2128**). See [protocol-parse.md — execStmts](protocol-parse.md#execstmts-secondary-parse).

---

## FSM v2.1 — scan + merge (\`huffFsmScript\`)

Generator: \`tests/test_suite.js\` (\`huffFsmRoundTripScript\`) · regenerate doc block: \`node node/_gen_huff_fsm_doc.js\`.

One **clock** tick (osc \`afterSettle\` or manual switch) = scan byte step, one merge round, or \`.huff\` commit. Phases:

| Phase | \`ph\` | Behaviour |
|-------|------|-----------|
| SCAN | \`0000\` | \`.idx\` + \`on:raise\` freq \`:set\`; at \`srcLen\` → heap load + \`ph=MERGE\` |
| MERGE | \`0010\` | Parametric merge (\`nSym − 1\` rounds, literal parent keys) |
| DONE | \`0101\` | \`root = nid\`; \`on:raise\` \`.huff:add\` → packet/recover (no declarative walk) |

**Script size (\`'aacb'\`, 3 symbols):** ~**120 lines**. Merge-only FSM ~**95 lines** (\`huffFsmScript\`).

### Runnable — FSM wave round-trip (\`'aacb'\`)

Open [huffman-v2.md](huffman-v2.md) in the **doc viewer**, then **Load** or **Load & Run** on the block below.

**How to run:** **Load & Run** — the **\`afterSettle\`** osc advances automatically (~200ms per half-cycle with \`delay0\`/\`delay1: 5\`, \`delayIsSec: 0\`). Wait until **Output** shows \`ph = 0101\`, \`huffSz = 00000011\`, \`huffReady = 1\`, and \`recovered\` = \`"aacb"\`. Alternatively use \`comp [switch] .clk\` with \`text: 'tick'\` and click manually (~8–10 ticks).

| Output | Expected |
|--------|----------|
| \`source\` | \`"aacb"\` |
| \`_hc0\` / \`_hc1\` / \`_hc2\` | \`10\` / \`11\` / \`0\` (symbols \`b\` / \`c\` / \`a\`) |
| \`ph\` | \`0101\` when merge + huff commit done |
| \`root\` | \`11111111\` |
| \`recovered\` | same as \`source\` |

\`\`\`logts-play wave
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .links:
  writable
  depth: 16
  length: 256
  fillwith: 0000000000000000
  data { }
  :
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 8b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 8b)
  :
inline [lut] .hfsm:
  SCAN  = 0000
  MERGE = 0010
  DONE  = 0101
  data { }
  :

32wire source =: 'aacb'
8wire srcLen = 00100000
comp [~] .clk:
  afterSettle
  delay0: 5
  delay1: 5
  delayIsSec: 0
  :
4wire ph = 0000
1wire phScan = EQ(ph, .hfsm:SCAN)
1wire phMerge = EQ(ph, .hfsm:MERGE)
1wire phDone = EQ(ph, .hfsm:DONE)
comp [counter] .idx:
  depth: 8
  on: raise
  :
.idx:{
  data = ADD(.idx:get, 00001000)
  write = 1
  set = AND(NOT(.clk:get), phScan, LT(.idx:get, srcLen))
}
8wire nSym = 00000000
8wire mergeStep = 00000000
8wire mergeTarget = 00000010
8wire nid = 11111101
8wire sym = 00000000
8wire root = 00000000
on:raise { AND(.clk:get, phScan, LT(.idx:get, srcLen)), sym = source.(.idx:get)/8 }
on:raise { AND(.clk:get, phScan, LT(.idx:get, srcLen)), 1wire _ = .freq:set(sym, ADD(.freq:get(sym), \\1;8)) }
on:raise { AND(.clk:get, phScan, EQ(.idx:get, srcLen)),
  nSym = .freq:size(),
  1wire _ = .heap:clear(),
  1wire _ = .heap:add(01100010, \\1;8),
  1wire _ = .heap:add(01100011, \\1;8),
  1wire _ = .heap:add(01100001, \\2;8),
  nid = 11111101,
  mergeStep = 00000000,
  
  ph = .hfsm:MERGE }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, 00000000), LT(mergeStep, mergeTarget)),
  8wire _m0k1, 8wire _m0f1 = .heap:popMin(),
  8wire _m0k2, 8wire _m0f2 = .heap:popMin(),
  8wire _m0sum, 1wire _m0c = ADD(_m0f1, _m0f2),
  8wire _m0p = 11111110,
  16wire _m0l0 = _m0p + \\0;8,
  16wire _m0l1 = _m0p + \\1;8,
  1wire _ = .heap:add(_m0p, _m0sum),
  1wire _ = .links:set(_m0k1, _m0l0),
  1wire _ = .links:set(_m0k2, _m0l1),
  nid = 11111110,
  mergeStep = 00000001 }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, 00000001), LT(mergeStep, mergeTarget)),
  8wire _m1k1, 8wire _m1f1 = .heap:popMin(),
  8wire _m1k2, 8wire _m1f2 = .heap:popMin(),
  8wire _m1sum, 1wire _m1c = ADD(_m1f1, _m1f2),
  8wire _m1p = 11111111,
  16wire _m1l0 = _m1p + \\0;8,
  16wire _m1l1 = _m1p + \\1;8,
  1wire _ = .heap:add(_m1p, _m1sum),
  1wire _ = .links:set(_m1k1, _m1l0),
  1wire _ = .links:set(_m1k2, _m1l1),
  nid = 11111111,
  mergeStep = 00000010 }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, mergeTarget)), root = nid }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, mergeTarget)), ph = .hfsm:DONE }
8wire huffCommit = 00000000
2wire _hc0 = 00
2wire _hc1 = 00
1wire _hc2 = 0
64wire packet = \\0;64
32wire recovered = \\0;32
on:raise { AND(.clk:get, phDone, EQ(huffCommit, 00000000), GT(nSym, 00000000)),
  1wire _ = .huff:clear(),
  _hc0 = 10, 1wire _ = .huff:add(01100010, _hc0),
  _hc1 = 11, 1wire _ = .huff:add(01100011, _hc1),
  _hc2 = 0, 1wire _ = .huff:add(01100001, _hc2),
  huffCommit = 00000001 }
on:raise { AND(.clk:get, EQ(huffCommit, 00000001)),
  packet =: .huffPacket { tokens = source },
  recovered = .huffRecover { data = packet } }
8wire huffSz = .huff:size()
1wire huffReady = AND(EQ(huffSz, nSym), GT(nSym, 00000000))
show(source; ascii)
show(_hc0)
show(_hc1)
show(_hc2)
probe(recovered; ascii)
show(ph)
show(root)
show(huffSz)
show(huffReady)
\`\`\`

**Tests:** **2115** (merge+links), **2116** (walk via \`execStmts\`), **2117** (\`execStmts\` round-trip), **2118** (in-script round-trip, no \`execStmts\`).

**Backlog (S1):** single merge block with reused \`mk/mf\` (\`engine-on-reassign\`); hop-by-hop walk FSM without static \`huffWalkEmit\`.

---

## Packet self-contained (SC)

A **self-contained** Huffman packet embeds the codebook on the wire — decode does **not** require a preloaded \`.huff\` LUT. Encode still uses \`.huff\` locally (built by FSM merge + walk); the wire carries everything a decoder needs.

| Region | Width | Content |
|--------|-------|---------|
| **Header** | 24b | \`magic\` \`'H'\` (\`01001000\`) + \`keyWidth\` 8b + \`nSym\` 8b |
| **Codebook frame** | 16b + var | \`lengthOf(codebookBody) 16b\` + body (see below) |
| **Payload** | 8b + var | \`lengthOf(encoded) 8b\` + Huffman bitstream |
| **Checksum** | 16b | CRC-16-CCITT over header + codebook + payload |

### Codebook body (compact, \`sym\` ascending)

Per entry: \`sym 8b\` + \`cwLen 8b\` + \`codeword\` (\`cwLen\` bit, MSB-first).

Helper in the test harness (same layout as on-wire):

\`\`\`javascript
huffBuildCodebookWire(entries)  // [{ sym, cod, width }, …] → bit string
\`\`\`

Build from FSM codewords, sorted by symbol:

\`\`\`logts
// after .huff:add(…) for each symbol
53wire codebook = …   // huffBuildCodebookWire from sorted entries
\`\`\`

### Encode — \`.huffPacketSC\`

Separate protocol from v1 \`.huffPacket\` — includes header, framed codebook, payload, checksum.

\`\`\`logts-play legacy
# --- Setup: writable codebook LUT + encode protocol ---
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :

inline [protocol] .huffPacketSC:
  def codebookBody:
    codebook ~b
  def codebook:
    lengthOf(codebookBody) 16b
    codebookBody
  def encoded:
    expand(tokens, .huff, keyWidth b)
  def payload:
    lengthOf(encoded) 8b
    encoded
  def body:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    payload
  out:
    body
    checksum(crc16, body)
  :

# --- Codewords pentru 'aacb' (folosite la expand) ---
1wire _ = .huff:add(01100001, 0)
1wire _ = .huff:add(01100010, 10)
1wire _ = .huff:add(01100011, 11)
32wire source =: 'aacb'

# --- Codebook body 53b (sym 8 + cwLen 8 + codeword)*3, sortat după sym ---
# a: 01100001|00000001|0   b: 01100010|00000010|10   c: 01100011|00000010|11
53wire codebook = 01100001000000010011000100000001010011000110000001011

# --- Encode packet SC ---
# layout: HEADER 24b | cbLen 16b | CODEBOOK 53b | PAYLOAD 14b | CRC 16b
123wire packet =: .huffPacketSC {
  tokens = source,
  keyWidth = 00001000,
  nSym = 00000011,
  codebook = codebook
}
show(packet)
\`\`\`

**Test 2119** verifies magic, codebook frame, payload (matches v1 \`.huffPacket\`), and CRC suffix.

### Recover — \`.huffRecoverSC\` (Faza 3)

Decode = **protocol separat** with \`mode: parse\` — **not** \`:decode()\` on the encoder.

Explicație detaliată (\`stream\` vs \`data\`, cursor, exemplu runnable): [protocol-parse.md — \`.huffRecoverSC\`](protocol-parse.md#complex-example--huffrecoversc) și [huffman-v2.md — Packet SC](huffman-v2.md#recover--huffrecoversc-faza-3).

\`\`\`logts
inline [protocol] .huffRecoverSC:
  mode: parse
  codebookLoad: .huff
  parseResult: collapseOnly
  def entry:
    sym 8b
    cwLen 8b
    withLength(rest, cwLen b)
  def codebook:
    withLength(stream, 16b, entry)
  out:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    validateChecksum(crc16, data)
    collapse(withLength(stream, 8b), .huff, keyWidth b)
  :
\`\`\`

**Attributes:**
- \`codebookLoad: .huff\` — clears LUT, then \`.huff:add(sym, codeword)\` per parsed entry
- \`parseResult: collapseOnly\` — output wire = decoded tokens only (not header/codebook bits)
- Validates \`nSym\` matches entry count after codebook parse

Side-effect at parse: populate \`.huff\` from codebook entries (no preset LUT required).

### Bit layout — \`'aacb'\` example

| Offset (bit) | Width | Section | Content (\`'aacb'\`) |
|--------------|-------|---------|---------------------|
| 0 | 8b | magic | \`H\` |
| 8 | 8b | keyWidth | 8 |
| 16 | 8b | nSym | 3 |
| 24 | 16b | cbLen | 53 |
| 40 | 53b | codebook | \`a\\|1\\|0\`, \`b\\|2\\|10\`, \`c\\|2\\|11\` (sym \\| cwLen \\| cw) |
| 93 | 14b | payload | len=8 + \`00001110\` (6 Huffman bits) |
| 107 | 16b | CRC | 16-bit suffix |

**Total: 123 bit.**

\`\`\`packet-layout
H:8,kw:8,nSym:8,cbLen:16,codebook:53,payload:14,CRC:16
\`\`\`

Payload encoded = \`00000110001110\` (14 bit — same as v1 \`.huffPacket\` for \`'aacb'\`).

### Runnable — round-trip SC (\`'aacb'\`)

Script **complet** — **Load** sau **Load & Run** în doc viewer (fără copy-paste din alte secțiuni). Writable LUT = atributul \`writable\` pe \`inline [lut] .huff\` (nu necesită \`MODE WIREWRITE\`).

\`\`\`logts-play legacy
# --- Setup: writable LUT + protocoale encode / recover ---
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :

inline [protocol] .huffPacketSC:
  def codebookBody:
    codebook ~b
  def codebook:
    lengthOf(codebookBody) 16b
    codebookBody
  def encoded:
    expand(tokens, .huff, keyWidth b)
  def payload:
    lengthOf(encoded) 8b
    encoded
  def body:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    payload
  out:
    body
    checksum(crc16, body)
  :

inline [protocol] .huffRecoverSC:
  mode: parse
  codebookLoad: .huff
  parseResult: collapseOnly
  def entry:
    sym 8b
    cwLen 8b
    withLength(rest, cwLen b)
  def codebook:
    withLength(stream, 16b, entry)
  out:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    validateChecksum(crc16, data)
    collapse(withLength(stream, 8b), .huff, keyWidth b)
  :

# --- Sursă + codewords (encode) ---
32wire source =: 'aacb'
1wire _ = .huff:add(01100001, 0)
1wire _ = .huff:add(01100010, 10)
1wire _ = .huff:add(01100011, 11)

# --- Codebook body 53b (embedded în packet) ---
53wire codebook = 01100001000000010011000100000001010011000110000001011

# --- ENCODE (live — necesită .huff populat pentru expand) ---
123wire packetEncoded =: .huffPacketSC {
  tokens = source,
  keyWidth = 00001000,
  nSym = 00000011,
  codebook = codebook
}
peek(source; ascii)
peek(packetEncoded)

# --- SNAPSHOT 123b pentru recover ---
# Wave mode re-evaluează \`.huffPacketSC\` după \`:clear()\` → CRC invalid dacă folosești \`packetEncoded\` direct.
# Copiază valoarea din \`peek(packetEncoded)\` (hex grupat + rest binar):
123wire packet = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
peek(packet)

# --- RECOVER: parse packet → rebuild .huff din codebook → decode payload ---
1wire _ = .huff:clear()
32wire recovered = .huffRecoverSC { data = packet }
8wire huffSz = .huff:size()

show(recovered; ascii)
show(huffSz)
\`\`\`

**Output așteptat:**

\`\`\`text
source (32wire) = "aacb"
packetEncoded (123wire) = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
packet (123wire) = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
recovered (32wire) = "aacb" (ref: &4)
huffSz (8wire) = 00000011 (ref: &5)
\`\`\`

→ \`recovered\` = \`source\` (\`aacb\`), \`huffSz = 3\` după recover (LUT reconstruit din codebook). **Test 2145** verifică același flux (fără \`peek\`/\`show\`, legacy propagation).

**\`peek\` vs \`show\`:** \`peek(expr)\` citește valoarea **fix în acel moment** (înainte de propagation ulterioară). \`show(expr)\` rulează după ce se termină propagation — deci \`show(packetEncoded)\` *după* \`.huff:clear()\` poate afișa un packet corupt (\`… + 000\` în loc de \`… + 111\`), pentru că \`.huffPacketSC\` depinde de \`expand(..., .huff)\` și LUT-ul e gol. Folosește \`peek\` pentru encode + snapshot, \`show\` doar pe rezultatele finale care nu depind de \`.huff\`.

**Wave debug:** \`deps(packetEncoded)\` arată legătura cu \`.huff\` / \`.huffPacketSC\`; **Wave Listen** (Win ▾) arată re-eval după \`:clear()\` — vezi [debug.md — wave-debug patterns](debug.md#wave-debug-patterns).

### Policy

| Mechanism | Role |
|-----------|------|
| \`.huffPacketSC\` | Encode — needs local \`.huff\` + \`codebook ~b\` param |
| \`.huffRecoverSC\` | Recover — parse wire, rebuild \`.huff\`, decode payload |
| \`:decode()\` | **Not used** for SC packets |

See [protocol-parse.md](protocol-parse.md) — Faza 0a–0d (\`mode: parse\`, \`withLength\`, \`keyWidth b\`, \`checksum\`).

---

## Gap analysis (N-general)

| Need | Status |
|------|--------|
| \`:entries\` + \`SORT\` | **Done** (Faza 0b) — tests **2085**, **2105** |
| \`:keyAt\` / \`:valueAt\` | **Done** (Faza 0c) |
| \`popMin\` / \`peekMin\` on LUT | **Done** (Faza 0d) — merge extract-min |
| \`NEXT\` ≈ osc in wave | **Done** (Faza 0z) |
| Runtime freq scan | **Done** — tests **2104**, **2109** |
| Round-trip wave | **Done** — tests **2106–2108** |
| N-general merge + byte codebook | **Done** — test **2110** (\`popMin\`, manual \`.huff\`) |
| Auto codewords via \`.links\` walk | **Done** — tests **2111–2114** (\`'aacb'\`, fixed code depth) |
| \`:entries(sortKeys\\|sortValues)\` | **Done** — tests **2120–2122** |
| Multi-assign in one \`on:raise { }\` | **Done** — tests **2123–2124** |
| Declarative wire re-eval (counter, LUT \`:size\`, \`:get\`) | **Done** — tests **2125–2127** |
| FSM switch scan + merge (\`ph\` 4b) | **Done** — test **2115** (\`'aacb'\`, links = **2113**, wave session) |
| FSM + post-tick walk (\`execStmts\`) | **Done** — test **2116** (codewords \`0\`/\`10\`/\`11\`) |
| FSM merge + \`execStmts\` round-trip | **Done** — test **2117** (merge + walk + protocol, wave) |
| FSM + \`execStmts\` protocol only | **Done** — test **2128** |
| Packet SC encode (\`.huffPacketSC\`) | **Done** — test **2119** |
| Packet SC recover (\`.huffRecoverSC\`) | **Done** — tests **2145**, **2146** |
| Round-trip SC fără \`.huff\` preset | **Done** — test **2145** |
| Parametric merge steps (\`nSym−1\` not ×31) | **Done** — generator \`huffFsmMergeStepBlocks(sourceLiteral)\` |
| Reused merge wires (\`mk/mf\` one block) | **Backlog** — engine reassign in duplicate \`on:raise\` |
| Walk FSM hop-by-hop (\`ph=WHOP\`, no static unroll) | **Backlog** |
| FSM round-trip in-script (no \`execStmts\`) | **Done** — test **2118** + doc **Load & Run** block |
| \`ARGSORT\` / \`keysAt\` / \`valuesAt\` | **Backlog** (generic) |
| \`comp [priorityqueue]\` | **Backlog** — redundant if \`popMin\` suffices |
| \`buildFrom\` / \`HUFFMAN_*\` builtin | **Out of scope** (by design) |
| Mod \`signal\` (full digital settle) | **Backlog** — after Huffman v2 |

---

## Related

- [huffman.md](huffman.md) — static codebook + protocols (v1)
- [lut.md](lut.md) — writable LUT, \`:entries\`, \`SORT\`, \`popMin\`
- [conditional-assignment.md](conditional-assignment.md) — \`on:raise\`, \`on:1\`, wave vs legacy
- [builtin-SORT.md](builtin-SORT.md) — \`SORT(matrix; col=1)\`
- [builtin-ARGMAX.md](builtin-ARGMAX.md) — max frequency index
- [counter.md](counter.md) — index stepping (\`write\`, \`data\`, \`set\`)
- [oscillator.md](oscillator.md) — periodic clock (tests use \`setComp\`)
- [switch.md](switch.md) — manual tick in the editor
- [protocol-lut.md](protocol-lut.md) — \`expand\`, \`collapse\`
- [protocol-parse.md](protocol-parse.md) — \`withLength\` parse, \`validateChecksum\`
- [signal-propagation.md](signal-propagation.md) — wave + NEXT
- [assignment-operators.md](assignment-operators.md) — \`=:\` padding
- [wire-literals.md](wire-literals.md) — \`'Hello World!'\` wire strings, \`show(w; ascii)\`
- [debug.md](debug.md) — \`show(…; ascii)\` display tags
`,
    'huffman.md': `# Huffman coding walkthrough

End-to-end example that ties together three v0_3_2 features. For **runtime frequency scan + wave** (v2), see **[huffman-v2.md](huffman-v2.md)**.

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

\`length(param)\` measures the invoke argument; \`lengthOf(def)\` measures evaluated protocol output. Details: [protocol-assemble.md — length / lengthOf](protocol-assemble.md#lengthparam-nb-and-lengthofdef-nb).

---

## Dynamic width

\`.huffPacket\` is classified as **dynamic** width: output size depends on token length and the codebook. \`.huffRecover\` output width depends on the decoded key count inside the payload.

\`doc(.huffPacket)\` shows \`width: dynamic\`. Assign to a wire wide enough for the largest expected packet, or use runtime width checking with \`=\`.

See [protocol-assemble.md — static vs dynamic width](protocol-assemble.md#static-vs-dynamic-width-inferprotocolwidth).

---

## Design notes

| Topic | Detail |
|-------|--------|
| **Key width** | \`2b\` matches the address width of a 4-entry table. \`expand\` / \`collapse\` require the token stream length to be a multiple of \`keyWidth\`. |
| **Length field width** | \`8b\` allows payloads up to 255 bits. Use \`16b\` for larger frames ([\`withLength\`](protocol-assemble.md#withlengthdata-nb)). |
| **Separate protocols** | Encoder and decoder are independent definitions — swap codebooks or framing without changing the other side's structure. |
| **Not in scope** | \`checksum()\`, \`concat()\`, \`padLeft()\`, \`padRight()\` — add framing or integrity in user logic if needed. |
| **Tests** | Suite IDs 1069–1074 (LUT), 1078–1086 (protocol round-trip), **2104–2114** ([huffman-v2.md](huffman-v2.md) wave pipeline), **2115–2118** (FSM wave + round-trip doc block), **2128** (protocol via \`execStmts\`). |

---

## Related

- [huffman-v2.md](huffman-v2.md) — runtime frequency scan + wave round-trip
- [lut.md](lut.md) — \`variableDepth\`, \`prefixFree\`, LUT invoke
- [protocol-assemble.md](protocol-assemble.md) — \`def\`, \`length\`, \`lengthOf\`, \`withLength\`
- [protocol-lut.md](protocol-lut.md) — \`expand\`, \`collapse\`
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
    'json-subset.md': `# JSON subset — protocol example

Minimal JSON on a **single bitstream** (no whitespace, no numbers). Demonstrates **tentative choice**, **section repeat**, **anchor strings**, and **wire string literals** together.

Mechanisms: [protocol-tentative.md](protocol-tentative.md), [protocol-repeat.md](protocol-repeat.md), [protocol-parse.md](protocol-parse.md#wire-literals-in-parse-protocol).

---

## Target document

\`\`\`json
{"active":true,"tags":["x","y"],"meta":{"ok":false}}
\`\`\`

---

## Protocol \`.jsonSubset\`

\`\`\`logts-play legacy
inline [protocol] .jsonSubset:
  mode: parse
  parseView: tree

  def trueLit:
    "true"
  def falseLit:
    "false"
  def jsonBool:
    trueLit?
    falseLit?

  def jsonChar:
    byte 8b

  def jsonString:
    "\\""
    jsonChar[0-]
    "\\""

  def jsonValue:
    jsonObject?
    jsonArray?
    jsonString?
    jsonBool?

  def jsonPair:
    jsonString
    ":"
    jsonValue

  def pairEntry:
    ","
    jsonPair

  def pairList:
    jsonPair
    pairEntry*

  def jsonObject:
    "{"
    pairList?
    "}"

  def arrayEntry:
    ","
    jsonValue

  def valueList:
    jsonValue
    arrayEntry*

  def jsonArray:
    "["
    valueList?
    "]"

  out:
    jsonValue
  :
\`\`\`

| Fragment | Mechanism |
|----------|-----------|
| \`trueLit?\` / \`falseLit?\` | tentative choice between defs |
| \`jsonObject?\` / … | \`jsonValue\` dispatch |
| \`pairEntry*\` | unbounded repeat (comma-separated pairs) |
| \`"\\"\` … \`"\\""\` | wire-string anchor for \`jsonChar[0-]\` |
| \`pairList?\` | empty object \`{}\` allowed |

**Limits:** no \`\\\` escapes inside strings; no numbers; no whitespace between tokens.

---

## Runnable — minimal object

\`\`\`logts-play legacy
inline [protocol] .jsonSubset:
  mode: parse
  parseView: tree
  def trueLit:
    "true"
  def falseLit:
    "false"
  def jsonBool:
    trueLit?
    falseLit?
  def jsonChar:
    byte 8b
  def jsonString:
    "\\""
    jsonChar[0-]
    "\\""
  def jsonValue:
    jsonObject?
    jsonArray?
    jsonString?
    jsonBool?
  def jsonPair:
    jsonString
    ":"
    jsonValue
  def pairEntry:
    ","
    jsonPair
  def pairList:
    jsonPair
    pairEntry*
  def jsonObject:
    "{"
    pairList?
    "}"
  def arrayEntry:
    ","
    jsonValue
  def valueList:
    jsonValue
    arrayEntry*
  def jsonArray:
    "["
    valueList?
    "]"
  out:
    jsonValue
  :

# ASCII bits for {"active":true} — build in script or paste from encoder
# Example: assign via external tool; here we show parseView after manual bit wire:
\`\`\`

For a full bit-exact demo in tests, see suite tests **2169–2170** (\`asciiWireBits\` pattern).

---

## parseView (conceptual)

\`\`\`text
jsonObject
  pairList
    jsonPair[0] → "active" : true
    jsonPair[1] → "tags" : jsonArray …
    jsonPair[2] → "meta" : jsonObject …
\`\`\`

Access uses **0-based** indices on repeated sections: \`parsed:jsonPair:0:…\` (see [protocol-repeat.md](protocol-repeat.md)).
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
  on: raise/edge/1
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
  on: raise/edge/1
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
| Reverse in protocol | \`collapse(data, .name, keyWidth)\` — greedy decode; see [protocol-lut.md — expand / collapse](protocol-lut.md#expand--collapse-with-lut) |

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

Protocol reverse transform: [protocol-assemble.md — \`:decode()\`](protocol-assemble.md#decodechannels). ASM disassembly: [asm.md — \`:decode()\`](asm.md#decodeinstruction).

---

## Writable LUT API (\`inline [lut]\` only)

Add the \`writable\` flag to enable runtime \`add\` / \`set\` / \`remove\` / \`clear\` and statistics on an **ordered entry list** (duplicate keys allowed). Without \`writable\`, the LUT stays read-only.

\`\`\`logts
inline [lut] .huff:
    writable
    depth: 8
    length: 16
    fillwith: 00000000
    data {
        000 : 00000001
        001 : 00000010
    }
    :
\`\`\`

| Method | Description |
|--------|-------------|
| \`.lut(key)\` / \`.lut:get(key)\` | First value for key; missing key → **fillwith** |
| \`.lut(key, matchIndex)\` | Nth matching entry for key |
| \`.lut:decode(value)\` | Reverse lookup on **entry list** |
| \`.lut:add(key, value)\` | Append entry |
| \`.lut:set(key, value [, matchIndex])\` | Replace or append |
| \`.lut:remove(key [, matchIndex])\` | Remove entry (no-op if missing) |
| \`.lut:clear()\` | Remove all entries |
| \`.lut:size()\` | Entry count |
| \`.lut:countKey(key)\` | Matches for key (**0** if absent; fillwith does not affect key presence) |
| \`.lut:countValue(value)\` | Matches for value (**0** for fillwith, even if \`get\` would return it) |
| \`.lut:hasKey(key)\` | \`1\` if any entry has key, else \`0\` (missing key → \`0\`) |
| \`.lut:hasValue(value)\` | \`1\` if any entry has value, else \`0\` (**0** for fillwith) |
| \`.lut:isEmpty()\` | \`1\` if no entries |
| \`.lut:keys()\` | Vector of all keys (key width × entry count) |
| \`.lut:values()\` | Vector of all values (value width × entry count) |
| \`.lut:entries()\` | Matrix **N×2**: column 0 = key, column 1 = value (\`ew = max(keyW, valW)\`) |
| \`.lut:entries(sortKeys)\` | Keys only, sorted by value ascending (unsigned default); tie-break: lower entry index |
| \`.lut:entries(sortValues)\` | Values only, same sort order as \`sortKeys\` |
| \`.lut:keyAt(i)\` | Key at list index \`i\` (\`0 … size()-1\`; addr width) |
| \`.lut:valueAt(i)\` | Value at list index \`i\` (depth or variableDepth width) |
| \`.lut:removeAt(i)\` | Remove entry at index \`i\`; returns \`1wire\` ack \`0\` |
| \`.lut:peekMin\` / \`.lut:peekMax\` | Min/max by **value**; **dual assign** key + value; list unchanged |
| \`.lut:popMin\` / \`.lut:popMax\` | Min/max by **value**; **dual assign** key + value; entry removed |

### Min / max by value (\`:peekMin\`, \`:popMin\`, …)

Compare on **entry value** (not key). Equal values: **lower index wins** (stable). Empty list → runtime error. Optional format tags after \`;\` inside \`()\` — same as builtins (\`; signed\`, \`; q4p4\`, \`; s8\`, …). Canonical form: \`.lut:popMin(; signed)\` — format is a **tag**, not a positional argument.

| Method | Mutates list | Returns |
|--------|--------------|---------|
| \`peekMin\` / \`peekMax\` | no | \`key, value\` (dual assign) |
| \`popMin\` / \`popMax\` | yes | \`key, value\` (dual assign) |
| \`removeAt(i)\` | yes | \`0\` ack |

\`pop*\` and \`removeAt\` trigger wave re-propagation for wires that read the LUT (same as \`:add\` / \`:remove\`). In wave, prefer \`on:1 { once, k, v = .heap:popMin() }\` for one-shot extract-min (Huffman merge).

\`\`\`logts-play wave
inline [lut] .heap:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    0000 : 0010
    0001 : 0010
    0010 : 0001
  }
  :
1wire once = 1
4wire k1 = 0000
4wire f1 = 0000
on:1 {
  once,
  k1, f1 = .heap:popMin()
}
4wire sz = .heap:size()
show(k1)
show(f1)
show(sz)
\`\`\`

After Run: \`k1=0010\`, \`f1=0001\` (min entry removed), \`sz=0010\` (2 entries left). For a full Huffman merge, chain additional \`on:\` blocks or oscillators for the second \`popMin\` and \`:add\` of the parent node.

For Huffman **N-general**: repeated \`popMin\` on a \`.nodes\` LUT replaces a dedicated priority-queue component. Pair with \`:add\` for merged parent nodes; use a separate LUT (e.g. \`.links\`) for parent/child bookkeeping.

Writable **\`prefixFree\`** codebooks: \`collapse\` matches only **\`lutEntryList\`** entries (not \`fillwith\` slots), longest codeword first, and outputs **\`entry.key\`** — required for byte-key round-trip. See [huffman-v2.md — N-general](huffman-v2.md#n-general-merge-popmin--full-aacb-example).

Dual assign in \`on:1 { trigger, k, v = .lut:popMin() }\` is supported (same as top-level \`k, v = …\` or \`4wire k, 4wire v = …\`).

### Indexed access (\`:keyAt\`, \`:valueAt\`)

Point access into **\`lutEntryList\`** by **insertion order** (same order as \`:add\` / \`:set\`). Index \`i\` is **0-based**; \`i >= size()\` or negative → runtime error. Writable LUT only (read-only → \`not writable\`).

Duplicate keys: each list slot has its own index — \`keyAt(1)\` may repeat a key seen at \`keyAt(0)\`.

\`\`\`logts-play wave
inline [lut] .freq:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :
1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .freq:add(010, 1010)
}
4wire k0 = .freq:keyAt(0000)
4wire k2 = .freq:keyAt(0010)
4wire v2 = .freq:valueAt(0010)
show(k0)
show(k2)
show(v2)
\`\`\`

Use with a counter / \`NEXT\` to walk \`i = 0 … size()-1\` when building Huffman merges. For bulk export without a loop, prefer \`:entries\` + \`SORT\`.

### Bulk export (\`:keys\`, \`:values\`, \`:entries\`)

Read-only snapshots of the **ordered entry list** (same order as \`add\` / \`set\`). Empty list → zero-length blob (declare width \`0\` or match \`size()\`).

**Sizing:** declare rank-1 tensors with element count = \`.lut:size()\` and element width = **\`bitIndexWidth(length)\`** for keys (e.g. \`length: 16\` → 4 bits per key) and **\`depth\`** for values (unless \`variableDepth\`). For \`:entries\`, use \`Ewire[N,2]\` with \`Ewire = max(keyW, depth)\` and \`N = size()\`.

### Wave mode and mutable methods (\`on:\`)

In the editor, **wave** is the default propagation mode. After **Run**, wave **\`propagate()\` re-executes tracked wire statements** — including a top-level \`1wire _ = .lut:add(...)\`, so **\`:add\` / \`:set\` / \`:remove\` can run twice on the first Run** (append twice, etc.). **\`show\` does not mutate the LUT**; it runs after propagation.

**Safe patterns in wave:**

| Pattern | When to use |
|---------|-------------|
| Static \`data { ... }\` | Fixed codebook / export demos |
| \`on:1 { trigger, ok = .lut:mutate(...) }\` | One-shot init (\`trigger = 1\` on first RUN) |
| \`on:raise { trigger, ok = .lut:mutate(...) }\` | Mutate on \`0→1\` edge (switch, flag) |
| \`logts-play legacy\` | Multi-step mutation scripts in docs |

Use a named wire for the assignment (\`ok = .huff:add(...)\`) — not \`_\` (undefined in \`on:\` blocks). See [conditional assignment](conditional-assignment.md).

**Affected methods:** \`:add\`, \`:set\`, \`:remove\`, \`:removeAt\`, \`:clear\`, \`:popMin\`, \`:popMax\` (all mutate \`lutEntryList\`). Read-only methods (\`:keys\`, \`:values\`, \`:entries\`, \`:keyAt\`, \`:valueAt\`, \`:peekMin\`, \`:peekMax\`, \`:get\`, \`:size\`, …) are safe to assign on a wire; re-execution only refreshes the snapshot.

On **wave**, a top-level wire like \`16wire lb = .links:get(key)\` or \`4wire sz = .heap:size()\` **tracks** the LUT and re-evaluates after mutations (and after test-harness \`execStmts\` + \`propagate()\`) — tests **2126–2127**. See [signal propagation](signal-propagation.md#declarative-wire-re-evaluation).

\`\`\`logts-play wave
inline [lut] .freq:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :
1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .freq:add(010, 1010)
}
4wire[3] ks = .freq:keys()
4wire[3] vs = .freq:values()
4wire[3,2] ent = .freq:entries()
show(ks)
show(vs)
show(ent)
\`\`\`

Use with [SORT](builtin-SORT.md) to reorder by frequency, e.g. \`SORT(.freq:entries(); col=1)\`.

**Sorted export (Huffman heap load):** avoid \`SORT\` on an empty or changing list at init — use value-sorted snapshots instead:

\`\`\`logts-play wave
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data { }
  :
1wire _ = .freq:set(0010, \\\\3;8)
1wire _ = .freq:set(0011, \\\\1;8)
1wire _ = .freq:set(0000, \\\\2;8)
8wire[3] syms = .freq:entries(sortKeys)
8wire[3] cnts = .freq:entries(sortValues)
show(syms)
show(cnts)
\`\`\`

Optional format tags (same as \`:popMin\` / \`:peekMin\`): unsigned default, \`; signed\`, or \`; q4p4\` etc.

\`\`\`logts
8wire syms = .freq:entries(sortKeys; signed)
8wire cnts = .freq:entries(sortValues; signed)
\`\`\`

Empty list → zero-length blob (\`bitWidth = 0\`). Fixed-width wire assignment requires \`N >= 1\` in \`[N]\` — gate heap load on \`.freq:size()\` or use after scan populates entries.

### \`fillwith\` vs explicit entries

Statistics scan **only explicit entries** in the list. \`get\` uses fillwith as a fallback, and \`decode\` treats fillwith as a table operation (unmapped slots hold it):

| Operation | Key / value absent from list | \`fillwith\` as argument |
|-----------|------------------------------|-------------------------|
| \`get(key)\` | returns **fillwith** | — |
| \`hasKey(key)\` | \`0\` | — |
| \`countKey(key)\` | \`0\` | — |
| \`hasValue(fillwith)\` | — | **\`0\`** |
| \`countValue(fillwith)\` | — | **\`0\`** |
| \`decode(fillwith)\` | — | **first unmapped slot** (then gaps by \`matchIndex\`) |
| \`isValid(key, fillwith)\` | \`0\` unless pair exists | — |

\`decode\` is a table operation, not a \`get\`: it first returns keys of **explicit entries** with the value, then — when the value equals \`fillwith\` — the **unmapped slot addresses** in ascending order. This mirrors read-only \`decode\` (which scans \`lutTable\`, fill slots included), while duplicate-key entries are still decodable from the list.

Read-only LUTs (without \`writable\`) keep the previous \`lutTable\` semantics for \`decode\` / \`get\`.

Writable notes:

- \`decode(fillwith)\` returns the first unmapped slot (gap); with \`matchIndex\` it walks the gaps. It only errors when there are no matching entries **and** no unmapped slots (fully-mapped table with a non-fill value).
- \`writable + prefixFree\`: each \`add\` / \`set\` re-validates prefix-free codewords; violations throw and leave the list unchanged.
- Mutations are used as expressions, e.g. \`1wire _ = .huff:add(000, C)\` (standalone \`.huff:add(...)\` is not a statement).

### Runnable — \`:add(key, value)\`

Appends a new entry. Duplicate keys are kept in order; \`get(key)\` returns the first match unless \`matchIndex\` is supplied.

\`\`\`logts-play wave
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .huff:add(000, 0011)
}
4wire first = .huff:get(000)
4wire second = .huff:get(000, 0001)
4wire sz = .huff:size()
show(first)
show(second)
show(sz)
\`\`\`

After \`add\`, key \`000\` has two entries: first \`0001\`, second \`0011\`. \`size()\` → \`3\`.

### Runnable — \`:set(key, value)\`

Replaces the first matching key, or appends if the key is absent.

\`\`\`logts-play wave
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .huff:set(000, 1111)
}
4wire x = .huff:get(000)
show(x)
\`\`\`

Key \`000\` was \`0001\` → now \`1111\`. Key \`001\` unchanged (\`0010\`).

### Runnable — \`:remove(key)\`

Removes the first entry with the given key. No error if the key is missing.

\`\`\`logts-play legacy
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _a = .huff:add(000, 0011)
1wire _b = .huff:remove(000)
4wire sz = .huff:size()
4wire x = .huff:get(000)
show(sz)
show(x)
\`\`\`

Removes the **first** \`000\` entry (\`0001\`). The appended \`0011\` remains; \`size()\` → \`2\`.

### Runnable — \`:clear()\`

Removes all entries. Lookups fall back to \`fillwith\`.

\`\`\`logts-play wave
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .huff:clear()
}
1wire empty = .huff:isEmpty()
4wire sz = .huff:size()
4wire x = .huff:get(000)
show(empty)
show(sz)
show(x)
\`\`\`

\`isEmpty()\` → \`1\`, \`size()\` → \`0\`, \`get(000)\` → \`fillwith\` (\`0000\`).

To run writable methods only when a flag rises (instead of at every RUN), use [conditional assignment](conditional-assignment.md):

\`\`\`logts
on:raise {
  clearFlag,
  _ = .huff:clear()
}
\`\`\`

### Runnable — \`prefixFree\` + \`:add\` (incremental Huffman)

With \`writable\` and \`prefixFree\`, each \`add\` / \`set\` must keep codewords prefix-free. Build a codebook step by step:

\`\`\`logts-play wave
inline [lut] .huff:
  writable
  prefixFree
  data {
    00: 0
  }
  :

1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .huff:add(01, 10)
}
4wire sz = .huff:size()
2wire y = .huff(01)
show(sz)
show(y)
\`\`\`

\`00 → 0\` then \`01 → 10\` — valid prefix-free extension. \`size()\` → \`2\`, lookup \`01\` → \`10\`.

If a new codeword would violate prefix-free (e.g. adding \`01\` when \`0\` already exists), the mutation throws and the table is unchanged.

### Runnable — \`countKey\` / \`countValue\` / \`hasKey\` / \`hasValue\`

\`\`\`logts-play wave
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire once = 1
1wire ok = 0
on:1 {
  once,
  ok = .huff:add(000, 0011)
}
4wire ck = .huff:countKey(000)
4wire cv_fill = .huff:countValue(0000)
4wire cv_real = .huff:countValue(0011)
4wire hk_miss = .huff:hasKey(111)
4wire hk_hit = .huff:hasKey(000)
1wire hv_fill = .huff:hasValue(0000)
1wire hv_hit = .huff:hasValue(0011)
show(ck)
show(cv_fill)
show(cv_real)
show(hk_miss)
show(hk_hit)
show(hv_fill)
show(hv_hit)
\`\`\`

\`countKey(000)\` → \`2\` (two explicit entries). \`countValue(0000)\` → \`0\` (fillwith is not counted). \`hasKey(111)\` → \`0\`; \`hasKey(000)\` → \`1\`. \`hasValue(0000)\` → \`0\`; \`hasValue(0011)\` → \`1\`.

### Runnable — \`get\` fallback vs \`hasKey\` (missing key)

\`\`\`logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
  }
  :

4wire x = .huff:get(111)
1wire hk = .huff:hasKey(111)
4wire ck = .huff:countKey(111)
show(x)
show(hk)
show(ck)
\`\`\`

Key \`111\` is not in the list: \`get\` returns **fillwith** (\`0000\`), but \`hasKey\` → \`0\` and \`countKey\` → \`0\`.

### Runnable — \`decode(fillwith)\` returns unmapped slots

\`\`\`logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
  }
  :

4wire slot = .huff:decode(0000)
4wire slot2 = .huff:decode(0000, 0001)
show(slot)
show(slot2)
\`\`\`

Only slot \`000\` is mapped (\`0001\`). \`decode(0000)\` — the fillwith — returns the **first unmapped slot** (\`0001\`), and \`matchIndex 1\` the next gap (\`0010\`). Real values still decode from explicit entries: \`decode(0001)\` → \`0000\`.

### Runnable — \`set\` with \`matchIndex\` (duplicate keys)

\`\`\`logts-play legacy
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _a = .huff:add(000, 0011)
1wire _b = .huff:set(000, 1100, 0001)
4wire first = .huff:get(000)
4wire second = .huff:get(000, 0001)
show(first)
show(second)
\`\`\`

\`set(000, 1100, 1)\` updates the **second** \`000\` entry; the first stays \`0001\`.

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
- [protocol-lut.md](protocol-lut.md) — \`expand\` / \`collapse\` with LUT
- [protocol-assemble.md](protocol-assemble.md) — \`:decode()\` on channels
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
1wire[2] idx = ARGMAX(m; row index)
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
  on: raise/edge/1
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
    'network-chat.md': `# Network chat — socket uplink + packet downlink (wave)

Multi-instance **wave** chat demo: clients on **Inst 2–5** send framed messages to a **server on Inst 1** over a **socket uplink**; the server formats lines and **broadcasts** them back on the **packet bus** (downlink). Same script on every client; instance id comes from [\`/instance/\`](meta-constants.md).

Related: [sock.md](sock.md) (\`openSock\`, \`connSock\`, \`SOCKATTACHED\`), [network.md](network.md) (\`send\` broadcast), [protocol-parse.md](protocol-parse.md) (\`withLength\`, \`parseView\`).

**Suite tests:** **2528–2529** (\`SOCKATTACHED\`), **2530–2531** (\`.chatFrame\` / \`.chatParse\`), **2532–2533** (uplink cross-instance), **2534** (downlink broadcast), **2535–2536** (\`lineBuf\` / hello frame width).

---

## Why socket + packets? (v1 hybrid)

| Direction | Mechanism | Reason |
|-----------|-----------|--------|
| Client → server | **Socket** stream (\`openSock\` / \`connSock\`, \`sock <<\`) | Variable-length chat frames with \`lengthOf\` / \`withLength\` on a bit stream |
| Server → clients | **Packet bus** (\`send\` broadcast, no \`target\`) | Fan-out to all clients; consumer sockets cannot \`<<\` on the downlink path |

**v2 (later):** dual-socket (separate downlink socket per client). See plan [network_chat_socket.plan.md](../../.cursor/plans/network_chat_socket.plan.md).

---

## Architecture

\`\`\`mermaid
flowchart TB
  subgraph clients [Inst 2 to 5]
    KBD[keyboard + Send]
    UP[sock toSrv uplink]
    RX[comp network RX]
    TERM[terminal]
    KBD --> UP
    RX --> TERM
  end
  subgraph server [Inst 1]
    UPin[connSock upN consume]
    STERM[terminal hub]
    TX[send broadcast 64b lines]
    UPin --> STERM
    STERM --> TX
  end
  UP -->|socket withLength frames| UPin
  TX -->|packets FIFO| RX
\`\`\`

| Role | Instance | Uplink | Downlink |
|------|----------|--------|----------|
| Server | **1** | \`connSock -> upN\` per client port | \`send\` broadcast on \`chat-demo\` |
| Client | **2–5** | \`openSock <- toSrv\`, port = \`/instance/\` | \`comp [network]\` RX, \`pop\` → terminal |

**Port map:** uplink port **N** = client instance id (Inst 2 → port \`0010\`, Inst 3 → \`0011\`, …).

### Deferred connect (wave) — no \`connSock\` at Run

The server does **not** call \`connSock\` on load. Instead:

1. **Pre-declared** property blocks — \`set\` tied to a bit in \`readyToConnectToInst\`
2. **\`on:1\`** — on JOIN packet from client, set the bit to \`1\`
3. **Wave** — propagation sees bit \`1\` → \`.ns:{ connSock … }\` block runs \`connSock\`
4. **\`on:raise\`** — when \`SOCKATTACHED(upN)\` goes to \`1\`, reset the bit to \`0\`

No need for \`.ns:{ … }\` **inside** \`on:1\` — only pin writes / wire assignments there.

\`\`\`logts
4wire readyToConnectToInst : 0000

.ns:{ connSock -> up2
  target = 0010
  port = 0010
  set = readyToConnectToInst.0 }
.ns:{ connSock -> up3
  target = 0011
  port = 0011
  set = readyToConnectToInst.1 }
.ns:{ connSock -> up4
  target = 0100
  port = 0100
  set = readyToConnectToInst.2 }
.ns:{ connSock -> up5
  target = 0101
  port = 0101
  set = readyToConnectToInst.3 }

on:1 {
  client2wantsToJoin,
  readyToConnectToInst.0 = 1
}
on:raise {
  SOCKATTACHED(up2),
  readyToConnectToInst.0 = 0
}
\`\`\`

| Step | Who | What |
|------|-----|------|
| 1 | **Server** Inst 1 | **Run** — waits idle, no error |
| 2 | **Client** Inst 2 | \`openSock\` + JOIN packet to Inst 1 (\`target = 0001\`) |
| 3 | Server (wave) | bit \`readyToConnectToInst.0 = 1\` → \`connSock\` |
| 4 | Both | CHAT on socket uplink; lines on packet downlink |

The client must call **\`openSock\`** before \`connSock\` can succeed — but that happens on the client tab, not before **Run** on the server.

## Protocol — \`.chatFrame\` / \`.chatParse\`

Uplink frames: fixed header + **bit-length** prefix + body (\`lengthOf\` on encode, \`withLength(..., nbytes b)\` on parse where \`nbytes\` holds the bit count).

\`\`\`logts-play wave
inline [protocol] .chatFrame:
  def frameBody:
    body ~b
  out:
    kind 8b
    clientId 8b
    lengthOf(frameBody) 8b
    frameBody
  :

inline [protocol] .chatParse:
  mode: parse
  parseView: tree
  out:
    kind 8b
    clientId 8b
    nbytes 8b
    withLength(body, nbytes b)
  :
\`\`\`

| \`kind\` | Meaning |
|--------|---------|
| \`00000001\` | **JOIN** — client connected (body empty) |
| \`00000010\` | **CHAT** — \`body\` is UTF-8 bits (\`^…\` hex literal) |

\`clientId\` is the 8-bit instance id (\`/instance/\` on the client).

### JOIN — packet to server (signaling)

The client opens the socket (producer), then notifies the server with a unicast **packet** (\`target = 0001\`), not with \`connSock\` on the server at Run:

\`\`\`logts
4wire myId : /instance/
.nc:{ openSock <- toSrv
  port = myId
  set = 1 }
.net:{ send = ^4A4F494E00000000
  target = 0001
  set = 1 }
\`\`\`

(\`^4A4F494E…\` = magic \`JOIN\` + padding in the 64b packet; the server parses and sets \`client2wantsToJoin\` / the bit in \`readyToConnectToInst\`.)

### CHAT — socket frame (after connect)

\`\`\`logts
40wire chat = .chatFrame { kind = \\2;8, clientId = myId, body = ^6869 }
toSrv << chat
\`\`\`

(\`^6869\` → ASCII \`hi\`.)

### Parse on server (consume socket)

\`\`\`logts
sock up2
40wire parsed =: .chatParse { data << up2 }
8wire kind = parsed:kind
8wire clientId = parsed:clientId
16wire body = parsed:body
\`\`\`

\`data << up2\` **consumes** parsed bits from the socket (see [sock.md](sock.md#protocol-parse-consume)).

---

## \`SOCKATTACHED(sock)\`

Returns **\`1\`** while the sock is live on the bus; **\`0\`** after \`closeSock\`, peer **Stop**, or unregister.

Server hub: poll \`SOCKATTACHED(upN)\` — edge \`1 → 0\` means client **left** → broadcast \`*client N left*\` and clear join state.

\`\`\`logts-play wave
comp [network] .ns:
  channel: 'chat-demo'
  on: 1
  :
sock up2
.ns:{ connSock -> up2
  target = 0010
  port = 0010
  set = 1 }
1wire live = SOCKATTACHED(up2)
show(live)
\`\`\`

Run **openSock** on Inst 2 (client) first, then the block above on Inst 1. Details: [network.md — Socket connections](network.md#socket-connections-shared-sock).

---

## Downlink line format (server)

One **136-bit** broadcast packet = one terminal line (ASCII in the payload). Prefix \`*\` for system messages. Use \`width: 136\` on every \`comp [network]\` in the demo (\`*client 2 joined*\` is 17 characters = 136 bits).

| Event | Example line (ASCII) |
|-------|----------------------|
| Join | \`*client 2 joined*\` |
| Chat | \`client2> hello\` |
| Leave | \`*client 2 left*\` |

\`\`\`logts
.net:send = "*client 2 joined*"
.net:set = 1
\`\`\`

(\`"*client 2 joined*"\` — 17 characters = 136 bits with \`width: 136\`.)

Client RX (top-level — property block OK):

\`\`\`logts
comp [network] .net:
  width: 136
  length: 8
  channel: 'chat-demo'
  on: 1
  :
136wire line = .net:get
.net:pop = 1
.net:set = 1
\`\`\`

Append \`line\` to [terminal](terminal.md) (ASCII tag \`; a\` on \`show\` if needed).

---

## Server script sketch (Inst 1)

\`logts-play wave\` — deferred \`connSock\` via \`readyToConnectToInst\`, JOIN on **packet**, CHAT on socket after connect. **Inst 2** fully wired below; duplicate the pattern for Inst 3–5 (\`up3\`, \`prefix3\`, …).

Inside **\`on:{ }\`**: pin writes (\`.net:send = …\`) or wire / bit assignments — **not** property blocks \`.ns:{ connSock … }\`. \`connSock\` blocks stay at **top level**, with \`set = readyToConnectToInst.N\`.

\`\`\`logts-play wave
MODE WIREWRITE
inline [protocol] .chatFrame:
  def frameBody:
    body ~b
  out:
    kind 8b
    clientId 8b
    lengthOf(frameBody) 8b
    frameBody
  :

inline [protocol] .chatParse:
  mode: parse
  parseView: tree
  out:
    kind 8b
    clientId 8b
    nbytes 8b
    withLength(body, nbytes b)
  :

comp [network] .net:
  width: 136
  length: 8
  channel: 'chat-demo'
  on: 1
  :

comp [network] .ns:
  width: 136
  length: 8
  channel: 'chat-demo'
  on: 1
  :

sock up2

4wire readyToConnectToInst : 0000
1wire client2wantsToJoin : 0
1wire seen2 : 0
1wire joinBroadcast : 0
136wire joinLine2 : "*client 2 joined*"
136wire leaveLine2 := "*client 2 left*"
136wire prefix2 : "client2> "
136wire chatLine : 0

.ns:{ connSock -> up2
  target = 0010
  port = 0010
  set = readyToConnectToInst.0 }

comp [terminal] .term:
  on: 1
  :

comp [osc] .poll:
  on: 1
  :

on:1 {
  AND(.poll:get, NOT(.net:empty)),
  client2wantsToJoin = 1,
  .net:pop = 1,
  .net:set = 1
}
on:1 {
  client2wantsToJoin,
  readyToConnectToInst.0 = 1,
  client2wantsToJoin = 0
}
on:raise {
  SOCKATTACHED(up2),
  readyToConnectToInst.0 = 0,
  joinBroadcast = 1
}
on:1 {
  AND(.poll:get, joinBroadcast),
  joinBroadcast = 0,
  .net:send = joinLine2,
  .net:set = 1,
  .term:append = joinLine2,
  .term:newline = 1,
  .term:set = 1,
  seen2 = 1
}
on:1 {
  AND(.poll:get, NOT(SOCKATTACHED(up2)), seen2),
  seen2 = 0,
  .net:send = leaveLine2,
  .net:set = 1,
  .term:append = leaveLine2,
  .term:newline = 1,
  .term:set = 1
}
on:1 {
  AND(.poll:get, SOCKATTACHED(up2), GT(BITSIZE(up2), 011111)),
  136wire parsed =: .chatParse { data << up2 },
  8wire kind = parsed:kind,
  1wire isChat = EQ(kind, \\2;8),
  chatLine := prefix2 + parsed:body,
  .net:send = chatLine,
  .net:set = isChat,
  .term:append = MUX(isChat, chatLine, 00000000),
  .term:newline = isChat,
  .term:set = isChat
}
\`\`\`

---

## Client script sketch (Inst 2–5)

Same script on every client tab; **\`4wire myInst : /instance/\`** at Run sets port and \`clientId\`.

\`\`\`logts-play wave
MODE WIREWRITE
inline [protocol] .chatFrame:
  def frameBody:
    body ~b
  out:
    kind 8b
    clientId 8b
    lengthOf(frameBody) 8b
    frameBody
  :

comp [network] .net:
  width: 136
  length: 8
  channel: 'chat-demo'
  on: 1
  :

comp [network] .nc:
  width: 136
  length: 8
  channel: 'chat-demo'
  on: 1
  :

4wire myInst : /instance/
sock toSrv
sock lineBuf

.nc:{ openSock <- toSrv
  port = myInst
  set = 1 }

.net:{ send = ^4A4F494E00000000000000000000000000
  target = 0001
  set = 1 }

comp [keyboard] .kbd:
  on: 1
  :

comp [key] .send:
  text: 'Send'
  on: 1
  :

comp [terminal] .inp:
  rows: 2
  columns: 40
  on: 1
  :

comp [terminal] .out:
  on: 1
  :

comp [osc] .poll:
  on: 1
  :

.inp:{
  append = .kbd
  set = .kbd:valid
}

on:1 {
  .kbd:valid,
  lineBuf << .kbd
}

on:1 {
  AND(.poll:get, NOT(.net:empty)),
  136wire line = .net:get,
  .out:append = line,
  .out:newline = 1,
  .out:set = 1,
  .net:pop = 1,
  .net:set = 1
}
on:1 {
  AND(.send:get, GT(BITSIZE(lineBuf), 0)),
  toSrv << .chatFrame { kind = \\2;8, clientId = myInst, body = lineBuf },
  lineBuf << clear,
  .inp:clear = 1,
  .inp:set = 1
}
\`\`\`

**Input buffer:** \`comp [keyboard]\` has no \`:buf\` — accumulate typed bytes in a **local** \`sock lineBuf\` (\`lineBuf << .kbd\` on \`:valid\`). On **Send**, append the frame directly: \`toSrv << .chatFrame { …, body = lineBuf }\` — do **not** assign to a fixed \`40wire\` (a 5-letter message is **64** bits total: 24-bit header + 40-bit body). Then \`lineBuf << clear\`.

**\`on:1\` rule:** pin writes only (\`.out:append = line\`, \`.out:set = 1\`) — **not** property blocks (\`.out:{ … }\`). See [conditional-assignment.md](conditional-assignment.md).

---

## Walkthrough (multi-tab)

1. Open **Inst 1** → load **server** sketch → **Run** (no clients — no error).
2. Open **Inst 2** → load **client** sketch → **Run** (\`openSock\` + JOIN packet); server connects \`up2\` via wave.
3. Open **Inst 3** with the same client script → **Run**.
4. Type on Inst 2, **Send** → CHAT on socket; lines on terminals via broadcast.
5. **Stop** Inst 2 → server: \`SOCKATTACHED(up2)=0\` → \`*client 2 left*\`.
6. **Win → Network Traffic** → Sockets.

---

## Limits (v1)

| Topic | v1 behaviour |
|-------|----------------|
| Body size | \`lengthOf\` in **8 bits** → max **255 bits** per frame (~31 ASCII bytes). Use \`16b\` prefix if you need longer messages. |
| Downlink socket | Not used — packets only |
| Fan-out one socket port | Not supported (see socket plan 1.4+a) |

---

## See also

- [sock.md](sock.md) — socket API, \`SOCKATTACHED\`, protocol consume
- [network.md](network.md) — \`send\`, broadcast, \`/instance/\`
- [protocol-assemble.md](protocol-assemble.md) — \`lengthOf\`, \`withLength\`
- [terminal.md](terminal.md) — hub display
- [keyboard.md](keyboard.md) — input buffer
`,
    'network-traffic-panel.md': `# Network Traffic panel

Open with **Win → Network Traffic**. The panel sits between **Timeline** and **Output** (same column as Output / Variables).

Use the **packets** / **sockets** toggle (left of **Pause**) to switch views. Each view has its own filters, pagination, pause/live state, and **Clear** scope.

## Packets view

The log is **global** — every \`send\` from all Run instances (1–5) in the page, not per tab. Backend keeps up to **200** entries; when full, the oldest **50** are trimmed. **Clear** empties the packet log only; the **Id** counter does **not** reset.

Each send gets a monotonic **packet id** (shown in the **Id** column). On the sender, \`.wifi:sendId\` returns the last id sent from that network component (binary). See [network.md — Packet ids and \`:sendId\`](network.md#packet-ids-and-sendid).

Bus semantics (\`comp [network]\`, channels, broadcast/unicast): [network.md](network.md). Editor run controls (**Run** / **Stop**, Inst slots): [editorUI.md](editorUI.md).

---

## Table columns (Packets)

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

## Sockets view

The **sockets** view logs **socket events** globally (all instances): \`Open\`, \`Connect\`, \`Append\`, \`Consume\`, and \`Close\`. Each row is one event; closed sessions stay visible via **Close** rows.

Backend keeps up to **500** entries; when full, the oldest **100** are trimmed. **Clear** empties the socket log only; the **Id** counter does **not** reset (independent from the packet log).

Socket connections (\`openSock\`, \`connSock\`, \`closeSock\`, stream \`<<\` on shared socks): [network.md — Socket connections](network.md#socket-connections-shared-sock).

### Table columns (Sockets)

| Column | Meaning |
|--------|---------|
| **Id** | Monotonic event id (socket log only) |
| **Event** | \`Open\` · \`Connect\` · \`Append\` · \`Consume\` · \`Close\` |
| **Source** | Run instance that originated the event |
| **SourceSock** | Sock name on the **Source** instance for this event |
| **Target** | Peer instance, or \`—\` when not connected (e.g. pre-connect **Append**) |
| **TargetSock** | Sock name on the **Target** instance, or \`—\` when no peer |
| **Channel** | Socket channel name |
| **Port** | Socket port number |
| **Size** | Bit length moved in this event (payload or close snapshot) |
| **Buf** | Shared buffer length after the event |
| **Status** | \`Open\` · \`Connected\` · \`Graceful\` · \`Abrupt\` |

**Click a row** to expand bit data on **Append**, **Consume**, and **Close** (same wrap rules as packet payload).

Pre-connect appends (producer buffer before \`connSock\`) log **Target** \`—\` and **Status** \`Open\`.

### Who closed? (\`Close\` rows)

Producer (\`openSock\`) and consumer (\`connSock\`) map to server/client roles. On a **Close** row:

| Column | Meaning on **Close** |
|--------|----------------------|
| **Source** | Instance that **initiated** the close (\`closeSock\` or **Stop** on that slot) |
| **Target** | Peer instance on the other end of the socket |
| **Status** | **How** the session ended — see table below |

| **Status** | Who / what | Typical **Source** |
|------------|------------|-------------------|
| **Graceful** | Consumer called \`closeSock\` (clean disconnect) | Consumer instance |
| **Abrupt** | Producer called \`closeSock\` | Producer instance |
| **Abrupt** | **Stop** on either instance (unregister tears down sockets) | Whichever instance was stopped |

**Reading the log:**

- **Graceful** → always the consumer (client) closed politely. **Source** = consumer, **Target** = producer.
- **Abrupt** → not always the producer — check **Source**:
  - **Source** = producer → producer \`closeSock\` or producer **Stop**
  - **Source** = consumer → consumer **Stop** without a graceful \`closeSock\`

**Status** = *how* (polite vs abrupt). **Source** = *who* triggered it. Compare **Source** with the earlier **Open** (producer) and **Connect** (consumer) rows on the same **Port** / **Channel** to see which role closed.

See also [network.md — \`closeSock\`](network.md#example-d--closesock-consumer-graceful) and Example D (consumer graceful close).

---

## Toolbar

| Control | Action |
|---------|--------|
| **packets** / **sockets** | Toggle view (cyan = packets, violet = sockets). Switching **pauses** the previous view and starts **Live** on the new one. |
| **Pause** / **Live** | Toggle live updates for the **active** view. In **Pause**, the title shows **Network Traffic (paused)**; new events are still logged but the table does not redraw until **Live**. |
| **Clear** | Empty the log for the **active** view only (packet or socket Ids keep counting) |

While **paused**, pagination and filters use a **frozen snapshot** of the log at pause time — page numbers do not shift when new events arrive in the background. **Live** refreshes to the current log.

---

## Pagination

- **5 rows** per page, newest first (Id descending).
- \`[ < ]\` \`[ > ]\` — previous / next page.
- Summary: \`Rows: X - Y . Shown N of Total\` (positions in the **filtered** list).

---

## Column filters

Click a column header to open the filter bar (\`>\` apply, \`x\` clear, **Esc** close). A column with an active filter has a **blue** header (the filter value is not shown in the header).

### Packets

| Column | Filter type | Examples |
|--------|-------------|----------|
| **Id** | Single id or range | \`23\` · \`1 - 20\` |
| **Source** | Single or range | \`2\` · \`1 - 5\` |
| **Target** | Single, range, or broadcast | \`*\` · \`2\` · \`1 - 3\` |
| **Size** | Single or range | \`8\` · \`128 - 200\` |
| **Channel** | Substring (case-insensitive) | \`demo\` |
| **Status** | Dropdown | \`Received\` · \`Dropped\` |

### Sockets

| Column | Filter type | Examples |
|--------|-------------|----------|
| **Id** | Single id or range | \`23\` · \`1 - 20\` |
| **Event** | Dropdown | \`Append\` · \`Close\` |
| **Source** | Single or range | \`2\` · \`1 - 5\` |
| **SourceSock** | Substring (case-insensitive) | \`chat\` · \`up\` |
| **Target** | Instance, range, or \`—\` | \`—\` · \`2\` · \`1 - 3\` |
| **TargetSock** | Substring (case-insensitive) | \`chat\` · \`srv\` |
| **Port** | Single or range | \`1\` · \`1 - 10\` |
| **Size** / **Buf** | Single or range | \`8\` · \`0 - 64\` |
| **Channel** | Substring (case-insensitive) | \`demo\` |
| **Status** | Dropdown | \`Connected\` · \`Graceful\` · \`Abrupt\` |

Numeric filters accept \`23\` or \`1 - 20\` (spaces around \`-\` optional; reversed ranges work). Invalid text matches nothing.

Filters combine (AND). One active filter per column.

---

## Related behaviour

- **Stop** on a Run instance unregisters its network endpoints; open sockets on that instance close as **Abrupt**. **Stop** does not clear either traffic log.
- Packet traffic is logged on every \`send\` attempt, including **Dropped** (no receiver, RX full, or unicast to a missing instance).
- \`probe\` on a receiving instance is refreshed when a packet arrives — see [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network).

---

## Related

- [network.md](network.md) — \`comp [network]\` component and socket connections
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
- Cannot assign directly to \`.net\`; use \`:send\`, \`:pop\`, \`:clear\`, socket pins (\`openSock\`, \`connSock\`, \`closeSock\`, \`port\`), and \`:set\`.
- \`send\` + \`pop\` in the same property block → conflict (like queue \`push\` + \`pop\`).
- Socket ops (\`openSock\` / \`connSock\` / \`closeSock\`) cannot mix with FIFO ops (\`send\` / \`pop\` / \`clear\`) in one block.

---

## Network Traffic panel

Every \`send\` is logged globally (all instances). Socket lifecycle and data ops (\`Open\`, \`Connect\`, \`Append\`, \`Consume\`, \`Close\`) are logged separately in the **sockets** view. Open **Win → Network Traffic** and toggle **packets** / **sockets**. Packet **Id** uses the same global ids as \`:sendId\` on the sender (see [Packet ids and \`:sendId\`](#packet-ids-and-sendid)).

Full panel documentation: [network-traffic-panel.md](network-traffic-panel.md).

---

## \`probe\` on another instance

\`probe(.wifi:get)\` on the **receiving** instance does not update from wire propagation when a packet arrives from another tab — the bus is outside the simulation graph. The editor **re-reads** probes when a packet is delivered (and when you switch to that tab). Probe history keeps earlier lines (\`initialised\`) and appends \`changed\` when the value updates.

See [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network) for a comparison table and a two-tab walkthrough.

---

## Socket connections (shared \`sock\`)

Cross-instance **bitstream** between Run instances on the same \`channel\` — distinct from the packet FIFO (\`send\` / \`get\` / \`pop\`). A local [\`sock\`](sock.md) aliases a **shared buffer** in the network bus after bind.

| Pin / bind | Syntax | Role |
|------------|--------|------|
| \`openSock\` | **\`openSock <- chat\`** | Producer — publishes local \`chat\` on \`port\` |
| \`connSock\` | **\`connSock -> chat\`** | Consumer — connects to remote \`(target, port)\` |
| \`port\` | 8 bit (\`1..255\`) | Port number on the producer instance |
| \`closeSock\` | \`closeSock = 1\` | Tear down connection on \`port\` (bilateral) |

Use **\`=\`** for \`port\`, \`target\`, \`set\`, \`closeSock\`; use **\`<-\` / \`->\`** only for sock binds (not assignments).

**Precondition:** \`BITSIZE(sock) === 0\` at \`openSock\` / \`connSock\`.

**Buffer before connect:** producer may \`chat << …\` after \`openSock\` before the consumer calls \`connSock\`; the consumer sees accumulated bits immediately at connect.

### Permissions (connected)

| Role | Append (\`sock <<\`) | Consume (\`wire << sock./N\`) | Clear (\`sock << clear\`) | Peek / \`BITSIZE\` / \`show\` / \`probe\` |
|------|-------------------|-----------------------------|-------------------------|-------------------------------------|
| **Producer** (\`openSock <-\`) | yes | error | error | always |
| **Consumer** (\`connSock ->\`) | error | yes | error | always |

After **\`closeSock\`**: both ends **detached**; producer sock cleared; consumer keeps a **local snapshot**; reconnect requires \`BITSIZE(sock) === 0\` on both sides (\`chat << clear\` allowed only when detached).

In **Win → Network Traffic** (view **sockets**), each close is logged as **Close**. Consumer \`closeSock\` → **Graceful**; producer \`closeSock\` or **Stop** on either instance → **Abrupt**. **Source** on the **Close** row is the instance that initiated the close — see [network-traffic-panel.md — Who closed?](network-traffic-panel.md#who-closed-close-rows).

One socket operation per property block (\`openSock\` / \`connSock\` / \`closeSock\` / \`send\` / \`pop\` / \`clear\` are mutually exclusive).

### Example A — producer (single instance)

\`\`\`logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ openSock <- chat
  port = 1
  set = 1 }

chat << ^41
show(BITSIZE(chat))
probe(chat)
\`\`\`

### Example B — consumer with \`on:1\` (wave)

Run **Inst 1** (Example A) then **Inst 2** on the same \`channel\`.

\`\`\`logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat
8wire byte : 0
1wire go : 0

.net:{ target = 1
  connSock -> chat
  port = 1
  set = 1 }

on:1 {
  AND(go, GT(BITSIZE(chat), 111)),
  byte << chat./8
}

go = 1
show(byte; u8)
\`\`\`

### Example C — buffer pre-connect

Inst 1: \`openSock\` + \`chat << ^41\`. Inst 2: \`connSock\` → \`BITSIZE(chat) = 8\` immediately.

### Example D — \`closeSock\` (consumer, graceful)

Consumer disconnect: traffic log shows **Close**, **Source** = this instance, **Target** = producer, **Status** **Graceful**. Details: [network-traffic-panel.md — Who closed?](network-traffic-panel.md#who-closed-close-rows).

\`\`\`logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ target = 1
  connSock -> chat
  port = 1
  set = 1 }

.net:{ closeSock = 1
  port = 1
  set = 1 }

show(BITSIZE(chat))
\`\`\`

### Example E — FIFO drain alternative (no socket mode)

Manual bridge from RX FIFO into a local sock — works today without socket pins:

\`\`\`logts-play wave
comp [network] .net:
  width: 8
  length: 8
  channel: 'sock-demo'
  on: 1
  :

sock rx
1wire drain : 0

on:1 {
  AND(drain, NOT(.net:empty)),
  rx << .net:get,
  .net:{ pop = 1
    set = 1 }
}

drain = 1
show(BITSIZE(rx))
probe(rx)
\`\`\`

See also: [\`sock.md\`](sock.md) — local buffer semantics and protocol consume.

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
| \`afterSettle\`| flag  | -   | -   | (off)   | Post-settle timing mode — see below |
| \`delay0\`     | number| >0  | -   | 4       | With \`afterSettle\`: wait after LOW phase settles (see \`delayIsSec\`) |
| \`delay1\`     | number| >0  | -   | 4       | With \`afterSettle\`: wait after HIGH phase settles |
| \`delayIsSec\` | int   | 0   | 1   | 0       | \`0\` = inverse seconds (\`delay: 10\` → 100ms); \`1\` = seconds |

### Mod \`afterSettle\` (post-propagare)

By default the oscillator uses **\`freq\`** + **\`duration0\`/\`duration1\`** (real-time wall clock).

Add the flag **\`afterSettle\`** on its own line (no value — like \`onlyDigits\` on keyboard). When present:

- **\`freq\`**, **\`duration0\`**, **\`duration1\`**, **\`freqIsSec\`** are **ignored**
- Phase waits use **\`delay0\`** (LOW) and **\`delay1\`** (HIGH) **after wave propagation settles**
- Timer starts only after \`scheduleComponentOutputChange\` → \`propagate()\` completes

**Syntax:**

\`\`\`
comp [~] .clk:
  afterSettle
  delay0: 10
  delay1: 10
  delayIsSec: 0
  :
\`\`\`

**\`delayIsSec\`** (parallel to \`freqIsSec\`):

| delayIsSec | Meaning | Example |
|------------|---------|---------|
| **0** (default) | \`delay\` = inverse fraction of second | \`delay0: 10\` → 100ms; \`delay0: 2\` → 500ms |
| **1** | \`delay\` = seconds | \`delay1: 5\` → 5 seconds |

\`afterSettle: 1\` is invalid — use bare \`afterSettle\`.

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

---

## Related

- [signal-propagation.md](signal-propagation.md) — component → wire propagation in wave mode
- [counter.md](counter.md) — separate \`comp [counter]\` for scan indices (Huffman v2)
- [huffman-v2.md](huffman-v2.md) — \`comp [osc]\` or [switch](switch.md) as scan clock
- [switch.md](switch.md) — manual tick when you do not want real-time osc
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
  on: raise/edge/1
  # body — assignments, comp, def, chip, nested pcb
  :Nbit returnVar
\`\`\`

| Part | Meaning |
|------|---------|
| \`pcb +[name]:\` | Define a new PCB type (top-level only) |
| \`Npin\` / \`Npout\` | Input / output ports exposed on instances |
| \`exec: pinName\` | Which pin fires property blocks (default \`set\`) |
| \`on: mode\` | When the block runs: \`raise\`, \`edge\`, or \`1\` |
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
    'protocol-assemble.md': `# Protocol — assemble (encode)

Build bitstreams from named parameters. Default \`mode: assemble\` (implicit).

Hub: [protocol.md](protocol.md). Related: [protocol-parse.md](protocol-parse.md) (decode stream), [protocol-lut.md](protocol-lut.md) (\`expand\` / \`collapse\`), [\`:decode\`](protocol-assemble.md#decodechannels).

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
| \`mode\` | \`assemble\` (default), \`parse\` |
| \`parseResult\` | \`all\` (default), \`collapseOnly\` — **parse mode only** |
| \`codebookLoad\` | inline LUT name (e.g. \`.huff\`) — **parse mode only** |

\`clockType: lowFirst\` → \`01010101…\`

\`clockType: highFirst\` → \`10101010…\`

\`mode: parse\` — read from invoke param \`data\` / \`stream\` instead of assembling from params. See [protocol-parse.md](protocol-parse.md).

\`parseResult\` and \`codebookLoad\` are documented in detail under [Parse-only attributes](protocol-parse.md#parse-only-attributes).

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
| \`repeat(pattern, Nb)\` | \`repeat(0101, 8b)\` | pattern tiled to total width \`Nb\` |
| \`repeat bit Nb\` | \`repeat 0 8b\` | single-bit shorthand (same as \`repeat(0, 8b)\`) |

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

\`Nb\` is the **total output width** in bits. The pattern is tiled left-to-right until exactly \`Nb\` bits are produced — so \`Nb\` must be a multiple of the pattern length.

\`\`\`logts-play
inline [protocol] .rep0:
  out:
    repeat 0 4b
  :

inline [protocol] .rep1:
  out:
    repeat 1 4b
  :

inline [protocol] .repPat:
  out:
    repeat(0101, 8b)
  :

4wire zeros = .rep0 { }
4wire ones  = .rep1 { }
8wire pat   = .repPat { }
show(zeros)
show(ones)
show(pat)
\`\`\`

\`repeat 0 4b\` → \`0000\`, \`repeat 1 4b\` → \`1111\`, \`repeat(0101, 8b)\` → **\`01010101\`** (pattern length 4, tiled twice).

Parameter pattern:

\`\`\`logts-play
inline [protocol] .repSync:
  out:
    repeat(sync 4b, 16b)
  :

16wire out = .repSync { sync = 1010 }
show(out)
\`\`\`

→ **\`1010101010101010\`**.

| Error | Cause |
|-------|-------|
| \`repeat: output width Nb is not a multiple of pattern length M\` | e.g. \`repeat(010, 8b)\` (3 does not divide 8) |
| \`Protocol decode failed: expected repeat pattern '...'\` | Wire does not match tiled pattern |

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



Parse-side \`withLength\` variants (\`withLength(rest, field b)\`, \`withLength(stream, Nb, def)\`) — [protocol-parse.md](protocol-parse.md#withlength-parse).


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

## \`checksum\` / \`validateChecksum\` (CRC-16-CCITT)

Append or verify a **16-bit CRC** over a preceding body segment. Algorithm: CRC-16-CCITT (polynomial \`0x1021\`, init \`0xFFFF\`), computed over the body bitstream (padded to byte boundary).

| Generator | Mode | Syntax | Effect |
|-----------|------|--------|--------|
| \`checksum\` | assemble | \`checksum(crc16, defName)\` or \`checksum(crc16, param)\` | Append 16-bit CRC of body bits |
| \`validateChecksum\` | parse | \`validateChecksum(crc16, param)\` | Verify last 16 bits of **full** invoke param match CRC of preceding bits |

Scope for **\`checksum\`**: CRC over the referenced def/param body only. For **\`validateChecksum\`**: \`param\` is the **entire packet** passed at invoke (\`data\`); CRC is the last 16 bits, body is everything before that (same bits the cursor walked, plus any unread tail — typically the whole packet minus CRC).

### Runnable — encode + verify

\`\`\`logts-play
inline [protocol] .pktCs:
  def body:
    data 8b
  out:
    body
    checksum(crc16, body)
  :

inline [protocol] .verifyCs:
  mode: parse
  out:
    validateChecksum(crc16, data)
  :

24wire pkt = .pktCs { data = 10101010 }
1wire ok = .verifyCs { data = pkt }

show(pkt)
show(ok)
\`\`\`

Body \`10101010\` + CRC suffix → 24-bit packet. Verify succeeds silently (empty output channel).

| Error | Cause |
|-------|-------|
| \`validateChecksum: mismatch (expected ..., got ...)\` | Corrupt or truncated packet |
| \`validateChecksum: input shorter than checksum field\` | Fewer than 16 bits after body |
| \`checksum body '...' is not a local def or parameter\` | Invalid def reference in encode |

## Not included (planned)

These generators are **not** implemented in v2:

| Planned | Purpose |
|---------|---------|
| \`concat(...)\` | Concatenate arbitrary segment expressions |
| \`padLeft(param, Nb)\` | Left-pad parameter to width |
| \`padRight(param, Nb)\` | Right-pad parameter to width |

Use literals, \`def\` blocks, and existing generators for now.



---

## Related

- [protocol.md](protocol.md) — hub, feature matrix, \`doc()\`
- [protocol-parse.md](protocol-parse.md) — \`mode: parse\`, \`validateChecksum\`
- [protocol-lut.md](protocol-lut.md) — \`expand\` / \`collapse\`
- [lut.md](lut.md) — inline LUT tables
`,
    'protocol-lut.md': `# Protocol — LUT transforms (\`expand\` / \`collapse\`)

Map token streams through an [inline LUT](lut.md) in both directions. Used for Huffman-style encode/decode.

Hub: [protocol.md](protocol.md). Full walkthrough: [huffman.md](huffman.md). Self-contained packet SC: [huffman-v2.md](huffman-v2.md).

---

## \`expand\` / \`collapse\` with LUT

Map a token stream through an [inline LUT](lut.md) in both directions.

| Generator | Syntax | Direction |
|-----------|--------|-----------|
| \`expand\` | \`expand(param, .lut, keyWidth)\` or \`expand(param, .lut, keyWidth b)\` | Concatenate \`keyWidth\`-bit keys → LUT values |
| \`collapse\` | \`collapse(param, .lut, keyWidth)\` or \`collapse(param, .lut, keyWidth b)\` | Split value stream → keys (fixed-depth LUT) or greedy prefix match ([\`prefixFree\`](lut.md#prefixfree) LUT) |

\`keyWidth\` may be a fixed width (\`2b\`, \`8b\`) or a **parameter/field name** (\`keyWidth b\`) whose value at invoke/parse time sets the key width dynamically (Faza 0c — Huffman packet SC).

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

### Runnable — dynamic \`keyWidth b\`

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

inline [protocol] .encKw:
  def encoded:
    expand(tokens, .huff, keyWidth b)
  out:
    encoded
  :

inline [protocol] .decKw:
  out:
    collapse(withLength(data, 8b), .huff, keyWidth b)
  :

9wire out = .encKw { tokens = 00011011, keyWidth = 00000010 }
8wire back = .decKw { data = 00001001010110111, keyWidth = 00000010 }

show(out)
show(back)
\`\`\`

\`keyWidth = 2\` → encode **\`010110111\`**, decode back to **\`00011011\`**.

Input to \`expand\` must be a multiple of \`keyWidth\` (fixed or dynamic).

| Error | Cause |
|-------|-------|
| \`expand input length N is not a multiple of keyWidth M\` | Token stream not aligned |
| \`collapse failed: no LUT entry for value '...'\` | Value not in table (fixed-depth) |
| \`prefixFree collapse failed at bit offset N\` | No valid prefix at position |


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

## Related

- [protocol-assemble.md](protocol-assemble.md) — \`length\` / \`lengthOf\` / \`withLength\` encode
- [protocol-parse.md](protocol-parse.md) — \`collapse\` in \`mode: parse\`, \`codebookLoad\`
- [huffman.md](huffman.md) — packet layout and round-trip trace
- [huffman-v2.md](huffman-v2.md) — \`.huffRecoverSC\` self-contained recover
- [lut.md](lut.md) — \`prefixFree\`, \`variableDepth\`
`,
    'protocol-parse.md': `# Protocol — \`mode: parse\`

Sequential **field extraction** from a bitstream. The parse cursor walks \`data\` (or \`stream\`) and verifies literals, reads fields, and optionally builds a **parseView** tree.

Hub: [protocol.md](protocol.md). Related: [protocol-tentative.md](protocol-tentative.md), [protocol-repeat.md](protocol-repeat.md).

---

## Invoke

\`\`\`logts-play legacy
inline [protocol] .parseHdr:
  mode: parse
  out:
    magic 8b
    len 16b
  :

24wire out = .parseHdr { data = 01001000 + 00000000 + 00010000 }
show(out)
\`\`\`

| Parameter | Role |
|-----------|------|
| \`data\` | Full packet bitstream (default) |
| \`stream\` | Alias for \`data\` in some generators |

Output wire width may be **dynamic** when sections repeat or use \`rest ~\`. Use \`=:\` when the declared wire is wider than extracted fields.

### Parse from sock

When \`data\` (or \`stream\`) is a **sock** reference:

| Invoke | Behaviour |
|--------|-----------|
| \`{ data = rx }\` | **Peek** — parse uses a snapshot; sock length unchanged |
| \`{ data << rx }\` | **Consume** — each protocol \`read\` cuts from the sock front; on parse error the sock is restored (transaction) |

\`\`\`logts-play wave
inline [protocol] .parseHdr:
  mode: parse
  parseView: tree
  out:
    01001000
    opcode 4b
    len 8b
  :

sock rx
rx << 0100100010101100000111110000
12wire hdr =: .parseHdr { data << rx }
show(BITSIZE(rx))
show(hdr:opcode)
\`\`\`

Wire arguments still use \`{ data = packet }\` only. See [sock.md — Protocol + sock](sock.md#protocol--sock) for the Wave streaming pattern.

---

## Literals vs fields

| Line in \`def\` / \`out\` | Parse behaviour |
|-----------------------|-----------------|
| \`0101\` | Verify bits; **not** in output blob |
| \`kind 8b\` | Read 8 bits into field \`kind\`; **in** output blob |
| \`rest ~\` | Consume all remaining bits (last segment only) |
| \`rest -4b\` | Consume \`remaining − 4\`, leave footer |

---

## Wire literals in parse protocol

Protocol lines accept a **subset** of [wire-literals.md](wire-literals.md):

| Form | Example | Notes |
|------|---------|-------|
| Binary | \`01010101\` | as today |
| Wire string | \`"true"\`, \`"{"\`, \`'x'\` | 8 bits per character |
| Decimal pad | \`\\123;8\` | unsigned, fixed width |
| Hex pad | \`^7B;8\` | pad to width |
| Hex short | \`^7B\` | minimal width (no pad) |
| Decimal short | \`\\10\` | minimal unsigned width |

\`\`\`logts-play legacy
inline [protocol] .litDemo:
  mode: parse
  out:
    "Hi"
  :

16wire chk =: .litDemo { data = 01001000 + 01101001 }
show(chk)
\`\`\`

Use **local \`def\` wrappers** for tentative string choice (\`trueLit?\` / \`falseLit?\`) — literal lines cannot take \`?\` directly.

---

## Attributes (parse)

| Attribute | Values | Purpose |
|-----------|--------|---------|
| \`parseView\` | \`tree\`, \`true\` | Structured \`show()\` + \`wire:section:field\` access |
| \`parseResult\` | \`all\`, \`collapseOnly\` | Include/exclude collapse payload in output |
| \`codebookLoad\` | \`.lutName\` | Load LUT from embedded codebook during parse |

---

## \`mode: parse\` — overview

By default protocols **assemble** bits from parameters (\`mode: assemble\`, implicit). Set **\`mode: parse\`** to read from an input bitstream instead.

| Aspect | assemble (default) | parse |
|--------|-------------------|-------|
| Direction | params → wire | wire → extracted fields |
| Field syntax | \`data 8b\` = emit param | \`data 8b\` = read 8 bits from stream |
| Literals | emit fixed bits | verify bits on wire |
| Invoke param | supply field values | supply \`data\` or \`stream\` bitstring |
| Output | concatenated channel bits | concatenated parsed field bits |

Recovery protocols (Huffman SC, checksum verify) use \`mode: parse\`. **\`:decode()\` is unchanged** — it only reverses simple assemble protocols; use a dedicated parse protocol instead.

### Runnable — parse header fields

\`\`\`logts-play
inline [protocol] .parseHdr:
  mode: parse
  out:
    01001000
    keyWidth 8b
    nSym 8b
  :

16wire out = .parseHdr { data = 010010000000100000000011 }
show(out)
\`\`\`

Magic \`'H'\` (\`01001000\`) verified; output = **\`keyWidth\` + \`nSym\`** → \`0000100000000011\`.

| Error | Cause |
|-------|-------|
| \`parse: expected literal '...' but received '...'\` | Magic or fixed field mismatch |
| \`parse: need N bits but only M remain\` | Truncated input |
| \`Parse protocol requires 'data' parameter\` | Missing invoke argument |

### \`stream\` vs \`data\` — the parse cursor

In **\`mode: parse\`**, you do **not** declare a \`stream\` wire in your script. At invoke time:

\`\`\`logts
32wire recovered = .myParseProto { data = packet }
\`\`\`

the engine wraps \`packet\` in an internal **ParseStream** (a read cursor over the bitstring). Each segment in \`out:\` runs **in order** and advances that cursor.

| Name | Where | Meaning |
|------|-------|---------|
| **\`data\`** | Invoke argument \`{ data = packet }\` | The **full input bitstring** (the whole packet). Alias: \`{ stream = packet }\` — same thing at invoke. |
| **\`stream\`** | Inside protocol segments (\`withLength(stream, 16b, entry)\`) | **Reserved keyword** — “read from the **current cursor**”, not a script parameter. |
| **\`data\`** | Inside some segments (\`validateChecksum(crc16, data)\`) | The **full invoke argument** again — used when a check needs the entire packet, not just unread tail. |

Think of it like a file pointer:

\`\`\`text
data = packet (123 bit)                    cursor →
[···························································································]
 ↑ pos=0

out: 01001000           → verify 8 bit,           pos += 8
     keyWidth 8b        → read 8 bit,             pos += 8
     nSym 8b            → read 8 bit,             pos += 8
     codebook           → withLength(stream, 16b, entry): read 16b len + body, pos += 16+53
     validateChecksum(crc16, data)  → CRC over **whole** packet (ignores cursor)
     collapse(withLength(stream, 8b), …) → read payload len + bits from cursor, decode
\`\`\`

**\`withLength(stream, Nb, def)\`** — from the cursor: read \`Nb\`-bit length, fork a sub-stream of that many bits, parse \`def\` repeatedly until the sub-stream is exhausted (used for codebooks).

**\`withLength(rest, field b)\`** — from the cursor: read exactly as many bits as the **already-parsed field** \`field\` says (used for variable-length codewords).

Segments such as \`keyWidth 8b\` also read from the cursor — you never pass \`keyWidth\` at invoke; it is **extracted** from the wire.

### Parsed fields (\`sym 8b\`, \`cwLen 8b\`, …)

In **\`mode: parse\`**, a line like \`sym 8b\` inside a \`def\` or \`out:\` channel is a **parse field**, not an invoke parameter:

| Syntax | Assemble | Parse |
|--------|----------|-------|
| \`data 8b\` | emit 8 bits from invoke arg \`data\` | read 8 bits from cursor into field \`data\` |
| \`payload ~b\` | emit all bits from var-width arg | read **remaining** bits in current region (\`~b\`) |
| \`codebook\` (bare def name) | expand \`def codebook\` segments | parse \`def codebook\` against cursor |

Fields parsed earlier in the same \`def\` can drive later segments — e.g. \`cwLen 8b\` then \`withLength(rest, cwLen b)\` reads exactly \`cwLen\` bits into \`rest\`.

**\`codebookLoad\`** hooks each completed \`withLength(..., entry)\` row: \`.lut:add(sym, rest)\` using those field values.

**\`nSym\` check:** after the codebook region, if header field \`nSym\` was parsed and at least one entry was loaded, entry count must equal \`nSym\` or parse throws.


### Parse-only attributes

Used with **\`mode: parse\`** on the protocol block (before \`out:\`).

#### \`parseResult: all | collapseOnly\`

Controls **what bits** the protocol invoke returns as its output wire. Parsing still runs in full (literals verified, fields read, checksum checked); only the **returned blob** is filtered.

| Value | Default | Output wire contains |
|-------|---------|----------------------|
| \`all\` | yes | Concatenation of every segment that produces bits: parsed fields (\`keyWidth 8b\`, …), \`withLength\`/\`def\` regions, **\`collapse\`** result, etc. Literals and \`validateChecksum\` contribute nothing. |
| \`collapseOnly\` | no | Only bits from **\`collapse(...)\`** segments. Header, codebook body, CRC verification — parsed/consumed but **not** included in the returned wire. |

Use **\`collapseOnly\`** for recover/decode protocols where the caller wants the **decoded payload only** (e.g. Huffman tokens), not a dump of every parsed field.

Default without attribute = \`all\`.

#### \`codebookLoad: .lut\`

Side-effect during parse: before reading the stream, **clear** the named writable inline LUT, then on each \`withLength(..., def)\` codebook entry call **\`.lut:add(sym, codeword)\`** (via internal \`onParseEntry\`). Enables recover without a pre-filled codebook — the packet carries its own LUT.

Requires a **writable** inline LUT (\`writable\` attribute). See [huffman-v2.md — \`.huffRecoverSC\`](huffman-v2.md#recover--huffrecoversc-faza-3).

#### Runnable — \`parseResult: all\` vs \`collapseOnly\`

**\`all\` (default)** — output = bits from parsed fields (\`keyWidth\`, \`nSym\`, …):

\`\`\`logts-play
inline [protocol] .parseHdr:
  mode: parse
  out:
    01001000
    keyWidth 8b
    nSym 8b
  :

16wire fields = .parseHdr { data = 010010000000100000000011 }
show(fields)
\`\`\`

→ \`fields\` = \`0000100000000011\` (8 + 8 bit, fără magic).

**\`collapseOnly\`** — același parse, dar wire-ul returnat conține **doar** rezultatul segmentelor \`collapse(...)\`. Header, codebook, \`validateChecksum\` rulează, dar nu apar în output. Exemplu complet: [\`.huffRecoverSC\`](huffman-v2.md#recover--huffrecoversc-faza-3) — \`32wire recovered\` = tokenii decodați (\`aacb\`), nu cei 123 bit ai packetului.

Dacă protocolul parse **nu** are niciun \`collapse\`, \`collapseOnly\` produce un wire **gol** (0 bit).

## \`withLength\` (parse)

### \`withLength(rest, field b)\` — width from a parsed field

When the length is not a fixed prefix but comes from a field parsed earlier in the same \`def\`, use the field name instead of \`Nb\`:

\`\`\`logts
def entry:
  sym 8b
  cwLen 8b
  withLength(rest, cwLen b)
\`\`\`

Reads exactly \`cwLen\` bits (value of the \`cwLen\` field) into \`rest\`. No length prefix on the wire.

### \`withLength(data, Nb, def)\` — repeated parse until sub-stream exhausted

In **\`mode: parse\`**, read an \`Nb\`-bit length prefix, then parse \`def\` repeatedly until the sub-stream is consumed. Used for variable-length codebooks (see [huffman-v2.md](huffman-v2.md)).

\`\`\`logts-play
inline [protocol] .parseEntry:
  mode: parse
  def entry:
    sym 8b
    cwLen 8b
    withLength(rest, cwLen b)
  out:
    withLength(data, 16b, entry)
  :
\`\`\`

| Error | Cause |
|-------|-------|
| \`withLength: def '...' consumed no bits\` | Empty or malformed entry in repeated parse |
| \`withLength: def '...' left N bits unconsumed\` | Entry def did not consume full sub-stream |
| \`parse: field 'cwLen' is not set\` | \`withLength(rest, cwLen b)\` before \`cwLen\` was parsed |

## Complex example — \`.huffRecoverSC\`

Full **parse** protocol for self-contained Huffman packet SC — cursor, \`def\`/\`withLength\`, \`codebookLoad\`, \`validateChecksum\`, \`collapse\`, \`parseResult: collapseOnly\`.

**Runnable definition, wire layout, and step-by-step cursor mapping:** [huffman-v2.md — Packet SC / \`.huffRecoverSC\`](huffman-v2.md#recover--huffrecoversc-faza-3).

Short invoke (packet must be built separately):

\`\`\`logts-play legacy
123wire packet = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
32wire recovered = .huffRecoverSC { data = packet }
peek(recovered; ascii)
\`\`\`

## \`rest ~\` and \`rest -Nb\`

| Syntax | Meaning |
|--------|---------|
| \`rest ~\` | consume **all** bits until EOF — only as **last** segment of the protocol |
| \`rest -4b\` | consume \`remaining − 4\`, leave 4 bits for a fixed suffix (e.g. footer \`1111\`) |

\`\`\`logts-play
inline [protocol] .restFoot:
  mode: parse
  def ipv4:
    0100
    src 32b
  def ethernet:
    ipv4?
    unknown?:
      rest -4b
  out:
    0000
    ethernet
    1111
  :

32wire out = .restFoot { data = 0000 + 0100 + repeat(1,32) + 1111 }
show(out)
\`\`\`

Tentative choice around \`rest\` — [protocol-tentative.md](protocol-tentative.md).

---

## \`checksum\` / \`validateChecksum\` (CRC-16-CCITT)

Append or verify a **16-bit CRC** over a preceding body segment. Algorithm: CRC-16-CCITT (polynomial \`0x1021\`, init \`0xFFFF\`), computed over the body bitstream (padded to byte boundary).

| Generator | Mode | Syntax | Effect |
|-----------|------|--------|--------|
| \`checksum\` | assemble | \`checksum(crc16, defName)\` or \`checksum(crc16, param)\` | Append 16-bit CRC of body bits |
| \`validateChecksum\` | parse | \`validateChecksum(crc16, param)\` | Verify last 16 bits of **full** invoke param match CRC of preceding bits |

Encode side (\`checksum\`) — [protocol-assemble.md](protocol-assemble.md#checksum--validatechecksum-crc-16-ccitt).

### Runnable — verify on parse

\`\`\`logts-play
inline [protocol] .pktCs:
  def body:
    data 8b
  out:
    body
    checksum(crc16, body)
  :

inline [protocol] .verifyCs:
  mode: parse
  out:
    validateChecksum(crc16, data)
  :

24wire pkt = .pktCs { data = 10101010 }
1wire ok = .verifyCs { data = pkt }

show(pkt)
show(ok)
\`\`\`

Body \`10101010\` + CRC suffix → 24-bit packet. Verify succeeds silently (empty output channel).

| Error | Cause |
|-------|-------|
| \`validateChecksum: mismatch (expected ..., got ...)\` | Corrupt or truncated packet |
| \`validateChecksum: input shorter than checksum field\` | Fewer than 16 bits after body |
| \`checksum body '...' is not a local def or parameter\` | Invalid def reference in encode |

---

## \`execStmts\` (secondary parse)

The editor runs the full script once at **Run**. The **test harness** also supports \`execStmts(interp, src)\` — append extra top-level statements against the **same** interpreter (e.g. Huffman FSM ticks, then encode).

Requirements:

| Topic | Detail |
|-------|--------|
| Inline instances | Must already exist from the initial \`run()\` (\`inline [protocol] .huffPacket:\` etc.) |
| Parser disambiguation | \`{ }\` after \`.name\` is protocol if the instance is \`protocol\`, asm if \`asm\`. Secondary parse **seeds** kinds from \`inlineInstances\` — otherwise \`.huffPacket { tokens = source }\` is misparsed as asm and throws *not an asm ISA* |
| Wave session | After exec, \`propagate()\` runs so wires like \`16wire lb = .links:get(…)\` see fresh LUT data |

Example (after FSM + walk via \`execStmts\`):

\`\`\`logts
64wire packet =: .huffPacket { tokens = source }
32wire recovered = .huffRecover { data = packet }
\`\`\`

Tests **2128** (round-trip), **2116** (walk only). Wrong kind error: *Inline instance '.foo' is a protocol, not an asm ISA; use .foo { param = ... }*.

---

## Section repeat

For \`packet[n]\`, \`packet*\`, anchor footers, and \`parsed:packet:0:field\`, see **[protocol-repeat.md](protocol-repeat.md)**.

---

## Related

- [protocol.md](protocol.md) — hub
- [protocol-tentative.md](protocol-tentative.md) — \`?\` choice groups
- [protocol-repeat.md](protocol-repeat.md) — section repeat \`[n]\`, \`*\`
- [protocol-lut.md](protocol-lut.md) — \`expand\` / \`collapse\`
- [huffman-v2.md](huffman-v2.md) — \`.huffRecoverSC\`
`,
    'protocol-repeat.md': `# Protocol — section repetition

Repeat local \`def\` sections in **\`mode: parse\`** protocols. Syntax attaches to the section name (not to individual fields).

Requires [\`mode: parse\`](protocol-parse.md). For optional branches without repeat counts, see [protocol-tentative.md](protocol-tentative.md).

---

## Syntax

| Form | Meaning |
|------|---------|
| \`packet[3]\` | exactly 3 times |
| \`packet[1-3]\` | between 1 and 3 (greedy: try max first) |
| \`packet[0-]\` | zero or more until anchor or EOF |
| \`packet*\` | sugar for \`packet[0-]\` |
| \`packet+\` | sugar for \`packet[1-]\` |
| \`data1[1-3]?\` | tentative choice branch with its own repeat |

Invalid: \`[-]\`, \`[-3]\`, \`*?\`, \`+?\`, \`name?[3]\` (\`?\` must follow the repeat spec).

---

## Exact repeat — \`packet[2]\`

\`\`\`logts-play legacy
inline [protocol] .repeatExact:
  mode: parse
  def packet:
    kind 8b
  out:
    packet[2]
  :

16wire out = .repeatExact { data = 10101010 + 11001100 }
show(out)
\`\`\`

---

## Bounded range — greedy max-first

\`packet[1-2]\` accepts one or two packets; the parser tries two first.

\`\`\`logts-play legacy
inline [protocol] .repeatPv:
  mode: parse
  parseView: tree
  def packet:
    kind 8b
  out:
    packet[1-2]
  :

16wire parsed = .repeatPv { data = 11110000 + 00001111 }
8wire k0 = parsed:packet:0:kind
8wire k1 = parsed:packet:1:kind
show(k0)
show(k1)
\`\`\`

parseView indexes are **0-based** (\`packet[0]\` in \`show\`, \`parsed:packet:0:kind\` in field access).

---

## Composing with tentative

Different repeat specs per choice branch:

\`\`\`logts-play legacy
inline [protocol] .repeatChoice:
  mode: parse
  def data1:
    kind 8b
  def data2:
    idx 3b
    1
    short 4b
  out:
    data1[1-2]?
    data2[2]?
  :

16wire a = .repeatChoice { data = 11111111 + 00000000 }
16wire b = .repeatChoice { data = 10110101 + 10110101 }
show(a)
show(b)
\`\`\`

| Pattern | Mechanism |
|---------|-----------|
| \`foo?\` | optional **choice** branch — 0 or 1 alternative in a group |
| \`foo[0-1]\` | **sequential** optional — 0 or 1 occurrence, independent of other sections |
| \`data1[1-3]?\` | choice + repeat on that branch |

### Sequential \`[0-1]\` — independent optionals

Unlike \`?\` choice groups, each \`[0-1]\` section is parsed **in order** and may be omitted independently:

\`\`\`logts-play legacy
inline [protocol] .seq01:
  mode: parse
  def dataA:
    x 4b
  def dataB:
    y 4b
  def dataC:
    z 4b
  out:
    dataA[0-1]
    dataB[0-1]
    dataC[0-1]
  :

8wire out = .seq01 { data = 1010 + 0101 }
show(out)
\`\`\`

See also [protocol-tentative.md](protocol-tentative.md) for the full \`?\` vs \`[0-1]\` table.

---

## Anchor footer — \`cell[0-]\` + literal

Unbounded repeat stops before a mandatory follower on the next line. The anchor literal is consumed from the stream but **not** included in the output wire (delimiter only).

\`\`\`logts-play legacy
inline [protocol] .repeatAnchor:
  mode: parse
  def cell:
    x 4b
  out:
    cell[0-]
    1111
  :

8wire out = .repeatAnchor { data = 1010 + 0101 + 1111 }
show(out)
\`\`\`

Payload: \`10100101\` (8 bits). Footer \`1111\` delimits the repeat region.

---

## parseView tree

With \`parseView: tree\`, repeated sections appear as \`packet[0]\`, \`packet[1]\`, … in \`show(parsed)\`.

**Repeated section slice** — \`parsed:packet\` (no index) aggregates **all** instances in order:

| Form | Meaning |
|------|---------|
| \`16wire all = parsed:packet\` | Concatenated bits of every \`packet[i]\` |
| \`show(parsed:packet)\` | Header + tree per \`packet[0]\`, \`packet[1]\`, … |
| \`parsed:packet:0:kind\` | One indexed instance (unchanged) |
| \`parsed:packet:kind\` | **Error** — ambiguous; use \`:0:kind\` |

Flat \`ParseFields\` keeps the **last** iteration per field name; full history lives in parseView only.

---

## Related

- [protocol.md](protocol.md) — hub
- [protocol-parse.md](protocol-parse.md) — \`mode: parse\`, \`rest\`
- [protocol-tentative.md](protocol-tentative.md) — \`?\` choice vs \`[0-1]\` sequential
- [json-subset.md](json-subset.md) — JSON cookbook (repeat + tentative + wire-literals)
`,
    'protocol-tentative.md': `# Protocol — tentative sections (\`?\`)

**Parse-only.** Tentative sections add **ordered choice** with **backtracking**: try alternatives in order; on failure restore the cursor and parsed fields; **first success wins**.

Hub: [protocol.md](protocol.md). For section repetition (\`packet[1-3]\`, \`*\`, anchor), see [protocol-repeat.md](protocol-repeat.md).

---

## Syntax

| Form | Meaning |
|------|---------|
| \`foo\` | mandatory \`localRef\` to \`def foo\` |
| \`foo?\` | tentative \`localRef\` — all branches may fail with **0 bits** |
| \`foo:\` | mandatory **inline** section (body lines follow) |
| \`foo?:\` | tentative inline section |
| \`def foo:\` | declare reusable block — **no \`?\` on \`def\`** |

**Mandatory vs optional at use-site:**

| Invoke | All tentative branches fail |
|--------|----------------------------|
| \`ethernet\` | **Error** — \`parse: no matching alternative\` |
| \`ethernet?\` | **OK** — 0 bits consumed, parsing continues |

---

## \`?\` vs \`[0-1]\` vs \`data1[1-3]?\`

| Pattern | Mechanism |
|---------|-----------|
| \`foo?\` | **Choice group** — pick at most one branch from adjacent \`?\` items |
| \`foo[0-1]\` | **Sequential** — 0 or 1 occurrence; not a choice with neighbours |
| \`data1[1-3]?\` | **Choice + repeat** — whole branch repeats 1–3 times if chosen |

Example: \`dataA[0-1] dataB[0-1]\` may yield A only, B only, both, or neither (four outcomes).  
\`dataA? dataB?\` picks **at most one** of A or B.

Composed choice + repeat: [protocol-repeat.md — Composing with tentative](protocol-repeat.md#composing-with-tentative).

---

## Runnable — L3 dispatch

\`\`\`logts-play legacy
inline [protocol] .l3inline:
  mode: parse
  out:
    ipv4?:
      0100
      src 32b
      dst 32b
    ipv6?:
      0110
      src 128b
      dst 128b
    unknown:
      rest ~
  :

64wire out = .l3inline { data = 0100 + repeat(1,32) + repeat(0,32) }
show(out)
\`\`\`

Literals verify on wire but **do not** appear in the output blob — only **parse fields** (\`src\`, \`dst\`, …).

---

## \`parseView: tree\`

With \`parseView: tree\`, \`show(parsed)\` prints a field tree. Field access: \`parsed:typeA:dataA\` (section names, not numeric index unless repeating — see [protocol-repeat.md](protocol-repeat.md)).

\`\`\`logts-play legacy
inline [protocol] .pvTest:
  mode: parse
  parseView: tree
  out:
    magic 3b
    typeA?:
      11
      01
      dataA 2b
    unknown:
      rest ~
  :

5wire parsed = .pvTest { data = 101110100 }
2wire dataA = parsed:typeA:dataA
show(parsed)
show(dataA)
\`\`\`

---

## \`:decode()\` and tentative

**\`:decode()\` is not supported** on protocols with tentative sections. Use \`{ data = … }\` on a \`mode: parse\` protocol instead.

| Error | Cause |
|-------|--------|
| \`tentative sections require mode: parse\` | \`?\` in \`mode: assemble\` |
| \`Protocol def cannot use '?'\` | \`def foo?:\` at declaration |
| \`parse: no matching alternative\` | mandatory section, all branches failed |
| \`Protocol decode does not support tentative sections\` | \`:decode()\` on protocol with \`?\` |
`,
    'protocol.md': `# PROTOCOL

A protocol generator. A protocol definition transforms named parameters into one or more fixed-length bit sequences.

Unlike [ASM](asm.md), which generates a single binary blob, a protocol may generate **multiple output channels** (\`tx\`, \`sda\`, \`scl\`, \`mosi\`, etc.).

There is **no panel UI** in v1 — logic only.

### Documentation map

| Topic | Page |
|-------|------|
| Assemble, UART/SPI, \`:decode()\` | [protocol-assemble.md](protocol-assemble.md) |
| **\`mode: parse\`**, cursor, \`rest\` | [protocol-parse.md](protocol-parse.md) |
| Tentative \`?\`, choice groups | [protocol-tentative.md](protocol-tentative.md) |
| Section repeat \`[n]\`, \`*\`, anchor | [protocol-repeat.md](protocol-repeat.md) |
| \`expand\` / \`collapse\` / Huffman | [protocol-lut.md](protocol-lut.md) · [huffman-v2.md](huffman-v2.md) |
| JSON subset example | [json-subset.md](json-subset.md) |
| Wire string literals in protocol | [protocol-parse.md](protocol-parse.md#wire-literals-in-parse-protocol) · [wire-literals.md](wire-literals.md) |

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

---

## Feature matrix — assemble, \`mode: parse\`, \`:decode\`

Not every generator works in every direction. Use this table when choosing encode vs recover vs \`:decode()\`.

| Segment / generator | \`mode: assemble\` (default) | \`mode: parse\` | \`:decode(channels…)\` |
|---------------------|----------------------------|---------------|----------------------|
| Literals \`0\`, \`0101\`, \`^AA\`, \`\\42\` | emit | verify on wire | verify |
| \`param Nb\` / \`param ~b\` | read from invoke args | **read from cursor** (\`parseField\`) | extract from channel bits |
| \`def\` + \`localRef\` | compose sub-segments | parse sub-stream | ✗ |
| \`reverse\`, \`parityEven/Odd\`, \`clock\`, \`repeat\` | ✓ | ✗ (use literals + fields instead) | verify + extract params |
| \`length(param) Nb\`, \`lengthOf(def) Nb\` | ✓ | ✗ | ✗ |
| \`withLength(param, Nb)\` | strip length prefix (assemble) | read length prefix + payload | ✗ |
| \`withLength(param, field b)\` | ✗ | read \`field\`-wide payload | ✗ |
| \`withLength(stream\\|data, Nb, def)\` | ✗ | framed repeat-parse (\`entry\` loop) | ✗ |
| \`expand\`, \`collapse\`, \`collapse(withLength(…), …)\` | ✓ | \`collapse\` only (incl. nested \`withLength\`) | ✗ |
| \`checksum(crc16, def\\|param)\` | append CRC | ✗ | ✗ |
| \`validateChecksum(crc16, param)\` | ✗ | verify CRC on **full** invoke param | ✗ |
| Attributes \`codebookLoad\`, \`parseResult\` | ✗ | parse only | ✗ |
| **\`?\` tentative sections** (\`foo?\`, \`foo?:\`) | ✗ | ordered choice + rollback | ✗ |
| **Section repeat** (\`packet[n]\`, \`[min-max]\`, \`*\`, \`+\`) | ✗ | repeat \`def\` — see [protocol-repeat.md](protocol-repeat.md) | ✗ |
| **\`rest ~\`**, **\`rest -Nb\`** | ✗ | consume tail / reserve footer | ✗ |
| **\`parseView: tree\`** | ✗ | optional structured show + \`wire:section:field\` | ✗ |

**Rules of thumb:**

- **UART / SPI / I2C encode** → default assemble + optional \`:decode()\` on simple channels.
- **Huffman / framed packets** → assemble encoder + separate **\`mode: parse\`** recover protocol (not \`:decode()\` on the encoder).
- **\`:decode()\`** recovers only \`param\`-like fields from fixed layouts — not \`expand\`/\`collapse\`/\`def\`/\`withLength\`/\`checksum\`.

Invoke shapes:

| Mode | Example |
|------|---------|
| assemble | \`123wire pkt = .encoder { tokens = …, codebook = … }\` |
| parse | \`32wire out = .recover { data = pkt }\` or \`{ stream = pkt }\` |
| \`:decode\` | \`8wire data = .uart8n1:decode(tx)\` |


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

| Category | Page |
|----------|------|
| Assemble / \`:decode\` / generators | [protocol-assemble.md](protocol-assemble.md) |
| \`expand\` / \`collapse\` | [protocol-lut.md](protocol-lut.md) |
| \`mode: parse\`, cursor, CRC verify | [protocol-parse.md](protocol-parse.md) |
| Tentative \`?\` | [protocol-tentative.md](protocol-tentative.md) |
| Section repeat | [protocol-repeat.md](protocol-repeat.md) |

Quick reference (most frequent):

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
| validateChecksum: mismatch | CRC suffix does not match body |
| parse: expected literal '...' | Fixed field mismatch in parse mode |
| parse: codebook entry count N does not match nSym M | Codebook rows ≠ header \`nSym\` |
| parse: need N bits but only M remain | Truncated packet / cursor overrun |
| withLength: def '...' consumed no bits | Empty or malformed framed region |
| withLength: def '...' left N bits unconsumed | Entry layout does not match wire |
| codebookLoad '…' must be a writable LUT | LUT missing \`writable\` attribute |
| parseResult must be 'all' or 'collapseOnly' | Invalid \`parseResult\` attribute |
| parseView must be 'tree' or 'true' | Invalid \`parseView\` attribute |
| tentative sections require mode: parse | \`?\` in assemble mode |
| parse: no matching alternative | mandatory section, all branches failed |
| Protocol decode does not support tentative sections | \`:decode()\` on protocol with \`?\` |
| parseView: field '…' has no bits | field access on 0-bit branch |
| mode must be 'assemble' or 'parse' | Invalid \`mode\` attribute |
| withLength(..., def) is only supported in mode: parse | Framed def-parse in assemble protocol |
| Protocol parse does not support segment kind '…' | e.g. \`expand\`/\`lengthOf\` inside parse protocol |
| Circular protocol def reference '…' | \`def\` cycle via \`localRef\` |
| prefixFree violation | LUT codewords not prefix-free (at \`codebookLoad\`) |
| prefixFree collapse failed at bit offset N | Invalid Huffman bitstream at decode |

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

- [protocol-assemble.md](protocol-assemble.md) — segments, UART/SPI/I2C, \`:decode\`, \`def\`, \`length\`
- [protocol-parse.md](protocol-parse.md) — \`mode: parse\`, cursor, \`rest\`, \`validateChecksum\`
- [protocol-tentative.md](protocol-tentative.md) — \`?\` choice groups
- [protocol-repeat.md](protocol-repeat.md) — \`[n]\`, \`*\`, anchor
- [protocol-lut.md](protocol-lut.md) — \`expand\` / \`collapse\`
- [json-subset.md](json-subset.md) — JSON subset cookbook
- [huffman.md](huffman.md) · [huffman-v2.md](huffman-v2.md) — Huffman packets
- [lut.md](lut.md) — inline LUT
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
    'schema-field-arrays.md': `# Schema field arrays (fixed size)

Fixed-size **array fields** inside a semantic schema record — raw bit slices (\`cells:8[3]\`) or arrays of sub-schemas (\`slots:<opcode>[2]\`). Part of [Semantic schemas](semantic-schemas.md).

See also: [Variable arrays (1D)](schema-variable-arrays.md), [Variable matrix (2D)](schema-variable-matrix.md), [wire-literals.md](wire-literals.md), [wire-vectors.md](wire-vectors.md).

---

## Runnable examples (Load / Load & Run)

Use **\`logts-play wave\`** for examples with \`show\`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Raw bit arrays (\`field:W[N]\` / \`[R,C]\`)

A schema may contain **fixed-size arrays** of raw bit slices (model B — one wire holds the full packed record):

\`\`\`logts
<frame>:
    tag:8
    cells:8[3]      # vector — 3 × 8b = 24b
    grid:4[2,2]     # matrix — 2×2 × 4b = 16b
:
48wire<frame> pkt := 0
\`\`\`

| Syntax | Meaning | Total bits |
|--------|---------|------------|
| \`cells:8[3]\` | 3 elements, 8 bits each | 24 |
| \`grid:4[2,2]\` | 2×2 matrix, 4 bits per cell | 16 |

**Indices are 0-based** (same as wire vectors): \`pkt:cells:1\`, \`pkt:grid:0:1\`.

Attach with a scalar wire whose width equals **schema \`totalWidth\`** (here \`48wire<frame>\`). Do **not** use \`8wire[3]<frame>\` — element width must match the whole schema, not one array cell.

### Read / write

\`\`\`logts
pkt:tag := \\42
pkt:cells:0 := \\15
pkt:cells:1 := \\240
pkt:grid:0:1 := \\6
8wire c0 = pkt:cells:0
4wire g = pkt:grid:0:1
\`\`\`

### Literals on array slices

Use the same RHS forms as [wire-literals.md](wire-literals.md) on the **array slice** (\`pkt:cells\`, \`pkt:grid\`). Width must match \`W×N\` or \`W×rows×cols\`:

| Accepted | Example | Width |
|----------|---------|-------|
| Concatenation | \`pkt:cells = 00001111 + 11110000 + 10101010\` | 3×8 = 24b |
| Hex pattern | \`pkt:cells = ^0FF0AA\` | 24b |
| Grouped + tag | \`pkt:cells = \\1 \\2 \\3;8\` | 3×8 = 24b |
| Per-element | \`pkt:cells:1 := \\5\` | 8b |

**Grouped schema elements** (vector/matrix wire, schema array slice, or record field) — one \`{ … }\` per element, single \`<schema>\` on the last group (like \`\\2 \\23 \\242;8\`):

\`\`\`logts
16wire[3]<opcode> rom = { alu=\\5 } { cycles=\\3 } { jump=1 }<opcode>
pkt:slots = { alu=\\5 } { cycles=\\3 }<opcode>
pkt = { tag=\\42, slots={ alu=\\5 } { cycles=\\3 }<opcode> }<frame>
\`\`\`

Equivalent to concatenating per-element literals with \`+\`. Whitespace between \`}\` and \`{\` is optional (\`{}{}<schema>\` on one line is fine).

**Not supported:** comma lists \`[\\1,\\2,\\3]\` or \`{ cells=[\\1,\\2,\\3] }\` — use grouped numeric \`\\1 \\2 \\3;8\` or grouped schema above.

### Matrix row / column slices

Same syntax as wire matrices — \`pkt:grid:0\` (row), \`pkt:grid::1\` (column), including \`pkt:grid:(rowIdx)\` and \`pkt:grid::(colIdx)\`:

\`\`\`logts
pkt:grid:0 = 0101 + 0110
pkt:grid::1 = 0110 + 1111
show(pkt:grid:0)    # :0:0 … :0:1 + pkt:grid has shape [2,2]
show(pkt:grid::1)   # :0:1 … :1:1 + pkt:grid has shape [2,2]
\`\`\`

### \`show\` on array fields

\`show(pkt)\` prints scalar fields normally; array fields use a **section header** plus **flat index lines** (\`:0 = … (Wbit)\`), without \`cells[3]\` syntax. \`show(pkt:cells)\` / \`show(pkt:grid)\` add a \`has length\` / \`has shape\` footer.

---

## Schema arrays (\`field:<schema>[N]\` / \`[R,C]\`)

Fixed-size arrays of **sub-schemas** — each element is a full nested record, analogous to \`16wire[2]<opcode>\` on wires:

\`\`\`logts
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:

<frame>:
    tag: 8
    slots: <opcode>[2]    # 2 × 16b = 32b
    tiles: <opcode>[2,2]  # 2×2 × 16b = 64b
:
40wire<frame> pkt := 0
\`\`\`

| Syntax | Meaning | Total bits |
|--------|---------|------------|
| \`slots:<opcode>[2]\` | 2 elements, each \`opcode.totalWidth\` | 2×16 = 32 |
| \`tiles:<opcode>[2,2]\` | 2×2 matrix of \`opcode\` records | 4×16 = 64 |

**Indices are 0-based:** \`pkt:slots:1:alu\`, \`pkt:tiles:0:1:cycles\`. Matrix row/column slices use the same rules as raw arrays — \`pkt:tiles:0\`, \`pkt:tiles::1\`.

### Read / write

\`\`\`logts
pkt:tag := \\42
pkt:slots:0:alu := \\5
pkt:slots:1 = { alu=\\5 cycles=\\3 }<opcode>
pkt:tiles:0:1:alu := \\5
4wire a = pkt:slots:0:alu
16wire s0 = pkt:slots:0
\`\`\`

### Literals on schema array slices

Same RHS forms as wire vectors — concatenation, hex, per-element schema literal:

| Accepted | Example | Width |
|----------|---------|-------|
| Concatenation | \`pkt:slots = s0 + s1\` | 2×16 = 32b |
| Per-element literal | \`pkt:slots:1 = { alu=\\5 }<opcode>\` | 16b |
| Sub-field assign | \`pkt:slots:0:alu := \\5\` | 4b |

**Grouped schema** (one \`{ … }\` per slot, \`<opcode>\` on last): \`pkt:slots = { alu=\\5 } { cycles=\\3 }<opcode>\`

**Not supported:** comma lists \`[{…},{…}]\` or \`{ slots=[…] }\` — use grouped schema or \`+\` concat.

### \`show\` on schema arrays

Same layout as wire vectors with schema: section header \`slots\`, flat \`:i = … (Wbit)\` per element, then **indented sub-schema tree** underneath. \`show(pkt:slots:1)\` shows one element only.

**Load & Run** — mixed scalar + schema array field write + \`show\`:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:

<frame>:
    tag: 8
    slots: <opcode>[2]
:
40wire<frame> pkt := 0
pkt:slots:1:alu := \\5
pkt:slots:1:cycles := \\3
show(pkt)
\`\`\`

Mixed scalar + raw array + matrix on one record:

\`\`\`logts
<frame>:
    tag:8
    cells:8[3]
    grid:4[2,2]
:
48wire<frame> pkt := 0
pkt:cells:1 := \\240
pkt:grid:0:1 := \\6
show(pkt)
\`\`\`

Mismatch between schema width and **element** width is a compile-time error:

\`\`\`logts
# ERROR:
# width mismatch between opcode13 (13bit) and definition (16bit)
<opcode13>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:5
:
16wire<opcode13> instr
\`\`\`

**Load & Run** — width mismatch error (13-bit schema on 16-wire):

\`\`\`logts-play
<opcode13>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:5
:
16wire<opcode13> instr
\`\`\`

Valid attach (16 bits):

\`\`\`logts
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr
\`\`\`

Type label in debug output becomes \`16wire<opcode>\`.

---

## Variable-size arrays

For runtime element count (\`8[1-3]\`, \`8[1-]\`) see [Variable arrays (1D)](schema-variable-arrays.md). For variable 2D matrices (\`8[1-3,2]\`, \`<opcode>[1-3,2]\`) see [Variable matrix (2D)](schema-variable-matrix.md).
`,
    'schema-frame-padding.md': `# Schema frame padding (grow / shrink)

**Faza 2.5** — wide wire + variable schema: reserve a **frame** (\`declaredWidth\`) larger than the runtime payload. Surplus bits are **\`paddingRight\`** (buffer) used when a variable field **grows** or **shrinks** at assign time.

Prerequisite: [Variable arrays (1D)](schema-variable-arrays.md), [Variable matrix (2D)](schema-variable-matrix.md). See also [Assignment operators](assignment-operators.md) (\`=\`, \`=:\` , \`:=\`).

---

## Runnable examples (Load / Load & Run)

Use **\`logts-play wave\`** for examples with \`show\`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Model

\`\`\`text
declaredWidth (e.g. 200) = schemaUsedWidth (runtime) + paddingRight (buffer)
\`\`\`

| Concept | Meaning |
|---------|---------|
| **\`declaredWidth\`** | Wire type width — e.g. \`200wire<framePkt>\` → 200 bits reserved |
| **\`schemaUsedWidth\`** | Sum of all schema fields at current \`varArrayCounts\` (or **minWidth** after \`:= 0\` only) |
| **\`paddingRight\`** | \`declaredWidth − schemaUsedWidth\` when surplus ≥ 1 bit; zeros in storage; shown in \`show(pkt)\` |
| **Wire strâns (tight)** | \`declaredWidth\` equals current layout exactly — **no buffer**; changing variable **count** → **error** |
| **Wire cadru (frame)** | \`declaredWidth\` > runtime layout — grow/shrink on variable fields **in scope** |

**Fixed schemas** on a wide wire keep constant payload width; padding stays static (no grow/shrink).

**parseView without schema** (protocol \`=: .proto {…}\` on a plain wire) still uses synthetic \`paddingRight\` / \`paddingLeft\` as before — this page covers **\`<schema>\` on the wire**.

---

## Example schema

Record with header/footer and a **variable 2D grid** (\`rows\` 1–3, \`cols\` fixed at 2):

\`\`\`logts
<cell8>:
    v: 8
:

<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
\`\`\`

| Layout | Bits |
|--------|------|
| min (1×2 grid) | 2 + 16 + 2 = **20** |
| 2×2 grid | 2 + 32 + 2 = **36** |
| 3×2 grid | 2 + 48 + 2 = **52** |

---

## Init — \`:= 0\` on a wide wire

All bits zero. Runtime layout uses **minimum** counts; full surplus is buffer from the start.

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
200wire<framePkt> pkt := 0
show(pkt)
\`\`\`

Expected **Output**:

- \`header\`, \`grid\` with \`:0:0\`, \`:0:1\` (min shape **\\[1,2\\]**), \`footer\`
- \`grid has shape [1,2]\`
- \`paddingRight = … (180bit)\` — because 200 − 20 = 180

\`show(pkt:grid)\` **before** any assign that sets grid count still **errors** (slice needs explicit count). Full-record \`show(pkt)\` after \`:= 0\` is OK.

---

## Grow — take bits from buffer

Start on a **200wire** frame, set header/footer, assign 2×2 grid, then **grow** to 3×2. Header and footer are **relocated**; new grid cells come from the assign RHS; freed buffer shrinks.

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
200wire<framePkt> pkt := 0
pkt:header = 11
pkt:footer = 00
pkt:grid = [2,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }<cell8>
pkt:grid = [3,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }{ v=\\5 }{ v=\\6 }<cell8>
show(pkt)
\`\`\`

Expected **Output**:

- \`header = 11\`, \`footer = 00\` (unchanged values)
- \`grid has shape [3,2]\` — six \`:r:c\` lines
- \`paddingRight … (148bit)\` — 200 − 52 = 148

Same rebuild path for:

- \`pkt:grid = ^AABBCCDDEEFF\` (flat — length ÷ 8 ⇒ count 6 ⇒ 3×2 with fixed cols)
- \`pkt:grid = .myProto { … }\` (proto blob length sets count — matrix shape rules still apply)

---

## Shrink — return bits to buffer

From 2×2 on a **200wire** frame, shrink to 1×2. Payload shrinks; **paddingRight** grows.

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
200wire<framePkt> pkt := 0
pkt:grid = [2,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }<cell8>
pkt:grid = [1,2]{ v=\\9 }{ v=\\10 }<cell8>
show(pkt)
\`\`\`

Expected **Output**:

- \`grid has shape [1,2]\` — two cells
- \`paddingRight … (180bit)\` — 200 − 20 = 180

---

## Tight wire — errors (no buffer)

When \`declaredWidth\` matches the current layout **exactly**, changing row/column **count** is rejected (no silent fail).

**Grow** on \`36wire\` (exact 2×2 layout):

\`\`\`logts
36wire<framePkt> pkt := 0
pkt:grid = [2,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }<cell8>
pkt:grid = [3,2]{ … }<cell8>    # error: requires 52 bits …
\`\`\`

**Shrink**:

\`\`\`logts
pkt:grid = [1,2]{ v=\\9 }{ v=\\10 }<cell8>   # error: … without frame buffer …
\`\`\`

**Same count** assign still works (fast splice):

\`\`\`logts
pkt:grid = [2,2]{ v=\\5 }{ v=\\6 }{ v=\\7 }{ v=\\8 }<cell8>   # OK
\`\`\`

**Insufficient frame** (layout would exceed declared width):

\`\`\`logts
50wire<framePkt> pkt := 0
pkt:grid = [2,2]{ … }<cell8>
pkt:grid = [3,2]{ … }<cell8>    # error: requires 52 bits but wire is 50bit
\`\`\`

---

## Padding in \`show\` / read

| Action | Behaviour |
|--------|-----------|
| **\`show(pkt)\`** | Schema tree on payload bits + \`paddingRight = 000… (Nbit)\` when N ≥ 1 |
| **\`show(pkt:grid)\`** | Field slice only — no padding line (same as before) |
| **\`pkt:paddingRight\`** | Read/write the buffer slice (when \`paddingRightWidth\` > 0) |
| **Flat \`=\` on whole wire** | Strict — RHS must match **declaredWidth**; use per-field assign or \`:=\` for frame init |

---

## 1D variable fields

Same rules apply to **1D** variable arrays (\`cells:8[1-3]\`) on a wide wire: grow/shrink via \`pkt:cells = …\` uses buffer; tight wire rejects count change.

\`\`\`logts
<package2>:
    cells: 8[1-]
    footer: 8
:
64wire<package2> pkt := 0
show(pkt)                          # min layout + paddingRight
pkt:cells = ^AABB                  # count 2 — padding recalculated
pkt:cells = ^AABBCCDD              # count 4 — grow from buffer (if room)
\`\`\`

Use a wire wide enough for the **maximum** count you need, or assign per-field on a tight wire at fixed count only.

---

## Quick reference

| Situation | Result |
|-----------|--------|
| \`200wire<varSchema> pkt := 0\` | min layout + max \`paddingRight\` |
| Assign changes grid/cells **count** on **frame** wire | Rebuild + update \`paddingRightWidth\` |
| Assign same count on frame wire | Splice field + refresh padding metadata |
| Count change on **tight** wire | **Error** |
| \`newUsed > declaredWidth\` | **Error** (\`requires N bits\`) |
| Fixed schema on wide wire | Static payload; padding only |

---

## Related

| Doc | Topic |
|-----|-------|
| [Variable arrays (1D)](schema-variable-arrays.md) | \`varArrayCounts\`, flat vs per-field assign |
| [Variable matrix (2D)](schema-variable-matrix.md) | \`[R,C]\` shape, row/col slice |
| [Semantic schemas](semantic-schemas.md) | Field access, literals, show |
| [Assignment operators](assignment-operators.md) | \`=\`, \`=:\`, \`:=\`, padding on plain wires |
`,
    'schema-variable-arrays.md': `# Variable arrays in schema (1D)

**Model D** — variable element count at runtime inside a schema field: \`cells:8[1-3]\`, \`cells:8[1-]\`, \`tokens:8[nTokens]\`. Part of [Semantic schemas](semantic-schemas.md).

See also: [Fixed field arrays](schema-field-arrays.md), [Variable matrix (2D)](schema-variable-matrix.md), [Frame padding (grow / shrink)](schema-frame-padding.md), [protocol-repeat.md](protocol-repeat.md) (same \`[min-max]\` syntax).

---

## Runnable examples (Load / Load & Run)

Use **\`logts-play wave\`** for examples with \`show\`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Syntax

Mirrors protocol repetition: **\`8[1-3]\`** (1–3 elements), **\`8[1-]\`** (at least 1, open upper bound), **\`8[0-]\`** (zero or more). Sugar: **\`8+\`** → \`8[1-]\`, **\`8*\`** → \`8[0-]\`.

**Count from prior scalar field:** **\`8[nTokens]\`** — element count is read from an earlier **fixed-width leaf** field (e.g. \`nTokens: 4\` before \`tokens: 8[nTokens]\`). Enables deterministic flat assign when another open-ended field follows.

For **2D matrices**, countRef applies per dimension — see [Variable matrix (2D)](schema-variable-matrix.md): \`8[nRows, 2]\`, \`8[2, nCols]\`, or **\`8[nRows, nCols]\`** (both dims from prior scalars).

\`\`\`logts
<package2>:
    cells: 8[1-]
    footer: 8
:

<package3>:
    tokens: 8[1-]
    codeDatas: 8[1-]
:

<package3det>:
    nTokens: 4
    tokens: 8[nTokens]
    codeDatas: 8[1-]
:
\`\`\`

| Topic | Rule |
|-------|------|
| **Flat \`=\` on whole record** | OK when count is **unique** (e.g. \`24wire\` + suffix anchor, single open-ended field last, or **countRef** chain). |
| **Two \`8[1-]\` fields** | Structured per-field assign OK; flat \`pkt = ^…\` → **ambiguous** error (use \`package3det\` with scalar count). |
| **\`8[nTokens]\` countRef** | \`nTokens\` must be a **prior leaf** with fixed width; count = unsigned value of that field at flat resolve time. |
| **Matrix countRef** | \`8[nRows, nCols]\`, \`8[nRows, 2]\`, \`8[2, nCols]\` — each ref must be a distinct prior leaf; see [Variable matrix (2D)](schema-variable-matrix.md). |
| **Runtime count** | Stored in \`wire.varArrayCounts\`; drives layout, show, read, Wave Listen. |
| **Show** | Tree + \`:i\` lines + \`field has length [N]\`; tags (\`; dec\`) and field slices supported. |
| **Peek / probe** | Same tree as \`show\`, including dynamic \`has length [N]\`. |
| **WWIDTH / BITSIZE** | \`WWIDTH(pkt:tokens:0)\` = element width (\`8\`); \`BITSIZE(pkt:tokens)\` = runtime total (\`count × W\`). |

Static reference (no buttons):

\`\`\`logts
24wire<package2> pkt = ^AABBFF          # cells count=2 (suffix anchor)
32wire<package3> pkt := 0
pkt:tokens = ^AABB
pkt:codeDatas = ^CC
24wire<package1> pkt = { cells=^AABBCC }<package1>   # single var field — grouped literal OK
show(pkt:cells; dec)
peek(pkt)
\`\`\`

---

## Load & Run examples

**\`package2\`** — flat hex init (suffix anchor resolves \`cells\` count), full-record \`show\`, decimal tag on the cells slice, \`peek\`:

\`\`\`logts-play wave
<package2>:
    cells: 8[1-]
    footer: 8
:
24wire<package2> pkt = ^AABBFF
show(pkt)
show(pkt:cells; dec)
peek(pkt)
\`\`\`

Expected **Output**: \`cells has length [2]\`; \`:0\` / \`:1\` under \`cells\`; \`footer = 11111111\`; peek tree matches \`show(pkt)\`.

**\`package3\`** — two variable fields — use **structured per-field assign** (flat \`pkt = ^…\` is ambiguous):

\`\`\`logts-play wave
<package3>:
    tokens: 8[1-]
    codeDatas: 8[1-]
:
32wire<package3> pkt := 0
pkt:tokens = ^AABB
pkt:codeDatas = ^CC
show(pkt)
\`\`\`

Expected **Output**: \`tokens has length [2]\`, \`codeDatas has length [1]\`.

**\`package3det\`** — scalar count + flat hex init (deterministic split):

\`\`\`logts-play wave
<package3det>:
    nTokens: 4
    tokens: 8[nTokens]
    codeDatas: 8[1-]
:
44wire<package3det> pkt = ^2AABBCCDDEE
show(pkt)
\`\`\`

Expected **Output**: \`nTokens = 0010\` (2); \`tokens has length [2]\`; \`codeDatas has length [3]\`; flat layout unique at 44 bits.

**Bounded range \`8[1-3]\`** — grouped schema literal, \`BITSIZE\` / \`WWIDTH\`:

\`\`\`logts-play wave
<package1>:
    cells: 8[1-3]
:
24wire<package1> pkt = { cells=^AABBCC }<package1>
show(pkt)
5wire sz = BITSIZE(pkt:cells)
4wire ew = WWIDTH(pkt:cells:0)
show(sz)
show(ew)
\`\`\`

Expected **Output**: \`cells has length [3]\`; \`sz = 11000\` (24 bits); \`ew = 1000\` (8-bit element width).

**\`probe\`** on a variable array field after per-field writes:

\`\`\`logts-play wave
<package3>:
    tokens: 8[1-]
    codeDatas: 8[1-]
:
32wire<package3> pkt := 0
pkt:tokens = ^AA
pkt:codeDatas = ^BBCC
probe(pkt:tokens)
\`\`\`

Expected **Output**: probe tree with \`tokens has length [1]\` and \`:0 = 10101010\`.

---

## Grouped literal shape \`[N]\`

When count alone is ambiguous, use a **prefix or suffix** shape on grouped literals (same rules as matrix \`[R,C]\` — see [Variable matrix (2D)](schema-variable-matrix.md)):

\`\`\`logts
pkt:cells = { }{ }{ }[3]<cell>
pkt:cells = [3]{ }{ }{ }<cell>
\`\`\`

---

## Next: 2D variable matrices

Matrices with one variable dimension (\`grid:8[1-3,2]\`, \`tiles:<opcode>[1-3,2]\`) are documented in [Variable matrix (2D)](schema-variable-matrix.md).
`,
    'schema-variable-matrix.md': `# Variable matrix in schema (2D)

**Model D — 2D** — variable row or column count at runtime: \`grid:8[1-3,2]\`, \`tiles:<opcode>[1-3,2]\`. Part of [Semantic schemas](semantic-schemas.md).

Prerequisite: [Variable arrays (1D)](schema-variable-arrays.md) (\`varArrayCounts\`, flat vs structured assign). Fixed-size slice syntax: [Schema field arrays](schema-field-arrays.md). **Grow/shrink** on wide wires: [Frame padding](schema-frame-padding.md).

---

## Runnable examples (Load / Load & Run)

Use **\`logts-play wave\`** for examples with \`show\`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Syntax and layout

At most **one variable dimension** per field at flat assign time — **unless** dimensions are driven by **countRef** scalars (\`8[nRows, nCols]\`). \`varArrayCounts[field]\` stores **total cells** \`N = R×C\`; the fixed dimension from the declaration derives the other (\`rows = N / colsFix\`).

\`\`\`logts
<cell8>:
    v: 8
:

<frameVarGrid>:
    grid: 8[1-3, 2]    # cols fixed at 2; rows 1–3 at runtime
:

<opcode>:
    alu: 4
    jump: 1
    write: 1
    cycles: 2
    reserved: 8
:

<frameVarTiles>:
    tiles: <opcode>[1-3, 2]
:

<frameGridDet>:
    nRows: 4
    nCols: 4
    grid: 8[nRows, nCols]
:
\`\`\`

| Syntax | Flat \`pkt = ^…\` | Notes |
|--------|-----------------|-------|
| \`grid:8[1-3, 2]\` | ✅ | \`N = payload/8\`, \`rows = N/2\` |
| \`grid:8[2, 1-3]\` | ✅ | \`cols = N/2\` |
| \`grid:8[1-3, 1-3]\` | ❌ ambiguous | use shape literal, countRef, or per-field assign |
| \`grid:8[nRows, nCols]\` | ✅ | both dims from prior leaf scalars — flat unique |
| \`grid:8[nRows, 2]\` | ✅ | rows from scalar, cols fixed |
| \`tiles:<opcode>[1-3, 2]\` | ✅ | element width = 16 (\`opcode.totalWidth\`) |

---

## Grouped literal shape

Prefix **or** suffix \`[R,C]\` / \`[N]\` — **not both** in the same literal:

\`\`\`logts
pkt:grid = { v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }[2,2]<cell8>
pkt:grid = [2,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }<cell8>
pkt:tiles = [2,2]{ alu=\\5 }{ alu=\\6 }{ alu=\\1 }{ alu=\\2 }<opcode>
\`\`\`

**Show** — tree \`:r:c\` plus \`pkt:grid has shape [R,C]\` (or \`grid has shape [R,C]\` inside full-record \`show\`).

---

## Load & Run examples

**Flat assign 2×2 leaf matrix**, \`show\`, shape footer:

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<frameVarGrid>:
    grid: 8[1-3, 2]
:
32wire<frameVarGrid> pkt = ^AABBCCDD
show(pkt:grid)
\`\`\`

Expected **Output**: \`:0:0\`, \`:0:1\`, \`:1:0\`, \`:1:1\` under \`grid\`; \`pkt:grid has shape [2,2]\`.

**Dual countRef** — flat assign with \`nRows\` / \`nCols\` scalars (replaces ambiguous \`8[1-, 1-]\` at flat):

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<frameGridDet>:
    nRows: 4
    nCols: 4
    grid: 8[nRows, nCols]
:
56wire<frameGridDet> pkt = ^23AABBCCDDEEFF
show(pkt)
\`\`\`

Expected **Output**: \`nRows = 0010\` (2), \`nCols = 0011\` (3); \`grid has shape [2,3]\`; six \`:r:c\` cell lines.

**Grouped literal with shape prefix** + per-field assign:

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<frameVarGrid>:
    grid: 8[1-3, 2]
:
32wire<frameVarGrid> pkt := 0
pkt:grid = [2,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }<cell8>
show(pkt:grid)
\`\`\`

Expected **Output**: \`pkt:grid has shape [2,2]\`; four \`:r:c\` lines.

**Variable schema matrix** \`<opcode>[1-3, 2]\`:

\`\`\`logts-play wave
<opcode>:
    alu: 4
    jump: 1
    write: 1
    cycles: 2
    reserved: 8
:
<frameVarTiles>:
    tiles: <opcode>[1-3, 2]
:
64wire<frameVarTiles> pkt := 0
pkt:tiles = [2,2]{ alu=\\5 }{ alu=\\6 }{ alu=\\1 }{ alu=\\2 }<opcode>
show(pkt:tiles)
\`\`\`

Expected **Output**: \`pkt:tiles has shape [2,2]\`; nested \`alu\`/\`cycles\`/… under each \`:r:c\`.

**Row/column slice on runtime shape** (7a parity with fixed arrays):

\`\`\`logts-play wave
<cell8>:
    v: 8
:
<frameVarGrid>:
    grid: 8[1-3, 2]
:
32wire<frameVarGrid> pkt := 0
pkt:grid = [2,2]{ v=\\1 }{ v=\\2 }{ v=\\3 }{ v=\\4 }<cell8>
pkt:grid:0 = 00000101 + 00000110
pkt:grid::1 = 00000110 + 00001111
show(pkt:grid:0)
show(pkt:grid::1)
8wire cell10 = pkt:grid:1:0
show(cell10)
\`\`\`

Expected **Output**: row/col slice headers; \`pkt:grid has shape [2,2]\` on each slice show; \`cell10 = 00000111\` (8bit).

Slice syntax matches [fixed matrix slices](schema-field-arrays.md#matrix-row--column-slices); bounds use runtime \`rows\` / \`cols\` from \`varArrayCounts\`.
`,
    'semantic-schemas.md': `# Semantic schemas — named bit fields on wires

Semantic schemas add a **named field layout** on top of raw wire bits: declare fields once, attach a schema to a wire, initialize with structured literals, read/write individual fields, and display or trace values field-by-field.

This is **independent** from numeric display formats (\`s8\`, \`q4p4\`, \`dec\`, …). Schemas describe **what each bit slice means**; numeric tags describe **how to print** a slice. Both can be combined in \`show\` / \`peek\` / \`probe\`.

See also: [debug.md](debug.md) (show/peek/probe), [wire-literals.md](wire-literals.md) (RHS literals), [short-notation.md](short-notation.md) (bit indexing), [wire-vectors.md](wire-vectors.md) (vector/tensor access), [doc-viewer.md](doc-viewer.md) (Load / Load & Run).

---

## Related topics (array fields)

| Page | When to read |
|------|----------------|
| [Schema field arrays (fixed)](schema-field-arrays.md) | \`cells:8[3]\`, \`grid:4[2,2]\`, \`slots:<opcode>[2]\`, slice \`:0\` / \`::1\`, grouped \`{…}<schema>\` |
| [Variable arrays (1D)](schema-variable-arrays.md) | \`8[1-3]\`, \`8[1-]\`, \`varArrayCounts\`, flat vs per-field assign, \`has length [N]\` |
| [Variable matrix (2D)](schema-variable-matrix.md) | \`8[1-3,2]\`, \`<opcode>[1-3,2]\`, shape \`[R,C]\`, runtime row/col slice |
| [Frame padding (grow / shrink)](schema-frame-padding.md) | Wide wire buffer \`paddingRight\`, resize variable fields, tight vs frame wire |

---

## Runnable examples (Load / Load & Run)

Blocks marked \`logts-play\` show two buttons in the documentation viewer:

| Button | Action |
|--------|--------|
| **Load** | Copy the script into the editor without running |
| **Load & Run** | Copy and run immediately — check the **Output** panel |

Use **\`logts-play wave\`** (orange badge) for examples with \`show\` — same as [debug.md](debug.md). Static syntax reference below uses plain fences (no buttons).

---

## Quick comparison

| | Numeric formats (\`s8\`, \`q4p4\`, …) | Semantic schemas (\`<name>\`) |
|---|-----------------------------------|------------------------------|
| Module | \`numeric-formats.js\` | \`semantic-schemas.js\` |
| Attached to wire | No (only at literal / show tag) | Yes — \`wireEntry.schemaRef\` |
| Literals | \`\\1.5;q4p4\`, \`^FF\` | \`{ alu=\\5 cycles=\\3 }<opcode>\` |
| Field access | — | \`instr:alu\`, \`vector:2:alu\` |
| \`show(w)\` | Flat wire value | Auto breakdown by schema |
| Wave Listen | Global fmt dropdown | **\`auto\`** uses wire schema |

---

## Declaring a schema

Top-level block — schema name is written as **\`<name>\`**:

\`\`\`logts
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
\`\`\`

| Rule | Detail |
|------|--------|
| Field syntax | \`name:width\` (width in bits); \`name:W[N]\` vector; \`name:W[N,M]\` matrix — see [field arrays](schema-field-arrays.md) |
| Bit layout | **MSB-left, index 0** — same convention as \`.bitRange\` / wire slices |
| Total width | Sum of field widths |
| Duplicate names | Error at parse time |

---

## Attaching a schema to a wire

\`\`\`logts
16wire<opcode> instr
16wire[64]<opcode> rom
16wire[2,3]<opcode> grid
\`\`\`

**What \`<schema>\` does:** it attaches the named field layout to **each element** of the wire’s storage — not to the whole concatenated bit string.

| Declaration | Storage | Schema applies to |
|-------------|---------|-------------------|
| \`16wire<opcode> instr\` | one 16-bit word | that word |
| \`16wire[4]<opcode> rom\` | 4 × 16 bits (64 total) | **each** of the 4 elements |
| \`16wire[2,3]<opcode> grid\` | 2×3 × 16 bits (96 total) | **each** matrix cell |

Validation compares **schema total width** with **element width** (\`16\` in the examples above), not the full wire/tensor size. A 16-bit schema on \`16wire[64]\` is valid (64 elements × 16 bits); a 16-bit schema on \`8wire[4]\` is an error.

Type labels in debug output reflect the shape + schema, e.g. \`16wire[3]<opcode>\`, \`16wire[2,2]<opcode>\`.

---

## Vectors and matrices

On a vector or matrix wire, \`<schema>\` means: **every element/cell is one packed instance of that schema**. Field access picks an index (or row:col), then a field name:

\`\`\`logts
rom:1:alu              # vector element 1, field alu
grid:0:1:jump          # matrix cell (row 0, col 1), field jump
\`\`\`

Rules are the same as on a scalar wire: \`=\` strict width, \`:=\` left-pad; RHS is any expression; reads use a wire matching the field width.

\`show(rom:1)\` / \`show(grid:0:1)\` on a schema wire prints a **per-field multi-line breakdown of that one element**. \`show(rom)\` / \`peek(rom)\` on the full vector lists each \`:i\` / \`:row:col\` as a **flat index line** (\`:1 = … (16bit)\`), then **indented schema fields** on the following lines (not inline \`alu=0101\` on the same line). \`probe(rom:1)\` uses the same tree layout. Use \`compact\` for header + length/shape only; use indexed \`show\` for full multi-line detail on one slot.

### Vector example

**Load & Run** — three ROM slots, write element 1 via field access, read back, schema \`show\` on that element:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire[3]<opcode> rom := 0
rom:1:alu := \\5
rom:1:cycles := \\3
4wire aluSlot = rom:1:alu
2wire cycSlot = rom:1:cycles
show(rom:1)
\`\`\`

Expected **Output**: \`alu = 0101\`, \`cycles = 11\`; \`aluSlot\` / \`cycSlot\` match; elements \`0\` and \`2\` stay zero.

Initialize one element with a schema literal:

\`\`\`logts
rom:2 = { alu=\\5 cycles=\\3 jump=1 }<opcode>
\`\`\`

Initialize all elements with a **grouped** schema literal (one \`{ … }\` per slot, \`<opcode>\` on last):

\`\`\`logts
rom = { alu=\\5 } { cycles=\\3 } { jump=1 }<opcode>
\`\`\`

### Matrix example

**Load & Run** — 2×2 grid, literal on one cell, field write on another, schema \`show\`:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire[2,2]<opcode> grid := 0
grid:1:0 = { alu=\\5 cycles=\\3 }<opcode>
grid:0:1:jump = 1
1wire j = grid:0:1:jump
show(grid:1:0)
show(grid:0:1)
\`\`\`

Expected **Output**: \`grid:1:0\` shows \`alu=0101\`, \`cycles=11\`; \`grid:0:1\` shows \`jump=1\`; \`j = 1\`.

### Pixel-style schema (optional)

For RGB-style cells, declare a wider schema and use \`row:col:field\`:

\`\`\`logts
<pixel>:
    red:5
    green:6
    blue:5
:
16wire[2,2]<pixel> framebuffer := 0
framebuffer:0:1:red := \\15
5wire r = framebuffer:0:1:red
\`\`\`

Here \`16wire\` is the **element** width (5+6+5); each of the four cells is one \`<pixel>\`.

---

## Schema literals

Initialize (or assign) a full wire from named fields:

\`\`\`logts
16wire<opcode> instr = {
    cycles=\\3
    alu=0
    reserved=^FF
}<opcode>
\`\`\`

| Rule | Detail |
|------|--------|
| Syntax | \`{ field=expr … }<schemaName>\` — schema suffix is **required** |
| Omitted fields | Treated as **0** |
| RHS | Any normal expression/literal (\`\\N\`, \`^HEX\`, \`AND(…)\`, …) |
| Overflow | Error when a constant value does not fit the field width |

**Load & Run** — partial literal; **Output** shows schema breakdown (\`cycles=11\`, \`reserved=11111111\`):

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr = {
    cycles=\\3
    alu=0
    reserved=^FF
}<opcode>
show(instr)
\`\`\`

Grouped multi-element literals on array fields: [Schema field arrays](schema-field-arrays.md#literals-on-array-slices).

---

## Field access (read and write)

The **last** \`:\` segment is always a **field name** (identifier). Numeric segments are vector/tensor indices only.

\`\`\`logts
instr:alu                 # scalar wire, field alu
vector:2:alu              # vector element 2, field alu
matrix:2:5:red            # tensor cell (2,5), field red
\`\`\`

### Assignment

RHS is a full expression. Use **\`=\`** when the evaluated bits already match the field width; use **\`:=\`** to left-pad shorter literals (same rules as wire assignment):

\`\`\`logts
instr:alu = 0101          # strict — exactly 4 bits
instr:alu := \\5           # left-pad \\5 (101) → 0101
instr:cycles := \\3        # left-pad to 2 bits → 11
instr:flags = AND(en, ready)
\`\`\`

\`instr:alu = \\5\` is an error (\`Expected 4 bits, got 3 bits.\`) because \`\\5\` produces minimal binary \`101\`.

Read into another wire — use a wire width that matches the field:

\`\`\`logts
4wire x = instr:alu
2wire y = instr:cycles
\`\`\`

**Load & Run** — field write with \`:=\`, read into \`x\` / \`y\`, schema \`show\`:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr := 0
instr:alu := \\5
instr:cycles := \\3
4wire x = instr:alu
2wire y = instr:cycles
show(instr)
\`\`\`

Expected **Output**: \`alu = 0101\`, \`cycles = 11\`; \`x\` and \`y\` hold the same field values.

**Load & Run** — strict \`=\` rejects short literal (\`Expected 4 bits, got 3 bits.\`):

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr := 0
instr:alu = \\5
\`\`\`

---

## Debug output (\`show\` / \`peek\` / \`probe\`)

When a wire has \`schemaRef\`, \`show(wire)\` prints a multi-line breakdown:

\`\`\`logts
instr (16wire<opcode>)
  alu       = 0101
  jump      = 0
  write     = 0
  cycles    = 11
  reserved  = 00000000
\`\`\`

Array fields inside a record use section headers and \`:i\` / \`:r:c\` lines — see [field arrays](schema-field-arrays.md#show-on-array-fields). Variable arrays add \`has length [N]\` or \`has shape [R,C]\` footers — [1D](schema-variable-arrays.md) / [2D](schema-variable-matrix.md).

### Alternate schema tag

\`\`\`logts
show(instr; <opcode2>)
\`\`\`

Requires \`opcode2.totalWidth === wire.bitWidth\`. Otherwise:

\`\`\`logts
Error: opcode2 (15bit) width incompatible with wire (16bit)
\`\`\`

**Load & Run** — incompatible show schema (15-bit tag on 16-bit wire):

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
<opcode15>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:7
:
16wire<opcode> instr := 0
show(instr; <opcode15>)
\`\`\`

### Numeric tags + schema

Tags such as \`s8\`, \`q4p4\`, \`dec\`, \`hex\` apply **per field** when the field width matches the format; otherwise the same fallback as flat \`show\` is used. Tag order does not matter:

\`\`\`logts
show(instr; s8)
show(instr; s8 <opcode>)
show(instr; <opcode> q4p4 dec)
\`\`\`

**Load & Run** — literal init + \`show(instr; dec)\` per-field decimal:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr = { cycles=\\3 alu=\\5 }<opcode>
show(instr)
show(instr; dec)
\`\`\`

### Wires without a schema

Unchanged flat behaviour:

\`\`\`logts-play wave
2wire a := 0
show(a; s8)
\`\`\`

See [debug.md — display tags](debug.md#show).

---

## Wave Listen — fmt \`auto\`

In the **Wave Listen** panel toolbar, set **Fmt** to **\`auto\`** (first item in the dropdown). When the listened wire has a schema attached (\`16wire<opcode>\`), commit lines show a **per-field breakdown** (same rules as \`show\`):

- **Inline** (scalar wires): compact \`alu=0101 cycles=11 …\`
- **Inline** (vector/matrix + schema): flat slot lines only — \`:0 = … :1 = …\` (no inline \`alu=0101\` on the same line)
- **Expand** ([+] button): appears when **fmt is \`auto\`** and the wire has a schema (or when the value exceeds 256 bits); shows the same multi-line tree as \`show\`
- **Copy** ([cpy]): script literal only — \`{ opcode=\\5 flags={ … }<flags> … }<instruction>\` (no \`wireName =\` prefix)
- **Vectors / matrices** (\`16wire[3]<opcode>\`): expand lists flat index lines plus indented fields per slot

Without \`schemaRef\`, \`auto\` falls back to **hex** (same as before).

**Load & Run** — arm Wave Listen (ON), set Fmt to **auto**, run a schema script; expand a commit line on \`instr\`:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr = { cycles=\\3 alu=\\5 }<opcode>
\`\`\`

After **Load & Run**: open **Wave Listen**, arm **ON**, choose **Fmt → auto**, press **RUN** — commit on \`instr\` shows field breakdown.

---

## Schema composition (merge and nested)

Schemas may reference other schemas in two ways:

| Syntax | Effect |
|--------|--------|
| \`<schema>\` on its own line | **Merge** — copy all fields into the current schema (flat) |
| \`field:<schema>\` | **Nested** — group under \`field\`; access \`wire:field:subfield\` |

\`\`\`logts
<flags>:
    carry:1
    zero:1
    negative:1
    overflow:1
:

<instruction>:
    opcode:4
    flags:<flags>
    immediate:8
:

16wire<instruction> instr := 0
instr:flags:carry := 1
instr:opcode := \\5
show(instr)
show(instr:f)          # nested group only — breakdown of <flags> inside f
show(instr:f; <none>)  # flat blob — no semantic breakdown
\`\`\`

\`<none>\` is a **reserved** schema display tag (not a user-defined schema name). It disables field breakdown for that \`show\` / \`peek\` / \`probe\` call; numeric tags still apply (\`show(instr:f; <none> dec)\`).

Use \`doc(schema)\` to list defined schemas and \`doc(schema.name)\` for an indented definition tree (imported schemas expanded inline); \`doc(schema.none)\` documents this reserved tag.

\`show(wire:nestedField)\` on a nested container prints the sub-schema breakdown for that slice. Assignment to a nested container (\`instr:f := …\`) still requires subfields or a nested literal on the parent wire.

\`show(instr)\` prints nested groups with indentation. Wave Listen **inline** (\`auto\`) on scalars shows all leaf fields flat (\`carry=1 opcode=…\`); on vectors shows flat slot lines only. **Expand** uses the same tree as \`show\`.

**Nested literals** (phase 2):

\`\`\`logts
16wire<instruction> instr = {
    opcode=\\5
    flags={ carry=1 zero=0 }<flags>
    immediate=^0F
}<instruction>
\`\`\`

**LOAD** imports schemas from another file (line must start with \`<\`):

\`\`\`logts
<schemas/opcodes.logts
16wire<opcode> instr
\`\`\`

Within one script, referenced schemas must be defined in the same unit (or loaded via \`<path\`). Forward references within a file work when the parser resolves all \`<schema>:\` blocks at end of parse.

---

## Error reference

| Situation | Message (example) |
|-----------|-------------------|
| Wire vs schema width at decl | \`width mismatch between opcode (13bit) and definition (16bit)\` |
| Show with wrong schema width | \`opcode15 (15bit) width incompatible with wire (16bit)\` |
| Field on wire without schema | \`Wire instr has no schema for field access 'alu'\` |
| Unknown field | \`Unknown schema field 'foo' in schema 'opcode'\` |
| Literal overflow | \`Field 'cycles' overflow: value exceeds 2-bit capacity\` |
| Field assign strict width | \`Expected 4 bits, got 3 bits.\` |
| Nested field accessed flat | \`Field 'carry' is nested under 'flags' in schema 'instruction'; use instr:flags:carry\` |
| Circular schema reference | \`Circular schema reference: a → b → a\` |
| Duplicate after merge | \`Duplicate schema field 'version' in schema 'packet' (from merge of 'header')\` |
| Unknown schema | \`Unknown schema 'opcode'\` |
| Reserved schema name | \`Reserved schema name 'none' — choose another name for a user-defined schema\` |
| Ambiguous variable layout | \`Ambiguous variable array layout for schema '…'\` — see [Variable arrays (1D)](schema-variable-arrays.md) |

---

## Complete example

**Load & Run** — declare schema, literal init, field write, read, two show formats:

\`\`\`logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:

16wire<opcode> instr = { cycles=\\3 alu=\\5 }<opcode>
show(instr)

instr:jump = 1
4wire aluOut = instr:alu

show(instr; dec)
\`\`\`
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
| **NEXT(~)** | Wires that depend on \`~\`, \`%\`, or \`$\` (and their downstream dependents) are recomputed. Registers with \`REG(..., ~, ...)\` latch on \`NEXT\`. Other wires keep their current values. |
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

### \`NEXT(~)\` in Wave — partial cascade (like \`osc\`)

In **Wave**, \`NEXT(~)\` does **not** re-run every wire assignment from scratch (unlike the first **RUN**). Only wires in the **closure** of \`~\`, \`%\`, and \`$\` are recomputed, then dependents settle through the normal wave loop — similar to how an **osc** tick schedules only connected logic.

| Wire | After \`NEXT(~)\` in Wave |
|------|-------------------------|
| \`4wire x = 0000\` then \`x = 0011\` (no \`~\`) | Stays \`0011\` |
| \`1wire q = REG(data, ~, 0)\` | Latches \`data\` on NEXT |
| \`1wire y = NOT(q)\` | Updates when \`q\` changes |

**Legacy** still re-evaluates wire statements in program order inside \`NEXT\` (unchanged). Use **wave** for multi-step demos (Huffman scan, counters + \`on:raise\`) where state must persist between NEXT steps.

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

### Conditional assignment (\`on:\`)

Standalone \`on:<mode> { trigger, assignment }\` statements use the same trigger helpers as property blocks and are re-evaluated when trigger dependencies change during propagation. Multiple comma-separated assignments in one block run in order when the trigger fires — see [conditional-assignment.md](conditional-assignment.md) (tests **2123–2124**).

### Declarative wire re-evaluation

Top-level wire statements (\`Nwire x = expr\`) are tracked at elaboration. When a **dependency changes**, the engine re-runs the statement and cascades to wires that depend on its result:

| Dependency type | Example | Re-eval when |
|-----------------|---------|--------------|
| Component computed output | \`8wire idxSnap = .idx:get\` | Counter / reg \`:data\` updates (\`setCounter\`, property block write) |
| Writable LUT read | \`16wire lb = .links:get(key)\` | LUT mutation (\`:set\`, \`:add\`, …) or post-\`execStmts\` propagate |
| Writable LUT size | \`4wire sz = .heap:size()\` | Entry list changes |

Tests **2125–2127** (Huffman FSM). This replaces manual “stale wire” workarounds for typical \`.idx:get\` / \`:size\` / \`:get\` patterns.

### \`execStmts\` (test harness)

The Node/browser test session exposes \`execStmts(interp, src)\` to append and run fresh top-level statements against a live interpreter (e.g. after FSM ticks). On **wave** sessions it calls \`propagate()\` after exec so LUT reads and dependent wires settle. Protocol invocations (\`.huffPacket { … }\`) work because the parser is seeded with inline kinds from \`inlineInstances\` — see [protocol-parse.md — execStmts](protocol-parse.md#execstmts-secondary-parse).

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
| \`REG(..., ~, ...)\` + \`NEXT\` | Partial cascade (\`~\` closure) | Full re-eval in program order |
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
    'sock.md': `# Socket (\`sock\`) — dynamic bit stream

\`sock\` is a **language type** (not a component) for a mutable serial bit buffer. Bits are stored as \`0\`/\`1\` only; append at the back, peek or consume from the front.

Compare with [\`queue.md\`](queue.md): queue holds fixed-width **elements**; sock holds a single **bitstream**.

---

## Declaration

\`\`\`logts
sock rx              # sugar → 65536sock (65536 bit capacity)
65536sock rx         # explicit default capacity
1000sock tx          # cap = 1000 bit
\`\`\`

| Form | Capacity |
|------|----------|
| \`sock name\` | 65536 bit |
| \`Nsock name\` | N bit |

---

## Append and clear

\`\`\`logts-play
sock rx
rx << ^FF
rx << ^0F
show(rx)
rx << clear          # empty buffer (keyword clear only after <<)
# fallback:
rx:clear
\`\`\`

Append rejects **\`Z\`/\`X\`** in the source bitstring (even in \`MODE ZSTATE\`).

---

## Peek vs consume

| Form | Semantics |
|------|-----------|
| \`4wire x = rx./4\` | **Peek** — first 4 bits; sock unchanged |
| \`show(rx./8)\` | Peek for display |
| \`4wire x << rx./4\` | **Consume** — assign wire and remove 4 bits from front |

Slice canonical form: **\`rx./N\`** (front N bits). Dynamic length: **\`rx/(expr)\`** — length evaluated at runtime from a wire expression (e.g. \`4wire len : 0100\` then \`rx/(len)\`). Sugar **\`rx./(expr)\`** is equivalent. Consume is **only** through \`<<\` on a wire target.

\`\`\`logts-play
sock rx
rx << ^FF
4wire len : 0100
4wire peek = rx/(len)
4wire take << rx/(len)
show(BITSIZE(rx))
\`\`\`

---

## Dynamic slice examples

\`\`\`logts-play
sock rx
rx << ^F0F0
4wire n : 0100
4wire hdr = rx/(n)
show(hdr)
4wire body << rx/(4)
show(BITSIZE(rx))
\`\`\`

\`WWIDTH(rx/(8))\` resolves the slice width at runtime (8 when eight bits are available).

---

## Builtins

On sock, **\`BITSIZE(rx)\`** and **\`WWIDTH(rx)\`** both report **runtime length** (bits stored now), not declared capacity. Empty sock → \`0\`.

\`\`\`logts-play
sock rx
1wire bs = BITSIZE(rx)
1wire ww = WWIDTH(rx)
show(bs)
show(ww)
rx << ^FF
bs = BITSIZE(rx)
show(bs)
\`\`\`

### \`SOCKATTACHED(sock)\`

Returns **\`1\`** when the sock is **live-connected** on the network bus (\`openSock\` / \`connSock\`). Returns **\`0\`** after detach, \`closeSock\`, or peer **Stop**.

\`\`\`logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ openSock <- chat
  port = 1
  set = 1 }

1wire live = SOCKATTACHED(chat)
show(live)
\`\`\`

Server chat hub: poll \`SOCKATTACHED(upN)\` to detect client leave — [network-chat.md](network-chat.md).

### \`SOCKMODE(sock)\`

Returns **2 bits** describing which mutating operations are allowed on the sock:

| Bit | Meaning |
|-----|---------|
| **bit 0** (left) | **Consume** — \`wire << sock./N\` (destructive read from front) |
| **bit 1** (right) | **Append** — \`sock << …\` |

| State | \`SOCKMODE\` | Notes |
|-------|------------|-------|
| Local / detached | \`11\` | Both peek/consume and append |
| Connected **producer** (\`openSock <-\`) | \`01\` | Append only — see [network.md](network.md#permissions-connected) |
| Connected **consumer** (\`connSock ->\`) | \`10\` | Consume only |

\`\`\`logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ openSock <- chat
  port = 1
  set = 1 }

2wire mode = SOCKMODE(chat)
show(mode)
\`\`\`

Run a consumer on another instance with \`connSock\` — producer stays \`01\`, consumer reports \`10\`.

### \`SOCKPORT(sock)\` / \`SOCKTARGET(sock)\`

When **\`SOCKATTACHED(sock) === 1\`**, return the network bind metadata:

| Builtin | Width | Value |
|---------|-------|-------|
| \`SOCKPORT(sock)\` | 8 bit | Port number (\`1..255\`) |
| \`SOCKTARGET(sock)\` | 4 bit | **Producer** instance id (same \`target\` as \`connSock\`) |

When detached, both return **\`0\`**.

\`\`\`logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ target = 1
  connSock -> chat
  port = 2
  set = 1 }

8wire port = SOCKPORT(chat)
4wire target = SOCKTARGET(chat)
show(port)
show(target)
\`\`\`

Producer on instance 1 with \`port = 2\` → \`SOCKPORT\` = \`00000010\`, \`SOCKTARGET\` = \`0001\` on both ends.

### \`doc(sockName)\`

| Form | Output |
|------|--------|
| \`doc(sock)\` | Lists all declared socks with mode: \`consume & append\`, \`consume\`, \`append\`, or \`locked\` |
| \`doc(rx)\` | Full metadata for one sock |

\`doc(rx)\` / \`doc(chat)\` prints capacity, length, attach state, and (when live-connected) network bind info: \`comp [network]\` instance, channel, role, port, target, peer, bus state, consume/append permissions.

\`\`\`logts-play
sock rx
sock chat
doc(sock)
doc(rx)
\`\`\`

After \`openSock\` / \`connSock\`, \`doc(sock)\` shows \`append, attached\` on the producer and \`doc(chat)\` lists port, target, and permissions on each instance.

---

## Show / peek tags

Same display tags as wires (\`; u8\`, \`; dec\`, \`; hex\`, …). See [\`debug.md\`](debug.md).

\`\`\`logts-play
sock rx
rx << ^FF
show(rx)
show(rx; u8)
show(rx; dec)
peek(rx; dec)
\`\`\`

---

## Overflow / underflow

- **Overflow** — append would exceed \`Nsock\` cap → error
- **Underflow** — peek/consume more bits than stored → error

---

## Example — stream parse pattern

\`\`\`logts-play
sock rx
rx << ^F0F0
4wire op = rx./4
show(op)
4wire op2 << rx./4
show(BITSIZE(rx))
\`\`\`

After peek, \`BITSIZE(rx)\` stays 16; after consume, length drops by 4 each time.

---

## Protocol + sock

Parse protocols accept a **sock** as the \`data\` argument. Two invoke forms:

| Invoke | On sock | On wire (unchanged) |
|--------|---------|---------------------|
| \`{ data = rx }\` | **Peek** — parse on snapshot; sock unchanged | Static bitstring copy |
| \`{ data << rx }\` | **Consume** — parsed bits removed from front; rollback on error | Not supported |

**Anti-pattern (Wave):** copying the whole payload into a wire after header parse — e.g. \`payload << rx/(hdr:len)\` — duplicates the stream and breaks incremental processing. Leave the tail in \`rx\` and parse or slice incrementally.

See also [protocol-parse.md — Parse from sock](protocol-parse.md#parse-from-sock).

---

## Example — protocol consume (wave)

Pattern **“parse until you cannot, then wait”**: \`on:1\` re-fires when append increases \`BITSIZE(rx)\`; \`{ data << rx }\` consumes only the header; payload stays in the sock.

\`\`\`logts-play wave
inline [protocol] .parseHdr:
  mode: parse
  parseView: tree
  out:
    01001000
    opcode 4b
    len 8b
  :

sock rx
1wire ready : 0
20wire hdr : 0

on:1 {
  AND(ready, GT(BITSIZE(rx), 10011)),
  hdr =: .parseHdr { data << rx }
}

ready = 1
rx << 0100100010101100000111110000

show(BITSIZE(rx))
show(hdr:opcode)
\`\`\`

After **Load & Run**: header (20 bit) is consumed; \`BITSIZE(rx)\` is 8 (payload tail); \`show(hdr:opcode)\` prints \`1010\`.

---

## Example — manual slice consume (wave)

\`\`\`logts-play wave
sock rx
1wire ready : 0
4wire op : 0
on:1 { ready, op << rx./4 }
rx << ^F
ready = 1
show(op)
show(BITSIZE(rx))
\`\`\`

---

## Probe and watch

Non-destructive debug on the live buffer — same display tags as wires (\`; u8\`, \`; dec\`, \`; hex\`, …). See [\`debug.md\`](debug.md).

\`\`\`logts-play
sock rx
probe(rx)
watch(rx)
rx << ^FF
probe(rx; u8)
4wire hdr << rx./4
\`\`\`

\`probe(rx./4)\` peeks the front slice; append and consume update probe/watch without extra assignments. Signal Trace (Wave Listen) logs sock commits as \`commit sock rx\`.

---

## Related

- [\`queue.md\`](queue.md) — FIFO elements vs bit stream
- [\`network.md\`](network.md) — socket connections (\`openSock\` / \`connSock\`) cross-instance
- [\`protocol-parse.md\`](protocol-parse.md) — \`{ data = rx }\` peek vs \`{ data << rx }\` consume
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

> **Not the same as protocol \`def\`.** Inside \`inline [protocol]\`, \`def\` names a local bit segment ([protocol-assemble.md](protocol-assemble.md#def--local-segments)). This page is about **script-level** \`def name(type param, …):\`.

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
- [protocol-assemble.md](protocol-assemble.md) — protocol-local \`def\` (different feature)
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
1wire[2] idx = ARGMAX(m; row index)
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
| **Grouped literal** | \`\\2 \\23 \\242;8\` or \`\\170 \\187 \\204;u8\` | Multiple \`\\N\` values + one \`;tag\` on the last atom |
| **Decimal signed** | \`\\-3;s8\` | Two's complement on **exactly** \`W\` bits (\`;sW\`) |
| **Decimal unsigned width** | \`\\170;u8\` | Unsigned integer on **exactly** \`W\` bits (\`;uW\`, 1..64) |
| **Hex pattern** | \`^FF\` | Each hex digit → 4 bits (unsigned pattern) |
| **Hex value signed** | \`^-A;8\` | Signed numeric value in hex + **explicit** width |
| **Oct pattern** | \`o^12\` | Each oct digit → 3 bits (\`0\`–\`7\`) |
| **Base32hex pattern** | \`x^AB\` | RFC 4648 §7 — each digit → 5 bits (\`0\`–\`9\`, \`A\`–\`V\`) |
| **Crockford base32** | \`xc^10\` | Each digit → 5 bits (Crockford alphabet, no I/L/O/U) |
| **Wire string** | \`"Hello"\` / \`'Hi'\` | One byte per character (8 bit), MSB-first in the wire |
| **Logic** (ZSTATE) | \`?10Z0\` | Tristate \`0\` / \`1\` / \`Z\` / \`X\` |
| **Meta constant** | \`/instance/\` | Compile-time constant from the meta registry |

Postfixes shared by several forms:

| Postfix | Example | Effect |
|---------|---------|--------|
| **Bit range** | \`\\255.0-7\`, \`^FF.4/8\` | Slice after conversion to bits |
| **Padding** \`;p\` | \`\\12;8\`, \`^f;8\` | Pad unsigned **scalar** literal to \`p\` bits (left zeroes) |
| **Grouped tag** | \`\\2 \\-1;s8\`, \`\\170 \\187 \\204;u8\`, \`\\1.5;q4p4\` | Suffix on last atom applies to **all** elements in the group |

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

## Oct pattern (unsigned) — \`o^DIGITS\`

Caret after **\`o\`** starts an **octal pattern**: each digit \`0\`–\`7\` expands to **3 bits**.

\`\`\`logts-play
6wire v = o^12
show(v)
\`\`\`

| Form | Bits |
|------|------|
| \`o^12\` | \`001\` + \`010\` = \`001010\` (6 bits) |
| \`o^1;6\` | \`000001\` — \`;6\` is unsigned padding |

In short notation: \`\` \`[o^12]\` \`\`.

---

## Base32hex pattern — \`x^DIGITS\`

**\`x^\`** uses the RFC 4648 §7 alphabet (\`0\`–\`9\`, \`A\`–\`V\`). Each digit → **5 bits**.

\`\`\`logts-play
5wire v = x^A
show(v)
\`\`\`

\`x^A\` → \`01010\` (5 bits). Short notation: \`\` \`[x^AB]\` \`\`.

---

## Crockford base32 — \`xc^DIGITS\`

**\`xc^\`** uses the Crockford alphabet (excludes \`I\`, \`L\`, \`O\`, \`U\`). Each digit → **5 bits** with a **different** mapping than \`x^\`.

\`\`\`logts-play
10wire v = xc^10
show(v)
\`\`\`

Short notation: \`\` \`[xc^J0]\` \`\`.

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
| **NUL / control** | Real bytes in the wire | Display glyphs: \`◦\` \`↵\` \`·\` (see [debug.md](debug.md)) |

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

\`REPEAT(data, times)\` tiles a wire, **literal**, or bit expression **T** times. Plain wires concatenate; rank-1 tensors grow along the repeat axis (\`4wire[N]\` → \`4wire[N,T]\`, \`4wire[1,N]\` → \`4wire[T,N]\`). Matrices (\`R>1\`, \`C>1\`) are rejected. Max **16384** output bits. See [builtin-REPEAT.md](builtin-REPEAT.md).

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
