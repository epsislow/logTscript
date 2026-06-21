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

Within one **wave** propagation step, every write to a wire (assignment, `ZCONNECT`, `get>=`, `out>=`, `ZRELEASE(wire)`, component redirect) becomes a **contribution**. At commit time the engine resolves **per bit**:

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

`comp [switch]` is **1 bit** — suitable for tiny demos with `get>=`, not for driving an `8wire` data value. Toggle switches in the panel after **Load & Run**.

**Load & Run** — two switches, one bit each on `2wire bus`:

```logts-play wave
MODE ZSTATE

2wire bus
comp [switch] .s1:
  on: 1
  :
comp [switch] .s2:
  on: 1
  :

.s1:{ get >= bus
  set = 1 }
.s2:{ get >= bus
  set = 1 }
```

Both switches on `1` → `bus = 10`. If `.s1` is `1` and `.s2` is `0` → `bus = X0`.

### Enable gating

When `set = 0` on a property block, that component **does not contribute** in the current step. If nobody else drives the wire → `Z`.

```logts
.sw:{ get >= bus
  set = en }   // en=0 → no drive
```

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

`out>= target` (or `out> target`) routes the component’s `:out` bit through the same resolver. See [shifter.md](shifter.md).

---

## `ZRELEASE(wireName)` — explicit release

Statement (not an expression):

```logts
ZRELEASE(databus)
```

Sets **every bit** of `databus` to `Z` for the current step (equivalent to releasing the bus). Requires `MODE ZSTATE`. Names `z`, `Z`, `ZZZ`, etc. remain valid as wire identifiers.

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
