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

**2-argument mode (bitwise):** `OR(a, b)` applies the gate bit-by-bit → **N bits** (width of operands).

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

Compares two operands bit-by-bit; returns `1` only if every bit pair matches.

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
