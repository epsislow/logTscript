# Built-in routing functions (MUX / DEMUX)

Selector width `N` is inferred from the `sel` argument at runtime → `2^N` data inputs (MUX) or outputs (DEMUX).

Index: [builtin-functions.md](builtin-functions.md)

---

## MUX

```
MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit
```

**Multiple data arguments** — pass `2^N` separate inputs after `sel`:

### Runnable example

```logts-play
1wire sel = 0
4wire a = 0001
4wire b = 0010
4wire y = MUX(sel, a, b)
probe(y)
```

**Packed data argument** — one bit-string split into `2^N` equal chunks:

### Runnable example

```logts-play
1wire sel = 1
8wire packed = 00010010
4wire y = MUX(sel, packed)
show(y)
```

---

## DEMUX

```
DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..
```

Returns **`2^N` values**: the selected output carries `data`, all others are zero (same width as `data`).

### Runnable example

```logts-play
1wire sel = 0
4wire data = 1010
4wire out0, 4wire out1 = DEMUX(sel, data)
probe(out0)
probe(out1)
```

---

## Typical uses

```
# ALU result select (mini-CPU pattern)
4wire y = MUX(op.1, .add:get, .sub:get)

# Toggle when p falls (hold vs invert)
tg0 = MUX(p, tg0, NOT(tg0))
```
