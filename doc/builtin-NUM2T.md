# NUM2T (number → ASCII text)

Index: [Number conversion](number-conversion.md) · [Text functions](text-functions.md) · [builtin-functions.md](builtin-functions.md)

Encode a **numeric wire** as human-readable **ASCII text** on a wire (8-bit cells). Inverse direction: [T2NUM](builtin-T2NUM.md) · [TISNUM](builtin-TISNUM.md).

Used by the calc REPL to print `replResult` on a terminal: `NUM2T(replResult, digits3; f64)`.

## Signatures

```
NUM2T(Wbit value, Nbit digits) -> Wbit text
NUM2T(Wbit value, Nbit digits ; q4p4) -> Wbit text
NUM2T(Wbit value, Nbit digits ; q8p8) -> Wbit text
NUM2T(Wbit value, Nbit digits ; qXpY) -> Wbit text
NUM2T(Wbit value, Nbit digits ; fp16) -> Wbit text
NUM2T(Wbit value, Nbit digits ; bf16) -> Wbit text
NUM2T(Wbit value, Nbit digits ; f32) -> Wbit text
NUM2T(Wbit value, Nbit digits ; f64) -> Wbit text
NUM2T(Wbit value, Nbit digits ; u8) -> Wbit text
NUM2T(Wbit value, Nbit digits ; u16) -> Wbit text
NUM2T(Wbit value, Nbit digits ; u32) -> Wbit text
NUM2T(Wbit value, Nbit digits ; s8) -> Wbit text
NUM2T(Wbit value, Nbit digits ; s16) -> Wbit text
NUM2T(Wbit value, Nbit digits ; s32) -> Wbit text
```

Use `doc(NUM2T)` for the live list from `Interpreter.BUILTIN_DOC`.

## Arguments

| Arg | Meaning |
|-----|---------|
| **value** | Operand wire — width must match the format tag (e.g. **8** for `; q4p4`, **32** for `; f32`, **8** for `; u8`). |
| **digits** | **Binary** wire holding an unsigned integer: max **decimal places after the dot** for floats and Q formats (truncation toward zero, trailing zeros stripped). For integer formats (`u8`, `s16`, …) the text is always integer — `digits` is still required but only affects float/Q paths. |

**Format tag (required):** exactly one tag after `;` — same family as [NFORMAT](builtin-NFORMAT.md) / tagged arithmetic (`q4p4`, `f32`, `u8`, `s16`, …). Omitting the tag → runtime error *Number format not specified*.

**Not supported:** `; vector`, `; matrix`.

Operands must be strict binary (`0`/`1`) in `MODE ZSTATE`.

## Result

- Output is **ASCII bytes** on a wire — **minimal width** = `8 × character_count` (no NUL terminator unless the formatted text includes one).
- Inspect with `show(t; ascii)` or append to a terminal component.
- Assign to a wider wire with `:=` / `=:` if needed.

## Format behaviour

| Tag | Operand width | Text shape |
|-----|---------------|------------|
| `q4p4`, `q8p8`, `qXpY` | Q width | Decimal string; fractional digits capped by **digits** |
| `fp16`, `bf16`, `f32`, `f64` | 16 / 16 / 32 / 64 | Decimal string; fractional digits capped by **digits** |
| `u8`, `u16`, `u32` | 8 / 16 / 32 | Decimal integer (`10` → `"10"`) |
| `s8`, `s16`, `s32` | 8 / 16 / 32 | Signed decimal integer (`-4` → `"-4"`) |

Special float text: `nan`, `inf`, `-inf`; `-0` may appear as `-0` or trimmed per digit count.

## Examples

### Q4.4 — one fractional digit

```logts-play
8wire q = 00100000
8wire t = NUM2T(q, 1; q4p4)
show(t; ascii)
```

**Load & Run:** `"2"` (Q4.4 value 2.0).

### Q4.4 — three fractional digits (truncate)

```logts-play
8wire q = 00011000
24wire t = NUM2T(q, 11; q4p4)
show(t; ascii)
```

**Load & Run:** `"1.5"`.

### IEEE `f32`

```logts-play
32wire v = 00111111110000000000000000000000
24wire t = NUM2T(v, 11; f32)
show(t; ascii)
```

**Load & Run:** `"1.5"`.

### Unsigned / signed integers

```logts-play
8wire n = 00001010
16wire t = NUM2T(n, 1; u8)
show(t; ascii)
```

```logts-play
8wire n = 11111100
16wire t = NUM2T(n, 1; s8)
show(t; ascii)
```

**Load & Run:** `"10"` and `"-4"`.

### REPL result line (wave)

```logts
64wire replResult = …
11wire digits3 = \3;11
8wire resultText = NUM2T(replResult, digits3; f64)
```

Wire `digits3` holds binary `11` (= 3 decimal places). See [calc-parser-interp-e2e.md](calc-parser-interp-e2e.md).

## doc()

```
doc(NUM2T)
```

## Inverse: T2NUM / TISNUM

See [builtin-T2NUM.md](builtin-T2NUM.md) (ASCII wire → numeric wire, saturate) and [builtin-TISNUM.md](builtin-TISNUM.md) (predicate, no throw).

## See also

[number-conversion.md](number-conversion.md) · [builtin-NFORMAT.md](builtin-NFORMAT.md) · [text-functions.md](text-functions.md) · [arithmetic.md](arithmetic.md)
