# DOT (dot product)

Index: [Vector reduction](vector-reduction.md) · [2D tensors](wire-vectors.md#dot-and-argmax--argmin-on-tensors) · [Tagged built-ins](builtin-tagged-index.md)

Pairwise multiply and sum along the **inner** dimension: **`Σ a[k] × b[k]`**.

On **rank-1** tensors the result is a **scalar**. On compatible **2D** shapes the result is a **matrix** (one dot product per output cell). **No `; matrix` tag** — behaviour follows operand shapes automatically.

## Signatures

```
DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
DOT(Wbit[n] a, Wbit[n] b; signed) -> Wbit result, (2W)bit over
DOT(8wire[n] a, 8wire[n] b; q4p4) -> 8bit result, 16bit over
DOT(16wire[n] a, 16wire[n] b; q8p8) -> 16bit result, 32bit over
DOT(16wire[n] a, 16wire[n] b; fp16) -> 16bit result, 32bit inexact
DOT(16wire[n] a, 16wire[n] b; bf16) -> 16bit result, 32bit inexact
DOT(Wwire[N,K] a, Wwire[K,M] b) -> Wwire[N,M] result, (2W)wire[N,M] over
DOT(Wwire[N,K] a, Wwire[K,M] b; signed) -> Wwire[N,M] result, (2W)wire[N,M] over
```

Rank-1 operands with the same **element count** (`[N]`, `[1,N]`, `[N,1]`) use the scalar dot path. Matrix multiply requires **`A.cols == B.rows`** (true 2D shapes).

## Tensor shape rules

| A | B | Result | Inner dim K |
|---|---|--------|-------------|
| rank-1, **N** elements | rank-1, **N** elements | scalar `Wbit` + `(2W)bit over` | N |
| `[N,1]` | `[1,N]` or `[N]` | scalar | N |
| `[1,N]` | `[N,1]` | scalar | N |
| `[N,K]` | `[K,M]` | matrix `[N,M]` — `W` result/cell, `2W` over/cell | K |
| `[N,1]` | `[N,M]` | matrix `[N,M]` (column × matrix) | N |

Incompatible shapes are a **runtime error**. Assign the target to match the output rank (`4wire` vs `4wire[2,2]` vs `8wire[2,2]` for over).

## Scalar / vector output (default)

- `result` = low **W** bits of each dot product
- `over` = next **2W** bits; full value = `over` ‖ `result` (per cell on matrices)

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed multiply per pair, signed accumulate (scalar or per matrix cell). |
| `q4p4` | Rank-1 dot on **8-bit** elements; result **8** bits, `over` **16** bits. |
| `q8p8` | Rank-1 dot on **16-bit** elements; result **16** bits, `over` **32** bits. |
| `fp16` / `bf16` | Rank-1 dot on **16-bit** float wires; `over` = inexact accumulation flag width. |

**No `; vector`** or **`; matrix`** — whole tensors only. Format tags apply to **rank-1** dot products only (not 2D matrix multiply).

## Examples

### `DOT(Wbit[n] a, Wbit[n] b)` — rank-1 → scalar

```logts-play
4wire[2] a = 0001 + 0010
4wire[2] b = 0011 + 0100
4wire r, 8wire o = DOT(a, b)
show(r)
show(o)
```

`1×3 + 2×4 = 11` → `r=1011`.

```logts-play
4wire[3] vectorA = 0001 + 0010 + 0011
4wire[3] vectorB = 0100 + 0101 + 0110
4wire result, 8wire over = DOT(vectorA, vectorB)
show(result)
show(over)
```

Same result for `4wire[3,1]`×`4wire[3,1]` or mixed rank-1 shapes with three elements.

### `DOT(Wbit[n] a, Wbit[n] b; signed)`

```logts-play
4wire[2] a = 1111 + 0010
4wire[2] b = 1111 + 0001
4wire r, 8wire o = DOT(a, b; signed)
show(r)
show(o)
```

Signed `(−1)×(−1) + 2×1 = 3`.

### `DOT(8wire[n] a, 8wire[n] b; q4p4)`

```logts-play
8wire[2] a = 00011000 + 00001000
8wire[2] b = 00010000 + 00010000
8wire dot, 16wire over = DOT(a, b; q4p4)
show(dot; q4p4)
show(over)
```

`[1.5, 0.5]·[1, 1] = 2.0`.

### `DOT(Wwire[N,K] A, Wwire[K,M] B)` — matrix multiply

```logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] b = 0101 + 0110 + 0111 + 1000
4wire[2,2] r, 8wire[2,2] o = DOT(a, b)
show(r)
show(o)
```

Each output cell `(i,j)` is `DOT(row i of A, col j of B)`. **`over`** is **`8wire[2,2]`** here ( **`2W`** bits per cell).

### `DOT(A, IDENTITY(\N))` — identity on the right

```logts-play
4wire[2,2] a = 0001 + 0010 + 0011 + 0100
4wire[2,2] eye = IDENTITY(\2)
4wire[2,2] r, 8wire[2,2] o = DOT(a, eye)
show(r)
```

`DOT(a, I) = a` (same low **W** bits per cell). See [builtin-IDENTITY.md](builtin-IDENTITY.md).

### `DOT(col, row)` — column × row → scalar

```logts-play
4wire[3,1] col = 0001 + 0010 + 0011
4wire[3] row = 0100 + 0101 + 0110
4wire r, 8wire o = DOT(col, row)
show(r)
show(o)
```

`[N,1]` × `[1,N]` contracts to one scalar (`N` products summed).

### `DOT(col, row; signed)` — signed contraction

```logts-play
4wire[2,1] col = 1111 + 0010
4wire[2] row = 1111 + 0001
4wire r, 8wire o = DOT(col, row; signed)
show(r)
show(o)
```

## See also

[MAC](builtin-MAC.md) · [SUM](builtin-SUM.md) · [OUTER](builtin-OUTER.md) · [IDENTITY](builtin-IDENTITY.md)
