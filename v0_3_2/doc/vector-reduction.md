# Vector reduction functions

Reduction builtins operate on individual wires, whole **1D vectors**, or a mix. When a whole vector is passed without `; vector`, each element participates as a separate operand (scalar reduction).

Per-function pages: **[builtin-tagged-index.md](builtin-tagged-index.md)**.

See also: [1D wire vectors](wire-vectors.md), [2D `; matrix` mode](matrix-reduction.md), [arithmetic](arithmetic.md) (MAC, ADD).

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| SUM | [builtin-SUM.md](builtin-SUM.md) | `signed`, `vector`, `matrix`, `row`, `col` |
| DOT | [builtin-DOT.md](builtin-DOT.md) | `signed` |
| MIN | [builtin-MIN.md](builtin-MIN.md) | `signed`, `vector`, `matrix`, `row`, `col` |
| MAX | [builtin-MAX.md](builtin-MAX.md) | `signed`, `vector`, `matrix`, `row`, `col` |
| ARGMAX | [builtin-ARGMAX.md](builtin-ARGMAX.md) | `signed`, `index`, `row`, `col` |
| ARGMIN | [builtin-ARGMIN.md](builtin-ARGMIN.md) | `signed`, `index`, `row`, `col` |

Element-wise `EQ`: [builtin-EQ.md](builtin-EQ.md).

---

## Operand expansion (default, without `; vector`)

| Argument | Behaviour |
|----------|-----------|
| Plain wire `a` or slice `a.1/3` | One operand |
| Whole vector `vectorA` | Expands to `vectorA:0`, `vectorA:1`, … |
| Element `vectorA:0` | One operand (full element) |
| Element sub-range `vectorA:0.1/2` | One operand (bits within element) |
| Mix `SUM(vectorA, x, vectorB)` | Expand each whole vector; leave others as-is |

All expanded operands must have the **same bit width** (runtime error otherwise).

---

## Element-wise mode (`; vector`) {#element-wise-mode-vector}

With **`; vector`**, operands are combined **per index** and the result is a **vector**. Applies to all **rank-1** tensors: `4wire[N]`, `4wire[1,N]`, `4wire[N,1]` — matching **`elementCount`** and **`elementWidth`**.

At least **two** arguments and at least one **whole vector** are required. Other operands may be:

- another **whole** rank-1 vector of the same `elementCount`;
- a **scalar** / plain `Wbit` wire (broadcast to every index);
- an **element slice** `vectorA:i` or sub-range `vectorA:i.j/k` — evaluated as **W** bits (same as `show(vectorA:i)`), then broadcast.

| Call | Behaviour |
|------|-----------|
| `SUM(vectorA, vectorB)` | Expand → one scalar sum over all elements |
| `SUM(vectorA, vectorB; vector)` | Per index sum → `Wbit[n]` + `Wbit[n] over` |
| `SUM(vectorA, vectorB:1; vector)` | Per index sum; second operand is element `1` broadcast (equivalent to `SUM(vectorA, 0011; vector)` when `vectorB:1` = `0011`) |
| `SUM(colA, colB; vector)` | Same on `4wire[N,1]` — linear indices `:0`…`:N-1` |
| `MIN(vectorA, 0001; vector)` | Per index min → `Wbit[n]` |
| `MAX(vectorA, vectorB; signed vector)` | Per index max (signed) → `Wbit[n]` |
| `GT(vectorA, vectorB; vector)` | Per index compare → `1wire[n]` |
| `EQ(vectorA, vectorB; vector)` | Per index bitwise equal → `1wire[n]` |

`signed` and `vector` may appear in any order (`; signed vector` ≡ `; vector signed`).

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, 0001; vector signed)
4wire[4] r, 4wire[4] o = SUM(vectorA, vectorB; vector)
4wire[4] r2, 4wire[4] o2 = SUM(vectorA, vectorB:1; vector)
show(r2)
```

Element slice `vectorB:1` adds the value at index `1` to every index of `vectorA` (same width **W** as one cell).

```logts-play
4wire[3,1] a = 0001 + 0010 + 0100
4wire[3,1] b = 0001 + 0010 + 0100
4wire[3] r, 4wire[3] f = ADD(a, b; vector)
show(r)
```

**ARGMAX** / **ARGMIN** do not accept `; vector` (argument is already a whole vector). Details: [builtin-ARGMAX.md](builtin-ARGMAX.md), [builtin-ARGMIN.md](builtin-ARGMIN.md).

**DOT** requires two whole rank-1 tensors with the same **element count**; no `; vector` tag — [builtin-DOT.md](builtin-DOT.md).

---

## Element-wise mode (`; matrix`) {#element-wise-mode-matrix}

On **2D tensors** (`4wire[N,M]` with **N>1** and **M>1**), use **`; matrix`** for per-cell operations. Same built-ins as **`; vector`**, except **DOT**, **ARGMAX**, and **ARGMIN** (shape rules instead).

**`; vector`** and **`; matrix`** are **mutually exclusive**.

| Call | Behaviour |
|------|-----------|
| `SUM(a, b; matrix)` | Per cell sum → `Wbit[N,M]` + `Wbit[N,M] over` |
| `MIN(a, b; matrix)` | Per cell min → `Wbit[N,M]` |
| `ADD(m, row; matrix)` | Matrix + row vector broadcast → `Wbit[N,M]` |

Broadcast at cell `(r,c)`: matrix cell, scalar, or rank-1 vector (`[1,M]` across columns, `[N,1]` across rows). Compares (`GT`, `LT`, `EQ`) return **`1wire[N×M]`** (one bit per cell).

Semantics: **[matrix-reduction.md](matrix-reduction.md)**. Examples: **[builtin-SUM.md](builtin-SUM.md)**, **[builtin-ADD.md](builtin-ADD.md)**, **[builtin-MIN.md](builtin-MIN.md)**, … — [builtin-tagged-index.md](builtin-tagged-index.md).

---

## Axis reduction (`; row` / `; col`) {#axis-reduction-row-col}

On a **true matrix** (`N>1`, `M>1`), **SUM**, **MIN**, **MAX**, **ARGMAX**, and **ARGMIN** accept **`; row`** or **`; col`** to reduce along one axis:

| Tag | Reduces over | Output shape |
|-----|--------------|--------------|
| **`; row`** | columns (per row) | `Wbit[N]` or `1wire[N×M]` / index vector (ARG*) |
| **`; col`** | rows (per column) | `Wbit[M]` or `1wire[N×M]` / index vector (ARG*) |

Mutually exclusive with **`; vector`** and **`; matrix`**. Rank-1 tensors without axis tags → `use scalar <FN> without col|row tag`.

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] r, 4wire[2] o = SUM(m; row)
4wire[2] cmin = MIN(m; col)
4wire[2] rmax = MAX(m; row)
1wire[2] idx = ARGMAX(m; row; index)
show(r)
show(cmin)
show(rmax)
show(idx)
```

Details: [builtin-SUM.md](builtin-SUM.md), [builtin-MIN.md](builtin-MIN.md), [builtin-MAX.md](builtin-MAX.md), [builtin-ARGMAX.md](builtin-ARGMAX.md), [builtin-ARGMIN.md](builtin-ARGMIN.md).

---

## Capacity notes

| Function | Bits needed (worst case) | Output width |
|----------|--------------------------|--------------|
| SUM (scalar) | `W + ceil(log2(k))` | **2W** (`result` + `over`) |
| SUM (`; vector`) | `2W` per index | **2W** per element |
| DOT | `2W + ceil(log2(n))` | **W** + **(2W)** over |

`k` = operand count after expansion; `n` = element count; `W` = element width.

Overflow beyond the documented output width is a **runtime error**.

For typical perceptron sizes (`16wire[50]`, `32wire[50]`, `64wire[50]`), built-in **BigInt** evaluation is sufficient.

---

## Related

- [wire-vectors.md — 2D tensors & `; matrix`](wire-vectors.md#2d-tensors-4wirenm)
- [matrix-reduction.md](matrix-reduction.md)
- [arithmetic.md](arithmetic.md)
- [builtin-MAC.md](builtin-MAC.md)
