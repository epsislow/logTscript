# ASM

Define a custom ISA with `inline [asm]`, then assemble programs to a **binary blob** with `.myisa { ... }` anywhere an expression is allowed.

Memory (`comp [mem]`) receives the assembled blob unchanged.

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name **must** start with `.` | `.myisa` ✓ — `myisa` ✗ |
| Letters and digits only (no `_`) | `.myisa` ✓ — `.my_isa` ✗ |
| Same name at declaration and use | `inline [asm] .myisa:` → `.myisa { NOP }` |

`myisa { ... }` without the leading dot is a **parse error**:

```text
Expected '.' before inline instance name (use '.myisa' not 'myisa')
```

This applies to wire expressions (`8wire x = .myisa { NOP }`) and to `comp [mem]` initializers (`= .myisa { ... }`).

---

## Declare vs use

| Step | Syntax |
|------|--------|
| Define ISA | `inline [asm] .myisa:` … closing `:` |
| Assemble | `.myisa { MNEMONIC … }` or multi-line `{ … }` |
| Load into mem | `comp [mem] .prog: … = .myisa { … }` or `.prog = .myisa { … }` |

ASM uses **`{ }`** for programs. LUT (see [lut.md](lut.md)) uses **`(...)`** for lookup — different inline kind, different call syntax.

---

## ISA definition

```logts
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :
```

| Token | Meaning |
|-------|---------|
| `0000` | Fixed literal bits |
| `4b` | Unsigned immediate (0…15) |
| `S4b` | Signed immediate (-8…+7), two's complement |
| `R2b` | Register `Rn` |
| `A4b` | Address `An` or label → **absolute** address |

All mnemonics must encode to the same `wordWidth` (sum of segment widths).

---

## Runnable — NOP and LOAD

```logts-play
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
```

Arguments are separated by whitespace — no comma required (`LOAD R1 A3`).

---

## Runnable — multi-line program

```logts-play
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
```

---

## Runnable — labels and forward references

Pass 1 collects labels; `JMP loop3` may appear **before** `loop3:`.

```logts-play
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
```

| Field | Label resolves to |
|-------|-------------------|
| `A4b` | Absolute instruction address |
| `S4b` | Relative offset: `target - (currentAddr + 1)` |

---

## Runnable — signed branch (BEQ)

```logts-play
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
```

---

## Runnable — load into `mem`

```logts-play
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
```

Validations (interpreter): `wordWidth === mem.depth`, `instructionCount <= mem.length`.

### Wire width and assignment operators

| Operator | ASM shorter than wire |
|----------|------------------------|
| `=` | Error — use exact width, e.g. `8wire x = .myisa { LOAD R1 A2 }` |
| `:=` | Left-pad (zeros on the left) |
| `=:` | Right-pad (zeros on the right) |

See [assignment-operators.md](assignment-operators.md).

### Wire slot with `:=` (left-pad)

```logts-play
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
```

### Wire slot with `=:` (right-pad)

To store an assembled program in a wire wider than the blob (zeros on the right), use [`=:`](assignment-operators.md):

```logts-play
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
```

Runtime reassignment:

```logts-play
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
```

---

## `doc()`

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

doc(inline)
doc(inline.asm)
doc(.myisa)
```

| Call | Output |
|------|--------|
| `doc(inline)` | Lists all inline instances (asm, lut, protocol, …) |
| `doc(inline.asm)` | ISA declaration template |
| `doc(.myisa)` | Opcode layout for that asm instance |

---

## Errors

| Situation | Example message |
|-----------|-------------------|
| Name without `.` | `Expected '.' before inline instance name (use '.myisa' not 'myisa')` |
| Undefined label | `Undefined label 'nowhere'` |
| Signed overflow | `Relative jump offset (-21) is out of bounds...` |
| Wrong prefix | `'LOAD' expects a Register prefix (R)...` |
| mem depth | `ISA encodes 8 bits per instruction but mem depth is 4` |
| Wire width (`=` strict) | `Expected 50 bits, got 48 bits.` or `Bit-width mismatch: x is 50bit but assembled program provides 48 bits` |

Assembler errors include the source line and `^^^` under the problematic token when possible.

---

## Related

- [mem.md](mem.md) — store assembled blob
- [mini-cpu-v2.md](mini-cpu-v2.md) — end-to-end CPU with ASM program and `BEQ`
- [lut.md](lut.md) — lookup tables
- [debug.md](debug.md) — `show`, `peek`
