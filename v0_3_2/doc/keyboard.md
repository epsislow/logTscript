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

---

## Outputs

| Pout | Width | Description |
|------|-------|-------------|
| `get` | 8 (ASCII) / 4 (`onlyNumbers`) | Last emitted code |
| `valid` | 1 | Pulse `1` for one propagation cycle when a key is accepted, then `0` |

Wire property blocks use `set = .kbd:valid` to trigger `push` / `append` on each key.

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

## Example — pocket calculator (LUT + keys + terminal, wave)

Focus **Digits**, type `0`–`9` on the keyboard. **`+`** / **`-`** / **`=`** add or subtract the typed number to the accumulator and print the result on the terminal (two digits, `00`–`99`). **`R`** clears accumulator, entry, and terminal.

Arithmetic is **unsigned 8-bit**. There are no negative numbers: if subtraction would go below zero, the result is **clamped to 0** (`SUBTRACT` `carry` = borrow → `MUX` picks `0`).

`fromAscii` uses **`length: 128`** with only **`^30`–`^39`** mapped (ASCII `'0'`…`'9'`); **`fillwith: 1111`** for non-digits. `toAscii` maps digit values **`^0`–`^9`** to ASCII for `append`.

```logts-play wave
comp [keyboard] .kbd:
  label: 'Digits'
  focusColor: ^00ff00
  on: 1
  :

comp [key] .plus:
  label: '+'
  type: 0
  on: 1
  :

comp [key] .minus:
  label: '-'
  type: 0
  on: 1
  :

comp [key] .eq:
  label: '='
  type: 0
  on: 1
  :

comp [key] .reset:
  label: 'R'
  type: 0
  on: 1
  nl
  :

comp [lut] .fromAscii:
  depth: 4
  length: 128
  fillwith: 1111
  = data {
    ^30: 0000
    ^31: 0001
    ^32: 0010
    ^33: 0011
    ^34: 0100
    ^35: 0101
    ^36: 0110
    ^37: 0111
    ^38: 1000
    ^39: 1001
  }
  on: 1
  :

comp [lut] .toAscii:
  depth: 8
  length: 16
  fillwith: 00110000
  = data {
    ^0: 00110000
    ^1: 00110001
    ^2: 00110010
    ^3: 00110011
    ^4: 00110100
    ^5: 00110101
    ^6: 00110110
    ^7: 00110111
    ^8: 00111000
    ^9: 00111001
  }
  on: 1
  :

comp [reg] .acc:
  depth: 8
  on: 1
  :

comp [reg] .entry:
  depth: 8
  on: 1
  :

comp [terminal] .term:
  rows: 8
  columns: 24
  color: ^0f0
  on: 1
  nl
  :

8wire zero = 00000000
8wire ten = 00001010
8wire key = .kbd
4wire dig = .fromAscii(in = key)
8wire entryCur = .entry:get
8wire entryMul, 8wire ov1 = MULTIPLY(entryCur, ten)
8wire entryNew, 1wire c1 = ADD(entryMul, dig)
1wire bad = EQ(dig, 1111)

.entry:{
  data = MUX(bad, entryNew, entryCur)
  set = .kbd:valid
}

8wire accCur = .acc:get
8wire sum, 1wire c2 = ADD(accCur, entryCur)
8wire diff, 1wire borrow = SUBTRACT(accCur, entryCur)
8wire diffSat = MUX(borrow, diff, zero)

.acc:{ data = sum
  set = .plus }
.entry:{ data = zero
  set = .plus }

8wire showP = sum
8wire qP, 8wire modP = DIVIDE(showP, ten)
8wire asciiTP = .toAscii(in = qP)
8wire asciiOP = .toAscii(in = modP)

.term:{ append = asciiTP
  set = .plus }
.term:{ append = asciiOP
  newline = 1
  set = .plus }

.acc:{ data = diffSat
  set = .minus }
.entry:{ data = zero
  set = .minus }

8wire showM = diffSat
8wire qM, 8wire modM = DIVIDE(showM, ten)
8wire asciiTM = .toAscii(in = qM)
8wire asciiOM = .toAscii(in = modM)

.term:{ append = asciiTM
  set = .minus }
.term:{ append = asciiOM
  newline = 1
  set = .minus }

.acc:{ data = sum
  set = .eq }
.entry:{ data = zero
  set = .eq }

8wire showE = sum
8wire qE, 8wire modE = DIVIDE(showE, ten)
8wire asciiTE = .toAscii(in = qE)
8wire asciiOE = .toAscii(in = modE)

.term:{ append = asciiTE
  set = .eq }
.term:{ append = asciiOE
  newline = 1
  set = .eq }

.acc:{ data = zero
  set = .reset }
.entry:{ data = zero
  set = .reset }
.term:{ clear = 1
  set = .reset }
```

Try: `12` **+** → `12`; `3` **+** → `15`; **R** clears; `9` **+** then `1` **-** → `8`; `3` **+** then `8` **-** → `0` (saturate).

---

## Notes

- Only one focused keyboard receives keys at a time.
- Typed characters are not shown on the keyboard widget (use [terminal.md](terminal.md) for display).
- Future versions may support custom key mappings through LUTs.
