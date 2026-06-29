# LROTATE (left rotate)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md)

Rotate bits left; MSBs wrap to LSBs. Width unchanged.

## Signatures

```
LROTATE(Xbit val, Xbit count) -> Xbit result
LROTATE(Wbit[n] val, Wbit count ; vector) -> Wbit[n]
```

## Scalar (default)

- Rotate left by `count mod width`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per-element rotate; **same scalar `count`**. |

## Examples

### `LROTATE(Xbit val, Xbit count)`

```logts-play
4wire x = 1011
4wire y = LROTATE(x, 1)
show(y)
```

`1011` rotl 1 → `0111`.

```logts-play
4wire x2 = 1011
4wire y2 = LROTATE(x2, 10)
probe(y2)
```

`count=2` (mod 4) → `1110`.

### `LROTATE(Wbit[n] val, Wbit count ; vector)`

```logts-play
4wire[2] v = 1011 + 1001
4wire cnt = 0001
4wire[2] r = LROTATE(v, cnt; vector)
show(r)
```

## See also

[RROTATE](builtin-RROTATE.md) · [REVERSE](builtin-REVERSE.md)
