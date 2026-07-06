# SORT

Index: [2D tensors](wire-vectors.md) · [LUT bulk export](lut.md#bulk-export-keys-values-entries) · [Tagged built-ins](builtin-tagged-index.md)

Stable sort of a whole wire vector or matrix. Comparison is **unsigned** on each element's bit pattern.

**Tag rule:** one semicolon per call; tags after it are **space-separated** (e.g. `; desc col=1`, not `; desc; col=1`).

## Signatures

```
SORT(Wbit[n] vector) -> Wbit[n]
SORT(Wbit[n] vector; desc) -> Wbit[n]
SORT(Wbit[r,c] matrix; col=k) -> Wbit[r,c]
SORT(Wbit[r,c] matrix; row=k) -> Wbit[r,c]
SORT(Wbit[r,c] matrix; col=k desc) -> Wbit[r,c]
```

| Tag | Applies to | Description |
|-----|------------|-------------|
| *(none)* | vector | Ascending element order |
| `desc` | vector | Descending element order |
| `col=k` | matrix (`r>1`, `c>1`) | Sort **rows** by column `k` (ascending) |
| `row=k` | matrix | Sort **columns** by row `k` (ascending) |
| `desc` | matrix | Reverse compare direction for the chosen axis |

**Ties:** lower original index wins (stable sort).

**Errors:** matrix without `col=` or `row=`; `col` / `row` on vectors; `col` and `row` together; index out of range.

## Examples

### Vector ascending

```logts-play
4wire[4] v = 0100 + 0001 + 1000 + 0010
4wire[4] s = SORT(v)
show(s)
```

### Vector descending

```logts-play
4wire[4] v = 0100 + 0001 + 1000 + 0010
4wire[4] s = SORT(v; desc)
show(s)
```

### Matrix — sort rows by column 1

```logts-play
4wire[3,2] m = 0001 + 0010 + 0100 + 0001 + 0011 + 1000
4wire[3,2] s = SORT(m; col=1)
4wire[3] keys = s::0
show(keys)
```

### LUT entries by value (frequency column)

```logts-play wave
inline [lut] .freq:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0100
    010 : 0011
  }
  :
4wire[3,2] e = .freq:entries()
4wire[3,2] s = SORT(e; col=1)
4wire[3] syms = s::0
show(syms)
```

## See also

[ARGMAX](builtin-ARGMAX.md) · [REPEAT](builtin-REPEAT.md) · [lut.md — `:entries`](lut.md#bulk-export-keys-values-entries)
