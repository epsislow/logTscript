# Component index

LogTscript includes built-in **components** (`comp`), **inline** declarations (`inline [asm]`, `inline [lut]`), reusable **board** blocks (`board`), lightweight **chip** blocks (`chip`), and legacy **PCB** (`pcb`). Use `doc(comp)`, `doc(inline)`, `doc(board)`, `doc(chip)`, or `doc(pcb)` in the editor for live signatures.

---

## Composite blocks

| Topic | Page |
|-------|------|
| **Board** — interactive circuits, wave propagation (recommended) | [board.md](board.md) |
| Chip — reusable logic without UI | [chip.md](chip.md) |
| PCB — deprecated, legacy propagation | [pcb.md](pcb.md) |
| **Mini CPU demo** — Harvard step CPU (chip ALU + board) | [mini-cpu.md](mini-cpu.md) |
| **Future component ideas** — brainstorming backlog (no roadmap) | [future-component-ideas.md](future-component-ideas.md) |

---

## Interactive inputs (panel)

| Component | Shortname | Page |
|-----------|-----------|------|
| `switch` | — | [switch.md](switch.md) |
| `key` | — | [key.md](key.md) |
| `dip` | — | [dip.md](dip.md) |
| `rotary` | — | [rotary.md](rotary.md) |

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
| `reg` | — | [reg.md](reg.md) |
| `osc` | `~` | [oscillator.md](oscillator.md) |

`doc(inline.asm)` / `doc(inline.lut)` — declaration templates; `doc(.name)` — specific instance.

---

## Reference

| Topic | Page |
|-------|------|
| `doc()` signatures | [doc-function.md](doc-function.md) |
| `show` / `peek` / `probe` | [debug.md](debug.md) |
| Signal propagation (Wave / Legacy) | [signal-propagation.md](signal-propagation.md) |
