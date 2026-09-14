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
| **`hasKey(map, key)`** | **`1`** if key exists on an **existing** map, **`0`** if key absent |
| **`hasIndex(vec, i)`** | **`1`** if integer index in bounds, **`0`** if out of range |
| **`has:slotName`** | **`1`** if save slot exists, **`0`** if not — does not return a handle |
| **`setKeysValues(map, keys, values)`** | **Merge/upsert** pairs from parallel vectors into an **existing** map; returns total flat key count after merge |

**Reserved** (not user method names): **`getKeys`**, **`getValues`**, **`setKeysValues`**, **`hasKey`**, **`hasIndex`**, prefixes **`unset:`** / **`has:`**, and method names **`unset`** / **`has`**.

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

## Membership probes — `hasKey`, `hasIndex`, `has:`

Use these when you need **`0`/`1`** without aborting on a **missing key** or **out-of-range index**. They complement strict reads (`map["k"]` aborts when the key is missing) and **`unset:`** (no-op on absent keys).

| Situation | **`hasKey` / `hasIndex`** | **`unset:`** (reference) |
|-----------|---------------------------|---------------------------|
| Key/index absent on **valid** container | **`0`** | no-op |
| Container variable **undefined** | **abort** | **abort** |
| Wrong container type | **abort** (`hasKey expects map` / `hasIndex expects vector`) | — |
| **`hasIndex`** index not an integer | **abort** | — |

### `hasKey(map, key)`

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        env["hits"] = 10;
        show(hasKey(env, "hits"));
        show(hasKey(env, "missing"));
        return hasKey(env, "hits");
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: Output **`1`** then **`0`**; **`result`** = **`00000001`**.

Missing key on an existing map:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        return hasKey(myList, "k");
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000000`**.

### `hasIndex(vec, i)`

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        arr = [10, 20, 30];
        show(hasIndex(arr, 1));
        show(hasIndex(arr, 9));
        return hasIndex(arr, 2);
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: Output **`1`** then **`0`**; **`result`** = **`00000001`**.

### `has:slotName`

Returns **`1`** when a **`save:`** slot exists, **`0`** when it does not — unlike **`get:slot`**, which aborts on a missing slot.

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .slotDemo {
    MapProbe(pad/u8) {
        return has:txBody;
    }
}
```

Use inside a session that has (or has not) executed **`save:txBody = …`**. See [inline-interp-deferred.md](inline-interp-deferred.md) for full slot wiring.

### Guarded read pattern

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["a"] = 1;
        v = 0;
        if (hasKey(myList, "a")) {
            v = myList["a"];
        }
        return v;
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000001`**.

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

## `setKeysValues(map, keys, values)` — hydrate from vectors

**Merge/upsert** key/value pairs from two parallel vectors into an **existing** map (`env`, `myList`, …). Does **not** remove keys that are absent from the vectors — use **`myList = {}`** first when you need a full replace.

| Rule | Behavior |
|------|----------|
| **Map arg** | Must already exist — undefined name → **`undefined variable`** abort |
| **Vector args** | Both must be vectors; scalars → abort |
| **Lengths** | **`vectorLen(keys) == vectorLen(values)`** — else abort |
| **Empty vectors** | **`setKeysValues(map, [], [])`** → **no-op** |
| **Duplicate keys** | Last pair in the vector wins |
| **Return** | **`vectorLen(getKeys(map))`** after merge (flat key count) |
| **Values** | Same rules as map assign — scalars and nested maps OK; AST handles → abort |

### Basic merge

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["old"] = 1;
        setKeysValues(myList, ["new"], [2]);
        return myList["old"] + myList["new"];
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000011`** (1 + 2 = 3 — **`old`** kept, **`new`** added).

### Reset then hydrate

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["a"] = 1;
        myList = {};
        setKeysValues(myList, ["b"], [2]);
        return vectorLen(getKeys(myList));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000001`** (only **`b`** — prior **`a`** gone after **`{}`** assign).

### Hydrate variant A — `setKeysValues` (bulk)

Symmetric export: **`getKeys(map)`** + **`getValues(map)`** → **`push`** on comp pouts. Re-import: pin vectors → **`setKeysValues(map, keysIn, valsIn)`**.

```logts-play
<Hydrate>+:
    pad: 8
:

inline [interp] .hydrateDemo {
    Hydrate(pad/u8) {
        myList = {};
        n = setKeysValues(myList, keysIn, valsIn);
        push keysOut: getKeys(myList);
        push valsOut: getValues(myList);
        push res: n;
        return n;
    }
}

comp [interp] .hydrateComp:
    on: 1
    astSchema = .Hydrate
    .hydrateDemo { }
    pin keysIn[2]5/ascii as keysIn
    pin valsIn[2]/s16 as valsIn
    pout keysOut[2]5/ascii as keysOut
    pout valsOut[2]/s16 as valsOut
    pout res/u8 as resOut
    :

8wire<Hydrate> ast = ^00
40wire[2] keysWire = 01100001 + 00000000 + 00000000 + 00000000 + 00000000 + 01100010 + 00000000 + 00000000 + 00000000 + 00000000
16wire[2] valsWire = 0000000000001010 + 0000000000010100
40wire[2] keysOutWire = \0;80
16wire[2] valsOutWire = \0;32
8wire res = 00000000
1wire run = 1

.hydrateComp:{
    ast = ast
    keysIn = keysWire
    valsIn = valsWire
    keysOut >= keysOutWire
    valsOut >= valsOutWire
    resOut >= res
    set = run
}

show(res)
```

Expected: **`res`** = **`00000010`** (two keys **`a`**, **`b`**). **`valsOutWire`** encodes **10** and **20**.

### Hydrate variant B — `for` loop (manual merge)

Same merge semantics — you control the loop (conditions, skip, **`break`**, length checks):

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        keys = ["x", "y"];
        vals = [5, 6];
        myList = {};
        i = 0;
        while (i < vectorLen(keys)) {
            myList[keys[i]] = vals[i];
            i = i + 1;
        }
        return vectorLen(getKeys(myList));
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000010`**.

### String values and `getValues`

For comp round-trip through **`getValues`**, keep stored values **homogeneous** (all strings, all numbers, …). Mixed **`typeof`** in one map is fine for **`setKeysValues`**, but **`getValues`** requires one scalar type — store text as **`/ascii`** strings when exporting.

---

## Related pages

| Topic | Page |
|-------|------|
| Map literal, auto-vivify, `env` | [interp-maps.md](interp-maps.md) |
| `save:` / `get:` / deferred eval | [inline-interp-deferred.md](inline-interp-deferred.md) |
| `vectorLen`, canvas helpers | [canvas-builtins.md](canvas-builtins.md) |
| Component exec + pout buffer | [comp-interp.md](comp-interp.md) |
