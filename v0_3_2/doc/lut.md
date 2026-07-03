# LUT

A **combinational lookup table**: address in → value out in the **same propagation step** (like `ADD()` / `MUX()`, not like clocked `mem`).

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name **must** start with `.` | `.decoder` ✓ — `decoder` ✗ |
| Letters, digits, `_` | `.my_lut` ✓ |
| Invoke with `.` prefix | `.decoder(in = addr)` or `.decoder(0011)` |
| **Global** ref from board/chip/pcb body | `^.decoder:LOAD` — skips instance prefix (see below) |

`decoder(in = …)` without the leading dot is a **parse error** (unknown identifier).

### Global reference `^.name`

Inside a **board**, **chip**, or **pcb** body, local component names are prefixed at instantiation (`.ctl` → `._cpu_ctl`). Top-level `inline [lut]` / `inline [asm]` instances keep their global name (`.ctl`).

Use **`^`** before the dot to refer to the **global** instance from inside a composite body:

```logts
inline [lut] .ctl:
  LOAD = 0001
  :

board +[cpu]:
  4wire ctl = ^.ctl:LOAD    # global .ctl, not ._cpu_ctl
  doc(^.ctl)                # works inside board body
  :
```

`^` before a hex literal is unchanged: `^FF` is still hex, not global (global form is `^.name` only).

---

## Two forms

| Form | Declaration | Lookup |
|------|-------------|--------|
| **`inline [lut]`** | labels and/or `data { }` in body (no `=`) | `.name(in = addr)`, `.name:LABEL`, `.name:decode(...)` |
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

Address width on pin `in` (comp only): `max(1, ceil(log2(length)))` bits — call this **`addrBits`**.

#### Wide `in` values (narrowing)

If `in` is driven by a wire **wider** than `addrBits` (common with `8wire` arithmetic or `:get` from an 8-bit `reg`), the table index is the **least significant `addrBits` bits** of the value. Values shorter than `addrBits` are **zero-padded on the left**.

This matches device-layer `setLutIn` and applies to both `comp [lut]` pin `in` and invoke `.name(in = expr)`.

| `length` | `addrBits` | `in` (example) | Index used | Slot |
|----------|------------|----------------|------------|------|
| 16 | 4 | `00000011` | `0011` | 3 |
| 16 | 4 | `00001010` | `1010` | 10 |

Use an explicit bit slice (e.g. `val.4/4`) only when you need non-LSB bits; for numeric digit/opcode indices the low bits are the address.

```logts-play
comp [lut] .toAscii:
  depth: 8
  length: 16
  fillwith: 00110000
  = data {
    ^0: 00110000
    ^3: 00110011
  }
  on: 1
  :

8wire digit = 00000011
8wire ch = .toAscii(in = digit)
show(ch)
```

`digit` is 8 bits; address **`0011`** → ASCII `'3'` (`00110011`), not slot 0 from the high nibble.

### `variableDepth`

When set, each LUT value may have a **different bit width**. Mutually exclusive with `depth:`.

| Rule | Detail |
|------|--------|
| Attribute | `variableDepth` (no value) |
| Values in `data { }` | Any non-empty binary literal per slot |
| `fillwith` | Must be exactly **1 bit** (default `0`) |
| Output width | Matches the selected value's length |

### Runnable — variableDepth lookup

```logts-play
inline [lut] .vd:
  variableDepth
  data {
    00: 0
    01: 101
    10: 11
  }
  :

1wire a = .vd(00)
3wire b = .vd(01)
2wire c = .vd(10)
show(a)
show(b)
show(c)
```

Address `01` → 3-bit value **`101`**; address `10` → 2-bit value **`11`**.

Combining `variableDepth` with `depth:` is a parse error.

### `prefixFree`

Declares a **prefix-free** codeword table (Huffman-style). Implies `variableDepth`; mutually exclusive with `depth:`.

At parse time every value is checked: no codeword may be a prefix of another.

| Rule | Detail |
|------|--------|
| Attribute | `prefixFree` (no value) |
| Values | Variable-length binary codewords |
| Lookup | `.name(in = addr)` — encode key → codeword |
| Reverse in protocol | `collapse(data, .name, keyWidth)` — greedy decode; see [protocol.md — expand / collapse](protocol.md#expand--collapse-with-lut) |

For a full encode → packet → decode walkthrough (`.huff`, `.huffPacket`, `.huffRecover`), see **[huffman.md](huffman.md)**.

### Runnable — prefixFree Huffman table

```logts-play
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :

2wire y = .huff(01)
show(y)
```

Key `01` → codeword **`10`**.

Prefix violation example (parse error):

```logts
inline [lut] .bad:
  prefixFree
  data {
    00: 0
    01: 01    # '0' is a prefix of '01'
  }
  :
```

Combining `prefixFree` with `depth:` is a parse error.

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

Body uses labels and/or `data { }` **without** `=` (unlike `comp [lut]`). A LUT with **only labels** (no `data { }`) acts as a symbolic constant table.

---

## Labels

Symbolic names for binary values. Syntax: **flat** (`RED = 00`) or **block** (`labels { RED = 00 }`).

| Rule | Example |
|------|---------|
| Must start with a letter | `RED` ✓ — `1RED` ✗ |
| Letters and digits only | `STATE0` ✓ — `STATE_A` ✗ |
| Unique within the LUT | duplicate → error |
| All labels same width | `RED = 00`, `GREEN = 10` ✓ |

### Access

```logts
3wire state = .flag:OVERFLOW
```

### Labels-only (constants)

```logts
inline [lut] .flag:
  ZERO     = 000
  NEGATIVE = 001
  OVERFLOW = 010
  :

3wire s = .flag:OVERFLOW
```

### Labels with `data { }`

```logts
inline [lut] .traffic:
  RED    = 00
  YELLOW = 01
  GREEN  = 10
  data {
    RED    : GREEN
    GREEN  : YELLOW
    YELLOW : RED
  }
  :

2wire next = .traffic(.traffic:RED)
```

Bare label names (`RED`, `GREEN`) resolve in `.traffic:isValid(RED, GREEN)` on the same instance.

---

## Constant expressions

Labels and `data { }` values may use `|`, `&`, `!`, and parentheses. Evaluated at parse time; `exprSource` is preserved for `show()`, `probe()`, and `doc()`.

```logts
inline [lut] .ctrl:
  depth: 8
  ACCLOAD = 00000001
  MEMREAD = 00000010
  LOAD = ACCLOAD | MEMREAD
  :

8wire w = .ctrl:LOAD
```

Chaining: `A | B | C`. Precedence: `!` > `&` > `|`.

Display uses infix operators (`ACCLOAD | MEMREAD`), not `OR()` / `AND()` / `NOT()`.

---

## `isValid(key, value)` → `1bit`

Checks whether an exact mapping exists in `data { }`.

```logts
1bit ok = .traffic:isValid(RED, GREEN)
1bit ok = .traffic:isValid(currentState, wantedState)
```

---

## `decode(value [, matchIndex])` → address bits

Reverse lookup: encoded value → address (key). Optional zero-based `matchIndex` when multiple keys map to the same value (default `0`).

Works with binary literals and label names as the value argument.

### Runnable — unique reverse lookup

```logts-play
inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0000 : 0001
    0001 : 0010
    0010 : 0100
  }
  :

4wire x = .decoder:decode(0010)
show(x)
```

Value `0010` → key address **`0010`**.

### Runnable — ambiguous value (matchIndex)

```logts-play
inline [lut] .amb:
  depth: 4
  length: 16
  data {
    0000 : 1111
    0001 : 1111
    0010 : 1111
  }
  :

4wire first = .amb:decode(1111)
4wire third = .amb:decode(1111, 0010)
show(first)
show(third)
```

Default index `0` → **`0000`**; index `2` (binary `0010`) → **`0010`**.

### Runnable — decode with label value

```logts-play
inline [lut] .traffic:
  RED    = 00
  YELLOW = 01
  GREEN  = 10
  data {
    RED    : GREEN
    GREEN  : YELLOW
    YELLOW : RED
  }
  :

2wire x = .traffic:decode(GREEN)
show(x)
```

Value label `GREEN` (`10`) maps to key **`RED`** (`00`).

| Error | Cause |
|-------|-------|
| `LUT decode failed: value ... does not exist` | Value not in table |
| `LUT decode failed: match index N exceeds available matches (M)` | Invalid `matchIndex` |

Protocol reverse transform: [protocol.md — `:decode()`](protocol.md#decodechannels). ASM disassembly: [asm.md — `:decode()`](asm.md#decodeinstruction).

---

## Writable LUT API (`inline [lut]` only)

Add the `writable` flag to enable runtime `add` / `set` / `remove` / `clear` and statistics on an **ordered entry list** (duplicate keys allowed). Without `writable`, the LUT stays read-only.

```logts
inline [lut] .huff:
    writable
    depth: 8
    length: 16
    fillwith: 00000000
    data {
        000 : 00000001
        001 : 00000010
    }
    :
```

| Method | Description |
|--------|-------------|
| `.lut(key)` / `.lut:get(key)` | First value for key; missing key → **fillwith** |
| `.lut(key, matchIndex)` | Nth matching entry for key |
| `.lut:decode(value)` | Reverse lookup on **entry list** |
| `.lut:add(key, value)` | Append entry |
| `.lut:set(key, value [, matchIndex])` | Replace or append |
| `.lut:remove(key [, matchIndex])` | Remove entry (no-op if missing) |
| `.lut:clear()` | Remove all entries |
| `.lut:size()` | Entry count |
| `.lut:countKey(key)` | Matches for key (**0** if absent; fillwith does not affect key presence) |
| `.lut:countValue(value)` | Matches for value (**0** for fillwith, even if `get` would return it) |
| `.lut:hasKey(key)` | `1` if any entry has key, else `0` (missing key → `0`) |
| `.lut:hasValue(value)` | `1` if any entry has value, else `0` (**0** for fillwith) |
| `.lut:isEmpty()` | `1` if no entries |

### `fillwith` vs explicit entries

Statistics and reverse lookup scan **only explicit entries** in the list. `get` alone uses fillwith as fallback:

| Operation | Key / value absent from list | `fillwith` as argument |
|-----------|------------------------------|-------------------------|
| `get(key)` | returns **fillwith** | — |
| `hasKey(key)` | `0` | — |
| `countKey(key)` | `0` | — |
| `hasValue(fillwith)` | — | **`0`** |
| `countValue(fillwith)` | — | **`0`** |
| `decode(fillwith)` | — | **error** |
| `isValid(key, fillwith)` | `0` unless pair exists | — |

Read-only LUTs (without `writable`) keep the previous `lutTable` semantics for `decode` / `get`.

Writable notes:

- `decode(fillwith)` → error (fillwith is not an explicit entry); read-only LUTs still decode via `lutTable` including fill slots.
- `writable + prefixFree`: each `add` / `set` re-validates prefix-free codewords; violations throw and leave the list unchanged.
- Mutations are used as expressions, e.g. `1wire _ = .huff:add(000, C)` (standalone `.huff:add(...)` is not a statement).

### Runnable — `:add(key, value)`

Appends a new entry. Duplicate keys are kept in order; `get(key)` returns the first match unless `matchIndex` is supplied.

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _ = .huff:add(000, 0011)
4wire first = .huff:get(000)
4wire second = .huff:get(000, 0001)
4wire sz = .huff:size()
show(first)
show(second)
show(sz)
```

After `add`, key `000` has two entries: first `0001`, second `0011`. `size()` → `3`.

### Runnable — `:set(key, value)`

Replaces the first matching key, or appends if the key is absent.

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _ = .huff:set(000, 1111)
4wire x = .huff:get(000)
show(x)
```

Key `000` was `0001` → now `1111`. Key `001` unchanged (`0010`).

### Runnable — `:remove(key)`

Removes the first entry with the given key. No error if the key is missing.

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _a = .huff:add(000, 0011)
1wire _b = .huff:remove(000)
4wire sz = .huff:size()
4wire x = .huff:get(000)
show(sz)
show(x)
```

Removes the **first** `000` entry (`0001`). The appended `0011` remains; `size()` → `2`.

### Runnable — `:clear()`

Removes all entries. Lookups fall back to `fillwith`.

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _ = .huff:clear()
1wire empty = .huff:isEmpty()
4wire sz = .huff:size()
4wire x = .huff:get(000)
show(empty)
show(sz)
show(x)
```

`isEmpty()` → `1`, `size()` → `0`, `get(000)` → `fillwith` (`0000`).

### Runnable — `prefixFree` + `:add` (incremental Huffman)

With `writable` and `prefixFree`, each `add` / `set` must keep codewords prefix-free. Build a codebook step by step:

```logts-play
inline [lut] .huff:
  writable
  prefixFree
  data {
    00: 0
  }
  :

1wire _ = .huff:add(01, 10)
4wire sz = .huff:size()
2wire y = .huff(01)
show(sz)
show(y)
```

`00 → 0` then `01 → 10` — valid prefix-free extension. `size()` → `2`, lookup `01` → `10`.

If a new codeword would violate prefix-free (e.g. adding `01` when `0` already exists), the mutation throws and the table is unchanged.

### Runnable — `countKey` / `countValue` / `hasKey` / `hasValue`

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _ = .huff:add(000, 0011)
4wire ck = .huff:countKey(000)
4wire cv_fill = .huff:countValue(0000)
4wire cv_real = .huff:countValue(0011)
4wire hk_miss = .huff:hasKey(111)
4wire hk_hit = .huff:hasKey(000)
1wire hv_fill = .huff:hasValue(0000)
1wire hv_hit = .huff:hasValue(0011)
show(ck)
show(cv_fill)
show(cv_real)
show(hk_miss)
show(hk_hit)
show(hv_fill)
show(hv_hit)
```

`countKey(000)` → `2` (two explicit entries). `countValue(0000)` → `0` (fillwith is not counted). `hasKey(111)` → `0`; `hasKey(000)` → `1`. `hasValue(0000)` → `0`; `hasValue(0011)` → `1`.

### Runnable — `get` fallback vs `hasKey` (missing key)

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
  }
  :

4wire x = .huff:get(111)
1wire hk = .huff:hasKey(111)
4wire ck = .huff:countKey(111)
show(x)
show(hk)
show(ck)
```

Key `111` is not in the list: `get` returns **fillwith** (`0000`), but `hasKey` → `0` and `countKey` → `0`.

### Runnable — `decode(fillwith)` error

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
  }
  :

4wire x = .huff:decode(0000)
show(x)
```

`decode` scans explicit entries only — `fillwith` is not stored as an entry, so this fails at runtime.

### Runnable — `set` with `matchIndex` (duplicate keys)

```logts-play
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire _a = .huff:add(000, 0011)
1wire _b = .huff:set(000, 1100, 0001)
4wire first = .huff:get(000)
4wire second = .huff:get(000, 0001)
show(first)
show(second)
```

`set(000, 1100, 1)` updates the **second** `000` entry; the first stays `0001`.

---

## `show()` and `probe()` with labels

```logts
show(.state:FETCH)
probe(.ctrl:LOAD)
```

Output includes label name and expression when present, e.g. `LOAD = ACCLOAD | MEMREAD (00000011)`.

---

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

## Display decode — hex 0–F

A **lookup table** can replace the built-in hex decoder on [7seg](seven-seg.md) or [14seg](14seg.md): 4-bit address in → segment pattern out, combinational in the same step.

Segment patterns below match the `hex` pin maps in `doc(comp.7seg)` / `doc(comp.14seg)` (7-seg: 8 bits `a`–`g` + DP `h`; 14-seg: 15 bits including `dp`).

### Runnable — 7-segment hex decoder

**Load & Run**, then flip the **Hex** DIP switches (`0000` … `1111`) — the display shows digits **0**–**F**.

```logts-play
comp [dip] .sw:
  length: 4
  text: 'Hex'
  visual: 1
  = 0000
  :

inline [lut] .hex7:
  depth: 8
  length: 16
  data {
    0000: 11111100
    0001: 01100000
    0010: 11011010
    0011: 11110010
    0100: 01100110
    0101: 10110110
    0110: 10111110
    0111: 11100000
    1000: 11111110
    1001: 11110110
    1010: 11101110
    1011: 00111110
    1100: 10011100
    1101: 01111010
    1110: 10011110
    1111: 10001110
  }
  :

8wire segs = .hex7(.sw:get)

comp [7seg] .digit:
  color: ^f00
  scale: 2
  nl
  on: 1
  :

.digit:{
  a = segs.0
  b = segs.1
  c = segs.2
  d = segs.3
  e = segs.4
  f = segs.5
  g = segs.6
  h = segs.7
  set = 1
}
```

`8wire segs = .hex7(.sw:get)` — address from the DIP bus; each LUT row is one hex digit’s segment pattern (`11111100` = digit **0**, `10001110` = **F**).

Wire bits are **MSB-first** ([short-notation.md](short-notation.md)): `segs.0` = segment **a**, …, `segs.7` = decimal point **h**. The 8-bit LUT values match `hexTo7Seg` + `h = 0` (same order as pin `hex` on `7seg`).

When the DIP changes (wave or legacy propagation), wires that use `.hex7(.sw:get)` or `.hex7(in = sw)` with `sw = .sw:get` are **re-evaluated** in the same step. Use `.sw:get` (or `in = addr` with a wire fed from `:get`), not bare `.sw` on a wire assignment.

### Runnable — 14-segment hex decoder

**Load & Run**, then flip **Hex** DIP — alphanumeric **0**–**F** on the 14-seg panel.

```logts-play
comp [dip] .sw:
  length: 4
  text: 'Hex'
  visual: 1
  = 0000
  :

inline [lut] .hex14:
  depth: 15
  length: 16
  data {
    0000: 111111000010010
    0001: 011000000010000
    0010: 110110110000000
    0011: 111100110000000
    0100: 011001110000000
    0101: 101101110000000
    0110: 101111110000000
    0111: 111000000000000
    1000: 111111110000000
    1001: 111101110000000
    1010: 111011110000000
    1011: 001111110000000
    1100: 100111000000000
    1101: 011110110000000
    1110: 100111110000000
    1111: 100011110000000
  }
  :

15wire pat = .hex14(.sw:get)

comp [14seg] .disp:
  color: ^0f0
  scale: 2
  nl
  on: 1
  :

.disp:{
  data = pat
  set = 1
}
```

On [14seg](14seg.md), pin `data` (15 bits) accepts the full LUT output in one assignment — no per-segment wiring.

---

## vs `mem`

| | `lut` | `mem` |
|---|-------|-------|
| Timing | Combinational (same step) | Property blocks + `on:` trigger |
| Read | `.name(in=…)` / `.name:get` | `.mem:get` inside `:{ adr = … }` |
| Init | `data { }` (inline) or `= data { }` (comp) | `=` binary/hex bulk, `.mem =` |

---

## Common errors

| Error | Cause |
|-------|-------|
| `Expected '.' before inline instance name` | ASM program without dot (see [asm.md](asm.md)) |
| `inline [lut] body requires at least one label or a data { } block` | Empty inline LUT body |
| `Duplicate label 'RED'` | Label declared twice |
| `Unknown label 'BLUE'` | Label not found |
| `LUT decode failed: value ... does not exist` | Reverse lookup miss |
| `LUT address N >= length L` | Index outside table at runtime |
| `LUT value must be exactly D bits` | Value or `fillwith` wrong width |
| `LUT range inverted` | `end < start` in a range |
| `requires '= data { ... }'` | `comp [lut]` missing initializer |
| `variableDepth cannot be combined with depth` | Both attributes set |
| `prefixFree cannot be combined with depth` | Both attributes set |
| `prefixFree violation: value '...' is a prefix of value '...'` | Codewords not prefix-free |

---

## Related

- [boolean-lut.md](boolean-lut.md) — `lutOf` / `exprOfLut` (generate or reverse boolean LUTs from expressions)
- [boolean-analysis.md](boolean-analysis.md) — `truthTableOf`, `simplify`, `equivalent`, `inputsOf`, `costOf`
- [huffman.md](huffman.md) — end-to-end Huffman example (`prefixFree` + `expand` / `collapse`)
- [protocol.md](protocol.md) — `expand` / `collapse` with LUT; `:decode()` on channels
- [seven-seg.md](seven-seg.md), [14seg.md](14seg.md) — display decode examples (hex 0–F LUT)
- [mem.md](mem.md) — sequential RAM
- [asm.md](asm.md) — inline assembler (blob into `mem`)
- [debug.md](debug.md) — `probe`, `show`, `peek`, `lutOf`, `exprOfLut`
