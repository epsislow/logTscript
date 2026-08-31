# Reactive Observers

LogTScript supports reactive observation of dynamic `$` and `$$` facts.

`observe` creates an output that is automatically updated when the observed fact changes.

`observe removal` creates an output that is triggered when a matching dynamic fact is removed.

Only dynamic `$` and `$$` facts can be observed.

---

## 1. Basic observe

Syntax:

```text
observe Fact is Type Output
```

Example:

```text
observe johnCar$ is text johnCarPout
observe shipNames$ is text list shipNamesPout
```

When the corresponding dynamic **`$`/`$$`** fact changes through a **runtime mutation** (`+`, and for removal: `-` or `~`), the observer produces the new value on its output.

Supported mutation paths include **`logic { + / - / ~ }`**, **`commit(…)`**, bare **`+` / `-` / `~`** in query/rule bodies, and rule-conclusion side effects — not **`commit` alone**.

**KB initialization does not trigger observers:** static assembly, seed copy, and overlay merge populate the KB without firing `observe` or `observe removal`. Only mutations **after** initialization are reactive.

Example:

```text
commit(
    + johnCar$(BMW)
)
```

produces:

```text
johnCarPout = "BMW"
```

The observer does not modify the KB. It only exposes changes from the KB to an output.

Dynamic facts remain mutable only through `commit`.

---

## 2. Observing `$$` facts

A `$$` fact can expose individual parts of its arguments.

Example:

```text
observe playerPosXY$$:key is text playerPosKeyPout
observe playerPosXY$$:tail is number list playerPositionsPout
```

Given:

```text
playerPosXY$$(p1, 7, 2, 0)
```

the observers produce:

```text
playerPosKeyPout = "p1"
playerPositionsPout = [7, 2, 0]
```

`:key` selects the first argument.

`:tail` selects all remaining arguments as a list.

For:

```text
playerPosXY$$(p2, 1, 2, 3)
```

the result is:

```text
playerPosKeyPout = "p2"
playerPositionsPout = [1, 2, 3]
```

---

## 3. Key filtering

An observer can restrict itself to a particular key.

Syntax:

```text
observe Fact$$:key=Value is Type Output
```

Example:

```text
observe playerPosXY$$:key=p1
    is number list
    player1PosNumberPout
```

Given:

```text
playerPosXY$$(p1, 7, 2, 0)
```

the observer produces:

```text
player1PosNumberPout = [7, 2, 0]
```

Given:

```text
playerPosXY$$(p2, 1, 2, 3)
```

this observer does not trigger because the key is `p2`, not `p1`.

Example:

```text
observe playerPosXY$$:key=p1
    is number list
    player1PosNumberPout
```

Only changes matching:

```text
playerPosXY$$(p1, ...)
```

are relevant to this observer.

---

## 4. Observe is reactive

Observers react to **runtime mutations** after KB initialization — **`+`** for state observe; **`-`** and **`~`** for `observe removal`.

Examples: **`logic { + … }`**, **`commit(…)`**, bare ops in query/rule bodies.

Example:

```text
observe playerPosXY$$:key
    is text
    playerPosKeyPout

observe playerPosXY$$:tail
    is number list
    playerPositionsPout

observe playerPosXY$$:key=p1
    is number list
    player1PosNumberPout
```

Initial mutation:

```text
commit(
    + playerPosXY$$(p1, 7, 2, 0)
)
```

produces:

```text
playerPosKeyPout = "p1"
playerPositionsPout = [7, 2, 0]
player1PosNumberPout = [7, 2, 0]
```

Later:

```text
commit(
    + playerPosXY$$(p2, 1, 2, 3)
)
```

produces:

```text
playerPosKeyPout = "p2"
playerPositionsPout = [1, 2, 3]
```

`player1PosNumberPout` is not triggered because the mutation does not match `key=p1`.

Observe outputs are therefore **change-driven**, not polling queries.

---

## 5. Observe removal

Removal has a separate observer form:

```text
observe removal Fact ...
```

Removal observers react when a matching dynamic fact is removed through a runtime mutation — **`-`** (single fact retract) or **`~`** (template retract).

Example (**`is bool` only** — removal is an event after the fact is already gone; no removed payload on the wire):

```text
observe removal playerPosXY$$:key
    is bool
    playerPosWasRemovedPout

observe removal playerPosXY$$:key=p1
    is bool
    playerPosP1WasRemovedPout
```

Given:

```text
playerPosXY$$(p2, 1, 2, 3)
```

the mutation:

```text
logic {
    ~ playerPosXY$$(p2, _, _, _)
}
```

removes the matching fact.

The unfiltered observer produces a **`1`** pulse on **`playerPosWasRemovedPout`**.

The observer:

```text
observe removal playerPosXY$$:key=p1
    is bool
    playerPosP1WasRemovedPout
```

does not trigger because the removed key was `p2`.

**Non-bool removal types are invalid:** `observe removal … is text Out` → parse/elaboration error.

---

## 6. Boolean removal outputs

A removal observer whose output type is `bool` represents the occurrence of the removal event rather than the removed value.

Example:

```text
observe removal playerPosXY$$:key=p1
    is bool
    playerPosP1WasRemovedPout
```

When:

```text
commit(
    ~ playerPosXY$$(p1, _, _, _)
)
```

occurs, the output produces a `1` pulse.

Conceptually:

```text
0 ──────────┐
            │
            1
            │
            └────────── 0
```

The boolean output can therefore be used as a 1-bit trigger/wire.

The purpose of:

```text
:tail is bool
```

in a removal observer is not to expose the removed tail values. It explicitly means:

> the matching fact was removed.

---

## 7. State outputs vs event outputs

The two forms have different purposes.

### State observation

```text
observe playerPosXY$$:key=p1
    is number list
    player1PosPout
```

exposes the value of the matching fact when it changes.

### Removal observation

```text
observe removal playerPosXY$$:key=p1
    is bool
    player1PosRemovedPout
```

exposes the occurrence of its removal.

This gives LogTScript two distinct reactive paths:

```text
KB state
   │
   └── observe ──────────> value output
```

and:

```text
KB removal
   │
   └── observe removal ──> event/trigger output
```

---

## 8. Dynamic facts and mutation

`observe` does not introduce another mechanism for changing facts.

Dynamic facts continue to follow the rule:

```text
dynamic fact
    ↓
runtime mutation (+ / - / ~)
    ↓
KB mutation
```

Observers execute as a consequence of **post-init** mutation:

```text
runtime mutation
   │
   ▼
KB change
   │
   ├── observe
   │      └── value output
   │
   └── observe removal
          └── removal output
```

**Initialization** (static facts, seed copy, merge) does **not** fire observers.

---

## 9. Component bindings

Observe outputs can be connected to ports of other components.

> **Note:** The original sketch uses **`comp [canvas]`** — that component **does not exist** in LogTScript and is **not** part of F108. Use real output components instead: **`terminal`**, **`14seg`**, **`led`**, **`lcd`**, **`clcd`**, or any other wired output.

Example (illustrative binding — replace with a real output comp):

```text
comp [logic] .game:
    ...
:

comp [lcd] .display:
    ...
:
```

Logic:

```text
observe playerPosXY$$:key=p1
    is number list
    player1PositionPout
```

Component binding:

```text
.lcd:posPin =
    .game:player1PositionPout
```

A runtime mutation:

```text
logic {
    + playerPosXY$$(p1, 7, 2, 0)
}
```

therefore propagates through:

```text
KB
 ↓
observe
 ↓
player1PositionPout = [7,2,0]
 ↓
component binding
 ↓
lcd / terminal / 14seg / led / …
```

The downstream output component does not need to query the KB.

---

## 10. Design principle

`observe` is a reactive projection from dynamic KB state to component outputs.

It does not replace:

* `query` — logic execution
* `commit` — KB mutation
* `trigger` — execution caused by an input/event
* `process` / `onTick` — time-driven execution

Instead:

```text
query
    → determines what logic should happen

commit
    → changes the KB

observe
    → exposes changed KB state

observe removal
    → exposes removal events
```

This allows LogTScript to combine database-like state, rule-based logic, reactive outputs, and interactive components without allowing arbitrary direct mutation of dynamic facts.
