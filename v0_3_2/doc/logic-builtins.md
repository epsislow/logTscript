# Logic built-ins

Reserved **built-in predicates** in the logic engine — evaluated directly by `comp [logic]` and **`.world:query({ … })`**, not by user clauses.

Related: [inline-logic.md](inline-logic.md) (syntax) · [comp-logic.md](comp-logic.md) (wiring) · [logic-value-types.md](logic-value-types.md) (value kinds, type predicates) · [logic-indexing.md](logic-indexing.md) (`indexFacts`, `count/2` in constraints)

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
| **`last/2`** | 2 | yes | no | Last element of a non-empty ground list |
| **`select/3`** | 3 | yes | no | Remove one occurrence; SWI backtracking |
| **`selectchk/3`** | 3 | yes | no | Like **`select/3`**, first match only |
| **`flatten/2`** | 2 | yes | no | Recursively flatten nested ground lists |
| **`same_length/2`** | 2 | yes | no | Equal list lengths; bind anonymous list |
| **`sort/2`** | 2 | yes | no | Sort ground list by standard term order |
| **`keysort/2`** | 2 | yes | no | Sort compound pairs by first argument (key) |
| **`msort/2`** | 2 | yes | no | Stable sort by standard term order |
| **`prefix/2`** | 2 | yes | no | List prefix with backtracking |
| **`suffix/2`** | 2 | yes | no | List suffix with backtracking |
| **`is_set/1`** | 1 | yes | no | True when list has no duplicate elements |
| **`list_to_set/2`** | 2 | yes | no | Remove duplicates; keep first occurrence order |
| **`union/3`** | 3 | yes | no | Ordered union without duplicates |
| **`intersection/3`** | 3 | yes | no | Common elements; order from first list |
| **`subtract/3`** | 3 | yes | no | First list minus elements in second list |
| **`numlist/3`** | 3 | yes | no | Consecutive integers from **From** through **To** inclusive |
| **`sum_list/2`** | 2 | yes | no | Sum of ground integer list (**`[]` → 0**) |
| **`max_list/2`** | 2 | yes | no | Maximum in non-empty ground integer list |
| **`min_list/2`** | 2 | yes | no | Minimum in non-empty ground integer list |
| **`sublist/3`** | 3 | yes | no | Contiguous subsequence; **Rest** is tail after match |
| **`permutation/2`** | 2 | yes | no | All permutations with backtracking |
| **`combinations/3`** | 3 | yes | no | **K**-element subsets; order from source list |
| **`call/1`** | 1 | yes | no | Meta-call — prove a compound goal term |
| **`include/3`** | 3 | yes | no | Keep list elements where template goal succeeds |
| **`exclude/3`** | 3 | yes | no | Keep list elements where template goal fails |
| **`partition/4`** | 4 | yes | no | Split list into pass / fail partitions |
| **`convlist/3`** | 3 | yes | no | Map template goal; collect outputs (drop failures) |
| **`maplist/2`** | 2 | yes | no | Prove template goal for every list element |
| **`maplist/3`** | 3 | yes | no | Map template goal across parallel lists |
| **`foldl/4`** | 4 | yes | no | Left fold with accumulator over one list |
| **`foldl/5`** | 5 | yes | no | Left fold with accumulator over two parallel lists |
| **`atom/1`** | 1 | yes | no | Type test — argument is an atom |
| **`number/1`** | 1 | yes | no | Type test — argument is an integer |
| **`list/1`** | 1 | yes | no | Type test — argument is a list |
| **`compound/1`** | 1 | yes | no | Type test — argument is a compound (not a list) |
| **`random_between/3`** | 3 | yes | yes (RNG) | Uniform random integer in `[Low, High]` inclusive |
| **`set_random/1`** | 1 | yes | yes (RNG) | Reseed the global integer RNG |

Type predicates filter bound terms — see [logic-value-types.md](logic-value-types.md).

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

    capacity(c1, 2)

    constraint inside(O, C) <=
        object(O),
        container(C),
        capacity(C, Max),
        count(inside(_, C), N),
        N =< Max

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

## `last/2`

**`last(List, Elem)`** — **`Elem`** is the last element of non-empty **`List`**.

| Call | Behaviour |
|------|-----------|
| `last([a, b, c], X)` | `X = c` |
| `last([], X)` | **Fail** |
| Non-list | **Fail** |
| Open or partial list | **Fail** |

**Reserved head:** you cannot define **`last/2`** as fact, rule, or constraint head.

### Example — last element

```logts-play
inline [logic] .world:

    query q:
        last([alpha, beta, gamma], X),
        show(X)

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

**Load & Run** prints **`gamma`**.

---

## `select/3`

**`select(Elem, List, Rest)`** — **`Rest`** is **`List`** with **one** occurrence of **`Elem`** removed. Standard SWI-style backtracking: duplicate elements yield multiple solutions.

| Call | Behaviour |
|------|-----------|
| `select(b, [a, b, c], R)` | `R = [a, c]` |
| `select(X, [a, b, a], R)` | Three solutions (`X` = each `a` in turn) |
| Non-list second arg | **Fail** |

**Reserved head:** you cannot define **`select/3`** as fact, rule, or constraint head.

### Example — draw from a deck

```logts-play
inline [logic] .deck:

    query draw:
        select(Card, [go, jail, chance], Rest),
        show("drew:", Card),
        show("rest:", Rest)

:

comp [logic] .deckLogic:
    on: 1
    .deck { }
:

1wire trigger = 1

.deckLogic:{
    query = draw
    set = trigger
}
```

**Load & Run** prints one drawn card and the remaining list (order preserved except for the removed card).

---

## `selectchk/3`

**`selectchk(Elem, List, Rest)`** — same as **`select/3`**, but **deterministic**: only the **first** matching occurrence is removed; no choice point for alternate positions.

| Call | Behaviour |
|------|-----------|
| `selectchk(b, [a, b, c, b], R)` | `R = [a, c, b]` (second **`b`** kept) |
| `selectchk(X, [a, b, a], R)` | One solution only |

**Reserved head:** you cannot define **`selectchk/3`** as fact, rule, or constraint head.

### Example — first match only

```logts-play
inline [logic] .world:

    query q:
        selectchk(b, [a, b, c, b], R),
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

**Load & Run** prints **`[a, c, b]`**.

---

## `flatten/2`

**`flatten(Nested, Flat)`** — **`Flat`** is **`Nested`** with all nested list structure removed recursively. Only **ground** closed lists are accepted; variables inside or open tails → **fail**.

| Call | Behaviour |
|------|-----------|
| `flatten([a, [b, c], d], F)` | `F = [a, b, c, d]` |
| `flatten([], F)` | `F = []` |
| Non-list or partial list | **Fail** |

**Reserved head:** you cannot define **`flatten/2`** as fact, rule, or constraint head.

### Example — nested zones

```logts-play
inline [logic] .map:

    zones([floor1, [roomA, roomB], floor2])

    query rooms:
        zones(Z),
        flatten(Z, Flat),
        member(R, Flat),
        show(R)

:

comp [logic] .mapLogic:
    on: 1
    .map { }
:

1wire trigger = 1

.mapLogic:{
    query = rooms
    set = trigger
}
```

**Load & Run** prints **`floor1`**, **`roomA`**, **`roomB`**, and **`floor2`** (one line each).

---

## `same_length/2`

**`same_length(List1, List2)`** — both lists have the same number of elements.

| Call | Behaviour |
|------|-----------|
| `same_length([a, b], [1, 2])` | Succeeds |
| `same_length([a, b], L)` | `L = [_, _]` (anonymous variables) |
| `same_length(L1, L2)` with both free | **Fail** |
| Non-list argument | **Fail** |
| Open or partial list | **Fail** when comparing lengths |

**Reserved head:** you cannot define **`same_length/2`** as fact, rule, or constraint head.

### Example — bind length

```logts-play
inline [logic] .world:

    query q:
        same_length([x, y, z], L),
        length(L, N),
        show(N)

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

**Load & Run** prints **`3`**.

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

## `keysort/2`

**`keysort(Pairs, Sorted)`** — sort a ground list of **compound pairs** by the **first argument** (the key). Use **`pair(Key, Value)`** (or any compound with at least one argument). **Duplicates are kept.**

| Call | Behaviour |
|------|-----------|
| `keysort([pair(b, 2), pair(a, 1)], S)` | `S = [pair(a, 1), pair(b, 2)]` |
| Non-compound element | **Fail** |
| Non-list or partial list | **Fail** |

**Reserved head:** you cannot define **`keysort/2`** as fact, rule, or constraint head.

### Example — rank by name

```logts-play
inline [logic] .scores:

    query ranked:
        keysort([pair(bob, 80), pair(ann, 95), pair(cal, 70)], Sorted),
        member(pair(Name, Score), Sorted),
        show(Name, Score)

:

comp [logic] .scoreLogic:
    on: 1
    .scores { }
:

1wire trigger = 1

.scoreLogic:{
    query = ranked
    set = trigger
}
```

**Load & Run** prints **`ann 95`**, then **`bob 80`**, then **`cal 70`** (sorted by name).

---

## `msort/2`

**`msort(List, Sorted)`** — like **`sort/2`**, but **stable**: equal elements keep their original relative order. **`List`** must be a **ground** closed list.

| Call | Behaviour |
|------|-----------|
| `msort([2, 1, 2, 1], S)` | `S = [1, 1, 2, 2]` (first `1` stays before second `1`) |
| Same constraints as **`sort/2`** | Ground closed list required |

**Reserved head:** you cannot define **`msort/2`** as fact, rule, or constraint head.

### Example — stable reorder

```logts-play
inline [logic] .world:

    query q:
        msort([2, 1, 2, 1], S),
        show(S)

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

**Load & Run** prints **`[1, 1, 2, 2]`**.

---

## `prefix/2`

**`prefix(Prefix, List)`** — **`Prefix`** is a leading sublist of **`List`**. Backtracks over all prefixes (including **`[]`**).

| Call | Behaviour |
|------|-----------|
| `prefix(P, [a, b, c])` | Four solutions: `[]`, `[a]`, `[a, b]`, `[a, b, c]` |
| `prefix([a, b], L)` | Binds **`L`** to a list starting with **`[a, b]`** |
| Non-list second arg | **Fail** |

**Reserved head:** you cannot define **`prefix/2`** as fact, rule, or constraint head.

### Example — enumerate prefixes

```logts-play
inline [logic] .world:

    query q:
        prefix(P, [go, stop, wait]),
        show(P)

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

**Load & Run** prints **`[]`**, **`[go]`**, **`[go, stop]`**, **`[go, stop, wait]`** (one line each).

---

## `suffix/2`

**`suffix(Suffix, List)`** — **`Suffix`** is a trailing sublist of **`List`**. Backtracks over all suffixes (including **`[]`**).

| Call | Behaviour |
|------|-----------|
| `suffix(S, [a, b, c])` | Four solutions: `[a, b, c]`, `[b, c]`, `[c]`, `[]` |
| Non-list second arg | **Fail** |

**Reserved head:** you cannot define **`suffix/2`** as fact, rule, or constraint head.

### Example — tail segments

```logts-play
inline [logic] .world:

    query q:
        suffix(S, [red, green, blue]),
        show(S)

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

**Load & Run** prints the full list, then **`[green, blue]`**, **`[blue]`**, and **`[]`**.

---

## `is_set/1`

**`is_set(List)`** — succeeds when **`List`** is a **ground** closed list with **no duplicate** elements (standard term equality).

| Call | Behaviour |
|------|-----------|
| `is_set([a, b, c])` | Succeeds |
| `is_set([a, b, a])` | **Fail** |
| Open list or free variable | **Fail** |

**Reserved head:** you cannot define **`is_set/1`** as fact, rule, or constraint head.

### Example — validate unique tags

```logts-play
inline [logic] .tags:

    query check:
        is_set([red, green, blue]),
        show("unique tags")

:

comp [logic] .tagLogic:
    on: 1
    .tags { }
:

1wire trigger = 1

.tagLogic:{
    query = check
    set = trigger
}
```

**Load & Run** prints **`unique tags`**.

---

## `list_to_set/2`

**`list_to_set(List, Set)`** — **`Set`** is **`List`** with duplicate elements removed. **First occurrence order** is preserved.

| Call | Behaviour |
|------|-----------|
| `list_to_set([a, b, a, c], S)` | `S = [a, b, c]` |
| Non-list or partial list | **Fail** |

**Reserved head:** you cannot define **`list_to_set/2`** as fact, rule, or constraint head.

### Example — unique palette

```logts-play
inline [logic] .palette:

    query unique:
        list_to_set([red, blue, red, green], U),
        is_set(U),
        show(U)

:

comp [logic] .paletteLogic:
    on: 1
    .palette { }
:

1wire trigger = 1

.paletteLogic:{
    query = unique
    set = trigger
}
```

**Load & Run** prints **`[red, blue, green]`**.

---

## `union/3`

**`union(List1, List2, Union)`** — **`Union`** contains every element from **`List1`** and **`List2`**, **without duplicates**. Order: all from **`List1`** (first occurrence), then new elements from **`List2`**.

| Call | Behaviour |
|------|-----------|
| `union([a, b], [b, c], U)` | `U = [a, b, c]` |
| Non-list argument | **Fail** |

**Reserved head:** you cannot define **`union/3`** as fact, rule, or constraint head.

### Example — merge tag lists

```logts-play
inline [logic] .tags:

    query allTags:
        union([red, green], [blue, green], All),
        member(C, All),
        show(C)

:

comp [logic] .tagLogic:
    on: 1
    .tags { }
:

1wire trigger = 1

.tagLogic:{
    query = allTags
    set = trigger
}
```

**Load & Run** prints **`red`**, **`green`**, **`blue`** (one line each).

---

## `intersection/3`

**`intersection(List1, List2, Intersection)`** — **`Intersection`** is the ordered list of elements in **both** lists. Order follows **`List1`**; each common element appears **once**.

| Call | Behaviour |
|------|-----------|
| `intersection([a, b, a], [a, c], I)` | `I = [a]` |
| No common elements | `I = []` |
| Non-list argument | **Fail** |

**Reserved head:** you cannot define **`intersection/3`** as fact, rule, or constraint head.

### Example — shared permissions

```logts-play
inline [logic] .access:

    query shared:
        intersection([read, write, admin], [read, execute, admin], Shared),
        show(Shared)

:

comp [logic] .accessLogic:
    on: 1
    .access { }
:

1wire trigger = 1

.accessLogic:{
    query = shared
    set = trigger
}
```

**Load & Run** prints **`[read, admin]`**.

---

## `subtract/3`

**`subtract(List1, List2, Remainder)`** — **`Remainder`** is **`List1`** with every element that occurs in **`List2`** removed. Order of **`List1`** is preserved.

| Call | Behaviour |
|------|-----------|
| `subtract([a, b, c, b], [b], R)` | `R = [a, c]` |
| Non-list argument | **Fail** |

**Reserved head:** you cannot define **`subtract/3`** as fact, rule, or constraint head.

### Example — remove blocked items

```logts-play
inline [logic] .filter:

    query allowed:
        subtract([apple, pear, apple, plum], [pear], Allowed),
        show(Allowed)

:

comp [logic] .filterLogic:
    on: 1
    .filter { }
:

1wire trigger = 1

.filterLogic:{
    query = allowed
    set = trigger
}
```

**Load & Run** prints **`[apple, apple, plum]`**.

---

## `numlist/3`

**`numlist(From, To, List)`** — **`List`** is the consecutive integers from **`From`** through **`To`** inclusive. **`From`** and **`To`** must be **ground** integers.

| Call | Behaviour |
|------|-----------|
| `numlist(1, 3, L)` | `L = [1, 2, 3]` |
| `numlist(3, 1, L)` | `L = []` |
| Range longer than **1024** elements | **Fail** |
| Non-integer bound | **Fail** |

**Reserved head:** you cannot define **`numlist/3`** as fact, rule, or constraint head.

### Example — build a range

```logts-play
inline [logic] .stats:

    query range:
        numlist(2, 6, L),
        show(L)

:

comp [logic] .statsLogic:
    on: 1
    .stats { }
:

1wire trigger = 1

.statsLogic:{
    query = range
    set = trigger
}
```

**Load & Run** prints **`[2, 3, 4, 5, 6]`**.

---

## `sum_list/2`

**`sum_list(List, Sum)`** — **`Sum`** is the arithmetic sum of all elements in **`List`**. Every element must be a **ground** integer.

| Call | Behaviour |
|------|-----------|
| `sum_list([1, 2, 3], S)` | `S = 6` |
| `sum_list([], S)` | `S = 0` |
| Non-number element | **Fail** |

**Reserved head:** you cannot define **`sum_list/2`** as fact, rule, or constraint head.

### Example — total of 1..5

```logts-play
inline [logic] .stats:

    query total:
        numlist(1, 5, L),
        sum_list(L, S),
        show(S)

:

comp [logic] .statsLogic:
    on: 1
    .stats { }
:

1wire trigger = 1

.statsLogic:{
    query = total
    set = trigger
}
```

**Load & Run** prints **`15`**.

---

## `max_list/2` and `min_list/2`

**`max_list(List, Max)`** — **`Max`** is the largest integer in non-empty **`List`**.

**`min_list(List, Min)`** — **`Min`** is the smallest integer in non-empty **`List`**.

| Call | Behaviour |
|------|-----------|
| `max_list([2, 5, 1], M)` | `M = 5` |
| `min_list([2, 5, 1], M)` | `M = 1` |
| `max_list([], M)` or `min_list([], M)` | **Fail** |
| Non-number element | **Fail** |

**Reserved heads:** you cannot define **`max_list/2`** or **`min_list/2`** as fact, rule, or constraint heads.

### Example — range bounds

```logts-play
inline [logic] .stats:

    query bounds:
        numlist(2, 6, L),
        max_list(L, Hi),
        min_list(L, Lo),
        show(Hi, Lo)

:

comp [logic] .statsLogic:
    on: 1
    .stats { }
:

1wire trigger = 1

.statsLogic:{
    query = bounds
    set = trigger
}
```

**Load & Run** prints **`6 2`**.

---

## `sublist/3`

**`sublist(Sub, List, Rest)`** — **`Sub`** is a **contiguous** subsequence of **`List`**. **`Rest`** is the remainder of **`List`** after the matched **`Sub`** ends. Backtracks over all match positions (including empty **`Sub`**).

| Call | Behaviour |
|------|-----------|
| `sublist([b], [a, b, c], R)` | `R = [c]` |
| `sublist([a], [x, a, y, a], R)` | Two solutions |
| Non-list **`List`** | **Fail** |

**Reserved head:** you cannot define **`sublist/3`** as fact, rule, or constraint head.

### Example — find a segment

```logts-play
inline [logic] .world:

    query q:
        sublist([go, stop], [wait, go, stop, go], R),
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

**Load & Run** prints **`[go]`** (the tail after **`[go, stop]`**).

---

## `permutation/2`

**`permutation(Perm, List)`** — **`Perm`** is a permutation of **`List`**. With a **ground** **`List`**, backtracks over all orderings. With both arguments **ground**, succeeds when they are permutations of each other.

| Call | Behaviour |
|------|-----------|
| `permutation(P, [a, b, c])` | Six solutions |
| `permutation([b, a], [a, b])` | Succeeds |
| `permutation([a, a], [a, b])` | **Fail** |
| Open or partial list | **Fail** when generating |

**Reserved head:** you cannot define **`permutation/2`** as fact, rule, or constraint head.

### Example — reorder two cards

```logts-play
inline [logic] .deck:

    query orders:
        permutation(Order, [a, b]),
        show(Order)

:

comp [logic] .deckLogic:
    on: 1
    .deck { }
:

1wire trigger = 1

.deckLogic:{
    query = orders
    set = trigger
}
```

**Load & Run** prints **`[a, b]`** and **`[b, a]`**.

---

## `combinations/3`

**`combinations(K, List, Comb)`** — **`Comb`** is a **K**-element sublist of **`List`** with elements in the **same order** as **`List`**. **`K`** must be a **ground** non-negative integer.

| Call | Behaviour |
|------|-----------|
| `combinations(2, [a, b, c], C)` | Three solutions: `[a, b]`, `[a, c]`, `[b, c]` |
| `combinations(0, L, C)` | `C = []` |
| `combinations(3, [a, b], C)` | **Fail** |
| Non-list **`List`** | **Fail** |

**Reserved head:** you cannot define **`combinations/3`** as fact, rule, or constraint head.

### Example — pick pairs of colors

```logts-play
inline [logic] .pick:

    query pairs:
        combinations(2, [red, green, blue], Pair),
        show(Pair)

:

comp [logic] .pickLogic:
    on: 1
    .pick { }
:

1wire trigger = 1

.pickLogic:{
    query = pairs
    set = trigger
}
```

**Load & Run** prints **`[red, green]`**, **`[red, blue]`**, and **`[green, blue]`**.

---

## `call/1`

**`call(Goal)`** — prove **`Goal`**, where **`Goal`** is a **callable compound** (e.g. **`member(X, L)`**, **`number(3)`**). Enables meta-calling and underpins **`include/3`**, **`exclude/3`**, **`partition/4`**, and **`convlist/3`**.

| Call | Behaviour |
|------|-----------|
| `call(number(3))` | Succeeds |
| `call(member(X, [a, b]))` | Backtracking over **`X`** |
| Non-compound goal | **Fail** |
| Cut inside **`call`** | Does **not** commit choices made **before** the **`call`** |

**Reserved head:** you cannot define **`call/1`** as fact, rule, or constraint head.

### Example — meta-call with backtracking

```logts-play
inline [logic] .world:

:

1wire run = 1
1wire ok = .world:query({ call(member(X, [red, green])), show(X) })
```

**Load & Run** prints **`red`** and **`green`**.

---

## `include/3`, `exclude/3`, and `partition/4`

Higher-order list filters. **`Goal`** is a **template compound** with at least one variable (e.g. **`number(X)`**). For each list element, that variable is bound to the element and **`Goal`** is called.

| Builtin | Result |
|---------|--------|
| **`include(Goal, List, Included)`** | Elements where **`Goal`** succeeds |
| **`exclude(Goal, List, Excluded)`** | Elements where **`Goal`** fails |
| **`partition(Goal, List, Included, Excluded)`** | Both partitions |

**`List`** must be a **ground** closed list.

### Example — keep numbers only

```logts-play
inline [logic] .filter:

    query nums:
        include(number(X), [1, a, 2, 3, b], Ns),
        show(Ns)

:

comp [logic] .filterLogic:
    on: 1
    .filter { }
:

1wire trigger = 1

.filterLogic:{
    query = nums
    set = trigger
}
```

**Load & Run** prints **`[1, 2, 3]`**.

### Example — partition numbers and atoms

```logts-play
inline [logic] .filter:

    query split:
        partition(number(X), [1, a, 2, b], Ns, As),
        show(Ns, As)

:

comp [logic] .filterLogic:
    on: 1
    .filter { }
:

1wire trigger = 1

.filterLogic:{
    query = split
    set = trigger
}
```

**Load & Run** prints **`[1, 2]`** and **`[a, b]`**.

---

## `convlist/3`

**`convlist(Goal, List, Result)`** — apply **`Goal`** to each element of **`List`**. On success, append the **output** to **`Result`**.

| Goal shape | Output collected |
|------------|------------------|
| Unary **`p(X)`** | The bound **`X`** (same as **`include/3`** spirit) |
| N-ary **`p(X, …, Y)`** | The **last** argument after the call |

### Example — double each number

```logts-play
inline [logic] .math:

    double(X, Y) <- Y is X * 2

    query doubled:
        convlist(double(X, Y), [1, 2, 3], R),
        show(R)

:

comp [logic] .mathLogic:
    on: 1
    .math { }
:

1wire trigger = 1

.mathLogic:{
    query = doubled
    set = trigger
}
```

**Load & Run** prints **`[2, 4, 6]`**.

---

## `maplist/2` and `maplist/3`

Higher-order list iteration built on **`call/1`**. Unlike **`include/3`**, **`maplist`** requires **every** element to succeed — one failure fails the whole goal.

| Builtin | Arguments | Behaviour |
|---------|-----------|-----------|
| **`maplist(Goal, List)`** | Unary template **`Goal`** | Prove **`Goal`** for **each** element of ground **`List`** |
| **`maplist(Goal, List1, List2)`** | Binary template **`Goal`** | For each pair from **`List1`** and **`List2`**; generate **`List2`** or verify ground lists |

**Template rules** (same as **`convlist/3`**):

- **`maplist/2`**: first variable in **`Goal`** is bound to each list element in turn.
- **`maplist/3`**: first variable gets the element from **`List1`**, second variable gets the matching element from **`List2`** (or is collected when **`List2`** is unbound).

**`List1`** must be a **ground** closed list. **`List2`** may be unbound (output) or ground (verification). Length mismatch → **fail**.

### Example — double each number

```logts-play
inline [logic] .math:

    double(X, Y) <- Y is X * 2

    query doubled:
        maplist(double(X, Y), [1, 2, 3], R),
        show(R)

:

comp [logic] .mathLogic:
    on: 1
    .math { }
:

1wire trigger = 1

.mathLogic:{
    query = doubled
    set = trigger
}
```

**Load & Run** prints **`[2, 4, 6]`**.

### Example — type-check every element

```logts-play
inline [logic] .check:

    query allNumbers:
        maplist(number(X), [1, 2, 3])

:

comp [logic] .checkLogic:
    on: 1
    .check { }
:

1wire trigger = 1

.checkLogic:{
    query = allNumbers
    set = trigger
}
```

**Load & Run** succeeds silently (no **`show`**). **`maplist(number(X), [1, a, 3])`** would **fail**.

---

## `foldl/4` and `foldl/5`

Left-fold over list(s) using a template goal and an initial accumulator value. Built on **`call/1`**.

| Builtin | Arguments | Goal template shape |
|---------|-----------|---------------------|
| **`foldl(Goal, List, V0, V)`** | One ground list | **`Goal(AccIn, Element, AccOut)`** — 3 variables left-to-right |
| **`foldl(Goal, List1, List2, V0, V)`** | Two ground lists, same length | **`Goal(AccIn, Elem1, Elem2, AccOut)`** — 4 variables left-to-right |

**Behaviour:**

- Start with **`AccIn = V0`** (dereferenced).
- For each element (or pair), prove **`Goal`** once; the new accumulator is **`AccOut`** after the call.
- Empty list(s) → **`V = V0`**.
- One failed step → whole **`foldl`** fails.
- **`V`** may be unbound (output) or ground (verification).

### Example — sum a list

```logts-play
inline [logic] .stats:

    plus(A, B, C) <- C is A + B

    query total:
        foldl(plus(A, X, C), [1, 2, 3, 4], 0, S),
        show(S)

:

comp [logic] .statsLogic:
    on: 1
    .stats { }
:

1wire trigger = 1

.statsLogic:{
    query = total
    set = trigger
}
```

**Load & Run** prints **`10`**.

### Example — fold two parallel lists

```logts-play
inline [logic] .pairs:

    pairSum(A, X, Y, C) <- C is A + X + Y

    query total:
        foldl(pairSum(A, X, Y, C), [1, 2], [10, 20], 0, S),
        show(S)

:

comp [logic] .pairsLogic:
    on: 1
    .pairs { }
:

1wire trigger = 1

.pairsLogic:{
    query = total
    set = trigger
}
```

**Load & Run** prints **`33`** (`0+1+10`, then `11+2+20`).

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

---

## `random_between/3` and `set_random/1`

Integer random numbers for dice, board steps, and other game logic. **No floats** — only ground integers in the ranges below.

| Builtin | Arguments | Range |
|---------|-----------|-------|
| **`set_random(+Seed)`** | **`Seed`** ground integer | **0 … 4294967295** (32-bit unsigned) |
| **`random_between(+Low, +High, -Int)`** | **`Low`**, **`High`**, **`Int`** | **-2147483648 … 2147483647** (signed 32-bit) |

**Rules:**

- **`Low`**, **`High`**, and **`Seed`** must be **ground** integers in range — free variables or out-of-range values → **fail**.
- **`Low` > `High`** → **fail** (not an engine error).
- **`Int`** is bound to a uniform integer in **`[Low, High]`** inclusive.
- **Backtracking:** re-satisfying the same **`random_between/3`** goal returns the **same** **`Int`** (SWI-style impure semantics).
- **RNG scope:** one global generator per run. **`set_random/1`** in a query body resets it; a later **`set_random/1`** overrides an earlier seed in the same query.
- **Reserved heads:** you cannot define **`random_between/3`** or **`set_random/1`** as fact, rule, or constraint heads.

**Component seed:** optional **`randomSeed:`** on **`comp [logic]`** — integer literal or **number wire (≤ 32 bits)** read at each exec pass, equivalent to **`set_random(Val)`** before mutations and queries. See [comp-logic.md — `randomSeed:`](comp-logic.md#component-attributes).

### Example — dice with deterministic seed

```logts-play
inline [logic] .dice:

    roll(D) <- random_between(1, 6, D)

    query oneRoll:
        set_random(42),
        roll(D),
        show("die:", D)

:

comp [logic] .diceLogic:
    on: 1
    .dice { }
:

1wire trigger = 1

.diceLogic:{
    query = oneRoll
    set = trigger
}
```

**Load & Run** prints **`die: 4`** (fixed for seed **42** with the built-in generator).

### Example — board step with `is/2` and comp redirect

```logts-play
inline [logic] .walker:

    roll(D) <- random_between(1, 6, D)

    step(P, S0, S1) <-
        roll(D),
        S1 is S0 + D

    query advance:
        step(p1, 10, NewSquare)

:

comp [logic] .walkerLogic:
    on: 1
    randomSeed: 42
    .walker { }
:

16wire newPos = 0000000000000000
1wire trigger = 1

.walkerLogic:{
    advance >= newPos
    set = trigger
}
```

**Load & Run** sets **`newPos`** to **14** (10 + die **4**). Random runs inside rule **`step/3`**; the script only triggers query **`advance`** via the comp redirect.
