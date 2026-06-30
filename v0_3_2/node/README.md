# Node scripts (v0_3_2)

## Rulabile — workflow normal

| Comandă | Ce face |
|---------|---------|
| `node node/_gen_test_manifest.js` | Regenerează `tests/test_manifest_generated.js`, `tests/test_runtime_bundle_generated.js`, actualizează `run_tests.html` și `script_editor_v0_3_2.html` (pipeline tail) |
| `node node/_run_test_suite_node.js` | Rulează toate testele (1121) în terminal |
| `node node/_gen_doc_data.js` | Regenerează `ui/doc-data_generated.js` din `doc/*.md` |
| `node node/_gen_fa_index.js` | Parse FA CSS → `res/fonts/fa_index_generated.json` |
| `node node/_gen_clcd_symbols.js` | Generează `devices/clcd-symbols_generated.js` |

## Debug (opțional)

- `node node/_debug_show_peek.js`
- `node node/_debug_test_group.js`

## `node/js/` — module helper (nu rulezi direct)

- `paths.js` — căi ROOT, TESTS, DOC, res/
- `test_scripts.js` — citește `tests/test_scripts.json`
- `test_detail_extract.js` — detalii manifest
- `test_node_sandbox.js` — DOM stub pentru runner Node

## Fișiere `_generated` (nu edita manual)

| Fișier | Locație |
|--------|---------|
| `test_manifest_generated.js` | `tests/` |
| `test_runtime_bundle_generated.js` | `tests/` |
| `doc-data_generated.js` | `ui/` |
| `clcd-symbols_generated.js` | `devices/` |
| `fa_index_generated.json` | `res/fonts/` |
| `fa_icons_meta_generated.json` | `res/fonts/` |

Sursă listă scripturi teste: `tests/test_scripts.json`
