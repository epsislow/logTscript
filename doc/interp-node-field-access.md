# Inline interpreter — node field access & decode

Navigate **deferred AST handles** by schema field name or index, decode leaf wire bits with **`/typeFormat`**, and introspect composite nodes with **`isNode`**, **`nodeName`**, and **`fieldCount`**.

Deferred parameters (`node^`, **`eval`**, **`save:`**) → [inline-interp-deferred.md](inline-interp-deferred.md). Schema shapes → [semantic-schemas.md](semantic-schemas.md). Wire decode on method params → [inline-interp.md](inline-interp.md).

> **Development feature:** `inline [parser]`, `inline [interp]`, and related AST tooling are available for experimentation in current builds. They are **not** part of the production language surface yet.

### Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons in the documentation viewer:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script and runs it immediately — check the **Output** panel for `show` results. |

---

## Quick reference

| Form | Result |
|------|--------|
| **`node:left`** | Child handle for bound field **`left`** on the current node |
| **`node:0`** / **`node:1`** | Same as **`node:left`** / **`node:right`** on product schemas (index by field order) |
| **`node:left:value/u8`** | Navigate to bound child, then decode leaf **`value`** as unsigned 8-bit |
| **`ref = node:0`** | Store a **`fieldRef`** (leaf bits + schema position) — not an executable node |
| **`ref/u8`** | Decode a stored **`fieldRef`** with **`/typeFormat`** (same rules as on a chain) |
| **`node:name[]/ascii`** | Decode a BVA blob as ASCII (empty **`[]`** = whole blob) |
| **`isNode(h)`** | **`1`** if **`h`** is a bound/BVA **node handle**, **`0`** for scalars and **`fieldRef`** |
| **`nodeName(h)`** | Schema field name for a sliced child (e.g. **`"left"`**, **`"value"`**) |
| **`fieldCount(h)`** | Number of navigable fields on a composite node (**`2`** on **`CallAdd`**, **`1`** on union leaves) |
| **`typeOf(fieldRef)`** | **`"field"`** — extends runtime types in [interp-builtins.md](interp-builtins.md) |
| **`show(node)`** | Multi-line tree: active tag, then **`field =`** lines for each child (bound → tag name, leaf → decoded debug width) |

**Reserved** (not user method names): **`isNode`**, **`nodeName`**, **`fieldCount`** — plus deferred builtins from [inline-interp-deferred.md](inline-interp-deferred.md).

**Rules:**

- **`eval`**, **`save:`**, **`get:`** work on **node handles** (`isNode` → **`1`**). They **abort** on **`fieldRef`**.
- **`/typeFormat`** on a **bound** field without reaching a leaf aborts (e.g. **`node:left/s16`**).
- Division **`left / right`** is unchanged — bare **`/type`** applies only when the token after **`/`** is a valid wire type name (`u8`, `s16`, `ascii`, …).

---

## Bound slice → node handle

Inside a method with deferred **`node^`**, **`node:left`** returns a child **node handle** (same kind as F6 **`/node`** on a bound param). **`typeOf`** is **`"node"`** and **`isNode`** is **`1`**.

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

inline [parser] .factLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = factor;
    rule factor = INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) {
        child = node:left;
        if (isNode(child) == 1 && typeOf(child) == "node") {
            return 1;
        }
        return 0;
    }
}

4096wire<expr> ast =: .factLang:packAst("3+4", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`1`** — **`node:left`** on **`CallAdd`** is a node handle.

---

## Leaf slice → `fieldRef` and decode

On **`CallNumber`**, **`node:0`** (or **`node:value`**) addresses the leaf **`value`** field. Without **`/typeFormat`** the result is a **`fieldRef`** (`typeOf` → **`"field"`**, **`isNode`** → **`0`**). Append **`/u8`** (or any valid wire type) to decode.

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

inline [parser] .factLang:
    token INT = [0-9]+;
    rule expression = INT -> CallNumber;
:

inline [interp] .factInterp {
    CallNumber(value/u8) {
        return node:0/u8;
    }
}

9wire<expr> ast =: .factLang:packAst("7", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`7`**.

---

## Named fields and nested decode

Field names come from the **child schema**, not from the parent tag alone. On **`CallAdd`**, **`node:left:value/u8`** walks **`left`** (bound **`CallNumber`**) then decodes leaf **`value`**.

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

inline [parser] .factLang:
    token INT = [0-9]+;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = INT -> CallNumber;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        return node:left:value/u8 + node:right:value/u8;
    }
}

4096wire<expr> ast =: .factLang:packAst("4+5", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`9`**.

---

## Index vs name

**`node:0`** and **`node:left`** are equivalent on fixed product nodes. **`node:1`** is the second field (**`right`** on **`CallAdd`**).

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

inline [parser] .factLang:
    token INT = [0-9]+;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = INT -> CallNumber;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        a = node:left:value/u8;
        b = node:1:value/u8;
        return a + b;
    }
}

4096wire<expr> ast =: .factLang:packAst("10+20", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`30`**.

---

## `nodeName` and `fieldCount`

| Handle | `fieldCount` | `nodeName(node:0)` |
|--------|--------------|-------------------|
| **`CallAdd`** | **2** | **`"left"`** |
| **`CallNumber`** (union leaf) | **1** | **`"value"`** |
| **`CallVariable`** | **2** | **`"name"`** |

Union nodes expose only the active branch — **`node:1`** on **`CallNumber`** aborts (**missing field**).

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

inline [parser] .factLang:
    token INT = [0-9]+;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = INT -> CallNumber;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        r = fieldCount(node) * 10;
        if (nodeName(node:0) == "left") {
            r = r + 1;
        }
        return r;
    }
}

4096wire<expr> ast =: .factLang:packAst("1+2", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`21`** (field count 2 → **`20`**, plus **`1`** when first field is **`left`**).

---

## Stored `fieldRef` and `ref/u8`

Assign a leaf slice to a local, then decode later:

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

inline [parser] .factLang:
    token INT = [0-9]+;
    rule expression = INT -> CallNumber;
:

inline [interp] .factInterp {
    CallNumber(value/u8) {
        ref = node:value;
        return ref/u8;
    }
}

9wire<expr> ast =: .factLang:packAst("8", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`8`**.

---

## ASCII on symbol names (`[]/ascii`)

For bound **`symbol`** fields, navigate to the BVA child before **`[]/ascii`**. On **`CallVariable`**, **`node:name[]/ascii`** decodes the identifier bytes.

```logts-play
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallVariable>:
    name: bound <symbol>
:

<expr>+:
    CallVariable?: bound <CallVariable>
:

inline [parser] .factLang:
    token ID = [a-zA-Z_][a-zA-Z0-9_]*;
    rule expression = $name:ID -> CallVariable;
:

inline [interp] .factInterp {
    CallVariable(name/ascii) {
        return vectorLen(explode(node:name[]/ascii, ""));
    }
}

16wire<expr> ast =: .factLang:packAst("hits", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
show(result)
```

Expected: Output **`4`** (length of **`"hits"`**).

---

## Extended `show(node)`

**`show`** on a deferred **node handle** prints the active tag, then one line per child field. Bound children show the child tag; leaf fields show a debug decode width.

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

inline [parser] .factLang:
    token INT = [0-9]+;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = INT -> CallNumber;
:

inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        show(node);
        return 0;
    }
}

4096wire<expr> ast =: .factLang:packAst("2+3", <expr>, "expression")
16wire result = .factInterp:eval(ast, <expr>)
```

Expected: Output includes **`CallAdd`**, **`left =`**, and **`right =`** lines.

**`show(fieldRef)`** prints the leaf path (e.g. **`field value (CallNumber.value, 8 bit)`**). **`show(ref/u8)`** decodes then prints the scalar.

---

## What aborts

| Expression | Reason |
|------------|--------|
| **`node:missing`** | Field not in schema for current node |
| **`node:left/s16`** | **`/typeFormat`** on bound field — navigate to leaf first |
| **`eval(node:0)`** on **`CallNumber`** | **`fieldRef`** is not a deferred executable subtree |
| **`node:1`** on **`CallNumber`** | Union leaf has only index **`0`** |

Slice and decode are **read-only** — they do not call **`eval`**, write **`env`**, or update **`evaluationMap`**.

---

## Related pages

| Topic | Page |
|-------|------|
| Deferred **`node^`**, **`eval`**, **`save:`** | [inline-interp-deferred.md](inline-interp-deferred.md) |
| **`typeOf`**, maps, casts | [interp-builtins.md](interp-builtins.md) |
| **`nodeLen`**, **`body[i]`**, **`nodeTag`** | [inline-interp-deferred.md](inline-interp-deferred.md) (BVA indexing) |
