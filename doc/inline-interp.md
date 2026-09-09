# Inline interpreter — `inline [interp]`

`inline [interp]` defines **methods** that evaluate a **typed AST wire** produced by `inline [parser]` and semantic schemas. Each AST dispatch target (`CallAdd`, `CallNumber`, …) maps to a method whose parameters carry **`/type`** annotations for decode.

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
| **Role** | Evaluate packed AST wires — walk union nodes, decode fields, run method bodies |
| **Syntax** | `CallAdd(left/s16, right/s16) { return left + right; }` |
| **`/type`** | Required on every parameter of methods invoked from AST (`CallNumber`, `CallAdd`, …) |
| **Helpers** | Internal methods may omit `/type` — called only from other interp methods |
| **Vectors** | `param[]/type`, `[N]/type`, `[N]M/ascii`, `[]~/ascii`, `[N]~/ascii` — see [Vector parameters](#vector-parameters) |
| **Runtime API** | `.myInterp:eval(astWire, <schema>)` → numeric wire (width from assignment LHS) |
| **Env** | `env[name]` inside method bodies for `CallAssign` / `CallVariable` programs |
| **Doc** | `doc(inline.interp)`, `doc(.myInterp)` |

---

## Architecture

```text
inline [parser] .calcLang     →  token/rule grammar, packAst / parse
semantic schemas (<expr>+, …)  →  wire layout (presence mask, bound subtrees)
inline [interp] .calcInterp   →  Call* methods with /type decode + return expr
script: 8wire r = .calcInterp:eval(ast, <expr>)
```

The interpreter engine:

1. Reads the **presence mask** on union schemas (`<expr>+`, `<CallStatement>+`, …).
2. Dispatches the active branch to a **method** on the `inline [interp]` instance.
3. On **first dispatch**, validates each parameter's `/type` against the schema field (memoized per method + schema).
4. **Decodes** wire bits to JavaScript values (`u8`, `s16`, `ascii`, …).
5. Runs the method body (control flow like `inline [canvas]`, plus **`return expr`**).
6. Returns the numeric result encoded to the target wire width.

---

## Method syntax

### Typed AST methods (required `/type`)

```logts-play
inline [interp] .calcInterp {
    CallNumber(value/u8) {
        return value;
    }
    CallAdd(left/s16, right/s16) {
        return left + right;
    }
    CallMul(left/s16, right/s16) {
        return left * right;
    }
}
```

Parameter names must match schema field names (`left`, `right`, `value`, …).

### Internal helpers (no `/type`)

```logts-play
inline [interp] .calcInterp {
    addPair(a, b) {
        return a + b;
    }
    CallAdd(left/s16, right/s16) {
        return addPair(left, right);
    }
}
```

Helpers are **not** valid AST dispatch targets — if the parser emits `-> addPair`, the method must still expose `/type` on every parameter.

### Supported `/type` annotations

| Annotation | Decode |
|------------|--------|
| `u8`, `u16`, … | Unsigned integer |
| `s8`, `s16`, … | Signed integer |
| `ascii` | Fixed ASCII or BVA byte string |
| `bool`, `u1` | Boolean |
| `f32`, `f64`, `fp16`, `bf16` | IEEE floats via `numeric-formats.js` |
| `q4p4`, `q8p8`, … | Fixed-point via `numeric-formats.js` |

### Vector element types

| Annotation | Element decode |
|------------|----------------|
| `values[]/u16`, `flags[]/u1`, … | Count from schema container; element width from `/type` |
| `values[5]/u16`, `text[5]/ascii`, … | **Fixed N** elements; width per element from `/type` |
| `names[]/ascii`, `names[5]/ascii` | One ASCII character per element (8 bits) |
| `names[]8/ascii`, `names[2]10/ascii` | Fixed **M** characters per element (`M×8` bits each) |
| `tags[]~/ascii`, `tags[3]~/ascii` | Null-delimited ASCII strings (`\0` between elements) |

Vectors are **copy-on-entry** (same as `inline [canvas]`): method bodies receive a fresh array and may not mutate wire bits in place.

---

## Vector parameters

Use **`param[]/type`** when a schema field holds many elements. The **`/type`** says how to decode **each element**; the **schema field shape** says where the bits live and how element count is determined.

| Schema field shape | Bit container | Element count |
|--------------------|---------------|---------------|
| Leaf fix (`flags: 32`, `id: bound 64`) | All bits of the field | `fieldWidth / elemWidth` |
| Var-array (`values: 16[1-8]`, `values: 8[n]`) | Var-array segment on the wire | From `varArrayCounts` or available bits (must agree) |
| Bound singular (`msg: bound <S>`) | Payload after 16-bit length prefix | `len(payload) / elemWidth` |
| BVA (`bytes: bound <byte>[1-]`) | One bound substream per element | Number of bound elements |

If the container bit length is not an exact multiple of the element width, or a var-array count does not match available bits, eval **aborts** (`corrupt vector field bit length`).

**Fixed count `[N]`** in the parameter signature overrides element count from the schema. The container must supply exactly **`N × elemWidth`** bits (for `[N]/type` and `[N]M/ascii`). Schema width mismatch → **abort** at first dispatch.

**Null-delimited `~/ascii`** stores concatenated strings in one blob: `str0\0str1\0…`. A single trailing `\0` after the last string does **not** add an extra empty element; `\0\0` at the end **does** (`"a\0\0"` → `["a", ""]`). With **`[N]~/ascii`**, only the first **N** elements are returned; remaining container bits are ignored.

Method bodies use **`vectorLen(arr)`** and **`arr[i]`** (same subset as `inline [canvas]`).

### Var-array sum: `values[]/u16`

Four big-endian `u16` values packed in a `16[1-8]` field (64 bits). Use **`^`** hex groups for fixed-width numeric fields.

```logts-play
<F3hCallSum>:
    values: 16[1-8]
:

inline [interp] .vecInterp {
    F3hCallSum(values[]/u16) {
        total = 0;
        i = 0;
        while (i < vectorLen(values)) {
            total = total + values[i];
            i = i + 1;
        }
        return total;
    }
}

64wire<F3hCallSum> w = ^0001000200030004
8wire result = .vecInterp:eval(w, <F3hCallSum>)
show(result)
```

Expected: **`00001010`** (1+2+3+4 = 10).

### Leaf bit slice: `flags[]/u1`

A fixed **32-bit** leaf decoded as 32 boolean elements. Use a **binary literal** (no `^` prefix — `^` is for hex/octal grouped literals).

```logts-play
<F3hFlags>:
    flags: 32
:

inline [interp] .vecInterp {
    F3hFlags(flags[]/u1) {
        n = 0;
        i = 0;
        while (i < vectorLen(flags)) {
            n = n + flags[i];
            i = i + 1;
        }
        return n;
    }
}

32wire<F3hFlags> w = 10100000000000000000000000000000
8wire result = .vecInterp:eval(w, <F3hFlags>)
show(result)
```

Expected: **`00000010`** (bits 0 and 2 are set → sum = 2).

### BVA bytes → `[]/ascii`

Each bound `<byte>` substream becomes one one-character string. Dynamic-width payloads use **`:=`** on the wire declaration.

```logts-play
<byte>:
    value: 8
:

<F3hBytes>:
    bytes: bound <byte>[1-]
:

inline [interp] .vecInterp {
    F3hBytes(bytes[]/ascii) {
        return vectorLen(bytes);
    }
}

72wire w := 000000000000100001100001000000000000100001100010000000000000100001100011
8wire result = .vecInterp:eval(w, <F3hBytes>)
show(result)
```

Expected: **`00000011`** (three ASCII bytes `a`, `b`, `c`).

### Fixed count: `values[5]/u16`

Exactly **five** `u16` values in an **80-bit** leaf (`5 × 16`).

```logts-play
<F3iU16Five>:
    values: 80
:

inline [interp] .f3iInterp {
    F3iU16Five(values[5]/u16) {
        total = 0;
        i = 0;
        while (i < vectorLen(values)) {
            total = total + values[i];
            i = i + 1;
        }
        return total;
    }
}

80wire<F3iU16Five> w = ^00010002000300040005
8wire result = .f3iInterp:eval(w, <F3iU16Five>)
show(result)
```

Expected: **`00001111`** (1+2+3+4+5 = 15).

### Fixed count shorthand: `text[5]/ascii`

Five one-character ASCII elements (40 bits). Use a **binary literal** (not `^`).

```logts-play
<F3iAsciiFive>:
    text: 40
:

inline [interp] .f3iInterp {
    F3iAsciiFive(text[5]/ascii) {
        return vectorLen(text);
    }
}

40wire<F3iAsciiFive> w = 0110100001100101011011000110110001101111
8wire result = .f3iInterp:eval(w, <F3iAsciiFive>)
show(result)
```

Expected: **`00000101`** (`hello` → five characters).

### Fixed-width strings: `data[2]10/ascii`

Two elements, **10** ASCII characters each (160 bits total).

```logts-play
<F3iStrPair>:
    data: 160
:

inline [interp] .f3iInterp {
    F3iStrPair(data[2]10/ascii) {
        return vectorLen(data);
    }
}

160wire<F3iStrPair> w = 0011000000110001001100100011001100110100001101010011011000110111001110000011100101100001011000100110001101100100011001010110011001100111011010000110100101101010
8wire result = .f3iInterp:eval(w, <F3iStrPair>)
show(result)
```

Expected: **`00000010`** (two fixed 10-character strings).

### Null-delimited variable count: `blob[]~/ascii`

Blob layout: `str0\0str1\0…`. Wire width must match the leaf exactly (104 bits here).

```logts-play
<F3iTextVar>:
    blob: 104
:

inline [interp] .f3iInterp {
    F3iTextVar(blob[]~/ascii) {
        return vectorLen(blob);
    }
}

104wire<F3iTextVar> w = 01100011011001010111011001100001000000000000000001100001011011000111010001100011011001010111011001100001
8wire result = .f3iInterp:eval(w, <F3iTextVar>)
show(result)
```

Expected: **`00000011`** (`ceva`, empty string, `altceva`).

### Null-delimited fixed take: `blob[3]~/ascii`

Same blob rules; **`[3]`** returns only the first three elements (extra bits in the container are ignored).

```logts-play
<F3iTextThree>:
    blob: 144
:

inline [interp] .f3iInterp {
    F3iTextThree(blob[3]~/ascii) {
        return vectorLen(blob);
    }
}

144wire<F3iTextThree> w = 011000110110010101110110011000010000000000000000011000010110110001110100011000110110010101110110011000010000000000000000011000100110110001100001
8wire result = .f3iInterp:eval(w, <F3iTextThree>)
show(result)
```

Expected: **`00000011`** (first three of `ceva`, ``, `altceva`, … — remainder ignored).

---

## Block forms

Colon block:

```logts-play
inline [interp] .lang:

    CallZero() {
        return 0;
    }

:
```

Brace block (equivalent):

```logts-play
inline [interp] .lang {
    CallZero() { return 0; }
}
```

---

## Control flow in method bodies

Same subset as `inline [canvas]`: `if` / `else`, `for`, `while`, `break`, `continue`, `&&` / `||` / `!`, local variables, internal calls, `#` comments, `vectorLen`, `arr[i]`.

Additional: **`return expr`** (required on paths that produce a value).

Loop bodies are capped at **10 000** iterations (same as canvas).

```logts-play
inline [interp] .ops {
    CallClamp(value/s16, lo/s16, hi/s16) {
        if (value < lo) {
            return lo;
        }
        if (value > hi) {
            return hi;
        }
        return value;
    }
}
```

---

## Variable environment (`CallAssign` / `CallVariable`)

Programs with assignments use an internal **`env`** map for the duration of one `:eval` call:

| Method | Behavior |
|--------|----------|
| `CallAssign(name/ascii, value/s16)` | `env[name] = value` via `env[name] = value;` in body |
| `CallVariable(name/ascii)` | `return env[name];` — missing name **aborts** eval |

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

---

## Runtime: `.calcInterp:eval(astWire, <schema>)`

| Argument | Meaning |
|----------|---------|
| `astWire` | Wire holding a packed AST (from `:packAst`, `pr:ast`, field slice, …) |
| `<schema>` | Schema reference (`<expr>`, `<program>`, …) — root union or program shape |

The **assignment LHS width** determines how the numeric result is encoded (unsigned, zero-padded).

### Evaluate a packed expression (42)

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

inline [parser] .calcLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule expression = INT -> CallNumber;
:

inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
}

64wire<expr> ast =: .calcLang:packAst("42", <expr>, "expression")
8wire result = .calcInterp:eval(ast, <expr>)
show(result)
```

Expected output: **`result`** = **`00101010`** (42 in 8 bits).

### Precedence: `1+2*3` → 7

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

inline [parser] .calcLang:
    token INT = [0-9]+;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = term "*" factor -> CallMul | factor;
    rule factor = INT -> CallNumber;
:

inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallMul(left/s16, right/s16) { return left * right; }
}

200wire<expr> ast =: .calcLang:packAst("1+2*3", <expr>, "expression")
8wire result = .calcInterp:eval(ast, <expr>)
show(result)
```

Expected: **`00000111`**.

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

## Parse → eval pipeline

Combine `:parse` with field read and `:eval`:

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

inline [parser] .calcLang:
    token INT = [0-9]+;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = term "*" factor -> CallMul | factor;
    rule factor = INT -> CallNumber;
:

inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallMul(left/s16, right/s16) { return left * right; }
}

4096wire<parseResult> pr =: .calcLang:parse("1+2*3", <expr>, "expression")
8wire result = .calcInterp:eval(pr:ast, <expr>)
show(result)
```

Use `=:` on wide `<parseResult>` wires so the actual parse payload fits without width errors.

---

## Schema ↔ `/type` validation

On the **first runtime dispatch** of each `(method, schema)` pair, the engine checks that `/type` annotations match schema field shapes:

| Schema field | Typical `/type` |
|--------------|-----------------|
| Leaf `value: 8` | `u8`, `s8`, … |
| `bound <expr>` | `s16`, `u32`, `f32`, … |
| `bound <symbol>` (BVA bytes) | `ascii` |
| Leaf / var-array + `values[]/u16` | Element width from `/type`; container from schema |
| Leaf + `values[5]/u16` | Leaf width must equal **5 × 16** bits |
| Leaf + `data[2]10/ascii` | Leaf width must equal **2 × 10 × 8** bits |
| BVA + `bytes[]/ascii` | One decode per bound element |
| `bound <word8>` + `values[]/u8` | Element schema width must match `/type` width |

Mismatch → **abort** (no partial numeric result). The check is **memoized** for subsequent dispatches.

---

## Runtime errors (abort)

Eval stops immediately on:

| Condition | Result |
|-----------|--------|
| Unknown AST method | Error |
| Method missing `/type` on params | Error |
| Undefined `env` variable | Error |
| Division by zero in body | Error |
| Numeric overflow for `/type` | Error |
| Invalid vector index | Error |
| Corrupt / truncated wire vs schema | Error |
| Vector container bit length not multiple of element width | `corrupt vector field bit length` |
| `[N]/type` or `[N]M/ascii` container width mismatch | Abort at dispatch or decode |
| `[N]~/ascii` with fewer than N null-delimited elements | `corrupt vector field bit length` |
| Var-array count inconsistent with available bits | `corrupt vector field bit length` |
| Loop > 10 000 iterations | Error |

Errors surface in the **Output** panel (legacy propagation) or as a thrown runtime error (wave propagation).

---

## Documentation commands

```logts-play
inline [interp] .demo {
    CallInc(x/u8) { return x + 1; }
}
doc(inline.interp)
doc(.demo)
```

---

## Related pages

| Topic | Page |
|-------|------|
| Parser grammar + `:packAst` | [inline-parser.md](inline-parser.md) |
| Schema shapes (`<expr>+`, bound fields) | [semantic-schemas.md](semantic-schemas.md) |
| Canvas-like control flow reference | [inline-canvas.md](inline-canvas.md) |
