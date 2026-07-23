# CPU Component (`comp [cpu]`)

Contained interpreter CPU (Harvard v1): internal **program** (`prog`) and **data RAM** (`ram`), register file, one instruction per active `set` pulse. Opcode decoding uses an `inline [asm]` ISA profile (8-bit words in the MVP test profile).

For a board-level stepping demo with external mem chips, see [mini-cpu-v2.md](mini-cpu-v2.md).

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

Use **`on: 1`** (level) or **`on: raise`** (edge) so property blocks that drive `set` run like other components ([reg.md](reg.md), [mem.md](mem.md)).

---

## Attributes

| Attribute | Description |
|-----------|-------------|
| `isa:` | Binding to an `inline [asm]` ISA (`.cpuisa`) |
| `registers` | Number of GPRs `R0`…`R(n-1)` (default 4) |
| `pcInit` | PC value after reset / prog reload (default 0) |
| `onReset` | Comma list: `pc`, `regs`, `ram`, `sp`, `halted` (default `pc,regs,sp,halted`) |
| `trace` | `off` (default), `on` (buffer), `output` (buffer + echo via interpreter hook) |
| `sp` | Register index used as stack pointer (optional, faza 2 stack ops) |
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
| `set` | One fetch-decode-execute step (clock) |
| `reset` | Apply `onReset` flags |
| `resetPC`, `resetRAM`, `resetRegs`, `resetSP`, `resetHalted` | Granular resets (active `1`) |
| `ramAdr`, `progAdr` | Address for peek ports |
| `pc`, `halted`, `instr` | Pout-style reads |
| `r0`…`rN` | Register peek |
| `ram:get`, `prog:get` | Read word at `ramAdr` / `progAdr` |
| `trace:get` | Trace text when `trace: on` or `output` |

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

## MVP ISA notes (test profile)

| Mnemonic | Encoding | Effect |
|----------|----------|--------|
| NOP | `0000` + 4b | No operation |
| LOAD | `0001` + R2b + A2b | `Rr ← ram[A]` |
| STORE | `0010` + R2b + A2b | `ram[A] ← Rr` |
| ADDI | `0011` + R2b + A2b | `Rr ← Rr + imm` (low 2 bits) |
| SUBI | `0100` + R2b + A2b | `Rr ← Rr - imm` (low 2 bits, unsigned wrap) |
| JMP | `0101` + A4b | `PC ← A` |
| BEQ | `0110` + O4b | If `R0 == 0`, `PC ← PC+1+O` (signed 4-bit) |

**Note:** `BEQ` always tests **R0**, not the register used by the previous `SUBI`/`ADDI`. Use `R0` as the loop counter, or `LOAD R0` before `BEQ`.
| HALT | `0111` + 4b | Stop; PC unchanged |

Address operands `A0`, `A1`, … refer to **RAM word indices**, not register numbers.

---

## Out of scope (v1)

- `fetch: ram` (Von Neumann), `run` loop, external `ram:`/`prog:` links, `clock:`, IRQ/DMA — see project plan faza 2+.
