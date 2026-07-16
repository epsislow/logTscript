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

### `SOCKATTACHED(sock)`

Returns **`1`** when the sock is **live-connected** on the network bus (`openSock` / `connSock`). Returns **`0`** after detach, `closeSock`, or peer **Stop**.

```logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ openSock <- chat
  port = 1
  set = 1 }

1wire live = SOCKATTACHED(chat)
show(live)
```

Server chat hub: poll `SOCKATTACHED(upN)` to detect client leave — [network-chat.md](network-chat.md).

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

## Protocol + sock

Parse protocols accept a **sock** as the `data` argument. Two invoke forms:

| Invoke | On sock | On wire (unchanged) |
|--------|---------|---------------------|
| `{ data = rx }` | **Peek** — parse on snapshot; sock unchanged | Static bitstring copy |
| `{ data << rx }` | **Consume** — parsed bits removed from front; rollback on error | Not supported |

**Anti-pattern (Wave):** copying the whole payload into a wire after header parse — e.g. `payload << rx/(hdr:len)` — duplicates the stream and breaks incremental processing. Leave the tail in `rx` and parse or slice incrementally.

See also [protocol-parse.md — Parse from sock](protocol-parse.md#parse-from-sock).

---

## Example — protocol consume (wave)

Pattern **“parse until you cannot, then wait”**: `on:1` re-fires when append increases `BITSIZE(rx)`; `{ data << rx }` consumes only the header; payload stays in the sock.

```logts-play wave
inline [protocol] .parseHdr:
  mode: parse
  parseView: tree
  out:
    01001000
    opcode 4b
    len 8b
  :

sock rx
1wire ready : 0
20wire hdr : 0

on:1 {
  AND(ready, GT(BITSIZE(rx), 10011)),
  hdr =: .parseHdr { data << rx }
}

ready = 1
rx << 0100100010101100000111110000

show(BITSIZE(rx))
show(hdr:opcode)
```

After **Load & Run**: header (20 bit) is consumed; `BITSIZE(rx)` is 8 (payload tail); `show(hdr:opcode)` prints `1010`.

---

## Example — manual slice consume (wave)

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

## Probe and watch

Non-destructive debug on the live buffer — same display tags as wires (`; u8`, `; dec`, `; hex`, …). See [`debug.md`](debug.md).

```logts-play
sock rx
probe(rx)
watch(rx)
rx << ^FF
probe(rx; u8)
4wire hdr << rx./4
```

`probe(rx./4)` peeks the front slice; append and consume update probe/watch without extra assignments. Signal Trace (Wave Listen) logs sock commits as `commit sock rx`.

---

## Related

- [`queue.md`](queue.md) — FIFO elements vs bit stream
- [`network.md`](network.md) — socket connections (`openSock` / `connSock`) cross-instance
- [`protocol-parse.md`](protocol-parse.md) — `{ data = rx }` peek vs `{ data << rx }` consume
