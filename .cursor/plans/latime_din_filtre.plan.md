---
name: Lățime din filtre
overview: Inferența lățimii pentru fire nedeclarate (fără bitrange în expresie) din pattern-ul filtrelor, cu fallback la 1 bit; aplicată la `simplify`, `truthTableOf`, `lutOf` înainte de `discoverLutOfInputs`.
todos:
  - id: filter-width-helpers
    content: Adaugă buildFilterWidthMap, makeAnalysisWidthResolver, discoverColumnsForAnalysis în boolean-lut.js
    status: completed
  - id: wire-call-sites
    content: Înlocuiește discoverLutOfInputs în truthTableOf/simplify/lutOf/exprOfLut cu resolver îmbunătățit
    status: completed
  - id: tests-1537-1542
    content: Teste funcționale 1537–1542 (inferență C din filtru, default 1, slice, regresie declarat)
    status: completed
  - id: docs-filter-width
    content: Documentează regulile în boolean-analysis.md și boolean-lut.md; regenerează doc-data + manifest
    status: completed
isProject: false
---

# Inferență lățime variabile nedeclarate din filtre

## Problema actuală

Fluxul din [`boolean-analysis.js`](v0_3_2/core/boolean-analysis.js) / [`boolean-lut.js`](v0_3_2/core/boolean-lut.js):

```mermaid
flowchart LR
  discover["discoverLutOfInputs(expr, widthResolver)"]
  validate["validateAndBuildFilterMap(columns, filters)"]
  discover --> validate
```

`_makeWidthResolver()` returnează doar fire declarate. Filtrele sunt ignorate la discover → `C` nedclarat = **1b**, deși `C=01` are 2 caractere → `pattern length mismatch`.

**Notă:** atomii cu `bitRange` în expresie (`C.0-1`, `C.1-2`) sunt deja corecți — lățimea coloanei = lățimea slice-ului.

---

## Reguli (confirmate)

| Situație | Lățime wire părinte (pentru `C` fără slice în expr) |
|----------|-----------------------------------------------------|
| `Nwire C` declarat | declarația (prioritar) |
| Nedclarat, filtru `C=pattern` (fără bitrange) | `pattern.length` |
| Nedclarat, filtru `C.start-end=pattern` / `C.start/len=pattern` | `max(end, start+len-1) + 1` |
| Nedclarat, fără filtru pentru `C` | **1** |
| Expresie folosește `C.i` / `C.0-1` / `C.1/3` | lățime coloană din slice (neschimbat) |

**Scope:** `simplify`, `truthTableOf`, `lutOf`, `exprOfLut` (cu filters). **`inputsOf` rămâne fără filtre.**

---

## Implementare

### Helpers în [`boolean-lut.js`](v0_3_2/core/boolean-lut.js)

- `parentWireWidthFromFilterSpec(f)`
- `buildFilterWidthMap(filters)` — `Math.max` pe același wire
- `makeAnalysisWidthResolver(baseResolver, filterWidthMap)`
- `discoverColumnsForAnalysis(exprAst, widthResolver, filters)`

### Call-site-uri

- `truthTableOfGenerate`, `simplifyGenerate` în boolean-analysis.js
- `lutOfBuild`, `exprOfLutBuildCore` în boolean-lut.js
- `validateAndBuildFilterMap` cu același enhanced resolver

### Teste 1537–1543 (grup `bool-filt`)

### Doc: boolean-analysis.md, boolean-lut.md
