# ASM composition (v2)

Extend inline ASM programs with **composition directives** inside `{ }`: reuse other assembled wires with `use`, pad with `repeat` / `align`, set a logical load address with `base:`, and branch to labels defined in another module with `label>`.

This is **not a linker** — it runs at assemble time in the interpreter. The result is still a single binary blob (and metadata) suitable for `comp [mem]` or wire assignment.

`show(wire)` still prints **bits only**. Use `show(.isa:decode(wire))` for disassembly.

---

## Directives

| Directive | Example | Effect |
|-----------|---------|--------|
| `repeat N { … }` | `repeat 8 { NOP }` | Expands the block `N` times |
| `align N { … }` | `align 16 { NOP }` | Inserts whole copies of the block until the next instruction would start at a multiple of `N` |
| `base: value` | `base: 128` | Sets the **logical** address for labels and absolute `A` fields in this unit |
| `use name` | `use boot` | Splices the referenced wire's program at the current position |
| `use name:` + `base:` | see below | Splices the module after relocating it to the given base |

### `base:` values

| Form | Example |
|------|---------|
| Decimal literal | `base: \128` |
| Wire symbol | `base: BOOT_BASE` (wire must hold a numeric value) |
| LUT label | `base: .memoryMap:boot` |

Expressions such as `base: X + 256` are **rejected**.

When a module is inserted with plain `use boot`, any `base:` inside `boot` is **ignored** — the chunk is placed at the current offset. Override with:

```logts
use driver:
  base: .memoryMap:drivers
```

### External labels (`label>`)

| Syntax | Scope |
|--------|-------|
| `loop:` | Local to the current assembly unit |
| `JMP dsp>` | External — resolved after `use` composition on the final program |

Unresolved externals at the top level produce: `Unresolved external label 'dsp'`.

---

## Runnable — `repeat` and `align`

```logts-play
inline [asm] .myisa:
  NOP : 0000 + 4b
  :

64wire x = .myisa { repeat 8 { NOP } }
show(x)
```

```logts-play
inline [asm] .myisa:
  NOP : 0000 + 4b
  :

136wire fw = .myisa {
  NOP
  align 16 { NOP }
next:
  NOP
}
show(fw)
```

If the padding block size does not divide the required gap, assembly fails (for example `align 6 { NOP; NOP }` after one instruction).

---

## Runnable — `use` and external labels

```logts-play
inline [asm] .myisa:
  NOP : 0000 + 4b
  JMP : 0101 + A4b
  :

16wire boot = .myisa {
  JMP dsp>
  NOP
}
8wire dsp = .myisa {
dsp:
  NOP
}
24wire firmware = .myisa {
  use boot
  use dsp
}
show(firmware)
show(.myisa:decode(firmware))
```

---

## Multi-ISA firmware

Each wire keeps the ISA used to assemble it. The outer program uses its own ISA for local instructions; `use` inserts pre-assembled segments from other ISAs.

```logts-play
inline [asm] .cpuA:
  NOP  : 0000 + 4b
  HALT : 1111 + 4b
  :

inline [asm] .cpuB:
  NOP  : 1010 + 4b
  STOP : 0101 + 4b
  :

8wire dsp = .cpuB { NOP }
24wire fw = .cpuA {
  NOP
  use dsp
  HALT
}
show(fw)
show(.cpuA:decode(fw))
```

---

## Metadata and `:decode`

Assembling `.myisa { … }` registers an **AsmModule** (blob, instruction list, segments). Wires created from that expression carry `asmModuleId`. When present, `:decode` formats from stored instruction words instead of re-guessing from bits alone.

Assigning a plain literal (`x = ^hex`) clears ASM metadata. Re-assigning from another ASM program copies metadata.

---

## Wire width

| Operator | ASM blob length |
|----------|-----------------|
| `=` | Must match **exactly** |
| `:=` / `=:` | Padding allowed only when the blob is **shorter** than the wire |

After `use`, the composed blob may be longer than a single module — size the wire accordingly (`32wire`, `comp [mem]`, etc.).

---

## riscv32 preset

Preset ISAs use the same composition directives. Each instruction is **32 bits**; size wires as `32 × instruction_count`.

```logts-play
inline [asm] .rv:
  set: riscv32
  :

32wire boot = .rv { addi x1, x0, 1 }
64wire app = .rv {
  use boot
  addi x2, x0, 2
}
show(app; asm)
```

`use` splices the referenced wire's expanded program. External labels (`target>`) and `base:` behave like generic asm. See [asm-set-riscv32.md](asm-set-riscv32.md).

---

## arm-thumb preset

Each Thumb instruction is **16 bits**:

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

16wire init = .th { movs r0, 1 }
32wire main = .th {
  use init
  movs r1, 2
  adds r2, r0, r1
}
show(main; asm)
```

See [asm-set-arm-thumb.md](asm-set-arm-thumb.md).

---

## Multi-set composition (heterogeneous presets)

`use` splices the **referenced wire's ISA and AsmSet**, not the outer program's. A single blob may concatenate segments with different **`asmSetId`** and **`wordWidth`** values (same model as legacy multi-ISA composition).

Each instruction in module metadata carries its own `isa`, `asmSetId`, and `wordWidth`. `:decode` formats every instruction with **that** instruction's ISA (not only the outer `.isaRef`).

```logts-play
inline [asm] .boot:
  set: generic
  NOP : 0000 + 4b
  :

inline [asm] .app:
  set: riscv32
  :

8wire bootBlob = .boot { NOP }
40wire app = .app {
  use bootBlob
  addi x1, x0, 5
}
show(app; asm)
show(.app:decode(app))
```

Mixed **16-bit Thumb** + **32-bit RISC-V**:

```logts-play
inline [asm] .th:
  set: arm-thumb
  :

inline [asm] .rv:
  set: riscv32
  :

16wire init = .th { movs r0, 1 }
48wire mix = .rv {
  use init
  addi x1, x0, 5
}
show(mix; asm)
show(.rv:decode(mix))
```

| Metadata | Meaning |
|----------|---------|
| `module.segments[]` | One entry per `use` segment or local chunk: `isaRef`, `asmSetId`, `wordWidth`, `blobOffset`, `instrCount` |
| `module.instructions[]` | Per instruction: `word`, `asmSetId`, `wordWidth`, `isa` |

**CPU execution** on a heterogeneous blob (fetch/decode across sets) is **not** covered here — see executor per AsmSet (phase 1+x.3). Encode, wire assignment, and `:decode` work today.

---

## Related

- [asm.md](asm.md) — ISA definition and ASM v1
- [mem.md](mem.md) — storing the final blob
- [assignment-operators.md](assignment-operators.md) — `=`, `:=`, `=:`
