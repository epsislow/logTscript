---
name: inline logic engine — plan 2
overview: Continuare [inline_logic.plan.md](inline_logic.plan.md) — de la **Faza 100** / **D1000**; backlog amânat **3+a …**; primul subiect **predicate `$` / `$$`** (unique & keyed state).
todos:
  - id: logic2-deferred-table
    content: "Menține tabel backlog 3+a … (migrate din 2+a/2+b/2+f/2+j + sloturi viitoare)"
    status: pending
  - id: logic-unique-keyed-100
    content: "Faza 100 (3+a): predicate $/$$ — D1000–D1017✅ (ready-to-implement)"
    status: pending
  - id: logic-unique-100a
    content: "F100a: tokenizer $/$$ + validare nume predicate — teste 4485+"
    status: pending
  - id: logic-unique-100b
    content: "F100b: normalizare KB static + runtime merge overlay/seed — teste 4495+"
    status: pending
  - id: logic-unique-100c
    content: "F100c: mutation + commit — înlocuire la + / - / ~ — teste 4505+"
    status: pending
  - id: logic-unique-100d
    content: "F100d: reguli + solve pass — concluzii $/$$ — teste 4515+"
    status: pending
  - id: logic-unique-100e
    content: "F100e: fact index + constraints + query — teste 4525+"
    status: pending
  - id: logic-unique-100f
    content: "F100f: doc EN (inline-logic, logic-runtime) + logts-play verify"
    status: pending
  - id: f104-rng-per-comp
    content: "F104a: randomSeed per comp — get/set state RNG, swap la exec pass — teste 4547+"
    status: completed
isProject: false
---

# Plan: `inline [logic]` + `comp [logic]` — plan 2 (continuare)

> **Predecesor:** [inline_logic.plan.md](inline_logic.plan.md) — **F0–F45✅** livrate (**D1–D388✅**); ultimul test ID **4484**.  
> **Acest plan:** faze noi de la **Faza 100**; decizii noi de la **D1000**; itemi amânați **3+a, 3+b, …** (tabel separat).  
> **Sketch sursă F100:** [logic_predicates_unique_n_keyed](../my_ideas/logic_predicates_unique_n_keyed)

---

## Legenda

| Marcaj | Semnificație |
| ------ | ------------ |
| **(recommended)** | Opțiunea recomandată de analiză |
| **(change)** | Alternativă validă; diferă de sketch sau de direcția implicită |
| **(ready-to-implement)** | Faza poate începe după confirmarea deciziilor ei |
| **(completed)** | Decizie luată / fază implementată |
| **3+a … 3+z** | Faze **amânate** în plan 2 — vezi [Backlog faze amânate](#backlog-faze-amânate-3a--3z) |
| ✅ | Backlog **promovat / livrat** |
| ❌ | Backlog **respins** definitiv |
| 🟠✗ | Backlog **închis** — alternativa nu se face |
| ⏳ | Backlog **deschis** — încă amânat |
| ⏸ | Backlog **pause** — idee, fără promovare fază |

**Notă:** itemii **1+x** (post-MVP din plan 1) și **2+x** (amânate plan 1) rămân documentați în [inline_logic.plan.md](inline_logic.plan.md). Plan 2 folosește **3+x** pentru amânări **noi sau migrate** aici.

---

## Reguli planului

1. **Continuitate:** nu reluăm deciziile **D1–D388** — le importăm implicit; schimbările breaking necesită decizie nouă **D1000+** și notă în ambele planuri.
2. **Numerotare faze:** **Faza 100, 101, …** (plan 2); subfaze **F100a, F100b, …** ca la F35/F45.
3. **Numerotare decizii:** **D1000, D1001, …** — confirmare în scris de la user; până atunci marcaj **draft**.
4. **Backlog amânat:** ID **3+a, 3+b, 3+c, …** — tabel master [mai jos](#backlog-faze-amânate-3a--3z); promovare → devine **Faza N** cu secțiune completă.
5. **Implementare:** pattern legacy + wave în `tests/test_suite.js`; doc EN în `v0_3_2/doc/`; `node _run_test_suite_node.js -q` + `_verify_doc_examples.js` la done.
6. **Fără întrebări în chat pentru draft:** opțiunile stau în tabel + detaliu sub tabel; user confirmă **A/B/C** în scris.
7. **Sketch ≠ spec:** sketch-urile din `.cursor/my_ideas/` pot conține erori — analiza notează **(change)** unde e cazul.
8. **Legături:** fiecare fază citează fazele plan 1 pe care le extinde (ex. F11 mutation, F13 index, F44 commit).

---

## Stare la handoff (post-F45)

| Livrat plan 1 | Relevant plan 2 |
| ------------- | --------------- |
| Mutation `+`/`-`/`~`, `commit/…` (F44) | F100 — replacement în tranzacții |
| `data: overlay` / `static` / `seed` (F17) | F100 — normalizare per mod |
| Fact index + `count/2` (F13) | F100 — index aware `$`/`$$` |
| Control flow `||`, `if/3` (F45) | game state + `smart_or` patterns |
| **Nu există** `$`/`$$` în tokenizer azi | **F100a** — extindere lexer obligatorie |

**Teste:** 3605/3605 (ID max **4484**).

---

## Mapare decizii → faze (plan 2)

| Fază | Decizii | Status |
| ---- | ------- | ------ |
| *(rezervat)* | — | — |
| **Faza 101** Commit bound vars în `$`/`$$` (**post-F100 bugfix**) | **F101a ✅** | **P3 Monopoly** — normalize atom id→name la mutation deref |
| **Faza 102** Re-read automat `$`/`$$` după commit | **F102a ✅** | **B Monopoly** — fără `refresh/1` |
| **Faza 103** Fact read fără side-effect `$`/`$$` | **F103a ✅** | **C Monopoly** — guard `phase$(waitRoll)` nu mai rescrie store |
| **Faza 104** `randomSeed:` per componentă (RNG context swap) | **F104a ✅** | Monopoly dice — stream continuu per comp |
| *(rezervat)* | — | — |

---

## Backlog faze amânate (3+a … 3+z)

Tabel master — itemi **amânați** în plan 2. **Stare:** ⏳ deschis · ✅ promovat/livrat · ⏸ pause.

| Stare | ID | Subiect | Detaliu | Fază draft | Legat de |
| ----- | -- | ------- | ------- | ---------- | -------- |
| ⏳ | **3+a** | Predicate **`$`** / **`$$`** | Single-valued + keyed state — sketch [unique_n_keyed](../my_ideas/logic_predicates_unique_n_keyed) | **F100** | F11, F13, F17, F44 |
| ⏳ | **3+b** | Scope blocks nested | `warehouse { inside(…) … }` — path relativ (ex **2+a** plan 1) | **F101?** | F20a, D107 |
| ⏳ | **3+c** | Reguli sub prefix import | Body relativ la `use as` (ex **2+b** plan 1) | **F102?** | F20a, D107 |
| ⏳ | **3+d** | Cut în NAF — local cut | `\+ (Goal, !)` contorizat (ex **2+f** plan 1) | — | D149, F24 |
| ⏳ | **3+e** | Lazy streams / I/O | `lazy_read_lines`, wire stream, `lazy_findall` (ex **2+j** plan 1) | — | F37c, D296 |
| ⏸ | **3+f** | TCO / depth engine | Tail-call optimization sau trampoline JS; `maxDepth` semantic vs stack | — | F8, D25–D29 |
| ⏸ | **3+g** | `is/2` trig + log/exp | Funcții transcendentale post-F42 | — | F42, D332 |
| ⏸ | **3+h** | *(slot liber)* | — | — | — |
| ⏸ | **3+i** | *(slot liber)* | — | — | — |
| ⏸ | **3+j** | *(slot liber)* | — | — | — |

**Ordine recomandată (draft):** **3+a** (**F100**) → **3+b** / **3+c** (composiție) → **3+d** → **3+e** → rest **3+f …**

### Note migrate din plan 1

| Plan 1 | Plan 2 | Notă |
| ------ | ------ | ---- |
| **2+a** scope blocks | **3+b** | Draft opțiuni rămân în plan 1 până la promovare F101 |
| **2+b** reguli calificate | **3+c** | Idem |
| **2+f** cut în NAF | **3+d** | F24 MVP = eroare la `!` în `\+ (…)` |
| **2+j** lazy streams | **3+e** | Out of scope F37c (D296) |

---

## Backlog post-MVP plan 2 (4+a … 4+z)

Tabel **gol** — itemi noi post-plan-1 care **nu** sunt încă faze; distinct de **3+x** (faze amânate cu scope mare).

| Stare | ID | Subiect | Detaliu | Fază draft | Legat de |
| ----- | -- | ------- | ------- | ---------- | -------- |
| ⏸ | **4+a** | *(slot liber)* | — | — | — |
| ⏸ | **4+b** | *(slot liber)* | — | — | — |
| ⏸ | **4+c** | *(slot liber)* | — | — | — |

> Itemii **1+s**, **1+p**, **1+v**, … rămân în [Backlog post-MVP](inline_logic.plan.md#backlog-post-mvp) plan 1 dacă nu sunt migrate explicit aici.

---

## Faza 100 — Predicate **`$`** (single-valued) și **`$$`** (keyed) **(3+a — draft)**

> **Sursă:** sketch [logic_predicates_unique_n_keyed](../my_ideas/logic_predicates_unique_n_keyed).  
> **Extinde:** [Faza 11](inline_logic.plan.md#faza-11--runtime-mutation-done) (mutation store), [Faza 13](inline_logic.plan.md#faza-13--scale--perf-1q-completed--d60d68) (fact index), [Faza 17](inline_logic.plan.md#decizii-faza-17--comp-logic-data-static--seed-d8894-1r) (`data:` modes), [Faza 44](inline_logic.plan.md#faza-44--inline--retractall-via-2p--completed) (`commit`, `+`/`-`/`~` inline).  
> **Status:** **(ready-to-implement)** — **D1000–D1017✅** confirmed user 2026-08-27.

### Analiză direcție (sketch)

**Ce se dorește:** același model facts/rules/mutation ca Prolog, dar predicate cu **semantica de înlocuire**:

| Nume | Semantica sketch |
| ---- | ---------------- |
| `foo(...)` | Predicate ordinar — duplicate permise |
| `foo$(...)` | **Un singur fact activ** per semnătură **`foo$/N`** (N = arity) — assert nou **overwrite complet** (indiferent de valorile args) |
| `foo$$(Key, ...)` | **Un fact activ per cheie** (arg0) — restul args = payload suprascris la același key |

**Potrivire cu codebase:** overlay `adds`/`tombstones` + `logicFactClauseKey` folosesc cheie **fact complet ground** — pentru `$` trebuie **ștergere predecessori** la același `predicate/arity`; pentru `$$` la același `predicate/arity` + **cheie ground arg0**.

**Lacune / posibile erori în sketch:**

| # | Observație | Impact |
| - | ---------- | ------ |
| 1 | Tokenizer azi: ID = `[A-Za-z0-9_]` — **`$` ilegal** | F100a obligatoriu |
| 2 | `state$(machine1, running)` apoi `state$(machine2, stopped)` — sketch: **al doilea înlocuiește primul** (nu „per machine”) | Confuzie user — **`$$` pentru entity state**; doc clar |
| 3 | Reguli `position$(X) <- player(X)` — N soluții → N înlocuiri → **rămâne ultima în ordine discovery** | Comportament Prolog-like dar surpriză; vezi **D1012** |
| 4 | Static: `pos$(10). pos$(22). pos$(35).` — KB efectiv = un fact | Normalizare la load vs la query — vezi **D1006** |
| 5 | Chei compound — sketch corect; folosim egalitate ground existentă (`logicTermsEqualGround`) | OK dacă **D1008=A** |
| 6 | `- position$$(john, 10)` vs cheie parțial variabilă | vezi **D1014** |
| 7 | Constraints F12 — „max 1 fact” devine **structural** pentru `$` | vezi **D1015** |

**Verdict analiză:** direcția sketch e **coerentă** cu F11/F44 (state tip DB în KB logic); implementare = **strat de normalizare la insert** (static merge, mutation, rule conclusion, eventual fact-index delta). **Nu** e nevoie de motor nou de rezolvare.

### Problemă (stare azi post-F45)

| Situație | Comportament azi |
| -------- | ---------------- |
| `pos$(10). pos$(22).` în inline | **Ambele** facts în KB (dacă `$` ar parsea) |
| `+ position$(10). + position$(20).` în `commit` | **Ambele** în `adds` (chei fact diferite) |
| `position$$(p1, 10). position$$(p1, 20).` | Duplicate cheie logică — ambele supraviețuiesc |
| Reguli care emit același `$` | Multiple facts — backtracking normal |
| Token `pos$` / `pos$$` | **Parse error** (`$` neacceptat în ID) |

### Sintaxă țintă (din sketch)

```logts
inline [logic] .game:

    turn$(player1)
    score$(100)

    position$$(player1, 15)
    position$$(player2, 27)

    position$(X) <- currentPlayer(X)

    query state:
        turn$(T), score$(S)

:
```

| Formă | Semantica țintă |
| ----- | --------------- |
| **`name$` / `name$$(…)`** | Sufix **`$` / `$$` face parte din **numele predicate-ului**, nu modifier separat |
| **`foo` vs `foo$` vs `foo$$`** | Trei predicate **distincte** |
| **`$$`** | Primul argument = **cheie** (termen logic ground la assert) |
| **`logic { + … }` / `commit`** | Înlocuire conform tranzacției — ultimul `+` pentru aceeași slot/cheie câștigă **în cadrul commit-ului** |

### Decizii confirmate **D1000–D1017** **(user 2026-08-27)**

| ID | Subiect | Alegere |
| -- | ------- | ------- |
| **D1000** | Sufix în nume vs sintaxă separată | **A ✅** — `pred$` / `pred$$` parte din nume predicate |
| **D1001** | Lexer — formă `$` / `$$` | **A ✅** — suffix atom lowercase; `pos$$` un token |
| **D1002** | `$` — overwrite single-valued | **A ✅** — un fact activ per **`predicate$/N`**; overwrite **complet** indiferent de valorile args; **orice N** |
| **D1003** | `$$` — cheie + payload | **A ✅** — arg0 = cheie (atom/number/float/**compound** ground); args 1.. = payload suprascris |
| **D1004** | Ordine ops / commit | **A ✅** — ordinea **secvențială** de execuție; **fără** optimizare „ultimul `+` only” v1; `-` / `~` contează |
| **D1005** | Normalizare static + `use` | **A ✅** — collapse la assemble/merge; ordinea **`use`** + facts din module |
| **D1006** | `data: overlay` / `seed` / `static` | **A ✅** — replacement în `adds`/static; **`static`** fără mutation runtime |
| **D1007** | Reguli — concluzii `$`/`$$` | **A ✅** — side-effect **per succes** de regulă (nu pas special „find last”) |
| **D1007b** | Reguli head **`$$`** — read old + write new | **A ✅** — pattern `score$$(P,S) <- …` / `bump` cu Old/New; overwrite **per cheie P** la fiecare reușită |
| **D1008** | Egalitate chei `$$` compound | **A ✅** — `logicGroundTermKey(arg0)`; *notă:* `gameEnded$$(G,yes)` e **`$$`** (chei diferite dacă G schimbă) — pentru stadiu unic global → **`$`** |
| **D1009** | Fact index F13 | **A ✅** — delta remove+add pe același slot `$`/`$$` |
| **D1010** | `-` / `~` | **A ✅** — aliniat F44 retractall pe slot/cheie |
| **D1011** | Constraints F12 | **A ✅** — constraint pe `$`/`$$` validează conținut; unicitate structurală engine |
| **D1012** | Doc reguli user `$` multi-soluție | **B ✅** — **`turn$(P) <- player(P)` permis**; doc pitfalls + exemple intenție explicită; **fără** interzicere compile |
| **D1013** | Query / backtracking | **A ✅** — Prolog normal; KB max 1 fact `$`; query poate avea N soluții dacă **proba trece prin regulă** cu backtrack |
| **D1014** | Ground la mutation `+`/`-`; `~` doar `_` | **B ✅** — var Prolog liberă → **`mutationFailed`**; **wire refs** decode → ground OK (F25); `~`: `_` wildcard, nu `K` numit |
| **D1015** | `.world:query` | **A ✅** — read-only; citește `$`/`$$` din KB static |
| **D1016** | DCG / heads rezervate | **A ✅** — `-->` head cu `$`/`$$` permis |
| **D1017** | Teste / doc | **A ✅** — teste **4485+** legacy+wave; doc EN + pitfalls + maxSolutions |

---

### D1000 — Sufix în nume vs sintaxă separată

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A — sufix în nume ✓ (recommended)** | `pos$`, `property$$` — parte din atom predicate | Sketch; zero keywords noi; `pos` ≠ `pos$` | Extindere lexer |
| **B — keyword sau annotation (change)** | `unique pos(...)` / `pos(...)!` | Vizibil în syntax | Breaking; nu e sketch |
| **C — op dedicat mutation-only (change)** | Doar `+` cu flag | Simplu la parse | Reguli/facts statice nu beneficiază |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1001 — Lexer `$` / `$$`

| Opțiune | Regulă |
| ------- | ------ |
| **A — suffix atom ✓ (recommended)** | ID lowercase: `[a-z][a-z0-9_]*(\$\$|\$)?` — **`$$` preferat** față de `$` la tokenize (`pos$$` nu devine `pos$` + `$`) |
| **B — `$` oriunde în nume (change)** | `foo$bar` permis | Confuzie cu alte `$` viitoare |
| **C — doar un `$` final, `$$` ca doi predicate (change)** | Respins — contrazice sketch |

**Validări parse:**

- `Pos$` / `POS$` — **eroare** (atom must start lowercase)
- `$foo` — **eroare**
- `foo$$$` — **eroare** (max `$$`)

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1002 — `$` single-valued — overwrite per semnătură **`pred$/N`**

> **Clarificare user:** nu e vorba doar de arity 1 — funcționează pentru **orice N**. Nu comparăm valorile argumentelor: orice assert nou **înlocuiește integral** factul anterior pe aceeași semnătură.

| Opțiune | Comportament |
| ------- | ------------ |
| **A — un slot per `predicate$/N`, overwrite complet ✓** | Indiferent de valorile args — ultimul fact câștigă; `playerPosition$/3` distinct de `playerPosition$/1` |
| **B — per primul argument (change)** | `$` devine pseudo-`$$` | Redundant cu `$$`; contrazice sketch |
| **C — doar arity 0/1 (change)** | Doar nullary/unary | Respins — trebuie orice N |

**Exemple confirmate (arity 1):**

```logts
playerPosition$(100)   /* ok — KB: playerPosition$(100) */
playerPosition$(120)   /* overwrite — KB: playerPosition$(120); (100) nu mai există */
```

**Exemple confirmate (arity 3):**

```logts
playerPosition$(10, 10, 30)   /* ok */
playerPosition$(20, 30, 40)   /* overwrite integral — (10,10,30) dispare */
```

| Regulă | Semantica |
| ------ | --------- |
| **Slot** | **`predicate$/N`** unde **N** = număr argumente (0, 1, 3, …) |
| **Overwrite** | Nu contează dacă args diferă — se înlocuiește **tot factul** |
| **Distinct arity** | `foo$/1` și `foo$/3` = **două sloturi** (pot coexista) |
| **Entity state** | Per entitate / per cheie → folosește **`$$`**, nu `$` |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1003 — `$$` keyed — cheie (arg0) + payload (rest)

| Opțiune | Regulă |
| ------- | ------ |
| **A — arg0 = cheie; rest = payload ✓** | `property$$(boardwalk, 400, 50)` — cheie `boardwalk`; la re-assert aceeași cheie → payload nou |
| **B — cheie implicită din arity (change)** | Doar un arg | Prea limitat |
| **C — cheie ca listă args (change)** | Primele k args | Ambiguu |

**Cheie arg0 — tipuri permise:** atom, number, float, **compound ground** (ex. `player(id(10), team(red))`).

**Contrast cu `$`:** la `$$` comparăm **doar arg0**; args 1.. se suprascriu odată cu factul. La `$` nu există cheie — un singur fact per **`pred$/N`**.

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1004 — Ordinea ops — secvențial, inclusiv `-` / `~` în `commit`

| Opțiune | Unde |
| ------- | ---- |
| **A — ordine secvențială de execuție ✓** | Static: ordinea textuală; **`commit`**: fiecare op **în ordine**; `logic { … }` la fel |
| **B — ordine arbitrară (change)** | Nondeterminist | Inacceptabil |
| **C — prioritate static > dynamic (change)** | Static nu e suprascris | Contrazice sketch |

**Regulă:** „ultimul câștigă” = **ultimul op care a rulat cu efect**, nu „ultimul `+` din commit ignorând `-`/`~`”.

**Exemplu user — de ce NU optimizăm v1:**

```logts
reset() <- commit(
    + pos$(1),
    + pos$(2),
    ~ pos$(_)
)
```

| Pas | Op | KB efectiv `pos$/1` |
| --- | -- | ------------------- |
| 1 | `+ pos$(1)` | `pos$(1)` |
| 2 | `+ pos$(2)` | `pos$(2)` — overwrite |
| 3 | `~ pos$(_)` | **(gol)** — retractall slot |

**Greșit (optimizare interzisă v1):** „păstrează doar ultimul `+`” → `pos$(2)` — **ignoră** `~` → **bug**.

**Implementare v1:** simulare **secvențială** a ops (ca F44 azi); **fără** peephole „collapse `+`/`~`”. Optimizări → backlog post-F100.

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1005 — Normalizare KB static + `use` — **A vs B** cu scripturi

**Problema:** mai multe linii `pos$(…)` în același modul sau după **`use`** — ce intră în KB la elaborare?

#### **A — normalize la assemble (recommended) ✓**

După ce toate modulele sunt merge-uite (`use` în ordinea declarată), parcurgem facts **în ordinea finală** și aplicăm overwrite `$`/`$$`. KB elaborată = **deja minimală** (max 1 fact per slot `$`, max 1 per cheie `$$`).

```logts
inline [logic] .base:

    score$(10)
    score$(20)

:

inline [logic] .game:

    use .base

    score$(100)

    query q:
        score$(S)

:
```

**Ordinea merge (draft):** facts din `.base` (`10`, apoi `20` → rămâne `20`) → apoi facts `.game` (`100` overwrite) → **KB elaborată:** `score$(100)` **un singur fact**.

```logts
inline [logic] .players:

    position$$(alice, 1)
    position$$(bob, 2)

:

inline [logic] .world:

    use .players

    position$$(alice, 5)
    position$$(alice, 9)

:
```

**După normalize keyed:** `position$$(alice, 9)` (ultimul alice), `position$$(bob, 2)`.

#### **B — lazy la fiecare query (change)**

Păstrăm **toate** liniile `pos$(10). pos$(22). pos$(35).` în structura internă; la **fiecare** `set = 1` / query scanăm toate facts și alegem câștigătorul.

| | **A** | **B** |
| - | ----- | ----- |
| KB elaborată | 1 fact / slot | N facts păstrate |
| Query | O(1) lookup slot | O(n) scan predicate |
| `use` merge | Normalize o dată | Scan repetat |
| Aliniere D1004 | Ordinea merge = ordinea overwrite | Ambiguu când static + dynamic |

**Decizie:** **A ✅** — confirmed user 2026-08-27; ordinea **`use`** + ordinea facts din fiecare modul contează.

---

### D1006 — `data: overlay` / `seed` / `static` — ce înseamnă **`adds`**?

> **Terminologie F11/F17** ([logic-runtime.md](../v0_3_2/doc/logic-runtime.md)): KB **efectivă** = ce vede engine-ul la solve.

#### Două straturi (mod **`overlay`** — default)

```text
┌─────────────────────────────────────────┐
│  STATIC — din inline [logic] (fișier)   │  ← facts + rules din sursă
└─────────────────────────────────────────┘
                    +
┌─────────────────────────────────────────┐
│  DYNAMIC STORE (per comp [logic])       │
│    adds      = Map factKey → fact       │  ← ce ai adăugat cu +
│    tombstones = Set factKey             │  ← ce ai ascuns cu -
└─────────────────────────────────────────┘
                    =
         RUNTIME KB = static ∖ tombstones ∪ adds
```

- **`adds`** = „facts dinamice” adăugate cu **`+`** / **`commit(+ …)`** — **nu** modifică fișierul inline.
- **`tombstones`** = chei de facts **statice** pe care `-` le **ascunde** (overlay); factul rămâne în sursă, dar nu apare în KB efectivă.

#### `$` / `$$` în fiecare mod

| Mod | Unde trăiesc facts `$` inițiale | Mutation `+`/`-`/`~` | `$` overwrite |
| --- | ------------------------------- | -------------------- | ------------- |
| **`overlay`** (default) | Static inline + **`adds`** | ✅ `logic { }`, `commit` | **`+`** înlocuiește slot în **`adds`**; `-` poate tombstone static; `~` golește slot |
| **`seed`** | La init: facts ground copiate în **`adds`**; inline static rămâne „catalog” | ✅ | Ca overlay, dar **fără tombstones** — `-` șterge din **`adds`** |
| **`static`** | Doar static inline | ❌ **`logic { }` interzis** | Doar normalize la compile; **zero** dynamic store |

#### Script — **`overlay`** + `pos$`

```logts-play
inline [logic] .g:

    pos$(1)

    query read:
        pos$(X)

:

comp [logic] .gLogic:
    on: 1
    .g { }
:

8wire x = 0
1wire trigger = 1

.gLogic:{
    logic { + pos$(99) }
    read:0 >= x
    set = trigger
}
```

- Înainte mutation: runtime = static `pos$(1)` (sau normalize deja minimal).
- După `+ pos$(99)`: **`adds`** conține `pos$(99)` → query **`x = 99`**.

#### Script — **`static`** (read-only)

```logts
comp [logic] .gLogic:
    data: static
    .g { }
```

- Runtime = **doar** facts din inline (normalizate).
- **`logic { + pos$(2) }`** → **eroare elaborare** — nu există **`adds`** pe componentă.
- **`pos$`** tot funcționează **la parse** (mai multe linii → normalize → un fact).

#### Script — **`seed`**

```logts
comp [logic] .gLogic:
    data: seed
```

- La init: `pos$(1)` din inline → copiat în **`adds`**.
- `+ pos$(99)` → overwrite în **`adds`**; inline sursă **neschimbat**.
- `- pos$(99)` → șters din **`adds`** (nu tombstone pe static).

**Draft D1006:** aceeași logică replacement ca facts obișnuite; **`static`** = fără mutation runtime.

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1007 — Reguli cu head `$` / `$$` — exemplu **A** + clarificare backtracking

**Semantica A:** la **fiecare succes** al regulii (body reușit + head instantiat), engine face assert cu replacement — ca un `+` inline. **Nu** există pas special „caută toate soluțiile ca să o păstrezi pe ultima”.

#### Nu caută „last one” — side-effect per succes

| Întrebare | Răspuns |
| --------- | ------- |
| Engine face scan dedicat „ultima soluție”? | **Nu** |
| Când se scrie în KB? | **Imediat** când regula **reușește** o dată |
| Câte overwrite-uri? | **Câte reușite** explorează backtracking-ul **în acel context** |
| Cine „câștigă” în KB? | **Ultima reușită** din secvența explorată (ordinea discovery Prolog) |

#### Exemplu — `turn$(P) <- player(P)`

```logts
    player(alice)
    player(bob)
    player(carol)

    turn$(P) <- player(P)

    query who:
        turn$(T)
```

**Caz 1 — query cu backtracking (toate soluțiile):**

| Reușită | Side-effect KB | Soluție returnată `T` |
| ------- | -------------- | ----------------------- |
| `P=alice` | `turn$(alice)` | alice |
| backtrack → `P=bob` | `turn$(bob)` | bob |
| backtrack → `P=carol` | `turn$(carol)` | carol |

→ Query poate returna **3 soluții**; KB **finală** după explorare completă: **`turn$(carol)`** (ultima în ordinea facts `player/1`).

**Caz 2 — primul succes suficient (`!`, `if/3`, sau goal fără backtrack):**

```logts
    initTurn() <- turn$(P), player(P), !
```

→ **O singură** reușită (`alice` dacă e primul fact) → KB **`turn$(alice)`** — **nu** ajunge la carol.

**Caz 3 — intenție explicită „ultimul player” (recommended în doc):**

```logts
    /* nu te baza pe side-effect backtracking */
    setLastTurn() <- commit(+ turn$(carol))   /* sau findall + logic explicit */
```

#### Implicație perf

- **Nu** e O(n) **extra** „find last” — e doar costul normal Prolog al body-ului (`player(P)` = câte choice points/backtrack **oricum**).
- Dacă vrei **o singură** scriere: **`!`**, **`if/3`**, sau **`commit(+ turn$(X))`** cu X deja calculat.

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1007b — Reguli head **`$$`** — read old + write new **(confirmed ✅)**

Pattern confirmat pentru **`$$`**: body citește starea veche pe cheie; head scrie starea nouă — overwrite **doar** pe **arg0** (cheia).

```logts
    score$$(P, S) <- player(P), S is 0

    bump(P) <-
        score$$(P, Old),
        New is Old + 10,
        score$$(P, New)
```

La fiecare reușită a lui `bump/1`: cheia **`P`** identică → payload **`New`** înlocuiește **`Old`**.

**Decizie:** **A ✅** — confirmed user 2026-08-27 (notă legată de **D1007**).

---

### D1008 — Egalitate cheie **compound** (+ lookup canonical / „hash” structural)

**Problema:** când două asserts `$$` „sunt aceeași cheie” dacă cheia e compound **complex** (ex. din regulă)?

#### **A ✅ — structural ground equal** (confirmed user 2026-08-27)

**Semantica:** două chei sunt aceleași dacă termenii ground sunt **structural identici** (`logicTermsEqualGround`) — atom, number, float, listă, compound imbricat, orice adâncime.

**Implementare (recommended):** index slot `$$` cu cheie **`logicGroundTermKey(arg0)`** — deja folosit la fact keys în F13:

```text
player(id(10), team(red))
  → c:player/2:c:id/1:n:10↔c:team/1:a:red
```

| Opțiune | Mecanism | Pro | Contra |
| ------- | -------- | --- | ------ |
| **A — canonical key ✓ (recommended)** | `logicGroundTermKey(arg0)` în `Map` | O(1) lookup; compound/list/atom/number unified; **deja în engine** | O(size term) la serializare — acceptabil |
| **B — SHA/crypto hash pe string (change)** | `hash(logicGroundTermKey(k))` | Sună ca „hash” | Coliziuni teoretice; **redundant** dacă A e canonical |
| **C — compare ad-hoc per kind (change)** | ramuri atom vs compound | — | Duplică logic; compound adânc = fragile |

**De ce A acoperă ideea ta de „hash”:** `logicGroundTermKey` **este** amprenta canonică (fingerprint) a obiectului ground — nu contează dacă e atom, number sau compound adânc; **aceeași structură → aceeași cheie Map → overwrite**.

#### Exemplu static

```logts
    playerState$$(player(id(10), team(red)), 100, alive)
    playerState$$(player(id(10), team(red)), 80, wounded)
```

→ **un** fact (payload `80, wounded`).

#### Exemplu regulă — cheie compound din soluție

```logts
    getGameState(state(turn(3), board([c1,c2,c3]), phase(end)))

    markEnded() <-
        getGameState(G),
        gameEnded$$(G, yes)

    markEndedAgain() <-
        getGameState(G),
        gameEnded$$(G, no)
```

| Pas | Ce se întâmplă |
| --- | -------------- |
| 1 | `G` = compound ground complex (din `getGameState/1`) |
| 2 | `gameEnded$$(G, yes)` → slot key = `logicGroundTermKey(G)` |
| 3 | A doua regulă cu **același G ground** → **aceeași** cheie → overwrite `yes` → `no` |
| 4 | Dacă `getGameState` produce **alt** board/turn → **alt** G → **altă** intrare `$$` (coexistă) |

**Nu** hash pe reprezentare text Prolog/show — doar pe **term logic ground** intern.

**La assert (mutation D1014):** arg0 trebuie **ground** — variabile libere → eroare; compound produs de regulă e OK dacă fully ground.

**Decizie:** **A ✅** — confirmed user 2026-08-27.

> **Corecție user (D1008):** `gameEnded$$(getGameState(), yes)` — la **`$$`**, dacă `G` se schimbă → **chei diferite** (corect pentru keyed). Pentru **un singur flag global** indiferent de stare → **`gameEnded$(yes)`** (`$`, un slot).

---

### D1009 — Fact index (F13)

| Opțiune | Implementare |
| ------- | ------------ |
| **A — delta-aware ✓ (recommended)** | `logicApplyFactIndexDelta`: la `add` pe `$`/`$$`, **remove** intrări conflict din index apoi add |
| **B — bypass index pentru `$` (change)** | Scan liniar | Regresie perf |
| **C — bucket separat uniqueStore (change)** | Map side-by-side | Duplică sursa adevărului |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1010 — `-` și `~`

| Formă | Semantica draft |
| ----- | --------------- |
| `- position$(10)` | Remove fact **exact** (ground) |
| `- position$$(john, 10)` | Remove entry cheie `john` dacă fact match |
| `~ position$(_)` | Retract **unicul** slot `$` |
| `~ position$$(K, _)` | Retract **toate** cheile (pattern F44 `~`) |

**Decizie:** **A ✅** — confirmed user 2026-08-27 — aliniat F44 retractall.

---

### D1011 — Constraints F12 + `$` / `$$` — exemplu

**Nu** e builtin special — e **`constraint Head <= Body`** obișnuit (F12), cu head pe predicate `$`/`$$`.

**Rol dual:**

| Mecanism | Ce garantează |
| -------- | ------------- |
| **Engine F100** | Structural: max **1** fact per slot `$` sau per cheie `$$` |
| **Constraint user** | Validare **conținut** la facts **propuși** (mutation/commit) — ca la facts normale |

#### Script — `$` global score

```logts
inline [logic] .game:

    score$(100)

    constraint score$(S) <=
        number(S),
        S >= 0,
        S =< 9999

    query readScore:
        score$(S)

:
```

| Eveniment | Rezultat |
| --------- | -------- |
| Init `score$(100)` | OK — trece constraint |
| `commit(+ score$(500))` | OK |
| `commit(+ score$(-1))` | **Fail** constraint — `S >= 0` |
| Două `score$` în sursă | Engine normalize → **un** fact; constraint vizează **acel** fact la validate |

Constraint **`score$(S) <= …`** nu „impune singur” unicitate — engine o garantează oricum; body-ul verifică **valoarea** lui S când apare un fact nou/modificat.

#### Script — `$$` per player

```logts
    player(alice)
    player(bob)

    constraint health$$(P, H) <=
        player(P),
        H >= 0,
        H =< 100

    query vitals:
        health$$(P, H)
```

| Eveniment | Rezultat |
| --------- | -------- |
| `+ health$$(alice, 80)` | OK — alice există, H in range |
| `+ health$$(ghost, 50)` | **Fail** — `player(ghost)` false |
| `+ health$$(alice, 150)` | **Fail** — `H =< 100` |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1012 — Reguli user cu head `$` — documentare (**B ✅** — permis, nu interzis)

**Clarificare importantă:** **B nu interzice** `turn$(P) <- player(P)`. User **poate** scrie regula; diferența față de **A** e doar **cât de explicit explicăm** în doc (pitfalls + exemple intenție clară). **Zero** erori compile în ambele cazuri.

**Nu** e vorba de builtins cu `$` — `findall/3`, `member/2`, … rămân nenumite cu `$`.

#### KB vs soluții query — de ce am menționat „mai multe soluții”

Două lucruri **distincte** (user corect: KB `$` = un fact; confuzia era la **query**):

| | **KB (storage `$`)** | **Soluții query / redirect** |
| - | -------------------- | ---------------------------- |
| **D1007** | La fiecare succes regulă → overwrite → **max 1 fact** în KB | — |
| **D1013 A** | Citești fact → **max 1** match din KB | Regulă + backtrack → engine colectează **≤ maxSolutions**; **pout default** poate expune **toate** (vector/matrix), nu doar ultima — vezi **`;last`** |
| După query complet | KB `$` = **ultimul** side-effect overwrite | Wire: 1..N valori după policy + cap engine |

**Exemplu — doar fact în KB (1 soluție query):**

```logts
    turn$(carol)          /* fact static sau deja scris */

    query who:
        turn$(T)
```

→ **O soluție:** `T = carol` (lookup fact, fără re-probare regulă).

**Exemplu — query reprobează regula (N soluții posibile):**

```logts
    player(alice)
    player(bob)
    player(carol)

    turn$(P) <- player(P)

    query who:
        turn$(T)
```

Engine poate: regula `turn$(T)` ← `player(T)` → 3 soluții **`T`**; la fiecare succes, side-effect overwrite KB. **KB final:** `turn$(carol)`; **pout/query:** poate **3 rânduri** (F10 `;unique` / `maxSolutions` / discovery) — **nu** automat „doar ultima”.

**Dacă vrei o singură soluție returnată:** `;first` pe query, **`!`** după primul succes, **`if/3`**, sau **`commit(+ turn$(T))`** cu T calculat — **nu** e impus de `$` automat.

#### **A vs B** (ambele permit aceeași sintaxă)

| | **A — silent** | **B — doc explicit ✓** |
| - | -------------- | ------------------------ |
| `turn$(P) <- player(P)` | ✅ permis | ✅ **permis** |
| Compile | OK | OK |
| Doc | minim | secțiune **Pitfalls**: KB vs query solutions; exemple **commit** / **`$$`** când intenția e explicită |

**Doc B — exemple recomandate (opțional, nu obligatoriu):**

```logts
    /* OK — permis; știi că fiecare reușită suprascrie KB */
    turn$(P) <- player(P)

    /* preferat când vrei set determinist */
    setTurn(T) <- commit(+ turn$(T))
```

**Decizie:** **B ✅** — confirmed user 2026-08-27 — documentăm comportamentul; **nu** interzicem regula.

#### Doc F100f — **`maxSolutions`** vs KB `$`/`$$` vs pout ( obligatoriu la D1012 B )

**Ce este `maxSolutions` (F8):**

| | Semnificație |
| - | ------------ |
| **`maxSolutions`** | **Cap engine backtracking** — câte soluții poate **colecta** solver-ul per query în timpul rezolvării (default **64**) |
| **Nu** | „Max rânduri pout” ca setare separată — pout derivă din soluțiile colectate + policy redirect |
| **`truncated` pout** | **`1`** dacă engine-ul a găsit **mai multe** soluții decât `maxSolutions` → restul **tăiate** la cap |

**Lanț cauzal (concluzie user + nuanțe pout):**

```text
backtracking explorează
    → colectează soluții (max maxSolutions)
        → policy query (;first / ;last / ;unique / implicit toate)
            → redirect >= wire (scalar / vector / matrix)
                → pout observability (truncated, depthExceeded, …)
```

| Strat | Limitare `$` / `$$` | Limitare engine |
| ----- | ------------------- | --------------- |
| **KB storage** | `$` = 1 fact/slot; `$$` = 1 fact/cheie | — |
| **Soluții la proof** | Citești **fact** `$` → max **1** binding; `$$` → 1 per cheie match | Body multi-soluție + **regulă** → până la **`maxSolutions`** |
| **Pout default** | Fact `$` în KB → natural **1** soluție la lookup | **Toate** soluțiile colectate (≤ cap) → vector/matrix dacă redirect bulk |
| **Pout `;last`** | — | **Explicit** ultima soluție în **discovery order** (F10) — **nu** e default |

**Corecție față de „pout returnează doar ultima”:** default **nu** e doar ultima — redirect **`query >= wire`** poate trimite **N valori** (N ≤ `maxSolutions`). Pentru **o singură** valoare pe wire: **`;first`**, **`;last`**, sau query pe **fact `$`** deja unic în KB.

**Exemple doc (minimum F100f):**

1. `turn$(carol)` fact + `query who: turn$(T)` → 1 soluție; KB 1 fact.  
2. `turn$(P) <- player(P)` + query backtrack 3 playeri → engine colectează 3 soluții (≤ cap); KB **`turn$(carol)`**; **`johnOwns >= vec`** → 3 elemente; **`;last >= w`** → doar carol.  
3. `maxSolutions: 2` + 5 soluții posibile → 2 colectate + **`truncated=1`**.  
4. `position$$(K,V)` → N soluții = N chei match (≤ cap).

---

### D1013 — Query **(A ✅)**

| Opțiune | Comportament |
| ------- | ------------ |
| **A — Prolog normal ✓** | KB: max **1 fact** `$` / per cheie `$$`; query citește fact → 1 match; query **probe regulă** + backtrack → **N soluții** posibile (policy F10) |
| **B — auto-`;first` pe `$` (change)** | Forțează 1 soluție query | Surpriză; ne-Prolog |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1014 — Ground la mutation + **wire refs** (confirmed **B ✅**)

| Op | Regulă |
| -- | ------ |
| **`+` / `-`** | Head **ground** după expand wire (F25/F33/F43) — altfel **`mutationFailed`** |
| **`$$` arg0** | După decode wire → trebuie **ground** = cheie (D1008 key) |
| **Var Prolog `K`** | `+ position$$(K, 10)` — **fail** (ca `+ position(K,0)` azi) |
| **`~` template** | Doar **`_`** wildcard; **`K`/`V` numite** → 0 match; **wire refs interzise** în template (F44) |

#### Wire refs — **păstrate** (user constraint)

```logts
.whLogic:{
    logic {
        + position$$(text playerPin, number scorePin)
    }
}
```

| Pas | Comportament |
| --- | ------------ |
| Parse | `text playerPin` / `number scorePin` = **wireRef** (nu var Prolog) |
| Expand | Decode din pin → atom/number **ground** |
| Ground check | ✅ dacă ambele args ground după decode |
| **`$$` slot** | Cheie = `logicGroundTermKey(decodedArg0)` → overwrite |

**Nu se schimbă** F25 wire mutation; F100 adaugă doar layer replacement pe `$`/`$$`.

#### `~` — reamintire

| Template | Efect |
| -------- | ----- |
| `~ position$$(_, _)` | Șterge **tot** `position$$/2` |
| `~ position$$(alice, _)` | Șterge cheia **ground** `alice` |
| `~ position$$(K, _)` | **0 facts** — `K` ≠ `_` |

**Decizie:** **B ✅** — confirmed user 2026-08-27.

---

### D1015 — `.world:query` **(A ✅)**

| Opțiune | Regulă |
| ------- | ------ |
| **A — read ✓** | Poate interoga `$`/`$$` din KB **static** inline |
| **B — interzis (change)** | Prea restrictiv |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1016 — DCG **(A ✅)**

| Opțiune | Regulă |
| ------- | ------ |
| **A — permis ✓** | `token$$(Type, Value) --> …` — nume predicate DCG cu `$`/`$$` |
| **B — interzis (change)** | Limitare artificială |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### D1017 — Teste și documentație **(A ✅)**

| Livrabil | Detaliu |
| -------- | ------- |
| Teste | **4485+** legacy+wave — static collapse, mutation+**wire**, commit, `$$` compound key, `-`/`~`, rules, index, constraints |
| Doc | `inline-logic.md` — Unique & keyed + Pitfalls + maxSolutions; `logic-runtime.md`; verify blocks |
| Sketch | Promovat → F100 |

**Decizie:** **A ✅** — confirmed user 2026-08-27.

---

### Scope (subfaze)

| Subfază | Livrabil | Fișiere principale | Teste (draft) |
| ------- | -------- | ------------------ | ------------- |
| **F100a** | Lexer **`$`/`$$`** + validare nume + parse facts/rules/constraints | `logic-assembler.js` | **4485–4494** |
| **F100b** | **`logicNormalizeUniqueFacts`** la merge static + `logicBuildRuntimeClauses` | `logic-engine.js`, `logic-assembler.js` | **4495–4504** |
| **F100c** | **`logicApplyMutationTransaction`** + **`commit`** — replacement slot/cheie | `logic-engine.js`, `components/logic.js` | **4505–4514** |
| **F100d** | Concluzii reguli în solve (`_solveCall` success path) | `logic-engine.js` | **4515–4524** |
| **F100e** | Fact index delta + constraints smoke + `.world:query` read | `logic-engine.js`, `interpreter.js` | **4525–4534** |
| **F100f** | Doc EN + `logts-play` + `_verify_doc_examples.js` | `doc/inline-logic.md`, `doc/logic-runtime.md` | doc verify |

**Pattern teste:** ultimul ID plan 1 = **4484** → F100 pornește la **4485**.

### Exemple test obligatorii (draft)

| # | Scenariu | Așteptat |
| - | -------- | -------- |
| T1 | `pos$(10). pos$(22). pos$(35).` static | KB efectiv **un** fact `pos$(35)` |
| T2 | `commit(+ position$(10), + position$(20))` | Doar `position$(20)` |
| T3 | `position$$(j,10). position$$(m,20). position$$(j,30).` | `j→30`, `m→20` |
| T4 | Cheie compound egală / diferită | Replace doar pe cheie egală ground |
| T5 | `position$$(K, V)` query | N soluții = N chei |
| T6 | Regula `turn$(X) <- player(X)` — 3 playeri | Ultimul player din ordine discovery |
| T7 | `~ score$(_)` | Slot gol |
| T8 | `count/2` pe `position$$/2` | Count = număr chei |

### Fișiere țintă

| Fișier | Schimbare probabilă |
| ------ | ------------------- |
| `[logic-assembler.js](../v0_3_2/core/logic-assembler.js)` | Lexer `$`/`$$`; helper `logicIsUniquePredicate(name)` |
| `[logic-engine.js](../v0_3_2/core/logic-engine.js)` | Normalizare, mutation, index, rule assert |
| `[components/logic.js](../v0_3_2/core/components/logic.js)` | Propagare după commit / rebuild index |
| `[inline-logic.md](../v0_3_2/doc/inline-logic.md)` | Secțiune `$` / `$$` |
| `[logic-runtime.md](../v0_3_2/doc/logic-runtime.md)` | Semantica replacement în tranzacții |
| `tests/test_suite.js` | **4485+** |

### Criterii done

- [x] **D1000–D1017** confirmed user 2026-08-27
- [ ] **F100a…F100f** livrate
- [ ] Teste **4485+** legacy+wave green
- [ ] Doc EN + verify blocks
- [ ] **Fără** breaking changes pe predicate fără `$`

### Status F100

### Status F100

**(ready-to-implement)** — **D1000–D1017✅**; teste **4485+**; doc EN.

### Legături

- [Faza 11 — runtime mutation](inline_logic.plan.md#faza-11--runtime-mutation-done)
- [Faza 44 — commit](inline_logic.plan.md#faza-44--inline--retractall-via-2p--completed)
- [logic_monopoly_interactiv.plan.md](logic_monopoly_interactiv.plan.md) — `turn$`, `position$$` pentru game state
- **Următor backlog:** **3+b** scope blocks (după F100)

---

**Verdict:** **✅ rezolvat (A1 / F101a)** — bug la cheie slot, nu la ground check strict.

---

## Faza 101 — Commit cu variabile legate în `$` / `$$` **(post-F100 bugfix)**

> **Sursă:** [logic_monopoly_interactiv.plan.md](logic_monopoly_interactiv.plan.md) — problema **A** / **P3**.  
> **Status:** **✅ F101a done** (2026-08-27).

### Problemă

```prolog
turn$(P),                         % P = p1 (atom id-only în env)
commit(+ playerPos$$(P, NewPos))  % mutationFailed=0 dar poziția rămâne 0
commit(+ playerPos$$(p1, NewPos)) % merge — literal parsează cu .name
```

**Root cause:** `logicUnify` leagă variabile la termeni din KB (atomi **id-only**). `logicDerefMutationTerm` dereferenția corect, dar `logicGroundTermKey` / `logicUniqueSlotKeyFromHead` foloseau `term.name` gol → slot `$$:playerPos$$/2:a:` în loc de `a:p1`.

### Fix **F101a**

| Fișier | Schimbare |
|--------|-----------|
| `core/logic-engine.js` | `logicNormalizeMutationTerm(term, table)` — completează `.name` din `.id` |
| `core/logic-engine.js` | `logicDerefMutationTerm` — normalizează termenul dereferențiat |
| `core/logic-engine.js` | `logicGroundTermKey(term, table?)` — fallback `table.name(id)` |
| `tests/test_suite.js` | **4535–4538** — commit cu var legată pe `$$` și `$` |

### Teste

| ID | Titlu |
|----|-------|
| 4535–4536 | F101 commit bound var keyed $$ (legacy/wave) |
| 4537–4538 | F101 commit bound var single $ (legacy/wave) |

### Criterii done

- [x] Repro scratch: `turn$(P), commit(+ playerPos$$(P, 7))` → poziția 7
- [x] Teste 4535–4538 green
- [x] F100 non-ground (4509–4510) încă eșuează corect (var **neligată**)

### Legături

- [logic_monopoly_interactiv.plan.md](logic_monopoly_interactiv.plan.md) — P3 închis; B/C rămân deschise

---

**Verdict:** **✅ B2/F102a** — re-read automat; **`refresh/1` amânat** (redundant).

---

## Faza 102 — Re-read automat `$`/`$$` după `commit` **(post-F101)**

> **Status:** **✅ F102a done** (2026-08-27). **Fără `refresh/1`.**

### Problemă B

Variabila legată la citire rămâne stale până la re-invocarea goal-ului `$`/`$$`; re-invocarea cu aceeași variabilă eșua (unificare 0 vs 7).

### Fix **F102a**

- `_mutatedUniqueSlots` — set de slot keys atinse de mutație în query pass
- `_maybeRefreshUniqueCallGoal` — în `_solveCall`, unbind output args înainte de unificare dacă slotul a fost mutat
- Doc: `inline-logic.md`, `logic-runtime.md`

### Teste **4539–4544**

| ID | Scenariu |
|----|----------|
| 4539–4540 | Același `Pos` după `commit` → 7 |
| 4541–4542 | Cheie legată `P` după `commit` |
| 4543–4544 | Fără re-read, `Pos` rămâne 0 |

### Legături

- [logic_monopoly_interactiv.plan.md](logic_monopoly_interactiv.plan.md) — B închis

---

## Faza 104 — `randomSeed:` per componentă (RNG context swap) **(post-F103)**

> **Status:** **✅ F104a done** (2026-08-27). **Variantă B: get/set state** — fără closure pe componentă.  
> **Legături:** [logic_monopoly_interactiv.plan.md](logic_monopoly_interactiv.plan.md) — dice repetate 4+3 / 6+5; discuție Prolog-like seed.

### Problemă

| # | Simptom | Cauză |
|---|---------|--------|
| 1 | La fiecare tastă / exec pass, dice **4 3** din nou | `_applyCompRandomSeed` apelează `set_random(42)` **înainte de fiecare** `_runLogic` |
| 2 | Două `comp [logic]` cu `randomSeed` diferit **nu** au stream-uri independente | Un singur `logicRngNext` global — ultimul `set_random` suprascrie pe toți |
| 3 | Doc spune „reseeds at each exec pass” | Semantică utilă doar pentru trigger izolat identic; **nu** pentru jocuri / simulări multi-pas |

**Ce NU e bug:** mulberry32 avansează starea internă (`a`) la fiecare `random_between` — problema e **resetarea** la fiecare pass, nu algoritmul.

### Comportament țintă (decizie user)

| Eveniment | RNG |
|-----------|-----|
| **Prima exec** a unei componente cu `randomSeed: N` | inițializare stream din **N** |
| **Exec pass următor** (aceeași componentă) | **continuă** secvența (fără reset la N) |
| **Exec altă componentă** | swap la stream-ul **ei** (salvat separat) |
| **`set_random(M)` în query** | reset stream componentei curente la M; salvat la final pass |
| **RUN / re-elaborare componentă** | `_rngState` null → iar din `randomSeed` |
| **`.world:query` fără comp** | flux global fallback (get/set pe singleton global) |

Model mental: **un generator global de lucru** + **stare serializată per componentă** (context switch), ca Prolog `set_random` o dată apoi `random_between` avansează.

### Fix **F104a** — API get/set (fără closure pe comp)

**Fișiere:** `logic-engine.js`, `components/logic.js`, doc.

**1. Extindere mulberry32 / RNG global** (`logic-engine.js`):

```text
logicRngGetState()  → uint32   // starea internă a (mulberry32)
logicRngSetState(a) → void     // reconstruiește logicRngNext din a (sau init + set a)
```

- Algoritmul mulberry32 **neschimbat** — doar expunem read/write pe `a`.
- `logicSetRandomSeed(seed)` rămâne: `SetState(seed >>> 0)` echivalent cu init din seed literal.
- `logicEnsureRng()`: dacă null, init cu `a = 0`.

**2. Stare pe componentă** (`logic.js`):

```text
comp._rngState: uint32 | null     // null = neinițializat
comp._rngSeedApplied: bool         // optional; sau _rngState === null ca sentinel
comp._lastRandomSeedWire: uint32   // doar pentru randomSeed: wire — detect change
```

**3. Swap la `_runLogic`** (înlocuiește `_applyCompRandomSeed` per-pass):

```text
_beginCompRng(comp, ctx):
  if comp.randomSeed && comp._rngState == null:
      seed = literal sau read wire
      comp._rngState = seed >>> 0
  if comp._rngState != null:
      logicRngSetState(comp._rngState)
  else:
      logicEnsureRng()                    // fără randomSeed — global continuu

_runLogic ... exec queries ...

_endCompRng(comp):
  comp._rngState = logicRngGetState()       // mereu la final pass (și dacă random nu a rulat — idempotent)
```

**4. `set_random/1` în query:** modifică `a` global în timpul pass-ului → `_endCompRng` capturează starea nouă pe componentă.

**5. `randomSeed: wire`:** la `_beginCompRng`, dacă valoarea wire ≠ `_lastRandomSeedWire` → re-init `comp._rngState = wireValue`, update `_lastRandomSeedWire`.

**6. Șterge** comportamentul vechi: `_applyCompRandomSeed` → `set_random` la **fiecare** pass.

### Ce rămâne neschimbat

- `random_between/3`, backtracking impure (aceeași valoare la re-satisfacere în același choice point).
- Atributul `randomSeed:` tot pe **`comp [logic]`**, nu pe inline.
- Teste existente **3890–3895** (un singur trigger → die 4) — **regresie obligatorie**.

### Migrare comportament vechi („același die la fiecare trigger”)

Explicit în query, nu pe componentă:

```logts
query oneRoll:
    set_random(42),
    roll(D)
```

### Teste **4547+**

| ID | Scenariu | Așteptat |
|----|----------|----------|
| 4547–4548 | `randomSeed: 42`, același comp, **2 trigger-e** `oneRoll` | die **4** apoi **3** (nu 4, 4) |
| 4549–4550 | două comp cu seed **42** vs **99**, câte un roll fiecare | stream-uri **independente** (valorile diferă) |
| 4551–4552 | walker, **2 trigger-e** `advance` de la 10 | **14** apoi **17** (10+4, 14+3) |
| 4553–4554 | query cu `set_random(7)` apoi roll; al doilea pass fără set_random | al doilea die ≠ primul după secvența seed 7 |
| — | **3890–3895** regression | unchanged |

Pattern: legacy + wave ca F101–F103.

### Doc **F104b**

- `comp-logic.md` — `randomSeed:` = seed inițial + **continuare** per componentă (nu each exec pass).
- `logic-builtins.md` — secțiune random: global de lucru + per-comp state; `set_random` în query.
- `mini-monopoly-interactive.md` — primul roll 4+3; următoarele din secvență.

### Criterii done

- [x] `logicRngGetState` / `logicRngSetState` în engine
- [x] `_beginCompRng` / `_endCompRng` în `logic.js`; `_applyCompRandomSeed` per-pass eliminat
- [x] Teste 4547–4562 + 3890–3895 green
- [x] Doc EN actualizat (`comp-logic.md`, `logic-builtins.md`)
- [x] Monopoly verify — primul roll 4+3; p2 roll 6+5 (stream continuu)

### Legături

- [logic_monopoly_interactiv.plan.md](logic_monopoly_interactiv.plan.md)

---

## Riscuri / neclarități plan 2

| Topic | ID | Notă |
| ----- | -- | ---- |
| Predicate `$`/`$$` | **3+a → F100** | **D1000–D1003✅**; draft **D1004–D1017** |
| Scope blocks | **3+b** | Migrate **2+a** |
| Reguli calificate | **3+c** | Migrate **2+b** |
| Cut în NAF | **3+d** | Migrate **2+f** |
| Lazy streams | **3+e** | Migrate **2+j** |
| TCO / stack depth | **3+f** | Discuție 2026-08 — `maxDepth` ≠ TCO |
| Trig `is/2` | **3+g** | Post-F42 amânat |
| RNG `randomSeed:` | **F104** | Per-comp get/set state; nu reseed each pass |

---

## Istoric plan

| Data | Eveniment |
| ---- | --------- |
| 2026-08-27 | Creat **inline_logic2.plan.md** — handoff post-F45; **F100** draft din sketch unique/keyed; backlog **3+a …** |
| 2026-08-27 | **D1004–D1007✅** — ordine secvențială commit; normalize+use; reguli |
| 2026-08-27 | **D1014–D1017✅** — F100 **ready-to-implement**; D1014 wire refs păstrate |
| 2026-08-27 | **F104 draft** — RNG per componentă via `logicRngGetState`/`SetState`; context swap la exec pass (Monopoly dice) |
