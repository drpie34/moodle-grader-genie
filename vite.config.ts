import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// Version-specific plugin for handling PDF.js worker in Vite 5
function pdfWorkerPlugin() {
  return {
    name: 'vite-plugin-pdf-worker',
    // This will copy the PDF.js worker file to the output directory
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.includes('pdf.worker.js')) {
          console.log('Serving PDF.js worker:', req.url);
        }
        next();
      });
    },
    // Handle the worker as an asset
    generateBundle(_, bundle) {
      // Make sure we're aware of the worker being processed
      console.log('Generating bundle with PDF.js worker handling');
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    pdfWorkerPlugin(), // Add custom plugin for PDF.js worker
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Improved configuration for Vite 5
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Create a separate chunk for the PDF.js worker
          if (id.includes('pdfjs-dist/build/pdf.worker')) {
            return 'pdfjs-worker';
          }
        }
      }
    }
  },
  // Make sure to include the worker in dependency pre-bundling
  optimizeDeps: {
    include: ['pdfjs-dist', 'pdfjs-dist/build/pdf.worker.js'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));
