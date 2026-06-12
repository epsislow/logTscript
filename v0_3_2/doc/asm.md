# Inline ASM — Instruction Set Architecture

Define a custom ISA with `inline [asm]`, then assemble programs to a **binary blob** with `.myisa { ... }` or `myisa { ... }` anywhere an expression is allowed.

Instance names use letters and digits only (no `_`).

## ISA definition

```logts
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :
```

`[asm]` is the **inline kind** (more kinds may follow later).

| Token | Meaning |
|-------|---------|
| `0000` | Fixed literal bits |
| `4b` | Unsigned immediate (0…15) |
| `S4b` | Signed immediate (-8…+7), two's complement |
| `R2b` | Register `Rn` |
| `A4b` | Address `An` or label → **absolute** address |

All mnemonics must encode to the same `wordWidth`.

## Program syntax

```logts
48w myProg = .myisa {
  loop:
    NOP
    JMP loop3
}

show(myisa { NOP })
```

## Memory

```logts
comp [mem] .prog:
  depth: 8
  length: 16
  = myisa {
      NOP
      LOAD R1 A3
  }
  :
```

## `doc()`

- `doc(inline)` — lists instances
- `doc(.myisa)` — opcodes for that instance
