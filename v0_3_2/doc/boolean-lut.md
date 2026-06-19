# Boolean LUT utilities — `lutOf` and `exprOfLut`

Analysis-only statements (like `show`): they emit copy-pasteable text to **Output**. They do **not** create runtime logic.

| Statement | Role |
|-----------|------|
| `lutOf(expr [, filters])` | Build an `inline [lut]` block from a boolean expression |
| `exprOfLut(.lut [, vars…])` | Rebuild a boolean expression from an `inline [lut]` instance |

See also: [lut.md](lut.md) (LUT runtime and `^.name(in=…)` invoke), [boolean-analysis.md](boolean-analysis.md) (`truthTableOf`, `simplify`, …), [short-notation.md](short-notation.md) (backtick syntax), [debug.md](debug.md) (Output panel overview).

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Edit the expression or paste a generated `inline [lut]` block, then press toolbar **RUN**. |
| **Load & Run** | Copies the script **and** runs it immediately. **`lutOf` / `exprOfLut`** write copy-pasteable text to **Output**; **`useLutAs` / `useExpr`** run logic and update wires (no analysis lines). |

For **`lutOf`** and **`exprOfLut`**, **Load & Run** is enough — copy the **Output** block into your script or run **`exprOfLut`** on the next line in the same example.

Use **Load** for two-step workflows: run **`lutOf`**, paste **Output** into the editor, add **`exprOfLut(.generated)`**, then **RUN** again.

### Quick walkthrough

**Load & Run** — generate a 1-bit OR LUT (`.generated` in **Output**):

```logts-play
lutOf(OR(A, B))
```

**Load & Run** — filtered LUT + rebuild expression (two analysis steps in one run):

```logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
```

**Load & Run** — multi-bit `AND` with filters, lifted to `AND(B, C)` on rebuild:

```logts-play
useLutAs(lutOf(AND(B, C), B=**, C=**), .b)
2wire B
2wire C
exprOfLut(.b)
```

**Load & Run** — runtime LUT from expression (no **Output** block; check `show(y)`):

```logts-play
useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
1wire y = .gen(10)
show(y)
```

**Load** the runtime example, change `A` / `B` assignments or the address literal, then **RUN** to try other inputs.

---

## `lutOf(expression [, filters])`

Boolean expression using built-ins `NOT`, `AND`, `OR`, `XOR`, `NXOR`, `NAND`, `NOR`, or short-notation in backticks.

Optional filters (same syntax as `truthTableOf`): comma-separated `column=pattern` assignments.

**Load & Run** — copy the `inline [lut] .generated:` block from **Output**:

```logts-play
lutOf(OR(A, B))
```

Output (copy-pasteable `inline [lut]` block):

```text
inline [lut] .generated:
  description: A 1b, B 1b -> out 1b

  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
:
```

With filters, `lutOf` adds a `filters:` attribute:

**Load & Run** — `filters:` line included in **Output**:

```logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=000**)
```

```text
inline [lut] .generated:
  description: A 5b, B 1b, C 5b -> out 5b
  filters: A=01*1*, B=*, C=000**

  depth: 5
  length: 32
  data { … }
:
```

Instance name is always **`.generated`**. Paste the block into a script, then use `exprOfLut(.generated)` or invoke the LUT at runtime — see [lut.md](lut.md).

### Rules

- **Row limit:** max **256 rows** in `data { }`. Error: `Boolean analysis exceeds maximum supported table size (256 rows)`.
- **With filters:** `length` = number of rows emitted (≤ 256); `filters:` documents which input combinations are included.
- **Without filters:** `length = 2^(sum column widths)` (≤ 256).
- **`description:`** lists column widths; **`filters:`** uses `0`, `1`, `*` (binary don't-care), `A` (all values), `X`, `Z` per bit (index `0` = leftmost, same as `bitRange`). Lowercase `x` is rejected — use `*`.
- **Compact wire filter:** when the expression uses bit slices (`B.0`, `B.0-2`, `B.1/3`, …), you can filter the whole declared wire in one assignment instead of per slice. Pattern length = wire width; each discovered column takes the matching substring (bit `i` → pattern character at index `i`).

```logts
4wire B
lutOf(XOR(B.0-2, B.1/3), B=AA*0)
```

Equivalent to `B.0-2=AA*, B.1/3=A*0` but shorter. Works for `lutOf`, `truthTableOf`, `simplify`, and round-trips through `exprOfLut` when the LUT has `filters: B=AA*0`.

- Undeclared atomic variables default to **1 bit**, unless a filter on that name sets the width (`C=01` → 2b). Declared `Nwire` always wins. See [boolean-analysis.md](boolean-analysis.md#with-filters--a--x--z).
- Whole wires (`lutOf(C)` on `7wire C`) use the declared wire width.
- Non-boolean ops (`LSHIFT`, etc.) → error.
- **Logic gates** with unequal-width operands: shorter operand is **left-padded** with `0` (see [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md#unequal-operand-widths-left-pad)).

---

## `exprOfLut(.lut [, variables…])`

Rebuild logic from an **`inline [lut]`** instance. **Always emits two lines:**

1. Short-notation assignment (backticks)
2. Standard notation assignment (`OR`, `AND`, …)

### Automatic variables (`filters:` present)

When the LUT has `description:` and `filters:` (as emitted by `lutOf` with filters), omit the variable list:

**Load & Run** — `exprOfLut` infers `*` columns from `filters:`:

```logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
```

`exprOfLut` reads the `description:` and `filters:` attributes. Only bit positions marked `*` in the filter patterns become variables — for `A=01*1*, B=*, C=1001*` that is `A.2`, `A.4`, `B`, `C.4`.

**`A` is not allowed when rebuilding from a LUT** — `exprOfLut` reads the LUT `filters:` attribute; if it contains `A`, error: `exprOfLut: cannot accept a lut with A in filters attribute`. Use `*` on bits that should become QM variables. IEEE tables with `A` remain valid via `lutOf` / `truthTableOf`.

You can pass variables explicitly; they must match those varying bits in the same order.

### Manual variables (no `filters:`)

**Load & Run** — explicit `A`, `B` for a hand-written LUT:

```logts-play
inline [lut] .or2:
  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
  :

exprOfLut(.or2, A, B)
```

```logts
1wire out = `A | B`
1wire out = OR(A, B)
```

### Variable width

| Syntax | Width |
|--------|-------|
| `A` | **1b** if undeclared; else `Nwire` / `Nbit` from script |
| `A 4b` | **4b** explicit (overrides declaration) |
| `A.2` | **1b** (single bit column — same as `description:` column) |
| `A.2 1b` | **1b** explicit |
| `B.1/3` | **3b** (length slice) |
| `D.0-3` | **4b** (bit range) |

Round-trip with explicit columns (LUT without `filters:`):

**Load & Run** — multi-bit columns in discovery order:

```logts-play
4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))
exprOfLut(.generated, A.2, B.1, A.0, B.0)
```

Validation: `sum(widths) === lutAddrBits(length)`. Mismatch → `exprOfLut expects N input bits but received M`.

**Not supported:** `prefixFree` / `variableDepth` LUTs.

### Multi-bit output (`depth` > 1)

```logts
2wire out = (`A`) + (`B`)
2wire out = (A) + (B)
```

---

## Multi-bit inputs

`lutOf` discovers columns in **first-appearance order** in the expression:

**Load & Run** — check `description:` in **Output**:

```logts-play
4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))
```

```text
description: A.2 1b, B.1 1b, A.0 1b, B.0 1b -> out 1b
```

Other forms:

- Whole wire: `lutOf(C)` on `7wire C` → `description: C 7b -> out 7b`, `length: 128`
- Bit range: `lutOf(D.0-3)` on `10wire D` → `description: D.0-3 4b -> out 4b`
- Length slice: `B.1/3` → 3 bits from bit 1

Address bit order for `exprOfLut(.example, A 2b, B 3b)`:

→ `A.0, A.1, B.0, B.1, B.2` (index 0 = `.0` leftmost, same as `bitRange`).

---

## Round-trip examples

**Simple** — **Load & Run**, then paste **Output** and add `exprOfLut(.generated, A, B)` (or **Load** and edit):

```logts-play
lutOf(XOR(A, B))
```

**With filters** — **Load & Run** (same as [Quick walkthrough](#quick-walkthrough)):

```logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
```

---

## Errors (summary)

| Case | Message |
|------|---------|
| > 256 rows | `Boolean analysis exceeds maximum supported table size (256 rows)` |
| Width mismatch | `exprOfLut expects N input bits but received M` |
| No vars and no `filters:` | `exprOfLut: supply variables or use a LUT with filters: attribute` |
| Vars ≠ filter bits | `exprOfLut: variables do not match LUT filters: expected […]` |
| Non-boolean in `lutOf` | `'LSHIFT' is not a boolean operation` |
| prefixFree / variableDepth LUT | `exprOfLut: prefixFree LUT not supported` |
| Missing LUT | `exprOfLut: LUT '.name' not found` |

---

## Runtime bridge — `useLutAs`, inline `lutOf` body, `useExpr`

These forms apply the same generators **at runtime** in one script (no copy-paste). They do **not** emit Output.

| Form | Role |
|------|------|
| `lutOf` / `exprOfLut` | Unchanged — analysis only, emit Output |
| `useLutAs(lutOf(expr [, filters]), .name)` | Register `inline [lut] .name` from expression |
| `inline [lut] .name: lutOf(expr) :` | Same as `useLutAs`, declarative body |
| `Nw u = useExpr(exprOfLut(.lut [, vars…]))` | Assign wire from minimized boolean expr |

### `useLutAs(lutOf(…), .name)`

**Load & Run** — wire literal address `10` (= `A=1`, `B=0`):

```logts-play
useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
1wire y = .gen(10)
show(y)
```

Address may be a **binary literal** (`10`, `01`) or a **wire** (`C`, `addr`):

**Load & Run** — address from wire `C`:

```logts-play
useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
2wire C = 10

1wire y = .gen(C)
show(y)
```

### Inline body `lutOf`

**Load & Run** — declarative LUT body:

```logts-play
inline [lut] .gen:
  lutOf(`A | B`)
  :

1wire y = .gen(01)
show(y)
```

### `useExpr(exprOfLut(…))` — assignment only

Only valid as the **right-hand side** of a wire assignment (including `Nw u = …` or `u = …` after a declaration).

**Load & Run** — first run lowers to `OR(A, B)`; later propagations skip QM:

```logts-play
inline [lut] .or2:
  depth: 1
  length: 4
  data { 00:0, 01:1, 10:1, 11:1 }
  :

1wire A := 0
1wire B := 1
1wire u = useExpr(exprOfLut(.or2, A, B))
show(u)
```

Split declaration — **Load** to edit widths, then **RUN**:

```logts-play
1wire A := 0
1wire B := 1
1wire u
u = useExpr(exprOfLut(.or2, A, B))
```

### Lowering (re-execution)

On the **first** execution of a `useExpr` assignment, the runtime:

1. Runs `exprOfLut` / QM **once**
2. Replaces the assignment AST with the standard boolean expression (e.g. `OR(A, B)`)
3. On later propagations (when `A` or `B` change), only that expression is re-evaluated — **no** repeated `exprOfLut`

Wire width on the left must match LUT `depth`; mismatch → `useExpr: wire width Nb does not match expression depth Mb`.

`useExpr(…)` as a standalone statement is a **parse error**.
