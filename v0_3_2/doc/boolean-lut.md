# Boolean LUT utilities — `lutOf` and `exprOfLut`

Analysis-only statements (like `show`): they emit copy-pasteable text to **Output**. They do **not** create runtime logic.

| Statement | Role |
|-----------|------|
| `lutOf(expr)` | Build a LUT definition from a boolean expression |
| `exprOfLut(.lut, vars…)` | Rebuild a boolean expression from an existing LUT |

See also: [lut.md](lut.md) (LUT runtime), [short-notation.md](short-notation.md) (backtick syntax), [debug.md](debug.md) (`show` output).

---

## `lutOf(expression)`

One argument — any boolean expression using built-ins `NOT`, `AND`, `OR`, `XOR`, `NXOR`, `NAND`, `NOR`, or short-notation in backticks.

```logts-play
lutOf(OR(A, B))
```

Output (copy-pasteable `inline [lut]` block):

```text
inline [lut] .generated:
  # A 1b, B 1b -> out 1b

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

Instance name is always **`.generated`**. Paste the block into a script, then use `exprOfLut(.generated, …)`.

### Rules

- **Address limit:** sum of input column widths ≤ **8 bits** (`length` max **256**). Otherwise:
  `LUT table too big (256 values), max bits number reached`
- Undeclared atomic variables (`A`, `B` in gates) default to **1 bit**.
- Whole wires (`lutOf(C)` on `7wire C`) use the declared wire width.
- Non-boolean ops (`LSHIFT`, etc.) → error.

---

## `exprOfLut(.lut, variables…)`

Rebuild logic from a LUT instance (inline `[lut]` or `comp [lut]`). **Always emits two lines:**

1. Short-notation assignment (backticks)
2. Standard notation assignment (`OR`, `AND`, …)

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

Output:

```logts
1wire out = `A | B`
1wire out = OR(A, B)
```

### Variable width

| Syntax | Width |
|--------|-------|
| `A` | **1b** if undeclared; else `Nwire` / `Nbit` from script |
| `A 4b` | **4b** explicit (overrides declaration) |
| `A.2` | **1b** (single bit column — same as `lutOf` header) |
| `A.2 1b` | **1b** explicit |
| `B.1/3` | **3b** (length slice) |
| `D.0-3` | **4b** (bit range) |

Match the **`lutOf` header columns** for round-trip:

```logts-play
4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))
# → inline [lut] .generated: … (header lists columns)

exprOfLut(.generated, A.2, B.1, A.0, B.0)
# → OR(AND(A.2, B.1), AND(A.0, B.0)) or equivalent minimised form
```

Validation: `sum(widths) === lutAddrBits(length)` using `bitIndexWidth` (not `Math.log2`).  
Mismatch → `exprOfLut expects N input bits but received M`.

**Not supported:** `prefixFree` / `variableDepth` LUTs.

### Multi-bit output (`depth` > 1)

Segments joined with ` + `, each wrapped in parentheses:

```logts
2wire out = (`A`) + (`B`)
2wire out = (A) + (B)
```

---

## Multi-bit inputs

`lutOf` discovers columns in **first-appearance order** in the expression:

```logts-play
4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))
```

```text
# A.2 1b, B.1 1b, A.0 1b, B.0 1b -> out 1b
```

Other forms:

- Whole wire: `lutOf(C)` on `7wire C` → `# C 7b -> out 7b`, `length: 128`
- Bit range: `lutOf(D.0-3)` on `10wire D` → `# D.0-3 4b -> out 4b`
- Length slice: `B.1/3` → 3 bits from bit 1

`exprOfLut` lists variables (optional `Nb`); order defines address mapping:

```logts
exprOfLut(.example, A 2b, B 3b)
```

→ internal bits: `A.1, A.0, B.2, B.1, B.0` (MSB first per variable).

---

## Round-trip

```logts-play
lutOf(XOR(A, B))
```

Paste the full Output block, then:

```logts
exprOfLut(.generated, A, B)
```

---

## Errors (summary)

| Case | Message |
|------|---------|
| Address > 8b | `LUT table too big (256 values), max bits number reached` |
| Width mismatch | `exprOfLut expects N input bits but received M` |
| Non-boolean in `lutOf` | `'LSHIFT' is not a boolean operation` |
| prefixFree / variableDepth LUT | `exprOfLut: prefixFree LUT not supported` |
| Missing LUT | `exprOfLut: LUT '.name' not found` |
