# Short Notation

Short notation allows writing logical expressions in a compact way, using symbolic operators instead of explicit function calls.

The short notation zone is delimited by **backticks** (`` ` ``). Everything between two backticks is automatically expanded into standard function calls before tokenization.

```
`short expression`  →  expanded into function calls
```

---

## Operators

| Operator | Function | Type        |
|----------|----------|-------------|
| `&`      | AND      | prefix/infix |
| `\|`     | OR       | prefix/infix |
| `^`      | XOR      | prefix/infix |
| `=`      | EQ       | infix        |
| `!`      | NOT      | prefix       |
| `-&`     | NAND     | prefix/infix |
| `-\|`    | NOR      | prefix/infix |
| `-^`     | NXOR     | prefix/infix |
| `+`      | concat   | infix        |

**Prefix** = operator appears before the operand, with a single argument.  
**Infix** = operator appears between two operands, with two arguments.

`+` joins multi-bit segments inside one backtick zone. It has **lower precedence** than boolean operators (`&`, `|`, `^`, …): `` `a & b + c & d` `` → `AND(a,b) + AND(c,d)`.

---

## AND (`&`)

Applies the AND function to one or two operands.

### Prefix (one operand)

```
`& a`          →  AND(a)
`& a.0/4`      →  AND(a.0/4)
```

`AND(a)` with a single argument applies AND across all bits of `a`, yielding one bit.  
`AND(a.0/4)` applies AND across bits 0–3 (4 bits starting at position 0) of `a`.

### Infix (two operands)

```
`a & b`        →  AND(a,b)
```

`AND(a,b)` applies AND bit-by-bit between `a` and `b`.

---

## OR (`|`)

Applies the OR function to one or two operands.

### Prefix

```
`| a`          →  OR(a)
`| a.0-3`      →  OR(a.0-3)
```

`OR(a)` with a single argument applies OR across all bits, yielding one bit (1 if at least one bit is 1).

### Infix

```
`a | b`        →  OR(a,b)
```

`OR(a,b)` applies OR bit-by-bit between `a` and `b`.

---

## XOR (`^`)

Applies the XOR function to one or two operands.

### Prefix

```
`^ a`          →  XOR(a)
`^ a.0-3`      →  XOR(a.0-3)
```

`XOR(a)` with a single argument applies XOR across all bits (parity — 1 if the number of 1-bits is odd).

### Infix

```
`a ^ b`        →  XOR(a,b)
```

`XOR(a,b)` applies XOR bit-by-bit between `a` and `b`.

**Note:** `^` in short notation is always XOR, not a hex literal. For hex, use `[^FF]` (see Literals section).

---

## EQ (`=`)

Compares two operands bit-by-bit. Yields one bit: 1 if equal, 0 if not.

```
`a = b`        →  EQ(a,b)
```

**Note:** `=` is EQ only inside backticks. Outside backticks, `=` remains the assignment operator.

---

## NOT (`!`)

Inverts all bits of the operand.

```
`!a`           →  !a
`!a.0/4`       →  !a.0/4
`!(a | b)`     →  !OR(a,b)
```

`!` also works outside backticks (it is natively supported in the language). Inside short notation it can be combined with parentheses: `!(a | b)` inverts the result of the OR.

---

## NAND (`-&`)

AND inverted — result is NOT(AND(operands)).

### Prefix

```
`-& a`         →  NAND(a)
```

### Infix

```
`a -& b`       →  NAND(a,b)
```

---

## NOR (`-|`)

OR inverted — result is NOT(OR(operands)).

### Prefix

```
`-| a`         →  NOR(a)
`-| b.1/3`     →  NOR(b.1/3)
```

### Infix

```
`a -| b`       →  NOR(a,b)
```

---

## NXOR (`-^`)

XOR inverted (equivalence) — yields 1 if bits are equal.

### Prefix

```
`-^ a`         →  NXOR(a)
```

### Infix

```
`a -^ b`       →  NXOR(a,b)
```

---

## Parentheses and grouping

Round parentheses `()` group sub-expressions. Evaluation is **left-to-right** with no operator precedence.

```
`(a | b) & c`              →  AND(OR(a,b),c)
`(a | b) & (c | d)`        →  AND(OR(a,b),OR(c,d))
`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`
                            →  AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))
```

### Left-to-right chaining

When multiple operators are chained without parentheses, evaluation is left-to-right:

```
`a | b | c`                →  OR(OR(a,b),c)
`a & b & c`                →  AND(AND(a,b),c)
```

---

## Mixed expressions

Prefix and infix operators can be combined. The prefix applies to the next atom, then the result participates as an operand in the infix expression:

```
`& a -| b`                 →  NOR(AND(a),b)
```

Step by step:
1. `& a` → `AND(a)` (prefix AND on `a`)
2. `AND(a) -| b` → `NOR(AND(a),b)` (infix NOR between AND result and `b`)

Another example:

```
`& (a | b)`                →  AND(OR(a,b))
```

1. `(a | b)` → `OR(a,b)` (grouping with parentheses)
2. `& OR(a,b)` → `AND(OR(a,b))` (prefix AND on OR result)

---

## Literals

### Binary literals

Work directly as operands, without special delimiters:

```
`^ 111`                    →  XOR(111)
`a & 1010`                 →  AND(a,1010)
`a | 1010 | 111`           →  OR(OR(a,1010),111)
```

### Hex literals — `[^hex]`

Because `^` is the XOR operator in short notation, hex literals must be enclosed in square brackets `[]`:

```
`^ [^F]`                   →  XOR(^F)
`a | [^FF]`                →  OR(a,^FF)
`a | [^FF] | 111`          →  OR(OR(a,^FF),111)
```

Square brackets are delimiters — they are stripped during expansion, and the content reaches the tokenizer as-is.

### Decimal literals — `[\dec]`

Decimal literals (with `\`) can be used directly or inside `[]`:

```
`a | \31`                  →  OR(a,\31)
`a | [\31]`                →  OR(a,\31)
`a | [^FF] | [\31]`        →  OR(OR(a,^FF),\31)
```

#### Signed decimal `\-N;W`

Signed decimal literals require an **explicit width** after `;` (two's complement on exactly `W` bits). The `;W` suffix is **width**, not padding (unlike unsigned `\31;8`).

```
8wire a = `\-3;8`           →  8wire a = \-3;8
`a | \-3;8`                →  OR(a,\-3;8)
`\-3` without `;W`         →  parse error
```

### Signed value hex — `[^-HEX;W]`

In short notation, `^` outside `[]` is XOR — signed **value** hex uses brackets like unsigned hex:

```
8wire a = `[^-A;8]`         →  8wire a = ^-A;8
`a | [^-A;8]`               →  OR(a,^-A;8)
`^-A;8` in backticks        →  INVALID (parsed as XOR) — use [^-A;8]
```

`^-HEX;W` without brackets works in normal (non-backtick) expressions.

### Wire string literals — `"..."` / `'...'`

Both quote styles are equivalent. Each character → 8 bits (MSB-first), unsigned ASCII:

```
40wire msg = `"Hello"`
msg = `"Hi" + "\s" + "!"`    # \s = explicit space
72wire q = `"Question\nAnswers:"`
```

Escapes inside quotes only: `\s` `\n` `\t` `\r` `\b` `\0` `\\` `\"` `\'`.

---

## Bit range on literals

Both binary (`\N`) and hex (`^N`) literals support bit-range extraction directly, using the same `.` syntax used on variables.

### Syntax

```
literal.start-end       # bits from index start to end (inclusive)
literal.start/len       # len bits starting at index start
literal./len            # len bits starting at index 0 (shorthand)
literal.bit             # single bit at index bit
```

Bit indices are **0-based from the left** (MSB = index 0).

### Binary literal examples

```
\12 = 1100  (4 bits, decimal 12)

3wire c = \12.0-2        # bits 0–2 of 1100 → 110
3wire d = \12./3         # first 3 bits of 1100 → 110  (shorthand for .0/3)
3wire e = \12.1-3        # bits 1–3 of 1100 → 100
1wire f = \12.0          # bit 0 of 1100 → 1
```

### Hex literal examples

```
^f  = 1111  (4 bits, hex F)
^0f = 00001111  (8 bits, hex 0F)

4wire a = ^f./4          # first 4 bits of 1111 → 1111
3wire b = ^f.0-2         # bits 0–2 of 1111 → 111
4wire c = ^0f.4-7        # bits 4–7 of 00001111 → 1111
8wire d = ^0f./8         # first 8 bits of 00001111 → 00001111
```

### Use in expressions

Literal bit-ranges can be combined with `+` (concatenation) or used as arguments to functions:

```
# Concatenate two 8-bit slices into a 16-bit wire
16wire e = \192./8 + ^0f./8
# \192 = 11000000, ^0f = 00001111
# result: 1100000000001111

# Use as function argument
1wire p = OR(\255./8)    # OR across all 8 bits of 11111111 → 1

# Mix with variables
8wire q = data./4 + \0./4    # upper nibble of data, lower nibble = 0000
```

### Notes on bit range

- `\N` is converted to binary first (e.g. `\12` → `1100`), then the bit range is applied.
- `^N` is converted to binary first (e.g. `^f` → `1111`, `^ff` → `11111111`), then the bit range is applied.
- The shorthand `./len` is equivalent to `.0/len` — start is always 0.
- If the requested range exceeds the literal's length, only the available bits are returned.
- Bit-range on literals works **outside** short notation too (anywhere an expression is accepted):

```
3wire c = \12.0-2          # outside backticks — works
3wire d = `\12 & 111`      # inside backticks — works (no bitrange needed here)
```

---

## Padding operator `;p`

The `;p` operator pads a value to `p` bits by adding zeroes on the left (`padStart`). It can be applied to literals and variables, optionally combined with a bit range.

**Signed literals:** on `\-N;W` and `^-HEX;W`, the `;W` suffix is **always** two's-complement width (not padding). Unsigned `\N;8` and `^F;8` keep the padding meaning above.

### Syntax

```
value;p                 # pad value to p bits
value.bitrange;p        # extract bit range, then pad to p bits
```

If the value is already `p` bits or longer, no change is made (no truncation).

### Binary literal with padding

```
\12;8    →  00001100   (\12 = 1100, padded to 8 bits)
\3;8     →  00000011   (\3  = 11,   padded to 8 bits)
\255;4   →  11111111   (already 8 bits, no truncation)
```

### Hex literal with padding

```
^2;8     →  00000010   (^2  = 0010, padded to 8 bits)
^f;8     →  00001111   (^f  = 1111, padded to 8 bits)
^ff;16   →  0000000011111111
```

### Bit range combined with padding

```
\12.0-2;8    →  00000110   (bits 0–2 of 1100 = 110, padded to 8)
\12./3;8     →  00000110   (first 3 bits = 110, padded to 8)
^0f.4-7;8   →  00001111   (bits 4–7 of 00001111 = 1111, padded to 8)
```

### Variables with padding

```
1wire aa = 1
8wire b = aa;8          # 00000001

8wire data = 11001100
8wire c = data.0-3;8    # bits 0–3 = 1100, padded to 8 → 00001100
```

### Expressions combining padded values

The primary use case is building multi-bit values from smaller parts using `+` (concatenation):

```
16wire df = \12;8 + ^2;8
# \12;8 = 00001100
# ^2;8  = 00000010
# df    = 0000110000000010
```

This is equivalent to:

```
8wire  tmp1 = \12
8wire  tmp2 = ^2
16wire df   = tmp1 + tmp2
```

### In short notation

`;p` works inside backticks. Note that hex literals inside backticks must use `[^hex]` syntax (because `^` is the XOR operator):

```
8wire sn = `\12;8 & [^ff]`
# expands to: AND(00001100, 11111111) = 00001100
```

### Components and PCB instances with padding

The `;p` operator works on component property reads, direct component access, and PCB instance outputs:

```
# Built-in component property
.mem:get;8          # pad memory read (4 bits) to 8 bits
.mem:get.0-1;8      # bits 0–1 of memory read, then pad to 8

# PCB pout
.myPcb:val;8        # pad PCB pout to 8 bits
.myPcb:val.0-3;8    # bits 0–3 of PCB pout, then pad to 8

# PCB direct return value
.myPcb;8            # pad PCB return value to 8 bits
.myPcb.0-3;8        # bits 0–3 of PCB return value, then pad to 8
```

Example — extract and pad a PCB output:

```
pcb +[alu]:
  1pin set
  4pout result
  exec: set
  on:1

  result = 1010
  :4bit result

pcb [alu] .a::

.a:{ set = 1 }

8wire x = .a:result;8    # 1010 padded to 8 bits → 00001010
8wire y = .a;8           # same via direct return → 00001010
8wire z = .a:result.0-1;8  # bits 0–1 = 10, padded to 8 → 00000010
```

### Notes on padding

- Padding uses `padStart(p, '0')` — zeroes are added on the **left**.
- If `value.length >= p`, the value is returned unchanged (no truncation occurs).
- Padding is applied **after** bit range extraction: first bits are selected, then the result is padded.
- After padding, the value has no storage reference (`ref = null`) — it is a computed value.
- On PCB pouts without padding, the storage reference is preserved; padding breaks the reference (computed value only).

---

## Usage in context

Short notation can be used anywhere an expression appears in source code.

### In variable declarations

```
8wire c = `& (a | b)`
```

Expands to:

```
8wire c = AND(OR(a,b))
```

### In assignments

```
e = `(a.0/4 | b.0/4)`
```

Expands to:

```
e = OR(a.0/4,b.0/4)
```

### In function definitions (def)

```
def q(8bit a, 8bit b):
   :4bit `(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`
   :1bit `& (a | b)`
```

Expands to:

```
def q(8bit a, 8bit b):
   :4bit AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))
   :1bit AND(OR(a,b))
```

### Concatenation (`+`) inside one backtick zone

Use `+` between parenthesized segments to build a multi-bit value in a single short-notation zone:

```
`(0) + (1) + (1) + (0)`              →  0 + 1 + 1 + 0
`(0110) + ((!C.4) | (A.4 & B))`      →  0110 + OR(!C.4,AND(A.4,B))
`(a | b) + (c | d)`                  →  OR(a,b) + OR(c,d)
```

Extra parentheses for grouping are allowed (including around the whole concat or individual segments):

```
`((0110) + ((!C.4) | (A.4 & B)))`    →  0110 + OR(!C.4,AND(A.4,B))
`((a | b) & c)`                      →  AND(OR(a,b),c)
```

Boolean operators bind tighter than `+`:

```
`a & b + c & d`   →   AND(a,b) + AND(c,d)
```

### Multiple backtick zones on the same line

Backticks delimit independent zones. They can be combined with `+` (concatenation):

```
`a & b` + `c | d`
```

Expands to:

```
AND(a,b) + OR(c,d)
```

### Combination with loop

Short notation works together with `loop` blocks. The `?` placeholder is expanded by the loop preprocessor after short notation has been processed:

```
loop 1..3[
   :1bit `a.? | b.?`
]
```

Expands to:

```
   :1bit OR(a.1,b.1)
   :1bit OR(a.2,b.2)
   :1bit OR(a.3,b.3)
```

---

## Special variables

The language's special variables (`~`, `%`, `$`, `_`) work as operands in short notation:

```
`~ & a`                    →  AND(~,a)
`a | %`                    →  OR(a,%)
```

---

## Vector element access

Vector element syntax passes through unchanged inside backticks (same as plain wire bit ranges):

```
4wire y = `vectorA:0 & vectorA:1`
4wire z = `vectorA:1.0/2 | 11`
```

| In backticks | Expands to |
|--------------|------------|
| `` `vectorA:0` `` | `vectorA:0` |
| `` `vectorA:1.0/2` `` | `vectorA:1.0/2` |
| `` `vectorA:0 \| vectorA:1` `` | `OR(vectorA:0,vectorA:1)` |

Requires the vector to be declared in normal script (`4wire[3] vectorA`). Dynamic index `` `vectorA:(idx)` `` is not supported in short notation.

---

## Limitations

- `^` inside backticks is always **XOR**. For hex literals, use `[^FF]`.
- `()` inside backticks are for **grouping**, not dynamic bit ranges. Expressions like `a.(expr)/4` are not supported in short notation.
- Dynamic vector index `` `vectorA:(wire)` `` is not supported in short notation (static `:0`, `:1`, … only).
- Backticks cannot be nested (a backtick closes the zone opened by the previous one).
- Backticks inside comments (`#` or `#> ... #<`) are ignored.
