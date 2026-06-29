# Vector reduction functions

Reduction builtins operate on individual wires, whole **1D vectors**, or a mix. When a whole vector is passed without `; vector`, each element participates as a separate operand (scalar reduction).

See also: [1D wire vectors](wire-vectors.md), [arithmetic](arithmetic.md) (MAC, ADD).

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

## Element-wise mode (`; vector`)

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

---

## SUM

```
SUM(Wbit ...) -> Wbit result, Wbit over
SUM(Wbit ...; signed) -> Wbit result, Wbit over
SUM(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n], Wbit[n]
SUM(Wbit[n] ... ; signed vector) -> Wbit[n], Wbit[n]
```

Returns the sum of all operands (unsigned by default). With `; signed`, each operand is **two's complement** on width **W**. Output is **2W bits** total: low **W** bits in `result`, next **W** bits in `over`. Full value = concatenate `over` then `result` (MSB → LSB), same convention as [MAC](arithmetic.md#mac-multiply-accumulate).

With `; vector`, each index has its own `result[i]` and `over[i]` (same 2W packing per element).

Overflow (more than **2W** bits needed per sum) is a **runtime error**.

```logts-play
4wire a = 0011
4wire b = 0101
4wire result, 4wire over = SUM(a, b)
show(result)
show(over)
```

Single vector (sum of elements, scalar reduction):

```logts-play
4wire[3] vectorA = 0001 + 0010 + 0011
4wire result, 4wire over = SUM(vectorA)
show(result)
```

---

## MIN / MAX

```
MIN(Wbit ...) -> Wbit
MAX(Wbit ...) -> Wbit
MIN(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n]
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector signed) -> Wbit[n]
```

Variadic (≥ 2 operands after expansion, or ≥ 2 arguments with `; vector`). Unsigned compare by default; `; signed` uses two's complement. With `; vector`, returns one **vector** blob (`Wbit[n]`).

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0110
4wire m = MIN(vectorA)
show(m)
```

---

## DOT

```
DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
DOT(Wbit[n] a, Wbit[n] b; signed) -> Wbit result, (2W)bit over
```

Dot product of two whole vectors (same shape). With `; signed`, each element is interpreted as **two's complement** before multiply-accumulate; output packing (`result` low **W**, `over` next **2W**) is unchanged.

Dot product of two **whole vectors** of the same shape (`elementWidth` × `elementCount`). Output is **3W bits**: low **W** in `result`, next **2W** in `over`.

```logts-play
4wire[3] vectorA = 0001 + 0010 + 0011
4wire[3] vectorB = 0100 + 0101 + 0110
4wire result, 8wire over = DOT(vectorA, vectorB)
show(result)
show(over)
```

Equivalent to accumulating `MAC(acc, vectorA:i, vectorB:i)` with `acc = 0` over each index `i` (implementation may fuse in one pass).

Slice arguments (`DOT(vectorA:0, vectorB:0)`) are **not** supported — use `MULTIPLY` / `MAC` for a single product.

---

## Capacity notes

| Function | Bits needed (worst case) | Output width |
|----------|--------------------------|--------------|
| SUM (scalar) | `W + ceil(log2(k))` | **2W** |
| SUM (`; vector`) | `2W` per index | **2W** per element |
| DOT | `2W + ceil(log2(n))` | **3W** |

`k` = operand count after expansion; `n` = element count; `W` = element width.

For typical perceptron sizes (`16wire[50]`, `32wire[50]`, `64wire[50]`), built-in **BigInt** evaluation is sufficient. Very large `n` (10⁴+) may be slow in the simulator — see plan V2 for full perceptron examples.

---

## Related

- [wire-vectors.md — reduction](wire-vectors.md#reduction-functions)
- [arithmetic.md — MAC](arithmetic.md#mac-multiply-accumulate)
