# PROTOCOL

A protocol generator. A protocol definition transforms named parameters into one or more fixed-length bit sequences.

Unlike [ASM](asm.md), which generates a single binary blob, a protocol may generate **multiple output channels** (`tx`, `sda`, `scl`, `mosi`, etc.).

There is **no panel UI** in v1 — logic only.

---

## Naming rules

| Rule | Example |
|------|---------|
| Instance name must start with `.` | `.uart8n1` ✓ — `uart8n1` ✗ |
| Letters and digits only (no `_`) | `.uart8n1` ✓ — `.uart_8n1` ✗ |
| Same name at declaration and use | `inline [protocol] .uart8n1:` → `.uart8n1 { … }` |

Using a protocol without the leading dot is a parse error:

```text
Expected '.' before inline instance name
(use '.uart8n1' not 'uart8n1')
```

---

## Declare vs use

| Step | Syntax |
|------|--------|
| Define protocol | `inline [protocol] .name: … :` |
| Assign outputs | `10wire tx = .uart8n1 { data = ^41 }` |
| Assign multiple outputs | `8wire mosi, 8wire sclk, 8wire cs = .spi { data = ^A5 }` |

Multi-target assignments may span lines before `=`:

```logts
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }
```

Use **`Nwire`** for assignable signal wires (same as [ASM](asm.md)). **`Nbit`** variables are also supported but are immutable bit values, not wires.

Protocol uses **`{ }`** with named parameters (`data = ^41`). ASM uses **`{ }`** with mnemonics. LUT uses **`(...)`** for lookup.

### Runnable — quick start

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
show(tx)
```

Single channel, one parameter — result on wire `tx`.

---

## Protocol structure

A protocol consists of:

* optional attributes
* one or more output channels

Example:

```logts
inline [protocol] .uart8n1:

  tx:
    0
    reverse(data 8b)
    1

:
```

---

## Output channels

Every label becomes an output channel.

Example:

```logts
inline [protocol] .spi:

  mosi:
    data 8b

  sclk:
    clock 8b

  cs:
    repeat 0 8b

:
```

This protocol produces three outputs: `mosi`, `sclk`, `cs`.

The compiler concatenates all channel outputs internally in declaration order:

```text
<mosi bits><sclk bits><cs bits>
```

Assignments split the result according to the widths on the left side (see **Runnable — SPI** below).

Multi-line assignment before `=` is supported:

```logts
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }
```

---

## Protocol attributes

Attributes appear before output channels.

```logts
inline [protocol] .spi:

  clockType: lowFirst

  ...
:
```

| Attribute | Values |
|-----------|--------|
| `clockType` | `lowFirst`, `highFirst` |
| `mode` | `assemble` (default), `parse` |
| `parseResult` | `all` (default), `collapseOnly` — **parse mode only** |
| `codebookLoad` | inline LUT name (e.g. `.huff`) — **parse mode only** |

`clockType: lowFirst` → `01010101…`

`clockType: highFirst` → `10101010…`

`mode: parse` — read from invoke param `data` / `stream` instead of assembling from params. See [`mode: parse`](#mode-parse--sequential-field-extraction).

`parseResult` and `codebookLoad` are documented in detail under [Parse-only attributes](#parse-only-attributes).

---

## Segments

Each channel contains a sequence of segments concatenated in order.

```logts
tx:
  0
  reverse(data 8b)
  1
```

→ `0 + reverse(data) + 1`

---

## Literal segments

| Form | Example |
|------|---------|
| Single bits | `0`, `1` |
| Binary | `01010101` |
| Hex | `^AA` |
| Decimal | `\42` |

---

## Parameters

Parameters are declared implicitly at first use.

```logts
data 8b
```

declares `data` with width 8 bits. Later uses may omit the width:

```logts
reverse(data)
parityEven(data)
```

Width mismatch on redeclaration is an error:

```text
Parameter 'data' was previously declared as 8b but is used here as 7b
```

---

## Built-in generators

Syntax reference:

| Generator | Example | Result |
|-----------|---------|--------|
| `reverse(param)` | `reverse(data 8b)` | bit-reversed parameter |
| `parityEven(param)` | `parityEven(data)` | `0` or `1` (even parity) |
| `parityOdd(param)` | `parityOdd(data)` | `0` or `1` (odd parity) |
| `clock Nb` | `clock 8b` | toggling waveform per `clockType` |
| `repeat(pattern, Nb)` | `repeat(0101, 8b)` | pattern tiled to total width `Nb` |
| `repeat bit Nb` | `repeat 0 8b` | single-bit shorthand (same as `repeat(0, 8b)`) |

### Runnable — reverse()

```logts-play
inline [protocol] .revtest:
  out:
    reverse(data 8b)
  :

8wire out = .revtest { data = 01000001 }
show(out)
```

`01000001` → `10000010`.

### Runnable — parityEven() / parityOdd()

```logts-play
inline [protocol] .pareven:
  out:
    parityEven(data 8b)
  :

inline [protocol] .parodd:
  out:
    parityOdd(data 8b)
  :

1wire evenPar = .pareven { data = 01100110 }
1wire oddPar  = .parodd  { data = 01100110 }
show(evenPar)
show(oddPar)
```

Four set bits (even popcount) → `parityEven` = `0`, `parityOdd` = `1`.

### Runnable — clock (`lowFirst` / `highFirst`)

```logts-play
inline [protocol] .clklow:
  clockType: lowFirst
  out:
    clock 8b
  :

inline [protocol] .clkhigh:
  clockType: highFirst
  out:
    clock 8b
  :

8wire low  = .clklow  { }
8wire high = .clkhigh { }
show(low)
show(high)
```

`lowFirst` → `01010101`, `highFirst` → `10101010`.

### Runnable — repeat

`Nb` is the **total output width** in bits. The pattern is tiled left-to-right until exactly `Nb` bits are produced — so `Nb` must be a multiple of the pattern length.

```logts-play
inline [protocol] .rep0:
  out:
    repeat 0 4b
  :

inline [protocol] .rep1:
  out:
    repeat 1 4b
  :

inline [protocol] .repPat:
  out:
    repeat(0101, 8b)
  :

4wire zeros = .rep0 { }
4wire ones  = .rep1 { }
8wire pat   = .repPat { }
show(zeros)
show(ones)
show(pat)
```

`repeat 0 4b` → `0000`, `repeat 1 4b` → `1111`, `repeat(0101, 8b)` → **`01010101`** (pattern length 4, tiled twice).

Parameter pattern:

```logts-play
inline [protocol] .repSync:
  out:
    repeat(sync 4b, 16b)
  :

16wire out = .repSync { sync = 1010 }
show(out)
```

→ **`1010101010101010`**.

| Error | Cause |
|-------|-------|
| `repeat: output width Nb is not a multiple of pattern length M` | e.g. `repeat(010, 8b)` (3 does not divide 8) |
| `Protocol decode failed: expected repeat pattern '...'` | Wire does not match tiled pattern |

---

## Runnable — UART 8N1

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
show(tx)
```

`^41` = `01000001`, reversed = `10000010`, with start `0` and stop `1` → **`0100000101`**.

---

## Runnable — UART 8E1 / 8O1

```logts-play
inline [protocol] .uart8e1:
  tx:
    0
    reverse(data 8b)
    parityEven(data)
    1
  :

inline [protocol] .uart8o1:
  tx:
    0
    reverse(data 8b)
    parityOdd(data)
    1
  :

11wire e1 = .uart8e1 { data = ^41 }
11wire o1 = .uart8o1 { data = ^41 }
show(e1)
show(o1)
```

11 bits: start + 8 data (reversed) + parity + stop. For `^41` (even popcount): 8E1 → `01000001001`, 8O1 → `01000001011`.

---

## Runnable — SPI (multi-output)

```logts-play
inline [protocol] .spi:
  clockType: lowFirst
  mosi:
    data 8b
  sclk:
    clock 8b
  cs:
    repeat 0 8b
  :

8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }

show(mosi)
show(sclk)
show(cs)
```

`^A5` → mosi `10100101`, sclk `01010101` (`lowFirst`), cs `00000000`.

Channels are concatenated in declaration order (`mosi` + `sclk` + `cs`); assignment widths split the 24-bit blob.

---

## Runnable — I2C (multi-output)

```logts-play
inline [protocol] .i2c:
  clockType: lowFirst
  sda:
    0
    address 7b
    rw 1b
    ack1 1b
    data 8b
    ack2 1b
    1
  scl:
    clock 20b
  :

20wire sda,
20wire scl
= .i2c {
  address = ^42
  rw = 0
  ack1 = 0
  data = ^55
  ack2 = 0
}

show(sda)
show(scl)
```

Invoke parameters may span multiple lines inside `{ }`. sda = 20 data bits; scl = 20-bit `lowFirst` clock.

---

## `:decode(channels...)`

Reverse a protocol encode: extract parameter values from one or more channel bit strings.

Channel order must match the protocol declaration. All literal, parity, clock, and repeat segments are verified during decode.

| Inline | Decode result | In expressions |
|--------|---------------|----------------|
| protocol | Bit values (concatenated params) | ✓ |
| lut | Address bits | ✓ — see [lut.md](lut.md#decodevalue-matchindex--address-bits) |
| asm | Text (disassembly) | ✗ — see [asm.md](asm.md#decodeinstruction) |

**Decode is not extended** to the v2 generators (`expand`, `collapse`, `length`, `lengthOf`, `withLength`, or `def` references). For Huffman-style payloads, define a separate recovery protocol (e.g. `.huffRecover` with `collapse` + `withLength`) instead of calling `:decode()` on the encoder.

### Runnable — UART single channel

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

10wire tx = .uart8n1 { data = ^41 }
8wire data = .uart8n1:decode(tx)
show(tx)
show(data)
```

`^41` → `0100000101` on `tx`; decode recovers `01000001`.

### Runnable — I2C multi-channel

```logts-play
inline [protocol] .i2c:
  clockType: lowFirst
  sda:
    0
    address 7b
    rw 1b
    ack1 1b
    data 8b
    ack2 1b
    1
  scl:
    clock 20b
  :

20wire sda,
20wire scl
= .i2c {
  address = ^42
  rw = 0
  ack1 = 0
  data = ^55
  ack2 = 0
}

7wire address,
1wire rw,
1wire ack1,
8wire data,
1wire ack2
= .i2c:decode(sda, scl)

show(address)
show(data)
```

Multi-target assignment splits the decoded parameter blob by left-side wire widths. Only the `sda` channel contributes parameters; `scl` is verified as a clock waveform.

| Error | Cause |
|-------|-------|
| `Protocol decode failed: expected ...` | Input does not match definition |
| `Expected N protocol channels but received M` | Wrong channel count |
| `Protocol output width mismatch` | Channel width mismatch |
| `Protocol decode does not support segment kind '...'` | Decode used on a protocol with v2 generators |

---

## `def` — local segments

A **`def`** block names a reusable segment sequence inside a protocol body. Reference it in channels with the def name alone (same as a segment label).

```logts
def payload:
  length(data) 8b
  data 8b

out:
  payload
```

Defs are evaluated lazily and may be referenced by `lengthOf(def)`.

### Runnable — def payload

```logts-play
inline [protocol] .pkt:
  def payload:
    length(data) 8b
    data 8b
  out:
    payload
  :

16wire out = .pkt { data = 10101010 }
show(out)
```

`length(data)` = `00001000` (8 bits), then `data` → **`0000100010101010`**.

---

## `length(param) Nb` and `lengthOf(def) Nb`

| Generator | Meaning |
|-----------|---------|
| `length(param) Nb` | Bit length of the invoke parameter at encode time, encoded as an `Nb` field |
| `lengthOf(def) Nb` | Bit length of a local def's evaluated output, encoded as an `Nb` field |

For a fixed-width parameter (`data 8b`), `length(data) 8b` is always the constant width (8 → `00001000`), not a runtime measure of semantic content.

For variable-width parameters (`data ~b`), `length(data) Nb` reflects the actual bit count passed at invoke.

### Runnable — `length` vs `lengthOf`

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

inline [protocol] .cmp:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    length(tokens) 8b
    lengthOf(encoded) 8b
  :

8wire tokenLen,
8wire encodedLen
= .cmp { tokens = 0001 }

show(tokenLen)
show(encodedLen)
```

`tokens = 0001` → 4 bits; Huffman-encoded `010` → 3 bits. **`00000100`** vs **`00000011`**.

### Runnable — length prefix + payload

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

inline [protocol] .lof:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

11wire out = .lof { tokens = 0001 }
show(out)
```

→ **`00000011010`** (3-bit length + 3-bit codeword).

---

## `withLength(data, Nb)`

Strip a length-prefixed bit stream: read the first `Nb` bits as an unsigned length, then return the next `len` bits as the payload. Used when recovering packets that were built with `lengthOf(def) Nb` + payload.

### Runnable — 8-bit length prefix

```logts-play
inline [protocol] .wl:
  out:
    withLength(data, 8b)
  :

3wire out = .wl { data = 0000001101000000 }
show(out)
```

First 8 bits = `00000011` (length 3); payload = **`010`**.

### `withLength(rest, field b)` — width from a parsed field

When the length is not a fixed prefix but comes from a field parsed earlier in the same `def`, use the field name instead of `Nb`:

```logts
def entry:
  sym 8b
  cwLen 8b
  withLength(rest, cwLen b)
```

Reads exactly `cwLen` bits (value of the `cwLen` field) into `rest`. No length prefix on the wire.

### `withLength(data, Nb, def)` — repeated parse until sub-stream exhausted

In **`mode: parse`**, read an `Nb`-bit length prefix, then parse `def` repeatedly until the sub-stream is consumed. Used for variable-length codebooks (see [huffman-v2.md](huffman-v2.md)).

```logts-play
inline [protocol] .parseEntry:
  mode: parse
  def entry:
    sym 8b
    cwLen 8b
    withLength(rest, cwLen b)
  out:
    withLength(data, 16b, entry)
  :
```

| Error | Cause |
|-------|-------|
| `withLength: def '...' consumed no bits` | Empty or malformed entry in repeated parse |
| `withLength: def '...' left N bits unconsumed` | Entry def did not consume full sub-stream |
| `parse: field 'cwLen' is not set` | `withLength(rest, cwLen b)` before `cwLen` was parsed |

---

## Feature matrix — assemble, `mode: parse`, `:decode`

Not every generator works in every direction. Use this table when choosing encode vs recover vs `:decode()`.

| Segment / generator | `mode: assemble` (default) | `mode: parse` | `:decode(channels…)` |
|---------------------|----------------------------|---------------|----------------------|
| Literals `0`, `0101`, `^AA`, `\42` | emit | verify on wire | verify |
| `param Nb` / `param ~b` | read from invoke args | **read from cursor** (`parseField`) | extract from channel bits |
| `def` + `localRef` | compose sub-segments | parse sub-stream | ✗ |
| `reverse`, `parityEven/Odd`, `clock`, `repeat` | ✓ | ✗ (use literals + fields instead) | verify + extract params |
| `length(param) Nb`, `lengthOf(def) Nb` | ✓ | ✗ | ✗ |
| `withLength(param, Nb)` | strip length prefix (assemble) | read length prefix + payload | ✗ |
| `withLength(param, field b)` | ✗ | read `field`-wide payload | ✗ |
| `withLength(stream\|data, Nb, def)` | ✗ | framed repeat-parse (`entry` loop) | ✗ |
| `expand`, `collapse`, `collapse(withLength(…), …)` | ✓ | `collapse` only (incl. nested `withLength`) | ✗ |
| `checksum(crc16, def\|param)` | append CRC | ✗ | ✗ |
| `validateChecksum(crc16, param)` | ✗ | verify CRC on **full** invoke param | ✗ |
| Attributes `codebookLoad`, `parseResult` | ✗ | parse only | ✗ |

**Rules of thumb:**

- **UART / SPI / I2C encode** → default assemble + optional `:decode()` on simple channels.
- **Huffman / framed packets** → assemble encoder + separate **`mode: parse`** recover protocol (not `:decode()` on the encoder).
- **`:decode()`** recovers only `param`-like fields from fixed layouts — not `expand`/`collapse`/`def`/`withLength`/`checksum`.

Invoke shapes:

| Mode | Example |
|------|---------|
| assemble | `123wire pkt = .encoder { tokens = …, codebook = … }` |
| parse | `32wire out = .recover { data = pkt }` or `{ stream = pkt }` |
| `:decode` | `8wire data = .uart8n1:decode(tx)` |

---

## `mode: parse` — sequential field extraction

By default protocols **assemble** bits from parameters (`mode: assemble`, implicit). Set **`mode: parse`** to read from an input bitstream instead.

| Aspect | assemble (default) | parse |
|--------|-------------------|-------|
| Direction | params → wire | wire → extracted fields |
| Field syntax | `data 8b` = emit param | `data 8b` = read 8 bits from stream |
| Literals | emit fixed bits | verify bits on wire |
| Invoke param | supply field values | supply `data` or `stream` bitstring |
| Output | concatenated channel bits | concatenated parsed field bits |

Recovery protocols (Huffman SC, checksum verify) use `mode: parse`. **`:decode()` is unchanged** — it only reverses simple assemble protocols; use a dedicated parse protocol instead.

### Runnable — parse header fields

```logts-play
inline [protocol] .parseHdr:
  mode: parse
  out:
    01001000
    keyWidth 8b
    nSym 8b
  :

16wire out = .parseHdr { data = 010010000000100000000011 }
show(out)
```

Magic `'H'` (`01001000`) verified; output = **`keyWidth` + `nSym`** → `0000100000000011`.

| Error | Cause |
|-------|-------|
| `parse: expected literal '...' but received '...'` | Magic or fixed field mismatch |
| `parse: need N bits but only M remain` | Truncated input |
| `Parse protocol requires 'data' parameter` | Missing invoke argument |

### `stream` vs `data` — the parse cursor

In **`mode: parse`**, you do **not** declare a `stream` wire in your script. At invoke time:

```logts
32wire recovered = .myParseProto { data = packet }
```

the engine wraps `packet` in an internal **ParseStream** (a read cursor over the bitstring). Each segment in `out:` runs **in order** and advances that cursor.

| Name | Where | Meaning |
|------|-------|---------|
| **`data`** | Invoke argument `{ data = packet }` | The **full input bitstring** (the whole packet). Alias: `{ stream = packet }` — same thing at invoke. |
| **`stream`** | Inside protocol segments (`withLength(stream, 16b, entry)`) | **Reserved keyword** — “read from the **current cursor**”, not a script parameter. |
| **`data`** | Inside some segments (`validateChecksum(crc16, data)`) | The **full invoke argument** again — used when a check needs the entire packet, not just unread tail. |

Think of it like a file pointer:

```text
data = packet (123 bit)                    cursor →
[···························································································]
 ↑ pos=0

out: 01001000           → verify 8 bit,           pos += 8
     keyWidth 8b        → read 8 bit,             pos += 8
     nSym 8b            → read 8 bit,             pos += 8
     codebook           → withLength(stream, 16b, entry): read 16b len + body, pos += 16+53
     validateChecksum(crc16, data)  → CRC over **whole** packet (ignores cursor)
     collapse(withLength(stream, 8b), …) → read payload len + bits from cursor, decode
```

**`withLength(stream, Nb, def)`** — from the cursor: read `Nb`-bit length, fork a sub-stream of that many bits, parse `def` repeatedly until the sub-stream is exhausted (used for codebooks).

**`withLength(rest, field b)`** — from the cursor: read exactly as many bits as the **already-parsed field** `field` says (used for variable-length codewords).

Segments such as `keyWidth 8b` also read from the cursor — you never pass `keyWidth` at invoke; it is **extracted** from the wire.

### Parsed fields (`sym 8b`, `cwLen 8b`, …)

In **`mode: parse`**, a line like `sym 8b` inside a `def` or `out:` channel is a **parse field**, not an invoke parameter:

| Syntax | Assemble | Parse |
|--------|----------|-------|
| `data 8b` | emit 8 bits from invoke arg `data` | read 8 bits from cursor into field `data` |
| `payload ~b` | emit all bits from var-width arg | read **remaining** bits in current region (`~b`) |
| `codebook` (bare def name) | expand `def codebook` segments | parse `def codebook` against cursor |

Fields parsed earlier in the same `def` can drive later segments — e.g. `cwLen 8b` then `withLength(rest, cwLen b)` reads exactly `cwLen` bits into `rest`.

**`codebookLoad`** hooks each completed `withLength(..., entry)` row: `.lut:add(sym, rest)` using those field values.

**`nSym` check:** after the codebook region, if header field `nSym` was parsed and at least one entry was loaded, entry count must equal `nSym` or parse throws.

### Parse-only attributes

Used with **`mode: parse`** on the protocol block (before `out:`).

#### `parseResult: all | collapseOnly`

Controls **what bits** the protocol invoke returns as its output wire. Parsing still runs in full (literals verified, fields read, checksum checked); only the **returned blob** is filtered.

| Value | Default | Output wire contains |
|-------|---------|----------------------|
| `all` | yes | Concatenation of every segment that produces bits: parsed fields (`keyWidth 8b`, …), `withLength`/`def` regions, **`collapse`** result, etc. Literals and `validateChecksum` contribute nothing. |
| `collapseOnly` | no | Only bits from **`collapse(...)`** segments. Header, codebook body, CRC verification — parsed/consumed but **not** included in the returned wire. |

Use **`collapseOnly`** for recover/decode protocols where the caller wants the **decoded payload only** (e.g. Huffman tokens), not a dump of every parsed field.

Default without attribute = `all`.

#### `codebookLoad: .lut`

Side-effect during parse: before reading the stream, **clear** the named writable inline LUT, then on each `withLength(..., def)` codebook entry call **`.lut:add(sym, codeword)`** (via internal `onParseEntry`). Enables recover without a pre-filled codebook — the packet carries its own LUT.

Requires a **writable** inline LUT (`writable` attribute). See [huffman-v2.md — `.huffRecoverSC`](huffman-v2.md#recover--huffrecoversc-faza-3).

#### Runnable — `parseResult: all` vs `collapseOnly`

**`all` (default)** — output = bits from parsed fields (`keyWidth`, `nSym`, …):

```logts-play
inline [protocol] .parseHdr:
  mode: parse
  out:
    01001000
    keyWidth 8b
    nSym 8b
  :

16wire fields = .parseHdr { data = 010010000000100000000011 }
show(fields)
```

→ `fields` = `0000100000000011` (8 + 8 bit, fără magic).

**`collapseOnly`** — același parse, dar wire-ul returnat conține **doar** rezultatul segmentelor `collapse(...)`. Header, codebook, `validateChecksum` rulează, dar nu apar în output. Exemplu complet: [`.huffRecoverSC`](huffman-v2.md#recover--huffrecoversc-faza-3) — `32wire recovered` = tokenii decodați (`aacb`), nu cei 123 bit ai packetului.

Dacă protocolul parse **nu** are niciun `collapse`, `collapseOnly` produce un wire **gol** (0 bit).

### Complex example — Huffman self-contained recover (`.huffRecoverSC`)

Full **parse** protocol from [huffman-v2.md — Packet SC](huffman-v2.md#packet-self-contained-sc). Combines: parse cursor, `def`/`withLength`, dynamic `keyWidth b`, `codebookLoad`, `validateChecksum`, `collapse`, `parseResult: collapseOnly`.

#### Protocol definition

```logts
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
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
```

#### Wire layout consumed by the cursor (`'aacb'` packet, 123 bit)

| Offset (bit) | Width | Section | On-wire content |
|--------------|-------|---------|-----------------|
| 0 | 8b | magic | `H` → `01001000` |
| 8 | 8b | keyWidth | ex. `00001000` (= 8) |
| 16 | 8b | nSym | ex. `00000011` (= 3) |
| 24 | 16b | cbLen | codebook body length (ex. 53) |
| 40 | 53b | codebook body | `sym 8b \| cwLen 8b \| codeword` × nSym |
| 93 | 14b | payload | `len 8b` + Huffman bits |
| 107 | 16b | CRC | CRC-16-CCITT over body (bits 0–106) |

**Total: 123 bit.** Visual layout (proportional bar):

```packet-layout
H:8,kw:8,nSym:8,cbLen:16,codebook:53,payload:14,CRC:16
```

**Parse mapping:**

| Section | Protocol segment |
|---------|------------------|
| Header | literals + `keyWidth 8b` + `nSym 8b` (cursor) |
| Codebook | `withLength(stream, 16b, entry)` → `codebookLoad` → `.huff:add` |
| CRC | `validateChecksum(crc16, data)` — full packet param |
| Payload | `collapse(withLength(stream, 8b), .huff, keyWidth b)` — output only if `parseResult: collapseOnly` |

**Codebook entry format** (defined by `def entry`, not guessed by the engine):

| Field on wire | Width | Role |
|---------------|-------|------|
| `sym` | 8b | LUT key (ASCII byte) |
| `cwLen` | 8b | Codeword length in bits |
| `rest` | `cwLen` b | Huffman codeword value |

`codebookLoad: .huff` calls `.huff:add(sym, rest)` after each parsed entry. `nSym` from the header is checked against the entry count.

#### Runnable — recover without preset codebook

Packet is **self-contained** — no `.huff:add` before invoke. LUT is rebuilt during parse.

```logts-play legacy
inline [lut] .huff:
  writable
  prefixFree
  variableDepth
  length: 256
  data { }
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

123wire packet = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
32wire recovered = .huffRecoverSC { data = packet }
8wire huffSz = .huff:size()
peek(recovered; ascii)
peek(huffSz)
```

→ `recovered` = `"aacb"`, `huffSz` = `3` (LUT rebuilt from embedded codebook). Encode side and round-trip: [huffman-v2.md](huffman-v2.md#runnable--round-trip-sc-aacb).

| Segment | Cursor / `data` | Effect |
|---------|---------------|--------|
| `01001000` | cursor | Verify magic `'H'` |
| `keyWidth 8b`, `nSym 8b` | cursor | Read header fields; `keyWidth` used later by `collapse` |
| `codebook` | cursor | Frame + entries; **`codebookLoad`** fills `.huff` |
| `validateChecksum(crc16, data)` | **full `data`** | CRC over body (123−16 bit), not tail-only |
| `collapse(withLength(stream, 8b), …)` | cursor | Read payload; output wire = decoded tokens only (`parseResult: collapseOnly`) |

---

## `expand` / `collapse` with LUT

Map a token stream through an [inline LUT](lut.md) in both directions.

| Generator | Syntax | Direction |
|-----------|--------|-----------|
| `expand` | `expand(param, .lut, keyWidth)` or `expand(param, .lut, keyWidth b)` | Concatenate `keyWidth`-bit keys → LUT values |
| `collapse` | `collapse(param, .lut, keyWidth)` or `collapse(param, .lut, keyWidth b)` | Split value stream → keys (fixed-depth LUT) or greedy prefix match ([`prefixFree`](lut.md#prefixfree) LUT) |

`keyWidth` may be a fixed width (`2b`, `8b`) or a **parameter/field name** (`keyWidth b`) whose value at invoke/parse time sets the key width dynamically (Faza 0c — Huffman packet SC).

With a **`prefixFree`** LUT, `collapse` uses greedy longest-prefix decoding (Huffman-style). See [lut.md — prefixFree](lut.md#prefixfree) and the full walkthrough in **[huffman.md](huffman.md)**.

### Runnable — expand (fixed-depth LUT)

```logts-play
inline [lut] .map2:
  depth: 2
  length: 4
  data {
    00: 01
    01: 01
    10: 10
    11: 11
  }
  :

inline [protocol] .exp:
  out:
    expand(tokens, .map2, 2b)
  :

6wire out = .exp { tokens = 000110 }
show(out)
```

`00`→`01`, `01`→`01`, `10`→`10` → **`010110`**.

### Runnable — collapse (fixed-depth LUT)

```logts-play
inline [lut] .map3:
  depth: 3
  length: 4
  data {
    00: 010
    01: 110
    10: 000
    11: 111
  }
  :

inline [protocol] .col:
  out:
    collapse(data, .map3, 2b)
  :

6wire out = .col { data = 010110000 }
show(out)
```

Fixed-depth LUT: consume 3-bit chunks → **`000110`**.

### Runnable — collapse (prefixFree / greedy)

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

inline [protocol] .col:
  out:
    collapse(data, .huff, 2b)
  :

4wire out = .col { data = 010 }
show(out)
```

Greedy decode of `010` → keys `01`, `10` → **`0001`**.

### Runnable — dynamic `keyWidth b`

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

inline [protocol] .encKw:
  def encoded:
    expand(tokens, .huff, keyWidth b)
  out:
    encoded
  :

inline [protocol] .decKw:
  out:
    collapse(withLength(data, 8b), .huff, keyWidth b)
  :

9wire out = .encKw { tokens = 00011011, keyWidth = 00000010 }
8wire back = .decKw { data = 00001001010110111, keyWidth = 00000010 }

show(out)
show(back)
```

`keyWidth = 2` → encode **`010110111`**, decode back to **`00011011`**.

Input to `expand` must be a multiple of `keyWidth` (fixed or dynamic).

| Error | Cause |
|-------|-------|
| `expand input length N is not a multiple of keyWidth M` | Token stream not aligned |
| `collapse failed: no LUT entry for value '...'` | Value not in table (fixed-depth) |
| `prefixFree collapse failed at bit offset N` | No valid prefix at position |

---

## Combined Huffman round-trip (`.huffPacket` / `.huffRecover`)

Typical pattern: encode with `lengthOf(encoded)` + `expand`; recover with `withLength` + `collapse` in a **separate** protocol (`:decode()` does not reverse `expand` directly).

**[huffman.md](huffman.md)** documents the full example: codebook layout, packet format, greedy decode trace, `length` vs `lengthOf`, dynamic width, and runnable scripts for encode-only, decode-only, and round-trip.

### Runnable — quick round-trip

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

`0001` → packet **`00000011010`** → recovered **`0001`**. Step-by-step bit layout: [huffman.md — packet layout](huffman.md#packet-layout).

---

## Static vs dynamic width (`inferProtocolWidth`)

At parse time the compiler classifies each protocol instance:

| Kind | When | `doc()` shows |
|------|------|---------------|
| **static** | All segment widths known (fixed params, fixed-depth LUT expand) | `width: static Nb` |
| **dynamic** | Variable params (`~b`), `withLength`, `prefixFree` expand/collapse, or other runtime-sized segments | `width: dynamic` |

Dynamic protocols may produce different bit counts per invoke. Assign to a wire wide enough for the maximum case, or rely on runtime width checking with `=`.

### Runnable — static vs dynamic

```logts-play
inline [lut] .table:
  depth: 4
  length: 16
  data {
    0000: 0000
    0001: 0001
    0010: 0010
    0011: 0011
  }
  :

inline [protocol] .encStatic:
  out:
    expand(tokens 8b, .table, 2b)
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

inline [protocol] .encDynamic:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :

doc(.encStatic)
doc(.encDynamic)
```

`.encStatic` → `width: static 16b`. `.encDynamic` → `width: dynamic`.

---

## `data ~b` — variable-width parameters

Append **`~b`** instead of a fixed width to declare a parameter whose bit length comes from the invoke value:

```logts
data ~b
```

At invoke, `data = 101010` supplies six bits; the protocol emits exactly six data bits (no padding).

### Runnable — length prefix + variable payload

```logts-play
inline [protocol] .packet:
  out:
    length(data) 16b
    data ~b
  :

22wire out = .packet { data = 101010 }
show(out)
```

16-bit length = `0000000000000110` (6), payload = `101010` → **`0000000000000110101010`**.

---

## `checksum` / `validateChecksum` (CRC-16-CCITT)

Append or verify a **16-bit CRC** over a preceding body segment. Algorithm: CRC-16-CCITT (polynomial `0x1021`, init `0xFFFF`), computed over the body bitstream (padded to byte boundary).

| Generator | Mode | Syntax | Effect |
|-----------|------|--------|--------|
| `checksum` | assemble | `checksum(crc16, defName)` or `checksum(crc16, param)` | Append 16-bit CRC of body bits |
| `validateChecksum` | parse | `validateChecksum(crc16, param)` | Verify last 16 bits of **full** invoke param match CRC of preceding bits |

Scope for **`checksum`**: CRC over the referenced def/param body only. For **`validateChecksum`**: `param` is the **entire packet** passed at invoke (`data`); CRC is the last 16 bits, body is everything before that (same bits the cursor walked, plus any unread tail — typically the whole packet minus CRC).

### Runnable — encode + verify

```logts-play
inline [protocol] .pktCs:
  def body:
    data 8b
  out:
    body
    checksum(crc16, body)
  :

inline [protocol] .verifyCs:
  mode: parse
  out:
    validateChecksum(crc16, data)
  :

24wire pkt = .pktCs { data = 10101010 }
1wire ok = .verifyCs { data = pkt }

show(pkt)
show(ok)
```

Body `10101010` + CRC suffix → 24-bit packet. Verify succeeds silently (empty output channel).

| Error | Cause |
|-------|-------|
| `validateChecksum: mismatch (expected ..., got ...)` | Corrupt or truncated packet |
| `validateChecksum: input shorter than checksum field` | Fewer than 16 bits after body |
| `checksum body '...' is not a local def or parameter` | Invalid def reference in encode |

---

## Not included (planned)

These generators are **not** implemented in v2:

| Planned | Purpose |
|---------|---------|
| `concat(...)` | Concatenate arbitrary segment expressions |
| `padLeft(param, Nb)` | Left-pad parameter to width |
| `padRight(param, Nb)` | Right-pad parameter to width |

Use literals, `def` blocks, and existing generators for now.

---

## doc()

```logts-play
inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :

doc(inline.protocol)
doc(.uart8n1)
```

| Call | Output |
|------|--------|
| `doc(inline.protocol)` | Declaration template, built-in generators, attributes |
| `doc(.uart8n1)` | Outputs, channel segments, parameters for that instance |
| `doc(inline)` | Lists all inline instances including protocol |

Example `doc(.uart8n1)`:

```text
.uart8n1 (inline [protocol])

  outputs:
    tx

  tx:
    0
    reverse(data 8b)
    1

  parameters:
    data 8b
```

---

## Common errors

| Error | Cause |
|-------|--------|
| Expected '.' before inline instance name | Missing leading dot |
| Parameter 'data' was previously declared as 8b but is used here as 7b | Width mismatch |
| Unknown parameter 'data' | Missing required parameter at invoke |
| Protocol output width mismatch | Left-side width ≠ generated width |
| Unknown protocol attribute | Unsupported attribute |
| clockType must be 'lowFirst' or 'highFirst' | Invalid clock type |
| parityEven() expects a parameter | Invalid argument |
| reverse() expects a parameter | Invalid argument |
| Protocol decode does not support segment kind 'expand' | `:decode()` on protocol using v2 generators |
| expand input length N is not a multiple of keyWidth M | Token stream not aligned to LUT key width |
| length(param) value N exceeds maximum for Nb field | Parameter too long for length prefix |
| withLength: input shorter than length prefix | Packet shorter than declared length |
| validateChecksum: mismatch | CRC suffix does not match body |
| parse: expected literal '...' | Fixed field mismatch in parse mode |
| parse: codebook entry count N does not match nSym M | Codebook rows ≠ header `nSym` |
| parse: need N bits but only M remain | Truncated packet / cursor overrun |
| withLength: def '...' consumed no bits | Empty or malformed framed region |
| withLength: def '...' left N bits unconsumed | Entry layout does not match wire |
| codebookLoad '…' must be a writable LUT | LUT missing `writable` attribute |
| parseResult must be 'all' or 'collapseOnly' | Invalid `parseResult` attribute |
| mode must be 'assemble' or 'parse' | Invalid `mode` attribute |
| withLength(..., def) is only supported in mode: parse | Framed def-parse in assemble protocol |
| Protocol parse does not support segment kind '…' | e.g. `expand`/`lengthOf` inside parse protocol |
| Circular protocol def reference '…' | `def` cycle via `localRef` |
| prefixFree violation | LUT codewords not prefix-free (at `codebookLoad`) |
| prefixFree collapse failed at bit offset N | Invalid Huffman bitstream at decode |

---

## `execStmts` (secondary parse)

The editor runs the full script once at **Run**. The **test harness** also supports `execStmts(interp, src)` — append extra top-level statements against the **same** interpreter (e.g. Huffman FSM ticks, then encode).

Requirements:

| Topic | Detail |
|-------|--------|
| Inline instances | Must already exist from the initial `run()` (`inline [protocol] .huffPacket:` etc.) |
| Parser disambiguation | `{ }` after `.name` is protocol if the instance is `protocol`, asm if `asm`. Secondary parse **seeds** kinds from `inlineInstances` — otherwise `.huffPacket { tokens = source }` is misparsed as asm and throws *not an asm ISA* |
| Wave session | After exec, `propagate()` runs so wires like `16wire lb = .links:get(…)` see fresh LUT data |

Example (after FSM + walk via `execStmts`):

```logts
64wire packet =: .huffPacket { tokens = source }
32wire recovered = .huffRecover { data = packet }
```

Tests **2128** (round-trip), **2116** (walk only). Wrong kind error: *Inline instance '.foo' is a protocol, not an asm ISA; use .foo { param = ... }*.

---

## vs ASM

| Feature | asm | protocol |
|---------|-----|----------|
| Generates bits | ✓ | ✓ |
| Multiple outputs | ✗ | ✓ |
| Labels | Opcodes | Channels |
| Parameters | Registers, immediates | Named fields |
| Built-in transforms | R2b, A4b, S4b | reverse, parityEven, clock, repeat |
| Typical use | Machine code | UART, SPI, I2C, custom serial |

A protocol definition is entirely generic. The compiler has no knowledge of UART, SPI, I2C, SDA, SCL, MOSI, or SCLK — these are user-defined channel and parameter names.

---

## Related

- [huffman.md](huffman.md) — Huffman coding walkthrough (`.huff` + `.huffPacket` / `.huffRecover`)
- [huffman-v2.md](huffman-v2.md) — self-contained packet SC (magic, codebook, checksum)
- [lut.md](lut.md) — `prefixFree`, `variableDepth`, LUT invoke
- [asm.md](asm.md) — single-blob machine code
- [assignment-operators.md](assignment-operators.md) — dynamic-width assignment
