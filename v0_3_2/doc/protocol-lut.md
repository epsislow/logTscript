# Protocol — LUT transforms (`expand` / `collapse`)

Map token streams through an [inline LUT](lut.md) in both directions. Used for Huffman-style encode/decode.

Hub: [protocol.md](protocol.md). Full walkthrough: [huffman.md](huffman.md). Self-contained packet SC: [huffman-v2.md](huffman-v2.md).

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

## Related

- [protocol-assemble.md](protocol-assemble.md) — `length` / `lengthOf` / `withLength` encode
- [protocol-parse.md](protocol-parse.md) — `collapse` in `mode: parse`, `codebookLoad`
- [huffman.md](huffman.md) — packet layout and round-trip trace
- [huffman-v2.md](huffman-v2.md) — `.huffRecoverSC` self-contained recover
- [lut.md](lut.md) — `prefixFree`, `variableDepth`
