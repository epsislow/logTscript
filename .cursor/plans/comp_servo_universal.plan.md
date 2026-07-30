---
name: comp servo universal
overview: "comp [servo] = output pozițional: value = pași; path + rel; speed = viteză clară (atribut + pin); rate = scale ca la motor; length 1…16."
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
  - id: s3
    content: "S3: speed atribut+pin 7-bit + rate scale; doc/teste; suite verde"
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
| Comandă (`value`) | viteză spin (`0` = stop) | **pași** (poziție pe cursă) |
| Animație | rotație continuă | braț spre țintă, apoi stă |
| **`speed`** | — | viteză clară de mișcare (atribut + pin) |
| **`rate`** | scale animație spin (`factor = rate/10`) | scale animație slew (**același model**) |
| Mod | — | pin **`rel`**: `0` absolut, `1` relativ (Δ pași) |
| Sens / arc | pin `dir` + `reversed` | pin **`path`** 2-bit (+ atribut default) |

### `speed` vs `rate` (închis)

Două roluri separate — **nu** înlocuim unul pe altul:

| | `speed` | `rate` |
|--|---------|--------|
| **Ce e** | viteză de mișcare (clară, „cât de repede mergi”) | **multiplicator** / scale (ca la motor) |
| **Unde** | atribut **+ pin** 7-bit (override per mutare) | **doar atribut** (ca motor) |
| **Interval** | `1…100` (default `10`) | `1…100` (default `10`) |
| **Model** | valoare directă | `scale = rate / 10` |

**Viteză efectivă panel** (fără float în limbaj):

```
factor = speed * (rate / 10)
durată slew ∝ (pași pe arc) / factor
```

| `speed` | `rate` | Factor efectiv | Efect |
|---------|--------|----------------|--------|
| `10` | `10` | `10 × 1.0 = 10` | normal (default) |
| `5` | `10` | `5` | mai lent (viteză mică) |
| `10` | `5` | `5` | mai lent (scale 0.5×) |
| `10` | `20` | `20` | mai rapid (scale 2×) |
| `50` | `10` | `50` | aproape instant |

- **`speed` / `rate` nu schimbă** poziția stocată, wires, PLC sau `:get` — doar animația.
- La create: brațul pornește la unghiul inițial **fără** slew.

```logts
comp [servo] .arm1:
  length: 8
  minAngle: 0
  maxAngle: 360
  angle: 355
  path: short
  speed: 10
  rate: 10
  size: 14
  color: '#6dff9c'
  text: 'Arm'
  :
```

## Contract I/O

Ca `motor`, cu `path` + `rel` + **`speed`** + **`rate`**:

- **`value` = mereu pași** (index), **niciodată grade**
- **asignare** `.arm1 = expr` — absolut; `path` / `speed` / `rate` = atributele componentei
- **`{ value, set }`** — absolut; `path`, `speed`, `rate` = atribute
- **`{ value, speed, set }`** — override **viteză** doar pentru mutarea asta
- **`{ value, path, speed, rel, set }`** — override `path` și/sau `speed` per mutare
- **`:get`** — poziția stocată (pași); nu `path`, `rel`, `speed`, `rate`

`length`: **`1…16`**.

**Override per comandă (închis):**

| Pin | Dacă lipsește la `set` |
|-----|-------------------------|
| `path` | atributul `path` |
| `speed` | atributul `speed` |
| `rate` | atributul `rate` (fără pin — mereu atribut) |

Nu sticky.

### Mod absolut / relativ

(neschimbat față de planul anterior — `rel`, `path`, pași, wrap/clamp)

Animația: durată ∝ `travelSteps / (speed × rate/10)`.

### `length` vs grade

(neschimbat)

### Cursă, wrap, start

| Atribut | Tip | Default | Rol |
|---------|-----|---------|-----|
| `minAngle` | integer | `0` | Capăt cursă (grade) |
| `maxAngle` | integer | `180` | Capăt cursă |
| `angle` | integer | *(absent)* | Start în grade → pași la create |
| `path` | string | `short` | Arc default |
| `speed` | integer | `10` | Viteză mișcare default |
| `rate` | integer | `10` | Scale default (`rate/10`) |

### `path` — arc / sens

(neschimbat: pin 2-bit, `rel` 1-bit)

### `speed` — viteză mișcare

| Unde | Tip | Rol |
|------|-----|-----|
| **Atribut** `speed:` | integer `1…100` | Viteză default |
| **Pin** `speed` | **7 biți** → clamp `1…100` | Override **per mutare** |

```logts
# default speed + rate din atribute
.arm:{ value = cmd, set = 1 }

# mutare lentă — speed mic pe pin
.arm:{ value = cmd, speed = 0000011, set = 1 }    # speed 3, rate tot din atribut

# componentă cu rate lent global
comp [servo] .arm:
  speed: 10
  rate: 3
  :
```

### `rate` — scale (ca motor)

| Unde | Tip | Rol |
|------|-----|-----|
| **Atribut** `rate:` | integer `1…100` (default `10`) | `scale = rate / 10` |
| **Pin** | — | **nu** (ca la motor) |

```logts
comp [servo] .arm:
  speed: 10
  rate: 3      # toate mutările ~3× mai lente vizual (scale 0.3)
  :

comp [servo] .fast:
  speed: 10
  rate: 25     # scale 2.5× pe viteza de bază
  :
```

**`getDef` pins:** `set` (1), `value` (X), `path` (2), `rel` (1), **`speed` (7)**; pout: `get` (X).

## Afișaj panel

Atribute: `text`, `color`, `size`, **`speed`**, **`rate`**, `rotate`, `flip`, `nl`, `reversed`, `path`, `minAngle`, `maxAngle`, `angle`.

## Exemple

**180° + speed + rate:**

```logts
comp [servo] .arm1:
  length: 8
  minAngle: 0
  maxAngle: 180
  angle: 90
  speed: 10
  rate: 10
  :
```

**Speed dinamic pe mutare + rate fix pe componentă:**

```logts
comp [slider] .pos:
  length: 8
  :

comp [slider] .spd:
  length: 7
  text: 'Spd'
  :

comp [servo] .yaw:
  length: 8
  minAngle: 0
  maxAngle: 360
  speed: 10
  rate: 5
  on: 1
  :

8wire cmd = .pos:get
7wire spd = .spd:get
.yaw:{ value = cmd, speed = spd, set = 1 }
```

Load & Run: poziția vine din slider; viteza mutării din pin `speed`; `rate: 5` scalează global (factor 0.5).

## Livrare

| Sub-fază | Conținut |
|----------|----------|
| **S0–S2** | (livrat) |
| **S3** | Adaugă **`speed`** atribut + pin; **păstrează `rate`** scale; `slewDurationMs(steps, speed, rate)`; doc + teste; suite verde |

## Fișiere (S3)

- `servo.js` — `speed` în config/pins/applyProperties; `rate` rămâne
- `servo-widget.js` — `factor = speed * (rate/10)`
- `servo.md` — secțiuni separate `speed` vs `rate` (ca motor pentru rate)
- teste — pin speed, combinații speed+rate

API: `setServo({ position, path?, rel?, speed? })` — `rate` din state componentă (atribut).

Helpers: `slewDurationMs(travelSteps, speed, rate)`.

## Ce nu facem

- Pin `rate` (rămâne doar atribut, ca motor)
- `:speed` / `:rate` pout
- `speed` confundat cu poziția pe `value`
- PWM real; float în limbaj
