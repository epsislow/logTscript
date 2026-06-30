# SHAPE

Index: [Wire vectors](wire-vectors.md) · [RANK](builtin-RANK.md) · [Tensor / matrix built-ins](builtin-functions.md)

Returns the **row** and **column** dimensions of a whole tensor as two unsigned scalar wires.

## Signatures

```
SHAPE(Wwire tensor) -> bit rows, bit cols
```

- **`rows`** — `meta.rows` (number of matrix rows, or `1` for a horizontal rank-1 vector)
- **`cols`** — `meta.cols` (number of matrix columns, or element count for `[N]` / `[1,N]`)

Bit width of each scalar follows the **assignment target** wire (`2wire rows, 3wire cols = SHAPE(m)`). Without a multi-wire assign context, each dimension uses `bitIndexWidth(dim + 1)` bits.

## Examples

### Matrix

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
2wire rows, 2wire cols = SHAPE(m)
show(rows)
show(cols)
```

→ `rows=10`, `cols=10` (2×2).

### Rank-1 vector

```logts-play
4wire[4] v = 0001 + 0010 + 0100 + 1000
2wire rows, 3wire cols = SHAPE(v)
show(rows)
show(cols)
```

→ `rows=01` (1 row), `cols=100` (4 columns).

## See also

[RANK](builtin-RANK.md) · [wire-vectors.md](wire-vectors.md)
