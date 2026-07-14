---
name: Grouped schema literals
overview: "Extindere 7++: literal grupat de schema `{ elem0 } { elem1 }<schema>` — analog `\\2 \\23 \\242;8`, înlocuiește concat-ul cu `+` pentru vectori wire, slice-uri schema array și câmpuri array în record. **Livrat ✅**"
todos:
  - id: 7pp-parser
    content: "Parser: parseSchemaLiteralAtom grouped + disambiguare nested vs grouped"
    status: completed
  - id: 7pp-eval
    content: "Interpreter: evalGroupedSchemaLiteralAtom + validare count/lățime"
    status: completed
  - id: 7pp-wire-vector
    content: "Țintă A: wire vector/matrix — teste 2308-2311 (incl. un singur rând {}{}{}<schema>)"
    status: completed
  - id: 7pp-slice
    content: "Țintă B: pkt:slots grouped — test 2312"
    status: completed
  - id: 7pp-record
    content: "Țintă C: câmp array în record literal — test 2313"
    status: completed
  - id: 7pp-doc-tests
    content: semantic-schemas.md + regresii 2314-2315 + manifest
    status: completed
  - id: 7pp-wave
    content: "Teste wave 2316-2318 — vector field access, pkt:slots, show"
    status: completed
isProject: false
---

# Plan: Grouped schema literals (7++)

**Status: livrat ✅** — implementare în `v0_3_2`; **1786 teste** în suite (inclusiv 2308–2318).

**Plan părinte:** [`schema_field_arrays.plan.md`](schema_field_arrays.plan.md) — Faza 7++ (literal structurat pe vector/matrix/slice în schema).

---

## Verdict

**Da** — sintaxa grouped schema `{ elem0 } { elem1 }<schema>` e aliniată la grouped numeric `\2 \23 \242;8`.

**Nu implementăm** sintaxe cu **listă și virgulă** — decizie finală (vezi § mai jos). Pentru frunză numerică rămâne `\1 \2 \3;8` (spațiu + tag, deja merge).

---

## Decizii explicite — liste cu virgulă (NU implementăm)

**Decizie utilizator:** nu introducem sintaxă cu **virgulă** pentru liste de elemente (nici `[]`, nici `=[…]` în schema literal).

| Formă respinsă | Exemplu | Alternativă acceptată |
|----------------|---------|------------------------|
| Listă pătrată pe slice | `pkt:cells = [\1, \2, \3]` | `pkt:cells = \1 \2 \3;8` sau `^hex` / `+` |
| Listă în schema literal | `{ cells=[\1, \2, \3] }<frame>` | `{ cells=\1 \2 \3;8 }<frame>` sau grouped schema pe slots |
| Listă schema în record | `{ slots=[{alu=\5}, {cycles=\3}] }<frame>` | `slots={ alu=\5 } { cycles=\3 }<opcode>` (grouped **fără** virgulă) |

**Motiv:** grouped schema `{ }{ }<schema>` și grouped numeric `\ \ \;tag` acoperă cazurile; virgula ar adăuga un al treilea stil fără beneficiu clar.

**Notă:** virgula **în interiorul** unui singur `{ alu=\5, cycles=\3 }<packet>` rămâne — separă **câmpuri** în același element, nu elemente de vector.

---

## Sintaxă confirmată

Echivalent semantic cu `+` între literali:

```logts
packets = { alu=\5 }<packet> + { cycles=\3 }<packet> + { jump=1 }<packet>
```

**Whitespace echivalent** — toate formele de mai jos sunt aceeași expresie:

```logts
# multiline
16wire[3]<opcode> packets =
  { alu=\5 }
  { cycles=\3 }
  { jump=1 }<opcode>

# un singur rând, fără spații între grupuri
16wire[2,2]<opcode> grid = { alu=\5 }{ cycles=\3 }{ jump=1 }{ write=1 }<opcode>

# un singur rând, cu spații
16wire[2,2]<opcode> grid = { alu=\5 } { cycles=\3 } { jump=1 } { write=1 }<opcode>
```

**Reguli:**
- Mai multe `{ … }` + **un singur** `<schema>` la final = câte un **element** (vector/matrix/slice)
- Un singur `{ alu=\5, cycles=\3 }<packet>` = **un** element cu mai multe câmpuri (comportament actual)
- Tag `<schema>` **doar pe ultimul** grup (ca `;8` la grouped numeric)
- Ordine elemente: **rând-major** (ca `+` și `16wire[R,C]`)

---

## Ținte — livrate

### A — Wire vector / matrix ✅

```logts
16wire[3]<opcode> rom = { alu=\5 } { cycles=\3 } { jump=0 }<opcode>
16wire[2,2]<opcode> grid = { alu=\5 }{ cycles=\3 }{ jump=1 }{ write=1 }<opcode>
```

- Validare: `count(grupuri) === elementCount` (N sau rows×cols, rând-major)
- Fiecare grup: `buildSchemaLiteralBits` (parțial OK)
- `+` între literali rămâne valid (regresie)

### B — Slice schema array ✅

```logts
pkt:slots = { alu=\5 } { cycles=\3 }<opcode>
```

### C — În record schema literal ✅

```logts
pkt = { tag=\42, slots={ alu=\5 } { cycles=\3 }<opcode> }<frame>
```

### D — Frunză array numeric ✅ (deja există, fără cod nou în 7++)

Grouped **numeric** pe câmp frunză — **merge azi**, nu face parte din grouped schema:

```logts
pkt:cells = \1 \2 \3;8
pkt = { tag=\42, cells=\1 \2 \3;8 }<frame>   # dacă field value acceptă expr grouped
```

---

## Ce NU schimbăm / NU implementăm

| Formă | Notă |
|-------|------|
| `{ alu=\5 }<packet>` singur | scalar 16b — neschimbat |
| `packets = { alu=\5, cycles=\3 }<packet>` | un element, **câmpuri** separate cu virgulă (OK) |
| `field:8[1-3]` range variabil | [`schema_variable_range.plan.md`](schema_variable_range.plan.md) (Faza 7+) |
| **`[\1,\2,\3]`** | **NU implementăm** |
| **`{ cells=[\1,\2,\3] }`** | **NU implementăm** |
| **`{ slots=[{…},{…}] }`** | **NU implementăm** — folosește grouped `{…}{…}<schema>` |
| Orice listă cu **virgulă** între elemente | **NU** — doar spațiu (numeric) sau `{}{}` (schema) |

---

## Implementare (livrată)

### Parser — [`parser.js`](v0_3_2/core/parser.js)

- `parseSchemaLiteralFieldsBlock()` — un bloc `{ fields }` fără `<schema>` propriu
- `parseSchemaLiteralAtom()` — loop `{ fields }`, apoi un `<schemaRef>`; un singur grup → `schemaLiteral`, mai multe → `groupedSchemaLiteral`
- Disambiguare: al doilea `{` după `}` închis = element grouped; nested `{ flags={ carry=1 } }` rămâne **în** primul bloc

### Runtime — [`interpreter.js`](v0_3_2/core/interpreter.js)

- `evalGroupedSchemaLiteralAtom()` → concat `buildSchemaLiteralBits` per element
- `evalSchemaLiteralAtom()` — delegare grouped; `_evalSchemaLiteralFieldBits` pentru câmpuri
- `evalAtom` — `groupedSchemaLiteral` + `schemaLiteral`

### semantic-schemas — [`semantic-schemas.js`](v0_3_2/core/semantic-schemas.js)

- `buildSchemaLiteralBits` — `packBlock` și pentru `node.kind === 'array'` (câmp `slots` în record literal)

### Documentație — [`semantic-schemas.md`](v0_3_2/doc/semantic-schemas.md)

- Secțiune grouped schema + exemplu vector `rom = { … }{ … }<opcode>`
- Notă „not supported” pentru liste cu virgulă

---

## Teste

| ID | Scenariu | Propagare |
|----|----------|-----------|
| 2308 | vector 3 elem grouped ≡ `+` | legacy |
| 2309 | matrix 2×2 pe un singur rând `{}{}{}{}<opcode>` | legacy |
| 2310 | multiline vs `{}{}` vs spații | legacy |
| 2311 | eroare count mismatch | legacy |
| 2312 | `pkt:slots` grouped | legacy |
| 2313 | record `slots={…}{…}<opcode>` | legacy |
| 2314 | regresie single `{ alu=\5 }<opcode>` | legacy |
| 2315 | regresie `+` concat | legacy |
| 2316 | vector grouped + field slice read | **wave** |
| 2317 | `pkt:slots` grouped pe wire existent (`:= 0`) | **wave** |
| 2318 | `show(rom)` după init grouped vector | **wave** |

---

## Confirmare utilizator (închisă)

- [x] **A** — wire vector/matrix grouped (inclusiv un singur rând `{}{}{}<schema>`)
- [x] **B** — slice schema array
- [x] **D** — frunză numeric `\1 \2 \3;8` rămâne cum e (nu grouped schema)
- [x] **C** — grouped în `{ }<frame>` pe câmp array
- [x] Tag `<schema>` doar pe ultimul grup
- [x] **Fără virgulă** pentru liste de elemente
- [x] Teste wave (2316–2318)

---

## Amânat (nu face parte din 7++)

| Fază | Conținut |
|------|----------|
| **7+** | `field:W[min-max]` / `[min-]` — [`schema_variable_range.plan.md`](schema_variable_range.plan.md) |
| **7b+** | Bridge protocol fix → schema (doc/tool) |

Vezi [`schema_field_arrays.plan.md`](schema_field_arrays.plan.md) § Faze amânate.
