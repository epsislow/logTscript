# Built-in sequential functions

Stateful built-ins (no panel device). Index: [builtin-functions.md](builtin-functions.md)

---

## LATCH

```
LATCH(Xbit data, 1bit clock) -> Xbit
```

Transparent latch: when `clock = 1`, output follows `data`; when `clock = 0`, output holds.

### Runnable example

```logts-play
4wire data = 1010
1wire clk = 1
4wire out = LATCH(data, clk)
probe(out)
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
