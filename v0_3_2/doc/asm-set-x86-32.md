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

## Preset opcode table (MVP + 1+x.1c-i)

| Category | Mnemonics |
|----------|-----------|
| ALU | `mov`, `add`, `sub`, `cmp`, `and`, `or`, `xor`, **`lea`**, **`inc`**, **`dec`**, **`neg`**, **`not`**, **`test`**, **`xchg`** |
| Stack | `push`, `pop` |
| Control | `jmp`, `je`, `jne`, **`jg`**, **`jge`**, **`jl`**, **`jle`**, **`ja`**, **`jae`**, **`jb`**, **`jbe`**, **`loop`**, **`loope`**, **`loopz`**, **`loopne`**, **`loopnz`**, `call`, `ret` |
| Misc | `nop`, `int imm8` |

**Operands:** reg↔reg, reg↔imm8/imm32, memory (**pattern A/B/C** below). No prefix bytes, no **SIB** (`[base+index*scale±disp]` → viitor **1+x.1c-iii**), no segments in MVP.

**CPU flags (1+x.1c-i):** `zf`, `sf`, `cf`, `of` — folosite de `cmp`/`test` și salturi condiționale.

---

## Moduri de adresare (Laborator 4 — pattern A / B / C)

Trei pattern-uri didactice (nu tabel ModR/M complet):

| Pattern | Forme | Scop |
|---------|-------|------|
| **A — Stack frame** | `[ebp±disp8]`, `[esp±disp8]`, `[ebp±disp32]`, `[esp±disp32]` | variabile pe stack, argumente |
| **B — Pointer / vector** | `[reg]`, `[reg±disp8]`, `[reg±disp32]`, `lea reg, [reg±disp]` | parcurgere buffer (`esi`, `ebx`, …) |
| **C — Absolut** | `[disp32]` | date la adresă fixă (`.org`, `.byte`) |

**Excluderi batch 1:** `[esp]` fără disp (SIB în x86 real); indexare scalată `[esi+ecx*4]` → **1+x.1c-iii**.

Memoria CPU: **1 octet per celulă prog/RAM** (`prog.depth: 8`). `[disp32]` citește/scrie un octet zero-extins la 32 de biți în registru.

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

## Runnable — D38-D2: variabilă la adresă fixă (pattern **C**)

Contor în memorie la **`0x40`**, incrementat cu **`inc`** (test **3273**).

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 12
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 80
    = .x86 {
      mov eax, [0x40]
      inc eax
      mov [0x40], eax
      jmp halt
    halt:
      jmp halt
      .org 0x40
counter: .byte 0
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load:** CPU + program cu **`[0x40]`** și **`counter`** la **`.org 0x40`**.

**Load & Run:** **`r0`** (`eax`) = **1** — octetul de la **`0x40`** a fost incrementat.

---

## Runnable — D38-D3: vector + `loop` (pattern **B**)

Sumă **`1+2+3+4+5 = 15`** cu **`ebx`** ca pointer și **`ecx`** contor (test **3269**).

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 40
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 128
    = .x86 {
      xor eax, eax
      mov ebx, 0x40
      mov ecx, 5
sumLoop:
      add eax, [ebx]
      inc ebx
      loop sumLoop
      jmp halt
    halt:
      jmp halt
      .org 0x40
vec: .byte 1, 2, 3, 4, 5
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load:** cod la **`0`**, vector la **`.org 0x40`**.

**Load & Run:** **`r0`** = **15** (`000…1111`). **`loop`** decrementează **`ecx`** (`r1`); la **`0`** iese din buclă.

---

## Runnable — D38-D4: stack frame (pattern **A** — decode)

Acces **`[ebp±disp]`** după **`mov ebp, esp`** (frame simplu; **`enter`/`leave`** → **1+x.1c-ii**).

```logts-play
inline [asm] .x86:
  set: x86-32
  :

64wire frame = .x86 {
  push ebp
  mov ebp, esp
  mov eax, [ebp-4]
  pop ebp
  ret
}
show(.x86:decode(frame))
```

**Load:** wire **`frame`** cu **`[ebp-4]`**.

**Load & Run:** decode afișează **`push ebp`**, **`mov ebp, esp`**, **`mov eax, [ebp-4]`**, **`pop ebp`**, **`ret`**.

---

## Runnable — D38-D5: `test`, `xchg`, salturi signed

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 10
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 64
    = .x86 {
      mov eax, 10
      mov ebx, 20
      xchg eax, ebx
      mov eax, 10
      mov ebx, 5
      cmp eax, ebx
      jg greater
      mov eax, 0
      jmp done
greater:
      mov eax, 99
done:
      jmp done
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load:** **`xchg`** apoi **`cmp`** + **`jg`** (signed).

**Load & Run:** **`r0`** = **99** — **`10 > 5`**, saltul **`jg`** ia ramura **`greater`**.

Demo **`test`+`je`:** **`xor eax, eax`** / **`test eax, eax`** / **`je`** — test **3265**.

---

## Runnable — decode memorie extinsă (1+x.1c-i)

```logts-play
inline [asm] .x86:
  set: x86-32
  :

88wire p = .x86 {
  mov eax, [esi]
  lea edi, [esi+4]
  mov eax, [0x20]
}
show(.x86:decode(p))
```

**Load & Run:** trei linii — **`[esi]`** (B), **`lea … [esi+4]`**, **`[0x20]`** (C). Test **3263**.

---

## Viitor — D38-D6 (SIB, 1+x.1c-iii)

Indexare scalată **`[esi+ecx*4+disp]`**, prefixe **`0x66`/`0x67`**, segmente — **neimplementat**; placeholder pentru Laborator 4 §4.2.4 avansat.

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
