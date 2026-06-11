# Mini CPU / ALU with memory — feasibility

## Short answer

**Yes** — you can build a small demonstrator script (“CPU with 1 register + RAM + ALU”) using only what exists today. **`comp [mem]` alone is not enough conceptually**, but together with a few existing language primitives you cover ALU + storage + execution steps.

**No new component types** are required in the engine for a teaching demo. What is “missing” is mostly **organization** (chips/boards) and **clock discipline** (one step = one pulse), not new types (`instruction`, `bus`, etc.).

---

## What you already have (enough for a mini-CPU)

| CPU role | LogTScript primitive | Notes |
|----------|----------------------|-------|
| **RAM / program** | `comp [mem]` | ROM init with `= ^hex`; read/write via `.ram:{ at, data, write }` — [mem.md](mem.md) |
| **ALU (ADD/SUB/AND…)** | `comp [adder]` / `[subtract]` or `ADD()` / `SUBTRACT()` | For a persistent CPU, prefer **components** in a `chip`, not instant functions — [adder.md](adder.md) |
| **Operation select** | `MUX` / `MUX2` / `MUX3` | Pick ALU result from a few instruction bits |
| **Accumulator / IR** | `REG(data, clk, clr)` or `comp [reg]` | State between steps — [reg.md](reg.md) |
| **Program counter** | `comp [counter]` | Load + increment on `dir` — [counter.md](counter.md) |
| **Flags (carry, zero)** | `carry` from adder; `EQ` for zero | No dedicated “flags” component |
| **Shift** (optional) | `LSHIFT` / `RSHIFT` or `comp [shifter]` | Not required for simple instructions |
| **Clock / step** | `comp [key]` or `comp [osc]` + `comp [switch]` | One **step** = one pulse (manual or automatic) |
| **UI program / state** | `board` + `dip`, `switch`, `led`, `7seg` | Board allows panel + wave in body — [board.md](board.md) |
| **Reusable logic** | `chip` (ALU, decoder) inside `board` (system) | ALU without UI in chip; mem + display in board — [chip.md](chip.md) |

```mermaid
flowchart TB
  subgraph board [board miniCPU]
    UI[dip_switch_key_led]
    RAM[comp_mem]
    PC[comp_counter]
    ACC[REG_or_reg]
    subgraph chipAlu [chip aluCore]
      MUX[MUX_op_select]
      ADD[comp_adder]
      SUB[comp_subtract]
    end
    UI --> PC
    PC --> RAM
    RAM --> ACC
    ACC --> chipAlu
    chipAlu --> ACC
  end
```

---

## Recommended architecture

### Variant A — “Teaching Harvard” (implemented)

- **`mem` program** (ROM): instructions preloaded with `= ^....`
- **`mem` data** (RAM): runtime variables
- **PC** (`counter`): current instruction address
- **Accumulator** (`comp [reg]`): operand + result
- **ALU** (`chip +[alu4]`): add/sub + MUX on `op[1]`
- **Top board** (`board +[cpu4]`): clock (`set`), reset (`rst`), display (`7seg`), pout `acc` / `pc` / `ir`

**One cycle (manual):**

1. Fetch instruction at `PC` from program memory
2. Simple decode (high nibble = opcode, low nibble = operand)
3. Execute (ALU / mem write / mem load / jump)
4. `PC++` or load new PC on jump
5. Wait for next pulse on `set`

See [mini-cpu.md](mini-cpu.md) for the ISA and full script.

### Variant B — “ALU demo” (no full fetch)

DIP for operands + opcode, `adder`/`subtract`, `led`/`7seg` for result. **No program memory** — useful as a first step before a full CPU.

---

## What you do NOT need as a new component type

| Idea | Existing alternative |
|------|----------------------|
| “Instruction register” | `REG` / wire + property block on step |
| “Bus” | MUX + wiring in chip |
| “Hardware decoder” | `chip` with MUX on opcode; or top-level `def` |
| “Stack” | second `counter` + `mem` |
| “Program loader” | `mem` init with `=` or `.ram = ^hex` |

---

## Limitations to keep in mind

1. **`mem` is not combinational** — read/write goes through property blocks (`at`, `write`, `set`). Design the CPU **clocked / step-by-step**.
2. **Wave in board** — predictable behavior per step; avoid implicit combinational loops in the same tick.
3. **Small widths** — for demo: `depth: 4`, `length: 8–16`, 4-bit opcode (high nibble), ~6 instruction types.
4. **`def` in board/chip body** — forbidden; decode logic via wiring/MUX.

---

## Implementation steps (variant A)

1. **ALU chip** (`chip +[alu4]`): `a`, `b`, `op[2]`, `result`, `carry`
2. **Step CPU board** (`board +[cpu4]`): program mem, data mem, PC, ACC, ALU instance, pin `set`, `7seg`, pout `acc`/`pc`/`ir`
3. **Minimal ISA** on 8 bits: opcode nibble + operand nibble
4. Tests + `probe(.cpu:acc)`; demo program in ROM
