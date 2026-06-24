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

The **Inst** dropdown selects which execution slot (1–5) applies on the **next Run** only — like **wave / legacy**, it does **not** stop or switch a program that is already running. Each tab remembers its own selection; switching tabs restores that tab’s **Inst** value in the toolbar.

While a tab is running, the tab label shows **·N** where **N** is the instance that is actually executing (which may differ from the dropdown until you press **Run** again).

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

## Panels

| Panel | Purpose |
|-------|---------|
| **Output** | Text from `show`, `peek`, `probe`, errors |
| **Timeline** | Waveform trace from `watch()` — enable via **Panels → Timeline** |
| **Variables** | Live wire / component values after **Run** |
| **AST** | Parsed program structure |

The **Timeline** sits above **Output**. It opens automatically when the script contains `watch()` and you press **Run**. Use **Pause** to inspect history; **Live** to follow new events.

---

## Quick reference

| Control | Action |
|---------|--------|
| **Run** | Full execute; applies current Wave / Legacy mode |
| **Next** | `NEXT(~)` on last Run’s interpreter |
| **wave / legacy** | Select propagation for next Run (orange = wave, green = legacy) |

---

## Related documentation

- [Debug output](debug.md) — `show`, `peek`, `probe`, **`watch`** (Timeline)
- [Signal propagation](signal-propagation.md) — Wave vs Legacy behaviour
- [REG](reg.md) — registers and `NEXT`
- [Interactive components](interactive-components.md) — panel inputs and wire updates
