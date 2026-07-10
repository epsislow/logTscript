# Built-in sequential functions

Stateful built-ins (no panel device). Index: [builtin-functions.md](builtin-functions.md)

---

## LATCH

```
LATCH(Xbit data, 1bit clock, 1bit clear) -> Xbit
```

Transparent latch: when `clock = 1`, output follows `data`; when `clock = 0`, output holds. `clear = 1` forces all zeros immediately (same as `REG`).

### Wire clock — level-sensitive

Use a regular wire as `clock`. While `clock = 1`, output tracks `data`; when `clock = 0`, output holds.

### NEXT clock — `~`

When `clock` is `~`, `LATCH` updates on each `NEXT(~)` (or `doNext()`):

- On each `NEXT(~)`: output ← **current** `data` (latch open — transparent)
- Between `NEXT` calls: output **holds** even if `data` changes
- `clear = 1` → all zeros immediately

Compare with `REG(data, ~, clr)`: `REG` latches the value `data` had **before** the `NEXT`; `LATCH` follows `data` **at** the `NEXT`. See [reg.md](reg.md) for `REG` clock modes.

### Runnable example (wire clock)

```logts-play
4wire data = 1010
1wire clk = 1
1wire clr = 0
4wire out = LATCH(data, clk, clr)
probe(out)
```

### Runnable example (`~` clock)

```logts-play
1wire data = 1
1wire clr = 0
1wire q = LATCH(data, ~, clr)
# q = 0 before any NEXT

NEXT(~)
# q = 1 (follows current data)

data = 0
# q = 1 (hold until NEXT)

NEXT(~)
# q = 0
```

---

## REG

```
REG(Xbit data, 1bit clock, 1bit clear) -> Xbit
```

Width is inferred from `data`. Falling-edge wire clock or `~` + `NEXT(~)`; `clear = 1` forces zero.

Full behaviour, examples, and `comp [reg]` comparison: **[reg.md](reg.md)**.

### Runnable example

```logts-play
4wire data = 1100
1wire clk = 0
1wire clr = 0
4wire out = REG(data, clk, clr)
probe(out)
```
