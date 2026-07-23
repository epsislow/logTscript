# CPU Component (`comp [cpu]`)

Contained interpreter CPU (Harvard v1): internal **program** (`prog`) and **data RAM** (`ram`), register file, one instruction per active `set` pulse — or many instructions per **`run`** pulse (see [Run and `maxSteps`](#run-and-maxsteps)). Opcode decoding uses an `inline [asm]` ISA profile (8-bit words in the MVP test profile).

For a board-level stepping demo with external mem chips, see [mini-cpu-v2.md](mini-cpu-v2.md).

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [mini-cpu-v2.md](mini-cpu-v2.md)).

---

## Syntax

```
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  STORE : 0010 + R2b + A2b
  ADDI  : 0011 + R2b + A2b
  SUBI  : 0100 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0110 + O4b
  HALT  : 0111 + 4b
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  on: 1
  ram:
    depth: 8
    length: 16
    = ^11
  prog:
    depth: 8
    length: 32
    = .cpuisa {
      LOAD R0 A0
      HALT
    }
  :
```

Use **`on: 1`** (level) or **`on: raise`** (edge) so property blocks that drive `set` / `run` run like other components ([reg.md](reg.md), [mem.md](mem.md)).

---

## Attributes

| Attribute | Description |
|-----------|-------------|
| `isa:` | Binding to an `inline [asm]` ISA (`.cpuisa`) |
| `registers` | Number of GPRs `R0`…`R(n-1)` (default 4) |
| `pcInit` | PC value after reset / prog reload (default 0) |
| `onReset` | Comma list: `pc`, `regs`, `ram`, `sp`, `halted` (default `pc,regs,sp,halted`) |
| `trace` | `off` (default), `1` / buffer, `output`, `trace = .term`, or `trace: .term` |
| `maxSteps` | Maximum instructions per **`run`** pulse (default 10000) |
| `sp` | Register index used as stack pointer (optional; PUSH/POP) |
| `ram:` / `prog:` / `map:` | Nested blocks: `depth`, `length`, optional `=` initializer |

### Initializers (`ram:` / `prog:`)

- Binary blob: `= ^ff` or `= 1010…`
- Wire: `= myProg` (wire holds assembled program bits)
- ASM: `= .cpuisa { LOAD R0 A0; HALT }`

Reload program with **`.u:prog = …`** (not direct assign on the component body). Reloading **prog** resets **PC ← pcInit** and **halted ← 0**.

---

## Pins and properties

| Pin / property | Role |
|----------------|------|
| `set` | One fetch-decode-execute step (manual clock) |
| `run` | Run until HALT or `maxSteps` (each instruction still traced if enabled) |
| `reset` | Apply `onReset` flags |
| `resetPC`, `resetRAM`, `resetRegs`, `resetSP`, `resetHalted` | Granular resets (active `1`) |
| `ramAdr`, `progAdr` | Address for peek ports |
| `pc`, `halted`, `instr` | Pout-style reads |
| `r0`…`rN` | Register peek |
| `ram:get`, `prog:get` | Read word at `ramAdr` / `progAdr` |
| `trace:get` | Trace text when `trace: 1` or `output` |

Example — two steps then halt:

```
.u:{ set = 1 }
.u:{ set = 1 }
```

Example — clear RAM and read cell 0:

```
.u:{ resetRAM = 1, ramAdr = 0, set = 1 }
8wire cell = .u:ram:get
```

---

## Run and `maxSteps`

| Pin | Behaviour |
|-----|-----------|
| `set = 1` | Exactly **one** instruction |
| `run = 1` | Loop inside the interpreter: repeat `cpuStep` until **HALT** or **`maxSteps`** |

`maxSteps` is set on the component (not a pin). If the program loops forever, `run` stops after `maxSteps` with `halted` still `0`.

Trace to a [terminal](terminal.md) (`trace = .tr` or `trace: .tr`) is emitted **on every step** inside `run`, not only on `set`.

---

## MVP ISA notes (test profile)

| Mnemonic | Encoding | Effect |
|----------|----------|--------|
| NOP | `0000` + 4b | No operation |
| LOAD | `0001` + R2b + A2b | `Rr ← ram[A]` |
| STORE | `0010` + R2b + A2b | `ram[A] ← Rr` |
| ADDI | `0011` + R2b + A2b | `Rr ← Rr + imm` (low 2 bits of `A`) |
| SUBI | `0100` + R2b + A2b | `Rr ← Rr - imm` (low 2 bits, wrap) |
| JMP | `0101` + A4b | `PC ← A` |
| BEQ | `0110` + O4b | If `R0 == 0`, `PC ← PC+1+O` (signed 4-bit) |
| HALT | `0111` + 4b | Stop; PC unchanged |

**Note:** `BEQ` always tests **R0**. Use `R0` as the loop counter, or `LOAD R0` before `BEQ`.

Address operands `A0`, `A1`, … refer to **RAM word indices**, not register numbers.

Optional opcodes when defined in your ISA: **PUSH** (`1000`), **POP** (`1001`), **OUT** (`1010` + `output = .terminal`).

---

## Phase 2 (contained CPU)

| Attribute / pin | Description |
|-----------------|-------------|
| `fetch:` | `prog` (default) or `ram` / `1` for Von Neumann fetch from internal RAM |
| `maxSteps` | Cap for `run` (default 10000) |
| `run` | Run until HALT or `maxSteps` |
| `output = .terminal` | `OUT` writes low byte of register as ASCII |
| `trace = .terminal` | Per-step trace lines appended to terminal |
| `clock:` | Parsed binding (use `set = .osc:get` for stepping) |
| `sp` + `map.stack` | Stack in RAM; PUSH/POP |

---

## Runnable examples (Load / Load & Run)

### cpu-step-load

One `LOAD` from RAM, then two manual `set` pulses (step-by-step).

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  HALT  : 0111 + 4b
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  on: 1
  ram:
    depth: 8
    length: 4
    = ^2a
  prog:
    depth: 8
    length: 8
    = .cpuisa {
      LOAD R0 A0
      HALT
    }
  :

.u:{ set = 1 }
.u:{ set = 1 }
8wire r0 = .u:r0
show(r0)
```

**Load & Run:** `r0` shows `00101010` (42). Press **Next** if you use `set = ~` blocks elsewhere; here both steps run at load.

---

### cpu-run-countdown

`RAM[0] = 3`. Loop: **SUBI** / **BEQ** / **JMP** until `R0 = 0`, then **HALT**. Single **`run = 1`** with `maxSteps: 32`.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  STORE : 0010 + R2b + A2b
  ADDI  : 0011 + R2b + A2b
  SUBI  : 0100 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  on: 1
  maxSteps: 32
  ram:
    depth: 8
    length: 4
    = ^03
  prog:
    depth: 8
    length: 16
    = .cpuisa {
      LOAD R0 A0
    loop:
      SUBI R0 A1
      BEQ done
      JMP loop
    done:
      HALT
    }
  :

.u:{ run = 1 }
8wire r0 = .u:r0
1wire h = .u:halted
show(r0)
show(h)
```

**Load & Run:** `r0` is `00000000`, `halted` is `1`.

---

### cpu-run-trace-terminal

Same countdown, but each instruction appends a trace line to **`.tr`** during **`run`**.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  STORE : 0010 + R2b + A2b
  ADDI  : 0011 + R2b + A2b
  SUBI  : 0100 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :

comp [terminal] .tr:
  rows: 24
  columns: 72
  on: 1
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  on: 1
  trace = .tr
  maxSteps: 48
  ram:
    depth: 8
    length: 4
    = ^03
  prog:
    depth: 8
    length: 16
    = .cpuisa {
      LOAD R0 A0
    loop:
      SUBI R0 A1
      BEQ done
      JMP loop
    done:
      HALT
    }
  :

.u:{ run = 1 }
```

**Load & Run:** open the **terminal** panel for `.tr` — multiple lines `# step pc=… halted=…`, last line with `halted=1`.

---

### cpu-run-sum-loop

More complex: load two values from RAM, **ADDI** to sum, store result, second loop counts down with **SUBI** / **BEQ**, then leaves final sum in `R0`.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  STORE : 0010 + R2b + A2b
  ADDI  : 0011 + R2b + A2b
  SUBI  : 0100 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  on: 1
  maxSteps: 64
  ram:
    depth: 8
    length: 4
    = ^05030000
  prog:
    depth: 8
    length: 32
    = .cpuisa {
      LOAD R0 A0
      ADDI R0 A2
      STORE R0 A3
      LOAD R0 A1
    loop:
      SUBI R0 A1
      BEQ done
      JMP loop
    done:
      LOAD R0 A3
      HALT
    }
  :

.u:{ run = 1 }
8wire sum = .u:r0
show(sum)
```

**Load & Run:** `sum` is `00000111` (5 + 2). RAM word at index 3 also holds `7`.

---

## Phase 3 — linked memory (`prog =` / `ram =`)

Each space is **either** an internal sub-block **or** a binding to `comp [mem]` (not both):

```logts
comp [mem] .rom:
  depth: 8
  length: 32
  readonly: 1
  = .cpuisa { LOAD R0 A0; HALT }
  on: 1
  :

comp [mem] .data:
  depth: 8
  length: 16
  = ^00
  on: 1
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  prog = .rom
  ram = .data
  :
```

| Combination | Syntax |
|-------------|--------|
| Both internal | `ram:` / `prog:` sub-blocks (default) |
| Prog external | `prog = .rom` + internal `ram:` |
| RAM external | `ram = .data` + internal `prog:` |
| Both external | `prog = .rom` and `ram = .data` |

CPU semantics (`set`, `run`, LOAD/STORE, reload `.u:prog =`) are unchanged; fetch/load/store call `getMem` / `setMem` on the linked device when bound. Init and reload of a linked space use the external `mem` (declare and load `.rom` / `.data` directly, or `.u:prog =` which writes the linked ROM).

---

## Interrupts (IRQ, phase 4)

IRQ is evaluated **after each completed instruction** (`set` or each step inside `run`), not while an instruction is executing. If the CPU is **halted**, IRQ is ignored.

| Pin / read | Role |
|------------|------|
| `irq` | Level request (`1` = active). Sampled when the step finishes. |
| `irqVec` | Vector index (4 bits). Default `0` if omitted. |
| `ie` | Interrupt enable (`1` = IRQ may be served). |
| `irqPending` | `1` when `irq` is active but `ie` is `0` (masked). |

| Attribute | Role |
|-----------|------|
| `map.vectorBase` | RAM address of the vector table: `PC ← ram[vectorBase + irqVec]` (word value = new PC). |
| `vectors:` | Comma list of fixed PC values (e.g. `vectors: 3, 5`) instead of a RAM table. |

On service: save **PC** and **IE**, set **IE ← 0**, jump to the handler PC. **`RETI`** restores PC and IE. Use **`EI`** / **`DI`** in your ISA profile (example opcodes `1100` / `1101` / `1110` in `.cpuisa_irq`).

With **level** `irq`, if the line stays `1` after `RETI` and **IE** is on again, the CPU may enter the handler again on the next step — lower `irq` when the event is done.

```logts
inline [asm] .cpuisa_irq:
  ...
  EI    : 1100 + 4b
  DI    : 1101 + 4b
  RETI  : 1110 + 4b
  :

comp [cpu] .u:
  isa: .cpuisa_irq
  vectors: 4
  on: 1
  prog: ...
  :

1wire irqLine = 0
.u:{ irq = irqLine, set = 1 }
.u:{ irq = 1, set = 1 }
.u:{ irq = 0, set = 1 }
```

Binding `irq = .pic` (interrupt controller) is planned for a later sub-phase.

---

## Out of scope (later)

- **PIC / `irq = .component`** — after `comp [pic]` exists (plan faza 4c).
- **DMA** — plan **faza 5**, componentă separată `comp [dma]` (fără CPU obligatoriu); același plan, secțiune „Faza 5”.
