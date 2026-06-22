# MODE ZSTATE — tristate wires and multi-driver buses

Part of **[script modes](modes.md)** (`MODE STRICT`, `MODE WIREWRITE`, `MODE ZSTATE`). This page is the full reference for **ZSTATE** only.

LogTScript’s default mode treats every wire as a single **binary** value (`0` or `1`). **`MODE ZSTATE`** adds **high-impedance (`Z`)** and **conflict (`X`)** states per bit, IEEE-1164-style logic gates, and a **multi-driver resolver** so several sources can drive the same bus in one propagation step.

Requires **wave** signal propagation (editor default). Legacy mode → error: `ZSTATE requires wave signal propagation`.

See also: [signal propagation](signal-propagation.md), [assignment operators](assignment-operators.md), [built-in functions](builtin-functions.md), [debug output](debug.md).

---

## Quick start

**Load & Run** — enable-gated databus (`bus = ZCONNECT(en, data)`):

```logts-play wave
MODE ZSTATE

8wire databus
8wire cpuData = 10101010
8wire ramData = 11001100
1wire cpuEn = 1
1wire ramEn = 0

databus = ZCONNECT(cpuEn, cpuData)
databus = ZCONNECT(ramEn, ramData)
show(databus)
```

Result: `10101010`. With both enables `0`, `databus` stays `ZZZZZZZZ` (no contribution). With both `1` and different data → conflicting bits become `X`.

**Statement sugar** (same semantics): `ZCONNECT(bus, en, data)` or `ZCONN(bus, en, data)` desugars to `bus = ZCONNECT(en, data)`.

---

## Running examples (Load / Load & Run)

Blocks use `logts-play wave` (orange **Wave** pill). Each shows **Load** and **Load & Run**:

| Button | Use |
|--------|-----|
| **Load** | Copy into editor; edit enables/data, then **RUN** |
| **Load & Run** | Run immediately; read **Output** and Variables panel |

ZSTATE examples need **wave** propagation — not Legacy.

---

## Activating ZSTATE

```logts
MODE ZSTATE
```

| Rule | Detail |
|------|--------|
| Opt-in | Scripts without `MODE ZSTATE` behave exactly as before |
| Wave only | Use the editor’s **wave** pill (orange) or tests with wave propagation |
| Combines with `MODE WIREWRITE` | Multiple assignments to the same wire in one step are **resolved**, not “last wins” |
| Combines with `MODE STRICT` | Width rules unchanged; ZSTATE only affects value alphabet and multi-driver |

---

## Wire values: `0`, `1`, `Z`, `X`

| Symbol | Meaning |
|--------|---------|
| `0`, `1` | Normal binary |
| `Z` | High-impedance — no active driver on that bit in the current step |
| `X` | Conflict — two or more drivers disagreed on that bit in the same step |

### Initial value

| Declaration | Result in ZSTATE |
|-------------|------------------|
| `8wire bus` (no `=`) | `ZZZZZZZZ` |
| `8wire bus = ?ZZZZZZZZ` | same (explicit literal) |
| `3wire t = ?X1X` | `X`, `1`, `X` (pedagogical seed; resolver overwrites on next multi-driver step) |

Literals with `Z` or `X` require prefix **`?`** when the token would start with `Z` or `X`. Digit-started literals can embed `Z`/`X` in the middle: `3wire m = 10Z`.

---

## Multi-driver resolution

Within one **wave** propagation step, contributions come from **`ZCONNECT` / `w1` / `w0` sugar**, **`ZRELEASE`**, and wire assignments `bus = expr` (multi-driver merge). Component redirects **`get>=` / `out>=` / `front>=` …** without `w1`/`w0` are **direct assigns** (STRICT-style), not bus contributions.

| Contributors (0/1 only) | Result |
|-------------------------|--------|
| none (only `Z` or absent) | `Z` |
| one value | that value |
| 2+ with same value | `0` or `1` |
| 2+ with different values | `X` |

Biții **`Z` într-o contribuție nu contează ca driver activ** — la merge, doar `0`/`1` concurează pe acel bit. The same applies to `Z` in **MUX** selected data when the result is assigned to a shared bus.

`X` is **not sticky**. On the next step, if only one driver remains, the bit becomes `0` or `1` again.

### `ZCONNECT(en, data)` — enable-gated drive

Expression used in wire assignment. Requires `MODE ZSTATE` + wave.

```logts
databus = ZCONNECT(cpuEn, cpuData)
databus = ZCONNECT(ramEn, ramData)
```

Statement sugar (equivalent):

```logts
ZCONNECT(databus, cpuEn, cpuData)
ZCONN(databus, ramEn, ramData)   // alias
```

| `en` | Effect |
|------|--------|
| strict `1` | Queue `data` as a bus contribution (`Z` bits in `data` do not drive) |
| `0`, `Z`, `X` | **No-op** — no contribution from this assignment |

`data` width must match the target bus. Multiple `bus = ZCONNECT(…)` on the same wire are re-evaluated on each wave commit (after enable wires update).

### Sugar: `data w1 en` / `data w0 en`

Assignment shorthand (tests **1575**–**1577**):

```logts
databus = cpuData w1 cpuEn    @ same as databus = ZCONNECT(cpuEn, cpuData)
bus = d w0 en                 @ drive when en is strict 0 (not NOT(en))
```

| Suffix | Drive when |
|--------|------------|
| `w1 en` | `en` bit is strict `1` |
| `w0 en` | `en` bit is strict `0` |
| (neither) | normal assignment / merge |

On component redirects, append the same suffix after the target wire:

```logts
.sw:{ get >= bus w1 cpuEn
  set = 1 }
.sh:{ out>= bus w1 1
  set = 1 }
```

- **`set`** = when the property block runs (trigger only).
- **`w1` / `w0`** = whether this output contributes to a shared bus (ZCONN semantics).

Without `w1`/`w0`, `get>= bus` writes the wire directly (one driver), even in `MODE ZSTATE`.

**Load & Run** — dual enable conflict:

```logts-play wave
MODE ZSTATE

4wire bus
4wire a = 1010
4wire b = 0110
1wire enA = 1
1wire enB = 1

ZCONNECT(bus, enA, a)
ZCONNECT(bus, enB, b)
show(bus)
```

Result: `XX10`.

### Driving a shared bus (1-bit switches)

`comp [switch]` is **1 bit**. On a shared bus use **`get >= bus w1 enable`** — the enable gates whether this redirect contributes (ZCONNECT semantics).

With **`on: 1`**, property blocks run on **every** linked switch change (level-triggered). **`w1 1`** means “always contribute when the block runs”. If both switches use `w1 1`, **both blocks run on each toggle** — the OFF switch still drives `get = 0`, so a lone ON switch produces **`X`** on the bus (not a clean `10`). For an **interactive panel** demo, gate each driver with **its own switch**:

**Load & Run** — two switches on `2wire bus` (test **1580**):

```logts-play wave
MODE ZSTATE

2wire bus
comp [switch] .s1:
  on: 1
  :
comp [switch] .s2:
  on: 1
  :

.s1:{ get >= bus w1 .s1
  set = 1 }
.s2:{ get >= bus w1 .s2
  set = 1 }
```

| Panel state | `bus` |
|-------------|-------|
| both OFF | `ZZ` |
| `.s1` or `.s2` ON alone | `10` |
| both ON | `10` |

**Static multi-driver demo** (tests **1465** / **1466**) — **`w1 1`** with blocks executed **once** after setting switch states (not panel toggle). Both switches `1` → `bus = 10` (agree). `.s1 = 1`, `.s2 = 0` but **both blocks run** → `bus = X0` (one drives `1`, one drives `0`). This documents conflict resolution, not interactive panel behaviour.

```logts
.s1:{ get >= bus w1 1
  set = 1 }
.s2:{ get >= bus w1 1
  set = 1 }
```

### `set` vs bus enable

`set` controls **when the property block runs**, not bus drive. Use **`w1` / `w0`** on the redirect for enable-gated bus contribution:

```logts
.sw:{ get >= bus w1 en
  set = 1 }
```

When `en` goes `0→1`, registered `w1` redirects refresh on the next wave (test **1461**).

### Re-assignment in the same step

**Load & Run** — per-bit resolve (not last-wins):

```logts-play wave
MODE ZSTATE

4wire bus
4wire a = 1100
4wire b = 1010

bus = a
bus = b
show(bus)
```

Result: `1XX0` (per-bit resolve, not last-wins).

### `out>=` (shifter and similar)

Use **`out>= bus w1 en`** for shared-bus drive; without suffix, direct assign. See [shifter.md](shifter.md). Tests **1498**–**1503**.

---

## `ZRELEASE(wireName)` — withdraw all drivers

Statement (not an expression):

```logts
ZRELEASE(databus)
```

**Withdraws every driver** on `databus` for the current wave step. The resolved value becomes **`Z`** because no active driver remains — `ZRELEASE` does not “assign `ZZZ`” as a stored literal; it clears contributions so the resolver yields high-impedance.

Requires `MODE ZSTATE`. Names `z`, `Z`, `ZZZ`, etc. remain valid as wire identifiers.

---

## Logic gates with `Z` / `X`

In ZSTATE, `AND`, `OR`, `NOT`, `XOR`, … use **IEEE 1164** when operands contain `Z` or `X`:

| Gate | Rule (simplified) |
|------|-------------------|
| `AND` | any `0` → `0`; all `1` → `1`; else `X` |
| `OR` | any `1` → `1`; all `0` → `0`; else `X` |
| `NOT` | `0`↔`1`; `Z`→`X`; `X`→`X` |

No runtime error — you can probe conflicts through combinational logic.

Detail: [built-in logic gate functions](builtin-logic-gate-functions.md#z-and-x-in-mode-zstate).

---

## Where `Z` / `X` cause errors

Operations that require **pure binary** operands error on `Z` or `X` (depending on operation):

| Category | Examples | ZSTATE notes |
|----------|----------|--------------|
| Arithmetic | `ADD`, `SUBTRACT`, … | `Z` and `X` → error |
| Routing | `MUX`, `DEMUX` | **`MUX` selector** must be strict `0`/`1`. **Selected** data: error on `X` only; `Z` allowed. Unselected MUX inputs are not checked. **`DEMUX`**: strict binary |
| Sequential | `REG`, memory address | `Z` / `X` → error |
| Shifts | `LSHIFT`, … | `Z` / `X` → error |

Message pattern: `Cannot use wire with Z in ADD` or `Cannot use wire with X in MUX (selected data bit N)`.

**Always OK:** `show`, `peek`, `probe`, `watch`, `ZCONNECT`, `ZRELEASE`, logic gates (IEEE).

**Always OK:** `show`, `peek`, `probe`, `watch` — display `101X01ZZ` as-is.

---

## Display and timeline

| Output | ZSTATE behaviour |
|--------|------------------|
| `show` / Variables panel | Literal `Z` and `X` in strings |
| `probe` (shared bus) | Suffix ` — drove:` / ` — conflict:` on each commit — see [debug.md](debug.md#zlist-mode-zstate) |
| `Zlist` | Full driver inventory at **RUN** (`->` / `-> (active)` + `(resolved) =`) |
| `watch` | `Z` → grey level; `X` → red (conflict) |
| LEDs / 7-seg | `Z` and `X` treated as off |

See [debug.md](debug.md#z-and-x-values-mode-zstate).

---

## Comparison with default binary mode

| Topic | Default | `MODE ZSTATE` |
|-------|---------|---------------|
| Undeclared init (`8wire bus`) | `00000000` | `ZZZZZZZZ` |
| Two drivers same step | Last write wins (or error in STRICT) | Per-bit resolve → `X` on conflict |
| Shared bus teaching | Not modeled | `ZCONNECT` + `get>=` / `out>=` + merge |
| Tristate component | N/A | Engine-level, no `comp [bus]` needed |

Historical note: [future component ideas — B4](future-component-ideas.md#b4-tristate--bus-buffer) originally proposed a buffer component; the shipped design is **engine ZSTATE** instead.

---

## Related documentation

| Topic | Page |
|-------|------|
| Assignment + `MODE WIREWRITE` | [assignment-operators.md](assignment-operators.md#mode-zstate-and-wirewrite) |
| Wave commit phase | [signal-propagation.md](signal-propagation.md#mode-zstate-multi-driver-commit) |
| Built-in `ZRELEASE()` / `ZCONNECT()` | [builtin-functions.md](builtin-functions.md) |
| Switch `get>=` | [switch.md](switch.md) |
| Shifter `out>=` | [shifter.md](shifter.md) |
