# Debug output — `show`, `peek`, `probe`, and boolean LUT utilities

Statements in this group write text to the **Output** panel. The first three inspect live values; **`lutOf`** and **`exprOfLut`** generate copy-pasteable boolean logic (LUT definitions or expressions) for analysis only — they do not change the circuit.

All are **statements** (like `doc`) — they cannot appear on the right side of `=`.

For LUT generation / reversal and other analysis helpers, see **[boolean-lut.md](boolean-lut.md)** and **[boolean-analysis.md](boolean-analysis.md)**.

---

## Quick comparison

| | `show` | `peek` | `probe` | `lutOf` / `exprOfLut` |
|---|--------|--------|---------|------------------------|
| **Purpose** | Display settled values | Instant snapshot | Monitor every value commit | Generate or reverse boolean LUT text |
| **When it emits** | End of **RUN** / **NEXT** (after propagation on Wave) | Immediately at statement position | On every **committed** change | Immediately at statement |
| **Position in script** | Matters | Matters | **Does not matter** (registered at elaboration) | Matters |
| **Arguments** | One or more expressions | One or more expressions | **Exactly one** expression | See below |
| **Output format** | `name (type) = value` | same | `# name = value (ref) - reason` | LUT block or `Nwire out = …` lines |
| **Wave vs Legacy** | Deferred on Wave until settle | Immediate | Same commit hooks in both modes | Immediate (no propagation) |
| **Runtime effect** | None (read-only) | None | None (logging only) | **None** — text for copy-paste |

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
| Component `:get` (implicit) | `probe(.clk)` → `probe(.clk:get)` |
| Component property | `probe(.clk:get)` |
| Chip / PCB pin or pout | `probe(.u1:sum)`, `probe(.q:result)` |
| Chip / PCB internal wire | `probe(.u1.partial)`, `probe(.q.shadow)` |
| Computed component | `probe(.div:mod)`, `probe(.add:carry)` |
| Storage reference | `probe(&1)` |
| Bit / slice | `probe(&1.0)`, `probe(&1.2-4)` |

### Syntax `:` vs `.` (chip / PCB / component)

| Punctuation | Example | Target |
|-------------|---------|--------|
| **`:`** after instance | `probe(.u1:sum)` | declared pin or **pout** |
| **`.`** after instance | `probe(.u1.partial)` | **internal wire** from body (not pin/pout) |
| **`:`** after component | `probe(.div:mod)` | component property (`:get`, `:mod`, `:carry`…) |

`probe(.u1.sum)` does **not** track pout `sum` — use `probe(.u1:sum)` for pout (test **839**).

### Component outputs — what `probe` accepts

**With `comp.ref` (phase 1):** `probe(.comp)` or `probe(.comp:get)` — key, switch, DIP, rotary, osc (`:get`).

**Without `comp.ref` (phase 2):** `probe(.comp:prop)` — computed value on `:set` / device recalc:

| Type | Properties | Tests |
|------|------------|-------|
| divider | `:get`, `:mod` | 825, 836–837 |
| adder, subtract | `:get`, `:carry` | 838 |
| multiplier | `:get`, `:over` | — |
| shifter | `:get`, `:out` | — |
| mem, reg, counter | `:get` | — |
| osc | `:counter` (`:get` stays on ref) | — |
| display (7seg, lcd…) | `:get` | — |

| Instance type | Form | Tests |
|---------------|------|-------|
| chip / PCB pin or pout | `probe(.u1:sum)` | 827–830 |
| chip / PCB internal wire | `probe(.u1.partial)` | 832–835 |

**Rules**

- **No slice** on component / internal wire — `probe(.dip.0)` / `probe(.u1.tmp.0)` are not supported yet.
- **Note:** `initialised` / `changed` (display and arithmetic on recalc); `edge committed` only on REG wires / edge property blocks.
- **Duplication:** the same ref may produce two lines if probe and a top-level wire watch the same source.

#### Example — chip / PCB pout from main script (827–830)

The instance must be created **before** `probe` in the same RUN (probe registers at end of RUN, when the instance already exists):

```logts-play
chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum

chip [halfAdd] .u1::
probe(.u1:sum)

.u1:{
  a = 0101
  b = 0011
  set = 1
}
```

After RUN: `# .u1:sum = 1000 … - initialised`. On a new pulse on `set` with different `a`/`b`: `# .u1:sum = … - changed`.

Same pattern for PCB: `probe(.q:result)` where `result` is a `4pout` declared in `pcb +[…]`.

**Note:** `probe(.u1:sum)` and `1wire r = .u1:sum` + `probe(r)` may emit **two lines** for the same change (same ref in storage).

#### Example — chip internal wire (832–833)

```logts-play
chip +[halfAddDbg]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  4wire partial = .add:get
  sum = partial
  carry = .add:carry
  :4bit sum

chip [halfAddDbg] .u1::
probe(.u1.partial)

.u1:{
  a = 0101
  b = 0011
  set = 1
}
```

`partial` is a wire in the body, not a pout — `# .u1.partial = 1000 … - initialised`.

#### Example — divider `:mod` (836–837)

```logts-play
comp [divider] .div:
  depth:4
  on:1
  :
probe(.div:mod)
.div:{
  a = 1100
  b = 0011
  set = 1
}
```

After RUN: `# .div:mod = 0000 … - initialised`. On another `:set` pulse with new `a`/`b` → `changed`.

#### Example — `[switch]` (821 / 822)

```logts-play
comp [switch] .sw:
    text:'Enable'
    :
probe(.sw)
```

After RUN: `# .sw:get = 0 … - initialised`. Toggle in panel → `# .sw:get = 1 … - changed`.

#### Example — `[key]` (823 / 824)

```logts-play
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk:get)
```

Press: `# .clk:get = 1 … - changed`. Release: `# .clk:get = 0 … - changed`.

#### Example — `[dip]` (multi-bit)

```logts-play
comp [dip] .mode:
    length:4
    text:'MODE'
    :
probe(.mode)
```

After RUN: `# .mode:get = 0000 … - initialised`. Each toggled switch in the panel updates the entire bus (e.g. `# .mode:get = 0001 … - changed`).

#### Example — `[osc]` (periodic output)

```logts-play
comp [osc] .tick:
    duration1:2
    duration0:2
    length:4
    freq:2
    :
probe(.tick)
```

After RUN: `initialised`, then `changed` lines on each automatic output toggle (visible in Output after interaction / panel refresh).

#### What does not work yet — divider `:mod`

```logts-play
comp [divider] .div:
    depth:4
    :
probe(.div:mod)
```

After RUN: **no** `#` lines — quotient/remainder are computed on read, not stored in `comp.ref`. For debugging, use a wire:

```logts-play
comp [divider] .div:
    depth:4
    :
1wire mod = .div:mod
probe(mod)
```

(pulse on `.div:set` + `a`/`b` as in divider doc; `probe(mod)` reports the wire after propagation.)

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

- **`name`** — wire name, `.comp:get`, or ref label.
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
| `edge committed` | Latch on the **falling edge** of the wire clock of `REG(data, clk, clr)`, or commit during a property block `on: raise` / `edge` / `rising` / `falling` |

`edge committed` does not apply to property blocks `on: 1` (level) nor to `REG(..., ~, ...)` on `NEXT(~)` (there you get `changed`).

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

### Example — wire, initialised + changed (after RUN)

`probe` reports `changed` when the value changes **after** elaboration (e.g. toggle switch, `setWire` in tests). The script below is the same as tests **800** / **801**:

```logts-play
1wire b = 0
1wire a := 0
a = AND(b, 1)
probe(a)
```

After **RUN**, Output:

```text
# a = 0 (&…) - initialised
```

Change `b` to `1` (Devices panel / DIP / switch wired to `b`, or the **Next** button if applicable) — you get:

```text
# a = 1 (&…) - changed
```

Wave — same script (`logts-play wave`); identical behavior when changing `b` after RUN.

### Example — storage reference

```logts-play
4wire x := 0000
probe(&1)
x = 1010
```

`&1` is the ref allocated to `x` on first assignment. The same ref appears in `show(x)` output.

### Example — `REG` wire clock + `edge committed` (816 / 817)

`REG(data, clk, clr)` with a **wire** as `clk` (not `~`) latches on the **falling** edge of `clk`: `1` → `0`. When `q` updates at that moment, probe emits reason **`edge committed`**.

**Step 1 — Load & Run** (setup script):

```logts-play
1wire data := 0
1wire clk := 0
1wire q = REG(data, clk, 0)
probe(q)
```

After RUN, Output:

```text
# q = 0 (&…) - initialised
```

**Step 2 — pulse on `clk`** (Variables panel: `data=1`, `clk=1`, then `clk=0`; or DIP/key on those wires):

```text
# q = 1 (&…) - edge committed
```

Same scenario on Wave (`logts-play wave` at step 1). Automated tests use `setWire` after RUN — identical behavior.

Variant with multiple writes on the same script line (editor, **Legacy** + `MODE WIREWRITE`):

```logts-play
MODE WIREWRITE
1wire data := 0
1wire clk := 0
1wire q = REG(data, clk, 0)
probe(q)
data = 1
clk = 1
clk = 0
```

On **Wave**, `clk = 1` then `clk = 0` in the same RUN does not guarantee the pulse (writes are deferred); prefer a panel pulse after RUN or Legacy mode above.

### Example — `probe(.clk)` directly on component (821–824)

No intermediate wires — you monitor the key output:

```logts-play
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk)
```

After RUN:

```text
# .clk:get = 0 (&…) - initialised
```

Press → `# .clk:get = 1 … - changed`; release → `# .clk:get = 0 … - changed`.

Same for `comp [switch] .sw` with `probe(.sw)` (tests **821** / **822**).

### Example — `[key]` + `REG` + `probe` (818 / 819)

Same falling-edge latch on `clk`, but the clock comes from a key in the **Devices** panel. `data` is already `1`; after RUN, `q` stays `0` until the first complete pulse on `clk`.

**Step 1 — Load & Run:**

```logts-play
1wire data := 1
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
1wire clk = .clk
1wire q = REG(data, clk, 0)
probe(q)
```

After RUN, Output:

```text
# q = 0 (&…) - initialised
```

**Step 2 — interaction with key A** (press then **release**):

| Moment | `clk` | `q` | Probe |
|--------|-------|-----|-------|
| Press | `1` | `0` | — (latch not done yet) |
| Release | `0` | `1` | `# q = 1 (&…) - edge committed` |

On **press**, `clk` goes to `1`, but `REG` does not copy `data` into `q` yet. On **release**, the `clk` `1` → `0` edge latches — `q` becomes `1` and the **Output** panel updates (same as other interactive Devices components).

Same scenario on Wave (`logts-play wave` at step 1). Tests **818** / **819** simulate press/release with `setComp('.clk', …)` after RUN.

### Example — property block `on: raise` (mem / reg)

For `comp [mem]` / `comp [reg]` with `on: raise`, when a property block re-executes on the `set` edge, probe output may also use **`edge committed`** (if the `:get` value changes in that block).

---

## Legacy vs Wave — runnable examples

`logts-play` blocks use **Legacy**; `logts-play wave` sets **Wave** mode (orange pill in the editor). All examples below are verified by tests **804–813** in the test runner.

### 1. `show` combinational — without `NEXT(~)` (804 / 805)

Same on Legacy and Wave: a single `show` at the end, wires are already stable.

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

### 2. `show` + `peek` after wire change — Legacy cascade (806)

On **Legacy**, `a = 1` propagates immediately to `b = NOT(a)`; `peek` sees `b = 0`.

```logts-play
1wire a := 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)
```

Output (3 lines):

```text
a (1wire) = 0 …, b (1wire) = 1 …     ← show after declarations
a (1wire) = 1 …, b (1wire) = 0 …     ← peek after a = 1
a (1wire) = 1 …, b (1wire) = 0 …     ← final show
```

### 3. Same script on Wave — deferred `show`, immediate `peek` (807)

```logts-play wave
1wire a := 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)
```

On Wave, `show` is deferred until end of RUN; `peek` after `a = 1` reads **before** settle — `b` stays `1`:

```text
a (1wire) = 1 …, b (1wire) = 1 …     ← all 3 lines (shows flush at end)
```

### 4. `show` on `REG(data, ~, 0)` — no `NEXT` in script (808 / 809)

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

Output: `q (1wire) = 0` — register has not latched yet (`NEXT(~)` missing).

### 5. `show` before and after `NEXT(~)` in the same script (810 / 811)

**Legacy** — each `show` at execution time:

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

**Wave** — both `show` calls are flushed after propagation, **after** `NEXT(~)`:

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

### 6. Two `show(b)` after `a = 1` — Legacy vs Wave (812 / 813)

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

Wave Output — both lines at final flush, `b` still `1`:

```text
b (1wire) = 1 …
b (1wire) = 1 …
```

### Summary — Legacy vs Wave (without `NEXT` vs with `NEXT`)

| Scenario | Legacy | Wave |
|----------|--------|------|
| `show` at end, combinational logic | Stable values | Same |
| `peek` after `wire =` mid-RUN | Immediate cascade | Reads current storage (may be before settle) |
| `show` mid-RUN | At each statement | Deferred — flush at end of RUN |
| `show` + `NEXT(~)` in script | `q=0` then `q=1` | Both `show` after `NEXT` → both `q=1` |
| `probe` after RUN + UI change | `initialised` then `changed` | Same (tests 800–801) |
| `probe` during RUN settle (`a = AND(b,1)`) | One line: `# a = 1 - initialised` (immediate cascade) | Two lines: `# a = 0 - initialised`, `# a = 1 - changed` (814–815) |
| `probe` + `REG` latch at `clk` 1→0 | `# q = 0 - initialised`, then `# q = 1 - edge committed` (816–817) | Same |
| `probe` + `[key]` + `REG` after RUN | `initialised` at RUN; `edge committed` on key release (818–819) | Same |
| `probe(.comp)` on key/switch/dip/rotary/osc | `initialised` at RUN; `changed` on UI (821–824) | Same |
| `probe(.div:mod)` computed component | `initialised` / `changed` on `:set` (836–837) | Same |
| `probe(.u1.partial)` chip/PCB internal wire | `initialised` / `changed` on body re-exec (832–835) | Same |
| `probe(.u1.sum)` dot on pout | ignored — use `probe(.u1:sum)` (839) | Same |

### 7. `probe` — `initialised` then `changed` at settle (815 wave)

On **Wave**, propagation at end of RUN may change `a` after the probe’s first read — the second line must be **`changed`**, not `initialised`:

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

On **Legacy**, the cascade runs before `activateProbes` — a single line:

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

## `lutOf` and `exprOfLut`

Boolean LUT utilities complement `show`: instead of displaying wire values, they emit **structured text** you can paste back into a script (inline `[lut]`, `comp [lut]`, or wire assignments).

**Full reference:** [boolean-lut.md](boolean-lut.md) — multi-bit variables, address limits, round-trip, error messages.

### `lutOf(expression)`

Build a LUT from a boolean expression.

```
lutOf(expr)
```

- **One argument** — built-ins `NOT`, `AND`, `OR`, `XOR`, … or short-notation in backticks: `` lutOf(`A | B`) ``
- **Output:** comment header, `depth:`, `length:`, and `data { … }` block
- **Address limit:** at most **8** input bits (256 rows). Wider → `LUT table too big (256 values), max bits number reached`
- Undeclared names in gates (`A`, `B`) are treated as **1 bit**; whole wires use `Nwire` width when declared above

```logts-play
lutOf(OR(A, B))
```

Example output:

```text
inline [lut] .generated:
  # A 1b, B 1b -> out 1b

  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
:
```

### `exprOfLut(.lut, variables…)`

Rebuild boolean logic from an existing LUT (inline or `comp [lut]`).

```
exprOfLut(.name, A, B)
exprOfLut(.name, A 2b, B 3b)
exprOfLut(.name, A.2, B.1, A.0, B.0)
exprOfLut(.name, A.2 1b, B.1 1b, A.0 1b, B.0 1b)
```

Column list can mirror the **`lutOf` header** (bit slices `A.2`, ranges `D.0-3`, length `B.1/3`) — not only whole variables.

- **Always two Output lines:** short-notation assignment, then standard notation — both copy-pasteable
- Variable width: `A` alone → **1b** if undeclared, else wire width; `A 4b` overrides explicitly
- Not supported on `prefixFree` / `variableDepth` LUTs

```logts-play
inline [lut] .or2:
  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
  :

exprOfLut(.or2, A, B)
```

Example output:

```logts
1wire out = `A | B`
1wire out = OR(A, B)
```

### When to use

| Goal | Use |
|------|-----|
| Truth table → LUT definition for paste into script | `lutOf` |
| LUT → minimised boolean expression (two notations) | `exprOfLut` |
| Document or share logic outside the simulator | either — Output is plain text |
| Run logic in the circuit | **Do not** use these — assign wires or use `comp [lut]` |

Allowed wherever `show` works: main script, **chip** body, **board** body. Same as `show`: no semicolon at end of line.

### Round-trip (sketch)

1. `lutOf(OR(A, B))` → paste Output (`inline [lut] .generated:` …)
2. `exprOfLut(.generated, A, B)` → paste the two assignment lines

Details and multi-bit examples: [boolean-lut.md](boolean-lut.md). LUT runtime syntax: [lut.md](lut.md).

---

## Which one should I use?

| Goal | Use |
|------|-----|
| Show final results in a script | `show` |
| Inspect values mid-script (rare) | `peek` |
| Trace every change to a wire or ref | `probe` |
| Trace key / switch / DIP / osc output direct | `probe(.comp)` or `probe(.comp:get)` |
| Log UI / `setWire` updates after RUN | `probe` |
| Trace divider `:mod`, adder `:carry` | `probe(.div:mod)`, `probe(.add:carry)` |
| Trace chip/PCB internal wire | `probe(.u1.partial)` (dot, not `:`) |
| Document a circuit for a reader | `show` at the end |
| Expression → LUT text for paste | `lutOf` |
| LUT → boolean expression (short + standard) | `exprOfLut` |

---

## Wave vs Legacy (quick reference)

| Statement | Wave (editor default) | Legacy (tests default) |
|-----------|----------------------|-------------------------|
| `show` | Deferred until end of RUN / propagate flush | Emitted when the statement runs |
| `peek` | Immediate read at statement | Immediate read + cascade already applied |
| `probe` | On every value commit | Same |
| `lutOf` / `exprOfLut` | Immediate at statement | Immediate at statement |

`probe` is the only one that keeps reporting when values change **after** the initial RUN (e.g. toggling a switch, pressing a key, `setWire` in tests, oscillator ticks). See runnable examples above and tests **804–819** / **800–801**.

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires and displays update
- [Editor UI](editorUI.md) — Output panel, Run, Next, Wave / Legacy toggle
- [doc() function](doc-function.md) — `doc(def)` lists `show` as a built-in
- [Boolean LUT utilities](boolean-lut.md) — `lutOf` / `exprOfLut` (full syntax, multi-bit, limits)
- [Boolean analysis helpers](boolean-analysis.md) — `truthTableOf`, `simplify`, `equivalent`, `inputsOf`, `costOf`
- [LUT component](lut.md) — runtime `inline [lut]` / `comp [lut]`
- [REG](reg.md) — `NEXT(~)` and wire-clock behaviour with `show`
