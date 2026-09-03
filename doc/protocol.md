# PROTOCOL

A protocol generator. A protocol definition transforms named parameters into one or more fixed-length bit sequences.

Unlike [ASM](asm.md), which generates a single binary blob, a protocol may generate **multiple output channels** (`tx`, `sda`, `scl`, `mosi`, etc.).

There is **no panel UI** in v1 — logic only.

### Documentation map

| Topic | Page |
|-------|------|
| Assemble, UART/SPI, `:decode()` | [protocol-assemble.md](protocol-assemble.md) |
| **`mode: parse`**, cursor, `rest` | [protocol-parse.md](protocol-parse.md) |
| Tentative `?`, choice groups | [protocol-tentative.md](protocol-tentative.md) |
| Section repeat `[n]`, `*`, anchor | [protocol-repeat.md](protocol-repeat.md) |
| `expand` / `collapse` / Huffman | [protocol-lut.md](protocol-lut.md) · [huffman-v2.md](huffman-v2.md) |
| JSON subset example | [json-subset.md](json-subset.md) |
| Wire string literals in protocol | [protocol-parse.md](protocol-parse.md#wire-literals-in-parse-protocol) · [wire-literals.md](wire-literals.md) |

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
| **`?` tentative sections** (`foo?`, `foo?:`) | ✗ | ordered choice + rollback | ✗ |
| **Section repeat** (`packet[n]`, `[min-max]`, `*`, `+`) | ✗ | repeat `def` — see [protocol-repeat.md](protocol-repeat.md) | ✗ |
| **`rest ~`**, **`rest -Nb`** | ✗ | consume tail / reserve footer | ✗ |
| **`parseView: tree`** | ✗ | optional structured show + `wire:section:field` | ✗ |

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

| Category | Page |
|----------|------|
| Assemble / `:decode` / generators | [protocol-assemble.md](protocol-assemble.md) |
| `expand` / `collapse` | [protocol-lut.md](protocol-lut.md) |
| `mode: parse`, cursor, CRC verify | [protocol-parse.md](protocol-parse.md) |
| Tentative `?` | [protocol-tentative.md](protocol-tentative.md) |
| Section repeat | [protocol-repeat.md](protocol-repeat.md) |

Quick reference (most frequent):

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
| parseView must be 'tree' or 'true' | Invalid `parseView` attribute |
| tentative sections require mode: parse | `?` in assemble mode |
| parse: no matching alternative | mandatory section, all branches failed |
| Protocol decode does not support tentative sections | `:decode()` on protocol with `?` |
| parseView: field '…' has no bits | field access on 0-bit branch |
| mode must be 'assemble' or 'parse' | Invalid `mode` attribute |
| withLength(..., def) is only supported in mode: parse | Framed def-parse in assemble protocol |
| Protocol parse does not support segment kind '…' | e.g. `expand`/`lengthOf` inside parse protocol |
| Circular protocol def reference '…' | `def` cycle via `localRef` |
| prefixFree violation | LUT codewords not prefix-free (at `codebookLoad`) |
| prefixFree collapse failed at bit offset N | Invalid Huffman bitstream at decode |

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

- [protocol-assemble.md](protocol-assemble.md) — segments, UART/SPI/I2C, `:decode`, `def`, `length`
- [protocol-parse.md](protocol-parse.md) — `mode: parse`, cursor, `rest`, `validateChecksum`
- [protocol-tentative.md](protocol-tentative.md) — `?` choice groups
- [protocol-repeat.md](protocol-repeat.md) — `[n]`, `*`, anchor
- [protocol-lut.md](protocol-lut.md) — `expand` / `collapse`
- [json-subset.md](json-subset.md) — JSON subset cookbook
- [huffman.md](huffman.md) · [huffman-v2.md](huffman-v2.md) — Huffman packets
- [lut.md](lut.md) — inline LUT
- [asm.md](asm.md) — single-blob machine code
- [assignment-operators.md](assignment-operators.md) — dynamic-width assignment
