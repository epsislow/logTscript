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
| **Debug output** | Built-in **`show/N`** — see [logic-builtins.md](logic-builtins.md) |
| **List builtins** | **`member/2`**, **`append/3`**, **`length/2`**, **`reverse/2`**, **`sort/2`**, **`nth0/3`**, **`nth1/3`** — [logic-builtins.md](logic-builtins.md) |
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
| **List** | `[]`, `[a, b, c]`, `[H \| T]` | Prolog-style lists — empty, comma literals, or head \| tail |
| **Fact** | `owns(john, chevy)` | Ground clause (no body) |
| **Rule** | `modifier2(X, 0) <- X >= 9, X =< 12` | Head `<-` body goals (comma = AND) |
| **Negation** | `\+ age(peter, _)` | Negation as failure — goal cannot be proven |
| **Cut** | `!` | Commit — discard backtracking choices from the current clause |
| **Arithmetic eval** | `M is Expr`, `is(M, Expr)` | Built-in integer evaluation — [logic-builtins.md — `is/2`](logic-builtins.md#is2) |
| **Query** | `query johnOwns: owns(john, X)` | Named goal(s) exported to runtime |

Multiple clauses with the same predicate name and arity are **OR** alternatives (first successful match in discovery order, with backtracking).

---

## Differences from Prolog

| Prolog | LogTScript logic |
|--------|------------------|
| `.` ends every clause | Newline / next clause; module ends with `:` |
| `:-` rule neck | `<-` rule neck |
| `\+ Goal` | `\+ Goal` — negation as failure (same idea as Prolog) |
| `!` | Cut — commit current clause (same idea as Prolog) |
| `is` | Arithmetic evaluate-and-bind — **`Left is Right`** or **`is(Left, Right)`** (built-in) |
| `true` / `fail` | Not built-in — use facts, `\+`, or empty query failure |
| Floats | **Not supported** — atoms, integers, lists, string literals |
| Quoted atoms `'John'` | Use **`"John"`** string literals (show labels) or lowercase atoms |
| Arbitrary arity / DCG / modules | Single inline namespace + `use` merge |
| Top-level consult | **`inline [logic]`** + **`comp [logic]`** split |
| Depth / solution limits | Configurable on **`comp [logic]`** — see [comp-logic.md](comp-logic.md) |

Operators in rule bodies:

| Operator | Role |
|----------|------|
| `=` | Bind / unify / structural terms |
| **`is`** | Evaluate integer expression — **`Left is Right`** or **`is(Left, Right)`** (see [Arithmetic `is/2`](#arithmetic-is2)) |
| `=:=` | Numeric equality test |
| `=\=` | Numeric inequality test |
| `>=`, `=<`, `>`, `<` | Numeric comparison |
| `+`, `-`, `*`, `/` | Integer arithmetic |

---

## Prolog lists

Lists use the usual Prolog syntax inside logic terms (facts, rules, queries, **`.world:query({ … })`**, and mutation heads):

| Form | Example | Meaning |
|------|---------|---------|
| Empty | `[]` | Nil list |
| Literal | `[red, green, blue]` | Ground list (internally a cons chain) |
| Head \| tail | `[H \| T]` | Cons cell — `H` is one element, `T` is the rest |
| Mixed | `[A, B \| Rest]` | Two or more heads, then tail |

**Unification** follows Prolog rules with an **occurs-check** ( cyclic terms such as `X = [X | _]` fail ). A bare list term cannot stand alone as a goal — bind it with `=` or pass it to a predicate.

List literals accept at most **1024** comma-separated elements. Built-in list predicates (**`member/2`**, **`append/3`**, **`length/2`**, **`reverse/2`**, **`sort/2`**, **`nth0/3`**, **`nth1/3`**) are documented in [logic-builtins.md](logic-builtins.md).

**`show/N`** prints ground lists as `[a, b, c]` and partial lists as `[a, b|Rest]` when the tail is still a variable.

### Example — unify a list pattern

```logts-play
inline [logic] .world:

    query q:
        [A, B] = [red, green],
        show(A, B)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = q
    set = trigger
}
```

**Load & Run** prints:

```text
red green
```

For queries with more than two output variables, use **`.world:query({ … })`** (see [logic-query-exec.md](logic-query-exec.md)).

### Example — built-in `member/2`

```logts-play
inline [logic] .world:

    colors([red, green, blue])

    query allColors:
        colors(L),
        member(C, L),
        show(C)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = allColors
    set = trigger
}
```

**Load & Run** prints one line per color (`red`, `green`, `blue`). Full **`member/2`** reference: [logic-builtins.md](logic-builtins.md#member2).

### Example — list inside a compound fact

```logts-play
inline [logic] .mono:

    proprietati([prop(mediterranean, rents(2, 10, 30, 90, 160, 250), 50, 50)])

    query firstProp:
        proprietati([prop(N, _, _, _) | _]),
        show(N)

:

comp [logic] .monoLogic:
    on: 1
    .mono { }
:

1wire trigger = 1

.monoLogic:{
    query = firstProp
    set = trigger
}
```

**Load & Run** prints:

```text
mediterranean
```

---

## Built-in `nth0/3` and `nth1/3` (list indexing)

**`nth0/3`** (0-based) and **`nth1/3`** (1-based) are reserved list indexing builtins. Full syntax, behaviour, and examples: [logic-builtins.md — `nth0/3` · `nth1/3`](logic-builtins.md#nth03-and-nth13).

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

**Cut inside negation:** `!` is **not** allowed inside `\+ (…)` — elaboration error at parse time.

---

## Arithmetic `is/2`

The word **`is`** appears in three different places in LogTScript. Only **logic body goals** use the built-in arithmetic evaluator described here.

| Context | Example | Meaning |
|---------|---------|---------|
| **Logic body — infix (usual)** | `M is N + 1` | Built-in: evaluate **`N + 1`**, bind **`M`** |
| **Logic body — compound (same builtin)** | `is(M, N + 1)` | Same as **`M is N + 1`** |
| **Unification (not evaluation)** | `M = N + 1` | Unify — if **`N`** is free, **`M`** gets structure **`+(N, 1)`** |
| **Program block (component wiring)** | `scoreIn is number pin` | Pin type declaration inside **`.module { … }`** — different parser, not this builtin |
| **User predicate / atom (allowed)** | `flag(is).`, `is(1).` | Ordinary terms — **`is/1`**, **`is/3`**, etc. User **cannot** define **`is/2`** as a fact or rule head |

**`is/2`** is a **reserved built-in** — see [logic-builtins.md — `is/2`](logic-builtins.md#is2). You **cannot** write `is(X, Y) <- …` as your own clause. The **`=` vs `is/2`** contrast below stays here because unification and arithmetic often appear together in rules.

### `=` vs `is/2` vs `=:=`

| Goal | When `N` is free in `N + 1` | Typical use |
|------|----------------------------|-------------|
| `M = N + 1` | **`M`** ← structure `{+, N, 1}` | Unify terms, lists, structures |
| `M is N + 1` | **Fail** | Integer calculation, counters |
| `is(M, N + 1)` | **Fail** | Same builtin as **`M is N + 1`** |
| `M =:= N + 1` | **Fail** | Test numeric equality (both sides must evaluate) |
| `7 is 3 + 4` | — | **Success** (ground test) |
| `7 is 3 + 3` | — | **Fail** (7 ≠ 6) |

The right-hand side must **fully evaluate** to an integer before binding. If any variable in the expression is still free, division by zero occurs, or the expression is not numeric, the goal **fails** (Prolog-style, no exception).

**Left-hand side:** a variable is bound to the computed value; a ground number must match; **`_`** accepts any result.

Integer division **`/`** truncates toward zero (same as comparisons and **`=:=`**).

### Example — counter with `is` (Load & Run)

```logts-play
inline [logic] .world:

    tick(0)
    tick(N) <- M is N + 1, M =< 5, tick(M)

    query run:
        tick(3),
        show("done")

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = run
    set = trigger
}
```

**Load & Run** prints **`done`** because **`tick(3)`** succeeds via repeated **`M is N + 1`**.

### Example — compound `is/2` and `=` contrast (Load & Run)

```logts-play
inline [logic] .world:

    query calc:
        is(Total, 10 + 5),
        show("total", Total)

    query unify:
        M = N + 1,
        show("struct", M)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = calc
    set = trigger
}
```

**Load & Run** prints **`total 15`**. Run again with **`query = unify`** (use **Load**, change the query name, **Load & Run**) to see **`struct +(N, 1)`**-style output for **`M = N + 1`** when **`N`** is free — unification, not arithmetic.

---

## Cut — `!`

`!` is the Prolog **cut** operator. It always **succeeds** immediately. After it succeeds, the engine **commits** to the current path: it will not backtrack to alternative clauses of the predicate being executed, nor to choices made **before** `!` in that clause body.

Goals **before** `!` in the same rule body can still be backtracked when searching for solutions (until `!` is reached).

```logts
color(red)
color(green)
color(blue)

first_color(C) <- color(C), !
```

| Query | Solutions for `C` |
|-------|-------------------|
| `first_color(C)` without cut in a rule | `red`, `green`, `blue` (three solutions) |
| `first_color(C)` with `<- color(C), !` | **`red` only** |

In a query body, comma goals work the same way:

```logts
query pickFirst:
    color(C), !, show(C)
```

Only the **first** successful `color(C)` binding is kept; `show/1` prints once.

**Built-in side effects:** if `show/1` (or another side-effect goal) runs **before** `!`, that output is kept. Cut removes **future** branches, not output already written.

**Constraints:** `!` is **not** allowed in `constraint … <= …` bodies — parse error.

**Negation:** `!` is **not** allowed inside `\+ (…)` — parse error.

### Example — first color only (Load & Run)

```logts-play
inline [logic] .world:

    color(red)
    color(green)
    color(blue)

    first_color(C) <- color(C), !

    query firstOnly:
        first_color(C),
        show(C)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = firstOnly
    set = trigger
}
```

**Load & Run** prints **`red`** only (not green or blue).

### Example — cut after show keeps output (Load & Run)

```logts-play
inline [logic] .world:

    color(red)
    color(green)

    trace(C) <- color(C), show("pick", C), !, show("done", C)

    query run:
        trace(C)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = run
    set = trigger
}
```

**Load & Run** prints **`pick red`** and **`done red`** once. Without `!`, backtracking would also print lines for green.

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

**`show/N`** is a reserved logic predicate for printing terms during query execution — not script **`show(wire)`**. Full reference (semantics, limits, examples): [logic-builtins.md — `show/N`](logic-builtins.md#shown).

Also see **`count/2`** in [logic-builtins.md](logic-builtins.md#count2) and [logic-indexing.md](logic-indexing.md) (index attributes).

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
- **Built-in predicates** → [logic-builtins.md](logic-builtins.md)
- Static vs dynamic KB, `logic { + / - }`, tombstones → [logic-runtime.md](logic-runtime.md)
- Constraints `<=` vs rules `<-` → [logic-constraints.md](logic-constraints.md)
- Allow / NotAllow → [allow-notallow.md](allow-notallow.md) — `inline.type{logic}`
- Analogies: [asm.md](asm.md) (definition vs runtime), [plc.md](plc.md) (component scan)
