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

## Preset opcode table (MVP + 1+x.1c-i/ii)

| Category | Mnemonics |
|----------|-----------|
| ALU | `mov`, `add`, `sub`, `cmp`, `and`, `or`, `xor`, `lea`, `inc`, `dec`, `neg`, `not`, `test`, `xchg`, **`mul`**, **`imul`**, **`div`**, **`idiv`** |
| Stack | `push` (reg sau **imm32**), `pop`, **`enter`**, **`leave`** |
| Control | `jmp`, `je`, `jne`, `jg`, `jge`, `jl`, `jle`, `ja`, `jae`, `jb`, `jbe`, `loop`, `loope`, `loopz`, `loopne`, `loopnz`, `call`, `ret` |
| Misc | `nop`, `int imm8` |

**Mul/div (1+x.1c-ii):** formă simplă cu acumulator implicit — `mul ebx` → `eax × operand`, rezultat în **`edx:eax`**; `div ebx` → `edx:eax ÷ operand`, cât în **`eax`**, rest în **`edx`**. La **`div`/`idiv` cu divisor 0:** rezultat pedagogic în **`eax`**, **`divByZero ← 1`** (ca riscv32), fără oprire simulator.

**Operands:** reg↔reg, reg↔imm8/imm32, memory (**pattern A/B/C/D** below). Prefixe **`0x66`** (operand 16-bit) și **`0x67`** (adresare 16-bit) sunt emise **automat** când sintaxa folosește registre **`ax`–`di`** / **`[bx]`/`[si]`/`[bx+di]`** etc. Fără segmente în MVP.

**CPU flags (1+x.1c-i/ii):** `zf`, `sf`, `cf`, `of` — `cmp`/`test` și salturi; **`inc`/`dec` nu modifică `cf`** (comportament Intel); `cf` la `add`/`sub` pentru salturi unsigned (`jb`/`ja`/…).

---

## Moduri de adresare (LogTscript — pattern A / B / C / D)

Preset-ul grupează operanzii de memorie în **pattern-uri didactice** (nu tabel ModR/M complet). Operandii **immediat** și **registru** sunt baza MVP; pattern-urile A–D acoperă **memoria**.

| Clasă | Pattern | Forme sintaxă | Exemple | Scop | Stare |
|-------|---------|---------------|---------|------|-------|
| **Immediat** | — | `reg, imm8/imm32` | `mov eax, 10`, `add eax, 1` | constante în cod | ✅ 1+x.1 |
| **Registru** | — | `reg, reg` | `mov eax, ebx`, `add eax, ebx` | ALU rapid, fără memorie | ✅ 1+x.1 |
| **Memorie** | **A — stack frame** | `[ebp±disp8]`, `[esp±disp8]`, `[ebp±disp32]`, `[esp±disp32]` | `mov eax, [ebp-4]` | variabile locale, argumente stack | ✅ 1+x.1c-i |
| **Memorie** | **B — pointer / vector** | `[reg]`, `[reg±disp8]`, `[reg±disp32]`, `lea reg, [reg±disp]` | `mov eax, [ebx]`, `lea edi, [esi+4]` | parcurgere buffer, pointeri | ✅ 1+x.1c-i |
| **Memorie** | **C — absolut** | `[disp32]`, label ca adresă | `mov eax, [0x40]`, `mov [counter], al` | date la `.org`, variabile fixe | ✅ 1+x.1c-i |
| **Memorie** | **D — indexat scalat (SIB)** | `[base+index*scale±disp]`, scale `*1/2/4/8` | `mov eax, [esi+ecx*4]`, `add eax, [ebx+edi*2+8]` | tablouri tipizate, structuri compuse | ✅ 1+x.1c-iii-a |

**Registre bază/index permise (pattern B/D):** `eax`–`edi`, `ebp`, `esi` (ca în subsetul Intel 32-bit al preset-ului).

**Reguli pattern D (1+x.1c-iii-a):**

- scale **1, 2, 4, 8**; sintaxă unificată Intel: `[base+index*4+8]`, nu `[base][index]`;
- **`esp` nu e index** (conform x86); **`[esp+disp]`** prin SIB cu index absent — **`[esp]`** simplu rămâne respins;
- fără prefixe segment (`fs:`/`gs:`) — subfază **1+x.1c-iii-c** (skip MVP).

**Prefixe (1+x.1c-iii-b):**

| Prefix | Rol în mod 32-bit | Când se emite |
|--------|-------------------|---------------|
| **`0x66`** | operand **16-bit** | registre **`ax`–`di`**, ex. `mov ax, bx` |
| **`0x67`** | adresare **16-bit** (8086) | **`[si]`**, **`[bx+di]`** — doar **`bx/bp/si/di`** |

**Memorie CPU:** **1 octet per celulă** prog/RAM (`prog.depth: 8`). Citirea 8-bit zero-extinde; cu **`0x66`**, citirea **word** (2 octeți LE) zero-extinde la 32 de biți.

**Operandi neacoperiți (amânat):** `rep` / șiruri cu ESI/EDI implicit, segmente `fs:`/`gs:`, x86-64 — vezi **1+x.1c-iii-c/iv** și **1+x.1d**.

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

## Runnable — D38-D4: stack frame (pattern **A** — `enter`/`leave`)

Frame cu **`enter`** / **`leave`** (test **3286**). Alocarea **`enter N, 0`** folosește **`N` octeți** (convertiți la sloturi stack / 4).

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
    length: 48
    = .x86 {
      push 42
      enter 0, 0
      leave
      pop eax
      jmp halt
    halt:
      jmp halt
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load & Run:** **`r0`** = **42** — valoarea supraviețuiește frame-ului.

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

## Runnable — mul / div + `divByZero` (1+x.1c-ii)

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 8
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 32
    = .x86 {
      mov eax, 6
      mov ebx, 7
      mul ebx
      jmp halt
    halt:
      jmp halt
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load & Run:** **`r0`** (`eax`) = **42** (6×7). Teste **3278**, **3280** (`div`), **3282** (`divByZero`).

---

## Runnable — `push imm32` (1+x.1c-ii)

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 6
  ram:
    depth: 32
    length: 16
  prog:
    depth: 8
    length: 32
    = .x86 {
      push 100
      pop eax
      jmp halt
    halt:
      jmp halt
    }
  :

.u:{ run = 1 }
show(.u:r0)
```

**Load & Run:** **`r0`** = **100** (opcode **`68`** + imm32). Test **3284**.

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

## Runnable — D38-D6: tablou scalat (pattern **D** — SIB)

Sumă peste **3 dword-uri** la pas **`*4`**: **`[esi+ecx*4]`** (test **3292**). Date la **`.org 0x40`** — octetul LSB al fiecărui dword (zero-extins la citire).

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
  prog:
    depth: 8
    length: 128
    = .x86 {
      xor eax, eax
      xor ecx, ecx
      mov esi, 0x40
      mov ebx, 3
sumLoop:
      add eax, [esi+ecx*4]
      inc ecx
      dec ebx
      jne sumLoop
      jmp halt
    halt:
      jmp halt
      .org 0x40
tab: .byte 10, 0, 0, 0, 20, 0, 0, 0, 30, 0, 0, 0
    }
  :
```

**Load & Run:** `eax = 60` (`10+20+30`). Compară cu **D38-D3** (vector octeți, pattern **B** + `loop`).

---

## Runnable — prefix **0x66** (operand 16-bit)

`mov ax, bx` / `add ax, bx` emit **`0x66`** automat; rezultatul ocupă **16 biți** în registrul 32-bit (partea superioară păstrată). Teste **3298**, **3300**.

```logts-play
inline [asm] .x86:
  set: x86-32
  :

80wire p16 = .x86 {
  mov ax, 5
  mov bx, 10
  add ax, bx
}
show(.x86:decode(p16))
```

**Load:** wire **`p16`** cu trei instrucțiuni 16-bit.

**Load & Run:** decode arată **`mov ax, …`**, **`add ax, bx`**; primul byte al wire-ului = **`0x66`**.

### CPU — `add ax, bx` → 15

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 8
  prog:
    depth: 8
    length: 32
    = .x86 {
      mov ax, 5
      mov bx, 10
      add ax, bx
      jmp halt
    halt:
      jmp halt
    }
  :
```

**Load & Run:** **`r0`** (`eax`) = **15** — sumă pe **`ax`/`bx`**.

---

## Runnable — prefix **0x67** (adresare 16-bit)

**`[si]`**, **`[bx+di]`** folosesc registre **8086** (`si`, nu `esi`) → prefix **`0x67`**. Teste **3302**, **3304**.

```logts-play
inline [asm] .x86:
  set: x86-32
  :

64wire a16 = .x86 {
  mov ax, [si]
  lea bx, [bx+di]
}
show(.x86:decode(a16))
```

**Load & Run:** decode: **`mov ax, [si]`**, **`lea bx, [bx+di]`**; combinație tipică **`66 67`** când operandul e tot 16-bit.

### CPU — `mov ax, [si]`

```logts-play
inline [asm] .x86:
  set: x86-32
  :

comp [cpu] .u:
  isa: .x86
  registers: 8
  sp: 4
  on: 1
  maxSteps: 8
  prog:
    depth: 8
    length: 80
    = .x86 {
      mov si, 0x40
      mov ax, [si]
      jmp halt
    halt:
      jmp halt
      .org 0x40
val: .byte 0x2a
    }
  :
```

**Load & Run:** **`r0`** = **42** (`0x2a`) — citire **word** de la **`[si]`** (octet la **`0x40`**, zero-extins în **`ax`**).

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
