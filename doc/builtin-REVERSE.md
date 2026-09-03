# REVERSE (bit order)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Reverse bit order within each operand (MSB ↔ LSB).

## Signatures

```
REVERSE(Xbit value) -> Xbit
REVERSE(Wbit[n] data ; vector) -> Wbit[n]
REVERSE(Wbit[n,m] data ; matrix) -> Wbit[n,m]
```

Unary — one data argument (whole vector in vector mode).

## Scalar (default)

- `result[i]` = `val[width-1-i]`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Reverse bits **within each element** on **rank-1** tensors (not reverse element order). |
| `matrix` | Reverse bits within each cell on **matrix** `Wwire[N,M]`. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `REVERSE(Xbit value)`

```logts-play
4wire x = 0011
4wire y = REVERSE(x)
show(y)
```

`0011` → `1100`.

```logts-play
4wire a = 1010
4wire b = REVERSE(a)
show(b)
```

`1010` → `0101`.

Palindrome unchanged:

```logts-play
4wire val = 1001
4wire r = REVERSE(val)
show(r)
```

→ `1001`.

### `REVERSE(Wbit[n] data ; vector)`

```logts-play
4wire[2] vector = 0011 + 1100
4wire[2] out = REVERSE(vector; vector)
show(out)
```

→ `1100` + `0011` → blob `11000011`.

```logts-play
4wire[3] v = 0011 + 1010 + 1111
4wire[3] r = REVERSE(v; vector)
show(r)
```

Per element: `1100`, `0101`, `1111`.

### `REVERSE(Wbit[n,m] data ; matrix)`

```logts-play
4wire[2,2] m = 0011 + 1010 + 1111 + 0000
4wire[2,2] out = REVERSE(m; matrix)
show(out)
```

Per cell: MSB ↔ LSB within each **W**-bit cell.

## See also

[LROTATE](builtin-LROTATE.md) · [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md)
