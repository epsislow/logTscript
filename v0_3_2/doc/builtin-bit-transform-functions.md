# Built-in bit transform functions

Shift, rotate, and reverse operations on bit strings.

Index: [builtin-functions.md](builtin-functions.md) · Short notation (`<`, `>`): [short-notation.md](short-notation.md)

---

## LSHIFT

Logical shift left — appends `n` fill bits on the right; **width increases**.

```
LSHIFT(Xbit data, Nbit n) -> Xbit
LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
LSHIFT(Wbit[n] data, Nbit count ; vector) -> (W+n)bit[n]
```

With **`; vector`**, shift each element left; assign `(W+n)wire[n]` when count is scalar `n` (broadcast). Shift count must be scalar in vector mode.

- `data` — value to shift
- `n` — positions (binary)
- `fill` *(optional)* — fill bit (default `0`)

### Runnable example

```logts-play
4wire x = 1011
5wire y = LSHIFT(x, 1)
show(y)
```

Sugar: `data < n` and `data < n w1` (see [short-notation.md](short-notation.md)).

---

## RSHIFT

Logical shift right — same width; MSBs filled with `fill`.

```
RSHIFT(Xbit data, Nbit n) -> Xbit
RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
RSHIFT(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
```

With **`; vector`**, shift right per index; `count` may be scalar (broadcast) or `Kbit[n]`. Combinable with **`; signed`** (ASHR per element).

### Runnable example

```logts-play
4wire x = 1010
4wire y = RSHIFT(x, 1)
probe(y)
```

Sugar: `data > n` and `data > n w1`.

### RSHIFT signed (ASHR)

With `; signed`, shift **arithmetic** right: MSB (sign bit) is replicated instead of `fill`. Equivalent to `ASHR` in [alu.md](alu.md#arithmetic-shift-right-vs-logical-ashr--rshift). Optional `fill` is ignored when `signed` is set.

```
RSHIFT(Xbit data, Nbit n; signed) -> Xbit
```

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

`1111` logical → `0111`; arithmetic → `1111` (still −1). `0111` (=7) arithmetic → `0011` (=3).

`LSHIFT` does **not** accept `; signed` (left shift is identical for signed/unsigned).

---

## REVERSE

Reverses bit order (MSB ↔ LSB).

```
REVERSE(Xbit value) -> Xbit
REVERSE(Wbit[n] data ; vector) -> Wbit[n]
```

With **`; vector`**, reverse bits **per element** (unary — one whole vector argument).

### Examples

| Input | Result |
|-------|--------|
| `REVERSE(0011)` | `1100` |
| `REVERSE(001)` | `100` |

### Runnable example

```logts-play
4wire x = 0011
4wire y = REVERSE(x)
show(y)
```

---

## LROTATE

Circular rotate left — width unchanged; `count` is taken modulo width.

```
LROTATE(Xbit data, Ybit count) -> Xbit
LROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
```

### Examples

| Call | Result |
|------|--------|
| `LROTATE(1011, 1)` | `0111` |
| `LROTATE(1011, 01)` | `0111` |
| `LROTATE(1011, 10)` | `1110` |

### Runnable example

```logts-play
4wire x = 1011
4wire y = LROTATE(x, 10)
probe(y)
```

---

## RROTATE

Circular rotate right — width unchanged; `count` modulo width.

```
RROTATE(Xbit data, Ybit count) -> Xbit
RROTATE(Wbit[n] data, Nbit/Kbit[n] count ; vector) -> Wbit[n]
```

### Runnable example

```logts-play
4wire x = 1011
4wire y = RROTATE(x, 1)
show(y)
```
