# Inline logic query — `.world:query({ })`

Run **ad-hoc Prolog goals** on an `inline [logic]` instance **directly from a LogTScript expression**, without `comp [logic]`. Same goal syntax as a `query name:` body in [inline-logic.md](inline-logic.md). Return shape follows the **LHS wire** (scalar / vector / matrix), using the same encoding as [comp-logic.md](comp-logic.md) redirects.

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Syntax** | `.module:query({ goals }, Var=wire, maxDepth=\\N, maxSolutions=\\N)` |
| **Goals** | Prolog body in `{ }` — comma = AND, `\+`, `=:=`, etc. |
| **Inputs** | Optional `, X=wire` after the block |
| **Limits** | Optional `, maxDepth=\\N`, `, maxSolutions=\\N` (decimal literals; default **256** / **64**) |
| **`_`** | Anonymous slot — collected into vector/matrix bulk output |
| **Boolean** | `1wire` LHS + all vars bound → `1` / `0` |
| **Scalar (1st sol.)** | `8wire` / `40wire` / `80wire` LHS + one free var → **first solution** on that width (ASCII atom + `\0` pad) |
| **Bulk** | `8wire[N]` / `40wire[N]` / `32wire[R,C]` LHS + free vars → vector / matrix |

---

## Syntax

```logts
result = .world:query({ owns(john, X) }, X=car)

1wire ok = .world:query({ owns(john, X) }, X=car, maxDepth=\10, maxSolutions=\3)

8wire[10] cars = .world:query({ owns(john, _) })
```

| Part | Meaning |
|------|---------|
| **`.world:query(...)`** | Single method **`query`** on `inline [logic]` `.world` |
| **`{ goals }`** | Prolog goals (same grammar as inline query body) |
| **`, Var=expr`** | Bind logic variables before solve (wire → atom/number/bool) |
| **`, maxDepth=\\N`** | Optional — max goal steps (default **256**) |
| **`, maxSolutions=\\N`** | Optional — max solutions collected (default **64**) |

**No pout flags:** inline `query` does **not** expose `truncated` / `depthExceeded` — caps apply silently (extra solutions dropped, depth failure = unprovable / boolean `0`).

**Not supported:** `.world:available(...)` per query name, or redirect selectors like `{ johnOwns:0 }` inside the block — only **goals**.

---

## Return value (LHS wire drives shape)

| Situation | LHS wire | Result |
|-----------|----------|--------|
| All Prolog vars bound (in goal or via `, Var=wire`) | `1wire` | **`1`** if satisfiable, **`0`** otherwise |
| One free var — **first solution only** | `8wire`, `40wire`, `80wire`, … (no `[N]`) | First binding for that var, encoded on **full wire width** (atom → ASCII + `\0` pad) |
| One collected var (`_` or free name) — **all solutions** | `8wire[N]`, `40wire[N]`, … | Vector — one solution per slot (discovery order, `\0` fill on unused slots) |
| Two free vars | `32wire[R,C]` | Matrix — row = solution, column = variable |
| Existence with free vars | `1wire` | **`1`** / **`0`** (boolean — not first binding) |

**Wire width = cell width:** an atom such as `chevy` (5 letters) needs **`40wire`** (5×8 bits) for the full name. **`8wire`** holds only **one ASCII character** (the first letter). Same rule as [comp-logic.md](comp-logic.md) redirects.

Encoding matches comp redirects: **atoms → ASCII + padding**, **numbers → unsigned binary** on cell width (see [comp-logic.md](comp-logic.md) D12b).

### Input binding (`Var=wire`)

Wire width selects decode mode:

| Width | Decode |
|-------|--------|
| **1 bit** | Boolean / 0–1 |
| **≥ 8, multiple of 8** | Text → atom (stop at `\0`) |
| **Other** | Unsigned number |

---

## Examples

### Boolean — “does john own this car?”

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

40wire car = 01100011'01101000'01100101'01110110'01111001

1wire ok = .world:query({ owns(john, X) }, X=car)

show(ok)
```

`ok = 1` when `car` holds the atom `chevy`.

### Scalar — first solution (`40wire`, not `8wire[1]`)

Use a **plain scalar wire** (no `[N]`) when you want **one** answer, not a list:

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

40wire firstCar = .world:query({ owns(john, X) })

8wire firstChar = .world:query({ owns(john, X) })

show(firstCar; ascii)
show(firstChar; ascii)
```

| Wire | Value | Meaning |
|------|-------|---------|
| `40wire firstCar` | `chevy` | Full atom on 40 bits (5×8, `\0` padded) |
| `8wire firstChar` | `c` | Only **8 bits** — first character of the first solution |

Wider wires pad with `\0`:

```logts
80wire name = .world:query({ owns(john, X) })   # "chevy" + zero-fill to 80 bits
```

### Vector — all cars john owns (full names)

Use **`40wire[N]`** when each solution is a **symbol atom** (full name). **`8wire[N]`** stores **one character per slot**.

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

40wire[4] cars = .world:query({ owns(john, _) })

8wire[4] initials = .world:query({ owns(john, _) })

show(cars; ascii)
show(initials; ascii)
```

Two solutions (`chevy`, `ford`); remaining slots filled with `\0`.  
`initials` shows `c`, `f`, … — one letter per 8-bit cell.

### Vector — narrow cells (8 bits per slot)

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

8wire[4] cars = .world:query({ owns(john, _) })

show(cars; ascii)
```

Each slot is **8 bits** — first character of each atom (`c`, `f`), not the full name.

### Multi-goal + negation

```logts-play
inline [logic] .world:

    person(john)
    person(mary)
    banned(mary)

:

1wire ok = .world:query({ person(X), \+ banned(X) })

40wire[4] eligible = .world:query({ person(X), \+ banned(X) })

show(ok)
show(eligible; ascii)
```

`ok = 1` (at least one eligible person). Vector bulk returns `john` only (full name on 40-bit cells).

### Matrix — two free variables

```logts-play
inline [logic] .world:

    age(john, 25)
    age(mary, 30)
    age(joe, 22)

:

32wire[3, 2] table = .world:query({ age(X, Y) })

show(table)
```

Each row is one `age/2` solution; column 0 = person atom, column 1 = age.

---

## vs `comp [logic]`

| | **`.world:query({ })`** | **`comp [logic]`** |
|---|-------------------------|-------------------|
| **Use** | One-off expression / assign | Circuit trigger + redirects |
| **Trigger** | Runs when expression evaluates | `set` pin + `on:` |
| **Inputs** | `, Var=wire` on call | Program block + exec `pin = wire` |
| **Outputs** | Expression return / LHS wire | `query >= wire` redirects |
| **Limits** | Per-call `maxDepth` / `maxSolutions` (defaults 256 / 64); no `truncated`/`depthExceeded` pout | `maxDepth` / `maxSolutions` on comp + pout redirects |

For repeated solves driven by hardware-style wiring, prefer **comp [logic]**. For functional “run this goal now” in an assignment, use **`.world:query({ })`**.

---

## Related

- [inline-logic.md](inline-logic.md) — define facts, rules, named queries
- [comp-logic.md](comp-logic.md) — runtime component, redirects, pins
