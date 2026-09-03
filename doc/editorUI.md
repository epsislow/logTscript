# Editor UI — run controls

This document describes toolbar controls in the script editor that affect **how a program runs**. It does not cover tabs, files, AST, or other panels.

For the built-in **Doc** browser (index, search, **Load** / **Load & Run** examples), see [doc-viewer.md](doc-viewer.md).

For what Wave and Legacy mean internally, see [signal-propagation.md](signal-propagation.md).

---

## Run / Stop

**Button:** `Run` while idle · `Stop` while a simulation is active on this tab.

The button has a **fixed width** (it does not resize when the label changes). While running, it uses the **green** instance colour for the active Inst slot (1–5). When idle, it returns to the default button style.

### Run

Executes the full program from the editor:

1. Clears the devices panel and output (fresh run).
2. Parses and runs all statements.
3. Creates a new interpreter using the **propagation mode** selected in the pill toggle (see below).
4. Shows `show` / `peek` / `probe` output, **`watch` traces** in the Timeline panel, and updates the Variables panel (see [debug.md](debug.md)).

Use **Run** after changing code or after switching Wave / Legacy so the new mode takes effect.

If another tab already owns the same **Inst** slot, that tab is stopped and frozen (same as pressing **Stop** there): its output becomes a snapshot and the slot is released for the new run.

### Stop

**Click Stop** to end the simulation on this tab without closing it.

| What stops | What is kept |
|------------|--------------|
| Oscillator timers, **S** auto-step, wire propagation | Output, Variables, Devices — frozen as a **snapshot** on this tab |
| Network endpoints for this Inst slot | Editor text and tab Inst dropdown |
| **Next** / **S** (disabled until the next Run) | Probe / watch history already in Output |

After **Stop**:

- The button shows **Run** again (no green highlight).
- The tab label loses the live **·N** running marker.
- The Inst slot is **free** — another tab can **Run** on the same number.
- Panels show the last captured state until you **Run** again (or switch tabs).

**Stop** does not clear the **Network Traffic** log (global; see [network-traffic-panel.md](network-traffic-panel.md)).

---

## Next

**Button:** `Next`

Advances simulation time for wires that depend on `~` (one `NEXT(~)` step per click).

- Requires a program that has already been started with **Run**.
- Uses the **same interpreter** (and thus the same propagation mode) as the last **Run**.
- Does not re-parse the editor; it only executes `NEXT` on the running session.

The auto-step buttons (`S` / interval) call the same **Next** logic on a timer.

---

## Toolbar layout

Left to right: **Run** / **Stop**, **Inst: N** (1–5), **wave / legacy**, then **Next**, **S**, and interval **1** (step controls). A visual separator divides run config from step controls.

---

## Instance (Inst 1–5)

**Control:** **Inst: N** dropdown next to **Run**.

You can run up to **five simulations in parallel** in the same browser page. Each number is an **instance slot** (1–5), not a CPU core — think of it as five independent “Run sessions” that can talk to each other (for example via [network](network.md)).

| What | Behaviour |
|------|-----------|
| **Inst dropdown** | Chooses which slot the **next Run** on this tab will use. |
| **Tab label ·N** | After Run, the tab shows **·N** — the slot that is actually running (may differ from the dropdown until you Run again). |
| **Per tab** | Each editor tab remembers its own Inst selection. |
| **Output panel** | One visible panel, but each instance keeps its **own output history** while you switch tabs. |

### Meta constant `/instance/`

At **Run** time you can read the slot number in a wire:

```logts
4wire inst : /instance/
show(inst)
```

On **Inst 1** → `0001`; on **Inst 2** → `0010`, and so on. Details: [meta-constants.md](meta-constants.md).

Use this to put “who am I” in a network packet, UART frame, or local logic. `/instance/` is fixed for the whole run on that tab.

---

## Propagation toggle (Wave / Legacy)

**Control:** pill button next to **Run** — label shows the active mode.

| Mode | Colour | Meaning (short) |
|------|--------|-----------------|
| **wave** | Orange | Wires and component outputs settle together, then displays refresh. Default in the editor. |
| **legacy** | Green | Wires update immediately as each assignment runs (older model). |

**Click** the pill to switch between `wave` and `legacy`.

### When the choice applies

- The toggle sets the mode for the **next Run** only.
- It does **not** change propagation on an already running session until you press **Run** again.
- **Next** always uses whatever mode was active at the last **Run**.

Your choice is saved in browser storage (`prog/propagation`) and restored when you reopen the editor.

---

## `probe` — propagation vs network

Most of the time, **`probe` updates by itself** while the program runs: when wires change during **Run**, **Next**, or **wave / legacy** propagation, new probe lines are added to that instance’s output.

**Network** is different: a packet can arrive on another instance **without** running that instance’s script again. Nothing in the wire graph changes, so `probe(.wifi:get)` is not notified the same way.

| | Wires & normal components | `comp [network]` RX |
|--|---------------------------|---------------------|
| **What changes** | Values in the running simulation | Packet queue on a shared bus |
| **When probe updates** | During Run / Next / propagation | When a packet is **delivered** to that instance (or when you open that instance’s tab) |
| **Needs a separate refresh?** | No | Yes — editor re-reads probes for that instance |
| **History** | New lines appended (`initialised`, then `changed`) | Same — old probe lines are kept |

So: propagation and `probe` go together; **network uses an extra refresh** so the receiving tab’s output can show `- changed` even if that tab is in the background.

Typical two-tab test:

1. Tab B (Inst 2): `comp [network]` + `probe(.wifi:get)` — **Run** (registers receiver).
2. Tab A (Inst 1): **send** on the same channel — **Run**.
3. Tab B: switch back — output should show both `initialised` and `changed` for `.wifi:get`.

The sender never sees its own packet on `:get` (by design). See [network.md](network.md).

---

## Panels

| Panel | Purpose |
|-------|---------|
| **Output** | Text from `show`, `peek`, `probe`, errors — per instance when switching tabs |
| **Timeline** | Waveform trace from `watch()` — enable via **Win → Timeline** |
| **Network Traffic** | Log of every `send` on `comp [network]` — **Win → Network Traffic** (see [network-traffic-panel.md](network-traffic-panel.md)) |
| **Variables** | Live wire / component values after **Run** |
| **AST** | Parsed program structure |

The **Timeline** sits above **Output**. Use **Pause** to inspect history; **Live** to follow new events.

---

## Network Traffic panel

**Win → Network Traffic** shows a global log of every `send` on `comp [network]` (all Inst slots). Columns, filters, Pause/Live, pagination, row flash, and packet ids are documented in **[network-traffic-panel.md](network-traffic-panel.md)**.

---

## Quick reference

| Control | Action |
|---------|--------|
| **Run** | Full execute; applies current Inst slot and Wave / Legacy mode |
| **Stop** | End simulation on this tab; freeze panels; release Inst slot |
| **Inst: N** | Instance slot (1–5) for the next Run on this tab |
| **Next** | `NEXT(~)` on last Run’s interpreter (requires active run) |
| **wave / legacy** | Select propagation for next Run (orange = wave, green = legacy) |

---

## Related documentation

- [Documentation viewer](doc-viewer.md) — **Doc** button, search, runnable examples
- [Debug output](debug.md) — `show`, `peek`, `probe`, **`watch`** (Timeline)
- [Meta constants](meta-constants.md) — `/instance/`
- [Network](network.md) — packets between instances
- [Network Traffic panel](network-traffic-panel.md) — send log UI
- [Signal propagation](signal-propagation.md) — Wave vs Legacy behaviour
- [REG](reg.md) — registers and `NEXT`
- [Interactive components](interactive-components.md) — panel inputs and wire updates
