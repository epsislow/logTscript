# Huffman v2 — runtime frequencies in wave mode

End-to-end **wave** demo: measure symbol frequencies from a source wire, sort entries, encode with a **prefix-free** codebook, round-trip through `.huffPacket` / `.huffRecover`.

**No** `buildFrom`, **no** `HUFFMAN_*` builtins — everything is plain logTscript: writable LUT, `on:raise`, [counter](counter.md), [oscillator](oscillator.md) or [switch](switch.md), `SORT`, optional `popMin` for N-general merge.

For the static codebook + protocol walkthrough (v1), see **[huffman.md](huffman.md)**.

**Suite tests:** **2104** (freq `set`+`ADD`), **2105** (`SORT` entries), **2106–2107** (round-trip wave), **2108** (`=:` padding), **2109** (osc scan + counter), **2110** (N-general `popMin` merge + manual codebook), **2111–2114** (`.links` + auto codewords unroll), **2115–2118** (FSM switch scan+merge + walk/protocol), **2119** (packet SC encode), **2145–2146** (packet SC recover + round-trip), **2120–2122** (`:entries(sortKeys|sortValues)`), **2123–2124** (multi-assign `on:`), **2125–2127** (declarative wire re-eval + LUT live read), **2128** (FSM + `execStmts` protocol round-trip).

---

## Principle

| Rule | Detail |
|------|--------|
| Frequencies | Measured at runtime into a writable `.freq` LUT (`set` + `ADD`) |
| Codebook | Built **in script** (fixed table for 4 symbols, or merge steps with `popMin`) — not by the engine |
| Encode / decode | Same protocols as v1 — [huffman.md](huffman.md) |
| Wave mode | Use `on:raise` / `on:1 { once, … }` for LUT mutations; bare top-level `:add` can run twice on first Run |

Runnable blocks use **`logts-play wave`** or **`logts-play legacy`** — open in the doc viewer and use **Load** / **Load & Run**. For **auto codewords** (merge + `.links` walk), see [Auto codewords from `.links`](#auto-codewords-from-links) (**legacy**, test **2114**).

---

## Architecture (three phases)

| Phase | What | Building blocks |
|-------|------|-----------------|
| **A — Scan** | Walk `source` in steps of `keyWidth`, count in `.freq` | `comp [osc]` or `comp [switch]`, `comp [counter]`, `on:raise`, `.freq:set` + `ADD` |
| **B — Sort + codes** | Order symbols by count; fill `.huff` | `e = .freq:entries()` then `SORT(e; col=1)`, writable `prefixFree` LUT, optional `popMin` merge |
| **C — Packet** | Encode + decode | `.huffPacket`, `.huffRecover`, `=:` padding if needed |

```mermaid
flowchart LR
  subgraph A [Phase A scan]
    Osc[clk tick]
    Idx[counter += keyWidth]
    Slice[symbol from source]
    Freq[freq set ADD]
    Osc --> Idx --> Slice --> Freq
  end
  subgraph B [Phase B codes]
    Sort[SORT entries]
    Huff[huff codebook]
    Sort --> Huff
  end
  subgraph C [Phase C packet]
    Enc[huffPacket]
    Dec[huffRecover]
    Enc --> Dec
  end
  A --> B --> C
```

---

## Phase A — Frequency LUT

Writable LUT with **`fillwith: 00000000`** so `ADD(.freq:get(sym), \1;8)` treats a missing key as count **0** (not a Huffman codeword).

Use **`\N;8`** grouped literals for 8-bit counts — a bare `00000001` literal is only **1 bit** wide.

```logts-play wave
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
1wire _ = .freq:set(0010, \1;8)
1wire _ = .freq:set(0010, ADD(.freq:get(0010), \1;8))
1wire _ = .freq:set(0010, ADD(.freq:get(0010), \1;8))
1wire _ = .freq:set(0011, \1;8)
8wire f10 = .freq:get(0010)
8wire f11 = .freq:get(0011)
4wire sz = .freq:size()
show(f10)
show(f11)
show(sz)
```

→ `f10 = 00000011`, `f11 = 00000001`, `sz = 0010` (three×`0010`, one×`0011`).

### `on:raise` increment (dynamic index)

```logts
on:raise {
  AND(.clk:get, NOT(atEnd)),
  ok = .freq:set(sym, ADD(.freq:get(sym), \1;8))
}
```

Evaluate the symbol slice **inside** the `on:raise` body (or use fixed `EQ(.idx:get, …)` branches). A top-level `4wire sym = source.(pos)/4` **tracks** `.idx:get` in wave mode and re-evaluates when the counter advances (test **2125**).

### Manual tick — switch + counter (editor-friendly)

Same logic as test **2109**, but with a **switch** you click in the UI (rising edge = scan step). Advance the [counter](counter.md) on the **falling** edge (`set = NOT(.clk:get)`) with **`on: raise`** on the component so `on:raise` still sees the current index when the clock rises.

```logts-play wave
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
16wire source = 0010 + 0010 + 0010 + 0011
comp [switch] .clk:
  text: 'tick'
  :
comp [counter] .idx:
  depth: 8
  on: raise
  :
.idx:{
  data = ADD(.idx:get, 00000100)
  write = 1
  set = NOT(.clk:get)
}
1wire ok = 0
on:raise { AND(.clk:get, EQ(.idx:get, 00000000)), ok = .freq:set(0010, ADD(.freq:get(0010), \1;8)) }
on:raise { AND(.clk:get, EQ(.idx:get, 00000100)), ok = .freq:set(0010, ADD(.freq:get(0010), \1;8)) }
on:raise { AND(.clk:get, EQ(.idx:get, 00001000)), ok = .freq:set(0010, ADD(.freq:get(0010), \1;8)) }
on:raise { AND(.clk:get, EQ(.idx:get, 00001100)), ok = .freq:set(0011, ADD(.freq:get(0011), \1;8)) }
probe(.freq:get(0010))
probe(.freq:get(0011))
```

**How to run:** Load & Run, then click **tick** four times (each click: press = `1`, release = `0`). After four scans, probes show `0010 → 00000011` and `0011 → 00000001`.

With a real [oscillator](oscillator.md) instead of a switch, use `session.setComp(interp, '.clk', '1')` then `'0'` in tests (pattern test **611**).

---

## Phase B — Sort + codebook

### Sort entries by frequency

```logts-play wave
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
1wire _ = .freq:set(0010, \3;8)
1wire _ = .freq:set(0011, \1;8)
1wire _ = .freq:set(0000, \2;8)
8wire[3,2] e = .freq:entries()
8wire[3,2] sorted = SORT(e; col=1)
8wire[3] syms = sorted::0
8wire[3] cnts = sorted::1
show(syms)
show(cnts)
```

Ascending sort on column 1 (counts): symbols `0011`, `0000`, `0010` with counts `1`, `2`, `3`.

Syntax reminders:

| Intent | Form |
|--------|------|
| Sort rows by value column | `SORT(matrix; col=1)` |
| `SORT` argument | **Named tensor wire** — assign `.freq:entries()` to `8wire[n,2] e` first; inline `:entries()` inside `SORT(...)` is rejected |
| Column 0 = keys, column 1 = values | `sorted::0`, `sorted::1` |
| Row access | `sorted:0` (not column 0) |

See [builtin-SORT.md](builtin-SORT.md) and [lut.md — entries](lut.md).

### Assigning codewords (4-symbol demo)

For a **fixed 4-symbol** alphabet, the Huffman tree for arbitrary positive counts is still a **finite** network — but the v2 demo usually **reuses the v1 table** once frequencies justify it:

| Key | Codeword |
|-----|----------|
| `00` | `0` |
| `01` | `10` |
| `10` | `110` |
| `11` | `111` |

```logts
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :
```

To **derive order** from counts without a builtin tree builder:

- **`ARGMAX(cnts; index)`** — index of the largest count (ties → smallest index). See [builtin-ARGMAX.md](builtin-ARGMAX.md).
- **`MUX` / `GT`** — finite compare network for 4 nibbles (documented in the internal plan; many wires, but valid logTscript).

### N-general merge (`popMin`) — full `'aacb'` example

Build frequencies from a short ASCII source, merge with **`:popMin`** on a writable `.heap`, write codewords into a writable **`prefixFree` `.huff`**, then round-trip.

Use **`logts-play legacy`** for this script: merge steps are **sequential** `popMin` calls (in wave mode, multiple `on:1` blocks can fire together). For osc-stepped merge in wave, drive each pair of `popMin` calls from a [switch](switch.md) tick.

**Counts** below match `'aacb'` (`a`×2, `b`×1, `c`×1). A full osc scan of `source` is the same pattern as [Phase A](#osc--counter-scan-4-nibbles-keywidth--4); here the histogram is filled directly so one Run stays compact.

**Merge tree** (stable `popMin` ties): merge `b`+`c` → internal `11111110`, then merge `a`+internal → root `11111111`. Codewords: `a=0`, `b=10`, `c=11`.

**Internal keys** `11111110` / `11111111` are merge bookkeeping only — not in the codebook. Writable `prefixFree` **collapse** uses **`lutEntryList`** only (not `fillwith` slots), so byte keys round-trip correctly.

```logts-play legacy
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 8b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 8b)
  :
32wire source =: 'aacb'
1wire _ = .freq:set(01100001, \2;8)
1wire _ = .freq:set(01100010, \1;8)
1wire _ = .freq:set(01100011, \1;8)
8wire[3,2] e = .freq:entries()
8wire[3,2] sorted = SORT(e; col=1)
1wire _ = .heap:clear()
1wire _ = .heap:add(01100010, \1;8)
1wire _ = .heap:add(01100011, \1;8)
1wire _ = .heap:add(01100001, \2;8)
8wire hk1, 8wire hf1 = .heap:popMin()
8wire hk2, 8wire hf2 = .heap:popMin()
8wire hsum1, 1wire hc1 = ADD(hf1, hf2)
1wire _ = .heap:add(11111110, hsum1)
8wire hk3, 8wire hf3 = .heap:popMin()
8wire hk4, 8wire hf4 = .heap:popMin()
8wire hsum2, 1wire hc2 = ADD(hf3, hf4)
1wire _ = .heap:add(11111111, hsum2)
8wire hsz = .heap:size()
1wire _ = .huff:clear()
1wire _ = .huff:add(01100001, 0)
1wire _ = .huff:add(01100010, 10)
1wire _ = .huff:add(01100011, 11)
64wire packet =: .huffPacket { tokens = source }
32wire recovered = .huffRecover { data = packet }
show(sorted::1)
show(hsz)
show(source; ascii)
show(recovered; ascii)
```

| Wire | Expected | Meaning |
|------|----------|---------|
| `sorted::1` | `00000001`, `00000001`, `00000010` | counts ascending (`b`, `c`, `a`) |
| `hsz` | `00000001` | one root left in `.heap` |
| `hk1` | `01100010` | first `popMin` = `'b'` |
| `recovered` | same as `source` | `"aacb"` + pad |

**Scaling:** for larger **N**, unroll more merge rounds (`popMin`×2 + `:add`) per osc tick, or use a fixed max-N network. See [Auto codewords](#auto-codewords-from-links) (tests **2111–2114**) — no manual `.huff:add` codewords.

For wave + switch-driven merge, chain `on:1 { onceN, … }` blocks with separate `once` wires per tick (see [conditional-assignment.md](conditional-assignment.md)).

---

### Auto codewords from `.links`

After merge, each child stores **`parent(8b) ‖ bit(8b)`** in a writable **`.links`** LUT (`depth: 16`). Walk from each leaf symbol up to `rootKey`, prepend bits, then `.huff:add(sym, cod)` — suite tests **2111–2114**.

Use **`logts-play legacy`** below (sequential `popMin` + walk). Open [huffman-v2.md](huffman-v2.md) in the **doc viewer**, then **Load** or **Load & Run** on each block.

#### Runnable — `.links` layout (`'b'` → parent `11111110`, bit `0`)

**Load & Run** — after merge round 1, `'b'` (`01100010`) links to internal node `11111110` with bit `0`:

```logts-play legacy
MODE WIREWRITE
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .links:
  writable
  depth: 16
  length: 256
  fillwith: 0000000000000000
  data { }
  :
1wire _ = .heap:add(01100010, \1;8)
1wire _ = .heap:add(01100011, \1;8)
8wire k1, 8wire f1 = .heap:popMin()
8wire k2, 8wire f2 = .heap:popMin()
8wire sum, 1wire hc = ADD(f1, f2)
8wire parent = 11111110
16wire l0 = parent + 00000000
16wire l1 = parent + 00000001
1wire _ = .heap:add(parent, sum)
1wire _ = .links:set(k1, l0)
1wire _ = .links:set(k2, l1)
16wire linkB = .links:get(01100010)
show(linkB)
show(linkB.0/8)
show(linkB.15/1)
```

→ `linkB = 1111111000000000`, parent `11111110`, bit `0`.

#### Runnable — full auto pipeline (`'aacb'`)

**Load & Run** — frequencies → `popMin` merge → `.links` → walk-up → `.huff` (no manual codewords) → encode/decode round-trip. Check **Output** for `show` lines:

```logts-play legacy
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .links:
  writable
  depth: 16
  length: 256
  fillwith: 0000000000000000
  data { }
  :
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 8b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 8b)
  :
32wire source =: 'aacb'
1wire _ = .freq:set(01100001, \2;8)
1wire _ = .freq:set(01100010, \1;8)
1wire _ = .freq:set(01100011, \1;8)
1wire _ = .heap:clear()
1wire _ = .heap:add(01100001, \2;8)
1wire _ = .heap:add(01100010, \1;8)
1wire _ = .heap:add(01100011, \1;8)
8wire _m1k1, 8wire _m1f1 = .heap:popMin()
8wire _m1k2, 8wire _m1f2 = .heap:popMin()
8wire _m1sum, 1wire _m1c = ADD(_m1f1, _m1f2)
8wire _m1p = 11111110
16wire _m1l0 = _m1p + 00000000
16wire _m1l1 = _m1p + 00000001
1wire _ = .heap:add(_m1p, _m1sum)
1wire _ = .links:set(_m1k1, _m1l0)
1wire _ = .links:set(_m1k2, _m1l1)
8wire _m2k1, 8wire _m2f1 = .heap:popMin()
8wire _m2k2, 8wire _m2f2 = .heap:popMin()
8wire _m2sum, 1wire _m2c = ADD(_m2f1, _m2f2)
8wire _m2p = 11111111
16wire _m2l0 = _m2p + 00000000
16wire _m2l1 = _m2p + 00000001
1wire _ = .heap:add(_m2p, _m2sum)
1wire _ = .links:set(_m2k1, _m2l0)
1wire _ = .links:set(_m2k2, _m2l1)
1wire _ = .huff:clear()
8wire _ca_n0 = 01100001
8wire _ca_root = 11111111
1wire _ca_g1 = NOT(EQ(_ca_n0, _ca_root))
16wire _ca_lk1 = .links:get(_ca_n0)
1wire _ca_b1 = MUX(_ca_g1, 0, _ca_lk1.15/1)
8wire _ca_n1 = MUX(_ca_g1, _ca_n0, _ca_lk1.0/8)
1wire _ca_g2 = AND(_ca_g1, NOT(EQ(_ca_n1, _ca_root)))
16wire _ca_lk2 = .links:get(_ca_n1)
1wire _ca_b2 = MUX(_ca_g2, 0, _ca_lk2.15/1)
8wire _ca_n2 = MUX(_ca_g2, _ca_n1, _ca_lk2.0/8)
1wire _ca_u1 = AND(_ca_g1, NOT(_ca_g2))
1wire ca = MUX(_ca_u1, 0, _ca_b1)
8wire _cb_n0 = 01100010
8wire _cb_root = 11111111
1wire _cb_g1 = NOT(EQ(_cb_n0, _cb_root))
16wire _cb_lk1 = .links:get(_cb_n0)
1wire _cb_b1 = MUX(_cb_g1, 0, _cb_lk1.15/1)
8wire _cb_n1 = MUX(_cb_g1, _cb_n0, _cb_lk1.0/8)
1wire _cb_g2 = AND(_cb_g1, NOT(EQ(_cb_n1, _cb_root)))
16wire _cb_lk2 = .links:get(_cb_n1)
1wire _cb_b2 = MUX(_cb_g2, 0, _cb_lk2.15/1)
8wire _cb_n2 = MUX(_cb_g2, _cb_n1, _cb_lk2.0/8)
1wire _cb_u1 = AND(_cb_g1, NOT(_cb_g2))
2wire cb = _cb_b2 + _cb_b1
8wire _cc_n0 = 01100011
8wire _cc_root = 11111111
1wire _cc_g1 = NOT(EQ(_cc_n0, _cc_root))
16wire _cc_lk1 = .links:get(_cc_n0)
1wire _cc_b1 = MUX(_cc_g1, 0, _cc_lk1.15/1)
8wire _cc_n1 = MUX(_cc_g1, _cc_n0, _cc_lk1.0/8)
1wire _cc_g2 = AND(_cc_g1, NOT(EQ(_cc_n1, _cc_root)))
16wire _cc_lk2 = .links:get(_cc_n1)
1wire _cc_b2 = MUX(_cc_g2, 0, _cc_lk2.15/1)
8wire _cc_n2 = MUX(_cc_g2, _cc_n1, _cc_lk2.0/8)
1wire _cc_u1 = AND(_cc_g1, NOT(_cc_g2))
2wire cc = _cc_b2 + _cc_b1
1wire _ = .huff:add(01100001, ca)
1wire _ = .huff:add(01100010, cb)
1wire _ = .huff:add(01100011, cc)
64wire packet =: .huffPacket { tokens = source }
32wire recovered = .huffRecover { data = packet }
show(source; ascii)
show(ca)
show(cb)
show(cc)
show(recovered; ascii)
```

| Output | Expected |
|--------|----------|
| `source` | `"aacb"` |
| `ca` / `cb` / `cc` | `0` / `10` / `11` |
| `recovered` | same as `source` |

#### Implementation notes

**Write layout** — always build the 16-bit value in a wire **before** `:set` (inline `parent + 00000000` inside `:set` can pad wrong):

```logts
8wire parent = 11111110
16wire linkVal = parent + 00000000
1wire _ = .links:set(01100010, linkVal)
```

**Read layout** — `link.0/8` = parent, `link.15/1` = Huffman bit (LSB of low byte).

**Merge round** (after `popMin`×2):

```logts
8wire k1, 8wire f1 = .heap:popMin()
8wire k2, 8wire f2 = .heap:popMin()
8wire sum, 1wire hc = ADD(f1, f2)
8wire parent = 11111110
16wire l0 = parent + 00000000
16wire l1 = parent + 00000001
1wire _ = .heap:add(parent, sum)
1wire _ = .links:set(k1, l0)
1wire _ = .links:set(k2, l1)
```

**Walk + codeword** — `MUX(sel, a, b)` → `sel=1` picks **`b`**. Gate hops with `g1`, mask bits with `MUX(g, 0, link.15/1)`, advance node with `MUX(g, n, link.0/8)`. For `'aacb'`, codeword depth per symbol is known (a=1, b/c=2 bits); concat `b2 + b1` for 2-bit codes.

**Limits (v1):** codeword depth per symbol is **fixed in script** for the demo (`codeDepth` 1 or 2 for `'aacb'`). Fully dynamic depth for arbitrary **N** needs more unroll or osc ticks — backlog.

---

## Phase C — Packet round-trip

Same protocols as [huffman.md](huffman.md):

```logts-play wave
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
4wire source = 0001
11wire packet = .huffPacket { tokens = source }
4wire recovered = .huffRecover { data = packet }
show(source)
show(packet)
show(recovered)
```

### Four tokens — dynamic width

Four 2-bit tokens need **17 bits** total (8-bit length + 9-bit payload). Declare the wire wide enough:

```logts-play wave
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
8wire source = 00011011
17wire packet = .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }
show(recovered)
```

### Padded packet (`=:`)

When the encoder emits fewer bits than the wire width, **`=:`** right-pads. The decoder reads only the length prefix + payload — padding is ignored. Same example as [huffman.md — padded packet](huffman.md#runnable--longer-input-padded-packet-):

```logts-play wave
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
8wire source = 00011011
24wire packet =: .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }
show(source)
show(packet)
show(recovered)
```

---

## Full pipeline (A → B → C, single Run)

Populate counts, sort, then encode a **readable ASCII message** and recover it. Uses **`=:`** so the packet wire can be wider than the encoder output, and **`show(…; ascii)`** for human-readable output — see [wire-literals.md — ASCII](wire-literals.md#ascii-literals-vs-show-ascii).

The frequency lines at the top are a **compact Phase A+B demo** (three×`10`, one×`11`); the string encode in Phase C is independent — in a full design you would scan `source` into `.freq` first (osc + counter, test **2109**).

```logts-play wave
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 16
  fillwith: 00000000
  data {
  }
  :
inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
1wire _ = .freq:set(10, \1;8)
1wire _ = .freq:set(10, ADD(.freq:get(10), \1;8))
1wire _ = .freq:set(10, ADD(.freq:get(10), \1;8))
1wire _ = .freq:set(11, \1;8)
8wire[2,2] e = .freq:entries()
8wire[2,2] sorted = SORT(e; col=1)
8wire[2] cnts = sorted::1
300wire source =: 'Hello World!'
250wire packet =: .huffPacket { tokens = source }
300wire recovered = .huffRecover { data = packet }
show(cnts)
show(source; ascii)
show(packet; ascii)
show(recovered; ascii)
```

### What you should see

| Output | Typical value | Meaning |
|--------|---------------|---------|
| `cnts` | `0000000100000011` | Sorted counts: `11` → 1, `10` → 3 (16 bits = 2×`8wire`) |
| `source` | `"Hello World!"` + pad glyphs | 12 ASCII chars (96 bits) right-padded in `300wire` |
| `packet` | short gibberish + pad | Huffman bitstream shown as ASCII (`◦` / `·` for non-printable bytes) |
| `recovered` | same as `source` | Round-trip OK — padding after the string is ignored by `withLength` |

`'Hello World!'` is **12×8 = 96 bits**; `expand(…, 2b)` walks that bit stream in **2-bit token** steps. Pick `300wire` / `250wire` wide enough for experimentation; `=:` fills the rest with `0` bits.

### Binary token variant (exact bit width)

If you prefer a minimal numeric demo (test **2107**), use a fixed token wire and declare the packet **exactly** (no `=:`):

```logts
8wire source = 00011011
17wire packet = .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }
show(recovered)
```

Four tokens `00` `01` `10` `11` → payload 9 bits + 8-bit length = **17** bits total.

---

## Wave / NEXT notes

- **`on:1 { once, … }`** or **`on:raise`** for one-shot LUT writes. Bare `1wire _ = .lut:add(…)` at top level can run **twice** on the first Run in wave — see [conditional-assignment.md](conditional-assignment.md).
- **`NEXT(~)`** in wave only recomputes wires in the `~` / `%` / `$` closure — counters, `.freq` entries, and writable LUT state **persist** between steps ([signal-propagation.md](signal-propagation.md)).
- **Declarative wires** that read component outputs (`.idx:get`, `.heap:size()`, `.links:get(…)`) are **re-evaluated** when those components mutate — no manual refresh for typical Huffman FSM wiring (tests **2125–2127**).
- **Post-run scripts:** test harness `execStmts` re-parses statements against the live interpreter, seeds inline kinds (protocol vs asm), and calls `propagate()` on wave sessions — use for FSM walk + `.huffPacket` encode after ticks (tests **2116**, **2117**, **2128**). See [protocol.md — execStmts](protocol.md#execstmts-secondary-parse).

---

## FSM v2.1 — scan + merge (`huffFsmScript`)

Generator: `tests/test_suite.js` (`huffFsmRoundTripScript`) · Node mirror: `node/huff_fsm_script.js` · regenerate doc block: `node node/_gen_huff_fsm_doc.js`.

One **switch** tick = scan byte step, one merge round, or `.huff` commit. Phases:

| Phase | `ph` | Behaviour |
|-------|------|-----------|
| SCAN | `0000` | `.idx` + `on:raise` freq `:set`; at `srcLen` → heap load + `ph=MERGE` |
| MERGE | `0010` | Parametric merge (`nSym − 1` rounds, literal parent keys) |
| DONE | `0101` | `root = nid`; `on:raise` `.huff:add` → packet/recover (no declarative walk) |

**Script size (`'aacb'`, 3 symbols):** ~**120 lines**. Merge-only FSM ~**95 lines** (`huffFsmScript`).

### Runnable — FSM wave round-trip (`'aacb'`)

Open [huffman-v2.md](huffman-v2.md) in the **doc viewer**, then **Load** or **Load & Run** on the block below.

**How to run:** **Load & Run**, then click **tick** on the switch until **Output** shows `ph = 0101`, `huffSz = 00000011`, `huffReady = 1`, and `recovered` = `"aacb"` (~**8–10** clicks).

| Output | Expected |
|--------|----------|
| `source` | `"aacb"` |
| `_hc0` / `_hc1` / `_hc2` | `10` / `11` / `0` (symbols `b` / `c` / `a`) |
| `ph` | `0101` when merge + huff commit done |
| `root` | `11111111` |
| `recovered` | same as `source` |

```logts-play wave
MODE WIREWRITE
inline [lut] .freq:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .heap:
  writable
  depth: 8
  length: 256
  fillwith: 00000000
  data { }
  :
inline [lut] .links:
  writable
  depth: 16
  length: 256
  fillwith: 0000000000000000
  data { }
  :
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 8b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 8b)
  :
inline [lut] .hfsm:
  SCAN  = 0000
  MERGE = 0010
  DONE  = 0101
  data { }
  :

32wire source =: 'aacb'
8wire srcLen = 00100000
comp [switch] .clk:
  text: 'tick'
  :
4wire ph = 0000
1wire phScan = EQ(ph, .hfsm:SCAN)
1wire phMerge = EQ(ph, .hfsm:MERGE)
1wire phDone = EQ(ph, .hfsm:DONE)
comp [counter] .idx:
  depth: 8
  on: raise
  :
.idx:{
  data = ADD(.idx:get, 00001000)
  write = 1
  set = AND(NOT(.clk:get), phScan, LT(.idx:get, srcLen))
}
8wire nSym = 00000000
8wire mergeStep = 00000000
8wire mergeTarget = 00000010
8wire nid = 11111101
8wire sym = 00000000
8wire root = 00000000
on:raise { AND(.clk:get, phScan, LT(.idx:get, srcLen)), sym = source.(.idx:get)/8 }
on:raise { AND(.clk:get, phScan, LT(.idx:get, srcLen)), 1wire _ = .freq:set(sym, ADD(.freq:get(sym), \1;8)) }
on:raise { AND(.clk:get, phScan, EQ(.idx:get, srcLen)),
  nSym = .freq:size(),
  1wire _ = .heap:clear(),
  1wire _ = .heap:add(01100010, \1;8),
  1wire _ = .heap:add(01100011, \1;8),
  1wire _ = .heap:add(01100001, \2;8),
  nid = 11111101,
  mergeStep = 00000000,
  
  ph = .hfsm:MERGE }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, 00000000), LT(mergeStep, mergeTarget)),
  8wire _m0k1, 8wire _m0f1 = .heap:popMin(),
  8wire _m0k2, 8wire _m0f2 = .heap:popMin(),
  8wire _m0sum, 1wire _m0c = ADD(_m0f1, _m0f2),
  8wire _m0p = 11111110,
  16wire _m0l0 = _m0p + \0;8,
  16wire _m0l1 = _m0p + \1;8,
  1wire _ = .heap:add(_m0p, _m0sum),
  1wire _ = .links:set(_m0k1, _m0l0),
  1wire _ = .links:set(_m0k2, _m0l1),
  nid = 11111110,
  mergeStep = 00000001 }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, 00000001), LT(mergeStep, mergeTarget)),
  8wire _m1k1, 8wire _m1f1 = .heap:popMin(),
  8wire _m1k2, 8wire _m1f2 = .heap:popMin(),
  8wire _m1sum, 1wire _m1c = ADD(_m1f1, _m1f2),
  8wire _m1p = 11111111,
  16wire _m1l0 = _m1p + \0;8,
  16wire _m1l1 = _m1p + \1;8,
  1wire _ = .heap:add(_m1p, _m1sum),
  1wire _ = .links:set(_m1k1, _m1l0),
  1wire _ = .links:set(_m1k2, _m1l1),
  nid = 11111111,
  mergeStep = 00000010 }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, mergeTarget)), root = nid }
on:raise { AND(.clk:get, phMerge, EQ(mergeStep, mergeTarget)), ph = .hfsm:DONE }
8wire huffCommit = 00000000
2wire _hc0 = 00
2wire _hc1 = 00
1wire _hc2 = 0
64wire packet = \0;64
32wire recovered = \0;32
on:raise { AND(.clk:get, phDone, EQ(huffCommit, 00000000), GT(nSym, 00000000)),
  1wire _ = .huff:clear(),
  _hc0 = 10, 1wire _ = .huff:add(01100010, _hc0),
  _hc1 = 11, 1wire _ = .huff:add(01100011, _hc1),
  _hc2 = 0, 1wire _ = .huff:add(01100001, _hc2),
  huffCommit = 00000001 }
on:raise { AND(.clk:get, EQ(huffCommit, 00000001)),
  packet =: .huffPacket { tokens = source },
  recovered = .huffRecover { data = packet } }
8wire huffSz = .huff:size()
1wire huffReady = AND(EQ(huffSz, nSym), GT(nSym, 00000000))
show(source; ascii)
show(_hc0)
show(_hc1)
show(_hc2)
probe(recovered; ascii)
show(ph)
show(root)
show(huffSz)
show(huffReady)
```

**Tests:** **2115** (merge+links), **2116** (walk via `execStmts`), **2117** (`execStmts` round-trip), **2118** (in-script round-trip, no `execStmts`).

**Backlog (S1):** single merge block with reused `mk/mf` (`engine-on-reassign`); hop-by-hop walk FSM without static `huffWalkEmit`.

---

## Packet self-contained (SC)

A **self-contained** Huffman packet embeds the codebook on the wire — decode does **not** require a preloaded `.huff` LUT. Encode still uses `.huff` locally (built by FSM merge + walk); the wire carries everything a decoder needs.

| Region | Width | Content |
|--------|-------|---------|
| **Header** | 24b | `magic` `'H'` (`01001000`) + `keyWidth` 8b + `nSym` 8b |
| **Codebook frame** | 16b + var | `lengthOf(codebookBody) 16b` + body (see below) |
| **Payload** | 8b + var | `lengthOf(encoded) 8b` + Huffman bitstream |
| **Checksum** | 16b | CRC-16-CCITT over header + codebook + payload |

### Codebook body (compact, `sym` ascending)

Per entry: `sym 8b` + `cwLen 8b` + `codeword` (`cwLen` bit, MSB-first).

Helper in the test harness (same layout as on-wire):

```javascript
huffBuildCodebookWire(entries)  // [{ sym, cod, width }, …] → bit string
```

Build from FSM codewords, sorted by symbol:

```logts
// after .huff:add(…) for each symbol
53wire codebook = …   // huffBuildCodebookWire from sorted entries
```

### Encode — `.huffPacketSC`

Separate protocol from v1 `.huffPacket` — includes header, framed codebook, payload, checksum.

```logts-play legacy
# --- Setup: writable codebook LUT + encode protocol ---
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :

inline [protocol] .huffPacketSC:
  def codebookBody:
    codebook ~b
  def codebook:
    lengthOf(codebookBody) 16b
    codebookBody
  def encoded:
    expand(tokens, .huff, keyWidth b)
  def payload:
    lengthOf(encoded) 8b
    encoded
  def body:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    payload
  out:
    body
    checksum(crc16, body)
  :

# --- Codewords pentru 'aacb' (folosite la expand) ---
1wire _ = .huff:add(01100001, 0)
1wire _ = .huff:add(01100010, 10)
1wire _ = .huff:add(01100011, 11)
32wire source =: 'aacb'

# --- Codebook body 53b (sym 8 + cwLen 8 + codeword)*3, sortat după sym ---
# a: 01100001|00000001|0   b: 01100010|00000010|10   c: 01100011|00000010|11
53wire codebook = 01100001000000010011000100000001010011000110000001011

# --- Encode packet SC ---
# layout: HEADER 24b | cbLen 16b | CODEBOOK 53b | PAYLOAD 14b | CRC 16b
123wire packet =: .huffPacketSC {
  tokens = source,
  keyWidth = 00001000,
  nSym = 00000011,
  codebook = codebook
}
show(packet)
```

**Test 2119** verifies magic, codebook frame, payload (matches v1 `.huffPacket`), and CRC suffix.

### Recover — `.huffRecoverSC` (Faza 3)

Decode = **protocol separat** with `mode: parse` — **not** `:decode()` on the encoder.

Explicație detaliată (`stream` vs `data`, cursor, exemplu runnable): [protocol.md — Complex example `.huffRecoverSC`](protocol.md#complex-example--huffman-self-contained-recover-huffrecoversc).

```logts
inline [protocol] .huffRecoverSC:
  mode: parse
  codebookLoad: .huff
  parseResult: collapseOnly
  def entry:
    sym 8b
    cwLen 8b
    withLength(rest, cwLen b)
  def codebook:
    withLength(stream, 16b, entry)
  out:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    validateChecksum(crc16, data)
    collapse(withLength(stream, 8b), .huff, keyWidth b)
  :
```

**Attributes:**
- `codebookLoad: .huff` — clears LUT, then `.huff:add(sym, codeword)` per parsed entry
- `parseResult: collapseOnly` — output wire = decoded tokens only (not header/codebook bits)
- Validates `nSym` matches entry count after codebook parse

Side-effect at parse: populate `.huff` from codebook entries (no preset LUT required).

### Bit layout — `'aacb'` example

| Offset (bit) | Width | Section | Content (`'aacb'`) |
|--------------|-------|---------|---------------------|
| 0 | 8b | magic | `H` |
| 8 | 8b | keyWidth | 8 |
| 16 | 8b | nSym | 3 |
| 24 | 16b | cbLen | 53 |
| 40 | 53b | codebook | `a\|1\|0`, `b\|2\|10`, `c\|2\|11` (sym \| cwLen \| cw) |
| 93 | 14b | payload | len=8 + `00001110` (6 Huffman bits) |
| 107 | 16b | CRC | 16-bit suffix |

**Total: 123 bit.**

```packet-layout
H:8,kw:8,nSym:8,cbLen:16,codebook:53,payload:14,CRC:16
```

Payload encoded = `00000110001110` (14 bit — same as v1 `.huffPacket` for `'aacb'`).

### Runnable — round-trip SC (`'aacb'`)

Script **complet** — **Load** sau **Load & Run** în doc viewer (fără copy-paste din alte secțiuni). Writable LUT = atributul `writable` pe `inline [lut] .huff` (nu necesită `MODE WIREWRITE`).

```logts-play legacy
# --- Setup: writable LUT + protocoale encode / recover ---
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
  :

inline [protocol] .huffPacketSC:
  def codebookBody:
    codebook ~b
  def codebook:
    lengthOf(codebookBody) 16b
    codebookBody
  def encoded:
    expand(tokens, .huff, keyWidth b)
  def payload:
    lengthOf(encoded) 8b
    encoded
  def body:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    payload
  out:
    body
    checksum(crc16, body)
  :

inline [protocol] .huffRecoverSC:
  mode: parse
  codebookLoad: .huff
  parseResult: collapseOnly
  def entry:
    sym 8b
    cwLen 8b
    withLength(rest, cwLen b)
  def codebook:
    withLength(stream, 16b, entry)
  out:
    01001000
    keyWidth 8b
    nSym 8b
    codebook
    validateChecksum(crc16, data)
    collapse(withLength(stream, 8b), .huff, keyWidth b)
  :

# --- Sursă + codewords (encode) ---
32wire source =: 'aacb'
1wire _ = .huff:add(01100001, 0)
1wire _ = .huff:add(01100010, 10)
1wire _ = .huff:add(01100011, 11)

# --- Codebook body 53b (embedded în packet) ---
53wire codebook = 01100001000000010011000100000001010011000110000001011

# --- ENCODE (live — necesită .huff populat pentru expand) ---
123wire packetEncoded =: .huffPacketSC {
  tokens = source,
  keyWidth = 00001000,
  nSym = 00000011,
  codebook = codebook
}
peek(source; ascii)
peek(packetEncoded)

# --- SNAPSHOT 123b pentru recover ---
# Wave mode re-evaluează `.huffPacketSC` după `:clear()` → CRC invalid dacă folosești `packetEncoded` direct.
# Copiază valoarea din `peek(packetEncoded)` (hex grupat + rest binar):
123wire packet = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
peek(packet)

# --- RECOVER: parse packet → rebuild .huff din codebook → decode payload ---
1wire _ = .huff:clear()
32wire recovered = .huffRecoverSC { data = packet }
8wire huffSz = .huff:size()

show(recovered; ascii)
show(huffSz)
```

**Output așteptat:**

```text
source (32wire) = "aacb"
packetEncoded (123wire) = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
packet (123wire) = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
recovered (32wire) = "aacb" (ref: &4)
huffSz (8wire) = 00000011 (ref: &5)
```

→ `recovered` = `source` (`aacb`), `huffSz = 3` după recover (LUT reconstruit din codebook). **Test 2145** verifică același flux (fără `peek`/`show`, legacy propagation).

**`peek` vs `show`:** `peek(expr)` citește valoarea **fix în acel moment** (înainte de propagation ulterioară). `show(expr)` rulează după ce se termină propagation — deci `show(packetEncoded)` *după* `.huff:clear()` poate afișa un packet corupt (`… + 000` în loc de `… + 111`), pentru că `.huffPacketSC` depinde de `expand(..., .huff)` și LUT-ul e gol. Folosește `peek` pentru encode + snapshot, `show` doar pe rezultatele finale care nu depind de `.huff`.

### Policy

| Mechanism | Role |
|-----------|------|
| `.huffPacketSC` | Encode — needs local `.huff` + `codebook ~b` param |
| `.huffRecoverSC` | Recover — parse wire, rebuild `.huff`, decode payload |
| `:decode()` | **Not used** for SC packets |

See [protocol.md](protocol.md) — Faza 0a–0d (`mode: parse`, `withLength`, `keyWidth b`, `checksum`).

---

## Gap analysis (N-general)

| Need | Status |
|------|--------|
| `:entries` + `SORT` | **Done** (Faza 0b) — tests **2085**, **2105** |
| `:keyAt` / `:valueAt` | **Done** (Faza 0c) |
| `popMin` / `peekMin` on LUT | **Done** (Faza 0d) — merge extract-min |
| `NEXT` ≈ osc in wave | **Done** (Faza 0z) |
| Runtime freq scan | **Done** — tests **2104**, **2109** |
| Round-trip wave | **Done** — tests **2106–2108** |
| N-general merge + byte codebook | **Done** — test **2110** (`popMin`, manual `.huff`) |
| Auto codewords via `.links` walk | **Done** — tests **2111–2114** (`'aacb'`, fixed code depth) |
| `:entries(sortKeys\|sortValues)` | **Done** — tests **2120–2122** |
| Multi-assign in one `on:raise { }` | **Done** — tests **2123–2124** |
| Declarative wire re-eval (counter, LUT `:size`, `:get`) | **Done** — tests **2125–2127** |
| FSM switch scan + merge (`ph` 4b) | **Done** — test **2115** (`'aacb'`, links = **2113**, wave session) |
| FSM + post-tick walk (`execStmts`) | **Done** — test **2116** (codewords `0`/`10`/`11`) |
| FSM merge + `execStmts` round-trip | **Done** — test **2117** (merge + walk + protocol, wave) |
| FSM + `execStmts` protocol only | **Done** — test **2128** |
| Packet SC encode (`.huffPacketSC`) | **Done** — test **2119** |
| Packet SC recover (`.huffRecoverSC`) | **Done** — tests **2145**, **2146** |
| Round-trip SC fără `.huff` preset | **Done** — test **2145** |
| Parametric merge steps (`nSym−1` not ×31) | **Done** — generator `huffFsmMergeStepBlocks(sourceLiteral)` |
| Reused merge wires (`mk/mf` one block) | **Backlog** — engine reassign in duplicate `on:raise` |
| Walk FSM hop-by-hop (`ph=WHOP`, no static unroll) | **Backlog** |
| FSM round-trip in-script (no `execStmts`) | **Done** — test **2118** + doc **Load & Run** block |
| `ARGSORT` / `keysAt` / `valuesAt` | **Backlog** (generic) |
| `comp [priorityqueue]` | **Backlog** — redundant if `popMin` suffices |
| `buildFrom` / `HUFFMAN_*` builtin | **Out of scope** (by design) |
| Mod `signal` (full digital settle) | **Backlog** — after Huffman v2 |

---

## Related

- [huffman.md](huffman.md) — static codebook + protocols (v1)
- [lut.md](lut.md) — writable LUT, `:entries`, `SORT`, `popMin`
- [conditional-assignment.md](conditional-assignment.md) — `on:raise`, `on:1`, wave vs legacy
- [builtin-SORT.md](builtin-SORT.md) — `SORT(matrix; col=1)`
- [builtin-ARGMAX.md](builtin-ARGMAX.md) — max frequency index
- [counter.md](counter.md) — index stepping (`write`, `data`, `set`)
- [oscillator.md](oscillator.md) — periodic clock (tests use `setComp`)
- [switch.md](switch.md) — manual tick in the editor
- [protocol.md](protocol.md) — `expand`, `collapse`, `withLength`
- [signal-propagation.md](signal-propagation.md) — wave + NEXT
- [assignment-operators.md](assignment-operators.md) — `=:` padding
- [wire-literals.md](wire-literals.md) — `'Hello World!'` wire strings, `show(w; ascii)`
- [debug.md](debug.md) — `show(…; ascii)` display tags
