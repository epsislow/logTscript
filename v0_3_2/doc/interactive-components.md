# Interactive components

Per-component pages: [switch.md](switch.md), [key.md](key.md), [dip.md](dip.md), [rotary.md](rotary.md), [slider.md](slider.md). Full catalog: [components.md](components.md).

**Switch**, **key**, **dip**, **rotary**, and **slider** are input components you control from the devices panel while the program is running. Their values feed into wires and logic — when you flip a switch, press a key, change a DIP position, turn a rotary knob, or drag a slider, connected wires update automatically.

See [signal-propagation.md](signal-propagation.md) for how those updates spread through your circuit.

The **oscillator** (`osc`) also drives wires in real time, but it is **not** a panel control — it runs on its own timer. See [oscillator.md](oscillator.md).

---

## Panel callbacks (press vs toggle)

Inside the engine, each panel control uses a small callback when you interact with it. You do not write these callbacks in LogTScript; they are wired up when the component is created.

| Component | UI callback | When it runs |
|-----------|-------------|--------------|
| `key` | **`onPress`** | Mouse/touch down — output becomes `1` |
| `key` | **`onRelease`** | Mouse/touch up — output returns to `0` |
| `switch` | `onChange` | Each time you toggle the control |
| `dip` | `onChange` | Each time you flip one DIP position (`index`, `checked`) |
| `rotary` | `onChange` | When the selected **state** changes (drag or step the knob) |
| `slider` | `onChange` | When the scalar **value** changes (drag thumb or click track) |

**Only `key` uses `onPress` / `onRelease`.** All other panel inputs above use `onChange` (or, for the oscillator, automatic HIGH/LOW transitions — not user clicks).

From your script’s point of view, the effect is the same: wires that read `.name:get` (or `.name` where supported) are updated through signal propagation after the interaction.

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
| `.name` | 1 bit (switch, key) or multi-bit (dip, rotary, slider) | Direct value |
| `.name:get` | Same | Explicit read (equivalent for these components) |
| `.name.N` | 1 bit | Single bit `N` of a **dip** only (leftmost = `0`) |

Use a wire width that matches the component: `1wire` for switch and key, `Nwire` for a dip or slider with `length: N`, and `ceil(log₂(states))` bits for a rotary with `states: N` (e.g. `states: 8` → `3wire`).

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

```logts-play
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

## Rotary knob

A **rotary selector**: drag vertically on the knob (or use touch) to pick one of several discrete **states**. Each state is a small integer encoded as binary on the output.

### Syntax

```
comp [rotary] .name:
  text: 'Select'
  states: 8
  color: ^6dff9c
  for.0: 'A'
  for.1: 'B'
  for.2: 'C'
  nl
  :
```

Minimal form (8 states, 3 output bits):

```
comp [rotary] .name::
```

### Attributes

| Attribute | Type    | Default   | Description |
|-----------|---------|-----------|-------------|
| `text`    | string  | `''`      | Label next to the knob |
| `states`  | integer | `8`       | Number of positions (minimum `2`) |
| `color`   | hex     | `#6dff9c` | Accent color on the knob |
| `for.N`   | string  | —         | Optional label shown for state `N` (`for.0`, `for.1`, …) |
| `nl`      | flag    | (no)      | Newline after the control |

### Output

- **`ceil(log₂(states))` bits** — binary index of the current state, left-padded with zeros
- State `0` is the first position; state `states - 1` is the last
- Examples: `states: 4` → `2wire`, values `00`…`11`; `states: 8` → `3wire`, values `000`…`111`
- Starts at state `0` (all zeros on the output) after **RUN** unless initialized with `=`

### Interaction

- **Drag** up/down on the knob to change state; each new state fires `onChange` and updates wires
- Unlike a **key**, the value **stays** at the selected state when you release the mouse — similar to a **switch**, but with more than two positions
- You can also drive the knob from logic with a property block: `set = 1` and `data = …` (see `doc(comp.rotary)`)

### Examples

**Wire follows the knob**

```
comp [rotary] .sel:
  text: 'Channel'
  states: 4
  for.0: '0'
  for.1: '1'
  for.2: '2'
  for.3: '3'
  :

2wire channel = .sel:get
```

**Labeled modes (e.g. calculator operator)**

```
comp [rotary] .op:
  text: 'Op'
  states: 4
  for.0: '+'
  for.1: '-'
  for.2: 'x'
  for.3: ':'
  :

2wire op = .op:get
```

**MUX driven by rotary position**

```
comp [rotary] .rr:
  states: 4
  :

2wire rr = .rr:get
4wire choice = MUX(.rr, default, pathA, pathB, pathC, pathD)
```

### Notes

- Match wire width to `ceil(log₂(states))`, not to `states` itself.
- For exactly two positions, a **switch** is simpler; use **rotary** when you need 3+ named or numbered choices in one control.
- Panel interaction uses `onChange`, not `onPress` / `onRelease`.

---

## Slider (`comp [slider]`)

A **slider** outputs a scalar value from `0` to `2^length − 1` as binary on `:get`. Drag the thumb horizontally or vertically, or click the track to jump.

```
comp [slider] .name:
  length: 8
  text: 'Op'
  color: ^6dff9c
  orientation: 0
  reversed
  for: ['0','1','2','3']
  nl
  :
```

Minimal:

```
comp [slider] .name::
```

### Attributes

| Attribute | Default | Notes |
|-----------|---------|-------|
| `length` | `4` | Output width in bits |
| `text` | `''` | Label (max 5 chars in panel) |
| `color` | `#6dff9c` | Thumb and value color |
| `orientation` | `0` | `0` horizontal, `1` vertical |
| `reversed` | off | Swap min/max on track |
| `for` | — | Per-step labels in panel (else decimal) |
| `nl` | off | Newline after control |

### Panel vs debug

The panel shows the **decimal** step (or a `for` label). `show`, `peek`, and `probe` still show the **binary** wire value.

### Property block

Drive the slider from logic with `set` and `data` (see `doc(comp.slider)`).

### Example

```logts-play
comp [slider] .op:
  length: 4
  text: 'A'
  :

4wire val = .op:get
```

### Notes

- Use **slider** for many sequential values; use **dip** for arbitrary bit patterns; use **rotary** when `states` is not a power of two.
- Panel interaction uses `onChange`.

---

## Comparison

| Component | Bits | User action | Panel callback | Value while idle |
|-----------|------|-------------|----------------|------------------|
| `switch`  | 1    | Toggle      | `onChange`     | Stays `0` or `1` |
| `key`     | 1    | Press/release | **`onPress` / `onRelease`** | `0` |
| `dip`     | N    | Flip each position | `onChange` | Holds last pattern |
| `rotary`  | `ceil(log₂(states))` | Drag / step knob | `onChange` | Holds last state |
| `slider`  | `length` | Drag / click track | `onChange` | Holds last value |
| `osc`     | 1 (+ counter) | *(automatic timer)* | HIGH/LOW ticks | Oscillates — see [oscillator.md](oscillator.md) |

---

## Component documentation

```
doc(comp.switch)
doc(comp.key)
doc(comp.dip)
doc(comp.rotary)
doc(comp.slider)
```

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires update after UI changes
- [Oscillator](oscillator.md) — real-time `osc` (not a panel button, but live wire driver)
- [LED](led.md) — displaying values driven by switches and keys
- [doc() function](doc-function.md) — full `doc(comp.*)` listing
