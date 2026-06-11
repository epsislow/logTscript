# Multiplier component

`comp [multiplier]` (shortname `comp [*]`) multiplies two **N-bit** operands. Returns low `depth` bits on `get` and high `depth` bits on `over`.

Built-in: `MULTIPLY()` — [arithmetic.md](arithmetic.md). Signature: `doc(comp.multiplier)` or `doc(comp.*)`.

---

## Syntax

```
comp [multiplier] .name:
  depth: 4
  on: 1
  :
```

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Enable |
| `a`, `b` | `depth` | Operands |
| `get` | `depth` | Low `depth` bits of `a × b` |
| `over` | `depth` | High `depth` bits of product |

---

## Example

```logts-play
comp [multiplier] .mul:
  depth: 4
  on: 1
  :

.mul:{
  a = 0011
  b = 0100
  set = 1
}

4wire lo = .mul:get
4wire hi = .mul:over
show(lo, hi)
```

`3 × 4 = 12` → `lo = 1100`, `hi = 0000`.

---

## Related

- [divider.md](divider.md)
- [components.md](components.md)
