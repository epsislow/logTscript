# Logic built-ins

Reserved **built-in predicates** in the logic engine — evaluated directly by `comp [logic]` and **`.world:query({ … })`**, not by user clauses.

Related: [inline-logic.md](inline-logic.md) (syntax) · [comp-logic.md](comp-logic.md) (wiring) · [logic-indexing.md](logic-indexing.md) (`indexFacts`, `count/2` in constraints)

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run**.

---

## Quick reference

| Builtin | Arity | Reserved head | Side effects | Summary |
|---------|-------|---------------|--------------|---------|
| **`show/N`** | 1–32 | yes | yes (output buffer) | Print logic terms |
| **`count/2`** | 2 | no¹ | no | Number of solutions to a goal |
| **`nth0/3`** | 3 | yes | no | List element at **0-based** index |
| **`nth1/3`** | 3 | yes | no | List element at **1-based** index |
| **`is/2`** | 2 | yes | no | Integer arithmetic (+ infix **`M is Expr`**) |
| **`member/2`** | 2 | yes | no | List membership with backtracking |
| **`append/3`** | 3 | yes | no | Concatenate or decompose lists |
| **`length/2`** | 2 | yes | no | List length; generative when **`N`** is ground |
| **`reverse/2`** | 2 | yes | no | Reverse list order (bidirectional) |
| **`sort/2`** | 2 | yes | no | Sort ground list by standard term order |

¹ Only **`count/2`** is intercepted — other arities named `count` remain user predicates.

**Scope:** all builtins work in rule bodies, named queries, constraint bodies, **`.world:query({ … })`**, and **`.world:check({ … })`**.

**Not in this table:** **`!`** (cut) and **`\+`** (negation) are goal operators — see [inline-logic.md](inline-logic.md).

---

## `show/N`

Print logic terms to the run **output buffer** (Prolog-style). Not the top-level script **`show(wire)`** statement.

| | **Logic `show/N`** | **Script `show(...)`** |
|--|-------------------|-------------------------|
| Where | Query / rule / constraint **bodies** | Top-level script, exec blocks |
| Arguments | Logic **terms** | Wires, expressions |
| Output | Prolog-style term text | Wire / vector formatting |

**Behaviour:**

- **`N`** from **1** to **32** — one output line per successful goal, terms space-separated.
- **`show()`** with zero arguments → **parse error**.
- Always **succeeds**; does not fail the surrounding query.
- On **backtracking**, prints again for each branch.
- Cannot be used as a fact, rule, or constraint **head**.

String literals print **without** surrounding quotes.

### Example — trace solutions

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

---

## `count/2`

**Syntax:** `count(Goal, N)` — goal first, count second.

| `N` in call | Behaviour |
|-------------|-----------|
| **Variable** | Bound to the solution count on the current KB |
| **Ground number** | Must equal the solution count (test) |

Works with the fact index when **`indexFacts: 1`** on the component — see [logic-indexing.md](logic-indexing.md) for indexing attributes.

### Example — capacity check

```logts-play
inline [logic] .warehouse:

    object(box1)
    object(box2)
    object(box3)
    container(c1)

    inside(box1, c1)
    inside(box2, c1)

    constraint atMostTwo <= count(inside(_, c1), 2)

    query ok:
        count(inside(_, c1), 2)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

1wire trigger = 1
1wire ok = 0

.whLogic:{
    ok >= ok
    set = trigger
}
```

**Load & Run:** **`ok = 1`** — exactly two `inside(_, c1)` facts.

---

## `nth0/3` and `nth1/3`

List indexing builtins. **Reserved** — cannot define **`nth0/3`** or **`nth1/3`** as clause heads.

| Builtin | Index base | Example |
|---------|------------|---------|
| **`nth0/3`** | **0-based** | `nth0(0, [a, b, c], X)` → `X = a` |
| **`nth1/3`** | **1-based** (SWI style) | `nth1(2, [a, b, c], X)` → `X = b` |

**Behaviour:**

- **`List`** must unify with a list; non-list → **fail**.
- **`I`** integer (ground or variable); other types → **fail**.
- Ground **`I`** out of range → **fail**.
- **`I`** unbound → backtracking over matching indices.

### Example — rent by house number

```logts-play
inline [logic] .rents:

    rents_list([2, 10, 30, 90, 160, 250])

    rent(N, C) <- nth1(N, rents_list([2, 10, 30, 90, 160, 250]), C)

    query house2:
        rent(2, C),
        show(C)

:

comp [logic] .rentsLogic:
    on: 1
    .rents { }
:

1wire trigger = 1

.rentsLogic:{
    query = house2
    set = trigger
}
```

**Load & Run** prints:

```text
10
```

---

## `is/2`

Integer arithmetic evaluation in logic bodies. Also written infix: **`M is Expr`**.

**Reserved:** **`is/2`** cannot be a fact, rule, or constraint head. **`is/1`**, **`is/3`**, atom **`is`**, etc. remain ordinary terms.

| Goal | When `N` is free in `N + 1` | Use |
|------|----------------------------|-----|
| `M = N + 1` | **`M`** ← structure `+(N, 1)` | Unification |
| `M is N + 1` | **Fail** | Arithmetic |
| `M =:= N + 1` | **Fail** | Numeric equality test |

RHS must fully evaluate to an integer. Free variables, divide-by-zero, or non-numeric RHS → **fail**. Integer **`/`** truncates toward zero.

See also [inline-logic.md — `=` vs `is/2`](inline-logic.md#arithmetic-is2) for the full contrast table.

### Example — counter

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

**Load & Run** prints **`done`**.

---

## `member/2`

**`member(X, List)`** — **`X`** is an element of **`List`**. Standard Prolog backtracking over list spines.

**Reserved head:** use another name (e.g. **`userMember/2`**) for user-defined membership rules.

| Call | Behaviour |
|------|-----------|
| `member(C, [a, b, c])` | **`C`** = `a`, then `b`, then `c` (backtracking) |
| `member(red, L)` | **`L`** must unify with a list containing **`red`** |
| Non-list second arg | **Fail** |

### Example — enumerate colors

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

**Load & Run** prints **`red`**, **`green`**, **`blue`** (one line each).

### Example — ad-hoc query

```logts-play
inline [logic] .world:

:

1wire run = 1
1wire ok = .world:query({ member(X, [red, green]), show(X) })
```

**Load & Run** prints **`red`** and **`green`**.

---

## `append/3`

**`append(L1, L2, L3)`** — **`L3`** is the concatenation of **`L1`** and **`L2`**. Full Prolog modes: concatenate, decompose, and backtracking splits.

| Call | Result |
|------|--------|
| `append([a, b], [c], L3)` | `L3 = [a, b, c]` |
| `append(L1, L2, [a, b, c])` | Decompose (multiple solutions) |
| `append([a], L2, [a, b])` | `L2 = [b]` |

### Example — build and split

```logts-play
inline [logic] .world:

    query build:
        append([a, b], [c, d], L),
        show(L)

    query split:
        append(L1, L2, [x, y, z]),
        show(L1, L2)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = build
    set = trigger
}
```

**Load & Run** prints **`[a, b, c, d]`**. Use **Load**, switch to **`query = split`**, **Load & Run** to see decompositions such as **`[] [x, y, z]`** and **`[x] [y, z]`**.

---

## `length/2`

**`length(List, N)`** — **`N`** is the number of elements in the cons spine of **`List`**.

| Call | Behaviour |
|------|-----------|
| `length([a, b, c], N)` | `N = 3` |
| `length([a, b], 3)` | **Fail** (length mismatch) |
| `length(L, 3)` | **`L = [_, _, _]`** (three anonymous variables) |
| `N < 0` | **Fail** |
| Open or partial list | **Fail** when counting |

### Example — generative length

```logts-play
inline [logic] .world:

    query q:
        length(L, 3),
        append(L, [tail], Long),
        show(Long)

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

**Load & Run** prints a four-element list ending with **`tail`**.

---

## `reverse/2`

**`reverse(List, Rev)`** — **`Rev`** is **`List`** with element order reversed.

| Call | Behaviour |
|------|-----------|
| `reverse([1, 2, 3], R)` | `R = [3, 2, 1]` |
| `reverse(L, [3, 2, 1])` | `L = [1, 2, 3]` |
| Both arguments variables | **Fail** |
| Non-list | **Fail** |

### Example — forward

```logts-play
inline [logic] .world:

    query q:
        reverse([1, 2, 3], R),
        show(R)

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

**Load & Run** prints **`[3, 2, 1]`**.

---

## `sort/2`

**`sort(List, Sorted)`** — **`Sorted`** is **`List`** sorted by standard term order **`@<`**. **Duplicates are kept.** Sort is **not stable**.

**`List`** must be a **ground** closed list. Variables inside elements or an open tail → **fail**.

### Term order `@<`

**Type rank (ascending):** `number` **<** `atom` **<** `list` **<** `compound`

| Comparison | Rule |
|------------|------|
| Two **numbers** | Numeric ascending |
| Two **atoms** | Lexicographic on name (string literals count as atoms) |
| Two **lists** | Element-by-element; if prefix equal, shorter list is smaller |
| Two **compounds** | Functor name, then arity, then arguments left-to-right |

### Example — numbers and atoms

```logts-play
inline [logic] .world:

    query nums:
        sort([3, 1, 2], S),
        show(S)

    query mixed:
        sort([1, a, 2], S),
        show(S)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = nums
    set = trigger
}
```

**Load & Run** prints **`[1, 2, 3]`**. Switch to **`query = mixed`** → **`[1, 2, a]`** (numbers before atoms).

### Example — pipeline

```logts-play
inline [logic] .world:

    query pipeline:
        append([c, a], [b], L),
        sort(L, S),
        show(S)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = pipeline
    set = trigger
}
```

**Load & Run** prints **`[a, b, c]`**.

---

## User-defined membership (`userMember/2`)

When you need custom membership logic, pick a **non-reserved** predicate name:

```logts-play
inline [logic] .world:

    userMember(X, [X | _]) <- X = X
    userMember(X, [_ | T]) <- userMember(X, T)

    query viaUser:
        userMember(C, [red, green]),
        show(C)

    query viaBuiltin:
        member(C, [red, green]),
        show(C)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = viaUser
    set = trigger
}
```

**Load & Run** prints **`red`** then **`green`**. Switch to **`viaBuiltin`** for the same behaviour using the built-in **`member/2`**.
