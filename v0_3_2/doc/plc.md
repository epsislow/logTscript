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
| **Logic** | `IF` / `CASE` / `RETURN` / `FOR` / `WHILE` / `REPEAT` / `EXIT`, boolean operators, comparisons, arithmetic |
| **Multi-bit** | `TEMP: 8` — comparisons (`IF TEMP > 50`), assign (`SPEED = TEMP`), `+ - * / MOD` |
| **Internal memory** | `VAR` … `END_VAR` (between scans; reset on re-RUN); `CONST` … `END_CONST` |
| **Timers** | `TON` / `TOF` blocks; `PT` in scan cycles; read `name.Q` |
| **Counters** | `CTU` / `CTD` blocks; `PV` preset; read `name.Q`; compare `name.CV >= N` |
| **Widths** | `START` alone = 1 bit; `TEMP: 8` = 8-bit unsigned; overflow wraps to symbol width |
| **Scan** | `.plc:{ set = 1 }` or **`scanTime > 0`** auto-scan; see [Scan timing](#scan-timing) |
| **Multi-program** | `program: .init .main` — one `comp [plc]`, shared I/O map; see [Multiple programs](#multiple-programs-on-one-comp-plc) |
| **Globals** | `globals: { READY: 1 }` — internal shared memory between programs; see [Internal globals](#internal-globals-shared-memory) |
| **`busy`** | `0` when all `scanTime` values are `0`; pulses during simulated scan when any period `> 0` |
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
| `TON` / `TOF` | [plc-language.md — Timers](plc-language.md#timers--ton--tof) |
| `CTU` / `CTD` | [plc-language.md — Counters](plc-language.md#counters--ctu--ctd) |
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
| **`program:`** | yes | One or more `inline [plc]` refs (e.g. `program: .machine` or `program: .init .main`). Order = execution order when run together. |
| **`inputs:`** | yes* | `SYM = wire` or `SYM = .component` for every program input (one shared map for all programs) |
| **`outputs:`** | yes* | `SYM = wire` or `SYM = .component` for every program output (one shared map) |
| **`globals:`** | optional | Internal shared symbols `{ READY }` or `{ READY: 1, STEP: 8 }` — not mapped to hardware; see [Internal globals](#internal-globals-shared-memory) |
| **`on:`** | optional | How **property blocks** on this component are triggered (see below) |
| **`scanTime:`** | optional† | **ms** — one value (broadcast) or comma-separated per program (`10, 100`); see [Scan timing](#scan-timing) and [Multiple programs](#multiple-programs-on-one-comp-plc) |
| **`scanDuration:`** | optional | **ms** simulated execution time per scan (`busy = 1`); default **`1`** when any `scanTime > 0` |
| **`strict:`** | optional | **`0`** (default) stretch missed ticks; **`1`** = overrun/miss (`overrunCount++`) |
| **`retain:`** | optional | **`0`** (default) reset timer/counter FB state on re-RUN; **`1`** preserve FB state in same session (per program) |
| **`retainVar:`** | optional | **`0`** (default) reset **`VAR`** and **`globals`** on re-RUN; **`1`** preserve them in same session |

\*Every program symbol must appear **exactly once** in the matching map. Missing or extra keys → **elaboration error**. Without `globals:`, all programs must declare the **same** `inputs`/`outputs` (names and widths). With `globals:`, each program may declare a **subset**; the **union** of all programs must match the component map exactly.

†With **more than one** program, **`scanTime:`** is **required** (use `scanTime: 0` for sequential event-driven scans).

`doc(comp.plc)` shows the component type; `doc(.ctrl)` shows program ref(s), **`retain`**, **`retainVar`**, maps, **`globals`**, `scanCount`, last `outputState`, and last `globalState`.

### Scan cycle (one pass)

When a property block runs on `.ctrl` and `set` is active (per `on:`):

1. **Read** each mapped input (wire or component `:get`) — once per trigger.
2. **Execute** the `inline [plc]` program(s) (`executePlcScan`). With several programs and `scanTime: 0`, all run **in list order** (super-scan).
3. **Write** each mapped output (wire or component storage + display) — once; if several programs assign the same output, the **last** program in the list wins.
4. Increment **`scanCount`** (once per super-scan when programs share one trigger).

Internal output state (`outputState`) persists between scans for latch semantics inside each program.

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

.motorLed = motorCmd    # LogTscript wiring after scan
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

## Multiple programs on one `comp [plc]`

A single `comp [plc]` can list several `inline [plc]` programs:

```logts
comp [plc] .ctrl:
  program: .init .main
  scanTime: 0
  inputs: { START = .start, STOP = .stop }
  outputs: { READY = readyWire, MOTOR = motorOut }
  on: 1
  :
```

### One program vs several programs vs two components

| Pattern | When to use |
|---------|-------------|
| **`program: .machine`** (one ref) | Default — one logic body, one map |
| **Two `comp [plc]`** ([Example 4](#example-4--two-machines-one-program)) | Different I/O maps, independent scans, or different interfaces |
| **`program: .a .b`** on one component | Same I/O interface; shared process image; sequential or multi-rate execution |

### Rules

| Rule | Behaviour |
|------|-----------|
| **Shared map** | One `inputs:` / `outputs:` for the component — all programs share it |
| **Identical interface** | Without `globals:`: every program must declare the **same** input/output symbols and widths |
| **Different interfaces** | With `globals: { … }`: each program may declare a **subset** of I/O; union must match the component map |
| **Order** | List order is execution order when programs run in one super-scan |
| **Shared outputs** | All programs share one `outputState` (process image). A later program in a super-scan can **read** outputs written by an earlier one |
| **State** | Timers, counters, and `VAR` are **per program**; **`globals`** are shared on the component; `retain` / `retainVar` apply to the whole component |
| **`scanTime:` required** | With 2+ programs you must write `scanTime:` explicitly (e.g. `0`, `50`, or `10 100`) |
| **Duplicate ref** | `program: .a .a` → elaboration error |

### How `scanTime:` works with several programs

| `scanTime:` | Behaviour |
|-------------|-----------|
| **One value `0`** (e.g. `scanTime: 0`) | **Super-scan**: each `set` (or external pulse) runs **all** programs in order, one input read, one output write, `scanCount++` once |
| **One value `K > 0`** (e.g. `scanTime: 50`) | **Parallel timers**: each program gets its own timer at **K ms**; each tick runs **only that** program |
| **N values** (e.g. `scanTime: 10, 100`) | **Independent periods**: program *i* auto-scans every `scanTime[i]` ms |
| **Wrong length** | Not 1 and not N → elaboration error |

Manual `.ctrl:{ set = 1 }` with multi-rate still runs **all** programs once (same as a one-shot super-scan), which keeps Load & Run examples deterministic.

`doc(.ctrl)` lists each program and, for multi-rate, each program’s `scanCount`. The pout **`scanCount`** is the component total (sum of program scans in multi-rate; one per super-scan when `scanTime: 0`).

---

## Internal globals (shared memory)

**`globals:`** on `comp [plc]` declares **internal** symbols shared by all programs on that component — like PLC marker/flag memory (zone M), not rack I/O.

```logts
comp [plc] .ctrl:
  program: .init .main
  scanTime: 0
  globals: {
    READY: 1
  }
  inputs: { START = .start, STOP = .stop }
  outputs: { MOTOR = .motorLed }
  on: 1
  :
```

### When to use

| Need | Use |
|------|-----|
| Same I/O interface on every program | Shared `outputState` in a super-scan (no `globals:` needed) |
| Programs with **different** `inputs`/`outputs` lists | **`globals:`** for cross-program flags / internal state |
| Persist a flag across re-RUN | `retainVar: 1` (covers both `VAR` and globals) |

### Rules

| Rule | Behaviour |
|------|-----------|
| **Opt-in** | Omit `globals:` → previous behaviour unchanged |
| **Scope** | One `globalState` per `comp [plc]` (not script-wide) |
| **Not hardware** | Global names must **not** appear in `inputs:` / `outputs:` maps |
| **Not `VAR`** | Same name as a program `VAR` → elaboration error |
| **Use in programs** | Read/write like `VAR` / outputs (e.g. `READY = 1`, `IF READY THEN …`) — no separate declaration inside `inline [plc]` |
| **Widths** | `SYM` = 1 bit; `SYM: N` = N bits |
| **Conflict** | Same global written by two programs in one super-scan → **last program in the list** wins |
| **Multi-rate** | Each slot scan updates `globalState`; other programs see it on their next run |
| **`retainVar: 0`** (default) | `globalState` resets to 0 on re-RUN |
| **`retainVar: 1`** | `globalState` preserved in the same session (with `VAR`) |

### Pins / pouts

Globals have **no** pins or pouts. Inspect them with **`doc(.ctrl)`** (`globalState` section).

---

## Scan timing

### What `scanTime` means

**`scanTime`** is the target interval (**milliseconds**) between scan cycles. It accepts **one** value or a **comma-separated list**:

```text
read inputs → executePlcScan (one or more programs) → write outputs → update scanCount
```

| `scanTime` | Mode | Behaviour |
|------------|------|-----------|
| **omitted** or **`0`** (single program) | **Event-driven** | No internal timer. Scan on each active **`set`**. Execution is **instant** — **`busy` stays `0`**. |
| **`N > 0`** (one value, one program) | **Auto-scan** | Internal timer every ~**N ms**. **`busy`** pulses for **`scanDuration`** ms. |
| **`0`** with several programs | **Super-scan** | Each trigger runs all programs in order (see [Multiple programs](#multiple-programs-on-one-comp-plc)). |
| **`K > 0`** broadcast with several programs | **Parallel auto-scan** | Each program has a timer at **K ms**. |
| **`t1, t2, …`** (one per program) | **Independent rates** | Program *i* period = `ti` ms. |

List several periods with **commas** (e.g. `scanTime: 10, 100`). A bare space between digits like `0`/`1` is treated as one binary-style literal by the tokenizer.

### Master clock

| Setup | Who drives scans |
|-------|------------------|
| **`scanTime: 0`** | **You** — `.ctrl:{ set = 1 }`, wire, or **`comp [osc]`** |
| **`scanTime: N`** | **PLC timer** — periodic auto-scan; optional extra manual `set` if not `busy` |

### `busy`, `skipped`, overrun

| Case | Behaviour |
|------|-----------|
| **`scanTime: 0`** | `busy` always **`0`** |
| **`scanTime > 0`** | `busy = 1` for **`scanDuration`** ms after each scan starts |
| **`set` while `busy`** | Scan **ignored**; **`skipped = 1`** (no FIFO queue) |
| **`strict: 0`** (default) | Timer tick during `busy` → scan **deferred** (stretch) |
| **`strict: 1`** | Timer tick during `busy` → cycle **missed**; **`overrunCount++`**, **`missed = 1`** |

Outputs keep their last written value while `busy`.

### External clock (`scanTime: 0`)

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

### Auto-scan

```logts
comp [plc] .ctrl:
  program: .machine
  scanTime: 200
  scanDuration: 2
  ...
```

Load & Run starts the timer; **`scanCount`** increases ~5 times per second. Use **`probe(.ctrl:scanCount)`** or **`probe(.ctrl:busy)`** for live timing.

### Mixing manual `set` with auto-scan

With **`scanTime > 0`**, `.ctrl:{ set = 1 }` still works when **`busy = 0`**. If `busy = 1`, the request is skipped (`skipped = 1`).

### Strict overrun

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

Every block below uses **`logts-play`**: **Load** opens the script in the editor; **Load & Run** executes it (same as [cpu.md](cpu.md)). Where noted, the expected result after **Load & Run** is deterministic from presets in the script.

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

### Example 7 — `comp [dip]` as 1-bit input

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

### Example 8 — `comp [reg]` as 1-bit output

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

### Example 9 — `comp [bar]` length 1 as output

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

### Example 10 — `comp [key]` mapping

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

### Example 11 — CLCD alarm via wire

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

### Example 12 — DIP off → motor off

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

### Example 13 — External clock wire pulse

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

### Example 14 — Manual scan with `scanTime > 0`

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

### Example 15 — `on: raise` + oscillator (browser)

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

### Example 16 — Event-driven `busy` stays 0

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

## Timers TON / TOF

Language specification: [plc-language.md — TON / TOF](plc-language.md#timers--ton--tof). Below are integration examples with `comp [plc]` and `logts-play`.

### Example 17 — TON on-delay

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

### Example 18 — TOF off-delay

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

## Counters CTU / CTD

### Example 20 — CTU count-up

**SENSOR** pulsed 5 times; `PV := 5`; **FULL** LED activates when `CV >= 5`.

```logts-play
inline [plc] .boxCounter:
  inputs: { SENSOR, RESET }
  outputs: { FULL }
  CTU cnt(CU := SENSOR, R := RESET, PV := 5)
  FULL = cnt.Q
  :

comp [switch] .sensor:
  = 0
  :

comp [switch] .reset:
  = 0
  :

comp [led] .fullLed:
  :

comp [plc] .ctrl:
  program: .boxCounter
  inputs: { SENSOR = .sensor, RESET = .reset }
  outputs: { FULL = .fullLed }
  on: 1
  :

.sensor = 1
.ctrl:{ set = 1 }
.sensor = 0
.ctrl:{ set = 1 }
.sensor = 1
.ctrl:{ set = 1 }
.sensor = 0
.ctrl:{ set = 1 }
.sensor = 1
.ctrl:{ set = 1 }
.sensor = 0
.ctrl:{ set = 1 }
.sensor = 1
.ctrl:{ set = 1 }
.sensor = 0
.ctrl:{ set = 1 }
.sensor = 1
.ctrl:{ set = 1 }
.sensor = 0
.ctrl:{ set = 1 }

show(.fullLed:get)
show(.ctrl:scanCount)
```

After Load & Run: **`scanCount` = 10**, **FULL LED `1`** (5 complete rising edges counted).

### Example 21 — CTD count-down

`PV := 3`; the script sends one load pulse first, then three rising edges on `TICK`.

```logts-play
inline [plc] .mission:
  inputs: { TICK, RELOAD }
  outputs: { DONE }
  CTD cnt(CD := TICK, LD := RELOAD, PV := 3)
  DONE = cnt.Q
  :

comp [switch] .tick:
  = 0
  :

comp [switch] .reload:
  = 0
  :

comp [led] .doneLed:
  :

comp [plc] .ctrl:
  program: .mission
  inputs: { TICK = .tick, RELOAD = .reload }
  outputs: { DONE = .doneLed }
  on: 1
  :

# load preset first
.reload = 1
.ctrl:{ set = 1 }
.reload = 0

# 3 rising edges to count down
.tick = 1
.ctrl:{ set = 1 }
.tick = 0
.ctrl:{ set = 1 }
.tick = 1
.ctrl:{ set = 1 }
.tick = 0
.ctrl:{ set = 1 }
.tick = 1
.ctrl:{ set = 1 }
.tick = 0
.ctrl:{ set = 1 }

show(.doneLed:get)
show(.ctrl:scanCount)
```

After Load & Run: **`scanCount` = 7** (1 load + 6 scan pairs), **DONE LED `1`** (CV decremented to 0).

### Example 22 — `retain: 0` (reset FB state on re-RUN)

Default behaviour: timer and counter internal state (`timerState`, `counterState`) is cleared when you **Load & Run** again in the same browser session.

```logts-play
inline [plc] .counter:
  inputs: { PULSE, RESET }
  outputs: { FULL }
  CTU cnt(CU := PULSE, R := RESET, PV := 10)
  FULL = cnt.Q
  :

comp [switch] .pulse:
  = 0
  :

comp [switch] .reset:
  = 0
  :

comp [led] .full:
  :

comp [plc] .ctrl:
  program: .counter
  retain: 0
  inputs: { PULSE = .pulse, RESET = .reset }
  outputs: { FULL = .full }
  on: 1
  :

.pulse = 1
.ctrl:{ set = 1 }
.pulse = 0
.ctrl:{ set = 1 }
.pulse = 1
.ctrl:{ set = 1 }
.pulse = 0
.ctrl:{ set = 1 }
```

Run twice (second Run adds one more pulse): with **`retain: 0`**, CV after the extra pulse is **`1`**, not **`3`**.

### Example 23 — `retain: 1` (preserve FB state on re-RUN)

With **`retain: 1`**, `timerState` and `counterState` survive **re-RUN in the same session** if the program FB layout is unchanged. `outputState`, `scanCount`, and `busy` are **not** retained.

```logts-play
inline [plc] .counter:
  inputs: { PULSE, RESET }
  outputs: { FULL }
  CTU cnt(CU := PULSE, R := RESET, PV := 10)
  FULL = cnt.Q
  :

comp [switch] .pulse:
  = 0
  :

comp [switch] .reset:
  = 0
  :

comp [led] .full:
  :

comp [plc] .ctrl:
  program: .counter
  retain: 1
  inputs: { PULSE = .pulse, RESET = .reset }
  outputs: { FULL = .full }
  on: 1
  :

.pulse = 1
.ctrl:{ set = 1 }
.pulse = 0
.ctrl:{ set = 1 }
.pulse = 1
.ctrl:{ set = 1 }
.pulse = 0
.ctrl:{ set = 1 }
```

After two Runs (second adds one pulse): CV is **`3`** (2 preserved + 1 new). Changing timer/counter names or types in the program invalidates retained state.

### `retainVar:` — preserve `VAR` on re-RUN

| `retainVar` | On re-RUN (same browser session) |
|-------------|----------------------------------|
| **`0`** (default) | Every `VAR` resets to **`0`** |
| **`1`** | `varState` is restored if the program fingerprint still matches |

**Independent from `retain:`** — you can keep FB state without VAR (`retain: 1`, `retainVar: 0`), or VAR without FB (`retain: 0`, `retainVar: 1`), or both (`retain: 1`, `retainVar: 1`).

**Not retained** (even with `retainVar: 1`): mapped **outputs**, `scanCount`, `busy`, inputs from the panel. **Not saved to disk** — reload page or new session clears the cache.

**Invalidation:** same rules as `retain:` — program change (including `VAR` list), new session, or setting `retainVar: 0`.

### Example 24 — `VAR` latch (set-reset)

Internal `latch` remembers START until STOP. Second scan with START = 0 still keeps MOTOR on.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  VAR
    latch: 1
  END_VAR
  IF START AND NOT latch THEN latch = 1 END_IF
  IF STOP THEN latch = 0 END_IF
  MOTOR = latch
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
  inputs: { START = .start, STOP = .stop }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }
.start = 0
.ctrl:{ set = 1 }

show(.motorLed:get)
```

After Load & Run: LED is **`1`** (latched).

### Example 25 — `retainVar: 1` (VAR latch survives re-RUN)

Same latch program as Example 24, but `retainVar: 1` keeps internal `latch` after **Run** again without pressing START.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  VAR
    latch: 1
  END_VAR
  IF START AND NOT latch THEN latch = 1 END_IF
  IF STOP THEN latch = 0 END_IF
  MOTOR = latch
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
  retainVar: 1
  inputs: { START = .start, STOP = .stop }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }
.start = 0
.ctrl:{ set = 1 }

show(.motorLed:get)
```

After Load & Run: LED **`1`**. Press **Run** again (without toggling START): LED stays **`1`** because `latch` was restored. With `retainVar: 0`, a second Run would show **`0`**.

### Example 26 — `CASE` mode select

```logts-play
inline [plc] .machine:
  inputs: { SEL }
  outputs: { OUT_A, OUT_B }
  CASE SEL OF
    0:
      OUT_A = 1
      OUT_B = 0
    1:
      OUT_A = 0
      OUT_B = 1
    ELSE
      OUT_A = 0
      OUT_B = 0
  END_CASE
  :

comp [switch] .sel:
  = 1
  :

comp [led] .aLed:
  :

comp [led] .bLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { SEL = .sel }
  outputs: { OUT_A = .aLed, OUT_B = .bLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.aLed:get)
show(.bLed:get)
```

With `SEL = 1`: **OUT_A = 0**, **OUT_B = 1**.

### Example 27 — `RETURN` early exit

When ENABLE = 0, `RETURN` skips the assign that would turn MOTOR on.

```logts-play
inline [plc] .machine:
  inputs: { ENABLE }
  outputs: { MOTOR }
  MOTOR = 0
  IF NOT ENABLE THEN
    RETURN
  END_IF
  MOTOR = 1
  :

comp [switch] .enable:
  = 0
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { ENABLE = .enable }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

After Load & Run: LED is **`0`**.

### Example 28 — `FOR` in one scan

```logts-play
inline [plc] .machine:
  inputs: { DUMMY }
  outputs: { HIT }
  VAR
    i: 1
    hit: 1
  END_VAR
  hit = 0
  FOR i := 0 TO 1 DO
    IF i THEN hit = 1 END_IF
  END_FOR
  HIT = hit
  :

comp [switch] .dummy:
  = 0
  :

comp [led] .hitLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { DUMMY = .dummy }
  outputs: { HIT = .hitLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.hitLed:get)
```

After Load & Run: LED is **`1`** (loop reached `i = 1` in the same scan).

### Example 29 — `WHILE` + `EXIT`

```logts-play
inline [plc] .machine:
  inputs: { RUN }
  outputs: { MOTOR }
  MOTOR = 0
  WHILE RUN DO
    MOTOR = 1
    EXIT
  END_WHILE
  :

comp [switch] .run:
  = 1
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { RUN = .run }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

`EXIT` leaves the loop after one pass — LED is **`1`**, scan does not hang.

### Example 30 — `REPEAT` … `UNTIL`

Body runs once even when `STOP` is already 1.

```logts-play
inline [plc] .machine:
  inputs: { STOP }
  outputs: { MOTOR }
  MOTOR = 0
  REPEAT
    MOTOR = 1
  UNTIL STOP
  END_REPEAT
  :

comp [switch] .stop:
  = 1
  :

comp [led] .motorLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { STOP = .stop }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

After Load & Run: LED is **`1`**.

### Example 31 — slider thermostat (`TEMP > 50`)

`comp [slider]` provides an 8-bit value on `:get` (0…255). When the value is above 50, `HEATER` turns on.

```logts-play
inline [plc] .machine:
  inputs: { TEMP: 8 }
  outputs: { HEATER }
  IF TEMP > 50 THEN
    HEATER = 1
  ELSE
    HEATER = 0
  END_IF
  :

comp [slider] .tempSlider:
  length: 8
  :

comp [led] .heatLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { TEMP = .tempSlider }
  outputs: { HEATER = .heatLed }
  on: 1
  :

.ctrl:{ set = 1 }
```

After **Load & Run** with slider at 0: LED is **`0`**. Drag the slider above halfway (~>50) and trigger another scan — LED becomes **`1`**.

### Example 32 — scale input to `comp [bar]`

Copy and scale a multi-bit input to an 8-segment bar display.

```logts-play
inline [plc] .machine:
  inputs: { TEMP: 8 }
  outputs: { LEVEL: 8 }
  LEVEL = (TEMP * 2) / 10
  :

comp [slider] .tempSlider:
  length: 8
  on: 1
  :

comp [bar] .levelBar:
  length: 8
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { TEMP = .tempSlider }
  outputs: { LEVEL = .levelBar }
  on: 1
  :

.tempSlider:{ data = 01010000 set = 1 }
.ctrl:{ set = 1 }

show(.levelBar:get)
```

After Load & Run: `TEMP = 80`, `LEVEL = (80 * 2) / 10 = **16**` (`00010000` on `:get`).

### Example 33 — `CASE` on multi-bit mode

Use symbol **`MSEL`** (not `MODE` — `MODE` is a LogTscript keyword in component maps).

```logts-play
inline [plc] .machine:
  inputs: { MSEL: 8 }
  outputs: { OUT_A, OUT_B }
  CASE MSEL OF
    0:
      OUT_A = 1
      OUT_B = 0
    50:
      OUT_A = 0
      OUT_B = 1
    ELSE
      OUT_A = 0
      OUT_B = 0
  END_CASE
  :

comp [slider] .modeSlider:
  length: 8
  on: 1
  :

comp [led] .aLed:
  :

comp [led] .bLed:
  :

comp [plc] .ctrl:
  program: .machine
  inputs: { MSEL = .modeSlider }
  outputs: { OUT_A = .aLed, OUT_B = .bLed }
  on: 1
  :

.modeSlider:{ data = 00110010 set = 1 }
.ctrl:{ set = 1 }

show(.aLed:get)
show(.bLed:get)
```

After Load & Run with `MSEL = 50`: **OUT_A = 0**, **OUT_B = 1**.

### Example 34 — Pipeline: `program: .init .main` (super-scan)

Two programs, shared I/O, `scanTime: 0`. One `set` runs `.init` then `.main`. `.init` sets `READY`; `.main` turns `MOTOR` on when `READY` is true.

Load & Run: `readyOut = 1`, `motorOut = 1`, `scanCount = 1`.

```logts-play
inline [plc] .init:
  inputs: { START, STOP }
  outputs: { READY, MOTOR }
  IF START THEN READY = 1 ELSE READY = 0 END_IF
  :

inline [plc] .main:
  inputs: { START, STOP }
  outputs: { READY, MOTOR }
  IF READY AND NOT STOP THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

1wire startIn
1wire stopIn
1wire readyOut
1wire motorOut

startIn = 1
stopIn = 0

comp [plc] .ctrl:
  program: .init .main
  scanTime: 0
  inputs: { START = startIn, STOP = stopIn }
  outputs: { READY = readyOut, MOTOR = motorOut }
  on: 1
  :

.ctrl:{ set = 1 }

show(readyOut)
show(motorOut)
show(.ctrl:scanCount)
```

### Example 35 — Output conflict: last program wins

Both programs assign `MOTOR` in the same super-scan. The second program’s value is written.

Load & Run: `motorOut = 0` (`.second` wins).

```logts-play
inline [plc] .first:
  inputs: { START }
  outputs: { MOTOR }
  MOTOR = 1
  :

inline [plc] .second:
  inputs: { START }
  outputs: { MOTOR }
  MOTOR = 0
  :

1wire startIn
1wire motorOut
startIn = 1

comp [plc] .ctrl:
  program: .first .second
  scanTime: 0
  inputs: { START = startIn }
  outputs: { MOTOR = motorOut }
  on: 1
  :

.ctrl:{ set = 1 }

show(motorOut)
```

### Example 36 — Multi-rate: `scanTime: 10, 100`

Two programs with independent periods. After ~100 ms of virtual time, the fast program has more scans than the slow one.

```logts-play
inline [plc] .fastProg:
  inputs: { EN }
  outputs: { FAST, SLOW }
  IF EN THEN FAST = 1 ELSE FAST = 0 END_IF
  :

inline [plc] .slowProg:
  inputs: { EN }
  outputs: { FAST, SLOW }
  IF EN THEN SLOW = 1 ELSE SLOW = 0 END_IF
  :

comp [switch] .en:
  = 1
  :

1wire fastOut
1wire slowOut

comp [plc] .ctrl:
  program: .fastProg .slowProg
  scanTime: 10, 100
  scanDuration: 1
  inputs: { EN = .en }
  outputs: { FAST = fastOut, SLOW = slowOut }
  on: 1
  :

show(fastOut)
show(slowOut)
```

After Load & Run the outputs are still `0` until auto-scan ticks (or a manual `.ctrl:{ set = 1 }`, which runs both once). Use **`probe(.ctrl:scanCount)`** in the browser to watch counts grow. With `scanDuration: 1`, allow a little more than the slow period so both programs have run (busy windows can defer a tick by 1 ms).

### Example 37 — Globals: `.init` / `.main` with different I/O

`.init` only has `START`; `.main` only has `STOP` / `MOTOR`. They share internal flag **`READY`** via `globals:`.

Load & Run: `READY = 1`, motor LED on.

```logts-play
inline [plc] .init:
  inputs: { START }
  outputs: { }
  IF START THEN READY = 1 ELSE READY = 0 END_IF
  :

inline [plc] .main:
  inputs: { STOP }
  outputs: { MOTOR }
  IF READY AND NOT STOP THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
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
  program: .init .main
  scanTime: 0
  globals: {
    READY: 1
  }
  inputs: { START = .start, STOP = .stop }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

### Example 38 — `retainVar: 1` preserves globals on re-RUN

First Run sets `READY` with `START = 1`. Second Run (same session) uses `START = 0` but **`retainVar: 1`** keeps `READY`, so `MOTOR` stays on.

```logts-play
inline [plc] .init:
  inputs: { START }
  outputs: { }
  IF START THEN READY = 1 END_IF
  :

inline [plc] .main:
  inputs: { STOP }
  outputs: { MOTOR }
  MOTOR = READY
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
  program: .init .main
  scanTime: 0
  retainVar: 1
  globals: {
    READY: 1
  }
  inputs: { START = .start, STOP = .stop }
  outputs: { MOTOR = .motorLed }
  on: 1
  :

.ctrl:{ set = 1 }

show(.motorLed:get)
```

After first Load & Run the LED is on. Change `.start` to `= 0` and Run again (without clearing session): LED stays on because `READY` was retained. With `retainVar: 0`, the second Run would leave `READY = 0` and the LED off.

---

## I/O mapping matrix

LogTScript PLC maps **program symbols** to **wires** or **existing panel components**. Width must match exactly. Programs may use **1-bit boolean logic** or **multi-bit comparisons and arithmetic** on mapped symbols.

| Role | PLC symbol (example) | Width | LogTscript target | Read / write | Typical logic |
|------|----------------------|-------|-------------------|--------------|---------------|
| Momentary input | `START` | 1 | `comp [key]` | `:get` | `IF START` |
| Toggle input | `STOP`, `ENABLE` | 1 | `comp [switch]` | `:get` | `IF NOT STOP` |
| Parallel switches | `SEL` | N | `comp [dip]` | `:get` (width = `length`) | `CASE SEL OF` (1-bit) or map as N-bit |
| Analog input (UI) | `TEMP`, `LEVEL` | N | `comp [slider]` or `comp [sensor]` | `:get` | `IF TEMP > 50`, `SPEED = TEMP` |
| Sensor digital | `PROX`, `LIMIT` | 1 | `comp [sensor]` | `:get` | `IF PROX THEN …` |
| Port I/O | — | N | `comp [ioport]` | pins/pouts | width-based mapping |
| On/off indicator | `MOTOR`, `ALARM` | 1 | `comp [led]` | write storage + display | `MOTOR = 1` |
| Bit storage / command | `CMD` | N | `comp [reg]` | `setReg` on scan | multi-bit assign |
| LED bar | `STATUS` | N | `comp [bar]` | `setBarState` on scan | `LEVEL = (TEMP * 2) / 10` |
| Bus | `motorCmd` | N | `Nwire` name | wire read/write | any width |
| CLCD display | — | — | **not direct** | via wire + `.panel:{ value, set }` | see below |

## Input targets — behavior and mapping

### `comp [key]` — momentary button

| Topic | Detail |
|-------|--------|
| **Map** | `START = .start` → reads `.start:get` |
| **Width** | 1 bit |
| **UI** | Press key in panel → `:get` is `1` while held (typically `0` when released) |
| **Load & Run** | Key is **not** preset — use `comp [switch]` with `= 1`, a wire preset, or press key after **Load** then trigger scan |

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
| **Logic** | Boolean `IF SEL` on 1-bit; or map N-bit dip and use `CASE` / comparisons |
| **Read** | Full bit pattern via `:get` |

### `comp [slider]` — analog UI

Generic N-bit panel slider. For named scales (temperature, humidity, `mag`, units), prefer **`comp [sensor]`** — [sensor.md](sensor.md).

| Topic | Detail |
|-------|--------|
| **Map** | `TEMP = .tempSlider` with matching `length` (e.g. `TEMP: 8` ↔ `length: 8`) |
| **Value range** | `0` … `2^length − 1` as binary on `:get` |
| **Logic** | `IF TEMP > 50`, `LEVEL = (TEMP * 2) / 10`, `CASE TEMP OF` |
| **Preset** | Drag in panel after Load, or `.tempSlider:{ data = 01100100 set = 1 }` with `on: 1` on the slider |
| **Example** | Example 31 — thermostat; Example 32 — bar scaling |

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

### `comp [motor]`

| Topic | Detail |
|-------|--------|
| **Map** | `MOTOR = .drive` — symbol width must match motor `length` |
| **Write** | Storage + spinning panel (`updateDisplayValue`); speed = full unsigned value |
| **Guide** | [motor.md](motor.md) |

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

For multi-bit status codes, use script logic between PLC output wires and the panel.

---

## `comp [plc]` — pins, pouts, and cases

### Attributes (summary)

| Attribute | Required | Description |
|-----------|----------|-------------|
| **`program:`** | yes | One or more `inline [plc]` refs (`program: .a` or `program: .a .b`) |
| **`inputs:`** | yes* | Every program input symbol → wire or `.component` (shared map) |
| **`outputs:`** | yes* | Every program output symbol → wire or `.component` (shared map) |
| **`globals:`** | optional | Internal shared symbols `{ READY }` / `{ READY: N }` — not hardware-mapped |
| **`on:`** | optional | Property-block trigger for `.ctrl:{ set = 1 }` |
| **`scanTime:`** | optional† | **ms** list — `0`/omitted (one program) = event-driven; broadcast or per-program periods |
| **`scanDuration:`** | optional | **ms** simulated execution per scan (`busy`); default **`1`** when any period `> 0` |
| **`strict:`** | optional | **`0`** stretch missed ticks; **`1`** = overrun/miss (`overrunCount++`) |
| **`retain:`** | optional | **`0`** reset timer/counter FB on re-RUN; **`1`** preserve FB state in session (per program) |
| **`retainVar:`** | optional | **`0`** reset `VAR` and globals on re-RUN; **`1`** preserve them in session |

†Required when `program:` lists more than one reference.

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

1. Read each **input** declared by the program(s) from the map → `externalInputs`.
2. Run **`executePlcScan`** for each participating program (shared `outputState` + shared `globalState` when `globals:` is set).
3. Write each **output** map target from `outputState` (last writer wins on conflicts).
4. Update **`scanCount`**.

### Output retain

If the program does **not** assign an output in this scan, the **mapped target keeps** the previous physical value; internal `outputState` also retains for use **inside** the same program on the next line.

### Elaboration errors (strict)

| Case | Result |
|------|--------|
| Program input not in `inputs:` | Error at `comp [plc]` create |
| Extra key in `inputs:` / `outputs:` | Error |
| Width mismatch (e.g. 1-bit symbol → `8wire`) | Error |
| `program:` not `inline [plc]` | Error |
| Duplicate ref in `program:` list | Error |
| Programs with different `inputs`/`outputs` (no `globals:`) | Error |
| Several programs without `scanTime:` | Error |
| `scanTime:` list length not 1 and not N | Error |
| Unknown symbol (not I/O, not `VAR`, not in `globals:`) | Error |
| Global name conflicts with program `VAR` / I/O | Error |

---

## Errors (elaboration and parse)

| Situation | When | Example message |
|-----------|------|-----------------|
| Input declared, not mapped | elaboration | `plc .ctrl: input STOP declared in program but not mapped` |
| Extra map key | elaboration | `mapping STOP is not declared in program inputs` |
| Width mismatch | elaboration | `plc .ctrl: START width 1 does not match bus (8 bits)` |
| Map symbol is LogTscript keyword | parse | `Expected symbol name in PLC map` (e.g. **`MODE`** in `inputs: { MODE = … }` — use another name like `MSEL`) |
| Invalid `program:` | elaboration | `plc program .x must be inline [plc]` |
| Duplicate program ref | elaboration | `plc .ctrl: duplicate program reference .a` |
| Different program interfaces (no `globals:`) | elaboration | `all programs must declare identical inputs/outputs` |
| Multi-program without `scanTime:` | elaboration | `multiple programs require explicit scanTime:` |
| Bad `scanTime:` list length | elaboration | `scanTime list length … must be 1 (broadcast) or N` |
| Unknown symbol / missing from `globals:` | elaboration | `unknown symbol ALARM … (declare in VAR or add to globals:)` |
| Global conflicts with `VAR` | elaboration | `global 'READY' conflicts with VAR in .machine` |
| Assign to input | parse | `cannot assign to input START` |
| Multi-bit in `AND`/`OR` | parse | `expression requires 1-bit symbol, got TEMP (8 bits)` |

---

## See also

- [plc-language.md](plc-language.md) — **PLC language** (keywords, syntax, timers)
- [cpu.md](cpu.md) — `inline [asm]` + `comp [cpu]` pattern
- [conditional-assignment.md](conditional-assignment.md) — LogTscript `on:` / property blocks
- [key.md](key.md), [switch.md](switch.md), [led.md](led.md), [motor.md](motor.md), [sensor.md](sensor.md) — panel I/O for map targets
