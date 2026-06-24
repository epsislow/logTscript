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

When RX is full, incoming packets are **dropped silently** (`drops` increments); other receivers on the channel are unaffected.

`sizeWidth` = enough bits for `0 .. length` (same as [queue](queue.md)).

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

## Restrictions

- `comp [network]` only at **top level** (parse error in chip / pcb / board).
- Cannot assign directly to `.net`; use `:send`, `:pop`, `:clear`, `:set`.
- `send` + `pop` in the same property block → conflict (like queue `push` + `pop`).

---

## `probe` on another instance

`probe(.wifi:get)` on the **receiving** instance does not update from wire propagation when a packet arrives from another tab — the bus is outside the simulation graph. The editor **re-reads** probes when a packet is delivered (and when you switch to that tab). Probe history keeps earlier lines (`initialised`) and appends `changed` when the value updates.

See [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network) for a comparison table and a two-tab walkthrough.

---

## Related

- [queue.md](queue.md) — local FIFO (same pin/pout pattern, `push` instead of `send`)
- [meta-constants.md](meta-constants.md) — `/instance/`
- [editorUI.md](editorUI.md) — Inst slots, output per instance, probe vs network
