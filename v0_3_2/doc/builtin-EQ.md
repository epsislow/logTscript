# EQ (equality)

Index: [Logic gates](builtin-logic-gate-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector)

Bitwise equality (all bits of each operand must match).

## Signatures

```
EQ(Xbit a, Xbit b) -> 1bit result
EQ(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
```

Variadic `EQ(a, b, c, …)` without tags: all operands equal → `1`.

## Scalar (default)

- `result = 1` if every bit of `a` equals `b`; else `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per-index equality `a[i] == b[i]` → `1wire[n]`. |

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
4wire a2 = 0011
4wire b2 = 0011
1wire same = EQ(a2, b2)
probe(same)
```

Mismatch:

```logts-play
4wire x = 1010
4wire y = 1011
1wire diff = EQ(x, y)
show(diff)
```

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
4wire[3] vectorA = 0100 + 0100 + 0111
4wire scalar = 0100
1wire[3] flags = EQ(vectorA, scalar; vector)
show(flags)
```

## See also

[GT](builtin-GT.md) · [LT](builtin-LT.md) · [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md)
