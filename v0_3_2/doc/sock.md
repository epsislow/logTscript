# Socket (`sock`) — dynamic bit stream

`sock` is a **language type** (not a component) for a mutable serial bit buffer. Bits are stored as `0`/`1` only; append at the back, peek or consume from the front.

Compare with [`queue.md`](queue.md): queue holds fixed-width **elements**; sock holds a single **bitstream**.

---

## Declaration

```logts
sock rx              # sugar → 65536sock (65536 bit capacity)
65536sock rx         # explicit default capacity
1000sock tx          # cap = 1000 bit
```

| Form | Capacity |
|------|----------|
| `sock name` | 65536 bit |
| `Nsock name` | N bit |

---

## Append and clear

```logts-play
sock rx
rx << ^FF
rx << ^0F
show(rx)
rx << clear          # empty buffer (keyword clear only after <<)
# fallback:
rx:clear
```

Append rejects **`Z`/`X`** in the source bitstring (even in `MODE ZSTATE`).

---

## Peek vs consume

| Form | Semantics |
|------|-----------|
| `4wire x = rx./4` | **Peek** — first 4 bits; sock unchanged |
| `show(rx./8)` | Peek for display |
| `4wire x << rx./4` | **Consume** — assign wire and remove 4 bits from front |

Slice canonical form: **`rx./N`** (front N bits). Dynamic length: **`rx/(expr)`** — length evaluated at runtime from a wire expression (e.g. `4wire len : 0100` then `rx/(len)`). Sugar **`rx./(expr)`** is equivalent. Consume is **only** through `<<` on a wire target.

```logts-play
sock rx
rx << ^FF
4wire len : 0100
4wire peek = rx/(len)
4wire take << rx/(len)
show(BITSIZE(rx))
```

---

## Dynamic slice examples

```logts-play
sock rx
rx << ^F0F0
4wire n : 0100
4wire hdr = rx/(n)
show(hdr)
4wire body << rx/(4)
show(BITSIZE(rx))
```

`WWIDTH(rx/(8))` resolves the slice width at runtime (8 when eight bits are available).

---

## Builtins

On sock, **`BITSIZE(rx)`** and **`WWIDTH(rx)`** both report **runtime length** (bits stored now), not declared capacity. Empty sock → `0`.

```logts-play
sock rx
1wire bs = BITSIZE(rx)
1wire ww = WWIDTH(rx)
show(bs)
show(ww)
rx << ^FF
bs = BITSIZE(rx)
show(bs)
```

---

## Show / peek tags

Same display tags as wires (`; u8`, `; dec`, `; hex`, …). See [`debug.md`](debug.md).

```logts-play
sock rx
rx << ^FF
show(rx)
show(rx; u8)
show(rx; dec)
peek(rx; dec)
```

---

## Overflow / underflow

- **Overflow** — append would exceed `Nsock` cap → error
- **Underflow** — peek/consume more bits than stored → error

---

## Example — stream parse pattern

```logts-play
sock rx
rx << ^F0F0
4wire op = rx./4
show(op)
4wire op2 << rx./4
show(BITSIZE(rx))
```

After peek, `BITSIZE(rx)` stays 16; after consume, length drops by 4 each time.

---

## Example — conditional consume (wave)

```logts-play wave
sock rx
1wire ready : 0
4wire op : 0
on:1 { ready, op << rx./4 }
rx << ^F
ready = 1
show(op)
show(BITSIZE(rx))
```

---

## Related

- [`queue.md`](queue.md) — FIFO elements vs bit stream
- Faza 1.3 (planned): protocol parse `{ data << rx }`
