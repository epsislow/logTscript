# UI focus and hotkeys

Panel inputs can be driven from the keyboard while a simulation is **running**. Two mechanisms work together:

| Mechanism | Attribute | Components | Purpose |
|-----------|-----------|------------|---------|
| **Action hotkey** | `hotkey:` or `hotkeyFor.N:` | `key`, `switch`, `dip` | Toggle or press the control (same effect as clicking it in the Devices panel) |
| **Focus hotkey** | `focuskey:` | `keyboard`, `scanner` | Enter or leave text input focus on that widget |

See also: [key.md](key.md), [switch.md](switch.md), [dip.md](dip.md), [keyboard.md](keyboard.md), [scanner.md](scanner.md), [interactive-components.md](interactive-components.md).

---

## Devices panel focus

Action hotkeys run only when the **Devices panel has UI focus**:

1. Click inside the **Devices** panel (or press **Load & Run** and then click Devices) — the panel shows a green outline while focused.
2. Press a configured hotkey — matching controls fire in **script declaration order**.
3. Click the **editor** or outside Devices — hotkeys stop until you focus Devices again.

While a **keyboard** or **scanner** widget has text focus, action hotkeys are **blocked** (typed characters go to that widget instead).

**Escape** (built-in, not configurable):

| Level | When | Effect |
|-------|------|--------|
| 1 | Keyboard or scanner focused | Leave widget focus; Devices stays focused |
| 2 | Devices focused, no widget | Clear Devices focus (outline off) |
| 3 | Editor focused | Normal editor behaviour |

---

## `hotkey:` (key and switch)

Quoted string required:

```
comp [switch] .enable:
  hotkey: "e"
  on: 1
  :

comp [key] .fire:
  label: 'Fire'
  hotkey: "f"
  type: 2
  on: 1
  :
```

Hotkey dispatch uses the same callbacks as mouse/touch (`onChange` for switch, `onPress`/`onRelease` for key). Key `type` modes apply:

| `type` | Hotkey `keydown` | Hotkey `keyup` |
|--------|------------------|----------------|
| `0` | Short pulse (press + release) | — |
| `1` | Hold (`press`) | Release |
| `2` | Toggle | — |

**Load & Run**, focus the Devices panel, then press **e** / **f** — wires linked with `on: 1` update live.

```logts-play
comp [switch] .arm:
  text: 'Arm'
  hotkey: "a"
  on: 1
  :

comp [key] .go:
  label: 'Go'
  hotkey: "g"
  type: 2
  on: 1
  :

comp [led] .ready:
  color: ^e74
  on: 1
  :

comp [led] .goLed:
  color: ^2ecc71
  on: 1
  :

1wire armed = .arm
1wire go = .go

.ready = armed
.goLed = go
```

---

## `hotkeyFor.N:` (dip)

Per-position hotkeys — index **0-based** (same as `colorFor.N`), leftmost position = `hotkeyFor.0`:

```
comp [dip] .mode:
  length: 4
  hotkeyFor.0: "1"
  hotkeyFor.1: "2"
  hotkeyFor.2: "3"
  hotkeyFor.3: "4"
  on: 1
  :
```

Each hotkey **toggles** that bit (same as flipping the DIP in the panel).

**Load & Run**, focus Devices, press **2** — bit 1 toggles; `probe(.mode)` shows the new pattern.

```logts-play
comp [dip] .hex:
  length: 4
  text: 'Hex'
  hotkeyFor.0: "1"
  hotkeyFor.1: "2"
  hotkeyFor.2: "3"
  hotkeyFor.3: "4"
  on: 1
  :

comp [led] .d0:
  color: ^f39
  on: 1
  :

comp [led] .d1:
  color: ^349
  on: 1
  :

4wire pat = .hex
1wire b0 = .hex.0
1wire b1 = .hex.1

.d0 = b0
.d1 = b1

show(pat)
```

---

## Duplicate hotkeys

The same hotkey string may appear on **different** components — **all** matching actions run on each key press (non-hold first, in script order; then at most one `type: 1` hold).

Only **one** `key` with `type: 1` may use a given hotkey (parse error on the second).

`hotkey` and `focuskey` share one global key registry — the same key cannot be both (parse error).

Each `focuskey` must be unique (parse error on duplicate).

`Escape` cannot be used as `hotkey` or `focuskey` (reserved).

---

## Key matching

| Script | Matches | Does not match |
|--------|---------|----------------|
| `"1"` | Main keyboard `1` (`Digit1`) | Numpad `1` |
| `"a"` | `a` or `A` | — |
| `"F2"` | Function key F2 | — |

---

## `focuskey:` (keyboard and scanner)

Toggle focus on the widget (same as clicking it):

```
comp [keyboard] .term:
  label: 'Term'
  focuskey: "F2"
  allowEnter
  :

comp [scanner] .scan:
  focuskey: "F3"
  length: 8
  :
```

**Load & Run**, focus Devices, press **F2** — keyboard accepts typing; press **F2** again to leave. **Escape** also leaves widget focus.

```logts-play
comp [keyboard] .kbd:
  label: 'Code'
  focuskey: "F2"
  onlyDigits
  on: 1
  :

comp [led] .valid:
  color: ^2ecc71
  on: 1
  :

8wire code = .kbd
1wire ok = .kbd:valid

.valid = ok

show(code)
```

After **Load & Run**: focus Devices → **F2** → type digits → watch `:get` / `:valid` in the Output panel.

---

## CLCD touch symbol hotkeys

On `comp [clcd]` with **`touch: 1`**, each symbol with **`bitOut`** may define **`hotkey: "…"`** in its symbol block. Dispatch mirrors **`touchType`** (see [clcd.md](clcd.md)).

**Load & Run**, focus Devices, press the configured keys — `:out` updates without clicking the canvas.

Full detail and examples: [clcd.md — Symbol hotkeys](clcd.md#symbol-hotkeys).

---

## Quick reference

| Goal | Setup |
|------|--------|
| Toggle switch from keyboard | `hotkey: "…"` on `switch` + Devices focus |
| Fire / hold / latch a key | `hotkey: "…"` on `key` (respect `type`) |
| Flip one DIP bit | `hotkeyFor.N: "…"` on `dip` |
| Hotkey on CLCD touch symbol | `hotkey: "…"` in symbol block + `touch: 1` |
| Jump to keyboard input | `focuskey: "…"` on `keyboard` |
| Jump to scanner field | `focuskey: "…"` on `scanner` |
| Leave widget / Devices | **Escape** (built-in) |

Tests: **4609–4638** (panel hotkeys), **4650–4663** (CLCD touch hotkeys).
