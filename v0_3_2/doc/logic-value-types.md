# Logic values and type predicates

LogTScript logic stores **five kinds of values** in the knowledge base: **atom**, **number**, **float**, **list**, and **compound**. Built-in type predicates **`atom/1`**, **`number/1`**, **`float/1`**, **`list/1`**, and **`compound/1`** test the kind of the term currently bound to a variable — they **filter** candidates; they do **not** generate values.

Wire pins use **`text`**, **`number`**, and **`bool`** as **encoding hints** at the component boundary — those are **not** separate logic kinds. See [Wire boundary](#wire-boundary-text--number--bool) and [logic-query-exec.md](logic-query-exec.md).

Related: [inline-logic.md](inline-logic.md) (syntax), [logic-builtins.md](logic-builtins.md) (other built-ins), [comp-logic.md](comp-logic.md) (redirects).

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Logic kinds** | `atom`, `number`, `float`, `list`, `compound` |
| **Type predicates** | `atom(X)`, `number(X)`, `float(X)`, `list(X)`, `compound(X)` — reserved, arity 1 |
| **Filters** | Predicate succeeds only when `X` is already bound to a matching kind |
| **Quoted text** | `"hello"` is an **atom** (same kind as `hello`) |
| **Wire `text`** | ASCII encode/decode on pins — not a KB kind |
| **Wire `bool`** | 1-bit satisfiability / flags — not a KB kind |
| **List vs compound** | `[a,b]` is a list; `pair(a,b)` is a compound — distinct |

---

## The five logic kinds

| Kind | Examples | Notes |
|------|----------|-------|
| **atom** | `john`, `red`, `"hello"` | Lowercase symbols and double-quoted string literals |
| **number** | `15`, `-4`, `2020` | Integers only; use `is/2` for integer arithmetic |
| **float** | `1.5`, `-0.25`, `.5` | IEEE values stored as floating-point; distinct from integers |
| **list** | `[]`, `[a, b, c]`, `[H \| T]` | Prolog-style lists (F22) |
| **compound** | `person(john, 25)`, `edge(from(a), to(b))` | Named functor + fixed arity |

**Variables** are not values. A variable receives one of the kinds above when unified with a fact or rule.

---

## Atoms and string literals

Unquoted symbols and quoted string literals are the **same kind** (`atom`). Quoted form is syntax for arbitrary character sequences (including spaces); display in **`show/N`** prints the atom name.

```logts-play
inline [logic] .world:

    label(red)
    label("hello world")

    query atoms:
        label(X),
        atom(X),
        show(X)

:

1wire trigger = 1

comp [logic] .worldLogic:
    on: 1
    .world { }
:

.worldLogic:{
    query = atoms
    set = trigger
}
```

**Load & Run:** two lines — `red` and `hello world`.

---

## Type predicates — filters, not generators

Type predicates are ordinary goals. They succeed when the argument is bound to a term of the expected kind; they **fail** on wrong kind or on an **unbound** variable.

| Predicate | Succeeds when `X` is |
|-----------|-------------------|
| `atom(X)` | An atom (quoted or unquoted) |
| `number(X)` | An integer |
| `float(X)` | A floating-point literal value |
| `list(X)` | A list (including `[]`) |
| `compound(X)` | A compound term (not a list) |

```logts-play
inline [logic] .world:

    sample(10)
    sample("hello")
    sample(red)
    sample([1, 2, 3])
    sample(person(john, 25))

    query numericValues:
        sample(X),
        number(X),
        show(X)

    query atomValues:
        sample(X),
        atom(X),
        show(X)

    query listValues:
        sample(X),
        list(X),
        show(X)

    query compoundValues:
        sample(X),
        compound(X),
        show(X)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = numericValues
    set = trigger
}
```

**Load** the script, set **`query = atomValues`**, **Load & Run** — prints `hello`, `red` (order follows discovery). Switch to **`numericValues`** → `10`; **`listValues`** → `[1, 2, 3]`; **`compoundValues`** → `person(john, 25)`.

---

## Float literals

Floating-point values use decimal syntax: `1.5`, `-0.25`, or `.5` (leading zero optional). They are a **separate kind** from integers — `1` and `1.0` do **not** unify.

```logts-play
inline [logic] .samples:

    sample(1.5)
    sample(42)
    sample(.75)

    query floats:
        sample(X),
        float(X),
        show(X)

    query ints:
        sample(X),
        number(X),
        show(X)

:

1wire trigger = 1

comp [logic] .sampleLogic:
    on: 1
    .samples { }
:

.sampleLogic:{
    query = floats
    set = trigger
}
```

**Load & Run:** two lines — `1.5` and `.75`. Switch **`query = ints`** → prints `42` only.

### Integer vs float comparison

`number/1` succeeds only on integers; `float/1` only on floats. Comparisons treat the kinds separately:

```logts-play
inline [logic] .mix:

    query sameFloat:
        1.5 =:= 1.5

    query diffKind:
        1 =:= 1.0

:

1wire okFloat = .mix:query({ 1.5 =:= 1.5 })
1wire okDiff = .mix:query({ 1 =:= 1.0 })
```

**Load & Run:** **`okFloat = 1`**, **`okDiff = 0`** — `1` and `1.0` are different kinds.

### Float in lists and compounds

```logts-play
inline [logic] .batch:

    row([1.5, 2.0, .5])

    query check:
        row(L)

:

1wire ok = .batch:query({ row(L) })
```

**Load & Run:** **`ok = 1`**.

---

## Goal order matters

Bind first, then filter:

```logts-play
inline [logic] .world:

    score(10)
    score(20)
    score(50)

    validScore(X) <-
        score(X),
        number(X),
        X >= 0,
        X =< 100

    query valid:
        validScore(X),
        show(X)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = valid
    set = trigger
}
```

**Load & Run:** `10`, `20`, `50`.

`number(X)` alone (without `score(X)`) produces **no solutions** — it does not invent integers.

---

## Different kind per solution

The same variable may bind to different kinds across backtracking solutions:

```logts-play
inline [logic] .world:

    sample(10)
    sample("hello")
    sample(red)

    query allSamples:
        sample(X),
        show(X)

:

1wire ok = .world:query({ sample(X), show(X) })
```

**Load & Run** (console or inline query): three lines — `10`, `hello`, `red`.

Add **`number(X)`** in the goal list to keep only numeric solutions.

---

## List vs compound

Lists and compounds are **distinct** kinds:

| Term | `list/1` | `compound/1` |
|------|----------|--------------|
| `[a, b, c]` | ✓ | ✗ |
| `person(a, b)` | ✗ | ✓ |
| `[]` | ✓ | ✗ |

```logts-play
inline [logic] .world:

    query listOk:
        list([a, b])

    query compoundFail:
        compound([a, b])

:

1wire listOk = .world:query({ list([a, b]) })
1wire compoundFail = .world:query({ compound([a, b]) })
```

**Load & Run:** **`listOk = 1`**, **`compoundFail = 0`**.

---

## Container vs element

`list(X)` tests the **container**. To test elements, use list access (for example **`member/2`**) and filter the element:

```logts-play
inline [logic] .world:

    names([red, green, blue])

    query atomNames:
        names(Ns),
        member(N, Ns),
        atom(N),
        show(N)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = atomNames
    set = trigger
}
```

**Load & Run:** `red`, `green`, `blue`.

---

## Lists inside compounds

A compound may contain lists as arguments. The outer term is still **compound**; the list argument is one value:

```logts-play
inline [logic] .world:

    property(boardwalk, 400, [50, 200, 600, 1400, 1700], 200)

    query propertyInfo:
        property(Name, Price, Rents, HotelPrice),
        compound(Rents),
        list(Rents),
        show(Name, Price, Rents)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = propertyInfo
    set = trigger
}
```

**Load & Run:** one line such as `boardwalk 400 [50, 200, 600, 1400, 1700]`.

---

## Wire boundary — text / number / float / bool

On **`comp [logic]`** pins and **`.world:query`**, **`text`**, **`number`**, **`float`**, and **`bool`** describe **how bits on a wire map to logic terms** — not kinds stored in the KB.

| Wire hint | Role |
|-----------|------|
| **`Var=text wire`** | Wire bits → ASCII atom; atom → wire on output |
| **`Var=number wire`** | Wire bits → unsigned integer; integer → wire on output |
| **`Var=number/<format> wire`** | Integer codec — `u8`…`u64`, `s8`…`s64`, `uX` / `sX` only |
| **`Var=float wire`** | Wire bits → IEEE float (`float/X` — `fp16` on 16-bit, `f32` on 32-bit, `f64` on 64-bit) |
| **`Var=float/<format> wire`** | Explicit float codec — `q4p4`, `q8p8`, `qXpY`, `fp16`, `bf16`, `f32`, `f64` |
| **`Var=bool wire`** | 1 bit ↔ 0/1 (packed bool lists on vector wires — see [logic-query-exec.md](logic-query-exec.md)) |

**`number`** without a slash keeps unsigned behaviour. **`number/s8`**, **`number/u32`**, and similar forms select signed or unsigned two's-complement decode/encode. **`number/fp16`**, **`number/q4p4`**, and other fractional formats are rejected — use **`float/fp16`**, **`float/q4p4`**, etc.

**`float`** without a slash uses **`float/X`**: wire element width selects the codec (16 → `fp16`, 32 → `f32`, 64 → `f64`). Packed **`float list`** on a scalar wire uses **32-bit** cells by default (`f32`); use **`float/fp16 list`** for 16-bit packed cells.

Facts in the inline KB use **atoms**, **integers**, and **float literals**; conversion happens at the pin boundary.

### Signed `number/s8` query input

```logts-play
inline [logic] .temps:

    expect(-3)

    query check:
        expect(T)

:

8wire tempIn = 11111101

1wire ok = .temps:query({ expect(T) }, T=number/s8 tempIn)
```

**Load & Run:** **`ok = 1`** — wire `11111101` decodes as **−3** (8-bit two's complement).

### Explicit unsigned `number/u32`

```logts-play
inline [logic] .vals:

    expect(100)

    query check:
        expect(N)

:

32wire valIn = 00000000000000000000000001100100

1wire ok = .vals:query({ expect(N) }, N=number/u32 valIn)
```

**Load & Run:** **`ok = 1`**.

### Explicit format list on a vector wire

```logts-play
inline [logic] .batch:

    row(1, [1, 2])

    query check:
        row(1, L)

:

16wire[2] vecIn = 0000000000000001 + 0000000000000010

1wire ok = .batch:query({ row(1, L) }, L=number/u16 list vecIn)
```

**Load & Run:** **`ok = 1`** — each 16-bit cell uses the `u16` codec.

### Fixed-point `float/q4p4`

Same wire encoding as LogTScript `; q4p4` builtins. The KB holds the **human fractional value** as a float term (e.g. `1.5`).

```logts-play
inline [logic] .fixed:

    expect(1.5)

    query check:
        expect(T)

:

8wire tempIn = 00011000

1wire ok = .fixed:query({ expect(T) }, T=float/q4p4 tempIn)
```

**Load & Run:** **`ok = 1`** — `00011000` decodes to **`1.5`** in the KB.

### IEEE half `float/fp16`

Same wire encoding as LogTScript `; fp16` builtins. The KB holds the **decoded IEEE value** as a float term (e.g. `1.0`).

```logts-play
inline [logic] .half:

    expect(1.0)

    query check:
        expect(T)

:

16wire sensorIn = 0011110000000000

1wire ok = .half:query({ expect(T) }, T=float/fp16 sensorIn)
```

**Load & Run:** **`ok = 1`** — `0011110000000000` decodes to **`1.0`**. Use **`float/bf16`** the same way on `16wire` with bfloat16 bit patterns.

### Default `float` on `32wire` (`float/X` → `f32`)

```logts-play
inline [logic] .vals:

    expect(1.5)

    query check:
        expect(T)

:

32wire sensorIn = 00111111110000000000000000000000

1wire ok = .vals:query({ expect(T) }, T=float sensorIn)
```

**Load & Run:** **`ok = 1`** — no slash needed; 32-bit wire implies **`f32`** decode.

### Packed `float list` (default 32-bit cells)

```logts-play
inline [logic] .batch:

    row(1, [1.0, 2.0])

    query check:
        row(1, L)

:

32wire packed = 0011110000000000 + 0100000000000000

1wire ok = .batch:query({ row(1, L) }, L=float/fp16 list packed)
```

**Load & Run:** **`ok = 1`** — two fp16 values in a 32-bit packed wire.

---

## Query success and `1wire`

Truth/failure at the UI layer is often a **`1wire`** satisfiability result — not a `bool` value inside the KB:

```logts-play
inline [logic] .world:

    score(10)
    score(150)

    okScore(X) <-
        score(X),
        number(X),
        X >= 0,
        X =< 100

:

1wire ok = .world:query({ okScore(_) })
```

**Load & Run:** **`ok = 1`** — at least one solution exists. Negation **`\+ Goal`** uses the same success/failure model.

---

## Logic kinds vs output hints

**`Z=number`** on a query binding is an **output encoding hint** for packing results onto a wire. It does **not** assign a static Prolog type to **`Z`** in the knowledge base:

```logts-play
inline [logic] .world:

    carInfo(toyota, red, 2020, sedan)
    carInfo(ford, blue, 2018, truck)

    query allCarInfos:
        carInfo(X, Y, Z, K)

:

16wire[3] years = .world:query({ carInfo(_, _, Z, _) }, Z=number; sel(2);unique)
1wire hasCars = .world:query({ carInfo(X, Y, Z, K) })
```

**Load & Run:** vector **`years`** holds unique model years (`2020`, `2018`); **`hasCars = 1`**.

Inside the KB, **`Z`** is still a **number term** when bound from `carInfo/4`; the hint only guides wire packing. Details: [logic-query-exec.md](logic-query-exec.md).

---

## Reserved names

You cannot define **`atom/1`**, **`number/1`**, **`float/1`**, **`list/1`**, or **`compound/1`** as fact, rule, or constraint heads — same rule as **`member/2`** and **`is/2`**.

---

## See also

- [inline-logic.md](inline-logic.md) — syntax, variables, compounds  
- [logic-builtins.md](logic-builtins.md) — `member/2`, `is/2`, list builtins  
- [logic-query-exec.md](logic-query-exec.md) — inline query, wire hints, `;sel`  
- [comp-logic.md](comp-logic.md) — redirects and boolean `1wire` results  
- [logic-constraints.md](logic-constraints.md) — `text` / `number` / `bool` on mutation wires  
