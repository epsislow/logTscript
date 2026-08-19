# Inline logic query — `.world:query({ })`

Run **ad-hoc Prolog goals** on an `inline [logic]` instance **directly from a LogTScript expression**, without `comp [logic]`. Same goal syntax as a `query name:` body in [inline-logic.md](inline-logic.md). Return shape follows the **LHS wire** (scalar / vector / matrix), using the same encoding as [comp-logic.md](comp-logic.md) redirects.

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Syntax** | `.module:query({ goals }, Var=wire, …)` |
| **Goals** | Prolog body in `{ }` — comma = AND, `\+`, `=:=`, etc. |
| **Inputs** | Optional `, X=wire` after the block |
| **`_`** | Anonymous slot — collected into vector/matrix bulk output |
| **Boolean** | `1wire` LHS + all vars bound → `1` / `0` |
| **Bulk** | `8wire[N]` / `32wire[R,C]` LHS + free vars → vector / matrix |

---

## Syntax

```logts
result = .world:query({ owns(john, X) }, X=car)

8wire[10] cars = .world:query({ owns(john, _) })
```

| Part | Meaning |
|------|---------|
| **`.world:query(...)`** | Single method **`query`** on `inline [logic]` `.world` |
| **`{ goals }`** | Prolog goals (same grammar as inline query body) |
| **`, Var=expr`** | Bind logic variables before solve (wire → atom/number/bool) |

**Not supported:** `.world:available(...)` per query name, or redirect selectors like `{ johnOwns:0 }` inside the block — only **goals**.

---

## Return value (LHS wire drives shape)

| Situation | LHS wire | Result |
|-----------|----------|--------|
| All Prolog vars bound (in goal or via `, Var=wire`) | `1wire` | **`1`** if satisfiable, **`0`** otherwise |
| One collected var (`_` or free name) | `8wire[N]` | Vector of solutions (discovery order, `\0` fill) |
| Two free vars | `32wire[R,C]` | Matrix — row = solution, column = variable |
| Existence with free vars | `1wire` | **`1`** / **`0`** (boolean — not first binding) |

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

### Vector — all cars john owns

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

8wire[4] cars = .world:query({ owns(john, _) })

show(cars; ascii)
```

Two solutions (`chevy`, `ford`); remaining slots filled with `\0`.

### Multi-goal + negation

```logts-play
inline [logic] .world:

    person(john)
    person(mary)
    banned(mary)

:

1wire ok = .world:query({ person(X), \+ banned(X) })

8wire[4] eligible = .world:query({ person(X), \+ banned(X) })

show(ok)
show(eligible; ascii)
```

`ok = 1` (at least one eligible person). Vector bulk returns `john` only.

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
| **Limits** | Engine defaults (256 depth / 64 solutions) | `maxDepth` / `maxSolutions` on comp |

For repeated solves driven by hardware-style wiring, prefer **comp [logic]**. For functional “run this goal now” in an assignment, use **`.world:query({ })`**.

---

## Related

- [inline-logic.md](inline-logic.md) — define facts, rules, named queries
- [comp-logic.md](comp-logic.md) — runtime component, redirects, pins
