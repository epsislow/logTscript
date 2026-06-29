# OUTER (outer product)

Index: [2D tensors](wire-vectors.md) · [DOT](builtin-DOT.md)

**Outer product** of a column vector **`[N,1]`** and a row vector **`[1,M]`**:

**`C[i,j] = A[i] × B[j]`** (unsigned/signed per call tags on multiply).

## Signatures

```
OUTER(Wwire[N,1] col, Wwire[1,M] row) -> Wwire[N,M], (2W)bit over
```

Target wire must be **`[N,M]`**. Operand order may be swapped if one is row and one is column.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed multiply per cell (same as [MULTIPLY](builtin-MULTIPLY.md)). |

## Examples

```logts-play
4wire[2,1] col = 0001 + 0010
4wire[1,2] row = 0011 + 0100
4wire[2,2] m, 4wire[2,2] o = OUTER(col, row)
show(m)
```

## See also

[DOT](builtin-DOT.md) · [MULTIPLY](builtin-MULTIPLY.md)
