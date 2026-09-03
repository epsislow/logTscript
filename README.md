# LogTscript

Didactic language and digital-logic simulator for teaching digital systems: wires, interactive panels, chips, displays, network, CPU (ASM/ISA), RAM, LUT, PLC, protocols, Prolog-like logic, and physical-style components.

## Try it

| Open in browser | Path |
|-----------------|------|
| Script editor | [`index.html`](index.html) |
| Test runner | [`run_tests.html`](run_tests.html) |

Serve the repository root over HTTP (for example with WAMP or any local static server) and open the editor URL. The in-app doc viewer covers language and components under `doc/`.

For GitHub Pages: enable **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**. Site URL: `https://epsislow.github.io/logTscript/`

## Repository layout

```text
core/          language runtime, assemblers, engines
devices/       panel widgets (LEDs, canvas, CLCD, …)
ui/            editor UI and doc viewer
doc/           markdown documentation
tests/         test suite
node/          Node helpers (regen docs/tests, verify examples)
index.html     script editor (GitHub Pages entry)
run_tests.html
```

## Node helpers (optional)

From the repository root:

```bash
node node/_run_test_suite_node.js
node node/_gen_doc_data.js
node node/_verify_doc_examples.js --list
```

See [`node/README.md`](node/README.md) for the full list.

## License

[MIT](LICENSE)
