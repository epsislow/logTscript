# Built-in bit transform functions

Shift, rotate, and reverse operations on bit strings.

Index: [builtin-functions.md](builtin-functions.md) · Short notation (`<`, `>`): [short-notation.md](short-notation.md)

---

## LSHIFT

Logical shift left — appends `n` fill bits on the right; **width increases**.

```
LSHIFT(Xbit data, Nbit n) -> Xbit
LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
```

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
```

### Runnable example

```logts-play
4wire x = 1010
4wire y = RSHIFT(x, 1)
probe(y)
```

Sugar: `data > n` and `data > n w1`.

---

## REVERSE

Reverses bit order (MSB ↔ LSB).

```
REVERSE(Xbit value) -> Xbit
```

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
```

### Runnable example

```logts-play
4wire x = 1011
4wire y = RROTATE(x, 1)
show(y)
```
