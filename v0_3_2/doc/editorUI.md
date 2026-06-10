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
4. Shows `show` output and updates the Variables panel.

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

## Propagation toggle (Wave / Legacy)

**Control:** pill button between **Next** and **S** — label shows the active mode.

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

### Command line

If you run a command from the Command panel before any **Run**, the lazy-started interpreter also uses the current toggle setting.

---

## Quick reference

| Control | Action |
|---------|--------|
| **Run** | Full execute; applies current Wave / Legacy mode |
| **Next** | `NEXT(~)` on last Run’s interpreter |
| **wave / legacy** | Select propagation for next Run (orange = wave, green = legacy) |

---

## Related documentation

- [Signal propagation](signal-propagation.md) — Wave vs Legacy behaviour
- [REG](reg.md) — registers and `NEXT`
- [Interactive components](interactive-components.md) — panel inputs and wire updates
