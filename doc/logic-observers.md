# Logic observers — `observe` on `comp [logic]`

**Observers** react to **dynamic mutations** on a `comp [logic]` instance. When a matching fact is added or removed in the component store, the runtime can update **observe pins** and redirect them to wires — without running a named query.

Facts, rules, and queries live in `inline [logic]`. Component wiring → [comp-logic.md](comp-logic.md). Mutation syntax → [logic-runtime.md](logic-runtime.md).

In the **documentation viewer**, `logts-play` blocks support **Load** and **Load & Run** (use `on: 1` on the component so the first run executes when `set = 1`).

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Where** | **Program block only** — `.module { observe … }` inside `comp [logic]` |
| **Not in inline** | `observe` inside `inline [logic]` is a **parse error** |
| **Trigger** | Matching **`+`** / **`-`** / **`~`** mutation on the component dynamic store |
| **No query pass** | Observers do **not** fire on query-only passes (no mutation) |
| **Immediate** | Default — pin updates right after each matching mutation op |
| **`def`** | Deferred — pin updates after queries finish (same pass) |
| **`removal`** | Bool pin pulses **`1`** for one redirect cycle, then resets to **`0`** |
| **Pattern** | Predicate ending in **`$`** or **`$$`**, optional **`:key=Ground`** / **`:tail`** |
| **Pin types** | `number`, `bool`, `text`, `float`, optional **`list`** |
| **Wiring** | Exec block: `observePin >= targetWire` (same as query redirects) |
| **`data: static`** | Observe lines are rejected at elaboration |

---

## Syntax

```logts
comp [logic] .gameLogic:
    .game {
        observe [removal] [def] Pattern is Type pinName
    }
```

| Part | Meaning |
|------|---------|
| **`observe`** | Declares one observer line (comp program block only) |
| **`removal`** | Optional — bool pin only; pulse on matching **remove** / **`~`** expand |
| **`def`** | Optional — deferred timing (after queries in the same pass) |
| **`Pattern`** | Fact head pattern — see [Patterns](#patterns) |
| **`is Type`** | Pin wire type: `number`, `bool`, `text`, `float`, optional `/format`, optional `list` |
| **`pinName`** | Component pin — wired in the exec block with **`pinName >= wire`** |

---

## Patterns

| Pattern | Matches | Projects |
|---------|---------|----------|
| **`johnCar$`** | Single-valued **`+`** / **`-`** on `johnCar$(Atom)` | The atom (text pin) |
| **`playerPos$$`** | Keyed **`+`** / **`-`** on `playerPos$$(Key, …)` | Full args as list (with `:key` filter) or `:tail` |
| **`playerPos$$:key=p1`** | Keyed facts whose first arg unifies with ground **`p1`** | Args from index 1 onward (list) |
| **`playerPos$$:key`** | Any keyed `playerPos$$` mutation (deferred example) | Key atom as text |

**`:key=Ground`** requires a **ground** term (atom, number, or quoted text). **`:tail`** on a list pin projects tail args; plain **`:key`** without `=` on a list pin is an elaboration error.

---

## Pipeline (one `set` pass)

```text
trigger set active
    → read input pins
    → apply logic { + / - / ~ } mutations
    → immediate observe pins (matching ops)
    → run queries (if any)
    → deferred observe pins (def lines)
    → redirects (query + observe pins → wires)
    → reset removal bool pins to 0
```

Observers never run during a **query-only** pass (no mutation block).

---

## Example — text on add (`johnCar$`)

When a **`johnCar$(Model)`** fact is asserted, the **`carPin`** text pin receives **`Model`**.

```logts-play
inline [logic] .garage:

:

comp [logic] .carLogic:
    on: 1
    .garage {
        observe johnCar$ is text carPin
    }

:

1wire trigger = 1
64wire carOut = \0;64

.carLogic:{
    logic { + johnCar$(bmw) }
    carPin >= carOut
    set = trigger
}
```

After **Load & Run**, **`carOut`** holds the text **`bmw`** (8 bits per character).

---

## Example — keyed filter (`$$` + `:key=`)

Only mutations whose key matches **`p1`** update **`posPin`**. The pin encodes coordinates **`(7, 2)`** as a number list.

```logts-play
inline [logic] .game:

    playerPos$$(p1, 0, 0)

:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe playerPos$$:key=p1 is number list posPin
    }

:

64wire posOut = \0;64
1wire trigger = 1

.gameLogic:{
    logic { + playerPos$$(p1, 7, 2) }
    posPin >= posOut
    set = trigger
}
```

After **Load & Run**, **`posOut`** is non-zero (list payload for **`p1`**).

Adding **`playerPos$$(p2, …)`** does **not** update **`posPin`** when the filter is **`:key=p1`**.

---

## Example — removal pulse (`removal` + `-`)

**`removedPin`** is a bool pulse: **`1`** on the redirect wire for the pass where a matching fact is removed, then the pin returns to **`0`**.

```logts-play
inline [logic] .game:

    playerPos$$(p1, 3, 4)

:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe removal playerPos$$:key=p1 is bool removedPin
    }

:

1wire remOut = 0
1wire trigger = 1

.gameLogic:{
    logic { - playerPos$$(p1, 3, 4) }
    removedPin >= remOut
    set = trigger
}
```

After **Load & Run**: **`remOut = 1`**.

---

## Example — removal via retract-all (`~`)

**`~ Template`** expands to individual removes. Each expanded remove that matches the observer pattern fires the same bool pulse.

```logts-play
inline [logic] .game:

    playerPos$$(p1, 0, 0)

:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe removal playerPos$$:key=p1 is bool removedPin
    }

:

1wire remOut = 0
1wire trigger = 1

.gameLogic:{
    logic { ~ playerPos$$(p1, 0, 0) }
    removedPin >= remOut
    set = trigger
}
```

After **Load & Run**: **`remOut = 1`**.

---

## Example — deferred key pin (`def`)

**`def`** observers run **after** queries in the same pass. Here **`keyPin`** receives the key atom (**`p1`**) from a keyed add.

```logts-play
inline [logic] .game:

    playerPos$$(p1, 0, 0)

:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe def playerPos$$:key is text keyPin
    }

:

64wire keyOut = \0;64
1wire trigger = 1

.gameLogic:{
    logic { + playerPos$$(p1, 9, 1) }
    keyPin >= keyOut
    set = trigger
}
```

After **Load & Run**, **`keyOut`** holds the text **`p1`**.

---

## Example — query-only pass (no observe emit)

Observers require a **mutation**. A pass that only runs queries leaves observe pins unchanged.

```logts-play
inline [logic] .game:

    playerPos$$(p1, 0, 0)

    query q:
        playerPos$$(p1, X, Y)

:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe playerPos$$:key=p1 is number list posPin
    }

:

64wire posOut = \0;64
1wire trigger = 1

.gameLogic:{
    q >= posOut
    set = trigger
}
```

After **Load & Run**, **`posPin`** (and **`posOut`**) stay zero — no mutation ran.

---

## Wiring observe pins

Observe pins use the same redirect form as query outputs:

```logts
.gameLogic:{
    logic { + playerPos$$(p1, 7, 2) }
    posPin >= posOut
    removedPin >= remOut
    set = trigger
}
```

| Rule | Detail |
|------|--------|
| **Pin name** | Must be unique among input pins **and** other observe pins |
| **List pins** | Prefer vector wires; width follows the target wire in the exec block |
| **Text pins** | Width grows to fit encoded atoms |
| **`data: static`** | Observe declarations are rejected — no dynamic store |

---

## Restrictions and errors

| Condition | Result |
|-----------|--------|
| **`observe` in `inline [logic]`** | Parse error |
| **`observe removal … is text`** | Parse error — removal requires **`is bool`** |
| **Duplicate pin** (input + observe same name) | Elaboration error |
| **`data: static`** + observe line | Elaboration error |
| **Query-only pass** | Observe pins not updated |

---

## Related pages

- [comp-logic.md](comp-logic.md) — program block, exec block, redirects, `on:` trigger
- [logic-runtime.md](logic-runtime.md) — `logic { + / - / ~ }`, dynamic overlay
- [inline-logic.md](inline-logic.md) — facts, `$` / `$$` predicates, queries
