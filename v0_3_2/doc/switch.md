# Switch component

`comp [switch]` is a **toggle** input controlled from the devices panel. The value stays `0` or `1` until the user flips it again.

Signature: `doc(comp.switch)` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

```
comp [switch] .name:
  text: 'Label'
  nl
  :
```

Minimal:

```
comp [switch] .name::
```

---

## Attributes

| Attribute | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `text`    | string | `''`    | Label next to the switch |
| `nl`      | flag   | (no)    | Newline after the control |

---

## Output

- **1 bit**: `0` (off) or `1` (on)
- Default `0` after **RUN** unless initialized with `=`

Read with `.name` or `.name:get` (equivalent).

---

## Example

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

After **RUN**, toggle the switch in the panel — the LED updates without re-running the script.

---

## Notes

- Input only — you cannot assign `.name = 1` from code.
- Use **switch** for latched on/off; use [key.md](key.md) for momentary press.
- Panel updates propagate through wires — [signal-propagation.md](signal-propagation.md).
- Debug: `probe(.pwr)` or `probe(.pwr:get)` — [debug.md](debug.md).
