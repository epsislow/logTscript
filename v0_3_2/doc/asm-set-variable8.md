# ASM set: variable8 (variable-length encoding SPIKE)

The **variable8** preset is a **didactic SPIKE** for phase **1+x.4** — **variable-length** machine code with a **byte-oriented blob**. Unlike `riscv32` and `arm-thumb` (fixed width per instruction), each mnemonic may encode to a **different number of bytes**.

Use it to learn and test the **`encoding: 'variable'`** assembler path before full **x86** / **ARM A32** presets. There is **no CPU native executor** for `variable8` yet — **assemble and decode only**.

See also: [asm.md](asm.md), [generic set](asm-set-generic.md), [riscv32 preset](asm-set-riscv32.md) (fixed 32-bit), [arm-thumb preset](asm-set-arm-thumb.md) (fixed 16-bit).

---

## Declaration

```logts
inline [asm] .v8:
  set: variable8
  :
```

The header ends with `:`. No opcode lines are required — the preset supplies **`w8`** and **`w16`**.

| Property | Value |
|----------|--------|
| `encoding` | **`variable`** |
| `wordWidth` | **8** (minimum storage unit — one byte per prog/RAM cell in future CPU bridge) |
| Blob layout | Concatenated **bytes** (8 bits each), no padding between instructions |

---

## Preset opcode table

| Mnemonic | Operands | Encoded size | Bit pattern (summary) |
|----------|----------|--------------|------------------------|
| `w8` | none | **1 byte** | Fixed `11000000` (0xC0) |
| `w16 imm` | 8-bit immediate `0`–`255` | **2 bytes** | `11100000` + imm8 (little-endian byte order in blob) |

Immediates use decimal or `0x…` hex (same rules as other presets). **`#` starts a comment** in LogTscript.

User opcode overrides are **not supported** in this SPIKE (`variable8 preset does not support user opcode overrides in SPIKE 1+x.4a`).

---

## Wire width

Total blob bits = **sum of instruction byte lengths × 8**. Declare the wire explicitly:

| Program | Instructions | Bytes | Wire |
|---------|--------------|-------|------|
| `w8` | 1 × 1 byte | 1 | **`8wire`** |
| `w8` + `w16 5` | 1 + 2 bytes | 3 | **`24wire`** |
| three `w16` | 3 × 2 bytes | 6 | **`48wire`** |

Strict assignment `=` requires an exact bit count. Use `show(wire)` to inspect the concatenated binary.

---

## Metadata (`byteOffset`, `byteLength`)

Assembled modules store per-instruction metadata (phase **1+x.4**, decision **D31**):

| Field | Meaning |
|-------|---------|
| `byteOffset` | Byte index of this instruction in the blob |
| `byteLength` | Length of this instruction in bytes (1 for `w8`, 2 for `w16`) |
| `kind` | `'code'` for preset mnemonics |
| `encoding` | `'variable'` on the module |

Use **`show(wire; asm)`** to list source lines; **`show(.v8:decode(wire))`** walks the blob by variable offsets.

---

## Runnable — single `w8`

```logts-play
inline [asm] .v8:
  set: variable8
  :

8wire one = .v8 { w8 }
show(one)
show(one; asm)
show(.v8:decode(one))
```

**Load:** declares ISA `.v8` and wire `one`.

**Load & Run:** `one` = `11000000` (one byte). **`show(one; asm)`** prints `w8`. **`:decode`** prints `w8`.

---

## Runnable — mixed 8-bit and 16-bit (`w8` + `w16`)

```logts-play
inline [asm] .v8:
  set: variable8
  :

24wire prog = .v8 {
  w8
  w16 5
}
show(prog)
show(prog; asm)
show(.v8:decode(prog))
```

**Load & Run:** `prog` is **24 bits** (3 bytes):

| Byte offset | Hex | Instruction |
|-------------|-----|-------------|
| 0 | `C0` | `w8` |
| 1 | `E0` | `w16` prefix |
| 2 | `05` | immediate **5** |

**`:decode`** output (two lines):

```text
w8
w16 5
```

---

## Runnable — longer sequence

```logts-play
inline [asm] .v8:
  set: variable8
  :

40wire seq = .v8 {
  w16 10
  w8
  w16 255
}
show(seq; asm)
show(.v8:decode(seq))
```

**Load & Run:** **40 bits** = 5 bytes (`w16` + `w8` + `w16`). Decode lists three lines with the immediates **10** and **255**.

---

## Runnable — labels (byte addresses, D34 preview)

Labels on variable programs resolve to **byte offsets** (not instruction indices). Branch operands are **not** part of this SPIKE preset — labels are for layout and `show` only:

```logts-play
inline [asm] .v8:
  set: variable8
  :

24wire tagged = .v8 {
entry:
  w8
  w16 42
tail:
  w16 0
}
show(tagged; asm)
```

**Load & Run:** **`entry`** at byte **0**, **`tail`** at byte **3**. Useful when combining with **1+x.5** directives (`.org`, `.byte`) later.

---

## Fixed vs variable (comparison)

| Aspect | `riscv32` / `arm-thumb` | `variable8` |
|--------|-------------------------|-------------|
| `encoding` | `fixed` | **`variable`** |
| Bits per instruction | Always 32 or 16 | **8 or 16** in this SPIKE |
| Blob decode | Split every `wordWidth` bits | Walk using **`disassembleAtOffset`** |
| CPU exec | Native executor | **Not yet** — use fixed presets for `comp [cpu]` |

---

## CPU bridge

**Not available** for `variable8` in SPIKE **1+x.4a**. Native variable fetch (`instructions[PC].byteOffset`, D32) will arrive with **x86-32** (**1+x.1**). Until then, use **`riscv32`** or **`arm-thumb`** for **`comp [cpu]`** examples ([cpu.md](cpu.md)).

---

## `doc()` and policy

```logts-play
doc(inline.asm.sets)
doc(.v8)
```

**Load & Run:** `doc(inline.asm.sets)` lists **`variable8`** with **`encoding: variable`**. `doc(.v8)` shows opcodes **`W8`**, **`W16`**.

Restrict the preset:

```logts
NotAllow inline.asm.set{variable8}
```

See [allow-notallow.md](allow-notallow.md).

---

## Errors

| Message | Cause |
|---------|--------|
| `w16 expects one immediate operand` | Missing or extra operand on `w16` |
| `w16 immediate must be 0..255` | Immediate out of range |
| `Cannot disassemble variable program — … not a whole number of bytes` | Wire bit length not multiple of 8 |
| `variable8: no matching opcode at byte N` | Corrupt blob or wrong ISA in `:decode` |
| `variable8 preset does not support user opcode overrides` | Custom mnemonic lines in ISA header |

---

## Related

- [asm.md](asm.md) — overview and preset table
- [asm-composition.md](asm-composition.md) — multi-set `use` (variable + fixed segments: **1+x.4b**)
- [asm-set-riscv32.md](asm-set-riscv32.md) — fixed 32-bit preset with CPU exec
- [asm-set-arm-thumb.md](asm-set-arm-thumb.md) — fixed 16-bit preset with CPU exec
