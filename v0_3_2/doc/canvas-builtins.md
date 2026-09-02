# Canvas draw built-ins

Built-in calls available inside `inline [canvas]` method bodies and in `comp [canvas]` `renderer { }` blocks.

Definitions → [inline-canvas.md](inline-canvas.md). Runtime wiring → [comp-canvas.md](comp-canvas.md).

In the **documentation viewer**, use **Load** and **Load & Run** on `logts-play` examples.

---

## Quick reference

| Builtin | Purpose |
|---------|---------|
| `styleFill(c)` | Set fill color only |
| `styleStroke(c)` / `styleStroke(c, w)` | Set stroke color and optional width (px) |
| `style(stroke, fill)` / `style(stroke, fill, w)` | Set stroke then fill (+ optional width) |
| `drawRect(x, y, w, h)` | Filled + stroked rectangle (current style) |
| `drawRect(x, y, w, h, fill)` | Rectangle with fill override |
| `drawRect(x, y, w, h, fill, stroke)` | Rectangle with fill and stroke overrides |
| `drawCircle(cx, cy, r)` | Filled + stroked circle |
| `drawCircle(cx, cy, r, fill)` / `(…, fill, stroke)` | Circle with overrides |
| `drawLine(x1, y1, x2, y2)` | Line using current stroke |
| `beginPath()` | Start a new path (required before segments / `fill` / `stroke`) |
| `moveTo(x, y)` / `lineTo(x, y)` | Path segments |
| `arc(cx, cy, r, startDeg, endDeg)` | Arc in **integer degrees**; optional 6th arg `counter` (`0` CW default, `1` CCW) |
| `quadraticCurveTo(cpx, cpy, x, y)` | Quadratic Bézier segment |
| `bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` | Cubic Bézier segment |
| `closePath()` | Close current sub-path |
| `fill()` / `stroke()` | Render current path (uses `styleFill` / `styleStroke`) |
| `polygon(xs[], ys[])` | Closed polygon from vectors — **after** `beginPath`, before `fill`/`stroke` |
| `rotatePoint(x,y,cx,cy,deg)` | Returns `[xRot, yRot]` — rotation in degrees (expression) |
| `vectorLen(xs)` | Array length — error on scalar |
| `fontSize(n)` | Font size in pixels (default **14**) |
| `fontFamily("mono"\|"sans"\|"serif")` | Text family (default **`mono`**, same tokens as CLCD `label`) |
| `fontStyle(family, size)` | Set family and size in one call |
| `textAlign("left"\|"center"\|"right"\|"start"\|"end")` | Default `left` |
| `textBaseline("top"\|"middle"\|"alphabetic"\|"bottom")` | Default `alphabetic` |
| `symbolSize(n)` | Display size for next `drawSymbol` (CLCD semantics per symbol kind) |
| `symbolStyle(1\|2\|3)` | FA icon style: solid / regular / brands (default from catalog) |
| `drawSymbol(x, y, name)` | CLCD catalog icon (Font Awesome), 3 args |
| `drawSymbol(x, y, name, bits)` | CLCD canvas symbol (`digit7`, `colon`, `dp`, …), 4 args |

Default font is **`mono`** (`Consolas`, `Courier New`, monospace stack).

Symbol names match [clcd-symbols.md](clcd-symbols.md). **`label`** uses `drawText`, not `drawSymbol`.

---

## Colors

| Form | Meaning |
|------|---------|
| `"rrggbb"` | Opaque (6 hex digits, **no** `#`) |
| `"rrggbbaa"` | With alpha (8 hex digits) |
| `0` or `"0"` | Skip that fill or stroke pass |

`#` starts a **comment**, not a color literal.

---

## Style builtins

### `styleFill(fillColor)`

Sets fill only; stroke and stroke width unchanged.

```logts
styleFill("aaffaa")
drawRect(10, 10, 40, 30)
```

### `styleStroke(strokeColor)` / `styleStroke(strokeColor, strokeWidth)`

```logts
styleStroke("ff0000")
drawLine(0, 0, 100, 100)

styleStroke("000000", 3)
drawRect(5, 5, 50, 40)
```

### `style(strokeColor, fillColor)` / `style(strokeColor, fillColor, strokeWidth)`

Order: **stroke first**, then fill.

```logts
style("000000", "aaffaa", 2)
drawRect(20, 20, 60, 40)
```

### Transparent stroke or fill

```logts
styleFill(0)
styleStroke("ff0000", 2)
drawRect(10, 10, 50, 50)    # outline only

style("000000", "00ff00")
drawRect(70, 10, 50, 50, 0, "ff0000")   # fill skip via override
```

---

## `drawRect`

```logts
drawRect(x, y, width, height)
drawRect(x, y, width, height, fillColor)
drawRect(x, y, width, height, fillColor, strokeColor)
```

Uses current style when override args omitted. `0` / `"0"` skips that pass.

---

## `drawCircle`

```logts
drawCircle(cx, cy, radius)
drawCircle(cx, cy, radius, fillColor)
drawCircle(cx, cy, radius, fillColor, strokeColor)
```

---

## `drawLine`

Uses **stroke** color and width only (no fill).

```logts
styleStroke("ffffff", 1)
drawLine(0, 0, 100, 100)
```

---

## Path API — `beginPath`, `moveTo`, `lineTo`, `arc`, `fill`, `stroke`, `polygon`

Low-level Canvas 2D paths for shapes beyond `drawRect` / `drawCircle`. **Always call `beginPath()` first** — `moveTo`, `lineTo`, `arc`, `closePath`, `fill`, `stroke`, and `polygon` error without an active path.

### Triangle (manual)

```logts
drawTriangle(x1, y1, x2, y2, x3, y3) {
    style("000000", "ff4444", 2)
    beginPath()
    moveTo(x1, y1)
    lineTo(x2, y2)
    lineTo(x3, y3)
    closePath()
    fill()
    stroke()
}
```

### `arc` — degrees + optional `counter`

```logts
beginPath()
arc(cx, cy, r, 0, 360)        # full circle, clockwise (default counter=0)
arc(cx, cy, r, 0, 360, 1)     # full circle, counter-clockwise
arc(cx, cy, r, -45, 0)        # 45° slice, clockwise
```

| Arg | Meaning |
|-----|---------|
| `startDeg`, `endDeg` | Integer **degrees** (any integer, e.g. `-45` … `360`) |
| `counter` (optional) | `0` or omitted → clockwise · `1` → counter-clockwise |

### Curves

```logts
beginPath()
moveTo(0, 40)
quadraticCurveTo(60, 0, 120, 40)
stroke()

beginPath()
moveTo(0, 0)
bezierCurveTo(20, 40, 60, -20, 80, 30)
fill()
```

### `polygon(xs[], ys[])` — vector helper

Adds a closed polygon to the **current** path. Does **not** call `beginPath` or draw by itself.

```logts
drawZone(xs[], ys[]) {
    styleFill("224488")
    beginPath()
    polygon(xs, ys)
    fill()
}
```

| Rule | Detail |
|------|--------|
| Precondition | `beginPath()` already called |
| `vectorLen(xs) == vectorLen(ys)` | required — runtime error on mismatch |
| `vectorLen >= 3` | required — runtime error if fewer points |
| After | call `fill()` and/or `stroke()` |

`drawRect`, `drawCircle`, and `drawLine` remain shortcuts (unchanged).

### `rotatePoint`

```logts
pt = rotatePoint(x, y, centerX, centerY, rotationDeg)
drawRect(pt[0], pt[1], 4, 4)
```

Integer **degrees**; returns a 2-element vector. Trigonometry stays inside the engine (not exposed in the script language).

### Local vector literals and mutation

```logts
xs = [10, 20]
xs = []
xs = other          # copy by value
xs[0] = 5           # index 0-based; i >= len → error
xs[] = 99           # append
xs += points        # append all elements from points
```

Nested vectors (`xs[] = inner` where `inner` is a vector) → runtime error.

---

## Text — `drawText`, `fontSize`, `fontFamily`, `fontStyle`, `textAlign`, `textBaseline`

`drawText` uses **fill only** (not outlined text).

```logts
styleFill("ffffff")
fontStyle("sans", 18)
textAlign("start")
textBaseline("middle")
drawText(100, 50, "SCORE")

fontFamily("serif")
fontSize(12)
drawText(10, 200, "caption")
```

| Builtin | Values |
|---------|--------|
| `fontFamily` | `"mono"` (default), `"sans"`, `"serif"` — aligned with CLCD `label` `family:` |
| `fontStyle` | `(family, size)` — same as `fontFamily` + `fontSize` |
| `textAlign` | `"left"`, `"center"`, `"right"`, `"start"`, `"end"` |
| `textBaseline` | `"top"`, `"middle"`, `"alphabetic"`, `"bottom"` |
| `fontSize` | Positive number — pixels |

Unknown `fontFamily` token → runtime error (`allowed: mono, sans, serif`).

---

## CLCD symbols — `drawSymbol`, `symbolSize`, `symbolStyle`

Reuse the same symbol names as `comp [clcd]`. See the searchable [symbol catalog](clcd-symbols.md).

### Font Awesome icons (3 arguments)

```logts
styleFill("00ff00")
symbolSize(28)
symbolStyle(1)
drawSymbol(20, 10, "battery")
```

- Color: `styleFill` (like `drawText`).
- `symbolStyle` optional — default is the catalog `defaultStyle` for that icon.
- FA `symbolSize`: target height in px (default **22**, range **8–64**).

### Canvas symbols (4 arguments — `bits` required)

```logts
style("334455", "00ff00")
symbolSize(44)
drawSymbol(60, 10, "digit7", "1101010")
drawSymbol(80, 10, "dp", "1")
drawSymbol(90, 10, "colon", "10")
```

| Symbol | `bits` string |
|--------|----------------|
| `digit7` | 7 characters `0` or `1` (segments) |
| `digit14` | 7 or 14 characters |
| `dp` | 1 character |
| `colon` | 2 characters (top dot, bottom dot) |

Colors: segment/dot **on** → `styleFill`; **off** → `styleStroke` (same as CLCD `color` / `bgColor`).

Canvas `symbolSize`: scales to target height (default native heights: `digit7` **44**, `colon` **32**, `dp` **8**; range **8–120**).

### Runnable symbol demo

```logts-play
inline [canvas] .icons:

    panel() {
        styleFill("00ff00")
        symbolSize(26)
        drawSymbol(12, 12, "wifi")
        style("222222", "ff6600")
        symbolSize(44)
        drawSymbol(50, 8, "digit7", "1000001")
        style("000000", "aaaaaa")
        drawSymbol(100, 20, "colon", "10")
    }

:

comp [canvas] .symDemo:
    on: 1
    width: 130
    height: 60
    bgColor: ^000000
    .icons { }
:

1wire go = 1
.symDemo:{
    renderer { panel() }
    set = go
}
```

---

## Runnable showcase

```logts-play
inline [canvas] .showcase:

    demo() {
        style(0, "223344")
        drawRect(0, 0, 200, 120)

        style("ffffff", "ff6600", 2)
        drawCircle(50, 60, 25)

        styleStroke("00ffaa", 3)
        drawLine(90, 20, 180, 100)

        styleFill("ffffff")
        fontStyle("sans", 16)
        textAlign("center")
        textBaseline("bottom")
        drawText(100, 115, "builtins")
    }

:

comp [canvas] .showCanvas:
    on: 1
    width: 200
    height: 120
    bgColor: ^000000
    .showcase { }
:

1wire run = 1
.showCanvas:{
    renderer { demo() }
    set = run
}
```

---

## Composition — methods calling methods

```logts-play
inline [canvas] .primitives:

    tile(x, y, color) {
        style(0, color)
        drawRect(x, y, 16, 16)
    }

    grid() {
        tile(10, 10, "ff0000")
        tile(30, 10, "00ff00")
        tile(50, 10, "0000ff")
    }

:

comp [canvas] .tiles:
    on: 1
    width: 80
    height: 40
    .primitives { }
:

1wire go = 1
.tiles:{
    renderer { grid() }
    set = go
}
```

---

## Runtime errors

Invalid colors, unknown methods, or bad argument counts are **logged and the failing operation is skipped** — execution continues with the next statement.

---

## Related pages

| Page | Content |
|------|---------|
| [inline-canvas.md](inline-canvas.md) | Method syntax and language |
| [comp-canvas.md](comp-canvas.md) | Device and `renderer` block |
