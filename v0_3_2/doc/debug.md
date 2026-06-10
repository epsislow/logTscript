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
| Component `:get` (implicit) | `probe(.clk)` → `probe(.clk:get)` |
| Component property | `probe(.clk:get)` |
| Chip / PCB pin sau pout | `probe(.u1:sum)`, `probe(.q:result)` |
| Storage reference | `probe(&1)` |
| Bit / slice | `probe(&1.0)`, `probe(&1.2-4)` |

### Component outputs — ce acceptă `probe` (faza 1)

`probe` pe componentă monitorizează **doar proprietatea `:get`**, scrisă explicit (`probe(.sw:get)`) sau implicit (`probe(.sw)`). Condiția tehnică: la elaborare, componenta are deja un **`comp.ref`** în storage — valoarea `:get` se actualizează acolo când interacționezi cu Devices sau când oscilatorul comută.

| Tip `comp […]` | Formă `probe` | Status | Când emite `changed` |
|----------------|---------------|--------|----------------------|
| `[key]` | `probe(.clk)`, `probe(.clk:get)` | da | apăsare / eliberare tastă |
| `[switch]` | `probe(.sw)` | da | toggle în panou |
| `[dip]` | `probe(.dip)` | da | fiecare comutator DIP |
| `[rotary]` | `probe(.knob)` | da | rotire encoder |
| `[osc]` / `[~]` | `probe(.clk)` | da | fiecare tranziție 0↔1 (timer) |
| `[led]` multi-bit (`length` > 1) | `probe(.led)` | da* | la `:set` + `:value` (property block) |
| `[led]` 1-bit | `probe(.led)` | nu încă | `comp.ref` lipsește la RUN |
| `[adder]` `:get`, `:carry` | `probe(.a:carry)` | nu (faza 2) | valoare calculată, fără ref |
| `[divider]` `:get`, `:mod` | `probe(.d:mod)` | nu (faza 2) | idem |
| `[mem]` / `[reg]` / `[counter]` | `probe(.m:get)` | nu (faza 2) | citire din device |
| `[lcd]`, `[7seg]`, `[dots]` … | `probe(.disp:get)` | nu (faza 2) | display, fără ref la `:get` |
| instanță `pcb` / `chip` — pin sau pout | `probe(.u1:sum)`, `probe(.q:data)` | da (827–830) | după exec body / property block |

\* LED multi-bit primește `comp.ref` la creare; LED 1-bit îl poate aloca doar după primul property block — `probe` nu îl vede la elaborare.

**Reguli faza 1**

- Doar **`:get`** — `probe(.div:mod)`, `probe(.a:carry)` etc. sunt ignorate silențios (test **825**).
- **Fără slice** pe componentă — `probe(.dip.0)` nu e suportat încă; folosește un wire sau `probe(&N.0)` dacă știi ref-ul.
- **Motiv** la componente interactive: mereu `initialised` / `changed` (nu `edge committed` pe `:get` în sine).
- **Dublare**: dacă ai `1wire x = .sw` și `probe(.sw)`, aceeași schimbare poate produce **două linii** (componentă + wire).

#### Exemplu — chip / PCB pout din script principal (827–830)

Instanța trebuie creată **înainte** de `probe` în același RUN (probe se înregistrează la finalul RUN, când instanța există deja):

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

După RUN: `# .u1:sum = 1000 … - initialised`. La un nou pulse pe `set` cu alte `a`/`b`: `# .u1:sum = … - changed`.

Același model pentru PCB: `probe(.q:result)` unde `result` e `4pout` declarat în `pcb +[…]`.

**Notă:** `probe(.u1:sum)` și `1wire r = .u1:sum` + `probe(r)` pot emite **două linii** pentru aceeași schimbare (același ref în storage).

#### Exemplu — `[switch]` (821 / 822)

```logts-play
comp [switch] .sw:
    text:'Enable'
    :
probe(.sw)
```

După RUN: `# .sw:get = 0 … - initialised`. Toggle în panou → `# .sw:get = 1 … - changed`.

#### Exemplu — `[key]` (823 / 824)

```logts-play
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk:get)
```

Apăsare: `# .clk:get = 1 … - changed`. Eliberare: `# .clk:get = 0 … - changed`.

#### Exemplu — `[dip]` (multi-bit)

```logts-play
comp [dip] .mode:
    length:4
    text:'MODE'
    :
probe(.mode)
```

După RUN: `# .mode:get = 0000 … - initialised`. Fiecare comutator schimbat în panou actualizează întregul bus (ex. `# .mode:get = 0001 … - changed`).

#### Exemplu — `[osc]` (output periodic)

```logts-play
comp [osc] .tick:
    duration1:2
    duration0:2
    length:4
    freq:2
    :
probe(.tick)
```

După RUN: `initialised`, apoi linii `changed` la fiecare comutare automată a ieșirii (vizibil în Output după interacțiuni / refresh panou).

#### Ce nu funcționează încă — divider `:mod`

```logts-play
comp [divider] .div:
    depth:4
    :
probe(.div:mod)
```

După RUN: **nicio linie** `#` — quotient/remainder sunt calculate la citire, nu stocate în `comp.ref`. Pentru debug, folosește un wire:

```logts-play
comp [divider] .div:
    depth:4
    :
1wire mod = .div:mod
probe(mod)
```

(pulse pe `.div:set` + `a`/`b` ca în doc divider; `probe(mod)` raportează wire-ul după propagare.)

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
| `edge committed` | Latch la **frontiera descendentă** a ceasului wire al `REG(data, clk, clr)`, sau commit în timpul unui property block `on: raise` / `edge` / `rising` / `falling` |

`edge committed` nu se aplică la property blocks `on: 1` (level) și nici la `REG(..., ~, ...)` pe `NEXT(~)` (acolo apare `changed`).

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

### Example — `REG` wire clock + `edge committed` (816 / 817)

`REG(data, clk, clr)` cu **wire** ca `clk` (nu `~`) face latch pe frontiera **descendentă** `clk`: `1` → `0`. Când `q` se actualizează la acel moment, probe emite motivul **`edge committed`**.

**Pas 1 — Load & Run** (script de setup):

```logts-play
1wire data := 0
1wire clk := 0
1wire q = REG(data, clk, 0)
probe(q)
```

După RUN, Output:

```text
# q = 0 (&…) - initialised
```

**Pas 2 — pulse pe `clk`** (panou Variables: `data=1`, `clk=1`, apoi `clk=0`; sau DIP/key pe firele respective):

```text
# q = 1 (&…) - edge committed
```

Același scenariu pe Wave (`logts-play wave` la pasul 1). Testele automate folosesc `setWire` după RUN — comportament identic.

Variantă cu mai multe scrieri pe aceeași linie în script (editor, **Legacy** + `MODE WIREWRITE`):

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

Pe **Wave**, `clk = 1` apoi `clk = 0` în același RUN nu garantează pulse-ul (scrierile sunt amânate); preferă pulse din panou după RUN sau modul Legacy de mai sus.

### Example — `probe(.clk)` direct pe componentă (821–824)

Fără fire intermediare — monitorizezi output-ul tastei:

```logts-play
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk)
```

După RUN:

```text
# .clk:get = 0 (&…) - initialised
```

Apăsare → `# .clk:get = 1 … - changed`; eliberare → `# .clk:get = 0 … - changed`.

La fel pentru `comp [switch] .sw` cu `probe(.sw)` (teste **821** / **822**).

### Example — `[key]` + `REG` + `probe` (818 / 819)

Același latch pe frontiera descendentă a lui `clk`, dar ceasul vine de la o tastă din panoul **Devices**. `data` este deja `1`; după RUN, `q` rămâne `0` până la primul pulse complet pe `clk`.

**Pas 1 — Load & Run:**

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

După RUN, Output:

```text
# q = 0 (&…) - initialised
```

**Pas 2 — interacțiune cu tasta A** (apăsare apoi **eliberare**):

| Moment | `clk` | `q` | Probe |
|--------|-------|-----|-------|
| Apăsare (press) | `1` | `0` | — (încă nu s-a făcut latch) |
| Eliberare (release) | `0` | `1` | `# q = 1 (&…) - edge committed` |

La **apăsare**, `clk` urcă la `1`, dar `REG` nu copiază încă `data` în `q`. La **eliberare**, frontiera `clk` `1` → `0` face latch — `q` devine `1` și panoul **Output** se actualizează (la fel ca la alte componente interactive din Devices).

Același scenariu pe Wave (`logts-play wave` la pasul 1). Testele **818** / **819** simulează press/release cu `setComp('.clk', …)` după RUN.

### Example — property block `on: raise` (mem / reg)

Pentru `comp [mem]` / `comp [reg]` cu `on: raise`, la re-execuția unui property block declanșată de frontiera `set`, ieșirea probe poate folosi tot **`edge committed`** (dacă valoarea `:get` se modifică în acel bloc).

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
| `probe` + `REG` latch la `clk` 1→0 | `# q = 0 - initialised`, apoi `# q = 1 - edge committed` (816–817) | La fel |
| `probe` + `[key]` + `REG` după RUN | `initialised` la RUN; `edge committed` la release tastă (818–819) | La fel |
| `probe(.comp)` pe key/switch/dip/rotary/osc | `initialised` la RUN; `changed` la UI (821–824) | La fel |
| `probe(.div:mod)` fără ref | ignorat — fără linii (825) | La fel |

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
| Trace key / switch / DIP / osc output direct | `probe(.comp)` sau `probe(.comp:get)` |
| Log UI / `setWire` updates after RUN | `probe` |
| Trace divider carry/mod sau mem `:get` | wire intermediar + `probe(wire)` (până la faza 2) |
| Document a circuit for a reader | `show` at the end |

---

## Wave vs Legacy (quick reference)

| Statement | Wave (editor default) | Legacy (tests default) |
|-----------|----------------------|-------------------------|
| `show` | Deferred until end of RUN / propagate flush | Emitted when the statement runs |
| `peek` | Immediate read at statement | Immediate read + cascade already applied |
| `probe` | On every value commit | Same |

`probe` is the only one that keeps reporting when values change **after** the initial RUN (e.g. toggling a switch, pressing a key, `setWire` in tests, oscillator ticks). See runnable examples above and tests **804–819** / **800–801**.

---

## Related documentation

- [Signal propagation](signal-propagation.md) — when wires and displays update
- [Editor UI](editorUI.md) — Output panel, Run, Next, Wave / Legacy toggle
- [doc() function](doc-function.md) — `doc(def)` lists `show` as a built-in
- [REG](reg.md) — `NEXT(~)` and wire-clock behaviour with `show`
