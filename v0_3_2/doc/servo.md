# Servo component

`comp [servo]` is a **panel output** that shows a positional actuator. You drive it from LogTscript with wires and assignments (same I/O style as `led` / `motor`). Mapping it into `comp [plc]` `outputs:` is optional — see [plc.md](plc.md).

Signature: `doc(comp.servo)`.

The stored value is an **unsigned N-bit step index** on a travel range — **not degrees on the wire**:

| Stored steps | Meaning |
|--------------|---------|
| `0` | One end of the travel (`minAngle`) |
| `2^N−1` | The other end (`maxAngle`) |
| between | Linearly mapped position on the range |

Attributes `minAngle` / `maxAngle` define the travel ends for the panel. Names are historical (degrees for a rotary horn). The wire always carries **steps**. Attribute `display` chooses the **skin and how absolute moves animate** on the panel (`servo`, `gauge`, `piston`, `valve`, or `slide`). Pins, pouts, and step storage stay the same for all of them.

---

## Syntax

```
comp [servo] .name:
  length: 8
  display: servo
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

Minimal (rotary horn, 8-bit, `0…180°`, default path):

```
comp [servo] .arm::
```

---

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `length` | integer | `8` | Wire width `1…16`. Value = step index `0…2^N−1` |
| `display` | id | `servo` | Panel skin + absolute kinematics: `servo`, `gauge`, `piston`, `valve`, `slide` |
| `minAngle` | integer | `0` | Travel start (`-360…360`) — mapped to step `0` |
| `maxAngle` | integer | `180` | Travel end; must be `> minAngle`, span `≤ 360` — mapped to step `2^N−1` |
| `angle` | integer | *(none)* | Initial position on the travel range → quantized to steps at create |
| `path` | id | `short` | Default direction for moves: `short`, `long`, `cw`, `ccw` (see Display) |
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

### `display` — skin and absolute travel

Two **kinematics families**; skins differ only in how the panel looks:

| Family | Displays | Absolute travel |
|--------|----------|-----------------|
| **Rotary** | `servo`, `gauge` | Arc on the angle range; on a full circle (`span = 360`) `path` can pick **short / long / cw / ccw** |
| **Linear** | `piston`, `valve`, `slide` | **One** path along the segment; `short` / `long` do **not** change the route |

| `display` | Panel look | Same kinematics as | Typical use |
|-----------|------------|--------------------|-------------|
| `servo` (default) | Horn on a base | rotary | Actuator / arm you command |
| `gauge` | Dial face + needle | rotary (`servo`) | Indicator / setpoint on a scale |
| `piston` | Cylinder + rod | linear | Hydraulic / pneumatic travel |
| `valve` | Pipe body + disc | linear | Open ↔ closed flow |
| `slide` | Frame + sliding panel | linear (`piston`) | Panel that **translates** (not a hinged door) |

Relative moves (`rel = 1`) are the same on every display: `path` must be `cw` or `ccw` → ±steps; wrap only for **rotary + span 360**, otherwise **clamp**.

**`servo` vs `gauge`:** same step math and arcs; `servo` looks like a horn actuator, `gauge` like an instrument needle on a dial.

**`piston` vs `valve` vs `slide`:** same linear step math; glyphs differ — rod in a barrel, butterfly disc, or a panel that slides in a frame. Use `rotate: 90` on `slide` for vertical travel (left–right by default).

`minAngle` / `maxAngle` still mark the two ends (historical names):

| End | `servo` / `gauge` | `piston` | `valve` | `slide` |
|-----|-------------------|----------|---------|---------|
| `minAngle` | start on dial / horn | retracted | closed | panel covering the opening |
| `maxAngle` | end on dial / horn | extended | open | panel retracted |

You may still set `path: short` (or pass the `path` pin) on a linear absolute move: it is **accepted** and does not error; absolute animation uses the single segment path. For relative moves, `cw` / `ccw` remain required on all displays.

```logts-play
comp [servo] .arm:
  display: servo
  length: 8
  minAngle: 0
  maxAngle: 180
  text: 'Arm'
  nl
  :

.arm = 10000000
8wire p = .arm:get
show(p)
```

Load & Run: rotary horn skin; `p` is `10000000`.

```logts-play
comp [servo] .g1:
  display: gauge
  length: 8
  minAngle: 0
  maxAngle: 180
  text: 'G'
  nl
  :

.g1 = 10000000
8wire p = .g1:get
show(p)
```

Load & Run: dial needle at mid travel; `p` is `10000000`.

```logts-play
comp [servo] .cyl:
  display: piston
  length: 8
  minAngle: 0
  maxAngle: 100
  text: 'Cyl'
  speed: 10
  nl
  :

.cyl = 11111111
8wire p = .cyl:get
show(p)
```

Load & Run: piston fully extended (max step); `p` is `11111111`.

```logts-play
comp [servo] .v1:
  display: valve
  length: 1
  text: 'V'
  nl
  :

.v1 = 1
1wire p = .v1:get
show(p)
```

Load & Run: 1-bit valve open; `p` is `1`.

```logts-play
comp [servo] .s1:
  display: slide
  length: 8
  minAngle: 0
  maxAngle: 100
  text: 'Sld'
  nl
  :

.s1 = 11111111
8wire p = .s1:get
show(p)
```

Load & Run: sliding panel fully open (max step); `p` is `11111111`.

```logts-play
comp [servo] .sVert:
  display: slide
  length: 8
  rotate: 90
  text: 'Up'
  nl
  :

.sVert = 10000000
8wire p = .sVert:get
show(p)
```

Load & Run: same `slide` skin, `rotate: 90` makes travel look vertical; `p` is `10000000`.

### Steps vs degrees

Resolution on the panel: `step size ≈ (maxAngle − minAngle) / (2^length − 1)`.

| `length` | Steps | On `0…180°` | On `0…360°` |
|----------|-------|-------------|-------------|
| `8` | `0…255` | ~0.7° / step | ~1.4° / step |
| `16` | `0…65535` | fine | fine |

To command “about 90°” on `0…180` / `length: 8`, use step `128` (`10000000`), not the literal `90` on the wire.

### `speed` and `rate` (panel move only)

Two separate controls for how fast the actuator **moves on the panel**. Neither changes stored steps, wires, PLC, or `:get`.

| | `speed` | `rate` |
|--|---------|--------|
| **Role** | clear move speed | scale multiplier (same idea as `motor`) |
| **Attribute** | yes (`1…100`, default `10`) | yes (`1…100`, default `10`) |
| **Pin** | yes — **7 bits**, override per move | no (attribute only) |

Effective panel factor:

```
factor = speed × (rate / 10)
```

Slew duration is proportional to `travel steps / factor`.

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
| `path` | 2 | Direction / arc for this move (see Absolute / Relative / Display) |
| `rel` | 1 | `0` = absolute (default), `1` = relative |
| `speed` | 7 | Move-speed override for this move only (`0…127` → clamp `1…100`) |
| `moving` | 1 | `1` while the panel glyph is still moving; `0` when the current move has finished |
| `get` | `length` | Read back stored **position in steps** |

Direct assignment `.arm = expr` writes an **absolute** step index (same width as `length`). Default arc / direction = attribute `path`.

Property block:

```
.arm:{ value = posWire, path = pathWire, speed = speedWire, rel = relBit, set = 1 }
```

If `path` or `speed` is omitted in a block, the component attribute is used for that move only (not sticky).

`on:` on the component only controls **when** the block applies — not the target position.

For **two commands** in one Load & Run, use two property blocks (or `session.execStmts` from tests). A direct assignment `.arm = …` in the same script does not run a following `{ … set = 1 }` block on that component.

### `:moving`

`moving` is a **state pout** for the panel animation:

- `1` while the glyph is still slewing toward its current target
- `0` when the actuator has visually stopped

`moving` does **not** block new commands. If a new command arrives while already moving, the target updates and `moving` stays `1` until the last move finishes.

If a command causes **no effective movement** (same stored position / zero travel), `moving` stays `0`.

### Pin `path` encoding

| Binary | Mode |
|--------|------|
| `00` | `short` — shortest arc (rotary absolute on a full circle) |
| `01` | `long` — longest arc (rotary absolute on a full circle) |
| `10` | `cw` — clockwise (rotary) or **+steps** (relative / linear sense) |
| `11` | `ccw` — counter-clockwise (rotary) or **−steps** (relative / linear sense) |

If the `path` pin is omitted in a block, the attribute `path` is used. The override applies to **one move** only.

---

## Absolute moves (`rel = 0`)

`value` = target step index `0…2^N−1`.

**Rotary (`display: servo` or `gauge`):**

- On a **segment** (`maxAngle − minAngle < 360`), there is only one path along the range; `short` / `long` behave the same.
- On a **full circle** (`maxAngle − minAngle = 360`, e.g. `0…360`), two arcs exist between any two positions:

| `path` | Example `250 → 5` (on 256 steps) |
|--------|----------------------------------|
| `short` | 11 steps forward |
| `long` | 245 steps backward |
| `cw` / `ccw` | forced direction |

**Linear (`display: piston`, `valve`, or `slide`):** there is always **one** path from the current step to the target along the segment. Travel distance for animation is `|target − current|`. Attribute/pin `short` / `long` do not pick a second route.

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

```logts-play
comp [servo] .cyl:
  display: piston
  length: 8
  minAngle: 0
  maxAngle: 100
  on: 1
  nl
  :

.cyl:{ value = 00000000, set = 1 }
.cyl:{ value = 11111111, set = 1 }
8wire p = .cyl:get
show(p)
```

Load & Run: piston retracts then extends to max step; `p` is `11111111`.

---

## Relative moves (`rel = 1`)

`value` = **|Δ steps|** (not degrees). **`path` must be `cw` or `ccw`** (`10` / `11` on the pin). `short` / `long` with `rel = 1` → error.

| `path` | Effect |
|--------|--------|
| `cw` (`10`) | Add `value` steps |
| `ccw` (`11`) | Subtract `value` steps |

After the math:

- **Rotary + span 360°** → wrap step index modulo `2^N`
- **Rotary segment, or any linear display** (`piston` / `valve` / `slide`) → clamp to `0…2^N−1`

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

```logts-play
comp [servo] .cyl:
  display: piston
  length: 8
  minAngle: 0
  maxAngle: 100
  on: 1
  nl
  :

.cyl:{ value = 01000000, set = 1 }
.cyl:{ value = 00010000, path = 10, rel = 1, set = 1 }
8wire p = .cyl:get
show(p)
```

Load & Run: from step `64`, `+16` steps; `p` is `01010000`.

```logts-play
comp [servo] .v1:
  display: valve
  length: 8
  on: 1
  nl
  :

.v1:{ value = 11111111, set = 1 }
.v1:{ value = 00000010, path = 11, rel = 1, set = 1 }
8wire p = .v1:get
show(p)
```

Load & Run: from max open, `−2` steps; `p` is `11111101`.

---

## `:moving` while travelling

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  speed: 10
  rate: 10
  on: 1
  nl
  :

.arm:{ value = 11111111, set = 1 }
1wire mv = .arm:moving
show(mv)
```

Load & Run: `mv` is `1` because the horn has started moving toward the new target.

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  speed: 10
  rate: 10
  on: 1
  nl
  :

.arm:{ value = 11111111, set = 1 }
probe(.arm:moving)
```

Load & Run: `probe` first shows `1`, then returns to `0` after the panel animation completes.

```logts-play
comp [servo] .arm:
  length: 8
  minAngle: 0
  maxAngle: 180
  angle: 90
  on: 1
  nl
  :

.arm:{ value = 10000000, set = 1 }
1wire mv = .arm:moving
show(mv)
```

Load & Run: target equals the current stored position, so there is no visible move and `mv` stays `0`.

```logts-play
comp [servo] .cyl:
  display: piston
  length: 8
  speed: 10
  rate: 10
  on: 1
  nl
  :

.cyl:{ value = 11111111, set = 1 }
1wire mv = .cyl:moving
show(mv)
```

Load & Run: piston starts extending; `mv` is `1`.

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

## Slider → piston

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

comp [servo] .cyl:
  display: piston
  length: 8
  minAngle: 0
  maxAngle: 100
  text: 'Cyl'
  speed: 10
  rate: 10
  on: 1
  nl
  :

.pos:{ data = 11000000, set = 1 }
.spd:{ data = 0010100, set = 1 }
8wire cmd = .pos:get
7wire spd = .spd:get
.cyl:{ value = cmd, speed = spd, set = 1 }
8wire out = .cyl:get
show(out)
```

Load & Run: piston to step `192`; move speed pin `20`; `out` is `11000000`.

## Slider → valve

```logts-play
comp [slider] .open:
  length: 8
  text: 'Open'
  on: 1
  nl
  :

comp [servo] .v1:
  display: valve
  length: 8
  minAngle: 0
  maxAngle: 90
  text: 'Vlv'
  on: 1
  nl
  :

.open:{ data = 10000000, set = 1 }
8wire cmd = .open:get
.v1:{ value = cmd, set = 1 }
8wire out = .v1:get
show(out)
```

Load & Run: valve disc to mid travel (step `128`); `out` is `10000000`.

## Slider → gauge

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

comp [servo] .g1:
  display: gauge
  length: 8
  minAngle: 0
  maxAngle: 180
  text: 'G'
  speed: 10
  rate: 10
  on: 1
  nl
  :

.pos:{ data = 11000000, set = 1 }
.spd:{ data = 0001111, set = 1 }
8wire cmd = .pos:get
7wire spd = .spd:get
.g1:{ value = cmd, speed = spd, set = 1 }
8wire out = .g1:get
show(out)
```

Load & Run: needle to step `192`; move speed pin `15`; `out` is `11000000`.

## Slider → slide

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

comp [servo] .s1:
  display: slide
  length: 8
  minAngle: 0
  maxAngle: 100
  text: 'Sld'
  speed: 10
  rate: 10
  on: 1
  nl
  :

.pos:{ data = 01000000, set = 1 }
.spd:{ data = 0010100, set = 1 }
8wire cmd = .pos:get
7wire spd = .spd:get
.s1:{ value = cmd, speed = spd, set = 1 }
8wire out = .s1:get
show(out)
```

Load & Run: panel to step `64`; move speed pin `20`; `out` is `01000000`.

## Slider → slide (vertical via `rotate`)

```logts-play
comp [slider] .pos:
  length: 8
  text: 'Pos'
  on: 1
  nl
  :

comp [servo] .sVert:
  display: slide
  length: 8
  rotate: 90
  text: 'Up'
  on: 1
  nl
  :

.pos:{ data = 11110000, set = 1 }
8wire cmd = .pos:get
.sVert:{ value = cmd, set = 1 }
8wire out = .sVert:get
show(out)
```

Load & Run: vertical sliding panel to step `240`; `out` is `11110000`.

## Three displays side by side

```logts-play
comp [slider] .pos:
  length: 8
  text: 'Pos'
  on: 1
  nl
  :

comp [servo] .arm:
  display: servo
  length: 8
  text: 'Arm'
  on: 1
  nl
  :

comp [servo] .cyl:
  display: piston
  length: 8
  text: 'Cyl'
  on: 1
  nl
  :

comp [servo] .v1:
  display: valve
  length: 8
  text: 'Vlv'
  on: 1
  nl
  :

.pos:{ data = 01000000, set = 1 }
8wire cmd = .pos:get
.arm:{ value = cmd, set = 1 }
.cyl:{ value = cmd, set = 1 }
.v1:{ value = cmd, set = 1 }
8wire a = .arm:get
8wire c = .cyl:get
8wire v = .v1:get
show(a)
show(c)
show(v)
```

Load & Run: one slider drives horn, piston, and valve to step `64`; `a`, `c`, and `v` are `01000000`.

## Gauge and slide with one slider

```logts-play
comp [slider] .pos:
  length: 8
  text: 'Pos'
  on: 1
  nl
  :

comp [servo] .g1:
  display: gauge
  length: 8
  minAngle: 0
  maxAngle: 180
  text: 'G'
  on: 1
  nl
  :

comp [servo] .s1:
  display: slide
  length: 8
  text: 'Sld'
  on: 1
  nl
  :

.pos:{ data = 10000000, set = 1 }
8wire cmd = .pos:get
.g1:{ value = cmd, set = 1 }
.s1:{ value = cmd, set = 1 }
8wire g = .g1:get
8wire s = .s1:get
show(g)
show(s)
```

Load & Run: same step drives dial needle and sliding panel; `g` and `s` are `10000000`.

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
