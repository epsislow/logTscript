# ARGMIN

Index: [Vector reduction](vector-reduction.md) · [Matrix axis reduction](matrix-reduction.md#axis-reduction-row--col) · [Tagged built-ins](builtin-tagged-index.md)

Position of the minimum element in a wire vector or matrix (one-hot or index).

## Signatures

```
ARGMIN(Wbit[n] vector) -> 1wire[n]
ARGMIN(Wbit[n] vector; index) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n] vector; signed) -> 1wire[n]
ARGMIN(Wbit[n] vector; q4p4) -> 1wire[n]
ARGMIN(Wbit[n] vector; index signed) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n] vector; index q4p4) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n,m] matrix) -> 1wire[n×m]
ARGMIN(Wbit[n,m] matrix; index) -> bit rows, bit cols
ARGMIN(Wbit[n,m] m ; row) -> 1wire[n×m]
ARGMIN(Wbit[n,m] m ; row; index) -> bitIndexWidth(m) wire[n]
ARGMIN(Wbit[n,m] m ; col) -> 1wire[n×m]
ARGMIN(Wbit[n,m] m ; col; index) -> bitIndexWidth(n) wire[m]
```

**No `; vector` tag** — the argument is already a whole tensor. Applies to any **rank-1** tensor (`Wwire[N]`, `Wwire[1,N]`, `Wwire[N,1]`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default (rank-1) | `1wire[n]` | One-hot at minimal index |
| `index` (rank-1) | `bitIndexWidth(n)` | Index of minimal element |
| whole matrix | `1wire[n×m]` | One-hot over all cells |
| matrix `; index` | `bit rows`, `bit cols` | Row and column index of global min |
| `; row` | `1wire[n×m]` | One `1` per row at the minimal column |
| `; row; index` | `bitIndexWidth(m) wire[n]` | Column index per row |
| `; col` | `1wire[n×m]` | One `1` per column at the minimal row |
| `; col; index` | `bitIndexWidth(n) wire[m]` | Row index per column |
| `signed` | (any of above) | Signed compare |
| `q4p4` | (rank-1 modes above) | Q4.4 compare on **8-bit** elements |

**Ties:** lowest index wins.

**`; row` / `; col`** are mutually exclusive with **`; vector`** and **`; matrix`**. On rank-1 tensors without axis tags: `use scalar ARGMIN without col|row tag`.

## Examples

### `ARGMIN(Wbit[n] vector)`

```logts-play
4wire[3] v = 0100 + 0001 + 0001
1wire[3] hot = ARGMIN(v)
show(hot)
```

Min `1` at indices 1 and 2 → one-hot `010`.

### `ARGMIN(Wbit[n,m] m ; row; index)`

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[2] idx = ARGMIN(m; row; index)
show(idx)
```

Column index of min per row → `00` (both rows minimal at column 0).

### `ARGMIN(Wbit[n] vector; signed)`

```logts-play
4wire[3] v = 1111 + 0010 + 1100
1wire[3] hot = ARGMIN(v; signed)
show(hot)
```

Signed min `1100` (−4) at index 2 → `hot=010`.

### `ARGMIN(Wbit[n] vector; index q4p4)`

```logts-play
8wire[3] v = 00011000 + 00001000 + 00010000
2wire idx = ARGMIN(v; index q4p4)
show(idx)
```

Min `0.5` at index 1 → `idx=01`.

## See also

[ARGMAX](builtin-ARGMAX.md) · [MIN](builtin-MIN.md) · [matrix-reduction.md](matrix-reduction.md)
