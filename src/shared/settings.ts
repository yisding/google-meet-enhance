export type OrderingStrategy = "active-speaker" | "alphabetic" | "manual" | "carousel";

export interface Settings {
  version: number;
  orderingStrategy: OrderingStrategy;
  manualOrder: string[]; // participant ids in preferred order
  targetFps: number;     // performance guard
  tileMin: number;       // min tile size in px
}

export const CURRENT_SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  version: CURRENT_SETTINGS_VERSION,
  orderingStrategy: "active-speaker",
  manualOrder: [],
  targetFps: 25,
  tileMin: 160
}; 