# Sensor component

`comp [sensor]` is a **panel input** that simulates a physical sensor. Digital kinds are 1-bit (like a switch). Analog kinds expose an N-bit step index on `:get` (like a slider), with a panel readout in engineering units.

Signature: `doc(comp.sensor)` — see also [interactive-components.md](interactive-components.md).

You can use sensors anywhere in LogTscript (wires, LEDs, expressions). Mapping them into `comp [plc]` `inputs:` is optional — see [plc.md](plc.md).

---

## Syntax

```
comp [sensor] .name:
  kind: temperature
  text: 'T'
  color: ^6dff9c
  length: 8
  unit: 'C'
  min: -40
  max: 125
  default: 20
  mag: 0
  step: 5
  orientation: 0
  reversed
  nl
  on: 1
  :
```

Minimal digital (defaults to `kind: proximity`, 1 bit):

```
comp [sensor] .prox::
```

---

## Kinds

| `kind` | Mode | Default width | Typical use |
|--------|------|---------------|-------------|
| `proximity` (default) | digital | 1 | Presence / inductive |
| `motion` | digital | 1 | PIR / motion |
| `limit` | digital | 1 | Endstop / limit switch |
| `beam` | digital | 1 | Optical beam break |
| `float` | digital | 1 | Level float switch |
| `temperature` | analog | 8 | Temperature (°C or K) |
| `humidity` | analog | 8 | Relative humidity % |
| `light` | analog | 8 | Light level |
| `pressure` | analog | 8 | Pressure |
| `distance` | analog | 8 | Distance / ultrasonic |
| `wheel` | analog | 8 | Speed dial / command wheel (`0…255`) |

Unknown `kind` → elaboration error.

---

## Attributes

### Common

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `kind` | id | `proximity` | Sensor type (unquoted id, e.g. `kind: temperature`) |
| `text` | string | `''` | Panel label (up to 5 characters shown) |
| `color` | hex | `#6dff9c` | Accent color |
| `length` | integer | from kind | Wire width `1…8` (`Nwire` must match) |
| `nl` | flag | off | Newline after the control |
| `on` | mode | `raise` | When property blocks run: `raise`, `edge`, `1`, `0` |
| `inverted` | flag | off | **Digital only** — invert bit written to storage |

### Analog scale

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `unit` | string | from kind | Panel suffix (`'C'`, `'K'`, `'%'`, `'cm'`, …) |
| `min` / `max` | integer | from kind | Raw engineering range (may be negative where allowed) |
| `default` | integer | from kind | Initial raw value (must lie on the scale / `step`) |
| `mag` | integer | `0` | Panel display = `raw / 10^mag` (`-6…6`) |
| `step` | integer | — | Optional raw increment; snap positions |
| `orientation` | `0`/`1` | `0` | Horizontal / vertical track |
| `reversed` | flag | off | Invert value mapping on the track (like slider) |
| `size` | integer | `10` | Track length `1…20` (panel only) |
| `for` | array | — | Optional label per step index |

`step` is **not** allowed on digital kinds.

---

## Pins and outputs

| Name | Bits | Role |
|------|------|------|
| `get` (pout) | `length` | Current binary value |
| `set` (pin) | 1 | Apply `data` when `1` (with `on:`) |
| `data` (pin) | `length` | Forced binary value |

Read with `.name:get` or `.name`. Direct assignment of the component ref follows the same storage model as other panel inputs.

---

## Digital behaviour

- Wire is **1 bit** (`1wire`).
- Panel toggle uses **`onChange`** (same idea as `switch` / `dip`).
- With **`inverted`**: storage bit is the inverse of the UI “on” state. Script/`show` see storage.

```logts-play
comp [sensor] .prox:
  kind: proximity
  text: 'IN'
  nl
  :

1wire p = .prox:get
show(p)
```

Load & Run: `p` is `0`. Toggle the sensor on the panel — `p` follows.

```logts-play
comp [sensor] .lim:
  kind: limit
  inverted
  on: 1
  nl
  :

1wire hit = .lim:get
.lim:{ data = 1, set = 1 }
show(hit)
```

Load & Run: forces storage to `1` via the property block (`hit` = `1`).

```logts-play
comp [led] .alarm:
  color: ^f00
  nl
  :

comp [sensor] .motion:
  kind: motion
  text: 'PIR'
  nl
  :

.alarm = .motion:get
show(.alarm:get)
```

Load & Run: LED off. Toggle motion on — LED follows.

---

## Analog behaviour

### Wire vs panel

| Layer | Meaning |
|-------|---------|
| **Wire / `:get`** | Unsigned **step index** `0 … 2^length−1` (or `0…K` when `step` is set) |
| **Raw** | Integer on `[min, max]` (can be negative, e.g. °C) |
| **Panel** | `display = raw / 10^mag` plus `unit` |

Binary never stores a signed Celsius value; negatives live only in the raw/panel mapping.

### Defaults by kind (when attrs omitted)

| `kind` | `unit` | `min` | `max` | `default` | `mag` |
|--------|--------|-------|-------|-----------|-------|
| `temperature` | `C` | `-40` | `125` | `20` | `0` |
| `temperature` + `unit: 'K'` | `K` | `233` | `398` | `293` | `0` |
| `humidity` | `%` | `0` | `100` | `50` | `0` |
| `light` | `lux` | `0` | `1000` | `200` | `0` |
| `pressure` | `bar` | `0` | `10` | `1` | `0` |
| `distance` | `cm` | `0` | `400` | `100` | `0` |

**Validation highlights:** humidity stays in `0…100`; Kelvin and distance require `min ≥ 0`; `default` must be in `[min, max]`; with `step`, `(max−min)` and `(default−min)` must be divisible by `step`.

### `mag`

`display = raw / 10^mag`:

| Raw range | `mag` | Panel |
|-----------|-------|-------|
| `0…400` | `2` | `0.00…4.00` |
| `1…4` | `-2` | `100…400` |
| any | `0` | same integers as raw |

### Temperature (°C and K)

```logts-play
comp [sensor] .temp:
  kind: temperature
  text: 'T'
  nl
  :

8wire t = .temp:get
show(t)
```

Load & Run: starts near room temperature (raw **20** °C mapped onto 8 bits). Panel shows engineering °C; `show(t)` prints the **binary step**.

```logts-play
comp [sensor] .cold:
  kind: temperature
  unit: 'C'
  min: -20
  max: 40
  default: -5
  text: 'Tc'
  nl
  :

8wire c = .cold:get
show(c)
```

Load & Run: starts at raw **-5** (negative allowed in °C).

```logts-play
comp [sensor] .tempK:
  kind: temperature
  unit: 'K'
  text: 'Tk'
  nl
  :

8wire k = .tempK:get
show(k)
```

Load & Run: Kelvin defaults (**233…398**, start **293**). Panel shows integer kelvin.

### Humidity with `step`

```logts-play
comp [sensor] .rh:
  kind: humidity
  step: 10
  text: 'RH'
  nl
  :

4wire h = .rh:get
show(h)
```

Load & Run: positions `0,10,…,100` (11 steps → auto `length: 4`). Start at **50**.

### Distance and `mag`

```logts-play
comp [sensor] .distFine:
  kind: distance
  min: 0
  max: 400
  mag: 2
  default: 100
  text: 'd'
  nl
  :

8wire d = .distFine:get
show(d)
```

Load & Run: panel **1.00 cm** at start (raw 100, `mag: 2`).

```logts-play
comp [sensor] .coarse:
  kind: distance
  min: 1
  max: 4
  mag: -2
  default: 2
  unit: 'cm'
  text: 'D'
  nl
  :

8wire x = .coarse:get
show(x)
```

Load & Run: panel shows **200** at start (raw 2 × 10²).

### Pressure (negative min) and light (vertical)

```logts-play
comp [sensor] .p:
  kind: pressure
  min: -1
  max: 10
  default: 0
  unit: 'bar'
  text: 'P'
  nl
  :

8wire pv = .p:get
show(pv)
```

```logts-play
comp [sensor] .lux:
  kind: light
  orientation: 1
  size: 12
  text: 'L'
  nl
  :

8wire L = .lux:get
show(L)
```

### Force value from script

```logts-play
comp [sensor] .temp:
  kind: temperature
  on: 1
  nl
  :

8wire t = .temp:get
.temp:{ data = 11111111, set = 1 }
show(t)
```

Load & Run: `t` is `11111111` (top of scale).

---

## With PLC (optional)

```logts-play
inline [plc] .machine:
  inputs: { PROX }
  outputs: { ALARM }
  IF PROX THEN ALARM = 1 ELSE ALARM = 0 END_IF
  :

comp [sensor] .prox:
  kind: proximity
  = 1
  nl
  :

comp [led] .alarmLed:
  color: ^f00
  on: 1
  nl
  :

comp [plc] .ctrl:
  program: .machine
  scanTime: 0
  inputs: { PROX = .prox }
  outputs: { ALARM = .alarmLed }
  on: 1
  :

.ctrl:{ set = 1 }
show(.alarmLed:get)
```

Load & Run: proximity preset on → alarm LED **`1`**.

---

## Wheel (speed dial)

`kind: wheel` is an 8-bit analog input (`0…255`) for commanding actuators such as [`comp [motor]`](motor.md).

```logts-play
comp [sensor] .wheel:
  kind: wheel
  text: 'W'
  nl
  :

8wire cmd = .wheel:get
show(cmd)
```

Load & Run: initial `cmd` is `00000000` (default raw 0).

---

## Compared to slider / switch

| Control | Best for |
|---------|----------|
| **`switch` / `key` / `dip`** | Generic digital UI |
| **`sensor` (digital)** | Named sensor semantics + icons |
| **`slider`** | Generic N-bit numeric UI |
| **`sensor` (analog)** | Named scale, units, `mag`, `step`, kind defaults |
| **`sensor` (`wheel`)** | 8-bit speed / command dial for motors |

---

## Notes

- Panel interaction uses **`onChange`** (digital like switch; analog like slider).
- Attribute **`on:`** only controls when `{ set, data }` property blocks apply — it is not the motor/command signal.
- Use a matching `Nwire` width (`1wire` digital; usually `8wire` analog unless `length` / `step` auto-size differs).
