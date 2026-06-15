# 7-segment display (`7seg`)

`comp [7seg]` (shortname `comp [7]`) renders a **7-segment (+ decimal point) display**. Segment pattern is 8 bits: `a`–`g` plus `h` (DP).

Signature: `doc(comp.7seg)` or `doc(comp.7)`.

---

## Syntax

```
comp [7seg] .name:
  text: 'Value'
  color: ^f00
  bgColor: ^111
  lgColor: ^444
  scale: 2
  tranSec: 0
  nl
  :
```

---

## Driving modes

| Pin | Width | Effect |
|-----|-------|--------|
| `hex` | 4 | Drive from hex digit `0000`–`1111` |
| `a`…`h` | 1 each | Direct segment control |
| `set` | 1 | Enable property block updates |
| `get` | 8 | Read back current segment pattern |

Direct assignment `= 8bit` sets initial pattern.

---

## Example — hex digit

```logts-play
comp [7seg] .disp:
  color: ^f00
  scale: 2
  nl
  on: 1
  :

.disp:{
  hex = 0101
  set = 1
}

show(.disp:get)
```

Shows digit **5**.

---

## Property block with wires

```
4wire n = 1001

.disp:{
  hex = n
  set = 1
}
```

---

## Notes

- Not allowed in [chip.md](chip.md) bodies.
- `probe(.disp:get)` — [debug.md](debug.md).
- Related: [14seg.md](14seg.md), [dots.md](dots.md), [lut.md](lut.md#display-decode--hex-0f) (hex 0–F via LUT).
