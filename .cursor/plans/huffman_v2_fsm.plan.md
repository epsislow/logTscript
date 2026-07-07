---
name: Huffman v2.1 FSM compact
overview: "Pipeline Huffman wave complet (~150–200 linii script): FSM ph 4b + counters (mergeStep, symIdx, hop), fără unroll mk1..mk32. Script acum pentru round-trip; fixuri engine P0 pentru wave reactiv."
todos:
  - id: engine-multi-on-assign
    content: "Parser/runtime: mai multe assignment-uri distincte în același on:raise { cond, a=1, b=2 }"
    status: pending
  - id: engine-counter-reeval
    content: "Wave: la schimbare counter/component → re-eval fire declarative dependente (.idx:get, mergeStep, symIdx)"
    status: pending
  - id: engine-lut-live-read
    content: "Wave session: .links:get / .heap:size / execStmts citesc LUT live (fără legacy session)"
    status: pending
  - id: engine-lut-size-notify
    content: "Extinde _notifyWritableLutMutation la lanțuri de fire derivate din :size()"
    status: pending
  - id: engine-on-reassign
    content: "on:raise: reassignment pe fire existente (mk,mf = popMin) fără redeclarare 8wire — ca on:1 doc"
    status: pending
  - id: engine-entries-sorted
    content: "Opțional: .freq:entriesSorted sau tag-uri sort pe :entries — evită SORT pe matrix goală la init"
    status: pending
  - id: script-fsm-compact
    content: "Rescrie huff_fsm_script.js: un singur bloc merge (mk,mf + mk2,mf2), mergeStep counter, ~150–200 linii"
    status: pending
  - id: script-walk-fsm
    content: "FSM walk: ph WHOP + hop/symIdx counters; commit .huff:add doar GT(hop,0) pe tick dedicat"
    status: pending
  - id: script-roundtrip-aacb
    content: "Test 2117: round-trip aacb într-un singur run (packet după ph DONE+walk), wave session"
    status: pending
  - id: test-2115-wave-session
    content: "2115/2116: trec pe createSession wave după fix engine lut-live-read"
    status: pending
  - id: doc-huffman-v2-fsm
    content: "huffman-v2.md secțiune FSM compact + limitări; actualizare huffman_fsm_resume.md"
    status: pending
isProject: false
---

# Plan: Huffman v2.1 — FSM compact (wave)

**Versiune:** v2.1 (pe baza v2 din [`huffman_wave_demo.plan.md`](huffman_wave_demo.plan.md))  
**Handoff curent:** [`huffman_fsm_resume.md`](huffman_fsm_resume.md)  
**Verde azi:** teste **2115** (FSM merge + links), **2116** (FSM + walk post-`execStmts`) — cu workaround legacy session.

**Principiu (decizie utilizator):**

- **Nu** unroll `mk1`, `mk2`, … `mk32` / `_m0k1` … `_m31k1` — sursa poate crește, scriptul trebuie **parametric**.
- **Da** FSM `ph` 4b: o fază terminată → următoarea; aceleași nume de fire reutilizate la fiecare tick.
- **Da** wave (nu legacy) ca țintă finală.
- **Țintă mărime:** ~**150–200 linii** script total (inline LUT + protocol + FSM + walk + packet).

---

## Ce înseamnă „SORT în JS la generare” (1.C — clarificare)

**Acum în `huffFsmScanDoneHeapLoad()`:** generatorul Node **sortează în JavaScript** frecvențele din `sourceLiteral` și emite linii fixe:

```logts
on:raise { ..., 1wire _ = .heap:add(01100010, \1;8) }  # b
on:raise { ..., 1wire _ = .heap:add(01100011, \1;8) }  # c
on:raise { ..., 1wire _ = .heap:add(01100001, \2;8) }  # a
```

**Nu** rulează `SORT()` în logTscript la init — pentru că `.freq` e gol la elaborare.

**Varianta dorită în limbaj (propunere — nu există încă):**

```logts
# PROPUNERE — de evaluat la implementare
8wire[n] sortKeys = .freq:entries(sortKeys)
8wire[n] sortVals = .freq:entries(sortValues)
# sau cu tag-uri format:
8wire[n] sortKeys = .freq:entries(sortKeys; q4p4)
8wire[n] sortVals = .freq:entries(sortValues; s8)
```

| Abordare | Status | Notă |
|----------|--------|------|
| `e = .freq:entries()` apoi `SORT(e; col=1)` | **Există** | Trebuie apelat când `size()>0` (în `on:raise` la scanDone), nu la init |
| `8wire[32,2] = entries()` la init | **Nu merge** | `entries()` cu 0 rânduri → 0 biți ≠ 512 așteptați de `[32,2]` |
| `fillwith` | **Nu ajută** | `fillwith` e pentru **lookup** chei absente, nu export `entries()` |
| `8wire[32,2] := ADD(...)` padding | **Nu la init** | `:=` nu rezolvă evaluarea când freq e încă gol |
| **MEMPTY** (bit valid per celulă) | **Backlog** | Util doar cu `SORT`/`filter` care ignoră rânduri empty |
| **`.freq:entriesSorted`** sau tag-uri pe `:entries` | **TODO engine** | id `engine-entries-sorted` |

**Script fără engine (scanDone tick):**

```logts
on:raise { AND(.clk, phScan, EQ(.idx:get, srcLen), GT(.freq:size(), 0)),
  8wire[32,2] _fe = .freq:entries(),
  8wire[32,2] _fs = SORT(_fe; col=1),
  ...
}
```

→ Necesită **multi-assignment în același `{ }`** (1.A) sau mai multe tick-uri; altfel multe linii `on:raise` separate (acceptabil temporar).

---

## 1. Limbaj — răspunsuri / decizii

### 1.A — Mai multe assignment-uri în același `on:raise { }`

**Stare:** un assignment per bloc (sau mixedVar `8wire a, 8wire b = expr`).

**TODO engine** (`engine-multi-on-assign`):

```logts
on:raise { AND(.clk, phMerge),
  mk, mf = .heap:popMin(),
  mk2, mf2 = .heap:popMin(),
  1wire _ = .links:set(mk, parent + 00000000)
}
```

**Script interim:** mixedVar per RHS + fire intermediare (3.A).

### 1.B — ADD carry → folosim `_`

**Da.** Carry există; nu trebuie sugar nou obligatoriu:

```logts
8wire sum, 1wire _ = ADD(f1, f2)
```

(`1bit _` → prefer `1wire _` — convenție test suite.)

### 1.C — SORT / entries

Vezi secțiunea de clarificare de mai sus. **Prioritate script:** `SORT` în `on:raise` la scanDone cu `GT(.freq:size(), 0)`.

### 1.D — `.huff:add` după merge

**Da.** Walk + `.huff:add` pe tick **după** `ph=MERGE/DONE`, nu la init script.

---

## 2. Wave — fixuri engine (P0) vs script

### 2.A — Wire `.idx:get` vs inline

Un `8wire idxSnap = .idx:get` **declarativ top-level** are **aceeași problemă stale** ca `scanCont` — counter se schimbă, wire-ul nu se re-evaluează.

**Fix engine (`engine-counter-reeval`):** la update orice `comp [counter]` / `.prop:get` → re-eval `wireStatements` dependente (ca `_notifyWritableLutMutation` pentru LUT).

**Exemplu concret după fix:**

```logts
8wire idxSnap = .idx:get
1wire scanCont = LT(idxSnap, srcLen)   # declarativ — se actualizează la fiecare tick idx
on:raise { AND(.clk, phScan, scanCont), sym = source.(idxSnap)/8 }
```

**Fără fix:** condiții **inline** în `on:raise` (pattern doc `huffman-v2.md` + test 2109).

### 2.B — LUT live pe wave session

**Problema:** `createSession({ propagation: 'wave' })` + mutații `.links` în `on:raise` → `execStmts`/`.links:get` returnează fillwith (0000…).

**Fix engine (`engine-lut-live-read`):** citire LUT readonly (`get`, `entries`, `size`) = **stare live** din `lutEntryList`, indiferent de session propagation / `execStmts`.

**Nu** rămânem pe legacy — 2115/2116 se actualizează după fix (`test-2115-wave-session`).

### 2.C — Walk fără engine (acum)

| Pas | Acțiune |
|-----|---------|
| Tick N | merge complete → `ph=DONE`, links setate |
| Tick N+1 | `ph=WALK` sau `WHOP`: walk hops, `.huff:add` cu `GT(hop, 0)` |
| Declarativ | `packet =: .huffPacket`, `recovered` — eval **după** `.huff` populat |

Ordinea textuală e OK **dacă** `packet`/`recovered` se re-evaluează când `.huff` se schimbă (notificare LUT → vezi 2.B / 3.C).

---

## 3. LUT / merge — design compact (fără mk1..mk32)

### 3.A — Fire intermediare pentru `heap:add`

```logts
on:raise { ..., heapKey = .freq:keyAt(.hidx:get) }
on:raise { ..., heapVal = .freq:valueAt(.hidx:get) }
on:raise { ..., 1wire _ = .heap:add(heapKey, heapVal) }
```

**Width staging** (clarificare): uneori expresii imbricate în argumente eșuează la inferență lățime; firele intermediare elimină ambiguitatea — **nu e obligatoriu fix engine**.

### 3.B — Heap gol

**Da:** condiție pe `on:raise`:

```logts
on:raise { AND(.clk, phMerge, GT(.heap:size(), 0), LT(mergeStep, mergeTarget)), mk, mf = .heap:popMin() }
```

Alternativ: tranziție la DONE când `EQ(.heap:size(), 1)` (rădăcină). Multi-assign în același bloc reduce tick-uri.

### 3.C — `.heap:size()` reactiv

**Da, de fixat** (`engine-lut-size-notify`): orice `8wire hs = .heap:size()` declarativ trebuie actualizat la `add`/`popMin`/`clear`.

### 3.D — **Nu** nume unice per pas merge — model corect

**Greșit (actual unroll — de eliminat):**

```logts
on:raise { EQ(mergeStep, 00000000), 8wire _m0k1, ... = popMin() }
on:raise { EQ(mergeStep, 00000001), 8wire _m1k1, ... = popMin() }
...
```

**Corect (FSM + counters — țintă v2.1):**

```logts
8wire mk = 00000000
8wire mf = 00000000
8wire mk2 = 00000000
8wire mf2 = 00000000
8wire mergeStep = 00000000
8wire mergeTarget = ...   # JS: uniqueSyms-1 sau .freq:size()-1 la scanDone

on:raise { AND(.clk, phMerge, LT(mergeStep, mergeTarget), GT(.heap:size(), 1)),
  mk, mf = .heap:popMin() }
on:raise { AND(.clk, phMerge, LT(mergeStep, mergeTarget), GT(.heap:size(), 0)),
  mk2, mf2 = .heap:popMin() }
on:raise { AND(.clk, phMerge, LT(mergeStep, mergeTarget)),
  8wire sum, 1wire _ = ADD(mf, mf2) }
on:raise { ... 1wire _ = .links:set(mk, parent + 00000000) }
on:raise { ... 1wire _ = .links:set(mk2, parent + 00000001) }
on:raise { ... 1wire _ = .heap:add(nid, sum) }
on:raise { ... mergeStep = ADD(mergeStep, 00000001) }
on:raise { EQ(mergeStep, mergeTarget), root = nid, ph = DONE }
```

**~6–10 linii `on:raise` per merge**, nu ×31. `mergeTarget` depinde de `nSym`, nu de sursă hardcodată `'aacb'`.

**Reassign `mk, mf = popMin()`:** comportament așteptat = doc **`on:1`** / `on:raise`: la fiecare rising edge când condiția e adevărată, **re-execută assignment pe fire existente**. Dacă engine respinge reassign fără `8wire` redeclarat → fix `engine-on-reassign` (nu unroll).

**Două popMin/tick:** păstrăm `mk/mf` + `mk2/mf2` (4 fire fixe), **nu** 4×N fire.

---

## 4. Protocol (4.A)

**Nu folosim ASM** — mesajul „not an asm ISA” e bug/path greșit la `execStmts`.

**Model hardware (corect):**

```
SCAN → MERGE → WALK (umple .huff) → apoi packet / recovered
```

`packet =: .huffPacket { tokens = source }` = **combinational** pe `.huff` deja populat. La wave, `packet` trebuie **re-evaluat** după ultimul `.huff:add` (notificare LUT + dependențe protocol).

**Fără engine:** walk tick N+1, apoi declarativ `packet`/`recovered` în același script (2117).

---

## 5. Walk FSM — detaliu

### 5.A — Slice dinamic `codAcc.0/(hop)`

**Ce vrem:** lungime cod = `hop` biți; `hop` e counter, nu constantă.

**Problema:**

1. La **commit** (`huff:add`), dacă `hop=0` → codeword gol → prefixFree error sau cod invalid.
2. Tip wire `hopwire cod` — lățimea LHS depinde de `hop`; trebuie eval **la momentul commit**, nu la init.
3. Dacă `packet` rulează înainte de commit → `recovered` zero (5.D).

**Script (fără engine):**

```logts
# Guard obligatoriu
on:raise { AND(.clk, phWalk, GT(hop, 00000000)), 1wire _ = .huff:add(sym, codAcc.0/(hop)) }

# Sau sub-stare commit
# ph = WHOP (calc bit) → ph = WCOMMIT (add dacă GT(hop,0)) → ph = WNEXT
```

**MUX variant:** `MUX(GT(hop,0), 0, codAcc.0/(hop))` — evită add cu cod gol, dar tot necesită lățime/slice corect.

**Fix engine (backlog):** slice `wire.(start)/(len)` cu `len` wire → tip reactiv + re-eval.

### 5.B — `symIdx` gated + exemplu fix engine

**Script acum:**

```logts
comp [counter] .symIdx: ...
.symIdx:{ set = AND(NOT(.clk), phWalk, LT(.symIdx:get, nSym)) }
on:raise { AND(.clk, phWalk, EQ(symIdx, 00000000)), ... walk symbol 0 ... }
```

**Cu fix `engine-counter-reeval`:**

```logts
1wire walkMore = LT(.symIdx:get, nSym)   # declarativ — OK după fix
on:raise { AND(.clk, phWalk, walkMore), sym = sortedKeys.(symIdx:get)/8 }
```

**Exemplu numeric:** tick 5: `nSym=3`, `.symIdx:get` trece `2→3` pe falling edge; **fără fix** `walkMore` rămâne `1` → încă un hop pe simbol inexistent; **cu fix** `walkMore=0` → walk se oprește, `ph=DONE`.

### 5.C — De ce nu „mii de linii”

Mii de linii veneau din **unroll static** (`huffWalkEmit` × N simboluri × 7 hops în generator). **v2.1 renunță** la asta.

**În schimb:** FSM walk cu counters (`symIdx`, `hop`, `codAcc`, `node`), ~20–40 linii walk + ~80 linii merge/scan/LUT/protocol = **≤200 linii**.

### 5.D — Walk commit / recovered zero

**Cauză:** `.huff` gol sau `packet` evaluat prea devreme.

**Script:**

- Tick dedicat: `ph=WCOMMIT` doar `huff:add` când `GT(hop,0)`.
- `packet`/`recovered` declarativ **sub** walk în script, re-eval după `.huff` fill.
- Assert test: `GT(.huff:size(), 0)` înainte de compare `recovered`.

---

## Faze FSM (`ph` 4b) — țintă

| `ph` | Fază | Tranziție |
|------|------|-----------|
| `0000` | SCAN | `EQ(.idx:get, srcLen)` → HEAP_LOAD |
| `0001` | HEAP_LOAD | SORT/entries sau heap:add sorted → MERGE |
| `0010` | MERGE | `EQ(mergeStep, mergeTarget)` → WINIT |
| `0011` | WINIT | init walk counters → WHOP |
| `0100` | WHOP | hop pe links; la leaf → WCOMMIT |
| `0101` | WCOMMIT | `huff:add` dacă `GT(hop,0)`; symIdx++ → WHOP sau DONE |
| `0110` | DONE | `packet` / `recovered` (combinational) |

*(Codificare ph exactă poate fi comprimată la 5 stări dacă WINIT+WHOP se unesc.)*

---

## Ce implementăm — ordine

### Faza S1 — Script compact (fără engine) — parțial ✦

- [ ] Rescrie merge: **un** set `mk/mf/mk2/mf2` + `mergeStep` (elimină `_m{r}k1`… per pas) — **backlog** `engine-on-reassign`
- [x] Merge parametric: `huffFsmMergeStepBlocks` emite `nSym−1` pași (~95 linii aacb vs ~350 unroll×31)
- [ ] Walk: tick separat / sub-stări WHOP+WCOMMIT; `GT(hop,0)` guard — **backlog**
- [x] Test **2117** — FSM merge + `execStmts` walk + protocol round-trip (wave)
- [x] Test **2118** — in-script round-trip fără `execStmts`
- [x] Doc runnable **Load / Load & Run** — bloc FSM în `huffman-v2.md`
- [x] 2115/2116 verzi pe **wave session**
- [x] `_` pentru carry ADD peste tot (merge blocks)

### Faza E0 — Engine P0 (wave Huffman)

- [ ] `engine-counter-reeval`
- [ ] `engine-lut-live-read`
- [ ] `engine-lut-size-notify`
- [ ] `engine-on-reassign` (dacă reassign `mk,mf=` e încă blocat)
- [ ] 2115/2116 pe **wave session**

### Faza E1 — Engine confort

- [ ] `engine-multi-on-assign`
- [ ] `engine-entries-sorted` (`.freq:entries(sortKeys)` / tag-uri) — dacă S1 încă e prea verbos la HEAP_LOAD
- [ ] `execStmts` + protocol invoke
- [ ] Slice dinamic `len` wire (5.A)

### Faza E2 — Backlog

- [ ] MEMPTY + SORT aware
- [ ] ADD single-return sugar (opțional — `_` suficient)
- [ ] Walk FSM complet N=32 generic fără JS generator

---

## Teste țintă

| ID | Scop |
|----|------|
| 2115 | FSM merge + links (wave session după E0) |
| 2116 | FSM + walk post-execStmts (interim) |
| **2117** | **Done** — FSM merge + `execStmts` walk + protocol (wave); round-trip într-un singur `run()` rămâne backlog |
| 2118 | Sursă mai lungă / nSym variabil (după compact merge) |

---

## Fișiere

| Fișier | Rol |
|--------|-----|
| `v0_3_2/node/huff_fsm_script.js` | Rescriere compactă |
| `v0_3_2/tests/test_suite.js` | 2117+, helpers FSM |
| `v0_3_2/doc/huffman-v2.md` | Secțiune FSM v2.1 |
| `.cursor/plans/huffman_fsm_resume.md` | Pointer scurt la acest plan |
| `v0_3_2/core/signal-propagation.js` | E0 counter re-eval |
| `v0_3_2/core/interpreter.js` | E0 LUT live, on reassign |
| `v0_3_2/core/parser.js` | E1 multi-assign on:raise |

---

## Legături

- Plan v2 infra: [`huffman_wave_demo.plan.md`](huffman_wave_demo.plan.md)
- Conditional assignment: [`conditional_assignment_on.plan.md`](conditional_assignment_on.plan.md)
- Doc: [`v0_3_2/doc/conditional-assignment.md`](../v0_3_2/doc/conditional-assignment.md)
