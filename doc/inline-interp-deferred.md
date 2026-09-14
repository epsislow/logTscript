# Inline interpreter — deferred parameters & `env`

Deferred AST handles (`/node`, `^`), the **`eval`** / **`evaled`** builtins, **`save:`** / **`get:`** handle slots, and assignment programs (`CallAssign`, `CallVariable`) share session state during **`.myInterp:eval(astWire, <schema>)`**. This page documents **`env`** and every deferred-evaluation behavior.

Baseline method syntax, vectors, and non-deferred **`:eval`** → [inline-interp.md](inline-interp.md). Parser + schemas → [inline-parser.md](inline-parser.md), [semantic-schemas.md](semantic-schemas.md).

> **Development feature:** `inline [parser]`, `inline [interp]`, and related AST tooling are available for experimentation in current builds. They are **not** part of the production language surface yet.

### Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons in the documentation viewer:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script and runs it immediately — check the **Output** panel for `show` results. |

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **`env`** | Engine-injected variable map for `CallAssign` / `CallVariable` — persists for one `:eval` session |
| **Deferred params** | `body/node` or `body^` — AST subtree **handle** instead of decoded value |
| **`eval(handle)`** | Materialize a deferred subtree; lazy cache per `(pathKey, schemaRef)` |
| **`eval(handle, 1)`** | Force re-execution; overwrites lazy cache entry |
| **`evaled(handle)`** | Returns **1** if cached, **0** if not — **does not execute** the subtree |
| **`save:slot = expr`** | Store a deferred handle in the session (does **not** run the subtree) |
| **`get:slot`** | Read a saved handle — use in `eval(get:slot, …)` |
| **Reserved names** | `eval`, `evaled`, `save`, `get`, `nodeLen`, `first`, `last`, `nodeTag`, `isNodeTag` — not user method names |
| **`while eval(cond)`** | Condition re-reads `env` each iteration when the AST node is deferred |
| **Leaf `/node`** | Invalid on leaf numeric fields — abort at first dispatch |
| **`body[i]`** | Index a composite deferred handle (BVA) — returns a child handle **without** `eval` |
| **`nodeLen(h)`** | Number of child nodes in a composite handle |
| **`first` / `last`** | First or last child handle of a composite BVA |
| **`nodeTag(h)`** | Active union branch name (e.g. `"CallAssign"`) — **no method execution** |
| **`isNodeTag(h, name)`** | Returns **1** / **0** — compares `nodeTag(h)` to `name` |
| **`show(node)`** | One-line summary: active tag + schema ref (e.g. `CallAssign <CallStatement>`) |

---

## Variable environment (`env`)

Assignment-style programs store values in an internal **`env`** table for the duration of one top-level **`:eval`** call.

### What `env` is

| Property | Detail |
|----------|--------|
| **Origin** | Injected by the interpreter engine into every method frame — **not** a user-declared variable |
| **Shape** | Flat string-keyed map (`env[name]`, `env['hits']`, …) |
| **Lifetime** | Created empty at the start of **`.myInterp:eval(...)`**; discarded when eval returns |
| **Sharing** | The **same** table is visible across all AST method dispatches and nested **`eval(handle)`** calls in that session |

You never declare `env` in source — reference it directly inside method bodies.

### Reading and writing variables

| Method | Typical body | Behavior |
|--------|--------------|----------|
| `CallAssign(name/ascii, value/s16)` | `env[name] = value;` | Bind `name` to the evaluated RHS |
| `CallVariable(name/ascii)` | `return env[name];` | Read `name` — **missing name aborts** eval |

Both **`env[name]`** (when `name` is an `ascii` parameter) and **`env['literal']`** (string-literal key) access the **same** table.

Program statements run in order; each `CallAssign` updates `env` before the next statement executes. The **return value** of `:eval` on a `<program>` schema is the value of the **last** statement (usually the last assignment’s RHS).

### Session maps (distinct roles)

Three separate maps live for one **`:eval`** session:

| Map | API | Purpose |
|-----|-----|---------|
| **`env`** | `env[name]`, `CallAssign`, `CallVariable` | Program **values** (numbers, etc.) |
| **`evaluationMap`** | `eval`, `evaled` | Lazy **subtree result** cache keyed by `(pathKey, schemaRef)` |
| **`savedHandles`** | `save:`, `get:`, `unset: slot` | Named **deferred AST handles** for delayed execution |
| **User maps** | `myList["k"]`, `{}` | Local **KV tables** (scalars + nested maps) — see [interp-maps.md](interp-maps.md) |

Changes to `env` inside **`eval(get:slot, 1)`** or **`eval(body, 1)`** are visible to later statements in the same session. **`evaled`** inspects only **`evaluationMap`** — not whether an `env` value is stale.

### Undefined variable

Reading **`env[name]`** when `name` was never assigned aborts with **`undefined variable`**. Initialize counters explicitly (e.g. `env['hits'] = 0`) before use when examples depend on a starting value.

### Interpreter methods for assignments

```logts-play
inline [interp] .calcInterp {
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    CallVariable(name/ascii) {
        return env[name];
    }
}
```

(Other examples below include full parser + schema wiring.)

### Program: `a=1;b=2;` (last statement value)

```logts-play
<byte>:
    value: 8
:

<CallNumber>:
    value: 8
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallMul>:
    left:  bound <expr>
    right: bound <expr>
:

<CallVariable>:
    name: bound <symbol>
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallAdd?:      bound <CallAdd>
    CallMul?:      bound <CallMul>
    CallVariable?: bound <CallVariable>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
:

<program>+:
    statements: bound <CallStatement>[1-]
:

inline [parser] .calcLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement = $name:ID "=" $value:expression ";"
          -> CallAssign;
    rule expression = INT -> CallNumber;
:

inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
}

600wire<program> prog =: .calcLang:packAst("a=1;b=2;", <program>, "program")
8wire result = .calcInterp:eval(prog, <program>)
show(result)
```

Expected: **`00000010`** (value of last assignment).

### Variable read: `x=5; y=0+x;`

Parser factor uses `$name:ID -> CallVariable` so identifiers decode to `CallVariable` with a captured name.

```logts-play
<byte>:
    value: 8
:

<CallNumber>:
    value: 8
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallMul>:
    left:  bound <expr>
    right: bound <expr>
:

<CallVariable>:
    name: bound <symbol>
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallAdd?:      bound <CallAdd>
    CallMul?:      bound <CallMul>
    CallVariable?: bound <CallVariable>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
:

<program>+:
    statements: bound <CallStatement>[1-]
:

inline [parser] .calcLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement = $name:ID "=" $value:expression ";"
          -> CallAssign;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = term "*" factor -> CallMul | factor;
    rule factor = INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    CallVariable(name/ascii) {
        return env[name];
    }
}

700wire<program> prog =: .calcLang:packAst("x=5;y=0+x;", <program>, "program")
8wire result = .calcInterp:eval(prog, <program>)
show(result)
```

Expected: **`00000101`**.

---

## Deferred parameters (`/node`, `^`, `eval`)

By default, every typed AST parameter is **decoded immediately** at dispatch (`left/s16` → JavaScript number). For **bound** or **BVA** fields (including **`bound <expr>`** union subtrees), you can defer evaluation:

| Syntax | IR type | Meaning |
|--------|---------|---------|
| `body/node` | `/node` | Pass an **AST node handle** instead of a decoded value |
| `body^` | `/node` | Sugar for `/node` on the same parameter |

Inside the method body, call the builtin **`eval(handle)`** to evaluate the subtree. **`eval(handle, 1)`** (or any truthy second argument) **forces** a fresh evaluation and bypasses the lazy cache.

| Rule | Detail |
|------|--------|
| Valid targets | Bound fields, BVA arrays, and **`bound <expr>`** expression unions |
| Invalid | Leaf numeric fields (`value: 8`) — abort at first dispatch |
| **`eval` name** | Reserved — not a user method name |
| **`while eval(cond)`** | Allowed without extra parentheses around `eval(...)` |
| Cache key | `(pathKey, schemaRef)` for the duration of one `:eval` session |

### Leaf `/node` aborts at dispatch

`value/node` on a leaf field is rejected when the engine first dispatches `CallNumber`:

```logts
<CallNumber>:
    value: 8
:

inline [interp] .badLeaf {
    CallNumber(value/node) {
        return 0;
    }
}
```

At runtime, `:eval` aborts with **`requires bound or BVA field for /node`**.

### Lazy `eval` cache on a deferred expression

`CallAdd(left^, …)` defers the left subtree. Two **`eval(left)`** calls reuse the same cached value (one map entry per handle):

```logts-play
<byte>:
    value: 8
:

<CallNumber>:
    value: 8
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?: <CallNumber>
    CallAdd?:    bound <CallAdd>
:

inline [parser] .deferLang:
    token INT = [0-9]+;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = INT -> CallNumber;
:

inline [interp] .deferInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left^, right/s16) {
        a = eval(left);
        b = eval(left);
        return b + right;
    }
}

4096wire<expr> ast =: .deferLang:packAst("3+5", <expr>, "expression")
16wire result = .deferInterp:eval(ast, <expr>)
show(result)
```

Expected output: **`0000000000001000`** (3 + 5 = 8).

### Forced vs lazy cache

| Call | Behavior |
|------|----------|
| **`eval(h)`** / **`eval(h, 0)`** | On cache hit, return stored value **without** re-executing the subtree |
| **`eval(h, 1)`** or any **truthy** second argument | Always re-execute, **overwrite** cache, return fresh value |
| After **`eval(h, 1)`**, then **`eval(h)`** | Lazy call returns the **last** forced result |

Use **`eval(condition, 1)`** in loops when the condition must observe **`env`** updates (see the while example below). Use bare **`eval(left)`** when the same subtree value should be reused (see the lazy **`CallAdd`** example above).

You can pass a **variable** as the second argument (for example **`flag = 1; eval(node, flag)`**) — any truthy value forces re-evaluation.

### `evaled(handle)` — cache probe without execution

**`evaled(handle)`** reads the current **`evaluationMap`** for the active `:eval` session. It returns **`1`** when an entry exists for the handle’s **`(pathKey, schemaRef)`** pair, and **`0`** when it does not. Unlike **`eval`**, it **never runs** the deferred subtree.

| Call | Executes subtree? | Typical use |
|------|-------------------|-------------|
| **`evaled(h)`** | No | Check whether a lazy **`eval(h)`** would hit the cache |
| **`eval(h)`** | Yes (or cache hit) | Materialize the subtree value |
| **`eval(h, 1)`** | Yes (always) | Force refresh after env changes |

**`evaled`** reflects **cache membership only** — it does not inspect **`env`** and does not detect stale cached values. After **`eval(h, 1)`**, **`evaled(h)`** returns **`1`** until the map is discarded with the session.

On a **composite BVA** handle, **`evaled(stmts)`** reports whether the **whole block** is cached, not individual statements.

Probe **before** and **after** a single **`eval(node)`** on the literal **`7`**. Encoding: **`pre * 100 + post * 10 + val`** → **`0 * 100 + 1 * 10 + 7 = 17`**:

```logts-play
<byte>:
    value: 8
:

<CallNumber>:
    value: 8
:

<expr>+:
    CallNumber?: <CallNumber>
:

<EvaledProbeBody>:
    node: bound <expr>
:

<EvaledProbeRoot>+:
    EvaledProbe?: bound <EvaledProbeBody>
:

inline [parser] .evaledLang:
    token INT = [0-9]+;
    rule evaledRoot = $node:expression -> EvaledProbe;
    rule expression = INT -> CallNumber;
:

inline [interp] .evaledInterp {
    CallNumber(value/u8) { return value; }
    EvaledProbe(node^) {
        pre = evaled(node);
        val = eval(node);
        post = evaled(node);
        return pre * 100 + post * 10 + val;
    }
}

4096wire<EvaledProbeRoot> ep =: .evaledLang:packAst("7", <EvaledProbeRoot>, "evaledRoot")
16wire result = .evaledInterp:eval(ep, <EvaledProbeRoot>)
show(result)
```

Expected output: **`0000000000010001`** (decimal **17** — pre **`0`**, post **`1`**, value **`7`**).

Use **`evaled`** to skip redundant forced work when a subtree is already materialized, for example **`if (!evaled(condition)) { eval(condition, 1); }`** before a loop body that needs a fresh condition read.

### `save:` / `get:` — deferred handle slots

During an **`:eval`** session, **`save:ident = expr`** stores a deferred AST handle under **`ident`**. The right-hand side must be a **`/node`** parameter or another handle expression — not a literal, call result, or arithmetic. **`save:`** does **not** execute the subtree; it only records the handle for later.

**`get:ident`** reads a slot saved earlier in the **same** **`:eval`** session. Typical use: **`eval(get:slot, 1)`** to run a saved body on demand. Unknown slots abort with **`unknown save slot`**.

| Form | Behavior |
|------|----------|
| **`save:slot = node`** | Bind deferred handle **`node`** to **`slot`** |
| **`eval(get:slot)`** / **`eval(get:slot, 1)`** | Execute the saved subtree (lazy or forced) |
| **`save:` / `get:` on RHS of `save:`** | Allowed — copy or re-bind an existing slot |
| Overwrite | **`save:`** with the same name replaces the previous handle |
| Session scope | Slots live in the active **`:eval`** map (shared with nested **`eval`**, like **`evaluationMap`**) |

**Example — save, then forced eval:** the assign **`hits=1`** runs only inside **`eval(get:slot, 1)`**. Encoding **`pre * 10 + post`** → **`0 * 10 + 1 = 1`**.

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallVariable>:
    name: bound <symbol>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <CallNumber>
:

<SaveProbeBody>:
    node: bound <CallAssign>
:

<SaveProbeRoot>+:
    SaveProbe?: bound <SaveProbeBody>
:

inline [parser] .slotLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule saveRoot = $node:statement -> SaveProbe;
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .slotInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    SaveProbe(node^) {
        save:slot = node;
        env['hits'] = 0;
        pre = env['hits'];
        eval(get:slot, 1);
        post = env['hits'];
        return pre * 10 + post;
    }
}

4096wire<SaveProbeRoot> sp =: .slotLang:packAst("hits=1;", <SaveProbeRoot>, "saveRoot")
16wire result = .slotInterp:eval(sp, <SaveProbeRoot>)
show(result)
```

Expected output: **`0000000000000001`** (decimal **1**).

**Example — `save:` does not execute:** three reads of **`env['hits']`** stay **`0`** until **`eval(get:slot, 1)`**. Encoding **`pre * 100 + mid * 10 + after`** → **`1`**.

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <CallNumber>
:

<SaveNoExecBody>:
    node: bound <CallAssign>
:

<SaveNoExecRoot>+:
    SaveNoExec?: bound <SaveNoExecBody>
:

inline [parser] .slotLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule saveNoExecRoot = $node:statement -> SaveNoExec;
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = INT -> CallNumber;
:

inline [interp] .slotInterp {
    CallNumber(value/u8) { return value; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    SaveNoExec(node^) {
        save:slot = node;
        env['hits'] = 0;
        pre = env['hits'];
        mid = env['hits'];
        eval(get:slot, 1);
        after = env['hits'];
        return pre * 100 + mid * 10 + after;
    }
}

4096wire<SaveNoExecRoot> sn =: .slotLang:packAst("hits=1;", <SaveNoExecRoot>, "saveNoExecRoot")
16wire result = .slotInterp:eval(sn, <SaveNoExecRoot>)
show(result)
```

Expected output: **`0000000000000001`**.

**Example — begin / commit transaction:** **`begin { … }`** saves the block body; **`commit;`** runs it once with **`eval(get:txBody, 1)`**. Final **`out=hits`** reads the updated env.

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallVariable>:
    name: bound <symbol>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallSub>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallAdd?:      bound <CallAdd>
    CallSub?:      bound <CallSub>
:

<F7BodyStmt>+:
    CallAssign?: bound <CallAssign>
:

<CallStatement>+:
    CallAssign?:      bound <CallAssign>
    CallBeginBlock?:  bound <CallBeginBlock>
    CallCommit?:      <CallCommit>
:

<CallBeginBlock>:
    body: bound <F7BodyStmt>[1-]
:

<CallCommit>:
:

<program>+:
    statements: bound <CallStatement>[1-]
:

inline [parser] .txLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement
        = "begin" "{" $body:statement+ "}" -> CallBeginBlock
        | "commit" ";" -> CallCommit
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;
    rule term = factor;
    rule factor = INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .txInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    CallBeginBlock(body^) {
        save:txBody = body;
        return 0;
    }
    CallCommit() {
        eval(get:txBody, 1);
        return env['hits'];
    }
}

4096wire<program> prog =: .txLang:packAst("hits=0; begin { hits=hits+1; } commit; out=hits;", <program>, "program")
16wire result = .txInterp:eval(prog, <program>)
show(result)
```

Expected output: **`0000000000000001`**.

Use this pattern when parser rules must **capture** a subtree (for example a **`begin`** block) and interpreter code should **choose when** to execute it — for example staging work at parse time and committing on an explicit **`commit;`** marker.

### Composite BVA: lazy `eval` does not re-run statements

A deferred **BVA** handle (`bound <CallStatement>[1-]`) runs all elements on **`eval(stmts, 1)`**. A following lazy **`eval(stmts)`** returns the cached last result **without** re-executing assigns:

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
:

<expr>+:
    CallNumber?: <CallNumber>
:

<StmtSeq>+:
    stmts: bound <CallStatement>[1-]
:

inline [parser] .seqLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule stmtSeq = statement+;
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = INT -> CallNumber;
:

inline [interp] .seqInterp {
    CallNumber(value/u8) { return value; }
    CallAssign(name/ascii, value/s16) {
        hits = env['__hits'];
        env['__hits'] = hits + 1;
        env[name] = value;
        return value;
    }
    StmtSeq(stmts^) {
        env['__hits'] = 0;
        eval(stmts, 1);
        eval(stmts);
        return env['__hits'];
    }
}

4096wire<StmtSeq> sq =: .seqLang:packAst("a=10; b=20;", <StmtSeq>, "stmtSeq")
16wire hits = .seqInterp:eval(sq, <StmtSeq>)
show(hits)
```

Expected output: **`0000000000000010`** (two assigns on forced run; lazy second **`eval`** does not increment again).

### `while eval(condition)` re-reads `env`

A deferred **condition** subtree is re-evaluated on every loop test, so assignments inside the body affect the next iteration:

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallVariable>:
    name: bound <symbol>
:

<CallSub>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallSub?:      bound <CallSub>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<WhileLoop>:
    condition: bound <expr>
    body:      bound <CallStatement>[1-]
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
    WhileLoop?:  bound <WhileLoop>
:

<program>+:
    statements: bound <CallStatement>[1-]
:

inline [parser] .loopLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement
        = "while" "(" $$ $condition:expression ")" "{" $body:statement+ "}" -> WhileLoop
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "-" term -> CallSub
        | term;
    rule term = INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .loopInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    WhileLoop(condition^, body^) {
        while eval(condition, 1) {
            eval(body, 1);
        }
        return 0;
    }
}

4096wire<program> prog =: .loopLang:packAst("n=3; while(n) { n=n-1; } out=n;", <program>, "program")
16wire result = .loopInterp:eval(prog, <program>)
show(result)
```

Expected output: **`0000000000000000`** (`n` is zero after the loop).

### Factorial via deferred while (5! = 120)

Full program: assignments, multiply/subtract, and a **`WhileLoop`** interpreter method using forced re-evaluation:

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallVariable>:
    name: bound <symbol>
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallSub>:
    left:  bound <expr>
    right: bound <expr>
:

<CallMul>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallAdd?:      bound <CallAdd>
    CallSub?:      bound <CallSub>
    CallMul?:      bound <CallMul>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<WhileLoop>:
    condition: bound <expr>
    body:      bound <CallStatement>[1-]
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
    WhileLoop?:  bound <WhileLoop>
:

<program>+:
    statements: bound <CallStatement>[1-]
:

inline [parser] .factLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement
        = "while" "(" $$ $condition:expression ")" "{" $body:statement+ "}" -> WhileLoop
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;
    rule term
        = term "*" factor -> CallMul
        | factor;
    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | $name:ID -> CallVariable;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallMul(left/s16, right/s16) { return left * right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    WhileLoop(condition^, body^) {
        while eval(condition, 1) {
            eval(body, 1);
        }
        return 0;
    }
}

4096wire<program> prog =: .factLang:packAst("fact=1; n=5; while(n) { fact=fact*n; n=n-1; } out=fact;", <program>, "program")
16wire result = .factInterp:eval(prog, <program>)
show(result)
```

Expected output: **`0000000001111000`** (120).

### Caret sugar (`^` ≡ `/node`)

Both forms compile to the same `/node` parameter type:

```logts
WhileLoop(condition^, body/node) { … }
```

---

## Node indexing & introspection

Composite deferred parameters (bound variable arrays — BVA fields such as `body/node` on a `while` body) expose child statement handles **without** running them. Use indexing and introspection builtins to walk the AST and call **`eval`** only where needed.

### `body[i]` — child handle by index

| Property | Detail |
|----------|--------|
| **Operand** | Composite handle (`kind: composite`) from a `/node` or `^` parameter backed by a BVA schema field |
| **Index** | Non-negative integer **`i`** |
| **Result** | Deferred **leaf** handle for child **`i`** — same shape as if the engine sliced the BVA during dispatch |
| **Side effects** | **None** — does **not** call `eval`, does **not** touch `evaluationMap` or `env` |
| **Bounds** | **`i ≥ nodeLen(body)`** → abort **`node index out of range`** |
| **Non-composite** | Index on a leaf handle → abort **`not a composite node`** |

`body[i]` is **not** vector indexing (F3h). It applies only to deferred node handles.

### `nodeLen(handle)`

Returns the number of bound substreams (children) in a composite handle. Non-composite handle → abort **`not a composite node`**.

### `first(handle)` / `last(handle)`

Return the first or last child handle — equivalent to **`handle[0]`** and **`handle[nodeLen(handle) - 1]`**. Empty composite (length **0**) → abort **`node index out of range`**.

### `nodeTag(handle)` / `isNodeTag(handle, name)`

Read the active union branch from the handle’s `presence_mask` **without** invoking a user AST method:

| Builtin | Returns |
|---------|---------|
| **`nodeTag(h)`** | String branch name (e.g. `"CallAssign"`, `"CallAdd"`, `"CallNumber"`) |
| **`isNodeTag(h, "CallAssign")`** | **1** if `nodeTag(h) == "CallAssign"`, else **0** |

No writes to **`env`** and no entries in **`evaluationMap`**. Internal **`pathKey`** values are not exposed.

### `show(node)`

When a **`show`** argument is a deferred handle, output is one line: **`<activeTag> <schemaRef>`** (e.g. **`CallAssign <CallStatement>`**). Field payloads are not expanded.

### Selective execution pattern

Walk children, peek tags, and **`eval`** only matching statements:

```logts
WhileLoop(condition^, body^) {
    i = 0;
    while (i < nodeLen(body)) {
        stmt = body[i];
        if (isNodeTag(stmt, "CallAssign")) {
            eval(stmt, 1);
        }
        i = i + 1;
    }
    return 0;
}
```

### Example — `nodeLen` and `body[0]`

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallVariable>:
    name: bound <symbol>
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallAdd?:      bound <CallAdd>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
:

<LenProbe>+:
    stmts: bound <CallStatement>[1-]
:

<TagProbe>+:
    stmts: bound <CallStatement>[1-]
:

inline [parser] .idxLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule stmtSeq = statement+;
    rule statement
        = "while" "(" $$ $condition:expression ")" "{" $body:statement+ "}" -> WhileLoop
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .idxInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    LenProbe(stmts^) { return nodeLen(stmts); }
    TagProbe(stmts^) {
        show(stmts[0]);
        if (isNodeTag(stmts[1], "CallAssign")) {
            return 1;
        }
        return 0;
    }
}

4096wire<LenProbe> sq =: .idxLang:packAst("a=1; b=2; c=3;", <LenProbe>, "stmtSeq")
16wire len = .idxInterp:eval(sq, <LenProbe>)
4096wire<TagProbe> tq =: .idxLang:packAst("a=5; b=1;", <TagProbe>, "stmtSeq")
16wire tagHit = .idxInterp:eval(tq, <TagProbe>)
show(len)
show(tagHit)
```

Use **Load & Run**. Expected output:

- **`len`**: `0000000000000011` (3 statements)
- **`show(stmts[0])`** line: `CallAssign <CallStatement>`
- **`tagHit`**: `0000000000000001` (`stmts[1]` is also `CallAssign`)

### Example — factorial via indexed `while` body

Same semantics as **`eval(body, 1)`**, but each child statement is dispatched explicitly:

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallVariable>:
    name: bound <symbol>
:

<CallSub>:
    left:  bound <expr>
    right: bound <expr>
:

<CallMul>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallSub?:      bound <CallSub>
    CallMul?:      bound <CallMul>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<WhileLoop>:
    condition: bound <expr>
    body:      bound <CallStatement>[1-]
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
    WhileLoop?:  bound <WhileLoop>
:

<program>+:
    statements: bound <CallStatement>[1-]
:

inline [parser] .factLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement
        = "while" "(" $$ $condition:expression ")" "{" $body:statement+ "}" -> WhileLoop
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;
    rule term
        = term "*" factor -> CallMul
        | factor;
    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | $name:ID -> CallVariable;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallMul(left/s16, right/s16) { return left * right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    WhileLoop(condition^, body^) {
        while (eval(condition, 1)) {
            i = 0;
            while (i < nodeLen(body)) {
                stmt = body[i];
                eval(stmt, 1);
                i = i + 1;
            }
        }
        return 0;
    }
}

4096wire<program> prog =: .factLang:packAst("fact=1; n=5; while(n) { fact=fact*n; n=n-1; } out=fact;", <program>, "program")
16wire result = .factInterp:eval(prog, <program>)
show(result)
```

Expected output: **`0000000001111000`** (120).

---

## Related pages

| Topic | Page |
|-------|------|
| Baseline `inline [interp]` syntax, vectors, `:eval` | [inline-interp.md](inline-interp.md) |
| Parser grammar + `:packAst` | [inline-parser.md](inline-parser.md) |
| Schema shapes (`<expr>+`, bound fields) | [semantic-schemas.md](semantic-schemas.md) |
| Component wiring (`push`, pin/pout) | [comp-interp.md](comp-interp.md) |
