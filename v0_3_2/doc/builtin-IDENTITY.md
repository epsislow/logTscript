# IDENTITY (identity matrix)

Index: [2D tensors](wire-vectors.md) · [DOT](builtin-DOT.md)

Square **N×N** matrix with **1** on the diagonal and **0** elsewhere.

## Signatures

```
IDENTITY(\N) -> Wwire[N,N]
```

- **`\N`** — decimal dimension (must match target `N×N`).
- **W** — element width from the target wire (`4wire[N,N]` → 4 bits per cell).

## Examples

```logts-play
4wire[3,3] I = IDENTITY(\3)
4wire c = I:0:0
show(c)
```

```logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] eye = IDENTITY(\2)
4wire[2,2] r, 8wire[2,2] o = DOT(a, eye)
show(r)
```

## See also

[ZEROS](builtin-ZEROS.md) · [DIAG](builtin-DIAG.md) · [DOT](builtin-DOT.md)
