# Logic DCG — definite clause grammars

**Definite Clause Grammars (DCG)** in `inline [logic]` describe how to **consume** or **generate** lists of tokens. Rules use the neck **`-->`** (distinct from derivation rules **`<-`**).

Related: [inline-logic.md](inline-logic.md) (general syntax) · [logic-builtins.md](logic-builtins.md) (`phrase/2`, `phrase/3`, `between/3`, `append/2`, list builtins) · [comp-logic.md](comp-logic.md) (wiring queries)

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
| **`phrase/2`, `phrase/3`** | Built-in meta-calls for parse and generate — see [below](#phrase2-and-phrase3) |
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
| `abc --> [a, b, c]` | `abc(L0, L)` |

### `phrase/2` and `phrase/3`

Use the built-in **`phrase/2`** and **`phrase/3`** to run a grammar instead of calling the expanded predicate directly.

| Builtin | Meaning |
|---------|---------|
| **`phrase(Goal, List)`** | Same as **`phrase(Goal, List, [])`** — parse or generate a **closed** list |
| **`phrase(Goal, List, Rest)`** | **`Goal`** is a DCG non-terminal: an atom for **//0** rules (`abc`) or a compound for **//1** (`digits([1,2,3])`). **`List`** is the input (or output when generating). **`Rest`** is the unconsumed suffix. |

When **`List`** is a **difference list** `Front - Hole`, **`Rest`** unifies with **`Hole`** and **`Front`** is used as the starting list position.

**`phrase/2`** and **`phrase/3`** are **bidirectional** (parse and generate). You cannot define your own rules with head **`phrase/2`** or **`phrase/3`**.

To **parse** a closed input list:

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    query parseClosed:
        phrase(digits([1, 2, 3]), [1, 2, 3]),
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

You can still call the **expanded** predicate directly (for example `digits([1, 2, 3], [1, 2, 3], [])`); **`phrase`** is the usual entry point.

### `phrase/2` — generate (//0)

For a **//0** rule (no visible arguments in the DCG head), pass the non-terminal as an **atom**:

```logts-play
inline [logic] .grammar:

    abc --> [a, b, c]

    query generate:
        phrase(abc, Xs),
        show(Xs)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = generate
    set = trigger
}
```

**Load & Run** prints **`[a, b, c]`**.

### `phrase/3` — partial parse with rest

When the input is longer than what the grammar consumes, bind **`Rest`** to the suffix:

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    query partial:
        phrase(digits([1]), [1, 2, 3], Rest),
        show(Rest)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = partial
    set = trigger
}
```

**Load & Run** prints **`[2, 3]`**.

### `phrase/3` — difference-list input

A difference list **`Front - Hole`** as the second argument uses **`Front`** as the start position and unifies **`Rest`** with **`Hole`**. For a **closed** parse, the hole is empty:

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    query difList:
        phrase(digits([1, 2]), [1, 2 | R] - R, []),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = difList
    set = trigger
}
```

**Load & Run** prints **`ok`**.

---

## Direct expanded calls (advanced)

## Base case `digits([]) --> []`

The empty-list clause closes recursion:

```logts-play
inline [logic] .grammar:

    digits([]) --> []

    query emptyOk:
        phrase(digits([]), []),
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
        phrase(kv, [3, 61, 7]),
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
        phrase(abc, [a, b, c]),
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
        phrase(strong([7]), [7]),
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
        phrase(digits([5]), [5]),
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

## Reserved heads

### Expanded DCG predicates

If you define `digits([D | Ds]) --> …`, the expanded predicate **`digits/3`** is **reserved**. You cannot add a normal rule with the same name and arity. Elaboration fails with **`'digits/3' is reserved`**.

```logts
inline [logic] .bad:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits(A, B, C) <- A = B

:
```

### `phrase/2` and `phrase/3`

**`phrase/2`** and **`phrase/3`** are engine builtins. You cannot define facts or rules with those heads. Elaboration fails with **`'phrase/2' is reserved`** or **`'phrase/3' is reserved`**.

```logts
inline [logic] .bad:

    phrase(G, L) <- G = L

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
- [logic-builtins.md](logic-builtins.md) — `phrase/2`, `phrase/3`, `between/3`, `append/2`, list predicates
- [comp-logic.md](comp-logic.md) — `comp [logic]` pipeline
