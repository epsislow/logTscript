# ARGMAX

Index: [Vector reduction](vector-reduction.md) · [Matrix axis reduction](matrix-reduction.md#axis-reduction-row--col) · [Tagged built-ins](builtin-tagged-index.md)

Position of the maximum element in a wire vector or matrix (one-hot or index).

## Signatures

```
ARGMAX(Wbit[n] vector) -> 1wire[n]
ARGMAX(Wbit[n] vector; index) -> bitIndexWidth(n) bit
ARGMAX(Wbit[n] vector; signed) -> 1wire[n]
ARGMAX(Wbit[n] vector; index signed) -> bitIndexWidth(n) bit
ARGMAX(Wbit[n,m] matrix) -> 1wire[n×m]
ARGMAX(Wbit[n,m] matrix; index) -> bit rows, bit cols
ARGMAX(Wbit[n,m] m ; row) -> 1wire[n×m]
ARGMAX(Wbit[n,m] m ; row; index) -> bitIndexWidth(m) wire[n]
ARGMAX(Wbit[n,m] m ; col) -> 1wire[n×m]
ARGMAX(Wbit[n,m] m ; col; index) -> bitIndexWidth(n) wire[m]
```

**No `; vector` tag** — the argument is already a whole tensor. Applies to any **rank-1** tensor (`Wwire[N]`, `Wwire[1,N]`, `Wwire[N,1]`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default (rank-1) | `1wire[n]` | **One-hot** mask (`1` at winning index) |
| `index` (rank-1) | `bitIndexWidth(n)` | Unsigned index of maximal element |
| whole matrix | `1wire[n×m]` | One-hot over all cells |
| matrix `; index` | `bit rows`, `bit cols` | Row and column index of global max |
| `; row` | `1wire[n×m]` | One `1` per row at the maximal column |
| `; row; index` | `bitIndexWidth(m) wire[n]` | Column index per row |
| `; col` | `1wire[n×m]` | One `1` per column at the maximal row |
| `; col; index` | `bitIndexWidth(n) wire[m]` | Row index per column |
| `signed` | (any of above) | Signed compare |

**Ties:** lowest index wins. For the **value** at max, use [MAX](builtin-MAX.md).

**`; row` / `; col`** are mutually exclusive with **`; vector`** and **`; matrix`**. On rank-1 tensors without axis tags: `use scalar ARGMAX without col|row tag`.

## Examples

### `ARGMAX(Wbit[n] vector)`

```logts-play
4wire[4] v = 0010 + 1000 + 1000 + 0001
1wire[4] hot = ARGMAX(v)
show(hot)
```

Max `8` at indices 1 and 2 → one-hot `0100` (index 1 wins).

### `ARGMAX(Wbit[n] vector; index)`

```logts-play
4wire[4] v = 0010 + 1000 + 1000 + 0001
2wire idx = ARGMAX(v; index)
show(idx)
```

→ `idx=01`.

### `ARGMAX(Wbit[n,m] m ; row; index)`

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[2] idx = ARGMAX(m; row; index)
show(idx)
```

Column index of max per row → `11` (both rows peak at column 1).

### `ARGMAX(Wbit[n,m] m ; row)` (one-hot)

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
1wire[4] hot = ARGMAX(m; row)
show(hot)
```

One `1` per row in row-major `1wire[n×m]` → `0101`.

### `ARGMAX(Wbit[n] vector; signed)`

```logts-play
4wire[3] v = 1111 + 0010 + 0100
1wire[3] hot = ARGMAX(v; signed)
show(hot)
```

Signed max is `0100` at index 2 → `hot=001`.

## See also

[ARGMIN](builtin-ARGMIN.md) · [MAX](builtin-MAX.md) · [matrix-reduction.md](matrix-reduction.md)
