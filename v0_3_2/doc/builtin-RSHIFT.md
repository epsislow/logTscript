# RSHIFT (logical right shift)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md)

Shift bits toward LSB; vacated MSBs filled with **0** (logical) or sign bit (`; signed`).

## Signatures

```
RSHIFT(Xbit val, Xbit count) -> Xbit result
RSHIFT(Xbit val, Xbit count; signed) -> Xbit result
RSHIFT(Wbit[n] val, Wbit count ; vector) -> Wbit[n]
RSHIFT(Wbit[n] val, Wbit count ; vector signed) -> Wbit[n]
```

Optional third argument `fill` (1 bit) for logical shift — ignored when `; signed` is set. See `doc(RSHIFT)`.

## Scalar (default)

- Logical shift right by `count` (masked to operand width)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Arithmetic shift (ASHR): MSB replicated. |
| `vector` | Per-element shift; count scalar broadcast or per-index (see `doc(RSHIFT)`). |

## Examples

### `RSHIFT(Xbit val, Xbit count)`

```logts-play
4wire x = 1010
4wire y = RSHIFT(x, 1)
probe(y)
```

`1010 >> 1` → `0101`.

```logts-play
4wire val = 1000
4wire cnt = 0001
4wire r = RSHIFT(val, cnt)
show(r)
```

→ `0100`.

### `RSHIFT(Xbit val, Xbit count; signed)`

```logts-play
4wire neg = 1111
4wire pos = 0111
4wire log = RSHIFT(neg, 1)
4wire arithNeg = RSHIFT(neg, 1; signed)
4wire arithPos = RSHIFT(pos, 1; signed)
show(log)
show(arithNeg)
show(arithPos)
```

`1111` logical → `0111`; arithmetic → `1111`. `0111` (=7) arithmetic → `0011` (=3).

### `RSHIFT(Wbit[n] val, Wbit count ; vector)`

```logts-play
4wire[3] v = 1000 + 0100 + 0010
4wire cnt = 0001
4wire[3] r = RSHIFT(v, cnt; vector)
show(r)
```

### `RSHIFT(Wbit[n] val, Wbit count ; vector signed)`

```logts-play
4wire[2] v = 1111 + 0111
4wire cnt = 0001
4wire[2] r = RSHIFT(v, cnt; vector signed)
show(r)
```

## See also

[LSHIFT](builtin-LSHIFT.md) · [LROTATE](builtin-LROTATE.md)
