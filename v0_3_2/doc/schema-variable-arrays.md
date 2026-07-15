# Variable arrays in schema (1D)

**Model D** — variable element count at runtime inside a schema field: `cells:8[1-3]`, `cells:8[1-]`, `tokens:8[nTokens]` (future). Part of [Semantic schemas](semantic-schemas.md).

See also: [Fixed field arrays](schema-field-arrays.md), [Variable matrix (2D)](schema-variable-matrix.md), [protocol-repeat.md](protocol-repeat.md) (same `[min-max]` syntax).

---

## Runnable examples (Load / Load & Run)

Use **`logts-play wave`** for examples with `show`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Syntax

Mirrors protocol repetition: **`8[1-3]`** (1–3 elements), **`8[1-]`** (at least 1, open upper bound), **`8[0-]`** (zero or more). Sugar: **`8+`** → `8[1-]`, **`8*`** → `8[0-]`.

```logts
<package2>:
    cells: 8[1-]
    footer: 8
:

<package3>:
    tokens: 8[1-]
    codeDatas: 8[1-]
:
```

| Topic | Rule |
|-------|------|
| **Flat `=` on whole record** | OK when count is **unique** (e.g. `24wire` + suffix anchor, or single open-ended field last). |
| **Two `8[1-]` fields** | Structured per-field assign OK; flat `pkt = ^…` → **ambiguous** error. |
| **Runtime count** | Stored in `wire.varArrayCounts`; drives layout, show, read, Wave Listen. |
| **Show** | Tree + `:i` lines + `field has length [N]`; tags (`; dec`) and field slices supported. |
| **Peek / probe** | Same tree as `show`, including dynamic `has length [N]`. |
| **WWIDTH / BITSIZE** | `WWIDTH(pkt:tokens:0)` = element width (`8`); `BITSIZE(pkt:tokens)` = runtime total (`count × W`). |

Static reference (no buttons):

```logts
24wire<package2> pkt = ^AABBFF          # cells count=2 (suffix anchor)
32wire<package3> pkt := 0
pkt:tokens = ^AABB
pkt:codeDatas = ^CC
24wire<package1> pkt = { cells=^AABBCC }<package1>   # single var field — grouped literal OK
show(pkt:cells; dec)
peek(pkt)
```

---

## Load & Run examples

**`package2`** — flat hex init (suffix anchor resolves `cells` count), full-record `show`, decimal tag on the cells slice, `peek`:

```logts-play wave
<package2>:
    cells: 8[1-]
    footer: 8
:
24wire<package2> pkt = ^AABBFF
show(pkt)
show(pkt:cells; dec)
peek(pkt)
```

Expected **Output**: `cells has length [2]`; `:0` / `:1` under `cells`; `footer = 11111111`; peek tree matches `show(pkt)`.

**`package3`** — two variable fields — use **structured per-field assign** (flat `pkt = ^…` is ambiguous):

```logts-play wave
<package3>:
    tokens: 8[1-]
    codeDatas: 8[1-]
:
32wire<package3> pkt := 0
pkt:tokens = ^AABB
pkt:codeDatas = ^CC
show(pkt)
```

Expected **Output**: `tokens has length [2]`, `codeDatas has length [1]`.

**Bounded range `8[1-3]`** — grouped schema literal, `BITSIZE` / `WWIDTH`:

```logts-play wave
<package1>:
    cells: 8[1-3]
:
24wire<package1> pkt = { cells=^AABBCC }<package1>
show(pkt)
5wire sz = BITSIZE(pkt:cells)
4wire ew = WWIDTH(pkt:cells:0)
show(sz)
show(ew)
```

Expected **Output**: `cells has length [3]`; `sz = 11000` (24 bits); `ew = 1000` (8-bit element width).

**`probe`** on a variable array field after per-field writes:

```logts-play wave
<package3>:
    tokens: 8[1-]
    codeDatas: 8[1-]
:
32wire<package3> pkt := 0
pkt:tokens = ^AA
pkt:codeDatas = ^BBCC
probe(pkt:tokens)
```

Expected **Output**: probe tree with `tokens has length [1]` and `:0 = 10101010`.

---

## Grouped literal shape `[N]`

When count alone is ambiguous, use a **prefix or suffix** shape on grouped literals (same rules as matrix `[R,C]` — see [Variable matrix (2D)](schema-variable-matrix.md)):

```logts
pkt:cells = { }{ }{ }[3]<cell>
pkt:cells = [3]{ }{ }{ }<cell>
```

---

## Next: 2D variable matrices

Matrices with one variable dimension (`grid:8[1-3,2]`, `tiles:<opcode>[1-3,2]`) are documented in [Variable matrix (2D)](schema-variable-matrix.md).
