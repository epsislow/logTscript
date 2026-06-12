# LUT component (`lut`)

The `lut` component is a **combinational lookup table**: when the address on pin `in` changes, output `get` updates in the **same propagation step** (like `ADD()` / `MUX()`, not like clocked `mem`).

There is **no panel UI** in v1 — logic only (similar to divider/adder devices).

---

## Declaration

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

### Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `depth` | `4` | Output width (bits after `:` in `data` and on pout `get`) |
| `length` | `16` | Number of table slots (addresses `0 .. length-1`) |
| `fillwith` | `000…0` (`depth` zeros) | Value for slots **not** listed in `data { }` |

Pin `in` width is `max(1, ceil(log2(length)))` bits.

---

## `= data { }` — table contents

Parsed from source (decimal `\N` and hex `^N` are **address indices**, not wire literals).

| Address format | Example | Meaning |
|----------------|---------|---------|
| Binary | `0`, `010`, `1001` | `parseInt(bits, 2)` |
| Decimal | `\2`, `\50` | decimal index |
| Hex | `^a`, `^Ff` | hex index |
| Range | `addr - addr` | inclusive; mixed formats OK |

**Values** after `:` must be binary literals of exactly **`depth`** bits.

Unmapped slots use `fillwith`. Overlapping ranges: **last entry wins**. Address `>= length` → parse error.

---

## Runnable — basic lookup (method B)

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

Address `0011` (binary) = slot **3** → value `0010`.

---

## Runnable — unmapped slots and `fillwith`

```logts-play
comp [lut] .lut:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \1 - \5   : 0010
  }
  :

.lut:in = 0110
4wire y = .lut:get
show(y)
```

Slot **6** is not in `data { }` → output is `fillwith` (`0110`).

---

## Runnable — address formats

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

---

## Runnable — method A (inline invocation)

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
show(y)
```

Only pin `in` is supported in v1; result is always pout `get`.

---

## Runnable — `probe` and `doc()`

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

`doc(.decoder)` example output:

```text
.decoder (comp [lut])
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

## vs `mem`

| | `lut` | `mem` |
|---|-------|-------|
| Timing | Combinational (zero extra delay) | Property blocks + `on:` trigger |
| Read | `.lut:get` or inline invoke | `.mem:get` inside `:{ at = … }` |
| Init | `= data { }` only | `=` binary/hex bulk, `.mem =` |

---

## Common errors

| Error | Cause |
|-------|-------|
| `LUT address N >= length L` | Index outside table |
| `LUT value must be exactly D bits` | Value or `fillwith` wrong width |
| `LUT range inverted` | `end < start` in a range |
| `requires '= data { ... }'` | Missing initializer |

---

## Related

- [mem.md](mem.md) — sequential RAM
- [asm.md](asm.md) — inline assembler (blob into `mem`)
- [debug.md](debug.md) — `probe`, `show`, `peek`
- [future-component-ideas.md](future-component-ideas.md) — backlog (B2 LUT)
