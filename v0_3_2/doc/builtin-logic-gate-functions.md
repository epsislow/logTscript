# Built-in logic gate functions

Combinational logic gates invoked directly in expressions. `Xbit` = bit string of any width.

Index: [builtin-functions.md](builtin-functions.md) · Short notation (`&`, `|`, `^`): [short-notation.md](short-notation.md)

---

## Signatures

| Call | Signature |
|------|-----------|
| `doc(NOT)` | `NOT(Xbit) -> Xbit` |
| `doc(AND)` … `doc(NOR)` | `Gate(Xbit) -> 1bit` **or** `Gate(Xbit, Xbit) -> Xbit` |
| `doc(EQ)` | `EQ(Xbit, Xbit) -> 1bit` |

**1-argument mode (fold):** `OR(a)` folds across all bits of `a` → **1 bit**.

**2-argument mode (bitwise):** `OR(a, b)` applies the gate bit-by-bit → **N bits** (`N = max(width(a), width(b))`).

### Unequal operand widths (left pad)

When the two operands have different lengths, the **shorter** one is extended with `0` on the **left** (MSB side) until both match. Index `0` is the leftmost bit — same convention as `wire.0` and `bitRange`.

```
AND(111, 10000)
  → AND(00111, 10000)
  → 00000

AND(11100, 10000)
  → 10000   (operands already same width; no padding)
```

| Shorter operand | Padded to 5 bits |
|-----------------|------------------|
| `111` | `00111` (not `11100`) |
| `11` | `00011` |

Applies to `AND`, `OR`, `XOR`, `NXOR`, `NAND`, `NOR`, and `EQ` (bitwise compare before folding to 1 bit). Boolean analysis (`lutOf`, `truthTableOf`, `simplify`, …) uses the same rules.

**1-argument fold** is unrelated: `AND(111)` folds all bits of one operand to a single `1bit` result.

---

## NOT

```
NOT(Xbit) -> Xbit
```

Bitwise inversion; output width equals input width.

### Runnable example

```logts-play
4wire a = 1010
4wire y = NOT(a)
show(y)
```

---

## AND / OR / XOR / NXOR / NAND / NOR

Dual-mode gates (fold or bitwise). Example with OR:

### Runnable example

```logts-play
5wire a = 111
5wire b = 10000
5wire y = AND(a, b)
show(y)
```

`a` is only 3 bits; `AND` pads it to `00111` before combining with `b`.

```logts-play
4wire a = 1100
4wire b = 1010
4wire y = OR(a, b)
1wire any = OR(a)
probe(y)
show(any)
```

---

## EQ

```
EQ(Xbit, Xbit) -> 1bit
```

Compares two operands bit-by-bit; returns `1` only if every bit pair matches. For **unsigned numeric** ordering use `GT` / `LT` in [arithmetic.md](arithmetic.md).

### Runnable example

```logts-play
4wire a = 0011
4wire b = 0011
1wire same = EQ(a, b)
probe(same)
```

---

## `Z` and `X` in MODE ZSTATE

When `MODE ZSTATE` is active, gate operands may contain **`Z`** (undriven) or **`X`** (multi-driver conflict). Gates use **IEEE 1164** tables instead of pure binary:

```logts-play wave
MODE ZSTATE

1wire a = ?X
1wire b = 1
1wire y = OR(a, b)
show(y)
```

Result: `y = 1` (OR with any `1`).

`NOT(?Z)` on a 1-bit wire → `X`. Full bus semantics, resolver, and error rules: **[zstate.md](zstate.md)**.
