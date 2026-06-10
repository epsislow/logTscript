# Interactive components

**Switch**, **key**, and **dip** are input components you control from the devices panel while the program is running. Their values feed into wires and logic — when you flip a switch, press a key, or change a DIP, connected wires update automatically.

See [signal-propagation.md](signal-propagation.md) for how those updates spread through your circuit.

---

## Common pattern

1. Declare the component (always end the declaration with `:` or `::`).
2. Read its value in wires or property blocks.
3. Run the program — then use the panel to interact; wires stay in sync.

```
comp [switch] .enable::

1wire on = .enable:get
1wire off = NOT(on)

show(on, off)
```

After **RUN**, `on` is `0` and `off` is `1`. Toggle the switch in the panel and both wires change without running the script again.

### Reading values

| Form | Width | Description |
|------|-------|-------------|
| `.name` | 1 bit (switch, key) or N bits (dip) | Direct value |
| `.name:get` | Same | Explicit read (equivalent for these components) |
| `.name.N` | 1 bit | Single bit `N` of a **dip** only (leftmost = `0`) |

Use a wire width that matches the component: `1wire` for switch and key, `Nwire` for a dip with `length: N`.

---

## Switch

A **toggle** control: stays `1` or `0` until you flip it again.

### Syntax

```
comp [switch] .name:
  text: 'Label'
  nl
  :
```

Minimal form:

```
comp [switch] .name::
```

### Attributes

| Attribute | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `text`    | string | `''`    | Label next to the switch |
| `nl`      | flag   | (no)    | Newline after the control |

### Output

- **1 bit**: `0` (off) or `1` (on)
- Starts at `0` after **RUN** unless initialized with `=`

### Examples

**Enable line**

```
comp [switch] .en:
  text: 'Enable'
  nl
  :

1wire enabled = .en:get
```

**Driving an LED**

```
comp [switch] .pwr:
  text: 'Power'
  :

comp [led] .on:
  color: ^0f0
  nl
  :

.on = .pwr
```

### Notes

- You cannot assign to a switch from code (e.g. `.en = 1` is not supported) — it is an input only.
- Use a switch when the value should **stay** until the user toggles it again.

---

## Key

A **momentary button**: `1` while pressed, `0` when released.

### Syntax

```
comp [key] .name:
  label: 'A'
  size: 36
  nl
  :
```

Minimal form:

```
comp [key] .name::
```

### Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `label`   | string  | `''`    | Text on the button |
| `size`    | integer | `36`    | Button size (pixels) |
| `nl`      | flag    | (no)    | Newline after the button |
| `type`    | integer | `0`     | Button style variant |

### Output

- **1 bit**: `0` (released) or `1` (pressed)

### Examples

**Wire follows the button**

```
comp [key] .btn:
  label: 'Go'
  :

1wire pressed = .btn:get
```

**Trigger a property block (level-sensitive)**

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

4wire pattern = 1111

.out:{
  value = pattern
  set = .btn
}
```

While the button is held (`set` is `1`), the block runs and the LEDs show `1111`. When released, behavior depends on other logic tied to `set`.

### Notes

- Use a **key** for short pulses; use a **switch** for a latched on/off state.
- Multiple keys can each have their own `label`.

---

## DIP switch

A **group of toggles** on one control — each position is one bit. Width is set by `length` (default `4`).

### Syntax

```
comp [dip] .name:
  length: 4
  text: 'Inputs'
  color: ^2ecc71
  visual: 1
  noLabels
  nl
  :
```

Minimal form (4 bits, default styling):

```
comp [dip] .name::
```

### Attributes

| Attribute   | Type    | Default   | Description |
|-------------|---------|-----------|-------------|
| `length`    | integer | `4`       | Number of DIP positions (bits) |
| `text`      | string  | `''`      | Label for the group |
| `color`     | hex     | `#2ecc71` | Color of the “on” position |
| `colorFor`  | array   | —         | Per-position colors |
| `visual`    | `0`/`1` | `0`       | `1` = show `0`/`1` on each position |
| `noLabels`  | flag    | (no)      | Hide position labels |
| `noTrans`   | flag    | —         | Transition animation on/off |
| `nl`        | flag    | (no)      | Newline after the control |

### Output

- **N bits** as one binary string, e.g. `1010` for `length: 4`
- Bit `0` is the **leftmost** position
- Starts at all zeros after **RUN** unless initialized with `=`

### Reading one bit or the full word

```
comp [dip] .d:
  length: 4
  :

4wire all = .d:get
1wire bit0 = .d.0
1wire bit2 = .d.2
```

`all` might be `1010` while `bit0` is `1` and `bit2` is `0`.

### Examples

**Two DIP bits as clock and reset**

```
comp [dip] .ctrl:
  length: 2
  noLabels
  visual: 1
  :

1wire clk   = .ctrl.0
1wire reset = .ctrl.1
```

**4-bit input to an adder**

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

4wire sum = .add:get
```

### Notes

- Match wire width to `length` (`4wire` for `length: 4`).
- You cannot assign to a DIP from code — change positions in the panel.
- For a single on/off input, a **switch** is simpler; use a **dip** when you need several bits in one place.

---

## Comparison

| Component | Bits | User action | Value while idle |
|-----------|------|-------------|------------------|
| `switch`  | 1    | Toggle      | Stays `0` or `1` |
| `key`     | 1    | Press/release | `0` |
| `dip`     | N    | Flip each position | Holds last pattern |

---

## Component documentation

```
doc(comp.switch)
doc(comp.key)
doc(comp.dip)
```

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires update after UI changes
- [LED](led.md) — displaying values driven by switches and keys
- [doc() function](doc-function.md) — full `doc(comp.*)` listing
