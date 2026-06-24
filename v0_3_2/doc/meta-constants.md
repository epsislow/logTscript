# Meta constants

Meta constants are **run-time literals** resolved when you press **Run**. They are not wires and not expression operands like `~`, `%`, or `$`.

Syntax: `/name/` (slashes required).

See also: [assignment operators — `:` init](assignment-operators.md#-initial-assignment), [editor UI — instances](editorUI.md).

---

## Summary

| | Special vars (`~` `%` `$`) | Meta constants (`/instance/`) |
|--|--|--|
| Where | expressions, `show`, `probe` | **only** `Nwire name : /name/` at **top level** |
| When value is fixed | changes during run (`%`, `$`) | fixed for the whole run |
| Scope | general | top-level script only (not chip/pcb/board) |

---

## `/instance/`

Returns the **editor run instance** (1–5) as a **4-bit binary** value:

| Instance | Value |
|----------|-------|
| 1 | `0001` |
| 2 | `0010` |
| 3 | `0011` |
| 4 | `0100` |
| 5 | `0101` |

The instance number comes from the toolbar **Inst** selector on the tab that runs the script (see [editorUI.md](editorUI.md)).

### Syntax

```logts
4wire instance : /instance/
```

After init, `instance` is a normal wire — use `show(instance)`, `probe(instance)`, etc.

### Width rules

The canonical value is **4 bits**. Wire width uses the same pad/truncate rules as other `:` literals:

- **shorter wire** → left-pad with `0` (e.g. `8wire` on inst 1 → `00000001`)
- **longer value than wire** → keep the **least significant** bits (e.g. `3wire` on inst 1 → `001`)

### Multi-tab example

Same script on two tabs, different instances:

```logts
4wire inst : /instance/
show(inst)
```

- Tab A, **Run** on instance **1** → `inst = 0001`
- Tab B, **Run** on instance **2** → `inst = 0010`

### Not allowed

| Construct | Result |
|-----------|--------|
| `4wire x = /instance/` | parse error |
| `show(/instance/)` | parse error |
| `probe(/instance/)` | parse error |
| inside `chip` / `pcb` / `board` body | parse error |

---

## Future

`/signalStrategy/` (planned): `legacy` → `0001`, `wave` → `0010` from the tab propagation mode.
