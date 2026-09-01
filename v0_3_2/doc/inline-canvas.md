# Inline canvas — `inline [canvas]`

`inline [canvas]` defines **reusable drawing methods** for HTML5 Canvas 2D. It is a **definition only** — like `inline [logic]` or `inline [asm]` — not executed until wired through [`comp [canvas]`](comp-canvas.md).

Drawing builtins (`drawRect`, `style`, …) are documented in [canvas-builtins.md](canvas-builtins.md).

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Role** | Definition layer — methods with bodies |
| **Execution** | None at inline level; runtime via [comp-canvas.md](comp-canvas.md) `renderer { }` block |
| **Method syntax** | `name(args) { statements }` — braces **required** |
| **Body** | Assignments, method calls, draw builtins |
| **Colors in body** | `"rrggbb"` / `"rrggbbaa"` strings, or `0` / `"0"` to skip a pass |
| **`#`** | Line comment only — **not** a color prefix |
| **Composition** | Methods may call other methods in the same inline |
| **Doc** | `doc(inline.canvas)`, `doc(.myRenderer)` |

---

## Architecture

```text
inline [canvas] .gameRenderer     comp [canvas] .myCanvas
  drawBg(...) { ... }      -->    .gameRenderer { }
  drawPlayer(...) { ... }         renderer { drawPlayer(...) }
  (definition only)               (runtime — see comp-canvas.md)
```

---

## Declaration

```logts
inline [canvas] .gameRenderer:

    drawBg(x, y, w, h, color) {
        style(0, color)
        drawRect(x, y, w, h)
    }

    drawPlayer(cx, cy, label) {
        style("000000", "0000ff", 2)
        drawCircle(cx, cy, 12)
        styleFill("ffffff")
        fontSize(12)
        textAlign("center")
        textBaseline("middle")
        drawText(cx, cy - 18, label)
    }

:
```

| Rule | Detail |
|------|--------|
| **Kind** | `inline [canvas]` |
| **Name** | Dot reference (e.g. `.gameRenderer`) |
| **End** | Closing `:` on its own line |
| **Methods** | Name + parameter list + `{` body `}` |
| **Parameters** | By-value; locals may shadow parameter names |

---

## Method body language

| Feature | Supported |
|---------|-----------|
| **Literals** | Integers (`1`, `34`), floats (`1.3`), strings (`"hello"`) |
| **Variables** | Locals via `name = expr` |
| **Arithmetic** | `+ - * /` and parentheses |
| **Calls** | Draw builtins and other methods in the same inline |
| **Control flow** | `if` / `else` / `else if` (JS-style); `&&` `||` `!` in conditions; `for` / `while` loops |
| **Conditions** | Comparisons `==` `!=` `<` `>` `<=` `>=` on numbers; `==` / `!=` on strings (e.g. `/ascii` params); truthiness `if (name)` / `if (!name)` |
| **Comments** | `#` to end of line |

**Not supported:** `for`, `while`, `and`/`or`/`not` keywords (use `&&` `||` `!`).

### Example — arithmetic and locals

```logts
inline [canvas] .demo:

  drawBox(x, y, w, h, color) {
      pad = 2
      innerW = w - pad * 2
      innerH = h - pad * 2
      style(0, color)
      drawRect(x + pad, y + pad, innerW, innerH)
  }

:
```

---

## Colors in method bodies

| Form | Meaning |
|------|---------|
| `"rrggbb"` | Opaque color (6 hex digits, no `#`) |
| `"rrggbbaa"` | Color with alpha (8 hex digits) |
| `0` or `"0"` | Transparent — skip fill or stroke for that draw call |

Component attribute `bgColor` on `comp [canvas]` uses the usual `^rrggbb` form (see [comp-canvas.md](comp-canvas.md)).

---

## Conditional draw (`if` / `else`)

Only inside **method bodies** (not directly in `renderer { }`).

```logts
drawHud(score, hi, playerName) {
    styleFill("ffffff")
    fontSize(14)
    drawText(10, 10, "Score")

    if (score > hi) {
        styleFill("ffff00")
        drawText(10, 28, "NEW HI!")
    } else if (score == 0) {
        styleFill("888888")
        drawText(10, 28, "—")
    } else {
        styleFill("aaaaaa")
        drawText(10, 28, "keep going")
    }

    if (playerName) {
        drawText(10, 46, playerName)
    }
    if (!playerName) {
        styleFill("ff0000")
        drawRect(0, 0, 8, 8)
    }

    if (score > 0 && playerName == "Ada") {
        symbolSize(22)
        drawSymbol(120, 10, "check")
    }
}
```

| Condition | Rules |
|-----------|--------|
| **Numbers** | `==` `!=` `<` `>` `<=` `>=`; truthy when `!= 0` |
| **Strings** (e.g. `/ascii` wire args) | `==` / `!=`; truthy when non-empty; `!name` when empty |
| **Logic** | `&&` `||` `!` and parentheses — same precedence as JS |

---

## Loops (`for` / `while`)

Only inside **method bodies** (not directly in `renderer { }`). Nested loops are allowed. Use **`break`** / **`continue`** inside loops (JS semantics).

```logts
drawStrip(n, color) {
    for (i = 0; i < n; i++) {
        style(0, color)
        drawRect(i * 18, 10, 16, 16)
    }
}

drawGrid(cols, rows, tileW, tileH) {
    for (row = 0; row < rows; row = row + 1) {
        for (col = 0; col < cols; col++) {
            style(0, "aaffaa")
            drawRect(col * tileW, row * tileH, tileW - 2, tileH - 2)
        }
    }
}

scanRows(rows) {
    y = 0
    row = 0
    while (row < rows) {
        drawRect(0, y, 40, 8)
        y = y + 12
        row++
    }
}
```

| Feature | Rules |
|---------|--------|
| **`for`** | C-style `for (init; cond; step)` — each clause optional (`for (;;)` runs until cap) |
| **`while`** | `while (cond) { … }` — same conditions as `if` |
| **Init / step** | Assign (`i = 0`, `i = i + 1`) or postfix `i++` / `i--` |
| **Postfix only** | `i++` and `i--` as statement or in `for` step — prefix `++i` / `--i` not allowed |
| **`break` / `continue`** | Only inside `for` / `while`; `break` exits innermost loop, `continue` next iteration (`for` runs step) |
| **Safety cap** | Max **10 000** iterations per loop — runtime error if exceeded |

---

## Minimal parse example

```logts-play
inline [canvas] .shapes:

    dot(x, y) {
        styleFill("00ff00")
        drawCircle(x, y, 4)
    }

:
```

---

## Scene with multiple methods

```logts-play
inline [canvas] .scene:

    frame(x, y, w, h) {
        style("ffffff", 0, 1)
        drawRect(x, y, w, h)
    }

    label(x, y, text) {
        styleFill("aaffaa")
        fontSize(14)
        textAlign("left")
        textBaseline("top")
        drawText(x, y, text)
    }

    drawAll() {
        frame(10, 10, 100, 60)
        label(14, 14, "Canvas")
    }

:

comp [canvas] .panel:
    on: 1
    width: 160
    height: 100
    bgColor: ^000000
    .scene { }
:

1wire go = 1
.panel:{
    renderer { drawAll() }
    set = go
}
```

Use **Load & Run** — the Devices panel shows a 160×100 canvas with a green label on black background.

---

## Allow policy

Restrict with `Allow` / `NotAllow` like other inline kinds:

```logts
Allow inline.type{canvas}
Allow comp.type{canvas}
```

---

## Related pages

| Page | Content |
|------|---------|
| [comp-canvas.md](comp-canvas.md) | Device, attrs, `renderer`, `set` / `draw` / `busy` |
| [canvas-builtins.md](canvas-builtins.md) | `drawRect`, `style`, `drawText`, … |
| [component-color-attributes.md](component-color-attributes.md) | `^rrggbb` on component attrs |
