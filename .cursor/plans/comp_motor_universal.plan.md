---
name: comp motor universal
overview: "comp [motor] = output LogTscript (wires + panel animat): viteză = valoarea N-bit (0=stop), animație ∝ v cu rate întreg→float intern; temă #6dff9c; kinds rotor/fan/pump; PLC opțional."
todos:
  - id: m0
    content: "M0: plan în repo + sync P-ACT motor în comp_plc.plan.md"
    status: completed
  - id: m1
    content: "M1: motor 1-bit + temă existentă + kinds + size/color/rotate/flip + rate întreg; teste; suite verde"
    status: completed
  - id: m2
    content: "M2: length>1 viteză=valoare + animație ∝ v/(rate/10) + dir/reversed; teste wires; suite verde"
    status: completed
  - id: m3
    content: "M3: motor.md + logts-play + catalog/plc; sensor kind wheel; suite verde"
    status: completed
isProject: false
---

# Plan: `comp [motor]` universal (output animat)

## Recomandare produs

**Da — componentă LogTscript de sine stătătoare** (ca `sensor` / `led`), controlată cu **wires și asignări**. PLC e doar un consumator opțional.

```logts
8wire cmd = .speedIn:get
.motor = cmd
```

## MSB / LSB — clarificare (închisă)

**Nu împachetăm** run în MSB sau LSB.

Dacă senzorul/slider-ul are **8 biți** și motorul are **`length: 8`**:

- wire-ul e **aceeași lățime** → asignare directă;
- **întreaga valoare** = comandă de **viteză** `0 … 255`;
- **`0` = oprit**, `>0` = rulează.

Nu există „bitul 7 = RUN, biții 0–6 = speed”.

**Direcție** (separat de viteză):

- `reversed` — sens fix pe componentă
- pin `dir` (M2) — 1-bit în `{ value, dir, set }` — sens dinamic din wire

## Animație ∝ viteza primită + `rate` întreg (închis)

Viteza de rotație pe panel **urmează valoarea stocată**, apoi e scalată doar pentru afișaj.

**Fără float în LogTscript** — la fel ca `scale` pe `bar` / `7seg` / `14seg` / `dots`: utilizatorul scrie un **întreg**; noi îl transformăm intern în factor float.

| Atribut | Rol pe motor |
|---------|----------------|
| **`size`** | dimensiunea glyph-ului (ca slider/sensor) |
| **`rate`** | factorul **vitezei animației** (întreg → float intern) |

**Mapare (zecimi):** `factor = rate / 10`

| Sintaxă | Factor intern | Efect |
|---------|---------------|--------|
| `rate: 3` | `0.3` | ~3× mai lent |
| `rate: 10` (default) | `1.0` | viteză mapată normal |
| `rate: 20` | `2.0` | ~2× mai rapid |

Interval acceptat: **`1…100`** (factor `0.1…10`). `period = T(v) / factor`, clamp la minim (~0.08s/tură).

```logts
comp [motor] .drive:
  length: 8
  size: 14
  rate: 3    # echivalent vizual 0.3×; comanda rămâne 0…255
  :
```

| Caz | Comportament |
|-----|----------------|
| valoare `0` | animație oprită |
| `length: 1`, valoare `1` | viteză didactică de bază × `rate/10` |
| `length` N>1, valoare `v` | `T` din maparea liniară `1…vmax` → `T_slow…T_fast`, apoi `/ (rate/10)` |

**Nu** extindem parserul pentru `N.M`. **Nu** folosim `scale` pe motor (pe display = mărime UI; aici mărimea e `size`). **Nu** `shownSpeed` / `mag`.

Implementare: widget setează `--motor-period`; `paused` când `v === 0`. Sensul (`reversed` / `dir`) = `animation-direction`.

## Ce înseamnă `kind` (fără jargon „dc”)

`dc` însemna „motor DC” — neclar. **Kinds v1:**

- **`rotor`** (default) — ax / motor generic (disc + crestătură)
- **`fan`** — ventilator (pale)
- **`pump`** — pompă

Același contract I/O; doar skin + animație.

## Afișaj panel — temă LogTscript existentă (închis)

La fel ca `sensor`: **clase noi `.motor-*`**, dar **același look** ca panelul actual — nu temă nouă.

- Accent default **`#6dff9c`** (ca slider / sensor / rotary / dip / bar)
- CSS var `--motor-color` + `color-mix` glow ca la `--sensor-color` / `--slider-color`
- Wrapper + label: aceleași tipografii / spacing ca `.sensor-wrapper` / `.led-wrapper`
- Glyph minimal (SVG/CSS), fără skin „dashboard” sau glow neon nou
- Surse de stil: [`script_editor_v0_3_2.html`](v0_3_2/script_editor_v0_3_2.html) (blocurile `.sensor-*`, `.slider-*`, `.led-*`)

Atribute: `text`, `color`, `size` (1…20), `rate` (1…100, default 10 → factor `rate/10`), `rotate` (0/90/180/270), `flip`, `nl`, `reversed`

## Contract I/O

**M1** — `length: 1`: `.m = 1` / `.m = 0` (run/stop).

**M2** — `length` 2…8: `value` = viteză unsigned; `dir` opțional; `:get` = viteza.

### Exemplu senzor → motor (8 = 8)

```logts
comp [slider] .wheel:
  length: 8
  text: 'W'
  :

comp [motor] .drive:
  kind: rotor
  length: 8
  size: 14
  on: 1
  :

8wire cmd = .wheel:get
.drive:{ value = cmd, set = 1 }
```

**M3:** extindere `comp [sensor]` cu `kind: wheel` (skin tip roată de comandă) — aceeași regulă 8→8.

### PLC (opțional)

`outputs: { MOTOR = .drive }` — aceeași lățime ca motorul.

## Livrare

| Sub-fază | Conținut |
|----------|----------|
| **M0** | Plan în repo + sync `comp_plc` |
| **M1** | 1-bit + animație temă existentă + kinds + size/color/rotate/flip/`rate` întreg |
| **M2** | length>1 viteză=valoare + periodă ∝ v / (`rate/10`) + dir/reversed + wires |
| **M3** | `motor.md` + `logts-play` + catalog; `sensor` `kind: wheel` |

După fiecare fază: suite verde. Doc fără nume de faze.

## Fișiere

- [`v0_3_2/core/components/motor.js`](v0_3_2/core/components/motor.js)
- [`v0_3_2/devices/motor-widget.js`](v0_3_2/devices/motor-widget.js)
- register + CSS + device-maps + teste + docs
- M3: `KIND_PROFILES.wheel` pe sensor

## Ce nu facem în v1

- Împachetare MSB/LSB run+speed
- Servo / stepper / encoder
- `comp [fan]` separat
- Float RPM în limbaj
