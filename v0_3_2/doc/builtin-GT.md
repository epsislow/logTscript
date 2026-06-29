# GT (greater than)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector)

## Signatures

```
GT(Xbit a, Xbit b) -> 1bit result
GT(Xbit a, Xbit b; signed) -> 1bit result
GT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
GT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> 1wire[n]
```

## Scalar (default)

- `result = 1` if `a > b` (unsigned); else `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Two's complement comparison. |
| `vector` | Per-index `1wire[n]`; scalar operand broadcast. |

## Examples

### `GT(Xbit a, Xbit b)`

```logts-play
4wire a = 1000
4wire b = 0111
1wire gt = GT(a, b)
show(gt)
```

Unsigned `8 > 7` → `gt=1`.

```logts-play
4wire a2 = 0101
4wire b2 = 0011
1wire g = GT(a2, b2)
1wire l = LT(b2, a2)
show(g)
show(l)
```

### `GT(Xbit a, Xbit b; signed)`

```logts-play
4wire a = 1111
4wire b = 0010
1wire gtU = GT(a, b)
1wire gtS = GT(a, b; signed)
show(gtU)
show(gtS)
```

Unsigned: `15 > 2` → `gtU=1`. Signed: `−1 > 2` → `gtS=0`.

### `GT(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0111
4wire[3] vectorB = 0011 + 0011 + 0100
1wire[3] flags = GT(vectorA, vectorB; vector)
show(flags)
```

### `GT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)`

```logts-play
4wire[2] vectorA = 1111 + 0010
4wire[2] vectorB = 0010 + 1111
1wire[2] flags = GT(vectorA, vectorB; vector signed)
show(flags)
```

## See also

[LT](builtin-LT.md) · [EQ](builtin-EQ.md) · [MIN](builtin-MIN.md)
