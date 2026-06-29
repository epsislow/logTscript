# SUBTRACT

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector)

Binary subtraction with wrap-around (two's complement style borrow).

## Signatures

```
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
SUBTRACT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
```

## Scalar (default)

- `result` = `(a - b) mod 2^N`
- `carry` = `1` if `a < b` (borrow); else `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Same `result` bits; second return is signed **overflow**. |
| `vector` | Per-index subtract. **No** implicit vector broadcast without the tag (unlike ADD). |

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

## See also

[ADD](builtin-ADD.md) · `comp [subtract]`
