# LCD matrix component

`comp [lcd]` is a **pixel matrix display** with programmable rows/columns. Draw via property blocks using coordinates, characters, or raw pixel data.

Signature: `doc(comp.lcd)` — full pin list is long; always check `doc(comp.lcd)` in the editor.

---

## Syntax

```
comp [lcd] .name:
  row: 8
  cols: 5
  pixelSize: 10
  pixelGap: 3
  color: ^0f0
  rgb
  nl
  :
```

| Attribute | Default | Description |
|-----------|---------|-------------|
| `row` | 8 | Matrix height |
| `cols` | 5 | Matrix width |
| `pixelSize` | 10 | Square pixel size (px) |
| `pixelSizeX`, `pixelSizeY` | from `pixelSize` | Non-square pixels |
| `pixelGap` | 3 | Gap between pixels |
| `color` | green | Monochrome color (without `rgb`) |
| `rgb` | off | Enable RGB mode |

---

## Main pins

| Pin | Role |
|-----|------|
| `set` | Enable draw operation |
| `clear` | Clear display |
| `x`, `y` | Pixel coordinates |
| `chr` | 8-bit character to draw |
| `data` | Pixel value / pattern |
| `write0` | Write mode control |
| `rowlen` | Row length for bulk writes |
| `corner` | Corner radius hint |
| `get` | 8-bit readback of last operation |

Use property blocks with `on:` matching your trigger strategy.

---

## Minimal example

```logts-play
comp [lcd] .screen:
  row: 8
  cols: 5
  pixelSize: 8
  color: ^0f0
  nl
  on: 1
  :

.screen:{
  x = 000
  y = 000
  chr = 01001000
  set = 1
}
```

---

## Notes

- Complex displays belong in [pcb.md](pcb.md), not [chip.md](chip.md).
- Related: [seven-seg.md](seven-seg.md), [led.md](led.md).
