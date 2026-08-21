---
name: inline logic engine
overview: Plan pentru `inline [logic]` + `comp [logic]` — Fazele 0–20a complete; Faza 21 (show/N) completed.
todos:
  - id: logic-decisions
    content: "Decizii D1–D19 closed; D19 → Faza 18 (1+l)"
    status: completed
  - id: logic-assembler
    content: "Faza 1: logic-assembler.js — parser inline [logic] (facts, relations, queries, use)"
    status: completed
  - id: logic-engine
    content: "Faza 2: logic-engine.js — backtracking, atom table, aritmetică, comparații Prolog-style"
    status: completed
  - id: logic-comp
    content: "Faza 3: comp [logic] — program block parse, pin/wire, redirect results, on:"
    status: completed
  - id: logic-docs-tests
    content: "Faza 4: doc/inline-logic.md, doc/comp-logic.md, teste, doc-viewer"
    status: completed
  - id: logic-matrix-output
    content: "Faza 5: redirect matrix/vector — 2 vars libere max, indexare ca wire-vectors"
    status: completed
  - id: logic-allow-notallow
    content: "Faza 6: inline.type{logic} + comp.type{logic} — Allow/NotAllow, doc, teste policy"
    status: completed
  - id: logic-negation
    content: "Faza 7: negație \\ + goal — parser, engine NAF, query multi-goal, teste 3536+, doc"
    status: completed
  - id: logic-depth-tuning
    content: "Faza 8: maxDepth/maxSolutions pe comp, pout truncated/depthExceeded, teste 3540+, doc"
    status: completed
  - id: logic-inline-query
    content: "Faza 9: .world:query({ goal }, Var=wire) — inlineMethod, D30–D32, teste 3544+, doc"
    status: completed
  - id: logic-result-policies
    content: "Faza 10: result policies (1+b) — ;unique / ;first / ;last — D34–D37 confirmed, D38=A"
    status: completed
  - id: logic-runtime-mutation
    content: "Faza 11: runtime mutation (1+e) — logic { + / - }, D40–D49 confirmed, data: overlay"
    status: completed
  - id: logic-constraints
    content: "Faza 12: constraints — constraint P <= body, validate proposed KB, D50–D59 confirmed"
    status: completed
  - id: logic-scale-perf
    content: "Faza 13: scale & perf (1+q) — fact index, count/2, D60–D68 confirmed"
    status: completed
  - id: logic-mut-trace
    content: "Faza 14: logic-mut Signal Trace + doc/signal-trace.md — D69–D76 (completed)"
    status: completed
  - id: logic-use-composition
    content: "Faza 15: use strict + use once (1+g) — D77–D81 (completed)"
    status: completed
  - id: logic-filter-trace
    content: "Faza 16: Filter Logic Signal Trace (1+t) — D82–D85 (completed)"
    status: completed
  - id: logic-data-modes
    content: "Faza 17: comp [logic] data: static + seed (1+r) — D88–D94 confirmed, completed"
    status: completed
  - id: logic-explicit-query
    content: "Faza 18: query = … explicit (1+l) — D95–D99 confirmed, completed"
    status: completed
  - id: logic-constraint-check
    content: "Faza 19: constraint-as-query helper (1+u) — D100–D106 completed"
    status: completed
  - id: logic-use-as
    content: "Faza 20a: use .mod as alias (prefixed import) — D107–D116 completed"
    status: completed
  - id: logic-show-builtin
    content: "Faza 21: builtin show/N + string literals — D117–D127 completed"
    status: completed
isProject: false
---

# Plan: `inline [logic]` + `comp [logic]` — motor relațional declarativ

## Legenda

| Marcaj | Semnificație |
|--------|--------------|
| **(recommended)** | Opțiunea recomandată de analiză |
| **(change)** | Alternativă validă, dar diferă de sketch / preferință arhitecturală |
| **(ready-to-implement)** | Faza poate începe după ce deciziile ei sunt confirmate |
| **(completed)** | Decizie luată / implementată |
| **1+a … 1+v** | Item backlog post-MVP — vezi [Backlog post-MVP](#backlog-post-mvp) (final plan) |
| ✅ | Backlog **promovat / livrat** (fază completed) |
| ❌ | Backlog **respins** definitiv |
| 🟠✗ | Backlog **închis** — alternativa nu se face; livrat altfel |
| ⏳ | Backlog **deschis** — încă amânat |
| ⏸ | Backlog **pause** — nu se promovează fază; rămâne idee în backlog |

---

## Context — analogii cu module existente

Sketch v2 clarifică: **logic ≠ protocol ≠ asm**, dar **logic ≈ asm** ca separare inline/comp.

| | **Protocol** | **ASM** | **Logic (sketch v2)** |
|---|-------------|---------|------------------------|
| **inline** | Rețetă: input → output | Definiție ISA / opcodes | Spațiu de cunoștințe: facts, relations, queries |
| **Execuție inline?** | Da (invoke `{ }`) | Nu (doar definiție) | **Nu** — definiția nu rulează |
| **comp** | — | `comp [cpu]` execută prog | **`comp [logic]`** execută query-uri |
| **Legătură cu fire** | args invoke | pin/pout CPU | program block + exec block + `query:N >= wire` |
| **Model** | Transformare | Cod mașină | Rezolvare declarativă |

```mermaid
flowchart TD
  subgraph inlineLayer ["inline logic — definitie"]
    facts[Facts]
    relations[Relations]
    queries[Query definitions]
    useMod[use composition]
  end

  subgraph compLayer ["comp logic — runtime"]
    progBlock["Program block .character X is number myX"]
    execBlock["Exec block myX=scoreIn modifier:0>=result set=1"]
    engine[Logic engine]
    results[Query result slots]
  end

  subgraph logts [LogTScript circuit]
    wires[scoreIn result trigger wires]
  end

  facts --> engine
  relations --> engine
  queries --> engine
  useMod --> facts
  progBlock --> engine
  execBlock --> engine
  engine --> results
  wires --> execBlock
  results --> wires
```

**Ce există azi** în [`v0_3_2`](../v0_3_2):

- Inline-uri: `asm`, `lut`, `protocol`, `plc`.
- Pattern **`inline [plc]` + `comp [plc]`** — cel mai apropiat ca exec pe componentă ([`plc.md`](../v0_3_2/doc/plc.md)).
- Pattern **`inline [asm]` + `comp [cpu]`** — cel mai apropiat ca „inline = definiție, comp = runtime” ([`asm.md`](../v0_3_2/doc/asm.md)).
- Property blocks pe **componente** — `.characterLogic:{ … set = 1 }` funcționează fără extindere inline-native.

---

## Obiectiv

1. **`inline [logic]`** — parsează facts, relations (`<-`), queries (`query name:`), opțional `use .module`; **nu se execută**.
2. **`comp [logic]`** — leagă o definiție logică prin **program block** (`.character { … }`), primește inputs externe, rulează query-uri la `set = 1`, expune rezultate spre fire LogTScript.
3. **Motor** — unificare, backtracking, aritmetică (`+ - * /`), comparații Prolog-style (`>=`, `=<`, `=:=`, `=\=`), termeni simbolici (`john`, `chevy`).

---

## D1 — REZOLVAT **(completed)**

| | |
|---|---|
| **Decizie** | **Two-layer ASM-like:** `inline [logic]` (definiție) + `comp [logic]` (runtime) |
| **Respinge** | Inline-native (sketch v1: `.people:johnOwns:0` direct pe inline) |
| **Respinge** | Model protocol (inline ca rețetă input→output) |
| **Motiv** | Feedback user: logic = lume de facts/relations; query-urile se fac în componentă, ca asm + cpu |

**Exemplu canonic (sketch v2):**

```logts
inline [logic] .character:

    modifier2(X, -4) <- X >= 1, X =< 2
    modifier2(X,  0) <- X >= 9, X =< 12
    modifier2(X,  2) <- X >= 15, X =< 16

    query modifier:
        modifier2(X, Y)

:

comp [logic] .characterLogic:
    on: raise

    .character {
        X is number myX
    }

:

8wire scoreIn = \15
8wire result = \0
1wire trigger = 0

.characterLogic:{
    myX = scoreIn
    modifier:0 >= result
    set = trigger
}
; scoreIn=15 → pin myX → logic X=15 → modifier2(15,Y) → Y=2 → result=2
```

---

## D2 — REZOLVAT **(completed)**

| | |
|---|---|
| **Decizie MVP** | **A** — la fiecare `set = 1`, rulează **toate** query-urile declarate în inline (după merge `use`) |
| **Amânat → F18** | **C** — listă explicită `query = modifier, johnOwns` — vezi **Faza 18** (1+l) |
| **Motiv user** | MVP simplu; când multe query-uri încetinesc exec-ul, specificarea explicită **nu e redundantă** — e optimizare intenționată, nu duplicare inutilă a redirect-urilor `modifier:0 >=` |

**MVP:**

```logts
; inline declară: query modifier, query backup, query audit, …
.characterLogic:{ myX = scoreIn, modifier:0 >= result, set = trigger }
; → toate query-urile se rezolvă; exec block citește doar modifier:0
```

**Faza 18 (1+l / D2-C):**

```logts
.characterLogic:{
    query = modifier
    myX = scoreIn
    modifier:0 >= result
    set = 1
}
; → doar query modifier — mai rapid când inline are multe query-uri

.characterLogic:{
    query none
    logic { + status(box1, ok) }
    mutationFailed >= failed
    set = trigger
}
; → zero query-uri — doar mutații + pout meta (linie standalone, fără =)
```

---

## D3 — REZOLVAT **(completed)**

| | |
|---|---|
| **Decizie** | **A** — program block + exec block, cu **pin-uri comp** distincte de variabile logică și de fire LogTScript |
| **Corecție față de draft plan** | Exec block: **`myX = scoreIn`** (pin ← wire), **NU** `X = myX` (var logică ← pin) |

### Modelul în trei straturi

```text
LogTScript wire     comp [logic] pin     logic variable (motor)
─────────────────   ─────────────────   ───────────────────────
scoreIn (N bit)  →  myX              →  X   (is number)
nameWire (ASCII) →  myName           →  Name (is text)
aliveWire (1 bit)→  myAlive          →  Alive (is bool)
```

| Strat | Nume exemplu | Rol |
|-------|--------------|-----|
| **Wire LogTScript** | `scoreIn`, `nameWire` | Semnal în circuit — sursa reală |
| **Pin comp** | `myX`, `myName`, `myAlive` | Interfața externă a `comp [logic]` — declarat în program block |
| **Variabilă logică** | `X`, `Name`, `Alive` | Folosită în facts/relations/queries — **nu** apare în exec block |

### Program block (declarație în `comp [logic]`)

```logts
comp [logic] .characterLogic:

    .character {
        X is number myX
        Name is text myName
        Alive is bool myAlive
    }

:
```

- `X is number myX` — variabila logică **X**, interpretată ca **number**, expusă pe pinul comp **myX**.
- Valid **doar** în body-ul `comp [logic]` — nu e expresie LogTScript normală.

### Exec block (property block — wiring runtime)

```logts
8wire scoreIn = \15
8wire nameWire = "Alice"
1wire aliveWire = 1
8wire result = \0
1wire trigger = 0

.characterLogic:{
    myX = scoreIn
    myName = nameWire
    myAlive = aliveWire
    modifier:0 >= result
    set = trigger
}
```

- **`myX = scoreIn`** — assign LogTScript standard: valoarea wire-ului **scoreIn** alimentează pinul **myX** al componentei.
- La trigger, comp citește pin **myX** → convertește (number) → leagă variabila logică **X** → rezolvă query-uri.
- **`modifier:0 >= result`** — redirect rezultat query → wire (simetric: output pin/slot → wire).

### De ce nu e ca PLC (D3-B) — tabel comparativ

| | **PLC** | **Logic (D3-A)** |
|---|---------|------------------|
| **Unde se mapează** | `comp` header: `inputs: { START = startIn }` | **Program block**: `X is number myX`; **exec block**: `myX = scoreIn` |
| **Ce e `startIn` / `myX`** | Wire LogTScript | **Pin comp** (myX) ← wire în exec block |
| **Ce intră în motor** | Simbol PLC `START` | Variabilă logică `X` (via pin + tip) |
| **Tip la frontieră** | Width simbol | **`number` / `text` / `bool`** explicit |

PLC mapează **simbol program → wire** la elaborare. Logic mapează **var logică → pin comp** la elaborare (program block), apoi **pin → wire** la runtime (exec block) — două pași, dar pin-ul comp e entitatea intermediară clară.

### Flux la trigger

```mermaid
sequenceDiagram
  participant W as Wire scoreIn
  participant P as Pin myX
  participant L as Logic var X
  participant E as Engine
  participant Q as Query modifier
  participant R as Wire result

  W->>P: exec block myX=scoreIn
  P->>L: read pin convert number
  L->>E: input env X=15
  E->>Q: resolve all queries D2-A
  Q->>R: modifier:0>=result
```

---

---

## Rezumat decizii D4–D19 **(completed)**

| ID | Decizie | Notă |
|----|---------|------|
| **D4** | **A** | Exec blocks multiple — slot-uri partajate, last-write-wins |
| **D5** | **A** | Backtracking DFS Prolog-like |
| **D6** | **A** | Operatori logică dedicati (`>=`, `=<`, `=:=`, aritmetică) |
| **D7** | **A** MVP | Redirect `query:N >= wire`; **B** POUT declarate → **1+k** (low priority, probabil never) |
| **D8** | **A** | Convenție **Prolog standard** — vezi [Prolog naming](#conventie-prolog-d8-d9-d18) |
| **D9** | **A** | Clauze multiple = **OR**, ca Prolog |
| **D10** | **A** | Ordinea soluțiilor = discovery order (backtracking) |
| **D11** | **comp `on:`** | `on: raise` / `edge` / `1` în **definiția** `comp [logic]`; exec block respectă același model ca alte componente |
| **D12** | **amânat 1+f** | MVP: max 1 var liberă per query (nespecificat explicit — păstrăm default plan) |
| **D13** | **A** | Parser principal = **`logic-assembler.js`** pentru **`inline [logic]`**; program block = parse auxiliar mic în comp |
| **D14** | **A** | MVP: **number + bool + text** — conversie la frontieră pin/wire |
| **D15** | **A** | **Atom table** (symbol→id) + integers — performanță unificare/index |
| **D16** | **A** | `use` merge **facts + relations**; **queries nu se importă**; module folosite n-au queries „vizibile” prin use |
| **D17** | **A** | `=` bind/calc vs `=:=` test numeric — Prolog |
| **D18** | **A** | Facts + rules același predicate — **ca Prolog** (clauze OR) |
| **D19** | **→ F18** | `query = …` — **Faza 18** (cu D2-C) |

### Convenție Prolog (D8, D9, D18)

În **Prolog standard** (ISO/SWI):

| Sintaxă | Rol | Exemplu |
|---------|-----|---------|
| **Uppercase** sau **`_`** start | Variabilă | `X`, `Person`, `_` |
| **lowercase** identificator | Atom (constantă simbolică) | `john`, `chevy`, `might` |
| **Quote** | Atom arbitrar | `'John Doe'`, `'X'` |
| **Număr** | Integer/float | `15`, `-4` |
| **Fapt + reguli** același functor | **Clauze alternative (OR)** | `parent(tom, bob).` + `parent(X,Y) :- mother(X,Y).` |
| **Ordinea clauzelor** | Prima potrivire în backtracking | discovery order |

**D8 decis:** adoptăm convenția Prolog (**A**) — `owns(john, chevy)` + `owns(Person, Vehicle)`.

**D8 / D9 / D18:** confirmat explicit user — **ca Prolog** (convenție vars/atoms, OR clauze, facts+rules același predicate).

---

## Decizii de luat — tabel rezumat

> **D1–D32:** D25–D29 **confirmed** (Faza 8). **D30–D32 confirmed** (Faza 9). **Fazele 0–8 (completed).** **Faza 9 (ready-to-implement).**

| ID | Subiect | Decizia ta |
|----|---------|------------|
| **D1** | Model runtime | **Two-layer ASM** **(completed)** |
| **D2** | Query-uri la `set = 1` | **A** MVP; **C** → **Faza 18** **(completed)** |
| **D3** | Inputs program + exec | **A** pin ← wire **(completed)** |
| **D4** | Blocuri exec multiple | **A** last-write-wins **(completed)** |
| **D5** | Algoritm rezolvare | **A** backtracking **(completed)** |
| **D6** | Sintaxă constrângeri | **A** Prolog-style **(completed)** |
| **D7** | Rezultate query | **A** redirect; B → 1+k **(completed)** |
| **D8** | Variabile vs atomi | **A** convenție Prolog **(completed, confirmat user)** |
| **D9** | Clauze multiple | **A** OR ca Prolog **(completed, confirmat user)** |
| **D10** | Ordinea soluțiilor | **A** discovery **(completed)** |
| **D11** | `on:` trigger | **`on:` pe comp** (raise/edge/1) **(completed)** |
| **D12** | Multi-var query | **F3:** 1 var; **F5:** 2 vars matrix/vector; **>2** eroare **(completed)** |
| **D13** | Parser | **A** logic-assembler inline; aux program block **(completed)** |
| **D14** | Tipuri frontieră | **A** number+bool+text MVP **(completed)** |
| **D15** | Reprezentare internă | **A** atom table **(completed)** |
| **D16** | `use` | **A** merge facts/relations; fără queries import **(completed)** |
| **D17** | `=` vs `=:=` | **A** **(completed)** |
| **D18** | Facts + rules mixte | **A** ca Prolog **(completed, confirmat user)** |
| **D19** | `query = …` | **→ Faza 18** (D95–D99) |

---

## Decizii de luat — detaliu per ID

### D2 — Ce query-uri rulează la `set = 1` **(completed: A MVP; C → Faza 18)**

**Decizie luată:** MVP = **A**. Post-MVP = **C** (query explicit), nu **B** (infer din redirect).

| Opțiune | Status | Pe scurt |
|---------|--------|----------|
| **A** | **MVP (completed)** | Toate query-urile din definiție |
| **B** | respins / nefolosit | Doar query-uri referite în `modifier:N >=` |
| **C** | **→ Faza 18** | Listă explicită `query = modifier, johnOwns` |

#### A — Toate query-urile (MVP)

La fiecare exec, rezolvă **fiecare** `query name:` din inline. Rezultatele în slot-uri interne; exec block citește ce redirecționează.

- **Pro:** simplu, predictibil, toate slot-urile fresh.
- **Contra:** cost când sunt multe query-uri — motiv pentru **C** amânat.

#### C — Explicit `query = …` (**Faza 18**, **1+l**)

```logts
.characterLogic:{
    query = modifier, audit
    myX = scoreIn
    modifier:0 >= result
    set = 1
}
```

- **Pro:** optimizare când A e prea lent — **util chiar dacă** există deja `modifier:0 >=` (A rulează tot, C limitează munca motorului).
- **Nu e redundant** cu redirect-urile: redirect = unde scrii output; `query =` = ce calculezi.

---

### D3 — Legarea inputs: program block + exec block **(completed: A — pin comp ← wire)**

**Decizie luată:** program block leagă **var logică → pin comp**; exec block leagă **pin comp → wire LogTScript**.

| Opțiune | Status |
|---------|--------|
| **A** | **(completed)** — vezi secțiunea [D3 REZOLVAT](#d3--rezolvat-completed) |
| **B** | respins — map PLC în header; `myX` acolo e wire, nu pin |
| **C** | respins — prea rigid |

#### Exec block corect (confirmed user)

```logts
.characterLogic:{
    myX = scoreIn
    myName = nameWire
    myAlive = aliveWire
    modifier:0 >= result
    set = 1
}
```

#### Greșeală de evitat (draft anterior)

```logts
; GREȘIT — X e variabilă logică, nu pin comp
.characterLogic:{ X = myX, ... }

; GREȘIT — confundă pin cu wire de același nume fără model clar
8wire myX = \15
.characterLogic:{ myX = myX, ... }
```

Folosește nume wire distincte (`scoreIn`, `nameWire`) sau pin comp (`myX`) assignat explicit la wire.

#### B — Map stil PLC **(change)** — de ce diferă

```logts
comp [logic] .characterLogic:
    program: .character
    inputs: { X = scoreIn }
:
```

Aici `scoreIn` e **wire** mapat direct la simbol — **fără pin intermediar `myX`**. Logic D3-A preferă pin comp explicit + tip (`is number`) în program block.

---

### D4 — Blocuri exec multiple **(completed: A)**

**Decizie:** slot-uri query partajate; ultima exec reușită suprascrie (last-write-wins).

---

### D5 — Algoritm rezolvare MVP **(completed: A)**

**Decizie:** backtracking DFS Prolog-like; limite `maxSolutions` / `maxDepth` documentate.

---

### D6 — Sintaxă constrângeri / aritmetică **(completed: A)**

**Decizie:** operatori în **`logic-assembler.js`** — nu builtins LogTScript `GT`/`GE`.

| Operator logic | Semnificație |
|----------------|--------------|
| `>=`, `=<`, `>`, `<` | comparație numerică |
| `=:=` / `=\=` | egalitate / inegalitate numerică (test) |
| `=` | bind / calcul aritmetic |
| `+`, `-`, `*`, `/` | aritmetică |

---

### D7 — Expunere rezultate query **(completed: A MVP; B → 1+k low priority)**

**Decizie MVP:** redirect în exec block — `modifier:0 >= result`, `isJohnOwner >= flagWire`.

**Sub-decizie D7a (completed):** boolean query → **`queryName >= wire`** (1 bit).

**Amânat 1+k:** POUT declarate explicit în header comp — **probabil never** (user); păstrăm în listă low priority pentru probe/debug dacă apare nevoie.

---

### D8 — Variabile vs atomi simbolici **(completed: A — Prolog standard)**

**Regula Prolog:** identificator care **începe cu literă mare** (sau `_`) = **variabilă**; **lowercase** = **atom** (constantă simbolică); numere = integer.

```logts
owns(john, chevy)       ; atoms ground
owns(Person, Vehicle)   ; vars în query/rule
attribute(might)        ; atom (might e constantă, nu Might)
```

**Excepție Prolog:** atom cu majuscule → quote: `'John'`. MVP: **fără quote** inițial; atoms lowercase only (sketch v2).

**Implementare:** lexer în `logic-assembler.js` — `plcTokenize`-style, clasificare var/atom/number.

---

### D9 — Clauze multiple aceeași relație **(completed: A — OR ca Prolog)**

În Prolog, mai multe clauze cu același functor/arity sunt **alternative (OR)** — motorul le încearcă pe rând cu backtracking.

```logts
parent(tom, bob)                    ; fact
parent(X, Y) <- mother(X, Y)        ; rule — OR cu factul de mai sus
```

Aplicat la logic: `modifier2(1,-4)` + `modifier2(X,0) <- …` = același predicate `modifier2/2`.

---

### D10 — Ordinea soluțiilor **(completed: A)**

**Decizie:** discovery order — ordinea backtracking-ului (clauze + ordinea facts), ca Prolog.

---

### D11 — `on:` pentru exec blocks **(completed: pe definiția comp)**

**Decizie:** atribut **`on:`** în header-ul **`comp [logic]`** — aceleași valori ca alte componente: **`raise`** / **`edge`** / **`1`** (level). Exec block folosește același mecanism property-block ca PLC/chip.

```logts
comp [logic] .characterLogic:
    on: raise
    .character {
        X is number myX
    }
:
```

| `on:` | Comportament |
|-------|--------------|
| **`raise`** / **`edge`** | Exec la front `0→1` pe `set` |
| **`1`** / **`level`** | Exec cât timp `set=1` (Load & Run imediat dacă trigger=1) |

- **Nu** pe `inline [logic]` — inline nu execută.
- Property block `.characterLogic:{ … set = trigger }` respectă `on:` de pe comp (ca [`plc.md`](../v0_3_2/doc/plc.md)).

---

### D12 — Query output: index, vector, matrix **(Faza 3 MVP + Faza 5)**

| Vars libere | Fază | Redirect exec block (`>=`) |
|-------------|------|----------------------------|
| **0** (`_`) | 3 | `queryName >= wire` (boolean 1 bit) |
| **1** | 3 | `queryName:N >= wire`; **5:** + `queryName >= vector` |
| **2** | **5** | `queryName >= matrix`; `queryName:r`, `queryName::c`, `queryName:r:c` |
| **≥3** | — | **eroare** elaborare |

**Layout matrix (2 vars):** **rând** = soluție (discovery order); **coloană** = variabilă liberă (ordinea în query, stânga→dreapta).

```text
query allPairs: owns(X, Y)
Soluții → matrix [rows, 2]:
  row0: john, chevy
  row1: john, ford
  row2: mary, bike
```

#### Faza 3 — 1 var: index per soluție

```logts
query johnOwns:
    owns(john, X)

.peopleLogic:{
    johnOwns:0 >= firstCar
    johnOwns:1 >= secondCar
    set = trigger
}
```

#### Faza 5 — 1 var: vector bulk

```logts
8wire[4] allCars = \0

.peopleLogic:{
    johnOwns >= allCars
    set = trigger
}
```

`johnOwns >= allCars` — întreg vectorul soluțiilor (rows ≤ `elementCount` declarat).

#### Faza 5 — 2 vars: matrix + slice (**similitudine [`wire-vectors.md`](../v0_3_2/doc/wire-vectors.md)**)

| Redirect | Țintă | Conținut |
|----------|-------|----------|
| `allPairs >= pairMatrix` | `16wire[R,2]` | matrix completă |
| `allPairs:0 >= row0` | `16wire[2]` vector | **rând** 0 (`:r` = rând, ca LogTScript) |
| `allPairs::0 >= col0` | `16wire[R]` vector | **coloană** 0 (`::c` = coloană) |
| `allPairs:0:1 >= cell` | `16wire` scalar | celula `(0,1)` |

```logts
query allPairs:
    owns(X, Y)

16wire[10, 2] pairMatrix = \0
16wire[2] row0 = \0
16wire[10] colX = \0

.pairsLogic:{
    allPairs >= pairMatrix
    allPairs:0 >= row0
    allPairs::0 >= colX
    set = trigger
}
```

> Indexare **aliniată LogTScript:** `:r` = rând, `::c` = coloană ([`wire-vectors.md` — Indexing 2D](../v0_3_2/doc/wire-vectors.md#indexing-2d)).

#### ≥3 vars — eroare permanentă

```text
query fullRecord: something(X, Y, Z, T)
→ elaboration error: more than two free variables
```

**Fazele 1–4:** max **1** var liberă. **Faza 5:** max **2**. Motorul Prolog poate rezolva N vars; limita e la **interfața redirect**.

---

### D12a — Vector/matrix fill, truncate, count **(Faza 5 — completed decizie)**

**Principiu:** redirect `query >= vector|matrix` **nu** folosește operatorii `:=` / `=:` ai init-ului wire (`=`, `:=`, `=:` rămân doar pentru assign LogTScript). Pack/fill la redirect are **o singură regulă fixă**, indiferent cum a fost declarat wire-ul.

#### Pack layout (fix)

| Regulă | Comportament |
|--------|--------------|
| **Ordine soluții** | Discovery order → element **`:0`, `:1`, …** (stânga→dreapta în listă) |
| **Underfill** | Sloturi `:k` … `:N−1` (coadă) = **fill** |
| **Overflow** | k > N (vector) sau k > R (matrix) → **truncate** primele N/R rânduri — **fără eroare** |
| **0 soluții** | **Tot buffer-ul** = fill (vector sau matrix) |

Analogie: soluțiile ocupă **prefixul** din stânga; padding-ul e **la dreapta** (tail) — ca „valori la stânga, zerouri la dreapta” pe listă, **nu** legat de `wire =:` la declarare.

```text
8wire[4] allCars — john are chevy, ford (k=2):

  :0      :1      :2      :3
 chevy   ford    FILL    FILL
```

#### Valoare fill (sentinel)

| Sursă | Fill per slot nefolosit |
|-------|-------------------------|
| **Elaborare:** init literal pe declarație (`\0`, `0000…`, `\FF`, …) | Acel pattern **per element** (capturat la parse, nu recitit la RUN) |
| **Fără init** / init strict `=` blob complet | **`\0`** pe `elementWidth` |

**Respinge:** fill derivat din `:`/`:=`/`=:` la init; fill din valoarea **runtime** a wire-ului (wire poate fi modificat între RUN-uri).

#### Count redirect

| Țintă | `query:count >= wire` | `query:width >= wire` |
|-------|----------------------|------------------------|
| **Vector** (1 var) | k = soluții scrise (0…N) | — |
| **Matrix** (2 vars) | k = **rânduri** scrise (0…R) | C = cols (= 2) — **constantă** la elaborare |

**Respinge:** `query:0:count` pentru „număr coloane” — cols e fix din query; slice coloană `::c` are lungime utilă = k (același `:count`).

```logts
8wire[10] allCars = 00000000000000000000000000000000   # strict =, 32 bit — OK
8wire[10] allCars := \0                                 # idem fill \0 per element la elaborare
8wire numRows = \0

.peopleLogic:{
    johnOwns >= allCars
    johnOwns:count >= numRows
    set = trigger
}
```

---

### D12b — Encoding celule (atom → ASCII, nu hash) **(Faza 5 — completed decizie)**

**Problema hash (MVP Fazele 1–4):** `logicTermToWireValue` cu `bindType number` hash-uiește atomii la redirect scalar (`johnOwns:0 >= firstCar`) — **round-trip imposibil** (`firstCar` / `table:0:0` → `myX` → `X = john`).

**Decizie F5 (confirmată):** **toate** redirect-urile care scriu termeni `atom` pe wire — scalar `:N >=`, vector bulk, matrix, slice, celulă — folosesc **ASCII + `\0` padding**, **nu hash**. `number` rămâne binary unsigned pe lățimea celulei/wire-ului.

#### Lățime uniformă (constraint LogTScript)

| Construct | Regulă |
|-----------|--------|
| **`Wwire[N]`** / **`Wwire[R,C]`** | **Un singur `elementWidth` (= W)** pentru toate celulele — nu există coloane cu biți diferiți |
| **Schema variable matrix** | Variabil **număr rânduri/coloane** (`8[1-3,2]`) — **nu** lățimi diferite per celulă |
| **Declarare** | User alege W suficient (ex. `32wire[5,2]` → 4 caractere ASCII / număr până la 32 bit per celulă) |

**Elaborare (lint opțional):** max lungime atom din inline vs `W` (caractere × 8 ≤ W); warning/error dacă `"john"` nu încape.

#### Encoding per coloană / celulă (la scriere redirect)

| Termen soluție | Encoding în celulă de W biți |
|----------------|--------------------------------|
| **`atom`** | **ASCII**, octet per caracter, **padding `\0`** la dreapta în celulă |
| **`number`** | **Unsigned binary** pe W biți |
| **Fill slot** | `\0` pe întreaga celulă (D12a) |

Exemplu `32wire[5,2] table` — query `age(X,Y)`:

```text
row  col0 (X)              col1 (Y)
 0   "john\0\0\0\0" (32b)   \25 (32b)
 1   "mary\0\0\0\0"         \30
 2   "joe\0\0\0\0\0"        \22
```

#### Citire înapoi (round-trip)

| Direcție | Regulă |
|----------|--------|
| **Pin `text`** | **`logicPinToInputValue`:** oprește la octet **`0`** → `"joe"` ≡ atom `joe` |
| **Wire → pin** | `myX = table:0:0` → pin; program block `X is text myX` |
| **Prolog** | `age(john,25)` din facts ≡ X citit `"john"` după trim `\0` |

**Respinge:** hash pe orice redirect logic atom→wire; celule cu W diferit per coloană pe tensor simplu; W auto la runtime.

**F5 aliniază MVP:** teste **3504** (`firstCar`) hash → ASCII; doc `comp-logic.md` actualizat — **fără** limbaj „breaking change” față de user (feature încă neadoptat).

---

### D13 — Parser: inline vs comp **(completed: A — logic-assembler pentru inline)**

**Clarificare user:** parserul principal este al **`inline [logic]`**, nu al comp.

| Modul | Ce parsează |
|-------|-------------|
| **`logic-assembler.js`** | **Tot body-ul `inline [logic]`:** facts, relations, queries, `use`, operatori, aritmetică |
| **`logic-comp-bind.js`** (sau secțiune în `components/logic.js`) | **Doar program block** din `comp [logic]`: `.character { X is number myX }` |

`comp [logic]` **nu** are un al doilea limbaj logic — doar binding syntax (program block) + reutilizează AST-ul inline deja parsat din `inlineInstances`.

---

### D14 — Tipuri la frontieră **(completed: A — number + bool + text MVP)**

**Decizie:** toate trei tipurile în MVP; conversie la citire pin (comp → motor).

| Tip program block | Wire LogTScript → valoare logică |
|-------------------|----------------------------------|
| **`number`** | binary unsigned → integer (width pin) |
| **`bool`** | `0` → false, altfel true (1 bit efectiv) |
| **`text`** | binary → string ASCII (width pin; padding/zero trim ca LogTScript text) |

**Respinge C** (binary opaque) — contrazice `is number` / `is text` / `is bool`.

**D14a (decis):** text = **ASCII pe width wire** — aceleași convenții ca assign string/ascii în LogTScript.

**D14b (Faza 5+ — completed):** lățime pin **variabilă de la wire** la assign (`myX = wire`), nu fixă la elaborare.

| Tip pin | Default elaborare | La assign | Min | Max |
|---------|-------------------|-----------|-----|-----|
| **`number`** | 64 biți (zero) | lățime wire | 8 | **64** |
| **`text`** | 8 biți (gol) | lățime wire | 8 | **256** |
| **`bool`** | 1 bit | 1 bit | 1 | 1 |

Decode: `number` → unsigned binary; `text` → ASCII, oprire la `\0` → atom; inputEnv internează atomii pin (`logicPrepareInputEnv`) pentru unificare cu facts.

---

### D15 — Reprezentare internă termeni **(completed: A — atom table)**

**Decizie:** **atom table** (interned symbols, `Map<string, atomId>`) + **integers** pentru numere.

| Term | Reprezentare | Performanță |
|------|--------------|-------------|
| Atom `john` | `atomId` (small int) | unificare O(1), index predicate rapid |
| Number `15` | JS number / int32 | comparații aritmetice native |
| Var `X` | binding env slot | backtracking cu trail |
| Anon `_` | fresh slot per occurrence | Prolog semantics |

**Respinge B** (bit-strings) — lent la unificare/index. **Respinge C** (string compare) — același motiv.

Index facts: `Map<predicate/arity, Clause[]>` cu termeni ca atomId/number.

---

### D16 — Composiție `use .module` **(completed: A — merge facts/relations; fără queries)**

**Decizie:**

- `use .vehicles` — **merge facts + relations** din `.vehicles` în namespace-ul curent.
- **Queries din modulele used NU se importă** — nu există caz „query prin use”.
- Fiecare `inline [logic]` definește **propriile** query-uri; `comp [logic]` leagă program block la **un** inline (direct sau merged).

```logts
inline [logic] .vehicles:
    car(10)
    wheeled(X) <- car(X)
    ; fără query aici — doar knowledge
:

inline [logic] .world:
    use .vehicles
    query available:
        wheeled(X)
:
```

**Lint (F15 / 1+g):** **`use .mod`** strict — ciclu sau revisit → eroare elaborare (lanț); **`use once .mod`** — skip dacă modul deja merged (analog PHP `#include_once`).

---

### D17 — `=` vs `=:=` **(completed: A)**

**Decizie:** semantică Prolog — `=` bind/calc/unify; `=:=` test numeric după eval.

---

### D18 — Facts ground + rules mixte **(completed: A — ca Prolog)**

**În Prolog:** facts (`modifier2(1,-4).`) și rules (`modifier2(X,0) :- …`) cu **același functor/arity** sunt **clauze ale aceluiași predicate**. La apel `modifier2(15, Y)`, motorul:

1. Încearcă fact ground — match dacă există.
2. Dacă nu (sau backtrack), încearcă rules — unifică head, execută body.
3. **OR** între toate clauzele — prima soluție găsită nu exclude celelalte la backtracking.

**Decizie logic:** identic — `modifier2(1,-4)` fact + `modifier2(X,0) <- …` rule în același namespace.

---

### D19 — `query = …` în exec block **(→ Faza 18 — același scope ca D2-C)**

Legat de **D2 completed**: MVP folosește **A** (toate query-urile). **D19 = C** livrat în **Faza 18**.

```logts
.characterLogic:{
    query = modifier, audit
    myX = scoreIn
    modifier:0 >= result
    set = 1
}
```

| Opțiune | Status |
|---------|--------|
| **C** | **→ Faza 18** — `query = …` explicit (D95–D99) |
| **B** | respins — obligatoriu prea strict |

---

## Decizii Faza 7 — negație `\+` (D20–D24)

> **Sursă:** item **1+c** promovat din backlog post-MVP.  
> **Stare:** **D20=A, D21=A, D23=A (confirmed).** **D22=A** — confirmat după clarificare output (vezi secțiunea D22). **D24=A (confirmed)** — folosește `maxDepth` existent; tuning avansat → **Faza 8 / 1+d**.

### Rezumat D20–D24

| ID | Subiect | Decizie |
|----|---------|---------|
| **D20** | Sintaxă negație | **A (confirmed)** — `\+ goal` |
| **D21** | Unde e permis | **A (confirmed)** — body + query |
| **D22** | Query multi-goal | **A (confirmed)** — comma = AND; output = soluții vars libere, **nu** vector de booleeni per goal |
| **D23** | Semantica NAF | **A (confirmed)** — Prolog NAF |
| **D24** | Depth / soluții în negat | **A (confirmed)** — inner respectă `maxDepth` (256); oprește la prima soluție inner |

---

### D20 — Sintaxă negație **(completed: A)**

**Decizie țintă:** operator prefix **`\+`** în [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js), ca Prolog.

```logts
eligible(X) <- person(X), \+ banned(X)

query noAgeForJohn:
    \+ age(john, _)
```

| Opțiune | Pro | Contra |
|---------|-----|--------|
| **A — `\+ goal` (recommended)** | Familiar Prolog; aliniat cu sketch 1+c | Tokenizer nou (`\` + `+`); atenție la `=\\=` existent |
| **B — `not goal`** | Lizibil fără escape | Nu e Prolog; `not` ar putea confunda cu atom |
| **C — `!goal`** | Scurt | Coliziune semantică cu negare LogTScript built-in `!` |

**Implementare tokenizer (A):** în `logicTokenize`, înainte de `OP '+'`, recunoaște `\` + `+` → token `NOT` / valoare `\\+`.

**AST:** `{ kind: 'not', goal: <BodyGoal> }` — recursiv (suportă `\+ \+ goal`).

---

### D21 — Unde e permis `\+` **(completed: A)**

| Opțiune | Scope |
|---------|-------|
| **A — body + query (recommended)** | `parseBodyGoal` + goals în `query` (vezi D22) |
| **B — doar body** | Negație doar după `<-`; query-uri boolean doar via predicate auxiliar |

**Fără schimbări comp:** redirect boolean (`query >= wire`) funcționează deja când query are **0** vars libere — ex. `query ok: \+ age(peter, _)`.

---

### D22 — Query multi-goal **(completed: A)**

**Ce înseamnă `person(X), \+ age(X, _)` — NU e output „11” / două booleeni**

Virgula = **AND** (ca în body de regulă). Motorul caută **o singură legare pentru X** care satisface **ambele** goals în secvență:

1. `person(X)` — găsește un X care e persoană
2. `\+ age(X, _)` — **același X**: nu se poate demonstra că are vârstă

`_` e variabilă anonimă — **nu** apare la output.

**Vars libere la output:** doar **`X`** (1 var). Goals intermediare / negația **nu** produc biți separați pe wire.

**Soluții (discovery order):**

| X încercat | person(X) | \+ age(X, _) | Rezultat |
|------------|-----------|--------------|----------|
| john | ok | eșuează (john are age) | respins |
| mary | ok | eșuează | respins |
| peter | ok | reușește | **soluție** `{ X: peter }` |

Dacă ar exista mai mulți oameni fără vârstă → **mai multe soluții**, fiecare cu câte un `X`.

**Ce merge pe wire (comp redirect) — același model ca azi:**

| Redirect | Ce primești |
|----------|-------------|
| `personWithoutAge >= flag` (0 vars) | **1 bit:** `1` dacă există ≥1 soluție, altfel `0` — **nu** `"11"` |
| `personWithoutAge:0 >= who` (1 var, scalar) | **Valoarea lui X** din soluția 0 — atom `peter` → ASCII pe wire (ex. `8wire`) |
| `personWithoutAge >= vector` (1 var) | **Vector de X-uri** — câte un slot per soluție: `[peter, …]` encoded |
| `personWithoutAge:1 >= who2` | A doua soluție X (dacă există) |

**Contrast — query cu 0 vars (boolean pur):**

```logts
query johnHasNoAge:
    \+ age(john, _)
```

→ 0 vars libere → `johnHasNoAge >= flag` = **`0`** (john are age), un singur bit.

**Problemă actuală:** parserul acceptă la `query` **un singur** compound:

```123:124:v0_3_2/core/logic-assembler.js
        const goal = this.parseCompound();
        queries.push({ name: qName, goal });
```

Pattern canonical Prolog **nu compilează** azi:

```logts
query personWithoutAge:
    person(X), \+ age(X, _)
```

| Opțiune | Schimbare | Pro | Contra |
|---------|-----------|-----|--------|
| **A — extend query (recommended)** | `queries.push({ name, goals: parseBodyGoals() })`; migrare `q.goal` → `q.goals[]` | Direct, ca body regulă | Mic breaking change intern (3–4 fișiere) |
| **B — un singur compound** | Fără schimbare query | Minim diff | Nu acoperă exemplul user fără predicate wrapper |
| **C — wrapper predicate (change)** | `noAge(X) <- person(X), \+ age(X, _)` + `query q: noAge(X)` | Query syntax neschimbat | Verbozitate; predicate „artificial” |

**Impact D22-A:**

| Fișier | Change |
|--------|--------|
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | `parseProgram` query → `parseBodyGoals()`; `logicListFreeVarsInGoal` → walk pe toate goals; `logicFormatGoal` / validate |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `solveQuery(goals[])` → `_solveGoals(goals, …)` |
| [`components/logic.js`](../v0_3_2/core/components/logic.js) | free-var count pe `q.goals` |

---

### D23 — Semantica negation as failure **(completed: A)**

**Definiție (A — recommended):** `\+ G` reușește ⟺ `_solveGoals([G], env, …)` nu produce **nicio** soluție. Nu e negare logică clasică — e test procedural (ca SWI-Prolog).

**Algoritm engine (schimbare în `_solveGoals`):**

```javascript
if (g0.kind === 'not') {
  const trail = env.trailLength();
  let found = false;
  this._solveGoals([g0.goal], env, depth + 1, () => { found = true; return false; });
  env.undo(trail);           // obligatoriu — nu propagă legări din inner
  if (found) return false;
  return this._solveGoals(rest, env, depth + 1, onSuccess);
}
```

| Opțiune | Comportament |
|---------|--------------|
| **A — NAF Prolog (recommended)** | Ca mai sus; documentăm caveat-uri vars libere în negat |
| **B — safe negation (change)** | Înainte de inner solve, verifică vars din `G` sunt ground; altfel `fail` sau eroare |
| **C — static ground** | Respinge la parse dacă negated goal conține vars |

**Exemplu referință (user):**

```logts
person(john). person(mary). person(peter).
age(john, 25). age(mary, 30).
; query: person(X), \+ age(X, _)  →  X = peter
```

---

### D24 — `maxDepth` / `maxSolutions` în negat **(completed: A)**

| Opțiune | Comportament |
|---------|--------------|
| **A (confirmed)** | Inner solve respectă `maxDepth` (256 azi); oprește la **prima** soluție inner |
| **B** | Inner fără limită depth — risc stack/recursiv infinit în negat |
| **C** | Inner caută toate soluțiile — inutil pentru NAF, mai lent |

**Ce există deja (Faza 2):** `LogicEngine.maxDepth = 256`, `maxSolutions = 64`. Faza 7 doar **aplică** aceleași limite în branch-ul `not` — fără API nou.

**Faza 8 / 1+d (amânat — după F7):** recursivitate + depth tuning avansat:

- `maxDepth` / `maxSolutions` configurabile per comp sau inline
- mesaje eroare clare când depth depășit (nu doar `fail` silent)
- lint recursivitate / documentare pattern-uri sigure
- interacțiune **1+i** cut + depth

**Recomandare:** **1+d NU blochează Faza 7.** NAF are nevoie doar să contorizeze depth la inner solve (D24-A). Tuning-ul poate fi **Faza 8** imediat după `\+`.

**Legat de amânate:** **1+i** (cut în negat) — post-F7.

---

## Decizii Faza 8 — depth tuning (D25–D29)

> **Sursă:** item **1+d** promovat din backlog.  
> **Stare:** **D25=A, D26=A, D27=A1, D28=A, D29=A (confirmed).**

### Rezumat D25–D29

| ID | Subiect | Decizie |
|----|---------|---------|
| **D25** | Unde se configurează | **A (confirmed)** — atribute pe **`comp [logic]`**: `maxDepth:`, `maxSolutions:` |
| **D26** | Ce limite | **A (confirmed)** — ambele |
| **D27** | Observabilitate depășire | **A1 (confirmed)** — pout comp-level **`truncated`**, **`depthExceeded`** (OR pe toate query-urile din pass) |
| **D28** | Recursivitate | **A (confirmed)** — runtime only + doc; **fără** lint/respingere (ca Prolog) |
| **D29** | Default | **A (confirmed)** — **256** / **64** (ca azi) |

**Amânat (D27):** **A2** flag per query (`johnOwns:truncated >= wire`) — post-F8 dacă e nevoie.

---

### D25 — Unde se configurează **(completed: A)**

```logts
comp [logic] .peopleLogic:
    on: 1
    maxDepth: 128
    maxSolutions: 16

    .people { }
:
```

| Opțiune | Status |
|---------|--------|
| **A — pe comp** | **confirmed** |
| B — pe inline | amânat |
| C — exec block | amânat |

---

### D26 — Ce limite **(completed: A)**

| Limită | Rol |
|--------|-----|
| **`maxDepth`** | Plafon pași goal în `_solveGoals` (inclusiv inner la `\+`) |
| **`maxSolutions`** | Plafon soluții colectate per query |

Transmis la engine via `executeLogicQueries(..., { maxDepth, maxSolutions })`.

---

### D27 — Pout-uri observabilitate **(completed: A1)**

**Sintaxă exec block** — la fel ca query redirect: **`pout >= wire`**, nu `wire = pout`:

```logts
comp [logic] .peopleLogic:
    on: 1
    maxSolutions: 2
    .people { }
:

8wire car0 = 0
8wire car1 = 0
1wire wasTruncated = 0
1wire trigger = 1

.peopleLogic:{
    johnOwns:0 >= car0
    johnOwns:1 >= car1
    truncated >= wasTruncated
    set = trigger
}
```

**`truncated`:** `1` dacă **orice** query din pass a avut mai multe soluții decât `maxSolutions` (lista tăiată).

**`depthExceeded`:**

```logts
comp [logic] .graphLogic:
    on: 1
    maxDepth: 5
    .graph { }
:

1wire hitDepth = 0
8wire dest = 0
1wire trigger = 1

.graphLogic:{
    reach:0 >= dest
    depthExceeded >= hitDepth
    set = trigger
}
```

**`depthExceeded`:** `1` dacă **orice** query a lovit `maxDepth` (fail silent pe ramura respectivă).

| Pout | Biți | Semnificație pass curent |
|------|------|--------------------------|
| **`truncated`** | 1 | OR — cel puțin un query capped la `maxSolutions` |
| **`depthExceeded`** | 1 | OR — cel puțin un query a atins `maxDepth` |
| **`execCount`** | 16 | (existent) număr solve passes |

**Notă:** cu mai multe query-uri nu se știe **care** a declanșat flag-ul — doar că s-a întâmplat. Per-query → **A2** amânat.

Comportament la depășire: **fail silent** pe goal (Prolog-like) + flag pentru UI/debug — **nu** eroare runtime.

---

### D28 — Recursivitate **(completed: A)**

| Opțiune | Comportament | Prolog? |
|---------|--------------|---------|
| **A — runtime only** | Reguli recursive permise; limite D25–D27 | **Da** (SWI: `call_with_depth_limit`, fără lint compile) |
| B — lint warning | Avertisment direct self-recursion | Mai strict |
| C — respinge recursive | Elaboration error | Mult mai strict |

**Exemplu valid (ca Prolog):**

```logts
path(X, Y) <- edge(X, Y)
path(X, Z) <- edge(X, Y), path(Y, Z)
```

**Occurs check** (ex. `X = f(X)`) — **out of scope** F8; alt subiect.

---

### D29 — Default **(completed: A)**

| Parametru | Default | Dacă omis pe comp |
|-----------|---------|-------------------|
| `maxDepth` | **256** | engine default |
| `maxSolutions` | **64** | engine default |

---

> **Backlog post-MVP (`1+a` … `1+v`):** tabel complet + note — [Backlog post-MVP](#backlog-post-mvp) (final plan).

---

## Mapare decizii → faze

| Fază | Decizii | Status |
|------|---------|--------|
| **Faza 0** | D1–D19 **(completed)**; D12/D19 amânate | **(completed)** |
| **Faza 1** parse inline | D8, D9, D12, D16, D18 | **(completed)** |
| **Faza 2** engine | D5, D6, D15, D17 | **(completed)** |
| **Faza 3** comp runtime | D2–D4, D7, D11, D13, D14 | **(completed)** |
| **Faza 4** docs/tests | — | **(completed)** |
| **Faza 5** matrix/vector output | 2 vars max, redirect ca [`wire-vectors.md`](../v0_3_2/doc/wire-vectors.md) + extensii pin/round-trip | **(completed)** |
| **Faza 6** Allow/NotAllow | `inline.type{logic}`, `comp.type{logic}` | **(completed)** |
| **Faza 7** Negation `\+` | D20–D24 | **(completed)** |
| **Faza 8** Depth tuning | D25–D29 | **(completed)** |
| **Faza 9** Inline query invoke `.world:query({ })` | D30–D32 | **(completed)** |
| **Faza 10** Result policies (1+b) | D34–D38 | **(completed)** — teste 3554–3558, doc logts-play |
| **Faza 11** Runtime mutation (1+e) | D40–D49 | **(completed)** |
| **Faza 12** Constraints | D50–D59 | **(completed)** |
| **Faza 13** Scale & perf (1+q) | D60–D68 | **(completed)** |
| **Faza 14** Mutation Signal Trace (`logic-mut`) | D69–D76 | **(completed)** |
| **Faza 15** Composiție `use` / `use once` (1+g) | D77–D81 | **(completed)** |
| **Faza 16** Filter **Logic** Signal Trace (1+t) | D82–D85 | **(completed)** |
| **Faza 17** `comp [logic] data:` static + seed (1+r) | D88–D94 | **(completed)** |
| **Faza 18** `query = …` explicit (1+l) | D95–D99 | **(completed)** |
| **Faza 19** constraint-as-query helper (1+u) | D100–D106 | **(completed)** |
| **Faza 20a** `use .mod as alias` (prefixed import) | D107–D116 | **(completed)** |
| **Faza 20b** scope blocks nested `{ }` | — | **(deferred)** |
| **Faza 20c** reguli calificate + body relativ la import | — | **(deferred)** — draft în plan |

---

## Faze de implementare

### Rezumat livrare MVP **(2026-08-19)**

| Fază | Livrat |
|------|--------|
| **1** | [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js), whitelist parser, `execInline`, `INLINE_KINDS` |
| **2** | [`logic-engine.js`](../v0_3_2/core/logic-engine.js) — backtracking, atom table, `executeLogicQueries` |
| **3** | [`components/logic.js`](../v0_3_2/core/components/logic.js), program block în comp header, redirect `query:N >=`, `query >=` boolean |
| **4** | [`doc/inline-logic.md`](../v0_3_2/doc/inline-logic.md), [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md), teste **3500–3505**, doc-viewer |
| **6** | [`allow-notallow.md`](../v0_3_2/doc/allow-notallow.md), teste **3506–3507** |
| **5** | F5 vector/matrix, **3512–3520**, pin limits, round-trip |
| **7–10** | `\+` NAF, depth tuning, `.world:query`, `;unique`/ `;last` — teste **3536–3558** |
| **11–14** | **F11–F14 completed** — runtime mutation, constraints, indexing, logic-mut Signal Trace |

**Teste:** 2780/2780 (post-F14).

**Notă:** `logic-comp-bind.js` planificat separat → integrat în `logic-assembler.js` (`parseLogicProgramBlock`) + `components/logic.js`.

---

### Faza 0 — Spec **(completed)**

Toate deciziile D1–D19 confirmate. **Fazele 0–15 (completed).** Itemi amânați: [Backlog post-MVP](#backlog-post-mvp).

---

### Faza 1 — `inline [logic]` parse + registry **(completed)**

| Fișier | Rol |
|--------|-----|
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | **Parser principal inline:** facts, relations, queries, `use`, operatori Prolog, var/atom; `parseLogicProgramBlock` pentru comp |
| [`policy-type-modules.js`](../v0_3_2/core/policy-type-modules.js) | `'logic'` în `INLINE_KINDS` |
| [`parser.js`](../v0_3_2/core/parser.js) | Whitelist `inline [logic]`; program block `.module { }` în comp header |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | `execInline` → `inlineInstances`; `doc(inline.logic)` |

**Validare D16:** parse acceptă `query` în orice inline; la `use` merge doar facts/relations — queries din module used rămân neexportate.

**Validare D12:** la elaborare comp, max **2** vars de output per query (vars din program block excluse). **(completed — Faza 5)**

---

### Faza 2 — `logic-engine.js` **(completed)**

- Atom table (D15) + integers.
- Index clauses per `predicate/arity` (D18).
- Backtracking DFS (D5); OR între clauze (D9).
- Eval operatori logic (D6); `=` vs `=:=` (D17).
- Discovery order solutions (D10).
- `executeLogicQueries(def, inputEnv)` — toate query-urile (D2-A).

---

### Faza 3 — `comp [logic]` **(completed)**

| Fișier | Rol |
|--------|-----|
| [`components/logic.js`](../v0_3_2/core/components/logic.js) | Elaborare (`earlyReturn`), pin storage, `on:`, exec, redirect |
| [`parser.js`](../v0_3_2/core/parser.js) | Property block: `logicQuery>` (`query:N >=`), `pout>` (boolean `query >=`) |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | Property block: pin←wire, `_logicRedirects`, trigger la `set` |

Flux:

1. Elaborare: program block → pin-uri + tip + vars logică; **`on:`** pe comp (D11).
2. Exec block: `myX = scoreIn` → la `set` (per `on:`) → resolve toate query-urile → `modifier:0 >= result` (D7).

---

### Faza 4 — Docs + teste **(completed)**

- [`doc/inline-logic.md`](../v0_3_2/doc/inline-logic.md) — definiție inline, sintaxă Prolog, diferențe față de Prolog, exemple `logts-play`.
- [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md) — pipeline runtime, program/exec block, redirect, exemple `logts-play`.
- Teste **3500–3511**, **3512–3520** (`logic`): parse, engine, comp, wave redirect, F5 vector/matrix/`::c`, round-trip, pin width limits.
- `doc(inline.logic)`, `doc(comp.logic)`; secțiuni în doc-viewer.

---

### Faza 5 — Matrix / vector query output **(completed)**

**Scop:** 2 vars libere max; redirect aliniat cu [`wire-vectors.md`](../v0_3_2/doc/wire-vectors.md). **>2 vars** → eroare. **Fill/truncate/count:** D12a. **Encoding ASCII:** D12b (inclusiv scalar `:N >=` MVP — același encoding, fără hash).

| Vars libere | Redirect nou | Validare țintă wire |
|-------------|--------------|---------------------|
| **1** | `query >= vector` | `Wwire[N]` — soluții ≤ N |
| **1** | `query:count >= wire` | scalar — k soluții scrise |
| **2** | `query >= matrix` | `Wwire[R,C]` — rânduri ≤ R, C = nr. vars |
| **2** | `query:r >= vector` | rând `r` — width `C×W` |
| **2** | `query::c >= vector` | coloană `c` — width `R×W` (k celule utile) |
| **2** | `query:r:c >= scalar` | celulă `(r,c)` |
| **2** | `query:count >= wire` | k rânduri scrise |
| **2** | `query:width >= wire` | C cols (constante elaborare) |

**Implementat (core):**

| Fișier | Ce |
|--------|-----|
| [`parser.js`](../v0_3_2/core/parser.js) | `tryParseLogicQueryRedirect`: `>=`, `:N`, `:r:c`, `::c`, `:count`, `:width` |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | Pack vector/matrix/row/col; atom→ASCII; `logicPrepareInputEnv` |
| [`logic.js`](../v0_3_2/core/components/logic.js) | `_applyRedirects` extins; tensor 1D `[N]` = vector; max 2 vars |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | `_captureLogicElementFill` la declarare wire |

**Teste F5:** **3512–3516** (vector bulk, matrix, cell, ASCII show, column slice `::c`); **3504** actualizat ASCII; **3517–3520** (round-trip text, pin width text/number).

**Exemple `logts-play`:** [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md) — vector, matrix, `::c`, round-trip.

#### Faza 5+ — extensii pin frontieră + round-trip **(completed)**

| Topic | Decizie / implementare |
|-------|------------------------|
| **Slice coloană `::c`** | `allAges::0 >= col0` — pack coloană variabilă liberă; test **3516** |
| **Round-trip pin `text`** | wire (ASCII redirect) → `myX = wire` → pin → motor (`logicPinToInputValue` + internare atom); pattern **două comp-uri** (fetch fără pin legat + lookup cu `X is text myX`); test **3517** |
| **Pin `text` — limită** | Lățime de la wire la assign; min 8, **max 256** biți (D14b); test **3518** (`myWickedLongName` pe `160wire`) |
| **Pin `number` — limită** | Default elaborare **64** biți; la assign lățime wire, min 8, **max 64** biți (D14b); teste **3519**, **3520** |

**Notă round-trip:** comp cu `X is text myX` legat dar pin gol (`\0…`) constrânge query-urile la prima rulare — separă fetch (program block gol) de lookup (pin populat din wire).

**Legat de 1+b:** filtrare/policies (`;unique`, cap rows) — amânat post-F5.

---

### Faza 6 — Allow / NotAllow pentru `logic` **(completed)**

**Scop:** expune tipurile noi în sistemul de policy Allow/NotAllow, aliniat cu pattern-ul existent (`inline.type{asm protocol}`, `comp.type{reg}`, …) — vezi [`allow-notallow.md`](../v0_3_2/doc/allow-notallow.md).

**Prerequisite (Fazele 1 + 3):**

- `'logic'` în `INLINE_KINDS` din [`policy-type-modules.js`](../v0_3_2/core/policy-type-modules.js) — `resolveTypeToken` pentru `inline.type{logic}`.
- `comp [logic]` înregistrat în `componentRegistry` — `resolveCompTypeToken` recunoaște `logic` pentru `comp.type{logic}`.

**Implementare Faza 6:**

| Fișier | Rol |
|--------|-----|
| [`allow-notallow.md`](../v0_3_2/doc/allow-notallow.md) | Secțiune nouă + exemple: `inline.type{logic}`, `comp.type{logic}`; combinații `Allow NONE …` |
| [`policy-type-modules.js`](../v0_3_2/core/policy-type-modules.js) | Verificare finală: `logic` listat în `doc(inline.type)` / mesaje eroare neutre |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | Policy check la `execInline` (inline) și la instanțiere/exec comp (logic) — același pattern ca asm/plc |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) + manifest | Grup `allow-notallow`: teste noi |

**Token-uri policy:**

| Token | Allow | NotAllow |
|-------|-------|----------|
| `inline.type{logic}` | permite doar `inline [logic]` | blochează `inline [logic]` |
| `comp.type{logic}` | permite doar `comp [logic]` | blochează `comp [logic]` |
| `inline` / `comp` (categorie) | toate inline/comp, inclusiv logic | blochează tot modulul |

**Exemple țintă:**

```logts
NotAllow inline.type{logic}
inline [logic] .x:    # eroare la execInline / parse policy

Allow NONE comp.type{logic}
comp [logic] .ok:      # permis
comp [reg] .bad:       # blocat
```

**Mesaje eroare (neutre, ca restul policy):**

- `Inline kind 'logic' is not allowed (NotAllow policy)`
- `Component type 'logic' is not allowed (NotAllow policy)`

**Teste minime:**

1. `NotAllow inline.type{logic}` → `inline [logic] .t:` eșuează; `inline [asm] .a:` merge.
2. `NotAllow comp.type{logic}` → `comp [logic] .t:` eșuează; `comp [reg] .r:` merge.
3. `Allow NONE inline.type{logic} comp.type{logic}` → doar logic permis pe ambele module.
4. `doc(Allow)` / `doc(inline.type)` listează `logic` după înregistrare.

**Notă:** wiring-ul (`INLINE_KINDS`, registry comp) a fost făcut în Fazele 1/3; Faza 6 a adăugat doc + teste policy (**3506–3507**).

---

### Faza 7 — Negation `\+` **(completed)**

**Scop:** extinde motorul D5-A cu **negation as failure** (`\+ goal`), promovat din **1+c**. Permite query-uri de tip „cine nu are X?” și filtrare în body de regulă.

**Prerequisite:** Fazele 1–2 (parser + engine); Faza 3 (redirect boolean 0 vars deja funcțional).

**Decizii de confirmat:** **D20–D24** (tabel + secțiuni de mai sus).

#### Ce lipsește azi

| Layer | Stare actuală | Faza 7 |
|-------|---------------|--------|
| Tokenizer | `\` folosit doar în `=\\=` | Token **`\+`** |
| `parseBodyGoal` | call / cmp / unify | Branch **`not`** |
| `query` | un singur `parseCompound()` | **D22:** `parseBodyGoals()` |
| `_solveGoals` | call, cmp, unify | Branch **`not`** + undo trail |
| `logicInternGoal` / free-vars walk | fără `not` | Recursiv pe inner goal |
| Docs | „Not built-in — use facts” | Secțiune NAF + exemple |
| Teste | — | **3521+** |

#### Fișiere de modificat

| Fișier | Rol |
|--------|-----|
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | Token `\\+`; AST `kind:'not'`; query → `goals[]`; format/validate/free-vars |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | NAF în `_solveGoals`; `logicInternGoal(not)`; `logicCollectFreeVarsInGoal(not)` |
| [`components/logic.js`](../v0_3_2/core/components/logic.js) | Elaborare: free vars din `q.goals` (dacă D22-A) |
| [`doc/inline-logic.md`](../v0_3_2/doc/inline-logic.md) | Sintaxă `\\+`, semantica NAF, diferențe Prolog, query multi-goal |
| [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md) | Exemplu comp: boolean + vector „person fără age” |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | Grup `logic` **3536–3539** |

**Fără schimbări:** [`parser.js`](../v0_3_2/core/parser.js) redirect, [`components/logic.js`](../v0_3_2/core/components/logic.js) `_applyRedirects` — negația e transparentă la runtime comp.

#### Flux NAF (mermaid)

```mermaid
flowchart TD
  solveGoals["_solveGoals goals, env"]
  notGoal{"goal.kind == not?"}
  innerSolve["_solveGoals innerGoal, env"]
  anySol{"prima solutie gasita?"}
  undoTrail["env.undo trail"]
  failNeg["return false"]
  contRest["_solveGoals rest, env"]

  solveGoals --> notGoal
  notGoal -->|nu| contRest
  notGoal -->|da| innerSolve
  innerSolve --> anySol
  anySol -->|da| undoTrail
  undoTrail --> failNeg
  anySol -->|nu| undoTrail2["env.undo trail"]
  undoTrail2 --> contRest
```

#### Exemplu țintă inline + comp

```logts
inline [logic] .world:

    person(john)
    person(mary)
    person(peter)

    age(john, 25)
    age(mary, 30)

    query personWithoutAge:
        person(X), \+ age(X, _)

    query johnHasNoAge:
        \+ age(john, _)

:

comp [logic] .worldLogic:
    on: 1
    .world { }
:

8wire who = \0
1wire flag = 0
1wire trigger = 1

.worldLogic:{
    personWithoutAge:0 >= who
    johnHasNoAge >= flag
    set = trigger
}
; who = ASCII peter (primul index); flag = 0 (john are age)
```

#### Teste minime propuse

| ID | Scop |
|----|------|
| **3521** | Engine unit: `executeLogicQueries` — `\\+ age(peter, _)` → soluție booleană (0 vars) |
| **3522** | Engine: `\\+ age(john, _)` → **zero** soluții (john are age) |
| **3523** | Regulă: `eligible(X) <- person(X), \\+ banned(X)` |
| **3524** | Comp boolean redirect: `johnHasNoAge >= flag` |
| **3525** | Comp scalar/vector: `personWithoutAge:0 >= who` → `peter` |

#### Criterii done

- [x] ~~D20–D24 confirmate~~ **(completed)**
- [x] Parser + engine + internare AST `not`
- [x] Query multi-goal (D22-A)
- [x] Teste **3536–3539**; suite **2701/2701**
- [x] Doc inline-logic + comp-logic

**Amânate legate (nu F7):** **1+i** cut, **1+b** filtrare soluții după NAF.

---

### Faza 8 — Depth tuning + pout observabilitate **(completed)**

**Scop:** promovat din **1+d** — limite configurabile pe comp, pout **`truncated`** / **`depthExceeded`**, doc recursivitate Prolog-like.

**Decizii:** **D25–D29 confirmed** (vezi secțiuni de mai sus).

#### Ce lipsește azi

| Layer | Stare | Faza 8 |
|-------|-------|--------|
| `maxDepth` / `maxSolutions` | hardcodat 256/64 în engine | citit din atribute **`comp [logic]`** |
| `executeLogicQueries` options | doar `maxSolutions` | + `maxDepth` |
| Pout-uri comp | doar `execCount` | + **`truncated`**, **`depthExceeded`** (1 bit) |
| Exec redirect | query → wire | **`truncated >= wire`**, **`depthExceeded >= wire`** |
| Doc | absent | limite + exemple `logts-play` |

#### Fișiere de modificat

| Fișier | Change |
|--------|--------|
| [`components/logic.js`](../v0_3_2/core/components/logic.js) | Parse `maxDepth`/`maxSolutions`; pout defs; set flags după exec; redirect pout |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | Raportează `truncated`/`depthExceeded` per query sau callback; options `maxDepth` |
| [`parser.js`](../v0_3_2/core/parser.js) | Recunoaște redirect `truncated >=`, `depthExceeded >=` (ca query pout) |
| [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md) | Atribute, pout, exemple Load & Run |
| [`doc/inline-logic.md`](../v0_3_2/doc/inline-logic.md) | Secțiune limite engine + recursivitate |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3540+** truncated, depthExceeded, defaults |

#### Exemplu țintă (exec block — sintaxă corectă)

```logts
comp [logic] .peopleLogic:
    on: 1
    maxSolutions: 2
    .people { }
:

.peopleLogic:{
    johnOwns:0 >= car0
    johnOwns:1 >= car1
    truncated >= wasTruncated
    depthExceeded >= hitDepth
    set = trigger
}
```

#### Criterii done

- [x] Atribute `maxDepth` / `maxSolutions` pe comp (default D29)
- [x] Pout `truncated`, `depthExceeded` + redirect în exec block
- [x] Teste **3540–3543** + doc + manifest

**Amânat post-F8:** D27 **A2** (flag per query), D28 **B** (lint warning).

---

## Decizii Faza 9 — inline query invoke (D30–D32)

> **Sursă:** item **1+h** promovat din backlog.  
> **Stare:** **D30=A, D31=A, D32=A (confirmed).**

### Rezumat D30–D32

| ID | Subiect | Decizie |
|----|---------|---------|
| **D30** | Return expresie | **A (confirmed)** — aceeași formă/encoding ca redirect comp (D12/D12a/D12b); LHS wire fixează scalar vs vector vs matrix |
| **D31** | Conținut bloc `{ }` | **A (confirmed)** — goals Prolog (body query), **nu** nume query / selector redirect |
| **D32** | Input trailing | **A (confirmed)** — `, Var=expr` opțional; decode number/text/bool ca pin boundary comp |

### D31 — Bloc = goals Prolog **(confirmed)**

**Exemple canonice:**

```logts
1wire y = .world:query({ owns(john, X) }, X=car)

8wire[10] y = .world:query({ owns(john, _) })
```

| În `{ }` | Semnificație |
|----------|--------------|
| `goal1, goal2, …` | Gramatică ca body `query` / regulă — comma = AND, `\+`, `=:=`, etc. |
| **`_`** | Poziție colectată la bulk output (vector/matrix) |
| **Respins** | `{ queryName }`, `{ queryName:0 }`, `.world:available(...)` |

### D32 — Binding-uri `Var=expr` **(confirmed)**

`, X=car, Item=itemWire` — variabile Prolog legate **înainte** de solve (fără comp / program block).

### D30 — Return **(confirmed)**

| Vars libere (după goals + bind) | LHS | Return |
|---------------------------------|-----|--------|
| **0** | scalar / `1wire` | **`1`** / **`0`** |
| **1** (inclusiv `_`) | `8wire[N]` | vector soluții |
| **2** | `32wire[R,C]` | matrix soluții |
| **1** + scalar (fără `[N]`) | `8wire` / `40wire` / … | prima soluție pe lățimea wire-ului (ASCII + pad) **(completed — teste 3550–3553, doc)** |

**D33 (recommended):** `maxDepth` / `maxSolutions` — default engine (**256** / **64**, D29) la invoke inline; fără atribute pe inline (spre deosebire de comp F8).

---

### Faza 9 — Inline query invoke `.world:query({ })` **(completed)**

**Scop:** promovat din **1+h** — apel expresie **`.inline:query({ goals }, Var=wire, …)`** pe `inline [logic]`, fără `comp [logic]`.

#### Livrat

| Fișier | Change |
|--------|--------|
| [`parser.js`](../v0_3_2/core/parser.js) | `.logic:query({ … } [, Var=expr …])` — bloc goals + binding-uri |
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | `parseLogicGoalsBlock(raw)` |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `executeLogicGoals`, `logicEncodeInlineQueryResult`, `_` → collect |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | `evalLogicInlineQuery`, `_inlineLogicAssignWire`, `_logicShapeFromDecl` |
| [`logic.js`](../v0_3_2/core/components/logic.js) | export `logicWireShape` |
| [`doc/logic-query-exec.md`](../v0_3_2/doc/logic-query-exec.md) | Pagină nouă + exemple `logts-play` Load & Run |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3544–3547**, **3548–3549** (limits), **3550–3553** (scalar width) |

#### Criterii done

- [x] Parser + `evalInlineMethod` logic `query`
- [x] `executeLogicGoals` + encode partajat cu comp redirect
- [x] Teste **3544–3553**; suite verde
- [x] Doc `logic-query-exec.md` — scalar width + vector cell width + manifest

**Post-F9 (completed):** scalar `8wire`/`40wire`/… fără `[N]` → prima soluție pe lățimea wire-ului; `40wire[N]` pentru nume atom complete. ~~Atribute `maxDepth` pe inline~~ **(done — per-call options)**.

---

## Decizii Faza 10 — result policies (D34–D38)

> **Sursă:** item **1+b** promovat din backlog post-MVP.  
> **Stare:** **D34–D37 confirmed**, **D38=A (confirmed)**. Gata de implementare.

### Context — ce există deja (fără policies)

| Nevoie | Acoperire azi |
|--------|----------------|
| Prima soluție scalar | `query:0 >= wire`, `40wire = .world:query({ … })` (F5/F9) |
| Toate soluțiile (prefix) | `query >= vector` — discovery order, truncate la N (D12a); **fără `;unique`** = toate (până la cap) |
| Număr soluții | `query:count >= wire` |
| Cap colectare | `maxSolutions` pe comp / per-call la `:query` (F8/F9) |

**Lacuna 1+b:** dedupe (`;unique`), cap listă orientat (`;first`), ultima soluție discovery (`;last`).

---

### D34 — Sintaxă **(confirmed: A)**

**Redirect comp** — policy ca **suffix pe nume query**, înainte de `>=`:

```logts
johnOwns;unique >= allCars
johnOwns;last >= lastCar
```

**Inline `:query`** — policy **după binding-uri** (trailing), nu imediat după `{ }`:

```logts
40wire[4] cars = .world:query({ owns(john, _) }, X=car, Y=year;unique)
1wire ok = .world:query({ owns(john, X) }, X=car;unique)
```

| Formă | Verdict |
|-------|---------|
| `.world:query({ … };unique, X=val)` | **Respins** — ciudat; policy după args |
| `.world:query({ … }, X=val, Y=val;unique)` | **Confirmed** |
| `johnOwns;unique >= wire` | **Confirmed** |

Aliniat cu `SORT(m; col=2)` — `;` introduce modiferi trailing.

---

### D35 — `;unique` **(confirmed: A)**

| Regulă | Comportament |
|--------|--------------|
| **Vector** (1 var) | Dedupe după valoarea encodată a var-ului liber (tuple 1-coloană) |
| **Matrix** (2 vars) | Dedupe după **întreg rândul** (tuple ambele cols) — același `(X,Y)` pe rânduri diferite → **o singură** păstrată |
| **Ordine** | Păstrează **prima** apariție în discovery order (D10) |
| **`:count`** | Numără soluțiile **după** dedupe |

**Duplicate pe rânduri diferite — da, se poate:** același binding poate proveni din căi de demonstrație diferite (clauze/fapte duplicate, reguli overlap). `;unique` comprimă lista înainte de pack pe wire.

---

### D36 — `;first` / `;last` **(confirmed parțial)**

#### `;first`

| Context | Semnificație |
|---------|--------------|
| **Scalar** | Redundant cu `maxSolutions=\1` / `:0 >=` — **nu e focus MVP** |
| **Vector / matrix** | **Nu e redundant** — limitează **pack-ul** la prima soluție în buffer (slot `:0` / rând 0), chiar dacă motorul a colectat mai multe; util când vrei listă dar doar primul element semnificativ |

#### `;last`

| Regulă | Comportament |
|--------|--------------|
| **Semantica** | Ultima soluție în **discovery order** (ordinea backtracking Prolog), **nu** sortare arbitrară |
| **vs MySQL `ORDER BY id DESC LIMIT 1`** | **Nu** există „găsim ultima direct” fără enumerare — motorul explorează în ordine fixă; `;last` = colectează (până la `maxSolutions` / epuizare) → ia **ultimul** element |
| **Optimizare viitoare** | Index / ordine inversă pe facts — **out of scope** F10; eventual notă 1+b+ |

**MVP F10:** `;unique` obligatoriu; `;first` + `;last` dacă timp — prioritate **`;unique`**, apoi **`;last`**.

---

### D37 — `;all` **(confirmed: respins)**

**Fără policy** = deja „all” în limitele D12a / `maxSolutions`:

- vector: prefix soluții + fill tail
- truncate silent dacă k > N slots (comp: pout `truncated`)

**`;all` nu se implementează** — lipsește `;unique` ⇒ nu dedupe; colectare normală.

---

### D38 — Unde se aplică **(confirmed: A)**

**Ambele** — același post-procesor după `executeLogicGoals`:

- redirect `query;policy >= wire` în exec block comp
- trailing `;policy` pe `.inline:query({ }, …;policy)`

---

### Exemple țintă

```logts
inline [logic] .world:

    owns(john, chevy)
    owns(john, chevy)    # duplicate fact — demo ;unique
    owns(john, ford)

:

40wire[4] uniq = .world:query({ owns(john, _) };unique)

40wire car = 01100011'01101000'01100101'01110110'01111001
1wire ok = .world:query({ owns(john, X) }, X=car;unique)

comp [logic] .peopleLogic:
    on: 1
    .people { }
:

8wire[4] allCars = 00000000
1wire trigger = 1

.peopleLogic:{
    johnOwns;unique >= allCars
    johnOwns;last >= lastCar
    set = trigger
}
```

---

### Criterii done

- [x] Parser `;unique` / `;first` / `;last` — redirect + inline query (trailing după bindings)
- [x] `logicApplyResultPolicy(solutions, policy, freeVars)` — dedupe tuple, first/last pack rules
- [x] Teste **3554–3558** — duplicate facts + `;unique`; matrix duplicate rows; `:count` după dedupe; `;last` cu 3 soluții
- [x] Doc `comp-logic.md` + `logic-query-exec.md`

**Amânat post-F10:** `;unique` + NAF; sort key invers (non-discovery `last`).

---

## Analiză sketch — runtime mutation + constraints

**Sursă:** [`.cursor/my_ideas/logic_runtime_mutation_n_constraint`](../my_ideas/logic_runtime_mutation_n_constraint)

### Direcție ( ce se dorește )

| Layer | Rol |
|-------|-----|
| **`inline [logic]`** | Facts **statice**, reguli, queries, **`constraint`** (F12) — **definiție**, nemodificată la runtime |
| **`comp [logic]`** | KB runtime = static + **dynamic fact store**; tranzacții **`logic { + / - }`**; pout **`mutationFailed`** |
| **F12 constraints** | Reguli de **validare** pe **starea propusă** după tranzacție — nu produc soluții alternative |

Model țintă: **RULES = program**, **FACTS = date runtime**, **CONSTRAINTS = gardă la tranziții**.

### Aliniere cu ce există (F0–F10)

| Sketch | Stare azi | Notă |
|--------|-----------|------|
| Exec block + `set` | ✅ F3 | Mutations intră în același property block |
| Query + redirect | ✅ F3/F5/F10 | După mutație, query-urile văd starea nouă |
| Wire → atom (pin/query) | ✅ D12b, F9 | Reutilizabil la args `+ allowed(destWire, boxWire)` |
| Atoms unquoted `john` | ✅ D8 | Sketch folosește `"zone2"` — **neconcordanță** → D42/D59 |
| `truncated` / `depthExceeded` | ✅ F8 | `mutationFailed` = al treilea pout de status tranzacție |

### Posibile erori / neclarități în sketch

| # | Problemă | Impact | Decizie propusă |
|---|----------|--------|-----------------|
| 1 | Wire refs tipate `text c1` vs atoms bare | Parser mutation / D59 | **D42, D59 confirmed** |
| 2 | `- fact` absent = success sau fail? | Semantica tranzacției | **D44** |
| 3 | Poți `-` un fact **static** din inline? | Model overlay | **D45** |
| 4 | Ordinea `logic {}` vs query vs `set` | Pipeline exec pass | **D48** |
| 5 | Constraint pe predicate vs pe **delta** | Performanță / corectitudine | **D54** |
| 6 | `capacityAvailable/1` — relation helper sau built-in? | F12 expressivitate | **D57** |
| 7 | Nota veche 1+e (`assert` în reguli) vs sketch (`logic {}`) | Scope F11 | **D40** — sketch **(recommended)** |

### Recomandare ordine

1. **Faza 11** — store dinamic + tranzacții (fără constraints sau cu validare minimă hardcoded)
2. **Faza 12** — keyword `constraint` + validare pe stare propusă
3. F11 **poate** merge live cu „constraint pass gol” până la F12 — **D58**

---

## Decizii Faza 11 — runtime mutation (D40–D49)

> **Sursă:** item **1+e** promovat; sketch **runtime mutation**.  
> **Stare:** **D40–D49 confirmed.** F11 **(ready-to-implement)** — mod `data: overlay` implicit.

### Rezumat decizii F11

| ID | Decizie |
|----|---------|
| D40 | **A** — `logic { + / - }`; doc ≈ assert/retract |
| D41 | **A** — overlay default; **1+r** → **`static`** / **`seed`** (~~copy~~ respins) |
| D42 | **A** — wire + literal |
| D43 | **A** — `+` idempotent |
| D44 | **A** — `-` absent = success |
| D45 | **A** — tombstone |
| D46 | **A** — atomic |
| D47 | **A** — pout ultima tranzacție |
| D48 | **A** — mutate(+F12 validate)→query→redirect |
| D49 | **A** — comp-only; **1+m** low priority |

---

| Capabilitate | F0–F10 |
|--------------|--------|
| Facts la runtime | Doar static din `inline [logic]` |
| World state între `set`-uri | Nu — fiecare solve = aceeași KB |
| Move atomic `inside`- | Nu — doar simulare manuală prin fire |
| Eroare tranziție | `truncated`/`depthExceeded` = search limits, **nu** commit |

---

### D40 — Unde trăiește mutația (sintaxă) **(confirmed: A)**

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **A — `logic { + / - }` în exec block (recommended)** | Sketch: `.myLogic:{ logic { + … - … } set = trigger }` | Aliniat cu comp=circuit; atomic block clar; separă def de date | Nu e Prolog clasic |
| **B — `assert` / `retract` ca goals în `<-` body (change)** | Nota veche 1+e / Prolog | Expresiv în reguli | Amestecă side-effects în backtracking; ordine soluții nedefinită |
| **C — ambele** | Exec block + goals | Flexibilitate maximă | Două modele, cost implementare + doc |

**Decizie:** **A** — mutația trăiește **doar** în exec block comp, sintaxă `logic { + fact(...) - fact(...) }`.

**Documentație (obligatoriu la F11):** în [`comp-logic.md`](../v0_3_2/doc/comp-logic.md) și [`inline-logic.md`](../v0_3_2/doc/inline-logic.md), explică explicit analogia Prolog:

| LogTScript (F11) | Prolog clasic | Semnificație |
|------------------|---------------|--------------|
| **`+ fact(...)`** | **`assert(fact)`** | Adaugă un fapt în KB **runtime** (dynamic store) |
| **`- fact(...)`** | **`retract(fact)`** | Elimină un fapt din KB **runtime** (dynamic sau ascunde static — vezi D45) |

**Nu** implementăm `assert`/`retract` ca goals în reguli în F11 — doar **`+`/`-`** în exec block. Prolog rămâne referința conceptuală în doc.

**1+n** amânat (assert/retract în `<-` body).

---

### D41 — Model static + dynamic **(confirmed: A — overlay default)**

**Decizie:** **A** — overlay pe comp. F11 implementează **doar** acest mod; atribut comp **`data: overlay`** implicit (poate fi omis).

**Amânat 1+r:** `data: static` (fără `+/-`), **`data: seed`** (ex-D41-C) — vezi backlog **1+r**; ~~`data: copy`~~ **respins**; impact **D44/D45/D48** decis la **1+r** pentru **seed/static**.

La fiecare `set` pe comp, motorul construiește KB-ul pentru query/solve/mutation validate:

#### **A — overlay pe comp (confirmed, default)**

```text
inline [logic]     →  facts STATICE (read-only, shared între instanțe)
comp [logic]       →  dynamic store (Set separat: + adăugări, - retrageri overlay)
query/solve        →  KB efectiv = static ∖ tombstones ∔ dynamic
```

| Aspect | Comportament |
|--------|--------------|
| **Inline** | `owns(john, chevy).` rămâne **nemodificat** în fișier și în registry |
| **Instanță comp** | `.whLogic` și `.whLogic2` au **dynamic store-uri separate** |
| **Prima mutație** | **Nu** copiază tot staticul — doar adaugă/șterge în overlay |
| **Memorie** | Mică dacă puține mutații; static partajat |
| **`use`** | Static din module `use`-d merge ca azi; overlay per comp |

**Exemplu:** inline are `container(c1).`. Comp A face `+ container(c2)`. Query pe A vede `c1` (static) + `c2` (dynamic). Comp B fără mutații vede doar `c1`.

#### **B — copy-on-write la primul `+`** ❌ **respins (nu 1+r)**

```text
load comp  →  pointer la static (read-only)
primul `+` →  CLONE entire static KB → mutable copy on comp
mutații    →  editezi copia locală
```

| Aspect | Comportament |
|--------|--------------|
| **Prima mutație** | Cost **O(n)** — copiezi **toate** facts static |
| **După clone** | Un singur index; `+`/`-` ca pe o KB clasică |
| **Memorie** | Duplică tot staticul per comp care mută măcar o dată |

**Decizie user (2026-08-20):** **nu implementăm** — beneficiu mic față de **overlay** / **seed**; complexitate la index delta + `use`. Rămâne doar ca referință istorică (ex-D41-B).

#### **C — doar dynamic; inline = schema / seed** → **1+r** (`data: seed`)

```text
init comp   →  COPY facts inline → dynamic store (one-time seed)
inline      →  „template” — nu participă direct la solve după init
mutații     →  doar pe dynamic store
```

| Aspect | Comportament |
|--------|--------------|
| **Init** | Toate facts din inline devin dynamic la crearea comp |
| **Inline după init** | Nu mai citești static la fiecare solve — doar store-ul comp |
| **Sharing** | Două comp-uri cu același inline au **seed identic** la init (același run), apoi diverg independent |
| **Rerulare** | Orice edit inline → **rerun** — fără persistență; nu există sync live inline↔comp |

**Când are sens:** vrei mental model „comp = bază de date; inline = DDL + seed”.

**Recomandare analiză:** **A** — aliniat sketch (inline imutabil, dynamic separat), eficient pentru simulări cu mult static și puține mutații. **Confirmat.**

---

### D42 — Argumente mutation: wire vs literal **(confirmed: A)**

Sketch:

```logts
logic { + allowed(myDestWire, myBoxWire) }   # wire → valoare la run
logic { + allowed("zone2", "container7") }   # literal text
logic { + age("john", 25) }                  # literal numeric
```

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **A — wire prefix tipat + literal atom (confirmed D59)** | Wire: `text`/`bool`/`number` + nume; literal: atom/number logic | Tip explicit la decode | Migrare F11 tests |
| **B — doar wire în MVP** | Orice arg = expr LogTScript | Un parser path | Verbose: `+ allowed(destWire, boxWire)` obligatoriu |
| **C — doar literals logic în MVP (change)** | Fără wire direct în `+` | Parser simplu | Pierde legătura cu fire fără pins |

**Decizie:** **A** — wire (decode ca F9) + literals logic în args mutation.

---

### D43 — `+` duplicat (idempotent) **(confirmed: A)**

Sketch: dynamic facts = **set**; al doilea `+ allowed(z,c)` **nu** dublează.

| Opțiune | Verdict sketch |
|---------|----------------|
| **A — idempotent, success (recommended)** | Aliniat sketch |
| **B — fail tranzacție** | `mutationFailed=1` la duplicat |

**Decizie:** **A** — al doilea `+` același fact = **success**, fără duplicat în store.

---

### D44 — `-` când factul lipsește **(confirmed: A)**

Sketch (secțiune „Removing Facts”): eșecul rezervat pentru operații **illegal** conform regulilor runtime (inclusiv **F12 constraints**) — **nu** pentru „absent”.

| Opțiune | Descriere |
|---------|-----------|
| **A — success silent dacă absent (confirmed)** | `-` = „asigură absent” — scoate din dynamic sau tombstone pe static (D45) |
| **B — fail tranzacție** | Prolog `retract` strict |
| **C — fail doar dacă `-` țintește static fără overlay (change)** | Respins — înlocuit de **A + D45 tombstone** |

**Decizie:** **A** — un singur comportament: `- fact` → fact absent din KB efectiv.

#### Notă opțiune C (respinsă, păstrată pentru istoric)

**C** spune: comportamentul lui `-` depinde de **unde** era factul:

| Situație | `- fact` cu **C** |
|----------|-------------------|
| Fact în **dynamic store** | Success — îl scoți (ca A) |
| Fact **absent** complet (nici static, nici dynamic) | Success silent (ca A) |
| Fact există **doar static** (din inline), fără tombstone | **FAIL** → `mutationFailed=1`, rollback |

**De ce există C:** forțează o distincție explicită — **nu poți „șterge” un fact static** cu `-` simplu; trebuie fie **D45-A tombstone**, fie accepti că static e permanent (D45-A2).

**Cu A (recommended):** `- fact` = „vreau ca `fact` să **nu** fie în KB efectiv” — indiferent de sursă: scoate din dynamic **sau** adaugă tombstone pe static (D45). **Un singur comportament** pentru user.

**Cu C:** user trebuie să știe că `- owns(john,chevy)` **eșuează** dacă `chevy` vine doar din inline, până nu implementezi tombstone — mesaj/semantica mai rigidă.

**Cu C:** user trebuie să știe că `- owns(john,chevy)` **eșuează** dacă `chevy` vine doar din inline, până nu implementezi tombstone — mesaj/semantica mai rigidă. **Nu folosim C** — **A + D45** acoperă cazul.

---

### D45 — Retragere facts **statice** inline **(confirmed: A)**

Facts din `inline [logic]` sunt **definiție** — nu le modifici în fișier la runtime. Întrebarea: poate `-` să **ascundă** un fact static **pentru instanța asta de comp**?

#### **A — overlay: dynamic + tombstone (confirmed)**

Trei liste la merge (KB efectiv):

```text
KB_efectiv = (static_facts ∖ tombstones) ∪ dynamic_adds
```

| Structură | Rol |
|-----------|-----|
| **static_facts** | Din inline (+ `use`), read-only shared |
| **dynamic_adds** | Facts adăugate cu `+` |
| **tombstones** | Facts **retrase** cu `-` — inclusiv cele care existau doar în static |

**Ce e „tombstone”:** nu ștergi din inline; marchezi pe comp *„tratează `owns(john,chevy)` ca absent”*. La query, motorul **sare** peste acel fact static.

**Exemplu:**

```logts
inline: owns(john, chevy). owns(john, ford).

# comp init — KB: chevy, ford

logic { - owns(john, chevy) }   # tombstone pe chevy

# KB efectiv: ford only (chevy ascuns pentru instanța asta)
# alt comp .peopleLogic2 fără mutație — încă vede chevy
```

**„Opțional” în draft anterior** = mecanismul tombstone e **parte din A**, nu feature separat de activat/dezactivat. Fără tombstone, A nu poate retrage static — rămâne doar A2.

#### **A2 — static permanent; `-` doar pe dynamic**

| `- target` | Rezultat |
|------------|----------|
| Fact în dynamic | Removed |
| Fact doar static | **Ignorat** (success silent) sau **no-op** — static rămâne vizibil |

**Limitare:** nu poți dezactiva un fact seed din inline (ex. `allowed(zone1,c1)` inițial) fără să schimbi inline.

#### **B — copie mutabilă a întregului static**

La init (sau la prima mutație), comp **clonează** toate facts static într-o KB locală. `-` șterge fizic din copie.

| Pro | Contra |
|-----|--------|
| Un singur store după clone | Memorie duplicată; pierde sharing static read-only |

**Decizie:** **A** — tombstone + dynamic; `-` pe static = adaugă tombstone, nu modifică inline.

---

### D46 — Atomicitate tranzacție **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — all-or-nothing per `logic { }` block (recommended)** | Sketch: COMMIT / ROLLBACK pe întreg block-ul |
| **B — o operație = o tranzacție** | Mai simplu | Pierde „move” atomic |

**Decizie:** **A** — tot `logic { }` = o tranzacție; COMMIT sau ROLLBACK integral.

**F12:** validarea constraints rulează pe **starea finală propusă**, nu pas-cu-pas — **D54**.

---

### D47 — Pout `mutationFailed` **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — 1 bit, ultima tranzacție din ultimul exec pass (recommended)** | Paralel `truncated`/`depthExceeded`; redirect `mutationFailed >= wire` |
| **B — latch până la clear explicit** | | 
| **C — per `logic {}` block în același pass** | Rar util |

Valori: **`0`** = success, **`1`** = rollback (sketch).

**Decizie:** **A** — 1 bit, ultima tranzacție din ultimul exec pass; redirect `mutationFailed >= wire`.

---

### D48 — Ordine în exec pass **(confirmed: A — cu sub-pipeline F12)**

#### Analiză: Faza 11 + Faza 12 (sketch constraints)

Sketch mutation + constraints (flux conceptual):

```text
current state
      ↓
temporary state  ← aplică TOATE +/- din logic { }
      ↓
validate constraints (F12, D53: stare finală propusă)
      ↓
   valid? ──no──→ ROLLBACK → mutationFailed=1
      │
     yes
      ↓
   COMMIT → dynamic store + tombstones actualizate
      ↓
   queries (KB = stare commit-uită)
      ↓
   redirects (query + mutationFailed + truncated…)
```

**Concluzie analiză:** **D48-A** rămâne corect — query-urile rulează **după** commit/rollback. Dacă rollback, KB = starea anterioară (neschimbată); query-urile văd tot **starea commit-uită** (identică cu pre-mutation). **`mutationFailed`** reflectă eșecul tranzacției.

**F12 nu schimbă ordinea macro** — inserează **validare în interiorul** fazei de mutație (pas 3–4), **înainte** de query. Aliniat sketch: *„validate constraints → COMMIT”* then queries on new world.

#### Pipeline exec pass **(confirmed: A)**

```text
1. program block (pins) — wire → pin
2. eval args logic { } — wire → termeni mutation
3. mutation phase:
   a. build proposed KB (overlay apply all +/-)
   b. [F12 când activ] validateConstraints(proposed)  — D52-A (commit), D53-A, D54-A
   b-init. [F12] validateConstraints(static KB) la elaboration — D52-A
   c. COMMIT sau ROLLBACK → mutationFailed (D47)
4. solve toate query-urile (D2-A) pe KB commit-uită
5. redirects (query + pout)
6. set consume
```

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **A — mutate(+validate F12)→query→redirect (confirmed)** | Sketch + F12 | Derived knowledge post-commit; `mutationFailed` disponibil la redirect | — |
| **B — query→mutate→redirect (change)** | Query pe stare **pre-mutation** același pass | Citești vechea lume înainte de move | Regulile derivate contradictorii cu commit; anti-sketch |
| **C — trigger separat `mutate = wire` (change)** | Mutations decouple de `set` | Control hardware | Sintaxă extra; 2 trigger-e |
| **D — ordinea liniilor din exec block (change)** | Proprietățile rulează în ordinea scrierii | Flexibil | Fragil; diferă de D2-A „toate query-urile”; greu de testat |
| **E — skip query dacă mutationFailed=1 (change)** | Optimizare | Economie solve | Query-urile pe stare veche pot fi tot utile (ex. „de ce a eșuat?”) |
| **F — validate constraints și după query (change)** | Double-check | Paranoia | Contrazice D52-A; cost dublu |

**Decizie:** **A** — macro-order fix; F12 = sub-pas în mutation phase. **Confirmat explicit.**

**Notă F11 fără F12 (D58-A):** pas **3b** absent (no-op pass); **3c** commit direct după apply.

**Ordine sursă exec block:** liniile `logic {}`, `mutationFailed >=`, `johnOwns >=`, `set =` — **nu** impun ordine de execuție; pipeline-ul de mai sus e **semantic**, ca la query-redirects azi.

---

### D49 — Inline mutation (`.world:mutate`) **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — comp-only (confirmed)** | Paralel F9: mutația = responsabilitate runtime comp |
| **B — și invoke inline expresie (change)** | `.warehouse:mutate({ + inside(box, c1) })` | Simetric F9 |

**Decizie:** **A** — **1+m** amânat, **low priority** (puțin probabil).

---

## Faza 11 — runtime mutation **(done)**

**Scop:** `comp [logic]` menține **dynamic facts** (mod **`data: overlay`**, implicit); exec block acceptă **`logic { + fact(...) - fact(...) }`**; tranzacții **atomice**; pout **`mutationFailed`**. Pipeline exec: **D48-A**.

```logts
comp [logic] .whLogic:
    data: overlay    # default F11 — omis = overlay
    on: 1
    .warehouse { }
:
```

| Fișier | Modificări |
|--------|------------|
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | (minimal) reprezentare fact term pentru serialize |
| [`parser.js`](../v0_3_2/core/parser.js) | parse `logic { }` în property block; `+`/`-` statements |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `LogicDynamicStore`, merge static+dynamic, apply transaction |
| [`logic.js`](../v0_3_2/core/components/logic.js) | store per comp, exec pass pipeline D48, pout `mutationFailed` |
| [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md) | runtime mutation + analogie **`+`≈assert / `-`≈retract** + exemple **logts-play** |
| [`doc/logic-runtime.md`](../v0_3_2/doc/logic-runtime.md) | pagină dedicată static/dynamic/tombstone/mutations + exemple **logts-play** |
| [`doc/inline-logic.md`](../v0_3_2/doc/inline-logic.md) | static vs dynamic; link logic-runtime |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3559+** |

### Teste țintă (3559+)

| ID | Titlu |
|----|-------|
| 3559 | parse `logic { + fact - fact }` |
| 3560 | `+` persistă între două `set`-uri; query vede fact nou |
| 3561 | tranzacție atomică move `- inside + inside` |
| 3562 | rollback parțial — `mutationFailed=1`, stare neschimbată |
| 3563 | `+` idempotent (D43) |
| 3564 | `-` absent silent (D44) |
| 3565 | args din wire (text) + literal |
| 3566 | `mutationFailed >= wire` redirect |
| 3567–3575 | perechi **wave** (move, non-ground, wire arg, tombstone, …) |

### Criterii done

- [x] Decizii **D40–D49** confirmate
- [x] Parser `logic { }` + eval args
- [x] Dynamic store + union la solve (overlay)
- [x] Tranzacție atomică + `mutationFailed` + pipeline D48-A
- [x] Teste **3559–3575** (legacy + wave); suite verde **2737/2737**
- [x] Doc **logts-play** — [`logic-runtime.md`](../v0_3_2/doc/logic-runtime.md), [`comp-logic.md`](../v0_3_2/doc/comp-logic.md)

**Amânat post-F11:** **1+r** (`data: static/seed`), **1+m**, **1+n**, **1+o**, **1+q**.

---

## Decizii Faza 12 — constraints (D50–D59)

> **Sursă:** partea a II-a din sketch **constraints**.  
> **Stare:** **D50–D59 confirmed** — validare în **sub-pipeline mutation** (D48-A pas 3b) + **init** pe KB static (D52-A).

### Rezumat decizii F12

| ID | Decizie | Notă |
|----|---------|------|
| **D50** | **A** | `constraint Head <= Body` în inline — **`<=`** (nu `<-`) marchează semantică diferită de relations |
| **D51** | **A** | Roluri separate: același predicate poate fi fact + constraint + relation |
| **D52** | **A** | La **commit** tranzacție **și la init** pe KB static — aceeași funcție; elaboration error vs `mutationFailed` |
| **D53** | **A** | Validare pe **starea propusă completă** după toate `+`/`-` |
| **D54** | **A** | Invocare pe **delta+** / predicate atinse; body evaluat pe **întreaga proposed KB** (nu A2) |
| **D55** | **A** | Eșec → ROLLBACK → `mutationFailed=1` |
| **D56** | **A** | Același engine ca query, pe KB propusă (aliniat D54) |
| **D57** | **A** | Helpers (`capacityAvailable/1`) = relations obișnuite în inline |
| **D58** | **A** | F11 livrat fără constraints; F12 = gardă opțională |
| **D59** | **A** | Atoms **unquoted**; wire în mutation = prefix **`text` / `bool` / `number`** + nume wire (fără ghilimele) |

**Legătură D48:** constraints **nu** schimbă ordinea macro mutate→query→redirect; rulează **în interiorul** mutation phase, pe **starea propusă** (D53), **înainte** de COMMIT.

**Legătură D50↔D51:** neck **`<=`** vs **`<-`** face vizual separarea rolurilor — același `inside/2` poate avea clauze **relation** cu `<-` și declarații **constraint** cu `<=`.

### Context

**Relație** (OR între clauze, neck **`<-`**):

```logts
canMove(X, Y) <- vehicle(X), road(Y)
canMove(X, Y) <- robot(X), corridor(Y)
```

**Constraint** (AND între declarații același predicate, neck **`<=`**):

```logts
constraint inside(X, Y) <= object(X), container(Y)
constraint inside(X, Y) <= allowed(X, Y)
```

Ambele trebuie să reușească pentru ca un fact `inside/2` din **starea propusă** să fie legal.

---

### D50 — Keyword și parse **(confirmed: A — `<=` neck)**

| Opțiune | Descriere |
|---------|-----------|
| **A — `constraint Head <= Body` în inline body (confirmed)** | Keyword `constraint` + neck **`<=`** (semantica validare, distinct de `<-` relations) |
| **B — prefix `:- constraint` (change)** | | 
| **C — attribute pe predicate (change)** | `@constraint inside/2` |
| ~~sketch `<-`~~ | **Schimbat** față de sketch inițial — `<-` rămâne doar pentru rules/relations |

**Decizie:** **A** — `constraint inside(O, C) <= object(O), container(C).`

---

### D51 — Același predicate: relation **și** constraint **(confirmed: A)**

Exemplu: `inside/2` poate fi **fact** runtime, **constraint** de validare, și **head** de regulă derivată.

| Opțiune | Descriere |
|---------|-----------|
| **A — da, roluri separate (confirmed)** | Constraint validează **facts** `inside(...)` propuse; regulile derivate cu `<-` separate |
| **B — predicate fie constraint fie relation** | Mutual exclusive |

**Decizie:** **A** — susținut de D50 (`<=` vs `<-`).

---

### D52 — Când rulează constraints **(confirmed: A — commit + init)**

| Opțiune | Descriere |
|---------|-----------|
| **A — la commit tranzacție + la init KB static (confirmed)** | Aceeași `validateConstraints(proposedKB, delta)`; init = proposed = static∖tombstones∪adds (overlay gol) |
| **B — și la fiecare query (change)** | Redundant — query read-only pe KB deja commit-uită → **1+p** |
| **C — opțional flag comp `validateOnQuery:` (change)** | | 

| Moment | KB | Eșec |
|--------|-----|------|
| **Init / elaboration** | facts static din inline (+ merge `use`) | **Elaboration error** — inline inconsistent |
| **Commit mutation** | proposed după toate `+`/`-` | **ROLLBACK** + `mutationFailed=1` |

**Decizie:** **A** — fără fază separată F12b; init folosește aceeași funcție.

---

### D53 — Scope validare: stare propusă completă **(confirmed: A)**

Sketch: `- inside(b,c1) + inside(b,c2)` — constraints pe **starea finală**, nu pe delta intermediară.

| Opțiune | Descriere |
|---------|-----------|
| **A — full proposed state după toate +/- (confirmed)** | Uniqueness, capacity, move atomic |
| **B — per operație (change)** | Move atomic eșuează incorect |

**Decizie:** **A**.

---

### D54 — Ce facts verificăm **(confirmed: A — body pe proposed KB completă)**

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **A — invocare pe delta+ / predicate atinse; body vede întreaga proposed KB (confirmed)** | Echilibru corect capacity/uniqueness fără scan A2 | | Implementare trebuie să paseze proposed KB la engine (D56) |
| **A2 — revalidare globală a tuturor facts predicate mutat (change)** | Simplu O(n) | | **Respins** pentru F12 — optimizare **1+q** dacă e nevoie |
| **B — doar facts nou adăugate (change)** | | | Pierde cross-fact |

**La init (D52):** validare pe **toate** facts static supuse constraints (echivalent scan complet o singură dată).

**Decizie:** **A** — nu A2; `capacityAvailable(C)` numără `inside(_, C)` în **întreaga** proposed KB când validează un singur fact din delta+.

---

### D55 — Eșec constraint → rollback **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — CONSTRAINT FAILED → ROLLBACK → mutationFailed=1 (confirmed)** | Sketch |
| **B — warning, commit parțial (change)** | Respins de atomicitate D46 |

**Decizie:** **A**.

---

### D56 — Constraint body: ce goals permise **(confirmed: A)**

`capacityAvailable(Container)` — apelează relații pe **starea propusă** (D54).

| Opțiune | Descriere |
|---------|-----------|
| **A — același engine ca query, pe KB temporară / proposed (confirmed)** | `\+`, arithmetic, relations |
| **B — subset declarativ (change)** | | 
| **C — fără NAF în constraints (change)** | Evită fragile negation |

**Legat F7:** NAF în constraint body — permis la A; audit dur **1+p** dacă apar cazuri fragile.

**Decizie:** **A** — aliniat D54 (body consultă proposed KB completă).

---

### D57 — Helpers derivate (`capacityAvailable/1`) **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — relation obișnuită în inline, apelată din constraint (confirmed)** | User-defined; evaluată pe proposed KB |
| **B — built-in library (change)** | | 
| **C — aggregate syntax amânat (change)** | **1+q** viitor |

**Decizie:** **A**.

---

### D58 — F11 fără F12 **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — da: F11 livrabil fără constraints; F12 adaugă gardă opțională (confirmed)** | Pas 3b no-op când zero constraints |
| **B — F11 necesită minim `constraint` gol (change)** | **Respins** — F11 deja livrat |

**Decizie:** **A**.

---

### D59 — Atoms vs wire refs în mutation **(confirmed: A — typed wire prefix)**

**Problemă:** un wire LogTScript nu poartă tip logic (text/number/bool) — lățimea wire-ului nu fixează decode-ul. Ghilimele vs unquoted nu rezolvă conversia.

**Soluție:** în **`logic { }`**, argumentele fact-ului follow:

| Formă | Semnificație |
|-------|--------------|
| **`box1`** (identifier simplu) | **Atom** logic (ca inline facts) |
| **`text c1`** | Wire **`c1`** — decode **ASCII → atom** (ca pin `text`) |
| **`number scoreIn`** | Wire — decode **unsigned binary → integer** |
| **`bool flag`** | Wire — decode **1 bit → 0/1** (atom `false`/`true` sau number — aliniat `logicPinToInputValue`) |
| **`42`** | Literal number (lexer existent) |

**Keywords rezervate** doar în context mutation args: `text`, `bool`, `number` urmate de nume wire. Atomul literal `text` rămâne posibil ca termen simplu (un singur ID).

**Fără ghilimele** — inline facts și mutation atoms rămân unquoted; sketch `"zone2"` **nu** e sintaxă LogTScript.

```logts
8wire container2 = ...
40wire box1wire  = ...
8wire scoreIn    = 00001111

.whLogic:{
    logic {
        + inside(box1, text container2)    /* wire → atom din bits */
        + level(box1, number scoreIn)
        + active(box1, bool flag)
        - inside(box1, text container2)   /* retract același fact ground */
    }
    /* atom fix, fără wire: */
    logic { + status(box1, ok) }
}
```

**Erori:**

| Situație | Rezultat |
|----------|----------|
| `text missingWire` — wire inexistent | **Eroare** la eval mutation (înainte de ground check) |
| `text c1` — wire există | Decode cu `logicPinToInputValue(bits, bindType)` — același path ca pins |
| `container2` fără prefix | **Atom** `container2`, chiar dacă există wire homonim |

**Schimbare față de F11:** F11 folosea wire-if-exists-else-atom pe identifier simplu; **F12** necesită prefix tipat pentru wire. Migrare teste/doc F11 la F12.

| Opțiune | Descriere |
|---------|-----------|
| **A — prefix `text`/`bool`/`number` + wire; bare ID = atom (confirmed)** | Tip explicit + zero conflicte nume |
| ~~A prior~~ | `"atom"` quoted + unquoted = wire obligatoriu — **înlocuit** |
| **B — ghilimele + infer tip (change)** | | 
| **C — doar atoms unquoted F11 (change)** | | 

**Decizie:** **A** — typed wire prefix; aliniat vocabulary program block (`X is text myX`).

**Legătură D42:** la eval mutation, wire → termeni ground folosește **bind type explicit** din prefix (nu `logicInferBindType` pe lățime).

---

## Faza 12 — constraints **(done)**

**Scop:** `constraint Name(...) <= Body` în `inline [logic]`; validare la **init** (KB static) și la **commit** mutation (stare propusă); eșec init → elaboration error; eșec commit → rollback + `mutationFailed`.

### Fișiere țintă

| Fișier | Modificări |
|--------|------------|
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | parse `constraint` + neck `<=`; parse mutation wire refs `text`/`bool`/`number` + ID |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `validateConstraints(proposedKB, delta)` pe engine cu proposed clauses |
| [`logic.js`](../v0_3_2/core/components/logic.js) | hook init + post-apply pre-commit; D59 typed wire resolve în mutation |
| [`doc/inline-logic.md`](../v0_3_2/doc/inline-logic.md) | constraints (`<=`) vs relations (`<-`); OR vs AND |
| [`doc/logic-runtime.md`](../v0_3_2/doc/logic-runtime.md) | validate → commit; `text`/`number`/`bool` wire refs în mutation |
| [`doc/comp-logic.md`](../v0_3_2/doc/comp-logic.md) | flux mutation → validate → commit |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3576+** (3567–3575 = F11 wave) |

### Teste țintă (3576+)

| ID | Titlu |
|----|-------|
| 3576 | parse `constraint inside(X,Y) <= ...` |
| 3577 | init: inline static invalid → elaboration error |
| 3578 | `+ inside("box1","c1")` success când object+container există |
| 3579 | constraint fail → rollback + `mutationFailed=1` |
| 3580 | multiple constraints same predicate (AND) |
| 3581 | move atomic `- inside + inside` cu constraint uniqueness |
| 3582 | capacity — a treia `+ inside` respinsă |
| 3583 | constraint body folosește relație helper pe stare propusă |
| 3584 | D59: `text unknownWire` → eroare; bare `c1` = atom chiar cu wire homonim |
| 3585 | D59: `number scoreIn` decode corect în mutation |
| 3586–3593 | perechi **wave** pentru 3578–3585 |

### Exemplu țintă (consolidat)

```logts
inline [logic] .warehouse:

    object(box1)
    container(c1)
    container(c2)

    constraint inside(Object, Container) <=
        object(Object),
        container(Container)

    constraint inside(Object, Container) <=
        singleLocation(Object)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

1wire failed = 0
1wire trigger = 1

.whLogic:{
    logic {
        - inside(box1, c1)
        + inside(box1, c2)
    }
    mutationFailed >= failed
    set = trigger
}
```

### Criterii done

- [x] Decizii **D50–D59** confirmate
- [x] Parser `constraint` + `<=` + mutation wire refs `text`/`bool`/`number`
- [x] D59: bare ID = atom; wire doar cu prefix tipat
- [x] Validare proposed KB (D53–D54) + init static (D52)
- [x] Integrare rollback F11 (D55)
- [x] Teste **3576–3593** legacy + wave; suite verde **2755/2755**
- [x] Doc **logts-play** — [`logic-constraints.md`](../v0_3_2/doc/logic-constraints.md), updates runtime/comp/inline

**Amânat post-F12:** constraints la query (**1+p**).

---

## Decizii Faza 13 — scale & perf (1+q) (D60–D68)

> **Sursă:** backlog **1+q** — index dynamic facts, aggregates constraints (ex-D57-C), optimizări D54.  
> **Stare:** **D60–D68 confirmed** — F13 **(completed)**.

### Rezumat decizii F13

| ID | Decizie | Notă |
|----|---------|------|
| **D60** | **A** | Index + `count/2` |
| **D61** | **A** | Index pe KB **efectivă** per comp; **B** (static/dynamic separat) — follow-up dacă static uriaș |
| **D62** | **B** | Attribute **`indexRebuild: full`** (default) **`\| delta`**; init = mereu full; **`indexFacts: 0`** → ignore |
| **D63** | **A** | `count(Goals, N)` — nu B (ordine ISO), nu C |
| **D64** | **A** | Număr soluții; înlocuiește pattern `badTriple` |
| **D65** | **A** | N output sau ground; vars din head legate în G |
| **D66** | **A** | Engine primește index pre-built + rules |
| **D67** | **A** | Helper-e vechi rămân valide |
| **D68** | **B** | **`indexFacts: 1`** implicit; **`0`** = fără index; **`indexRebuild`** ignorat când `0` |

---

### Rezumat problemă (context)

| Situație azi (F12) | Limită |
|--------------------|--------|
| `logicBuildRuntimeClauses` | Scan liniar static + filtru tombstone + concat adds |
| `LogicEngine` index | Re-internare clauses la fiecare solve/validate |
| Constraints capacity | Helper relations + NAF + multiple `inside/2` goals (`badTriple`) |
| D54-A | Corect funcțional; body scanează KB propusă — O(n) pe predicate populate |

**Scop F13:** aceeași semantica wave=legacy, **fără breaking changes** — doar structuri de date + **`count/2`** (MVP aggregate).

---

### D60 — Scope F13 **(confirmed: A)**

| Opțiune | Livrabil |
|---------|----------|
| **A — index + `count/2` (recommended)** | Index facts efective per comp + built-in `count(Goal, N)` în body constraint/rule/query |
| **B — doar index** | Perf merge/lookup; constraints rămân relation helpers |
| **C — doar `count/2`** | Aggregates fără index persistent |
| **D — index + count + revalidare A2 opțională** | Flag intern când predicate are >N facts |

**Decizie:** **A**.

---

### D61 — Ce indexăm **(confirmed: A — B amânat ca optimizare)**

| Opțiune | Descriere |
|---------|-----------|
| **A — index pe KB efectivă per comp (confirmed)** | Un singur `Map<predicate/arity, FactClause[]>` după merge static∖tombstone∪adds |
| **B — index separat static + dynamic (follow-up)** | Static index o dată (per inline merge); la commit doar patch adds/tombstones |
| **C — index global pe inline (respins)** | Dynamic e per comp |

**De ce A acum (și nu B):**

- **Rebuild la commit** = O(n) pe facts **efective** — pentru sim/warehouse (zeci–sute facts) e neglijabil (microsecunde).
- **B** devine util când **static e foarte mare** (mii+) și mutațiile sunt **mici** (1–2 facts) — atunci patch incremental bate full rebuild.
- **Tombstone** deranjează B: trebuie ținut per comp un `Set` de keys static ascunse + merge la citire; A absorbă asta natural în rebuild efectiv.
- **C** e greșit: două comp-uri pe același inline au dynamic store diferit.

**Decizie:** **A** pentru F13 MVP. **B** documentat ca optimizare viitoare (poate fuziona cu D62 `delta`).

---

### D62 — Strategie rebuild index **`indexRebuild:`** **(confirmed: B — user alege full \| delta)**

| Opțiune | Descriere |
|---------|-----------|
| **A — mereu full rebuild (respins ca singură opțiune)** | Simplu dar fără control user |
| **B — attribute comp `indexRebuild:` (confirmed)** | **`full`** (default) sau **`delta`** |
| **C — threshold automat (amânat)** | Hybrid intern — neimplementat F13 |

**Attribute comp (F13):**

```logts
comp [logic] .whLogic:
    on: 1
    indexFacts: 1        # default 1 — omit = activ; 0 = fără index (path F12)
    indexRebuild: full    # default full — sau delta
    .warehouse { }
```

| `indexFacts` | `indexRebuild` | Comportament |
|--------------|----------------|--------------|
| **`0`** | *(ignorat)* | Fără index persistent; merge liniar F12 |
| **`1`** / omis | **`full`** / omis | La **init** + la **commit**: rebuild O(n) din KB efectivă |
| **`1`** / omis | **`delta`** | **Init:** mereu **full** (index gol). **Commit reușit:** patch O(delta) din ops tranzacție |

**Reguli:**

- **`indexRebuild` ignorat complet** când `indexFacts: 0` (user: confirmat).
- **Init / elaboration:** primul build index = **întotdeauna full** (index gol → scan KB efectivă). Atributele `indexFacts` / `indexRebuild` sunt fixate la elaborare; fiecare **Run** re-elaborează tot scriptul — **fără persistență** între Run-uri, deci nu există „index lipsă” la runtime după init reușit.
- **KB statică** nu se modifică în timpul unui Run — singura cale de schimbare e **`logic { + / - }`** (mutations). Delta controlează doar patch post-commit pe ops tranzacție.
- **Validare proposed (pre-commit):** index **ephemeral** rebuild **full** pe KB propusă (o dată per pass) — nu folosește `indexRebuild` persistent; simplifică corectitudinea D53/D54.
- **Valori acceptate:** `full`, `delta` (alias documentat opțional: `incremental` = `delta` — de decis la implementare dacă acceptăm sinonim).

**Exemplu `indexRebuild: delta` — commit move:**

```logts
logic { - inside(box1, c1); + inside(box1, c2) }
```

Patch pe `comp.factIndex` (fără rescan static):

1. Remove key `inside/2` → `box1,c1` (tombstone / dynamic remove).
2. Add key `inside/2` → `box1,c2`.
3. Lăsă neatinse celelalte facts indexate.

**Delta idempotentă (obligatoriu — aliniat cu store):**

Store-ul acceptă ops duplicate fără eroare; delta trebuie același comportament:

```logts
logic { - inside(box1, c1); - inside(box1, c1); - inside(box1, c1) }   /* no-op după primul remove */
logic { + inside(box1, c1); + inside(box1, c1); + inside(box1, c1) }   /* no-op după primul add */
```

| Op | Stare index înainte | Acțiune delta |
|----|---------------------|---------------|
| **`- key`** | key prezent (static sau dynamic) | Remove / hide din index efectiv |
| **`- key`** | key absent (deja tombstoned) | **No-op** — nu e inconsistență |
| **`+ key`** | key absent | Insert |
| **`+ key`** | key deja prezent efectiv | **No-op** (replace echivalent) |

Ops aplicate **în ordinea tranzacției** (aceeași ca `logicApplyMutationTransaction`).

**Eroare la inconsistență reală — fără fallback silent la full rebuild:**

- **Nu** facem fallback la full rebuild când delta detectează o problemă — full rebuild ar reuși mereu și **ascunde bug-uri** în path-ul delta.
- **Nu** există warning-uri în logTscript — doar **`Error`** (throw), ca restul engine-ului.
- Delta **throw** când indexul nu poate reflecta legal starea post-commit — ex.: structură index coruptă, bucket invalid, post-patch sanity check eșuează (index ≠ scan liniar pe KB efectivă).
- **Nu** e inconsistență: remove/add idempotent pe key deja absent/prezent — store acceptă, delta no-op.
- Eroarea delta **≠** `mutationFailed` — apare **după** commit store reușit; e bug intern F13 de reparat, nu respingere mutation user.

**Decizie:** **B** — `indexRebuild: full` default; `delta` opt-in; delta strictă, idempotentă, **fail loud**.

---

### D63 — Sintaxă **`count/2`** **(confirmed: A)**

| Opțiune | Exemplu |
|---------|---------|
| **A — goal `count(Goals, N)` comma-separated (recommended)** | `count(inside(_, C), N), N < Max` |
| **B — `count(N, Goal)` ordine ISO (respins)** | Prolog libraries (`bagof`/`aggregate`) folosesc uneori Count-first — **noi** rămânem goal-first ca restul body-ului (`object(O), container(C), …`) |
| **C — keyword `aggregate …` (respins)** | Prea mult syntax |

**Legătura cu constraint:** body-ul `constraint … <= …` e o **listă de goals** legate prin virgulă (AND), ca la reguli. `count/2` e **un goal** în lanț — la fel ca `object(O)` sau `N =< Max`:

```logts
constraint inside(O, C) <=
    object(O),           /* goal 1 — leagă O,C din head */
    container(C),        /* goal 2 */
    capacity(C, Max),    /* goal 3 */
    count(inside(_, C), N),  /* goal 4 — N := câte inside(_,C) în KB propusă */
    N =< Max             /* goal 5 — cmp arithmetic */
```

**Decizie:** **A**.

---

### D64 — Semantica `count/2` **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — număr soluții pentru Goal pe KB curentă (recommended)** | `count(inside(_, c1), N)` → N=2 dacă două soluții distincte |
| **B — doar ground facts matching head pattern** | Echivalent pentru facts pure, diferă la rules |
| **C — distinct pe primul arg liber** | Optimizare viitoare |

**Ce era `badTriple` (F12, test 3582):**

```logts
badTriple(C) <-
    inside(box1, C),
    inside(box2, C),
    inside(box3, C)

slotAvailable(C) <- capacity(C, Max), \+ badTriple(C)
```

- **`badTriple(C)`** reușește dacă există **trei binding-uri** care satisfac cele 3 goals (backtracking) → „cel puțin 3 obiecte în C”.
- **`slotAvailable`** reușește când **nu** poți proba badTriple → cel mult 2 obiecte (pentru box1..box3 fixe).
- **Limitări:** hardcodat pe box1/2/3; predicate extra; NAF fragil; nu generalizează la `capacity(c1, 47)`.

**Cu D64-A (`count/2`):**

```logts
count(inside(_, C), N), N =< Max
```

- **N** = număr soluții `inside(_, C)` pe KB propusă (2 obiecte → N=2).
- Același rezultat ca badTriple pentru capacity 2, dar **generic** pentru orice Max.

**Decizie:** **A**.

---

### D65 — `count/2` și variabile **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — N trebuie ground sau variabilă liberă output (recommended)** | `count(G, N)` leagă N; G poate conține vars deja legate din constraint head |
| **B — N trebuie mereu liber** | |
| **C — count în cmp chain: `N =< Max`** | N number term; engine evaluează cmp după count |

**Decizie:** **A**.

---

### D66 — Index folosit de engine **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — `LogicEngine` primește index pre-built + clauses rules (recommended)** | Facts din index; rules din clauses cu body |
| **B — doar fast path merge în `logicBuildRuntimeClauses`** | Index nu ajunge la solve |
| **C — cache `LogicEngine` per comp între passes** | Invalidare la commit |

**Decizie:** **A**.

---

### D67 — Compatibilitate **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — zero breaking: helper-e vechi rămân valide (recommended)** | Doc recomandă `count/2`; teste noi + păstrare 3582 |
| **B — deprecate helpers în doc-only** | |

**Wave = legacy:** obligatoriu teste perechi 3594+.

---

### D68 — Attribute comp **`indexFacts`** **(confirmed: B — cu D62 `indexRebuild`)**

| Opțiune | Descriere |
|---------|-----------|
| **A — mereu activ (respins ca singură opțiune)** | |
| **B — `indexFacts:` pe comp (confirmed)** | **`1`** / omis = index ON; **`0`** = fallback F12 (debug, A/B perf) |

```logts
comp [logic] .whLogic:
    on: 1
    indexFacts: 1        # default — omit = 1
    indexRebuild: full    # default — omit = full; delta = patch la commit
    .warehouse { }
```

| `indexFacts` | Comportament |
|--------------|--------------|
| **`1`** / omis | Index activ; **`indexRebuild`** aplicat (D62) |
| **`0`** | Fără index — path F12; **`indexRebuild` ignorat** |

**Decizie:** **B** — pereche `indexFacts` + `indexRebuild`; ambele default **on/full**.

---

## Faza 13 — scale & perf (1+q) **(completed — D60–D68)**

**Scop:** index facts efective per `comp [logic]`; **`count(Goal, N)`** în engine; constraints capacity/uniqueness simplificate; perf merge/validate/query identic semantic.

### Fișiere țintă

| Fișier | Modificări |
|--------|------------|
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `logicBuildFactIndex`, `count/2` goal, engine ctor din index+facts |
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | parse `count(` goal (dacă nu e deja ca compound) |
| [`logic.js`](../v0_3_2/core/components/logic.js) | `indexFacts:`, `indexRebuild:`; rebuild full/delta; pasează index la validate/query |
| [`doc/logic-constraints.md`](../v0_3_2/doc/logic-constraints.md) | secțiune `count/2`, exemple capacity |
| [`doc/logic-runtime.md`](../v0_3_2/doc/logic-runtime.md) | notă index intern (fără syntax user) |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3594+** |

### Teste țintă (3594+)

| ID | Titlu |
|----|-------|
| 3594 | parse / eval `count(inside(_, c1), N)` |
| 3595 | constraint capacity cu `count/2` — al 3-lea `+ inside` respins |
| 3596 | index: după move atomic, count corect pe proposed + committed |
| 3597 | helper `badTriple` vs `count/2` — același rezultat |
| 3598 | `indexRebuild: delta` — același KB ca `full` după move (corectitudine) |
| 3599 | delta idempotent: triple `-` / triple `+` același key — fără eroare |
| 3600 | `indexFacts: 0` — ignore `indexRebuild`; path F12 |
| 3601–3608 | perechi **wave** pentru 3595–3600 |

### Exemplu țintă (capacity cu count)

```logts
inline [logic] .warehouse:

    capacity(c1, 2)

    constraint inside(O, C) <=
        object(O),
        container(C),
        capacity(C, Max),
        count(inside(_, C), N),
        N =< Max

:

.whLogic:{
    logic { + inside(box3, c1) }
    mutationFailed >= failed
    set = trigger
}
```

### Criterii done

- [x] Decizii **D60–D68** confirmate
- [x] `indexFacts:` + `indexRebuild: full|delta`; delta idempotentă; **Error** la inconsistență (fără fallback full)
- [x] `count/2` în engine (constraint + rule + query)
- [x] Teste **3594–3606** legacy + wave; suite verde (**2768**)
- [x] Doc [`logic-indexing.md`](../v0_3_2/doc/logic-indexing.md) + updates logts-play

**Rămâne backlog (nu F13):** **1+p** (validate at query); revalidare A2 globală (doar dacă D60-D); **1+r** independent.

---

## Decizii Faza 14 — mutation Signal Trace (`logic-mut`) (D69–D76)

> **Sursă:** debug UX — `mutationFailed` e doar 1 bit; user vrea motiv + vizibilitate în **Signal Trace** (Win → Signal Trace).  
> **Stare:** **D69–D76 confirmed** — F14 **(completed)**.

### Rezumat decizii F14

| ID | Decizie | Notă |
|----|---------|------|
| **D69** | **A** | Linii **`logic-mut`** în Signal Trace (model `lut-mut` / `phz spawn`) — **nu** panel nou |
| **D70** | **A** | **`try`** + **`commit`** / **`rollback`** — ambele outcome-uri trace-uite |
| **D71** | **A** | **`commit (N ops, M net)`** — ca MySQL *affected rows*; **rollback fără ops/net** |
| **D72** | **A** | Constraint fail: **`inside/2 #K`** — ordinal 1-based în inline (duplicate head) |
| **D73** | **A** | **`try`** truncat (max **4** ops inline) + **`... (+N)`** + expand **`[+]`** |
| **D74** | **A** | **`try`** afișează valori **rezolvate** (wire → literal), **fără** prefix `text`/`number` |
| **D75** | **A** | **Zero** linii dacă exec block **fără** `logic { }` |
| **D76** | **A** | Engine returnează **motiv structurat** (intern); `mutationFailed` **neschimbat** (1 bit) |

---

### D69 — Unde afișăm **(confirmed: A — Signal Trace)**

| Opțiune | Descriere |
|---------|-----------|
| **A — Signal Trace `logic-mut` (confirmed)** | `_emitWaveListen` / `emitWaveListenLine`; L2, filter **Components** |
| **B — pout `mutationReason` text** | Scriptabil dar API extra — **amânat** (poate follow-up după F14) |
| **C — Output `show()` buffer** | Ca CPU trace:get — respins ca MVP |

**Prefix linie:** același ca restul panelului — **`[step N]`** (legacy) / **`[wave N]`** (wave).

**Activare:** doar când **Signal Trace ON** + exec pass conține **`logic { }`**.

**Decizie:** **A**.

---

### D70 — Ce trace-uit **(confirmed: A — try + outcome)**

| Outcome | Linii |
|---------|-------|
| **Success** | `try { … }` apoi `commit (N ops, M net)` |
| **Fail** | `try { … }` apoi `rollback — <code>: <message>` |
| **Fără block** | *(nimic — D75)* |

**Exemple confirmate:**

```text
[step 2] logic-mut .whLogic: try { + inside(box3, "c1") }
[step 2] logic-mut .whLogic: rollback — constraint inside/2 #2 failed on + inside(box3, "c1")
```

```text
[step 2] logic-mut .whLogic: try { - inside(box1, "c1"); + inside(box1, "c2") }
[step 2] logic-mut .whLogic: commit (2 ops, 2 net)
```

**Decizie:** **A** — trace la **success și fail**.

---

### D71 — **`ops` vs `net` pe commit **(confirmed: A)**

| Term | Semnificație |
|------|--------------|
| **`ops`** | Număr operații în tranzacție (lungime listă parse / collect) |
| **`net`** | Operații care **nu** au fost no-op la apply (în ordine, aliniat cu store + idempotență F11/F13) |

**Exemple:**

| Tranzacție | ops | net | Linie commit |
|------------|-----|-----|--------------|
| `- a; - a; - a` (același key) | 3 | 1 | `commit (3 ops, 1 net)` |
| `+ x; + x; + x` (același key) | 3 | 1 | `commit (3 ops, 1 net)` |
| `- a; + b` (move) | 2 | 2 | `commit (2 ops, 2 net)` |
| 3× retract key deja absent | 3 | 0 | `commit (3 ops, 0 net)` |

**Rollback:** **nu** afișează `(ops, net)` — doar cod + mesaj.

**Implementare net:** simulare apply pe copie store sau flag per op la apply — același contract ca delta idempotent.

**Decizie:** **A**.

---

### D72 — Constraint fail — care constraint **(confirmed: A — ordinal `#K`)**

Când există **mai multe** `constraint inside(O,C) <= …` (AND, head identic), trace indică **ordinal 1-based** în ordinea din **`inline [logic]`**:

```text
rollback — constraint inside/2 #2 failed on + inside(box3, "c1")
```

| Opțiune | Descriere |
|---------|-----------|
| **A — `#K` ordinal inline (confirmed)** | Stabil, diferențiază duplicate head |
| **B — line number la parse** | Follow-up opțional: `#2 (line 14)` |
| **C — hash body** | Prea obscur pentru user |

**Engine:** `logicValidateConstraintsForFacts` / `logicValidateFactConstraints` returnează `{ ok, code, fact, constraintIndex, constraintHead, failKind }` — folosit pentru trace; **`mutationFailed`** rămâne 0/1.

**Expand L3 / `[+]`** (opțional F14): snippet body al constraint-ului eșuat.

**Debug constraint ca query** — promovat **Faza 19** (`1+u`); vezi **D100–D106**.

**Decizie:** **A**.

---

### D73 — Truncare `try` + expand **`[+]`** **(confirmed: A)**

| Regulă | Valoare |
|--------|---------|
| Max ops inline în `try` | **4** |
| Peste limită | `try { op1; op2; op3; op4; ... (+16) }` |
| Expand panel | **`[+]`** — listă completă ops (ca PHZ) |

Rollback/commit nu re-listează toate ops — rezumat + fact respins / mesaj.

**Decizie:** **A**.

---

### D74 — Valori rezolvate în `try` **(confirmed: A — fără prefix tip)**

După `_collectMutationOps`, facts sunt **ground**. Trace afișează **valoarea efectivă**, nu numele wire-ului:

| Sursă mutation | Afișare |
|----------------|---------|
| atom `box3` | `box3` |
| `text w` → `"warehouse"` | `"warehouse"` |
| `number w` → 34 | `34` |
| `bool w` → 1 | `1` |

**Fără** prefix `text` / `number` / `bool` — tipul e evident din literal.

```text
try { + inside(box3, "c1") }
try { + level(box1, 15) }
```

**Decizie:** **A**.

---

### D75 — Fără `logic { }` **(confirmed: A)**

| Exec block | Trace |
|------------|-------|
| **Fără** `logic { }` | **Zero** linii `logic-mut` |
| **Cu** `logic { }` (chiar gol) | `try` + outcome (edge: parse gol → fără try sau `try { }` minimal — implementare decide) |

**Decizie:** **A** — nu poluăm trace când nu s-a încercat mutation.

---

### D76 — API intern motiv **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — rezultat structurat intern (confirmed)** | `{ ok, code: 'parse'|'ground'|'constraint'|'store', message, … }` |
| **B — schimbă `mutationFailed` în enum** | Breaking — respins |

**Coduri rollback:**

| Code | Mesaj exemplu |
|------|----------------|
| **`parse`** | `wire 'missingWire' not found` |
| **`ground`** | `non-ground fact in + inside(X, c1)` |
| **`constraint`** | `constraint inside/2 #2 failed on + inside(box3, "c1")` |
| **`store`** | `apply transaction failed` (rar) |

**Decizie:** **A** — fără breaking changes pe pout.

---

## Faza 14 — mutation Signal Trace (`logic-mut`) **(completed — D69–D76)**

**Scop:** la fiecare pass cu `logic { + / - }`, Signal Trace arată **try**, apoi **commit (ops, net)** sau **rollback — motiv** (inclusiv constraint **`#K`**); valori wire rezolvate în `try`; wave = legacy. **Doc:** pagină dedicată [`signal-trace.md`](../v0_3_2/doc/signal-trace.md) (mutare din `debug.md` + secțiune **`logic-mut`**).

### Fișiere țintă

| Fișier | Modificări |
|--------|------------|
| [`logic.js`](../v0_3_2/core/components/logic.js) | `_applyMutations` → motiv structurat; emit `logic-mut` via strategy; format ops pentru trace |
| [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | validate return structurat; helper `logicFormatFactForTrace`; op **net** count |
| [`signal-propagation.js`](../v0_3_2/core/signal-propagation.js) | kind **`logic-mut`** → filter Components (dacă nu mapează deja `component`) |
| [`doc/signal-trace.md`](../v0_3_2/doc/signal-trace.md) | **pagină dedicată** — vezi [Documentație F14](#documentație-f14) |
| [`doc/debug.md`](../v0_3_2/doc/debug.md) | mută secțiunea Signal Trace → stub scurt + link `signal-trace.md` |
| [`doc/logic-runtime.md`](../v0_3_2/doc/logic-runtime.md) | link `signal-trace.md#logic-mut` |
| [`doc/phz.md`](../v0_3_2/doc/phz.md), [`doc/sock.md`](../v0_3_2/doc/sock.md), [`doc/huffman-v2.md`](../v0_3_2/doc/huffman-v2.md) | cross-link → `signal-trace.md` (nu doar `debug.md`) |
| [`ui/doc-viewer.js`](../v0_3_2/ui/doc-viewer.js) | intrare **Signal Trace (UI panel)** — searchPrimary L1 L2 L3 wave legacy lut-mut phz logic-mut |
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3607+** (grup `wave-debug` / `logic`) |

### Documentație F14

**Livrabil:** [`doc/signal-trace.md`](../v0_3_2/doc/signal-trace.md) — pagină dedicată (nu secțiune îngropată în `debug.md`).

| Acțiune | Detaliu |
|---------|---------|
| **Mutare** | Conținutul actual § Signal Trace din [`debug.md`](../v0_3_2/doc/debug.md) → `signal-trace.md` (controls, L1–L3, Fmt, Filter, wave/legacy, line catalog PHZ/lut-mut, value formatting) |
| **Stub în debug.md** | 3–5 rânduri: ce e panelul, Win → Signal Trace, link **[signal-trace.md](signal-trace.md)** — păstrează anchor `#signal-trace-ui-panel` sau redirect text |
| **Extindere logic** | Secțiune **`logic-mut`**: contract try / commit `(N ops, M net)` / rollback `#K`; truncare + `[+]`; valori rezolvate (inclusiv exemplu wire `text`/`number` în `try`); zero linii fără `logic { }`; **logts-play** success + constraint fail |
| **vs alte tool-uri** | Tabel scurt: Signal Trace vs `probe` vs `watch` vs `show` (mutat/rezumat din debug) |
| **Cross-linkuri** | `phz.md`, `sock.md`, `huffman-v2.md`, `logic-runtime.md`, `logic-indexing.md` → `signal-trace.md`; Wave debug patterns din debug rămân în debug cu link la signal-trace |
| **doc-viewer** | Label + searchPrimary/Extra pentru discoverability |
| **Regen** | `node node/_gen_doc_data.js` după fișiere doc |

**Nu în F14 doc:** filter UI dedicat **Logic** (rămâne **Components**); `mutationReason` pout.

### Contract linii (MVP)

```text
logic-mut .<comp>: try { <ops, max 4, valori rezolvate> [; ... (+N)] }
logic-mut .<comp>: commit (<ops> ops, <net> net)
logic-mut .<comp>: rollback — <code>: <message>
```

### Teste țintă (3607+)

| ID | Titlu |
|----|-------|
| 3607 | success — `commit (2 ops, 2 net)` move; trace conține `try` + `commit` |
| 3608 | fail constraint — rollback cu `inside/2 #2`; `mutationFailed=1` |
| 3609 | `try` truncare 5+ ops + expand `[+]` (smoke UI sau parse trace payload) |
| 3610 | wire `text`/`number` — valori rezolvate în `try` (`"c1"`, `15`) |
| 3611 | triple `-` same key — `commit (3 ops, 1 net)` |
| 3612 | exec fără `logic { }` — **zero** linii `logic-mut` |
| 3613–3618 | perechi **wave** pentru 3607–3612 |

### Criterii done

- [x] Decizii **D69–D76** confirmate
- [x] Linii `logic-mut` L2, Signal Trace ON, wave = legacy
- [x] `try` truncat + `[+]`; valori rezolvate fără prefix tip
- [x] `commit (N ops, M net)`; rollback cu `#K` la constraint
- [x] Fără `logic { }` → zero linii
- [x] Teste **3607–3618** legacy + wave; suite verde (**2780**)
- [x] Doc **[`signal-trace.md`](../v0_3_2/doc/signal-trace.md)** — pagină dedicată; mutare din debug.md; secțiune **`logic-mut`**; logts-play; cross-linkuri + doc-viewer

**Backlog (nu F14):** `mutationReason` text pout (**1+s**); constraint-as-query helper (**1+u**); `#K (line L)` la parse (**1+v** — pause); ~~filter **Logic** dedicat~~ → **Faza 16**.

---

## Decizii Faza 15 — `use` strict + `use once` (D77–D81) **(1+g)**

> **Sursă:** D16 merge `use` e livrat; lipsește lint circular + control user strict vs skip.  
> **Stare:** **D77–D81 confirmed** — F15 **(completed)**.

### Rezumat decizii F15

| ID | Decizie | Notă |
|----|---------|------|
| **D77** | **A** | **`use .mod`** — strict: target deja **`merged`** sau pe **`visiting`** → **o singură** eroare (D80); **stop** elaborare |
| **D78** | **A** | **`use once .mod`** — modifier **`once`**: dacă `.mod` deja **`merged`** (sau pe **`visiting`**) → **skip** silențios |
| **D79** | **A** | Modul lipsă / non-`[logic]` → **eroare** la **`use`** și **`use once`** (ca PHP `require`) |
| **D80** | **A** | Mesaj unic: **`Cannot reuse inline logic .vehicles`** + lanț **`via .world → .vehicles → .world`**; **highlight** linia `use` care a eșuat |
| **D81** | **A** | Un singur keyword **`use`** + modifier opțional **`once`**; `uses[]`: `{ ref, mode, line }` |

**Syntax (confirmat):**

```logts
use .vehicles           ; strict (default)
use once .vehicles      ; idempotent skip
```

**Analogie PHP:**

| PHP | Logic |
|-----|-------|
| `#include` / `#require` | **`use .mod`** — obligatoriu; revisit/ciclu → fatal |
| `#include_once` / `#require_once` | **`use once .mod`** — idempotent; revisit → skip |

**Respinge:** keyword separat **`use-once`** / **`try-use`** — modifier **`once`** după **`use`**.

---

### D77 — `use` strict **(confirmed: A)**

La `logicResolveMerged(root)` root-ul (ex. `.world`) intră în setul **`merged`** **înainte** de procesarea liniilor `use` / `use once`.

Două seturi în merge:

| Set | Semnificație |
|-----|--------------|
| **`visiting`** | Modul **deschis** — merge în curs (DFS); dependențele lui încă se rezolvă |
| **`merged`** | Modul **închis** — clauzele lui sunt deja în KB |

**Revisit** = ținta **`use .mod`** e deja în **`merged`** (modul fully merged). Exemple:

- **`use .self`** pe același inline (root deja merged)
- **`use .vehicles`** de două ori în același fișier (a doua linie = revisit strict)
- muchie **back-edge** într-un graf acyclic dar cu **`use`** strict spre un strămoș deja merged

**Ciclu** = ținta **`use .mod`** e pe stiva **`visiting`** dar **nu** încă în **`merged`** — re-intrare în lanț **înainte** de finish. Exemple:

- `.a` **`use .b`**, `.b` **`use .a`**
- `.a` **`use .a`** dacă root **nu** e considerat merged la prima muchie *(notă: cu root pre-merged, self strict lovește revisit, nu ciclu — ambele → eroare)*

| Situație | `use .mod` |
|----------|------------|
| `.mod` nou (nu în `merged`, nu în `visiting`) | merge facts + rules + constraints; recursiv pe `uses` |
| `.mod` în **`merged`** sau pe **`visiting`** | **Error** — mesaj unic D80; **stop** (fără runtime parțial) |

**Intern:** algoritmul distinge **revisit** (`merged`) vs **ciclu** (`visiting` fără `merged`) — **userul vede același mesaj**; lanțul explică contextul.

**Pre-producție:** inline/comp logic **nu sunt în producție** — nu există breaking-change policy; **`use`** devine strict, **`use once`** = escape explicit.

---

### D78 — `use once` **(confirmed: A)**

Modifier **`once`** imediat după **`use`** (fără keyword nou).

| Situație | `use once .mod` |
|----------|-----------------|
| `.mod` în **`merged`** | **skip** — fără eroare, fără re-merge |
| `.mod` în **`visiting`** | **skip** — taie ciclul fără eroare |
| `.mod` nou | merge ca la `use` strict, apoi `merged` |

**Caz tipic:** `.a` **`use once .b`**, `.b` **`use once .a`** → KB = clauze `.a` + `.b`, o singură dată.

**Mix:** `.a` **`use .b`**, `.b` **`use .a`** → **eroare** (muchie strictă închide ciclul).

---

### D79 — Referință invalidă **(confirmed: A)**

Ambele forme: **`logic use .x must reference inline [logic]`** (mesaj existent).

---

### D80 — Mesaj eroare + highlight **(confirmed: A)**

**O singură formă** — indiferent dacă detectarea internă e revisit sau ciclu:

```text
logic program line 5: Cannot reuse inline logic .vehicles
  via .world → .vehicles → .world
```

| Parte | Conținut |
|-------|----------|
| **Prefix linie** | `logic program line N:` — linia **`use`** strict care a eșuat (editor highlight, ca restul erorilor logic) |
| **Mesaj** | **`Cannot reuse inline logic .mod`** — `.mod` = ținta liniei care a eșuat |
| **Lanț** | **`via .root → … → .mod`** — traseul DFS până la muchia fatală |

**Exemple:**

```logts
inline [logic] .world:
    use .vehicles
    use .vehicles          ; line 5 — a doua linie strictă
:
```

```text
logic program line 5: Cannot reuse inline logic .vehicles
  via .world → .vehicles
```

```logts
inline [logic] .a:
    use .b
:
inline [logic] .b:
    use .a                  ; line 3 — muchia fatală când comp pe .a
:
```

```text
logic program line 3: Cannot reuse inline logic .a
  via .a → .b → .a
```

**Stop joc:** eroarea oprește elaborarea/rularea; nu contează ce s-a merged înainte — user corectează și **run** din nou.

**Implementare:** `uses[]` păstrează **`line`** la parse; `logicResolveMerged` aruncă cu `logicError(msg, useLine)` ([`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) — același pattern ca constraint/query errors).

---

### D81 — Parser + model **(confirmed: A)**

- **Un** keyword **`use`**; după el, opțional modifier **`once`**, apoi **`.mod`**.
- Gramatică: `use ('once')? DOT ID` → `uses: [{ ref: '.vehicles', mode: 'strict' | 'once', line: N }]`.
- `formatLogicInstanceDoc` / `doc()` — afișează `use .x` vs `use once .x`.
- **`logicResolveMerged`** — singur choke point (comp elaboration + `.world:query({ })`); propagă **`line`** la eroare.

**Fără F15:** `maxUseDepth` — amânat (backlog separat dacă apare nevoia).

---

### Implementare F15

| Layer | Fișier | Acțiune |
|-------|--------|---------|
| Parse | [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | modifier **`once`**; `uses[]` cu **`line`** + `mode`; `logicResolveMerged`; eroare D80 + highlight |
| Runtime | [`components/logic.js`](../v0_3_2/core/components/logic.js) | (fără schimbări API — merge via `logicResolveMerged`) |
| Invoke | [`interpreter.js`](../v0_3_2/core/interpreter.js) | același merge path |
| Teste | [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3620+** — DAG valid, strict duplicate/cycle (mesaj D80 + **line**), `use once` OK, editor highlight smoke |
| Doc | [`inline-logic.md`](../v0_3_2/doc/inline-logic.md) | secțiune **`use` / `use once`** + exemple eroare |

### Migrare teste / doc (audit pre-F15)

La trecerea la **`use` strict**, orice exemplu sau test care **depindea** de skip-ul vechi trebuie **`use once`**.

**Audit (2026-08-20):**

| Zona | `use` găsit | Multiple / ciclu | Acțiune |
|------|-------------|------------------|---------|
| [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **0** linii `use .…` în inline logic | — | nimic de migrat |
| [`inline-logic.md`](../v0_3_2/doc/inline-logic.md) | 1× `use .vehicles` (compoziție) | nu | **OK** — single strict `use` |
| [`comp-logic.md`](../v0_3_2/doc/comp-logic.md), [`logic-runtime.md`](../v0_3_2/doc/logic-runtime.md), [`signal-trace.md`](../v0_3_2/doc/signal-trace.md) | fără `use` în body | — | nimic |
| [`doc-data_generated.js`](../v0_3_2/ui/doc-data_generated.js) | mirror inline-logic | nu | regen după update doc |

**La implementare F15:** rerulează grep `^\s+use \.` + `use once` pe `v0_3_2/`; teste noi **3620+** acoperă explicit duplicate/cycle/`use once`.

### Criterii done

- [x] Decizii **D77–D81** implementate
- [x] **`use`** strict → mesaj **`Cannot reuse inline logic .mod`** + lanț **`via …`**; highlight linie `use`
- [x] **`use once`** → skip idempotent
- [x] Modul invalid → eroare la ambele
- [x] Audit teste/doc — nimic de migrat (2026-08-20)
- [x] Teste **3620–3635** legacy + wave; suite verde (**2797**)
- [x] Doc **`inline-logic.md`** + `doc-data_generated.js` regen

**Backlog (nu F15):** `maxUseDepth`; lint `use` duplicate strict în același inline (opțional).

---

## Decizii Faza 16 — Filter **Logic** Signal Trace (D82–D85) **(1+t)**

> **Sursă:** F14 livrează `logic-mut` sub filter **Components** (și apare și la **Wires**); user vrea izolare dedicată pentru debug mutații logic.  
> **Stare:** **D82–D85 confirmed** — F16 **(completed)**.

### Rezumat decizii F16

| ID | Decizie | Notă |
|----|---------|------|
| **D82** | **A** | Filter **Logic** = doar `kind === 'logic-mut'` (deocamdata); viitor `logic-*` — reevaluăm când apare |
| **D83** | **A** | `logic-mut` **doar** în filter **Logic**; **scos** din **Components** și **Wires** |
| **D84** | **A** | `traceCategory: 'logic'` pentru `logic-mut` (`_inferTraceCategory` + `signal-propagation.js`) |
| **D85** | **A** | **Out of scope F16:** **1+s** (`mutationReason` pout), **1+u** (constraint-as-query helper) — backlog separat |

---

### D82 — Scope filter **Logic** **(confirmed: A — doar `logic-mut`)**

| Opțiune | Descriere |
|---------|-----------|
| **A — `logic-mut` only (confirmed)** | Filter afișează exclusiv linii `kind === 'logic-mut'` |
| **B — orice `logic-*` viitor** | Categorie extensibilă — **amânat**; reevaluare când apare alt trace kind |

**Decizie:** **A** — suficient pentru MVP post-F14; extinderea la B se face când există un al doilea kind concret.

---

### D83 — Retragere din **Components** / **Wires** **(confirmed: A)**

| Filter | Înainte (F14) | După F16 |
|--------|---------------|----------|
| **Wires** | include `logic-mut` | **fără** `logic-mut` |
| **Components** | include `logic-mut` | **fără** `logic-mut` |
| **Logic** *(nou)* | — | **doar** `logic-mut` |

**Decizie:** **A** — scopul filterului Logic e să nu mai cauți mutații printre commit/prop/connect/lut-mut.

---

### D84 — Model categorie **`logic`** **(confirmed: A)**

| Layer | Schimbare |
|-------|-----------|
| [`wave-listen-panel.js`](../v0_3_2/ui/wave-listen-panel.js) | `'logic'` în `SIGNAL_TRACE_FILTER_OPTIONS`; `_inferTraceCategory` → `'logic'` pentru `logic-mut`; branch `waveListenEntryMatchesFilter` |
| [`signal-propagation.js`](../v0_3_2/core/signal-propagation.js) | `logic-mut` → `traceCategory: 'logic'` (nu `'component'`) |
| [`script_editor_v0_3_2.html`](../v0_3_2/script_editor_v0_3_2.html) | `<option value="logic">Logic</option>` în Filter ▾ |

**Persistență:** același key `prog/signalTraceFilter`; valoare nouă `'logic'`.

**Decizie:** **A**.

---

### D85 — Ce **nu** intră în F16 **(confirmed: A)**

| Backlog | Motiv amânare |
|---------|---------------|
| **1+s** | `mutationReason` text pout — API scriptabil separat |
| **1+u** | constraint-as-query helper — workflow debug, nu filter UI |

**Decizie:** **A** — F16 = doar filter toolbar + mapare categorie + doc.

---

### Implementare F16

| Layer | Fișier | Acțiune |
|-------|--------|---------|
| UI | [`wave-listen-panel.js`](../v0_3_2/ui/wave-listen-panel.js) | filter `'logic'`; `_inferTraceCategory`; `waveListenEntryMatchesFilter` — D83 |
| Propagation | [`signal-propagation.js`](../v0_3_2/core/signal-propagation.js) | `logic-mut` → category `'logic'` |
| HTML | [`script_editor_v0_3_2.html`](../v0_3_2/script_editor_v0_3_2.html) | option Logic în select |
| Doc | [`signal-trace.md`](../v0_3_2/doc/signal-trace.md) | tabel Filter + coloană **Logic**; `logic-mut` nu mai sub Components |
| Teste | [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3636+** — filter Logic izolează `logic-mut`; Components/Wires fără logic-mut |

### Criterii done

- [x] Decizii **D82–D85** implementate
- [x] Filter **Logic** în toolbar; persist `prog/signalTraceFilter`
- [x] `logic-mut` exclus din Wires + Components; vizibil doar la Logic (+ All)
- [x] Doc **`signal-trace.md`** + `doc-data_generated.js` regen
- [x] Teste **3636–3637**; suite verde (**2799**)

**Backlog (nu F16):** **1+s**, **1+u**; extindere D82-B când apare alt `logic-*` kind.

---

## Decizii Faza 17 — `comp [logic] data:` static + seed (D88–D94) **(1+r)**

> **Sursă:** F11 livrează **`data: overlay`** implicit; user confirmă **fără `copy`** (D88); scope **1+r** = **`static`** + **`seed`**.  
> **Stare:** **D88–D94 confirmed** — F17 **(completed)**.

### Rezumat decizii F17

| ID | Decizie | Notă |
|----|---------|------|
| **D88** | **A** | **`data: copy` respins** — scope: overlay (F11) + **static** + **seed** |
| **D89** | **A** | **`data: static`** + `logic { }` în exec → **elaboration error** |
| **D90** | **A** | **`data: seed`**: la init copie **toate ground facts** din `merged.clauses` → `dynamicStore` |
| **D91** | **A** | **`seed` solve**: **facts** din dynamic; **rules + constraints** din `merged` (nemutate) |
| **D92** | **A** | **`seed` init**: validate constraints pe KB seeded (ca init static overlay) |
| **D93** | **A** | **`seed` mutation**: `-` = delete dynamic; **fără tombstone**; `+`/`-` pe store mutabil |
| **D94** | **A** | Attribute **`data: overlay \| static \| seed`**; omit = overlay; invalid → elaboration error |

---

### D89 — **`data: static`** + `logic { }` **(confirmed: A — elaboration error)**

| Opțiune | Descriere |
|---------|-----------|
| **A — elaboration error (confirmed)** | Comp cu `data: static` + exec block conține `logic { … }` → **Error** la elaborare (ca query invalid) |
| **B — runtime no-op** | Pass rulează; `mutationFailed=1`; store neschimbat — **respins** |

**Motiv A:** fail-fast; comp read-only e explicit; fără logic-mut noise în trace.

**Decizie:** **A** — confirmat explicit (2026-08-20).

---

### D90 — **`seed`: ce se copiază la init **(confirmed: A)**

| Opțiune | Descriere |
|---------|-----------|
| **A — ground facts din merged (confirmed)** | `logicCollectStaticGroundFacts(merged.clauses)` → `dynamicStore.adds` — **tot** (include facts din `use`) |
| **B — doar facts din modul root program** | Exclude facts din module `use`-d — **respins** |

**Decizie:** **A** — copiem **tot** ground facts din merge (inclusiv `use`); confirmat explicit (2026-08-20).

---

### D91 — **`seed`: KB la solve/mutation **(confirmed: A)**

| Layer | `overlay` (F11) | `seed` (F17) |
|-------|-----------------|--------------|
| **Facts** | static ∖ tombstones ∪ dynamic | **doar dynamic** (post-seed + mutații) |
| **Rules / constraints** | din `merged.clauses` | din **`merged.clauses`** (read-only) |

**Implementare:** variantă `logicBuildRuntimeClauses(..., { dataMode: 'seed' })` sau echivalent — **fără** path static facts la runtime.

**Decizie:** **A**.

---

### D92 — **`seed`: constraints la init **(confirmed: A)**

După seed, rulează **`logicValidateStaticKnowledge`** (sau echivalent) pe clauses = rules + seeded facts — **elaboration error** dacă invalid (D52 init).

**Decizie:** **A**.

---

### D93 — **`seed`: semantica `-` / index **(confirmed: A)**

| | `overlay` | `seed` |
|---|-----------|--------|
| **`-`** | tombstone static sau delete dynamic | **delete** din `dynamicStore` (fără tombstone) |
| **`indexRebuild: delta`** | patch tombstone + adds | patch **add/remove** simplu pe dynamic |

Aliniat D44-A: `-` absent = success silent.

**Decizie:** **A**.

---

### D94 — Parse attribute **`data:`** **(confirmed: A)**

```logts
comp [logic] .whLogic:
    data: overlay    # default — omit = overlay (F11)
    data: static     # read-only — D89
    data: seed       # seed la init — D90–D93
```

| Valoare invalidă | Rezultat |
|------------------|----------|
| `data: copy` | **Error** — respins (D88) |
| alt string | **Error** elaboration |

**Decizie:** **A**.

---

### Implementare F17

| Layer | Fișier | Acțiune |
|-------|--------|---------|
| Parse | [`parser.js`](../v0_3_2/core/parser.js) / comp attrs | `data:` pe `comp [logic]` — D94 |
| Engine | [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `logicBuildRuntimeClauses` mode seed; seed init helper; static fără mutation path |
| Runtime | [`logic.js`](../v0_3_2/core/components/logic.js) | `dataMode` pe comp; seed la init; static → skip `_applyMutations` + D89 elaboration |
| Teste | [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3638+** — static query; static+logic error; seed init+solve; seed mutate; index delta seed |
| Doc | [`comp-logic.md`](../v0_3_2/doc/comp-logic.md), [`logic-runtime.md`](../v0_3_2/doc/logic-runtime.md) | secțiune **`data:`** (EN) |

### Criterii done

- [x] **D88–D94** confirmate + implementate
- [x] **`data: static`** — query/solve OK; `logic { }` → elaboration error (D89)
- [x] **`data: seed`** — seed init + constraints (D90–D92); mutate `-`/`+` (D93)
- [x] **`overlay`** implicit neschimbat (regresie zero)
- [x] Teste **3638–3650**; doc EN; suite verde (2812/2812)

**Backlog (nu F17):** **1+p**, **1+s**, **1+o** (persistență).

---

## Decizii Faza 18 — `query = …` explicit (D95–D99) **(1+l)**

> **Sursă:** D2 **A** livrat MVP (toate query-urile); D2-C / D19 amânat ca **1+l** — optimizare când inline are multe query-uri.  
> **Stare:** **D95–D99 confirmed** — F18 **(completed)**.

### Rezumat decizii F18

| ID | Decizie | Notă |
|----|---------|------|
| **D95** | **A** | **`query = name, …`** — subset; **omit** = toate; linie **`query none`** = zero query-uri (NU assignment) |
| **D96** | **A** | Redirect la query **neinclus** sau cu **`query none`** → **elaboration error** |
| **D97** | **A** | Nume **necunoscut**, listă **goală**, **`query none` + `query =`** în același block → **elaboration error** |
| **D98** | **A** | Scope **per exec block** |
| **D99** | **A** | **Duplicate** în listă → **elaboration error** (ex. `query 'a' duplicated`); ordinea exec = ordinea din listă |

---

### D95 — Sintaxă: omit / listă / zero query-uri **(confirmed: A — user 2026-08-20, rev. sintaxă `query none`)**

| Opțiune | Descriere |
|---------|-----------|
| **A — omit / `query =` / `query none` (confirmed)** | **Omit** → toate. **`query = a, b`** → subset (doar nume query). **`query none`** → zero query-uri — **linie standalone**, fără `=` |
| **B — infer din redirect** | Doar query-urile cu redirect — **respins** (D2-B) |

Trei moduri — **mutual exclusive** în același exec block:

| Sintaxă | Query-uri rulate |
|---------|------------------|
| *(omit)* | **Toate** din inline merged |
| `query = modifier, audit` | Doar **modifier**, **audit** (ordinea din listă) |
| **`query none`** | **Niciunul** — pass fără solve query |

**Zero query-uri — de ce nu `query = none`:** implică fals că poți scrie `query = none, modifier`. Respins.

**Sintaxă zero (confirmed):** linie **`query none`** — modifier după keyword **`query`**, **fără assignment**:

```logts
.whLogic:{
    query none
    logic { + inside(box2, c1) }
    mutationFailed >= failed
    set = trigger
}
```

| Formă | Status |
|-------|--------|
| **`query none`** | **confirmed** — zero query-uri |
| **`query none = …`** | **respins** — nu e assignment |
| **`query = none`** | **respins** — implică mix cu alte nume |

```logts
.characterLogic:{
    query = modifier, audit
    myX = scoreIn
    modifier:0 >= result
    set = trigger
}
```

**Decizie:** **A** — confirmat; zero query-uri via **`query none`** (rev. 2026-08-20).

---

### D96 — Redirect fără query în listă **(confirmed: A — user 2026-08-20)**

Exec block cu `query = audit` dar `modifier:0 >= result`:

| Opțiune | Descriere |
|---------|-----------|
| **A — elaboration error (confirmed)** | Orice redirect `logicQuery>` care citește un query **neinclus** în `query =` → **Error**. Cu linia **`query none`**, orice redirect query → **Error** |
| **B — auto-run la redirect** | Infer query din redirect — **respins** (D2-B) |
| **C — stale / zero** | Redirect citește slot neactualizat — **respins** (surpriză la runtime) |

**Motiv A:** fail-fast; lista explicită e contract complet; aliniat D89 (static + logic).

**Decizie:** **A** — confirmat explicit (2026-08-20).

---

### D97 — Nume invalid / listă goală **(confirmed: A — user 2026-08-20)**

| Caz | Rezultat |
|-----|----------|
| `query = unknownName` | **Error** — query inexistent în merged inline |
| `query =` (fără nume după `=`) | **Error** — listă goală; folosește **`query none`** |
| `query none` + `query = modifier` în același block | **Error** — mutual exclusive |
| `query none = …` | **Error** — nu e assignment |

**Decizie:** **A** — confirmat explicit (2026-08-20).

---

### D98 — Scope per exec block **(confirmed: A — user 2026-08-20)**

| Opțiune | Descriere |
|---------|-----------|
| **A — per exec block (confirmed)** | Fiecare property block `.logic:{ … }` are propria listă (sau omit → all). Blocuri diferite pe același comp pot filtra diferit |
| **B — per component global** | O singură listă pe comp — **respins** (prea rigid) |

**Decizie:** **A** — confirmat explicit (2026-08-20).

---

### D99 — Duplicate și ordine **(confirmed: A — user 2026-08-20)**

| Aspect | Comportament |
|--------|--------------|
| **Duplicate** | `query = a, b, a` → **elaboration error** — mesaj tip **`logic .comp: query 'a' duplicated`** (nu dedupe) |
| **Ordine** | Exec în ordinea din listă (nu ordinea din inline) |
| **Pout meta** | `truncated`, `depthExceeded`, `execCount`, `mutationFailed` — **neschimbate**; la **`query none`**, `truncated`/`depthExceeded` rămân **0** |

**Decizie:** **A** — confirmat explicit (2026-08-20).

---

### Implementare F18

| Layer | Fișier | Acțiune |
|-------|--------|---------|
| Parse | [`parser.js`](../v0_3_2/core/parser.js) | `query = name, …` și linie **`query none`** (fără `=`) în exec block |
| Runtime | [`logic.js`](../v0_3_2/core/components/logic.js) | Filtrare query set; flag `queryNone` per block; validare D96–D99 |
| Engine | [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `executeLogicQueries` — subset opțional sau skip all (`query none`) |
| Elaboration | [`interpreter.js`](../v0_3_2/core/interpreter.js) | Redirect vs listă (D96); `query none` + `query =` mutual exclusive (D97) |
| Teste | [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3651+** — omit=all; subset; **`query none`**; errors; legacy+wave |
| Doc | [`comp-logic.md`](../v0_3_2/doc/comp-logic.md) | **`query =`** + **`query none`** (EN) + `logts-play` |

### Criterii done

- [x] **D95–D99** confirmate + implementate
- [x] **`query =`** subset; **omit** = all; linie **`query none`** = zero
- [x] **`query none`** mutual exclusive cu **`query =`** (D97)
- [x] Redirect neinclus / cu `query none` → elaboration error (D96)
- [x] Nume invalid / listă goală / duplicate → elaboration error (D97, D99)
- [x] Per exec block (D98)
- [x] Teste **3651–3663** legacy + wave; doc EN; suite verde (2825/2825)

**Backlog (nu F18):** **1+p**, **1+s**, **1+o**, …

---

## Decizii Faza 19 — constraint-as-query helper (D100–D106) **(1+u)**

> **Sursă:** F12/F14 — constraints la init + commit; trace `rollback — constraint #K` (D72). **1+u** = helper scriptabil de debug, **nu** filter UI (D85), **nu** `mutationReason` (1+s).  
> **Stare:** **D100–D106 implemented** — F19 **complete** (2026-08-20).

### Rezumat decizii F19

| ID | Decizie | Notă |
|----|---------|------|
| **D100** | **A** | Metodă pe **`comp [logic]`** — `.whLogic:check({ … })` |
| **D101** | **A** | Simulare tranzacție `{ + / - }` pe KB curentă (D53) |
| **D102** | **A** | Sintaxă **`check({ + fact, - fact })`** — același parser ca `logic { }` |
| **D103** | **A** | Rezultat **boolean** 1/0 |
| **D104** | **A** | **Separate** de **1+p** |
| **D105** | **A** | **`data:`** comp-ului — același runtime KB ca solve; **`data: static` + ops** → **elaboration error** (ca D89 / `logic { }`) |
| **D106** | **A** | Bloc **gol** → **error**; **non-ground** (variabile) → **error**; **wire refs** ca `logic { }` pe **comp** |

### Problema

| Azi | Limită |
|-----|--------|
| Mutare cu `logic { + / - }` | Eșec → `mutationFailed=1` + trace L2 — trebuie **commit trial** |
| `.world:query({ … })` | Solve goals — **nu** validează constraints; KB **static** inline |
| `query` pe comp | Citește soluții — **nu** răspunde „ar trece tranzacția X constraints?” |

**Scop F19:** invoke **read-only** care rulează **aceeași validare** ca la mutation commit (D52–D54), pe **KB efectivă** a comp-ului, **fără** COMMIT / **fără** `mutationFailed`.

---
### D100 — Invoke pe **comp** vs **inline** **(confirmed: A — user 2026-08-20)**

| Opțiune | Descriere |
|---------|-----------|
| **A — comp `[logic]` (confirmed)** | `.whLogic:check({ … })` — vede **runtime KB** (overlay/seed/static per F17) |
| **B — inline `.world:check`** | Doar KB static merged — **respins** |
| **C — ambele** | Duplicare API — **respins** |

**Decizie:** **A**.

---

### D101 — Ce validează **check** **(confirmed: A — user 2026-08-20)**

| Opțiune | Descriere |
|---------|-----------|
| **A — tranzacție simulată (recommended)** | Args `{ + fact, - fact, … }` → build **proposed KB** (D53) → `validateConstraintsForFacts` pe delta+ — **fără** apply store |
| **B — un singur fact ground** | Doar `check({ inside(box2, c1) })` fără `-` — subset al A |
| **C — scan KB completă** | „E legală starea **acum**?” — suprapune **1+p**, nu helper tranzacție |

**Motiv A:** răspunde la „dacă aș face **acest** `logic { }`, trec constraints?” — workflow din D72 fără rollback real.

**Decizie:** **A**.

---

### D102 — Sintaxă **(confirmed: A — user 2026-08-20)**

Model: extinde pattern F9 **`inlineMethod`**, dar pe **GREF comp** (ca `getWire` / property), nu pe inline.

| Opțiune | Descriere |
|---------|-----------|
| **A — `check({ + / - })` (recommended)** | Paralel cu body `logic { }` — aceleași ops, același parser mutation |
| **B — `checkConstraint(inside/2, …)`** | API per constraint declarat — prea rigid |
| **C — `wouldMutate({ … })`** | Nume alternativ — prefer **`check`** (scurt, aliniat validare) |

Sketch:

```logts
16wire containerNameWire = "c2"

1wire ok = .whLogic:check({
    + inside(box1, text containerNameWire)
})

.whLogic:{
    logic { + inside(box2, c1) }
    set = trigger
}
; ok=1 → mutația ar trece; ok=0 → aceleași constraints ca rollback
```

**Decizie:** **A**.

---

### D103 — Tip rezultat **(confirmed: A — user 2026-08-20)**

| Opțiune | Descriere |
|---------|-----------|
| **A — boolean (recommended)** | `1wire ok = .whLogic:check({ … })` — **1** pass, **0** fail constraint; bloc gol / non-ground → **error** |
| **B — text cu mesaj `#K`** | `40wire msg = .whLogic:checkMsg({ … })` — duplică trace |
| **C — structurat pe wire lat** | Prea greu pentru v1 |

**Motiv A:** ca `.world:query` boolean; motiv eșec → Signal Trace / viitor **1+s** (`mutationReason`), nu F19.

**Follow-up opțional (nu F19):** metodă **`checkDetail`** — doar dacă user cere explicit.

**Decizie:** **A**.

---

### D104 — **1+p** vs **1+u** **(confirmed: A — user 2026-08-20)**

| Item | Focus |
|------|--------|
| **1+u (F19)** | **Simulare** tranzacție `{ ± }` — „ar trece **dacă** aș muta?” |
| **1+p (backlog)** | Validare **stare curentă** la query pass / flag opt-in — „**e** legal acum?” |

| Opțiune | Descriere |
|---------|-----------|
| **A — separate (recommended)** | F19 livrează **check**; **1+p** rămâne backlog distinct |
| **B — merge în F19** | `check({})` fără ops = legalitate KB curentă — conflă cu D106 |

**Decizie:** **A** — separate.

---

### D105 — **`data:` modes** **(confirmed: A — user 2026-08-20)**

| Mode | **check** folosește |
|------|---------------------|
| **overlay** | static ∖ tombstones ∪ dynamic + ops simulate |
| **seed** | dynamic + ops |
| **static** | static clauses + ops **respins**? (static fără mutații) |

| Opțiune | Descriere |
|---------|-----------|
| **A — same runtime KB as solve (recommended)** | `logicBuildRuntimeClauses` + store simulate — identic mutation path |
| **B — check ignoră data:** | Surpriză — **respins** |

| **static** | **`check({ + / - })`** → **elaboration error** — **aceeași eroare** ca `logic { }` în exec (D89) |

**Decizie:** **A** — `check` folosește **`data:`** declarat pe comp; overlay/seed ca la solve.

---

### D106 — Ops, ground, wire refs **(confirmed: A — rev. user 2026-08-20)**

| Caz | Rezultat **`check`** |
|-----|----------------------|
| **`check({})` gol** — zero ops | **Error** — „check requires at least one op” (nu returna **1**) |
| **`+ inside(box1, X)`** — variabilă Prolog | **Error** — non-ground fact (nu boolean **0**) |
| **`+ inside(box2, text containerNameWire)`** | **OK** — wire ref; rezolvat la eval ca în `logic { }` → apoi validate |
| **`+ inside(box2, ghost)`** + constraint fail | **`0`** — boolean fail (constraints), nu throw |
| zero constraints în inline | **`1`** — pass trivial |

#### Invoke pe **comp**, nu pe **inline**

**D100:** API-ul e pe **`comp [logic]`**, **nu** `.world:check`:

```logts
; CORECT — vede runtime KB (overlay/seed)
1wire ok = .whLogic:check({
    + inside(box1, text containerNameWire)
})

; GREȘIT — .world e inline [logic]; query/check pe inline = static only (F9)
; 1wire ok = .world:check({ ... })
```

**Wire refs** (`text w`, `number w`, `bool w`, bare id = atom): **identic** cu `logic { }` — la eval se citește wire-ul, fact devine **ground**, apoi rulează validarea constraints.

#### Ce înseamnă **fact non-ground**

Un fact **ground** = complet instanțiat, **fără variabile Prolog**:

| Fact | Ground? |
|------|---------|
| `inside(box1, c1)` | **Da** |
| `inside(box1, X)` | **Nu** — `X` variabilă → **Error** la `check` |
| `inside(box1, text w)` | **Da** după resolve wire → ex. `inside(box1, "c2")` |

**Non-ground ≠ wire ref.** Test **3562**: `logic { + inside(box1, X) }` → `mutationFailed=1`; la **`check`** același caz → **Error** (fail-fast la eval).

**Decizie:** **A** — rev. user: bloc gol + non-ground = **error**; constraint fail = boolean **0**; wire refs pe **`.whLogic:check`**.

---

### Implementare F19

| Layer | Fișier | Acțiune |
|-------|--------|---------|
| Parse | [`parser.js`](../v0_3_2/core/parser.js) | `.comp:check({ + / - })` — reuse mutation op parse |
| Engine | [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | `logicSimulateCheckTransaction(compKB, ops, constraints, opts)` |
| Runtime | [`logic.js`](../v0_3_2/core/components/logic.js) + [`interpreter.js`](../v0_3_2/core/interpreter.js) | `evalLogicCompCheck` — effective KB + simulate |
| Teste | [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3664+** — pass/fail; fail=#K; static error; legacy+wave |
| Doc | [`logic-constraints.md`](../v0_3_2/doc/logic-constraints.md), [`comp-logic.md`](../v0_3_2/doc/comp-logic.md) | secțiune **check** + `logts-play` |

### Criterii done

- [x] **D100–D106** confirmate + implementate
- [x] **`.whLogic:check({ ± })`** — read-only; același validator ca commit
- [x] Rezultat boolean la constraint fail; **error** la `{}` gol sau fact non-ground
- [x] **Nu** modifică store; **nu** setează `mutationFailed`
- [x] `data: static` + check cu ops → error (D105)
- [x] Teste **3664–3677** — pass, fail **0**, empty→error, non-ground→error, wire ref, static error; legacy + wave; doc EN; suite verde (**2839/2839**)

**Backlog (nu F19):** **1+p**, **1+s**, **1+o**, …

---

## Decizii Faza 20a — `use .mod as alias` (prefixed import) **(D107–D116)**

> **Sursă:** organizare KB la scară mare — izolare la import fără merge plat; extinde F15.  
> **Stare:** **D107–D116 implemented** — F20a **complete** (2026-08-21).  
> **F20b** (blocuri nested `a { b { } }`) — **amânat**.

### Rezumat decizii F20a

| ID | Decizie | Notă |
|----|---------|------|
| **D107** | **A** | Syntax **`use [once] .mod as alias`** — un singur keyword `use` |
| **D108** | **A** | Prefix **predicate** (facts, rules, constraints importate); **nu** atomii argument |
| **D109** | **A** | Rezolvă modul importat complet (inclusiv `use … as` interne), **apoi** prefix `alias.` la graniță; prefixe **stivuite** |
| **D110** | **A rev.** | **`alias.predicatePath(args)`** — un alias local + cale predicate (poate conține `.` din importuri imbricate); nu scope F20b |
| **D111** | **A** | **O singură** importare per `.mod` per rezolvare — a doua linie nu adaugă alt prefix |
| **D112** | **A** | Mix permis: `use .shared` (plat) + `use .veh as veh` (module diferite) |
| **D113** | **A** | Alias unic per modul; **duplicate `as c`** (module diferite) → elaboration error |
| **D114** | **A** | Mutations / `check` / `.world:query` — aceleași predicate calificate |
| **D115** | **A** | **`use once … as`** — skip F15; **nu** re-prefix cu al doilea alias (vezi D111) |
| **D116** | **A** | **`use .mod`** fără `as` neschimbat; F20a opt-in; fără breaking |

### D107 — Syntax **(confirmed: A — user 2026-08-20)**

```logts
use .vehicles as veh
use once .vehicles as veh
```

| Form | Comportament |
|------|--------------|
| **`use .mod`** | Neschimbat (F15) — merge **plat** |
| **`use .mod as alias`** | Import **cu prefix** — predicate importate devin **`alias.predicate/arity`** |
| **`use once .mod as alias`** | F15 skip + prefix la primul merge |

**Respinge:** keyword `import`; `use as alias .mod` (ordine inversă).

---

### D108 — Ce se prefixează **(confirmed: A — user 2026-08-20)**

| Prefixat | Neprefixat |
|----------|------------|
| Predicate în facts / rules / constraints din modul importat (după D109) | Atomii din argumente (`box1`, `car`, `john`) |
| Constraint head + body din import | **Queries** — rămân neimportate (ca F15) |

```logts
; .vehicles: wheeled(car)
; .world:
use .vehicles as veh
query hasCar:
    veh.wheeled(car)     ; OK
; wheeled(car)           ; FAIL — nu există unprefixed din import
```

---

### D109 — Momentul prefixării + lanț `as` imbricat **(confirmed: A — user 2026-08-20; rev. lanț 2026-08-21)**

1. **`logicResolveMerged(.mod)`** — rezolvare completă a modulului importat (inclusiv `use` / `use once` **și** `use … as` **interne**).
2. Prefix **`alias.`** pe **toate** clauzele + constraints rezultate (inclusiv predicate deja prefixate în submodule).
3. Concat la modulul curent. Clauze **proprii** ale modulului curent — fără prefix.

**Prefixe stivuite (flatten la merge):** fiecare graniță `as` **prepend** un segment; nu e scope live imbricat (F20b), ci **nume predicate compus**:

| Modul | După rezolvare |
|-------|----------------|
| `.vehConstr` | `carWheel/2`, … |
| `.veh` + `use .vehConstr as c` | **`c.carWheel/2`**, `car/1`, … |
| `.world` + `use .veh as v` | **`v.c.carWheel/2`**, **`v.car/1`**, … |

**Nu** re-prefixăm clauzele **proprii** ale submodulelor la export — doar clauzele **returnate** de `logicResolveMerged(child)` primesc `alias.` la granița părintelui.

---

### D111 + D115 — O modul, un prefix; `use once` + al doilea `as` **(confirmed — user 2026-08-20)**

**Regulă:** per rezolvare, `.mod` contribuie **cel mult o dată** (F15 `merged`). Al doilea `use` / `use once` spre același `.mod` **nu** aplică un al doilea alias.

| Linii | Rezultat |
|-------|----------|
| `use once .veh as v` apoi `use once .veh as w` | Primul: merge cu **`v.`**; al doilea: **skip** (F78) — **fără** `w.` |
| `veh.wheeled(car)` / `v.car()` | **OK** (predicate prefixate `v.`) |
| `w.car()` | **FAIL** — `w.*` nu există |
| `use .veh as v` apoi `use .veh as w` (strict) | **Error** D80 — reuse strict |

```logts
inline [logic] .veh:
    car(toyota)
:

inline [logic] .world:
    use once .veh as v
    use once .veh as w

    query q1:
        v.car(X)          ; OK

    query q2:
        w.car(X)          ; FAIL — w nu a fost prefixat
:
```

**Strict vs once:** același `.mod` nu poate primi **două prefixe diferite**; `use once` face al doilea rând **silent skip**, nu re-import.

---

### D110 — Referințe calificate + predicate cu puncte **(confirmed: A rev. — user 2026-08-21)**

**Revizie față de draft „un singur dot”:** lanțurile `use … as` produc predicate **`v.c.carWheel`**, nu doar `veh.wheeled`.

| Regulă | Detaliu |
|--------|---------|
| **Formă apel** | **`alias.predicatePath(args)`** |
| **`alias`** | Singurul alias declarat în modulul **curent** (`use … as alias`) |
| **`predicatePath`** | Restul numelui predicate — **poate conține `.`** (segmente din importuri ancestrale) |
| **Necalificat** | Doar predicate **locale** modul curent (fără prefix din import) |

**Nu** e path relativ F20b: `c` din `v.c.carWheel` **nu** e alias în `.world` — e parte din numele flatten-uit `v.c.carWheel/2`.

| Modul | Apel valid |
|-------|------------|
| `.vehConstr` | `carWheel(toyota, 2)` |
| `.veh` (are `use .vehConstr as c`) | `c.carWheel(toyota, 2)` — **nu** `carWheel` unprefixed din constr |
| `.world` (are `use .veh as v`) | `v.c.carWheel(toyota, 2)`, `v.car(toyota)` — **nu** `c.carWheel` (c nu e alias aici) |

**Parser:** primul segment înainte de `.` = alias (dacă există `use … as`); restul = predicate path atom (un singur nume predicate cu puncte interne).

**Distinct F20b:** F20b ar adăuga scope **sintactic** în același fișier (`warehouse { inside(...) }` relativ); F20a doar **nume compuse** din lanț de importuri.

#### Exemplu țintă — lanț `.vehConstr → .veh → .world`

```logts
inline [logic] .vehConstr:

    carWheel(X, Y) <- wheel(X), axle(Y)

    constraint carWheel(X, Y) <= wheel(X), axle(Y)

:

inline [logic] .veh:

    use once .vehConstr as c

    car(toyota)

:

inline [logic] .world:

    use once .veh as v

    query wheelOk:
        v.c.carWheel(toyota, 2)

:
```

După merge în `.world`: KB conține `v.car/1`, `v.c.carWheel/2` (+ constraints prefixate la fel). **`v.c.carWheel(toyota, 2)`** — OK.

---

### D112 — Mix plat + prefixed **(confirmed: A — implicit F20a)**

```logts
use .shared           ; plat — predicate globale
use .vehicles as veh  ; izolat sub veh.*
```

Interzis: `use .vehicles` + `use .vehicles as veh` (a doua = reuse / conflict F15).

---

### D113 — Alias unic per modul **(confirmed: A — rev. user 2026-08-21)**

| Regulă | Detaliu |
|--------|---------|
| **Formă alias** | Atom lowercase (`veh`, `c`, `wh`) — fără `.` |
| **Un alias = o singură linie `use … as`** | Același alias pe **module diferite** → **elaboration error** |
| **Alias necunoscut** în goal → elaboration / resolve error |
| **Conflict cu predicate local** | Dacă modulul curent definește deja predicate care ar coliziona cu prefixul alias (implementare: alias rezervat la primul `as`) |

**Alias already used** — indiferent de modul țintă:

```logts
inline [logic] .world:

    use once .veh as c
    use once .vehConstr as c    ; ERROR — alias 'c' already used

    query bad:
        c.car(toyota)            ; ambiguu / invalid — nu se ajunge aici
:
```

| Linii | Rezultat |
|-------|----------|
| `use once .veh as c` | OK — prefix **`c.*`** din `.veh` |
| `use once .vehConstr as c` | **Error** — `c` deja legat de primul import |
| Remediere | Alias diferit: `use once .vehConstr as vc` → apel **`vc.carWheel(...)`** |

**Mesaj (sketch):** `logic program line N: alias 'c' already used (first use line M)`.

**Distinct D111:** D111 = același **modul** (`.veh`) importat de două ori; D113 = același **alias** pe **module diferite**.

```logts
; D111 — același modul, alias diferit sau același (a doua linie skip/error pe .veh)
use once .veh as v
use once .veh as w          ; skip (once) sau error (strict) — nu e conflict de alias

; D113 — module diferite, același alias
use once .veh as c
use once .vehConstr as c    ; ERROR alias deja folosit
```

---

### D114 — Runtime **(confirmed: A — implicit F20a)**

```logts
logic { + veh.inside(box2, c1) }
.whLogic:check({ + veh.inside(box2, text w) })
1wire ok = .world:query({ veh.wheeled(X) })
```

---

### D116 — Compatibilitate **(confirmed: A)**

- **`use .mod`** fără `as` = comportament F15 neschimbat.
- Inline/comp logic **pre-producție** — F20a opt-in.

---

### Implementare F20a (plan)

| Layer | Fișier | Acțiune |
|-------|--------|---------|
| Parse | [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | `use [once] .mod as alias`; `alias.predicate` în compound |
| Merge | `logicResolveMerged` | branch `as` → resolve child → prefix predicates |
| Engine | [`logic-engine.js`](../v0_3_2/core/logic-engine.js) | predicate `veh.wheeled` în atom table (dacă e nevoie) |
| Teste | [`test_suite.js`](../v0_3_2/tests/test_suite.js) | **3678+** — prefix OK, unprefixed fail, **lanț v.c.**, duplicate alias, mix plat+as, use once double-as, … |
| Doc | [`inline-logic.md`](../v0_3_2/doc/inline-logic.md) | secțiune **`use … as`** + logts-play |

### Criterii done F20a

- [x] **D107–D116** implementate
- [x] **`use .mod as alias`** — prefix la graniță; lanț imbricat → `v.c.predicate`; **`use .mod`** neschimbat
- [x] Duplicate alias → elaboration error (D113)
- [x] **`use once .mod as v`** + **`use once .mod as w`** (același modul) → doar **`v.*`** (D111)
- [x] Teste **3678–3687** — incl. lanț `v.c.carWheel`, duplicate alias; legacy + wave; doc EN; suite verde (**2849/2849**)

**Amânat (F20b):** blocuri nested `warehouse { … }`, path relativ în bloc.

**Amânat (F20c — scope la extindere):** reguli noi sub prefix importat + rezolvare relativă în body — vezi mai jos.

---

### F20c (backlog) — reguli calificate + scope relativ în body **(nu F20a)**

> **Întrebare user 2026-08-21:** în `.world`, după `use .veh as v`, poate exista:
>
> ```logts
> v.c.carSize(X, Y) <- \+ carWheel(X, Y), ...
> ```
>
> Două idei: (1) **definire** predicate noi sub `v.c.`; (2) în body, **`carWheel`** rezolvat relativ la scope-ul `v.c` (fără prefix complet).

**Verdict:** **prea complex pentru F20a** — amânăm ca **F20c** (sau subset în F20b dacă blocurile nested acoperă același caz).

| Idee | Ce înseamnă | F20a |
|------|-------------|------|
| **A — Apel calificat** | `v.c.carWheel(X, Y)` în query/fact | **Da** |
| **B — Regulă cu head calificat** | `v.c.carSize(X, Y) <- …` definită în `.world` | **Nu** — backlog |
| **C — Body relativ la prefix** | în regula de mai sus, `carWheel` → `v.c.carWheel` automat | **Nu** — backlog |

#### Opțiuni (când implementăm F20c / F20b)

| Opțiune | Descriere | Pro / contra |
|---------|-----------|--------------|
| **1 — Full qualify în F20a (recommended acum)** | Reguli **locale** doar unprefixed; body cu prefix complet: `carSize(X,Y) <- \+ v.c.carWheel(X,Y)` | Simplu, zero scope magic; verbos |
| **2 — Head calificat, body tot explicit** | Permite `v.c.carSize <- …` dar body tot `v.c.carWheel` | Organizare fără scope relativ; medium |
| **3 — Scope relativ (propunerea ta)** | Head `v.c.carSize`, body `carWheel` → `v.c.carWheel` | Ergonomic; necesită context scope la parse/eval; confuzii cross-alias |
| **4 — Extinde în modul sursă** | `carSize` definit în `.vehConstr` sau `.veh`, nu în `.world` | Prolog-clasic; fără syntax nou |
| **5 — F20b block** | `v.c { carSize(X,Y) <- \+ carWheel(X,Y) }` | Scope vizual; o faza dedicată |

**Recomandare F20a:** doar **opțiunea 1**. Exemplu acceptat în `.world`:

```logts
inline [logic] .world:
    use once .veh as v

    ; regulă locală — head necalificat
    carSize(X, Y) <- \+ v.c.carWheel(X, Y), ...

    query ok:
        carSize(toyota, 2)
```

Sau mută `carSize` în `.veh` / `.vehConstr` dacă aparține domeniului vehicul.

**Decizie F20c (draft, neconfirmată):** TBD — B+C vs F20b block vs respinge head calificat.

---

## Exemplu țintă complet (sketch v2, D1 completed)

```logts
inline [logic] .people:

    owns(john, chevy)
    owns(john, ford)
    owns(mary, bike)

    query isJohnOwner:
        owns(john, _)

    query johnOwns:
        owns(john, X)

:

inline [logic] .character:

    modifier2(1, -4)
    modifier2(X,  0) <- X >= 9,  X =< 12
    modifier2(X,  2) <- X >= 15, X =< 16

    query modifier:
        modifier2(X, Y)

:

comp [logic] .characterLogic:
    on: raise

    .character {
        X is number myX
    }

:

comp [logic] .peopleLogic:
    on: raise

    .people {
    }

:

8wire scoreIn = \15
8wire result = \0
8wire firstCar = \0
1wire trigger = 0

.characterLogic:{
    myX = scoreIn
    modifier:0 >= result
    set = trigger
}

.peopleLogic:{
    johnOwns:0 >= firstCar
    set = trigger
}
```

---

## Decizii Faza 21 — builtin `show/N` (D117–D127) **(completed)**

> **Scop:** predicat builtin **`show(T1, …, TN)`** în motorul logic — output termeni Prolog-style; distinct de statement-ul logTscript **`show(wire)`**.

| ID | Decizie |
|----|---------|
| **D117** | **`show/N`** rezervat, **N ≥ 1** |
| **D118** | Întotdeauna reușește (side-effect) |
| **D119** | Format Prolog; fără tag-uri wire |
| **D120** | Print la fiecare succes pe ramură (backtracking Prolog) |
| **D121** | Query, reguli, constraints, **`.world:query`** |
| **D122** | Output → **`interp.out`** via `onShowLine` |
| **D123** | Head user `show(...)` → eroare reserved |
| **D124** | Max **32** args; peste → parse error |
| **D125** | **`show/0`** → parse error |
| **D126** | Compound / atom / number / var ca args |
| **D127** | String literals **`"..."`** în termeni logic |

**Fișiere:** `logic-assembler.js`, `logic-engine.js`, `logic.js`, `interpreter.js`  
**Teste:** **3688–3698** legacy+wave  
**Doc:** `inline-logic.md`, `logic-indexing.md`

---

## Comparație sketch v1 → v2 ( ce s-a schimbat )

| Topic | Sketch v1 | Sketch v2 (current) |
|-------|-----------|---------------------|
| Runtime | Inline-native `.people:…` | **`comp [logic]`** |
| Exec block | `.people:{ set }` | **`.characterLogic:{ set }`** |
| Results | POUT `.people:johnOwns:0` | **`johnOwns:0 >= wire`** în exec block |
| Inputs | `X = age` direct | **Program:** `X is number myX`; **Exec:** `myX = scoreIn` (pin ← wire) |
| Constants | Numeric IDs `owns(1,10)` | **Simboluri** `owns(john, chevy)` |
| Comparisons | `GE(A, 18)` LogTScript | **`X >= 9`, `X =< 12`** logic syntax |
| Composition | — | **`use .vehicles`** / **`use once .vehicles`** (F15) |
| Analogie | — | **ASM-like**, not protocol |

---

## Riscuri / neclarități rămase

Rezumat rapid — detaliu complet în [Backlog post-MVP](#backlog-post-mvp):

| Topic | ID backlog |
|-------|------------|
| Fazele 0–17 | **(completed)** |
| **Faza 18** `query = …` explicit | **1+l** **(completed)** |
| **Faza 19** constraint-as-query helper | **1+u** **(completed)** |
| **Faza 20a** `use .mod as alias` | **(completed)** — D107–D116 |
| **Faza 21** builtin `show/N` | **(completed)** — D117–D127 |
| **Faza 20b** scope blocks | **(deferred)** |
| **`use` / `use once`** | **Faza 15** **(completed)** |
| Constraint `#K (line L)` trace | **1+v** **(pause)** |
| POUT declarate comp | **1+k** |
| Persistență KB | **1+o** |
| Validare constraints la query | **1+p** |
| `mutationReason` text pout | **1+s** |

---

## Ordine recomandată

1. ~~Faza 0~~ → ~~Faza 21~~ **(completed)**
2. Apoi backlog: **1+p**, **1+s**, **1+o**, …
3. **F20b** scope blocks — când e nevoie

---

## Backlog post-MVP

Tabel master **1+a … 1+v**. **Stare:** ✅ promovat/livrat · ❌ respins · 🟠✗ închis (alt mecanism) · ⏳ deschis · ⏸ pause.

| Stare | ID | Subiect | Detaliu | Legat de |
|-------|-----|---------|---------|----------|
| ❌ | **1+a** | Inline-native (sketch v1) | `.people:johnOwns:0` direct pe inline, fără comp — **respins** (D1) | D1 |
| ✅ | ~~**1+b**~~ | Result policies | **Promovat → Faza 10** (`;unique`, `first`, `last`, `;all`) | D10, D12a |
| ✅ | ~~**1+c**~~ | Negation | **Promovat → Faza 7** (`\+ goal`) | D5, D20–D24 |
| ✅ | ~~**1+d**~~ | Recursivitate + depth limit | **Promovat → Faza 8** (D25–D29) | D5 |
| ✅ | ~~**1+e**~~ | Facts dinamice runtime | **Promovat → Faza 11** — `logic { + / - }`, `mutationFailed` | D40–D49 |
| ✅ | ~~**1+f**~~ | Multi-var vague | **Mutat în Faza 5** — redirect matrix/vector | D12 |
| ✅ | ~~**1+g**~~ | **`use` / `use once`** | **Promovat → Faza 15** — strict vs modifier **`once`** (D77–D81) | D16 |
| ✅ | ~~**1+h**~~ | Invoke `.world:query({ goal })` | **Promovat → Faza 9** (D30–D32) | D12, D30–D32 |
| ⏳ | **1+i** | Cut | Prolog cut — interacție NAF / depth | D5 |
| ⏳ | **1+j** | Integrare PHZ | | |
| ⏳ | **1+k** | POUT declarate pe comp (D7-B) | Low priority — probe/debug | D7 |
| ✅ | ~~**1+l**~~ | **`query = …` explicit** | **Promovat → Faza 18** — D95–D99 **(completed)** | D2, D19 |
| ❌ | ~~**1+m**~~ | Inline mutation invoke | **Respins** — `.world:mutate` pe inline **nu**; mutația rămâne în **`comp [logic]`** (`logic { ± }`, index, constraints) | D49 |
| 🟠✗ | ~~**1+n**~~ | `assert` / `retract` în body reguli | **Închis** — nu Prolog în `<-`; livrat ca **`logic { + / - }`** în exec comp (F11) | D40 |
| ⏳ | **1+o** | Persistență dynamic facts | retain / save-load între sesiuni; snapshot KB | D48 |
| ⏳ | **1+p** | Validare constrângeri la query | read-only „is state legal?” fără mutație | D53 |
| ✅ | ~~**1+q**~~ | Index pe dynamic facts | **Promovat → Faza 13** — index facts, `count/2`, perf constraints | D60–D68 |
| ✅ | ~~**1+r**~~ | **`comp [logic] data:`** | **Promovat → Faza 17** — static + seed; ~~copy~~ D88 | D41, D88–D94 |
| ✅ | ~~**1+…**~~ | Mutation Signal Trace | **Promovat → Faza 14** — `logic-mut` | D69–D76 |
| ⏳ | **1+s** | `mutationReason` text pout | Motiv scriptabil pe wire; F14 livrează trace `logic-mut` | F14 |
| ✅ | ~~**1+t**~~ | Filter **Logic** Signal Trace | **Promovat → Faza 16** — D82–D85 **(completed)** | F14, D82–D85 |
| ✅ | ~~**1+u**~~ | **Constraint-as-query helper** | **Promovat → Faza 19** — D100–D106 **(ready-to-implement)** | F12, F14 |
| ⏸ | **1+v** | Constraint trace `#K (line L)` | **Pause** — nu se promovează fază; D72-A (`#K`) e suficient acum | F14, D72-B |

### Note backlog — explicații

#### **1+a** ❌ — respins (inline-native)

Query/redirect direct pe inline fără `comp [logic]` — **respins** (D1). Model ASM-like: inline = definiție, comp = runtime.

#### ~~**1+g**~~ → **Faza 15**

- **`use .mod`** — strict → mesaj unic **`Cannot reuse inline logic .mod`** + lanț; highlight linia `use` care a eșuat.
- **`use once .mod`** — skip idempotent.
- Implementare în **`logicResolveMerged`**; teste **3620+**; doc **`inline-logic.md`**.

#### ~~**1+m**~~ ❌ — respins (mutație doar pe comp)

**Respins:** invoke inline `.warehouse:mutate({ … })` — inline rămâne **definiție** (facts/rules/queries), fără engine de mutație. Runtime: **`comp [logic]`** — `logic { + / - }`, overlay/tombstone, constraints, `indexFacts`, Signal Trace. Analogie ASM: inline = ISA, comp = execuție.

#### ~~**1+n**~~ 🟠✗ — închis (livrat ca `logic { ± }`)

**Nu** `assert`/`retract` în body de regulă (side-effects în backtracking). Livrat **Faza 11:** mutație tranzacțională în exec block comp — același rol practic, model ASM-like.

#### ~~**1+e**~~ → **Faza 11**

Sketch: **[`logic_runtime_mutation_n_constraint`](../my_ideas/logic_runtime_mutation_n_constraint)** — **`logic { + fact - fact }`** în exec block. Vezi **Faza 11**.

#### ~~**1+h**~~ → **Faza 9**

Decizii **D30–D32** — vezi **Faza 9**.

#### ~~**1+q**~~ → **Faza 13**

Index facts, **`count/2`**, `indexFacts` / `indexRebuild` — vezi **Faza 13**.

#### ~~**logic-mut trace**~~ → **Faza 14**

Signal Trace **`logic-mut`** (try / commit / rollback) — vezi **Faza 14** + [`signal-trace.md`](../v0_3_2/doc/signal-trace.md).

#### ~~**1+t**~~ → **Faza 16**

Filter toolbar **Logic** dedicat — **`logic-mut` exclusiv** (D82–D85): scoase din Wires/Components; `traceCategory: 'logic'`. Vezi **Faza 16**.

#### ~~**1+r**~~ → **Faza 17**

**Scope:** **`data: static`** + **`data: seed`**; ~~**copy**~~ respins (D88). Decizii **D89–D94** — vezi **Faza 17**.

#### ~~**1+l**~~ → **Faza 18**

**Scope:** **`query = name, …`** subset; linie **`query none`** zero query-uri; **omit** = all. Decizii **D95–D99** — vezi **Faza 18**.

#### ~~**1+u**~~ → **Faza 19**

**Scope:** **`.whLogic:check({ + / - })`** — simulare read-only constraints (debug fără COMMIT). Decizii **D100–D106** — vezi **Faza 19**. Distinct de **1+p** (validare stare curentă la query).

#### **1+v** ⏸ — pause

Ideea D72-B (`#K (line L)` în rollback) rămâne în backlog; **nu** se promovează fază — ordinal **`#K`** (F14) e suficient deocamdata.
