# FLIPUD (flip rows)

Index: [2D tensors](wire-vectors.md)

Reverse **row** order (vertical flip). Same shape as input.

## Signatures

```
FLIPUD(Wwire tensor) -> Wwire tensor
```

## Examples

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] ud = FLIPUD(m)
show(ud)
```

## See also

[FLIPLR](builtin-FLIPLR.md) · [PIVOT](wire-vectors.md#pivot)
