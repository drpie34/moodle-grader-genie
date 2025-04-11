import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // CRITICAL: Ensure PDF.js worker is properly handled
  build: {
    commonjsOptions: {
      include: [/pdfjs-dist/],
    },
    rollupOptions: {
      // Treat worker as external asset
      output: {
        manualChunks: {
          'pdf.worker': ['pdfjs-dist/build/pdf.worker.entry'],
        },
      },
    },
  },
  optimizeDeps: {
    // Include PDF.js worker in dependencies
    include: ['pdfjs-dist/build/pdf.worker.entry'],
  },
}));
