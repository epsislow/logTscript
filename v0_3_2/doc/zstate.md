# MODE ZSTATE — tristate wires and multi-driver buses

Part of **[script modes](modes.md)** (`MODE STRICT`, `MODE WIREWRITE`, `MODE ZSTATE`). This page is the full reference for **ZSTATE** only.

LogTScript’s default mode treats every wire as a single **binary** value (`0` or `1`). **`MODE ZSTATE`** adds **high-impedance (`Z`)** and **conflict (`X`)** states per bit, IEEE-1164-style logic gates, and a **multi-driver resolver** so several sources can drive the same bus in one propagation step.

Requires **wave** signal propagation (editor default). Legacy mode → error: `ZSTATE requires wave signal propagation`.

See also: [signal propagation](signal-propagation.md), [assignment operators](assignment-operators.md), [built-in functions](builtin-functions.md), [debug output](debug.md).

---

## Quick start

```logts-play wave
MODE ZSTATE

8wire databus
8wire cpuData = 10101010
8wire ramData = 11001100
1wire cpuEn = 0
1wire ramEn = 0

comp [switch] .cpu:
  on: 1
  :
comp [switch] .ram:
  on: 1
  :

.cpu:{ get >= databus
  set = cpuEn }
.ram:{ get >= databus
  set = ramEn }

show(databus)
```

With both enables `0`, `databus` is `ZZZZZZZZ` (no driver). Enable one source to drive the bus; enable two with different values → conflicting bits become `X`.

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

Within one **wave** propagation step, every write to a wire (assignment, `get>=`, `out>=`, `ZRELEASE(wire)`, component redirect) becomes a **contribution**. At commit time the engine resolves **per bit**:

| Contributors (0/1 only) | Result |
|-------------------------|--------|
| none (only `Z` or absent) | `Z` |
| one value | that value |
| 2+ with same value | `0` or `1` |
| 2+ with different values | `X` |

`X` is **not sticky**. On the next step, if only one driver remains, the bit becomes `0` or `1` again.

### Driving a shared bus

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

Operations that require **pure binary** operands error if a wire bit is `Z` or `X`:

| Category | Examples |
|----------|----------|
| Arithmetic | `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE` |
| Routing | `MUX`, `DEMUX` |
| Sequential | `REG`, memory address |
| Shifts | `LSHIFT`, `RSHIFT`, `LROTATE`, `RROTATE` |

Message pattern: `Cannot use wire with Z in ADD` or `Cannot use wire with X in MUX`.

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
| Shared bus teaching | Not modeled | Native `get>=` / `out>=` + enable |
| Tristate component | N/A | Engine-level, no `comp [bus]` needed |

Historical note: [future component ideas — B4](future-component-ideas.md#b4-tristate--bus-buffer) originally proposed a buffer component; the shipped design is **engine ZSTATE** instead.

---

## Related documentation

| Topic | Page |
|-------|------|
| Assignment + `MODE WIREWRITE` | [assignment-operators.md](assignment-operators.md#mode-zstate-and-wirewrite) |
| Wave commit phase | [signal-propagation.md](signal-propagation.md#mode-zstate-multi-driver-commit) |
| Built-in `ZRELEASE()` | [builtin-functions.md](builtin-functions.md) |
| Switch `get>=` | [switch.md](switch.md) |
| Shifter `out>=` | [shifter.md](shifter.md) |
