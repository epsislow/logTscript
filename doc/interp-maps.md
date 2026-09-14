# Inline interpreter — maps (KV tables)

String-keyed **maps** store scalar values and nested map references inside `inline [interp]` method bodies and in the session **`env`** table. Maps use **`{}`**, **`map["key"]`**, and **`unset:`** (see [interp-builtins.md](interp-builtins.md) for introspection builtins).

Baseline interpreter syntax → [inline-interp.md](inline-interp.md). Session **`env`** for assignment programs → [inline-interp-deferred.md](inline-interp-deferred.md).

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
| **Literal** | `myList = {}` — empty map |
| **Write** | `myList["key"] = value` — string or numeric index coerced to string key |
| **Read** | `myList["key"]` — missing key **aborts** (`undefined variable`) |
| **Auto-vivify** | First assign to `myList["k"]` creates `myList` as `{}` if the name was unbound |
| **≠ vector** | Numeric **`vec[i]`** on an **array** is a vector index; string-key **`map["k"]`** is a map entry |
| **`env`** | Same index syntax — `env["hits"] = 1` writes the session table (see [deferred doc](inline-interp-deferred.md)) |
| **Nested** | `env["outer"]["inner"]` — chain `[]` on map references |
| **Unset** | `unset: myList["k"]` — delete key; absent key is a no-op → [builtins](interp-builtins.md) |
| **Allowed values** | Scalars (numbers, strings, booleans) and **nested map** references — not AST handles |
| **Introspect** | `getKeys(map)`, `getValues(map)`, `setKeysValues(map, keys, values)` → [interp-builtins.md](interp-builtins.md) |
| **Probe** | `hasKey(map, key)` — **`0`/`1`** without abort on missing key → [interp-builtins.md](interp-builtins.md) |

---

## Map vs vector

| | **Map** | **Vector** (`[]/type` param or `[ … ]` literal) |
|---|---------|--------------------------------------------------|
| **Keys** | String ( `"a"`, `"hits"`, … ) | Non-negative integer index `0 … len-1` |
| **Literal** | `{}` | `[1, 2, 3]` |
| **Grow on assign** | Auto-vivify map name on first `name["k"] = v` | Append at index `len` |
| **Unset** | `unset: map["k"]` deletes the key | **Not supported** — aborts |
| **Length** | `vectorLen(getKeys(map))` | `vectorLen(vec)` |

A local variable holds **either** a JavaScript array (vector) **or** a plain map object — not both at once. Assigning `{}` then using numeric-only vector indexing (or the reverse) follows the container type already stored.

---

## Empty map and string-key assign

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList = {};
        myList["a"] = 42;
        show(myList["a"]);
        return myList["a"];
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: Output shows **`42`**; **`result`** wire is **`00101010`**.

---

## Auto-vivify

The map variable does not need an explicit `{}` assignment when the first use is a string-key write:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        myList["k"] = 7;
        return myList["k"];
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00000111`**.

---

## Session `env` as a map

During **`:eval`**, the engine injects **`env`** — a flat string-keyed table shared across dispatches in that session. Use the same **`env["name"]`** syntax as user maps:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        env["hits"] = 0;
        env["hits"] = env["hits"] + 1;
        show(env["hits"]);
        return env["hits"];
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: Output **`1`**; **`result`** = **`00000001`**.

For parser-driven programs (`CallAssign` / `CallVariable`), see [inline-interp-deferred.md](inline-interp-deferred.md).

---

## Nested maps

Store a map inside another map, then index through the chain:

```logts-play
<MapProbe>+:
    pad: 8
:

inline [interp] .mapDemo {
    MapProbe(pad/u8) {
        inner = {};
        inner["x"] = 9;
        env["nested"] = inner;
        return env["nested"]["x"];
    }
}

8wire<MapProbe> w = ^00
8wire result = .mapDemo:eval(w, <MapProbe>)
show(result)
```

Expected: **`result`** = **`00001001`**.

---

## Stored value types

| Value | Allowed in map / `env` |
|-------|-------------------------|
| Number, string, boolean | Yes |
| Nested user map (`{}` or auto-vivified) | Yes — reference stored |
| AST node handle (`/node`, `^`, `save:`/`get:`) | **No** — assign aborts |
| JavaScript array used as vector | Use vector indexing, not string keys |

Reading a missing key always **aborts** with **`undefined variable`**. To test membership without aborting, use **`hasKey(map, key)`** → **`0`**. To remove a key, use **`unset:`** → [interp-builtins.md](interp-builtins.md).

---

## `myList = {}` vs `env = {}`

| Assign | Effect |
|--------|--------|
| **`myList = {}`** | Replaces a **local** user map — old content is no longer reachable from **`myList`** |
| **`env["key"] = v`** | Writes the **session** table shared across dispatches in the same **`:eval`** |
| **`env = {}`** | **Not** a session reset — it only rebinds a **local alias**; the shared session table is unchanged and reappears on the next helper entry |

To clear **`env`** keys, use **`unset: env["key"]`** or loop **`getKeys(env)`** + **`unset:`**. To replace a local map before bulk load, use **`myList = {}`** then **`setKeysValues(myList, …)`** → [interp-builtins.md](interp-builtins.md).

---

## Related pages

| Topic | Page |
|-------|------|
| `getKeys`, `getValues`, `unset:` | [interp-builtins.md](interp-builtins.md) |
| `env`, `save:`/`get:`, deferred eval | [inline-interp-deferred.md](inline-interp-deferred.md) |
| Vector parameters `[]/type` | [inline-interp.md](inline-interp.md) |
| `push` pout from comp context | [comp-interp.md](comp-interp.md) |
