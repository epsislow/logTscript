# Inline logic — `inline [logic]`

`inline [logic]` defines a **declarative knowledge base**: ground facts, rules with bodies, and named queries. It is **not executed** by itself — like `inline [asm]` (definition only), not like `inline [protocol]` (invoke recipe).

Runtime wiring lives in [`comp [logic]`](comp-logic.md). For **ad-hoc goals in expressions** (no component), see [`logic-query-exec.md`](logic-query-exec.md) — **`.world:query({ goals }, Var=wire)`**.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Role** | Definition layer — facts, rules, queries |
| **Execution** | None at inline level; ad-hoc via [logic-query-exec.md](logic-query-exec.md); named queries and runtime fact overlay on [comp-logic.md](comp-logic.md) / [logic-runtime.md](logic-runtime.md) |
| **Syntax style** | Prolog-like (variables, atoms, `<-` rules, backtracking) |
| **Composition** | `use .otherModule` merges facts, rules, and constraints (not queries); `use once` skips revisits; **`use .mod as alias`** prefixes imported predicates |
| **Debug output** | Built-in **`show/N`** — print logic terms during query / rule / constraint execution |
| **Constraints** | `constraint Head <= Body` — see [logic-constraints.md](logic-constraints.md) |
| **Doc helpers** | `doc(inline.logic)` — syntax template; `doc(.myModule)` — **summary** (counts, query/constraint names, predicate histogram) |

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
| **String literal** | `"hello "`, `"line\n"` | Double-quoted text (for **`show/N`** labels); escapes `\"`, `\\` |
| **Fact** | `owns(john, chevy)` | Ground clause (no body) |
| **Rule** | `modifier2(X, 0) <- X >= 9, X =< 12` | Head `<-` body goals (comma = AND) |
| **Negation** | `\+ age(peter, _)` | Negation as failure — goal cannot be proven |
| **Query** | `query johnOwns: owns(john, X)` | Named goal(s) exported to runtime |

Multiple clauses with the same predicate name and arity are **OR** alternatives (first successful match in discovery order, with backtracking).

---

## Differences from Prolog

| Prolog | LogTScript logic |
|--------|------------------|
| `.` ends every clause | Newline / next clause; module ends with `:` |
| `:-` rule neck | `<-` rule neck |
| `\+ Goal` | `\+ Goal` — negation as failure (same idea as Prolog) |
| `true` / `fail` | Not built-in — use facts, `\+`, or empty query failure |
| Lists, floats | **Not supported** — atoms + integers + string literals |
| Quoted atoms `'John'` | Use **`"John"`** string literals (show labels) or lowercase atoms |
| Arbitrary arity / DCG / modules | Single inline namespace + `use` merge |
| Top-level consult | **`inline [logic]`** + **`comp [logic]`** split |
| Depth / solution limits | Configurable on **`comp [logic]`** — see [comp-logic.md](comp-logic.md) |

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
| **Queries** | `query name:` then one or more goals separated by `,` (AND) |
| **End** | Solitary `:` on its own line (same as other inline kinds) |

---

## Negation — `\+ goal`

`\+ Goal` means **negation as failure** (NAF), like Prolog: the negated goal **must not** be demonstrable with current facts and bindings.

```logts
age(john, 25)
age(mary, 30)

query johnHasNoAge:
    \+ age(john, _)

query peterHasNoAge:
    \+ age(peter, _)
```

| Query | Solutions | Meaning |
|-------|-----------|---------|
| `johnHasNoAge` | **none** | `age(john, _)` is provable → negation fails |
| `peterHasNoAge` | **one** (0 free vars) | no `age(peter, …)` fact → negation succeeds |

In rules, comma still means **AND**:

```logts
eligible(X) <- person(X), \+ banned(X)
```

`\+` applies only to the **next** goal (prefix). Use `\+ \+ goal` for double negation if needed.

**Not** classical logical negation — it is a procedural test: try to prove the goal; if the engine finds **any** solution, `\+` fails.

---

## Query comma — multiple goals (AND)

A `query` body may list several goals separated by `,`, same as a rule body. The engine finds bindings that satisfy **all** goals in order.

```logts
person(john)
person(mary)
person(peter)

age(john, 25)
age(mary, 30)

query personWithoutAge:
    person(X), \+ age(X, _)
```

**How to read it:** find `X` such that `person(X)` holds **and** `age(X, _)` **cannot** be proven.

| Step | Try `X` | `person(X)` | `\+ age(X, _)` | Result |
|------|---------|-------------|----------------|--------|
| 1 | john | ok | fails (john has age) | reject |
| 2 | mary | ok | fails | reject |
| 3 | peter | ok | succeeds | **solution** `X = peter` |

**Output is not two booleans.** The comma is not “return 11/01 per goal”. Only **free variables** (here `X`; `_` is anonymous) appear in solutions. On the component, redirects work as usual — see [comp-logic.md](comp-logic.md).

| Free vars in query | Redirect on comp |
|--------------------|------------------|
| **0** | `queryName >= wire` → `1` if ≥1 solution, else `0` |
| **1** | `queryName:0 >= wire` → value of first solution’s variable (e.g. ASCII atom) |

---

## Queries and free variables

Each `query` may expose **at most two** free variables (see matrix/vector redirects in [comp-logic.md](comp-logic.md)). Variables bound in earlier goals (including inside `\+`) are not “output columns” by themselves.

| Free vars | Redirect pattern (on comp) |
|-----------|----------------------------|
| **0** | `queryName >= wire` — `1` if any solution, else `0` |
| **1** | `queryName:0 >= wire`, `queryName:1 >= wire`, … — solution index |
| **2** | `query >= matrix`, `query:r >= vector`, … — see comp-logic |

---

## Example — negation and multi-goal query

```logts-play
inline [logic] .world:

    person(john)
    person(mary)
    person(peter)

    age(john, 25)
    age(mary, 30)

    query personWithoutAge:
        person(X), \+ age(X, _)

    query peterHasNoAge:
        \+ age(peter, _)

:

show(doc(.world))
```

Use **Load** to inspect the module summary via `doc(.world)`; **Load & Run** runs `show(doc(.world))` in the editor.

`doc(.name)` prints counts and names — not the full inline source. Example:

```text
.world (inline [logic])

  facts: 4
  rules: 0
  constraints: 0
  queries: 2
  uses: (none)

  queries:
    personWithoutAge
    peterHasNoAge

  predicates (facts):
    age/2 (2)
    person/1 (2)

  execution:
    definition only — no inline execution
    ...
```

---

## Engine limits (defaults)

Configured on **`comp [logic]`** (not inline). Defaults apply when omitted.

| Limit | Default | Effect when exceeded |
|-------|---------|----------------------|
| **`maxDepth`** | **256** | Goal fails silently (as unprovable); pout **`depthExceeded`** |
| **`maxSolutions`** | **64** | Extra solutions dropped; pout **`truncated`** |

Recursive rules are allowed (Prolog-style). Use **`maxDepth`** to bound runaway recursion — see [comp-logic.md](comp-logic.md) for **`depthExceeded >= wire`** examples with **Load & Run**.

---

## Composition — `use` and `use once`

Import knowledge from another `inline [logic]` module into the current module’s namespace.

```logts
inline [logic] .vehicles:

    wheeled(car)

:

inline [logic] .world:

    use .vehicles

    query hasCar:
        wheeled(car)

:
```

| Form | Behaviour |
|------|-----------|
| **`use .module`** | Merge that module’s facts, rules, and constraints. If the target was **already merged** in this resolution, elaboration stops with an error. |
| **`use once .module`** | Same merge on first visit; **skip silently** if the module is already merged or currently open (idempotent — like `#include_once`). |
| **`use .module as alias`** | Import with **prefix** — imported predicates become **`alias.predicate/…`** (arguments stay unprefixed). Unprefixed names from the import are **not** visible. |
| **`use once .module as alias`** | Prefixed import on first visit; **skip** on repeat (same module or duplicate `use once`). |

- **Queries are never imported** — each inline defines its own query list.
- **One alias per name** — duplicate `as alias` in the same module → elaboration error.
- **One import per module** — second `use once .veh as w` after `use once .veh as v` is skipped; only **`v.*`** exists.
- **Nested imports** stack prefixes: `.vehConstr` → `c.*` inside `.veh` → **`v.c.*`** inside `.world` when using `use .veh as v`.
- **Missing module** or non-`[logic]` target → error for both forms.
- **Strict reuse error** (single message, with chain):

```text
logic program line 5: Cannot reuse inline logic .vehicles
  via .worldDup → .vehicles
```

The line number points at the **`use`** line that failed.

### Example — compose and run (Load & Run)

```logts-play
inline [logic] .vehicles:

    wheeled(car)

:

inline [logic] .world:

    use .vehicles

    query hasCar:
        wheeled(car)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire carFlag = 0
1wire trigger = 1

.worldLogic:{
    hasCar >= carFlag
    set = trigger
}

show(carFlag)
```

After **Load & Run**, `carFlag` is `1` because `wheeled(car)` comes from `.vehicles`.

### Example — prefixed import `use … as` (Load & Run)

```logts-play
inline [logic] .vehicles:

    wheeled(car)

:

inline [logic] .world:

    use .vehicles as veh

    query hasCar:
        veh.wheeled(car)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire carFlag = 0
1wire trigger = 1

.worldLogic:{
    hasCar >= carFlag
    set = trigger
}

show(carFlag)
```

After **Load & Run**, `carFlag` is `1`. A query goal `wheeled(car)` (without `veh.`) would **not** see the imported fact.

### Example — nested prefix chain (Load & Run)

```logts-play
inline [logic] .vehConstr:

    wheel(w2)
    axle(a2)

    carWheel(X, Y) <- wheel(X), axle(Y)

:

inline [logic] .veh:

    use once .vehConstr as c

    car(toyota)

:

inline [logic] .world:

    use once .veh as v

    query wheelOk:
        v.c.carWheel(w2, a2)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire ok = 0
1wire trigger = 1

.worldLogic:{
    wheelOk >= ok
    set = trigger
}

show(ok)
```

After **Load & Run**, `ok` is `1`. Inside `.veh`, the same rule is called as `c.carWheel(w2, a2)`.

### Example — duplicate import with `use once` (Load)

```logts-play
inline [logic] .vehicles:

    wheeled(car)

:

inline [logic] .worldOnce:

    use once .vehicles
    use once .vehicles

    query hasCar:
        wheeled(car)

:

comp [logic] .worldOnceLogic:
    on: 1
    .worldOnce { }
:
```

The second `use once` is skipped; elaboration succeeds. The same script with two plain **`use .vehicles`** lines would fail with **`Cannot reuse inline logic .vehicles`**.

### Example — mutual import with `use once` (Load & Run)

```logts-play
inline [logic] .useA:

    use once .useB
    tag(a)

:

inline [logic] .useB:

    use once .useA
    tag(b)

:

comp [logic] .useALogic:
    on: 1
    .useA { }
:

1wire ok = 0
1wire trigger = 1

.useALogic:{
    ok = 1
    set = trigger
}

show(ok)
```

Both modules merge once each — no error. Plain **`use`** on both sides would fail at elaboration.

---

## Built-in `show/N` (logic debug output)

**`show(T1, T2, …)`** is a **reserved built-in predicate** in the logic engine — not the top-level LogTScript **`show(wire)`** statement. Same name, different rules:

| | **Logic `show/N`** | **Script `show(...)`** |
|--|-------------------|-------------------------|
| Where | Query / rule / constraint **bodies** | Top-level script, exec blocks |
| Arguments | Logic **terms** (atom, number, compound, var, `"string"`) | Wires, expressions, `; dec` / `; hex` tags |
| Output | Prolog-style term text → run **output buffer** | Wire / vector / decode formatting |

**Semantics:**

- **`N`** from **1** to **32** — one output line per successful goal, terms space-separated.
- **`show()`** with zero arguments → **parse error**.
- Always **succeeds** (side-effect goal); does not fail the surrounding query.
- On **backtracking**, prints again for each successful branch (Prolog-style).
- **`show/N`** cannot be defined as a fact, rule, or constraint head — reserved name.

Works in named queries on **`comp [logic]`**, and in ad-hoc **`.world:query({ show(...) })`** — output appears in the same buffer as script **`show`**.

String literals print **without** surrounding quotes.

**Spacing:** arguments are joined with a **single space**. A string literal that already ends with a space adds **another** space from the join — e.g. `show("found ", X)` prints `found  john` (two spaces). Prefer `show("found", X)` or put the space in the next literal: `show("found ", " ", X)` only if you need explicit control.

Also see built-in **`count/2`** in [logic-indexing.md](logic-indexing.md).

### Example — trace inside relations

```logts-play
inline [logic] .world:

    inside(john, johnsCar)
    inside(mary, marysBike)

    query trace:
        inside(P, Obj),
        show("inside:", inside(P, Obj))

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = trace
    set = trigger
}
```

**Load & Run** prints two lines (one per solution):

```text
inside: inside(john, johnsCar)
inside: inside(mary, marysBike)
```

### Example — ad-hoc query

```logts-play
inline [logic] .world:

    person(john)
    person(mary)

:

1wire run = 1
8wire[4] who = .world:query({ person(X), show("found", X) })
```

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
- Static vs dynamic KB, `logic { + / - }`, tombstones → [logic-runtime.md](logic-runtime.md)
- Constraints `<=` vs rules `<-` → [logic-constraints.md](logic-constraints.md)
- Allow / NotAllow → [allow-notallow.md](allow-notallow.md) — `inline.type{logic}`
- Analogies: [asm.md](asm.md) (definition vs runtime), [plc.md](plc.md) (component scan)
