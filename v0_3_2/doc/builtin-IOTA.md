# IOTA (index vector)

Index: [2D tensors](wire-vectors.md)

Rank-1 vector **`[0, 1, …, N−1]`**, each index stored in **W** bits (binary, zero-padded).

## Signatures

```
IOTA(\N) -> Wwire[N]
```

Assign to **`4wire[N]`**, **`4wire[1,N]`**, or **`4wire[N,1]`**. **`\N`** must match vector length (element count).

## Examples

```logts-play
4wire[3] idx = IOTA(\3)
show(idx)
```

Values: `0` → `0000`, `1` → `0001`, `2` → `0010` (for `4wire`).

## See also

[DIAG](builtin-DIAG.md) · [Vector reduction](vector-reduction.md)
