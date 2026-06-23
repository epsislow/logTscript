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
  onlyNumbers
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

On **mobile**, focus uses a hidden `<input>` so the OS virtual keyboard opens; with `onlyNumbers`, `inputmode="numeric"` is set. On desktop, the same input receives physical key presses while focused.

---

## Outputs

| Pout | Width | Description |
|------|-------|-------------|
| `get` | 8 (ASCII) / 4 (`onlyNumbers`) | Last emitted code |
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
| `onlyNumbers` | flag | (no) | Accept only `0`–`9` |
| `nl` | flag | (no) | New line after component |

---

## ASCII mode (default)

| Key | Decimal | Binary (8 bit) |
|-----|---------|----------------|
| `A` | 65 | `01000001` |
| `5` | 53 | `00110101` |
| Enter | 10 | `00001010` |

---

## `onlyNumbers` mode

Only `0`–`9` are accepted. `get` is **4 bits** with decimal value (`5` → `0101`). Enter and letters are ignored.

---

## Example — keyboard → terminal

Click the keyboard, type characters; each accepted key appends to the terminal when `valid` pulses.

```logts-play
comp [keyboard] .kbd:
  label: 'Console'
  focusColor: ^00ff00
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

---

## Example — keyboard → queue (BCD)

```logts-play
comp [keyboard] .digits:
  label: 'BCD'
  onlyNumbers
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
  push = .digits
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
