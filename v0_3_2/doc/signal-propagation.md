# Signal propagation

When a wire or component output changes, every wire and display that depends on it is updated automatically. You do not need to call anything extra — assignments like `1wire b = NOT(a)` stay in sync with their inputs.

Wire assignment operators (`=`, `:=`, `=:`) and initial `:` control width handling; see [assignment-operators.md](assignment-operators.md). Legacy and wave use the same rules per operator.

This document explains **what you see** when values spread through your circuit. It does not describe internal engine details.

---

## When values update

| Event | What happens |
|-------|----------------|
| **RUN** | All wire assignments are evaluated. Displays (`show`) reflect the final settled values. |
| **NEXT(~)** | Wires that depend on `~`, `%`, or `$` are recomputed. Registers with `REG(..., ~, ...)` latch on `NEXT`. |
| **UI interaction** | Toggling a switch, pressing a key, changing a DIP, or an oscillator tick updates connected wires. |
| **Wire assignment in code** | Changing a wire (e.g. `data = 1`) updates everything downstream in the same step. |

---

## Wave (default in the editor)

The **Wave** model is used when you run programs in the editor (orange pill in the toolbar; see [editorUI.md](editorUI.md)). It works like a small simulation:

1. Changes are collected (wires and component outputs).
2. Dependent wires are recalculated until nothing else changes.
3. LEDs, 7-segment displays, and similar components refresh once everything is stable.

**What this means for you:**

- Combinational logic (`NOT`, `AND`, `MUX`, wires feeding other wires) behaves as you would expect in a schematic: all related outputs settle together before the screen updates.
- `show(...)` at the end of **RUN** or **NEXT** shows values **after** propagation finishes, not halfway through.
- `peek(...)` and `probe(...)` behave differently — see [debug.md](debug.md).

### Components that drive wires

These components can push their output into wires that read them (e.g. `1wire x = .sw:get`):

| Component | Trigger |
|-----------|---------|
| `switch` | Toggle on/off — see [interactive-components.md](interactive-components.md) |
| `key` | Press / release |
| `dip` | Change DIP positions |
| `rotary` | Turn the knob |
| `osc` | Each HIGH / LOW transition (real-time timers) |

Example:

```logts-play wave
comp [switch] .sw::

1wire a = .sw:get
1wire b = NOT(a)

show(a, b)
```

After **RUN**, `a` is `0` and `b` is `1`. When you flip the switch in the panel, `a` becomes `1` and `b` becomes `0` without running the script again.

### MODE ZSTATE — multi-driver commit

When `MODE ZSTATE` is active (wave only), wire updates use an extra **commit** phase inside each propagation wave. See **[modes.md](modes.md)** for all script modes and **[zstate.md](zstate.md)** for ZSTATE details.

1. All contributors are queued (`bus = a`, `get>= bus`, `out>= bus`, `ZRELEASE(bus)`, …).
2. **`commitWireResolves`** merges contributions **per bit** → `0`, `1`, `Z`, or `X`.
3. Connected components and displays refresh from the resolved value.

This is why multiple drivers in the **same step** can coexist on one bus without silent overwrite. Full rules: **[zstate.md](zstate.md)**.

---

## Legacy

**Legacy** propagation is the older model (green pill in the editor toolbar; see [editorUI.md](editorUI.md)). It updates wires **immediately** as each assignment runs, in program order. Automated tests in `run_tests` also use Legacy unless marked **wave**.

For most small programs the result is the same as Wave. Differences are rare and usually involve unusual feedback loops (a wire that depends on its own previous value in the same update). New projects should rely on the editor’s default (Wave); you do not need to configure anything.

---

## Wires and registers

### Combinational wires

Any wire expression can depend on other wires or component outputs:

```
1wire a = 0
1wire b = 1
1wire sum = OR(a, b)
```

Changing `a` or `b` eventually updates `sum`.

### `REG` with wire clock

`REG(data, clk, clr)` with a normal wire as `clk` is **falling-edge triggered**: output updates when `clk` goes `1` → `0`, sampling the current `data`. Between edges the output holds. See [reg.md](reg.md).

### `REG` with `~` (NEXT clock)

`REG(data, ~, clr)` only updates its output on **NEXT(~)**. Wire changes to `data` between two NEXT calls do not change the output until the next NEXT. Behavior is the same in Wave and Legacy. See [reg.md](reg.md).

---

## Debug output (`show`, `peek`, `probe`, `watch`)

How values appear in **Output** or the **Timeline** panel — syntax, timing, and runnable examples:

**[debug.md](debug.md)**

---

## PCB and property blocks

Programs that use **PCB** instances and property blocks (`.instance:{ data=… set=wire on:1 }`) work on **Wave** the same way as on Legacy for everything **outside** the PCB:

| Area | Wave behaviour |
|------|----------------|
| **External wires** (`4wire q = .e`, `4wire out = .p:pout`) | Updated through wave propagation after the PCB runs or after a trigger (`setWire`, switch, key). |
| **PCB pins** (`setWire` on an input pin) | Can fire property blocks with `on:1` / `set = …`; dependent external wires settle in the same propagation step. |
| **PCB pouts** | Output pins publish to external wires via wave scheduling (not a direct storage write). |
| **Inside the PCB body** | Still runs in the older immediate model (`insidePcbBody`). Internal wires are not wave-deferred. |

**What this means for you:**

- Connect a PCB to the outside world as usual — pins, pouts, and `4wire … = .instance:pin` expressions behave like normal combinational links once propagation finishes.
- Interactive triggers (`setWire`, toggling a switch or key wired to `set=`) update external wires after the PCB block runs, in one settled step.
- A wire declared earlier in the same **RUN** (e.g. `4wire d = 1010` then `comp [mem] … = d`) is visible to component init and `.mem = d` on Wave — values are scheduled during elaboration before dependent statements run.

For examples and edge cases, see PCB tests **500–515** (legacy) and **516–531** (wave) in the test runner.

---

## Chip components

Chip bodies follow the **global** propagation strategy (wave or legacy), unlike PCB bodies which still run in the immediate `insidePcbBody` model.

| Area | Behaviour |
|------|-----------|
| **Chip definition body** | Uses wave scheduling when wave mode is active; legacy cascade otherwise. |
| **External wires** (`4wire r = .u1:sum`) | Updated after chip exec / property block, like PCB pouts. |
| **Property blocks** (`.u1:{ a = … set = 1 }`) | Same trigger semantics as PCB (`on:1`, `on:raise`, etc.). |
| **Nested chip instances** | Top-level chip types only; `chip +[inner]` inside a body is a parse error. |

See chip tests **540–543** (legacy) and **556–557** (wave) in the test runner.

---

## Quick reference

| Topic | Wave (editor) | Legacy |
|-------|---------------|--------|
| Default in editor | Yes | No |
| Wire + component updates | Settle together, then refresh UI | Update as each step runs |
| `REG(..., ~, ...)` + `NEXT` | Same as Legacy | Reference |
| `REG(data, clk, clr)` wire clock | Falling edge (`clk` 1→0); same semantics | Same |
| `show` | After settle | After each top-level step |
| `probe` | On every commit (elaboration registry) | On every commit |
| Self-referential wires (e.g. `a = NOT(a)`) | One update per user action | May differ in edge cases |

---

## Related documentation

- [Debug output](debug.md) — `show`, `peek`, `probe`
- [MODE ZSTATE](zstate.md) — tristate wires and multi-driver buses
- [Editor run controls](editorUI.md) — Run, Next, Wave / Legacy toggle
- [Interactive components](interactive-components.md) — switch, key, dip, rotary inputs
- [REG](reg.md) — wire-clock falling edge and `NEXT` clock (`~`)
- [Oscillator](oscillator.md) — real-time `osc` and wire connections
- [LED](led.md) — displays driven by wires and components
