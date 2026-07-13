# Protocol — assemble (encode)

Build bitstreams from named parameters. Default `mode: assemble` (implicit).

Hub: [protocol.md](protocol.md). Related: [protocol-parse.md](protocol-parse.md) (decode stream), [protocol-lut.md](protocol-lut.md) (`expand` / `collapse`), [`:decode`](protocol-assemble.md#decodechannels).

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

`mode: parse` — read from invoke param `data` / `stream` instead of assembling from params. See [protocol-parse.md](protocol-parse.md).

`parseResult` and `codebookLoad` are documented in detail under [Parse-only attributes](protocol-parse.md#parse-only-attributes).

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



Parse-side `withLength` variants (`withLength(rest, field b)`, `withLength(stream, Nb, def)`) — [protocol-parse.md](protocol-parse.md#withlength-parse).


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

## Not included (planned)

These generators are **not** implemented in v2:

| Planned | Purpose |
|---------|---------|
| `concat(...)` | Concatenate arbitrary segment expressions |
| `padLeft(param, Nb)` | Left-pad parameter to width |
| `padRight(param, Nb)` | Right-pad parameter to width |

Use literals, `def` blocks, and existing generators for now.



---

## Related

- [protocol.md](protocol.md) — hub, feature matrix, `doc()`
- [protocol-parse.md](protocol-parse.md) — `mode: parse`, `validateChecksum`
- [protocol-lut.md](protocol-lut.md) — `expand` / `collapse`
- [lut.md](lut.md) — inline LUT tables
