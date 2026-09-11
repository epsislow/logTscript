# Text functions (ASCII)

Built-ins for **ASCII text on wires** — equality with NUL-aware rules and trimming. Complements bitwise [EQ](builtin-EQ.md) and display tag `ascii` in [debug.md](debug.md).

Index: [builtin-functions.md](builtin-functions.md)

---

## Overview

| Function | Role |
|----------|------|
| [EQT](builtin-EQT.md) | Compare two text blobs; `\0` ignored per call tags → `1bit` |
| [TRIMT](builtin-TRIMT.md) | Remove trim-set characters from a text wire → same width |
| [NUM2T](builtin-NUM2T.md) | Numeric wire → ASCII text (`; f32`, `; u8`, …) |
| [T2NUM](builtin-T2NUM.md) | ASCII text → numeric wire (saturate) |
| [TISNUM](builtin-TISNUM.md) | `1` if `T2NUM` would succeed |

Operands use **8-bit ASCII cells** — wire string literals, **whole wires** (`EQT(a, b)`, `TRIMT(src, " ")`), grouped `\65 \66;ascii`, or assigned wires.

Shared **call tags:** `left`, `right`, `left right`, `any` (default). Tag `any` is mutually exclusive with `left` / `right`.

---

## EQT — quick reference

```
EQT(textA, textB) -> 1bit          # default: strip all \0, then compare
EQT(textA, textB ; right) -> 1bit  # strip trailing \0 only
```

```logts-play
1wire ok = EQT("joe\0", "joe")
show(ok)
```

See [builtin-EQT.md](builtin-EQT.md).

---

## TRIMT — quick reference

```
TRIMT(text, trimSet) -> Wbit       # default: remove all trim-set chars everywhere
TRIMT(text, trimSet ; right) -> Wbit # trim from end (peels trailing \0 first)
```

```logts-play
48wire t = TRIMT("  a  \0", " " ;right)
show(t; ascii)
```

See [builtin-TRIMT.md](builtin-TRIMT.md).

---

## NUM2T — quick reference

```
NUM2T(value, digits ; f64) -> Wbit   # e.g. 64-bit float → "5" or "1.5"
NUM2T(value, digits ; u8) -> Wbit    # integer → "10"
```

```logts-play
32wire v = 00111111110000000000000000000000
24wire t = NUM2T(v, 11; f32)
show(t; ascii)
```

See [builtin-NUM2T.md](builtin-NUM2T.md) · [number-conversion.md](number-conversion.md).

---

## T2NUM — quick reference

```
T2NUM(text ; u8) -> Wbit        # "10" → 8-bit value 10
T2NUM(text ; u8 exact) -> Wbit  # error on overflow/inexact
```

```logts-play
24wire text = "999"
8wire v = T2NUM(text; u8)
show(v; u8)
```

See [builtin-T2NUM.md](builtin-T2NUM.md) · [builtin-TISNUM.md](builtin-TISNUM.md).

---

## Related

| Topic | Page |
|-------|------|
| Wire string literals | [wire-literals.md](wire-literals.md) |
| Logic `text` pins | [comp-logic.md](comp-logic.md) |
| `show(…; ascii)` | [debug.md](debug.md) |
