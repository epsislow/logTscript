# Inline logic — `inline [logic]`

`inline [logic]` defines a **declarative knowledge base**: ground facts, rules with bodies, and named queries. It is **not executed** by itself — like `inline [asm]` (definition only), not like `inline [protocol]` (invoke recipe).

Runtime wiring lives in [`comp [logic]`](comp-logic.md). For **ad-hoc goals in expressions** (no component), see [`logic-query-exec.md`](logic-query-exec.md) — **`.world:query({ goals }, Var=<type> wire)`** with explicit **`text` / `number` / `bool`** and optional **`list`**.

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
| **List patterns** | `[H|T]`, `[_, X, _]`, recursive rules — see [Prolog lists](#prolog-lists) |
| **Compounds** | `functor(Arg, …)`, nested `prop(N, rents(…))` — see [Compound terms](#compound-terms) |
| **List builtins** | **`member/2`**, **`append/3`**, **`append/2`**, **`length/2`**, **`last/2`**, **`select/3`**, **`selectchk/3`**, **`flatten/2`**, **`same_length/2`**, **`reverse/2`**, **`sort/2`**, **`keysort/2`**, **`msort/2`**, **`prefix/2`**, **`suffix/2`**, **`is_set/1`**, **`list_to_set/2`**, **`union/3`**, **`intersection/3`**, **`subtract/3`**, **`numlist/3`**, **`sum_list/2`**, **`max_list/2`**, **`min_list/2`**, **`sublist/3`**, **`permutation/2`**, **`combinations/3`**, **`call/1`**, **`include/3`**, **`exclude/3`**, **`partition/4`**, **`convlist/3`**, **`maplist/2`**, **`maplist/3`**, **`foldl/4`**, **`foldl/5`**, **`findall/3`**, **`bagof/3`**, **`setof/3`**, **`nth0/3`**, **`nth1/3`**, **`nth1/4`** — [logic-builtins.md](logic-builtins.md) |
| **Random builtins** | **`random_between/3`**, **`set_random/1`** — [logic-builtins.md](logic-builtins.md#random_between3-and-set_random1) |
| **Value kinds** | **`atom`**, **`number`**, **`list`**, **`compound`**; type tests **`atom/1`** … **`compound/1`** — [logic-value-types.md](logic-value-types.md) |
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
| **Compound** | `point(1, 2)`, `edge(from(A), to(B))` | Functor name + fixed arity; args may be atoms, numbers, lists, or nested compounds |
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
| `true` / `fail` | **`true/0`**, **`fail/0`** — reserved builtins ([logic-builtins.md](logic-builtins.md#true0-and-fail0)) |
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
| Difference list | `[A, B \| H] - H` | Open tail **`H`** — same variable at the hole; see **`append/2`** in [logic-builtins.md](logic-builtins.md) |

**Unification** follows Prolog rules with an **occurs-check** ( cyclic terms such as `X = [X | _]` fail ). A bare list term cannot stand alone as a goal — bind it with `=` or pass it to a predicate.

List literals accept at most **1024** comma-separated elements. Built-in list predicates (**`member/2`**, **`append/3`**, **`append/2`** (difference lists), **`length/2`**, **`last/2`**, **`select/3`**, **`selectchk/3`**, **`flatten/2`**, **`same_length/2`**, **`reverse/2`**, **`sort/2`**, **`keysort/2`**, **`msort/2`**, **`prefix/2`**, **`suffix/2`**, **`is_set/1`**, **`list_to_set/2`**, **`union/3`**, **`intersection/3`**, **`subtract/3`**, **`numlist/3`**, **`sum_list/2`**, **`max_list/2`**, **`min_list/2`**, **`sublist/3`**, **`permutation/2`**, **`combinations/3`**, **`call/1`**, **`include/3`**, **`exclude/3`**, **`partition/4`**, **`convlist/3`**, **`maplist/2`**, **`maplist/3`**, **`foldl/4`**, **`foldl/5`**, **`findall/3`**, **`bagof/3`**, **`setof/3`**, **`nth0/3`**, **`nth1/3`**, **`nth1/4`**) are documented in [logic-builtins.md](logic-builtins.md).

**`show/N`** prints ground lists as `[a, b, c]`, partial lists as `[a, b|Rest]`, and open difference lists as `[a, b|H]-H`.

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

### Pattern matching — quick map

| Pattern | Matches | Typical use |
|---------|---------|-------------|
| `[]` | Empty list only | Base case in recursion |
| `[X]` | Exactly one element | Singleton |
| `[A, B, C]` | Exactly three elements | Fixed-width unpack |
| `[H \| T]` | Non-empty list | Head **`H`**, tail **`T`** (may be `[]`) |
| `[A, B \| Rest]` | At least two elements | First two + remainder |
| `[_, X, _]` | Exactly three; bind middle | Anonymous slots ignore positions |
| `[First, _ \| _]` | At least one element | First only (ignore rest with `_`) |
| `[_, _, Last]` | Exactly three; bind last | Last of three without `\|` |
| `[_ \| T]` | Any non-empty list | Skip head, keep tail |
| `[pair(N, Ls) \| _]` | Non-empty list of compounds | First element + ignore rest |

Use **`=`** / unification goals to match patterns against ground facts or variables. **`_`** is an anonymous variable — each `_` is independent. Repeated named variables (e.g. **`X`**) must unify to the **same** term.

**Occurs-check:** cyclic terms such as **`X = [X | _]`** fail (no infinite lists).

---

### Head and tail — `[H | T]`

Decompose a list in a query or rule head. **`H`** binds to the first element; **`T`** binds to the rest (often another list, or `[]` at the end).

```logts-play
inline [logic] .world:

    route([n, e, s, w])

    query split:
        route([Head | Tail]),
        show(Head, Tail)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = split
    set = trigger
}
```

**Load & Run** prints one line such as **`n [e, s, w]`** — atom head, tail printed as a list.

Fixed prefix plus tail — **`[A, B | Rest]`** requires at least two elements:

```logts-play
inline [logic] .world:

    route([n, e, s])

    query firstTwo:
        route([A, B | Rest]),
        show(A, B, Rest)

:

1wire ok = .world:query({ route([A, B | Rest]), show(A, B, Rest) })
```

**Load & Run** → **`n e [s]`**.

---

### Anonymous `_` — pick one slot

Ignore positions you do not care about. Each **`_`** is fresh; only named variables are shared.

**Middle of three:**

```logts-play
inline [logic] .world:

    items([alpha, beta, gamma])

    query middle:
        items([_, X, _]),
        show(X)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = middle
    set = trigger
}
```

**Load & Run** → **`beta`**.

**First and last without walking the tail manually:**

```logts-play
inline [logic] .world:

    route([n, e, s])

    query ends:
        route([First, _, Last]),
        show(First, Last)

:

1wire ok = .world:query({ route([First, _, Last]), show(First, Last) })
```

**Load & Run** → **`n s`**.

For longer lists, combine **`[_ | T]`** (drop head) with recursion or use **`append/3`** / **`nth0/3`** (below).

---

### Recursive traversal — walk every element

Classic Prolog style: one clause for the empty list, one for **`[H|T]`**. This is the same idea as built-in **`member/2`**, but with your own predicate name (**`member/2`** is reserved).

```logts-play
inline [logic] .world:

    colors([red, green, blue])

    walk([]) <- show("done")
    walk([H | T]) <- show(H), walk(T)

    query demo:
        colors(L),
        walk(L)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = demo
    set = trigger
}
```

**Load & Run** prints **`red`**, **`green`**, **`blue`**, then **`done`**.

**Membership** (equivalent spirit to **`member/2`**):

```logts-play
inline [logic] .world:

    userMember(X, [X | _])
    userMember(X, [_ | T]) <- userMember(X, T)

    query findGreen:
        userMember(C, [red, green, blue]),
        C = green,
        show(C)

:

1wire ok = .world:query({ userMember(C, [red, green, blue]), show(C) })
```

Backtracking finds **`red`**, then **`green`**, then **`blue`**. The extra **`C = green`** keeps only the middle solution.

---

### Accumulator — sum a numeric list

Use a second argument to carry the running total; base case **`[]`**, recursive case uses **`is/2`** for arithmetic (see [Arithmetic `is/2`](#arithmetic-is2)).

```logts-play
inline [logic] .world:

    sumList([], 0)
    sumList([H | T], Total) <- sumList(T, Rest), Total is H + Rest

    data([1, 2, 3, 4])

    query total:
        data(L),
        sumList(L, S),
        show(S)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = total
    set = trigger
}
```

**Load & Run** → **`10`**.

**Count elements** (same recursion shape; or use built-in **`length/2`**):

```logts-play
inline [logic] .world:

    count([], 0)
    count([_ | T], N) <- count(T, M), N is M + 1

    query len:
        count([a, b, c, d], N),
        show(N)

:

1wire ok = .world:query({ count([a, b, c, d], N), show(N) })
```

→ **`4`**.

---

### Last element — recursion and `append/3`

**Recursive last/2** (standard Prolog textbook pattern):

```logts-play
inline [logic] .world:

    last([X], X)
    last([_ | T], X) <- last(T, X)

    route([n, e, s])

    query lastStep:
        route(L),
        last(L, X),
        show(X)

:

1wire ok = .world:query({ route(L), last(L, X), show(X) })
```

**Load & Run** → **`s`**.

**Via `append/3`** — “prefix + singleton suffix” (many solutions on backtracking; for a **ground** list, take the split where suffix is one element, or use **`;last`** on an inline query):

```logts-play
inline [logic] .world:

    route([n, e, s])

    query splits:
        route(L),
        append(Prefix, [Last], L),
        show(Prefix, Last)

:

1wire ok = .world:query({ route(L), append(Prefix, [Last], L), show(Prefix, Last) })
```

**Load & Run** prints three lines: **`[] n`**, **`[n] e`**, **`[n, e] s`**. The final line is the usual “last element” split. Full **`append/3`** modes: [logic-builtins.md — `append/3`](logic-builtins.md#append3).

---

### Split and join — `append/3` decompose

Given a ground list, **`append(L1, L2, L3)`** with **`L3`** ground backtracks over all **`L1` / `L2`** pairs.

```logts-play
inline [logic] .world:

    word([c, a, t])

    query parts:
        word(W),
        append(L1, L2, W),
        show(L1, L2)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = parts
    set = trigger
}
```

**Load & Run** prints four decompositions, ending with **`[c, a, t] []`**.

Generative mode — build a list of known length (see also [logic-builtins.md — `length/2`](logic-builtins.md#length2)):

```logts-play
inline [logic] .world:

    query gen:
        length(L, 3),
        append(L, [z], Long),
        show(Long)

:

1wire ok = .world:query({ length(L, 3), append(L, [z], Long), show(Long) })
```

**Load & Run** prints a four-element list **`[..., z]`** with three anonymous cells.

---

### Nested lists and compounds inside lists

Lists may contain other lists or compound terms. Patterns apply at each level.

```logts-play
inline [logic] .world:

    pairs([pair(a, [1, 2]), pair(b, [3])])

    query firstPair:
        pairs([pair(N, Ls) | _]),
        show(N, Ls)

:

1wire ok = .world:query({ pairs([pair(N, Ls) | _]), show(N, Ls) })
```

**Load & Run** → **`a [1, 2]`**.

Deeper nesting — extract inner list by position:

```logts-play
inline [logic] .world:

    grid([row([1, 2]), row([3, 4])])

    query topRow:
        grid([row(Nums) | _]),
        show(Nums)

:

1wire ok = .world:query({ grid([row(Nums) | _]), show(Nums) })
```

→ **`[1, 2]`**.

---

### Index by position — `nth0/3` and `nth1/3`

When you know the index, builtins avoid writing recursion:

| Builtin | Index base | Example |
|---------|------------|---------|
| **`nth0(I, List, Elem)`** | 0 | `nth0(1, [a,b,c], X)` → **`X = b`** |
| **`nth1(I, List, Elem)`** | 1 (SWI-style) | `nth1(2, [a,b,c], X)` → **`X = b`** |

```logts-play
inline [logic] .world:

    route([n, e, s])

    query byIndex:
        route(L),
        nth0(1, L, Step),
        nth1(3, L, Last),
        show(Step, Last)

:

1wire ok = .world:query({ route(L), nth0(1, L, Step), nth1(3, L, Last), show(Step, Last) })
```

**Load & Run** → **`e s`**. Full reference: [logic-builtins.md — `nth0/3` · `nth1/3`](logic-builtins.md#nth03-and-nth13).

---

### What matches Prolog / what differs

| Prolog habit | LogTScript logic |
|--------------|------------------|
| **`[H\|T]`** recursion | Supported — same unification |
| **`[_, X, _]`** fixed slot | Supported |
| **`append/3`**, **`member/2`**, **`length/2`**, … | Built-ins (reserved names) |
| User **`member/2`** rule | **Not allowed** — use another name (`userMember/2`, …) |
| **`true` / `fail`** goals | **`true/0`**, **`fail/0`** — see [logic-builtins.md — `true/0` · `fail/0`](logic-builtins.md#true0-and-fail0) |
| DCG **`NonTerminal --> …`** | **Not supported** |
| Open / partial lists in **`reverse/2`**, **`sort/2`**, **`length/2`** count | **Fail** until the spine is ground |
| Cyclic **`X = [X\|_]`** | **Fails** (occurs-check) |
| Bare **`[a,b]`** as a goal | **Parse error** — wrap in **`X = [a,b]`** or pass to a predicate |
| List literal size | Max **1024** comma-separated elements |

For wire-packed list I/O (`text list`, `number list`, …), see [logic-query-exec.md](logic-query-exec.md#list-codec-rules).

---

## Compound terms

A **compound** is a structured term **`Name(Arg1, Arg2, …)`** with a fixed **arity** (argument count). Arguments can be atoms, numbers, lists, variables, or **nested compounds**. Predicates in facts and rules use the same syntax: **`owns(john, chevy)`** is a compound of arity 2.

In the **documentation viewer**, blocks marked **`logts-play`** support **Load** and **Load & Run**.

### Pattern matching — quick map

| Pattern | Matches | Typical use |
|---------|---------|-------------|
| `carInfo(Make, Color, Year, Type)` | Any `carInfo/4` fact | Bind all four arguments |
| `carInfo(toyota, _, Y, _)` | Toyota rows only | Ignore color and body style |
| `located(Id, zone(Z, Name))` | Second arg is nested `zone/2` | Unpack inner fields |
| `prop(N, rents(R1, R2, _, _, _, _), _, _)` | Monopoly-style property row | Reach into nested `rents/6` |
| `branch(left(L), right(R))` | Binary tree node | Recursive descent on **`L`** / **`R`** |
| `edge(from(A), to(B))` | Labelled edge | Shared variable **`A`** in both compounds |

Use **`=`** or a predicate call to unify compounds. Functor name **and** arity must match. **`_`** ignores one argument slot.

**Not the same as arithmetic:** **`M = N + 1`** builds a **structure** `+(N, 1)`; **`M is N + 1`** evaluates (see [Arithmetic `is/2`](#arithmetic-is2)).

---

### Flat compound — bind some arguments

Query a multi-argument fact and leave unwanted slots anonymous:

```logts-play
inline [logic] .world:

    carInfo(toyota, red, 2020, sedan)
    carInfo(ford, blue, 2018, truck)
    carInfo(toyota, silver, 2020, coupe)

    query toyotaYears:
        carInfo(toyota, _, Year, _),
        show(Year)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = toyotaYears
    set = trigger
}
```

**Load & Run** prints **`2020`** twice (one line per matching fact).

Filter with two bound slots:

```logts-play
inline [logic] .world:

    carInfo(toyota, red, 2020, sedan)
    carInfo(ford, blue, 2018, truck)

    query redToyota:
        carInfo(Make, red, Year, Body),
        show(Make, Year, Body)

:

1wire ok = .world:query({ carInfo(Make, red, Year, Body), show(Make, Year, Body) })
```

→ **`toyota 2020 sedan`**.

---

### Nested compound — unpack inner functors

Store structured data inside an argument:

```logts-play
inline [logic] .world:

    located(box1, zone(2, east))
    located(box2, zone(5, west))

    query where:
        located(Box, zone(Id, Name)),
        show(Box, Id, Name)

:

1wire ok = .world:query({ located(Box, zone(Id, Name)), show(Box, Id, Name) })
```

**Load & Run** prints two lines, e.g. **`box1 2 east`**, **`box2 5 west`**.

Deeper nest — compound inside list inside compound (Monopoly-style sketch):

```logts-play
inline [logic] .mono:

    board([prop(mediterranean, rents(2, 10, 30, 90, 160, 250), 50, 50)])

    query firstRent:
        board([prop(Name, rents(R1, R2, _, _, _, _), _, _) | _]),
        show(Name, R1, R2)

:

comp [logic] .monoLogic:
    on: 1
    .mono { }
:

1wire trigger = 1

.monoLogic:{
    query = firstRent
    set = trigger
}
```

**Load & Run** → **`mediterranean 2 10`**.

---

### Unify — build or decompose a compound

Use **`=`** when the shape is known (structural unification):

```logts-play
inline [logic] .world:

    query rect:
        Shape = rect(w(10), h(20)),
        show(Shape)

:

1wire ok = .world:query({ Shape = rect(w(10), h(20)), show(Shape) })
```

**Load & Run** → **`rect(w(10), h(20))`**.

Decompose into named parts:

```logts-play
inline [logic] .world:

    shape(rect(w(10), h(20)))

    query size:
        shape(rect(w(W), h(H))),
        show(W, H)

:

1wire ok = .world:query({ shape(rect(w(W), h(H))), show(W, H) })
```

→ **`10 20`**.

---

### Shared variables across compounds

The **same variable name** in one clause must refer to the **same** binding — useful for graphs and paths:

```logts-play
inline [logic] .world:

    edge(from(a), to(b))
    edge(from(b), to(c))
    edge(from(a), to(d))

    query stepFromA:
        edge(from(a), to(Dest)),
        show(Dest)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = stepFromA
    set = trigger
}
```

**Load & Run** prints **`b`** and **`d`** (two solutions).

Chain two edges with a shared middle node:

```logts-play
inline [logic] .world:

    edge(from(a), to(b))
    edge(from(b), to(c))
    edge(from(a), to(d))

    query twoHop:
        edge(from(a), to(M)),
        edge(from(M), to(Goal)),
        show(Goal)

:

1wire ok = .world:query({ edge(from(a), to(M)), edge(from(M), to(Goal)), show(Goal) })
```

**Load & Run** → **`c`** (path **`a → b → c`**).

---

### Recursive rules on compound shape — binary tree

Treat compounds as algebraic data types: one clause per functor shape.

```logts-play
inline [logic] .world:

    node(leaf(3))
    node(leaf(7))
    node(branch(leaf(1), leaf(9)))

    nodeVal(leaf(V), V)
    nodeVal(branch(L, R), Sum) <-
        nodeVal(L, A),
        nodeVal(R, B),
        Sum is A + B

:

1wire ok = .world:query({ node(T), nodeVal(T, S), show(S) })
```

**Load & Run** prints **`3`**, **`7`**, and **`10`** ( **`branch(leaf(1), leaf(9))`** ).

---

### `show/N` with compound arguments

**`show/N`** prints ground compounds textually (same as other ground terms):

```logts-play
inline [logic] .world:

    inside(john, johnsCar)

    query display:
        inside(Person, Place),
        show(inside(Person, Place))

:

1wire ok = .world:query({ inside(Person, Place), show(inside(Person, Place)) })
```

**Load & Run** → **`inside(john, johnsCar)`**.

With a string label:

```logts-play
inline [logic] .world:

    status(box1, ok(active))

    query label:
        status(Id, ok(State)),
        show("box", Id, "state", State)

:

1wire ok = .world:query({ status(Id, ok(State)), show("box", Id, "state", State) })
```

→ **`box box1 state active`**.

---

### Rules with compound heads

Rule heads may be compounds — typical for transformers or normalised facts:

```logts-play
inline [logic] .world:

    raw(sensor(t1, 42))
    raw(sensor(t2, 17))

    reading(S, V) <- raw(sensor(S, V))

    query all:
        reading(S, V),
        show(S, V)

:

1wire ok = .world:query({ reading(S, V), show(S, V) })
```

**Load & Run** → **`t1 42`**, **`t2 17`**.

Filter in the rule body with a nested pattern:

```logts-play
inline [logic] .world:

    packet(header(type(data)), payload([1, 2, 3]))
    packet(header(type(ack)), payload([]))

    dataPacket(P) <- packet(header(type(data)), P)

    query payloads:
        dataPacket(Body),
        show(Body)

:

1wire ok = .world:query({ dataPacket(Body), show(Body) })
```

→ **`[1, 2, 3]`**.

---

### `=` vs `is/2` on compounds

| Goal | When `N` is still free | Result |
|------|------------------------|--------|
| **`M = N + 1`** | yes | **`M`** becomes structure **`+(N, 1)`** (not evaluated) |
| **`M is N + 1`** | yes | **Fail** — RHS must be ground enough to evaluate |
| **`M is 3 + 4`** | — | **`M = 7`** |

```logts-play
inline [logic] .world:

    query numeric:
        M is 3 + 4,
        show(M)

:

1wire ok = .world:query({ M is 3 + 4, show(M) })
```

**Load & Run** → **`7`**. Structural **`M = N + 1`** leaves a **`+(N, 1)`** term when **`N`** is free — see [Arithmetic `is/2`](#arithmetic-is2).

---

### Compounds and constraints

Constraint heads are compounds too — **`constraint inside(O, C) <= …`** validates mutation facts. See [logic-constraints.md](logic-constraints.md). Example fact + constraint pattern:

```logts-play
inline [logic] .warehouse:

    object(box1)
    container(c1)
    inside(box1, c1)

    constraint inside(Object, Container) <=
        object(Object),
        container(Container)

    query hasInside:
        inside(box1, c1)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

1wire flag = 0
1wire trigger = 1

.whLogic:{
    hasInside >= flag
    set = trigger
}
```

After **Load & Run**, **`flag = 1`** — the ground compound fact satisfies the constraint.

---

### Limits (compounds)

| Topic | Behaviour |
|-------|-----------|
| **Arity** | Fixed per functor — `foo(a)` does not unify with `foo(a, b)` |
| **Functor names** | Lowercase atoms (same as predicates) |
| **Nesting depth** | Practical limit from **`maxDepth`** on solve (default **256** goal steps) |
| **Reserved functors** | Built-in names (`member`, `append`, `is`, …) cannot be **user-defined clause heads** at that arity |
| **Floats inside compounds** | **Not supported** — use integers |
| **Cyclic structures** | **`X = f(X)`** fails (occurs-check), same as lists |

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

## `true/0` and `fail/0`

Reserved builtins — always succeed or always fail. Full reference: [logic-builtins.md — `true/0` · `fail/0`](logic-builtins.md#true0-and-fail0).

| Goal | Effect |
|------|--------|
| **`true`** | Succeeds; body continues |
| **`fail`** | Fails immediately |

```logts
ok() <- true
never(X) <- fail, member(X, [a])
```

**`\+ fail`** succeeds (useful sanity check). Prefer **`true`** over **`X = X`** for readability.

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

Each `query` may expose up to **16** free variables. **Matrix bulk** on `comp [logic]` writes **two columns** per row — use **`;sel(i,j)`** when **N > 2**. **Vector bulk** on one column uses **`;sel(i)`** (see [comp-logic.md](comp-logic.md)). Variables bound in earlier goals (including inside `\+`) are not output columns.

| Free vars | Redirect pattern (on comp) |
|-----------|----------------------------|
| **0** | `queryName >= wire` — `1` if any solution, else `0` |
| **1** | `queryName:0 >= wire`, `queryName:1 >= wire`, … — solution index |
| **2** | `query >= matrix`, `query:r >= vector`, … — implicit columns 0 and 1 |
| **N > 2** | `query;sel(i,j) >= matrix`, `query;sel(i) >= vector`, `query:0 >= rowAll` (N cells), `query;sel(i,j):0 >= pair` — see comp-logic |

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

doc(.world)
```

Use **Load** to inspect the module summary; **Load & Run** executes `doc(.world)` in the editor.

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

doc(.character)
```

---

## Related

- Runtime, pins, exec blocks → [comp-logic.md](comp-logic.md)
- **Built-in predicates** → [logic-builtins.md](logic-builtins.md)
- Static vs dynamic KB, `logic { + / - }`, tombstones, **`each`** row expansion → [logic-runtime.md](logic-runtime.md)
- Constraints `<=` vs rules `<-` → [logic-constraints.md](logic-constraints.md)
- Allow / NotAllow → [allow-notallow.md](allow-notallow.md) — `inline.type{logic}`
- Analogies: [asm.md](asm.md) (definition vs runtime), [plc.md](plc.md) (component scan)
