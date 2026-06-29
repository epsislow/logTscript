# MAC (multiply-accumulate)

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md)

Computes **`acc + (a × b)`**. Equivalent to `ADD(acc, MULTIPLY(a, b))`; may be fused internally.

## Signatures

```
MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
MAC(Xbit acc, Xbit a, Xbit b; signed) -> Xbit result, (X+1)bit over
MAC(Wbit[n] acc, Wbit/Wbit[n] a, Wbit/Wbit[n] b ; vector) -> Wbit[n], (W+1)bit[n]
MAC(Wbit[n] acc, Wbit/Wbit[n] a, Wbit/Wbit[n] b ; vector signed) -> Wbit[n], (W+1)bit[n]
```

All three operands must have the same width **X** (per element in vector mode).

| Output | Width | Description |
|--------|-------|-------------|
| `result` | `X` | Low `X` bits of `acc + a*b` |
| `over` | `X + 1` | Upper bits (zero-padded) |

Full integer: concatenate **`over` then `result`** (MSB → LSB).

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed accumulate; same packing. |
| `vector` | Per index; `over[i]` is **(W+1)** bits — assign e.g. `4wire[n] r, 5wire[n] o`. |

## Examples

### `MAC(Xbit acc, Xbit a, Xbit b)`

```logts-play
8wire acc = 11111010
8wire a = 00010100
8wire b = 00010100
8wire result, 9wire over = MAC(acc, a, b)
show(result)
show(over)
```

`250 + 20×20 = 650`.

Digit accumulator when the value fits in `X` bits:

```logts-play
8wire acc = 00001100
8wire digit = 00000101
8wire ten = 00001010
8wire low, 9wire hi = MAC(acc, digit, ten)
show(low)
show(hi)
```

`12 + 5×10 = 62`.

### `MAC(Xbit acc, Xbit a, Xbit b; signed)`

```logts-play
4wire acc = 1000
4wire a = 0010
4wire b = 0001
4wire r, 5wire over = MAC(acc, a, b; signed)
show(r)
show(over)
```

Signed `−8 + 2×1 = −6` → `r=1010`.

### `MAC(Wbit[n] acc, … ; vector)`

```logts-play
4wire[2] acc = 0001 + 0010
4wire[2] a = 0010 + 0001
4wire[2] b = 0011 + 0100
4wire[2] r, 5wire[2] o = MAC(acc, a, b; vector)
show(r)
show(o)
```

### `MAC(Wbit[n] acc, … ; vector signed)`

```logts-play
4wire[2] acc = 1111 + 0000
4wire[2] a = 1111 + 0010
4wire[2] b = 0001 + 0001
4wire[2] r, 5wire[2] o = MAC(acc, a, b; vector signed)
show(r)
show(o)
```

## See also

[MULTIPLY](builtin-MULTIPLY.md) · [DOT](builtin-DOT.md)
