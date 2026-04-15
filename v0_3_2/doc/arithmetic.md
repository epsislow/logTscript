# Arithmetic Built-in Functions

LogTscript provides four built-in arithmetic functions that compute results **instantly** — no clock cycle or component declaration is needed. Each function takes two bit-string operands of any width and returns **two values**: the primary result and a secondary output (carry, borrow, overflow, or remainder).

```
ADD(Xbit a, Xbit b)      -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
DIVIDE(Xbit a, Xbit b)   -> Xbit result, Xbit mod
```

---

## Syntax

Since all four functions return **two values**, they must always be assigned to two variables:

```
Nwire result, 1wire carry = ADD(a, b)
Nwire result, 1wire carry = SUBTRACT(a, b)
Nwire result, Nwire over  = MULTIPLY(a, b)
Nwire result, Nwire mod   = DIVIDE(a, b)
```

The bit width `N` of both inputs is `max(len(a), len(b))`. Short inputs are zero-padded on the left. The `result` output always has the same width `N`.

---

## ADD

**Binary addition with wrap-around.**

```
ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry
```

- `result` = `(a + b) mod 2^N` (N-bit sum, wraps at overflow)
- `carry` = `1` if `a + b > 2^N - 1`; `0` otherwise

### Examples

```
4wire idx = 0011
4wire inc = 0001
4wire nextIdx, 1wire carry = ADD(idx, inc)
# nextIdx = 0100  (3 + 1 = 4)
# carry   = 0
```

```
4wire idx2 = 1111
4wire inc2 = 0001
4wire nextIdx2, 1wire carry2 = ADD(idx2, inc2)
# nextIdx2 = 0000  (15 + 1 = 16 → wraps to 0)
# carry2   = 1
```

```
8wire a = 11111111
8wire b = 00000001
8wire r, 1wire c = ADD(a, b)
# r = 00000000  (255 + 1 → wraps)
# c = 1
```

### Use cases

- Incrementing a counter or pointer
- Implementing ripple-carry adders in logic scripts
- Building ALU-like circuits without using `comp.adder`

---

## SUBTRACT

**Binary subtraction with wrap-around (two's complement style).**

```
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
```

- `result` = `(a - b) mod 2^N` (wraps on underflow)
- `carry` = `1` if `a < b` (borrow occurred); `0` otherwise

### Examples

```
4wire idx = 0011
4wire dec = 0001
4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)
# prevIdx = 0010  (3 - 1 = 2)
# carry   = 0
```

```
4wire idx2 = 0000
4wire dec2 = 0001
4wire prevIdx2, 1wire carry2 = SUBTRACT(idx2, dec2)
# prevIdx2 = 1111  (0 - 1 → wraps to 15)
# carry2   = 1
```

```
4wire a = 1010
4wire b = 1010
4wire r, 1wire c = SUBTRACT(a, b)
# r = 0000  (10 - 10 = 0)
# c = 0
```

### Use cases

- Decrementing a counter or pointer
- Checking whether `a >= b` via the carry bit

---

## MULTIPLY

**Binary multiplication with overflow capture.**

```
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
```

- `result` = low `N` bits of `a * b`
- `over` = high `N` bits of `a * b` (the overflow portion, shifted right by `N`)

The full product is `(over << N) | result`.

### Examples

```
4wire a = 0010
4wire b = 0011
4wire result, 4wire over = MULTIPLY(a, b)
# result = 0110  (2 * 3 = 6)
# over   = 0000  (no overflow)
```

```
4wire a2 = 1111
4wire b2 = 1111
4wire result2, 4wire over2 = MULTIPLY(a2, b2)
# 15 * 15 = 225 = 0b11100001
# result2 = 0001  (225 & 0xF  = low 4 bits)
# over2   = 1110  (225 >> 4   = high 4 bits)
```

```
4wire a3 = 1111
4wire b3 = 0000
4wire result3, 4wire over3 = MULTIPLY(a3, b3)
# result3 = 0000
# over3   = 0000
```

### Use cases

- Scaling values
- Computing addresses (base + stride * index)
- Detecting numeric overflow via the `over` output

---

## DIVIDE

**Binary integer division with remainder.**

```
DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
```

- `result` = integer quotient `floor(a / b)`, masked to `N` bits
- `mod` = remainder `a % b`, masked to `N` bits
- If `b = 0`, both `result` and `mod` are `0` (no error thrown)

### Examples

```
4wire a = 0110
4wire b = 0010
4wire result, 4wire mod = DIVIDE(a, b)
# result = 0011  (6 / 2 = 3)
# mod    = 0000  (6 % 2 = 0)
```

```
4wire a2 = 0111
4wire b2 = 0010
4wire result2, 4wire mod2 = DIVIDE(a2, b2)
# result2 = 0011  (7 / 2 = 3)
# mod2    = 0001  (7 % 2 = 1)
```

```
4wire a3 = 0001
4wire b3 = 0011
4wire result3, 4wire mod3 = DIVIDE(a3, b3)
# result3 = 0000  (1 / 3 = 0)
# mod3    = 0001  (1 % 3 = 1)
```

```
4wire a4 = 0110
4wire b4 = 0000
4wire result4, 4wire mod4 = DIVIDE(a4, b4)
# result4 = 0000  (division by zero → 0)
# mod4    = 0000
```

### Use cases

- Computing modular indices (e.g. circular buffers)
- Checking divisibility via the `mod` output
- Fixed-point scaling

---

## Comparison with component equivalents

These built-in functions are **combinational** — they produce their result immediately when evaluated, without state or clock:

| Built-in | Component equivalent | Difference |
|----------|----------------------|------------|
| `ADD(a, b)` | `comp [adder]` | No declaration, instant result |
| `SUBTRACT(a, b)` | `comp [subtract]` | No declaration, instant result |
| `MULTIPLY(a, b)` | `comp [multiplier]` | No declaration, instant result |
| `DIVIDE(a, b)` | `comp [divider]` | No declaration, instant result |

Use the **built-in functions** when you need a quick one-off calculation.
Use the **components** when you need a named, persistent device with pins that other parts of the circuit can wire to (e.g. in a PCB definition).

---

## doc() support

```
doc(ADD)
# ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry

doc(SUBTRACT)
# SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry

doc(MULTIPLY)
# MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over

doc(DIVIDE)
# DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod
```

Use `doc(def)` to list all built-in functions (including ADD, SUBTRACT, MULTIPLY, DIVIDE) alongside any user-defined functions:

```
doc(def)
```

Output:

```
built-in:
NOT, AND, OR, XOR, NXOR, NAND, NOR, EQ, LATCH, LSHIFT, RSHIFT, MUX1, MUX2, MUX3, DEMUX1, DEMUX2, DEMUX3, ADD, SUBTRACT, MULTIPLY, DIVIDE, REG<N>

user defined:
(none)
```
