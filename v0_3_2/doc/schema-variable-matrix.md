# Variable matrix in schema (2D)

**Model D — 2D** — variable row or column count at runtime: `grid:8[1-3,2]`, `tiles:<opcode>[1-3,2]`. Part of [Semantic schemas](semantic-schemas.md).

Prerequisite: [Variable arrays (1D)](schema-variable-arrays.md) (`varArrayCounts`, flat vs structured assign). Fixed-size slice syntax: [Schema field arrays](schema-field-arrays.md).

---

## Runnable examples (Load / Load & Run)

Use **`logts-play wave`** for examples with `show`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Syntax and layout

At most **one variable dimension** per field at flat assign time. `varArrayCounts[field]` stores **total cells** `N = R×C`; the fixed dimension from the declaration derives the other (`rows = N / colsFix`).

```logts
<cell8>:
    v: 8
:

<frameVarGrid>:
    grid: 8[1-3, 2]    # cols fixed at 2; rows 1–3 at runtime
:

<opcode>:
    alu: 4
    jump: 1
    write: 1
    cycles: 2
    reserved: 8
:

<frameVarTiles>:
    tiles: <opcode>[1-3, 2]
:
```

| Syntax | Flat `pkt = ^…` | Notes |
|--------|-----------------|-------|
| `grid:8[1-3, 2]` | ✅ | `N = payload/8`, `rows = N/2` |
| `grid:8[2, 1-3]` | ✅ | `cols = N/2` |
| `grid:8[1-3, 1-3]` | ❌ ambiguous | use shape literal or per-field assign |
| `tiles:<opcode>[1-3, 2]` | ✅ | element width = 16 (`opcode.totalWidth`) |

---

## Grouped literal shape

Prefix **or** suffix `[R,C]` / `[N]` — **not both** in the same literal:

```logts
pkt:grid = { v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }[2,2]<cell8>
pkt:grid = [2,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }<cell8>
pkt:tiles = [2,2]{ alu=\5 }{ alu=\6 }{ alu=\1 }{ alu=\2 }<opcode>
```

**Show** — tree `:r:c` plus `pkt:grid has shape [R,C]` (or `grid has shape [R,C]` inside full-record `show`).

---

## Load & Run examples

**Flat assign 2×2 leaf matrix**, `show`, shape footer:

```logts-play wave
<cell8>:
    v: 8
:
<frameVarGrid>:
    grid: 8[1-3, 2]
:
32wire<frameVarGrid> pkt = ^AABBCCDD
show(pkt:grid)
```

Expected **Output**: `:0:0`, `:0:1`, `:1:0`, `:1:1` under `grid`; `pkt:grid has shape [2,2]`.

**Grouped literal with shape prefix** + per-field assign:

```logts-play wave
<cell8>:
    v: 8
:
<frameVarGrid>:
    grid: 8[1-3, 2]
:
32wire<frameVarGrid> pkt := 0
pkt:grid = [2,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }<cell8>
show(pkt:grid)
```

Expected **Output**: `pkt:grid has shape [2,2]`; four `:r:c` lines.

**Variable schema matrix** `<opcode>[1-3, 2]`:

```logts-play wave
<opcode>:
    alu: 4
    jump: 1
    write: 1
    cycles: 2
    reserved: 8
:
<frameVarTiles>:
    tiles: <opcode>[1-3, 2]
:
64wire<frameVarTiles> pkt := 0
pkt:tiles = [2,2]{ alu=\5 }{ alu=\6 }{ alu=\1 }{ alu=\2 }<opcode>
show(pkt:tiles)
```

Expected **Output**: `pkt:tiles has shape [2,2]`; nested `alu`/`cycles`/… under each `:r:c`.

**Row/column slice on runtime shape** (7a parity with fixed arrays):

```logts-play wave
<cell8>:
    v: 8
:
<frameVarGrid>:
    grid: 8[1-3, 2]
:
32wire<frameVarGrid> pkt := 0
pkt:grid = [2,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }<cell8>
pkt:grid:0 = 00000101 + 00000110
pkt:grid::1 = 00000110 + 00001111
show(pkt:grid:0)
show(pkt:grid::1)
8wire cell10 = pkt:grid:1:0
show(cell10)
```

Expected **Output**: row/col slice headers; `pkt:grid has shape [2,2]` on each slice show; `cell10 = 00000111` (8bit).

Slice syntax matches [fixed matrix slices](schema-field-arrays.md#matrix-row--column-slices); bounds use runtime `rows` / `cols` from `varArrayCounts`.
