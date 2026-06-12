/**
 * Documentation bundle from doc/*.md (auto-generated).
 * Regenerate: node _gen_doc_data.js
 * Files: 14seg.md, adder.md, arithmetic.md, asm.md, board.md, chip.md, components.md, counter.md, debug.md, dip.md, divider.md, doc-function.md, dots.md, editorUI.md, future-component-ideas.md, interactive-components.md, key.md, lcd.md, led-bar.md, led.md, lut.md, mem.md, mini-cpu-plan.md, mini-cpu.md, multiplier.md, oscillator.md, pcb.md, reg.md, rotary.md, seven-seg.md, shifter.md, short-notation.md, signal-propagation.md, subtract.md, switch.md
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
- Related: [seven-seg.md](seven-seg.md), [lcd.md](lcd.md).
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
    'arithmetic.md': `# Arithmetic Built-in Functions

LogTscript provides four built-in arithmetic functions that compute results **instantly** — no clock cycle or component declaration is needed. Each function takes two bit-string operands of any width and returns **two values**: the primary result and a secondary output (carry, borrow, overflow, or remainder).

\`\`\`
ADD(Xbit a, Xbit b)      -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
DIVIDE(Xbit a, Xbit b)   -> Xbit result, Xbit mod
\`\`\`


---

## Syntax

Since all four functions return **two values**, they must always be assigned to two variables:

\`\`\`
Nwire result, 1wire carry = ADD(a, b)
Nwire result, 1wire carry = SUBTRACT(a, b)
Nwire result, Nwire over  = MULTIPLY(a, b)
Nwire result, Nwire mod   = DIVIDE(a, b)
\`\`\`

The bit width \`N\` of both inputs is \`max(len(a), len(b))\`. Short inputs are zero-padded on the left. The \`result\` output always has the same width \`N\`.

---

## ADD

**Binary addition with wrap-around.**

\`\`\`
ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry
\`\`\`

- \`result\` = \`(a + b) mod 2^N\` (N-bit sum, wraps at overflow)
- \`carry\` = \`1\` if \`a + b > 2^N - 1\`; \`0\` otherwise

### Examples

\`\`\`
4wire idx = 0011
4wire inc = 0001
4wire nextIdx, 1wire carry = ADD(idx, inc)
# nextIdx = 0100  (3 + 1 = 4)
# carry   = 0
\`\`\`

\`\`\`
4wire idx2 = 1111
4wire inc2 = 0001
4wire nextIdx2, 1wire carry2 = ADD(idx2, inc2)
# nextIdx2 = 0000  (15 + 1 = 16 → wraps to 0)
# carry2   = 1
\`\`\`

\`\`\`
8wire a = 11111111
8wire b = 00000001
8wire r, 1wire c = ADD(a, b)
# r = 00000000  (255 + 1 → wraps)
# c = 1
\`\`\`

### Use cases

- Incrementing a counter or pointer
- Implementing ripple-carry adders in logic scripts
- Building ALU-like circuits without using \`comp.adder\`

---

## SUBTRACT

**Binary subtraction with wrap-around (two's complement style).**

\`\`\`
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
\`\`\`

- \`result\` = \`(a - b) mod 2^N\` (wraps on underflow)
- \`carry\` = \`1\` if \`a < b\` (borrow occurred); \`0\` otherwise

### Examples

\`\`\`
4wire idx = 0011
4wire dec = 0001
4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)
# prevIdx = 0010  (3 - 1 = 2)
# carry   = 0
\`\`\`

\`\`\`
4wire idx2 = 0000
4wire dec2 = 0001
4wire prevIdx2, 1wire carry2 = SUBTRACT(idx2, dec2)
# prevIdx2 = 1111  (0 - 1 → wraps to 15)
# carry2   = 1
\`\`\`

\`\`\`
4wire a = 1010
4wire b = 1010
4wire r, 1wire c = SUBTRACT(a, b)
# r = 0000  (10 - 10 = 0)
# c = 0
\`\`\`

### Use cases

- Decrementing a counter or pointer
- Checking whether \`a >= b\` via the carry bit

---

## MULTIPLY

**Binary multiplication with overflow capture.**

\`\`\`
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
\`\`\`

- \`result\` = low \`N\` bits of \`a * b\`
- \`over\` = high \`N\` bits of \`a * b\` (the overflow portion, shifted right by \`N\`)

The full product is \`(over << N) | result\`.

### Examples

\`\`\`
4wire a = 0010
4wire b = 0011
4wire result, 4wire over = MULTIPLY(a, b)
# result = 0110  (2 * 3 = 6)
# over   = 0000  (no overflow)
\`\`\`

\`\`\`
4wire a2 = 1111
4wire b2 = 1111
4wire result2, 4wire over2 = MULTIPLY(a2, b2)
# 15 * 15 = 225 = 0b11100001
# result2 = 0001  (225 & 0xF  = low 4 bits)
# over2   = 1110  (225 >> 4   = high 4 bits)
\`\`\`

\`\`\`
4wire a3 = 1111
4wire b3 = 0000
4wire result3, 4wire over3 = MULTIPLY(a3, b3)
# result3 = 0000
# over3   = 0000
\`\`\`

### Use cases

- Scaling values
- Computing addresses (base + stride * index)
- Detecting numeric overflow via the \`over\` output

---

## DIVIDE

**Binary integer division with remainder.**

\`\`\`
DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
\`\`\`

- \`result\` = integer quotient \`floor(a / b)\`, masked to \`N\` bits
- \`mod\` = remainder \`a % b\`, masked to \`N\` bits
- If \`b = 0\`, both \`result\` and \`mod\` are \`0\` (no error thrown)

### Examples

\`\`\`
4wire a = 0110
4wire b = 0010
4wire result, 4wire mod = DIVIDE(a, b)
# result = 0011  (6 / 2 = 3)
# mod    = 0000  (6 % 2 = 0)
\`\`\`

\`\`\`
4wire a2 = 0111
4wire b2 = 0010
4wire result2, 4wire mod2 = DIVIDE(a2, b2)
# result2 = 0011  (7 / 2 = 3)
# mod2    = 0001  (7 % 2 = 1)
\`\`\`

\`\`\`
4wire a3 = 0001
4wire b3 = 0011
4wire result3, 4wire mod3 = DIVIDE(a3, b3)
# result3 = 0000  (1 / 3 = 0)
# mod3    = 0001  (1 % 3 = 1)
\`\`\`

\`\`\`
4wire a4 = 0110
4wire b4 = 0000
4wire result4, 4wire mod4 = DIVIDE(a4, b4)
# result4 = 0000  (division by zero → 0)
# mod4    = 0000
\`\`\`

### Use cases

- Computing modular indices (e.g. circular buffers)
- Checking divisibility via the \`mod\` output
- Fixed-point scaling

---

## Comparison with component equivalents

These built-in functions are **combinational** — they produce their result immediately when evaluated, without state or clock:

| Built-in | Component equivalent | Difference |
|----------|----------------------|------------|
| \`ADD(a, b)\` | \`comp [adder]\` | No declaration, instant result |
| \`SUBTRACT(a, b)\` | \`comp [subtract]\` | No declaration, instant result |
| \`MULTIPLY(a, b)\` | \`comp [multiplier]\` | No declaration, instant result |
| \`DIVIDE(a, b)\` | \`comp [divider]\` | No declaration, instant result |

Use the **built-in functions** when you need a quick one-off calculation.
Use the **components** when you need a named, persistent device with pins that other parts of the circuit can wire to (e.g. in a PCB definition).

---

## doc() support

\`\`\`
doc(ADD)
# ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry

doc(SUBTRACT)
# SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry

doc(MULTIPLY)
# MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over

doc(DIVIDE)
# DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
\`\`\`

Use \`doc(def)\` to list all built-in functions (including ADD, SUBTRACT, MULTIPLY, DIVIDE) alongside any user-defined functions:

\`\`\`
doc(def)
\`\`\`

Output:

\`\`\`
built-in:
NOT, AND, OR, XOR, NXOR, NAND, NOR, EQ, LATCH, LSHIFT, RSHIFT, MUX, DEMUX, ADD, SUBTRACT, MULTIPLY, DIVIDE, REG

user defined:
(none)
\`\`\`
`,
    'asm.md': `# Inline ASM — Instruction Set Architecture

Define a custom ISA with \`inline [asm]\`, then assemble programs to a **binary blob** with \`.myisa { ... }\` or \`myisa { ... }\` anywhere an expression is allowed.

Instance names use letters and digits only (no \`_\`).

\`[asm]\` is the **inline kind** (more kinds may follow later). Memory (\`comp [mem]\`) receives the assembled blob unchanged.

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

8wire nop = myisa { NOP }
8wire load = myisa { LOAD R1 A3 }
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
  = myisa {
    NOP
    LOAD R1 A3
  }
  :

8wire slot0 = .prog:get
show(slot0)
\`\`\`

Validations (interpreter): \`wordWidth === mem.depth\`, \`instructionCount <= mem.length\`.

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

.prog = myisa { NOP }
8wire slot0 = .prog:get
show(slot0)
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
doc(.myisa)
\`\`\`

\`doc(inline)\` lists instances; \`doc(.myisa)\` shows the opcode layout for that instance.

---

## Errors

| Situation | Example message |
|-----------|-----------------|
| Undefined label | \`Undefined label 'nowhere'\` |
| Signed overflow | \`Relative jump offset (-21) is out of bounds...\` |
| Wrong prefix | \`'LOAD' expects a Register prefix (R)...\` |
| mem depth | \`ISA encodes 8 bits per instruction but mem depth is 4\` |
| Wire width | \`Bit-width mismatch: x is 50bit but assembled program provides 48 bits\` |

Assembler errors include the source line and \`^^^\` under the problematic token when possible.
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
    'components.md': `# Component index

LogTscript includes built-in **components** (\`comp\`), reusable **board** blocks (\`board\`), lightweight **chip** blocks (\`chip\`), and legacy **PCB** (\`pcb\`). Use \`doc(comp)\`, \`doc(board)\`, \`doc(chip)\`, or \`doc(pcb)\` in the editor for live signatures.

---

## Composite blocks

| Topic | Page |
|-------|------|
| **Board** — interactive circuits, wave propagation (recommended) | [board.md](board.md) |
| Chip — reusable logic without UI | [chip.md](chip.md) |
| PCB — deprecated, legacy propagation | [pcb.md](pcb.md) |
| **Mini CPU demo** — Harvard step CPU (chip ALU + board) | [mini-cpu.md](mini-cpu.md) |
| **Future component ideas** — brainstorming backlog (no roadmap) | [future-component-ideas.md](future-component-ideas.md) |

---

## Interactive inputs (panel)

| Component | Shortname | Page |
|-----------|-----------|------|
| \`switch\` | — | [switch.md](switch.md) |
| \`key\` | — | [key.md](key.md) |
| \`dip\` | — | [dip.md](dip.md) |
| \`rotary\` | — | [rotary.md](rotary.md) |

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

| Component | Shortname | Page |
|-----------|-----------|------|
| \`mem\` | — | [mem.md](mem.md) |
| \`lut\` | — | [lut.md](lut.md) |
| \`reg\` | — | [reg.md](reg.md) |
| \`osc\` | \`~\` | [oscillator.md](oscillator.md) |

---

## Reference

| Topic | Page |
|-------|------|
| \`doc()\` signatures | [doc-function.md](doc-function.md) |
| \`show\` / \`peek\` / \`probe\` | [debug.md](debug.md) |
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
    'debug.md': `# Debug output — \`show\`, \`peek\`, and \`probe\`

Three statements write values to the **Output** panel. They are useful for inspecting wires, storage references, and how values change over time.

All three are **statements** (like \`doc\`) — they cannot appear on the right side of \`=\`.

---

## Quick comparison

| | \`show\` | \`peek\` | \`probe\` |
|---|--------|--------|---------|
| **Purpose** | Display settled values | Instant snapshot | Monitor every value commit |
| **When it emits** | End of **RUN** / **NEXT** (after propagation on Wave) | Immediately at statement position | On every **committed** change |
| **Position in script** | Matters | Matters | **Does not matter** (registered at elaboration) |
| **Arguments** | One or more expressions | One or more expressions | **Exactly one** expression |
| **Output format** | \`name (type) = value\` | same | \`# name = value (ref) - reason\` |
| **Wave vs Legacy** | Deferred on Wave until settle | Immediate | Same commit hooks in both modes |

For when wires update in the circuit, see [signal-propagation.md](signal-propagation.md).

---

## \`show\`

### Syntax

\`\`\`
show(expr1, expr2, ...)
\`\`\`

Each argument is an expression atom: wire name, component reference (\`.comp:get\`), bit slice (\`a.0\`, \`a.2-4\`), storage ref (\`&3\`), literal, etc.

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
peek(expr1, expr2, ...)
\`\`\`

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

---

## Wave vs Legacy (quick reference)

| Statement | Wave (editor default) | Legacy (tests default) |
|-----------|----------------------|-------------------------|
| \`show\` | Deferred until end of RUN / propagate flush | Emitted when the statement runs |
| \`peek\` | Immediate read at statement | Immediate read + cascade already applied |
| \`probe\` | On every value commit | Same |

\`probe\` is the only one that keeps reporting when values change **after** the initial RUN (e.g. toggling a switch, pressing a key, \`setWire\` in tests, oscillator ticks). See runnable examples above and tests **804–819** / **800–801**.

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires and displays update
- [Editor UI](editorUI.md) — Output panel, Run, Next, Wave / Legacy toggle
- [doc() function](doc-function.md) — \`doc(def)\` lists \`show\` as a built-in
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
doc(FunctionName)
doc(comp)
doc(comp.type)
doc(board)
doc(board.type)
doc(pcb)
doc(pcb.type)
\`\`\`

---

## Usage

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

### Logic gates

| Call | Output |
|------|--------|
| \`doc(NOT)\` | \`NOT(Xbit) -> Xbit\` |
| \`doc(AND)\` | \`AND(Xbit) -> 1bit\` / \`AND(Xbit, Xbit) -> Xbit\` |
| \`doc(OR)\` | \`OR(Xbit) -> 1bit\` / \`OR(Xbit, Xbit) -> Xbit\` |
| \`doc(XOR)\` | \`XOR(Xbit) -> 1bit\` / \`XOR(Xbit, Xbit) -> Xbit\` |
| \`doc(NXOR)\` | \`NXOR(Xbit) -> 1bit\` / \`NXOR(Xbit, Xbit) -> Xbit\` |
| \`doc(NAND)\` | \`NAND(Xbit) -> 1bit\` / \`NAND(Xbit, Xbit) -> Xbit\` |
| \`doc(NOR)\` | \`NOR(Xbit) -> 1bit\` / \`NOR(Xbit, Xbit) -> Xbit\` |
| \`doc(EQ)\` | \`EQ(Xbit, Xbit) -> 1bit\` |
| \`doc(LATCH)\` | \`LATCH(Xbit data, 1bit clock) -> Xbit\` |

**\`Xbit\`** means the function accepts a bit string of any width.

**1-argument mode** (fold): \`OR(a)\` applies OR across all bits of \`a\`, yielding **1 bit**.

**2-argument mode** (bitwise): \`OR(a, b)\` applies OR bit-by-bit between \`a\` and \`b\`, yielding **N bits**.

### Shift

| Call | Output |
|------|--------|
| \`doc(LSHIFT)\` | \`LSHIFT(Xbit data, Nbit n) -> Xbit\` / \`LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit\` |
| \`doc(RSHIFT)\` | \`RSHIFT(Xbit data, Nbit n) -> Xbit\` / \`RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit\` |

- \`data\` — the bit string to shift
- \`n\` — number of positions (in binary)
- \`fill\` *(optional)* — fill bit (default \`0\`)

### Register (REG)

Width is inferred from \`data\` at runtime — there is only the generic \`REG\` (no \`REG1\`, \`REG4\`, \`REG8\`, etc.):

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

\`doc(REG8)\` and similar fixed-width names are **not** supported — use \`doc(REG)\` only.

Full behaviour: [reg.md](reg.md).

### Multiplexers (MUX1 / MUX2 / MUX3)

\`\`\`
doc(MUX1)
\`\`\`

Output:

\`\`\`
MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit
\`\`\`

| Call | Signature |
|------|-----------|
| \`doc(MUX1)\` | \`MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit\` |
| \`doc(MUX2)\` | \`MUX2(2bit sel, Xbit data0, Xbit data1, Xbit data2, Xbit data3) -> Xbit\` |
| \`doc(MUX3)\` | \`MUX3(3bit sel, Xbit data0, ..., Xbit data7) -> Xbit\` |

\`sel\` is the selector: \`MUX1\` → 1 bit (2 inputs), \`MUX2\` → 2 bits (4 inputs), \`MUX3\` → 3 bits (8 inputs).

### Demultiplexers (DEMUX1 / DEMUX2 / DEMUX3)

\`\`\`
doc(DEMUX1)
\`\`\`

Output:

\`\`\`
DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit
\`\`\`

| Call | Signature |
|------|-----------|
| \`doc(DEMUX1)\` | \`DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit\` |
| \`doc(DEMUX2)\` | \`DEMUX2(2bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit\` |
| \`doc(DEMUX3)\` | \`DEMUX3(3bit sel, Xbit data) -> Xbit x8\` |

DEMUX returns a **vector** of \`2^n\` outputs: one contains \`data\`, the rest are \`0\`.

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

\`doc(def)\` displays all available built-in functions and all user-defined functions, separated into two sections:

\`\`\`
doc(def)
\`\`\`

Output:

\`\`\`
built-in:
NOT, AND, OR, XOR, NXOR, NAND, NOR, EQ, LATCH, LSHIFT, RSHIFT, REG, MUX, DEMUX, MUX1, MUX2, MUX3, DEMUX1, DEMUX2, DEMUX3, ADD, SUBTRACT, MULTIPLY, DIVIDE

user defined:
myFunc, helper, ...
\`\`\`

If no user-defined functions exist:

\`\`\`
built-in:
NOT, AND, OR, ...

user defined:
(none)
\`\`\`

---

## User-defined functions

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

> **Note on \`mem\`:** \`doc(comp.mem)\` shows \`= Xbit\` because \`mem\` supports initialization with \`= literal\`, \`= ^hex\`, or \`= varName\` in the declaration, and bulk re-initialization via \`.mem = value\` after declaration. The value is split into \`depth\`-bit chunks across consecutive addresses. See [mem.md](mem.md) for details.

### All available components

| Call | Guide |
|------|-------|
| \`doc(comp.led)\` | [led.md](led.md) |
| \`doc(comp.switch)\` | [switch.md](switch.md) |
| \`doc(comp.key)\` | [key.md](key.md) |
| \`doc(comp.dip)\` | [dip.md](dip.md) |
| \`doc(comp.rotary)\` | [rotary.md](rotary.md) |
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
chip.xyz: tip chip nedefinit
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

For what Wave and Legacy mean internally, see [signal-propagation.md](signal-propagation.md).

---

## Run

**Button:** \`Run\`

Executes the full program from the editor:

1. Clears the devices panel and output (fresh run).
2. Parses and runs all statements.
3. Creates a new interpreter using the **propagation mode** selected in the pill toggle (see below).
4. Shows \`show\` / \`peek\` / \`probe\` output and updates the Variables panel (see [debug.md](debug.md)).

Use **Run** after changing code or after switching Wave / Legacy so the new mode takes effect.

---

## Next

**Button:** \`Next\`

Advances simulation time for wires that depend on \`~\` (one \`NEXT(~)\` step per click).

- Requires a program that has already been started with **Run**.
- Uses the **same interpreter** (and thus the same propagation mode) as the last **Run**.
- Does not re-parse the editor; it only executes \`NEXT\` on the running session.

The auto-step buttons (\`S\` / interval) call the same **Next** logic on a timer.

---

## Propagation toggle (Wave / Legacy)

**Control:** pill button between **Next** and **S** — label shows the active mode.

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

### Command line

If you run a command from the Command panel before any **Run**, the lazy-started interpreter also uses the current toggle setting.

---

## Quick reference

| Control | Action |
|---------|--------|
| **Run** | Full execute; applies current Wave / Legacy mode |
| **Next** | \`NEXT(~)\` on last Run’s interpreter |
| **wave / legacy** | Select propagation for next Run (orange = wave, green = legacy) |

---

## Related documentation

- [Debug output](debug.md) — \`show\`, \`peek\`, \`probe\`
- [Signal propagation](signal-propagation.md) — Wave vs Legacy behaviour
- [REG](reg.md) — registers and \`NEXT\`
- [Interactive components](interactive-components.md) — panel inputs and wire updates
`,
    'future-component-ideas.md': `# Future component ideas — LogTScript

Brainstorming catalog for possible components or extensions, based on what the simulator already supports and lessons from the mini-CPU demo. **No** implementation order, estimates, or technical design — pick ideas one at a time when you decide.

Each table is followed by numbered subsections (A1, B2, …) with a short explanation of **what it does** and **how it could be used** in this simulator.

---

## Short context (what exists today)

**\`comp\` components:** switch, key, dip, rotary, led, bar, 7seg, 14seg, lcd, dots, adder, subtract, multiplier, divider, shifter, counter, mem, reg, osc.

**Built-ins (no panel):** logic (NOT, AND, OR, MUX, DEMUX, EQ, LATCH…), REG, instant arithmetic (ADD, SUBTRACT, MULTIPLY, DIVIDE), LSHIFT/RSHIFT.

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
| **Stack** (\`stack\`) | Push/pop + stack pointer, for subroutines |
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

**How I see it used:** Harvard teaching CPU with one memory type that is clearly “program” — \`.rom:\` with \`= ^10334221\` init, fetch via \`.rom:{ at = pc }\` and \`.rom:get\`, no write pins in student-facing docs. Clearer story than \`comp [mem] .prog\` where the same component also supports writes.

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

### A7. Stack (\`stack\`)

**What it does:** A LIFO structure: \`push\` writes value at stack pointer and decrements/increments SP; \`pop\` reads and adjusts SP. Often bundled with a small RAM or internal storage and a \`sp\` output for debugging.

**How I see it used:** Subroutines (\`CALL\` / \`RET\`), saving return address on push, restoring on pop. Expression evaluation demos. Students see SP move in the variables panel or via \`probe(.stack:sp)\`.

**Today:** Second \`comp [counter]\` as SP + \`comp [mem]\` as stack array + manual address arithmetic in property blocks. A \`stack\` comp hides index math and documents the pattern.

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
| **LUT / lookup table** | Small address → value table without explicit logic |
| **Priority encoder** | For IRQ, keyboard scan, simple arbiter |
| **Tristate / bus buffer** | Shared bus, enable/disable output |
| **Latch / D-FF as comp** | Clear level-trigger vs edge (alongside REG and reg) |
| **Clock divider** | Frequency divider from oscillator |
| **Ripple-carry chain** | More bits in one block (alongside existing adder) |

### B1. MUX / DEMUX

**What it does:** **MUX** — N data inputs + selector → one output carries the selected input. **DEMUX** — one data input + selector → data appears on one of N outputs, others are \`0\`.

**How I see it used:** ALU output select (add vs sub), building buses, routing one RAM output to PC or ACC. In the panel as \`.mux_sel:\` with pins \`d0\`, \`d1\`, \`sel\`, \`y\` so beginners see the chip shape, not only \`MUX(sel, a, b)\` in code.

**Today:** \`MUX\`, \`MUX1\`–\`MUX3\`, \`DEMUX\`, \`DEMUX1\`–\`DEMUX3\` are built-ins; mini-CPU uses \`MUX()\` inline. As \`comp\`, same logic, plus \`probe(.mux:y)\`, property blocks, and consistency with \`comp [adder]\`.

---

### B2. LUT / lookup table

**What it does:** Fixed table: address in (e.g. 4 bits) → value out (e.g. 8 bits) **combinational**, no clocked read cycle. Every address maps to a preloaded word.

**How I see it used:** Opcode → control signals (one LUT replaces many \`EQ\` lines); hex digit → 7-segment pattern; microcode ROM; small math tables (square, sine quantized). Teaching “FPGA uses LUTs to implement any truth table”.

**Today:** Read-only pattern via \`mem\` + property blocks (sequential), or many MUX/EQ wires. A true LUT comp would behave like \`ADD()\` — instant read — with init \`= ^hex\` like \`mem\`.

---

### B3. Priority encoder

**What it does:** Opposite of decoder in spirit: several input lines (e.g. “request” bits), outputs the **index** of the highest-priority line that is \`1\`, plus sometimes a \`valid\` flag if any input is active.

**How I see it used:** Simple interrupt arbitration (which device gets service); keyboard matrix scan (which key pressed); first-one-wins bus grant. Pairs naturally with a future IRQ controller idea (section D).

**Today:** Chain of MUX and priority logic in a \`chip\`, or manual comparison. No built-in; moderate teaching value for systems topics.

---

### B4. Tristate / bus buffer

**What it does:** Output drivers that can be **high**, **low**, or **high-impedance (off)** when \`enable\` is false. Lets multiple sources share one bus wire without fighting — only one enabled at a time.

**How I see it used:** Shared data bus between CPU, RAM, and I/O; teaching why you cannot tie two outputs together without control. Multiple \`buffer\` comps on one bus wire with mutually exclusive \`en\` signals.

**Today:** LogTScript wires are a single driven value — no real Z state in simulation. A buffer comp would model enable/disable semantics (e.g. only propagate when \`en=1\`, else bus holds previous or floats as \`Z\` in display). Some engine/display decisions needed.

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
| **Text terminal** | Text “console” beyond simple LCD |

### C1. Slider

**What it does:** Panel control (drag or buttons) that outputs an N-bit binary value, continuously or in steps — one widget instead of N toggle bits.

**How I see it used:** Set operand A for ALU demos; simulate analog-ish input (volume, threshold); program speed. Friendlier than \`comp [dip]\` with \`length: 8\` for quick labs.

**Today:** \`comp [dip]\` or \`comp [rotary]\` cover discrete values; slider fills the gap for “many values, one control” UX.

---

### C2. Button matrix

**What it does:** A grid of keys (e.g. 4×4) scanned by row/column logic, outputting key code or row/col wires when a key is pressed.

**How I see it used:** Calculator keyboard; game input; scan demo with \`priority encoder\` (B3). Shows matrix wiring + debounce + encode in one panel widget.

**Today:** Many separate \`comp [key]\` instances — works but clutters the panel. Matrix is one component + optional scan logic in board.

---

### C3. GPIO port

**What it does:** A fixed bundle — e.g. 8 input bits (DIP or switches) and 8 output bits (LEDs) — named as one port \`P0\`, like a microcontroller GPIO register.

**How I see it used:** “Write \`0b10101010\` to port B, read switches from port A” without eight separate declarations. Microcontroller-style labs on the teaching CPU (OUT / IN instructions).

**Today:** Eight \`dip\` + eight \`led\` comps. GPIO is grouping and naming for cleaner scripts and docs.

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

### C6. Text terminal

**What it does:** Scrollable text area: append characters or lines when written to a port; optional cursor, newline, simple escape codes — richer than fixed \`comp [lcd]\` rows.

**How I see it used:** \`PRINT\` instruction on teaching CPU; serial RX shows incoming bytes as ASCII; shell demo. Program output students can read without parsing 7seg hex.

**Today:** \`comp [lcd]\` for fixed character grids. Terminal is more lines, scrolling, and stream semantics.

---

## D. Advanced (higher effort, more specialized benefit)

| Idea | Summary |
|------|---------|
| **FIFO / queue** | Buffer for serial, pipeline, waiting for data |
| **Timer / watchdog** | Timeout, periodic reset |
| **Interrupt controller** | Event / IRQ model |
| **DMA / bus arbiter** | Master/slave on shared bus |
| **EEPROM / persistence** | State that survives page reload |

### D1. FIFO / queue

**What it does:** First-in-first-out buffer: \`push\` on one side, \`pop\` on the other; \`full\`/\`empty\` flags; fixed depth (e.g. 8 entries).

**How I see it used:** Decouple UART RX from CPU (bytes queue until CPU pops); pipeline stage between fetch and execute; producer/consumer without losing data when speeds differ.

**Today:** No queue primitive; \`mem\` + read/write pointers in script approximates it with manual discipline. FIFO comp encodes pointer wrap and flags.

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
| **Assembler / program loader** | Language feature, not a panel device |
| **Logic analyzer / timeline** | Wire visualization over time (mostly UI/debug) |

### E1. Assembler / program loader

**What it does:** Tool or language syntax that turns mnemonics (\`LOAD 0\`, \`ADDI 3\`) into \`= ^hex\` ROM init or \`.mem =\` blobs — optionally labels, branches, listing file.

**How I see it used:** Students write assembly in editor tab; Run loads words into \`.prog\` mem. Avoids hand-encoding \`10334221\`. Could be preprocessor, separate panel, or \`asm { ... }\` block.

**Today:** Manual hex in \`mem\` init (mini-CPU demo). Loader improves workflow, not simulation semantics.

---

### E2. Logic analyzer / timeline

**What it does:** UI that plots selected wires (\`clk\`, \`pc\`, \`acc\`) vs time — like \`probe\` history or a saleae-style trace, not a single snapshot in Output.

**How I see it used:** Debug why CPU missed a latch; compare Wave vs Legacy timing; export trace for assignments. Complements \`probe\`, \`show\`, \`peek\` in [debug.md](debug.md).

**Today:** Output panel shows discrete \`#\` lines; no built-in waveform viewer for arbitrary wires. Mostly editor/UI work; \`osc\` already has real-time toggling.

---

## F. What you can already do without a new component

From mini-CPU and existing docs — useful when an idea above seems “already covered”:

- IR, bus, decoder → **chip** + MUX + wires
- Stack → second **counter** + **mem**
- Program in ROM → \`= ^hex\` init on **mem**
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
2. **More combinational \`comp\`** — MUX, LUT, buffer, latch
3. **I/O and interfaces** — UART, slider, GPIO, terminal
4. **Infrastructure** — dual-port mem, FIFO, timer

---

## Related docs

- [Component index](components.md)
- [Mini CPU demo](mini-cpu.md)
- [Mini CPU feasibility plan](mini-cpu-plan.md)
`,
    'interactive-components.md': `# Interactive components

Per-component pages: [switch.md](switch.md), [key.md](key.md), [dip.md](dip.md), [rotary.md](rotary.md). Full catalog: [components.md](components.md).

**Switch**, **key**, **dip**, and **rotary** are input components you control from the devices panel while the program is running. Their values feed into wires and logic — when you flip a switch, press a key, change a DIP position, or turn a rotary knob, connected wires update automatically.

See [signal-propagation.md](signal-propagation.md) for how those updates spread through your circuit.

The **oscillator** (\`osc\`) also drives wires in real time, but it is **not** a panel control — it runs on its own timer. See [oscillator.md](oscillator.md).

---

## Panel callbacks (press vs toggle)

Inside the engine, each panel control uses a small callback when you interact with it. You do not write these callbacks in LogTScript; they are wired up when the component is created.

| Component | UI callback | When it runs |
|-----------|-------------|--------------|
| \`key\` | **\`onPress\`** | Mouse/touch down — output becomes \`1\` |
| \`key\` | **\`onRelease\`** | Mouse/touch up — output returns to \`0\` |
| \`switch\` | \`onChange\` | Each time you toggle the control |
| \`dip\` | \`onChange\` | Each time you flip one DIP position (\`index\`, \`checked\`) |
| \`rotary\` | \`onChange\` | When the selected **state** changes (drag or step the knob) |

**Only \`key\` uses \`onPress\` / \`onRelease\`.** All other panel inputs above use \`onChange\` (or, for the oscillator, automatic HIGH/LOW transitions — not user clicks).

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
| \`.name\` | 1 bit (switch, key) or multi-bit (dip, rotary) | Direct value |
| \`.name:get\` | Same | Explicit read (equivalent for these components) |
| \`.name.N\` | 1 bit | Single bit \`N\` of a **dip** only (leftmost = \`0\`) |

Use a wire width that matches the component: \`1wire\` for switch and key, \`Nwire\` for a dip with \`length: N\`, and \`ceil(log₂(states))\` bits for a rotary with \`states: N\` (e.g. \`states: 8\` → \`3wire\`).

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

## Comparison

| Component | Bits | User action | Panel callback | Value while idle |
|-----------|------|-------------|----------------|------------------|
| \`switch\`  | 1    | Toggle      | \`onChange\`     | Stays \`0\` or \`1\` |
| \`key\`     | 1    | Press/release | **\`onPress\` / \`onRelease\`** | \`0\` |
| \`dip\`     | N    | Flip each position | \`onChange\` | Holds last pattern |
| \`rotary\`  | \`ceil(log₂(states))\` | Drag / step knob | \`onChange\` | Holds last state |
| \`osc\`     | 1 (+ counter) | *(automatic timer)* | HIGH/LOW ticks | Oscillates — see [oscillator.md](oscillator.md) |

---

## Component documentation

\`\`\`
doc(comp.switch)
doc(comp.key)
doc(comp.dip)
doc(comp.rotary)
\`\`\`

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires update after UI changes
- [Oscillator](oscillator.md) — real-time \`osc\` (not a panel button, but live wire driver)
- [LED](led.md) — displaying values driven by switches and keys
- [doc() function](doc-function.md) — full \`doc(comp.*)\` listing
`,
    'key.md': `# Key component

\`comp [key]\` is a **momentary button**: output is \`1\` while pressed and \`0\` when released. Uses \`onPress\` / \`onRelease\` in the engine (unlike switch/dip which use \`onChange\`).

Signature: \`doc(comp.key)\` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

\`\`\`
comp [key] .name:
  label: 'A'
  size: 36
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
| \`type\`    | integer | \`0\`     | Visual style variant |
| \`nl\`      | flag    | (no)    | Newline after the button |

---

## Output

- **1 bit**: \`0\` (released) or \`1\` (pressed)

---

## Example — level-sensitive property block

\`\`\`logts-play
comp [key] .btn:
  label: 'Go'
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

## Notes

- Use **key** for pulses; use [switch.md](switch.md) for a latched state.
- \`probe(.btn)\` tracks press/release in the Output panel — [debug.md](debug.md).
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
    'lut.md': `# LUT component (\`lut\`)

The \`lut\` component is a **combinational lookup table**: when the address on pin \`in\` changes, output \`get\` updates in the **same propagation step** (like \`ADD()\` / \`MUX()\`, not like clocked \`mem\`).

There is **no panel UI** in v1 — logic only (similar to divider/adder devices).

---

## Declaration

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

### Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| \`depth\` | \`4\` | Output width (bits after \`:\` in \`data\` and on pout \`get\`) |
| \`length\` | \`16\` | Number of table slots (addresses \`0 .. length-1\`) |
| \`fillwith\` | \`000…0\` (\`depth\` zeros) | Value for slots **not** listed in \`data { }\` |

Pin \`in\` width is \`max(1, ceil(log2(length)))\` bits.

---

## \`= data { }\` — table contents

Parsed from source (decimal \`\\N\` and hex \`^N\` are **address indices**, not wire literals).

| Address format | Example | Meaning |
|----------------|---------|---------|
| Binary | \`0\`, \`010\`, \`1001\` | \`parseInt(bits, 2)\` |
| Decimal | \`\\2\`, \`\\50\` | decimal index |
| Hex | \`^a\`, \`^Ff\` | hex index |
| Range | \`addr - addr\` | inclusive; mixed formats OK |

**Values** after \`:\` must be binary literals of exactly **\`depth\`** bits.

Unmapped slots use \`fillwith\`. Overlapping ranges: **last entry wins**. Address \`>= length\` → parse error.

---

## Runnable — basic lookup (method B)

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

Address \`0011\` (binary) = slot **3** → value \`0010\`.

---

## Runnable — unmapped slots and \`fillwith\`

\`\`\`logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \\1 - \\5   : 0010
  }
  :

.lut:in = 0110
4wire y = .lut:get
show(y)
\`\`\`

Slot **6** is not in \`data { }\` → output is \`fillwith\` (\`0110\`).

---

## Runnable — address formats

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

---

## Runnable — method A (inline invocation)

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
show(y)
\`\`\`

Only pin \`in\` is supported in v1; result is always pout \`get\`.

---

## Runnable — \`probe\` and \`doc()\`

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

\`doc(.decoder)\` example output:

\`\`\`text
.decoder (comp [lut])
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

## vs \`mem\`

| | \`lut\` | \`mem\` |
|---|-------|-------|
| Timing | Combinational (zero extra delay) | Property blocks + \`on:\` trigger |
| Read | \`.lut:get\` or inline invoke | \`.mem:get\` inside \`:{ at = … }\` |
| Init | \`= data { }\` only | \`=\` binary/hex bulk, \`.mem =\` |

---

## Common errors

| Error | Cause |
|-------|-------|
| \`LUT address N >= length L\` | Index outside table |
| \`LUT value must be exactly D bits\` | Value or \`fillwith\` wrong width |
| \`LUT range inverted\` | \`end < start\` in a range |
| \`requires '= data { ... }'\` | Missing initializer |

---

## Related

- [mem.md](mem.md) — sequential RAM
- [asm.md](asm.md) — inline assembler (blob into \`mem\`)
- [debug.md](debug.md) — \`probe\`, \`show\`, \`peek\`
- [future-component-ideas.md](future-component-ideas.md) — backlog (B2 LUT)
`,
    'mem.md': `# Memory Component (mem)

The \`mem\` component implements a RAM memory with configurable number of addresses (\`length\`) and bits per address (\`depth\`). Each address stores one binary word of \`depth\` bits.

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

> **Note:** \`.mem = value\` always resets the entire memory before writing. To write a single address without affecting others, use the \`:at\`, \`:data\`, \`:write\` property block.

---

## Property block — read and write

### Reading (\`:at\` + \`:get\`)

Set the address in a property block, then read via \`:get\`:

\`\`\`
.ram:{
  at = 0010    # address 2
}

8wire val = .ram:get   # reads address 2
\`\`\`

### Writing (\`:at\` + \`:data\` + \`:write\`)

\`\`\`
.ram:{
  at   = 0001    # address 1
  data = 10101010
  write = 1
}
\`\`\`

When \`write = 1\`, the value in \`data\` is written to address \`at\`.

### Writing multiple addresses at once

If \`data\` is a multiple of \`depth\`, multiple consecutive addresses are written starting from \`at\`:

\`\`\`
.ram:{
  at   = 0000
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
| \`at\`    | pin  | Address to read or write (binary, \`log2(length)\` bits) |
| \`data\`  | pin  | Data to write (one or more \`depth\`-bit words) |
| \`write\` | pin  | \`1\` = write \`data\` to \`at\`; \`0\` = do nothing |
| \`get\`   | pout | Value at the current address (\`at\`) |

---

## Direct value (\`:get\` at address 0)

Reading the component directly (without \`:at\`) returns the value at address 0:

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
    Xpin at
    1pin write
    Xpin data
    Xpout get
  }
  -> Xbit
\`\`\`

The \`= Xbit\` line indicates that \`mem\` accepts an initializer. The value is split into \`depth\`-bit chunks — see the **Initialization** section above for the full behavior.

---

## Notes

- \`depth\` is the **word size** — the number of bits stored per address.
- \`length\` is the **number of addresses** — the total number of words.
- The initializer (\`= value\`) splits the value into \`depth\`-bit chunks. The last chunk is padded with leading zeros if shorter than \`depth\`.
- \`.mem = value\` resets **all** addresses to \`0\` before writing, even those not covered by the value.
- To write individual addresses without resetting others, always use the \`:at\`, \`:data\`, \`:write\` property block.
- \`getMem\`/\`setMem\` are browser-side functions. In the test environment (Node.js), address 0 is accessible via \`comp.initialValue\`; other addresses require the browser runtime.
`,
    'mini-cpu-plan.md': `# Mini CPU / ALU with memory — feasibility

## Short answer

**Yes** — you can build a small demonstrator script (“CPU with 1 register + RAM + ALU”) using only what exists today. **\`comp [mem]\` alone is not enough conceptually**, but together with a few existing language primitives you cover ALU + storage + execution steps.

**No new component types** are required in the engine for a teaching demo. What is “missing” is mostly **organization** (chips/boards) and **clock discipline** (one step = one pulse), not new types (\`instruction\`, \`bus\`, etc.).

---

## What you already have (enough for a mini-CPU)

| CPU role | LogTScript primitive | Notes |
|----------|----------------------|-------|
| **RAM / program** | \`comp [mem]\` | ROM init with \`= ^hex\`; read/write via \`.ram:{ at, data, write }\` — [mem.md](mem.md) |
| **ALU (ADD/SUB/AND…)** | \`comp [adder]\` / \`[subtract]\` or \`ADD()\` / \`SUBTRACT()\` | For a persistent CPU, prefer **components** in a \`chip\`, not instant functions — [adder.md](adder.md) |
| **Operation select** | \`MUX\` / \`MUX2\` / \`MUX3\` | Pick ALU result from a few instruction bits |
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

- **\`mem\` program** (ROM): instructions preloaded with \`= ^....\`
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
| “Program loader” | \`mem\` init with \`=\` or \`.ram = ^hex\` |

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

ROM: \`= ^10334221\` (4 words × 8 bits).

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
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
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
  .data:at = opd
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
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
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
  .data:at = opd
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

## Related files

- Automated tests: \`test_suite_ported.js\` (859–866)
- Test constants: \`CHIP_ALU4\`, \`BOARD_CPU4\`
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

## No fixed-width REGn

Older drafts used names like \`REG1\`, \`REG2\`, \`REG8\`. These are **not** valid — use the single builtin \`REG(data, clk, clr)\` only. Width comes from \`data\` (e.g. \`1wire\` → 1 bit, \`4wire\` → 4 bits), similar to how \`MUX\` infers selector width from usage.

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
- Related: [14seg.md](14seg.md), [dots.md](dots.md).
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

**Prefix** = operator appears before the operand, with a single argument.  
**Infix** = operator appears between two operands, with two arguments.

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

### Multiple backtick zones on the same line

Backticks delimit independent zones. They can be combined with \`+\` (concatenation):

\`\`\`
\`a & b\` + \`c | d\`
\`\`\`

Expands to:

\`\`\`
AND(a,b) + OR(c,d)
\`\`\`

### Combination with repeat

Short notation works together with \`repeat\` blocks. The \`?\` placeholder is expanded by repeat after short notation has been processed:

\`\`\`
repeat 1..3[
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

## Limitations

- \`^\` inside backticks is always **XOR**. For hex literals, use \`[^FF]\`.
- \`()\` inside backticks are for **grouping**, not dynamic bit ranges. Expressions like \`a.(expr)/4\` are not supported in short notation.
- Backticks cannot be nested (a backtick closes the zone opened by the previous one).
- Backticks inside comments (\`#\` or \`#> ... #<\`) are ignored.
`,
    'signal-propagation.md': `# Signal propagation

When a wire or component output changes, every wire and display that depends on it is updated automatically. You do not need to call anything extra — assignments like \`1wire b = NOT(a)\` stay in sync with their inputs.

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

## Debug output (\`show\`, \`peek\`, \`probe\`)

How values appear in the Output panel — syntax, timing, and runnable examples:

**[debug.md](debug.md)**

---

## PCB and property blocks

Programs that use **PCB** instances and property blocks (\`.instance:{ data=… set=wire on:1 }\`) work on **Wave** the same way as on Legacy for everything **outside** the PCB:

| Area | Wave behaviour |
|------|----------------|
| **External wires** (\`4wire q = .e\`, \`4wire out = .p:pout\`) | Updated through wave propagation after the PCB runs or after a trigger (\`setWire\`, switch, key). |
| **PCB pins** (\`setWire\` on an input pin) | Can fire property blocks with \`on:1\` / \`set = …\`; dependent external wires settle in the same propagation step. |
| **PCB pouts** | Output pins publish to external wires via wave scheduling (not a direct storage write). |
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
- [Editor run controls](editorUI.md) — Run, Next, Wave / Legacy toggle
- [Interactive components](interactive-components.md) — switch, key, dip, rotary inputs
- [REG](reg.md) — wire-clock falling edge and \`NEXT\` clock (\`~\`)
- [Oscillator](oscillator.md) — real-time \`osc\` and wire connections
- [LED](led.md) — displays driven by wires and components
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
- Panel updates propagate through wires — [signal-propagation.md](signal-propagation.md).
- Debug: \`probe(.pwr)\` or \`probe(.pwr:get)\` — [debug.md](debug.md).
`
  };
})();
