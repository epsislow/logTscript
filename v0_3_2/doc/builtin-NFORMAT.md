# NFORMAT

Index: [Arithmetic](arithmetic.md) · [Tagged built-ins](builtin-tagged-index.md) · [Status register (4bit)](arithmetic.md#status-4bit)

Scalar format conversion: decode source format → real value → encode destination format. Returns **`4bit status`** per [arithmetic.md — status register](arithmetic.md#status-4bit). With **`; vector`** or **`; matrix`**, conversion is per-element / per-cell; `status` is one 4-bit word per element or cell.

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
NFORMAT(Wsrc·wire[n] a; <src> to_<dst> vector) -> Wdst·wire[n] result, 4wire[n] status
NFORMAT(Wsrc·wire[n,m] a; <src> to_<dst> matrix) -> Wdst·wire[n,m] result, 4wire[n,m] status
NFORMAT(Xbit a; sX to_<dst>) -> Wdst result, 4bit status
NFORMAT((X+Y)bit a; qXpY to_<dst>) -> Wdst result, 4bit status
```

Use `doc(NFORMAT)` for the full signature list from `Interpreter.BUILTIN_DOC`.

## Call tags

Exactly **one source** tag and **one destination** tag (`to_*`). Source and destination must differ. Optional **`; vector`** or **`; matrix`** (mutually exclusive).

| Source tag | Operand width | Meaning |
|------------|---------------|---------|
| `signed` | any *W* (adaptive) | Two's complement integer on *W* bits |
| `sX` | exactly **X** (1≤X≤64) | Two's complement integer, fixed width |
| `q4p4` | **8** | Q4.4 fixed-point |
| `q8p8` | **16** | Q8.8 fixed-point |
| `qXpY` | exactly **X+Y** (≤64) | Signed fixed-point Q{X}.{Y} |
| `fp16` | **16** | IEEE 754 half |
| `bf16` | **16** | Brain float 16 |

| Destination tag | Result width |
|-----------------|--------------|
| `to_signed` | same as operand |
| `to_sX` | **X** |
| `to_q4p4` | **8** |
| `to_q8p8` | **16** |
| `to_qXpY` | **X+Y** |
| `to_fp16` | **16** |
| `to_bf16` | **16** |

**`signed`** uses the operand width adaptively; **`sX`** fixes the width (`; sX` validates the operand is exactly X bits). The same applies to `to_signed` vs `to_sX` for the result.

| Shape tag | Behaviour |
|-----------|-----------|
| *(none)* | Scalar — one operand wire |
| `vector` | Per index on rank-1 tensors (`Wwire[N]`, `Wwire[1,N]`, `Wwire[N,1]`) |
| `matrix` | Per cell on matrix `Wwire[N,M]` (`N>1`, `M>1`) |

Declare the assignment target at **`Wdst`** (result element width). Tensor shape (`n` or `n,m`) is unchanged.

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

### `; vector` — `q4p4` → `fp16` (width change)

```logts-play
8wire[2] v = 01110000 + 11110000
16wire[2] r, 4wire[2] st = NFORMAT(v; q4p4 to_fp16 vector)
show(r; fp16)
show(st)
```

Each element converted independently; `16wire[2]` target matches `Wdst=16`.

### `; matrix` — `q4p4` → `fp16`

```logts-play
8wire[2,2] m = 01110000 + 00010000 + 11110000 + 00100000
16wire[2,2] r, 4wire[2,2] st = NFORMAT(m; q4p4 to_fp16 matrix)
show(st)
```

Per-cell conversion; `status` is `4wire[2,2]` (4 bits per cell).

### Parametrized `sX` / `qXpY`

```logts-play
8wire a = 01110000
16wire r, 4wire st = NFORMAT(a; s8 to_fp16)
show(r; fp16)
```

`s8` reads the 8-bit operand as a signed integer (`112`) and converts to fp16. Use `to_sX` / `to_qXpY` to control the result width, e.g. `NFORMAT(x; q6p2 to_s16)`.
