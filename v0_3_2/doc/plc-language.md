# PLC language

Keywords, syntax, and execution semantics for programs in **`inline [plc]`** — an IEC 61131-3 **Structured Text–inspired** dialect (boolean logic, timers, counters).

| Layer | Role | Documentation |
|-------|------|----------------|
| **Language** (this page) | Keywords, grammar, timers, errors | **plc-language.md** |
| **`inline [plc]`** | Where programs are written (`.machine:` … `:`) | syntax below |
| **`comp [plc]`** | Runtime: I/O map, scan, `scanTime` | [plc.md](plc.md) |

Use **`doc(inline.plc)`** for a declaration template and **`doc(.machine)`** for a parsed instance (inputs, outputs, timers, program body).

---

## Program shape

Every program is an **inline instance** with a name starting with `.`:

```logts
inline [plc] .machine:
  inputs: { START, STOP: 1 }
  outputs: { MOTOR, ALARM }
  ; ... statements ...
  :
```

| Part | Rule |
|------|------|
| **Header** | `inline [plc] .name:` — `.name` is required (same as `inline [asm]`) |
| **Interface** | Optional `inputs:` and `outputs:` (inputs first, then outputs) |
| **Memory** | Optional `VAR` … `END_VAR`, then optional `CONST` … `END_CONST` |
| **Body** | Sequential **statements** — assignments, `IF`, `CASE`, `RETURN`, `FOR`/`WHILE`/`REPEAT`, `EXIT`, timers, counters |
| **Closing** | Body ends with a line containing only **`:`** |

The program body does **not** reference wires or panel components — only symbolic names (`START`, `MOTOR`). Mapping happens on `comp [plc]` — see [plc.md](plc.md).

---

## Lexical rules

| Rule | Detail |
|------|--------|
| **Keywords** | Case-insensitive: `if`, `IF`, `If` are the same |
| **Identifiers** | Letters, digits, `_` — `START`, `motor_cmd`, `step1` |
| **Comments** | `;` to end of line |
| **Assignment in body** | `=` (outputs and internal assigns) |
| **Timer/counter args** | `:=` (IEC style) — `IN := START`, `PT := 10` |
| **Bit literals** | `0`, `1`, `TRUE`, `FALSE` |

**Reserved words** cannot be used as symbol names when they are parsed as keywords (e.g. `IF`, `TON`, `IN`, `PT`, `CU`, `R`).

---

## Declaration keywords

### `inputs:`

Read-only symbols filled from `comp [plc]` at scan start.

```logts
inputs: { START }
inputs: { START, STOP: 1 }
inputs: { TEMP: 8 }
```

| Form | Width |
|------|-------|
| `SYM` | **1 bit** (default) |
| `SYM: N` | **N bits** (`N ≥ 1`) |

**Rules**

- Assigning to an input in the program body → **parse error**
- Multi-bit inputs may be used in **comparisons** and **arithmetic** (see [Multi-bit values](#multi-bit-values-comparisons-and-arithmetic))

### `outputs:`

Writable symbols written to the map at scan end.

```logts
outputs: { MOTOR }
outputs: { SPEED: 8 }
```

Same width rules as `inputs:`.

**Rules**

- Outputs are **readable** in expressions during the same scan (value seen so far in this pass)
- If an output is **not assigned** in a scan, it **keeps** the previous value (PLC latch semantics; first scan starts at `0`)

### `VAR` … `END_VAR`

Internal memory (relay flags) — **not** mapped on `comp [plc]`. Values persist **between scans** on the same run; they **reset to `0`** on a new Load & Run.

```logts
VAR
  latch: 1
  step: 1
END_VAR
```

| Rule | Detail |
|------|--------|
| Placement | After `inputs`/`outputs`, **before** the program body (and before `CONST`) |
| Width | `name` or `name: N` (default **1**). Any width in comparisons and arithmetic |
| Read / write | Readable and writable in the body like outputs |
| First scan | Each VAR starts at **`0`** |
| Names | Must not conflict with inputs, outputs, CONST, timers, or counters |

Typical use: set-reset latch without relying only on output retain.

### `CONST` … `END_CONST`

Read-only named constants (integers). Values **0** and **1** may be used in 1-bit expressions.

```logts
CONST
  FLAG_ON = 1
  FLAG_OFF = 0
END_CONST
```

| Rule | Detail |
|------|--------|
| Placement | After `VAR` (if any), before the body |
| Form | `NAME = integer` |
| Assign | **Parse error** — CONST is read-only |

---

## Assignment (`=`)

```logts
MOTOR = START AND NOT STOP
ALARM = FALSE
READY = startDelay.Q
```

| Target | Allowed |
|--------|---------|
| **Output symbol** | ✓ |
| **VAR symbol** | ✓ |
| **Input symbol** | ✗ parse error |
| **CONST** | ✗ parse error |
| **`timer.Q`** | ✗ read-only |
| **`counter.Q` / `.CV`** | ✗ read-only |

---

## Control flow

### `IF` … `THEN` … `ELSE` … `ELSIF` … `END_IF`

```logts
IF START AND NOT STOP THEN
  MOTOR = TRUE
ELSIF STOP THEN
  MOTOR = FALSE
ELSE
  MOTOR = FALSE
END_IF
```

| Keyword | Role |
|---------|------|
| **`IF`** | Start conditional; condition is a **boolean** or **comparison** expression |
| **`THEN`** | Statements when condition is true |
| **`ELSIF`** | Else-if branch (repeatable) |
| **`ELSE`** | Optional final branch |
| **`END_IF`** | Close the block |

**Nesting:** `IF` may contain other `IF` / `CASE` blocks, `RETURN`, and timer/counter statements.

### `CASE` … `OF` … `END_CASE`

Selects the **first** matching label. Selector is any-width **symbol**, or counter **`name.CV`** (integer).

```logts
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
```

| Part | Rule |
|------|------|
| **Selector** | Input/output/VAR symbol (any width), or `counter.CV` |
| **Labels** | Integer literals (`0:`, `1:`, `2:` …) |
| **Match** | First label equal to selector value; no fall-through |
| **`ELSE`** | Optional default branch |
| **Body** | Full statement list (including timers/counters) |

### `RETURN`

Stops the rest of the program body for **this scan**. Outputs and VAR already written in this scan **keep** their values.

```logts
IF NOT ENABLE THEN
  RETURN
END_IF
MOTOR = START
```

| Rule | Detail |
|------|--------|
| Form | `RETURN` alone (no expression) |
| Effect | Remaining statements (including FB calls) do **not** run |
| Contrast | Does not reset outputs — only skips later logic |

### Loops — `FOR` / `WHILE` / `REPEAT` / `EXIT`

Loops run **to completion inside a single scan** (then the scan continues after the loop). A hard limit of **65535** iterations per loop raises a runtime error if exceeded.

#### `FOR` … `TO` … `BY` … `DO` … `END_FOR`

Control variable must be declared in **`VAR`**. Bounds are **numeric expressions** (literals, symbols, `counter.CV`, arithmetic). **`BY`** is optional (default **1**).

```logts
VAR
  i: 1
END_VAR
FOR i := 0 TO 1 DO
  IF i THEN HIT = 1 END_IF
END_FOR
```

| Rule | Detail |
|------|--------|
| Direction | `step > 0`: `start` … `end` ascending; `step < 0`: descending; `step = 0` → parse error |
| Empty range | e.g. `1 TO 0` with `BY 1` → **zero** iterations |
| After loop | Control VAR holds the last assigned index |

#### `WHILE` … `DO` … `END_WHILE`

Condition is a **boolean** or **comparison** expression. May run **zero** times if already false.

```logts
WHILE RUN DO
  MOTOR = 1
  EXIT
END_WHILE
```

#### `REPEAT` … `UNTIL` … `END_REPEAT`

Body runs **at least once**; then `UNTIL` is tested (exit when condition is **true**).

```logts
REPEAT
  MOTOR = 1
UNTIL STOP
END_REPEAT
```

#### `EXIT`

Leaves the **innermost** `FOR` / `WHILE` / `REPEAT`. Outside a loop → **parse error**.

| Keyword | Scope |
|---------|-------|
| **`EXIT`** | Innermost loop only |
| **`RETURN`** | Entire remaining program body for this scan |

Timers and counters may appear **inside** loop bodies; if the loop iterates *N* times in one scan, the FB is executed *N* times in that scan.

This page documents only the statements and keywords currently available.

---

## Boolean expressions

### Literals

| Literal | Value |
|---------|-------|
| `TRUE`, `1` | logic 1 |
| `FALSE`, `0` | logic 0 |

### Operators

| Operator | Arity | Meaning |
|----------|-------|---------|
| **`NOT`** | unary | inversion |
| **`AND`** | binary | conjunction |
| **`OR`** | binary | disjunction |
| **`XOR`** | binary | exclusive or |
| **`( … )`** | grouping | override precedence |

**Precedence** (highest first): `NOT` → `AND` → `OR` → `XOR`

```logts
IF START AND NOT STOP OR E_STOP THEN   ; = START AND (NOT STOP) OR E_STOP
```

All operands in pure boolean sub-expressions (`AND` / `OR` / `NOT` / `XOR`) must be **1-bit** (symbols width 1, literals `0`/`1`, or `.Q` members). **Comparisons** (`TEMP > 50`, `cnt.CV >= 3`) produce a boolean result and may mix with `AND` / `OR`.

---

## Multi-bit values, comparisons, and arithmetic

Symbols declared with width **> 1** hold **unsigned integers** in the range **0 … 2^N − 1**. Values are stored as binary strings on wires and components; the program treats them as integers.

### Comparisons

| Operator | Meaning |
|----------|---------|
| `>`, `<`, `>=`, `<=`, `==`, `!=` | Compare two numeric expressions |

Operands: symbol (any width), integer literal, `CONST`, `counter.CV`, or arithmetic sub-expression.

```logts
IF TEMP > 50 THEN HEATER = 1 END_IF
IF TEMP > SETPOINT - 5 THEN HEATER = 0 END_IF
WHILE LEVEL < MAX DO ... END_WHILE
```

### Arithmetic

| Operator | Precedence | Meaning |
|----------|------------|---------|
| `*` `/` `MOD` | higher | multiply, integer divide, remainder |
| `+` `-` | lower | add, subtract |
| `( … )` | highest | grouping |

```logts
SPEED = TEMP
LEVEL = (TEMP * GAIN) / 10
REM = VALUE MOD 16
```

| Rule | Detail |
|------|--------|
| **Unsigned** | All values are unsigned integers |
| **Overflow** | Result truncated to target symbol width (wrap, like IEC unsigned) |
| **Divide / MOD by 0** | **Runtime error** |
| **Width mismatch** | Direct copy `OUT = IN` requires equal widths — else parse error |
| **Boolean ops** | `AND` / `OR` / `NOT` / `XOR` only on 1-bit operands — not on multi-bit symbols directly |

### Multi-bit `CASE`

```logts
CASE MODE OF
  0:
    OUT_A = 1
  50:
    OUT_B = 1
  ELSE
    OUT_A = 0
END_CASE
```

Selector may be any-width symbol or `counter.CV`. Labels are integer literals.

---

## One scan — execution model

A **scan** is one sequential pass through the program body:

```text
read inputs → execute statements in order → write outputs
```

| Topic | Behaviour |
|-------|-----------|
| **Statement order** | Matters — later assigns to the same output/VAR win |
| **Timers / counters** | Execute in place; outputs (`.Q`) visible to following statements in the **same** scan |
| **VAR** | Persists between scans; resets to `0` on re-RUN |
| **State (FB)** | Timer/counter internal state persists on `comp [plc]` between scans |
| **Re-RUN** | Default (`retain: 0` on `comp [plc]`): timer/counter state resets. With `retain: 1`, FB state survives re-RUN in the same session — see [plc.md](plc.md). VAR always resets. |
| **RETURN** | Ends the remaining body of this scan |

Triggering scans: `.ctrl:{ set = 1 }`, `scanTime`, external clock — [plc.md — Scan timing](plc.md#scan-timing-p4).

---

## Timers — `TON` / `TOF`

Function-block style **statements** (not mappable I/O). Each instance has a **name** and persistent state per `comp [plc]`.

### `TON` — on-delay

```logts
TON startDelay(IN := START, PT := 50)
```

| Parameter | Type | Meaning |
|-----------|------|---------|
| **`IN`** | 1-bit expr | While `1`, timer counts toward preset |
| **`PT`** | integer ≥ 1 | Preset in **scan cycles** (not ms) |

**Behaviour (per scan, IEC-style)**

1. If `IN = 0` → internal count resets, **`Q = 0`**
2. If `IN = 1` → count increases by one per scan
3. **`Q = 1`** when count ≥ `PT`

**Reading:** `startDelay.Q` in expressions (read-only).

**Real time:** with `scanTime: N` ms on `comp [plc]`, delay ≈ **`PT × N` ms**. With `scanTime: 0`, each manual `set` is one scan.

### `TOF` — off-delay

```logts
TOF coolOff(IN := RUN, PT := 30)
```

| Parameter | Meaning |
|-----------|---------|
| **`IN`** | While `1`, **`Q = 1`** and count held at 0 |
| **`PT`** | After `IN` goes `0`, **`Q` stays 1** for `PT` scans, then **`Q = 0`** |

**Behaviour**

1. `IN = 1` → `Q = 1`, count reset
2. `IN = 0` and `Q` was `1` → count up each scan; when count ≥ `PT`, `Q = 0`
3. `IN = 0` and `Q` was already `0` → stays off

### Timer placement

| Location | Allowed |
|----------|---------|
| Top-level in program body | ✓ |
| Inside `IF` / `THEN` / `ELSE` / `ELSIF` | ✓ |
| Inside `CASE` branches | ✓ |
| Inside `FOR` / `WHILE` / `REPEAT` bodies | ✓ |
| As an expression (`IF TON(...)` / similar) | ✗ — use `name.Q` |

### Timer errors

| Case | Result |
|------|--------|
| `PT < 1` | parse error |
| Duplicate timer name | parse error |
| Timer name = I/O symbol | parse error |
| Unknown `foo.Q` | parse error |
| `timer.Q = 1` | parse error |

**Not exposed in v1:** `ET` (elapsed time), explicit reset pin on timers.

### Runnable — minimal TON

```logts-play
inline [plc] .demo:
  inputs: { START }
  outputs: { OUT }
  TON t(IN := START, PT := 2)
  OUT = t.Q
  :

; parse-only — use with comp [plc] for scans (see plc.md example 17)
doc(.demo)
```

---

## Counters — `CTU` / `CTD`

Function-block style **statements**, similar to timers. Each instance has a **name** and persistent state per `comp [plc]`.

### `CTU` — count up

```logts
CTU pieceCount(CU := SENSOR, R := RESET, PV := 10)
```

| Parameter | Type | Meaning |
|-----------|------|---------|
| **`CU`** | 1-bit expr | Count input — **rising edge** (0→1) increments `CV` |
| **`R`** | 1-bit expr | Reset — when `1`, `CV := 0`, `Q := 0` (**priority over `CU`** in same scan) |
| **`PV`** | integer ≥ 1 | Preset value |
| **`pieceCount.Q`** | 1-bit | `1` when **`CV >= PV`**; `0` otherwise |
| **`pieceCount.CV`** | integer | Current count (read via `.CV >= N` comparisons) |

**Behaviour (per scan, IEC-style)**

1. If `R = 1` → `CV := 0`, `Q := 0` (reset wins, CU ignored)
2. Else if **rising edge** on `CU` (was `0` in previous scan, now `1`) → `CV += 1`
3. Holding `CU = 1` across multiple scans counts as **only one** edge
4. `Q = 1` when `CV >= PV`; `Q` stays `1` even if `CU` goes low (until `R = 1`)

**Reading counter values:**
- `pieceCount.Q` — output bit, usable in `IF` and assign
- `pieceCount.CV >= N` — comparison in `IF` condition (see [.CV comparisons](#comparisons-on-cv))

**Example — count 5 sensor pulses then activate alarm:**

```logts
CTU pieceCount(CU := SENSOR, R := RESET, PV := 5)
FULL = pieceCount.Q
IF pieceCount.CV >= 3 THEN
  WARN = 1
ELSE
  WARN = 0
END_IF
```

### `CTD` — count down

```logts
CTD stepsLeft(CD := TICK, LD := LOAD, PV := 5)
```

| Parameter | Type | Meaning |
|-----------|------|---------|
| **`CD`** | 1-bit expr | Count-down input — **rising edge** decrements `CV` when `CV > 0` |
| **`LD`** | 1-bit expr | Load — when `1`, `CV := PV` (**priority over `CD`** in same scan) |
| **`PV`** | integer ≥ 1 | Preset (loaded into `CV` on `LD = 1`) |
| **`stepsLeft.Q`** | 1-bit | `1` when **`CV <= 0`**; `0` otherwise |
| **`stepsLeft.CV`** | integer | Current count |

**Behaviour (per scan, IEC-style)**

1. If `LD = 1` → `CV := PV` (load wins, CD ignored)
2. Else if **rising edge** on `CD` (0→1) and `CV > 0` → `CV -= 1`
3. `CV` never goes below `0`
4. `Q = 1` when `CV <= 0`

**Example — countdown to zero, then signal done:**

```logts
CTD stepsLeft(CD := TICK, LD := RELOAD, PV := 10)
DONE = stepsLeft.Q
IF stepsLeft.CV <= 3 THEN
  WARN = 1
END_IF
```

### Comparisons on `.CV`

Inside `IF` conditions, counter current values can be compared against integer literals:

```logts
IF pieceCount.CV >= 5 THEN  WARN = 1  ELSE  WARN = 0  END_IF
IF stepsLeft.CV <= 2 THEN   ALARM = 1  END_IF
IF pieceCount.CV == 10 THEN FULL = 1  END_IF
```

| Operator | Meaning |
|----------|---------|
| `>=` | CV greater or equal |
| `<=` | CV less or equal |
| `>` | CV strictly greater |
| `<` | CV strictly less |
| `==` | CV equal |

Only **`name.CV op number`** is supported — literal on the right side.

### Counter placement

| Location | Allowed |
|----------|---------|
| Top-level in program body | ✓ |
| Inside `IF` / `THEN` / `ELSE` / `ELSIF` | ✓ |
| Inside `CASE` branches | ✓ |
| Inside `FOR` / `WHILE` / `REPEAT` bodies | ✓ |
| As an expression (`IF TON(...)` / similar) | ✗ — use `name.Q` |

### Counter errors

| Case | Result |
|------|--------|
| `PV < 1` | parse error |
| Duplicate counter name | parse error |
| Counter name = I/O symbol | parse error |
| Counter name = timer name | parse error |
| Unknown `foo.Q` | parse error |
| `.CV` used without comparison | parse error |
| `counter.Q = 1` | parse error |

### Runnable — CTU count-up example

```logts-play
inline [plc] .boxCounter:
  inputs: { SENSOR, RESET }
  outputs: { FULL, WARN }
  CTU cnt(CU := SENSOR, R := RESET, PV := 5)
  FULL = cnt.Q
  IF cnt.CV >= 3 THEN WARN = 1 ELSE WARN = 0 END_IF
  :

comp [switch] .sensor:
  = 0
  :

comp [switch] .reset:
  = 0
  :

comp [led] .fullLed:
  :
comp [led] .warnLed:
  :

comp [plc] .ctrl:
  program: .boxCounter
  inputs: { SENSOR = .sensor, RESET = .reset }
  outputs: { FULL = .fullLed, WARN = .warnLed }
  on: 1
  :

; 3 rising edges — WARN on (cv>=3), FULL off (cv<5)
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

show(.warnLed:get)
show(.fullLed:get)
show(.ctrl:scanCount)
```

### Runnable — CTD count-down example

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

; load preset first
.reload = 1
.ctrl:{ set = 1 }
.reload = 0

; 3 rising edges to count down
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

**Note:** CTD starts with `CV = 0` (not loaded). To start from `PV`, send `RELOAD = 1` for one scan first — or connect `RELOAD` to a momentary key.

---

## Member access (`.Q`, `.CV`)

| Form | Type | Use |
|------|------|-----|
| **`name.Q`** | 1-bit | `IF`, `AND`, assigns to outputs — timers & counters |
| **`name.CV`** | integer | comparisons with literals (`name.CV >= N`) — counters only |

Instance **`name`** must match a `TON`/`TOF`/`CTU`/`CTD` declaration in the same program.

---

## Statement placement summary

| Statement kind | Top-level | Inside `IF` | `CASE`/`FOR`/`WHILE` |
|----------------|-----------|-------------|----------------------|
| Assignment `=` | ✓ | ✓ | not supported |
| `IF` … `END_IF` | ✓ | ✓ (nested) | not supported |
| `TON` / `TOF` | ✓ | ✓ | not supported |
| `CTU` / `CTD` | ✓ | ✓ | not supported |

---

## Keyword reference

### Available keywords

| Keyword | Category | Summary |
|---------|----------|---------|
| **`inputs:`** | Declaration | Input symbol table `{ … }` |
| **`outputs:`** | Declaration | Output symbol table `{ … }` |
| **`IF`** | Control | Conditional |
| **`THEN`** | Control | True branch |
| **`ELSIF`** | Control | Else-if branch |
| **`ELSE`** | Control | False branch |
| **`END_IF`** | Control | End conditional |
| **`AND` `OR` `NOT` `XOR`** | Operator | Boolean |
| **`TRUE` `FALSE`** | Literal | Boolean |
| **`=`** | Assignment | Output assign |
| **`TON`** | Timer FB | On-delay; `IN`, `PT` |
| **`TOF`** | Timer FB | Off-delay; `IN`, `PT` |
| **`IN` `PT`** | Timer arg | Only inside `TON`/`TOF` argument lists |
| **`CTU`** | Counter FB | Count-up; `CU`, `R`, `PV` |
| **`CTD`** | Counter FB | Count-down; `CD`, `LD`, `PV` |
| **`CU` `CD`** | Counter arg | Pulse input (inside `CTU`/`CTD`) |
| **`PV`** | Counter arg | Preset value |
| **`R`** | Counter arg | Reset (inside `CTU`) |
| **`LD`** | Counter arg | Load preset (inside `CTD`) |
| **`>=` `<=` `>` `<` `==`** | Comparison | `.CV` comparisons only |

## Common errors

| Message (example) | Cause |
|---------------------|-------|
| `cannot assign to input START` | Wrote to an input symbol |
| `unknown symbol ALARM` | Name not in `inputs`/`outputs` |
| `expression requires 1-bit symbol, got TEMP (8 bits)` | Multi-bit symbol used directly in `AND`/`OR`/`NOT` (use comparison instead) |
| `duplicate timer 't'` | Two timers same name |
| `duplicate counter 'c'` | Two counters same name |
| `timer name 'MOTOR' conflicts with I/O` | Timer name collides with symbol |
| `counter name 'MOTOR' conflicts with I/O` | Counter name collides with symbol |
| `PT must be >= 1` | Invalid timer preset |
| `PV must be >= 1` | Invalid counter preset |
| `CTU requires CU` | Missing CU argument |
| `CTD requires CD` | Missing CD argument |
| `CTU requires R` | Missing R argument |
| `CTD requires LD` | Missing LD argument |
| `.CV cannot be used directly as 1-bit` | Used `name.CV` alone in bool expr |

Mapping errors (`not mapped`, width mismatch) happen at **`comp [plc]`** elaboration — [plc.md — Errors](plc.md#errors).

---

## `doc()` helpers

| Command | Output |
|---------|--------|
| `doc(inline.plc)` | Type template + keyword summary |
| `doc(inline)` | Lists all inline instances |
| `doc(.machine)` | Inputs, outputs, timers, parsed program |

---

## Runnable — START / STOP (language only)

Boolean logic without timers — pair with [plc.md example 1](plc.md) for full `comp [plc]` wiring.

```logts-play
inline [plc] .machine:
  inputs: { START, STOP }
  outputs: { MOTOR }
  IF START AND NOT STOP THEN
    MOTOR = TRUE
  ELSE
    MOTOR = FALSE
  END_IF
  :

doc(.machine)
```

---

## See also

- [plc.md](plc.md) — `comp [plc]`, scan cycle, `scanTime`, I/O matrix, `logts-play` integration examples
- [cpu.md](cpu.md) — parallel two-layer model (`inline [asm]` + `comp [cpu]`)
- [components.md](components.md) — `doc(comp.plc)`
- [conditional-assignment.md](conditional-assignment.md) — LogTscript `on:` outside PLC programs
