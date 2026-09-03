# Queue component (FIFO)

`comp [queue]` (shortname `comp [fifo]`) is a **first-in, first-out** buffer. Each slot holds a fixed-width binary value; capacity is `length` elements.

Use `on: 1` for level-triggered property blocks (push/pop run when `set = 1` in the same block).

---

## Syntax

```
comp [queue] .q:
  width: 8
  length: 64
  on: 1
  :
```

| Attribute | Default | Meaning |
|-----------|---------|---------|
| `width` | 8 | Bit width of each element |
| `length` | 64 | Maximum number of elements |

---

## Pins and pouts

| Port | Width | Role |
|------|-------|------|
| `set` | 1 | Trigger (last bit `1` applies other pins in the block) |
| `push` | `width` | Value to insert at the back |
| `pop` | 1 | Remove front element when `1` |
| `clear` | 1 | Empty the queue when `1` |
| `get` | `width` | Peek at front (same as `front`) |
| `front` | `width` | Peek at front without `pop` |
| `empty` | 1 | `1` when queue has no elements |
| `full` | 1 | `1` when queue cannot accept another push |
| `size` | `sizeWidth` | Current element count (zero-padded) |
| `capacity` | `sizeWidth` | `length` in binary |
| `free` | `sizeWidth` | `length - size` (slots remaining) |

`sizeWidth` = enough bits to represent `0 .. length` (e.g. `length: 16` → 5 bits).

---

## Example — push and peek

```logts-play
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

.q:{ push = ^41
  set = 1 }
.q:{ push = ^42
  set = 1 }

8wire x = .q:get
show(x)
```

`:get` and `:front` return the same value (`^41` = `A` at the front).

---

## Example — queue → terminal (key, wave)

Canonical pattern: **Load & Run** fills the queue; press **Next** once per character. Full script: [terminal.md — FIFO queue → terminal (key, wave)](terminal.md#runnable--fifo-queue--terminal-key-wave). Tests **1573**.

```logts-play wave
comp [queue] .q:
  width: 8
  length: 8
  on: 1
  :

comp [terminal] .term:
  rows: 3
  columns: 40
  :

comp [key] .next:
  label: 'Next'
  :

.q:{ push = ^48
  set = 1 }
.q:{ push = ^65
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6C
  set = 1 }
.q:{ push = ^6F
  set = 1 }

8wire c
.q:{ get >= c
  set = .next }
.term:{ append = c
  set = .next }
.q:{ pop = 1
  set = .next }
```

---

## Example — `front >=`, `size >=`, `free >=`

```logts-play
comp [queue] .q:
  width: 8
  length: 16
  on: 1
  :

.q:{ push = ^41
  set = 1 }
.q:{ push = ^42
  set = 1 }

4wire data
5wire n
5wire slots
.q:{
  front >= data
  size >= n
  free >= slots
  set = 1
}
show(data)
show(n)
show(slots)
```

---

## Combination rules (same block, `set` edge)

| Combination | Behaviour |
|-------------|-----------|
| `clear` + `push` | clear, then push |
| `clear` + `pop` | pop, then clear |
| `push` + `pop` | error |
| all three | error |

---

## Related

- [stack.md](stack.md) — LIFO counterpart
- [mem.md](mem.md) — random-access storage
- [components.md](components.md)
