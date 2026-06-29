# Vector reduction functions

Reduction builtins operate on individual wires, whole **1D vectors**, or a mix. When a whole vector is passed without `; vector`, each element participates as a separate operand (scalar reduction).

Per-function pages: **[builtin-tagged-index.md](builtin-tagged-index.md)**.

See also: [1D wire vectors](wire-vectors.md), [arithmetic](arithmetic.md) (MAC, ADD).

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| SUM | [builtin-SUM.md](builtin-SUM.md) | `signed`, `vector` |
| DOT | [builtin-DOT.md](builtin-DOT.md) | `signed` |
| MIN | [builtin-MIN.md](builtin-MIN.md) | `signed`, `vector` |
| MAX | [builtin-MAX.md](builtin-MAX.md) | `signed`, `vector` |
| ARGMAX | [builtin-ARGMAX.md](builtin-ARGMAX.md) | `signed`, `index` |
| ARGMIN | [builtin-ARGMIN.md](builtin-ARGMIN.md) | `signed`, `index` |

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

With **`; vector`**, operands are combined **per index** and the result is a **vector**. At least **two** arguments and at least one **whole vector** are required. Other operands may be another vector of the same shape `(N, W)` or a scalar / plain wire of width **W** (broadcast to every index).

| Call | Behaviour |
|------|-----------|
| `SUM(vectorA, vectorB)` | Expand → one scalar sum over all elements |
| `SUM(vectorA, vectorB; vector)` | Per index sum → `Wbit[n]` + `Wbit[n] over` |
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
```

**ARGMAX** / **ARGMIN** do not accept `; vector` (argument is already a whole vector). Details: [builtin-ARGMAX.md](builtin-ARGMAX.md), [builtin-ARGMIN.md](builtin-ARGMIN.md).

**DOT** requires two whole vectors of the same shape; no `; vector` tag. Equivalent to `MAC(acc, a:i, b:i)` with `acc = 0` over each index — [builtin-DOT.md](builtin-DOT.md).

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

- [wire-vectors.md — reduction](wire-vectors.md#reduction-functions)
- [arithmetic.md](arithmetic.md)
- [builtin-MAC.md](builtin-MAC.md)
