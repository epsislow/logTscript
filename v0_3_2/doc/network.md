# Network component

`comp [network]` is a **packet bus** between Run instances (1–5) in the same browser page. Each instance registers an RX FIFO on a named **channel**; `send` fan-outs to all other endpoints on that channel (the sender never receives its own packet).

Headless in v1 (no device panel), like `queue`. **Top-level only** — not allowed in chip, pcb, or board bodies.

See also: [meta constants — `/instance/`](meta-constants.md) for embedding the Run instance id in payloads.

---

## Syntax

```
comp [network] .wifi:
  width: 8
  length: 64
  channel: 'demo'
  on: 1
  :
```

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `width` | 128 | Bit width of each packet |
| `length` | 64 | RX FIFO capacity (packets) |
| `channel` | `'default'` | Bus channel name (string) |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Trigger (last bit `1` applies other pins in the block) |
| `send` | `width` | Packet to send on `channel` |
| `target` | 4 | Optional Run instance id (1–5) for unicast; omitted = broadcast to all others on `channel` |
| `pop` | 1 | Remove front RX packet when `1` |
| `clear` | 1 | Empty local RX FIFO when `1` |
| `get` | `width` | Peek at front RX packet (same as `front`) |
| `front` | `width` | Peek without `pop` |
| `empty` | 1 | `1` when RX has no packets |
| `full` | 1 | `1` when RX cannot accept another packet |
| `size` | `sizeWidth` | Current RX count (zero-padded) |
| `capacity` | `sizeWidth` | `length` in binary |
| `free` | `sizeWidth` | `length - size` |
| `drops` | variable | RX overflow counter (`count.toString(2)`; `0`→`0`, `4`→`100`) |
| `sendId` | variable | Last packet id sent from this endpoint (`id.toString(2)`; `0` before any send) |

When RX is full, incoming packets are **dropped silently** (`drops` increments); other receivers on the channel are unaffected.

`sizeWidth` = enough bits for `0 .. length` (same as [queue](queue.md)).

---

## Packet ids and `:sendId`

Every `send` on the bus gets a **global monotonic packet id** (integer 1, 2, 3, …). The counter is shared across all instances and channels on the page; it is **not** reset when you **Clear** the Network Traffic log or re-**Run** a script. It resets only on full page refresh.

| Where | Name | Meaning |
|-------|------|---------|
| Network Traffic panel | **Id** column | Same packet id for that send |
| Sender `comp [network]` | `:sendId` pout | Last packet id sent from **this** endpoint |

**`:sendId`** (read-only pout):

- Binary string, **dynamic width** (same encoding style as `:drops` — e.g. id `4` → `100`, id `2` → `10`).
- `0` before this endpoint has sent any packet.
- Updates on each successful `send` from that component (including sends with zero deliveries when `target` points at a missing endpoint).
- Matches the **Id** column for that send in **Win → Network Traffic**.

```logts-play
comp [network] .wifi:
  width: 8
  length: 8
  channel: 'demo'
  on: 1
  :

4wire lastId

.wifi:{ send = ^41
  set = 1 }

lastId = .wifi:sendId
show(lastId)
```

After the send above, `lastId` is `1` and the traffic log row shows **Id** `1`. A second send from the same endpoint yields `sendId` `10` (binary for decimal 2) and log **Id** `2`.

Packet ids are for tracing and UI only — they are **not** inserted into the RX FIFO and receivers cannot read them from `:get` / `:front`.

---

## Multi-instance behaviour

- Endpoints are keyed by **Run instance** + component device id.
- **Send** delivers to every endpoint on the same `channel`, **except** the sender.
- Receivers can be on another editor tab/instance; packets accumulate in RX until `pop` or `clear`.
- On re-Run or instance release, endpoints for that instance are removed (no stale delivery).
- No persistence across page refresh. No TCP/WebSocket — same page only.

### Addressing — broadcast vs unicast

- **`target` omitted** — fan-out to every endpoint on the same `channel`, except the sender (v1 behaviour).
- **`target` set** (4 bits, instance 1–5, same encoding as `/instance/`) — deliver only to that Run instance on the channel. Sender is still excluded. If no endpoint exists for that instance on the channel, the send is silent (no error).
- **`target` = 0 or > 5** — runtime error.

You can still put `dest` / `src` in the payload for application-level filtering when using broadcast.

```logts-play
comp [network] .net:
  width: 8
  length: 8
  channel: 'demo'
  on: 1
  :

.net:{ send = ^41
  target = 0010
  set = 1 }
```

Delivers only to Run instance **2** on `demo`.

### v1 payload addressing (optional)

## Example — send and peek

```logts-play
comp [network] .net:
  width: 8
  length: 8
  channel: 'demo'
  on: 1
  :

.net:{ send = ^41
  set = 1 }

8wire x = .net:get
show(x)
```

`:get` on the sender stays empty (exclude sender). Use two Run instances to see cross-instance delivery.

---

## Example — instance id in payload

```logts-play
4wire inst : /instance/

comp [network] .wifi:
  width: 8
  length: 16
  channel: 'demo'
  on: 1
  :

.wifi:{ send = inst
  set = 1 }
```

---

## Example — oscillator send every 2 seconds

**Load & Run** the example below, then open **Win → Network Traffic** (keep **Live** on). Every **2 seconds** (one full oscillator cycle) the rising `set` edge sends a packet on channel `demo`. The payload is `^FF` concatenated with the 4-bit **`:counter`** from `.o`. **Output** shows your Run **Inst** id from `/instance/`.

For a receiver on another tab, register the same `channel: 'demo'` on **Inst 2**, then watch **Network Traffic** or `probe(.wifi:get)` on that tab. See [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network).

```logts-play
4wire inst : /instance/
show(inst)

comp [network] .wifi:
  width: 20
  length: 16
  channel: 'demo'
  on: 1
  :

comp [~] .o:
  duration1: 4
  duration0: 4
  length: 4
  freq: 2
  freqIsSec: 1
  eachCycle: 1
  :

1wire o = .o

20wire pkg := ^FF + .o:counter

.wifi:{
  send = pkg
  set = o
  }
```

Oscillator timing: `freq: 2` with `freqIsSec: 1` → **2 s** per cycle; `eachCycle: 1` → `:counter` increments once per cycle. See [oscillator.md](oscillator.md).

---

## Restrictions

- `comp [network]` only at **top level** (parse error in chip / pcb / board).
- Cannot assign directly to `.net`; use `:send`, `:pop`, `:clear`, socket pins (`openSock`, `connSock`, `closeSock`, `port`), and `:set`.
- `send` + `pop` in the same property block → conflict (like queue `push` + `pop`).
- Socket ops (`openSock` / `connSock` / `closeSock`) cannot mix with FIFO ops (`send` / `pop` / `clear`) in one block.

---

## Network Traffic panel

Every `send` is logged globally (all instances). Socket lifecycle and data ops (`Open`, `Connect`, `Append`, `Consume`, `Close`) are logged separately in the **sockets** view. Open **Win → Network Traffic** and toggle **packets** / **sockets**. Packet **Id** uses the same global ids as `:sendId` on the sender (see [Packet ids and `:sendId`](#packet-ids-and-sendid)).

Full panel documentation: [network-traffic-panel.md](network-traffic-panel.md).

---

## `probe` on another instance

`probe(.wifi:get)` on the **receiving** instance does not update from wire propagation when a packet arrives from another tab — the bus is outside the simulation graph. The editor **re-reads** probes when a packet is delivered (and when you switch to that tab). Probe history keeps earlier lines (`initialised`) and appends `changed` when the value updates.

See [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network) for a comparison table and a two-tab walkthrough.

---

## Socket connections (shared `sock`)

Cross-instance **bitstream** between Run instances on the same `channel` — distinct from the packet FIFO (`send` / `get` / `pop`). A local [`sock`](sock.md) aliases a **shared buffer** in the network bus after bind.

| Pin / bind | Syntax | Role |
|------------|--------|------|
| `openSock` | **`openSock <- chat`** | Producer — publishes local `chat` on `port` |
| `connSock` | **`connSock -> chat`** | Consumer — connects to remote `(target, port)` |
| `port` | 8 bit (`1..255`) | Port number on the producer instance |
| `closeSock` | `closeSock = 1` | Tear down connection on `port` (bilateral) |

Use **`=`** for `port`, `target`, `set`, `closeSock`; use **`<-` / `->`** only for sock binds (not assignments).

**Precondition:** `BITSIZE(sock) === 0` at `openSock` / `connSock`.

**Buffer before connect:** producer may `chat << …` after `openSock` before the consumer calls `connSock`; the consumer sees accumulated bits immediately at connect.

### Permissions (connected)

| Role | Append (`sock <<`) | Consume (`wire << sock./N`) | Clear (`sock << clear`) | Peek / `BITSIZE` / `show` / `probe` |
|------|-------------------|-----------------------------|-------------------------|-------------------------------------|
| **Producer** (`openSock <-`) | yes | error | error | always |
| **Consumer** (`connSock ->`) | error | yes | error | always |

After **`closeSock`**: both ends **detached**; producer sock cleared; consumer keeps a **local snapshot**; reconnect requires `BITSIZE(sock) === 0` on both sides (`chat << clear` allowed only when detached).

In **Win → Network Traffic** (view **sockets**), each close is logged as **Close**. Consumer `closeSock` → **Graceful**; producer `closeSock` or **Stop** on either instance → **Abrupt**. **Source** on the **Close** row is the instance that initiated the close — see [network-traffic-panel.md — Who closed?](network-traffic-panel.md#who-closed-close-rows).

One socket operation per property block (`openSock` / `connSock` / `closeSock` / `send` / `pop` / `clear` are mutually exclusive).

### Example A — producer (single instance)

```logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ openSock <- chat
  port = 1
  set = 1 }

chat << ^41
show(BITSIZE(chat))
probe(chat)
```

### Example B — consumer with `on:1` (wave)

Run **Inst 1** (Example A) then **Inst 2** on the same `channel`.

```logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat
8wire byte : 0
1wire go : 0

.net:{ target = 1
  connSock -> chat
  port = 1
  set = 1 }

on:1 {
  AND(go, GT(BITSIZE(chat), 111)),
  byte << chat./8
}

go = 1
show(byte; u8)
```

### Example C — buffer pre-connect

Inst 1: `openSock` + `chat << ^41`. Inst 2: `connSock` → `BITSIZE(chat) = 8` immediately.

### Example D — `closeSock` (consumer, graceful)

Consumer disconnect: traffic log shows **Close**, **Source** = this instance, **Target** = producer, **Status** **Graceful**. Details: [network-traffic-panel.md — Who closed?](network-traffic-panel.md#who-closed-close-rows).

```logts-play wave
comp [network] .net:
  channel: 'sock-demo'
  on: 1
  :

sock chat

.net:{ target = 1
  connSock -> chat
  port = 1
  set = 1 }

.net:{ closeSock = 1
  port = 1
  set = 1 }

show(BITSIZE(chat))
```

### Example E — FIFO drain alternative (no socket mode)

Manual bridge from RX FIFO into a local sock — works today without socket pins:

```logts-play wave
comp [network] .net:
  width: 8
  length: 8
  channel: 'sock-demo'
  on: 1
  :

sock rx
1wire drain : 0

on:1 {
  AND(drain, NOT(.net:empty)),
  rx << .net:get,
  .net:{ pop = 1
    set = 1 }
}

drain = 1
show(BITSIZE(rx))
probe(rx)
```

See also: [`sock.md`](sock.md) — local buffer semantics and protocol consume.

---

## Related

- [queue.md](queue.md) — local FIFO (same pin/pout pattern, `push` instead of `send`)
- [meta-constants.md](meta-constants.md) — `/instance/`
- [network-traffic-panel.md](network-traffic-panel.md) — traffic log UI
- [editorUI.md](editorUI.md) — Inst slots, output per instance, probe vs network
