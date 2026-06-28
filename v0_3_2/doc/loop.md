# Loop preprocessor (`loop N..M[`)

Before tokenization, the preprocessor expands **loop blocks** that duplicate lines of source text.

## Syntax

```
loop START..END[
  ... body ...
]
```

- `START` and `END` are decimal integers; `END` must be ≥ `START`.
- Brackets `[` `]` delimit the body; nested `[` `]` inside the body are balanced.
- Nested `loop` blocks are supported.
- Maximum **256** total iterations per nesting group (product of all loop counts in that tree).

## Placeholders

Inside the body, these placeholders are replaced on expansion:

| Placeholder | Meaning |
|-------------|---------|
| `?` | Sequential counter from 1 upward (all active levels) |
| `?0` | Value of the outermost loop (level 0) |
| `?1`, `?2`, … | Value of nested loop at that level |

Lines that reference only specific `?N` levels are **deduplicated** when those level values did not change since the previous emitted line.

## Example

```
loop 1..3[
  4wire w?
]
```

Expands to:

```
  4wire w1
  4wire w2
  4wire w3
```

Nested example:

```
loop 1..2[
  loop 1..2[
    4wire x?0?1
  ]
]
```

→ four lines: `x11`, `x12`, `x21`, `x22`.

## Pipeline order

1. **Short notation** (backtick expressions) is expanded first.
2. **Loop blocks** are expanded second.
3. The tokenizer and parser see only the flattened source.

## Not confused with

- **Protocol** inline segments: `repeat 0 4b` inside `[protocol]` — bit repetition in packet layout; not a loop block.
- **ASM** labels and jumps: `loop:` / `JMP loop` in `[asm]` ISA definitions — assembler mnemonics; not expanded by this preprocessor.

## Comments

A line starting with `#` is a comment. `loop` inside a comment is ignored:

```
# loop 1..5[
4wire a = ^FF
```

The second line is not expanded.
