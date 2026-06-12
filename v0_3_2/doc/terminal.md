# Terminal component

`comp [terminal]` is a **scrollable text console**. Text is appended as a stream; the component manages cursor position, new lines, word wrapping, scrolling, and optional line numbers.

Unlike [lcd.md](lcd.md), text is not written at fixed coordinates — characters are appended sequentially.

Signature: `doc(comp.terminal)`.

---

## Syntax

```
comp [terminal] .name:
  rows: 20
  columns: 80
  fontSize: 12
  wordWrap: 1
  lineNumbers: 0
  cursorStyle: 0
  color: ^0f0
  nl
  :
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `rows` | int | 20 | Number of visible rows |
| `columns` | int | 80 | Maximum characters per row before wrapping |
| `fontSize` | int | 12 | Font size in the devices panel |
| `wordWrap` | 0/1 | 1 | Wrap text when reaching column limit |
| `lineNumbers` | 0/1 | 0 | Show line numbers (visual only) |
| `cursorStyle` | 0/1/2 | 0 | Cursor display mode (see below) |
| `color` | hex | `#0f0` | Text (and cursor) color |
| `nl` | flag | off | Line break after terminal in devices panel |

### `cursorStyle`

| Value | Behavior |
|-------|----------|
| `0` | No cursor |
| `1` | Blinking underscore `_` at the next cell after the last character |
| `2` | Solid block cursor `█` (full cell, same color as text, always visible) |

The cursor is drawn at the **next position** after the last appended character. It scrolls with the viewport when the buffer scrolls.

### `color` and `nl`

- `color: ^f3f` — hex color for terminal text and cursor (same as [led.md](led.md) / [seven-seg.md](seven-seg.md)).
- `nl` — forces the next device on the panel to start on a new row (same as `comp [led]` / `comp [switch]`).

Add `on: 1` for **level-triggered** property blocks (execute whenever `set` is `1` on each run). Default is **rising edge** on `set` (0→1).

---

## Visual behavior

The terminal renders in the **devices panel** when you Run (monospace `pre` inside a framed `div`).

```
+----------------------+
| Hello                |
| World                |
|                      |
+----------------------+
```

With `lineNumbers: 1`:

```
+----------------------+
| 1 | Hello            |
| 2 | World            |
|                      |
+----------------------+
```

Line numbers are visual only — they are not part of the stored text.

The panel size is fixed at `columns × rows` character cells (it does not grow as text is appended).

---

## Cursor example

```logts-play
comp [terminal] .term:
  rows: 3
  columns: 20
  cursorStyle: 2
  color: ^6f6
  on: 1
  :

.term:{
  append = ^48656C6C6F
  set = 1
}
```

Display: `Hello█` (block cursor after the last character).

Use `cursorStyle: 1` for a blinking underscore cursor.

---

## Pins

| Pin | Role |
|-----|------|
| `set` | Trigger block (rising edge by default; use `on: 1` for level) |
| `append` | Append one or more bytes (8+ bits; wider values = consecutive bytes) |
| `newline` | Move cursor to next line |
| `clear` | Erase all contents |

---

## Appending text

```logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{
  append = ^41
  set = 1
}
```

Result: `A`

Multiple bytes:

```logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{
  append = ^414243
  set = 1
}
```

Result: `ABC`

---

## New line and clear

```logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{ append = ^48656C6C6F
  set = 1 }
.term:{ newline = 1
  set = 1 }
.term:{ append = ^576F726C64
  set = 1 }
```

Result:

```
Hello
World
```

Clear:

```logts-play
.term:{
  clear = 1
  set = 1
}
```

---

## Word wrap

With `wordWrap: 1` and `columns: 10`, appending `HelloWorldABC` produces:

```
HelloWorld
ABC
```

---

## Scrolling

When content exceeds `rows`, the display shows the **last** `rows` lines (scroll up).

Example: `rows: 3` with lines `Line1` … `Line4` visible as `Line2`, `Line3`, `Line4`.

---

## Runnable — Hello World

```logts-play
comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :

.term:{
  append = ^48656C6C6F20576F726C64
  set = 1
}
```

Display: `Hello World`

---

## Runnable — Log output

```logts-play
comp [terminal] .log:
  rows: 8
  columns: 60
  lineNumbers: 1
  on: 1
  :

.log:{ append = ^426F6F74206F6B
  set = 1 }
.log:{ newline = 1
  set = 1 }
.log:{ append = ^435055207265616479
  set = 1 }
```

---

## Common errors

| Error | Cause |
|-------|-------|
| `append expects at least 8 bits` | Invalid append value |
| `rows must be greater than 0` | Invalid `rows` |
| `columns must be greater than 0` | Invalid `columns` |
| `fontSize must be greater than 0` | Invalid `fontSize` |
| `cursorStyle must be 0, 1, or 2` | Invalid `cursorStyle` |
| `Unknown terminal property` | Invalid property name |

---

## vs LCD

| Feature | terminal | lcd |
|---------|----------|-----|
| Stream append | yes | no |
| Automatic cursor | yes | no |
| Word wrap | yes | no |
| Scroll | yes | no |
| Fixed coordinates | no | yes |
| Character grid | yes | yes |

Use **terminal** for logs, serial output, debugging, and console-style applications.  
Use **lcd** when text must be written to specific screen positions.

---

## Related

- [lcd.md](lcd.md) — pixel matrix at fixed coordinates
- [debug.md](debug.md) — `probe` / `show`
- [future-component-ideas.md](future-component-ideas.md) — C6 Text terminal
