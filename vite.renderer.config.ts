import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    target: 'chrome120',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: { main: path.resolve(__dirname, 'index.html') },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'motion': ['framer-motion'],
          'ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          'state': ['zustand'],
          'radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
          ],
        },
        compact: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { overlay: false }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'framer-motion', 'lucide-react']
  }
})
