# CPU multi-core (`cores: N`)

Extension of [`comp [cpu]`](cpu.md) with **N execution cores** sharing one **ISA**, one **RAM**, and either one **shared program** or **per-core programs**. Scheduling is **round-robin** on each `set` / inside `run`. At reset only **core0** runs; other cores are **parked** (`halted = 1`) until you enable them with **`coresActive`** and **`wakeCore`**.

Examples use the **x86-32** native executor. In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run**.

See also: [asm-set-x86-32.md](asm-set-x86-32.md), [cpu.md](cpu.md).

---

## Attributes

| Attribute | Description |
|-----------|-------------|
| `cores: N` | Number of cores (1…8). Default `1` = classic single-core CPU. |
| `pcInit` | PC after reset / prog reload. Single value or comma list — **instruction index** per core (see [Shared program + pcInit](#shared-program--pcinit)). |
| `prog:` | Shared initializer **or** nested `core0:` / `core1:` … sections (mutually exclusive). |

Everything else (`isa:`, `ram:`, `registers:`, `sp:`, `set`, `run`, `trace`, …) behaves like the single-core CPU.

---

## Boot and wake

| State | core0 | core1…N-1 |
|-------|-------|-----------|
| After reset | `halted = 0`, in round-robin | `halted = 1`, parked |
| `coresActive` | Bitmask — core `i` runs only if bit `i` is `1` | Same |
| `wakeCore = k` | Clears `halted` on core `k`, sets bit `k` in `coresActive` | |
| `parkCore = k` | Sets `halted` on core `k`, clears bit `k` | |

**Binary literals** (LogTscript syntax — no `0b` prefix):

| Cores | Only core0 active | Core0 + core1 active |
|-------|--------------------|-----------------------|
| 2 | `coresActive = 1` or `01` | `coresActive = 011` |

Properties without prefix (`pc`, `r0`, `halted`, …) always refer to **core0**. Use **`coreN:pc`**, **`coreN:r0`**, **`coreN:halted`** to peek other cores.

IRQ pins are served on **core0 only** (same as single-core behaviour).

---

## Per-core program

Each core gets its own `prog` image under `prog: core0:` / `core1:`:

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .mp:
  isa: .x86
  cores: 2
  registers: 8
  sp: 4
  on: 1
  maxSteps: 8
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 64
    core0:
      = .x86 {
        mov eax, 1
        jmp halt
      halt:
        jmp halt
      }
    core1:
      = .x86 {
        mov eax, 42
        jmp halt
      halt:
        jmp halt
      }
  :

.mp:{ run = 1 }
.mp:{ coresActive = 011, wakeCore = 1, run = 1 }
```

After **Load & Run**: core0 leaves **`r0` (eax) = 1**; after the wake line, **`core1:r0` = 42**.

---

## Shared program + pcInit

One program blob; **`pcInit: i0, i1, …`** sets the starting **instruction index** per core (not byte offset in variable-length x86 encoding).

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .mp:
  isa: .x86
  cores: 2
  registers: 8
  sp: 4
  on: 1
  maxSteps: 10
  pcInit: 0, 2
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 64
    = .x86 {
      mov eax, 1
      jmp done
    worker:
      mov eax, 77
      jmp done
    done:
      jmp done
    }
  :

.mp:{ run = 1 }
.mp:{ coresActive = 011, wakeCore = 1, run = 1 }
```

Core0 runs from index **0** (`mov eax, 1`). Core1, after wake, starts at index **2** (`worker:` → `mov eax, 77`).

> **Tip:** Instruction indices match the assembled `code` entries (0, 1, 2, …), not label byte offsets. Use a small assemble probe or the test helper pattern if labels move.

---

## Round-robin scheduling

On each **`set = 1`**, exactly **one** instruction executes on the **next runnable** core (active bit set, not halted). **`run = 1`** loops round-robin until all runnable cores halt or `maxSteps` is reached.

Parked or halted cores are **skipped**. Trace lines are prefixed with **`[cN]`** when `trace` is enabled.

---

## Shared RAM

All cores share the same **`ram:`** space (or linked `ram = .mem` / `mmap =`). Peek with **`ram:get`** / **`ramAdr`** — visible from any core. Native x86 `[address]` accesses use the executor’s flat address map (see [cpu.md — x86-32](cpu.md)); for teaching, prefer **`ram:get`** or MMIO patterns when you need word-indexed RAM.

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .mp:
  isa: .x86
  cores: 2
  registers: 8
  on: 1
  ram:
    depth: 32
    length: 16
    = ^00000005
  prog:
    depth: 8
    length: 32
    core0:
      = .x86 { jmp halt halt: jmp halt }
    core1:
      = .x86 { jmp halt halt: jmp halt }
  :

.mp:{ ramAdr = 0, set = 1 }
8wire cell = .mp:ram:get
```

After **Load & Run**, **`cell`** holds word 0 (`5`).

---

## Properties summary

| Property | Role |
|----------|------|
| `coresActive` | Read/write scheduling bitmask (binary) |
| `wakeCore` | Unpark core index (decimal) |
| `parkCore` | Park core index (decimal) |
| `coreN:pc`, `coreN:halted`, `coreN:r0`… | Per-core peek |
| `set`, `run`, `reset`, … | Same as [cpu.md](cpu.md) |

---

## Backward compatibility

`cores: 1` (or omit `cores`) keeps the original flat device layout and behaviour — existing scripts and tests unchanged.

---

## Tests

Automated coverage: test group **`cpu-multicore`**, ids **3400–3407** in `tests/test_suite.js`.
