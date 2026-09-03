# DIVIDE

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Integer quotient and remainder (no floating-point).

## Signatures

```
DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
DIVIDE(Xbit a, Xbit b; signed) -> Xbit result, Xbit mod
DIVIDE(8bit a, 8bit b; q4p4) -> 8bit result, 8bit mod
DIVIDE(16bit a, 16bit b; q8p8) -> 16bit result, 16bit mod
DIVIDE(16bit a, 16bit b; fp16) -> 16bit result, 16bit mod
DIVIDE(16bit a, 16bit b; bf16) -> 16bit result, 16bit mod
DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
DIVIDE(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
```

## Scalar (default)

- `result` = `floor(a / b)` masked to `N` bits
- `mod` = `a % b` masked to `N` bits
- If `b = 0`, both outputs are `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Operands as two's complement; integer `/` and `%`. |
| `q4p4` | Fixed-point Q4.4 on **8-bit** wires. |
| `q8p8` | Fixed-point Q8.8 on **16-bit** wires. |
| `fp16` / `bf16` | Float divide on **16-bit** wires. |
| `vector` | Quotient and remainder per index on **rank-1** tensors. |
| `matrix` | Quotient and remainder per cell on **matrix** `Wwire[N,M]`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

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

### `DIVIDE(8bit a, 8bit b; q4p4)`

```logts-play
8wire a = 00100000
8wire b = 00001000
8wire q, 8wire m = DIVIDE(a, b; q4p4)
show(q; q4p4)
show(m; q4p4)
```

`2.0/0.5=4.0`, remainder `0`.

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

### `DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)`

```logts-play
4wire[2,2] a = 0110 + 0111 + 0100 + 1000
4wire[2,2] b = 0010 + 0010 + 0010 + 0010
4wire[2,2] q, 4wire[2,2] m = DIVIDE(a, b; matrix)
show(q)
show(m)
```

### `DIVIDE(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)`

```logts-play
4wire[2,2] a = 1111 + 1101 + 0100 + 1000
4wire[2,2] b = 0010 + 0010 + 0010 + 0010
4wire[2,2] q, 4wire[2,2] m = DIVIDE(a, b; matrix signed)
show(q)
show(m)
```

## See also

[MULTIPLY](builtin-MULTIPLY.md) · `comp [divider]`
