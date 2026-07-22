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
| `.ram:{ adr = pcval, set = 1 }` | property block (stateful components) |
| `on:raise { clk, acc = ADD(acc, a) }` | conditional assignment (edge/level per mode) |

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

**Property blocks** — multiple pin assignments in one `:{ }` block. Properties may be separated by **commas** (trailing comma allowed, same as `on:{ }`), **newlines**, or **spaces**:

```
.ram:{ adr = pcval, set = 1, }
.q:{ data = 1111 set = 1 }
```

Multi-line without commas remains valid:

```
.q:{
  data = 1111
  set = 1
}
```

**`show` / `peek` in property blocks** — same comma / newline / space rules as pin assignments. They run **only when the block fires** (same `on:` / `set` trigger as the rest of the block), **immediately** at that moment — not deferred like top-level `show` on Wave (same as [`on:{ }` body](conditional-assignment.md#show-and-peek-in-the-body)).

| Position in block | When it runs |
|-------------------|--------------|
| Before `set = …` | After preceding pin expressions are evaluated into pending state; **before** `applyComponentProperties` for that `set` |
| After `set = …` | After `applyComponentProperties` for that `set` |
| After all pin/`set` items | Bus redirects (`get >=`, `mod>`, …) still run **after** the main loop; a `show(wire)` written after `get >= wire` in source still executes **before** that redirect fills `wire` |

In the block body, `show` and `peek` share the same evaluation moment; output differs only in formatting (`show` may include `(ref: …)`). See [debug.md](debug.md).

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

## Running examples (Load / Load & Run)

Runnable blocks below use the `logts-play` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into a **new editor tab** without running it. Edit operands, add probes, or append property blocks, then press toolbar **Run**. |
| **Load & Run** | Copies the script **and** runs it immediately. Read results in the **Output** panel (`show` lines) and on **probes**. |

Tips:

- Blocks use `logts-play wave` (default propagation in the editor).
- Chip and board bodies are **not** re-run as scripts on each exec — only the captured graph propagates. Change inputs with another `.u1:{ … }` block (or flip a **switch** in a board) and **Run** again.
- Several examples chain multiple property blocks in one script (`set = 1` then `set = 0`) to demonstrate edge/conditional behaviour in a single **Load & Run**.

---

## Runnable examples

### Chip — propagation through internal `adder`

**Load & Run** — `0101 + 0011` through `comp [adder]` inside the chip. **Output:** `r = 1000`, `c = 0`.

The adder is elaborated once; each `set = 1` property block propagates pin values into `.add` and out to `sum`.

```logts-play wave
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
1wire c = .u1:carry
show(r, c)
```

### Chip — graph order: `on:raise` latch, then `adder`

**Load & Run** — on the first rising edge of `set`, `latA`/`latB` capture `a`/`b`, then the adder reads those wires. **Output:** `r = 1000`.

Declaration order in the body is the propagation order: conditional → component inputs → pout.

```logts-play wave
chip +[gatedAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  4wire latA = 0000
  4wire latB = 0000
  on:raise {
    set,
    latA = a,
    latB = b
  }
  .add:a = latA
  .add:b = latB
  sum = .add:get
  :4bit sum

chip [gatedAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
```

### Chip — `on:raise` toggles accumulator (`NOT`)

**Load & Run** — first pulse inverts `acc` from `0000` to `1111`. **Output:** `r = 1111`.

Hold `set = 1` again without a `0` in between does **not** toggle a second time.

```logts-play wave
chip +[tickAcc]:
  1pin set
  4pout sum
  exec: set
  on: 1
  4wire acc = 0000
  on:raise {
    set,
    acc = NOT(acc)
  }
  sum = acc
  :4bit sum

chip [tickAcc] .u1::
.u1:{ set = 1 }
4wire r = .u1:sum
show(r)
```

### Chip — repulse: three property blocks in one run

**Load & Run** — `set` goes `1 → 0 → 1`; the conditional fires on each rising edge. **Output:** `r = 0000` (toggled twice).

```logts-play wave
chip +[tickAcc]:
  1pin set
  4pout sum
  exec: set
  on: 1
  4wire acc = 0000
  on:raise {
    set,
    acc = NOT(acc)
  }
  sum = acc
  :4bit sum

chip [tickAcc] .u1::
.u1:{ set = 1 }
.u1:{ set = 0 }
.u1:{ set = 1 }
4wire r = .u1:sum
show(r)
```

### Chip — `on:raise` pulses internal `counter`

**Load & Run** — rising `set` sets `inc = 1`, the `.cnt:{ set = inc }` property block increments the counter, then `inc` resets. **Output:** `r = 0001`.

```logts-play wave
chip +[pulseCnt]:
  1pin set
  4pout count
  exec: set
  on: 1
  comp [counter] .cnt:
    depth: 4
    on: 1
    :
  1wire inc = 0
  on:raise {
    set,
    inc = 1
  }
  .cnt:{ set = inc }
  inc = 0
  count = .cnt:get
  :4bit count

chip [pulseCnt] .u1::
.u1:{ set = 1 }
4wire r = .u1:count
show(r)
```

### Board — nested chip + internal adder

**Load & Run** — board wraps `chip [halfAdd]`; parent wires feed the child, child exec propagates, parent reads `.ha:sum`. **Output:** `r = 1000`.

```logts-play wave
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  :4bit sum

board +[wrapAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  chip [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum

board [wrapAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
```

### Board — `on:edge` on falling `set`

**Load & Run** — `set` starts high (no edge yet), then falls (`1 → 0`); the conditional sets `result = 1111`. **Output:** `r = 1111`.

```logts-play wave
board +[edgeTick]:
  1pin set
  4pout out
  exec: set
  on: 1
  1wire en = set
  4wire result = 0000
  on:edge {
    en,
    result = 1111
  }
  out = result
  :4bit out

board [edgeTick] .u1::
.u1:{ set = 1 }
.u1:{ set = 0 }
4wire r = .u1:out
show(r)
```

### Board — interactive: `on:edge` + switch + adder

**Load & Run** — `count` starts at `0000`. Flip the **clk** switch **on** then **off** (falling edge on `en`); `held` toggles and the adder drives `count`. **Output** probe lines show `count` flip to `1111`.

Use **Load** if you want to watch probes step by step after toggling the switch.

```logts-play wave
board +[edgeCnt]:
  4pout count
  1pin set
  exec: set
  on: 1
  comp [switch] .clk:
    text: 'clk'
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  4wire held = 0000
  1wire en = .clk:get
  on:edge {
    en,
    held = NOT(held)
  }
  .add:a = held
  .add:b = 0000
  count = .add:get
  :4bit count

board [edgeCnt] .u1::
.u1:{ set = 1 }
4wire r = .u1:count
probe(r)
probe(.clk)
show(r)
```

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
