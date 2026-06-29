# MIN

Index: [Arithmetic](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

## Signatures

```
MIN(Wbit ...) -> Wbit
MIN(Wbit ...; signed) -> Wbit
MIN(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n]
MIN(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector signed) -> Wbit[n]
```

Variadic (≥ 2 operands after expansion). Whole vectors expand to elements.

## Scalar (default)

- Returns the **bit pattern** of the winning value (unsigned min)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed minimum. |
| `vector` | Element-wise min. |

## Examples

### `MIN(Wbit ...)`

```logts-play
4wire a = 1000
4wire b = 0111
4wire c = 1000
4wire lo = MIN(a, b, c)
show(lo)
```

`MIN(8,7,8)=7` → `0111`.

Whole-vector reduction:

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0110
4wire m = MIN(vectorA)
show(m)
```

### `MIN(Wbit ...; signed)`

```logts-play
4wire neg = 1111
4wire pos = 0010
4wire lo = MIN(neg, pos; signed)
show(lo)
```

Signed `MIN(−1, 2)=−1` → `1111`.

### `MIN(Wbit[n] a, … ; vector)`

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0110
4wire[3] out = MIN(vectorA, 0001; vector)
show(out)
```

### `MIN(Wbit[n] a, … ; vector signed)`

```logts-play
4wire[2] vectorA = 1111 + 0010
4wire[2] vectorB = 0001 + 1111
4wire[2] out = MIN(vectorA, vectorB; vector signed)
show(out)
```

## See also

[MAX](builtin-MAX.md) · [CLAMP](builtin-CLAMP.md) · [ARGMIN](builtin-ARGMIN.md)
