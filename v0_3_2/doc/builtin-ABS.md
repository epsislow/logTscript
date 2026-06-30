# ABS

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md)

Signed absolute value on a two's-complement scalar wire. **`; signed` is required** — there is no unsigned mode.

## Signatures

```
ABS(Xbit x; signed) -> Xbit result, 1bit overflow
```

## Behaviour

| Input | `result` | `overflow` |
|-------|----------|------------|
| Non-negative signed value | `x` unchanged | `0` |
| Negative signed value | `|x|` (two's complement negate) | `0` |
| `INT_MIN` at width *W* (MSB `1`, rest `0`) | `x` unchanged | `1` |

`X` follows the operand width. The second return is always `1bit`.

## Examples

```logts-play
4wire x = 1101
4wire a, 1wire ovf = ABS(x; signed)
show(a)
show(ovf)
```

`INT_MIN` at 4 bits:

```logts-play
4wire min = 1000
4wire a, 1wire ovf = ABS(min; signed)
show(a)
show(ovf)
```

## See also

[SUBTRACT](builtin-SUBTRACT.md) · [arithmetic tag overview](arithmetic.md#tag-overview)
