---
name: Osc afterSettle mode
overview: "Flag boolean `afterSettle` pe osc (prezent = activ): tranzițiile HIGH/LOW folosesc delay0/delay1 + delayIsSec post-propagare; absent = comportament actual freq/duration."
todos:
  - id: osc-parser-flag
    content: "Parser + getDef: afterSettle flag boolean (prezență, fără valoare 0/1)"
    status: completed
  - id: osc-delay-helper
    content: Helper oscDelayMs + validare delay0/delay1/delayIsSec când afterSettle activ
    status: completed
  - id: osc-createDevice
    content: Ramură afterSettle în createDevice (highTime/lowTime din delay, setTimeout post scheduleComponentOutputChange)
    status: completed
  - id: osc-interpreter-dedup
    content: Sincronizează sau deduplicate bloc osc legacy din interpreter.js
    status: completed
  - id: osc-doc
    content: Secțiune afterSettle în oscillator.md + exemple delayIsSec + sintaxă flag
    status: completed
  - id: osc-tests
    content: Teste parser 154 + unit oscDelayMs 155–157; regen manifest
    status: completed
isProject: false
---

# Osc `afterSettle` — plan implementare

## Problema actuală

[`osc.js`](v0_3_2/core/components/osc.js) calculează timpii HIGH/LOW din `freq` + `duration0`/`duration1` și lansează `setTimeout` după `scheduleComponentOutputChange`. Utilizatorul vrea un mod explicit: **așteaptă X după settle**, cu unități paralele cu `freqIsSec`, activat printr-un **flag boolean** (prezență), nu `afterSettle: 0|1`.

Există cod **duplicat** (legacy) în [`interpreter.js`](v0_3_2/core/interpreter.js) L10536–10628 — calea activă e registry → `osc.js`.

---

## Decizii confirmate

| Item | Decizie |
|------|---------|
| Flag | **`afterSettle`** — **boolean by presence** (ca `onlyDigits`, `circular`) |
| Sintaxă | `afterSettle` pe linie proprie **fără valoare**; absent = mod clasic |
| Mod activ (flag prezent) | Doar **`delay0`**, **`delay1`**, **`delayIsSec`** — **`freq` / `duration0` / `duration1` ignorate** |
| Mod implicit (flag absent) | Comportament actual neschimbat (`freq` + `duration*`) |
| `eachCycle`, `length`, `reset` | Neschimbate în ambele moduri |

**Nu** acceptăm `afterSettle: 0` / `afterSettle: 1` — dacă apare cu valoare, eroare de parse (preferat: „afterSettle is a flag, no value”).

---

## Sintaxă (exemple)

Mod clasic (neschimbat):

```logts
comp [~] .clk:
  freq: 10
  duration1: 1
  duration0: 7
  :
```

Mod afterSettle:

```logts
comp [~] .clk:
  afterSettle
  delay0: 10
  delay1: 10
  delayIsSec: 0
  length: 4
  eachCycle: 1
  :
```

Pattern existent: [`keyboard.js`](v0_3_2/core/components/keyboard.js) `onlyDigits` + parser [`attributesWithNoValues`](v0_3_2/core/parser.js) L2621.

---

## Semantica timpilor (parallel cu `freq` / `freqIsSec`)

```javascript
function oscDelayMs(value, delayIsSec) {
  if (value <= 0) throw ...;
  return delayIsSec === 1 ? value * 1000 : 1000 / value;
}
```

| delayIsSec | delay0 / delay1 | Așteptare post-settle |
|------------|-----------------|------------------------|
| **0** (default) | int ≥ 1 | **`1000 / delay`** ms — `delay0: 10` → 100ms |
| **1** | număr > 0 | **`delay * 1000`** ms — `delay1: 5` → 5s |

- **`delay0`** — după settle în faza LOW, înainte de HIGH
- **`delay1`** — după settle în faza HIGH, înainte de LOW

---

## Implementare

1. **Parser** — `afterSettle` în `attributesWithNoValues` + ramură `attributes.afterSettle = true`
2. **osc.js** — `{ name: 'afterSettle', value: null }`; ramură timing cu `delay*`
3. **interpreter.js** — sync fallback legacy
4. **oscillator.md** + teste **154–157**

## Acceptance

- Fără `afterSettle` → regresie zero pe teste osc **134–153**
- Cu flag + delays → timing post-settle
- `afterSettle: 1` → eroare parse
