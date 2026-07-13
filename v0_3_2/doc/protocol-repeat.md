# Protocol — section repetition

Repeat local `def` sections in **`mode: parse`** protocols. Syntax attaches to the section name (not to individual fields).

Requires [`mode: parse`](protocol-parse.md). For optional branches without repeat counts, see [protocol-tentative.md](protocol-tentative.md).

---

## Syntax

| Form | Meaning |
|------|---------|
| `packet[3]` | exactly 3 times |
| `packet[1-3]` | between 1 and 3 (greedy: try max first) |
| `packet[0-]` | zero or more until anchor or EOF |
| `packet*` | sugar for `packet[0-]` |
| `packet+` | sugar for `packet[1-]` |
| `data1[1-3]?` | tentative choice branch with its own repeat |

Invalid: `[-]`, `[-3]`, `*?`, `+?`, `name?[3]` (`?` must follow the repeat spec).

---

## Exact repeat — `packet[2]`

```logts-play legacy
inline [protocol] .repeatExact:
  mode: parse
  def packet:
    kind 8b
  out:
    packet[2]
  :

16wire out = .repeatExact { data = 10101010 + 11001100 }
show(out)
```

---

## Bounded range — greedy max-first

`packet[1-2]` accepts one or two packets; the parser tries two first.

```logts-play legacy
inline [protocol] .repeatPv:
  mode: parse
  parseView: tree
  def packet:
    kind 8b
  out:
    packet[1-2]
  :

16wire parsed = .repeatPv { data = 11110000 + 00001111 }
8wire k0 = parsed:packet:0:kind
8wire k1 = parsed:packet:1:kind
show(k0)
show(k1)
```

parseView indexes are **0-based** (`packet[0]` in `show`, `parsed:packet:0:kind` in field access).

---

## Composing with tentative

Different repeat specs per choice branch:

```logts-play legacy
inline [protocol] .repeatChoice:
  mode: parse
  def data1:
    kind 8b
  def data2:
    idx 3b
    1
    short 4b
  out:
    data1[1-2]?
    data2[2]?
  :

16wire a = .repeatChoice { data = 11111111 + 00000000 }
16wire b = .repeatChoice { data = 10110101 + 10110101 }
show(a)
show(b)
```

| Pattern | Mechanism |
|---------|-----------|
| `foo?` | optional **choice** branch — 0 or 1 alternative in a group |
| `foo[0-1]` | **sequential** optional — 0 or 1 occurrence, independent of other sections |
| `data1[1-3]?` | choice + repeat on that branch |

### Sequential `[0-1]` — independent optionals

Unlike `?` choice groups, each `[0-1]` section is parsed **in order** and may be omitted independently:

```logts-play legacy
inline [protocol] .seq01:
  mode: parse
  def dataA:
    x 4b
  def dataB:
    y 4b
  def dataC:
    z 4b
  out:
    dataA[0-1]
    dataB[0-1]
    dataC[0-1]
  :

8wire out = .seq01 { data = 1010 + 0101 }
show(out)
```

See also [protocol-tentative.md](protocol-tentative.md) for the full `?` vs `[0-1]` table.

---

## Anchor footer — `cell[0-]` + literal

Unbounded repeat stops before a mandatory follower on the next line. The anchor literal is consumed from the stream but **not** included in the output wire (delimiter only).

```logts-play legacy
inline [protocol] .repeatAnchor:
  mode: parse
  def cell:
    x 4b
  out:
    cell[0-]
    1111
  :

8wire out = .repeatAnchor { data = 1010 + 0101 + 1111 }
show(out)
```

Payload: `10100101` (8 bits). Footer `1111` delimits the repeat region.

---

## parseView tree

With `parseView: tree`, repeated sections appear as `packet[0]`, `packet[1]`, … in `show(parsed)`.

Flat `ParseFields` keeps the **last** iteration per field name; full history lives in parseView only.

---

## Related

- [protocol.md](protocol.md) — hub, `mode: parse`, `rest`
- [protocol-tentative.md](protocol-tentative.md) — `?` choice vs `[0-1]` sequential
- [json-subset.md](json-subset.md) — JSON cookbook (repeat + tentative + wire-literals)
