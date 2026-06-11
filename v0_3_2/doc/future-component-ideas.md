# Future component ideas — LogTScript

Brainstorming catalog for possible components or extensions, based on what the simulator already supports and lessons from the mini-CPU demo. **No** implementation order, estimates, or technical design — pick ideas one at a time when you decide.

---

## Short context (what exists today)

**`comp` components:** switch, key, dip, rotary, led, bar, 7seg, 14seg, lcd, dots, adder, subtract, multiplier, divider, shifter, counter, mem, reg, osc.

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

---

## B. Combinational devices as `comp` (pedagogy)

Already exist as built-in functions; as **components** they would show up uniformly in docs, panel, and probe.

| Idea | Summary |
|------|---------|
| **MUX / DEMUX** | Multiplexer/demultiplexer as a visual device |
| **LUT / lookup table** | Small address → value table without explicit logic |
| **Priority encoder** | For IRQ, keyboard scan, simple arbiter |
| **Tristate / bus buffer** | Shared bus, enable/disable output |
| **Latch / D-FF as comp** | Clear level-trigger vs edge (alongside REG and reg) |
| **Clock divider** | Frequency divider from oscillator |
| **Ripple-carry chain** | More bits in one block (alongside existing adder) |

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

---

## D. Advanced (higher effort, more specialized benefit)

| Idea | Summary |
|------|---------|
| **FIFO / queue** | Buffer for serial, pipeline, waiting for data |
| **Timer / watchdog** | Timeout, periodic reset |
| **Interrupt controller** | Event / IRQ model |
| **DMA / bus arbiter** | Master/slave on shared bus |
| **EEPROM / persistence** | State that survives page reload |

---

## E. Not components, but related direction

| Idea | Summary |
|------|---------|
| **Assembler / program loader** | Language feature, not a panel device |
| **Logic analyzer / timeline** | Wire visualization over time (mostly UI/debug) |

---

## F. What you can already do without a new component

From mini-CPU and existing docs — useful when an idea above seems “already covered”:

- IR, bus, decoder → **chip** + MUX + wires
- Stack → second **counter** + **mem**
- Program in ROM → `= ^hex` init on **mem**
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
2. **More combinational `comp`** — MUX, LUT, buffer, latch
3. **I/O and interfaces** — UART, slider, GPIO, terminal
4. **Infrastructure** — dual-port mem, FIFO, timer

---

## Related docs

- [Component index](components.md)
- [Mini CPU demo](mini-cpu.md)
- [Mini CPU feasibility plan](mini-cpu-plan.md)
