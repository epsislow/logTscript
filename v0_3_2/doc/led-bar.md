# LED bar component (`bar`)

`comp [bar]` (parser alias `ledBar`) shows a **horizontal or vertical bar graph** of LEDs. Width follows `length` (default 8).

Signature: `doc(comp.bar)`.

---

## Syntax

```
comp [bar] .name:
  length: 8
  width: 4
  gap: 2
  color: ^0f0
  bgColor: ^222
  orientation: 0
  barWidth: 20
  scale: 1
  nl
  :
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `length` | 8 | Number of LEDs (bits) |
| `width` | 4 | LED thickness |
| `gap` | 2 | Space between LEDs |
| `color` | green | Lit LED color |
| `bgColor` | dark gray | Background |
| `orientation` | 0 | `0` horizontal, `1` vertical |
| `barWidth` | 20 | Total bar size (px) |
| `scale` | 1 | UI scale factor |

---

## Pins

| Pin | Width | Role |
|-----|-------|------|
| `set` | 1 | Enable property block |
| `data` | `length` | Bit pattern — each `1` lights one segment |
| `get` | `length` | Read back displayed value |

Direct assignment: `comp [bar] .lvl: length: 8 = 00001111 ::`

---

## Example

```logts-play
comp [bar] .meter:
  length: 8
  color: ^0f9
  orientation: 0
  nl
  on: 1
  :

.meter:{
  data = 00001111
  set = 1
}
```

Lights the right half of the bar.

---

## Related

- [led.md](led.md) — individual LEDs
- [components.md](components.md)
