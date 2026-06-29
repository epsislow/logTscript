# 1D wire vectors (`4wire[3]`)

A **vector** is a single contiguous wire with element metadata. Syntax: `Nwire[count] name` declares one wire of `N × count` bits. Element **0** is the **MSB** group (same bit-0 = MSB convention as bit-range).

See also: [assignment operators](assignment-operators.md), [debug output](debug.md), [MODE ZSTATE](zstate.md).

---

## Declaration

```logts
4wire[3] vectorA
8wire[16] memoryRow
1wire[32] flags
```

| Concept | Meaning |
|---------|---------|
| `4wire[3]` | 3 elements × 4 bits = **12-bit** wire |
| Internal storage | One wire; `wire.vector = { elementWidth: 4, elementCount: 3 }` |
| `getBitWidth` | Returns **12** (total bits) |
| Display type | `4wire[3]` in Variables, show, peek, Zlist — not `12wire` |

Multidimensional forms `4wire[N,M]` (2D tensors) are supported — see [2D tensors](#2d-tensors-4wirenm) below. Three or more dimensions (`4wire[2,3,4]`) are a **parse error**.

---

## 2D tensors (`4wire[N,M]`)

A **matrix** is a contiguous wire with two-dimensional metadata. Syntax: `Nwire[rows,cols] name` declares one wire of `N × rows × cols` bits, stored **row-major** (same MSB-first convention as 1D vectors).

```logts
4wire[3,2] matrixA
4wire[3,1] colVec    # vertical vector
4wire[1,N] rowVec    # same as 4wire[N]
4wire[1] scalarA     # equivalent to plain 4wire (no tensor indexing)
```

| Concept | Meaning |
|---------|---------|
| `4wire[3,2]` | 3×2 cells × 4 bits = **24-bit** wire |
| Internal storage | `wire.tensor = { elementWidth: 4, dims: [3, 2] }` plus `wire.vector` for compat |
| Display type | `4wire[3,2]` — not `24wire` |
| `4wire[3,1]` | vertical vector, displayed as `4wire[3,1]` |

### Indexing (2D)

| Syntax | Result |
|--------|--------|
| `matrixA:r:c` | cell `(r,c)` — scalar `Nwire` |
| `matrixA:r` | row `r` — vector of width `cols × N` |
| `matrixA::c` | column `c` — vector of width `rows × N` |
| `vectorB:i` | linear element `i` on rank-1 tensors (`[1,N]` or `[N,1]`) |

On a **matrix** (both dimensions > 1), a single `:r` indexes a **row slice**, not a linear cell. Use `:r:c` for individual cells.

```logts-play
4wire[2,2] matrixA = 1111 + 0011 + 0101 + 0000
4wire a = matrixA:0:0
4wire b = matrixA:1:1
show(a)
show(b)
```

---

## Initialization

Total width must match `elementWidth × elementCount`. All assignment operators (`=`, `:=`, `=:`, `:`) follow the same rules as a plain wire of that total width.

```logts-play
4wire[3] vectorA = 1111 + 0011 + 0101
show(vectorA)
```

Concatenation with `+` places the **first** operand at the MSB end (element 0).

---

## Element access

| Syntax | Equivalent bit-range | Notes |
|--------|---------------------|-------|
| `vectorA:0` | `vectorA.0/4` | Static index (decimal or binary literal) |
| `vectorA:1` | `vectorA.4/4` | Element 1 |
| `vectorA:1.1/2` | `vectorA.5/2` | Bits 1–2 within element 1 (element bit 0 = MSB) |
| `vectorA:(index)` | `vectorA.(index×4)/4` | Dynamic index — **wire name only** inside `(...)` |

```logts-play
4wire[3] vectorA = 1111 + 0011 + 0101
4wire a = vectorA:0
4wire b = vectorA:1
show(a)
show(b)
```

Index out of range (`index < 0` or `index ≥ elementCount`) is a runtime error. Indexing a non-vector wire (`plain:0`) is an error.

### Bit-range within an element

After the element index, use the same `.start/len` or `.start-end` syntax as on a plain wire. Ranges are **relative to the element** (bit 0 = MSB of that element):

```logts
2wire slice = vectorA:1.1/2
vectorA:1.1/2 = 10
```

`vectorA:1.1/2` is equivalent to `vectorA.5/2` on the underlying 12-bit wire when elements are 4 bits wide.

---

## Assignment to an element

Element assignment is a **slice write** (read-modify-write on the underlying wire). It is allowed in `MODE STRICT` even after the vector was initialized (unlike a full-wire reassignment).

```logts
4wire[3] vectorA = 111111110000
vectorA:1 = 0011
```

Result: `111100110000` — only element 1 changes.

---

## show / peek

For a whole vector, output is **multi-line**:

```text
vectorA = 111100110101 (12bit)
:0 = 1111 (4bit)
:1 = 0011 (4bit)
:2 = 0101 (4bit)
vectorA has length [3]
```

| Case | Behaviour |
|------|-----------|
| `show(vectorA)` | Header + all elements if ≤ 5 elements |
| More than 5 elements | First three elements, `..`, last element |
| `show(vectorA:1)` | Single element line + length line |
| `peek(vectorA)` | Same layout as `show` (emitted at statement position) |

---

## probe / watch

| Form | Example |
|------|---------|
| Whole vector | `probe(vectorA)` |
| Element | `probe(vectorA:1)` |
| Element bit-range | `probe(vectorA:1.0/2)` → label `vectorA:1.0-1` |
| Bit-range (plain wire) | `probe(data.4/4)` → label `data.4-7` |

**watch** uses the same slice forms. `watch(vectorA)` on `4wire[3]` expands to **12 flat columns** (`vectorA.0` … `vectorA.11`); use `watch(vectorA:0)` for a single element. See [debug.md — watch](debug.md#watch).

Slice probes emit on every committed wire change (including element splice). See [debug.md — probe](debug.md#probe).

---

## Reduction functions

Built-ins **SUM**, **MIN**, **MAX**, and **DOT** accept whole vectors (elements expand automatically), element slices (`vectorA:0`, `vectorA:0.1/2`), and plain wires.

See [vector-reduction.md](vector-reduction.md) for syntax, output widths (SUM **2W**, DOT **3W**), and examples.

---

## Zlist (MODE ZSTATE)

Only the **whole wire** name is valid:

```logts
Zlist(vectorA)
```

Header uses vector type: `vectorA (4wire[3]):`. Driver labels use element syntax, e.g. `vectorA:1 = 0011`. Requires wave propagation — see [zstate.md](zstate.md).

`Zlist(vectorA:1)` is **not** supported.

---

## ZCONNECT (V1 limits)

| Form | V1 |
|------|-----|
| `vectorA = ZCONNECT(en, data12)` | Yes — 12-bit bus |
| `lane = ZCONNECT(en, vectorA:1)` | Yes — element as 4-bit source |
| `vectorA:1 = ZCONNECT(en, data)` | **No** — tristate driver on element slice |

Details: plan section 10 in the repo plan file.

---

## Variables panel

The Variables panel shows one row per vector with type `4wire[3]` and the usual value truncation (`...` for long values).
