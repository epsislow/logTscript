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

**Prefix** = operator appears before the operand, with a single argument.  
**Infix** = operator appears between two operands, with two arguments.

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

### Multiple backtick zones on the same line

Backticks delimit independent zones. They can be combined with `+` (concatenation):

```
`a & b` + `c | d`
```

Expands to:

```
AND(a,b) + OR(c,d)
```

### Combination with repeat

Short notation works together with `repeat` blocks. The `?` placeholder is expanded by repeat after short notation has been processed:

```
repeat 1..3[
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

## Limitations

- `^` inside backticks is always **XOR**. For hex literals, use `[^FF]`.
- `()` inside backticks are for **grouping**, not dynamic bit ranges. Expressions like `a.(expr)/4` are not supported in short notation.
- Backticks cannot be nested (a backtick closes the zone opened by the previous one).
- Backticks inside comments (`#` or `#> ... #<`) are ignored.
