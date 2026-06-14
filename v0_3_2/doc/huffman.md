# Huffman coding walkthrough

End-to-end example that ties together three v0_3_2 features:

| Piece | Inline type | Role |
|-------|-------------|------|
| `.huff` | [lut](lut.md) | Prefix-free codeword table (`prefixFree` + `variableDepth`) |
| `.huffPacket` | [protocol](protocol.md) | Encode tokens → length-prefixed bit packet |
| `.huffRecover` | [protocol](protocol.md) | Decode packet → original tokens |

The goal is **variable-length compression**: frequent symbols get shorter codewords, rare symbols longer ones. The LUT holds the codebook; the protocols frame the compressed bit stream so it can be stored or transmitted and recovered later.

This page explains **why** each part exists, **what** it does at invoke time, and **how** the bits move through encode and decode.

---

## Why Huffman-style coding here?

Fixed-width fields (e.g. UART `data 8b`) waste bits when symbol frequencies are uneven. A classic Huffman code assigns shorter bit patterns to more common symbols, as long as no codeword is a prefix of another — otherwise a decoder could not tell where one symbol ends and the next begins.

In logTscript:

- **`prefixFree`** on a LUT enforces that property at parse time.
- **`variableDepth`** allows codewords of different lengths in `data { }`.
- **`expand`** maps a stream of fixed-width **keys** → concatenated **codewords** (encode).
- **`collapse`** maps a concatenated codeword stream → keys (decode); with `prefixFree`, decoding is **greedy** left-to-right prefix matching.
- **`lengthOf(encoded)`** + **`withLength`** wrap the variable-length payload in a known-length prefix so the receiver knows how many bits to decode.

`:decode()` on a protocol channel is **not** extended to these generators. Recovery is a **separate protocol** (`.huffRecover`), not a magic reverse of `.huffPacket`.

---

## The codebook — `inline [lut] .huff`

Four 2-bit **keys** (addresses `00` … `11`) map to **variable-length codewords**:

| Key (addr) | Codeword | Length |
|------------|----------|--------|
| `00` | `0` | 1 bit |
| `01` | `10` | 2 bits |
| `10` | `110` | 3 bits |
| `11` | `111` | 3 bits |

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

### `prefixFree`

At parse time every value is checked: no codeword may be a strict prefix of another (`0` vs `01` would fail). See [lut.md — prefixFree](lut.md#prefixfree).

### Lookup (encode direction)

`.huff(in = key)` or `.huff(01)` returns the codeword for that key — same as any inline LUT invoke:

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

→ **`10`**

---

## Encoding — `inline [protocol] .huffPacket`

The encoder takes a **token stream** (concatenated keys, `keyWidth` bits each) and produces one output channel: a **packet** = length prefix + compressed payload.

```logts
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
```

### Step by step at invoke

1. **`expand(tokens, .huff, 2b)`** (inside def `encoded`):
   - Split `tokens` into consecutive 2-bit chunks.
   - For each chunk, treat it as a binary address into `.huff`.
   - Append the LUT value (codeword) to the output bit string.

2. **`lengthOf(encoded) 8b`**:
   - Evaluate def `encoded` once (cached — bits are not emitted twice).
   - Emit the **bit length** of the compressed stream as an unsigned integer on 8 bits (left-padded).

3. **`encoded`** (local def reference):
   - Emit the compressed codeword stream immediately after the length field.

### Runnable — encode only

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

4wire source = 0001
11wire packet = .huffPacket { tokens = source }

show(source)
show(packet)
```

---

## Packet layout

For `tokens = 0001` the packet is **`00000011010`** (11 bits total):

```text
┌────────────────┬─────────┐
│ length (8 bit) │ payload │
│  00000011 = 3  │   010   │
└────────────────┴─────────┘
```

### How `0001` becomes payload `010`

| Token chunk | Key | LUT codeword |
|-------------|-----|--------------|
| `00` | addr 0 | `0` |
| `01` | addr 1 | `10` |

Concatenated payload: **`0` + `10` = `010`** (3 bits) → length field = **`00000011`**.

Compare with raw tokens: 4 bits in, 3 bits out for this example — compression depends on the symbol mix and codebook.

---

## Decoding — `inline [protocol] .huffRecover`

The decoder is a **separate protocol**. It does not call `:decode()` on `.huffPacket`.

```logts
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
```

### Step by step at invoke

1. **`withLength(data, 8b)`**:
   - Read the first 8 bits of `data` as unsigned length `L`.
   - Return the next `L` bits as the **payload** (compressed stream).
   - Remaining bits in `data` are ignored.

2. **`collapse(payload, .huff, 2b)`**:
   - Walk the payload left to right.
   - At each position, find the **longest** LUT value that matches the upcoming bits (greedy; valid because codewords are prefix-free).
   - Emit the matching **key** as `keyWidth` bits.
   - Repeat until the payload is consumed.

### Runnable — decode only

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

inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :

11wire packet = 00000011010
4wire recovered = .huffRecover { data = packet }

show(packet)
show(recovered)
```

→ recovered **`0001`**

### Greedy decode trace for payload `010`

| Position | Bits left | Match codeword | Key emitted |
|----------|-----------|----------------|-------------|
| 0 | `010` | `0` (addr `00`) | `00` |
| 1 | `10` | `10` (addr `01`) | `01` |

Result keys: **`0001`**

---

## Runnable — full round-trip

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

| Wire | Value | Meaning |
|------|-------|---------|
| `source` | `0001` | Original 2-bit keys × 2 |
| `packet` | `00000011010` | 8-bit length + 3-bit payload |
| `recovered` | `0001` | Matches `source` |

### Runnable — longer input, padded packet wire (`=:`)

A dynamic encoder may produce fewer bits than the wire you assign to. **`=:`** right-pads the protocol output to the declared width. The decoder only reads the length prefix and the declared payload length — **trailing pad bits are ignored**, so recovery still matches `source`.

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

8wire source = 00011011
24wire packet =: .huffPacket { tokens = source }
8wire recovered = .huffRecover { data = packet }

show(source)
show(packet)
show(recovered)
```

Four 2-bit tokens (`00`, `01`, `10`, `11`) compress to a **9-bit** payload:

| Token | Codeword |
|-------|----------|
| `00` | `0` |
| `01` | `10` |
| `10` | `110` |
| `11` | `111` |

Payload = **`01101101111`**; length field = **`00001001`** (9). The encoder emits **17 bits** total.

`24wire packet =:` stores those 17 bits and **right-pads** with seven `0` bits to fill the wire. `.huffRecover` calls `withLength(data, 8b)`, reads length **9**, takes the next **9** bits as the codeword stream, and never consults the padding — so `recovered` is again **`00011011`**.

See [assignment-operators.md — `=:`](assignment-operators.md#-right-pad-assignment) for pad semantics on wire assignment.

---

## `length(tokens)` vs `lengthOf(encoded)`

On the same invoke, the **token** bit count and the **compressed** bit count usually differ:

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

| Field | Value | Meaning |
|-------|-------|---------|
| `tokenLen` | `00000100` | 4 bits of input tokens |
| `encodedLen` | `00000011` | 3 bits of compressed payload |

`length(param)` measures the invoke argument; `lengthOf(def)` measures evaluated protocol output. Details: [protocol.md — length / lengthOf](protocol.md#lengthparam-nb-and-lengthofdef-nb).

---

## Dynamic width

`.huffPacket` is classified as **dynamic** width: output size depends on token length and the codebook. `.huffRecover` output width depends on the decoded key count inside the payload.

`doc(.huffPacket)` shows `width: dynamic`. Assign to a wire wide enough for the largest expected packet, or use runtime width checking with `=`.

See [protocol.md — static vs dynamic width](protocol.md#static-vs-dynamic-width-inferprotocolwidth).

---

## Design notes

| Topic | Detail |
|-------|--------|
| **Key width** | `2b` matches the address width of a 4-entry table. `expand` / `collapse` require the token stream length to be a multiple of `keyWidth`. |
| **Length field width** | `8b` allows payloads up to 255 bits. Use `16b` for larger frames ([`withLength`](protocol.md#withlengthdata-nb)). |
| **Separate protocols** | Encoder and decoder are independent definitions — swap codebooks or framing without changing the other side's structure. |
| **Not in scope** | `checksum()`, `concat()`, `padLeft()`, `padRight()` — add framing or integrity in user logic if needed. |
| **Tests** | Suite IDs 1069–1074 (LUT), 1078–1086 (protocol round-trip). |

---

## Related

- [lut.md](lut.md) — `variableDepth`, `prefixFree`, LUT invoke
- [protocol.md](protocol.md) — `def`, `expand`, `collapse`, `length`, `lengthOf`, `withLength`
- [assignment-operators.md](assignment-operators.md) — `=`, `=:`, `:=` for dynamic-width wires
