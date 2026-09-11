# T2NUM (ASCII text → number)

Index: [Number conversion](number-conversion.md) · [Text functions](text-functions.md) · [builtin-functions.md](builtin-functions.md)

Decode **ASCII text** on a wire into a **numeric wire** using the same format tags as [NUM2T](builtin-NUM2T.md). Inverse of `NUM2T` — no **digits** argument; precision comes from the text.

## Signatures

```
T2NUM(Wbit asciiText) -> Wbit value
T2NUM(Wbit asciiText ; q4p4) -> Wbit value
T2NUM(Wbit asciiText ; q8p8) -> Wbit value
T2NUM(Wbit asciiText ; qXpY) -> Wbit value
T2NUM(Wbit asciiText ; fp16) -> Wbit value
T2NUM(Wbit asciiText ; bf16) -> Wbit value
T2NUM(Wbit asciiText ; f32) -> Wbit value
T2NUM(Wbit asciiText ; f64) -> Wbit value
T2NUM(Wbit asciiText ; u8) -> Wbit value
T2NUM(Wbit asciiText ; u16) -> Wbit value
T2NUM(Wbit asciiText ; u32) -> Wbit value
T2NUM(Wbit asciiText ; s8) -> Wbit value
T2NUM(Wbit asciiText ; s16) -> Wbit value
T2NUM(Wbit asciiText ; s32) -> Wbit value
T2NUM(Wbit asciiText ; u8 exact) -> Wbit value
T2NUM(Wbit asciiText ; f64 exact) -> Wbit value
```

Use `doc(T2NUM)` for the live list from `Interpreter.BUILTIN_DOC`.

## Arguments

| Arg | Meaning |
|-----|---------|
| **asciiText** | Wire of ASCII bytes (`0`/`1`, length **multiple of 8**). Trailing `\0` ignored (same rule as parser wire decode). String literals allowed (`"10"`, `"1.5"`, `"-4"`). |

**Format tag (required):** exactly one tag after `;` — same set as `NUM2T` (`q4p4`, `f32`, `f64`, `u8`, `s16`, …). Optional second tag: **`exact`**.

| Tag | Meaning |
|-----|---------|
| *(default)* | **Saturate** out-of-range values to the format min/max; **round** inexact values to the nearest representable encoding. |
| **`exact`** | Runtime error if conversion would **overflow** (before saturate) or be **inexact** (text has more precision than the format allows). |

**Not supported:** `; vector`, `; matrix`.

Operands must be strict binary (`0`/`1`) in `MODE ZSTATE`.

## Result

- Output width is fixed by the format tag (e.g. **8** for `; u8`, **32** for `; f32`).
- Inspect with `show(v; u8)` or tagged `show(v; q4p4)`.

## Parse and encode rules

| Rule | Behaviour |
|------|-----------|
| Valid text | Decimal integer or float (`10`, `1.5`, `-4`, `.5`, optional exponent). |
| Rejected text | `nan`, `inf`, `-inf`, non-numeric → *invalid numeric text*. |
| Out of range | Default: **saturate** (e.g. `"999"` + `; u8` → **255**). |
| Inexact | Default: round to nearest representable (e.g. `"2.44543"` + `; q4p4`). |
| **`exact`** | Error *cannot decode input value: overflow* or *… inexact*. |

Round-trip: `T2NUM(NUM2T(x, d; fmt), fmt)` ≈ `x` when the text matches what `NUM2T` would emit.

## Examples

### Unsigned integer

```logts-play
16wire text = "10"
8wire v = T2NUM(text; u8)
show(v; u8)
```

**Load & Run:** `10`.

### Saturate vs exact

```logts-play
24wire text = "999"
8wire v = T2NUM(text; u8)
show(v; u8)
```

**Load & Run:** `255` (saturate, not wrap).

With `; u8 exact` → runtime error (*cannot decode input value: overflow*).

### Q4.4

```logts-play
24wire text = "1.5"
8wire v = T2NUM(text; q4p4)
show(v; q4p4)
```

**Load & Run:** `1.5`.

### Signed integer

```logts-play
16wire text = "-4"
8wire v = T2NUM(text; s8)
show(v; s8)
```

**Load & Run:** `-4`.

## doc()

```
doc(T2NUM)
```

## See also

[TISNUM](builtin-TISNUM.md) · [builtin-NUM2T.md](builtin-NUM2T.md) · [number-conversion.md](number-conversion.md) · [text-functions.md](text-functions.md)
