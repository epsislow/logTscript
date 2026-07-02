---
name: Faza 2.5 tag-uri parametrizate
overview: "Extinde built-in-uri și show/peek/probe cu sX și qXpY (signed, W≤64); signed adaptiv distinct; fp16/bf16 fixe; q0pW fracție; qWp0 permis cu nume propriu (biți = sW)."
todos:
  - id: p25-nf-core
    content: "numeric-formats.js: parseBuiltinFormatTag, isNumericFormatMode, resolveFormatSpec, fixedMinMax generic qXpY, limită W≤64 la parse, over=2W"
    status: completed
  - id: p25-builtin-tags
    content: "signed-arithmetic.js parseBuiltinCallTags + interpreter: sX, qXpY; signed adaptiv distinct; vector ca q4p4"
    status: completed
  - id: p25-display-parser
    content: "parser.js + debug-display-format.js: show(v; s8), show(v; q6p2); signed vs sX; mutual exclusion dec+s8"
    status: completed
  - id: p25-reduce
    content: "vector/matrix/tensor reduce: isNumericFormatMode + sX + qXpY generic"
    status: completed
  - id: p25-tests-doc
    content: "Teste builtin-param-formats + doc (exemple, nu enumerare) + _gen_doc_data.js; marchează Faze 1–2 complete în plan părinte"
    status: completed
isProject: false
---

# Faza 2.5 — Tag-uri parametrizate pe built-in-uri și display

Plan părinte: [`numeric_format_display_literals_nformat.plan.md`](numeric_format_display_literals_nformat.plan.md).  
Fazele 1–2 complete: [`literali_grupați_unificați.plan.md`](literali_grupați_unificați.plan.md).

---

## Decizii confirmate (design lock)

### Familii de tag-uri

| Familie | Scope Faza 2.5 | Note |
|---------|----------------|------|
| **`sX`** | 1 ≤ X ≤ 64 | Signed TC pe exact X biți; distinct de `signed` adaptiv |
| **`qXpY`** | X≥0, Y≥0, **X+Y ≤ 64** | **Signed only** (ca q4p4); fără unsigned/UQ |
| **`signed`** | bare tag | Adaptiv — neschimbat (Faze 1–2) |
| **`q4p4`**, **`q8p8`** | alias fixe | Cale rapidă existentă |
| **`fp16`**, **`bf16`** | **doar 16 biți fixe** | Fără `fpX`/`bfX` parametrizat; fără fp8/fp32 în această fază |

### `q0pW` vs `qWp0`

| Formă | Decizie |
|-------|---------|
| **`q0pW`** (ex. `q0p8`) | **Permis** — doar fracție signed în (-1…+1) |
| **`qWp0`** (ex. `q8p0`) | **Permis cu nume propriu** — **nu** alias formal la `sW` |
| Biți `q8p0` vs `s8` | **Identici** pentru întregi (Y=0 → scale=1, TC) |
| Afișare `show(v; q8p0)` | Scrie **`\N;q8p0`**, nu `\N;s8` |
| Implementare | Generic `qXpY` cu Y=0 — **fără cod special**; nu redirecționare internă |

Doc: pentru întregi, `sW` e preferat semantic; `qWp0` rămâne valid pentru cei care vor notația Q.

### Unsigned `qXpY`

**Out of scope** — rămân signed. Variantă unsigned (`uqXpY`) = fază viitoare dacă e nevoie.

---

## `signed` vs `sX` — display și built-in

| Tag | Header show (ex. vector 32 bit) | Celule | Built-in |
|-----|----------------------------------|--------|----------|
| **`signed`** | Adaptiv: `\…;s32` (wire ≤64) | `\N;s{elementW}` | Lățime = wire |
| **`s8`** | Fix per element: `\2 \-1 \5 \0;s8` | `\N;s8` | Operand = exact 8 biți |
| **`q6p2`** | Grouped `;q6p2` | regulă formatW vs elementW | Operand = exact 8 biți |

- `show(v; s8)` singur — OK
- `show(v; dec s8)` — **eroare** (un singur tag format)
- Wire nealiniat pe W → rest `+ binar` (ca la q4p4)
- `RSHIFT(...; s8)` — ASHR signed pe 8 biți fix; distinct de `signed` adaptiv

### Vector / matrix

`ADD(v, w; vector s8)` — la fel ca `vector q4p4`: fiecare element exact W biți.

---

## Validare și erori

| Verificare | Când |
|------------|------|
| Tag invalid (`q70p1`, W>64) | **Parse** — mesaj: depășește 64 biți (X+Y=71) |
| Operand width mismatch | **Runtime** — ex. `ADD: ; q6p2 requires 8-bit operands, got 16` |
| Mutual exclusion | `; signed` + `; s32`, `; q4p4` + `; q6p2`, `show` format dublu |

Limita **W ≤ 64** aplicată uniform: literali, built-in, show/peek/probe.

---

## Overflow și `over`

- **`qXpY` generic:** `fixedMinMaxForQ(X,Y)` pentru flag `ovf` (ca q4p4, dar din X,Y)
- **MULTIPLY / MAC / DOT / SUM:** `over` = lățime **2×W** (W = X+Y), ca la formatele fixe existente

---

## Model intern (recomandat)

- `numericMode` = string tag (`'q6p2'`, `'s32'`, `'q8p0'`)
- `resolveFormatSpec(mode)` → `{ kind, width, fracBits?, tagSuffix }` la nevoie
- `isNumericFormatMode(mode)` extinde `isFormatMode()` pentru `s\d+` și `q\d+p\d+`

**Nu** introducem `fpX`/`bfX` parametrizat.

---

## Fișiere de modificat

| Fișier | Schimbare |
|--------|-----------|
| [`numeric-formats.js`](../v0_3_2/core/numeric-formats.js) | `parseBuiltinFormatTag`, `isNumericFormatMode`, ops generic qXpY, W≤64 în `parseLiteralTag` |
| [`signed-arithmetic.js`](../v0_3_2/core/signed-arithmetic.js) | `parseBuiltinCallTags`: `sX`, `qXpY` |
| [`parser.js`](../v0_3_2/core/parser.js) | Display tags: `^s\d+$`, `^q\d+p\d+$` + fixe; exclusivitate |
| [`debug-display-format.js`](../v0_3_2/core/debug-display-format.js) | `show(v; s8)` / `q6p2`; `signed` adaptiv neschimbat |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | Dispatch `sX` vs `signed` vs qXpY generic |
| [`vector-reduce.js`](../v0_3_2/core/vector-reduce.js), [`matrix-reduce.js`](../v0_3_2/core/matrix-reduce.js), [`tensor-axis-reduce.js`](../v0_3_2/core/tensor-axis-reduce.js) | Propagare mode parametrizat |

---

## Teste țintă (`builtin-param-formats`)

- `ADD(a,b; q6p2)` pe 8wire + roundtrip literal
- `ADD(x,y; s32)` pe 32wire
- `show(v; s8)` vs `show(v; signed)` — comportamente distincte
- `show(s; q6p2)`, `show(w; q8p0)` afișează `;q8p0` nu `;s8`
- `q32p32` pe 64wire — OK; `q70p1` — eroare parse
- `q0p8` fracție — OK
- Regresie: `q4p4`, `signed`, `fp16`
- Mutual exclusion și width mismatch

---

## Documentație

- Pattern-uri + exemple (`q6p2`, `q32p32`, `s8`, `q0p8`, `q8p0`) — **nu** enumerare completă
- Secțiune „Parametric format tags” în arithmetic.md
- **Fără** `fpX`/`bfX`/fp8 în doc acestei faze

---

## Ordine implementare

1. `numeric-formats.js` — infrastructură + W≤64 + overflow generic
2. `parseBuiltinCallTags` + interpreter
3. Parser + display (`s8`, `qXpY`)
4. Reduce modules
5. Teste + doc + `_gen_doc_data.js`

---

## Notă Faza 3

Faza 2.5 nu introduce `4bit status`; la Faza 3 se extinde peste toate modurile (inclusiv `q6p2`, `s32`).
