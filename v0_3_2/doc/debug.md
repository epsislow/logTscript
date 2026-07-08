# Debug output — `show`, `peek`, `probe`, `watch`, and boolean LUT utilities

Statements in this group write text to the **Output** panel (or the **Timeline** panel for `watch`). The first three inspect live values; **`lutOf`** and **`exprOfLut`** generate copy-pasteable boolean logic (LUT definitions or expressions) for analysis only — they do not change the circuit.

All are **statements** (like `doc`) — they cannot appear on the right side of `=`.

For LUT generation / reversal and other analysis helpers, see **[boolean-lut.md](boolean-lut.md)** and **[boolean-analysis.md](boolean-analysis.md)**.

For **source literals** in assignments (`\255`, `\-3;8`, `"Hello"`), see **[wire-literals.md](wire-literals.md)**. Display tag `ascii` formats wire values as quoted text in the Output panel (see [show — display tags](#show)).

---

## Quick comparison

| | `show` | `peek` | `probe` | `watch` | `Zlist` | `lutOf` / `exprOfLut` |
|---|--------|--------|---------|---------|---------|------------------------|
| **Purpose** | Display settled values | Instant snapshot | Monitor every value commit | Waveform trace per signal | List all bus drivers (snapshot) | Generate or reverse boolean LUT text |
| **When it emits** | End of **RUN** / **NEXT** (after propagation on Wave) | Immediately at statement position | On every **committed** change | On every **committed** change | At statement position in **RUN** / **NEXT** only | Immediately at statement |
| **Position in script** | Matters | Matters | **Does not matter** (registered at elaboration) | **Does not matter** (registered at elaboration) | Matters | Matters |
| **Arguments** | One or more expressions | One or more expressions | **Exactly one** expression | **Exactly one** expression (same as `probe`) | **Exactly one** wire name | See below |
| **Output format** | `name (type) = value` | same | `# name = value (ref) - reason` | Timeline canvas (one column per bit or property slice) | `->` / `-> (active)` lines + `(resolved) =` | LUT block or `Nwire out = …` lines |
| **Wave vs Legacy** | Deferred on Wave until settle | Immediate | Same commit hooks in both modes | Same commit hooks in both modes | Immediate (like `peek`) | Immediate (no propagation) |
| **Runtime effect** | None (read-only) | None | None (logging only) | None (UI trace only) | None (read-only) | **None** — text for copy-paste |

For when wires update in the circuit, see [signal-propagation.md](signal-propagation.md). In **`MODE ZSTATE`**, see [zstate.md](zstate.md) for `Z`/`X` display rules.

---

## `Z` and `X` values (MODE ZSTATE)

In tristate mode, wire values may include **`Z`** (high-impedance) and **`X`** (conflict). Debug statements show them literally:

```text
bus (4bit) = 10X0
```

| Tool | Z / X behaviour |
|------|-----------------|
| `show` | Full string with `Z` and `X` |
| `peek` / `probe` | Same; every commit logged |
| `probe` (shared bus) | In **ZSTATE**, when the wire has multiple or enable-gated drivers, each line adds a suffix: ` — driver: …`, ` — conflict: …`, or ` — no active drivers` |
| `Zlist` | Lists every registered contributor; `(resolved) =` shows merged value |
| `watch` (Timeline) | `Z` → grey bar; `X` → red bar (conflict) |

`show` / `watch` never error on `X` — use them to **see** bus conflicts. Use **`probe(bus)`** live while toggling switches; use **`Zlist(bus)`** at **RUN** for a full driver inventory.

Full reference: **[zstate.md](zstate.md)**.

---

## `Zlist` (MODE ZSTATE)

### Syntax

```
Zlist(wireName)
```

Requires **`MODE ZSTATE`** and **wave** propagation. One wire identifier only (not an expression).

### When it emits

Only when execution reaches `Zlist(…)` during **RUN** or **NEXT** — like **`peek`**, not like **`probe`**. Toggling a switch in the panel does **not** re-run `Zlist`; use **`probe(bus)`** for live driver attribution.

### Output format

```text
bus (4bit):
-> bus = ramData w1 ramEn
  -> (active) bus = cpuData w1 cpuEn = 1010
(resolved) = 1010
```

| Line | Meaning |
|------|---------|
| `-> <label>` | Registered contributor, currently **inactive** (enable off) |
| `  -> (active) <label> = <value>` | Contributor driving this step |
| `(resolved) = <value>` | Merged wire value (same as `show(bus)` after settle) |

| Empty case | Message |
|------------|---------|
| No assignments / redirects on this wire | `bus (Nbit) — (no contributors)` |

`get>= bus` **without** `w1`/`w0` is a direct assign, not a bus contributor — it does not appear in `Zlist`.

### Example — dual enable

```logts-play wave
MODE ZSTATE

4wire bus
4wire cpuData = 1010
4wire ramData = 0110
1wire cpuEn = 1
1wire ramEn = 0

bus = cpuData w1 cpuEn
bus = ramData w1 ramEn
Zlist(bus)
```

### Example — interactive bus (probe + Zlist)

```logts-play wave
MODE ZSTATE

2wire bus
comp [switch] .s1:
  on: 1
  :

.s1:{ get >= bus w1 .s1
  set = 1 }

probe(bus)   # live — logs each commit (toggle in panel)
Zlist(bus)   # snapshot — full driver list at RUN only
```

After **RUN**, toggle `.s1` in the panel — **`probe`** logs each change with ` — driver: .s1:get w1 .s1`. Press **RUN** again to refresh **`Zlist`**.

---

## Wave Listen (UI panel)

Wave propagation trace — **separate panel**, not Output. Open from **Win ▾ → Wave Listen**.

| Control | Role |
|---------|------|
| **ON / OFF** | Arms the panel for the next **Run** (persists across runs) |
| **L1 / L2 / L3** | Trace verbosity (`debugLevel` on wave engine) |
| **Clear** | Clears panel history (no auto-clear on Run) |
| **Listening…** badge | Internal **listen** active while script runs (distinct from ON/OFF) |

**Listen** is runtime-only: ON at Run start (if armed + wave mode), OFF at Stop or script end. The ON button stays armed for the next Run.

Example trace (level 1):

```text
[wave 0] RUN init → recompute all wires
[wave 1] commit packetEncoded = ^4808…
[wave 1] lut-mut .huff:clear → re-exec st(1062:asg) packetEncoded := …
* script stopped listen is OFF
```

Legacy mode: one status line (`listen is ON/OFF`), no `[wave N]` lines.

See [Wave debug patterns](#wave-debug-patterns) and [huffman-v2.md](huffman-v2.md) (SC round-trip).

---

## `deps`

Dependency graph dump (tree text in **Output**). Runs at statement position like **`peek`**.

### Syntax

```
deps(wireName)
deps(expr)
deps(.lutInstance)
```

### Examples

```logts
deps(packetEncoded)     # producer, upstream, downstream, LUT-mutation
deps(source)            # downstream consumers
deps(source + codebook) # ad-hoc expr — upstream only
deps(.huff)             # stmts re-exec on LUT mutation
```

Works in **wave and legacy** (static elaboration index). For Huffman SC debugging, use with [Wave Listen](#wave-listen-ui-panel) — see [wave-debug patterns](#wave-debug-patterns).

---

## Wave debug patterns

| Pattern | When |
|---------|------|
| **`peek`** right after encode | Before any LUT mutation |
| **Literal wire snapshot** | Before `.huff:clear()` for recover |
| **`show`** on final results only | Wires that do not depend on mutated LUT |
| **`probe(.huff:size())`** | Witness LUT mutations |
| **`watch(ph.*)`** | FSM + multi-step protocol |
| **`deps(wire)`** | Before Run — see `.huff` / protocol links |
| **Wave Listen ON** | During Run — wave commits and LUT re-eval |

Huffman SC round-trip: [huffman-v2.md — Load & Run](huffman-v2.md).

---

## `show`

### Syntax

```
show(expr1, expr2, …)
show(expr1, expr2, … ; tag tag …)
```

Display tags are **optional**, appear **once after all arguments** (after `;`), and are **only** valid on `show`, `peek`, and `probe` (with restrictions on `probe` — see below).

#### Format tags (exactly one per statement)

| Tag | Effect |
|-----|--------|
| `dec` | Unsigned decimal — scalar/element ≤64 bit → `\N`; wire &gt;64 bit → 64-bit chunks + `+ \N (Rbit)` rest |
| `signed` | Signed two's complement (shorthand for `dec signed` when used alone). Header: `\N;sW` (wire ≤64) or grouped `;s64` chunks; cells: `\N;s{elementW}` |
| `decSigned` | Legacy alias for `dec` + `signed` (still accepted in parser) |
| `hex` | Nibbles `^…` (4 bit) on **vector/matrix cells**; plain wire uses grouped hex like default `show` |
| `hexWide` | With `hex` only — grouped wide hex on vector elements (≥32 bit) |
| `bin` | Explicit binary grouping (8-bit groups on wide wires) |
| `ascii` | 8-bit cells — scalar ≤8 bit: `"A"`; wider wires: grouped `\65 \66;ascii` |
| `q4p4` | Fixed-point **Q4.4** — grouped literal `\1.5;q4p4` on **8-bit** elements |
| `q8p8` | Fixed-point **Q8.8** decimal on **16-bit** wires |
| `fp16` | IEEE 754 half as decimal (`3`, `nan`, `inf`) on **16-bit** wires |
| `bf16` | Brain float 16 as decimal on **16-bit** wires |
| `sX` | Fixed signed width per element — e.g. `show(v; s8)` → `\2 \-1 \5 \0;s8` (distinct from adaptive `signed`) |
| `qXpY` | Parametric Q format — e.g. `show(w; q6p2)` → `\1.5;q6p2`, `show(w; q8p0)` → `\5;q8p0` (not `;s8`) |

Exactly **one** format tag per statement: `dec`, `hex`, `bin`, `ascii`, fixed (`q4p4`, `q8p8`, `fp16`, `bf16`), or parametric (`sX`, `qXpY` with X+Y≤64). `signed` (adaptive) is mutually exclusive with `sX` and with numeric-format tags; `dec` + `sX` is rejected.

#### Layout / element tags (`show` and `peek` only)

| Tag | Effect |
|-----|--------|
| `compact` | Rank-1: header + `has length [N]` only; matrix: header + `has shape [R,C]` — no `:i` lines |
| `elAll` | List every vector/matrix cell (no `..` truncation) |
| `elNonZero` | List only non-zero cells |
| `elRange=0-3` | Vector: elements `:0`…`:3`; matrix: rows `0`…`3` (all columns). Matrix 2D: `elRange=0-1,2-4` |
| `elLast=N` | Last `N` elements (vector) or rows (matrix) |
| `maxWidth=N` | Truncate single-line output to `N` chars + ` ..` |
| `multiline` | Wrap formatted value (default wrap 40, or `maxWidth` when set) |

`elAll`, `elNonZero`, `compact`, `elRange`, and `elLast` are **mutually exclusive**. `probe` allows format tags + `maxWidth` + `multiline` only (no `el*` / `compact`).

Without format tags, wide wires keep the default hex grouping (`^0000 … 7B`).

```logts-play
408wire a := \123
show(a)                    # default hex
show(a; dec)               # decimal chunks
show(a; signed)            # signed decimal chunks
4wire w := 1111
show(w; signed)            # w (4wire) = \-1;s4
8wire code := 01000001
show(code; ascii)          # code (8wire) = "A"
8wire fp = 00011000
show(fp; q4p4)             # fp (8wire) = \1.5;q4p4
show(v; s8)                # 8wire[4] v = \2 \-1 \5 \0;s8  (fixed per element)
show(w; q8p0)              # w (8wire) = \5;q8p0
40wire msg := "Hello"
show(msg; ascii)           # msg (40wire) = \72 \101 \108 \108 \111;ascii
```

Rank-1 tensors (`4wire[3]`, `4wire[3,1]`) use `has length [N]` in `show` output. Matrix row slices (`show(m:0)`) print a flat row header plus `:0:0`…`:0:(C-1)` cell lines and the parent `has shape [R,C]`:

```logts
4wire[1,3] row = 0001 + 0010 + 0100
4wire[2,3] m = REPEAT(row, \2)
show(m:0; dec)
```

Each argument is an expression atom: wire name, component reference (`.comp:get`), bit slice (`a.0`, `a.2-4`), storage ref (`&3`), literal (`\255`, `^-A;8`, `"text"`), etc.

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
peek(expr1, expr2, …)
peek(expr1, expr2, … ; tag tag …)
```

Same display tags as `show` (see [show — display tags](#syntax)).

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
probe(expr ; tag …)
```

Display tags on `probe`: `dec`, `signed`, `hex`, `hexWide`, `bin`, `ascii`, `maxWidth=`, `multiline` — same formatting as `show` on the **flat blob** value. No `elAll` / `elNonZero` / `compact` / `elRange` / `elLast`.

```logts-play
8wire v := 01000001
probe(v; ascii)    # # v = "A" - initialised
probe(v; dec)      # # v = \65 - initialised
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
| Wire bit-range | `probe(data.4/4)` → `# data.4-7 = …` |
| Vector element | `probe(vectorA:1)` → `# vectorA:1 = …` |
| Vector element slice | `probe(vectorA:1.0/2)` → `# vectorA:1.0-1 = …` |
| Whole vector | `probe(vectorA)` |

### MODE ZSTATE — driver suffix (shared bus)

On wires with multiple or enable-gated contributors, each commit appends a suffix after the reason:

```text
# bus = 10 (&0) - changed — driver: .s1:get w1 .s1
# bus = X0 (&0) - changed — conflict: bus = a, bus = b
# bus = ZZ (&0) - changed — no active drivers
```

Single-driver wires (no `w1` / `ZCONNECT` / redirects) keep the classic `# name = value - changed` line. For a full driver list at **RUN**, use [`Zlist`](#zlist-mode-zstate).

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

## `watch`

### Syntax

Same as `probe` — **one expression** per statement:

```
watch(clk)
watch(o)
watch(o.1-3)
watch(.sw)
watch(.o:counter)
watch(.u1:sum)
```

Collected during **elaboration** (end of **Run**), like `probe`. Does **not** write to **Output**; samples appear in the editor **Timeline** panel (above Output). Toggle the panel from **Panels → Timeline**.

### What `watch` accepts

Uses the same expression forms as `probe` (wires, `.comp`, `.comp:prop`, chip/PCB `:pout`, internal `.inst.wire`, `&ref`, bit slices). See the **`probe`** section above for the full table.

**Multi-bit expansion** — the Timeline shows **one column per bit** (or per single-bit slice), not one collapsed bus:

| Expression | Columns created |
|------------|-----------------|
| `watch(clk)` on `1wire clk` | `clk` |
| `watch(o)` on `4wire o` | `o.0`, `o.1`, `o.2`, `o.3` |
| `watch(o.2)` | `o.2` |
| `watch(o.1-3)` | `o.1`, `o.2`, `o.3` |
| `watch(.o:counter)` on `osc` with `length: 4` | `.o:counter.0` … `.o:counter.3` |
| `watch(.sw)` on `4bit` DIP | `.sw` (single channel; component `:get` as one trace) |
| `watch(vectorA)` on `4wire[3]` | `vectorA.0` … `vectorA.11` (flat 12-bit wire) |
| `watch(vectorA:0)` | `vectorA:0.0` … `vectorA:0.3` (one element) |
| `watch(vectorA:1.0/2)` | `vectorA:1.0`, `vectorA:1.1` (sub-range within element) |

See also [wire-vectors.md — probe / watch](wire-vectors.md#probe--watch) for vector-specific behaviour.

**Wire vs component property** — important for oscillators and gated logic:

| Expression | What you see |
|------------|--------------|
| `watch(o)` | The **wire** `o` after assignments and propagation (e.g. after `AND` with a switch). |
| `watch(.o:counter)` | The **internal counter** of component `.o` (`osc` `:counter`), independent of wires that read it. |

Example: with `4wire o = AND(.o:counter, .p + .p + .p + .p)`, `watch(.o:counter)` keeps counting when `.p` is off; `watch(o)` stays LOW until `.p` is on.

### Timeline display

- **Layout:** vertical trace — newest events at the **top**; time axis is **event order** (sample index + cycle), not simulated milliseconds.
- **Columns:** labels are drawn **inside the canvas header** (e.g. `o.0`, `.o:counter.2`). All channels on a row are **synchronized** (same timestep).
- **Levels:** **green** wide bar = logic `1` (HIGH); **narrow dark** bar = logic `0` (LOW). A thin highlight marks an edge on that bit.
- **Controls:** **Pause** / **Resume** freezes auto-scroll; **Live** jumps back to the latest samples. **Drag** on the canvas to scroll history.
- **History:** up to ~1500 rows; marker lines every 25 events (`#seq` on the right margin).

### Example — wires

```logts-play
1wire clk = 0
1wire en = 0

watch(clk)
watch(en)

clk = 1
en = 1
```

After **Run**, the Timeline shows two columns toggling when `clk` and `en` change.

### Example — multi-bit wire and oscillator counter

```logts-play
comp [~] .o:
    duration1: 4
    duration0: 4
    length: 4
    freq: 10
    freqIsSec: 0
    eachCycle: 1
    :

comp [switch] .p:
    text: 'Pwr'
    :

4wire o = AND(.o:counter, .p + .p + .p + .p)
1wire c = AND(.o, .p)

watch(.o:counter)
watch(o)
watch(c)
```

- `.o:counter.*` — four columns; counter ticks in real time (osc timers).
- `o.*` — gated by `.p`; flat until the switch is on.
- `c` — 1-bit gated copy of the osc `:get` output.

### Rules

- Same elaboration rules as `probe` (position in script does not matter; registered at end of **Run**).
- **Duplicate** `watch()` on the same expanded target (e.g. `watch(o.0-3)` then `watch(o.0)`) creates **one** column — first occurrence wins.
- Computed component properties (`:counter`, `:mod`, `:carry`, …) emit samples when the component recalculates (including `osc` timer ticks).
- **Editor only** — available in `script_editor_v0_3_2.html`, not in `run_tests.html`.
- Complements **`probe`**: use `probe` for a text log in Output; use `watch` for a visual trace over time.

---

## `lutOf` and `exprOfLut`

Boolean LUT utilities complement `show`: they emit **structured text** you can paste into a script as `inline [lut]`, or wire assignments from `exprOfLut`.

**Full reference:** [boolean-lut.md](boolean-lut.md) — filters, `description:` / `filters:` attributes, multi-bit, round-trip.

**Related:** [boolean-analysis.md](boolean-analysis.md) — `truthTableOf`, `simplify`, `equivalent`, `inputsOf`, `costOf`.

### `lutOf(expression [, filters])`

Build an `inline [lut]` block from a boolean expression.

```
lutOf(expr)
lutOf(expr, A=01*1*, B=*, C=000**)
```

- Built-ins `NOT`, `AND`, `OR`, `XOR`, … or short-notation in backticks: `` lutOf(`A | B`) ``
- **Output:** `description:`, optional `filters:`, then `depth:`, `length:`, `data { … }`
- **Row limit:** max **256** data rows (`Boolean analysis exceeds maximum supported table size (256 rows)`)
- With filters, more than 8 input bits are allowed if the filtered row count stays ≤ 256
- Undeclared names in gates (`A`, `B`) are **1 bit**; whole wires use declared `Nwire` width

```logts-play
lutOf(OR(A, B))
```

```text
inline [lut] .generated:
  description: A 1b, B 1b -> out 1b

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

### `exprOfLut(.lut [, variables…])`

Rebuild boolean logic from an **`inline [lut]`** instance.

```
exprOfLut(.generated)
exprOfLut(.name, A, B)
exprOfLut(.name, A 2b, B 3b)
exprOfLut(.name, A.2, B.1, A.0, B.0)
```

- With **`filters:`** on the LUT, omit variables — `exprOfLut` derives them from the filter patterns
- Without `filters:`, list columns matching `description:` (or address width vs `length`)
- **Always two Output lines:** short-notation assignment, then standard notation
- Not supported on `prefixFree` / `variableDepth` LUTs

```logts-play
5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01*1*, B=*, C=1001*)
exprOfLut(.generated)
```

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

### When to use

| Goal | Use |
|------|-----|
| Expression → truth table text | `truthTableOf` — [boolean-analysis.md](boolean-analysis.md) |
| Expression → `inline [lut]` for paste / invoke | `lutOf` |
| `inline [lut]` → minimised boolean expression | `exprOfLut` |
| Document or share logic outside the simulator | any of the above — Output is plain text |
| Run logic in the circuit | paste `inline [lut]` and use `^.name(in=addr)` — [lut.md](lut.md) |

Allowed wherever `show` works: main script, **chip** body, **board** body. No semicolon at end of line.

### Round-trip (sketch)

1. `lutOf(OR(A, B))` → paste Output (`inline [lut] .generated:` …)
2. `exprOfLut(.generated, A, B)` → paste the two assignment lines

With filters: `lutOf(…, A=01*1*, B=*, C=1001*)` then `exprOfLut(.generated)` (no variable list).

Details: [boolean-lut.md](boolean-lut.md). LUT invoke syntax: [lut.md](lut.md).

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
| Expression → truth table text | `truthTableOf` — [boolean-analysis.md](boolean-analysis.md) |
| Expression → `inline [lut]` block | `lutOf` |
| `inline [lut]` → boolean expression | `exprOfLut` |

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
- [Boolean LUT utilities](boolean-lut.md) — `lutOf` / `exprOfLut` (`description:`, `filters:`, multi-bit)
- [Boolean analysis helpers](boolean-analysis.md) — `truthTableOf`, `simplify`, `equivalent`, `inputsOf`, `costOf`
- [LUT component](lut.md) — runtime `inline [lut]` invoke (`^.name(in=…)`)
- [REG](reg.md) — `NEXT(~)` and wire-clock behaviour with `show`
