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
| `drawText(x, y, text)` | Filled text (current fill + font) |
| `fontSize(n)` | Font size in pixels (default **14**) |
| `fontFamily("mono"\|"sans"\|"serif")` | Text family (default **`mono`**, same tokens as CLCD `label`) |
| `fontStyle(family, size)` | Set family and size in one call |
| `textAlign("left"\|"center"\|"right"\|"start"\|"end")` | Default `left` |
| `textBaseline("top"\|"middle"\|"alphabetic"\|"bottom")` | Default `alphabetic` |

Default font is **`mono`** (`Consolas`, `Courier New`, monospace stack).

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
