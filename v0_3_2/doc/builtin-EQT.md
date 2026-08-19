# EQT (ASCII text equality)

Index: [Text functions](text-functions.md) · [builtin-functions.md](builtin-functions.md)

Compare two **ASCII text** wire values. Unlike bitwise `EQ`, **`EQT` ignores NUL (`\0`) bytes** according to call tags — useful for padded strings, logic `text` pins, and C-style null-terminated blobs.

## Signatures

```
EQT(Wbit textA, Wbit textB) -> 1bit
EQT(Wbit textA, Wbit textB ; left) -> 1bit
EQT(Wbit textA, Wbit textB ; right) -> 1bit
EQT(Wbit textA, Wbit textB ; left right) -> 1bit
EQT(Wbit textA, Wbit textB ; any) -> 1bit
```

Operands are **8-bit ASCII cells** (wire string literals `"joe"`, `"joe\0"`, or any binary blob interpreted as bytes).

## Call tags (NUL handling)

| Tag | NUL (`\0`) handling before compare |
|-----|-------------------------------------|
| *(default)* / `any` | Remove **every** `\0` byte in each operand |
| `left` | Remove leading `\0` bytes only |
| `right` | Remove trailing `\0` bytes only |
| `left right` | Remove leading **and** trailing `\0` only (interior `\0` kept) |

**Mutual exclusion:** `any` cannot be combined with `left` or `right` → parse/runtime error.

## Examples

### Default — ignore `\0` anywhere

```logts-play
1wire eq0 = EQT("joe\0", "joe")
1wire eq1 = EQT("\0joe\0", "joe")
1wire eq2 = EQT("\0jo\0e\0", "joe")
show(eq0)
show(eq1)
show(eq2)
```

→ `111`.

### `;right` — trailing NUL only

```logts-play
1wire a = EQT("joe\0", "joe" ;right)
1wire b = EQT("\0joe", "joe" ;right)
show(a)
show(b)
```

→ `a=1`, `b=0`.

### `;left` — leading NUL only

```logts-play
1wire a = EQT("joe\0", "joe" ;left)
1wire b = EQT("\0joe", "joe" ;left)
1wire c = EQT("\0joe\0", "joe" ;left)
show(a)
show(b)
show(c)
```

→ `a=0`, `b=1`, `c=0`.

### `;left right` — edge NUL only

```logts-play
1wire eq = EQT("\0joe\0", "joe" ;left right)
show(eq)
```

→ `1`.

### `;any` — interior NUL ignored

```logts-play
1wire a = EQT("jo\0e", "joe" ;any)
1wire b = EQT("jo\0e\0\0\0\0", "joe" ;any)
1wire c = EQT("jo\0b", "joe" ;any)
show(a)
show(b)
show(c)
```

→ `a=1`, `b=1`, `c=0`.

## See also

[TRIMT](builtin-TRIMT.md) · [Text functions](text-functions.md) · [EQ](builtin-EQ.md) (bitwise)
