# PLC — `inline [plc]` + `comp [plc]`

LogTScript PLC support follows the same two-layer model as **`inline [asm]`** + **`comp [cpu]`**:

1. **`inline [plc]`** — hardware-independent program: symbolic inputs/outputs + boolean logic (IEC 61131-3 ST-inspired).
2. **`comp [plc]`** — runtime: maps symbols to wires or panel components, runs one **scan** per `set = 1`.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [cpu.md](cpu.md) and [cache.md](cache.md)).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Program** | `inline [plc] .machine:` with `inputs:{ }`, `outputs:{ }`, logic body |
| **Logic (v1)** | `IF/THEN/ELSE/ELSIF/END_IF`, `AND/OR/NOT/XOR`, `TRUE`/`FALSE`, `0`/`1` |
| **Widths** | `START` alone = 1 bit; `TEMP: 8` declarable (logic on multi-bit → future P+b) |
| **Scan** | `.plc:{ set = 1 }` = one sequential pass through the program |
| **Outputs** | Retain last value if not assigned this scan (PLC semantics) |
| **Inputs** | Read-only in program; mapped at `comp [plc]` elaboration |
| **Errors** | Strict mapping at elaboration — no silent fallback to `0` |

---

## Architecture

```text
inline [plc] .machine     comp [plc] .ctrl
  inputs: { START }  -->    inputs: { START = .key }
  outputs: { MOTOR } -->    outputs: { MOTOR = motorWire }
  IF ... END_IF             .ctrl:{ set = 1 }  --> scan
```

The PLC program never names `.key` or `motorWire` — only `START` and `MOTOR`.

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
| **Order** | Top-level assignments and `IF` blocks run **in order** (one list) |
| **Inputs** | Read at scan start; **cannot assign** to inputs (parse error) |
| **Outputs** | **Readable** in expressions (current value in this scan) |
| **Unassigned output** | **Keeps** previous value (first scan starts at `0`) |
| **Multi-bit symbols** | May be declared; using them in `IF`/operators is a **parse error** until analog phase |

`doc(.machine)` prints inputs, outputs, and the parsed program.

---

## `comp [plc]` — runtime

### Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| **`program:`** | yes | Reference to `inline [plc]` (e.g. `program: .machine`) |
| **`inputs:`** | yes* | Map each program input: `SYM = wire` or `SYM = .component` |
| **`outputs:`** | yes* | Map each program output: `SYM = wire` or `SYM = .component` |
| **`on:`** | optional | Property-block trigger (`1`, `raise`, `edge` — same as other components) |

\*Every symbol in the program must appear **exactly once** in the matching map. Extra or missing keys → **elaboration error**.

### Pins and pouts

| Pin / pout | Bits | Description |
|------------|------|-------------|
| **`set`** | 1 | Level or edge (per `on:`) — when active, runs **one scan** |
| **`scanCount`** | 16 | Number of scans completed (read via `.ctrl:scanCount` or `show`) |

### Mapping rules

| Target | Read (input) | Write (output) |
|--------|--------------|----------------|
| **Wire** | `getWireEffectiveValue` | `writeWireStable` + propagation |
| **Component** | `:get` (implicit) | Update storage + `updateDisplayValue` (e.g. `led`) |

**Width must match** symbol width exactly (e.g. `1wire` ↔ `START: 1`).

### `on:` vs motor command

`on:` on `comp [plc]` means **when the property block runs** (scan trigger), not “motor on”. Command is the **output symbol value** written to the mapped wire or component.

---

## Runnable examples

### Example 1 — START / STOP / MOTOR (wires)

Load & Run: `motorOut` is `1` when `startIn = 1` and `stopIn = 0`.

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

### Example 2 — ELSIF + TRUE / FALSE

`motorOut` is `0` when `stopIn = 1` (ELSIF branch).

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN
    MOTOR = TRUE
  ELSIF STOP THEN
    MOTOR = FALSE
  ELSE
    MOTOR = FALSE
  END_IF
  :

1wire startIn
1wire stopIn
1wire motorOut

startIn = 1
stopIn = 1

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
```

### Example 3 — Output retain (latch without VAR)

First scan with `startIn = 1` sets `motorOut = 1`. Second scan with `startIn = 0` **keeps** `motorOut = 1` (no `ELSE`).

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

### Example 4 — Program documentation only

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

doc(.machine)
```

---

## Panel I/O substitutes (today)

| PLC role | Substituent | Map example |
|----------|-------------|-------------|
| Momentary input | `comp [key]` | `START = .start` |
| Toggle input | `comp [switch]` | `STOP = .stop` |
| Parallel input | `comp [dip]` | `SEL = .dip` (width = `length`) |
| Indicator | `comp [led]` | `MOTOR = .led` or wire → `.led = motorWire` |

Dedicated `button` / `motor` components are planned for a later phase.

---

## Errors (elaboration and parse)

| Situation | When | Example message |
|-----------|------|-----------------|
| Input declared, not mapped | elaboration | `input START declared in program but not mapped` |
| Extra map key | elaboration | `mapping STOP is not declared in program` |
| Width mismatch | elaboration | `START width 1 does not match wire bus (8 bits)` |
| Assign to input | parse | `cannot assign to input START` |
| Unknown symbol | parse | `unknown symbol ALARM` |
| Multi-bit in `IF` | parse | `IF requires 1-bit symbol, got TEMP (8 bits)` |

---

## Future phases (not in v1)

| Phase | Content |
|-------|---------|
| **P4** | `scanTime` + periodic scan via `osc` |
| **P+a** | Timers (`TON`, `TOF`, `CTU`) |
| **P+b** | Multi-bit logic, comparisons (`IF TEMP > 50`) |
| **P+c** | `VAR` / `END_VAR`, `CASE`, `RETURN` |
| **P+d** | `FOR`, `WHILE` |

---

## See also

- [cpu.md](cpu.md) — `inline [asm]` + `comp [cpu]` pattern
- [conditional-assignment.md](conditional-assignment.md) — LogTscript `on:` / property blocks
- [key.md](key.md), [switch.md](switch.md), [led.md](led.md) — panel I/O for map targets
