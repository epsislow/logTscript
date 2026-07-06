# Board components

A **board** is the recommended way to build reusable interactive circuits. It uses the same pin/pout/exec model as [chip.md](chip.md), with **wave propagation** in the body, but allows **UI components** (`switch`, `led`, `osc`, …).

Use **board** instead of [pcb.md](pcb.md) for new designs (PCB is deprecated).

Signature reference: `doc(board)` and `doc(board.type)` — see [doc-function.md](doc-function.md).

---

## Definition

```
board +[name]:
  Npin inputName
  Mpout outputName
  exec: triggerPin
  on: raise/edge/1
  comp [switch] .sw::
  # wiring, chip/board instances, probe
  :Nbit returnVar
```

---

## Instantiation

```
board [name] .instance::
```

Property block:

```
.instance:{
  inputName = 0101
  triggerPin = 1
}
```

Read pouts:

```
4wire out = .instance:outputName
```

---

## Allowed in board body

- All `comp` types (including panel UI)
- `chip [type] .inst::` — nested chip instances
- `board [type] .inst::` — nested board instances
- `probe(...)` in body (collected at parse)
- Wire assignments and property blocks

## Forbidden in board body

| Construct | Reason |
|-----------|--------|
| `def` | Use top-level functions only |
| `pcb +[...]` / `pcb [t] .x::` | PCB deprecated; use board |
| `chip +[...]` / `board +[...]` | No nested type definitions |
| `~~` next section | Not supported (chip/board model) |

---

## Chip vs board

| Feature | Chip | Board |
|---------|------|-------|
| UI components | No | **Yes** |
| `board [t] .x::` in chip body | **Yes** | — |
| Wave in body | Yes | Yes |
| Use case | Logic library | Full interactive blocks |

In a **chip** body: `board +[...]` is forbidden, but `board [type] .x::` is allowed.

---

## Runnable example

```logts-play
board +[halfAdd]:
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

board [halfAdd] .u1::
.u1:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .u1:sum
show(r)
```

---

## Probe

| Form | Target |
|------|--------|
| `probe(.u1:sum)` | pout |
| `probe(.u1.partial)` | internal wire in body |

See [debug.md](debug.md).

---

## Related

- [chip.md](chip.md) — logic-only blocks
- [pcb.md](pcb.md) — deprecated
- [components.md](components.md) — index
