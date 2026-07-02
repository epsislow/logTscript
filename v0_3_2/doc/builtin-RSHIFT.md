# RSHIFT (logical right shift)

Index: [Bit transform](builtin-bit-transform-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · [Matrix `; matrix`](matrix-reduction.md)

Shift bits toward LSB. Vacated MSBs use **`fill`** (logical) or the sign bit (`; signed` = ASHR).

## Signatures

```
RSHIFT(Xbit data, Nbit n) -> Xbit
RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
RSHIFT(Xbit data, Nbit n; signed) -> Xbit
RSHIFT(8bit data, Nbit n; q4p4) -> 8bit
RSHIFT(16bit data, Nbit n; q8p8) -> 16bit
RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector signed) -> Wbit[n]
RSHIFT(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix) -> Wbit[n,m]
RSHIFT(Wbit[n,m] data, Nbit/Kbit[n,m]/scalar count ; matrix signed) -> Wbit[n,m]
```

- **`fill`** — MSB padding for logical shift (default `0`). **Ignored** when `; signed` is set.
- **`; vector`**: `count` may be a scalar (broadcast) or a **`Kbit[n]`** vector (one shift amount per index). Optional third arg **`fill`** applies in logical vector mode.

Sugar: `data > n` and `data > n w1` — [short-notation.md](short-notation.md).

## Scalar (default)

- Logical shift right; **same width** as `data`.

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Arithmetic shift (ASHR): MSB replicated; `fill` ignored. |
| `q4p4` | ASHR on **8-bit** fixed-point wires (same as `; signed` on raw bits). |
| `q8p8` | ASHR on **16-bit** fixed-point wires. |
| `vector` | Per element on **rank-1** tensors. |
| `matrix` | Per cell on **matrix** `Wwire[N,M]`; `count` scalar or rank-1 broadcast. See [matrix-reduction.md](matrix-reduction.md). |

**Shapes:** [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).

## Examples

### `RSHIFT(Xbit data, Nbit n)`

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

### `RSHIFT(Xbit data, Nbit n, 1bit fill)`

```logts-play
4wire x = 1010
4wire y0 = RSHIFT(x, 1, 0)
4wire y1 = RSHIFT(x, 1, 1)
show(y0)
show(y1)
```

`fill=0` → `0101`; `fill=1` → `1101`.

```logts-play
4wire x2 = 10
4wire y2 = RSHIFT(x2, 11, 1)
show(y2)
```

Shift by 3 with fill `1` on 2-bit `10` → `11`.

### `RSHIFT(Xbit data, Nbit n; signed)`

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

`fill` is ignored with `; signed`:

```logts-play
4wire x = 1111
4wire y = RSHIFT(x, 1, 0; signed)
show(y)
```

→ `1111` (still −1).

### `RSHIFT(8bit data, Nbit n; q4p4)`

```logts-play
8wire x = 11110000
8wire y = RSHIFT(x, 1; q4p4)
show(y; q4p4)
```

Fixed-point `−1.0 >> 1 = −0.5` → `11111000`.

**Note:** `; fp16` and `; bf16` are **not** accepted on RSHIFT (runtime error).

### `RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector)`

Scalar count (broadcast):

```logts-play
4wire[3] vector = 1010 + 0100 + 0001
4wire[3] out = RSHIFT(vector, 0001; vector)
show(out)
```

Per-index **`Kbit[n]`** count:

```logts-play
4wire[3] data = 1010 + 0100 + 0001
2wire[3] counts = 01 + 10 + 01
4wire[3] out = RSHIFT(data, counts; vector)
show(out)
```

### `RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector signed)`

```logts-play
4wire[3] vector = 1111 + 0111 + 0001
4wire[3] out = RSHIFT(vector, 0001; vector signed)
show(out)
```

ASHR per element (`1111`→`1111`, `0111`→`0011`, `0001`→`0000`).

### `RSHIFT(Wbit[n,m] data, … ; matrix)`

```logts-play
4wire[2,2] m = 1010 + 0100 + 0001 + 1111
4wire[2,2] out = RSHIFT(m, 0001; matrix)
show(out)
```

Per-cell logical shift right by 1.

### `RSHIFT(Wbit[n,m] data, … ; matrix signed)`

```logts-play
4wire[2,2] m = 1111 + 0111 + 0001 + 1000
4wire[2,2] out = RSHIFT(m, 0001; matrix signed)
show(out)
```

Per-cell ASHR by 1 (`1111`→`1111`, `0111`→`0011`, …).

## See also

[LSHIFT](builtin-LSHIFT.md) · [LROTATE](builtin-LROTATE.md)
