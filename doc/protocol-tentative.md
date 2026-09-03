# Protocol — tentative sections (`?`)

**Parse-only.** Tentative sections add **ordered choice** with **backtracking**: try alternatives in order; on failure restore the cursor and parsed fields; **first success wins**.

Hub: [protocol.md](protocol.md). For section repetition (`packet[1-3]`, `*`, anchor), see [protocol-repeat.md](protocol-repeat.md).

---

## Syntax

| Form | Meaning |
|------|---------|
| `foo` | mandatory `localRef` to `def foo` |
| `foo?` | tentative `localRef` — all branches may fail with **0 bits** |
| `foo:` | mandatory **inline** section (body lines follow) |
| `foo?:` | tentative inline section |
| `def foo:` | declare reusable block — **no `?` on `def`** |

**Mandatory vs optional at use-site:**

| Invoke | All tentative branches fail |
|--------|----------------------------|
| `ethernet` | **Error** — `parse: no matching alternative` |
| `ethernet?` | **OK** — 0 bits consumed, parsing continues |

---

## `?` vs `[0-1]` vs `data1[1-3]?`

| Pattern | Mechanism |
|---------|-----------|
| `foo?` | **Choice group** — pick at most one branch from adjacent `?` items |
| `foo[0-1]` | **Sequential** — 0 or 1 occurrence; not a choice with neighbours |
| `data1[1-3]?` | **Choice + repeat** — whole branch repeats 1–3 times if chosen |

Example: `dataA[0-1] dataB[0-1]` may yield A only, B only, both, or neither (four outcomes).  
`dataA? dataB?` picks **at most one** of A or B.

Composed choice + repeat: [protocol-repeat.md — Composing with tentative](protocol-repeat.md#composing-with-tentative).

---

## Runnable — L3 dispatch

```logts-play legacy
inline [protocol] .l3inline:
  mode: parse
  out:
    ipv4?:
      0100
      src 32b
      dst 32b
    ipv6?:
      0110
      src 128b
      dst 128b
    unknown:
      rest ~
  :

64wire out = .l3inline { data = 0100 + repeat(1,32) + repeat(0,32) }
show(out)
```

Literals verify on wire but **do not** appear in the output blob — only **parse fields** (`src`, `dst`, …).

---

## `parseView: tree`

With `parseView: tree`, `show(parsed)` prints a field tree. Field access: `parsed:typeA:dataA` (section names, not numeric index unless repeating — see [protocol-repeat.md](protocol-repeat.md)).

```logts-play legacy
inline [protocol] .pvTest:
  mode: parse
  parseView: tree
  out:
    magic 3b
    typeA?:
      11
      01
      dataA 2b
    unknown:
      rest ~
  :

5wire parsed = .pvTest { data = 101110100 }
2wire dataA = parsed:typeA:dataA
show(parsed)
show(dataA)
```

---

## `:decode()` and tentative

**`:decode()` is not supported** on protocols with tentative sections. Use `{ data = … }` on a `mode: parse` protocol instead.

| Error | Cause |
|-------|--------|
| `tentative sections require mode: parse` | `?` in `mode: assemble` |
| `Protocol def cannot use '?'` | `def foo?:` at declaration |
| `parse: no matching alternative` | mandatory section, all branches failed |
| `Protocol decode does not support tentative sections` | `:decode()` on protocol with `?` |
