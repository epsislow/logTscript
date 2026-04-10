# LED Component

The `led` component displays one or more LED indicators. By default it is a single 1-bit LED. Setting `length` creates a group of LEDs where each LED corresponds to one bit of the assigned value — a lit LED means the bit is `1`, an unlit LED means `0`.

---

## Syntax

```
comp [led] .name:
  length: 4
  text: 'label'
  color: ^f00
  square
  nl
  on: raise/edge/1/0
  :
```

Minimal form (single LED, all defaults):

```
comp [led] .name::
```

---

## Attributes

| Attribute | Type    | Default   | Description |
|-----------|---------|-----------|-------------|
| `length`  | integer | `1`       | Number of LEDs (bits). `1` = single LED, `4` = group of 4 LEDs |
| `text`    | string  | `''`      | Label displayed next to the first LED |
| `color`   | hex     | `^f00`    | LED color as a 3 or 6 digit hex value (e.g. `^0f9`, `^21f`, `^ff0000`) |
| `square`  | flag    | (round)   | Renders the LED as a square instead of a circle |
| `nl`      | flag    | (no)      | Adds a newline after the last LED in the group |
| `on`      | mode    | `raise`   | Trigger mode for property blocks: `raise`, `edge`, `1`, `0` |

---

## Direct assignment

### Single LED (`length: 1`)

Assign a 1-bit value directly to the LED:

```
comp [led] .power:
  color: ^0f0
  nl
  :

.power = 1       # LED on
.power = 0       # LED off
```

### Multi-bit LED group (`length: N`)

Assign an N-bit value — each bit controls one LED:

```
comp [led] .status:
  length: 4
  color: ^0f9
  nl
  :

.status = 1010   # LEDs 0 and 2 are on, LEDs 1 and 3 are off
```

Bit order is left-to-right: the leftmost bit controls the first (leftmost) LED.

---

## Wire connection

Connect the LED group to a wire of matching width:

```
4wire data = 1010

comp [led] .leds:
  length: 4
  nl
  :

.leds = data     # all 4 LEDs reflect the bits of data
```

Or using a property block with `set`:

```
comp [led] .leds:
  length: 4
  on: 1
  :

.leds:{
  value = data
  set = 1
}
```

---

## Reading the value (`:get`)

The current value of the LED group can be read back:

```
4wire out = .leds:get
```

---

## Examples

### Power indicator

```
comp [switch] .pwr:
  text: 'Pwr'
  :

comp [led] .indicator:
  color: ^21f
  text: 'ON'
  nl
  :

.indicator = .pwr
```

### 4-bit status display

```
4wire flags = 1101

comp [led] .fl:
  length: 4
  color: ^ff0
  square
  nl
  :

.fl = flags
```

LEDs light up according to the bits of `flags`: bits 0, 2, 3 are `1` → LEDs 0, 2, 3 are on.

### LED group driven by a key

```
comp [key] .btn:
  label: 'A'
  on: 1
  :

comp [led] .out:
  length: 4
  color: ^0f9
  nl
  on: 1
  :

4wire data = 1111

.out:{
  value = data
  set = .btn
}
```

When button A is pressed, all 4 LEDs turn on.

### ALU result display

```
comp [dip] .a:
  text: 'A'
  length: 4
  visual: 1
  noLabels
  :4bit

comp [dip] .b:
  text: 'B'
  length: 4
  visual: 1
  noLabels
  nl
  :4bit

comp [adder] .add:
  depth: 4
  :

.add:a = .a
.add:b = .b

comp [led] .result:
  length: 4
  color: ^0af
  text: 'Sum'
  nl
  :

comp [led] .carry:
  color: ^f40
  text: 'C'
  nl
  :

.result = .add:get
.carry = .add:carry
```

---

## Component type documentation

```
doc(comp.led)
```

Output:

```
comp [led] .name:
  length: integer
  text: string
  color: string
  square
  nl
  on: raise/edge/1/0
  = Xbit
  :{
    1pin set
    Xpin value
    Xpout get
  }
  -> Xbit
```

---

## Notes

- `length: 1` (default) behaves like a classic single LED — no storage is allocated and `ref` remains null.
- `length > 1` allocates storage so the bit group value persists and can be read back via `:get`.
- Bit order is **left-to-right**: bit index `0` is the leftmost LED.
- The `color` attribute applies to all LEDs in the group. Individual LED colors are not supported within a single component — declare separate `led` components for different colors.
- `nl` places a line break after the **last** LED in the group.
