# Google-Meet Enhance

A Chrome / Chromium extension that removes Google Meet’s hard-coded tile cap and lets you arrange participant videos *exactly the way you like* – alphabetically, by recent speaker, or via drag-and-drop.

> **Note** Google Meet’s back-end usually forwards a maximum of ~49 live video streams to your browser. The extension can display *every* video that is actually received, but it cannot force Google to send more than that. In very large calls, you can optionally enable *carousel mode* that cycles through participants.

---

## How does it work?

1. A **content script** is injected on `https://meet.google.com/*` once the Meet UI is idle.
2. The script inserts a **shadow-DOM overlay grid** (`#gme-grid`) positioned above the native grid and sets the native grid’s wrapper to `display:contents` so audio & signalling remain untouched while the visuals are hidden.
3. A single `MutationObserver` tracks every `<video>` element that Meet adds or removes. Each video is represented as:
   ```ts
   { id: string, name: string, hostEl: HTMLElement, videoEl: HTMLVideoElement }
   ```
4. The overlay grid renders those host elements, applying CSS `order` according to the chosen *ordering strategy* (active-speaker / alphabetic / manual drag-to-reorder).
5. When manual mode is active you can drag tiles, or use `Ctrl + Shift + ↑/↓` to move the focused tile via keyboard. The order is persisted in `chrome.storage.sync`.
6. For performance, off-screen videos can be paused or down-sampled if average FPS drops below a user-defined threshold.

No brittle monkey-patching of Meet’s internal Redux store is required – everything is DOM-level augmentation, so the extension is resilient to upstream code changes.

---

## Project structure

```
manifest.json            ← Manifest V3
background.ts            ← Service-worker stub (handles storage & shortcuts)
content/
├─ content.ts            ← Main content script (observer + overlay mount)
├─ inject.css            ← Grid & utility styles (injected)
└─ ui/
   ├─ Toolbar.tsx        ← Ordering dropdown & “Arrange” toggle
   └─ Tile.tsx           ← Drag-handle & keyboard-reorder logic
```

The complete engineering blueprint – including constraints, edge-case handling, and test strategy – lives in **IMPLEMENTATION.md**.

---

## Install locally

1. `pnpm install`
2. `pnpm build`
3. Open `chrome://extensions` → enable *Developer mode* → *Load unpacked* → select `dist/`.

---

## Development workflow

• `pnpm dev` – rebuild on file change with Vite + HMR into the loaded extension.  
• `pnpm test` – unit tests (Vitest) & headless Meet e2e (Puppeteer).  
• Enable *Console › Filter › [gme]* to see extension-specific logs.

---

## License

AGPL-3.0-only