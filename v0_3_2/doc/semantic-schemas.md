# Semantic schemas — named bit fields on wires

Semantic schemas add a **named field layout** on top of raw wire bits: declare fields once, attach a schema to a wire, initialize with structured literals, read/write individual fields, and display or trace values field-by-field.

This is **independent** from numeric display formats (`s8`, `q4p4`, `dec`, …). Schemas describe **what each bit slice means**; numeric tags describe **how to print** a slice. Both can be combined in `show` / `peek` / `probe`.

See also: [debug.md](debug.md) (show/peek/probe), [wire-literals.md](wire-literals.md) (RHS literals), [short-notation.md](short-notation.md) (bit indexing), [wire-vectors.md](wire-vectors.md) (vector/tensor access), [doc-viewer.md](doc-viewer.md) (Load / Load & Run).

---

## Runnable examples (Load / Load & Run)

Blocks marked `logts-play` show two buttons in the documentation viewer:

| Button | Action |
|--------|--------|
| **Load** | Copy the script into the editor without running |
| **Load & Run** | Copy and run immediately — check the **Output** panel |

Use **`logts-play wave`** (orange badge) for examples with `show` — same as [debug.md](debug.md). Static syntax reference below uses plain fences (no buttons).

---

## Quick comparison

| | Numeric formats (`s8`, `q4p4`, …) | Semantic schemas (`<name>`) |
|---|-----------------------------------|------------------------------|
| Module | `numeric-formats.js` | `semantic-schemas.js` |
| Attached to wire | No (only at literal / show tag) | Yes — `wireEntry.schemaRef` |
| Literals | `\1.5;q4p4`, `^FF` | `{ alu=\5 cycles=\3 }<opcode>` |
| Field access | — | `instr:alu`, `vector:2:alu` |
| `show(w)` | Flat wire value | Auto breakdown by schema |
| Wave Listen | Global fmt dropdown | **`auto`** uses wire schema |

---

## Declaring a schema

Top-level block — schema name is written as **`<name>`**:

```logts
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
```

| Rule | Detail |
|------|--------|
| Field syntax | `name:width` (width in bits) |
| Bit layout | **MSB-left, index 0** — same convention as `.bitRange` / wire slices |
| Total width | Sum of field widths |
| Duplicate names | Error at parse time |

---

## Attaching a schema to a wire

```logts
16wire<opcode> instr
16wire[64]<opcode> rom
16wire[2,3]<opcode> grid
```

**What `<schema>` does:** it attaches the named field layout to **each element** of the wire’s storage — not to the whole concatenated bit string.

| Declaration | Storage | Schema applies to |
|-------------|---------|-------------------|
| `16wire<opcode> instr` | one 16-bit word | that word |
| `16wire[4]<opcode> rom` | 4 × 16 bits (64 total) | **each** of the 4 elements |
| `16wire[2,3]<opcode> grid` | 2×3 × 16 bits (96 total) | **each** matrix cell |

Validation compares **schema total width** with **element width** (`16` in the examples above), not the full wire/tensor size. A 16-bit schema on `16wire[64]` is valid (64 elements × 16 bits); a 16-bit schema on `8wire[4]` is an error.

Type labels in debug output reflect the shape + schema, e.g. `16wire[3]<opcode>`, `16wire[2,2]<opcode>`.

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

## Vectors and matrices

On a vector or matrix wire, `<schema>` means: **every element/cell is one packed instance of that schema**. Field access picks an index (or row:col), then a field name:

```logts
rom:1:alu              # vector element 1, field alu
grid:0:1:jump          # matrix cell (row 0, col 1), field jump
```

Rules are the same as on a scalar wire: `=` strict width, `:=` left-pad; RHS is any expression; reads use a wire matching the field width.

`show(rom:1)` / `show(grid:0:1)` on a schema wire prints a **per-field breakdown of that one element** (not the whole tensor). `show(rom)` on the full vector still lists elements flat (one line per index) — use an indexed `show` for schema detail on a single slot.

### Vector example

**Load & Run** — three ROM slots, write element 1 via field access, read back, schema `show` on that element:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire[3]<opcode> rom := 0
rom:1:alu := \5
rom:1:cycles := \3
4wire aluSlot = rom:1:alu
2wire cycSlot = rom:1:cycles
show(rom:1)
```

Expected **Output**: `alu = 0101`, `cycles = 11`; `aluSlot` / `cycSlot` match; elements `0` and `2` stay zero.

Initialize one element with a schema literal:

```logts
rom:2 = { alu=\5 cycles=\3 jump=1 }<opcode>
```

### Matrix example

**Load & Run** — 2×2 grid, literal on one cell, field write on another, schema `show`:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire[2,2]<opcode> grid := 0
grid:1:0 = { alu=\5 cycles=\3 }<opcode>
grid:0:1:jump = 1
1wire j = grid:0:1:jump
show(grid:1:0)
show(grid:0:1)
```

Expected **Output**: `grid:1:0` shows `alu=0101`, `cycles=11`; `grid:0:1` shows `jump=1`; `j = 1`.

### Pixel-style schema (optional)

For RGB-style cells, declare a wider schema and use `row:col:field`:

```logts
<pixel>:
    red:5
    green:6
    blue:5
:
16wire[2,2]<pixel> framebuffer := 0
framebuffer:0:1:red := \15
5wire r = framebuffer:0:1:red
```

Here `16wire` is the **element** width (5+6+5); each of the four cells is one `<pixel>`.

---

## Schema literals

Initialize (or assign) a full wire from named fields:

```logts
16wire<opcode> instr = {
    cycles=\3
    alu=0
    reserved=^FF
}<opcode>
```

| Rule | Detail |
|------|--------|
| Syntax | `{ field=expr … }<schemaName>` — schema suffix is **required** |
| Omitted fields | Treated as **0** |
| RHS | Any normal expression/literal (`\N`, `^HEX`, `AND(…)`, …) |
| Overflow | Error when a constant value does not fit the field width |

**Load & Run** — partial literal; **Output** shows schema breakdown (`cycles=11`, `reserved=11111111`):

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr = {
    cycles=\3
    alu=0
    reserved=^FF
}<opcode>
show(instr)
```

---

## Field access (read and write)

The **last** `:` segment is always a **field name** (identifier). Numeric segments are vector/tensor indices only.

```logts
instr:alu                 # scalar wire, field alu
vector:2:alu              # vector element 2, field alu
matrix:2:5:red            # tensor cell (2,5), field red
```

### Assignment

RHS is a full expression. Use **`=`** when the evaluated bits already match the field width; use **`:=`** to left-pad shorter literals (same rules as wire assignment):

```logts
instr:alu = 0101          # strict — exactly 4 bits
instr:alu := \5           # left-pad \5 (101) → 0101
instr:cycles := \3        # left-pad to 2 bits → 11
instr:flags = AND(en, ready)
```

`instr:alu = \5` is an error (`Expected 4 bits, got 3 bits.`) because `\5` produces minimal binary `101`.

Read into another wire — use a wire width that matches the field:

```logts
4wire x = instr:alu
2wire y = instr:cycles
```

**Load & Run** — field write with `:=`, read into `x` / `y`, schema `show`:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr := 0
instr:alu := \5
instr:cycles := \3
4wire x = instr:alu
2wire y = instr:cycles
show(instr)
```

Expected **Output**: `alu = 0101`, `cycles = 11`; `x` and `y` hold the same field values.

**Load & Run** — strict `=` rejects short literal (`Expected 4 bits, got 3 bits.`):

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr := 0
instr:alu = \5
```

---

## Debug output (`show` / `peek` / `probe`)

When a wire has `schemaRef`, `show(wire)` prints a multi-line breakdown:

```logts
instr (16wire<opcode>)
  alu       = 0101
  jump      = 0
  write     = 0
  cycles    = 11
  reserved  = 00000000
```

### Alternate schema tag

```logts
show(instr; <opcode2>)
```

Requires `opcode2.totalWidth === wire.bitWidth`. Otherwise:

```logts
Error: opcode2 (15bit) width incompatible with wire (16bit)
```

**Load & Run** — incompatible show schema (15-bit tag on 16-bit wire):

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
<opcode15>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:7
:
16wire<opcode> instr := 0
show(instr; <opcode15>)
```

### Numeric tags + schema

Tags such as `s8`, `q4p4`, `dec`, `hex` apply **per field** when the field width matches the format; otherwise the same fallback as flat `show` is used. Tag order does not matter:

```logts
show(instr; s8)
show(instr; s8 <opcode>)
show(instr; <opcode> q4p4 dec)
```

**Load & Run** — literal init + `show(instr; dec)` per-field decimal:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr = { cycles=\3 alu=\5 }<opcode>
show(instr)
show(instr; dec)
```

### Wires without a schema

Unchanged flat behaviour:

```logts-play wave
2wire a := 0
show(a; s8)
```

See [debug.md — display tags](debug.md#show).

---

## Wave Listen — fmt `auto`

In the **Wave Listen** panel toolbar, set **Fmt** to **`auto`** (first item in the dropdown). When the listened wire has a schema attached (`16wire<opcode>`), commit lines show a **per-field breakdown** (same rules as `show`):

- **Inline** (narrow wires): compact `alu=0101 cycles=11 …`
- **Expand** (+ button): multi-line field list

Without `schemaRef`, `auto` falls back to **hex** (same as before).

**Load & Run** — arm Wave Listen (ON), set Fmt to **auto**, run a schema script; expand a commit line on `instr`:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:
16wire<opcode> instr = { cycles=\3 alu=\5 }<opcode>
```

After **Load & Run**: open **Wave Listen**, arm **ON**, choose **Fmt → auto**, press **RUN** — commit on `instr` shows field breakdown.

---

## Error reference

| Situation | Message (example) |
|-----------|-------------------|
| Wire vs schema width at decl | `width mismatch between opcode (13bit) and definition (16bit)` |
| Show with wrong schema width | `opcode15 (15bit) width incompatible with wire (16bit)` |
| Field on wire without schema | `Wire instr has no schema for field access 'alu'` |
| Unknown field | `Unknown schema field 'foo' in schema 'opcode'` |
| Literal overflow | `Field 'cycles' overflow: value exceeds 2-bit capacity` |
| Field assign strict width | `Expected 4 bits, got 3 bits.` |

---

## Complete example

**Load & Run** — declare schema, literal init, field write, read, two show formats:

```logts-play wave
<opcode>:
    alu:4
    jump:1
    write:1
    cycles:2
    reserved:8
:

16wire<opcode> instr = { cycles=\3 alu=\5 }<opcode>
show(instr)

instr:jump = 1
4wire aluOut = instr:alu

show(instr; dec)
```
