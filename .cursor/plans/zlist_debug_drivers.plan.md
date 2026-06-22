---
name: Zlist debug drivers
overview: "Zlist(wire) — inventar driveri la RUN/NEXT; probe(bus) extins în MODE ZSTATE cu sufix driver la fiecare commit (fără Zprobe separat). Doc debug.md + teste."
todos:
  - id: parse-zlist
    content: "Tokenizer + parser: Zlist(wire) → { zlist }"
    status: completed
  - id: interp-gather
    content: "interpreter.js: _gatherWireDrivers, _format*Label, _execZlist, extindere _emitProbeForWire în ZSTATE"
    status: completed
  - id: tests-1581
    content: "Teste 1581+ — Zlist RUN; probe ZSTATE drove/conflict + setComp fără re-RUN; regress probe non-ZSTATE"
    status: completed
  - id: doc-debug
    content: "debug.md + zstate.md; regen doc-data + manifest"
    status: completed
isProject: false
---

# Plan: `Zlist` + extindere `probe` în ZSTATE

## Decizie: fără `Zprobe` separat

Extindem `probe` în `MODE ZSTATE` pentru fire cu contribuitori partajați. `Zlist` rămâne inventar complet la RUN/NEXT.

## Extindere `probe` (MODE ZSTATE)

Când: ZSTATE + `probe(wire)` + wire are contribuitori înregistrați.

Sufix după reason:

| Situație | Sufix |
|----------|-------|
| Un driver activ | ` — drove: <label>` |
| Conflict | ` — conflict: <label1>, <label2>` |
| Z, zero activi | ` — no active drivers` |

## `Zlist(wire)` — snapshot la RUN/NEXT

```text
bus (4bit):
-> bus = ramData w1 ramEn
  -> (active) bus = cpuData w1 cpuEn = 10101010
(resolved) = 10101010
```

## Teste 1581–1587

Vezi plan complet în istoric implementare.
