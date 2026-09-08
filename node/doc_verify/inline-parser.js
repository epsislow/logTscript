'use strict';

/** Extra checks for doc/inline-parser.md */
module.exports = {
  cases: [
    {
      name: 'colon form stores tokens and rules',
      src: `inline [parser] .calc:

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

:`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.calc');
        return inst && inst.kind === 'parser' && inst.tokens.length === 2 && inst.rules.length === 5;
      },
    },
    {
      name: 'brace form stores grammar',
      src: `inline [parser] .mini {
    token NUM = [0-9]+;
    rule main = NUM -> CallNum;
}`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.mini');
        return inst && inst.rules[0].alternatives[0].call === 'CallNum';
      },
    },
    {
      name: 'doc inline.parser template',
      src: 'doc(inline.parser)',
      expect: ['token INT = [0-9]+'],
    },
  ],
};
