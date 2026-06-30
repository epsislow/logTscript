# Matrix element-wise mode (`; matrix`)

Built-ins that support **`; vector`** also support **`; matrix`** for **true 2D matrices** (`4wire[N,M]` with **N>1** and **M>1**), with optional **rank-1 vector** operands that broadcast (see table below).

Index: [2D tensors](wire-vectors.md) · [Tagged built-ins](builtin-tagged-index.md) · [Vector element-wise mode](vector-reduction.md#element-wise-mode-vector)

---

## When to use

| Mode | Operands | Result |
|------|----------|--------|
| (default) | scalars, expanded vectors | scalar or reduction |
| **`; vector`** | rank-1 tensors `[N]`, `[1,N]`, `[N,1]` (same `elementCount`) | vector per index `:i` |
| **`; matrix`** | at least one **matrix** `[N,M]` with **N>1, M>1** | matrix `[N,M]` per cell |

**`; vector`** and **`; matrix`** are **mutually exclusive** in one call.

Rank-1 shapes are **vectors**, not matrices — use **`; vector`** for element-wise ops on them, or pair them with a matrix under **`; matrix`** for broadcast.

---

## Operand broadcast (per cell `(r,c)`)

| Operand shape | Kind | At cell `(r,c)` uses |
|---------------|------|----------------------|
| Matrix `[N,M]` | matrix | `M[r,c]` |
| Scalar / plain `Wbit` | scalar | same scalar |
| `[1,M]` or `4wire[M]` | rank-1 (row) | element `c` |
| `[N,1]` | rank-1 (column) | element `r` |

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

Declare the target wire as **`4wire[N,M]`** for **`; matrix`**, or **`4wire[N]`** / **`4wire[N,1]`** / **`4wire[1,N]`** for **`; vector`** (matching `elementCount`).

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
