import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { resolve } from "path";
import { defineConfig } from 'vite';

// Custom plugin to build inpage script separately
function buildInpagePlugin() {
  return {
    name: 'build-inpage',
    closeBundle() {
      // Build inpage.ts separately after main build
      try {
        execSync('npx esbuild src/inpage.ts --bundle --outfile=dist/inpage.js --format=iife', {
          cwd: resolve(__dirname),
          stdio: 'inherit'
        });
        console.log('✓ Built inpage.js');
      } catch (error) {
        console.error('Failed to build inpage.js:', error);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), buildInpagePlugin()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.ts"),
        contentScript: resolve(__dirname, "src/contentScript.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep script names clean without hashes
          if (chunkInfo.name === 'background' || chunkInfo.name === 'contentScript') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep asset names clean
          if (assetInfo.name === 'manifest.json') {
            return '[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    },
    // Ensure we can use NodeJS APIs in background script
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
  },
  // Resolve node modules for extension scripts
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
