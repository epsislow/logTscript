# Logic indexing — fact index and `count/2`

`comp [logic]` can maintain an internal **fact index** over the effective knowledge base (static facts minus tombstones, plus dynamic adds). The engine also provides built-in **`count(Goal, N)`** for counting solutions to a goal on the current KB — useful in constraints, rules, and queries.

Related: [logic-runtime.md](logic-runtime.md) (mutations), [logic-constraints.md](logic-constraints.md) (validation), [comp-logic.md](comp-logic.md) (component wiring).

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run** (`on: 1` on the component).

---

## Quick reference

| Attribute | Default | Meaning |
|-----------|---------|---------|
| **`indexFacts`** | **`1`** (on) | Build and use a persistent fact index per component |
| **`indexFacts: 0`** | — | No index — same scan path as before indexing (debug / comparison) |
| **`indexRebuild`** | **`full`** | Rebuild strategy when index is on (`indexFacts: 1`) |
| **`indexRebuild: full`** | default | Full O(n) rebuild at init and after each successful mutation commit |
| **`indexRebuild: delta`** | opt-in | Full rebuild at init; O(delta) patch on each successful commit |
| **`indexRebuild`** with **`indexFacts: 0`** | ignored | Attribute has no effect |

| Built-in | Syntax | Meaning |
|----------|--------|---------|
| **`count/2`** | `count(Goal, N)` | **`N`** = number of solutions to **`Goal`** on the current KB |
| **`show/N`** | `show(T1, …, TN)` | Print dereferenced terms (1–32 args); always succeeds; reserved predicate |
| **`nth0/3`** | `nth0(I, List, Elem)` | List element at **0-based** index **`I`**; reserved predicate |
| **`nth1/3`** | `nth1(I, List, Elem)` | List element at **1-based** index **`I`**; reserved predicate |

**`count/2`** detail below. **`show/N`** — see [inline-logic.md](inline-logic.md#built-in-shown-logic-debug-output). **`nth0/3`**, **`nth1/3`** — see [inline-logic.md](inline-logic.md#built-in-nth0--nth1-list-indexing).

---

## Component attributes

```logts
comp [logic] .whLogic:
    on: 1
    indexFacts: 1        # default — omit = on
    indexRebuild: full    # default — or delta
    .warehouse { }
```

| `indexFacts` | `indexRebuild` | Behaviour |
|--------------|----------------|-----------|
| **`0`** | *(ignored)* | Linear merge path; no persistent index |
| **`1`** / omitted | **`full`** / omitted | Index built at elaboration; full rebuild after each commit |
| **`1`** / omitted | **`delta`** | Index built at elaboration; incremental patch after each commit |

**Init** always performs a **full** index build (empty index → scan effective KB).

**Pre-commit constraint validation** builds a **temporary full index** on the proposed KB (one pass per validation) — independent of `indexRebuild`.

**Delta patch** applies mutation ops in transaction order, idempotently (aligned with the dynamic store):

- **`- key`** when key absent → no-op  
- **`+ key`** when key already present → no-op  

If the index cannot legally reflect the post-commit KB, the engine throws **`Error`** (no silent fallback rebuild).

---

## `count/2`

**Syntax:** `count(Goal, N)` — goal first, count second (same goal-list style as the rest of the body).

| `N` in call | Behaviour |
|-------------|-----------|
| **Variable** | Bound to the solution count |
| **Ground number** | Must equal the solution count (e.g. `count(inside(_, c1), 2)`) |

**Example — count solutions in a query (boolean success on wire):**

Use a **ground** second argument when the redirect wire is 1-bit success (`ok = 1` means the count matched):

```logts-play
inline [logic] .warehouse:

    object(box1)
    object(box2)
    container(c1)

    inside(box1, c1)
    inside(box2, c1)

    query twoInC1:
        count(inside(_, c1), 2)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

1wire ok = 0
1wire trigger = 1

.whLogic:{
    twoInC1 >= ok
    set = trigger
}
```

After **Load & Run**: **`ok = 1`** — exactly two `inside(_, c1)` facts.

---

## `count/2` in constraints (capacity)

Replace helper relations + NAF with a direct count on the proposed KB:

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

    query thirdInC1:
        inside(box3, c1)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

1wire ok = 0
1wire failed = 0
1wire trigger = 1

.whLogic:{
    logic { + inside(box3, c1) }
    thirdInC1 >= ok
    mutationFailed >= failed
    set = trigger
}
```

After **Load & Run**: **`failed = 1`**, **`ok = 0`** — third object rejected; store unchanged.

Helper relations such as `badTriple` / `slotAvailable` remain valid; `count/2` is the generic pattern for “at most **N** facts matching **Goal**”.

---

## `indexRebuild: delta` — move with patch

Same semantic result as **`full`** after an atomic move; delta patches only the touched keys:

```logts-play
inline [logic] .warehouse:

    object(box1)
    object(box2)
    container(c1)
    container(c2)

    inside(box1, c1)
    inside(box2, c1)

    capacity(c1, 2)
    capacity(c2, 2)

    constraint inside(O, C) <=
        object(O),
        container(C),
        capacity(C, Max),
        count(inside(_, C), N),
        N =< Max

    query oneInC1:
        count(inside(_, c1), 1)

:

comp [logic] .whLogic:
    on: 1
    indexFacts: 1
    indexRebuild: delta
    .warehouse { }
:

1wire ok = 0
1wire failed = 0
1wire trigger = 1

.whLogic:{
    logic {
        - inside(box1, c1)
        + inside(box1, c2)
    }
    oneInC1 >= ok
    mutationFailed >= failed
    set = trigger
}
```

After **Load & Run**: **`failed = 0`**, **`ok = 1`** — one object left in `c1` after the move.

---

## `indexFacts: 0` — index off

Disables the persistent index. Constraints, mutations, and queries behave the same; only the internal index path is skipped (`indexRebuild` is ignored):

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

    query thirdInC1:
        inside(box3, c1)

:

comp [logic] .whLogic:
    on: 1
    indexFacts: 0
    indexRebuild: delta
    .warehouse { }
:

1wire failed = 0
1wire trigger = 1

.whLogic:{
    logic { + inside(box3, c1) }
    mutationFailed >= failed
    set = trigger
}
```

After **Load & Run**: **`failed = 1`** — same rejection as with indexing on.

---

## Delta idempotency (duplicate ops)

The dynamic store accepts duplicate **`+`** / **`-`** on the same key; the delta patch does too:

```logts
logic {
    - inside(box1, c1)
    - inside(box1, c1)
    - inside(box1, c1)
}
```

After the first remove, further removes are **no-ops** — no index error, no `mutationFailed`.

---

## See also

- [logic-constraints.md](logic-constraints.md) — `<=` validation, proposed KB  
- [logic-runtime.md](logic-runtime.md) — `logic { + / - }`, tombstones  
- [comp-logic.md](comp-logic.md) — exec block, redirects, `mutationFailed`
