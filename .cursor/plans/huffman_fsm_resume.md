# Huffman FSM — punct de reluare (2026-07-07)

**Plan complet v2.1:** [huffman_v2_fsm.plan.md](huffman_v2_fsm.plan.md)

---

## Verde acum

| Test | Conținut |
|------|----------|
| 2115 | FSM merge + links (wave session) |
| 2116 | FSM + walk post-`execStmts` |
| 2117 | FSM merge + `execStmts` walk + protocol round-trip |
| **2118** | **FSM in-script round-trip (fără `execStmts`)** |
| 2120–2128 | engine A1–A5 + protocol |
| **1610/1610** | suite Node |

**Doc:** [huffman-v2.md](../v0_3_2/doc/huffman-v2.md) — bloc **`logts-play wave`** FSM round-trip (`Load` / `Load & Run`), generat cu `node node/_gen_huff_fsm_doc.js`.

---

## S1 livrat

- Merge parametric `nSym−1` (~95 linii merge-only)
- Walk declarativ pe `.links` + commit `.huff` pe `ph=0101` (2 tick-uri walk)
- Round-trip in-script: `packetInner` / `recoveredInner` + re-eval protocol la mutare `.huff` (test **2118**)
- Engine: `_exprHasProtocolInvoke` + refresh după `on:raise` body

---

## Următor pas

1. Merge **compact** cu fire reutilizate `mk/mf/mk2/mf2` (`engine-on-reassign`)
2. Walk FSM hop-by-hop (fără `huffWalkEmit` static ×7 hops)
3. Reduce script ~210 → ~150 linii (depth-aware walk unroll)

---

Comenzi: `node node/_run_test_suite_node.js` · `node node/_gen_huff_fsm_doc.js` · `node node/_patch_huffman_v2_fsm_doc.js`
