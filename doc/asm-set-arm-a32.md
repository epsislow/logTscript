# ASM set: arm-a32 (32-bit ARM mode subset)

The **arm-a32** preset assembles a subset of **32-bit ARM** (A32) instructions into a **variable-length byte blob** (four bytes per instruction in this MVP). Declare `set: arm-a32` and use syntax like `mov r1, #5`, `add r2, r0, r1`, `ldr r3, [r0, #4]`.

Combine with **`arm-thumb`** via **`use`** (strategy **2a**, D36) — see [asm-composition.md](asm-composition.md).

See also: [asm.md](asm.md), [asm-set-arm-thumb.md](asm-set-arm-thumb.md), [asm-set-x86-32.md](asm-set-x86-32.md), [cpu.md](cpu.md).

---

## Declaration

```logts
inline [asm] .a32:
  set: arm-a32
  :
```

| Property | Value |
|----------|--------|
| `encoding` | **`variable`** (4 bytes per instruction in MVP) |
| `wordWidth` | **8** (storage cell = one byte) |
| Registers | **`r0`–`r15`** |
| Condition | **AL** only (unconditional) in MVP |

---

## Preset opcode table

| Mnemonic | Syntax (examples) |
|----------|-------------------|
| `mov` | `mov rd, rm` · `mov rd, #imm` (0–255) |
| `add` | `add rd, rn, rm` · `add rd, rn, #imm` |
| `sub` | `sub rd, rn, rm` · `sub rd, rn, #imm` |
| `cmp` | `cmp rn, rm` |
| `and` | `and rd, rn, rm` |
| `orr` | `orr rd, rn, rm` |
| `ldr` | `ldr rd, [rn, #imm]` |
| `str` | `str rd, [rn, #imm]` |
| `b` | `b label` |
| `bl` | `bl label` |
| `bx` | `bx rm` |

Labels use **byte addresses** (same as x86-32 / variable8). Branch offsets follow ARM **PC+8** convention.

---

## Runnable — MOV / ADD

```logts-play
inline [asm] .a32:
  set: arm-a32
  :

64wire p = .a32 {
  mov r1, 5
  add r2, r0, r1
}
show(p)
show(p; asm)
show(.a32:decode(p))
```

**Load:** declares `.a32` and wire `p`.

**Load & Run:** **64 bits** = 8 bytes = two 4-byte instructions. Decode shows `mov r1, #5` and `add r2, r0, r1`.

---

## Runnable — load / store

```logts-play
inline [asm] .a32:
  set: arm-a32
  :

128wire mem = .a32 {
  mov r0, 0
  mov r1, 42
  str r1, [r0, 0]
  ldr r2, [r0, 0]
}
show(mem; asm)
```

**Load & Run:** four 4-byte instructions (128 bits total if you extend the program — adjust wire width accordingly).

---

## Runnable — composition with Thumb (1+x.2a)

```logts-play
inline [asm] .a32:
  set: arm-a32
  :

inline [asm] .th:
  set: arm-thumb
  :

16wire th = .th { movs r0, 1 }
48wire mix = .a32 {
  use th
  mov r1, 5
}
show(mix)
show(mix; asm)
```

**Load & Run:** **48 bits** = 2-byte Thumb + 4-byte A32. **`show(mix; asm)`** decodes each segment with its own ISA metadata.

---

## Runnable — CPU execution

```logts-play
inline [asm] .a32:
  set: arm-a32
  :

comp [cpu] .u:
  isa: .a32
  registers: 16
  sp: 13
  on: 1
  maxSteps: 4
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 32
    = .a32 {
      mov r1, 10
      mov r2, 3
      add r3, r1, r2
    loop:
      b loop
    }
  :

.u:{ run = 1 }
show(.u:r3)
```

**Load & Run:** **`r3`** = **13** after add. Set **`registers: 16`**, **`prog.depth: 8`**, **`sp: 13`**.

---

## Comparison: arm-thumb vs arm-a32

| | `arm-thumb` | `arm-a32` |
|---|-------------|-----------|
| Instruction size | **16** bits fixed | **32** bits (4 bytes) |
| Registers MVP | `r0`–`r7` | `r0`–`r15` |
| CPU `prog.depth` | **16** | **8** |
| Composition | `use` with riscv32 / a32 | `use` with thumb segments |

---

## Errors

| Message | Cause |
|---------|--------|
| `unknown register` | Not `r0`–`r15` |
| `immediate must be 0..255` | `mov` imm range in MVP |
| `branch offset out of range` | `b`/`bl` target too far |
| Directives on fixed preset | Use **`arm-a32`** or **`x86-32`**, not `arm-thumb` |

---

## Related

- [asm-set-arm-thumb.md](asm-set-arm-thumb.md) — 16-bit Thumb preset
- [asm-set-x86-32.md](asm-set-x86-32.md) — x86 variable preset
- [asm-composition.md](asm-composition.md) — `use` multi-set
- [allow-notallow.md](allow-notallow.md) — `inline.asm.set{arm-a32}`
