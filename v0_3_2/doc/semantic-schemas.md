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
```

The wire width and schema total width must **match exactly**. Mismatch is a compile-time error:

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
