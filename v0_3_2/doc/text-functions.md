# Text functions (ASCII)

Built-ins for **ASCII text on wires** — equality with NUL-aware rules and trimming. Complements bitwise [EQ](builtin-EQ.md) and display tag `ascii` in [debug.md](debug.md).

Index: [builtin-functions.md](builtin-functions.md)

---

## Overview

| Function | Role |
|----------|------|
| [EQT](builtin-EQT.md) | Compare two text blobs; `\0` ignored per call tags → `1bit` |
| [TRIMT](builtin-TRIMT.md) | Remove trim-set characters from a text wire → same width |

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

## Related

| Topic | Page |
|-------|------|
| Wire string literals | [wire-literals.md](wire-literals.md) |
| Logic `text` pins | [comp-logic.md](comp-logic.md) |
| `show(…; ascii)` | [debug.md](debug.md) |
