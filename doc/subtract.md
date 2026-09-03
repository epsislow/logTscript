# Subtract component

`comp [subtract]` (shortname `comp [-]`) performs **N-bit binary subtraction** with borrow flag on `carry`.

Built-in equivalent: `SUBTRACT()` in [arithmetic.md](arithmetic.md). Signature: `doc(comp.subtract)` or `doc(comp.-)`.

---

## Syntax

```
comp [subtract] .name:
  depth: 4
  on: 1
  :
```

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Enable |
| `a`, `b` | `depth` | Operands (`get` = `a - b` mod 2^depth) |
| `get` | `depth` | Difference |
| `carry` | 1 | Borrow: `1` if `a < b` |

---

## Example

```logts-play
comp [subtract] .sub:
  depth: 4
  on: 1
  :

.sub:{
  a = 0010
  b = 0100
  set = 1
}

4wire diff = .sub:get
1wire borrow = .sub:carry
show(diff, borrow)
```

`diff = 1110` (wrap), `borrow = 1`.

---

## Related

- [adder.md](adder.md)
- [components.md](components.md)
