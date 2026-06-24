# Editor UI — run controls

This document describes toolbar controls in the script editor that affect **how a program runs**. It does not cover tabs, files, AST, or other panels.

For what Wave and Legacy mean internally, see [signal-propagation.md](signal-propagation.md).

---

## Run

**Button:** `Run`

Executes the full program from the editor:

1. Clears the devices panel and output (fresh run).
2. Parses and runs all statements.
3. Creates a new interpreter using the **propagation mode** selected in the pill toggle (see below).
4. Shows `show` / `peek` / `probe` output, **`watch` traces** in the Timeline panel, and updates the Variables panel (see [debug.md](debug.md)).

Use **Run** after changing code or after switching Wave / Legacy so the new mode takes effect.

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

Left to right: **Run**, **Inst: N** (1–5), **wave / legacy**, then **Next**, **S**, and interval **1** (step controls). A visual separator divides run config from step controls.

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
| **Timeline** | Waveform trace from `watch()` — enable via **Panels → Timeline** |
| **Variables** | Live wire / component values after **Run** |
| **AST** | Parsed program structure |

The **Timeline** sits above **Output**. It opens automatically when the script contains `watch()` and you press **Run**. Use **Pause** to inspect history; **Live** to follow new events.

---

## Quick reference

| Control | Action |
|---------|--------|
| **Run** | Full execute; applies current Inst slot and Wave / Legacy mode |
| **Inst: N** | Instance slot (1–5) for the next Run on this tab |
| **Next** | `NEXT(~)` on last Run’s interpreter |
| **wave / legacy** | Select propagation for next Run (orange = wave, green = legacy) |

---

## Related documentation

- [Debug output](debug.md) — `show`, `peek`, `probe`, **`watch`** (Timeline)
- [Meta constants](meta-constants.md) — `/instance/`
- [Network](network.md) — packets between instances
- [Signal propagation](signal-propagation.md) — Wave vs Legacy behaviour
- [REG](reg.md) — registers and `NEXT`
- [Interactive components](interactive-components.md) — panel inputs and wire updates
