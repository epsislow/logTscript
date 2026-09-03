# Protocol — `mode: parse`

Sequential **field extraction** from a bitstream. The parse cursor walks `data` (or `stream`) and verifies literals, reads fields, and optionally builds a **parseView** tree.

Hub: [protocol.md](protocol.md). Related: [protocol-tentative.md](protocol-tentative.md), [protocol-repeat.md](protocol-repeat.md).

---

## Invoke

```logts-play legacy
inline [protocol] .parseHdr:
  mode: parse
  out:
    magic 8b
    len 16b
  :

24wire out = .parseHdr { data = 01001000 + 00000000 + 00010000 }
show(out)
```

| Parameter | Role |
|-----------|------|
| `data` | Full packet bitstream (default) |
| `stream` | Alias for `data` in some generators |

Output wire width may be **dynamic** when sections repeat or use `rest ~`. Use `=:` when the declared wire is wider than extracted fields.

### Parse from sock

When `data` (or `stream`) is a **sock** reference:

| Invoke | Behaviour |
|--------|-----------|
| `{ data = rx }` | **Peek** — parse uses a snapshot; sock length unchanged |
| `{ data << rx }` | **Consume** — each protocol `read` cuts from the sock front; on parse error the sock is restored (transaction) |

```logts-play wave
inline [protocol] .parseHdr:
  mode: parse
  parseView: tree
  out:
    01001000
    opcode 4b
    len 8b
  :

sock rx
rx << 0100100010101100000111110000
12wire hdr =: .parseHdr { data << rx }
show(BITSIZE(rx))
show(hdr:opcode)
```

Wire arguments still use `{ data = packet }` only. See [sock.md — Protocol + sock](sock.md#protocol--sock) for the Wave streaming pattern.

---

## Literals vs fields

| Line in `def` / `out` | Parse behaviour |
|-----------------------|-----------------|
| `0101` | Verify bits; **not** in output blob |
| `kind 8b` | Read 8 bits into field `kind`; **in** output blob |
| `rest ~` | Consume all remaining bits (last segment only) |
| `rest -4b` | Consume `remaining − 4`, leave footer |

---

## Wire literals in parse protocol

Protocol lines accept a **subset** of [wire-literals.md](wire-literals.md):

| Form | Example | Notes |
|------|---------|-------|
| Binary | `01010101` | as today |
| Wire string | `"true"`, `"{"`, `'x'` | 8 bits per character |
| Decimal pad | `\123;8` | unsigned, fixed width |
| Hex pad | `^7B;8` | pad to width |
| Hex short | `^7B` | minimal width (no pad) |
| Decimal short | `\10` | minimal unsigned width |

```logts-play legacy
inline [protocol] .litDemo:
  mode: parse
  out:
    "Hi"
  :

16wire chk =: .litDemo { data = 01001000 + 01101001 }
show(chk)
```

Use **local `def` wrappers** for tentative string choice (`trueLit?` / `falseLit?`) — literal lines cannot take `?` directly.

---

## Attributes (parse)

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `parseView` | `tree`, `true` | Structured `show()` + `wire:section:field` access |
| `parseResult` | `all`, `collapseOnly` | Include/exclude collapse payload in output |
| `codebookLoad` | `.lutName` | Load LUT from embedded codebook during parse |

---

## `mode: parse` — overview

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

## `withLength` (parse)

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

## Complex example — `.huffRecoverSC`

Full **parse** protocol for self-contained Huffman packet SC — cursor, `def`/`withLength`, `codebookLoad`, `validateChecksum`, `collapse`, `parseResult: collapseOnly`.

**Runnable definition, wire layout, and step-by-step cursor mapping:** [huffman-v2.md — Packet SC / `.huffRecoverSC`](huffman-v2.md#recover--huffrecoversc-faza-3).

Short invoke (packet must be built separately):

```logts-play legacy
123wire packet = ^4808 0300 3561 0131 014C 6058 31C4 63 + 111
32wire recovered = .huffRecoverSC { data = packet }
peek(recovered; ascii)
```

## `rest ~` and `rest -Nb`

| Syntax | Meaning |
|--------|---------|
| `rest ~` | consume **all** bits until EOF — only as **last** segment of the protocol |
| `rest -4b` | consume `remaining − 4`, leave 4 bits for a fixed suffix (e.g. footer `1111`) |

```logts-play
inline [protocol] .restFoot:
  mode: parse
  def ipv4:
    0100
    src 32b
  def ethernet:
    ipv4?
    unknown?:
      rest -4b
  out:
    0000
    ethernet
    1111
  :

32wire out = .restFoot { data = 0000 + 0100 + repeat(1,32) + 1111 }
show(out)
```

Tentative choice around `rest` — [protocol-tentative.md](protocol-tentative.md).

---

## `checksum` / `validateChecksum` (CRC-16-CCITT)

Append or verify a **16-bit CRC** over a preceding body segment. Algorithm: CRC-16-CCITT (polynomial `0x1021`, init `0xFFFF`), computed over the body bitstream (padded to byte boundary).

| Generator | Mode | Syntax | Effect |
|-----------|------|--------|--------|
| `checksum` | assemble | `checksum(crc16, defName)` or `checksum(crc16, param)` | Append 16-bit CRC of body bits |
| `validateChecksum` | parse | `validateChecksum(crc16, param)` | Verify last 16 bits of **full** invoke param match CRC of preceding bits |

Encode side (`checksum`) — [protocol-assemble.md](protocol-assemble.md#checksum--validatechecksum-crc-16-ccitt).

### Runnable — verify on parse

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

## Section repeat

For `packet[n]`, `packet*`, anchor footers, and `parsed:packet:0:field`, see **[protocol-repeat.md](protocol-repeat.md)**.

---

## Related

- [protocol.md](protocol.md) — hub
- [protocol-tentative.md](protocol-tentative.md) — `?` choice groups
- [protocol-repeat.md](protocol-repeat.md) — section repeat `[n]`, `*`
- [protocol-lut.md](protocol-lut.md) — `expand` / `collapse`
- [huffman-v2.md](huffman-v2.md) — `.huffRecoverSC`
