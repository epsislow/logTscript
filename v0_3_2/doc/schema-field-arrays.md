# Schema field arrays (fixed size)

Fixed-size **array fields** inside a semantic schema record — raw bit slices (`cells:8[3]`) or arrays of sub-schemas (`slots:<opcode>[2]`). Part of [Semantic schemas](semantic-schemas.md).

See also: [Variable arrays (1D)](schema-variable-arrays.md), [Variable matrix (2D)](schema-variable-matrix.md), [wire-literals.md](wire-literals.md), [wire-vectors.md](wire-vectors.md).

---

## Runnable examples (Load / Load & Run)

Use **`logts-play wave`** for examples with `show`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Raw bit arrays (`field:W[N]` / `[R,C]`)

A schema may contain **fixed-size arrays** of raw bit slices (model B — one wire holds the full packed record):

```logts
<frame>:
    tag:8
    cells:8[3]      # vector — 3 × 8b = 24b
    grid:4[2,2]     # matrix — 2×2 × 4b = 16b
:
48wire<frame> pkt := 0
```

| Syntax | Meaning | Total bits |
|--------|---------|------------|
| `cells:8[3]` | 3 elements, 8 bits each | 24 |
| `grid:4[2,2]` | 2×2 matrix, 4 bits per cell | 16 |

**Indices are 0-based** (same as wire vectors): `pkt:cells:1`, `pkt:grid:0:1`.

Attach with a scalar wire whose width equals **schema `totalWidth`** (here `48wire<frame>`). Do **not** use `8wire[3]<frame>` — element width must match the whole schema, not one array cell.

### Read / write

```logts
pkt:tag := \42
pkt:cells:0 := \15
pkt:cells:1 := \240
pkt:grid:0:1 := \6
8wire c0 = pkt:cells:0
4wire g = pkt:grid:0:1
```

### Literals on array slices

Use the same RHS forms as [wire-literals.md](wire-literals.md) on the **array slice** (`pkt:cells`, `pkt:grid`). Width must match `W×N` or `W×rows×cols`:

| Accepted | Example | Width |
|----------|---------|-------|
| Concatenation | `pkt:cells = 00001111 + 11110000 + 10101010` | 3×8 = 24b |
| Hex pattern | `pkt:cells = ^0FF0AA` | 24b |
| Grouped + tag | `pkt:cells = \1 \2 \3;8` | 3×8 = 24b |
| Per-element | `pkt:cells:1 := \5` | 8b |

**Grouped schema elements** (vector/matrix wire, schema array slice, or record field) — one `{ … }` per element, single `<schema>` on the last group (like `\2 \23 \242;8`):

```logts
16wire[3]<opcode> rom = { alu=\5 } { cycles=\3 } { jump=1 }<opcode>
pkt:slots = { alu=\5 } { cycles=\3 }<opcode>
pkt = { tag=\42, slots={ alu=\5 } { cycles=\3 }<opcode> }<frame>
```

Equivalent to concatenating per-element literals with `+`. Whitespace between `}` and `{` is optional (`{}{}<schema>` on one line is fine).

**Not supported:** comma lists `[\1,\2,\3]` or `{ cells=[\1,\2,\3] }` — use grouped numeric `\1 \2 \3;8` or grouped schema above.

### Matrix row / column slices

Same syntax as wire matrices — `pkt:grid:0` (row), `pkt:grid::1` (column), including `pkt:grid:(rowIdx)` and `pkt:grid::(colIdx)`:

```logts
pkt:grid:0 = 0101 + 0110
pkt:grid::1 = 0110 + 1111
show(pkt:grid:0)    # :0:0 … :0:1 + pkt:grid has shape [2,2]
show(pkt:grid::1)   # :0:1 … :1:1 + pkt:grid has shape [2,2]
```

### `show` on array fields

`show(pkt)` prints scalar fields normally; array fields use a **section header** plus **flat index lines** (`:0 = … (Wbit)`), without `cells[3]` syntax. `show(pkt:cells)` / `show(pkt:grid)` add a `has length` / `has shape` footer.

---

## Schema arrays (`field:<schema>[N]` / `[R,C]`)

Fixed-size arrays of **sub-schemas** — each element is a full nested record, analogous to `16wire[2]<opcode>` on wires:

```logts
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:

<frame>:
    tag: 8
    slots: <opcode>[2]    # 2 × 16b = 32b
    tiles: <opcode>[2,2]  # 2×2 × 16b = 64b
:
40wire<frame> pkt := 0
```

| Syntax | Meaning | Total bits |
|--------|---------|------------|
| `slots:<opcode>[2]` | 2 elements, each `opcode.totalWidth` | 2×16 = 32 |
| `tiles:<opcode>[2,2]` | 2×2 matrix of `opcode` records | 4×16 = 64 |

**Indices are 0-based:** `pkt:slots:1:alu`, `pkt:tiles:0:1:cycles`. Matrix row/column slices use the same rules as raw arrays — `pkt:tiles:0`, `pkt:tiles::1`.

### Read / write

```logts
pkt:tag := \42
pkt:slots:0:alu := \5
pkt:slots:1 = { alu=\5 cycles=\3 }<opcode>
pkt:tiles:0:1:alu := \5
4wire a = pkt:slots:0:alu
16wire s0 = pkt:slots:0
```

### Literals on schema array slices

Same RHS forms as wire vectors — concatenation, hex, per-element schema literal:

| Accepted | Example | Width |
|----------|---------|-------|
| Concatenation | `pkt:slots = s0 + s1` | 2×16 = 32b |
| Per-element literal | `pkt:slots:1 = { alu=\5 }<opcode>` | 16b |
| Sub-field assign | `pkt:slots:0:alu := \5` | 4b |

**Grouped schema** (one `{ … }` per slot, `<opcode>` on last): `pkt:slots = { alu=\5 } { cycles=\3 }<opcode>`

**Not supported:** comma lists `[{…},{…}]` or `{ slots=[…] }` — use grouped schema or `+` concat.

### `show` on schema arrays

Same layout as wire vectors with schema: section header `slots`, flat `:i = … (Wbit)` per element, then **indented sub-schema tree** underneath. `show(pkt:slots:1)` shows one element only.

**Load & Run** — mixed scalar + schema array field write + `show`:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:

<frame>:
    tag: 8
    slots: <opcode>[2]
:
40wire<frame> pkt := 0
pkt:slots:1:alu := \5
pkt:slots:1:cycles := \3
show(pkt)
```

Mixed scalar + raw array + matrix on one record:

```logts
<frame>:
    tag:8
    cells:8[3]
    grid:4[2,2]
:
48wire<frame> pkt := 0
pkt:cells:1 := \240
pkt:grid:0:1 := \6
show(pkt)
```

Mismatch between schema width and **element** width is a compile-time error:

```logts
# ERROR:
# width mismatch between opcode13 (13bit) and definition (16bit)
<opcode13>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:5
:
16wire<opcode13> instr
```

**Load & Run** — width mismatch error (13-bit schema on 16-wire):

```logts-play
<opcode13>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:5
:
16wire<opcode13> instr
```

Valid attach (16 bits):

```logts
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr
```

Type label in debug output becomes `16wire<opcode>`.

---

## Variable-size arrays

For runtime element count (`8[1-3]`, `8[1-]`) see [Variable arrays (1D)](schema-variable-arrays.md). For variable 2D matrices (`8[1-3,2]`, `<opcode>[1-3,2]`) see [Variable matrix (2D)](schema-variable-matrix.md).
