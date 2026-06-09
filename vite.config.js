import { defineConfig } from 'vite';

// Entrée par défaut : index.html à la racine du projet.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
