# Key component

`comp [key]` is a **momentary button**: output is `1` while pressed and `0` when released. Uses `onPress` / `onRelease` in the engine (unlike switch/dip which use `onChange`).

Signature: `doc(comp.key)` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

```
comp [key] .name:
  label: 'A'
  size: 36
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
| `type`    | integer | `0`     | Visual style variant |
| `nl`      | flag    | (no)    | Newline after the button |

---

## Output

- **1 bit**: `0` (released) or `1` (pressed)

---

## Example — level-sensitive property block

```logts-play
comp [key] .btn:
  label: 'Go'
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

## Notes

- Use **key** for pulses; use [switch.md](switch.md) for a latched state.
- `probe(.btn)` tracks press/release in the Output panel — [debug.md](debug.md).
