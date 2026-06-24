# Component index

LogTscript includes built-in **components** (`comp`), **inline** declarations (`inline [asm]`, `inline [lut]`), reusable **board** blocks (`board`), lightweight **chip** blocks (`chip`), and legacy **PCB** (`pcb`). Use `doc(comp)`, `doc(inline)`, `doc(board)`, `doc(chip)`, or `doc(pcb)` in the editor for live signatures.

**Global refs in composite bodies:** inside `board` / `chip` / `pcb`, prefix a top-level inline or component name with `^` to skip instance renaming — e.g. `^.myisa { … }`, `^.ctl:LOAD`, `doc(^.ctl)`. Details: [lut.md](lut.md#global-reference-name).

---

## Composite blocks

| Topic | Page |
|-------|------|
| **Board** — interactive circuits, wave propagation (recommended) | [board.md](board.md) |
| Chip — reusable logic without UI | [chip.md](chip.md) |
| PCB — deprecated, legacy propagation | [pcb.md](pcb.md) |
| **Mini CPU demo** — Harvard step CPU (chip ALU + board) | [mini-cpu.md](mini-cpu.md) |
| **Mini CPU v2** — ASM, BEQ, LUT decode, terminal | [mini-cpu-v2.md](mini-cpu-v2.md) |
| **Pocket calculator** — keyboard + keys + terminal | [pocket-calc.md](pocket-calc.md) |
| **Future component ideas** — brainstorming backlog (no roadmap) | [future-component-ideas.md](future-component-ideas.md) |

---

## Interactive inputs (panel)

| Component | Shortname | Page |
|-----------|-----------|------|
| `switch` | — | [switch.md](switch.md) |
| `key` | — | [key.md](key.md) |
| `keyboard` | — | [keyboard.md](keyboard.md) |
| `dip` | — | [dip.md](dip.md) |
| `ioport` | — | [ioport.md](ioport.md) |
| `rotary` | — | [rotary.md](rotary.md) |
| `slider` | — | [slider.md](slider.md) |

Overview (panel callbacks, common patterns): [interactive-components.md](interactive-components.md).

---

## Displays

| Component | Shortname | Page |
|-----------|-----------|------|
| `led` | — | [led.md](led.md) |
| `bar` (LED bar) | — | [led-bar.md](led-bar.md) |
| `7seg` | `7` | [seven-seg.md](seven-seg.md) |
| `14seg` | `14` | [14seg.md](14seg.md) |
| `lcd` | — | [lcd.md](lcd.md) |
| `clcd` | — | [clcd.md](clcd.md) |
| `alu` | — | [alu.md](alu.md) |
| `terminal` | — | [terminal.md](terminal.md) |
| `dots` (clock colon) | `:` | [dots.md](dots.md) |

---

## Arithmetic & logic devices

| Component | Shortname | Page |
|-----------|-----------|------|
| `adder` | `+` | [adder.md](adder.md) |
| `subtract` | `-` | [subtract.md](subtract.md) |
| `multiplier` | `*` | [multiplier.md](multiplier.md) |
| `divider` | `/` | [divider.md](divider.md) |
| `shifter` | `>` | [shifter.md](shifter.md) |
| `counter` | `=` | [counter.md](counter.md) |

Instant built-in functions (`ADD`, `SUBTRACT`, …) without `comp`: [arithmetic.md](arithmetic.md).

---

## Storage & timing

| Name | Shortname | Page |
|------|-----------|------|
| `mem` | — | [mem.md](mem.md) |
| `asm` | — | [asm.md](asm.md) — declare `inline [asm]`; assemble with `.name { … }` |
| `lut` | — | [lut.md](lut.md) — `inline [lut]` or `comp [lut]` |
| `protocol` | — | [protocol.md](protocol.md) — declare `inline [protocol]`; generate with `.name { params }` |
| `reg` | — | [reg.md](reg.md) |
| `queue` | `fifo` | [queue.md](queue.md) |
| `network` | — | [network.md](network.md) |
| `stack` | `lifo` | [stack.md](stack.md) |
| `counter` | `=` | [counter.md](counter.md) |
| `osc` | `~` | [oscillator.md](oscillator.md) |

`doc(inline.asm)` / `doc(inline.lut)` / `doc(inline.protocol)` — declaration templates; `doc(.name)` — specific instance.

---

## Reference

| Topic | Page |
|-------|------|
| Built-in functions (`MUX`, `REG`, gates, …) | [builtin-functions.md](builtin-functions.md) |
| `doc()` signatures | [doc-function.md](doc-function.md) |
| `show` / `peek` / `probe` / `watch` | [debug.md](debug.md) |
| Signal propagation (Wave / Legacy) | [signal-propagation.md](signal-propagation.md) |
