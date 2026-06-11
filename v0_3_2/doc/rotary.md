# Rotary selector component

`comp [rotary]` is a **rotary knob** on the panel. The user selects one of `states` positions; the output is the index as an unsigned binary value.

Signature: `doc(comp.rotary)` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

```
comp [rotary] .name:
  states: 8
  text: 'Channel'
  color: ^3498db
  for: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  nl
  :
```

Minimal:

```
comp [rotary] .name::
```

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `states`  | integer | `8`     | Number of positions (≥ 2) |
| `text`    | string  | `''`    | Label |
| `color`   | hex     | —       | Knob accent color |
| `for`     | array   | —       | Optional label per state |
| `nl`      | flag    | (no)    | Newline after control |

---

## Output width

Output bits = `ceil(log₂(states))`. Examples:

| `states` | Wire width | Max value |
|----------|------------|-----------|
| 4        | `2wire`    | `11` (3) |
| 8        | `3wire`    | `111` (7) |
| 16       | `4wire`    | `1111` (15) |

Read with `.name:get` or `.name`.

---

## Property block

Rotary supports `set` and `data` pins like other multi-bit components:

```
comp [rotary] .sel:
  states: 4
  on: 1
  :

.sel:{
  data = externalValue
  set = trigger
}
```

---

## Example

```logts-play
comp [rotary] .ch:
  states: 8
  text: 'CH'
  for: ['0','1','2','3','4','5','6','7']
  :

3wire idx = .ch:get
show(idx)
```

Turn the knob after **RUN** — `idx` shows the current position.

---

## Notes

- Panel control uses `onChange` when the selected state changes.
- Not allowed inside [chip.md](chip.md) bodies.
- `probe(.ch)` — [debug.md](debug.md).
