# Calculator REPL — parser + interpreter E2E

End-to-end **floating-point** REPL: `inline [parser] .replLang` → `comp [interp] .replCalc` → [terminal.md](terminal.md) output. Variables (`x=3`, then `x+4`) persist in `keysStore` / `valsStore` (16 slots, 5-character ASCII names).

**Wave propagation** (`logts-play wave`): keyboard echo, Enter evaluation, and **R** reset use **property blocks** + `comp [osc] .poll` deferred `on:1` steps (same pattern as [network-chat.md](network-chat.md)).

**Suite tests:** **5311–5312** (assign persist), **5313–5314** (precedence), **5315–5316** (power `^`), **5317** (keyboard + terminal), **5318** (reset key + variable clear).

---

## Pipeline

| Stage | Piece |
|-------|--------|
| Lex/parse | [inline-parser.md](inline-parser.md) — `.replLang:packAst(src, <replLine>, "line")` |
| AST | Semantic schemas `<replLine>`, `<expr>`, `CallAdd`, … |
| Eval | [comp-interp.md](comp-interp.md) — `.replCalc` pins `varsLen`, vector `keysIn` / `valsIn` |
| Format | `NUM2T(replResult, digits3; f64)` — see [number-conversion.md](number-conversion.md) |
| UI | [keyboard.md](keyboard.md) + [sock.md](sock.md) `lineBuf` + [terminal.md](terminal.md) |

**Grammar highlights:** `+`, `-`, `*`, `/`, `^` (power via interpreter `^` → `Math.pow`), parentheses, `-` unary, assign `name=expr`, variables up to 5 letters.

---

## Wave control flow

1. **Type** — `.term` echoes printable keys; `lineBuf << .kbd` accumulates bytes ([network-chat.md](network-chat.md) input buffer pattern).
2. **Enter** — `.evalLatch` property block (not `on:raise`) latches `wantEval`.
3. **Osc poll** — `on:1 { AND(.poll:get, wantEval), … packAst … runRepl }` then `.replCalc`, then `NUM2T` + terminal append on later poll ticks.
4. **Reset R** — property blocks clear terminal / latch; `.resetPending` survives until `.poll:get` clears stores (`resetDone` defers pending clear so `on:1` reset body runs first).

---

## Runnable demo (complete script)

Focus **REPL** keyboard, type `2+3`, press **Enter**, see `5` on the terminal. **R** clears variables and screen.

```logts-play wave
<byte>:
    value: 8
:
<CallNumber>:
    value: 64
:
<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:
<CallMul>:
    left:  bound <expr>
    right: bound <expr>
:
<CallSub>:
    left:  bound <expr>
    right: bound <expr>
:
<CallDiv>:
    left:  bound <expr>
    right: bound <expr>
:
<CallPow>:
    left:  bound <expr>
    right: bound <expr>
:
<CallNeg>:
    value: bound <expr>
:
<CallVariable>:
    name: 40
:
<CallAssign>:
    name: 40
    value: bound <expr>
:
<CallExprWrap>:
    value: bound <expr>
:
<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallNeg?:      bound <CallNeg>
    CallAdd?:      bound <CallAdd>
    CallSub?:      bound <CallSub>
    CallMul?:      bound <CallMul>
    CallDiv?:      bound <CallDiv>
    CallPow?:      bound <CallPow>
:
<replLine>+:
    CallAssign?:    bound <CallAssign>
    CallExprWrap?:  bound <CallExprWrap>
:

inline [parser] .replLang:
    token NUMBER = [0-9]+([.][0-9]*)?;
    token ID = [a-zA-Z][a-zA-Z0-9]*;

    rule line = assign | exprWrap;
    rule assign = $name:ID "=" $value:expression -> CallAssign;
    rule exprWrap = expression -> CallExprWrap;

    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;

    rule term
        = term "*" power -> CallMul
        | term "/" power -> CallDiv
        | power;

    rule power
        = factor "^" power -> CallPow
        | factor;

    rule factor
        = "-" factor -> CallNeg
        | "(" expression ")"
        | $text:NUMBER -> CallNumber
        | $name:ID -> CallVariable;
:

inline [interp] .replInterp {
    lookupVar(name/ascii) {
        i = 0;
        while (i < varsLen) {
            if (keysIn[i] == name) {
                return valsIn[i];
            }
            i = i + 1;
        }
        return 0;
    }
    hasVar(name/ascii) {
        i = 0;
        while (i < varsLen) {
            if (keysIn[i] == name) {
                return 1;
            }
            i = i + 1;
        }
        return 0;
    }
    setVar(name/ascii, val/f64) {
        i = 0;
        while (i < varsLen) {
            if (keysIn[i] == name) {
                valsIn[i] = val;
                push varsLenOut: varsLen;
                push varKeysOut: keysIn;
                push varValsOut: valsIn;
                push isAssign: 1;
                push assignName: name;
                push result: val;
                return val;
            }
            i = i + 1;
        }
        if (varsLen >= 16) {
            z = 1 / 0;
        }
        keysIn[varsLen] = name;
        valsIn[varsLen] = val;
        varsLen = varsLen + 1;
        push varsLenOut: varsLen;
        push varKeysOut: keysIn;
        push varValsOut: valsIn;
        push isAssign: 1;
        push assignName: name;
        push result: val;
        return val;
    }
    finishExpr(val/f64) {
        push isAssign: 0;
        push assignName: "";
        push result: val;
        return val;
    }
    CallNumber(value/f64) {
        return finishExpr(value);
    }
    CallVariable(name/ascii) {
        if (hasVar(name) == 0) {
            z = 1 / 0;
        }
        return finishExpr(lookupVar(name));
    }
    CallNeg(value/f64) {
        return finishExpr(0 - value);
    }
    CallAdd(left/f64, right/f64) {
        return finishExpr(left + right);
    }
    CallSub(left/f64, right/f64) {
        return finishExpr(left - right);
    }
    CallMul(left/f64, right/f64) {
        return finishExpr(left * right);
    }
    CallDiv(left/f64, right/f64) {
        return finishExpr(left / right);
    }
    CallPow(left/f64, right/f64) {
        return finishExpr(left ^ right);
    }
    CallAssign(name/ascii, value/f64) {
        return setVar(name, value);
    }
    CallExprWrap(value/f64) {
        return finishExpr(value);
    }
}

comp [interp] .replCalc:
    on: 1
    astSchema = .replLine
    .replInterp { }
    pin varsLenIn/u8 as varsLen
    pin varKeys[16]5/ascii as keysIn
    pin varVals[16]/f64 as valsIn
    pout varsLenOut/u8 as varsLenOut
    pout varKeysOut[16]5/ascii as keysOut
    pout varValsOut[16]/f64 as valsOut
    pout result/f64 as resultOut
    pout isAssign/u1 as isAssignOut
    pout assignName/ascii as assignNameOut
    :

MODE WIREWRITE

comp [keyboard] .kbd:
  label: 'REPL'
  allowEnter
  allowBackspace
  on: 1
  :

comp [key] .reset:
  label: 'R'
  type: 0
  on: 1
  nl
  :

comp [terminal] .term:
  rows: 16
  columns: 48
  cursorStyle: 1
  color: ^0f0
  on: 1
  nl
  :

comp [reg] .evalLatch:
  depth: 1
  on: 1
  :

comp [reg] .resetPending:
  depth: 1
  on: 1
  :

comp [osc] .poll:
  on: 1
  :

sock lineBuf

1wire isEnter = EQ(.kbd:get, ^0a)
1wire isBack = EQ(.kbd:get, ^08)
1wire kbdChar = AND(.kbd:valid, NOT(isEnter))

.term:{
  append = .kbd:get
  set = kbdChar
}

on:1 {
  kbdChar,
  lineBuf << .kbd
}

.term:{
  backDelete = \1
  set = AND(.kbd:valid, isBack)
}

8wire varsLenStore := 0
40wire[16] keysStore = \0;640
64wire[16] valsStore = \0;1024

64wire replResult := 0
1wire replIsAssign := 0
40wire replAssignName := 0
11wire digits3 = \3;11
4096wire<replLine> prog = \0;4096
512wire lineSrc
512wire lineTrim
8wire resultText := 0
1wire runRepl := 0
1wire showResult := 0
1wire showDone := 0
1wire evalDone := 0
1wire wantEval = .evalLatch:get
1wire resetDone := 0

.evalLatch:{
  data = 1
  set = AND(.kbd:valid, isEnter, GT(BITSIZE(lineBuf), 0))
}

.evalLatch:{
  data = 0
  set = .reset
}

.resetPending:{
  data = 1
  set = .reset
}

.term:{
  newline = 1
  set = AND(.kbd:valid, isEnter, GT(BITSIZE(lineBuf), 0))
}

.term:{
  clear = 1
  set = .reset
}

on:1 {
  AND(.poll:get, .resetPending:get),
  varsLenStore =: 0,
  keysStore = \0;640,
  valsStore = \0;1024,
  lineBuf << clear,
  resetDone = 1
}

.resetPending:{
  data = 0
  set = resetDone
}

on:1 {
  resetDone,
  resetDone = 0
}

on:1 {
  AND(.poll:get, wantEval, GT(BITSIZE(lineBuf), 0)),
  lineSrc =: lineBuf./(BITSIZE(lineBuf)),
  lineTrim = TRIMT(lineSrc, " " ; any),
  prog =: .replLang:packAst(lineTrim, <replLine>, "line"),
  runRepl = 1,
  lineBuf << clear,
  evalDone = 1
}

.evalLatch:{
  data = 0
  set = evalDone
}

on:1 {
  evalDone,
  evalDone = 0
}

.replCalc:{
  ast = prog
  varsLen = varsLenStore
  keysIn = keysStore
  valsIn = valsStore
  varsLenOut >= varsLenStore
  keysOut >= keysStore
  valsOut >= valsStore
  resultOut >= replResult
  isAssignOut >= replIsAssign
  assignNameOut >= replAssignName
  set = runRepl
}

on:1 {
  AND(.poll:get, runRepl),
  runRepl = 0,
  showResult = 1
}

on:1 {
  AND(.poll:get, showResult),
  resultText = NUM2T(replResult, digits3; f64),
  showResult = 0,
  showDone = 1
}

.term:{
  append = resultText
  newline = 1
  set = showDone
}

on:1 {
  showDone,
  showDone = 0
}
```
