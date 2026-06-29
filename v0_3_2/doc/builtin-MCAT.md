# MCAT (matrix concat)

Index: [2D tensors](wire-vectors.md)

Concatenate two tensors along the shared dimension:

| Condition | Result shape |
|-----------|----------------|
| Same **row** count | Horizontal **`[R, C1+C2]`** |
| Same **column** count | Vertical **`[R1+R2, C]`** |

## Signatures

```
MCAT(Wwire tensor A, Wwire tensor B) -> Wwire tensor
```

Target wire must match the computed output shape.

## Examples

### Horizontal (same rows)

```logts-play
4wire[2,1] a = 0001 + 0010
4wire[2,1] b = 0100 + 1000
4wire[2,2] c = MCAT(a, b)
show(c)
```

## See also

[MSLICE](builtin-MSLICE.md) · [PIVOT](wire-vectors.md#pivot)
