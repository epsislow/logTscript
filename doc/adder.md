# Adder component

`comp [adder]` (shortname `comp [+]`) performs **N-bit binary addition** with carry. Unlike the `ADD()` built-in, the adder is a persistent device with pins you wire in property blocks — ideal inside [pcb.md](pcb.md) and [chip.md](chip.md).

Instant one-off math: [arithmetic.md](arithmetic.md). Signature: `doc(comp.adder)` or `doc(comp.+)`.

---

## Syntax

```
comp [adder] .name:
  depth: 4
  on: 1
  :
```

Minimal (`depth` defaults to 4):

```
comp [adder] .name::
```

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Enable — when `on:` condition holds, `a` and `b` are sampled |
| `a`, `b` | `depth` | Operands |
| `get` | `depth` | Sum `(a + b) mod 2^depth` |
| `carry` | 1 | `1` if sum overflows `depth` bits |

Direct assignment `= Xbit` sets initial stored operands where supported.

---

## Property block example

```logts-play
comp [adder] .add:
  depth: 4
  on: 1
  :

4wire a = 1111
4wire b = 0001

.add:{
  a = a
  b = b
  set = 1
}

4wire sum = .add:get
1wire cy = .add:carry
show(sum, cy)
```

`sum = 0000`, `cy = 1`.

---

## Chip usage

```
chip +[halfAdd]:
  ...
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
```

Probe: `probe(.add:get)`, `probe(.u1:sum)` from outside — [debug.md](debug.md).

---

## Related

- [subtract.md](subtract.md) — subtraction with borrow on `carry`
- [components.md](components.md) — full index
