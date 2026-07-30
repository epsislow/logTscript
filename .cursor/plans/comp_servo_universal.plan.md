---
name: comp servo universal
overview: "comp [servo] = output pozițional: value = pași (index); absolut (rel=0) + path short/long/cw/ccw; relativ (rel=1) + path cw/ccw; slew cu rate; length 1…16."
todos:
  - id: s0
    content: "S0: plan în .cursor/plans/comp_servo_universal.plan.md + note motor/plc"
    status: completed
  - id: s1
    content: "S1: servo core+widget+registry/CSS + teste mapare/path/rel/slew; suite verde"
    status: completed
  - id: s2
    content: "S2: servo.md + logts-play (absolut+relativ+360) + catalog; suite verde"
    status: completed
isProject: false
---

# Plan: `comp [servo]` universal (poziție / unghi)

## Decizie produs (închisă)

**Componentă nouă** `comp [servo]` — **nu** `kind` pe `motor`.

**Doar pozițional** (are țintă, se oprește). **Nu** „continuous rotation” (ăla e `comp [motor]`).

Include și servo **0…360°**: tot poziție absolută; diferența e că pe cerc există **două arce** spre aceeași țintă — userul alege arcul cu `path`.

| | `motor` | `servo` |
|--|---------|---------|
| Valoare | viteză (`0` = stop) | **pași** (index `0…vmax`) → unghi pe cursă |
| Animație | rotație continuă | braț spre țintă, apoi stă |
| `rate` | factor viteză spin | **slew** pe arcul ales (`rate` mare ≈ instant) |
| Mod | — | pin **`rel`**: `0` absolut, `1` relativ (Δ pași) |
| Sens / arc | pin `dir` + `reversed` | pin **`path`** 2-bit (+ atribut default); la `rel=1` doar **`cw`/`ccw`** |

```logts
comp [servo] .arm1:
  length: 8
  minAngle: 0
  maxAngle: 360
  angle: 355
  path: short
  size: 14
  rate: 10
  color: '#6dff9c'
  text: 'Arm'
  :
```

Exemplu: la `355°` → țintă `0°`:

- `path: short` → ~5° (prin 360)
- `path: long` → ~355°
- `path: cw` / `path: ccw` → sens forțat (lungimea = arcul în acel sens)

## Contract I/O

Ca `motor`, cu `path` + `rel`:

- **`value` = mereu pași** (index pe grila `length`), **niciodată grade** — nici absolut, nici relativ
- **asignare** `.arm1 = expr` — poziție absolută (pași); arc = atributul `path`; `rel` implicit `0`
- **`{ value, set }`** — absolut; arc = atribut
- **`{ value, path, set }`** — absolut + override arc (doar mutarea asta)
- **`{ value, path, rel, set }`** — cu `rel = 1`: mutare **relativă** cu `|value|` pași; `path` **obligatoriu** `cw` sau `ccw`
- **`:get`** — poziția stocată (pași, `length` biți); nu `path`, nu `rel`

`length`: **`1…16`**. Index unsigned `0…vmax` (`vmax = 2^length − 1`).

**Override `path`:** dacă pinul `path` lipsește la `set` → atributul `path`. Per comandă, nu sticky.

### Mod absolut (`rel = 0`, default)

- `value` = poziție țintă în **pași** (`0…vmax`)
- `path` = `short` | `long` | `cw` | `ccw` (atribut sau pin) — alegerea **arcului** spre țintă (relevant pe span 360°)

### Mod relativ (`rel = 1`)

- `value` = **|Δ pași|** (magnitudine, nu grade)
- `path` = **`cw`** sau **`ccw`** singure valori valide (`10` / `11` pe pin)
  - `cw` → `poziție_nouă = poziție_curentă + value` (în pași)
  - `ccw` → `poziție_nouă = poziție_curentă − value`
- `short` / `long` cu `rel = 1` → **eroare** la elaborare/aplicare
- După calcul: pe span **360°** → wrap index modulo `vmax + 1`; pe span **&lt; 360** → **clamp** `0…vmax`
- Animația: slew pe arcul efectiv (|Δ| pași în sensul ales); durată ∝ pași / `rate`
- `:get` după `set`: poziția absolută rezultată (pași)

**Fără** pin `delta` în grade; conversia grade→pași rămâne în logica userului dacă e nevoie.

### `length` vs grade (închis)

Două axe separate — **nu** există „lățime în biți a unghiului în grade”:

| Ce | Unde | Unitate |
|----|------|---------|
| Lățime comandă / wire / `:get` | atribut **`length`** | biți **`1…16`** |
| Comandă | pin **`value`** | **pași** (index), absolut sau Δ pași dacă `rel=1` |
| Cursa mecanică | **`minAngle`…`maxAngle`** | grade (întregi) |
| Poziție start (opțional) | **`angle`** | grade → cuantizat la pași la create |

**Rezoluție:** `pas ≈ (maxAngle − minAngle) / vmax`, cu `vmax = 2^length − 1`.

| `length` | `vmax` | pe cursă 0…180 | pe cursă 0…360 |
|----------|--------|-----------------|-----------------|
| `1` | 1 | 0° sau 180° | 0° sau 360° |
| `8` | 255 | ~0.7° / pas | ~1.4° / pas |
| `9` | 511 | ~0.35° / pas | ~0.7° / pas |
| `16` | 65535 | fin didactic | fin didactic |

Wire-ul rămâne binar (ex. `16wire cmd = .yaw:get`) — tot **pași**, nu grade.

Plafon **16** (nu 32/64): destul pentru bus-uri uzuale.

### Mapare pași ↔ unghi (afișaj)

- `v = 0` → `minAngle`
- `v = vmax` → `maxAngle`
- intermediar: `θ = minAngle + (v / vmax) * (maxAngle − minAngle)`

**`reversed`**: inversează maparea valoare↔unghi; `:get` rămâne bin-ul stocat.

### Cursă, wrap, start

| Atribut | Tip | Default | Rol |
|---------|-----|---------|-----|
| `minAngle` | integer | `0` | Capăt cursă (grade) |
| `maxAngle` | integer | `180` | Capăt cursă; **`minAngle < maxAngle`**, span **`≤ 360`** |
| `angle` | integer | *(absent)* | Poziție inițială în grade → cuantizată la create |
| `path` | string | `short` | Arc de mers spre țintă — vezi mai jos |

Interval grade: **`-360…360`** pentru `minAngle` / `maxAngle` / `angle`. `angle` clampează pe `[minAngle, maxAngle]` apoi cuantizează.

**Wrap (cerc):** activ **doar** când `maxAngle - minAngle === 360` (ex. `0…360`). Atunci `0°` și `360°` sunt același punct pe cerc; există două arce între orice pereche de unghiuri distincte.

**Span &lt; 360** (ex. `0…180`): un singur drum pe segment; `path` e acceptat dar `short`/`long` coincid; `cw`/`ccw` care ar ieși din cursă → se folosește unicul drum valid (doc + test).

Precedență create: `angle` dacă e prezent → bin; altfel `initialValue` (default zeros → `minAngle`).

### `path` — arc (absolut) sau sens (relativ)

Nume: **`short`** | **`long`** | **`cw`** | **`ccw`**.

| Mod | `rel` | `path` permis | Rol |
|-----|-------|---------------|-----|
| absolut | `0` | toate | arc spre țintă (wrap 360°) |
| relativ | `1` | **`cw`**, **`ccw` only** | sens ±Δ pași |

| `path` | Comportament (`rel=0`, span 360°) |
|--------|-----------------------------------|
| `short` (**default atribut**) | arcul minim în pași |
| `long` | arcul maxim |
| `cw` / `ccw` | sens forțat |

**Atribut** `path:` — string; default `short` (folosit la absolut când pinul lipsește).

**Pin** `path` — **2 biți**:

| Bin | Mod |
|-----|-----|
| `00` | `short` |
| `01` | `long` |
| `10` | `cw` |
| `11` | `ccw` |

**Pin** `rel` — **1 bit**: `0` absolut (default), `1` relativ.

```logts
# absolut — pași țintă, arc scurt
.yaw:{ value = cmd, set = 1 }

# absolut — override arc
.yaw:{ value = cmd, path = 10, set = 1 }

# relativ — +14 pași (cw); value = magnitudine în pași, NU grade
.yaw:{ value = 00001110, path = 10, rel = 1, set = 1 }

# relativ — −14 pași (ccw)
.yaw:{ value = 00001110, path = 11, rel = 1, set = 1 }
```

- `getDef` pins: `set` (1), `value` (X), `path` (2), `rel` (1); pout: `get` (X).

### `rate` (slew)

Întreg `1…100` (default `10`); `factor = rate / 10`.

- Durată ∝ `(lungime arc) / factor`.
- `rate` mare → aproape instant.
- Nu schimbă stocare / wires / PLC / `:get`.

La create: brațul pornește la unghiul inițial **fără** slew de la 0.

## Afișaj panel

Clase `.servo-*`, accent `#6dff9c`, glyph **bază + braț/horn**; fără kinds în v1.

Atribute afișaj: `text`, `color`, `size` (`1…20`), `rate`, `rotate` (`0|90|180|270`), `flip`, `nl`, `reversed`, plus `path` / `minAngle` / `maxAngle` / `angle`.

## Exemple

**Clasic 180°:**

```logts
comp [servo] .arm1:
  length: 8
  minAngle: 0
  maxAngle: 180
  angle: 90
  rate: 10
  :
```

**Full circle — absolut + relativ:**

```logts
comp [slider] .pos:
  length: 8
  :

comp [dip] .pathSel:
  length: 2
  text: 'Path'
  :

comp [switch] .relOn:
  text: 'Rel'
  :

comp [servo] .yaw:
  length: 8
  minAngle: 0
  maxAngle: 360
  angle: 355
  path: short
  rate: 10
  :

8wire cmd = .pos:get
2wire p = .pathSel:get
1wire r = .relOn:get

# absolut: țintă în pași din slider, arc din dip
.yaw:{ value = cmd, path = p, rel = 0, set = 1 }

# relativ: +N pași cw (N în value, ex. 14 pași ≈ ~20° pe cursă 360/255)
.yaw:{ value = 00001110, path = 10, rel = 1, set = 1 }
```

PLC opțional: `outputs: { ARM = .arm1 }` — aceeași lățime.

## Livrare

| Sub-fază | Conținut |
|----------|----------|
| **S0** | Plan în [`.cursor/plans/comp_servo_universal.plan.md`](.cursor/plans/comp_servo_universal.plan.md) + notă motor/plc (servo pozițional ≠ motor continuu) |
| **S1** | Core + widget + registry/CSS + teste: pași↔unghi, `angle`, wrap/clamp, `path` absolut, `rel`+`path` cw/ccw, slew, wires; suite verde |
| **S2** | `servo.md` + `logts-play` (180 + 360/path) + catalog; suite verde |

## Fișiere

- Nou: [`v0_3_2/core/components/servo.js`](v0_3_2/core/components/servo.js), [`v0_3_2/devices/servo-widget.js`](v0_3_2/devices/servo-widget.js), [`v0_3_2/doc/servo.md`](v0_3_2/doc/servo.md)
- Register + CSS + device-maps + teste + generatoare doc/manifest

API: `addServo` / `setServo({ position, path?, rel? })`.

Helpers pure: `angleFromValue`, `valueFromAngle`, `pathFromBin` / `binFromPath`, `resolveTravelSteps(from, to, path, wrap)`, `applyRelative(from, deltaSteps, path, vmax, wrap)`, `slewDurationMs(travelSteps, rate)`.

## Ce nu facem în v1

- Rotație continuă; `kind: continuous`
- Pin `dir`; pin **`delta`** în grade; `value` ca grade
- `:path` / `:rel` pout; sticky rewrite atribut din pin
- PWM real; float; pout `:angle` în grade
- Multiple kinds vizuale
