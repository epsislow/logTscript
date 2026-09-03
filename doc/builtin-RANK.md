# RANK

Index: [Wire vectors](wire-vectors.md) · [SHAPE](builtin-SHAPE.md) · [Tensor / matrix built-ins](builtin-functions.md)

Returns the **tensor rank** of a whole wire:

| Shape | `RANK` value |
|-------|----------------|
| Rank-1 (`[N]`, `[1,N]`, `[N,1]`) | `1` |
| True matrix (`N>1` and `M>1`) | `2` |

## Signatures

```
RANK(Wwire tensor) -> bit rank
```

Bit width follows the assignment target wire (default **2** bits when unspecified).

## Examples

```logts-play
4wire[2,2] m = 0001 + 0010 + 0100 + 1000
4wire[4] v = 0001 + 0010 + 0100 + 1000
2wire rankM = RANK(m)
1wire rankV = RANK(v)
show(rankM)
show(rankV)
```

→ `rankM=10` (rank 2), `rankV=1` (rank 1).

## See also

[SHAPE](builtin-SHAPE.md) · [wire-vectors.md — rank-1 vs matrix](wire-vectors.md#rank-1-vs-matrix)
