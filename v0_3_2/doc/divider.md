# Divider component

`comp [divider]` (shortname `comp [/]`) performs **unsigned integer division** on two **N-bit** operands.

Built-in: `DIVIDE()` — [arithmetic.md](arithmetic.md). Signature: `doc(comp.divider)` or `doc(comp./)`.

---

## Syntax

```
comp [divider] .name:
  depth: 4
  on: 1
  :
```

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Enable |
| `a`, `b` | `depth` | Dividend and divisor |
| `get` | `depth` | Quotient `⌊a / b⌋` |
| `mod` | `depth` | Remainder `a % b` |

Division by zero yields `0` on both outputs.

---

## Example

```logts-play
comp [divider] .div:
  depth: 4
  on: 1
  :

.div:{
  a = 1101
  b = 0011
  set = 1
}

4wire q = .div:get
4wire r = .div:mod
show(q, r)
```

`13 / 3` → `q = 0100` (4), `r = 0001` (1).

Probe component properties: `probe(.div:mod)` — [debug.md](debug.md).

---

## Related

- [multiplier.md](multiplier.md)
- [components.md](components.md)
