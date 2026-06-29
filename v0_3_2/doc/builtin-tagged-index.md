# Built-in functions with call tags

Canonical reference for built-ins that accept **`; signed`**, **`; vector`**, and/or **`; index`**. Scalar behaviour and tag semantics live on each function page — not duplicated here.

Index: [Arithmetic overview](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Bit transform](builtin-bit-transform-functions.md) · [Built-in functions](builtin-functions.md)

Cross-cutting topics:

- Operand expansion vs **`; vector`**: [vector-reduction.md — element-wise mode](vector-reduction.md#element-wise-mode-vector)
- Signed two's complement overview: [arithmetic.md — tag overview](arithmetic.md#tag-overview)
- Wire vectors: [wire-vectors.md](wire-vectors.md)

---

## Index by function

| Function | Page | `signed` | `vector` | `index` | Hub |
|----------|------|----------|----------|---------|-----|
| ADD | [builtin-ADD.md](builtin-ADD.md) | yes | yes | — | arithmetic |
| SUBTRACT | [builtin-SUBTRACT.md](builtin-SUBTRACT.md) | yes | yes | — | arithmetic |
| MULTIPLY | [builtin-MULTIPLY.md](builtin-MULTIPLY.md) | yes | yes | — | arithmetic |
| DIVIDE | [builtin-DIVIDE.md](builtin-DIVIDE.md) | yes | yes | — | arithmetic |
| MAC | [builtin-MAC.md](builtin-MAC.md) | yes | yes | — | arithmetic |
| GT | [builtin-GT.md](builtin-GT.md) | yes | yes | — | arithmetic |
| LT | [builtin-LT.md](builtin-LT.md) | yes | yes | — | arithmetic |
| MIN | [builtin-MIN.md](builtin-MIN.md) | yes | yes | — | arithmetic / vector |
| MAX | [builtin-MAX.md](builtin-MAX.md) | yes | yes | — | arithmetic / vector |
| CLAMP | [builtin-CLAMP.md](builtin-CLAMP.md) | yes | yes | — | arithmetic |
| SUM | [builtin-SUM.md](builtin-SUM.md) | yes | yes | — | vector |
| DOT | [builtin-DOT.md](builtin-DOT.md) | yes | — | — | vector |
| ARGMAX | [builtin-ARGMAX.md](builtin-ARGMAX.md) | yes | — | yes | vector |
| ARGMIN | [builtin-ARGMIN.md](builtin-ARGMIN.md) | yes | — | yes | vector |
| EQ | [builtin-EQ.md](builtin-EQ.md) | — | yes | — | logic gates |
| RSHIFT | [builtin-RSHIFT.md](builtin-RSHIFT.md) | yes | yes | — | bit transform |
| LSHIFT | [builtin-LSHIFT.md](builtin-LSHIFT.md) | — | yes | — | bit transform |
| LROTATE | [builtin-LROTATE.md](builtin-LROTATE.md) | — | yes | — | bit transform |
| RROTATE | [builtin-RROTATE.md](builtin-RROTATE.md) | — | yes | — | bit transform |
| REVERSE | [builtin-REVERSE.md](builtin-REVERSE.md) | — | yes | — | bit transform |

Use `doc(NAME)` in scripts for live signatures from `Interpreter.BUILTIN_DOC`.
