# ZEROS (zero matrix)

Index: [2D tensors](wire-vectors.md) · [IDENTITY](builtin-IDENTITY.md)

Square **N×N** matrix with all elements **0**.

## Signatures

```
ZEROS(\N) -> Wwire[N,N]
```

Same rules as [IDENTITY](builtin-IDENTITY.md): `\N` decimal, **W** from target wire.

## Examples

```logts-play
4wire[2,2] z = ZEROS(\2)
4wire a = z:0:1
show(a)
```

## See also

[IDENTITY](builtin-IDENTITY.md) · [FILL](builtin-FILL.md)
