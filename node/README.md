# Node scripts

## Rulabile — workflow normal

| Comandă | Ce face |
|---------|---------|
| `node node/_gen_test_manifest.js` | Regenerează `tests/test_manifest_generated.js`, `tests/test_runtime_bundle_generated.js`, actualizează `run_tests.html` și `index.html` (pipeline tail) |
| `node node/_run_test_suite_node.js` | Rulează toate testele (1121) în terminal |
| `node node/_gen_doc_data.js` | Regenerează `ui/doc-data_generated.js` + `searchPrimary` în `ui/doc-viewer.js` |
| `node node/_validate_doc_search.js` | Verifică keywords canonice search doc (conflicte, ranking MODE/ADD) |
| `node node/_audit_doc_search_gaps.js` | Raport built-ins fără pagină dedicată + acoperire searchPrimary |
| `node node/_gen_fa_index.js` | Parse FA CSS → `res/fonts/fa_index_generated.json` |
| `node node/_gen_clcd_symbols.js` | Generează `devices/clcd-symbols_generated.js` |
| `node node/_gen_huff_fsm_doc.js` | Afișează blocul `logts-play wave` FSM (stdout) |

## Huffman FSM (doc)

După modificări în `huffFsmScript` din `tests/test_suite.js`: `node node/_gen_huff_fsm_doc.js` (copie bloc în `doc/huffman-v2.md` dacă e cazul), apoi `node node/_gen_doc_data.js`.

## Verificare exemple doc (`_verify_doc_examples.js`)

Script utilitar (nu face parte din test suite). Rulează exemplele din documentație în Node.

| Comandă | Ce face |
|---------|---------|
| `node node/_verify_doc_examples.js PAGE` | Verifică `doc/PAGE.md` |
| `node node/_verify_doc_examples.js --list` | Pagini cu blocuri `logts-play` (+ marcaj `+extra`) |
| `node node/_verify_doc_examples.js --all` | Toate paginile (durează) |
| `node node/_verify_doc_examples.js --blocks-only PAGE` | Doar blocuri MD, fără extra |
| `node node/_verify_doc_examples.js --include-blocks PAGE` | Forțează blocuri MD chiar dacă `skipBlocks` |

Din rădăcina repo: `node node/_verify_doc_examples.js comp-logic`

### Ce verifică per pagină

1. **Blocuri `logts-play`** din markdown — programul trebuie să ruleze fără throw.
2. **Check-uri extra** din `node/doc_verify/<slug>.js` (opțional) — programe complete cu assert-uri pe wire-uri, output `show`, funcții custom.

`<slug>` = numele fișierului doc fără `.md` (ex. `comp-logic` → `doc/comp-logic.md` + `node/doc_verify/comp-logic.js`).

### Directorul `node/doc_verify/`

Addon opțional pentru pagini unde snippet-urile din doc nu sunt suficiente:

| Fișier | Pagină | Rol |
|--------|--------|-----|
| `inline-logic.js` | `doc/inline-logic.md` | 18 scenarii (liste, compound, constraints) |
| `comp-logic.js` | `doc/comp-logic.md` | 9 scenarii (pinuri, liste, mutații); `skipBlocks: true` |

Format modul:

```javascript
module.exports = {
  skipBlocks: true,   // opțional — sare blocurile MD (snippet-uri parțiale)
  cases: [
    {
      name: 'descriere scurtă',
      src: `... program LogTScript complet ...`,
      wires: { ok: '1' },              // valori așteptate pe wire
      expect: ['text în output show'], // substring în stdout
      check: (interp) => true,         // assert custom
    },
  ],
};
```

Paginile **fără** fișier în `doc_verify/` sunt verificate doar prin blocurile `logts-play` din markdown.

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
