# TRIU (upper triangle)

Index: [2D tensors](wire-vectors.md)

Keep the **upper triangle** (including diagonal); zero below.

## Signatures

```
TRIU(Wwire[n,n] matrix) -> Wwire[n,n]
```

Cell **`(r,c)`** kept when **`c ≥ r`**.

## Examples

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] up = TRIU(m)
show(up)
```

## See also

[TRIL](builtin-TRIL.md)
