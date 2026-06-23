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
| `append` | Insert bytes at cursor; cursor moves forward after each character |
| `insert` | Insert bytes at cursor; cursor stays on the same column |
| `newline` | Move cursor to next line |
| `clear` | Erase all contents |
| `backDelete` | 2-bit mode: delete backward relative to cursor (see below) |
| `frontDelete` | 2-bit mode: delete forward relative to cursor |
| `moveCursor` | 3-bit direction: `1` left · `2` right · `3` up · `4` down |

---

## Line editing (mini-shell)

The terminal keeps an internal cursor (`cursorLine`, `cursorCol`). Use `cursorStyle: 1` or `2` to show it.

### `append` vs `insert`

Both insert at the cursor and push existing text to the right.

| Pin | After each character | Example: `Hel|lo` + `X` |
|-----|-------------------|-------------------------|
| `append` | `cursorCol++` | `HelX|lo` |
| `insert` | column unchanged | `Hel|Xlo` |

### `backDelete` / `frontDelete` (modes 0–3)

| Mode | `backDelete` | `frontDelete` |
|------|--------------|---------------|
| `0` | noop | noop |
| `1` | one char left (not past line start) | one char at cursor |
| `2` | one char left, or join with previous line at col 0 | one char at cursor, or join with next line at EOL |
| `3` | delete from line start to cursor | delete from cursor to line end |

### `moveCursor` (0–4)

`0` noop · `1` left · `2` right · `3` up · `4` down (column clamped to target line length).

În **script** (property blocks, fire), valorile numerice >1 se scriu ca literal zecimal cu backslash (`\2`, `\3`) sau binar (`10`, `11`, `100`).  
`2`, `3`, `4` fără `\` nu sunt literali valizi în expresii. În **atributele** componentei (`rows: 8`, `cursorStyle: 2`) zecimalul simplu este permis.

### Example — keyboard + backspace

`MUX(sel, dataFor0, dataFor1)` — `sel=0` → `dataFor0`, `sel=1` → `dataFor1`.  
Ex.: `MUX(isBS, 1, 0)` cu `isBS=1` returnează `0`.

**Atenție la `moveCursor` cu `MUX`:** `MUX(sel, a, b)` returnează `b` când `sel=1`. Pentru lanț „dacă `isL` → stânga, altfel dacă `isR` → dreapta…”, direcțiile se pun pe ramura `sel=1`, imbricate spre stânga (vezi exemplul line editor mai jos). O ordine inversată (`MUX(isL, \1, MUX(isR, \2, …))`) inversează săgețile și, la taste normale, forțează `moveCursor` stânga înainte de fiecare `append` — cursorul vizual pare blocat.

| Intenție | Expresie `moveCursor` (un singur rând) |
|----------|----------------------------------------|
| Corect | `MUX(isL, MUX(isR, MUX(isU, MUX(isD, 0, \4), \3), \2), \1)` |
| Greșit (săgeți inversate) | `MUX(isL, \1, MUX(isR, \2, MUX(isU, \3, MUX(isD, \4, 0))))` |

La varianta greșită, fiecare caracter tipărit execută `moveCursor` stânga *înainte* de `append` (ordinea pinilor în terminal), deci cursorul vizual pare blocat după prima tastă.

```logts-play wave
comp [keyboard] .kbd:
  allowBackspace
  on: 1
  :

comp [terminal] .term:
  rows: 8
  columns: 40
  cursorStyle: 2
  on: 1
  :

8wire code = .kbd
1wire isBS = EQ(code, 00001000)
1wire isLF = EQ(code, 00001010)

.term:{
  backDelete = MUX(isBS, 0, \1)
  append = MUX(OR(isBS + isLF), .kbd, 00000000)
  newline = isLF
  set = .kbd:valid
}
```

### Example — keyboard + arrows + Delete (line editor)

```logts-play wave
comp [keyboard] .kbd:
  allowBackspace
  allowArrows
  allowDelete
  allowEnter
  on: 1
  :

comp [terminal] .term:
  rows: 8
  columns: 40
  cursorStyle: 2
  on: 1
  :

8wire code = .kbd
1wire isBS = EQ(code, 00001000)
1wire isLF = EQ(code, 00001010)
1wire isDel = EQ(code, 10000100)
1wire isL = EQ(code, 10000000)
1wire isR = EQ(code, 10000001)
1wire isU = EQ(code, 10000010)
1wire isD = EQ(code, 10000011)

.term:{
  backDelete  = MUX(isBS, 0, \2)
  frontDelete = MUX(isDel, 0, \1)
  # MUX: isL=1→\1 left, isR=1→\2 right, isU=1→\3 up, isD=1→\4 down
  moveCursor  = MUX(isL, MUX(isR, MUX(isU, MUX(isD, 0, \4), \3), \2), \1)
  append      = MUX(OR(isBS + isLF + isDel + isL + isR + isU + isD), .kbd, 00000000)
  newline     = isLF
  set         = .kbd:valid
}
```

Cu `newline = isLF`, terminalul folosește linii separate în buffer. `backDelete` mod `\1` se oprește la începutul liniei; mod `\2` unește linia curentă cu cea anterioară la `col 0` (comportament așteptat pentru editor multi-linie). Fără `newline` (doar `append = .kbd`), Enter inserează caracterul LF în text și `backDelete` mod `\1` îl șterge ca orice alt byte.

Pentru mai multe semnale 1-bit în `OR`, concatenează cu `+` într-un singur argument: `OR(isBS + isLF + isDel + …)` — `+` alătură biții, iar `OR` cu un operand reduce la 1 dacă vreun bit e `1`.

Arrow codes on `:get` are `^80`–`^83`; forward Delete is `^84`. See [keyboard.md](keyboard.md#extended-keyboard-codes-128132).

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

### Byte literals (`^hex`) — ASCII reference

`append` takes **8-bit values** (one or more bytes in a single `^…` literal). Each pair of hex digits is one byte. Common printable ASCII:

| `^hex` | Character | Notes |
|--------|-----------|--------|
| `^20` | (space) | |
| `^21` | `!` | |
| `^30` … `^39` | `0` … `9` | digits |
| `^41` … `^5A` | `A` … `Z` | uppercase |
| `^61` … `^7A` | `a` … `z` | lowercase |
| `^0A` | LF | line feed — prefer `newline = 1` for new lines |
| `^0D` | CR | carriage return |

Examples: `^41` → `A`, `^48` → `H`, `^48656C6C6F` → `Hello` (five bytes).

Wider literals append **consecutive bytes** left to right: `^414243` → `ABC`.

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

## Queue / stack → terminal (wave)

LogTScript is a **digital logic simulator**, not a top-to-bottom script. After **Load & Run**, bytes stay in the queue/stack until **you** trigger the next step — typically with `comp [key]` on the panel. Use **wave** propagation (editor default); see [signal-propagation.md](signal-propagation.md).

**Pattern**

1. **Load & Run** — push bytes into the queue/stack (`on: 1` + `set = 1` blocks run once).
2. **One drain cycle** in source — three property blocks, all with `set = .next` (rising edge on the key):
   - `get >= c` / `top >= c` (peek)
   - `append = c` on the terminal (**no** `on: 1` on `.term` — default is edge-triggered)
   - `pop = 1`
3. Each **button press** (`0→1` on `.next`) runs that cycle once → one new character on the terminal.

`MODE ZSTATE` is **not required** here — it is for tristate multi-driver buses ([zstate.md](zstate.md)). User control comes from the **key** + wave edges, not from ZSTATE.

Verified in tests **1573** (queue → `Hello`) and **1574** (stack → `CBA`).

---

## Runnable — FIFO queue → terminal (key, wave)

**Load & Run**, then press **Next** once per character.

```logts-play wave
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.q:{ push = ^48
  set = 1 }
.q:{ push = ^65
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6F
  set = 1 }

8wire c
.q:{ get >= c
  set = .next }
.term:{ append = c
  set = .next }
.q:{ pop = 1
  set = .next }
```

After five presses: `Hello`. Pressing again on an empty queue errors (`Queue is empty`).

---

## Runnable — LIFO stack → terminal (key, wave)

```logts-play wave
comp [stack] .s:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.s:{ push = ^41
  set = 1 }
.s:{ push = ^42
  set = 1 }
.s:{ push = ^43
  set = 1 }

8wire c
.s:{ top >= c
  set = .next }
.term:{ append = c
  set = .next }
.s:{ pop = 1
  set = .next }
```

Three presses: `C`, then `CB`, then `CBA`.

Use `top >=` / `get >=` in a **separate** block **before** `pop` — never peek + `pop` in the same block.

---

## Runnable — one byte at Load & Run (legacy-style)

For a quick demo without pressing a key: same drain blocks with `set = 1` and `on: 1` on the terminal — only **one** drain cycle. Tests **1571** / **1572**.

```logts-play
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  on: 1
  :

.q:{ push = ^48
  set = 1 }
.q:{ push = ^65
  set = 1 }

8wire c
.q:{ get >= c
  set = 1 }
.term:{ append = c
  set = 1 }
.q:{ pop = 1
  set = 1 }
```

Display: `H` only.

---

## Why not copy several drain blocks with `on: 1`?

If you paste the drain cycle **multiple times** and use `on: 1` + `set = 1` on the terminal (all at **Load & Run**), you get wrong text (`Heellllooooo` instead of `Hello`).

**Cause:** `on: 1` means *level-triggered* — whenever the queue changes, wave propagation **re-evaluates every** block whose `set` is still `1`. After the second `pop`, the first `.term:{ append = c }` block is still “active” and runs again.

**What “do not re-run consumed terminal blocks” would mean (engine idea, not implemented):** mark a drain/append block as *done* after it has fired for the current queue front, so a later `pop` does not wake old append blocks. Today the fix is **one drain in source + rising edge per press** (key), not many level-triggered copies.

| Anti-pattern | Use instead |
|--------------|-------------|
| Several drain copies + `on: 1` at RUN | One drain + `set = .next` (key) |
| `get >=` + `pop` in one block | Separate blocks: peek, append, pop |
| Re-assign `8wire c = .q:get` each step | One `8wire c` + `get >= c` |

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
