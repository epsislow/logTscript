# Built-in bit transform functions

Shift, rotate, and reverse operations on bit strings.

Index: [builtin-functions.md](builtin-functions.md) · [Tagged built-ins](builtin-tagged-index.md) · Short notation (`<`, `>`): [short-notation.md](short-notation.md)

---

## Functions in this hub

| Function | Page | Tags |
|----------|------|------|
| LSHIFT | [builtin-LSHIFT.md](builtin-LSHIFT.md) | `vector` |
| RSHIFT | [builtin-RSHIFT.md](builtin-RSHIFT.md) | `signed`, `vector` |
| LROTATE | [builtin-LROTATE.md](builtin-LROTATE.md) | `vector` |
| RROTATE | [builtin-RROTATE.md](builtin-RROTATE.md) | `vector` |
| REVERSE | [builtin-REVERSE.md](builtin-REVERSE.md) | `vector` |

---

## Quick reference

**LSHIFT** — logical left; optional third arg **`fill`** (default `0`); width grows. Vector: scalar count only. Sugar: `data < n`.

**RSHIFT** — logical right; optional **`fill`**; same width. With **`; signed`**, ASHR (`fill` ignored). Vector: scalar or **`Kbit[n]`** count. Sugar: `data > n`.

**REVERSE** — MSB ↔ LSB within each operand.

**LROTATE** / **RROTATE** — circular rotate; `count` taken modulo width.

Vector mode: per-element operation; shift/rotate **count** is usually a scalar broadcast (see each page). `RSHIFT` may use per-index `Kbit[n]` counts.

```logts-play
4wire neg = 1111
4wire log = RSHIFT(neg, 1)
4wire arith = RSHIFT(neg, 1; signed)
show(log)
show(arith)
```

`1111` logical → `0111`; arithmetic → `1111`.

Use `doc(LSHIFT)` … `doc(RROTATE)` for live signatures from `Interpreter.BUILTIN_DOC`.
