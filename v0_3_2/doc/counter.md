# Counter component

`comp [counter]` (shortname `comp [=]`) is an **up/down counter** with load. Unlike most components, it has **no** `= Xbit` in the declaration signature (`doc(comp.counter)` omits `= Xbit`).

Signature: `doc(comp.counter)` or `doc(comp.=)`.

---

## Syntax

```
comp [counter] .name:
  depth: 4
  :
```

Optional default value in declaration:

```
comp [counter] .cnt:
  depth: 4
  = 0000
  :
```

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Enable counting / load when `on:` holds |
| `write` | 1 | `1` = load `data`; `0` = increment/decrement |
| `data` | `depth` | Value to load when `write` is `1` |
| `dir` | 1 | Count direction when not loading |
| `get` | `depth` | Current counter value |

---

## Example — load then count

```logts-play
comp [counter] .cnt:
  depth: 4
  on: 1
  :

.cnt:{
  data = 0101
  write = 1
  dir = 0
  set = 1
}

4wire v = .cnt:get
show(v)
```

Use multiple property blocks or sequential triggers to step the counter.

---

## Related

- [reg.md](reg.md) — clocked storage
- [shifter.md](shifter.md)
- [components.md](components.md)
