# Assignment operators

LogTScript supports multiple assignment operators with different width-handling behaviors for **wires**.

See also: [script modes](modes.md) (`MODE STRICT`, `MODE WIREWRITE`, `MODE ZSTATE`), [signal propagation](signal-propagation.md), [wire vectors](wire-vectors.md), [ASM](asm.md).

---

## Summary

| Operator | Behavior | Where |
|----------|----------|-------|
| `=` | Strict assignment — exact width, error on shorter **or longer** value | declaration, re-assignment |
| `:=` | Left-pad assignment | declaration, re-assignment |
| `=:` | Right-pad assignment | declaration, re-assignment |
| `:` | Initial assignment (literal only) | wire declaration only |

**Truncation:** when a value is longer than the wire, padding direction does not change truncation — the same truncation rule applies in each execution path. Phase 3 will unify truncation rules across the runtime.

---

## `=` — Strict assignment

The assigned value must have exactly the same width as the destination. No padding is performed.

### Syntax

```logts
wire = value
```

### Examples

```logts-play
3wire q = 001
show(q)
```

Result: `001`

```logts-play
3wire q = 1
show(q)
```

Error: `Expected 3 bits, got 1 bit.`

```logts-play
4wire q = 11111
show(q)
```

Error: `Expected 4 bits, got 5 bits.`

```logts-play
8wire q = 10101010
show(q)
```

Result: `10101010`

---

## `:=` — Left-pad assignment

If the assigned value is shorter than the destination width, zeros are added on the **left**.

### Syntax

```logts
wire := value
```

### Examples

```logts-play
3wire q := 1
show(q)
```

Result: `001`

```logts-play
3wire q := 10
show(q)
```

Result: `010`

```logts-play
8wire q := 101
show(q)
```

Result: `00000101`

```logts-play
8wire q := 11110000
show(q)
```

Result: `11110000`

### ASM — program in a wide slot (left-pad)

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire x := .myisa { LOAD R1 A2 }
show(x)
```

Shorter program → zeros on the **left** (`^00 + ^16`).

---

## `=:` — Right-pad assignment

If the assigned value is shorter than the destination width, zeros are added on the **right**.

### Syntax

```logts
wire =: value
```

### Examples

```logts-play
3wire q =: 1
show(q)
```

Result: `100`

```logts-play
3wire q =: 10
show(q)
```

Result: `100`

```logts-play
8wire q =: 101
show(q)
```

Result: `10100000`

### ASM — program in a wide slot (right-pad)

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire x =: .myisa { LOAD R1 A2 }
show(x)
```

Shorter program → zeros on the **right** (`^16 + ^00`).

### Re-assignment after init

```logts-play
MODE WIREWRITE
4wire q : 1
q =: 11
show(q)
```

Result: `1100`

---

## `:` — Initial assignment

Assigns the initial value of a wire at declaration. **Literal only** (binary, hex `^`, decimal `\`, `!`, or meta constant `/name/`).

Meta constants such as `/instance/` are documented in **[meta-constants.md](meta-constants.md)** (top-level `:` init only).

### Syntax

```logts
wire : value
```

### Examples

```logts-play
3wire q : 1
show(q)
```

Result: `001` (left-padded at init)

```logts-play
8wire counter : 00000000
show(counter)
```

```logts-play
1wire state : 0
show(state)
```

After `:` init, the first real assignment (`=`, `:=`, or `=:`) is allowed in STRICT mode.

---

## Operator comparison

| Operator | Shorter value | Exact width | Longer value |
|----------|---------------|-------------|--------------|
| `=` | Error | OK | Truncate (per path) |
| `:=` | Left-pad | OK | Truncate (per path) |
| `=:` | Right-pad | OK | Truncate (per path) |
| `:` | Left-pad at init | OK | Truncate at init |

---

## ASM width rules

| Declaration | Blob shorter than wire |
|-------------|------------------------|
| `Nwire x = .isa { ... }` | **Error** (strict) |
| `Nwire x := .isa { ... }` | Left-pad |
| `Nwire x =: .isa { ... }` | Right-pad |

Use exact wire width with `=` when the assembled program matches, e.g. `8wire prog = .myisa { LOAD R1 A2 }`.

---

## `MODE WIREWRITE`

Allows **re-assignment** to the same wire name after initialization (in addition to `MODE STRICT` rules). In default binary mode, multiple writes in one step still behave as **last wins** during propagation.

Overview of all modes: **[modes.md](modes.md)**.

```logts-play
MODE WIREWRITE
4wire q : 1
q =: 11
show(q)
```

Result: `1100`

---

## `MODE ZSTATE` and `WIREWRITE`

`MODE ZSTATE` can be combined with `MODE WIREWRITE`. The difference from plain WIREWRITE:

| | `MODE WIREWRITE` (binary) | `MODE ZSTATE` |
|--|---------------------------|---------------|
| Multiple writes same step | Last value wins | Contributions **merged** per bit |
| Undeclared wire | Zeros | `Z` (high-impedance) |
| Conflict | Silent overwrite | `X` on conflicting bits |

Full semantics: **[zstate.md](zstate.md)**. All `MODE` options: **[modes.md](modes.md)**.

```logts-play wave
MODE ZSTATE

2wire bus
2wire a = 10
2wire b = 11
bus = a
bus = b
show(bus)
```

Result: `1X` (not `11`).

