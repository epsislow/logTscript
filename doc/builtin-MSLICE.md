# MSLICE (matrix slice)

Index: [2D tensors](wire-vectors.md)

Extract a **rectangular window** from a matrix. All index/size arguments are **decimal literals** (`\0`, `\2`, …).

## Signatures

```
MSLICE(Wwire matrix, \r0, \c0, \h, \w) -> Wwire[h,w]
```

- **`(r0, c0)`** — top-left corner (0-based).
- **`(h, w)`** — window height and width.
- Window must fit inside the source matrix.

## Examples

```logts-play
4wire[3,3] m = 0001 + 0010 + 0100 + 1000 + 0001 + 0010 + 0100 + 1000 + 0001
4wire[2,2] s = MSLICE(m, \1, \1, \2, \2)
show(s)
```

## See also

[MCAT](builtin-MCAT.md) · [Indexing](wire-vectors.md#indexing-2d)
