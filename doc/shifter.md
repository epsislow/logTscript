# Shifter component

`comp [shifter]` (shortname `comp [>]`) is a **shift register**: shifts `value` left or right when enabled, with serial `in` / `out` bits.

Signature: `doc(comp.shifter)` or `doc(comp.>)`.

---

## Syntax

```
comp [shifter] .name:
  depth: 4
  circular
  on: 1
  :
```

| Attribute | Description |
|-----------|-------------|
| `depth` | Register width (default 4) |
| `circular` | When set, bits rotated wrap around |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Enable shift when `on:` holds |
| `value` | `depth` | Data to shift |
| `dir` | 1 | Direction (`0` = one way, `1` = other — see `doc`) |
| `in` | 1 | Bit shifted in |
| `get` | `depth` | Register contents after shift |
| `out` | 1 | Bit shifted out |

---

## Example

```logts-play
comp [shifter] .sr:
  depth: 4
  on: 1
  :

.sr:{
  value = 1000
  dir = 0
  in = 1
  set = 1
}

4wire v = .sr:get
1wire bit = .sr:out
show(v, bit)
```

---

## Related

- Built-in `LSHIFT` / `RSHIFT` in `doc(def)` — combinational, not a register
- [counter.md](counter.md)
- [components.md](components.md)
