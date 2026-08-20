# Signal Trace (UI panel)

Signal propagation trace — **separate panel**, not Output. Open from **Win ▾ → Signal Trace** (formerly Wave Listen).

Related: [debug.md](debug.md) (show / peek / probe / watch), [logic-runtime.md](logic-runtime.md) (logic mutations), [phz.md](phz.md) (PHZ ownership lines), [huffman-v2.md](huffman-v2.md) (SC round-trip debugging).

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run** (`on: 1` on the component). Arm **Signal Trace ON** and set **L2** before Run to see mutation lines.

---

## Controls

| Control | Role |
|---------|------|
| **ON / OFF** | Arms the panel for the next **Run** (persists across runs) |
| **L1 / L2 / L3** | Trace verbosity (`debugLevel` on propagation engine) |
| **Fmt ▾** | hex / oct / b32hex / b32c / bin / dec / s8 / u8 / q4p4 / fp16 / bf16 / ascii / auto (dropdown, persisted) |
| **Filter ▾** | All / Wires / Components / Internals / PHZ (persisted as `prog/signalTraceFilter`) |
| **Clear** | Clears panel history (no auto-clear on Run) |
| **Tracing…** badge | Internal trace active while script runs (distinct from ON/OFF) |

**Trace** is runtime-only: ON at Run start (if armed), stays ON after Run complete when armed (interactive key/switch updates). OFF at Stop or when disarmed.

---

## Wave vs legacy prefix

Example trace — **Wave** (level 1):

```text
[wave 0] RUN init → recompute all wires
[wave 1] commit packetEncoded = ^4808…
[wave 1] lut-mut .huff:clear → re-exec st(1062:asg) packetEncoded := …
* script stopped trace is OFF
```

Example trace — **Legacy** (level 1):

```text
* Run start (legacy cascade) — trace is ON
[step 1] commit a = ^3
[step 2] commit b = ^3
lut-mut .huff:clear → re-exec st(5:asg) packetEncoded := …
* Run complete — trace stays ON (interactive updates)
```

Legacy uses **`[step N]`** prefix (immediate cascade) instead of **`[wave N]`**. Level 2 adds `exec` on cascade re-eval; level 3 adds `eval` (wire values computed before commit).

---

## Line catalog (L1–L3)

| Line kind | Example | Level | Filter |
|-----------|---------|-------|--------|
| **commit component** | `[step 2] commit component .s = ^101` | L2 | Components |
| **prop** | `[step 2] prop .s.data = ^101` | L2 | Components |
| **connect** | `[step 2] connect .alu:get → result` | L2 | Components |
| **exec block** | `[step 3] exec block .cnt.on:raise` | L3 | Internals |
| **state** | `[step 3] state mem1[0] = ^0101` | L3 | Internals |
| **phz** | `[step 2] phz spawn phz[obj] id=\1 floor=\0 → .room:inside (count 1)` | L2 (+ attrs `[+]` at L3) | PHZ |
| **lut-mut** | `lut-mut .huff:clear → re-exec …` | L1 | Wires + Components |
| **logic-mut** | `logic-mut .whLogic: try { … }` then `commit` or `rollback` | L2 | Components |

**Filter** (toolbar): **All** shows everything; **Wires** — wire commit/exec/eval, init, flush, schedule, lut-mut; **Components** — commit component, prop, connect, lut-mut, **logic-mut**; **Internals** — eval L3, block exec, state/mem, schedule (wave L3); **PHZ** — spawn / move / remove ownership events.

PHZ lines (L2+): spawn shows `id` + `floor` inline; other attributes appear under **`[+]`** at L3. Move/remove list type + id and destination — named `.cont:coll`, or `phz.[bin < cont]:inside id=\N (count N)` when the owning container is anonymous. See [phz.md](phz.md).

---

## Value formatting

Dropdown **hex / oct / b32hex / b32c / bin / dec / s8 / u8 / q4p4 / fp16 / bf16 / ascii / auto**. Numeric formats group on fixed width (8 or 16 bit). **oct**, **b32hex**, **b32c** produce `o^…`, `x^…`, `xc^…` literals (roundtrip like hex). **ascii** displays like `show(…; ascii)`. Suffix **`(Nbits)`** on display. **`[cpy]`** — script literal copy rules per format (see [debug.md](debug.md)).

---

## Signal Trace vs other debug tools

| Tool | Output | Best for |
|------|--------|----------|
| **Signal Trace** | Dedicated panel; wave/legacy propagation | Commits, LUT re-eval, PHZ ownership, **logic mutations** |
| **`probe(wire)`** | Output on change | Single-wire change log with driver |
| **`watch(pattern)`** | Output on change | Multi-wire / FSM patterns |
| **`show(wire)`** | Output snapshot | One-shot values at statement |
| **`peek(wire)`** | Output snapshot | Pre-mutation baseline |

For Huffman SC round-trip patterns, see [debug.md — Wave debug patterns](debug.md#wave-debug-patterns) and [huffman-v2.md](huffman-v2.md).

---

## logic-mut

When a `comp [logic]` exec block contains **`logic { … }`**, Signal Trace (L2+, panel armed) emits **`logic-mut`** lines for each mutation attempt:

```text
logic-mut .<comp>: try { <ops> }
logic-mut .<comp>: commit (<ops> ops, <net> net)
```

or on failure:

```text
logic-mut .<comp>: try { <ops> }
logic-mut .<comp>: rollback — <reason>
```

| Term | Meaning |
|------|---------|
| **`ops`** | Number of operations in the transaction (parsed list length) |
| **`net`** | Operations that actually changed the dynamic store (idempotent retract/add skipped) |
| **`try`** | Shows **resolved** ground facts at run time — wire operands are decoded and printed as literals, not wire names (see [Resolved wire values in `try`](#resolved-wire-values-in-try)) |
| **Truncation** | At most **4** ops inline; extra ops shown as `… (+N)` with full list under **`[+]`** expand |
| **Constraint fail** | `rollback — constraint inside/2 #K failed on + inside(…)` — **`#K`** is 1-based ordinal in the inline program |
| **No `logic { }`** | **Zero** `logic-mut` lines (queries-only passes are silent) |

`mutationFailed` on the component remains a **1-bit** flag; the trace carries the human-readable reason.

### Example — successful move (commit)

Arm Signal Trace **ON**, level **L2**, then **Load & Run**:

```logts-play
inline [logic] .warehouse:

    object(box1)
    object(box2)
    container(c1)
    container(c2)

    inside(box1, c1)
    inside(box2, c1)

    capacity(c1, 2)
    capacity(c2, 2)

    constraint inside(Object, Container) <=
        object(Object),
        container(Container),
        capacity(Container, Max),
        count(inside(_, Container), N),
        N =< Max

    query countC1one:
        count(inside(_, c1), 1)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

1wire failed = 0
1wire ok = 0
1wire trigger = 1

.whLogic:{
    logic {
        - inside(box1, c1)
        + inside(box1, c2)
    }
    countC1one >= ok
    mutationFailed >= failed
    set = trigger
}
```

Expected trace (legacy):

```text
[step N] logic-mut .whLogic: try { - inside(box1, c1); + inside(box1, c2) }
[step N] logic-mut .whLogic: commit (2 ops, 2 net)
```

### Resolved wire values in `try`

In the mutation source you write **`text`** / **`number`** / **`bool`** wire references (same syntax as in [logic-runtime.md](logic-runtime.md)). Signal Trace does **not** repeat the wire name or bind-type prefix — it shows the **effective value** read from the wire when the exec block runs.

| In `logic { … }` source | Wire at run time | In `try { … }` trace |
|-------------------------|------------------|----------------------|
| `+ inside(box3, text cName)` | `16wire cName = "c2"` | `+ inside(box3, "c2")` |
| `+ level(box3, number lvlWire)` | `8wire lvlWire = 00001111` (15) | `+ level(box3, 15)` |
| `+ inside(box1, c1)` | atom in source (no wire) | `+ inside(box1, c1)` |

Atoms and numbers written directly in the mutation block appear unchanged. Only **`text`**, **`number`**, and **`bool`** wire operands are decoded for display.

Arm Signal Trace **ON**, level **L2**, then **Load & Run**:

```logts-play
inline [logic] .warehouse:

    object(box1)
    object(box2)
    object(box3)
    container(c1)
    container(c2)

    inside(box1, c1)
    inside(box2, c1)

    capacity(c1, 2)
    capacity(c2, 2)

    constraint inside(Object, Container) <=
        object(Object),
        container(Container),
        capacity(Container, Max),
        count(inside(_, Container), N),
        N =< Max

    constraint level(O, N) <=
        object(O),
        N >= 0,
        N =< 99

    query countC1:
        count(inside(_, c1), 2)

:

comp [logic] .whLogic:
    on: 1
    .warehouse { }
:

16wire cName = "c2"
8wire lvlWire = 00001111

1wire failed = 0
1wire trigger = 1

.whLogic:{
    logic {
        + inside(box3, text cName)
        + level(box3, number lvlWire)
    }
    mutationFailed >= failed
    set = trigger
}
```

Expected trace:

```text
[step N] logic-mut .whLogic: try { + inside(box3, "c2"); + level(box3, 15) }
[step N] logic-mut .whLogic: commit (2 ops, 2 net)
```

Compare with the source: `text cName` and `number lvlWire` are gone from the trace — you see **`"c2"`** (decoded text) and **`15`** (decoded number) instead. Change `cName` or `lvlWire` before Run and the **`try`** line updates on the next pass.

### Example — constraint failure (rollback)

Two constraints with the same head — the trace names which one failed (`#2`):

```logts-play
inline [logic] .wh:

    object(box1)
    object(box2)
    container(c1)

    allowed(box1, c1)

    constraint inside(O, C) <= object(O), container(C)
    constraint inside(O, C) <= allowed(O, C)

    query hasBox2:
        inside(box2, c1)

:

comp [logic] .whLogic:
    on: 1
    .wh { }
:

1wire failed = 0
1wire trigger = 1

.whLogic:{
    logic { + inside(box2, c1) }
    mutationFailed >= failed
    set = trigger
}
```

Expected trace:

```text
[step N] logic-mut .whLogic: try { + inside(box2, c1) }
[step N] logic-mut .whLogic: rollback — constraint inside/2 #2 failed on + inside(box2, c1)
```

`mutationFailed` stays **1**; the KB is unchanged.

See also: [logic-runtime.md](logic-runtime.md), [logic-constraints.md](logic-constraints.md), [logic-indexing.md](logic-indexing.md).
