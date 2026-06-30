# SUM

Index: [Vector reduction](vector-reduction.md) · [Matrix `; matrix`](matrix-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

Reduce operands to a scalar sum, or per-index with `; vector` on rank-1 tensors, per-cell with `; matrix` on true matrices (`R>1`, `C>1`), or along an axis with `; row` / `; col`.

## Signatures

```
SUM(Wbit ...) -> Wbit result, Wbit over
SUM(Wbit ...; signed) -> Wbit result, Wbit over
SUM(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n], Wbit[n]
SUM(Wbit[n] ... ; signed vector) -> Wbit[n], Wbit[n]
SUM(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b, ... ; matrix) -> Wbit[n,m], Wbit[n,m]
SUM(Wbit[n,m] ... ; signed matrix) -> Wbit[n,m], Wbit[n,m]
SUM(Wbit[n,m] m ; row) -> Wbit[n], Wbit[n]
SUM(Wbit[n,m] m ; col) -> Wbit[m], Wbit[m]
SUM(Wbit[n,m] m ; row signed) -> Wbit[n], Wbit[n]
SUM(Wbit[n,m] m ; col signed) -> Wbit[m], Wbit[m]
```

Variadic: whole vectors expand to elements (see [vector-reduction.md](vector-reduction.md)).

## Scalar (default)

- Output is **2W** bits: low **W** in `result`, next **W** in `over`
- Full value = concatenate `over` then `result` (MSB → LSB)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed two's complement sum; same 2W packing. |
| `vector` | Per index on **rank-1** tensors → `Wbit[n]` + `Wbit[n] over`. Element slices (`vectorB:i`) and plain **W**-bit scalars broadcast. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; rank-1 operands broadcast. Mutually exclusive with `vector`. See [matrix-reduction.md](matrix-reduction.md). |
| `row` | On a **matrix**, sum each **row** across columns → `Wbit[N]` + `Wbit[N] over`. Mutually exclusive with `vector` and `matrix`. |
| `col` | On a **matrix**, sum each **column** across rows → `Wbit[M]` + `Wbit[M] over`. Mutually exclusive with `vector` and `matrix`. |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix). Rank-1 tensors without `; row` / `; col` use scalar or `; vector` mode; axis tags on rank-1 tensors are a **runtime error** (`use scalar SUM without col|row tag`).

## Examples

### `SUM(Wbit ...)`

Two scalars:

```logts-play
4wire a = 0011
4wire b = 0101
4wire result, 4wire over = SUM(a, b)
show(result)
show(over)
```

`3+5=8` → `result=1000`, `over=0000`.

Whole vector (sum of elements):

```logts-play
4wire[3] vectorA = 0001 + 0010 + 0011
4wire result, 4wire over = SUM(vectorA)
show(result)
show(over)
```

`1+2+3=6` → `result=0110`, `over=0000`.

### `SUM(Wbit ...; signed)`

```logts-play
4wire a = 1111
4wire b = 0001
4wire r, 4wire o = SUM(a, b; signed)
show(r)
show(o)
```

Signed `−1 + 1 = 0`.

### `SUM(Wbit[n] a, … ; vector)`

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] r, 4wire[4] o = SUM(vectorA, vectorB; vector)
show(r)
show(o)
```

Element slice broadcast (add `vectorB:1` at every index):

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] r, 4wire[4] o = SUM(vectorA, vectorB:1; vector)
show(r)
show(o)
```

### `SUM(Wbit[n] … ; signed vector)`

```logts-play
4wire[2] vectorA = 1111 + 0111
4wire[2] vectorB = 0001 + 0001
4wire[2] r, 4wire[2] o = SUM(vectorA, vectorB; signed vector)
show(r)
show(o)
```

### `SUM(Wbit[n,m] … ; matrix)`

```logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0010 + 0010 + 0010 + 0010
4wire[2,2] r, 4wire[2,2] o = SUM(a, b; matrix)
show(r)
show(o)
```

### `SUM(Wbit[n,m] … ; signed matrix)`

```logts-play
4wire[2,2] a = 1111 + 0111 + 0001 + 1000
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] o = SUM(a, b; signed matrix)
show(r)
show(o)
```

### `SUM(Wbit[n,m] m ; row)` / `SUM(Wbit[n,m] m ; col)`

Axis reduction on a **true matrix** (`N>1`, `M>1`):

- **`; row`** — one sum per row (across columns) → `Wbit[N]` + `Wbit[N] over`
- **`; col`** — one sum per column (across rows) → `Wbit[M]` + `Wbit[M] over`

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2] r, 4wire[2] o = SUM(m; row)
4wire[2] c, 4wire[2] co = SUM(m; col)
show(r)
show(c)
```

Row sums: `3`, `12` → `00111100`. Column sums: `5`, `10` → `01011010`.

## See also

[DOT](builtin-DOT.md) · [ADD](builtin-ADD.md)
