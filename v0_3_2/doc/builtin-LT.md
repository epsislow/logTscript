# LT (less than)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector) · [Matrix `; matrix`](matrix-reduction.md)

## Signatures

```
LT(Xbit a, Xbit b) -> 1bit result
LT(Xbit a, Xbit b; signed) -> 1bit result
LT(8bit a, 8bit b; q4p4) -> 1bit result
LT(16bit a, 16bit b; q8p8) -> 1bit result
LT(16bit a, 16bit b; fp16) -> 1bit result
LT(16bit a, 16bit b; bf16) -> 1bit result
LT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
LT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> 1wire[n]
LT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> 1wire[n×m]
LT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> 1wire[n×m]
```

## Scalar (default)

- `result = 1` if `a < b` (unsigned); else `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Two's complement comparison. |
| `q4p4` | Fixed-point Q4.4 on **8-bit** wires. |
| `q8p8` | Fixed-point Q8.8 on **16-bit** wires. |
| `fp16` / `bf16` | IEEE half / brain float on **16-bit** wires. |
| `vector` | Per index on **rank-1** tensors → `1wire[n]`. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]` → `1wire[N×M]`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `LT(Xbit a, Xbit b)`

```logts-play
4wire a = 0011
4wire b = 0111
1wire lt = LT(a, b)
show(lt)
```

`3 < 7` → `lt=1`.

### `LT(Xbit a, Xbit b; signed)`

```logts-play
4wire a = 1111
4wire b = 0010
1wire ltU = LT(a, b)
1wire ltS = LT(a, b; signed)
show(ltU)
show(ltS)
```

Unsigned: `15 < 2` → `ltU=0`. Signed: `−1 < 2` → `ltS=1`.

### `LT(8bit a, 8bit b; q4p4)`

```logts-play
8wire a = 00001000
8wire b = 00011000
1wire lt = LT(a, b; q4p4)
show(lt)
```

`0.5 < 1.5` → `lt=1`.

### `LT(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

```logts-play
4wire[3] vectorA = 0001 + 0100 + 0111
4wire[3] vectorB = 0010 + 0011 + 0100
1wire[3] flags = LT(vectorA, vectorB; vector)
show(flags)
```

### `LT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)`

```logts-play
4wire[2] vectorA = 1111 + 0100
4wire scalar = 0010
1wire[2] flags = LT(vectorA, scalar; vector signed)
show(flags)
```

### `LT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)`

```logts-play
4wire[2,2] a = 0001 + 0100 + 0111 + 0010
4wire[2,2] b = 0010 + 0011 + 0100 + 0100
1wire[4] flags = LT(a, b; matrix)
show(flags)
```

### `LT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)`

```logts-play
4wire[2,2] a = 1111 + 0100 + 0111 + 0010
4wire[2,2] b = 0010 + 1111 + 0100 + 0100
1wire[4] flags = LT(a, b; matrix signed)
show(flags)
```

## See also

[GT](builtin-GT.md) · [EQ](builtin-EQ.md)
