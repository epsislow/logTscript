# MAX

Index: [Arithmetic](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

## Signatures

```
MAX(Wbit ...) -> Wbit
MAX(Wbit ...; signed) -> Wbit
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector) -> Wbit[n]
MAX(Wbit[n] a, Wbit/Wbit[n] b, ... ; vector signed) -> Wbit[n]
```

Variadic (≥ 2 operands after expansion).

## Scalar (default)

- Returns the **bit pattern** of the winning value (unsigned max)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed maximum. |
| `vector` | Element-wise max. |

## Examples

### `MAX(Wbit ...)`

```logts-play
4wire a = 0101
4wire b = 0011
4wire c = 1000
4wire hi = MAX(a, b, c)
show(hi)
```

`MAX(5,3,8)=8` → `1000`.

### `MAX(Wbit ...; signed)`

```logts-play
4wire neg = 1111
4wire pos = 0010
4wire hi = MAX(neg, pos; signed)
show(hi)
```

Signed `MAX(−1, 2)=2` → `0010`.

### `MAX(Wbit[n] a, … ; vector)`

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, 0001; vector)
show(out)
```

### `MAX(Wbit[n] a, … ; vector signed)`

```logts-play
4wire[4] vectorA = 0001 + 0010 + 0100 + 1000
4wire[4] vectorB = 0010 + 0011 + 0100 + 1001
4wire[4] out = MAX(vectorA, vectorB; vector signed)
show(out)
```

## See also

[MIN](builtin-MIN.md) · [CLAMP](builtin-CLAMP.md) · [ARGMAX](builtin-ARGMAX.md)
