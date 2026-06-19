# Boolean expression analysis helpers

Analysis-only statements (like `show` / `lutOf`): they emit text to **Output**. They do **not** create runtime logic.

| Statement | Role |
|-----------|------|
| `truthTableOf(expr [, filters])` | Truth table text |
| `simplify(expr [, filters])` | Minimized expression (Quine–McCluskey) |
| `equivalent(e1, e2)` | `true` / `false` |
| `inputsOf(expr)` | Detected input columns + widths |
| `costOf(expr)` | Syntactic cost (literal vs minimized) |

See also: [boolean-lut.md](boolean-lut.md) (`lutOf` / `exprOfLut`), [debug.md](debug.md), [short-notation.md](short-notation.md).

Expression parameters use the same syntax as `lutOf`: built-ins `NOT`, `AND`, `OR`, … or short-notation in backticks.

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script **and** runs it immediately. Results appear in the **Output** panel (truth tables, minimized lines, `true`/`false`, cost lines). |

These statements are **analysis-only** — they do not create runtime logic or device panels. For fixed examples, **Load & Run** is enough: read **Output** right away.

Use **Load** when you want to change wire widths, filter patterns, or the expression before running. After editing, press **RUN** (or **Load & Run** on another block to compare).

### Quick walkthrough

**Load & Run** — classic minimization (`OR(AND(NOT A,B), AND(A,B))` → `B`):

```logts-play
simplify(OR(AND(NOT(A), B), AND(A, B)))
```

**Load & Run** — undeclared `C` gets width **2b** from filter `C=01` (no `2wire C` line):

```logts-play
2wire B
simplify(XOR(B, C), B=**, C=01)
```

**Load & Run** — filtered truth table (check row count in **Output**):

```logts-play
5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
```

**Load & Run** — multi-bit `AND` minimized per bit, then **lifted** to `AND(B, C)` when both inputs are declared with matching width:

```logts-play
2wire B
2wire C
simplify(AND(B, C), B=**, C=**)
```

**Load & Run** — partial slice stays as `AND(B.1-2, C.1-2)` after lift:

```logts-play
4wire B
4wire C
simplify(AND(B.1-2, C.1-2), B=****, C=****)
```

**Load** the slice example above, change `B=****` to fix bits (e.g. `B=01**`), then **RUN** to see how filters shrink the QM table.

---

## Limits

| Functions | Limit | Error |
|-----------|-------|-------|
| `truthTableOf`, `lutOf`, `simplify` | Max **256 rows** generated | `Boolean analysis exceeds maximum supported table size (256 rows)` |
| `simplify`, `equivalent` (no filters) | Max **8 input bits** | `Boolean analysis exceeds maximum supported input width (8 bits)` |

Without filters, `truthTableOf` / `lutOf` generate `2^(sum column widths)` rows — practically ≤ 8 bits.

With **filters** (see below), you may have more than 8 input bits if the filtered row count stays ≤ 256.

---

## `truthTableOf(expression [, filters])`

### Without filters

**Load & Run** — full 2-input table in **Output**:

```logts-play
truthTableOf(OR(A, B))
```

```text
A B | OUT
--------------
0 0 | 0
0 1 | 1
1 0 | 1
1 1 | 1
```

### With filters (`*` / `A` / `X` / `Z`)

Optional second argument: `column=pattern` assignments, separated by commas.

| Symbol | Meaning |
|--------|---------|
| `*` | Binary don't-care (0 or 1) — becomes a variable in `exprOfLut` / `simplify` |
| `A` | Don't-care all values (0, 1, X, Z) — expands LUT rows, not a QM variable |
| `X`, `Z` | Fixed logic values (IEEE analysis) |
| `0`, `1` | Fixed binary |

**Load & Run** — filtered rows (same script as in [Quick walkthrough](#quick-walkthrough)):

```logts-play
5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
```

- Pattern length must match column width.
- **Undeclared wires and filter width** (for `simplify`, `truthTableOf`, `lutOf` only — not `inputsOf`):

| Situation | Width used |
|-----------|------------|
| `Nwire X` declared in script | declaration (wins over filter) |
| Undeclared, filter `X=pattern` (no bit range in filter) | `pattern.length` |
| Undeclared, filter `X.start-end=pattern` / `X.start/len=pattern` | covers bits through `end` (parent wire width) |
| Undeclared, no filter for `X` | **1b** default |
| Expression uses `X.i` / `X.0-1` / `X.1/3` | slice width from expression (unchanged) |

**Load & Run** — width inferred from filter (`C=01` → 2b):

```logts-play
2wire B
simplify(XOR(B, C), B=**, C=01)
```

`C` is not declared; filter `C=01` gives **2b**. No `2wire C` line required.

- **Compact wire filter:** `Wire=pattern` on a declared wire maps substrings to every slice used in the expression (`B.0`, `B.0-2`, `B.1/3`, …). Pattern length = wire width; bit index `i` uses pattern character `i`. Example: `4wire B` + `truthTableOf(XOR(B.0-2, B.1/3), B=AA*0)`.
- Partial filters OK — unlisted columns enumerate all combinations.
- Rows follow `enumerateFilteredEnvs` order.

---

## `simplify(expression [, filters])`

Emits **two assignment lines** (short + standard), like `exprOfLut`.

### Without filters

**Load & Run** — two lines in **Output** (short + standard):

```logts-play
simplify(OR(AND(NOT(A), B), AND(A, B)))
```

```text
1wire out = `B`
1wire out = B
```

### With filters

Same `column=pattern` syntax as `truthTableOf` / `lutOf` (comma between assignments; `*` = varying bit):

**Load & Run** — QM on `*` positions only:

```logts-play
5wire A
1wire B
5wire C
simplify(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
```

Minimization uses only the **varying** bits (`*` positions) as QM inputs — same rules as `exprOfLut(.generated)` with `filters:`.

After per-bit minimization, identical segments on declared multi-bit wires may be **lifted** to a single gate, e.g. `AND(B.0,C.0) + AND(B.1,C.1)` → `AND(B, C)`, or `AND(B.1-2, C.1-2)` when only a slice is used. See the lift examples in [Quick walkthrough](#quick-walkthrough).

**`A` in `simplify` / `exprOfLut` filters:** `A` is not allowed — use `*` for binary don't-care. Error:

```text
simplify: cannot use A in filters, please use * instead
exprOfLut: cannot accept a lut with A in filters attribute
```

For IEEE expansion with `A`, use `truthTableOf` / `lutOf` (runtime LUT). Round-trip `lutOf` → `exprOfLut` requires `*` only on varying bits, not `A`.

**`A` vs `*` in `lutOf` / `truthTableOf`:** `*` marks a binary don't-care; `A` expands rows (0/1/X/Z). `exprOfLut` rebuilds using only `*` positions as QM variables.

Multi-bit output uses ` + ` between segments (grouped constants when possible).

---

## `equivalent(expr1, expr2)`

**Load & Run** — one line `true` or `false` in **Output**:

```logts-play
equivalent(OR(A, B), OR(B, A))
```

Output: `true` or `false` (one line).

---

## `inputsOf(expression)`

Aligned list of discovered columns:

**Load & Run** — column names and widths (no minimization):

```logts-play
4wire A
8wire B
inputsOf(OR(A.2, B.1))
```

```text
A.2    1b
B.1    1b
```

---

## `costOf(expression)`

**Syntactic** cost (not hardware gates): width-aware sum of boolean operators in the AST.

**Load & Run** — expression vs minimized cost:

```logts-play
costOf(OR(AND(NOT(A), B), AND(A, B)))
```

```text
Expression cost: 4
Minimized cost: 0
Reduction possible: 4 (100%)
```

| Operator | Cost |
|----------|------|
| `NOT` | `width(input)` |
| `AND`, `OR`, `XOR`, … | `width(result)` |
| identifiers / literals | `0` |

---

## Relation to LUT utilities

| Goal | Statement |
|------|-----------|
| Expression → truth table | `truthTableOf` |
| Expression → `inline [lut]` block | `lutOf` |
| Expression → minimized form | `simplify` |
| `inline [lut]` → expression (manual or via `filters:`) | `exprOfLut` |
| Equivalence check | `equivalent` |

`lutOf` emits `description:` and optional `filters:` attributes; `exprOfLut` can rebuild the expression from those when `filters:` is present. Details: [boolean-lut.md](boolean-lut.md).
