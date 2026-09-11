# TISNUM (is ASCII text a valid T2NUM input?)

Index: [Number conversion](number-conversion.md) · [Text functions](text-functions.md) · [builtin-functions.md](builtin-functions.md)

Predicate companion to [T2NUM](builtin-T2NUM.md): same decode/encode checks, **never throws** on conversion failure — returns **`1`** or **`0`**.

## Signatures

```
TISNUM(Wbit asciiText ; q4p4) -> 1bit
TISNUM(Wbit asciiText ; f32) -> 1bit
TISNUM(Wbit asciiText ; f64) -> 1bit
TISNUM(Wbit asciiText ; u8) -> 1bit
TISNUM(Wbit asciiText ; s8) -> 1bit
TISNUM(Wbit asciiText ; u8 exact) -> 1bit
TISNUM(Wbit asciiText ; f64 exact) -> 1bit
```

Use `doc(TISNUM)` for the live list from `Interpreter.BUILTIN_DOC`.

## Arguments

Same as [T2NUM](builtin-T2NUM.md):

| Arg | Meaning |
|-----|---------|
| **asciiText** | ASCII wire (length **multiple of 8**; trailing `\0` ignored) or string literal. |

**Format tag (required):** one format tag after `;`. Optional **`exact`** — same semantics as `T2NUM`.

## Result

| Value | Meaning |
|-------|---------|
| **`1`** | `T2NUM` with the **same tags** would succeed. |
| **`0`** | `T2NUM` would fail (invalid text, `nan`/`inf`, wire length ≢ 0 mod 8, or `exact` violation). |

Never throws on parse/overflow/inexact — only on `MODE ZSTATE` non-binary operands (same as other built-ins).

## Examples

```logts-play
16wire text = "10"
1wire ok = TISNUM(text; u8)
show(ok)
```

**Load & Run:** `1`.

```logts-play
24wire text = "999"
1wire ok = TISNUM(text; u8 exact)
show(ok)
```

**Load & Run:** `0` (`T2NUM` would overflow under `exact`).

```logts-play
24wire text = "abc"
1wire ok = TISNUM(text; u8)
show(ok)
```

**Load & Run:** `0`.

## doc()

```
doc(TISNUM)
```

## See also

[builtin-T2NUM.md](builtin-T2NUM.md) · [builtin-NUM2T.md](builtin-NUM2T.md) · [number-conversion.md](number-conversion.md)
