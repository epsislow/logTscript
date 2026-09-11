# Component interpreter — `onabort` handlers

`onabort` methods live in the same `inline [interp]` program as your AST helpers. When a **`comp [interp]`** run aborts at runtime, the engine builds structured **`errorInfo`**, invokes your handlers **in file order**, optionally **commits pout buffer** updates from successful handlers, then prints a uniform error block and stops the script.

Method syntax, `/type`, and `push`/`remove` are documented in [inline-interp.md](inline-interp.md). Component wiring (`pin`, `pout`, exec block) is in [comp-interp.md](comp-interp.md).

> **Development feature:** `inline [parser]`, `inline [interp]`, and `comp [interp]` are available for experimentation in current builds. They are **not** part of the production language surface yet.

### Running examples (Load / Load & Run)

Runnable blocks use the `logts-play` format. Each block shows two buttons in the documentation viewer:

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor **without** running it. Inspect or edit, then press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script and runs it immediately — check the **Output** panel for results and error lines. |

Use **`on: 1`** on the component so the first run executes when **`set = 1`**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Keyword** | **`onabort Name(...)`** — not available under **`.module:eval(...)`** |
| **Arity** | **0, 1, or 2** parameters — more than two is an elaboration error |
| **Param 0** | *(none)* — handler runs with no arguments |
| **Param 1** | Human-readable error message (same text as **`Error:`** line) |
| **Param 2** | Read-only **`errorInfo`** object — see [errorInfo fields](#errorinfo-fields) |
| **`return;`** | Allowed — early exit from the handler body |
| **`return expr`** | Elaboration error |
| **Handler scope** | May call internal helpers and use **`push` / `remove` / `removeall`** on pout channels |
| **After handlers** | Script still **stops** (failed run); pouts commit **only if every** invoked handler completes |
| **Abort inside handler** | **No** pout commit (including partial pushes in that handler) |
| **Display** | Uniform block: **`Error:`** + all **`errorInfo`** fields — see [Error output](#error-output) |

---

## Handler declaration

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

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallVariable>:
    name: bound <symbol>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallAdd?:      bound <CallAdd>
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
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = term "*" factor -> CallMul | factor;
    rule factor = "(" expression ")" | INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .calcAbort {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallAssign(name/ascii, value/s16) { env[name] = value; return value; }
    CallVariable(name/ascii) { return env[name]; }
    onabort setErr(msg, info) {
        push errCode: info["kindCode"];
    }
}

comp [interp] .calcAbortComp:
    on: 1
    astSchema = .program
    .calcAbort { }
    pout errCode/u16 as errOut
    :

148wire<program> prog = .calcLang:packAst("x=z;", <program>, "program")
16wire errWire = 0000000000000000
1wire run = 1

.calcAbortComp:{
    ast = prog
    errOut >= errWire
    set = run
}

show(errWire)
```

**Load & Run** → script aborts (`undefined variable 'z'`). Output includes the **`Error:`** block and **`kindCode: 5`**. Handler **`setErr`** runs and **`errWire`** becomes **`0000000000000101`** (5) even though the run failed.

---

## Arity examples

### Zero parameters

Use when you only need side effects that do not depend on the message or metadata (for example clearing a status channel):

```logts
onabort clearStatus() {
    push status: 0;
    return;
}
```

### One parameter — message only

```logts
onabort logMsg(msg) {
    push logLine: 1;
}
```

The engine passes the same string shown after **`Error:`**.

### Two parameters — message + errorInfo

```logts
onabort filter(msg, info) {
    if (info["kindCode"] == 5) {
        push errCode: info["kindCode"];
    }
}
```

Parameter names are yours; the second argument is always the structured object below.

---

## errorInfo fields

Every field is **always present** in the object passed to param 2 (read-only). Use bracket access: **`info["kindCode"]`**.

| Field | Type | Meaning |
|-------|------|---------|
| **`kindCode`** | int ≥ 1 | Numeric category — see [kindCode table](#kindcode-table) |
| **`kind`** | ascii | Short category name matching **`kindCode`** |
| **`line`** | int | Line in the inline body where the error was detected (`0` if N/A) |
| **`method`** | ascii | Method executing when the error occurred (AST tag or helper name) |
| **`call`** | ascii | Active AST dispatch tag (`""` if outside AST dispatch) |
| **`callNr`** | int | 1-based index of AST dispatch in this eval (`0` if N/A) |
| **`nodeText`** | ascii | Lowercase AST path segments separated by **`:`**, prefixed with **`root`** |
| **`compName`** | ascii | **`comp [interp]`** instance name (`""` under **`:eval`**) |

When the error happens **inside** an **`onabort`** handler, **`call`** is **`onabort`**, **`callNr`** is the 1-based handler index, **`method`** is the handler name, and **`nodeText`** is **`""`**.

---

## kindCode table

| kindCode | kind | Typical cause |
|----------|------|----------------|
| **1** | `genericError` | Fallback when no specific mapping applies |
| **2** | `astValidationError` | AST wire validation (`ast binary is invalid for schema …`) |
| **3** | `missingAstMethod` | Schema node with no matching AST method |
| **4** | `missingTypeAnnotation` | AST method param missing **`/type`** |
| **5** | `undefinedVariable` | Unknown variable in inline body |
| **6** | `divisionByZero` | Division by zero |
| **7** | `overflow` | Numeric overflow for **`/type`** |
| **8** | `vectorIndex` | Vector index out of range |
| **9** | `corruptWire` | Inconsistent wire decode |
| **10** | `corruptVector` | Vector bit length / count mismatch |
| **11** | `loopLimit` | Loop iteration cap exceeded |
| **12** | `missingHelper` | Call to unknown internal helper |
| **13** | `pushTypeMismatch` | **`push`** encode failed for pout channel |
| **14** | `notIndexable` | Index operation on non-vector |

---

## Error output

Every runtime abort prints the same fixed field order in **Output**:

```text
Error: undefined variable 'z' (line 15)
kindCode: 5
kind: undefinedVariable
line: 15
method: CallVariable
call: CallVariable
callNr: 2
nodeText: root:callassign:callvariable
compName: .calcAbortComp
```

This format is used with or without **`onabort`** handlers and matches the second parameter object when arity is 2.

---

## Multiple handlers (file order)

Handlers run **top to bottom**. Each may **`push`** different pout channels; later handlers overwrite the same channel in the pending buffer.

### Runnable — two handlers (chain)

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

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallVariable>:
    name: bound <symbol>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallAdd?:      bound <CallAdd>
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
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = term "*" factor -> CallMul | factor;
    rule factor = "(" expression ")" | INT -> CallNumber | $name:ID -> CallVariable;
:

inline [interp] .calcChain {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallAssign(name/ascii, value/s16) { env[name] = value; return value; }
    CallVariable(name/ascii) { return env[name]; }
    onabort first(msg, info) {
        push errCode: info["kindCode"];
    }
    onabort second(msg) {
        push errCode: 99;
    }
}

comp [interp] .chainComp:
    on: 1
    astSchema = .program
    .calcChain { }
    pout errCode/u16 as errOut
    :

148wire<program> prog = .calcLang:packAst("x=z;", <program>, "program")
16wire errWire = 0000000000000000
1wire run = 1

.chainComp:{
    ast = prog
    errOut >= errWire
    set = run
}

show(errWire)
```

**Load & Run** → **`errWire`** = **`0000000001100011`** (99) because **`second`** overwrites **`first`**.

---

## Abort inside a handler — no commit

If a handler throws (for example undefined variable **after** a **`push`**), **no** pout values are committed — not from the failing handler, not from earlier handlers, not from the main AST body.

Define a handler that pushes then fails:

```logts
onabort failAfterPush(msg, info) {
    push errCode: info["kindCode"];
    x = missingVar;
}
```

Wires connected to pouts keep their values from **before** the exec block.

---

## Internal helper calls

Handlers may call other methods in the same **`inline [interp]`** program:

```logts-play
inline [interp] .calcHelp {
    CallVariable(name/ascii) { return env[name]; }
    bumpCode(code/u16) { push errCode: code; }
    onabort viaHelper(msg, info) {
        bumpCode(info["kindCode"]);
    }
}
```

---

## `:eval` restriction

An `inline [interp]` that declares **`onabort`** sets **`requiresCompContext`**. **`.calcAbort:eval(...)`** is rejected at elaboration — use **`comp [interp]`** for error pouts.

Inline with only AST methods (no **`push`**, no **`onabort`**) still works with **`:eval`**.

---

## Commit behaviour summary

| Situation | Pout commit? | Script stops? |
|-----------|--------------|---------------|
| Abort, no handlers | No | Yes |
| Abort, all handlers OK | Yes (buffer from body + handlers) | Yes |
| Abort inside handler | No | Yes |
| Successful run | Yes | No |

---

## Related pages

- [comp-interp.md](comp-interp.md) — `comp [interp]` wiring, pins, pouts, `push`
- [inline-interp.md](inline-interp.md) — method syntax, `/type`, vectors
- [inline-parser.md](inline-parser.md) — building AST wires with **`packAst`**
- [semantic-schemas.md](semantic-schemas.md) — schema layout and union tags
