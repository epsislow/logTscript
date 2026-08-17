# ASM microcode (`consts`, `macros`, `{ micro }`)

Extend an `inline [asm]` ISA with a **register address map** (`consts`), reusable **micro sequences** (`macros`), and per-opcode **micro programs** (`{ … }`). When a CPU binds that ISA, opcodes **with** a micro block run on the **micro engine**; opcodes **without** keep the built-in **legacy** interpreter (`LOAD`, `STORE`, `JMP`, …).

For basic ISA syntax see [asm.md](asm.md). For CPU stepping, memory modes, and `doc(.cpu…)` see [cpu.md](cpu.md#microcode-dual-execution).

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run**.

---

## Overview

| Piece | Role |
|-------|------|
| `consts:{ … }` | Names → slot addresses (`^02`) or ALU literals (`000`) — **source of truth** for `doc(.cpuisa)` |
| `macros:{ … }` | Parameterised micro snippets expanded at parse time |
| `MNEMONIC : pattern` | Opcode **without** `{ }` → **legacy** on `comp [cpu]` |
| `MNEMONIC : pattern { … }` | Opcode **with** micro block → **micro engine** on `comp [cpu]` |
| `READ` / `WRITE` | Memory access via `MAR` / `MDR` consts (internal RAM, external `mem`, or `mmap`) |
| `pcEffect` | Static hint in `doc(.cpuisa)`: `autoInc`, `seq` (explicit `PC` transfer), or `halt` |

**Dual per opcode:** one `.cpuisa` can mix legacy `LOAD` and micro `FOO` in the same program.

---

## `consts` — address map

```logts
inline [asm] .cpuisa:
consts:{
  PC     = ^02
  R0     = ^20
  R1     = ^21
  MAR    = ^10
  MDR    = ^11
  ALUA   = ^30
  ALUB   = ^31
  ALUOP  = ^32
  ALUOUT = ^33
  ADD    = 000
  SUB    = 001
}
  NOP   : 0000 + 4b
  :
```

| Syntax | Meaning |
|--------|---------|
| `NAME = ^addr` | Internal micro slot at address `addr` (hex-style literal, same as wire `^02`) |
| `ADD = 000` | Literal operand for transfers like `ALUOP < ADD` |

`R0`…`Rn` in consts are **architectural** names; decoded operands `R` and `A` from the instruction pattern are resolved at run time.

`doc(.cpuisa)` lists every const. `doc(.cpuintern)` (and other CPU instances) copies the same table under **ISA consts:**.

---

## `macros` — reusable micro snippets

```logts
macros:{
  INC reg:{
    ALUA < reg
    ALUB < 1
    ALUOP < ADD
    reg < ALUOUT
  }
}
```

| Rule | Detail |
|------|--------|
| Invocation | `INC PC` on its own line inside `{ micro }` |
| Parameters | `reg:reg` typed params supported; expansion is textual |
| Recursion | **Error** — `Recursive macro 'NAME'` |
| Depth | Max 64 expansion levels |

---

## Micro operations

Inside `{ … }` after an opcode pattern:

| Form | Meaning |
|------|---------|
| `DST < SRC` | Transfer: write slot/literal/register operand into `DST` |
| `READ` | `mem[MAR] → MDR` (CPU data space: internal RAM, `ram = .chip`, or `mmap`) |
| `WRITE` | `MDR → mem[MAR]` |

**Operands in transfers:**

| Symbol | Source |
|--------|--------|
| `R` | Register index from decoded `R2b` field |
| `A` | Address index from decoded `A2b` field |
| `R0`, `PC`, `MAR`, … | Names from `consts` |
| `1`, `ADD`, … | Numeric / const literals |

**`READ` is real memory access**, not a register move: the engine reads `MAR`, fetches the data word, stores it in `MDR`.

### `pcEffect` (documentation + static analysis)

Computed when the ISA is parsed:

| `pcEffect` | When |
|------------|------|
| `autoInc` | No `PC < …` in the micro program (default) |
| `seq` | Micro program contains `PC < …` |
| `halt` | Micro program writes `HALTED` (rare; legacy `HALT` uses built-in path) |

At run time the CPU still advances PC according to the micro/legacy path; `pcEffect` is shown in `doc(.cpuisa)` next to each opcode.

---

## Hybrid ISA example (legacy + micro)

```logts-play
inline [asm] .cpuisa:
consts:{
  PC = ^02
  R0 = ^20
  R1 = ^21
  MAR = ^10
  MDR = ^11
  ALUA = ^30
  ALUB = ^31
  ALUOP = ^32
  ALUOUT = ^33
  ADD = 000
}
macros:{
  INC reg:{
    ALUA < reg
    ALUB < 1
    ALUOP < ADD
    reg < ALUOUT
  }
}
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  HALT  : 0111 + 4b
  FOO:
  1011 + R2b + A2b
  {
    INC PC
    MAR < A
    READ
    R < MDR
  }
  :

comp [cpu] .cpuintern:
  isa: .cpuisa
  registers: 2
  on: 1
  ram:
    depth: 8
    length: 4
    = ^11
  prog:
    depth: 8
    length: 8
    = .cpuisa {
      FOO R0 A0
      HALT
    }
  :

.cpuintern:{ set = 1 }
8wire r0 = .cpuintern:r0
show(r0)
```

**Load & Run:** `r0` is `00010001` (RAM cell A0 loaded via micro `FOO`). `LOAD` in the same ISA would still use the legacy path.

---

## `doc(.cpuisa)` — ISA reference

```logts-play
inline [asm] .cpuisa:
consts:{
  PC = ^02
  MAR = ^10
  MDR = ^11
}
  LOAD : 0001 + R2b + A2b
  FOO:
  1011 + R2b + A2b
  {
    MAR < A
    READ
    R < MDR
  }
  :

doc(.cpuisa)
```

Output includes **consts**, **macros**, each opcode with `[legacy]` or `[micro]`, and **pcEffect** where applicable.

---

## CPU memory modes and `doc()`

| Instance | Typical layout | `doc()` shows |
|----------|----------------|---------------|
| `.cpuintern` | Internal `ram:` + `prog:` | `memory: internal`, `ISA consts:` |
| `.cpucompexterne` | `prog = .rom`, `ram = .data` | `memory: external`, `prog = .rom`, `ram = .data` |
| `.cpummap` | `mmap = .mmap` (logical address space) | `memory: mmap`, `mmap = .mmap` |

Micro `READ`/`WRITE` use the CPU's configured data backing (internal, linked `mem`, or `mmap` region).

### Runnable — internal memory (`doc(.cpuintern)`)

See [cpu.md](cpu.md#microcode-internal-cpuintern).

### Runnable — external memory (`doc(.cpucompexterne)`)

See [cpu.md](cpu.md#microcode-external-cpucompexterne).

### Runnable — mmap (`doc(.cpummap)`)

See [cpu.md](cpu.md#microcode-mmap-cpummap) and [mmap.md](mmap.md).

---

## Preset sets (`riscv32`, `arm-thumb`)

Preset opcodes ship **without** micro programs. On `comp [cpu]`, they use the CPU's native stepping for that set (when wired) or act as encode/decode-only in wire blobs.

You may attach a **`{ micro }` block** to a preset mnemonic in your ISA to override execution (same as generic):

```logts-play
inline [asm] .rv:
  set: riscv32
  consts:{
    PC = ^02
    R1 = ^21
  }
  FOO:
  {
    PC < PC
  }
  :

32wire p = .rv { addi x1, x0, 1 }
```

User opcode bodies that use generic segment tokens (`R2b`) on a preset set are rejected at ISA parse time. Literal-only overrides are allowed.

See [asm-set-riscv32.md](asm-set-riscv32.md), [asm-set-arm-thumb.md](asm-set-arm-thumb.md), and [asm-set-generic.md](asm-set-generic.md) for segment syntax on **`set: generic`**.

---

## Errors

| Situation | Message (example) |
|-----------|-------------------|
| Recursive macro | `Recursive macro 'A'` |
| Unknown macro | `Unknown macro 'FOO'` |
| Missing MAR/MDR on READ | `Micro READ requires MAR and MDR in ISA consts` |
| Duplicate const | `Duplicate const 'PC'` |

---

## Related

- [asm.md](asm.md) — ISA declaration and assembly
- [cpu.md](cpu.md) — `comp [cpu]`, `set`/`run`, linked memory, mmap
- [mmap.md](mmap.md) — logical address map for CPU/DMA
- [mem.md](mem.md) — external `comp [mem]` chips
