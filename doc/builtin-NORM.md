# NORM (L2² norm)

Index: [Vector reduction](vector-reduction.md) · [DOT](builtin-DOT.md)

**Squared Euclidean norm** of a vector: **`DOT(v, v)`** — sum of squares.

## Signatures

```
NORM(Wwire[n] vector) -> Wbit result, (2W)bit over
NORM(Wwire[n] vector; signed) -> Wbit result, (2W)bit over
```

No square root — hardware-friendly **L2²**.

## Examples

```logts-play
4wire[2] v = 0001 + 0010
4wire n, 8wire no = NORM(v)
4wire d, 8wire do = DOT(v, v)
show(n)
show(d)
```

`NORM(v)` and `DOT(v,v)` produce identical results.

## See also

[L2](builtin-L2.md) · [DOT](builtin-DOT.md)
