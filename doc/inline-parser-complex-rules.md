# Inline parser — complex rules (lookahead, counts & commit)

Advanced **`inline [parser]`** patterns: **rule-level lookahead** (`&` / `!`), **exact/range repetition** (`{n}`, `{n,m}`), and **alternative commit** (`$$`). These extend the baseline grammar features in [inline-parser.md](inline-parser.md).

> **Development feature:** `inline [parser]` is available for experimentation. It is not part of the production language surface yet.

### Running examples (Load / Load & Run)

| Button | What it does |
|--------|----------------|
| **Load** | Copies the script into the editor without running it. Press toolbar **RUN** when ready. |
| **Load & Run** | Copies the script and runs it immediately — check the **Output** panel for `show` results. |

---

## `&` is not logical AND

| Symbol | Meaning |
|--------|---------|
| **`& ( seq )`** | Unary **guard** — the inner sequence must match at the current position (**zero-width**, input is restored after the probe). |
| **`&&` in logic/interp** | Boolean AND on values — **not** used in `rule` patterns. |
| **Combining conditions** | **Sequence** — `A B C` in one alternative means every step must succeed. |

Regex lookahead in `token` patterns (e.g. `(?=…)`) remains **forbidden** — use rule-level `&` / `!` instead.

---

## Positive lookahead `& ( … )`

Probe that the next input matches without consuming it (then continue the sequence).

```logts-play
inline [parser] .assignLang:

    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    token INT = [0-9]+;

    rule stmt
        = $name:ID &("=") "=" $value:INT -> CallAssign;

:

400wire t1 =: .assignLang:parseText("x=9", "stmt")
400wire t2 =: .assignLang:parseText("x", "stmt")
show(t1; ascii)
show(t2; ascii)
```

After **Load & Run**: **`t1`** shows **`CallAssign`** with captures; **`t2`** fails (probe `&("=")` fails on bare `x`).

Lookahead nodes are **omitted** from `:parseText` output — only consumed tokens and `Call*` nodes appear.

---

## Negative lookahead `! ( … )`

Reject an alternative when the inner sequence **would** match from the current position.

```logts-play
inline [parser] .varLang:

    token ID = [a-zA-Z_][a-zA-Z0-9_]*;

    rule stmt = $name:ID !("=") -> CallVariable;

:

400wire ok =: .varLang:parseText("count", "stmt")
400wire bad =: .varLang:parseText("count=1", "stmt")
show(ok; ascii)
show(bad; ascii)
```

After **Load & Run**: **`ok`** parses **`CallVariable`**; **`bad`** fails (`!` rejects when `=` follows the identifier).

---

## Exact and range counts `{n}` / `{n,m}`

Postfix counts on literals, token refs, groups, or rule refs (one quantifier per item).

```logts-play
inline [parser] .eqLang:

    rule header = "="{3} "title";
    rule pad    = "="{1,3} "x";

:

400wire h =: .eqLang:parseText("===title", "header")
400wire p =: .eqLang:parseText("==x", "pad")
400wire nf =: .eqLang:parseText("x", "pad")
show(h; ascii)
show(p; ascii)
show(nf; ascii)
```

After **Load & Run**: **`h`** and **`p`** succeed; **`nf`** fails (no leading `=` run before `x`).

---

## Rule reference probes `&(rule)` / `!(rule)`

Complex probes use a **named helper rule**. The same rule may include **`-> Call*`** and captures — those are **ignored during the probe** and apply only when the rule is parsed for real afterward.

```logts-play
<byte>:
    value: 8
:

<CallNumber>:
    value: 8
:

<CallSuffix>:
    value: bound <CallNumber>
:

<CallFunction>:
    name: 40
    arg: bound <CallNumber>
:

<CallVariable>:
    name: 40
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallFunction?: bound <CallFunction>
    CallVariable?: bound <CallVariable>
:

inline [parser] .callLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule callSuffix = "(" INT ")" -> CallSuffix;

    rule value
        = $name:ID &(callSuffix) callSuffix -> CallFunction
        | $name:ID -> CallVariable;

    rule expression = value | INT -> CallNumber;

:

4096wire<parseResult> prFn =: .callLang:parse("foo(7)", <expr>, "expression")
4096wire<parseResult> prId =: .callLang:parse("bar", <expr>, "expression")
show(prFn; <parseResult>)
show(prId; <parseResult>)
```

After **Load & Run**: **`prFn`** envelope **`ok = 1`** with **`CallFunction`**; **`prId`** with **`CallVariable`**.

Pattern **`ID &(callSuffix) callSuffix`**: consume the identifier, probe that a parenthesized argument list follows, then parse **`callSuffix`** for the AST.

---

## `:packAst` and wire AST

Lookahead probes do **not** appear in packed AST wires — only consumed structure is serialized.

```logts-play
<CallAssign>:
    name: 40
    value: 8
:

<stmt>+:
    CallAssign?: bound <CallAssign>
:

inline [parser] .packLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule stmt = $name:ID &("=") "=" $value:INT -> CallAssign;

:

64wire<stmt> ast =: .packLang:packAst("k=4", <stmt>, "stmt")
show(ast; <stmt> ascii)
```

After **Load & Run**: **`64wire<stmt>`** is populated; show expands the packed **`CallAssign`** tree (probe `&("=")` is not stored in the wire).

---

## Alternative commit `$$`

After **`$$`**, the current **`|`** alternative is **frozen**: a later failure does **not** backtrack to sibling alternatives. The input cursor stays at the failure point (prefix already consumed).

| Phase | Backtrack on `\|` siblings? |
|-------|----------------------------|
| Before **`$$`** | Yes — normal ordered choice (**D1110**) |
| After **`$$`** | **No** — fatal error at current offset |

**`$$`** is **zero-width** (like lookahead) and is **omitted** from `:parseText` / packed AST.

### While vs assignment (no absurd backtrack)

```logts-play
<CallWhile>:
    cond: 40
:

<CallAssign>:
    name: 40
    value: 8
:

<stmt>+:
    CallWhile?: bound <CallWhile>
    CallAssign?: bound <CallAssign>
:

inline [parser] .stmtLang:

    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    token INT = [0-9]+;

    rule expr = ID | INT;

    rule assignment
        = $name:ID "=" $value:expr ";" -> CallAssign;

    rule statement
        = "while" "(" $$ expr ")" ";" -> CallWhile
        | assignment;

:

4096wire<parseResult> prOk =: .stmtLang:parse("count = 5;", <stmt>, "statement")
4096wire<parseResult> prBad =: .stmtLang:parse("while ( x {", <stmt>, "statement")
show(prOk; <parseResult>)
show(prBad; <parseResult>)
```

After **Load & Run**: **`prOk`** is **`CallAssign`**; **`prBad`** is **`ok = 0`** with error at **`{`** — the **`assignment`** branch is **not** attempted after commit.

### Commit blocks misleading `|` retry

```logts-play
<CallX>:
    value: 8
:

<CallY>:
    value: 8
:

<stmt>+:
    CallX?: <CallX>
    CallY?: <CallY>
:

inline [parser] .xLang:

    token INT = [0-9]+;

    rule stmt
        = "X" $$ INT ";" -> CallX
        | INT ";" -> CallY;

:

4096wire<parseResult> prGood =: .xLang:parse("X 9;", <stmt>, "stmt")
4096wire<parseResult> prBad =: .xLang:parse("X = 1;", <stmt>, "stmt")
show(prGood; <parseResult>)
show(prBad; <parseResult>)
```

After **Load & Run**: **`X 9;`** → **`CallX`**; **`X = 1;`** → **`ok = 0`** (would match **`CallY`** without **`$$`**, but commit forbids that).

### Helper rule with embedded `$$`

Commit in a **referenced** rule applies to the **caller’s** alternative:

```logts-play
<CallWhile>:
    value: 8
:

<CallOther>:
    value: 8
:

<stmt>+:
    CallWhile?: bound <CallWhile>
    CallOther?: <CallOther>
:

inline [parser] .headLang:

    token INT = [0-9]+;

    rule whileHead = "while" "(" $$ ;

    rule stmt
        = whileHead INT ")" ";" -> CallWhile
        | INT ";" -> CallOther;

:

4096wire<parseResult> pr =: .headLang:parse("while ( 2 ) ;", <stmt>, "stmt")
4096wire<parseResult> prFail =: .headLang:parse("while ( {", <stmt>, "stmt")
show(pr; <parseResult>)
show(prFail; <parseResult>)
```

### `:packAst` with commit

```logts-play
<CallWhile>:
    value: 8
:

<CallAssign>:
    name: 40
    value: 8
:

<stmt>+:
    CallWhile?: bound <CallWhile>
    CallAssign?: bound <CallAssign>
:

inline [parser] .packWhileLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule stmt
        = "while" "(" $$ INT ")" ";" -> CallWhile
        | $name:ID &("=") "=" $value:INT ";" -> CallAssign;

:

64wire<stmt> ast =: .packWhileLang:packAst("while (3);", <stmt>, "stmt")
show(ast; <stmt> ascii)
```

After **Load & Run**: wire populated with packed **`CallWhile`**; **`$$`** is not stored in the wire.

---

## Invalid patterns (elaboration errors)

The assembler rejects:

| Pattern | Reason |
|---------|--------|
| `rule test = test;` | Self-reference without progress |
| `rule test = !(test);` | Lookahead referencing the same rule |
| `!( &(…))` | Nested lookahead |
| `& ( $x:ID )` | Capture inside lookahead parentheses |
| `&("=")+` | Quantifier on the lookahead atom |
| `"="{3}+` | Multiple quantifiers on one item |
| `test = !(a); a = !(test);` | Circular **lookahead-ref** graph |
| `"a" $$ $$ "b"` | Multiple **`$$`** in one alternative |
| `&( $$ ID )` | **`$$`** inside lookahead |

Use **ordered choice + backtrack** (documented in [inline-parser.md](inline-parser.md)) when it already expresses the grammar — for example existing **`.calcLang`** and REPL **`.replLang`** grammars keep their backtrack-based disambiguation.

---

## Quick reference

| Feature | Syntax | Consumes input? |
|---------|--------|----------------|
| Positive lookahead | `& ( … )` | No (probe only) |
| Negative lookahead | `! ( … )` | No (probe only) |
| Exact repeat | `"="{20}`, `ID{2}` | Yes (when not in probe) |
| Range repeat | `"="{1,3}` | Yes (greedy max→min) |
| Rule probe | `&(helperRule)` | No (probe only) |
| Alternative commit | `$$` | No (marker only) |

See also: [inline-parser.md](inline-parser.md) · [semantic-schemas.md](semantic-schemas.md)
