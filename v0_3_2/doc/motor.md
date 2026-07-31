# Motor component

`comp [motor]` is a **panel output** that shows a spinning actuator. You drive it from LogTscript with wires and assignments (same I/O style as `led`). Mapping it into `comp [plc]` `outputs:` is optional — see [plc.md](plc.md).

Signature: `doc(comp.motor)`.

The stored value is an **unsigned N-bit speed command**:

| Stored value | Panel |
|--------------|--------|
| `0` | Stopped (no spin) |
| `> 0` | Running — animation speed rises with the value |

There is **no** packing of “run bit + speed” inside one word. An 8-bit source and an 8-bit motor share the **same full value** as the speed command (`0…255`).

---

## Syntax

```
comp [motor] .name:
  kind: rotor
  length: 8
  text: 'M1'
  color: ^6dff9c
  frameColor: ^4a9e6a
  bgColor: ^0d2818
  size: 12
  rate: 10
  rotate: 0
  flip
  reversed
  nl
  on: 1
  :
```

Minimal (1-bit rotor, all defaults):

```
comp [motor] .m::
```

---

## Kinds

`kind` only changes the **glyph** on the panel. I/O is identical for all kinds.

| `kind` | Appearance |
|--------|------------|
| `rotor` (default) | Shaft / disc with a notch |
| `fan` | Three blades |
| `pump` | Impeller vanes |

Unknown `kind` → elaboration error.

The **ring (and hub) stay fixed**; only the notch / blades / vanes spin.

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `kind` | id | `rotor` | Visual skin (`rotor`, `fan`, `pump`) — unquoted, e.g. `kind: fan` |
| `length` | integer | `1` | Wire width `1…8`. `1` = on/off; `N>1` = speed `0…2^N−1` |
| `text` | string | `''` | Panel label (up to 5 characters shown) |
| `color` | hex \| wire | `#6dff9c` | Moving part (notch / blades / vanes) |
| `frameColor` | hex \| wire | *(= `color`)* | Fixed ring + hub outline/fill accent |
| `bgColor` | hex \| wire | *(soft from `frameColor`)* | Fill inside the fixed ring — not the whole canvas |
| `size` | integer | `10` | Glyph size on the panel (`1…20`) |
| `rate` | integer | `10` | Visual animation factor in **tenths** — see below |
| `rotate` | integer | `0` | Widget orientation: `0`, `90`, `180`, or `270` degrees |
| `flip` | flag | off | Mirror the glyph horizontally |
| `reversed` | flag | off | Invert the spin direction (CW ↔ CCW) |
| `nl` | flag | off | Newline after the control |
| `on` | mode | `raise` | When property blocks run: `raise`, `edge`, `1`, `0` — **not** the motor command |

### Colors

Hex literal or wire name — [component-color-attributes.md](component-color-attributes.md).

```logts-play
comp [motor] .fan1:
  kind: fan
  length: 1
  color: ^6dff9c
  frameColor: ^888888
  bgColor: ^1a1a1a
  text: 'Fan'
  nl
  :

.fan1 = 1
1wire s = .fan1:get
show(s)
```

Load & Run: green blades inside a grey ring with dark fill; `s` is `1`.

### `rate` (animation only)

You write an **integer**; the panel uses `factor = rate / 10`.

| Syntax | Factor | Effect |
|--------|--------|--------|
| `rate: 3` | `0.3` | ~3× slower animation |
| `rate: 10` (default) | `1.0` | Normal mapping |
| `rate: 20` | `2.0` | ~2× faster animation |

Allowed range: `1…100` (factor `0.1…10`). **`rate` does not change** the stored speed, wires, PLC symbols, or `:get`.

---

## Pins and pouts

| Name | Width | Role |
|------|-------|------|
| `set` | 1 | Enable a property-block write when `1` |
| `value` | `length` | Speed command to store |
| `dir` | 1 | Dynamic direction: `1` flips sense relative to `reversed` |
| `get` | `length` | Read back the **speed** (not direction) |

Direct assignment `.m = expr` writes the speed (same width as `length`).

Property block:

```
.m:{ value = speedWire, dir = dirWire, set = 1 }
```

`on:` on the component only controls **when** that block applies — it is **not** the run command (same rule as `led`).

---

## Behaviour by width

### `length: 1` — run / stop

| Value | Meaning |
|-------|---------|
| `0` | Stop |
| `1` | Run at a fixed didactic spin rate × `rate/10` |

### `length: 2…8` — proportional speed

| Value `v` | Meaning |
|-----------|---------|
| `0` | Stop |
| `1 … 2^N−1` | Run; animation period shortens as `v` grows (mapped between a slow and a fast period), then divided by `rate/10` |

Direction:

- Attribute `reversed` — fixed sense for the life of the component
- Pin `dir` — XOR with `reversed` when you write `{ dir = …, set = 1 }`
- `:get` always returns **speed only**

---

## Direct assignment

```logts-play
comp [motor] .m1:
  kind: rotor
  text: 'M1'
  color: ^6dff9c
  nl
  :

.m1 = 1
1wire s = .m1:get
show(s)
```

Load & Run: panel motor spins; `s` is `1`.

```logts-play
comp [motor] .fan1:
  kind: fan
  text: 'Fan'
  on: 1
  nl
  :

.fan1:{ value = 1, set = 1 }
.fan1:{ value = 0, set = 1 }
1wire s = .fan1:get
show(s)
```

Load & Run: motor stops; `s` is `0`.

---

## Multi-bit speed

```logts-play
comp [motor] .drive:
  kind: rotor
  length: 8
  size: 14
  on: 1
  nl
  :

.drive = 11000000
8wire out = .drive:get
show(out)
```

Load & Run: `out` is `11000000` (speed 192); panel spins faster than a low value would.

---

## Slider → motor (same width)

The whole 8-bit slider value becomes the motor speed — no MSB/LSB split.

```logts-play
comp [slider] .spd:
  length: 8
  text: 'Spd'
  on: 1
  nl
  :

comp [motor] .pump1:
  kind: pump
  length: 8
  size: 12
  rate: 10
  on: 1
  nl
  :

.spd:{ data = 11000000, set = 1 }
8wire cmd = .spd:get
.pump1:{ value = cmd, set = 1 }
8wire out = .pump1:get
show(out)
```

Load & Run: `out` matches `cmd` (`11000000`).

---

## Sensor wheel → motor

`kind: wheel` on `comp [sensor]` is an 8-bit analog command input (0…255) meant for speed dials.

```logts-play
comp [sensor] .wheel:
  kind: wheel
  text: 'W'
  on: 1
  nl
  :

comp [motor] .drive:
  kind: rotor
  length: 8
  size: 14
  on: 1
  nl
  :

.wheel:{ data = 01000000, set = 1 }
8wire cmd = .wheel:get
.drive:{ value = cmd, set = 1 }
8wire out = .drive:get
show(out)
```

Load & Run: `out` is `01000000`.

---

## Direction (`dir` + `reversed`)

```logts-play
comp [switch] .dirSw:
  text: 'Dir'
  on: 1
  nl
  :

comp [motor] .m:
  length: 4
  kind: rotor
  on: 1
  nl
  :

.dirSw:{ data = 1, set = 1 }
1wire d = .dirSw:get
.m:{ value = 1000, dir = d, set = 1 }
4wire v = .m:get
show(v)
```

Load & Run: `v` is still `1000` (speed); panel spin direction follows `dir`.

```logts-play
comp [motor] .rev:
  kind: fan
  length: 4
  reversed
  rate: 15
  on: 1
  nl
  :

.rev = 0111
4wire v = .rev:get
show(v)
```

Load & Run: `v` is `0111`; spin uses the reversed base sense.

---

## Display helpers (`size`, `rate`, `rotate`, `flip`, `color`)

```logts-play
comp [motor] .big:
  kind: pump
  length: 8
  size: 18
  rate: 3
  rotate: 90
  flip
  color: ^0f9
  text: 'Big'
  nl
  on: 1
  :

.big = 11110000
8wire o = .big:get
show(o)
```

Load & Run: `o` is `11110000`. `rate: 3` only slows the **animation** (factor 0.3); the command stays `11110000`.

```logts-play
comp [motor] .fastUi:
  kind: fan
  length: 8
  rate: 25
  size: 8
  on: 1
  nl
  :

.fastUi = 00100000
8wire o = .fastUi:get
show(o)
```

Load & Run: same idea with a faster panel (`rate: 25` → factor 2.5).

---

## Kinds side by side

```logts-play
comp [motor] .r:
  kind: rotor
  text: 'R'
  on: 1
  :

comp [motor] .f:
  kind: fan
  text: 'F'
  on: 1
  :

comp [motor] .p:
  kind: pump
  text: 'P'
  nl
  on: 1
  :

.r = 1
.f = 1
.p = 1
1wire a = .r:get
1wire b = .f:get
1wire c = .p:get
show(a)
show(b)
show(c)
```

Load & Run: all three show `1`; glyphs differ on the panel.

---

## PLC output mapping

```logts-play
inline [plc] .machine:
  inputs: { START }
  outputs: { MOTOR }
  IF START THEN MOTOR = 1 ELSE MOTOR = 0 END_IF
  :

comp [switch] .start:
  = 1
  nl
  :

comp [motor] .drive:
  kind: fan
  text: 'M'
  on: 1
  nl
  :

comp [plc] .ctrl:
  program: .machine
  scanTime: 0
  inputs: { START = .start }
  outputs: { MOTOR = .drive }
  on: 1
  :

.ctrl:{ set = 1 }
1wire m = .drive:get
show(m)
```

Load & Run: with START on, `m` is `1` and the fan spins. Symbol width must match the motor `length`.

---

## Related

- [led.md](led.md) — same output contract (`value` / `set` / `:get`)
- [slider.md](slider.md) / [sensor.md](sensor.md) — panel inputs for speed commands
- [plc.md](plc.md) — `outputs: { MOTOR = .drive }`
- [components.md](components.md) — catalog
