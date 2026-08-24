# Inline logic query — `.world:query({ })`

Run **ad-hoc Prolog goals** on an `inline [logic]` instance **directly from a LogTScript expression**, without `comp [logic]`. Same goal syntax as a `query name:` body in [inline-logic.md](inline-logic.md). Return shape follows the **LHS wire** (scalar / vector / matrix), using the same encoding as [comp-logic.md](comp-logic.md) redirects.

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Syntax** | `.module:query({ goals }, Var=wire, maxDepth=\\N, maxSolutions=\\N;policy)` |
| **Goals** | Prolog body in `{ }` — comma = AND, `\+`, `=:=`, etc. |
| **Inputs** | Optional `, Var=text wire`, `Var=number wire`, `Var=bool wire`, or `Var=<type> list wire` |
| **Output hints** | Scalar/matrix with free vars: `, Var=text` (no wire) — **required**; width alone does not infer type |
| **Limits** | Optional `, maxDepth=\\N`, `, maxSolutions=\\N` (decimal literals; default **256** / **64**) |
| **Column select** | Optional `;sel(i,j)` before policy — 0-based column indices into free variables |
| **Result policy** | Optional trailing `;unique`, `;first`, or `;last` (after bindings/options) |
| **`_`** | Anonymous slot — collected into vector/matrix bulk output |
| **Boolean** | `1wire` LHS + all vars bound → `1` / `0` |
| **Scalar (1st sol.)** | `8wire` / `40wire` / `80wire` LHS + one free var → **first solution** on that width (ASCII atom + `\0` pad) |
| **List I/O** | `Var=text list` (output hint) or `Var=text list wireIn` (input) — packed on vector wires |

---

## Syntax

```logts
result = .world:query({ owns(john, X) }, X=text car)

1wire ok = .world:query({ owns(john, X) }, X=text car, maxDepth=\10, maxSolutions=\3)

8wire[10] cars = .world:query({ owns(john, _) })
```

| Part | Meaning |
|------|---------|
| **`.world:query(...)`** | Single method **`query`** on `inline [logic]` `.world` |
| **`{ goals }`** | Prolog goals (same grammar as inline query body) |
| **`, Var=<type> expr`** | Bind logic variables before solve — **type is required** (`text`, `number`, `bool`, optional `list`) |
| **`, maxDepth=\\N`** | Optional — max goal steps (default **256**) |
| **`, maxSolutions=\\N`** | Optional — max solutions collected (default **64**) |
| **`;sel(i,j)`** | Optional — project to two columns before policy/pack (required for `32wire[R,C]` when more than two free vars) |
| **`;unique` / `;first` / `;last`** | Optional — post-process **projected** solutions before pack (see below) |

**No pout flags:** inline `query` does **not** expose `truncated` / `depthExceeded` — caps apply silently (extra solutions dropped, depth failure = unprovable / boolean `0`).

**Default (no policy):** all solutions in discovery order, within `maxSolutions` — same as comp bulk redirect without `;policy`.

### Result policies (`;unique`, `;first`, `;last`)

Applied **after** the engine collects solutions, **before** encoding on the LHS wire. Same semantics as [comp-logic.md](comp-logic.md) redirects.

| Policy | Effect |
|--------|--------|
| **`;unique`** | Drop duplicate bindings — one column for vector, full row for matrix (first occurrence kept) |
| **`;first`** | Keep only the first solution (scalar / vector slot 0 / matrix row 0) |
| **`;last`** | Keep only the **last** solution in discovery order (not SQL-style sort) |

Syntax: trailing semicolon **after** optional bindings and limits:

```logts
8wire[4] cars = .world:query({ owns(john, _) };unique)
40wire last = .world:query({ owns(john, X) }, X=text;last)
1wire ok = .world:query({ owns(john, X) }, X=text car;unique)
```

**Not supported:** `.world:available(...)` per query name, or redirect selectors like `{ johnOwns:0 }` inside the block — only **goals**.

---

## Return value (LHS wire drives shape)

| Situation | LHS wire | Result |
|-----------|----------|--------|
| All Prolog vars bound (in goal or via `, Var=wire`) | `1wire` | **`1`** if satisfiable, **`0`** otherwise |
| One free var — **first solution only** | `8wire`, `40wire`, `80wire`, … (no `[N]`) | First binding for that var, encoded on **full wire width** (atom → ASCII + `\0` pad) |
| One collected var (`_` or free name) — **all solutions** | `8wire[N]`, `40wire[N]`, … | Vector — one solution per slot (discovery order, `\0` fill on unused slots) |
| Two free vars (or after `;sel`) | `32wire[R,C]` | Matrix — row = solution, two columns |
| More than two free vars | `32wire[R,C]` with `;sel(i,j)` | Matrix on selected columns; error without `;sel` |
| Existence with free vars | `1wire` | **`1`** / **`0`** (boolean — not first binding) |

**Wire width = cell width:** an atom such as `chevy` (5 letters) needs **`40wire`** (5×8 bits) for the full name. **`8wire`** holds only **one ASCII character** (the first letter). Same rule as [comp-logic.md](comp-logic.md) redirects.

Encoding matches comp redirects: **atoms → ASCII + padding**, **numbers → unsigned binary** on cell width (see [comp-logic.md](comp-logic.md) D12b).

### Input binding — explicit type (`Var=<type> wire`)

Every query binding after the goal block **must** name a decode type. Width alone does **not** select the mode.

| Form | Meaning |
|------|---------|
| `X=text carWire` | Wire → ASCII atom (stop at `\0`; empty / all-zero → error on text) |
| `N=number scoreIn` | Wire → unsigned integer |
| `F=bool flag` | 1-bit wire → 0/1 |
| `Nodes=text list routeIn` | Vector or packed scalar → Prolog list of atoms |
| `Vals=number list packedIn` | Packed list of integers (16 bits per element on vector wires) |
| `Flags=bool list bitsIn` | Packed list of booleans (1 bit per element) |

**Output hint (no wire on the right):** when the LHS is a vector wire and the goal has one free list variable, give the type without a source wire:

```logts
8wire[4] routeFlat = .routes:query({ path(a, Nodes) }, Nodes=text list)
```

The engine flattens the first solution list into consecutive cells (ASCII per atom on text lists). Unused slots use the wire fill pattern (`\0` for text).

### List codec rules

| Type | Vector wire | Scalar packed wire |
|------|-------------|-------------------|
| **`text list`** | One atom per cell (`8wire[N]` → N atoms) | Total bits ÷ 8 slots |
| **`number list`** | One integer per cell (cell width = element width) | Total bits ÷ 16 slots |
| **`bool list`** | One bit per cell | Total bits = element count |

| Rule | Behaviour |
|------|-----------|
| **Fill slots** | All-zero cells (or wire fill pattern) are **skipped** on decode |
| **Zero elements** | Decode with no non-fill cells → error (`text list cannot contain 0 elements`, etc.) |
| **Input truncate** | If the Prolog list has more elements than wire slots, extra elements are dropped silently on encode |
| **Invalid text** | `\0` or empty atom in a non-fill cell → skipped (not a valid list element) |

**Legacy vs wave:** success paths produce identical wire values. Runtime errors are reported the same way as other inline queries (legacy stores `lastReportedError`; wave may throw on assignment — same message text).

---

## Examples

### Boolean — “does john own this car?”

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

40wire car = "chevy"

1wire ok = .world:query({ owns(john, X) }, X=text car)

show(ok)
```

`ok = 1` when `car` holds the atom `chevy`.

### Scalar — first solution (`40wire`, not `8wire[1]`)

Use a **plain scalar wire** (no `[N]`) when you want **one** answer, not a list:

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

40wire firstCar = .world:query({ owns(john, X) }, X=text)

8wire firstChar = .world:query({ owns(john, X) }, X=text)

show(firstCar; ascii)
show(firstChar; ascii)
```

| Wire | Value | Meaning |
|------|-------|---------|
| `40wire firstCar` | `chevy` | Full atom on 40 bits (5×8, `\0` padded) |
| `8wire firstChar` | `c` | Only **8 bits** — first character of the first solution |

Wider wires pad with `\0`:

```logts
80wire name = .world:query({ owns(john, X) }, X=text)   # "chevy" + zero-fill to 80 bits
```

### Vector — all cars john owns (full names)

Use **`40wire[N]`** when each solution is a **symbol atom** (full name). **`8wire[N]`** stores **one character per slot**.

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

40wire[4] cars = .world:query({ owns(john, _) })

8wire[4] initials = .world:query({ owns(john, _) })

show(cars; ascii)
show(initials; ascii)
```

Two solutions (`chevy`, `ford`); remaining slots filled with `\0`.  
`initials` shows `c`, `f`, … — one letter per 8-bit cell.

### Vector — narrow cells (8 bits per slot)

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

:

8wire[4] cars = .world:query({ owns(john, _) })

show(cars; ascii)
```

Each slot is **8 bits** — first character of each atom (`c`, `f`), not the full name.

### Multi-goal + negation

```logts-play
inline [logic] .world:

    person(john)
    person(mary)
    banned(mary)

:

1wire ok = .world:query({ person(X), \+ banned(X) })

40wire[4] eligible = .world:query({ person(X), \+ banned(X) }, X=text)

show(ok)
show(eligible; ascii)
```

`ok = 1` (at least one eligible person). Vector bulk returns `john` only (full name on 40-bit cells).

### Matrix — two free variables

```logts-play
inline [logic] .world:

    age(john, 25)
    age(mary, 30)
    age(joe, 22)

:

32wire[3, 2] table = .world:query({ age(X, Y) }, X=text, Y=number)

show(table)
```

Each row is one `age/2` solution; column 0 = person atom, column 1 = age.

### Result policy — `;unique` on duplicate facts

Duplicate facts can yield duplicate solutions (same binding, different proof paths). Use **`;unique`** to dedupe before packing:

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, chevy)
    owns(john, ford)

:

8wire[4] raw = .world:query({ owns(john, _) })
8wire[4] uniq = .world:query({ owns(john, _) };unique)

show(raw; ascii)
show(uniq; ascii)
```

Without policy: three slots (`c`, `c`, `f`). With **`;unique`**: two slots (`c`, `f`).

### Result policy — `;last` (three solutions)

```logts-play
inline [logic] .world:

    owns(john, chevy)
    owns(john, ford)
    owns(john, bike)

:

8wire firstChar = .world:query({ owns(john, X) }, X=text;first)
8wire lastChar = .world:query({ owns(john, X) }, X=text;last)

show(firstChar; ascii)
show(lastChar; ascii)
```

Discovery order is `chevy` → `ford` → `bike`. **`;first`** → `c`, **`;last`** → `b`.

### Column select — `;sel(0,2);unique` on four variables

```logts-play
inline [logic] .world:

    carInfo(toyota, red, 2020, sedan)
    carInfo(ford, blue, 2018, truck)
    carInfo(toyota, silver, 2020, coupe)

:

32wire[2, 2] table = .world:query({ carInfo(X, Y, Z, K) }, X=text, Z=number;sel(0,2);unique)

show(table; ascii)
```

**Load & Run** packs two columns (brand + year) after dedupe — two matrix rows, not three.

### List output — flatten route to vector

```logts-play
inline [logic] .routes:

    path(a, [n, e, s])

    query route:
        path(a, Nodes)

:

8wire[4] routeOut = 00000000000000000000000000000000

8wire[4] routeFlat = .routes:query({ path(a, Nodes) }, Nodes=text list)

show(routeFlat; ascii)
```

After **Load & Run**, `routeFlat` holds three ASCII cells `n`, `e`, `s`; slot 4 is fill (`\0`).

### List input — verify path against packed wire

```logts-play
inline [logic] .routes:

    path(a, [n, e, s])

    query route:
        path(a, Nodes)

:

8wire[4] routeIn = 01101110011001010111001100000000

1wire ok = .routes:query({ path(a, Nodes) }, Nodes=text list routeIn)

show(ok)
```

`routeIn` encodes `[n,e,s]` plus a fill cell → **`ok = 1`**.

### Scalar number input

```logts-play
inline [logic] .scores:

    level(box1, 42)

    query q:
        level(box1, N)

:

16wire scoreIn = 0000000000101010

1wire ok = .scores:query({ level(box1, N) }, N=number scoreIn)

show(ok)
```

### Bool list — packed 4-bit input

```logts-play
inline [logic] .flags:

    flags(box1, [1, 0, 1, 1])

    query q:
        flags(box1, F)

:

4wire flagIn = 1011

1wire ok = .flags:query({ flags(box1, F) }, F=bool list flagIn)

show(ok)
```

**Load & Run** → **`ok = 1`**.

### Mutation — add path from text list wire

```logts-play
inline [logic] .routes:

    path(a, [x])

    path(b, [n, e, s])

:

8wire[4] routeVec = 01101110011001010111001100000000

comp [logic] .routeLogic:
    on: 1
    .routes { }
:

1wire trigger = 1

.routeLogic:{
    logic {
        + path(b, text list routeVec)
    }
    set = trigger
}

1wire ok = .routes:query({ path(b, Nodes) }, Nodes=text list)

show(ok)
```

After **Load & Run**: mutation adds `path(b,[n,e,s])` → query succeeds → **`ok = 1`**.

---

## vs `comp [logic]`

| | **`.world:query({ })`** | **`comp [logic]`** |
|---|-------------------------|-------------------|
| **Use** | One-off expression / assign | Circuit trigger + redirects |
| **Trigger** | Runs when expression evaluates | `set` pin + `on:` |
| **Inputs** | `, Var=<type> wire` on call | Program block + exec `pin = wire` (supports `text list`, `number list`, `bool list`) |
| **Outputs** | Expression return / LHS wire | `query >= wire` redirects |
| **Limits** | Per-call `maxDepth` / `maxSolutions` (defaults 256 / 64); no `truncated`/`depthExceeded` pout | `maxDepth` / `maxSolutions` on comp + pout redirects |

For repeated solves driven by hardware-style wiring, prefer **comp [logic]**. For functional “run this goal now” in an assignment, use **`.world:query({ })`**.

---

## Related

- [inline-logic.md](inline-logic.md) — define facts, rules, named queries
- [comp-logic.md](comp-logic.md) — runtime component, redirects, pins
