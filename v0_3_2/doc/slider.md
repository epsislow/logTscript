# Slider component

`comp [slider]` is a **panel slider** for scalar N-bit values. The user drags a thumb along a track; the output is the step index as an unsigned binary value (`0 … 2^length − 1`).

Signature: `doc(comp.slider)` — see also [interactive-components.md](interactive-components.md).

---

## Syntax

```
comp [slider] .name:
  length: 8
  text: 'Operand'
  color: ^6dff9c
  orientation: 0
  reversed
  for: ['0','1','2','3']
  nl
  :
```

Minimal (4 bits, default):

```
comp [slider] .name::
```

---

## Attributes

| Attribute     | Type    | Default   | Description |
|---------------|---------|-----------|-------------|
| `length`      | integer | `4`       | Output width in bits (`Nwire`) |
| `text`        | string  | `''`      | Panel label (max 5 chars displayed) |
| `color`       | hex     | `#6dff9c` | Thumb and value accent color |
| `orientation` | `0`/`1` | `0`       | `0` horizontal (min left), `1` vertical (min bottom) |
| `reversed`    | flag    | (no)      | Swap which **value** sits at each end; drag direction unchanged. Default `0` appears at the opposite end (right / top) |
| `for`         | array   | —         | Optional label per step index (shown in panel instead of decimal) |
| `nl`          | flag    | (no)      | Newline after the control |

**Steps:** `2^length` (e.g. `length: 8` → 256 positions, `00000000` … `11111111`).

---

## Panel display vs debug

| Context | Display |
|---------|---------|
| **Panel** (`.slider-value`) | Decimal step index, or `for[state]` label when provided |
| **`show` / `peek` / `probe`** | Binary wire value |

---

## Output width

Output bits = `length` directly (unlike rotary, which uses `ceil(log₂(states))`).

| `length` | Wire width | Max value (decimal) |
|----------|------------|---------------------|
| 3        | `3wire`    | 7 (`111`) |
| 4        | `4wire`    | 15 (`1111`) |
| 8        | `8wire`    | 255 (`11111111`) |

Read with `.name:get` or `.name`.

### `reversed`

Drag always moves the thumb in the direction of the pointer. With `reversed`, only the **value mapping** changes: left/bottom outputs `max`, right/top outputs `0`. Initial value `0` places the thumb at the far end (right or top).

---

## Property block

Slider supports `set` and `data` pins like rotary:

```
comp [slider] .sel:
  length: 4
  on: 1
  :

.sel:{
  data = externalValue
  set = trigger
}
```

When `set = 1`, `data` drives the slider position.

---

## Example

```logts-play
comp [slider] .op:
  length: 4
  text: 'A'
  for: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']
  :

4wire val = .op:get
```

---

## Compared to dip and rotary

| Control | Best for |
|---------|----------|
| **dip** | Arbitrary bit patterns (each bit independent) |
| **rotary** | Few named states (`states` not necessarily `2^bits`) |
| **slider** | Many sequential values (`0 … 2^length−1`) with one drag control |
