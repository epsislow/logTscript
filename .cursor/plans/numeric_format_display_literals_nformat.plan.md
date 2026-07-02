---
name: Numeric format display literals NFORMAT
overview: "Șase faze: (0) doc builtin faza-2; (1–2) literali grupați + afișare; (2.5) tag-uri parametrizate pe built-in-uri; (3) status 4bit; (4) NFORMAT scalar; (5+) viitor. Detalii Faze 1–2: literali_grupați_unificați.plan.md"
todos:
  - id: p0-doc-builtin
    content: "Faza 0: doc pagini individuale GT/LT/MULTIPLY/MAC/DIVIDE/DOT/CLAMP/ABS/RSHIFT/ARGMAX/ARGMIN (pattern builtin-ADD.md) + tagged-index; _gen_doc_data.js"
    status: completed
  - id: p1-parse-tag
    content: "Faze 1–2: numeric-formats.js — parseLiteralTag(sX/qXpY/bfX/fpX/ascii) + formatGroupedShow (signed adaptiv ;sW / chunk ;s64)"
    status: completed
  - id: p1-tokenizer
    content: "Faze 1–2: tokenizer.js — grup \\N \\N;tag, eroare \\-N;M, backward compat \\N singular"
    status: completed
  - id: p1-wire-literals
    content: "Faze 1–2: wire-literals.js + parser.js — GroupedLiteral, groupedLiteralToBits"
    status: completed
  - id: p1-display
    content: "Faze 1–2: debug-display-format.js + interpreter.js — header grupat ;tag, celula formatW vs elementW"
    status: completed
  - id: p1-tests-doc
    content: "Faze 1–2: teste grouped-literals-display + actualizare 1907/1920/1925/1946/1992 + wire-literals.md + debug.md"
    status: completed
  - id: p25-parse-builtin-tags
    content: "Faza 2.5: parseBuiltinCallTags + ops generic — sX, qXpY (W≤64, signed); fp16/bf16 fixe; detalii faza_2.5_tag-uri_parametrizate.plan.md"
    status: pending
  - id: p25-display-builtin-tags
    content: "Faza 2.5: show/peek/probe — sX și qXpY (signed adaptiv distinct); show(v; s8) fix per element"
    status: pending
  - id: p25-tests-doc
    content: "Faza 2.5: teste builtin-param-formats + doc arithmetic.md + builtin-tagged-index + pagini builtin; _gen_doc_data.js"
    status: pending
  - id: p3-status
    content: "Faza 3: numeric-formats.js buildStatus (bit0=MSB stanga); ops + interpreter — status 4bit, over+status, mod+status; BUILTIN_DOC + teste + doc toate paginile builtin"
    status: completed
  - id: p4-nformat
    content: "Faza 4: NFORMAT scalar — convertFormat + status 4bit; builtin-NFORMAT.md + teste + doc; _gen_doc_data.js"
    status: completed
  - id: p5-future
    content: "Faza 5: NFORMAT ; vector / ; matrix — detalii faza_5_nformat_vector_matrix.plan.md"
    status: completed
isProject: false
---

## Numeric formats: display, literali, status, NFORMAT

Ordine: **Faza 0 → 1–2 → 2.5 → 3 → 4 → 5**. După fiecare fază: `node node/_gen_test_manifest.js` + `node node/_run_test_suite_node.js` din `v0_3_2/`.

**Notă generală:** modificările se aplică direct în cod, teste, documentație și `files/fs.js` unde există exemple. Nu documentăm „migrări” sau versiuni anterioare — semnăturile și exemplele reflectă starea curentă.

Modele de valoare:
- `signed`: întreg cu semn pe lățimea wire-ului
- `q4p4` (8 biți) / `q8p8` (16 biți): fixed-point
- `fp16` / `bf16` (16 biți): float

Lățimi intrinseci format: `q4p4`=8, `q8p8`/`fp16`/`bf16`=16.

Vezi și: [numeric_format_tags.plan.md](numeric_format_tags.plan.md) (faza 1–2 tag-uri format pe built-in-uri).

---

### Faza 0 — Documentație pagini builtin (faza 2 cod, doc lipsă)

**Primul task** înainte de implementări noi: completare doc pentru funcțiile deja implementate cu tag-uri format, urmând pattern-ul complet din [`builtin-ADD.md`](../v0_3_2/doc/builtin-ADD.md) (semnături, tabel Call tags, exemple `logts-play` per funcție — **nu** doar hub în arithmetic.md):

- GT, LT, MULTIPLY, MAC, DIVIDE, DOT, CLAMP, ABS, RSHIFT, ARGMAX, ARGMIN
- Actualizare [`builtin-tagged-index.md`](../v0_3_2/doc/builtin-tagged-index.md)
- `node node/_gen_doc_data.js`

---

### Faze 1–2 — Literali grupați + afișare unificată

**Plan detaliat:** [`literali_grupați_unificați.plan.md`](literali_grupați_unificați.plan.md)

Rezumat decizii cheie:

- Grup literal: `\v1 \v2 ... \vk ; <tag>` — sufixul retroactiv pe ultimul atom.
- `;M` = unsigned/padding; `;sM` = signed TC; `\-N;M` → eroare (folosește `;sM`).
- Tag-uri parametrizate în literali/display: `;sX`, `;qXpY`, `;bfX`, `;fpX`, `;ascii` (≡ `;8` la grupuri).
- `\N` singular fără sufix = unsigned lățime minimă (neschimbat).
- `\N \N` fără sufix = eroare.
- Afișare header grupată cu `;tag` pentru roundtrip (C5).
- Signed display adaptiv: wire ≤64 → `;sW` lățime reală; wire >64 → chunk-uri `;s64` + rest binar
- Doc/teste: reflectă direct noua sintaxă, fără secțiuni de migrare

**Scope tag-uri parametrizate în Faze 1–2:** doar **literali + afișare** (`;sX`, `;qXpY`, `;bfX`, `;fpX`). Built-in call tags rămân fixe până la **Faza 2.5**.

---

### Faza 2.5 — Tag-uri parametrizate pe built-in-uri

**Plan detaliat:** [`faza_2.5_tag-uri_parametrizate.plan.md`](faza_2.5_tag-uri_parametrizate.plan.md)

**După Fazele 1–2**, înainte de status 4bit.

#### Decizii design (confirmate)

| Subiect | Decizie |
|---------|---------|
| **qXpY** | Signed only; **X+Y ≤ 64** (ex. `q32p32` OK, `q70p1` respins la parse) |
| **sX** | 1 ≤ X ≤ 64; distinct de **`signed`** adaptiv |
| **q0pW** | Permis — fracție signed (ex. `q0p8`) |
| **qWp0** | Permis cu **nume propriu** (`q8p0`); biți = `s8`, afișare `\N;q8p0` (generic Y=0, fără alias intern) |
| **Float** | Doar **`fp16`** și **`bf16`** fixe — fără `fpX`/`bfX`, fără fp8/fp32 |
| **Unsigned qXpY** | Out of scope (viitor `uqXpY` dacă e nevoie) |
| **show** | `show(v; s8)` fix per element; `show(v; signed)` adaptiv; `dec`+`s8` → eroare |
| **over** | Lățime 2×W pentru MULTIPLY/MAC/DOT/SUM |
| **Erori W>64** | La **parse**; width mismatch operand la **runtime** |

#### Tag-uri la apel și display

| Familie | Exemplu | Lățime |
|---------|---------|--------|
| `signed` | `ADD(a,b; signed)` | adaptiv (wire) |
| `sX` | `ADD(a,b; s32)`, `show(z; s32)` | exact X |
| `qXpY` | `ADD(a,b; q6p2)`, `show(s; q8p0)` | exact X+Y ≤ 64 |
| `q4p4` / `q8p8` / `fp16` / `bf16` | alias fixe | ca acum |

Built-in-uri: ADD, SUBTRACT, SUM, MIN, MAX, GT, LT, MULTIPLY, MAC, DOT, DIVIDE, CLAMP, ABS, RSHIFT, ARGMAX, ARGMIN + show/peek/probe.

#### Exemple țintă

```logts-play
8wire a = \1.25 \-0.5;q6p2
8wire b = \0.75 \0.25;q6p2
8wire s, 1wire ovf = ADD(a, b; q6p2)
show(s; q6p2)

8wire[4] v = \2 \-1 \5 \0;s8
show(v; s8)        # header: \2 \-1 \5 \0;s8
show(v; signed)    # header adaptiv: \…;s32

8wire w = \3;q8p0
show(w; q8p0)      # \3;q8p0 (nu ;s8)
```

---

### Faza 3 — Registru `status` 4bit

Implementare **înainte** de NFORMAT. Toate ops cu tag format folosesc `4bit status` de la început.

#### Semnături

```
ADD(... ; fp16) -> result, 4bit status
MULTIPLY(... ; fp16) -> result, (N)bit over, 4bit status
DOT(... ; fp16) -> result, (2N)bit over, 4bit status
DIVIDE(... ; fp16) -> result, (N)bit mod, 4bit status
```

#### Layout status — convenție bitRange (bit0 = cel mai din stânga)

Șir MSB-first de 4 biți; **bit0** = primul bit din stânga (ca `bitRange`):

| Bit | Semnificație |
|-----|--------------|
| bit0 | overflow |
| bit1 | underflow |
| bit2 | inexact |
| bit3 | nan |

Exemplu: `1000` = doar overflow setat.

- Float: toți 4 biții relevanți.
- Fixed-point: bit0 overflow, bit2 inexact la rotunjire; bit1/bit3 = 0.
- `over` (lat) = cuvânt extins de precizie; `status` = excepții (ambele pot fi non-zero).

#### Funcții
- **2 returnuri:** ADD, SUBTRACT, ABS → `result`, `status`
- **3 returnuri:** MULTIPLY, MAC, DOT, SUM → `result`, `over` (lat), `status`
- **3 returnuri:** DIVIDE → `result`, `mod`, `status`

#### Modificări
- `numeric-formats.js`: `buildStatus({overflow, underflow, inexact, nan})` — bit0 MSB stânga.
- `interpreter.js` + `BUILTIN_DOC`: semnături și returnuri actualizate.
- Teste, doc pe **fiecare** pagină builtin cu formate (pattern complet ADD.md); `files/fs.js` unde e cazul.
- Exemple assignment: `8wire r, 8wire o, 4wire st = MULTIPLY(a, b; fp16)`.

#### Documentație
- [`arithmetic.md`](../v0_3_2/doc/arithmetic.md): secțiune „Status register (4bit)” cu convenția bit0=stânga.
- Fiecare pagină builtin: semnături + exemple status.

---

### Faza 4 — Builtin `NFORMAT` (scalar)

Sintaxa: `NFORMAT(a ; <src> to_<dst>)` → `result`, `4bit status`.

- `src` / `dst`: `signed`, `q4p4`, `q8p8`, `fp16`, `bf16`
- `src === dst` → eroare
- Scalar only (fără `; vector` / `; matrix`)
- Conversie: decode(src) → real → encode(dst); `status` per layout Faza 3
- Operand NaN / invalid → `status.bit3` (nan) unde e cazul
- Latime rezultat: `to_q4p4`=8, `to_q8p8`/`fp16`/`bf16`=16; `to_signed` = latime sursă

#### Documentație
- **NOU** [`builtin-NFORMAT.md`](../v0_3_2/doc/builtin-NFORMAT.md)
- [`builtin-tagged-index.md`](../v0_3_2/doc/builtin-tagged-index.md), [`arithmetic.md`](../v0_3_2/doc/arithmetic.md), [`builtin-functions.md`](../v0_3_2/doc/builtin-functions.md)

---

### Faza 5 — NFORMAT `; vector` / `; matrix`

**Plan detaliat:** [`faza_5_nformat_vector_matrix.plan.md`](faza_5_nformat_vector_matrix.plan.md)

Extindere `NFORMAT` (după Faza 4 scalar):

- `NFORMAT(a ; <src> to_<dst> vector)` → `Wdst·wire[n] result`, `4wire[n] status`
- `NFORMAT(a ; <src> to_<dst> matrix)` → `Wdst·wire[n,m] result`, `4wire[n,m] status`
- Orice conversie permisă (inclusiv lățimi diferite); `status` per element marchează pierderile
- `convertFormat` scalar reutilizat per-element/per-celulă

---

### Note
- Ordine: **0 → 1–2 → 2.5 → 3 → 4 → 5**
- Faza 2.5 depinde de `parseLiteralTag` din Fazele 1–2
- peek = show (Faze 1–2)
- Doc complet pe fiecare pagină builtin (nu doar hub arithmetic.md)
- La final implementare: actualizare status în [numeric_format_tags.plan.md](numeric_format_tags.plan.md)
