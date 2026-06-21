---
name: ZSTATE doc ZCONNECT
overview: Corectăm exemplele runnable din documentația ZSTATE, relaxăm MUX (eroare doar la X pe intrarea selectată în ZSTATE), și adăugăm statement-ul `ZCONNECT(bus, en, data)` pentru drive enable-gated pe magistrale — fără contribuție când `en=0`.
todos:
  - id: fix-zstate-docs
    content: Rescrie exemplele runnable din zstate.md/modes.md; notează limitarea switch 1-bit
    status: completed
  - id: parser-zconnect
    content: "Tokenizer/parser: statement ZCONNECT(bus, en, data) + alias ZCONN"
    status: completed
  - id: interp-zconnect
    content: "execZConnect: en≠1 no-op; en=1 queueWireContribution + validări ZSTATE/lățime"
    status: completed
  - id: mux-relax-z
    content: "MUX: validare doar intrarea selectată (X eroare, Z OK); ieșire cu Z; merge ZSTATE la asignare pe bus"
    status: completed
  - id: tests-zconnect-mux
    content: Teste zstate 1559-1568 pentru ZCONNECT și MUX Z vs X
    status: completed
  - id: doc-zconnect
    content: builtin-functions.md, zstate.md, signal-propagation.md + regen doc-data
    status: completed
isProject: false
---

# ZSTATE: exemple doc, MUX și ZCONNECT — implementat

Sintaxă: **doar** `ZCONNECT(bus, en, data)` / `ZCONN(bus, en, data)` — nu expresie.

Teste noi: **1559–1568** (grup `zstate`). Suite: **1003/1003** verzi.
