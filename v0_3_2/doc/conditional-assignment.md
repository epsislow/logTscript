# Conditional assignment (`on:`)

Standalone statements that run **exactly one assignment** only when a trigger condition is met.

See also: [assignment operators](assignment-operators.md), [signal propagation](signal-propagation.md), [LUT](lut.md), [modes](modes.md).

---

## Syntax

```logts
on:<mode> {
  triggerExpr,
  assignment
}
```

| Part | Meaning |
|------|---------|
| `on:<mode>` | When the block may run: `raise`, `edge`, or `1` |
| `triggerExpr` | Expression whose **LSB** is observed for edges/level |
| `assignment` | **One** assignment (`=`, `:=`, `=:`) or component pin write |

The entire statement is **absent** while the trigger condition is false: neither the left-hand side nor the right-hand side runs (no LUT/mem side effects, no wire writes).

---

## Modes

Same semantics as PCB `exec:` / component property blocks (`logicEdgeTriggered` / `logicLevelTriggered`):

| Mode | Runs when |
|------|-----------|
| `on:raise` | LSB of trigger makes `0 → 1` |
| `on:edge` | LSB of trigger makes `1 → 0` |
| `on:1` | LSB is `1` **and** the trigger value changed |

`on:0` is **not supported**. Use an inverted trigger with `on:raise`:

```logts
on:raise {
  !zeroFlag,
  ok = .huff:clear()
}
```

Alias values accepted at parse time (not promoted in docs): `rising` ≡ `raise`, `falling` ≡ `edge`, `level` ≡ `1`.

---

## First RUN behavior

| Mode | Top-level on first RUN |
|------|------------------------|
| `on:raise` / `on:edge` | Does **not** run; waits for the first edge |
| `on:1` | Runs if LSB is already `1` at init |

Inside **PCB / chip / board** bodies, only `on:1` is allowed (`on:raise` / `on:edge` → parse error).

---

## Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into a **new editor tab** without running it. Edit propagation mode, add probes, or step with **Next**, then press toolbar **Run**. |
| **Load & Run** | Copies the script **and** runs it immediately. Read results in the **Output** panel (`show` lines). |

Tips:

- Blocks tagged `logts-play wave` open in **Wave** mode (default in the editor). Edge and inverted-trigger demos use `logts-play legacy` where noted.
- On **Wave**, prefer `show(.huff:size())` after a conditional LUT write — a `wire = .huff:size()` line in the same RUN may read the size before propagation settles.
- Use **Load** when you want to toggle a wire after RUN (e.g. change `clearFlag` again) and press **Run** / **Next** to see whether the LUT stays cleared without a new rising edge.

---

## Runnable examples

### `on:raise` — LUT intact while trigger is low

**Load & Run** — `clearFlag` stays `0`; the writable LUT still has 2 entries (`size` → `0010` in **Output**).

```logts-play wave
inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire clearFlag = 0
1wire ok = 0

on:raise {
  clearFlag,
  ok = .huff:clear()
}

show(.huff:size())
```

### `on:raise` — clear LUT on `0 → 1`

**Load & Run** — `clearFlag = 1` fires the block; **Output** shows `size` → `0000` and `isEmpty` → `1`.

```logts-play wave
MODE WIREWRITE

inline [lut] .huff:
  writable
  depth: 4
  length: 16
  fillwith: 0000
  data {
    000 : 0001
    001 : 0010
  }
  :

1wire clearFlag = 0
1wire ok = 0

on:raise {
  clearFlag,
  ok = .huff:clear()
}

clearFlag = 1
show(.huff:size())
show(.huff:isEmpty())
```

### `on:edge` — falling edge `1 → 0`

**Load & Run** — `clock` starts at `1`, then `clock = 0`; `fired` becomes `1`.

```logts-play legacy
MODE WIREWRITE

1wire clock = 1
1wire fired = 0

on:edge {
  clock,
  fired = 1
}

clock = 0
show(fired)
```

### `on:1` — level when value becomes `1`

**Load & Run** — `enable` goes `0 → 1`; `done` becomes `1`.

```logts-play wave
MODE WIREWRITE

1wire enable = 0
1wire done = 0

on:1 {
  enable,
  done = 1
}

enable = 1
show(done)
```

### `on:1` — first RUN when trigger already `1`

**Load & Run** — `enable` is `1` at init; `done` is set on the first RUN (no edge needed).

```logts-play wave
1wire enable = 1
1wire done = 0

on:1 {
  enable,
  done = 1
}

show(done)
```

### Inverted trigger (`!flag`) instead of `on:0`

**Load & Run** — `zeroFlag` falls `1 → 0`, so `!zeroFlag` rises `0 → 1` and sets `fired`.

```logts-play legacy
MODE WIREWRITE

1wire zeroFlag = 1
1wire fired = 0

on:raise {
  !zeroFlag,
  fired = 1
}

zeroFlag = 0
show(fired)
```

---

## Restrictions

| Allowed in `{ }` | Not allowed |
|------------------|-------------|
| `target = expr` | `.lut:clear()` without destination |
| `.comp:pin = expr` | `pcb`, `chip`, `board`, `comp`, `def` |
| `.mem:set = flag` | Multiple assignments |
| `process = 1` | Any non-assignment statement |

---

## vs property blocks

| | `on: { }` (standalone) | `.comp:{ }` (property block) |
|--|------------------------|------------------------------|
| Scope | Program / PCB body | Bound to one component instance |
| Statements | Exactly one assignment | Multiple pin assignments |
| Typical use | LUT/mem ops gated by a flag | Pin wiring on `exec:` trigger |

Property blocks remain the right tool for multi-pin updates on a component; conditional assignment is for isolated side-effect writes (LUT, mem, a single wire).

---

## Wave / ZSTATE

Conditional assignments are registered at elaboration and re-evaluated when trigger dependencies change (same path as property blocks in [signal propagation](signal-propagation.md)).

- **Wave (default):** assignment respects deferred propagation and `executedThisPropagate` guards.
- **MODE ZSTATE:** requires wave; when inactive, destination wires keep prior values (including `Z`).
