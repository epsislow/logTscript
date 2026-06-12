# LUT

A **combinational lookup table**: address in → value out in the **same propagation step** (like `ADD()` / `MUX()`, not like clocked `mem`).

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name **must** start with `.` | `.decoder` ✓ — `decoder` ✗ |
| Letters and digits only (no `_`) | `.decoder` ✓ — `.my_lut` ✗ |
| Invoke with `.` prefix | `.decoder(in = addr)` or `.decoder(0011)` |

`decoder(in = …)` without the leading dot is a **parse error** (unknown identifier).

---

## Two forms

| Form | Declaration | Lookup |
|------|-------------|--------|
| **`inline [lut]`** | `data { }` in body (no `=`) | `.name(in = addr)` or `.name(0011)` |
| **`comp [lut]`** | `= data { }` after attrs | Method B: `.name:in` + `.name:get` — or Method A: `.name(in = addr)` |

Use **`inline [lut]`** for pure combinational lookup in expressions.

Use **`comp [lut]`** when you need pin wiring, wave propagation on pins, or `probe(.name:get)`.

LUT uses **`(...)`** for lookup. ASM (see [asm.md](asm.md)) uses **`{ }`** for program assembly — different inline kind.

---

## Shared attributes

Apply to both `inline [lut]` and `comp [lut]`:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `depth` | `4` | Output width (bits after `:` in `data` and on result) |
| `length` | `16` | Number of table slots (addresses `0 .. length-1`) |
| `fillwith` | `000…0` (`depth` zeros) | Value for slots **not** listed in `data { }` |

Address width on pin `in` (comp only): `max(1, ceil(log2(length)))` bits.

---

## `data { }` — table contents

Same parser for inline body and `comp` initializer.

Decimal `\N` and hex `^N` are **address indices**, not wire literals.

| Address format | Example | Meaning |
|----------------|---------|---------|
| Binary | `0`, `010`, `1001` | `parseInt(bits, 2)` |
| Decimal | `\2`, `\50` | decimal index |
| Hex | `^a`, `^Ff` | hex index |
| Range | `addr - addr` | inclusive; mixed formats OK |

**Values** after `:` must be binary literals of exactly **`depth`** bits.

Unmapped slots use `fillwith`. Overlapping ranges: **last entry wins**. Address `>= length` → parse error.

---

## Declaration — `inline [lut]`

```logts
inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \1 - \5   : 0010
    ^a - ^f   : 1111
  }
  :
```

Body uses `data { }` **without** `=` (unlike `comp [lut]`).

### Runnable — invoke (named address)

```logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0         : 0001
    \1 - \5   : 0010
  }
  :

4wire addr = 0001
4wire y = .decoder(in = addr)
show(y)
```

Slot **1** → value `0010`.

### Runnable — invoke (positional address)

```logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0         : 0001
    \1 - \5   : 0010
  }
  :

4wire y = .decoder(0011)
show(y)
```

Address `0011` (binary) = slot **3** → value `0010`.

Positional form also accepts wire refs: `.decoder(addr)` where `addr` is a wire variable.

### Runnable — unmapped slots and `fillwith`

```logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \1 - \5   : 0010
  }
  :

4wire y = .decoder(in = 0110)
show(y)
```

Slot **6** is not in `data { }` → output is `fillwith` (`0110`).

### Runnable — `doc()` (inline)

```logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \1 - \5   : 0010
    ^a - ^f   : 1111
  }
  :

doc(inline.lut)
doc(.decoder)
```

`doc(inline.lut)` — declaration template and invoke syntax.

`doc(.decoder)` on an inline instance:

```text
.decoder (inline [lut])
  depth: 4
  length: 16
  fillwith: 0110
  map:
    0 -> 0001
    \1-\5 -> 0010
    ^a-^f -> 1111
  fill:
    6-9 -> 0110 (fillwith)
```

---

## Component declaration (`comp [lut]`)

```logts
comp [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \1 - \5   : 0010
    ^a - ^f   : 1111
  }
  :
```

Requires `= data { ... }` initializer at parse time.

### Runnable — method B (pin wiring)

```logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    0         : 0001
    \1 - \5   : 0010
  }
  :

4wire addr = 0011
.lut:in = addr
4wire y = .lut:get
show(y)
```

Address `0011` = slot **3** → value `0010`.

### Runnable — method A (parentheses invoke)

Same `(...)` syntax as `inline [lut]` — works on `comp` instances too:

```logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    0         : 0001
    \1 - \5   : 0010
  }
  :

4wire addr = 0001
4wire y = .lut(in = addr)
4wire z = .lut(0011)
show(y)
show(z)
```

Only pin `in` is supported; result is always pout `get`.

### Runnable — address formats (comp, method B)

Binary index:

```logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    010 : 1000
  }
  :

.lut:in = 010
4wire y = .lut:get
show(y)
```

Decimal index `\50`:

```logts-play
comp [lut] .lut:
  depth: 4
  length: 64
  = data {
    \50 : 1111
  }
  :

.lut:in = \50
4wire y = .lut:get
show(y)
```

Hex range `^a - ^f`:

```logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    ^a - ^f : 1111
  }
  :

.lut:in = ^c
4wire y = .lut:get
show(y)
```

Mixed range (binary start, decimal end):

```logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    010 - \5 : 0010
  }
  :

.lut:in = 0100
4wire y = .lut:get
show(y)
```

### Runnable — `probe` and `doc()` (comp)

`probe` requires a `comp` instance (pins on the netlist):

```logts-play
comp [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \1 - \5   : 0010
    ^a - ^f   : 1111
  }
  :

probe(.decoder:get)
.decoder:in = 0000
.decoder:in = 0011
doc(comp.lut)
doc(.decoder)
```

`doc(comp.lut)` — component type syntax (pins `in` / `get`).

`doc(.decoder)` on a comp instance shows header `comp [lut]` (not `inline [lut]`).

---

## vs `mem`

| | `lut` | `mem` |
|---|-------|-------|
| Timing | Combinational (same step) | Property blocks + `on:` trigger |
| Read | `.name(in=…)` / `.name:get` | `.mem:get` inside `:{ at = … }` |
| Init | `data { }` (inline) or `= data { }` (comp) | `=` binary/hex bulk, `.mem =` |

---

## Common errors

| Error | Cause |
|-------|-------|
| `Expected '.' before inline instance name` | ASM program without dot (see [asm.md](asm.md)) |
| `inline [lut] body requires 'data { ... }' block` | Missing `data { }` in inline body |
| `LUT address N >= length L` | Index outside table at runtime |
| `LUT value must be exactly D bits` | Value or `fillwith` wrong width |
| `LUT range inverted` | `end < start` in a range |
| `requires '= data { ... }'` | `comp [lut]` missing initializer |

---

## Related

- [mem.md](mem.md) — sequential RAM
- [asm.md](asm.md) — inline assembler (blob into `mem`)
- [debug.md](debug.md) — `probe`, `show`, `peek`
