# Arithmetic Built-in Functions

LogTscript provides built-in arithmetic functions that compute results **instantly**. Core four-ops return **two values** (result + carry/overflow/mod); `MAC` also returns two (`result` + `over`).

```
ADD(Xbit a, Xbit b)      -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
DIVIDE(Xbit a, Xbit b)   -> Xbit result, Xbit mod
MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
```

**Signed overload** (two's complement on width `W`, MSB = sign): append `; signed` after the argument list on `ADD`, `SUBTRACT`, `GT`, `LT`, `MIN`, `MAX`, `CLAMP`, `MULTIPLY`, `MAC`, and `RSHIFT`. Without the tag, behaviour stays **unsigned** / logical (fully compatible with existing scripts). See [Signed arithmetic (`; signed`)](#signed-arithmetic-signed) below.


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

## MAC (multiply-accumulate)

Performs **`acc + (a × b)`** (unsigned). Mathematically equivalent to **`ADD(acc, MULTIPLY(a, b))`**; the runtime may fuse the steps.

```
MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
```

**All three operands must have the same bit width `X`.**

| Output | Width | Description |
|--------|-------|-------------|
| `result` | `X` | Low `X` bits of `acc + a*b` |
| `over` | `X + 1` | Upper bits (zero-padded) |

Reconstruct the full integer by concatenating **`over` then `result`** (MSB → LSB).

### Example

```logts-play
8wire acc = 11111010
8wire a = 00010100
8wire b = 00010100
8wire result, 9wire over = MAC(acc, a, b)
show(result)
show(over)
```

Math: `250 + 20×20 = 650` → `result = 10001010`, `over = 000000010`.

Digit accumulator when the value fits in `X` bits (`over` all zeros):

```logts-play
8wire acc = 00001100
8wire digit = 00000101
8wire ten = 00001010
8wire low, 9wire hi = MAC(acc, digit, ten)
show(low)
show(hi)
```

`12 + 5×10 = 62`.

---

## GT / LT

Unsigned **numeric** ordering (not bitwise `EQ` — see [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md)).

```
GT(Xbit a, Xbit b) -> 1bit
LT(Xbit a, Xbit b) -> 1bit
```

Operands are padded to `max(len(a), len(b))` with leading `0`. `GT` → `1` if `a > b`; `LT` → `1` if `a < b`; equal → both `0`.

```logts-play
4wire a = 0101
4wire b = 0011
1wire g = GT(a, b)
1wire l = LT(b, a)
show(g)
show(l)
```

---

## MIN / MAX

```
MIN(Wbit ...) -> Wbit
MAX(Wbit ...) -> Wbit
```

Variadic (≥ 2 args after expansion). **All arguments must have the same width.** Returns the original bit string of the winning value.

Whole vectors expand to elements: `MIN(vectorA)` ≡ `MIN(vectorA:0, vectorA:1, …)`. See [vector-reduction.md](vector-reduction.md).

```logts-play
4wire a = 0101
4wire b = 0011
4wire c = 1000
4wire lo = MIN(a, b, c)
4wire hi = MAX(a, b, c)
show(lo)
show(hi)
```

---

## SUM / DOT (vector reduction)

```
SUM(Wbit ...) -> Wbit result, Wbit over
DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
```

**SUM** adds all operands (unsigned); **DOT** is the dot product of two whole vectors of the same shape. Output packing and vector operand rules: [vector-reduction.md](vector-reduction.md).

**DOT** is conceptually a chain of **MAC** calls with `acc = 0`:

```text
acc = MAC(acc, vectorA:0, vectorB:0)
acc = MAC(acc, vectorA:1, vectorB:1)
...
```

---

## CLAMP

```
CLAMP(Xbit x, Ybit min, Ybit max) -> Ybit
```

- `min` and `max` must have equal width `Y`.
- `x` may be any width; compare at **`len(x)`** with `min`/`max` zero-extended.
- Result converted to **`Y` bits**.

```logts-play
16wire x = 0000000100101100
8wire zero = 00000000
8wire max255 = 11111111
8wire y = CLAMP(x, zero, max255)
show(y)
```

`300` clamped to `255`.

---

## Signed arithmetic (`; signed`)

Several arithmetic built-ins accept an optional **bool tag** `signed` after `;` in the call. Operands are interpreted as **two's complement** on their bit width `W` (MSB = sign). **Without** `; signed`, behaviour is unchanged (unsigned).

| Built-in | Unsigned (default) | With `; signed` |
|----------|-------------------|-----------------|
| `ADD` | `result`, **carry** | same `result` bits, **overflow** (signed) |
| `SUBTRACT` | `result`, **carry** (borrow) | same `result` bits, **overflow** (signed) |
| `GT` / `LT` | unsigned numeric order | signed numeric order |
| `MIN` / `MAX` | unsigned min/max | signed min/max |
| `CLAMP` | unsigned bounds | signed bounds |
| `MULTIPLY` | unsigned product, low/high split | signed product, same split |
| `MAC` | unsigned `acc + a×b` | signed `acc + a×b` |

`DIVIDE`, `LSHIFT`, rotates, and `REVERSE` do **not** support `; signed`. `RSHIFT` with `; signed` is **arithmetic** shift (ASHR) — see [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md#rshift-signed).

### ADD / SUBTRACT signed

```
ADD(Xbit a, Xbit b; signed)      -> Xbit result, 1bit overflow
SUBTRACT(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
```

The **result bit pattern** is identical to the unsigned call; only the second return changes meaning (signed overflow instead of unsigned carry/borrow).

```logts-play
4wire acc = 0111
4wire delta = 0001
4wire nextU, 1wire carry = ADD(acc, delta)
4wire nextS, 1wire ovf = ADD(acc, delta; signed)
show(nextU)
show(carry)
show(nextS)
show(ovf)
```

`7 + 1` on 4 bits: `result = 1000`, unsigned **carry** `0`, signed **overflow** `1` (exceeds `+7`).

### GT / LT signed

```logts-play
4wire a = 1111
4wire b = 0010
1wire gtU = GT(a, b)
1wire gtS = GT(a, b; signed)
show(gtU)
show(gtS)
```

Unsigned: `1111` = 15 → `gtU = 1`. Signed: `1111` = −1 → `gtS = 0`.

### MIN / MAX / CLAMP signed

Bounds and operands use the same signed interpretation at `len(x)` (with `min`/`max` zero-extended for `CLAMP`).

```logts-play
4wire neg = 1111
4wire pos = 0010
4wire lo = MIN(neg, pos; signed)
4wire hi = MAX(neg, pos; signed)
show(lo)
show(hi)
```

```logts-play
4wire x = 1111
4wire lo = 0000
4wire hi = 0010
4wire yU = CLAMP(x, lo, hi)
4wire yS = CLAMP(x, lo, hi; signed)
show(yU)
show(yS)
```

Unsigned: `1111` = 15 → clamped to `0010`. Signed: `1111` = −1 → clamped to `0000`.

### MULTIPLY / MAC signed

Operands are multiplied (and accumulated for `MAC`) as **signed** integers. Output packing is unchanged: `result` = low `W` bits, `over` = next `W` bits (or `W+1` for `MAC`) of the full product/sum — same wire layout as unsigned, different numeric interpretation.

```
MULTIPLY(Xbit a, Xbit b; signed) -> Xbit result, Xbit over
MAC(Xbit acc, Xbit a, Xbit b; signed) -> Xbit result, (X+1)bit over
```

```logts-play
4wire a = 1111
4wire b = 1111
4wire rU, 4wire oU = MULTIPLY(a, b)
4wire rS, 4wire oS = MULTIPLY(a, b; signed)
show(rU)
show(oU)
show(rS)
show(oS)
```

Unsigned: `15×15 = 225` → `rU=0001`, `oU=1110`. Signed: `(−1)×(−1) = 1` → `rS=0001`, `oS=0000`.

```logts-play
4wire acc = 1000
4wire a = 0010
4wire b = 0001
4wire r, 5wire over = MAC(acc, a, b; signed)
show(r)
show(over)
```

Signed: `−8 + 2×1 = −6` on 4 bits → `r=1010`, `over` carries high extension bits.

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

For **digit packing** (decimal / hex), see [number-conversion.md](number-conversion.md).

---

## doc() support

```
doc(ADD)
# ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry
# ADD(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow

doc(SUBTRACT)
# SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
# SUBTRACT(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow

doc(MULTIPLY)
# MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
# MULTIPLY(Xbit a, Xbit b; signed) -> Xbit result, Xbit over

doc(DIVIDE)
# DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod

doc(MAC)
# MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
# MAC(Xbit acc, Xbit a, Xbit b; signed) -> Xbit result, (X+1)bit over

doc(GT)
doc(LT)
doc(MIN)
doc(MAX)
doc(CLAMP)

doc(SUM)
# SUM(Wbit ...) -> Wbit result, Wbit over

doc(DOT)
# DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
```

Vector operand rules and examples: [vector-reduction.md](vector-reduction.md).

Use `doc(def)` to list all built-in functions alongside any user-defined functions:

```
doc(def)
```

Output (abbreviated — full list is longer):

```
built-in:
NOT, AND, OR, XOR, … ADD, SUBTRACT, MULTIPLY, DIVIDE, MAC, SUM, DOT, …
HIGH, LOW, ANY*, ALL*, BITINDEX, … ZRELEASE, ZCONNECT, ZCONN, REG

(* = 0/1/01/10/Z/X/ZX/XZ)

debug:
show, peek, probe, watch, Zlist

user defined:
(none)
```
