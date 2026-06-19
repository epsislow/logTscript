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

```logts-play
5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
```

- Pattern length must match column width.
- **Compact wire filter:** `Wire=pattern` on a declared wire maps substrings to every slice used in the expression (`B.0`, `B.0-2`, `B.1/3`, …). Pattern length = wire width; bit index `i` uses pattern character `i`. Example: `4wire B` + `truthTableOf(XOR(B.0-2, B.1/3), B=AA*0)`.
- Partial filters OK — unlisted columns enumerate all combinations.
- Rows follow `enumerateFilteredEnvs` order.

---

## `simplify(expression [, filters])`

Emits **two assignment lines** (short + standard), like `exprOfLut`.

### Without filters

```logts-play
simplify(OR(AND(NOT(A), B), AND(A, B)))
```

```text
1wire out = `B`
1wire out = B
```

### With filters

Same `column=pattern` syntax as `truthTableOf` / `lutOf` (comma between assignments; `x` = varying bit):

```logts-play
5wire A
1wire B
5wire C
simplify(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
```

Minimization uses only the **varying** bits (`x` positions) as QM inputs — same rules as `exprOfLut(.generated)` with `filters:`.

Multi-bit output uses ` + ` between segments (grouped constants when possible).

---

## `equivalent(expr1, expr2)`

```logts-play
equivalent(OR(A, B), OR(B, A))
```

Output: `true` or `false` (one line).

---

## `inputsOf(expression)`

Aligned list of discovered columns:

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
