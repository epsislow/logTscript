# Stack component (LIFO)

`comp [stack]` (shortname `comp [lifo]`) is a **last-in, first-out** stack. Same attributes and status pouts as [queue](queue.md); peek uses `top` instead of `front`.

Use `on: 1` for level-triggered property blocks.

---

## Syntax

```
comp [stack] .s:
  width: 8
  length: 64
  on: 1
  :
```

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `width` | 8 | Bit width of each element |
| `length` | 64 | Maximum stack depth |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Trigger |
| `push` | `width` | Push value onto stack |
| `pop` | 1 | Pop top when `1` |
| `clear` | 1 | Empty stack when `1` |
| `get` | `width` | Peek at top (same as `top`) |
| `top` | `width` | Peek without `pop` |
| `empty` / `full` / `size` / `capacity` / `free` | — | Same semantics as queue |

---

## Example — push and pop (LIFO)

```logts-play
comp [stack] .s:
  width: 8
  length: 8
  on: 1
  :

.s:{ push = ^41
  set = 1 }
.s:{ push = ^42
  set = 1 }
.s:{ push = ^43
  set = 1 }

8wire t = .s:top
show(t)

.s:{ pop = 1
  set = 1 }

8wire t2 = .s:top
show(t2)
```

After three pushes, `:top` is `C` (`^43`). After one pop, `:top` is `B` (`^42`).

---

## Example — `top >=` redirect

```logts-play
comp [stack] .s:
  width: 8
  length: 16
  on: 1
  :

.s:{ push = ^41
  set = 1 }

8wire data
.s:{
  top >= data
  set = 1
}
show(data)
```

---

## Related

- [queue.md](queue.md) — FIFO counterpart
- [counter.md](counter.md) — alternative for manual SP + mem
- [components.md](components.md)
