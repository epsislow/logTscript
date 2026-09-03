# Cache Component (`comp [cache]`)

The `cache` component implements a **set-associative cache** in front of a backing store (`comp [mem]` or another `comp [cache]`). Reads and writes go through the cache; the engine tracks **hits**, **misses**, **evictions**, and **hit rate**. Optional **`missCycles`** models a pedagogical miss penalty via the **`busy`** pout (for CPU **`wait`**). Sibling caches on the same RAM are kept coherent automatically on backing writes.

CPU [`ram =`](cpu.md#phase-3--linked-memory-prog---ram--) and [`prog =`](cpu.md#phase-3--linked-memory-prog---ram--) accept `comp [cache]` like `comp [mem]`. [DMA](dma.md) `mems:` and [mmap](mmap.md) `cache:` regions also route through `getMem` / `setMem`.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [cpu.md](cpu.md) and [mem.md](mem.md)).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Geometry** | `lines` sets × `ways` lines/set × `lineSize` words/line |
| **Default** | `ways: 1` (direct-mapped, Phase A/B compatible), `missCycles: 0` (instant) |
| **Policies** | `evictType`, `writePolicy`, `writeAllocate` |
| **Maintenance** | `flush`, `invalidate`, `invalidateAll`, `resetStats` (+ `line` / `adr` / `way`) |
| **Stats** | `hits`, `misses`, `hitRate`, `evictions`, `dirtyEvictions`, `busy` |
| **Coherence** | Automatic invalidation for **sibling** caches (`mem =` same `.ram`); L1→L2 chains need **manual** `invalidate` |

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
  ways: 1
  missCycles: 0
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
| **`ways`** | Optional, default **`1`**. Lines per set (associativity). |
| **`missCycles`** | Optional, default **`0`**. Miss penalty in abstract cycles (`busy` pout). |
| **`on`** | `1` / `raise` / `edge` — same as other components. Use **`on: 1`** for level-triggered property blocks. |

`doc(.l1)` prints backing, geometry, policies, **`ways`**, **`missCycles`**, and **capacity** (`lines × ways × lineSize` addresses).

---

## Address mapping

For address `adr` (word index, `0 … length−1`):

| Field | Formula |
|-------|---------|
| **set index** | `floor(adr / lineSize) % lines` |
| **tag** | `floor(adr / (lineSize × lines))` |
| **offset in line** | `adr % lineSize` |

### Direct-mapped (`ways: 1`)

Each set holds **one** line. A new tag in the same set **replaces** the previous line (eviction).

### Set-associative (`ways: N`, N > 1)

Each set holds up to **N** lines with different tags. A miss installs into a free way; when all ways are valid, **`evictType`** picks the victim.

**Capacity (addressable words cached at once):** `lines × ways × lineSize` (same as backing `length` is allowed but not required).

**Example:** `length: 16`, `lines: 4`, `lineSize: 1`, `ways: 2` → 4 sets, 2 tags per set, up to 8 words cached.

---

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| **`mem =`** | *(required)* | Backing `comp [mem]` or `comp [cache]`. |
| **`depth`** | — | Bits per word; must equal backing `depth`. |
| **`length`** | — | Number of words; must equal backing `length`. |
| **`lines`** | — | Number of cache sets (≥ 1). |
| **`lineSize`** | — | Words per line (≥ 1). |
| **`ways`** | `1` | Associativity — lines per set (≥ 1). |
| **`missCycles`** | `0` | Miss penalty: `0` = instant (`busy` always `0` after access). `N > 0` starts `busy` after each miss (see [Miss penalty](#miss-penalty-misscycles--busy)). |
| **`evictType`** | `lru` | Replacement when set is full: `lru`, `fifo`, or `random`. Meaningful when **`ways > 1`** (or tag conflict with `ways: 1`). |
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

1. If cache is disabled (`enabled` false at create), pass through to backing.
2. Compute set from address. Search all **ways** in the set. If **valid** and **tag** matches → **hit**, return word at offset.
3. Otherwise **miss**: pick empty way or evict (see [Eviction](#eviction)), load line from backing, return word **immediately** (even when `missCycles > 0`).

### Writes (`setMem` / CPU STORE / DMA write)

1. If disabled, write backing only.
2. On **hit**: update line; `writeThrough` also writes backing; `writeBack` marks line **dirty**.
3. On **miss** with **`writeAllocate: 0`**: write backing only, count miss, no line installed.
4. On **miss** with **`writeAllocate: 1`**: load/evict line, then write as hit.

### Eviction

When a new tag needs a set with no free way:

| Step | Action |
|------|--------|
| **`writeBack`** dirty victim | Write full line to backing first (**`dirtyEvictions`**++) |
| **Replace** | Load new tag into victim way |
| **Count** | **`evictions`**++ |

| `evictType` | Victim selection |
|-------------|------------------|
| **`lru`** | Lowest `lastUsed` (least recently used) |
| **`fifo`** | Lowest `fifoSeq` (first installed in set) |
| **`random`** | Uniform random way (deterministic seed per instance) |

With **`ways: 1`**, eviction is always the single line in the set on tag conflict.

### Miss penalty (`missCycles` + `busy`)

When **`missCycles: N`** with **`N > 0`**:

| Event | Behaviour |
|-------|-----------|
| **Miss** | Line loads immediately; data returned on first access; **`busy ← 1`**, internal `remaining ← N`. The miss access itself does **not** decrement `remaining`. |
| **Any later `getMem` / `setMem`** on this cache while `remaining > 0` | `remaining--`; when `0`, **`busy ← 0`**. Hits and misses both decrement. |
| **Hit** with `remaining = 0` | Does not start a new penalty. |

Bind CPU stall: `wait = .l1:busy` on [`comp [cpu]`](cpu.md#stall--wait-phase-5c). Multiple masters on the same cache share one `busy` / counter.

**Not modelled:** async `getMem` that blocks until data is ready; global memory bus.

### Coherence (sibling caches)

Two or more caches with **`mem = .ram`** (same instance) are **siblings**:

```
CPU → .l1 ──┐
            ├── mem = .ram
DMA → .l2 ──┘
```

| Write source | Sibling invalidation |
|--------------|---------------------|
| Direct write to `.ram` (`setMem` on mem) | All sibling caches: matching line **`valid ← 0`** |
| Cache **`writeThrough`** to RAM | Same (other siblings invalidated; writer keeps its line) |
| Cache **`writeBack`** without flush | RAM unchanged — siblings **not** notified (correct) |

**Not automatic:** L1 with `mem = .l2` when DMA writes `.ram` directly — invalidate `.l1` manually:

```logts
.l1:{ adr = 10100, way = \2, invalidate = 1, set = 1 }
```

### Maintenance pins (use with **`set = 1`**)

| Pin | Effect |
|-----|--------|
| **`flush`** | Write all dirty lines to backing (`writeBack` only). |
| **`invalidate`** | Drop line(s) selected by **`line`** / **`adr`** and **`way`** (no write-back). |
| **`invalidateAll`** | Invalidate every set and way. |
| **`resetStats`** | Zero hits, misses, evictions, dirtyEvictions (cached data unchanged). |

**Set selection:** pin **`line`** (set index) or **`adr`** (address → set index). **`adr`** overrides **`line`** when both appear in the same block.

### Pin `way` encoding

Width: `max(1, ceil(log2(ways + 2)))` bits.

| `way` value | On **`invalidate`** | On inspect (`valid`, `dirty`, `tag`, `data`) |
|-------------|---------------------|-----------------------------------------------|
| **`0 … ways−1`** | Invalidate that way only | Read that way |
| **`ways`** | Invalidate **all** ways in the set | — |
| **`ways + 1`** | No-op | **First valid way** (low index → high); if none → `valid = 0` |

**`ways: 1`:** `way = 0` = only way; `way = 1` = whole set; `way = 2` = auto / first valid.

---

## Pins and pouts

| Name | Dir | Width | Description |
|------|-----|-------|-------------|
| `flush` | pin | 1 | With `set = 1`: push dirty lines to backing. |
| `invalidate` | pin | 1 | With `set = 1`: invalidate per `way` encoding. |
| `invalidateAll` | pin | 1 | With `set = 1`: invalidate all sets/ways. |
| `resetStats` | pin | 1 | With `set = 1`: clear statistics. |
| `line` | pin | ⌈log₂(lines)⌉ | Select set for inspect / invalidate. |
| `adr` | pin | ⌈log₂(length)⌉ | Select set by address. |
| `way` | pin | ⌈log₂(ways+2)⌉ | Way select / set-all / auto (see table above). |
| `set` | pin | 1 | Apply maintenance pins in the same block. |
| `hits` | pout | 16 | Hit count (saturates at 65535). |
| `misses` | pout | 16 | Miss count (saturates at 65535). |
| `hitRate` | pout | 7 | Approximate hit % 0–100. |
| `evictions` | pout | 16 | Line evictions. |
| `dirtyEvictions` | pout | 16 | Dirty write-backs on eviction. |
| `busy` | pout | 1 | `1` while miss penalty `remaining > 0` (`missCycles > 0`). |
| `valid` | pout | 1 | Inspected way has a valid line. |
| `dirty` | pout | 1 | Inspected way is dirty. |
| `tag` | pout | tag bits | Tag of inspected way (`0` if invalid). |
| `data` | pout | depth×lineSize | Concatenated line data (word 0 … lineSize−1). |

Counters use **saturation** (no wrap). **`hitRate`** is `0` when `hits + misses = 0`.

---

## Using with CPU

### Data cache (`ram = .l1`)

Every LOAD/STORE goes through `.l1`. Counters update automatically.

### Instruction cache (`prog = .icache`)

Fetch reads go through the cache. Place **`on: 1`** on the CPU before or after nested `ram:` / `prog:` blocks.

### Stall on cache miss penalty

```logts
comp [cpu] .u:
  wait = .l1:busy
  ram = .l1
  ...
```

See [CPU stall / `wait`](cpu.md#stall--wait-phase-5c).

### Nested caches (L1 → L2 → RAM)

```
comp [cache] .l2:
  mem = .ram
  ...

comp [cache] .l1:
  mem = .l2
  ...

comp [cpu] .u:
  ram = .l1
  ...
```

L1 misses pull from L2; L2 misses pull from RAM. Coherence on `.ram` does **not** propagate to `.l1` automatically — use **`invalidate`** on `.l1` after external RAM writes if needed.

---

## Using with DMA

`mems:` accepts `comp [cache]` entries. Transfers use `getMem` / `setMem` on the cache device. Direct DMA writes to backing RAM invalidate sibling caches (see [Coherence](#coherence-sibling-caches)).

---

## Using with mmap

```
comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 0, size: 16, cache: .l1
  on: 1
  :
```

See [mmap.md](mmap.md#mmap-cache-region).

---

## Component type documentation

```
doc(comp.cache)
doc(.l1)
```

---

## Runnable — hit and miss

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

## Runnable — `ways: 2` (two tags, then eviction)

Addresses `0` and `4` share set `0` (tags `0` and `1`) — both fit with `ways: 2`. Address `8` (tag `2`) forces an eviction.

```logts-play
comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  = ^0102030405060708
:

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 16
  lines: 4
  lineSize: 1
  ways: 2
  on: 1
:

comp [dma] .dma:
  mems: .ram .l1
  on: 1
  :

.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
.dma:{ src = 1, dst = \2, srcAdr = \4, dstAdr = \4, count = 1, set = 1 }
.dma:{ src = 1, dst = \2, srcAdr = \8, dstAdr = \8, count = 1, set = 1 }
16wire evictCount = .l1:evictions
show(evictCount)
```

**Load & Run:** `evictCount` = `0000000000000001` (third distinct tag in set `0` evicts one line).

---

## Runnable — `missCycles` and `busy`

`missCycles: 2` — after the first read miss, `busy` stays `1` until two more cache accesses.

```logts-play
comp [mem] .ram:
  depth: 8
  length: 8
  on: 1
  = ^42
:

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 8
  lines: 4
  lineSize: 1
  missCycles: 2
  on: 1
:

comp [dma] .dma:
  mems: .ram .l1
  on: 1
  :

.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
1wire busy1 = .l1:busy
.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
1wire busy2 = .l1:busy
.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
1wire busy3 = .l1:busy
show(busy1)
show(busy2)
show(busy3)
```

**Load & Run:** `busy1` = `1` (after miss), `busy2` = `1` (one access left), `busy3` = `0` (penalty complete).

---

## Runnable — sibling coherence (DMA writes RAM)

CPU loads through `.l1`; DMA copies into `.ram` backing, which invalidates the cached line. Second `run` sees a miss and the new value.

```logts-play
inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  HALT  : 0111 + 4b
  :

comp [mem] .ram:
  depth: 8
  length: 8
  on: 1
  = ^aa
:

comp [mem] .rom:
  depth: 8
  length: 4
  on: 1
  = ^55
:

comp [cache] .l1:
  mem = .ram
  depth: 8
  length: 8
  lines: 4
  lineSize: 1
  on: 1
:

comp [dma] .dma:
  mems: .rom .ram
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
      HALT
    }
  :
.u:{ run = 1 }
8wire r0before = .u:r0
.dma:{ src = 1, dst = \2, srcAdr = 0, dstAdr = 0, count = 1, set = 1 }
.u:{ run = 1 }
8wire r0after = .u:r0
16wire misses = .l1:misses
show(r0before)
show(r0after)
show(misses)
```

**Load & Run:** `r0before` = `10101010` (`0xaa`). After ROM `0x55` is copied into RAM, second `run` reloads: `r0after` = `01010101`, `misses` = `0000000000000010` (initial miss + reload miss).

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

**Load & Run:** `before` = `00001010` (address 0 still `0x0a` in backing). `after` = `01010101` (value from A1 stored to A0, flushed to RAM).

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
  ways: 2
  missCycles: 0
  on: 1
  :

doc(.l1)
```

**Load & Run:** output includes `ways: 2`, `missCycles: 0`, and `capacity: 8`.

---

## Phase scope

| Included (Phase A–C) | Later |
|----------------------|-------|
| Set-associative cache (`ways`), stats, flush, invalidate | Bus pins on cache (Phase D) |
| `missCycles` + `busy`, CPU `wait` | Multi-port cache |
| CPU `ram =` / `prog =`, DMA, mmap `cache:` | MESI / update snooping |
| Sibling coherence on backing write | Automatic L1 invalidation on L2 backing write |

See [future-component-ideas.md](future-component-ideas.md) for roadmap items.
