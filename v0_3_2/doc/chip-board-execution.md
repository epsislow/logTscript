# Chip and board execution

Chip and board instances share the same **two-phase** execution model: **elaboration** when the instance is first created, then **propagation** each time the `exec` pin fires. Syntax, property blocks, probes, and pout reads are unchanged — only the internal scheduling is optimized so the body structure is built once and signals flow through a captured wire graph on each exec.

For pin/pout syntax and examples, see [chip.md](chip.md) and [board.md](board.md). PCB uses a different model (full body re-run each exec) — see [pcb.md](pcb.md).

---

## Phase 1 — elaboration (instance creation)

When you write:

```
chip [halfAdd] .u1::
```

or:

```
board [halfAdd] .u1::
```

the runtime:

1. Allocates pin and pout storage for `.u1`.
2. Runs the type body **once** to create internal structure:
   - `comp` instances
   - nested `chip` / `board` instances
   - internal wires (`4wire partial = …`, and similar)
3. Captures a **wire graph** from the body — the connections that will carry values on each exec.

After elaboration, the instance is ready. Driving pins from outside (property block or direct assignment) does not rebuild this structure.

---

## Phase 2 — propagation (each exec)

When a property block sets the exec pin (e.g. `set = 1` with `on: 1`, or a rising edge on `on: raise`):

1. Pin values from the property block are written to instance storage.
2. The runtime propagates values through the captured wire graph **in declaration order**, one pass per exec.
3. Pouts and internal wires update; external wires reading `.u1:sum` see the new values.
4. `probe` targets on that instance emit **`changed`** when their value moves (see [debug.md](debug.md)).

The body statements themselves are **not** re-run as a script on each exec — only the graph edges fire. Instantiations (`comp`, `chip`, `board`) happened during elaboration and stay in place.

---

## What the wire graph includes

| Body form | Included in graph |
|-----------|-------------------|
| `sum = .add:get` | wire assignment |
| `4wire partial = .add:get` | wire declaration + initializer |
| `.add:a = a` | connection to component input |
| `.ram:{ adr = pcval set = 1 }` | property block (stateful components) |

**Not** re-executed on exec (elaboration only):

- `comp [adder] .add::`
- `chip [alu] .slice::`
- `board [panel] .ui::`

---

## Writing the body — dataflow connections

Treat each line in a chip or board body as a **persistent connection** in the schematic, not as a sequential imperative program step.

**Natural style** — inputs feed components, outputs feed pouts:

```
.add:a = a
.add:b = b
sum = .add:get
carry = .add:carry
```

**Internal wires** — name intermediate nets explicitly:

```
4wire partial = .add:get
sum = partial
carry = .add:carry
```

This matches how you would draw the circuit: wires exist continuously; exec updates values through them.

**Sequential scratch logic** — reusing the same wire as a temporary in multiple assignment steps in one exec pass is not the intended model. Prefer direct combinational paths or stateful components (`reg`, `mem`, `counter`) when you need stored state between exec cycles.

---

## Nested instances

Nested `chip` and `board` instances are elaborated when the parent instance is created. On parent exec, connections into the child (e.g. `.ha:a = a`, `.ha:{ set = 1 }`, `sum = .ha:sum`) propagate through the parent graph and into the child’s graph as needed.

Example — board inside a chip wrapper:

```
chip +[wrap]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  board [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum
```

---

## Probes and reads from outside

| Goal | Syntax |
|------|--------|
| pout | `probe(.u1:sum)` or `4wire r = .u1:sum` |
| internal wire | `probe(.u1.partial)` (dot, not colon) |

On the first **RUN**, probes on the instance report **`initialised`** at settle (after the property block and propagation). On later property blocks or exec triggers, they report **`changed`**.

---

## Relation to signal propagation

Main-script wires still use [wave](signal-propagation.md) or legacy propagation as configured. Inside a chip or board instance, each exec performs **one graph pass** — enough for combinational paths (adders, muxes) and for property blocks that touch stateful components in graph order.

For multi-step state machines, rely on component state (`mem`, `reg`, `counter`) or multiple exec/NEXT cycles rather than imperative ordering inside a single body.

---

## Quick reference

| Event | Chip / board |
|-------|----------------|
| `chip [t] .u1::` / `board [t] .u1::` | Elaboration — structure + graph |
| `.u1:{ … set = 1 }` | Apply pins + propagate graph |
| Second `.u1:{ … }` | Propagate again (same graph) |
| `probe(.u1:…)` | Same syntax; `initialised` then `changed` |

---

## Related

- [chip.md](chip.md) — definition and nesting rules
- [board.md](board.md) — UI components and interactive blocks
- [debug.md](debug.md) — `probe`, `show`, `peek`
- [signal-propagation.md](signal-propagation.md) — wave and NEXT on the main script
