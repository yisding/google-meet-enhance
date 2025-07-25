import { defineConfig } from "vite";
import { crx } from "vite-plugin-crx-mv3";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    minify: false
  }
}); 