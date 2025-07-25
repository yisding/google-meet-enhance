import {
  CURRENT_SETTINGS_VERSION,
  DEFAULT_SETTINGS
} from "./shared/settings";
import { loadSettings, saveSettings } from "./shared/storage";

console.debug("[gme] background worker booted");

chrome.runtime.onInstalled.addListener(async (details: any) => {
  console.debug("[gme] onInstalled", details);

  if (details.reason === "install") {
    await saveSettings(DEFAULT_SETTINGS);
    return;
  }

  if (details.reason === "update") {
    const settings = await loadSettings();
    if (settings.version < CURRENT_SETTINGS_VERSION) {
      const migrated = { ...DEFAULT_SETTINGS, ...settings, version: CURRENT_SETTINGS_VERSION };
      await saveSettings(migrated);
      console.debug("[gme] settings migrated", migrated);
    }
  }
});

chrome.commands.onCommand.addListener(async (command: string) => {
  if (command !== "move-tile-up" && command !== "move-tile-down") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "moveTile",
    direction: command === "move-tile-up" ? "up" : "down"
  });
}); 