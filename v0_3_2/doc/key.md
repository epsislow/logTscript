# Key component

`comp [key]` is an interactive panel button. Output is **1 bit** on property `:get`. Uses `onPress` / `onRelease` in the engine (unlike switch/dip which use `onChange`).

Signature: `doc(comp.key)` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

```
comp [key] .name:
  label: 'A'
  size: 36
  type: 1
  nl
  :
```

Minimal:

```
comp [key] .name::
```

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `label`   | string  | `''`    | Text on the button |
| `size`    | integer | `36`    | Button size (pixels) |
| `type`    | `0`/`1`/`2` | `0` | Interaction mode (see below) |
| `nl`      | flag    | (no)    | Newline after the button |

### `type` interaction modes

| `type` | Panel behaviour | `:get` output |
|--------|-----------------|---------------|
| `0` | Short click (auto-release ~150ms) | `1` while active, then `0` |
| `1` | Hold until mouse/touch up | `1` while held, `0` on release |
| `2` | Toggle/latch (like `clcd` `touchType: 3`) | `0` ↔ `1` on each press; release does not change output. Button stays visually on while output is `1`. |

---

## Output

- **1 bit**: `0` or `1` (depends on `type` and press state)

---

## Example — level-sensitive property block (type 1 hold)

```logts-play
comp [key] .btn:
  label: 'Go'
  type: 1
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

Hold the button to drive the LED block while `set` is `1`.

---

## Example — toggle (type 2)

```logts-play
comp [key] .pwr:
  label: 'P'
  type: 2
  on: 1
  :

comp [led] .on:
  length: 1
  color: ^0f9
  on: 1
  :

1wire led = .pwr

.on = led
```

Tap once to latch `1` (LED on); tap again for `0`.

---

## Notes

- Use **type 0** for short pulses; **type 1** for hold-while-pressed; **type 2** for latched toggle (similar to [switch.md](switch.md) but on a key widget).
- `probe(.btn)` tracks press/release in the Output panel — [debug.md](debug.md).
