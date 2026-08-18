# ASM set: riscv32 (RV32I subset)

The **riscv32** preset provides a fixed **32-bit** RISC-V RV32I encoding for common mnemonics. You declare an almost-empty ISA with `set: riscv32` and write programs using standard RISC-V assembly syntax (`addi x1, x0, 5`).

Encoding and disassembly are built in; you do **not** write `+ R2b` segment lines unless you intentionally override an opcode with literal bits.

See also: [asm.md](asm.md), [asm-composition.md](asm-composition.md#riscv32-preset), [generic set](asm-set-generic.md), [arm-thumb set](asm-set-arm-thumb.md).

---

## Declaration

```logts
inline [asm] .rv:
  set: riscv32
  :
```

The closing `:` ends the header. No opcode lines are required — the preset supplies them.

Optional: add user opcodes with **literal-only** patterns (no `R2b` / `A2b` tokens). Segment tokens from the generic set are rejected on riscv32.

---

## Registers

| Syntax | Meaning |
|--------|---------|
| `x0` … `x31` | General-purpose register by number |
| `zero`, `ra`, `sp`, `gp`, `tp`, `t0`–`t6`, `s0`–`s11`, `a0`–`a7` | ABI aliases (`x0` = `zero`, `sp` = `x2`, …) |

---

## Preset opcode table

| Mnemonic | Typical use |
|----------|-------------|
| `addi rd, rs1, imm` | Add signed 12-bit immediate to `rs1`, write `rd` |
| `add rd, rs1, rs2` | `rd = rs1 + rs2` |
| `sub rd, rs1, rs2` | `rd = rs1 - rs2` |
| `lui rd, imm` | Load upper 20 bits of immediate into `rd` |
| `lw rd, imm(rs1)` | Load word from `rs1 + imm` |
| `sw rs2, imm(rs1)` | Store `rs2` to `rs1 + imm` |
| `beq rs1, rs2, target` | Branch if `rs1 == rs2` |
| `bne rs1, rs2, target` | Branch if `rs1 != rs2` |
| `jal rd, target` | Jump and link |
| `jalr rd, rs1, imm` | Jump and link register |
| `nop` | Pseudo-op (addi x0, x0, 0) |

---

## Runnable — add immediate

```logts-play
inline [asm] .rv:
  set: riscv32
  :

32wire p = .rv { addi x1, x0, 5 }
show(p)
show(p; asm)
show(.rv:decode(p))
```

One instruction → **32wire** (strict `=`). For wider ROM slots use `32wire:=` / `32wire=:` padding — see [asm.md](asm.md).

---

## Runnable — small sequence

```logts-play
inline [asm] .rv:
  set: riscv32
  :

96wire prog = .rv {
  addi x1, x0, 5
  addi x2, x0, 3
  add x3, x1, x2
}
show(prog; asm)
```

---

## Memory operands

Use `offset(rs1)` form (commas optional in LogTscript):

```logts-play
inline [asm] .rv:
  set: riscv32
  :

64wire p = .rv {
  addi x2, x0, 100
  sw x1, 0(x2)
  lw x3, 0(x2)
}
show(p; asm)
```

---

## Branches and labels

```logts-play
inline [asm] .rv:
  set: riscv32
  :

128wire p = .rv {
  addi x1, x0, 0
loop:
  addi x1, x1, 1
  addi x2, x0, 10
  bne x1, x2, loop
}
show(p; asm)
```

Branch offsets are resolved at assemble time (same pass-1 label collection as generic asm).

---

## Composition with `use`

Works like generic asm — referenced wire must use the same (or compatible) word width:

```logts-play
inline [asm] .rv:
  set: riscv32
  :

32wire boot = .rv { addi x1, x0, 1 }
64wire app = .rv {
  use boot
  addi x2, x0, 2
}
show(app; asm)
```

Details: [asm-composition.md](asm-composition.md#riscv32-preset).

---

## CPU bridge

Bind a riscv32 ISA to `comp [cpu]` with **`isa: .rv`** (not `set:` on the CPU). The CPU reads `asmSetId` from the referenced inline instance and runs the **native riscv32 executor** (phase 1+x.3a).

### Requirements

| Attribute | Required value |
|-----------|----------------|
| `registers` | **32** |
| `ram.depth` | **32** |
| `prog.depth` | **32** |

Mismatch at CPU init → error (e.g. `registers (4) must be 32 for asm set 'riscv32'`).

### Runnable — add, store, load

```logts-play
inline [asm] .rv:
  set: riscv32
  :

comp [cpu] .u:
  isa: .rv
  registers: 32
  on: 1
  maxSteps: 4
  ram:
    depth: 32
    length: 16
  prog:
    depth: 32
    length: 8
    = .rv {
      addi x1, x0, 5
      addi x2, x0, 3
      add x3, x1, x2
      sw x3, 0(x0)
      loop: beq x0, x0, loop
    }
  :

.u:{ run = 1 }
32wire x3 = .u:r3
.u:{ ramAdr = 0 }
32wire mem0 = .u:ram:get
show(x3, mem0)
```

**Load & Run:** `x3` and `mem0` are both `…1000` (decimal 8).

### Semantics (simulator)

- **PC** = instruction index (not byte address).
- **`lw` / `sw`:** byte offset with `index = byteAddr >> 2`; unaligned addresses error.
- **`x0`:** writes ignored (always zero).
- **Micro override:** opcodes with user `{ micro }` still use the micro engine (see [asm-microcode.md](asm-microcode.md)).
- **Heterogeneous composed blob** as CPU prog: undefined behaviour — use a single-architecture program for CPU exec.

See also [cpu.md](cpu.md#riscv32-native-exec).

---

## Policy

Restrict which presets are allowed:

```logts
NotAllow inline.asm.set{riscv32}
```

See [allow-notallow.md](allow-notallow.md).

---

## `doc()`

```logts-play
doc(inline.asm.sets)
doc(.rv)
```

After declaring `.rv`, `doc(.rv)` shows `set: riscv32` and the preset opcode list.

---

## Errors

| Message | Cause |
|---------|--------|
| `riscv32: unknown register 'eax'` | Use `x0`–`x31` or aliases |
| `segment token 'R2b' invalid for set 'riscv32'` | User opcode used generic segment token |
| `Expected 32 bits, got …` | Wire width must match 32×instruction count (or use `:=` / `=:`) |

---

## Related

- [asm-set-generic.md](asm-set-generic.md) — segment ISA from scratch
- [asm-microcode.md](asm-microcode.md) — micro `{ }` override on a preset opcode (advanced)
