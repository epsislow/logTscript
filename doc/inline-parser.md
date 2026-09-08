# Inline parser — `inline [parser]`

`inline [parser]` defines a **grammar** for a custom language: lexical **tokens** and syntactic **rules**. It is a **definition only** — the grammar is stored at load time and can be inspected with `doc()`. Runtime parsing via `:parse()` is wired separately when the parse engine is available.

In the **documentation viewer**, blocks marked `logts-play` open in the script editor with **Load** and **Load & Run**.

---

## Quick reference

| Topic | Summary |
|-------|---------|
| **Role** | Definition layer — `token` and `rule` declarations |
| **Keywords** | `token`, `rule` |
| **Block forms** | `inline [parser] .name:` … `:` or `inline [parser] .name { … }` |
| **Comments** | `#` to end of line |
| **Captures** | `$name:Symbol` — binds a matched subtree (token or rule) |
| **Calls** | `-> CallName` at end of a rule alternative (for interpreter dispatch) |
| **Runtime parse** | `.lang:parseText(source)` — parse source text with the stored grammar (see [Parse engine](#parse-engine)) |
| **Doc** | `doc(inline.parser)`, `doc(.myLang)` |

---

## Architecture

```text
inline [parser] .calcLang          (definition — tokens + rules)
  token INT = [0-9]+;
  rule program = statement+;
  ...
```

The assembler validates the grammar at load time: unique names, token/rule name disjointness, regex subset for tokens, and symbol references inside rules.

---

## Declaration — colon form

```logts-play
inline [parser] .calcLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule program = statement+;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | ID  -> CallVariable;

:
```

| Rule | Detail |
|------|--------|
| **Kind** | `inline [parser]` |
| **Name** | Dot reference (e.g. `.calcLang`) |
| **End (colon form)** | Closing `:` on its own line |
| **Body** | Only `token` and `rule` declarations |

---

## Declaration — brace form

The same grammar can use braces instead of a trailing colon block:

```logts-play
inline [parser] .mini {
    token NUM = [0-9]+;
    rule main = NUM -> CallNum;
}
```

Both forms produce the same stored grammar structure.

---

## Token declarations

```logts-play
inline [parser] .lexer:

    token INT    = [0-9]+;
    token ID     = [a-zA-Z_][a-zA-Z0-9_]*;
    token STAR   = \\*;
    token PLUS   = \\+;
    token DOT    = [.];
    token LINE   = [^\\n]*;

:
```

### Token regex rules

| Allowed | Not allowed |
|---------|-------------|
| Character classes `[…]` and negated `[^…]` | Wildcard `.` (use `[.]`) |
| Quantifiers `+` `*` `?` `{n}` `{n,m}` | Lookahead `(?=…)` `(?!…)` |
| Alternation `\|` | Backreferences `\1` `\2` |
| Grouping `(…)` | Regex flags `/i` or `(?i)` |
| Escapes `\\` `\*` `\+` `\?` `\|` `\[` `\]` … | |

---

## Rule declarations

A rule lists **alternatives** separated by `|`. Each alternative is a **sequence** of pattern elements, optionally ending with `-> CallName`.

```logts-play
inline [parser] .rules:

    token ID = [a-z]+;

    rule greeting
        = "hello" ID -> CallHello
        | "bye" ID   -> CallBye;

:
```

### Pattern elements

| Element | Example | Meaning |
|---------|---------|---------|
| Token / rule ref | `INT`, `expression` | Match named token or rule |
| String literal | `"+"`, `";"` | Match exact text |
| Capture | `$name:ID` | Bind matched `ID` as `name` |
| Group | `( A B )` | Group sub-sequence |
| Quantifier | `statement+`, `item*`, `opt?` | Repeat previous element |

Sequences are written by **juxtaposition** (no comma separator): `ID "=" expression ";"`.

---

## Stratified precedence (layered rules)

Operator precedence is expressed by **splitting levels** into separate rules — not by reordering `|` inside one expression rule.

```logts-play
inline [parser] .prec:

    token INT = [0-9]+;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber;

:
```

Input `1 + 2 * 3` is structured as `CallAdd(1, CallMul(2, 3))` because `*` lives in `term` and `+` in `expression`.

---

## Alternative selection behavior

When several alternatives could apply, the parser engine (when active) uses **ordered choice**:

1. Alternatives in one rule are tried **top to bottom**.
2. The **first alternative that matches completely** wins.
3. If alternative *N* fails after partial consumption, parsing **backtracks** and tries *N+1*.

Put **more specific patterns first**:

```logts-play
inline [parser] .values:

    token ID = [a-zA-Z_][a-zA-Z0-9_]*;

    rule value
        = ID "(" expression ")" -> CallFunction
        | ID -> CallVariable;

    rule expression = value;

:
```

| Input | Result |
|-------|--------|
| `foo(1)` | `CallFunction` — first alternative |
| `foo` | `CallVariable` — first fails at `(`, second succeeds |

### Statement disambiguation with backtrack

```logts-play
inline [parser] .stmts:

    token ID = [a-zA-Z_][a-zA-Z0-9_]*;

    rule expression = ID;

    rule assignStmt = ID "=" expression ";";
    rule exprStmt   = expression ";";

    rule statement = assignStmt | exprStmt;

:
```

| Input | Matching rule |
|-------|----------------|
| `x = 1;` | `assignStmt` |
| `x;` | `exprStmt` (after `assignStmt` fails at `=`) |

---

## Captures and interpreter calls

Captures use **`$field:Symbol`** where `Symbol` is a **token** or **rule** name. The `-> CallName` suffix names an interpreter method (one per alternative when present).

```logts-play
inline [parser] .assign:

    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    token INT = [0-9]+;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor = INT -> CallNumber | ID -> CallVariable;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule program = statement+;

:
```

---

## Name rules

| Rule | Error when violated |
|------|---------------------|
| Token names unique | Duplicate `token` name |
| Rule names unique | Duplicate `rule` name |
| Token ∩ rule = ∅ | Same identifier as both `token` and `rule` |
| References defined | Unknown symbol in a rule pattern |

---

## Comments

```logts-play
inline [parser] .c:
    # full-line comment
    token T = [a-z]+;  # trailing comment
    rule r = T;
:
```

---

## Inspecting with doc()

```logts-play
inline [parser] .demo:
    token N = [0-9]+;
    rule main = N -> CallNum;
:

doc(inline.parser)
doc(.demo)
```

`doc(inline.parser)` prints the grammar surface syntax template.  
`doc(.demo)` prints token/rule counts, rule names, and alternative summaries for that instance.

---

## Minimal empty grammar

```logts-play
inline [parser] .empty:
:
```

An empty body is valid — zero tokens and zero rules.

---

## Common errors

| Situation | Result |
|-----------|--------|
| Unknown inline kind `[parse]` | Parse error at script level |
| Duplicate token/rule name | Assembler error with line |
| `token X` and `rule X` same name | Assembler error |
| Wildcard `.` in token regex | Assembler error — use `[.]` |
| Empty rule alternative | Assembler error |
| Unknown symbol in rule | Assembler error |

---

## Parse engine

After a grammar is loaded, the **parse engine** reads source text with the declared **tokens** and **rules**, and builds an internal **parse tree** (a structured match result). This tree is an implementation detail used when assembling typed AST wires elsewhere; it is exposed for inspection via **`:parseText`**.

### Pipeline

```text
source text
    │
    ▼
lexer (token regexes, skip whitespace, longest match)
    │
    ▼
recursive-descent parser (ordered choice + backtrack)
    │
    ▼
parse tree (internal)
```

| Stage | Behaviour |
|-------|-----------|
| **Lexer** | Skips spaces, tabs, and newlines between tokens. On conflict, **longest match** wins; equal length uses token declaration order. |
| **Rules** | Alternatives `\|` are tried top-to-bottom; first full match wins; partial failures **backtrack**. |
| **Left recursion** | Patterns like `expression = expression "+" term \| term` run as an internal loop (left-associative folds), not as infinite recursion. |
| **Strict parse** | Success requires the **entire** input to be consumed. Trailing text → syntax error. |
| **`-> CallName`** | Creates a `call` node. Name is kept **as written** (e.g. `CallAdd`, not shortened). |
| **No `->`** | **Passthrough** — the matched child subtree is returned without a wrapper (e.g. `\| term`, parentheses). |
| **`$field:Symbol`** | Stored under `captures` on the enclosing `call` node. |
| **`rule+` / `*`** | `{ kind: "repeat", quant: "+", items: [...] }` (or `"*"` — may be empty). |
| **`rule?`** | `{ kind: "optional", present: true/false, value: ... }`. |

### Inspecting with `:parseText`

**Load** loads the grammar. **Load & Run** parses sample strings and prints the tree via `show()`.

Start rule defaults to the **first `rule`** in the grammar. Pass a second argument to override:

```logts-play
inline [parser] .calcLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule program = statement+;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | ID  -> CallVariable;

:

show(.calcLang:parseText("n=1+2*3;"))
```

Expected tree (abbreviated):

```text
repeat(+):
  call CallAssign:
    $name:
      token ID "n"
    $value:
      call CallAdd:
        left:
          call CallNumber: value "1"
        right:
          call CallMul:
            left: call CallNumber: value "2"
            right: call CallNumber: value "3"
```

### Precedence — expression only

Use a **start rule** argument to parse a fragment:

```logts-play
inline [parser] .calcLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule program = statement+;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | ID  -> CallVariable;

:

show(.calcLang:parseText("1+2*3", "expression"))
```

Root call is **`CallAdd`**; the right child is **`CallMul`** (`1 + (2 * 3)`).

### Passthrough — no wrapper without `->`

Alternatives without `->` return the inner subtree directly. Parentheses do not create a node:

```logts-play
inline [parser] .calcLang:

    token INT = [0-9]+;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber;

:

show(.calcLang:parseText("(1+2)", "expression"))
```

The tree is a **`CallAdd`** — no `Parens` or `expression` wrapper.

### Ordered choice and backtrack

```logts-play
inline [parser] .stmts:

    token ID = [a-zA-Z_][a-zA-Z0-9_]*;

    rule expression = ID;

    rule assignStmt = ID "=" expression ";";
    rule exprStmt   = expression ";";

    rule statement = assignStmt | exprStmt;

:

show(.stmts:parseText("x=x;", "statement"))
show(.stmts:parseText("x;", "statement"))
```

Both succeed. The first matches **`assignStmt`**; the second tries **`assignStmt`**, fails at `"="`, backtracks to **`exprStmt`**.

### Quantifiers — `program = statement+`

```logts-play
inline [parser] .calcLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule program = statement+;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor = INT -> CallNumber;

:

show(.calcLang:parseText("a=1;b=2;"))
```

Root is **`repeat(+)`** with **two** `CallAssign` items.

### Parse errors

| Situation | Result |
|-----------|--------|
| Unrecognized character (e.g. `@`) | `parse error (lex at …)` |
| Incomplete input (e.g. `x=`) | `parse error (syntax at …)` |
| Trailing garbage (e.g. `1+2 xxx`) | `parse error (syntax at …)` — strict consume |

```logts-play
inline [parser] .mini:
    token INT = [0-9]+;
    rule main = INT -> CallNumber;
:

show(.mini:parseText("@"))
show(.mini:parseText("1+2 xxx"))
```

---

## Related pages

| Page | Topic |
|------|-------|
| [doc-function.md](doc-function.md) | `doc(inline.parser)`, `doc(.name)` |
| [inline-logic.md](inline-logic.md) | Another inline definition kind |
| [inline-canvas.md](inline-canvas.md) | Inline methods pattern |
