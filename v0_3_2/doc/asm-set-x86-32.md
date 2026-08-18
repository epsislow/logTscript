# ASM set: x86-32 (Intel subset, variable encoding)

The **x86-32** preset provides a **variable-length** x86 machine code blob with **Intel** operand order (`dest, src`). Declare `set: x86-32` and write familiar mnemonics: `mov eax, 5`, `add eax, ebx`, `jmp label`.

Encoding uses **byte-oriented** metadata (`byteOffset`, `byteLength`) — see [asm-set-variable8.md](asm-set-variable8.md) for the variable-encoding model. Directives **`.org`**, **`.byte`**, **`.word`**, **`.skip`**, **`.align`** are supported (phase **1+x.5**).

See also: [asm.md](asm.md), [asm-composition.md](asm-composition.md), [asm-set-arm-a32.md](asm-set-arm-a32.md), [cpu.md](cpu.md).

---

## Declaration

```logts
inline [asm] .x86:
  set: x86-32
  :
```

| Property | Value |
|----------|--------|
| `encoding` | **`variable`** |
| `wordWidth` | **8** (prog/RAM cell = one byte) |
| Syntax | **Intel** (destination first) |
| Endianness | **Little-endian** multi-byte immediates |

---

## Registers (MVP)

| Register | Index (CPU `rN`) |
|----------|-------------------|
| `eax` | `r0` |
| `ecx` | `r1` |
| `edx` | `r2` |
| `ebx` | `r3` |
| `esp` | `r4` (stack pointer — set `sp: 4` on CPU) |
| `ebp` | `r5` |
| `esi` | `r6` |
| `edi` | `r7` |

---

## Preset opcode table (MVP)

| Category | Mnemonics |
|----------|-----------|
| ALU | `mov`, `add`, `sub`, `cmp`, `and`, `or`, `xor` |
| Stack | `push`, `pop` |
| Control | `jmp`, `je`, `jne`, `call`, `ret` |
| Misc | `nop`, `int imm8` |

**Operands:** reg↔reg, reg↔imm8/imm32, reg↔`[ebp±disp8]` / `[esp±disp8]`. No prefix bytes, no SIB, no segments in MVP.

---

## Runnable — MOV / ADD / NOP

```logts-play
inline [asm] .x86:
  set: x86-32
  :

112wire demo = .x86 {
  mov eax, ebx
  mov eax, 5
  add eax, 1
  sub eax, 2
  nop
}
show(demo)
show(demo; asm)
show(.x86:decode(demo))
```

**Load:** declares `.x86` and wire `demo`.

**Load & Run:** **112 bits** (14 bytes). **`show(demo; asm)`** lists five instructions with mixed 1-, 2-, 3-, and 5-byte encodings.

---

## Runnable — stack

```logts-play
inline [asm] .x86:
  set: x86-32
  :

24wire st = .x86 {
  push eax
  pop ebx
  ret
}
show(.x86:decode(st))
```

**Load & Run:** three lines: `push eax`, `pop ebx`, `ret`.

---

## Runnable — branches and labels

```logts-play
inline [asm] .x86:
  set: x86-32
  :

80wire branch = .x86 {
  cmp eax, ebx
  je equal
  jmp done
equal:
  mov eax, 1
done:
  mov ebx, 2
}
show(branch; asm)
```

**Load & Run:** labels resolve to **byte addresses**. Short jumps (`74`/`75`/`EB`) when offset fits in **rel8**.

---

## Runnable — CPU execution (1+x.1b)

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 4
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 32
    = .x86 {
      mov eax, 10
      mov ebx, 3
      add eax, ebx
      jmp halt
    halt:
      jmp halt
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load & Run:** after **`run`**, **`r0`** (`eax`) = **13** (`000…1101`). Variable fetch uses **`instructions[PC].byteOffset`** (D32).

---

## Directives + layout

```logts-play
inline [asm] .x86:
  set: x86-32
  :

48wire vec = .x86 {
  .org 4
  .byte 0x90
  nop
}
show(vec; asm)
```

**Load & Run:** gap fill at **`.org`** = **`0x00`**, then raw byte and `nop`.

---

## Fixed vs other presets

| Aspect | `riscv32` / `arm-thumb` | `x86-32` |
|--------|-------------------------|----------|
| Encoding | `fixed` | **`variable`** |
| PC on CPU | index → fixed word | index → **byteOffset** walk |
| Syntax | per ISA | **Intel** |

---

## Errors

| Message | Cause |
|---------|--------|
| `unknown register` | Not `eax`–`edi` |
| `disp8 out of range` | Memory offset outside −128..127 |
| `require encoding: variable` | Directives on a fixed preset |
| `Cannot decode instruction at PC N` | Corrupt prog or wrong `prog.depth` (must be **8**) |

---

## Related

- [asm-set-variable8.md](asm-set-variable8.md) — variable encoding SPIKE
- [asm-set-arm-a32.md](asm-set-arm-a32.md) — ARM 32-bit preset + `use` composition
- [asm-composition.md](asm-composition.md) — multi-set `use`
- [allow-notallow.md](allow-notallow.md) — `inline.asm.set{x86-32}`
