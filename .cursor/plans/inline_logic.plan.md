---
name: inline logic engine
overview: "Plan pentru `inline [logic]` + `comp [logic]` — motor relațional declarativ, model ASM-like. MVP implementat (Fazele 0–4, 6). Rămâne Faza 5 (matrix/vector redirect)."
todos:
  - id: logic-decisions
    content: "Decizii D1–D19 closed (D12: amânat 1+f; D19/1+l amânat)"
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
    status: pending
  - id: logic-allow-notallow
    content: "Faza 6: inline.type{logic} + comp.type{logic} — Allow/NotAllow, doc, teste policy"
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
| **Amânat** | **C** — listă explicită `query = modifier, johnOwns` — vezi **1+l** (Faza post-MVP) |
| **Motiv user** | MVP simplu; când multe query-uri încetinesc exec-ul, specificarea explicită **nu e redundantă** — e optimizare intenționată, nu duplicare inutilă a redirect-urilor `modifier:0 >=` |

**MVP:**

```logts
; inline declară: query modifier, query backup, query audit, …
.characterLogic:{ myX = scoreIn, modifier:0 >= result, set = trigger }
; → toate query-urile se rezolvă; exec block citește doar modifier:0
```

**Faza amânată (1+l / D2-C):**

```logts
.characterLogic:{
    query = modifier
    myX = scoreIn
    modifier:0 >= result
    set = 1
}
; → doar query modifier — mai rapid când inline are multe query-uri
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
| **D19** | **amânat** | `query = …` → **1+l** (cu D2-C) |

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

> **D1–D19 closed** (D12/D19/1+l/1+k amânate). **D12a + D12b closed** (fill/truncate/count + ASCII encoding F5). **Fazele 0–4, 6 implementate.** Faza 5 rămâne de implementat.

| ID | Subiect | Decizia ta |
|----|---------|------------|
| **D1** | Model runtime | **Two-layer ASM** **(completed)** |
| **D2** | Query-uri la `set = 1` | **A** MVP; **C** → 1+l **(completed)** |
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
| **D19** | `query = …` | **amânat 1+l** |

---

## Decizii de luat — detaliu per ID

### D2 — Ce query-uri rulează la `set = 1` **(completed: A MVP; C amânat 1+l)**

**Decizie luată:** MVP = **A**. Post-MVP = **C** (query explicit), nu **B** (infer din redirect).

| Opțiune | Status | Pe scurt |
|---------|--------|----------|
| **A** | **MVP (completed)** | Toate query-urile din definiție |
| **B** | respins / nefolosit | Doar query-uri referite în `modifier:N >=` |
| **C** | **amânat 1+l** | Listă explicită `query = modifier, johnOwns` |

#### A — Toate query-urile (MVP)

La fiecare exec, rezolvă **fiecare** `query name:` din inline. Rezultatele în slot-uri interne; exec block citește ce redirecționează.

- **Pro:** simplu, predictibil, toate slot-urile fresh.
- **Contra:** cost când sunt multe query-uri — motiv pentru **C** amânat.

#### C — Explicit `query = …` (Faza post-MVP, **1+l**)

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

**Lint:** `use` circular → eroare elaborare (**1+g** pentru detectare avansată).

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

### D19 — `query = …` în exec block **(amânat — același scope ca D2-C / 1+l)**

Legat de **D2 completed**: MVP folosește **A** (toate query-urile). **D19 = C** amânat ca **1+l**.

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
| **A/C amânat** | **1+l** — post-MVP optimizare |
| **B** | respins — obligatoriu prea strict |

---

## Amânate (post-MVP)

| ID | Subiect | Detaliu | Legat de |
|----|---------|---------|----------|
| **1+a** | Inline-native (sketch v1) | `.people:johnOwns:0` direct pe inline, fără comp | D1 respins |
| **1+b** | Result policies | `;all`, `;unique`, `first`, `last` | D10 |
| **1+c** | Negation | `\+ goal` | D5 |
| **1+d** | Recursivitate + depth limit | | D5 |
| **1+e** | Facts dinamice runtime | assert/retract | |
| **1+f** | ~~Multi-var vague~~ | **Mutat în Faza 5** — redirect matrix/vector | D12 |
| **1+g** | `use` nested profund / circular deps | lint la elaborare | D16 |
| **1+h** | Invoke `.world:available(...)` | pattern inlineMethod | |
| **1+i** | Cut | | D5 |
| **1+j** | Integrare PHZ | | |
| **1+k** | POUT declarate pe comp (D7-B) | Low priority — user: „nu prea il vad ca va fi facut”; probe/debug | D7 |
| **1+l** | **`query = …` explicit** (D2-C) | Optimizare când A (toate query-urile) e prea lent; **nu redundant** cu redirect | D2 |

---

## Mapare decizii → faze

| Fază | Decizii | Status |
|------|---------|--------|
| **Faza 0** | D1–D19 **(completed)**; D12/D19 amânate | **(completed)** |
| **Faza 1** parse inline | D8, D9, D12, D16, D18 | **(completed)** |
| **Faza 2** engine | D5, D6, D15, D17 | **(completed)** |
| **Faza 3** comp runtime | D2–D4, D7, D11, D13, D14 | **(completed)** |
| **Faza 4** docs/tests | — | **(completed)** |
| **Faza 5** matrix/vector output | 2 vars max, redirect ca [`wire-vectors.md`](../v0_3_2/doc/wire-vectors.md) | **(pending)** |
| **Faza 6** Allow/NotAllow | `inline.type{logic}`, `comp.type{logic}` | **(completed)** |

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
| **5** | — neimplementat |

**Teste:** 2669/2669 trec (inclusiv grupul `logic` + `allow-notallow`).

**Notă:** `logic-comp-bind.js` planificat separat → integrat în `logic-assembler.js` (`parseLogicProgramBlock`) + `components/logic.js`.

---

### Faza 0 — Spec **(completed)**

Toate deciziile D1–D19 confirmate. **Faza 5** (D12 + **D12a**) definită. Amânate: **1+l**, **1+k**, **1+b** opțional.

---

### Faza 1 — `inline [logic]` parse + registry **(completed)**

| Fișier | Rol |
|--------|-----|
| [`logic-assembler.js`](../v0_3_2/core/logic-assembler.js) | **Parser principal inline:** facts, relations, queries, `use`, operatori Prolog, var/atom; `parseLogicProgramBlock` pentru comp |
| [`policy-type-modules.js`](../v0_3_2/core/policy-type-modules.js) | `'logic'` în `INLINE_KINDS` |
| [`parser.js`](../v0_3_2/core/parser.js) | Whitelist `inline [logic]`; program block `.module { }` în comp header |
| [`interpreter.js`](../v0_3_2/core/interpreter.js) | `execInline` → `inlineInstances`; `doc(inline.logic)` |

**Validare D16:** parse acceptă `query` în orice inline; la `use` merge doar facts/relations — queries din module used rămân neexportate.

**Validare D12 (MVP):** la elaborare comp, max **1** var de output per query (vars din program block excluse). **Faza 5** va relaxa la **2** vars + matrix/vector.

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
- Teste **3500–3505** (`logic`): parse, engine, comp integration, boolean/index redirect.
- `doc(inline.logic)`, `doc(comp.logic)`; secțiuni în doc-viewer.

---

### Faza 5 — Matrix / vector query output **(pending)**

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

**Implementare:**

- Extinde parser property block — `query >=`, `query:r`, `query::c`, `query:r:c`, `query:count`, `query:width`.
- Extinde `components/logic.js` — pack soluții row-major; **prefix pack + tail fill** (D12a); truncate fără eroare.
- Elaborare: cols matrix = nr vars libere; capture **fill sentinel** din init literal; `:width` constant.
- Relaxare D12: permite 2 vars; eroare la ≥3.
- Extinde `logic-engine.js` / `logic.js` — **atom → ASCII** (nu hash) pe toate redirect-urile; `\0` trim la citire pin text.
- Teste: vector/matrix (F5); **3504** actualizat ASCII; round-trip `table:0:0` → `myX`.

**Legat de 1+b:** filtrare/policies (`;unique`, cap rows) poate completa Faza 5 sau faza ulterioară.

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

## Comparație sketch v1 → v2 ( ce s-a schimbat )

| Topic | Sketch v1 | Sketch v2 (current) |
|-------|-----------|---------------------|
| Runtime | Inline-native `.people:…` | **`comp [logic]`** |
| Exec block | `.people:{ set }` | **`.characterLogic:{ set }`** |
| Results | POUT `.people:johnOwns:0` | **`johnOwns:0 >= wire`** în exec block |
| Inputs | `X = age` direct | **Program:** `X is number myX`; **Exec:** `myX = scoreIn` (pin ← wire) |
| Constants | Numeric IDs `owns(1,10)` | **Simboluri** `owns(john, chevy)` |
| Comparisons | `GE(A, 18)` LogTScript | **`X >= 9`, `X =< 12`** logic syntax |
| Composition | — | **`use .vehicles`** |
| Analogie | — | **ASM-like**, not protocol |

---

## Riscuri / neclarități rămase

| Topic | Status |
|-------|--------|
| `query = …` | **1+l** amânat |
| Multi-var query | **Fazele 1–4, 6:** max 1 var; **Faza 5:** matrix/vector + D12a fill/truncate/count |
| POUT declarate comp | **1+k** low priority |
| `use` circular | lint la elaborare **1+g** |
| boolean redirect | **D7a completed:** `isJohnOwner >= wire` |
| Quoted atoms `'John'` | amânat post-MVP (D8) |

---

## Ordine recomandată

1. ~~Faza 0~~ **(completed)**
2. ~~Faza 1~~ → ~~Faza 2~~ → ~~Faza 3~~ → ~~Faza 4~~ **(completed)**
3. ~~Faza 6~~ — Allow/NotAllow **(completed)**
4. **Faza 5** — matrix/vector output **(pending)** — singura fază rămasă din planul MVP+
