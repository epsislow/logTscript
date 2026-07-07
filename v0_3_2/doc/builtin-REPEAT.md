# REPEAT

Index: [2D tensors](wire-vectors.md) · [wire vectors](wire-vectors.md#repeat)

Tile a wire or rank-1 tensor **T** times along its natural axis. Plain wires concatenate; vectors grow along the repeat dimension.

## Signatures

```
REPEAT(Wbit data, Nbit/\N times) -> Wbit or Wwire tensor
```

- **`data`** — whole wire (plain or tensor), **literal** (`"abc"`, `1010`, `^FF`), or bit expression; no slices on wires when tensor output is needed.
- **`times`** — decimal literal `\N` or scalar wire (unsigned integer, **≥ 1**).
- **Limit** — total output bits ≤ **16384** (`len(data) × times` for plain wires).

## Output shape

| Input | Output |
|-------|--------|
| Plain `Wbit` | `Wbit` of length `len × T` (concatenation) |
| `Wwire[N]` / `Wwire[N,1]` (single-dim vector) | `Wwire[N,T]` — column stack |
| `Wwire[1,N]` (comma in decl) | `Wwire[T,N]` — row stack |
| `Wwire[R,C]` with **R > 1** and **C > 1** | **Error:** `Cannot repeat matrix` |

Plain wires stay plain (no tensor metadata on output).

## Examples

### Plain wire

```logts-play
8wire d = 10101010
24wire bus = REPEAT(d, \3)
show(bus)
```

### String literal

Each character → 8-bit ASCII (same as `"abc"` in wire assignment).

```logts-play
48wire msg = REPEAT("abc", \2)
show(msg)
```

`"abc"` = 24 bits; ×2 → **48** bits (`abcabc` as bytes on the wire).

### Column vector → matrix

```logts-play
4wire[3] col = 0001 + 0010 + 0100
4wire[3,2] m = REPEAT(col, \2)
4wire a = m:0:1
show(a)
```

### Row vector `4wire[1,3]` → `4wire[2,3]`

```logts-play
4wire[1,3] row = 0001 + 0010 + 0100
4wire[2,3] m = REPEAT(row, \2)
4wire a = m:1:2
show(a)
```

### Times from a scalar wire

```logts-play
8wire d = 10101010
2wire t = 11
24wire bus = REPEAT(d, t)
show(bus)
```

## See also

[PIVOT](wire-vectors.md#pivot) · [MCAT](builtin-MCAT.md) · [FILL](builtin-FILL.md)
