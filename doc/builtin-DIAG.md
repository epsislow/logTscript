# DIAG (diagonal matrix)

Index: [2D tensors](wire-vectors.md)

Build a square matrix from a vector on the **diagonal**; off-diagonal cells are **0**.

## Signatures

```
DIAG(Wwire[n] vector) -> Wwire[n,n]
```

Vector length **n** must match target **n×n**. Element width **W** must match.

## Examples

```logts-play
4wire[3] v = 0001 + 0010 + 0100
4wire[3,3] d = DIAG(v)
4wire x = d:1:1
show(x)
```

## See also

[IDENTITY](builtin-IDENTITY.md) · [TRACE](builtin-TRACE.md)
