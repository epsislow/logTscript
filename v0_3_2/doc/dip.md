# DIP switch component

`comp [dip]` is a **group of toggle switches** on one panel control. Each position is one bit; width is set by `length` (default `4`).

Signature: `doc(comp.dip)` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

```
comp [dip] .name:
  length: 4
  text: 'Inputs'
  color: ^2ecc71
  visual: 1
  noLabels
  nl
  :
```

Minimal (4 bits):

```
comp [dip] .name::
```

---

## Attributes

| Attribute  | Type    | Default   | Description |
|------------|---------|-----------|-------------|
| `length`   | integer | `4`       | Number of DIP positions (bits) |
| `text`     | string  | `''`      | Group label |
| `color`    | hex     | `#2ecc71` | Color when a position is on |
| `colorFor` | array   | —         | Per-position colors |
| `visual`   | `0`/`1` | `0`       | Show `0`/`1` on each position |
| `noLabels` | flag    | (no)      | Hide position labels |
| `noTrans`  | flag    | —         | Disable transition animation |
| `nl`       | flag    | (no)      | Newline after the control |

---

## Output

- **N bits** as one string, e.g. `1010` for `length: 4`
- Bit `0` is the **leftmost** position
- Default all zeros after **RUN**

---

## Reading

```
4wire all = .d:get
1wire bit0 = .d.0      # single bit (dip only)
1wire bit2 = .d.2
```

Use `Nwire` where `N = length`.

---

## Example

```logts-play
comp [dip] .sw:
  length: 4
  text: 'Mode'
  visual: 1
  :

4wire mode = .sw:get
show(mode)
```

Flip DIP positions in the panel after **RUN** — `mode` updates automatically.

---

## Notes

- Input only — not assignable from code.
- Bit slice `.name.N` works for **dip** only among panel inputs.
- `probe(.sw)` or `probe(.sw.0)` — [debug.md](debug.md).
