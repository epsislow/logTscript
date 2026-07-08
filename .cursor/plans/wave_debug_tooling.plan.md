---
name: Wave debug tooling
overview: "Plan incremental pentru debug propagare wave: Wave Listen panel UI, deps(), cauzalitate (cause), snapshot wire, dependențe protocol→LUT. Punct de plecare: bug Huffman SC round-trip după `.huff:clear()`."
todos:
  - id: strat1-waveListen
    content: "Strat 1.1: Wave Listen panel — UI ON/OFF + level 1/2/3, debugLevel în propagate(), fără statement în script"
    status: completed
  - id: strat1-deps
    content: "Strat 1.2: deps(wireOrExpr) — wire + expr, format tree text, dump index dependențe + teste"
    status: completed
  - id: strat1-doc-patterns
    content: "Strat 1.3: Secțiune wave-debug patterns în debug.md + link din huffman-v2.md"
    status: completed
  - id: strat2-probe-cause
    content: "Strat 2: cause în probe — context re-eval LUT/compMut + wave index + stmt id"
    status: pending
  - id: strat2-watch-cause
    content: "Strat 2: cause în watch/timeline — tooltip + culori (unificare cu evaluare_timeline_watch.plan.md)"
    status: pending
  - id: strat3-snapshot
    content: "Strat 3.1: snapshot(wire) sau atribut noReeval — decizie sintaxă + filtru re-eval"
    status: pending
  - id: strat3-proto-deps
    content: "Strat 3.2: Dependențe protocol→LUT generalizate (înlocuiește hardcod .huff)"
    status: pending
  - id: strat3-step-debugger
    content: "Strat 3.3: Wave step debugger UI (după traceWave)"
    status: pending
  - id: tests-huffman-roundtrip
    content: "Teste regresie: Huffman SC round-trip wave + peek/show 807/813 + FSM watch"
    status: pending
isProject: false
---

# Wave debug — propagare, cauzalitate, snapshot

Plan **elaborabil pe parcurs** — nu presupune implementare într-o singură iterație.

**Planuri înrudite (deja în repo):**
- [wave_signal_propagation_5efca976.plan.md](.cursor/plans/wave_signal_propagation_5efca976.plan.md) — engine wave (DONE)
- [evaluare_timeline_watch.plan.md](.cursor/plans/evaluare_timeline_watch.plan.md) — `cause` în watch (parțial overlap, todo-uri pending)
- [huffman_packet_sc.plan.md](.cursor/plans/huffman_packet_sc.plan.md) — cazul care a expus limitările debug

**Documentație existentă:**
- [v0_3_2/doc/debug.md](v0_3_2/doc/debug.md) — `show` / `peek` / `probe` / `watch`
- [v0_3_2/doc/signal-propagation.md](v0_3_2/doc/signal-propagation.md) — wave vs legacy
- [v0_3_2/doc/huffman-v2.md](v0_3_2/doc/huffman-v2.md) — workaround `peek` + snapshot literal (L1071–1098)

---

## Problema

La complexitate mare (ex. Huffman SC round-trip în wave), **`show` / `peek` / `probe` nu explică propagarea** — doar valori la momente diferite.

### Caz concret (discutat 2026-07-06)

```mermaid
sequenceDiagram
  participant Script
  participant Engine
  participant HuffLUT as dot_huff_LUT

  Script->>Engine: packetEncoded = .huffPacketSC {...}
  Engine->>Engine: expand(..., .huff) OK
  Script->>Engine: peek(packetEncoded) → CRC valid
  Script->>Engine: .huff:clear()
  Engine->>Engine: _notifyWritableLutMutation(".huff")
  Engine->>Engine: re-exec st(packetEncoded) — LUT gol
  Script->>Engine: show(packetEncoded) → CRC invalid
```

**Cauză în cod** — [`interpreter.js`](v0_3_2/core/interpreter.js) `_notifyWritableLutMutation` (L893–916):

- Re-execută wire statements care citesc LUT writable **sau** conțin invocări protocol când `instName === '.huff'`
- `show` pe wave e amânat până la settle → vede valoarea **post re-eval**
- `probe` emite `- changed` fără a spune **de ce** (LUT clear vs UI vs NEXT)

**Workaround validat (doc):** `peek` imediat după encode + copiere literală `123wire packet = ^…` înainte de `:clear()`.

---

## Ce avem azi vs ce lipsește

| Tool | Rol | Limită la complexitate mare |
|------|-----|------------------------------|
| `peek` | Valoare la statement | Nu explică re-eval ulterioară |
| `show` | Valoare după settle (wave) | Ordine temporală înșelătoare după side-effects |
| `probe` / `watch` | La fiecare commit | Fără `cause` (re-eval LUT, NEXT, UI, seed) |
| Timeline UI | Istoric vizual | Fără wave index / statement trigger |
| `debugLevel` | Flag pe strategie | **Definit dar nefolosit** în `WavePropagationStrategy.propagate()` |

Infrastructură existentă neexploatată:
- `SignalPropagationStrategy.debugLevel` + `setDebugLevel()` — [`signal-propagation.js`](v0_3_2/core/signal-propagation.js) L6, L24–26
- `_wireDependentsIndex`, `_componentDependentsIndex` — construite la elaborare
- `watchRecorder` + [`timeline-analyzer.js`](v0_3_2/ui/timeline-analyzer.js)
- `_probeReasonContext` parțial pentru probe (initialised / changed / edge committed)

---

## Arhitectură țintă (3 straturi)

```mermaid
flowchart TB
  subgraph layer1 [Strat 1 — vizibilitate]
    waveListen[Wave Listen panel / debugLevel]
    depsStmt[deps wireOrExpr]
    docPatterns[Doc wave-debug patterns]
  end
  subgraph layer2 [Strat 2 — cauzalitate UI]
    probeCause[cause in probe]
    watchCause[cause in watch timeline]
  end
  subgraph layer3 [Strat 3 — control + core]
    snapshot[snapshot wire / noReeval]
    protoDeps[protocol to LUT deps]
    stepDbg[Wave step debugger UI]
  end
  layer1 --> layer2
  layer2 --> layer3
```

---

## Strat 1 — Quick wins (fără schimbări majore de limbaj)

### 1.1 Wave Listen — panel UI dedicat (fără statement în script)

**Decizie (2026-07-08):** Nu există keyword `traceWave()` în limbaj — activarea e **doar din UI**, într-un panel separat de Output (ca Network Traffic / Timeline). Output-ul scriptului rămâne curat.

#### Panel UI

- **Locație:** selector panouri (`panel-dropdown`) — item nou alături de Timeline și Network Traffic
- **Label UI:** „Wave Listen” (intern: `waveListenPanel`)
- **Conținut:** `<div>` scrollabil (ca `#out.output-panel` + `appendOutputLine`), **nu** textarea — permite culori pe tip de eveniment
- **Toolbar:**
  - **ON / OFF** (buton panel) — **armează** panelul: dacă e ON, panelul **ascultă** când scriptul rulează; dacă OFF, nu. Poate fi schimbat oricând (script rulează sau nu, wave sau legacy)
  - **Level 1 / 2 / 3** — vizibile când buton ON; la buton OFF rămân vizibile dar inactive; level **nu se resetează**
  - **Clear** — șterge tot conținutul panelului (confirmat; **fără** auto-clear la Run)
- **Persistență:** `sdb` — `prog/waveListenArmed` (bool buton), `prog/waveListenLevel` (1–3)

#### Buton vs Listen — două concepte distincte

| | **Buton ON/OFF** | **Listen** (intern) |
|--|------------------|---------------------|
| **Ce e** | Preferință UI — panel armat să asculte | Stare runtime — panelul **primește** evenimente de la script |
| **Când e activ** | Setat de utilizator, persistă | Doar cât scriptul **rulează** și butonul e ON |
| **La Stop script** | **Rămâne** cum era (ex. ON) | Trece automat **OFF** |
| **Mesaje panel** | `** state ON` / `** state OFF` | `listen is ON` / `listen is OFF` în mesajele `*` |

```mermaid
stateDiagram-v2
  direction LR
  state "Buton OFF" as btnOff
  state "Buton ON" as btnOn
  state "Listen OFF" as listenOff
  state "Listen ON" as listenOn

  btnOff --> btnOn: user ON
  btnOn --> btnOff: user OFF
  listenOff --> listenOn: Run start si buton ON
  listenOn --> listenOff: Stop sau buton OFF mid-run
```

**Listen ON** = script în execuție **și** buton panel ON → engine emite linii în panel.

**Listen OFF** = script oprit, **sau** buton OFF (chiar dacă scriptul rulează).

Mesaje meta buton (stil `wave-listen-line--meta`):

```text
** state ON
** state OFF
** level is now 2
** level is now 3
```

#### Mesaje la Run / Stop / Legacy

Mesajele `*` descriu starea **Listen** (intern), nu butonul:

**Legacy + Run:**

```text
* Script runs in mode legacy, listen is OFF    ← buton OFF
* Script runs in mode legacy, listen is ON     ← buton ON, script rulează (fără linii [wave N])
```

(La legacy: **zero** linii `[wave N]` indiferent de level — listen poate fi ON dar nu există propagare wave de urmărit.)

**Wave + Run + buton ON:** listen ON + linii trace conform levelului.

**Wave + Run + buton OFF:** listen OFF — fără linii trace (opțional: niciun mesaj, sau silent).

**Stop script** (eroare sau buton Stop):

```text
* script stopped listen is OFF
```

Listen trece OFF; **butonul rămâne neschimbat** (ex. ON → la Run următor listen pornește din nou).

#### Schimbare buton / level **în timpul** Run-ului

- **Buton ON mid-run:** listen pornește imediat; trace de acel moment (fără retroactiv); `** state ON`
- **Buton OFF mid-run:** listen se oprește imediat; `** state OFF`
- **Level mid-run:** `** level is now N`; de la evenimentul următor aplică noul prag (doar dacă listen ON)

#### Toolbar — indicator „Listening…”

- Pe toolbar-ul panelului Wave Listen (lângă ON/OFF / level): badge **„Listening…”** vizibil doar când **listen ON** (intern), indiferent de wave/legacy
- La listen OFF: badge ascuns sau text neutru „Idle”
- Culoare badge: verde/albastru discret (distinct de butonul armed ON)

#### Run-uri multiple — același tab sau instance

Editorul suportă deja **multi-instance** (1–5) și **run-context** per instance ([`run-context.js`](v0_3_2/ui/run-context.js)). Wave Listen urmează același model ca Output + Network Traffic.

**Scenariul tipic: Run script A, apoi Run script B (același tab, aceeași instance)**

```text
… trace script A …
* script stopped listen is OFF
* --- Run start (instance 1) ---
… trace script B …
* script stopped listen is OFF
```

| Aspect | Comportament |
|--------|--------------|
| **Listen** | OFF între run-uri; ON din nou la fiecare Run dacă buton armed |
| **Conținut panel** | **Append** cu separator `* --- Run start (instance N) ---` — **fără auto-clear** la Run (Output face `clearOutput()`; Wave Listen nu) |
| **Clear** | Buton **Clear** pe toolbar panel — singura cale de golire manuală |
| **Buton armed** | Rămâne ON — nu e nevoie să re-armezi între run-uri |

Motivație: panelul e jurnal de debug — păstrarea run-ului A ajută la comparație cu B; separatorul evită confuzia.

**Scenariul: două tab-uri / instance paralele** (ex. tab 1 pe instance 1, tab 2 pe instance 2, ambele rulează)

- Fiecare **run-context** are buffer propriu: `ctx.waveListenLog[]` + `ctx.waveListenActive`
- Panelul afișează **flux multiplexat** — fiecare linie prefixată cu `[inst N]` când **≥2 instance** au listen ON simultan
- Cu o singură instance activă în listen: **fără prefix** (output curat)
- Toolbar badge: `Listening… (inst 1, 2)` sau `Listening… inst 1` dacă una singură

**Schimbare tab** (instance rulează în fundal):

- La switch tab: panelul arată log-ul **tab-ului curent** — din `panelSnapshot.waveListenLog` (extinde snapshot-ul existent) sau live dacă instance încă rulează
- Instance în fundal continuă să acumuleze în `ctx.waveListenLog`; la revenire pe tab → refresh live

**Preempt instance** (tab B preia instance de la tab A):

- Tab A: listen OFF + `* script stopped listen is OFF` (instance preempted)
- Tab B: Run nou → separator + trace proaspăt pe aceeași instance

```mermaid
flowchart TB
  subgraph runA [Run script A]
    A1[listen ON] --> A2[trace lines]
    A2 --> A3[script end]
    A3 --> A4["* script stopped listen is OFF"]
  end
  subgraph runB [Run script B - same tab]
    B1["* --- Run start (inst 1) ---"] --> B2[listen ON]
    B2 --> B3[trace lines]
    B3 --> B4["* script stopped listen is OFF"]
  end
  A4 --> B1
```

#### Niveluri `debugLevel`

| Level | Ce loghează |
|-------|-------------|
| **1** | wave index, commit wire, re-eval LUT/comp, flush deferred show |
| **2** | + fiecare `execWireStatement`, component changes |
| **3** | + valori complete / pending detail (verbose) |

**Exemplu level 1 (panel Wave Listen, nu Output):**

```text
[wave 0] RUN init → exec st(1062:asg) packetEncoded := .huffPacketSC {…}
[wave 1] lut-mut .huff:clear → re-exec st(1062:asg) packetEncoded
[wave 1] commit packetEncoded = ^4808… + 000
[wave 1] flush deferred show(packetEncoded)
```

#### Engine → UI (fără poluare Output)

- `SignalPropagationStrategy.debugLevel` — setat din level UI când **listen ON**
- Stare internă per run-context: `ctx.waveListenActive`, `ctx.waveListenLog[]`
- Helper `emitWaveListenLine(instanceId, text, kind)` — emite dacă instance respectiv are listen ON; append în `ctx.waveListenLog`; notifică panel
- Run start: dacă buton armed → `waveListenActive = true` + separator run (dacă log non-gol); Stop/eroare → `waveListenActive = false` + mesaj stop
- `freezePanelSnapshot` / `panelSnapshot` — include `waveListenLog` pentru restore la schimbare tab

#### Fișiere

- [`v0_3_2/core/signal-propagation.js`](v0_3_2/core/signal-propagation.js) — instrumentare + `debugLevel`
- [`v0_3_2/core/interpreter.js`](v0_3_2/core/interpreter.js) — hook LUT re-eval, emit callback
- [`v0_3_2/ui/wave-listen-panel.js`](v0_3_2/ui/wave-listen-panel.js) — panel nou (model `network-traffic-panel.js` + render ca `appendOutputLine`)
- [`v0_3_2/ui/app.js`](v0_3_2/ui/app.js) — `toggleWaveListen`, wiring dropdown, Run/Stop hooks pentru mesaje legacy/stop
- [`v0_3_2/ui/run-context.js`](v0_3_2/ui/run-context.js) — propagare preferință listen la creare interpreter
- [`v0_3_2/script_editor_v0_3_2.html`](v0_3_2/script_editor_v0_3_2.html) — panel HTML + dropdown item
- [`v0_3_2/doc/debug.md`](v0_3_2/doc/debug.md) — secțiune Wave Listen

#### Teste (fără UI)

- API engine: `strategy.setDebugLevel(n)` + mock `onWaveListenLine` — teste în [`test_suite.js`](v0_3_2/tests/test_suite.js) ~2200+
- Nu testăm keyword inexistent în script

**Acceptance:** Huffman SC round-trip wave — panel ON level 1 arată explicit re-eval după `:clear()`; Output rămâne doar `show`/`peek`; legacy Run → un singur mesaj legacy.

### 1.2 `deps(wireOrExpr)` — dump graf dependențe

**Decizie (2026-07-08):** Acceptă **wire sau expresie**; format **tree text** în Output (ca `Zlist`).

#### Sintaxă

```logts
deps(packetEncoded)              # wire — caz principal
deps(source)
deps(source + codebook)          # expr ad-hoc — upstream only
deps(.huff)                      # LUT instance — stmts sensibile la mutație
```

#### Output tree text — exemplu `deps(packetEncoded)`

```text
=== deps(packetEncoded) ===
Type: 123wire
Producer: 1062:1 — 123wire packetEncoded =: .huffPacketSC { tokens=source, … }

Upstream wires:
  source (32wire)
  codebook (8wire[N])

Upstream LUT / protocol:
  .huff (writable, read)
  protocol .huffPacketSC

NEXT-sensitive inputs: (none)

Downstream consumers (re-exec when packetEncoded changes):
  (none)

LUT-mutation sensitive (re-exec when .huff mutates):
  → producer st(1062:asg) packetEncoded
```

#### Expr fără wire numit

Pentru `deps(source + codebook)`: secțiuni **Upstream** + **NEXT-sensitive**; **Producer / Downstream** = `(ad-hoc expression — no wire producer)`.

#### Date sursă (elaborare)

- `_wireDependentsIndex` — downstream
- `collectWireInputsFromExpr` — upstream
- `_exprReferencesWritableLutInst` + `_exprHasProtocolInvoke` — LUT/protocol
- `exprDependsOnNextCycle` — `~` / `%` / `$`
- Funcționează **identic în wave și legacy** (analiză statică)

#### Fișiere

- [`v0_3_2/core/parser.js`](v0_3_2/core/parser.js) — parse `deps(...)`
- [`v0_3_2/core/interpreter.js`](v0_3_2/core/interpreter.js) — `_execDeps`
- [`v0_3_2/doc/debug.md`](v0_3_2/doc/debug.md)
- Teste ~2200+ — wire, expr, `.huff`, legacy + wave

**Acceptance:** `deps(packetEncoded)` listează `.huff` + `.huffPacketSC` + secțiune LUT-mutation; `deps(source)` arată downstream către `packetEncoded`.

### 1.3 Documentare pattern-uri wave-debug

**Scop:** Secțiune dedicată în [`debug.md`](v0_3_2/doc/debug.md) + link din [`huffman-v2.md`](v0_3_2/doc/huffman-v2.md):

| Pattern | Când |
|---------|------|
| `peek` imediat după encode | Înainte de orice mutație LUT |
| Snapshot literal wire | Înainte de `.huff:clear()` pentru recover |
| `show` doar pe rezultate finale | Wire-uri care nu depind de LUT mutat |
| `probe(.huff:size())` | Witness pentru mutații LUT |
| `watch(ph.*)` | FSM + protocol multi-step |
| Wave Listen panel ON | Vizualizare propagare wave fără poluare Output |

Opțional: exemplu `logts-play wave` minimal reproducer (fără literal manual după ce există `snapshot`).

---

## Strat 2 — Cauzalitate în probe / watch

**Scop:** Extinde mesajele de la `# wire = … - changed` la:

```text
# packetEncoded = … - changed (re-eval ← .huff:clear, stmt st(packetEncoded:asg), wave 1)
```

**Motive propuse (aliniat cu [evaluare_timeline_watch.plan.md](.cursor/plans/evaluare_timeline_watch.plan.md)):**

| Motiv | Sursă |
|-------|-------|
| `initialised` / `changed` / `edge committed` | Existent probe |
| `re-eval ← lutMut` | `_notifyWritableLutMutation` |
| `re-eval ← compMut` | `_notifyComponentComputedMutation` |
| `wave N` | Index în `propagate()` |
| `stmt …` | `execWireStatement` context |
| `next` / `ui` / `seed` | Fază 2 timeline |

**Fișiere:**
- [`v0_3_2/core/interpreter.js`](v0_3_2/core/interpreter.js) — `_probeCauseContext`, `_emitProbeTarget`, `_recordWatchBatch`
- [`v0_3_2/core/signal-propagation.js`](v0_3_2/core/signal-propagation.js) — set/clear context per wave iteration
- [`v0_3_2/ui/timeline-analyzer.js`](v0_3_2/ui/timeline-analyzer.js) — tooltip / culoare marginală pe motiv
- [`v0_3_2/doc/debug.md`](v0_3_2/doc/debug.md)

**Acceptance:** Toggle `.huff:clear()` în panel + `probe(packetEncoded)` distinge commit UI de re-eval declarativă.

---

## Strat 3 — Control și corectitudine structurală

### 3.1 `snapshot(wire)` sau atribut `noReeval`

**Scop:** Îngheață valoarea wire-ului după evaluare reușită; `_notifyWritableLutMutation` sare re-exec unless reassignment explicit sau `unfreeze(wire)`.

**Alternativă sintactică:** atribut pe declarație `123wire packetEncoded noReeval =: .huffPacketSC {…}`

**Beneficiu:** Elimină clasa de bug-uri „encode OK → clear → wire corupt” fără literal manual.

**Fișiere:**
- [`v0_3_2/core/parser.js`](v0_3_2/core/parser.js), [`interpreter.js`](v0_3_2/core/interpreter.js) — metadata wire
- [`signal-propagation.js`](v0_3_2/core/signal-propagation.js) — filtru în re-eval paths
- Doc + teste round-trip SC fără workaround literal

**Decizie de elaborat:** statement `snapshot(w)` vs atribut vs ambele.

### 3.2 Dependențe protocol → LUT generalizate

**Scop:** Înlocuiește hardcod `instName === '.huff' && _exprHasProtocolInvoke` (L904) cu map elaborat `lutInst → wire stmts` bazat pe analiza def protocol (`expand`, `collapse`, `codebookLoad`).

**Fișiere:**
- [`interpreter.js`](v0_3_2/core/interpreter.js) — elaborare protocol
- [`protocol-assembler.js`](v0_3_2/core/protocol-assembler.js) dacă e nevoie de metadata suplimentar
- [`signal-propagation.md`](v0_3_2/doc/signal-propagation.md), [`protocol.md`](v0_3_2/doc/protocol.md)

### 3.3 Wave step debugger (UI)

**Scop:** Buton „Step wave” — oprește după fiecare `commitPendingWires` + batch `execWireStatement`, nu doar RUN/NEXT complet.

**Fișiere:** [`app.js`](v0_3_2/ui/app.js), eventual API nou pe interpreter pentru breakpoint în `propagate()`.

**Prioritate:** După Wave Listen — reutilizează aceeași instrumentare `debugLevel`.

---

## Ordine recomandată de implementare

| # | Item | Efort | Impact |
|---|------|-------|--------|
| 1 | Wave Listen panel (debugLevel) | Mediu | Foarte mare |
| 2 | deps() | Mic | Mare |
| 3 | Doc pattern-uri | Mic | Mediu |
| 4 | cause în probe/watch | Mediu | Foarte mare |
| 5 | snapshot() | Mediu–mare | Foarte mare |
| 6 | protocol deps | Mare | Mare (corectitudine) |
| 7 | step debugger UI | Mare | Mediu–mare |

---

## Scenarii de test (regresie)

1. **Huffman SC round-trip wave** — script din `huffman-v2.md`; trace arată re-eval; după `snapshot`, recover fără literal
2. **peek vs show** — teste existente **807**, **813** — fără regresie
3. **probe duplicate** — debug.md L415 — cause nu dublează output inutil
4. **Legacy mode** — Wave Listen: mesaj unic legacy; `deps()` funcționează normal
5. **FSM + NEXT** — `watch(ph.*)` cu motive `next` / `edge committed`

---

## Note pentru elaborare viitoare

- **Nu înlocuiește** wave engine — complementează observabilitatea
- **Overlap intenționat** cu todo-urile pending din `evaluare_timeline_watch.plan.md` — la implementare strat 2, unificăm
- **Implementarea e pe faze separate** — fiecare strat poate fi livrat independent
- **Quick win fără cod:** pattern-urile din strat 1.3 sunt deja parțial în `huffman-v2.md` — pot fi extrase în `debug.md` independent de engine

---

## Decizii Strat 1 (confirmate 2026-07-08)

| Item | Decizie |
|------|---------|
| **1.1 activare trace** | Panel UI „Wave Listen” — **fără** keyword în script |
| **1.1 destinație output** | Panel dedicat, nu Output |
| **1.1 buton vs listen** | **Buton** = panel armat (persistă); **Listen** = intern, activ doar cât rulează scriptul |
| **1.1 controale** | Buton ON/OFF + level 1/2/3; level păstrat la buton OFF |
| **1.1 legacy** | `* Script runs in mode legacy, listen is ON/OFF` (stare listen, nu buton) |
| **1.1 stop** | `* script stopped listen is OFF` — listen OFF; buton neschimbat |
| **1.1 multi-run** | Append + separator; **fără auto-clear**; Clear doar via buton toolbar |
| **1.1 clear** | Buton Clear pe toolbar panel (confirmat 2026-07-08) |
| **1.1 multi-instance** | Buffer per run-context; prefix `[inst N]` când ≥2 listen paralele |
| **1.1 toolbar** | Badge „Listening…” când listen activ |
| **1.2 deps** | Wire + expr, format tree text, secțiune LUT-mutation |

### Recomandări tehnice (de inclus la implementare)

1. **Toolbar badge:** „Listening…” / „Listening… (inst 1, 2)” — distinct de buton armed.
2. **Run-uri consecutive:** append + separator; **niciodată** auto-clear la Run.
3. **Clear:** buton pe toolbar panel; ring buffer ~2000 linii per instance la level 3.
4. **Culori panel:** ex. `[wave N]` neutru, `lut-mut` portocaliu, `[inst N]` mov discret, `** meta` gri italic, `*` status albastru.
5. **Mid-run buton OFF:** oprește listen imediat pe instance respectiv; fără trace retroactiv.
6. **Teste engine:** per-instance `waveListenActive` + `setDebugLevel` + callback mock.
7. **Step debugger (3.3):** reutilizează același panel / buffer Wave Listen.
