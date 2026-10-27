# Inline FPGA — `inline [fpga]`

`inline [fpga]` defines a **digital fabric**: reusable **LUT** / **FF** / **RAM** configurations, **homogeneous cell banks**, and **static routing** between fabric sources. The block is a **definition** until you drive it with [`comp [fpga]`](comp-fpga.md) (runtime wires + clock) or **`:eval`** (single simulation step with optional **sequential state**).

Documentation **logts-play** blocks support **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Syntax** | `inline [fpga] .name:` … closing `:` |
| **Configs** | `lut.myFn = { … }`, `ff.d`, `ram.myRam = { address = N, data = M }` |
| **Banks** | `cell lut[N] like lut.and` (multiple lines flatten in order) |
| **Routing** | `lut.in0 = …`, `ff.d = …`, `ram.address = …`, `out = …` |
| **ID width** | `lut.inIdBits = 8` (defaults **8** for lut/ff/ram/inp/out if omitted) |
| **Built-in LUTs** | `lut.not`, `lut.and`, `lut.or`, `lut.xor` |
| **Built-in FF** | `ff.d` — 1-bit **D** flip-flop (clock from `:eval` or `comp`) |
| **`:eval`** | `.name:eval(inputs, clock[, seqStateIn])` → **`out` ∥ `seqStateOut`** |
| **Doc** | `doc(inline.fpga)`, `doc(.myDesign)` — widths and counts |

---

## Source ID namespace

Every routing line lists **source IDs** (compact [wire literals](wire-literals.md): `\3;8`, binary, `xc^…`). At elaboration, IDs are mapped to:

| Region | IDs | Role |
|--------|-----|------|
| **Fabric inputs** | `0 … inputPortCount−1` | External inputs (from `:eval` first bits or `comp` `inK`) |
| **LUT outputs** | `lutBase … lutBase+N−1` | One bit per LUT instance (flatten order) |
| **FF `Q`** | `ffBase … ffBase+F−1` | Stored sequential state (also in `seqState`) |
| **RAM read data** | `ramReadBase …` | Combinational read of `memory[address]` (one ID per data bit, MSB first) |

`lutBase = inputPortCount`, `ffBase = lutBase + (# LUT)`, `ramBase = ffBase + (# FF)`, `ramReadBase = ramBase + (# RAM instances)`.

**Tip:** `doc(.design)` prints `inputPortCount`, `seqStateWidth`, and `evalReturnWidth` after you load the inline block.

---

## Minimal empty design

```logts-play
inline [fpga] .empty:
:

doc(.empty)
```

---

## Single LUT AND gate

Sources **0** and **1** are inputs; LUT output is source **2**; `out` taps source **2**.

```logts-play
inline [fpga] .andGate:
  lut.inIdBits = 8
  cell lut[1] like lut.and
  lut.in0 = \0;8
  lut.in1 = \1;8
  out = \2;8
:
```

### `:eval` — combinational only

Return width = **`outWidth + seqStateWidth`**. Here **`seqStateWidth = 1`** (only **`prevClock`**, no FF/RAM).

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

With **`ins = 11`**, **`y = 1`**. **`prevClk`** is the clock bit remembered for the **next** `:eval` (edge detection).

---

## Multiple LUT banks + custom table

Banks **flatten in source order**. Example: three LUTs — **AND → XOR → NOT** (parity-style path).

Custom config (same body syntax as built-ins):

```logts
lut.parity3 = { 000 -> 0; 001 -> 1; 010 -> 1; 011 -> 0; 100 -> 1; 101 -> 0; 110 -> 0; 111 -> 1 }
```

```logts-play
inline [fpga] .parity3:
  lut.inIdBits = 8
  lut.parity3 = { 000 -> 0; 001 -> 1; 010 -> 1; 011 -> 0; 100 -> 1; 101 -> 0; 110 -> 0; 111 -> 1 }
  cell lut[1] like lut.and
  cell lut[1] like lut.xor
  cell lut[1] like lut.not
  lut.in0 = \0;8 \2;8 \3;8
  lut.in1 = \1;8 \1;8 \0;8
  out = \4;8
:

3wire ins = 101
1wire clk = 0
1wire p, 1wire prev = .parity3:eval(ins, clk)
show(p)
```

Inputs **`101`**: AND→1, XOR(1,0)→1, NOT(1)→**0** on **`p`** (three-input parity of **`101`**).

---

## Flip-flop `ff.d` and `seqState`

### Configuration and routing

```logts
cell ff[N] like ff.d;
ff.d = …    # one source ID per FF (D input), same flatten order as cell ff[…]
```

**`Q`** is source **`ffBase + index`**. Route **`out`** to **`Q`** when you want the registered output.

### `seqState` layout

**`seqStateWidth`** = **`1 + (# FF Q bits) + (RAM flat memory bits)`**.

| Segment | Width | Meaning |
|---------|-------|---------|
| **`prevClock`** | 1 | Clock bit from the **previous** `:eval` |
| **FF Q…** | 1 each | Current **`Q`** per `ff.d` (flatten order) |
| **RAM mem…** | `2^addr × data` per RAM | Flat memory words, address 0 … 2^addr−1 |

**Return order:** `[ comb outputs… | seqStateOut… ]` — same layout as **`seqStateIn`**.

**Rising edge:** `prevClock = 0` and **`clock = 1`** → each **`D`** (from `ff.d` routing) is captured into **`Q`**. After the step, **`prevClock`** becomes the current **`clock`**.

**Next step:** pass the full **`seqStateOut`** wire as the third argument **`seqStateIn`** (or use multi-assign to split **`out`** and **`seq`**).

### T flip-flop (toggle) — `:eval` walkthrough

One **`lut.not`**, one **`ff.d`**: **`D = NOT(Q)`**, **`out = Q`**.

```logts-play
inline [fpga] .tff:
  lut.inIdBits = 8
  cell lut[1] like lut.not
  cell ff[1] like ff.d
  lut.in0 = \1;8
  ff.d = \0;8
  out = \1;8
:

1wire ins = 0
1wire clk = 0
2wire seq = 00
1wire q, 2wire seqNext = .tff:eval(ins, clk, seq)
show(q)
show(seqNext)
```

Start **`seq = 00`** (`prevClock=0`, `Q=0`). First **Load & Run** uses **`clk = 0`** (no edge). Then in the play editor set **`clk = 1`**, **Load & Run** again: on a **0→1** edge **`Q`** toggles to **`1`** and **`q`** follows **`Q`**.

Multi-step in one script (reset **`seq`** explicitly):

```logts-play
inline [fpga] .tff:
  lut.inIdBits = 8
  cell lut[1] like lut.not
  cell ff[1] like ff.d
  lut.in0 = \1;8
  ff.d = \0;8
  out = \1;8
:

1wire ins = 0
1wire q0, 2wire s1 = .tff:eval(ins, 0, 00)
1wire q1, 2wire s2 = .tff:eval(ins, 1, s1)
1wire q2, 2wire s3 = .tff:eval(ins, 1, s2)
show(q0)
show(q1)
show(q2)
show(s3)
```

After **`s1`**, a rising clock captures **`Q=1`**; holding **`clk=1`** does not toggle again until **`clk`** returns to **`0`** and rises once more.

---

## RAM configuration and `seqState`

### RAM config block

```logts
ram.nibble = { address = 2, data = 4 }
cell ram[1] like ram.nibble
```

- **`address`**: width of the address port (in bits).
- **`data`**: width of each memory word.
- **`seqState`** holds **`2^address × data`** bits per RAM instance (flatten bank order).

### Routing ports

| Line | Meaning |
|------|---------|
| **`ram.address`** | `address` source IDs per RAM instance (MSB-first per word) |
| **`ram.dataIn`** | `data` source IDs for write data |
| **`ram.write`** | One source ID per RAM instance (write enable) |

**Write policy:** on a **rising clock**, if **`write = 1`**, `memory[address] := dataIn`.

**Read policy:** combinational — **`out`** may map to **`ramReadBase …`** IDs to expose `memory[address]` for the current address inputs.

### Small RAM — write then read

Seven fabric inputs: **`in0,in1`** = address, **`in2`** = write, **`in3…in6`** = nibble data.

```logts-play
inline [fpga] .nibbleRam:
  ram.nibble = { address = 2, data = 4 }
  cell ram[1] like ram.nibble
  ram.address = \0;8 \0;8
  ram.dataIn = \3;8 \4;8 \5;8 \6;8
  ram.write = \2;8
  out = \8;8 \9;8 \10;8 \11;8
:

doc(.nibbleRam)
```

```logts-play
inline [fpga] .nibbleRam:
  ram.nibble = { address = 2, data = 4 }
  cell ram[1] like ram.nibble
  ram.address = \0;8 \0;8
  ram.dataIn = \3;8 \4;8 \5;8 \6;8
  ram.write = \2;8
  out = \8;8 \9;8 \10;8 \11;8
:

21wire pack0 = .nibbleRam:eval(0011111, 1)
4wire read0, 17wire seq1 = pack0
21wire pack1 = .nibbleRam:eval(0010000, 0, seq1)
4wire read1, 17wire seq2 = pack1
show(read1)
```

**`0011111`**: address **`01`** (`in0=0`, `in1=1`), **`write=1`**, data **`1111`**. After the rising edge, read the same address with **`write=0`** (**`0010000`**) — **`read1`** shows the stored nibble.

---

## `:eval` arguments (summary)

```logts
PackWwire result = .design:eval(inputsWire, clockWire[, seqStateInWire])
```

| Argument | Required | Role |
|----------|----------|------|
| **`inputsWire`** | yes | **`inputPortCount`** bits — fabric inputs (pad with zeros if shorter) |
| **`clockWire`** | yes | Current clock bit; **`prevClock`** in **`seqStateIn`** enables **0→1** detection |
| **`seqStateInWire`** | no | Width **`seqStateWidth`**; omitted ⇒ all-zero state |

| **`doc(.design)` field** | Meaning |
|---------------------------|---------|
| **`outWidth`** | Combinational/register outputs on **`out`** |
| **`seqStateWidth`** | **`prevClock` + FF + RAM** |
| **`evalReturnWidth`** | **`outWidth + seqStateWidth`** (always returned) |

Use **multi-assign** or a single wire of width **`evalReturnWidth`**. See [assignment operators](assignment-operators.md) for **`=`** vs **`:=`** when LHS width differs.

---

## Combinational loops

Pure **LUT→LUT** cycles with no FF/RAM are rejected at elaboration (**`Combinational loop in LUT fabric`**). Feeding a LUT from **`Q`** or RAM read is allowed.

---

## Related

- [comp-fpga.md](comp-fpga.md) — **`clock =`**, exec **`inK` / `outK>=` / `set`**
- [wire-literals.md](wire-literals.md) — routing literals
- **`doc(inline.fpga)`** — kind overview
