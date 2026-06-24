---
name: Reorganizare v0_3_2
overview: "Restructurare `v0_3_2`: `node/` scripturi rulabile + `node/js/` module helper; output-uri generate lângă consumator; cache FA în `res/fonts/`; teste în `tests/`."
todos:
  - id: create-dirs-move
    content: Creează tests/, res/, node/, node/js/; mută fișierele conform regulilor de plasare
    status: completed
  - id: node-js-helpers
    content: Mută în node/js/ module doar pentru generatoare/runner
    status: completed
  - id: rename-generated
    content: Redenumește output-urile _generated; actualizează test_scripts.json și HTML
    status: completed
  - id: rename-scripts
    content: _gen_manifest → node/_gen_test_manifest.js; _run_suite_node → node/_run_test_suite_node.js
    status: completed
  - id: update-html
    content: Actualizează run_tests.html (via gen) și script_editor_v0_3_2.html
    status: completed
  - id: delete-obsolete
    content: Șterge doar core/_extract.js și devices/_extract_lcd.js; patches/ rămâne
    status: completed
  - id: node-readme
    content: node/README.md
    status: completed
  - id: validate
    content: _gen_test_manifest + _run_test_suite_node
    status: completed
isProject: false
---

# Reorganizare director v0_3_2

## Regula de plasare

| Tip | Unde |
|-----|------|
| Script rulabil `node …` | `node/` (rădăcina) |
| Modul JS folosit **doar** de scripturi din `node/` | `node/js/` |
| Output `_generated` folosit în **browser** | lângă consumator (`tests/`, `ui/`, `devices/`) |
| Cache JSON build (nu runtime) | `res/fonts/` |

## Structură directoare

```
v0_3_2/
  run_tests.html
  script_editor_v0_3_2.html
  doc/  core/  devices/  ui/  files/  patches/
  tests/          — test_suite, session, run_tests.js, test_scripts.json, *_generated.js
  res/js/         — vendor (codemirror, marked, …)
  res/css/        — vendor CSS + fontawesome/
  res/fonts/      — webfonts + fa_*_generated.json
  node/           — _gen_*.js, _run_*.js, _debug_*.js, README.md
  node/js/        — module require() doar pentru node/
```

## Workflow

```bash
node node/_gen_test_manifest.js
node node/_run_test_suite_node.js
node node/_gen_doc_data.js
node node/_gen_fa_index.js && node node/_gen_clcd_symbols.js
```

## Fișiere `_generated`

| Output | Locație |
|--------|---------|
| `test_manifest_generated.js` | `tests/` |
| `test_runtime_bundle_generated.js` | `tests/` |
| `doc-data_generated.js` | `ui/` |
| `clcd-symbols_generated.js` | `devices/` |
| `fa_index_generated.json` | `res/fonts/` |
| `fa_icons_meta_generated.json` | `res/fonts/` |

## Șters

- `core/_extract.js`, `devices/_extract_lcd.js`
- `res/fontawesome/` gol după mutare CSS

**Păstrat:** `patches/`
