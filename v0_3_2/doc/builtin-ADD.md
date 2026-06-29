# ADD

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Element-wise `; vector`](vector-reduction.md#element-wise-mode-vector)

Binary addition with wrap-around.

## Signatures

```
ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry
ADD(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], Wbit[n]
ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], Wbit[n]
```

## Scalar (default)

- `result` = `(a + b) mod 2^N`
- `carry` = `1` if `a + b > 2^N - 1`; else `0`
- Width `N` = `max(len(a), len(b))`; inputs zero-padded on the left.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Same `result` bits; second return is **signed overflow** (not unsigned carry). |
| `vector` | Element-wise add; `result` and flag blobs are `Wbit[n]`. |

**Implicit vector broadcast:** `ADD(vectorA, scalar)` without `; vector` also produces element-wise `Wbit[n]` (legacy). Explicit `; vector` documents the same semantics.

## Examples

### `ADD(Xbit a, Xbit b)`

Increment and wrap at overflow:

```logts-play
4wire idx = 0011
4wire inc = 0001
4wire nextIdx, 1wire carry = ADD(idx, inc)
show(nextIdx)
show(carry)
```

```logts-play
4wire idx2 = 1111
4wire inc2 = 0001
4wire nextIdx2, 1wire carry2 = ADD(idx2, inc2)
show(nextIdx2)
show(carry2)
```

`3+1=4` → `nextIdx=0100`, `carry=0`. `15+1` wraps → `nextIdx2=0000`, `carry2=1`.

### `ADD(Xbit a, Xbit b; signed)`

`7+1` on 4 bits: same result bits; overflow flag differs from unsigned carry.

```logts-play
4wire acc = 0111
4wire delta = 0001
4wire nextU, 1wire carry = ADD(acc, delta)
4wire nextS, 1wire ovf = ADD(acc, delta; signed)
show(nextU)
show(carry)
show(nextS)
show(ovf)
```

### `ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector)`

Per-index sum and carry flags:

```logts-play
4wire[2] vectorA = 0011 + 0101
4wire[2] vectorB = 0001 + 0011
4wire[2] r, 4wire[2] f = ADD(vectorA, vectorB; vector)
show(r)
show(f)
```

### `ADD(Wbit[n] a, Wbit/Wbit[n] b ; vector signed)`

Signed element-wise add (overflow per index):

```logts-play
4wire[2] vectorA = 1111 + 0111
4wire[2] vectorB = 0001 + 0001
4wire[2] r, 4wire[2] ovf = ADD(vectorA, vectorB; vector signed)
show(r)
show(ovf)
```

## See also

[SUBTRACT](builtin-SUBTRACT.md) · [MAC](builtin-MAC.md) · `comp [adder]`
