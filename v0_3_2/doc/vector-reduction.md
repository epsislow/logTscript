# Vector reduction functions

Reduction builtins operate on individual wires, whole **1D vectors**, or a mix. When a whole vector is passed, each element participates as a separate operand.

See also: [1D wire vectors](wire-vectors.md), [arithmetic](arithmetic.md) (MAC, ADD).

---

## Operand expansion

| Argument | Behaviour |
|----------|-----------|
| Plain wire `a` or slice `a.1/3` | One operand |
| Whole vector `vectorA` | Expands to `vectorA:0`, `vectorA:1`, … |
| Element `vectorA:0` | One operand (full element) |
| Element sub-range `vectorA:0.1/2` | One operand (bits within element) |
| Mix `SUM(vectorA, x, vectorB)` | Expand each whole vector; leave others as-is |

All expanded operands must have the **same bit width** (runtime error otherwise).

---

## SUM

```
SUM(Wbit ...) -> Wbit result, Wbit over
```

Returns the unsigned sum of all operands. Output is **2W bits** total: low **W** bits in `result`, next **W** bits in `over`. Full value = concatenate `over` then `result` (MSB → LSB), same convention as [MAC](arithmetic.md#mac-multiply-accumulate).

Overflow (sum needs more than **2W** bits) is a **runtime error**.

```logts-play
4wire a = 0011
4wire b = 0101
4wire result, 4wire over = SUM(a, b)
show(result)
show(over)
```

Single vector (sum of elements):

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
```

Variadic (≥ 2 operands after expansion). Unsigned compare; returns the winning operand bit string.

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0110
4wire m = MIN(vectorA)
show(m)
```

---

## DOT

```
DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
```

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
| SUM | `W + ceil(log2(k))` | **2W** |
| DOT | `2W + ceil(log2(n))` | **3W** |

`k` = operand count after expansion; `n` = element count; `W` = element width.

For typical perceptron sizes (`16wire[50]`, `32wire[50]`, `64wire[50]`), built-in **BigInt** evaluation is sufficient. Very large `n` (10⁴+) may be slow in the simulator — see plan V2 for full perceptron examples.

---

## Related

- [wire-vectors.md — reduction](wire-vectors.md#reduction-functions)
- [arithmetic.md — MAC](arithmetic.md#mac-multiply-accumulate)
