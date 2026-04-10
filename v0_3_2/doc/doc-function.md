# doc() — Documentation for functions and components

The `doc` instruction displays the syntax (signature) of a built-in or user-defined function, internal component type, or PCB component directly in the output panel.

```
doc(FunctionName)
doc(comp)
doc(comp.type)
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

### Registers (REGn)

`REGn` accepts any number `n` (e.g. `REG4`, `REG8`, `REG16`):

```
doc(REG4)
```

Output:

```
REG4(4bit data, 1bit clock, 1bit clear) -> 4bit
```

Parameters:
- `data` — value to store (width = `n`)
- `clock` — rising edge stores `data`
- `clear` — `1` resets the register to zero

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
- `= Xbit` — appears if the component accepts direct assignment with `=`; omitted if not (e.g. `mem`, `counter`, `osc`)
- `:{` ... `}` — pins (inputs) and pouts (outputs) available in the property block
- `-> Xbit` — the return type of the component

### All available components

| Call | Canonical type |
|------|----------------|
| `doc(comp.led)` | led — Xbit, LED display |
| `doc(comp.switch)` | switch — 1bit, toggle switch |
| `doc(comp.key)` | key — 1bit, momentary button |
| `doc(comp.dip)` | dip — Xbit, group of toggle switches |
| `doc(comp.7seg)` or `doc(comp.7)` | 7seg — 8bit, 7-segment display |
| `doc(comp.lcd)` | lcd — 8bit, pixel matrix display |
| `doc(comp.adder)` or `doc(comp.+)` | adder — Xbit, addition |
| `doc(comp.subtract)` or `doc(comp.-)` | subtract — Xbit, subtraction |
| `doc(comp.multiplier)` or `doc(comp.*)` | multiplier — Xbit, multiplication |
| `doc(comp.divider)` or `doc(comp./)` | divider — Xbit, division |
| `doc(comp.shifter)` or `doc(comp.>)` | shifter — Xbit, shift register |
| `doc(comp.mem)` | mem — Xbit, RAM memory |
| `doc(comp.reg)` | reg — Xbit, register |
| `doc(comp.counter)` or `doc(comp.=)` | counter — Xbit, counter |
| `doc(comp.osc)` or `doc(comp.~)` | osc — 1bit, oscillator |
| `doc(comp.rotary)` | rotary — Xbit, rotary selector |

### Undefined type

```
doc(comp.xyz)
# displays:
comp.xyz: undefined component type
```

---

## PCB components (pcb)

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

## Notes

- `doc` is a **statement** (like `show`), not an expression — it cannot be used on the right side of `=`.
- The argument is an **identifier** (not a quoted string).
- `doc` does not evaluate anything — it only displays the static signature.
- It can be placed anywhere in the code, including before or after function definitions.
- `doc(comp.shortname)` is equivalent to `doc(comp.canonicalType)` — e.g. `doc(comp.+)` = `doc(comp.adder)`.
