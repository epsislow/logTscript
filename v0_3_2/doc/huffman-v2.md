# Huffman v2 — runtime frequencies in wave mode

End-to-end **wave** demo: measure symbol frequencies from a source wire, sort entries, encode with a **prefix-free** codebook, round-trip through `.huffPacket` / `.huffRecover`.

**No** `buildFrom`, **no** `HUFFMAN_*` builtins — everything is plain logTscript: writable LUT, `on:raise`, [counter](counter.md), [oscillator](oscillator.md) or [switch](switch.md), `SORT`, optional `popMin` for N-general merge.

For the static codebook + protocol walkthrough (v1), see **[huffman.md](huffman.md)**.

**Suite tests:** **2104** (freq `set`+`ADD`), **2105** (`SORT` entries), **2106–2107** (round-trip wave), **2108** (`=:` padding), **2109** (osc scan + counter), **2110** (N-general `popMin` merge + byte codebook).

---

## Principle

| Rule | Detail |
|------|--------|
| Frequencies | Measured at runtime into a writable `.freq` LUT (`set` + `ADD`) |
| Codebook | Built **in script** (fixed table for 4 symbols, or merge steps with `popMin`) — not by the engine |
| Encode / decode | Same protocols as v1 — [huffman.md](huffman.md) |
| Wave mode | Use `on:raise` / `on:1 { once, … }` for LUT mutations; bare top-level `:add` can run twice on first Run |

Runnable blocks use **`logts-play wave`** — open in the doc viewer and **Load & Run** (wave propagation is selected automatically).

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

Evaluate the symbol slice **inside** the `on:raise` body (or use fixed `EQ(.idx:get, …)` branches). A top-level `4wire sym = source.(pos)/4` can go **stale** across ticks in wave mode.

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

**Scaling:** for larger **N**, unroll more merge rounds (`popMin`×2 + `:add`) per osc tick, or use a fixed max-N network. **Codeword bits** still come from tracking left/right choices in a `.links` LUT — not automatic yet (see gap table). Test **2110**.

For wave + switch-driven merge, chain `on:1 { onceN, … }` blocks with separate `once` wires per tick (see [conditional-assignment.md](conditional-assignment.md)).

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
| `packet` | short gibberish + pad | Huffman bitstream shown as ASCII (`□` / `.` for non-printable bytes) |
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
- After osc / `on:raise` mutations, wires assigned once at parse time may be **stale**; use `probe`, re-assign, or `exec` a fresh `wire = .freq:get(sym)` before `show`.

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
| N-general merge + byte codebook | **Done** — test **2110** (`popMin`, writable `prefixFree` collapse) |
| Automatic tree + codewords from freqs | **Partial** — merge unrolled; codewords from merge order (script); `.links` LUT for large N |
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
