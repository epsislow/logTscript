# FILL (constant matrix · bit pattern tile)

Index: [builtin-functions.md](builtin-functions.md) · [2D tensors](wire-vectors.md)

Live signatures: `doc(FILL)` (two overload lines from `Interpreter.BUILTIN_DOC`).

## Matrix fill (N×N)

Fill every cell of an **N×N** matrix with the same scalar value.

### Signatures

```
FILL(\N, Wbit scalar) -> Wwire[N,N]
```

- **`\N`** — matrix dimension (must match target).
- **scalar** — any **W**-bit expression (literal, wire, or slice).

### Runnable example

```logts-play
4wire[2,2] m = FILL(\2, 0011)
show(m)
```

## Bit pattern tile (protocol-style `repeat`)

Tile a **binary pattern** to an exact total width (same idea as `repeat 0 8b` / `repeat(0101, 8b)` in [protocol-assemble.md](protocol-assemble.md)).

```
FILL(pattern, \N) -> Nbit
```

- **pattern** — `0`, `1`, or a binary literal (`0101`, …).
- **`\N`** — total output width in bits; must be a multiple of `length(pattern)`.

### Zeros and clock pattern

```logts-play
4wire cs = FILL(0, \4)
8wire clk = FILL(0101, \8)
show(cs)
show(clk)
```

### UART-style frame (data + even parity)

```logts-play
8wire data = 01100110
1wire par = PARITYEVEN(data)
9wire frame = data + par
show(frame)
```

## See also

[ZEROS](builtin-ZEROS.md) · [IDENTITY](builtin-IDENTITY.md) · [REPEAT](builtin-REPEAT.md) · [PARITYEVEN](builtin-PARITYEVEN.md)
