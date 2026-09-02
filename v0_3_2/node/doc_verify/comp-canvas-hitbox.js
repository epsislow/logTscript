'use strict';

/** Extra checks for doc/comp-canvas-hitbox.md */
module.exports = {
  cases: [
    {
      name: 'hitbox zones elaborate',
      src: `inline [canvas] .ui:

    drawBtn(x, y, w, h, color) {
        styleFill(color)
        drawRect(x, y, w, h)
    }

:

comp [canvas] .panel:
    on: 1
    width: 100
    height: 60
    hitbox {
        btn: {
            rect(10, 10, 30, 30)
            pout :press as btnPress
        }
    }
    .ui {
        initDraw { drawBtn(10, 10, 30, 30, "0") }
        renderer when(btn) { drawBtn(10, 10, 30, 30, "f") }
    }
:

1wire go = 1
.panel:{ renderer { drawBtn(10, 10, 30, 30, "6") } set = go }`,
      check: (interp) => {
        const comp = interp.components.get('.panel');
        return !!(comp && comp.hitboxZones && comp.hitboxZones.btn);
      },
    },
    {
      name: 'press pout on touch',
      src: `inline [canvas] .ui:

    drawBtn(x, y, w, h, color) {
        styleFill(color)
        drawRect(x, y, w, h)
    }

:

comp [canvas] .panel:
    on: 1
    width: 100
    height: 60
    hitbox {
        btn: {
            rect(10, 10, 30, 30)
            touchType = 1
            pout :press as btnPress
        }
    }
    .ui {
        initDraw { drawBtn(10, 10, 30, 30, "0") }
        renderer when(btn) { drawBtn(10, 10, 30, 30, "f") }
    }
:

1wire go = 1
.panel:{ renderer { drawBtn(10, 10, 30, 30, "6") } set = go }`,
      check: (interp, session) => {
        session.triggerCanvasTouch(interp, '.panel', { x: 20, y: 20, phase: 'press' });
        session._propagateIfNeeded(interp);
        return session.getCompProperty(interp, '.panel', 'btnPress') === '1';
      },
    },
    {
      name: 'drag eventX pout s16',
      src: `inline [canvas] .ui:

    drawKnob(x, y) {
        styleFill("ffcc00")
        drawCircle(x, y, 6)
    }

:

comp [canvas] .panel:
    on: 1
    width: 100
    height: 60
    hitbox {
        slider: {
            rect(50, 10, 40, 40)
            touchType = 1
            pout :drag:eventX as dragX/s16
        }
    }
    .ui {
        renderer when(slider:drag) { drawKnob(eventX, eventY) }
    }
:

1wire go = 1
.panel:{ renderer { drawKnob(0, 0) } set = go }`,
      check: (interp, session) => {
        session.triggerCanvasTouch(interp, '.panel', { x: 60, y: 20, phase: 'press' });
        session.triggerCanvasTouch(interp, '.panel', { x: 72, y: 22, phase: 'move' });
        session._propagateIfNeeded(interp);
        const comp = interp.components.get('.panel');
        const pout = comp.hitboxPouts.dragX;
        const bits = interp.getValueFromRef(pout.ref);
        const decodeFn = typeof logicDecodeNumberBits === 'function' ? logicDecodeNumberBits : null;
        const val = decodeFn ? decodeFn(bits, 's16') : parseInt(bits, 2);
        return val === 72;
      },
    },
  ],
};
