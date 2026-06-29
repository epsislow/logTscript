# FILL (constant matrix)

Index: [2D tensors](wire-vectors.md)

Fill every cell of an **N×N** matrix with the same scalar value.

## Signatures

```
FILL(\N, Wbit scalar) -> Wwire[N,N]
```

- **`\N`** — matrix dimension (must match target).
- **scalar** — any **W**-bit expression (literal, wire, or slice).

## Examples

```logts-play
4wire[2,2] m = FILL(\2, 0011)
show(m)
```

## See also

[ZEROS](builtin-ZEROS.md) · [IDENTITY](builtin-IDENTITY.md)
