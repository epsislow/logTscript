# MAX

Index: [Arithmetic](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Matrix `; matrix`](matrix-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

## Signatures

```
MAX(Wbit ...) -> Wbit
MAX(Wbit ...; signed) -> Wbit
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n]
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector signed) -> Wbit[n]
MAX(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar ... ; matrix) -> Wbit[n,m]
MAX(Wbit[n,m] ... ; matrix signed) -> Wbit[n,m]
MAX(Wbit[n,m] m ; row) -> Wbit[n]
MAX(Wbit[n,m] m ; col) -> Wbit[m]
MAX(Wbit[n,m] m ; row signed) -> Wbit[n]
MAX(Wbit[n,m] m ; col signed) -> Wbit[m]
```

Variadic (≥ 2 operands after expansion).

## Scalar (default)

- Returns the **bit pattern** of the winning value (unsigned max)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed maximum. |
| `vector` | Per index on **rank-1** tensors. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |
| `row` | Per-row maximum across columns → `Wbit[N]`. Mutually exclusive with `vector` and `matrix`. |
| `col` | Per-column maximum across rows → `Wbit[M]`. Mutually exclusive with `vector` and `matrix`. |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix). On rank-1 tensors without `; row` / `; col`: `use scalar MAX without col|row tag`.

## Examples

### `MAX(Wbit ...)`

```logts-play
4wire a = 0101
4wire b = 0011
4wire c = 1000
4wire hi = MAX(a, b, c)
show(hi)
```

`MAX(5,3,8)=8` → `1000`.

### `MAX(Wbit ...; signed)`

```logts-play
4wire neg = 1111
4wire pos = 0010
4wire hi = MAX(neg, pos; signed)
show(hi)
```

Signed `MAX(−1, 2)=2` → `0010`.

### `MAX(Wbit[n] a, … ; vector)`

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, 0001; vector)
show(out)
```

### `MAX(Wbit[n] a, … ; vector signed)`

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, vectorB; vector signed)
show(out)
```

### `MAX(Wbit[n,m] … ; matrix)`

```logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0010 + 0011 + 0100 + 1001
4wire[2,2] out = MAX(a, b; matrix)
show(out)
```

### `MAX(Wbit[n,m] … ; matrix signed)`

```logts-play
4wire[2,2] a = 1111 + 0010 + 1000 + 0100
4wire[2,2] b = 0001 + 1111 + 0100 + 0010
4wire[2,2] out = MAX(a, b; matrix signed)
show(out)
```

### `MAX(Wbit[n,m] m ; row)` / `MAX(Wbit[n,m] m ; col)`

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] rmax = MAX(m; row)
4wire[2] cmax = MAX(m; col)
show(rmax)
show(cmax)
```

## See also

[MIN](builtin-MIN.md) · [CLAMP](builtin-CLAMP.md) · [ARGMAX](builtin-ARGMAX.md)
