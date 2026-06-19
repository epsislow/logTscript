---
name: Filtre boolean XZ
overview: "Extindere plan ZSTATE: alfabet filtre * / A / X / Z, IEEE în analiză, exprOfLut actualizat pe attrs.filters."
todos:
  - id: logic-value-export
    content: Extrage eval IEEE 1-bit/vectorial în logic-value.js
    status: completed
  - id: filter-alphabet
    content: "boolean-lut.js: alfabet 0/1/X/Z/*/A, elimină x și toLowerCase"
    status: completed
  - id: filter-enumeration
    content: "enumerateFilteredEnvs partajat lutOf + exprOfLut"
    status: completed
  - id: exprofLut-filters-path
    content: "exprOfLut: varyingBitLabels pe *, buildFilteredOutputsByMinterm, extractLutOutputs X/Z"
    status: completed
  - id: ieee-eval-bool
    content: evalBooleanCall → logic-value IEEE
    status: completed
  - id: simplify-xz-rules
    content: "simplify/exprOfLut: literal X/Z uniform, eroare conflict minterm"
    status: completed
  - id: tests-docs-migrate
    content: Migrează teste x→*, teste 1512–1525, doc
    status: completed
isProject: false
---

# Filtre boolean `*` / `A` / `X` / `Z`

**Status:** ✅ implementat — regresie **960/960** verzi.

Plan părinte: [tristate_bus_buffer.plan.md](tristate_bus_buffer.plan.md) — **Faza 6**.

---

## Rezumat livrat

| Simbol în `filters:` | Comportament |
|----------------------|--------------|
| `*` | Don't-care binar → variabilă QM (`exprOfLut` / `simplify`) |
| `A` | Don't-care 0/1/X/Z → expande rânduri LUT, nu variabilă |
| `X`, `Z` | Valori fixe în env; eval IEEE la porți |
| `0`, `1` | Fix binar |
| `x` (vechi) | **Respins** — mesaj `use '*' instead of 'x'` |

## Fișiere

- [boolean-lut.js](../v0_3_2/core/boolean-lut.js) — `enumerateFilteredEnvs`, `validateAndBuildFilterMap`, `evalBooleanCall` IEEE, `buildFilteredOutputsByMinterm` cu conflict
- [boolean-analysis.js](../v0_3_2/core/boolean-analysis.js) — `truthTableOf` / `simplify` pe același enumerator
- [logic-value.js](../v0_3_2/core/logic-value.js) — `evalLogicGateCall` (deja din Faza 1)
- Doc: [boolean-lut.md](../v0_3_2/doc/boolean-lut.md), [boolean-analysis.md](../v0_3_2/doc/boolean-analysis.md), [debug.md](../v0_3_2/doc/debug.md)

## Teste

- Migrare `x` → `*` în teste bool-lut existente (1143–1154, etc.)
- Noi **1512–1525** (14): reject `x`, `*` row count, IEEE X/Z, `A` expand, simplify literal X/Z, round-trip `*`, …

---

## Plan următor (neimplementat)

→ [filtre_wire_compacte.plan.md](filtre_wire_compacte.plan.md) — ✅ **implementat** (968/968)
