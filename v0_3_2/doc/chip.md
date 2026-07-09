# Chip components

A **chip** is a lightweight reusable block — same pin/pout/exec model as [board.md](board.md), but **without** UI components, `def`, nested PCB/board definitions, or `~~`. Use chips to build libraries of logic (adders, multiplexers, ALU slices) that you compose inside **boards** or other chips.

Full signature reference: `doc(chip)` and `doc(chip.type)` — see [doc-function.md](doc-function.md).

---

## Definition

```
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
```

| Part | Meaning |
|------|---------|
| `chip +[name]:` | Define chip type (top-level only) |
| `Npin` / `Npout` | External ports |
| `exec` / `on` | Same as PCB — property-block trigger |
| body | `comp`, assignments, `chip [other] .inst::` |
| `:Nbit var` | Optional return spec for `doc()` |

Chip names cannot collide with reserved component names (`adder`, `chip`, `7seg`, …).

---

## Instantiation

```
chip [halfAdd] .u1::
```

Property block (drive pins + exec):

```
.u1:{
  a = 0101
  b = 0011
  set = 1
}
```

Read pout from outside:

```
4wire r = .u1:sum
1wire c = .u1:carry
```

### Execution model

At **instance creation**, the body runs once (elaboration) and a wire graph is captured. On each **exec** trigger from a property block, values propagate through that graph — the body is not re-run as a script. Write the body as **dataflow connections**; see [chip-board-execution.md](chip-board-execution.md).

---

## Allowed and forbidden in chip body

**Allowed**

- `comp` for logic devices: `adder`, `subtract`, `mem`, `reg`, `counter`, `shifter`, `divider`, `multiplier`, …
- `chip [existingType] .sub::` — nest other **defined** chip types
- `board [existingType] .sub::` — nest **defined** board types (UI inside board)
- Wire assignments and property blocks on internal components

**Forbidden**

- `def` user functions
- `pcb +[...]` or `pcb [type] .inst::`
- `chip +[...]` or `board +[...]` nested definitions
- `~~` next section
- UI / panel types: `switch`, `key`, `dip`, `rotary`, `osc`, `led`, `7seg`, `14seg`, `lcd`, `dots`, `ledBar`

---

## Internal wiring

Use `.inst:pin` for component pins and bare names for chip-level wires:

```
.add:a = a
sum = .add:get
```

Probe from outside:

| Form | Target |
|------|--------|
| `probe(.u1:sum)` | pout `sum` |
| `probe(.u1.partial)` | internal wire `partial` in chip body |
| `probe(.u1:carry)` | pout or component property `:carry` |

See [debug.md](debug.md).

---

## Runnable example

```logts-play
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
show(r)
```

---

## Chip vs PCB

PCBs are for complete interactive circuits; chips are building blocks. A typical flow:

1. Define `chip +[aluSlice]:` …
2. Instantiate inside `pcb +[board]:` with `chip [aluSlice] .slice::`
3. Add `led`, `switch`, and panel wiring only in the PCB

Interactive circuits: [board.md](board.md). Execution model: [chip-board-execution.md](chip-board-execution.md). Component catalog: [components.md](components.md).
