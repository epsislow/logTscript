# LROTATE (left rotate)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Rotate bits left; MSBs wrap to LSBs. Width unchanged.

## Signatures

```
LROTATE(Xbit data, Ybit count) -> Xbit
LROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
LROTATE(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix) -> Wbit[n,m]
```

- **`count`** is taken **modulo** element width.
- **`; vector`**: `count` may be scalar (broadcast) or **`Kbit[n]`** (per index).

## Scalar (default)

- Rotate left by `count mod width`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per element on **rank-1** tensors. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; `count` scalar or rank-1 broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `LROTATE(Xbit data, Ybit count)`

```logts-play
4wire x = 1011
4wire y = LROTATE(x, 1)
show(y)
```

`1011` rotl 1 → `0111`.

```logts-play
4wire x2 = 1011
4wire y2 = LROTATE(x2, 10)
probe(y2)
```

`count=2` (mod 4) → `1110`.

```logts-play
4wire x3 = 1011
4wire y3 = LROTATE(x3, 100)
show(y3)
```

`count=4` (mod 4 = 0) → unchanged `1011`.

### `LROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector)`

Scalar count (broadcast):

```logts-play
4wire[2] vector = 1011 + 0101
4wire[2] l = LROTATE(vector, 0001; vector)
show(l)
```

→ `0111` + `1010` → blob `01111010`.

Per-index count vector:

```logts-play
4wire[3] data = 1011 + 0101 + 1100
2wire[3] counts = 01 + 10 + 01
4wire[3] out = LROTATE(data, counts; vector)
show(out)
```

### `LROTATE(Wbit[n,m] data, … ; matrix)`

```logts-play
4wire[2,2] m = 1011 + 0101 + 1100 + 0011
4wire[2,2] out = LROTATE(m, 0001; matrix)
show(out)
```

## See also

[RROTATE](builtin-RROTATE.md) · [REVERSE](builtin-REVERSE.md)
