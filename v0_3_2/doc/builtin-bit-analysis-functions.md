# Built-in bit analysis functions

Counting, parity, and size helpers on arbitrary-width bit strings.

Index: [builtin-functions.md](builtin-functions.md)

---

## PARITY

Returns `1` when the number of set bits is **odd** (XOR fold across all bits).

```
PARITY(Xbit value) -> 1bit
```

### Examples

| Input | Result |
|-------|--------|
| `PARITY(1011)` | `1` |
| `PARITY(1110)` | `1` |
| `PARITY(1010)` | `0` |

### Runnable example

```logts-play
4wire data = 1011
1wire p = PARITY(data)
probe(p)
```

---

## CNTONE

Counts how many bits are `1`. Returns the count as a binary value (minimal width, unpadded).

```
CNTONE(Xbit value) -> Ybit
```

### Example

```
CNTONE(00101010) -> 11    # 3 ones
```

### Runnable example

```logts-play
8wire data = 00101010
2wire n = CNTONE(data)
show(n)
```

---

## CNTZERO

Counts how many bits are `0`.

```
CNTZERO(Xbit value) -> Ybit
```

### Example

```
CNTZERO(0101010) -> 100   # 4 zeros (7-bit input)
```

### Runnable example

```logts-play
7wire data = 0101010
3wire z = CNTZERO(data)
probe(z)
```

---

## BITSIZE

Returns the **length** of the bit string as a binary number (not the numeric value of the bits).

```
BITSIZE(Xbit value) -> Ybit
```

### Example

```
BITSIZE(0101010) -> 111   # 7 bits long
```

### Runnable example

```logts-play
7wire data = 0101010
3wire len = BITSIZE(data)
show(len)
```
