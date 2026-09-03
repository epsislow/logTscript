# PCB components

> **Deprecated** — use [board.md](board.md) for new circuits. PCB remains supported for existing scripts but is not recommended (legacy propagation in body, no wave alignment). Behavior is unchanged.

A **PCB** is a reusable circuit block: you define its interface (pins, pouts, exec trigger), its internal wiring, and optional `~~` next-tick section. PCBs can use any built-in component, nested PCBs, `def` functions, and panel controls (`switch`, `key`, `led`, …).

Full signature reference: `doc(pcb)` and `doc(pcb.type)` — see [doc-function.md](doc-function.md).

---

## Definition

```
pcb +[name]:
  Npin inputName
  Mpout outputName
  exec: triggerPin
  on: raise/edge/1
  # body — assignments, comp, def, chip, nested pcb
  :Nbit returnVar
```

| Part | Meaning |
|------|---------|
| `pcb +[name]:` | Define a new PCB type (top-level only) |
| `Npin` / `Npout` | Input / output ports exposed on instances |
| `exec: pinName` | Which pin fires property blocks (default `set`) |
| `on: mode` | When the block runs: `raise`, `edge`, or `1` |
| body | Logic between header and final `:Nbit var` |
| `:Nbit var` | Optional return type shown in `doc()` |

---

## Instantiation

```
pcb [name] .instance::
```

Apply inputs and trigger execution with a property block:

```
.instance:{
  inputName = 0101
  triggerPin = 1
}
```

Read outputs from outside:

```
Nwire out = .instance:outputName
```

---

## Property blocks

Multiple blocks on the same instance are allowed. They run in **source order** (`blockIndex`) when the exec pin matches `on:`.

```
pcb [seq] .q::

.q:{ set = trigger; data = 1111 }
.q:{ set = trigger; data = 0000 }
```

When `trigger` goes high, both blocks run in order; the last assignment to a pout wins.

Inside a PCB body you can also attach blocks to internal components:

```
comp [adder] .add:
  depth: 4
  on: 1
  :

.add:{
  a = externalPin
  b = otherPin
  set = 1
}
```

---

## `~~` next section

After the main body, `~~` starts code that runs on the **next** propagation tick (same idea as `NEXT(~)` for registers). Useful for two-phase updates without combinatorial loops.

```
pcb +[twoPhase]:
  4pin data
  1pin set
  4pout out
  exec: set
  on: 1
  out = data
  ~~
  out = NOT(data)
  :4bit out
```

---

## Runnable example

```logts-play
pcb +[passthrough]:
  4pin data
  1pin set
  4pout val
  exec: set
  on: 1
  val = data
  :4bit val

pcb [passthrough] .u::

.u:{
  data = 1010
  set = 1
}

4wire r = .u:val
show(r)
```

---

## `doc()` and debug

```
doc(pcb)          # lists pcb.type for each defined type
doc(pcb.bcd)      # full signature of type bcd
```

Probe external pins/pouts:

```
probe(.u:val)           # pout
probe(.u.data)          # internal wire in body (if named)
```

See [debug.md](debug.md) for `:` (pin/pout) vs `.` (internal wire) conventions.

---

## PCB vs chip

| Feature | PCB | Chip |
|---------|-----|------|
| UI components (`led`, `switch`, …) | Yes | No |
| `def` in body | Yes | No |
| Nested `pcb +[...]` | Yes | No |
| `~~` section | Yes | No |
| Nested `chip [type]` | Yes | Yes (other chip types) |
| Use case | Full interactive circuits | Pure reusable logic |

Chip details: [chip.md](chip.md).
