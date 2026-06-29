# User-defined functions (`def`)

Define reusable logic with **`def`**, then call it like a built-in function: `name(arg1, arg2)`.

User functions complement the built-in catalogue ([builtin-functions.md](builtin-functions.md)). Use `doc(def)` to list all names, or `doc(myFunc)` for one signature.

> **Not the same as protocol `def`.** Inside `inline [protocol]`, `def` names a local bit segment ([protocol.md](protocol.md#def--local-segments)). This page is about **script-level** `def name(type param, …):`.

---

## Syntax

```logts
def name(Type param1, Type param2):
  # optional body — wires, components, show, …
  :ReturnType expression
  :OtherType otherExpr + more
```

| Part | Rule |
|------|------|
| `def` | Keyword at **top level** of the script (or merged via `LOAD`) |
| `name` | Identifier — avoid built-in names (`OR`, `ADD`, `MUX`, …) |
| Parameters | `Type id` pairs, comma-separated inside `( )` |
| `:` after `)` | Required — starts the function block |
| Body | Optional statements on following lines (same indentation block) |
| Returns | One or more lines `:Type expr` — type + expression per return value |

Types use the same wire grammar as elsewhere: `1bit`, `4bit`, `8wire`, `Nwire`, etc.

---

## Runnable — simple function with one return

```logts-play
def isZero(4bit n):
  :1bit !OR(n)

4wire x = 0010
1wire z = isZero(x)
show(z)
```

`isZero(x)` evaluates the body (empty here), then the return line `:1bit !OR(n)`.

---

## Runnable — body + return (multi-step)

The body runs **before** return expressions are evaluated. You can declare wires and use built-ins inside the body:

```logts-play
def eq4(4bit a, 4bit b):
  1bit r0 = !XOR(a.0, b.0)
  1bit r1 = !XOR(a.1, b.1)
  1bit r2 = !XOR(a.2, b.2)
  1bit r3 = !XOR(a.3, b.3)
  :1bit AND(AND(r0, r1), AND(r2, r3))

4wire p = 1010
4wire q = 1010
1wire same = eq4(p, q)
show(same)
```

---

## Calling a function

### Basic call

```logts
1bit flag = myFunc(a, b)
8wire y = helper(x)
```

- Arguments are **expressions** (wires, literals, other calls, concatenation with `+`).
- Arity must match the parameter list — otherwise: `Bad arity for myFunc`.
- Prefix `!` works: `!myFunc(a)` negates the first return value (same as built-ins).

### Multiple return values

Declare one variable per return type, comma-separated on the left:

```logts
def pair(1bit a, 1bit b):
  :1bit OR(a, b)
  :2bit a + a

1wire flag, 2wire bits = pair(.dip.0, .dip.1)
```

Order matches the `:Type` return lines in the definition (first `:line` → first variable).

### Functions with no return

Omit all `:Type …` lines. The call is useful for side effects only (body statements):

```logts
def bump(4wire counter):
  4wire next, 1wire carry = ADD(counter, 1)
  counter = next

# doc(myFunc) shows: bump(4wire counter)   (no "-> …")
```

---

## Parameters

Parameters are **local names** bound to the argument bit strings for the duration of the call.

| Feature | Behaviour |
|---------|-----------|
| Bit ranges | `a.0/4`, `a.4/4` in expressions |
| Concatenation | `a + b` in return expressions |
| Short notation | `` `a \| b` `` in `:return` lines (expanded like elsewhere) — see [short-notation.md](short-notation.md#in-function-definitions-def) |
| Reassignment | Parameters live in the function’s local scope; use wires in the body for intermediate results |

Arguments are passed **by value** (the bit string at call time).

---

## Where `def` is allowed

| Location | Define `def`? | Call user functions? |
|----------|---------------|----------------------|
| Top-level script | Yes | Yes |
| `LOAD`ed library file | Yes (merged into script) | Yes |
| `pcb +[name]:` body | No (define at top level) | Yes |
| `board +[name]:` body | **No** — parse error | Use top-level `def` |
| `chip +[name]:` body | **No** — parse error | Use top-level `def` |
| `inline [protocol]` | Protocol-local `def` only | N/A |

Board/chip bodies may **call** functions defined at script top level; they cannot contain a `def` keyword.

---

## Naming vs built-ins

Built-in functions (`OR`, `ADD`, `MUX`, `REG`, …) are resolved **first** at call time. A user definition:

```logts
def OR(1bit a, 1bit b):
  :1bit AND(a, b)
```

does **not** replace `OR(...)` in expressions — calls still use the built-in `OR`. Pick a distinct name (`myOr`, `wideOr`, …). Use `doc(def)` to see built-in names.

---

## Libraries: `LOAD` and `@alias`

Load another script’s functions into the current program:

```logts
<path/to/library
```

- The line must start with `<` at the beginning of the line (not `a < b`).
- All `def` entries from that file are merged into the current function table.

Optional alias namespace:

```logts
<path/to/library @mylib
```

Call with:

```logts
8wire y = helper@mylib(x)
```

Without `@alias`, call `helper(x)` directly. If the function exists only in a loaded library and you omit the alias, you may see: `Function helper is not local; use helper@alias(...)`.

---

## Documentation helpers

| Call | Output |
|------|--------|
| `doc(def)` | Lists built-ins, debug keywords, and **all user** function names |
| `doc(myFunc)` | `myFunc(8bit a, 1bit b) -> 1bit` or multiple return types |
| `doc(Unknown)` | `Unknown: undefined function` |

Example:

```logts-play
def add4(4bit a, 4bit b):
  :4bit a
  :1bit 0

doc(add4)
```

---

## Execution model (brief)

1. Arguments are evaluated and bound to parameter names.
2. Body statements run in order (wires, components, `show`, etc.).
3. Each `:Type expr` return line is evaluated; results are returned to the caller.
4. Storage is shared with the caller (wires created in the body use the global storage pool), so prefer explicit parameters and return values for clear data flow.

---

## Related

- [doc-function.md](doc-function.md) — `doc()` reference (includes user `def` signatures)
- [builtin-functions.md](builtin-functions.md) — built-in catalogue
- [short-notation.md](short-notation.md) — `` `…` `` inside return lines
- [pcb.md](pcb.md) — calling `def` from PCB bodies
- [board.md](board.md) / [chip.md](chip.md) — `def` not allowed inside composite bodies
- [protocol.md](protocol.md) — protocol-local `def` (different feature)
