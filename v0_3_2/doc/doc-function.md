# doc() — Documentation for functions and components

The `doc` instruction displays the syntax (signature) of a built-in or user-defined function, internal component type, or PCB component directly in the output panel.

```
doc()              # index of all doc() forms
doc(FunctionName)
doc(comp)
doc(comp.type)
doc(board)
doc(board.type)
doc(pcb)
doc(pcb.type)
doc(show)          # debug keywords: show, peek, probe, watch, Zlist
```

---

## Usage

### `doc()` — index

`doc()` with no argument prints a short guide to what you can pass to `doc(...)`:

- `def` — built-in, debug, and user-defined function names
- `comp`, `comp.type` — components
- `pcb`, `chip`, `board`, `inline`, `.inst` — hierarchical types
- function name — e.g. `OR`, `ADD`, `myFunc`
- `show`, `peek`, `probe`, `watch`, `Zlist` — debug statements

### Syntax

```
doc(FunctionName)
```

`FunctionName` is written **without quotes** — it is an identifier, not a string.

### Simple example

```
doc(OR)
```

Output:

```
OR(Xbit)
OR(Xbit, Xbit)
```

---

## Built-in functions

Grouped catalogue: **[builtin-functions.md](builtin-functions.md)** (index with links per category).

### Logic gates

See [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md).

| Call | Output |
|------|--------|
| `doc(NOT)` | `NOT(Xbit) -> Xbit` |
| `doc(AND)` | `AND(Xbit) -> 1bit` / `AND(Xbit, Xbit) -> Xbit` |
| `doc(OR)` | `OR(Xbit) -> 1bit` / `OR(Xbit, Xbit) -> Xbit` |
| `doc(XOR)` | `XOR(Xbit) -> 1bit` / `XOR(Xbit, Xbit) -> Xbit` |
| `doc(NXOR)` | `NXOR(Xbit) -> 1bit` / `NXOR(Xbit, Xbit) -> Xbit` |
| `doc(NAND)` | `NAND(Xbit) -> 1bit` / `NAND(Xbit, Xbit) -> Xbit` |
| `doc(NOR)` | `NOR(Xbit) -> 1bit` / `NOR(Xbit, Xbit) -> Xbit` |
| `doc(EQ)` | `EQ(Xbit, Xbit) -> 1bit` |
| `doc(LATCH)` | `LATCH(Xbit data, 1bit clock) -> Xbit` |

**`Xbit`** means the function accepts a bit string of any width.

**1-argument mode** (fold): `OR(a)` applies OR across all bits of `a`, yielding **1 bit**.

**2-argument mode** (bitwise): `OR(a, b)` applies OR bit-by-bit between `a` and `b`, yielding **N bits**.

### Bit transform (shift / rotate / reverse)

| Call | Output |
|------|--------|
| `doc(LSHIFT)` | `LSHIFT(Xbit data, Nbit n) -> Xbit` / optional `fill` |
| `doc(RSHIFT)` | `RSHIFT(Xbit data, Nbit n) -> Xbit` / optional `fill` |
| `doc(REVERSE)` | `REVERSE(Xbit) -> Xbit` |
| `doc(LROTATE)` | `LROTATE(Xbit data, Ybit count) -> Xbit` |
| `doc(RROTATE)` | `RROTATE(Xbit data, Ybit count) -> Xbit` |

Full behaviour, short notation (`<`, `>`), and examples: [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md).

### Bit selection and detection

| Call | Output |
|------|--------|
| `doc(HIGH)` | `HIGH(Xbit) -> Xbit` |
| `doc(LOW)` | `LOW(Xbit) -> Xbit` |
| `doc(ANY)` | `ANY(Xbit) -> 1bit` |
| `doc(ZERO)` | `ZERO(Xbit) -> 1bit` |
| `doc(ANY0)` | `ANY0(Xbit) -> 1bit` |
| `doc(ALLZX)` | `ALLZX(Xbit) -> 1bit` |
| `doc(BITINDEX)` | `BITINDEX(Xbit) -> Ybit index, 1bit isInvalid` |
| `doc(ONEHOT)` | `ONEHOT(Xbit index) -> 2^X bits` |

`BITINDEX` returns **two values** — assign both wires (index width ≈ `bitIndexWidth(len(input))`).

Full behaviour and priority-encoder pattern: [builtin-bit-selection-functions.md](builtin-bit-selection-functions.md).

### Bit analysis

| Call | Output |
|------|--------|
| `doc(PARITY)` | `PARITY(Xbit) -> 1bit` |
| `doc(CNTONE)` | `CNTONE(Xbit) -> Ybit` |
| `doc(CNTZERO)` | `CNTZERO(Xbit) -> Ybit` |
| `doc(BITSIZE)` | `BITSIZE(Xbit) -> Ybit` |

Full behaviour: [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md).

### Shift (legacy anchor)

Moved to **Bit transform** — see [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md#lshift).

### Register (REG)

Width is inferred from `data` at runtime:

```
doc(REG)
```

Output:

```
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
```

Parameters:
- `data` — value to store (determines register width)
- `clock` — wire: **falling edge** (`1` → `0`) captures `data`; `~`: updates on `NEXT(~)` (see [reg.md](reg.md))
- `clear` — `1` resets the register to zero

Full behaviour: [reg.md](reg.md).

### Multiplexer (MUX)

Selector width is inferred from `sel` at runtime:

```
doc(MUX)
```

Output:

```
MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit
```

- `sel` — `N` bits → `2^N` data inputs
- Pass separate `data0`, `data1`, … **or** one packed `Xbit` string split into equal chunks

Full behaviour and examples: [builtin-routing-functions.md](builtin-routing-functions.md).

### Demultiplexer (DEMUX)

```
doc(DEMUX)
```

Output:

```
DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..
```

DEMUX returns **`2^N` values**: the selected output carries `data`, the rest are `0`.

See [builtin-routing-functions.md](builtin-routing-functions.md).

### Arithmetic (ADD / SUBTRACT / MULTIPLY / DIVIDE)

These functions perform **instant** binary arithmetic and return **two values**: the result and an overflow/borrow indicator.

```
doc(ADD)
doc(SUBTRACT)
doc(MULTIPLY)
doc(DIVIDE)
```

| Call | Signature |
|------|-----------|
| `doc(ADD)` | `ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry` |
| `doc(SUBTRACT)` | `SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry` |
| `doc(MULTIPLY)` | `MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over` |
| `doc(DIVIDE)` | `DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod` |

Since these functions return **two values**, they must be assigned to two variables:

```
4wire result, 1wire carry = ADD(a, b)
4wire result, 1wire carry = SUBTRACT(a, b)
4wire result, 4wire over  = MULTIPLY(a, b)
4wire result, 4wire mod   = DIVIDE(a, b)
```

The bit width of both inputs is taken as `max(len(a), len(b))`. The result is always that same width.

**ADD** — binary addition, modular (wraps at `2^N`):
- `carry = 1` if the sum exceeds `2^N - 1`; `0` otherwise

**SUBTRACT** — binary subtraction, modular (wraps at `2^N`):
- `carry = 1` if `a < b` (borrow); `0` otherwise

**MULTIPLY** — binary multiplication:
- `result` = low `N` bits of the product
- `over` = high `N` bits of the product (shifted right by `N`)

**DIVIDE** — binary integer division:
- `result` = quotient (`a / b`, truncated)
- `mod` = remainder (`a % b`)
- Division by zero returns `0` for both outputs

### Number conversion

Decimal and hex packed digits. Full reference: [number-conversion.md](number-conversion.md).

```
doc(CNTN10S)
doc(N2N10S)
doc(N10S2N)
doc(CNTN16S)
doc(N2N16S)
doc(N16S2N)
doc(ISDIGIT)
```

### Compare / select / MAC

See [arithmetic.md](arithmetic.md).

```
doc(GT)
doc(LT)
doc(MIN)
doc(MAX)
doc(CLAMP)
doc(MAC)
```

| Call | Signature |
|------|-----------|
| `doc(GT)` | `GT(Xbit a, Xbit b) -> 1bit` |
| `doc(LT)` | `LT(Xbit a, Xbit b) -> 1bit` |
| `doc(MIN)` | `MIN(Xbit a, Xbit b, ...) -> Xbit` |
| `doc(MAX)` | `MAX(Xbit a, Xbit b, ...) -> Xbit` |
| `doc(CLAMP)` | `CLAMP(Xbit x, Ybit min, Ybit max) -> Ybit` |
| `doc(ISDIGIT)` | `ISDIGIT(Xbit value) -> 1bit` |
| `doc(MAC)` | `MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over` |

### Decimal conversion (summary)

| Call | Signature |
|------|-----------|
| `doc(CNTN10S)` | `CNTN10S(Xbit value) -> Ybit` |
| `doc(N2N10S)` | `N2N10S(Xbit value) -> Zbit packed` |
| `doc(N10S2N)` | `N10S2N(Xbit packed) -> Wbit value` |

```
8wire n = 11110101
2wire cnt = CNTN10S(n)
12wire num10s = N2N10S(n)
8wire back := N10S2N(num10s)
```

- `CNTN10S(0)` → `1` digit
- `N2N10S` output width = `maxCifre × 4` (from input width)
- `N10S2N` returns minimal-width binary; invalid nibble (>9) is an error

#### ADD examples

```
4wire idx = 0011
4wire inc = 0001
4wire nextIdx, 1wire carry = ADD(idx, inc)
# nextIdx = 0100, carry = 0

4wire idx2 = 1111
4wire inc2 = 0001
4wire nextIdx2, 1wire carry2 = ADD(idx2, inc2)
# nextIdx2 = 0000, carry2 = 1
```

#### SUBTRACT examples

```
4wire idx = 0011
4wire dec = 0001
4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)
# prevIdx = 0010, carry = 0

4wire idx2 = 0000
4wire dec2 = 0001
4wire prevIdx2, 1wire carry2 = SUBTRACT(idx2, dec2)
# prevIdx2 = 1111, carry2 = 1
```

#### MULTIPLY examples

```
4wire a = 0010
4wire b = 0011
4wire result, 4wire over = MULTIPLY(a, b)
# result = 0110 (6), over = 0000

4wire a2 = 1111
4wire b2 = 1111
4wire result2, 4wire over2 = MULTIPLY(a2, b2)
# result2 = 0001 (225 & 0xF), over2 = 1110 (225 >> 4)
```

#### DIVIDE examples

```
4wire a = 0110
4wire b = 0010
4wire result, 4wire mod = DIVIDE(a, b)
# result = 0011 (3), mod = 0000

4wire a2 = 0111
4wire b2 = 0010
4wire result2, 4wire mod2 = DIVIDE(a2, b2)
# result2 = 0011 (3), mod2 = 0001 (remainder 1)
```

> **Note:** These built-in functions compute results **instantly** (no clock cycle needed), unlike `comp.adder`, `comp.subtract`, `comp.multiplier`, and `comp.divider` which are hardware components that require explicit input/output wiring.

---

## Listing all functions: doc(def)

`doc(def)` displays built-in functions, **debug** statements, and user-defined functions in three sections:

```
doc(def)
```

Output:

```
built-in:
NOT, AND, OR, … HIGH, LOW, ANY*, ALL*, BITINDEX, …

(* = 0/1/01/10/Z/X/ZX/XZ)

debug:
show, peek, probe, watch, Zlist

user defined:
myFunc, helper, ...
```

Per-keyword signatures: `doc(show)`, `doc(peek)`, `doc(probe)`, `doc(watch)`, `doc(Zlist)`.

If no user-defined functions exist:

```
built-in:
NOT, AND, OR, …

debug:
show, peek, probe, watch, Zlist

user defined:
(none)
```

---

## User-defined functions

`doc` also works for functions defined with `def`:

```
def add(8bit a, 8bit b):
   :8bit OR(a, b)

doc(add)
```

Output:

```
add(8bit a, 8bit b) -> 8bit
```

If the function returns multiple values:

```
def split(8bit x):
   :4bit x.0/4
   :4bit x.4/4

doc(split)
```

Output:

```
split(8bit x) -> 4bit, 4bit
```

---

## Unknown functions

If the name is not recognized:

```
doc(Foo)
```

Output:

```
Foo: undefined function
```

---

## Internal components (comp)

Per-component guides (syntax, examples, pins): **[components.md](components.md)**. Composite blocks: [board.md](board.md), [chip.md](chip.md), [pcb.md](pcb.md) (deprecated).

### doc(comp) — list of all component types

Displays all available component types, with shortnames on the same line:

```
doc(comp)
```

Example output:

```
comp.led
comp.switch
comp.adder, comp.+
comp.subtract, comp.-
comp.7seg, comp.7
comp.osc, comp.~
...
```

### doc(inline) — list inline instances

```
doc(inline)
```

Lists every `inline [asm]` / `inline [lut]` / `inline [protocol]` instance in the script (e.g. `.myisa (inline [asm])`). Kinds: `inline.asm`, `inline.lut`, `inline.protocol`.

### doc(inline.kind) — declaration template

| Call | Topic | Page |
|------|-------|------|
| `doc(inline.asm)` | asm | [asm.md](asm.md) |
| `doc(inline.lut)` | lut | [lut.md](lut.md) |
| `doc(inline.protocol)` | protocol | [protocol.md](protocol.md) |

### doc(.name) — specific inline instance

After `inline [asm] .myisa:`, `inline [lut] .decoder:`, or `inline [protocol] .uart8n1:`, `doc(.myisa)` / `doc(.decoder)` / `doc(.uart8n1)` shows opcodes, LUT map, or protocol channels for that instance. See [asm.md](asm.md), [lut.md](lut.md), and [protocol.md](protocol.md).

### doc(comp.type) — syntax of a component

Displays the full syntax for a component type. Shortnames are accepted and redirect to the canonical type.

```
doc(comp.adder)
doc(comp.+)        # equivalent to doc(comp.adder)
```

Output:

```
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
```

**Output structure:**
- Declaration attributes (before `:{`) — with value (`depth: integer`) or without (`nl`, `circular`)
- `= Xbit` — appears if the component accepts direct assignment with `=`; omitted if not (e.g. `counter`, `osc`)
- `:{` ... `}` — pins (inputs) and pouts (outputs) available in the property block
- `-> Xbit` — the return type of the component

> **Note on `mem`:** `doc(comp.mem)` shows `= Xbit` because `mem` supports initialization with `= literal`, `= ^hex`, `= varName`, or `= .isa { … }` ([inline ASM](asm.md)) in the declaration, and bulk re-initialization via `.mem = value` (or `.mem = .isa { … }`) after declaration. The value is split into `depth`-bit chunks across consecutive addresses. See [mem.md](mem.md) for details.

### All available components

| Call | Guide |
|------|-------|
| `doc(comp.led)` | [led.md](led.md) |
| `doc(comp.switch)` | [switch.md](switch.md) |
| `doc(comp.key)` | [key.md](key.md) |
| `doc(comp.dip)` | [dip.md](dip.md) |
| `doc(comp.rotary)` | [rotary.md](rotary.md) |
| `doc(comp.slider)` | [slider.md](slider.md) |
| `doc(comp.bar)` | [led-bar.md](led-bar.md) |
| `doc(comp.7seg)` / `doc(comp.7)` | [seven-seg.md](seven-seg.md) |
| `doc(comp.14seg)` / `doc(comp.14)` | [14seg.md](14seg.md) |
| `doc(comp.lcd)` | [lcd.md](lcd.md) |
| `doc(comp.dots)` / `doc(comp.:)` | [dots.md](dots.md) |
| `doc(comp.adder)` / `doc(comp.+)` | [adder.md](adder.md) |
| `doc(comp.subtract)` / `doc(comp.-)` | [subtract.md](subtract.md) |
| `doc(comp.multiplier)` / `doc(comp.*)` | [multiplier.md](multiplier.md) |
| `doc(comp.divider)` / `doc(comp./)` | [divider.md](divider.md) |
| `doc(comp.shifter)` / `doc(comp.>)` | [shifter.md](shifter.md) |
| `doc(comp.counter)` / `doc(comp.=)` | [counter.md](counter.md) |
| `doc(comp.mem)` | [mem.md](mem.md) |
| `doc(comp.lut)` | [lut.md](lut.md) — type syntax; `doc(.inst)` shows mapped table |
| `doc(comp.reg)` | [reg.md](reg.md) |
| `doc(comp.osc)` / `doc(comp.~)` | [oscillator.md](oscillator.md) |

Panel inputs overview: [interactive-components.md](interactive-components.md). Full index: [components.md](components.md).

### Undefined type

```
doc(comp.xyz)
# displays:
comp.xyz: undefined component type
```

---

## Board components (board)

User guide: **[board.md](board.md)**.

### doc(board) — list of user-defined board types

```
doc(board)
```

### doc(board.type) — syntax of a board type

```
doc(board.halfAdd)
```

---

## PCB components (pcb)

> Deprecated — prefer [board.md](board.md).

User guide: **[pcb.md](pcb.md)**.

### doc(pcb) — list of user-defined PCB types

```
doc(pcb)
```

Output (if types `bcd` and `alu` have been defined):

```
pcb.bcd
pcb.alu
```

### doc(pcb.type) — syntax of a PCB type

```
doc(pcb.bcd)
```

Output:

```
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
```

**Output structure:**
- `exec: set` — the pin that triggers execution
- `on: raise/edge/1/0` — the trigger condition (value depends on the PCB definition)
- `:{` ... `}` — the defined pins (inputs) and pouts (outputs)
- `-> Nbit` — the return type (if `:Nbit varName` is at the end of the definition)

**Undefined type:**

```
doc(pcb.xyz)
# displays:
pcb.xyz: undefined PCB type
```

---

## Chip components (chip)

User guide: **[chip.md](chip.md)**.

Chip types are lightweight reusable blocks (similar to PCB) without `~~`, `def`, nested `chip +[...]`, or UI components (`switch`, `key`, `led`, etc.). A chip body may instantiate other top-level chip types via `chip [type] .inst::`.

### Syntax

**Definition (top-level only):**

```
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
```

**Instantiation:**

```
chip [halfAdd] .u1::
```

**Property block (pins + exec trigger):**

```
.u1:{
  a = 0101
  b = 0011
  set = 1
}
```

**External wire from pout:**

```
4wire r = .u1:sum
```

### doc(chip) — list of user-defined chip types

```
doc(chip)
```

Output (if `halfAdd` is defined):

```
chip.halfAdd
```

### doc(chip.type) — syntax of a chip type

```
doc(chip.halfAdd)
```

Output:

```
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
```

**Undefined type:**

```
doc(chip.xyz)
# displays:
chip.xyz: undefined chip type
```

### doc(.inst) and doc(.inst.sub)

After instantiation, `doc(.u1)` shows the instance signature; `doc(.u1.add)` shows an internal component (when present).

Example:

```logts-play
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
```

### Runnable example — half-adder instance

```logts-play
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
```

Wave propagation (same script, wave mode):

```logts-play wave
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
```

---

## Debug output (`show`, `peek`, `probe`)

Built-in display statements for the Output panel. Full reference with runnable examples:

**[debug.md](debug.md)** — `show`, `peek`, `probe` syntax, formats, when to use each, Wave vs Legacy.

---

## Notes

- `doc` is a **statement** (like `show`), not an expression — it cannot be used on the right side of `=`.
- The argument is an **identifier** (not a quoted string).
- `doc` does not evaluate anything — it only displays the static signature.
- It can be placed anywhere in the code, including before or after function definitions.
- `doc(comp.shortname)` is equivalent to `doc(comp.canonicalType)` — e.g. `doc(comp.+)` = `doc(comp.adder)`.
- `doc(def)` lists **all** built-in functions on one line and all user-defined functions on another. It is useful for quick reference when working in the script editor.
