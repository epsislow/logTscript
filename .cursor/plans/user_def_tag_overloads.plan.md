---
name: User def tag overloads
overview: "Faza 1 (implementată): tag-uri user `def` cu overload exact. Faza 2a (implementată): tag bool `signed` pe ADD/SUBTRACT/GT/LT/MIN/MAX/CLAMP. Faza 2b (planificată): MULTIPLY/MAC/RSHIFT aritmetic."
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
  - id: builtin-signed-helpers
    content: "Helperi two's complement: interpretare signed, compare signed, overflow (reutilizare aluSignedOverflowAdd/Sub)"
    status: completed
  - id: builtin-signed-dispatch
    content: "interpreter.call() — după parse callTags, ramură signed pe ADD/SUBTRACT/GT/LT/MIN/MAX/CLAMP"
    status: completed
  - id: builtin-signed-doc
    content: "arithmetic.md + builtin doc + exemple logts-play ADD(acc,delta; signed), GT/LT signed vs unsigned"
    status: completed
  - id: builtin-signed-tests
    content: "Teste builtin-signed — overflow, compare 1111 vs 0010, regresie unsigned fără tag"
    status: completed
  - id: builtin-signed-phase2b
    content: "Iteratie urmatoare: MULTIPLY, MAC, RSHIFT/ASHR cu signed (daca se confirma semantica)"
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

## Faza 2a — built-in `signed` (implementat)

### Scop confirmat

- **Nu** extindem `comp [alu]` ca produs principal — scopul e **built-in în script** pentru orice utilizare.
- Apel tip doc: `ADD(acc, delta; signed)`, `GT(a, b; signed)`, fără PCB/chip.
- **Fără tag** = comportament **unsigned actual** (compatibilitate totală cu scripturile existente).
- **Cu tag bool `signed`** = interpretare **two's complement** pe lățimea operandului `W` (MSB = semn).

Parserul și `callTags` din faza 1 sunt deja pregătite; faza 2 adaugă ramificare în `interpreter.call()` **înainte** sau **după** rezolvarea built-in-ului, pe baza prezenței tag-ului `signed`.

### Scope iteratie 2a (prima implementare)

| Built-in | Comportament cu `; signed` |
|----------|----------------------------|
| **ADD** | Același `result` pe biți (mod 2^W); al 2-lea return = **overflow signed** (nu carry unsigned) — reutilizare `aluSignedOverflowAdd` din [`alu-devices.js`](../v0_3_2/devices/alu-devices.js) |
| **SUBTRACT** | Același `result` pe biți; al 2-lea return = **overflow signed** la scădere — `aluSignedOverflowSub` |
| **GT**, **LT** | Comparare numerică **signed** (ex. `1111` pe 4 biți = −1, nu 15) |
| **MIN**, **MAX** | Min/max după ordinea **signed** |
| **CLAMP** | Clamp în interval interpretat **signed** |

`doc(ADD)` listează ambele variante, ex.:

```text
ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry
ADD(Xbit a, Xbit b; signed) -> Xbit result, 1bit overflow
```

### Scope iteratie 2b (următoarea fază)

| Built-in | Motiv amânare |
|----------|----------------|
| **MULTIPLY**, **MAC** | Semantica `over`/lățime la produs signed e mai ambiguă |
| **RSHIFT** (sau **ASHR**) | **Nu** e doar interpretare — e **altă operație pe biți** (vezi mai jos) |

### De ce RSHIFT e diferit (nu e „signed ca la ADD”)

- **ADD / GT cu `signed`:** aceiași biți la intrare/ieșire; se schimbă doar **cum numerotăm** (15 vs −1) și ce înseamnă flag-ul.
- **RSHIFT fără `signed` (azi):** shift **logic** la dreapta — se bagă **0** în stânga.

  ```text
  4bit 1111  RSHIFT(..., 1)  →  0111   (bit de semn pierdut)
  ```

- **RSHIFT / shift aritmetic cu `signed`:** se **replică MSB** (bitul de semn), ca la −1 să rămână −1 după shift:

  ```text
  4bit 1111  (=-1)  ASHR(..., 1)  →  1111   (tot -1 pe 4 biți)
  4bit 0111  (= 7)  ASHR(..., 1)  →  0011   (= 3)
  ```

De aceea RSHIFT nu intră în prima iteratie cu ADD/GT: `RSHIFT(x, n; signed)` = **shift aritmetic la dreapta** (echivalent `ASHR` din ALU — vezi [`alu.md`](../v0_3_2/doc/alu.md#arithmetic-shift-right-vs-logical-ashr--rshift)).

### LSHIFT — **nu** primește `signed` (2a / 2b)

Shift **stânga** logic și aritmetic sunt **aceeași operație pe biți**: se mută la stânga, se completează cu **0** la dreapta.

```text
4bit 1111  LSHIFT(..., 1)  →  1110   (identic indiferent de interpretare signed/unsigned)
4bit 0111  LSHIFT(..., 1)  →  1110   (= 14 unsigned sau -2 signed pe 4 biți — aceiași biți)
```

- **Fără tag** și **cu `signed`** → același rezultat pe wire.
- Ce *poate* diferi la signed e doar **detecția de overflow** („înmulțire cu 2” depășește intervalul signed) — asta e problemă de flag/documentație, nu o a doua variantă de shift. Dacă e nevoie mai târziu: `ADD(x, x; signed)` sau flag separat, nu `LSHIFT(...; signed)`.

**Concluzie plan:** `LSHIFT` rămâne **în afara** scope-ului tag `signed`.

### LROTATE și RROTATE — **nu** primește `signed`

Rotațiile sunt **circulare pe biți** — niciun bit nu „iese”; nu există umplere cu 0 sau cu MSB.

```text
4bit 1111  RROTATE(..., 1)  →  1111
4bit 1010  LROTATE(..., 1)  →  0101
```

Rezultatul depinde doar de pattern-ul de biți, **nu** de interpretarea numerică signed/unsigned. În CPU-uri reale, rotate nu are variantă signed.

**Concluzie plan:** `LROTATE` / `RROTATE` rămân **în afara** scope-ului tag `signed` (la fel ca porțile logice).

### Rezumat familie shift / rotate

| Built-in | `signed` în 2a | `signed` în 2b | Motiv |
|----------|----------------|----------------|-------|
| **LSHIFT** | nu | nu | Operație identică signed/unsigned |
| **RSHIFT** | nu | **da** (`; signed` = ASHR) | Logic vs aritmetic diferă la dreapta |
| **LROTATE** | nu | nu | Rotație pur bitwise |
| **RROTATE** | nu | nu | Rotație pur bitwise |
| **REVERSE** | nu | nu | Inversare ordine biți, fără sens signed |

### Explicit **fără** `signed`

Porți logice (`AND`, `OR`, `XOR`, `EQ` bitwise, …), `MUX`/`DEMUX`/`REG`, analiză biți (`HIGH`, `PARITY`, …), **LSHIFT**, **LROTATE**, **RROTATE**, **REVERSE**, conversii `N2N10S`/`N10S2N`, `SUM`/`DOT`, `ZCONNECT` — rămân neschimbate.

### Exemple doc / script țintă (2a)

```logts-play
4wire acc = 0111
4wire delta = 0001
4wire nextU, 1wire carry = ADD(acc, delta)
4wire nextS, 1wire ovf = ADD(acc, delta; signed)
show(nextU)
show(carry)
show(nextS)
show(ovf)
```

```logts-play
4wire a = 1111
4wire b = 0010
1wire gtU = GT(a, b)
1wire gtS = GT(a, b; signed)
show(gtU)
show(gtS)
```

### Fișiere estimate (2a)

| Fișier | Schimbare |
|--------|-----------|
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | Ramuri signed; extindere `BUILTIN_DOC` cu overload tag |
| [`alu-devices.js`](../v0_3_2/devices/alu-devices.js) sau modul nou | Export helperi overflow / compare signed reutilizabili |
| [`arithmetic.md`](../v0_3_2/doc/arithmetic.md) | Secțiune `signed`; exemple `logts-play` |
| [`builtin-functions.md`](../v0_3_2/doc/builtin-functions.md) | Index către signed |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | Grup `builtin-signed` |

### În afara scope-ului faza 2

- Tag-uri pe funcții user în afara celor deja implementate (faza 1 e completă)
- Overload arity diferit pe același nume built-in
- `DIVIDE` signed
- Înlocuirea `comp [alu]` — rămâne opțional pentru design hardware
