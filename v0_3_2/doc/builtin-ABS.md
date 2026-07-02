# ABS

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md)

Absolute value on a scalar wire. Requires a **numeric format tag** — `; signed`, `; q4p4`, `; q8p8`, `; fp16`, or `; bf16`. There is no unsigned mode.

## Signatures

```
ABS(Xbit x; signed) -> Xbit result, 1bit overflow
ABS(8bit x; q4p4) -> 8bit result, 1bit overflow
ABS(16bit x; q8p8) -> 16bit result, 1bit overflow
ABS(16bit x; fp16) -> 16bit result, 1bit overflow
ABS(16bit x; bf16) -> 16bit result, 1bit overflow
```

## Behaviour

| Input | `result` | `overflow` |
|-------|----------|------------|
| Non-negative value | `x` unchanged | `0` |
| Negative value | `|x|` (two's complement negate) | `0` |
| `INT_MIN` at width *W* (MSB `1`, rest `0`) | `x` unchanged | `1` |

`X` follows the operand width. The second return is always `1bit`.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Two's complement absolute value on any width. |
| `q4p4` | Q4.4 on **8-bit** wires. |
| `q8p8` | Q8.8 on **16-bit** wires. |
| `fp16` / `bf16` | Float absolute value on **16-bit** wires. |

**No `; vector`** or **`; matrix`** — scalar only.

## Examples

### `ABS(Xbit x; signed)`

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

### `ABS(8bit x; q4p4)`

```logts-play
8wire x = 11110000
8wire a, 1wire ovf = ABS(x; q4p4)
show(a; q4p4)
show(ovf)
```

`|-1.0| = 1.0` → `a=00010000`, `ovf=0`.

## See also

[SUBTRACT](builtin-SUBTRACT.md) · [arithmetic tag overview](arithmetic.md#tag-overview)
