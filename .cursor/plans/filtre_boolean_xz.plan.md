---
name: Filtre boolean XZ
overview: "Extindere plan ZSTATE: alfabet filtre * / A / X / Z, IEEE în analiză, exprOfLut actualizat pe attrs.filters."
todos:
  - id: logic-value-export
    content: Extrage eval IEEE 1-bit/vectorial în logic-value.js
    status: pending
  - id: filter-alphabet
    content: "boolean-lut.js: alfabet 0/1/X/Z/*/A, elimină x și toLowerCase"
    status: pending
  - id: filter-enumeration
    content: "enumerateFilteredEnvs partajat lutOf + exprOfLut"
    status: pending
  - id: exprofLut-filters-path
    content: "exprOfLut: varyingBitLabels pe *, buildFilteredOutputsByMinterm, extractLutOutputs X/Z"
    status: pending
  - id: ieee-eval-bool
    content: evalBooleanCall → logic-value IEEE
    status: pending
  - id: simplify-xz-rules
    content: "simplify/exprOfLut: literal X/Z uniform, eroare conflict minterm"
    status: pending
  - id: tests-docs-migrate
    content: Migrează teste x→*, teste exprOfLut 1505–1508, doc
    status: pending
isProject: false
---

# Filtre boolean `*` / `A` / `X` / `Z`

Plan de bază: [tristate_bus_buffer.plan.md](tristate_bus_buffer.plan.md) — **Faza 6** din acel plan (nu un al doilea proiect după ZSTATE).

**Ordine:** minim **Faza 1** ZSTATE (`logic-value.js`), apoi Faza 6. Fazele 2–5 ZSTATE pot rula în paralel cu Faza 6 sau înainte/după — vezi secțiunea „Ordine livrare” în planul principal.

Plan complet (detaliu implementare): `filtre_boolean_xz_155954f9.plan.md` în `.cursor/plans/`.

---

## exprOfLut și atributul `filters:` — stare actuală

**Nu** — codul actual nu ține cont de `*` / `A` / `X` / `Z`. Doar vechiul `x` (binar).

`exprOfLutBuildCore` citește `attrs.filters` prin:

1. `parseFiltersAttributeString` — OK (șir literal)
2. `validateAndBuildFilterMap` — doar `0/1/x` + `toLowerCase`
3. `varyingBitLabels` / `extractVaryingBitsFromEnv` — doar `pattern[i]==='x'`
4. `replayFilteredEnvs` — scan binar `2^N`, nu generează env cu X/Z
5. `buildFilteredOutputsByMinterm` — presupune `length === 2^numVars` (doar variabile `x`)
6. `extractLutOutputs` — doar boolean 0/1

---

## Ce trebuie făcut la exprOfLut

| Simbol în `filters:` | La `exprOfLut` |
|----------------------|----------------|
| `*` | Variabile auto (`A.2`, `B`, …); index QM |
| `A` | Rânduri enumerate în LUT; **nu** variabile; conflict dacă același minterm `*` → ieșiri diferite |
| `X`, `Z` fixe | Constante în env; nu în lista de variabile |
| `0`, `1` | Constante |

**Obligatoriu:** `enumerateFilteredEnvs()` **același** pentru `lutOf` și `exprOfLut` (ordinea rândurilor trebuie să coincidă cu `lutTable`).

**Cazuri limită:**
- Fără `*` (doar fix X/Z): `numVars=0`, literal ieșire
- Doar `A` fără `*`: eroare minimizare (sau literal dacă toate ieșirile identice)

Teste noi: **1498–1511** (round-trip `*` 1505, fix X/Z 1499/1506, conflict 1508).
