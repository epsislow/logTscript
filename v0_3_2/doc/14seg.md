# 14-segment display (`14seg`)

`comp [14seg]` (shortname `comp [14]`) renders an **alphanumeric 14-segment display** (15 bits including decimal point).

Signature: `doc(comp.14seg)` or `doc(comp.14)`.

---

## Syntax

```
comp [14seg] .name:
  text: 'Char'
  color: ^f00
  bgColor: ^111
  scale: 2
  nl
  :
```

---

## Driving modes

| Pin | Width | Effect |
|-----|-------|--------|
| `hex` | 4 | Hex digit 0–F |
| `chr` | 8 | ASCII character code |
| `data` | 15 | Full segment pattern |
| `a`…`dp` | 1 each | Individual segments (see `doc(comp.14)`) |
| `set` | 1 | Enable property block |
| `get` | 15 | Read back pattern |

Direct assignment `= 15bit` sets initial segments.

---

## Example — character

```logts-play
comp [14seg] .disp:
  color: ^0f0
  scale: 2
  nl
  on: 1
  :

.disp:{
  chr = 01000001
  set = 1
}
```

Shows **A** (ASCII 65).

---

## Notes

- Segment names include `g1`, `g2` for the two center bars.
- Not allowed in [chip.md](chip.md) bodies.
- Related: [seven-seg.md](seven-seg.md), [lcd.md](lcd.md), [lut.md](lut.md#display-decode--hex-0f) (hex 0–F via LUT).
