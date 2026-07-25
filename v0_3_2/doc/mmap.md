# Memory map (`comp [mmap]`)

**Unified logical address space** for [mem](mem.md), MMIO wires, component pins, and (phase 6d) **`device:`** profiles. Masters ([CPU](cpu.md) `mmap =`, [DMA](dma.md) `mmap =`) use **logical word addresses**; `comp [mmap]` decodes each access to the correct target.

Word addressing (not byte). Default **`unmapped:`** policy is **`error`**.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run** (same as [dma.md](dma.md) and [cpu.md](cpu.md)).

---

## Runnable examples (Load / Load & Run)

### mmap-read-rom-ram

Read **ROM word 0** (logical `0`) and **RAM word 0** (logical `16`) via mmap bus pins. **Load & Run:** first `show` → `00000001`, second → `00000000`.

```logts-play
comp [mem] .rom:
  depth: 8
  length: 16
  readonly
  on: 1
  = ^01020304
  :

comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  = ^00
  :

comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 0, size: 16, mem: .rom
    - base: 16, size: 16, mem: .ram
  on: 1
  :

5wire adrRom = 00000
5wire adrRam = 10000
1wire getEn = 1
.mmap:{ adr = adrRom, get = getEn }
8wire rom0 = .mmap:read
show(rom0)

.mmap:{ adr = adrRam, get = getEn }
8wire ram0 = .mmap:read
show(ram0)
```

`adrRam = 10000` is binary **16** (start of the RAM region).

---

### mmap-dma-copy-logical

**DMA** with `mmap =` — copy one word from ROM (logical `2`) to RAM (logical `16`). **Load & Run:** `done=1`, RAM offset 0 = `00000011`.

```logts-play
comp [mem] .rom:
  depth: 8
  length: 16
  readonly
  on: 1
  = ^01020304
  :

comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  = ^00
  :

comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 0, size: 16, mem: .rom
    - base: 16, size: 16, mem: .ram
  on: 1
  :

comp [dma] .dma:
  mmap = .mmap
  on: 1
  :

.dma:{ src = 1, srcAdr = 10, dstAdr = 10000, count = 1, set = 1 }

1wire done = .dma:done
.ram:{ adr = 0, set = 1 }
8wire cell = .ram:get
show(done)
show(cell)
```

`srcAdr = 10` → ROM offset 2 (`^03`). `dstAdr = 10000` → RAM base (logical 16).

---

### mmap-regs-io-bank

**`regs:`** window into a multi-word `comp [reg]`. Write via mmap pins, read back. **Load & Run:** `show` → `10101010`.

```logts-play
comp [reg] .io:
  depth: 8
  length: 4
  on: 1
  = ^00
  :

comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 100, size: 4, regs: .io
  on: 1
  :

7wire adrWr = 1100101
7wire adrRd = 1100101
8wire dataBus = 10101010
1wire wrEn = 1
.mmap:{ adr = adrWr, data = dataBus, write = wrEn }

1wire getEn = 1
.mmap:{ adr = adrRd, get = getEn }
8wire word = .mmap:read
show(word)
```

`adrWr` / `adrRd` = `1100101` (binary **101** — region base 100 + offset 1).

---

### mmap-mmio-dma-busy

Read DMA **`busy`** through a **`device:`** MMIO region. **Load & Run:** `show` → `00000000` (DMA idle).

```logts-play
comp [mem] .rom:
  depth: 8
  length: 4
  readonly
  on: 1
  = ^01
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

comp [mmap] .mmio:
  depth: 8
  regions:
    - base: 0, size: 4, device: .dma
  on: 1
  :

2wire adrBus = 00
1wire getEn = 1
.mmio:{ adr = adrBus, get = getEn }
8wire status = .mmio:read
show(status)
```

`adrBus = 00` → logical address **0** (device profile offset `0` = `busy`).

---

## Minimal map layout (ROM + RAM)

```logts
comp [mem] .rom:
  depth: 8
  length: 16
  readonly
  on: 1
  = ^01020304
  :

comp [mem] .ram:
  depth: 8
  length: 16
  on: 1
  = ^00
  :

comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 0, size: 16, mem: .rom
    - base: 16, size: 16, mem: .ram
  on: 1
  :
```

| Logical address | Region | Physical target |
|-----------------|--------|-----------------|
| `0` … `15` | `mem: .rom` | `.rom` offset `0` … `15` |
| `16` … `31` | `mem: .ram` | `.ram` offset `0` … `15` |

Formula: find region with `base ≤ adr < base + size` → local offset = `adr − base`.

---

## Body attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| **`depth:`** | `8` | Bus word width (bits). All `mem:` regions must match. Each `mmio` target must be **exactly `depth` bits** (no implicit narrow↔wide conversion). |
| **`regions:`** | *(required)* | Ordered list of non-overlapping windows (see below). |
| **`unmapped:`** | `error` | `error` — throw on access outside all regions. `read0` — read returns `depth` zero bits. `ignore` — writes outside regions are ignored. |

**Gap inside `mmio:`** (slot not listed): read → **`0`** (`depth` bits); write → **ignored**.

---

## Region syntax

```
regions:
  - base: 0, size: 16, mem: .rom
  - base: 16, size: 16, mem: .ram
  - base: 32, size: 8, mmio:
      0: busReg
      1: .panel:out
  - base: 64, size: 8, device: .dma
  - base: 100, size: 16, regs: .io
```

| Field | Meaning |
|-------|---------|
| **`base`** | First logical address of the window (decimal, `\decimal`, or `#hex` where supported). |
| **`size`** | Length in **words** (not bytes). |
| **`mem:`** | Window into `comp [mem]`; local offset `0 … size−1`. Honors `readonly` on the mem. |
| **`regs:`** | Window into `comp [reg]` register bank; local offset `0 … size−1`. Requires `length` on the reg ≥ region `size`. |
| **`mmio:`** | Sub-map: offset → `Nwire name` or `.comp:pin` / `.comp:pout` (exactly **`depth`** bits). |
| **`device:`** | MMIO profile from `getMmapProfile()` on the target component (see [Device profiles](#device-profiles-6d)). |

---

## MMIO width rule

| Binding | `depth: 8` | Result |
|---------|------------|--------|
| `8wire busReg` | 8 = 8 | OK |
| `3wire narrow` | 3 ≠ 8 | **Error** at declare |
| `.dma:busy` (1 bit) | 1 ≠ 8 | **Error** — compose in script |

**Pattern (narrow → bus width)** — see runnable example [mmap-mmio-dma-busy](#mmap-mmio-dma-busy) above.

```logts
1wire busy = .dma:busy
8wire dmaBusy = busy + 0000000

comp [mmap] .mmap:
  depth: 8
  regions:
    - base: 0, size: 4, mmio:
        0: dmaBusy
  on: 1
  :
```

---

## Optional bus pins

Manual access without CPU/DMA:

| Pin | Role |
|-----|------|
| **`adr`** | Logical address (width from map span). |
| **`data`** | Write data (`depth` bits). |
| **`write`** | `1` → `mmapWrite(adr, data)`. |
| **`get`** | `1` → latch read into pout **`read`**. |

Use wires for `adr` / `get` / `write` (avoid naming a wire `adr` if you also use property `adr`).

---

## DMA with `mmap =` ([dma.md](dma.md))

```
comp [dma] .dma:
  mmap = .mmap
  on: 1
  :
```

| | **`mems:`** (phase 5) | **`mmap =`** (phase 6) |
|---|----------------------|-------------------------|
| Addressing | slot + local offset | **logical** `srcAdr` / `dstAdr` |
| **`src` / `dst` pins** | slot index 1…N | **`src`**: `0` = fill, `1` = copy (not a slot) |
| Cross-region copy | multiple jobs | **one job** — decoder per word |

**Copy** (fragment — full script in [mmap-dma-copy-logical](#mmap-dma-copy-logical)):

```logts
.dma:{ src = 1, srcAdr = 10, dstAdr = 10000, count = 1, set = 1 }
```

**Fill:**

```logts
.dma:{ src = 0, dstAdr = 10000, count = 100, value = ^aa, set = 1 }
```

`mems:` and `mmap =` are **mutually exclusive**.

---

## CPU with `mmap =` ([cpu.md](cpu.md))

```
comp [cpu] .u:
  mmap = .mmap
  prog:
    depth: 8
    length: 32
    = .cpuisa { … }
  :
```

- **`LOAD` / `STORE`** use the same logical addresses as DMA (`mmapRead` / `mmapWrite`).
- **`prog =` / `prog:`** stay Harvard (program fetch separate).
- **`ram =` / `ram:`** and **`mmap =`** are **mutually exclusive**.

---

## Device profiles (6d)

Components may implement **`static getMmapProfile(comp, depth)`**. Region:

```
- base: 32, size: 8, device: .dma
```

**DMA profile (offsets):**

| Offset | Access |
|--------|--------|
| `0` | Read **`busy`** (padded to `depth`) |
| `1` | Write latch **`count`** |
| `2` | Write latch **`dstAdr`** |
| `3` | Write pin **`set`** |

---

## API (device layer)

| Function | Role |
|----------|------|
| `mmapResolve(id, adr)` | `{ kind, local, unmapped }` |
| `mmapRead(id, adr, ctx)` | Read word at logical address |
| `mmapWrite(id, adr, word, ctx, registry)` | Write word |

---

## `doc(comp.mmap)` / `doc(.mmap)`

```
doc(comp.mmap)
doc(.mmap)
```

**`doc(.mmap)`** lists `depth`, regions (`mem` / `regs` / `mmio` / `device`), and span.

---

## Related

- [dma.md](dma.md) — `mems:` and `mmap =` transfers
- [cpu.md](cpu.md) — `ram =` vs `mmap =`, LOAD/STORE
- [mem.md](mem.md) — backing storage for `mem:` regions
- [doc-function.md](doc-function.md) — `doc()` index

## Not in MVP

| Feature | Plan |
|---------|------|
| Implicit narrow MMIO masking | Rejected — use wires + slice |
