# Canvas Component (sketch sursă — 2026-08-31)

> Copiat din cerința user pentru plan [canvas_inline_and_comp.plan.md](../plans/canvas_inline_and_comp.plan.md).  
> **Sketch ≠ spec** — lacune notate în plan (D5 body metode, D8 binding, D16 culori, D29 renderer loc, D36 clear).

The `canvas` component provides graphical rendering for LogTScript applications.

Canvas rendering is intentionally separated from the `logic` component. Logic is responsible for application state and behavior, while the canvas is responsible for turning that state into graphics.

A canvas can be used for games, simulations, visualizations, editors, animations, and other interactive applications.

## Architecture

Canvas rendering has two parts:

* `inline [canvas]` — defines reusable rendering methods.
* `comp [canvas]` — creates a canvas instance and defines which rendering methods are used and how their inputs are connected.

Example:

```text
inline [canvas] .gameRenderer

    drawBg(x, y, width, height, color)
    drawPlayer(x, y, name, health)
    drawBox(x, y, width, height, color)
```

A component can then use these methods:

```text
comp [canvas] .myCanvasComp

.myCanvasComp:{
    renderer {
        drawBg(0, 0, 512, 512, "aaffaa")
        drawPlayer(xWire/s16, yWire/s16, playerNameWire/ascii, healthWire/u16)
        drawBox(boxX/s16, boxY/s16, 100, 150, "0000ff")
    }

    set = 1
}
```

The `renderer` block does not define rendering methods. It invokes rendering methods previously defined by the selected `inline [canvas]` renderer.

## Control pins

* `set` — state updated; mark dirty; coalesced redraw
* `draw` — explicit immediate redraw request
* `busy` — public pout while renderer runs
* `dirty` — internal only

## Design principle

* Logic: what is the current application state and how does it change?
* Canvas: how should the current application state be rendered?
* `observe` bridges the two.

## User deltas vs sketch (chat)

* Atribute comp: `width`, `height`, `bgColor`
* Builtins: `drawRect`, `drawText`, `drawLine`, `drawCircle`, `style`
* Culori: fără `#` (comentariu); texte `""`; int/float; aritmetică + asignări
* Fără `if` / loops în MVP
