# DIVIDE

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md)

Integer quotient and remainder (no floating-point).

## Signatures

```
DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
DIVIDE(Xbit a, Xbit b; signed) -> Xbit result, Xbit mod
DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
```

## Scalar (default)

- `result` = `floor(a / b)` masked to `N` bits
- `mod` = `a % b` masked to `N` bits
- If `b = 0`, both outputs are `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Operands as two's complement; integer `/` and `%`. |
| `vector` | Quotient and remainder per index. |

## Examples

### `DIVIDE(Xbit a, Xbit b)`

```logts-play
4wire a = 0110
4wire b = 0010
4wire q, 4wire m = DIVIDE(a, b)
show(q)
show(m)
```

`6/2=3`, remainder `0`.

```logts-play
4wire a2 = 0111
4wire b2 = 0010
4wire q2, 4wire m2 = DIVIDE(a2, b2)
show(q2)
show(m2)
```

`7/2=3`, remainder `1`.

```logts-play
4wire a3 = 0110
4wire b3 = 0000
4wire q3, 4wire m3 = DIVIDE(a3, b3)
show(q3)
show(m3)
```

Divide by zero → both `0`.

### `DIVIDE(Xbit a, Xbit b; signed)`

```logts-play
4wire a = 1111
4wire b = 0010
4wire q, 4wire m = DIVIDE(a, b; signed)
show(q)
show(m)
```

Signed `−1 / 2 = 0`, remainder `−1` (`1111`).

### `DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

```logts-play
4wire[3] vectorA = 0110 + 0111 + 0001
4wire[3] vectorB = 0010 + 0010 + 0011
4wire[3] q, 4wire[3] m = DIVIDE(vectorA, vectorB; vector)
show(q)
show(m)
```

### `DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)`

```logts-play
4wire[2] vectorA = 1111 + 1101
4wire[2] vectorB = 0010 + 0010
4wire[2] q, 4wire[2] m = DIVIDE(vectorA, vectorB; vector signed)
show(q)
show(m)
```

## See also

[MULTIPLY](builtin-MULTIPLY.md) · `comp [divider]`
