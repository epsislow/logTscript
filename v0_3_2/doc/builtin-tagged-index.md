# Built-in functions with call tags

Canonical reference for built-ins that accept **`; signed`**, **`; vector`**, **`; matrix`**, and/or **`; index`**. Scalar behaviour and tag semantics live on each function page — not duplicated here.

Index: [Arithmetic overview](arithmetic.md) · [Vector reduction](vector-reduction.md) · [Matrix element-wise (`; matrix`)](matrix-reduction.md) · [Bit transform](builtin-bit-transform-functions.md) · [Built-in functions](builtin-functions.md)

Cross-cutting topics:

- Operand expansion vs **`; vector`**: [vector-reduction.md — element-wise mode](vector-reduction.md#element-wise-mode-vector)
- **`; matrix`** on 2D tensors: [matrix-reduction.md](matrix-reduction.md)
- Signed two's complement overview: [arithmetic.md — tag overview](arithmetic.md#tag-overview)
- Wire vectors & matrices: [wire-vectors.md](wire-vectors.md)

---

## Index by function

| Function | Page | `signed` | `vector` | `matrix` | `index` | Hub |
|----------|------|----------|----------|----------|---------|-----|
| ADD | [builtin-ADD.md](builtin-ADD.md) | yes | yes | yes | — | arithmetic |
| SUBTRACT | [builtin-SUBTRACT.md](builtin-SUBTRACT.md) | yes | yes | yes | — | arithmetic |
| MULTIPLY | [builtin-MULTIPLY.md](builtin-MULTIPLY.md) | yes | yes | yes | — | arithmetic |
| DIVIDE | [builtin-DIVIDE.md](builtin-DIVIDE.md) | yes | yes | yes | — | arithmetic |
| MAC | [builtin-MAC.md](builtin-MAC.md) | yes | yes | yes | — | arithmetic |
| ABS | [builtin-ABS.md](builtin-ABS.md) | **required** | — | — | — | arithmetic |
| GT | [builtin-GT.md](builtin-GT.md) | yes | yes | yes | — | arithmetic |
| LT | [builtin-LT.md](builtin-LT.md) | yes | yes | yes | — | arithmetic |
| MIN | [builtin-MIN.md](builtin-MIN.md) | yes | yes | yes | — | arithmetic / vector |
| MAX | [builtin-MAX.md](builtin-MAX.md) | yes | yes | yes | — | arithmetic / vector |
| CLAMP | [builtin-CLAMP.md](builtin-CLAMP.md) | yes | yes | yes | — | arithmetic |
| SUM | [builtin-SUM.md](builtin-SUM.md) | yes | yes | yes | — | vector |
| DOT | [builtin-DOT.md](builtin-DOT.md) | yes | — | — | — | vector |
| ARGMAX | [builtin-ARGMAX.md](builtin-ARGMAX.md) | yes | — | — | yes | vector |
| ARGMIN | [builtin-ARGMIN.md](builtin-ARGMIN.md) | yes | — | — | yes | vector |
| EQ | [builtin-EQ.md](builtin-EQ.md) | — | yes | yes | — | logic gates |
| RSHIFT | [builtin-RSHIFT.md](builtin-RSHIFT.md) | yes | yes | yes | — | bit transform |
| LSHIFT | [builtin-LSHIFT.md](builtin-LSHIFT.md) | — | yes | yes | — | bit transform |
| LROTATE | [builtin-LROTATE.md](builtin-LROTATE.md) | — | yes | yes | — | bit transform |
| RROTATE | [builtin-RROTATE.md](builtin-RROTATE.md) | — | yes | yes | — | bit transform |
| REVERSE | [builtin-REVERSE.md](builtin-REVERSE.md) | — | yes | yes | — | bit transform |

Use `doc(NAME)` in scripts for live signatures from `Interpreter.BUILTIN_DOC`.

**Note:** **`; vector`** and **`; matrix`** cannot appear together. **DOT**, **ARGMAX**, and **ARGMIN** do not use **`; matrix`** (behaviour follows tensor shape instead).

**Rank-1** (`[N]`, `[1,N]`, `[N,1]`) = vector for **`; vector`**; only **`[R,C]` with R>1 and C>1** is a matrix for **`; matrix`**. See [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix).
