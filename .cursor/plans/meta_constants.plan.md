---
name: meta constants instance
overview: "Meta-constantă `/instance/` — valoare 4 biți la Run din instanța editorului; doar init wire top-level."
todos:
  - id: tokenizer-meta
    content: "Tokenizer: token META pentru /ident/"
    status: completed
  - id: meta-constants-module
    content: "core/meta-constants.js — resolveMetaConstant, registry"
    status: completed
  - id: parser-scope
    content: "Parser: metaConstantsScope, initLiteral META, erori chip/pcb/board"
    status: completed
  - id: interpreter-eval
    content: "Interpreter: evalAtom branch a.meta"
    status: completed
  - id: html-include
    content: "script_editor + run_tests: include meta-constants.js"
    status: completed
  - id: docs-meta
    content: "doc/meta-constants.md + assignment-operators + doc-data"
    status: completed
  - id: tests-meta
    content: "test_suite + manifest grup meta-constants 1230-1239"
    status: completed
isProject: true
---

# Plan: meta constants — `/instance/` (implementat)

Vezi [v0_3_2/doc/meta-constants.md](../v0_3_2/doc/meta-constants.md) pentru documentația utilizator.

## Rezumat

- `/instance/` → instanța Run (1–5) ca 4 biți: `0001` … `0101`
- Doar `Nwire name : /instance/` la **top-level**
- Pad/truncate ca literali `:` existenți
- Rezolvare la Run via `interp._instanceId` + `resolveMetaConstant()`
- Viitor: `/signalStrategy/` (stub în registry)
