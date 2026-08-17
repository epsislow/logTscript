# ASM set: generic (segment ISA)

The **generic** asm set is the original LogTscript inline assembler model: you declare each opcode as fixed bit **segments** (`0001 + R2b + A2b`), and the assembler fills in register, address, and immediate fields from the program text.

If you omit `set:` in an ISA header, **`generic` is assumed** — existing scripts keep working unchanged.

See also: [asm.md](asm.md) (overview), [asm-composition.md](asm-composition.md), [asm-microcode.md](asm-microcode.md), [riscv32 preset](asm-set-riscv32.md), [arm-thumb preset](asm-set-arm-thumb.md).

---

## When to use generic

| Use generic when… | Example |
|-------------------|---------|
| You design a custom 8/16/32-bit ISA for teaching or simulation | Mini CPU with `NOP`, `LOAD`, `JMP` |
| You need segment tokens (`R2b`, `A4b`, `S4b`) | Signed branches, absolute addresses |
| You want full control of every bit pattern | Every opcode line lists literals + fields |

Use a **preset set** (`riscv32`, `arm-thumb`) when you want real-world mnemonics and fixed encodings without writing segment patterns — see the linked preset pages.

---

## Declaration

```logts
inline [asm] .myisa:
  set: generic
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :
```

`set: generic` is optional (same body without that line behaves identically).

---

## Segment tokens (opcode table)

| Token | Width | Program syntax | Meaning |
|-------|-------|----------------|---------|
| `0000`, `1010` | fixed | (in pattern only) | Literal bits in the instruction |
| `4b` | 4 | decimal immediate | Unsigned immediate, fills 4 bits |
| `S4b` | 4 | `\ -3` or label | Signed offset or immediate (two's complement) |
| `R2b` | 2 | `R0` … `R3` | Register index encoded in 2 bits |
| `A4b` | 4 | `A0` … or `loop:` | Absolute address (label → instruction index) |

All opcodes in one ISA must encode to the same **word width** (sum of segment widths).

---

## Opcode reference (typical 8-bit teaching ISA)

| Mnemonic | Pattern | What it does (conceptually) |
|----------|---------|----------------------------|
| `NOP` | `0000 + 4b` | No operation; padding / timing slot |
| `LOAD` | `0001 + R2b + A2b` | Load from memory address `A` into register `R` |
| `STORE` | `0010 + R2b + A2b` | Store register `R` to address `A` |
| `ADD` | `0011 + R2b + R2b` | Add two registers (destination + source encoding depends on your CPU) |
| `JMP` | `0101 + A4b` | Jump to absolute address |
| `BEQ` | `0100 + S4b` | Branch if equal — signed offset from PC+1 |

Your CPU component interprets these bits; the assembler only **packs** them into a wire blob.

---

## Runnable — first program

```logts-play
inline [asm] .myisa:
  set: generic
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

8wire nop = .myisa { NOP }
8wire load = .myisa { LOAD R1 A3 }
show(nop)
show(load)
show(load; asm)
```

Arguments are separated by spaces (commas are optional). Wire width must match the assembled blob unless you use `:=` / `=:` padding — see [asm.md](asm.md#wire-width-and-assignment-operators).

---

## Labels and branches

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  BEQ   : 0100 + S4b
  :

16wire prog = .myisa {
  loop:
  NOP
  BEQ loop
}
show(prog; asm)
```

| Field | Resolves to |
|-------|-------------|
| `A4b` | Absolute instruction index of label |
| `S4b` | `target - (currentAddr + 1)` as signed offset |

---

## `doc()` and `show()`

| Call | Result |
|------|--------|
| `doc(inline.asm)` | Template syntax for any asm ISA |
| `doc(inline.asm.sets)` | Lists all preset sets (`generic`, `riscv32`, `arm-thumb`) |
| `doc(.myisa)` | Opcodes and segment patterns for your instance |
| `show(wire; asm)` | Bits + disassembly when wire has asm metadata |
| `show(.myisa:decode(wire))` | Disassemble using a specific ISA |

---

## Related

- [asm.md](asm.md) — naming, mem load, decode, errors
- [asm-composition.md](asm-composition.md) — `use`, `repeat`, `align`, `base:`
- [asm-microcode.md](asm-microcode.md) — `{ micro }` blocks on generic opcodes
- [assignment-operators.md](assignment-operators.md) — `=`, `:=`, `=:`
