---
name: ASM composition use
overview: "Plan pentru ASM v2 în v0_3_2: compoziție cu `use`, etichete externe (`label>`), directive `repeat`/`align`/`base:`, metadate pe fire pentru compoziție, documentație engleză și teste 1411+. `show(wire)` rămâne biți; decode explicit cu `:decode`."
todos:
  - id: asm-module-model
    content: AsmModule struct + interp.asmModules + wire asmModuleId propagation
    status: pending
  - id: asm-directives
    content: "repeat / align / base: în asm-assembler.js + base resolve (literal, symbol, LUT)"
    status: pending
  - id: asm-ext-labels
    content: label> în parseArgToken + pass3 resolve across composed program
    status: pending
  - id: asm-use-compose
    content: "use / use X: base: pipeline + multi-ISA segment concat"
    status: pending
  - id: asm-decode-meta
    content: ":decode din AsmModule segments; show() neschimbat"
    status: pending
  - id: asm-doc
    content: doc/asm-composition.md + update asm.md, mem.md, doc-index + _gen_doc_data.js
    status: pending
  - id: asm-tests-1411
    content: test_suite.js 1411–1426 grup asm-composition (EN) + manifest
    status: pending
isProject: false
---

# ASM composition cu `use` (ASM v2)

## Confirmări

| Subiect | Decizie |
|---------|---------|
| Sintaxă `base` | **Doar `base: valoare`** — ex. `base: 0`, `base: BOOT_BASE`, `base: .memoryMap:boot` (fără `base 128` statement) |
| `show(wire)` | **Rămâne afișarea de biți**; disasamblarea doar cu `show(.isa:decode(wire))` explicit |
| Metadate pe fire | **Da** — necesare pentru `use` și `:decode`; nu schimbăm comportamentul `show()` |
| Limbă | Plan în română; **doc + teste + comentarii cod în engleză** |
| Spec sursă | [`v0_3_1/ideas.txt`](v0_3_1/ideas.txt) (linii ~1233–1615) + input utilizator |

---

## Stare actuală (v0_3_2)

Implementat (ASM v1):

- [`asm-assembler.js`](v0_3_2/core/asm-assembler.js) — `parseProgramLines`, `pass1CollectLabels`, `assembleProgram`, `disassembleProgram`
- [`parser.js`](v0_3_2/core/parser.js) — `parseAsmProgramRaw`, atom `{ asmProgram }`
- [`interpreter.js`](v0_3_2/core/interpreter.js) — `evalAsmProgram` → blob; flag temporar `asmBlob: true` (doar padding strict la assign)
- [`doc/asm.md`](v0_3_2/doc/asm.md) — doc v1; teste **883–907**, **947–948**, **1740**

**Lipsesc complet:** `use`, `repeat`, `align`, `base:`, etichete `label>`, metadate persistente, compoziție multi-ISA.

```mermaid
flowchart TB
  subgraph v1 [ASM v1 - azi]
    A[".isa { program }"] --> B[assembleProgram]
    B --> C[blob pe storage]
    C --> D["show = biți"]
    C --> E["show(.isa:decode)"]
  end
  subgraph v2 [ASM v2 - plan]
    F[AsmModule metadata] --> G[use / align / repeat / base:]
    G --> H[composePrograms]
    H --> I[blob + metadata]
    I --> J[use intern]
    I --> E
  end
```

---

## Decode azi (ASM v1) — ce există pe wire

**Pe wire nu există metadate de instrucțiuni.** La asamblare se păstrează doar:

- **blob** — șirul de biți în `storage`
- **`asmBlob: true`** — flag tranzitoriu la evaluare (pentru assign strict width / padding)
- **`bitWidth`** — lățimea totală în biți

Nu există `asmModuleId`, listă de mnemonice, etichete sau segmente ISA pe fire.

**`:decode` reconstituie totul la cerere**, din biți + ISA-ul apelant:

```1000:1008:d:\wamp64\www\logic\library\logTscript\v0_3_2\core\interpreter.js
  evalAsmDecode(inst, argExpr) {
    const bits = this._evalExprToBits(argExpr);
    // ...
    const isa = { opcodes: inst.opcodes, wordWidth: inst.wordWidth, opcodeOrder: inst.opcodeOrder };
    const text = disFn(isa, bits);
```

`disassembleProgram` taie blob-ul în cuvinte de `wordWidth` și pentru fiecare cuvânt **ghicește** mnemonic-ul potrivit prin pattern-matching pe opcode-uri (`disassembleInstruction`).

| Aspect | Comportament v1 |
|--------|-----------------|
| **Asamblare** (`BEQ loop`, `JMP loop`) | Funcționează — pass1 colectează `labels`, pass2 encodează offset/adresă (ex. [asm.md — signed branch](v0_3_2/doc/asm.md)) |
| Sursă la **`:decode`** | Doar biții + ISA apelant — **fără** tabel etichete salvat pe wire |
| Etichete în **output `:decode`** | Nu se round-trip-uiesc: sursă `BEQ loop` → decode arată `BEQ -3` / `BEQ A0`, nu `BEQ loop` |
| `show(wire)` | Doar biți — exemplul doc `show(x)` după `BEQ loop` nu afișează mnemonice |
| Multi-ISA pe același wire | La decode, un singur ISA decodează tot blob-ul |
| Blob fără proveniență ASM (`= ^hex`) | Decode cu ISA ales; poate eșua sau fi ambiguu |

**Clarificare:** „lipsește `loop`” = în **textul `:decode`**, nu în sintaxa sursă. `24wire x = .myisa { loop: … BEQ loop }` asamblează corect; `show(x)` arată blob-ul encodat.

Analogie: azi e ca un **hex dump + dezasamblor extern**; planul propune și un **symbol table** salvat la assemble.

---

## Model: `AsmModule`

Obiect imutabil produs la asamblare, stocat alături de blob:

```javascript
{
  blob: '0101...',           // binary string
  wordWidth: 8,
  segments: [                // pentru multi-ISA după compoziție
    { isaRef: '.cpuA', instrCount: 4, blobOffset: 0 },
    { isaRef: '.cpuB', instrCount: 2, blobOffset: 32 },
  ],
  instructions: [            // per-word decode info
    { index, isaRef, mnemonic, args, sourceLine }
  ],
  labels: { start: 0, dsp: 5, end: 10 },  // global logical instr addresses
  externRefs: [              // unresolved at unit assemble time
    { name: 'dsp', fromIndex: 1, field: 'A4b' }
  ],
  basePreferred: 128,        // resolved numeric; ignored on use unless override
  sourceMap: [...],          // optional
}
```

**Stocare în interpreter:**

- `interp.asmModules` — `Map<moduleId, AsmModule>`
- La `evalAsmProgramAtom`: `storeValue(blob)` + `asmModuleId` pe rezultat și pe intrarea din `wires` (câmp nou `asmModuleId` pe `wireEntry`, similar `symbolicMeta` la LUT)
- La assign `boot = .cpuA { ... }` sau `firmware = boot` — propagare `asmModuleId` (metadata copy by reference, blob copy by value)

Fișiere: [`interpreter.js`](v0_3_2/core/interpreter.js), eventual [`asm-assembler.js`](v0_3_2/core/asm-assembler.js) export `composeAsmModules`.

### Strategie `:decode` cu `AsmModule`

```mermaid
flowchart TD
  decodeCall["show(.isa:decode(wire))"]
  hasMeta{wire are asmModuleId?}
  metaPath["format instructions[] per index"]
  fallback["disassembleProgram(isa, bits) ca azi"]
  decodeCall --> hasMeta
  hasMeta -->|da| metaPath
  hasMeta -->|nu| fallback
```

| Caz | Comportament recomandat |
|-----|-------------------------|
| Wire cu `asmModuleId` | Afișează `instructions[i].mnemonic args` (sursă assemble, fără re-guess opcode) |
| Multi-ISA (`segments[]`) | Decode **fără** ISA apelant obligatoriu: iterare pe `segments`, fiecare cu `isaRef` propriu; sau `show(firmware:decode)` unde metoda citește modulul |
| `boot = ^deadbeef` | Fără metadata → fallback `disassembleProgram` cu ISA-ul din apel |
| `firmware = boot` | Copiază `asmModuleId` by reference (blob by value) |

**API păstrat:** `show(.cpuA:decode(firmware))` — dacă `firmware` are modul, `.cpuA` poate fi ignorat pentru afișare (sau validare că segmentele includ `.cpuA`). Varianta minimă: decode citește modulul operandului, nu ISA-ul apelantului, când există `asmModuleId`.

### Recomandări (model & implementare)

1. **`instructions[]` e esențial pentru multi-ISA** — fără el, `disassembleProgram` cu un singur ISA decodează greșit segmentele `use dsp` (alt ISA).
2. **`segments[]` e minimul pentru decode multi-ISA fără `instructions[]` complete** — alternativă mai slabă: decode per segment cu `disassembleProgram(isaSegment, slice)`; pierzi etichete sursă și linii sursă.
3. **Nu duplica blob în `AsmModule`** — modulul ține metadata; blob rămâne în `storage` (ca `symbolicMeta` la LUT: metadata pe wire, valoare separat).
4. **`labels` în `AsmModule`** — opțional pentru decode mai lizibil (`BEQ loop` în loc de `BEQ -3`); **nu** necesar pentru asamblare (deja funcționează fără metadata persistentă)
5. **`sourceMap` — opțional (faza 2+)** — nice pentru debug; nu blochează MVP.
6. **Propagare metadata** (confirmat în plan): `x = boot` → copiază `asmModuleId`; `x = ^hex` → șterge; `x = .cpu { }` → modul nou.
7. **Pattern existent:** `symbolicMeta` pe LUT labels — `asmModuleId` pe `wireEntry` urmează același model.
8. **MVP Faza 3:** `AsmModule` cu `blob` ref, `wordWidth`, `segments[]`, `instructions[]` (mnemonic + args text); Faza 4 extinde la compoziție `use`.

---

## Faze de implementare

### Faza 1 — Directive locale (`repeat`, `align`, `base:`)

**Fișier principal:** [`asm-assembler.js`](v0_3_2/core/asm-assembler.js)

Extinde `parseProgramLines` / `parseProgramEntry` cu tipuri noi de intrări:

| Directivă | Sintaxă | Comportament |
|-----------|---------|--------------|
| `repeat` | `repeat N { ... }` | Expandare înainte de pass1; `N` integer; corpul poate conține labels, `repeat` imbricat |
| `align` | `align N { block }` | La adresa logică curentă, repetă `block` până `pc % N === 0`; eroare dacă lungimea blocului nu divide gap-ul |
| `base:` | `base: 0` / `base: BOOT_BASE` / `base: .memoryMap:boot` | Setează **adresa logică inițială**; nu emite instrucțiuni; `pass1` pornește de la valoarea rezolvată |

**`base:` rezolvare** (înainte de asamblare, din interpreter):

- Literal: `base: 0`, `base: \128`
- Simbol: `base: BOOT_BASE` — lookup wire/constant definit în script (eroare dacă lipsă)
- LUT label: `base: .memoryMap:boot` — reutilizează pattern din [`lut-labels.js`](v0_3_2/core/lut-labels.js) (`resolveLutLabelRef`)
- **Interzis:** expresii (`base: BOOT_BASE + 256`) — eroare la parse/resolve

**Adrese absolute (`A4b`):** encode `label_addr - base` sau index relativ la base (aliniat cu semantica actuală A = index instrucțiune, dar offsetată de `base`).

Teste 1411–1415 (grup `asm-composition`).

---

### Faza 2 — Etichete externe (`label>`)

**Parser argumente:** extinde `parseArgToken`:

```javascript
// dsp> → { type: 'extLabel', name: 'dsp' }
```

**Scope etichete:**

- `loop:` fără `>` — **local** programului curent (unitate de asamblare)
- `JMP dsp>` — referință **externă**; nu se rezolvă în pass1 local
- `JMP boot>` — poate rezolva în același block, alt `use`, sau după în stream

**Erori:**

```text
Unresolved external label 'dsp'
```

Teste 1416–1418.

---

### Faza 3 — Metadate pe fire + `AsmModule` la asamblare

Refactor [`assembleProgram`](v0_3_2/core/asm-assembler.js) → returnează `AsmModule` (nu doar `{ blob, wordWidth }`).

[`evalAsmProgram`](v0_3_2/core/interpreter.js):

- Înregistrează modulul în `asmModules`
- Propagă `asmModuleId` pe wire la declarație și assign

`:decode` — [`evalAsmDecode`](v0_3_2/core/interpreter.js):

- Dacă operandul (wire) are `asmModuleId` → formatare din `instructions[]` (și `segments[]` pentru multi-ISA); **nu** re-disassemble
- Altfel → `disassembleProgram(isa, bits)` ca azi (fallback)

**`show()` — fără schimbare** (confirmat).

Teste 1423–1424 (metadata pe wire, decode din modul). *(Notă: mapare anterioară 1419–1420 era pentru `use`; aliniat cu tabelul Faza 6.)*

---

### Faza 4 — `use` și compoziție multi-ISA

**Sintaxă în corpul `{ }`:**

```logts
use boot
use dsp
use driver:
  base: .memoryMap:drivers
```

**Pipeline în 3 etape** (conform spec):

1. **Asamblare independentă** — fiecare wire/program referit (`boot`, `dsp`) devine `AsmModule` cu ISA-ul său
2. **Expandare `use`** — la poziția curentă în stream, inserează blob + segment metadata; **`base:` din modulul inserat ignorat** (relocare automată la offset curent)
3. **Rezolvare `label>`** — pe programul compus final; patch câmpuri `A4b` / re-encode dacă e necesar

**Multi-ISA:** blocul exterior (ex. `.cpuA { use boot; use dsp; end: NOP }`) asamblează doar instrucțiunile `.cpuA`; segmentele `.cpuB` vin pre-asamblate din `use dsp`.

**Override base la use:**

```logts
use driver:
  base: .memoryMap:drivers
```

Asamblează/relochează `driver` cu base-ul furnizat, nu `basePreferred` al modulului.

Teste 1419–1426 (use, multi-ISA, override base — vezi tabel Faza 6).

---

### Faza 5 — Documentație (engleză)

| Fișier | Conținut |
|--------|----------|
| **[`doc/asm-composition.md`](v0_3_2/doc/asm-composition.md)** (nou) | Pagină dedicată: `use`, `label>`, `repeat`, `align`, `base:`, memory map LUT, faze, exemple `logts-play`, „not a linker” |
| [`doc/asm.md`](v0_3_2/doc/asm.md) | Secțiune scurtă + link la `asm-composition.md`; mențiune metadate + `:decode` |
| [`doc/mem.md`](v0_3_2/doc/mem.md) | Notă: mem primește blob final; compoziția e la nivel wire |
| [`doc/doc-index.json`](v0_3_2/doc/doc-index.json) | Intrare `asm-composition.md` lângă `asm.md` |
| `node _gen_doc_data.js` | Regenerare bundle |

Exemple doc obligatorii (din spec):

- Reutilizare `boot` cu `JMP dsp>`
- Multi-ISA `.cpuA` + `.cpuB` + `firmware`
- `repeat 8 { NOP }`
- `align 16 { NOP }` + eroare align imposibil
- `base:` + memory map LUT
- `use boot` cu relocare vs `align 128 { NOP }` + `use boot`
- `use driver: base: .memoryMap:drivers`

---

### Faza 6 — Teste (engleză, id **1411+**)

Grup nou: **`asm-composition`** (sau sub-grupuri `asm-use`, `asm-directives`).

| Id | Titlu (EN) | Verifică |
|----|------------|----------|
| 1411 | `repeat 8 expands to 8 NOPs` | blob length / instruction count |
| 1412 | `align 16 pads with block` | `next` la adresa logică 16 |
| 1413 | `align error unsatisfiable block` | mesaj eroare |
| 1414 | `base colon sets logical start` | encoding A field cu base 128 |
| 1415 | `base colon LUT label` | `base: .memoryMap:boot` |
| 1416 | `base colon rejects expression` | `base: X + 256` → error |
| 1417 | `external label unresolved` | `JMP dsp>` fără `dsp:` |
| 1418 | `external label resolved via use` | boot + dsp + firmware |
| 1419 | `use inserts module blob` | lungime / conținut |
| 1420 | `use ignores embedded base` | boot cu `base: 128` în firmware |
| 1421 | `use base override` | `use driver: base: ...` |
| 1422 | `multi-ISA composition` | `.cpuA` + `.cpuB` în același firmware |
| 1423 | `asm metadata on wire` | `asmModuleId` prezent după assign |
| 1424 | `decode uses module metadata` | `show(.isa:decode(prg))` multi-segment |
| 1425 | `nested repeat and use` | smoke |
| 1426 | `doc asm-composition listed` | doc-index / `doc(asm)` link |

Helper ISAs în teste: extinde `INLINE_ASM_ISA` sau definește `.cpuA` / `.cpuB` minimale în setup.

`node _gen_manifest.js` + `node _run_suite_node.js`.

---

## Fișiere de atins (rezumat)

| Fișier | Schimbări |
|--------|-----------|
| [`asm-assembler.js`](v0_3_2/core/asm-assembler.js) | Directives, ext labels, compose, AsmModule |
| [`parser.js`](v0_3_2/core/parser.js) | Parse `use` / `base:` în program; `use driver:` block |
| [`interpreter.js`](v0_3_2/core/interpreter.js) | `asmModules`, wire metadata, base resolve context, compose pipeline |
| [`lut-labels.js`](v0_3_2/core/lut-labels.js) | Export/refactor resolver pentru `base: .lut:label` |
| [`tests/test_suite.js`](v0_3_2/tests/test_suite.js) | 1411–1426 |
| [`doc/asm-composition.md`](v0_3_2/doc/asm-composition.md) | Doc nou |
| [`doc/asm.md`](v0_3_2/doc/asm.md) | Link + notă scurtă |

---

## Riscuri / atenție

1. **Conflict `repeat`** — în protocol există `repeat`; în ASM e în corp `{ }` cu alt parser de linii — fără ambiguitate dacă `parseProgramEntry` recunoaște `repeat N {`.
2. **`>` în alte contexte** — property redirects (`get>`); în ASM doar ca sufix pe argument label.
3. **Assign strict width** — la `use`, blob-ul compus poate avea altă lungime decât fire declarate cu `=`:
   - **`=`** — lățime **exactă**; eroare dacă programul asamblat are mai multe sau mai puține biți decât `Nwire` (comportament existent ASM v1)
   - **`:=`** / **`=:`** — permit **doar padding** când blob-ul e **mai scurt** decât wire (zerouri stânga/dreapta); dacă blob-ul compus e **mai lung**, tot eroare
   - Exemplu: `24wire x = .cpu { use boot; use dsp; NOP }` eșuează dacă `boot`+`dsp`+`NOP` ≠ 24 biți; fie calculezi lățimea (`32wire`), fie folosești `:=` într-un slot mai mare (ex. mem) când blob-ul e mai scurt
   - Doc: [asm.md — Wire width](v0_3_2/doc/asm.md), [assignment-operators.md](v0_3_2/doc/assignment-operators.md)
4. **Re-assign pierde metadata?** — trebuie definit: `x = boot` copiază `asmModuleId`; `x = ^hex` șterge metadata.
5. **Efort estimat:** ~5–8 zile (model + directive + use + multi-ISA + doc + 16 teste).
