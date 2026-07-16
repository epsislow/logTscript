# Network Traffic panel

Open with **Win → Network Traffic**. The panel sits between **Timeline** and **Output** (same column as Output / Variables).

Use the **packets** / **sockets** toggle (left of **Pause**) to switch views. Each view has its own filters, pagination, pause/live state, and **Clear** scope.

## Packets view

The log is **global** — every `send` from all Run instances (1–5) in the page, not per tab. Backend keeps up to **200** entries; when full, the oldest **50** are trimmed. **Clear** empties the packet log only; the **Id** counter does **not** reset.

Each send gets a monotonic **packet id** (shown in the **Id** column). On the sender, `.wifi:sendId` returns the last id sent from that network component (binary). See [network.md — Packet ids and `:sendId`](network.md#packet-ids-and-sendid).

Bus semantics (`comp [network]`, channels, broadcast/unicast): [network.md](network.md). Editor run controls (**Run** / **Stop**, Inst slots): [editorUI.md](editorUI.md).

---

## Table columns (Packets)

| Column | Meaning |
|--------|---------|
| **Id** | Unique packet id (monotonic across the page) |
| **Source** | Run instance 1–5 that sent |
| **Target** | Instance 1–5, or `*` for broadcast |
| **Channel** | Bus channel name |
| **Size** | Packet width in bits |
| **Status** | `Received` (blue) if ≥1 receiver got it; `Dropped` (red) if none |

New rows briefly **flash** (blue tint for Received, dark red for Dropped) when they appear in **Live** mode.

**Click a row** to expand the payload — same formatting as `show()` for that wire width (wide values wrap).

---

## Sockets view

The **sockets** view logs **socket events** globally (all instances): `Open`, `Connect`, `Append`, `Consume`, and `Close`. Each row is one event; closed sessions stay visible via **Close** rows.

Backend keeps up to **500** entries; when full, the oldest **100** are trimmed. **Clear** empties the socket log only; the **Id** counter does **not** reset (independent from the packet log).

Socket connections (`openSock`, `connSock`, `closeSock`, stream `<<` on shared socks): [network.md — Socket connections](network.md#socket-connections-shared-sock).

### Table columns (Sockets)

| Column | Meaning |
|--------|---------|
| **Id** | Monotonic event id (socket log only) |
| **Event** | `Open` · `Connect` · `Append` · `Consume` · `Close` |
| **Source** | Run instance that originated the event |
| **Target** | Peer instance, or `—` when not connected (e.g. pre-connect **Append**) |
| **Channel** | Socket channel name |
| **Port** | Socket port number |
| **Size** | Bit length moved in this event (payload or close snapshot) |
| **Buf** | Shared buffer length after the event |
| **Status** | `Open` · `Connected` · `Graceful` · `Abrupt` |

**Click a row** to expand bit data on **Append**, **Consume**, and **Close** (same wrap rules as packet payload).

Pre-connect appends (producer buffer before `connSock`) log **Target** `—` and **Status** `Open`. Consumer **closeSock** → **Close** with **Graceful**; producer close or instance unregister → **Abrupt**.

---

## Toolbar

| Control | Action |
|---------|--------|
| **packets** / **sockets** | Toggle view (cyan = packets, violet = sockets). Switching **pauses** the previous view and starts **Live** on the new one. |
| **Pause** / **Live** | Toggle live updates for the **active** view. In **Pause**, the title shows **Network Traffic (paused)**; new events are still logged but the table does not redraw until **Live**. |
| **Clear** | Empty the log for the **active** view only (packet or socket Ids keep counting) |

While **paused**, pagination and filters use a **frozen snapshot** of the log at pause time — page numbers do not shift when new events arrive in the background. **Live** refreshes to the current log.

---

## Pagination

- **5 rows** per page, newest first (Id descending).
- `[ < ]` `[ > ]` — previous / next page.
- Summary: `Rows: X - Y . Shown N of Total` (positions in the **filtered** list).

---

## Column filters

Click a column header to open the filter bar (`>` apply, `x` clear, **Esc** close). A column with an active filter has a **blue** header (the filter value is not shown in the header).

### Packets

| Column | Filter type | Examples |
|--------|-------------|----------|
| **Id** | Single id or range | `23` · `1 - 20` |
| **Source** | Single or range | `2` · `1 - 5` |
| **Target** | Single, range, or broadcast | `*` · `2` · `1 - 3` |
| **Size** | Single or range | `8` · `128 - 200` |
| **Channel** | Substring (case-insensitive) | `demo` |
| **Status** | Dropdown | `Received` · `Dropped` |

### Sockets

| Column | Filter type | Examples |
|--------|-------------|----------|
| **Id** | Single id or range | `23` · `1 - 20` |
| **Event** | Dropdown | `Append` · `Close` |
| **Source** | Single or range | `2` · `1 - 5` |
| **Target** | Instance, range, or `—` | `—` · `2` · `1 - 3` |
| **Port** | Single or range | `1` · `1 - 10` |
| **Size** / **Buf** | Single or range | `8` · `0 - 64` |
| **Channel** | Substring (case-insensitive) | `demo` |
| **Status** | Dropdown | `Connected` · `Graceful` · `Abrupt` |

Numeric filters accept `23` or `1 - 20` (spaces around `-` optional; reversed ranges work). Invalid text matches nothing.

Filters combine (AND). One active filter per column.

---

## Related behaviour

- **Stop** on a Run instance unregisters its network endpoints; open sockets on that instance close as **Abrupt**. **Stop** does not clear either traffic log.
- Packet traffic is logged on every `send` attempt, including **Dropped** (no receiver, RX full, or unicast to a missing instance).
- `probe` on a receiving instance is refreshed when a packet arrives — see [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network).

---

## Related

- [network.md](network.md) — `comp [network]` component and socket connections
- [editorUI.md](editorUI.md) — Run / Stop, panels overview, Inst slots
