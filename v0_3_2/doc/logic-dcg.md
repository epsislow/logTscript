# Logic DCG — definite clause grammars

**Definite Clause Grammars (DCG)** in `inline [logic]` describe how to **consume** or **generate** lists of tokens. Rules use the neck **`-->`** (distinct from derivation rules **`<-`**).

Related: [inline-logic.md](inline-logic.md) (general syntax) · [logic-builtins.md](logic-builtins.md) (`between/3`, `append/2`, list builtins) · [comp-logic.md](comp-logic.md) (wiring queries)

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run** (`on: 1` on the component).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **DCG neck** | `name(Args) --> Body` |
| **Normal rule** | `name(Args) <- Body` |
| **Terminal** | `[...]` in body — consumes or generates list elements |
| **Non-terminal** | `nt(Args)` in body (no braces) — calls another DCG rule |
| **Prolog goal** | `{ Goal }` or `{ G1, G2 }` — **must** be braced; does **not** consume the list |
| **Expansion** | Each DCG rule becomes a normal rule with **two extra list arguments** (input position, remainder) |
| **MVP head arity** | At most **one** visible argument in the DCG head (equivalent to `//0` or `//1`) |
| **Reserved** | You cannot define a normal rule whose head matches an **expanded** DCG predicate (e.g. `digits/3` after `digits([D\|Ds]) --> …`) |

---

## `-->` vs `<-`

| Construct | Neck | Role |
|-----------|------|------|
| **DCG rule** | `-->` | Grammar — terminals and non-terminals over a list |
| **Logic rule** | `<-` | Derivation — ordinary Prolog-style clauses |

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    is_digit(D) <- between(0, 9, D)

:
```

---

## What consumes the list?

| Body fragment | Consumes? | Example |
|---------------|-----------|---------|
| `[D]` | **Yes** — one element | `digit(D) --> [D], { between(0, 9, D) }` |
| `[a, b]` | **Yes** — sequence | `ab --> [a], [b]` |
| `[]` | **Yes** — empty (no elements) | `empty --> []` |
| `digits(Ds)` | **Yes** — via the called DCG rule | recursive `digits(Ds)` |
| `{ between(0, 9, D) }` | **No** — Prolog goal only | constraint on a digit |
| `{ G1, G2 }` | **No** — goal sequence | `{ between(0, 9, D), D > 5 }` |

**Prolog goals in the DCG body must appear inside `{ … }`.** A bare `between(0, 9, D)` is treated as a non-terminal call; if no DCG rule exists for that name and arity, elaboration fails.

---

## Expansion and calling grammars

DCG rules are **compiled** to ordinary logic rules with **two additional list arguments** at the end (input list position and remainder). You do not write these in the DCG source; they are inserted at compile time.

| DCG source (what you write) | Expanded predicate (conceptual) |
|-----------------------------|----------------------------------|
| `digits([]) --> []` | `digits([], L, L)` |
| `digits([D \| Ds]) --> …` | `digits([D \| Ds], L0, L)` |

To **parse** a closed input list, call the expanded predicate with the same list twice and an empty remainder:

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    query parseClosed:
        digits([1, 2, 3], [1, 2, 3], []),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = parseClosed
    set = trigger
}
```

**Load & Run** prints **`ok`** when the list is fully consumed.

---

## Base case `digits([]) --> []`

The empty-list clause closes recursion:

```logts-play
inline [logic] .grammar:

    digits([]) --> []

    query emptyOk:
        digits([], [], []),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = emptyOk
    set = trigger
}
```

---

## Terminals and non-terminals — `kv` with `=`

```logts-play
inline [logic] .grammar:

    digit(D) --> [D], { between(0, 9, D) }

    kv --> digit(K), [61], digit(V)

    query parseKv:
        kv([3, 61, 7], [3, 61, 7], []),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = parseKv
    set = trigger
}
```

`[61]` is a **terminal** (the number code for `=`). `digit(K)` is a **non-terminal** DCG call.

---

## Multi-element terminal

A single `[a, b, c]` terminal consumes three elements in order:

```logts-play
inline [logic] .grammar:

    abc --> [a, b, c]

    query match:
        abc([a, b, c], [a, b, c], []),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = match
    set = trigger
}
```

---

## Braced goal sequence `{ G1, G2 }`

Multiple goals that do not consume the list can share one brace pair:

```logts-play
inline [logic] .grammar:

    strong(D) --> [D], { between(0, 9, D), D > 5 }

    query strongDigit:
        strong([7], [7], []),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = strongDigit
    set = trigger
}
```

---

## DCG and normal rules in one module

DCG rules and `<-` rules can coexist. Normal rules are called from `{ … }` or from separate queries:

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    is_digit(D) <- between(0, 9, D)

    query both:
        digits([5], [5], []),
        is_digit(5),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = both
    set = trigger
}
```

---

## Module loads with DCG — ordinary query still works

A grammar does not block normal logic queries:

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    color(red)
    color(green)

    query colors:
        member(C, [red, green, blue]),
        show(C)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = colors
    set = trigger
}
```

**Load & Run** prints **`red`** and **`green`** (backtracking over `member/2`).

---

## Reserved expanded heads

If you define `digits([D | Ds]) --> …`, the expanded predicate **`digits/3`** is **reserved**. You cannot add a normal rule with the same name and arity. Elaboration fails with **`'digits/3' is reserved`**.

```logts
inline [logic] .bad:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits(A, B, C) <- A = B

:
```

---

## Limits (MVP)

| Topic | Status |
|-------|--------|
| DCG head with **0 or 1** visible argument | Supported |
| DCG head with **2+** visible arguments | Not supported |
| `{ … }` SWI extras (freeze, meta) | Not supported |

---

## See also

- [inline-logic.md](inline-logic.md) — facts, rules, queries
- [logic-builtins.md](logic-builtins.md) — `between/3`, `append/2`, list predicates
- [comp-logic.md](comp-logic.md) — `comp [logic]` pipeline
