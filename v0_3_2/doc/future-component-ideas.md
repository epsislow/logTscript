# Future component ideas — LogTScript

Brainstorming catalog for possible components or extensions, based on what the simulator already supports and lessons from the mini-CPU demo. **No** implementation order, estimates, or technical design — pick ideas one at a time when you decide.

Each table is followed by numbered subsections (A1, B2, …) with a short explanation of **what it does** and **how it could be used** in this simulator.

---

## Short context (what exists today)

**`comp` components:** switch, key, dip, rotary, led, bar, 7seg, 14seg, lcd, dots, adder, subtract, multiplier, divider, shifter, counter, mem, lut, reg, osc.

**`inline` (language):** asm, lut, protocol — see [asm.md](asm.md), [lut.md](lut.md), [protocol.md](protocol.md).

**Built-ins (no panel):** logic (NOT, AND, OR, MUX, DEMUX, EQ, LATCH…), REG, instant arithmetic (ADD, SUBTRACT, MULTIPLY, DIVIDE), LSHIFT/RSHIFT.

**Composites:** chip, board (recommended), pcb (legacy).

**Mini-CPU note:** many circuits are already possible with chip + board; most ideas below are **ready-made building blocks** or **teaching clarity**, not capabilities that are impossible today.

---

## A. Digital logic and teaching CPU

| Idea | Summary |
|------|---------|
| **Opcode ALU** (`alu`) | One block for ADD/SUB/AND… selected by a few bits, instead of a hand-wired ALU chip |
| **Comparator / flags** (`cmp`, `flags`) | Zero, carry, less-than, etc. for CPU branches |
| **Decoder** (`decoder`) | N inputs → 2^N one-hot outputs, for instruction decode |
| **Read-only ROM** (`rom` or mem readonly) | Same as mem semantically, but ROM (no writes) |
| **Dual-port RAM** (`dpram`) | Simultaneous read from two addresses/ports (fetch + data, pipeline) |
| **Combinational barrel shifter** | Instant logical/arithmetic shift by N bits (unlike the current sequential shifter) |
| **Stack** (`stack`) | Push/pop + stack pointer, for subroutines |
| **Instruction register** (`ir`) | “Ready-made” instruction register (opcode + operand) |

### A1. Opcode ALU (`alu`)

**What it does:** A single arithmetic/logic unit with operands `a`, `b`, an `op` selector (2–4 bits), and outputs such as `result`, `carry`, and optionally `zero`. One pulse or property block selects the operation (ADD, SUB, AND, OR, …) and produces the result.

**How I see it used:** Replace the hand-wired `chip +[alu4]` in the mini-CPU (adder + subtract + MUX on `op.1`) with one instance `.alu:` in a board. Students wire `acc` and operand into `a`/`b`, opcode bits into `op`, and read `result` back into the accumulator. Natural next step after the teaching CPU demo — same behaviour, less boilerplate, room to add AND/OR/shift later without growing the chip.

**Today:** Fully doable in a `chip` with `comp [adder]`, `comp [subtract]`, and `MUX()`. A dedicated `comp [alu]` would not add new engine capability, only a packaged teaching block.

---

### A2. Comparator / flags (`cmp`, `flags`)

**What it does:** Compares two N-bit values and exposes flag bits: `zero` (result = 0), `carry`/`borrow`, `less`, `equal`, sometimes `overflow`. A separate `flags` register could latch these on each ALU cycle for conditional branches.

**How I see it used:** Extend the mini-CPU ISA with `BEQ`, `BNE`, `BLT` — after SUB or CMP, branch if `zero` or `less` is set. In scripts: `probe(.flags:zero)` after each step to show why a jump did or did not happen. Pedagogically bridges “ALU does math” and “CPU makes decisions”.

**Today:** `EQ(a, b)` is a 1-bit built-in; carry comes from `comp [adder]:carry`. Flags require several wires and MUX/EQ glue. A `cmp` or `flags` comp would collect that into one probe-friendly device.

---

### A3. Decoder (`decoder`)

**What it does:** Takes an N-bit binary input and drives exactly one of 2^N outputs high (one-hot). Example: opcode `0011` → only output line 3 is `1`, all others `0`.

**How I see it used:** Instruction decode in a CPU — instead of four separate `EQ(opc, 0001)`, `EQ(opc, 0010)`, … wires, one `.dec:` turns opcode into enable lines for LOAD, STORE, ADDI, JMP. Also useful for 3-to-8 memory bank select, or enabling one of several peripherals on a shared bus.

**Today:** Built from `EQ` + AND wiring, or a small LUT pattern. A `decoder` comp is convenience and a standard digital-logic teaching block.

---

### A4. Read-only ROM (`rom` or mem readonly)

**What it does:** Memory that can be read by address but **cannot** be written at runtime (or writes are ignored / error). Program bytes live here; accidental `STORE` into program space is impossible.

**How I see it used:** Harvard teaching CPU with one memory type that is clearly “program” — `.rom:` with `= ^10334221` init, fetch via `.rom:{ at = pc }` and `.rom:get`, no write pins in student-facing docs. Clearer story than `comp [mem] .prog` where the same component also supports writes.

**Today:** `comp [mem] .prog` works; you simply never send `write = 1`. ROM is semantic clarity and possibly simpler API (no write properties in `doc()`).

---

### A5. Dual-port RAM (`dpram`)

**What it does:** One physical memory array with **two independent ports**. Each port has its own address (and read/write controls). In the same clock step, port A can read address 0 while port B reads or writes address 5.

**How I see it used:** **Von Neumann** CPU — program and data in the **same** RAM: port A fetches instruction at `PC`, port B loads/stores operand in the same cycle. Also DMA-style demos (CPU uses port A while “peripheral” uses port B) or dual readers of a shared lookup table.

**Today:** Mini-CPU avoids this with **two** `mem` instances (Harvard). Single `mem` requires sequential access (fetch step, then data step). `dpram` is the hardware pattern for one RAM, two simultaneous accesses.

---

### A6. Combinational barrel shifter

**What it does:** Given a value and a shift amount (or fixed shift), outputs the value shifted left or right **in one combinational step** — all bits move at once, like `LSHIFT`/`RSHIFT` built-ins.

**How I see it used:** ALU operations `SLL`, `SRL`, `SRA` in a teaching CPU; fast multiply-by-powers-of-2; bit-field extract. Pair with opcode ALU as the “shift” datapath.

**Today:** `LSHIFT`/`RSHIFT` as functions are combinational; `comp [shifter]` is a **sequential shift register** (one bit per pulse). The gap is a device that matches “shift by N in one cycle”, either as built-in only or as `comp [barrel]`.

---

### A7. Stack (`stack`)

**What it does:** A LIFO structure: `push` writes value at stack pointer and decrements/increments SP; `pop` reads and adjusts SP. Often bundled with a small RAM or internal storage and a `sp` output for debugging.

**How I see it used:** Subroutines (`CALL` / `RET`), saving return address on push, restoring on pop. Expression evaluation demos. Students see SP move in the variables panel or via `probe(.stack:sp)`.

**Today:** Second `comp [counter]` as SP + `comp [mem]` as stack array + manual address arithmetic in property blocks. A `stack` comp hides index math and documents the pattern.

---

### A8. Instruction register (`ir`)

**What it does:** A register specialised for holding the current instruction word, often with convenient slices: full `ir`, `opcode` (high nibble), `operand` (low nibble), maybe `valid` after fetch.

**How I see it used:** CPU cycle narrative: fetch → `ir` updates → decode reads `ir:opcode` → execute uses `ir:operand`. Cleaner than anonymous `8wire instr` in the board body; `probe(.cpu:ir)` already exists on the mini-CPU as a pout — an `ir` comp would standardise that inside the design.

**Today:** `comp [reg]` or `REG()` plus slice expressions `instr.0/4` / `instr.4/4`. An `ir` comp is naming and slice helpers, not new state machinery.

---

## B. Combinational devices as `comp` (pedagogy)

Already exist as built-in functions; as **components** they would show up uniformly in docs, panel, and probe.

| Idea | Summary |
|------|---------|
| **MUX / DEMUX** | Multiplexer/demultiplexer as a visual device |
| **LUT / lookup table** | Small address → value table without explicit logic — **done** |
| **Priority encoder** | For IRQ, keyboard scan, simple arbiter |
| **Tristate / bus buffer** | Shared bus, enable/disable output |
| **Latch / D-FF as comp** | Clear level-trigger vs edge (alongside REG and reg) |
| **Clock divider** | Frequency divider from oscillator |
| **Ripple-carry chain** | More bits in one block (alongside existing adder) |

### B1. MUX / DEMUX

**What it does:** **MUX** — N data inputs + selector → one output carries the selected input. **DEMUX** — one data input + selector → data appears on one of N outputs, others are `0`.

**How I see it used:** ALU output select (add vs sub), building buses, routing one RAM output to PC or ACC. In the panel as `.mux_sel:` with pins `d0`, `d1`, `sel`, `y` so beginners see the chip shape, not only `MUX(sel, a, b)` in code.

**Today:** `MUX`, `MUX1`–`MUX3`, `DEMUX`, `DEMUX1`–`DEMUX3` are built-ins; mini-CPU uses `MUX()` inline. As `comp`, same logic, plus `probe(.mux:y)`, property blocks, and consistency with `comp [adder]`.

---

### B2. LUT / lookup table — done

**What it does:** Fixed table: address in (e.g. 4 bits) → value out (e.g. 8 bits) **combinational**, no clocked read cycle. Every address maps to a preloaded word.

**How I see it used:** Opcode → control signals (one LUT replaces many `EQ` lines); hex digit → 7-segment pattern; microcode ROM; small math tables (square, sine quantized). Teaching “FPGA uses LUTs to implement any truth table”.

**Done:** [lut.md](lut.md) — `inline [lut] .name:` with `.name(in = addr)` / `.name(0011)`; `comp [lut]` for pin wiring and `probe`.

---

### B3. Priority encoder

**What it does:** Opposite of decoder in spirit: several input lines (e.g. “request” bits), outputs the **index** of the highest-priority line that is `1`, plus sometimes a `valid` flag if any input is active.

**How I see it used:** Simple interrupt arbitration (which device gets service); keyboard matrix scan (which key pressed); first-one-wins bus grant. Pairs naturally with a future IRQ controller idea (section D).

**Today:** Chain of MUX and priority logic in a `chip`, or manual comparison. No built-in; moderate teaching value for systems topics.

---

### B4. Tristate / bus buffer

**What it does:** Output drivers that can be **high**, **low**, or **high-impedance (off)** when `enable` is false. Lets multiple sources share one bus wire without fighting — only one enabled at a time.

**How I see it used:** Shared data bus between CPU, RAM, and I/O; teaching why you cannot tie two outputs together without control. Multiple `buffer` comps on one bus wire with mutually exclusive `en` signals.

**Today:** LogTScript wires are a single driven value — no real Z state in simulation. A buffer comp would model enable/disable semantics (e.g. only propagate when `en=1`, else bus holds previous or floats as `Z` in display). Some engine/display decisions needed.

---

### B5. Latch / D-FF as comp

**What it does:** **Latch** — transparent while enable is high, holds when low (level-sensitive). **D flip-flop** — captures input on clock edge (edge-sensitive). Distinct from `REG()` falling-edge behaviour and from `comp [reg]` property-block style.

**How I see it used:** Teach difference between latch vs flip-flop vs `REG`; simple state machines; bus hold registers. Side-by-side labs: same `data`/`clk`, compare `LATCH`, `REG`, `comp [reg]`.

**Today:** `LATCH(data, clock)` built-in; `REG(data, clk, clr)`; `comp [reg]` with `set`/`data`. A dedicated `comp [dff]` would be documentation and panel clarity, not new theory.

---

### B6. Clock divider

**What it does:** Takes a clock input and produces an output clock with frequency divided by N (toggle output every N input edges, typically powers of 2).

**How I see it used:** One fast `osc` feeds the system; `÷2` → CPU step, `÷8` → visible 7seg update, `÷64` → LED heartbeat — all derived from the same master clock. UART bit timing (“emit one bit every 16 ticks”). Teaches synchronous design without three separate oscillators.

**Today:** Set different `freq` on multiple `osc` instances, or `counter` + `EQ` to synthesise a slow pulse. A `clkdiv` comp with `ratio: 8` is shorter and matches textbook diagrams.

---

### B7. Ripple-carry chain

**What it does:** A multi-bit adder built as a chain of full adders (carry ripples LSB → MSB), exposed as one wide `comp` — or explicitly as a **teaching** view of ripple delay (optional wave semantics).

**How I see it used:** Contrast with `comp [adder]` (already N-bit); optionally show carry propagation across bits in slow motion for pedagogy. Less about missing width (adder already has `depth`) and more about **named pattern** “this is how hardware adds”.

**Today:** `comp [adder]` with `depth: 8` already adds 8 bits; `ADD()` is instant. Ripple-carry as comp matters only if you want staged/delayed carry for animation or exam-style diagrams.

---

## C. I/O and interactive panel

| Idea | Summary |
|------|---------|
| **Slider** | Adjustable N-bit value without one DIP per bit |
| **Button matrix** | Key grid (e.g. 4×4) |
| **GPIO port** | DIP + LED block (input/output port) |
| **UART / serial** | Teaching serial communication (bit by bit) |
| **Buzzer / tone** | Audio feedback on events |
| **Text terminal** | Text “console” beyond simple LCD |

### C1. Slider

**What it does:** Panel control (drag or buttons) that outputs an N-bit binary value, continuously or in steps — one widget instead of N toggle bits.

**How I see it used:** Set operand A for ALU demos; simulate analog-ish input (volume, threshold); program speed. Friendlier than `comp [dip]` with `length: 8` for quick labs.

**Today:** `comp [dip]` or `comp [rotary]` cover discrete values; slider fills the gap for “many values, one control” UX.

---

### C2. Button matrix

**What it does:** A grid of keys (e.g. 4×4) scanned by row/column logic, outputting key code or row/col wires when a key is pressed.

**How I see it used:** Calculator keyboard; game input; scan demo with `priority encoder` (B3). Shows matrix wiring + debounce + encode in one panel widget.

**Today:** Many separate `comp [key]` instances — works but clutters the panel. Matrix is one component + optional scan logic in board.

---

### C3. GPIO port

**What it does:** A fixed bundle — e.g. 8 input bits (DIP or switches) and 8 output bits (LEDs) — named as one port `P0`, like a microcontroller GPIO register.

**How I see it used:** “Write `0b10101010` to port B, read switches from port A” without eight separate declarations. Microcontroller-style labs on the teaching CPU (OUT / IN instructions).

**Today:** Eight `dip` + eight `led` comps. GPIO is grouping and naming for cleaner scripts and docs.

---

### C4. UART / serial

**What it does:** Asynchronous serial: start bit, data bits, stop bit; `tx` shifts out on clock edges, `rx` samples incoming line. Often 8N1 at a configurable baud derived from a clock divider.

**How I see it used:** Send ACC value to a “serial monitor” in the UI; two boards talk over one wire; link CPU to text terminal (C6). Classic embedded lesson after GPIO.

**Today:** Could hack with `comp [shifter]` + `osc` + property blocks — heavy. UART comp packages the protocol state machine and UI.

---

### C5. Buzzer / tone

**What it does:** Audio output — beep on edge, square wave at frequency, or short tone when a wire goes high.

**How I see it used:** Alarm when ACC overflows; key click feedback; “HALT” beep. Low teaching value for CPU logic, nice for engagement and event-driven demos.

**Today:** No audio output component; browser Web Audio from a comp callback would be new UI/engine work.

---

### C6. Text terminal

**What it does:** Scrollable text area: append characters or lines when written to a port; optional cursor, newline, simple escape codes — richer than fixed `comp [lcd]` rows.

**How I see it used:** `PRINT` instruction on teaching CPU; serial RX shows incoming bytes as ASCII; shell demo. Program output students can read without parsing 7seg hex.

**Today:** `comp [lcd]` for fixed character grids. Terminal is more lines, scrolling, and stream semantics.

---

## D. Advanced (higher effort, more specialized benefit)

| Idea | Summary |
|------|---------|
| **FIFO / queue** | Buffer for serial, pipeline, waiting for data |
| **Timer / watchdog** | Timeout, periodic reset |
| **Interrupt controller** | Event / IRQ model |
| **DMA / bus arbiter** | Master/slave on shared bus |
| **EEPROM / persistence** | State that survives page reload |

### D1. FIFO / queue

**What it does:** First-in-first-out buffer: `push` on one side, `pop` on the other; `full`/`empty` flags; fixed depth (e.g. 8 entries).

**How I see it used:** Decouple UART RX from CPU (bytes queue until CPU pops); pipeline stage between fetch and execute; producer/consumer without losing data when speeds differ.

**Today:** No queue primitive; `mem` + read/write pointers in script approximates it with manual discipline. FIFO comp encodes pointer wrap and flags.

---

### D2. Timer / watchdog

**What it does:** **Timer** — count down or up from load value, pulse or IRQ at zero. **Watchdog** — reset system if not “kicked” within N ms.

**How I see it used:** Blink LED every second without free-running `osc` on every wire; round-robin OS tick; reliability demo (“pet the watchdog”). Links to clock divider and IRQ ideas.

**Today:** `comp [osc]` + `comp [counter]` can approximate; dedicated timer with load/reload is clearer for embedded curricula.

---

### D3. Interrupt controller

**What it does:** Collects interrupt requests from devices, masks, prioritises, and asserts one `irq` line to CPU with vector number or priority encoder output.

**How I see it used:** CPU runs main loop; key press or UART byte sets IRQ; CPU jumps to handler. Requires CPU ISA support (`RETI`, interrupt enable) and engine event model beyond wires.

**Today:** Fully polling only (read key in loop). IRQ is a step toward real embedded behaviour; pairs with B3 priority encoder and D1 FIFO.

---

### D4. DMA / bus arbiter

**What it does:** **DMA** — moves block from RAM to I/O (or reverse) without CPU per-byte loops. **Arbiter** — grants bus to one master when CPU and DMA both want RAM.

**How I see it used:** Advanced lab after von Neumann + `dpram`: “sound blitter” copies table to GPIO while CPU sleeps. Shows bus contention and grant signals.

**Today:** CPU must move every byte in software. High complexity; teaching value mainly for computer architecture courses.

---

### D5. EEPROM / persistence

**What it does:** Non-volatile storage: RAM contents or config survive browser reload (localStorage, IndexedDB, or file export).

**How I see it used:** Save student’s program RAM between sessions; high-score table; “flash” after WRITE command. Distinct from ROM (read-mostly) — rare writes, persistent.

**Today:** All state is in-memory for the session. Persistence is cross-cutting (UI + storage API), not just a comp property block.

---

## E. Not components, but related direction

| Idea | Summary |
|------|---------|
| **Assembler / program loader** | Language feature, not a panel device — **done** |
| **Logic analyzer / timeline** | Wire visualization over time (mostly UI/debug) |

### E1. Assembler / program loader — done

**What it does:** Tool or language syntax that turns mnemonics (`LOAD 0`, `ADDI 3`) into `= ^hex` ROM init or `.mem =` blobs — optionally labels, branches, listing file.

**How I see it used:** Students write assembly in editor tab; Run loads words into `.prog` mem. Avoids hand-encoding `10334221`. Could be preprocessor, separate panel, or `asm { ... }` block.

**Done:** [asm.md](asm.md) — `inline [asm] .myisa:` + `.myisa { … }`; load into `comp [mem]` with `= .myisa { … }` or `.prog = .myisa { … }`. See also [mem.md](mem.md).

---

### E2. Logic analyzer / timeline

**What it does:** UI that plots selected wires (`clk`, `pc`, `acc`) vs time — like `probe` history or a saleae-style trace, not a single snapshot in Output.

**How I see it used:** Debug why CPU missed a latch; compare Wave vs Legacy timing; export trace for assignments. Complements `probe`, `show`, `peek` in [debug.md](debug.md).

**Today:** Output panel shows discrete `#` lines; no built-in waveform viewer for arbitrary wires. Mostly editor/UI work; `osc` already has real-time toggling.

---

## F. What you can already do without a new component

From mini-CPU and existing docs — useful when an idea above seems “already covered”:

- IR, bus, decoder → **chip** + MUX + wires
- Stack → second **counter** + **mem**
- Program in ROM → `= ^hex` init on **mem**, or mnemonics via **asm** ([asm.md](asm.md))
- Opcode / digit lookup → **lut** ([lut.md](lut.md))
- Clock / step → **key**, **osc**, **switch**, **NEXT(~)**

---

## Rough prioritization (not a roadmap)

Subjective **teaching value** vs **estimated complexity** — for comparison only.

| Idea | Teaching value | Complexity |
|------|----------------|------------|
| Opcode ALU | high | medium |
| Comparator / flags | high | low–medium |
| Decoder | high | low |
| Read-only ROM | medium | low |
| Barrel shifter | medium–high | medium |
| Stack | medium | medium |
| Dual-port RAM | high | high |
| MUX as comp | low–medium | low |
| Slider / GPIO | low–medium | low–medium |
| UART serial | medium | high |
| FIFO | medium | high |
| IRQ / DMA | medium (advanced) | very high |

**Natural direction groups** (mix as you like):

1. **Teaching CPU v2** — ALU, flags, decoder, stack, ROM
2. **More combinational `comp`** — MUX, buffer, latch (LUT: done — [lut.md](lut.md))
3. **I/O and interfaces** — UART, slider, GPIO, terminal
4. **Infrastructure** — dual-port mem, FIFO, timer

---

## Related docs

- [Component index](components.md)
- [asm](asm.md) · [lut](lut.md)
- [Mini CPU demo](mini-cpu.md)
- [Mini CPU feasibility plan](mini-cpu-plan.md)
