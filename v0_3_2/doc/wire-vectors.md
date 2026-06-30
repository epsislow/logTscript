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

Contiguous wires with two-dimensional **metadata**. Syntax: `Nwire[rows,cols] name` stores `N × rows × cols` bits **row-major** (MSB-first, same as 1D vectors).

### Rank-1 vs matrix

| Shape | Role | `; vector` | `; matrix` (needs a true matrix operand) |
|-------|------|------------|------------------------------------------|
| `4wire[N]` | rank-1 vector | per index `:i` | broadcasts as row `[1,N]` when paired with a matrix |
| `4wire[1,N]` | rank-1 (horizontal) | per index `:i` | broadcasts across columns when paired with a matrix |
| `4wire[N,1]` | rank-1 (vertical) | per index `:i` | broadcasts across rows when paired with a matrix |
| `4wire[R,C]` **R>1 and C>1** | **matrix** | — (use `; matrix`) | per cell `(r,c)` |

**Rank-1** tensors (`[N]`, `[1,N]`, `[N,1]`) are **vectors**, not matrices. Built-ins compare **`elementCount`** and **`elementWidth`**, not whether the declaration used a comma. **`DOT`** on two rank-1 operands with the same length is a **scalar** dot product (`[3,1]`×`[3,1]` ≡ `[3]`×`[3]`).

Only **`R>1` and `C>1`** is a **matrix** for `; matrix`, **REPEAT** (rejected), and matrix-style indexing (`m:r` = row slice).

```logts
4wire[3,2] matrixA      # matrix
4wire[3,1] colVec       # rank-1 vertical vector
4wire[1,3] rowVec       # rank-1 horizontal vector (same bits as 4wire[3] for show/index)
4wire[3] vec            # rank-1 (single-dim syntax)
```

| Concept | Meaning |
|---------|---------|
| `4wire[3,2]` | 3×2 cells × 4 bits = **24-bit** wire — **matrix** |
| Internal storage | `wire.tensor = { elementWidth: 4, dims: [3, 2] }` plus `wire.vector` for compat |
| Display type | `4wire[3,2]` — not `24wire` |
| `4wire[3,1]` / `4wire[1,3]` | rank-1; type label may show `4wire[3,1]` or normalize to `4wire[3]` for `[1,N]` |
| `show` footer (rank-1) | `has length [N]` for all rank-1 shapes (including `[N,1]`) |
| `show` footer (matrix) | `has shape [R,C]` |

### Indexing (2D)

| Syntax | Result |
|--------|--------|
| `matrixA:r:c` | cell `(r,c)` — scalar `Nwire` |
| `matrixA:r` | row `r` — vector of width `cols × N` |
| `matrixA::c` | column `c` — vector of width `rows × N` |
| `vectorB:i` | linear element `i` on rank-1 tensors (`[N]`, `[1,N]`, `[N,1]`) |

On a **matrix** (both dimensions > 1), a single `:r` indexes a **row slice**, not a linear cell. Use `:r:c` for individual cells.

```logts-play
4wire[2,2] matrixA = 1111 + 0011 + 0101 + 0000
4wire a = matrixA:0:0
4wire b = matrixA:1:1
show(a)
show(b)
```

### PIVOT

`PIVOT(tensor)` swaps rows and columns (transpose). Vectors change orientation: `4wire[3]` ↔ `4wire[3,1]`. The assignment target shape must match the transposed dimensions.

```logts-play
4wire[3] row = 1111 + 0011 + 0101
4wire[3,1] col = PIVOT(row)
show(col)
```

### REPEAT

`REPEAT(data, times)` tiles a whole wire **T** times. Plain wires concatenate; rank-1 tensors grow along the repeat axis (`4wire[N]` → `4wire[N,T]`, `4wire[1,N]` → `4wire[T,N]`). Matrices (`R>1`, `C>1`) are rejected. Max **16384** output bits. See [builtin-REPEAT.md](builtin-REPEAT.md).

```logts-play
4wire[3] col = 0001 + 0010 + 0100
4wire[3,2] m = REPEAT(col, \2)
4wire a = m:0:1
show(a)
```

### Tag `; matrix` (element-wise on 2D tensors)

Full reference: **[matrix-reduction.md](matrix-reduction.md)**.

Use `; matrix` on the same built-ins as `; vector` (SUM, ADD, MIN, MAX, MULTIPLY, compares, shifts, etc.). **Mutually exclusive** with `; vector`. Requires at least one **matrix** operand (`R>1`, `C>1`). Other operands may be scalars or **rank-1 vectors** (`[1,M]` row or `[N,1]` column) that broadcast per cell.

Example **`ADD(… ; matrix)`**: [builtin-ADD.md](builtin-ADD.md). Full list: [builtin-tagged-index.md](builtin-tagged-index.md).

Dual-output ops (`ADD`, `SUM`, `MULTIPLY`, …) return **per-cell** result and flag/over blobs shaped like the matrix.

### Oriented `; vector` (rank-1 broadcast)

For **`4wire[N]`** + **`4wire[N,1]`** (horizontal + vertical rank-1), **`; vector`** on **SUM** / **ADD** uses **oriented** broadcast: each output index `i` combines `horiz[i]` with **all** vertical elements. This is **not** the same as element-wise `ADD(a, b; vector)` on two `[N,1]` operands.

For element-wise ops on matching rank-1 shapes, use two tensors with the same **`elementCount`** (e.g. both `4wire[3,1]`).

```logts-play
4wire[3] horiz = 0001 + 0010 + 0100
4wire[3,1] vert = 0001 + 0001 + 0001
4wire[3] r, 4wire[3] o = SUM(horiz, vert; vector)
show(r)
```

### DOT and ARGMAX / ARGMIN on tensors

**DOT** has no `; matrix` tag — shape rules apply automatically:

| A | B | Result |
|---|---|--------|
| rank-1, same **N** elements (`[N]`, `[1,N]`, `[N,1]`) | rank-1, same **N** | scalar `Wbit` (+ `2W` over) |
| `[N,1]` | `[1,N]` (or `[N]` / `[1,N]`) | scalar |
| `[N,K]` | `[K,M]` | matrix `[N,M]` — result `W` bits/cell, over `2W` bits/cell |

**ARGMAX** / **ARGMIN** on a matrix return a **one-hot** over `rows×cols` bits, or with `; index` return `(row, col)` index wires.

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[4] hot = ARGMAX(m)
show(hot)
```

### IDENTITY

`IDENTITY(\N)` builds an **N×N** identity matrix. See [builtin-IDENTITY.md](builtin-IDENTITY.md).

### Tensor generators and transforms

| Function | Role | Doc |
|----------|------|-----|
| `ZEROS(\N)` | zero N×N matrix | [builtin-ZEROS.md](builtin-ZEROS.md) |
| `FILL(\N, scalar)` | constant fill | [builtin-FILL.md](builtin-FILL.md) |
| `DIAG(vector)` | diagonal from vector | [builtin-DIAG.md](builtin-DIAG.md) |
| `IOTA(\N)` | index vector 0..N−1 | [builtin-IOTA.md](builtin-IOTA.md) |
| `OUTER(col, row)` | outer product [N,M] | [builtin-OUTER.md](builtin-OUTER.md) |
| `TRACE(matrix)` | sum of diagonal | [builtin-TRACE.md](builtin-TRACE.md) |
| `NORM(v)` / `L2(v)` | L2² = DOT(v,v) | [builtin-NORM.md](builtin-NORM.md) · [builtin-L2.md](builtin-L2.md) |
| `TRIL` / `TRIU` | lower / upper triangle | [builtin-TRIL.md](builtin-TRIL.md) · [builtin-TRIU.md](builtin-TRIU.md) |
| `FLIPUD` / `FLIPLR` | flip rows / columns | [builtin-FLIPUD.md](builtin-FLIPUD.md) · [builtin-FLIPLR.md](builtin-FLIPLR.md) |
| `MCAT(A,B)` | concat matrices | [builtin-MCAT.md](builtin-MCAT.md) |
| `MSLICE(m,\r,\c,\h,\w)` | submatrix window | [builtin-MSLICE.md](builtin-MSLICE.md) |
| `REPEAT(data, times)` | tile wire / vector | [builtin-REPEAT.md](builtin-REPEAT.md) |

```logts-play
4wire[3,3] I = IDENTITY(\3)
4wire[3,3] z = ZEROS(\3)
4wire[3] idx = IOTA(\3)
show(idx)
```

Useful for matrix multiply baselines (`DOT(A, I)` ≡ `A`) and linear-algebra sketches.

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

For a whole **rank-1** tensor, output is **multi-line**:

```text
vectorA = 111100110101 (12bit)
:0 = 1111 (4bit)
:1 = 0011 (4bit)
:2 = 0101 (4bit)
vectorA has length [3]
```

(`4wire[3,1]` and `4wire[1,3]` use the same `:i` layout and `has length [N]`.)

| Case | Behaviour |
|------|-----------|
| `show(vectorA)` | Header + all elements if ≤ 5 elements |
| More than 5 elements | First three elements, `..`, last element |
| `show(vectorA:1)` | Single element line + `has length [N]` |
| `show(matrixA)` (matrix) | Per-cell `:r:c` lines + `has shape [R,C]` |
| `show(matrixA:0)` (row slice) | Flat row header + `:0:0`…`:0:(C-1)` cell lines + parent `has shape [R,C]` |
| `peek(vectorA)` | Same layout as `show` (emitted at statement position) |
| `show(vectorA; elAll dec)` | All cells in decimal; tags at end — see [debug.md — show](debug.md#show) |

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
