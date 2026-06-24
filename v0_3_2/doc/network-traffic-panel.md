# Network Traffic panel

Open with **Win → Network Traffic**. The panel sits between **Timeline** and **Output** (same column as Output / Variables).

The log is **global** — every `send` from all Run instances (1–5) in the page, not per tab. Backend keeps up to **200** entries; when full, the oldest **50** are trimmed. **Clear** empties the log; the **Id** counter does **not** reset.

Each send gets a monotonic **packet id** (shown in the **Id** column). On the sender, `.wifi:sendId` returns the last id sent from that network component (binary). See [network.md — Packet ids and `:sendId`](network.md#packet-ids-and-sendid).

Bus semantics (`comp [network]`, channels, broadcast/unicast): [network.md](network.md). Editor run controls (**Run** / **Stop**, Inst slots): [editorUI.md](editorUI.md).

---

## Table columns

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

## Toolbar

| Control | Action |
|---------|--------|
| **Pause** / **Live** | Toggle live updates. In **Pause**, the title shows **Network Traffic (paused)**; new packets are still logged but the table does not redraw until **Live**. |
| **Clear** | Empty the log (Ids keep counting) |

While **paused**, pagination and filters use a **frozen snapshot** of the log at pause time — page numbers do not shift when new packets arrive in the background. **Live** refreshes to the current log.

---

## Pagination

- **5 rows** per page, newest first (Id descending).
- `[ < ]` `[ > ]` — previous / next page.
- Summary: `Rows: X - Y . Shown N of Total` (positions in the **filtered** list).

---

## Column filters

Click a column header to open the filter bar (`>` apply, `x` clear, **Esc** close). A column with an active filter has a **blue** header (the filter value is not shown in the header).

| Column | Filter type | Examples |
|--------|-------------|----------|
| **Id** | Single id or range | `23` · `1 - 20` |
| **Source** | Single or range | `2` · `1 - 5` |
| **Target** | Single, range, or broadcast | `*` · `2` · `1 - 3` |
| **Size** | Single or range | `8` · `128 - 200` |
| **Channel** | Substring (case-insensitive) | `demo` |
| **Status** | Dropdown | `Received` · `Dropped` |

Numeric filters accept `23` or `1 - 20` (spaces around `-` optional; reversed ranges work). Invalid text matches nothing.

Filters combine (AND). One active filter per column.

---

## Related behaviour

- **Stop** on a Run instance unregisters its network endpoints; no new deliveries to that slot until **Run** again. **Stop** does not clear the traffic log.
- Traffic is logged on every `send` attempt, including **Dropped** (no receiver, RX full, or unicast to a missing instance).
- `probe` on a receiving instance is refreshed when a packet arrives — see [editorUI.md — probe: propagation vs network](editorUI.md#probe--propagation-vs-network).

---

## Related

- [network.md](network.md) — `comp [network]` component
- [editorUI.md](editorUI.md) — Run / Stop, panels overview, Inst slots
