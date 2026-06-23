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
| `onlyDigits` | flag | (no) | Accept only `0`–`9` (still emits 8-bit ASCII) |
| `allowEnter` | flag | (no) | Accept Enter (LF, code 10); mobile uses `<textarea>` with return key |
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
- Typed characters are not shown on the keyboard widget (use [terminal.md](terminal.md) for display).
- Future versions may support custom key mappings through LUTs.
