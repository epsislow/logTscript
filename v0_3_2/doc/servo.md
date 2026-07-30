# Servo component

`comp [servo]` is a **panel output** that shows a positional actuator (horn on a base). You drive it from LogTscript with wires and assignments (same I/O style as `led` / `motor`). Mapping it into `comp [plc]` `outputs:` is optional — see [plc.md](plc.md).

Signature: `doc(comp.servo)`.

The stored value is an **unsigned N-bit step index** on a travel range — **not degrees on the wire**:

| Stored steps | Meaning |
|--------------|---------|
| `0` | One end of the travel (`minAngle`) |
| `2^N−1` | The other end (`maxAngle`) |
| between | Linearly mapped position on the range |

Attributes `minAngle` / `maxAngle` define the travel in **degrees** for the panel only. The wire always carries **steps**.

---

## Syntax

```
comp [servo] .name:
  length: 8
  minAngle: 0
  maxAngle: 180
  angle: 90
  path: short
  text: 'Arm'
  color: ^6dff9c
  size: 12
  speed: 10
  rate: 10
  rotate: 0
  flip
  reversed
  nl
  on: 1
  :
```

Minimal (8-bit, `0…180°`, default path):

```
comp [servo] .arm::
```

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `length` | integer | `8` | Wire width `1…16`. Value = step index `0…2^N−1` |
| `minAngle` | integer | `0` | Travel start in degrees (`-360…360`) |
| `maxAngle` | integer | `180` | Travel end in degrees; must be `> minAngle`, span `≤ 360` |
| `angle` | integer | *(none)* | Initial horn angle in degrees → quantized to steps at create |
| `path` | id | `short` | Default arc for absolute moves: `short`, `long`, `cw`, `ccw` |
| `text` | string | `''` | Panel label (up to 5 characters shown) |
| `color` | hex | `#6dff9c` | Accent color |
| `size` | integer | `10` | Glyph size (`1…20`) |
| `speed` | integer | `10` | Move speed on the panel (`1…100`) — see below |
| `rate` | integer | `10` | Speed scale in **tenths** (like `motor`) — see below |
| `rotate` | integer | `0` | Widget orientation: `0`, `90`, `180`, `270` |
| `flip` | flag | off | Mirror the glyph horizontally |
| `reversed` | flag | off | Swap which step index maps to which end of the range |
| `nl` | flag | off | Newline after the control |
| `on` | mode | `raise` | When property blocks run: `raise`, `edge`, `1`, `0` — **not** the position command |

### Steps vs degrees

Resolution on the panel: `step size ≈ (maxAngle − minAngle) / (2^length − 1)`.

| `length` | Steps | On `0…180°` | On `0…360°` |
|----------|-------|-------------|-------------|
| `8` | `0…255` | ~0.7° / step | ~1.4° / step |
| `16` | `0…65535` | fine | fine |

To command “about 90°” on `0…180` / `length: 8`, use step `128` (`10000000`), not the literal `90` on the wire.

### `speed` and `rate` (panel move only)

Two separate controls for how fast the horn **moves on the panel**. Neither changes stored steps, wires, PLC, or `:get`.

| | `speed` | `rate` |
|--|---------|--------|
| **Role** | clear move speed | scale multiplier (same idea as `motor`) |
| **Attribute** | yes (`1…100`, default `10`) | yes (`1…100`, default `10`) |
| **Pin** | yes — **7 bits**, override per move | no (attribute only) |

Effective panel factor:

```
factor = speed × (rate / 10)
```

Slew duration is proportional to `arc steps / factor`.

| `speed` | `rate` | Factor | Effect |
|---------|--------|--------|--------|
| `10` | `10` | `10` | normal (defaults) |
| `5` | `10` | `5` | slower (lower speed) |
| `10` | `5` | `5` | slower (scale 0.5×) |
| `10` | `20` | `20` | faster (scale 2×) |
| `50` | `10` | `50` | much faster (nearly instant) |

Compare with `motor`: there `value` is the speed command; on servo `value` is **position** and `speed` is the move-speed analogue.

---

## Pins and pouts

| Name | Width | Role |
|------|-------|------|
| `set` | 1 | Enable a property-block write when `1` |
| `value` | `length` | Step magnitude — meaning depends on `rel` |
| `path` | 2 | Arc override for this move only (see below) |
| `rel` | 1 | `0` = absolute (default), `1` = relative |
| `speed` | 7 | Move-speed override for this move only (`0…127` → clamp `1…100`) |
| `get` | `length` | Read back stored **position in steps** |

Direct assignment `.arm = expr` writes an **absolute** step index (same width as `length`). Default arc = attribute `path`.

Property block:

```
.arm:{ value = posWire, path = pathWire, speed = speedWire, rel = relBit, set = 1 }
```

If `path` or `speed` is omitted in a block, the component attribute is used for that move only (not sticky).

`on:` on the component only controls **when** the block applies — not the target position.

For **two commands** in one Load & Run, use two property blocks (or `session.execStmts` from tests). A direct assignment `.arm = …` in the same script does not run a following `{ … set = 1 }` block on that component.

### Pin `path` encoding

| Binary | Mode |
|--------|------|
| `00` | `short` — shortest arc (default attribute) |
| `01` | `long` — longest arc |
| `10` | `cw` — clockwise forced |
| `11` | `ccw` — counter-clockwise forced |

If the `path` pin is omitted in a block, the attribute `path` is used. The override applies to **one move** only.

---

## Absolute moves (`rel = 0`)

`value` = target step index `0…2^N−1`.

On a **segment** (`maxAngle − minAngle < 360`), there is only one path along the range; `short` / `long` behave the same.

On a **full circle** (`maxAngle − minAngle = 360`, e.g. `0…360`), two arcs exist between any two positions:

| `path` | Example `250 → 5` (on 256 steps) |
|--------|----------------------------------|
| `short` | 11 steps forward |
| `long` | 245 steps backward |
| `cw` / `ccw` | forced direction |

```logts-play
comp [servo] .yaw:
  length: 8
  minAngle: 0
  maxAngle: 360
  angle: 355
  path: short
  text: 'Yaw'
  nl
  :

.yaw:{ value = 00000000, set = 1 }
8wire p = .yaw:get
show(p)
```

Load & Run: horn takes the **short** arc toward step `0`; `p` is `00000000`.

```logts-play
comp [servo] .yaw:
  length: 8
  minAngle: 0
  maxAngle: 360
  path: long
  on: 1
  nl
  :

.yaw:{ value = 11111010, set = 1 }
.yaw:{ value = 00000101, path = 01, set = 1 }
8wire p = .yaw:get
show(p)
```

Load & Run: first block moves to step `250`; second uses pin `path = 01` (`long`) to reach step `5`; `p` is `00000101`.

---

## Relative moves (`rel = 1`)

`value` = **|Δ steps|** (not degrees). **`path` must be `cw` or `ccw`** (`10` / `11` on the pin). `short` / `long` with `rel = 1` → error.

| `path` | Effect |
|--------|--------|
| `cw` (`10`) | Add `value` steps |
| `ccw` (`11`) | Subtract `value` steps |

After the math:

- **Span 360°** → wrap step index modulo `2^N`
- **Segment** → clamp to `0…2^N−1`

`:get` returns the new absolute step index.

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  on: 1
  nl
  :

.arm:{ value = 00001110, path = 10, rel = 1, set = 1 }
8wire p = .arm:get
show(p)
```

Load & Run: `+14` steps from `0`; `p` is `00001110`.

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  on: 1
  nl
  :

.arm:{ value = 00001010, set = 1 }
.arm:{ value = 00010000, path = 11, rel = 1, set = 1 }
8wire p = .arm:get
show(p)
```

Load & Run: start at step `10`, subtract `16` steps → clamp at `0`; `p` is `00000000`.

```logts-play
comp [servo] .yaw:
  length: 8
  minAngle: 0
  maxAngle: 360
  on: 1
  nl
  :

.yaw:{ value = 11111111, set = 1 }
.yaw:{ value = 00000001, path = 10, rel = 1, set = 1 }
8wire p = .yaw:get
show(p)
```

Load & Run: from step `255`, `+1` step cw wraps to `0`; `p` is `00000000`.

---

## Initial position (`angle`)

```logts-play
comp [servo] .arm1:
  length: 8
  minAngle: 0
  maxAngle: 180
  angle: 90
  text: 'Arm'
  nl
  :

8wire p = .arm1:get
show(p)
```

Load & Run: horn starts near 90°; `p` is `10000000` (step `128`).

---

## Direct assignment

```logts-play
comp [servo] .arm1:
  length: 8
  minAngle: 0
  maxAngle: 180
  nl
  :

.arm1 = 10000000
8wire p = .arm1:get
show(p)
```

Load & Run: `p` is `10000000`. Arc = attribute `path`.

---

## Slider → servo (position + speed)

Two sliders: one for **target steps**, one for **move speed** on the panel.

```logts-play
comp [slider] .pos:
  length: 8
  text: 'Pos'
  on: 1
  nl
  :

comp [slider] .spd:
  length: 7
  text: 'Spd'
  on: 1
  nl
  :

comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  speed: 10
  rate: 10
  text: 'Arm'
  on: 1
  nl
  :

.pos:{ data = 10000000, set = 1 }
.spd:{ data = 0001010, set = 1 }
8wire cmd = .pos:get
7wire spd = .spd:get
.arm:{ value = cmd, speed = spd, set = 1 }
8wire out = .arm:get
show(out)
show(spd)
```

Load & Run: horn moves to step `128` (`10000000`); panel slew uses pin `speed = 10` (`0001010`); `out` is `10000000`.

```logts-play
comp [slider] .pos:
  length: 8
  text: 'Pos'
  on: 1
  nl
  :

comp [slider] .spd:
  length: 7
  text: 'Spd'
  on: 1
  nl
  :

comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  speed: 10
  rate: 5
  text: 'Arm'
  on: 1
  nl
  :

.pos:{ data = 01000000, set = 1 }
.spd:{ data = 0001100, set = 1 }
8wire cmd = .pos:get
7wire spd = .spd:get
.arm:{ value = cmd, speed = spd, set = 1 }
8wire out = .arm:get
show(out)
show(spd)
```

Load & Run: position step `64` (`01000000`); move speed pin `12` (`0001100`); global `rate: 5` scales all moves on this component (factor 0.5×).

## Slider → servo (position only)

```logts-play
comp [slider] .pos:
  length: 8
  text: 'Pos'
  on: 1
  nl
  :

comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  text: 'Arm'
  on: 1
  nl
  :

.pos:{ data = 10000000, set = 1 }
8wire cmd = .pos:get
.arm:{ value = cmd, set = 1 }
8wire out = .arm:get
show(out)
```

Load & Run: slider step `128` drives the servo; `out` is `10000000`. Speed = attribute defaults (`speed: 10`, `rate: 10`).

## Slow moves (`rate` attribute)

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  speed: 10
  rate: 3
  on: 1
  nl
  :

.arm:{ value = 11111111, set = 1 }
8wire p = .arm:get
show(p)
```

Load & Run: `p` is `11111111` (max step). `rate: 3` only slows the **panel** (scale 0.3×); the stored command is unchanged.

## Display helpers (`size`, `speed`, `rate`, `rotate`, `color`)

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  size: 14
  speed: 20
  rate: 5
  color: ^6dff9c
  rotate: 90
  on: 1
  nl
  :

.arm:{ value = 11111111, set = 1 }
8wire p = .arm:get
show(p)
```

Load & Run: `p` is `11111111`. `speed: 20` and `rate: 5` affect panel slew only.

---

## Path from a DIP switch

```logts-play
comp [dip] .pathSel:
  length: 2
  text: 'P'
  on: 1
  nl
  :

comp [servo] .yaw:
  length: 8
  minAngle: 0
  maxAngle: 360
  path: short
  on: 1
  nl
  :

.pathSel:{ data = 10, set = 1 }
2wire pth = .pathSel:get
.yaw:{ value = 01111111, path = pth, set = 1 }
8wire pos = .yaw:get
show(pos)
show(pth)
```

Load & Run: DIP `10` selects `cw`; servo moves to step `127`; `pos` is `01111111`.

---

## `reversed` mapping

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  reversed
  nl
  :

.arm = 00000000
8wire p = .arm:get
show(p)
```

Load & Run: step `0` maps to the **maxAngle** side of the range on the panel; `p` is still `00000000`.

---


## 16-bit bus

```logts-play
comp [servo] .fine:
  length: 16
  minAngle: 0
  maxAngle: 360
  on: 1
  nl
  :

16wire cmd = 0000000000001000
.fine:{ value = cmd, set = 1 }
16wire p = .fine:get
show(p)
```

Load & Run: `p` matches `cmd` (`8` steps).

---

## PLC mapping (optional)

```logts-play
comp [switch] .start:
  text: 'Go'
  on: 1
  nl
  :

comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  on: 1
  nl
  :

comp [plc] .ctrl:
  scanTime: 0
  inputs: { START = .start }
  outputs: { ARM = .arm }
  on: 1
  :

.ctrl:{ set = 1 }
8wire pos = .arm:get
show(pos)
```

Load & Run: with START on, PLC writes the servo output symbol; width must match `length`.

---

## Related

- [motor.md](motor.md) — continuous spin output (speed, not position)
- [slider.md](slider.md) — panel input for step values
- [led.md](led.md) — same output contract shape (`value` / `set` / `:get`)
- [sensor.md](sensor.md) — panel inputs including `kind: wheel` for dials
