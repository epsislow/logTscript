# L2 (L2² norm)

Index: [NORM](builtin-NORM.md) · [DOT](builtin-DOT.md)

**Alias of [NORM](builtin-NORM.md)** — squared L2 norm via **`DOT(v, v)`**.

## Signatures

```
L2(Wwire[n] vector) -> Wbit result, (2W)bit over
L2(Wwire[n] vector; signed) -> Wbit result, (2W)bit over
```

## Examples

```logts-play
4wire[2] v = 0011 + 0100
4wire a, 8wire ao = L2(v)
show(a)
```

## See also

[NORM](builtin-NORM.md) · [DOT](builtin-DOT.md)
