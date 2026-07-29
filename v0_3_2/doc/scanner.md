# Scanner component

`comp [scanner]` is a **panel input** for a short ASCII string (barcode / ID / PIN style). You type in the devices panel, then press **Scan** or **Enter**. The component exposes the packed string on `:get`, the useful length on `:size`, and a one-shot `:valid` pulse on commit.

Signature: `doc(comp.scanner)`. See also [keyboard.md](keyboard.md) (per-key 8-bit stream) and [wire-literals.md](wire-literals.md) (ASCII packing).

---

## Syntax

```
comp [scanner] .name:
  length: 8
  text: 'BC'
  color: ^808080
  bgColor: ^101010
  focusColor: ^2ecc71
  focusBgColor: ^181818
  onlyDigits
  nl
  :
```

Minimal (8 characters, defaults):

```
comp [scanner] .scan::
```

---

## Behaviour

| Step | What happens |
|------|----------------|
| Load | `:get` is all zeros (`length×8` bits); `:size` is `0`; `:valid` is `0` |
| Typing | Characters go into the visible field; **at most `length` characters** (`maxlength` on the input — you cannot type or paste more) |
| **Scan** or **Enter** | Commit: pack string → update `:get` and `:size`, pulse `:valid` `1` then `0` |
| After commit | Field is **cleared**; focus **stays** in the input so you can scan the next code immediately |

### Packing (`:get`)

Same rule as wire strings `"Hello"`:

- Each character → **8 bits** (code point 0–255)
- Packed **MSB-first** (first character = leftmost byte)
- Wire width is always **`length × 8`**
- If the string is shorter than `length`, remaining bytes are **NUL** (`00000000`) on the right

### `:size`

Unsigned count of **useful** characters (before NUL padding), from `0` to `length`.

Width is chosen so values `0…length` fit, using the same bit-count helper as other components (`Math.clz32`), e.g. `length: 5` → **3** bits for `:size`.

### `:valid`

Exactly like `keyboard`: after a successful commit, `:valid` goes `1` for the update wave, then back to `0`. Use it to clock a queue, FIFO, or PLC edge.

### `onlyDigits`

When set, non-digit characters are stripped from the field (and on commit). Digits are still stored as **ASCII** (`'5'` → `00110101`), not as nibble values.

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `length` | integer | `8` | Max characters (`1…32`). `:get` width = `length×8` |
| `text` | string | `''` | Panel label |
| `color` | hex | `^808080` | Border / label when unfocused (same idea as keyboard) |
| `bgColor` | hex | `^101010` | Panel / field background when unfocused |
| `focusColor` | hex | `^2ecc71` | Border when the field is focused |
| `focusBgColor` | hex | `^181818` | Background when focused |
| `onlyDigits` | flag | off | Accept digits only |
| `nl` | flag | off | Newline after the control |

---

## Pins and pouts

| Name | Direction | Width | Role |
|------|-----------|-------|------|
| — | pins | — | **None** — panel-driven only |
| `get` | pout | `length×8` | Packed ASCII buffer (NUL-padded) |
| `size` | pout | enough for `0…length` | Useful character count |
| `valid` | pout | `1` | Commit pulse |

There is no `set` / `data` / `value` pin: scripts **read** the scanner; they do not write into it.

---

## Compared to keyboard

| | `keyboard` | `scanner` |
|--|------------|-----------|
| `:get` | 8 bits (last key) | `length×8` (whole string) |
| When it updates | every accepted key | on **Scan** / **Enter** |
| `:valid` | per key | per scan |
| Buffer on panel | no (hidden) | yes (visible field) |

---

## Examples

### Empty after Load & Run

```logts-play
comp [scanner] .scan:
  length: 5
  text: 'BC'
  color: ^808080
  bgColor: ^101010
  nl
  :

40wire code = .scan:get
3wire n = .scan:size
1wire v = .scan:valid
show(code)
show(n)
show(v)
```

Load & Run: `code` is 40 zeros, `n` is `000`, `v` is `0`. Then type in the panel and press **Scan** to update.

### Full buffer — `"Hello"`

```logts-play
comp [scanner] .scan:
  length: 5
  text: 'BC'
  nl
  :

40wire code = .scan:get
3wire n = .scan:size
show(code)
show(n)
```

After Load & Run, type `Hello` and press **Scan** (or Enter): `n` becomes `101` (5), and `code` matches wire string `"Hello"` (40 bits).

### Short string — right-pad with NUL

```logts-play
comp [scanner] .scan:
  length: 5
  text: 'ID'
  nl
  :

40wire code = .scan:get
3wire n = .scan:size
show(code)
show(n)
```

Type `AB` and Scan: useful length `2` (`n` = `010`); `:get` is `A` `B` `\0` `\0` `\0`.

### Digit PIN

```logts-play
comp [scanner] .pin:
  length: 4
  onlyDigits
  text: 'PIN'
  focusColor: ^0f0
  nl
  :

32wire code = .pin:get
3wire n = .pin:size
show(code)
show(n)
```

Type `9081` and Scan: four ASCII digit bytes on `code`; `n` = `100` (4). Letters are ignored while typing / on commit.

### Empty commit

```logts-play
comp [scanner] .scan:
  length: 3
  text: 'X'
  nl
  :

24wire code = .scan:get
2wire n = .scan:size
show(code)
show(n)
```

Press **Scan** with an empty field: `code` stays all zeros, `n` is `00`.

### Colours like keyboard

```logts-play
comp [scanner] .scan:
  length: 8
  text: 'Tag'
  color: ^0af
  bgColor: ^111
  focusColor: ^ff0
  focusBgColor: ^222
  nl
  :

64wire code = .scan:get
4wire n = .scan:size
show(n)
```

Load & Run: `n` is `0000`. Focus the field to see focus colours; Scan after typing to update `code` / `n`.

### Feed a FIFO on `:valid`

```logts-play
comp [scanner] .scan:
  length: 4
  text: 'In'
  nl
  :

comp [queue] .q:
  width: 32
  length: 4
  on: 1
  nl
  :

32wire payload = .scan:get
.q:{
  push = payload
  set = .scan:valid
}

3wire used = .q:size
show(used)
```

Load & Run: queue empty (`used` = `000`). Each panel **Scan** pulses `:valid` and pushes the 32-bit packed string into the queue.

### Two scanners

```logts-play
comp [scanner] .a:
  length: 2
  text: 'A'
  :

comp [scanner] .b:
  length: 2
  text: 'B'
  nl
  :

16wire xa = .a:get
16wire xb = .b:get
2wire sa = .a:size
2wire sb = .b:size
show(sa)
show(sb)
```

Independent buffers and sizes. Scan each field separately.

---

## Related

- [keyboard.md](keyboard.md) — one ASCII byte per key + `:valid`
- [wire-literals.md](wire-literals.md) — `"Hello"` packing
- [queue.md](queue.md) — typical consumer for `:valid`
- [interactive-components.md](interactive-components.md) — panel inputs overview
- [components.md](components.md) — catalog
