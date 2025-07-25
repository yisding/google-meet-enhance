// content script
console.debug("[gme] content script loaded");

import { loadSettings } from "../shared/storage";
import { Settings } from "../shared/settings";

interface MoveTileMessage {
  type: "moveTile";
  direction: "up" | "down";
}

let settings: Settings;

(async () => {
  settings = await loadSettings();
  console.debug("[gme] settings", settings);
  initOverlay();
})();

const overlayId = "gme-grid";
let overlayEl: HTMLElement | null = null;

function initOverlay() {
  if (document.getElementById(overlayId)) return;
  overlayEl = document.createElement("div");
  overlayEl.id = overlayId;
  document.body.appendChild(overlayEl);
  refreshGrid();

  // observe DOM mutations to keep in sync
  const observer = new MutationObserver(refreshGrid);
  observer.observe(document.body, { childList: true, subtree: true });
}

function collectVideoHosts(): HTMLElement[] {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(
    'video[playsinline]'
  ));
  const hosts = videos
    .map(v => v.closest<HTMLElement>("div"))
    .filter((h): h is HTMLElement => h !== null);
  // unique hosts
  return Array.from(new Set(hosts));
}

function refreshGrid() {
  if (!overlayEl) return;
  const hosts = collectVideoHosts();

  overlayEl.innerHTML = "";
  hosts.forEach((host, idx) => {
    const clone = host.cloneNode(true) as HTMLElement;
    clone.style.order = String(idx);
    overlayEl!.appendChild(clone);
  });
}

chrome.runtime.onMessage.addListener(
  (
    msg: MoveTileMessage,
    _sender: any,
    _sendResponse: (response?: unknown) => void
  ) => {
    if (msg?.type === "moveTile") {
      console.debug("[gme] moveTile command received", msg.direction);
      // TODO: reorder tile according to direction when grid logic is implemented.
    }
  }
); 