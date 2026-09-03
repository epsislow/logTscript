# LogTscript

Didactic language and digital-logic simulator for teaching digital systems: wires, interactive panels, chips, displays, network, CPU (ASM/ISA), RAM, LUT, PLC, protocols, Prolog-like logic, and physical-style components.

## Latest version

**`v0_3_2/`** is the current version.

| Open in browser | Path |
|-----------------|------|
| Script editor | [`v0_3_2/script_editor_v0_3_2.html`](v0_3_2/script_editor_v0_3_2.html) |
| Test runner | [`v0_3_2/run_tests.html`](v0_3_2/run_tests.html) |

Serve the folder over HTTP (for example with WAMP or any local static server) and open the editor URL. The in-app doc viewer covers language and components under `v0_3_2/doc/`.

Older tree: `v0_3_1/` (kept for reference).

## Repository layout

```text
v0_3_2/
  core/          language runtime, assemblers, engines
  devices/       panel widgets (LEDs, canvas, CLCD, …)
  ui/            editor UI and doc viewer
  doc/           markdown documentation
  tests/         test suite
  node/          Node helpers (regen docs/tests, verify examples)
  script_editor_v0_3_2.html
  run_tests.html
```

## Node helpers (optional)

From `v0_3_2/`:

```bash
node node/_run_test_suite_node.js
node node/_gen_doc_data.js
node node/_verify_doc_examples.js --list
```

See [`v0_3_2/node/README.md`](v0_3_2/node/README.md) for the full list.

## License

[MIT](LICENSE)
