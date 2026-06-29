# DOT (dot product)

Index: [Vector reduction](vector-reduction.md) · [Tagged built-ins](builtin-tagged-index.md)

Pairwise multiply and sum: **`Σ a[i] × b[i]`**.

## Signatures

```
DOT(Wbit[n] a, Wbit[n] b) -> Wbit result, (2W)bit over
DOT(Wbit[n] a, Wbit[n] b; signed) -> Wbit result, (2W)bit over
```

**No `; vector` tag** — operands are always vectors; output is always scalar.

## Scalar (default)

- `result` = low **W** bits of dot product
- `over` = next **2W** bits; full value = `over` ‖ `result`

## Call tags

| Tag | Behaviour |
|-----|-----------|
| `signed` | Signed multiply per pair, signed accumulate. |

## Examples

### `DOT(Wbit[n] a, Wbit[n] b)`

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

### `DOT(Wbit[n] a, Wbit[n] b; signed)`

```logts-play
4wire[2] a = 1111 + 0010
4wire[2] b = 1111 + 0001
4wire r, 8wire o = DOT(a, b; signed)
show(r)
show(o)
```

Signed `(−1)×(−1) + 2×1 = 3`.

## See also

[MAC](builtin-MAC.md) · [SUM](builtin-SUM.md) · [MULTIPLY](builtin-MULTIPLY.md)
