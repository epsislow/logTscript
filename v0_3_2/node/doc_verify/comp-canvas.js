'use strict';

/** Extra checks for doc/comp-canvas.md */
module.exports = {
  cases: [
    {
      name: 'renderer set draws scene',
      src: `inline [canvas] .gameRenderer:

    drawScene() {
        styleFill("00ff00")
        drawRect(10, 10, 40, 40)
    }

:

comp [canvas] .myCanvas:
    on: 1
    width: 100
    height: 80
    .gameRenderer { }
:

1wire trigger = 1
.myCanvas:{
    renderer { drawScene() }
    set = trigger
}`,
      check: (interp) => !!interp.components.get('.myCanvas'),
    },
    {
      name: 'busy idle after run',
      src: `inline [canvas] .r:

    tick() {
        styleFill("ffffff")
        drawRect(0, 0, 10, 10)
    }

:

comp [canvas] .cv:
    on: 1
    width: 32
    height: 32
    .r { }
:

1wire trigger = 1
.cv:{
    renderer { tick() }
    set = trigger
}`,
      check: (interp) => {
        const comp = interp.components.get('.cv');
        if (!comp || !comp.busyRef) return false;
        const busy = interp.getValueFromRef(comp.busyRef);
        return busy === '0';
      },
    },
    {
      name: 'observe spotX drives canvas xPos',
      src: `inline [logic] .game:

:

comp [logic] .gameLogic:
    on: 1
    .game {
        observe spotX$ is number xPin
    }

:

inline [canvas] .dots:

    mark(x, y) {
        styleFill("00ffaa")
        drawCircle(x, y, 10)
    }

:

comp [canvas] .screen:
    on: 1
    width: 200
    height: 120
    bgColor: ^001122
    .dots { }

:

1wire go = 1
16wire spotX = 0000000000000000

.gameLogic:{
    logic { + spotX$(80) }
    xPin >= spotX
    set = go
}

.screen:{
    renderer { mark(xPos/s16, 60) }
    xPos = spotX
    set = go
}`,
      wires: { spotX: '0000000001010000' },
      check: (interp) => !!interp.components.get('.screen'),
    },
  ],
};
