# ARGMIN

Index: [Vector reduction](vector-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

Position of the minimum element in a wire vector (one-hot or index).

## Signatures

```
ARGMIN(Wbit[n] vector) -> 1wire[n]
ARGMIN(Wbit[n] vector; index) -> bitIndexWidth(n) bit
ARGMIN(Wbit[n] vector; signed) -> 1wire[n]
ARGMIN(Wbit[n] vector; index signed) -> bitIndexWidth(n) bit
```

**No `; vector` tag** — the argument is already a whole vector. Applies to any **rank-1** tensor (`Wwire[N]`, `Wwire[1,N]`, `Wwire[N,1]`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default | `1wire[n]` | One-hot at minimal index |
| `index` | `bitIndexWidth(n)` | Index of minimal element |
| `signed` | `1wire[n]` | Signed compare → one-hot |
| `signed index` | `bitIndexWidth(n)` | Signed compare → index |

**Ties:** lowest index wins.

## Examples

### `ARGMIN(Wbit[n] vector)`

```logts-play
4wire[3] v = 0100 + 0001 + 0001
1wire[3] hot = ARGMIN(v)
show(hot)
```

Min `1` at indices 1 and 2 → one-hot `010`.

### `ARGMIN(Wbit[n] vector; index)`

```logts-play
4wire[3] v = 0100 + 0001 + 0001
2wire idx = ARGMIN(v; index)
show(idx)
```

→ `idx=01`.

### `ARGMIN(Wbit[n] vector; signed)`

```logts-play
4wire[3] v = 1111 + 0010 + 1100
1wire[3] hot = ARGMIN(v; signed)
show(hot)
```

Signed min `1100` (−4) at index 2 → `hot=010`.

### `ARGMIN(Wbit[n] vector; index signed)`

```logts-play
4wire[3] v = 1111 + 0010 + 1100
2wire idx = ARGMIN(v; index signed)
show(idx)
```

→ `idx=10`.

## See also

[ARGMAX](builtin-ARGMAX.md) · [MIN](builtin-MIN.md)
