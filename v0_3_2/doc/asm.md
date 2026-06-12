# Inline ASM — Instruction Set Architecture

Define a custom ISA with `inline [asm]`, then assemble programs to a **binary blob** with `.myisa { ... }` or `myisa { ... }` anywhere an expression is allowed.

Instance names use letters and digits only (no `_`).

`[asm]` is the **inline kind** (more kinds may follow later). Memory (`comp [mem]`) receives the assembled blob unchanged.

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

8wire nop = myisa { NOP }
8wire load = myisa { LOAD R1 A3 }
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
  = myisa {
    NOP
    LOAD R1 A3
  }
  :

8wire slot0 = .prog:get
show(slot0)
```

Validations (interpreter): `wordWidth === mem.depth`, `instructionCount <= mem.length`.

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

.prog = myisa { NOP }
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
doc(.myisa)
```

`doc(inline)` lists instances; `doc(.myisa)` shows the opcode layout for that instance.

---

## Errors

| Situation | Example message |
|-----------|-----------------|
| Undefined label | `Undefined label 'nowhere'` |
| Signed overflow | `Relative jump offset (-21) is out of bounds...` |
| Wrong prefix | `'LOAD' expects a Register prefix (R)...` |
| mem depth | `ISA encodes 8 bits per instruction but mem depth is 4` |
| Wire width | `Bit-width mismatch: x is 50bit but assembled program provides 48 bits` |

Assembler errors include the source line and `^^^` under the problematic token when possible.
