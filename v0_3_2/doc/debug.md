# Debug output — `show`, `peek`, and `probe`

Three statements write values to the **Output** panel. They are useful for inspecting wires, storage references, and how values change over time.

All three are **statements** (like `doc`) — they cannot appear on the right side of `=`.

---

## Quick comparison

| | `show` | `peek` | `probe` |
|---|--------|--------|---------|
| **Purpose** | Display settled values | Instant snapshot | Monitor every value commit |
| **When it emits** | End of **RUN** / **NEXT** (after propagation on Wave) | Immediately at statement position | On every **committed** change |
| **Position in script** | Matters | Matters | **Does not matter** (registered at elaboration) |
| **Arguments** | One or more expressions | One or more expressions | **Exactly one** expression |
| **Output format** | `name (type) = value` | same | `# name = value (ref) - reason` |
| **Wave vs Legacy** | Deferred on Wave until settle | Immediate | Same commit hooks in both modes |

For when wires update in the circuit, see [signal-propagation.md](signal-propagation.md).

---

## `show`

### Syntax

```
show(expr1, expr2, ...)
```

Each argument is an expression atom: wire name, component reference (`.comp:get`), bit slice (`a.0`, `a.2-4`), storage ref (`&3`), literal, etc.

### Output format

```
name (Nbit) = value
```

Examples:

```text
a (1bit) = 1
sum (4bit) = 1010
.sw:get (1bit) = 0
```

Wide values may use hex groups (`^A3 + 10`) — same formatting as the variables panel.

### When to use

- **Default choice** for displaying results at the end of a script or after **NEXT(~)**.
- On **Wave** propagation, `show` runs **after** dependent wires have settled — you see consistent combinational results.
- Multiple `show` calls in one script each emit at their turn during execution, but on Wave each `show` still reflects values **after** the propagation step triggered by preceding statements in that run.

### Example — combinational logic

```logts-play
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)
```

### Example — after external change (Wave)

```logts-play wave
comp [switch] .sw::

1wire a = .sw:get
1wire b = NOT(a)

show(a, b)
```

After **RUN**, flip the switch in the panel — wires update; run `show` again or rely on the variables panel. The example shows settled values at the end of RUN.

---

## `peek`

### Syntax

```
peek(expr1, expr2, ...)
```

Same argument forms as `show`.

### Output format

Identical to `show`: `name (type) = value`.

### When to use

- Read values **now**, without waiting for downstream propagation to finish.
- Debugging order-of-execution issues inside a long **RUN**.
- Comparing a wire with its dependencies in the **middle** of a script.

On **Wave**, `peek` reads **immediately** at the statement, while `show` is **deferred** until propagation settles (end of RUN). After a wire change mid-script, `peek` may still show the **old** downstream value on Wave; on **Legacy** the cascade updates dependents right away.

### Example — `peek` vs `show` after declarations (no mid-script change)

Legacy and Wave give the same result — combinational wires are already consistent when the statements run:

```logts-play
1wire a = 0
1wire b = NOT(a)
peek(a, b)
show(a, b)
```

```logts-play wave
1wire a = 0
1wire b = NOT(a)
peek(a, b)
show(a, b)
```

Expected Output (both modes):

```text
a (1wire) = 0 (ref: &0), b (1wire) = 1 (ref: &1)
a (1wire) = 0 (ref: &0), b (1wire) = 1 (ref: &1)
```

---

## `probe`

### Syntax

```
probe(expr)
```

**One argument only:**

| Form | Example |
|------|---------|
| Wire name | `probe(a)` |
| Storage reference | `probe(&1)` |
| Bit / slice | `probe(&1.0)`, `probe(&1.2-4)` |

### Output format

```
# name = value (ref) - reason
```

Examples:

```text
# a = 0 (&2) - initialised
# a = 1 (&2) - changed
# q = 1010 (&5) - edge committed
```

- **`name`** — wire name or ref label.
- **`value`** — formatted binary (with hex groups for wide buses).
- **`ref`** — storage address (`&N`), same as in `show` / variables panel.
- **`reason`** — why this line was emitted (see below).

### Position-independent registration

All `probe()` calls are collected during **elaboration** (before sequential execution). A probe declared **after** the wire it watches still sees the first committed value:

```logts-play
1wire a := 0
a = AND(b, 1)
probe(a)
1wire b = 0
```

After RUN, `probe(a)` still reports `initialised` for `a` when its first value is committed.

### Reasons

| Reason | When |
|--------|------|
| `initialised` | First emission for this target |
| `changed` | Value changed after initialisation |
| `edge committed` | Value committed while an edge-triggered property block runs (`on: raise`, `edge`, `rising`, `falling`) |

`edge committed` does **not** apply to level-triggered blocks (`on: 1`).

### Multiple probes

Each target is independent:

```logts-play
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
probe(a)
probe(b)
probe(c)
a = 1
```

### Example — wire, initialised + changed (după RUN)

`probe` raportează `changed` când valoarea se modifică **după** elaborare (ex. toggle switch, `setWire` în teste). Scriptul de mai jos este același ca testele **800** / **801**:

```logts-play
1wire b = 0
1wire a := 0
a = AND(b, 1)
probe(a)
```

După **RUN**, Output:

```text
# a = 0 (&…) - initialised
```

Schimbă `b` la `1` (panou Devices / DIP / switch conectat la `b`, sau butonul **Next** dacă e cazul) — apare:

```text
# a = 1 (&…) - changed
```

Wave — același script (`logts-play wave`); comportament identic la schimbarea lui `b` după RUN.

### Example — storage reference

```logts-play
4wire x := 0000
probe(&1)
x = 1010
```

`&1` is the ref allocated to `x` on first assignment. The same ref appears in `show(x)` output.

### Example — edge-triggered property block

```logts-play
comp [mem] .m:
  depth: 4
  length: 4
  on: raise
  :

4wire data = 1010
1wire clk = 0
1wire q = .m:get
probe(q)

.m:{
  data = data
  set = clk
}
clk = 1
clk = 0
```

When `clk` falls (`1` → `0`), the mem block may run on the rising-edge semantics of `set`; if `q` changes during that edge-triggered execution, you may see `# q = … - edge committed`.

---

## Legacy vs Wave — runnable examples

Blocurile `logts-play` folosesc **Legacy**; `logts-play wave` setează modul **Wave** (pill portocaliu în editor). Toate exemplele de mai jos sunt verificate de testele **804–813** din test runner.

### 1. `show` combinational — fără `NEXT(~)` (804 / 805)

Identic pe Legacy și Wave: un singur `show` la final, firele sunt deja stabile.

```logts-play
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)
```

```logts-play wave
1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)
```

Output: `c (1wire) = 0`, `a = 0`, `b = 1`.

### 2. `show` + `peek` după schimbare wire — Legacy cascade (806)

Pe **Legacy**, `a = 1` propagă imediat la `b = NOT(a)`; `peek` vede `b = 0`.

```logts-play
1wire a := 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)
```

Output (3 linii):

```text
a (1wire) = 0 …, b (1wire) = 1 …     ← show după declarații
a (1wire) = 1 …, b (1wire) = 0 …     ← peek după a = 1
a (1wire) = 1 …, b (1wire) = 0 …     ← show final
```

### 3. Același script pe Wave — `show` amânat, `peek` imediat (807)

```logts-play wave
1wire a := 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)
```

Pe Wave, `show` este amânat până la sfârșitul RUN; `peek` după `a = 1` citește **înainte** de settle — `b` rămâne `1`:

```text
a (1wire) = 1 …, b (1wire) = 1 …     ← toate cele 3 linii (show-urile flush la final)
```

### 4. `show` pe `REG(data, ~, 0)` — fără `NEXT` în script (808 / 809)

```logts-play
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
```

```logts-play wave
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
```

Output: `q (1wire) = 0` — registrul nu a făcut încă latch (lipsește `NEXT(~)`).

### 5. `show` înainte și după `NEXT(~)` în același script (810 / 811)

**Legacy** — fiecare `show` la momentul execuției:

```logts-play
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)
```

```text
q (1wire) = 0 …
q (1wire) = 1 …
```

**Wave** — ambele `show` sunt flush-uite după propagare, **după** `NEXT(~)`:

```logts-play wave
1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)
```

```text
q (1wire) = 1 …
q (1wire) = 1 …
```

### 6. Două `show(b)` după `a = 1` — Legacy vs Wave (812 / 813)

```logts-play
1wire a := 0
1wire b = NOT(a)
show(b)
a = 1
show(b)
```

Legacy Output:

```text
b (1wire) = 1 …
b (1wire) = 0 …
```

```logts-play wave
1wire a := 0
1wire b = NOT(a)
show(b)
a = 1
show(b)
```

Wave Output — ambele linii la flush final, `b` încă `1`:

```text
b (1wire) = 1 …
b (1wire) = 1 …
```

### Rezumat Legacy vs Wave (fără `NEXT` vs cu `NEXT`)

| Scenariu | Legacy | Wave |
|----------|--------|------|
| `show` la final, logică combinatională | Valori stabile | La fel |
| `peek` după `wire =` în mijlocul RUN | Cascade imediat | Citește storage curent (poate fi înainte de settle) |
| `show` în mijlocul RUN | La fiecare statement | Amânat — flush la sfârșitul RUN |
| `show` + `NEXT(~)` în script | `q=0` apoi `q=1` | Ambele `show` după `NEXT` → ambele `q=1` |
| `probe` după RUN + schimbare UI | `initialised` apoi `changed` | La fel (teste 800–801) |
| `probe` în timpul settle RUN (`a = AND(b,1)`) | O linie: `# a = 1 - initialised` (cascade imediat) | Două linii: `# a = 0 - initialised`, `# a = 1 - changed` (814–815) |

### 7. `probe` — `initialised` apoi `changed` la settle (815 wave)

Pe **Wave**, propagarea de la sfârșitul RUN poate schimba `a` după prima citire a probe-ului — a doua linie trebuie să fie **`changed`**, nu `initialised`:

```logts-play wave
1wire a := 0
1wire b := 1
a = AND(b, 1)
probe(a)
```

Output:

```text
# a = 0 (&0) - initialised
# a = 1 (&0) - changed
```

Pe **Legacy**, cascade-ul rulează înainte de `activateProbes` — o singură linie:

```logts-play
1wire a := 0
1wire b := 1
a = AND(b, 1)
probe(a)
```

```text
# a = 1 (&0) - initialised
```

---

## Which one should I use?

| Goal | Use |
|------|-----|
| Show final results in a script | `show` |
| Inspect values mid-script (rare) | `peek` |
| Trace every change to a wire or ref | `probe` |
| Log UI / `setWire` updates after RUN | `probe` |
| Document a circuit for a reader | `show` at the end |

---

## Wave vs Legacy (quick reference)

| Statement | Wave (editor default) | Legacy (tests default) |
|-----------|----------------------|-------------------------|
| `show` | Deferred until end of RUN / propagate flush | Emitted when the statement runs |
| `peek` | Immediate read at statement | Immediate read + cascade already applied |
| `probe` | On every value commit | Same |

`probe` is the only one that keeps reporting when values change **after** the initial RUN (e.g. toggling a switch, `setWire` in tests, oscillator ticks). See runnable examples above and tests **804–813** / **800–801**.

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires and displays update
- [Editor UI](editorUI.md) — Output panel, Run, Next, Wave / Legacy toggle
- [doc() function](doc-function.md) — `doc(def)` lists `show` as a built-in
- [REG](reg.md) — `NEXT(~)` and wire-clock behaviour with `show`
