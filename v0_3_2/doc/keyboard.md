# KEYBOARD

A keyboard is an interactive input component that captures key presses from the browser and emits values into the simulation.

Unlike a terminal, a keyboard does not display typed characters.

Its purpose is to generate input events that can be connected to queues, stacks, terminals, CPUs, UARTs, or other components.

Index: [interactive-components.md](interactive-components.md) · Signature: `doc(comp.keyboard)`

---

## Syntax

```logts
comp [keyboard] .name:
  label: 'Keyboard'
  color: ^808080
  bgColor: ^101010
  focusColor: ^2ecc71
  focusBgColor: ^181818
  onlyDigits
  allowEnter
  codesAccepted = .lutRef
  showCode: 0
  pulseColor: ^ff0
  nl
  :
```

Minimal form:

```logts
comp [keyboard] .name::
```

---

## Behavior

A keyboard captures key presses only while **focused**.

| Action | Result |
|--------|--------|
| Click component | focused (fast blinking cursor after label) |
| Click elsewhere | unfocused |

When focused, key presses are emitted into the simulation. The component does not display the characters that were typed.

On **mobile**, focus uses a hidden field so the OS virtual keyboard opens:

| Mode | Element | Mobile action key |
|------|---------|-------------------|
| default | `<input>` | **Done** (no Enter in simulation) |
| `allowEnter` | `<textarea>` | **Enter** / return (emits LF, code 10) |

With `onlyDigits`, `inputmode="numeric"` is set (reliable on `<input>`; on `<textarea>` the OS may still show a full keyboard). On desktop, the same field receives physical key presses while focused.

---

## Outputs

| Pout | Width | Description |
|------|-------|-------------|
| `get` | 8 | Last emitted **ASCII** code (8 bit) |
| `valid` | 1 | Pulse `1` for one propagation cycle when a key is accepted, then `0` |

Wire property blocks use `set = .kbd:valid` to trigger `push` / `append` on each key.

In **Wave** propagation, after each accepted key the engine always re-evaluates blocks whose `set` references `.kbd` (including `:valid`), even when other wires (e.g. `entryNew`) were updated in the same step — so `comp [reg]` / `terminal` blocks on `valid` fire reliably.

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `label` | string | `Keyboard` | Display label |
| `color` | color | `^808080` | Border when unfocused |
| `bgColor` | color | `^101010` | Background when unfocused |
| `focusColor` | color | `^2ecc71` | Border when focused |
| `focusBgColor` | color | `^181818` | Background when focused |
| `onlyDigits` | flag | (no) | Accept only `0`–`9` (still emits 8-bit ASCII); mobile `inputmode=numeric` |
| `allowEnter` | flag | (no) | Accept Enter (LF, code 10); mobile uses `<textarea>` with return key |
| `codesAccepted` | LUT ref | (no) | Whitelist of allowed keys via `comp [lut]` (`codesAccepted = .lut`) |
| `showCode` | integer | `0` | Display last `:get` code next to label (`0` off, `1` hex, `2` decimal) |
| `pulseColor` | color | (no) | Brief color flash on border/label after each accepted key |
| `nl` | flag | (no) | New line after component |

---

## Key codes (8-bit ASCII)

| Key | Decimal | Binary (8 bit) | Notes |
|-----|---------|----------------|-------|
| `A` | 65 | `01000001` | |
| `5` | 53 | `00110101` | |
| Enter | 10 | `00001010` | Requires `allowEnter` |

---

## `onlyDigits` — filter, not encoding

`onlyDigits` accepts only keys `0`–`9` (and Enter when `allowEnter` is also set). **`:get` is always 8-bit ASCII** — e.g. `5` → `00110101` (character `'5'`), not `0101`.

For the numeric value `0`–`9` in logic (queue, reg, ALU), use the low nibble:

```logts
4wire digit = .kbd.4/4
@ same as .kbd.4-7 or .kbd:get.4/4
```

For digits `0`–`9`, `.4/4` equals the decimal digit value.

---

## `codesAccepted` — whitelist via LUT

Syntax (binding, like ALU `lut = .ref`):

```logts
codesAccepted = .lutName
```

When `codesAccepted` is set, **only the LUT** decides which keys are accepted (including Enter). `onlyDigits` and `allowEnter` are ignored for filtering; `onlyDigits` still sets mobile `inputmode=numeric`.

The referenced `comp [lut]` must have **`depth: 1`** or **`depth: 8`**; any other depth errors at elaboration:

`codesAccepted requires lut with depth 1 or 8`

| LUT `depth` | Mode | Meaning |
|-------------|------|---------|
| `1` | **bitmap** | Address = ASCII code (0…255); value `1` = allowed |
| `8` | **values** | Each table value is a full 8-bit ASCII code allowed (non-`fillwith` entries) |

### Bitmap (`depth: 1`) — digits + Enter

```logts
comp [lut] .allowed:
  depth: 1
  length: 256
  fillwith: 0
  = data {
    ^30 - ^39: 1
    ^0a: 1
  }
  :

comp [keyboard] .kbd:
  codesAccepted = .allowed
  on: 1
  :
```

Enter is accepted only if `^0a: 1` is in the LUT — `allowEnter` does not add LF automatically when `codesAccepted` is active.

### Values (`depth: 8`) — explicit code list

```logts
comp [lut] .digitKeys:
  depth: 8
  length: 10
  fillwith: 00000000
  = data {
    0: 00110000
    1: 00110001
    2: 00110010
    3: 00110011
    4: 00110100
    5: 00110101
    6: 00110110
    7: 00110111
    8: 00111000
    9: 00111001
  }
  :

comp [keyboard] .kbd:
  codesAccepted = .digitKeys
  onlyDigits
  on: 1
  :
```

---

## Visual feedback — `showCode` and `pulseColor`

Optional UI hints on the keyboard widget (Devices panel). They do not change simulation output.

### `showCode`

| Value | Display (focused) | Display (unfocused) |
|-------|-------------------|---------------------|
| `0` | Blinking `\|` only (default) | Hidden |
| `1` | Hex + cursor, e.g. `^39\|` for key `9` (ASCII 57) | Static hex, e.g. `^39` |
| `2` | Decimal + cursor, e.g. `57\|` | Static decimal, e.g. `57` |

The code reflects the current `:get` value. When `:get` is `0`, only the blinking cursor is shown (no code text).

### `pulseColor`

When set (e.g. `pulseColor: ^ff0`), border and label briefly flash that color (~150 ms) after each **accepted** key. Rejected keys do not pulse.

### Integration hooks

The panel calls these globals (also usable in tests):

- `onKeyboardShowCode(keyboardId, asciiCode, showCodeMode)`
- `onKeyboardPulseColor(keyboardId, colorHex)`

### Example — debug keyboard with code display

```logts-play
comp [keyboard] .kbd:
  label: 'Debug'
  showCode: 1
  pulseColor: ^ff0
  focusColor: ^0f0
  allowEnter
  on: 1
  :
```

Click the keyboard and type — you see the hex code of the last accepted key and a short yellow flash on each press.

---

## Example — keyboard → terminal

Click the keyboard, type characters; each accepted key appends to the terminal when `valid` pulses.

```logts-play
comp [keyboard] .kbd:
  label: 'Console'
  focusColor: ^00ff00
  allowEnter
  on: 1
  :

comp [terminal] .term:
  rows: 10
  columns: 40
  color: ^0f0
  on: 1
  nl
  :

.term:{
  append = .kbd
  set = .kbd:valid
}
```

With `allowEnter`, pressing Enter on the keyboard emits LF and you can wire `newline` on the terminal from `:get` if needed.

---

## Example — keyboard → queue (BCD)

```logts-play
comp [keyboard] .digits:
  label: 'BCD'
  onlyDigits
  focusColor: ^00aaff
  on: 1
  :

comp [queue] .q:
  width: 4
  length: 16
  on: 1
  nl
  :

.q:{
  push = .digits.4/4
  set = .digits:valid
}
```

---

## Example — pocket calculator

Full runnable script (keyboard, `+`/`-`/`=`/`R`, divider display, terminal): **[pocket-calc.md](pocket-calc.md)** — self-contained `logts-play wave` block with **Load** / **Load & Run**.

---

## Notes

- Only one focused keyboard receives keys at a time.
- By default, typed characters are not shown on the keyboard widget (use `showCode` or [terminal.md](terminal.md) for display).
