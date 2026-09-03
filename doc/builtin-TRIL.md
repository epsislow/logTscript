# TRIL (lower triangle)

Index: [2D tensors](wire-vectors.md)

Keep the **lower triangle** (including diagonal); zero above.

## Signatures

```
TRIL(Wwire[n,n] matrix) -> Wwire[n,n]
```

Cell **`(r,c)`** kept when **`c ≤ r`**.

## Examples

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] lo = TRIL(m)
show(lo)
```

## See also

[TRIU](builtin-TRIU.md) · [PIVOT](wire-vectors.md#pivot)
