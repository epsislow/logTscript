# Cache Component (`comp [cache]`)

The `cache` component implements a **direct-mapped cache** in front of a backing store. Reads and writes go through the cache; the engine tracks **hits**, **misses**, **evictions**, and **hit rate**. Backing can be [mem](mem.md) or another cache (L1 → L2 → RAM).

CPU [`ram =`](cpu.md#phase-3--linked-memory-prog---ram--) and [`prog =`](cpu.md#phase-3--linked-memory-prog---ram--) accept `comp [cache]` the same way as `comp [mem]`. [DMA](dma.md) `mems:` lists can include caches.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [cpu.md](cpu.md) and [mem.md](mem.md)).

---

## Syntax

```
comp [mem] .ram:
  depth: 8
  length: 256
  on: 1
  = ^00
  :

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 256
  lines: 16
  lineSize: 4
  evictType: lru
  writePolicy: writeBack
  writeAllocate: 1
  on: 1
  :
```

| Rule | Detail |
|------|--------|
| **`mem =`** | Required. One backing reference: `comp [mem]` or `comp [cache]`. |
| **`depth` / `length`** | Required. Must match the backing store exactly. |
| **`lines` / `lineSize`** | Required. Cache geometry (see [Address mapping](#address-mapping)). |
| **`on`** | `1` / `raise` / `edge` — same as other components. Use **`on: 1`** for level-triggered property blocks. |

`doc(.l1)` prints backing, geometry, policies, and **capacity** (`lines × lineSize` addresses).

---

## Address mapping (direct-mapped)

For address `adr` (word index, 0 … `length−1`):

| Field | Formula |
|-------|---------|
| **set index** | `floor(adr / lineSize) % lines` |
| **tag** | `floor(adr / (lineSize × lines))` |
| **offset in line** | `adr % lineSize` |

Each **set** holds at most one line: `{ valid, dirty, tag, data[lineSize] }`.

**Example:** `length: 16`, `lines: 4`, `lineSize: 1` → 4 sets, 1 word per line, tags distinguish which “row” of the address space is cached.

---

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| **`mem =`** | *(required)* | Backing `comp [mem]` or `comp [cache]`. |
| **`depth`** | — | Bits per word; must equal backing `depth`. |
| **`length`** | — | Number of words; must equal backing `length`. |
| **`lines`** | — | Number of cache sets (≥ 1). |
| **`lineSize`** | — | Words per line (≥ 1). |
| **`evictType`** | `lru` | Replacement on conflict in the same set: `lru`, `fifo`, or `random`. |
| **`writePolicy`** | `writeBack` | `writeBack` — writes stay in the line until **flush** or dirty eviction. `writeThrough` — each write also updates backing immediately. |
| **`writeAllocate`** | `1` | `1` — write miss loads a line then writes. `0` — write miss bypasses cache (write goes straight to backing; line not installed). |
| **`on`** | `raise` | Property-block trigger mode (`1`, `raise`, `edge`, …). |

**Validation errors:**

| Check | Error |
|-------|-------|
| Missing `mem =` | `cache requires mem = backing comp [mem] or comp [cache]` |
| Missing `depth` / `length` / `lines` / `lineSize` | `cache requires …` |
| `depth` or `length` ≠ backing | `cache depth/length … does not match backing` |

---

## Behaviour

### Reads (`getMem` / CPU LOAD / DMA read)

1. If cache is disabled (`on: 0` path — `enabled` false at create), pass through to backing.
2. Compute set from address. If **valid** and **tag** matches → **hit**, return word at offset.
3. Otherwise **miss**: optionally evict current line (write-back dirty data first), load line from backing, return word.

### Writes (`setMem` / CPU STORE / DMA write)

1. If disabled, write backing only.
2. On **hit**: update line; `writeThrough` also writes backing; `writeBack` marks line **dirty**.
3. On **miss** with **`writeAllocate: 0`**: write backing only, count miss, no line installed.
4. On **miss** with **`writeAllocate: 1`**: load/evict line, then write as hit.

### Eviction

When a new tag needs a set that already holds a different valid line:

- **`writeBack`**: dirty line is written to backing first (**dirtyEvictions** counter).
- **`evictType`**: `lru` (least recently used), `fifo` (first installed), or `random`.
- **evictions** counter increments.

### Maintenance pins (use with **`set = 1`**)

| Pin | Effect |
|-----|--------|
| **`flush`** | Write all dirty lines to backing (`writeBack` only). |
| **`invalidate`** | Drop the line selected by **`line`** or **`adr`** (no write-back). |
| **`invalidateAll`** | Invalidate every set. |
| **`resetStats`** | Zero hits, misses, evictions, dirtyEvictions (does not change cached data). |

**Inspect** which set is selected for `invalidate` / pouts `valid`, `dirty`, `tag`, `data`:

- **`line`** — set index (binary, `log2(lines)` bits).
- **`adr`** — any address; engine maps it to the set index for that address.

---

## Pins and pouts

| Name | Dir | Width | Description |
|------|-----|-------|-------------|
| `flush` | pin | 1 | With `set = 1`: push dirty lines to backing. |
| `invalidate` | pin | 1 | With `set = 1`: invalidate inspected set. |
| `invalidateAll` | pin | 1 | With `set = 1`: invalidate all sets. |
| `resetStats` | pin | 1 | With `set = 1`: clear statistics. |
| `line` | pin | log₂(lines) | Select set for inspect / invalidate. |
| `adr` | pin | log₂(length) | Select set by address (overrides `line` when both set in same block). |
| `set` | pin | 1 | Apply maintenance pins in the same block. |
| `hits` | pout | 16 | Hit count (saturates at 65535). |
| `misses` | pout | 16 | Miss count (saturates at 65535). |
| `hitRate` | pout | 7 | Approximate hit percentage 0–100 (`round(100 × hits / (hits+misses))`). |
| `evictions` | pout | 16 | Line evictions. |
| `dirtyEvictions` | pout | 16 | Dirty write-backs on eviction. |
| `busy` | pout | 1 | Always `0` in Phase A (reserved). |
| `valid` | pout | 1 | Inspected set has a valid line. |
| `dirty` | pout | 1 | Inspected set is dirty. |
| `tag` | pout | tag bits | Tag of inspected set. |
| `data` | pout | depth×lineSize | Concatenated line data (word 0 … word lineSize−1). |

Counters use **saturation** (no wrap). **`hitRate`** is `0` when `hits + misses = 0`.

---

## Using with CPU

### Data cache (`ram = .l1`)

```logts
comp [cpu] .u:
  isa: .cpuisa
  on: 1
  ram = .l1
  prog:
    depth: 8
    length: 16
    = .cpuisa { … }
  :
```

Every LOAD/STORE on the CPU goes through `.l1`. Counters update automatically.

### Instruction cache (`prog = .icache`)

```logts
comp [cpu] .u:
  isa: .cpuisa
  on: 1
  prog = .icache
  ram:
    depth: 8
    length: 16
  :
```

Fetch reads go through the cache. Place **`on: 1`** on the CPU **before** nested `ram:` / `prog:` blocks, or **after** them at the same indent — both work.

### Nested caches

```
comp [cache] .l2:
  mem = .ram
  …
:

comp [cache] .l1:
  mem = .l2
  …
:

comp [cpu] .u:
  ram = .l1
  …
:
```

L1 misses pull lines from L2; L2 misses pull from RAM.

---

## Using with DMA

`mems:` accepts `comp [cache]` entries (same `depth` as other slots):

```
comp [dma] .dma:
  mems: .rom .l1
  on: 1
  :
.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 4, set = 1 }
```

Slot indices are still 1-based. Transfers use `getMem` / `setMem` on the cache device.

---

## Component type documentation

```
doc(comp.cache)
```

Instance documentation:

```
doc(.l1)
```

---

## Runnable — hit and miss (CPU + data cache)

Two LOADs from the same address: one miss, one hit.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  HALT  : 0111 + 4b
  :

comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  = ^0000000a
:

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 16
  lines: 4
  lineSize: 1
  on: 1
:

comp [cpu] .u:
  isa: .cpuisa
  on: 1
  ram = .l1
  prog:
    depth: 8
    length: 16
    = .cpuisa {
      LOAD R0 A0
      LOAD R1 A0
      HALT
    }
  :
.u:{ run = 1 }
16wire hits = .l1:hits
16wire misses = .l1:misses
show(hits)
show(misses)
```

**Load & Run:** `hits` = `0000000000000001`, `misses` = `0000000000000001`.

---

## Runnable — instruction cache (`prog = .icache`)

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  HALT  : 0111 + 4b
  :

comp [mem] .pmem:
  depth: 8
  length: 8
  on: 1
  = .cpuisa { HALT }
:

comp [cache] .icache:
  mem = .pmem
  depth: 8
  length: 8
  lines: 4
  lineSize: 1
  on: 1
:

comp [cpu] .u:
  isa: .cpuisa
  on: 1
  prog = .icache
  ram:
    depth: 8
    length: 4
  :
.u:{ set = 1 }
1wire halted = .u:halted
show(halted)
```

**Load & Run:** `halted` = `1` after one step (HALT fetched through the cache).

---

## Runnable — write-back and flush

Store updates the cache line; backing RAM stays stale until **flush**.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  STORE : 0010 + R2b + A2b
  HALT  : 0111 + 4b
  :

comp [mem] .ram:
  depth: 8
  length: 8
  on: 1
  = ^0a55
:

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 8
  lines: 4
  lineSize: 1
  writePolicy: writeBack
  on: 1
:

comp [cpu] .u:
  isa: .cpuisa
  on: 1
  ram = .l1
  prog:
    depth: 8
    length: 16
    = .cpuisa {
      LOAD R0 A1
      STORE R0 A0
      HALT
    }
  :
.u:{ run = 1 }
8wire before = .ram:get
show(before)
.l1:{ flush = 1, set = 1 }
8wire after = .ram:get
show(after)
```

**Load & Run:** `before` = `00001010` (address 0 still `0x0a` in backing). `after` = `01010101` (value loaded from A1 and stored to A0, flushed to RAM).

---

## Runnable — `doc(.l1)`

```logts-play
comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  :

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 16
  lines: 4
  lineSize: 1
  on: 1
  :

show(doc(.l1))
```

**Load & Run:** output includes `mem = .ram` and `capacity: 4`.

---

## Using with mmap (Phase B)

A logical address window can target a cache instead of raw `mem`:

```
comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 0, size: 16, cache: .l1
  on: 1
  :
```

[CPU](cpu.md) `mmap =` and [DMA](dma.md) `mmap =` accesses go through `mmapRead` / `mmapWrite` → `getMem` / `setMem` on the cache device. Stats on `.l1` update as usual. See [mmap.md](mmap.md#mmap-cache-region) for a runnable example.

---

## Phase scope

| Included | Later phases |
|----------|----------------|
| Direct-mapped cache, `getMem` / `setMem` | Bus pins on cache (Phase D) |
| CPU `ram =` / `prog =` cache | Multi-port cache |
| DMA `mems:` with cache | Associativity, snooping (Phase C) |
| **`mmap` `cache:` regions** | |
| Stats, flush, invalidate | |

See [future-component-ideas.md](future-component-ideas.md) for roadmap items.
