# LT (less than)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector)

## Signatures

```
LT(Xbit a, Xbit b) -> 1bit result
LT(Xbit a, Xbit b; signed) -> 1bit result
LT(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> 1wire[n]
LT(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> 1wire[n]
```

## Scalar (default)

- `result = 1` if `a < b` (unsigned); else `0`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Two's complement comparison. |
| `vector` | Per-index `1wire[n]`. |

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

## See also

[GT](builtin-GT.md) · [EQ](builtin-EQ.md)
