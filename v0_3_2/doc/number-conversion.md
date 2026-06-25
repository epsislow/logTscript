# Number conversion

Unsigned binary numbers ↔ packed digit strings (4 bits per digit). **Decimal** nibbles hold 0–9; **hex** nibbles hold 0–F.

Index: [builtin-functions.md](builtin-functions.md)

Ordering and selection (`GT`, `LT`, `MIN`, `MAX`, `CLAMP`, `MAC`): [arithmetic.md](arithmetic.md).

---

## Overview

### Decimal (BCD)

| Function | Direction | Output |
|----------|-----------|--------|
| `CNTN10S` | count decimal digits | `Ybit` (minimal width, unpadded) |
| `N2N10S` | number → packed digits | `maxDecDigits × 4` bits |
| `N10S2N` | packed digits → number | minimal-width binary (use `:=` / `=:` to pad) |

`maxDecDigits` for an `N`-bit input is the number of decimal digits in `2^N − 1` (e.g. 8 bit → 3 digits, 0…255).

### Hexadecimal (packed nibbles)

| Function | Direction | Output |
|----------|-----------|--------|
| `CNTN16S` | count hex digits | `Ybit` (minimal width, unpadded) |
| `N2N16S` | number → packed hex | `maxHexDigits × 4` bits |
| `N16S2N` | packed hex → number | minimal-width binary |

`maxHexDigits` for an `N`-bit input is the number of hex digits in `2^N − 1` (e.g. 8 bit → 2 digits, 0…255 → `FF`).

### BCD helper

| Function | Output |
|----------|--------|
| `ISDIGIT` | `1bit` — `1` if unsigned value is 0…9 |

All functions above are **unsigned** only and require binary operands (runtime error on `Z` / `X` in `MODE ZSTATE`).

---

## CNTN10S

```
CNTN10S(Xbit value) -> Ybit
```

Returns how many **significant** decimal digits `value` has.

- `CNTN10S(0)` → `1` (displays as `"0"`)
- `CNTN10S(245)` on 8 bit → `11` (3 digits)
- `CNTN10S(5)` → `1`

### Example

```logts-play
8wire n = 11110101
2wire cnt = CNTN10S(n)
show(cnt)
```

---

## N2N10S

```
N2N10S(Xbit value) -> Zbit packed
```

Packed BCD: each decimal digit is **4 bits** (0–9), MSB-first. Output width `Z = maxDecDigits × 4`.

| Input (8 bit) | Decimal | Packed (12 bit) |
|---------------|---------|-----------------|
| `11110101` | 245 | `0010_0100_0101` |
| `00000101` | 5 | `0000_0000_0101` |

```logts-play
8wire n = 11110101
12wire packed = N2N10S(n)
show(packed)
```

---

## N10S2N

```
N10S2N(Xbit packed) -> Wbit value
```

Inverse of `N2N10S`. Packed length must be a **multiple of 4**; each nibble must be 0–9 or **runtime error**.

```logts-play
8wire number = 11110101
12wire num10s = N2N10S(number)
8wire back := N10S2N(num10s)
show(back)
```

---

## CNTN16S

```
CNTN16S(Xbit value) -> Ybit
```

Significant **hex** digit count (same rules as `CNTN10S`, base 16).

- `CNTN16S(0)` → `1`
- `CNTN16S(245)` on 8 bit → `10` (2 digits, `F5`)
- `CNTN16S(5)` → `1`

```logts-play
8wire n = 11110101
2wire cnt = CNTN16S(n)
show(cnt)
```

---

## N2N16S

```
N2N16S(Xbit value) -> Zbit packed
```

Packed hex: each digit is **4 bits** (0–F), MSB-first. Output width `Z = maxHexDigits × 4`.

| Input (8 bit) | Hex | Packed (8 bit) |
|---------------|-----|----------------|
| `11110101` | F5 | `1111_0101` |
| `00000101` | 05 | `0000_0101` |

```logts-play
8wire n = 11110101
8wire packed = N2N16S(n)
show(packed)
```

---

## N16S2N

```
N16S2N(Xbit packed) -> Wbit value
```

Inverse of `N2N16S`. Any nibble 0–15 is valid. Length must be a **multiple of 4**.

```logts-play
8wire packed = 11110101
8wire back := N16S2N(packed)
show(back)
```

---

## ISDIGIT

```
ISDIGIT(Xbit value) -> 1bit
```

Returns `1` if the unsigned value is a valid **decimal digit** (0…9); otherwise `0`. Useful before manual BCD handling; `N10S2N` still errors on invalid nibbles.

```logts-play
4wire d9 = 1001
4wire d10 = 1010
1wire y9 = ISDIGIT(d9)
1wire y10 = ISDIGIT(d10)
show(y9)
show(y10)
```

---

## doc()

```
doc(CNTN10S)
doc(N2N10S)
doc(N10S2N)
doc(CNTN16S)
doc(N2N16S)
doc(N16S2N)
doc(ISDIGIT)
```

---

## See also

- [arithmetic.md](arithmetic.md) — `ADD`, `MAC`, `GT`, `CLAMP`, …
- [assignment-operators.md](assignment-operators.md) — `:=`, `=:`
- [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md) — `CNTONE`
