# TRIMT (ASCII text trim)

Index: [Text functions](text-functions.md) · [builtin-functions.md](builtin-functions.md)

Remove characters from an **ASCII text** wire using a **trim set** (second argument). Same call-tag model as [EQT](builtin-EQT.md), but trims arbitrary bytes instead of comparing.

## Signatures

```
TRIMT(Wbit text, Wbit trimChars) -> Wbit
TRIMT(Wbit text, Wbit trimChars ; left) -> Wbit
TRIMT(Wbit text, Wbit trimChars ; right) -> Wbit
TRIMT(Wbit text, Wbit trimChars ; left right) -> Wbit
TRIMT(Wbit text, Wbit trimChars ; any) -> Wbit
```

- **First argument:** source text — wire or string literal.
- **Second argument:** trim set — each **8-bit cell** is one character to remove (e.g. `" "` or `" \0"`).
- **Result width:** same bit width as the first argument; shorter logical text is **right-padded with `\0`**.

**Wire operands:** `TRIMT(myWire, " "; left)` reads the wire value at call time; output width matches `myWire`.

## Call tags

| Tag | Trim behaviour |
|-----|----------------|
| *(default)* / `any` | Remove **every** character in the trim set **wherever** it appears |
| `left` | Remove trim-set characters from the **start** only |
| `right` | Remove trim-set characters from the **end** only; trailing `\0` padding is peeled first (LogTScript text convention) |
| `left right` | Trim from **both** edges (interior characters kept); trailing `\0` padding peeled before right trim |

**Mutual exclusion:** `any` cannot be combined with `left` or `right`.

## Examples

### `;right` — trailing `\0`

```logts-play
48wire t = TRIMT("  a  \0", "\0" ;right)
show(t; ascii)
```

→ `"  a  "` (trailing NUL removed).

### `;right` — trailing spaces (after NUL peel)

```logts-play
48wire t = TRIMT("  a  \0", " " ;right)
show(t; ascii)
```

→ `"  a"` (trailing spaces removed; leading spaces kept).

### `;any` — all spaces

```logts-play
48wire t = TRIMT("  a  \0", " " ;any)
show(t; ascii)
```

→ `"a"` (every space removed).

### Wire operands

```logts-play
48wire src =: "  a  \0"
48wire t = TRIMT(src, " "; left)
show(t; ascii)
```

→ `"a  "` (leading spaces trimmed; wire width preserved).

### `;any` — spaces and NUL everywhere

```logts-play
48wire t = TRIMT("  a  \0", " \0" ;any)
show(t; ascii)
```

→ `"a"`.

## See also

[EQT](builtin-EQT.md) · [Text functions](text-functions.md) · [wire-literals.md — strings](wire-literals.md)
