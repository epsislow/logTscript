# ASM set: arm-thumb (16-bit subset)

The **arm-thumb** preset assembles a subset of **16-bit ARM Thumb** instructions into halfword-aligned encodings. Declare `set: arm-thumb` and write programs with `movs`, `adds`, `ldr`, etc.

Registers are **`r0`–`r7`** in this subset. Immediates use decimal literals (`5` or `\5`) — **`#` starts a comment** in LogTscript, so do not use `#5`.

See also: [asm.md](asm.md), [riscv32 preset](asm-set-riscv32.md), [variable8 preset](asm-set-variable8.md), [generic set](asm-set-generic.md).

---

## Declaration

```logts
inline [asm] .th:
  set: arm-thumb
  :
```

Each instruction encodes to **16 bits**. Use **`16wire`** (or `N×16wire`) for strict assignment.

---

## Preset opcode table

| Mnemonic | Syntax | Summary |
|----------|--------|---------|
| `movs` | `movs rd, imm` | Move 8-bit immediate into low register |
| `adds` | `adds rd, rn, rm` | `rd = rn + rm` |
| `subs` | `subs rd, rn, rm` | `rd = rn - rm` |
| `b` | `b target` | Unconditional branch (±256 halfwords) |
| `beq` | `beq target` | Branch if equal |
| `bne` | `bne target` | Branch if not equal |
| `ldr` | `ldr rd, imm(rn)` | Load from `[rn + imm×4]` (5-bit offset) |
| `str` | `str rd, imm, rn` | Store (3-arg form in this subset) |

---

## Runnable — move immediate

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

16wire p = .th { movs r1, 5 }
show(p)
show(p; asm)
```

Example encoding for `movs r1, 5`: `0010000100000101` (16 bits).

---

## Runnable — add / subtract

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

32wire p = .th {
  movs r0, 10
  movs r1, 3
  adds r2, r0, r1
  subs r3, r0, r1
}
show(p; asm)
```

---

## Runnable — branch

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

32wire p = .th {
  movs r0, 0
again:
  adds r0, r0, r1
  movs r1, 1
  b again
}
show(p; asm)
```

Branch targets use the same label mechanism as generic asm; offsets must stay within Thumb range.

---

## CPU bridge

Use **`comp [cpu]`** with **`isa: .th`** for native Thumb execution (not the 4-bit legacy CPU switch).

### Requirements

| Attribute | Required value |
|-----------|----------------|
| `registers` | **8** |
| `ram.depth` | **16** |
| `prog.depth` | **16** |

Mismatch at CPU init → error (e.g. `registers (32) must be 8 for asm set 'arm-thumb'`).

### Runnable — ALU on CPU

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

comp [cpu] .u:
  isa: .th
  registers: 8
  on: 1
  maxSteps: 4
  ram:
    depth: 16
    length: 8
  prog:
    depth: 16
    length: 4
    = .th {
      movs r0, 10
      movs r1, 3
      adds r2, r0, r1
      subs r3, r0, r1
    }
  :

.u:{ run = 1 }
16wire r2 = .u:r2
16wire r3 = .u:r3
show(r2, r3)
```

**Load & Run:** `r2` = 13, `r3` = 7.

### Semantics (simulator)

- **PC** = instruction index (one 16-bit halfword per step).
- **`ldr` / `str`:** byte offset `imm × 4` from `rn`; RAM index = `byteAddr >> 1`; unaligned byte addresses error.
- **`beq` / `bne`:** branch when the **zero flag** is set/clear after the last **`movs`**, **`adds`**, or **`subs`**.
- **Micro override:** user `{ micro }` on a preset opcode still uses the micro engine (see [asm-microcode.md](asm-microcode.md)).

See also [cpu.md](cpu.md#arm-thumb-native-exec).

---

## Load / store (assemble-only)

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

32wire p = .th {
  movs r1, 0
  movs r2, 42
  str r2, 0, r1
  ldr r0, 0(r1)
}
show(p; asm)
```

---

## User opcode overrides

Only **literal bit patterns** are allowed for custom opcodes (same rule as riscv32). Generic tokens like `R2b` produce:

`segment token 'R2b' invalid for set 'arm-thumb'`

---

## `doc()` and policy

```logts-play
doc(inline.asm.sets)
doc(.th)
```

```logts
NotAllow inline.asm.set{arm-thumb}
```

---

## Related

- [asm-set-riscv32.md](asm-set-riscv32.md) — 32-bit preset
- [asm-set-variable8.md](asm-set-variable8.md) — variable-length SPIKE
- [asm-composition.md](asm-composition.md) — combine Thumb blobs with `use`
