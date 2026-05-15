# REG — Register Built-in Function

`REG` is a built-in stateful register. It stores a bit-string of any width and updates its output based on a clock signal or a NEXT cycle.

```
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
```

The bit width is inferred automatically from the `data` argument at runtime — no width suffix is needed.

---

## Parameters

| Parameter | Type  | Description |
|-----------|-------|-------------|
| `data`    | Xbit  | Value to store. Determines the register width. |
| `clock`   | 1bit or `~` | Controls when `data` is latched. See clock modes below. |
| `clear`   | 1bit  | Synchronous reset. When `1`, the output is immediately set to all zeros, regardless of clock. |

---

## Clock modes

### Wire clock — transparent latch

When `clock` is a regular wire, `REG` behaves as a **transparent latch**:

- `clock = 1` → output follows `data` immediately (transparent)
- `clock = 0` → output holds its last captured value
- `clear = 1` → output is forced to all zeros (overrides clock)

```
1wire data = 0
1wire clk  = 0
1wire clr  = 0
1wire q = REG(data, clk, clr)
# q = 0

data = 1
# q = 0  (clk is 0, hold)

clk = 1
# q = 1  (transparent: clk=1, data=1)

data = 0
# q = 0  (transparent: clk still 1, data changed)

clk = 0
# q = 0  (hold)

data = 1
# q = 0  (hold: clk=0, pending=1)

clk = 1
# q = 1  (transparent: clk=1, latches current data=1)
```

### NEXT clock — `~`

When `clock` is the special symbol `~`, `REG` behaves as an **edge-triggered register** that only updates on an explicit `NEXT(~)` call (or `doNext()`).

- On each `NEXT(~)`: output ← the value that `data` had during the previous cycle
- Wire changes to `data` between two NEXT calls **do not affect the output**
- `clear = 1` clears the pending value so the next NEXT produces all zeros

```
1wire data = 1
1wire q = REG(data, ~, 0)
# q = 0  (initial, before any NEXT)

NEXT(~)
# q = 1  (latched data=1 from previous cycle)

data = 0
# q = 1  (hold: ~ clock ignores wire changes)

NEXT(~)
# q = 0  (latched data=0 from previous cycle)
```

---

## Multi-bit registers

The register width is determined entirely by `data`. No suffix is required:

```
4wire  d4  = 1010
8wire  d8  = 11001100
16wire d16 = 1111000011110000

1wire clk = 0
1wire clr = 0

4wire  q4  = REG(d4,  clk, clr)
8wire  q8  = REG(d8,  clk, clr)
16wire q16 = REG(d16, clk, clr)
```

---

## Clear

`clear = 1` resets the output to all zeros immediately, regardless of the clock state:

```
4wire data = 1111
1wire clk  = 1
1wire clr  = 0
4wire q = REG(data, clk, clr)
# q = 1111  (clk=1, transparent)

clr = 1
# q = 0000  (clear overrides)

clr = 0
# q = 1111  (transparent again: clk=1, data=1111)
```

---

## Comparison with old REG1 / REG2 / REG3

The old fixed-width instructions `REG1`, `REG2`, `REG3` have been replaced by the single generic `REG`. The width is now inferred from `data` at runtime, just like `DEMUX` infers its selector width.

| Old syntax | New syntax |
|------------|------------|
| `REG1(data, clk, clr)` | `REG(data, clk, clr)` where `data` is `1wire` |
| `REG2(data, clk, clr)` | `REG(data, clk, clr)` where `data` is `2wire` |
| `REG3(data, clk, clr)` | `REG(data, clk, clr)` where `data` is `3wire` |
| `REGn(data, clk, clr)` | `REG(data, clk, clr)` where `data` is `nwire` |

---

## doc() support

```
doc(REG)
# REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
```

`REG` also appears in `doc(def)` alongside all other built-in functions:

```
doc(def)
# built-in:
# NOT, AND, OR, XOR, NXOR, NAND, NOR, EQ, LATCH, LSHIFT, RSHIFT, REG, MUX, DEMUX, ADD, ...
```
