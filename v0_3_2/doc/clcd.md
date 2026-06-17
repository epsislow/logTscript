# CLCD component (`clcd`)

`comp [clcd]` is a **canvas-based custom LCD** — predefined symbols at `(x, y)`, each driven by one bit or a bit range. ON uses `color`, OFF uses `bgColor` (per symbol, or `bgColorSym` / `bgColor` defaults at component level).

Signature: `doc(comp.clcd)`.

Distinct from [`lcd`](lcd.md) (pixel matrix + HD44780 font).

---

## Syntax

```logts
comp [clcd] .name:
  width: 200
  height: 100
  color: ^00ff00
  bgColor: ^000000
  bgColorSym: ^ffff00
  nl
  = {
    symbolName:
      x: 10
      y: 20
      bit: 0
      color: ^ffaa00
      bgColor: ^332200
    :
  }
  :
```

Minimal:

```logts
comp [clcd] .panel::
```

---

## Attributes (component)

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width` | 200 | Canvas width (px) |
| `height` | 100 | Canvas height (px) |
| `color` | `^00ff00` | Default ON color for symbols |
| `bgColor` | `^000000` | Canvas background fill |
| `bgColorSym` | (same as `bgColor`) | Default OFF color for all symbols — equivalent to setting `bgColor` on every symbol entry; per-symbol `bgColor` still overrides |
| `nl` | off | Newline after display |

## Symbol fields (`= { … }`)

| Field | Required | Description |
|-------|----------|-------------|
| `x`, `y` | yes | Position on canvas |
| `bit` | one of | Single control bit |
| `bits` | one of | Inclusive range `N-M` (e.g. `digit7`) |
| `color` | no | Override ON color for this symbol |
| `bgColor` | no | Override OFF color for this symbol |
| `style` | no | FA icon style: `1` solid (default), `2` regular, `3` brands — only on FA symbols; not on canvas or `label` |

### `label` (text on canvas)

Use the **`label`** symbol for bit-driven text. The symbol name is always `label`; use multiple `label:` entries for several strings (same pattern as duplicate `digit7`).

| Field | Required | Description |
|-------|----------|-------------|
| `text` | yes | Quoted string, e.g. `text: "Load"` |
| `bit` | yes | Single control bit (`bits` range not supported) |
| `family` | no | `mono` (default), `sans`, or `serif` |
| `size` | no | Font size in px, 6–48 (default `14`) |
| `weight` | no | `normal` (default), `bold`, `italic`, `boldItalic` |

When the control bit is **ON**, text uses `color`; when **OFF**, text uses `bgColor` (same as FA icons).

| `family` | Font stack |
|----------|------------|
| `mono` | Consolas, Courier New, monospace |
| `sans` | system-ui, Segoe UI, sans-serif |
| `serif` | Georgia, Times New Roman, serif |

| `weight` | Appearance |
|----------|------------|
| `normal` | regular |
| `bold` | bold |
| `italic` | italic |
| `boldItalic` | bold italic |

`style` is not allowed on `label`.

The **same symbol name may appear multiple times** — each entry is independent (its own `x`, `y`, and `bit` / `bits`). Example: two `digit7` displays at different positions, each driven by its own bit range.

**Bit mapping** must be **contiguous from 0** with no gaps across *all* entries (union of every bit used). Using bit `0` and bit `2` without bit `1` is an error.

Bus width = `max(bit index) + 1` over all symbols.

---

## Supported symbols

The catalog includes **~500** Font Awesome icons (plus four canvas symbols and the `label` text symbol). Use the searchable catalog for the full list:

**[Symbol catalog → clcd-symbols.md](clcd-symbols.md)**

### `style` (FA icons only)

| `style` | Appearance |
|---------|------------|
| `1` | Solid (default) |
| `2` | Regular / outline — only when listed for that symbol in the catalog |
| `3` | Brands — e.g. `bluetooth`, `usb`, `android` |

Not every symbol supports every style. Brands icons use `3` by default. Specifying an unsupported `style` is a parse error.

Canvas symbols (`digit7`, `digit14`, `dp`, `colon`) are drawn on the display canvas — they do not use `style`.

The **`label`** symbol draws text on the canvas (see **Symbol fields** above).

Icons use Font Awesome 5 Free (`res/fontawesome/`).

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Use this to inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script **and** runs it immediately. The **CLCD** canvas appears in the **Devices** panel with the values from the script. |

For static examples (fixed `Nwire` values), **Load & Run** is enough — you see the symbol states right away.

For the **interactive status panel** below, use **Load & Run**, then flip the **DIP** switches in the panel; the CLCD updates as the wire changes.

---

## Input

### Static drive (Load & Run)

**Load & Run** the example below — `power` ON, `wifi` OFF, `warning` ON (`flags = 101`).

```logts-play
comp [clcd] .status:
  = {
    power: x:10 y:10 bit:0 :
    wifi: x:50 y:10 bit:1 :
    warning: x:90 y:10 bit:2 :
  }
  :

3wire flags = 101
.status = flags
```

Property block (`value` + `set`, not `data`):

```logts
.status:{
  value = flags
  set = 1
}
```

---

## Debug

```logts
show(.status)
peek(.status)
probe(.status:get)
```

`:get` returns the current bit vector driving the display.

---

## Examples

### Interactive status panel (DIP + CLCD)

**Load** if you want to change symbol positions first; **Load & Run** to see the panel, then flip the **Flags** DIP (`000` … `111`) — icons follow the 3-bit pattern.

```logts-play
comp [dip] .flags:
  length: 3
  text: 'Flags'
  visual: 1
  = 101
  :

comp [clcd] .status:
  width: 200
  height: 60
  color: ^00ff00
  bgColor: ^001000
  = {
    power: x:10 y:10 bit:0 :
    wifi: x:50 y:10 bit:1 :
    warning: x:90 y:10 bit:2 color:^ffaa00 bgColor:^332200 :
  }
  :

3wire bus = .flags:get
.status = bus
```

### Battery panel

**Load & Run** — both `battery` and `charging` icons ON (`state = 11`).

```logts-play
comp [clcd] .battery:
  width: 120
  height: 50
  = {
    battery: x:10 y:10 bit:0 :
    charging: x:60 y:10 bit:1 :
  }
  :

2wire state = 11
.battery = state
```

### Text labels

**Load & Run** — two labels driven by bits 0 and 1; icons use overlapping bits in this minimal demo (use separate bits in real panels).

```logts-play
comp [clcd] .ui:
  width: 220
  height: 50
  color: ^00ff00
  bgColor: ^002200
  = {
    label:
      x: 8
      y: 6
      bit: 0
      text: "Load"
      family: mono
      size: 16
      weight: bold
    :
    label:
      x: 8
      y: 28
      bit: 1
      text: "Save"
      weight: normal
    :
    power:
      x: 120
      y: 12
      bit: 0
    :
  }
  :

2wire flags = 11
.ui = flags
```

### Seven-segment digit + decimal point

**Load & Run** — all segments ON, decimal point OFF (`value = 11111100`).

```logts-play
comp [clcd] .digit:
  = {
    digit7: x:10 y:10 bits:0-6 :
    dp: x:60 y:10 bit:7 :
  }
  :

8wire value = 11111100
.digit = value
```

### Multiple seven-segment digits (same symbol, different bits)

**Load & Run** — three `digit7` glyphs at different `x` positions; each uses its own 7-bit slice (bus width 21).

```logts-play
comp [clcd] .display:
  width: 160
  height: 80
  = {
    digit7:
      x: 10
      y: 10
      bits: 0-6
    :
    digit7:
      x: 50
      y: 10
      bits: 7-13
    :
    digit7:
      x: 90
      y: 10
      bits: 14-20
    :
  }
  :

21wire val = 1111111000000111111100000
.display = val
```

Each `digit7` listens to its own 7-bit slice; bus width is 21 bits (`0`…`20`).

---

## Related

- [lcd.md](lcd.md) — pixel matrix display
- [seven-seg.md](seven-seg.md) — 7-segment component
- [components.md](components.md)
