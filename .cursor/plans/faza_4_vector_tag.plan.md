---
name: Faza 4 vector tag
overview: "Extinde tag-ul `; vector` la GT, LT, EQ, RSHIFT, LSHIFT, LROTATE, RROTATE și REVERSE. LSHIFT: `(W+n)bit[n]`."
todos:
  - id: phase4-bit-helpers
    content: Extrage logicalLshift/Rshift + rotate în vector-reduce.js; requireVectorTaggedUnaryOperand
    status: completed
  - id: phase4-vector-helpers
    content: compareVectorTagged (GT/LT/EQ), shiftVectorTagged, rotateVectorTagged, reverseVectorTagged
    status: completed
  - id: phase4-tag-sets
    content: Extinde BUILTIN_VECTOR_TAG_FUNCS cu cele 8 funcții în signed-arithmetic.js
    status: completed
  - id: phase4-interpreter
    content: Ramuri vectorMode în interpreter.js pentru GT/LT/EQ, LSHIFT/RSHIFT, LROTATE/RROTATE, REVERSE
    status: completed
  - id: phase4-builtin-doc
    content: Semnături ; vector în Interpreter.BUILTIN_DOC
    status: completed
  - id: phase4-tests
    content: Teste builtin-vector ~1834–1852
    status: completed
  - id: phase4-docs
    content: Doc builtin-bit-transform, vector-reduction, arithmetic.md
    status: completed
isProject: false
---

# Faza 4 — `; vector` pe GT / LT / EQ / shift / rotate / REVERSE

Plan detaliat — vezi secțiunea Faza 4 din [builtin_vector_tag.plan.md](builtin_vector_tag.plan.md).

Funcții: **GT, LT, EQ, RSHIFT, LSHIFT, LROTATE, RROTATE, REVERSE**.

- GT/LT/EQ → `1wire[n]`; LT/GT combinabil cu `; signed`
- LSHIFT → `(W+n)bit[n]` (count scalar broadcast)
- RSHIFT → `Wbit[n]`; `; signed` = ASHR per element
- LROTATE/RROTATE → `Wbit[n]`; count scalar sau `Kbit[n]`
- REVERSE → unar, `Wbit[n]`

Faza 5+: slice-uri, user tags, wave-opt, EQ variadic vector.
