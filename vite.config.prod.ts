import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/gptme-webui/',  // Add base URL for GitHub Pages
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
