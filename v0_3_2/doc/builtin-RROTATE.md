# RROTATE (right rotate)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md)

Rotate bits right; LSBs wrap to MSBs. Width unchanged.

## Signatures

```
RROTATE(Xbit val, Xbit count) -> Xbit result
RROTATE(Wbit[n] val, Wbit count ; vector) -> Wbit[n]
```

## Scalar (default)

- Rotate right by `count mod width`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per-element rotate; **same scalar `count`**. |

## Examples

### `RROTATE(Xbit val, Xbit count)`

```logts-play
4wire x = 1011
4wire y = RROTATE(x, 1)
show(y)
```

`1011` rotr 1 → `1101`.

```logts-play
4wire val = 1001
4wire cnt = 0001
4wire r = RROTATE(val, cnt)
show(r)
```

→ `1100`.

### `RROTATE(Wbit[n] val, Wbit count ; vector)`

```logts-play
4wire[2] v = 1011 + 1001
4wire cnt = 0001
4wire[2] r = RROTATE(v, cnt; vector)
show(r)
```

## See also

[LROTATE](builtin-LROTATE.md) · [RSHIFT](builtin-RSHIFT.md)
