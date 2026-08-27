---
name: inline logic monopoly interactive
overview: "Mini Monopoly hot-seat — starea în KB dinamic ($/$$), 3 taste, un comp [logic] .game. MVP aproape funcțional; blocate de limite/comportamente mutation + control-flow. Pauză implementare până la clarificare engine (A/B/C)."
todos:
  - id: doc-plan-state
    content: Document stare curentă + probleme identificate (acest fișier)
    status: completed
  - id: inv-A-ground-vars
    content: "Investigare A: commit cu variabile legate în $$ / $ (turn$(P) + playerPos$$(P, …)) — fix F101a"
    status: completed
  - id: inv-B-read-after-commit
    content: "Investigare B: citire KB după commit — fix F102a auto re-read $/$$"
    status: completed
  - id: inv-C-rule-commit-chain
    content: "Investigare C: commit în regulă după commit în query — fix F103a fact read side-effect"
    status: completed
  - id: script-workaround-if3
    content: "Workaround script: if/3 + commit doar în query + chei literale p1/p2 (fără așteptare fix engine)"
    status: pending
  - id: doc-interactive
    content: Rescriere mini-monopoly-interactive.md cu script stabil + arhitectură simplă
    status: pending
  - id: verify-interactive
    content: doc_verify mini-monopoly-interactive.js (boot, roll seed 42, pass, buy, reset)
    status: pending
isProject: true
---

# Plan: Mini Monopoly interactive — inline logic

Document țintă: [mini-monopoly-interactive.md](../v0_3_2/doc/mini-monopoly-interactive.md)  
Tutorial static: [mini-monopoly-logic.md](../v0_3_2/doc/mini-monopoly-logic.md)  
Predicat $/$$ (F100): [inline_logic2.plan.md](inline_logic2.plan.md)

**Status:** ⏸ pauză implementare — investigăm probleme engine (secțiunea [Probleme identificate](#probleme-identificate)) înainte de script final + doc.

---

## Obiectiv (neschimbat)

| Element | Decizie |
|--------|---------|
| UI | `comp [key]` `.key1`, `.key2`, `.resetGame` (pulse `type: 0`) |
| Logic | **Un singur** `comp [logic] .game` + `inline [logic] .mono` |
| Stare | **`phase$`**, **`turn$`**, **`playerPos$$`**, **`playerCash$$`**, **`owns$$`**, **`communityDeck/1`** — fără facts statice de stare în inline |
| Boot | `welcomeBoot` + `bootStep` one-shot (evită blocarea tastelor) |
| Reset | `initGame()` regulă + `query handleReset` pe `.resetGame` |
| Seed | `randomSeed: 42` pe `.game` (demo determinist) |

---

## Ce avem acum (handoff)

### Fișiere

| Fișier | Rol |
|--------|-----|
| `v0_3_2/node/doc_verify/_mono_interactive_scratch.logts` | **WIP** — cea mai recentă versiune script |
| `v0_3_3/node/doc_verify/_mono_minimal.logts` | Minimal funcțional: roll + buy menu + key pulse |
| `v0_3_2/doc/mini-monopoly-interactive.md` | Doc **neactualizat** — script vechi multi-comp, nu merge interactiv |
| `v0_3_2/node/doc_verify/mini-monopoly-interactive.js` | **Lipsă** |
| `v0_3_2/node/_scratch_mono_test.js` | Test manual pulse key |

### Ce merge (confirmat în teste)

- **Boot** `welcomeBoot` → `initGame()` — mesaje reset, `greeted$()`, `phase$(waitRoll)`, `turn$(p1)`
- **Reset** `.resetGame` → `initGame()`
- **Roll** cu `randomSeed: 42`: p1 de la Go → dice 4+3 → poziția 7
- **Buy menu** (mesaje corecte `short` / `160`) când `canBuy` + `show` sunt **în query**, nu în `if(Cond, …)` pe `canBuy`
- **`LOGIC_MAX_QUERY_VARS`** mărit **16 → 32** (`logic-engine.js`) — query-uri roll+land combinate încap
- **`smart_or`** + reguli `landAfterRollP1` / `buyLandP1` — routing land vs buy OK
- **`initGame()` / `reset()` în regulă** cu `commit` — funcționează când e singurul lanț de mutație

### Ce nu merge încă (blockere MVP)

| # | Simptom | Impact joc |
|---|---------|------------|
| **P1** | După roll + meniu buy, **`phase$` rămâne `waitRoll`**, nu `waitChoice` | Key1 rerulează zarul; pass/buy nu se activează |
| **P2** | **`handleBuy` / key2** — fără output | Nu se poate cumpăra |
| **P3** | **`commit(+ playerPos$$(P, NewPos))`** cu `P` din `turn$(P)` — store neschimbat | **✅ fix F101a** — atom id-only în cheie `$$`; workaround literali încă OK |
| **P4** | **`if/3`** cu `canBuy` în condiție — `Then` vede `Name`/`Price` nelegate (literal în show) | Nu folosim `canBuy` în condiția `if` |
| **P5** | **`commit` în regulă** după **`commit` în query** — `phase$(waitChoice)` pierdut | **✅ fix F103a** — fact read `$`/`$$` nu mai face side-effect |
| **P6** | Load-time: dacă `.key1` e 1 la elaborare, roll automat la Load | Deranjant în viewer; testele clears + reset |

### Arhitectură script țintă (când P1–P5 rezolvate)

```text
.game:{ welcomeBoot; set=bootStep }
.game:{ bootStep=0; set=1 }

.game:{ handlePassP1,P2; set=.key1 }   ← waitChoice
.game:{ handleRollP1,P2; set=.key1 }   ← waitRoll → roll + land
.game:{ handleBuyP1,P2; set=.key2 }   ← waitChoice
.game:{ handleReset; set=.resetGame }
```

Exec blocks **separat pe query name** (`handleRollP1` / `P2`, nu un singur `handleRoll` cu 10 clauze) — evită elaborare/var-limit pe OR de query-uri.

---

## Probleme identificate (detaliu tehnic)

### 1. Ground check la `commit` cu variabile în slot cheie `$$`

```prolog
turn$(P),                    % P = p1
commit(+ playerPos$$(P, NewPos))   % eșuează — poziția rămâne 0
commit(+ playerPos$$(p1, NewPos))  % merge
```

Doc spune: *bound variable in rule/commit — OK after dereferencing*. Root cause: variabilele legate din env au atom **`id`-only** (fără `.name`); `logicGroundTermKey` producea cheie slot `$$` goală → mutația scria pe slot greșit.

**Fix F101a:** `logicNormalizeMutationTerm` în pipeline `logicDerefMutationTerm` + `logicGroundTermKey(term, table)`.

**Workaround script (opțional):** clauze duplicate per jucător (`p1` / `p2`) sau `if(P = p1, commit(…p1…), commit(…p2…))`.

---

### 2. Citire după `commit` în același query **(✅ F102a)**

```prolog
playerPos$$(p1, Pos),           % Pos = 0
commit(+ playerPos$$(p1, NewPos)),
playerPos$$(p1, Pos)            % Pos = 7 (auto-refresh la re-invocare)
```

**Comportament:** variabila rămâne stale până la **re-invocarea** goal-ului `$`/`$$`; apoi output-ul legat se refresh-ează din store. **Fără `refresh/1`.**

**Doc:** `inline-logic.md` — „Read after commit”; `logic-runtime.md` — secțiune dedicată.

---

### 3. Lanț query-commit → regulă-commit (`phase$` pierdut) **(✅ F103a — root cause)**

**Repro minim (`_mono_c1.logts`):**

```prolog
query rollThenBuy:
    phase$(waitRoll),          % guard — declanșează bug-ul
    commit(+ playerPos$$(p1, 7)),
    buyLandP1(),               % commit(+ phase$(waitChoice)) în regulă
    phase$(waitChoice)        % OK în același query (F102)
query readPhase:
    phase$(waitChoice)        % waitRoll — store corupt
```

**Root cause (C1):** la `_solveCall`, **orice** match pe head `$`/`$$` (inclusiv **fact static**) înregistra `bodyOnSuccess` care făcea `mut_add` cu head-ul ground **după** ce restul query-ului reușea. Guard-ul `phase$(waitRoll)` re-asserta `waitRoll` **la final**, suprascriind `waitChoice` din `buyLandP1`.

**Fix F103a:** side-effect `$`/`$$` doar pentru **clauze cu body** (reguli), nu pentru facts.

**Teste:** 4545–4546 (legacy/wave).

---

### 4. `if/3` nu propagă legăturile din condiție în `Then`

```prolog
if(canBuy(p1, Idx, Price, Name),
   ( show("menu", Name, Price) ),   % → "menu Name Price"
   ...)
```

`canBuy` reușește în `Cond`, dar **`Idx/Name/Price` nu sunt vizibile în `Then`** (test `_mono_if_buy.logts`).

**Workaround:** condiții inline `playerPos$$(p1, Idx), square(Idx, Name, Price, _), …` în `Then`, sau `if/3` doar pentru ramuri fără variabile de output (tax/rent/free), buy separat via `smart_or` / query.

---

### 5. Limită variabile query (parțial rezolvată)

- Limita **16** bloca query combinat roll+land (~24 vars).
- Mărit la **32** — suficient pentru MVP cu `if/3` imbricat.
- **OR** multe clauze `query handleRoll:` cu același nume — probleme elaborare; preferat **`handleRollP1` / `handleRollP2`** separate.

---

### 6. Doc vechi vs arhitectură nouă

`mini-monopoly-interactive.md` descrie:

- multe componente (`gameKey1`, `gameRoll`, …);
- mutații prin `logic { }` + fire, nu `commit` în query;
- **`phase/1`** static, nu **`phase$`**.

Doc-ul trebuie rescris după ce scriptul e stabil.

---

## Întrebări deschise — A, B, C

Vezi secțiunea [Recomandări A/B/C](#recomandări-abc) pentru analiză și opțiuni.

| ID | Întrebare | Prioritate |
|----|-----------|------------|
| **A** | `commit` să accepte variabile **legate** ca ground în `$$` / `$` | P0 — afectează orice joc cu `turn$(P)` |
| **B** | Citire corectă după `commit` în același query (`refresh` / re-read) | P1 — ergonomie + corectitudine |
| **C** | `commit` în regulă după `commit` în query — de ce se pierde `phase$` | P0 — blocker Monopoly cu reguli land |
| **C′** | API tranzacții `startTr` / `commitTr` / `rollbackTr` | P2 — doar după root-cause la C |

---

## Recomandări A/B/C

### A) Ground din variabile legate în `commit`

**Ce zice doc-ul azi:** variabilele legate se dereferențiază înainte de ground check.

**Ce vedem:** `turn$(P)` + `playerPos$$(P, NewPos)` eșuează; `p1` literal merge.

**Opțiuni:**

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **A1 (recommended)** | Fix în `logicDerefMutationTerm` / ground check: dacă arg cheie `$$` e var legată la **atom**, tratează ca ground | Un singur fix, aliniat la doc | Necesită teste F44+ / keyed $$ |
| **A1 ✅** | **F101a livrat** — normalize atom `id→name` la deref mutation; teste **4535–4538** | Rezolvă P3 Monopoly | — |
| **A2** | Documentăm explicit: *cheia keyed trebuie literal sau `P = p1` înainte de commit* | Zero cod | Script verbose, capcană pentru autori |
| **A3** | Sintaxă sugar: `commit(+ playerPos$$(turn$, NewPos))` — slot special | Expresiv | Over-engineering |

**Verdict:** **Da, merită rezolvat (A1)** — pare gap față de documentație, nu limită fundamentală.

---

### B) Citire după commit (`refresh` / alt mecanism)

**Problema:** Prolog re-unifică `playerPos$$(P, NowPos)` cu binding-uri vechi (`Pos=0`), ignorând overlay-ul post-commit.

**Opțiuni:**

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **B1 (recommended)** | Workaround script: literali `p1`/`p2`, variabile noi, fără reutilizarea `Pos` | Funcționează acum | Nu scalează la N jucători |
| **B2** | După mutation, **invalidate** binding-urile pe predicate mutate în env (solve pass refresh) | Corect semantic pentru `$`/`$$` | Schimbare engine; de modelat cu atenție |
| **B2 ✅** | **F102a livrat** — re-invocare `$`/`$$` după commit refresh-ează output legat; teste **4539–4544** | Fără `refresh/1` | — |
| **B3** | Builtin `refresh/1` sau `store/2`: citește exclusiv din dynamic store | API clar | **Amânat** — redundant după B2 |
| **B4** | `commit` returnează fapte noi ca side-effect bind (ex. `Pos := NewPos`) | Ergonomic în query | Semantica Prolog non-standard |

**Verdict:** **B2/B3** pe termen mediu; **B1** pentru MVP Monopoly. `refresh/1` e nice-to-have, nu înlocuiește fixul de fond (overlay vs trail).

---

### C) Commit în regulă după commit în query + tranzacții

**Problema:** `buyLandP1()` cu `commit(phase$)` după roll-commit în query — meniu OK, **`phase$` nu persistă**.

**Opțiuni:**

| Opțiune | Descriere | Pro | Contra |
|---------|-----------|-----|--------|
| **C1 (recommended first)** | **Investigare bug** — test minim în `test_suite.js`, trace `applyGoal` ×2, `mutationFailed`, store după fiecare pas | Găsim root cause | Timp dev |
| **C2** | Workaround script: **toate commit-urile în query** (`if/3` imbricat, fără commit în reguli land/buy) | Deblochează doc MVP | Script lung; fără fix engine |
| **C3** | **`startTr` / `endTr` / `rollbackTr`** — overlay tranzacție, commit la final | Un singur publish; pattern familiar | Ascunde bug-ul; API mare; trebuie spec |
| **C4** | **Deferred commit queue** per solve pass — toate `commit`-urile din query+reguli se batch-uiesc la sfârșitul query-ului | Rezolvă C fără API user-facing | Schimbare arhitectură runtime |

**Verdict:** **C1 obligatoriu înainte de C3/C4.** Tranzacțiile propuse de user sunt utile ca **feature** (batch atomic pe întreg query pass), dar **nu ar trebui să mascheze** un bug unde al doilea `commit` atomic reușește la `show` dar nu la store.

**Ordine propusă:**

1. Test regresie **C-minimal** (2 commit-uri: query + rule via `call`)
2. Fix C dacă e bug
3. Paralel **A1** dacă e același pipeline dereference
4. Script MVP cu **C2** (if/3) dacă fix-ul întârzie
5. Abia apoi discutăm **C3** tranzacții ca feature plan 2 / Faza 101+

---

## Workaround script MVP (fără așteptare fix engine)

Dacă reluăm implementarea înainte de fix C:

1. **`handleRollP1` / `P2`** — roll + **`if/3` imbricat** (tax → rent → community → buy → free)
2. **Toate `commit`-urile în corpul query**, chei **`p1` / `p2` literali**
3. **Fără `canBuy` în condiția `if`** — condiție buy: `playerPos$$(p1, Idx), square(Idx, Name, Price, _), Price > 0, \+ owns$$(Idx, _)`
4. **`handlePassP1/P2`**, **`handleBuyP1/P2`** — query-uri separate (nu OR pe același nume)
5. Verificare **`mutationFailed >= failed`** pe fiecare bloc exec

---

## Livrabile (când deblocăm)

| Livrabil | Criteriu done |
|----------|----------------|
| Script în `mini-monopoly-interactive.md` | Load & Run: reset → roll (42) → buy menu → pass **sau** buy → tur p2 |
| `mini-monopoly-interactive.js` | cases: boot, roll, waitChoice, pass, buy, reset |
| Plan actualizat | P1–P5 închise sau documentate ca limitation |
| (opțional) teste engine | inv-A, inv-B, inv-C în `test_suite.js` |

---

## Mesaje așteptate (seed 42, p1 de la Go)

```text
Player 1 dice: 4 3
Player 1 position now: 7
1 pass turn
2 buy property short . cost: 160
```

---

## Vezi și

- [comp-logic.md](../v0_3_2/doc/comp-logic.md) — exec, redirect, `mutationFailed`
- [logic-runtime.md](../v0_3_2/doc/logic-runtime.md) — `commit`, ground rules, pipeline
- [inline-logic.md](../v0_3_2/doc/inline-logic.md) — `if/3`, `smart_or`, queries
