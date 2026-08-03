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
- `comp`, `chip`, `board`, `pcb`, `inline` — all items in that module

## Typed lists (`module.type{}`)

- `comp.type{reg key ~ +}` — specific component types (shortcuts as in `comp [+]`)
- `chip.type{myChip}` — specific chip definitions
- `board.type{myBoard}`, `pcb.type{myPcb}`, `inline.type{asm protocol}`

Bare IDs like `led` or `asm` refer to **user function names**, not comp/inline types. Use `comp.type{led}` for component types.

## Examples

```
NotAllow ADD SUBTRACT
8wire a := ADD(\1,\2)   # error after NotAllow line at runtime order

Allow NONE ADD
# only ADD builtin allowed

NotAllow comp.type{led}
comp [led] .x:           # error

doc(Allow)               # current Allow policy
doc(NotAllow)            # current NotAllow policy
```

## Errors

Runtime/parse errors use neutral messages, e.g. `Built-in ADD is not allowed (NotAllow policy)`.
