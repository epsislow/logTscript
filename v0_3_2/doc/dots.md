# Clock dots component (`dots`)

`comp [dots]` (shortname `comp [:]`) renders a **two-dot colon** (clock separator). Output is **2 bits** (`up`, `down`).

Signature: `doc(comp.dots)` or `doc(comp.:)`.

---

## Syntax

```
comp [dots] .name:
  color: ^f00
  bgColor: ^111
  scale: 2
  nl
  :
```

---

## Driving modes

| Pin | Width | Effect |
|-----|-------|--------|
| `data` | 2 | Direct `up`/`down` bits |
| `chr` | 8 | `:` or `.` maps to dot pattern |
| `up`, `down` | 1 each | Individual dot control |
| `set` | 1 | Enable property block |
| `get` | 2 | Read back state |

Direct assignment `= 2bit` or `= 11` for both dots on.

---

## Example

```logts-play
comp [dots] .colon:
  color: ^f00
  scale: 2
  nl
  on: 1
  :

.colon:{
  chr = 01011010
  set = 1
}
```

Character `:` lights both dots.

---

## Notes

- Often paired with [seven-seg.md](seven-seg.md) for clock displays.
- Not allowed in [chip.md](chip.md) bodies.
