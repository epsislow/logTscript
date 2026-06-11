# Mini CPU 4-bit (Harvard, step-by-step)

Teaching demo: a CPU with **program ROM**, **data RAM**, **PC**, **accumulator**, and **ALU** — no new engine component types. Implementation uses `chip +[alu4]` and `board +[cpu4]`.

Feasibility plan: [mini-cpu-plan.md](mini-cpu-plan.md).

---

## Architecture

| Block | Role |
|-------|------|
| `chip +[alu4]` | 4-bit ADD/SUB, selected with `op.1` |
| `board +[cpu4]` | Fetch-decode-execute on each `set` pulse |
| `comp [mem] .prog` | ROM 8×4 (8-bit instructions) |
| `comp [mem] .data` | RAM 4×16 |
| `comp [counter] .pcnt` | Program counter |
| `comp [reg] .accum` | Accumulator |
| `comp [7seg] .disp` | Hex ACC display (in the UI panel) |

---

## ISA (8 bits per instruction)

Format: `[opcode:4][operand:4]` — in memory as 8 bits, **bits 0–3 (MSB)** = opcode, **bits 4–7** = operand (`instr.0/4` / `instr.4/4` in LogTScript).

| Opcode | Mnemonic | Effect |
|--------|----------|--------|
| `0000` | NOP | No effect |
| `0001` | LOAD | `ACC ← RAM[operand]` |
| `0010` | STORE | `RAM[operand] ← ACC` |
| `0011` | ADDI | `ACC ← ACC + operand` |
| `0100` | SUBI | `ACC ← ACC - operand` |
| `0101` | JMP | `PC ← operand` |
| `0111` | HALT | Stop PC increment |

---

## Demo program (preloaded in ROM)

ROM: `= ^10334221` (4 words × 8 bits).

| PC | Instr | Effect |
|----|-------|--------|
| 0 | `LOAD 0` | ACC = RAM[0] (= 7) |
| 1 | `ADDI 3` | ACC = 10 |
| 2 | `SUBI 2` | ACC = 8 |
| 3 | `STORE 1` | RAM[1] = 8 |

RAM init: `= ^7` → address 0 holds `0111` (7).

After **4 steps** (`set = 1` four times): **ACC = 8**, **PC = 4**.

---

## Quick example (all steps instant)

Press **Load & Run** — the program runs **4 cycles immediately** (useful for tests). To **watch 7seg change slowly**, use the oscillator example below.

In the right panel: **7seg** (ACC) + mem/counter/reg. In the console: `probe` + `show`.

```logts-play
chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y

board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:at = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc

board [cpu4] .cpu::

probe(.cpu:acc)
probe(.cpu:pc)
probe(.cpu:ir)

.cpu:{ set = 1 }
.cpu:{ set = 1 }
.cpu:{ set = 1 }
.cpu:{ set = 1 }

show(.cpu:acc)
show(.cpu:pc)
```

**Expected result** after RUN: ACC = `1000` (8), PC = `0100` (4). After the first step: ACC = `0111` (7), PC = `0001`.

---

## Visual example — oscillator (~4 s / step)

**Load & Run** once, then:

1. Turn on the `.run` **switch** in the panel (enable).
2. Watch **7seg** `.disp` — every **~4 seconds** the CPU runs **one** cycle (oscillator rising edge).
3. LED `.beat` is on when `tick = 1` (visual clock feedback).

| Step | ACC (7seg) | PC |
|------|------------|-----|
| start | 0 | 0 |
| 1 | 7 | 1 |
| 2 | 10 | 2 |
| 3 | 8 | 3 |
| 4 | 8 | 4 |

Oscillator: `freq: 4`, `freqIsSec: 1` → **4 second** period per full cycle. The CPU advances on the **rising edge** (`on: 1` + `.cpu:{ set = step }`).

```logts-play
chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y

board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:at = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc

board [cpu4] .cpu::

comp [switch] .run::
comp [~] .tick:
  freq: 4
  freqIsSec: 1
  duration1: 1
  duration0: 3
  :
comp [led] .beat::

1wire enabled = .run:get
1wire tick = .tick:get
1wire step = AND(tick, enabled)

.cpu:{ set = step }

.beat = tick
```

---

## Visual example — key (one step per click)

Copy the `chip +[alu4]` and `board +[cpu4]` definitions from the oscillator example, then use the tail below (or replace the oscillator/switch/led block):

```logts-play
board [cpu4] .cpu::

comp [key] .step::

.cpu:{ set = .step:get }
```

**Load & Run**, then press the **`.step`** key in the panel — each press = one CPU cycle; **7seg** updates immediately.

---

## NEXT(~) example — step from toolbar

Same setup, after definitions + `board [cpu4] .cpu::`:

```logts-play
board [cpu4] .cpu::

.cpu:{ set = ~ }
```

**Load & Run** (no `NEXT` in the script), then press the **NEXT** toolbar button **4 times** — each NEXT = one cycle. Watch **7seg** and the variables panel.

---

## Manual usage

| Action | Script |
|--------|--------|
| Instantiate | `board [cpu4] .cpu::` |
| One CPU cycle | `.cpu:{ set = 1 }` |
| Read ACC / PC / IR | `4wire a = .cpu:acc` etc. or `probe(.cpu:acc)` |
| Reset | `.cpu:{ rst = 1 }` |

With an interactive panel: `comp [key]` on the instance `.cpu` `set` pin (see [key.md](key.md)).

---

## Related files

- Automated tests: `test_suite_ported.js` (859–866)
- Test constants: `CHIP_ALU4`, `BOARD_CPU4`
