# Built-in bit selection and detection functions

These built-ins operate on arbitrary-width binary values. Useful for priority selection, interrupt handling, one-hot encoding, bit scanning, masking, and state decoding.

Index: [builtin-functions.md](builtin-functions.md)

---

## HIGH

Returns the highest (most significant) bit that is set to `1`. All other bits become `0`.

```
HIGH(Xbit value) -> Xbit
```

### Examples

| Input | Result |
|-------|--------|
| `HIGH(00101010)` | `00100000` |
| `HIGH(00010000)` | `00010000` |
| `HIGH(00000000)` | `00000000` |

### Runnable example

```logts-play
8wire requests = 00101010
8wire winner = HIGH(requests)
probe(winner)
show(winner)
```

**Typical uses:** interrupt priority selection, highest-priority request detection, bus arbitration.

---

## LOW

Returns the lowest (least significant) bit that is set to `1`.

```
LOW(Xbit value) -> Xbit
```

### Examples

| Input | Result |
|-------|--------|
| `LOW(00101010)` | `00000010` |
| `LOW(00010000)` | `00010000` |
| `LOW(00000000)` | `00000000` |

### Runnable example

```logts-play
8wire requests = 00101010
8wire picked = LOW(requests)
probe(picked)
```

**Typical uses:** lowest-priority selection, round-robin allocators, bit scanning.

---

## ANY

Returns whether any bit is set (`1` if at least one bit is `1`).

```
ANY(Xbit value) -> 1bit
```

Equivalent to `OR(value)` (fold).

### Runnable example

```logts-play
8wire requests = 00101010
1wire pending = ANY(requests)
probe(pending)
```

---

## ZERO

Returns whether all bits are zero (`1` when every bit is `0`).

```
ZERO(Xbit value) -> 1bit
```

Equivalent to `NOT(ANY(value))`.

### Runnable example

```logts-play
8wire status = 00000000
1wire empty = ZERO(status)
show(empty)
```

---

## BITINDEX

Returns the index of the active bit (LSB = bit `0`). Input is **typically** one-hot; when zero or multiple bits are set, `isInvalid = 1` and `index` is all zeros.

```
BITINDEX(Xbit value) -> Ybit index, 1bit isInvalid
```

`Y` = number of bits needed to encode indices `0 … len(value)-1`.

### Examples

| Input | index | isInvalid |
|-------|-------|-----------|
| `BITINDEX(00000001)` | `000` | `0` |
| `BITINDEX(00000100)` | `010` | `0` |
| `BITINDEX(00100000)` | `101` | `0` |
| `BITINDEX(000)` | `00` | `1` |

Assign both return values:

```
2wire q, 1wire isInvalid = BITINDEX(100)
```

### Runnable example

```logts-play
8wire winner = 00100000
3wire idx, 1wire bad = BITINDEX(winner)
probe(idx)
probe(bad)
```

---

## ONEHOT

Converts a binary index into a one-hot value (exactly one bit set).

```
ONEHOT(Xbit index) -> 2^X bits
```

Output width = `2^(width of index)`.

### Examples

| Input | Result |
|-------|--------|
| `ONEHOT(000)` | `00000001` |
| `ONEHOT(001)` | `00000010` |
| `ONEHOT(101)` | `00100000` |
| `ONEHOT(111)` | `10000000` |

### Runnable example

```logts-play
3wire sel = 101
8wire line = ONEHOT(sel)
show(line)
```

---

## BITINDEX and ONEHOT (inverses)

```
BITINDEX(ONEHOT(x))  ->  (x, 0)   # when x is in range
```

---

## Building a priority encoder

A dedicated priority encoder built-in is usually unnecessary:

```
8wire requests = 00101010
8wire winner = HIGH(requests)
1wire valid  = ANY(requests)
3wire index, 1wire bad = BITINDEX(winner)
# winner = 00100000, valid = 1, index = 101, bad = 0
```

### Runnable example

```logts-play
8wire requests = 00101010
8wire winner = HIGH(requests)
1wire valid = ANY(requests)
3wire index, 1wire bad = BITINDEX(winner)
probe(winner)
probe(valid)
probe(index)
probe(bad)
```
