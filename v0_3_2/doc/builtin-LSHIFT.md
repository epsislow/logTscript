# LSHIFT (left shift)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Shift bits toward MSB; vacated LSBs filled with **`0`** by default, or with optional **`fill`** (1 bit).

## Signatures

```
LSHIFT(Xbit data, Nbit n) -> Xbit
LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
LSHIFT(Wbit[n] data, Nbit count ; vector) -> (W+n)bit[n]
LSHIFT(Wbit[n,m] data, Nbit/scalar count ; matrix) -> Wbit[n,m]
```

- Scalar: result width = **`len(data) + n`** (bits appended on the right).
- **`fill`** — only the LSB of the third argument is used (`0` or `1`). Default `0`.
- **`; vector`**: count must be a **scalar** (broadcast to every index). Optional third arg **`fill`** applies per element. Per-index count vectors are **not** supported.

Sugar: `data < n` and `data < n w1` — [short-notation.md](short-notation.md).

## Scalar (default)

- Left shift by `n`; width grows by `n` bits unless you assign to a narrower wire (truncation).

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `vector` | Per-element shift; output element width **(W + n)** where `n = len(scalar count)`. |
| `matrix` | Per-cell shift; output shape matches input matrix (**W** bits per cell). See [matrix-reduction.md](matrix-reduction.md). |

**No `; signed` tag** — left shift is identical for signed/unsigned bit patterns.

## Examples

### `LSHIFT(Xbit data, Nbit n)`

```logts-play
4wire x = 1011
5wire y = LSHIFT(x, 1)
show(y)
```

`1011 << 1` → `10110` (5 bits).

```logts-play
4wire val = 0001
4wire cnt = 0010
5wire r = LSHIFT(val, cnt)
show(r)
```

`1 << 2` → `00100`.

### `LSHIFT(Xbit data, Nbit n, 1bit fill)`

```logts-play
4wire x = 0001
5wire y0 = LSHIFT(x, 1, 0)
5wire y1 = LSHIFT(x, 1, 1)
show(y0)
show(y1)
```

`fill=0` → `00010`; `fill=1` → `00011`.

```logts-play
4wire x2 = 0001
8wire wide = LSHIFT(x2, 11, 1)
show(wide)
```

Shift by 3 with fill `1` → `0001111`.

### `LSHIFT(Wbit[n] data, Nbit count ; vector)`

```logts-play
4wire[3] vector = 1011 + 0101 + 0001
5wire[3] out = LSHIFT(vector, 0001; vector)
show(out)
```

Each 4-bit element shifted left by 1 → **5**-bit elements (`10110`, `10100`, `00010`).

Optional **`fill`** in vector mode:

```logts-play
4wire[2] v = 0001 + 0010
5wire[2] r = LSHIFT(v, 0001, 1; vector)
show(r)
```

### `LSHIFT(Wbit[n,m] data, Nbit count ; matrix)`

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[2,2] out = LSHIFT(m, 0001; matrix)
show(out)
```

Per-cell left shift by 1 (within each **W**-bit cell; assign to `4wire[N,M]`).

## See also

[RSHIFT](builtin-RSHIFT.md) · [LROTATE](builtin-LROTATE.md)
