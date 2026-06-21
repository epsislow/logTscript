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

## MUX in MODE ZSTATE

With `MODE ZSTATE` active:

| Operand | Validation |
|---------|------------|
| `sel` | Strict `0`/`1` — error on `Z` or `X` |
| Selected `dataK` | Error on **`X` only**; **`Z` allowed** (passed through to output) |
| Unselected `data` | Not validated |

When MUX output is assigned to a shared bus in the same wave step, bits `Z` in the contribution do not drive at merge (same rules as `ZCONNECT`). For enable-gated multi-bit drive, prefer **`ZCONNECT(bus, en, data)`** — [zstate.md](zstate.md).

**Load & Run** — `Z` in selected input:

```logts-play wave
MODE ZSTATE

1wire sel = 0
4wire d0 = ?Z01Z
4wire d1 = ?XXXX
4wire r = MUX(sel, d0, d1)
show(r)
```

---

## Typical uses

```
# ALU result select (mini-CPU pattern)
4wire y = MUX(op.1, .add:get, .sub:get)

# Toggle when p falls (hold vs invert)
tg0 = MUX(p, tg0, NOT(tg0))
```
