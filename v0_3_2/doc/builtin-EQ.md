# EQ (equality)

Index: [Logic gates](builtin-logic-gate-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector) · [Matrix `; matrix`](matrix-reduction.md)

Bitwise equality (all bits of each operand must match).

## Signatures

```
EQ(Xbit a, Xbit b) -> 1bit result
EQ(Xbit a, Xbit b, Xbit c, ...) -> 1bit result
EQ(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
EQ(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> 1wire[n×m]
```

- **Two operands:** `1` if every bit pair matches (bitwise).
- **Three or more operands (no tag):** `1` only if **all** operands are bitwise equal pairwise.
- **`; vector`:** exactly **two** arguments; compare per index → `1wire[n]`.
- **`; matrix`:** exactly **two** arguments; compare per cell → **`1wire[N×M]`** (bitwise equality of each cell).

## Scalar (default)

- Bitwise compare; width mismatch uses left zero-padding (same as other logic gates).

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per-index equality `a[i] == b[i]` → `1wire[n]`. |
| `matrix` | Per-cell equality → **`1wire[N×M]`**. See [matrix-reduction.md](matrix-reduction.md). |

**No `; signed` tag** — equality is bitwise.

## Examples

### `EQ(Xbit a, Xbit b)`

```logts-play
4wire a = 1010
4wire b = 1010
1wire eq = EQ(a, b)
show(eq)
```

```logts-play
4wire x = 1010
4wire y = 1011
1wire diff = EQ(x, y)
show(diff)
```

### `EQ(Xbit a, Xbit b, Xbit c, ...)`

All operands must match:

```logts-play
4wire a = 0011
4wire b = 0011
4wire c = 0011
1wire allEq = EQ(a, b, c)
show(allEq)
```

```logts-play
4wire p = 0101
4wire q = 0101
4wire r = 0111
1wire notAll = EQ(p, q, r)
show(notAll)
```

→ `allEq=1`, `notAll=0`.

### `EQ(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

```logts-play
4wire[3] a = 0001 + 0010 + 0011
4wire[3] b = 0001 + 0011 + 0011
1wire[3] eqv = EQ(a, b; vector)
show(eqv)
```

→ `1,0,1` per index.

Scalar broadcast:

```logts-play
4wire[2] vectorA = 0010 + 0010
4wire scalar = 0010
1wire[2] flags = EQ(vectorA, scalar; vector)
show(flags)
```

→ `11`.

### `EQ(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)`

```logts-play
4wire[2,2] a = 0001 + 0010 + 0100 + 1000
4wire[2,2] b = 0001 + 0010 + 0100 + 1000
1wire[4] eqv = EQ(a, b; matrix)
show(eqv)
```

→ `1111` (all four cells equal).

## See also

[GT](builtin-GT.md) · [LT](builtin-LT.md) · [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md)
