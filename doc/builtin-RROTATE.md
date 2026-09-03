# RROTATE (right rotate)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Rotate bits right; LSBs wrap to MSBs. Width unchanged.

## Signatures

```
RROTATE(Xbit data, Ybit count) -> Xbit
RROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
RROTATE(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix) -> Wbit[n,m]
```

- **`count`** is taken **modulo** element width.
- **`; vector`**: `count` may be scalar (broadcast) or **`Kbit[n]`** (per index).

## Scalar (default)

- Rotate right by `count mod width`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per element on **rank-1** tensors. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `RROTATE(Xbit data, Ybit count)`

```logts-play
4wire x = 1011
4wire y = RROTATE(x, 1)
show(y)
```

`1011` rotr 1 → `1101`.

```logts-play
4wire val = 1001
4wire cnt = 0001
4wire r = RROTATE(val, cnt)
show(r)
```

→ `1100`.

### `RROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector)`

Scalar count (broadcast):

```logts-play
4wire[2] vector = 1011 + 0101
4wire[2] r = RROTATE(vector, 0001; vector)
show(r)
```

→ `1101` + `1010` → blob `11011010`.

Per-index count vector:

```logts-play
4wire[3] data = 1011 + 0101 + 1100
2wire[3] counts = 01 + 10 + 01
4wire[3] out = RROTATE(data, counts; vector)
show(out)
```

→ `110101010110` (from regression test).

### `RROTATE(Wbit[n,m] data, … ; matrix)`

```logts-play
4wire[2,2] m = 1011 + 0101 + 1100 + 0011
4wire[2,2] out = RROTATE(m, 0001; matrix)
show(out)
```

## See also

[LROTATE](builtin-LROTATE.md) · [RSHIFT](builtin-RSHIFT.md)
