# PLC — `inline [plc]` + `comp [plc]`

LogTScript PLC support follows the same two-layer model as **`inline [asm]`** + **`comp [cpu]`**:

1. **`inline [plc]`** — hardware-independent program: symbolic inputs/outputs + boolean logic (IEC 61131-3 ST-inspired). **Language reference:** [plc-language.md](plc-language.md).
2. **`comp [plc]`** — runtime: maps symbols to wires or panel components, runs one **scan** per triggered `set`.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [cpu.md](cpu.md) and [cache.md](cache.md)).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Language** | Full keyword/syntax reference → [plc-language.md](plc-language.md) |
| **Program** | `inline [plc] .machine:` with `inputs:{ }`, `outputs:{ }`, logic body |
| **Logic (v1)** | `IF/THEN/ELSE/ELSIF/END_IF`, `AND/OR/NOT/XOR`, `TRUE`/`FALSE`, `0`/`1` |
| **Timers (P5)** | `TON` / `TOF` blocks; `PT` in scan cycles; read `name.Q` |
| **Widths** | `START` alone = 1 bit; `TEMP: 8` declarable (logic on multi-bit → future P+b) |
| **Scan** | `.plc:{ set = 1 }` or **`scanTime > 0`** auto-scan; see [Scan timing (P4)](#scan-timing-p4) |
| **`busy`** | `0` when `scanTime: 0`; pulses during simulated scan when `scanTime > 0` |
| **Outputs** | Retain last value if not assigned this scan (PLC semantics) |
| **Inputs** | Read-only in program; mapped at `comp [plc]` elaboration |
| **Errors** | Strict mapping at elaboration — no silent fallback to `0` |
| **Doc** | `doc(inline.plc)`, `doc(.machine)`, `doc(comp.plc)`, `doc(.ctrl)` |

---

## Architecture

```text
inline [plc] .machine     comp [plc] .ctrl
  inputs: { START }  -->    inputs: { START = .start }
  outputs: { MOTOR } -->    outputs: { MOTOR = motorWire }
  IF ... END_IF             .ctrl:{ set = 1 }  --> one scan
```

The PLC program never names `.start` or `motorWire` — only `START` and `MOTOR`.

---

## `inline [plc]` — language

**Full reference:** [plc-language.md](plc-language.md) — every keyword, timer/counter syntax, execution model, errors, and placement rules.

Summary:

```logts
inline [plc] .machine:
  inputs: { START, STOP: 1 }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN
    MOTOR = TRUE
  ELSIF STOP THEN
    MOTOR = FALSE
  ELSE
    MOTOR = FALSE
  END_IF
  :
```

| Topic | Where |
|-------|-------|
| Declarations, `IF`, booleans, precedence | [plc-language.md](plc-language.md) |
| `TON` / `TOF` | [plc-language.md — Timers](plc-language.md#timers--ton--tof-p51) |
| `CTU` / `CTD` (planned) | [plc-language.md — Counters](plc-language.md#counters--ctu--ctd-p52--planned) |
| `doc(inline.plc)`, `doc(.machine)` | [plc-language.md — doc()](plc-language.md#doc-helpers) |

---

## `comp [plc]` — runtime

### Declaration

```logts
comp [plc] .ctrl:
  program: .machine
  inputs: {
    START = startIn
    STOP = .stop
  }
  outputs: {
    MOTOR = motorOut
  }
  on: 1
  :
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| **`program:`** | yes | One `inline [plc]` reference (e.g. `program: .machine` or `program = .machine`) |
| **`inputs:`** | yes* | `SYM = wire` or `SYM = .component` for every program input |
| **`outputs:`** | yes* | `SYM = wire` or `SYM = .component` for every program output |
| **`on:`** | optional | How **property blocks** on this component are triggered (see below) |
| **`scanTime:`** | optional | **ms** — `0`/omitted = event-driven; **`N > 0`** = internal auto-scan every ~N ms |
| **`scanDuration:`** | optional | **ms** simulated execution time per scan (`busy = 1`); default **`1`** when `scanTime > 0` |
| **`strict:`** | optional | **`0`** (default) stretch missed ticks; **`1`** = overrun/miss (`overrunCount++`) |

\*Every program symbol must appear **exactly once** in the matching map. Missing or extra keys → **elaboration error**.

`doc(comp.plc)` shows the component type; `doc(.ctrl)` shows program ref, maps, `scanCount`, and last `outputState`.

### Scan cycle (one pass)

When a property block runs on `.ctrl` and `set` is active (per `on:`):

1. **Read** each mapped input (wire or component `:get`).
2. **Execute** the `inline [plc]` program once (`executePlcScan`).
3. **Write** each mapped output (wire or component storage + display).
4. Increment **`scanCount`**.

Internal output state (`outputState`) persists between scans for latch semantics inside the program.

### Pins and pouts

| Pin / pout | Bits | Description |
|------------|------|-------------|
| **`set`** | 1 | In `.ctrl:{ set = 1 }` — triggers one scan when active (ignored while **`busy`**) |
| **`scanCount`** | 16 | Scans completed; `.ctrl:scanCount` |
| **`busy`** | 1 | **`0`** when `scanTime: 0`; **`1`** during simulated scan when `scanTime > 0` |
| **`skipped`** | 1 | **`1`** if a manual `set` arrived while **`busy`** (no queue) |
| **`missed`** | 1 | **`1`** after a timer tick was lost (`strict: 1`) |
| **`overrunCount`** | 16 | Missed auto-scan ticks since RUN (`strict: 1`) |

### `on:` modes (property blocks)

| `on:` | First Load & Run with `.ctrl:{ set = 1 }` | Typical use |
|-------|-------------------------------------------|-------------|
| **`1`** / **`level`** | **Runs scan** if `set = 1` | Pedagogic default — one scan per Run |
| **`raise`** (default if omitted) | **Does not** run on first RUN; waits for `set` **0→1** edge | Pulse-triggered scan in wave / interactive setups |

`on:` on `comp [plc]` controls **when the property block runs**, not the motor command. Use **`on: 1`** in documentation examples so Load & Run performs a scan immediately.

### Mapping targets

| Target | Input read | Output write |
|--------|------------|--------------|
| **Wire** | Effective wire value | `writeWireStable` + propagation |
| **Component** | `:get` (implicit) | Storage ref + `updateDisplayValue` (`led`, `bar`); `setReg` (`reg`) |

**Width must match** exactly (`1wire` ↔ 1-bit symbol).

### Patterns

**Wire command + LED outside PLC** (recommended for indicators):

```logts
comp [plc] .ctrl:
  outputs: { MOTOR = motorCmd }
  ...

.motorLed = motorCmd    ; LogTscript wiring after scan
```

**Direct LED map** (PLC writes `comp [led]`):

```logts
outputs: { MOTOR = .motorLed }
```

### Hardware independence

The same `inline [plc] .machine` can drive two lines:

```logts
comp [plc] .lineA:
  program: .machine
  inputs: { START = startA, STOP = stopA }
  outputs: { MOTOR = motorA }
  ...

comp [plc] .lineB:
  program: .machine
  inputs: { START = startB, STOP = stopB }
  outputs: { MOTOR = motorB }
  ...
```

Only the **maps** change — not the program.

---

## Scan timing (P4)

### What `scanTime` means

**`scanTime`** is the target interval (**milliseconds**) between complete scan cycles:

```text
read inputs → executePlcScan → write outputs → scanCount++
```

| `scanTime` | Mode | Behaviour |
|------------|------|-----------|
| **omitted** or **`0`** | **Event-driven** | No internal timer. Scan on each active **`set`** (manual, wire, or `osc`). Execution is **instant** — **`busy` stays `0`**. Not “run once”; scan as often as you trigger `set`. |
| **`N > 0`** | **Auto-scan** | Internal timer fires every ~**N ms**. **`busy`** pulses for **`scanDuration`** ms per scan. |

### Master clock

| Setup | Who drives scans |
|-------|------------------|
| **`scanTime: 0`** | **You** — `.ctrl:{ set = 1 }`, wire, or **`comp [osc]`** (P4.0 / P4.2) |
| **`scanTime: N`** | **PLC timer** — periodic auto-scan; optional extra manual `set` if not `busy` |

### `busy`, `skipped`, overrun

| Case | Behaviour |
|------|-----------|
| **`scanTime: 0`** | `busy` always **`0`** |
| **`scanTime > 0`** | `busy = 1` for **`scanDuration`** ms after each scan starts |
| **`set` while `busy`** | Scan **ignored**; **`skipped = 1`** (no FIFO queue) |
| **`strict: 0`** (default) | Timer tick during `busy` → scan **deferred** (stretch) |
| **`strict: 1`** | Timer tick during `busy` → cycle **missed**; **`overrunCount++`**, **`missed = 1`** |

Outputs keep their last written value while `busy` (P-D7).

### P4.0 — External clock (`scanTime: 0`)

Pattern (same as [DMA paced + osc](dma.md)):

```logts
comp [plc] .ctrl:
  scanTime: 0
  on: raise
  :

comp [osc] .clk:
  freq: 10
  :

.ctrl:{ set = .clk:get }
```

One rising edge → one scan. In the browser, `osc` runs in real time; use **`probe(.ctrl:scanCount)`** to watch live counts.

### P4.1 — Auto-scan

```logts
comp [plc] .ctrl:
  program: .machine
  scanTime: 200
  scanDuration: 2
  ...
```

Load & Run starts the timer; **`scanCount`** increases ~5 times per second. Use **`probe(.ctrl:scanCount)`** or **`probe(.ctrl:busy)`** for live timing.

### P4.2 — Mixing manual `set` with auto-scan

With **`scanTime > 0`**, `.ctrl:{ set = 1 }` still works when **`busy = 0`**. If `busy = 1`, the request is skipped (`skipped = 1`).

### P4.3 — Strict overrun

When **`scanDuration`** (simulated work) is longer than **`scanTime`** (period), use **`strict: 1`** to count missed cycles:

```logts
comp [plc] .ctrl:
  scanTime: 10
  scanDuration: 50
  strict: 1
  ...
```

Watch **`overrunCount`** with **`probe`** — pedagogic “PLC too slow for its clock”.

---

## Runnable examples

### Example 1 — START / STOP / MOTOR (wires)

Load & Run: `motorOut` is `1` when `startIn = 1` and `stopIn = 0`. `scanCount` is `1`.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN
    MOTOR = 1
  ELSE
    MOTOR = 0
  END_IF
  :

1wire startIn
1wire stopIn
1wire motorOut

startIn = 1
stopIn = 0

comp [plc] .ctrl:
  program: .machine
  inputs: {
    START = startIn
    STOP = stopIn
  }
  outputs: {
    MOTOR = motorOut
  }
  on: 1
  :

.ctrl:{ set = 1 }

show(motorOut)
show(.ctrl:scanCount)
```

### Example 2 — Panel: switch + LED

`comp [switch]` with `= 1` preset; PLC maps to switches and LED. Load & Run: LED on.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN
    MOTOR = 1
  ELSE
    MOTOR = 0
  END_IF
  :

comp [switch] .start:
  = 1
  :

comp [switch] .stop:
  = 0
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: {
    START = .start
    STOP = .stop
  }
  outputs: {
    MOTOR = .motorLed
  }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
show(.ctrl:scanCount)
```

### Example 3 — Wire output + external LED

PLC drives `motorCmd`; LED follows via LogTscript assignment (separate `on:` on LED).

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

1wire startIn
1wire stopIn
1wire motorCmd

comp [led] .motorLed:
  on: 1
  :

startIn = 1
stopIn = 0

comp [plc] .ctrl:
  program: .machine
  inputs: { START = startIn, STOP = stopIn }
  outputs: { MOTOR = motorCmd }
  on: 1
  :

.ctrl:{ set = 1 }
.motorLed = motorCmd

show(motorCmd)
show(.motorLed:get)
```

### Example 4 — Two machines, one program

`motorA = 1`, `motorB = 0` on Load & Run.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

1wire startA
1wire stopA
1wire motorA
1wire startB
1wire stopB
1wire motorB

startA = 1
stopA = 0
startB = 0
stopB = 0

comp [plc] .lineA:
  program: .machine
  inputs: { START = startA, STOP = stopA }
  outputs: { MOTOR = motorA }
  on: 1
  :

comp [plc] .lineB:
  program: .machine
  inputs: { START = startB, STOP = stopB }
  outputs: { MOTOR = motorB }
  on: 1
  :

.lineA:{ set = 1 }
.lineB:{ set = 1 }

show(motorA)
show(motorB)
```

### Example 5 — Output retain (latch without VAR)

After second scan with `startIn = 0`, `motorOut` stays `1`.

```logts-play
inline [plc] .latch:
  inputs: { START }
  outputs: { MOTOR }
  IF START THEN
    MOTOR = 1
  END_IF
  :

1wire startIn
1wire motorOut

startIn = 1

comp [plc] .ctrl:
  program: .latch
  inputs: { START = startIn }
  outputs: { MOTOR = motorOut }
  on: 1
  :

.ctrl:{ set = 1 }
startIn = 0
.ctrl:{ set = 1 }

show(motorOut)
```

### Example 6 — `doc(.machine)` and `doc(.ctrl)`

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { START = startIn, STOP = stopIn }
  outputs: { MOTOR = motorOut }
  on: 1
  :

1wire startIn
1wire stopIn
1wire motorOut

doc(.machine)
doc(.ctrl)
```

### Example 7 — `comp [dip]` as 1-bit input (test 2769)

`length: 1` DIP preset `= 1`; motor LED on after scan.

```logts-play
inline [plc] .machine:
  inputs: { SEL }
  outputs: { MOTOR }
  IF SEL THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

comp [dip] .mode:
  length: 1
  = 1
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { SEL = .mode }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
show(.ctrl:scanCount)
```

### Example 8 — `comp [reg]` as 1-bit output (test 2770)

PLC writes register via scan (`setReg`); read with `:get`.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { CMD }
  IF START AND NOT STOP THEN CMD = 1 ELSE CMD = 0 END_IF
  :

comp [switch] .start:
  = 1
  :

comp [switch] .stop:
  = 0
  :

comp [reg] .cmd:
  depth: 1
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { START = .start, STOP = .stop }
  outputs: { CMD = .cmd }
  on: 1
  :

.ctrl:{ set = 1 }

show(.cmd:get)
```

### Example 9 — `comp [bar]` length 1 as output (test 2771)

Single-segment bar driven directly by PLC output map.

```logts-play
inline [plc] .machine:
  inputs: { START }
  outputs: { STATUS }
  STATUS = START
  :

comp [switch] .start:
  = 1
  :

comp [bar] .status:
  length: 1
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { START = .start }
  outputs: { STATUS = .status }
  on: 1
  :

.ctrl:{ set = 1 }

show(.start:get)
```

### Example 10 — `comp [key]` mapping (test 2772)

Map syntax is identical to switch: `START = .start`. For **Load & Run**, this example uses a **switch** preset (deterministic). With `comp [key]`, load the script, **press the key** in the panel, then run `.ctrl:{ set = 1 }`.

```logts-play
inline [plc] .machine:
  inputs: { START }
  outputs: { MOTOR }
  IF START THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

comp [switch] .start:
  = 1
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { START = .start }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

### Example 11 — CLCD alarm via wire (test 2773)

PLC sets `alarmCmd`; CLCD panel updates outside PLC. **`on: 1`** on both PLC and CLCD for deterministic Load & Run.

```logts-play
inline [plc] .alarm:
  inputs: { FAULT }
  outputs: { ALARM }
  IF FAULT THEN ALARM = 1 ELSE ALARM = 0 END_IF
  :

comp [switch] .faultSw:
  = 1
  :

comp [clcd] .panel:
  = { warning: x:10 y:10 bit:0 : }
  on: 1
  :

1wire alarmCmd

comp [plc] .ctrl:
  program: .alarm
  inputs: { FAULT = .faultSw }
  outputs: { ALARM = alarmCmd }
  on: 1
  :

.ctrl:{ set = 1 }

.panel:{
  value = alarmCmd
  set = 1
}

show(alarmCmd)
show(.panel:get)
```

### Example 12 — DIP off → motor off (test 2774)

Same as example 7 with `= 0` on DIP; LED stays off.

```logts-play
inline [plc] .machine:
  inputs: { SEL }
  outputs: { MOTOR }
  IF SEL THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

comp [dip] .mode:
  length: 1
  = 0
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { SEL = .mode }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

### Example 13 — P4.0 external clock wire pulse (test 2775)

`scanTime: 0` — scan when external wire drives `set`. Load & Run: one scan; second `set` via script step adds another (here shown as two triggers in one Run).

```logts-play
inline [plc] .machine:
  inputs: { CLK }
  outputs: { CNT }
  IF CLK THEN CNT = 1 ELSE CNT = 0 END_IF
  :

1wire clkIn
1wire cntOut

clkIn = 1

comp [plc] .ctrl:
  program: .machine
  scanTime: 0
  inputs: { CLK = clkIn }
  outputs: { CNT = cntOut }
  on: 1
  :

.ctrl:{ set = clkIn }
.ctrl:{ set = 1 }

show(cntOut)
show(.ctrl:scanCount)
show(.ctrl:busy)
```

Load & Run: `scanCount` is **`2`**, `busy` is **`0`**, `cntOut` is **`1`**.

### Example 14 — P4.1 manual scan with `scanTime > 0` (test 2780)

Auto timer is armed but first scan is manual; `busy` clears before `show`.

```logts-play
inline [plc] .machine:
  inputs: { CLK }
  outputs: { CNT }
  CNT = CLK
  :

comp [switch] .clk:
  = 1
  :

1wire cntOut

comp [plc] .ctrl:
  program: .machine
  scanTime: 500
  scanDuration: 1
  inputs: { CLK = .clk }
  outputs: { CNT = cntOut }
  on: 1
  :

.ctrl:{ set = 1 }

show(cntOut)
show(.ctrl:scanCount)
show(.ctrl:busy)
```

### Example 15 — P4.2 `on: raise` + oscillator (browser)

Use **`on: raise`** so each **rising** edge of the oscillator runs one scan. **Load & Run** in the browser — watch **`scanCount`** with **`probe(.ctrl:scanCount)`** (osc runs in real time).

```logts-play
inline [plc] .machine:
  inputs: { CLK }
  outputs: { CNT }
  CNT = CLK
  :

comp [osc] .tick:
  freq: 2
  freqIsSec: 1
  :

1wire cntOut

comp [plc] .ctrl:
  program: .machine
  scanTime: 0
  inputs: { CLK = .tick }
  outputs: { CNT = cntOut }
  on: raise
  :

.ctrl:{ set = .tick:get }

show(.ctrl:scanCount)
```

After Load & Run, wait ~2 s per osc cycle; `scanCount` increases on each rising edge.

### Example 16 — P4.1 event-driven `busy` stays 0 (test 2779)

```logts-play
inline [plc] .machine:
  inputs: { CLK }
  outputs: { CNT }
  CNT = CLK
  :

comp [switch] .clk:
  = 1
  :

1wire cntOut

comp [plc] .ctrl:
  program: .machine
  scanTime: 0
  inputs: { CLK = .clk }
  outputs: { CNT = cntOut }
  on: 1
  :

.ctrl:{ set = 1 }

show(.ctrl:scanCount)
show(.ctrl:busy)
```

`busy` is **`0`** — instant scan with no `scanTime` timer.

---

## Timers TON / TOF (P5)

Language specification: [plc-language.md — TON / TOF](plc-language.md#timers--ton--tof-p51). Below: **integration examples** with `comp [plc]` and `logts-play`. — TON on-delay (test 2794 / 2796)

**START** held on (`comp [switch] = 1`). Three scans (`PT := 3`) before **MOTOR** and **READY** turn on. Load & Run runs three `.ctrl:{ set = 1 }` in one script.

```logts-play
inline [plc] .machine:
  inputs: { START }
  outputs: { MOTOR, READY }
  TON startDelay(IN := START, PT := 3)
  READY = startDelay.Q
  IF startDelay.Q THEN
    MOTOR = 1
  ELSE
    MOTOR = 0
  END_IF
  :

comp [switch] .start:
  = 1
  :

comp [led] .motorLed:
  :

comp [led] .readyLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { START = .start }
  outputs: { MOTOR = .motorLed, READY = .readyLed }
  on: 1
  :

.ctrl:{ set = 1 }
.ctrl:{ set = 1 }
.ctrl:{ set = 1 }

show(.motorLed:get)
show(.readyLed:get)
show(.ctrl:scanCount)
```

After Load & Run: **`scanCount` = 3**, both LEDs **`1`**.

### Example 18 — TOF off-delay (test 2795 / 2797)

**RUN** starts on; first scan latches motor on. Script turns **RUN** off, then two more scans (`PT := 2`) before motor releases.

```logts-play
inline [plc] .hold:
  inputs: { RUN }
  outputs: { MOTOR }
  TOF runOff(IN := RUN, PT := 2)
  MOTOR = runOff.Q
  :

comp [switch] .run:
  = 1
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .hold
  inputs: { RUN = .run }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

.run = 0

.ctrl:{ set = 1 }
.ctrl:{ set = 1 }

show(.motorLed:get)
show(.ctrl:scanCount)
```

After Load & Run: **`scanCount` = 3**, **motor LED `0`** (held one scan after RUN off, then off).

### Example 19 — TON with auto-scan (`scanTime`)

Same TON logic; internal PLC timer fires scans every **100 ms**. Load & Run in browser — wait ~300 ms for `PT := 3`.

```logts-play
inline [plc] .machine:
  inputs: { START }
  outputs: { MOTOR }
  TON startDelay(IN := START, PT := 3)
  MOTOR = startDelay.Q
  :

comp [switch] .start:
  = 1
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  scanTime: 100
  inputs: { START = .start }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

probe(.motorLed:get)
probe(.ctrl:scanCount)
```

Use **probe** and wait in the browser; motor turns on after ~3 auto-scans.

---

## I/O mapping matrix (v1)

LogTScript PLC maps **program symbols** to **wires** or **existing panel components**. Width must match exactly. Logic in the program body is **1-bit only** in v1 (`IF`, `AND`, …); multi-bit symbols may be **declared** and **mapped**, but not used in boolean expressions until **P+b**.

| Role | PLC symbol (example) | Width | LogTScript target | Read / write | v1 logic in program |
|------|----------------------|-------|-------------------|--------------|---------------------|
| Momentary input | `START` | 1 | `comp [key]` | `:get` | yes |
| Toggle input | `STOP`, `ENABLE` | 1 | `comp [switch]` | `:get` | yes |
| Parallel switches | `SEL` | N | `comp [dip]` | `:get` (width = `length`) | only if N=1 in v1 |
| Analog input (UI) | `LEVEL` | N | `comp [slider]` | `:get` | **P+b** (doc only) |
| Port I/O | — | N | `comp [ioport]` | pins/pouts | **P+b** |
| On/off indicator | `MOTOR`, `ALARM` | 1 | `comp [led]` | write storage + display | yes |
| Bit storage / command | `CMD` | N | `comp [reg]` | `setReg` on scan | only if N=1 in v1 |
| LED bar | `STATUS` | N | `comp [bar]` | `setBarState` on scan | only if N=1 in v1 |
| Bus | `motorCmd` | N | `Nwire` name | wire read/write | yes if N=1 |
| CLCD display | — | — | **not direct** | via wire + `.panel:{ value, set }` | see below |

**Not in v1:** `comp [button]`, `comp [motor]`, `comp [sensor]`, `comp [fan]` — planned in **P3c**.

---

## Input targets — behavior and mapping

### `comp [key]` — momentary button

| Topic | Detail |
|-------|--------|
| **Map** | `START = .start` → reads `.start:get` |
| **Width** | 1 bit |
| **UI** | Press key in panel → `:get` is `1` while held (typically `0` when released) |
| **Load & Run** | Key is **not** preset — use `comp [switch]` with `= 1`, a wire preset, or press key after **Load** then trigger scan |
| **Tests** | Test **2772** uses `session.setComp('.start', '1')` before scan |

Program sees the same 1-bit value as a wire or switch.

### `comp [switch]` — toggle

| Topic | Detail |
|-------|--------|
| **Map** | `STOP = .stop` |
| **Width** | 1 bit |
| **Preset** | `comp [switch] .stop: = 0 :` or `= 1` in component body |
| **Load & Run** | Deterministic when preset in script (see examples 2, 7–9) |

### `comp [dip]` — parallel DIP switches

| Topic | Detail |
|-------|--------|
| **Map** | `SEL = .mode` |
| **Width** | `length` attribute (e.g. `length: 4` → 4-bit symbol `SEL: 4` in program) |
| **Preset** | `= 1010` in component body |
| **v1 logic** | Boolean `IF SEL` requires **1-bit** symbol — use `length: 1` or map only one bit via wire in P+b |
| **Read** | Full bit pattern via `:get` |

### `comp [slider]` — analog UI (documentation only until P+b)

| Topic | Detail |
|-------|--------|
| **Map** | `LEVEL = .slider` with matching `length` |
| **v1** | Declare and map for elaboration tests; **no** `IF LEVEL > n` in program yet |
| **Future** | Comparisons and assignments in **P+b** |

### Wires

| Topic | Detail |
|-------|--------|
| **Map** | `START = startIn` (wire name, no `.`) |
| **Width** | `1wire`, `8wire`, … must match symbol width |
| **Write** | `writeWireStable` + connection update |

---

## Output targets — behavior and mapping

### `comp [led]`

| Topic | Detail |
|-------|--------|
| **Map** | `MOTOR = .motorLed` |
| **Write** | Storage ref + `updateDisplayValue` — LED lights immediately after scan |
| **Alternative** | `MOTOR = motorCmd` then `.motorLed = motorCmd` outside PLC (example 3) |

### `comp [reg]`

| Topic | Detail |
|-------|--------|
| **Map** | `CMD = .cmd` with `depth: N` matching symbol width |
| **Write** | `setReg` on device (not property block `set`/`data`) |
| **Read back** | `.cmd:get` reflects value after scan |
| **Note** | For scripted loads via property block, use `.cmd:{ data = … set = 1 }` separately from PLC scan |

### `comp [bar]`

| Topic | Detail |
|-------|--------|
| **Map** | `STATUS = .status` with `length: N` |
| **Write** | `setBarState` via `updateDisplayValue` |
| **Read** | `lastSegmentValue` / `:get` (handler may not expose `:get` in all builds — bar state is in device) |

### Wires (outputs)

Same as inputs; PLC drives the wire during scan. Downstream LogTscript (`.led = motorCmd`) runs **after** the scan statement in script order.

### `comp [clcd]` — indirect only

CLCD is **multi-bit** (display bitmap, touch symbols). **Do not** map `OUTPUT = .panel` directly from PLC.

**Recommended pattern:**

1. PLC writes a **1-bit wire** (or `comp [led]`).
2. Outside PLC: `.panel:{ value = alarmCmd set = 1 }` with `comp [clcd]` **`on: 1`** so the block runs on first Run.

```logts
1wire alarmCmd

comp [plc] .ctrl:
  outputs: { ALARM = alarmCmd }
  ...

comp [clcd] .panel:
  = { warning: x:10 y:10 bit:0 : }
  on: 1
  :

.ctrl:{ set = 1 }
.panel:{ value = alarmCmd set = 1 }
```

Multi-bit status codes (`8wire statusCode`) → **P+b** or script logic between PLC and panel.

---

## `comp [plc]` — pins, pouts, and cases

### Attributes (summary)

| Attribute | Required | Description |
|-----------|----------|-------------|
| **`program:`** | yes | One `inline [plc]` reference |
| **`inputs:`** | yes* | Every program input symbol → wire or `.component` |
| **`outputs:`** | yes* | Every program output symbol → wire or `.component` |
| **`on:`** | optional | Property-block trigger for `.ctrl:{ set = 1 }` |

### Pins

| Pin | Bits | When active | Effect |
|-----|------|-------------|--------|
| **`set`** | 1 | Property block runs with `set = 1` (per `on:`) | One full scan |

### Pouts

| Pout | Bits | Value | Notes |
|------|------|-------|-------|
| **`scanCount`** | 16 | Number of completed scans | `.ctrl:scanCount` |
| **`busy`** | 1 | `0` if `scanTime:0`; else `1` during `scanDuration` | `.ctrl:busy` |
| **`skipped`** | 1 | `1` if manual `set` ignored (busy) | `.ctrl:skipped` |
| **`missed`** | 1 | `1` after strict overrun tick | `.ctrl:missed` |
| **`overrunCount`** | 16 | Missed auto-scan ticks (`strict:1`) | `.ctrl:overrunCount` |

### `on:` modes — when does scan run?

| Mode | First `.ctrl:{ set = 1 }` on Load & Run | Use when |
|------|----------------------------------------|----------|
| **`on: 1`** / level | **Scans** | Docs, pedagogy, deterministic examples |
| **`on: raise`** (default) | **Skips** until `set` goes `0→1` | Pulse / wave / interactive |

Same rules apply to **`comp [clcd]`** property blocks — use **`on: 1`** on CLCD when the panel must update on first Run after PLC scan.

### Scan cycle — step by step

1. Read each **input** map target → build `externalInputs`.
2. Run **`executePlcScan`** once (updates internal `outputState`).
3. Write each **output** map target from `outputState`.
4. Increment **`scanCount`**.

### Output retain (P-D7)

If the program does **not** assign an output in this scan, the **mapped target keeps** the previous physical value; internal `outputState` also retains for use **inside** the same program on the next line.

### Elaboration errors (strict)

| Case | Result |
|------|--------|
| Program input not in `inputs:` | Error at `comp [plc]` create |
| Extra key in `inputs:` / `outputs:` | Error |
| Width mismatch (e.g. 1-bit symbol → `8wire`) | Error |
| `program:` not `inline [plc]` | Error |

---

## Runnable examples (verified in tests 2757–2783)

Examples **1–6** cover wires, panel switch+LED, external LED, two PLCs, latch, and `doc`. Examples **7–11** cover the I/O matrix (P3).


## Errors (elaboration and parse)

| Situation | When | Example message |
|-----------|------|-----------------|
| Input declared, not mapped | elaboration | `plc .ctrl: input STOP declared in program but not mapped` |
| Extra map key | elaboration | `mapping STOP is not declared in program inputs` |
| Width mismatch | elaboration | `plc .ctrl: START width 1 does not match bus (8 bits)` |
| Invalid `program:` | elaboration | `plc program .x must be inline [plc]` |
| Assign to input | parse | `cannot assign to input START` |
| Unknown symbol | parse | `unknown symbol ALARM` |
| Multi-bit in `IF` | parse | `IF requires 1-bit symbol, got TEMP (8 bits)` |

---

## Future phases

| Phase | Content |
|-------|---------|
| **P5** | Timers (`TON`, `TOF`) in `inline [plc]` — **P5.2**: `CTU`/`CTD`; **P5.3**: full IEC placement in `CASE`/`FOR`/`WHILE` |
| **P+b** | Multi-bit logic, comparisons (`IF TEMP > 50`) |
| **P+c** | `VAR` / `END_VAR`, `CASE`, `RETURN` |
| **P+d** | `FOR`, `WHILE` |
| **P3c** | `motor`, `sensor`, `fan`, `button` components |

---

## See also

- [plc-language.md](plc-language.md) — **PLC language** (keywords, syntax, timers)
- [cpu.md](cpu.md) — `inline [asm]` + `comp [cpu]` pattern
- [conditional-assignment.md](conditional-assignment.md) — LogTscript `on:` / property blocks
- [key.md](key.md), [switch.md](switch.md), [led.md](led.md) — panel I/O for map targets
