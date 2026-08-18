---
name: ASM Set Profiles
overview: "Profile AsmSet pentru inline ASM — set: generic implicit, preset-uri riscv32/arm-thumb, extindere opcodes (D3), policy inline.asm.set{…} (D9), bridge CPU via isa: (D7-A), asmSetId pe AsmModule (D10), blob fix wordWidth per set"
todos:
  - id: confirm-d9-riscv-empty
    content: "Confirmare user: D9, D10, corp gol preset, scope riscv32 1.3"
    status: completed
  - id: f1-1-registry
    content: "Faza 1.1: AsmSet registry + parseIsaHeader + set: generic implicit + teste backward compat"
    status: completed
  - id: f1-2-generic
    content: "Faza 1.2: Profil generic formalizat + validare segmente per set + doc(inline.asm.sets)"
    status: completed
  - id: f1-3-riscv
    content: "Faza 1.3: Preset riscv32 + parser operanzi + round-trip + composition use (D13)"
    status: completed
  - id: f1-4-thumb
    content: "Faza 1.4: Preset arm-thumb 16-bit + composition multi-width (D13) + doc"
    status: completed
  - id: f1-5-ext-policy
    content: "Faza 1.5: policy inline.asm.set{}, CPU bridge, asmSetId, composition + micro tests (D13/D14)"
    status: completed
  - id: f1x3a-riscv-exec
    content: "1+x.3a: Executor CPU riscv32 MVP (D15–D21, subset D20)"
    status: pending
  - id: f1x3b-thumb-exec
    content: "1+x.3b: Executor CPU arm-thumb (după riscv32 POC)"
    status: pending
  - id: f1x3c-riscv-ext
    content: "1+x.3c: riscv32 extended — mul/div, lb/lh/sb/sh, fence, ecall, FP"
    status: pending
  - id: f1x-deferred
    content: "1+x.1+ (amânat): x86, variable-length, directives .byte/.word, CPU multi-set routing"
    status: pending
isProject: false
---

# Plan: Profile de set de instrucțiuni (AsmSet) pentru inline ASM

Introducerea unui sistem modular de profile de arhitectură (AsmSet) în inline ASM, păstrând comportamentul actual ca `set: generic` implicit, și adăugând preset-uri (ex. RISC-V, ARM Thumb) cu posibilitate de extindere.

**Documentație existentă (user):** [v0_3_2/doc/asm.md](../v0_3_2/doc/asm.md) · [asm-composition.md](../v0_3_2/doc/asm-composition.md) · [asm-microcode.md](../v0_3_2/doc/asm-microcode.md)

Relaționat: [faza_7_micro_asm.plan.md](faza_7_micro_asm.plan.md) · [comp_cpu.plan.md](comp_cpu.plan.md) · [asm_composition_use.plan.md](asm_composition_use.plan.md)

---

## Starea codului (aug 2026)

**AsmSet: implementat (faze 1.1–1.5)** — registry, preset-uri `generic`/`riscv32`/`arm-thumb`, policy `inline.asm.set{}`, metadata `asmSetId`, composition multi-set + teste 3176–3196 (2538 teste).

**Lipsește:** executor CPU nativ per preset (1+x.3a) — `cpuStep` încă cade în legacy pentru preset fără micro.

Inline ASM rămâne un **mini-asamblor declarativ** — fără x86/ARM/RISC-V preset „din cutie” până la implementarea acestui plan. Utilizatorul definește manual fiecare ISA (sau va folosi preset-uri după 1.3+):

```logts
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  :
```

**Pipeline actual:**

```mermaid
flowchart LR
  decl["inline [asm] .name:"] --> parseIsa["parseIsaBody()"]
  parseIsa --> inst["inlineInstances Map"]
  use[".name { MNEM args }"] --> assemble["assembleProgramModule()"]
  assemble --> blob["wire / mem blob"]
  blob --> cpu["cpuStep() legacy/micro"]
```

**Fișiere cheie (v0_3_2):**

| Fișier | Rol |
|--------|-----|
| [`v0_3_2/core/asm-assembler.js`](../v0_3_2/core/asm-assembler.js) | Parsare ISA, encode/decode, asamblare program |
| [`v0_3_2/core/parser.js`](../v0_3_2/core/parser.js) L5212–5288 | `parseInline()`, `parseAsmProgramRaw()` |
| [`v0_3_2/core/interpreter.js`](../v0_3_2/core/interpreter.js) L1866–1888 | `execInline()` — înregistrează ISA |
| [`v0_3_2/devices/cpu-devices.js`](../v0_3_2/devices/cpu-devices.js) L616–647 | Execuție CPU (legacy hardcodat + micro opțional) |
| [v0_3_2/doc/asm.md](../v0_3_2/doc/asm.md) | Documentație sintaxă segmente `R/A/S/imm` |

**Ce lipsește:** orice concept de arhitectură/ISA preset. Operanzii sunt fixi (`R1`, `A3`, `\18`), `wordWidth` fix per ISA, fără variabile pe set.

**Concluzie:** soluția potrivită este un **strat AsmSet modular** deasupra motorului existent, nu înlocuirea lui.

### Deja livrat (planurile dependente subestimează progresul)

| Feature | Plan vechi | Realitate în cod |
|---------|------------|------------------|
| Micro ASM (faza 7) | pending | `consts`/`macros`/bloc `{ micro }` în `parseIsaBody`; `cpuRunMicroSequence` în [`cpu-devices.js`](../v0_3_2/devices/cpu-devices.js) |
| ASM composition | pending | `use`, `repeat`, `align`, `base:` în `parseProgramBodyRaw`; `asmModuleId` pe fire în [`interpreter.js`](../v0_3_2/core/interpreter.js) |

**Implicație:** faza 1.x pornește pe motor matur; nu așteptăm alte planuri. Compoziția `use` + preset multi-ISA trebuie testată explicit în 1.5.

---

## Direcție recomandată

### Model: `set:` la declararea ISA + registry de profile

Sintaxă propusă (backward compatible — fără `set:` = comportament actual):

```logts
inline [asm] .myisa:
  set: generic          # implicit dacă lipsește
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  :

inline [asm] .riscv:
  set: riscv32          # preset complet — corp gol sau minimal
  :

inline [asm] .rv_ext:
  set: riscv32
  FOO   : 0000000 + 00010 + 000 + 00000 + 0000000 + 0000000 + 1110011
  :
```

**Principii de design:**

1. **`generic`** = exact ce există azi (segmente `0000 + R2b + A4b`, operanzi `R/A/label`)
2. **Preset-urile** livrează opcodes + reguli de operanzi + lățime cuvânt
3. **Extindere (D3):** opcodes declarate după `set:` se **suprapun/adaugă** peste preset — de la faza 1.1; fără directivă `extends:` separată
4. **Modular:** fiecare set = modul JS în `v0_3_2/core/asm-sets/`, înregistrat central
5. **Execuția CPU** — legată de obiectul `inline [asm]` referit prin `isa:` (D7-A); encode/decode și simulare rămân straturi distincte

### Arhitectură țintă

```mermaid
flowchart TD
  decl["ISA declaration cu set:"] --> parseSet["parseIsaHeader()"]
  parseSet --> registry["AsmSetRegistry"]
  registry --> generic["generic profile"]
  registry --> riscv["riscv32 profile"]
  registry --> thumb["arm-thumb profile"]
  parseSet --> merge["merge preset + user opcodes"]
  merge --> inst["inlineInstances + asmSet metadata"]
  prog[".isa { program }"] --> progParser["parseProgramBody per set"]
  progParser --> encode["encodeInstruction per set"]
  encode --> blob["binary blob"]
```

### Structură fișiere noi

```
v0_3_2/core/
  asm-set-registry.js      # registry + resolve + merge
  asm-sets/
    generic.js             # profil formalizat (comportament actual)
    riscv32.js             # primul preset real
    arm-thumb.js           # al doilea preset (faza 1.4)
```

**Interfață profil AsmSet (contract):**

```js
{
  id: 'riscv32',
  label: 'RISC-V RV32I',
  wordWidth: 32,
  encoding: 'fixed',           // 'fixed' | 'variable' (1+x)
  endianness: 'little',
  operandGrammar: 'riscv',     // parser args program
  defaultOpcodes: { ... },     // același format ca opcodes din parseIsaBody
  opcodeOrder: [...],
  consts: {},
  macros: {},
  parseProgramArg(token, ctx),  // opțional — override per set
  validateOpcode(def, set),     // opțional
}
```

Contract profil + flux: `parseIsaHeader → registry → merge → inlineInstances.asmSet`.

---

## Decizii confirmate

| ID | Decizie | Status |
|----|---------|--------|
| D1 | Directive `set:`; **`generic` implicit** dacă lipsește | Confirmat |
| D2 | `set:` **doar în declarația ISA** (`inline [asm] .name:`), nu în blocul `{ program }` | Confirmat |
| D3 | OpCodes user **extind și suprascriu** preset-ul (merge după `set:`) — **singurul** mecanism de extindere; nu există `extends:` | Confirmat |
| **D3b** | **`extends:` respins** — redundant cu `set:` + opcodes user; nu se implementează | **Confirmat** |
| D4 | Primul preset real: **RISC-V RV32I** | Confirmat |
| D5 | Al doilea preset: **ARM Thumb 16-bit** | Confirmat |
| D6 | x86/x86-64 | Amânat 1+x |
| **D7** | **Opțiunea A:** CPU doar cu `isa: .name`; `asmSet` moștenit din `inlineInstances`; `doc(.cpu)` afișează `asmSet` read-only | **Confirmat** |
| D8 | Policy per set Allow/NotAllow | Confirmat |
| **D9** | Sintaxă policy: **`inline.asm.set{…}`** — extindem parserul Allow/NotAllow (nu `module.type{}`) | **Confirmat** |
| **D10** | Metadata `asmSetId` pe AsmModule (lângă `asmModuleId`) | **Confirmat** |
| **D11** | Corp ISA gol cu preset (`set: riscv32` + `:`) — merge preset, fără eroare „no opcodes” | **Confirmat** |
| **D12** | Faza 1.3 riscv32: **assemble + decode**; exec CPU pe set amânat (1+x.3) | **Confirmat** |
| **D13** | **ASM composition** (`use`, `repeat`, `align`, `base:`) funcționează cu preset-uri AsmSet | **Confirmat** — obligatoriu în implementare |
| **D14** | **Microcode** pe seturi noi: model stratificat (vezi secțiune dedicată) | **Confirmat** |
| **D15** | **Routing exec CPU:** micro → executor nativ AsmSet → legacy **doar** `generic`; set non-generic fără micro/executor → **eroare** | **Confirmat** |
| **D16** | Executor nativ pe **profil AsmSet** (`executeInstruction` în `asm-sets/*.js`); `cpuStep` = router subțire | **Confirmat** |
| **D17** | **D17-A:** mapare directă `xN` → `c.regs[N]`; **eroare la init CPU** dacă `registers` / `regDepth` ≠ cerințele profilului | **Confirmat** |
| **D18** | **D18-A:** PC = **index instrucțiune** (nu adresă byte RV); `prog[PC]` fetch | **Confirmat** |
| **D19** | **D19-A:** `lw`/`sw` word-aligned, `ram[index]` cu `index = byteAddr >> 2`; `ram.depth` = wordWidth profil | **Confirmat** |
| **D20** | Exec MVP = subset encode faza 1.3; extensii (mul, div, lb/lh, fence, ecall, FP) → **1+x.3c** | **Confirmat** |
| **D21** | CPU decode/exec cu **profil unic** din `isa:` (fără metadata per instrucțiune); prog heterogen/raw permis la load — comportament nedorit **documentat**, fără eroare/warning | **Confirmat** |
| **D22** | **1+x.3a** = proof of concept riscv32; **arm-thumb exec** → 1+x.3b | **Confirmat** |

### D1 — Default `generic`

Lipsa directivei `set:` este echivalentă cu `set: generic`. Comportament identic cu implementarea actuală; testele existente rămân valide fără modificări.

```logts
inline [asm] .myisa:     # asmSet = generic (implicit)
  NOP : 0000 + 4b
  :
```

### D7 — Integrare `comp [cpu]` și AsmSet (Opțiunea A confirmată)

**Starea actuală** ([`v0_3_2/core/components/cpu.js`](../v0_3_2/core/components/cpu.js), [`v0_3_2/devices/cpu-devices.js`](../v0_3_2/devices/cpu-devices.js)):

```logts
inline [asm] .cpuisa:
  NOP : 0000 + 4b
  ...

comp [cpu] .u:
  isa: .cpuisa          # referință la instanța inline [asm]
  prog: = .cpuisa { NOP; HALT }
  :
```

Flux: `isa: .cpuisa` → `isaRef` pe CPU → `ctx.inlineInstances.get(isaRef)` → opcodes, consts, macros, microProgram. **CPU nu are atribut `set:` separat.**

| Opțiune | Descriere | Verdict |
|---------|-----------|---------|
| **A** | Doar `isa: .name`; CPU citește `asmSet` din instanța inline referită | **Confirmat** |
| B | Atribut nou `set:` pe `comp [cpu]` | Respingem — redundant |
| C | Snapshot ISA la init | Parțial via `isaRef`; extindem cu `asmSetId` pe AsmModule (D10), nu duplicare pe CPU |

**La implementare (faza 1.5 / 1+x.3):**

- `execInline()` stochează `asmSet` pe instanța `.cpuisa`
- `cpuStep()` continuă să rezolve ISA via `c.isaRef`, citește `isaInst.asmSet` pentru routing execuție (legacy vs micro vs executor per-set viitor)
- `doc(.cpu)` afișează `isa: .cpuisa` + `asmSet: riscv32` (moștenit, read-only)
- Fără atribut `set:` duplicat pe CPU

### D8 / D9 — Policy per set (`inline.asm.set{…}`)

**Confirmat:** sintaxa user-facing oglindește atributul ISA `set:`:

```logts
Allow inline.asm.set{generic riscv32 arm-thumb}
NotAllow inline.asm.set{x86}

inline [asm] .rv:
  set: riscv32    # OK dacă valoarea e în Allow
  :
```

Parserul Allow/NotAllow acceptă azi doar `moduleName.type{tokens}`. **Extindem parserul** ([`parser.js`](../v0_3_2/core/parser.js) `_parsePolicyEntries`):

- Recunoaște pattern **`inline.asm.set{…}`** (ID `inline` + `.asm` + `.set` + `{`)
- Dimensiune policy internă: moduleName **`inline.asm.set`** (sau echivalent în `UsagePolicy`)
- Token-uri: `generic`, `riscv32`, `arm-thumb`, … — aceleași ID-uri ca valorile `set:` din registry
- Validare la `execInline()`: `usagePolicy.isModuleAllowed('inline.asm.set', asmSetId)`
- Registry + resolve token în [`policy-type-modules.js`](../v0_3_2/core/policy-type-modules.js)
- `doc(Allow)` / `doc(NotAllow)` afișează `inline.asm.set{…}`
- Documentat în [`allow-notallow.md`](../v0_3_2/doc/allow-notallow.md)

### D10 — Metadata `asmSetId` pe AsmModule

Pe lângă `asmModuleId` existent, stocăm `asmSetId` la `_registerAsmModule()` — `:decode`, `show(wire; asm)` și compoziția `use` știu ce profil/format de operanzi au fost folosite, chiar dacă ISA user a suprascrie opcodes din preset.

### D11 — Corp ISA gol cu preset

`set: riscv32` + `:` fără opcodes user → merge preset complet; **`parseIsaBody` nu mai aruncă** „ISA definition has no opcodes” după merge.

### D12 — Scope faza 1.3 (riscv32)

Livrabile 1.3: **encode + decode round-trip** (`show(wire; asm)`, `.rv:decode(wire)`). **Exec CPU** pe riscv32 → **1+x.3** (executor per AsmSet).

### D3 / D3b — Extindere: doar `set:` + opcodes user (fără `extends:`)

**Ce face extinderea (de la faza 1.1):**

```logts
inline [asm] .rv_ext:
  set: riscv32              # 1) alege profil din registry
  FOO : ... + ...           # 2) opcodes user: adaugă sau suprascriu preset (D3)
  HALT: ... { micro ... }   # 3) poate suprascrie și execuția (micro), dacă e cazul
  :
```

Flux: `resolveAsmSet('riscv32')` → merge `defaultOpcodes` + opcodes user → ISA final pe instanță.

**`extends:` — respins definitiv (D3b):** nu există în cod/doc; nu se planifică. Era o propunere echivalentă cu `set:` + D3, eliminată din plan.

### De ce „ambiguitate” la `extends:` dar nu la `set:`?

Ambiguitatea nu era „opcodes extra” — asta e clar și merge prin D3. Problema era **moștenire în lanț**, sugerată de cuvântul *extends* (model OOP):

| Interpretare greșită posibilă cu `extends:` | Planificat? |
|-----------------------------------------------|-------------|
| `extends: .alt_isa` — moștenesc altă instanță `inline [asm]` user | Nu |
| Lanț preset: `.c` extends `.b` extends `riscv32` | Nu |
| Două linii `extends:` în același ISA | Nu |

**`set:` nu are aceeași ambiguitate** pentru că:

1. **O singură linie**, **o singură valoare** — alege profil din **registry fix** (`generic`, `riscv32`, `arm-thumb`), nu referință la alt `.myisa`
2. **Un nivel de merge:** preset registry + opcodes din **același** corp ISA (D3) — nu lanț ISA→ISA
3. **Semantica e „profil/template”**, nu „class extends class”

Reguli explicite (implementare + doc):

- Cel mult un `set:` per declarație; duplicate → eroare parse
- Valoarea trebuie ID valid din registry; `set: .other_isa` → eroare
- OpCodes user = override/add pe presetul ales, nu moștenire de la alt inline

Compoziție între module ASM rămâne separată: directive **`use`** în blocul `{ program }` ([asm-composition.md](../v0_3_2/doc/asm-composition.md)), nu în declarația ISA.

---

## Model binar: encode, decode, CPU (D12 + întrebări user)

### Cum arată binary-ul pentru noile seturi?

**Același model ca azi:** blob = concatenare de **cuvinte fixe** (`wordWidth` biți), fără metadata în biți.

| Set | `wordWidth` | Exemplu per instrucțiune |
|-----|-------------|---------------------------|
| `generic` (custom) | ce definești tu (ex. 8, 16) | `0000` + `R2b` + `A4b` → 8 biți |
| `riscv32` | **32** | un cuvânt RV32I (ex. `addi x1,x0,5` → 32 biți little-endian în blob) |
| `arm-thumb` | **16** | un halfword Thumb → 16 biți per instrucțiune |

Profilul preset definește opcodes (segmente biți) + parser operanzi (sintaxă `addi x1, x0, 5` vs `LOAD R0 A0`). **Motorul de blob nu se schimbă** — doar lățimea cuvântului și regulile encode/decode per set.

```logts
128wire prog = .rv { addi x1, x0, 5; add x3, x1, x2 }
# prog = 64 biți (2 × 32) — aceeași structură wire ca la generic, alt wordWidth
```

### Program asamblat: binary + AsmModule (ca azi)

Când scrii `.rv { … }` sau `comp [cpu] prog: = .rv { … }`:

1. **blob** pe wire/storage — biți concatenați
2. **AsmModule** (metadata): `instructions[]`, mnemonici/args sursă, `word` per instrucțiune, `isaRef`, **`asmSetId`** (D10), `asmModuleId` pe wire

`show(prog; asm)` — decode din metadata (sursa originală), ca azi.

### Wire doar binary, fără asmModule — se poate decoda?

| Situație | Decode |
|----------|--------|
| Wire din `.rv { … }` | Da — `asmModuleId` + `show(wire; asm)` sau `.rv:decode(wire)` |
| Wire raw (`128wire x = ^…` sau literal biți), **fără** `asmModuleId` | **`show(wire)`** = doar biți (neschimbat) |
| Wire raw + ISA explicit | Da — **`show(.rv:decode(x))`** — [`evalAsmDecode`](../v0_3_2/core/interpreter.js) apelează `disassembleProgram(isa, bits)` dacă nu există modul |
| Wire raw, fără ISA | **Nu** — nimeni nu știe wordWidth/opcodes; trebuie `.numeisa:decode(wire)` sau wire asamblat cu metadata |

**Condiții decode explicit** (`.rv:decode(wire)`):

- Lungime biți **multiplu de** `wordWidth` (32 pentru riscv32)
- Biții respectă opcode-urile din instanța `.rv` (preset merge-uit + override user)
- Faza 1.3 extinde **`disassembleInstruction`** pentru formatare operanzi RISC-V (`x1`, nu `R1`)

### CPU: binary în prog + exec (viitor)

```logts
comp [cpu] .u:
  isa: .rv
  prog: = .rv { addi x1, x0, 5 }   # sau = wireRaw fără metadata
  :
```

| Aspect | Azi / 1.3–1.5 | 1+x.3 (exec CPU per set) |
|--------|----------------|---------------------------|
| **Fetch** | Citește cuvânt fix din prog (depth = wordWidth) | La fel — blob e același |
| **Decode trace** | Via `isaRef` → opcodes instanță `.rv` | La fel + `asmSetId` |
| **Execute** | `cpuStepLegacy` (generic 4-bit) sau micro pe opcode | Executor pe **`asmSet`** (riscv32, etc.) |
| **prog = raw binary** | Merge dacă `depth`/`length` OK; **decode** necesită `isa:` | **Exec** necesită `isa:` — CPU știe setul din instanță, nu din blob |

**Răspuns scurt:** da, noile seturi **se encodifică și se decodifică** ca blob fix-width; metadata AsmModule e opțională dar utilă; binary gol poate fi decodat **doar cu ISA explicit**; CPU va putea executa binary-ul același (inclusiv raw) **când** implementăm exec pe set (1+x.3) **și** CPU are `isa: .rv` (D7-A).

---

## ASM composition cu AsmSet (D13)

Composition (`use`, `repeat`, `align`, `base:`, etichete externe) **există deja** în [`asm-assembler.js`](../v0_3_2/core/asm-assembler.js). Cu AsmSet trebuie să **rămână validă** și extinsă pentru preset-uri — nu e feature separat, e **criteriu de acceptanță** în fiecare fază relevantă.

### Comportament țintă

```logts
inline [asm] .boot:
  set: generic
  NOP : 0000 + 4b
  :

inline [asm] .app:
  set: riscv32
  :

8wire bootBlob = .boot { NOP }
128wire app = .app {
  use bootBlob: base: 0
  addi x1, x0, 5
}
show(app; asm)
```

| Aspect | Reguli |
|--------|--------|
| **`use`** | Wire-ul referit are propriul `isaRef` + **`asmSetId`** (din modulul asamblat); segment compus păstrează ISA/set per instrucțiune |
| **Multi-set în același blob** | Permis — ex. segment `generic` 8b + segment `riscv32` 32b concatenați (ca azi multi-ISA); **fără** presupunere de `wordWidth` unic pe tot modulul |
| **`:decode` / `show(wire; asm)`** | `formatModuleDecode` folosește **`ins.isa` + `ins.asmSetId`** per instrucțiune (nu doar ISA principal) |
| **`base:` / labels** | Neschimbat — resolve pe adrese instrucțiuni; validare cross-set la patch externe |
| **Metadate modul** | `module.segments[]`: `isaRef`, **`asmSetId`**, `wordWidth`, `blobOffset`, `instrCount` per segment |
| **Instrucțiuni index** | Fiecare entry din `instructions[]`: `word`, `isa`, `isaRef`, **`asmSetId`**, `wordWidth` (per instrucțiune) |

### Implementare (pe faze)

- **1.1:** la merge preset, propagăm `asmSetId` pe instanța inline; module simple (fără `use`) stochează `asmSetId` pe modul
- **1.3:** teste composition: `use` wire riscv32 + corp riscv32; decode corect pe ambele segmente
- **1.4:** test `use` cu `arm-thumb` (16b) + `riscv32` (32b) — demonstrează `wordWidth` heterogen
- **1.5:** teste E2E composition + policy + CPU `isa:` (decode/trace pe segmente mixte)

### Limitări acceptate (MVP)

- **Nu** impunem același `set:` pe program și pe wire-ul `use` — combinații libere dacă encode/decode per segment reușesc
- **CPU exec** pe blob compus multi-set: CPU folosește **un singur profil** din `isa:` (D21); metadata per instrucțiune e pentru `:decode`, nu pentru fetch CPU; prog heterogen ca input CPU → comportament nedorit documentat, fără eroare la load

---

## Microcode pe seturi noi (D14)

Micro ASM ([`asm-microcode.md`](../v0_3_2/doc/asm-microcode.md)) **există** pentru ISA **generic/custom**: `consts`, `macros`, `{ micro }` per mnemonic, dual legacy/micro în [`cpu-devices.js`](../v0_3_2/devices/cpu-devices.js).

**Preset-urile (`riscv32`, `arm-thumb`) nu livrează microProgram implicit** — doar opcodes + parser operanzi (faza 1.3–1.4). Exec nativ pe set → **1+x.3**.

### Model stratificat (3 căi)

```mermaid
flowchart TD
  subgraph encode [Assemble / decode — 1.3+]
    Preset[preset opcodes]
    UserOpc[user opcodes D3]
    Preset --> Merge[ISA merge-uit]
    UserOpc --> Merge
  end

  subgraph exec [Exec pe comp cpu]
    Micro{opcode are microProgram?}
    Legacy[cpuStepLegacy generic]
    MicroEng[cpuRunMicroSequence]
    Native[executor asmSet 1+x.3]
    Micro -->|da| MicroEng
    Micro -->|nu, generic set| Legacy
    Micro -->|nu, preset set| Native
  end

  Merge --> Micro
```

| Cale | Când | Cine |
|------|------|------|
| **1. Encode/decode** | Întotdeauna | Profil AsmSet — fără micro |
| **2. Micro user (D3)** | User adaugă `{ micro }` pe mnemonic (inclusiv override preset) | Motor micro **existent** — opcodes cu `microProgram` |
| **3. Exec nativ** | Preset fără micro | **1+x.3** — `cpuStep` pe `asmSetId` |

### Reguli micro + preset

1. **`consts:` / `macros:`** rămân în header ISA (după `set:`) — merge cu preset; valabile pentru orice set dacă user le declară
2. **Override cu micro (D3):**

```logts
inline [asm] .rv_cpu:
  set: riscv32
  consts:{ MAR = ^10; MDR = ^11; ... }
  addi : ...pattern... {    # suprascrie preset addi
    # micro sequence — demo didactic
  }
  :
```

3. **Operanzi decodați → micro:** motorul micro azi citește `fields.R`, `fields.A`, `fields.imm` din [`decodeMnemonicFromBits`](../v0_3_2/core/asm-assembler.js) (segmente `reg`/`addr`/`imm`). Preset-urile RISC-V/Thumb definesc segmente compatibile sau hook **`mapDecodedFieldsForMicro(fields, asmSet)`** pe profil (faza 1.3+ dacă e nevoie pentru demo micro pe preset)
4. **Preset fără `{ micro }` + CPU `isa: .rv`** → encode/decode OK; **exec** e no-op/legacy greșit până la 1+x.3 — documentat (D12)
5. **Composition + micro:** fiecare segment păstrează opcodes/consts/micro de la **instanța ISA referită**; micro rulează doar dacă CPU `isaRef` pointează la instanța cu microProgram pentru mnemonicul decodat (comportament actual extins)

### Ce NU facem în MVP

- MicroProgram **complet pe fiecare** mnemonic RISC-V din preset (efort enorm, duplică 1+x.3)
- `riscv16` / preset fictiv — respins (vezi discuție RV32/RVC)

### Doc + teste

- Secțiune în `asm-sets.md` / `asm-microcode.md`: „Micro pe preset — override opțional (D3); exec preset fără micro → 1+x.3”
- Test 1.5: `set: generic` cu micro mixt + `use` wire `riscv32` (composition + metadata)
- Test opțional 1.3: un mnemonic riscv32 suprascrie cu `{ micro }` + CPU step pe acel opcode only

---

## Faza 1.3 riscv32 — scope confirmat (D12)

```mermaid
flowchart LR
  subgraph f13 [Faza 1.3]
    prog[".rv { addi x1, x0, 5 }"] --> encode["encodeInstruction riscv32"]
    encode --> blob["wire blob 32-bit"]
    blob --> decode["show(wire; asm) / :decode"]
  end
  subgraph f15 [Faza 1.5]
    cpu["comp [cpu] isa: .rv"] --> meta["compInfo.asmSetId read-only"]
  end
  subgraph f1x [1+x.3]
    exec["cpuStep executor per AsmSet"]
  end
  f13 --> f15
  f15 --> f1x
```

**De ce nu exec CPU în 1.3:**

- [`cpuStepLegacy`](../v0_3_2/devices/cpu-devices.js) e hardcodat pe opcode-uri 4-bit — **incompatibil RISC-V**
- Motor micro există, dar microProgram pe **fiecare** mnemonic RISC-V = efort mare, duplică 1+x.3
- Cale practică interim: utilizatorul poate **suprascrie** un mnemonic preset cu bloc `{ micro }` (D3 + dual execution deja live) pentru demo punctual — fără obligație în preset

**Livrabil 1.3:** subset (`addi`, `add`, `sub`, `lui`, `lw`, `sw`, `beq`, `bne`, `jal`, `jalr`, `nop`), registre `x0`–`x31`, teste `{ src → blob → disassemble → compare }`, decode explicit pe wire raw fără asmModule.

---

## Faze de implementare

### Faza 1.1 — Infrastructură AsmSet registry

**Scop:** suport `set:` fără schimbare de comportament.

**Modificări:**

- [`asm-assembler.js`](../v0_3_2/core/asm-assembler.js): `parseIsaHeader(raw)` — citește `set:`, `consts:`, `macros:` înainte de opcodes; merge preset
- Nou [`asm-set-registry.js`](../v0_3_2/core/asm-set-registry.js): `registerAsmSet()`, `resolveAsmSet(id)`, `mergeIsaWithSet(userIsa, preset)`
- [`interpreter.js`](../v0_3_2/core/interpreter.js) `execInline()`: stochează `asmSet`, `asmSetLabel` pe instanță
- [`asm-sets/generic.js`](../v0_3_2/core/asm-sets/generic.js): profil explicit cu `id: 'generic'`, fără opcodes preset
- Teste: ISA fără `set:` trece identic; `set: generic` echivalent; `set: unknown` → eroare clară
- `doc(inline.asm)` + `formatInstanceDoc()` — afișează `set: …`

**Backward compatibility:** 100% — lipsa `set:` = `generic`.

---

### Faza 1.2 — Formalizare profil `generic` + validare pe set

**Scop:** reguli explicite pentru setul actual.

- Mută logica `parseFieldToken`, `parseArgToken`, `resolveArgValue` sub responsabilitatea profilului `generic`
- Validare: dacă `set: riscv32` dar opcodes folosesc tokeni `R2b`/`A4b` → eroare „segment token 'R2b' invalid for set 'riscv32'”
- `doc(inline.asm.sets)` — listă profile disponibile + scurtă descriere
- Teste negative: segmente greșite pe set greșit

---

### Faza 1.3 — Preset `riscv32` (RV32I subset)

**Scop:** primul set real, fixed 32-bit — **assemble/decode only** (fără CPU exec).

**Preset include (subset practic):**

- `addi`, `add`, `sub`, `lui`, `lw`, `sw`, `beq`, `bne`, `jal`, `jalr`, `nop` (alias)
- Registre: `x0`–`x31` (alias `zero`, `ra`, `sp`, …)
- Immediat: `addi x1, x0, 42`
- Labels: `beq x1, x0, loop`

**Modificări:**

- [`riscv32.js`](../v0_3_2/core/asm-sets/riscv32.js): tabel opcodes + `parseProgramArg` / `parseInstructionLine`
- `parseProgramBodyRaw`: delegare când set ≠ generic
- Corp preset-only + teste round-trip, `show(wire; asm)`, erori operanzi invalizi
- **Composition (D13):** `use` + `base:` cu wire/module preset; `instructions[].asmSetId`; decode per segment
- Doc: secțiune RISC-V în [`asm.md`](../v0_3_2/doc/asm.md) sau `asm-sets.md`

**Exemplu țintă:**

```logts
inline [asm] .rv:
  set: riscv32
  :

128wire prog = .rv {
  addi x1, x0, 5
  addi x2, x0, 3
  add x3, x1, x2
}
show(prog; asm)
```

---

### Faza 1.4 — Preset `arm-thumb` (16-bit subset)

**Scop:** al doilea set, demonstrează modularitatea.

- Thumb-16 subset: `movs`, `adds`, `subs`, `b`, `beq`, `ldr`, `str`
- Registre `r0`–`r7`, sintaxă ARM Thumb clasică
- `wordWidth: 16`
- Teste + doc user
- **Composition (D13):** test segment 16b `use`-uit în program 32b (sau invers)

---

### Faza 1.5 — Policy, CPU bridge, metadata, composition + micro

- Parser Allow/NotAllow: **`inline.asm.set{generic riscv32 arm-thumb}`** (D9)
- CPU: propagare `asmSet` din `isaRef` → `cpuStep()`; `doc(.cpu)` afișează set moștenit (D7-A)
- [`cpu.js`](../v0_3_2/core/components/cpu.js): `compInfo.asmSetId` copiat din `isaInst.asmSet` la init
- `asmSetId` pe AsmModule (D10) în `_registerAsmModule()`
- Regenerare [`ui/doc-data_generated.js`](../v0_3_2/ui/doc-data_generated.js) dacă e workflow existent
- Teste: policy blochează `set:` nepermis; CPU cu `isa: .rv` (riscv32) decode corect
- **Teste composition (D13):** multi-set `use` + `:decode`; metadata `segments[]` cu `asmSetId`
- **Teste micro (D14):** generic micro + `use` preset; opțional override `{ micro }` pe un mnemonic preset

---

## Faza 1+x.3 — Executor CPU per AsmSet

### Obiectiv

`comp [cpu] isa: .rv` execută preset **riscv32** nativ (fără micro pe fiecare mnemonic). Generic rămâne pe `cpuStepLegacy`.

### Flux exec (D15, D16)

```mermaid
flowchart TD
  step[cpuStep] --> fetch["fetch prog[PC] — wordWidth = prog.depth"]
  fetch --> decode["decodeMnemonicFromBits(isa + asmSet)"]
  decode --> micro{microProgram?}
  micro -->|da| microEng[cpuRunMicroSequence]
  micro -->|nu| native{asmSet.executeInstruction?}
  native -->|da| execNat[executor profil]
  native -->|nu| generic{asmSetId === generic?}
  generic -->|da| legacy[cpuStepLegacy]
  generic -->|nu| err["Error: no executor for set"]
  execNat --> pcNext[actualizează PC / halted]
  legacy --> pcNext
  microEng --> pcNext
```

### Contract profil (extindere interfață)

Pe lângă encode/decode, profilul preset expune:

```js
{
  // cerințe CPU — validate la init comp [cpu] (D17)
  cpuRequirements: {
    regCount: 32,      // registers:
    regDepth: 32,      // = ram.depth pentru date; prog.depth = wordWidth
    progDepth: 32,
  },
  executeInstruction(c, ctx, isaInst, decoded, instrBits) {
    // return { nextPc } sau throw; poate seta c.halted
  },
}
```

`generic` păstrează `executeInstruction: null` → legacy.

### Decizii 1+x.3 (detaliu)

| ID | Regulă |
|----|--------|
| **D15** | Fără fallback legacy pe set non-generic |
| **D17** | `xN` → `c.regs[N]`; mismatch `registers`/`regDepth`/`prog.depth` vs `cpuRequirements` → **eroare init** |
| **D18** | PC = index instrucțiune; branch offset în unități de **instrucțiune** |
| **D19** | `lw`/`sw`: `index = (rs1 + imm) >> 2`; nealiniat la 4 → eroare runtime |
| **D20** | Subset MVP exec = subset encode 1.3 (vezi tabel mai jos) |
| **D21** | Prog = raw binary, mem externă, sau blob compus — CPU decodează tot cu profilul `isa:`; doc: prog multi-arhitectură pe un singur CPU = nedefinit |
| **D22** | Sub-faze: 3a riscv32 → 3b thumb → 3c extended RV |

### Subset D20 — MVP 1+x.3a (exec)

| Mnemonic | Exec MVP |
|----------|----------|
| `addi`, `add`, `sub`, `lui` | Da |
| `lw`, `sw` | Da (D19-A) |
| `beq`, `bne`, `jal`, `jalr` | Da |
| `nop` | Da |

### 1+x.3c — extensii riscv32 (după POC)

| Categorie | Mnemonici planificate |
|-----------|----------------------|
| M extension | `mul`, `div`, … |
| Load/store byte/half | `lb`, `lh`, `lbu`, `lhu`, `sb`, `sh` |
| System | `fence`, `ecall`, `ebreak` |
| Floating point | `fadd`, `fmul`, … (sub-set de decis) |

Fiecare grup = encode + decode + exec + teste (același model ca MVP).

### Sub-faze

| ID | Livrabil |
|----|----------|
| **1+x.3a** | Router `cpuStep`; `executeInstruction` riscv32; validare init CPU; teste ALU/branch/mem; doc `cpu.md` |
| **1+x.3b** | Executor `arm-thumb` (subset movs/adds/subs/…) |
| **1+x.3c** | Extindere riscv32: mul/div, byte/half mem, fence/ecall, FP |

### Modificări fișiere (1+x.3a)

| Fișier | Schimbare |
|--------|-----------|
| [`cpu-devices.js`](../v0_3_2/devices/cpu-devices.js) | Router D15; apel `asmSet.executeInstruction` |
| [`asm-sets/riscv32.js`](../v0_3_2/core/asm-sets/riscv32.js) | `cpuRequirements` + executor subset D20 |
| [`cpu.js`](../v0_3_2/core/components/cpu.js) | Validare init vs `cpuRequirements` |
| [`doc/cpu.md`](../v0_3_2/doc/cpu.md), [`asm-set-riscv32.md`](../v0_3_2/doc/asm-set-riscv32.md) | Exec nativ, D18/D19/D21 |
| `tests/test_suite.js` | E2E riscv32 CPU (addi, loop beq, lw/sw) |

### Teste acceptanță 1+x.3a

1. `addi` + `add` → registru corect, `x0` read-only
2. `beq` loop simplu
3. `lw`/`sw` round-trip RAM (word-aligned)
4. Init CPU cu `registers: 4` + `isa: .rv` → eroare
5. Preset fără micro, fără executor (mock) → eroare step, nu legacy
6. Prog raw `= ^hex` cu același `isa:` → exec OK

### Exemplu țintă

```logts
inline [asm] .rv:
  set: riscv32
  :

comp [cpu] .u:
  isa: .rv
  registers: 32
  on: 1
  ram:
    depth: 32
    length: 64
    = ^0
  prog:
    depth: 32
    length: 16
    = .rv {
      addi x1, x0, 5
      addi x2, x0, 3
      add x3, x1, x2
      sw x3, 0(x0)
      halt: beq x0, x0, halt
    }
  :

.u:{ set = 1 }
show(.u:ram:0)
```

*(Ultima instrucțiune: infinite loop sau mnemonic HALT user cu micro — de aliniat la subset; alternativ `jalr` spre sine.)*

---

## Amânat (1+x)

| ID | Feature | Motiv amânare |
|----|---------|---------------|
| 1+x.1 | **x86 / x86-64** | Variable-length encoding, prefixe, ModR/M |
| 1+x.2 | **ARM Cortex-A (ARM + Thumb-2 mixt)** | Mix 16/32-bit, IT blocks |
| **1+x.3a** | **Executor riscv32 MVP** | **Următorul pas** — D15–D22 |
| **1+x.3b** | **Executor arm-thumb** | După POC riscv32 |
| **1+x.3c** | **riscv32 extended** (mul/div, lb/lh, fence, ecall, FP) | După 3a |
| 1+x.4 | **Variable wordWidth per instrucțiune** | Blob concatenare fixă; x86 necesită model byte-oriented |
| 1+x.5 | **Directives per set** (`.byte`, `.word`, `.org`) | Utile pentru x86/ARM |
| 1+x.6 | **Integrare assembler extern** (Capstone/LLVM MC) | Overkill pentru simulare |
| 1+x.7 | **Endianness runtime** | Metadata acum; aplicare la encode multi-byte |
| 1+x.8 | **CPU routing multi-set per fetch** (metadata-independent) | D21: doc comportament nedorit e suficient pentru MVP |

---

## Alte îmbunătățiri recomandate

1. **Metadata pe AsmModule** — `asmSetId` (D10)
2. **Round-trip test harness** — pentru fiecare preset: `{ src → blob → disassemble → compare }`
3. **`show(.isa:decode(wire))` cu set** — decode folosește set-ul din metadata
4. **Erori contextualizate** — `riscv32: unknown register 'eax' (expected x0–x31)`
5. **Template doc per set** — `doc(inline.asm.set:riscv32)` cu mnemonici + exemple
6. **Separare encode vs exec** — AsmSet = asamblor; CPU = simulator via `isa:` (D7)
7. **Policy list syntax** — documentat în allow-notallow: `inline.asm.set{riscv32 arm-thumb}`

---

## Riscuri și mitigări

| Risc | Mitigare |
|------|----------|
| Complexitate parser per set | Contract AsmSet cu hook-uri opționale; generic rămâne default |
| Breaking changes | `set:` opțional; teste existente nemodificate |
| Scope creep x86 | Explicit 1+x; RISC-V + Thumb ca proof-of-concept |
| CPU nealiniat cu preset | Bridge D7 în 1.5; executor generic în 1+x.3 |
| Așteptare exec CPU riscv32 după 1.3 | Documentăm clar; 1+x.3 = executor per set |
| Parser policy doar `module.type{}` | D9: extindem parser pentru `inline.asm.set{…}` |
| `parseIsaBody` respinge corp gol | Merge preset înainte de validare |
| Composition multi-set + wordWidth mixt | D13: `asmSetId`/`wordWidth` per instrucțiune; teste 1.3–1.5 |
| Micro pe preset neclar | D14: preset fără micro; override user D3; exec nativ 1+x.3 |

---

## Estimare efort

| Fază | Efort relativ |
|------|---------------|
| 1.1 Infrastructură | Mic |
| 1.2 Generic formalizat | Mic |
| 1.3 RISC-V preset | Mediu |
| 1.4 ARM Thumb preset | Mediu |
| 1.5 Policy + doc | Mic |
| 1+x.3a riscv32 exec | Mediu |
| 1+x.3b thumb exec | Mediu |
| 1+x.3c riscv32 extended | Mediu–Mare |
| 1+x x86 | Mare |

---

## Checklist implementare

- [x] **Confirmare user:** D9 (`inline.asm.set{…}`), D10, D11 corp gol, D12 riscv32 fără CPU exec
- [x] **Confirmare user:** D15–D22 (exec CPU 1+x.3)
- [x] **1.1** AsmSet registry + `parseIsaHeader` + `set: generic` implicit + merge preset (D11) + teste backward compat
- [x] **1.2** Profil generic formalizat + validare segmente per set + `doc(inline.asm.sets)`
- [x] **1.3** Preset `riscv32` + round-trip + **composition `use` (D13)**
- [x] **1.4** Preset `arm-thumb` + **multi-width composition (D13)**
- [x] **1.5** policy, CPU bridge, `asmSetId`, **composition + micro tests (D13/D14)**
- [ ] **1+x.3a** Router `cpuStep` + executor riscv32 MVP (D20 subset) + validare init + teste
- [ ] **1+x.3b** Executor arm-thumb
- [ ] **1+x.3c** riscv32 extended (mul/div, lb/lh, fence, ecall, FP)
- [ ] **1+x.1+** x86, variable-length, directives `.byte`/`.word` (amânat)
