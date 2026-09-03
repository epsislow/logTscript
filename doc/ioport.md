# IOPORT

An I/O port groups existing input and output components under a single port name.

IOPORT provides:

* visual grouping
* port naming
* automatic bit aggregation
* automatic bit mapping

It is intended for educational CPU and digital logic systems where devices are accessed through named ports.

Examples:

```text
Port A
Port B
P0
P1
```

Unlike GPIO hardware, IOPORT does not model:

* pin directions
* tristate outputs
* pullups or pulldowns
* alternate functions

IOPORT is a logical port abstraction built from existing components.

---

## Syntax

```logts
comp [ioport] .name:
  in  = .component
  out = .component
  :
```

Multiple inputs and outputs are allowed:

```logts
comp [ioport] .P0:
  in  = .addr
  in  = .data

  out = .result
  out = .flags
  :
```

Member components must be declared **before** the `ioport` block. In v1, `in` members must be `comp [dip]` and `out` members must be `comp [led]`.

---

## Purpose

Without IOPORT:

```logts
16wire addr = .addr:get
8wire data  = .data:get
```

```logts
.result = resultBits
.flags  = flagBits
```

With IOPORT:

```logts
24wire inputBus = .P0:in

.P0:out = outputBus
```

IOPORT automatically performs the bit mapping.

---

## Input aggregation

All input components are concatenated into a single input bus.

```logts
comp [dip] .addr:
  length: 16
  :

comp [dip] .data:
  length: 8
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  :
```

Input width: `16 + 8 = 24` bits.

```logts
24wire packet = .P0:in
```

Equivalent to:

```logts
24wire packet =
  .addr:get
+ .data:get
```

### Runnable — read aggregated input

**Load & Run**, then flip DIP positions in the panel.

```logts-play
comp [dip] .addr:
  length: 16
  text: 'Addr'
  visual: 1
  = ^ffff
  :

comp [dip] .data:
  length: 8
  text: 'Data'
  visual: 1
  = ^aa
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  :

24wire packet = .P0:in
show(packet, .P0:in)
```

---

## Output aggregation

All output components are concatenated into a single output bus.

```logts
comp [led] .result:
  length: 8
  :

comp [led] .flags:
  length: 4
  :

comp [ioport] .P0:
  out = .result
  out = .flags
  :
```

Output width: `8 + 4 = 12` bits.

```logts
12wire value

.P0:out = value
```

Equivalent to:

```logts
.result = value.0-7
.flags  = value.8-11
```

Bit ordering follows the language concatenation rules (declaration order in the `ioport` body).

### Runnable — write aggregated output

```logts-play
comp [led] .result:
  length: 8
  text: 'Res'
  color: ^0af
  :

comp [led] .flags:
  length: 4
  text: 'Flg'
  color: ^f90
  nl
  :

comp [ioport] .P0:
  out = .result
  out = .flags
  :

.P0:out = 101010101111
show(.P0:out)
```

---

## Visual grouping

Components belonging to an IOPORT are rendered inside the IOPORT container on the devices panel.

```text
┌─────────────────────────┐
│ .P0                     │
│                         │
│ addr     [16 dip]       │
│ data     [8 dip]        │
│                         │
│ result   [8 led]        │
│ flags    [4 led]        │
└─────────────────────────┘
```

---

## Ownership rules

A component may belong to at most one IOPORT.

Valid:

```logts
comp [ioport] .P0:
  in = .addr
  out = .led
  :
```

Invalid:

```logts
comp [ioport] .P0:
  in = .addr
  :

comp [ioport] .P1:
  in = .addr
  :
```

Error:

```text
Component '.addr' already belongs to ioport '.P0'
```

---

## Debug — `show`, `peek`, `probe`

IOPORT exposes aggregated buses as component properties `:in` and `:out`. They work with [debug.md](debug.md) helpers.

### Runnable — input bus

```logts-play
comp [dip] .sw:
  length: 4
  visual: 1
  = 1010
  :

comp [ioport] .P0:
  in = .sw
  :

4wire bus = .P0:in

show(bus, .P0:in)
peek(.P0:in)
probe(.P0:in)
```

After **RUN**, flip DIP switches — `bus` and probe update on Wave when propagation settles.

### Runnable — input bus (Wave)

```logts-play wave
comp [dip] .sw:
  length: 4
  visual: 1
  :

comp [ioport] .P0:
  in = .sw
  :

4wire bus = .P0:in
probe(.P0:in)
```

Flip switches after **RUN** — probe reports `changed`.

### Runnable — output bus

```logts-play
comp [led] .led:
  length: 4
  color: ^0f9
  :

comp [ioport] .P0:
  out = .led
  :

.P0:out = 1100
show(.P0:out)
peek(.P0:out)
probe(.P0:out)
```

* `:in` — read-only aggregated input (computed from member `dip` values)
* `:out` — read-back of the current output bus (member `led` states)

On **Wave**, `show` is deferred until propagation settles; `peek` reads immediately. `probe` tracks `:in` / `:out` and reports `initialised` / `changed` like other component properties.

---

## Documentation

```logts
doc(comp.ioport)
doc(.P0)
```

`doc(.P0)` on an instance prints the bit map:

```text
.P0 (ioport)

Input:
  0-15   .addr
  16-23  .data

Output:
  0-7    .result
  8-11   .flags
```

### Runnable — `doc(.P0)`

```logts-play
comp [dip] .addr:
  length: 16
  :

comp [dip] .data:
  length: 8
  :

comp [led] .result:
  length: 8
  :

comp [led] .flags:
  length: 4
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  out = .result
  out = .flags
  :

doc(comp.ioport)
doc(.P0)
```

---

## Example — loopback

**Load & Run**, then toggle DIP switches — LEDs mirror the input.

```logts-play
comp [dip] .sw:
  length: 8
  visual: 1
  :

comp [led] .led:
  length: 8
  :

comp [ioport] .P0:
  in  = .sw
  out = .led
  :

.P0:out = .P0:in
```

### Runnable — loopback (Wave)

```logts-play wave
comp [dip] .sw:
  length: 8
  visual: 1
  :

comp [led] .led:
  length: 8
  :

comp [ioport] .P0:
  in  = .sw
  out = .led
  :

.P0:out = .P0:in
probe(.P0:in)
probe(.P0:out)
```

Flip switches after **RUN** — `:out` probe tracks LED mirror state.

---

## Example — CPU Port A to Port B

Corresponds to: read Port A, write Port B.

```logts-play
comp [dip] .portASw:
  length: 8
  visual: 1
  = 11110000
  :

comp [led] .portALed:
  length: 8
  :

comp [ioport] .portA:
  in  = .portASw
  out = .portALed
  :

comp [dip] .portBSw:
  length: 8
  :

comp [led] .portBLed:
  length: 8
  :

comp [ioport] .portB:
  in  = .portBSw
  out = .portBLed
  :

8wire value = .portA:in

.portB:out = value

show(value, .portA:in, .portB:out)
```

---

## Notes

* IOPORT is a grouping construct — no new signal storage inside the port.
* Input and output widths are independent.
* Intended for educational CPU, bus, and memory-mapped I/O examples.
* See also [dip.md](dip.md), [led.md](led.md), [interactive-components.md](interactive-components.md).
