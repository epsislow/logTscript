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
| ADD | [builtin-ADD.md](builtin-ADD.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| SUBTRACT | [builtin-SUBTRACT.md](builtin-SUBTRACT.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| MULTIPLY | [builtin-MULTIPLY.md](builtin-MULTIPLY.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| DIVIDE | [builtin-DIVIDE.md](builtin-DIVIDE.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| MAC | [builtin-MAC.md](builtin-MAC.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| ABS | [builtin-ABS.md](builtin-ABS.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16` (required) |
| GT | [builtin-GT.md](builtin-GT.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| LT | [builtin-LT.md](builtin-LT.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| MIN | [builtin-MIN.md](builtin-MIN.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| MAX | [builtin-MAX.md](builtin-MAX.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |
| CLAMP | [builtin-CLAMP.md](builtin-CLAMP.md) | `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`, `vector`, `matrix` |

Vector reduction (`SUM`, `DOT`, `ARGMAX`, `ARGMIN`): [vector-reduction.md](vector-reduction.md). **2D element-wise:** [matrix-reduction.md](matrix-reduction.md). Bitwise equality: [builtin-EQ.md](builtin-EQ.md).

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

Optional tags after `;` in the call: **`signed`**, **`q4p4`**, **`q8p8`**, **`fp16`**, **`bf16`** (mutually exclusive numeric formats), plus **`vector`**, **`matrix`** (not together). See [builtin-tagged-index.md](builtin-tagged-index.md).

### Parametric format tags (`sX`, `qXpY`) {#parametric-formats}

Beyond the fixed aliases above, built-ins accept **parametric** tags (mutually exclusive with each other and with `signed`):

| Pattern | Meaning | Operand width |
|---------|---------|---------------|
| **`sX`** | Signed two's complement, exactly **X** bits (1≤X≤64) | wire = **X** bit |
| **`qXpY`** | Signed fixed-point **Q{X}.{Y}** (X+Y≤64) | wire = **(X+Y)** bit |

Examples: `ADD(a, b; q6p2)` on **8wire**, `ADD(x, y; s32)` on **32wire**, `q0p8` for fractional values in (−1…+1), `q8p0` for integers (same bits as `s8`, distinct display suffix). **`fp16`** / **`bf16`** remain fixed at 16 bits only — no `fpX`/`bfX`.

```logts-play
8wire a = \1.5;q6p2
8wire b = \0.5;q6p2
8wire s, 4wire st = ADD(a, b; q6p2)
show(s; q6p2)
show(st)
```

`MULTIPLY` / `MAC` / `DOT` / `SUM` with `qXpY`: overflow wire **`over`** is **2×W** bits (W = X+Y), plus **`4bit status`**.

### Status register (`4bit`) {#status-4bit}

Built-in-uri cu tag de format (`q4p4`, `q8p8`, `qXpY`, `sX`, `fp16`, `bf16`) returnează **`4bit status`** în loc de `1bit` overflow/inexact. Tag-ul bare **`signed`** (adaptiv) păstrează **`1bit overflow`**.

Layout MSB-first (bit0 = cel mai din stânga, ca `bitRange`):

| Bit | Semnificație |
|-----|--------------|
| bit0 | overflow |
| bit1 | underflow |
| bit2 | inexact |
| bit3 | nan |

Exemplu: `1000` = doar overflow. Fixed-point: bit0 + bit2 (rotunjire); float: toți cei 4 biți relevanți.

| Returnuri | Built-in |
|-----------|----------|
| `result`, `4bit status` | ADD, SUBTRACT, ABS |
| `result`, `over`, `4bit status` | MULTIPLY, MAC, DOT, SUM |
| `result`, `mod`, `4bit status` | DIVIDE |

### `NFORMAT` — format conversion

```
NFORMAT(a ; <src> to_<dst>) -> result, 4bit status
NFORMAT(tensor ; <src> to_<dst> vector) -> Wdst·wire[n] result, 4wire[n] status
NFORMAT(tensor ; <src> to_<dst> matrix) -> Wdst·wire[n,m] result, 4wire[n,m] status
```

| Tag pair | Result width |
|----------|--------------|
| `; signed to_q4p4` | 8 |
| `; signed to_q8p8` / `to_fp16` / `to_bf16` | 16 |
| `; q4p4 to_signed` | 8 (operand width) |
| `; q4p4 to_q8p8` / `to_fp16` / `to_bf16` | 16 |
| `; q8p8` / `fp16` / `bf16` ↔ other formats | per destination tag |
| `; sX to_…` / `; … to_sX` | parametrized signed, width **X** |
| `; qXpY to_…` / `; … to_qXpY` | parametrized fixed-point, width **X+Y** (≤64) |

`src` and `dst` must differ. Formats: `signed`, `sX`, `q4p4`/`q8p8`/`qXpY`, `fp16`, `bf16` (and `to_*` for destination). Scalar, `; vector`, or `; matrix` (mutually exclusive). See [builtin-NFORMAT.md](builtin-NFORMAT.md).

```logts-play
8wire[2] v = 01110000 + 11110000
16wire[2] r, 4wire[2] st = NFORMAT(v; q4p4 to_fp16 vector)
show(st)
```

| Built-in | `; q4p4` (8-bit) | `; q8p8` / `; fp16` / `; bf16` (16-bit) |
|----------|------------------|----------------------------------------|
| ADD / SUBTRACT | fixed-point + **4bit status** | fixed / float + **4bit status** |
| MULTIPLY / DIVIDE / MAC | fixed ops + over/mod + **status** | fixed / float ops + **status** |
| SUM | fixed sum + over + **status** | fixed / float sum + over + **status** |
| MIN / MAX | fixed compare | fixed / float compare |
| GT / LT | fixed compare → `1bit` | fixed / float compare |
| CLAMP | fixed bounds | fixed / float bounds |
| ABS | fixed `|x|` + overflow | fixed / float `|x|` |
| DOT | rank-1 dot + `over` | rank-1 dot + flag |
| ARGMAX / ARGMIN | rank-1 `; q4p4` compare | — |
| RSHIFT | ASHR on 8-bit | ASHR on 16-bit (`q8p8` only) |

Optional **bool tags** after `;` in the call (`signed`, `vector`, `matrix`, or combinations except **`vector` + `matrix`**). Operand expansion vs element-wise mode: [vector-reduction.md](vector-reduction.md#element-wise-mode-vector), [matrix-reduction.md](matrix-reduction.md).

| Built-in | Unsigned (default) | `; signed` | `; vector` | `; matrix` |
|----------|-------------------|------------|------------|------------|
| ADD | result + **carry** | result + **overflow** | `Wbit[n]` per index | `Wbit[N,M]` per cell |
| SUBTRACT | result + **carry** (borrow) | result + **overflow** | `Wbit[n]` per index | `Wbit[N,M]` per cell |
| MULTIPLY | low/high product split | signed product | `Wbit[n]` per index | `Wbit[N,M]` per cell |
| DIVIDE | quotient + mod | signed `/` `%` | `Wbit[n]` per index | `Wbit[N,M]` per cell |
| MAC | `acc + a×b` | signed accumulate | `Wbit[n]`, `(W+1)bit[n]` | `Wbit[N,M]` per cell |
| GT / LT | unsigned order | signed order | `1wire[n]` | `1wire[N×M]` |
| MIN / MAX | unsigned min/max | signed | `Wbit[n]` | `Wbit[N,M]` |
| CLAMP | unsigned bounds | signed bounds | `Wbit[n]` | `Wbit[N,M]` |
| ABS | — | **`|x|`** + **overflow** on `INT_MIN` | — | — |
| SUM / DOT | see [vector-reduction](vector-reduction.md) | signed | SUM only | SUM only |

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
