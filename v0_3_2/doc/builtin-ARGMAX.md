# ARGMAX

Index: [Vector reduction](vector-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

Position of the maximum element in a wire vector (one-hot or index).

## Signatures

```
ARGMAX(Wbit[n] vector) -> 1wire[n]
ARGMAX(Wbit[n] vector; index) -> bitIndexWidth(n) bit
ARGMAX(Wbit[n] vector; signed) -> 1wire[n]
ARGMAX(Wbit[n] vector; index signed) -> bitIndexWidth(n) bit
```

**No `; vector` tag** — the argument is already a whole vector. Applies to any **rank-1** tensor (`Wwire[N]`, `Wwire[1,N]`, `Wwire[N,1]`); see [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

| Mode | Output | Description |
|------|--------|-------------|
| default | `1wire[n]` | **One-hot** mask (`1` at winning index) |
| `index` | `bitIndexWidth(n)` | Unsigned index of maximal element |
| `signed` | `1wire[n]` | Signed compare → one-hot |
| `signed index` | `bitIndexWidth(n)` | Signed compare → index |

**Ties:** lowest index wins. For the **value** at max, use [MAX](builtin-MAX.md).

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

### `ARGMAX(Wbit[n] vector; signed)`

```logts-play
4wire[3] v = 1111 + 0010 + 0100
1wire[3] hot = ARGMAX(v; signed)
show(hot)
```

Signed max is `0100` at index 2 → `hot=001`.

### `ARGMAX(Wbit[n] vector; index signed)`

```logts-play
4wire[3] v = 1111 + 0010 + 0100
2wire idx = ARGMAX(v; index signed)
show(idx)
```

→ `idx=10` (index 2).

## See also

[ARGMIN](builtin-ARGMIN.md) · [MAX](builtin-MAX.md)
