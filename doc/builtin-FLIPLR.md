# FLIPLR (flip columns)

Index: [2D tensors](wire-vectors.md)

Reverse **column** order within each row (horizontal mirror).

## Signatures

```
FLIPLR(Wwire tensor) -> Wwire tensor
```

## Examples

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] lr = FLIPLR(m)
show(lr)
```

## See also

[FLIPUD](builtin-FLIPUD.md)
