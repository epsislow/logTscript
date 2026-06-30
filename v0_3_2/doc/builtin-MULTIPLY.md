# MULTIPLY

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Binary multiplication with overflow capture.

## Signatures

```
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
MULTIPLY(Xbit a, Xbit b; signed) -> Xbit result, Xbit over
MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix) -> Wbit[n,m], Wbit[n,m]
MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m]/row/col/scalar b ; matrix signed) -> Wbit[n,m], Wbit[n,m]
```

## Scalar (default)

- `result` = low `N` bits of `a * b`
- `over` = high `N` bits; full product = `(over << N) | result`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Product as two's complement; same wire packing. |
| `vector` | Per index on **rank-1** tensors; `over[i]` = high **W** bits of the **2W**-bit product. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; rank-1 operands broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `MULTIPLY(Xbit a, Xbit b)`

```logts-play
4wire a = 0010
4wire b = 0011
4wire r, 4wire o = MULTIPLY(a, b)
show(r)
show(o)
```

`2×3=6` → `r=0110`, `o=0000`.

```logts-play
4wire a2 = 1111
4wire b2 = 1111
4wire r2, 4wire o2 = MULTIPLY(a2, b2)
show(r2)
show(o2)
```

Unsigned `15×15=225` → `r2=0001`, `o2=1110`.

### `MULTIPLY(Xbit a, Xbit b; signed)`

```logts-play
4wire a = 1111
4wire b = 1111
4wire rS, 4wire oS = MULTIPLY(a, b; signed)
show(rS)
show(oS)
```

Signed `(−1)×(−1)=1` → `rS=0001`, `oS=0000`.

### `MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

```logts-play
4wire[3] vectorA = 0010 + 0011 + 0100
4wire[3] vectorB = 0010 + 0010 + 0001
4wire[3] r, 4wire[3] o = MULTIPLY(vectorA, vectorB; vector)
show(r)
show(o)
```

### `MULTIPLY(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)`

```logts-play
4wire[2] vectorA = 1111 + 0010
4wire[2] r, 4wire[2] o = MULTIPLY(vectorA, 1111; vector signed)
show(r)
show(o)
```

`(−1)×(−1)=1` at index 0; `2×(−1)=−2` at index 1.

### `MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix)`

```logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] b = 0001 + 0000 + 0000 + 0001
4wire[2,2] r, 4wire[2,2] o = MULTIPLY(a, b; matrix)
show(r)
show(o)
```

### `MULTIPLY(Wbit[n,m] a, Wbit/Wbit[n,m] b ; matrix signed)`

```logts-play
4wire[2,2] a = 1111 + 0010 + 0011 + 0100
4wire[2,2] b = 1111 + 0001 + 0001 + 0001
4wire[2,2] r, 4wire[2,2] o = MULTIPLY(a, b; matrix signed)
show(r)
show(o)
```

## See also

[MAC](builtin-MAC.md) · [DIVIDE](builtin-DIVIDE.md)
