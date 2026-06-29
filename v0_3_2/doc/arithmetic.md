# Arithmetic Built-in Functions

LogTscript provides built-in arithmetic functions that compute results **instantly**. Core four-ops return **two values** (result + carry/overflow/mod); `MAC` also returns two (`result` + `over`).

Per-function reference (signatures, examples, tags): **[builtin-tagged-index.md](builtin-tagged-index.md)**.

```
ADD(Xbit a, Xbit b)      -> Xbit result, 1bit carry
SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry
MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over
DIVIDE(Xbit a, Xbit b)   -> Xbit result, Xbit mod
MAC(Xbit acc, Xbit a, Xbit b) -> Xbit result, (X+1)bit over
```

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| ADD | [builtin-ADD.md](builtin-ADD.md) | `signed`, `vector` |
| SUBTRACT | [builtin-SUBTRACT.md](builtin-SUBTRACT.md) | `signed`, `vector` |
| MULTIPLY | [builtin-MULTIPLY.md](builtin-MULTIPLY.md) | `signed`, `vector` |
| DIVIDE | [builtin-DIVIDE.md](builtin-DIVIDE.md) | `signed`, `vector` |
| MAC | [builtin-MAC.md](builtin-MAC.md) | `signed`, `vector` |
| GT | [builtin-GT.md](builtin-GT.md) | `signed`, `vector` |
| LT | [builtin-LT.md](builtin-LT.md) | `signed`, `vector` |
| MIN | [builtin-MIN.md](builtin-MIN.md) | `signed`, `vector` |
| MAX | [builtin-MAX.md](builtin-MAX.md) | `signed`, `vector` |
| CLAMP | [builtin-CLAMP.md](builtin-CLAMP.md) | `signed`, `vector` |

Vector reduction (`SUM`, `DOT`, `ARGMAX`, `ARGMIN`): [vector-reduction.md](vector-reduction.md). Bitwise equality: [builtin-EQ.md](builtin-EQ.md).

---

## Syntax

Since the core four-ops and `MAC` return **two values**, assign both:

```
Nwire result, 1wire carry = ADD(a, b)
Nwire result, 1wire carry = SUBTRACT(a, b)
Nwire result, Nwire over  = MULTIPLY(a, b)
Nwire result, Nwire mod   = DIVIDE(a, b)
Nwire result, (N+1)wire over = MAC(acc, a, b)
```

Bit width `N` = `max(len(a), len(b))` for binary ops; short inputs are zero-padded on the left.

---

## Tag overview {#tag-overview}

Optional **bool tags** after `;` in the call (`signed`, `vector`, or both). Operand expansion vs element-wise mode: [vector-reduction.md — element-wise mode](vector-reduction.md#element-wise-mode-vector).

| Built-in | Unsigned (default) | `; signed` | `; vector` |
|----------|-------------------|------------|------------|
| ADD | result + **carry** | result + **overflow** | `Wbit[n]` per index |
| SUBTRACT | result + **carry** (borrow) | result + **overflow** | `Wbit[n]` per index |
| MULTIPLY | low/high product split | signed product | `Wbit[n]` per index |
| DIVIDE | quotient + mod | signed `/` `%` | `Wbit[n]` per index |
| MAC | `acc + a×b` | signed accumulate | `Wbit[n]`, `(W+1)bit[n]` |
| GT / LT | unsigned order | signed order | `1wire[n]` |
| MIN / MAX | unsigned min/max | signed | `Wbit[n]` |
| CLAMP | unsigned bounds | signed bounds | `Wbit[n]` |
| SUM / DOT | see [vector-reduction](vector-reduction.md) | signed | SUM only |

`LSHIFT`, rotates, and `REVERSE` do **not** support `; signed`. `RSHIFT` with `; signed` is **ASHR** — [builtin-RSHIFT.md](builtin-RSHIFT.md).

**Result bits** for `ADD` / `SUBTRACT` are identical with or without `; signed`; only the second return changes meaning.

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

`7 + 1` on 4 bits: `result = 1000`, unsigned carry `0`, signed overflow `1`.

---

## Comparison with component equivalents

| Built-in | Component | Difference |
|----------|-----------|------------|
| `ADD(a, b)` | `comp [adder]` | No declaration, instant result |
| `SUBTRACT(a, b)` | `comp [subtract]` | No declaration, instant result |
| `MULTIPLY(a, b)` | `comp [multiplier]` | No declaration, instant result |
| `DIVIDE(a, b)` | `comp [divider]` | No declaration, instant result |

Use **built-ins** for one-off calculations; use **components** for named devices with pins (e.g. in a PCB).

Digit packing: [number-conversion.md](number-conversion.md).

---

## doc() support

```
doc(ADD)
doc(SUBTRACT)
doc(MULTIPLY)
doc(DIVIDE)
doc(MAC)
doc(GT)
doc(LT)
doc(MIN)
doc(MAX)
doc(CLAMP)
doc(SUM)
doc(DOT)
```

Live signatures come from `Interpreter.BUILTIN_DOC`. List all: `doc(def)`.
