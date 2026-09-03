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

## PARITYEVEN · PARITYODD

UART-style parity bit to append after data (same as `parityEven` / `parityOdd` in [protocol-assemble.md](protocol-assemble.md)).

```
PARITYEVEN(Xbit value) -> 1bit
PARITYODD(Xbit value)  -> 1bit
```

`PARITYEVEN` matches `PARITY` (XOR / odd popcount → `1`). `PARITYODD` is the complement on 1 bit.

Full page with **Load** / **Load & Run** examples: [builtin-PARITYEVEN.md](builtin-PARITYEVEN.md).

```logts-play
8wire data = 01100110
1wire pe = PARITYEVEN(data)
1wire po = PARITYODD(data)
show(pe)
show(po)
```

```logts-play
1wire p = PARITY(1011)
1wire e = PARITYEVEN(1011)
show(p)
show(e)
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

### Schema field paths

When the wire has a semantic schema tag (`40wire<frame> pkt`), `WWIDTH` resolves **declared field width** from the schema definition (same paths as read/assign):

```logts
40wire<frame> pkt := 0
4wire w = WWIDTH(pkt:tag)           # 8 → 1000 on 4wire target
3wire a = WWIDTH(pkt:slots:0:alu)   # 4 → 100 (minimal-width binary)
```

Static indices only — dynamic `(expr)` indices are not supported at compile time.

### parseView (protocol) field paths

When the wire has a **parseView** tree (after `=: .myProto { … }`), `WWIDTH` uses the same resolution as `show` and field read — **parseView first**, then schema if both exist:

```logts
16wire parsed = .repeatPv { data = ... }
4wire w = WWIDTH(parsed:packet:0:kind)   # width from protocol def (e.g. 8b)
```

Repeated sections require an explicit index (`packet:0:kind`, not `packet:kind`) — same error as read access.
