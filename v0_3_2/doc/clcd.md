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
| `touch` | `0` | When `1`, enables click/touch hit-testing on symbols with `bitOut` |
| `touchColor` | (off) | When set, draws debug borders around touch hit boxes |
| `touchPadding` | `0` | Default padding (px) for symbol touch rects when `padding` is omitted |
| `nl` | off | Newline after display |

## Symbol fields (`= { … }`)

| Field | Required | Description |
|-------|----------|-------------|
| `x`, `y` | yes | Position on canvas |
| `bit` | one of | Single control bit |
| `bits` | one of | Inclusive range `N-M` (e.g. `digit7`) |
| `bitOut` | no | Touch output bit index (optional; symbol omitted from `:out` if absent) |
| `touchType` | with `bitOut` | `1` momentary (default), `2` pulse, `3` latch/toggle |
| `width`, `height` | no | Touch hit box size (px); defaults per symbol kind (FA 22×22, `digit7` 28×44, …) |
| `padding` | no | Extra margin (px) around hit box; defaults to `touchPadding` or `0` |
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

### Touch output (`bitOut`)

Display bits (`bit` / `bits` → `:get`) and touch bits (`bitOut` → `:out`) are **separate namespaces**. A symbol may use display bits only, touch bits only, or both.

| Property | Description |
|----------|-------------|
| `:out` | Read-only bit vector; width = number of symbols with `bitOut`, indices `0 … N-1` in symbol order |
| `touchReset` | Writable mask; each `1` bit clears the corresponding `:out` position |

`bitOut` indices must be **contiguous from 0** across all symbols that define `bitOut` (same rule as display bits).

**Hit rectangle** for a symbol at `(x, y)` with size `(width, height)` and padding `pad`:

- Left: `x - pad`, top: `y - pad`
- Right: `x + width + pad`, bottom: `y + height + pad`

Default sizes when `width` / `height` are omitted depend on symbol kind (e.g. FA icons 22×22, `digit7` 28×44). Default `pad` is the symbol's `padding`, else `touchPadding`, else `0`.

Set component attribute `touch: 1` to enable hit-testing. Optional `touchColor` draws debug borders around hit boxes. With a mouse, the cursor is `pointer` over touch zones (`touchType` 1 or 2) and `grab` over latch zones (`touchType` 3); elsewhere it stays the default arrow.

**`touchType`** (per symbol with `bitOut`):

| Value | Behavior |
|-------|----------|
| `1` | Momentary — `:out` bit is `1` while pressed, `0` on release (default) |
| `2` | Pulse — bit goes `1` on press and returns to `0` in the same simulation step |
| `3` | Latch — each press toggles the bit; cleared by `touchReset` or another press |

Wire touch output to the rest of the circuit:

```logts
comp [clcd] .panel
  touch: 1
  wifi = { x: 10, y: 10, bitOut: 0, touchType: 1 }
  power = { x: 40, y: 10, bitOut: 1, touchType: 3 }

2wire touchBus = 00

.panel:out > touchBus
```

Reset latched bits:

```logts
.panel:touchReset = 01   // clear bit 1 only
```

Property blocks can also assign `touchReset` when the component has `on: 1` (or use direct assignment as above).

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

For **touch screen** examples, use **Load & Run**, then **tap** symbols on the CLCD canvas; watch the **Output** panel for `peek` / `show` lines. Optional `touchColor` draws hit-box borders on the canvas.

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

## Touch screen examples

All examples below need `touch: 1` and symbols with `bitOut`. **Load & Run**, then interact with the CLCD in the **Devices** panel.

### `touchType` 1, 2, and 3

Three icons on one bus — compare momentary, pulse, and latch on a single panel:

| Symbol | `touchType` | What to try |
|--------|-------------|-------------|
| `wifi` | `1` momentary | Press and hold — `touchOut[0]` stays `1` until release |
| `bell` | `2` pulse | Tap once — `touchOut[1]` goes `1` then back to `0` in the same step |
| `power` | `3` latch | Tap to toggle `touchOut[2]` on/off |

```logts-play
comp [clcd] .panel:
  touch: 1
  width: 200
  height: 70
  color: ^00ff00
  bgColor: ^001000
  = {
    wifi: x: 10 y: 15 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 :
    bell: x: 60 y: 15 bit: 1 bitOut: 1 touchType: 2 width: 22 height: 22 :
    power: x: 110 y: 15 bit: 2 bitOut: 2 touchType: 3 width: 22 height: 22 :
  }
  :

3wire touchOut = .panel:out

peek(touchOut)
```

### `touchColor` — hit box borders

Set `touchColor` on the component to draw a **debug border** around every touch hit rectangle (symbols with `bitOut` only). Borders match the exact area used for hit-testing — `(x, y, width, height)` plus `padding`. Omit `touchColor` in production panels; use it while placing symbols and tuning tap targets.

**Load & Run** — three FA icons (22×22 rects) and one `digit7` (28×44 default rect). Magenta borders outline each zone on the canvas.

```logts-play
comp [clcd] .panel:
  touch: 1
  touchColor: ^ff00ff
  width: 200
  height: 80
  color: ^00ff00
  bgColor: ^001000
  = {
    wifi: x: 10 y: 20 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 :
    bell: x: 45 y: 20 bit: 1 bitOut: 1 touchType: 1 width: 22 height: 22 :
    warning: x: 80 y: 20 bit: 2 bitOut: 2 touchType: 1 width: 22 height: 22 :
    digit7: x: 120 y: 12 bits: 3-9 bitOut: 3 touchType: 1 :
  }
  :

4wire touchOut = .panel:out

peek(touchOut)
```

### Latch with `touchReset`

Latch both icons by tapping them (`touchType: 3`). Press the **Clr bit 1** key to apply `touchReset = 01` — bit `1` (`wifi`) clears while bit `0` (`power`) stays latched.

```logts-play
comp [key] .clearBit1:
  label: 'Clr bit 1'
  nl
  :

comp [clcd] .panel:
  touch: 1
  on: 1
  width: 120
  height: 60
  color: ^00ff00
  bgColor: ^001000
  = {
    power: x: 10 y: 15 bit: 0 bitOut: 0 touchType: 3 width: 22 height: 22 :
    wifi: x: 55 y: 15 bit: 1 bitOut: 1 touchType: 3 width: 22 height: 22 :
  }
  :

2wire touchOut = .panel:out

.panel:{
  set = .clearBit1:get
  touchReset = 01
}

peek(touchOut)
```

Direct assignment works too (e.g. in the editor after **Load**):

```logts
.panel:touchReset = 01
```

### Overlapping hit zones

`wifi` and `bell` share the same `(x, y)`. A single tap in the overlap hits **both** symbols — `:out` becomes `11`. Enable `touchColor` to see both rects drawn on top of each other.

```logts-play
comp [clcd] .panel:
  touch: 1
  touchColor: ^00ffff
  width: 80
  height: 60
  color: ^00ff00
  bgColor: ^001000
  = {
    wifi: x: 20 y: 15 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 :
    bell: x: 20 y: 15 bit: 1 bitOut: 1 touchType: 1 width: 22 height: 22 :
  }
  :

2wire touchOut = .panel:out

peek(touchOut)
```

### Padding

`touchPadding: 8` sets the default margin; `power` adds `padding: 4` on top (12 px total beyond the 22×22 icon). Combine with `touchColor` to see the enlarged tap area — try clicking just outside the icon glyph.

```logts-play
comp [clcd] .panel:
  touch: 1
  touchColor: ^ff8800
  touchPadding: 8
  width: 100
  height: 80
  color: ^00ff00
  bgColor: ^001000
  = {
    power: x: 30 y: 25 bit: 0 bitOut: 0 touchType: 1 width: 22 height: 22 padding: 4 :
  }
  :

1wire touchOut = .panel:out

peek(touchOut)
```

---

## Related

- [lcd.md](lcd.md) — pixel matrix display
- [seven-seg.md](seven-seg.md) — 7-segment component
- [components.md](components.md)
