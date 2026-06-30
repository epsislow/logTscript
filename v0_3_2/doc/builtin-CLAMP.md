# CLAMP

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Clamp value to `[min, max]`.

## Signatures

```
CLAMP(Xbit x, Ybit min, Ybit max) -> Ybit
CLAMP(Xbit x, Ybit min, Ybit max; signed) -> Ybit
CLAMP(Wbit[n] x, Wbit/Wbit[n] min, Wbit/Wbit[n] max ; vector) -> Wbit[n]
CLAMP(Wbit[n] x, Wbit/Wbit[n] min, Wbit/Wbit[n] max ; vector signed) -> Wbit[n]
CLAMP(Wbit[n,m] x, Wbit/Wbit[n,m]/scalar min, Wbit/Wbit[n,m]/scalar max ; matrix) -> Wbit[n,m]
CLAMP(Wbit[n,m] x, … ; matrix signed) -> Wbit[n,m]
```

`min` and `max` must have equal width **Y**; `x` may be wider (compare at `len(x)` with bounds zero-extended).

## Scalar (default)

- If `x < min` → `min`; if `x > max` → `max`; else `x` (unsigned), result width **Y**

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed bounds. |
| `vector` | Per index on **rank-1** tensors; bounds broadcast if scalar. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; bounds broadcast as rank-1 row/col/scalar. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `CLAMP(Xbit x, Ybit min, Ybit max)`

```logts-play
4wire val = 1111
4wire lo = 0001
4wire hi = 1000
4wire c = CLAMP(val, lo, hi)
show(c)
```

`15` clamped to `8` → `1000`.

Wider value narrowed to 8 bits:

```logts-play
16wire x = 0000000100101100
8wire zero = 00000000
8wire max255 = 11111111
8wire y = CLAMP(x, zero, max255)
show(y)
```

`300` → `255`.

### `CLAMP(Xbit x, Ybit min, Ybit max; signed)`

```logts-play
4wire x = 1111
4wire lo = 0000
4wire hi = 0010
4wire yU = CLAMP(x, lo, hi)
4wire yS = CLAMP(x, lo, hi; signed)
show(yU)
show(yS)
```

Unsigned: `15` → `2`. Signed: `−1` → `0`.

### `CLAMP(Wbit[n] x, … ; vector)`

```logts-play
4wire[3] vectorX = 1111 + 0100 + 0010
4wire lo = 0001
4wire hi = 1000
4wire[3] y = CLAMP(vectorX, lo, hi; vector)
show(y)
```

### `CLAMP(Wbit[n] x, … ; vector signed)`

```logts-play
4wire[2] vectorX = 1111 + 0100
4wire lo = 0000
4wire hi = 0010
4wire[2] y = CLAMP(vectorX, lo, hi; vector signed)
show(y)
```

### `CLAMP(Wbit[n,m] x, … ; matrix)`

```logts-play
4wire[2,2] x = 1111 + 0100 + 0010 + 1000
4wire lo = 0001
4wire hi = 1000
4wire[2,2] y = CLAMP(x, lo, hi; matrix)
show(y)
```

### `CLAMP(Wbit[n,m] x, … ; matrix signed)`

```logts-play
4wire[2,2] x = 1111 + 0100 + 0010 + 1000
4wire lo = 0000
4wire hi = 0010
4wire[2,2] y = CLAMP(x, lo, hi; matrix signed)
show(y)
```

## See also

[MIN](builtin-MIN.md) · [MAX](builtin-MAX.md)
