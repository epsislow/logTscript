# Script modes (`MODE`)

Top-level statements that change how **wire assignments** and **propagation** behave for the rest of the script (until another `MODE` line).

```logts
MODE STRICT
MODE WIREWRITE
MODE ZSTATE
```

See also: [assignment operators](assignment-operators.md), [signal propagation](signal-propagation.md).

---

## Quick reference

| Mode | How to activate | Wire re-assignment | Same wire, same step (binary) | Values |
|------|-----------------|--------------------|------------------------------|--------|
| **STRICT** (default) | start of script, or `MODE STRICT` | No — after first real `=` / `:=` / `=:` | Last write wins | `0` / `1` only |
| **WIREWRITE** | `MODE WIREWRITE` | Yes | Last write wins | `0` / `1` only |
| **ZSTATE** | `MODE ZSTATE` | Yes (enables WIREWRITE internally) | **Merged** per bit → `X` on conflict | `0` / `1` / `X` / `Z` |

---

## Syntax

```logts
MODE STRICT
MODE WIREWRITE
MODE ZSTATE
```

- One keyword per `MODE` statement.
- A later `MODE` replaces the active flags. `MODE STRICT` or `MODE WIREWRITE` turns **off** ZSTATE semantics (`zstate` flag cleared).
- `MODE ZSTATE` also sets wire-write behaviour (you do not need a separate `MODE WIREWRITE` line).

Place `MODE` lines near the top of the script, before wires that depend on the rules.

---

## `MODE STRICT` (default)

If you never write `MODE`, the interpreter starts in **STRICT**.

| Rule | Behaviour |
|------|-----------|
| First assignment | Allowed (`wire = …`, `:=`, `=:`) |
| `wire : literal` | Initial value only; first real assignment after `:` is still allowed |
| Re-assignment | **Error** — `Cannot reassign wire … in STRICT mode` |
| Width | Same as assignment operators (`=` exact width, etc.) — [assignment-operators.md](assignment-operators.md) |

```logts-play
3wire q = 101
show(q)
```

Re-assigning `q` without `MODE WIREWRITE` would error.

---

## `MODE WIREWRITE`

Allows **changing a wire again** after it already holds a value.

| Rule | Behaviour |
|------|-----------|
| Re-assignment | Allowed |
| Multiple writes, same propagation step | **Last write wins** (binary mode) |
| Propagation | Works in **legacy** and **wave** |

```logts-play
MODE WIREWRITE
4wire q : 1
q =: 11
show(q)
```

Result: `1100`

Detail on operators: [assignment-operators.md](assignment-operators.md#mode-wirewrite).

---

## `MODE ZSTATE`

Tristate / multi-driver mode: wires can be **`Z`** (high-impedance), **`X`** (conflict), logic gates use **IEEE 1164**, and several drivers on the same bus in one step are **resolved per bit** instead of last-wins.

| Requirement | Detail |
|-------------|--------|
| Propagation | **Wave only** — error in legacy mode |
| Undeclared init | `8wire bus` without `=` → `ZZZZZZZZ` |
| Explicit release | `ZRELEASE(wire)` statement |
| With WIREWRITE | Always on when ZSTATE is active |

```logts-play wave
MODE ZSTATE

2wire bus
2wire a = 10
2wire b = 11
bus = a
bus = b
show(bus)
```

Result: `1X` (conflict on bit 1), not `11`.

**Full documentation:** **[MODE ZSTATE — tristate wires and multi-driver buses](zstate.md)**

Topics covered there: `ZCONNECT`, `get>=` / `out>=`, `ZRELEASE`, logic literals `?X` / `?Z`, timeline colours, MUX with `Z`, errors on arithmetic with `X`/`Z`, and comparison with default binary mode.

---

## Choosing a mode

| Goal | Mode |
|------|------|
| Immutable wires (teaching, one-shot programs) | Default **STRICT** |
| Counters, registers, feedback without extra variables | **WIREWRITE** |
| Shared buses, tristate, multiple drivers, `Z`/`X` | **ZSTATE** (+ wave) |

---

## Related

| Topic | Page |
|-------|------|
| Tristate & multi-driver (ZSTATE) | [zstate.md](zstate.md) |
| `=`, `:=`, `=:` width rules | [assignment-operators.md](assignment-operators.md) |
| Wave vs legacy propagation | [signal-propagation.md](signal-propagation.md) |
| `ZRELEASE(wire)` | [builtin-functions.md](builtin-functions.md) |
| Editor propagation pill | [editorUI.md](editorUI.md) |
