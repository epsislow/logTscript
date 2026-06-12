# doc() — Documentation for functions and components

The `doc` instruction displays the syntax (signature) of a built-in or user-defined function, internal component type, or PCB component directly in the output panel.

```
doc(FunctionName)
doc(comp)
doc(comp.type)
doc(board)
doc(board.type)
doc(pcb)
doc(pcb.type)
```

---

## Usage

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

### Logic gates

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

### Shift

| Call | Output |
|------|--------|
| `doc(LSHIFT)` | `LSHIFT(Xbit data, Nbit n) -> Xbit` / `LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit` |
| `doc(RSHIFT)` | `RSHIFT(Xbit data, Nbit n) -> Xbit` / `RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit` |

- `data` — the bit string to shift
- `n` — number of positions (in binary)
- `fill` *(optional)* — fill bit (default `0`)

### Register (REG)

Width is inferred from `data` at runtime — there is only the generic `REG` (no `REG1`, `REG4`, `REG8`, etc.):

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

`doc(REG8)` and similar fixed-width names are **not** supported — use `doc(REG)` only.

Full behaviour: [reg.md](reg.md).

### Multiplexers (MUX1 / MUX2 / MUX3)

```
doc(MUX1)
```

Output:

```
MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit
```

| Call | Signature |
|------|-----------|
| `doc(MUX1)` | `MUX1(1bit sel, Xbit data0, Xbit data1) -> Xbit` |
| `doc(MUX2)` | `MUX2(2bit sel, Xbit data0, Xbit data1, Xbit data2, Xbit data3) -> Xbit` |
| `doc(MUX3)` | `MUX3(3bit sel, Xbit data0, ..., Xbit data7) -> Xbit` |

`sel` is the selector: `MUX1` → 1 bit (2 inputs), `MUX2` → 2 bits (4 inputs), `MUX3` → 3 bits (8 inputs).

### Demultiplexers (DEMUX1 / DEMUX2 / DEMUX3)

```
doc(DEMUX1)
```

Output:

```
DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit
```

| Call | Signature |
|------|-----------|
| `doc(DEMUX1)` | `DEMUX1(1bit sel, Xbit data) -> Xbit, Xbit` |
| `doc(DEMUX2)` | `DEMUX2(2bit sel, Xbit data) -> Xbit, Xbit, Xbit, Xbit` |
| `doc(DEMUX3)` | `DEMUX3(3bit sel, Xbit data) -> Xbit x8` |

DEMUX returns a **vector** of `2^n` outputs: one contains `data`, the rest are `0`.

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

`doc(def)` displays all available built-in functions and all user-defined functions, separated into two sections:

```
doc(def)
```

Output:

```
built-in:
NOT, AND, OR, XOR, NXOR, NAND, NOR, EQ, LATCH, LSHIFT, RSHIFT, REG, MUX, DEMUX, MUX1, MUX2, MUX3, DEMUX1, DEMUX2, DEMUX3, ADD, SUBTRACT, MULTIPLY, DIVIDE

user defined:
myFunc, helper, ...
```

If no user-defined functions exist:

```
built-in:
NOT, AND, OR, ...

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
chip.xyz: tip chip nedefinit
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
