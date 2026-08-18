# Allow / NotAllow

Keywords `Allow` and `NotAllow` control what may be used in a script via whitelist (Allow) and blacklist (NotAllow).

Default: everything allowed (`Allow ALL` implicit), nothing blocked (`NotAllow NONE` implicit).

## Meta tokens

| Token | Allow | NotAllow |
|-------|-------|----------|
| `ALL` | permit everything (clears list) | block everything |
| `NONE` | clear whitelist | clear blacklist |

## Categories

- `builtIn` — all builtin functions
- `func` — all user function calls
- `def` — defining functions with `def`
- `comp`, `chip`, `board`, `pcb`, `inline`, `phz` — all items in that module

## ASM preset sets (`inline.asm.set{}`)

Restrict which **AsmSet presets** may appear in an `inline [asm]` header (`set: generic`, `set: riscv32`, `set: arm-thumb`, …). Checked when the inline module is executed and when a program references that preset.

| Token | Allow | NotAllow |
|-------|-------|----------|
| `inline.asm.set{riscv32}` | only `riscv32` allowed (plus implicit `generic` if not blocked) | blocks `set: riscv32` |
| `inline.asm.set{riscv32 arm-thumb}` | whitelist multiple presets | blacklist multiple presets |

`generic` is the default when `set:` is omitted. To allow **only** a preset, combine with `Allow NONE`:

```logts
Allow NONE inline.type{asm} inline.asm.set{riscv32}
inline [asm] .rv:
  set: riscv32
  :
```

Block RISC-V but keep Thumb:

```logts
NotAllow inline.asm.set{riscv32}
inline [asm] .th:
  set: arm-thumb
  :
```

Runtime error (neutral message): `Inline asm set 'riscv32' is not allowed (NotAllow policy)`.

List available presets: `doc(inline.asm.sets)`.

## Typed lists (`module.type{}`)

- `comp.type{reg key ~ +}` — specific component types (shortcuts as in `comp [+]`)
- `chip.type{myChip}` — specific chip definitions
- `board.type{myBoard}`, `pcb.type{myPcb}`, `inline.type{asm protocol}`, `phz.type{obj gen cont}`

Bare IDs like `led` or `asm` refer to **user function names**, not comp/inline types. Use `comp.type{led}` for component types.

## Examples

```
NotAllow ADD SUBTRACT
8wire a := ADD(\1,\2)   # error after NotAllow line at runtime order

Allow NONE ADD
# only ADD builtin allowed

NotAllow comp.type{led}
comp [led] .x:           # error

NotAllow inline.asm.set{riscv32}
inline [asm] .rv:
  set: riscv32
  :                      # error at execInline

doc(Allow)               # current Allow policy
doc(NotAllow)            # current NotAllow policy
doc(inline.asm.sets)     # registered AsmSet presets
```

## Errors

Runtime/parse errors use neutral messages, e.g. `Built-in ADD is not allowed (NotAllow policy)`.
