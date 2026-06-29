---
name: User def tag overloads
overview: Tag-uri în semnătura funcțiilor user `def` și la apel (`name(args; tag1=1 tag3)`), cu overload-uri multiple sub același nume, rezolvare prin potrivire exactă a setului de tag-uri. Implementat în v0_3_2. Faza 2 (built-in tags) rămâne viitoare.
todos:
  - id: overload-module
    content: "core/user-func-overloads.js — normalizare, match exact, erori, validare def"
    status: completed
  - id: parser-tags
    content: "parseFuncTags() + parseDef() — tag-uri în paranteze înainte de ) + registerUserFuncOverload + LOAD merge"
    status: completed
  - id: parser-call
    content: "call() — callTags în paranteze; maybeParsePadding() disambiguare ; padding vs tag"
    status: completed
  - id: interpreter-resolve
    content: Rezolvare overload în interpreter.call() + getDocLines multi-overload
    status: completed
  - id: doc-tags
    content: user-functions.md + doc-data regenerat
    status: completed
  - id: tests-tags
    content: "Teste user-def-tags 1776–1781 + regresie user-def 1764–1775"
    status: completed
isProject: false
---

# Plan: tag-uri și overload-uri pentru funcții user `def`

**Status:** implementat (v0_3_2). Teste: 1259/1259.

## Cerințe

- **Definiție:** `def name(Type p1, Type p2; tag1=1 tag2=2 tag3):` — parametrii și tag-urile sunt **în aceleași paranteze**, separate de `;`.
- **Apel:** `name(a, b; tag2=2 tag3 tag1)` — ordinea tag-urilor **nu contează**.
- **Valori int:** literali zecimali (`0`, `1`, `2`, …); `0`/`1` pot apărea ca token `BIN`.
- **Tag bool:** `tag3` fără `=` ≡ `tag3=1`; același nume de tag nu poate fi bool într-o overload și int în alta.
- **Overload-uri:** același nume, **aceeași listă de parametri**; diferențiere doar prin tag-uri.
- **Rezolvare:** potrivire **exactă** a setului de tag-uri (nu subset, nu „cel mai apropiat”).
- **Faza 2 (viitor):** tag-uri pe built-ins (`ADD(a,b; signed)` etc.).

## Fișiere implementate

| Fișier | Rol |
|--------|-----|
| [v0_3_2/core/user-func-overloads.js](../v0_3_2/core/user-func-overloads.js) | Registry overload, match, erori, doc |
| [v0_3_2/core/parser.js](../v0_3_2/core/parser.js) | `parseFuncTags`, `parseDef`, `call`, `maybeParsePadding` |
| [v0_3_2/core/interpreter.js](../v0_3_2/core/interpreter.js) | Rezolvare la apel, `getDocLines` |
| [v0_3_2/core/tokenizer.js](../v0_3_2/core/tokenizer.js) | `peekToken()` |
| [v0_3_2/doc/user-functions.md](../v0_3_2/doc/user-functions.md) | Documentație utilizator |
| [v0_3_2/tests/test_suite.js](../v0_3_2/tests/test_suite.js) | Grup `user-def-tags` (1776–1781) |

## Model de date

```javascript
// funcs.get("test") =>
{
  params: [{ type: '4bit', id: 'param1' }, { type: '4bit', id: 'param2' }],
  tagKinds: Map { 'tag1' => 'int', 'tag2' => 'int', 'tag3' => 'bool' },
  overloads: [
    { tags: {}, body, returns },                    // fără tag-uri
    { tags: { tag1: 1 }, body, returns },
    { tags: { tag1: 1, tag2: 3, tag3: 1 }, ... }, // bool tag3 stocat ca 1
  ]
}
```

Match: sortare lexicografică după nume tag → comparare `tag1=1|tag2=2` (cheie canonică).

## Exemplu complet `test` — cele 7 overload-uri

Definiții (fiecare returnează un `4bit` distinct pentru teste automate):

| # | Definiție | Return test |
|---|-----------|-------------|
| 1 | `def test(4bit p1, 4bit p2):` | `0001` |
| 2 | `def test(4bit p1, 4bit p2; tag1=1):` | `0010` |
| 3 | `def test(4bit p1, 4bit p2; tag1=0):` | `0011` |
| 4 | `def test(4bit p1, 4bit p2; tag1=2):` | `0100` |
| 5 | `def test(4bit p1, 4bit p2; tag1=2 tag2=2):` | `0101` |
| 6 | `def test(4bit p1, 4bit p2; tag1=1 tag2=3 tag3):` | `0110` |
| 7 | `def test(4bit p1, 4bit p2; tag2=1):` | `0111` |

### Regula de match exact

La apel, motorul construiește un **set de tag-uri** din ce scrii după `;` și caută o definiție al cărei set este **identic** — aceleași chei, aceleași valori. Nu există „potrivire parțială” sau „moștenire” de tag-uri de la o overload la alta.

### Overload #5 — explicație detaliată

**Definiția #5** spune: această variantă există **doar** când apelul furnizează **exact două** tag-uri int:

- `tag1` cu valoarea **2**
- `tag2` cu valoarea **2**

Semnătura canonică: `{ tag1: 2, tag2: 2 }`.

#### Apeluri care **funcționează** (→ overload #5)

```logts
test(a, b; tag1=2 tag2=2)    // ordine oarecare
test(a, b; tag2=2 tag1=2)    // aceeași overload #5
```

#### Apeluri care **nu** ajung la #5 (și de ce)

| Apel | Set tag-uri la apel | De ce nu e #5 |
|------|---------------------|---------------|
| `test(a, b; tag1=2)` | `{ tag1: 2 }` | Lipsește `tag2` — overload #5 cere **ambele** tag-uri |
| `test(a, b; tag2=2)` | `{ tag2: 2 }` | Lipsește `tag1` — → eroare (nici #5, nici altă overload cu un singur tag `tag2=2`) |
| `test(a, b; tag1=1 tag2=2)` | `{ tag1: 1, tag2: 2 }` | `tag1` e **1**, nu **2** — nu există overload cu această pereche |
| `test(a, b; tag1=2)` | `{ tag1: 2 }` | → overload **#4** (`tag1=2` singur), nu #5 |
| `test(a, b; tag1=1 tag2=3 tag3)` | `{ tag1: 1, tag2: 3, tag3: 1 }` | → overload **#6** (trei tag-uri, valori diferite) |

**Important:** un apel cu `tag1=1 tag2=2` **nu** se potrivește cu #5 (`tag1=2 tag2=2`), chiar dacă „arată similar”. Match-ul e pe **valori**, nu pe numele tag-urilor singure.

#### Notă despre cerința inițială

În descrierea inițială apărea uneori lista „#5 = `tag1=1 tag2=2`” alături de apeluri `tag1=2 tag2=2`. Cu **match exact**, definiția și apelul trebuie să coincidă. Implementarea și testele (1776) folosesc:

```logts
def test(4bit p1, 4bit p2; tag1=2 tag2=2):   // def #5
  :4bit 0101

test(a, b; tag1=2 tag2=2)   // → #5
```

Dacă vrei comportamentul „def cu `tag1=1 tag2=2`”, apelul corect este `test(a, b; tag1=1 tag2=2)` — dar atunci trebuie **definită** o overload cu exact acel set (și nu există în lista de 7 de mai sus).

### Alte cazuri ilustrative

| Apel | Overload |
|------|----------|
| `test(a, b)` | #1 (fără tag-uri) |
| `test(a, b; tag1=1)` | #2 |
| `test(a, b; tag1=0)` | #3 |
| `test(a, b; tag1=2)` | #4 |
| `test(a, b; tag2=1)` | #7 |
| `test(a, b; tag1=1 tag3)` | **eroare** — niciun def cu `{ tag1:1, tag3:1 }` (lipsește `tag2=3` din #6) |
| `test(a, b; tag3)` | **eroare** — niciun def cu doar `{ tag3:1 }` |

## Faza 2 (neimplementat)

- Tag-uri pe built-ins (`ADD`, `SUM`, …)
- Overload-uri cu arity diferită sub același nume
- Valori tag ca expresii runtime (nu doar literali)
