# Documentation viewer

The script editor includes a built-in documentation browser for all `doc/*.md` pages bundled with v0.3.2.

Open it with the toolbar **Doc** button (or a URL hash such as `#network.md`). Use **Editor** (or the editor tab) to return to your script.

---

## Index and navigation

The landing page lists topics grouped by section (**Reference**, **Composite blocks**, **Displays**, and so on). Click a title to open that page.

| Control | Action |
|---------|--------|
| **← Back** | Return to the previous page in your session (disabled on the first page) |
| **History** | List of pages you opened this session — click to jump back |
| **Search** | Filter topics by title and keywords (type-ahead menu; **Enter** to open selection) |

Internal links (`[label](other-page.md)` or `[label](other-page.md#anchor)`) stay inside the viewer. External `http(s)` links open normally.

The address bar hash updates to `#filename.md` while you read (e.g. `#editorUI.md`). Refreshing the page with that hash reopens the same document.

---

## Runnable examples (`logts-play`)

Many pages include example scripts in fenced blocks marked `logts-play`. After the page renders, each block shows two buttons above the code:

| Button | Action |
|--------|--------|
| **Load** | Copy the script into a **new editor tab** without running it. Inspect or edit, then press toolbar **Run** when ready. |
| **Load & Run** | Copy the script into a new tab **and** run it immediately (same as **Load** followed by **Run**). |

Details:

- A new tab is created named `ex: <page title>` (or `ex: <page title> #2` for the second block on the same page).
- The tab uses the editor’s current **Wave / Legacy** pill **unless** the block specifies a mode (see below).
- If the tab limit is reached, you are asked to close a tab first.
- **Load & Run** is appropriate for static demos, device panels, oscillators, and anything that needs timers or live updates without an extra click.
- **Load** is useful when you want to change **Inst**, propagation mode, or code before running — or when the example expects you to press **Next** step by step.

### Propagation mode on examples

Optional language tag on the fence:

````markdown
```logts-play wave
...
```
````

| Tag | Meaning |
|-----|---------|
| `logts-play` | Use whatever Wave / Legacy mode the editor pill shows |
| `logts-play wave` | Force **wave** for the new tab (orange badge on the block) |
| `logts-play legacy` | Force **legacy** for the new tab (green badge) |

See [editorUI.md](editorUI.md) for **Run** / **Stop**, **Inst**, and propagation controls.

---

## Other embedded content

Some pages (for example [clcd.md](clcd.md)) add interactive galleries (`clcd-symbol-gallery` blocks) inside the viewer. Those are page-specific; runnable scripts still use **Load** / **Load & Run** as above.

Programmatic help from scripts uses the `doc()` function — see [doc-function.md](doc-function.md).

---

## Related

- [editorUI.md](editorUI.md) — toolbar **Run**, **Stop**, **Inst**, panels
- [doc-function.md](doc-function.md) — `doc()` from LogTScript code
