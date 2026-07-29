---
name: comp scanner universal
overview: "comp [scanner] = input panel LogTscript: buffer text + Scan/Enter, pout get = ASCII împachetat pe length×8 (pad NUL), plus size și valid; fără pins de scriere."
todos:
  - id: sc0
    content: "Sc0: plan în .cursor/plans/comp_scanner_universal.plan.md"
    status: completed
  - id: sc1
    content: "Sc1: scanner core+widget (temă keyboard color/bgColor/focus) + get/size(clz32)/valid + teste; suite verde"
    status: completed
  - id: sc2
    content: "Sc2: scanner.md + multe logts-play + catalog; suite verde"
    status: completed
isProject: false
---

# Plan: `comp [scanner]` (input ASCII buffer)

Livrat. Vezi `v0_3_2/doc/scanner.md` și implementarea din `core/components/scanner.js` + `devices/scanner-widget.js`.

## Contract

- INPUT panel: `pins: []`; pouts `get` (`length×8`), `size` (`Math.clz32`), `valid` (puls)
- UI: câmp cu `maxlength = length`, buton Scan / Enter; temă ca keyboard (`color`/`bgColor`/`focus*`)
- Packing: `wireStringToBin` + pad NUL dreapta
- Fără truncate la UI — limitare `maxlength`
