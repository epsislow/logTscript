# NFORMAT

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Status register (4bit)](arithmetic.md#status-4bit)

Scalar format conversion: decode source format → real value → encode destination format. Returns **`4bit status`** per [arithmetic.md — status register](arithmetic.md#status-4bit).

## Signatures

```
NFORMAT(Xbit a; signed to_q4p4) -> 8bit result, 4bit status
NFORMAT(Xbit a; signed to_q8p8) -> 16bit result, 4bit status
NFORMAT(Xbit a; signed to_fp16) -> 16bit result, 4bit status
NFORMAT(Xbit a; signed to_bf16) -> 16bit result, 4bit status
NFORMAT(8bit a; q4p4 to_signed) -> 8bit result, 4bit status
NFORMAT(8bit a; q4p4 to_q8p8) -> 16bit result, 4bit status
NFORMAT(8bit a; q4p4 to_fp16) -> 16bit result, 4bit status
NFORMAT(8bit a; q4p4 to_bf16) -> 16bit result, 4bit status
NFORMAT(16bit a; q8p8 to_signed) -> 16bit result, 4bit status
NFORMAT(16bit a; q8p8 to_q4p4) -> 8bit result, 4bit status
NFORMAT(16bit a; q8p8 to_fp16) -> 16bit result, 4bit status
NFORMAT(16bit a; q8p8 to_bf16) -> 16bit result, 4bit status
NFORMAT(16bit a; fp16 to_signed) -> 16bit result, 4bit status
NFORMAT(16bit a; fp16 to_q4p4) -> 8bit result, 4bit status
NFORMAT(16bit a; fp16 to_q8p8) -> 16bit result, 4bit status
NFORMAT(16bit a; fp16 to_bf16) -> 16bit result, 4bit status
NFORMAT(16bit a; bf16 to_signed) -> 16bit result, 4bit status
NFORMAT(16bit a; bf16 to_q4p4) -> 8bit result, 4bit status
NFORMAT(16bit a; bf16 to_q8p8) -> 16bit result, 4bit status
NFORMAT(16bit a; bf16 to_fp16) -> 16bit result, 4bit status
```

Use `doc(NFORMAT)` for the full signature list from `Interpreter.BUILTIN_DOC`.

## Call tags

Exactly **one source** tag and **one destination** tag (`to_*`). Source and destination must differ.

| Source tag | Operand width | Meaning |
|------------|---------------|---------|
| `signed` | any *W* | Two's complement integer on *W* bits |
| `q4p4` | **8** | Q4.4 fixed-point |
| `q8p8` | **16** | Q8.8 fixed-point |
| `fp16` | **16** | IEEE 754 half |
| `bf16` | **16** | Brain float 16 |

| Destination tag | Result width |
|-----------------|--------------|
| `to_signed` | same as operand |
| `to_q4p4` | **8** |
| `to_q8p8` | **16** |
| `to_fp16` | **16** |
| `to_bf16` | **16** |

**No `; vector`** or **`; matrix`** in this release — scalar only.

## Behaviour

1. Decode operand as `src` format → real number.
2. Encode real number as `dst` format → `result`.
3. Set `status` (4 bits, MSB-first): overflow, underflow, inexact, nan — same layout as ADD/MULTIPLY with format tags.

| Condition | Typical `status` |
|-----------|------------------|
| Exact conversion | `0000` |
| Fixed-point out of range | `1000` (overflow) |
| Rounding / precision loss | bit2 inexact (`0010` or `1010`) |
| Float `NaN` input | `0001` (nan) |

## Examples

### `q4p4` → `fp16`

```logts-play
8wire a = \7;q4p4
16wire r, 4wire st = NFORMAT(a; q4p4 to_fp16)
show(r; fp16)
show(st)
```

`7.0` in Q4.4 converts exactly to fp16; `st = 0000`.

### `signed` → `q4p4` overflow

```logts-play
8wire a = \127;s8
8wire r, 4wire st = NFORMAT(a; signed to_q4p4)
show(r; q4p4)
show(st)
```

`127` exceeds Q4.4 range → overflow (`1000`).

### `fp16` `NaN` → `q4p4`

```logts-play
16wire nan = 0111111000000000
8wire r, 4wire st = NFORMAT(nan; fp16 to_q4p4)
show(st)
```

`status.bit3` (nan) set → `0001`.
