# Schema frame padding (grow / shrink)

**Faza 2.5** — wide wire + variable schema: reserve a **frame** (`declaredWidth`) larger than the runtime payload. Surplus bits are **`paddingRight`** (buffer) used when a variable field **grows** or **shrinks** at assign time.

Prerequisite: [Variable arrays (1D)](schema-variable-arrays.md), [Variable matrix (2D)](schema-variable-matrix.md). See also [Assignment operators](assignment-operators.md) (`=`, `=:` , `:=`).

---

## Runnable examples (Load / Load & Run)

Use **`logts-play wave`** for examples with `show`. See [Semantic schemas — Runnable examples](semantic-schemas.md#runnable-examples-load--load--run).

---

## Model

```text
declaredWidth (e.g. 200) = schemaUsedWidth (runtime) + paddingRight (buffer)
```

| Concept | Meaning |
|---------|---------|
| **`declaredWidth`** | Wire type width — e.g. `200wire<framePkt>` → 200 bits reserved |
| **`schemaUsedWidth`** | Sum of all schema fields at current `varArrayCounts` (or **minWidth** after `:= 0` only) |
| **`paddingRight`** | `declaredWidth − schemaUsedWidth` when surplus ≥ 1 bit; zeros in storage; shown in `show(pkt)` |
| **Wire strâns (tight)** | `declaredWidth` equals current layout exactly — **no buffer**; changing variable **count** → **error** |
| **Wire cadru (frame)** | `declaredWidth` > runtime layout — grow/shrink on variable fields **in scope** |

**Fixed schemas** on a wide wire keep constant payload width; padding stays static (no grow/shrink).

**parseView without schema** (protocol `=: .proto {…}` on a plain wire) still uses synthetic `paddingRight` / `paddingLeft` as before — this page covers **`<schema>` on the wire**.

---

## Example schema

Record with header/footer and a **variable 2D grid** (`rows` 1–3, `cols` fixed at 2):

```logts
<cell8>:
    v: 8
:

<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
```

| Layout | Bits |
|--------|------|
| min (1×2 grid) | 2 + 16 + 2 = **20** |
| 2×2 grid | 2 + 32 + 2 = **36** |
| 3×2 grid | 2 + 48 + 2 = **52** |

---

## Init — `:= 0` on a wide wire

All bits zero. Runtime layout uses **minimum** counts; full surplus is buffer from the start.

```logts-play wave
<cell8>:
    v: 8
:
<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
200wire<framePkt> pkt := 0
show(pkt)
```

Expected **Output**:

- `header`, `grid` with `:0:0`, `:0:1` (min shape **\[1,2\]**), `footer`
- `grid has shape [1,2]`
- `paddingRight = … (180bit)` — because 200 − 20 = 180

`show(pkt:grid)` **before** any assign that sets grid count still **errors** (slice needs explicit count). Full-record `show(pkt)` after `:= 0` is OK.

---

## Grow — take bits from buffer

Start on a **200wire** frame, set header/footer, assign 2×2 grid, then **grow** to 3×2. Header and footer are **relocated**; new grid cells come from the assign RHS; freed buffer shrinks.

```logts-play wave
<cell8>:
    v: 8
:
<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
200wire<framePkt> pkt := 0
pkt:header = 11
pkt:footer = 00
pkt:grid = [2,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }<cell8>
pkt:grid = [3,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }{ v=\5 }{ v=\6 }<cell8>
show(pkt)
```

Expected **Output**:

- `header = 11`, `footer = 00` (unchanged values)
- `grid has shape [3,2]` — six `:r:c` lines
- `paddingRight … (148bit)` — 200 − 52 = 148

Same rebuild path for:

- `pkt:grid = ^AABBCCDDEEFF` (flat — length ÷ 8 ⇒ count 6 ⇒ 3×2 with fixed cols)
- `pkt:grid = .myProto { … }` (proto blob length sets count — matrix shape rules still apply)

---

## Shrink — return bits to buffer

From 2×2 on a **200wire** frame, shrink to 1×2. Payload shrinks; **paddingRight** grows.

```logts-play wave
<cell8>:
    v: 8
:
<framePkt>:
    header: 2
    grid: 8[1-3, 2]
    footer: 2
:
200wire<framePkt> pkt := 0
pkt:grid = [2,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }<cell8>
pkt:grid = [1,2]{ v=\9 }{ v=\10 }<cell8>
show(pkt)
```

Expected **Output**:

- `grid has shape [1,2]` — two cells
- `paddingRight … (180bit)` — 200 − 20 = 180

---

## Tight wire — errors (no buffer)

When `declaredWidth` matches the current layout **exactly**, changing row/column **count** is rejected (no silent fail).

**Grow** on `36wire` (exact 2×2 layout):

```logts
36wire<framePkt> pkt := 0
pkt:grid = [2,2]{ v=\1 }{ v=\2 }{ v=\3 }{ v=\4 }<cell8>
pkt:grid = [3,2]{ … }<cell8>    # error: requires 52 bits …
```

**Shrink**:

```logts
pkt:grid = [1,2]{ v=\9 }{ v=\10 }<cell8>   # error: … without frame buffer …
```

**Same count** assign still works (fast splice):

```logts
pkt:grid = [2,2]{ v=\5 }{ v=\6 }{ v=\7 }{ v=\8 }<cell8>   # OK
```

**Insufficient frame** (layout would exceed declared width):

```logts
50wire<framePkt> pkt := 0
pkt:grid = [2,2]{ … }<cell8>
pkt:grid = [3,2]{ … }<cell8>    # error: requires 52 bits but wire is 50bit
```

---

## Padding in `show` / read

| Action | Behaviour |
|--------|-----------|
| **`show(pkt)`** | Schema tree on payload bits + `paddingRight = 000… (Nbit)` when N ≥ 1 |
| **`show(pkt:grid)`** | Field slice only — no padding line (same as before) |
| **`pkt:paddingRight`** | Read/write the buffer slice (when `paddingRightWidth` > 0) |
| **Flat `=` on whole wire** | Strict — RHS must match **declaredWidth**; use per-field assign or `:=` for frame init |

---

## 1D variable fields

Same rules apply to **1D** variable arrays (`cells:8[1-3]`) on a wide wire: grow/shrink via `pkt:cells = …` uses buffer; tight wire rejects count change.

```logts
<package2>:
    cells: 8[1-]
    footer: 8
:
64wire<package2> pkt := 0
show(pkt)                          # min layout + paddingRight
pkt:cells = ^AABB                  # count 2 — padding recalculated
pkt:cells = ^AABBCCDD              # count 4 — grow from buffer (if room)
```

Use a wire wide enough for the **maximum** count you need, or assign per-field on a tight wire at fixed count only.

---

## Quick reference

| Situation | Result |
|-----------|--------|
| `200wire<varSchema> pkt := 0` | min layout + max `paddingRight` |
| Assign changes grid/cells **count** on **frame** wire | Rebuild + update `paddingRightWidth` |
| Assign same count on frame wire | Splice field + refresh padding metadata |
| Count change on **tight** wire | **Error** |
| `newUsed > declaredWidth` | **Error** (`requires N bits`) |
| Fixed schema on wide wire | Static payload; padding only |

---

## Related

| Doc | Topic |
|-----|-------|
| [Variable arrays (1D)](schema-variable-arrays.md) | `varArrayCounts`, flat vs per-field assign |
| [Variable matrix (2D)](schema-variable-matrix.md) | `[R,C]` shape, row/col slice |
| [Semantic schemas](semantic-schemas.md) | Field access, literals, show |
| [Assignment operators](assignment-operators.md) | `=`, `=:`, `:=`, padding on plain wires |
