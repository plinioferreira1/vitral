import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Laboratório de design do Vitral: site estático, sem banco e sem variáveis
// de ambiente. O build gera um único index.html (JS e CSS embutidos).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: "dist", assetsInlineLimit: 100_000_000, cssCodeSplit: false },
});
