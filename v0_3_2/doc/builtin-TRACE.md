# TRACE (matrix trace)

Index: [2D tensors](wire-vectors.md) · [SUM](builtin-SUM.md)

Sum of **diagonal** elements of a square matrix (same accumulation semantics as **SUM**).

## Signatures

```
TRACE(Wwire[n,n] matrix) -> Wbit result, Wbit over
```

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed sum along diagonal. |

## Examples

```logts-play
4wire[2,2] eye = IDENTITY(\2)
4wire t, 4wire over = TRACE(eye)
show(t)
```

For `IDENTITY(2)`: trace = `1 + 1 = 2` → `0010`.

## See also

[SUM](builtin-SUM.md) · [DIAG](builtin-DIAG.md)
