# Assignment operators

LogTScript supports multiple assignment operators with different width-handling behaviors for **wires**.

See also: [signal propagation](signal-propagation.md), [ASM](asm.md).

---

## Summary

| Operator | Behavior | Where |
|----------|----------|-------|
| `=` | Left-pad assignment | declaration, re-assignment |
| `=:` | Right-pad assignment | declaration, re-assignment |
| `:=` | Initial assignment (literal only) | wire declaration only |
| `:` | (unchanged) | component / block syntax |

### Phase notes

- **Phase 1 (current):** `=:` is implemented (right-pad). `=` keeps left-pad on declaration; `:=` is literal-only initial assignment.
- **Phase 2 (planned):** strict `=` (exact width, error on mismatch); `:` as initial assignment (replacing `:=` semantics).
- **Phase 3 (incomplete):** unify truncation rules across runtime; unify ASM + `=` behavior between legacy and wave propagation.

**Truncation:** when a value is longer than the wire, padding direction does not change truncation — the same truncation rule applies as for `=` in each execution path. Only **padding** (shorter values) differs between `=` and `=:`.

---

## `=:` — Right-pad assignment

If the assigned value is shorter than the destination width, zeros are added on the **right**.

### Syntax

```logts
wire =: value
```

### Examples

```logts-play
3wire q =: 1
show(q)
```

Result: `100`

```logts-play
3wire q =: 10
show(q)
```

Result: `100`

```logts-play
8wire q =: 101
show(q)
```

Result: `10100000`

```logts-play
8wire q =: 11110000
show(q)
```

Result: `11110000` (exact width, no padding)

### Re-assignment

```logts-play
4wire q =: 1
q =: 11
show(q)
```

Result: `1100`

### ASM — program in a wide slot

The assembled bitstream is stored from the **left** (MSB side); shorter programs are padded with zeros on the **right**.

```logts-play
inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :

16wire x =: .myisa { LOAD R1 A2 }
show(x)
```

Compare with left-pad `=` on the same program: `show` displays `^16 + ^00` for `=:` vs `^00 + ^16` for `=`.

---

## `=` — Left-pad assignment (current)

If the assigned value is shorter than the destination width, zeros are added on the **left**.

```logts-play
3wire q = 1
show(q)
```

Result: `001`

*Phase 2 will make `=` strict (exact width required, error on mismatch).*

---

## `:=` — Initial assignment (current)

Literal-only initialization at wire declaration.

```logts-play
1wire s := 1
show(s)
```

Only binary, hex (`^`), decimal (`\`), and `!` literals are allowed after `:=`.

---

## `:` — Initial assignment (planned, Phase 2)

Reserved for future use as initial assignment at declaration (replacing `:=` in Phase 2). Not changed in Phase 1.
