# DECODE

Several inline types support reverse transformation through `:decode(...)`.

| Inline | Decode result | In expressions |
|--------|---------------|----------------|
| protocol | Bit values | ✓ |
| lut | Bit values | ✓ |
| asm | Text | ✗ (`show()` / `doc()` only) |

---

## Protocol `:decode(channels...)`

Extracts parameter values from one or more protocol channels.

```logts
8bit data =
.uart8n1:decode(
  0100000101
)
```

Multi-channel (order must match declaration):

```logts
7bit address,
1bit rw,
1bit ack1,
8bit data,
1bit ack2
=
.i2c:decode(
  sdaBits,
  sclBits
)
```

All protocol-generated segments are verified during decode.

| Error | Cause |
|-------|-------|
| `Protocol decode failed: expected ...` | Input does not match definition |
| `Expected N protocol channels but received M` | Wrong channel count |
| `Protocol output width mismatch` | Channel width mismatch |

---

## LUT `:decode(value [, matchIndex])`

Reverse lookup: value → address (key). Optional zero-based `matchIndex` when multiple keys map to the same value (default `0`).

```logts
4bit x =
.decoder:decode(
  0010
)
```

Ambiguous value:

```logts
4bit x =
.decoder:decode(
  1111,
  2
)
```

With labels:

```logts
2bit x =
.traffic:decode(
  GREEN
)
```

| Error | Cause |
|-------|-------|
| `LUT decode failed: value ... does not exist` | Value not in table |
| `LUT decode failed: match index N exceeds available matches (M)` | Invalid index |

See also [lut.md](lut.md) for `:isValid()`, labels, and constant expressions.

---

## ASM `:decode(instruction)`

Disassembly — returns **text**, not bits.

```logts
show(
  .cpu:decode(
    00010111
  )
)
```

Output example: `LOAD R1 A3`

| Error | Cause |
|-------|-------|
| `ASM decode produces text and cannot be assigned to wires` | Used in wire assignment |

Valid contexts: `show()`, `doc()`.

---

## `doc()`

```logts
doc(.uart8n1)
doc(.decoder)
doc(.cpu)
```

Protocol: `parameters:`, `channels:`, `decode: supported`.

LUT: `labels:`, `data:`, `decode: supported`.

ASM: `decode: disassembler only`, `valid contexts: show(), doc()`.

---

## Related

- [lut.md](lut.md) — labels, `isValid()`, expressions, probe/show
- [protocol.md](protocol.md) — encode / channel syntax
- [asm.md](asm.md) — ISA definition
- [debug.md](debug.md) — `show`, `probe`
