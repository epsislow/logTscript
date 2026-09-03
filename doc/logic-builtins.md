# Logic built-ins

Reserved **built-in predicates** in the logic engine — evaluated directly by `comp [logic]` and **`.world:query({ … })`**, not by user clauses.

Related: [inline-logic.md](inline-logic.md) (syntax) · [comp-logic.md](comp-logic.md) (wiring) · [logic-value-types.md](logic-value-types.md) (value kinds, type predicates) · [logic-indexing.md](logic-indexing.md) (`indexFacts`, `count/2` in constraints)

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run**.

---

## Quick reference

| Builtin | Arity | Reserved head | Side effects | Summary |
|---------|-------|---------------|--------------|---------|
| **`show/N`** | 1–32 | yes | yes (output buffer) | Print logic terms |
| **`showx/N`** | 1–32 | yes | yes (output buffer + line color) | Print logic terms with optional **Style** color |
| **`count/2`** | 2 | no¹ | no | Number of solutions to a goal |
| **`nth0/3`** | 3 | yes | no | List element at **0-based** index |
| **`nth1/3`** | 3 | yes | no | List element at **1-based** index |
| **`nth1/4`** | 4 | yes | no | Element at **1-based** index + list suffix after it |
| **`is/2`** | 2 | yes | no | Arithmetic — `+ - * / // ** mod rem`, functions, `min`/`max` |
| **`member/2`** | 2 | yes | no | List membership with backtracking |
| **`append/3`** | 3 | yes | no | Concatenate or decompose lists |
| **`append/2`** | 2 | yes | no | Close a **difference list** `Front-Hole` to a ground list |
| **`string_to_list/2`** | 2 | yes | no | Atom or string literal ↔ list of one-character atoms |
| **`string_to_codes/2`** | 2 | yes | no | Atom or string literal ↔ list of character codes (integers) |
| **`atom_chars/2`** | 2 | yes | no | Atom ↔ list of one-character atoms |
| **`atom_codes/2`** | 2 | yes | no | Atom ↔ list of character codes (integers) |
| **`atom_number/2`** | 2 | yes | no | Atom ↔ integer or float (parse/format numeric text) |
| **`between/3`** | 3 | yes | no | Integer range with backtracking (`Low` … `High` inclusive) |
| **`phrase/2`** | 2 | yes | no | Run a DCG non-terminal on a **closed** list (parse or generate) |
| **`phrase/3`** | 3 | yes | no | Run a DCG non-terminal with explicit **rest**; supports dif-list input |
| **`lazy_list/2`** | 2 | yes | no | Lazy list from `between/3` template or a 2-arg generator rule |
| **`lazy_list_materialize/1`** | 1 | yes | no | Convert a lazy list to a ground cons list |
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
| **`findall/3`** | 3 | yes | no | Collect all template instances for a goal (**`[]`** if none) |
| **`bagof/3`** | 3 | yes | no | Like findall, groups by existential goal vars; **fail** if none |
| **`setof/3`** | 3 | yes | no | Like bagof, then unique + sorted list |
| **`true/0`** | 0 | yes | no | Always succeeds (Prolog-style) |
| **`fail/0`** | 0 | yes | no | Always fails (Prolog-style) |
| **`if/3`** | 3 | yes | no | Soft if-then-else — **not** OR; see [inline-logic.md](inline-logic.md#if-then-else-if3) |
| **`atom/1`** | 1 | yes | no | Type test — argument is an atom |
| **`number/1`** | 1 | yes | no | Type test — argument is an integer |
| **`float/1`** | 1 | yes | no | Type test — argument is a float |
| **`list/1`** | 1 | yes | no | Type test — argument is a list |
| **`compound/1`** | 1 | yes | no | Type test — argument is a compound (not a list) |
| **`random/1`** | 1 | yes | yes (RNG) | Uniform random float in **`[0.0, 1.0)`** |
| **`random_between/3`** | 3 | yes | yes (RNG) | Uniform random in **`[Low, High]`** — integer or float |
| **`set_random/1`** | 1 | yes | yes (RNG) | Reseed the global RNG (integer seed) |

Type predicates filter bound terms — see [logic-value-types.md](logic-value-types.md).

¹ Only **`count/2`** is intercepted — other arities named `count` remain user predicates.

**Scope:** all builtins work in rule bodies, named queries, constraint bodies, **`.world:query({ … })`**, and **`.world:check({ … })`**, except **`if/3`** (forbidden in inline **`:query`** blocks).

**Not in this table:** **`!`** (cut), **`\+`** (negation), and **`||`** (OR) are goal operators — see [inline-logic.md](inline-logic.md). **`true/0`**, **`fail/0`**, and **`if/3`** are in the table above.

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

## `showx/N`

Print logic terms to the run **output buffer** with an optional **line color** from the first argument **`Style`**. Same formatting rules as **`show/N`** for the remaining arguments. Not the top-level script **`show(wire)`** statement.

| | **Logic `showx/N`** | **Logic `show/N`** |
|--|---------------------|---------------------|
| First argument | **`Style`** — hex color when ground (not printed) | First term to print |
| Remaining args | Terms to print (space-separated) | Terms to print |
| Invalid / unbound `Style` | Plain line (same text as `show` on those terms) | — |
| `show("fff")` | — | Prints text **`fff`** (not a color) |

**Behaviour:**

- **`N`** from **1** to **32**. With **`N ≥ 2`**, first argument is **`Style`**, remaining arguments are terms to print.
- **`showx()`** with zero arguments → **parse error**.
- **`showx(Style)`** alone (style-only, no content terms):
  - **`x`** or **`x`+`hex`** (`xfff`, `xff0000`, …) → **clear Output panel**, **no** new line (color ignored when hex follows **`x`**).
  - ground **hex** only (`fff`, `ff0000`, …) → **no-op** (succeeds, no output change).
  - invalid / unbound **`Style`** → **no-op**.
- Always **succeeds**; does not fail the surrounding query when `Style` is invalid or unbound.
- **`Style`** accepts a ground **atom** or **string literal** with **3** or **6** hexadecimal digits (`fff`, `ff0000`, case-insensitive). Normalized to CSS `#rgb` / `#rrggbb` in the Output panel.
- Optional **clear** prefix **`x`** (lowercase only) in **`Style`** clears the **Output panel** before printing the line. Valid forms: **`hex`**, **`x`** (clear, plain line), **`x`+`hex`** (clear then color). Examples: `xfff`, `x`, `xff0000`. Invalid spellings (`fffx`, `xxfff`, `xf0f0f`, `Xfff`, …) ignore the entire style — plain line, **no** clear.
- Atoms whose spelling starts with a **digit** (for example **`00f`**) are read as numbers, not colors — use a **string literal** (`"00f"`) or a letter-first atom (`f00`).
- **`Style`** is never printed. Content terms join with a single space (no leading space before the first printed term).
- Each line’s color is independent — a following **`show/…`** does not inherit color from **`showx/…`**.
- On **backtracking**, prints again for each branch (color re-evaluated when `Style` is a variable).
- Cannot be used as a fact, rule, or constraint **head**. Not allowed inside **`commit/…`**.

### Example — ground atom Style

```logts-play
inline [logic] .game:

    query banner:
        showx(fff, "=== START ===")

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = banner
    set = trigger
}
```

**Load & Run:** one Output line **`=== START ===`** displayed in color **`#fff`**.

### Example — ground string Style

```logts-play
inline [logic] .game:

    query err:
        showx("ff0000", "error:", Code),
        show("detail:", Msg)

    error(code(404), "not found")

    query run:
        error(Code, Msg)

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = run
    set = trigger
}
```

**Load & Run:** first line **`error: code(404)`** in **`#ff0000`**; second line **`detail: not found`** in the default Output color.

### Example — variable `MyColor` (dynamic Style)

```logts-play
inline [logic] .game:

    player_color(p1, fff)
    player_color(p2, "00f")

    query turn:
        player_color(P, MyColor),
        showx(MyColor, "turn:", P)

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = turn
    set = trigger
}
```

**Load & Run:** two lines — **`turn: p1`** in **`#fff`**, **`turn: p2`** in **`#00f`** (one line per backtracking solution).

**Dynamic `Style`:** bind **`Style`** in a **separate goal** before **`showx/…`**. There is no conditional **expression** inside arguments — **`if/3`** is control flow, not a term (see [logic-builtins — `if/3`](#if3--soft-if-then-else)). Use a **`color_style/2`** fact table or **multiple rule clauses** (below).

### Example — `color_style/2` map (controlled Style per atom)

```logts-play
inline [logic] .world:

    colors([red, green, blue])
    color_style(red, f00)
    color_style(green, ff0)
    color_style(blue, "00f")
    walk([]) <- show("done")
    walk([H | T]) <- color_style(H, C), showx(C, H), walk(T)

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

**Load & Run:** three colored lines — **`red`** in **`#f00`**, **`green`** in **`#ff0`**, **`blue`** in **`#00f`** — then plain **`done`**.

### Example — multiple clauses (one `showx` Style per color)

```logts-play
inline [logic] .world:

    colors([red, green, blue])

    walk([]) <- show("done")

    walk([H | T]) <- H = red, showx(f00, H), walk(T)
    walk([H | T]) <- H = green, showx(ff0, H), walk(T)
    walk([H | T]) <- H = blue, showx("00f", H), walk(T)

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

**Load & Run:** same Output as the **`color_style/2`** example — three colored atom names, then **`done`**.

### Example — non-hex Style (plain fallback)

```logts-play
inline [logic] .game:

    query q:
        showx(red, "status:", ok)

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = q
    set = trigger
}
```

**Load & Run:** **`status: ok`** in the default Output color — atom **`red`** is not a hex code, so **`showx`** behaves like **`show("status:", ok)`** for the text.

### Example — clear Output then color (`xfff`)

```logts-play
inline [logic] .game:

    query banner:
        show("old"),
        showx(xfff, "=== START ===")

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = banner
    set = trigger
}
```

**Load & Run:** Output panel is cleared first; only **`=== START ===`** remains, in color **`#fff`**. The earlier **`old`** line is removed.

### Example — clear plain line (`x`)

```logts-play
inline [logic] .game:

    query reset:
        showx(x, "ready")

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = reset
    set = trigger
}
```

**Load & Run:** Output cleared; one plain line **`ready`**.

### Example — clear Output only (`showx/1`)

Use **`showx(x)`** or **`showx(xfff)`** when you need to reset the Output panel **without** printing a line (UI control before later **`showx/…`** or **`show/…`** goals).

```logts-play
inline [logic] .game:

    query screen:
        show("old"),
        showx(x),
        showx(fff, "fresh")

:

comp [logic] .gameLogic:
    on: 1
    .game { }
:

1wire trigger = 1

.gameLogic:{
    query = screen
    set = trigger
}
```

**Load & Run:** **`old`** is removed; one line **`fresh`** in color **`#fff`**. **`showx(fff)`** alone (hex **`Style`**, no content) would be a **no-op**.

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

### `nth1/4` — element and suffix

**`nth1(I, List, Elem, Rest)`** — like **`nth1/3`**, but **`Rest`** is unified with the list **after** the element at **`I`** (1-based).

| Call | Result |
|------|--------|
| `nth1(1, [a, b, c], X, R)` | `X = a`, `R = [b, c]` |
| `nth1(3, [a, b, c], X, R)` | `X = c`, `R = []` |
| `nth1(4, [a, b, c], X, R)` | **Fail** (out of range) |

**`I`** may be a variable (backtracking). Open or partial lists **fail** when the spine is not ground enough to reach **`I`**.

#### Example — split a route at the second step

```logts-play
inline [logic] .route:

    query split:
        nth1(2, [start, path, end], Mid, Tail),
        show(Mid),
        show(Tail)

:

comp [logic] .routeLogic:
    on: 1
    .route { }
:

1wire trigger = 1

.routeLogic:{
    query = split
    set = trigger
}
```

**Load & Run** prints **`path`** then **`[end]`**.

#### Example — generative length + indexing

Build a list of known length, then pin the first cell (see also [`length/2`](#length2)):

```logts-play
inline [logic] .world:

    query q:
        length(L, 3),
        nth1(1, L, first, Rest),
        first = red,
        show(Rest)

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

**Load & Run** prints a two-cell suffix starting with anonymous variables (e.g. **`[_, _]`**).

---

## `is/2`

Arithmetic evaluation in logic bodies. Also written infix: **`M is Expr`**.

**Reserved:** **`is/2`** cannot be a fact, rule, or constraint head. **`is/1`**, **`is/3`**, atom **`is`**, etc. remain ordinary terms.

| Goal | When `N` is free in `N + 1` | Use |
|------|----------------------------|-----|
| `M = N + 1` | **`M`** ← structure `+(N, 1)` | Unification |
| `M is N + 1` | **Fail** | Arithmetic |
| `M =:= N + 1` | **Fail** | Numeric equality test |

RHS must fully evaluate. Free variables, divide-by-zero, **`sqrt`** of a negative number, or other invalid numeric operations → **fail**.

| Expression kind | Result kind | Notes |
|-----------------|-------------|-------|
| All integers | **`number`** | e.g. **`7 / 2`** → **`3`** (trunc toward zero) |
| Any float operand | **`float`** | int promotes when mixed (e.g. **`10 + 1.5`** → **`11.5`**) |
| **`min`/`max` both int** | **`number`** | e.g. **`max(2, 3)`** → **`3`**, not **`3.0`** |
| **`min`/`max` with float** | **`float`** | e.g. **`max(2, 3.0)`** → **`3.0`** |

**Operators** (tightest binding first): **`**`** (right-associative) → **`*` `/` `//`** → **`+` `-`** → **`mod` `rem`**. Parentheses **`( … )`** group sub-expressions.

| Operator | Meaning |
|----------|---------|
| **`+` `-` `*` `/`** | Addition, subtraction, multiplication, division |
| **`//`** | Integer division — truncates toward zero |
| **`**`** | Exponentiation |
| **`mod`** | Remainder; sign of result follows the **divisor** (SWI-style) |
| **`rem`** | Remainder; sign of result follows the **dividend** (SWI-style) |

**Functions** in expressions (not separate goals): **`abs(X)`**, **`sqrt(X)`**, **`floor(X)`**, **`ceiling(X)`**, **`round(X)`**, **`truncate(X)`**, **`min(A, B)`**, **`max(A, B)`**.

| Function | Notes |
|----------|-------|
| **`sqrt(X)`** | **`sqrt(9)`** → integer **`3`**; non-perfect square → **float**; negative → **fail** |
| **`floor`/`ceiling`/`round`/`truncate`** | Integer operand → integer; float → integer when exact, else float |

**Meta-call:** **`call(is(X, Expr))`** is equivalent to **`X is Expr`** — see [`call/1`](#call1) below.

See also [inline-logic.md — `=` vs `is/2`](inline-logic.md#arithmetic-is2) for the full contrast table.

### Example — counter (integer)

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

### Example — float scaling

```logts-play
inline [logic] .world:

    scale(A, B) <- B is A * 2.0

    query q:
        scale(1.5, R),
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

**Load & Run** prints **`3`** (float `3.0` displayed as `3`).

### Example — power and integer division

```logts-play
inline [logic] .world:

    query q:
        P is 2 ** 10,
        Q is 7 // 2,
        show("power", P),
        show("idiv", Q)

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

**Load & Run** prints **`power 1024`** then **`idiv 3`**.

### Example — `mod`, `rem`, and `sqrt`

```logts-play
inline [logic] .world:

    query q:
        M is (-7) mod 3,
        R is (-7) rem 3,
        S is sqrt(9),
        show("mod", M),
        show("rem", R),
        show("sqrt", S)

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

**Load & Run** prints **`mod 2`**, **`rem -1`**, **`sqrt 9`**.

### Example — `min`/`max` (integer stays integer)

```logts-play
inline [logic] .world:

    query q:
        A is max(2, 3),
        B is max(2, 3.0),
        show("int", A),
        show("mixed", B)

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

**Load & Run** prints **`int 3`** then **`mixed 3`** (float **`3.0`** displayed as **`3`**).

### Example — `call(is/2)` meta-call

```logts-play
inline [logic] .world:

    query q:
        call(is(T, 10 + 5)),
        show(T)

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

**Load & Run** prints **`15`**.

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

## Difference lists (`Front-Hole`) and `append/2`

A **difference list** pairs a list **front** with a **hole** variable — the open tail where more elements attach. Write it as **`Front - Hole`** (spaces around **`-`** are optional).

| Form | Meaning |
|------|---------|
| `[a, b \| H] - H` | Prefix **`a`**, **`b`**; **`H`** is the open tail (same variable at the hole) |
| `H = []` | Close the hole with an empty suffix |
| `H = [c, d \| T]` | Attach suffix **`[c, d]`** at the hole |

**`append(DifList, Closed)`** succeeds when **`Closed`** is the **closed** list obtained from **`DifList`** after the hole is bound (typically to **`[]`** or a suffix list).

| Call | Result |
|------|--------|
| `DL = [a, b \| H] - H`, `H = []`, `append(DL, C)` | `C = [a, b]` |
| `DL = [a \| H] - H`, `H = [b, c \| []]`, `append(DL, C)` | `C = [a, b, c]` |
| `append(L3, L3)` with `L3` a closed list var | Binds **`L3-Hole`** with **`Hole = []`** |

**`append/3`** (above) is unchanged — ordinary list concatenation. **`append/2`** is only for difference lists.

**Occurs-check:** cyclic terms such as **`X = [X | _] - H`** fail (no infinite lists).

### Example — incremental build + close

```logts-play
inline [logic] .builder:

    query sentence:
        DL = [i, like, mon | H] - H,
        H = [poly, board | T],
        T = [],
        append(DL, Closed),
        show(Closed)

:

comp [logic] .builderLogic:
    on: 1
    .builder { }
:

1wire trigger = 1

.builderLogic:{
    query = sentence
    set = trigger
}
```

**Load & Run** prints **`[i, like, mon, poly, board]`**.

### Example — open difference list in `show`

```logts-play
inline [logic] .dl:

    query open:
        DL = [north, east | Rest] - Rest,
        show(DL)

:

comp [logic] .dlLogic:
    on: 1
    .dl { }
:

1wire trigger = 1

.dlLogic:{
    query = open
    set = trigger
}
```

**Load & Run** prints an open form such as **`[north, east|Rest]-Rest`** while **`Rest`** is still free.

### Example — `append/2` with closed difference list

```logts-play
inline [logic] .dl:

    query close:
        DL = [a, b | H] - H,
        H = [],
        append(DL, Closed),
        show(Closed)

:

comp [logic] .dlLogic:
    on: 1
    .dl { }
:

1wire trigger = 1

.dlLogic:{
    query = close
    set = trigger
}
```

**Load & Run** prints **`[a, b]`**.

---

## Character and code conversion

These builtins convert between **atoms** (including **`"..."` string literals**) and lists. Conversion is **explicit** — **`"ab" = [a, b]`** does **not** unify; use a builtin instead.

| Builtin | List element type | Typical use |
|---------|-------------------|-------------|
| **`string_to_list/2`** | one-character **atoms** | **`"Hello"`** ↔ **`[H, e, l, l, o]`** |
| **`string_to_codes/2`** | **integers** (character codes) | **`"Hi"`** ↔ **`[72, 105]`** |
| **`atom_chars/2`** | one-character **atoms** | **`hello`** ↔ **`[h, e, l, l, o]`** |
| **`atom_codes/2`** | **integers** | **`hi`** ↔ **`[104, 105]`** |

All four are **bidirectional** when one argument is a variable and the other is ground. Both arguments cannot be variables. Open or partial lists fail.

**`string_to_*`** is intended for **`"..."` literals** (stored as atoms with string display). **`atom_*`** works with any atom name, including lowercase identifiers such as **`toyota`**.

### Example — `string_to_list/2` and `string_to_codes/2`

```logts-play
inline [logic] .text:

    query chars:
        string_to_list("ab", Chars),
        show(Chars)

    query codes:
        string_to_codes("Hi", Cs),
        show(Cs)

:

comp [logic] .textLogic:
    on: 1
    .text { }
:

1wire trigger = 1

.textLogic:{
    query = chars
    set = trigger
}
```

**Load & Run** prints **`[a, b]`**. Use **Load**, set **`query = codes`**, **Load & Run** to print **`[72, 105]`**.

### Example — build an atom from a character list

```logts-play
inline [logic] .brand:

    query make:
        atom_chars(Word, [t, o, y, o, t, a]),
        show(Word)

:

comp [logic] .brandLogic:
    on: 1
    .brand { }
:

1wire trigger = 1

.brandLogic:{
    query = make
    set = trigger
}
```

**Load & Run** prints **`toyota`**.

### Example — `atom_number/2` (parse and format)

Bidirectional conversion between a numeric **atom** (typically a **`"..."` string literal**) and an **integer** or **float** value. Integer text such as **`"42"`** yields **`kind: number`**; fractional text such as **`"1.5"`** or **`".5"`** yields **`kind: float`**. Scientific notation (for example **`"1e10"`**) is **not** accepted (same rule as float literals in [logic-value-types.md](logic-value-types.md)). **`1`** and **`1.0`** remain distinct kinds — **`atom_number("42", 1.5)`** fails.

```logts-play
inline [logic] .num:

    query parseInt:
        atom_number("42", N),
        show(N)

    query parseFloat:
        atom_number("1.5", F),
        show(F)

    query format:
        atom_number(A, 1.5),
        show(A)

:

comp [logic] .numLogic:
    on: 1
    .num { }
:

1wire trigger = 1

.numLogic:{
    query = parseInt
    set = trigger
}
```

**Load & Run** prints **`42`**. Use **Load**, set **`query = parseFloat`**, **Load & Run** to print **`1.5`**. Set **`query = format`** to print **`"1.5"`**.

### Example — `atom_codes/2` round-trip

```logts-play
inline [logic] .codes:

    query round:
        atom_codes(hi, Cs),
        show(Cs)

    query back:
        atom_codes(Word, [104, 105]),
        show(Word)

:

comp [logic] .codesLogic:
    on: 1
    .codes { }
:

1wire trigger = 1

.codesLogic:{
    query = round
    set = trigger
}
```

**Load & Run** prints **`[104, 105]`**. Switch to **`query = back`** to print **`hi`**.

### Example — reverse with `string_to_list/2`

```logts-play
inline [logic] .text:

    query word:
        string_to_list(Word, [g, o]),
        show(Word)

:

comp [logic] .textLogic:
    on: 1
    .text { }
:

1wire trigger = 1

.textLogic:{
    query = word
    set = trigger
}
```

**Load & Run** prints **`"go"`** (a string literal atom).

### Example — `string_to_codes/2` round-trip

```logts-play
inline [logic] .text:

    query round:
        string_to_codes("Go", Cs),
        string_to_codes(Word, Cs),
        show(Word)

:

comp [logic] .textLogic:
    on: 1
    .text { }
:

1wire trigger = 1

.textLogic:{
    query = round
    set = trigger
}
```

**Load & Run** prints **`"Go"`** after decoding the code list.

---

## DCG — `phrase/2` and `phrase/3`

**`phrase(Goal, List)`** and **`phrase(Goal, List, Rest)`** invoke **Definite Clause Grammar** rules compiled from **`-->`** necks in `inline [logic]`. They are the usual way to **parse** or **generate** token lists.

| Form | Role |
|------|------|
| **`phrase(Goal, List)`** | Equivalent to **`phrase(Goal, List, [])`** — closed input or output list |
| **`phrase(Goal, List, Rest)`** | **`Goal`**: DCG non-terminal (**atom** for //0, **compound** for //1). **`List`**: start position. **`Rest`**: unconsumed suffix (empty when fully consumed). |

When **`List`** is a **difference list** **`Front - Hole`**, **`Rest`** unifies with **`Hole`** and parsing starts from **`Front`**.

Both builtins are **bidirectional**. Heads **`phrase/2`** and **`phrase/3`** are **reserved** — you cannot define your own clauses with those names.

Full syntax, expansion, and runnable examples: **[logic-dcg.md](logic-dcg.md)**.

### Example — `phrase/2` parse

```logts-play
inline [logic] .grammar:

    digits([D | Ds]) --> [D], { between(0, 9, D) }, digits(Ds)
    digits([])       --> []

    query parse:
        phrase(digits([1, 2, 3]), [1, 2, 3]),
        show(ok)

:

comp [logic] .grammarLogic:
    on: 1
    .grammar { }
:

1wire trigger = 1

.grammarLogic:{
    query = parse
    set = trigger
}
```

**Load & Run** prints **`ok`**.

---

## Lazy lists and `between/3`

**`between(Low, High, Value)`** generates integers from **`Low`** through **`High`** (inclusive) with backtracking when **`Value`** is a variable. **`Low > High`** fails. All three arguments must be integers when ground.

**`lazy_list(List, Source)`** builds a **lazy list** that is expanded on demand (for example when **`member/2`** walks it). Two source forms are supported:

| Source form | Example | Meaning |
|-------------|---------|---------|
| **Goal template** | `between(1, 10, X)` | Numeric range lazy list (sugar over **`between/3`**) |
| **Generator atom** | `chunk` | Calls user rule **`chunk(Slice, Tail)`** repeatedly; each **`Slice`** is a ground list chunk, **`Tail = []`** when done |

**`lazy_list_materialize/1`** converts a lazy list into a normal ground cons list.

### Integration rules

| Builtin | On lazy lists |
|---------|----------------|
| **`member/2`** | Supported — walks the stream with backtracking |
| **`length/2`** | Supported for **`between`** lazy lists (known finite size); **fail** on rule generators |
| **`show/N`** | Prints a marker such as **`lazy(between(1, 3))`** or **`lazy(chunk)`** |
| **`sort/2`**, **`maplist/2`**, **`append/3`**, … | **Fail** — eager builtins do not accept lazy lists |

Lazy lists do **not** unify with ordinary cons lists until **`lazy_list_materialize/1`**.

### Example — `between/3`

```logts-play
inline [logic] .nums:

    query range:
        between(1, 3, N),
        show(N)

:

comp [logic] .numsLogic:
    on: 1
    .nums { }
:

1wire trigger = 1

.numsLogic:{
    query = range
    set = trigger
}
```

**Load & Run** prints **`1`**, then **`2`**, then **`3`** (one line per solution when stepping, or combined output depending on query policy).

### Example — `lazy_list/2` with `between/3` and `member/2`

```logts-play
inline [logic] .nums:

    query pick:
        lazy_list(Xs, between(1, 3, X)),
        member(Y, Xs),
        show(Y)

:

comp [logic] .numsLogic:
    on: 1
    .nums { }
:

1wire trigger = 1

.numsLogic:{
    query = pick
    set = trigger
}
```

**Load & Run** prints **`1`**, **`2`**, **`3`**.

### Example — rule generator

```logts-play
inline [logic] .chunks:

    chunk(Slice, Tail) <- Slice = [a, b], Tail = []
    chunk(Slice, Tail) <- Slice = [c], Tail = []

    query pick:
        lazy_list(Xs, chunk),
        member(Y, Xs),
        show(Y)

:

comp [logic] .chunksLogic:
    on: 1
    .chunks { }
:

1wire trigger = 1

.chunksLogic:{
    query = pick
    set = trigger
}
```

**Load & Run** prints **`a`**, **`b`**, **`c`** across solutions.

### Example — materialize and `length/2`

```logts-play
inline [logic] .nums:

    query mat:
        lazy_list(Xs, between(1, 4, X)),
        length(Xs, N),
        lazy_list_materialize(Xs),
        show(N, Xs)

:

comp [logic] .numsLogic:
    on: 1
    .nums { }
:

1wire trigger = 1

.numsLogic:{
    query = mat
    set = trigger
}
```

**Load & Run** prints **`4`** and **`[1, 2, 3, 4]`**.

### Example — show lazy form

```logts-play
inline [logic] .nums:

    query showLazy:
        lazy_list(Xs, between(1, 2, X)),
        show(Xs)

:

comp [logic] .numsLogic:
    on: 1
    .nums { }
:

1wire trigger = 1

.numsLogic:{
    query = showLazy
    set = trigger
}
```

**Load & Run** prints **`lazy(between(1, 2))`**.

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

## `findall/3`, `bagof/3`, and `setof/3`

Solution aggregators — collect answers from a template goal into a list. All three take:

| Argument | Role |
|----------|------|
| **`Template`** | Term built for **each** successful goal solution (free variables captured per solution) |
| **`Goal`** | Callable compound goal (same shape as **`call/1`**) |
| **`List`** | Output list (or ground list to verify) |

### Comparison at a glance

| Builtin | Zero solutions | Existential vars in **`Goal`** | Duplicates | Order |
|---------|----------------|--------------------------------|------------|-------|
| **`findall/3`** | **`[]`** (succeeds) | Ignored — all solutions in one list | Kept | Goal order |
| **`bagof/3`** | **Fail** | Grouped — **backtracks** per binding | Kept per group | Goal order per group |
| **`setof/3`** | **Fail** | Same grouping as **`bagof/3`** | Removed | Sorted (standard term order) |

**Existential variables** = variables appearing in **`Goal`** but **not** in **`Template`**, and still **free** when the aggregator runs. Each distinct binding produces a separate **`bagof/3`** or **`setof/3`** solution.

**Cut** inside **`Goal`** does not escape the aggregator (same barrier as **`call/1`**).

### Example — `findall/3` collects every solution

```logts-play
inline [logic] .deck:

    query allCards:
        findall(Card, member(Card, [ace, king, queen]), Hand),
        show(Hand)

:

comp [logic] .deckLogic:
    on: 1
    .deck { }
:

1wire trigger = 1

.deckLogic:{
    query = allCards
    set = trigger
}
```

**Load & Run** prints **`[ace, king, queen]`**.

### Example — `findall/3` with no solutions

```logts-play
inline [logic] .deck:

    query empty:
        findall(Card, member(Card, []), Hand),
        show(Hand)

:

comp [logic] .deckLogic:
    on: 1
    .deck { }
:

1wire trigger = 1

.deckLogic:{
    query = empty
    set = trigger
}
```

**Load & Run** prints **`[]`** — **`findall/3`** always succeeds.

### Example — compound template

```logts-play
inline [logic] .tags:

    query labelled:
        findall(tag(Color), member(Color, [red, blue]), Tags),
        show(Tags)

:

comp [logic] .tagsLogic:
    on: 1
    .tags { }
:

1wire trigger = 1

.tagsLogic:{
    query = labelled
    set = trigger
}
```

**Load & Run** prints **`[tag(red), tag(blue)]`**.

### Example — `findall/3` vs `bagof/3` (existential grouping)

Same facts, different aggregation:

```logts-play
inline [logic] .party:

    likes(mary, food)
    likes(mary, wine)
    likes(john, beer)

    query allItems:
        findall(Item, likes(Person, Item), Items),
        show("findall:", Items)

    query perPerson:
        bagof(Item, likes(Person, Item), Items),
        show("bagof person:", Person),
        show("bagof items:", Items)

:

comp [logic] .partyLogic:
    on: 1
    .party { }
:

1wire trigger = 1

.partyLogic:{
    query = allItems
    set = trigger
}
```

**Load & Run** with **`allItems`** prints **`findall: [food, wine, beer]`** — every item, one list.

Switch **`query = perPerson`** to see **`bagof`** backtrack: first **`mary`** with **`[food, wine]`**, then **`john`** with **`[beer]`**.

### Example — `bagof/3` with a pre-bound variable

When **`Person`** is already bound, grouping collapses to a single bag:

```logts-play
inline [logic] .party:

    likes(mary, food)
    likes(mary, wine)
    likes(john, beer)

    query maryOnly:
        Person = mary,
        bagof(Item, likes(Person, Item), Items),
        show(Items)

:

comp [logic] .partyLogic:
    on: 1
    .party { }
:

1wire trigger = 1

.partyLogic:{
    query = maryOnly
    set = trigger
}
```

**Load & Run** prints **`[food, wine]`**.

### Example — `setof/3` removes duplicates and sorts

```logts-play
inline [logic] .votes:

    query ranked:
        setof(Color, member(Color, [green, red, blue, red, green]), Unique),
        show(Unique)

:

comp [logic] .votesLogic:
    on: 1
    .votes { }
:

1wire trigger = 1

.votesLogic:{
    query = ranked
    set = trigger
}
```

**Load & Run** prints **`[blue, green, red]`** — duplicates dropped, standard term order.

### Example — collect unique players from facts

```logts-play
inline [logic] .scores:

    scored(alice, 10)
    scored(bob, 5)
    scored(alice, 3)
    scored(carol, 7)

    query leaders:
        setof(Player, scored(Player, _), Players),
        show(Players)

:

comp [logic] .scoresLogic:
    on: 1
    .scores { }
:

1wire trigger = 1

.scoresLogic:{
    query = leaders
    set = trigger
}
```

**Load & Run** prints **`[alice, bob, carol]`**.

---

## `true/0` and `fail/0`

Prolog-style **control goals** with no arguments.

| Builtin | Behaviour |
|---------|-----------|
| **`true`** | Always **succeeds** — continues to the next goal in the body |
| **`fail`** | Always **fails** — the current path stops (no solutions through this branch) |

**Reserved heads:** you cannot define **`true/0`** or **`fail/0`** as fact, rule, or constraint heads.

**Notes:**

- Replaces the old idiom **`X = X`** for a trivial success goal.
- **`\+ fail`** succeeds (negation as failure over a goal that never succeeds).
- Other arities named **`true`** or **`fail`** (e.g. **`true(X)`**) are **not** builtins — they remain ordinary user predicates if you define them.

### Example — `true` in a rule body

```logts-play
inline [logic] .world:

    always_ok() <- true

    query check:
        always_ok(),
        member(C, [red, green]),
        show(C)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

1wire trigger = 1

.worldLogic:{
    query = check
    set = trigger
}
```

**Load & Run** prints **`red`** then **`green`**.

### Example — `fail` blocks a branch

```logts-play
inline [logic] .gate:

    query blocked:
        fail,
        show("never")

    query open:
        true,
        show("ok")

:

comp [logic] .gateLogic:
    on: 1
    .gate { }
:

1wire trigger = 1

.gateLogic:{
    query = open
    set = trigger
}
```

**Load & Run** prints **`ok`**. Switch to **`query = blocked`** — no output (query fails).

---

## `if/3` — soft if-then-else

Reserved control-flow builtin — **not** logical OR (use **`||`** in rule bodies for that).

```logts
if(Cond, Then, Else)
```

| Argument | Form | Semantics |
|----------|------|-----------|
| **Cond** | goal or **`( g1, g2, … )`** | AND-sequence — if it **succeeds**, only **Then** runs |
| **Then** | goal or **`( … )`** | Runs when **Cond** succeeded |
| **Else** | goal or **`( … )`** | Runs when **Cond** **failed** |

**Soft cut:** when **Cond** succeeds but **Then** fails, the engine does **not** execute **Else**.

**Parse rules:**

- Exactly **three** arguments at the top level — use **`( … )`** inside an argument for multiple goals.
- **`if(a, b, c, d)`** is an error (too many top-level commas).

**Reserved head:** cannot define **`if/3`** as fact, rule, or constraint head.

**Inline query:** **`if/3`** is **not** allowed inside **`.world:query({ … })`** — elaboration error.

**Side effects:** **`show/N`** on the branch **not taken** does not run (same as Prolog).

**Mutations:** **`commit(…)`** and **`+` / `-` / `~`** may appear in **Then** / **Else** on **`comp [logic]`** (same store as [logic-runtime.md](logic-runtime.md)). **`||`** between two **`commit`** goals is **allowed** — effects from an earlier branch may persist after backtrack; prefer **`if/3`** when you need a single deterministic choice.

**Prolog alternative:** two clauses + **`!`** + **`call/1`** — same soft if-then-else as **`if(call(Cond), true, Else)`**; see [inline-logic.md — Prolog-style equivalent](inline-logic.md#prolog-style-equivalent--two-clauses--).

### Example — allowed vs denied (Load & Run)

```logts-play
inline [logic] .gate:

    canGo()

    msg() <- if(
        canGo(),
        show("go"),
        show("stop")
    )

    query run:
        msg()

:

comp [logic] .gateLogic:
    on: 1
    .gate { }
:

1wire trigger = 1

.gateLogic:{
    query = run
    set = trigger
}
```

**Load & Run** prints **`go`**. Delete **`canGo()`** and run again — prints **`stop`**.

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

## `random/1`, `random_between/3`, and `set_random/1`

Random numbers for dice, jitter, simulation, and game logic. The engine uses one **working** mulberry32 generator; each **`comp [logic]`** with **`randomSeed:`** saves/restores the generator **internal state** (`logicRngGetState` / `logicRngSetState`) across exec passes so streams are **independent per component** and **continue** between triggers. Use **`set_random/1`** in a query for an explicit reset within that component's stream.

| Builtin | Arguments | Result |
|---------|-----------|--------|
| **`set_random(+Seed)`** | **`Seed`** ground integer **0 … 4294967295** | Reseeds the generator |
| **`random(-R)`** | **`R`** variable or ground float | **`R`** ∈ **`[0.0, 1.0)`** (float) |
| **`random_between(+Low, +High, -Out)`** | Integer or float bounds | Uniform in **`[Low, High]`** inclusive |

**Kind rules for `random_between/3`:**

| **`Low` / `High` / `Out`** | Behaviour |
|----------------------------|-----------|
| All **integers** | **`Out`** is an integer (same as classic dice / board logic) |
| **Any** bound or **`Out`** is **float** | **`Out`** is a **float** on the real interval |

**Rules (all three builtins):**

- Ground bounds required — free **`Low`** or **`High`** → **fail**.
- **`Low` > `High`** → **fail** (not an engine error).
- **Backtracking:** re-satisfying the same random goal returns the **same** value (SWI-style impure semantics).
- **`set_random/1`** in a query overrides the generator; later **`set_random/1`** in the same query wins.
- **Reserved heads:** you cannot define **`random/1`**, **`random_between/3`**, or **`set_random/1`** as fact, rule, or constraint heads.

**Component seed:** optional **`randomSeed:`** on **`comp [logic]`** — integer literal or **number wire (≤ 32 bits)**. Applied on the component's **first** exec pass (or when a seed **wire** changes); later passes **continue** the stream. See [comp-logic.md — `randomSeed:`](comp-logic.md#component-attributes).

### RNG state — `comp [logic]` exec vs `:query` / `:check`

The engine keeps one **working** internal RNG state (mulberry32 **`a`**, exposed via **`logicRngGetState` / `logicRngSetState`**). Behaviour depends on **how** logic runs:

| Path | Resets / restores per component? | Uses |
|------|-----------------------------------|------|
| **`comp [logic]` exec** (`.logic:{ query=… set=trigger }`, **`logic { }`**, named queries) | **Yes** — save/restore **`comp._rngState`** around each exec pass; **`randomSeed:`** sets the **initial** state on first pass | Per-component stream (F104) |
| **`.module:query({ … })`** ([logic-query-exec.md](logic-query-exec.md)) | **No** | **Global** working state — continues from whatever the last logic call left |
| **`.logicComp:check({ … })`** ([comp-logic.md — check](comp-logic.md#constraint-check---whlogiccheck---)) | **No** | **Global** working state — including **`random_between/3`** (or rules) in **constraint bodies** during validation of simulated **`+`** facts |

**`:query` and `:check` do not reset internal seed/state** and do **not** apply **`randomSeed:`** on a component (even when the inline program is also wired through **`comp [logic]`**). Each **`random_between/3`**, **`random/1`**, or **`set_random/1`** in those paths reads/advances the **global** generator.

- If logic (or **`set_random/1`**) ran before, the next **`:query`** or **`:check`** continues from that **remaining** internal state — with or without a **`comp [logic]`** in the script.
- If nothing has touched the generator yet, the default internal state is **`0`** (same as **`logicEnsureRng()`** before the first draw).
- **`set_random(Seed)`** inside a **`:query`** goal block resets the **global** stream for that invocation (and leaves the advanced state for the next call).

To get a **deterministic** draw from **`:query`**, include **`set_random(Seed)`** in the goal block. For reproducible dice across **hot-seat triggers**, use **`comp [logic]`** with **`randomSeed:`** (and optionally **`set_random/1`** in **`initGame()`**-style rules for an explicit game reset).

**Component exec after `:query` / `:check`:** the next **`comp [logic]`** exec **restores** its saved **`comp._rngState`**, not the global state left by **`:query`** / **`:check`**. Mixing both paths can advance the global stream without updating a component's saved state until that component runs again.

### Example — unit float with `random/1`

```logts-play
inline [logic] .world:

    query q:
        set_random(42),
        random(R),
        show("unit", R)

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

**Load & Run** prints **`unit 0.6011037519201636`** (deterministic for seed **42**).

### Example — scale unit random with `is/2`

```logts-play
inline [logic] .world:

    query q:
        set_random(42),
        random(U),
        X is U * 10.0,
        show("scaled", X)

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

**Load & Run** prints **`scaled 6.011037519201636`**.

### Example — float interval

```logts-play
inline [logic] .world:

    query q:
        set_random(42),
        random_between(0.0, 10.0, X),
        show("float", X)

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

**Load & Run** prints **`float 6.011037519201636`**.

### Example — dice with deterministic seed (integer)

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
