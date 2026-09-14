# Inline interpreter — map & session builtins

Built-in calls and statements for **map introspection**, **key deletion**, and **save-slot cleanup** inside `inline [interp]` method bodies.

Map concepts (`{}`, string keys, `env`) → [interp-maps.md](interp-maps.md). **`save:`** / **`get:`** handles → [inline-interp-deferred.md](inline-interp-deferred.md). **`push`** pout wiring → [comp-interp.md](comp-interp.md).

> **Development feature:** `inline [parser]`, `inline [interp]`, and related AST tooling are available for experimentation in current builds. They are **not** part of the production language surface yet.

### Running examples (Load / Load & Run)

Runnable blocks on this page use the `logts-play` format. Each block shows two buttons in the documentation viewer:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Inspect or edit the example, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script and runs it immediately — check the **Output** panel for `show` results. |

---

## Quick reference

| Form | Purpose |
|------|---------|
| **`getKeys(map)`** | Return `[]/ascii` of **flat** keys (insertion order); skips nested-map values |
| **`getKeys(map, 1)`** | Return **all** keys including those whose value is a nested map |
| **`getValues(map)`** | Return vector of **flat scalar** values (homogeneous type); skips nested maps |
| **`unset: map["k"]`** | Delete one map key — no-op if key absent |
| **`unset: a, b, …`** | Comma-separated list (max **10** targets), left to right |
| **`unset: slotName`** | Remove a **`save:`** handle from `savedHandles` (not a local variable) |
| **`vectorLen(getKeys(map))`** | Key count — same helper as [canvas builtins](canvas-builtins.md) |

**Reserved** (not user method names): **`getKeys`**, **`getValues`**, prefix **`unset:`**, and method name **`unset`**.

---

## `getKeys(map)` — flat keys by default

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        inner = {};
        inner["x"] = 1;
        env["hits"] = 10;
        env["nested"] = inner;
        return vectorLen(getKeys(env));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000001`** — only **`hits`** is a flat scalar entry; **`nested`** (map reference) is skipped.

### Include nested-map keys

Pass a truthy second argument to list every key:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        inner = {};
        inner["x"] = 1;
        env["hits"] = 10;
        env["nested"] = inner;
        return vectorLen(getKeys(env, 1));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000010`** (keys **`hits`** and **`nested`**).

Target a map stored inside **`env`** explicitly: **`getKeys(env["myList"])`** — the second argument is always **`includeNested`**, not a slot name.

---

## `getValues(map)` — flat scalars only

Returns a vector of values for **flat** keys only (same skip rules as default **`getKeys`**). All returned scalars must share one type (all numbers, all strings, or all booleans). A nested map or mixed types **aborts**:

```text
getValues: value for key '…' is not a flat scalar type
```

Homogeneous numeric map:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["x"] = 5;
        myList["y"] = 6;
        return vectorLen(getValues(myList));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000010`**.

---

## `unset:` — delete map keys

Removing a key is separate from assignment — there is no **`map[k] = undefined`**.

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["a"] = 1;
        myList["b"] = 2;
        unset: myList["a"];
        return vectorLen(getKeys(myList));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000001`**.

### Multiple targets

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["a"] = 1;
        myList["b"] = 2;
        unset: myList["a"], myList["b"];
        return vectorLen(getKeys(myList));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000000`**.

### Nested unset

**`unset: env["myList"]["a"]`** deletes key **`"a"`** inside the map referenced by **`env["myList"]`**.  
**`unset: env["myList"]`** removes the **`myList`** entry from **`env`** (the reference), not the inner map’s keys individually.

### Errors

| Situation | Result |
|-----------|--------|
| Key absent | **No-op** (no abort) |
| Map variable never created | **Abort** — `undefined variable` |
| Target is a vector index (`flags[0]`) | **Abort** — `unset: not supported on vector index` |

---

## `unset:` — discard a `save:` slot

A bare identifier (no `[`) names a **save slot**, not a local variable — symmetric with **`save:txBody = …`** and **`get:txBody`**:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .slotDemo {
    MapProbe(pad/u8) {
        unset: txBody;
        return 0;
    }
}
```

After **`unset: txBody`**, **`get:txBody`** in the same session aborts with **`unknown save slot`**. Combine slot and map targets in one statement: **`unset: txBody, env["hits"]`**.

Full wire examples with **`save:`** / deferred handles → [inline-interp-deferred.md](inline-interp-deferred.md).

---

## `push` from `comp [interp]`

**`getKeys`** returns **`[]/ascii`** suitable for a vector pout. Inline **`:eval`** cannot **`push`** — use **`comp [interp]`**:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["a"] = 1;
        myList["b"] = 2;
        push keysOut: getKeys(myList);
        return vectorLen(getKeys(myList));
    }
}

comp [interp] .mapComp:
    on: 1
    astSchema = .MapProbe
    .mapDemo { }
    pout res/u8 as resOut
    pout keysOut[]/ascii as keysWire
    :

8wire<MapProbe> ast = ^00
8wire count = 00000000
8wire[2] keysWire = 0000000000000000
1wire run = 1

.mapComp:{
    ast = ast
    resOut >= count
    keysWire >= keysWire
    set = run
}

show(count)
```

Expected: **`count`** = **`00000010`** (two keys). Inspect **`keysWire`** in the wire panel for encoded ASCII elements.

---

## Related pages

| Topic | Page |
|-------|------|
| Map literal, auto-vivify, `env` | [interp-maps.md](interp-maps.md) |
| `save:` / `get:` / deferred eval | [inline-interp-deferred.md](inline-interp-deferred.md) |
| `vectorLen`, canvas helpers | [canvas-builtins.md](canvas-builtins.md) |
| Component exec + pout buffer | [comp-interp.md](comp-interp.md) |
