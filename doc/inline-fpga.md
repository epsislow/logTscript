# Inline FPGA — `inline [fpga]`

`inline [fpga]` defines a **digital fabric**: LUT configurations, optional FF/RAM banks, and static routing. It is a **definition only** until you run it through [`comp [fpga]`](comp-fpga.md) or call **`:eval`** for a single simulation step.

Documentation viewer **logts-play** blocks support **Load** and **Load & Run** (use `on: 1` on the component so the first run fires when `set = 1`).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Syntax** | `inline [fpga] .name:` … closing `:` |
| **LUT banks** | `cell lut[N] like lut.and` (and other configs) |
| **Routing** | `lut.in0 = …`, `lut.in1 = …`, `out = …` (compact literals) |
| **ID width** | `lut.inIdBits = 8` (default 8 if omitted) |
| **Built-in LUTs** | `lut.not`, `lut.and`, `lut.or`, `lut.xor` |
| **`:eval`** | `.name:eval(inputs, clock[, seqState])` — stateless step; see below |
| **Doc** | `doc(inline.fpga)`, `doc(.myDesign)` |

---

## Minimal empty design

```logts-play
inline [fpga] .empty:
:

doc(.empty)
```

---

## One LUT AND gate (2 inputs, 1 output)

Routing uses decimal literals with `;8` padding (same rules as [wire literals](wire-literals.md)). Source **0** and **1** are fabric inputs; LUT output is source **2**.

```logts-play
inline [fpga] .andGate:
  lut.inIdBits = 8
  cell lut[1] like lut.and
  lut.in0 = \0;8
  lut.in1 = \1;8
  out = \2;8
:
```

### `:eval` (combinational step)

Return width is always **`outWidth + seqStateWidth`**. For this design: **1 + 1 = 2** bits (`out` then `prevClock`).

```logts-play
inline [fpga] .andGate:
  lut.inIdBits = 8
  cell lut[1] like lut.and
  lut.in0 = \0;8
  lut.in1 = \1;8
  out = \2;8
:

2wire ins = 11
1wire clk = 0
1wire y, 1wire prevClk = .andGate:eval(ins, clk)
show(y)
show(prevClk)
```

Use **multi-assign** when the left-hand side matches the full return width. A strict `=` assign with a shorter LHS follows normal [assignment operators](assignment-operators.md) rules.

---

## Custom LUT table

```logts
lut.myXor = { 00 -> 0; 01 -> 1; 10 -> 1; 11 -> 0 }
cell lut[4] like lut.myXor
```

---

## Combinational loops

Pure LUT cycles (for example LUT0 → LUT1 → LUT0 with no FF/RAM) are rejected at elaboration with a configuration error.

---

## Related

- [comp-fpga.md](comp-fpga.md) — runtime wiring, `clock =`, exec block
- [wire-literals.md](wire-literals.md) — `\N;W`, `xc^…`, binary routing literals
