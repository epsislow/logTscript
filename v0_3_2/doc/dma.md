# DMA Component (`comp [dma]`)

Standalone **DMA controller** for bulk copy between [mem](mem.md) instances. One `comp [dma]` in a scene; the memory list is declared on the component body (`mems:`); each transfer selects source and destination by **slot index** (1-based) in a property block.

Works **without** a [CPU](cpu.md) — useful for init, memcpy, and teaching bus patterns. Optional CPU integration (shared RAM) is shown in the examples below; CPU stall while `busy` is planned for a later sub-phase.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [cpu.md](cpu.md) and [mem.md](mem.md)).

---

## Syntax

```
comp [mem] .rom:
  depth: 8
  length: 16
  readonly: 1
  on: 1
  = ^aa5500ff
  :

comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .rom .ram
  # slot 1 = .rom,  slot 2 = .ram
  on: 1
  :
```

Use **`on: 1`** so property blocks that drive `set` run like other components ([reg.md](reg.md), [mem.md](mem.md)).

---

## Body attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| **`mems:`** | *(required)* | Ordered list of `comp [mem]` references. **Slot 1** = first entry, **slot 2** = second, … Minimum **one** memory. |
| **`queue:`** | `1` | FIFO depth for pending jobs (0 = strict: reject when a job cannot start immediately). |

**Declaration rules:**

| Check | Error |
|-------|-------|
| `mems:` missing or empty | `DMA requires mems: with at least one comp [mem]` |
| Different `depth` across listed memories | `DMA mems depth mismatch` |
| Duplicate entries (`mems: .buf .buf`) | Allowed — two slots, same physical chip |
| `dst` targets `readonly` memory | Error at **submit** (`set = 1`) |

`doc(.dma)` prints a **slot → instance** table plus `queue:` (same idea as [ioport](ioport.md) pin maps).

---

## Transfer block (`src` / `dst` slots)

Each transfer is one property block (or separate pin assignments) ending with **`set = 1`**.

```
.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 100, set = 1 }
```

| Field | Meaning |
|-------|---------|
| **`src`** | Source slot **1…N** in `mems` (`\2` = decimal 2). **`src = 0`** reserved for **fill** (memset) — not available yet. |
| **`dst`** | Destination slot **1…N**. **`dst = 0`** → error. |
| **`srcAdr`**, **`dstAdr`** | Word index inside each [mem](mem.md) (0 … `length−1`). |
| **`count`** | Number of words to copy. |
| **`set`** | Submit trigger (active `1`). |
| **`reset`** | Clear queue, latch, counters (use with **`set = 1`** in the same block). |

Values are resolved by the language parser (binary literals, `\decimal`, wires) — DMA receives the resolved bit string.

**Same slot, overlapping regions:** copy uses **memmove** semantics (safe overlap).

**Mode:** **`instant`** (default) — all `count` words copy synchronously on `set = 1`.

---

## Pins and pouts

| Pin | Role |
|-----|------|
| `src`, `dst` | Slot indices (width from `mems.length`) |
| `srcAdr`, `dstAdr`, `count` | Address / length |
| `set` | Submit job |
| `reset` | Reset DMA state |

| Pout | Role |
|------|------|
| `busy` | `1` while a job is active or the queue is non-empty |
| `done` | `1` after the last completed transfer |
| `queueSize`, `queueFull` | Queue status |
| `started`, `queued`, `rejected` | Result of the **last** submit (pulse flags — see [Submit flags](#submit-result-flags-started--queued--rejected)) |
| `startedTotal`, `queuedTotal`, `rejectedTotal`, `submitSeq` | Monotonic counters since last `reset` |

Example — wire the status flags:

```
1wire ok = .dma:done
1wire go = .dma:started
show(ok)
show(go)
```

---

## Submit result flags (`started` / `queued` / `rejected`)

Each successful **`set = 1`** with a complete job (`src`, `dst`, `count`) is a **submit**. The DMA records what happened to **that** submit:

| Pout | Meaning |
|------|---------|
| **`started`** | `1` = job ran **immediately** (DMA was idle, FIFO empty) |
| **`queued`** | `1` = job was **accepted into the FIFO** (DMA busy or FIFO already had work) |
| **`rejected`** | `1` = FIFO **full** — job dropped (no throw; storage unchanged) |

Only **one** of `started` / `queued` / `rejected` is `1` for the **last** submit. Earlier submits are **not** kept on these pins — use the counters.

| Counter | Meaning |
|---------|---------|
| **`startedTotal`** | Jobs that started immediately since `reset` |
| **`queuedTotal`** | Jobs accepted into the queue since `reset` |
| **`rejectedTotal`** | Jobs rejected since `reset` |
| **`submitSeq`** | Total submits with a valid job (`startedTotal + queuedTotal + rejectedTotal`) |

### How to read “what happened at this block?”

| Need | Pattern |
|------|---------|
| Last block result (panel / live wire) | Wire **`started`**, **`queued`**, or **`rejected`** |
| History across several blocks | **`show(.dma:startedTotal)`** (and siblings), or delta between reads |
| Wave timeline | Same pouts update when the block’s `set` is evaluated in that wave step |

### `instant` mode (default) + sequential scripts

In **`instant`** mode each job finishes inside the same `set = 1` handling. In a **legacy** script that runs top-to-bottom, the FIFO is usually **empty** before each new `.dma:{ … set = 1 }` → you typically see **`started = 1`** every time and **`startedTotal`** incrementing.

**`queued`** / **`rejected`** matter when a prior job left work in the FIFO at submit time (e.g. **`mode: paced`** in phase 5d, or multiple submits batched in one wave step before the DMA drains). The FIFO depth is **`queue:`** (default **`1`**).

`reset` clears flags, counters, latch, and the queue (use **`reset = 1, set = 1`** in the same block).

---

## Runnable examples (Load / Load & Run)

### dma-copy-rom-to-ram

Copy **4 words** from slot 1 (`.rom`) to slot 2 (`.ram`). **Load & Run:** `done=1`, `busy=0`, RAM words 0–3 match ROM.

```logts-play
comp [mem] .rom:
  depth: 8
  length: 8
  readonly: 1
  on: 1
  = ^01020304
  :

comp [mem] .ram:
  depth: 8
  length: 8
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .rom .ram
  on: 1
  :

.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 100, set = 1 }

1wire done = .dma:done
1wire busy = .dma:busy
.ram:{ adr = 0, set = 1 }
8wire cell = .ram:get
show(done)
show(busy)
show(cell)
```

`count = 100` is binary **4**. First RAM cell should be `00000001` (`^01`).

---

### dma-memmove-overlap

One memory in `mems`; copy **4 words** from address 0 to address 1 (overlap). **Load & Run:** word at address 1 equals the old value at address 0.

```logts-play
comp [mem] .buf:
  depth: 8
  length: 8
  on: 1
  = ^0102030405060708
  :

comp [dma] .dma:
  mems: .buf
  on: 1
  :

.dma:{ src = 1, dst = 1, srcAdr = 0, dstAdr = 1, count = 100, set = 1 }

.buf:{ adr = 1, set = 1 }
8wire w = .buf:get
show(w)
```

**Load & Run:** `w` = `00000001` (old value at address 0).

---

### dma-status-flags

Submit one transfer; read `started` and totals.

```logts-play
comp [mem] .src:
  depth: 8
  length: 4
  on: 1
  = ^0a
  :

comp [mem] .dst:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .src .dst
  on: 1
  :

.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }

1wire st = .dma:started
1wire dn = .dma:done
show(st)
show(dn)
```

**Load & Run:** `st` = `1`, `dn` = `1`.

---

### dma-submit-totals

Three sequential instant copies; **`startedTotal`** reaches 3 (each submit **`started`** in legacy order).

```logts-play
comp [mem] .m1:
  depth: 8
  length: 4
  on: 1
  = ^01
  :

comp [mem] .m2:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [mem] .m3:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .m1 .m2 .m3
  queue: 2
  on: 1
  :

.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
.dma:{ src = 1, dst = \3, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
.dma:{ src = \2, dst = \3, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }

show(.dma:started)
show(.dma:startedTotal)
show(.dma:submitSeq)
```

**Load & Run:** `startedTotal` / `submitSeq` show **3** (binary `11`). Last block: `started = 1`.

---

### dma-wave-wires

**Wave** template: one property block, parameters on wires (orange **Load** badge = wave propagation). See [signal-propagation.md](signal-propagation.md).

```logts-play wave
comp [mem] .src:
  depth: 8
  length: 4
  on: 1
  = ^55
  :

comp [mem] .dst:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .src .dst
  on: 1
  :

2wire si = 01
2wire di = 10
4wire n = 0001
1wire go = 1

.dma:{ src = si, dst = di, srcAdr = 0, dstAdr = 0, count = n, set = go }

1wire st = .dma:started
1wire dn = .dma:done
.dst:{ adr = 0, set = 1 }
8wire cell = .dst:get
show(st)
show(dn)
show(cell)
```

**Load & Run (wave):** `cell` = `01010101` (`^55`).

---

### dma-separate-pins

Same transfer as a single block, but **separate pin writes** (useful when each field comes from different logic).

```logts-play
comp [mem] .src:
  depth: 8
  length: 4
  on: 1
  = ^0c
  :

comp [mem] .dst:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .src .dst
  on: 1
  :

.dma:src = 1
.dma:dst = \2
.dma:srcAdr = 0
.dma:dstAdr = 0
.dma:count = 1
.dma:set = 1

.dst:{ adr = 0, set = 1 }
8wire w = .dst:get
show(w)
show(.dma:done)
```

---

### dma-doc-instance

Live **`doc(.dma)`** after declaration (slot map).

```logts-play
comp [mem] .rom:
  depth: 8
  length: 8
  on: 1
  = ^aa
  :

comp [mem] .ram:
  depth: 8
  length: 8
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .rom .ram
  queue: 1
  on: 1
  :

doc(.dma)
```

**Load & Run:** output lists `1  .rom`, `2  .ram`, and `queue: 1`.

---

### dma-cpu-shared-ram

[CPU](cpu.md) uses **`ram = .ram`**. DMA copies constants from `.rom` into that same RAM; then the CPU **LOAD**s cell 0.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  HALT  : 0111 + 4b
  :

comp [mem] .rom:
  depth: 8
  length: 4
  readonly: 1
  on: 1
  = ^2a
  :

comp [mem] .ram:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .rom .ram
  on: 1
  :

comp [cpu] .u:
  isa: .cpuisa
  registers: 4
  on: 1
  ram = .ram
  prog:
    depth: 8
    length: 8
    = .cpuisa {
      LOAD R0 A0
      HALT
    }
  :

.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
.u:{ set = 1 }
.u:{ set = 1 }
8wire r0 = .u:r0
show(r0)
show(.dma:done)
```

**Load & Run:** `r0` = `00101010` (42 / `^2a`). DMA must run before CPU steps (order in script).

---

### dma-three-mems

Three [mem](mem.md) chips in `mems:` — copy `.a` → `.c` (slot 1 → slot 3).

```logts-play
comp [mem] .a:
  depth: 8
  length: 4
  on: 1
  = ^de
  :

comp [mem] .b:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [mem] .c:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [dma] .dma:
  mems: .a .b .c
  on: 1
  :

.dma:{ src = 1, dst = \3, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }

.c:{ adr = 0, set = 1 }
8wire w = .c:get
show(w)
```

**Load & Run:** `w` = `11011110` (`^de`).

---

## Separate pin assignments (wave-friendly)

Same semantics as a single block — fields are **latched** on each assignment; the job runs when **`set = 1`** is active. Runnable version: [dma-separate-pins](#dma-separate-pins).

```
2wire si = 1
2wire di = \2
4wire n = 1
1wire go

.dma:src = si
.dma:dst = di
.dma:srcAdr = 0
.dma:dstAdr = 0
.dma:count = n
.dma:set = go
```

Wave example with one combined block: [dma-wave-wires](#dma-wave-wires).

---

## `doc(comp.dma)` and `doc(.dma)`

| Call | Output |
|------|--------|
| **`doc(comp.dma)`** | Type signature (pins, pouts, attributes) — like other `doc(comp.*)` |
| **`doc(.dma)`** | **Instance** map: slot → `comp [mem]`, plus `queue:` |

Runnable: [dma-doc-instance](#dma-doc-instance).

Example **`doc(.dma)`** text:

```
.dma (dma)

mems (slot → instance):
  1  .rom
  2  .ram

queue: 1
```

---

## `doc()` in scripts

```
doc(comp.dma)
doc(.dma)
```

See [doc-function.md](doc-function.md) for the full `doc()` index.

## Not yet implemented

| Feature | Plan |
|---------|------|
| **Fill** (`src = 0` + `value`) | Phase 5e |
| **`mode: paced`**, `chunk`, `clock` | Phase 5d |
| **CPU `dma = .dma` stall** while `busy` | Phase 5c |
| **`mmap =`** unified address space | Phase 6 |

---

## Related

- [mem.md](mem.md) — storage, `readonly`, multi-port (`ports: 2` for future CPU+DMA same step)
- [cpu.md](cpu.md) — Harvard CPU; link `ram = .data` to share RAM with DMA
- [asm.md](asm.md) — program ROM content loaded into [mem](mem.md)
- [doc-function.md](doc-function.md) — `doc(comp.dma)` / `doc(.dma)`
