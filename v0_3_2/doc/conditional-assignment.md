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

Multiple comma-separated assignments are allowed after the trigger (all run atomically when the condition fires):

```logts
on:raise {
  AND(.clk, phMerge),
  mk, mf = .heap:popMin(),
  mk2, mf2 = .heap:popMin(),
  1wire _ = .links:set(mk, parent + 00000000)
}
```

| Part | Meaning |
|------|---------|
| `on:<mode>` | When the block may run: `raise`, `edge`, or `1` |
| `triggerExpr` | Expression whose **LSB** is observed for edges/level |
| `assignment` | One or more assignments (`=`, `:=`, `=:`), mixed multi-target (`a, b = expr`), or component pin writes |

The entire statement is **absent** while the trigger condition is false: neither the left-hand side nor the right-hand side runs (no LUT/mem side effects, no wire writes). When the trigger fires, **every** assignment in the block runs in order before any other propagation step. Suite tests **2123–2124**.

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

Inside **PCB** bodies, only `on:1` is allowed (`on:raise` / `on:edge` → parse error). In **chip** and **board** bodies, all modes are allowed and run through the instance wire graph on each exec (see [chip-board-execution.md](chip-board-execution.md)).

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

### Switch trigger — clear LUT from the panel

**Load** this example, press **Run**, then flip the **clr** switch in **Devices**.

- `probe(.clear)` — confirms the switch toggles.
- `4wire hSize = .huff:size()` + `probe(hSize)` — after a rising-edge clear, `hSize` refreshes and probe shows the new value.

Use a **wire** for LUT size (not `probe(.huff:size())` — inline LUT methods are not valid probe targets).

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

comp [switch] .clear:
  text: 'clr'
  :

1wire ok = 0

on:raise {
  .clear:get,
  ok = .huff:clear()
}

probe(.clear)
4wire hSize = .huff:size()
probe(hSize)
```

After **Load & Run**, flip **clr** once (`0→1`). **Output** should show `hSize = 0000 - changed`.

`on:raise` fires only on rising edges — toggling back to `0` does not clear again until the next `0→1`.

### MUX sentinel — verify `hSize` on every toggle

Use `1111` as a sentinel when `.clear` is `0`, and real `.huff:size()` when `.clear` is `1`. With `on:1`, each `0→1` clears the LUT; each `1→0` shows `1111` again.

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

comp [switch] .clear:
  text: 'clr'
  :

4wire hSize = MUX(.clear:get, 1111, .huff:size())
1wire ok = 0

on:1 {
  .clear:get,
  ok = .huff:clear()
}

probe(.clear)
probe(hSize)
```

Toggle **clr** `0→1→0→1` — **Output** alternates `hSize = 0000` / `1111` (no spurious `0010` after clear).

### Alternate — add on fall, clear on rise

`on:raise` with `!.clear:get` adds an entry when the switch falls; `on:1` clears when it rises. `hSize = .huff:size()` changes every toggle (`0010` → `0000` → `0001` → …).

---

## Restrictions

| Allowed in `{ }` | Not allowed |
|------------------|-------------|
| `target = expr` (one or many, comma-separated) | `.lut:clear()` without destination |
| `.comp:pin = expr` | `pcb`, `chip`, `board`, `comp`, `def` |
| `a, b = expr` (multi-target) | Any non-assignment statement |
| `process = 1` | |

---

## vs property blocks

| | `on: { }` (standalone) | `.comp:{ }` (property block) |
|--|------------------------|------------------------------|
| Scope | Program / PCB body | Bound to one component instance |
| Statements | One or more comma-separated assignments | Multiple pin assignments |
| Typical use | LUT/mem ops gated by a flag | Pin wiring on `exec:` trigger |

Property blocks remain the right tool for multi-pin updates on a component; conditional assignment is for isolated side-effect writes (LUT, mem, a single wire).

---

## Wave / ZSTATE

Conditional assignments are registered at elaboration and re-evaluated when trigger dependencies change (same path as property blocks in [signal propagation](signal-propagation.md)).

- **Wave (default):** assignment respects deferred propagation and `executedThisPropagate` guards.
- **MODE ZSTATE:** requires wave; when inactive, destination wires keep prior values (including `Z`).
