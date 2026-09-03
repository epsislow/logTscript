# ALU component (`alu`)

`comp [alu]` is a **configurable arithmetic-logic unit** — operands `a`/`b`, opcode selector `op`, outputs `result` (alias `:get`) plus `carry` and `zero`. Optional `extraOp` and `extraFlags` extend the datapath without extra chips.

Signature: `doc(comp.alu)`.

---

## Syntax

### Minimal (replaces mini-CPU `chip +[alu4]`)

```logts
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
```

### Extended

```logts
comp [alu] .alu:
  length: 8
  extraOp: XOR, LSHIFT, MUL, DIV
  extraFlags: overflow, less, equal
  on: 1
  :
```

### Custom opcode via LUT

```logts
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
```

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `length` | integer | `4` | Bit width of `a`, `b`, `result` |
| `on` | `0`/`1`/`raise`/`edge` | `0` | Level trigger for property block (like adder) |
| `extraOp` | ID list | — | Extra opcodes after ADD/SUB/AND/OR |
| `extraFlags` | ID list | — | Extra 1-bit flag outputs |
| `lut` | `.component` | — | Optional `comp [lut]` for custom `extraOp` names (`lut = .ref`) |

List syntax:

```
extraOp: XOR, MUL, DIV
extraFlags: overflow, less, equal
```

---

## Standard opcodes (`op` pin)

| `op` | Operation | `carry` | `zero` |
|------|-----------|---------|--------|
| `00` | ADD | carry out | `result == 0` |
| `01` | SUB | borrow | `result == 0` |
| `10` | AND | `0` | `result == 0` |
| `11` | OR | `0` | `result == 0` |

Without `extraOp`, `op` is **2 bits** (compatible with mini-CPU `aluop`).

With `extraOp`, `op` width grows: `op = 4` → first extra op, `op = 5` → second, etc.

---

## `extraOp` catalog

| Name | Semantics | Extra pout |
|------|-----------|------------|
| `XOR` | `a XOR b` | — |
| `NOT` | `NOT a` (`b` ignored) | — |
| `PASS` | `result = a` | — |
| `CMP` | `a - b` (like SUB) | sets `less` / `equal` when declared |
| `LSHIFT` | logical left shift by `b` | — |
| `RSHIFT` | logical right shift | — |
| `ASHR` | arithmetic right shift (fill MSB) | — |
| `MUL` | unsigned `a×b` low bits | **`:over`** (high bits) |
| `DIV` | unsigned `⌊a/b⌋` | **`:mod`** (remainder) |

**No `MOD` opcode** — use `DIV` + `:mod`.

Divide by zero: quotient and remainder are `0` (same as `comp [divider]`).

---

## `extraFlags`

| Flag | Meaning |
|------|---------|
| `overflow` | signed overflow on ADD/SUB |
| `less` | `a < b` (unsigned) |
| `equal` | `a == b` |
| `negative` / `sign` | MSB of `result` |
| `borrow` | alias for SUB borrow on `carry` |

---

## Pins and outputs

**Inputs:** `set` (1), `a` (`length`), `b` (`length`), `op` (2+ bits).

**Outputs (always):** `result` / `:get`, `carry`, `zero`.

**Auto from `extraOp`:** `:over` (MUL), `:mod` (DIV).

**From `extraFlags`:** one 1-bit pin per declared flag.

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Use this to inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script **and** runs it immediately. The **ALU** panel appears in the **Devices** area (`op`, `a`, `b`, `result`, carry/zero LEDs). |

For static examples (fixed operands and `op`), **Load & Run** is enough — check the **Output** panel for `peek` lines and the ALU widget for the last operation.

For the **interactive operand** example at the end, use **Load & Run**, then flip the **DIP** switches; re-run or step wires to see `result` and flags update.

---

## Debug

```logts
show(.alu:result)
peek(.alu:result)
peek(.alu:carry)
peek(.alu:zero)
probe(.alu:result)
```

`:result` and `:get` are equivalent on `comp [alu]`.

---

## Examples

### ADD with carry and zero (`op = 00`)

**Load & Run** — `1111 + 0001` wraps to `0000`, carry `1`, zero `1`.

```logts-play
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
```

### SUB borrow (`op = 01`)

**Load & Run** — `0000 - 0001` → `1111`, borrow on `carry`.

```logts-play
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
```

### AND and OR (`op = 10` / `11`)

**Load & Run** — same operands `1100` and `1010`; first block AND, then OR.

```logts-play
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
```

### Mini-CPU style datapath

**Load & Run** — `acc + opd` with `aluop = 00` (ADD); result `1000` (`0101 + 0011`).

```logts-play
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
```

### `extraOp: XOR` (`op = 100`)

**Load & Run** — `1010 XOR 0110` → `1100` (first extra opcode, 3-bit `op`).

```logts-play
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
```

### `extraOp: CMP` with `less` / `equal`

**Load & Run** — compare `0100` vs `0101`: `less = 1`, `equal = 0`.

```logts-play
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
```

### MUL and DIV (`extraOp: MUL, DIV`)

**Load & Run** — `1101 × 0011` (low `0111`, high `0010`), then same operands with DIV (`0100`, mod `0001`).

```logts-play
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
```

### Arithmetic shift right vs logical (`ASHR` / `RSHIFT`)

**Load & Run** — `10000000` shifted right by `1`; RSHIFT → `01000000`, ASHR → `11000000`.

```logts-play
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
```

### Signed overflow flag (`extraFlags: overflow`)

**Load & Run** — `01111111 + 00000001` on 8 bits sets `overflow = 1`.

```logts-play
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
```

### Custom opcode via LUT

**Load & Run** — `extraOp: CUSTOM` reads a 1-bit truth table from `comp [lut]` (`lut = .fn`).

```logts-play
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
```

### Interactive operands (DIP + ALU)

**Load** to edit widths; **Load & Run** to open the panels, then change the **A** and **B** DIP switches and press **RUN** again (or wire-drive) to try other ADD/SUB/AND/OR combinations with `op` on the **Op** DIP.

```logts-play
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
```

---

## See also

- [components.md](components.md) — component index
- [mini-cpu-v2.md](mini-cpu-v2.md) — CPU demo (can use `comp [alu]` instead of `chip +[alu4]`)
- [adder](doc-function.md) / `ADD` built-in — same arithmetic semantics
