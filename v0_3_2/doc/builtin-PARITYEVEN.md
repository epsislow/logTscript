# PARITYEVEN · PARITYODD

Index: [builtin-functions.md](builtin-functions.md) · [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md)

Live signatures: `doc(PARITYEVEN)` · `doc(PARITYODD)` (see [doc-function.md](doc-function.md#bit-analysis)).

UART-style **parity bit** to append after data (same rules as `parityEven` / `parityOdd` in [protocol-assemble.md](protocol-assemble.md)).

## Signatures

```
PARITYEVEN(Xbit) -> 1bit
PARITYODD(Xbit)  -> 1bit
```

| Function | Bit emitted so that **data + parity** has … |
|----------|---------------------------------------------|
| `PARITYEVEN` | an **even** number of `1` bits |
| `PARITYODD`  | an **odd** number of `1` bits |

## Even vs odd parity bit

```logts-play
8wire data = 01100110
1wire pe = PARITYEVEN(data)
1wire po = PARITYODD(data)
show(pe)
show(po)
```

## Relation to `PARITY`

`PARITY(data)` is XOR reduction (odd popcount → `1`). **`PARITYEVEN(data)`** matches that value. **`PARITYODD(data)`** is the complement (`NOT` on 1 bit).

```logts-play
4wire data = 1011
1wire p = PARITY(data)
1wire e = PARITYEVEN(data)
1wire o = PARITYODD(data)
show(p)
show(e)
show(o)
```

## Append parity on the wire

```logts-play
8wire payload = 11110000
1wire par = PARITYODD(payload)
9wire onWire = payload + par
show(onWire)
```

## See also

[builtin-FILL.md](builtin-FILL.md) · [protocol-assemble.md](protocol-assemble.md)
