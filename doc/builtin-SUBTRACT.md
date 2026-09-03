# SUBTRACT

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector) · [Matrix `; matrix`](matrix-reduction.md)

Binary subtraction with wrap-around (two's complement style borrow).

## Signatures

```
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
SUBTRACT(8bit a, 8bit b; q4p4) -> 8bit result, 1bit overflow
SUBTRACT(16bit a, 16bit b; q8p8) -> 16bit result, 1bit overflow
SUBTRACT(16bit a, 16bit b; fp16) -> 16bit result, 1bit inexact
SUBTRACT(16bit a, 16bit b; bf16) -> 16bit result, 1bit inexact
SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
```

## Scalar (default)

- `result` = `(a - b) mod 2^N`
- `carry` = `1` if `a < b` (borrow); else `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Same `result` bits; second return is signed **overflow**. |
| `q4p4` | Q4.4 on **8-bit** wires. |
| `q8p8` | Q8.8 on **16-bit** wires. |
| `fp16` / `bf16` | Float16 / bf16 on **16-bit** wires. |
| `vector` | Per index on **rank-1** tensors; matching `elementCount`. **No** implicit broadcast without the tag (unlike ADD). |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `SUBTRACT(Xbit a, Xbit b)`

Decrement and borrow on underflow:

```logts-play
4wire idx = 0011
4wire dec = 0001
4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)
show(prevIdx)
show(carry)
```

```logts-play
4wire idx2 = 0000
4wire dec2 = 0001
4wire prevIdx2, 1wire carry2 = SUBTRACT(idx2, dec2)
show(prevIdx2)
show(carry2)
```

`3-1=2`. `0-1` wraps to `1111`, `carry2=1`.

### `SUBTRACT(Xbit a, Xbit b; signed)`

Signed overflow on underflow past representable range:

```logts-play
4wire a = 1000
4wire b = 0001
4wire r, 1wire ovf = SUBTRACT(a, b; signed)
show(r)
show(ovf)
```

Signed `−8 − 1` on 4 bits → `r=0111`, overflow `1`.

### `SUBTRACT(8bit a, 8bit b; q4p4)`

`2.0 − 0.5 = 1.5`:

```logts-play
8wire a = 00100000
8wire b = 00001000
8wire s, 1wire ovf = SUBTRACT(a, b; q4p4)
show(s; q4p4)
show(ovf)
```

### `SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0001
4wire[3] vectorB = 0001 + 0001 + 0001
4wire[3] r, 4wire[3] f = SUBTRACT(vectorA, vectorB; vector)
show(r)
show(f)
```

### `SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)`

Scalar subtrahend broadcast per index:

```logts-play
4wire[3] vectorA = 0100 + 0010 + 0001
4wire[3] r, 4wire[3] f = SUBTRACT(vectorA, 0001; vector signed)
show(r)
show(f)
```

### `SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)`

```logts-play
4wire[2,2] a = 0100 + 0010 + 0001 + 0011
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] f = SUBTRACT(a, b; matrix)
show(r)
show(f)
```

### `SUBTRACT(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)`

```logts-play
4wire[2,2] a = 1000 + 0111 + 0001 + 0011
4wire[2,2] b = 0001 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] f = SUBTRACT(a, b; matrix signed)
show(r)
show(f)
```

## See also

[ADD](builtin-ADD.md) · `comp [subtract]`
