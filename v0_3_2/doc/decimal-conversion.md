# Decimal conversion (CNTN10S, N2N10S, N10S2N)

Unsigned binary numbers ↔ packed decimal digits (4 bits per digit, BCD 0–9).

Index: [builtin-functions.md](builtin-functions.md)

---

## Overview

| Function | Direction | Output |
|----------|-----------|--------|
| `CNTN10S` | count decimal digits | `Ybit` (minimal width, unpadded) |
| `N2N10S` | number → packed digits | `maxCifre × 4` bits |
| `N10S2N` | packed digits → number | minimal-width binary (use `:=` / `=:` to pad) |

All three operate on **unsigned** values only.

`maxCifre` for an `N`-bit input is the number of decimal digits in `2^N − 1` (e.g. 8 bit → 3 digits, 0…255).

---

## CNTN10S

```
CNTN10S(Xbit value) -> Ybit
```

Returns how many **significant** decimal digits `value` has.

- `CNTN10S(0)` → `1` (displays as `"0"`)
- `CNTN10S(245)` on 8 bit → `11` (3 digits)
- `CNTN10S(5)` → `1`

`Y` is minimal width (unpadded), same style as `CNTONE`. Declare a wide enough wire or use `:=`.

### Example

```logts-play
8wire n = 11110101
2wire cnt = CNTN10S(n)
show(cnt)
```

Result: `11` (3 decimal digits)

---

## N2N10S

```
N2N10S(Xbit value) -> Zbit packed
```

Converts unsigned `value` to packed BCD: each decimal digit is **4 bits** (0–9), MSB-first.

Output width `Z = maxCifre × 4` where `maxCifre` follows input width (see above). Digits are **left-padded with zero nibbles** inside the field.

| Input (8 bit) | Decimal | Packed (12 bit) |
|---------------|---------|-----------------|
| `11110101` | 245 | `0010_0100_0101` |
| `00000101` | 5 | `0000_0000_0101` |
| `00000000` | 0 | `0000_0000_0000` |

### Example

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

Inverse of `N2N10S`: reads packed BCD MSB-first and returns the unsigned binary value.

- Packed length must be a **multiple of 4**.
- Each nibble must be 0–9; otherwise **runtime error**.
- Result width is **minimal** (no padding). Use `:=` or `=:` when assigning to a wider wire.

### Example

```logts-play
8wire n = 11110101
12wire packed = N2N10S(n)
8wire back := N10S2N(packed)
show(back)
```

Result: `11110101`

### Round-trip

```logts-play
8wire number = 11110101
12wire num10s = N2N10S(number)
8wire back := N10S2N(num10s)
show(back)
```

---

## doc()

```
doc(CNTN10S)
doc(N2N10S)
doc(N10S2N)
```

---

## See also

- [arithmetic.md](arithmetic.md) — `ADD`, `SUBTRACT`, …
- [assignment-operators.md](assignment-operators.md) — `:=`, `=:`
- [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md) — `CNTONE`
