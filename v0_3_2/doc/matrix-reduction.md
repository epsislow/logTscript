# Matrix element-wise mode (`; matrix`)

Built-ins that support **`; vector`** also support **`; matrix`** for **2D tensors** (`4wire[N,M]` with **N>1** and **M>1**, or broadcast with row/column vectors).

Index: [2D tensors](wire-vectors.md) · [Tagged built-ins](builtin-tagged-index.md) · [Vector element-wise mode](vector-reduction.md#element-wise-mode-vector)

---

## When to use

| Mode | Operands | Result |
|------|----------|--------|
| (default) | scalars, expanded vectors | scalar or reduction |
| **`; vector`** | rank-1 tensors `[1,N]` / `[N,1]` | vector `[1,N]` per index |
| **`; matrix`** | at least one **matrix** `[N,M]` | matrix `[N,M]` per cell |

**`; vector`** and **`; matrix`** are **mutually exclusive** in one call.

---

## Operand broadcast (per cell `(r,c)`)

| Operand shape | At cell `(r,c)` uses |
|---------------|----------------------|
| Matrix `[N,M]` | `M[r,c]` |
| Scalar / plain `Wbit` | same scalar |
| Row vector `[1,M]` | `row[c]` |
| Column vector `[N,1]` | `col[r]` |

All operands must agree on **element width W**. Matrix operands must share the same **`[N,M]`** (or one side broadcasts as row/column/scalar).

---

## Functions with `; matrix`

Same set as **`; vector`**, **except**:

| Function | `; matrix` | Notes |
|----------|------------|--------|
| SUM, ADD, SUBTRACT, MULTIPLY, DIVIDE, MAC | yes | dual returns per cell where scalar form has two outputs |
| MIN, MAX, CLAMP | yes | one matrix output |
| GT, LT, EQ | yes | `1wire[rows×cols]` — one bit per cell (packed) |
| LSHIFT, RSHIFT, LROTATE, RROTATE, REVERSE | yes | per-cell transform |
| **DOT** | **no** | shape-based only — [builtin-DOT.md](builtin-DOT.md) |
| **ARGMAX**, **ARGMIN** | **no** | shape-based + optional `; index` — [builtin-ARGMAX.md](builtin-ARGMAX.md) |

Per-function pages: [builtin-tagged-index.md](builtin-tagged-index.md).

---

## Tags combined with `; matrix`

| Tag | With `; matrix` |
|-----|-----------------|
| `signed` | Signed ops per cell (`; signed matrix` ≡ `; matrix signed`) |
| `vector` | **Error** — mutually exclusive |
| `index` | Only on ARGMAX/ARGMIN (not with `; matrix`) |

---

## Output width

| Built-in | Matrix output |
|----------|----------------|
| SUM, ADD, SUBTRACT, MULTIPLY, MAC | `Wbit[N,M]` result + `Wbit[N,M]` flag/over |
| DIVIDE | `Wbit[N,M]` quotient + `Wbit[N,M]` mod |
| MIN, MAX, CLAMP | `Wbit[N,M]` |
| GT, LT, EQ | `1wire[rows×cols]` (one bit per cell, row-major) |
| Shifts / rotates / REVERSE | same shape as input matrix |

Declare the target wire as **`4wire[N,M]`** (or matching rank-1 shape for `; vector`).

---

## Examples (per function)

Worked examples with **`; matrix`** are on each built-in page — not duplicated here:

| Function | Page |
|----------|------|
| SUM, MIN, MAX | [builtin-SUM.md](builtin-SUM.md) · [builtin-MIN.md](builtin-MIN.md) · [builtin-MAX.md](builtin-MAX.md) |
| ADD, SUBTRACT, MULTIPLY, DIVIDE, MAC | [builtin-ADD.md](builtin-ADD.md) · … · [builtin-MAC.md](builtin-MAC.md) |
| GT, LT, EQ, CLAMP | [builtin-GT.md](builtin-GT.md) · … · [builtin-CLAMP.md](builtin-CLAMP.md) |
| LSHIFT, RSHIFT, LROTATE, RROTATE, REVERSE | [builtin-LSHIFT.md](builtin-LSHIFT.md) · … · [builtin-REVERSE.md](builtin-REVERSE.md) |

Full index: [builtin-tagged-index.md](builtin-tagged-index.md).

---

## Oriented vectors (`; vector`, not `; matrix`)

Pair **`4wire[N]`** + **`4wire[N,1]`** with **`; vector`** on SUM/ADD uses rank-1 broadcast (different from matrix mode). See [wire-vectors.md — oriented vector](wire-vectors.md#oriented-vector-rank-1-broadcast).

---

## See also

[wire-vectors.md](wire-vectors.md) · [vector-reduction.md](vector-reduction.md) · [builtin-tagged-index.md](builtin-tagged-index.md)
