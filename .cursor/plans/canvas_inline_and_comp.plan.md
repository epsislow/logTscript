---
name: inline canvas + comp canvas
overview: "Plan nou — `inline [canvas]` + `comp [canvas]`. Faze 1–11 done; Faza 12 ready (hitbox/input 1+f); backlog 1+c…"
todos:
  - id: canvas-deferred-table
    content: Menține tabel backlog 1+a … (if/loops/sprite/input/…)
    status: pending
  - id: canvas-f1
    content: "Faza 1: parse inline/comp [canvas] + attrs — D1–D12 done"
    status: completed
  - id: canvas-f2
    content: "Faza 2: limbaj draw + builtins — D13–D28 done"
    status: completed
  - id: canvas-f3
    content: "Faza 3: renderer + wire args + clear/busy — D29–D40 done"
    status: completed
  - id: canvas-f4
    content: "Faza 4: doc EN + teste + observe e2e — D43–D48 done"
    status: completed
  - id: canvas-f5
    content: "Faza 5: fontFamily + fontStyle + textAlign start/end — D49–D52 ✅ done"
    status: completed
  - id: canvas-f6
    content: "Faza 6: drawSymbol + symbolSize/symbolStyle — D53–D61 ✅ done"
    status: completed
  - id: canvas-f7
    content: "Faza 7: if/else în body canvas — D62–D68 ✅ done"
    status: completed
  - id: canvas-f8
    content: "Faza 8: for/while loops + break/continue — 1+b → D69–D75 done"
    status: completed
  - id: canvas-f9
    content: "Faza 9: vector wire args — 1+l → D76–D83 done"
    status: completed
  - id: canvas-f10
    content: "Faza 10: path API + fill/stroke — 1+e + 1+i → D84–D90 done"
    status: completed
  - id: canvas-f11
    content: "Faza 11: vectori locali + rotatePoint — 1+q → D91–D101 done"
    status: completed
  - id: canvas-f12
    content: "Faza 12: hitbox + input events + pouts — 1+f → D102–D117 (ready)"
    status: pending
isProject: false
---

# Plan: `inline [canvas]` + `comp [canvas]` — desen 2D

> **Plan nou** (nu continuare logic2). Decizii de la **D1**; faze **1–12**; amânări **1+c, …** (fără **1+k**, **1+n**, **1+a**, **1+b**, **1+l**, **1+e**, **1+i**, **1+q**, **1+f** promovat **F12**).  
> **Sketch sursă:** [canvas_component.md](../my_ideas/canvas_component.md) (chat 2026-08-31).  
> **Separat de:** [inline_logic2.plan.md](inline_logic2.plan.md) (`observe` → pout → canvas inputs); [comp_clcd.plan.md](comp_clcd.plan.md) (CLCD = simboluri pe biți, **nu** API draw liber).  
> **Continuare globală teste:** alocare draft **4700+** (după hotkey/CLCD ~4663).

---

## Pachet confirmare — prioritate

User confirmă în scris `D#: literă` (ex. `D1 A`, `D5 A`, …). Ordine: **întâi Faza 1 (D1–D12)** → F1 poate deveni **(ready-to-implement)**; apoi F2/F3/F4.

### Batch F1 — confirmat user 2026-08-31

```text
D1 A ✅
D2 A ✅
D3 A ✅ — width/height fixe la elaborare; fără resize runtime
D4 D ✅ — fără default; width și height obligatorii (parse error dacă lipsesc)
D5 A ✅
D6 B ✅
D7 B ✅ — default bgColor ^000000 (tema dark, ca CLCD)
D8 A ✅
D9 A ✅
D10 A ✅
D11 A ✅
D12 A ✅
```

> **D6 B:** braces `{ }` — confirmat cu D5.  
> **D4:** opțiune nouă **D (change)** — nu exista în tabelul inițial; user respinge A/B/C (defaults).

### Batch F2 — confirmat user 2026-09-01

```text
D13 A ✅
D13b A ✅
D14 A ✅
D16 A ✅
D18 A ✅ → **superseded D18b** user 2026-09-01
D19/D19b → **superseded D19c** ✅
D21/D21b → **superseded D21c** ✅
D16b ✅ — user 2026-09-01
D18b ✅ — user 2026-09-01
D19c A ✅
D21c A ✅
D22a ✅ D22b ✅ D22c ✅ D22d A ✅ — user 2026-09-01
D20 A ✅
D15 A ✅
D17 A ✅
D23 A ✅
D24 A ✅
D25 A ✅
D26 A ✅
D27 A ✅
D28 A ✅
```

> **F2 (ready-to-implement)** — **D13–D28 ✅** (D17 A user 2026-09-01).

### Batch F12 — confirmat user 2026-09-02

```text
D102 A ✅
D103 A ✅ — doar rect; circle/polygon/path → backlog 1+s
D104 A ✅
D105 A ✅
D106 A ✅
D107 C ✅
D108 A ✅
D109 B ✅
D110 A ✅
D111 A ✅
D112 C ✅ — format explicit pe pout; eventX/eventY în when = number obișnuit
D113 A ✅ — litereale only; fără wireRefs în rect
D114 A ✅
D115 A ✅
D116 A ✅
D117 A ✅ — initDraw + exec renderer obligatoriu
```

> **F12 (ready-to-implement)** — **D102–D117 ✅**.

---

## Legenda

| Marcaj | Semnificație |
| ------ | ------------ |
| **(recommended)** | Opțiunea recomandată de analiză |
| **(change)** | Alternativă validă; diferă de sketch sau de direcția implicită |
| **(ready-to-implement)** | Faza poate începe după confirmarea deciziilor ei |
| **(completed)** | Decizie luată / fază implementată |
| **1+a … 1+z** | Faze **amânate** — vezi [Backlog faze amânate](#backlog-faze-amânate-1a--1z) |
| ✅ | Backlog **promovat / livrat** |
| ❌ | Backlog **respins** definitiv |
| 🟠✗ | Backlog **închis** — alternativa nu se face |
| ⏳ | Backlog **deschis** — încă amânat |
| ⏸ | Backlog **pause** — idee, fără promovare fază |

**Notă:** **D1+** sunt **locale acestui plan**. Nu importă numerotarea din logic2/hotkey. Breaking față de alte planuri = notă cross-link, nu reutilizare ID.

---

## Reguli planului

1. **Plan izolat:** numerotare **Faza 1, 2, 3, 4** + subfaze **F1a, F1b, …**; decizii **D1, D2, …**.
2. **Confirmare:** user confirmă **A/B/C** în scris; până atunci **draft**.
3. **Backlog amânat:** ID **1+a, 1+b, …** — tabel master mai jos; promovare → **Faza N** cu secțiune completă.
4. **Implementare:** pattern legacy + wave în `tests/test_suite.js`; doc EN în `v0_3_2/doc/`; `node _run_test_suite_node.js -q` + `_verify_doc_examples.js` la done.
5. **Fără întrebări în chat pentru draft:** opțiunile stau în tabel + detaliu sub tabel.
6. **Sketch ≠ spec:** sketch-ul poate conține lacune/erori — analiza notează **(change)** unde e cazul.
7. **Principiu arhitectură (din sketch):** logic = **ce stare**; canvas = **cum se desenează**; `observe` = punte (depinde de F108 logic, nu de acest plan).

---

## Stare la handoff (azi)

| Existent azi | Relevant canvas |
| ------------ | --------------- |
| `inline [logic]` / `comp [logic]` | Pattern inline+comp de urmat |
| `inline` kinds: `asm`, `lut`, `protocol`, `plc`, `logic` | **`canvas` necunoscut** → parse error |
| `comp [clcd]` / LCD / servo widgets | Canvas DOM + `getContext('2d')` + rAF — **pattern UI** |
| Culori pe comps: `^aaffaa` / wire color | Sketch folosește `"aaffaa"`; **`#` = comentariu** în LogTScript |
| `set` pe logic/clcd | Control pin existent ca model |
| `busy` pe DMA/CPU | Model pout status |
| **Nu există** `inline [canvas]` / `comp [canvas]` | Feature nou |
| **Nu există** limbaj draw (rect/text/line/circle) | Feature nou |
| Logic `observe` (F108) | Consumator downstream — **nu** blocant MVP canvas |

**Teste:** alocare canvas draft **4700+**.

---

## Mapare decizii → faze

| Fază | Decizii | Status |
| ---- | ------- | ------ |
| **Faza 1** Scaffold parse + device + attrs | **D1–D12** | **done** |
| **Faza 2** Limbaj draw + builtins | **D13–D28** | **done** |
| **Faza 3** Renderer + wires + set/draw/busy/clear | **D29–D40** | **done** |
| **Faza 4** Doc + teste + integrare observe | **D43–D48** | **done** |
| **Faza 5** Font family + `fontStyle` (**1+k**) | **D49–D52** | **done** |
| **Faza 6** CLCD symbols `drawSymbol` (**1+n**) | **D53–D61** | **done** |
| **Faza 7** `if` / `else` în body (**1+a**) | **D62–D68** | **done** |
| **Faza 8** Loops `for` / `while` (**1+b**) | **D69–D75** | **done** |
| **Faza 9** Vector wire args (**1+l**) | **D76–D83** | **done** |
| **Faza 10** Path / arc / bezier / polygon + `fill`/`stroke` (**1+e** + **1+i**) | **D84–D90** | **done** |
| **Faza 11** Vectori locali + `rotatePoint` (**1+q**) | **D91–D101** | **done** |
| **Faza 12** Hitbox + input + event pouts (**1+f**) | **D102–D117** | **ready-to-implement** |
| *(amânate)* | **1+c …** (fără 1+a, 1+b, 1+e, 1+i, 1+f, 1+k, 1+l, 1+n, 1+q) | — |

---

## Backlog faze amânate (1+a … 1+z)

Tabel master — itemi **amânați**. **Stare:** ⏳ deschis · ✅ promovat/livrat · ⏸ pause.

| Stare | ID | Subiect | Detaliu | Fază draft | Legat de |
| ----- | -- | ------- | ------- | ---------- | -------- |
| ✅ | **1+a** | `if` / conditional draw | `if` / `else` în body metodă; comparații în condiție | **Faza 7** | D62–D68, D26 |
| ✅ | **1+b** | Loops `for` / `while` | C-style `for`; `while (cond)`; body metodă | **Faza 8** | D69–D75 |
| ⏳ | **1+c** | Imagini / sprite sheet | `drawImage`, load asset | — | post-MVP |
| ⏳ | **1+d** | Transform (rotate/scale/translate) | Stack `save`/`restore` JS | — | post-MVP |
| ✅ | **1+e** | Path / arc / bezier / polygon | `beginPath` … `fill`/`stroke` | **Faza 10** | D84–D90 |
| ✅ | **1+f** | Input mouse/touch — hitbox + events | `hitbox { }`, `renderer when`, pouts | **Faza 12** | D102–D115, CLCD touch |
| ⏳ | **1+g** | Clip / partial dirty rect | Optimizare redraw regiuni | — | D36 |
| ⏳ | **1+h** | Layer / offscreen buffer | Multi-layer compose | — | — |
| ✅ | **1+i** | `fill` vs `stroke` separate API | `fill()` / `stroke()` pe path | **Faza 10** | D87, D18 |
| ⏳ | **1+j** | Alpha 8-hex | `"rrggbbaa"` — **D16b** ✅; fără keyword `transparent` |
| ✅ | **1+k** | Font family + `fontStyle` | **`fontFamily("mono"\|"sans"\|"serif")`**; **`fontStyle(family, size)`**; + `textAlign` `start`/`end` | **Faza 5** | D22e, D49–D52 |
| ⏳ | **1+p** | Text contur (`strokeText`) | `drawText` = fill only (**D22c**); contur → backlog | — | D22c |
| ⏳ | **1+r** | Builtin `clear()` canvas | Clear parțial / `bgColor` din script | — | D115 |
| ⏳ | **1+s** | Hitbox geometrie extinsă | `circle`, `polygon`, path hit-test — post-F12 rect MVP | — | D103 |
| ✅ | **1+l** | Vector wire args (`shotsXVector/s16`) | D34 amânat MVP scalar F3 | **Faza 9** | D76–D83, D33, D34 |
| ⏳ | **1+m** | Multiple `inline [canvas]` pe un comp | Switch renderer runtime | — | D8 |
| ✅ | **1+n** | **CLCD symbols pe canvas** (`drawSymbol`) | **`drawSymbol`**, `symbolSize`, `symbolStyle`, `symbolBits`; registry shared | **Faza 6** | D53–D61 |
| ✅ | **1+q** | Vectori locali + `rotatePoint` | Literali `[]`, append, `+=`, fără nested MVP | **Faza 11** | D91–D101 |
| ⏳ | **1+o** | Vectori nested (`xs[i]=vector`) | Amânat post-F11 | — | D92 |

**Ordine recomandată:** **F1–F11** ✅; **F12** (hitbox/input) draft; apoi **1+c** / **1+d** la cerere.

---

## Backlog **1+l** → **Faza 9** (promovat)

Vezi [Faza 9](#faza-9--vector-wire-args-renderer-1l-promovat) — pin vector din `renderer`, decode per element, index în body metodă.

---

## Backlog **1+e** + **1+i** → **Faza 10** (promovat)

Vezi [Faza 10](#faza-10--path-api--fillstroke-1e--1i-promovat) — API path imperativ Canvas 2D + `fill()` / `stroke()` pe path curent.

---

## Backlog **1+q** → **Faza 11** (promovat)

Vezi [Faza 11](#faza-11--vectori-locali--rotatepoint-1q-promovat) — literali vector, mutare locală, `rotatePoint`, `polygon` numeric strict.

---

## Backlog **1+f** → **Faza 12** (promovat)

Vezi [Faza 12](#faza-12--hitbox--input-events--pouts-1f-promovat) — hitbox / `initDraw` / `renderer when` / pouts; decizii **D102–D117** confirmate.

---

## Backlog post-MVP (2+a … 2+z)

| Stare | ID | Subiect | Detaliu | Fază draft | Legat de |
| ----- | -- | ------- | ------- | ---------- | -------- |
| ⏸ | **2+a** | WebGL / 3D | Out of scope 2D | — | — |
| ⏸ | **2+b** | Export PNG / screenshot pin | — | — | — |
| ⏸ | **2+c** | *(slot liber)* | — | — | — |

---

## Analiză direcție (sketch — global)

**Ce se dorește:**

```text
inline [canvas]  →  metode de desen reutilizabile (implementare vizuală)
comp [canvas]    →  instanță <canvas> + legături input + când se redesenează
logic + observe  →  stare → wire → canvas input → set/dirty → renderer → pixeli
```

**Potrivire cu codebase:**

| Building block | Stare | Canvas |
| -------------- | ----- | ------ |
| `parseInline` kinds | fără `canvas` | F1 — extindere |
| Comp registry + Devices panel | CLCD/LCD pattern | F1 — `canvas.js` + widget |
| Property block `.comp:{ … set = 1 }` | logic/clcd | F3 — `set`/`draw`/`busy` |
| rAF coalesce | `clcd-widget`, `panel-anim-raf` | F3 — dirty single-slot |
| Expr aritmetică | logic `is/2`, wire expr | F2 — **subset nou** în body canvas (fără Prolog) |

**Lacune / posibile erori în sketch:**

| # | Observație | Impact | Decizie |
| - | ---------- | ------ | ------- |
| 1 | Inline arată **doar semnături** `drawBg(...)` — **fără body** | Fără body nu există desen | **D5 (change)** — metode **cu body** |
| 2 | **Cum se leagă** `inline` de `comp`? Sketch omite `use`/program block | Binding obligatoriu | **D8** |
| 3 | Culori `"aaffaa"` vs ecosistem `^aaffaa` | Consistență + `#` comentariu | **D16** |
| 4 | `renderer { }` e în **comp body** sau în **exec block** `.comp:{ }`? Sketch amestecă | Parse + semantică | **D29** |
| 5 | Args `xWire/s16` — codec existent logic vs tip nou canvas | Reuse vs invent | **D33** |
| 6 | `busy` synchronous pe rAF? JS e single-thread — busy scurt | Semantică reală | **D38** |
| 7 | `draw` vs `set` — ambele schedule; diferența „immediate” e subtilă în browser | Clarificare | **D35–D37** |
| 8 | Fără `if`/`for` — scene complexe greu de scris | Acceptat MVP; backlog **1+a/1+b** | — |
| 9 | Clear canvas la fiecare frame? Sketch nu spune | Artefacte / flicker | **D36** |
| 10 | Parametri metodă vs variabile locale vs pinuri | Scope limbaj | **D14–D15** |

**Verdict:** direcția sketch e **coerentă** (separare logic/render + dirty coalesce). Spec-ul de implementare trebuie să **completeze** body-urile metodelor, binding inline↔comp, și subsetul de limbaj draw (builtins + aritmetică + assign). Nu e nevoie de motor logic în canvas.

---

## Faza 1 — Scaffold: `inline [canvas]` + `comp [canvas]` + device + atribute **(draft)**

> **Status:** draft — așteaptă **D1–D12**.  
> **Livrabil:** parse OK, componentă înregistrată, panou Devices cu `<canvas>` gol (bgColor), fără draw API încă.

### Problemă (azi)

| Situație | Comportament azi |
| -------- | ---------------- |
| `inline [canvas] .r:` | **Parse error** — unknown kind |
| `comp [canvas] .c:` | **Unknown component** |
| Device canvas user-draw | **Nu există** (doar CLCD/LCD interne) |

### Sintaxă țintă (F1 — structură)

```logts
inline [canvas] .gameRenderer:

    /* F1: poate accepta body gol sau doar declarații metode stub;
       body real + builtins → Faza 2 */

:

comp [canvas] .myCanvas:

    width: 512
    height: 512
    bgColor: ^000000

    .gameRenderer { }
:
```

### Atribute componentă (cerință user)

| Atribut | Tip | Default | Rol |
| ------- | --- | ------- | --- |
| `width` | int | **obligatoriu** (**D4 D✅**) | lățime canvas (px); setat o dată la definirea comp |
| `height` | int | **obligatoriu** (**D4 D✅**) | înălțime px; setat o dată |
| `bgColor` | color | **`^000000`** (**D7 B✅**) | fundal clear/init — ca CLCD dark |

### Decizii **D1–D12** (draft)

| ID | Subiect | Opțiuni |
| -- | ------- | ------- |
| **D1** | Kind name | **A (recommended)** `canvas` · **B** `draw` · **C** `gfx` |
| **D2** | Device UI | **A (recommended)** panou Devices ca CLCD (un `<canvas>` per comp) · **B** doar offscreen (fără widget) |
| **D3** | `width`/`height` mutable runtime | **A (recommended)** parse-time only (ca CLCD) · **B** pins resize · **C** property block |
| **D4** | Defaults `width`/`height` | **A** 320×240 · **B** 512×512 · **C** 200×100 · **D (change) ✅** **fără default** — ambele atribute **obligatorii** |
| **D5** | Formă `inline [canvas]` | **A (change, recommended)** metode **cu body** `{…}` sau indent block · **B** doar semnături (sketch literal — insuficient) · **C** semnături în inline + body în fișier separat |
| **D6** | Delimitare body metodă | **A** indent până la next method · **B (change, recommended)** braces `{ }` obligatoriu · **C** `name(args): … :` |
| **D7** | Default `bgColor` | **A (recommended)** `"ffffff"` · **B** `"000000"` · **C** transparent (fără fill init) |
| **D8** | Binding inline → comp | **A (recommended)** program block `.rendererName { }` ca logic · **B** `use .renderer` · **C** `renderer: .gameRenderer` attr · **D** implicit același nume |
| **D9** | Comp fără inline | **A (recommended)** elaboration error · **B** permis (doar clear bg) · **C** builtins doar în `renderer` exec (fără inline) **(change)** |
| **D10** | Allow policy | **A (recommended)** `inline.type{canvas}` + `comp.type{canvas}` ca logic · **B** mereu allowed |
| **D11** | Fișiere | **A (recommended)** `core/components/canvas.js` + `devices/canvas-widget.js` + assembler dedicat · **B** tot în un fișier |
| **D12** | Teste F1 | **A (recommended)** parse + registry + width/height/bgColor; ID **4700+** · **B** doar parse |

### D1 — Kind name

**Ce înseamnă „Kind name”:** cuvântul din parantezele pătrate după `inline` / `comp` — **identificatorul tipului** de modul inline sau componentă.

```logts
inline [canvas] .gameRenderer:    ← kind = canvas
comp [canvas] .myCanvas:          ← kind = canvas
```

Analogii existente în LogTScript:

| Kind | Rol |
| ---- | --- |
| `logic` | motor Prolog inline + comp logic |
| `clcd` | display simboluri pe biți |
| `asm`, `lut`, `protocol`, `plc` | alte inline-uri |

Parserul (`parseInline`) acceptă azi doar lista fixă de kinds; pentru canvas trebuie adăugat **`canvas`** în acea listă + înregistrare `CanvasComponent`.

| | |
| - | - |
| **A (recommended)** | `inline [canvas]` / `comp [canvas]` — aliniat sketch + element HTML `<canvas>` |
| **B** | `draw` — scurt, dar **confuz** cu pinul de control `draw` (redraw) |
| **C** | `gfx` — nefolosit în sketch |

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D2 — Device UI

| | |
| - | - |
| **A (recommended)** | Widget în panoul Devices — un `<canvas>` DOM per `comp [canvas]` (pattern CLCD/LCD) |
| **B** | Offscreen only — fără panou |

**Decizie:** **A ✅** — confirmed user 2026-08-31.

### D3 — `width` / `height` — ce înseamnă „mutable”

În plan, **mutable** = poate fi **schimbat după ce comp-ul există** (runtime), de ex. prin pin `width`, property block `.canvas:{ width = 800 }`, sau resize dinamic.

| Opțiune plan | Semnificație |
| ------------ | ------------ |
| **A** | Dimensiunea se citește **o singură dată** la parse/elaboration din atributele `width:` / `height:` — apoi **fixă** |
| **B** | Pinuri wire care pot redimensiona canvas la fiecare wave |
| **C** | Resize prin property block exec |

**Confirmare user:** width și height sunt **atribute de componentă**, se inițializează **o dată** și **nu se mai schimbă** → **D3 A ✅**.

Implementare: `comp [canvas]` **fără** `width`/`height` ca pin sau property mutabilă; lipsă atribut → eroare (**D4**).

### D4 — Defaults dimensiuni

| | |
| - | - |
| **A** | Default 320×240 dacă omit user |
| **B** | Default 512×512 |
| **C** | Default 200×100 |
| **D (change) ✅** | **Fără default** — `width:` și `height:` **obligatorii**; `comp [canvas] .x:` fără ele → **parse/elaboration error** |

Exemplu valid:

```logts
comp [canvas] .board:
    width: 512
    height: 512
    bgColor: ^000000
    .gameRenderer { }
:
```

**Decizie:** **D ✅** — confirmed user 2026-08-31.

### D5 — Semnături vs body **(change față de sketch)**

Sketch:

```text
inline [canvas] .gameRenderer
    drawBg(x, y, width, height, color)
```

**Problemă:** fără body, `drawBg` nu poate apela builtins. User cere builtins + aritmetică în canvas.

| | |
| - | - |
| **A (change, recommended)** | Metodă = nume + params + **body** cu statements draw/assign |
| **B** | Doar semnături (sketch) — **respins practic** pentru MVP util |
| **C** | Semnături în inline; implementare JS host — out of LogTScript |

Exemplu țintă **A** (cu **D6 B** braces):

```logts
inline [canvas] .gameRenderer:

    drawBg(x, y, w, h, color) {
        style(color)
        drawRect(x, y, w, h)
    }

    drawPlayer(x, y, name, health) {
        style("0000ff")
        drawCircle(x, y, 12)
        style("000000")
        drawText(x, y - 20, name)
    }
:
```

**Decizie:** **A ✅** — confirmed user 2026-08-31.

### D6 — Delimitare body metodă

| | |
| - | - |
| **A** | Indent |
| **B** | `{ }` obligatoriu după semnătură |
| **C** | `drawBg(...): … :` |

**Decizie:** **B ✅** — confirmed user 2026-08-31 (cu D5).

### D7 — Default `bgColor`

| | |
| - | - |
| **A** | `"ffffff"` |
| **B ✅** | **`^000000`** — fundal negru, aliniat CLCD + tema dark Devices |
| **C** | transparent |

**Notă:** pe **atribut comp** folosim sintaxa existentă **`^000000`** (ca `clcd.md`), nu `#000000` — `#` rămâne comentariu în LogTScript. În **body metode** canvas, culorile rămân string `"rrggbb"` conform **D16**.

**Decizie:** **B ✅** — confirmed user 2026-08-31.

### D8 — Binding inline → comp

Sketch **nu** arată legătura. Pattern logic (cod real):

```logts
comp [logic] .L:
    .world { }
```

Parser: `compType === 'logic'` + `.ref { bodyRaw }` → `attributes.logicPrograms`.

| | |
| - | - |
| **A (recommended)** | Același pattern: `comp [canvas] .C: .gameRenderer { }` → `canvasPrograms` / `canvasRenderers`; body block **gol în F1**; F3 poate pune mapări pin dacă **D30 B** |
| **B** | `use .gameRenderer` — keyword nou |
| **C** | `renderer: .gameRenderer` — attr scalar |
| **D** | basename identic obligatoriu — fragil la rename |

**MVP A:** un singur inline per comp; multiple → **1+m**.

Exemplu F1:

```logts
comp [canvas] .myCanvas:

    width: 512
    height: 512
    bgColor: ^000000

    .gameRenderer { }
:
```

**Decizie:** **A ✅** — confirmed user 2026-08-31.

### D9 — Comp fără inline

**Decizie:** **A ✅** — elaboration error.

### D10 — Allow / NotAllow

**Decizie:** **A ✅** — `inline.type{canvas}` + `comp.type{canvas}`.

### D11 — Layout fișiere

**Decizie:** **A ✅** — split `canvas.js` + `canvas-widget.js` + assembler/engine.

### D12 — Teste F1

| ID draft | Caz |
| -------- | --- |
| 4700 | parse `inline [canvas]` minimal |
| 4701 | parse `comp [canvas]` + attrs obligatorii + `.renderer { }` |
| 4702 | parse error — lipsește `width` sau `height` (**D4 D**) |
| 4703 | default `bgColor` ^000000 când omit (**D7 B**) |
| 4704 | explicit width/height/bgColor |
| 4705 | missing inline ref → elaboration error (**D9 A**) |
| 4706 | Allow policy reject (**D10 A**) |

**Decizie:** **A ✅** — confirmed user 2026-08-31 (detaliu test IDs alocat în plan).

### Arhitectură F1–F3

```mermaid
flowchart TB
  subgraph dsl [DSL]
    Inline["inline [canvas] methods+bodies"]
    Comp["comp [canvas] attrs + .renderer ref"]
    Exec[".canvas:{ renderer { calls } set/draw }"]
  end

  subgraph core [Core]
    Asm["canvas-assembler"]
    Eng["canvas-engine"]
    CompJS["components/canvas.js"]
  end

  subgraph ui [Devices]
    Widget["canvas-widget.js"]
    DOM["HTMLCanvasElement 2d"]
  end

  Inline --> Asm
  Comp --> CompJS
  Exec --> CompJS
  Asm --> Eng
  CompJS --> Eng
  Eng --> Widget
  Widget --> DOM
```

### Scope F1 (subfaze)

| Subfază | Conținut |
| ------- | -------- |
| **F1a** | Parser: kind `canvas`; stub inline body; attrs `width`/`height`/`bgColor` |
| **F1b** | `CanvasComponent` + register + validate attrs |
| **F1c** | `canvas-widget.js` — create/resize `<canvas>`, fill `bgColor` |
| **F1d** | Teste **4700+** + doc stub `canvas.md` (minimal) |

### Criterii done F1

- [ ] `inline [canvas]` / `comp [canvas]` parse fără eroare (cu binding D8)
- [ ] Device vizibil; dimensiuni + bgColor aplicate
- [ ] Policy Allow/NotAllow (D10)
- [ ] Teste F1 verzi; **nu** încă builtins

### Status F1

**(ready-to-implement)** — **D1–D12✅** (D1 A user 2026-09-01).

---

## Faza 2 — Limbaj draw: expresii, asignări, builtins **(ready-to-implement)**

> **Status:** **(ready-to-implement)** — **D13–D28 ✅** (D17 A user 2026-09-01).  
> **Depinde:** F1.  
> **Out of scope:** `if`, loops (**1+a**, **1+b**).

### Cerințe user (confirmate ca intent)

| Cerință | Interpretare |
| ------- | ------------ |
| builtins tip JS canvas | `drawRect`, `drawText`, `drawLine`, `drawCircle`, `style` |
| `#` = comentariu | **niciodată** culoare `#rrggbb` |
| text `"..."` | string literal |
| int / float | `1`, `34`, `1.3`, `1.444` |
| aritmetică | `x + 10`, `x - (y * 3)`, paranteze |
| asignări | `a = 31 + (b / 3) * 2 - (b - 3)` |
| fără `if` / `for` / `while` | backlog |

### Gramatică draft (body metodă)

```text
method     := name '(' params? ')' '{' stmt* '}'     # D6 B
params     := id (',' id)*
stmt       := assign | call
assign     := id '=' expr
call       := name '(' args? ')'
args       := expr (',' expr)*
expr       := term (('+'|'-') term)*
term       := factor (('*'|'/') factor)*
factor      := number | float | string | id | '(' expr ')' | '-' factor
```

**Interzis MVP:** `if`, `while`, `for`, `==`, `<`, `&&`.

### Sintaxă țintă (body metodă)

```logts
inline [canvas] .demo:

    drawBox(x, y, w, h, color) {
        pad = 2
        style(0, color)
        drawRect(x + pad, y + pad, w - pad * 2, h - pad * 2)
        style("000000", 0, 1)
        drawLine(x, y, x + w, y + h)
        drawCircle(x + w / 2, y + h / 2, 4, "0000ff", 0)
        drawText(x, y - 12, "box")
    }
:
```

### Decizii **D13–D28** (draft)

| ID | Subiect | Opțiuni |
| -- | ------- | ------- |
| **D13** | Unde rulează statements | **A (recommended)** doar în body metode inline · **B** și în `renderer` comp · **C** doar în renderer **(change)** |
| **D13b** | Apel metodă→metodă | **A (recommended)** permis · **B** interzis MVP · **C** max depth N |
| **D14** | Scope variabile | **A (recommended)** local per apel metodă · **B** state persistent pe comp · **C** `static` |
| **D15** | Params metode | **A (recommended)** by-value la apel; shadow pe locals · **B** mutable ref |
| **D16** | Literali culoare | **A (recommended)** string hex `"rrggbb"` / `"rgb"` (3 sau 6) · **B** doar `^rrggbb` (ecosistem comps) · **C (change)** ambele `"…"` și `^…` · **D** interzis `#…` (obligatoriu — aliniat user) |
| **D17** | Normalizare culoare intern | **A (recommended)** → CSS `#rrggbb` doar în widget JS · **B** păstrează fără `#` în tot stack-ul |
| **D18** | `style(...)` | **superseded → D18b** |
| **D19** | `drawRect` | **superseded → D19c** |
| **D20** | `drawLine` | **A ✅** stroke din styleStroke |
| **D21** | `drawCircle` | **superseded → D21c** |
| **D16b** | transparență | **✅** `0`/`"0"` + `"rrggbb"` / `"rrggbbaa"` |
| **D18b** | styleFill / styleStroke / style | **✅** |
| **D19c** | drawRect fill+stroke | **✅** |
| **D21c** | drawCircle fill+stroke | **✅** |
| **D22** | `drawText` | **A (recommended)** (x,y,text) font default monospace 14 · **B** + size · **C** + font args (**1+k**) |
| **D23** | Operatori aritmetici MVP | **A (recommended)** `+ - * /` + paranteze · **B** + `%` · **C** + `//` floor div |
| **D24** | Diviziune | **A (recommended)** float JS (`/`) · **B** int trunc · **C** eroare dacă mix int/float fără cast |
| **D25** | Tipuri în expr | **A (recommended)** number unificat (IEEE) la runtime draw · **B** int/float distincte cu erori |
| **D26** | Comparații / bool | **A (recommended)** **interzis** MVP (fără if) · **B** permis dar inutil |
| **D27** | Erori runtime draw | **A (recommended)** elaboration unde e static; runtime → log + skip op · **B** stop renderer · **C** set pout `error` |
| **D28** | Comentarii în body | **A (recommended)** `#` line comment (ca restul LogT) · **B** `/* */` only |

### D13 — Unde rulează statements

| | |
| - | - |
| **A (recommended)** | Body metode = assign + builtins; `renderer { }` doar **invocă** metode (sketch) |
| **B** | + statements brute în `renderer` |
| **C (change)** | Totul în `renderer` — slăbește reuzarea |

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D13b — Compoziție metode

```logts
drawFrame(x, y) {
    drawBg(0, 0, 320, 240, "ffffff")
    drawPlayer(x, y, "p1", 100)
}
```

| | |
| - | - |
| **A (recommended)** | Permis — altfel scenele se copiază în `renderer` |
| **B** | Interzis — doar builtins în body |
| **C** | Depth max (ex. 8) |

Cicluri statice → elab error; overflow → **D27**.

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D14 — Locals vs state între frame-uri

Starea animației trăiește în **logic**, nu în canvas.

| | |
| - | - |
| **A (recommended)** | Locals **per apel**; dispar după return |
| **B** | State pe comp — **(change)** față de principiu |
| **C** | `static` — post-MVP |

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D16 — Culori **(important)**

| | |
| - | - |
| **A (recommended)** | `"rrggbb"` / `"rgb"`; **`#` = comentariu** |
| **B** | Doar `^rrggbb` |
| **C (change)** | `"…"` **și** `^…` |

Constraint: `#rrggbb` **nu** e literal culoare. Attr `bgColor` pe comp = `^…` (ca CLCD).

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D15 — Parametri metode

| | |
| - | - |
| **A ✅** | By-value la apel; parametrii nu modifică variabilele din apelant; locals pot shadow param names |
| **B** | Mutable ref — respins MVP |

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D17 — Normalizare culoare intern ✅

În LogTScript canvas **nu folosim `#`** în sursă (`"ff0000"`, `0`, `"ff000080"`). API-ul browser **`ctx.fillStyle`** totuși acceptă forme CSS — de obicei **`"#rrggbb"`** sau **`rgba(...)`**.

| | |
| - | - |
| **A ✅** | Până la widget, culorile rămân **string fără `#`** (sau sentinel `0`). **Doar în widget** (ultimul pas): `toCssColor(c)` → `"#ff0000"` / `"rgba(...)"` apoi `ctx.fillStyle = …` |
| **B** | **Nici în runtime JS** nu producem string cu `#` — widget setează `fillStyle` via **`rgb(r,g,b)`** sau **`rgba(r,g,b,a)`** parse din hex intern; `#` nu apare nicăieri în stack |

**Practic pentru user:** identic vizual. Diferența e doar în implementare:

| | **A** | **B** |
| - | ----- | ----- |
| Unde se convertește | o funcție la granița engine → ctx | parse hex → rgb() fără `#` |
| Simplitate | **mai simplu** — o mapare directă la ce așteaptă Canvas | puțin mai mult cod |
| Debug / log | poate apărea `#` în string-uri JS interne | `#` zero ori în tot procesul |

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D23 — Operatori aritmetici

**Decizie:** **A ✅** — `+ - * /` + paranteze — confirmed user 2026-09-01.

### D24 — Diviziune

**Decizie:** **A ✅** — float JS (`/`) — confirmed user 2026-09-01.

### D25 — Tipuri expr

**Decizie:** **A ✅** — number unificat IEEE — confirmed user 2026-09-01.

### D26 — Comparații / bool

**Decizie:** **A ✅** — interzis MVP — confirmed user 2026-09-01.

### D27 — Erori runtime draw

**Decizie:** **A ✅** — log + skip op — confirmed user 2026-09-01.

### D28 — Comentarii

**Decizie:** **A ✅** — `#` line comment — confirmed user 2026-09-01.

---

### Revizie stroke / fill — **D16b, D18b, D19c, D21c** ✅ user 2026-09-01

> Înlocuiește semantic **D18 A**, **D19/D19b**, **D21/D21b**.  
> **Nu** folosim keyword `"transparent"` — vezi **D16b**.

#### D16b — transparență / alpha ✅

| Formă culoare | Semnificație |
| ------------- | ------------ |
| `"rrggbb"` (6 hex) | opac — alpha **FF** implicit |
| `"rrggbbaa"` (8 hex) | alpha explicit (ex. `"ff000080"` = roșu 50%, `"ff000000"` = roșu invizibil) |
| **`0`** sau **`"0"`** | **transparent** — skip fill sau skip stroke la desen (nu e culoare validă CSS) |

**Respins:** literal `"transparent"` ca keyword.

```logts
styleFill(0)                    # fără fill la drawRect/drawCircle
styleStroke("0")                # fără stroke
drawRect(x, y, w, h, 0, "ff0000")   # doar contur roșu
drawRect(x, y, w, h, "00ff00", 0)   # doar fill verde
```

**Decizie:** **✅** confirmed user 2026-09-01.

#### D18b — API `style*` ✅

| Builtin | Semnificație |
| ------- | ------------ |
| **`styleFill(fillColor)`** | setează doar fill; stroke / strokeWidth **neschimbate** |
| **`styleStroke(strokeColor)`** | setează doar strokeColor; strokeWidth **neschimbat** |
| **`styleStroke(strokeColor, strokeWidth)`** | strokeColor + strokeWidth (px) |
| **`style(strokeColor, fillColor)`** | setează **ambele** — ordine: **stroke întâi, fill al doilea** |
| **`style(strokeColor, fillColor, strokeWidth)`** | stroke + fill + lățime contur |

**Default:** `strokeWidth = 1` la primul `styleStroke` / `style(..., width)` dacă nu a fost setat.

**Fără** builtin separat `styleStrokeWidth` — lățimea intră doar în `styleStroke(c, w)` și `style(cStroke, cFill, w)`.

```logts
styleFill("aaffaa")
styleStroke("000000", 2)
drawRect(x, y, w, h)

style("000000", "aaffaa", 2)    # echivalent: stroke negru 2px, fill verde

styleFill(0)
styleStroke("ff0000")
drawRect(x, y, w, h)            # doar contur roșu
```

**Notă ordine `style`:** primul arg = **stroke**, al doilea = **fill** (diferit de unele API-uri grafice — documentat explicit).

**Decizie:** **✅** confirmed user 2026-09-01.

#### D19c — `drawRect` fill + stroke ✅

| Formă | Semnificație |
| ----- | ------------ |
| `drawRect(x, y, w, h)` | fill + stroke din `styleFill` / `styleStroke` curente |
| `drawRect(x, y, w, h, fill)` | override **doar fill**; stroke din style |
| `drawRect(x, y, w, h, fill, stroke)` | override ambele; **`0` / `"0"`** = skip acel pas |

La fiecare apel: dacă fill **nu** e transparent → `fillRect`; dacă stroke **nu** e transparent → `strokeRect`.

```logts
drawRect(x, y, w, h, 0, "ff0000")           # doar contur
drawRect(x, y, w, h, "00ff00", 0)           # doar fill
drawRect(x, y, w, h, "aaffaa", "000000")    # ambele, culori diferite
```

**Decizie:** **A ✅** — confirmed user 2026-09-01.

#### D21c — `drawCircle` fill + stroke ✅

Aceeași regulă ca **D19c** (inclusiv `0` / `"0"`).

```logts
drawCircle(x, y, 12, "0000ff", "ffffff")
drawCircle(x, y, 12, 0, "ff0000")            # doar inel
```

**Decizie:** **A ✅** — confirmed user 2026-09-01.

#### Matrice rapidă

| Scop | Exemplu |
| ---- | ------- |
| fill roșu, fără stroke | `drawRect(x,y,w,h,"ff0000",0)` |
| stroke roșu, fără fill | `drawRect(x,y,w,h,0,"ff0000")` |
| fill + stroke diferite | `style("000000","aaffaa",2)` + `drawRect(...)` sau args pe draw |
| nimic | `drawRect(x,y,w,h,0,0)` → noop |

---

### D18 — `style(...)` *(superseded de **D18b** ✅)*

### D19 / D19b *(superseded de **D19c** ✅)*

### D20 — `drawLine`

Folosește **strokeColor** + **strokeWidth** din `styleStroke` / `style` (nu fill).

```logts
styleStroke("ff0000", 3)
drawLine(x1, y1, x2, y2)
```

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D22 — `drawText` ✅

`(x, y, text)` — font default **`14px monospace`** (vezi **D22d**).

**Culoare:** **`styleFill`** → JS `fillText` (**D22c**).

**Tipografie:** `fontSize` + `textAlign` + `textBaseline` — stare pe context (**D22a**, **D22b**, **D22d**).

```logts
styleFill("ffffff")
textAlign("center")
textBaseline("top")
drawText(160, 20, "Score: 7")
```

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D22a — builtin `textAlign` ✅

| Apel | JS |
| ---- | -- |
| `textAlign("left")` | `ctx.textAlign = 'left'` |
| `textAlign("center")` | `ctx.textAlign = 'center'` |
| `textAlign("right")` | `ctx.textAlign = 'right'` |

**Default:** **`"left"`** (ca JS). `start` / `end` → **Faza 5** (**D51**) ✅.

**Decizie:** **✅** confirmed user 2026-09-01.

### D22b — builtin `textBaseline` ✅

| Apel | JS |
| ---- | -- |
| `textBaseline("top")` | `ctx.textBaseline = 'top'` |
| `textBaseline("middle")` | `ctx.textBaseline = 'middle'` |
| `textBaseline("alphabetic")` | `ctx.textBaseline = 'alphabetic'` |
| `textBaseline("bottom")` | `ctx.textBaseline = 'bottom'` |

**Default:** **`"alphabetic"`** (ca JS). `hanging` / `ideographic` → backlog **1+k**.

**Decizie:** **✅** confirmed user 2026-09-01.

### D22c — `drawText` fill vs stroke ✅

| | |
| - | - |
| **A ✅** | `drawText` → **`fillText`** — culoare din **`styleFill`**; **nu** folosește `styleStroke` / strokeWidth |
| **B** | și contur — ar necesita `strokeText` (backlog **1+p**) |

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D22d — `fontSize` ✅

Builtin **`fontSize(n)`** — `n` int/float, **pixeli**; setează partea de mărime din `ctx.font`.

| | |
| - | - |
| **A ✅** | `fontSize(n)` — stare pe context; **default `14`** la init renderer |
| **B** | `drawText(x,y,text,size)` — respins pentru MVP |
| **C** | amânat — respins (user: vital în MVP) |

**MVP:** familia rămâne **`monospace` fix** — schimbare familie → **Faza 5** (**D22e** / **D49**).

```logts
styleFill("ffffff")
fontSize(24)
textAlign("center")
textBaseline("top")
drawText(160, 30, "GAME OVER")

fontSize(14)
drawText(10, 10, "FPS")
```

**JS intern:** `ctx.font = fontSize + "px monospace"` (family din state, default `monospace`).

**Decizie:** **A ✅** — confirmed user 2026-09-01.

### D22e — `fontFamily` + `fontStyle` → **Faza 5** (promovat din **1+k**)

Vezi [Faza 5](#faza-5--fontfamily--fontstyle-1k-promovat) — **D49–D52**.

### Mapping JS (rezumat post-D18b)

| Builtin LogT | JS 2D |
| ------------ | ----- |
| `styleFill(c)` | `fillStyle` |
| `styleStroke(c)` / `styleStroke(c,w)` | `strokeStyle` + `lineWidth` |
| `style(stroke, fill)` / `style(stroke, fill, w)` | ambele + width |
| `fontSize(n)` | parte din `ctx.font` (px) |
| `textAlign(...)` | `ctx.textAlign` |
| `textBaseline(...)` | `ctx.textBaseline` |
| `drawRect(...)` | `fillRect` +/sau `strokeRect` |
| `drawCircle(...)` | `arc` + fill/stroke |
| `drawLine(...)` | `stroke` |
| `drawText(...)` | `fillText` + font/align/baseline curente |

*(D22n închis. **D22e** → **Faza 5**.)*

### Scope F2

| Subfază | Conținut |
| ------- | -------- |
| **F2a** | Parser body (gramatică) |
| **F2b** | Engine → ctx |
| **F2c** | Builtins + mock ctx |
| **F2d** | Doc builtins |

### Criterii done F2

- [ ] Builtins text: `fontSize`, `textAlign`, `textBaseline` + draw primitives
- [ ] `#` ≠ culoare; `"ff00aa"` OK
- [ ] `if`/`for` → parse error
- [ ] Compoziție metode (D13b)
- [ ] Teste **47xx**

### Status F2

**(ready-to-implement)** — **D13–D28 ✅** (D17 A user 2026-09-01).

---

## Faza 3 — `renderer` + wire args + `set` / `draw` / `busy` / dirty **(draft)**

> **Status:** draft — **D29–D42**.  
> **Depinde:** F2.  
> **Sursă sketch:** set/draw/busy/dirty + coalescing + single-slot pending.

### Sintaxă țintă (din sketch, clarificată)

**Definiție comp (body):**

```logts
comp [canvas] .myCanvas:

    width: 512
    height: 512
    bgColor: "ffffff"

    .gameRenderer {
        /* F3: eventual mapări pin; sau gol dacă pinii vin din exec — D30 */
    }
:
```

**Exec / property block (ca logic):**

```logts
.myCanvas:{
    renderer {
        drawBg(0, 0, 512, 512, "aaffaa")
        drawPlayer(xWire/s16, yWire/s16, playerNameWire/ascii, healthWire/u16)
        drawBox(boxX/s16, boxY/s16, 100, 150, "0000ff")
    }

    set = 1
}
```

`renderer { }` **invocă** metode din inline selectat — **nu** le definește (sketch OK).

### Model control (sketch)

| Semnal | Vizibilitate | Rol |
| ------ | ------------ | --- |
| `set = 1` | public | state updated → `dirty=1` → schedule coalesced |
| `draw = 1` | public | explicit redraw request (tot schedule, „urgent”) |
| `busy` | public pout | 1 în timpul exec renderer |
| `dirty` | **intern** | pending redraw; nu pin user |

Coalesce: N× `set` înainte de frame → **un** redraw cu starea latest.

### Decizii **D29–D42** (draft)

| ID | Subiect | Opțiuni |
| -- | ------- | ------- |
| **D29** | Unde trăiește `renderer { }` | **A (recommended)** în exec block `.comp:{ }` (sketch) · **B** doar în body comp · **C** ambele (body = default list; exec poate override) |
| **D30** | Pinii canvas — declarație | **A (recommended)** inferați din args `name/type` din `renderer` · **B** declarație explicită în program block ca logic · **C** mix |
| **D31** | Ordine apeluri în `renderer` | **A (recommended)** secvențial top→bottom · **B** paralel (nonsens 2D) |
| **D32** | Literal vs wire arg | **A (recommended)** număr/string literal **sau** `wire/rep` · **B** doar wire · **C** expr în arg listă (`x+1` — **change**, util) |
| **D33** | Reprezentări `/s16` `/u16` `/ascii` | **A (recommended)** reuse codec logic number/text pe lățime wire · **B** tipuri canvas-only · **C** MVP doar `/number` pe wire lățime naturală; `/s16` în **1+l** delay |
| **D34** | Vector args sketch | **A (recommended)** amânat **1+l** · **B** MVP vector |
| **D35** | `set` semantică | **A (recommended)** latch/pulse ca logic: pe edge/valoare 1 → dirty+schedule · **B** level-triggered cât e 1 |
| **D36** | Clear înainte de renderer | **A (recommended)** clear cu `bgColor` fiecare redraw · **B** nu clear (user desenează bg) · **C** attr `autoClear: 0/1` |
| **D37** | `draw` vs `set` | **A (recommended)** ambele setează dirty; `draw` bypass debounce / schedule rAF ASAP; `set` poate coalesța în același frame · **B** `draw` = sync `renderer()` imediat (poate bloca) · **C (change)** un singur pin `redraw` (simplificare sketch) |
| **D38** | `busy` | **A (recommended)** 1 pe durata rulării metodelor pe ctx; 0 după; pout 1-bit · **B** busy și cât e rAF pending · **C** fără busy MVP |
| **D39** | Pending când busy | **A (recommended)** sketch: dirty rămâne 1; după busy re-schedule o dată · **B** drop · **C** eroare |
| **D40** | Scheduler | **A (recommended)** `requestAnimationFrame` single-slot · **B** `queueMicrotask` · **C** sync always |
| **D41** | `set` fără `renderer` block | **A (recommended)** clear-only / no-op draw · **B** elaboration error dacă lipsește renderer |
| **D42** | Test helpers | **A (recommended)** `flushCanvas(comp)` + mock ctx spy calls · **B** doar pixel digest |

### D29 — Loc `renderer { }`

Sketch pune `renderer` în `.myCanvas:{ … }` lângă `set = 1` → **exec block**.

| | |
| - | - |
| **A (recommended)** | Exec block — ca `query =` la logic |
| **B** | Body comp — listă statică |
| **C** | Body = default; exec override |

**Notă:** cu **A**, fiecare update reia `renderer { }` + `set` — consistent wave.

**Alternativă (change) C:** body declară lista „scenă default”; exec doar `set=1` fără a re-lista apelurile — mai puțin verbose la animație.

### D30 — Pinii

| | |
| - | - |
| **A (recommended)** | Infer din `renderer` args `boxX/s16` → pin/input `boxX` |
| **B** | Declarație în `.gameRenderer { x is number xPin }` ca logic — verbose |
| **C** | Mix |

**Risc A:** `renderer` trebuie să apară o dată la elaboration (sau primul exec) ca pinii să existe — clarificat: **lista `renderer` din primul exec block din script** sau **obligatoriu și un default în body (D29 C)**.

### D32 — Expr în args `renderer`

Sketch: doar literal sau `wire/rep`.

| | |
| - | - |
| **A (recommended)** | literal **sau** `wire/rep` |
| **C (change)** | și `xWire/s16 + 10` — util, dar parser mai greu; poate aștepta F2 expr pe wire decode |

### D33 — `wire/s16`

| | |
| - | - |
| **A (recommended)** | Decode ca logic `/s16` `/u16` `/ascii` |
| **C (change, MVP mic)** | Wire numeric/string fără slash formats — **1+l** pentru rest |

### D35 / D37 — `set` vs `draw`

| Op | Semantica recommended **A** |
| -- | --------------------------- |
| `set` | dirty=1; coalesce în rAF curent/următor |
| `draw` | dirty=1; tot rAF, dar **nu** debounced dincolo de frame (același single-slot; diferența e documentară + eventual skip coalescing delay artificial) |

**Realitate JS:** ambele ajung pe același rAF single-slot. Diferența utilă: **intent** + eventual `draw` forțează redraw chiar dacă valorile pin neschimbate (skip dirty-check pe inputs).

| | |
| - | - |
| **A (recommended)** | Păstrează ambele pinuri (sketch) |
| **B** | `draw` = sync blocking |
| **C (change)** | Un singur `redraw` |

### D36 — Clear **(lacună sketch)**

| | |
| - | - |
| **A (recommended)** | Auto-clear `bgColor` înainte de `renderer` |
| **B** | Fără clear — user `drawBg` obligatoriu |
| **C** | Attr `autoClear: 0/1` (default 1) |

### D38–D40 — busy + schedule

JS single-thread: `busy=1` e scurt (durata interpretării). Tot util pentru `wait = OR(.canvas:busy)` patterns ca DMA.

| | |
| - | - |
| **D38 A** | busy doar în timpul run metodelor |
| **D39 A** | set în timpul busy → dirty rămâne; re-schedule o dată |
| **D40 A** | `requestAnimationFrame` single-slot (ca CLCD widget) |

### Flow (formalizat)

```text
set/draw → dirty=1 → (dacă !busy) schedule rAF
rAF → busy=1 → [clear?] → run renderer calls → busy=0 → dirty=0
         ↘ dacă dirty din nou în timpul busy → re-schedule după
```

### Scope F3

| Subfază | Conținut |
| ------- | -------- |
| **F3a** | Parse `renderer { calls }` + wire/rep args |
| **F3b** | Pins infer / validate; pout `busy` |
| **F3c** | Dirty/rAF/coalesce + set/draw handlers |
| **F3d** | Teste schedule + flush + spy draw order |

### Criterii done F3

- [x] `set` multiplu → un redraw (rAF coalesce)
- [x] `set` în timpul `busy` → redraw ulterior (`_pendingAfterBusy`)
- [x] Args literal + wire decode (`pinName/s16`, `/ascii`, `/bool`)
- [x] `busy` pout observabil
- [x] `clear` pin (default 1; `clear = 0` additive)
- [x] `dirty` **nu** e pin public

### Status F3

**done** — D29 A, D30 A, D32–D33 A, D35 A, D36 **`clear`** (default 1), D37 A, D38–D40 A. Teste 4730–4735 (wave + legacy unde aplicabil).

---

## Faza 4 — Documentație, teste end-to-end, integrare logic/observe **(done)**

> **Status:** done — **D43–D48**.

### Scop

| Item | Detaliu |
| ---- | ------- |
| Doc EN | `canvas.md`, `inline-canvas.md` (sau secțiuni), update `components.md`, `doc-index.json` |
| Exemple | static draw; wire-driven; osc→logic→observe→canvas (dacă observe gata) |
| Verify | `_verify_doc_examples.js` + logts-play |
| Non-goals | implementare `if`/loops; sprite; touch |

### Decizii **D43–D48** (draft)

| ID | Subiect | Opțiuni |
| -- | ------- | ------- |
| **D43** | Structură doc | **A (recommended)** un `canvas.md` (inline+comp+builtins+control) · **B** split `inline-canvas.md` + `comp-canvas.md` (ca logic) |
| **D44** | Exemplu anim osc | **A (recommended)** doc + test dacă observe+`$` disponibile · **B** doc conceptual only până F108 done |
| **D45** | Integrare observe | **A (recommended)** soft: canvas MVP fără observe; exemplu integrare când F108✅ · **B** hard dep F108 |
| **D46** | Pixel tests | **A (recommended)** mock ctx call log (nu PNG) MVP · **B** hash PNG |
| **D47** | Wave + legacy | **A (recommended)** ambele ca restul suitei · **B** doar wave |
| **D48** | Demo script | **A (recommended)** exemplu în doc + optional `examples/` · **B** doar unit tests |

### Exemplu țintă integrare (din sketch, adaptat)

```logts
inline [logic] .game:
    boxX$(10)
    /* … */
:

inline [canvas] .gameRenderer:
    drawScene(x, y) {
        style("aaffaa")
        drawRect(0, 0, 800, 600)
        style("0000ff")
        drawRect(x, y, 40, 40)
    }
:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe boxX$ is number boxXPin
    }
:

comp [canvas] .gameCanvas:
    width: 800
    height: 600
    bgColor: "aaffaa"
    .gameRenderer { }
:

/* wiring + osc → query → commit → observe → set canvas — detalii după D8/D30/D45 */
```

### Scope F4

| Subfază | Conținut |
| ------- | -------- |
| **F4a** | Doc + index + verify examples |
| **F4b** | Suite e2e **47xx–48xx** |
| **F4c** | Notă cross-link în logic2 / monopoly dacă e cazul |

### Criterii done F4

- [x] Doc EN verificată (`inline-canvas`, `comp-canvas`, `canvas-builtins`, `components.md`, `doc-index.json`)
- [x] Suite verde quiet (4700–4741)
- [x] Exemplu static + dinamic (`logts-play`: wire `/s16`, `observe` → canvas)
- [x] `doc_verify` comp-canvas + inline-canvas

### Status F4

**done** — D43 B (split docs), D44 B (observe e2e doc, fără osc anim), D45 A (soft dep observe), D46 A (mock ctx), D47 A (wave+legacy), D48 A (doc `logts-play`).

---

## Faza 5 — `fontFamily` + `fontStyle` (**1+k** promovat)

> **Status:** done — **D49–D52** ✅ (user 2026-09-01).
> **Depinde:** F2 (text builtins existente: `fontSize`, `drawText`, `textAlign`, `textBaseline`).  
> **Promovat din backlog:** **1+k** (user 2026-09-01).

### Scop

| Item | Detaliu |
| ---- | ------- |
| **`fontFamily(name)`** | Schimbă familia din lista allowed (aliniat CLCD `label` / `family:`) |
| **`fontStyle(family, size)`** | Sugar: `fontFamily` + `fontSize` într-un apel |
| **`textAlign("start"\|"end")`** | Extindere D22a (în MVP doar left/center/right) |
| **Engine** | `ctx.font = size + "px " + cssStack` — state deja are `fontFamily` intern (fix `monospace` azi) |
| **Doc + teste** | `canvas-builtins.md`, `logts-play`, **4742+** wave + legacy |

### Sintaxă țintă

```logts
fontStyle("sans", 18)
textAlign("start")
drawText(100, 40, "Menu")

fontFamily("serif")
fontSize(12)
textBaseline("alphabetic")
drawText(10, 200, "caption")
```

### Mapare familie → CSS (draft — aliniat CLCD)

| Token LogT | `ctx.font` stack (ca CLCD `label`) |
| ---------- | ----------------------------------- |
| **`"mono"`** | `Consolas, "Courier New", monospace` |
| **`"sans"`** | `system-ui, Segoe UI, sans-serif` |
| **`"serif"`** | `Georgia, Times New Roman, serif` |

**Notă:** token **`"mono"`** (nu `"monospace"`) — același vocabular ca `comp [clcd]` `family: mono|sans|serif`. Alias `"monospace"` → acceptat sau eroare: **D49**.

### Decizii **D49–D52** ✅

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D49** | Tokeni `fontFamily` / `fontStyle` | **A ✅** `mono` \| `sans` \| `serif` (ca CLCD) |
| **D50** | `fontStyle(family, size)` | **A ✅** |
| **D51** | `textAlign` `start`/`end` | **A ✅** |
| **D52** | Familie invalidă | **A ✅** runtime error |

### Scope F5

| Subfază | Conținut |
| ------- | -------- |
| **F5a** | Builtins `fontFamily`, `fontStyle` în assembler + engine + mock `fillText` font string |
| **F5b** | `textAlign("start"\|"end")` |
| **F5c** | Doc `canvas-builtins.md` + exemplu `logts-play` (Load & Run) |
| **F5d** | Teste **4742+** (wave + legacy), `doc_verify` |

### Criterii done F5

- [x] `fontFamily("sans")` + `fontSize` → `ctx.font` corect în widget + mock
- [x] `fontStyle("serif", 20)` echivalent cu apelurile separate
- [x] `textAlign("start")` / `("end")` acceptate
- [x] Familie necunoscută → eroare
- [x] Doc EN + suite verde (4742–4749)

### Status F5

**done** — D49–D52 A; teste **4742–4749** (wave + legacy).

---

## Faza 6 — CLCD symbols (`drawSymbol`, **1+n** promovat)

> **Status:** done — **D53–D61** ✅ (user 2026-09-01).
> **Depinde:** F2 (style/color), F5 (text separat de simboluri).  
> **Promovat din backlog:** **1+n** (user 2026-09-01).

### Scop

Același **catalog de nume** ca `comp [clcd]` (~500 FA + `digit7`/`digit14`/`colon`/`dp`), desenate liber pe `comp [canvas]` via builtins — fără symbol blocks, fără `bit`/`bits` CLCD.

| Separare clară | API |
| -------------- | --- |
| Text liber | `drawText` + `fontFamily` / `fontStyle` (**F5**) |
| Simbol catalog | `drawSymbol` + `symbolSize` / `symbolStyle` (**F6**) |
| `label` | **nu** pe `drawSymbol` — rămâne text |

### Dispatch (identic CLCD widget)

```
drawSymbol(x, y, name [, bits])
    → getClcdSymbolDef(name)
        kind 'fa'     → 3 args; fillText(FA glyph)     [clcd-symbol-draw]
        kind 'canvas' → 4 args obligatoriu (bits)      [clcd-symbol-draw]
        kind 'text'   → ERROR (use drawText)
        missing       → ERROR (unknown symbol)
```

### API țintă

```logts
# Font Awesome icon (3 args)
styleFill("00ff00")
symbolSize(28)
symbolStyle(1)
drawSymbol(20, 10, "battery")

# 7-segment digit (4 args — bits în apel)
style("334455", "00ff00")    # off / on — D58
symbolSize(44)
drawSymbol(60, 10, "digit7", "1101010")

# dp — 1 bit
drawSymbol(80, 10, "dp", "1")
drawSymbol(90, 10, "dp", "0")

# colon — 2 biți (top, bottom); nume registry: colon
drawSymbol(100, 20, "colon", "10")
drawSymbol(110, 20, "colon", "00")
```

### Builtins

| Builtin | Rol |
| ------- | --- |
| **`drawSymbol(x, y, name)`** | FA și simboluri fără biți — **3 argumente** |
| **`drawSymbol(x, y, name, bits)`** | Simboluri **canvas** care acceptă biți — **4 argumente obligatorii** |
| **`symbolSize(n)`** | State pentru următorul `drawSymbol`; semantica **per kind** (CLCD) |
| **`symbolStyle(n)`** | FA only: `1` solid, `2` regular, `3` brands; default **D61** `symDef.defaultStyle` |

**Nu** există `symbolBits` builtin — biții sunt **doar** al 4-lea parametru la `drawSymbol`.

### Al 4-lea arg `bits` — **D56 B ✅**

| Simbol | `bits` | Semnificație |
| ------ | ------ | ------------ |
| **`digit7`** | string **7** × `0`\|`1` | segmente on/off → `styleFill` / `styleStroke` |
| **`digit14`** | string **7** sau **14** × `0`\|`1` | desen 7-seg (ca CLCD: primele 7 folosite) |
| **`dp`** | **1** × `0`\|`1` | `1` = dot on (`fillColor`), `0` = off (`strokeColor`) |
| **`colon`** | **2** × `0`\|`1` | bit0 = punct superior, bit1 = punct inferior |
| **`fa`** | — | al 4-lea arg **interzis** (eroare) |

Validare: lungime și caractere `0`/`1` only; mesaj clar la mismatch.

**CLCD widget (refactor):** mapează `bit`/`bits` register → același `bits` string pentru shared draw (`colon` cu un singur `bit` → `"11"` / `"00"`).

### `symbolSize` — reuse CLCD helpers

Engine construiește un obiect `sym` sintetic `{ size: state.symbolSize }` și apelează:

| `kind` | Helper | Default size | Validare (ca parser CLCD) |
| ------ | ------ | ------------ | ------------------------- |
| **`fa`** | `resolveClcdFaIconSize(sym)` | **22** px înălțime | **8–64** (**D59**) |
| **`canvas`** | `resolveClcdCanvasScale(sym, renderer)` | nat.h (44 / 32 / …) | **8–120** (**D59**) |

Un singur `symbolSize(n)` — interpretarea depinde de **numele** din `drawSymbol`, nu de un tip declarat de user.

### Culori — **D58 A ✅**

Fără builtins noi de culoare; refolosim `styleFill` / `styleStroke` / `style`:

| `kind` | Culoare | Mapare canvas state |
| ------ | ------- | ------------------- |
| **`fa`** | icon | `styleFill` → `fillColor` (ca `drawText`) |
| **`digit7`**, **`digit14`** | segment on / off | `styleFill` = on, `styleStroke` = off |
| **`dp`**, **`colon`** | dot on / off | din **biții** arg-ului 4: `1` → `fillColor`, `0` → `strokeColor` per dot/segment |

**D60:** închis — **nu** `symbolOn` separat; totul din `bits` la `drawSymbol`.

### Refactor shared (obligatoriu în F6)

| Pas | Fișier | Acțiune |
| --- | ------ | ------- |
| **F6a** | `devices/clcd-symbol-draw.js` **(nou)** | `drawClcdFaIcon(ctx, opts)`, `drawClcdCanvasSymbol(ctx, opts)` — extras din `clcd-widget.js` |
| **F6b** | `devices/clcd-widget.js` | delegă la `clcd-symbol-draw.js` (zero schimbare vizuală CLCD) |
| **F6c** | `core/canvas-engine.js` | state `symbolSize`, `symbolStyle`; builtin `drawSymbol` 3–4 args; shared draw |
| **F6d** | `devices/canvas-widget.js` | `document.fonts.load` FA (3 faces, ca CLCD) la primul draw sau mount |
| **F6e** | `core/canvas-assembler.js` | înregistrare builtins noi |
| **F6f** | test bundle | `clcd-symbols_generated.js` deja în bundle ✓ |

`opts` pentru shared draw: `{ x, y, name, symDef, size, style, bits, fg, bg }` — `bits` string; CLCD widget derivă din register; canvas din arg 4.

### Mock ctx / teste

| Test | Verificare |
| ---- | ---------- |
| FA `battery` | `fillText` glyph `\uf240` |
| `symbolStyle(2)` vs `1` | weight 400 vs 900 |
| `digit7` + `"1101010"` | `fillRect` segmente |
| `dp` `"1"` / `"0"` | `arc` cu culori fg/bg |
| `colon` `"10"` / `"00"` | 2× `arc`, culori per bit |
| FA cu 4 args | eroare |
| `digit7` fără bits | eroare |
| unknown `foo` | eroare |

**Alocare teste:** **4750–4759** (wave perechi, ca F5).

### Decizii **D53–D61**

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D53** | Nume API | **A** `drawSymbol` |
| **D54** | `symbolSize` / `symbolStyle` | **A** builtins separate în draw state |
| **D55** | Size semantics | **A** identic CLCD helpers |
| **D56** | Biți canvas symbols | **B ✅** al 4-lea arg `drawSymbol(x,y,name,bits)` — user 2026-09-01 |
| **D57** | `label` exclus | **A** — doar `drawText` |
| **D58** | Culori simboluri | **A ✅** `styleFill`+`styleStroke` |
| **D59** | Validare `symbolSize` | **A** limite CLCD (FA 8–64, canvas 8–120) |
| **D60** | `symbolOn` separat | **respins** — on/off din `bits` arg (**D56**) |
| **D61** | `symbolStyle` neapelat | **A ✅** `symDef.defaultStyle` |

### Scope F6

| Subfază | Conținut |
| ------- | -------- |
| **F6a** | `clcd-symbol-draw.js` + refactor widget |
| **F6b** | Builtins canvas + draw state |
| **F6c** | FA font preload pe canvas widget |
| **F6d** | Doc `canvas-builtins.md` + secțiune „Symbols” + link `clcd-symbols.md` + `logts-play` |
| **F6e** | Teste **4750+** wave + legacy |

### Criterii done F6

- [x] `drawSymbol` 3-arg (FA) + 4-arg (canvas + bits)
- [x] `symbolSize` / `symbolStyle` conform CLCD
- [x] CLCD widget delegă la `clcd-symbol-draw.js`
- [x] Doc `canvas-builtins.md` + exemplu `logts-play`
- [x] Suite verde **4750–4759**

### Status F6

**done** — teste **4750–4759** (wave + legacy).

---

## Faza 7 — `if` / `else` în body (**1+a** promovat)

> **Status:** done — **D62–D68** ✅ (user 2026-09-01).

### Scop

Branch condițional în **body metodă** `inline [canvas]` (și apeluri din `renderer { }` via metode) — fără loops (**1+b** rămâne amânat).

| În scope F7 | În afara scope |
| ----------- | -------------- |
| `if (cond) { stmts }` | `for` / `while` (**1+b**) |
| `else { stmts }` opțional | `for` / `while` (**1+b**) |
| `else if` / `else if` / `else` (JS) | keywords `and` / `or` / `not` (folosește `&&` `||` `!`) |
| Comparații number + string `==` `!=` | `true` / `false` literali |
| Truthiness `if (name)` / `if (!name)` | `if` în `renderer { }` direct (**D67**) |
| `&&` `||` `!` + `()` | |

### Sintaxă țintă

```logts
inline [canvas] .hud:

    drawScore(score, hi) {
        styleFill("ffffff")
        fontSize(16)
        drawText(10, 10, "Score")

        if (score > hi) {
            styleFill("ffff00")
            drawText(10, 30, "NEW HI!")
        } else {
            styleFill("888888")
            drawText(10, 30, "keep going")
        }

        if (score == 0) {
            drawSymbol(50, 20, "ban", "1")
        }
    }

:

comp [canvas] .screen:
    width: 200
    height: 60
    .hud { }
:

# renderer: drawScore(xPos/s16, hiWire/s16)
```

### Parser / AST (draft)

| Construct | AST |
| --------- | --- |
| `if (expr) { body }` | `{ kind: 'if', cond, then, else: null }` |
| `else if (expr) { … }` | lanț `else: { kind: 'if', … }` sau listă `elif` — implementare la alegere |
| `else { body }` | `else: [stmts]` |
| Block `{ }` | aceeași delimitare ca body metodă (**D6 B**) |

**Tokenizer:** extindere pentru `==`, `!=`, `<=`, `>=`, `<`, `>` (azi doar `=` există).  
**CANVAS_FORBIDDEN_IDS:** scoate `if`, `else`; păstrează `for`, `while`, `and`, `or`, `not`, `true`, `false`.

### Expresii condiție — **D64–D66**

| Nivel | Draft recommended |
| ----- | ----------------- |
| **Comparație** | `expr cmp expr` — `cmp` ∈ `==` `!=` `<` `>` `<=` `>=` |
| **Operanzi** | number (literal, var, param, wire în expr dacă e în scope renderer — doar în metode apelate cu args); **nu** string compare în F7 |
| **Truthiness** (**D65**) | **A** condiția trebuie comparație (nu `if (x)` bare) · **B** + numeric truthy `!= 0` |
| **Bool ops** (**D66**) | **A** fără `and`/`or`/`not` în F7 — condiții simple · **B** `and`/`or`/`not` ca logic |

### Execuție (engine)

```text
evalCond(expr) → boolean
executeBlock(stmts) → void (existing assign/call/if)
if (evalCond(cond)) executeBlock(then); else if (else) executeBlock(else);
```

- Locals / params: același env ca azi (**D14**).
- Erori: condiție non-boolean la runtime → eroare clară (**D27** pattern: throw sau skip — recomandat **throw** la eval cond invalid).

### Decizii **D62–D68** ✅

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D62** | `if` / `else` JS-style | **A ✅** |
| **D63** | `else if` chain | **A ✅** |
| **D64** | Comparații | **A ✅** number + string `==`/`!=` |
| **D65** | Truthiness | **A ✅** + ascii `if (name)` / `if (!name)` |
| **D66** | `&&` `||` `!` | **A ✅** în F7 |
| **D67** | `if` doar în metode | **A ✅** |
| **D68** | Teste **4760+** | **A ✅** |

### Criterii done F7

- [x] `if`/`else`/`else if` în mock ctx
- [x] Comparații number + string equality
- [x] Truthiness ascii + `!`
- [x] `&&` `||`
- [x] `for` încă forbidden (**4768**)
- [x] Doc `inline-canvas.md` + suite **3851** verde

### Status F7

**done** — teste **4710** (parse), **4760–4768** (exec + for forbidden).

---

## Faza 8 — Loops `for` / `while` (**1+b** promovat)

> **Status:** **done** — **D69–D75** confirmate user 2026-09-01.  
> **Depinde:** F7 (condiții `if` — reutilizare `parseCond` / `canvasEvalCond`).  
> **Promovat din backlog:** **1+b** (user 2026-09-01).

### Scop

Iterație în **body metodă** — grid de tile-uri, animații procedurale simple, scan linii — fără `break`/`continue` în F8.

| În scope F8 | În afara scope |
| ----------- | -------------- |
| `for (init; cond; step) { … }` | `do` / `do-while` |
| `while (cond) { … }` | `break` / `continue` (rămân interzise) |
| Condiții ca F7 (`&&` `||` `!`, comparații, truthiness) | `for`/`while` în `renderer { }` direct (**D74**) |
| Init/step: assign expr (`i = 0`, `i = i + 1`) | Operatori `++` / `--` (draft: amânat sau D71) |
| Locals loop var în același `env` (**D14**) | Recursivitate nouă |

### Sintaxă țintă (JS/C obișnuit)

```logts
inline [canvas] .tiles:

    drawGrid(cols, rows, tileW, tileH) {
        y = 0
        row = 0
        while (row < rows) {
            x = 0
            col = 0
            while (col < cols) {
                style(0, "aaffaa")
                drawRect(x, y, tileW - 2, tileH - 2)
                x = x + tileW
                col = col + 1
            }
            y = y + tileH
            row = row + 1
        }
    }

    drawStrip(n, color) {
        for (i = 0; i < n; i = i + 1) {
            style(0, color)
            drawRect(i * 18, 10, 16, 16)
        }
    }

:

comp [canvas] .board:
    width: 200
    height: 120
    .tiles { }
:

# renderer: drawGrid(cols/s16, rows/s16, 20, 20)
```

### Gramatică `for` (draft)

```text
forStmt   := 'for' '(' forInit ';' cond ';' forStep ')' block
forInit   := assignStmt | empty
forStep   := assignStmt | empty
cond      := parseCond()   # aceeași ca F7
block     := '{' stmt* '}'
```

- **Clauze goale permise:** `for (;;)` — infinit → protejat de **D73** max iterations.
- **Init/step:** o singură assign per clauză (`i = 0`, `i = i + 1`) — nu listă cu `,`.

### Gramatică `while`

```text
whileStmt := 'while' '(' cond ')' block
```

### Execuție (engine)

```text
for:
  eval forInit (assign în env)
  iter = 0
  while canvasEvalCond(cond) && iter < MAX:
    executeBlock(body)
    eval forStep
    iter++

while:
  iter = 0
  while canvasEvalCond(cond) && iter < MAX:
    executeBlock(body)
    iter++
```

**MAX** — cap siguranță browser (**D73**), ex. **10 000** iterații → runtime error sau log+stop.

### Tokenizer / parser

| Schimbare | Detaliu |
| --------- | ------- |
| **KW** | `for`, `while` (ca `if`/`else`) |
| **CANVAS_FORBIDDEN_IDS** | scoate `for`, `while`; păstrează `do`, `break`, `continue` |
| **parseStmt** | + `parseForStmt`, `parseWhileStmt` |
| **AST** | `{ kind: 'for', init, cond, step, body }`, `{ kind: 'while', cond, body }` |
| **canvasExecuteStmts** | + exec `for` / `while` |

### Decizii **D69–D75** (draft)

| ID | Subiect | Recommended |
| -- | ------- | ----------- |
| **D69** | `for` C-style 3 clauze | **A** `for (init; cond; step)` cu `;` și assign init/step |
| **D70** | `while` | **A** da — `while (cond) { }` |
| **D71** | `++` / `--` | **B** parțial — postfix `i++` / `i--` da; prefix `++i` / `--i` amânat |
| **D72** | `break` / `continue` | **A** permise în `for`/`while`; `for` imbricat permis |
| **D73** | Max iterații | **A** cap **10000** per loop → eroare · **B** fără cap |
| **D74** | Doar în metode | **A** ca F7 — nu în `renderer` direct |
| **D75** | Teste | **A** **4770–4779** wave+legacy; **4768** → `for` permis |

### Scope F8

| Subfază | Conținut |
| ------- | -------- |
| **F8a** | KW `for`/`while` + parser |
| **F8b** | Exec loop + iteration cap |
| **F8c** | Doc `inline-canvas.md` secțiune Loops |
| **F8d** | Teste **4770+**; actualizare **4768** |

### Criterii done F8

- [x] `for (i = 0; i < n; i++)` desenează N tile-uri
- [x] `while` imbricat (grid)
- [x] Condiție F7 în loop (`i < cols`)
- [x] Depășire cap iterații → eroare
- [x] `break` în body → parse interzis
- [x] Doc + suite verde (**4770–4779**, **4768** actualizat)

### Non-goals F8

- prefix `++i` / `--i`
- `break` / `continue`
- `do-while`
- `for-each` / range syntax

### Status F8

**done** — teste **4768**, **4770–4779**; postfix `i++`/`i--` (D71 parțial); **break**/**continue** adăugate post-F8.

---

## Faza 9 — Vector wire args în `renderer` (**1+l** promovat)

> **Status:** **done** — **D76–D83** confirmate; `param[]` + teste **4790–4799**.  
> **Depinde:** F3 (wire args scalar + pin inference), F8 (loops pentru iterare pe vector).  
> **Promovat din backlog:** **1+l** (user 2026-09-01); continuare **D34** amânat MVP.

### Scop

Astăzi F3 acceptă doar **scalar** în `renderer`: `mark(xPos/s16, yPos/s16)` cu `16wire` → un număr per pin.

F9 adaugă parametri **vector** în semnătura metodei (`xs[]`), wire `16wire[N]` conectat la pin, decode per element, `xs[i]` și `vectorLen(xs)` în body.

| În scope F9 | În afara scope |
| ----------- | -------------- |
| **`drawShots(xs[])`** — vector declarat în semnătură metodă | `shotsX[] = wire` la assign (respins — assign rămâne `pin = wire`) |
| `renderer { drawShots(shotsX/s16) }` + `shotsX = trajectory` | Vector în args **metodă→metodă** fără pin (defer) |
| Decode per element — toate formatele scalar F3 | Matrix `wire[r,c]` (defer) |
| `xs[i]`, `vectorLen(xs)` — eroare pe param scalar | `xs[i] = …` assign în vector (defer) |
| Match **param `[]`** ↔ wire shape la assign (D82) | Slice `xs[i:j]` (defer) |

### Sintaxă țintă

**Script (exec):**

```logts
inline [canvas] .traj:

    drawShots(xs[]) {
        n = vectorLen(xs)
        for (i = 0; i < n; i++) {
            style(0, "aaffaa")
            drawRect(xs[i] * 4, 40, 6, 6)
        }
    }

    drawEnemies(posx[], posy[]) {
        for (i = 0; i < vectorLen(posx); i++) {
            styleFill("ff0000")
            drawRect(posx[i], posy[i], 8, 8)
        }
    }

    drawLabels(names[]) {
        for (i = 0; i < vectorLen(names); i++) {
            drawText(10, 10 + i * 14, names[i])
        }
    }

    mark(x, y) {
        drawRect(x, y, 12, 12)
    }

:

comp [canvas] .plot:
    width: 200
    height: 100
    .traj { }
:

16wire[8] trajectory = 0000000000000010 + 0000000000000100 + 0000000000000110 + 0000000000001000
         + 0000000000001010 + 0000000000001100 + 0000000000001110 + 0000000000010000
16wire[4] heights = 0000000000001010 + 0000000000001111 + 0000000000000101 + 0000000000001100
1wire go = 1

.plot:{
    renderer {
        drawShots(shotsX/s16)
        drawEnemies(enemyX/s16, enemyY/s16)
    }
    shotsX = trajectory
    enemyX = trajectory
    enemyY = heights
    set = go
}
```

> **Semnătură `param[]`:** vector declarat în **metodă** (`xs[]`, `posx[]`). **Assign** rămâne `pin = wire` (fără `[]` pe stânga). **Renderer** rămâne `pin/s16` — shape vector vine din param-ul metodei apelate + wire conectat.

### Model vector (confirmat **D76 C**)

```text
parseMethod:     drawShots(xs[])  →  params: [{ name: xs, vector: true }]
parseRenderer:   drawShots(shotsX/s16)  →  pin shotsX → maps to param[0] xs (vector)
elaboration:     pin shotsX expects vector wire (from param xs[])
first assign:    shotsX = trajectory  →  wire 16wire[8] OK; pin.vector = { ew:16, count:8 }; bits=128
                 shotsX = valX        →  ERROR: param xs[] requires vector wire
exec decode:     env.xs = [2, 4, 6, …]   // array JS
body:            xs[i], vectorLen(xs)  →  require Array (error if not — backup pentru bug intern)
```

**Scalar neschimbat:** `mark(x, y)` + `mark(xPos/s16, yPos/s16)` + `xPos = valX` (`16wire`) → number.

### Când știm scalar vs vector? (**D76 C** + **D82**)

| Moment | Ce știm |
| ------ | ------- |
| **Parse inline metodă** | `xs[]` → param vector; `x` → param scalar |
| **Parse `renderer`** | pin `shotsX/s16` — format only; shape legat la elaborare |
| **Elaborare** | `drawShots(shotsX/s16)` → pin `shotsX` **must be vector** (param 0 = `xs[]`) |
| **Assign `shotsX = wire`** | wire `16wire[N]` dacă pin vector; `16wire` dacă pin scalar; mismatch → **eroare** |
| **Exec `vectorLen(xs)`** | param `xs[]` → array; apel pe param scalar `x` → **eroare** `not a vector` |
| **Exec `xs[i]`** | la fel — doar pe param vector (sau variabilă locală array dacă apare mai târziu) |

**`vectorLen` pe scalar:** **eroare** (nu `1`) — confirmat user.

**Respins:** `shotsX[] = trajectory` — redundant; shape vine din `param[]` + wire metadata.

### Formate vector (D81)

Aceleași ca scalar F3 — per element, aceeași decodare:

| Format pin | Element în array |
| ---------- | ---------------- |
| `/s16`, `/u16`, `/s8`, … | `number` |
| `/ascii`, `/text` | `string` (NUL-trim ca scalar) |
| `/bool` | `0` / `1` |

### Gramatică

```text
method    := ID '(' paramList ')' block
paramList := param (',' param)*
param     := ID ('[' ']')?          # xs[] = vector param; x = scalar

primary   += var '[' expr ']'
builtin   += vectorLen(id)          # id must be vector param / array — else error
```

- `i` în `xs[i]` = orice expr numerică (ca F8).
- Index out of range → runtime error (ca wire `vectorA:i`).

### Execuție (engine / wire)

```text
canvasPinBitWidth(bindType, numberFormat, vectorMeta):
  scalar  → ca azi
  vector  → elementWidth * elementCount

canvasPinBitsToValue(bits, pin):
  scalar  → ca azi
  vector  → [ decode(slice element i) for i in 0..count-1 ]

canvasEvalExpr:
  case 'index': array = env[name]; return array[Number(index)]
```

### Tokenizer / parser / component

| Schimbare | Detaliu |
| --------- | ------- |
| **parseMethod** | `param[]` → `{ name, vector: true }` |
| **elaboration** | map renderer arg position → method param; pin `vectorRequired` |
| **parseRendererArg** | `wireRef` neschimbat (`pin/s16`) |
| **canvas-wire.js** | vector decode + `canvasPinBitWidth` cu `elementCount` |
| **canvas.js `_ensurePin`** | `vectorRequired` din elaboration; resize la assign |
| **assign validation** | param vector ↔ `Nwire[N]`; param scalar ↔ `Nwire` (D82) |
| **CANVAS_BUILTINS** | + `vectorLen` (vector args only) |
| **canvas-assembler** | `xs[i]`; `vectorLen(x)` call |

### Decizii **D76–D83** (confirmate user 2026-09-01)

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D76** | Marcare vector | **C ✅** `param[]` în semnătură metodă (`drawShots(xs[])`) — **nu** `pin[]` la assign · **A** respins (infer doar din wire) |
| **D77** | Lățime pin vector | **A ✅** `elementCount` din wire la assign; `elementWidth` din wire + format pin |
| **D78** | Valoare param | **A ✅** `number[]` sau `string[]` (după format) |
| **D79** | `xs[i]` | **A ✅** permis pe param `[]`; **eroare** pe param scalar |
| **D80** | `vectorLen` | **A ✅** **eroare** pe non-vector (nu return `1`) |
| **D81** | Formate | **A ✅** toate formatele scalar F3 per element |
| **D82** | Match shape | **A ✅** elaborare: pin vector dacă param `[]`; assign: vector wire obligatoriu / scalar interzis |
| **D83** | Teste | **A ✅** **4790–4799** wave+legacy |

### Scope F9

| Subfază | Conținut |
| ------- | -------- |
| **F9a** | `param[]` parser + elaboration pin↔param |
| **F9b** | Pin vector metadata + assign validation + decode |
| **F9c** | `xs[i]` + `vectorLen` parser/engine |
| **F9d** | Doc `comp-canvas.md` + `inline-canvas.md` secțiune Vector pins |
| **F9e** | Teste **4790+** |

### Criterii done F9

- [x] `drawShots(xs[])` + `shotsX = trajectory` → N `drawRect`
- [x] `drawEnemies(posx[], posy[])` nested coords
- [x] `vectorLen(xs)` pe param scalar → eroare
- [x] `shotsX = scalarWire` la pin vector → eroare la assign
- [x] Scalar `mark(x, y)` regresie 4732
- [x] Doc + suite **4790+** verde

### Status F9

**done** — `param[]` în metodă; assign `pin = wire`; teste **4790–4799**.

---

## Faza 10 — Path API + `fill` / `stroke` (**1+e** + **1+i** promovat)

> **Status:** **done** — **D84–D90**; teste **4800–4819**.  
> **Depinde:** F2 (style fill/stroke), F9 (`polygon` cu `xs[]` / `ys[]` vector).  
> **Promovat din backlog:** **1+e** (path / arc / bezier / polygon) + **1+i** (`fill()` / `stroke()` separate pe path).

### Scop

Astăzi `drawRect` / `drawCircle` / `drawLine` sunt **shortcut-uri** care ascund `beginPath` intern. Nu poți construi forme compuse (poligon, arc parțial, bezier, mai multe sub-path-uri într-un singur `fill`).

F10 expune API **imperativ** aliniat la Canvas 2D + randare explicită `fill()` / `stroke()` pe path-ul curent.

| În scope F10 | În afara scope |
| ------------ | -------------- |
| `beginPath`, `moveTo`, `lineTo`, `arc`, `closePath` | `save` / `restore` / transform → **1+d** |
| `quadraticCurveTo`, `bezierCurveTo` | `clip()` → **1+g** |
| `fill()`, `stroke()` pe path activ | `strokeText` → **1+p** |
| `polygon(xs[], ys[])` — helper vector (F9) | `polygon` fără `beginPath` (respins) |
| Unghiuri `arc` în **grade întregi** (inclusiv negative) | Radiani în script |
| `arc(..., counter?)` — `counter` opțional, **default `0`** (CW) | Infer sens doar din ordinea start/end |
| `drawRect` / `drawCircle` / `drawLine` neschimbate (shortcut) | Rescriere shortcuts pe path API |

### Model path (stare renderer)

```text
pathActive: false          # set true la beginPath(); false după fill()/stroke()? → rămâne true până la beginPath nou
subpathOpen: false         # moveTo/lineTo/arc deschid subpath

beginPath()     → pathActive=true; ctx.beginPath()
moveTo(x,y)     → require pathActive; ctx.moveTo
lineTo(x,y)     → require pathActive + subpath deschis
arc(cx,cy,r,s,e,counter?)→ require pathActive; grade→rad; anticlockwise = truthy(counter ?? 0)
closePath()     → require pathActive
fill()          → require pathActive; ctx.fill() cu fillColor curent (skip dacă transparent)
stroke()        → require pathActive; ctx.stroke() cu strokeColor + strokeWidth
```

**D86:** `moveTo` / `lineTo` / `arc` / `closePath` / `fill` / `stroke` **fără** `beginPath()` precedent în același „segment” → **runtime error** (`no active path`).

**D87:** pe același path, `fill()` apoi `stroke()` (sau invers) — **ambele permise**; același pattern ca `drawCircle`.

### Unghiuri `arc` — **D84**, **D85**

```logts
arc(cx, cy, radius, startDeg, endDeg)
arc(cx, cy, radius, startDeg, endDeg, counter)   # echivalent când counter omis = 0
```

| Regulă | Detaliu |
| ------ | ------- |
| **D84 A** | `startDeg` / `endDeg` = **grade întregi** (expresii numerice; rotunjire la int la eval dacă float) |
| Interval | **Orice** întreg — tipic `-360…360`, dar valori mai mari permise (ex. `720`); **nu** radiani |
| Negative | **Da** — ex. `arc(cx, cy, r, -45, 0)` = arc de la -45° la 0° (CW, default) |
| **D85 B** | Al 6-lea arg **`counter`** opțional — **default `0`** (orar / CW) dacă omis · **`1`** (truthy) → CCW · **`0`** (falsy) → CW — **nu** se deduce din ordinea start/end |
| Exemple | `arc(cx,cy,r, 0, 360)` = `arc(cx,cy,r, 0, 360, 0)` cerc CW · `arc(cx,cy,r, 0, 360, 1)` cerc CCW · `arc(cx,cy,r, -45, 0)` felie 45° CW |

**Implementare JS:**

```javascript
const startRad = startDeg * Math.PI / 180;
const endRad   = endDeg   * Math.PI / 180;
const anticlockwise = counter != null && !!counter;   // omit → 0 → CW
ctx.arc(cx, cy, r, startRad, endRad, anticlockwise);
```

> **Notă:** `startDeg` / `endDeg` definesc capetele arcului; **`counter`** (opțional) alege sensul parcurgerii între ele (ca în Canvas 2D).

### Builtins noi (rezumat)

| Builtin | Args | Rol |
| ------- | ---- | --- |
| `beginPath()` | — | Începe path nou; obligatoriu înainte de segmente |
| `moveTo(x, y)` | 2 | Pen fără linie; deschide subpath |
| `lineTo(x, y)` | 2 | Segment la (x,y) |
| `arc(cx, cy, r, startDeg, endDeg)` | 5 | Arc CW (default `counter=0`) |
| `arc(cx, cy, r, startDeg, endDeg, counter)` | 6 | Arc cu sens explicit (**D85**) |
| `quadraticCurveTo(cpx, cpy, x, y)` | 4 | Curba quadratică |
| `bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` | 6 | Curba cubică Bezier |
| `closePath()` | — | Închide subpath la ultimul `moveTo` |
| `fill()` | — | Umple path curent (`styleFill` / `style` fill) |
| `stroke()` | — | Contur path (`styleStroke` / `style` stroke + width) |
| `polygon(xs[], ys[])` | 2 vectori | Vezi **D89** — construiește path; **nu** randează |

### `polygon(xs[], ys[])` — **D89** (cum se folosește)

**Răspuns scurt:** `polygon` se folosește **după** `beginPath()` și **înainte** de `fill()` / `stroke()`. **Nu** apelează `beginPath` singur și **nu** desenează pe ecran (fără `draw` în nume — doar adaugă contur închis la path-ul curent).

Echivalent cu:

```logts
moveTo(xs[0], ys[0])
for (i = 1; i < vectorLen(xs); i++) {
    lineTo(xs[i], ys[i])
}
closePath()
```

| Regulă | Detaliu |
| ------ | ------- |
| Precondiție | `beginPath()` deja apelat (D86) |
| **`vectorLen(xs) == vectorLen(ys)`** | obligatoriu; **eroare** la runtime dacă lungimi diferite |
| **`vectorLen(xs) >= 3`** | obligatoriu; **eroare** dacă `< 3` puncte |
| Post | caller apelează `fill()` și/sau `stroke()` (D87) |
| Compoziție | Poți `polygon` + `moveTo` + `arc` + `closePath` pe **același** path înainte de un singur `fill()` |

**De ce nu fără `beginPath`?** Consistență cu restul API-ului: `beginPath` deschide, segmente construiesc, `fill`/`stroke` randează. `polygon` e **zahăr sintactic** peste buclă `lineTo`, nu un shortcut one-shot ca `drawRect`.

### Sintaxă țintă — exemple script

**1. Triunghi simplu (coordonate locale):**

```logts
drawTriangle(x1, y1, x2, y2, x3, y3) {
    style("ffffff", "ff4444", 2)
    beginPath()
    moveTo(x1, y1)
    lineTo(x2, y2)
    lineTo(x3, y3)
    closePath()
    fill()
    stroke()
}
```

**2. Felie pie (`arc` grade negative):**

```logts
drawSlice(cx, cy, r) {
    styleFill("44aaff")
    beginPath()
    moveTo(cx, cy)
    arc(cx, cy, r, -45, 0)
    closePath()
    fill()
}
```

**3. `polygon` + vectori din wire (F9 + F10):**

```logts
inline [canvas] .zones:

    drawZone(xs[], ys[]) {
        style("000000", "224488", 2)
        beginPath()
        polygon(xs, ys)
        fill()
        stroke()
    }

    drawArrow(x, y, len) {
        styleStroke("ffffff", 2)
        beginPath()
        moveTo(x, y)
        lineTo(x + len, y)
        quadraticCurveTo(x + len, y, x + len - 6, y - 8)
        stroke()
    }

:

comp [canvas] .map:
    on: 1
    width: 160
    height: 120
    bgColor: ^001100
    .zones { }
:

16wire[4] polyX = 0000000000001010 + 0000000000001111 + 0000000000010000 + 0000000000000110
16wire[4] polyY = 0000000000001010 + 0000000000000110 + 0000000000001111 + 0000000000001111
1wire go = 1

.map:{
    renderer { drawZone(zoneX/s16, zoneY/s16) }
    zoneX = polyX
    zoneY = polyY
    set = go
}
```

**4. Bezier + fill/stroke separat (doar contur):**

```logts
drawWave(y) {
    styleStroke("aaffaa", 3)
    beginPath()
    moveTo(0, y)
    bezierCurveTo(40, y - 30, 80, y + 30, 120, y)
    stroke()
}
```

**5. Compară: `polygon` vs buclă manuală** — același rezultat:

```logts
# Cu helper
beginPath()
polygon(xs, ys)
fill()

# Fără helper
beginPath()
moveTo(xs[0], ys[0])
for (i = 1; i < vectorLen(xs); i++) {
    lineTo(xs[i], ys[i])
}
closePath()
fill()
```

### Mapping JS (extindere D22)

| Builtin LogT | JS 2D |
| ------------ | ----- |
| `beginPath()` | `ctx.beginPath()` |
| `moveTo(x,y)` | `ctx.moveTo(x,y)` |
| `lineTo(x,y)` | `ctx.lineTo(x,y)` |
| `arc(cx,cy,r,s,e,counter?)` | `ctx.arc(..., rad, rad, !!(counter??0))` |
| `quadraticCurveTo(...)` | `ctx.quadraticCurveTo(...)` |
| `bezierCurveTo(...)` | `ctx.bezierCurveTo(...)` |
| `closePath()` | `ctx.closePath()` |
| `fill()` | `ctx.fill()` (skip dacă fill transparent) |
| `stroke()` | `ctx.stroke()` (skip dacă stroke transparent) |
| `polygon(xs,ys)` | loop `moveTo`+`lineTo`+`closePath` pe path activ |

`drawRect` / `drawCircle` / `drawLine` — **neschimbate** (nu trec prin path API user-facing).

### Execuție (engine)

| Schimbare | Detaliu |
| --------- | ------- |
| **state** | `pathActive` flag per draw context |
| **canvas-engine.js** | cases noi + validare precondiții |
| **CANVAS_BUILTINS** | + toate builtins F10 |
| **mock ctx** | înregistrează `beginPath`, `arc`, `fill`, `stroke`, `quadraticCurveTo`, … |
| **regresie** | `drawCircle` / `drawLine` / `drawRect` teste existente verzi |

### Decizii **D84–D90** (confirmate user 2026-09-02)

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D84** | Unghiuri `arc` | **A ✅** grade **întregi**; interval liber (ex. `-45…0`, `0…360`); **nu** radiani |
| **D85** | Sens arc | **B ✅** arg opțional **`counter`**, **default `0`** (CW); `1` → CCW; nu se inferă din start/end |
| **D86** | Path fără `beginPath` | **A ✅** `moveTo` / `lineTo` / `arc` / `closePath` / `fill` / `stroke` / `polygon` → **eroare** dacă nu există path activ |
| **D87** | `fill` + `stroke` | **A ✅** ambele apeluri pe același path permise (ca `drawCircle`) |
| **D88** | Bezier în MVP | **A ✅** `quadraticCurveTo` + `bezierCurveTo` în F10 |
| **D89** | `polygon` | **A ✅** `polygon(xs[], ys[])` — **după** `beginPath`, **înainte** de `fill`/`stroke`; **eroare** dacă `len(xs)!=len(ys)` sau `len<3` |
| **D90** | Teste | **A ✅** alocare draft **4800–4819** wave+legacy |

### Scope F10

| Subfază | Conținut |
| ------- | -------- |
| **F10a** | Parser: nume builtins noi în `CANVAS_BUILTINS` |
| **F10b** | Engine: path state + `arc` grade + `counter` → anticlockwise |
| **F10c** | `polygon(xs[], ys[])` + validare vector (len match, >=3) |
| **F10d** | Mock ctx + teste **4800+** |
| **F10e** | Doc `canvas-builtins.md` + exemplu `logts-play` în `comp-canvas.md` |

### Criterii done F10

- [x] `beginPath` → `moveTo` → `lineTo` → `closePath` → `fill` / `stroke`
- [x] `arc(cx,cy,r,0,360)` = `arc(cx,cy,r,0,360,0)` — default CW
- [x] `arc(cx,cy,r,0,360,1)` — CCW
- [x] `arc(cx,cy,r,-45,0)` — felie 45° CW (default counter)
- [x] `quadraticCurveTo` / `bezierCurveTo` înregistrate în mock
- [x] `polygon(xs, ys)` după `beginPath` + wire vector e2e
- [x] `polygon` cu `len(xs)!=len(ys)` sau `len<3` → eroare
- [x] `lineTo` fără `beginPath` → eroare (D86)
- [x] `drawRect` / `drawCircle` regresie
- [x] Doc + suite **4800+** verde

### Status F10

**done** — path API; `polygon`; `arc` grade + `counter` opțional; teste **4800–4819**.

---

## Faza 11 — Vectori locali + `rotatePoint` (**1+q** promovat)

> **Status:** **done** — **D91–D101**; teste **4820–4838**.  
> **Depinde:** F9 (read `xs[i]`, `vectorLen`), F10 (`polygon` — extins validare numeric).  
> **Promovat din backlog:** **1+q** (vectori în body metodă, fără `sin`/`cos`/`PI` în limbaj).

### Scop

F9 oferă vectori doar ca **param** din wire (`shotsX[]` + `16wire[N]`). Nu poți construi sau modifica liste în metodă (`xs = [1,2,3]`, append, rotație punct fără trig).

F11 adaugă **vectori locali** în body + builtin **`rotatePoint`** (returnează `[xRot, yRot]`).

| În scope F11 | În afara scope |
| ------------ | -------------- |
| `xs = [1, 2, 3]` / `xs = []` literal | Vectori nested — **1+o** (D92 amânat) |
| `xs = points` copie **by value** (D93) | `sin` / `cos` / `PI` în limbaj |
| `xs[i] = expr` index assign (D96) | `xs[i] =` cu `i > len` (eroare) |
| `xs[] = expr` append (D95) | `xs[] = vector` (nested → eroare) |
| `xs += points` concat la coadă (D98) | Matrix `wire[r,c]` |
| `rotatePoint(x,y,cx,cy,deg)` → `[x,y]` (D97) | Destructuring `x,y = rotatePoint(...)` |
| Param `xs[]` wire: **copie** la intrare metodă (D91) | Reference sharing între variabile |
| `polygon`: fiecare element **number** (D99) | Heterogen în `polygon` |

### Sintaxă țintă

```logts
buildTrail(shotsX[]) {
    xs = []
    ys = []

    xs += shotsX          # append toate elementele din shotsX (copie element cu element)
    i = 0
    while (i < vectorLen(xs)) {
        ys[] = xs[i] * 2
        i++
    }

    labels = ["A", "B", "C"]
    labels[0] = "X"       # index 0-based (D94)

    pt = rotatePoint(10, 20, 50, 50, 45)
    drawRect(pt[0], pt[1], 6, 6)

    beginPath()
    polygon(xs, ys)
    fill()
}

drawSquare(cx, cy, half, deg) {
    xs = []
    ys = []
    pt = rotatePoint(cx - half, cy - half, cx, cy, deg)
    xs[] = pt[0]
    ys[] = pt[1]
    pt = rotatePoint(cx + half, cy - half, cx, cy, deg)
    xs[] = pt[0]
    ys[] = pt[1]
    pt = rotatePoint(cx + half, cy + half, cx, cy, deg)
    xs[] = pt[0]
    ys[] = pt[1]
    pt = rotatePoint(cx - half, cy + half, cx, cy, deg)
    xs[] = pt[0]
    ys[] = pt[1]
    beginPath()
    polygon(xs, ys)
    stroke()
}
```

### Reguli vector (confirmate)

| Formă | Semnificație |
| ----- | ------------ |
| `xs = [e1, e2, …]` | Literal — elemente scalar (`number` / `string`) |
| `xs = []` | Vector gol |
| `xs = points` | **Copie shallow by value** — `points.slice()`; modificările pe `xs` nu afectează `points` (D93) |
| `xs[i] = v` | Scriere la index **`0 … len-1`**; **`i >= len` → eroare** (D96); append doar via `xs[] =` |
| `xs[] = v` | Append scalar `v` la final (D95) |
| `xs += points` | Append **fiecare element** din copia iterată a `points`; `points` neschimbat (D98) |
| `vectorLen(xs)` | Lungime (deja F9) — funcționează pe locali |
| `xs[i]` | Citire index **0-based** (D94) |

**Fără nested (D92 → 1+o):** `xs[] = otherVector`, `xs[i] = otherVector`, element literal `[…]` în interiorul altui literal → **runtime error** (`nested vector not allowed`).

**Param wire `xs[]` (D91):** la bind în `canvasExecuteMethod`, `env[xs] = argValues[i].slice()` — mutarea locală nu alterează pin / `pinEnv`.

### `rotatePoint` — **D97**

```logts
pt = rotatePoint(x, y, centerX, centerY, rotationDeg)
# pt[0] = x rotit, pt[1] = y rotit
```

| Regulă | Detaliu |
| ------ | ------- |
| Nume | **`rotatePoint` only** — nu există `getPointRotatedAt` |
| Unghi | Grade întregi (ca `arc` F10) |
| Return | Array JS cu **2** numere `[xRot, yRot]` |
| Unde | **Expression builtin** (ca `vectorLen`) — folosit în `pt = rotatePoint(...)` sau `xs[] = rotatePoint(...)[0]` via `pt[0]` |
| Intern | `Math.cos` / `Math.sin` în engine — **nu** expuse în limbaj |

### `polygon` — validare numeric (**D99**)

Extinde F10: la execuție, fiecare `xs[i]` / `ys[i]` trebuie `typeof === 'number'` (după `Number()` dacă e cazul). String sau alt tip → **eroare** (`polygon expects numeric coordinates`).

### Gramatică (extinderi)

```text
primary   += '[' (expr (',' expr)*)? ']'     # [] sau [1,2,3]
stmt      += name '[' expr ']' '=' expr    # index assign
stmt      += name '[' ']' '=' expr         # append
stmt      += name '+=' expr                # vector concat (rhs trebuie array)
expr      += rotatePoint '(' expr ')'      # 5 args, returns array
```

**Tokenizer:** `[` `]` deja folosite la `param[]` în semnătură — reutilizate în expr/stmt.

**`+=`:** doar pentru variabile vector locale (și eventual param copiat); rhs array → concat; rhs scalar → eroare sau tratat ca `[scalar]`? **Confirmat user:** `xs += points` = append valorile din `points` — rhs **trebuie** fi array.

### Execuție (engine)

| Schimbare | Detaliu |
| --------- | ------- |
| **canvas-assembler** | parse array literal, index assign, append, `+=` |
| **canvas-engine** | `env` poate ține `Array` local; `canvasEvalExpr` array literal; `rotatePoint` în `case 'call'` |
| **canvasExecuteMethod** | `slice()` pe param `vector` la bind (D91) |
| **canvasRunBuiltin polygon** | validare numeric per element (D99) |
| **assign / append** | refuz nested la store |

### Decizii **D91–D101** (confirmate user 2026-09-02)

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D91** | Param `[]` din wire | **A ✅** copie `slice()` la intrare în metodă |
| **D92** | Vectori nested | **Amânat** → backlog **1+o**; MVP F11 **interzis** |
| **D93** | `xs = points` | **A ✅** copie shallow **by value** |
| **D94** | Index | **A ✅** **0-based** (`xs[0]` primul element) |
| **D95** | Append | **A ✅** `xs[] = expr` |
| **D96** | Index assign | **A ✅** `xs[i] = v` doar `i < len`; **`i >= len` → eroare** |
| **D97** | Rotație punct | **A ✅** builtin expr **`rotatePoint(x,y,cx,cy,deg)`** → `[x,y]`; fără `getPointRotatedAt` |
| **D98** | Concat | **A ✅** `xs += points` append toate elementele din `points` (scalar each) |
| **D99** | `polygon` numeric | **A ✅** verificare `number` per element; altfel eroare |
| **D100** | Literali | **A ✅** `[]` și `[e1, e2, …]` |
| **D101** | Teste | **A ✅** alocare draft **4820–4839** wave+legacy |

### Scope F11

| Subfază | Conținut |
| ------- | -------- |
| **F11a** | Parser: literal `[]`, index assign, `[] =`, `+=` |
| **F11b** | Engine: local arrays, copy bind, append/assign rules |
| **F11c** | `rotatePoint` expression |
| **F11d** | `polygon` numeric check + nested guard |
| **F11e** | Doc `inline-canvas.md` + `canvas-builtins.md` |
| **F11f** | Teste **4820+** |

### Criterii done F11

- [x] `xs = [1,2,3]`, `xs = []`, `xs[] = 4`, `xs += other`
- [x] `xs = points` copie — mutare pe `xs` nu afectează `points`
- [x] `xs[i] = v` cu `i >= len` → eroare
- [x] `xs[] = nested` → eroare
- [x] Param wire copiat — mutare locală nu schimbă pin
- [x] `rotatePoint` → `pt[0]`, `pt[1]` draw
- [x] `polygon` cu string în `xs` → eroare
- [x] Regresie F9/F10
- [x] Doc + suite **4820–4838** verde

### Status F11

**done** — vectori locali, `+=`, `rotatePoint`; teste **4820–4838**.

---

## Faza 12 — Hitbox + input events + pouts (**1+f** promovat)

> **Status:** **ready-to-implement** — **D102–D117** confirmate user 2026-09-02 (vezi batch F12).  
> **Depinde:** F3 (`set`/`draw`/`busy`, exec block), F10 (path — viitor `circle`/`polygon` hitbox), CLCD touch (`touchType` 1/2/3).  
> **Promovat din backlog:** **1+f** (mouse/touch pe canvas).  
> **Sursă sketch:** documentație hitbox / `renderer when` / pouts (chat 2026-09-02).

### Direcție (rezumat sketch)

Canvas rămâne **fără stare de aplicație** între execuții renderer — corect și aliniat cu F3/F9/F11. Interacțiunea se modelează astfel:

```text
pointer → hitbox (geometrie) → eveniment (press/release/drag/move)
         → renderer when(...) [opțional, overlay vizual]
         → pout → wire → logic → wire → renderer normal
```

**Ce adaugă F12 față de azi:**

| Azi (F1–F11) | F12 (sketch) |
|--------------|--------------|
| `renderer { }` la `set`/`draw` | + `renderer when(hitbox[:event]) { }` |
| Fără hit-test | `hitbox { name: { rect(...); touchType; pout } }` |
| Pin `set`/`draw`/`busy` | + pouts per eveniment (`:press`, `:drag:eventX`, …) |
| CLCD are touch pe simboluri | Canvas liber — zone declarative pe pixeli |

### Analiză sketch — ce e solid

| # | Observație | Verdict |
| - | ---------- | ------- |
| 1 | **Stateless renderer** — wire-uri la fiecare exec, fără variabile Canvas persistente | ✅ Aliniat F3, D29 |
| 2 | **`set` vs `draw`** — coalescing, busy | ✅ Deja implementat (D35–D40) |
| 3 | **`touchType` 1/2/3** — momentary / pulse / latch | ✅ Reuse CLCD — cod + teste existente |
| 4 | **Evenimente ca tranziții** `0→1` press, `1→0` release | ✅ Model digital clar |
| 5 | **`eventX`/`eventY`** — unificat mouse+touch | ✅ Bun pentru API simplu |
| 6 | **`drag` vs `move`** — pressed move vs hover move | ✅ Distincție utilă (slider) |
| 7 | **Geometrie separată de nume** — `rect` azi, `circle`/`polygon` mai târziu | ✅ Extensibil |
| 8 | **Stare hitbox minimală** (pressed/latch) ≠ stare aplicație | ✅ Principiu corect |
| 9 | **Pipeline pout → logic → wire → canvas** | ✅ Identic observe/CLCD |

### Analiză sketch — erori / neclarități

| # | Problemă în sketch | Impact | Propunere plan |
| - | ------------------ | ------ | -------------- |
| 1 | **`bgColor: "101010"`** în comp | Comp attrs folosesc **`^rrggbb`** (D16, D7) — nu string cu ghilimele | Doc sketch → `bgColor: ^101010` |
| 2 | **`drawText(label, x, y)`** | Ordinea noastră: **`drawText(x, y, text)`** (F2) | Sketch corectat |
| 3 | **`stroke()` în hitbox** | Nu e coliziune reală — **gramatică hitbox separată** (ca CLCD symbols) | **D109 B** — `stroke(color)` în hitbox body; alt parser decât inline canvas |
| 4 | **`renderer` în comp body** (ex. „Basic Canvas”) | **D29 A** — `renderer` doar în **exec block** `.game:{ }` | Exemplu sketch mutat în exec |
| 5 | **Unde trăiește `hitbox { }`?** | Sketch îl pune în **comp body** lângă `width`; noi n-avem încă attrs program block în body | **D102** |
| 6 | **`renderer when` + redraw** | Overlay vs full frame — trebuie **`clear`** per when | **D110**, **D111**, **D115** |
| 7 | **`pout :press as name`** | Sintaxă nouă; CLCD folosește `:out` + redirect în exec | **D107** |
| 8 | **`rect(x,y,w,h)`** — litereale vs wire | Slider dinamic vrea `rect` cu wire sau mutare hitbox? | **D113** |
| 9 | **Exemplu `stroke()` după `drawRect`** în `drawButton` | Pare typo — `styleStroke` + path `stroke()` sau doar `drawRect` outline | Clarificat în doc țintă |
| 10 | **`enter`/`leave`** | Marcat „future” — OK backlog post-F12 | Out of scope MVP |

### Gramatică hitbox (separată de `inline [canvas]`)

Ca la **CLCD** (symbol blocks cu `x`, `bitOut`, `touchType`), **`hitbox { }`** are **parser propriu** în comp body — **nu** execută `inline [canvas]` builtins.

```text
comp [canvas] body
    ├── attrs (width, height, bgColor, …)
    ├── hitbox { }          ← HITBOX_GRAMMAR (parse-time, fără clear)
    │       ├── rect(...)
    │       ├── touchType = N
    │       ├── stroke("rrggbb")
    │       └── pout :event as name [/format]
    └── .inlineRef { }      ← program block canvas (D116, D117)
            ├── initDraw { }            ← o singură rulare la init componentă (D117)
            └── renderer when(hb[:ev]) { … }   ← overlay; implicit clear=0 (D115)

exec block .comp:{ }        ← obligatoriu `renderer { }` (D29 A, D117)
    ├── renderer { }        ← scenă la fiecare set/draw (clear pin exec, default 1)
    ├── pin assign
    ├── pout redirect
    └── set / draw
```

| Context | Parser | Exemple |
| ------- | ------ | ------- |
| **Hitbox body** | `canvas-hitbox-assembler` | `rect`, `touchType`, `pout`, **`stroke(color)`** |
| **`.inlineRef { }` program block** | `canvas-assembler` + when | **`initDraw { }`**, **`renderer when(...)`** |
| **Inline method body** | `canvas-assembler` | `drawRect`, `beginPath`, **`stroke()`** path, `fill()` |
| **Exec block** | existent (obligatoriu) | **`renderer { }`**, `set`, `draw`, `clear`, redirects |

**D109 B:** același identificator `stroke` în **două limbaje diferite** — fără rename `debugStroke`, pentru că nu există ambiguitate la parse (blocuri disjuncte).

### Sintaxă țintă (sketch corectat la implementare)

**Comp body** — attrs + **hitbox** + program block `.inlineRef { }` (**D102 A✅**, **D116**, **D117**):

```logts
comp [canvas] .symDemo:
    on: 1
    width: 800
    height: 600
    bgColor: ^101010

    hitbox {
        rollButton: {
            rect(650, 500, 100, 50)
            touchType = 2
            stroke("ffff00")

            pout :press as rollPressed
            pout :press:eventX as rollX/s16
            pout :press:eventY as rollY/s16
        }

        sliderX: {
            rect(100, 100, 200, 20)
            touchType = 1
            stroke("ff0")

            pout :press as sliderPressed
            pout :drag:eventX as sliderDragX/s16
            pout :drag:eventY as sliderDragY/s16
            pout :release as sliderReleased
        }
    }

    .icons {
        initDraw {
            drawBoardBg()
        }

        renderer when(rollButton) {
            drawButtonPressed(650, 500, 100, 50, "ROLL")
        }

        renderer when(sliderX:drag) {
            drawKnob(eventX, eventY)
        }
    }
:
```

**Exec block** — `renderer` obligatoriu + wiring (**D29 A**, **D117**):

```logts
1wire redraw = 0
16wire sliderValue = 0000000000000000

.symDemo:{
    renderer {
        drawButton(650, 500, 100, 50, "ROLL")
        drawSlider(sliderValue/s16)
    }

    sliderValue = trajectory
    rollPressed >= rollWire
    sliderDragX >= sliderValue
    set = redraw
}
```

**`clear` (D115 A✅):** `renderer when` = **întotdeauna overlay** (implicit `clear=0`, fără attr în body F12). **`clear` nu există în hitbox.** Exec `renderer` + pin `clear` (default `1`) ca F3. Backlog **1+r**: builtin `clear()` în inline canvas.

**Evenimente MVP** (sketch):

| Formă | Eveniment |
| ----- | --------- |
| `when(button)` | **press** (implicit) |
| `when(button:release)` | release |
| `when(slider:drag)` | drag (pressed move) |
| `when(slider:move)` | move (fără press) |

**Locals în `when` body:** `eventX`, `eventY` (D106).

**Locals în `when` body:** `eventX`, `eventY` — numere întregi canvas obișnuite (**D106 A✅**); nu sunt pout-uri, deci fără `/s16` în body.

### Decizii **D102–D117** — confirmate

| ID | Subiect | Decizie |
| -- | ------- | ------- |
| **D102** | Locație `hitbox { }` | **A ✅** comp body (parse-time) — ca CLCD hit zones |
| **D103** | Geometrie MVP | **A ✅** `rect(x,y,w,h)` only — `circle`/`polygon`/path → **1+s** |
| **D104** | Sintaxă `renderer when` | **A ✅** cuvânt `when` + hitbox ref |
| **D105** | Evenimente MVP | **A ✅** press, release, drag, move |
| **D106** | `eventX` / `eventY` | **A ✅** variabile implicite în body `renderer when` only |
| **D107** | Declarație pouts | **C ✅** `pout :event as name[/format]` + exec redirect |
| **D108** | `touchType` | **A ✅** reuse CLCD 1/2/3 identic |
| **D109** | `stroke` în hitbox | **B ✅** gramatică hitbox separată |
| **D110** | Ordine draw la eveniment | **A ✅** exec `renderer` apoi `when` overlay |
| **D111** | Eveniment → redraw | **A ✅** coalesced redraw + pouts + `when` |
| **D112** | Format coordonate pout | **C ✅** explicit `as name/s16` pe **pout**; în `when` body `eventX`/`eventY` = **number** obișnuit |
| **D113** | Coordonate `rect` | **A ✅** litereale/int only — **fără wireRefs** (mecanism separat, amânat) |
| **D114** | Teste | **A** alocare **4840–4869** wave+legacy |
| **D115** | `clear` overlay | **A ✅** `renderer when` mereu overlay (implicit `clear=0`); fără `clear` în hitbox |
| **D116** | Locație `renderer when` | **A ✅** program block `.inlineRef { }` |
| **D117** | Draw init vs exec | **A ✅** `initDraw { }` + exec `renderer { }` obligatoriu |

---

#### **D102** — Unde se declară `hitbox { }`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | În **comp body** (sub attrs, înainte de `:`) | Vizibilitate declarativă; o singură definiție per comp; sketch | Extinde parser comp body (program block attrs) |
| **B** | În **exec block** `.game:{ hitbox { } … }` | Reuse parser exec | Hitbox per exec instanță; duplicare dacă mai multe exec |
| **C** | `inline [canvas-hitbox]` separat | Reutilizare | Fragmentare; sketch nu propune |

---

#### **D103** — Geometrie hitbox MVP

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A ✅** | Doar **`rect(x,y,w,h)`** litereale | Simplu; acoperă butoane/slider | Cercuri mai târziu |
| **B** | `rect` + **`circle(cx,cy,r)`** | Knob rotund | **Amânat → 1+s** |
| **C** | + `polygon` / path hit-test | Forme arbitrare | **Amânat → 1+s** |

---

#### **D104** — Sintaxă `renderer when`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | Bloc separat: `renderer when(rollButton) { }` / `when(slider:drag)` | Citește ca sketch; separare clară draw reactiv | Parser nou pe program block `.inlineRef { }` |
| **B** | `renderer { … }` cu prefix `on rollButton:press` în interior | Un singur bloc | Mai greu de citit; amestecă normal + event |

**Locație:** vezi **D116** — `renderer when` **nu** în exec block.

---

#### **D116** — Locație `renderer when`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A ✅** | **`renderer when`** doar în program block `.inlineRef { }` | Co-locat cu `hitbox`; exec rămâne wiring + `renderer` | Parser program block extins |

**Nu** în exec block. Vezi **D117** pentru `initDraw` vs `renderer` exec.

---

#### **D117** — `initDraw` (program block) vs `renderer` (exec)

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A ✅ (user)** | **`initDraw { }`** în `.inlineRef { }` — o singură rulare la init componentă; **`renderer { }` obligatoriu în exec** la fiecare `set`/`draw` | Nume explicit one-shot; exec rămâne ca F3 | Două blocuri draw de documentat |
| **B** | `renderer { }` în program block (semantica init implicită) | Un singur cuvânt `renderer` | Confuzie cu `renderer` exec |
| **C** | `onInit { }` | Event-style | Mai puțin aliniat cu vocabular draw |

**Semantica `initDraw`:** echivalent cu un **exec block la montarea componentei** — inferă pinii din args (union cu exec `renderer`), rulează **o dată** (clear `bgColor` ca draw normal). La primul `set`/`draw`, exec `renderer` preia (de obicei cu `clear=1` → înlocuiește frame-ul).

**Exec fără `renderer`:** elaboration error (actualizare **D41** la implementare F12 — comps interactive cer ambele).

**Pin inference:** union args din `initDraw` + exec `renderer` (ca două liste renderer într-un singur comp).

---

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | **press** (implicit), **release**, **drag**, **move** | Sketch complet; slider + hover | Mai mult în F12 |
| **B** | Doar **press** + **release** | MVP mic | Fără slider drag; F12b obligatoriu |

---

#### **D106** — `eventX` / `eventY`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | Identificatori **rezervați** în body `renderer when` only | Sketch; simplu pentru `drawCircle(eventX, eventY, 5)` | Nu în renderer normal |
| **B** | Injectate ca parametri fictivi ai unei metode anonime | Consistent cu metode | Sintaxă mai greoaie |

---

#### **D107** — Pouts pe hitbox

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A** | `pout :press as rollPressed` — nume pout pe comp | Sketch literal | Format wire neclar |
| **B** | Fără `pout` în hitbox — doar `rollPressed >= wire` în exec | Ca busy redirect | Mai verbose; pierde legătura event→pin |
| **C (recommended)** | **`pout :press as rollPressed`** + opțional **`/s16`** pe nume; exec **`rollPressed >= wire`** | Declarativ + wiring existent F3 | Parser nou dar simetric cu pins |

Forme pout (sketch):

```text
pout :press as isPressed
pout :release as isReleased
pout :drag:eventX as dragX/s16
pout :drag:eventY as dragY/s16
```

---

#### **D108** — `touchType`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | **Identic CLCD** — `1` momentary, `2` pulse, `3` latch | Reuse `clcd.js` logic / teste 1418+; doc unificat | — |
| **B** | Semnificații canvas-only | — | Duplicare, confuzie |

---

#### **D109** — `stroke` în hitbox vs inline canvas

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A** | Rename `debugStroke` / `hitboxStroke` | Evită confuzie în doc | Sketch schimbat; user respinge — limbaje diferite |
| **B ✅** | **Gramatică hitbox separată** — `stroke("rrggbb")` = contur debug geometrie hit-test; **inline** `stroke()` = path render (F10) | Ca CLCD; parse disjunct; sketch păstrat | Doc trebuie să explice cele două contexte |
| **C** | Attr comp global `hitboxColor` | Un singur flag debug | Nu per-hitbox |

**Implementare B:** fișier nou `canvas-hitbox-assembler.js` (sau secțiune în `canvas.js` parse) — tokenizer/stmt proprii; **fără** `CANVAS_BUILTINS` partajat.

---

#### **D115** — `clear` pe overlay `renderer when`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A ✅** | **`renderer when`** = **întotdeauna overlay** (implicit `clear=0`; fără attr `clear` în body F12) | Simplu; buton pressed fără full redraw | Fără full-replace per when în MVP |
| **B** | `clear` pe fiecare **hitbox** `{ … }` | — | **Respins** — nu are sens în hitbox |
| **C** | Attr comp `whenClear: 0` global | — | Respins |

**Backlog 1+r:** builtin **`clear()`** sau clear parțial cu `bgColor` în inline canvas — **nu** F12.

**Flux (D110 A + D111 A + D115 A + D117):**

```text
init componentă:
    → initDraw { } (o dată, clear bgColor)

set/draw sau eveniment input:
  → hit-test → pouts → schedule redraw coalesced
  → clear (pin exec, default 1)
  → renderer { } exec (scenă dinamică)
  → renderer when active (overlay, mereu clear=0)
  → busy 0
```

---

#### **D110** — Layering renderer + `when`

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | Pe frame: **clear** → renderer principal → **toate `when` active** pe acel frame (overlay) | Buton pressed vizibil peste board | Trebuie definit „active when” per eveniment |
| **B** | La eveniment: **doar** body `when`, fără renderer principal | Rapid | Flicker; fundal lipsește |
| **C** | `when` amânat la următorul `set` | Simplu | Feedback vizual întârziat |

**Propunere detaliu A:** `when(rollButton)` rulează în frame-ul evenimentului **press** (și opțional cât `touchType 1` ține apăsat); `when(:release)` la release.

---

#### **D111** — Eveniment declanșează redraw?

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A (recommended)** | Eveniment hitbox → schedule **coalesced redraw** (echivalent pulse `set`) + evaluare pouts + `when` overlay | UI reactiv fără script `set` manual | Coupling input→draw |
| **B** | Doar pouts; user trebuie `set = redraw` în logic | Separare strictă | Mai mult wiring |

---

#### **D112** — Format coordonate: pout vs `when` body

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **C ✅** | **Pout:** format explicit în declarație — **`as dragX/s16`**, **`as tapX/u16`**, etc. (codec F3). **`when` body:** `eventX` / `eventY` = **number** canvas obișnuit (pixel întreg), ca orice coordonată la `drawRect` / `drawCircle` — **fără** suffix `/s16` în expresie | Separă wire encoding (pout) de draw API (when) | — |

**Exemplu:**

```logts
# hitbox — format pe pout (wire)
pout :drag:eventX as dragX/s16

# renderer when — coordonate draw normale
renderer when(slider:drag) {
    drawKnob(eventX, eventY)    # eventX, eventY sunt number, nu pout
}
```

---

#### **D113** — `rect` args

| Opțiune | Descriere | Pro | Contra |
| ------- | --------- | --- | ------ |
| **A ✅** | **Literale** (int) în hitbox la parse — **fără wireRefs** | Hitbox declarativ fix; parse simplu | Zone mobile → logic + pout, nu mutare hitbox |
| **B** | Wire refs `rect(xPos/s16, …)` | Dinamic | **Respins F12** — necesită alt mecanism; multe întrebări deschise |
| **C** | Ambele | — | Respins |

**Notă:** hitbox dinamic (slider care se mută) = alt design post-F12, nu wire în `rect()`.

---

### Scope F12 (sub-faze propuse)

| Subfază | Conținut |
| ------- | -------- |
| **F12a** | Parse `hitbox { }` — gramatică separată: `rect`, `touchType`, `stroke`, `pout` |
| **F12b** | Hit-test widget (mouse+touch), stare momentary/pulse/latch (reuse CLCD) |
| **F12c** | Evenimente press/release/drag/move + `renderer when` |
| **F12d** | `eventX`/`eventY` + pouts (`pout :event[:field] as name`) |
| **F12e** | Integrare redraw (D110/D111/D115) + doc `comp-canvas.md` |
| **F12f** | Teste **4840+** |

### Criterii done F12 (draft)

- [ ] `hitbox { button: { rect(...); touchType = 1 } }` parse OK
- [ ] Click în rect → pout `:press` pulse/latch per touchType
- [ ] `stroke("ffff00")` în hitbox body — parser separat, fără conflict inline
- [ ] `renderer when` cu `clear = 0` overlay
- [ ] `slider:drag` + `eventX`/`eventY` în when body
- [ ] `pout :drag:eventX` → wire → renderer pin
- [ ] Fără variabile canvas persistente între exec
- [ ] Regresie F3/F10/F11
- [ ] Doc + suite **4840+**

### Status F12

**(draft — așteaptă confirmare D102–D114)** — sketch analizat; implementare după `D#: literă`.

---

## Tabel rezumat decizii (toate — draft)

| ID | Fază | Subiect | Recommended |
| -- | ---- | ------- | ----------- |
| **D1** | 1 | Kind `canvas` | **A ✅** |
| **D2** | 1 | Device UI Devices panel | **A ✅** |
| **D3** | 1 | size fixe elaborare | **A ✅** |
| **D4** | 1 | width/height obligatorii | **D ✅** |
| **D5** | 1 | metode cu body | **A ✅** |
| **D6** | 1 | delimitare body | **B ✅** |
| **D7** | 1 | bgColor default | **B ✅** `^000000` |
| **D8** | 1 | binding `.inline { }` | **A ✅** |
| **D9** | 1 | inline obligatoriu | **A ✅** |
| **D10** | 1 | Allow policy | **A ✅** |
| **D11** | 1 | fișiere split | **A ✅** |
| **D12** | 1 | teste 4700+ | **A ✅** |
| **D13** | 2 | statements în metode | **A ✅** |
| **D13b** | 2 | apel metodă→metodă | **A ✅** |
| **D14** | 2 | locals per call | **A ✅** |
| **D16** | 2 | color `"hex"` | **A ✅** |
| **D16b** | 2 | `0`/`"0"` + 8hex alpha | **✅** |
| **D18b** | 2 | styleFill/Stroke/style | **✅** |
| **D19c** | 2 | drawRect fill+stroke | **✅** |
| **D21c** | 2 | drawCircle fill+stroke | **✅** |
| **D18** | 2 | *(superseded D18b)* | — |
| **D19** | 2 | *(superseded D19c)* | — |
| **D20** | 2 | `drawLine` stroke | **A ✅** |
| **D21** | 2 | *(superseded D21c)* | — |
| **D22** | 2 | `drawText` basic | **A ✅** |
| **D22a** | 2 | `textAlign` builtin | **✅** default `left` |
| **D22b** | 2 | `textBaseline` builtin | **✅** default `alphabetic` |
| **D22c** | 2 | drawText = fill only | **A ✅** |
| **D22d** | 2 | `fontSize(n)` px, default 14 | **A ✅** |
| **D22e** | 5 | `fontFamily` / `fontStyle` | **F5** (1+k) |
| **D49** | 5 | tokeni family mono/sans/serif | **A ✅** |
| **D50** | 5 | builtin `fontStyle(family, size)` | **A ✅** |
| **D51** | 5 | `textAlign` start/end | **A ✅** |
| **D52** | 5 | familie invalidă → error | **A ✅** |
| **D53** | 6 | `drawSymbol` API | **A ✅** |
| **D54** | 6 | `symbolSize` / `symbolStyle` | **A ✅** |
| **D55** | 6 | size semantics CLCD | **A ✅** |
| **D56** | 6 | biți în `drawSymbol` | **B ✅** arg 4 |
| **D57** | 6 | `label` exclus | **A ✅** |
| **D58** | 6 | culori simboluri | **A ✅** |
| **D59** | 6 | validare size 8–64/120 | **A ✅** |
| **D60** | 6 | `symbolOn` | **respins** |
| **D61** | 6 | default symbolStyle | **A ✅** |
| **D62** | 7 | `if`/`else` JS-style | **A ✅** |
| **D63** | 7 | `else if` chain | **A ✅** |
| **D64** | 7 | comparații | **A ✅** |
| **D65** | 7 | truthiness ascii | **A ✅** |
| **D66** | 7 | `&&` `||` `!` | **A ✅** |
| **D67** | 7 | `if` doar în metode | **A ✅** |
| **D68** | 7 | teste 4760+ | **A ✅** |
| **D69** | 8 | `for` C-style | **A ✅** |
| **D70** | 8 | `while` | **A ✅** |
| **D71** | 8 | `++`/`--` | **B parțial** postfix `i++`/`i--` |
| **D72** | 8 | `break`/`continue` | **A ✅** permise |
| **D73** | 8 | max iterations | **A ✅** 10000 |
| **D74** | 8 | doar în metode | **A ✅** |
| **D75** | 8 | teste 4770+ | **A ✅** |
| **D76** | 9 | marcare vector | **C ✅** `param[]` în metodă |
| **D77** | 9 | lățime pin | **A ✅** din wire assign |
| **D78** | 9 | valoare param | **A ✅** array number/string |
| **D79** | 9 | `xs[i]` | **A ✅** doar pe param `[]` |
| **D80** | 9 | `vectorLen` | **A ✅** eroare pe scalar |
| **D81** | 9 | formate | **A ✅** toate scalar F3 |
| **D82** | 9 | match shape | **A ✅** param `[]` ↔ wire vector |
| **D83** | 9 | teste 4790+ | **A ✅** |
| **D84** | 10 | unghiuri `arc` | **A ✅** grade întregi |
| **D85** | 10 | sens `arc` | **B ✅** `counter` opțional, default 0 |
| **D86** | 10 | fără `beginPath` | **A ✅** eroare |
| **D87** | 10 | `fill`+`stroke` | **A ✅** ambele |
| **D88** | 10 | bezier | **A ✅** în F10 |
| **D89** | 10 | `polygon` | **A ✅** după `beginPath`; erori len mismatch / <3 |
| **D90** | 10 | teste 4800+ | **A ✅** |
| **D91** | 11 | param wire copie | **A ✅** `slice()` la bind |
| **D92** | 11 | nested | **amânat 1+o** |
| **D93** | 11 | assign copie | **A ✅** by value |
| **D94** | 11 | index 0-based | **A ✅** |
| **D95** | 11 | append `[]=` | **A ✅** |
| **D96** | 11 | index assign | **A ✅** `i>=len` eroare |
| **D97** | 11 | `rotatePoint` | **A ✅** expr → `[x,y]` |
| **D98** | 11 | `+=` concat | **A ✅** |
| **D99** | 11 | polygon numeric | **A ✅** |
| **D100** | 11 | literali `[]` | **A ✅** |
| **D101** | 11 | teste 4820+ | **A ✅** |
| **D102** | 12 | locație hitbox | **A ✅** comp body |
| **D103** | 12 | geometrie MVP | **A ✅** rect only → **1+s** |
| **D104** | 12 | `renderer when` | **A ✅** |
| **D105** | 12 | evenimente MVP | **A ✅** |
| **D106** | 12 | eventX/Y | **A ✅** number în when |
| **D107** | 12 | pouts | **C ✅** |
| **D108** | 12 | touchType | **A ✅** CLCD |
| **D109** | 12 | stroke hitbox | **B ✅** |
| **D110** | 12 | layering draw | **A ✅** |
| **D111** | 12 | event→redraw | **A ✅** |
| **D112** | 12 | format coords | **C ✅** pout explicit; when = number |
| **D113** | 12 | rect args | **A ✅** literal, fără wireRefs |
| **D114** | 12 | teste 4840+ | **A** |
| **D115** | 12 | clear overlay | **A ✅** when mereu overlay; fără clear în hitbox |
| **D116** | 12 | locație when | **A ✅** program block |
| **D117** | 12 | init vs exec draw | **A ✅** `initDraw` + exec `renderer` obligatoriu |
| **D23** | 2 | ops `+ - * /` | **A** |
| **D24** | 2 | `/` float | **A** |
| **D25** | 2 | number unificat | **A** |
| **D26** | 2 | fără bool/cmp | **A** |
| **D27** | 2 | erori skip/log | **A** |
| **D28** | 2 | `#` comment | **A** |
| **D29** | 3 | `renderer` în exec | **A** |
| **D30** | 3 | pins inferate | **A** |
| **D31** | 3 | ordine secvențială | **A** |
| **D32** | 3 | literal sau wire | **A** (+ **C** expr?) |
| **D33** | 3 | `/s16` codec | **A** |
| **D34** | 3 | vector → **1+l** | **A** |
| **D35** | 3 | `set` pulse/edge | **A** |
| **D36** | 3 | auto-clear bg | **A** |
| **D37** | 3 | `draw` vs `set` | **A** |
| **D38** | 3 | `busy` pout | **A** |
| **D39** | 3 | pending if busy | **A** |
| **D40** | 3 | rAF single-slot | **A** |
| **D41** | 3 | set fără renderer | **A** |
| **D42** | 3 | mock ctx tests | **A** |
| **D43** | 4 | un `canvas.md` | **A** |
| **D44** | 4 | osc exemplu | **A** |
| **D45** | 4 | soft dep observe | **A** |
| **D46** | 4 | mock not PNG | **A** |
| **D47** | 4 | wave+legacy | **A** |
| **D48** | 4 | doc demo | **A** |

---

## Riscuri / neclarități

| Topic | ID | Notă |
| ----- | -- | ---- |
| Sketch fără body metode | **D5** | **(change)** obligatoriu pentru MVP util |
| Binding inline omis în sketch | **D8** | Pattern logic recommended |
| `renderer` în exec vs body | **D29** | Sketch sugerează exec |
| Culori `"hex"` vs `^hex` | **D16** | User: fără `#`; string OK |
| `busy` aproape instant pe JS | **D38** | Tot util pentru sync cu alte comps |
| Fără loops | **1+b → F8** ✅ | `for`/`while` + break/continue |
| Fără vector renderer | **1+l → F9** | `param[]` + `16wire[N]` → array + `xs[i]` |
| Fără path API user | **1+e → F10** | `beginPath` … `fill`/`stroke`; `polygon` după `beginPath` |
| `fill`/`stroke` doar pe shortcuts | **1+i → F10** | `fill()` / `stroke()` pe path activ |
| Vectori doar din wire | **1+q → F11** | literali locali, `+=`, `rotatePoint` |
| Fără input canvas | **1+f → F12** | hitbox, when renderer, pouts |
| Nested vectors | **1+o** amânat | post-F11 |
| Depend observe | **D45** | Canvas MVP independent |
| Confuzie CLCD vs canvas | doc | CLCD = layout + touch + symbol blocks; canvas = draw API; **1+n** = același catalog simboluri via `drawSymbol` |

---

## Istoric plan

| Data | Eveniment |
| ---- | --------- |
| 2026-08-31 | Creat **canvas_inline_and_comp.plan.md** — analiză sketch; **F1–F4** draft; **D1–D48** draft; backlog **1+a …**; numerotare **D1** (plan nou) |
| 2026-09-01 | **D22d A✅** — `fontSize(n)` MVP default 14; **D22e** draft `fontFamily`/`fontStyle` → **1+k** |
| 2026-09-02 | **Batch F12** — **D102–D117 ✅**; Faza 12 **ready-to-implement** |
| 2026-09-02 | **D115 A, D117 A** — when overlay fix; `initDraw` program block + exec `renderer` obligatoriu |
| 2026-09-02 | **D116 A** — `renderer when` în program block `.inlineRef { }` |
| 2026-09-02 | **D102 A, D105 A, D109 B** confirmate — hitbox comp body; gramatică separată; `clear` pe `when` |
| 2026-09-02 | **1+f → Faza 12** — analiză sketch hitbox/input; D102–D115 draft |
| 2026-09-02 | **F11 done** — vectori locali, `+=`, `rotatePoint`, `polygon` numeric; teste **4820–4838** |
| 2026-09-02 | **F10 done** — path API; `polygon`; `arc` grade + `counter` default 0; teste **4800–4819** |
| 2026-09-02 | **D85 B** — `arc(..., counter)` sens explicit CCW/CW (nu infer din start/end) |
| 2026-09-02 | **1+e + 1+i → Faza 10** — path API; `arc` grade + `counter`; `polygon` după `beginPath`; D84–D90 |
| 2026-09-01 | **F9 done** — `param[]` vector args; `vectorLen`/`xs[i]`; teste **4790–4799** |
| 2026-09-01 | **1+l → Faza 9** — vector wire args renderer; teste **4790+** |
| 2026-09-01 | **F8 done** — break/continue; teste **4780–4788** |
| 2026-09-01 | **F5 done** — `fontFamily`/`fontStyle`/`textAlign` start|end; D49–D52 A; teste **4742–4749** |
| 2026-09-01 | **D16b/D18b/D19c/D21c** draft — stroke+fill separat (înlocuit de confirmare de mai sus) |
| 2026-09-01 | **D13/13b/14/16/18–22✅** + **D19b/D21b** fillColor opțional; **D22n** explicat (pending) |

---

## Legături

- [inline_logic2.plan.md](inline_logic2.plan.md) — `observe` (F108) ca sursă de inputuri
- [comp_clcd.plan.md](comp_clcd.plan.md) — pattern device canvas (nu API draw)
- [clcd-symbols.md](../../v0_3_2/doc/clcd-symbols.md) — catalog simboluri (**Faza 6**)
- [hotkey_on_comps.plan.md](hotkey_on_comps.plan.md) — structură plan + legendă (referință format)
