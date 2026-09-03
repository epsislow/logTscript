'use strict';

/** Extra checks for doc/inline-canvas.md */
module.exports = {
  cases: [
    {
      name: 'inline stores two methods',
      src: `inline [canvas] .primitives:

    tile(x, y, color) {
        style(0, color)
        drawRect(x, y, 16, 16)
    }

    grid() {
        tile(10, 10, "ff0000")
        tile(30, 10, "00ff00")
    }

:`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.primitives');
        return inst && inst.kind === 'canvas' && inst.methods.tile && inst.methods.grid;
      },
    },
  ],
};
