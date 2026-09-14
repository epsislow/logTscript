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
| **`toString(v)`**, **`toInt(v)`**, **`toFloat(v)`**, **`toBool(v)`** | Scalar runtime casts (≠ wire **`T2NUM`**) |
| **`typeOf(v)`** | Runtime type name: **`string`**, **`int`**, **`float`**, **`bool`**, **`vector`**, **`map`**, **`node`** |
| **`a, b = split(text, n)`** | Two-part string split — **destructure only** |
| **`implode(vec, sep)`**, **`explode(text, sep)`** | Join / split **string** vectors at runtime |

**Reserved** (not user method names): **`getKeys`**, **`getValues`**, **`setKeysValues`**, **`hasKey`**, **`hasIndex`**, **`toString`**, **`toInt`**, **`toFloat`**, **`toBool`**, **`typeOf`**, **`split`**, **`implode`**, **`explode`**, prefixes **`unset:`** / **`has:`**, and method names **`unset`** / **`has`**.

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

## Scalar casts — `toString`, `toInt`, `toFloat`, `toBool`

Runtime conversions inside **`inline [interp]`** — **not** wire **`T2NUM`/`NUM2T`**. Use wire encode/decode blocks when values cross the AST boundary.

| Builtin | Input | Output |
|---------|-------|--------|
| **`toString(v)`** | Scalar (**number**, **string**, **boolean**) | **string** |
| **`toInt(v)`** | Scalar | **integer** (truncated) |
| **`toFloat(v)`** | Scalar | **number** (finite) |
| **`toBool(v)`** | Scalar | **`1`** or **`0`** |

Vector, map, or deferred **node** handle → **abort** (`cast expects scalar`).

String numerics use the same strict ASCII parse as **`T2NUM`** — no partial parse (`"12abc"` aborts). **`toInt`** requires a [safe integer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger); larger values abort with **`integer out of range`**.

**`toBool`** hybrid rules (explicit conversion — **`if (cond)`** still uses pure truthy semantics):

| Input | **`toBool(v)`** |
|-------|-----------------|
| **`0`**, **`NaN`** | **`0`** |
| Non-zero **number** | **`1`** |
| **`"true"`**, **`"1"`** (exact) | **`1`** |
| **`"false"`**, **`"0"`** (exact) | **`0`** |
| Other non-empty **string** | **`1`** if truthy (`"maybe"` → **`1`**) |
| **`""`** | **`0`** |

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .castDemo {
    MapProbe(pad/u8) {
        n = toInt("10");
        b = toBool("false");
        s = toString(n);
        return toInt(s) + b;
    }
}

8wire<MapProbe> w = ^00
8wire result = .castDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00001010`** — **`toInt("10")` → 10**, **`toBool("false")` → 0**, **`toString(10)` → `"10"`**, **`toInt("10")` → 10**, total **10 + 0 = 10**.

---

## `typeOf(v)` — runtime type name

Returns a **string** label:

| Runtime value | **`typeOf(v)`** |
|---------------|-----------------|
| **`"hi"`** | **`"string"`** |
| **`42`** | **`"int"`** |
| **`1.5`** | **`"float"`** |
| **`true` / `false`** (boolean) | **`"bool"`** |
| **`[1, 2]`** | **`"vector"`** |
| **`{}`** map | **`"map"`** |
| **`get:slot`** handle | **`"node"`** |

Undefined variable → **abort** (`undefined variable`).

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .typeDemo {
    MapProbe(pad/u8) {
        myList = {};
        hits = 0;
        if (typeOf(myList) == "map") { hits = hits + 1; }
        if (typeOf(42) == "int") { hits = hits + 1; }
        if (typeOf("x") == "string") { hits = hits + 1; }
        return hits;
    }
}

8wire<MapProbe> w = ^00
8wire result = .typeDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000011`** — three matching **`typeOf`** labels.

---

## `split(text, n)` — two-part string split

**Destructure only:** **`a, b = split(text, n)`** — not valid in a simple assignment or expression.

| **`n`** | **`a`** | **`b`** |
|---------|---------|---------|
| **`0`** | **`""`** | full **text** |
| **`n > 0`**, in range | prefix **`text[0:n]`** | suffix **`text[n:]`** |
| **`n > 0`**, **`n ≥ len(text)`** | full **text** | **`""`** |
| **`n < 0`**, **`|n| < len(text)`** | prefix before last **`|n|`** chars | last **`|n|`** chars |
| **`n < 0`**, **`|n| ≥ len(text)`** | **`""`** | full **text** |

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .splitDemo {
    MapProbe(pad/u8) {
        a, b = split("hello", 2);
        return vectorLen(explode(a + b, ""));
    }
}

8wire<MapProbe> w = ^00
8wire result = .splitDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`a="he"`**, **`b="llo"`** → **`vectorLen(explode("hello",""))` = 5** → **`result`** = **`00000101`**.

---

## `implode(vec, sep)` and `explode(text, sep)`

Join or split **string vectors** at runtime (MVP: vector elements must already be **strings**).

| Case | **`implode`** | **`explode`** |
|------|---------------|---------------|
| Normal | **`implode(["a","b"], "\0")`** → **`"a\0b"`** | **`explode("a\0b", "\0")`** → **`["a","b"]`** |
| Empty vector / text | **`implode([], sep)`** → **`""`** | **`explode("", sep)`** → **`[]`** |
| Separator absent | — | **`explode("hello", "|")`** → **`["hello"]`** |
| Empty separator | — | **`explode("ab", "")`** → **`["a","b"]`** |

In **`inline [interp]`** string literals, **`\0`** is a null byte (use **`"\0"`** as separator for null-delimited blobs).

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .joinDemo {
    MapProbe(pad/u8) {
        vals = ["x", "y"];
        blob = implode(vals, "\0");
        parts = explode(blob, "\0");
        return vectorLen(parts);
    }
}

8wire<MapProbe> w = ^00
8wire result = .joinDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000010`**.

### Comp round-trip — `implode` on pout, `explode` on pin

Export string values from a map through one null-delimited **`[]~/ascii`** pout; read them back on a matching pin:

```logts-play
<F9Blob>+:
    pad: 8
:

inline [interp] .f9Blob {
    F9Blob(pad/u8) {
        myList = {};
        setKeysValues(myList, ["a", "b"], ["10", "20"]);
        blob = implode(getValues(myList), "\0");
        parts = explode(blob, "\0");
        push textOut: parts;
        myList2 = {};
        setKeysValues(myList2, ["a", "b"], textIn);
        push res: vectorLen(getValues(myList2));
        return vectorLen(getValues(myList2));
    }
}

comp [interp] .f9BlobComp:
    on: 1
    astSchema = .F9Blob
    .f9Blob { }
    pin textIn[]~/ascii as textIn
    pout textOut[]~/ascii as textOut
    pout res/u16 as resOut
    :

8wire<F9Blob> ast = ^00
40wire textInWire = 0011000100110000000000000011001000110000
40wire textOutWire = 0000000000000000000000000000000000000000
16wire resWire = 0000000000000000
1wire run = 1

.f9BlobComp:{
    ast = ast
    textIn = textInWire
    textOut >= textOutWire
    resOut >= resWire
    set = run
}

show(resWire)
```

Expected: **`resWire`** = **`0000000000000010`** (two string values merged from pin vector **`textIn`**). **`textOutWire`** = **`0011000100110000000000000011001000110000`** — null-delimited **`"10\0" + "20"`** (5 bytes → **`40wire`** on both **`[]~/ascii`** pin and pout). A **`24wire`** buffer is too narrow for that blob.

**Reserved** (not user method names): **`toString`**, **`toInt`**, **`toFloat`**, **`toBool`**, **`typeOf`**, **`split`**, **`implode`**, **`explode`**.

---

## Related pages

| Topic | Page |
|-------|------|
| Map literal, auto-vivify, `env` | [interp-maps.md](interp-maps.md) |
| `save:` / `get:` / deferred eval | [inline-interp-deferred.md](inline-interp-deferred.md) |
| `vectorLen`, canvas helpers | [canvas-builtins.md](canvas-builtins.md) |
| Component exec + pout buffer | [comp-interp.md](comp-interp.md) |
