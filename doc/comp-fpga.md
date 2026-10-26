# Component FPGA — `comp [fpga]`

`comp [fpga]` is the **runtime layer** for an `inline [fpga]` design with the **same instance name**. It reads input wires, runs combinational settling (and sequential logic when FF/RAM are present), and writes outputs when **`set`** is active (respecting **`on:`**).

Use **Load** and **Load & Run** in the documentation viewer on logts-play examples (`on: 1` recommended).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Link** | `comp [fpga] .design:` must match `inline [fpga] .design:` |
| **`clock =`** | **Required** — wire name (1 bit) |
| **`on:`** | `1` / `raise` / `edge` — same idea as [comp-logic.md](comp-logic.md) |
| **Exec block** | `.design:{ in0 = wire, out0 >= wire, set = trigger }` |
| **No header I/O** | Do not put `inputs =` / `output >=` in the comp header |
| **Doc** | `doc(comp.fpga)`, `doc(.design)` |

---

## AND gate wired to switches

```logts-play
inline [fpga] .andGate:
  lut.inIdBits = 8
  cell lut[1] like lut.and
  lut.in0 = \0;8
  lut.in1 = \1;8
  out = \2;8
:

1wire clk = 0
1wire inA = 1
1wire inB = 1
1wire trig = 1
1wire q = 0

comp [fpga] .andGate:
  on: 1
  clock = clk
:

.andGate:{ in0 = inA, in1 = inB, out0 >= q, set = trig }
show(q)
```

Change `inA` / `inB` and pulse `set` to re-evaluate the fabric.

---

## Pipeline

1. **Elaboration** — inline design is parsed; `doc(.design)` lists `outWidth`, `seqStateWidth`, `evalReturnWidth`.
2. **Exec block** — `inK =` copies wire values into fabric inputs; `outK >=` binds outputs after settle.
3. **`set`** — triggers combinational evaluation (per `on:`).
4. **`clock`** — required on every component; drives sequential state when FF/RAM exist.

---

## Related

- [inline-fpga.md](inline-fpga.md) — fabric definition and `:eval`
- [comp-logic.md](comp-logic.md) — similar exec / `on:` / `set` patterns
