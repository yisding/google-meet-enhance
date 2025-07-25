import { Settings, DEFAULT_SETTINGS } from "./settings";

export async function loadSettings(): Promise<Settings> {
  const raw = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...(raw.settings as Partial<Settings>) } as Settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ settings });
} 