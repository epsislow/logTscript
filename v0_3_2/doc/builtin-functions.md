# Built-in functions (internal)

LogTscript provides **built-in functions** — combinational or stateful primitives invoked directly in expressions (`OR(a, b)`, `MUX(sel, a, b)`, `REG(data, clk, clr)`, …). They have no panel device; use `doc(Name)` for the live signature.

```
doc(def)          # list all built-ins and user-defined functions
doc(MUX)          # signature of one built-in
```

Full `doc()` reference: [doc-function.md](doc-function.md).

---

## Index by category

| Category | Functions | Detail |
|----------|-----------|--------|
| **Logic gates** | `NOT`, `AND`, `OR`, `XOR`, `NXOR`, `NAND`, `NOR`, `EQ` | [builtin-logic-gate-functions.md](builtin-logic-gate-functions.md) |
| **Sequential** | `LATCH`, `REG` | [builtin-sequential-functions.md](builtin-sequential-functions.md) · `REG` → [reg.md](reg.md) |
| **Routing** | `MUX`, `DEMUX` | [builtin-routing-functions.md](builtin-routing-functions.md) |
| **Arithmetic** | `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE` | [arithmetic.md](arithmetic.md) |
| **Bit selection** | `HIGH`, `LOW`, `ANY`, `ZERO`, `BITINDEX`, `ONEHOT` | [builtin-bit-selection-functions.md](builtin-bit-selection-functions.md) |
| **Bit analysis** | `PARITY`, `CNTONE`, `CNTZERO`, `BITSIZE` | [builtin-bit-analysis-functions.md](builtin-bit-analysis-functions.md) |
| **Bit transform** | `LSHIFT`, `RSHIFT`, `REVERSE`, `LROTATE`, `RROTATE` | [builtin-bit-transform-functions.md](builtin-bit-transform-functions.md) |

> **Adding new built-ins:** extend `Interpreter.BUILTIN_DOC` in `core/interpreter.js`, implement evaluation in the same file, add a row to the table above, and document behaviour in the matching category file.

---

## Related

| Topic | Page |
|-------|------|
| `doc()` syntax | [doc-function.md](doc-function.md) |
| Short notation (`&`, `\|`, `<`, `>`) | [short-notation.md](short-notation.md) |
| Panel devices (`comp`) | [components.md](components.md) |
| User `def` functions | [doc-function.md](doc-function.md#user-defined-functions) |
