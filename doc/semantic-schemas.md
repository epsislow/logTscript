# Semantic schemas — named bit fields on wires

Semantic schemas add a **named field layout** on top of raw wire bits: declare fields once, attach a schema to a wire, initialize with structured literals, read/write individual fields, and display or trace values field-by-field.

This is **independent** from numeric display formats (`s8`, `q4p4`, `dec`, …). Schemas describe **what each bit slice means**; numeric tags describe **how to print** a slice. Both can be combined in `show` / `peek` / `probe`.

See also: [debug.md](debug.md) (show/peek/probe), [wire-literals.md](wire-literals.md) (RHS literals), [short-notation.md](short-notation.md) (bit indexing), [wire-vectors.md](wire-vectors.md) (vector/tensor access), [doc-viewer.md](doc-viewer.md) (Load / Load & Run).

---

## Related topics (array fields)

| Page | When to read |
|------|----------------|
| [Schema field arrays (fixed)](schema-field-arrays.md) | `cells:8[3]`, `grid:4[2,2]`, `slots:<opcode>[2]`, slice `:0` / `::1`, grouped `{…}<schema>` |
| [Variable arrays (1D)](schema-variable-arrays.md) | `8[1-3]`, `8[1-]`, `varArrayCounts`, flat vs per-field assign, `has length [N]` |
| [Variable matrix (2D)](schema-variable-matrix.md) | `8[1-3,2]`, `<opcode>[1-3,2]`, shape `[R,C]`, runtime row/col slice |
| [Frame padding (grow / shrink)](schema-frame-padding.md) | Wide wire buffer `paddingRight`, resize variable fields, tight vs frame wire |

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
| Field syntax | `name:width` (width in bits); `name:W[N]` vector; `name:W[N,M]` matrix — see [field arrays](schema-field-arrays.md) |
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

---

## Vectors and matrices

On a vector or matrix wire, `<schema>` means: **every element/cell is one packed instance of that schema**. Field access picks an index (or row:col), then a field name:

```logts
rom:1:alu              # vector element 1, field alu
grid:0:1:jump          # matrix cell (row 0, col 1), field jump
```

Rules are the same as on a scalar wire: `=` strict width, `:=` left-pad; RHS is any expression; reads use a wire matching the field width.

`show(rom:1)` / `show(grid:0:1)` on a schema wire prints a **per-field multi-line breakdown of that one element**. `show(rom)` / `peek(rom)` on the full vector lists each `:i` / `:row:col` as a **flat index line** (`:1 = … (16bit)`), then **indented schema fields** on the following lines (not inline `alu=0101` on the same line). `probe(rom:1)` uses the same tree layout. Use `compact` for header + length/shape only; use indexed `show` for full multi-line detail on one slot.

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

Initialize all elements with a **grouped** schema literal (one `{ … }` per slot, `<opcode>` on last):

```logts
rom = { alu=\5 } { cycles=\3 } { jump=1 }<opcode>
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

Grouped multi-element literals on array fields: [Schema field arrays](schema-field-arrays.md#literals-on-array-slices).

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

Array fields inside a record use section headers and `:i` / `:r:c` lines — see [field arrays](schema-field-arrays.md#show-on-array-fields). Variable arrays add `has length [N]` or `has shape [R,C]` footers — [1D](schema-variable-arrays.md) / [2D](schema-variable-matrix.md).

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

- **Inline** (scalar wires): compact `alu=0101 cycles=11 …`
- **Inline** (vector/matrix + schema): flat slot lines only — `:0 = … :1 = …` (no inline `alu=0101` on the same line)
- **Expand** ([+] button): appears when **fmt is `auto`** and the wire has a schema (or when the value exceeds 256 bits); shows the same multi-line tree as `show`
- **Copy** ([cpy]): script literal only — `{ opcode=\5 flags={ … }<flags> … }<instruction>` (no `wireName =` prefix)
- **Vectors / matrices** (`16wire[3]<opcode>`): expand lists flat index lines plus indented fields per slot

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

## Schema composition (merge and nested)

Schemas may reference other schemas in two ways:

| Syntax | Effect |
|--------|--------|
| `<schema>` on its own line | **Merge** — copy all fields into the current schema (flat) |
| `field:<schema>` | **Nested** — group under `field`; access `wire:field:subfield` |

```logts
<flags>:
    carry:1
    zero:1
    negative:1
    overflow:1
:

<instruction>:
    opcode:4
    flags:<flags>
    immediate:8
:

16wire<instruction> instr := 0
instr:flags:carry := 1
instr:opcode := \5
show(instr)
show(instr:f)          # nested group only — breakdown of <flags> inside f
show(instr:f; <none>)  # flat blob — no semantic breakdown
```

`<none>` is a **reserved** schema display tag (not a user-defined schema name). It disables field breakdown for that `show` / `peek` / `probe` call; numeric tags still apply (`show(instr:f; <none> dec)`).

Use `doc(schema)` to list defined schemas and `doc(schema.name)` for an indented definition tree (imported schemas expanded inline); `doc(schema.none)` documents this reserved tag.

`show(wire:nestedField)` on a nested container prints the sub-schema breakdown for that slice. Assignment to a nested container (`instr:f := …`) still requires subfields or a nested literal on the parent wire.

`show(instr)` prints nested groups with indentation. Wave Listen **inline** (`auto`) on scalars shows all leaf fields flat (`carry=1 opcode=…`); on vectors shows flat slot lines only. **Expand** uses the same tree as `show`.

**Nested literals** (phase 2):

```logts
16wire<instruction> instr = {
    opcode=\5
    flags={ carry=1 zero=0 }<flags>
    immediate=^0F
}<instruction>
```

**LOAD** imports schemas from another file (line must start with `<`):

```logts
<schemas/opcodes.logts
16wire<opcode> instr
```

Within one script, referenced schemas must be defined in the same unit (or loaded via `<path`). Forward references within a file work when the parser resolves all `<schema>:` blocks at end of parse.

---

## Recursive schemas (`bound` and union `?`)

For **tree-shaped** data (expression ASTs, tagged unions, recursive structures), schemas combine three features:

| Syntax | Meaning |
|--------|---------|
| `field: bound <schema>` | **Bit-bounded substream** — each instance is a **16-bit unsigned length** prefix followed by the payload bits for one `<schema>` instance |
| `branch?: <schema>` | **Union variant** — optional field name with `?`; exactly **one** branch may be present at that level in a literal or on the wire |
| `branch?: <schema>: … :` | **Inline sugar** — same as a separate `<schema>:` block plus the union field (only when the field is optional with `?`) |

**Nested fixed-width** composition (`field:<schema>` without `bound`) is unchanged — same fixed bit layout and access paths as before.

### Minimal expression tree

```logts
<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>:
    number?: <number>
    add?: <add>
:
```

- **`bound <expr>`** on `left` / `right` allows recursive children; self-reference requires `bound` (fixed nested refs cannot flatten a recursive type).
- **Union `?`** on `number?` / `add?` — wire layout is **4-bit variant tag** + payload. A literal must fill **one** branch only.
- Nested grouped literals use the **schema tag** on each group: `{ value=\2 }<number>`, `{ … }<add>`, `{ … }<expr>`.

**Load & Run** — number leaf, then a small `add` tree; read a deep field:

```logts-play
<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>:
    number?: <number>
    add?: <add>
:

12wire<expr> num = { number={ value=\2 }<number> }<expr>
60wire<expr> tree = {
    add={
        left={ number={ value=\2 }<number> }<expr>
        right={ number={ value=\3 }<number> }<expr>
    }<add>
}<expr>
8wire leftVal = tree:add:left:number:value
show(tree)
```

After **Load & Run**: `num` is 12 bits (tag + 8-bit payload); `tree` is 60 bits; `leftVal` reads `00000010` (decimal 2). **Output** shows the nested `add` / `number` / `value` tree from `show(tree)`.

Same script under **wave** propagation (`logts-play wave` badge) produces the same field values.

### Inline sugar (equivalent blocks)

These two forms are equivalent:

```logts
<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>:
    number?: <number>
    add?: <add>
:
```

```logts
<expr>:
    number?: <number>: value: 8 :
    add?: <add>: left: bound <expr>  right: bound <expr> :
:
```

**Load & Run** — inline sugar packs the same bits as separate blocks:

```logts-play
<number>:
    value: 8
:

<expr>:
    number?: <number>: value: 8 :
    add?: <add>: left: bound <expr>  right: bound <expr> :
:

12wire<expr> ast = { number={ value=\5 }<number> }<expr>
```

### Union rules and errors

| Rule | Detail |
|------|--------|
| One branch per level | `{ number=… add=… }<expr>` with both branches set → error |
| Tag on wire | 4-bit variant index (declaration order of `?` fields) |
| `bound` prefix | 16-bit unsigned bit length before each bounded payload |
| Field access | Full path through union and bound layers, e.g. `tree:add:left:number:value` |
| `show(wire)` | Indented tree with active union branch and nested bounded children |

**Load & Run** — union rejects two branches at once (expect an error in **Output**):

```logts
<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>:
    number?: <number>
    add?: <add>
:

60wire<expr> bad = { number={ value=\1 }<number> add={ left={ number={ value=\2 }<number> }<expr> }<add> }<expr>
```

Message: `Union schema 'expr' allows at most one branch; multiple provided`.

Wave and legacy propagation produce the same literal packing, field reads, and error messages for these schemas.

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
| Nested field accessed flat | `Field 'carry' is nested under 'flags' in schema 'instruction'; use instr:flags:carry` |
| Circular schema reference | `Circular schema reference: a → b → a` |
| Duplicate after merge | `Duplicate schema field 'version' in schema 'packet' (from merge of 'header')` |
| Unknown schema | `Unknown schema 'opcode'` |
| Reserved schema name | `Reserved schema name 'none' — choose another name for a user-defined schema` |
| Ambiguous variable layout | `Ambiguous variable array layout for schema '…'` — see [Variable arrays (1D)](schema-variable-arrays.md) |
| Union — no branch | `Union schema 'expr' requires exactly one branch; none provided` |
| Union — two branches | `Union schema 'expr' allows at most one branch; multiple provided` |
| Union — wrong path | `Union schema 'expr' active variant is 'number', not 'add'` |
| Missing bound field | `Missing bound field 'left' in schema 'add'` |
| Unknown union tag | `Unknown union variant index N in schema 'expr'` |

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
