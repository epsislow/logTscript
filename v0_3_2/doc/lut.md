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

## Usage

### Method B — structural wiring

```logts
4wire index = 0011
.decoder:in = index
4wire value = .decoder:get
```

### Method A — inline invocation

```logts
4wire value = .decoder(in = index)
```

Only pin `in` is supported in v1; result is always pout `get`.

---

## `probe` and `doc()`

```logts
probe(.decoder:get)
doc(comp.lut)    @ syntax template for the type
doc(.decoder)    @ instance: map + fillwith gaps
```

`doc(.decoder)` example sections:

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
- [debug.md](debug.md) — `probe`, `show`, `peek`
- [future-component-ideas.md](future-component-ideas.md) — backlog (B2 LUT)
