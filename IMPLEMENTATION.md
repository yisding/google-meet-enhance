Below is a high‑level, implementation‑oriented plan for a **Manifest V3 Chrome extension** that (1) removes Google Meet’s built‑in tile cap so every received video stream can be rendered and (2) lets the user define the exact order in which those streams appear.

---

### 1  — Define the real constraints first

| Constraint                                                                                                                                                                         | Practical implication for the extension                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Meet still only *receives* streams that Google’s back‑end chooses to forward** (typically 49–54 at once; Dynamic Layouts launched Mar 2025 don’t change this). ([9to5Google][1]) | The extension can’t “force‑subscribe” to video that is not being delivered; instead it must (a) render every `<video>` element that *does* exist and (b) optionally cycle or virtual‑scroll if Meet throttles in very large calls. |
| **Meet’s DOM mutates continuously and class names are obfuscated**                                                                                                                 | Use **feature selectors** (“`video[playsinline]`” + attribute heuristics) instead of hard‑coded class names, and register a **MutationObserver** at the document root.                                                             |
| **Manifest V3 removes persistent background pages**                                                                                                                                | All DOM work lives in a **content script**, while a lightweight service worker stores settings and handles keyboard shortcuts.                                                                                                     |

---

\### 2 — Extension surface and structure

```text
google‑meet‑unlimited‑tiles/
├─ manifest.json           ← MV3, host_permissions: ["https://meet.google.com/*"]
├─ content.js              ← injects overlay, manages MutationObserver
├─ grid.css                ← variables, grid util classes, prefers‑reduced‑motion guard
├─ popup/                  ← toolbar popup for global defaults
│   └─ popup.html / js
├─ options/                ← full settings page (ordering presets, tile size)
└─ sw.js                   ← service worker (storage + commands)
```

**Key manifest entries**

```jsonc
{
  "action": { "default_icon": { "16": "icon16.png" }, "default_popup": "popup/popup.html" },
  "background": { "service_worker": "sw.js" },
  "content_scripts": [{
      "matches": ["https://meet.google.com/*"],
      "js": ["content.js"],
      "css": ["grid.css"],
      "run_at": "document_idle"
  }],
  "permissions": ["storage", "scripting", "activeTab"]
}
```

---

\### 3 — Content‑script workflow

| Stage                      | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bootstrap**              | 1️⃣ Wait for `body > div[role="main"]`.<br>2️⃣ Inject a *shadow‑DOM overlay* (`<div id="gm‑grid">`) positioned on top of Meet’s native grid so we can control `display:grid` without fighting inline styles.                                                                                                                                                                                                                                                             |
| **Harvest participants**   | A single `MutationObserver` watches for any `<video>` insertion/removal. Each video is wrapped by Meet in a host element containing the participant’s name in either `aria-label` or a `data-participant-id` attribute. From that we build an in‑memory array: `[{ id, name, hostEl, videoEl, lastSpoke: 0 }]`                                                                                                                                                           |
| **Render/refresh grid**    | • Apply `style.display = "contents"` to Meet’s own grid so its tiles vanish but audio & signalling remain.<br>• For every object in the array, clone (or move) the host element into our overlay and set: `el.style.order = myOrderIndex`.<br>• Grid CSS uses `grid-template-columns: repeat(auto-fill, minmax(var(--tile-min,160px),1fr)); grid-auto-rows: var(--tile-height,1fr);` so the number of visible tiles is only constrained by viewport size, not hard caps. |
| **Ordering logic plug‑in** | A strategy interface: `getOrder(participants) → participantsSorted`.  Implementations: <br>• **“Active Speaker”** (sort by recent `muted → unmuted` events). <br>• **Alphabetical / Join‑time** (deterministic).<br>• **Manual** (drag‑and‑drop, see §4).  The chosen strategy name is stored via `chrome.storage.sync`.                                                                                                                                                 |
| **Performance guardrails** | • If `participants.length > visibleTiles`, pause off‑screen videos (`videoEl.pause()` + remove from overlay) but keep audio in native grid.<br>• Heuristic throttle: only recalc order every 500 ms unless there’s a Mutation event.                                                                                                                                                                                                                                     |

---

\### 4 — Stream ordering UI (the elegant part)

1. **Overlay toolbar** (floating 32 px pill at top‑right of the grid) with:

   * Order selector (dropdown).
   * “🖐 Arrange” toggle → enters *manual‑sort mode*.
2. **Manual‑sort mode**

   * Tiles gain `cursor:grab`.
   * Lightweight library‑free drag‑and‑drop using `pointerdown`, `pointermove`, `pointerup`.
   * On drop, compute new index, persist to `chrome.storage.sync`.
   * Accessibility: pressing **Space** on a focused tile toggles “move mode”; arrow keys reposition.
3. **Keyboard shortcuts** (registered via commands in `manifest.json`)

   * `Ctrl + Shift + ↑/↓` → move focused tile up/down in order list.
   * Announcement via `aria-live="polite"` region for screen‑reader users.

---

\### 5 — Edge cases & robustness

| Situation                                   | Handling                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Meet ships a DOM change**                 | Shadow overlay means we largely ignore their layout. If selectors fail, fallback to `document.querySelectorAll('video[playsinline]');`. |
| **Server stops forwarding >49 live videos** | Provide optional **“Carousel”**: keep the order array but only render N at a time, cycling every X seconds (user‑configurable).         |
| **Mobile Meet (PWA)**                       | Do **not** inject; `matches` key is desktop‑only and viewport width check in content script exits early `< 768px`.                      |
| **High CPU usage**                          | Expose slider “target FPS” (defaults to 15) that sets `videoEl.playbackRate` or `style.filter:'grayscale(1)'` for background tiles.     |

---

\### 6 — Testing strategy

| Layer          | Tooling                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**       | Vitest + JSDOM for order‑strategy functions.                                                                                                              |
| **E2E**        | Puppeteer with `--use-fake-ui-for-media-stream` to spawn synthetic Meet call in two headless tabs; verify grid length and `order` CSS.                    |
| **Real‑world** | Pre‑release Chrome Web Store “unlisted” channel; capture performance traces with Chrome DevTools Recorder profiles in 100‑participant Workspace accounts. |

---

\### 7 — Release & maintenance

1. GitHub Actions CI → `pnpm run build` (Rollup+Terser) → upload *zip* artifact.
2. Chrome Web Store listing emphasises *accessibility* and *no external network requests*.
3. Register `dep‑update` GitHub issue template; every quarterly Meet UI change bump version and patch selectors.

---

\### 8 — Potential future niceties

* **Filter tiles** by label (`/regex` search box) – handy for classes.
* **Export order** as JSON and sync to Drive.
* **Matrix‑style per‑tile stats** (bitrate, packet‑loss) via `chrome.webRequest` listener on `webrtc-internals` dump.
* Firefox compatibility through Manifest V3 polyfill.

---

## Summary

The core idea is *non‑intrusive DOM augmentation*: hide Meet’s hard‑capped grid, surface every `<video>` element it already receives inside a shadow‑DOM grid we control, and layer an accessible, keyboard‑friendly ordering UI on top. All heavy logic stays in a single, suspendable content script, and performance is preserved through virtual scrolling and off‑screen pausing. This keeps the codebase compact, avoids brittle monkey‑patching of Meet internals, and respects future upstream changes while giving the user the “infinite, ordered gallery view” Meet still lacks.

[1]: https://9to5google.com/2025/03/28/google-meet-dynamic-layouts/?utm_source=chatgpt.com "Google Meet rolling out Dynamic layouts that modernize the grid"
