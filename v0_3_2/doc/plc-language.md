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
| **Interface** | Optional `inputs:` and `outputs:` blocks (order: inputs first, then outputs) |
| **Body** | Sequential **statements** — assignments, `IF`, timers, (future: counters) |
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
- Multi-bit inputs may be **declared** and **mapped**; boolean logic on them → error until [P+b](plc.md#future-phases) (analog)

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
| **Input symbol** | ✗ parse error |
| **`timer.Q`** | ✗ read-only |
| **`counter.Q` / `.CV`** | ✗ read-only (P5.2) |

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
| **`IF`** | Start conditional; condition is a **1-bit expression** |
| **`THEN`** | Statements when condition is true |
| **`ELSIF`** | Else-if branch (repeatable) |
| **`ELSE`** | Optional final branch |
| **`END_IF`** | Close the block |

**Nesting:** `IF` blocks may contain other `IF` blocks and timer statements.

**Not implemented yet:** `CASE`, `FOR`, `WHILE`, `RETURN` — planned in future phases (see [Future keywords](#future-keywords-planned)).

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

All operands in `IF` and boolean assigns must be **1-bit** (symbols declared width 1, literals, or `.Q` members).

---

## One scan — execution model

A **scan** is one sequential pass through the program body:

```text
read inputs → execute statements in order → write outputs
```

| Topic | Behaviour |
|-------|-----------|
| **Statement order** | Matters — later assigns to the same output win |
| **Timers / counters** | Execute in place; outputs (`.Q`) visible to following statements in the **same** scan |
| **State** | Timer/counter internal state persists on `comp [plc]` between scans |
| **Re-RUN** | New run resets timer state (RETAIN → future P5.2b) |

Triggering scans: `.ctrl:{ set = 1 }`, `scanTime`, external clock — [plc.md — Scan timing](plc.md#scan-timing-p4).

---

## Timers — `TON` / `TOF` (P5.1)

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

### Timer placement (P5.1)

| Location | Allowed |
|----------|---------|
| Top-level in program body | ✓ |
| Inside `IF` / `THEN` / `ELSE` / `ELSIF` | ✓ |
| Inside `CASE` / `FOR` / `WHILE` | future **P5.3** |

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

## Counters — `CTU` / `CTD` (P5.2 — planned)

> **Status:** specified in the implementation plan; not yet in the runtime. Documented here for a stable target syntax.

### `CTU` — count up

```logts
CTU pieceCount(CU := SENSOR, R := RESET, PV := 10)
```

| Parameter | Meaning |
|-----------|---------|
| **`CU`** | Count input — **rising edge** (0→1 between scans) increments `CV` |
| **`R`** | Reset — when `1`, `CV := 0`, `Q := 0` (priority over `CU` same scan) |
| **`PV`** | Preset (integer ≥ 1) |
| **`pieceCount.Q`** | `1` when **`CV >= PV`** |
| **`pieceCount.CV`** | Current count (integer, read-only) |

### `CTD` — count down

```logts
CTD stepsLeft(CD := TICK, LD := LOAD, PV := 5)
```

| Parameter | Meaning |
|-----------|---------|
| **`CD`** | **Rising edge** decrements `CV` when `CV > 0` |
| **`LD`** | Load — when `1`, `CV := PV` (priority over `CD` same scan) |
| **`PV`** | Preset |
| **`stepsLeft.Q`** | `1` when **`CV <= 0`** |
| **`stepsLeft.CV`** | Current count |

### Comparisons on `.CV` (P5.2)

Planned minimal extension for didactic use:

```logts
IF pieceCount.CV >= 5 THEN
  WARN = 1
END_IF
```

Comparisons **`>=` `<=` `==` `>` `<`** with an **integer literal** on `.CV` only — full analog comparisons remain **P+b**.

---

## Member access (`.Q`, `.CV`)

| Form | Type | Use |
|------|------|-----|
| **`name.Q`** | 1-bit | `IF`, `AND`, assigns to outputs |
| **`name.CV`** | integer | comparisons with literals (P5.2) |

Instance **`name`** must match a `TON`/`TOF`/`CTU`/`CTD` declaration in the same program.

---

## Statement placement summary

| Statement kind | Top-level | Inside `IF` | `CASE`/`FOR`/`WHILE` |
|----------------|-----------|-------------|----------------------|
| Assignment `=` | ✓ | ✓ | future |
| `IF` … `END_IF` | ✓ | ✓ (nested) | future |
| `TON` / `TOF` | ✓ | ✓ | P5.3 |
| `CTU` / `CTD` | ✓ (P5.2) | ✓ (P5.2) | P5.3 |

---

## Keyword reference

### Implemented (P1 + P5.1)

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

### Future keywords (planned)

| Keyword | Phase | Summary |
|---------|-------|---------|
| **`CTU` `CTD`** | P5.2 | Up/down counters |
| **`CU` `R` `CD` `LD` `PV`** | P5.2 | Counter arguments |
| **`VAR` `END_VAR`** | P+c | Internal memory |
| **`CONST` `END_CONST`** | P+c | Constants |
| **`CASE` `OF` `END_CASE`** | P+c | Selection |
| **`RETURN`** | P+c | Early exit from body |
| **`FOR` `TO` `BY` `DO` `END_FOR`** | P+d | Counted loop |
| **`WHILE` `END_WHILE`** | P+d | Conditional loop |
| **`>` `<` `>=` `<=` `==`** | P+b / P5.2 | General comparisons |

---

## Common errors

| Message (example) | Cause |
|---------------------|-------|
| `cannot assign to input START` | Wrote to an input symbol |
| `unknown symbol ALARM` | Name not in `inputs`/`outputs` |
| `IF requires 1-bit symbol, got TEMP (8 bits)` | Multi-bit symbol in boolean expr |
| `duplicate timer 't'` | Two timers same name |
| `timer name 'MOTOR' conflicts with I/O` | Timer name collides with symbol |
| `PT must be >= 1` | Invalid preset |
| `timer field must be Q` | Used `.ET` or unknown field |

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
