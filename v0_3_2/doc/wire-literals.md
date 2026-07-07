# Wire literals

Literals are fixed bit patterns written directly in expressions and assignments. They are the usual way to initialize wires, feed constants into gates, and build concatenations with `+`.

This page lists **every literal form** accepted on the right-hand side of wire assignments and in expression atoms (`show`, `peek`, function arguments, vector `+`, etc.).

Related: [assignment operators](assignment-operators.md) (`=`, `:=`, `=:`), [short notation](short-notation.md) (literals inside backticks), [debug output](debug.md) (`show` display tags including `ascii`), [MODE ZSTATE](zstate.md) (logic literals).

---

## Quick reference

| Form | Example | Meaning |
|------|---------|---------|
| **Binary** | `1010` | Bits as written (only `0` and `1`) |
| **Decimal unsigned** | `\255` | Unsigned integer → minimal binary |
| **Grouped literal** | `\2 \23 \242;8` | Multiple `\N` values + one `;tag` on the last atom |
| **Decimal signed** | `\-3;s8` | Two's complement on **exactly** `W` bits (`;sW`) |
| **Hex pattern** | `^FF` | Each hex digit → 4 bits (unsigned pattern) |
| **Hex value signed** | `^-A;8` | Signed numeric value in hex + **explicit** width |
| **Wire string** | `"Hello"` / `'Hi'` | One byte per character (8 bit), MSB-first in the wire |
| **Logic** (ZSTATE) | `?10Z0` | Tristate `0` / `1` / `Z` / `X` |
| **Meta constant** | `/instance/` | Compile-time constant from the meta registry |

Postfixes shared by several forms:

| Postfix | Example | Effect |
|---------|---------|--------|
| **Bit range** | `\255.0-7`, `^FF.4/8` | Slice after conversion to bits |
| **Padding** `;p` | `\12;8`, `^f;8` | Pad unsigned **scalar** literal to `p` bits (left zeroes) |
| **Grouped tag** | `\2 \-1;s8`, `\1.5;q4p4` | Suffix on last atom applies to **all** elements in the group |

---

## Binary literals

A token of only `0` and `1` (with optional digits `2`–`9` forcing decimal interpretation — see below) is a **binary literal**.

```logts-play
4wire a = 1010
show(a)
```

| Rule | Detail |
|------|--------|
| Digits | `0` and `1` only for pure binary |
| Width | Number of characters = number of bits |
| Assignment | With `=`, wire width must match exactly |

Concatenation builds wider literals:

```logts-play
8wire bus = 1111 + 0000
show(bus)
```

---

## Decimal unsigned — `\N`

Backslash introduces an **unsigned** decimal integer. The value is converted to binary (no leading-zero padding unless you add `;p`).

```logts-play
8wire a = \255
show(a)
```

```logts-play
4wire n = \15
show(n)
```

| Form | Result |
|------|--------|
| `\0` | `0` |
| `\255` | `11111111` (8 bits of value) |
| `\12;8` | `00001100` — `;8` is **padding** to 8 bits |

`\N` is also used for **vector indices** and some built-in arguments where a decimal index is required (e.g. `vectorA:\0`).

---

## Decimal signed — `\-N;sW`

Signed decimal literals use a **minus after the backslash** (or a positive `\N`) and require an **explicit signed tag** `;sW` (`W` = two's-complement width).

```logts-play
8wire a = \-3;s8
show(a)
```

| Source | Result on `8wire` |
|--------|-------------------|
| `\-3;s8` | `11111101` (TC −3) |
| `\3;s8` | `00000011` (TC +3) |
| `\-1;s4` | `1111` on `4wire` |
| `\-3` | **Parse error** — use `;sW` |
| `\-3;8` | **Parse error** — use `;s8` for signed |
| `\-3;s4` on `8wire` | **Width error** — pattern is 4 bits, wire is 8 |

In [short notation](short-notation.md):

```
8wire c = `\-3;s8`     →  same as \-3;s8
```

**Disambiguation `;p` vs grouped tag:** a **single** unsigned scalar `\31;8` still uses `;8` as **padding**. A **group** of two or more atoms, or any `;sW` / `;qXpY` / `;ascii` suffix, uses the grouped-literal rules below.

---

## Grouped literals — `\v1 \v2 … ;tag`

A **group** is a whitespace-separated sequence of `\value` atoms with **one suffix** on the last atom that applies **retroactively** to every element:

```logts-play
8wire[4] v = \2 \23 \242 \1;8
show(v)
```

| Suffix | Width | Meaning |
|--------|-------|---------|
| `;M` (digits only, **group** with ≥2 atoms) | M | Unsigned / padding per element |
| `;sM` | M | Signed two's complement per element |
| `;qXpY` | X+Y | Fixed-point QX.Y (e.g. `;q4p4` → 8 bit) |
| `;fp16`, `;bf16` | 16 | IEEE / brain float16 per element |
| `;ascii` | 8 | Byte per element (alias of `;8` in groups) |

Examples:

```logts-play
8wire[4] v = \2 \-1 \5 \0;s8
show(v; signed)
```

```logts-play
8wire[4] v = \2 \-1.5 \0.5 \1;q4p4
show(v; q4p4)
```

```logts-play
16wire w = \65 \66;ascii
show(w; ascii)
```

| Rule | Detail |
|------|--------|
| Single `\N` without suffix | Unchanged — minimal unsigned width |
| `\N \N` without suffix | **Error** — missing width/format tag |
| `\-N;M` (unsigned M) | **Error** — use `;sM` |
| Fractional `\1.5` | Requires `;qXpY`, `;fp16`, or `;bf16` — not plain `;8` / `;s8` |

Concatenation between groups still uses `+`: `\1 \2;8 + ^0F`.

---

## Hex pattern (unsigned) — `^HEX`

Caret starts a **hex pattern**: each hex digit expands to **4 bits**. This is the unsigned bit pattern, not “the number in base 16” with automatic width.

```logts-play
8wire a = ^FF
show(a)
```

```logts-play
4wire n = ^F
show(n)
```

| Form | Bits |
|------|------|
| `^F` | `1111` |
| `^0F` | `00001111` |
| `^FF;8` | `11111111` if already ≥8 bits, else **padding** (unsigned `;p`) |

In short notation, `^` is XOR — use brackets: `` `[^FF]` `` → `^FF` (see [short-notation.md](short-notation.md)).

---

## Hex value signed — `^-HEX;W`

For a **signed numeric value** written in hexadecimal, use a minus **after** `^` and mandatory `;W`:

```logts-play
8wire a = ^-A;8
show(a)
```

| Source | Meaning |
|--------|---------|
| `^-A;8` | Value −10 → `11110110` on 8 bits |
| `^-A` | **Parse error** — missing `;W` |
| `^F` | Still **unsigned pattern** `1111` (not “signed −1”) |

Why not `^-F` without width? A hex **pattern** and a signed **value** are different concepts. Value hex signed always uses `^-HEX;W`.

Short notation:

```
8wire a = `[^-A;8]`
```

---

## Wire string — `"..."` and `'...'`

Double or single quotes delimit an **ASCII wire string**. Each character becomes **8 bits**; characters are packed **MSB-first** (first character = highest byte in the wire).

```logts-play
40wire msg = "Hello"
show(msg)
```

```logts-play
8wire c = 'A'
show(c)
```

Concatenation:

```logts-play
24wire s = "Hi" + "!"
show(s)
```

| Topic | Rule |
|-------|------|
| Width | `N` characters → `N×8` bits; declare `8×N wire` or use `:=` / `=:` |
| Quotes | `"Hello"` and `'Hello'` are equivalent |
| Charset | Code points 0–255 only (Latin-1 / ASCII + extensions) |

### Escapes (inside quotes only)

| Sequence | Byte |
|----------|------|
| `\s` | Space (0x20) |
| `\n` | Line feed (0x0A) |
| `\t` | Tab (0x09) |
| `\r` | Carriage return (0x0D) |
| `\b` | Backspace (0x08) |
| `\0` | NUL (0x00) |
| `\\` | Backslash |
| `\"` / `\'` | Quote character |

```logts-play
16wire line = "a\n"
show(line)
```

**Outside quotes**, `\0` remains the **unsigned decimal literal** zero, not a NUL byte. Context (quotes vs backslash-decimal) disambiguates.

---

## ASCII: literals vs `show(…; ascii)`

Two related features:

| | Wire string `"Hello"` | Tag `show(w; ascii)` |
|--|----------------------|----------------------|
| **Where** | Source code / assignment | Debug output only |
| **Effect** | Builds bits in the circuit | Formats existing bits as `"Hello"` |
| **NUL / control** | Real bytes in the wire | Display glyphs: `◦` `↵` `·` (see [debug.md](debug.md)) |

Example — same bytes, source vs display:

```logts-play
8wire code := 01000001
show(code)          # default hex
show(code; ascii)   # code (8wire) = "A"
```

```logts-play
8wire code := "A"
show(code; ascii)
```

---

## Logic literals — `?…` (MODE ZSTATE)

In **`MODE ZSTATE`**, prefix `?` introduces a literal containing `0`, `1`, `Z`, and `X`:

```logts-play wave
MODE ZSTATE

4wire bus = ?10Z0
show(bus)
```

See [zstate.md](zstate.md). Not available in default wire mode.

---

## Meta constants — `/name/`

Slash-wrapped names refer to compile-time meta constants (e.g. `/instance/` for the current instance id):

```logts
4wire x = /instance/
```

Only in specific contexts (top-level wire init, some attributes). See component and meta-constant documentation.

---

## Bit range on literals

After binary, hex, or decimal literals, use the same `.` syntax as on wires:

```
literal.start-end
literal.start/len
literal./len          # from bit 0
literal.bit           # single bit
```

```logts-play
8wire a = \255.0-3
show(a)
```

```logts-play
8wire b = ^FF.4/4
show(b)
```

Indices are **0-based from the left** (MSB = index 0). If the range exceeds the literal length, only available bits are returned.

---

## Padding `;p` (unsigned only)

Append `;p` to pad an **unsigned** literal to `p` bits with leading zeros:

```logts-play
8wire a = \3;8
show(a)
```

```logts-play
8wire b = ^2;8
show(b)
```

Does **not** apply to signed `\-N;W` / `^-HEX;W` — there `;W` is always TC width.

---

## Initializer `:` (declaration)

On wire declaration, colon init accepts literals only (not arbitrary expressions):

```logts-play
4wire s : \5
show(s)
```

```logts-play
8wire s : ^-A;8
show(s)
```

```logts-play
8wire s : "A"
show(s)
```

---

## Strict width and assignment

With `=` (strict), the **evaluated bit length** must match the wire. Literals produce a fixed width:

| Literal | Bits produced |
|---------|----------------|
| `1010` | 4 |
| `\255` | 8 (minimal binary of 255) |
| `\-3;8` | 8 (from `;8`, not from wire type) |
| `^FF` | 8 |
| `^-A;8` | 8 |
| `"Hello"` | 40 |

Use `:=` or `=:` when you intentionally pad or truncate; see [assignment-operators.md](assignment-operators.md).

---

## Large decimals and `show(…; dec)` round-trip

Decimal literals use **BigInt** internally (not JavaScript `Number` / `parseInt`), so values far above `Number.MAX_SAFE_INTEGER` (~9×10¹⁵) are exact — for example `\5216694956355245935;64`.

Wide wires in **`show(w; dec)`** / **`show(w; dec signed)`** are split into **64-bit chunks** (MSB first), then a remainder:

```text
199wire msg =: "Hello\sWorld"
show(msg; dec signed)
→ \5216694956355245935 \8245074968971313152 \0 + \0
  └ 64 bit              └ 64 bit              └ 64 + 7 bit rest
```

You can rebuild the same bits from that output (unsigned chunk values with `;64` padding):

```logts
199wire test = \5216694956355245935;64 + \8245074968971313152;64 + \0;64 + \0;7
```

Each `\N;64` pads the BigInt-derived binary to **at least 64 bits** (left zero-fill). Show chunk values are always below 2⁶⁴, so this matches the displayed unsigned chunk.

**Why 64-bit chunks (not 32)?** Chunk size is only a **display** convention. With BigInt literals, 64-bit chunk values round-trip correctly; 32-bit chunks would mean more tokens on wide buses without fixing the underlying precision issue (`parseInt` / `Number` still break above 2⁵³−1).

For copy-paste of arbitrary wide values without decimal, prefer **`"…"`** wire strings, binary concat, or `probe` / hex display.

---

## Module loading (editor)

Signed decimal, signed hex, and wire strings are implemented in `core/wire-literals.js`. The script editor loads it **before** `parser.js`. If you embed the runtime manually, include the same script order as `run_tests.html`.

---

## See also

- [short-notation.md](short-notation.md) — literals inside `` ` `` and `[^hex]` / `\-N;W` rules
- [debug.md](debug.md) — `show` / `peek` / `probe` tags: `dec`, `signed`, `hex`, `bin`, `ascii`
- [number-conversion.md](number-conversion.md) — runtime conversion functions (N10S2N, etc.), not source literals
- [mem.md](mem.md) — memory initialization with literals
