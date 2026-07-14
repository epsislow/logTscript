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

---

## WWIDTH

Returns the **declared / static** bit width of a literal, wire, or expression (from type metadata and AST inference), encoded as a minimal-width binary integer (like `CNTONE`).

```
WWIDTH(X) -> Ybit
```

### WWIDTH vs BITSIZE

| Input | WWIDTH | BITSIZE |
|-------|--------|---------|
| `11111` (literal) | `11` (5) | `11` (5) — same |
| `10wire a` | `1010` (declared 10) | length of current value (often 10) |
| `8wire[2] b` (whole vector) | `1000` (element 8b) | `10000` (storage 16b) |

Use **WWIDTH** for compile-time / declared scalar width (e.g. element width of `Nw` or `Nw[N]`). Use **BITSIZE** for the runtime length of the evaluated bit string.

### Examples

```
WWIDTH(11111) -> 11
WWIDTH(a)     -> 1010    # when a is 10wire
WWIDTH(b)     -> 1000    # when b is 8wire[2] (element width 8, not 16)
```

### Runnable example

```logts-play
8wire[2] vec
4wire ew = WWIDTH(vec)
show(ew)
```
