# Memory Component (mem)

The `mem` component implements a RAM memory with configurable number of addresses (`length`) and bits per address (`depth`). Each address stores one binary word of `depth` bits.

---

## Syntax

```
comp [mem] .name:
  depth: 8
  length: 16
  on: raise
  :
```

Minimal form (all defaults):

```
comp [mem] .name::
```

---

## Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `depth`   | integer | `4`     | Number of bits per address (word size) |
| `length`  | integer | `3`     | Number of addresses |
| `on`      | mode    | `raise` | Trigger mode for property blocks: `raise`, `edge`, `1`, `0` |

---

## Initialization

Memory can be initialized at declaration time using `=`. The initializer is split into chunks of `depth` bits, one per address starting from address 0. All other addresses are set to `0`.

### Binary literal

```
comp [mem] .rom:
  depth: 4
  length: 8
  = 10110011
  :
```

`10110011` is 8 bits, `depth` is 4 → two addresses:
- address 0 = `1011`
- address 1 = `0011`
- addresses 2–7 = `0000`

### Hex literal

```
16wire init = ^ffff

comp [mem] .ram:
  depth: 8
  length: 16
  = ^ffff
  :
```

`^ffff` = `1111111111111111` (16 bits), `depth` is 8 → two addresses:
- address 0 = `11111111`
- address 1 = `11111111`
- addresses 2–15 = `00000000`

### Variable reference

```
16wire d = ^ffff

comp [mem] .ram:
  depth: 8
  length: 16
  = d
  :
```

The variable `d` must already be declared before the `comp` statement. The value is read at the time of declaration. Same splitting behavior as a literal.

### ASM program

Instead of hand-encoding hex, initialize program ROM from an [inline ASM](asm.md) instance. The ISA name **must** start with `.` (e.g. `.myisa`, not `myisa`).

```
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  :
```

At declaration:

```
comp [mem] .prog:
  depth: 8
  length: 4
  = .myisa {
    NOP
    LOAD R1 A3
  }
  :
```

The assembler produces one `depth`-bit word per instruction; words are packed into the mem blob in order (address 0, 1, 2, …).

**Validations:** `wordWidth` of the ISA must equal `mem.depth`; number of instructions must not exceed `mem.length`.

Runtime reload (resets all addresses, then writes from address 0):

```
.prog = .myisa { NOP; LOAD R1 A3 }
```

See [asm.md](asm.md) for ISA syntax, labels, and errors.

Runnable coverage here is **partial** — declaration init and runtime reload only. A full system demo (CPU + inline components together) is planned separately; see [future-component-ideas.md](future-component-ideas.md).

### Runnable — ASM init at declaration

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  = .myisa {
    NOP
    LOAD R1 A3
  }
  :

8wire w0 = .prog:get
show(w0)
```

First ROM slot = first assembled instruction (`NOP` → `00000000`).

### Runnable — runtime reload (`.mem = .isa { … }`)

Empty `mem` at declaration; program loaded on assignment (all addresses cleared first):

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

comp [mem] .prog:
  depth: 8
  length: 4
  :

.prog = .myisa { NOP; LOAD R1 A3 }
8wire w0 = .prog:get
show(w0)
```

Same result as init-at-declaration for address 0; use this pattern when the program is chosen or patched after setup.

### Padding

If the initializer is shorter than `depth`, it is padded with leading zeros:

```
4wire short = 11

comp [mem] .m:
  depth: 8
  length: 4
  = short
  :
# address 0 = 00000011
```

---

## Bulk assignment — `.mem = value`

After declaration, memory can be re-initialized using direct assignment. This **resets all addresses to `0`** first, then writes the new value starting at address 0.

```
comp [mem] .ram:
  depth: 8
  length: 16
  :

16wire d = ^f0f0
.ram = d
# address 0 = 11110000
# address 1 = 11110000
# addresses 2–15 = 00000000
```

The value is split into `depth`-bit chunks exactly like initialization. The number of chunks must not exceed `length`.

> **Note:** `.mem = value` always resets the entire memory before writing. To write a single address without affecting others, use the `:adr`, `:data`, `:write` property block.

---

## Property block — read and write

### Reading (`:adr` + `:get`)

Set the address in a property block, then read via `:get`:

```
.ram:{
  adr = 0010    # address 2
}

8wire val = .ram:get   # reads address 2
```

### Writing (`:adr` + `:data` + `:write`)

```
.ram:{
  adr   = 0001    # address 1
  data = 10101010
  write = 1
}
```

When `write = 1`, the value in `data` is written to address `adr`.

### Writing multiple addresses at once

If `data` is a multiple of `depth`, multiple consecutive addresses are written starting from `at`:

```
.ram:{
  adr   = 0000
  data = 1111000011110000   # 16 bits, depth=8 → 2 addresses
  write = 1
}
# address 0 = 11110000
# address 1 = 11110000
```

---

## Pins and pouts

| Name    | Type | Description |
|---------|------|-------------|
| `adr`    | pin  | Address to read or write (binary, `log2(length)` bits) |
| `data`  | pin  | Data to write (one or more `depth`-bit words) |
| `write` | pin  | `1` = write `data` to `adr`; `0` = do nothing |
| `get`   | pout | Value at the current address (`adr`) |

---

## Direct value (`:get` at address 0)

Reading the component directly (without `:adr`) returns the value at address 0:

```
8wire x = .ram:get       # address is 0 by default
8wire y = .ram:get;16    # padded to 16 bits
```

---

## Bit range and padding on reads

The `;p` padding operator and bitrange work on memory reads:

```
8wire a = .ram:get;16        # pad address-0 value to 16 bits
4wire b = .ram:get.0-3       # bits 0–3 of address-0 value
8wire c = .ram:get.0-3;8     # bits 0–3, then pad to 8
```

---

## Component type documentation

```
doc(comp.mem)
```

Output:

```
comp [mem] .name:
  length: integer
  depth: integer
  on: raise/edge/1/0
  = Xbit
  :{
    Xpin adr
    1pin write
    Xpin data
    Xpout get
  }
  -> Xbit
```

The `= Xbit` line indicates that `mem` accepts an initializer. The value is split into `depth`-bit chunks — see the **Initialization** section above for the full behavior.

---

## Multi-port memory (`ports`)

A single physical memory array can expose **1–4 independent ports** in the same simulation step (e.g. Harvard CPU fetch + data access, or CPU + DMA).

| Attribute | Default | Description |
|-----------|---------|-------------|
| `ports` | `1` | Number of ports (1–4) |
| `readonly` | off | Blocks writes from property blocks; init (`=`) and `.mem =` still allowed |

Port 1 uses `adr`, `data`, `write`, `get`. Port 2+ prefix the pin names: `2adr`, `2data`, `2write`, `2get`, … up to `4get`.

```logts-play
comp [mem] .ram:
  ports: 2
  length: 4
  depth: 4
  on: 1
  = 1010
  :

4wire a0 = 0000
4wire a1 = 0001
.ram:{ adr = a0
  set = 1 }
4wire v0 = .ram:get
.ram:{ 2adr = a1
  set = 1 }
4wire v1 = .ram:2get
show(v0)
show(v1)
```

**Write rules:** writes are queued per simulation step and committed together. If two ports write the same address in one step → `Memory write collision at address N` (storage unchanged). Reads (`:get`, `:2get`, …) are combinational from committed storage (value from the previous step).

**Read-only (`readonly`):** use for program ROM semantics — property-block writes are rejected; bulk assign and declaration init still work.

**Redirect reads in one block:** use `get >= wire` for port 1 and `2get >= wire` for port 2 (also `3get>`, `4get>`). Multiple ports may be read in the same property block after setting each port’s `adr` pin.

```logts-play
comp [mem] .ram:
  ports: 2
  length: 4
  depth: 4
  on: 1
  = 1010
  :

4wire a0 = 0000
4wire a1 = 0001
4wire v0
4wire v1
.ram:{
  adr = a0
  get >= v0
  2adr = a1
  2get >= v1
  set = 1
}
show(v0)
show(v1)
```

Dual writes in one block (different addresses, no collision): set `write`/`data` on port 1 and `2write`/`2data` on port 2 in the same `{ … }` block.

> **Breaking change (v0.3.x):** the address pin was renamed from `at` to **`adr`**. Update all `comp [mem]` property blocks and inline assignments (`.data:adr = …`).

---

## Notes

- `depth` is the **word size** — the number of bits stored per address.
- `length` is the **number of addresses** — the total number of words.
- Initializers: binary/hex literal, wire variable, or **ASM program** (`= .isa { ... }`) — see [asm.md](asm.md).
- The literal initializer (`= value`) splits the value into `depth`-bit chunks. The last chunk is padded with leading zeros if shorter than `depth`.
- `.mem = value` (or `.mem = .isa { ... }`) resets **all** addresses to `0` before writing, even those not covered by the value.
- To write individual addresses without resetting others, always use the `:adr`, `:data`, `:write` property block.
- `getMem`/`setMem` are browser-side functions. In the test environment (Node.js), address 0 is accessible via `comp.initialValue`; other addresses require the browser runtime.

---

## Related

- [asm.md](asm.md) — define ISA and load programs into `mem`
- [lut.md](lut.md) — combinational lookup (different from sequential `mem`)
- [mini-cpu.md](mini-cpu.md) — teaching CPU using `comp [mem]` for program and data
- [mini-cpu-v2.md](mini-cpu-v2.md) — full CPU demo with ASM ROM and `BEQ`
