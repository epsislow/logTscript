# Component color attributes

Panel components expose **color attributes** (`color`, `frameColor`, `bgColor`, `focusColor`, `colorFor`, …) to style glyphs on the devices panel. Each attribute accepts either:

- a **hex literal** — `^RRGGBB` or `^RGB` (same as before), or
- a **wire name** — the wire’s current value is read **once** when the `comp` line is elaborated.

Related: [wire literals](wire-literals.md) (hex on wires), [components](components.md) (catalog), [modes](modes.md) (`MODE STRICT` / `WIREWRITE`).

---

## Syntax

### Hex literal (unchanged)

```logts
comp [servo] .arm:
  color: ^6dff9c
  frameColor: ^888888
  bgColor: ^222222
  :
```

### Wire reference (snapshot)

```logts
24wire bgC = ^ffff00
24wire myColor = ^888888

comp [servo] .arm:
  display: servo
  length: 8
  frameColor: myColor
  bgColor: bgC
  :
```

The wire must be **declared and assigned before** the `comp` line (same rule as `comp [...] .x = myWire` for initial value).

---

## Snapshot rule (not reactive)

| When | What happens |
|------|----------------|
| `comp` elaboration | Each color attribute that names a wire reads `getWireEffectiveValue()` **once** and stores the resulting `#hex` string on the component |
| After `RUN` | Changing the wire in script or via propagation **does not** update the panel colors |

This is intentional: the component is defined once; only the value at creation time matters. It is **not** like `cpu.wait:` (a live wire name evaluated every step) or wave-driven property blocks.

To prove the snapshot in a script that reassigns wires, use `MODE WIREWRITE` (see [modes](modes.md)).

---

## Wire → CSS color conversion

| Wire init | Typical width | Panel color |
|-----------|---------------|-------------|
| `24wire c = ^ffff00` | 24 bits | `#ffff00` |
| `12wire c = ^888` | 12 bits | `#888` |
| `32wire c = ^AABBCCDD` | 32 bits | lower 24 bits → `#aabbcc` |

Rules:

- Wire binary is interpreted as an unsigned integer, then formatted as `#rrggbb` (3- or 6-digit hex).
- Bits `X` / `Z` in the wire at elaboration time → error.
- Undefined wire or wire with no value yet → error.

---

## Literal forms

| Form | Example | Notes |
|------|---------|-------|
| Hex on attribute | `color: ^ff0000` | Parsed directly as CSS hex |
| Wire on attribute | `bgColor: theme` | `theme` must be an existing wire |
| Indexed array (dip) | `colorFor.3: swatch` | Per-position color; wire or hex |
| Hex on wire init | `24wire t = ^aabbcc` | `^` is a **wire literal**, not an attribute — see [wire literals](wire-literals.md) |

---

## Components and attributes

| Component | Color attributes |
|-----------|------------------|
| `motor`, `servo` | `color`, `frameColor`, `bgColor` |
| `led`, `slider`, `rotary`, `sensor`, `terminal` | `color` |
| `scanner`, `keyboard` | `color`, `bgColor`, `focusColor`, `focusBgColor` (+ `pulseColor` on keyboard) |
| `clcd` | `color`, `bgColor`, `bgColorSym`, `touchColor` (component level); per-symbol `color` / `bgColor` in `= { … }` |
| `bar` / `ledBar` | `color`, `bgColor`, `lgColor` |
| `7seg`, `14seg`, `dots` | `color`, `bgColor`, `lgColor` |
| `dip` | `color`, `colorFor.N` |
| `lcd` | `color`, `pixelOnColor` (`bg` / `backgroundColor` stay plain strings, e.g. `transparent`) |

Per-component pages link here for details and examples.

---

## Runnable example

```logts-play
24wire bgC = ^ffff00
24wire myColor = ^888888

comp [servo] .arm:
  display: servo
  length: 8
  minAngle: 0
  maxAngle: 180
  text: 'Arm'
  frameColor: myColor
  bgColor: bgC
  on: 1
  :

.arm = 10000000
8wire p = .arm:get
show(p)
```

Load & Run: grey frame (`#888888`), yellow interior fill (`#ffff00`); `p` is `10000000`.

---

## DIP — `colorFor` with a wire

```logts-play
24wire onColor = ^ff0000

comp [dip] .sw:
  length: 4
  color: ^2ecc71
  colorFor.2: onColor
  :

4wire mode = .sw:get
show(mode)
```

Position `2` uses red when on; other positions use the default `color`.

---

## CLCD — symbol block colors

Inside `comp [clcd] … = { … }`, each symbol entry may set `color` and `bgColor` with the same rules as component-level attributes: `^hex` or a wire name (snapshot at `comp` elaboration).

```logts-play
24wire symFg = ^ffaa00
24wire symBg = ^332200

comp [clcd] .status:
  color: ^00ff00
  bgColor: ^001000
  = {
    warning:
      x: 90
      y: 10
      bit: 2
      color: symFg
      bgColor: symBg
    :
    power: x:10 y:10 bit:0 :
  }
  :

3wire flags = 101
.status = flags
```

When bit `2` is on, the `warning` icon uses `#ffaa00` on `#332200`; other symbols use the component defaults. Changing `symFg` after the `comp` line does **not** update the symbol colors.

See [clcd.md](clcd.md) for the full symbol catalog and syntax.

---

## See also

- [motor.md](motor.md) · [servo.md](servo.md) — three-color actuators
- [keyboard.md](keyboard.md) · [scanner.md](scanner.md) — focus colors
- [dip.md](dip.md) — `colorFor`
- [clcd.md](clcd.md) — component and per-symbol colors on the canvas
