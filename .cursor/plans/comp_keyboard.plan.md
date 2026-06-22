---
name: comp keyboard component
overview: "comp [keyboard] — taste browser când focusat, :get (8bit ASCII / 4bit BCD) + :valid pulse; teste headless triggerKeyboardKey; doc logts-play terminal+queue"
todos:
  - id: keyboard-core
    content: core/components/keyboard.js — getDef, get/valid pouts, buildKeyHandler, evalGetProperty, pulse valid
    status: completed
  - id: keyboard-ui
    content: devices/panel-keyboard.js — focus, cursor blink ~400ms, keydown, addKeyboard, CSS în script_editor
    status: completed
  - id: keyboard-wire
    content: index.js register + interpreter compInfo.keyboardHandler + validRef + HTML script tags
    status: completed
  - id: keyboard-tests
    content: test_session.triggerKeyboardKey + teste 1599–1607
    status: completed
  - id: keyboard-doc
    content: doc/keyboard.md cu logts-play terminal+queue, components.md, doc-index
    status: completed
isProject: false
---

# Plan: componenta `comp [keyboard]` — IMPLEMENTAT

Vezi [doc/keyboard.md](../../v0_3_2/doc/keyboard.md) și teste 1599–1607.
