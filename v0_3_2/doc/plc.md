# PLC — `inline [plc]` + `comp [plc]`

LogTScript PLC support follows the same two-layer model as **`inline [asm]`** + **`comp [cpu]`**:

1. **`inline [plc]`** — hardware-independent program: symbolic inputs/outputs + boolean logic (IEC 61131-3 ST-inspired).
2. **`comp [plc]`** — runtime: maps symbols to wires or panel components, runs one **scan** per triggered `set`.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [cpu.md](cpu.md) and [cache.md](cache.md)).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Program** | `inline [plc] .machine:` with `inputs:{ }`, `outputs:{ }`, logic body |
| **Logic (v1)** | `IF/THEN/ELSE/ELSIF/END_IF`, `AND/OR/NOT/XOR`, `TRUE`/`FALSE`, `0`/`1` |
| **Widths** | `START` alone = 1 bit; `TEMP: 8` declarable (logic on multi-bit → future P+b) |
| **Scan** | `.plc:{ set = 1 }` with `on: 1` runs one program pass on Load & Run |
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

### Syntax

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

| Rule | Detail |
|------|--------|
| **`inputs:` / `outputs:`** | `{ SYM }` or `{ SYM: N }` — `SYM` alone defaults to **1 bit** |
| **Keywords** | Case-insensitive: `if` = `IF` |
| **Assignment** | `=` (not `:=`) |
| **Comments** | `;` to end of line |
| **Precedence** | `NOT` > `AND` > `OR` > `XOR` |
| **Closing** | Body ends with a line containing only `:` |

### Execution semantics (one scan)

| Rule | Behavior |
|------|----------|
| **Order** | Top-level assignments and `IF` blocks run **in order** |
| **Inputs** | Read at scan start; **cannot assign** to inputs (parse error) |
| **Outputs** | **Readable** in expressions (current value in this scan) |
| **Unassigned output** | **Keeps** previous value (first scan starts at `0`) |
| **Multi-bit symbols** | May be declared; `IF`/operators on them → parse error until P+b |

`doc(.machine)` / `doc(inline.plc)` print inputs, outputs, and the parsed program.

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
| **`set`** | 1 | In `.ctrl:{ set = 1 }` — triggers scan when block executes |
| **`scanCount`** | 16 | Scans completed; read as `.ctrl:scanCount` |
| **`busy`** | 1 | Always **`0`** in v1 (instant scan; **`scanTime`** in P4) |

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
| **Component** | `:get` (implicit) | Storage ref + `updateDisplayValue` (e.g. `led`) |

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

---

## Panel I/O substitutes

| PLC role | Substituent | Map example |
|----------|-------------|-------------|
| Momentary input | `comp [key]` | `START = .start` (press key in UI, or use wire in tests) |
| Toggle input | `comp [switch]` | `STOP = .stop` — preset with `= 1` in comp body |
| Parallel input | `comp [dip]` | `SEL = .dip` (width = `length`) |
| Indicator | `comp [led]` | `MOTOR = .motorLed` or wire → `.motorLed = motorCmd` |

Dedicated `button` / `motor` components are planned for a later phase.

---

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
| **P4** | `scanTime` + periodic scan via `osc`; `busy` during miss-style delay |
| **P+a** | Timers (`TON`, `TOF`, `CTU`) |
| **P+b** | Multi-bit logic, comparisons (`IF TEMP > 50`) |
| **P+c** | `VAR` / `END_VAR`, `CASE`, `RETURN` |
| **P+d** | `FOR`, `WHILE` |

---

## See also

- [cpu.md](cpu.md) — `inline [asm]` + `comp [cpu]` pattern
- [conditional-assignment.md](conditional-assignment.md) — LogTscript `on:` / property blocks
- [key.md](key.md), [switch.md](switch.md), [led.md](led.md) — panel I/O for map targets
