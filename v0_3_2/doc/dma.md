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
| `started`, `queued`, `rejected` | Result of the **last** submit (one-hot style flags) |
| `startedTotal`, `queuedTotal`, `rejectedTotal`, `submitSeq` | Monotonic counters |

Example — wire the status flags:

```
1wire ok = .dma:done
1wire go = .dma:started
show(ok)
show(go)
```

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

Same semantics as a single block — latch fields until `set = 1`:

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

---

## `doc(.dma)` instance map

```
doc(.dma)
```

Example output:

```
.dma (dma)

mems (slot → instance):
  1  .rom
  2  .ram

queue: 1
```

---

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
