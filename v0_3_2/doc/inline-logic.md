# Inline logic — `inline [logic]`

`inline [logic]` defines a **declarative knowledge base**: ground facts, rules with bodies, and named queries. It is **not executed** by itself — like `inline [asm]` (definition only), not like `inline [protocol]` (invoke recipe).

Runtime wiring lives in [`comp [logic]`](comp-logic.md).

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Role** | Definition layer — facts, rules, queries |
| **Execution** | None at inline level; queries run on `comp [logic]` |
| **Syntax style** | Prolog-like (variables, atoms, `<-` rules, backtracking) |
| **Composition** | `use .otherModule` merges facts and rules (not queries) |
| **Doc helpers** | `doc(inline.logic)`, `doc(.myModule)` |

---

## Architecture

```text
inline [logic] .character          comp [logic] .characterLogic
  facts / rules / queries    -->     program block + exec block
  (definition only)                  (runtime — see comp-logic.md)
```

---

## Prolog-friendly syntax

LogTScript logic follows common Prolog conventions:

| Construct | Example | Meaning |
|-----------|---------|---------|
| **Variable** | `X`, `Person`, `_` | Uppercase or `_` — unbound until unified |
| **Atom** | `john`, `chevy`, `might` | Lowercase identifier — constant symbol |
| **Number** | `15`, `-4` | Integer literal |
| **Fact** | `owns(john, chevy)` | Ground clause (no body) |
| **Rule** | `modifier2(X, 0) <- X >= 9, X =< 12` | Head `<-` body goals (comma = AND) |
| **Query** | `query johnOwns: owns(john, X)` | Named goal exported to runtime |

Multiple clauses with the same predicate name and arity are **OR** alternatives (first successful match in discovery order, with backtracking).

---

## Differences from Prolog

| Prolog | LogTScript logic |
|--------|------------------|
| `.` ends every clause | Newline / next clause; module ends with `:` |
| `:-` rule neck | `<-` rule neck |
| `true` / `fail` | Not built-in — use facts or empty query failure |
| Lists, strings, floats | **Not supported** — atoms + integers only |
| Quoted atoms `'John'` | **Not supported** — use lowercase atoms |
| Arbitrary arity / DCG / modules | Single inline namespace + `use` merge |
| Top-level consult | **`inline [logic]`** + **`comp [logic]`** split |

Operators in rule bodies:

| Operator | Role |
|----------|------|
| `=` | Bind / unify / arithmetic solve |
| `=:=` | Numeric equality test |
| `=\=` | Numeric inequality test |
| `>=`, `=<`, `>`, `<` | Numeric comparison |
| `+`, `-`, `*`, `/` | Integer arithmetic |

---

## Module shape

```logts
inline [logic] .people:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

    modifier2(1, -4)
    modifier2(X,  0) <- X >= 9,  X =< 12
    modifier2(X,  2) <- X >= 15, X =< 16

    query isJohnOwner:
        owns(john, _)

    query johnOwns:
        owns(john, X)

:
```

| Section | Description |
|---------|-------------|
| **Facts** | `predicate(args)` — no `<-` |
| **Rules** | `head <- goal1, goal2, …` |
| **Queries** | `query name:` then one compound goal |
| **End** | Solitary `:` on its own line (same as other inline kinds) |

---

## Queries and free variables

Each `query` may expose **at most one** free variable. That variable becomes the value (or values) redirected to wires on the component.

| Free vars | Redirect pattern (on comp) |
|-----------|----------------------------|
| **0** | `queryName >= wire` — `1` if any solution, else `0` |
| **1** | `queryName:0 >= wire`, `queryName:1 >= wire`, … — solution index |

---

## Composition — `use`

```logts
inline [logic] .vehicles:

    wheeled(car)

:

inline [logic] .world:

    use .vehicles

    query available:
        wheeled(X)

:
```

- **`use`** merges **facts and rules** from the referenced module.
- **Queries are never imported** — each inline defines its own query list.

---

## Example — parse and inspect

```logts-play
inline [logic] .character:

    modifier2(1, -4)
    modifier2(X,  0) <- X >= 9,  X =< 12
    modifier2(X,  2) <- X >= 15, X =< 16

    query modifier:
        modifier2(X, Y)

:

show(doc(.character))
```

---

## Related

- Runtime, pins, exec blocks → [comp-logic.md](comp-logic.md)
- Allow / NotAllow → [allow-notallow.md](allow-notallow.md) — `inline.type{logic}`
- Analogies: [asm.md](asm.md) (definition vs runtime), [plc.md](plc.md) (component scan)
