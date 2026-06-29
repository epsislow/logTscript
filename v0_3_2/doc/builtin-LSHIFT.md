# LSHIFT (left shift)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md)

Shift bits toward MSB; vacated LSBs filled with **0** (optional third arg `fill`).

## Signatures

```
LSHIFT(Xbit data, Nbit n) -> Xbit
LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
LSHIFT(Wbit[n] val, Wbit count ; vector) -> (W+n)bit[n]
```

## Scalar (default)

- Left shift; scalar result width follows `doc(LSHIFT)` (may grow when no truncation)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per-element shift; each output element is **(W+n)** bits where `n = len(count)`; **same scalar `count`**. |

**No `; signed` tag** — left shift is the same for signed/unsigned bit pattern.

Sugar: `data < n` — [short-notation.md](short-notation.md).

## Examples

### `LSHIFT(Xbit data, Nbit n)`

```logts-play
4wire x = 1011
5wire y = LSHIFT(x, 1)
show(y)
```

`1011 << 1` → `10110`.

```logts-play
4wire val = 0001
4wire cnt = 0010
4wire r = LSHIFT(val, cnt)
show(r)
```

`1 << 2` → `0100` (within 4-bit assignment).

### `LSHIFT(Wbit[n] val, Wbit count ; vector)`

```logts-play
4wire[2] v = 0001 + 0010
4wire cnt = 0001
5wire[2] r = LSHIFT(v, cnt; vector)
show(r)
```

Each element shifted left by 1 → **5**-bit elements.

## See also

[RSHIFT](builtin-RSHIFT.md) · [LROTATE](builtin-LROTATE.md)
