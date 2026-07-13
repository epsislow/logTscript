# Protocol — `mode: parse`

Sequential **field extraction** from a bitstream. The parse cursor walks `data` (or `stream`) and verifies literals, reads fields, and optionally builds a **parseView** tree.

Hub: [protocol.md](protocol.md). Related: [protocol-tentative.md](protocol-tentative.md), [protocol-repeat.md](protocol-repeat.md).

---

## Invoke

```logts-play legacy
inline [protocol] .parseHdr:
  mode: parse
  out:
    magic 8b
    len 16b
  :

24wire out = .parseHdr { data = 01001000 + 00000000 + 00010000 }
show(out)
```

| Parameter | Role |
|-----------|------|
| `data` | Full packet bitstream (default) |
| `stream` | Alias for `data` in some generators |

Output wire width may be **dynamic** when sections repeat or use `rest ~`. Use `=:` when the declared wire is wider than extracted fields.

---

## Literals vs fields

| Line in `def` / `out` | Parse behaviour |
|-----------------------|-----------------|
| `0101` | Verify bits; **not** in output blob |
| `kind 8b` | Read 8 bits into field `kind`; **in** output blob |
| `rest ~` | Consume all remaining bits (last segment only) |
| `rest -4b` | Consume `remaining − 4`, leave footer |

---

## Wire literals in parse protocol

Protocol lines accept a **subset** of [wire-literals.md](wire-literals.md):

| Form | Example | Notes |
|------|---------|-------|
| Binary | `01010101` | as today |
| Wire string | `"true"`, `"{"`, `'x'` | 8 bits per character |
| Decimal pad | `\123;8` | unsigned, fixed width |
| Hex pad | `^7B;8` | pad to width |
| Hex short | `^7B` | minimal width (no pad) |
| Decimal short | `\10` | minimal unsigned width |

```logts-play legacy
inline [protocol] .litDemo:
  mode: parse
  out:
    "Hi"
  :

16wire chk =: .litDemo { data = 01001000 + 01101001 }
show(chk)
```

Use **local `def` wrappers** for tentative string choice (`trueLit?` / `falseLit?`) — literal lines cannot take `?` directly.

---

## Attributes (parse)

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `parseView` | `tree`, `true` | Structured `show()` + `wire:section:field` access |
| `parseResult` | `all`, `collapseOnly` | Include/exclude collapse payload in output |
| `codebookLoad` | `.lutName` | Load LUT from embedded codebook during parse |

---

## Section repeat

For `packet[n]`, `packet*`, anchor footers, and `parsed:packet:0:field`, see **[protocol-repeat.md](protocol-repeat.md)**.
