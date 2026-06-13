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
| **Logic gates** | `NOT`, `AND`, `OR`, `XOR`, `NXOR`, `NAND`, `NOR`, `EQ` | [below](#logic-gates) |
| **Sequential** | `LATCH`, `REG` | [below](#sequential) · `REG` → [reg.md](reg.md) |
| **Shift** | `LSHIFT`, `RSHIFT` | [below](#shift) |
| **Routing** | `MUX`, `DEMUX` | [below](#routing-mux--demux) |
| **Arithmetic** | `ADD`, `SUBTRACT`, `MULTIPLY`, `DIVIDE` | [arithmetic.md](arithmetic.md) |

> **Adding new built-ins:** extend `Interpreter.BUILTIN_DOC` in `core/interpreter.js`, implement evaluation in the same file, add a row to the table above, and document behaviour in the matching section (or a new subsection).

---

## Logic gates

`Xbit` = bit string of any width.

| Call | Signature |
|------|-----------|
| `doc(NOT)` | `NOT(Xbit) -> Xbit` |
| `doc(AND)` … `doc(NOR)` | `Gate(Xbit) -> 1bit` **or** `Gate(Xbit, Xbit) -> Xbit` |
| `doc(EQ)` | `EQ(Xbit, Xbit) -> 1bit` |

**1-argument mode (fold):** `OR(a)` folds OR across all bits of `a` → **1 bit**.

**2-argument mode (bitwise):** `OR(a, b)` applies the gate bit-by-bit → **N bits** (width of operands).

---

## Sequential

### LATCH

```
LATCH(Xbit data, 1bit clock) -> Xbit
```

Transparent latch: when `clock = 1`, output follows `data`; when `clock = 0`, output holds.

### REG

```
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
```

Width is inferred from `data`. Falling-edge wire clock or `~` + `NEXT(~)`; `clear = 1` forces zero.

Full behaviour, examples, and `comp [reg]` comparison: **[reg.md](reg.md)**.

---

## Shift

```
LSHIFT(Xbit data, Nbit n) -> Xbit
LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
RSHIFT(Xbit data, Nbit n) -> Xbit
RSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit
```

- `data` — value to shift
- `n` — positions (binary)
- `fill` *(optional)* — fill bit (default `0`)

---

## Routing (MUX / DEMUX)

Selector width `N` is inferred from the `sel` argument at runtime → `2^N` data inputs (MUX) or outputs (DEMUX).

### MUX

```
MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit
```

**Multiple data arguments** — pass `2^N` separate inputs after `sel`:

```
1wire sel = 0
4wire a = 0001
4wire b = 0010
4wire y = MUX(sel, a, b)    # 1-bit selector → 2 inputs
```

**Packed data argument** — one bit-string split into `2^N` equal chunks (width must divide evenly):

```
1wire sel = 1
8wire packed = 00010010    # two 4-bit fields
4wire y = MUX(sel, packed) # sel=1 → second nibble 0010
```

### DEMUX

```
DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..
```

Returns **`2^N` values**: the selected output carries `data`, all others are zero (same width as `data`).

```
1wire sel = 0
4wire data = 1010
4wire out0, 4wire out1 = DEMUX(sel, data)
# out0 = 1010, out1 = 0000
```

### Examples

```
# ALU result select (mini-CPU pattern)
4wire y = MUX(op.1, .add:get, .sub:get)

# Toggle when p falls (hold vs invert)
tg0 = MUX(p, tg0, NOT(tg0))
```

---

## Arithmetic

Instant binary arithmetic — each returns **two** values (result + carry / over / mod):

| Function | Signature |
|----------|-----------|
| `ADD` | `ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry` |
| `SUBTRACT` | `SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry` |
| `MULTIPLY` | `MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over` |
| `DIVIDE` | `DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod` |

Full semantics, examples, and comparison with `comp [adder]` etc.: **[arithmetic.md](arithmetic.md)**.

---

## Related

| Topic | Page |
|-------|------|
| `doc()` syntax | [doc-function.md](doc-function.md) |
| Panel devices (`comp`) | [components.md](components.md) |
| User `def` functions | [doc-function.md](doc-function.md#user-defined-functions) |
